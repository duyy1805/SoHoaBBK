import React, { useState } from 'react';
import { Box } from '@mui/material';
import { PrintSignatureImage } from '../../../components/common/PrintSignature';

export const BienBanPrintTemplate = React.forwardRef(({
    info = {},
    defects = [],
    xuLy = [],
    chiPhi = [],
    hanhDong = [],
    xacNhan = [],
    phieuKiemXacNhan = [],
    assigns = [],
    dynamicFields = [],
    specialistOpinions = [],
    followUpEvaluation = null,
    canEditCustomFields = false,
    useDefectInspectedQuantityOnly = false
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
        text: { fontSize: '12pt', marginBottom: '4px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
        boldText: { fontSize: '12pt', fontWeight: 'bold' },
        sectionTitle: { fontWeight: 'bold', fontSize: '12pt', marginTop: '15px', marginBottom: '8px' },
        table: { border: '1px solid #000', borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%', marginBottom: '10px' },
        th: { border: '1px solid #000', padding: '4px', fontWeight: 'bold', textAlign: 'center', fontSize: '11pt' },
        td: { border: '1px solid #000', padding: '4px', fontSize: '11pt', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
        headerTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '15px', border: '1px solid #000' },
        headerTd: { border: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'middle' },
        signatureBlock: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: '20px', marginTop: '15px', textAlign: 'center', width: '100%' },
        signatureCol: { flex: 1, minWidth: '30%', padding: '0 10px' },
        signatureDepartment: { fontSize: '11pt', fontWeight: 'bold', whiteSpace: 'normal', overflowWrap: 'anywhere' },
        layoutTable: { width: '100%', borderCollapse: 'collapse', border: 'none' },
        layoutTd: { border: 'none', padding: '4px 0', verticalAlign: 'middle' },
        flexBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        inputField: { width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 'inherit', fontFamily: 'inherit', padding: 0, margin: 0, color: 'inherit', textAlign: 'left', resize: 'none', overflow: 'hidden', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap', fieldSizing: 'content' }
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

    const getFieldRows = (value) => Math.max(1, String(value ?? '').split('\n')
        .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 32)), 0));
    const renderInfoLine = (fields) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '8px', gap: '8px 16px', ...styles.text }}>
            {fields.map((field) => (
                <div key={field.name} style={{ display: 'flex', alignItems: 'flex-start', flex: `${field.grow || 1} 1 ${fields.length > 2 ? '28%' : '45%'}`, minWidth: 0 }}>
                    <span style={{ whiteSpace: 'nowrap', marginRight: '6px' }}>{field.label}:</span>
                    <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
                        {canEditCustomFields ? (
                            <textarea name={field.name} className="custom-field" rows={getFieldRows(field.value)} defaultValue={field.value ?? ''} style={{ ...styles.inputField, cursor: 'text' }} />
                        ) : (field.value ?? '')}
                    </span>
                </div>
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
        if (!value) return 'Ngày';
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
    const inspectionTbpSignature = (phieuKiemXacNhan || []).find((item) =>
        ['TBP_CONG_DOAN', 'TBP'].includes(String(item?.VaiTro || '').toUpperCase())
    );
    const v01TbpSignature = inspectionTbpSignature ? {
        ThoiGian: inspectionTbpSignature.ThoiGian,
        FullName: inspectionTbpSignature.TenNguoiXacNhan || inspectionTbpSignature.FullName,
        SignatureDataUrl: inspectionTbpSignature.SignatureDataUrl || null
    } : {
        ThoiGian: info.CreatorConfirmedAt,
        FullName: info.CreatorConfirmerName,
        SignatureDataUrl: info.CreatorSignatureDataUrl || null
    };

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
    const getInspectedQuantity = (defect) => {
        const candidates = useDefectInspectedQuantityOnly
            ? [defect?.SoLuongKiem]
            : [defect?.SoLuongKiem, info.SoLuong, bienBanSoLuongKhongPhuHop];
        return candidates.find((value) => value !== null && value !== undefined && String(value).trim() !== '' && Number(value) > 0) ?? '';
    };

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
                                                    <div style={{ fontSize: '9.5pt' }}>Trang:</div>
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
                                                        <div style={{ fontSize: '11pt' }}>Trang:</div>
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
                                                        Số: {[info.SoBienBan || info.SoPhieu, info.MaDonViTaoPhieu].filter(Boolean).join('/')}
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
                                                <th style={{ ...styles.th, width: '82px' }}>Số lượng kiểm</th>
                                                <th style={{ ...styles.th, width: '82px' }}>Số lượng lỗi</th>
                                                <th style={{ ...styles.th, width: '76px' }}>Tỷ lệ lỗi, %</th>
                                                <th style={{ ...styles.th, width: '100px' }}>Mã lỗi</th>
                                                <th style={styles.th}>Ghi chú</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {printDefects.map((d, index) => (
                                                <tr key={index}>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>{index + 1}</td>
                                                    <td style={styles.td}>{d ? (isV01 ? (d.TenDoiTuong || customData.TenSanPham || info.TenSanPham || '') : d.TenLoi) : '\u00a0'}</td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>{d ? getInspectedQuantity(d) : ''}</td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>{d ? Number(d.SoLuong || 0).toLocaleString('vi-VN') : ''}</td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                                        {d && Number(getInspectedQuantity(d)) > 0
                                                            ? ((Number(d.SoLuong || 0) / Number(getInspectedQuantity(d))) * 100).toFixed(0) + '%'
                                                            : d ? '0%' : ''}
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
                                            <div style={styles.text}>{formatSignatureDate(v01TbpSignature.ThoiGian)}</div>
                                            <div style={styles.boldText}>TRƯỞNG BỘ PHẬN</div>
                                            <PrintSignatureImage src={v01TbpSignature.SignatureDataUrl} height={60} />
                                            <div style={styles.text}>{v01TbpSignature.FullName || '(Ký, họ tên)'}</div>
                                        </Box>
                                    ) : (
                                        <>
                                            <Box style={styles.signatureCol}>
                                                <div style={styles.text}>{formatSignatureDate(kphKnSignature?.ThoiGian)}</div>
                                                <div style={styles.boldText}>PHÒNG KN</div>
                                                <PrintSignatureImage src={kphKnSignature?.SignatureDataUrl} height={60} />
                                                <div style={styles.text}>{kphKnSignature?.FullName || '(Ký, họ tên)'}</div>
                                            </Box>
                                            <Box style={styles.signatureCol}>
                                                <div style={styles.text}>{formatSignatureDate(kphBpsxSignature?.ThoiGian)}</div>
                                                <div style={styles.boldText}>PHÒNG/BAN/BPSX</div>
                                                <PrintSignatureImage src={kphBpsxSignature?.SignatureDataUrl} height={60} />
                                                <div style={styles.text}>{kphBpsxSignature?.FullName || '(Ký, họ tên)'}</div>
                                            </Box>
                                        </>
                                    )}
                                    <Box style={styles.signatureCol}>
                                        <div style={styles.text}>Ngày</div>
                                        <div style={styles.boldText}>NGƯỜI LẬP</div>
                                        <PrintSignatureImage src={info.NguoiLapSignatureDataUrl} height={60} />
                                        <div style={styles.text}>{info.NguoiLap || '(Ký, họ tên)'}</div>
                                    </Box>
                                </Box>

                                {/* 5. Đề xuất xử lý */}
                                <Box mt={3}>
                                    <div style={styles.sectionTitle}>5. Đề xuất xử lý</div>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...styles.th, width: '35%' }}>Nội dung</th>
                                                <th style={styles.th}>Hình thức xử lý</th>
                                                <th style={styles.th}>Trách nhiệm</th>
                                                <th style={styles.th}>Thời hạn</th>
                                                <th style={styles.th}>Theo dõi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {printProposals.map((x, index) => (
                                                <tr key={index}>
                                                    <td style={styles.td}>{x?.NoiDung || '\u00a0'}</td>
                                                    <td style={styles.td}>{x?.DeNghiXuLy || ''}</td>
                                                    <td style={styles.td}>{x?.TrachNhiem || ''}</td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>{x?.ThoiHan ? new Date(x.ThoiHan).toLocaleDateString('vi-VN') : ''}</td>
                                                    <td style={styles.td}>{x?.TheoDoi || ''}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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
                                                                {opinion?.HasOpinion && (opinion?.OpinionSavedAt || opinion?.ThoiGian) ? ` ${new Date(opinion.OpinionSavedAt || opinion.ThoiGian).toLocaleDateString('vi-VN')}` : ''}
                                                            </div>
                                                            <div style={{ whiteSpace: 'pre-wrap', minHeight: '34px' }}>{opinion?.HasOpinion ? (opinion?.NoiDung || '') : ''}</div>
                                                        </td>
                                                        <td style={{ ...styles.td, textAlign: 'center', verticalAlign: 'middle' }}>
                                                            {opinion?.HasConfirmed ? <>
                                                                <PrintSignatureImage src={opinion.SignatureDataUrl} height={42} />
                                                                {opinion.ConfirmedByName || ''}
                                                            </> : ''}
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
                                                <PrintSignatureImage src={item.SignatureDataUrl} height={90} />
                                                <div style={styles.text}>{item.FullName || '(Ký, họ tên)'}</div>
                                            </Box>
                                        ))}
                                    </Box>
                                )}

                                {/* 8. Theo dõi */}
                                <Box mt={2} pt={0}>
                                    <Box className="avoid-break">
                                        <div style={styles.sectionTitle}>8. Theo dõi đánh giá</div>
                                        <div style={{ display: 'flex', marginTop: '8px' }}>
                                            {renderCheckbox('Thỏa mãn', followUpEvaluation?.KetQua === 'THOA_MAN')}
                                            {renderCheckbox('Không thỏa mãn', followUpEvaluation?.KetQua === 'KHONG_THOA_MAN')}
                                            <span style={{ marginLeft: '40px', overflowWrap: 'anywhere' }}>Phiếu KPH mới số: {followUpEvaluation?.PhieuKphMoiSo || ''}</span>
                                        </div>
                                        <div style={{ marginTop: '16px', border: isV01 ? '1px solid #000' : 'none', minHeight: isV01 ? '100px' : 'auto', padding: isV01 ? '6px' : 0 }}>
                                            <div style={{ ...styles.text, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>Ghi chú: {followUpEvaluation?.GhiChu || ''}</div>
                                        </div>
                                    </Box>

                                    <div className="avoid-break" style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ paddingLeft: '16px' }}>
                                            <div style={styles.boldText}>Nơi nhận:</div>
                                            {receiveDepartmentRows.length > 0 ? receiveDepartmentRows.map((departmentCodes, index) => (
                                                <div key={departmentCodes.join('-')} style={{ ...styles.text, fontSize: '9pt' }}>
                                                    - {departmentCodes.join(', ')}{index === receiveDepartmentRows.length - 1 ? ';' : ','}
                                                </div>
                                            )) : null}
                                            <div style={{ ...styles.text, fontSize: '9pt' }}>- Lưu ({creatorDepartmentCode})</div>
                                        </div>
                                        <div style={{ textAlign: 'center', width: '250px' }}>
                                            <div style={styles.text}>{formatSignatureDate(followUpEvaluation?.ThoiGian)}</div>
                                            <div style={styles.boldText}>NGƯỜI THEO DÕI</div>
                                            <PrintSignatureImage src={followUpEvaluation?.SignatureDataUrl} height={60} />
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
