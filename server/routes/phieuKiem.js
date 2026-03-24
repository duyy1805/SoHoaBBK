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

// =========================================================
// GET /phieu-kiem/lich-dong-cont/chua-kiem
// =========================================================
router.get(
    '/lich-dong-cont/chua-kiem',
    authenticateToken,
    authorize('XEM_PHIEU_KIEM'),
    async (req, res) => {

        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .execute('sp_LichDongCont_GetList');

            res.json(result.recordset);

        } catch (err) {
            console.error('GetLichDongCont error:', err);
            res.status(500).json({ message: 'Lỗi lấy lịch đóng cont' });
        }
    }
);

router.get(
    '/source-checked',
    authenticateToken,
    authorize('XEM_PHIEU_KIEM'),
    async (req, res) => {

        try {
            const { week, year, loaiKiemId } = req.query;

            if (!week || !year || !loaiKiemId) {
                return res.status(400).json({
                    message: 'Thiếu tham số week, year hoặc loaiKiemId'
                });
            }

            const pool = await poolPromise;

            const result = await pool.request()
                .input('LoaiKiemId', parseInt(loaiKiemId))
                .input('Week', parseInt(week))
                .input('Year', parseInt(year))
                .execute('sp_PhieuKiem_GetSourceChecked_ByWeekRange');

            // ⚡ trả về array GUID luôn
            res.json(result.recordset.map(x => x.SourceId_LCD));

        } catch (err) {
            console.error('GetSourceChecked error:', err);
            res.status(500).json({ message: 'Lỗi lấy danh sách đã kiểm' });
        }
    }
);

router.get(
    '/chung-tu-nhap/chua-kiem',
    authenticateToken,
    authorize('XEM_PHIEU_KIEM'),
    async (req, res) => {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .execute('sp_ChungTuNhapChiTiet_GetList_ChuaKiem');

            res.json(result.recordset);

        } catch (err) {
            console.error(err);
            res.status(500).json({
                message: 'Lỗi lấy chứng từ nhập'
            });
        }
    }
);

