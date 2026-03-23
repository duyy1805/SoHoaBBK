import React from 'react';
import { Box, Typography, Grid } from '@mui/material';

// Hàm hỗ trợ chuyển số thứ tự thành số La Mã (I, II, III, IV...)
const toRoman = (num) => {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return roman[num] || num;
};

export const PhieuKiemPrintTemplate = React.forwardRef(({
    phieu = {},
    sections = [],
    checkItems = [],
    defects = []
}, ref) => {
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
        flexBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
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
                                <Typography style={{ fontWeight: 'bold', fontSize: '26pt', lineHeight: 1, color: '#00a0e3', fontStyle: 'italic', position: 'relative' }}>
                                    <span style={{ color: '#e3000f', position: 'absolute', top: '-10px', left: '35%', fontSize: '18pt' }}>★</span>
                                    Z<span style={{ color: '#e3000f' }}>76</span>
                                </Typography>
                                <Typography style={{ fontSize: '9pt', fontStyle: 'italic', color: '#00a0e3', fontWeight: 'bold', marginTop: '4px' }}>We try harder</Typography>
                            </td>
                            <td style={{ ...styles.headerTd, width: '55%', borderBottom: '1px solid #000' }}>
                                <Typography style={{ fontSize: '14pt' }}>CÔNG TY TNHH MTV 76</Typography>
                            </td>
                            <td rowSpan={2} style={{ ...styles.headerTd, width: '25%', textAlign: 'left', paddingLeft: '10px' }}>
                                <Typography style={{ fontSize: '11pt' }}>Mã số: BM.01.02- QT.04-KN</Typography>
                                <Typography style={{ fontSize: '11pt' }}>Ngày hiệu lực: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/2024</Typography>
                                <Typography style={{ fontSize: '11pt' }}>Phiên bản: 02</Typography>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ ...styles.headerTd, backgroundColor: '#fbe4d5' }}>
                                <Typography style={{ fontWeight: 'bold', fontSize: '16pt' }}>DANH MỤC KIỂM HÀNG LẦN CUỐI</Typography>
                                <Typography style={{ fontWeight: 'bold', fontSize: '14pt' }}>FINAL INSPECTION CHECKLIST</Typography>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ================= NỘI DUNG CHÍNH ================= */}
                <Box mb={3} className="avoid-break">

                    {/* Số phiếu & Ngày tháng */}
                    <Box style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                        <Box style={{ display: 'flex', justifyContent: 'space-between', width: '500px' }}>
                            <Typography style={{ ...styles.text, fontStyle: 'italic' }}>
                                Số: {phieu.SoPhieu || '..........'}/KN.
                            </Typography>
                            <Typography style={{ ...styles.text, fontStyle: 'italic' }}>
                                Ngày {phieu.NgayKiem ? new Date(phieu.NgayKiem).toLocaleDateString('vi-VN').replace(/\//g, ' tháng ').replace(/ tháng \d{4}/, (match) => match.replace(' tháng ', ' năm ')) : '......tháng ...... năm 20.....'}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Khung 2 ô Thông tin & Hình ảnh */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        {/* Cột trái: Thông tin sản phẩm & Phê duyệt */}
                        <Box sx={{ width: '35%', border: '1px solid #000', display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ p: 1, flex: 1 }}>
                                <Typography style={{ ...styles.text, fontSize: '10pt' }}>
                                    Sản phẩm: <b>{phieu.TenSanPham || '.......................................................'}</b>
                                </Typography>
                                <Typography style={{ ...styles.text, fontSize: '10pt' }}>
                                    Phiên bản: <b>{phieu.PhienBan || '........................................................'}</b>
                                </Typography>
                                <Typography style={{ ...styles.text, fontSize: '10pt' }}>
                                    Tham chiếu tiêu chuẩn: <b>{phieu.MaSanPham || '...........................................'}</b>
                                </Typography>
                            </Box>
                            <Box sx={{ borderTop: '1px solid #000', p: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '120px' }}>
                                <Typography style={styles.boldText}>PHÊ DUYỆT</Typography>
                            </Box>
                        </Box>

                        {/* Cột phải: Hình ảnh minh họa */}
                        <Box sx={{ width: '35%', border: '1px solid #000', p: 1, display: 'flex', flexDirection: 'column' }}>
                            <Typography style={{ ...styles.text, fontSize: '10pt' }}>*Hình ảnh minh họa sản phẩm</Typography>
                        </Box>
                    </Box>

                    {/* Bảng Thông tin Lô hàng */}
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
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', height: '26px' }}>{phieu.NhaCungCap}</td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Khách hàng</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>{phieu.KhachHang}</td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Số đơn hàng/</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>{phieu.SoDonHang}</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', textAlign: 'right' }}>cái</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', textAlign: 'right' }}>hộp</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 4px 4px 0', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>NV Kiểm hàng</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', height: '26px' }}>{phieu.TenNguoiKiem}</td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Tên sản phẩm</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>{phieu.TenSanPham}</td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Số lượng</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>{phieu.SoLuong}</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', textAlign: 'right' }}>cái</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', textAlign: 'right' }}>hộp</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 4px 4px 0', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Mức độ kiểm tra</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', height: '26px' }}>{phieu.MucDoKiemTra}</td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Kích thước SP</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>{phieu.KichThuoc}</td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>hàng xuất</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>{phieu.HangXuat}</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', textAlign: 'right' }}>cái</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', textAlign: 'right' }}>hộp</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 4px 4px 0', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Kế hoạch kiểm hàng</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', height: '26px' }}>{phieu.KeHoachKiemHang}</td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Ngày kiểm tra</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>{phieu.NgayKiem ? new Date(phieu.NgayKiem).toLocaleDateString('vi-VN') : ''}</td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}></td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}></td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', textAlign: 'right' }}>cái</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', textAlign: 'right' }}>hộp</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 4px 4px 0', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}></td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt', height: '26px' }}></td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Nơi đến</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>{phieu.NoiDen}</td>
                                <td style={{ padding: '4px 8px', border: 'none', fontSize: '11pt', verticalAlign: 'middle' }}>Tổng SL</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '11pt' }}>{phieu.TongSL}</td>
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
                                                <Typography style={styles.boldText}>
                                                    {toRoman(sIndex + 1)}. {section.TenNhom.toUpperCase()}
                                                </Typography>
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

                {/* ================= KẾT LUẬN & CHỮ KÝ ================= */}
                <Box className="avoid-break" mt={3} pl={1} pb={2}>

                    <Box mb={2} style={{ display: 'flex', alignItems: 'center' }}>
                        <Typography style={{ ...styles.boldText, marginRight: '15px' }}>* Kết luận:</Typography>
                        <Typography style={{ ...styles.boldText, textTransform: 'uppercase' }}>
                            {phieu.KetLuan === 'DAT' ? 'ĐẠT YÊU CẦU' : phieu.KetLuan === 'KHONG_DAT' ? 'KHÔNG ĐẠT YÊU CẦU' : '.........................................................'}
                        </Typography>
                    </Box>

                    <Box mb={4} style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                        <Typography style={styles.boldText}>* Kết quả xử lý:</Typography>
                        <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {renderCheckbox(phieu.KetLuan === 'DAT')} <span>Cho xuất hàng</span>
                        </Box>
                        <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {renderCheckbox(phieu.KetLuan === 'KHONG_DAT')} <span>Giữ lại hàng (Lập biên bản KPH)</span>
                        </Box>
                    </Box>

                    <Box style={{ ...styles.signatureBlock, marginTop: '20px' }}>
                        <Box style={styles.signatureCol}>
                            <Typography style={{ ...styles.text, minHeight: '40px' }}><b>Phòng Kiểm nghiệm</b></Typography>
                            <Box height="70px"></Box>
                        </Box>
                        <Box style={styles.signatureCol}>
                            <Typography style={{ ...styles.text, minHeight: '40px' }}><b>Người kiểm hàng</b></Typography>
                            <Box height="70px"></Box>
                            <Typography style={styles.text}>{phieu.TenNguoiKiem}</Typography>
                        </Box>
                        <Box style={styles.signatureCol}>
                            <Typography style={{ ...styles.text, minHeight: '40px' }}><b>Phân xưởng SX</b></Typography>
                            <Box height="70px"></Box>
                        </Box>
                    </Box>

                    <Box mt={4}>
                        <Typography style={{ fontSize: '11pt' }}>
                            <b>* Ghi chú:</b> Báo cáo kiểm hàng lần cuối của từng sản phẩm được lập căn cứ theo tiêu chuẩn kỹ thuật của sản phẩm.
                        </Typography>
                    </Box>

                </Box>

            </div>
        </div>
    );
});