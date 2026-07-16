const express = require("express");
const router = express.Router();
const sql = require("mssql");

const { poolPromise } = require("../db");

const authenticateToken = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/permission.middleware");

const hasPermission = (user, permissionCode) =>
    Array.isArray(user?.permissions) && user.permissions.includes(permissionCode);

const hasLeadRole = (user) => {
    if (!Array.isArray(user?.roles) || user.roles.length === 0) {
        return true;
    }

    return user.roles.some((role) => role?.toUpperCase().includes("TP"));
};

const canManageDepartmentAssign = (user, boPhanId) => {
    if (hasPermission(user, "XAC_NHAN_NGUOI_XU_LY")) {
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

const parseJsonArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
        return typeof value === "string" && value.trim() ? [value] : [];
    }
};

const enrichDefectCodes = async (pool, defects = []) => {
    const defectIds = [...new Set(
        defects
            .filter((item) => !item.MaLoi && item.DefectId)
            .map((item) => Number(item.DefectId))
            .filter((id) => Number.isInteger(id) && id > 0)
    )];

    if (defectIds.length === 0) return defects;

    const result = await pool.request().query(`
        SELECT Id, MaLoi, TenLoi, DefectType
        FROM dbo.DM_DEFECT
        WHERE Id IN (${defectIds.join(",")})
    `);
    const defectMap = new Map((result.recordset || []).map((item) => [Number(item.Id), item]));

    return defects.map((item) => {
        const catalog = defectMap.get(Number(item.DefectId));
        return catalog ? { ...catalog, ...item, MaLoi: item.MaLoi || catalog.MaLoi } : item;
    });
};

