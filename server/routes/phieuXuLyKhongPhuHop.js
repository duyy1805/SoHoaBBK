const express = require("express");
const router = express.Router();
const sql = require("mssql");

const { poolPromise } = require("../db");
const authenticateToken = require("../middlewares/auth.middleware");

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
        const isManager = req.user.permissions.includes("QUAN_TRI_DM")
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
                    bp.MaBoPhan AS MaDonViTaoPhieu,
                    bp.TenBoPhan AS DonViTaoPhieu
                FROM dbo.BIEN_BAN_KIEM bb
                LEFT JOIN dbo.USERS u ON u.Id = bb.NguoiLapId
                LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = u.BoPhanId
                WHERE bb.Id = @BienBanId;

                SELECT
                    yk.Id, yk.BoPhanId,
                    COALESCE(bp.MaBoPhan, yk.BoPhan) AS MaBoPhan,
                    COALESCE(bp.TenBoPhan, yk.BoPhan) AS TenBoPhan,
                    yk.TrangThai, yk.ThuTu,
                    tl.LuaChon, tl.NoiDung, tl.NguoiTraLoiId,
                    u.FullName AS NguoiTraLoi, tl.ThoiGian
                FROM dbo.XIN_Y_KIEN yk
                LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = yk.BoPhanId
                OUTER APPLY (
                    SELECT TOP 1 * FROM dbo.TRA_LOI_Y_KIEN response
                    WHERE response.XinYKienId = yk.Id
                    ORDER BY response.ThoiGian DESC, response.Id DESC
                ) tl
                LEFT JOIN dbo.USERS u ON u.Id = tl.NguoiTraLoiId
                WHERE yk.BienBanId = @BienBanId
                ORDER BY yk.ThuTu, yk.Id;

                SELECT TOP 1 td.*, u.FullName AS NguoiTheoDoi
                FROM dbo.BIEN_BAN_THEO_DOI_DANH_GIA td
                LEFT JOIN dbo.USERS u ON u.Id = td.NguoiTheoDoiId
                WHERE td.BienBanId = @BienBanId;
            `);
        const printMeta = v01Result.recordsets?.[0]?.[0] || { MauPhieuVersion: "V00" };

        if (info) Object.assign(info, printMeta);

        const defectResult = await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .query(`
                SELECT d.*, CAST(NULL AS nvarchar(max)) AS ImageUrls
                FROM dbo.BIEN_BAN_DEFECT d
                WHERE d.BienBanId = @BienBanId
                ORDER BY d.SortOrder, d.Id
            `);

        res.json({
            info,
            defects: await enrichDefectCodes(pool, defectResult.recordset || []),
            assigns: result.recordsets?.[2] || [],
            xuLy: result.recordsets?.[3] || [],
            chiPhi: result.recordsets?.[4] || [],
            xacNhan: result.recordsets?.[5] || [],
            hanhDong: result.recordsets?.[6] || [],
            dynamicFields,
            templateVersion: printMeta.MauPhieuVersion,
            specialistOpinions: v01Result.recordsets?.[1] || [],
            followUpEvaluation: v01Result.recordsets?.[2]?.[0] || null,
            printMeta
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
        await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .input("MoTaChung", sql.NVarChar(sql.MAX), moTaChung)
            .input("FieldsJson", sql.NVarChar(sql.MAX), JSON.stringify(fields || {}))
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
