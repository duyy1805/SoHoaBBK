const express = require('express');
const router = express.Router();
const sql = require('mssql');

const { poolPromise } = require('../db');
const authenticateToken = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');

/* =========================================================
   GET /phieu-kiem
   Role       : TO_TRUONG_KCS / KCS / TP_B8
   Permission : XEM_PHIEU_KIEM
========================================================= */

router.get(
    '/',
    authenticateToken,
    authorize('XEM_PHIEU_KIEM'),
    async (req, res) => {
        try {
            const pool = await poolPromise;

            const userId = req.user.id;
            const role = req.user.role;

            const request = pool.request();

            request.input('UserId', sql.Int, userId);
            request.input('Role', sql.NVarChar, role);

            const result = await request.execute('sp_PhieuKiem_GetList_ByRole');

            res.json(result.recordset);
        } catch (err) {
            console.error('GetPhieuKiem error:', err);
            res.status(500).json({ message: 'Lỗi tải danh sách phiếu kiểm' });
        }
    }
);

router.get(
    '/my',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('NguoiKiemId', sql.Int, req.user.userId)
                .execute('SP_PhieuKiem_My'); // 👈 gọi stored

            res.json(result.recordset);

        } catch (error) {
            console.error('API /my error:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
);

/* =========================================================
   GET /phieu-kiem/:id
   Permission : XEM_PHIEU_KIEM
========================================================= */
router.get(
    '/:id',
    authenticateToken,
    authorize('XEM_PHIEU_KIEM'),
    async (req, res) => {
        const { id } = req.params;

        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, id)
                .execute('sp_PhieuKiem_GetDetail');

            const phieu = result.recordsets[0][0] || null;
            const sections = result.recordsets[1] || [];
            const checkItems = result.recordsets[2] || [];
            const defects = result.recordsets[3] || [];

            res.json({
                phieu,
                sections,
                checkItems,
                defects
            });

        } catch (err) {
            console.error('GetDetail error:', err);
            res.status(500).json({
                message: 'Lỗi tải chi tiết phiếu kiểm'
            });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/create
   Role       : TO_TRUONG_KCS
   Permission : PHAN_BO_KIEM
========================================================= */

router.post(
    '/create',
    authenticateToken,
    authorize('PHAN_BO_KIEM'),
    async (req, res) => {
        const {
            sanPhamId,
            loaiKiemId,
            lot,
            doiTuong,
            nguoiKiemId
        } = req.body;

        if (!sanPhamId || !loaiKiemId || !nguoiKiemId) {
            return res.status(400).json({
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('SanPhamId', sql.Int, sanPhamId)
                .input('LoaiKiemId', sql.Int, loaiKiemId)
                .input('Lot', sql.NVarChar, lot)
                .input('DoiTuong', sql.NVarChar, doiTuong)
                .input('NguoiKiemId', sql.Int, nguoiKiemId)
                // .input('NguoiTaoId', sql.Int, req.user.userId)
                .execute('sp_PhieuKiem_Create');

            res.json({
                success: true,
                phieuKiemId: result.recordset[0].Id,
                soPhieu: result.recordset[0].SoPhieu
            });

        } catch (err) {
            console.error('CreatePhieuKiem error:', err);
            res.status(500).json({
                message: 'Tạo phiếu kiểm thất bại'
            });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/section
   Role       : KCS
   Permission : THUC_HIEN_KIEM
========================================================= */
router.post(
    '/section',
    authenticateToken,
    authorize('PHAN_BO_KIEM'),
    async (req, res) => {
        const {
            phieuKiemId,
            // nhomKiemId,
            // tenNhom,
            lotSize,
            inspectionLevel
        } = req.body;

        if (!phieuKiemId || !lotSize || !inspectionLevel) {
            return res.status(400).json({
                message: 'Missing required fields'
            });
        }
        console.log('CreateAllSection data:', req.body);
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                // .input('NhomKiemId', sql.Int, nhomKiemId)
                // .input('TenNhom', sql.NVarChar, tenNhom)
                .input('LotSize', sql.Int, lotSize)
                .input('InspectionLevel', sql.NVarChar, inspectionLevel)
                .execute('sp_PhieuKiem_CreateAllSection');

            res.json({
                success: true,
                sectionId: result.recordset[0].SectionId
            });

        } catch (err) {
            console.error('CreateSection error:', err);
            res.status(500).json({
                message: 'Tạo section thất bại'
            });
        }
    }
);

router.post(
    '/start',
    authenticateToken,
    authorize('PHAN_BO_KIEM'),
    async (req, res) => {
        const { phieuKiemId, lotSize, inspectionLevel } = req.body;

        const pool = await poolPromise;

        await pool.request()
            .input('PhieuKiemId', sql.Int, phieuKiemId)
            .input('LotSize', sql.Int, lotSize)
            .input('InspectionLevel', sql.NVarChar, inspectionLevel)
            .execute('sp_PhieuKiem_CreateAllSection');

        res.json({ success: true });
    }
);
/* =========================================================
   POST /phieu-kiem/check-item
   Role       : KCS
   Permission : THUC_HIEN_KIEM
========================================================= */
router.post(
    "/check-item",
    authenticateToken,
    authorize("THUC_HIEN_KIEM"),
    async (req, res) => {
        const { checkItemId, ketQua, soLuongLoi, defectId } = req.body;

        try {
            const pool = await poolPromise;

            await pool.request()
                .input("CheckItemId", sql.Int, checkItemId)
                .input("KetQua", sql.NVarChar, ketQua)
                .input("SoLuongLoi", sql.Int, soLuongLoi)
                .input("DefectId", sql.Int, defectId)
                .execute("sp_PhieuKiem_SaveCheckItem");

            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Lưu thất bại" });
        }
    }
);

router.post(
    "/calculate-aql",
    authenticateToken,
    authorize("THUC_HIEN_KIEM"),
    async (req, res) => {
        const { sectionId } = req.body;

        try {
            const pool = await poolPromise;

            await pool.request()
                .input("SectionId", sql.Int, sectionId)
                .execute("sp_PhieuKiem_CalculateAQL");

            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Tính AQL thất bại" });
        }
    }
);
/* =========================================================
   POST /phieu-kiem/complete
   Role       : KCS
   Permission : THUC_HIEN_KIEM
========================================================= */
router.post(
    '/complete',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { phieuKiemId } = req.body;

        if (!phieuKiemId) {
            return res.status(400).json({
                message: 'Missing phieuKiemId'
            });
        }

        try {
            const pool = await poolPromise;

            await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .execute('sp_PhieuKiem_Complete');

            res.json({
                success: true
            });

        } catch (err) {
            console.error('CompletePhieuKiem error:', err);
            res.status(500).json({
                message: 'Hoàn tất phiếu kiểm thất bại'
            });
        }
    }
);


router.post(
    '/ket-luan',
    authenticateToken,
    authorize('KET_LUAN'),
    async (req, res) => {
        const { phieuKiemId, ketLuan } = req.body;

        if (!phieuKiemId || !ketLuan) {
            return res.status(400).json({
                message: 'Missing required fields'
            });
        }

        try {
            const pool = await poolPromise;

            await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('KetLuan', sql.NVarChar, ketLuan)
                .execute('sp_PhieuKiem_KetLuan');

            res.json({ success: true });

        } catch (err) {
            console.error('KetLuan error:', err);
            res.status(500).json({
                message: 'Kết luận thất bại'
            });
        }
    }
);

module.exports = router;
