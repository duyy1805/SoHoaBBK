import React, { forwardRef, useMemo } from "react";
import { PrintSignatureImage } from "../../../components/common/PrintSignature";

const FORM = {
    code: "BM.03.16-QT.03-B8",
    effectiveDate: "01/07/2026",
    version: "00",
    title: "THEO DÕI KIỂM TRA CHẤT LƯỢNG MAY TRÊN CHUYỀN"
};
const DEFECTS_PER_PAGE = 12;
const ROWS_PER_PAGE = 20;

const getFieldValue = (fields, name) => fields.find((field) => field?.FieldName === name)?.FieldValue ?? "";
const number = (value) => Number(value || 0);
const printableNumber = (value) => value === null || value === undefined || value === "" ? "" : value;
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[_-]+/g, " ").toUpperCase();
const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("vi-VN");
};
const weekNumber = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    return Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
};
const shiftLabel = (hour) => `${String(hour || "").slice(0, 2) < "12" ? "S" : "C"} – ${hour || ""}`;
const chunks = (values, size) => {
    if (!values.length) return [[]];
    return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
};

const buildDefectColumns = (slots) => {
    const result = [];
    const seen = new Set();
    let hasDirty = false;
    let hasInsect = false;
    slots.forEach((slot) => (slot.Entries || []).forEach((entry) => {
        hasDirty ||= number(entry.SoLoiBuiBan) > 0;
        hasInsect ||= number(entry.SoLoiConTrung) > 0;
        (entry.Defects || []).forEach((defect) => {
            const id = `defect-${defect.DefectId || defect.MaLoi || defect.TenLoi}`;
            if (seen.has(id)) return;
            seen.add(id);
            result.push({ id, label: defect.TenLoi || defect.MaLoi || "Lỗi", code: defect.MaLoi || "" });
        });
    }));
    if (hasDirty) result.push({ id: "special-dirty", label: "Bụi bẩn", code: "" });
    if (hasInsect) result.push({ id: "special-insect", label: "Côn trùng", code: "" });
    return result;
};

const severityTotals = (defects) => defects.reduce((totals, defect) => {
    const type = normalize(defect.DefectType);
    if (type.includes("MINOR") || type.includes("NHE")) totals.minor += number(defect.SoLuong);
    else if (type.includes("CRITICAL") || type.includes("NGHIEM TRONG")) totals.critical += number(defect.SoLuong);
    else totals.major += number(defect.SoLuong);
    return totals;
}, { minor: 0, major: 0, critical: 0 });

const buildRows = (slots, fields, phieu) => {
    const date = getFieldValue(fields, "TrenChuyen_NgayKeHoach") || phieu?.NgayKiem;
    const lot = getFieldValue(fields, "TrenChuyen_Lot");
    return slots.flatMap((slot, slotIndex) => (slot.Entries || []).map((entry, entryIndex) => {
        const defects = entry.Defects || [];
        const defectMap = {};
        defects.forEach((defect) => {
            const id = `defect-${defect.DefectId || defect.MaLoi || defect.TenLoi}`;
            defectMap[id] = number(defectMap[id]) + number(defect.SoLuong);
        });
        defectMap["special-dirty"] = number(entry.SoLoiBuiBan);
        defectMap["special-insect"] = number(entry.SoLoiConTrung);
        const repairPass = defects.reduce((sum, defect) => sum + number(defect.SoLuongDatSauSua), 0);
        const repairFail = defects.reduce((sum, defect) => sum + number(defect.SoLuongKhongDatSauSua), 0);
        return {
            key: `${slot.Id || slotIndex}-${entry.Id || entryIndex}`,
            date: formatDate(date),
            time: shiftLabel(slot.GioKiem),
            worker: entry.TenCongNhanGayLoi || "",
            process: entry.CongDoan || "",
            lot: entry.Lot || lot,
            checked: printableNumber(entry.SoLuongKiem),
            total: printableNumber(entry.TongSoLuong),
            defectTotal: defects.reduce((sum, defect) => sum + number(defect.SoLuong), number(entry.SoLoiBuiBan) + number(entry.SoLoiConTrung)),
            conclusion: entry.KetLuan === "DAT" ? "Đạt" : entry.KetLuan === "KHONG_DAT" ? "K.đạt" : "",
            material: entry.VatTuDauVaoStatus || "",
            document: entry.TaiLieuStatus || "",
            equipment: entry.ThietBiStatus || "",
            severity: severityTotals(defects),
            defectMap,
            repairPass: repairPass || "",
            repairFail: repairFail || ""
        };
    }));
};

const border = { border: "0.6px solid #000" };
const th = { ...border, padding: "2px 1px", textAlign: "center", verticalAlign: "middle", fontWeight: 700, lineHeight: 1.05 };
const td = { ...border, padding: "1px", textAlign: "center", verticalAlign: "middle", height: "4.7mm", lineHeight: 1.02 };
const vertical = { writingMode: "vertical-rl", transform: "rotate(180deg)", height: "24mm", display: "inline-flex", alignItems: "center", justifyContent: "center" };

