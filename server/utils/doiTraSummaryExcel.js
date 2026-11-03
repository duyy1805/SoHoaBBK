const XLSX = require('xlsx');

const text = (value) => String(value ?? '').trim();
const numberOrBlank = (value) => {
    if (value === '' || value == null) return '';
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : '';
};
const dateOrBlank = (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? text(value).slice(0, 10) : date;
};
const phoiCount = (value) => {
    const parsed = Number(text(value));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};
const defectiveSetQuantity = (item) => Math.ceil(
    (Number(item.SoLuongPhoiLoi) || 0) / phoiCount(item.SoPhoi)
);
const defectLabel = (item) => [
    [item.MaNhom, item.TenNhom].filter(Boolean).join(' - '),
    [item.MaLoi, item.TenLoi].filter(Boolean).join(' - '),
    item.SoLuongLoi == null ? '' : `SL ${item.SoLuongLoi}`
].filter(Boolean).join(': ');
const responsibleLabel = (item) => [
    item.MaBoPhanGayLoiSnapshot,
    item.TenBoPhanGayLoiSnapshot,
    item.TenDonViGayLoiSnapshot
].filter(Boolean).join(' - ');
const SUMMARY_HEADERS = [
    'STT', 'Số phiếu', 'Ngày lập', 'Kế hoạch', 'Đơn hàng', 'Mã sản phẩm', 'Tên sản phẩm',
    'Công đoạn', 'Đơn vị sản xuất', 'Mã vật tư', 'Quy cách vật tư', 'Loại phôi', 'Dao chặt',
    'Số phôi', 'Ký hiệu', 'Số lượng kiểm', 'Số lượng lỗi', 'Số bộ lỗi', 'ĐVT', 'Số lượng đổi trả',
    'LXVT', 'Lot sản xuất', 'Dấu tuần', 'Đơn vị tạo phôi', 'Ngày tạo phôi', 'Tổ sản xuất',
    'Công nhân sản xuất', 'KCS', 'Chi tiết lỗi', 'Bộ phận/NCC gây lỗi', 'Ghi chú phôi'
];
const RECEIPT_HEADERS = [
    'STT', 'Số phiếu đổi phôi', 'Số phiếu nhập BTP', 'Mã BTP', 'Tên BTP', 'Lô sản xuất',
    'Số lượng BTP lỗi', 'Kho nhập', 'Quy trình sản xuất', 'Trạng thái liên kết', 'Trạng thái ERP', 'Ngày tạo'
];

const setColumnWidths = (worksheet, widths) => {
    worksheet['!cols'] = widths.map((wch) => ({ wch }));
    if (worksheet['!ref']) worksheet['!autofilter'] = { ref: worksheet['!ref'] };
};

const buildDoiTraSummaryWorkbook = ({ items = [], defects = [], receipts = [] } = {}) => {
    const defectsByPhoi = new Map();
    defects.forEach((defect) => {
        const key = Number(defect.PhoiId);
        if (!defectsByPhoi.has(key)) defectsByPhoi.set(key, []);
        defectsByPhoi.get(key).push(defect);
    });

    const summaryRows = items.map((item, index) => {
        const itemDefects = defectsByPhoi.get(Number(item.PhoiId)) || [];
        return {
            'STT': index + 1,
            'Số phiếu': item.SoPhieu || '',
            'Ngày lập': dateOrBlank(item.NgayLap),
            'Kế hoạch': item.PlanNo || item.PlanID || '',
            'Đơn hàng': item.OrderCode || '',
            'Mã sản phẩm': item.ProductCode || '',
            'Tên sản phẩm': item.ProductName || '',
            'Công đoạn': [item.OperationCode, item.OperationName].filter(Boolean).join(' - '),
            'Đơn vị sản xuất': [item.DepartmentCode, item.DepartmentName].filter(Boolean).join(' - '),
            'Mã vật tư': item.MaVatTu || '',
            'Quy cách vật tư': item.QuyCachVatTu || '',
            'Loại phôi': item.TenLoaiPhoi || '',
            'Dao chặt': item.DaoChat || '',
            'Số phôi': item.SoPhoi || '',
            'Ký hiệu': item.KyHieu || '',
            'Số lượng kiểm': numberOrBlank(item.SoLuongKiem),
            'Số lượng lỗi': numberOrBlank(item.SoLuongPhoiLoi),
            'Số bộ lỗi': numberOrBlank(item.SoLuongBoLoiSnapshot ?? defectiveSetQuantity(item)),
            'ĐVT': item.TenDonViTinh || '',
            'Số lượng đổi trả': numberOrBlank(item.SoLuongDoiTra),
            'LXVT': item.LenhXuatVatTu || '',
            'Lot sản xuất': item.ExpectedProductionLot || item.LotSanXuat || '',
            'Dấu tuần': item.DauTuan || '',
            'Đơn vị tạo phôi': item.TenDonViTaoPhoi || '',
            'Ngày tạo phôi': dateOrBlank(item.NgayTaoPhoi),
            'Tổ sản xuất': item.ToSanXuat || '',
            'Công nhân sản xuất': item.CongNhanSanXuat || '',
            'KCS': item.TenKcs || '',
            'Chi tiết lỗi': itemDefects.map(defectLabel).filter(Boolean).join('\n'),
            'Bộ phận/NCC gây lỗi': [...new Set(itemDefects.map(responsibleLabel).filter(Boolean))].join('\n'),
            'Ghi chú phôi': item.GhiChu || ''
        };
    });

    const receiptRows = receipts.map((item, index) => ({
        'STT': index + 1,
        'Số phiếu đổi phôi': item.SoPhieu || '',
        'Số phiếu nhập BTP': item.SoPhieuNhapBtp || '',
        'Mã BTP': item.MaBtp || '',
        'Tên BTP': item.TenBtp || '',
        'Lô sản xuất': item.SoLoSanXuat || '',
        'Số lượng BTP lỗi': numberOrBlank(item.SoLuongBtpLoi),
        'Kho nhập': item.TenKhoNhap || '',
        'Quy trình sản xuất': item.TenQuyTrinhSanXuat || '',
        'Trạng thái liên kết': item.TrangThai || '',
        'Trạng thái ERP': Number(item.ErpTrangThai) === 0 ? 'Đang lập' : text(item.ErpTrangThai),
        'Ngày tạo': dateOrBlank(item.CreatedAt)
    }));

    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows, { cellDates: true, header: SUMMARY_HEADERS });
    setColumnWidths(summarySheet, [6, 18, 12, 18, 16, 16, 32, 22, 25, 16, 32, 24, 16, 10, 12, 14, 14, 12, 10, 16, 16, 18, 12, 22, 14, 18, 28, 18, 45, 35, 30]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'TongHopDoiPhoi');

    const receiptSheet = XLSX.utils.json_to_sheet(receiptRows, { cellDates: true, header: RECEIPT_HEADERS });
    setColumnWidths(receiptSheet, [6, 18, 22, 16, 32, 18, 18, 24, 28, 18, 16, 18]);
    XLSX.utils.book_append_sheet(workbook, receiptSheet, 'PhieuNhapBTPLoi');
    return workbook;
};

const writeDoiTraSummaryExcel = (data) => XLSX.write(buildDoiTraSummaryWorkbook(data), {
    type: 'buffer',
    bookType: 'xlsx',
    cellDates: true
});

module.exports = { buildDoiTraSummaryWorkbook, writeDoiTraSummaryExcel };
