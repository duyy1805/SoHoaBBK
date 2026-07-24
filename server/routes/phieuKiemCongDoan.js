const express = require('express');
const sql = require('mssql');
const { poolPromise } = require('../db');
const authenticateToken = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');

const router = express.Router();
const OPEN_STATES = new Set(['TAO_MOI', 'DANG_KIEM', 'CHUA_KIEM']);

const userIdOf = (req) => Number(req.user?.userId || req.user?.id || 0);
const isAdmin = (user = {}) =>
    (user.permissions || []).includes('QUAN_TRI_DM')
    || (user.roles || []).some((role) => String(role || '').toUpperCase().includes('ADMIN'));
const canManageAll = (user = {}) =>
    isAdmin(user) || (user.permissions || []).some((permission) =>
        ['PHAN_BO_KIEM', 'KET_LUAN', 'PHAN_CONG_NGUOI_XU_LY'].includes(permission)
    );
const errorMessage = (error, fallback) =>
    error?.originalError?.info?.message || error?.message || fallback;
const statusForError = (error) => {
    const message = errorMessage(error, '');
    const number = Number(error?.number || error?.originalError?.info?.number || 0);
    return [2601, 2627].includes(number)
        || /đã thay đổi|đã có|xung đột|conflict|duplicate|unique/i.test(message)
        ? 409
        : 400;
};
const encodeRows = (value) => {
    if (Buffer.isBuffer(value)) return value.toString('base64');
    if (Array.isArray(value)) return value.map(encodeRows);
    if (value && typeof value === 'object' && !(value instanceof Date)) {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeRows(item)]));
    }
    return value;
};
const rowVersionBuffer = (value) => {
    if (!value || typeof value !== 'string') return null;
    const buffer = Buffer.from(value, 'base64');
    return buffer.length === 8 ? buffer : null;
};
const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
const dateKey = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const normalizeText = (value) => String(value || '').trim().toLocaleLowerCase('vi');
const filterPlansForHeader = (plans, header) => (plans || []).filter((plan) =>
    dateKey(plan.Ngay) === dateKey(header.NgayKiem)
    && normalizeText(plan.Ten_DonVi) === normalizeText(header.PhanXuong)
);
const normalizePhieuDates = (phieu) => phieu ? {
    ...phieu,
    NgayKiem: dateKey(phieu.NgayKiem)
} : phieu;
const normalizePlanDates = (plan) => ({
    ...plan,
    Ngay: plan.Ngay ? dateKey(plan.Ngay) : plan.Ngay,
    NgayKeHoach: plan.NgayKeHoach ? dateKey(plan.NgayKeHoach) : plan.NgayKeHoach
});

router.use(authenticateToken);

router.get(
    '/plans',
    authorize(['THUC_HIEN_KIEM', 'XEM_PHIEU_KIEM']),
    async (req, res) => {
        const phieuKiemId = Number(req.query.phieuKiemId);
        if (!isDate(req.query.date) || !Number.isInteger(phieuKiemId) || phieuKiemId <= 0) {
            return res.status(400).json({ message: 'Ngày kế hoạch hoặc phiếu công đoạn không hợp lệ' });
        }
        try {
            const pool = await poolPromise;
            const headerResult = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .query(`
                    SELECT NgayKiem, PhanXuong
                    FROM dbo.PHIEU_KIEM_CONG_DOAN_HEADER
                    WHERE PhieuKiemId = @PhieuKiemId
                `);
            const header = headerResult.recordset[0];
            if (!header) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu công đoạn' });
            }
            const requestedDate = String(req.query.date);
            const headerDate = dateKey(header.NgayKiem);
            if (requestedDate !== headerDate) {
                return res.status(400).json({ message: 'Ngày kế hoạch không khớp ngày kiểm của phiếu' });
            }
            const result = await pool.request()
                .execute('sp_KeHoachSanXuat_GetList_ChuaKiem_TrenChuyen');
            res.json(filterPlansForHeader(result.recordset, header).map(normalizePlanDates));
        } catch (error) {
            console.error('CongDoan plans error:', error);
            res.status(500).json({ message: errorMessage(error, 'Không tải được kế hoạch sản xuất') });
        }
    }
);

router.get(
    '/',
    authorize(['THUC_HIEN_KIEM', 'XEM_PHIEU_KIEM']),
    async (req, res) => {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('FromDate', sql.Date, isDate(req.query.fromDate) ? req.query.fromDate : null)
                .input('ToDate', sql.Date, isDate(req.query.toDate) ? req.query.toDate : null)
                .execute('sp_PhieuKiem_CongDoan_GetList');
            res.json(encodeRows(result.recordset.map(normalizePhieuDates)));
        } catch (error) {
            console.error('CongDoan list error:', error);
            res.status(500).json({ message: errorMessage(error, 'Không tải được danh sách phiếu công đoạn') });
        }
    }
);

