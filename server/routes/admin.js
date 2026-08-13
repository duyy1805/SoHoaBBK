const express = require("express");
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const sql = require("mssql");
const multer = require("multer");
const sharp = require("sharp");
const authenticateToken = require("../middlewares/auth.middleware");
const { requireUserAdministrator, USER_ADMIN_PERMISSION } = require("../middlewares/userAdmin.middleware");
const { poolPromise } = require("../db");
const {
    signatureDirectory,
    resolveSignaturePath,
    readSignatureDataUrl
} = require("../utils/signatureImage");

const router = express.Router();
router.use(authenticateToken, requireUserAdministrator);

const md5 = (value) => crypto.createHash("md5").update(String(value)).digest("hex");
const trim = (value) => String(value ?? "").trim();
const isEmail = (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const uniqueIds = (values) => Array.from(new Set(
    (Array.isArray(values) ? values : []).map(Number).filter((value) => Number.isInteger(value) && value > 0)
));
const decodeRowVersion = (value) => {
    if (!value) return null;
    try {
        const result = Buffer.from(String(value), "base64");
        return result.length === 8 ? result : null;
    } catch {
        return null;
    }
};
const encodeRowVersion = (value) => value?.toString("base64") || null;
const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const txRequest = (transaction) => new sql.Request(transaction);
const hasDepartmentLeadRole = (roles) => (roles || []).some((role) =>
    String(role?.RoleCode || role || "").toUpperCase() === "TP_BP"
);

const mapRole = (row) => ({ ...row, RowVersion: encodeRowVersion(row.RowVersion) });
const mapUser = (row) => ({
    ...row,
    HasSignature: Boolean(row.HasSignature),
    RowVersion: encodeRowVersion(row.RowVersion)
});
const signatureUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
        const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
        callback(allowed.has(file.mimetype) ? null : httpError(400, "Chỉ chấp nhận ảnh PNG, JPEG hoặc WebP"), allowed.has(file.mimetype));
    }
});
const runSignatureUpload = (req, res, next) => {
    signatureUpload.single("signature")(req, res, (error) => {
        if (!error) return next();
        if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "Ảnh chữ ký không được lớn hơn 2 MB" });
        }
        return res.status(error.statusCode || 400).json({ message: error.message || "Ảnh chữ ký không hợp lệ" });
    });
};
const removeSignatureFile = async (storedPath) => {
    const filePath = resolveSignaturePath(storedPath);
    if (!filePath) return;
    try {
        await fs.unlink(filePath);
    } catch (error) {
        if (error?.code !== "ENOENT") console.warn("Không xóa được ảnh chữ ký cũ:", error.message);
    }
};

async function getDepartment(executor, departmentId, activeOnly = true) {
    if (!Number.isInteger(Number(departmentId)) || Number(departmentId) <= 0) {
        throw httpError(400, "Vui lòng chọn bộ phận");
    }
    const result = await new sql.Request(executor)
        .input("Id", sql.Int, Number(departmentId))
        .query(`
            SELECT TOP 1 Id, MaBoPhan, TenBoPhan, TrangThai
            FROM dbo.DM_BO_PHAN
            WHERE Id=@Id ${activeOnly ? "AND ISNULL(TrangThai,1)=1" : ""}
        `);
    if (!result.recordset.length) throw httpError(400, "Bộ phận không tồn tại hoặc đã ngưng sử dụng");
    return result.recordset[0];
}

async function validateRoles(executor, roleIds) {
    const ids = uniqueIds(roleIds);
    if (!ids.length) throw httpError(400, "Vui lòng chọn ít nhất một role");
    const result = await new sql.Request(executor).query(`
        SELECT Id, RoleCode, RoleName, ISNULL(TrangThai,1) AS TrangThai
        FROM dbo.ROLES
        WHERE ISNULL(TrangThai,1)=1
    `);
    const roleMap = new Map(result.recordset.map((row) => [Number(row.Id), row]));
    const invalid = ids.filter((id) => !roleMap.has(id));
    if (invalid.length) throw httpError(400, "Role không tồn tại hoặc đã ngưng sử dụng");
    return ids.map((id) => roleMap.get(id));
}

async function validatePermissions(executor, permissionIds) {
    const ids = uniqueIds(permissionIds);
    const result = await new sql.Request(executor)
        .query("SELECT Id, PermissionCode, PermissionName FROM dbo.PERMISSIONS ORDER BY PermissionCode");
    const permissionMap = new Map(result.recordset.map((row) => [Number(row.Id), row]));
    const invalid = ids.filter((id) => !permissionMap.has(id));
    if (invalid.length) throw httpError(400, "Permission không tồn tại");
    return ids.map((id) => permissionMap.get(id));
}

