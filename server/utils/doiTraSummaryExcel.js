const XLSX = require('xlsx');

const text = (value) => String(value ?? '').trim();
const normalize = (value) => text(value).normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const numberOrBlank = (value) => {
    if (value === '' || value == null) return '';
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : '';
};
const dateText = (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return text(value).slice(0, 10);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};
const productionDepartmentLabel = (item) => {
    const isSxbt = text(item.UnitCode) === '32'
        || normalize(item.UnitName) === 'sxbt'
        || normalize(item.DepartmentName).startsWith('sxbt');
    if (isSxbt) return text(item.SxbtUnitCode);
    return [item.DepartmentCode, item.DepartmentName].filter(Boolean).join(' - ');
};
const parseIssueTraceabilities = (item) => {
    if (Array.isArray(item.issueTraceabilities)) return item.issueTraceabilities;
    try {
        const parsed = JSON.parse(item.IssueTraceabilitiesJson || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};
const phoiCount = (value) => {
    const parsed = Number(text(value));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};
const defectiveSetQuantity = (item) => Math.ceil((Number(item.SoLuongPhoiLoi) || 0) / phoiCount(item.SoPhoi));
const materialLabel = (item) => {
    const name = text(item.TenLoaiPhoi);
    const code = text(item.MaVatTu);
    const label = name && code ? `${name} (${code})` : name || code;
    return [label, item.DaoChat ? `Dao chặt: ${text(item.DaoChat)}` : ''].filter(Boolean).join(' - ');
};
const responsibleUnitLabel = (defect) => {
    const unit = text(defect.TenDonViGayLoi || defect.TenDonViGayLoiSnapshot);
    const department = text(defect.TenBoPhanGayLoi || defect.TenBoPhanGayLoiSnapshot);
    if (unit && department && normalize(unit) !== normalize(department)) return `${unit} - ${department}`;
    return unit || department || text(defect.MaBoPhanGayLoi || defect.MaBoPhanGayLoiSnapshot);
};
const errorColumn = (defect) => {
    const value = normalize([
        defect.MaNhomLoi || defect.MaNhom, defect.TenNhomLoi || defect.TenNhom,
        defect.MaLoi, defect.TenLoi
    ].filter(Boolean).join(' '));
    if (value.includes('cat tao phoi') || value.includes('cat phoi')) return 0;
    if (value.includes('det')) return 1;
    if (value.includes('trang')) return 2;
    if (value.includes('don vi') || value.includes('may')) return 3;
    if (value.includes('cong nghe')) return 4;
    return 5;
};
const traceDefects = (defects, trace) => {
    if (!trace) return defects;
    const traceKey = text(trace.ManualLxvtKey || trace.manualLxvtKey);
    const issueNumber = text(trace.SoLenhXuatVT || trace.soLenhXuatVT);
    return defects.filter((defect) => {
        const defectKey = text(defect.ManualLxvtKey || defect.manualLxvtKey);
        return traceKey && defectKey ? traceKey === defectKey : text(defect.SoLenhXuatVT) === issueNumber;
    });
};

const COLUMN_WIDTHS = [5, 16, 12, 16, 10, 28, 11, 11, 14, 14, 10, 18, 13, 13, 18, 16, 11, 11, 11, 11, 11, 11, 22, 16, 12];
const HEADER_ROW_1 = [
    'TT', 'Đơn vị cắt/may/bao gói', 'Ngày nhập trả lỗi', 'Đơn hàng', 'Số lượng (bộ)',
    'Tên VT, BTP, TP (chi tiết lỗi)', 'Đơn vị (cái, kg) chi tiết', 'Số lượng', 'LXVT',
    'Lot sản xuất', 'Dấu tuần', 'TEM TRUY NGUYÊN', '', '', '', '',
    'CÁC DẠNG LỖI - TRÁCH NHIỆM', '', '', '', '', '', '',
    'SỐ LƯỢNG CẦN CẤP BỔ SUNG', ''
];
const HEADER_ROW_2 = [
    '', '', '', '', '', '', '', '', '', '', '', 'Đơn vị tạo phôi', 'Ngày tạo phôi', 'Tổ SX',
    'Công nhân SX', 'KCS', 'Do cắt tạo phôi', 'Lỗi dệt', 'Lỗi trắng', 'Lỗi do đơn vị may',
    'Lỗi công nghệ', 'Lỗi khác', 'Đơn vị gây ra lỗi', 'Mã VT', 'Số mét'
];

const buildDoiTraSummaryWorkbook = ({ items = [], defects = [] } = {}) => {
    const defectsByPhoi = new Map();
    defects.forEach((defect) => {
        const key = Number(defect.PhoiId);
        if (!defectsByPhoi.has(key)) defectsByPhoi.set(key, []);
        defectsByPhoi.get(key).push(defect);
    });

    const dataRows = [];
    const itemRanges = [];
    items.forEach((item, itemIndex) => {
        const itemDefects = defectsByPhoi.get(Number(item.PhoiId)) || [];
        const traces = parseIssueTraceabilities(item);
        const effectiveTraces = traces.length ? traces : [null];
        const start = dataRows.length;
        effectiveTraces.forEach((trace, traceIndex) => {
            const scopedDefects = traceDefects(itemDefects, trace);
            const errorQuantities = [0, 0, 0, 0, 0, 0];
            scopedDefects.forEach((defect) => {
                const index = errorColumn(defect);
                errorQuantities[index] += Number(defect.SoLuongLoi || 0);
            });
            const responsibleUnits = [...new Set(scopedDefects.map(responsibleUnitLabel).filter(Boolean))];
            const isFirst = traceIndex === 0;
            const appliesB7 = item.RequiresB7 !== false && Number(item.RequiresB7) !== 0;
            dataRows.push([
                isFirst ? itemIndex + 1 : '', isFirst ? productionDepartmentLabel(item) : '',
                isFirst ? dateText(item.NgayLap) : '', isFirst ? text(item.OrderCode) : '',
                isFirst ? numberOrBlank(item.SoLuongBoLoiSnapshot ?? defectiveSetQuantity(item)) : '',
                isFirst ? materialLabel(item) : '', isFirst ? text(item.TenDonViTinh) : '',
                isFirst ? numberOrBlank(item.SoLuongDoiTra) : '',
                text(trace?.SoLenhXuatVT || item.LenhXuatVatTu),
                text(trace?.LotSanXuat || item.ExpectedProductionLot || item.LotSanXuat),
                text(trace?.DauTuan || item.DauTuan), text(trace?.TenDonViTaoPhoi || item.TenDonViTaoPhoi),
                dateText(trace?.NgayTaoPhoi || item.NgayTaoPhoi), text(trace?.ToSanXuat || item.ToSanXuat),
                text(trace?.CongNhanSanXuat || item.CongNhanSanXuat), text(item.TenKcs),
                ...errorQuantities.map((value) => value || ''), responsibleUnits.join('\n'),
                isFirst ? (appliesB7 ? text(item.MaVatTu) : 'Không áp dụng') : '',
                isFirst && appliesB7 ? numberOrBlank(item.SoLuongDoiTra) : ''
            ]);
        });
        itemRanges.push({ start, end: dataRows.length - 1 });
    });

    const rows = [
        ['Z76', 'BẢNG TỔNG HỢP PHÔI, BTP LỖI ĐỔI TRẢ', ...Array(21).fill(''), 'Mã số: BM.01-HĐ.01-QT.03-B3', ''],
        ['', '', ...Array(21).fill(''), 'Ngày hiệu lực: 18/09/2026', ''],
        ['', '', ...Array(21).fill(''), 'Phiên bản: 01', ''],
        [...Array(23).fill(''), 'Số TT:', ''], HEADER_ROW_1, HEADER_ROW_2, ...dataRows,
        [...Array(23).fill(''), 'Ngày     tháng     năm', ''],
        ['BÊN GIAO', ...Array(11).fill(''), 'BÊN NHẬN', ...Array(12).fill('')]
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const merges = [
        { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } }, { s: { r: 0, c: 1 }, e: { r: 2, c: 22 } },
        { s: { r: 0, c: 23 }, e: { r: 0, c: 24 } }, { s: { r: 1, c: 23 }, e: { r: 1, c: 24 } },
        { s: { r: 2, c: 23 }, e: { r: 2, c: 24 } },
        ...Array.from({ length: 11 }, (_, c) => ({ s: { r: 4, c }, e: { r: 5, c } })),
        { s: { r: 4, c: 11 }, e: { r: 4, c: 15 } }, { s: { r: 4, c: 16 }, e: { r: 4, c: 22 } },
        { s: { r: 4, c: 23 }, e: { r: 4, c: 24 } }
    ];
    itemRanges.filter(({ start, end }) => end > start).forEach(({ start, end }) => {
        [0, 1, 2, 3, 4, 5, 6, 7, 23, 24].forEach((c) => merges.push({ s: { r: 6 + start, c }, e: { r: 6 + end, c } }));
    });
    worksheet['!merges'] = merges;
    worksheet['!cols'] = COLUMN_WIDTHS.map((wch) => ({ wch }));
    worksheet['!rows'] = rows.map((_, index) => ({ hpt: index < 3 ? 22 : index === 4 || index === 5 ? 38 : 28 }));
    worksheet['!autofilter'] = { ref: `A5:Y${Math.max(6, 6 + dataRows.length)}` };
    worksheet['!freeze'] = { xSplit: 0, ySplit: 6 };
    worksheet['!margins'] = { left: 0.2, right: 0.2, top: 0.2, bottom: 0.2, header: 0, footer: 0 };
    worksheet['!pageSetup'] = { orientation: 'landscape', paperSize: 9, fitToWidth: 1, fitToHeight: 0 };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TongHopDoiPhoi');
    return workbook;
};

const writeDoiTraSummaryExcel = (data) => XLSX.write(buildDoiTraSummaryWorkbook(data), {
    type: 'buffer', bookType: 'xlsx', cellDates: true
});

module.exports = { buildDoiTraSummaryWorkbook, writeDoiTraSummaryExcel };
