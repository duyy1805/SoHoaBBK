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

const border = { border: "1px solid #000" };
const th = { ...border, padding: "1px", textAlign: "center", verticalAlign: "middle", fontWeight: 700, lineHeight: 1.05, overflowWrap: "anywhere" };
const td = { ...border, padding: "1px 2px", textAlign: "center", verticalAlign: "middle", height: "5mm", lineHeight: 1.05, overflowWrap: "anywhere" };
const vertical = { writingMode: "vertical-rl", transform: "rotate(180deg)", height: "23mm", display: "inline-flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap" };

function Header({ workshop, team, week, date, product, pageNote }) {
    return <>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 8 }}>
            <tbody>
                <tr>
                    <td rowSpan={3} style={{ ...th, width: "16%" }}><img src="/logo.png" alt="Z76" style={{ width: "86%", maxHeight: 54, objectFit: "contain", display: "block", margin: "0 auto" }} /></td>
                    <td style={{ ...th, fontSize: 11, fontWeight: 400 }}>CÔNG TY TNHH MTV 76</td>
                    <td style={{ ...th, width: "23%", textAlign: "left", paddingLeft: 6 }}>Mã số: {FORM.code}</td>
                </tr>
                <tr>
                    <td rowSpan={2} style={{ ...th, fontWeight: 700, fontSize: 15 }}>{FORM.title}</td>
                    <td style={{ ...th, textAlign: "left", paddingLeft: 6 }}>Ngày hiệu lực: {FORM.effectiveDate}</td>
                </tr>
                <tr><td style={{ ...th, textAlign: "left", paddingLeft: 6 }}>Phiên bản: {FORM.version}</td></tr>
            </tbody>
        </table>
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr .75fr .45fr .7fr", gap: 12, minHeight: "7mm", alignItems: "center", fontSize: 9 }}>
            <div>Phân xưởng: <b>{workshop}</b></div><div>Tổ: <b>{team}</b></div><div>Tuần: <b>{week}</b></div><div>Ngày: <b>{date}</b></div>
        </div>
        <div style={{ textAlign: "center", fontWeight: 700, fontSize: 11, minHeight: "6mm" }}>Sản phẩm: {product}{pageNote ? ` — ${pageNote}` : ""}</div>
    </>;
}

