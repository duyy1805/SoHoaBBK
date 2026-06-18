import React, { forwardRef, useMemo } from "react";

const FORM_META = {
    companyName: "CÔNG TY TNHH MTV 76",
    formCode: "BM.03.2-HD.12-QT.03-B8",
    effectiveDate: "22/06/2026",
    version: "01",
    title: "THEO DÕI, KIỂM TRA CHẤT LƯỢNG TRÊN CHUYỀN"
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
        marginTop: "12px",
        fontSize: "12px"
    },
    signatureBox: {
        textAlign: "center"
    },
    signatureSpace: {
        height: "54px"
    }
};

const getFieldValue = (dynamicFields = [], name) =>
    dynamicFields.find((field) => field?.FieldName === name)?.FieldValue ?? "";

const normalizeText = (value) =>
    String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toUpperCase();

const buildDefectPrintColumns = (slots = []) => {
    const orderedColumns = [];
    const seen = new Set();

    slots.forEach((slot) => {
        (slot?.Entries || []).forEach((entry) => {
            (entry?.Defects || []).forEach((defect) => {
                const key = String(defect?.DefectId || defect?.MaLoi || defect?.TenLoi || "").trim();
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

const buildPrintRows = (slots = [], columns = []) => {
    const rows = [];
    slots.forEach((slot) => {
        const entries = Array.isArray(slot?.Entries) ? slot.Entries : [];
        if (entries.length === 0) {
            rows.push({
                key: `slot-${slot?.Id || slot?.GioKiem}`,
                gioKiem: slot?.GioKiem || "",
                congDoan: "",
                nguoiGhiNhan: "",
                btpLoi: 0,
                btpKiem: "",
                tongSoLuong: "",
                nhe: 0,
                nang: 0,
                nghiemTrong: 0,
                defectMap: Object.fromEntries(columns.map((column) => [column.id, 0])),
                dat: "",
                khongDat: ""
            });
            return;
        }

        entries.forEach((entry, entryIndex) => {
            const defectMap = Object.fromEntries(columns.map((column) => [column.id, 0]));
            let totalDefectQty = 0;
            let minor = 0;
            let major = 0;
            let critical = 0;

            (entry.Defects || []).forEach((defect) => {
                const qty = Number(defect?.SoLuong || 0);
                if (!qty) return;
                totalDefectQty += qty;

                const defectType = normalizeText(defect?.DefectType);
                if (defectType.includes("MINOR")) minor += qty;
                else if (defectType.includes("CRITICAL")) critical += qty;
                else major += qty;

                const columnId = columns.find(
                    (column) => !column.isPlaceholder && String(column.id) === String(defect?.DefectId || defect?.MaLoi || defect?.TenLoi || "")
                )?.id;
                if (columnId) defectMap[columnId] = (defectMap[columnId] || 0) + qty;
            });

            rows.push({
                key: `${slot?.Id || slot?.GioKiem}-${entry?.Id || entryIndex}`,
                gioKiem: entryIndex === 0 ? slot?.GioKiem || "" : "",
                congDoan: entry?.CongDoan || "",
                nguoiGhiNhan: entry?.TenNguoiGhiNhan || "",
                btpLoi: totalDefectQty,
                btpKiem: "",
                tongSoLuong: "",
                nhe: minor,
                nang: major,
                nghiemTrong: critical,
                defectMap,
                dat: "",
                khongDat: ""
            });
        });
    });
    return rows;
};

const buildTotals = (rows = [], columns = []) => {
    const totals = {
        btpLoi: 0,
        btpKiem: "",
        tongSoLuong: "",
        nhe: 0,
        nang: 0,
        nghiemTrong: 0,
        defectMap: Object.fromEntries(columns.map((column) => [column.id, 0])),
        dat: "",
        khongDat: ""
    };

    rows.forEach((row) => {
        totals.btpLoi += Number(row.btpLoi || 0);
        totals.nhe += Number(row.nhe || 0);
        totals.nang += Number(row.nang || 0);
        totals.nghiemTrong += Number(row.nghiemTrong || 0);
        columns.forEach((column) => {
            totals.defectMap[column.id] += Number(row.defectMap?.[column.id] || 0);
        });
    });

    return totals;
};

const renderMultiline = (value) =>
    String(value || "")
        .split("\n")
        .map((line, index) => <div key={`${line}-${index}`}>{line}</div>);

const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("vi-VN");
};

const TrenChuyenPrintTemplate = forwardRef(function TrenChuyenPrintTemplate(
    { phieu, dynamicFields = [], slots = [], summary = null },
    ref
) {
    const flatColumns = useMemo(() => buildDefectPrintColumns(slots), [slots]);
    const printRows = useMemo(() => buildPrintRows(slots, flatColumns), [slots, flatColumns]);
    const totals = useMemo(() => buildTotals(printRows, flatColumns), [printRows, flatColumns]);

    const productName = getFieldValue(dynamicFields, "TrenChuyen_TenSanPham") || phieu?.TenSanPham || "";
    const itemCode = getFieldValue(dynamicFields, "TrenChuyen_MaSanPham") || phieu?.MaSanPham || "";
    const printDate = formatDate(getFieldValue(dynamicFields, "TrenChuyen_NgayKeHoach"));

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
                        <th style={styles.th} rowSpan={3}>Giờ</th>
                        <th style={styles.th} rowSpan={3}>CD/CN</th>
                        <th style={styles.th} rowSpan={3}>{renderMultiline("BTP lỗi/\nBTP kiểm/\nTổng số lượng")}</th>
                        <th style={styles.th} colSpan={3}>Mức độ lỗi</th>
                        <th style={styles.th} colSpan={flatColumns.length}>Dạng lỗi (Số lỗi)</th>
                        <th style={styles.th} colSpan={2}>Báo cáo sửa lỗi</th>
                    </tr>
                    <tr>
                        <th style={styles.th} rowSpan={2}><span style={styles.verticalHeader}>Nhẹ</span></th>
                        <th style={styles.th} rowSpan={2}><span style={styles.verticalHeader}>Nặng</span></th>
                        <th style={styles.th} rowSpan={2}><span style={styles.verticalHeader}>Nghiêm trọng</span></th>
                        <th style={styles.th} colSpan={flatColumns.length}>Tên lỗi xuất hiện</th>
                        <th style={styles.th} rowSpan={2}>Đạt</th>
                        <th style={styles.th} rowSpan={2}>Không đạt</th>
                    </tr>
                    <tr>
                        {flatColumns.map((column) => (
                            <th key={column.id} style={styles.th}>
                                {renderMultiline(column.code ? `${column.code}\n${column.label}` : column.label)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {printRows.length === 0 ? (
                        <tr>
                            <td style={{ ...styles.td, ...styles.center }} colSpan={8 + flatColumns.length}>
                                Chưa có dữ liệu ghi nhận.
                            </td>
                        </tr>
                    ) : printRows.map((row) => (
                        <tr key={row.key}>
                            <td style={{ ...styles.td, ...styles.center, ...styles.rowTall }}>{row.gioKiem || ""}</td>
                            <td style={styles.td}>
                                <div style={{ fontWeight: 700 }}>{row.congDoan || ""}</div>
                                {row.nguoiGhiNhan ? (
                                    <div style={styles.small}>{row.nguoiGhiNhan}</div>
                                ) : null}
                            </td>
                            <td style={{ ...styles.td, ...styles.center }}>
                                {row.btpLoi ? row.btpLoi : ""}
                                {row.btpKiem || row.tongSoLuong ? ` / ${row.btpKiem || ""}${row.tongSoLuong ? ` / ${row.tongSoLuong}` : ""}` : ""}
                            </td>
                            <td style={{ ...styles.td, ...styles.center }}>{row.nhe || ""}</td>
                            <td style={{ ...styles.td, ...styles.center }}>{row.nang || ""}</td>
                            <td style={{ ...styles.td, ...styles.center }}>{row.nghiemTrong || ""}</td>
                            {flatColumns.map((column) => (
                                <td key={`${row.key}-${column.id}`} style={{ ...styles.td, ...styles.center }}>
                                    {row.defectMap?.[column.id] || ""}
                                </td>
                            ))}
                            <td style={{ ...styles.td, ...styles.center }}>{row.dat || ""}</td>
                            <td style={{ ...styles.td, ...styles.center }}>{row.khongDat || ""}</td>
                        </tr>
                    ))}
                    <tr>
                        <td style={{ ...styles.td, fontWeight: 700 }} colSpan={2}>Tổng</td>
                        <td style={{ ...styles.td, ...styles.center, fontWeight: 700 }}>{totals.btpLoi || ""}</td>
                        <td style={{ ...styles.td, ...styles.center, fontWeight: 700 }}>{totals.nhe || ""}</td>
                        <td style={{ ...styles.td, ...styles.center, fontWeight: 700 }}>{totals.nang || ""}</td>
                        <td style={{ ...styles.td, ...styles.center, fontWeight: 700 }}>{totals.nghiemTrong || ""}</td>
                        {flatColumns.map((column) => (
                            <td key={`total-${column.id}`} style={{ ...styles.td, ...styles.center, fontWeight: 700 }}>
                                {totals.defectMap[column.id] || ""}
                            </td>
                        ))}
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
                    Trường hợp phát sinh dạng lỗi không có sẵn trong biểu mẫu, hệ thống tự dồn vào cột “Khác” để không mất dữ liệu khi xem in.
                </div>
            </div>

            <div style={styles.signatures}>
                <div style={styles.signatureBox}>
                    <div style={{ fontWeight: 700 }}>QC</div>
                    <div style={styles.signatureSpace} />
                </div>
                <div style={styles.signatureBox}>
                    <div style={{ fontWeight: 700 }}>TTSX</div>
                    <div style={styles.signatureSpace} />
                </div>
            </div>
        </div>
    );
});

export default TrenChuyenPrintTemplate;
