import React, { useState } from 'react';
import { Box } from '@mui/material';

export const BienBanPrintTemplate = React.forwardRef(({
    info = {},
    defects = [],
    xuLy = [],
    chiPhi = [],
    hanhDong = [],
    xacNhan = [],
    assigns = [],
    dynamicFields = [],
    specialistOpinions = [],
    followUpEvaluation = null,
    canEditCustomFields = false
}, ref) => {

    // 1. Lấy dữ liệu Custom Data đã lưu từ API
    const customData = (dynamicFields || []).reduce((acc, field) => {
        if (field?.FieldName) acc[field.FieldName] = field.FieldValue;
        return acc;
    }, {});

    const isV01 = info.MauPhieuVersion === 'V01';
    const getDefectCode = (defect = {}) =>
        defect.MaLoi || defect.maLoi || defect.TenLoiTuNhap || defect.TenLoi || defect.DefectType || "";

    const bienBanDonViSanXuat =
        customData.TenBoPhan ||
        customData.TrenChuyen_TenDonVi ||
        customData.TrenChuyen_TenBoPhan ||
        info.TenBoPhan ||
        '';
    const bienBanMaDonViSanXuat =
        customData.MaBoPhan ||
        customData.TrenChuyen_MaBoPhan ||
        info.MaBoPhan ||
        '';
    const bienBanSoLuongKhongPhuHop =
        customData.SoLuongKPH ||
        customData.TrenChuyen_NangSuatDuKien ||
        '';

    const normalizeText = (value) =>
        String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase();

    const treatmentLabels = ['Cho vào SX', 'Trả lại NCC/ĐVSX', 'Loại bỏ', 'Sửa chữa', 'Giảm giá/ hạ cấp', 'Hình thức khác'];
    const selectedTreatments = new Set((xuLy || []).map((item) => normalizeText(item.DeNghiXuLy)));
    const isTreatmentSelected = (label) => {
        const normalizedLabel = normalizeText(label);
        return [...selectedTreatments].some((value) => value.includes(normalizedLabel) || normalizedLabel.includes(value));
    };
    const totalCost = (chiPhi || []).reduce((sum, item) => sum + (Number(item.GiaTri) || 0), 0);
    const printCosts = chiPhi || [];
    const receiveDepartmentCodes = [...new Set(
        (assigns || [])
            .map((item) => item.MaBoPhan || item.TenBoPhan)
            .filter(Boolean)
    )];
    const receiveDepartmentRows = [];
    for (let index = 0; index < receiveDepartmentCodes.length; index += 4) {
        receiveDepartmentRows.push(receiveDepartmentCodes.slice(index, index + 4));
    }
    const creatorDepartmentCode = info.MaDonViTaoPhieu || info.MaBoPhan || info.DonViTaoPhieu || 'Đơn vị tạo phiếu';

    const inferPhatHienTu = () => {
        if (customData.PhatHienTu || info.PhatHienTu) {
            const explicitValue = customData.PhatHienTu || info.PhatHienTu;
            const explicitText = normalizeText(explicitValue);

            if (
                explicitText.includes('KIEM_TREN_CHUYEN') ||
                explicitText.includes('KIEM TREN CHUYEN') ||
                explicitText.includes('TREN CHUYEN')
            ) {
                return 'TRONG_SAN_XUAT';
            }

            return explicitValue;
        }

        const loaiKiemText = normalizeText([
            info.MaLoai,
            info.MaLoaiKiem,
            info.LoaiKiem,
            info.TenLoai,
            info.TenLoaiKiem,
            info.TenLoaiKiemTra
        ].filter(Boolean).join(' '));
        const loaiKiemId = Number(info.LoaiKiemId);

        if (loaiKiemText.includes('DAU_VAO') || loaiKiemText.includes('DAU VAO') || loaiKiemId === 1) {
            return 'KIEM_TRA_DAU_VAO';
        }

        if (
            loaiKiemText.includes('KIEM_DONG_CONT') ||
            loaiKiemText.includes('KIEM CUOI') ||
            loaiKiemText.includes('DONG CONT') ||
            loaiKiemId === 5
        ) {
            return 'KIEM_DONG_CONT';
        }

        if (
            loaiKiemText.includes('KIEM_TREN_CHUYEN') ||
            loaiKiemText.includes('KIEM TREN CHUYEN') ||
            loaiKiemText.includes('TREN CHUYEN') ||
            loaiKiemId === 6
        ) {
            return 'TRONG_SAN_XUAT';
        }

        return '';
    };

    // 2. State quản lý Mục 2
    const [phatHienTu, setPhatHienTu] = useState(inferPhatHienTu);

    // 3. State quản lý Mục 3 (chuyển sang string để chỉ chọn 1)
    const [mucDo, setMucDo] = useState(() => {
        if (customData.MucDo) return customData.MucDo;
        // Hỗ trợ tương thích đọc data cũ (boolean)
        const isTrue = (val) => val === true || val === 'true';
        if (isTrue(customData.LoiLanDau) || info.LoiLanDau) return 'LoiLanDau';
        if (isTrue(customData.LoiLapLai) || info.LoiLapLai) return 'LoiLapLai';
        if (isTrue(customData.LoiDonLe) || info.LoiDonLe) return 'LoiDonLe';
        if (isTrue(customData.LoiHangLoat) || info.LoiHangLoat) return 'LoiHangLoat';
        return '';
    });

    if (!info) return null;

    const styles = {
        // Vùng nền xem trước
        previewBackground: {
            backgroundColor: '#f0f2f5',
            padding: '20px',
            display: 'flex',
            justifyContent: 'center',
            fontFamily: '"Times New Roman", Times, serif',
            color: '#000',
        },
        // Tờ giấy A4 liền mạch
        documentPaper: {
            width: '210mm',
            backgroundColor: '#fff',
            padding: '15mm 20mm', // Lề giấy
            boxSizing: 'border-box',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        },
        text: { fontSize: '12pt', marginBottom: '4px' },
        boldText: { fontSize: '12pt', fontWeight: 'bold' },
        sectionTitle: { fontWeight: 'bold', fontSize: '12pt', marginTop: '15px', marginBottom: '8px' },
        dottedLine: { flexGrow: 1, borderBottom: '2px dotted #000', marginLeft: '8px', marginRight: '8px', textAlign: 'center', position: 'relative', top: '-4px' },
        table: { border: '1px solid #000', borderCollapse: 'collapse', width: '100%', marginBottom: '10px' },
        th: { border: '1px solid #000', padding: '4px', fontWeight: 'bold', textAlign: 'center', fontSize: '11pt' },
        td: { border: '1px solid #000', padding: '4px', fontSize: '11pt' },
        headerTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '15px', border: '1px solid #000' },
        headerTd: { border: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'middle' },
        signatureBlock: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: '20px', marginTop: '15px', textAlign: 'center', width: '100%' },
        signatureCol: { flex: 1, minWidth: '30%', padding: '0 10px' },
        signatureDepartment: { fontSize: '11pt', fontWeight: 'bold', whiteSpace: 'nowrap' },
        layoutTable: { width: '100%', borderCollapse: 'collapse', border: 'none' },
        layoutTd: { border: 'none', padding: '4px 0', verticalAlign: 'middle' },
        flexBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        inputField: { width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 'inherit', fontFamily: 'inherit', padding: 0, margin: 0, color: 'inherit', textAlign: 'center' }
    };

    // Ô vuông to dùng cho Mục 2 và Mục 3
    const renderSquareBox = (checked) => (
        <span style={{
            width: '24px',
            height: '24px',
            border: '1px solid #000',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            lineHeight: 1,
            marginLeft: '8px'
        }}>
            {checked ? 'x' : ''}
        </span>
    );

    // Ô check nhỏ bên dưới (phần đề xuất)
    const renderCheckbox = (label, checked) => (
        <span style={{ marginRight: '15px', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
            <span style={{
                width: '16px',
                height: '16px',
                border: '1px solid #000',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginRight: '6px',
                fontSize: '13px',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 700,
                lineHeight: 1,
                boxSizing: 'border-box'
            }}>
                {checked ? '×' : ''}
            </span>
            {label}
        </span>
    );

    const renderInfoLine = (fields) => (
        <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '10px', gap: '5px', ...styles.text }}>
            {fields.map((field, index) => (
                <React.Fragment key={field.name}>
                    <span style={{ whiteSpace: 'nowrap', marginLeft: index === 0 ? 0 : '5px' }}>{field.label}:</span>
                    <span style={{ ...styles.dottedLine, flexGrow: field.grow || 1 }}>
                        <input name={field.name} className="custom-field" type="text" defaultValue={field.value || ''} readOnly={!canEditCustomFields} style={{ ...styles.inputField, cursor: canEditCustomFields ? 'text' : 'default' }} />
                    </span>
                </React.Fragment>
            ))}
        </div>
    );
    // Cập nhật Ô check cho phần 2 (Chỉ chọn 1 - Radio)
    const renderRadioRight = (label, value) => (
        <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '85%', cursor: canEditCustomFields ? 'pointer' : 'default' }}
            onClick={() => canEditCustomFields && setPhatHienTu(prev => prev === value ? '' : value)}
        >
            <span style={{ fontSize: '12pt' }}>{label}</span>
            {renderSquareBox(phatHienTu === value)}
        </div>
    );

    // Cập nhật ô check cho phần 3 (Chỉ chọn 1 - Radio)
    const renderMucDoRadio = (label, value) => (
        <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '85%', cursor: canEditCustomFields ? 'pointer' : 'default' }}
            onClick={() => canEditCustomFields && setMucDo(prev => prev === value ? '' : value)}
        >
            <span style={{ fontSize: '12pt' }}>{label}</span>
            {renderSquareBox(mucDo === value)}
        </div>
    );

    const formatSignatureDate = (value) => {
        if (!value) return 'Ngày..................';
        return `Ngày ${new Date(value).toLocaleDateString('vi-VN')
            .replace(/\//g, ' tháng ')
            .replace(/ tháng \d{4}/, (match) => match.replace(' tháng ', ' năm '))}`;
    };

    const getSignatureDepartmentName = (item) => {
        const assignedDepartment = assigns.find(assign => Number(assign.BoPhanId) === Number(item.BoPhanId));
        return item.TenBoPhan ||
            assignedDepartment?.TenBoPhan ||
            item.MaBoPhan ||
            assignedDepartment?.MaBoPhan ||
            'BỘ PHẬN';
    };

    const kphKnSignature = (xacNhan || []).find(item => item.VaiTro === 'KPH_KN');
    const kphBpsxSignature = (xacNhan || []).find(item => item.VaiTro === 'KPH_BPSX');

    const signatureRows = Array.from(
        (xacNhan || []).filter(item => !['KPH_KN', 'KPH_BPSX'].includes(item.VaiTro)).reduce((map, item) => {
            const key = item.BoPhanId || item.NguoiXacNhanId || item.Id;
            if (key) map.set(String(key), item);
            return map;
        }, new Map()).values()
    );
    const printDefects = defects || [];
    const printActions = hanhDong || [];
    const printProposals = xuLy || [];
    const printOpinions = isV01 ? (specialistOpinions || []) : [];

    return (
        <div ref={ref} style={styles.previewBackground} className="preview-background">
            <style>
                {`
                @page {
                    size: A4;
                    margin: 15mm 20mm; /* Lề trang in */
                }
                
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        background-color: #fff;
                    }
                    
                    /* Bỏ style giả lập tờ giấy trên web khi in thật */
                    .preview-background { padding: 0 !important; background-color: transparent !important; }
                    .document-paper {
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 0 !important; 
                        width: 100% !important;
                    }

                    /* QUAN TRỌNG: Giúp thead tự động lặp lại ở mọi trang */
                    thead { display: table-header-group; }
                    
                    /* Chống chia tách các khối quan trọng giữa 2 trang */
                    .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
                    tr { page-break-inside: avoid !important; break-inside: avoid !important; }
                }
                `}
            </style>

            {/* Các thẻ Hidden input lưu trữ giá trị để Component cha gọi lưu API */}
            <input type="hidden" name="PhatHienTu" className="custom-field" value={phatHienTu} />
            <input type="hidden" name="MucDo" className="custom-field" value={mucDo} />

            <div className="document-paper" style={styles.documentPaper}>
                {/* SỬ DỤNG TABLE TỔNG ĐỂ AUTO PHÂN TRANG */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>

                    {/* ===== HEADER LẶP LẠI ===== */}
                    <thead>
                        <tr>
                            <td style={{ border: 'none', paddingBottom: '10px' }}>
                                <table style={styles.headerTable}>
                                    <tbody>
                                        {isV01 ? (
                                            <tr>
                                                <td style={{ ...styles.headerTd, width: '20%' }}>
                                                    <img src="/logo.png" alt="Logo Z76" style={{ height: '70px', display: 'block', margin: '0 auto' }} />
                                                </td>
                                                <td style={{ ...styles.headerTd, width: '55%' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '16pt' }}>PHIẾU XỬ LÝ VT, BTP, TP</div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '16pt' }}>KHÔNG PHÙ HỢP</div>
                                                </td>
                                                <td style={{ ...styles.headerTd, width: '25%', textAlign: 'left', paddingLeft: '8px' }}>
                                                    <div style={{ fontSize: '9.5pt', whiteSpace: 'nowrap' }}>Mã số: BM.01-QT.02-B8</div>
                                                    <div style={{ fontSize: '9.5pt', whiteSpace: 'nowrap' }}>Ngày hiệu lực: 15/07/2026</div>
                                                    <div style={{ fontSize: '9.5pt' }}>Phiên bản: 01</div>
                                                    <div style={{ fontSize: '9.5pt' }}>Trang: …………</div>
                                                </td>
                                            </tr>
                                        ) : (
                                            <>
                                                <tr>
                                                    <td rowSpan={2} style={{ ...styles.headerTd, width: '20%' }}>
                                                        <img src="/logo.png" alt="Logo Z76" style={{ height: '70px', display: 'block', margin: '0 auto' }} />
                                                    </td>
                                                    <td style={{ ...styles.headerTd, width: '50%', borderBottom: '1px solid #000' }}>
                                                        <div style={{ fontSize: '14pt' }}>CÔNG TY TNHH MTV 76</div>
                                                    </td>
                                                    <td rowSpan={2} style={{ ...styles.headerTd, width: '30%', textAlign: 'left', paddingLeft: '10px' }}>
                                                        <div style={{ fontSize: '11pt' }}>Mã số: BM.01-QT.02-B8</div>
                                                        <div style={{ fontSize: '11pt' }}>Ngày HL: 20/01/2026</div>
                                                        <div style={{ fontSize: '11pt' }}>Phiên bản: 00</div>
                                                        <div style={{ fontSize: '11pt' }}>Trang: ....................</div>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style={styles.headerTd}>
                                                        <div style={{ fontWeight: 'bold', fontSize: '14pt' }}>PHIẾU XỬ LÝ VT, BTP, TP</div>
                                                        <div style={{ fontWeight: 'bold', fontSize: '14pt' }}>KHÔNG PHÙ HỢP</div>
                                                    </td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </thead>

                    {/* ===== NỘI DUNG TỰ ĐỘNG CHẢY (AUTO-FLOW) ===== */}
                    <tbody>
                        <tr>
                            <td style={{ border: 'none' }}>

                                {/* Số phiếu */}
                                <div style={{ display: 'flex', width: '100%', marginBottom: '16px' }}>
                                    <div style={{ width: '100%' }}>
                                        <Box style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <div style={{ ...styles.text, fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>
                                                {isV01 && (
                                                    <span style={{ whiteSpace: 'nowrap' }}>
                                                        Số: {info.SoBienBan || info.SoPhieu || '………'}/{info.MaDonViTaoPhieu || '………'}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ ...styles.text, fontStyle: 'italic' }}>
                                                Ngày {info.NgayKiem ? new Date(info.NgayKiem).toLocaleDateString('vi-VN').replace(/\//g, ' tháng ').replace(/ tháng \d{4}/, (match) => match.replace(' tháng ', ' năm ')) : new Date().toLocaleDateString('vi-VN').replace(/\//g, ' tháng ').replace(/ tháng \d{4}/, (match) => match.replace(' tháng ', ' năm '))}
                                            </div>
                                        </Box>
                                    </div>
                                </div>

                                {/* 1. Thông tin */}
                                <Box mb={2} className="avoid-break">
                                    <div style={styles.sectionTitle}>1. Thông tin sự không phù hợp</div>
                                    {isV01 ? (
                                        <>
                                            {renderInfoLine([
                                                { label: 'Đơn vị sản xuất', name: 'TenBoPhan', value: bienBanDonViSanXuat },
                                                { label: 'Tên VT/BTP/TP', name: 'TenSanPham', value: customData.TenSanPham || info.TenSanPham }
                                            ])}
                                            {renderInfoLine([
                                                { label: 'Mã truy nguyên', name: 'MaTruyNguyen', value: customData.MaTruyNguyen },
                                                { label: 'Mã Item', name: 'MaSanPham', value: customData.MaSanPham || customData.MaItem || info.MaSanPham }
                                            ])}
                                            {renderInfoLine([
                                                { label: 'Số lượng', name: 'SoLuongKPH', value: bienBanSoLuongKhongPhuHop },
                                                { label: 'Đơn hàng', name: 'DonHang', value: customData.DonHang }
                                            ])}
                                            {renderInfoLine([
                                                { label: 'Lô/Lot sản xuất', name: 'Lot', value: customData.Lot || info.Lot },
                                                { label: 'Dấu tuần', name: 'DauTuan', value: customData.DauTuan }
                                            ])}
                                        </>
                                    ) : (
                                        <>
                                            {renderInfoLine([
                                                { label: 'Đơn vị sản xuất', name: 'TenBoPhan', value: bienBanDonViSanXuat },
                                                { label: 'Mã ĐVSX', name: 'MaBoPhan', value: bienBanMaDonViSanXuat, grow: 0.6 }
                                            ])}
                                            {renderInfoLine([
                                                { label: 'Tên VT/BTP/TP', name: 'TenSanPham', value: customData.TenSanPham || info.TenSanPham },
                                                { label: 'Mã Item', name: 'MaSanPham', value: customData.MaSanPham || customData.MaItem || info.MaSanPham, grow: 0.6 }
                                            ])}
                                            {renderInfoLine([
                                                { label: 'Mã truy nguyên', name: 'MaTruyNguyen', value: customData.MaTruyNguyen },
                                                { label: 'Đơn hàng', name: 'DonHang', value: customData.DonHang, grow: 0.5 },
                                                { label: 'Lô SX', name: 'Lot', value: customData.Lot || info.Lot, grow: 0.3 }
                                            ])}
                                            {renderInfoLine([
                                                { label: 'Số lượng', name: 'SoLuongKPH', value: bienBanSoLuongKhongPhuHop },
                                                { label: 'Dấu tuần', name: 'DauTuan', value: customData.DauTuan, grow: 0.4 }
                                            ])}
                                        </>
                                    )}
                                </Box>

                                {/* 2. Phát hiện từ */}
                                <Box className="avoid-break">
                                    <div style={styles.sectionTitle}>2. Sự không phù hợp được phát hiện từ</div>
                                    <table style={{ ...styles.layoutTable, paddingLeft: '15px' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ ...styles.layoutTd, width: '33%' }}>{renderRadioRight('a) Kiểm tra đầu vào', 'KIEM_TRA_DAU_VAO')}</td>
                                                <td style={{ ...styles.layoutTd, width: '33%' }}>{renderRadioRight('b) Trong sản xuất', 'TRONG_SAN_XUAT')}</td>
                                                <td style={{ ...styles.layoutTd, width: '34%' }}>{renderRadioRight('c) Kiểm cuối', 'KIEM_DONG_CONT')}</td>
                                            </tr>
                                            <tr>
                                                <td style={styles.layoutTd}>{renderRadioRight('d) Kiểm tra tại NCC', 'TAI_NCC')}</td>
                                                <td style={styles.layoutTd}>{renderRadioRight('e) Khách hàng', 'KHACH_HANG')}</td>
                                                <td style={styles.layoutTd}>{renderRadioRight('f) Trong kho', 'TRONG_KHO')}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </Box>

                                {/* 3. Mức độ */}
                                <Box className="avoid-break">
                                    <table style={{ ...styles.layoutTable, marginTop: '20px', marginBottom: '15px' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ ...styles.layoutTd, width: '42%', verticalAlign: 'top', paddingTop: '4px' }}>
                                                    <div style={{ ...styles.sectionTitle, marginTop: 0, marginBottom: 0 }}>3. Mức độ không phù hợp</div>
                                                </td>
                                                <td style={{ ...styles.layoutTd, width: '29%' }}>{renderMucDoRadio('a) Lỗi lần đầu', 'LoiLanDau')}</td>
                                                <td style={{ ...styles.layoutTd, width: '29%' }}>{renderMucDoRadio('b) Lỗi lặp lại', 'LoiLapLai')}</td>
                                            </tr>
                                            <tr>
                                                <td style={styles.layoutTd}></td>
                                                <td style={styles.layoutTd}>{renderMucDoRadio('c) Lỗi đơn lẻ', 'LoiDonLe')}</td>
                                                <td style={styles.layoutTd}>{renderMucDoRadio('d) Lỗi hàng loạt', 'LoiHangLoat')}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </Box>

                                {/* 4. Mô tả chi tiết (Defects) */}
                                <Box>
                                    <div style={styles.sectionTitle}>4. Mô tả chi tiết sự không phù hợp:</div>
                                    {info.MoTaChung && (
                                        <div style={{ ...styles.text, paddingLeft: '10px', marginBottom: '10px', fontStyle: 'italic' }}>
                                            - {info.MoTaChung}
                                        </div>
                                    )}
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...styles.th, width: '40px' }}>TT</th>
                                                <th style={styles.th}>VT/BTP/TP</th>
                                                <th style={{ ...styles.th, width: '100px' }}>Số lượng kiểm</th>
                                                <th style={{ ...styles.th, width: '90px' }}>Tỷ lệ lỗi, %</th>
                                                <th style={{ ...styles.th, width: '120px' }}>Mã lỗi</th>
                                                <th style={styles.th}>Ghi chú</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {printDefects.map((d, index) => (
                                                <tr key={index}>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>{index + 1}</td>
                                                    <td style={styles.td}>{d ? (isV01 ? (d.TenDoiTuong || customData.TenSanPham || info.TenSanPham || '') : d.TenLoi) : '\u00a0'}</td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>{d ? (d.SoLuongKiem ?? info.SoLuong ?? '') : ''}</td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                                        {d && (d.SoLuong && (d.SoLuongKiem || info.SoLuong))
                                                            ? ((d.SoLuong / (d.SoLuongKiem || info.SoLuong)) * 100).toFixed(0) + '%'
                                                            : d ? ((d.SoLuong > 0 && !d.SoLuongKiem) ? '100%' : '0%') : ''}
                                                    </td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>{d ? getDefectCode(d) : ''}</td>
                                                    <td style={styles.td}>{d?.GhiChu || ''}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </Box>

                                {/* Chữ ký 1 */}
                                <Box className="avoid-break" style={styles.signatureBlock}>
                                    {isV01 ? (
                                        <Box style={styles.signatureCol}>
                                            <div style={styles.text}>{formatSignatureDate(kphBpsxSignature?.ThoiGian)}</div>
                                            <div style={styles.boldText}>TRƯỞNG BỘ PHẬN</div>
                                            <Box height="60px"></Box>
                                            <div style={styles.text}>{kphBpsxSignature?.FullName || '(Ký, họ tên)'}</div>
                                        </Box>
                                    ) : (
                                        <>
                                            <Box style={styles.signatureCol}>
                                                <div style={styles.text}>{formatSignatureDate(kphKnSignature?.ThoiGian)}</div>
                                                <div style={styles.boldText}>PHÒNG KN</div>
                                                <Box height="60px"></Box>
                                                <div style={styles.text}>{kphKnSignature?.FullName || '(Ký, họ tên)'}</div>
                                            </Box>
                                            <Box style={styles.signatureCol}>
                                                <div style={styles.text}>{formatSignatureDate(kphBpsxSignature?.ThoiGian)}</div>
                                                <div style={styles.boldText}>PHÒNG/BAN/BPSX</div>
                                                <Box height="60px"></Box>
                                                <div style={styles.text}>{kphBpsxSignature?.FullName || '(Ký, họ tên)'}</div>
                                            </Box>
                                        </>
                                    )}
                                    <Box style={styles.signatureCol}>
                                        <div style={styles.text}>Ngày..................</div>
                                        <div style={styles.boldText}>NGƯỜI LẬP</div>
                                        <Box height="60px"></Box>
                                        <div style={styles.text}>{info.NguoiLap || '(Ký, họ tên)'}</div>
                                    </Box>
                                </Box>

                                {/* 5. Đề xuất xử lý */}
                                <Box mt={3}>
                                    <div style={styles.sectionTitle}>5. Đề xuất xử lý</div>
                                    {isV01 && (
                                        <Box className="avoid-break" mb={1} pl={1}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                                {treatmentLabels.map((label, index) => (
                                                    <div style={{ width: '33.33%' }} key={label}>
                                                        {renderCheckbox(`${String.fromCharCode(97 + index)}) ${label}`, isTreatmentSelected(label))}
                                                    </div>
                                                ))}
                                            </div>
                                        </Box>
                                    )}
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...styles.th, width: isV01 ? '45%' : '35%' }}>Nội dung</th>
                                                {!isV01 && <th style={styles.th}>Đề nghị xử lý</th>}
                                                <th style={styles.th}>Trách nhiệm</th>
                                                <th style={styles.th}>Thời hạn</th>
                                                <th style={styles.th}>Theo dõi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {printProposals.map((x, index) => (
                                                <tr key={index}>
                                                    <td style={styles.td}>{x?.NoiDung || '\u00a0'}</td>
                                                    {!isV01 && <td style={styles.td}>{x?.DeNghiXuLy || ''}</td>}
                                                    <td style={styles.td}>{x?.TrachNhiem || ''}</td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>{x?.ThoiHan ? new Date(x.ThoiHan).toLocaleDateString('vi-VN') : ''}</td>
                                                    <td style={styles.td}>{x?.TheoDoi || ''}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {!isV01 && <Box className="avoid-break" mt={1} pl={1}>
                                        <div style={{ ...styles.text, fontStyle: 'italic', marginBottom: '5px' }}>Các nội dung mục đề nghị xử lý:</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                            <div style={{ width: '33.33%' }}>{renderCheckbox('a) Cho vào SX', false)}</div>
                                            <div style={{ width: '33.33%' }}>{renderCheckbox('b) Trả lại NCC/DVSX', false)}</div>
                                            <div style={{ width: '33.33%' }}>{renderCheckbox('c) Loại bỏ', false)}</div>
                                            <div style={{ width: '33.33%' }}>{renderCheckbox('d) Sửa chữa', false)}</div>
                                            <div style={{ width: '33.33%' }}>{renderCheckbox('e) Giảm giá/ hạ cấp', false)}</div>
                                            <div style={{ width: '33.33%' }}>{renderCheckbox('f) Hình thức khác:', false)}</div>
                                        </div>
                                    </Box>}
                                </Box>

                                {/* 6. Chi phí phát sinh */}
                                <Box mt={2}>
                                    <Box className="avoid-break" display="flex" alignItems="center">
                                        <div style={{ ...styles.sectionTitle, marginTop: 0, marginBottom: 0, marginRight: '30px' }}>
                                            6. Chi phí phát sinh
                                        </div>
                                        {renderCheckbox('Yêu cầu', Boolean(info.YeuCauChiPhi))}
                                        {renderCheckbox('Không yêu cầu', !info.YeuCauChiPhi)}
                                    </Box>

                                    <table style={{ ...styles.table, marginTop: '10px' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...styles.th, width: '35%' }}>Chi phí</th>
                                                <th style={styles.th}>Giá trị, vnđ</th>
                                                <th style={styles.th}>Trách nhiệm</th>
                                                <th style={styles.th}>Thời hạn</th>
                                                <th style={styles.th}>Theo dõi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {printCosts.map((c, index) => (
                                                <tr key={index}>
                                                    <td style={styles.td}>{c.TenChiPhi || c.LoaiChiPhi}</td>
                                                    <td style={{ ...styles.td, textAlign: 'right' }}>{c.GiaTri ? c.GiaTri.toLocaleString('vi-VN') : ''}</td>
                                                    <td style={styles.td}>{c.TenBoPhan || ''}</td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>{c.ThoiHan ? new Date(c.ThoiHan).toLocaleDateString('vi-VN') : ''}</td>
                                                    <td style={styles.td}>{c.NguoiTheoDoi || c.NguoiXuLy || ''}</td>
                                                </tr>
                                            ))}
                                            {isV01 && printCosts.length > 0 && (
                                                <tr>
                                                    <td style={{ ...styles.td, fontWeight: 'bold' }}>Tổng</td>
                                                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>{totalCost.toLocaleString('vi-VN')}</td>
                                                    <td style={styles.td}></td><td style={styles.td}></td><td style={styles.td}></td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </Box>

                                {/* 7. Hành động khắc phục */}
                                <Box mt={2}>
                                    <Box className="avoid-break" display="flex" alignItems="center">
                                        <div style={{ ...styles.sectionTitle, marginTop: 0, marginBottom: 0, marginRight: '30px' }}>
                                            7. Hành động khắc phục, phòng ngừa
                                        </div>
                                        {renderCheckbox('Yêu cầu', Boolean(info.YeuCauHanhDong))}
                                        {renderCheckbox('Không yêu cầu', !info.YeuCauHanhDong)}
                                    </Box>

                                    <table style={{ ...styles.table, marginTop: '10px' }}>
                                        <thead>
                                            <tr>
                                                {isV01 && <th style={{ ...styles.th, width: '40px' }}>TT</th>}
                                                <th style={{ ...styles.th, width: '40%' }}>Nội dung</th>
                                                <th style={styles.th}>Trách nhiệm</th>
                                                <th style={styles.th}>Thời hạn</th>
                                                <th style={styles.th}>Theo dõi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {printActions.map((h, index) => (
                                                <tr key={index}>
                                                    {isV01 && <td style={{ ...styles.td, textAlign: 'center' }}>{index + 1}</td>}
                                                    <td style={styles.td}>{h?.NoiDung || '\u00a0'}</td>
                                                    <td style={styles.td}>{h?.TenBoPhan || h?.FullName || ''}</td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>{h?.ThoiHan ? new Date(h.ThoiHan).toLocaleDateString('vi-VN') : ''}</td>
                                                    <td style={styles.td}>{h?.NguoiTheoDoi || h?.NguoiXuLy || h?.TheoDoi || ''}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </Box>

                                {isV01 && (
                                    <Box mt={2}>
                                        <table style={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th style={{ ...styles.th, width: '80%' }}>Yêu cầu ý kiến Phòng ban chuyên môn</th>
                                                    <th style={styles.th}>Xác nhận</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {printOpinions.map((opinion, index) => (
                                                    <tr key={opinion?.Id || index}>
                                                        <td style={{ ...styles.td, minHeight: '58px', verticalAlign: 'top' }}>
                                                            <div style={{ fontWeight: 'bold' }}>
                                                                {opinion ? `- ${opinion.MaBoPhan || opinion.TenBoPhan || ''}` : '\u00a0'}
                                                                {' '}({renderCheckbox('Có', true)}{renderCheckbox('Không', false)})
                                                                {opinion?.ThoiGian ? ` ${new Date(opinion.ThoiGian).toLocaleDateString('vi-VN')}` : ' …/…/20…'}
                                                            </div>
                                                            <div style={{ whiteSpace: 'pre-wrap', minHeight: '34px' }}>{opinion?.NoiDung || ''}</div>
                                                        </td>
                                                        <td style={{ ...styles.td, textAlign: 'center', verticalAlign: 'middle' }}>
                                                            {opinion?.NguoiTraLoi || ''}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </Box>
                                )}

                                {/* Chữ ký 2 */}
                                {!isV01 && signatureRows.length > 0 && (
                                    <Box className="avoid-break" style={{ ...styles.signatureBlock, justifyContent: 'flex-start', direction: 'rtl' }}>
                                        {signatureRows.map((item) => (
                                            <Box style={{ ...styles.signatureCol, direction: 'ltr', flex: '0 0 42%', maxWidth: '42%' }} key={item.Id || item.BoPhanId || item.NguoiXacNhanId}>
                                                <div style={{ ...styles.text, fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                                    {formatSignatureDate(item.ThoiGian)}
                                                </div>
                                                <div style={styles.signatureDepartment}>{getSignatureDepartmentName(item).toUpperCase()}</div>
                                                <Box height="90px"></Box>
                                                <div style={styles.text}>{item.FullName || '(Ký, họ tên)'}</div>
                                            </Box>
                                        ))}
                                    </Box>
                                )}

                                {/* 8. Theo dõi */}
                                <Box className="avoid-break" mt={2} pt={0}>
                                    <div style={styles.sectionTitle}>8. Theo dõi đánh giá</div>
                                    <div style={{ display: 'flex', marginTop: '8px' }}>
                                        {renderCheckbox('Thỏa mãn', followUpEvaluation?.KetQua === 'THOA_MAN')}
                                        {renderCheckbox('Không thỏa mãn', followUpEvaluation?.KetQua === 'KHONG_THOA_MAN')}
                                        <span style={{ marginLeft: '40px' }}>Phiếu KPH mới số: {followUpEvaluation?.PhieuKphMoiSo || '................................'}</span>
                                    </div>
                                    <div style={{ marginTop: '16px', border: isV01 ? '1px solid #000' : 'none', minHeight: isV01 ? '100px' : 'auto', padding: isV01 ? '6px' : 0 }}>
                                        <div style={styles.text}>Ghi chú: {followUpEvaluation?.GhiChu || '..........................................................................................................................................................'}</div>
                                    </div>

                                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ paddingLeft: '16px' }}>
                                            <div style={styles.boldText}>Nơi nhận:</div>
                                            {receiveDepartmentRows.length > 0 ? receiveDepartmentRows.map((departmentCodes, index) => (
                                                <div key={departmentCodes.join('-')} style={{ ...styles.text, fontSize: '9pt' }}>
                                                    - {departmentCodes.join(', ')}{index === receiveDepartmentRows.length - 1 ? ';' : ','}
                                                </div>
                                            )) : (
                                                <div style={{ ...styles.text, fontSize: '9pt' }}>- ..................;</div>
                                            )}
                                            <div style={{ ...styles.text, fontSize: '9pt' }}>- Lưu ({creatorDepartmentCode})</div>
                                        </div>
                                        <div style={{ textAlign: 'center', width: '250px' }}>
                                            <div style={styles.text}>{formatSignatureDate(followUpEvaluation?.ThoiGian)}</div>
                                            <div style={styles.boldText}>NGƯỜI THEO DÕI</div>
                                            <Box height="60px"></Box>
                                            <div style={styles.text}>{followUpEvaluation?.NguoiTheoDoi || '(Ký, họ tên)'}</div>
                                        </div>
                                    </div>
                                </Box>

                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
});