function Header({ workshop, team, week, date, product, pageNote }) {
    return <>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <tbody><tr>
                <td style={{ ...border, width: "21%", textAlign: "center", padding: 3 }}><img src="/logo.png" alt="Z76" style={{ height: 45, maxWidth: "90%", objectFit: "contain" }} /></td>
                <td style={{ ...border, width: "59%", textAlign: "center", padding: 3 }}>
                    <div style={{ fontSize: 11 }}>CÔNG TY TNHH MTV 76</div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginTop: 5 }}>{FORM.title}</div>
                </td>
                <td style={{ ...border, width: "20%", fontSize: 9, lineHeight: 1.35, padding: 4 }}>
                    <div>Mã số: {FORM.code}</div><div>Ngày hiệu lực: {FORM.effectiveDate}</div><div>Phiên bản: {FORM.version}</div>
                </td>
            </tr></tbody>
        </table>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr .65fr .55fr .65fr", gap: 8, margin: "4px 0 2px", fontSize: 10 }}>
            <div>Phân xưởng: <b>{workshop}</b></div><div>Tổ: <b>{team}</b></div><div>Tuần: <b>{week}</b></div><div>Ngày: <b>{date}</b></div>
        </div>
        <div style={{ textAlign: "center", fontSize: 10, marginBottom: 4 }}>Sản phẩm: <b>{product}</b>{pageNote ? ` — ${pageNote}` : ""}</div>
    </>;
}

function InspectionTable({ rows, columns }) {
    const paddedColumns = [...columns];
    while (paddedColumns.length < DEFECTS_PER_PAGE) paddedColumns.push({ id: `blank-${paddedColumns.length}`, label: "", code: "" });
    const paddedRows = [...rows];
    while (paddedRows.length < ROWS_PER_PAGE) paddedRows.push({ key: `blank-row-${paddedRows.length}`, severity: {}, defectMap: {} });
    return <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 6.7 }}>
        <colgroup>
            <col style={{ width: "14mm" }} /><col style={{ width: "28mm" }} /><col style={{ width: "10mm" }} />
            <col style={{ width: "9mm" }} /><col style={{ width: "9mm" }} /><col style={{ width: "10mm" }} /><col style={{ width: "11mm" }} />
            <col style={{ width: "6mm" }} /><col style={{ width: "6mm" }} /><col style={{ width: "6mm" }} />
            <col style={{ width: "10mm" }} /><col style={{ width: "9mm" }} /><col style={{ width: "8mm" }} />
            {paddedColumns.map((column) => <col key={`col-${column.id}`} style={{ width: "8.7mm" }} />)}
            <col style={{ width: "7mm" }} /><col style={{ width: "8mm" }} />
        </colgroup>
        <thead>
            <tr>
                <th style={th} rowSpan={3}>Ngày</th><th style={th} rowSpan={3}>Công nhân/BTP</th><th style={th} rowSpan={3}>Lô</th>
                <th style={th} rowSpan={3}>SL lỗi</th><th style={th} rowSpan={3}>SL kiểm</th><th style={th} rowSpan={3}>Tổng SL</th><th style={th} rowSpan={3}>Kết luận</th>
                <th style={th} colSpan={3}>Mức độ lỗi</th><th style={th} colSpan={3}>Kiểm soát</th><th style={th} colSpan={DEFECTS_PER_PAGE}>Dạng lỗi (Số lỗi)</th>
                <th style={th} colSpan={2}>Báo cáo sửa lỗi</th>
            </tr>
            <tr>
                <th style={th} rowSpan={2}><span style={vertical}>Nhẹ</span></th><th style={th} rowSpan={2}><span style={vertical}>Nặng</span></th><th style={th} rowSpan={2}><span style={vertical}>Nghiêm trọng</span></th>
                <th style={th} rowSpan={2}><span style={vertical}>Vật tư đầu vào</span></th><th style={th} rowSpan={2}><span style={vertical}>Tài liệu</span></th><th style={th} rowSpan={2}><span style={vertical}>Thiết bị</span></th>
                {paddedColumns.map((column) => <th key={column.id} style={th} rowSpan={2}><span style={vertical}>{[column.code, column.label].filter(Boolean).join(" - ")}</span></th>)}
                <th style={th} rowSpan={2}>SL đạt</th><th style={th} rowSpan={2}>SL không đạt</th>
            </tr><tr />
        </thead>
        <tbody>{paddedRows.map((row) => <tr key={row.key}>
            <td style={td}><div>{row.date || ""}</div><div>{row.time || ""}</div></td>
            <td style={{ ...td, textAlign: "left", paddingLeft: 2 }}><div style={{ fontWeight: 700 }}>{row.worker || ""}</div><div>{row.process || ""}</div></td>
            <td style={td}>{row.lot || ""}</td><td style={td}>{printableNumber(row.defectTotal)}</td><td style={td}>{printableNumber(row.checked)}</td><td style={td}>{printableNumber(row.total)}</td><td style={td}>{row.conclusion || ""}</td>
            <td style={td}>{row.severity?.minor || ""}</td><td style={td}>{row.severity?.major || ""}</td><td style={td}>{row.severity?.critical || ""}</td>
            <td style={td}>{row.material || ""}</td><td style={td}>{row.document || ""}</td><td style={td}>{row.equipment || ""}</td>
            {paddedColumns.map((column) => <td key={`${row.key}-${column.id}`} style={td}>{row.defectMap?.[column.id] || ""}</td>)}
            <td style={td}>{row.repairPass || ""}</td><td style={td}>{row.repairFail || ""}</td>
        </tr>)}</tbody>
    </table>;
}

