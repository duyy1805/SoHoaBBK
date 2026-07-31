const express = require("express");
const router = express.Router();
const sql = require("mssql");

const { poolPromise } = require("../db");

const authenticateToken = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/permission.middleware");

const hasPermission = (user, permissionCode) =>
    Array.isArray(user?.permissions) && user.permissions.includes(permissionCode);
const hasRole = (user, roleCode) => Array.isArray(user?.roles) &&
    user.roles.some((role) => String(role || "").toUpperCase() === roleCode);
const isAdmin = (user) => hasRole(user, "ADMIN");
const isDepartmentLead = (user) => Array.isArray(user?.roles) && user.roles.some((role) => String(role || "").toUpperCase().startsWith("TP_"));

const KPH_V01_CUSTOM_FIELDS = new Set([
    "TenBoPhan", "MaBoPhan", "TenSanPham", "MaSanPham", "MaTruyNguyen",
    "DonHang", "Lot", "SoLuongKPH", "DauTuan", "PhatHienTu", "MucDo"
]);

const hasStrictLeadRole = (user) => Array.isArray(user?.roles) &&
    user.roles.some((role) => String(role || "").toUpperCase().startsWith("TP_"));

const getKphV01FlowAccess = async (pool, bienBanId, user) => {
    const result = await pool.request()
        .input("BienBanId", sql.Int, bienBanId)
        .query(`
            SELECT TOP 1 bb.Id, bb.NguoiLapId, bb.TrangThai,
                ISNULL(bb.MauPhieuVersion, 'V00') AS MauPhieuVersion,
                COALESCE(bb.BoPhanTaoId, creator.BoPhanId) AS BoPhanTaoId,
                bb.OpinionDepartmentsConfirmedAt,
                bb.CreatorConfirmedAt
            FROM dbo.BIEN_BAN_KIEM bb
            LEFT JOIN dbo.USERS creator ON creator.Id = bb.NguoiLapId
            WHERE bb.Id = @BienBanId
        `);
    const record = result.recordset?.[0];
    if (!record) return { exists: false, canManage: false, record: null };

    const isCreator = Number(record.NguoiLapId) === Number(user?.userId);
    const isCreatorDepartmentLead = Number(record.BoPhanTaoId) === Number(user?.boPhanId) &&
        hasStrictLeadRole(user);
    return {
        exists: true,
        canManage: isCreator || isCreatorDepartmentLead || isAdmin(user),
        record
    };
};

const getKphCustomFieldAccess = async (pool, bienBanId, user) => {
    const result = await pool.request()
        .input("BienBanId", sql.Int, bienBanId)
        .query(`
            SELECT TOP 1 bb.Id, bb.NguoiLapId, bb.TrangThai,
                ISNULL(bb.MauPhieuVersion, 'V00') AS MauPhieuVersion,
                COALESCE(bb.BoPhanTaoId, creator.BoPhanId) AS CreatorBoPhanId
            FROM dbo.BIEN_BAN_KIEM bb
            LEFT JOIN dbo.USERS creator ON creator.Id = bb.NguoiLapId
            WHERE bb.Id = @BienBanId
        `);
    const record = result.recordset?.[0];
    if (!record) return { exists: false, canEdit: false, record: null };
    const isCreator = Number(record.NguoiLapId) === Number(user?.userId);
    const isCreatorDepartmentLead = Number(record.CreatorBoPhanId) === Number(user?.boPhanId) && hasStrictLeadRole(user);
    const canEdit = record.MauPhieuVersion === "V01" &&
        !["CHO_THEO_DOI", "HOAN_TAT"].includes(record.TrangThai) &&
        (isCreator || isCreatorDepartmentLead || isAdmin(user));
    return { exists: true, canEdit, record };
};

const hasLeadRole = (user) => {
    if (!Array.isArray(user?.roles) || user.roles.length === 0) {
        return true;
    }

    return user.roles.some((role) => role?.toUpperCase().includes("TP"));
};

const canManageDepartmentAssign = (user, boPhanId) => {
    if (isAdmin(user) || hasPermission(user, "XAC_NHAN_NGUOI_XU_LY")) {
        return true;
    }

    return user?.boPhanId === boPhanId && hasLeadRole(user);
};

const getBienBanAssignRows = async (pool, bienBanId) => {
    const result = await pool.request()
        .input("BienBanId", sql.Int, bienBanId)
        .query(`
            SELECT
                a.Id,
                a.BoPhanId,
                bp.MaBoPhan,
                bp.TenBoPhan,
                a.NguoiXuLyId,
                u.FullName AS NguoiXuLy,
                a.AssignedToUserAt,
                CAST(ISNULL(a.IsBpsxSignature, 0) AS BIT) AS IsBpsxSignature
            FROM BIEN_BAN_ASSIGN a
            LEFT JOIN DM_BO_PHAN bp ON bp.Id = a.BoPhanId
            LEFT JOIN USERS u ON u.Id = a.NguoiXuLyId
            WHERE a.BienBanId = @BienBanId
            ORDER BY a.Id
        `);

    return result.recordset;
};

const getKphV01Data = async (pool, bienBanId) => {
    const result = await pool.request()
        .input("BienBanId", sql.Int, bienBanId)
        .query(`
            SELECT TOP 1
                ISNULL(bb.MauPhieuVersion, 'V00') AS MauPhieuVersion,
                ISNULL(bb.YeuCauChiPhi, 0) AS YeuCauChiPhi,
                ISNULL(bb.YeuCauHanhDong, 0) AS YeuCauHanhDong,
                COALESCE(bb.BoPhanTaoId, u.BoPhanId) AS BoPhanTaoId,
                CAST(CASE WHEN bb.OpinionDepartmentsConfirmedAt IS NULL THEN 0 ELSE 1 END AS bit)
                    AS OpinionDepartmentsConfirmed,
                bb.OpinionDepartmentsConfirmedAt,
                bb.CreatorConfirmedAt,
                bp.MaBoPhan AS MaDonViTaoPhieu,
                bp.TenBoPhan AS DonViTaoPhieu
            FROM dbo.BIEN_BAN_KIEM bb
            LEFT JOIN dbo.USERS u ON u.Id = bb.NguoiLapId
            LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = COALESCE(bb.BoPhanTaoId, u.BoPhanId)
            WHERE bb.Id = @BienBanId;

            SELECT
                yk.Id,
                yk.BoPhanId,
                COALESCE(bp.MaBoPhan, yk.BoPhan) AS MaBoPhan,
                COALESCE(bp.TenBoPhan, yk.BoPhan) AS TenBoPhan,
                yk.TrangThai,
                yk.ThuTu,
                CAST(ISNULL(yk.IsActive, 1) AS bit) AS IsActive,
                yk.CreatedBy,
                yk.CreatedAt,
                yk.RemovedBy,
                yk.RemovedAt,
                tl.LuaChon,
                tl.NoiDung,
                tl.NguoiTraLoiId,
                responder.FullName AS NguoiTraLoi,
                tl.ThoiGian,
                CAST(CASE WHEN tl.Id IS NULL THEN 0 ELSE 1 END AS bit) AS HasResponded
            FROM dbo.XIN_Y_KIEN yk
            LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = yk.BoPhanId
            OUTER APPLY (
                SELECT TOP 1 response.*
                FROM dbo.TRA_LOI_Y_KIEN response
                WHERE response.XinYKienId = yk.Id
                ORDER BY response.ThoiGian DESC, response.Id DESC
            ) tl
            LEFT JOIN dbo.USERS responder ON responder.Id = tl.NguoiTraLoiId
            WHERE yk.BienBanId = @BienBanId
              AND ISNULL(yk.IsActive, 1) = 1
            ORDER BY yk.ThuTu, yk.Id;

            SELECT TOP 1
                td.Id,
                td.KetQua,
                td.PhieuKphMoiSo,
                td.GhiChu,
                td.NguoiTheoDoiId,
                u.FullName AS NguoiTheoDoi,
                td.ThoiGian
            FROM dbo.BIEN_BAN_THEO_DOI_DANH_GIA td
            LEFT JOIN dbo.USERS u ON u.Id = td.NguoiTheoDoiId
            WHERE td.BienBanId = @BienBanId;
        `);

    return {
        meta: result.recordsets?.[0]?.[0] || { MauPhieuVersion: "V00" },
        specialistOpinions: result.recordsets?.[1] || [],
        followUpEvaluation: result.recordsets?.[2]?.[0] || null
    };
};

