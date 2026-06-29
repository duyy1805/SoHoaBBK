const express = require("express");
const router = express.Router();
const sql = require("mssql");

const { poolPromise } = require("../db");
const authenticateToken = require("../middlewares/auth.middleware");

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

        res.json({
            info,
            defects: result.recordsets?.[1] || [],
            assigns: result.recordsets?.[2] || [],
            xuLy: result.recordsets?.[3] || [],
            chiPhi: result.recordsets?.[4] || [],
            xacNhan: result.recordsets?.[5] || [],
            hanhDong: result.recordsets?.[6] || [],
            dynamicFields
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
            sortOrder: item?.sortOrder ?? item?.SortOrder ?? index + 1
        }));

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
        await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .execute("dbo.sp_PhieuXuLyKPH_Delete");

        res.json({ success: true, message: "Đã xóa phiếu xử lý không phù hợp" });
    } catch (err) {
        console.error("DeleteStandaloneBienBan error:", err);
        res.status(500).json({ message: err.message || "Không thể xóa phiếu xử lý không phù hợp" });
    }
});

module.exports = router;
