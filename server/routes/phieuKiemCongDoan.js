const express = require('express');
const sql = require('mssql');
const { poolPromise } = require('../db');
const authenticateToken = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const { attachSignatureDataUrls } = require('../utils/signatureImage');

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
const inspectionCapabilities = (req, phieu = {}) => {
    const permissions = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const status = String(phieu?.TrangThai || '').toUpperCase();
    const open = OPEN_STATES.has(status);
    const admin = isAdmin(req.user);
    return {
        canEdit: open && (admin || permissions.includes('THUC_HIEN_KIEM')),
        canComplete: open && (admin || permissions.includes('THUC_HIEN_KIEM')),
        canApprove: status === 'CHO_TBP_DUYET'
            && (admin || permissions.includes('PHAN_CONG_NGUOI_XU_LY')),
        canDelete: open && (admin || permissions.includes('THUC_HIEN_KIEM')),
        canCreateBienBan: phieu?.KetLuan === 'KHONG_DAT'
            && (admin || permissions.includes('THUC_HIEN_KIEM'))
    };
};
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
const optionalNonNegativeInteger = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN;
};
const quantityFields = (plan) => {
    const planned = Number(plan?.SoLuongKeHoach || 0);
    const actual = plan?.SoLuongThucTe === null || plan?.SoLuongThucTe === undefined
        ? null
        : Number(plan.SoLuongThucTe);
    return {
        ...plan,
        SoLuongThucTe: actual,
        SoLuongHieuLuc: actual ?? planned,
        ChenhLechSoLuong: actual === null ? null : actual - planned
    };
};
const normalizeLots = (lots) => (Array.isArray(lots) ? lots : []).map((lot, index) => ({
    id: Number(lot?.id ?? lot?.Id ?? 0) || null,
    clientKey: String(lot?.clientKey ?? lot?.ClientKey ?? `lot-${index + 1}`).trim(),
    rowVersion: lot?.rowVersion ?? lot?.RowVersion ?? null,
    lot: String(lot?.lot ?? lot?.Lot ?? '').trim(),
    lenhXuatVatTu: String(lot?.lenhXuatVatTu ?? lot?.LenhXuatVatTu ?? '').trim(),
    soLuong: Number(lot?.soLuong ?? lot?.SoLuong),
    soLoiBuiBan: Number(lot?.soLoiBuiBan ?? lot?.SoLoiBuiBan ?? 0),
    soLoiConTrung: Number(lot?.soLoiConTrung ?? lot?.SoLoiConTrung ?? 0),
    sortOrder: index + 1
}));
const validateLots = (lots, effectiveQuantity) => {
    if (!lots.length) return null;
    if (lots.some((lot) =>
        !Number.isInteger(lot.soLuong) || lot.soLuong <= 0
        || !Number.isInteger(lot.soLoiBuiBan) || lot.soLoiBuiBan < 0
        || !Number.isInteger(lot.soLoiConTrung) || lot.soLoiConTrung < 0
        || (!lot.lot && !lot.lenhXuatVatTu)
    )) {
        return 'Mỗi dòng phân bổ phải có số lượng nguyên dương, lỗi không âm và ít nhất Lot hoặc Lệnh xuất vật tư';
    }
    const allocated = lots.reduce((sum, lot) => sum + lot.soLuong, 0);
    return allocated <= effectiveQuantity
        ? null
        : `Tổng số lượng phân bổ (${allocated}) không được vượt số lượng hiệu lực (${effectiveQuantity})`;
};
const normalizeDefects = (defects) => (Array.isArray(defects) ? defects : []).map((defect, index) => ({
    defectId: Number(defect?.defectId ?? defect?.DefectId ?? 0),
    lotId: Number(defect?.lotId ?? defect?.PlanLotId ?? 0) || null,
    lotClientKey: String(defect?.lotClientKey ?? defect?.LotClientKey ?? '').trim() || null,
    tenCongNhan: String(defect?.tenCongNhan ?? defect?.TenCongNhan ?? '').trim() || null,
    soLuong: Number(defect?.soLuong ?? defect?.SoLuong ?? 0),
    soLuongDatSauSua: defect?.soLuongDatSauSua === '' || defect?.soLuongDatSauSua == null
        ? null
        : Number(defect.soLuongDatSauSua),
    soLuongKhongDatSauSua: defect?.soLuongKhongDatSauSua === '' || defect?.soLuongKhongDatSauSua == null
        ? null
        : Number(defect.soLuongKhongDatSauSua),
    ghiChu: String(defect?.ghiChu ?? defect?.GhiChu ?? '').trim() || null,
    imageUrls: Array.isArray(defect?.imageUrls ?? defect?.ImageUrls)
        ? (defect.imageUrls ?? defect.ImageUrls).filter((url) => typeof url === 'string' && url.trim())
        : [],
    sortOrder: Number(defect?.sortOrder || index + 1)
}));

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
            const ids = result.recordset.map((item) => Number(item.Id)).filter(Boolean);
            let totalsById = new Map();
            if (ids.length) {
                const totals = await pool.request()
                    .input('IdsJson', sql.NVarChar(sql.MAX), JSON.stringify(ids))
                    .query(`
                        SELECT planRow.PhieuKiemId,
                            SUM(ISNULL(planRow.SoLuongKeHoach, 0)) AS TongSoLuongKeHoach,
                            SUM(CASE WHEN planRow.SoLuongThucTe IS NOT NULL THEN planRow.SoLuongThucTe ELSE 0 END) AS TongSoLuongThucTe,
                            SUM(COALESCE(planRow.SoLuongThucTe, planRow.SoLuongKeHoach, 0)) AS TongSoLuongHieuLuc,
                            SUM(CASE WHEN planRow.SoLuongThucTe IS NOT NULL THEN 1 ELSE 0 END) AS SoKeHoachDaNhapThucTe,
                            SUM(ISNULL(planRow.SoLoiBuiBan, 0) + ISNULL(planRow.SoLoiConTrung, 0)
                                + ISNULL(defectTotals.TongLoi, 0) + ISNULL(lotTotals.LoiDacBiet, 0)) AS TongSoLuongLoi
                        FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN planRow
                        OUTER APPLY (
                            SELECT SUM(defect.SoLuong) AS TongLoi
                            FROM dbo.PHIEU_KIEM_CONG_DOAN_DEFECT defect
                            WHERE defect.PlanId = planRow.Id
                        ) defectTotals
                        OUTER APPLY (
                            SELECT SUM(ISNULL(lotRow.SoLoiBuiBan, 0) + ISNULL(lotRow.SoLoiConTrung, 0)) AS LoiDacBiet
                            FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN_LOT lotRow
                            WHERE lotRow.PlanId = planRow.Id
                        ) lotTotals
                        WHERE planRow.PhieuKiemId IN (
                            SELECT TRY_CONVERT(int, [value]) FROM OPENJSON(@IdsJson)
                        )
                        GROUP BY planRow.PhieuKiemId
                    `);
                totalsById = new Map(totals.recordset.map((item) => [Number(item.PhieuKiemId), item]));
            }
            res.json(encodeRows(result.recordset.map((item) => {
                const totals = totalsById.get(Number(item.Id)) || {};
                return normalizePhieuDates({
                    ...item,
                    ...totals,
                    ChenhLechSoLuong: Number(totals.SoKeHoachDaNhapThucTe || 0)
                        ? Number(totals.TongSoLuongHieuLuc || 0) - Number(totals.TongSoLuongKeHoach || 0)
                        : null
                });
            })));
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
            const lotResult = await pool.request()
                .input('PhieuKiemId', sql.Int, Number(req.params.id))
                .query(`
                    SELECT lotRow.*
                    FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN_LOT lotRow
                    INNER JOIN dbo.PHIEU_KIEM_CONG_DOAN_PLAN planRow ON planRow.Id = lotRow.PlanId
                    WHERE planRow.PhieuKiemId = @PhieuKiemId
                    ORDER BY lotRow.PlanId, lotRow.SortOrder, lotRow.Id
                `);
            const lotsByPlan = lotResult.recordset.reduce((map, row) => {
                if (!map[row.PlanId]) map[row.PlanId] = [];
                map[row.PlanId].push(row);
                return map;
            }, {});

            const defectsByPlan = (result.recordsets[2] || []).reduce((map, defect) => {
                if (!map[defect.PlanId]) map[defect.PlanId] = [];
                let imageUrls = defect.ImageUrls;
                if (typeof imageUrls === 'string') {
                    try {
                        imageUrls = JSON.parse(imageUrls);
                    } catch (error) {
                        imageUrls = [];
                    }
                }
                map[defect.PlanId].push({
                    ...defect,
                    ImageUrls: Array.isArray(imageUrls) ? imageUrls : []
                });
                return map;
            }, {});
            const plans = (result.recordsets[1] || [])
                .map((plan) => {
                    const withQuantity = quantityFields(normalizePlanDates(plan));
                    const planLots = lotsByPlan[plan.Id] || [];
                    const planDefects = defectsByPlan[plan.Id] || [];
                    const lotSpecialDefects = planLots.reduce((sum, lot) =>
                        sum + Number(lot.SoLoiBuiBan || 0) + Number(lot.SoLoiConTrung || 0), 0);
                    const totalDefects = planDefects.reduce((sum, defect) =>
                        sum + Number(defect.SoLuong || 0), 0)
                        + lotSpecialDefects
                        + Number(plan.SoLoiBuiBan || 0)
                        + Number(plan.SoLoiConTrung || 0);
                    return {
                        ...withQuantity,
                        TongLoi: totalDefects,
                        TyLeLoi: Number(withQuantity.SoLuongHieuLuc || 0) > 0
                            ? totalDefects * 100 / Number(withQuantity.SoLuongHieuLuc)
                            : null,
                        Defects: planDefects,
                        Lots: planLots
                    };
                })
                .sort((left, right) =>
                    Number(left.ID_KeHoachSanXuat) - Number(right.ID_KeHoachSanXuat)
                    || Number(left.Id) - Number(right.Id)
                );
            const totals = plans.reduce((sum, plan) => ({
                TongSoLuongKeHoach: sum.TongSoLuongKeHoach + Number(plan.SoLuongKeHoach || 0),
                TongSoLuongThucTe: sum.TongSoLuongThucTe + Number(plan.SoLuongThucTe || 0),
                TongSoLuongHieuLuc: sum.TongSoLuongHieuLuc + Number(plan.SoLuongHieuLuc || 0),
                SoKeHoachDaNhapThucTe: sum.SoKeHoachDaNhapThucTe + (plan.SoLuongThucTe == null ? 0 : 1)
            }), { TongSoLuongKeHoach: 0, TongSoLuongThucTe: 0, TongSoLuongHieuLuc: 0, SoKeHoachDaNhapThucTe: 0 });
            totals.ChenhLechSoLuong = totals.SoKeHoachDaNhapThucTe
                ? totals.TongSoLuongHieuLuc - totals.TongSoLuongKeHoach
                : null;
            const xacNhans = await attachSignatureDataUrls(pool, result.recordsets[3] || [], 'NguoiXacNhanId');
            res.json(encodeRows({
                phieu: { ...normalizePhieuDates(phieu), ...totals },
                plans,
                xacNhans,
                readOnly: !OPEN_STATES.has(phieu.TrangThai),
                capabilities: inspectionCapabilities(req, phieu)
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
                    && dateKey(item.Ngay) === dateKey(header.recordset[0].NgayKiem)
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
        const soLuongThucTe = optionalNonNegativeInteger(req.body?.soLuongThucTe);
        const lots = normalizeLots(req.body?.lots);
        const hasDefectsPayload = Array.isArray(req.body?.defects);
        const defects = normalizeDefects(req.body?.defects);
        if (!Number.isInteger(soLoiBuiBan) || soLoiBuiBan < 0
            || !Number.isInteger(soLoiConTrung) || soLoiConTrung < 0) {
            return res.status(400).json({ message: 'Số lỗi bụi bẩn và côn trùng phải là số nguyên không âm' });
        }
        if (Number.isNaN(soLuongThucTe)) {
            return res.status(400).json({ message: 'Số lượng thực tế phải là số nguyên không âm hoặc để trống' });
        }
        try {
            const pool = await poolPromise;
            const currentPlanResult = await pool.request()
                .input('PhieuKiemId', sql.Int, Number(req.params.id))
                .input('PlanId', sql.Int, Number(req.params.planId))
                .query(`
                    SELECT planRow.MaDonHang, planRow.SoLuongKeHoach, pk.TrangThai
                    FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN planRow
                    INNER JOIN dbo.PHIEU_KIEM pk ON pk.Id = planRow.PhieuKiemId
                    WHERE planRow.Id = @PlanId AND planRow.PhieuKiemId = @PhieuKiemId
                `);
            const currentPlan = currentPlanResult.recordset[0];
            if (!currentPlan) {
                return res.status(404).json({ message: 'Không tìm thấy kế hoạch trong phiếu' });
            }
            if (!OPEN_STATES.has(String(currentPlan.TrangThai || '').toUpperCase())) {
                return res.status(409).json({ message: 'Phiếu đã hoàn thành nên không thể cập nhật kế hoạch' });
            }
            const effectiveQuantity = soLuongThucTe ?? Number(currentPlan.SoLuongKeHoach || 0);
            const lotError = validateLots(lots, effectiveQuantity);
            if (lotError) return res.status(400).json({ message: lotError });
            if (hasDefectsPayload) {
                const defectKeys = new Set();
                for (const defect of defects) {
                    const targetKey = defect.lotId
                        ? `id:${defect.lotId}`
                        : defect.lotClientKey
                            ? `key:${defect.lotClientKey}`
                            : 'general';
                    const uniqueKey = `${targetKey}|${defect.defectId}|${normalizeText(defect.tenCongNhan)}`;
                    if (defectKeys.has(uniqueKey)) {
                        return res.status(400).json({
                            message: 'Một loại lỗi chỉ được nhập một lần cho cùng công nhân trong một Lot'
                        });
                    }
                    defectKeys.add(uniqueKey);
                    if (!Number.isInteger(defect.defectId) || defect.defectId <= 0
                        || !Number.isInteger(defect.soLuong) || defect.soLuong <= 0
                        || (defect.soLuongDatSauSua != null
                            && (!Number.isInteger(defect.soLuongDatSauSua) || defect.soLuongDatSauSua < 0))
                        || (defect.soLuongKhongDatSauSua != null
                            && (!Number.isInteger(defect.soLuongKhongDatSauSua) || defect.soLuongKhongDatSauSua < 0))
                        || Number(defect.soLuongDatSauSua || 0)
                            + Number(defect.soLuongKhongDatSauSua || 0) > defect.soLuong) {
                        return res.status(400).json({ message: 'Dữ liệu số lượng lỗi hoặc báo cáo sửa lỗi không hợp lệ' });
                    }
                }
            }

            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                await new sql.Request(transaction)
                .input('PhieuKiemId', sql.Int, Number(req.params.id))
                .input('PlanId', sql.Int, Number(req.params.planId))
                .input('MaDonHang', sql.NVarChar(200), currentPlan.MaDonHang || null)
                .input('Lot', sql.NVarChar(200), lots[0]?.lot || null)
                .input('LenhXuatVatTu', sql.NVarChar(200), lots[0]?.lenhXuatVatTu || null)
                .input('GhiChu', sql.NVarChar(sql.MAX), req.body.ghiChu || null)
                .input('SoLoiBuiBan', sql.Int, soLoiBuiBan)
                .input('SoLoiConTrung', sql.Int, soLoiConTrung)
                .input('RowVersion', sql.VarBinary(8), rowVersion)
                .input('UserId', sql.Int, userIdOf(req))
                .execute('sp_PhieuKiem_CongDoan_UpdatePlan');

                await new sql.Request(transaction)
                    .input('PlanId', sql.Int, Number(req.params.planId))
                    .input('SoLuongThucTe', sql.Int, soLuongThucTe)
                    .query(`
                        UPDATE dbo.PHIEU_KIEM_CONG_DOAN_PLAN
                        SET SoLuongThucTe = @SoLuongThucTe
                        WHERE Id = @PlanId;
                    `);

                const existingResult = await new sql.Request(transaction)
                    .input('PlanId', sql.Int, Number(req.params.planId))
                    .query(`
                        SELECT lotRow.Id, lotRow.RowVersion,
                            ISNULL(lotRow.SoLoiBuiBan, 0) + ISNULL(lotRow.SoLoiConTrung, 0)
                                + ISNULL(defectTotals.TongLoi, 0) AS TongLoi
                        FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN_LOT lotRow
                        OUTER APPLY (
                            SELECT SUM(defect.SoLuong) AS TongLoi
                            FROM dbo.PHIEU_KIEM_CONG_DOAN_DEFECT defect
                            WHERE defect.PlanLotId = lotRow.Id
                        ) defectTotals
                        WHERE lotRow.PlanId = @PlanId;
                    `);
                const existingById = new Map(existingResult.recordset.map((row) => [Number(row.Id), row]));
                const desiredExistingIds = new Set(lots.filter((lot) => lot.id).map((lot) => lot.id));
                for (const existing of existingResult.recordset) {
                    if (!desiredExistingIds.has(Number(existing.Id)) && Number(existing.TongLoi || 0) > 0) {
                        throw Object.assign(
                            new Error('Không thể xóa Lot đang có lỗi. Hãy xóa hoặc chuyển lỗi rồi lưu trước.'),
                            { statusCode: 409 }
                        );
                    }
                }

                const resolvedLotIds = new Map();
                for (const lot of lots) {
                    if (lot.id) {
                        if (!existingById.has(lot.id)) {
                            throw Object.assign(new Error('Dòng Lot không thuộc kế hoạch hoặc đã bị xóa'), { statusCode: 409 });
                        }
                        const lotRowVersion = rowVersionBuffer(lot.rowVersion);
                        if (!lotRowVersion) {
                            throw Object.assign(new Error('RowVersion của dòng Lot không hợp lệ'), { statusCode: 409 });
                        }
                        const updatedLot = await new sql.Request(transaction)
                            .input('PlanId', sql.Int, Number(req.params.planId))
                            .input('LotId', sql.Int, lot.id)
                            .input('Lot', sql.NVarChar(200), lot.lot || null)
                            .input('LenhXuatVatTu', sql.NVarChar(200), lot.lenhXuatVatTu || null)
                            .input('SoLuong', sql.Int, lot.soLuong)
                            .input('SoLoiBuiBan', sql.Int, lot.soLoiBuiBan)
                            .input('SoLoiConTrung', sql.Int, lot.soLoiConTrung)
                            .input('SortOrder', sql.Int, lot.sortOrder)
                            .input('RowVersion', sql.VarBinary(8), lotRowVersion)
                            .query(`
                                UPDATE dbo.PHIEU_KIEM_CONG_DOAN_PLAN_LOT
                                SET Lot = @Lot,
                                    LenhXuatVatTu = @LenhXuatVatTu,
                                    SoLuong = @SoLuong,
                                    SoLoiBuiBan = @SoLoiBuiBan,
                                    SoLoiConTrung = @SoLoiConTrung,
                                    SortOrder = @SortOrder,
                                    UpdatedAt = SYSDATETIME()
                                WHERE Id = @LotId AND PlanId = @PlanId AND RowVersion = @RowVersion;
                                SELECT @@ROWCOUNT AS UpdatedCount;
                            `);
                        if (Number(updatedLot.recordset[0]?.UpdatedCount || 0) !== 1) {
                            throw Object.assign(new Error('Dòng Lot đã thay đổi. Hãy tải lại dữ liệu.'), { statusCode: 409 });
                        }
                        resolvedLotIds.set(lot.clientKey, lot.id);
                        resolvedLotIds.set(`id:${lot.id}`, lot.id);
                    } else {
                        const insertedLot = await new sql.Request(transaction)
                            .input('PlanId', sql.Int, Number(req.params.planId))
                            .input('Lot', sql.NVarChar(200), lot.lot || null)
                            .input('LenhXuatVatTu', sql.NVarChar(200), lot.lenhXuatVatTu || null)
                            .input('SoLuong', sql.Int, lot.soLuong)
                            .input('SoLoiBuiBan', sql.Int, lot.soLoiBuiBan)
                            .input('SoLoiConTrung', sql.Int, lot.soLoiConTrung)
                            .input('SortOrder', sql.Int, lot.sortOrder)
                            .query(`
                                INSERT dbo.PHIEU_KIEM_CONG_DOAN_PLAN_LOT
                                    (PlanId, Lot, LenhXuatVatTu, SoLuong, SoLoiBuiBan, SoLoiConTrung, SortOrder)
                                OUTPUT inserted.Id
                                VALUES (@PlanId, @Lot, @LenhXuatVatTu, @SoLuong, @SoLoiBuiBan, @SoLoiConTrung, @SortOrder)
                            `);
                        resolvedLotIds.set(lot.clientKey, Number(insertedLot.recordset[0].Id));
                    }
                }

                for (const existing of existingResult.recordset) {
                    if (!desiredExistingIds.has(Number(existing.Id))) {
                        await new sql.Request(transaction)
                            .input('PlanId', sql.Int, Number(req.params.planId))
                            .input('LotId', sql.Int, Number(existing.Id))
                            .query('DELETE dbo.PHIEU_KIEM_CONG_DOAN_PLAN_LOT WHERE Id = @LotId AND PlanId = @PlanId');
                    }
                }

                if (hasDefectsPayload) {
                    const resolvedDefects = defects.map((defect) => {
                        const resolvedLotId = defect.lotId
                            ? resolvedLotIds.get(`id:${defect.lotId}`)
                            : defect.lotClientKey
                                ? resolvedLotIds.get(defect.lotClientKey)
                                : null;
                        if ((defect.lotId || defect.lotClientKey) && !resolvedLotId) {
                            throw Object.assign(new Error('Không xác định được Lot đã chọn của một dòng lỗi'), { statusCode: 400 });
                        }
                        return { ...defect, resolvedLotId };
                    });

                    for (const lot of lots) {
                        const lotId = resolvedLotIds.get(lot.clientKey) || resolvedLotIds.get(`id:${lot.id}`);
                        const defectTotal = resolvedDefects
                            .filter((defect) => Number(defect.resolvedLotId) === Number(lotId))
                            .reduce((sum, defect) => sum + defect.soLuong, 0);
                        if (defectTotal + lot.soLoiBuiBan + lot.soLoiConTrung > lot.soLuong) {
                            throw Object.assign(
                                new Error(`Tổng lỗi của Lot ${lot.lot || lot.lenhXuatVatTu} vượt số lượng Lot`),
                                { statusCode: 409 }
                            );
                        }
                    }
                    if (!lots.length) {
                        const totalDefects = resolvedDefects.reduce((sum, defect) => sum + defect.soLuong, 0)
                            + soLoiBuiBan + soLoiConTrung;
                        if (totalDefects > effectiveQuantity) {
                            throw Object.assign(new Error('Tổng lỗi vượt số lượng hiệu lực của kế hoạch'), { statusCode: 409 });
                        }
                    }

                    await new sql.Request(transaction)
                        .input('PlanId', sql.Int, Number(req.params.planId))
                        .query('DELETE dbo.PHIEU_KIEM_CONG_DOAN_DEFECT WHERE PlanId = @PlanId');
                    for (const defect of resolvedDefects) {
                        await new sql.Request(transaction)
                            .input('PlanId', sql.Int, Number(req.params.planId))
                            .input('PlanLotId', sql.Int, defect.resolvedLotId)
                            .input('DefectId', sql.Int, defect.defectId)
                            .input('TenCongNhan', sql.NVarChar(255), defect.tenCongNhan)
                            .input('SoLuong', sql.Int, defect.soLuong)
                            .input('SoLuongDatSauSua', sql.Int, defect.soLuongDatSauSua)
                            .input('SoLuongKhongDatSauSua', sql.Int, defect.soLuongKhongDatSauSua)
                            .input('GhiChu', sql.NVarChar(sql.MAX), defect.ghiChu)
                            .input('ImageUrls', sql.NVarChar(sql.MAX), JSON.stringify(defect.imageUrls))
                            .input('SortOrder', sql.Int, defect.sortOrder)
                            .input('UserId', sql.Int, userIdOf(req))
                            .query(`
                                INSERT dbo.PHIEU_KIEM_CONG_DOAN_DEFECT (
                                    PlanId, PlanLotId, DefectId, TenCongNhan, SoLuong,
                                    SoLuongDatSauSua, SoLuongKhongDatSauSua, GhiChu,
                                    ImageUrls, SortOrder, UpdatedBy
                                )
                                VALUES (
                                    @PlanId, @PlanLotId, @DefectId, @TenCongNhan, @SoLuong,
                                    @SoLuongDatSauSua, @SoLuongKhongDatSauSua, @GhiChu,
                                    @ImageUrls, @SortOrder, @UserId
                                )
                            `);
                    }
                }

                const response = await new sql.Request(transaction)
                    .input('PlanId', sql.Int, Number(req.params.planId))
                    .query(`
                        SELECT * FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN WHERE Id = @PlanId;
                        SELECT * FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN_LOT
                        WHERE PlanId = @PlanId ORDER BY SortOrder, Id;
                        SELECT defect.*, dm.MaLoi, dm.TenLoi, dm.DefectType, dm.MoTa
                        FROM dbo.PHIEU_KIEM_CONG_DOAN_DEFECT defect
                        INNER JOIN dbo.DM_DEFECT dm ON dm.Id = defect.DefectId
                        WHERE defect.PlanId = @PlanId
                        ORDER BY defect.SortOrder, defect.Id;
                    `);
                await transaction.commit();
                res.json(encodeRows({
                    ...quantityFields(response.recordsets[0][0]),
                    Lots: response.recordsets[1] || [],
                    Defects: response.recordsets[2] || []
                }));
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } catch (error) {
            console.error('CongDoan update plan error:', error);
            res.status(error.statusCode || statusForError(error)).json({ message: errorMessage(error, 'Không cập nhật được kế hoạch') });
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
            const quantityResult = await pool.request()
                .input('PhieuKiemId', sql.Int, Number(req.params.id))
                .input('PlanId', sql.Int, Number(req.params.planId))
                .query(`
                    SELECT COALESCE(SoLuongThucTe, SoLuongKeHoach, 0) AS SoLuongHieuLuc,
                        ISNULL(SoLoiBuiBan, 0) + ISNULL(SoLoiConTrung, 0) AS SoLoiDacBiet,
                        (SELECT COUNT(*) FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN_LOT lotRow
                         WHERE lotRow.PlanId = planRow.Id) AS SoDongLot
                    FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN planRow
                    WHERE Id = @PlanId AND PhieuKiemId = @PhieuKiemId
                `);
            const quantityInfo = quantityResult.recordset[0];
            if (!quantityInfo) return res.status(404).json({ message: 'Không tìm thấy kế hoạch trong phiếu' });
            if (Number(quantityInfo.SoDongLot || 0) > 0) {
                return res.status(409).json({
                    message: 'Kế hoạch đã tách Lot. Hãy cập nhật ứng dụng để ghi lỗi theo từng Lot.'
                });
            }
            const incomingDefectTotal = defects.reduce((sum, defect) => sum + Number(defect?.soLuong || 0), 0);
            if (incomingDefectTotal + Number(quantityInfo.SoLoiDacBiet || 0) > Number(quantityInfo.SoLuongHieuLuc || 0)) {
                return res.status(409).json({ message: 'Tổng số lượng lỗi vượt số lượng hiệu lực của kế hoạch' });
            }
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
            const validation = await pool.request()
                .input('PhieuKiemId', sql.Int, Number(req.params.id))
                .query(`
                    SELECT planRow.Id,
                        COALESCE(planRow.SoLuongThucTe, planRow.SoLuongKeHoach, 0) AS SoLuongHieuLuc,
                        ISNULL(planRow.SoLoiBuiBan, 0) AS SoLoiBuiBan,
                        ISNULL(planRow.SoLoiConTrung, 0) AS SoLoiConTrung,
                        ISNULL(planRow.SoLoiBuiBan, 0) + ISNULL(planRow.SoLoiConTrung, 0)
                            + ISNULL(defectTotals.TongLoi, 0)
                            + ISNULL(lotTotals.LoiDacBiet, 0) AS TongLoi,
                        ISNULL(lotTotals.SoDong, 0) AS SoDongLot,
                        ISNULL(lotTotals.TongPhanBo, 0) AS TongPhanBo,
                        ISNULL(defectTotals.SoLoiChuaGanLot, 0) AS SoLoiChuaGanLot,
                        ISNULL(invalidLots.SoLotLoiVuotSoLuong, 0) AS SoLotLoiVuotSoLuong
                    FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN planRow
                    OUTER APPLY (
                        SELECT SUM(defect.SoLuong) AS TongLoi,
                            SUM(CASE WHEN defect.PlanLotId IS NULL THEN 1 ELSE 0 END) AS SoLoiChuaGanLot
                        FROM dbo.PHIEU_KIEM_CONG_DOAN_DEFECT defect
                        WHERE defect.PlanId = planRow.Id
                    ) defectTotals
                    OUTER APPLY (
                        SELECT COUNT(*) AS SoDong,
                            SUM(lotRow.SoLuong) AS TongPhanBo,
                            SUM(ISNULL(lotRow.SoLoiBuiBan, 0) + ISNULL(lotRow.SoLoiConTrung, 0)) AS LoiDacBiet
                        FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN_LOT lotRow
                        WHERE lotRow.PlanId = planRow.Id
                    ) lotTotals
                    OUTER APPLY (
                        SELECT COUNT(*) AS SoLotLoiVuotSoLuong
                        FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN_LOT lotRow
                        OUTER APPLY (
                            SELECT SUM(defect.SoLuong) AS TongLoi
                            FROM dbo.PHIEU_KIEM_CONG_DOAN_DEFECT defect
                            WHERE defect.PlanLotId = lotRow.Id
                        ) lotDefects
                        WHERE lotRow.PlanId = planRow.Id
                          AND ISNULL(lotDefects.TongLoi, 0)
                              + ISNULL(lotRow.SoLoiBuiBan, 0)
                              + ISNULL(lotRow.SoLoiConTrung, 0) > lotRow.SoLuong
                    ) invalidLots
                    WHERE planRow.PhieuKiemId = @PhieuKiemId
                `);
            const invalidAllocation = validation.recordset.find((plan) =>
                Number(plan.SoDongLot || 0) > 0 && Number(plan.TongPhanBo || 0) !== Number(plan.SoLuongHieuLuc || 0)
            );
            if (invalidAllocation) {
                return res.status(409).json({ message: `Kế hoạch #${invalidAllocation.Id} có tổng phân bổ Lot không bằng số lượng hiệu lực` });
            }
            const unassignedDefects = validation.recordset.find((plan) =>
                Number(plan.SoDongLot || 0) > 0
                && (Number(plan.SoLoiChuaGanLot || 0) > 0
                    || Number(plan.SoLoiBuiBan || 0) > 0
                    || Number(plan.SoLoiConTrung || 0) > 0)
            );
            if (unassignedDefects) {
                return res.status(409).json({
                    message: `Kế hoạch #${unassignedDefects.Id} còn lỗi chưa gắn Lot`
                });
            }
            const invalidLotDefects = validation.recordset.find((plan) =>
                Number(plan.SoLotLoiVuotSoLuong || 0) > 0
            );
            if (invalidLotDefects) {
                return res.status(409).json({
                    message: `Kế hoạch #${invalidLotDefects.Id} có tổng lỗi của Lot vượt số lượng Lot`
                });
            }
            const excessiveDefects = validation.recordset.find((plan) =>
                Number(plan.TongLoi || 0) > Number(plan.SoLuongHieuLuc || 0)
            );
            if (excessiveDefects) {
                return res.status(409).json({ message: `Kế hoạch #${excessiveDefects.Id} có tổng lỗi vượt số lượng hiệu lực` });
            }
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