const getKphV01Data = async (pool, bienBanId) => {
    const result = await pool.request()
        .input("BienBanId", sql.Int, bienBanId)
        .query(`
            SELECT TOP 1
                ISNULL(bb.MauPhieuVersion, 'V00') AS MauPhieuVersion,
                bp.MaBoPhan AS MaDonViTaoPhieu,
                bp.TenBoPhan AS DonViTaoPhieu
            FROM dbo.BIEN_BAN_KIEM bb
            LEFT JOIN dbo.USERS u ON u.Id = bb.NguoiLapId
            LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = u.BoPhanId
            WHERE bb.Id = @BienBanId;

            SELECT
                yk.Id,
                yk.BoPhanId,
                COALESCE(bp.MaBoPhan, yk.BoPhan) AS MaBoPhan,
                COALESCE(bp.TenBoPhan, yk.BoPhan) AS TenBoPhan,
                yk.TrangThai,
                yk.ThuTu,
                tl.LuaChon,
                tl.NoiDung,
                tl.NguoiTraLoiId,
                u.FullName AS NguoiTraLoi,
                tl.ThoiGian
            FROM dbo.XIN_Y_KIEN yk
            LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = yk.BoPhanId
            OUTER APPLY (
                SELECT TOP 1 *
                FROM dbo.TRA_LOI_Y_KIEN response
                WHERE response.XinYKienId = yk.Id
                ORDER BY response.ThoiGian DESC, response.Id DESC
            ) tl
            LEFT JOIN dbo.USERS u ON u.Id = tl.NguoiTraLoiId
            WHERE yk.BienBanId = @BienBanId
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

            const progressByBienBanId = new Map(
                (progressResult.recordset || []).map((item) => [item.BienBanId, item])
            );

            const normalizedRows = rows.map((item) => {
                const progress = progressByBienBanId.get(item.BienBanId);
                if (!progress) return item;

                const isSxbt = progress.IsSxbt === true || progress.IsSxbt === 1 ||
                    item.LoaiBienBan === "SXBT" ||
                    item.LoaiKiemId === 4 ||
                    String(item.TrangThai || "").startsWith("BB_SXBT");

                const total = Number(progress.SoBoPhan) || 0;
                const done = Number(progress.DaCoYKien) || 0;
                const progressPercent = Number(progress.ProgressPercent);

                return {
                    ...item,
                    LoaiBienBan: isSxbt ? "SXBT" : item.LoaiBienBan,
                    DaCoYKien: done,
                    SoBoPhan: total,
                    ProgressPercent: Number.isFinite(progressPercent)
                        ? progressPercent
                        : (total > 0 ? Math.round((done / total) * 100) : 0),
                    MaBoPhanDangCho: progress?.MaBoPhanDangCho || null,
                    TenBoPhanDangCho: progress?.TenBoPhanDangCho || null,
                    BoPhanChuaXacNhanText: progress?.BoPhanChuaXacNhanText || null
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
            const assignRows = await getBienBanAssignRows(pool, id);
            const v01Data = await getKphV01Data(pool, id);

            // Gộp custom fields của biên bản và phiếu kiểm.
            // Ưu tiên field trên biên bản nếu trùng tên.
            let dynamicFields = [];
            const info = rs[0]?.[0] || null;
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

            const defects = await enrichDefectCodes(pool, (rs[1] || []).map(d => ({
                ...d,
                ImageUrls: parseJsonArray(d.ImageUrls)
            })));

            let phieuKiemXacNhan = [];
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
                    MauPhieuVersion: v01Data.meta.MauPhieuVersion,
                    MaDonViTaoPhieu: v01Data.meta.MaDonViTaoPhieu,
                    DonViTaoPhieu: v01Data.meta.DonViTaoPhieu
                } : null,
                defects,
                assigns: mergedAssigns,
                xuLy: rs[3] || [],
                chiPhi: rs[4] || [],
                xacNhan: rs[5] || [],
                phieuKiemXacNhan,
                hanhDong: rs[6] || [],
                dynamicFields: dynamicFields,
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

            const {
                bienBanId,
                noiDung,
                deNghiXuLyId,
                currentUserId,
                thoiHan
            } = req.body;

            const pool = await poolPromise;

            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("NoiDung", sql.NVarChar, noiDung)
                .input("DeNghiXuLyId", sql.Int, deNghiXuLyId)
                .input("ThoiHan", sql.Date, thoiHan)
                .input("UserId", sql.Int, currentUserId)
                .input("BoPhanId", sql.Int, req.user.boPhanId)
                .execute("sp_BienBan_AddXuLy");

            res.json({ success: true });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                message: "Thêm đề xuất xử lý thất bại"
            });

        }

    }
);
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
                const pendingResult = await pool.request()
                    .input("BienBanId", sql.Int, bienBanId)
                    .query(`
                        SELECT
                            (SELECT COUNT(*) FROM dbo.BIEN_BAN_ASSIGN WHERE BienBanId = @BienBanId) AS TotalAssigns,
                            (SELECT COUNT(DISTINCT u.BoPhanId)
                             FROM dbo.BIEN_BAN_XAC_NHAN xn
                             JOIN dbo.USERS u ON u.Id = xn.NguoiXacNhanId
                             JOIN dbo.BIEN_BAN_ASSIGN a
                               ON a.BienBanId = xn.BienBanId AND a.BoPhanId = u.BoPhanId
                             WHERE xn.BienBanId = @BienBanId) AS ConfirmedAssigns,
                            (SELECT COUNT(*) FROM dbo.XIN_Y_KIEN WHERE BienBanId = @BienBanId) AS TotalOpinions,
                            (SELECT COUNT(*)
                             FROM dbo.XIN_Y_KIEN yk
                             WHERE yk.BienBanId = @BienBanId
                               AND EXISTS (SELECT 1 FROM dbo.TRA_LOI_Y_KIEN tl WHERE tl.XinYKienId = yk.Id)) AS AnsweredOpinions,
                            CASE WHEN
                                EXISTS (
                                    SELECT a.BoPhanId FROM dbo.BIEN_BAN_ASSIGN a WHERE a.BienBanId = @BienBanId
                                    EXCEPT
                                    SELECT yk.BoPhanId FROM dbo.XIN_Y_KIEN yk WHERE yk.BienBanId = @BienBanId
                                )
                                OR EXISTS (
                                    SELECT yk.BoPhanId FROM dbo.XIN_Y_KIEN yk WHERE yk.BienBanId = @BienBanId
                                    EXCEPT
                                    SELECT a.BoPhanId FROM dbo.BIEN_BAN_ASSIGN a WHERE a.BienBanId = @BienBanId
                                )
                            THEN 1 ELSE 0 END AS HasOpinionMismatch
                    `);
                const progress = pendingResult.recordset?.[0] || {};
                if (Number(progress.TotalAssigns) === 0 || Number(progress.ConfirmedAssigns) < Number(progress.TotalAssigns)) {
                    return res.status(409).json({ message: "Chưa đủ xác nhận của các bộ phận xử lý" });
                }
                if (Number(progress.AnsweredOpinions) < Number(progress.TotalOpinions)) {
                    return res.status(409).json({ message: "Chưa đủ ý kiến chuyên môn" });
                }
                if (Number(progress.HasOpinionMismatch) === 1 || Number(progress.TotalOpinions) !== Number(progress.TotalAssigns)) {
                    return res.status(409).json({ message: "Danh sách ý kiến chuyên môn chưa khớp phân công xử lý" });
                }

                await pool.request()
                    .input("BienBanId", sql.Int, bienBanId)
                    .query(`
                        UPDATE dbo.BIEN_BAN_KIEM
                        SET TrangThai = N'CHO_THEO_DOI'
                        WHERE Id = @BienBanId
                          AND NOT EXISTS (
                              SELECT 1 FROM dbo.BIEN_BAN_THEO_DOI_DANH_GIA
                              WHERE BienBanId = @BienBanId
                          )
                    `);
            } else {
                await pool.request()
                    .input("BienBanId", sql.Int, bienBanId)
                    .input("NguoiXacNhanId", sql.Int, req.user.userId)
                    .execute("sp_BienBan_Complete");
            }

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

            const {
                bienBanId,
                loaiChiPhi,
                giaTri,
                thoiHan
            } = req.body;
            const normalizedLoaiChiPhi = String(loaiChiPhi || "").trim();
            if (!normalizedLoaiChiPhi) {
                return res.status(400).json({ message: "Vui lòng nhập tên chi phí" });
            }
            const pool = await poolPromise;

            await pool.request()
                .input("BienBanId", bienBanId)
                .input("LoaiChiPhi", normalizedLoaiChiPhi)
                .input("GiaTri", giaTri)
                .input("BoPhanId", req.user.boPhanId)
                .input("ThoiHan", thoiHan)
                .input("CreatedBy", req.user.userId)
                .execute("sp_BienBan_AddChiPhi");

            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("UserId", sql.Int, req.user.userId)
                .query(`
                    UPDATE dbo.BIEN_BAN_CHI_PHI
                    SET TheoDoiBy = @UserId
                    WHERE Id = (
                        SELECT TOP 1 Id FROM dbo.BIEN_BAN_CHI_PHI
                        WHERE BienBanId = @BienBanId AND CreatedBy = @UserId
                        ORDER BY CreatedAt DESC, Id DESC
                    )
                `);

            res.json({ success: true });

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

            const {
                bienBanId,
                noiDung,
                boPhanId,
                thoiHan,
                theoDoi
            } = req.body;

            const userId = req.user.userId;

            const pool = await poolPromise;

            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("NoiDung", sql.NVarChar, noiDung)
                .input("BoPhanId", sql.Int, req.user.boPhanId)
                .input("ThoiHan", sql.Date, thoiHan)
                .input("TheoDoi", sql.NVarChar, theoDoi)
                .input("CreatedBy", sql.Int, userId)
                .execute("sp_BienBan_HanhDong_Add");

            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("UserId", sql.Int, userId)
                .query(`
                    UPDATE dbo.BIEN_BAN_HANH_DONG
                    SET TheoDoiBy = @UserId
                    WHERE Id = (
                        SELECT TOP 1 Id FROM dbo.BIEN_BAN_HANH_DONG
                        WHERE BienBanId = @BienBanId AND CreatedBy = @UserId
                        ORDER BY CreatedAt DESC, Id DESC
                    )
                `);

            res.json({
                message: "Đã thêm hành động"
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
    authenticateToken,
    authorize("DUYET_Y_KIEN"),
    async (req, res) => {

        try {

            const { bienBanId } = req.body
            const userId = req.user.userId
            const pool = await poolPromise

            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("NguoiXacNhanId", sql.Int, userId)
                .input("BoPhanId", sql.Int, req.user.boPhanId || null)
                .execute("sp_BienBan_XacNhan1")

            res.json({
                message: "Đã xác nhận"
            })

        } catch (err) {

            res.status(500).json({
                message: "Không thể xác nhận"
            })

        }

    }
)

router.post(
    "/:id/specialist-opinions",
    authenticateToken,
    authorize("XAC_NHAN_NGUOI_XU_LY"),
    async (_req, res) => {
        res.status(409).json({
            message: "Ý kiến chuyên môn được đồng bộ tự động từ danh sách bộ phận xử lý"
        });
    }
);

router.post(
    "/:id/specialist-opinions/:opinionId/respond",
    authenticateToken,
    async (req, res) => {
        const bienBanId = Number(req.params.id);
        const opinionId = Number(req.params.opinionId);
        const luaChon = String(req.body?.luaChon || "").toUpperCase();
        const noiDung = String(req.body?.noiDung || "").trim();

        if (!["CO", "KHONG"].includes(luaChon)) {
            return res.status(400).json({ message: "Lựa chọn ý kiến không hợp lệ" });
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
                      AND ISNULL(bb.AssignConfirmed, 0) = 1
                      AND EXISTS (
                          SELECT 1
                          FROM dbo.BIEN_BAN_ASSIGN a
                          WHERE a.BienBanId = yk.BienBanId
                            AND a.BoPhanId = yk.BoPhanId
                      )
                `);
            const row = opinion.recordset?.[0];
            if (!row) return res.status(409).json({ message: "Phân công chưa được xác nhận hoặc yêu cầu ý kiến không còn hiệu lực" });
            if (Number(row.BoPhanId) !== Number(req.user.boPhanId)) {
                return res.status(403).json({ message: "Bạn không thuộc phòng ban được yêu cầu ý kiến" });
            }
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
                return res.status(409).json({ message: "Ý kiến đã được ký xác nhận" });
            }
            res.json({ success: true });
        } catch (error) {
            console.error("RespondSpecialistOpinion error:", error);
            res.status(500).json({ message: "Không thể ký xác nhận ý kiến" });
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
        const jsonString = JSON.stringify(fields);

        const pool = await poolPromise;
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