async function getUserSnapshot(executor, userId) {
    const request = new sql.Request(executor);
    const result = await request.input("UserId", sql.Int, Number(userId)).query(`
        SELECT u.Id, u.Username, u.FullName, u.Email, u.BoPhanId, u.BoPhan,
               ISNULL(u.TrangThai,0) AS TrangThai, u.CreatedAt, u.UpdatedAt,
               bp.MaBoPhan, bp.TenBoPhan, u.RowVersion,
               CAST(CASE WHEN NULLIF(LTRIM(RTRIM(u.SignatureImagePath)), N'') IS NULL THEN 0 ELSE 1 END AS bit) AS HasSignature,
               u.SignatureImagePath
        FROM dbo.USERS u
        LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id=u.BoPhanId
        WHERE u.Id=@UserId;
        SELECT r.Id, r.RoleCode, r.RoleName
        FROM dbo.USER_ROLE ur
        JOIN dbo.ROLES r ON r.Id=ur.RoleId
        WHERE ur.UserId=@UserId
        ORDER BY r.RoleCode;
        SELECT DISTINCT p.Id, p.PermissionCode, p.PermissionName
        FROM dbo.USER_ROLE ur
        JOIN dbo.ROLE_PERMISSION rp ON rp.RoleId=ur.RoleId
        JOIN dbo.PERMISSIONS p ON p.Id=rp.PermissionId
        WHERE ur.UserId=@UserId
        ORDER BY p.PermissionCode;
        SELECT mapping.BoPhanId, bp.MaBoPhan, bp.TenBoPhan, mapping.AddedAt,
               addedBy.FullName AS AddedByName
        FROM dbo.USER_BO_PHAN_QUAN_LY mapping
        JOIN dbo.DM_BO_PHAN bp ON bp.Id=mapping.BoPhanId
        LEFT JOIN dbo.USERS addedBy ON addedBy.Id=mapping.AddedBy
        WHERE mapping.UserId=@UserId AND mapping.IsActive=1
        ORDER BY bp.MaBoPhan, bp.TenBoPhan;
    `);
    const user = result.recordsets[0]?.[0];
    if (!user) return null;
    const signatureDataUrl = await readSignatureDataUrl(user.SignatureImagePath);
    delete user.SignatureImagePath;
    return {
        ...mapUser(user),
        SignatureDataUrl: signatureDataUrl,
        roles: result.recordsets[1] || [],
        permissions: result.recordsets[2] || [],
        managedDepartments: result.recordsets[3] || [],
        managedBoPhanIds: (result.recordsets[3] || []).map((item) => Number(item.BoPhanId))
    };
}

async function getRoleSnapshot(executor, roleId) {
    const result = await new sql.Request(executor)
        .input("RoleId", sql.Int, Number(roleId))
        .query(`
            SELECT r.Id, r.RoleCode, r.RoleName, ISNULL(r.TrangThai,1) AS TrangThai,
                   ISNULL(r.IsSystem,0) AS IsSystem, r.CreatedAt, r.UpdatedAt,
                   r.RowVersion,
                   (SELECT COUNT(*) FROM dbo.USER_ROLE ur WHERE ur.RoleId=r.Id) AS UserCount,
                   (SELECT COUNT(*)
                    FROM dbo.USER_ROLE ur
                    JOIN dbo.USERS u ON u.Id=ur.UserId
                    WHERE ur.RoleId=r.Id AND ISNULL(u.TrangThai,0)=1) AS ActiveUserCount
            FROM dbo.ROLES r WHERE r.Id=@RoleId;
            SELECT p.Id, p.PermissionCode, p.PermissionName
            FROM dbo.ROLE_PERMISSION rp
            JOIN dbo.PERMISSIONS p ON p.Id=rp.PermissionId
            WHERE rp.RoleId=@RoleId ORDER BY p.PermissionCode;
        `);
    const role = result.recordsets[0]?.[0];
    return role ? { ...mapRole(role), permissions: result.recordsets[1] || [] } : null;
}

async function writeAudit(executor, actorUserId, actionCode, entityType, entityId, before, after) {
    await new sql.Request(executor)
        .input("ActorUserId", sql.Int, Number(actorUserId))
        .input("ActionCode", sql.NVarChar(100), actionCode)
        .input("EntityType", sql.NVarChar(30), entityType)
        .input("EntityId", sql.Int, Number(entityId) || null)
        .input("BeforeJson", sql.NVarChar(sql.MAX), before ? JSON.stringify(before) : null)
        .input("AfterJson", sql.NVarChar(sql.MAX), after ? JSON.stringify(after) : null)
        .query(`
            INSERT dbo.USER_ADMIN_AUDIT
                (ActorUserId, ActionCode, EntityType, EntityId, BeforeJson, AfterJson)
            VALUES
                (@ActorUserId, @ActionCode, @EntityType, @EntityId, @BeforeJson, @AfterJson)
        `);
}

async function replaceUserRoles(transaction, userId, roleIds) {
    await txRequest(transaction).input("UserId", sql.Int, userId)
        .query("DELETE FROM dbo.USER_ROLE WHERE UserId=@UserId");
    for (const roleId of roleIds) {
        await txRequest(transaction)
            .input("UserId", sql.Int, userId)
            .input("RoleId", sql.Int, roleId)
            .query("INSERT dbo.USER_ROLE (UserId, RoleId) VALUES (@UserId,@RoleId)");
    }
}

