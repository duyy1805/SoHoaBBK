import React, { forwardRef, useMemo } from "react";

const FORM_META = {
    companyName: "CÔNG TY TNHH MTV 76",
    formCode: "BM.03.2-HD.12-QT.03-B8",
    effectiveDate: "22/06/2026",
    version: "01",
    title: "THEO DÕI, KIỂM TRA CHẤT LƯỢNG CUỐI CHUYỀN"
};

const MIN_DEFECT_PRINT_COLUMNS = 12;

const styles = {
    page: {
        width: "297mm",
        minHeight: "210mm",
        padding: "10mm 10mm 12mm",
        backgroundColor: "#fff",
        color: "#000",
        fontFamily: "\"Times New Roman\", serif",
        boxSizing: "border-box"
    },
    metaTable: {
        width: "100%",
        borderCollapse: "collapse",
        tableLayout: "fixed"
    },
    metaCell: {
        border: "1px solid #000",
        padding: "4px 6px",
        verticalAlign: "middle"
    },
    title: {
        textAlign: "center",
        fontWeight: 700,
        fontSize: "18px",
        lineHeight: 1.25
    },
    subTitle: {
        textAlign: "center",
        fontSize: "11px"
    },
    infoRow: {
        display: "grid",
        gridTemplateColumns: "1.5fr 1fr 0.9fr",
        gap: "10px",
        marginTop: "6px",
        marginBottom: "6px",
        fontSize: "13px"
    },
    infoField: {
        display: "flex",
        alignItems: "flex-end",
        minWidth: 0
    },
    infoLabel: {
        fontWeight: 700,
        whiteSpace: "nowrap"
    },
    infoValue: {
        flex: 1,
        borderBottom: "1px dotted #000",
        marginLeft: "6px",
        minHeight: "18px",
        padding: "0 4px 1px"
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        tableLayout: "fixed",
        fontSize: "11px"
    },
    th: {
        border: "1px solid #000",
        padding: "3px 2px",
        textAlign: "center",
        fontWeight: 700,
        lineHeight: 1.15
    },
    td: {
        border: "1px solid #000",
        padding: "3px 2px",
        verticalAlign: "top",
        lineHeight: 1.15
    },
    verticalHeader: {
        writingMode: "vertical-rl",
        transform: "rotate(180deg)",
        whiteSpace: "nowrap",
        minHeight: "78px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center"
    },
    center: {
        textAlign: "center",
        verticalAlign: "middle"
    },
    small: {
        fontSize: "10px"
    },
    rowTall: {
        minHeight: "26px"
    },
    footerNote: {
        marginTop: "8px",
        fontSize: "10px",
        lineHeight: 1.25
    },
    signatures: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "40px",
        marginTop: "16px",
        fontSize: "12px"
    },
    signatureBox: {
        textAlign: "center",
        minHeight: "118px"
    },
    signatureTitle: {
        fontWeight: 700,
        fontSize: "13px",
        letterSpacing: "0.3px"
    },
    signatureSignedText: {
        height: "72px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative"
    },
    signatureName: {
        minHeight: "20px",
        marginTop: "4px",
        fontWeight: 700,
        fontSize: "12px"
    },
    signatureStamp: {
        display: "inline-block",
        padding: "8px 16px 7px",
        border: "2px solid #f05a5a",
        color: "#f05a5a",
        fontWeight: 700,
        fontSize: "17px",
        lineHeight: 1,
        textTransform: "uppercase",
        borderRadius: "4px",
        transform: "rotate(-9deg) translateY(4px)",
        letterSpacing: "0.8px",
        backgroundColor: "rgba(255,255,255,0.92)"
    }
};

const getFieldValue = (dynamicFields = [], name) =>
    dynamicFields.find((field) => field?.FieldName === name)?.FieldValue ?? "";
const getPersonDisplayName = (value = {}) =>
    value?.TenNguoiXacNhan ||
    value?.FullName ||
    value?.HoTen ||
    value?.TenNhanVien ||
    value?.UsernameNguoiXacNhan ||
    value?.Username ||
    "";

const normalizeText = (value) =>
    String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toUpperCase();

const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("vi-VN");
};

const renderMultiline = (value) =>
    String(value || "")
        .split("\n")
        .map((line, index) => <div key={`${line}-${index}`}>{line}</div>);