router.get(
    '/my',
    authenticateToken,
    async (req, res) => {

        try {

            const pool = await poolPromise;

            const permissions = req.user.permissions;
            let mode = 'VIEW';
            if (permissions.includes('PHAN_BO_KIEM'))
                mode = 'TO_TRUONG_KCS';
            if (permissions.includes('THUC_HIEN_KIEM'))
                mode = 'KCS';
            if (permissions.includes('XAC_NHAN_PX'))
                mode = 'PX';
            if (permissions.includes('XAC_NHAN_KIEM_NGHIEM'))
                mode = 'KIEM_NGHIEM';
            if (permissions.includes('QUAN_TRI_DM'))
                mode = 'VIEW';
            const result = await pool.request()
                .input('UserId', sql.Int, req.user.userId)
                .input('Mode', sql.NVarChar, mode)
                .execute('SP_PhieuKiem_My');

            res.json(result.recordset);

        } catch (error) {

            console.error('API /my error:', error);

            res.status(500).json({
                message: 'Internal Server Error'
            });

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
            let dynamicFields = [];
            if (phieu && phieu.DynamicFieldsJSON) {
                try {
                    dynamicFields = JSON.parse(phieu.DynamicFieldsJSON);
                } catch (e) {
                    console.error("Lỗi parse DynamicFieldsJSON:", e);
                }
                // Xóa trường string thô để API trả về nhẹ và sạch sẽ
                delete phieu.DynamicFieldsJSON;
            }

            const sections = result.recordsets[1] || [];
            // const checkItems = result.recordsets[2] || [];
            const defects = result.recordsets[3] || [];

            const rows = result.recordsets[2];
            const map = {};

            rows.forEach(r => {

                if (!map[r.Id]) {
                    map[r.Id] = { ...r, Defects: [] };
                }

                if (r.DefectId) {
                    map[r.Id].Defects.push({
                        DefectId: r.DefectId,
                        MaLoi: r.MaLoi,
                        TenLoi: r.TenLoi,
                        SoLuong: r.SoLuong
                    });
                }

            });

            const checkItems = Object.values(map);
            res.json({
                phieu,
                sections,
                checkItems,
                defects,
                dynamicFields
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
            nguoiKiemId,
            sourceId,
            sourceId_LCD, // Thêm field cho lịch đóng cont (GUID)
            soLuong
        } = req.body;

        // Bắt buộc phải có 1 trong 2 loại source
        if (!sanPhamId || !loaiKiemId || !nguoiKiemId || !soLuong || (!sourceId && !sourceId_LCD)) {
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
                .input('SoLuong', sql.Int, soLuong)
                .input('NguoiLapId', sql.Int, req.user.userId)
                // Truyền null nếu không có giá trị để Stored Procedure xử lý linh hoạt
                .input('SourceId', sql.Int, sourceId || null)
                .input('SourceId_LCD', sql.UniqueIdentifier, sourceId_LCD || null)
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
    "/section",
    authenticateToken,
    authorize("PHAN_BO_KIEM"),
    async (req, res) => {

        const { phieuKiemId, sections } = req.body;

        if (!phieuKiemId || !sections || !sections.length) {
            return res.status(400).json({
                message: "Missing required fields"
            });
        }

        try {

            const pool = await poolPromise;

            const table = new sql.Table();

            table.columns.add("NhomKiemId", sql.Int);
            table.columns.add("LotSize", sql.Int);
            table.columns.add("InspectionLevel", sql.NVarChar(10));

            sections.forEach(s => {

                table.rows.add(
                    s.nhomKiemId,
                    s.lotSize,
                    s.inspectionLevel
                );

            });

            const result = await pool.request()
                .input("PhieuKiemId", sql.Int, phieuKiemId)
                .input("Sections", table)
                .execute("sp_PhieuKiem_CreateAllSection");

            res.json({
                success: true,
                sections: result.recordset
            });

        } catch (err) {

            console.error("CreateSection error:", err);

            res.status(500).json({
                message: "Tạo section thất bại"
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

router.post(
    "/update-lot",
    authenticateToken,
    async (req, res) => {

        const { phieuKiemId, lot } = req.body;
        try {

            const pool = await poolPromise;

            await pool.request()
                .input("PhieuKiemId", sql.Int, phieuKiemId)
                .input("Lot", sql.NVarChar, lot)
                .execute("sp_PhieuKiem_UpdateLot");

            res.json({ success: true });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                message: "Không thể cập nhật số lot"
            });

        }

    });

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

        const { checkItemId, ketQua, defects } = req.body;

        try {

            const pool = await poolPromise;

            await pool.request()
                .input("CheckItemId", sql.Int, checkItemId)
                .input("KetQua", sql.NVarChar, ketQua)
                .input("Defects", sql.NVarChar(sql.MAX), JSON.stringify(defects))
                .execute("sp_PhieuKiem_SaveCheckItem");

            res.json({ success: true });

        } catch (err) {

            console.error(err);
            res.status(500).json({ message: "Lưu thất bại" });

        }

    });

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
        const userId = req.user.userId;

        if (!phieuKiemId) {
            return res.status(400).json({
                message: 'Missing phieuKiemId'
            });
        }

        if (!userId) {
            return res.status(400).json({
                message: 'Missing userId'
            });
        }
        try {
            const pool = await poolPromise;

            await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userId)
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

/* =========================================================
   POST /phieu-kiem/xac-nhan-px
   Role       : PX
   Permission : XAC_NHAN_PX
========================================================= */

router.post(
    '/xac-nhan-px',
    authenticateToken,
    authorize('XAC_NHAN_PX'),
    async (req, res) => {

        const { phieuKiemId } = req.body;
        const userId = req.user.userId;

        if (!phieuKiemId) {
            return res.status(400).json({
                message: 'Missing phieuKiemId'
            });
        }

        try {

            const pool = await poolPromise;

            await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userId)
                .execute('sp_PhieuKiem_XacNhanPX');

            res.json({
                success: true,
                message: 'Phân xưởng đã xác nhận'
            });

        } catch (err) {

            console.error('XacNhanPX error:', err);

            res.status(500).json({
                message: 'Xác nhận phân xưởng thất bại'
            });

        }

    }
);

/* =========================================================
   POST /phieu-kiem/xac-nhan-kiem-nghiem
   Role       : KIEM_NGHIEM
   Permission : XAC_NHAN_KIEM_NGHIEM
========================================================= */

router.post(
    '/xac-nhan-kiem-nghiem',
    authenticateToken,
    authorize('XAC_NHAN_KIEM_NGHIEM'),
    async (req, res) => {

        const { phieuKiemId } = req.body;
        const userId = req.user.userId;

        if (!phieuKiemId) {
            return res.status(400).json({
                message: 'Missing phieuKiemId'
            });
        }

        try {

            const pool = await poolPromise;

            await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userId)
                .execute('sp_PhieuKiem_XacNhanKiemNghiem');

            res.json({
                success: true,
                message: 'Phòng kiểm nghiệm đã xác nhận'
            });

        } catch (err) {

            console.error('XacNhanKiemNghiem error:', err);

            res.status(500).json({
                message: 'Xác nhận phòng kiểm nghiệm thất bại'
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


router.post('/custom-fields', async (req, res) => {
    try {
        const { phieuKiemId, fields } = req.body;

        // fields nhận được từ UI sẽ có dạng object: { NhaCungCap: "Cty A", KhachHang: "Cty B" }
        // Chuyển object fields thành string JSON để đẩy vào Stored
        const jsonString = JSON.stringify(fields);
        const pool = await poolPromise;
        await pool.request()
            .input('PhieuKiemId', sql.Int, phieuKiemId)
            .input('JsonData', sql.NVarChar(sql.MAX), jsonString)
            .execute('SP_Upsert_PhieuKiem_CustomFields');

        res.status(200).json({ success: true, message: 'Đã lưu thông tin fields' });
    } catch (error) {
        console.error("Lỗi lưu custom fields:", error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});
module.exports = router;
