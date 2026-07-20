const express = require('express');
const router = express.Router();

const attachBtpLotRows = (btpItems = [], lotRows = []) => {
    const rowsByItemId = lotRows.reduce((acc, row) => {
        const key = row.BtpItemId;
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
    }, {});

    return btpItems.map(item => {
        const rows = rowsByItemId[item.Id] || [];
        return {
            ...item,
            LotRows: rows.length > 0
                ? rows
                : [{
                    BtpItemId: item.Id,
                    DauTuanGS1: item.DauTuanGS1,
                    ThuTu: item.ThuTu,
                    LxvtLot: item.LxvtLot,
                    SoLotSX: item.SoLotSX,
                    SoLuongNhap: item.SoLuongNhap,
                    SoLuongKhoXacNhan: item.SoLuongKhoXacNhan,
                    KhoXacNhanBy: item.KhoXacNhanBy,
                    KhoXacNhanAt: item.KhoXacNhanAt,
                    SortOrder: 1
                }].filter(row =>
                    (row.SoLuongNhap !== null && row.SoLuongNhap !== undefined) ||
                    (row.SoLuongKhoXacNhan !== null && row.SoLuongKhoXacNhan !== undefined) ||
                    row.DauTuanGS1 || row.ThuTu || row.LxvtLot || row.SoLotSX
                )
        };
    });
};
const sql = require('mssql');
const fs = require('fs');
const { poolPromise } = require('../db');
const authenticateToken = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');

const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
sharp.cache(false);

const { Expo } = require('expo-server-sdk');
let expo = new Expo();
const CUOI_CHUYEN_LOAI_KIEM_ID = 3;
const TREN_CHUYEN_LOAI_KIEM_ID = 6;
const CUOI_CHUYEN_APPROVE_BOPHAN_FIELD = 'CuoiChuyen_ApproveBoPhanId';
const CUOI_CHUYEN_COMPLETED_BY_FIELD = 'CuoiChuyen_CompletedByUserId';
const CUOI_CHUYEN_COMPLETED_BY_NAME_FIELD = 'CuoiChuyen_CompletedByName';
const CUOI_CHUYEN_APPROVED_BY_NAME_FIELD = 'CuoiChuyen_ApprovedByName';
const TREN_CHUYEN_APPROVE_BOPHAN_FIELD = 'TrenChuyen_ApproveBoPhanId';
const TREN_CHUYEN_COMPLETED_BY_FIELD = 'TrenChuyen_CompletedByUserId';
const TREN_CHUYEN_COMPLETED_BY_NAME_FIELD = 'TrenChuyen_CompletedByName';

const isCuoiChuyenLoaiKiem = (loaiKiemId) => Number(loaiKiemId) === CUOI_CHUYEN_LOAI_KIEM_ID;
const isTrenChuyenLoaiKiem = (loaiKiemId) => Number(loaiKiemId) === TREN_CHUYEN_LOAI_KIEM_ID;
const isAdminUser = (user = {}) =>
    Array.isArray(user?.permissions) && user.permissions.includes('QUAN_TRI_DM')
    || (Array.isArray(user?.roles) && user.roles.some((role) => String(role || '').toUpperCase().includes('ADMIN')));
const getUserDisplayName = async (pool, userId, fallback = '') => {
    const normalizedUserId = Number(userId || 0);
    if (!normalizedUserId) return fallback || '';

    const result = await pool.request()
        .input('UserId', sql.Int, normalizedUserId)
        .query(`
            SELECT TOP 1 COALESCE(NULLIF(LTRIM(RTRIM(FullName)), ''), Username) AS DisplayName
            FROM dbo.USERS
            WHERE Id = @UserId
        `);

    return result.recordset?.[0]?.DisplayName || fallback || '';
};
const canManageTrenChuyenAll = (permissions = []) =>
    Array.isArray(permissions) && (permissions.includes('PHAN_BO_KIEM') || permissions.includes('KET_LUAN') || permissions.includes('QUAN_TRI_DM'));

const attachProductImageToPhieu = async (pool, phieu = null) => {
    if (!phieu || !phieu.SanPhamId) {
        return phieu;
    }

    const result = await pool.request()
        .input("SanPhamId", sql.Int, phieu.SanPhamId)
        .query("SELECT ImageUrl, KhachHang FROM dbo.DM_SAN_PHAM WHERE Id = @SanPhamId");

    if (!phieu.ImageUrl) {
        phieu.ImageUrl = result.recordset?.[0]?.ImageUrl || null;
    }
    if (!phieu.KhachHang) {
        phieu.KhachHang = result.recordset?.[0]?.KhachHang || null;
    }
    return phieu;
};

const upsertPhieuKiemCustomFields = async (pool, phieuKiemId, fields) => {
    if (!phieuKiemId || !fields || typeof fields !== 'object' || Array.isArray(fields)) {
        return;
    }

    await pool.request()
        .input('PhieuKiemId', sql.Int, phieuKiemId)
        .input('JsonData', sql.NVarChar(sql.MAX), JSON.stringify(fields))
        .execute('SP_Upsert_PhieuKiem_CustomFields');
};

const enrichSxbtSignatureFields = async (pool, dynamicFields = [], phieu = null) => {
    const fields = Array.isArray(dynamicFields) ? [...dynamicFields] : [];
    const fieldMap = new Map(fields.map((field) => [field.FieldName, field.FieldValue]));
    const signatureUserFields = [
        ['SxbtKcsCompletedBy', 'SxbtKcsCompletedByName'],
        ['SxbtConfirmedBy', 'SxbtConfirmedByName'],
        ['SxbtKhoConfirmedBy', 'SxbtKhoConfirmedByName']
    ];

    for (const [idField, nameField] of signatureUserFields) {
        const userId = Number(fieldMap.get(idField) || 0);
        if (!userId || fieldMap.has(nameField)) continue;

        const fallbackName = idField === 'SxbtKcsCompletedBy' ? phieu?.TenNguoiKiem : '';
        const displayName = await getUserDisplayName(pool, userId, fallbackName || '');
        fields.push({
            FieldName: nameField,
            FieldValue: displayName
        });
    }

    return fields;
};

const normalizeTrenChuyenSlots = (slots = []) => slots.map((slot, slotIndex) => ({
    gioKiem: String(slot?.gioKiem || '').trim(),
    sortOrder: Number(slot?.sortOrder || slotIndex + 1),
    entries: Array.isArray(slot?.entries)
        ? slot.entries.map((entry, entryIndex) => ({
            congDoan: String(entry?.congDoan || '').trim(),
            tenCongNhanGayLoi: String(entry?.tenCongNhanGayLoi || '').trim(),
            nguoiGhiNhanId: Number(entry?.nguoiGhiNhanId || 0) || null,
            ghiChu: entry?.ghiChu ? String(entry.ghiChu).trim() : '',
            sortOrder: Number(entry?.sortOrder || entryIndex + 1),
            defects: Array.isArray(entry?.defects)
                ? entry.defects.map((defect, defectIndex) => ({
                    defectId: Number(defect?.defectId || 0),
                    soLuong: Number(defect?.soLuong || 0),
                    soLuongDatSauSua: defect?.soLuongDatSauSua === '' || defect?.soLuongDatSauSua == null
                        ? null
                        : Number(defect.soLuongDatSauSua),
                    soLuongKhongDatSauSua: defect?.soLuongKhongDatSauSua === '' || defect?.soLuongKhongDatSauSua == null
                        ? null
                        : Number(defect.soLuongKhongDatSauSua),
                    ghiChu: defect?.ghiChu ? String(defect.ghiChu).trim() : '',
                    imageUrls: Array.isArray(defect?.imageUrls)
                        ? defect.imageUrls.filter((url) => typeof url === 'string' && url.trim() !== '')
                        : [],
                    sortOrder: Number(defect?.sortOrder || defectIndex + 1)
                })).filter((defect) => defect.defectId > 0 && defect.soLuong > 0)
                : []
        }))
        : []
}));

