import React from 'react';
import { Box, Grid } from '@mui/material';
import { getAssetUrl } from "../../../api/lookup.api";
import { PrintSignatureImage } from '../../../components/common/PrintSignature';

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
    xacNhans = [],
    thongSoList = [],
    thongSoKqList = [],
    onRequestProductImageUpload = null,
    printVariant = "detail"
}, ref) => {
    const findSigner = (roles) => [...xacNhans].reverse().find((item) =>
        roles.includes(String(item?.VaiTro || '').toUpperCase())
    );
    const departmentSigner = findSigner(['PX', 'TBP', 'TRUONG_BO_PHAN']);
    const inspectorSigner = findSigner(['KCS', 'NHAN_VIEN_KIEM', 'KIEM_NGHIEM']);
    if (!phieu) return null;

    // Chuyển array dynamicFields thành object để dễ map vào thẻ input
    const customData = (dynamicFields || []).reduce((acc, field) => {
        if (field?.FieldName) acc[field.FieldName] = field.FieldValue;
        return acc;
    }, {});

    const invoiceNo = String(
        customData.DongCont_InvoiceNo
        || phieu.DongContInvoiceNo
        || String(phieu.DoiTuong || "").split(" - ")[0]
        || ""
    ).trim();
    let closingScheduleCustomer = String(
        customData.DongCont_KhachHang || customData.KhachHang || phieu.KhachHang || ""
    ).trim().toUpperCase();
    if (!closingScheduleCustomer && invoiceNo.toUpperCase().includes("ECIS")) closingScheduleCustomer = "IKEA";
    if (!closingScheduleCustomer && invoiceNo.toUpperCase().includes("DC")) closingScheduleCustomer = "DEK";
    const isIkea = Number(phieu.LoaiKiemId) === 5 && closingScheduleCustomer === "IKEA";
    const isDek = Number(phieu.LoaiKiemId) === 5 && closingScheduleCustomer === "DEK";
    const isDekOfficial = isDek && printVariant === "dek-official";

    const rawPackage = customData.DongCont_Package ?? phieu.DongContPackage;
    const parsedPackage = rawPackage === "" || rawPackage === null || rawPackage === undefined
        ? null
        : Number(rawPackage);
    const dekPackage = Number.isInteger(parsedPackage) && parsedPackage >= 0 ? parsedPackage : null;

    const closingScheduleOrderNumber = (() => {
        if (Number(phieu.LoaiKiemId) !== 5) return "";

        if (closingScheduleCustomer === "IKEA") {
            return invoiceNo;
        }

        if (closingScheduleCustomer === "DEK") {
            return customData.DongCont_PackingMethod || phieu.DongContPackingMethod || "";
        }

        return "";
    })();
    const effectiveQuantity = phieu.SoLuongThucTe != null
        ? phieu.SoLuongThucTe
        : (phieu.SoLuong ?? "");

    const ticketCreatedAt = (() => {
        if (phieu.CreatedAt && !Number.isNaN(new Date(phieu.CreatedAt).getTime())) {
            return new Date(phieu.CreatedAt);
        }
        const match = String(phieu.SoPhieu || "").match(/^PK(\d{4})(\d{2})(\d{2})-/);
        return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
    })();
    const inspectionDate = isDek ? ticketCreatedAt : (phieu.NgayKiem ? new Date(phieu.NgayKiem) : new Date());
    const formattedInspectionDate = inspectionDate && !Number.isNaN(inspectionDate.getTime())
        ? inspectionDate.toLocaleDateString("vi-VN")
        : "";
    const formattedLongInspectionDate = formattedInspectionDate
        ? formattedInspectionDate
            .replace(/\//g, " tháng ")
            .replace(/ tháng \d{4}/, (match) => match.replace(" tháng ", " năm "))
        : "";

    // Tính toán kích thước sản phẩm từ thongSoList (Cấp độ đặc biệt)
    const specDimensions = (() => {
        const dimGroup = (thongSoList || []).filter(ts => ts.NhomThongSo === "Kích thước sản phẩm");
        if (dimGroup.length === 0) return null;

        const dai = dimGroup.find(ts => ts.TenThongSo?.toLowerCase() === "dài")?.GiaTriChuan;
        const rong = dimGroup.find(ts => ts.TenThongSo?.toLowerCase() === "rộng")?.GiaTriChuan;
        const cao = dimGroup.find(ts => ts.TenThongSo?.toLowerCase() === "cao")?.GiaTriChuan;

        return [dai, rong, cao].filter(v => v !== undefined && v !== null && v !== "").join(" x ");
    })();

    const normalizeText = (value = "") =>
        String(value)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .trim();

    const getSectionQuantity = (matchFn) => {
        const section = sections.find(s => matchFn(normalizeText(s.TenNhom)));
        return section?.TongSo ?? section?.SoLuongKiem ?? "";
    };

    // Lấy số lượng từ các nhóm kiểm (sections) tương ứng
    const khayQty = getSectionQuantity(name => name.includes("KHAY"));
    const palletQty = getSectionQuantity(name => name.includes("PALLET"));
    const productImageUrl = phieu?.ImageUrl ? getAssetUrl(phieu.ImageUrl) : "";
    const rawInspectionPlanLevel = String(sections?.[0]?.InspectionLevel || "").trim().toUpperCase();
    const selectedInspectionPlanLevel = isDek
        ? (rawInspectionPlanLevel.startsWith("II") ? "II" : rawInspectionPlanLevel.startsWith("I") ? "I" : "")
        : rawInspectionPlanLevel.charAt(0);

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
            padding: '5mm 15mm', // Lề giấy ảo trên web
            boxSizing: 'border-box',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        },
        text: { fontSize: '9.5pt', marginBottom: '1px', lineHeight: 1.2 },
        boldText: { fontSize: '9.5pt', fontWeight: 'bold' },
        table: { border: '1px solid #000', borderCollapse: 'collapse', width: '100%', marginBottom: '15px' },
        th: { border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold', textAlign: 'center', fontSize: '8.5pt', backgroundColor: '#f9f9f9' },
        td: { border: '1px solid #000', padding: '2px 6px', fontSize: '8.5pt', verticalAlign: 'middle' },
        tdCenter: { border: '1px solid #000', padding: '2px 4px', fontSize: '8.5pt', textAlign: 'center', verticalAlign: 'middle' },
        headerTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '15px', border: '1px solid #000' },
        headerTd: { border: '1px solid #000', padding: '2px', textAlign: 'center', verticalAlign: 'middle' },
        signatureBlock: { display: 'flex', justifyContent: 'space-between', marginTop: '30px', textAlign: 'center', width: '100%' },
        signatureCol: { flex: 1, padding: '0 10px' },
        flexBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        inputField: { width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 'inherit', fontFamily: 'inherit', padding: 0, margin: 0, color: 'inherit' },
        infoTableLabel: { padding: '2px 4px 2px 0', border: 'none', fontSize: '10pt', lineHeight: 1.15, verticalAlign: 'middle' },
        infoTableCell: { border: '1px solid #000', padding: '2px 4px', fontSize: '9.5pt', lineHeight: 1.15 },
        infoTableUnitCell: { border: '1px solid #000', padding: '2px 4px', fontSize: '9pt', lineHeight: 1.1, textAlign: 'right' }
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

    const renderInspectionPlanCheckboxes = (selectedLevel) => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            minHeight: '22px',
            gap: '12px',
            whiteSpace: 'nowrap'
        }}>
            {(isDek ? ["I", "II"] : ["1", "2", "3", "4"]).map((level) => (
                <span
                    key={level}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '10pt',
                        lineHeight: 1
                    }}
                >
                    {isDekOfficial
                        ? `Cấp độ ${level === "I" ? "1" : "2"}`
                        : isDek ? `Level ${level}` : `MĐ ${level}`}
                    {renderCheckbox(selectedLevel === level)}
                </span>
            ))}
        </div>
    );

    const selectedInspectionType = normalizeText(phieu.MucDoKiemTra || customData.MucDoKiemTra || "");
    const renderInspectionTypeCheckboxes = () => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', minHeight: '22px', whiteSpace: 'nowrap' }}>
            {[
                { value: 'KT LAN DAU', label: 'KT lần đầu' },
                { value: 'KT THUONG XUYEN', label: 'KT thường xuyên' },
                { value: 'KT LAI', label: 'KT lại' }
            ].map((option) => (
                <span
                    key={option.value}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '8pt', lineHeight: 1 }}
                >
                    {option.label}
                    {renderCheckbox(selectedInspectionType === option.value)}
                </span>
            ))}
        </div>
    );

    const renderDekOfficialInspectionTypes = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minHeight: '44px', justifyContent: 'center' }}>
            {[
                { value: 'KT LAN DAU', label: 'Kiểm tra lần đầu' },
                { value: 'KT THUONG XUYEN', label: 'Kiểm tra thường xuyên' },
                { value: 'KT LAI', label: 'Kiểm tra lại' }
            ].map((option) => (
                <span key={option.value} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '5px', fontSize: '8.5pt' }}>
                    {option.label}
                    {renderCheckbox(selectedInspectionType === option.value)}
                </span>
            ))}
        </div>
    );

    const renderDekOfficialInfoTable = () => (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
            <colgroup>
                <col style={{ width: '16%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '4%' }} />
            </colgroup>
            <tbody>
                <tr>
                    <td style={styles.infoTableLabel}>Nhà cung cấp</td>
                    <td style={{ ...styles.infoTableCell, height: '24px' }}>
                        <input name="NhaCungCap" className="custom-field" type="text" defaultValue={customData.NhaCungCap || phieu.NhaCungCap || 'Công ty TNHH MTV 76'} style={styles.inputField} />
                    </td>
                    <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Khách hàng</td>
                    <td style={styles.infoTableCell}>DEK</td>
                    <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Số đơn hàng</td>
                    <td style={styles.infoTableCell}>
                        <input name="SoDonHang" className="custom-field" type="text" defaultValue={closingScheduleOrderNumber || customData.SoDonHang || phieu.SoDonHang || ''} style={styles.inputField} />
                    </td>
                    <td style={styles.infoTableUnitCell}></td>
                </tr>
                <tr>
                    <td style={styles.infoTableLabel}>NV Kiểm hàng</td>
                    <td style={{ ...styles.infoTableCell, height: '24px' }}>
                        <input name="NVienKiemHang" className="custom-field" type="text" defaultValue={customData.NVienKiemHang || phieu.TenNguoiKiem || ''} style={styles.inputField} />
                    </td>
                    <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Tên sản phẩm</td>
                    <td style={{ ...styles.infoTableCell, verticalAlign: 'middle' }}>
                        <textarea
                            name="TenSanPham"
                            className="custom-field"
                            defaultValue={customData.TenSanPham || phieu.TenSanPham || ''}
                            style={{ ...styles.inputField, resize: 'none', overflow: 'hidden', minHeight: '36px', display: 'block' }}
                            onInput={(event) => {
                                event.target.style.height = 'auto';
                                event.target.style.height = `${event.target.scrollHeight}px`;
                            }}
                            rows={2}
                        />
                    </td>
                    <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Số lượng</td>
                    <td style={styles.infoTableCell}>{effectiveQuantity}</td>
                    <td style={styles.infoTableUnitCell}>cái</td>
                </tr>
                <tr>
                    <td style={styles.infoTableLabel}>Mức độ kiểm tra</td>
                    <td style={styles.infoTableCell}>{renderDekOfficialInspectionTypes()}</td>
                    <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Ngày kiểm tra</td>
                    <td style={styles.infoTableCell}>{formattedInspectionDate}</td>
                    <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Hộp</td>
                    <td style={styles.infoTableCell}>{dekPackage ?? ''}</td>
                    <td style={styles.infoTableUnitCell}>cái</td>
                </tr>
                <tr>
                    <td style={styles.infoTableLabel}>Kế hoạch kiểm hàng<br />AQL</td>
                    <td style={styles.infoTableCell}>{renderInspectionPlanCheckboxes(selectedInspectionPlanLevel)}</td>
                    <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Nơi đến</td>
                    <td style={styles.infoTableCell}>
                        <input name="NoiDen" className="custom-field" type="text" defaultValue={customData.NoiDen || phieu.NoiDen || phieu.DoiTuong || ''} style={styles.inputField} />
                    </td>
                    <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}></td>
                    <td style={styles.infoTableCell}></td>
                    <td style={styles.infoTableUnitCell}></td>
                </tr>
                <tr>
                    <td style={styles.infoTableLabel}>Mã SP</td>
                    <td style={{ ...styles.infoTableCell, height: '36px', fontWeight: 700 }}>{customData.ItemCode || phieu.MaSanPham || ''}</td>
                    <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Truy xuất</td>
                    <td style={styles.infoTableCell}>
                        <input name="Lot" className="custom-field" type="text" defaultValue={phieu.Lot || customData.Lot || ''} style={styles.inputField} />
                    </td>
                    <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Tổng SL</td>
                    <td style={styles.infoTableCell}>{effectiveQuantity}</td>
                    <td style={styles.infoTableUnitCell}></td>
                </tr>
            </tbody>
        </table>
    );

    const getSectionDecision = (section) => {
        const sectionResult = normalizeText(section?.KetLuan || "");
        if (["REJECT", "KHONG DAT", "KHONG_DAT", "FAIL"].includes(sectionResult)) return "FAIL";
        if (["ACCEPT", "DAT", "PASS"].includes(sectionResult)) return "PASS";

        const sectionItems = checkItems.filter((item) =>
            Number(item.SectionId) === Number(section?.Id) && normalizeText(item.KetQua) !== "NA"
        );
        if (!sectionItems.length) return null;
        if (sectionItems.some((item) => ["KHONG DAT", "KHONG_DAT", "FAIL", "REJECT"].includes(normalizeText(item.KetQua)))) {
            return "FAIL";
        }
        if (sectionItems.every((item) => ["DAT", "PASS", "ACCEPT"].includes(normalizeText(item.KetQua)))) {
            return "PASS";
        }
        return null;
    };

    const ikeaSummaryRows = (() => {
        const activeSections = sections.filter((section) =>
            checkItems.some((item) => Number(item.SectionId) === Number(section.Id) && normalizeText(item.KetQua) !== "NA")
        );
        const palletSections = activeSections.filter((section) => normalizeText(section.TenNhom).includes("PALLET"));
        const cartonSections = activeSections.filter((section) => {
            const name = normalizeText(section.TenNhom);
            return name.includes("KHAY") || name.includes("CARTON") || name.includes("BAO GOI");
        });
        const groupedIds = new Set([...palletSections, ...cartonSections].map((section) => Number(section.Id)));
        const productSections = activeSections.filter((section) => !groupedIds.has(Number(section.Id)));
        const groupDecision = (groupSections) => {
            const decisions = groupSections.map(getSectionDecision);
            if (!decisions.length) return null;
            if (decisions.includes("FAIL")) return "FAIL";
            return decisions.every((decision) => decision === "PASS") ? "PASS" : null;
        };

        return [
            { label: "I. Pallet", decision: groupDecision(palletSections) },
            { label: "II. Khay / Carton", decision: groupDecision(cartonSections) },
            { label: "III – IV. Sản phẩm - Đánh giá theo con mắt khách hàng", decision: groupDecision(productSections) }
        ];
    })();

    const renderMeasurementGrid = (val) => {
        if (!val) return <div style={{ height: '20px' }}></div>;

        const values = String(val).split(/[\s,\n]+/).filter(v => v.trim() !== '');
        if (values.length === 0) return <div style={{ height: '20px' }}></div>;

        const cols = 5;
        const rows = [];
        for (let i = 0; i < values.length; i += cols) {
            rows.push(values.slice(i, i + cols));
        }

        return (
            <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: '8pt' }}>
                <tbody>
                    {rows.map((row, ridx) => (
                        <tr key={ridx}>
                            {row.map((v, cidx) => (
                                <td key={cidx} style={{ border: '0.5px solid #000', textAlign: 'center', padding: '1px', width: `${100 / cols}%`, height: '20px' }}>{v}</td>
                            ))}
                            {row.length < cols && Array.from({ length: cols - row.length }).map((_, idx) => (
                                <td key={`empty-${idx}`} style={{ border: '0.5px solid #000', width: `${100 / cols}%` }}></td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    return (
        <div ref={ref} style={styles.previewBackground} className="preview-background">
            <style>
                {`
                @page {
                    size: A4 landscape; /* Bắt buộc in ngang */
                    margin: 5mm 15mm; /* Lề in thực tế */
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
                    .screen-only-upload-trigger,
                    .screen-only-upload-action { display: none !important; }
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
                                <div style={{ fontSize: '11pt' }}><b>Mã số:</b> {isDek ? 'BM.01.02-HD.02.QT.04-B8' : 'BM.01.01-QT.04-B8'}</div>
                                <div style={{ fontSize: '11pt' }}>Ngày hiệu lực: {isIkea ? '20/6/2026' : isDek ? '26/06/2026' : '15/6/2026'}</div>
                                <div style={{ fontSize: '11pt' }}>Phiên bản: 00</div>
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
                <Box mb={1} className="avoid-break">

                    {/* Bản ký DEK không có dòng Số phiếu & Ngày tháng phía trên khối thông tin. */}
                    {!isDekOfficial && (
                        <Box style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
                            <Box style={{ display: 'flex', justifyContent: 'space-between', width: '500px' }}>
                                <div style={{ ...styles.text, fontStyle: 'italic' }}>
                                    Số: {phieu.SoPhieu || '..........'}/KN.
                                </div>
                                <div style={{ ...styles.text, fontStyle: 'italic' }}>
                                    Ngày {formattedLongInspectionDate}
                                </div>
                            </Box>
                        </Box>
                    )}

                    {/* Khung 2 ô Thông tin & Hình ảnh */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        {/* Cột trái: Thông tin sản phẩm & Phê duyệt */}
                        <Box sx={{ width: '49%', border: '1px solid #000', display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ p: 1 }}>
                                <div style={{ ...styles.text, fontSize: '10pt' }}>
                                    Sản phẩm: <b>{phieu.TenSanPham || '...........................................................................'}</b>
                                </div>
                                {!isDekOfficial && (
                                    <div style={{ ...styles.text, fontSize: '10pt' }}>
                                        Item code: <b>{customData.ItemCode || phieu.MaSanPham || '...........................................................................'}</b>
                                    </div>
                                )}
                                <div style={{ ...styles.text, fontSize: '10pt' }}>
                                    <span>Phiên bản: </span>
                                    <input
                                        name="PhienBan"
                                        className="custom-field"
                                        type="text"
                                        defaultValue={customData.PhienBan || phieu.PhienBan || ""}
                                        style={{ ...styles.inputField, display: 'inline-block', width: '70%' }}
                                    />
                                </div>
                                <div style={{ ...styles.text, fontSize: '10pt' }}>
                                    <span>Tham chiếu tiêu chuẩn: </span>
                                    <input
                                        name="ThamChieuTieuChuan"
                                        className="custom-field"
                                        type="text"
                                        defaultValue={customData.ThamChieuTieuChuan || phieu.ThamChieuTieuChuan || ""}
                                        style={{ ...styles.inputField, display: 'inline-block', width: '55%' }}
                                    />
                                </div>
                            </Box>
                            <Box sx={{ borderTop: '1px solid #000', p: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '80px', flex: 1 }}>
                                <div style={styles.boldText}>PHÊ DUYỆT</div>
                            </Box>
                        </Box>

                        <Box sx={{ width: '35%', border: '1px solid #000', p: 1, display: 'flex', flexDirection: 'column', minHeight: '182px' }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                                <div style={{ ...styles.text, fontSize: '10pt', marginBottom: 0 }}>*Hình ảnh minh họa sản phẩm</div>
                                {productImageUrl && typeof onRequestProductImageUpload === "function" ? (
                                    <Box
                                        className="screen-only-upload-action"
                                        onClick={onRequestProductImageUpload}
                                        sx={{
                                            fontSize: "9pt",
                                            color: "#2563eb",
                                            cursor: "pointer",
                                            textDecoration: "underline"
                                        }}
                                    >
                                        Đổi ảnh
                                    </Box>
                                ) : null}
                            </Box>
                            {productImageUrl ? (
                                <Box
                                    component="img"
                                    src={productImageUrl}
                                    alt={phieu.TenSanPham || "Ảnh sản phẩm"}
                                    sx={{
                                        width: '100%',
                                        height: 150,
                                        objectFit: 'contain',
                                        mt: 0.5
                                    }}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        flex: 1,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    {typeof onRequestProductImageUpload === "function" ? (
                                        <Box
                                            className="screen-only-upload-trigger"
                                            onClick={onRequestProductImageUpload}
                                            sx={{
                                                width: "100%",
                                                minHeight: 140,
                                                border: "1px dashed #94a3b8",
                                                borderRadius: 1,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                textAlign: "center",
                                                color: "#475569",
                                                fontSize: "10pt",
                                                cursor: "pointer",
                                                px: 2,
                                                "&:hover": {
                                                    borderColor: "#2563eb",
                                                    color: "#1d4ed8",
                                                    backgroundColor: "#eff6ff"
                                                }
                                            }}
                                        >
                                            Nhấn để thêm ảnh cho item code này
                                        </Box>
                                    ) : null}
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {/* Bảng Thông tin Lô hàng có class "custom-field" để lấy giá trị động */}
                    {isDekOfficial ? renderDekOfficialInfoTable() : (
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
                                <td style={styles.infoTableLabel}>Nhà cung cấp</td>
                                <td style={{ ...styles.infoTableCell, height: '24px' }}>
                                    <input name="NhaCungCap" className="custom-field" type="text" defaultValue={customData.NhaCungCap || phieu.NhaCungCap || 'Công ty TNHH MTV 76'} style={styles.inputField} />
                                </td>
                                <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Khách hàng</td>
                                <td style={styles.infoTableCell}>
                                    <input name="KhachHang" className="custom-field" type="text" defaultValue={isDek ? 'DEK' : (customData.KhachHang || phieu.KhachHang || '')} style={styles.inputField} />
                                </td>
                                <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Số đơn hàng</td>
                                <td style={styles.infoTableCell}>
                                    <input name="SoDonHang" className="custom-field" type="text" defaultValue={closingScheduleOrderNumber || customData.SoDonHang || phieu.SoDonHang || ''} style={styles.inputField} />
                                </td>
                                <td style={styles.infoTableUnitCell}></td>
                                {/* <td style={styles.infoTableUnitCell}></td> */}
                            </tr>
                            <tr>
                                <td style={styles.infoTableLabel}>NV Kiểm hàng</td>
                                <td style={{ ...styles.infoTableCell, height: '24px' }}>
                                    <input name="NVienKiemHang" className="custom-field" type="text" defaultValue={customData.NVienKiemHang || phieu.TenNguoiKiem || ''} style={styles.inputField} />
                                </td>
                                <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Tên sản phẩm</td>
                                <td style={{ ...styles.infoTableCell, verticalAlign: 'middle' }}>
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
                                <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>SL</td>
                                <td style={styles.infoTableCell}>
                                    <span>{effectiveQuantity}</span>
                                </td>
                                <td style={styles.infoTableUnitCell}>cái</td>
                                {/* <td style={styles.infoTableUnitCell}>hộp</td> */}
                            </tr>
                            <tr>
                                <td style={styles.infoTableLabel}>Mức độ kiểm tra</td>
                                <td style={{ ...styles.infoTableCell, height: '24px' }}>
                                    {isIkea
                                        ? renderInspectionTypeCheckboxes()
                                        : <input name="MucDoKiemTra" className="custom-field" type="text" defaultValue={customData.MucDoKiemTra || phieu.MucDoKiemTra || ''} style={styles.inputField} />}
                                </td>
                                <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Kích thước SP</td>
                                <td style={styles.infoTableCell}>
                                    <input name="KichThuocSP" className="custom-field" type="text" defaultValue={specDimensions || customData.KichThuocSP || phieu.KichThuoc || ''} style={styles.inputField} />
                                </td>
                                <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Khay</td>
                                <td style={styles.infoTableCell}>
                                    <input name="Khay" className="custom-field" type="text" defaultValue={khayQty || customData.Khay || phieu.Khay || ''} style={styles.inputField} />
                                </td>
                                <td style={styles.infoTableUnitCell}>cái</td>
                                {/* <td style={styles.infoTableUnitCell}>hộp</td> */}
                            </tr>
                            <tr>
                                <td style={styles.infoTableLabel}>{isIkea ? 'Mức độ lấy mẫu' : 'Kế hoạch kiểm hàng'}</td>
                                <td style={{ ...styles.infoTableCell, height: '24px' }}>
                                    {renderInspectionPlanCheckboxes(selectedInspectionPlanLevel)}
                                </td>
                                <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Ngày kiểm tra</td>
                                <td style={styles.infoTableCell}>
                                    {isDek
                                        ? <span>{formattedInspectionDate}</span>
                                        : <input name="NgayKiemTra" className="custom-field" type="text" defaultValue={customData.NgayKiemTra || formattedInspectionDate} style={styles.inputField} />}
                                </td>
                                <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Pallet</td>
                                <td style={styles.infoTableCell}>
                                    <input name="Pallet" className="custom-field" type="text" defaultValue={palletQty || customData.Pallet || phieu.Pallet || ''} style={styles.inputField} />
                                </td>
                                <td style={styles.infoTableUnitCell}>cái</td>
                                {/* <td style={styles.infoTableUnitCell}>hộp</td> */}
                            </tr>
                            <tr>
                                <td style={styles.infoTableLabel}>Số LOT</td>
                                <td style={{ ...styles.infoTableCell, height: '24px' }}>
                                    <input name="Lot" className="custom-field" type="text" defaultValue={phieu.Lot || customData.Lot || ''} style={styles.inputField} />
                                </td>
                                <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Nơi đến</td>
                                <td style={styles.infoTableCell}>
                                    <input name="NoiDen" className="custom-field" type="text" defaultValue={customData.NoiDen || phieu.NoiDen || phieu.DoiTuong || ''} style={styles.inputField} />
                                </td>
                                <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Tổng SL</td>
                                <td style={styles.infoTableCell}>
                                    {isDek
                                        ? <span>{effectiveQuantity}</span>
                                        : <input name="TongSL" className="custom-field" type="text" defaultValue={customData.TongSL || phieu.TongSL || ''} style={styles.inputField} />}
                                </td>
                                <td style={styles.infoTableUnitCell}></td>
                                {/* <td style={styles.infoTableUnitCell}></td> */}
                            </tr>
                            {!isDek && <tr>
                                <td style={styles.infoTableLabel}></td>
                                <td style={{ ...styles.infoTableCell, height: '24px' }}></td>
                                <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}>Hiệu lực test</td>
                                <td style={styles.infoTableCell}>
                                    <input
                                        name="HieuLucTest"
                                        className="custom-field"
                                        type="text"
                                        defaultValue={customData.HieuLucTest || ""}
                                        style={styles.inputField}
                                    />
                                </td>
                                <td style={{ ...styles.infoTableLabel, paddingLeft: '8px' }}></td>
                                <td style={styles.infoTableCell}></td>
                                <td style={styles.infoTableUnitCell}></td>
                                {/* <td style={styles.infoTableUnitCell}></td> */}
                            </tr>}
                        </tbody>
                    </table>
                    )}
                </Box>

                {/* ================= BẢNG KIỂM TRA ================= */}
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th rowSpan={2} style={{ ...styles.th, width: '4%' }}>TT<br />No</th>
                            <th rowSpan={2} style={{ ...styles.th, width: '20%' }}>MỤC KIỂM TRA<br />Checklist</th>
                            <th rowSpan={2} style={{ ...styles.th, width: '11%' }}>Phương pháp KT</th>
                            <th rowSpan={2} style={{ ...styles.th, width: '19%' }}>TIÊU CHUẨN KỸ THUẬT<br />Standard</th>
                            <th rowSpan={2} style={{ ...styles.th, width: '18%' }}>KẾT QUẢ<br />Result</th>
                            <th colSpan={2} style={{ ...styles.th, width: '12%' }}>KẾT LUẬN<br />Conclusion</th>
                            <th colSpan={3} style={{ ...styles.th, width: '16%' }}>DẠNG LỖI</th>
                        </tr>
                        <tr>
                            <th style={{ ...styles.th, width: '6%' }}>OK</th>
                            <th style={{ ...styles.th, width: '6%' }}>N.OK</th>
                            <th style={{ ...styles.th, width: '8%' }}>Lỗi nhẹ</th>
                            <th style={{ ...styles.th, width: '8%' }}>Lỗi nặng</th>
                            <th style={{ ...styles.th, width: '8%' }}>Lỗi N.trọng</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sections.map((section, sIndex) => {
                            const sectionItems = checkItems.filter(
                                item => item.SectionId === section.Id && item.KetQua !== 'NA'
                            );
                            const isDekPackagingSection = isDek
                                && normalizeText(section.TenNhom).includes('BAO GOI');
                            const displayedSectionTotal = isDekPackagingSection && dekPackage !== null
                                ? dekPackage
                                : section.TongSo;
                            const displayedSectionSample = isDekPackagingSection && dekPackage !== null
                                ? Math.ceil(Math.sqrt(dekPackage))
                                : section.SoLuongKiem;

                            if (sectionItems.length === 0) {
                                return null;
                            }

                            return (
                                <React.Fragment key={section.Id}>
                                    {/* Tên Section */}
                                    <tr className="avoid-break" style={{ backgroundColor: '#f0f0f0' }}>
                                        <td colSpan={10} style={{ ...styles.td, padding: '8px' }}>
                                            <Box style={styles.flexBetween}>
                                                <div style={styles.boldText}>
                                                    {toRoman(sIndex + 1)}. {section.TenNhom.toUpperCase()} {section.InspectionLevel ? <span style={{ fontWeight: 'normal', fontSize: '10pt', marginLeft: '5px' }}> - AQL: {section.InspectionLevel}</span> : ''}
                                                </div>
                                                <Box style={{ display: 'flex', gap: '40px', paddingRight: '20px' }}>
                                                    <span>Tổng số: <span style={{ display: 'inline-block', minWidth: '40px', borderBottom: '1px dotted #000', textAlign: 'center' }}><b>{displayedSectionTotal}</b></span> Pcs</span>
                                                    <span>Số lượng kiểm: <span style={{ display: 'inline-block', minWidth: '40px', borderBottom: '1px dotted #000', textAlign: 'center' }}><b>{displayedSectionSample}</b></span> Pcs</span>
                                                </Box>
                                            </Box>
                                        </td>
                                    </tr>

                                    {/* Các mục kiểm tra */}
                                    {sectionItems.map((item, iIndex) => {
                                        const itemDefects = defects.filter(d => d.CheckItemId === item.Id);
                                        const criticalContentStyle = item.DiemTrongYeu
                                            ? { fontStyle: 'italic' }
                                            : {};
                                        const sumDefects = (type) => itemDefects
                                            .filter(d => d.DefectType === type)
                                            .reduce((sum, d) => sum + (d.SoLuong || 0), 0);

                                        const minorQty = sumDefects('MINOR');
                                        const majorQty = sumDefects('MAJOR');
                                        const criticalQty = sumDefects('CRITICAL');

                                        return (
                                            <tr key={item.Id} className="avoid-break">
                                                <td style={styles.tdCenter}>{iIndex + 1}</td>
                                                <td style={{ ...styles.td, ...criticalContentStyle }}>{item.TenMucKiem}</td>
                                                <td style={{ ...styles.td, ...criticalContentStyle }}>{item.PhuongPhapKiem}</td>
                                                <td style={{ ...styles.td, ...criticalContentStyle }}>{item.TieuChuan}</td>
                                                <td style={{ ...styles.td, padding: 0 }}>
                                                    {renderMeasurementGrid(item.GiaTriDo)}
                                                </td>

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
                                        <td colSpan={7} style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>Tổng lỗi thực tế:</td>
                                        <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>{section.TotalMinor}</td>
                                        <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>{section.TotalMajor}</td>
                                        <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>{section.TotalCritical}</td>
                                    </tr>
                                    <tr className="avoid-break">
                                        <td colSpan={7} style={{ ...styles.td, textAlign: 'right', fontStyle: 'italic' }}>Lỗi tối đa có thể chấp nhận (Ac):</td>
                                        <td style={styles.tdCenter}>{section.Ac_Minor}</td>
                                        <td style={styles.tdCenter}>{section.Ac_Major}</td>
                                        <td style={styles.tdCenter}>{section.Ac_Critical}</td>
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>

                {isIkea && (
                    <Box className="avoid-break" sx={{ width: '68%', mt: 2.5, mb: 2.5 }}>
                        <div style={{ ...styles.boldText, fontSize: '12pt', textDecoration: 'underline', marginBottom: '8px' }}>
                            TỔNG HỢP KẾT QUẢ KIỂM TRA <span style={{ fontWeight: 'normal' }}>(Inspection Result Summary)</span>
                        </div>
                        <table style={{ ...styles.table, marginBottom: 0 }}>
                            <thead>
                                <tr>
                                    <th style={{ ...styles.th, fontSize: '10pt' }}>Hạng mục kiểm</th>
                                    <th style={{ ...styles.th, width: '20%', fontSize: '10pt' }}>Đạt (PASS)</th>
                                    <th style={{ ...styles.th, width: '24%', fontSize: '10pt' }}>Không đạt (FAIL)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ikeaSummaryRows.map((row) => (
                                    <tr key={row.label}>
                                        <td style={{ ...styles.td, fontWeight: 600, fontSize: '9.5pt' }}>{row.label}</td>
                                        <td style={styles.tdCenter}>{renderCheckbox(row.decision === 'PASS')}</td>
                                        <td style={styles.tdCenter}>{renderCheckbox(row.decision === 'FAIL')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Box>
                )}

                {/* ================= KẾT LUẬN & CHỮ KÝ ================= */}
                <Box className="avoid-break" mt={3} pl={1} pb={2}>
                    {isIkea ? (
                        <Box mb={2}>
                            <div style={{ ...styles.boldText, fontSize: '12pt', textDecoration: 'underline', marginBottom: '6px' }}>
                                KẾT LUẬN <span style={{ fontWeight: 'normal' }}>(Final Conclusion)</span>
                            </div>
                            {[0, 1, 2].map((line) => (
                                <div key={line} style={{ borderBottom: '1px dotted #000', height: '20px' }} />
                            ))}
                            <Box mt={1.5} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '70px' }}>
                                <Box style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10pt' }}>
                                    <span>Cho xuất hàng/&nbsp; Shipment approved:</span>
                                    {renderCheckbox(phieu.KetLuan === 'DAT')}
                                </Box>
                                <Box style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10pt' }}>
                                    <span>Giữ lại hàng/&nbsp; Shipment on hold:</span>
                                    {renderCheckbox(phieu.KetLuan === 'KHONG_DAT')}
                                </Box>
                            </Box>
                        </Box>
                    ) : (
                        <>
                            <Box mb={2} style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ ...styles.boldText, marginRight: '15px' }}>* Kết quả:</div>
                                <div style={{ ...styles.boldText, textTransform: 'uppercase' }}>
                                    {phieu.KetLuan === 'DAT' ? 'ĐẠT YÊU CẦU' : phieu.KetLuan === 'KHONG_DAT' ? 'KHÔNG ĐẠT YÊU CẦU' : '.........................................................'}
                                </div>
                            </Box>

                            <Box mb={2} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={styles.boldText}>* Kết luận:</div>
                                <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {renderCheckbox(phieu.KetLuan === 'DAT')} <span>Cho xuất hàng</span>
                                </Box>
                                <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {renderCheckbox(phieu.KetLuan === 'KHONG_DAT')} <span>Giữ lại hàng (Lập biên bản KPH)</span>
                                </Box>
                            </Box>
                        </>
                    )}

                    <Box style={{ ...styles.signatureBlock, marginTop: '10px' }}>
                        <Box style={styles.signatureCol}>
                            <div style={{ ...styles.text, minHeight: '30px' }}><b>Trưởng bộ phận</b></div>
                            <PrintSignatureImage src={departmentSigner?.SignatureDataUrl} height={60} />
                            <div style={styles.text}>{departmentSigner?.TenNguoiXacNhan || phieu.BoPhan}</div>
                        </Box>
                        <Box style={styles.signatureCol}>
                            <div style={{ ...styles.text, minHeight: '30px' }}><b>Người kiểm hàng</b></div>
                            <PrintSignatureImage src={inspectorSigner?.SignatureDataUrl} height={60} />
                            <div style={styles.text}>{phieu.TenNguoiKiem}</div>
                        </Box>
                    </Box>

                    <Box mt={1} className="avoid-break">
                        <div style={{ fontSize: '8pt', fontStyle: isIkea ? 'italic' : 'normal' }}>
                            <b style={{ textDecoration: isIkea ? 'underline' : 'none' }}>* Ghi chú:</b> Các lỗi dễ bị phản ánh hoặc đã có khiếu nại của khách hàng được cập nhật trong báo cáo kiểm hàng bằng những dòng chữ in đậm-nghiêng để chú ý và kiểm soát chặt chẽ hơn trong quá trình kiểm tra.
                        </div>
                    </Box>

                </Box>

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
                                <div style={{ ...styles.boldText, fontSize: '12pt', textTransform: 'uppercase' }}>Kết quả kiểm theo cấp độ đặc biệt</div>
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

                {/* ================= HÌNH ẢNH LỖI ================= */}
                {(() => {
                    const defectImages = [];
                    defects.forEach(d => {
                        let urls = [];
                        try {
                            if (Array.isArray(d.ImageUrls)) {
                                urls = d.ImageUrls;
                            } else if (typeof d.ImageUrls === 'string' && d.ImageUrls.trim() !== '') {
                                urls = JSON.parse(d.ImageUrls);
                            }
                        } catch (e) {
                            console.error("Error parsing ImageUrls for defect:", d.Id, e);
                        }

                        if (urls && urls.length > 0) {
                            const checkItem = checkItems.find(ci => ci.Id === d.CheckItemId);
                            urls.forEach(url => {
                                defectImages.push({
                                    url: url,
                                    tenMucKiem: checkItem?.TenMucKiem || 'N/A',
                                    loaiLoi: d.DefectType
                                });
                            });
                        }
                    });

                    if (defectImages.length === 0) return null;

                    return (
                        <Box mt={4} className="avoid-break">
                            <Box mb={2} style={{ textAlign: 'center', borderBottom: '2px solid #000', pb: 1 }}>
                                <div style={{ ...styles.boldText, fontSize: '14pt' }}>HÌNH ẢNH LỖI</div>
                            </Box>
                            <Grid container spacing={2}>
                                {defectImages.map((img, idx) => (
                                    <Grid size={4} key={idx} sx={{ mb: 2 }}>
                                        <Box style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center', height: '100%' }}>
                                            <img
                                                src={`https://z76api.z76.vn${img.url}`}
                                                alt="defect"
                                                style={{ width: '100%', height: '200px', objectFit: 'contain', display: 'block' }}
                                                crossOrigin="anonymous"
                                            />
                                            <div style={{ fontSize: '9pt', marginTop: '6px', textAlign: 'left', borderTop: '1px solid #eee', pt: 0.5 }}>
                                                <b>Mục:</b> {img.tenMucKiem}<br />
                                                <b>Lỗi:</b> {img.loaiLoi}
                                            </div>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    );
                })()}

            </div>
        </div>
    );
});
