const express = require("express");
const router = express.Router();
const sql = require("mssql");

const { poolPromise } = require("../db");
const authenticateToken = require("../middlewares/auth.middleware");

const hasStrictLeadRole = (user) => Array.isArray(user?.roles) &&
    user.roles.some((role) => String(role || "").toUpperCase().startsWith("TP_"));
const hasRole = (user, roleCode) => Array.isArray(user?.roles) &&
    user.roles.some((role) => String(role || "").toUpperCase() === roleCode);
const isAdmin = (user) => hasRole(user, "ADMIN");
const getHeaderAccess = async (pool, bienBanId, user) => {
    const result = await pool.request().input("BienBanId", sql.Int, bienBanId).query(`
        SELECT TOP 1 bb.NguoiLapId, bb.TrangThai, ISNULL(bb.MauPhieuVersion, 'V00') AS MauPhieuVersion,
            COALESCE(bb.BoPhanTaoId, creator.BoPhanId) AS CreatorBoPhanId,
            bb.OpinionDepartmentsConfirmedAt, bb.CreatorConfirmedAt
        FROM dbo.BIEN_BAN_KIEM bb
        LEFT JOIN dbo.USERS creator ON creator.Id = bb.NguoiLapId
        WHERE bb.Id = @BienBanId
    `);
    const record = result.recordset?.[0];
    if (!record) return { exists: false, canEdit: false, record: null };
    const canEdit = record.MauPhieuVersion === "V01" &&
        !record.CreatorConfirmedAt && !["CHO_THEO_DOI", "HOAN_TAT"].includes(record.TrangThai) && (
        Number(record.NguoiLapId) === Number(user?.userId) ||
        (Number(record.CreatorBoPhanId) === Number(user?.boPhanId) && hasStrictLeadRole(user)) ||
        isAdmin(user)
    );
    return { exists: true, canEdit, record };
};
const KPH_V01_CUSTOM_FIELDS = new Set([
    "TenBoPhan", "MaBoPhan", "TenSanPham", "MaSanPham", "MaTruyNguyen",
    "DonHang", "Lot", "SoLuongKPH", "DauTuan", "PhatHienTu", "MucDo"
]);

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

router.get("/", authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const isManager = isAdmin(req.user) || req.user.permissions.includes("QUAN_TRI_DM")
            || req.user.permissions.includes("XAC_NHAN_NGUOI_XU_LY")
            || req.user.permissions.includes("KET_LUAN");

        const request = pool.request();
        if (!isManager) {
            request.input("UserId", sql.Int, req.user.userId);
            request.input("BoPhanId", sql.Int, req.user.boPhanId);
        }

        const result = await request.execute("sp_PhieuXuLyKPH_GetList");
        res.json(result.recordset || []);
    } catch (err) {
        console.error("GetStandaloneBienBanList error:", err);
        res.status(500).json({ message: "Không tải được danh sách phiếu xử lý không phù hợp" });
    }
});

router.post("/", authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("NguoiLapId", sql.Int, req.user.userId)
            .execute("sp_PhieuXuLyKPH_Create");

        res.json({
            bienBanId: result.recordset?.[0]?.BienBanId || null
        });
    } catch (err) {
        console.error("CreateStandaloneBienBan error:", err);
        res.status(500).json({ message: "Không thể tạo phiếu xử lý không phù hợp" });
    }
});

