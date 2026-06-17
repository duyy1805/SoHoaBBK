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
                a.AssignedToUserAt
            FROM BIEN_BAN_ASSIGN a
            LEFT JOIN DM_BO_PHAN bp ON bp.Id = a.BoPhanId
            LEFT JOIN USERS u ON u.Id = a.NguoiXuLyId
            WHERE a.BienBanId = @BienBanId
            ORDER BY a.Id
        `);

    return result.recordset;
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

            // Xử lý DynamicFieldsJSON tương tự PhieuKiem
            let dynamicFields = [];
            const info = rs[0]?.[0] || null;
            if (info && info.DynamicFieldsJSON) {
                try {
                    dynamicFields = JSON.parse(info.DynamicFieldsJSON);
                } catch (e) {
                    console.error("Lỗi parse DynamicFieldsJSON:", e);
                }
                delete info.DynamicFieldsJSON; // Xóa chuỗi thô đi cho nhẹ
            }

            const mergedAssigns = (assignRows.length > 0 ? assignRows : (rs[2] || [])).map((assign) => {
                const fallback = (rs[2] || []).find((item) => item.BoPhanId === assign.BoPhanId) || {};
                return {
                    ...fallback,
                    ...assign
                };
            });

            res.json({
                info: rs[0]?.[0] || null,
                defects: (rs[1] || []).map(d => ({
                    ...d,
                    ImageUrls: d.ImageUrls ? JSON.parse(d.ImageUrls) : []
                })),
                assigns: mergedAssigns,
                xuLy: rs[3] || [],
                chiPhi: rs[4] || [],
                xacNhan: rs[5] || [],
                hanhDong: rs[6] || [],
                dynamicFields: dynamicFields // Thêm dòng này
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