router.post(
    '/',
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { ngayKiem, toMay, phanXuongId } = req.body || {};
        if (!isDate(ngayKiem) || !Number(phanXuongId)) {
            return res.status(400).json({ message: 'Ngày kiểm và bộ phận sản xuất là bắt buộc' });
        }
        try {
            const pool = await poolPromise;
            const departmentResult = await pool.request().execute('sp_DM_BoPhan_Get');
            const department = (departmentResult.recordset || []).find((item) =>
                Number(item.Id || item.ID_BoPhan) === Number(phanXuongId)
            );
            if (!department) {
                return res.status(400).json({ message: 'Bộ phận sản xuất không hợp lệ' });
            }
            const phanXuong = department.TenBoPhan
                || department.Ten_BoPhan
                || department.TenBoPhanDayDu
                || null;
            const result = await pool.request()
                .input('NgayKiem', sql.Date, ngayKiem)
                .input('PhanXuong', sql.NVarChar(255), phanXuong)
                .input('ToMay', sql.NVarChar(255), String(toMay || '').trim() || null)
                .input('BoPhanDuyetId', sql.Int, Number(phanXuongId))
                .input('UserId', sql.Int, userIdOf(req))
                .execute('sp_PhieuKiem_CongDoan_Create');
            res.status(201).json({ success: true, ...result.recordset[0] });
        } catch (error) {
            console.error('CongDoan create error:', error);
            res.status(statusForError(error)).json({ message: errorMessage(error, 'Không tạo được phiếu công đoạn') });
        }
    }
);

router.get(
    '/:id',
    authorize(['THUC_HIEN_KIEM', 'XEM_PHIEU_KIEM']),
    async (req, res) => {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, Number(req.params.id))
                .execute('sp_PhieuKiem_CongDoan_GetDetail');
            const phieu = result.recordsets[0]?.[0];
            if (!phieu) return res.status(404).json({ message: 'Không tìm thấy phiếu công đoạn' });

            const defectsByPlan = (result.recordsets[2] || []).reduce((map, defect) => {
                if (!map[defect.PlanId]) map[defect.PlanId] = [];
                map[defect.PlanId].push(defect);
                return map;
            }, {});
            const plans = (result.recordsets[1] || [])
                .map((plan) => ({
                    ...normalizePlanDates(plan),
                    Defects: defectsByPlan[plan.Id] || []
                }))
                .sort((left, right) =>
                    Number(left.ID_KeHoachSanXuat) - Number(right.ID_KeHoachSanXuat)
                    || Number(left.Id) - Number(right.Id)
                );
            res.json(encodeRows({
                phieu: normalizePhieuDates(phieu),
                plans,
                xacNhans: result.recordsets[3] || [],
                readOnly: !OPEN_STATES.has(phieu.TrangThai)
            }));
        } catch (error) {
            console.error('CongDoan detail error:', error);
            res.status(500).json({ message: errorMessage(error, 'Không tải được phiếu công đoạn') });
        }
    }
);

