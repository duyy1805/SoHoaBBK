import React from 'react';
// ============================================================
// SxbtPrintTemplate — Phiếu kiểm tra sản xuất bổ trợ (A4 đứng)
// Khớp mẫu: BM.01-HD.07-QT.03-B8
// ============================================================

const renderCheckbox = (checked) => (
    <span style={{
        width: '13px', height: '13px',
        border: '1px solid #000',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 'bold', lineHeight: 1,
        flexShrink: 0
    }}>
        {checked ? '✓' : ''}
    </span>
);

export const SxbtPrintTemplate = React.forwardRef(({
    phieu = {},
    btpItems = [],
    summary = null,
    defects = [],
    dynamicFields = [],
    confirmSteps = []
}, ref) => {
    if (!phieu) return null;

    // Helpers
    const dynVal = (name) => {
        const f = (dynamicFields || []).find(f => f.FieldName === name);
        return f?.FieldValue ?? '';
    };

    const dkThung = dynVal('DKVC_THUNG_SAN_XE');
    const dkNgoai = dynVal('DKVC_NGOAI_QUAN');

    const loaiMau = summary?.LoaiMau ?? '';
    const soMau = summary?.SoLuongMau ?? '';
    const tyLe = summary?.TyLe != null ? Number(summary.TyLe).toFixed(1) : '';
    const tyLeDat = summary?.TyLeDat != null ? Number(summary.TyLeDat).toFixed(1) : '';
    const tyLeCrit = summary?.TyLeLoiNghiemTrong != null ? Number(summary.TyLeLoiNghiemTrong).toFixed(1) : '';
    const tyLeMajor = summary?.TyLeLoiNangNhe != null ? Number(summary.TyLeLoiNangNhe).toFixed(1) : '';
    const ketLuan = phieu.KetLuan ?? '';

    const isFilledLotRow = (row = {}) =>
        (row.SoLuongNhap !== null && row.SoLuongNhap !== undefined && row.SoLuongNhap !== '') ||
        row.DauTuanGS1 ||
        row.ThuTu ||
        row.LxvtLot ||
        row.SoLotSX;

    const getLotRows = (item = {}) => {
        const rows = Array.isArray(item.LotRows) && item.LotRows.length > 0
            ? item.LotRows
            : [{
                DauTuanGS1: item.DauTuanGS1,
                ThuTu: item.ThuTu,
                LxvtLot: item.LxvtLot,
                SoLotSX: item.SoLotSX,
                SoLuongNhap: item.SoLuongNhap,
                SortOrder: 1
            }].filter(isFilledLotRow);

        return rows.length > 0 ? rows : [{}];
    };

    const btpPrintRows = btpItems.flatMap(item =>
        getLotRows(item).map((lotRow, lotIndex) => ({ item, lotRow, lotIndex }))
    );

    const formatQuantity = (value) =>
        value !== undefined && value !== null && value !== ''
            ? Number(value).toLocaleString('vi-VN')
            : '';

    const getDefectContextLabel = (defect = {}) => {
        const matched = btpPrintRows.find(({ item, lotRow }) =>
            Number(defect.BtpItemId) === Number(item.Id) &&
            Number(defect.BtpLotRowId) === Number(lotRow.Id)
        );
        if (!matched) return defect.BtpLotRowId ? '' : 'Chưa gắn dòng BTP';

        const { item, lotRow } = matched;
        const parts = [item.TenSanPham].filter(Boolean);
        if (item.SourceID_KeHoachSanXuat) parts.push(`KH #${item.SourceID_KeHoachSanXuat}`);
        if (lotRow.SoLotSX) parts.push(`Lot SX: ${lotRow.SoLotSX}`);
        if (lotRow.SoLuongNhap !== undefined && lotRow.SoLuongNhap !== null && lotRow.SoLuongNhap !== '') {
            parts.push(`SL nhập: ${formatQuantity(lotRow.SoLuongNhap)}`);
        }
        return parts.join(' - ');
    };

    const criticalDefects = defects.filter(d =>
        d.DefectType === 'CRITICAL' || d.DefectType === 'Nghiêm trọng'
    );
    const majorMinorDefects = defects.filter(d =>
        d.DefectType !== 'CRITICAL' && d.DefectType !== 'Nghiêm trọng'
    );

    const signatureLabels = {
        KCS: "KCS",
        SXBT: "BỘ PHẬN SXBT",
        KHO: "KHO",
        B8: "PHÒNG KIỂM NGHIỆM",
        B7: "PHÒNG CHẤT LƯỢNG",
        GD: "GIÁM ĐỐC"
    };

    const formatSignatureDate = (value) => {
        if (!value) return 'Ngày.................';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Ngày.................';
        return `Ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`;
    };

    const sxbtApprovalSignatures = [
        {
            key: 'KHO',
            title: signatureLabels.KHO,
            userName: dynVal('SxbtKhoConfirmedByName'),
            date: dynVal('SxbtKhoConfirmedAt'),
            signed: !!dynVal('SxbtKhoConfirmedBy')
        },
        {
            key: 'SXBT',
            title: signatureLabels.SXBT,
            userName: dynVal('SxbtConfirmedByName'),
            date: dynVal('SxbtConfirmedAt'),
            signed: !!dynVal('SxbtConfirmedBy')
        },
        {
            key: 'KCS',
            title: signatureLabels.KCS,
            userName: dynVal('SxbtKcsCompletedByName') || phieu.TenNguoiKiem || '',
            date: dynVal('SxbtKcsCompletedAt') || phieu.NgayKiem,
            signed: !!dynVal('SxbtKcsCompletedBy') || !!phieu.NgayKiem
        }
    ];

    const legacyConfirmedSteps = (confirmSteps || [])
        .filter((step) => step?.TrangThai === "DA_XAC_NHAN")
        .map((step, index) => ({
            key: step.Id || `${step.MaBoPhan}-${index}`,
            title: signatureLabels[step.MaBoPhan] || step.TenBoPhan || step.MaBoPhan || `Bộ phận ${index + 1}`,
            userName: step.TenNguoiXacNhan || '',
            date: step.ConfirmedAt,
            signed: true
        }));

    const signatureSlots = sxbtApprovalSignatures.some((slot) => slot.signed)
        ? sxbtApprovalSignatures
        : legacyConfirmedSteps;

    // CSS styles (inline + print rules)
    const s = {
        page: {
            backgroundColor: '#e5e7eb',
            padding: '32px',
            display: 'flex',
            justifyContent: 'center',
            fontFamily: '"Times New Roman", Times, serif',
            color: '#000',
            fontSize: '10pt',
        },
        paper: {
            width: '210mm',
            minHeight: '297mm',
            backgroundColor: '#fff',
            padding: '8mm 10mm',
            boxSizing: 'border-box',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '8px',
        },
        th: {
            border: '1px solid #000',
            padding: '3px 4px',
            fontWeight: 'bold',
            textAlign: 'center',
            fontSize: '9pt',
            backgroundColor: '#f0f0f0',
            verticalAlign: 'middle',
        },
        td: {
            border: '1px solid #000',
            padding: '2px 4px',
            fontSize: '9pt',
            verticalAlign: 'middle',
        },
        tdc: {
            border: '1px solid #000',
            padding: '2px 4px',
            fontSize: '9pt',
            verticalAlign: 'middle',
            textAlign: 'center',
        },
        defectContext: {
            marginTop: '2px',
            fontSize: '8pt',
            fontStyle: 'italic',
            color: '#333',
        },
        bold: { fontWeight: 'bold' },
        section: { fontWeight: 'bold', fontSize: '9.5pt', marginBottom: '5px', marginTop: '6px' },
        signedStamp: {
            display: 'inline-block',
            padding: '5px 10px',
            border: '2px solid #d32f2f',
            color: '#d32f2f',
            fontWeight: 'bold',
            fontSize: '11pt',
            transform: 'rotate(-8deg)',
            borderRadius: '4px',
            marginTop: '8px'
        }
    };

    // Empty rows helper
    const emptyRows = (count, cols) =>
        Array.from({ length: count }).map((_, i) => (
            <tr key={i}>
                {Array.from({ length: cols }).map((__, j) => (
                    <td key={j} style={{ ...s.td, height: '18px' }}></td>
                ))}
            </tr>
        ));

    return (
        <div ref={ref} style={s.page} className="sxbt-preview-bg">
            <style>{`
                @page {
                    size: A4 portrait;
                    margin: 8mm 10mm;
                }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
                    .sxbt-preview-bg {
                        padding: 0 !important;
                        background: transparent !important;
                        display: block !important;
                    }
                    .sxbt-paper {
                        box-shadow: none !important;
                        border: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        min-height: auto !important;
                    }
                    .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
                    thead { display: table-header-group; }
                    tr { page-break-inside: avoid !important; break-inside: avoid !important; }
                    .screen-only-signed-stamp { display: none !important; }
                }
            `}</style>

            <div className="sxbt-paper" style={s.paper}>

                {/* ===== HEADER ===== */}
                <table style={{ ...s.table, marginBottom: '6px' }}>
                    <tbody>
                        <tr>
                            <td rowSpan={2} style={{ border: '1px solid #000', width: '18%', textAlign: 'center', padding: '4px', verticalAlign: 'middle' }}>
                                <img src="/logo.png" alt="Z76" style={{ height: '55px', display: 'block', margin: '0 auto' }} />
                            </td>
                            <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px', borderBottom: '1px solid #000' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '14pt' }}>PHIẾU KIỂM TRA CHẤT LƯỢNG</div>
                            </td>
                            <td rowSpan={2} style={{ border: '1px solid #000', width: '26%', padding: '4px 6px', verticalAlign: 'top', fontSize: '9pt' }}>
                                <div><b>Mã số:</b> BM.01-HD.07-QT.03-B8</div>
                                <div>Ngày hiệu lực: 15/01/2026</div>
                                <div>Phiên bản: 00</div>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', textAlign: 'center', padding: '2px', height: '12px' }}></td>
                        </tr>
                    </tbody>
                </table>

                {/* ===== THÔNG TIN PHIẾU ===== */}
                <table style={{ ...s.table, fontSize: '9pt' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: 'none', padding: '1px 0', width: '67%' }} colSpan={2}>
                                Mã đơn vị:&nbsp;<span style={{ borderBottom: '1px dotted #000', display: 'inline-block', minWidth: '160px' }}>{phieu.MaDonVi || phieu.Ma_NhaThau || ''}</span>;
                            </td>
                            <td style={{ border: 'none', padding: '1px 0', width: '33%' }}>
                                Số phiếu:&nbsp;<span style={{ borderBottom: '1px dotted #000', display: 'inline-block', minWidth: '90px' }}>{phieu.SoPhieu || ''}</span>;
                            </td>
                        </tr>
                        <tr>
                            <td style={{ border: 'none', padding: '1px 0' }}>
                                Số lượng nhập (KH):&nbsp;<span style={{ borderBottom: '1px dotted #000', display: 'inline-block', minWidth: '50px' }}>{phieu.SoLuong ?? ''}</span>
                            </td>
                            <td style={{ border: 'none', padding: '1px 4px' }}>
                                Mã đơn hàng:&nbsp;<span style={{ borderBottom: '1px dotted #000', display: 'inline-block', minWidth: '70px' }}>{phieu.MaDonHang || '—'}</span>
                            </td>
                            <td style={{ border: 'none', padding: '1px 0' }}>
                                Ngày nhập:&nbsp;<span style={{ borderBottom: '1px dotted #000', display: 'inline-block', minWidth: '80px' }}>
                                    {phieu.NgayNhap ? new Date(phieu.NgayNhap).toLocaleDateString('vi-VN') : ''}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ===== MỤC I: ĐIỀU KIỆN VC ===== */}
                <div style={s.section}>I. Kiểm tra điều kiện vận chuyển</div>
                <table style={{ ...s.table, fontSize: '9pt' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: 'none', padding: '2px 0', width: '60%' }}>
                                1. Thùng, sàn xe sạch, không thùng, ẩm ướt, có mùi lạ
                            </td>
                            <td style={{ border: 'none', padding: '2px 4px', width: '8%', textAlign: 'center' }}>
                                {renderCheckbox(dkThung === 'DAT')}
                            </td>
                            <td style={{ border: 'none', padding: '2px 4px', width: '8%' }}>Đạt</td>
                            <td style={{ border: 'none', padding: '2px 4px', width: '8%', textAlign: 'center' }}>
                                {renderCheckbox(dkThung === 'KHONG_DAT')}
                            </td>
                            <td style={{ border: 'none', padding: '2px 0' }}>Không đạt</td>
                        </tr>
                        <tr>
                            <td style={{ border: 'none', padding: '2px 0' }}>
                                2. Ngoại quan sản phẩm không thấm nước, ẩm ướt
                            </td>
                            <td style={{ border: 'none', padding: '2px 4px', textAlign: 'center' }}>
                                {renderCheckbox(dkNgoai === 'DAT')}
                            </td>
                            <td style={{ border: 'none', padding: '2px 4px' }}>Đạt</td>
                            <td style={{ border: 'none', padding: '2px 4px', textAlign: 'center' }}>
                                {renderCheckbox(dkNgoai === 'KHONG_DAT')}
                            </td>
                            <td style={{ border: 'none', padding: '2px 0' }}>Không đạt</td>
                        </tr>
                    </tbody>
                </table>

                {/* ===== MỤC II: BTP TABLE ===== */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                    <div style={s.section}>II. Số lượng theo chứng từ của KH</div>
                    <div style={{ fontSize: '8.5pt' }}>
                        Thời gian kiểm: Bắt đầu:...........  Kết thúc:...........
                    </div>
                </div>
                <table style={s.table}>
                    <thead>
                        <tr>
                            <th style={{ ...s.th, width: '30%' }}>Tên vật tư, hàng hóa</th>
                            <th style={{ ...s.th, width: '10%' }}>SL nhập</th>
                            <th style={{ ...s.th, width: '14%' }}>Dấu tuần/ GS1</th>
                            <th style={{ ...s.th, width: '7%' }}>TT</th>
                            <th style={{ ...s.th, width: '14%' }}>LXVT/LOT</th>
                            <th style={{ ...s.th, width: '12%' }}>Số Lot SX</th>
                            <th style={{ ...s.th, width: '13%' }}>Tổng cái (Kho xác nhận)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {btpPrintRows.length > 0
                            ? btpPrintRows.map(({ item, lotRow, lotIndex }) => {
                                const itemRowCount = getLotRows(item).length;
                                return (
                                    <tr key={`${item.Id}-${lotIndex}`}>
                                        {lotIndex === 0 && (
                                            <td rowSpan={itemRowCount} style={{ ...s.td, fontWeight: 600 }}>
                                                {item.TenSanPham}
                                            </td>
                                        )}
                                        <td style={s.tdc}>{lotRow.SoLuongNhap != null && lotRow.SoLuongNhap !== '' ? Number(lotRow.SoLuongNhap).toLocaleString('vi-VN') : ''}</td>
                                        <td style={s.tdc}>{lotRow.DauTuanGS1 || ''}</td>
                                        <td style={s.tdc}>{lotRow.ThuTu || ''}</td>
                                        <td style={s.tdc}>{lotRow.LxvtLot || ''}</td>
                                        <td style={s.tdc}>{lotRow.SoLotSX || ''}</td>
                                        <td style={{ ...s.tdc, minHeight: '18px' }}>
                                            {lotRow.SoLuongKhoXacNhan != null && lotRow.SoLuongKhoXacNhan !== ''
                                                ? Number(lotRow.SoLuongKhoXacNhan).toLocaleString('vi-VN')
                                                : ''}
                                        </td>
                                    </tr>
                                );
                            })
                            : emptyRows(3, 7)
                        }
                        {/* Thêm hàng trống nếu chưa đủ 3 */}
                        {btpPrintRows.length > 0 && btpPrintRows.length < 3 && emptyRows(3 - btpPrintRows.length, 7)}
                    </tbody>
                </table>

                {/* ===== MỤC III: TỶ LỆ KIỂM ===== */}
                <div style={s.section}>III. Tỷ lệ kiểm</div>
                {/* Row chọn loại mẫu */}
                <table style={{ ...s.table, marginBottom: '4px' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '4px 6px', width: '34%', fontSize: '9pt' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {renderCheckbox(loaiMau === 'LAN_1_2')}
                                    <span>SP mới nhập lần 1,2 (100%)</span>
                                </div>
                            </td>
                            <td style={{ border: '1px solid #000', padding: '4px 6px', width: '33%', fontSize: '9pt' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {renderCheckbox(loaiMau === 'LAN_3')}
                                    <span>SP nhập từ lần 3 (3÷5%)</span>
                                </div>
                            </td>
                            <td style={{ border: '1px solid #000', padding: '4px 6px', width: '33%', fontSize: '9pt' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {renderCheckbox(loaiMau === 'LO_TRUOC_KHONG_DAT')}
                                    <span>Lô trước không đạt (6÷10%)</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
                {/* Bảng tỷ lệ */}
                <table style={s.table}>
                    <thead>
                        <tr>
                            <th style={s.th}>Số lượng mẫu</th>
                            <th style={s.th}>Tỷ lệ (%)</th>
                            <th style={s.th}>Tỷ lệ đạt (%)</th>
                            <th style={{ ...s.th }} colSpan={2}>Tỷ lệ lỗi (%)</th>
                            <th style={s.th}>Kết luận</th>
                        </tr>
                        <tr>
                            <th style={s.th}></th>
                            <th style={s.th}></th>
                            <th style={s.th}></th>
                            <th style={{ ...s.th, fontSize: '8pt' }}>Nghiêm trọng</th>
                            <th style={{ ...s.th, fontSize: '8pt' }}>Nặng, Nhẹ</th>
                            <th style={s.th}></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ ...s.tdc, height: '22px' }}>{soMau || ''}</td>
                            <td style={s.tdc}>{tyLe ? `${tyLe}%` : ''}</td>
                            <td style={s.tdc}>{tyLeDat ? `${tyLeDat}%` : ''}</td>
                            <td style={s.tdc}>{tyLeCrit ? `${tyLeCrit}%` : ''}</td>
                            <td style={s.tdc}>{tyLeMajor ? `${tyLeMajor}%` : ''}</td>
                            <td style={{ ...s.tdc, fontWeight: 'bold', color: ketLuan === 'DAT' ? '#16a34a' : ketLuan === 'KHONG_DAT' ? '#dc2626' : '#000' }}>
                                {ketLuan === 'DAT' ? 'ĐẠT' : ketLuan === 'KHONG_DAT' ? 'KHÔNG ĐẠT' : ''}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ ...s.td, height: '20px' }} colSpan={6}></td>
                        </tr>
                    </tbody>
                </table>

                {/* ===== MỤC IV: CHI TIẾT LỖI ===== */}
                <div style={s.section}>IV. Chi tiết các dạng lỗi</div>
                <table style={s.table}>
                    <thead>
                        <tr>
                            <th style={{ ...s.th, width: '5%' }}>TT</th>
                            <th style={{ ...s.th, width: '45%' }}>Các dạng lỗi không đạt</th>
                            <th style={{ ...s.th }} colSpan={4}>Chi tiết lỗi</th>
                        </tr>
                        <tr>
                            <th style={s.th}>A</th>
                            <th style={{ ...s.th, backgroundColor: '#d9d9d9' }}>Lỗi nghiêm trọng</th>
                            <th style={{ ...s.th, width: '12%' }}>Số lỗi</th>
                            <th style={{ ...s.th, width: '12%' }}>Tổng (%)</th>
                            <th style={{ ...s.th, width: '12%' }}>Cho phép</th>
                            <th style={{ ...s.th, width: '14%' }}>Lặp lại</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Lỗi nghiêm trọng (Critical) */}
                        {criticalDefects.length > 0
                            ? criticalDefects.map((d, i) => {
                                const pct = soMau > 0 ? ((d.SoLuong / soMau) * 100).toFixed(1) : '';
                                const contextLabel = getDefectContextLabel(d);
                                return (
                                    <tr key={d.DefectId ?? i} className="avoid-break">
                                        <td style={s.tdc}></td>
                                        <td style={s.td}>
                                            <div>{d.TenLoi}</div>
                                            {contextLabel ? <div style={s.defectContext}>{contextLabel}</div> : null}
                                        </td>
                                        <td style={s.tdc}>{d.SoLuong}</td>
                                        <td style={s.tdc}>{pct ? `${pct}%` : ''}</td>
                                        <td style={{ ...s.tdc, fontWeight: 'bold' }}>{i === 0 ? '0' : ''}</td>
                                        <td style={s.tdc}>{renderCheckbox(d.IsLapLai)}</td>
                                    </tr>
                                );
                            })
                            : Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i}>
                                    <td style={{ ...s.td, height: '18px' }}></td>
                                    <td style={s.td}></td>
                                    <td style={s.td}></td>
                                    <td style={s.td}></td>
                                    <td style={{ ...s.tdc, fontWeight: 'bold' }}>{i === 0 ? '0' : ''}</td>
                                    <td style={s.tdc}>{renderCheckbox(false)}</td>
                                </tr>
                            ))
                        }

                        {/* Separator: Lỗi nặng nhẹ */}
                        <tr>
                            <th style={s.th}>B</th>
                            <th style={{ ...s.th, backgroundColor: '#d9d9d9' }}>Lỗi nặng, lỗi nhẹ</th>
                            <th style={s.th}></th>
                            <th style={s.th}></th>
                            <th style={s.th}></th>
                            <th style={s.th}></th>
                        </tr>

                        {/* Lỗi nặng nhẹ */}
                        {majorMinorDefects.length > 0
                            ? majorMinorDefects.map((d, i) => {
                                const pct = soMau > 0 ? ((d.SoLuong / soMau) * 100).toFixed(1) : '';
                                const contextLabel = getDefectContextLabel(d);
                                return (
                                    <tr key={d.DefectId ?? i} className="avoid-break">
                                        <td style={s.tdc}></td>
                                        <td style={s.td}>
                                            <div>{d.TenLoi}</div>
                                            {contextLabel ? <div style={s.defectContext}>{contextLabel}</div> : null}
                                        </td>
                                        <td style={s.tdc}>{d.SoLuong}</td>
                                        <td style={s.tdc}>{pct ? `${pct}%` : ''}</td>
                                        <td style={{ ...s.tdc, fontWeight: 'bold' }}>{i === 0 ? '≤ 4%' : ''}</td>
                                        <td style={s.tdc}>{renderCheckbox(d.IsLapLai)}</td>
                                    </tr>
                                );
                            })
                            : Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i}>
                                    <td style={{ ...s.td, height: '18px' }}></td>
                                    <td style={s.td}></td>
                                    <td style={s.td}></td>
                                    <td style={s.td}></td>
                                    <td style={{ ...s.tdc, fontWeight: 'bold' }}>{i === 0 ? '≤ 4%' : ''}</td>
                                    <td style={s.tdc}>{renderCheckbox(false)}</td>
                                </tr>
                            ))
                        }
                        {majorMinorDefects.length > 0 && majorMinorDefects.length < 3 &&
                            Array.from({ length: 3 - majorMinorDefects.length }).map((_, i) => (
                                <tr key={`empty-${i}`}>
                                    <td style={{ ...s.td, height: '18px' }}></td>
                                    <td style={s.td}></td>
                                    <td style={s.td}></td>
                                    <td style={s.td}></td>
                                    <td style={s.td}></td>
                                    <td style={s.tdc}>{renderCheckbox(false)}</td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>

                {/* ===== MỤC V: NHẬN XÉT ===== */}
                <div style={{ fontSize: '9pt', marginBottom: '2px' }}>
                    <b>V. Nhận xét/ kiến nghị:</b>&nbsp;
                    <span style={{ borderBottom: '1px dotted #000', display: 'inline-block', minWidth: '300px' }}></span>
                </div>
                <div style={{ borderBottom: '1px dotted #000', height: '14px', marginBottom: '4px' }}></div>

                {/* ===== GHI CHÚ CẢNH BÁO ===== */}
                <div className="avoid-break" style={{
                    border: '1px solid #000',
                    padding: '4px 8px',
                    margin: '6px 0',
                    fontSize: '8.5pt',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                }}>
                    <i>LƯU Ý: KH có Phiếu xử lý không phù hợp (hoặc có phiếu kiểm tra chất lượng không đạt):<br />
                        2 lần liên tiếp hoặc 2 lần /tháng yêu cầu dừng nhập hàng</i>
                </div>

                {/* ===== CHỮ KÝ ===== */}
                {signatureSlots.length > 0 && (
                    <div
                        className="avoid-break"
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '12px',
                            marginTop: '14px',
                            fontSize: '9pt',
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid'
                        }}
                    >
                        {signatureSlots.map((slot) => (
                            <div key={slot.key} style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{ fontStyle: 'italic', marginBottom: '4px' }}>{formatSignatureDate(slot.date)}</div>
                                <div style={{ fontWeight: 'bold', fontSize: '10pt' }}>{slot.title}</div>
                                <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {slot.signed ? <span className="screen-only-signed-stamp" style={s.signedStamp}>ĐÃ KÝ</span> : null}
                                </div>
                                <div style={{ fontWeight: 'bold' }}>{slot.userName || ''}</div>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
});

SxbtPrintTemplate.displayName = 'SxbtPrintTemplate';
