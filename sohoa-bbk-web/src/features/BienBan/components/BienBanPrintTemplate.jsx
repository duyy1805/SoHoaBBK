import React from 'react';
import { Box, Typography, Grid } from '@mui/material';

export const BienBanPrintTemplate = React.forwardRef(({
    info = {},
    defects = [],
    xuLy = [],
    chiPhi = [],
    hanhDong = [],
    // xacNhan
}, ref) => {
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
        // Tờ giấy A4 liền mạch (cuộn vô tận trên web, tự cắt khi in)
        documentPaper: {
            width: '210mm',
            backgroundColor: '#fff',
            padding: '15mm 20mm', // Lề giấy
            boxSizing: 'border-box',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        },
        text: { fontSize: '12pt', marginBottom: '4px' },
        sectionTitle: { fontWeight: 'bold', fontSize: '12pt', marginTop: '15px', marginBottom: '8px' },
        dottedLine: { flexGrow: 1, borderBottom: '2px dotted #000', marginLeft: '8px', marginRight: '8px', textAlign: 'center', position: 'relative', top: '-4px' },
        table: { border: '1px solid #000', borderCollapse: 'collapse', width: '100%', marginBottom: '10px' },
        th: { border: '1px solid #000', padding: '4px', fontWeight: 'bold', textAlign: 'center', fontSize: '11pt' },
        td: { border: '1px solid #000', padding: '4px', fontSize: '11pt' },
        headerTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '15px', border: '1px solid #000' },
        headerTd: { border: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'middle' },
        signatureBlock: { display: 'flex', justifyContent: 'space-between', marginTop: '15px', textAlign: 'center', width: '100%' },
        signatureCol: { flex: 1, padding: '0 10px' },
        layoutTable: { width: '100%', borderCollapse: 'collapse', border: 'none' },
        layoutTd: { border: 'none', padding: '4px 0', verticalAlign: 'middle' }
    };

    const renderCheckboxRight = (label, checked) => (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '85%' }}>
            <span style={{ fontSize: '12pt' }}>{label}</span>
            <span style={{ width: '16px', height: '16px', border: '1px solid #000', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                {checked ? 'x' : ''}
            </span>
        </span>
    );

    const renderCheckbox = (label, checked) => (
        <span style={{ marginRight: '15px', display: 'inline-flex', alignItems: 'center' }}>
            <span style={{ width: '16px', height: '16px', border: '1px solid #000', display: 'inline-block', marginRight: '6px', textAlign: 'center', lineHeight: '14px', fontSize: '12px' }}>
                {checked ? 'x' : ''}
            </span>
            {label}
        </span>
    );

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

            <div className="document-paper" style={styles.documentPaper}>
                {/* SỬ DỤNG TABLE TỔNG ĐỂ AUTO PHÂN TRANG:
                  - <thead>: Luôn lặp lại ở đầu mỗi trang in
                  - <tbody>: Chứa nội dung, sẽ tự động cắt sang trang mới nếu quá dài
                */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>

                    {/* ===== HEADER LẶP LẠI ===== */}
                    <thead>
                        <tr>
                            <td style={{ border: 'none', paddingBottom: '10px' }}>
                                <table style={styles.headerTable}>
                                    <tbody>
                                        <tr>
                                            <td style={{ ...styles.headerTd, width: '20%' }}>
                                                <Typography style={{ fontWeight: 'bold', fontSize: '18pt', lineHeight: 1, color: '#00539c' }}>Z76</Typography>
                                                <Typography style={{ fontSize: '10pt', fontStyle: 'italic', color: '#00a0e3' }}>We try harder</Typography>
                                            </td>
                                            <td style={{ ...styles.headerTd, width: '50%' }}>
                                                <Typography style={{ fontWeight: 'bold', fontSize: '14pt' }}>PHIẾU XỬ LÝ VT, BTP, TP</Typography>
                                                <Typography style={{ fontWeight: 'bold', fontSize: '14pt' }}>KHÔNG PHÙ HỢP</Typography>
                                            </td>
                                            <td style={{ ...styles.headerTd, width: '30%', textAlign: 'left', paddingLeft: '10px' }}>
                                                <Typography style={{ fontSize: '11pt' }}>Mã số: BM.01-QT.02-B8</Typography>
                                                <Typography style={{ fontSize: '11pt' }}>Ngày HL: 20/01/2026</Typography>
                                                <Typography style={{ fontSize: '11pt' }}>Phiên bản: 00</Typography>
                                                {/* Với bản in động nhiều trang, dùng chuỗi chấm để điền tay hoặc đánh số sau */}
                                                <Typography style={{ fontSize: '11pt' }}>Trang: ....................</Typography>
                                            </td>
                                        </tr>
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
                                <Box display="flex" justifyContent="flex-end" mb={2}>
                                    <Box width="450px">
                                        <Typography style={{ ...styles.text, fontStyle: 'italic', display: 'flex', justifyContent: 'flex-end' }}>
                                            <span>Số: {info.SoPhieu || '..........'}/KN.</span>
                                            <span style={{ marginLeft: '40px' }}>Ngày ......tháng ...... năm 20.....</span>
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* 1. Thông tin */}
                                <Box mb={2} className="avoid-break">
                                    <Typography style={styles.sectionTitle}>1. Thông tin sự không phù hợp</Typography>
                                    <Box display="flex" alignItems="flex-end" mb={1.5} style={styles.text}>
                                        <span style={{ whiteSpace: 'nowrap' }}>Đơn vị sản xuất:</span>
                                        <span style={styles.dottedLine}>{info.TenBoPhan || ''}</span>
                                        <span style={{ whiteSpace: 'nowrap', marginLeft: '5px' }}>Mã ĐVSX:</span>
                                        <span style={{ ...styles.dottedLine, flexGrow: 0.6 }}>{info.MaBoPhan || ''}</span>
                                    </Box>
                                    <Box display="flex" alignItems="flex-end" mb={1.5} style={styles.text}>
                                        <span style={{ whiteSpace: 'nowrap' }}>Tên VT/BTP/TP:</span>
                                        <span style={styles.dottedLine}>{info.TenSanPham || ''}</span>
                                        <span style={{ whiteSpace: 'nowrap', marginLeft: '5px' }}>Mã Item:</span>
                                        <span style={{ ...styles.dottedLine, flexGrow: 0.6 }}></span>
                                    </Box>
                                    <Box display="flex" alignItems="flex-end" mb={1.5} style={styles.text}>
                                        <span style={{ whiteSpace: 'nowrap' }}>Mã truy nguyên:</span>
                                        <span style={styles.dottedLine}></span>
                                        <span style={{ whiteSpace: 'nowrap', marginLeft: '5px' }}>Đơn hàng:</span>
                                        <span style={{ ...styles.dottedLine, flexGrow: 0.5 }}></span>
                                        <span style={{ whiteSpace: 'nowrap', marginLeft: '5px' }}>Lô SX:</span>
                                        <span style={{ ...styles.dottedLine, flexGrow: 0.3 }}>{info.Lot || ''}</span>
                                    </Box>
                                    <Box display="flex" alignItems="flex-end" mt={3} mb={1.5} style={styles.text}>
                                        <span style={{ whiteSpace: 'nowrap' }}>Số lượng:</span>
                                        <span style={styles.dottedLine}></span>
                                        <span style={{ whiteSpace: 'nowrap', marginLeft: '5px' }}>Dấu tuần:</span>
                                        <span style={{ ...styles.dottedLine, flexGrow: 0.4 }}></span>
                                    </Box>
                                </Box>

                                {/* 2. Phát hiện từ */}
                                <Box className="avoid-break">
                                    <Typography style={styles.sectionTitle}>2. Sự không phù hợp được phát hiện từ</Typography>
                                    <table style={{ ...styles.layoutTable, paddingLeft: '15px' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ ...styles.layoutTd, width: '33%' }}>{renderCheckboxRight('a) Kiểm tra đầu vào', false)}</td>
                                                <td style={{ ...styles.layoutTd, width: '33%' }}>{renderCheckboxRight('b) Trong sản xuất', false)}</td>
                                                <td style={{ ...styles.layoutTd, width: '34%' }}>{renderCheckboxRight('c) Kiểm cuối', false)}</td>
                                            </tr>
                                            <tr>
                                                <td style={styles.layoutTd}>{renderCheckboxRight('d) Kiểm tra tại NCC', false)}</td>
                                                <td style={styles.layoutTd}>{renderCheckboxRight('e) Khách hàng', false)}</td>
                                                <td style={styles.layoutTd}>{renderCheckboxRight('f) Trong kho', false)}</td>
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
                                                    <Typography style={{ ...styles.sectionTitle, marginTop: 0, marginBottom: 0 }}>3. Mức độ không phù hợp</Typography>
                                                </td>
                                                <td style={{ ...styles.layoutTd, width: '29%' }}>{renderCheckboxRight('a) Lỗi lần đầu', false)}</td>
                                                <td style={{ ...styles.layoutTd, width: '29%' }}>{renderCheckboxRight('b) Lỗi lặp lại', false)}</td>
                                            </tr>
                                            <tr>
                                                <td style={styles.layoutTd}></td>
                                                <td style={styles.layoutTd}>{renderCheckboxRight('c) Lỗi đơn lẻ', false)}</td>
                                                <td style={styles.layoutTd}>{renderCheckboxRight('d) Lỗi hàng loạt', false)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </Box>

                                {/* 4. Mô tả chi tiết (Defects) */}
                                <Box>
                                    <Typography style={styles.sectionTitle}>4. Mô tả chi tiết sự không phù hợp:</Typography>
                                    {info.MoTaChung && (
                                        <Typography style={{ ...styles.text, paddingLeft: '10px', marginBottom: '10px', fontStyle: 'italic' }}>
                                            - {info.MoTaChung}
                                        </Typography>
                                    )}
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...styles.th, width: '40px' }}>TT</th>
                                                <th style={styles.th}>VT/BTP/TP</th>
                                                <th style={{ ...styles.th, width: '100px' }}>Số lượng kiểm</th>
                                                <th style={{ ...styles.th, width: '90px' }}>Tỷ lệ lỗi, %</th>
                                                <th style={{ ...styles.th, width: '120px' }}>Dạng lỗi</th>
                                                <th style={styles.th}>Ghi chú</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {defects.length > 0 ? defects.map((d, index) => (
                                                <tr key={index}>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>{index + 1}</td>
                                                    <td style={styles.td}>{d.TenLoi}</td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>{d.SoLuong}</td>
                                                    <td style={styles.td}></td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>{d.DefectType}</td>
                                                    <td style={styles.td}></td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>1</td>
                                                    <td style={styles.td}>&nbsp;</td>
                                                    <td style={styles.td}>&nbsp;</td>
                                                    <td style={styles.td}>&nbsp;</td>
                                                    <td style={styles.td}>&nbsp;</td>
                                                    <td style={styles.td}>&nbsp;</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </Box>

                                {/* Chữ ký 1 */}
                                <Box className="avoid-break" style={styles.signatureBlock}>
                                    <Box style={styles.signatureCol}>
                                        <Typography style={styles.text}>Ngày..................</Typography>
                                        <Typography style={styles.text}><b>PHÒNG KN</b></Typography>
                                        <Box height="60px"></Box>
                                    </Box>
                                    <Box style={styles.signatureCol}>
                                        <Typography style={styles.text}>Ngày..................</Typography>
                                        <Typography style={styles.text}><b>PHÒNG/BAN/BPSX</b></Typography>
                                        <Box height="60px"></Box>
                                    </Box>
                                    <Box style={styles.signatureCol}>
                                        <Typography style={styles.text}>Ngày..................</Typography>
                                        <Typography style={styles.text}><b>NGƯỜI LẬP</b></Typography>
                                        <Box height="60px"></Box>
                                        <Typography style={styles.text}>{info.NguoiLap || '(Ký, họ tên)'}</Typography>
                                    </Box>
                                </Box>

                                {/* 5. Đề xuất xử lý */}
                                <Box mt={3}>
                                    <Typography style={styles.sectionTitle}>5. Đề xuất xử lý</Typography>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...styles.th, width: '35%' }}>Nội dung</th>
                                                <th style={styles.th}>Đề nghị xử lý</th>
                                                <th style={styles.th}>Trách nhiệm</th>
                                                <th style={styles.th}>Thời hạn</th>
                                                <th style={styles.th}>Theo dõi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {xuLy.length > 0 ? xuLy.map((x, index) => (
                                                <tr key={index}>
                                                    <td style={styles.td}>{x.NoiDung}</td>
                                                    <td style={styles.td}>{x.DeNghiXuLy}</td>
                                                    <td style={styles.td}>{x.TenBoPhan}</td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>{x.ThoiHan ? new Date(x.ThoiHan).toLocaleDateString('vi-VN') : ''}</td>
                                                    <td style={styles.td}>{x.NguoiXuLy}</td>
                                                </tr>
                                            )) : (
                                                <tr><td style={styles.td}>&nbsp;</td><td style={styles.td}></td><td style={styles.td}></td><td style={styles.td}></td><td style={styles.td}></td></tr>
                                            )}
                                        </tbody>
                                    </table>

                                    <Box className="avoid-break" mt={1} pl={1}>
                                        <Typography style={{ ...styles.text, fontStyle: 'italic', marginBottom: '5px' }}>Các nội dung mục đề nghị xử lý:</Typography>
                                        <Grid container>
                                            <Grid item xs={4}>{renderCheckbox('a) Cho vào SX', false)}</Grid>
                                            <Grid item xs={4}>{renderCheckbox('b) Trả lại NCC/DVSX', false)}</Grid>
                                            <Grid item xs={4}>{renderCheckbox('c) Loại bỏ', false)}</Grid>
                                            <Grid item xs={4}>{renderCheckbox('d) Sửa chữa', false)}</Grid>
                                            <Grid item xs={4}>{renderCheckbox('e) Giảm giá/ hạ cấp', false)}</Grid>
                                            <Grid item xs={4}>{renderCheckbox('f) Hình thức khác:', false)}</Grid>
                                        </Grid>
                                    </Box>
                                </Box>

                                {/* 6. Chi phí phát sinh */}
                                <Box mt={2}>
                                    <Box className="avoid-break" display="flex" alignItems="center">
                                        <Typography style={{ ...styles.sectionTitle, marginTop: 0, marginBottom: 0, marginRight: '30px' }}>
                                            6. Chi phí phát sinh
                                        </Typography>
                                        {renderCheckbox('Yêu cầu', chiPhi.length > 0)}
                                        {renderCheckbox('Không yêu cầu', chiPhi.length === 0)}
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
                                            {chiPhi.length > 0 ? chiPhi.map((c, index) => (
                                                <tr key={index}>
                                                    <td style={styles.td}>{c.TenChiPhi || c.LoaiChiPhi}</td>
                                                    <td style={{ ...styles.td, textAlign: 'right' }}>{c.GiaTri ? c.GiaTri.toLocaleString('vi-VN') : ''}</td>
                                                    <td style={styles.td}>{c.TenBoPhan || ''}</td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>{c.ThoiHan ? new Date(c.ThoiHan).toLocaleDateString('vi-VN') : ''}</td>
                                                    <td style={styles.td}>{c.NguoiXuLy}</td>
                                                </tr>
                                            )) : (
                                                <tr><td style={styles.td}>&nbsp;</td><td style={styles.td}></td><td style={styles.td}></td><td style={styles.td}></td><td style={styles.td}></td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </Box>

                                {/* 7. Hành động khắc phục */}
                                <Box mt={2}>
                                    <Box className="avoid-break" display="flex" alignItems="center">
                                        <Typography style={{ ...styles.sectionTitle, marginTop: 0, marginBottom: 0, marginRight: '30px' }}>
                                            7. Hành động khắc phục, phòng ngừa
                                        </Typography>
                                        {renderCheckbox('Yêu cầu', hanhDong.length > 0)}
                                        {renderCheckbox('Không yêu cầu', hanhDong.length === 0)}
                                    </Box>

                                    <table style={{ ...styles.table, marginTop: '10px' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...styles.th, width: '40%' }}>Nội dung</th>
                                                <th style={styles.th}>Trách nhiệm</th>
                                                <th style={styles.th}>Thời hạn</th>
                                                <th style={styles.th}>Theo dõi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {hanhDong.length > 0 ? hanhDong.map((h, index) => (
                                                <tr key={index}>
                                                    <td style={styles.td}>{h.NoiDung}</td>
                                                    <td style={styles.td}>{h.TenBoPhan || h.FullName}</td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>{h.ThoiHan ? new Date(h.ThoiHan).toLocaleDateString('vi-VN') : ''}</td>
                                                    <td style={styles.td}>{h.NguoiXuLy}</td>
                                                </tr>
                                            )) : (
                                                <tr><td style={styles.td}>&nbsp;</td><td style={styles.td}></td><td style={styles.td}></td><td style={styles.td}></td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </Box>

                                {/* Chữ ký 2 */}
                                <Box className="avoid-break" style={styles.signatureBlock}>
                                    <Box style={styles.signatureCol}>
                                        <Typography style={styles.text}>Ngày..................</Typography>
                                        <Typography style={styles.text}><b>PHÒNG KN</b></Typography>
                                        <Box height="60px"></Box>
                                    </Box>
                                    <Box style={styles.signatureCol}>
                                        <Typography style={styles.text}>Ngày..................</Typography>
                                        <Typography style={styles.text}><b>PHÒNG KTCN</b></Typography>
                                        <Box height="60px"></Box>
                                    </Box>
                                    <Box style={styles.signatureCol}>
                                        <Typography style={styles.text}>Ngày..................</Typography>
                                        <Typography style={styles.text}><b>PHÒNG VT</b></Typography>
                                        <Box height="60px"></Box>
                                    </Box>
                                </Box>

                                {/* 8. Theo dõi */}
                                <Box className="avoid-break" mt={2} pt={1}>
                                    <Typography style={styles.sectionTitle}>8. Theo dõi đánh giá</Typography>
                                    <Box display="flex" mt={1}>
                                        {renderCheckbox('Thỏa mãn', false)}
                                        {renderCheckbox('Không thỏa mãn', false)}
                                        <span style={{ marginLeft: '40px' }}>Phiếu KPH mới số: ................................................</span>
                                    </Box>
                                    <Box mt={2}>
                                        <Typography style={styles.text}>Ghi chú: ..........................................................................................................................................................</Typography>
                                    </Box>

                                    <Box mt={3} display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Box pl={2}>
                                            <Typography style={styles.text}><b>Nơi nhận:</b></Typography>
                                            <Typography style={styles.text}>- Lưu</Typography>
                                        </Box>
                                        <Box textAlign="center" width="250px">
                                            <Typography style={styles.text}>Ngày..................</Typography>
                                            <Typography style={styles.text}><b>NGƯỜI THEO DÕI</b></Typography>
                                            <Box height="60px"></Box>
                                            <Typography style={styles.text}>(Ký, họ tên)</Typography>
                                        </Box>
                                    </Box>
                                </Box>

                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
});