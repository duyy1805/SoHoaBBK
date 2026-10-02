import { forwardRef } from 'react';

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
    const pages = [];
    const source = rows.length ? rows : [{}];
    for (let index = 0; index < source.length; index += ROWS_PER_PAGE) {
        pages.push(source.slice(index, index + ROWS_PER_PAGE));
    }
    return pages;
};

const DoiTraPhoiLoiSummaryPrintTemplate = forwardRef(function DoiTraPhoiLoiSummaryPrintTemplate(
    { data },
    ref
) {
    const tickets = data?.tickets || [];
    const phoiItems = data?.phoiItems || [];
    const dinhMucItems = data?.dinhMucItems || [];
    const ticketById = new Map(tickets.map((item) => [Number(item.Id), item]));
    const quotaByMaterial = new Map(dinhMucItems.map((item) => [
        `${Number(item.PhieuId)}:${Number(item.SourceVatTuId)}`, item
    ]));
    const rows = phoiItems.map((item) => {
        const ticket = ticketById.get(Number(item.PhieuId)) || {};
        const quota = quotaByMaterial.get(`${Number(item.PhieuId)}:${Number(item.SourceVatTuId)}`) || {};
        const errorQuantities = new Map(ERROR_COLUMNS.map((column) => [column.key, 0]));
        (item.defects || []).forEach((defect) => {
            const key = errorColumn(defect);
            errorQuantities.set(key, (errorQuantities.get(key) || 0) + Number(defect.SoLuongLoi || 0));
        });
        return { ...item, ticket, quota, errorQuantities };
    });
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
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '6.5pt' }}>
                            <colgroup>
                                {[2, 5, 4, 8, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 5, 4, 5, 6, 5, 6].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}
                            </colgroup>
                            <thead>
                                <tr style={{ height: 30 }}>
                                    <th rowSpan={2} style={headerCell}>TT</th>
                                    <th rowSpan={2} style={headerCell}>Đơn vị cắt/may/<br />bao gói</th>
                                    <th rowSpan={2} style={headerCell}>Ngày nhập</th>
                                    <th rowSpan={2} style={headerCell}>Tên VT, BTP</th>
                                    <th rowSpan={2} style={{ ...headerCell, background: '#fff200' }}>Số lượng<br />(bộ)</th>
                                    <th rowSpan={2} style={headerCell}>Đơn vị<br />(cái, kg)<br />chi tiết</th>
                                    <th rowSpan={2} style={headerCell}>Số lượng</th>
                                    <th colSpan={5} style={headerCell}>TEM TRUY NGUYÊN</th>
                                    <th colSpan={6} style={headerCell}>CÁC DẠNG LỖI</th>
                                    <th colSpan={3} style={headerCell}>KÝ XÁC NHẬN KHI KIỂM<br />ĐẦU VÀO XÁC NHẬN</th>
                                    <th colSpan={3} style={headerCell}>KÝ XÁC KHI ĐỔI TRẢ<br /><em>(Ghi ngày đổi trả)</em></th>
                                </tr>
                                <tr style={{ height: 54 }}>
                                    {['Đơn vị tạo phôi', 'Ngày tạo phôi', 'Tổ SX', 'Công nhân SX', 'KCS'].map((label) => <th key={label} style={headerCell}>{label}</th>)}
                                    {ERROR_COLUMNS.map((column) => <th key={column.key} style={headerCell}>{column.label}</th>)}
                                    {['KCS', 'Kho', 'Đơn vị may', 'Kho BTP', 'Đơn vị tạo phôi', 'Đơn vị may'].map((label, index) => <th key={`${label}-${index}`} style={headerCell}>{label}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {padded.map((row, rowIndex) => (
                                    <tr key={row ? row.Id : `empty-${rowIndex}`} style={{ height: 28 }}>
                                        <td style={{ ...cell, textAlign: 'center' }}>{row ? pageIndex * ROWS_PER_PAGE + rowIndex + 1 : ''}</td>
                                        <td style={cell}>{row ? row.ticket.DepartmentName || row.ticket.UnitName || '' : ''}</td>
                                        <td style={{ ...cell, textAlign: 'center' }}>{row ? formatDate(row.ticket.NgayLap) : ''}</td>
                                        <td style={cell}>{row ? [row.TenLoaiPhoi, row.MaVatTu, row.QuyCachVatTu].filter(Boolean).join(' - ') : ''}</td>
                                        <td style={{ ...cell, textAlign: 'center' }}>{row ? formatQuantity(row.quota.SoLuongBoLoiSnapshot ?? row.SoLuongPhoiLoi) : ''}</td>
                                        <td style={{ ...cell, textAlign: 'center' }}>{row?.quota?.TenDonViTinh || ''}</td>
                                        <td style={{ ...cell, textAlign: 'center' }}>{row ? formatQuantity(row.quota.SoLuongDoiTra) : ''}</td>
                                        <td style={cell}>{row?.TenDonViTaoPhoi || ''}</td>
                                        <td style={{ ...cell, textAlign: 'center' }}>{formatDate(row?.NgayTaoPhoi)}</td>
                                        <td style={cell}>{row?.ToSanXuat || ''}</td>
                                        <td style={cell}>{row?.CongNhanSanXuat || ''}</td>
                                        <td style={cell}>{row?.TenKcs || ''}</td>
                                        {ERROR_COLUMNS.map((column) => <td key={column.key} style={{ ...cell, textAlign: 'center' }}>{row ? formatQuantity(row.errorQuantities.get(column.key) || '') : ''}</td>)}
                                        {Array.from({ length: 6 }, (_, index) => <td key={index} style={cell}></td>)}
                                    </tr>
                                ))}
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