function InspectionTable({ rows, columns }) {
    const paddedColumns = [...columns];
    while (paddedColumns.length < DEFECTS_PER_PAGE) paddedColumns.push({ id: `blank-${paddedColumns.length}`, label: "", code: "" });
    const paddedRows = [...rows];
    while (paddedRows.length < ROWS_PER_PAGE) paddedRows.push({ key: `blank-row-${paddedRows.length}`, blank: true, severity: {}, defectMap: {} });
    const dateSpans = paddedRows.map((row, index) => {
        if (row.blank) return 1;
        const groupKey = `${row.date || ""}|${row.time || ""}`;
        const previous = paddedRows[index - 1];
        if (previous && !previous.blank && `${previous.date || ""}|${previous.time || ""}` === groupKey) return 0;
        let span = 1;
        while (index + span < paddedRows.length) {
            const next = paddedRows[index + span];
            if (next.blank || `${next.date || ""}|${next.time || ""}` !== groupKey) break;
            span += 1;
        }
        return span;
    });
    return <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 6.5 }}>
        <colgroup>
            <col style={{ width: "5%" }} /><col style={{ width: "10%" }} /><col style={{ width: "4%" }} />
            <col style={{ width: "3.2%" }} /><col style={{ width: "3.2%" }} /><col style={{ width: "3.5%" }} /><col style={{ width: "4%" }} />
            <col style={{ width: "2%" }} /><col style={{ width: "2%" }} /><col style={{ width: "2%" }} />
            <col style={{ width: "3.5%" }} /><col style={{ width: "3.5%" }} /><col style={{ width: "3.5%" }} />
            {paddedColumns.map((column) => <col key={`col-${column.id}`} style={{ width: "3.3%" }} />)}
            <col style={{ width: "4%" }} /><col style={{ width: "4%" }} />
        </colgroup>
        <thead>
            <tr>
                <th style={th} rowSpan={2}>Ngày</th><th style={th} rowSpan={2}>Công nhân/BTP</th><th style={th} rowSpan={2}>Lô</th>
                <th style={th} rowSpan={2}>SL lỗi</th><th style={th} rowSpan={2}>SL kiểm</th><th style={th} rowSpan={2}>Tổng SL</th><th style={th} rowSpan={2}>Kết luận</th>
                <th style={th} colSpan={3}>Mức độ lỗi</th><th style={th} colSpan={3}>Kiểm soát</th><th style={th} colSpan={DEFECTS_PER_PAGE}>Dạng lỗi (Số lỗi)</th>
                <th style={th} colSpan={2}>Báo cáo sửa lỗi</th>
            </tr>
            <tr>
                <th style={th}><span style={vertical}>Nhẹ</span></th><th style={th}><span style={vertical}>Nặng</span></th><th style={th}><span style={vertical}>Nghiêm trọng</span></th>
                <th style={th}><span style={vertical}>Vật tư đầu vào</span></th><th style={th}><span style={vertical}>Tài liệu</span></th><th style={th}><span style={vertical}>Thiết bị</span></th>
                {paddedColumns.map((column) => <th key={column.id} style={th}><span style={vertical}>{[column.code, column.label].filter(Boolean).join(" - ")}</span></th>)}
                <th style={th}>SL đạt</th><th style={th}>SL không đạt</th>
            </tr>
        </thead>
        <tbody>{paddedRows.map((row, rowIndex) => <tr key={row.key}>
            {dateSpans[rowIndex] > 0 && <td rowSpan={dateSpans[rowIndex]} style={td}><div>{row.date || ""}</div><div>{row.time || ""}</div></td>}
            <td style={{ ...td, textAlign: "left", paddingLeft: 2 }}><div style={{ fontWeight: 700 }}>{row.worker || ""}</div><div>{row.process ? `CĐ: ${row.process}` : ""}</div></td>
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
        <div style={{ margin: "2mm 10mm 0", fontSize: 7, lineHeight: 1.22, fontWeight: 700, fontStyle: "italic" }}>
            <div><b>* Ghi chú:</b> Báo cáo không được sửa chữa, tẩy xóa; QC gạch chéo vào thông tin sai, ghi lại thông tin đúng và ký tên bên cạnh.</div>
            <div>- QC ghi tổng số lượng với trường hợp bị ít chiếc và không cộng vào tổng cuối giờ hoặc cuối ca kiểm số lượng nhập.</div>
            <div>- Khi kiểm tra lỗi sửa không đạt, QC khoanh tròn lỗi đó (không cộng lỗi khoanh tròn), cho sửa và kiểm tra lại; nếu không đạt thì lập biên bản.</div>
            <div>- Nếu phát sinh dạng lỗi chưa có: QC ghi thêm vào cột trống và gạch bỏ dạng lỗi không xảy ra; ô có hai dạng lỗi thì gạch bỏ dạng không xảy ra.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: 4, fontSize: 10, textAlign: "center" }}>
            {[["QC", qc], ["TTSX", ttsx]].map(([title, signer]) => <div key={title} style={{ minHeight: 58 }}>
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

    return <div ref={ref} className="tren-chuyen-signature-root">
        <style>{`@page{size:A4 landscape;margin:0}.tren-chuyen-signature-root{background:#fff;color:#000;font-family:"Times New Roman",serif}.tren-chuyen-signature-page{width:297mm;min-height:210mm;padding:5mm 6mm;box-sizing:border-box;background:#fff}@media print{html,body{margin:0!important;padding:0!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.tren-chuyen-signature-page{break-after:page;page-break-after:always}.tren-chuyen-signature-page:last-child{break-after:auto;page-break-after:auto}tr{break-inside:avoid;page-break-inside:avoid}}`}</style>
        {pages.map((page, index) => <section className="tren-chuyen-signature-page" key={`${page.rowPageIndex}-${page.columnPageIndex}`}>
            <Header
                workshop={phieu.PhanXuong || phieu.Ten_BoPhan || getFieldValue(fields, "TrenChuyen_PhanXuong")}
                team={phieu.ToMay || getFieldValue(fields, "TrenChuyen_To")}
                week={weekNumber(dateValue)} date={formatDate(dateValue)} product={product}
                pageNote={pages.length > 1 ? `Trang ${index + 1}/${pages.length} · Nhóm lỗi ${page.columnPageIndex + 1}/${columnPages.length}` : ""}
            />
            <InspectionTable rows={page.pageRows} columns={page.pageColumns} />
            <Footer qc={qc} ttsx={ttsx} />
        </section>)}
    </div>;
});

export default TrenChuyenSignaturePrintTemplate;