async function replaceManagedDepartments(transaction, userId, departmentIds, actorUserId) {
    const ids = uniqueIds(departmentIds);
    if (ids.length) {
        const activeDepartments = await new sql.Request(transaction).query(`
            SELECT Id FROM dbo.DM_BO_PHAN WHERE ISNULL(TrangThai,1)=1
        `);
        const validIds = new Set((activeDepartments.recordset || []).map((row) => Number(row.Id)));
        if (ids.some((id) => !validIds.has(id))) throw httpError(400, "Có bộ phận quản lý không hợp lệ");
    }

    await txRequest(transaction)
        .input("UserId", sql.Int, userId)
        .input("ActorUserId", sql.Int, actorUserId)
        .input("SelectedIds", sql.NVarChar(sql.MAX), ids.join(","))
        .query(`
            UPDATE dbo.USER_BO_PHAN_QUAN_LY
            SET IsActive=0, RemovedBy=@ActorUserId, RemovedAt=SYSDATETIME()
            WHERE UserId=@UserId AND IsActive=1
              AND BoPhanId NOT IN (
                  SELECT TRY_CONVERT(int,[value]) FROM STRING_SPLIT(@SelectedIds,',')
              );

            INSERT dbo.USER_BO_PHAN_QUAN_LY (UserId,BoPhanId,IsActive,AddedBy,AddedAt)
            SELECT @UserId,selected.BoPhanId,1,@ActorUserId,SYSDATETIME()
            FROM (
                SELECT DISTINCT TRY_CONVERT(int,[value]) AS BoPhanId
                FROM STRING_SPLIT(@SelectedIds,',')
                WHERE TRY_CONVERT(int,[value]) IS NOT NULL
            ) selected
            WHERE NOT EXISTS (
                SELECT 1 FROM dbo.USER_BO_PHAN_QUAN_LY currentMapping
                WHERE currentMapping.UserId=@UserId
                  AND currentMapping.BoPhanId=selected.BoPhanId
                  AND currentMapping.IsActive=1
            );
        `);
}

async function replaceRolePermissions(transaction, roleId, permissionIds) {
    await txRequest(transaction).input("RoleId", sql.Int, roleId)
        .query("DELETE FROM dbo.ROLE_PERMISSION WHERE RoleId=@RoleId");
    for (const permissionId of permissionIds) {
        await txRequest(transaction)
            .input("RoleId", sql.Int, roleId)
            .input("PermissionId", sql.Int, permissionId)
            .query("INSERT dbo.ROLE_PERMISSION (RoleId, PermissionId) VALUES (@RoleId,@PermissionId)");
    }
}

async function userHasManagementAccess(executor, userId) {
    const result = await new sql.Request(executor)
        .input("UserId", sql.Int, Number(userId))
        .input("PermissionCode", sql.NVarChar(100), USER_ADMIN_PERMISSION)
        .query(`
            SELECT CASE WHEN EXISTS (
                SELECT 1
                FROM dbo.USERS u
                JOIN dbo.USER_ROLE ur ON ur.UserId=u.Id
                JOIN dbo.ROLES r ON r.Id=ur.RoleId AND ISNULL(r.TrangThai,1)=1
                LEFT JOIN dbo.ROLE_PERMISSION rp ON rp.RoleId=r.Id
                LEFT JOIN dbo.PERMISSIONS p ON p.Id=rp.PermissionId
                WHERE u.Id=@UserId AND ISNULL(u.TrangThai,0)=1
                  AND (UPPER(r.RoleCode)='ADMIN' OR p.PermissionCode=@PermissionCode)
            ) THEN 1 ELSE 0 END AS HasAccess
        `);
    return Boolean(result.recordset[0]?.HasAccess);
}

async function countActiveManagers(executor) {
    const result = await new sql.Request(executor)
        .input("PermissionCode", sql.NVarChar(100), USER_ADMIN_PERMISSION)
        .query(`
            SELECT COUNT(*) AS Total
            FROM dbo.USERS u
            WHERE ISNULL(u.TrangThai,0)=1
              AND EXISTS (
                  SELECT 1
                  FROM dbo.USER_ROLE ur
                  JOIN dbo.ROLES r ON r.Id=ur.RoleId AND ISNULL(r.TrangThai,1)=1
                  LEFT JOIN dbo.ROLE_PERMISSION rp ON rp.RoleId=r.Id
                  LEFT JOIN dbo.PERMISSIONS p ON p.Id=rp.PermissionId
                  WHERE ur.UserId=u.Id
                    AND (UPPER(r.RoleCode)='ADMIN' OR p.PermissionCode=@PermissionCode)
              )
        `);
    return Number(result.recordset[0]?.Total || 0);
}

function validateUserInput(body, creating = false) {
    const fullName = trim(body.fullName);
    const email = trim(body.email) || null;
    const password = String(body.password || "");
    if (!fullName) throw httpError(400, "Vui lòng nhập họ tên");
    if (!isEmail(email)) throw httpError(400, "Email không hợp lệ");
    if (creating) {
        const username = trim(body.username);
        if (!/^[A-Za-z0-9._-]{3,50}$/.test(username)) {
            throw httpError(400, "Tên đăng nhập phải từ 3-50 ký tự và chỉ gồm chữ, số, dấu chấm, gạch ngang hoặc gạch dưới");
        }
        if (password.length < 8 || password.length > 128) {
            throw httpError(400, "Mật khẩu phải từ 8-128 ký tự");
        }
    }
    return { fullName, email };
}

function handleError(res, error, fallback) {
    if (error?.number === 2627 || error?.number === 2601) {
        return res.status(409).json({ message: "Mã hoặc tên đăng nhập đã tồn tại" });
    }
    console.error(fallback, error);
    return res.status(error.statusCode || 500).json({ message: error.message || fallback });
}

