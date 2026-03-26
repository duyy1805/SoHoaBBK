import React, { useState } from 'react';
import { Box, Grid } from '@mui/material';
import TextareaAutosize from '@mui/material/TextareaAutosize';

// Hàm hỗ trợ chuyển số thứ tự thành số La Mã (I, II, III, IV...)
const toRoman = (num) => {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return roman[num] || num;
};

export const PhieuGiamDinhPrintTemplate = React.forwardRef(({
    phieu = {},
    sections = [],
    checkItems = [],
    defects = [],
    dynamicFields = []
}, ref) => {

    const customData = (dynamicFields || []).reduce((acc, field) => {
        if (field?.FieldName) acc[field.FieldName] = field.FieldValue;
        return acc;
    }, {});
    const [loaiKiemTra, setLoaiKiemTra] = useState(customData.LoaiKiemTra || phieu.LoaiKiemTra || '');
    if (!phieu) return null;

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
        text: { fontSize: '12pt', marginBottom: '4px' },
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
        dottedLine: { flexGrow: 1, borderBottom: '2px dotted #000', marginLeft: '4px', position: 'relative', top: '-4px' },
        inputField: { width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 'inherit', fontFamily: 'inherit', padding: 0, margin: 0, color: 'inherit' }
    };


    // Checkbox nhỏ dùng trong bảng
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

    // Ô vuông to dùng cho CĐ1, CĐ2
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
                    /* thead của bảng sẽ tự động lặp lại nếu nhảy trang */
                    thead { display: table-header-group; }
                    .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
                    tr { page-break-inside: avoid !important; break-inside: avoid !important; }
                }
                `}
            </style>

            <div className="document-paper" style={styles.documentPaper}>

                <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>

                    {/* ================= HEADER CÔNG TY LẶP LẠI Ở MỖI TRANG ================= */}
                    <thead>
                        <tr>
                            <td style={{ border: 'none', paddingBottom: '10px' }}>
                                <table style={styles.headerTable}>
                                    <tbody>
                                        <tr>
                                            <td style={{ ...styles.headerTd, width: '20%' }}>
                                                <img src="/logo.png" alt="Logo Z76" style={{ height: '65px', display: 'block', margin: '0 auto' }} />
                                            </td>
                                            <td style={{ ...styles.headerTd, width: '55%' }}>
                                                <div style={{ fontSize: '14pt' }}>CÔNG TY TNHH MTV 76</div>
                                                <div style={{ fontWeight: 'bold', fontSize: '15pt' }}>PHIẾU GIÁM ĐỊNH CHẤT LƯỢNG VẬT TƯ ĐẦU VÀO</div>
                                            </td>
                                            <td style={{ ...styles.headerTd, width: '25%', textAlign: 'left', paddingLeft: '15px' }}>
                                                <div style={{ fontSize: '11pt' }}>Mã số: BM.02-QT.01-KN</div>
                                                <div style={{ fontSize: '11pt' }}>Ngày hiệu lực: 01/9/2024</div>
                                                <div style={{ fontSize: '11pt' }}>Phiên bản: 06</div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </thead>

                    {/* ================= NỘI DUNG CHÍNH (TỰ ĐỘNG CHẢY TRANG) ================= */}
                    <tbody>
                        <tr>
                            <td style={{ border: 'none' }}>

                                <Box mb={3} className="avoid-break">

                                    {/* Số phiếu */}
                                    <Box style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                                        <div style={{ ...styles.text, fontSize: '13pt', display: 'flex', alignItems: 'center' }}>
                                            <span style={{ whiteSpace: 'nowrap' }}>Số: </span>
                                            <input name="SoPhieu" className="custom-field" type="text" defaultValue={customData.SoPhieu || phieu.SoPhieu || ''} placeholder="...................................." style={styles.inputField} />
                                        </div>
                                    </Box>

                                    {/* Khối thông tin 2 cột */}
                                    <Grid container spacing={4} sx={{ mb: 2 }}>
                                        {/* Cột Trái */}
                                        <Grid size={{ xs: 6 }}>
                                            <Box display="flex" alignItems="flex-end" mb={1.5} style={styles.text}>
                                                <span style={{ whiteSpace: 'nowrap' }}>Ngày kiểm tra:</span>
                                                <span style={{ ...styles.dottedLine, flex: 1, marginLeft: '8px' }}>
                                                    <div name="NgayKiemTra"> {customData.NgayKiemTra || (phieu.NgayKiem ? new Date(phieu.NgayKiem).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN'))}</div>
                                                </span>
                                            </Box>
                                            <Box display="flex" alignItems="flex-end" mb={1.5} style={styles.text}>
                                                <span style={{ whiteSpace: 'nowrap' }}>Nhà cung cấp:</span>
                                                <span style={{ ...styles.dottedLine, flex: 1, marginLeft: '8px' }}>
                                                    <input name="NhaCungCap" className="custom-field" type="text" defaultValue={customData.NhaCungCap || phieu.NhaCungCap || ''} style={styles.inputField} />
                                                </span>
                                            </Box>
                                            <Box display="flex" alignItems="flex-start" mb={1.5} style={styles.text}>
                                                <span style={{ whiteSpace: 'nowrap', paddingTop: '2px' }}>Mặt hàng:</span>
                                                <span style={{ ...styles.dottedLine, flex: 1, marginLeft: '8px' }}>
                                                    <TextareaAutosize
                                                        name="MatHang"
                                                        className="custom-field"
                                                        defaultValue={customData.MatHang || phieu.TenSanPham || ''}
                                                        minRows={1} // Hiển thị ít nhất 1 dòng
                                                        // maxRows={2} // (Tùy chọn) Bỏ comment dòng này nếu bạn muốn nó giãn tối đa 2 dòng rồi mới hiện thanh cuộn
                                                        style={{
                                                            ...styles.inputField,
                                                            resize: 'none',
                                                            width: '100%',
                                                            border: 'none',
                                                            outline: 'none',
                                                            fontFamily: 'inherit',
                                                            backgroundColor: 'transparent'
                                                        }}
                                                    />
                                                </span>
                                            </Box>

                                            <Box
                                                display="flex"
                                                alignItems="center"
                                                mt={3}
                                                style={{ ...styles.text, cursor: 'pointer' }} // Thêm cursor pointer để người dùng biết có thể click
                                                onClick={() => setLoaiKiemTra('CD1')} // Khi click thì set state là CD1
                                            >
                                                <span>Kiểm tra bình thường: CĐ1</span>
                                                {renderSquareBox(loaiKiemTra === 'CD1')} {/* Sẽ hiển thị 'x' nếu state đang là CD1 */}
                                            </Box>
                                        </Grid>
                                        <input type="hidden" name="LoaiKiemTra" className="custom-field" value={loaiKiemTra} />
                                        {/* Cột Phải */}
                                        <Grid size={{ xs: 6 }}>
                                            <Box display="flex" alignItems="flex-end" mb={1.5} style={styles.text}>
                                                <span style={{ whiteSpace: 'nowrap' }}>Kế hoạch/Đơn hàng Z76:</span>
                                                <span style={{ ...styles.dottedLine, flex: 1, marginLeft: '8px' }}>
                                                    <input name="KeHoachDonHang" className="custom-field" type="text" defaultValue={customData.KeHoachDonHang || phieu.DoiTuong || ''} style={styles.inputField} />
                                                </span>
                                            </Box>
                                            <Box display="flex" alignItems="flex-end" mb={1.5} style={styles.text}>
                                                <span style={{ whiteSpace: 'nowrap' }}>Mã số truy nguyên/PO vật tư:</span>
                                                <span style={{ ...styles.dottedLine, flex: 1, marginLeft: '8px' }}>
                                                    <input name="MaSoTruyNguyen" className="custom-field" type="text" defaultValue={customData.MaSoTruyNguyen || phieu.Lot || ''} style={styles.inputField} />
                                                </span>
                                            </Box>
                                            <Box display="flex" alignItems="flex-end" mb={1.5} style={styles.text}>
                                                <span style={{ whiteSpace: 'nowrap' }}>Số lượng:</span>
                                                <span style={{ ...styles.dottedLine, flex: 1, marginLeft: '8px' }}>
                                                    <input name="SoLuong" className="custom-field" type="text" defaultValue={customData.SoLuong || phieu.SoLuong || ''} style={styles.inputField} />
                                                </span>
                                            </Box>

                                            <Box
                                                display="flex"
                                                alignItems="center"
                                                mt={3}
                                                style={{ ...styles.text, cursor: 'pointer' }}
                                                onClick={() => setLoaiKiemTra('CD2')} // Khi click thì set state là CD2
                                            >
                                                <span>Kiểm lần đầu, lô trước không đạt,<br />có khiếu nại, cảnh báo: CĐ2</span>
                                                {renderSquareBox(loaiKiemTra === 'CD2')} {/* Sẽ hiển thị 'x' nếu state đang là CD2 */}
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Box>

                                {/* ================= BẢNG KIỂM TRA (GIỮ NGUYÊN TỪ PHIẾU KIỂM) ================= */}
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
                                                                    {toRoman(sIndex + 1)}. {section.TenNhom.toUpperCase()}
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

                                {/* ================= KẾT LUẬN & CHỮ KÝ TỔNG THỂ ================= */}
                                <Box className="avoid-break" mt={3} pl={1} pb={2}>
                                    <Box mb={2} style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                                        <div style={styles.boldText}>* Kết quả kiểm tra:</div>
                                        <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>Đạt</span> {renderSquareBox(phieu.KetLuan === 'DAT')}
                                        </Box>
                                        <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>Không đạt</span> {renderSquareBox(phieu.KetLuan === 'KHONG_DAT')}
                                        </Box>
                                    </Box>

                                    {/* Chữ ký dàn ngang */}
                                    <Box style={{ ...styles.signatureBlock, marginTop: '0' }}>
                                        <Box style={styles.signatureCol}>
                                            <div style={{ ...styles.text, minHeight: '40px' }}><b>Phòng QLCL</b></div>
                                            <Box height="70px"></Box>
                                            <div style={styles.text}>{phieu.KiemNghiem}</div>
                                        </Box>
                                        <Box style={styles.signatureCol}>
                                            <div style={{ ...styles.text, minHeight: '40px' }}><b>Nhân viên KT</b></div>
                                            <Box height="70px"></Box>
                                            <div style={styles.text}>{phieu.TenNguoiKiem}</div>
                                        </Box>
                                    </Box>

                                    <Box mt={4}>
                                        <div style={{ fontSize: '11pt' }}>
                                            <b>* Ghi chú:</b> Báo cáo kiểm hàng lần cuối của từng sản phẩm được lập căn cứ theo tiêu chuẩn kỹ thuật của sản phẩm.
                                        </div>
                                    </Box>
                                </Box>

                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div >
    );
});