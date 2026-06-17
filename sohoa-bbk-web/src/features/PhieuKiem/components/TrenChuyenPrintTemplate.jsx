import React, { forwardRef, useMemo } from "react";

const styles = {
    page: {
        width: "210mm",
        minHeight: "297mm",
        padding: "12mm",
        backgroundColor: "#fff",
        color: "#000",
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        boxSizing: "border-box"
    },
    title: {
        textAlign: "center",
        fontWeight: "bold",
        fontSize: "16px",
        marginBottom: "8px"
    },
    row: {
        display: "flex",
        gap: "12px",
        marginBottom: "6px",
        flexWrap: "wrap"
    },
    label: {
        fontWeight: "bold"
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        marginTop: "10px"
    },
    th: {
        border: "1px solid #000",
        padding: "5px",
        textAlign: "center",
        fontWeight: "bold"
    },
    td: {
        border: "1px solid #000",
        padding: "5px",
        verticalAlign: "top"
    },
    footer: {
        marginTop: "12px",
        display: "flex",
        justifyContent: "space-between"
    }
};

const getFieldValue = (dynamicFields = [], name) =>
    dynamicFields.find((field) => field?.FieldName === name)?.FieldValue ?? "";

const TrenChuyenPrintTemplate = forwardRef(function TrenChuyenPrintTemplate(
    { phieu, dynamicFields = [], slots = [], summary = null },
    ref
) {
    const rows = useMemo(() => {
        const output = [];
        slots.forEach((slot) => {
            const entries = Array.isArray(slot.Entries) ? slot.Entries : [];
            if (entries.length === 0) {
                output.push({
                    slotId: slot.Id,
                    gioKiem: slot.GioKiem,
                    congDoan: "",
                    defectsText: "",
                    ghiChu: ""
                });
                return;
            }

            entries.forEach((entry) => {
                const defectsText = (entry.Defects || [])
                    .map((defect) => {
                        const suffix = defect.GhiChu ? ` (${defect.GhiChu})` : "";
                        return `${defect.MaLoi || "---"} - ${defect.TenLoi || "---"}: ${defect.SoLuong}${suffix}`;
                    })
                    .join("; ");

                output.push({
                    slotId: slot.Id,
                    gioKiem: slot.GioKiem,
                    congDoan: entry.CongDoan,
                    defectsText,
                    ghiChu: entry.GhiChu || ""
                });
            });
        });
        return output;
    }, [slots]);

    return (
        <div ref={ref} style={styles.page}>
            <div style={styles.title}>PHIẾU THEO DÕI, KIỂM TRA CHẤT LƯỢNG MAY TRÊN CHUYỀN</div>

            <div style={styles.row}>
                <div><span style={styles.label}>Sản phẩm:</span> {getFieldValue(dynamicFields, "TrenChuyen_TenSanPham") || phieu?.TenSanPham || ""}</div>
                <div><span style={styles.label}>Item code:</span> {getFieldValue(dynamicFields, "TrenChuyen_MaSanPham") || phieu?.MaSanPham || ""}</div>
                <div><span style={styles.label}>Ngày:</span> {getFieldValue(dynamicFields, "TrenChuyen_NgayKeHoach") ? new Date(getFieldValue(dynamicFields, "TrenChuyen_NgayKeHoach")).toLocaleDateString("vi-VN") : ""}</div>
            </div>
            <div style={styles.row}>
                <div><span style={styles.label}>Phân xưởng:</span> {getFieldValue(dynamicFields, "TrenChuyen_TenDonVi") || phieu?.DoiTuong || ""}</div>
                <div><span style={styles.label}>Chuyền/Bộ phận:</span> {getFieldValue(dynamicFields, "TrenChuyen_TenBoPhan") || ""}</div>
                <div><span style={styles.label}>Số phiếu:</span> {phieu?.SoPhieu || ""}</div>
            </div>

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Khung giờ</th>
                        <th style={styles.th}>Công đoạn</th>
                        <th style={styles.th}>Lỗi ghi nhận</th>
                        <th style={styles.th}>Ghi chú</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={`${row.slotId}-${index}`}>
                            <td style={styles.td}>{row.gioKiem}</td>
                            <td style={styles.td}>{row.congDoan || "—"}</td>
                            <td style={styles.td}>{row.defectsText || "—"}</td>
                            <td style={styles.td}>{row.ghiChu || "—"}</td>
                        </tr>
                    ))}
                    {rows.length === 0 && (
                        <tr>
                            <td style={styles.td} colSpan={4}>Chưa có dữ liệu</td>
                        </tr>
                    )}
                </tbody>
            </table>

            <div style={styles.footer}>
                <div>
                    <div><span style={styles.label}>Tổng khung giờ:</span> {summary?.TotalSlots || 0}</div>
                    <div><span style={styles.label}>Tổng công đoạn:</span> {summary?.TotalEntries || 0}</div>
                    <div><span style={styles.label}>Dòng lỗi:</span> {summary?.TotalDefectRows || 0}</div>
                    <div><span style={styles.label}>Tổng số lỗi:</span> {summary?.TotalDefectQuantity || 0}</div>
                </div>
                <div>
                    <div>QC</div>
                    <div style={{ height: 48 }} />
                </div>
                <div>
                    <div>TTSX</div>
                    <div style={{ height: 48 }} />
                </div>
            </div>
        </div>
    );
});

export default TrenChuyenPrintTemplate;