router.get("/metadata", async (_req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT Id, MaBoPhan, TenBoPhan, ISNULL(TrangThai,1) AS TrangThai
            FROM dbo.DM_BO_PHAN
            ORDER BY ISNULL(TrangThai,1) DESC, MaBoPhan, TenBoPhan;
            SELECT Id, RoleCode, RoleName, ISNULL(TrangThai,1) AS TrangThai, ISNULL(IsSystem,0) AS IsSystem
            FROM dbo.ROLES
            ORDER BY ISNULL(TrangThai,1) DESC, RoleCode;
            SELECT Id, PermissionCode, PermissionName
            FROM dbo.PERMISSIONS
            ORDER BY PermissionCode;
        `);
        res.json({
            departments: result.recordsets[0] || [],
            roles: result.recordsets[1] || [],
            permissions: result.recordsets[2] || []
        });
    } catch (error) {
        handleError(res, error, "Không tải được dữ liệu phân quyền");
    }
});

router.get("/users", async (req, res) => {
    try {
        const pool = await poolPromise;
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 25));
        const keyword = trim(req.query.keyword);
        const departmentId = Number(req.query.boPhanId) || null;
        const roleId = Number(req.query.roleId) || null;
        const status = req.query.status === "active" ? true : req.query.status === "inactive" ? false : null;
        const request = pool.request()
            .input("Keyword", sql.NVarChar(255), keyword || null)
            .input("BoPhanId", sql.Int, departmentId)
            .input("RoleId", sql.Int, roleId)
            .input("Status", sql.Bit, status)
            .input("Offset", sql.Int, (page - 1) * pageSize)
            .input("PageSize", sql.Int, pageSize);
        const result = await request.query(`
            SELECT COUNT(*) AS Total
            FROM dbo.USERS u
            WHERE (@Keyword IS NULL OR u.Username LIKE N'%'+@Keyword+N'%'
                    OR u.FullName LIKE N'%'+@Keyword+N'%' OR u.Email LIKE N'%'+@Keyword+N'%')
              AND (@BoPhanId IS NULL OR u.BoPhanId=@BoPhanId)
              AND (@Status IS NULL OR ISNULL(u.TrangThai,0)=@Status)
              AND (@RoleId IS NULL OR EXISTS (
                    SELECT 1 FROM dbo.USER_ROLE ur WHERE ur.UserId=u.Id AND ur.RoleId=@RoleId
              ));

            SELECT u.Id, u.Username, u.FullName, u.Email, u.BoPhanId, u.BoPhan,
                   ISNULL(u.TrangThai,0) AS TrangThai, u.CreatedAt, u.UpdatedAt,
                   bp.MaBoPhan, bp.TenBoPhan, u.RowVersion,
                   CAST(CASE WHEN NULLIF(LTRIM(RTRIM(u.SignatureImagePath)), N'') IS NULL THEN 0 ELSE 1 END AS bit) AS HasSignature
            FROM dbo.USERS u
            LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id=u.BoPhanId
            WHERE (@Keyword IS NULL OR u.Username LIKE N'%'+@Keyword+N'%'
                    OR u.FullName LIKE N'%'+@Keyword+N'%' OR u.Email LIKE N'%'+@Keyword+N'%')
              AND (@BoPhanId IS NULL OR u.BoPhanId=@BoPhanId)
              AND (@Status IS NULL OR ISNULL(u.TrangThai,0)=@Status)
              AND (@RoleId IS NULL OR EXISTS (
                    SELECT 1 FROM dbo.USER_ROLE ur WHERE ur.UserId=u.Id AND ur.RoleId=@RoleId
              ))
            ORDER BY u.Id DESC
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
        `);
        const items = (result.recordsets[1] || []).map(mapUser);
        if (items.length) {
            const roleRequest = pool.request();
            const placeholders = items.map((item, index) => {
                roleRequest.input(`UserId${index}`, sql.Int, item.Id);
                return `@UserId${index}`;
            });
            const rolesResult = await roleRequest.query(`
                SELECT ur.UserId, r.Id, r.RoleCode, r.RoleName
                FROM dbo.USER_ROLE ur
                JOIN dbo.ROLES r ON r.Id=ur.RoleId
                WHERE ur.UserId IN (${placeholders.join(",")})
                ORDER BY r.RoleCode
            `);
            const rolesByUser = new Map();
            (rolesResult.recordset || []).forEach((role) => {
                if (!rolesByUser.has(Number(role.UserId))) rolesByUser.set(Number(role.UserId), []);
                rolesByUser.get(Number(role.UserId)).push(role);
            });
            items.forEach((item) => { item.roles = rolesByUser.get(Number(item.Id)) || []; });
        }
        res.json({
            items,
            pagination: {
                page,
                pageSize,
                total: Number(result.recordsets[0]?.[0]?.Total || 0)
            }
        });
    } catch (error) {
        handleError(res, error, "Không tải được danh sách người dùng");
    }
});

router.get("/users/:id", async (req, res) => {
    try {
        const pool = await poolPromise;
        const user = await getUserSnapshot(pool, req.params.id);
        if (!user) return res.status(404).json({ message: "Không tìm thấy tài khoản" });
        res.json(user);
    } catch (error) {
        handleError(res, error, "Không tải được tài khoản");
    }
});

router.post("/users", async (req, res) => {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    try {
        const { fullName, email } = validateUserInput(req.body, true);
        const roles = await validateRoles(pool, req.body.roleIds);
        const department = await getDepartment(pool, req.body.boPhanId);
        const username = trim(req.body.username);
        await transaction.begin();
        const inserted = await txRequest(transaction)
            .input("Username", sql.NVarChar(50), username)
            .input("PasswordHash", sql.NVarChar(255), md5(req.body.password))
            .input("FullName", sql.NVarChar(255), fullName)
            .input("Email", sql.NVarChar(255), email)
            .input("BoPhanId", sql.Int, department.Id)
            .input("BoPhan", sql.NVarChar(100), department.TenBoPhan)
            .input("ActorUserId", sql.Int, req.user.userId)
            .query(`
                INSERT dbo.USERS
                    (Username, PasswordHash, FullName, Email, BoPhanId, BoPhan, TrangThai, CreatedAt, UpdatedAt, UpdatedBy)
                OUTPUT INSERTED.Id
                VALUES
                    (@Username,@PasswordHash,@FullName,@Email,@BoPhanId,@BoPhan,1,SYSDATETIME(),SYSDATETIME(),@ActorUserId)
            `);
        const userId = inserted.recordset[0].Id;
        await replaceUserRoles(transaction, userId, roles.map((role) => role.Id));
        await replaceManagedDepartments(
            transaction, userId,
            hasDepartmentLeadRole(roles) ? req.body.managedBoPhanIds : [],
            req.user.userId
        );
        const after = await getUserSnapshot(transaction, userId);
        await writeAudit(transaction, req.user.userId, "CREATE_USER", "USER", userId, null, after);
        await transaction.commit();
        res.status(201).json({ message: "Đã tạo tài khoản", user: after });
    } catch (error) {
        try { await transaction.rollback(); } catch { /* transaction chưa bắt đầu */ }
        handleError(res, error, "Không tạo được tài khoản");
    }
});

router.put("/users/:id", async (req, res) => {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    try {
        const userId = Number(req.params.id);
        const rowVersion = decodeRowVersion(req.body.rowVersion);
        if (!rowVersion) throw httpError(400, "Thiếu phiên bản dữ liệu, vui lòng tải lại");
        const { fullName, email } = validateUserInput(req.body, false);
        const roles = await validateRoles(pool, req.body.roleIds);
        const department = await getDepartment(pool, req.body.boPhanId);
        await transaction.begin();
        const before = await getUserSnapshot(transaction, userId);
        if (!before) throw httpError(404, "Không tìm thấy tài khoản");
        const updated = await txRequest(transaction)
            .input("Id", sql.Int, userId)
            .input("FullName", sql.NVarChar(255), fullName)
            .input("Email", sql.NVarChar(255), email)
            .input("BoPhanId", sql.Int, department.Id)
            .input("BoPhan", sql.NVarChar(100), department.TenBoPhan)
            .input("ActorUserId", sql.Int, req.user.userId)
            .input("RowVersion", sql.VarBinary(8), rowVersion)
            .query(`
                UPDATE dbo.USERS
                SET FullName=@FullName, Email=@Email, BoPhanId=@BoPhanId, BoPhan=@BoPhan,
                    UpdatedAt=SYSDATETIME(), UpdatedBy=@ActorUserId
                OUTPUT INSERTED.Id
                WHERE Id=@Id AND RowVersion=@RowVersion
            `);
        if (!updated.recordset.length) throw httpError(409, "Tài khoản đã được người khác cập nhật, vui lòng tải lại");
        await replaceUserRoles(transaction, userId, roles.map((role) => role.Id));
        await replaceManagedDepartments(
            transaction, userId,
            hasDepartmentLeadRole(roles) ? req.body.managedBoPhanIds : [],
            req.user.userId
        );
        const actorId = Number(req.user.userId);
        const targetStillManager = await userHasManagementAccess(transaction, userId);
        if (userId === actorId && !targetStillManager) {
            throw httpError(400, "Bạn không thể tự gỡ quyền quản trị của chính mình");
        }
        if (!targetStillManager && await countActiveManagers(transaction) < 1) {
            throw httpError(400, "Hệ thống phải còn ít nhất một tài khoản quản trị hoạt động");
        }
        const after = await getUserSnapshot(transaction, userId);
        await writeAudit(transaction, actorId, "UPDATE_USER", "USER", userId, before, after);
        await transaction.commit();
        res.json({ message: "Đã cập nhật tài khoản", user: after });
    } catch (error) {
        try { await transaction.rollback(); } catch { /* transaction chưa bắt đầu */ }
        handleError(res, error, "Không cập nhật được tài khoản");
    }
});

router.post("/users/:id/signature", runSignatureUpload, async (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "Tài khoản không hợp lệ" });
    }
    if (!req.file?.buffer) {
        return res.status(400).json({ message: "Vui lòng chọn ảnh chữ ký" });
    }

    let newFileName = null;
    let transaction = null;
    try {
        const pool = await poolPromise;
        const currentResult = await pool.request()
            .input("UserId", sql.Int, userId)
            .query("SELECT Id, SignatureImagePath FROM dbo.USERS WHERE Id=@UserId");
        const current = currentResult.recordset?.[0];
        if (!current) return res.status(404).json({ message: "Không tìm thấy tài khoản" });

        try {
            const metadata = await sharp(req.file.buffer).metadata();
            if (!["png", "jpeg", "webp"].includes(metadata.format)) {
                throw new Error("Định dạng ảnh không hợp lệ");
            }
            await fs.mkdir(signatureDirectory, { recursive: true });
            newFileName = `${userId}-${crypto.randomUUID()}.png`;
            const outputPath = path.join(signatureDirectory, newFileName);
            await sharp(req.file.buffer)
                .rotate()
                .resize({ width: 800, height: 300, fit: "inside", withoutEnlargement: true })
                .png({ compressionLevel: 9 })
                .toFile(outputPath);
        } catch (error) {
            throw httpError(400, error.message || "Nội dung file ảnh không hợp lệ");
        }

        transaction = new sql.Transaction(pool);
        await transaction.begin();
        await txRequest(transaction)
            .input("UserId", sql.Int, userId)
            .input("SignatureImagePath", sql.NVarChar(500), newFileName)
            .input("ActorUserId", sql.Int, req.user.userId)
            .query(`
                UPDATE dbo.USERS
                SET SignatureImagePath=@SignatureImagePath,
                    UpdatedAt=SYSDATETIME(), UpdatedBy=@ActorUserId
                WHERE Id=@UserId
            `);
        await writeAudit(
            transaction,
            req.user.userId,
            current.SignatureImagePath ? "REPLACE_USER_SIGNATURE" : "UPLOAD_USER_SIGNATURE",
            "USER",
            userId,
            { HasSignature: Boolean(current.SignatureImagePath) },
            { HasSignature: true }
        );
        await transaction.commit();
        transaction = null;
        newFileName = null;
        await removeSignatureFile(current.SignatureImagePath);

        const user = await getUserSnapshot(pool, userId);
        res.json({ message: "Đã cập nhật ảnh chữ ký", user });
    } catch (error) {
        if (transaction) {
            try { await transaction.rollback(); } catch { /* transaction chưa bắt đầu */ }
        }
        if (newFileName) await removeSignatureFile(newFileName);
        handleError(res, error, "Không cập nhật được ảnh chữ ký");
    }
});

router.delete("/users/:id/signature", async (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "Tài khoản không hợp lệ" });
    }
    let transaction = null;
    try {
        const pool = await poolPromise;
        const currentResult = await pool.request()
            .input("UserId", sql.Int, userId)
            .query("SELECT Id, SignatureImagePath FROM dbo.USERS WHERE Id=@UserId");
        const current = currentResult.recordset?.[0];
        if (!current) return res.status(404).json({ message: "Không tìm thấy tài khoản" });

        transaction = new sql.Transaction(pool);
        await transaction.begin();
        await txRequest(transaction)
            .input("UserId", sql.Int, userId)
            .input("ActorUserId", sql.Int, req.user.userId)
            .query(`
                UPDATE dbo.USERS
                SET SignatureImagePath=NULL,
                    UpdatedAt=SYSDATETIME(), UpdatedBy=@ActorUserId
                WHERE Id=@UserId
            `);
        await writeAudit(
            transaction,
            req.user.userId,
            "DELETE_USER_SIGNATURE",
            "USER",
            userId,
            { HasSignature: Boolean(current.SignatureImagePath) },
            { HasSignature: false }
        );
        await transaction.commit();
        transaction = null;
        await removeSignatureFile(current.SignatureImagePath);

        const user = await getUserSnapshot(pool, userId);
        res.json({ message: "Đã xóa ảnh chữ ký", user });
    } catch (error) {
        if (transaction) {
            try { await transaction.rollback(); } catch { /* transaction chưa bắt đầu */ }
        }
        handleError(res, error, "Không xóa được ảnh chữ ký");
    }
});

router.patch("/users/:id/status", async (req, res) => {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    try {
        if (typeof req.body.trangThai !== "boolean") throw httpError(400, "Trạng thái không hợp lệ");
        const userId = Number(req.params.id);
        const actorId = Number(req.user.userId);
        if (userId === actorId && !req.body.trangThai) throw httpError(400, "Bạn không thể tự khóa tài khoản của mình");
        const rowVersion = decodeRowVersion(req.body.rowVersion);
        if (!rowVersion) throw httpError(400, "Thiếu phiên bản dữ liệu, vui lòng tải lại");
        await transaction.begin();
        const before = await getUserSnapshot(transaction, userId);
        if (!before) throw httpError(404, "Không tìm thấy tài khoản");
        const updated = await txRequest(transaction)
            .input("Id", sql.Int, userId)
            .input("TrangThai", sql.Bit, req.body.trangThai)
            .input("ActorUserId", sql.Int, actorId)
            .input("RowVersion", sql.VarBinary(8), rowVersion)
            .query(`
                UPDATE dbo.USERS
                SET TrangThai=@TrangThai, UpdatedAt=SYSDATETIME(), UpdatedBy=@ActorUserId
                OUTPUT INSERTED.Id
                WHERE Id=@Id AND RowVersion=@RowVersion
            `);
        if (!updated.recordset.length) throw httpError(409, "Tài khoản đã được người khác cập nhật, vui lòng tải lại");
        if (!req.body.trangThai && await countActiveManagers(transaction) < 1) {
            throw httpError(400, "Hệ thống phải còn ít nhất một tài khoản quản trị hoạt động");
        }
        const after = await getUserSnapshot(transaction, userId);
        await writeAudit(transaction, actorId, req.body.trangThai ? "ACTIVATE_USER" : "DEACTIVATE_USER", "USER", userId, before, after);
        await transaction.commit();
        res.json({ message: req.body.trangThai ? "Đã mở tài khoản" : "Đã khóa tài khoản", user: after });
    } catch (error) {
        try { await transaction.rollback(); } catch { /* transaction chưa bắt đầu */ }
        handleError(res, error, "Không đổi được trạng thái tài khoản");
    }
});

router.post("/users/:id/reset-password", async (req, res) => {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    try {
        const password = String(req.body.password || "");
        if (password.length < 8 || password.length > 128) {
            return res.status(400).json({ message: "Mật khẩu phải từ 8-128 ký tự" });
        }
        const rowVersion = decodeRowVersion(req.body.rowVersion);
        if (!rowVersion) return res.status(400).json({ message: "Thiếu phiên bản dữ liệu, vui lòng tải lại" });
        await transaction.begin();
        const before = await getUserSnapshot(transaction, req.params.id);
        if (!before) throw httpError(404, "Không tìm thấy tài khoản");
        const result = await txRequest(transaction)
            .input("Id", sql.Int, Number(req.params.id))
            .input("PasswordHash", sql.NVarChar(255), md5(password))
            .input("ActorUserId", sql.Int, req.user.userId)
            .input("RowVersion", sql.VarBinary(8), rowVersion)
            .query(`
                UPDATE dbo.USERS
                SET PasswordHash=@PasswordHash, UpdatedAt=SYSDATETIME(), UpdatedBy=@ActorUserId
                OUTPUT INSERTED.RowVersion
                WHERE Id=@Id AND RowVersion=@RowVersion
            `);
        if (!result.recordset.length) throw httpError(409, "Tài khoản đã được người khác cập nhật, vui lòng tải lại");
        const after = { ...before, RowVersion: encodeRowVersion(result.recordset[0].RowVersion) };
        await writeAudit(transaction, req.user.userId, "RESET_PASSWORD", "USER", req.params.id,
            { Id: before.Id, Username: before.Username },
            { Id: before.Id, Username: before.Username, PasswordReset: true });
        await transaction.commit();
        res.json({ message: "Đã đặt lại mật khẩu", user: after });
    } catch (error) {
        try { await transaction.rollback(); } catch { /* transaction chưa bắt đầu */ }
        handleError(res, error, "Không đặt lại được mật khẩu");
    }
});

router.get("/roles", async (_req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT r.Id, r.RoleCode, r.RoleName, ISNULL(r.TrangThai,1) AS TrangThai,
                   ISNULL(r.IsSystem,0) AS IsSystem, r.CreatedAt, r.UpdatedAt, r.RowVersion,
                   COUNT(DISTINCT ur.UserId) AS UserCount,
                   COUNT(DISTINCT CASE WHEN ISNULL(u.TrangThai,0)=1 THEN ur.UserId END) AS ActiveUserCount,
                   COUNT(DISTINCT rp.PermissionId) AS PermissionCount
            FROM dbo.ROLES r
            LEFT JOIN dbo.USER_ROLE ur ON ur.RoleId=r.Id
            LEFT JOIN dbo.USERS u ON u.Id=ur.UserId
            LEFT JOIN dbo.ROLE_PERMISSION rp ON rp.RoleId=r.Id
            GROUP BY r.Id,r.RoleCode,r.RoleName,r.TrangThai,r.IsSystem,r.CreatedAt,r.UpdatedAt,r.RowVersion
            ORDER BY ISNULL(r.IsSystem,0) DESC, r.RoleCode;
            SELECT rp.RoleId, p.Id, p.PermissionCode, p.PermissionName
            FROM dbo.ROLE_PERMISSION rp
            JOIN dbo.PERMISSIONS p ON p.Id=rp.PermissionId
            ORDER BY p.PermissionCode;
        `);
        const permissionsByRole = new Map();
        (result.recordsets[1] || []).forEach((permission) => {
            if (!permissionsByRole.has(Number(permission.RoleId))) permissionsByRole.set(Number(permission.RoleId), []);
            permissionsByRole.get(Number(permission.RoleId)).push(permission);
        });
        res.json((result.recordsets[0] || []).map((role) => ({
            ...mapRole(role),
            permissions: permissionsByRole.get(Number(role.Id)) || []
        })));
    } catch (error) {
        handleError(res, error, "Không tải được danh sách role");
    }
});

