import { forwardRef } from 'react';

const ROWS_PER_PAGE = 12;
const text = (value) => String(value ?? '').trim();
const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return text(value).slice(0, 10);
    return date.toLocaleDateString('vi-VN');
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
    const groups = data?.defectGroups || [];
    const ticketById = new Map(tickets.map((item) => [Number(item.Id), item]));
    const rows = phoiItems.map((item) => {
        const ticket = ticketById.get(Number(item.PhieuId)) || {};
        const quantities = new Map();
        (item.defects || []).forEach((defect) => {
            const key = Number(defect.NhomLoiId);
            quantities.set(key, (quantities.get(key) || 0) + Number(defect.SoLuongLoi || 0));
        });
        return { ...item, ticket, quantities };
    });
    const pages = chunkRows(rows);
    const productionUnits = [...new Set(tickets.map((item) => item.DepartmentName || item.UnitName).filter(Boolean))].join(', ');
    const groupWidth = groups.length ? `${Math.max(3.8, 33 / groups.length)}%` : '4%';

    const cell = { border: '1px solid #000', padding: '3px 2px', verticalAlign: 'middle', overflowWrap: 'anywhere' };
    const headerCell = { ...cell, textAlign: 'center', fontWeight: 700 };

    return (
        <div ref={ref} className="dtpl-summary-preview" style={{ fontFamily: 'Times New Roman, serif', color: '#000', background: '#e5e7eb', padding: 24 }}>
            <style>{`
                @page { size: A4 landscape; margin: 8mm 10mm; }
                @media print {
                    body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .dtpl-summary-preview { padding: 0 !important; background: transparent !important; }
                    .dtpl-summary-page {
                        width: 100% !important;
                        min-height: auto !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                    }
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
                            background: '#fff', padding: '8mm 10mm', margin: '0 auto 20px', position: 'relative',
                            boxShadow: '0 2px 14px rgba(0,0,0,.16)', pageBreakAfter: pageIndex < pages.length - 1 ? 'always' : 'auto',
                            fontSize: '8pt'
                        }}
                    >
                        {data?.isDraft !== false && (
                            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', zIndex: 0 }}>
                                <div style={{ transform: 'rotate(-28deg)', fontSize: '54pt', fontWeight: 800, color: 'rgba(190,0,0,.10)' }}>BẢN NHÁP</div>
                            </div>
                        )}
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                <tbody>
                                    <tr>
                                        <td rowSpan={3} style={{ ...cell, width: '15%', textAlign: 'center' }}><img src="/logo.png" alt="Z76" style={{ maxWidth: '88%', maxHeight: 54, objectFit: 'contain' }} /></td>
                                        <td rowSpan={3} style={{ ...cell, width: '51%', textAlign: 'center', fontWeight: 800, fontSize: '16pt' }}>PHIẾU TỔNG HỢP VT/BTP/TP LỖI ĐỔI TRẢ</td>
                                        <td style={{ ...cell, width: '34%' }}>Mã số: BM.02-HĐ.01-QT.03-B3</td>
                                    </tr>
                                    <tr><td style={cell}>Ngày hiệu lực: 01/09/2026</td></tr>
                                    <tr><td style={cell}>Phiên bản: 02</td></tr>
                                </tbody>
                            </table>
                            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                <tbody><tr><td style={{ ...cell, height: 28, fontWeight: 700, fontSize: '11pt' }}>Đơn vị sản xuất: {productionUnits}</td><td style={{ ...cell, width: '32%', fontWeight: 700 }}>Số phiếu: Chưa cấp</td></tr></tbody>
                            </table>
                            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '7pt' }}>
                                <thead>
                                    <tr>
                                        <th rowSpan={2} style={{ ...headerCell, width: '2.5%' }}>TT</th>
                                        <th rowSpan={2} style={{ ...headerCell, width: '12%' }}>Tên VT/BTP/SP</th>
                                        <th rowSpan={2} style={{ ...headerCell, width: '6%' }}>Đơn hàng</th>
                                        <th rowSpan={2} style={{ ...headerCell, width: '5.5%' }}>LOT SX</th>
                                        <th rowSpan={2} style={{ ...headerCell, width: '5.5%' }}>LXVT</th>
                                        <th rowSpan={2} style={{ ...headerCell, width: '4%' }}>Số lượng</th>
                                        <th rowSpan={2} style={{ ...headerCell, width: '4.5%' }}>Dấu tuần</th>
                                        <th colSpan={5} style={headerCell}>TEM TRUY NGUYÊN</th>
                                        <th colSpan={Math.max(groups.length, 1)} style={headerCell}>CÁC DẠNG LỖI</th>
                                    </tr>
                                    <tr>
                                        <th style={{ ...headerCell, width: '5.5%' }}>Đơn vị tạo phôi</th>
                                        <th style={{ ...headerCell, width: '4.5%' }}>Ngày tạo phôi</th>
                                        <th style={{ ...headerCell, width: '4%' }}>Tổ SX</th>
                                        <th style={{ ...headerCell, width: '6%' }}>Công nhân SX</th>
                                        <th style={{ ...headerCell, width: '5%' }}>KCS</th>
                                        {groups.length ? groups.map((group) => <th key={group.Id} style={{ ...headerCell, width: groupWidth }}>{group.TenNhom}</th>) : <th style={headerCell}>---</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {padded.map((row, rowIndex) => (
                                        <tr key={row ? row.Id : `empty-${rowIndex}`} style={{ height: 29 }}>
                                            <td style={{ ...cell, textAlign: 'center' }}>{row ? pageIndex * ROWS_PER_PAGE + rowIndex + 1 : ''}</td>
                                            <td style={cell}>{row ? [row.TenLoaiPhoi, row.MaVatTu, row.QuyCachVatTu].filter(Boolean).join(' - ') : ''}</td>
                                            <td style={{ ...cell, textAlign: 'center' }}>{row?.ticket?.OrderCode || ''}</td>
                                            <td style={{ ...cell, textAlign: 'center' }}>{row?.LotSanXuat || row?.ticket?.PlanNo || row?.ticket?.PlanID || ''}</td>
                                            <td style={{ ...cell, textAlign: 'center' }}>{row?.LenhXuatVatTu || ''}</td>
                                            <td style={{ ...cell, textAlign: 'center' }}>{row ? Number(row.SoLuongPhoiLoi || 0).toLocaleString('vi-VN') : ''}</td>
                                            <td style={{ ...cell, textAlign: 'center' }}>{row?.DauTuan || ''}</td>
                                            <td style={cell}>{row?.TenDonViTaoPhoi || ''}</td>
                                            <td style={{ ...cell, textAlign: 'center' }}>{formatDate(row?.NgayTaoPhoi)}</td>
                                            <td style={cell}>{row?.ToSanXuat || ''}</td>
                                            <td style={cell}>{row?.CongNhanSanXuat || ''}</td>
                                            <td style={cell}>{row?.TenKcs || ''}</td>
                                            {groups.length ? groups.map((group) => <td key={group.Id} style={{ ...cell, textAlign: 'center' }}>{row && row.quantities.get(Number(group.Id)) ? row.quantities.get(Number(group.Id)).toLocaleString('vi-VN') : ''}</td>) : <td style={cell}></td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ textAlign: 'right', fontStyle: 'italic', margin: '7px 8% 2px 0' }}>Ngày&nbsp;&nbsp;&nbsp;&nbsp; tháng&nbsp;&nbsp;&nbsp;&nbsp; năm</div>
                            <table style={{ width: '100%', tableLayout: 'fixed', textAlign: 'center', fontSize: '11pt', fontWeight: 800 }}><tbody><tr><td>BỘ PHẬN KHO</td><td>ĐƠN VỊ CẮT PHÔI</td><td>ĐƠN VỊ SẢN XUẤT</td><td>KCS</td></tr></tbody></table>
                        </div>
                    </section>
                );
            })}
        </div>
    );
});

export default DoiTraPhoiLoiSummaryPrintTemplate;
