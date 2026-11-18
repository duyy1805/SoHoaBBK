import { forwardRef } from 'react';
import { doiTraDefectiveSetQuantity } from '../doiTraPhoiLoi.utils';

const ROWS_PER_PAGE = 12;
const ERROR_COLUMNS = [
    { key: 'cat_phoi', label: 'Do cắt tạo phôi' },
    { key: 'det', label: 'Lỗi dệt' },
    { key: 'trang', label: 'Lỗi trắng' },
    { key: 'may', label: 'Lỗi do đơn vị may' },
    { key: 'cong_nghe', label: 'Lỗi công nghệ' },
    { key: 'khac', label: 'Lỗi khác' }
];

const text = (value) => String(value ?? '').trim();
const normalize = (value) => text(value).normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return text(value).slice(0, 10);
    return date.toLocaleDateString('vi-VN');
};
const formatQuantity = (value) => {
    if (value === '' || value == null || !Number.isFinite(Number(value))) return '';
    return Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 6 });
};
const materialLabel = (item) => {
    const name = text(item?.TenLoaiPhoi);
    const code = text(item?.MaVatTu);
    const daoChat = text(item?.DaoChat);
    const label = name && code ? `${name} (${code})` : name || code;
    return [label, daoChat ? `Dao chặt: ${daoChat}` : ''].filter(Boolean).join(' - ');
};
const responsibleUnitLabel = (defect) => {
    const unit = text(defect?.TenDonViGayLoi);
    const department = text(defect?.TenBoPhanGayLoi);
    if (unit && department && normalize(unit) !== normalize(department)) return `${unit} - ${department}`;
    return unit || department || text(defect?.MaBoPhanGayLoi);
};
const errorColumn = (defect) => {
    const value = normalize([
        defect.MaNhomLoi, defect.TenNhomLoi, defect.MaLoi, defect.TenLoi
    ].filter(Boolean).join(' '));
    if (value.includes('cat tao phoi') || value.includes('cat phoi')) return 'cat_phoi';
    if (value.includes('det')) return 'det';
    if (value.includes('trang')) return 'trang';
    if (value.includes('don vi') || value.includes('may')) return 'may';
    if (value.includes('cong nghe')) return 'cong_nghe';
    return 'khac';
};
const chunkRows = (rows) => {
    if (!rows.length) return [[]];
    const pages = [];
    for (let index = 0; index < rows.length; index += ROWS_PER_PAGE) {
        pages.push(rows.slice(index, index + ROWS_PER_PAGE));
    }
    return pages;
};
const mergedRowSpans = (rows, valueOf) => {
    const spans = new Map();
    let index = 0;
    while (index < rows.length) {
        const value = text(valueOf(rows[index]));
        let end = index + 1;
        if (value) {
            while (end < rows.length && text(valueOf(rows[end])) === value) end += 1;
        }
        spans.set(index, end - index);
        for (let hidden = index + 1; hidden < end; hidden += 1) spans.set(hidden, 0);
        index = end;
    }
    return spans;
};
const groupRowsByOrder = (rows) => {
    const groups = new Map();
    const orderedGroups = [];
    rows.forEach((row) => {
        const key = normalize(row.ticket?.OrderCode);
        if (!key) {
            orderedGroups.push([row]);
            return;
        }
        if (!groups.has(key)) {
            const group = [];
            groups.set(key, group);
            orderedGroups.push(group);
        }
        groups.get(key).push(row);
    });
    return orderedGroups.flat();
};