router.post(
    '/:id/plans',
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const phieuKiemId = Number(req.params.id);
        const sourceId = Number(req.body?.idKeHoachSanXuat);
        try {
            const pool = await poolPromise;
            const header = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .query('SELECT NgayKiem, PhanXuong FROM dbo.PHIEU_KIEM_CONG_DOAN_HEADER WHERE PhieuKiemId = @PhieuKiemId');
            if (!header.recordset[0]) return res.status(404).json({ message: 'Không tìm thấy phiếu công đoạn' });

            const available = await pool.request()
                .execute('sp_KeHoachSanXuat_GetList_ChuaKiem_TrenChuyen');
            const plan = (available.recordset || [])
                .find((item) =>
                    Number(item.ID_KeHoachSanXuat) === sourceId
                    && normalizeText(item.Ten_DonVi) === normalizeText(header.recordset[0].PhanXuong)
                );
            if (!plan) {
                return res.status(400).json({
                    message: 'Kế hoạch không còn trong danh sách hiện tại hoặc không thuộc phân xưởng của phiếu'
                });
            }

            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('ID_KeHoachSanXuat', sql.Int, sourceId)
                .input('SanPhamId', sql.Int, plan.SanPhamId || null)
                .input('MaSanPham', sql.NVarChar(100), plan.MaSanPham || plan.ItemCode || null)
                .input('TenSanPham', sql.NVarChar(255), plan.TenSanPham || null)
                .input('TenDonVi', sql.NVarChar(255), plan.Ten_DonVi || null)
                .input('TenBoPhan', sql.NVarChar(255), plan.Ten_BoPhan || null)
                .input('NgayKeHoach', sql.Date, plan.Ngay || null)
                .input('SoLuongKeHoach', sql.Int, Number(plan.SoLuongKeHoach || 0))
                .input('UserId', sql.Int, userIdOf(req))
                .execute('sp_PhieuKiem_CongDoan_AddPlan');
            const insertedPlan = result.recordset[0];
            const processColumnResult = await pool.request().query(`
                SELECT COL_LENGTH(
                    N'dbo.PHIEU_KIEM_CONG_DOAN_PLAN',
                    N'TenQuyTrinhSanXuat'
                ) AS ColumnLength
            `);
            if (insertedPlan?.Id) {
                const hasProcessColumn = Boolean(processColumnResult.recordset[0]?.ColumnLength);
                const snapshotRequest = pool.request()
                    .input('PlanId', sql.Int, insertedPlan.Id)
                    .input('MaDonHang', sql.NVarChar(200), plan.Ma_DonHang || plan.MaDonHang || null);
                if (hasProcessColumn) {
                    snapshotRequest.input(
                        'TenQuyTrinhSanXuat',
                        sql.NVarChar(255),
                        plan.Ten_QuyTrinhSanXuat || null
                    );
                }
                const snapshotResult = await snapshotRequest.query(`
                        UPDATE dbo.PHIEU_KIEM_CONG_DOAN_PLAN
                        SET MaDonHang = @MaDonHang
                            ${hasProcessColumn ? ', TenQuyTrinhSanXuat = @TenQuyTrinhSanXuat' : ''}
                        WHERE Id = @PlanId;

                        SELECT *
                        FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN
                        WHERE Id = @PlanId;
                    `);
                return res.status(201).json(encodeRows(snapshotResult.recordset[0]));
            }
            res.status(201).json(encodeRows(insertedPlan));
        } catch (error) {
            console.error('CongDoan add plan error:', error);
            res.status(statusForError(error)).json({ message: errorMessage(error, 'Không thêm được kế hoạch') });
        }
    }
);

router.put(
    '/:id/plans/:planId',
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const rowVersion = rowVersionBuffer(req.body?.rowVersion);
        if (!rowVersion) return res.status(400).json({ message: 'RowVersion không hợp lệ' });
        const soLoiBuiBan = Number(req.body?.soLoiBuiBan || 0);
        const soLoiConTrung = Number(req.body?.soLoiConTrung || 0);
        if (!Number.isInteger(soLoiBuiBan) || soLoiBuiBan < 0
            || !Number.isInteger(soLoiConTrung) || soLoiConTrung < 0) {
            return res.status(400).json({ message: 'Số lỗi bụi bẩn và côn trùng phải là số nguyên không âm' });
        }
        try {
            const pool = await poolPromise;
            const currentPlanResult = await pool.request()
                .input('PhieuKiemId', sql.Int, Number(req.params.id))
                .input('PlanId', sql.Int, Number(req.params.planId))
                .query(`
                    SELECT MaDonHang
                    FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN
                    WHERE Id = @PlanId AND PhieuKiemId = @PhieuKiemId
                `);
            if (!currentPlanResult.recordset[0]) {
                return res.status(404).json({ message: 'Không tìm thấy kế hoạch trong phiếu' });
            }
            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, Number(req.params.id))
                .input('PlanId', sql.Int, Number(req.params.planId))
                .input('MaDonHang', sql.NVarChar(200), currentPlanResult.recordset[0].MaDonHang || null)
                .input('Lot', sql.NVarChar(200), req.body.lot || null)
                .input('LenhXuatVatTu', sql.NVarChar(200), req.body.lenhXuatVatTu || null)
                .input('GhiChu', sql.NVarChar(sql.MAX), req.body.ghiChu || null)
                .input('SoLoiBuiBan', sql.Int, soLoiBuiBan)
                .input('SoLoiConTrung', sql.Int, soLoiConTrung)
                .input('RowVersion', sql.VarBinary(8), rowVersion)
                .input('UserId', sql.Int, userIdOf(req))
                .execute('sp_PhieuKiem_CongDoan_UpdatePlan');
            res.json(encodeRows(result.recordset[0]));
        } catch (error) {
            console.error('CongDoan update plan error:', error);
            res.status(statusForError(error)).json({ message: errorMessage(error, 'Không cập nhật được kế hoạch') });
        }
    }
);

