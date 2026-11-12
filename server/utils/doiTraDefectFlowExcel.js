const XLSX = require('xlsx');

const EVENT_LABELS = {
    PRODUCTION_RETURN_DEFECT: 'Đơn vị sản xuất trả BTP lỗi',
    PRODUCTION_RECEIVE_BTP: 'Kho trả BTP cho đơn vị sản xuất',
    CUTTING_RECEIVE_DEFECT: 'Kho xuất BTP lỗi cho đơn vị cắt',
    CUTTING_RETURN_REPAIRED: 'Đơn vị cắt trả BTP sau sửa'
};
const FLOW_LABELS = {
    PRODUCTION_WAREHOUSE: 'Đơn vị sản xuất – Kho',
    WAREHOUSE_CUTTING: 'Kho – Đơn vị cắt'
};

const numberOrBlank = (value) => {
    if (value === '' || value == null) return '';
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : '';
};
const dateOrBlank = (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date;
};
const setColumnWidths = (worksheet, widths) => {
    worksheet['!cols'] = widths.map((wch) => ({ wch }));
    if (worksheet['!ref']) worksheet['!autofilter'] = { ref: worksheet['!ref'] };
};
const appendSheet = (workbook, rows, name, widths, options = {}) => {
    const sheet = XLSX.utils.json_to_sheet(rows, options);
    setColumnWidths(sheet, widths);
    XLSX.utils.book_append_sheet(workbook, sheet, name);
};

const counterpartRows = (groups, flowType) => groups
    .filter((item) => item.FlowType === flowType && item.GroupType === 'COUNTERPARTY')
    .map((item, index) => ({
        STT: index + 1,
        'Đối tượng nghiệp vụ': item.GroupLabel,
        'Mã nhóm': item.GroupKey,
        'Đơn vị tính': item.UomName,
        'Đầu kỳ còn chờ': numberOrBlank(item.OpeningBalance),
        [flowType === 'PRODUCTION_WAREHOUSE' ? 'Trả BTP lỗi trong kỳ' : 'Nhận BTP lỗi trong kỳ']: numberOrBlank(item.PeriodSent),
        [flowType === 'PRODUCTION_WAREHOUSE' ? 'Nhận BTP từ kho' : 'Trả BTP sau sửa']: numberOrBlank(item.PeriodReturned),
        'Cuối kỳ còn chờ': numberOrBlank(item.ClosingBalance),
        'Chờ duyệt chiều đi': numberOrBlank(item.PendingSentQuantity),
        'Chờ duyệt chiều về': numberOrBlank(item.PendingReturnedQuantity),
        'Số phiếu chờ': numberOrBlank(item.PendingVoucherCount)
    }));

const detailRows = (details) => details.map((item, index) => ({
    STT: index + 1,
    'Ngày chứng từ': dateOrBlank(item.VoucherDate),
    'Luồng nghiệp vụ': FLOW_LABELS[item.FlowType] || item.FlowType,
    'Nghiệp vụ': EVENT_LABELS[item.EventType] || item.EventType,
    'Hình thức ID': item.FormId,
    'Số chứng từ': item.VoucherNo,
    'Trạng thái': item.IsApproved ? 'Đã duyệt' : 'Chờ duyệt',
    'Đối tượng': item.CounterpartyLabel,
    'Đơn vị': item.UnitName,
    'Bộ phận': item.DepartmentName,
    'Kho': item.WarehouseName,
    'Kế hoạch': item.PlanNo,
    'Đơn hàng': item.OrderCode,
    'Mã BTP': item.ProductCode,
    'Tên BTP': item.ProductName,
    'Lô sản xuất': item.LotNo,
    'Số lượng': numberOrBlank(item.Quantity),
    'Đơn vị tính': item.UomName
}));

const buildDefectFlowWorkbook = (report = {}) => {
    const workbook = XLSX.utils.book_new();
    const meta = report.meta || {};
    const summaryRows = (report.flowTotals || []).map((item) => ({
        'Từ ngày': dateOrBlank(meta.FromDate),
        'Đến ngày': dateOrBlank(meta.ToDate),
        'Mốc dữ liệu': dateOrBlank(meta.DataStartDate),
        'Luồng nghiệp vụ': FLOW_LABELS[item.FlowType] || item.FlowType,
        'Đơn vị tính': item.UomName,
        'Đầu kỳ còn chờ': numberOrBlank(item.OpeningBalance),
        'Phát sinh chiều đi': numberOrBlank(item.PeriodSent),
        'Phát sinh chiều về': numberOrBlank(item.PeriodReturned),
        'Cuối kỳ còn chờ': numberOrBlank(item.ClosingBalance),
        'Chờ duyệt chiều đi': numberOrBlank(item.PendingSentQuantity),
        'Chờ duyệt chiều về': numberOrBlank(item.PendingReturnedQuantity),
        'Số phiếu chờ': numberOrBlank(item.PendingVoucherCount)
    }));
    appendSheet(workbook, summaryRows, 'TongQuan', [14, 14, 14, 28, 16, 18, 18, 18, 18, 20, 20, 16], { cellDates: true });

    appendSheet(workbook, counterpartRows(report.allGroups || [], 'PRODUCTION_WAREHOUSE'),
        'DonViSanXuat', [6, 40, 24, 16, 18, 20, 20, 18, 20, 20, 16]);

    const warehouseRows = (report.warehouseReconciliation || []).map((item, index) => ({
        STT: index + 1,
        Kho: item.WarehouseName,
        'Đơn vị tính': item.UomName,
        'SX trả lỗi': numberOrBlank(item.ProductionReturnedDefect),
        'Kho trả SX': numberOrBlank(item.ProductionReceivedBtp),
        'Còn chờ trả SX': numberOrBlank(item.ProductionClosing),
        'Kho xuất đơn vị cắt': numberOrBlank(item.CuttingReceivedDefect),
        'Kho nhận sau sửa': numberOrBlank(item.CuttingReturnedRepaired),
        'Còn ở đơn vị cắt': numberOrBlank(item.CuttingClosing),
        'Số phiếu chờ': numberOrBlank(item.PendingVoucherCount)
    }));
    appendSheet(workbook, warehouseRows, 'DoiSoatKho', [6, 28, 16, 18, 18, 18, 22, 20, 20, 16]);

    appendSheet(workbook, counterpartRows(report.allGroups || [], 'WAREHOUSE_CUTTING'),
        'DonViCat', [6, 40, 24, 16, 18, 20, 20, 18, 20, 20, 16]);

    const rows = detailRows(report.details || []);
    const detailWidths = [6, 14, 28, 38, 14, 24, 14, 38, 24, 34, 24, 22, 20, 16, 38, 16, 14, 16];
    appendSheet(workbook, rows.filter((item) => item['Trạng thái'] === 'Đã duyệt'),
        'ChiTietChungTu', detailWidths, { cellDates: true });
    appendSheet(workbook, rows.filter((item) => item['Trạng thái'] === 'Chờ duyệt'),
        'ChungTuChoDuyet', detailWidths, { cellDates: true });
    return workbook;
};

const writeDefectFlowExcel = (report) => XLSX.write(buildDefectFlowWorkbook(report), {
    type: 'buffer', bookType: 'xlsx', cellDates: true
});

module.exports = { EVENT_LABELS, FLOW_LABELS, buildDefectFlowWorkbook, writeDefectFlowExcel };