/* =========================================================
   GET /bien-ban
   Permission : XEM_BIEN_BAN
========================================================= */

router.get(
    "/",
    authenticateToken,
    // authorize("XEM_BIEN_BAN"),
    async (req, res) => {
        try {

            const pool = await poolPromise;
            const request = pool.request();

            // Lọc danh sách biên bản theo quyền hạn: 
            // Nếu không có quyền quản trị (QUAN_TRI_DM), không có quyền phân công, và không phải Trưởng phòng (TP)
            // thì chỉ xem biên bản liên quan đến cá nhân/bộ phận
            const isManager = req.user.permissions.includes("QUAN_TRI_DM") ||
                req.user.permissions.includes("XAC_NHAN_NGUOI_XU_LY") ||
                hasLeadRole(req.user);

            if (!isManager) {
                request.input("UserId", sql.Int, req.user.userId);
                request.input("BoPhanId", sql.Int, req.user.boPhanId);
            }

            const result = await request.execute("sp_BienBan_GetList");
            const rows = result.recordset || [];

            if (rows.length === 0) {
                return res.json(rows);
            }

            const bienBanIds = [...new Set(
                rows
                    .map((item) => Number(item.BienBanId))
                    .filter((id) => Number.isInteger(id) && id > 0)
            )];

            if (bienBanIds.length === 0) {
                return res.json(rows);
            }

            const progressResult = await pool.request()
                .input("BienBanIds", sql.NVarChar(sql.MAX), bienBanIds.join(","))
                .execute("sp_BienBan_GetListProgress");

            // sp_BienBan_GetListProgress cũ đối chiếu bộ phận của người xác nhận,
            // không tính BoPhanId đích được lưu trực tiếp trên bản ghi xác nhận.
            // Lấy lại tiến độ biên bản thường theo dữ liệu hiện hành; SXBT vẫn dùng SP.
            const normalProgressResult = await pool.request().query(`
                SELECT
                    a.BienBanId,
                    a.Id AS AssignId,
                    a.BoPhanId,
                    bp.MaBoPhan,
                    bp.TenBoPhan,
                    CASE WHEN EXISTS (
                        SELECT 1
                        FROM dbo.BIEN_BAN_XAC_NHAN xn
                        LEFT JOIN dbo.USERS u ON u.Id = xn.NguoiXacNhanId
                        WHERE xn.BienBanId = a.BienBanId
                          AND COALESCE(xn.BoPhanId, u.BoPhanId) = a.BoPhanId
                    ) THEN 1 ELSE 0 END AS DaXacNhan
                FROM dbo.BIEN_BAN_ASSIGN a
                JOIN dbo.BIEN_BAN_KIEM bb ON bb.Id = a.BienBanId
                LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = a.BoPhanId
                WHERE a.BienBanId IN (${bienBanIds.join(",")})
                  AND ISNULL(bb.MauPhieuVersion, 'V00') <> 'V01'

                UNION ALL

                SELECT
                    yk.BienBanId,
                    yk.Id AS AssignId,
                    yk.BoPhanId,
                    bp.MaBoPhan,
                    bp.TenBoPhan,
                    CASE WHEN EXISTS (
                        SELECT 1
                        FROM dbo.TRA_LOI_Y_KIEN tl
                        WHERE tl.XinYKienId = yk.Id
                    ) THEN 1 ELSE 0 END AS DaXacNhan
                FROM dbo.XIN_Y_KIEN yk
                JOIN dbo.BIEN_BAN_KIEM bb ON bb.Id = yk.BienBanId
                LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = yk.BoPhanId
                WHERE yk.BienBanId IN (${bienBanIds.join(",")})
                  AND ISNULL(bb.MauPhieuVersion, 'V00') = 'V01'
                  AND ISNULL(yk.IsActive, 1) = 1
            `);

            const normalProgressByBienBanId = new Map();
            for (const assign of normalProgressResult.recordset || []) {
                const key = Number(assign.BienBanId);
                const progress = normalProgressByBienBanId.get(key) || {
                    total: 0,
                    done: 0,
                    pendingDepartments: []
                };
                progress.total += 1;
                if (Number(assign.DaXacNhan) === 1) {
                    progress.done += 1;
                } else {
                    const displayName = assign.TenBoPhan || assign.MaBoPhan;
                    if (displayName) progress.pendingDepartments.push(displayName);
                }
                normalProgressByBienBanId.set(key, progress);
            }

            const progressByBienBanId = new Map(
                (progressResult.recordset || []).map((item) => [Number(item.BienBanId), item])
            );

            const listMetaResult = await pool.request()
                .input("BienBanIds", sql.NVarChar(sql.MAX), bienBanIds.join(","))
                .query(`
                    SELECT
                        bb.Id AS BienBanId,
                        COALESCE(bb.BoPhanTaoId, creator.BoPhanId) AS BoPhanTaoId,
                        creatorDepartment.MaBoPhan AS MaBoPhanTao,
                        creatorDepartment.TenBoPhan AS TenBoPhanTao,
                        CASE WHEN pk.LoaiKiemId = 4 THEN contractor.Ma_NhaThau ELSE NULL END AS MaDonVi
                    FROM dbo.BIEN_BAN_KIEM bb
                    LEFT JOIN dbo.USERS creator ON creator.Id = bb.NguoiLapId
                    LEFT JOIN dbo.DM_BO_PHAN creatorDepartment
                        ON creatorDepartment.Id = COALESCE(bb.BoPhanTaoId, creator.BoPhanId)
                    LEFT JOIN dbo.PHIEU_KIEM pk ON pk.Id = bb.PhieuKiemId
                    LEFT JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt
                        ON receipt.ID_PhieuNhapBTP = pk.SourceId
                    LEFT JOIN TAG_System.dbo.DM_BoPhan sourceDepartment
                        ON sourceDepartment.ID_BoPhan = receipt.ID_BoPhan
                    LEFT JOIN TAG_QTKD.dbo.DM_NhaThau contractor
                        ON contractor.ID_BoPhan = sourceDepartment.ID_BoPhan
                    WHERE bb.Id IN (
                        SELECT TRY_CONVERT(int, [value])
                        FROM STRING_SPLIT(@BienBanIds, ',')
                    )
                `);
            const listMetaByBienBanId = new Map(
                (listMetaResult.recordset || []).map((item) => [Number(item.BienBanId), item])
            );

            const normalizedRows = rows.map((item) => {
                const listMeta = listMetaByBienBanId.get(Number(item.BienBanId)) || {};
                const enrichedItem = {
                    ...item,
                    ...listMeta
                };
                const progress = progressByBienBanId.get(Number(item.BienBanId));
                if (!progress) return enrichedItem;

                const isSxbt = progress.IsSxbt === true || progress.IsSxbt === 1 ||
                    enrichedItem.LoaiBienBan === "SXBT" ||
                    enrichedItem.LoaiKiemId === 4 ||
                    String(enrichedItem.TrangThai || "").startsWith("BB_SXBT");

                const normalProgress = normalProgressByBienBanId.get(Number(item.BienBanId));
                const total = isSxbt ? (Number(progress.SoBoPhan) || 0) : (normalProgress?.total || 0);
                const done = isSxbt ? (Number(progress.DaCoYKien) || 0) : (normalProgress?.done || 0);
                const progressPercent = isSxbt
                    ? Number(progress.ProgressPercent)
                    : (total > 0 ? Math.round((done / total) * 100) : 0);

                return {
                    ...enrichedItem,
                    LoaiBienBan: isSxbt ? "SXBT" : enrichedItem.LoaiBienBan,
                    DaCoYKien: done,
                    SoBoPhan: total,
                    ProgressPercent: Number.isFinite(progressPercent)
                        ? progressPercent
                        : (total > 0 ? Math.round((done / total) * 100) : 0),
                    MaBoPhanDangCho: progress?.MaBoPhanDangCho || null,
                    TenBoPhanDangCho: progress?.TenBoPhanDangCho || null,
                    BoPhanChuaXacNhanText: isSxbt
                        ? (progress?.BoPhanChuaXacNhanText || null)
                        : (normalProgress?.pendingDepartments.join(", ") || null)
                };
            });

            res.json(normalizedRows);

        } catch (err) {

            console.error("GetBienBan error:", err);

            res.status(500).json({
                message: "Lỗi tải danh sách biên bản"
            });

        }
    }
);