const DoiTraPhoiLoiSummaryPrintTemplate = forwardRef(function DoiTraPhoiLoiSummaryPrintTemplate(
    { data },
    ref
) {
    const tickets = data?.tickets || [];
    const phoiItems = data?.phoiItems || [];
    const dinhMucItems = data?.dinhMucItems || [];
    const receiptItems = data?.phieuNhapBtpItems || [];
    const ticketById = new Map(tickets.map((item) => [Number(item.Id), item]));
    const quotaByMaterial = new Map(dinhMucItems.map((item) => [
        `${Number(item.PhieuId)}:${Number(item.SourceVatTuId)}`, item
    ]));
    const rows = groupRowsByOrder(phoiItems.map((item) => {
        const ticket = ticketById.get(Number(item.PhieuId)) || {};
        const quota = quotaByMaterial.get(`${Number(item.PhieuId)}:${Number(item.SourceVatTuId)}`) || {};
        const errorQuantities = new Map(ERROR_COLUMNS.map((column) => [column.key, 0]));
        (item.defects || []).forEach((defect) => {
            const key = errorColumn(defect);
            errorQuantities.set(key, (errorQuantities.get(key) || 0) + Number(defect.SoLuongLoi || 0));
        });
        const responsibleUnits = [...new Set((item.defects || [])
            .map(responsibleUnitLabel).filter(Boolean))];
        const issueTraceabilities = item.issueTraceabilities || [];
        const materialIssueNumbers = issueTraceabilities.length
            ? issueTraceabilities.map((trace) => text(trace.SoLenhXuatVT)).filter(Boolean)
            : [...new Set((item.defects || []).map((defect) => text(defect.SoLenhXuatVT)).filter(Boolean))];
        const traceLines = (field, formatter = (value) => value) => issueTraceabilities
            .map((trace) => {
                const value = formatter(trace[field]);
                return value || '';
            }).join('\n');
        return { ...item, ticket, quota, errorQuantities, responsibleUnits, materialIssueNumbers, issueTraceabilities, traceLines };
    }));
    const pages = chunkRows(rows);

    const cell = { border: '1px solid #000', padding: '2px 1px', verticalAlign: 'middle', overflowWrap: 'anywhere' };
    const headerCell = { ...cell, textAlign: 'center', fontWeight: 700, lineHeight: 1.08 };

    return (
        <div ref={ref} className="dtpl-summary-preview" style={{ fontFamily: 'Times New Roman, serif', color: '#000', background: '#e5e7eb', padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <style>{`
                @page { size: A4 landscape; margin: 5mm; }
                @media print {
                    body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .dtpl-summary-preview { padding: 0 !important; background: transparent !important; display: block !important; }
                    .dtpl-summary-page { width: 100% !important; min-height: auto !important; padding: 0 !important; box-shadow: none !important; margin: 0 !important; }
                }
            `}</style>
            {pages.map((pageRows, pageIndex) => {
                const padded = [...pageRows];
                const pageTicketIds = new Set(pageRows.map((row) => Number(row.ticket?.Id || row.PhieuId)));
                const pageReceipts = receiptItems.filter((item) => item.TrangThai === 'ACTIVE'
                    && pageTicketIds.has(Number(item.PhieuId)));
                const orderRowSpans = mergedRowSpans(pageRows, (row) => row.ticket?.OrderCode);
                while (padded.length < ROWS_PER_PAGE) padded.push(null);
                return (
                    <section
                        className="dtpl-summary-page"
                        key={pageIndex}
                        style={{
                            width: '297mm', minHeight: '210mm', boxSizing: 'border-box',
                            background: '#fff', padding: '5mm', margin: 0,
                            boxShadow: '0 2px 14px rgba(0,0,0,.16)', pageBreakAfter: pageIndex < pages.length - 1 ? 'always' : 'auto',
                            fontSize: '7pt'
                        }}
                    >
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <tbody>
                                <tr>
                                    <td rowSpan={3} style={{ ...cell, width: '11%', textAlign: 'center' }}><img src="/logo.png" alt="Z76" style={{ maxWidth: '90%', maxHeight: 48, objectFit: 'contain' }} /></td>
                                    <td rowSpan={3} style={{ ...cell, width: '69%', textAlign: 'center', fontWeight: 800, fontSize: '14pt' }}>BẢNG TỔNG HỢP PHÔI, BTP LỖI ĐỔI TRẢ</td>
                                    <td style={{ ...cell, width: '20%' }}>Mã số: BM.01-HĐ.01-QT.03-B3</td>
                                </tr>
                                <tr><td style={cell}>Ngày hiệu lực: 18/09/2026</td></tr>
                                <tr><td style={cell}>Phiên bản: 01</td></tr>
                            </tbody>
                        </table>
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <tbody><tr><td style={{ border: 0, height: 24 }}></td><td style={{ ...cell, width: '20%', fontWeight: 700, fontStyle: 'italic', textAlign: 'center' }}>Số TT:</td></tr></tbody>
                        </table>
                        {pageReceipts.length > 0 && <div style={{ border: '1px solid #000', borderBottom: 0, padding: '3px 5px', fontSize: '6.5pt', lineHeight: 1.25 }}>
                            <strong>Phiếu nhập BTP lỗi: </strong>
                            {pageReceipts.map((item) => [
                                item.SoPhieuNhapBtp,
                                [item.MaBtp, item.TenBtp].filter(Boolean).join(' - '),
                                `SL ${formatQuantity(item.SoLuongBtpLoi)}`,
                                item.TenQuyTrinhSanXuat,
                                item.TenKhoNhap,
                                item.ErpTrangThai === 0 ? 'Đang lập' : `ERP ${item.ErpTrangThai}`
                            ].filter(Boolean).join(' · ')).join(' | ')}
                        </div>}
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '6.5pt' }}>
                            <colgroup>
                                {[2, 5, 4, 5, 4, 7, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 6, 5, 4, 8, 9].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}
                            </colgroup>
                            <thead>
                                <tr style={{ height: 30 }}>
                                    <th rowSpan={2} style={headerCell}>TT</th>
                                    <th rowSpan={2} style={headerCell}>Đơn vị cắt/may/<br />bao gói</th>
                                    <th rowSpan={2} style={headerCell}>Ngày nhập<br />trả lỗi</th>
                                    <th rowSpan={2} style={headerCell}>Đơn hàng</th>
                                    <th rowSpan={2} style={{ ...headerCell, background: '#fff200' }}>Số lượng<br />(bộ)</th>
                                    <th rowSpan={2} style={headerCell}>Tên VT, BTP,<br />TP (chi tiết lỗi)</th>
                                    <th rowSpan={2} style={headerCell}>Đơn vị<br />(cái, kg)<br />chi tiết</th>
                                    <th rowSpan={2} style={headerCell}>Số lượng</th>
                                    <th rowSpan={2} style={headerCell}>LXVT</th>
                                    <th rowSpan={2} style={headerCell}>Lot<br />sản xuất</th>
                                    <th rowSpan={2} style={headerCell}>Dấu<br />tuần</th>
                                    <th colSpan={5} style={headerCell}>TEM TRUY NGUYÊN</th>
                                    <th colSpan={7} style={headerCell}>CÁC DẠNG LỖI - TRÁCH NHIỆM</th>
                                    <th colSpan={2} style={headerCell}>KÝ XÁC NHẬN KHI KIỂM<br />ĐẦU VÀO XÁC NHẬN</th>
                                    <th colSpan={2} style={headerCell}>SỐ LƯỢNG<br />CẦN CẤP BỔ SUNG</th>
                                </tr>
                                <tr style={{ height: 54 }}>
                                    {['Đơn vị tạo phôi', 'Ngày tạo phôi', 'Tổ SX', 'Công nhân SX', 'KCS'].map((label) => <th key={label} style={headerCell}>{label}</th>)}
                                    {ERROR_COLUMNS.map((column) => <th key={column.key} style={headerCell}>{column.label}</th>)}
                                    <th style={headerCell}>Đơn vị gây ra lỗi</th>
                                    {['KCS', 'Kho', 'Mã VT', 'Số mét'].map((label, index) => <th key={`${label}-${index}`} style={headerCell}>{label}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {padded.map((row, rowIndex) => {
                                    const orderRowSpan = row ? orderRowSpans.get(rowIndex) : 1;
                                    return <tr key={row ? row.Id : `empty-${rowIndex}`} style={{ height: 28 }}>
                                        <td style={{ ...cell, textAlign: 'center' }}>{row ? pageIndex * ROWS_PER_PAGE + rowIndex + 1 : ''}</td>
                                        <td style={cell}>{row ? row.ticket.DepartmentName || row.ticket.UnitName || '' : ''}</td>
                                        <td style={{ ...cell, textAlign: 'center' }}>{row ? formatDate(row.ticket.NgayLap) : ''}</td>
                                        {orderRowSpan !== 0 && <td rowSpan={orderRowSpan} style={{ ...cell, textAlign: 'center' }}>{row?.ticket?.OrderCode || ''}</td>}
                                        <td style={{ ...cell, textAlign: 'center' }}>{row ? formatQuantity(row.quota.SoLuongBoLoiSnapshot ?? doiTraDefectiveSetQuantity(row)) : ''}</td>
                                        <td style={cell}>{row ? materialLabel(row) : ''}</td>
                                        <td style={{ ...cell, textAlign: 'center' }}>{row?.quota?.TenDonViTinh || ''}</td>
                                        <td style={{ ...cell, textAlign: 'center' }}>{row ? formatQuantity(row.quota.SoLuongDoiTra) : ''}</td>
                                        <td style={{ ...cell, whiteSpace: 'pre-wrap' }}>{row?.materialIssueNumbers?.join('\n') || row?.LenhXuatVatTu || ''}</td>
                                        <td style={{ ...cell, textAlign: 'center', whiteSpace: 'pre-wrap' }}>{row?.traceLines?.('LotSanXuat') || (row ? row.ticket.ExpectedProductionLot || row.LotSanXuat || '' : '')}</td>
                                        <td style={{ ...cell, textAlign: 'center', whiteSpace: 'pre-wrap' }}>{row?.traceLines?.('DauTuan') || row?.DauTuan || ''}</td>
                                        <td style={{ ...cell, whiteSpace: 'pre-wrap' }}>{row?.traceLines?.('TenDonViTaoPhoi') || row?.TenDonViTaoPhoi || ''}</td>
                                        <td style={{ ...cell, textAlign: 'center', whiteSpace: 'pre-wrap' }}>{row?.traceLines?.('NgayTaoPhoi', formatDate) || formatDate(row?.NgayTaoPhoi)}</td>
                                        <td style={{ ...cell, whiteSpace: 'pre-wrap' }}>{row?.traceLines?.('ToSanXuat') || row?.ToSanXuat || ''}</td>
                                        <td style={{ ...cell, whiteSpace: 'pre-wrap' }}>{row?.traceLines?.('CongNhanSanXuat') || row?.CongNhanSanXuat || ''}</td>
                                        <td style={cell}>{row?.TenKcs || ''}</td>
                                        {ERROR_COLUMNS.map((column) => <td key={column.key} style={{ ...cell, textAlign: 'center' }}>{row ? formatQuantity(row.errorQuantities.get(column.key) || '') : ''}</td>)}
                                        <td style={{ ...cell, whiteSpace: 'pre-wrap' }}>{row?.responsibleUnits?.join('\n') || ''}</td>
                                        {Array.from({ length: 2 }, (_, index) => <td key={index} style={cell}></td>)}
                                        <td style={{ ...cell, textAlign: 'center' }}>{row ? (row.ticket.RequiresB7 === false || Number(row.ticket.RequiresB7) === 0 ? 'Không áp dụng' : row.MaVatTu || '') : ''}</td>
                                        <td style={{ ...cell, textAlign: 'center' }}>{row && row.ticket.RequiresB7 !== false && Number(row.ticket.RequiresB7) !== 0 ? formatQuantity(row.quota.SoLuongDoiTra) : ''}</td>
                                    </tr>;
                                })}
                            </tbody>
                        </table>
                        <div style={{ textAlign: 'right', fontStyle: 'italic', margin: '6px 16% 1px 0', fontSize: '8pt' }}>Ngày&nbsp;&nbsp;&nbsp;&nbsp; tháng&nbsp;&nbsp;&nbsp;&nbsp; năm</div>
                        <table style={{ width: '100%', tableLayout: 'fixed', textAlign: 'center', fontSize: '10pt', fontWeight: 800 }}><tbody><tr><td>BÊN GIAO</td><td>BÊN NHẬN</td></tr></tbody></table>
                    </section>
                );
            })}
        </div>
    );
});

export default DoiTraPhoiLoiSummaryPrintTemplate;
