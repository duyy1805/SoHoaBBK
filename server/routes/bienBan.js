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
                xacNhan: rs[5] || []
            });

        } catch (err) {

            console.error("GetBienBanDetail error:");

            res.status(500).json({
                message: "Lỗi tải chi tiết biên bản"
            });

        }
    }
);


/* =========================================================
   POST /bien-ban/xu-ly
========================================================= */

router.post(
    "/xu-ly",
    authenticateToken,
    authorize("XAC_NHAN_LOI"),
    async (req, res) => {

        try {

            const {
                bienBanId,
                noiDung,
                deNghiXuLy,
                trachNhiem,
                thoiHan,
                theoDoi
            } = req.body;

            const pool = await poolPromise;

            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("NoiDung", sql.NVarChar, noiDung)
                .input("DeNghiXuLy", sql.NVarChar, deNghiXuLy)
                .input("TrachNhiem", sql.NVarChar, trachNhiem)
                .input("ThoiHan", sql.Date, thoiHan)
                .input("TheoDoi", sql.NVarChar, theoDoi)
                .input("UserId", sql.Int, req.user.userId)
                .execute("sp_BienBan_AddXuLy");

            res.json({ success: true });

        } catch (err) {

            console.error("AddXuLy error:", err);

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
                message: "Hoàn thành biên bản thất bại"
            });

        }

    }
);

router.post(
    "/:id/assign",
    authenticateToken,
    async (req, res) => {

        const bienBanId = parseInt(req.params.id, 10);
        const { userIds } = req.body;

        const pool = await poolPromise;

        await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .input("UserIds", sql.NVarChar, userIds.join(","))
            .input("AssignedBy", sql.Int, req.user.userId)
            .execute("sp_BienBan_AssignUser");

        res.json({ success: true });

    }
);

router.get(
    "/:id/assign-users",
    authenticateToken,
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
    async (req, res) => {

        const bienBanId = parseInt(req.params.id, 10)

        const pool = await poolPromise

        await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .execute("sp_BienBan_ConfirmAssign")

        res.json({ success: true })

    }
)

module.exports = router;