const getDefectColumnId = (defect) =>
    String(defect?.DefectId || defect?.MaLoi || defect?.TenLoi || "").trim();

const formatQualityPercent = (checkedQty, defectQty) => {
    const checked = Number(checkedQty || 0);
    if (!checked) return "";
    const defect = Number(defectQty || 0);
    const quality = ((checked - defect) / checked) * 100;
    return `${Math.max(0, quality).toFixed(1)}%`;
};

const buildDefectPrintColumns = (plans = []) => {
    const orderedColumns = [];
    const seen = new Set();

    plans.forEach((plan) => {
        (plan?.Defects || []).forEach((defect) => {
            const key = getDefectColumnId(defect);
            if (!key || seen.has(key)) return;
            seen.add(key);
            orderedColumns.push({
                id: key,
                label: defect?.TenLoi || defect?.MaLoi || "...",
                code: defect?.MaLoi || "",
                isPlaceholder: false
            });
        });
    });

    while (orderedColumns.length < MIN_DEFECT_PRINT_COLUMNS) {
        orderedColumns.push({
            id: `placeholder-${orderedColumns.length + 1}`,
            label: "...",
            code: "",
            isPlaceholder: true
        });
    }

    return orderedColumns;
};

const buildPrintRows = (plans = [], columns = []) => plans.map((plan, index) => {
    const defectMap = Object.fromEntries(columns.map((column) => [column.id, 0]));
    let totalDefectQty = 0;
    let minor = 0;
    let major = 0;
    let critical = 0;
    let repairedPass = 0;
    let repairedFail = 0;

    (plan?.Defects || []).forEach((defect) => {
        const qty = Number(defect?.SoLuong || 0);
        const passQty = Number(defect?.SoLuongDatSauSua || 0);
        const failQty = Number(defect?.SoLuongKhongDatSauSua || 0);
        repairedPass += passQty;
        repairedFail += failQty;

        if (!qty) return;

        totalDefectQty += qty;
        const defectType = normalizeText(defect?.DefectType);
        if (defectType.includes("MINOR")) minor += qty;
        else if (defectType.includes("CRITICAL")) critical += qty;
        else major += qty;

        const columnId = columns.find((column) => !column.isPlaceholder && String(column.id) === getDefectColumnId(defect))?.id;
        if (columnId) defectMap[columnId] = (defectMap[columnId] || 0) + qty;
    });

    return {
        key: plan?.Id || index,
        index: index + 1,
        product: [plan?.MaSanPham, plan?.TenSanPham].filter(Boolean).join(" - "),
        planInfo: [plan?.TenDonVi, plan?.TenBoPhan, formatDate(plan?.NgayKeHoach)].filter(Boolean).join(" / "),
        checkedQty: Number(plan?.DaSanXuat || plan?.SoLuongKeHoach || 0),
        defectQty: totalDefectQty,
        nhe: minor,
        nang: major,
        nghiemTrong: critical,
        defectMap,
        dat: repairedPass,
        khongDat: repairedFail
    };
});

const buildTotals = (rows = [], columns = []) => {
    const totals = {
        checkedQty: 0,
        defectQty: 0,
        nhe: 0,
        nang: 0,
        nghiemTrong: 0,
        defectMap: Object.fromEntries(columns.map((column) => [column.id, 0])),
        dat: 0,
        khongDat: 0
    };

    rows.forEach((row) => {
        totals.checkedQty += Number(row.checkedQty || 0);
        totals.defectQty += Number(row.defectQty || 0);
        totals.nhe += Number(row.nhe || 0);
        totals.nang += Number(row.nang || 0);
        totals.nghiemTrong += Number(row.nghiemTrong || 0);
        totals.dat += Number(row.dat || 0);
        totals.khongDat += Number(row.khongDat || 0);
        columns.forEach((column) => {
            totals.defectMap[column.id] += Number(row.defectMap?.[column.id] || 0);
        });
    });

    return totals;
};

const CUOI_CHUYEN_COMPLETED_BY_NAME_FIELD = "CuoiChuyen_CompletedByName";