router.post("/roles", async (req, res) => {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    try {
        const roleCode = trim(req.body.roleCode).toUpperCase();
        const roleName = trim(req.body.roleName);
        if (!/^[A-Z0-9_]{2,50}$/.test(roleCode)) throw httpError(400, "Mã role chỉ gồm chữ in hoa, số và gạch dưới");
        if (!roleName) throw httpError(400, "Vui lòng nhập tên role");
        const permissions = await validatePermissions(pool, req.body.permissionIds);
        await transaction.begin();
        const inserted = await txRequest(transaction)
            .input("RoleCode", sql.NVarChar(50), roleCode)
            .input("RoleName", sql.NVarChar(255), roleName)
            .input("ActorUserId", sql.Int, req.user.userId)
            .query(`
                INSERT dbo.ROLES
                    (RoleCode,RoleName,TrangThai,IsSystem,CreatedAt,UpdatedAt,UpdatedBy)
                OUTPUT INSERTED.Id
                VALUES
                    (@RoleCode,@RoleName,1,0,SYSDATETIME(),SYSDATETIME(),@ActorUserId)
            `);
        const roleId = inserted.recordset[0].Id;
        await replaceRolePermissions(transaction, roleId, permissions.map((permission) => permission.Id));
        const after = await getRoleSnapshot(transaction, roleId);
        await writeAudit(transaction, req.user.userId, "CREATE_ROLE", "ROLE", roleId, null, after);
        await transaction.commit();
        res.status(201).json({ message: "Đã tạo role", role: after });
    } catch (error) {
        try { await transaction.rollback(); } catch { /* transaction chưa bắt đầu */ }
        handleError(res, error, "Không tạo được role");
    }
});