/* =========================================================
   GET /bien-ban/:id
========================================================= */

router.get(
    "/:id",
    authenticateToken,
    async (req, res) => {

        try {
            const { id } = req.params;
            const pool = await poolPromise;

            const result = await pool.request()
                .input("BienBanId", sql.Int, id)
                .execute("sp_BienBan_GetDetail");
            const rs = result.recordsets;
            const baseInfo = rs[0]?.[0] || null;
            const subtypeResult = baseInfo?.PhieuKiemId
                ? await pool.request()
                    .input("PhieuKiemId", sql.Int, Number(baseInfo.PhieuKiemId))
                    .query(`
                        SELECT CASE WHEN EXISTS (
                            SELECT 1
                            FROM dbo.PHIEU_KIEM_CONG_DOAN_HEADER
                            WHERE PhieuKiemId = @PhieuKiemId
                        ) THEN 1 ELSE 0 END AS IsCongDoan
                    `)
                : null;
            const isCongDoan = Boolean(subtypeResult?.recordset?.[0]?.IsCongDoan);
            const defectResult = await pool.request()
                .input("BienBanId", sql.Int, id)
                .execute(isCongDoan
                    ? "sp_BienBan_CongDoan_GetDefects"
                    : "sp_BienBan_GetDefects");

            const assignRows = await getBienBanAssignRows(pool, id);
            const v01Data = await getKphV01Data(pool, id);
            const customFieldAccess = await getKphCustomFieldAccess(pool, id, req.user);
            const flowAccess = await getKphV01FlowAccess(pool, id, req.user);
            const proposalResult = await pool.request()
                .input("BienBanId", sql.Int, id)
                .query(`
                    SELECT x.Id, x.BoPhan, x.NoiDung, x.TrachNhiem, x.TheoDoi,
                        dx.Ten AS DeNghiXuLy, x.ThoiHan, x.NguoiXuLyId,
                        x.BoPhanId, creator.FullName AS NguoiNhap, x.CreatedAt,
                        bp.MaBoPhan, bp.TenBoPhan
                    FROM dbo.BIEN_BAN_XU_LY x
                    LEFT JOIN dbo.DM_DE_NGHI_XU_LY dx ON dx.Id = x.DeNghiXuLyId
                    LEFT JOIN dbo.USERS creator ON creator.Id = x.CreatedBy
                    LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = x.BoPhanId
                    WHERE x.BienBanId = @BienBanId
                    ORDER BY x.CreatedAt, x.Id
                `);

            // Gộp custom fields của biên bản và phiếu kiểm.
            // Ưu tiên field trên biên bản nếu trùng tên.
            let dynamicFields = [];
            const info = baseInfo;
            if (info) {
                let bienBanDynamicFields = [];
                let phieuKiemDynamicFields = [];

                if (info.DynamicFieldsJSON) {
                    try {
                        bienBanDynamicFields = JSON.parse(info.DynamicFieldsJSON);
                    } catch (e) {
                        console.error("Lỗi parse DynamicFieldsJSON:", e);
                    }
                }

                if (info.PhieuKiemDynamicFieldsJSON) {
                    try {
                        phieuKiemDynamicFields = JSON.parse(info.PhieuKiemDynamicFieldsJSON);
                    } catch (e) {
                        console.error("Lỗi parse PhieuKiemDynamicFieldsJSON:", e);
                    }
                }

                const mergedFieldMap = new Map();
                phieuKiemDynamicFields.forEach((field) => {
                    if (field?.FieldName) mergedFieldMap.set(field.FieldName, field);
                });
                bienBanDynamicFields.forEach((field) => {
                    if (field?.FieldName) mergedFieldMap.set(field.FieldName, field);
                });
                dynamicFields = Array.from(mergedFieldMap.values());

                delete info.DynamicFieldsJSON;
                delete info.PhieuKiemDynamicFieldsJSON;
            }

            const mergedAssigns = (assignRows.length > 0 ? assignRows : (rs[2] || [])).map((assign) => {
                const fallback = (rs[2] || []).find((item) => item.BoPhanId === assign.BoPhanId) || {};
                return {
                    ...fallback,
                    ...assign
                };
            });

            let phieuKiemXacNhan = [];
            const bienBanXacNhanResult = await pool.request().input("BienBanId", sql.Int, id).query(`
                SELECT
                    xn.Id,
                    xn.BienBanId,
                    xn.NguoiXacNhanId,
                    COALESCE(xn.BoPhanId, u.BoPhanId) AS BoPhanId,
                    xn.ThoiGian,
                    xn.VaiTro,
                    u.FullName,
                    bp.MaBoPhan, bp.TenBoPhan
                FROM dbo.BIEN_BAN_XAC_NHAN xn
                LEFT JOIN dbo.USERS u ON u.Id=xn.NguoiXacNhanId
                LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id=COALESCE(xn.BoPhanId,u.BoPhanId)
                WHERE xn.BienBanId=@BienBanId
            `);
            if (Number(info?.LoaiKiemId) === 6 && Number(info?.PhieuKiemId) > 0) {
                const xacNhanResult = await pool.request()
                    .input("PhieuKiemId", sql.Int, Number(info.PhieuKiemId))
                    .query(`
                        SELECT
                            xn.Id,
                            xn.PhieuKiemId,
                            xn.NguoiXacNhanId,
                            xn.VaiTro,
                            xn.TrangThai,
                            xn.NoiDung,
                            xn.ThoiGian,
                            u.FullName AS TenNguoiXacNhan,
                            u.BoPhanId
                        FROM dbo.PHIEU_KIEM_XAC_NHAN xn
                        LEFT JOIN dbo.USERS u ON u.Id = xn.NguoiXacNhanId
                        WHERE xn.PhieuKiemId = @PhieuKiemId
                        ORDER BY xn.ThoiGian DESC, xn.Id DESC
                    `);
                phieuKiemXacNhan = xacNhanResult.recordset || [];
            }

            res.json({
                info: info ? {
                    ...info,
                    IsCongDoan: isCongDoan,
                    MauPhieuVersion: v01Data.meta.MauPhieuVersion,
                    MaDonViTaoPhieu: v01Data.meta.MaDonViTaoPhieu,
                    DonViTaoPhieu: v01Data.meta.DonViTaoPhieu,
                    BoPhanTaoId: v01Data.meta.BoPhanTaoId,
                    OpinionDepartmentsConfirmed: Boolean(v01Data.meta.OpinionDepartmentsConfirmed),
                    OpinionDepartmentsConfirmedAt: v01Data.meta.OpinionDepartmentsConfirmedAt,
                    CreatorConfirmedAt: v01Data.meta.CreatorConfirmedAt,
                    YeuCauChiPhi: Boolean(v01Data.meta.YeuCauChiPhi),
                    YeuCauHanhDong: Boolean(v01Data.meta.YeuCauHanhDong),
                    CanManageKphFlow: flowAccess.canManage,
                    CanConfigureRequirements: flowAccess.canManage,
                    IsAdmin: isAdmin(req.user),
                    canEditKphCustomFields: customFieldAccess.canEdit
                } : null,
                defects: defectResult.recordset || [],
                assigns: mergedAssigns,
                xuLy: proposalResult.recordset || [],
                chiPhi: rs[4] || [],
                xacNhan: bienBanXacNhanResult.recordset || [],
                phieuKiemXacNhan,
                hanhDong: rs[6] || [],
                dynamicFields: dynamicFields,
                canEditKphCustomFields: customFieldAccess.canEdit,
                templateVersion: v01Data.meta.MauPhieuVersion,
                specialistOpinions: v01Data.specialistOpinions,
                followUpEvaluation: v01Data.followUpEvaluation,
                printMeta: v01Data.meta
            });

        } catch (err) {

            console.error("GetBienBanDetail error:");

            res.status(500).json({
                message: "Lỗi tải chi tiết biên bản"
            });
        }
    }
);

router.post(
    "/update-mo-ta",
    authenticateToken,
    async (req, res) => {

        const { bienBanId, moTaChung } = req.body;

        try {

            const pool = await poolPromise;
            const flowAccess = await getKphV01FlowAccess(pool, Number(bienBanId), req.user);
            if (!flowAccess.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
            if (flowAccess.record.MauPhieuVersion === "V01") {
                if (!flowAccess.canManage) {
                    return res.status(403).json({ message: "Chỉ bộ phận tạo phiếu được cập nhật mô tả" });
                }
                if (flowAccess.record.CreatorConfirmedAt || ["CHO_THEO_DOI", "HOAN_TAT"].includes(flowAccess.record.TrangThai)) {
                    return res.status(409).json({ message: "Biên bản đã được xác nhận và khóa nội dung" });
                }
            }
            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("MoTaChung", sql.NVarChar(sql.MAX), moTaChung)
                .execute("sp_BienBan_UpdateMoTaChung");

            res.json({ success: true });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                message: "Không thể cập nhật mô tả"
            });

        }

    });

