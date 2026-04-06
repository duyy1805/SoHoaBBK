const express = require("express");
const router = express.Router();
const sql = require("mssql");

const { poolPromise } = require("../db");

const authenticateToken = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/permission.middleware");

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

            const result = await request.execute("sp_BienBan_GetList");

            res.json(result.recordset);

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

            res.json({
                info: rs[0]?.[0] || null,
                defects: rs[1] || [],
                assigns: rs[2] || [],
                xuLy: rs[3] || [],
                chiPhi: rs[4] || [],
                xacNhan: rs[5] || [],
                hanhDong: rs[6] || []
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

            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
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
            const { boPhanIds } = req.body;

            const pool = await poolPromise;

            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("BoPhanIds", sql.NVarChar, boPhanIds.join(","))
                .input("AssignedBy", sql.Int, req.user.userId)
                .execute("sp_BienBan_AssignBoPhan");

            res.json({ success: true });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                message: "Không thể phân công bộ phận"
            });

        }

    }
);

router.get(
    "/:id/assign-users",
    authenticateToken,
    authorize("XAC_NHAN_NGUOI_XU_LY"),
    async (req, res) => {

        const bienBanId = parseInt(req.params.id, 10);

        const pool = await poolPromise;

        const result = await pool.request()
            // .input("BienBanId", sql.Int, bienBanId)
            .execute("sp_BienBan_GetAssignableUsers");

        res.json(result.recordset);

    }
);

router.post(
    "/:id/confirm-assign",
    authenticateToken,
    authorize("XAC_NHAN_NGUOI_XU_LY"),
    async (req, res) => {

        const bienBanId = parseInt(req.params.id, 10)

        const pool = await poolPromise

        await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .execute("sp_BienBan_ConfirmAssign")

        res.json({ success: true })

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
            const pool = await poolPromise;

            await pool.request()
                .input("BienBanId", bienBanId)
                .input("LoaiChiPhi", loaiChiPhi)
                .input("GiaTri", giaTri)
                .input("BoPhanId", req.user.boPhanId)
                .input("ThoiHan", thoiHan)
                .input("CreatedBy", req.user.userId)
                .execute("sp_BienBan_AddChiPhi");

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
module.exports = router;