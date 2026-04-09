import React from 'react';
import { Box } from '@mui/material';

export const BienBanPrintTemplate = React.forwardRef(({
    info = {},
    defects = [],
    xuLy = [],
    chiPhi = [],
    hanhDong = [],
    xacNhan = []
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
        boldText: { fontSize: '12pt', fontWeight: 'bold' },
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
        layoutTd: { border: 'none', padding: '4px 0', verticalAlign: 'middle' },
        flexBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
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
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                                    <div style={{ width: '450px' }}>
                                        <Box style={{ display: 'flex', justifyContent: 'space-between', width: '450px' }}>
                                            <div style={{ ...styles.text, fontStyle: 'italic' }}>
                                                {/* Số: {info.SoPhieu || '..........'}/KN. */}
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
                                    <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '12px', ...styles.text }}>
                                        <span style={{ whiteSpace: 'nowrap' }}>Đơn vị sản xuất:</span>
                                        <span style={styles.dottedLine}>{info.TenBoPhan || ''}</span>
                                        <span style={{ whiteSpace: 'nowrap', marginLeft: '5px' }}>Mã ĐVSX:</span>
                                        <span style={{ ...styles.dottedLine, flexGrow: 0.6 }}>{info.MaBoPhan || ''}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '12px', ...styles.text }}>
                                        <span style={{ whiteSpace: 'nowrap' }}>Tên VT/BTP/TP:</span>
                                        <span style={styles.dottedLine}>{info.TenSanPham || ''}</span>
                                        <span style={{ whiteSpace: 'nowrap', marginLeft: '5px' }}>Mã Item:</span>
                                        <span style={{ ...styles.dottedLine, flexGrow: 0.6 }}></span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '12px', ...styles.text }}>
                                        <span style={{ whiteSpace: 'nowrap' }}>Mã truy nguyên:</span>
                                        <span style={styles.dottedLine}></span>
                                        <span style={{ whiteSpace: 'nowrap', marginLeft: '5px' }}>Đơn hàng:</span>
                                        <span style={{ ...styles.dottedLine, flexGrow: 0.5 }}></span>
                                        <span style={{ whiteSpace: 'nowrap', marginLeft: '5px' }}>Lô SX:</span>
                                        <span style={{ ...styles.dottedLine, flexGrow: 0.3 }}>{info.Lot || ''}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: '24px', marginBottom: '12px', ...styles.text }}>
                                        <span style={{ whiteSpace: 'nowrap' }}>Số lượng:</span>
                                        <span style={styles.dottedLine}></span>
                                        <span style={{ whiteSpace: 'nowrap', marginLeft: '5px' }}>Dấu tuần:</span>
                                        <span style={{ ...styles.dottedLine, flexGrow: 0.4 }}></span>
                                    </div>
                                </Box>

                                {/* 2. Phát hiện từ */}
                                <Box className="avoid-break">
                                    <div style={styles.sectionTitle}>2. Sự không phù hợp được phát hiện từ</div>
                                    <table style={{ ...styles.layoutTable, paddingLeft: '15px' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ ...styles.layoutTd, width: '33%' }}>{renderCheckboxRight('a) Kiểm tra đầu vào', info.PhatHienTu === 'A' || info.PhatHienTu === 'KIEM_TRA_DAU_VAO')}</td>
                                                <td style={{ ...styles.layoutTd, width: '33%' }}>{renderCheckboxRight('b) Trong sản xuất', info.PhatHienTu === 'B' || info.PhatHienTu === 'TRONG_SAN_XUAT')}</td>
                                                <td style={{ ...styles.layoutTd, width: '34%' }}>{renderCheckboxRight('c) Kiểm cuối', info.PhatHienTu === 'C' || info.PhatHienTu === 'KIEM_DONG_CONT')}</td>
                                            </tr>
                                            <tr>
                                                <td style={styles.layoutTd}>{renderCheckboxRight('d) Kiểm tra tại NCC', info.PhatHienTu === 'D' || info.PhatHienTu === 'TAI_NCC')}</td>
                                                <td style={styles.layoutTd}>{renderCheckboxRight('e) Khách hàng', info.PhatHienTu === 'E' || info.PhatHienTu === 'KHACH_HANG')}</td>
                                                <td style={styles.layoutTd}>{renderCheckboxRight('f) Trong kho', info.PhatHienTu === 'F' || info.PhatHienTu === 'TRONG_KHO')}</td>
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
                                                <td style={{ ...styles.layoutTd, width: '29%' }}>{renderCheckboxRight('a) Lỗi lần đầu', !!info.LoiLanDau)}</td>
                                                <td style={{ ...styles.layoutTd, width: '29%' }}>{renderCheckboxRight('b) Lỗi lặp lại', !!info.LoiLapLai)}</td>
                                            </tr>
                                            <tr>
                                                <td style={styles.layoutTd}></td>
                                                <td style={styles.layoutTd}>{renderCheckboxRight('c) Lỗi đơn lẻ', !!info.LoiDonLe)}</td>
                                                <td style={styles.layoutTd}>{renderCheckboxRight('d) Lỗi hàng loạt', !!info.LoiHangLoat)}</td>
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
                                        <div style={styles.text}>Ngày..................</div>
                                        <div style={styles.boldText}>PHÒNG KN</div>
                                        <Box height="60px"></Box>
                                    </Box>
                                    <Box style={styles.signatureCol}>
                                        <div style={styles.text}>Ngày..................</div>
                                        <div style={styles.boldText}>PHÒNG/BAN/BPSX</div>
                                        <Box height="60px"></Box>
                                    </Box>
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
                                        <div style={{ ...styles.text, fontStyle: 'italic', marginBottom: '5px' }}>Các nội dung mục đề nghị xử lý:</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                            <div style={{ width: '33.33%' }}>{renderCheckbox('a) Cho vào SX', false)}</div>
                                            <div style={{ width: '33.33%' }}>{renderCheckbox('b) Trả lại NCC/DVSX', false)}</div>
                                            <div style={{ width: '33.33%' }}>{renderCheckbox('c) Loại bỏ', false)}</div>
                                            <div style={{ width: '33.33%' }}>{renderCheckbox('d) Sửa chữa', false)}</div>
                                            <div style={{ width: '33.33%' }}>{renderCheckbox('e) Giảm giá/ hạ cấp', false)}</div>
                                            <div style={{ width: '33.33%' }}>{renderCheckbox('f) Hình thức khác:', false)}</div>
                                        </div>
                                    </Box>
                                </Box>

                                {/* 6. Chi phí phát sinh */}
                                <Box mt={2}>
                                    <Box className="avoid-break" display="flex" alignItems="center">
                                        <div style={{ ...styles.sectionTitle, marginTop: 0, marginBottom: 0, marginRight: '30px' }}>
                                            6. Chi phí phát sinh
                                        </div>
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
                                        <div style={{ ...styles.sectionTitle, marginTop: 0, marginBottom: 0, marginRight: '30px' }}>
                                            7. Hành động khắc phục, phòng ngừa
                                        </div>
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
                                        <div style={styles.text}>Ngày..................</div>
                                        <div style={styles.boldText}>PHÒNG KN</div>
                                        <Box height="90px"></Box>
                                    </Box>
                                    <Box style={styles.signatureCol}>
                                        <div style={styles.text}>Ngày..................</div>
                                        <div style={styles.boldText}>PHÒNG KTCN</div>
                                        <Box height="90px"></Box>
                                        <div style={styles.text}>{xacNhan.BoPhan}</div>
                                    </Box>
                                    {
                                        xacNhan && xacNhan.some(item => item.BoPhanId === 2) && (
                                            <Box style={styles.signatureCol}>
                                                <div style={styles.text}>Ngày..................</div>
                                                <div style={styles.boldText}>PHÒNG VT</div>
                                                <Box height="90px"></Box>
                                                <div style={styles.text}>{xacNhan.find(item => item.BoPhanId === 2)?.FullName}</div>
                                            </Box>
                                        )
                                    }
                                </Box>

                                {/* 8. Theo dõi */}
                                <Box className="avoid-break" mt={2} pt={0}>
                                    <div style={styles.sectionTitle}>8. Theo dõi đánh giá</div>
                                    <div style={{ display: 'flex', marginTop: '8px' }}>
                                        {renderCheckbox('Thỏa mãn', false)}
                                        {renderCheckbox('Không thỏa mãn', false)}
                                        <span style={{ marginLeft: '40px' }}>Phiếu KPH mới số: ................................................</span>
                                    </div>
                                    <div style={{ marginTop: '16px' }}>
                                        <div style={styles.text}>Ghi chú: ..........................................................................................................................................................</div>
                                    </div>

                                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ paddingLeft: '16px' }}>
                                            <div style={styles.boldText}>Nơi nhận:</div>
                                            <div style={styles.text}>- Lưu</div>
                                        </div>
                                        <div style={{ textAlign: 'center', width: '250px' }}>
                                            <div style={styles.text}>Ngày..................</div>
                                            <div style={styles.boldText}>NGƯỜI THEO DÕI</div>
                                            <Box height="60px"></Box>
                                            <div style={styles.text}>(Ký, họ tên)</div>
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