/* =========================================================
   POST /bien-ban/xu-ly
========================================================= */
router.post(
    "/xu-ly",
    authenticateToken,
    // authorize("XAC_NHAN_LOI"),
    async (req, res) => {

        try {

            const { bienBanId } = req.body;
            const items = (Array.isArray(req.body?.items) ? req.body.items : [req.body])
                .map((item) => ({
                    noiDung: String(item?.noiDung || "").trim(),
                    deNghiXuLyId: Number(item?.deNghiXuLyId) || null,
                    thoiHan: item?.thoiHan || null,
                    trachNhiem: String(item?.trachNhiem || "").trim(),
                    theoDoi: String(item?.theoDoi || "").trim()
                }));
            const pool = await poolPromise;
            if (items.length === 0 || items.some((item) =>
                !item.noiDung || !item.thoiHan || !item.trachNhiem || !item.theoDoi
            )) {
                return res.status(400).json({ message: "Vui lòng nhập đầy đủ nội dung, thời hạn, trách nhiệm và theo dõi" });
            }
            const access = await getKphV01FlowAccess(pool, Number(bienBanId), req.user);
            if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
            if (access.record.MauPhieuVersion !== "V01") {
                return res.status(409).json({ message: "Biên bản không sử dụng luồng KPH V01" });
            }
            if (!access.canManage) {
                return res.status(403).json({ message: "Chỉ người lập hoặc Trưởng bộ phận tạo phiếu được nhập mục 5" });
            }
            if (access.record.CreatorConfirmedAt || ["CHO_THEO_DOI", "HOAN_TAT"].includes(access.record.TrangThai)) {
                return res.status(409).json({ message: "Biên bản đã được xác nhận và khóa nội dung" });
            }
            const creatorBoPhanId = Number(access.record.BoPhanTaoId);
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                for (const item of items) {
                    await new sql.Request(transaction)
                        .input("BienBanId", sql.Int, bienBanId)
                        .input("NoiDung", sql.NVarChar(sql.MAX), item.noiDung)
                        .input("DeNghiXuLyId", sql.Int, item.deNghiXuLyId)
                        .input("ThoiHan", sql.Date, item.thoiHan)
                        .input("UserId", sql.Int, req.user.userId)
                        .input("BoPhanId", sql.Int, creatorBoPhanId)
                        .input("TrachNhiem", sql.NVarChar(255), item.trachNhiem)
                        .input("TheoDoi", sql.NVarChar(255), item.theoDoi)
                        .query(`
                            INSERT INTO dbo.BIEN_BAN_XU_LY
                                (BienBanId, NoiDung, DeNghiXuLyId, BoPhanId, ThoiHan, TrachNhiem, TheoDoi, CreatedBy, CreatedAt)
                            VALUES (@BienBanId, @NoiDung, @DeNghiXuLyId, @BoPhanId, @ThoiHan, @TrachNhiem, @TheoDoi, @UserId, SYSDATETIME())
                        `);
                }
                await transaction.commit();
            } catch (error) {
                await transaction.rollback();
                throw error;
            }

            res.json({ success: true, inserted: items.length });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                message: "Thêm đề xuất xử lý thất bại"
            });

        }

    }
);

router.patch("/:id/requirements", authenticateToken, async (req, res) => {
    try {
        const bienBanId = Number(req.params.id);
        const pool = await poolPromise;
        const access = await getKphV01FlowAccess(pool, bienBanId, req.user);
        if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
        if (!access.canManage) return res.status(403).json({ message: "Chỉ bộ phận tạo phiếu được cấu hình yêu cầu" });
        const current = await pool.request().input("BienBanId", sql.Int, bienBanId).query(`
            SELECT TOP 1 TrangThai, ISNULL(MauPhieuVersion, 'V00') MauPhieuVersion,
                ISNULL(YeuCauChiPhi, 0) YeuCauChiPhi, ISNULL(YeuCauHanhDong, 0) YeuCauHanhDong
            FROM dbo.BIEN_BAN_KIEM WHERE Id = @BienBanId
        `);
        const row = current.recordset?.[0];
        if (!row) return res.status(404).json({ message: "Không tìm thấy biên bản" });
        if (row.MauPhieuVersion !== "V01" || access.record.CreatorConfirmedAt ||
            ["CHO_THEO_DOI", "HOAN_TAT"].includes(row.TrangThai)) {
            return res.status(409).json({ message: "Không thể thay đổi yêu cầu ở trạng thái hiện tại" });
        }
        const yeuCauChiPhi = req.body.yeuCauChiPhi === undefined ? Boolean(row.YeuCauChiPhi) : Boolean(req.body.yeuCauChiPhi);
        const yeuCauHanhDong = req.body.yeuCauHanhDong === undefined ? Boolean(row.YeuCauHanhDong) : Boolean(req.body.yeuCauHanhDong);
        if (!yeuCauChiPhi) {
            const exists = await pool.request().input("BienBanId", sql.Int, bienBanId).query("SELECT TOP 1 1 AS Found FROM dbo.BIEN_BAN_CHI_PHI WHERE BienBanId=@BienBanId");
            if (exists.recordset?.length) return res.status(409).json({ message: "Không thể bỏ yêu cầu chi phí khi đã có dữ liệu" });
        }
        if (!yeuCauHanhDong) {
            const exists = await pool.request().input("BienBanId", sql.Int, bienBanId).query("SELECT TOP 1 1 AS Found FROM dbo.BIEN_BAN_HANH_DONG WHERE BienBanId=@BienBanId");
            if (exists.recordset?.length) return res.status(409).json({ message: "Không thể bỏ yêu cầu hành động khi đã có dữ liệu" });
        }
        await pool.request().input("BienBanId", sql.Int, bienBanId).input("YeuCauChiPhi", sql.Bit, yeuCauChiPhi).input("YeuCauHanhDong", sql.Bit, yeuCauHanhDong)
            .query("UPDATE dbo.BIEN_BAN_KIEM SET YeuCauChiPhi=@YeuCauChiPhi, YeuCauHanhDong=@YeuCauHanhDong WHERE Id=@BienBanId");
        res.json({ success: true, yeuCauChiPhi, yeuCauHanhDong });
    } catch (err) { res.status(500).json({ message: "Không thể cập nhật yêu cầu" }); }
});
/* =========================================================
   POST /bien-ban/complete
========================================================= */

router.post(
    "/complete",
    authenticateToken,
    authorize("KET_LUAN"),
    async (req, res) => {

        try {

            const { bienBanId } = req.body;

            const pool = await poolPromise;

            const versionResult = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .query(`
                    SELECT TOP 1 ISNULL(MauPhieuVersion, 'V00') AS MauPhieuVersion
                    FROM dbo.BIEN_BAN_KIEM
                    WHERE Id = @BienBanId
                `);
            const templateVersion = versionResult.recordset?.[0]?.MauPhieuVersion || "V00";

            if (templateVersion === "V01") {
                return res.status(409).json({
                    message: "KPH V01 phải được xác nhận cuối bởi bộ phận tạo phiếu"
                });
            }

            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("NguoiXacNhanId", sql.Int, req.user.userId)
                .execute("sp_BienBan_Complete");

            res.json({ success: true });

        } catch (err) {

            console.error("CompleteBienBan error:", err);

            res.status(500).json({
                message: err.message
            });

        }

    }
);