router.put("/roles/:id", async (req, res) => {
    try {
        const roleName = trim(req.body.roleName);
        if (!roleName) return res.status(400).json({ message: "Vui lòng nhập tên role" });
        const rowVersion = decodeRowVersion(req.body.rowVersion);
        if (!rowVersion) return res.status(400).json({ message: "Thiếu phiên bản dữ liệu, vui lòng tải lại" });
        const pool = await poolPromise;
        const before = await getRoleSnapshot(pool, req.params.id);
        if (!before) return res.status(404).json({ message: "Không tìm thấy role" });
        const result = await pool.request()
            .input("Id", sql.Int, Number(req.params.id))
            .input("RoleName", sql.NVarChar(255), roleName)
            .input("ActorUserId", sql.Int, req.user.userId)
            .input("RowVersion", sql.VarBinary(8), rowVersion)
            .query(`
                UPDATE dbo.ROLES
                SET RoleName=@RoleName, UpdatedAt=SYSDATETIME(), UpdatedBy=@ActorUserId
                OUTPUT INSERTED.RowVersion
                WHERE Id=@Id AND RowVersion=@RowVersion
            `);
        if (!result.recordset.length) return res.status(409).json({ message: "Role đã được người khác cập nhật, vui lòng tải lại" });
        const after = await getRoleSnapshot(pool, req.params.id);
        await writeAudit(pool, req.user.userId, "UPDATE_ROLE", "ROLE", req.params.id, before, after);
        res.json({ message: "Đã cập nhật role", role: after });
    } catch (error) {
        handleError(res, error, "Không cập nhật được role");
    }
});

