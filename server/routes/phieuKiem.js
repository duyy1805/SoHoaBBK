const express = require('express');
const router = express.Router();
const sql = require('mssql');

const { poolPromise } = require('../db');
const authenticateToken = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');

/* =========================================================
   POST /phieu-kiem/phan-bo
   Role       : TO_TRUONG_KCS
   Permission : PHAN_BO_KIEM
   ========================================================= */
router.post(
    '/phan-bo',
    authenticateToken,
    authorize('PHAN_BO_KIEM'),
    async (req, res) => {
        const {
            loaiKiem,
            chungLoaiId,
            lot,
            doiTuong,
            nguoiKiemId,
            thoiGianKiem
        } = req.body;

        if (!loaiKiem || !chungLoaiId || !nguoiKiemId) {
            return res.status(400).json({
                message: 'Missing required fields'
            });
        }

        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('LoaiKiem', sql.NVarChar, loaiKiem)
                .input('ChungLoaiId', sql.Int, chungLoaiId)
                .input('Lot', sql.NVarChar, lot)
                .input('DoiTuong', sql.NVarChar, doiTuong)
                .input('NguoiKiemId', sql.Int, nguoiKiemId)
                .input('ThoiGianKiem', sql.DateTime2, thoiGianKiem)
                .execute('sp_PhieuKiem_PhanBo');

            res.json({
                success: true,
                soPhieu: result.recordset[0].SoPhieu
            });
        } catch (err) {
            console.error('PhanBoKiem error:', err);
            res.status(500).json({
                message: 'Phân bổ kiểm thất bại'
            });
        }
    }
);

router.get(
    '/',
    authenticateToken,
    async (req, res) => {
        try {
            const pool = await poolPromise;

            const { soPhieu } = req.query;

            const result = await pool.request()
                .input('SoPhieu', sql.NVarChar, soPhieu || null)
                .execute('sp_PhieuKiem_GetList');

            res.json(result.recordset);
        } catch (err) {
            console.error('GetPhieuKiemList error:', err);
            res.status(500).json({
                message: 'Không lấy được danh sách phiếu kiểm'
            });
        }
    }
);

router.get(
    '/:id',
    authenticateToken,
    async (req, res) => {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, req.params.id)
                .execute('sp_PhieuKiem_GetDetail');

            if (result.recordset.length === 0) {
                return res.status(404).json({
                    message: 'Phiếu kiểm không tồn tại'
                });
            }

            res.json(result.recordset[0]);
        } catch (err) {
            console.error('GetPhieuKiemDetail error:', err);
            res.status(500).json({
                message: 'Không lấy được chi tiết phiếu kiểm'
            });
        }
    }
);

router.post(
    '/kq-chi-so',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const pool = await poolPromise;
        await pool.request()
            .input('PhieuKiemId', sql.Int, req.body.phieuKiemId)
            .input('ChiSoId', sql.Int, req.body.chiSoId)
            .input('GiaTri', sql.NVarChar, req.body.giaTri)
            .input('Dat', sql.Bit, req.body.dat)
            .execute('sp_KQChiSoKiem_Save');

        res.json({ success: true });
    }
);

router.get(
    '/:id/tieu-chi',
    authenticateToken,
    async (req, res) => {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, req.params.id)
                .execute('sp_PhieuKiem_GetTieuChiChiSo');

            // Gom dữ liệu theo tiêu chí
            const map = {};

            result.recordset.forEach(row => {
                if (!map[row.TieuChiId]) {
                    map[row.TieuChiId] = {
                        tieuChiId: row.TieuChiId,
                        tenTieuChi: row.TenTieuChi,
                        chiSo: []
                    };
                }

                map[row.TieuChiId].chiSo.push({
                    chiSoId: row.ChiSoId,
                    tenChiSo: row.TenChiSo,
                    kieuDuLieu: row.KieuDuLieu,
                    giaTri: row.GiaTri ?? null,
                    dat: row.Dat ?? null
                });
            });

            res.json(Object.values(map));
        } catch (err) {
            console.error('GetTieuChiChiSo error:', err);
            res.status(500).json({
                message: 'Không lấy được tiêu chí kiểm'
            });
        }
    }
);


router.post(
    '/ket-luan',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const pool = await poolPromise;
        await pool.request()
            .input('PhieuKiemId', sql.Int, req.body.phieuKiemId)
            .input('KetLuan', sql.NVarChar, req.body.ketLuan)
            .execute('sp_PhieuKiem_KCS_KetLuan');

        res.json({ success: true });
    }
);

router.post(
    '/lap',
    authenticateToken,
    authorize('LAP_BIEN_BAN'),
    async (req, res) => {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, req.body.phieuKiemId)
                .input('LoaiTrachNhiem', sql.NVarChar, req.body.loaiTrachNhiem)
                .input('MoTaLoi', sql.NVarChar, req.body.moTaLoi)
                .input('NguoiLapId', sql.Int, req.user.userId)
                .execute('sp_BienBan_Lap');

            res.json({
                success: true,
                soBienBan: result.recordset[0].SoBienBan
            });
        } catch (err) {
            if (err.message.includes('PHIEU_CHUA_KHONG_DAT')) {
                return res.status(400).json({ message: 'Phiếu chưa không đạt' });
            }
            if (err.message.includes('BIEN_BAN_DA_TON_TAI')) {
                return res.status(409).json({ message: 'Biên bản đã tồn tại' });
            }
            res.status(500).json({ message: 'Lập biên bản thất bại' });
        }
    }
);

module.exports = router;