router.post(
    "/:id/assign",
    authenticateToken,
    authorize("XAC_NHAN_NGUOI_XU_LY"),
    async (req, res) => {

        try {

            const bienBanId = parseInt(req.params.id, 10);
            const { boPhanIds, bpsxSignatureBoPhanId = null } = req.body;
            const normalizedBoPhanIds = [...new Set((Array.isArray(boPhanIds) ? boPhanIds : [])
                .map((id) => Number(id))
                .filter((id) => Number.isInteger(id) && id > 0))];
            const parsedBpsxSignatureBoPhanId = bpsxSignatureBoPhanId ? Number(bpsxSignatureBoPhanId) : null;
            const normalizedBpsxSignatureBoPhanId = Number.isInteger(parsedBpsxSignatureBoPhanId) && parsedBpsxSignatureBoPhanId > 0
                ? parsedBpsxSignatureBoPhanId
                : null;

            if (normalizedBoPhanIds.length === 0) {
                return res.status(400).json({
                    message: "Vui lòng chọn ít nhất một bộ phận xử lý"
                });
            }

            if (bpsxSignatureBoPhanId && normalizedBpsxSignatureBoPhanId === null) {
                return res.status(400).json({
                    message: "Bộ phận sản xuất không hợp lệ"
                });
            }

            const pool = await poolPromise;
            const version = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .query("SELECT TOP 1 ISNULL(MauPhieuVersion,'V00') AS MauPhieuVersion FROM dbo.BIEN_BAN_KIEM WHERE Id=@BienBanId");
            if (version.recordset?.[0]?.MauPhieuVersion === "V01") {
                return res.status(409).json({ message: "KPH V01 sử dụng danh sách bộ phận cần lấy ý kiến" });
            }
            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("BoPhanIds", sql.NVarChar, normalizedBoPhanIds.join(","))
                .input("BpsxSignatureBoPhanId", sql.Int, normalizedBpsxSignatureBoPhanId)
                .input("AssignedBy", sql.Int, req.user.userId)
                .execute("sp_BienBan_AssignBoPhan");

            res.json({ success: true });

        } catch (err) {
            console.error(err);
            const message = err?.originalError?.info?.message || err.message || "Không thể phân công bộ phận";
            res.status(/đã xác nhận|đã có ý kiến/i.test(message) ? 409 : 500).json({ message });

        }

    }
);

router.get(
    "/:id/assign-users",
    authenticateToken,
    async (req, res) => {
        try {
            const bienBanId = parseInt(req.params.id, 10);
            const queryBoPhanId = req.query.boPhanId ? parseInt(req.query.boPhanId, 10) : null;
            const targetBoPhanId = queryBoPhanId || req.user.boPhanId;

            if (!targetBoPhanId) {
                return res.status(400).json({
                    message: "Thiếu bộ phận cần lấy danh sách nhân sự"
                });
            }

            if (!canManageDepartmentAssign(req.user, targetBoPhanId)) {
                return res.status(403).json({
                    message: "Không được phép xem danh sách nhân sự của bộ phận này"
                });
            }

            const pool = await poolPromise;

            const assignCheck = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("BoPhanId", sql.Int, targetBoPhanId)
                .query(`
                    SELECT TOP 1 Id
                    FROM BIEN_BAN_ASSIGN
                    WHERE BienBanId = @BienBanId AND BoPhanId = @BoPhanId
                `);

            if (assignCheck.recordset.length === 0) {
                return res.status(404).json({
                    message: "Bộ phận này chưa được phân công cho biên bản"
                });
            }

            const result = await pool.request()
                .input("BoPhanId", sql.Int, targetBoPhanId)
                .query(`
                    SELECT
                        u.Id,
                        u.Username,
                        u.FullName,
                        u.BoPhanId,
                        bp.TenBoPhan,
                        bp.MaBoPhan
                    FROM USERS u
                    LEFT JOIN DM_BO_PHAN bp ON bp.Id = u.BoPhanId
                    WHERE u.TrangThai = 1
                      AND u.BoPhanId = @BoPhanId
                    ORDER BY u.FullName, u.Username
                `);

            res.json(result.recordset);
        } catch (err) {
            console.error("GetAssignableUsers error:", err);
            res.status(500).json({
                message: "Không lấy được danh sách nhân sự"
            });
        }

    }
);

router.post(
    "/:id/assign-user",
    authenticateToken,
    authorize("PHAN_CONG_NGUOI_XU_LY"),
    async (req, res) => {
        try {
            const bienBanId = parseInt(req.params.id, 10);
            const boPhanId = parseInt(req.body.boPhanId, 10);
            const nguoiXuLyId = parseInt(req.body.nguoiXuLyId, 10);

            if (!boPhanId || !nguoiXuLyId) {
                return res.status(400).json({
                    message: "Thiếu bộ phận hoặc người xử lý"
                });
            }

            const pool = await poolPromise;
            const version = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .query("SELECT TOP 1 ISNULL(MauPhieuVersion,'V00') AS MauPhieuVersion FROM dbo.BIEN_BAN_KIEM WHERE Id=@BienBanId");
            if (version.recordset?.[0]?.MauPhieuVersion === "V01") {
                return res.status(409).json({ message: "KPH V01 không phân công cá nhân xử lý" });
            }
            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("BoPhanId", sql.Int, boPhanId)
                .input("NguoiXuLyId", sql.Int, nguoiXuLyId)
                .execute("sp_BienBan_AssignNhanVien");

            res.json({ success: true });

        } catch (err) {
            console.error("AssignUser error:", err);

            res.status(500).json({
                message: err.message || "Không thể phân cá nhân xử lý"
            });
        }
    }
);

router.post(
    "/:id/confirm-assign",
    authenticateToken,
    authorize("XAC_NHAN_NGUOI_XU_LY"),
    async (req, res) => {
        try {
            const bienBanId = parseInt(req.params.id, 10);
            const pool = await poolPromise;
            const version = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .query("SELECT TOP 1 ISNULL(MauPhieuVersion,'V00') AS MauPhieuVersion FROM dbo.BIEN_BAN_KIEM WHERE Id=@BienBanId");
            if (version.recordset?.[0]?.MauPhieuVersion === "V01") {
                return res.status(409).json({ message: "KPH V01 không sử dụng bước chốt phân công xử lý" });
            }
            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .execute("sp_BienBan_ConfirmAssign");
            res.json({ success: true });
        } catch (err) {
            console.error("ConfirmAssign error:", err);
            res.status(409).json({
                message: err?.originalError?.info?.message || err.message || "Không thể xác nhận phân công"
            });
        }
    }
)

router.post(
    "/chi-phi",
    authenticateToken,
    async (req, res) => {

        try {

            const { bienBanId } = req.body;
            const items = (Array.isArray(req.body?.items) ? req.body.items : [req.body])
                .map((item) => ({
                    loaiChiPhi: String(item?.loaiChiPhi || "").trim(),
                    giaTri: Number(item?.giaTri) || 0,
                    thoiHan: item?.thoiHan || null
                }));
            if (items.length === 0 || items.some((item) => !item.loaiChiPhi)) {
                return res.status(400).json({ message: "Vui lòng nhập tên chi phí" });
            }
            const pool = await poolPromise;

            const access = await getKphV01FlowAccess(pool, Number(bienBanId), req.user);
            if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
            if (access.record.MauPhieuVersion === "V01" && !access.canManage) {
                return res.status(403).json({ message: "Chỉ bộ phận tạo phiếu được nhập mục 6" });
            }
            const requirement = await pool.request().input("BienBanId", sql.Int, bienBanId).query("SELECT TOP 1 ISNULL(YeuCauChiPhi,0) AS Required, TrangThai, CreatorConfirmedAt FROM dbo.BIEN_BAN_KIEM WHERE Id=@BienBanId");
            if (!requirement.recordset?.[0]?.Required || requirement.recordset?.[0]?.CreatorConfirmedAt ||
                ["CHO_THEO_DOI", "HOAN_TAT"].includes(requirement.recordset?.[0]?.TrangThai)) {
                return res.status(409).json({ message: "Mục chi phí không được yêu cầu hoặc phiếu đã hoàn tất" });
            }

            const targetBoPhanId = access.record.MauPhieuVersion === "V01"
                ? Number(access.record.BoPhanTaoId)
                : req.user.boPhanId;
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                for (const item of items) {
                    await new sql.Request(transaction)
                        .input("BienBanId", sql.Int, bienBanId)
                        .input("LoaiChiPhi", sql.NVarChar(255), item.loaiChiPhi)
                        .input("GiaTri", sql.Decimal(18, 2), item.giaTri)
                        .input("BoPhanId", sql.Int, targetBoPhanId)
                        .input("ThoiHan", sql.Date, item.thoiHan)
                        .input("CreatedBy", sql.Int, req.user.userId)
                        .execute("sp_BienBan_AddChiPhi");
                }
                await new sql.Request(transaction)
                    .input("BienBanId", sql.Int, bienBanId)
                    .input("UserId", sql.Int, req.user.userId)
                    .query(`
                        UPDATE dbo.BIEN_BAN_CHI_PHI
                        SET TheoDoiBy = @UserId
                        WHERE BienBanId = @BienBanId
                          AND CreatedBy = @UserId
                          AND TheoDoiBy IS NULL
                    `);
                await transaction.commit();
            } catch (error) {
                await transaction.rollback();
                throw error;
            }

            res.json({ success: true, inserted: items.length });

        } catch (err) {

            console.error("AddChiPhi error:", err);

            res.status(500).json({
                message: "Không thể thêm chi phí"
            });

        }

    });