router.put(
    '/:id/plans/:planId/defects',
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const rowVersion = rowVersionBuffer(req.body?.rowVersion);
        const defects = Array.isArray(req.body?.defects) ? req.body.defects : null;
        if (!rowVersion || !defects) return res.status(400).json({ message: 'Dữ liệu lỗi hoặc RowVersion không hợp lệ' });
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, Number(req.params.id))
                .input('PlanId', sql.Int, Number(req.params.planId))
                .input('DefectsJson', sql.NVarChar(sql.MAX), JSON.stringify(defects))
                .input('RowVersion', sql.VarBinary(8), rowVersion)
                .input('UserId', sql.Int, userIdOf(req))
                .execute('sp_PhieuKiem_CongDoan_SaveDefects');
            res.json(encodeRows(result.recordset[0]));
        } catch (error) {
            console.error('CongDoan save defects error:', error);
            res.status(statusForError(error)).json({ message: errorMessage(error, 'Không lưu được lỗi công đoạn') });
        }
    }
);

router.delete(
    '/:id/plans/:planId',
    authorize(['THUC_HIEN_KIEM', 'PHAN_BO_KIEM', 'KET_LUAN']),
    async (req, res) => {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input('PhieuKiemId', sql.Int, Number(req.params.id))
                .input('PlanId', sql.Int, Number(req.params.planId))
                .input('UserId', sql.Int, userIdOf(req))
                .input('CanManageAll', sql.Bit, canManageAll(req.user) ? 1 : 0)
                .execute('sp_PhieuKiem_CongDoan_DeletePlan');
            res.json({ success: true });
        } catch (error) {
            console.error('CongDoan delete plan error:', error);
            res.status(statusForError(error)).json({ message: errorMessage(error, 'Không xóa được kế hoạch') });
        }
    }
);

router.post(
    '/:id/complete',
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input('PhieuKiemId', sql.Int, Number(req.params.id))
                .input('KetLuan', sql.NVarChar(20), String(req.body?.ketLuan || '').toUpperCase())
                .input('UserId', sql.Int, userIdOf(req))
                .execute('sp_PhieuKiem_CongDoan_Complete');
            res.json({ success: true });
        } catch (error) {
            console.error('CongDoan complete error:', error);
            res.status(statusForError(error)).json({ message: errorMessage(error, 'Không hoàn tất được phiếu') });
        }
    }
);

router.post(
    '/:id/approve',
    authorize('PHAN_CONG_NGUOI_XU_LY'),
    async (req, res) => {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input('PhieuKiemId', sql.Int, Number(req.params.id))
                .input('UserId', sql.Int, userIdOf(req))
                .input('BoPhanId', sql.Int, req.user?.boPhanId || null)
                .input('IsAdmin', sql.Bit, isAdmin(req.user) ? 1 : 0)
                .execute('sp_PhieuKiem_CongDoan_Approve');
            res.json({ success: true });
        } catch (error) {
            console.error('CongDoan approve error:', error);
            res.status(statusForError(error)).json({ message: errorMessage(error, 'Không duyệt được phiếu') });
        }
    }
);

router.post(
    '/:id/create-bien-ban',
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const phieuKiemId = Number(req.params.id);
        if (!Number.isInteger(phieuKiemId) || phieuKiemId <= 0) {
            return res.status(400).json({ message: 'Phiếu công đoạn không hợp lệ' });
        }
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userIdOf(req))
                .execute('sp_PhieuKiem_CongDoan_CreateBienBan');
            res.json({
                success: true,
                bienBanId: result.recordset?.[0]?.BienBanId || null
            });
        } catch (error) {
            console.error('CongDoan create bien ban error:', error);
            res.status(statusForError(error)).json({
                message: errorMessage(error, 'Không sinh được biên bản KPH')
            });
        }
    }
);

router.delete(
    '/:id',
    authorize(['THUC_HIEN_KIEM', 'PHAN_BO_KIEM', 'KET_LUAN']),
    async (req, res) => {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input('PhieuKiemId', sql.Int, Number(req.params.id))
                .input('UserId', sql.Int, userIdOf(req))
                .input('CanManageAll', sql.Bit, canManageAll(req.user) ? 1 : 0)
                .execute('sp_PhieuKiem_CongDoan_Delete');
            res.json({ success: true });
        } catch (error) {
            console.error('CongDoan delete error:', error);
            res.status(statusForError(error)).json({ message: errorMessage(error, 'Không xóa được phiếu') });
        }
    }
);

module.exports = router;