const normalizeCuoiChuyenPlans = (plans = []) => plans.map((plan, planIndex) => ({
    planId: Number(plan?.planId || plan?.id || plan?.Id || 0) || null,
    idKeHoachSanXuat: Number(plan?.idKeHoachSanXuat || plan?.ID_KeHoachSanXuat || plan?.sourceId || 0) || null,
    sanPhamId: Number(plan?.sanPhamId || plan?.SanPhamId || 0) || null,
    maSanPham: String(plan?.maSanPham || plan?.MaSanPham || '').trim(),
    tenSanPham: String(plan?.tenSanPham || plan?.TenSanPham || '').trim(),
    tenDonVi: String(plan?.tenDonVi || plan?.Ten_DonVi || plan?.TenDonVi || '').trim(),
    tenBoPhan: String(plan?.tenBoPhan || plan?.Ten_BoPhan || plan?.TenBoPhan || '').trim(),
    ngayKeHoach: plan?.ngayKeHoach || plan?.Ngay || plan?.NgayKeHoach || null,
    soLuongKeHoach: plan?.soLuongKeHoach === '' || plan?.soLuongKeHoach == null
        ? null
        : Number(plan.soLuongKeHoach),
    nangSuatDuKien: plan?.nangSuatDuKien === '' || plan?.nangSuatDuKien == null
        ? null
        : Number(plan.nangSuatDuKien),
    daSanXuat: plan?.daSanXuat === '' || plan?.daSanXuat == null
        ? null
        : Number(plan.daSanXuat),
    sortOrder: Number(plan?.sortOrder || planIndex + 1),
    defects: Array.isArray(plan?.defects)
        ? plan.defects.map((defect, defectIndex) => ({
            defectId: Number(defect?.defectId || defect?.DefectId || 0),
            soLuong: Number(defect?.soLuong || defect?.SoLuong || 0),
            soLuongDatSauSua: defect?.soLuongDatSauSua === '' || defect?.soLuongDatSauSua == null
                ? null
                : Number(defect.soLuongDatSauSua),
            soLuongKhongDatSauSua: defect?.soLuongKhongDatSauSua === '' || defect?.soLuongKhongDatSauSua == null
                ? null
                : Number(defect.soLuongKhongDatSauSua),
            ghiChu: String(defect?.ghiChu || defect?.GhiChu || '').trim(),
            imageUrls: Array.isArray(defect?.imageUrls)
                ? defect.imageUrls.filter((url) => typeof url === 'string' && url.trim() !== '')
                : [],
            sortOrder: Number(defect?.sortOrder || defectIndex + 1)
        })).filter((defect) => defect.defectId > 0 && defect.soLuong > 0)
        : []
}));
// Cấu hình Multer để lưu file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