router.post(
    "/hanh-dong",
    authenticateToken,
    async (req, res) => {

        try {

            const { bienBanId } = req.body;
            const items = (Array.isArray(req.body?.items) ? req.body.items : [req.body])
                .map((item) => ({
                    noiDung: String(item?.noiDung || "").trim(),
                    thoiHan: item?.thoiHan || null,
                    theoDoi: String(item?.theoDoi || "").trim()
                }));
            if (items.length === 0 || items.some((item) =>
                !item.noiDung || !item.thoiHan || !item.theoDoi
            )) {
                return res.status(400).json({ message: "Vui lòng nhập đầy đủ nội dung, thời hạn và theo dõi" });
            }

            const userId = req.user.userId;

            const pool = await poolPromise;

            const access = await getKphV01FlowAccess(pool, Number(bienBanId), req.user);
            if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
            if (access.record.MauPhieuVersion === "V01" && !access.canManage) {
                return res.status(403).json({ message: "Chỉ bộ phận tạo phiếu được nhập mục 7" });
            }
            const requirement = await pool.request().input("BienBanId", sql.Int, bienBanId).query("SELECT TOP 1 ISNULL(YeuCauHanhDong,0) AS Required, TrangThai, CreatorConfirmedAt FROM dbo.BIEN_BAN_KIEM WHERE Id=@BienBanId");
            if (!requirement.recordset?.[0]?.Required || requirement.recordset?.[0]?.CreatorConfirmedAt ||
                ["CHO_THEO_DOI", "HOAN_TAT"].includes(requirement.recordset?.[0]?.TrangThai)) {
                return res.status(409).json({ message: "Mục hành động không được yêu cầu hoặc phiếu đã hoàn tất" });
            }

            const targetBoPhanId = access.record.MauPhieuVersion === "V01"
                ? Number(access.record.BoPhanTaoId)
                : req.user.boPhanId;
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                for (const item of items) {
                    await new sql.Request(transaction)
                        .input("BienBanId", sql.Int, bienBanId)
                        .input("NoiDung", sql.NVarChar(sql.MAX), item.noiDung)
                        .input("BoPhanId", sql.Int, targetBoPhanId)
                        .input("ThoiHan", sql.Date, item.thoiHan)
                        .input("TheoDoi", sql.NVarChar(255), item.theoDoi)
                        .input("CreatedBy", sql.Int, userId)
                        .execute("sp_BienBan_HanhDong_Add");
                }
                await new sql.Request(transaction)
                    .input("BienBanId", sql.Int, bienBanId)
                    .input("UserId", sql.Int, userId)
                    .query(`
                        UPDATE dbo.BIEN_BAN_HANH_DONG
                        SET TheoDoiBy = @UserId
                        WHERE BienBanId = @BienBanId
                          AND CreatedBy = @UserId
                          AND TheoDoiBy IS NULL
                    `);
                await transaction.commit();
            } catch (error) {
                await transaction.rollback();
                throw error;
            }

            res.json({
                message: "Đã thêm hành động",
                inserted: items.length
            });

        } catch (err) {

            res.status(500).json({
                message: "Không thể thêm hành động"
            });

        }

    }
);

router.post(
    "/xac-nhan",
    (req, res, next) => {
        console.log("[POST /bien-ban/xac-nhan] Request received", {
            bienBanId: req.body?.bienBanId,
            requestedBoPhanId: req.body?.boPhanId,
            hasAuthorization: Boolean(req.headers.authorization)
        });
        next();
    },
    authenticateToken,
    authorize("DUYET_Y_KIEN"),
    async (req, res) => {

        try {

            const { bienBanId } = req.body
            const userId = req.user.userId
            const pool = await poolPromise
            const version = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .query("SELECT TOP 1 ISNULL(MauPhieuVersion,'V00') AS MauPhieuVersion FROM dbo.BIEN_BAN_KIEM WHERE Id=@BienBanId");
            if (version.recordset?.[0]?.MauPhieuVersion === "V01") {
                return res.status(409).json({ message: "KPH V01 không sử dụng xác nhận tiến độ theo bộ phận" });
            }
            const targetBoPhanId = isAdmin(req.user) && req.body.boPhanId ? Number(req.body.boPhanId) : Number(req.user.boPhanId)

            const pendingOpinion = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("BoPhanId", sql.Int, targetBoPhanId || null)
                .query(`
                    SELECT TOP 1 yk.Id
                    FROM dbo.BIEN_BAN_KIEM bb
                    JOIN dbo.XIN_Y_KIEN yk ON yk.BienBanId = bb.Id
                    WHERE bb.Id = @BienBanId
                      AND bb.MauPhieuVersion = 'V01'
                      AND yk.BoPhanId = @BoPhanId
                      AND NOT EXISTS (
                          SELECT 1
                          FROM dbo.TRA_LOI_Y_KIEN tl
                          WHERE tl.XinYKienId = yk.Id
                      )
                `)

            if (pendingOpinion.recordset?.length) {
                return res.status(409).json({
                    message: "Vui lòng xác nhận ý kiến phòng ban chuyên môn trước"
                })
            }
            const target = await pool.request().input("BienBanId", sql.Int, bienBanId).input("BoPhanId", sql.Int, targetBoPhanId).query(`
                SELECT TOP 1 bp.MaBoPhan,
                    CASE WHEN UPPER(bp.MaBoPhan)='B7' AND NOT EXISTS (
                        SELECT 1 FROM dbo.BIEN_BAN_XU_LY xl WHERE xl.BienBanId=@BienBanId AND xl.BoPhanId=@BoPhanId
                    ) THEN 1 ELSE 0 END AS MissingB7Proposal
                FROM dbo.BIEN_BAN_ASSIGN a JOIN dbo.DM_BO_PHAN bp ON bp.Id=a.BoPhanId
                WHERE a.BienBanId=@BienBanId AND a.BoPhanId=@BoPhanId
            `);
            if (!target.recordset?.length) return res.status(403).json({ message: "Bộ phận không nằm trong danh sách phân xử lý" });
            if (target.recordset[0].MissingB7Proposal) return res.status(409).json({ message: "B7 chưa nhập đề xuất xử lý" });

            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("NguoiXacNhanId", sql.Int, userId)
                .input("BoPhanId", sql.Int, targetBoPhanId || null)
                .execute("sp_BienBan_XacNhan1")

            res.json({
                message: "Đã xác nhận"
            })

        } catch (err) {

            console.error("[POST /bien-ban/xac-nhan] Xác nhận thất bại", {
                bienBanId: req.body?.bienBanId,
                userId: req.user?.userId,
                userBoPhanId: req.user?.boPhanId,
                requestedBoPhanId: req.body?.boPhanId,
                error: {
                    name: err?.name,
                    message: err?.message,
                    code: err?.code,
                    number: err?.number,
                    state: err?.state,
                    class: err?.class,
                    lineNumber: err?.lineNumber,
                    serverName: err?.serverName,
                    procName: err?.procName,
                    originalError: err?.originalError?.message,
                    precedingErrors: err?.precedingErrors?.map((item) => ({
                        message: item?.message,
                        number: item?.number,
                        state: item?.state,
                        class: item?.class,
                        lineNumber: item?.lineNumber,
                        procName: item?.procName
                    })),
                    stack: err?.stack
                }
            });

            res.status(500).json({
                message: "Không thể xác nhận",
                ...(process.env.NODE_ENV !== "production" && {
                    detail: err?.originalError?.message || err?.message
                })
            })

        }

    }
)