const CuoiChuyenPrintTemplate = forwardRef(function CuoiChuyenPrintTemplate({
    phieu,
    plans = [],
    dynamicFields = [],
    xacNhans = []
}, ref) {
    const flatColumns = useMemo(() => buildDefectPrintColumns(plans), [plans]);
    const printRows = useMemo(() => buildPrintRows(plans, flatColumns), [plans, flatColumns]);
    const totals = useMemo(() => buildTotals(printRows, flatColumns), [printRows, flatColumns]);

    const firstPlan = plans?.[0] || {};
    const productName = firstPlan.TenSanPham || phieu?.TenSanPham || "";
    const itemCode = firstPlan.MaSanPham || phieu?.MaSanPham || "";
    const printDate = formatDate(firstPlan.NgayKeHoach || phieu?.NgayKiem || phieu?.CreatedAt);
    const qcSignerName =
        getFieldValue(dynamicFields, CUOI_CHUYEN_COMPLETED_BY_NAME_FIELD) ||
        phieu?.TenNguoiKiem ||
        "";
    const tbpApproval =
        (xacNhans || []).find((item) => String(item?.VaiTro || "").toUpperCase() === "TBP") ||
        (xacNhans || [])[0] ||
        null;
    const ttsxSignerName = getPersonDisplayName(tbpApproval);

    return (
        <div ref={ref} style={styles.page}>
            <style>
                {`
                @page {
                    size: A4 landscape;
                    margin: 8mm;
                }
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        background: #fff;
                    }
                    thead { display: table-header-group; }
                    tr { page-break-inside: avoid; break-inside: avoid; }
                }
                `}
            </style>

            <table style={styles.metaTable}>
                <tbody>
                    <tr>
                        <td style={{ ...styles.metaCell, width: "86px" }} rowSpan={2}>
                            <img src="/logo.png" alt="Logo Z76" style={{ width: "74px", display: "block", margin: "0 auto" }} />
                        </td>
                        <td style={styles.metaCell}>
                            <div style={styles.subTitle}>{FORM_META.companyName}</div>
                            <div style={styles.title}>{FORM_META.title}</div>
                        </td>
                        <td style={{ ...styles.metaCell, width: "180px", fontSize: "12px", lineHeight: 1.35 }}>
                            <div><strong>Mã số:</strong> {FORM_META.formCode}</div>
                            <div><strong>Ngày hiệu lực:</strong> {FORM_META.effectiveDate}</div>
                            <div><strong>Phiên bản:</strong> {FORM_META.version}</div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div style={styles.infoRow}>
                <div style={styles.infoField}>
                    <span style={styles.infoLabel}>Sản phẩm:</span>
                    <span style={styles.infoValue}>{productName}</span>
                </div>
                <div style={styles.infoField}>
                    <span style={styles.infoLabel}>Item code:</span>
                    <span style={styles.infoValue}>{itemCode}</span>
                </div>
                <div style={styles.infoField}>
                    <span style={styles.infoLabel}>Ngày:</span>
                    <span style={styles.infoValue}>{printDate}</span>
                </div>
            </div>

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th} rowSpan={3}>Sản phẩm</th>
                        <th style={styles.th} colSpan={flatColumns.length}>Dạng lỗi (Số lỗi)</th>
                        <th style={styles.th} colSpan={3}>Mức độ lỗi</th>
                        <th style={styles.th} colSpan={5}>Đơn vị sản phẩm</th>
                    </tr>
                    <tr>
                        <th style={styles.th} colSpan={flatColumns.length}>Tên lỗi xuất hiện</th>
                        <th style={styles.th} rowSpan={2}><span style={styles.verticalHeader}>Nhẹ</span></th>
                        <th style={styles.th} rowSpan={2}><span style={styles.verticalHeader}>Nặng</span></th>
                        <th style={styles.th} rowSpan={2}><span style={styles.verticalHeader}>NT</span></th>
                        <th style={styles.th} colSpan={3}>Tổng hợp</th>
                        <th style={styles.th} colSpan={2}>BC sửa lỗi</th>
                    </tr>
                    <tr>
                        {flatColumns.map((column) => (
                            <th key={column.id} style={styles.th}>
                                {renderMultiline(column.code ? `${column.code}\n${column.label}` : column.label)}
                            </th>
                        ))}
                        <th style={styles.th}>Tổng SP kiểm</th>
                        <th style={styles.th}>SP lỗi</th>
                        <th style={styles.th}>% chất lượng</th>
                        <th style={styles.th}>Sửa đạt</th>
                        <th style={styles.th}>Sửa ko đạt</th>
                    </tr>
                </thead>
                <tbody>
                    {printRows.length === 0 ? (
                        <tr>
                            <td style={{ ...styles.td, ...styles.center }} colSpan={9 + flatColumns.length}>
                                Chưa có dữ liệu kế hoạch.
                            </td>
                        </tr>
                    ) : printRows.map((row) => (
                        <tr key={row.key}>
                            <td style={{ ...styles.td, ...styles.rowTall }}>
                                <div style={{ fontWeight: 700 }}>{row.product || ""}</div>
                                {row.planInfo ? <div style={styles.small}>{row.planInfo}</div> : null}
                            </td>
                            {flatColumns.map((column) => (
                                <td key={`${row.key}-${column.id}`} style={{ ...styles.td, ...styles.center }}>
                                    {row.defectMap?.[column.id] || ""}
                                </td>
                            ))}
                            <td style={{ ...styles.td, ...styles.center }}>{row.nhe || ""}</td>
                            <td style={{ ...styles.td, ...styles.center }}>{row.nang || ""}</td>
                            <td style={{ ...styles.td, ...styles.center }}>{row.nghiemTrong || ""}</td>
                            <td style={{ ...styles.td, ...styles.center }}>{row.checkedQty || ""}</td>
                            <td style={{ ...styles.td, ...styles.center }}>{row.defectQty || ""}</td>
                            <td style={{ ...styles.td, ...styles.center }}>{formatQualityPercent(row.checkedQty, row.defectQty)}</td>
                            <td style={{ ...styles.td, ...styles.center }}>{row.dat || ""}</td>
                            <td style={{ ...styles.td, ...styles.center }}>{row.khongDat || ""}</td>
                        </tr>
                    ))}
                    <tr>
                        <td style={{ ...styles.td, fontWeight: 700 }}>Tổng</td>
                        {flatColumns.map((column) => (
                            <td key={`total-${column.id}`} style={{ ...styles.td, ...styles.center, fontWeight: 700 }}>
                                {totals.defectMap[column.id] || ""}
                            </td>
                        ))}
                        <td style={{ ...styles.td, ...styles.center, fontWeight: 700 }}>{totals.nhe || ""}</td>
                        <td style={{ ...styles.td, ...styles.center, fontWeight: 700 }}>{totals.nang || ""}</td>
                        <td style={{ ...styles.td, ...styles.center, fontWeight: 700 }}>{totals.nghiemTrong || ""}</td>
                        <td style={{ ...styles.td, ...styles.center, fontWeight: 700 }}>{totals.checkedQty || ""}</td>
                        <td style={{ ...styles.td, ...styles.center, fontWeight: 700 }}>{totals.defectQty || ""}</td>
                        <td style={{ ...styles.td, ...styles.center, fontWeight: 700 }}>{formatQualityPercent(totals.checkedQty, totals.defectQty)}</td>
                        <td style={{ ...styles.td, ...styles.center, fontWeight: 700 }}>{totals.dat || ""}</td>
                        <td style={{ ...styles.td, ...styles.center, fontWeight: 700 }}>{totals.khongDat || ""}</td>
                    </tr>
                </tbody>
            </table>

            <div style={styles.footerNote}>
                <div>
                    <strong>* Ghi chú:</strong> Báo cáo không được sửa chữa tẩy xóa, QC gạch chéo vào thông tin sai và ghi lại thông tin đúng ký tên bên cạnh.
                </div>
                <div>
                    Phiếu cuối chuyền ghi nhận lỗi trực tiếp theo từng kế hoạch/sản phẩm, không chia theo mốc giờ và công đoạn.
                </div>
            </div>

            <div style={styles.signatures}>
                <div style={styles.signatureBox}>
                    <div style={styles.signatureTitle}>QC</div>
                    <div style={styles.signatureSignedText}>
                        {qcSignerName ? <span style={styles.signatureStamp}>Đã ký</span> : null}
                    </div>
                    <div style={styles.signatureName}>{qcSignerName}</div>
                </div>
                <div style={styles.signatureBox}>
                    <div style={styles.signatureTitle}>PHÂN XƯỞNG</div>
                    <div style={styles.signatureSignedText}>
                        {ttsxSignerName ? <span style={styles.signatureStamp}>Đã ký</span> : null}
                    </div>
                    <div style={styles.signatureName}>{ttsxSignerName}</div>
                </div>
            </div>
        </div>
    );
});

export default CuoiChuyenPrintTemplate;