function Footer({ qc, ttsx }) {
    return <>
        <div style={{ marginTop: 4, fontSize: 7.4, lineHeight: 1.18, fontStyle: "italic" }}>
            <div><b>* Ghi chú:</b> Báo cáo không được sửa chữa, tẩy xóa; QC gạch chéo vào thông tin sai, ghi lại thông tin đúng và ký tên bên cạnh.</div>
            <div>- QC ghi tổng số lượng với trường hợp bị ít chiếc và không cộng vào tổng cuối giờ hoặc cuối ca kiểm số lượng nhập.</div>
            <div>- Khi kiểm tra lỗi sửa không đạt, QC khoanh tròn lỗi đó (không cộng lỗi khoanh tròn), cho sửa và kiểm tra lại; nếu không đạt thì lập biên bản.</div>
            <div>- Nếu phát sinh dạng lỗi chưa có: QC ghi thêm vào cột trống và gạch bỏ dạng lỗi không xảy ra; ô có hai dạng lỗi thì gạch bỏ dạng không xảy ra.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: 5, fontSize: 10, textAlign: "center" }}>
            {[["QC", qc], ["TTSX", ttsx]].map(([title, signer]) => <div key={title} style={{ minHeight: 63 }}>
                <div style={{ fontWeight: 700 }}>{title}</div>
                <PrintSignatureImage src={signer.signature} height={36} />
                <div style={{ fontWeight: 700 }}>{signer.name}</div>
            </div>)}
        </div>
    </>;
}

const TrenChuyenSignaturePrintTemplate = forwardRef(function TrenChuyenSignaturePrintTemplate({ phieu = {}, slots = [], dynamicFields = [], xacNhans = [] }, ref) {
    const fields = dynamicFields;
    const allColumns = useMemo(() => buildDefectColumns(slots), [slots]);
    const allRows = useMemo(() => buildRows(slots, fields, phieu), [slots, fields, phieu]);
    const columnPages = chunks(allColumns, DEFECTS_PER_PAGE);
    const rowPages = chunks(allRows, ROWS_PER_PAGE);
    const dateValue = getFieldValue(fields, "TrenChuyen_NgayKeHoach") || phieu.NgayKiem;
    const product = [getFieldValue(fields, "TrenChuyen_MaSanPham") || phieu.MaSanPham, getFieldValue(fields, "TrenChuyen_TenSanPham") || phieu.TenSanPham].filter(Boolean).join(" - ");
    const tbp = [...xacNhans].reverse().find((item) => normalize(item.VaiTro) === "TBP") || {};
    const qc = { name: getFieldValue(fields, "TrenChuyen_CompletedByName") || phieu.TenNguoiKiem || "", signature: getFieldValue(fields, "TrenChuyen_CompletedByUserIdSignatureDataUrl") || null };
    const ttsx = { name: tbp.TenNguoiXacNhan || "", signature: tbp.SignatureDataUrl || null };
    const pages = rowPages.flatMap((pageRows, rowPageIndex) => columnPages.map((pageColumns, columnPageIndex) => ({ pageRows, pageColumns, rowPageIndex, columnPageIndex })));

    return <div ref={ref}>
        <style>{`@page{size:A4 landscape;margin:6mm}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.tren-chuyen-signature-page{break-after:page;page-break-after:always}.tren-chuyen-signature-page:last-child{break-after:auto;page-break-after:auto}}`}</style>
        {pages.map((page, index) => <div className="tren-chuyen-signature-page" key={`${page.rowPageIndex}-${page.columnPageIndex}`} style={{ width: "285mm", minHeight: "198mm", boxSizing: "border-box", background: "#fff", color: "#000", fontFamily: '"Times New Roman", serif' }}>
            <Header
                workshop={phieu.PhanXuong || phieu.Ten_BoPhan || getFieldValue(fields, "TrenChuyen_PhanXuong")}
                team={phieu.ToMay || getFieldValue(fields, "TrenChuyen_To")}
                week={weekNumber(dateValue)} date={formatDate(dateValue)} product={product}
                pageNote={pages.length > 1 ? `Trang ${index + 1}/${pages.length} · Nhóm lỗi ${page.columnPageIndex + 1}/${columnPages.length}` : ""}
            />
            <InspectionTable rows={page.pageRows} columns={page.pageColumns} />
            <Footer qc={qc} ttsx={ttsx} />
        </div>)}
    </div>;
});

export default TrenChuyenSignaturePrintTemplate;