router.post(
    "/:id/opinion-departments/confirm",
    authenticateToken,
    async (req, res) => {
        const bienBanId = Number(req.params.id);
        const boPhanIds = [...new Set((Array.isArray(req.body?.boPhanIds) ? req.body.boPhanIds : [])
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0))];
        if (boPhanIds.length === 0) {
            return res.status(400).json({ message: "Vui lòng chọn ít nhất một bộ phận cần lấy ý kiến" });
        }

        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        let transactionStarted = false;
        try {
            const access = await getKphV01FlowAccess(pool, bienBanId, req.user);
            if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
            if (access.record.MauPhieuVersion !== "V01") {
                return res.status(409).json({ message: "Biên bản không sử dụng luồng KPH V01" });
            }
            if (!access.canManage) {
                return res.status(403).json({ message: "Chỉ bộ phận tạo phiếu được xác nhận danh sách cần ý kiến" });
            }
            if (access.record.CreatorConfirmedAt || ["CHO_THEO_DOI", "HOAN_TAT"].includes(access.record.TrangThai)) {
                return res.status(409).json({ message: "Biên bản đã được xác nhận và khóa nội dung" });
            }

            await transaction.begin();
            transactionStarted = true;
            const existingResult = await new sql.Request(transaction)
                .input("BienBanId", sql.Int, bienBanId)
                .query(`
                    SELECT yk.Id, yk.BoPhanId, ISNULL(yk.IsActive, 1) AS IsActive,
                        CASE WHEN EXISTS (
                            SELECT 1
                            FROM dbo.TRA_LOI_Y_KIEN tl
                            WHERE tl.XinYKienId = yk.Id
                        ) THEN 1 ELSE 0 END AS HasResponded
                    FROM dbo.XIN_Y_KIEN yk WITH (UPDLOCK, HOLDLOCK)
                    WHERE yk.BienBanId = @BienBanId
                `);
            const existing = existingResult.recordset || [];
            const selectedSet = new Set(boPhanIds);
            const invalidRemoval = existing.find((item) =>
                item.IsActive && !selectedSet.has(Number(item.BoPhanId)) && item.HasResponded
            );
            if (invalidRemoval) {
                await transaction.rollback();
                transactionStarted = false;
                return res.status(409).json({ message: "Không thể bỏ bộ phận đã có phản hồi" });
            }

            await new sql.Request(transaction)
                .input("BienBanId", sql.Int, bienBanId)
                .input("SelectedIds", sql.NVarChar(sql.MAX), boPhanIds.join(","))
                .input("UserId", sql.Int, req.user.userId)
                .query(`
                    UPDATE dbo.XIN_Y_KIEN
                    SET IsActive = 0, TrangThai = N'DA_HUY',
                        RemovedBy = @UserId, RemovedAt = SYSDATETIME()
                    WHERE BienBanId = @BienBanId
                      AND ISNULL(IsActive, 1) = 1
                      AND BoPhanId NOT IN (
                          SELECT TRY_CAST(value AS int) FROM STRING_SPLIT(@SelectedIds, ',')
                      );

                    UPDATE dbo.XIN_Y_KIEN
                    SET IsActive = 1, TrangThai = N'CHO_Y_KIEN',
                        RemovedBy = NULL, RemovedAt = NULL
                    WHERE BienBanId = @BienBanId
                      AND BoPhanId IN (
                          SELECT TRY_CAST(value AS int) FROM STRING_SPLIT(@SelectedIds, ',')
                      );

                    INSERT INTO dbo.XIN_Y_KIEN
                        (BienBanId, BoPhanId, BoPhan, TrangThai, ThuTu, IsActive, CreatedBy, CreatedAt)
                    SELECT @BienBanId, bp.Id, bp.MaBoPhan, N'CHO_Y_KIEN',
                        ROW_NUMBER() OVER (ORDER BY bp.Id) +
                            ISNULL((SELECT MAX(ThuTu) FROM dbo.XIN_Y_KIEN WHERE BienBanId = @BienBanId), 0),
                        1, @UserId, SYSDATETIME()
                    FROM dbo.DM_BO_PHAN bp
                    JOIN (
                        SELECT DISTINCT TRY_CAST(value AS int) AS BoPhanId
                        FROM STRING_SPLIT(@SelectedIds, ',')
                    ) selected ON selected.BoPhanId = bp.Id
                    WHERE NOT EXISTS (
                        SELECT 1 FROM dbo.XIN_Y_KIEN yk
                        WHERE yk.BienBanId = @BienBanId AND yk.BoPhanId = bp.Id
                    );

                    UPDATE dbo.BIEN_BAN_KIEM
                    SET OpinionDepartmentsConfirmedAt = SYSDATETIME(),
                        OpinionDepartmentsConfirmedBy = @UserId,
                        TrangThai = CASE
                            WHEN TrangThai IN (N'BB_MOI', N'CHO_PHAN_BO_XY_LY', N'CHO_PHAN_BO_XU_LY')
                                THEN N'CHO_XAC_NHAN'
                            ELSE TrangThai
                        END
                    WHERE Id = @BienBanId;
                `);
            await transaction.commit();
            transactionStarted = false;
            res.json({ success: true });
        } catch (error) {
            if (transactionStarted) {
                try { await transaction.rollback(); } catch (_) { /* no-op */ }
            }
            console.error("ConfirmOpinionDepartments error:", error);
            res.status(500).json({ message: error?.originalError?.info?.message || "Không thể cập nhật danh sách cần ý kiến" });
        }
    }
);

router.post(
    "/:id/creator-confirm",
    authenticateToken,
    async (req, res) => {
        const bienBanId = Number(req.params.id);
        const pool = await poolPromise;
        try {
            const access = await getKphV01FlowAccess(pool, bienBanId, req.user);
            if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
            if (access.record.MauPhieuVersion !== "V01") {
                return res.status(409).json({ message: "Biên bản không sử dụng luồng KPH V01" });
            }
            if (!access.canManage) {
                return res.status(403).json({ message: "Chỉ bộ phận tạo phiếu được xác nhận cuối" });
            }
            if (!access.record.OpinionDepartmentsConfirmedAt) {
                return res.status(409).json({ message: "Danh sách bộ phận cần ý kiến chưa được xác nhận" });
            }
            if (access.record.CreatorConfirmedAt || ["CHO_THEO_DOI", "HOAN_TAT"].includes(access.record.TrangThai)) {
                return res.status(409).json({ message: "Biên bản đã được xác nhận" });
            }

            const readiness = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .query(`
                    SELECT
                        (SELECT COUNT(*) FROM dbo.XIN_Y_KIEN
                         WHERE BienBanId=@BienBanId AND ISNULL(IsActive,1)=1) AS TotalOpinions,
                        (SELECT COUNT(*) FROM dbo.XIN_Y_KIEN yk
                         WHERE yk.BienBanId=@BienBanId AND ISNULL(yk.IsActive,1)=1
                           AND EXISTS (
                               SELECT 1
                               FROM dbo.TRA_LOI_Y_KIEN tl
                               WHERE tl.XinYKienId=yk.Id
                           )) AS AnsweredOpinions,
                        (SELECT COUNT(*) FROM dbo.BIEN_BAN_XU_LY WHERE BienBanId=@BienBanId) AS ProposalCount,
                        (SELECT ISNULL(YeuCauChiPhi,0) FROM dbo.BIEN_BAN_KIEM WHERE Id=@BienBanId) AS YeuCauChiPhi,
                        (SELECT COUNT(*) FROM dbo.BIEN_BAN_CHI_PHI WHERE BienBanId=@BienBanId) AS CostCount,
                        (SELECT ISNULL(YeuCauHanhDong,0) FROM dbo.BIEN_BAN_KIEM WHERE Id=@BienBanId) AS YeuCauHanhDong,
                        (SELECT COUNT(*) FROM dbo.BIEN_BAN_HANH_DONG WHERE BienBanId=@BienBanId) AS ActionCount
                `);
            const state = readiness.recordset?.[0] || {};
            if (Number(state.TotalOpinions) === 0) {
                return res.status(409).json({ message: "Chưa có bộ phận cần lấy ý kiến" });
            }
            if (Number(state.AnsweredOpinions) < Number(state.TotalOpinions)) {
                return res.status(409).json({ message: "Chưa đủ phản hồi của các bộ phận" });
            }
            if (Number(state.ProposalCount) === 0) {
                return res.status(409).json({ message: "Mục 5 chưa có đề xuất xử lý" });
            }
            if (state.YeuCauChiPhi && Number(state.CostCount) === 0) {
                return res.status(409).json({ message: "Mục 6 được yêu cầu nhưng chưa có dữ liệu" });
            }
            if (state.YeuCauHanhDong && Number(state.ActionCount) === 0) {
                return res.status(409).json({ message: "Mục 7 được yêu cầu nhưng chưa có dữ liệu" });
            }

            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("UserId", sql.Int, req.user.userId)
                .query(`
                    UPDATE dbo.BIEN_BAN_KIEM
                    SET CreatorConfirmedAt = SYSDATETIME(),
                        CreatorConfirmedBy = @UserId,
                        TrangThai = N'CHO_THEO_DOI'
                    WHERE Id = @BienBanId AND CreatorConfirmedAt IS NULL
                `);
            res.json({ success: true });
        } catch (error) {
            console.error("CreatorConfirmKph error:", error);
            res.status(500).json({ message: "Không thể xác nhận cuối biên bản" });
        }
    }
);

