
import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Grid, Checkbox } from '@mui/material';

export const BienBanPrintTemplate = React.forwardRef(({ info, defects, xuLy, chiPhi, hanhDong, xacNhan }, ref) => {
    if (!info) return null;

    const styles = {
        container: {
            padding: '2cm',
            fontFamily: 'Times New Roman, serif',
            color: '#000',
            backgroundColor: '#fff',
            fontSize: '11pt',
        },
        title: {
            fontWeight: 'bold',
            fontSize: '16pt',
            textAlign: 'center',
            marginBottom: '10px'
        },
        subTitle: {
            fontWeight: 'bold',
            fontSize: '12pt',
            marginTop: '10px',
            marginBottom: '5px'
        },
        sectionTitle: {
            fontWeight: 'bold',
            fontSize: '11pt',
            marginTop: '15px',
            marginBottom: '5px',
            textDecoration: 'underline'
        },
        text: {
            fontSize: '11pt',
            marginBottom: '4px'
        },
        table: {
            border: '1px solid #000',
            borderCollapse: 'collapse',
            width: '100%',
            marginBottom: '10px'
        },
        th: {
            border: '1px solid #000',
            padding: '4px',
            fontWeight: 'bold',
            textAlign: 'center',
            fontSize: '10pt'
        },
        td: {
            border: '1px solid #000',
            padding: '4px',
            fontSize: '10pt'
        },
        signatureBlock: {
            marginTop: '20px',
            textAlign: 'center',
            pageBreakInside: 'avoid'
        }
    };

    const renderCheckbox = (label, checked) => (
        <span style={{ marginRight: '15px', display: 'inline-flex', alignItems: 'center' }}>
            <span style={{ 
                width: '12px', 
                height: '12px', 
                border: '1px solid #000', 
                display: 'inline-block', 
                marginRight: '4px',
                textAlign: 'center',
                lineHeight: '10px',
                fontSize: '10px'
            }}>
                {checked ? '✓' : ''}
            </span>
            {label}
        </span>
    );

    return (
        <div ref={ref} style={styles.container}>
            {/* Header */}
            <Typography style={styles.title}>PHIẾU XỬ LÝ SẢN PHẨM KHÔNG PHÙ HỢP</Typography>
            <Box display="flex" justifyContent="flex-end" mb={2}>
                <Typography style={styles.text}>Số: {info.SoPhieu}</Typography>
                <Typography style={{ ...styles.text, marginLeft: '20px' }}>
                    Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                </Typography>
            </Box>

            {/* 1. Thông tin */}
            <Typography style={styles.sectionTitle}>1. Thông tin sự không phù hợp</Typography>
            <Grid container spacing={1}>
                <Grid item xs={6}>
                    <Typography style={styles.text}>Đơn vị sản xuất: {info.TenBoPhan || '....................'}</Typography>
                    <Typography style={styles.text}>Tên VT/BTP/TP: {info.TenSanPham}</Typography>
                    <Typography style={styles.text}>Mã truy nguyên: ....................</Typography>
                </Grid>
                <Grid item xs={6}>
                    <Typography style={styles.text}>Mã ĐVSX: ....................</Typography>
                    <Typography style={styles.text}>Mã Item: ....................</Typography>
                    <Typography style={styles.text}>Đơn hàng: .................... Lô SX: {info.Lot}</Typography>
                    <Typography style={styles.text}>Số lượng: .................... Dấu tuần: ....................</Typography>
                </Grid>
            </Grid>

            {/* 2. Phát hiện từ */}
            <Typography style={styles.sectionTitle}>2. Sự không phù hợp được phát hiện từ</Typography>
            <Box display="flex" flexWrap="wrap">
                {renderCheckbox('Kiểm tra đầu vào', false)}
                {renderCheckbox('Trong sản xuất', true)}
                {renderCheckbox('Kiểm cuối', false)}
                {renderCheckbox('Kiểm tra tại NCC', false)}
                {renderCheckbox('Khách hàng', false)}
                {renderCheckbox('Trong kho', false)}
            </Box>

            {/* 3. Mức độ */}
            <Typography style={styles.sectionTitle}>3. Mức độ không phù hợp</Typography>
            <Box display="flex" flexWrap="wrap">
                {renderCheckbox('Lỗi lần đầu', true)}
                {renderCheckbox('Lỗi lặp lại', false)}
                {renderCheckbox('Lỗi đơn lẻ', false)}
                {renderCheckbox('Lỗi hàng loạt', false)}
            </Box>

            {/* 4. Mô tả chi tiết (Defects) */}
            <Typography style={styles.sectionTitle}>4. Mô tả chi tiết sự không phù hợp</Typography>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={{ ...styles.th, width: '50px' }}>TT</th>
                        <th style={styles.th}>Tên lỗi</th>
                        <th style={{ ...styles.th, width: '80px' }}>Số lượng</th>
                        <th style={{ ...styles.th, width: '100px' }}>Tỷ lệ lỗi (%)</th>
                        <th style={{ ...styles.th, width: '100px' }}>Dạng lỗi</th>
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
                            <td colSpan="6" style={{ ...styles.td, textAlign: 'center', padding: '20px' }}>Không có lỗi ghi nhận</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Signatures 1 */}
            <Grid container spacing={2} style={styles.signatureBlock}>
                <Grid item xs={4}>
                    <Typography style={styles.text}><b>PHÒNG KN</b></Typography>
                    <Box height="60px"></Box>
                    <Typography style={styles.text}>(Ký, họ tên)</Typography>
                </Grid>
                <Grid item xs={4}>
                    <Typography style={styles.text}><b>PHÒNG/BAN/BPSX</b></Typography>
                    <Box height="60px"></Box>
                    <Typography style={styles.text}>(Ký, họ tên)</Typography>
                </Grid>
                <Grid item xs={4}>
                    <Typography style={styles.text}><b>NGƯỜI LẬP</b></Typography>
                    <Box height="60px"></Box>
                    <Typography style={styles.text}>{info.NguoiLap}</Typography>
                </Grid>
            </Grid>

            {/* 5. Đề xuất xử lý */}
            <Typography style={styles.sectionTitle}>5. Đề xuất xử lý</Typography>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Nội dung</th>
                        <th style={styles.th}>Đề nghị xử lý</th>
                        <th style={styles.th}>Trách nhiệm</th>
                        <th style={styles.th}>Thời hạn</th>
                        <th style={styles.th}>Theo dõi</th>
                    </tr>
                </thead>
                <tbody>
                    {xuLy.map((x, index) => (
                        <tr key={index}>
                            <td style={styles.td}>{x.NoiDung}</td>
                            <td style={styles.td}>{x.DeNghiXuLy}</td>
                            <td style={styles.td}>{x.FullName}</td>
                            <td style={styles.td}>{x.ThoiHan ? new Date(x.ThoiHan).toLocaleDateString('vi-VN') : ''}</td>
                            <td style={styles.td}></td>
                        </tr>
                    ))}
                    {xuLy.length === 0 && (
                         <tr><td colSpan="5" style={styles.td}>&nbsp;</td></tr>
                    )}
                </tbody>
            </table>
            
            <Box mt={1}>
                <Typography style={{ ...styles.text, fontStyle: 'italic', marginBottom: '5px' }}>Các nội dung mục đề nghị xử lý:</Typography>
                <Grid container>
                    <Grid item xs={4}>{renderCheckbox('a) Cho vào SX', false)}</Grid>
                    <Grid item xs={4}>{renderCheckbox('b) Trả lại NCC/ĐVSX', false)}</Grid>
                    <Grid item xs={4}>{renderCheckbox('c) Loại bỏ', false)}</Grid>
                    <Grid item xs={4}>{renderCheckbox('d) Sửa chữa', false)}</Grid>
                    <Grid item xs={4}>{renderCheckbox('e) Giảm giá/ hạ cấp', false)}</Grid>
                    <Grid item xs={4}>{renderCheckbox('f) Hình thức khác', false)}</Grid>
                </Grid>
            </Box>

            {/* 6. Chi phí phát sinh */}
            <Typography style={styles.sectionTitle}>
                6. Chi phí phát sinh 
                <span style={{ marginLeft: '20px', fontWeight: 'normal' }}>
                    {renderCheckbox('Yêu cầu', chiPhi.length > 0)}
                    {renderCheckbox('Không yêu cầu', chiPhi.length === 0)}
                </span>
            </Typography>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Chi phí</th>
                        <th style={styles.th}>Giá trị (VNĐ)</th>
                        <th style={styles.th}>Trách nhiệm</th>
                        <th style={styles.th}>Thời hạn</th>
                        <th style={styles.th}>Theo dõi</th>
                    </tr>
                </thead>
                <tbody>
                    {chiPhi.map((c, index) => (
                        <tr key={index}>
                            <td style={styles.td}>{c.TenChiPhi || c.LoaiChiPhi}</td>
                            <td style={{ ...styles.td, textAlign: 'right' }}>{c.SoTien?.toLocaleString('vi-VN')}</td>
                            <td style={styles.td}>{c.TenBoPhan}</td>
                            <td style={styles.td}></td>
                            <td style={styles.td}></td>
                        </tr>
                    ))}
                     {chiPhi.length === 0 && (
                         <tr><td colSpan="5" style={styles.td}>&nbsp;</td></tr>
                    )}
                </tbody>
            </table>

            {/* 7. Hành động khắc phục */}
            <Typography style={styles.sectionTitle}>
                7. Hành động khắc phục, phòng ngừa
                <span style={{ marginLeft: '20px', fontWeight: 'normal' }}>
                    {renderCheckbox('Yêu cầu', hanhDong.length > 0)}
                    {renderCheckbox('Không yêu cầu', hanhDong.length === 0)}
                </span>
            </Typography>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Nội dung</th>
                        <th style={styles.th}>Trách nhiệm</th>
                        <th style={styles.th}>Thời hạn</th>
                        <th style={styles.th}>Theo dõi</th>
                    </tr>
                </thead>
                <tbody>
                    {hanhDong.map((h, index) => (
                        <tr key={index}>
                            <td style={styles.td}>{h.NoiDung}</td>
                            <td style={styles.td}>{h.TenBoPhan || h.FullName}</td>
                            <td style={styles.td}>{h.ThoiHan ? new Date(h.ThoiHan).toLocaleDateString('vi-VN') : ''}</td>
                            <td style={styles.td}></td>
                        </tr>
                    ))}
                    {hanhDong.length === 0 && (
                         <tr><td colSpan="4" style={styles.td}>&nbsp;</td></tr>
                    )}
                </tbody>
            </table>

            {/* Signatures 2 */}
            <Grid container spacing={2} style={styles.signatureBlock}>
                <Grid item xs={4}>
                    <Typography style={styles.text}><b>PHÒNG KN</b></Typography>
                    <Box height="60px"></Box>
                    <Typography style={styles.text}>(Ký, họ tên)</Typography>
                </Grid>
                <Grid item xs={4}>
                    <Typography style={styles.text}><b>PHÒNG KTCN</b></Typography>
                    <Box height="60px"></Box>
                    <Typography style={styles.text}>(Ký, họ tên)</Typography>
                </Grid>
                <Grid item xs={4}>
                    <Typography style={styles.text}><b>PHÒNG VT</b></Typography>
                    <Box height="60px"></Box>
                    <Typography style={styles.text}>(Ký, họ tên)</Typography>
                </Grid>
            </Grid>

            {/* 8. Theo dõi */}
            <Box mt={3} pt={2} borderTop="1px dashed #999">
                <Typography style={styles.sectionTitle}>8. Theo dõi đánh giá</Typography>
                <Box display="flex" mt={1}>
                    {renderCheckbox('Thỏa mãn', false)}
                    {renderCheckbox('Không thỏa mãn', false)}
                    <span style={{ marginLeft: '20px' }}>Phiếu KPH mới số: ....................</span>
                </Box>
                <Box mt={2}>
                    <Typography style={styles.text}>Ghi chú: ........................................................................................................................................</Typography>
                </Box>
                <Box mt={4} display="flex" justifyContent="flex-end">
                    <Box textAlign="center" width="200px">
                        <Typography style={styles.text}><b>NGƯỜI THEO DÕI</b></Typography>
                        <Box height="60px"></Box>
                        <Typography style={styles.text}>(Ký, họ tên)</Typography>
                    </Box>
                </Box>
            </Box>
        </div>
    );
});