router.patch("/roles/:id/status", async (req, res) => {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    try {
        if (typeof req.body.trangThai !== "boolean") throw httpError(400, "Trạng thái không hợp lệ");
        const rowVersion = decodeRowVersion(req.body.rowVersion);
        if (!rowVersion) throw httpError(400, "Thiếu phiên bản dữ liệu, vui lòng tải lại");
        await transaction.begin();
        const before = await getRoleSnapshot(transaction, req.params.id);
        if (!before) throw httpError(404, "Không tìm thấy role");
        if (before.IsSystem) throw httpError(400, "Không thể vô hiệu hóa role hệ thống");
        if (!req.body.trangThai && Number(before.ActiveUserCount) > 0) {
            throw httpError(400, "Không thể vô hiệu hóa role đang được gán cho tài khoản hoạt động");
        }
        const result = await txRequest(transaction)
            .input("Id", sql.Int, Number(req.params.id))
            .input("TrangThai", sql.Bit, req.body.trangThai)
            .input("ActorUserId", sql.Int, req.user.userId)
            .input("RowVersion", sql.VarBinary(8), rowVersion)
            .query(`
                UPDATE dbo.ROLES
                SET TrangThai=@TrangThai, UpdatedAt=SYSDATETIME(), UpdatedBy=@ActorUserId
                OUTPUT INSERTED.Id
                WHERE Id=@Id AND RowVersion=@RowVersion
            `);
        if (!result.recordset.length) throw httpError(409, "Role đã được người khác cập nhật, vui lòng tải lại");
        const after = await getRoleSnapshot(transaction, req.params.id);
        await writeAudit(transaction, req.user.userId, req.body.trangThai ? "ACTIVATE_ROLE" : "DEACTIVATE_ROLE", "ROLE", req.params.id, before, after);
        await transaction.commit();
        res.json({ message: req.body.trangThai ? "Đã kích hoạt role" : "Đã vô hiệu hóa role", role: after });
    } catch (error) {
        try { await transaction.rollback(); } catch { /* transaction chưa bắt đầu */ }
        handleError(res, error, "Không đổi được trạng thái role");
    }
});

