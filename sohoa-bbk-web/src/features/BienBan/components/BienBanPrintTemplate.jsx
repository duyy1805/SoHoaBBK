import React from 'react';
import { Box, Typography, Grid } from '@mui/material';

export const BienBanPrintTemplate = React.forwardRef(({
    info = {},
    defects = [],
    xuLy = [],
    chiPhi = [],
    hanhDong = [],
    xacNhan
}, ref) => {
    if (!info) return null;

    const styles = {
        container: {
            padding: '2cm',
            fontFamily: '"Times New Roman", Times, serif',
            color: '#000',
            backgroundColor: '#fff',
            fontSize: '11pt',
            lineHeight: '1.4'
        },
        text: {
            fontSize: '12pt', // Tăng một chút cho đúng chuẩn văn bản
            marginBottom: '4px'
        },
        sectionTitle: {
            fontWeight: 'bold',
            fontSize: '12pt',
            marginTop: '15px',
            marginBottom: '8px',
        },
        dottedLine: {
            flexGrow: 1,
            borderBottom: '2px dotted #000',
            marginLeft: '8px',
            marginRight: '8px',
            textAlign: 'center',
            position: 'relative',
            top: '-4px', // Nâng dấu chấm lên để cân bằng với chữ
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
            fontSize: '11pt'
        },
        td: {
            border: '1px solid #000',
            padding: '4px',
            fontSize: '11pt'
        },
        headerTable: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '10px',
            border: '1px solid #000'
        },
        headerTd: {
            border: '1px solid #000',
            padding: '6px',
            textAlign: 'center',
            verticalAlign: 'middle'
        },
        signatureBlock: {
            marginTop: '15px',
            textAlign: 'center',
            pageBreakInside: 'avoid'
        }
    };

    // Component Checkbox mới: Text bên trái, ô vuông bên phải
    const renderCheckboxRight = (label, checked) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: '15px' }}>
            <span style={{ fontSize: '12pt' }}>{label}</span>
            <span style={{
                width: '14px',
                height: '14px',
                border: '1px solid #000',
                display: 'inline-block',
                textAlign: 'center',
                lineHeight: '14px',
                fontSize: '12px'
            }}>
                {checked ? 'x' : ''}
            </span>
        </span>
    );

    const renderCheckbox = (label, checked) => (
        <span style={{ marginRight: '15px', display: 'inline-flex', alignItems: 'center' }}>
            <span style={{
                width: '14px',
                height: '14px',
                border: '1px solid #000',
                display: 'inline-block',
                marginRight: '6px',
                textAlign: 'center',
                lineHeight: '14px',
                fontSize: '12px'
            }}>
                {checked ? 'x' : ''}
            </span>
            {label}
        </span>
    );

    return (
        <div ref={ref} style={styles.container}>
            {/* Header Table */}
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
                            <Typography style={{ fontSize: '11pt' }}>Ngày hiệu lực: 20/01/2026</Typography>
                            <Typography style={{ fontSize: '11pt' }}>Phiên bản: 00</Typography>
                            <Typography style={{ fontSize: '11pt' }}>Trang: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 1/2</Typography>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Số và Ngày tháng căn phải theo định dạng ảnh */}
            <Box display="flex" justifyContent="flex-end" mb={2} mt={2}>
                <Box width="350px">
                    <Typography style={{ ...styles.text, fontStyle: 'italic', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Số: {info.SoPhieu || '..........'}/KN.</span>
                        <span>Ngày ......tháng ...... năm</span>
                    </Typography>
                    <Typography style={{ ...styles.text, fontStyle: 'italic', paddingLeft: '5px' }}>
                        20.....
                    </Typography>
                </Box>
            </Box>

            {/* 1. Thông tin */}
            <Box mb={2}>
                <Typography style={styles.sectionTitle}>1. Thông tin sự không phù hợp</Typography>
                <Box display="flex" alignItems="flex-end" mb={1.5} style={styles.text}>
                    <span style={{ whiteSpace: 'nowrap' }}>Đơn vị sản xuất:</span>
                    <span style={styles.dottedLine}>{info.TenBoPhan || ''}</span>
                    <span style={{ whiteSpace: 'nowrap', marginLeft: '5px' }}>Mã ĐVSX:</span>
                    <span style={{ ...styles.dottedLine, flexGrow: 0.6 }}></span>
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
            <Typography style={styles.sectionTitle}>2. Sự không phù hợp được phát hiện từ</Typography>
            <Grid container spacing={1.5} style={{ paddingLeft: '15px', paddingRight: '40px' }}>
                <Grid item xs={4}>{renderCheckboxRight('a) Kiểm tra đầu vào', false)}</Grid>
                <Grid item xs={4}>{renderCheckboxRight('b) Trong sản xuất', true)}</Grid>
                <Grid item xs={4}>{renderCheckboxRight('c) Kiểm cuối', false)}</Grid>

                <Grid item xs={4}>{renderCheckboxRight('d) Kiểm tra tại NCC', false)}</Grid>
                <Grid item xs={4}>{renderCheckboxRight('e) Khách hàng', false)}</Grid>
                <Grid item xs={4}>{renderCheckboxRight('f) Trong kho', false)}</Grid>
            </Grid>

            {/* 3. Mức độ */}
            <Grid container alignItems="flex-start" mt={2.5} mb={2}>
                <Grid item xs={5}>
                    <Typography style={{ ...styles.sectionTitle, marginTop: 0 }}>3. Mức độ không phù hợp</Typography>
                </Grid>
                <Grid item xs={7}>
                    <Grid container spacing={1.5} style={{ paddingRight: '40px' }}>
                        <Grid item xs={6}>{renderCheckboxRight('a) Lỗi lần đầu', true)}</Grid>
                        <Grid item xs={6}>{renderCheckboxRight('b) Lỗi lặp lại', false)}</Grid>

                        <Grid item xs={6}>{renderCheckboxRight('c) Lỗi đơn lẻ', false)}</Grid>
                        <Grid item xs={6}>{renderCheckboxRight('d) Lỗi hàng loạt', false)}</Grid>
                    </Grid>
                </Grid>
            </Grid>

            {/* 4. Mô tả chi tiết (Defects) */}
            <Typography style={styles.sectionTitle}>4. Mô tả chi tiết sự không phù hợp:</Typography>
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

            {/* Signatures 1 */}
            <Grid container spacing={2} style={styles.signatureBlock}>
                <Grid item xs={4}>
                    <Typography style={styles.text}>Ngày.......tháng.......năm 20...</Typography>
                    <Typography style={styles.text}><b>PHÒNG KN</b></Typography>
                    <Box height="60px"></Box>
                </Grid>
                <Grid item xs={4}>
                    <Typography style={styles.text}>Ngày.......tháng.......năm 20...</Typography>
                    <Typography style={styles.text}><b>PHÒNG/BAN/BPSX</b></Typography>
                    <Box height="60px"></Box>
                </Grid>
                <Grid item xs={4}>
                    <Typography style={styles.text}>Ngày.......tháng.......năm 20...</Typography>
                    <Typography style={styles.text}><b>NGƯỜI LẬP</b></Typography>
                    <Box height="60px"></Box>
                    <Typography style={styles.text}>{info.NguoiLap || '(Ký, họ tên)'}</Typography>
                </Grid>
            </Grid>

            {/* 5. Đề xuất xử lý */}
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
                            <td style={styles.td}>{x.FullName}</td>
                            <td style={styles.td}>{x.ThoiHan ? new Date(x.ThoiHan).toLocaleDateString('vi-VN') : ''}</td>
                            <td style={styles.td}></td>
                        </tr>
                    )) : (
                        <tr><td style={styles.td}>&nbsp;</td><td style={styles.td}></td><td style={styles.td}></td><td style={styles.td}></td><td style={styles.td}></td></tr>
                    )}
                </tbody>
            </table>

            <Box mt={1} pl={1}>
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

            {/* 6. Chi phí phát sinh */}
            <Box mt={2} display="flex" alignItems="center">
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
                            <td style={styles.td}>{c.ThoiHan ? new Date(c.ThoiHan).toLocaleDateString('vi-VN') : ''}</td>
                            <td style={styles.td}></td>
                        </tr>
                    )) : (
                        <tr>
                            <td style={styles.td}>&nbsp;</td>
                            <td style={styles.td}></td>
                            <td style={styles.td}></td>
                            <td style={styles.td}></td>
                            <td style={styles.td}></td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* 7. Hành động khắc phục */}
            <Box mt={2} display="flex" alignItems="center">
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
                            <td style={styles.td}>{h.ThoiHan ? new Date(h.ThoiHan).toLocaleDateString('vi-VN') : ''}</td>
                            <td style={styles.td}></td>
                        </tr>
                    )) : (
                        <tr><td style={styles.td}>&nbsp;</td><td style={styles.td}></td><td style={styles.td}></td><td style={styles.td}></td></tr>
                    )}
                </tbody>
            </table>

            {/* Signatures 2 */}
            <Grid container spacing={2} style={styles.signatureBlock}>
                <Grid item xs={4}>
                    <Typography style={styles.text}>Ngày.......tháng.......năm 20...</Typography>
                    <Typography style={styles.text}><b>PHÒNG KN</b></Typography>
                    <Box height="60px"></Box>
                </Grid>
                <Grid item xs={4}>
                    <Typography style={styles.text}>Ngày.......tháng.......năm 20...</Typography>
                    <Typography style={styles.text}><b>PHÒNG KTCN</b></Typography>
                    <Box height="60px"></Box>
                </Grid>
                <Grid item xs={4}>
                    <Typography style={styles.text}>Ngày.......tháng.......năm 20...</Typography>
                    <Typography style={styles.text}><b>PHÒNG VT</b></Typography>
                    <Box height="60px"></Box>
                </Grid>
            </Grid>

            {/* 8. Theo dõi */}
            <Box mt={2} pt={1}>
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
                        <Typography style={styles.text}>Ngày.......tháng.......năm 20...</Typography>
                        <Typography style={styles.text}><b>NGƯỜI THEO DÕI</b></Typography>
                        <Box height="60px"></Box>
                        <Typography style={styles.text}>(Ký, họ tên)</Typography>
                    </Box>
                </Box>
            </Box>
        </div>
    );
});