router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const bienBanId = Number(req.params.id);
        const pool = await poolPromise;
        const result = await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .execute("sp_PhieuXuLyKPH_GetDetail");

        const info = result.recordsets?.[0]?.[0] || null;
        let dynamicFields = [];
        if (info?.DynamicFieldsJSON) {
            try {
                dynamicFields = JSON.parse(info.DynamicFieldsJSON);
            } catch (error) {
                console.error("ParseStandaloneBienBanDynamicFields error:", error);
            }
        }

        if (info) {
            delete info.DynamicFieldsJSON;
        }

        const v01Result = await pool.request()
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
                    yk.Id, yk.BoPhanId,
                    COALESCE(bp.MaBoPhan, yk.BoPhan) AS MaBoPhan,
                    COALESCE(bp.TenBoPhan, yk.BoPhan) AS TenBoPhan,
                    yk.TrangThai, yk.ThuTu,
                    CAST(ISNULL(yk.IsActive, 1) AS bit) AS IsActive,
                    tl.LuaChon, tl.NoiDung, tl.NguoiTraLoiId,
                    u.FullName AS NguoiTraLoi, tl.ThoiGian,
                    CAST(CASE WHEN tl.Id IS NULL THEN 0 ELSE 1 END AS bit) AS HasResponded
                FROM dbo.XIN_Y_KIEN yk
                LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = yk.BoPhanId
                OUTER APPLY (
                    SELECT TOP 1 response.*
                    FROM dbo.TRA_LOI_Y_KIEN response
                    WHERE response.XinYKienId = yk.Id
                    ORDER BY response.ThoiGian DESC, response.Id DESC
                ) tl
                LEFT JOIN dbo.USERS u ON u.Id = tl.NguoiTraLoiId
                WHERE yk.BienBanId = @BienBanId
                  AND ISNULL(yk.IsActive, 1) = 1
                ORDER BY yk.ThuTu, yk.Id;

                SELECT TOP 1 td.*, u.FullName AS NguoiTheoDoi
                FROM dbo.BIEN_BAN_THEO_DOI_DANH_GIA td
                LEFT JOIN dbo.USERS u ON u.Id = td.NguoiTheoDoiId
                WHERE td.BienBanId = @BienBanId;
            `);
        const printMeta = v01Result.recordsets?.[0]?.[0] || { MauPhieuVersion: "V00" };
        const headerAccess = await getHeaderAccess(pool, bienBanId, req.user);
        const proposalResult = await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
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

        if (info) Object.assign(info, printMeta);
        if (info) {
            info.YeuCauChiPhi = Boolean(printMeta.YeuCauChiPhi);
            info.YeuCauHanhDong = Boolean(printMeta.YeuCauHanhDong);
            info.BoPhanTaoId = printMeta.BoPhanTaoId;
            info.OpinionDepartmentsConfirmed = Boolean(printMeta.OpinionDepartmentsConfirmed);
            info.OpinionDepartmentsConfirmedAt = printMeta.OpinionDepartmentsConfirmedAt;
            info.CreatorConfirmedAt = printMeta.CreatorConfirmedAt;
            info.CanManageKphFlow = headerAccess.canEdit;
            info.CanConfigureRequirements = headerAccess.canEdit;
            info.IsAdmin = isAdmin(req.user);
        }

        const defectResult = await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .query(`
                SELECT d.*, CAST(NULL AS nvarchar(max)) AS ImageUrls
                FROM dbo.BIEN_BAN_DEFECT d
                WHERE d.BienBanId = @BienBanId
                ORDER BY d.SortOrder, d.Id
            `);
        const confirmationResult = await pool.request().input("BienBanId", sql.Int, bienBanId).query(`
            SELECT xn.*, COALESCE(xn.BoPhanId,u.BoPhanId) AS BoPhanId, u.FullName,
                bp.MaBoPhan, bp.TenBoPhan
            FROM dbo.BIEN_BAN_XAC_NHAN xn
            LEFT JOIN dbo.USERS u ON u.Id=xn.NguoiXacNhanId
            LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id=COALESCE(xn.BoPhanId,u.BoPhanId)
            WHERE xn.BienBanId=@BienBanId
        `);

        res.json({
            info,
            defects: await enrichDefectCodes(pool, defectResult.recordset || []),
            assigns: result.recordsets?.[2] || [],
            xuLy: proposalResult.recordset || [],
            chiPhi: result.recordsets?.[4] || [],
            xacNhan: confirmationResult.recordset || [],
            hanhDong: result.recordsets?.[6] || [],
            dynamicFields,
            templateVersion: printMeta.MauPhieuVersion,
            specialistOpinions: v01Result.recordsets?.[1] || [],
            followUpEvaluation: v01Result.recordsets?.[2]?.[0] || null,
            printMeta,
            canEditKphCustomFields: headerAccess.canEdit
        });
    } catch (err) {
        console.error("GetStandaloneBienBanDetail error:", err);
        res.status(500).json({ message: "Không tải được chi tiết phiếu xử lý không phù hợp" });
    }
});

router.post("/:id/header", authenticateToken, async (req, res) => {
    try {
        const bienBanId = Number(req.params.id);
        const { moTaChung = "", fields = {} } = req.body || {};

        const pool = await poolPromise;
        const access = await getHeaderAccess(pool, bienBanId, req.user);
        if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
        if (access.record.MauPhieuVersion !== "V01") return res.status(409).json({ message: "Biên bản không sử dụng mẫu V01" });
        if (!access.canEdit) return res.status(403).json({ message: "Bạn không có quyền sửa thông tin mẫu KPH" });
        const normalizedFields = Object.fromEntries(
            Object.entries(fields || {}).filter(([key]) => KPH_V01_CUSTOM_FIELDS.has(key))
        );
        await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .input("MoTaChung", sql.NVarChar(sql.MAX), moTaChung)
            .input("FieldsJson", sql.NVarChar(sql.MAX), JSON.stringify(normalizedFields))
            .execute("sp_PhieuXuLyKPH_SaveHeader");

        res.json({ success: true });
    } catch (err) {
        console.error("SaveStandaloneBienBanHeader error:", err);
        res.status(500).json({ message: err.message || "Không thể lưu thông tin chung" });
    }
});

router.post("/:id/defects", authenticateToken, async (req, res) => {
    try {
        const bienBanId = Number(req.params.id);
        const { defects = [] } = req.body || {};
        const normalizedDefects = (Array.isArray(defects) ? defects : []).map((item, index) => ({
            defectId: item?.defectId ?? item?.DefectId ?? null,
            maLoi: item?.maLoi ?? item?.MaLoi ?? "",
            tenLoi: item?.tenLoi ?? item?.TenLoi ?? "",
            defectType: item?.defectType ?? item?.DefectType ?? "",
            tenLoiTuNhap: item?.tenLoiTuNhap ?? item?.TenLoiTuNhap ?? "",
            moTa: item?.moTa ?? item?.MoTa ?? "",
            soLuong: item?.soLuong ?? item?.SoLuong ?? 0,
            ghiChu: item?.ghiChu ?? item?.GhiChu ?? "",
            tenDoiTuong: item?.tenDoiTuong ?? item?.TenDoiTuong ?? "",
            soLuongKiem: item?.soLuongKiem ?? item?.SoLuongKiem ?? null,
            sortOrder: item?.sortOrder ?? item?.SortOrder ?? index + 1
        }));

        const invalidDefect = normalizedDefects.find((item) => {
            const soLuong = Number(item.soLuong);
            const soLuongKiem = item.soLuongKiem === null || item.soLuongKiem === ""
                ? null
                : Number(item.soLuongKiem);
            return !Number.isFinite(soLuong) || soLuong < 0 ||
                (soLuongKiem !== null && (!Number.isFinite(soLuongKiem) || soLuongKiem < 0 || soLuong > soLuongKiem));
        });
        if (invalidDefect) {
            return res.status(400).json({ message: "Số lượng lỗi phải không âm và không vượt số lượng kiểm" });
        }

        const pool = await poolPromise;
        await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .input("DefectsJson", sql.NVarChar(sql.MAX), JSON.stringify(normalizedDefects))
            .execute("sp_PhieuXuLyKPH_SaveDefects");

        res.json({ success: true });
    } catch (err) {
        console.error("SaveStandaloneBienBanDefects error:", err);
        res.status(500).json({ message: err.message || "Không thể lưu danh sách lỗi" });
    }
});

router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const bienBanId = Number(req.params.id);
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            await new sql.Request(transaction)
                .input("BienBanId", sql.Int, bienBanId)
                .query(`
                    DELETE tl
                    FROM dbo.TRA_LOI_Y_KIEN tl
                    JOIN dbo.XIN_Y_KIEN yk ON yk.Id = tl.XinYKienId
                    WHERE yk.BienBanId = @BienBanId;
                    DELETE FROM dbo.XIN_Y_KIEN WHERE BienBanId = @BienBanId;
                    DELETE FROM dbo.BIEN_BAN_THEO_DOI_DANH_GIA WHERE BienBanId = @BienBanId;
                `);
            await new sql.Request(transaction)
                .input("BienBanId", sql.Int, bienBanId)
                .execute("dbo.sp_PhieuXuLyKPH_Delete");
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }

        res.json({ success: true, message: "Đã xóa phiếu xử lý không phù hợp" });
    } catch (err) {
        console.error("DeleteStandaloneBienBan error:", err);
        res.status(500).json({ message: err.message || "Không thể xóa phiếu xử lý không phù hợp" });
    }
});

module.exports = router;
