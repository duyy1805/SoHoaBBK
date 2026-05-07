import React from 'react';
import { Box, Grid } from '@mui/material';

// Hàm hỗ trợ chuyển số thứ tự thành số La Mã (I, II, III, IV...)
const toRoman = (num) => {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return roman[num] || num;
};

export const PhieuKiemPrintTemplate = React.forwardRef(({
    phieu = {},
    sections = [],
    checkItems = [],
    defects = [],
    dynamicFields = [],
    thongSoList = [],
    thongSoKqList = []
}, ref) => {
    if (!phieu) return null;

    // Chuyển array dynamicFields thành object để dễ map vào thẻ input
    const customData = (dynamicFields || []).reduce((acc, field) => {
        if (field?.FieldName) acc[field.FieldName] = field.FieldValue;
        return acc;
    }, {});

    // Tính toán kích thước sản phẩm từ thongSoList (Cấp độ đặc biệt)
    const specDimensions = (() => {
        const dimGroup = (thongSoList || []).filter(ts => ts.NhomThongSo === "Kích thước sản phẩm");
        if (dimGroup.length === 0) return null;

        const dai = dimGroup.find(ts => ts.TenThongSo?.toLowerCase() === "dài")?.GiaTriChuan;
        const rong = dimGroup.find(ts => ts.TenThongSo?.toLowerCase() === "rộng")?.GiaTriChuan;
        const cao = dimGroup.find(ts => ts.TenThongSo?.toLowerCase() === "cao")?.GiaTriChuan;

        return [dai, rong, cao].filter(v => v !== undefined && v !== null && v !== "").join(" x ");
    })();

    // Lấy số lượng từ các nhóm kiểm (sections) tương ứng
    const khayQty = sections.find(s => s.TenNhom?.toUpperCase() === "KHAY HỘP CARTON")?.TongSo;
    const palletQty = sections.find(s => s.TenNhom?.toUpperCase() === "PALLET")?.TongSo;

    const styles = {
        previewBackground: {
            backgroundColor: '#e5e7eb',
            padding: '40px',
            display: 'flex',
            justifyContent: 'center',
            fontFamily: '"Times New Roman", Times, serif',
            color: '#000',
        },
        documentPaper: {
            width: '297mm', // Khổ A4 ngang
            minHeight: '210mm',
            backgroundColor: '#fff',
            padding: '15mm 20mm', // Lề giấy ảo trên web
            boxSizing: 'border-box',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        },
        text: { fontSize: '11pt', marginBottom: '4px' },
        boldText: { fontSize: '11pt', fontWeight: 'bold' },
        table: { border: '1px solid #000', borderCollapse: 'collapse', width: '100%', marginBottom: '15px' },
        th: { border: '1px solid #000', padding: '6px 4px', fontWeight: 'bold', textAlign: 'center', fontSize: '10pt', backgroundColor: '#f9f9f9' },
        td: { border: '1px solid #000', padding: '6px 8px', fontSize: '10pt', verticalAlign: 'middle' },
        tdCenter: { border: '1px solid #000', padding: '6px 4px', fontSize: '10pt', textAlign: 'center', verticalAlign: 'middle' },
        headerTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '15px', border: '1px solid #000' },
        headerTd: { border: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'middle' },
        signatureBlock: { display: 'flex', justifyContent: 'space-between', marginTop: '30px', textAlign: 'center', width: '100%' },
        signatureCol: { flex: 1, padding: '0 10px' },
        flexBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        inputField: { width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 'inherit', fontFamily: 'inherit', padding: 0, margin: 0, color: 'inherit' }
    };

    const renderCheckbox = (checked) => (
        <span style={{
            width: '14px',
            height: '14px',
            border: '1px solid #000',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            lineHeight: 1
        }}>
            {checked ? 'x' : ''}
        </span>
    );

    return (
        <div ref={ref} style={styles.previewBackground} className="preview-background">
            <style>
                {`
                @page {
                    size: A4 landscape; /* Bắt buộc in ngang */
                    margin: 15mm 20mm; /* Lề in thực tế */
                }
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        background-color: #fff;
                    }
                    /* Tắt các shadow và margin ảo khi in */
                    .preview-background { 
                        padding: 0 !important; 
                        background-color: transparent !important; 
                        display: block !important; 
                    }
                    .document-paper {
                        box-shadow: none !important;
                        border: none !important;
                        margin: 0 !important;
                        padding: 0 !important; 
                        width: 100% !important;
                        min-height: auto !important;
                        display: block !important;
                    }
                    /* thead của bảng Checklist sẽ tự động lặp lại nếu nhảy trang */
                    thead { display: table-header-group; }
                    .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
                    tr { page-break-inside: avoid !important; break-inside: avoid !important; }
                }
                `}
            </style>

            <div className="document-paper" style={styles.documentPaper}>

                {/* ================= HEADER CÔNG TY ================= */}
                <table style={styles.headerTable}>
                    <tbody>
                        <tr>
                            <td rowSpan={2} style={{ ...styles.headerTd, width: '20%' }}>
                                <img src="/logo.png" alt="Logo Z76" style={{ height: '70px', display: 'block', margin: '0 auto' }} />
                            </td>
                            <td style={{ ...styles.headerTd, width: '55%', borderBottom: '1px solid #000' }}>
                                <div style={{ fontSize: '14pt' }}>CÔNG TY TNHH MTV 76</div>
                            </td>
                            <td rowSpan={2} style={{ ...styles.headerTd, width: '25%', textAlign: 'left', paddingLeft: '10px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>Mã số: </div> <span>BM.01.02- QT.04-B8</span>
                                <div style={{ fontSize: '11pt' }}>Ngày hiệu lực: 15/3/2026</div>
                                <div style={{ fontSize: '11pt' }}>Phiên bản: 02</div>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ ...styles.headerTd, backgroundColor: '#fbe4d5' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '16pt' }}>DANH MỤC KIỂM HÀNG LẦN CUỐI</div>
                                <div style={{ fontWeight: 'bold', fontSize: '14pt' }}>FINAL INSPECTION CHECKLIST</div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ================= NỘI DUNG CHÍNH ================= */}
                <Box mb={3} className="avoid-break">

                    {/* Số phiếu & Ngày tháng */}
                    <Box style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                        <Box style={{ display: 'flex', justifyContent: 'space-between', width: '500px' }}>
                            <div style={{ ...styles.text, fontStyle: 'italic' }}>
                                Số: {phieu.SoPhieu || '..........'}/KN.
                            </div>
                            <div style={{ ...styles.text, fontStyle: 'italic' }}>
                                Ngày {phieu.NgayKiem ? new Date(phieu.NgayKiem).toLocaleDateString('vi-VN').replace(/\//g, ' tháng ').replace(/ tháng \d{4}/, (match) => match.replace(' tháng ', ' năm ')) : new Date().toLocaleDateString('vi-VN').replace(/\//g, ' tháng ').replace(/ tháng \d{4}/, (match) => match.replace(' tháng ', ' năm '))}
                            </div>
                        </Box>
                    </Box>

                    {/* Khung 2 ô Thông tin & Hình ảnh */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        {/* Cột trái: Thông tin sản phẩm & Phê duyệt */}
                        <Box sx={{ width: '49%', border: '1px solid #000', display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ p: 1, flex: 1 }}>
                                <div style={{ ...styles.text, fontSize: '10pt' }}>
                                    Sản phẩm: <b>{phieu.TenSanPham || '...........................................................................'}</b>
                                </div>
                                <div style={{ ...styles.text, fontSize: '10pt' }}>
                                    Phiên bản: <b>{phieu.PhienBan || '...........................................................................'}</b>
                                </div>
                                <div style={{ ...styles.text, fontSize: '10pt' }}>
                                    Tham chiếu tiêu chuẩn: <b>{phieu.MaSanPham || '...........................................................................'}</b>
                                </div>
                            </Box>
                            <Box sx={{ borderTop: '1px solid #000', p: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '120px' }}>
                                <div style={styles.boldText}>PHÊ DUYỆT</div>
                            </Box>
                        </Box>

                        {/* Cột phải: Hình ảnh minh họa */}
                        <Box sx={{ width: '35%', border: '1px solid #000', p: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ ...styles.text, fontSize: '10pt' }}>*Hình ảnh minh họa sản phẩm</div>
                        </Box>
                    </Box>

                    {/* Bảng Thông tin Lô hàng có class "custom-field" để lấy giá trị động */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                        <colgroup>
                            <col style={{ width: '16%' }} />
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '22%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '4%' }} />
                            <col style={{ width: '4%' }} />
                        </colgroup>
                        <tbody>
                            <tr>
                                <td style={{ padding: '4px 4px 4px 0', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Nhà cung cấp</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', height: '26px' }}>
                                    <input name="NhaCungCap" className="custom-field" type="text" defaultValue={customData.NhaCungCap || phieu.NhaCungCap || 'Công ty TNHH MTV 76'} style={styles.inputField} />
                                </td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Khách hàng</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>
                                    <input name="KhachHang" className="custom-field" type="text" defaultValue={customData.KhachHang || phieu.KhachHang || ''} style={styles.inputField} />
                                </td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Số đơn hàng/</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>
                                    <input name="SoDonHang" className="custom-field" type="text" defaultValue={customData.SoDonHang || phieu.SoDonHang || ''} style={styles.inputField} />
                                </td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', textAlign: 'right' }}>cái</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', textAlign: 'right' }}>hộp</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 4px 4px 0', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>NV Kiểm hàng</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', height: '26px' }}>
                                    <input name="NVienKiemHang" className="custom-field" type="text" defaultValue={customData.NVienKiemHang || phieu.TenNguoiKiem || ''} style={styles.inputField} />
                                </td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Tên sản phẩm</td>
                                <td style={{ border: '1px solid #000', padding: '2px 6px', fontSize: '11pt', verticalAlign: 'middle' }}>
                                    <textarea
                                        name="TenSanPham"
                                        className="custom-field"
                                        defaultValue={customData.TenSanPham || phieu.TenSanPham || ''}
                                        style={{ ...styles.inputField, resize: 'none', overflow: 'hidden', minHeight: '36px', display: 'block' }}
                                        onInput={(e) => {
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                        }}
                                        rows={2}
                                    />
                                </td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Số lượng</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>
                                    <input name="SoLuong" className="custom-field" type="text" defaultValue={customData.SoLuong || phieu.SoLuong || ''} style={styles.inputField} />
                                </td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', textAlign: 'right' }}>cái</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', textAlign: 'right' }}>hộp</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 4px 4px 0', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Mức độ kiểm tra</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', height: '26px' }}>
                                    <input name="MucDoKiemTra" className="custom-field" type="text" defaultValue={customData.MucDoKiemTra || phieu.MucDoKiemTra || ''} style={styles.inputField} />
                                </td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Kích thước SP</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>
                                    <input name="KichThuocSP" className="custom-field" type="text" defaultValue={specDimensions || customData.KichThuocSP || phieu.KichThuoc || ''} style={styles.inputField} />
                                </td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Khay</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>
                                    <input name="Khay" className="custom-field" type="text" defaultValue={khayQty || customData.Khay || phieu.Khay || ''} style={styles.inputField} />
                                </td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', textAlign: 'right' }}>cái</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', textAlign: 'right' }}>hộp</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 4px 4px 0', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Kế hoạch kiểm hàng</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', height: '26px' }}>
                                    <input name="KeHoachKiemHang" className="custom-field" type="text" defaultValue={customData.KeHoachKiemHang || phieu.KeHoachKiemHang || ''} style={styles.inputField} />
                                </td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Ngày kiểm tra</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>
                                    <input name="NgayKiemTra" className="custom-field" type="text" defaultValue={customData.NgayKiemTra || (phieu.NgayKiem ? new Date(phieu.NgayKiem).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN'))} style={styles.inputField} />
                                </td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Pallet</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>
                                    <input name="Pallet" className="custom-field" type="text" defaultValue={palletQty || customData.Pallet || phieu.Pallet || ''} style={styles.inputField} />
                                </td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', textAlign: 'right' }}>cái</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', textAlign: 'right' }}>hộp</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 4px 4px 0', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}></td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', height: '26px' }}>
                                    <input name="Extra2" className="custom-field" type="text" defaultValue={customData.Extra2 || ''} style={styles.inputField} />
                                </td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Nơi đến</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>
                                    <input name="NoiDen" className="custom-field" type="text" defaultValue={customData.NoiDen || phieu.NoiDen || phieu.DoiTuong || ''} style={styles.inputField} />
                                </td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Tổng SL</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>
                                    <input name="TongSL" className="custom-field" type="text" defaultValue={customData.TongSL || phieu.TongSL || ''} style={styles.inputField} />
                                </td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}></td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}></td>
                            </tr>
                        </tbody>
                    </table>
                </Box>

                {/* ================= BẢNG KIỂM TRA ================= */}
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th rowSpan={2} style={{ ...styles.th, width: '4%' }}>TT<br />No</th>
                            <th rowSpan={2} style={{ ...styles.th, width: '25%' }}>MỤC KIỂM TRA<br />Checklist</th>
                            <th rowSpan={2} style={{ ...styles.th, width: '15%' }}>Phương pháp KT</th>
                            <th rowSpan={2} style={{ ...styles.th, width: '20%' }}>TIÊU CHUẨN KỸ THUẬT<br />Standard</th>
                            <th colSpan={2} style={{ ...styles.th, width: '12%' }}>KẾT QUẢ<br />Finding</th>
                            <th colSpan={3} style={{ ...styles.th, width: '24%' }}>DẠNG LỖI</th>
                        </tr>
                        <tr>
                            <th style={{ ...styles.th, width: '6%' }}>OK</th>
                            <th style={{ ...styles.th, width: '6%' }}>N.OK</th>
                            <th style={{ ...styles.th, width: '8%' }}>Lỗi nhẹ<br />(Mi)</th>
                            <th style={{ ...styles.th, width: '8%' }}>Lỗi nặng<br />(Ma)</th>
                            <th style={{ ...styles.th, width: '8%' }}>Lỗi N.trọng<br />(Cr)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sections.map((section, sIndex) => {
                            const sectionItems = checkItems.filter(item => item.SectionId === section.Id);

                            return (
                                <React.Fragment key={section.Id}>
                                    {/* Tên Section */}
                                    <tr className="avoid-break" style={{ backgroundColor: '#f0f0f0' }}>
                                        <td colSpan={6} style={{ ...styles.td, padding: '8px' }}>
                                            <Box style={styles.flexBetween}>
                                                <div style={styles.boldText}>
                                                    {toRoman(sIndex + 1)}. {section.TenNhom.toUpperCase()} {section.InspectionLevel ? <span style={{ fontWeight: 'normal', fontSize: '10pt', marginLeft: '5px' }}> - AQL: {section.InspectionLevel}</span> : ''}
                                                </div>
                                                <Box style={{ display: 'flex', gap: '40px', paddingRight: '20px' }}>
                                                    <span>Tổng số: <span style={{ display: 'inline-block', minWidth: '40px', borderBottom: '1px dotted #000', textAlign: 'center' }}><b>{section.TongSo}</b></span> Pcs</span>
                                                    <span>Số lượng kiểm: <span style={{ display: 'inline-block', minWidth: '40px', borderBottom: '1px dotted #000', textAlign: 'center' }}><b>{section.SoLuongKiem}</b></span> Pcs</span>
                                                </Box>
                                            </Box>
                                        </td>
                                    </tr>

                                    {/* Các mục kiểm tra */}
                                    {sectionItems.map((item, iIndex) => {
                                        const itemDefects = defects.filter(d => d.CheckItemId === item.Id);
                                        const sumDefects = (type) => itemDefects
                                            .filter(d => d.DefectType === type)
                                            .reduce((sum, d) => sum + (d.SoLuong || 0), 0);

                                        const minorQty = sumDefects('MINOR');
                                        const majorQty = sumDefects('MAJOR');
                                        const criticalQty = sumDefects('CRITICAL');

                                        return (
                                            <tr key={item.Id} className="avoid-break">
                                                <td style={styles.tdCenter}>{iIndex + 1}</td>
                                                <td style={styles.td}>{item.TenMucKiem}</td>
                                                <td style={styles.td}>{item.PhuongPhapKiem}</td>
                                                <td style={styles.td}>{item.TieuChuan}</td>

                                                <td style={styles.tdCenter}>{renderCheckbox(item.KetQua === 'DAT')}</td>
                                                <td style={styles.tdCenter}>{renderCheckbox(item.KetQua === 'KHONG_DAT')}</td>

                                                <td style={styles.tdCenter}>{minorQty > 0 ? minorQty : ''}</td>
                                                <td style={styles.tdCenter}>{majorQty > 0 ? majorQty : ''}</td>
                                                <td style={styles.tdCenter}>{criticalQty > 0 ? criticalQty : ''}</td>
                                            </tr>
                                        );
                                    })}

                                    {/* Footer của Section (Tổng lỗi & AQL) */}
                                    <tr className="avoid-break">
                                        <td colSpan={6} style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>Tổng lỗi thực tế:</td>
                                        <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>{section.TotalMinor}</td>
                                        <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>{section.TotalMajor}</td>
                                        <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>{section.TotalCritical}</td>
                                    </tr>
                                    <tr className="avoid-break">
                                        <td colSpan={6} style={{ ...styles.td, textAlign: 'right', fontStyle: 'italic' }}>Lỗi tối đa có thể chấp nhận (Ac):</td>
                                        <td style={styles.tdCenter}>{section.Ac_Minor}</td>
                                        <td style={styles.tdCenter}>{section.Ac_Major}</td>
                                        <td style={styles.tdCenter}>{section.Ac_Critical}</td>
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>

                {/* ================= BẢNG KIỂM TRA CẤP ĐỘ ĐẶC BIỆT ================= */}
                {thongSoList && thongSoList.length > 0 && (() => {
                    const maxSample = thongSoKqList.length > 0
                        ? Math.max(...thongSoKqList.map(kq => kq.ThuTuMau))
                        : 13;
                    const sampleIndices = Array.from({ length: maxSample }, (_, i) => i + 1);

                    const groups = {};
                    thongSoList.forEach(ts => {
                        const key = ts.NhomThongSo || ts.TenThongSo || `ts-${ts.Id}`;
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(ts);
                    });
                    const groupKeys = Object.keys(groups);

                    const checkVal = (ts, value) => {
                        if (value === undefined || value === null || value === '') return null;
                        const num = Number(value);
                        if (isNaN(num)) return null;
                        const chuan = Number(ts.GiaTriChuan);
                        if (isNaN(chuan)) return null;
                        const min = chuan - Number(ts.DungSaiAm);
                        const max = chuan + Number(ts.DungSaiDuong);
                        return (num >= min && num <= max) ? 'DAT' : 'KHONG_DAT';
                    };

                    return (
                        <Box className="avoid-break" mt={3}>
                            <Box mb={1} style={{ textAlign: 'center' }}>
                                <div style={{ ...styles.boldText, fontSize: '12pt' }}>Kết quả kiểm theo cấp độ đặc biệt</div>
                            </Box>
                            <div style={{ fontSize: '11pt', marginBottom: '4px' }}><b>Số mẫu cần lấy:</b></div>
                            <table style={{ ...styles.table, width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th rowSpan={2} style={{ ...styles.th, width: '9%', verticalAlign: 'bottom' }}>
                                            Chỉ tiêu<br /><span style={{ fontWeight: 'normal', fontSize: '10pt' }}>Thứ tự mẫu</span>
                                        </th>
                                        {groupKeys.map(key => (
                                            <th key={key} colSpan={groups[key].length} style={styles.th}>{key}</th>
                                        ))}
                                        <th rowSpan={2} style={{ ...styles.th, width: '10%' }}>Ghi chú</th>
                                    </tr>
                                    <tr>
                                        {thongSoList.map(ts => (
                                            <th key={ts.Id} style={{ ...styles.th, fontSize: '9pt', fontWeight: 'normal' }}>
                                                {ts.TenThongSo && ts.TenThongSo !== ts.NhomThongSo ? `${ts.TenThongSo} ` : ''}
                                                {ts.GiaTriChuan}
                                                {ts.DungSaiAm === ts.DungSaiDuong ? `±${ts.DungSaiAm}` : `(-${Math.abs(ts.DungSaiAm)}/+${ts.DungSaiDuong})`}
                                                {ts.DonVi ? ` ${ts.DonVi}` : ''}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sampleIndices.map(sampleIdx => (
                                        <tr key={sampleIdx}>
                                            <td style={styles.tdCenter}>{sampleIdx}</td>
                                            {thongSoList.map(ts => {
                                                const kq = thongSoKqList.find(r => r.ThongSoId === ts.Id && r.ThuTuMau === sampleIdx);
                                                const value = kq?.GiaTriDo;
                                                const status = checkVal(ts, value);
                                                return (
                                                    <td key={ts.Id} style={{
                                                        ...styles.tdCenter,
                                                        color: status === 'KHONG_DAT' ? 'red' : 'inherit',
                                                        fontWeight: status === 'KHONG_DAT' ? 'bold' : 'normal'
                                                    }}>
                                                        {value !== undefined && value !== null ? value : ''}
                                                    </td>
                                                );
                                            })}
                                            <td style={styles.td}></td>
                                        </tr>
                                    ))}
                                    <tr style={{ backgroundColor: '#f0f9f0' }}>
                                        <td style={{ ...styles.td, fontWeight: 'bold' }}>*Kết quả<br />Đạt</td>
                                        {thongSoList.map(ts => {
                                            const datCount = sampleIndices.filter(idx => {
                                                const kq = thongSoKqList.find(r => r.ThongSoId === ts.Id && r.ThuTuMau === idx);
                                                return checkVal(ts, kq?.GiaTriDo) === 'DAT';
                                            }).length;
                                            return <td key={ts.Id} style={{ ...styles.tdCenter, color: '#16a34a', fontWeight: 'bold' }}>{datCount > 0 ? datCount : ''}</td>;
                                        })}
                                        <td style={styles.td}></td>
                                    </tr>
                                    <tr style={{ backgroundColor: '#fff5f5' }}>
                                        <td style={{ ...styles.td, fontWeight: 'bold' }}>Không đạt</td>
                                        {thongSoList.map(ts => {
                                            const failCount = sampleIndices.filter(idx => {
                                                const kq = thongSoKqList.find(r => r.ThongSoId === ts.Id && r.ThuTuMau === idx);
                                                return checkVal(ts, kq?.GiaTriDo) === 'KHONG_DAT';
                                            }).length;
                                            return <td key={ts.Id} style={{ ...styles.tdCenter, color: failCount > 0 ? 'red' : 'inherit', fontWeight: failCount > 0 ? 'bold' : 'normal' }}>{failCount > 0 ? failCount : ''}</td>;
                                        })}
                                        <td style={styles.td}></td>
                                    </tr>
                                </tbody>
                            </table>
                        </Box>
                    );
                })()}

                {/* ================= KẾT LUẬN & CHỮ KÝ ================= */}
                <Box className="avoid-break" mt={3} pl={1} pb={2}>

                    <Box mb={2} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ ...styles.boldText, marginRight: '15px' }}>* Kết luận:</div>
                        <div style={{ ...styles.boldText, textTransform: 'uppercase' }}>
                            {phieu.KetLuan === 'DAT' ? 'ĐẠT YÊU CẦU' : phieu.KetLuan === 'KHONG_DAT' ? 'KHÔNG ĐẠT YÊU CẦU' : '.........................................................'}
                        </div>
                    </Box>

                    <Box mb={4} style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                        <div style={styles.boldText}>* Kết quả xử lý:</div>
                        <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {renderCheckbox(phieu.KetLuan === 'DAT')} <span>Cho xuất hàng</span>
                        </Box>
                        <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {renderCheckbox(phieu.KetLuan === 'KHONG_DAT')} <span>Giữ lại hàng (Lập biên bản KPH)</span>
                        </Box>
                    </Box>

                    <Box style={{ ...styles.signatureBlock, marginTop: '20px' }}>
                        <Box style={styles.signatureCol}>
                            <div style={{ ...styles.text, minHeight: '40px' }}><b>Phòng Kiểm nghiệm</b></div>
                            <Box height="70px">{ }</Box>
                            <div style={styles.text}>{phieu.KiemNghiem}</div>
                        </Box>
                        <Box style={styles.signatureCol}>
                            <div style={{ ...styles.text, minHeight: '40px' }}><b>Người kiểm hàng</b></div>
                            <Box height="70px"></Box>
                            <div style={styles.text}>{phieu.TenNguoiKiem}</div>
                        </Box>
                        {phieu.BoPhan && (
                            <Box style={styles.signatureCol}>
                                <div style={{ ...styles.text, minHeight: '40px' }}><b>Phân xưởng SX</b></div>
                                <Box height="70px"></Box>
                                <div style={styles.text}>{phieu.BoPhan}</div>
                            </Box>
                        )}
                    </Box>

                    <Box mt={4}>
                        <div style={{ fontSize: '8pt' }}>
                            <b>* Ghi chú:</b> Các lỗi dễ bị phản ánh hoặc đã có khiếu nại của khách hàng được cập nhật trong báo cáo kiểm hàng bằng những dòng chữ in đậm-nghiêng để chú ý và kiểm soát chặt chẽ hơn trong quá trình kiểm tra.
                        </div>
                    </Box>

                </Box>

            </div>
        </div>
    );
});