router.post(
    "/:id/specialist-opinions",
    authenticateToken,
    authorize("XAC_NHAN_NGUOI_XU_LY"),
    async (_req, res) => {
        res.status(409).json({
            message: "Vui lòng sử dụng danh sách bộ phận cần lấy ý kiến"
        });
    }
);

router.post(
    "/:id/specialist-opinions/:opinionId/respond",
    authenticateToken,
    async (req, res) => {
        const bienBanId = Number(req.params.id);
        const opinionId = Number(req.params.opinionId);
        const luaChon = "CO";
        const noiDung = String(req.body?.noiDung || "").trim();
        if (!noiDung) {
            return res.status(400).json({ message: "Vui lòng nhập nội dung ý kiến" });
        }

        const pool = await poolPromise;
        try {
            const opinion = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("OpinionId", sql.Int, opinionId)
                .query(`
                    SELECT TOP 1 yk.Id, yk.BoPhanId
                    FROM dbo.XIN_Y_KIEN yk
                    JOIN dbo.BIEN_BAN_KIEM bb ON bb.Id = yk.BienBanId
                    WHERE yk.Id = @OpinionId
                      AND yk.BienBanId = @BienBanId
                      AND ISNULL(bb.MauPhieuVersion, 'V00') = 'V01'
                      AND bb.OpinionDepartmentsConfirmedAt IS NOT NULL
                      AND bb.CreatorConfirmedAt IS NULL
                      AND bb.TrangThai NOT IN ('CHO_THEO_DOI', 'HOAN_TAT')
                      AND ISNULL(yk.IsActive, 1) = 1
            `);
            const row = opinion.recordset?.[0];
            if (!row) return res.status(409).json({ message: "Yêu cầu ý kiến chưa được xác nhận hoặc không còn hiệu lực" });
            if (!isAdmin(req.user) && Number(row.BoPhanId) !== Number(req.user.boPhanId)) {
                return res.status(403).json({ message: "Bạn không thuộc phòng ban được yêu cầu ý kiến" });
            }
            if (!isAdmin(req.user) && !isDepartmentLead(req.user)) return res.status(403).json({ message: "Chỉ Trưởng bộ phận hoặc ADMIN được xác nhận ý kiến" });
            const responseResult = await pool.request()
                .input("OpinionId", sql.Int, opinionId)
                .input("UserId", sql.Int, req.user.userId)
                .input("LuaChon", sql.VarChar(10), luaChon)
                .input("NoiDung", sql.NVarChar(sql.MAX), noiDung || null)
                .query(`
                    INSERT INTO dbo.TRA_LOI_Y_KIEN (XinYKienId, NguoiTraLoiId, NoiDung, LuaChon)
                    SELECT @OpinionId, @UserId, @NoiDung, @LuaChon
                    WHERE NOT EXISTS (
                        SELECT 1 FROM dbo.TRA_LOI_Y_KIEN WITH (UPDLOCK, HOLDLOCK)
                        WHERE XinYKienId = @OpinionId
                    );
                    DECLARE @Inserted int = @@ROWCOUNT;
                    IF @Inserted = 1
                        UPDATE dbo.XIN_Y_KIEN SET TrangThai = N'DA_TRA_LOI' WHERE Id = @OpinionId;
                    SELECT @Inserted AS Inserted;
                `);
            if (!responseResult.recordset?.[0]?.Inserted) {
                return res.status(409).json({ message: "Ý kiến đã được xác nhận" });
            }
            res.json({ success: true });
        } catch (error) {
            console.error("RespondSpecialistOpinion error:", error);
            res.status(500).json({ message: "Không thể xác nhận ý kiến" });
        }
    }
);

router.post(
    "/:id/follow-up-evaluation",
    authenticateToken,
    authorize(["THEO_DOI_KPH", "KET_LUAN"]),
    async (req, res) => {
        const bienBanId = Number(req.params.id);
        const ketQua = String(req.body?.ketQua || "").toUpperCase();
        const phieuKphMoiSo = String(req.body?.phieuKphMoiSo || "").trim();
        const ghiChu = String(req.body?.ghiChu || "").trim();

        if (!["THOA_MAN", "KHONG_THOA_MAN"].includes(ketQua)) {
            return res.status(400).json({ message: "Kết quả theo dõi không hợp lệ" });
        }
        if (ketQua === "KHONG_THOA_MAN" && !phieuKphMoiSo) {
            return res.status(400).json({ message: "Vui lòng nhập số phiếu KPH mới" });
        }

        const pool = await poolPromise;
        try {
            const state = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .query(`
                    SELECT TOP 1 bb.TrangThai,
                        CASE WHEN EXISTS (
                            SELECT 1 FROM dbo.BIEN_BAN_THEO_DOI_DANH_GIA td
                            WHERE td.BienBanId = bb.Id
                        ) THEN 1 ELSE 0 END AS DaDanhGia
                    FROM dbo.BIEN_BAN_KIEM bb WHERE bb.Id = @BienBanId
                `);
            const row = state.recordset?.[0];
            if (!row) return res.status(404).json({ message: "Không tìm thấy phiếu" });
            if (row.DaDanhGia) return res.status(409).json({ message: "Phiếu đã được đánh giá và không thể sửa" });
            if (row.TrangThai !== "CHO_THEO_DOI") {
                return res.status(409).json({ message: "Phiếu chưa sẵn sàng để theo dõi đánh giá" });
            }

            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("KetQua", sql.VarChar(20), ketQua)
                .input("PhieuKphMoiSo", sql.NVarChar(50), phieuKphMoiSo || null)
                .input("GhiChu", sql.NVarChar(sql.MAX), ghiChu || null)
                .input("UserId", sql.Int, req.user.userId)
                .query(`
                    INSERT INTO dbo.BIEN_BAN_THEO_DOI_DANH_GIA
                        (BienBanId, KetQua, PhieuKphMoiSo, GhiChu, NguoiTheoDoiId)
                    VALUES (@BienBanId, @KetQua, @PhieuKphMoiSo, @GhiChu, @UserId);
                    UPDATE dbo.BIEN_BAN_KIEM SET TrangThai = N'HOAN_TAT' WHERE Id = @BienBanId;
                `);
            res.json({ success: true });
        } catch (error) {
            console.error("SaveFollowUpEvaluation error:", error);
            res.status(500).json({ message: "Không thể lưu kết quả theo dõi" });
        }
    }
);

router.post('/custom-fields', authenticateToken, async (req, res) => {
    try {
        const { bienBanId, fields } = req.body;
        const pool = await poolPromise;
        const access = await getKphCustomFieldAccess(pool, Number(bienBanId), req.user);
        if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
        if (access.record.MauPhieuVersion !== "V01") return res.status(409).json({ message: "Biên bản không sử dụng mẫu V01" });
        if (!access.canEdit) return res.status(403).json({ message: "Bạn không có quyền sửa thông tin mẫu KPH" });
        const normalizedFields = Object.fromEntries(
            Object.entries(fields || {}).filter(([key]) => KPH_V01_CUSTOM_FIELDS.has(key))
        );
        if (Object.keys(normalizedFields).length === 0) return res.status(400).json({ message: "Không có trường hợp lệ để lưu" });
        const jsonString = JSON.stringify(normalizedFields);
        await pool.request()
            .input('BienBanId', sql.Int, bienBanId)
            .input('JsonData', sql.NVarChar(sql.MAX), jsonString)
            .execute('SP_Upsert_BienBan_CustomFields');

        res.status(200).json({ success: true, message: 'Đã lưu thông tin fields' });
    } catch (error) {
        console.error("Lỗi lưu custom fields biên bản:", error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});
module.exports = router;