router.post(
    '/upload',
    authenticateToken,
    upload.array('images', 10), // Tối đa 10 ảnh 1 lần
    async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ message: 'No files uploaded' });
            }

            // Xử lý từng file ảnh: Convert sang JPEG để hỗ trợ hiển thị trên Web (đặc biệt là HEIC từ iPhone)
            const filePaths = await Promise.all(req.files.map(async (file) => {
                const outputFilename = `v2-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
                const outputPath = path.join('uploads', outputFilename);

                await sharp(file.path)
                    .rotate() // Tự động xoay ảnh theo EXIF (tránh bị ngược ảnh)
                    .jpeg({ quality: 80 }) // Chuyển về định dạng JPEG, nén chất lượng 80% để nhẹ hơn
                    .toFile(outputPath);

                // Sau khi convert xong, xoá file gốc để tiết kiệm bộ nhớ
                try {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                } catch (err) {
                    console.error('Failed to delete temp file:', file.path, err.message);
                }

                return `/uploads/${outputFilename}`;
            }));

            res.json({ success: true, filePaths });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ message: 'Upload failed' });
        }
    }
);

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

/* =========================================================
   DELETE /phieu-kiem/:id
   Xóa cứng phiếu khi chưa tạo section
========================================================= */
router.delete(
    '/:id',
    authenticateToken,
    authorize(['PHAN_BO_KIEM', 'THUC_HIEN_KIEM']),
    async (req, res) => {
        const phieuKiemId = Number(req.params.id);

        if (!Number.isInteger(phieuKiemId) || phieuKiemId <= 0) {
            return res.status(400).json({ message: 'Id phiếu không hợp lệ' });
        }

        let transaction;

        try {
            const pool = await poolPromise;
            transaction = new sql.Transaction(pool);
            await transaction.begin();

            const guard = await new sql.Request(transaction)
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .query(`
                    SELECT
                        ExistsFlag = CASE WHEN EXISTS (
                            SELECT 1 FROM dbo.PHIEU_KIEM WHERE Id = @PhieuKiemId
                        ) THEN 1 ELSE 0 END,
                        SectionCount = (
                            SELECT COUNT(1)
                            FROM dbo.PHIEU_KIEM_SECTION
                            WHERE PhieuKiemId = @PhieuKiemId
                        ),
                        BienBanCount = (
                            SELECT COUNT(1)
                            FROM dbo.BIEN_BAN_KIEM
                            WHERE PhieuKiemId = @PhieuKiemId
                        );
                `);

            const info = guard.recordset[0];

            if (!info || info.ExistsFlag !== 1) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Không tìm thấy phiếu kiểm' });
            }

            if (info.SectionCount > 0 || info.BienBanCount > 0) {
                await transaction.rollback();
                return res.status(409).json({
                    message: 'Không thể xoá vì phiếu đã phát sinh dữ liệu kiểm hoặc biên bản'
                });
            }

            await new sql.Request(transaction)
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .query(`
                    DELETE FROM dbo.PhieuKiem_CustomFields
                    WHERE PhieuKiemId = @PhieuKiemId;

                    DELETE FROM dbo.PHIEU_KIEM_THONG_SO_KQ
                    WHERE PhieuKiemId = @PhieuKiemId;

                    DELETE FROM dbo.PHIEU_KIEM_XAC_NHAN
                    WHERE PhieuKiemId = @PhieuKiemId;

                    DELETE FROM dbo.PHIEU_KIEM_SXBT_SUMMARY
                    WHERE PhieuKiemId = @PhieuKiemId;

                    IF OBJECT_ID(N'dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT', N'U') IS NOT NULL
                    BEGIN
                        EXEC sp_executesql N'
                            DELETE d
                            FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT d
                            INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY e ON e.Id = d.EntryId
                            INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT s ON s.Id = e.SlotId
                            WHERE s.PhieuKiemId = @InnerPhieuKiemId;
                        ', N'@InnerPhieuKiemId INT', @InnerPhieuKiemId = @PhieuKiemId;
                    END

                    IF OBJECT_ID(N'dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY', N'U') IS NOT NULL
                    BEGIN
                        EXEC sp_executesql N'
                            DELETE e
                            FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY e
                            INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT s ON s.Id = e.SlotId
                            WHERE s.PhieuKiemId = @InnerPhieuKiemId;
                        ', N'@InnerPhieuKiemId INT', @InnerPhieuKiemId = @PhieuKiemId;
                    END

                    IF OBJECT_ID(N'dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT', N'U') IS NOT NULL
                    BEGIN
                        EXEC sp_executesql N'
                            DELETE FROM dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT
                            WHERE PhieuKiemId = @InnerPhieuKiemId;
                        ', N'@InnerPhieuKiemId INT', @InnerPhieuKiemId = @PhieuKiemId;
                    END

                    IF OBJECT_ID(N'dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT', N'U') IS NOT NULL
                    BEGIN
                        EXEC sp_executesql N'
                            DELETE d
                            FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT d
                            INNER JOIN dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN p ON p.Id = d.PlanId
                            WHERE p.PhieuKiemId = @InnerPhieuKiemId;
                        ', N'@InnerPhieuKiemId INT', @InnerPhieuKiemId = @PhieuKiemId;
                    END

                    IF OBJECT_ID(N'dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN', N'U') IS NOT NULL
                    BEGIN
                        EXEC sp_executesql N'
                            DELETE FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN
                            WHERE PhieuKiemId = @InnerPhieuKiemId;
                        ', N'@InnerPhieuKiemId INT', @InnerPhieuKiemId = @PhieuKiemId;
                    END

                    IF OBJECT_ID(N'dbo.PHIEU_KIEM_BTP_ITEM_LOT', N'U') IS NOT NULL
                    BEGIN
                        EXEC sp_executesql N'
                            DELETE lot
                            FROM dbo.PHIEU_KIEM_BTP_ITEM_LOT lot
                            INNER JOIN dbo.PHIEU_KIEM_BTP_ITEM item ON item.Id = lot.BtpItemId
                            WHERE item.PhieuKiemId = @InnerPhieuKiemId;
                        ', N'@InnerPhieuKiemId INT', @InnerPhieuKiemId = @PhieuKiemId;
                    END

                    DELETE FROM dbo.PHIEU_KIEM_BTP_ITEM
                    WHERE PhieuKiemId = @PhieuKiemId;

                    DELETE FROM dbo.PHIEU_KIEM
                    WHERE Id = @PhieuKiemId;
                `);

            await transaction.commit();

            res.json({ success: true, message: 'Đã xoá phiếu kiểm' });
        } catch (err) {
            if (transaction) {
                try {
                    await transaction.rollback();
                } catch { }
            }

            console.error('Delete phieu kiem error:', err);
            res.status(500).json({
                message: 'Không thể xoá phiếu kiểm',
                error: err.message
            });
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
    '/phieu-nhap-btp/chua-kiem',
    authenticateToken,
    authorize('XEM_PHIEU_KIEM'),
    async (req, res) => {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .execute('sp_PhieuNhapBTP_GetList_ChuaKiem');

            res.json(result.recordset);

        } catch (err) {
            console.error(err);
            res.status(500).json({
                message: 'Lỗi lấy danh sách phiếu nhập BTP'
            });
        }
    }
);

router.get(
    '/ke-hoach-san-xuat/chua-kiem',
    authenticateToken,
    authorize('XEM_PHIEU_KIEM'),
    async (req, res) => {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .execute('sp_KeHoachSanXuat_GetList_ChuaKiem_TrenChuyen');

            res.json(result.recordset);

        } catch (err) {
            console.error(err);
            res.status(500).json({
                message: 'Lỗi lấy kế hoạch sản xuất'
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
            if (permissions.includes('XAC_NHAN_PX'))
                mode = 'PX';
            if (permissions.includes('THUC_HIEN_KIEM'))
                mode = 'KCS';
            if (permissions.includes('PHAN_BO_KIEM'))
                mode = 'TO_TRUONG_KCS';   // ưu tiên cao hơn KCS
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

            // 1. Lấy thông tin cơ bản để xác định loại kiểm
            const basicInfo = await pool.request()
                .input('Id', sql.Int, id)
                .query('SELECT LoaiKiemId FROM PHIEU_KIEM WHERE Id = @Id');

            if (basicInfo.recordset.length === 0) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu kiểm' });
            }

            const loaiKiemId = basicInfo.recordset[0].LoaiKiemId;

            // 2. Nếu là Sản Xuất Bổ Trợ (LoaiKiemId = 4)
            if (loaiKiemId === 4) {
                const result = await pool.request()
                    .input('PhieuKiemId', sql.Int, id)
                    .execute('sp_PhieuKiem_GetDetail_SXBT');

                const phieu = result.recordsets[0][0] || null;
                await attachProductImageToPhieu(pool, phieu);
                let dynamicFields = [];
                if (phieu && phieu.DynamicFieldsJSON) {
                    try {
                        dynamicFields = JSON.parse(phieu.DynamicFieldsJSON);
                    } catch (e) { }
                    delete phieu.DynamicFieldsJSON;
                }
                dynamicFields = await enrichSxbtSignatureFields(pool, dynamicFields, phieu);

                const btpItems = attachBtpLotRows(result.recordsets[1] || [], result.recordsets[4] || []);

                return res.json({
                    phieu,
                    btpItems,
                    summary: result.recordsets[2][0] || null,
                    defects: result.recordsets[3] || [],
                    dynamicFields
                });
            }

            if (isCuoiChuyenLoaiKiem(loaiKiemId)) {
                const result = await pool.request()
                    .input('PhieuKiemId', sql.Int, id)
                    .execute('sp_PhieuKiem_GetDetail_CuoiChuyen');

                const phieu = result.recordsets?.[0]?.[0] || null;
                await attachProductImageToPhieu(pool, phieu);
                let dynamicFields = [];
                if (phieu && phieu.DynamicFieldsJSON) {
                    try {
                        dynamicFields = JSON.parse(phieu.DynamicFieldsJSON);
                    } catch (e) {
                        console.error("Lỗi parse DynamicFieldsJSON CuoiChuyen:", e);
                    }
                    delete phieu.DynamicFieldsJSON;
                }
                const completedByUserId = Number(
                    dynamicFields.find((field) => field?.FieldName === CUOI_CHUYEN_COMPLETED_BY_FIELD)?.FieldValue || 0
                ) || null;
                if (completedByUserId) {
                    const completedByName = await getUserDisplayName(pool, completedByUserId);
                    const completedByNameField = dynamicFields.find((field) => field?.FieldName === CUOI_CHUYEN_COMPLETED_BY_NAME_FIELD);
                    if (completedByNameField) {
                        completedByNameField.FieldValue = completedByName || completedByNameField.FieldValue;
                    } else if (completedByName) {
                        dynamicFields.push({
                            FieldName: CUOI_CHUYEN_COMPLETED_BY_NAME_FIELD,
                            FieldValue: completedByName
                        });
                    }
                }

                const planRecords = result.recordsets?.[1] || [];
                const defectRecords = result.recordsets?.[2] || [];
                const summary = result.recordsets?.[3]?.[0] || null;
                const xacNhans = result.recordsets?.[4] || [];

                const defectsByPlanId = {};
                defectRecords.forEach((record) => {
                    if (!defectsByPlanId[record.PlanId]) {
                        defectsByPlanId[record.PlanId] = [];
                    }

                    let defectImageUrls = [];
                    if (record.DefectImageUrls) {
                        try {
                            defectImageUrls = JSON.parse(record.DefectImageUrls);
                        } catch (e) {
                            defectImageUrls = [];
                        }
                    }
                    if (!Array.isArray(defectImageUrls)) {
                        defectImageUrls = [];
                    }

                    defectsByPlanId[record.PlanId].push({
                        Id: record.DefectRowId,
                        PlanId: record.PlanId,
                        DefectId: record.DefectId,
                        SoLuong: record.SoLuong,
                        SoLuongDatSauSua: record.SoLuongDatSauSua,
                        SoLuongKhongDatSauSua: record.SoLuongKhongDatSauSua,
                        GhiChu: record.DefectGhiChu || '',
                        SortOrder: record.DefectSortOrder || 0,
                        MaLoi: record.MaLoi,
                        TenLoi: record.TenLoi,
                        MoTa: record.MoTa,
                        DefectType: record.DefectType,
                        PhuongAnXuLy: record.PhuongAnXuLy,
                        ImageUrl: record.ImageUrl || null,
                        ImageUrls: defectImageUrls
                    });
                });

                const plans = planRecords.map((plan) => ({
                    ...plan,
                    Defects: [...(defectsByPlanId[plan.Id] || [])]
                        .sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0))
                }));

                return res.json({
                    phieu,
                    plans,
                    summary,
                    dynamicFields,
                    xacNhans
                });
            }

            if (isTrenChuyenLoaiKiem(loaiKiemId)) {
                const result = await pool.request()
                    .input('PhieuKiemId', sql.Int, id)
                    .execute('sp_PhieuKiem_GetDetail_TrenChuyen');

                const phieu = result.recordsets?.[0]?.[0] || null;
                await attachProductImageToPhieu(pool, phieu);
                let dynamicFields = [];
                if (phieu && phieu.DynamicFieldsJSON) {
                    try {
                        dynamicFields = JSON.parse(phieu.DynamicFieldsJSON);
                    } catch (e) {
                        console.error("Lỗi parse DynamicFieldsJSON TrenChuyen:", e);
                    }
                    delete phieu.DynamicFieldsJSON;
                }

                const slotRecords = result.recordsets?.[1] || [];
                const entryDefectRecords = result.recordsets?.[2] || [];
                const summary = result.recordsets?.[3]?.[0] || null;
                const xacNhans = result.recordsets?.[4] || [];

                const entriesBySlotId = {};

                entryDefectRecords.forEach((record) => {
                    if (!entriesBySlotId[record.SlotId]) {
                        entriesBySlotId[record.SlotId] = {};
                    }

                    if (!entriesBySlotId[record.SlotId][record.EntryId]) {
                        entriesBySlotId[record.SlotId][record.EntryId] = {
                            Id: record.EntryId,
                            SlotId: record.SlotId,
                            CongDoan: record.CongDoan,
                            TenCongNhanGayLoi: record.TenCongNhanGayLoi || '',
                            NguoiGhiNhanId: record.NguoiGhiNhanId || null,
                            TenNguoiGhiNhan: record.TenNguoiGhiNhan || '',
                            GhiChu: record.EntryGhiChu || '',
                            SortOrder: record.EntrySortOrder || 0,
                            CreatedAt: record.EntryCreatedAt || null,
                            UpdatedAt: record.EntryUpdatedAt || null,
                            Defects: []
                        };
                    }

                    if (record.DefectId) {
                        let defectImageUrls = [];
                        if (record.DefectImageUrls) {
                            try {
                                defectImageUrls = JSON.parse(record.DefectImageUrls);
                            } catch (e) {
                                defectImageUrls = [];
                            }
                        }
                        if (!Array.isArray(defectImageUrls)) {
                            defectImageUrls = [];
                        }

                        entriesBySlotId[record.SlotId][record.EntryId].Defects.push({
                            Id: record.DefectRowId,
                            DefectId: record.DefectId,
                            SoLuong: record.SoLuong,
                            SoLuongDatSauSua: record.SoLuongDatSauSua,
                            SoLuongKhongDatSauSua: record.SoLuongKhongDatSauSua,
                            GhiChu: record.DefectGhiChu || '',
                            SortOrder: record.DefectSortOrder || 0,
                            MaLoi: record.MaLoi,
                            TenLoi: record.TenLoi,
                            MoTa: record.MoTa,
                            DefectType: record.DefectType,
                            PhuongAnXuLy: record.PhuongAnXuLy,
                            ImageUrl: record.ImageUrl || null,
                            ImageUrls: defectImageUrls
                        });
                    }
                });

                const slots = slotRecords.map((slot) => ({
                    Id: slot.Id,
                    PhieuKiemId: slot.PhieuKiemId,
                    GioKiem: slot.GioKiem,
                    SortOrder: slot.SortOrder,
                    CreatedAt: slot.CreatedAt || null,
                    UpdatedAt: slot.UpdatedAt || null,
                    Entries: Object.values(entriesBySlotId[slot.Id] || {})
                        .sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0))
                        .map((entry) => ({
                            ...entry,
                            Defects: [...entry.Defects].sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0))
                        }))
                }));

                return res.json({
                    phieu,
                    slots,
                    summary,
                    dynamicFields,
                    xacNhans
                });
            }

            // 3. Mặc định cho các loại kiểm khác (1, 2, 3...)
            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, id)
                .execute('sp_PhieuKiem_GetDetail');

            const phieu = result.recordsets[0][0] || null;
            await attachProductImageToPhieu(pool, phieu);
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
                        MoTa: r.MoTa,
                        GhiChu: r.GhiChu,
                        SoLuong: r.SoLuong,
                        DefectType: r.DefectType,
                        ImageUrls: r.ImageUrls ? JSON.parse(r.ImageUrls) : []
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
            soLuong,
            Ngay_Giao,
            mucDoKiemTra,
            cuoiChuyenPlans
        } = req.body;
        const normalizedCuoiChuyenPlans = isCuoiChuyenLoaiKiem(loaiKiemId)
            ? normalizeCuoiChuyenPlans(cuoiChuyenPlans || [])
            : [];

        // Bắt buộc phải có 1 trong 2 loại source
        if (!sanPhamId || !loaiKiemId || !nguoiKiemId || !soLuong || (!sourceId && !sourceId_LCD)) {
            return res.status(400).json({
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        if (isCuoiChuyenLoaiKiem(loaiKiemId) && normalizedCuoiChuyenPlans.length === 0) {
            return res.status(400).json({
                message: 'Phiếu kiểm cuối chuyền cần ít nhất một kế hoạch sản xuất'
            });
        }

        try {
            const pool = await poolPromise;

            if (isCuoiChuyenLoaiKiem(loaiKiemId)) {
                const selectedPlanIds = normalizedCuoiChuyenPlans
                    .map((plan) => plan.idKeHoachSanXuat)
                    .filter((id) => Number(id) > 0);

                if (selectedPlanIds.length !== normalizedCuoiChuyenPlans.length) {
                    return res.status(400).json({ message: 'Kế hoạch cuối chuyền không hợp lệ' });
                }

                const duplicateResult = await pool.request()
                    .input('LoaiKiemId', sql.Int, loaiKiemId)
                    .input('PlanIdsJson', sql.NVarChar(sql.MAX), JSON.stringify(selectedPlanIds))
                    .query(`
                        IF OBJECT_ID(N'dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN', N'U') IS NOT NULL
                        BEGIN
                            SELECT TOP 1 p.ID_KeHoachSanXuat
                            FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN p
                            INNER JOIN dbo.PHIEU_KIEM pk ON pk.Id = p.PhieuKiemId
                            INNER JOIN OPENJSON(@PlanIdsJson) WITH (ID_KeHoachSanXuat INT '$') j
                                ON j.ID_KeHoachSanXuat = p.ID_KeHoachSanXuat
                            WHERE pk.LoaiKiemId = @LoaiKiemId;
                        END
                    `);

                if (duplicateResult.recordset?.length > 0) {
                    return res.status(409).json({
                        message: `Kế hoạch ${duplicateResult.recordset[0].ID_KeHoachSanXuat} đã được tạo phiếu kiểm cuối chuyền`
                    });
                }
            }

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
                .input('Ngay_Giao', sql.Date, Ngay_Giao || null)
                .input('MucDoKiemTra', sql.NVarChar, mucDoKiemTra || null)
                .execute('sp_PhieuKiem_Create');

            const newPhieuId = result.recordset[0].Id;
            const soPhieu = result.recordset[0].SoPhieu;

            if (isTrenChuyenLoaiKiem(loaiKiemId) && req.body.snapshotFields) {
                await upsertPhieuKiemCustomFields(pool, newPhieuId, req.body.snapshotFields);
            }

            if (isCuoiChuyenLoaiKiem(loaiKiemId)) {
                await pool.request()
                    .input('PhieuKiemId', sql.Int, newPhieuId)
                    .input('PlansJson', sql.NVarChar(sql.MAX), JSON.stringify(normalizedCuoiChuyenPlans))
                    .query(`
                        INSERT INTO dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN (
                            PhieuKiemId,
                            ID_KeHoachSanXuat,
                            SanPhamId,
                            MaSanPham,
                            TenSanPham,
                            TenDonVi,
                            TenBoPhan,
                            NgayKeHoach,
                            SoLuongKeHoach,
                            NangSuatDuKien,
                            DaSanXuat,
                            SortOrder
                        )
                        SELECT
                            @PhieuKiemId,
                            j.ID_KeHoachSanXuat,
                            j.SanPhamId,
                            NULLIF(LTRIM(RTRIM(j.MaSanPham)), ''),
                            NULLIF(LTRIM(RTRIM(j.TenSanPham)), ''),
                            NULLIF(LTRIM(RTRIM(j.TenDonVi)), ''),
                            NULLIF(LTRIM(RTRIM(j.TenBoPhan)), ''),
                            TRY_CONVERT(DATE, j.NgayKeHoach),
                            j.SoLuongKeHoach,
                            j.NangSuatDuKien,
                            j.DaSanXuat,
                            j.SortOrder
                        FROM OPENJSON(@PlansJson)
                        WITH (
                            ID_KeHoachSanXuat INT '$.idKeHoachSanXuat',
                            SanPhamId INT '$.sanPhamId',
                            MaSanPham NVARCHAR(100) '$.maSanPham',
                            TenSanPham NVARCHAR(255) '$.tenSanPham',
                            TenDonVi NVARCHAR(255) '$.tenDonVi',
                            TenBoPhan NVARCHAR(255) '$.tenBoPhan',
                            NgayKeHoach NVARCHAR(30) '$.ngayKeHoach',
                            SoLuongKeHoach INT '$.soLuongKeHoach',
                            NangSuatDuKien INT '$.nangSuatDuKien',
                            DaSanXuat INT '$.daSanXuat',
                            SortOrder INT '$.sortOrder'
                        ) j;
                    `);
            }

            // ---- LOGIC THÔNG BÁO ----
            const title = 'Bạn có phiếu kiểm mới! 📋';
            const message = `Tổ trưởng vừa phân công cho bạn phiếu kiểm ${soPhieu}.`;

            // A. Lưu vào Database (Bảng NOTIFICATIONS)
            await pool.request()
                .input('UserId', sql.Int, nguoiKiemId)
                .input('Title', sql.NVarChar, title)
                .input('Message', sql.NVarChar, message)
                .input('Type', sql.VarChar, 'NEW_PHIEU')
                .input('ReferenceId', sql.Int, newPhieuId)
                .query('INSERT INTO NOTIFICATIONS (UserId, Title, Message, Type, ReferenceId) VALUES (@UserId, @Title, @Message, @Type, @ReferenceId)');

            // B. Lấy Tokens và gửi Expo Push Notification
            const userTokensRes = await pool.request()
                .input('NguoiKiemId', sql.Int, nguoiKiemId)
                .query(`
                SELECT t.ExpoPushToken, 
                (SELECT COUNT(*) FROM NOTIFICATIONS WHERE UserId = @NguoiKiemId AND IsRead = 0) as UnreadCount
                FROM USER_PUSH_TOKENS t WHERE t.UserId = @NguoiKiemId
            `);

            const tokens = userTokensRes.recordset;
            if (tokens.length > 0) {
                const unreadCount = tokens[0].UnreadCount;
                let pushMessages = [];

                for (let row of tokens) {
                    if (Expo.isExpoPushToken(row.ExpoPushToken)) {
                        pushMessages.push({
                            to: row.ExpoPushToken,
                            sound: 'default',
                            title: title,
                            body: message,
                            badge: unreadCount,
                            data: { type: 'NEW_PHIEU', referenceId: newPhieuId },
                        });
                    }
                }

                let chunks = expo.chunkPushNotifications(pushMessages);
                for (let chunk of chunks) {
                    await expo.sendPushNotificationsAsync(chunk).catch(console.error);
                }
            }

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

router.post(
    '/tren-chuyen/save',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { phieuKiemId, slots } = req.body;
        const userId = req.user?.id || req.user?.userId;

        if (!phieuKiemId || !Array.isArray(slots)) {
            return res.status(400).json({ message: 'Thiếu dữ liệu lưu phiếu trên chuyền' });
        }

        try {
            const normalizedSlots = normalizeTrenChuyenSlots(slots);

            const pool = await poolPromise;
            await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userId)
                .input('SlotsJson', sql.NVarChar(sql.MAX), JSON.stringify(normalizedSlots))
                .execute('sp_PhieuKiem_TrenChuyen_SaveEntries');

            await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .query(`
                    UPDATE dbo.PHIEU_KIEM
                    SET TrangThai = CASE WHEN TrangThai = 'TAO_MOI' THEN 'DANG_KIEM' ELSE TrangThai END
                    WHERE Id = @PhieuKiemId;
                `);

            res.json({ success: true });
        } catch (err) {
            console.error('TrenChuyen save error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Lưu phiếu kiểm trên chuyền thất bại'
            });
        }
    }
);

router.post(
    '/cuoi-chuyen/save',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { phieuKiemId, plans } = req.body;
        const userId = req.user?.id || req.user?.userId;

        if (!phieuKiemId || !Array.isArray(plans)) {
            return res.status(400).json({ message: 'Thiếu dữ liệu lưu phiếu cuối chuyền' });
        }

        try {
            const normalizedPlans = normalizeCuoiChuyenPlans(plans);

            const pool = await poolPromise;
            await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userId)
                .input('PlansJson', sql.NVarChar(sql.MAX), JSON.stringify(normalizedPlans))
                .execute('sp_PhieuKiem_CuoiChuyen_SaveDefects');

            await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .query(`
                    UPDATE dbo.PHIEU_KIEM
                    SET TrangThai = CASE WHEN TrangThai = 'TAO_MOI' THEN 'DANG_KIEM' ELSE TrangThai END
                    WHERE Id = @PhieuKiemId;
                `);

            res.json({ success: true });
        } catch (err) {
            console.error('CuoiChuyen save error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Lưu phiếu kiểm cuối chuyền thất bại'
            });
        }
    }
);

router.post(
    '/cuoi-chuyen/complete',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { phieuKiemId, ketLuan } = req.body;
        const userId = req.user?.id || req.user?.userId;
        const boPhanId = req.user?.boPhanId;
        const completedByNameFallback = req.user?.fullName || req.user?.username || '';

        if (!phieuKiemId || !['DAT', 'KHONG_DAT'].includes(String(ketLuan || '').toUpperCase())) {
            return res.status(400).json({ message: 'Thiếu dữ liệu hoàn tất hoặc kết luận không hợp lệ' });
        }

        if (!boPhanId) {
            return res.status(400).json({ message: 'Không xác định được bộ phận duyệt của người hoàn tất phiếu' });
        }

        try {
            const pool = await poolPromise;
            const completedByName = await getUserDisplayName(pool, userId, completedByNameFallback);
            await upsertPhieuKiemCustomFields(pool, phieuKiemId, {
                [CUOI_CHUYEN_APPROVE_BOPHAN_FIELD]: String(boPhanId),
                [CUOI_CHUYEN_COMPLETED_BY_FIELD]: String(userId || ''),
                [CUOI_CHUYEN_COMPLETED_BY_NAME_FIELD]: completedByName
            });

            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('KetLuan', sql.NVarChar(20), String(ketLuan).toUpperCase())
                .input('UserId', sql.Int, userId)
                .execute('sp_PhieuKiem_CuoiChuyen_Complete');

            res.json({
                success: true,
                result: result.recordset?.[0] || null
            });
        } catch (err) {
            console.error('CuoiChuyen complete error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Hoàn tất phiếu kiểm cuối chuyền thất bại'
            });
        }
    }
);

router.post(
    '/cuoi-chuyen/approve',
    authenticateToken,
    authorize('PHAN_CONG_NGUOI_XU_LY'),
    async (req, res) => {
        const { phieuKiemId } = req.body;
        const userId = req.user?.id || req.user?.userId;
        const boPhanId = req.user?.boPhanId;
        const isAdmin = isAdminUser(req.user);

        if (!phieuKiemId) {
            return res.status(400).json({ message: 'Missing phieuKiemId' });
        }

        if (!boPhanId && !isAdmin) {
            return res.status(400).json({ message: 'Không xác định được bộ phận của người duyệt' });
        }

        try {
            const pool = await poolPromise;
            let effectiveBoPhanId = boPhanId;
            const approvalFieldsResult = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('ApproveFieldName', sql.NVarChar(100), CUOI_CHUYEN_APPROVE_BOPHAN_FIELD)
                .input('CompletedByFieldName', sql.NVarChar(100), CUOI_CHUYEN_COMPLETED_BY_FIELD)
                .query(`
                    SELECT FieldName, FieldValue
                    FROM dbo.PhieuKiem_CustomFields
                    WHERE PhieuKiemId = @PhieuKiemId
                      AND FieldName IN (@ApproveFieldName, @CompletedByFieldName)
                `);

            const approvalFields = Object.fromEntries(
                (approvalFieldsResult.recordset || []).map((field) => [field.FieldName, field.FieldValue])
            );
            const completedByUserId = Number(approvalFields[CUOI_CHUYEN_COMPLETED_BY_FIELD] || 0) || null;

            if (completedByUserId && Number(userId) === completedByUserId) {
                return res.status(403).json({ message: 'Người hoàn tất phiếu không được tự duyệt phiếu' });
            }

            if (isAdmin) {
                effectiveBoPhanId = Number(approvalFields[CUOI_CHUYEN_APPROVE_BOPHAN_FIELD] || 0) || null;
            }

            if (!effectiveBoPhanId) {
                return res.status(400).json({ message: 'Không xác định được bộ phận duyệt của phiếu' });
            }

            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userId)
                .input('BoPhanId', sql.Int, effectiveBoPhanId)
                .input('IsAdmin', sql.Bit, isAdmin ? 1 : 0)
                .execute('sp_PhieuKiem_CuoiChuyen_Approve');

            const approvedByName = await getUserDisplayName(pool, userId, req.user?.fullName || req.user?.username || '');
            await upsertPhieuKiemCustomFields(pool, phieuKiemId, {
                [CUOI_CHUYEN_APPROVED_BY_NAME_FIELD]: approvedByName
            });

            res.json({
                success: true,
                result: result.recordset?.[0] || null
            });
        } catch (err) {
            console.error('CuoiChuyen approve error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Duyệt phiếu kiểm cuối chuyền thất bại'
            });
        }
    }
);

router.post(
    '/cuoi-chuyen/create-bien-ban',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { phieuKiemId } = req.body;

        if (!phieuKiemId) {
            return res.status(400).json({ message: 'Missing phieuKiemId' });
        }

        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, req.user?.id || req.user?.userId)
                .execute('sp_PhieuKiem_CuoiChuyen_CreateBienBan');

            res.json({
                success: true,
                bienBanId: result.recordset?.[0]?.BienBanId || null
            });
        } catch (err) {
            console.error('CuoiChuyen create bien ban error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Sinh biên bản kiểm cuối chuyền thất bại'
            });
        }
    }
);

router.delete(
    '/tren-chuyen/entry/:entryId',
    authenticateToken,
    authorize(['THUC_HIEN_KIEM', 'PHAN_BO_KIEM', 'KET_LUAN']),
    async (req, res) => {
        const entryId = Number(req.params.entryId);
        const userId = req.user?.id || req.user?.userId;
        const userPermissions = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
        const canManageAll = canManageTrenChuyenAll(userPermissions);

        if (!Number.isInteger(entryId) || entryId <= 0) {
            return res.status(400).json({ message: 'EntryId không hợp lệ' });
        }

        try {
            const pool = await poolPromise;

            const entryInfo = await pool.request()
                .input('EntryId', sql.Int, entryId)
                .query(`
                    SELECT
                        e.Id,
                        e.NguoiGhiNhanId,
                        e.SlotId,
                        s.PhieuKiemId,
                        pk.TrangThai
                    FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY e
                    INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT s ON s.Id = e.SlotId
                    INNER JOIN dbo.PHIEU_KIEM pk ON pk.Id = s.PhieuKiemId
                    WHERE e.Id = @EntryId
                `);

            const entry = entryInfo.recordset?.[0];
            if (!entry) {
                return res.status(404).json({ message: 'Không tìm thấy công đoạn cần xóa' });
            }

            if (['HOAN_TAT', 'CHO_TBP_DUYET', 'CHO_KIEM_NGHIEM', 'CHO_XUONG_XAC_NHAN'].includes(entry.TrangThai)) {
                return res.status(409).json({ message: 'Phiếu đã khóa, không thể xóa công đoạn' });
            }

            if (!canManageAll && Number(entry.NguoiGhiNhanId) !== Number(userId)) {
                return res.status(403).json({ message: 'Bạn chỉ có thể xóa công đoạn do chính mình ghi nhận' });
            }

            await pool.request()
                .input('EntryId', sql.Int, entryId)
                .input('SlotId', sql.Int, entry.SlotId)
                .query(`
                    DELETE FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT
                    WHERE EntryId = @EntryId;

                    DELETE FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY
                    WHERE Id = @EntryId;

                    DELETE FROM dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT
                    WHERE Id = @SlotId
                      AND NOT EXISTS (
                        SELECT 1
                        FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY
                        WHERE SlotId = @SlotId
                      );
                `);

            res.json({ success: true });
        } catch (err) {
            console.error('TrenChuyen delete entry error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Xóa công đoạn thất bại'
            });
        }
    }
);

router.post(
    '/tren-chuyen/complete',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { phieuKiemId, ketLuan } = req.body;
        const userId = req.user?.id || req.user?.userId;
        const boPhanId = req.user?.boPhanId;
        const completedByName = req.user?.fullName || req.user?.username || '';

        if (!phieuKiemId || !['DAT', 'KHONG_DAT'].includes(String(ketLuan || '').toUpperCase())) {
            return res.status(400).json({ message: 'Thiếu dữ liệu hoàn tất hoặc kết luận không hợp lệ' });
        }

        if (!boPhanId) {
            return res.status(400).json({ message: 'Không xác định được bộ phận duyệt của người hoàn tất phiếu' });
        }

        try {
            const pool = await poolPromise;
            await upsertPhieuKiemCustomFields(pool, phieuKiemId, {
                [TREN_CHUYEN_APPROVE_BOPHAN_FIELD]: String(boPhanId),
                [TREN_CHUYEN_COMPLETED_BY_FIELD]: String(userId || ''),
                [TREN_CHUYEN_COMPLETED_BY_NAME_FIELD]: completedByName
            });

            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('KetLuan', sql.NVarChar(20), String(ketLuan).toUpperCase())
                .input('UserId', sql.Int, userId)
                .execute('sp_PhieuKiem_TrenChuyen_Complete');

            res.json({
                success: true,
                result: result.recordset?.[0] || null
            });
        } catch (err) {
            console.error('TrenChuyen complete error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Hoàn tất phiếu kiểm trên chuyền thất bại'
            });
        }
    }
);

router.post(
    '/tren-chuyen/approve',
    authenticateToken,
    authorize('PHAN_CONG_NGUOI_XU_LY'),
    async (req, res) => {
        const { phieuKiemId } = req.body;
        const userId = req.user?.id || req.user?.userId;
        const boPhanId = req.user?.boPhanId;
        const isAdmin = isAdminUser(req.user);

        if (!phieuKiemId) {
            return res.status(400).json({ message: 'Missing phieuKiemId' });
        }

        if (!boPhanId && !isAdmin) {
            return res.status(400).json({ message: 'Không xác định được bộ phận của người duyệt' });
        }

        try {
            const pool = await poolPromise;
            let effectiveBoPhanId = boPhanId;

            if (isAdmin) {
                const fieldResult = await pool.request()
                    .input('PhieuKiemId', sql.Int, phieuKiemId)
                    .input('FieldName', sql.NVarChar(100), TREN_CHUYEN_APPROVE_BOPHAN_FIELD)
                    .query(`
                        SELECT TOP 1 TRY_CAST(FieldValue AS INT) AS ApproveBoPhanId
                        FROM dbo.PhieuKiem_CustomFields
                        WHERE PhieuKiemId = @PhieuKiemId
                          AND FieldName = @FieldName
                    `);

                effectiveBoPhanId = fieldResult.recordset?.[0]?.ApproveBoPhanId || null;
            }

            if (!effectiveBoPhanId) {
                return res.status(400).json({ message: 'Không xác định được bộ phận duyệt của phiếu' });
            }

            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userId)
                .input('BoPhanId', sql.Int, effectiveBoPhanId)
                .input('IsAdmin', sql.Bit, isAdmin ? 1 : 0)
                .execute('sp_PhieuKiem_TrenChuyen_Approve');

            res.json({
                success: true,
                result: result.recordset?.[0] || null
            });
        } catch (err) {
            console.error('TrenChuyen approve error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Duyệt phiếu kiểm trên chuyền thất bại'
            });
        }
    }
);

router.post(
    '/tren-chuyen/create-bien-ban',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { phieuKiemId } = req.body;

        if (!phieuKiemId) {
            return res.status(400).json({ message: 'Missing phieuKiemId' });
        }

        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, req.user?.id || req.user?.userId)
                .execute('sp_PhieuKiem_TrenChuyen_CreateBienBan');

            res.json({
                success: true,
                bienBanId: result.recordset?.[0]?.BienBanId || null
            });
        } catch (err) {
            console.error('TrenChuyen create bien ban error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Sinh biên bản kiểm trên chuyền thất bại'
            });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/create-sxbt (Sản xuất bổ trợ)
========================================================= */
router.post(
    '/create-sxbt',
    authenticateToken,
    authorize('PHAN_BO_KIEM'),
    async (req, res) => {
        const {
            loaiKiemId,
            nguoiKiemId,
            sourceId,
            soLuong,
            doiTuong,
            mucDoKiemTra
        } = req.body;
        console.log(req.body);
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('LoaiKiemId', sql.Int, loaiKiemId)
                .input('NguoiKiemId', sql.Int, nguoiKiemId)
                .input('NguoiLapId', sql.Int, req.user.userId)
                .input('SourceId', sql.Int, sourceId)
                .input('SoLuong', sql.Int, soLuong)
                .input('DoiTuong', sql.NVarChar, doiTuong)
                .input('MucDoKiemTra', sql.NVarChar, mucDoKiemTra || null)
                .execute('sp_PhieuKiem_Create_SXBT');

            const newPhieuId = result.recordset[0].Id;
            const soPhieu = result.recordset[0].SoPhieu;

            // Gửi thông báo (Lưu vào DB)
            const title = 'Bạn có phiếu kiểm bổ trợ mới! 📋';
            const message = `Tổ trưởng vừa phân công cho bạn phiếu kiểm ${soPhieu}.`;

            await pool.request()
                .input('UserId', sql.Int, nguoiKiemId)
                .input('Title', sql.NVarChar, title)
                .input('Message', sql.NVarChar, message)
                .input('Type', sql.VarChar, 'NEW_PHIEU')
                .input('ReferenceId', sql.Int, newPhieuId)
                .query('INSERT INTO NOTIFICATIONS (UserId, Title, Message, Type, ReferenceId) VALUES (@UserId, @Title, @Message, @Type, @ReferenceId)');

            res.json({
                success: true,
                phieuKiemId: newPhieuId,
                soPhieu: soPhieu
            });
        } catch (err) {
            console.error('CreateSXBT error:', err);
            res.status(500).json({ message: 'Tạo phiếu kiểm bổ trợ thất bại' });
        }
    }
);

/* =========================================================
   GET /phieu-kiem/:id/btp-items (Lấy danh sách mặt hàng BTP)
========================================================= */
router.get(
    '/:id/btp-items',
    authenticateToken,
    async (req, res) => {
        try {
            const { id } = req.params;
            const pool = await poolPromise;
            const itemsResult = await pool.request()
                .input('PhieuKiemId', sql.Int, id)
                .query('SELECT * FROM PHIEU_KIEM_BTP_ITEM WHERE PhieuKiemId = @PhieuKiemId');
            const lotResult = await pool.request()
                .input('PhieuKiemId', sql.Int, id)
                .query(`
                    IF OBJECT_ID(N'dbo.PHIEU_KIEM_BTP_ITEM_LOT', N'U') IS NOT NULL
                    BEGIN
                        SELECT lot.*
                        FROM dbo.PHIEU_KIEM_BTP_ITEM_LOT lot
                        INNER JOIN dbo.PHIEU_KIEM_BTP_ITEM item ON item.Id = lot.BtpItemId
                        WHERE item.PhieuKiemId = @PhieuKiemId
                        ORDER BY lot.BtpItemId, lot.SortOrder, lot.Id
                    END
                    ELSE
                    BEGIN
                        SELECT TOP 0
                            CAST(NULL AS INT) AS Id,
                            CAST(NULL AS INT) AS BtpItemId,
                            CAST(NULL AS NVARCHAR(100)) AS DauTuanGS1,
                            CAST(NULL AS NVARCHAR(50)) AS ThuTu,
                            CAST(NULL AS NVARCHAR(100)) AS LxvtLot,
                            CAST(NULL AS NVARCHAR(100)) AS SoLotSX,
                            CAST(NULL AS DECIMAL(18,2)) AS SoLuongNhap,
                            CAST(NULL AS DECIMAL(18,2)) AS SoLuongKhoXacNhan,
                            CAST(NULL AS INT) AS KhoXacNhanBy,
                            CAST(NULL AS DATETIME2) AS KhoXacNhanAt,
                            CAST(NULL AS INT) AS SortOrder
                    END
                `);
            res.json(attachBtpLotRows(itemsResult.recordset, lotResult.recordset));
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Lỗi lấy chi tiết mặt hàng BTP' });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/sxbt-save (Lưu toàn bộ Phiếu Kiểm SXBT)
========================================================= */
router.post(
    '/sxbt-save',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        try {
            const {
                phieuKiemId,
                dynamicFields,
                btpItems,
                summary,
                defects
            } = req.body;

            if (!phieuKiemId) {
                return res.status(400).json({ message: 'Thiếu phieuKiemId' });
            }

            const pool = await poolPromise;
            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('DynamicFieldsJson', sql.NVarChar(sql.MAX), dynamicFields ? JSON.stringify(dynamicFields) : null)
                .input('BtpItemsJson', sql.NVarChar(sql.MAX), null)
                .input('SummaryJson', sql.NVarChar(sql.MAX), summary ? JSON.stringify(summary) : null)
                .input('DefectsJson', sql.NVarChar(sql.MAX), defects ? JSON.stringify(defects) : null)
                .input('KetLuan', sql.NVarChar(50), null)
                .execute('sp_PhieuKiem_SXBT_Save');

            if (Array.isArray(btpItems) && btpItems.length > 0) {
                await pool.request()
                    .input('PhieuKiemId', sql.Int, phieuKiemId)
                    .input('BtpItemsJson', sql.NVarChar(sql.MAX), JSON.stringify(btpItems))
                    .query(`
                        IF @BtpItemsJson IS NOT NULL AND @BtpItemsJson != N'[]'
                        BEGIN
                            IF OBJECT_ID('tempdb..#ManualBtpItems') IS NOT NULL DROP TABLE #ManualBtpItems;
                            IF OBJECT_ID('tempdb..#ManualLotRows') IS NOT NULL DROP TABLE #ManualLotRows;

                            SELECT
                                Id,
                                LotRows
                            INTO #ManualBtpItems
                            FROM OPENJSON(@BtpItemsJson)
                            WITH (
                                Id INT '$.Id',
                                LotRows NVARCHAR(MAX) '$.LotRows' AS JSON
                            );

                            SELECT
                                item.Id AS BtpItemId,
                                lot.Id AS LotRowId,
                                lot.DauTuanGS1,
                                lot.ThuTu,
                                lot.LxvtLot,
                                COALESCE(lot.SortOrder, TRY_CONVERT(INT, lotJson.[key]) + 1) AS SortOrder
                            INTO #ManualLotRows
                            FROM #ManualBtpItems item
                            CROSS APPLY OPENJSON(item.LotRows) lotJson
                            CROSS APPLY OPENJSON(lotJson.value)
                            WITH (
                                Id INT '$.Id',
                                DauTuanGS1 NVARCHAR(100) '$.DauTuanGS1',
                                ThuTu NVARCHAR(50) '$.ThuTu',
                                LxvtLot NVARCHAR(100) '$.LxvtLot',
                                SortOrder INT '$.SortOrder'
                            ) AS lot
                            WHERE item.LotRows IS NOT NULL
                              AND lot.Id IS NOT NULL;

                            UPDATE lot
                            SET
                                lot.DauTuanGS1 = NULLIF(LTRIM(RTRIM(src.DauTuanGS1)), N''),
                                lot.ThuTu = NULLIF(LTRIM(RTRIM(src.ThuTu)), N''),
                                lot.LxvtLot = NULLIF(LTRIM(RTRIM(src.LxvtLot)), N'')
                            FROM dbo.PHIEU_KIEM_BTP_ITEM_LOT lot
                            INNER JOIN dbo.PHIEU_KIEM_BTP_ITEM item ON item.Id = lot.BtpItemId
                            INNER JOIN #ManualLotRows src ON src.LotRowId = lot.Id
                            WHERE item.PhieuKiemId = @PhieuKiemId
                              AND item.Id = src.BtpItemId
                              AND EXISTS (
                                  SELECT 1
                                  FROM dbo.PHIEU_KIEM pk
                                  WHERE pk.Id = @PhieuKiemId
                                    AND pk.TrangThai NOT IN (N'HOAN_THANH', N'HOAN_TAT', N'CHO_SXBT_XAC_NHAN', N'CHO_KHO_XAC_NHAN')
                              );

                            ;WITH first_lot AS (
                                SELECT
                                    lot.BtpItemId,
                                    lot.DauTuanGS1,
                                    lot.ThuTu,
                                    lot.LxvtLot,
                                    ROW_NUMBER() OVER (PARTITION BY lot.BtpItemId ORDER BY lot.SortOrder, lot.Id) AS rn
                                FROM dbo.PHIEU_KIEM_BTP_ITEM_LOT lot
                                INNER JOIN dbo.PHIEU_KIEM_BTP_ITEM item ON item.Id = lot.BtpItemId
                                WHERE item.PhieuKiemId = @PhieuKiemId
                            )
                            UPDATE item
                            SET
                                item.DauTuanGS1 = first_lot.DauTuanGS1,
                                item.ThuTu = first_lot.ThuTu,
                                item.LxvtLot = first_lot.LxvtLot
                            FROM dbo.PHIEU_KIEM_BTP_ITEM item
                            LEFT JOIN first_lot ON first_lot.BtpItemId = item.Id AND first_lot.rn = 1
                            WHERE item.PhieuKiemId = @PhieuKiemId;
                        END
                    `);
            }

            res.json({
                success: true,
                message: result.recordset && result.recordset.length > 0 ? result.recordset[0].Message : 'Lưu thành công'
            });

        } catch (err) {
            console.error('SXBT Save error:', err);
            res.status(500).json({ message: 'Lỗi lưu dữ liệu Sản Xuất Bổ Trợ' });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/sxbt/confirm-sxbt (legacy/dự phòng, tạm ẩn khỏi UI)
========================================================= */
router.post(
    '/sxbt/confirm-sxbt',
    authenticateToken,
    authorize('XAC_NHAN_SXBT'),
    async (req, res) => {
        const { phieuKiemId } = req.body;
        const userId = req.user.userId;

        if (!phieuKiemId) {
            return res.status(400).json({ message: 'Thiếu phieuKiemId' });
        }

        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userId)
                .execute('sp_PhieuKiem_SXBT_ConfirmSXBT');

            res.json({
                success: true,
                message: result.recordset?.[0]?.Message || 'SXBT đã xác nhận phiếu thành công'
            });
        } catch (err) {
            console.error('SXBT Confirm SXBT error:', err);
            res.status(500).json({ message: err.message || 'Không thể xác nhận SXBT' });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/sxbt/confirm-kho (Kho xác nhận số lượng)
========================================================= */
router.post(
    '/sxbt/confirm-kho',
    authenticateToken,
    authorize('XAC_NHAN_KHO_SXBT'),
    async (req, res) => {
        const { phieuKiemId, lotRows } = req.body;
        const userId = req.user.userId;

        if (!phieuKiemId || !Array.isArray(lotRows)) {
            return res.status(400).json({ message: 'Thiếu phieuKiemId hoặc lotRows' });
        }

        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userId)
                .input('LotRowsJson', sql.NVarChar(sql.MAX), JSON.stringify(lotRows))
                .execute('sp_PhieuKiem_SXBT_ConfirmKho');

            res.json({
                success: true,
                message: result.recordset?.[0]?.Message || 'Kho đã xác nhận số lượng nhập. Phiếu SXBT đã hoàn thành.'
            });
        } catch (err) {
            console.error('SXBT Confirm Kho error:', err);
            res.status(500).json({ message: err.message || 'Không thể xác nhận Kho' });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/sxbt-sync-btp-source (sync số lượng về nguồn)
========================================================= */
router.post(
    '/sxbt-sync-btp-source',
    authenticateToken,
    authorize('QUAN_TRI_DM'),
    async (req, res) => {
        const { phieuKiemId } = req.body;

        if (!phieuKiemId) {
            return res.status(400).json({ message: 'Thiếu phieuKiemId' });
        }

        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .execute('sp_PhieuKiem_SXBT_SyncKhoQuantityToSource');

            res.json({
                success: true,
                message: result.recordset?.[0]?.Message || 'Đã đồng bộ số lượng Kho xác nhận về phiếu nhập BTP'
            });
        } catch (err) {
            console.error('SXBT Sync BTP Source error:', err);
            res.status(500).json({ message: err.message || 'Không thể đồng bộ số lượng về phiếu nhập BTP' });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/sxbt-complete (Hoàn tất phiếu SXBT)
========================================================= */
router.post(
    '/sxbt-complete',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { phieuKiemId, ketLuan } = req.body;
        const userId = req.user.userId;

        if (!phieuKiemId || !ketLuan) {
            return res.status(400).json({ message: 'Thiếu phieuKiemId hoặc ketLuan' });
        }

        try {
            const pool = await poolPromise;
            await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('KetLuan', sql.NVarChar(50), ketLuan)
                .input('UserId', sql.Int, userId)
                .execute('sp_PhieuKiem_SXBT_Complete');

            res.json({ success: true, message: 'Hoàn tất phiếu kiểm SXBT thành công. Chờ Kho xác nhận số lượng.' });

        } catch (err) {
            console.error('SXBT Complete error:', err);
            res.status(500).json({ message: 'Hoàn tất phiếu kiểm SXBT thất bại' });
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
    authorize("THUC_HIEN_KIEM"),
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
            table.columns.add("InspectionLevel", sql.NVarChar(100));

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
            fs.appendFileSync('error_log.txt', `\n--- ${new Date().toISOString()} ---\n${err.stack}\n${JSON.stringify(err, null, 2)}\n`);

            res.status(500).json({
                message: "Tạo section thất bại",
                error: err.message,
                sqlError: err.originalError?.message
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
            .input('InspectionLevel', sql.NVarChar(100), inspectionLevel)
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
        const { checkItemId, ketQua, defects = [], giaTriDo, diemTrongYeu } = req.body;

        try {
            const pool = await poolPromise;

            // --- BƯỚC 1: DỌN RÁC FILE ẢNH VẬT LÝ ---
            // Lấy danh sách ảnh cũ hiện đang lưu trong DB
            const oldDefectsRes = await pool.request()
                .input("CheckItemId", sql.Int, checkItemId)
                .query("SELECT ImageUrls FROM PHIEU_KIEM_DEFECT WHERE CheckItemId = @CheckItemId");

            let oldUrls = [];
            oldDefectsRes.recordset.forEach(row => {
                if (row.ImageUrls) {
                    try {
                        const parsedUrls = JSON.parse(row.ImageUrls);
                        oldUrls = [...oldUrls, ...parsedUrls];
                    } catch (e) { }
                }
            });

            // Lấy danh sách ảnh mà Mobile vừa gửi lên (chứa ảnh cũ được giữ lại + ảnh mới)
            let incomingUrls = [];
            defects.forEach(d => {
                if (d.imageUrls && Array.isArray(d.imageUrls)) {
                    incomingUrls = [...incomingUrls, ...d.imageUrls];
                }
            });

            // Tìm những ảnh cũ KHÔNG CÒN nằm trong danh sách gửi lên (nghĩa là user đã bấm xoá trên App)
            const urlsToDelete = oldUrls.filter(url => !incomingUrls.includes(url));

            const currentResult = await pool.request()
                .input("CheckItemId", sql.Int, checkItemId)
                .query(`
                    SELECT
                        pci.DanhMucCheckItemId,
                        pci.DiemTrongYeu,
                        pk.TrangThai,
                        lk.MaLoai
                    FROM dbo.PHIEU_KIEM_CHECK_ITEM pci
                    JOIN dbo.PHIEU_KIEM_SECTION sectionRow ON sectionRow.Id = pci.SectionId
                    JOIN dbo.PHIEU_KIEM pk ON pk.Id = sectionRow.PhieuKiemId
                    JOIN dbo.DM_LOAI_KIEM lk ON lk.Id = pk.LoaiKiemId
                    WHERE pci.Id = @CheckItemId
                `);

            const currentItem = currentResult.recordset?.[0];
            if (!currentItem) {
                return res.status(404).json({ message: "Không tìm thấy mục kiểm của phiếu" });
            }

            const shouldUpdateCritical = typeof diemTrongYeu === "boolean";
            const maLoai = String(currentItem.MaLoai || "").trim().toUpperCase();

            if (shouldUpdateCritical && !["DAU_VAO", "KIEM_DONG_CONT"].includes(maLoai)) {
                return res.status(400).json({
                    message: "Điểm trọng yếu chỉ áp dụng cho kiểm đầu vào và kiểm cuối đóng cont"
                });
            }

            if (shouldUpdateCritical && !["DA_TAO_SECTION", "DANG_KIEM"].includes(currentItem.TrangThai)) {
                return res.status(409).json({
                    message: "Chỉ được thay đổi điểm trọng yếu khi phiếu đang kiểm"
                });
            }

            if (shouldUpdateCritical && !currentItem.DanhMucCheckItemId) {
                return res.status(409).json({
                    message: "Mục kiểm chưa liên kết được với danh mục; vui lòng liên hệ quản trị để đối chiếu dữ liệu"
                });
            }

            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                await transaction.request()
                    .input("CheckItemId", sql.Int, checkItemId)
                    .input("KetQua", sql.NVarChar, ketQua)
                    .input("Defects", sql.NVarChar(sql.MAX), JSON.stringify(defects))
                    .input("GiaTriDo", sql.NVarChar(sql.MAX), giaTriDo)
                    .execute("sp_PhieuKiem_SaveCheckItem1");

                if (shouldUpdateCritical) {
                    await transaction.request()
                        .input("DanhMucCheckItemId", sql.Int, currentItem.DanhMucCheckItemId)
                        .input("DiemTrongYeu", sql.Bit, diemTrongYeu)
                        .query(`
                            UPDATE dbo.DM_CHECK_ITEM
                            SET DiemTrongYeu = @DiemTrongYeu
                            WHERE Id = @DanhMucCheckItemId;

                            UPDATE dbo.PHIEU_KIEM_CHECK_ITEM
                            SET DiemTrongYeu = @DiemTrongYeu
                            WHERE DanhMucCheckItemId = @DanhMucCheckItemId;
                        `);
                }

                await transaction.commit();
            } catch (transactionError) {
                await transaction.rollback();
                throw transactionError;
            }

            // Chỉ xoá file vật lý sau khi transaction lưu dữ liệu đã thành công.
            urlsToDelete.forEach(fileUrl => {
                try {
                    const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
                    const filePath = path.join(__dirname, '..', relativePath);

                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`Đã xoá file rác: ${filePath}`);
                    }
                } catch (unlinkError) {
                    console.error(`Lỗi khi xoá file ${fileUrl}:`, unlinkError);
                }
            });

            res.json({ success: true });

        } catch (err) {
            console.error('CheckItem save error:', err);
            res.status(500).json({
                message: "Lưu thất bại",
                error: err.message
            });
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

            // Tự động cho các mục "Chưa kiểm" (KetQua IS NULL) thành "ĐẠT"
            await pool.request()
                .input("SectionId", sql.Int, sectionId)
                .query(`
                    UPDATE PHIEU_KIEM_CHECK_ITEM
                    SET KetQua = 'DAT'
                    WHERE SectionId = @SectionId AND KetQua IS NULL
                `);

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
                message: 'Trưởng bộ phận đã xác nhận'
            });

        } catch (err) {

            console.error('XacNhanPX error:', err);

            res.status(500).json({
                message: 'Xác nhận trưởng bộ phận thất bại'
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

/* =========================================================
   GET /phieu-kiem/:id/thong-so-kq
========================================================= */
router.get('/:id/thong-so-kq', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('PhieuKiemId', sql.Int, req.params.id)
            .execute('sp_PhieuKiem_ThongSo_GetResults');

        // result.recordsets[0] = Cấu hình thông số
        // result.recordsets[1] = Kết quả đã nhập
        res.json({
            thongSo: result.recordsets[0],
            ketQua: result.recordsets[1]
        });
    } catch (err) {
        console.error("Get thong-so-kq error:", err);
        res.status(500).json({ message: "Lỗi tải kết quả kiểm đặc biệt" });
    }
});

/* =========================================================
   POST /phieu-kiem/:id/thong-so-kq
========================================================= */
router.post('/:id/thong-so-kq', authenticateToken, authorize('THUC_HIEN_KIEM'), async (req, res) => {
    const phieuKiemId = req.params.id;
    const { results } = req.body; // Array of { ThongSoId, ThuTuMau, GiaTriDo, GhiChu }

    if (!Array.isArray(results)) {
        return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = new sql.Request(transaction);

            for (const item of results) {
                await request
                    .input('PhieuKiemId', sql.Int, phieuKiemId)
                    .input('ThongSoId', sql.Int, item.ThongSoId)
                    .input('ThuTuMau', sql.Int, item.ThuTuMau)
                    .input('GiaTriDo', sql.Float, item.GiaTriDo !== '' ? item.GiaTriDo : null)
                    .input('GhiChu', sql.NVarChar(255), item.GhiChu || null)
                    .execute('sp_PhieuKiem_ThongSo_SaveResult');

                // Clear parameters for next iteration
                request.parameters = {};
            }

            await transaction.commit();
            res.json({ success: true, message: "Đã lưu kết quả đo đạc thành công" });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error("Save thong-so-kq error:", err);
        res.status(500).json({ message: "Lỗi lưu kết quả kiểm đặc biệt" });
    }
});

module.exports = router;