router.put("/roles/:id/permissions", async (req, res) => {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    try {
        const rowVersion = decodeRowVersion(req.body.rowVersion);
        if (!rowVersion) throw httpError(400, "Thiếu phiên bản dữ liệu, vui lòng tải lại");
        const permissions = await validatePermissions(pool, req.body.permissionIds);
        await transaction.begin();
        const before = await getRoleSnapshot(transaction, req.params.id);
        if (!before) throw httpError(404, "Không tìm thấy role");
        const touched = await txRequest(transaction)
            .input("Id", sql.Int, Number(req.params.id))
            .input("ActorUserId", sql.Int, req.user.userId)
            .input("RowVersion", sql.VarBinary(8), rowVersion)
            .query(`
                UPDATE dbo.ROLES
                SET UpdatedAt=SYSDATETIME(), UpdatedBy=@ActorUserId
                OUTPUT INSERTED.Id
                WHERE Id=@Id AND RowVersion=@RowVersion
            `);
        if (!touched.recordset.length) throw httpError(409, "Role đã được người khác cập nhật, vui lòng tải lại");
        await replaceRolePermissions(transaction, Number(req.params.id), permissions.map((permission) => permission.Id));
        if (!await userHasManagementAccess(transaction, req.user.userId)) {
            throw httpError(400, "Bạn không thể tự gỡ quyền quản trị của chính mình");
        }
        if (await countActiveManagers(transaction) < 1) {
            throw httpError(400, "Hệ thống phải còn ít nhất một tài khoản quản trị hoạt động");
        }
        const after = await getRoleSnapshot(transaction, req.params.id);
        await writeAudit(transaction, req.user.userId, "UPDATE_ROLE_PERMISSIONS", "ROLE", req.params.id, before, after);
        await transaction.commit();
        res.json({ message: "Đã cập nhật permission của role", role: after });
    } catch (error) {
        try { await transaction.rollback(); } catch { /* transaction chưa bắt đầu */ }
        handleError(res, error, "Không cập nhật được permission của role");
    }
});

module.exports = router;
