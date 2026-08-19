import { forwardRef, useMemo } from "react";
import PrintSignature from "../../../components/common/PrintSignature";

const FORM_META = {
    companyName: "CÔNG TY TNHH MỘT THÀNH VIÊN 76",
    formCode: "BM.03-QT.03-B8",
    effectiveDate: "01/08/2026",
    version: "00",
    title: "THEO DÕI KIỂM TRA, NGHIỆM THU - CÔNG ĐOẠN"
};

const ROWS_PER_PAGE = 20;
const PLACEHOLDER_DEFECT_LABELS = ["n", "n+1", "n+2", "n+n"];

const getFieldValue = (dynamicFields = [], name) =>
    dynamicFields.find((field) => field?.FieldName === name)?.FieldValue ?? "";

const text = (value) => value == null ? "" : String(value).trim();
const number = (value) => Number(value || 0);
const displayNumber = (value) => number(value) ? number(value).toLocaleString("vi-VN") : "";

const formatDate = (value) => {
    if (!value) return "";
    const raw = String(value).slice(0, 10);
    const date = new Date(`${raw}T00:00:00`);
    return Number.isNaN(date.getTime()) ? text(value) : date.toLocaleDateString("vi-VN");
};

const weekNumber = (value) => {
    if (!value) return "";
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    const firstDay = new Date(date.getFullYear(), 0, 1);
    return Math.ceil((((date - firstDay) / 86400000) + firstDay.getDay() + 1) / 7);
};

const getDefectKey = (defect = {}) =>
    text(defect.DefectId || defect.MaLoi || defect.TenLoi);

const buildDefectColumns = (defects = []) => {
    const columns = [];
    const seen = new Set();
    defects.forEach((defect) => {
        const id = getDefectKey(defect);
        if (!id || seen.has(id)) return;
        seen.add(id);
        columns.push({
            id,
            code: text(defect.MaLoi),
            name: text(defect.TenLoi),
            placeholder: false
        });
    });
    while (columns.length < PLACEHOLDER_DEFECT_LABELS.length) {
        const index = columns.length;
        columns.push({
            id: `placeholder-${index}`,
            code: PLACEHOLDER_DEFECT_LABELS[index],
            name: "",
            placeholder: true
        });
    }
    return columns;
};

const makeDefectMap = (columns, defects = []) => {
    const result = Object.fromEntries(columns.map((column) => [column.id, 0]));
    defects.forEach((defect) => {
        const key = getDefectKey(defect);
        if (key && Object.hasOwn(result, key)) result[key] += number(defect.SoLuong);
    });
    return result;
};

const uniqueText = (values = []) => [...new Set(values.map(text).filter(Boolean))];

const repairTotals = (defects = []) => defects.reduce((totals, defect) => ({
    passed: totals.passed + number(defect.SoLuongDatSauSua),
    failed: totals.failed + number(defect.SoLuongKhongDatSauSua)
}), { passed: 0, failed: 0 });

const defectTotal = (defects = []) => defects.reduce((sum, defect) => sum + number(defect.SoLuong), 0);

const buildCongDoanRows = ({ phieu, plans, columns }) => plans.flatMap((plan, planIndex) => {
    const lots = Array.isArray(plan?.Lots) ? plan.Lots : [];
    const unassigned = (plan?.Defects || []).filter((defect) => !defect.PlanLotId);
    const targets = lots.length ? [
        ...lots.map((lot) => ({
            lot,
            defects: (plan.Defects || []).filter((defect) => Number(defect.PlanLotId) === Number(lot.Id))
        })),
        ...(unassigned.length || number(plan.SoLoiBuiBan) || number(plan.SoLoiConTrung)
            ? [{ lot: null, defects: unassigned }]
            : [])
    ] : [{ lot: null, defects: plan.Defects || [] }];

    return targets.map(({ lot, defects }, targetIndex) => {
        const dirty = number(lot ? lot.SoLoiBuiBan : plan.SoLoiBuiBan);
        const insect = number(lot ? lot.SoLoiConTrung : plan.SoLoiConTrung);
        const repairs = repairTotals(defects);
        const checkedQty = number(lot?.SoLuong ?? plan.SoLuongHieuLuc ?? plan.SoLuongKeHoach);
        const totalDefects = defectTotal(defects) + dirty + insect;
        return {
            key: `cong-doan-${plan.Id || planIndex}-${lot?.Id || targetIndex}`,
            date: formatDate(plan.NgayKeHoach || phieu?.NgayKiem),
            inspector: text(plan.TenNguoiGhiNhan || phieu?.TenNguoiKiem),
            worker: uniqueText(defects.map((defect) => defect.TenCongNhan)).join(", "),
            product: [text(plan.MaSanPham || plan.ItemCode), text(plan.TenSanPham)].filter(Boolean).join(" - "),
            order: text(plan.MaDonHang || plan.Ma_DonHang),
            process: text(plan.Ten_QuyTrinhSanXuat || plan.TenQuyTrinhSanXuat),
            lot: text(lot?.Lot ?? plan.Lot),
            materialOrder: text(lot?.LenhXuatVatTu ?? plan.LenhXuatVatTu),
            checkedQty,
            defectQty: totalDefects,
            defectMap: makeDefectMap(columns, defects),
            dirty,
            insect,
            repairedPass: repairs.passed,
            repairedFail: repairs.failed,
            note: uniqueText([...defects.map((defect) => defect.GhiChu), plan.GhiChu]).join("; ")
        };
    });
});

const buildTrenChuyenRows = ({ phieu, slots, dynamicFields, columns }) => slots.flatMap((slot, slotIndex) =>
    (slot?.Entries || []).map((entry, entryIndex) => {
        const defects = entry.Defects || [];
        const repairs = repairTotals(defects);
        return {
            key: `tren-chuyen-${slot.Id || slotIndex}-${entry.Id || entryIndex}`,
            date: formatDate(getFieldValue(dynamicFields, "TrenChuyen_NgayKeHoach") || phieu?.NgayKiem),
            inspector: text(entry.TenNguoiGhiNhan || phieu?.TenNguoiKiem),
            worker: text(entry.TenCongNhanGayLoi),
            product: [
                getFieldValue(dynamicFields, "TrenChuyen_MaSanPham") || phieu?.MaSanPham,
                getFieldValue(dynamicFields, "TrenChuyen_TenSanPham") || phieu?.TenSanPham
            ].map(text).filter(Boolean).join(" - "),
            order: text(getFieldValue(dynamicFields, "TrenChuyen_MaDonHang")),
            process: text(entry.CongDoan),
            lot: text(getFieldValue(dynamicFields, "TrenChuyen_Lot")),
            materialOrder: text(getFieldValue(dynamicFields, "TrenChuyen_LenhXuatVatTu")),
            checkedQty: number(entry.SoLuongKiem),
            defectQty: defectTotal(defects) + number(entry.SoLoiBuiBan) + number(entry.SoLoiConTrung),
            defectMap: makeDefectMap(columns, defects),
            dirty: number(entry.SoLoiBuiBan),
            insect: number(entry.SoLoiConTrung),
            repairedPass: repairs.passed,
            repairedFail: repairs.failed,
            note: [`Giờ kiểm: ${text(slot.GioKiem)}`, text(entry.GhiChu)].filter((item) => item && item !== "Giờ kiểm: ").join("; ")
        };
    })
);

const buildCuoiChuyenRows = ({ phieu, plans, columns, dynamicFields }) => plans.map((plan, index) => {
    const defects = plan.Defects || [];
    const repairs = repairTotals(defects);
    const checkedQty = number(plan.SoLuongHieuLuc ?? plan.SoLuongThucTe ?? plan.DaSanXuat ?? plan.SoLuongKeHoach);
    return {
        key: `cuoi-chuyen-${plan.Id || index}`,
        date: formatDate(plan.NgayKeHoach || phieu?.NgayKiem),
        inspector: text(getFieldValue(dynamicFields, "CuoiChuyen_CompletedByName") || phieu?.TenNguoiKiem),
        worker: uniqueText(defects.map((defect) => defect.TenCongNhan)).join(", "),
        product: [text(plan.MaSanPham), text(plan.TenSanPham)].filter(Boolean).join(" - "),
        order: text(plan.MaDonHang || plan.Ma_DonHang),
        process: text(plan.Ten_QuyTrinhSanXuat || plan.TenQuyTrinhSanXuat),
        lot: text(plan.Lot),
        materialOrder: text(plan.LenhXuatVatTu),
        checkedQty,
        defectQty: defectTotal(defects) + number(plan.SoLoiBuiBan) + number(plan.SoLoiConTrung),
        defectMap: makeDefectMap(columns, defects),
        dirty: number(plan.SoLoiBuiBan),
        insect: number(plan.SoLoiConTrung),
        repairedPass: repairs.passed,
        repairedFail: repairs.failed,
        note: uniqueText([...defects.map((defect) => defect.GhiChu), plan.GhiChu]).join("; ")
    };
});

const getPersonName = (value = {}) => text(
    value.TenNguoiXacNhan || value.HoTen || value.TenNhanVien || value.FullName || value.Username
);
const toSigner = (value = {}, fallbackName = "") => ({
    name: getPersonName(value) || text(fallbackName),
    signedAt: value.ThoiGian || value.ConfirmedAt || null,
    signatureDataUrl: value.SignatureDataUrl || null
});

const signerByRole = (xacNhans = [], roles = []) => {
    const allowed = roles.map((role) => role.toUpperCase());
    const signer = [...xacNhans].reverse().find((item) => allowed.includes(text(item.VaiTro).toUpperCase()));
    return signer ? toSigner(signer) : null;
};

const buildPrintData = ({ kind, phieu = {}, plans = [], slots = [], dynamicFields = [], xacNhans = [] }) => {
    const allDefects = kind === "tren-chuyen"
        ? slots.flatMap((slot) => (slot?.Entries || []).flatMap((entry) => entry.Defects || []))
        : plans.flatMap((plan) => plan.Defects || []);
    const columns = buildDefectColumns(allDefects);
    let rows = [];
    let workshop = text(phieu.PhanXuong);
    let team = text(phieu.ToMay);
    let date = phieu.NgayKiem;
    let qcSigner = { name: text(phieu.TenNguoiKiem), signatureDataUrl: null, signedAt: null };
    let ttsxSigner = null;

    if (kind === "cong-doan") {
        rows = buildCongDoanRows({ phieu, plans, columns });
        ttsxSigner = signerByRole(xacNhans, ["TBP_CONG_DOAN", "TBP"]);
        qcSigner = signerByRole(xacNhans, ["KCS_CONG_DOAN"]) || qcSigner;
    } else if (kind === "tren-chuyen") {
        rows = buildTrenChuyenRows({ phieu, slots, dynamicFields, columns });
        workshop = workshop || text(getFieldValue(dynamicFields, "TrenChuyen_TenDonVi") || phieu.DoiTuong);
        team = team || text(getFieldValue(dynamicFields, "TrenChuyen_TenBoPhan"));
        date = getFieldValue(dynamicFields, "TrenChuyen_NgayKeHoach") || date;
        qcSigner = {
            name: text(getFieldValue(dynamicFields, "TrenChuyen_CompletedByName")) || qcSigner.name,
            signatureDataUrl: getFieldValue(dynamicFields, "TrenChuyen_CompletedByUserIdSignatureDataUrl") || null,
            signedAt: getFieldValue(dynamicFields, "TrenChuyen_CompletedAt") || null
        };
        ttsxSigner = signerByRole(xacNhans, ["TBP"]);
    } else {
        rows = buildCuoiChuyenRows({ phieu, plans, columns, dynamicFields });
        workshop = workshop || text(plans[0]?.TenDonVi || phieu.DoiTuong);
        team = team || text(plans[0]?.TenBoPhan);
        date = plans[0]?.NgayKeHoach || date;
        qcSigner = {
            name: text(getFieldValue(dynamicFields, "CuoiChuyen_CompletedByName")) || qcSigner.name,
            signatureDataUrl: getFieldValue(dynamicFields, "CuoiChuyen_CompletedByUserIdSignatureDataUrl") || null,
            signedAt: getFieldValue(dynamicFields, "CuoiChuyen_CompletedAt") || null
        };
        ttsxSigner = signerByRole(xacNhans, ["TBP"])
            || (xacNhans[0] ? toSigner(xacNhans[0]) : null)
            || { name: text(getFieldValue(dynamicFields, "CuoiChuyen_ApprovedByName")), signatureDataUrl: null };
    }

    const pages = [];
    const sourceRows = rows.length ? rows : [];
    const pageCount = Math.max(1, Math.ceil(sourceRows.length / ROWS_PER_PAGE));
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        const pageRows = sourceRows.slice(pageIndex * ROWS_PER_PAGE, (pageIndex + 1) * ROWS_PER_PAGE);
        while (pageRows.length < ROWS_PER_PAGE) {
            pageRows.push({ key: `blank-${pageIndex}-${pageRows.length}`, blank: true, defectMap: {} });
        }
        pages.push(pageRows);
    }

    return { columns, pages, workshop, team, week: weekNumber(date), qcSigner, ttsxSigner };
};

const cellStyle = {
    border: "1px solid #000",
    padding: "1.5px 2px",
    textAlign: "center",
    verticalAlign: "middle",
    lineHeight: 1.05,
    overflowWrap: "anywhere"
};

const Header = ({ workshop, team, week }) => (
    <>
        <table className="unified-meta-table">
            <tbody>
                <tr>
                    <td rowSpan={3} style={{ ...cellStyle, width: "16%" }}>
                        <img src="/logo.png" alt="Công ty 76" className="unified-logo" />
                    </td>
                    <td style={{ ...cellStyle, fontSize: 11 }}>{FORM_META.companyName}</td>
                    <td style={{ ...cellStyle, width: "23%", textAlign: "left", paddingLeft: 6 }}>
                        Mã số: {FORM_META.formCode}
                    </td>
                </tr>
                <tr>
                    <td rowSpan={2} style={{ ...cellStyle, fontWeight: 700, fontSize: 15 }}>
                        {FORM_META.title}
                    </td>
                    <td style={{ ...cellStyle, textAlign: "left", paddingLeft: 6 }}>
                        Ngày hiệu lực: {FORM_META.effectiveDate}
                    </td>
                </tr>
                <tr>
                    <td style={{ ...cellStyle, textAlign: "left", paddingLeft: 6 }}>Phiên bản: {FORM_META.version}</td>
                </tr>
            </tbody>
        </table>
        <div className="unified-info-row">
            <div><strong>Phân xưởng:</strong> {workshop}</div>
            <div><strong>Tổ/máy:</strong> {team}</div>
            <div><strong>Tuần:</strong> {week}</div>
        </div>
    </>
);

const Signature = ({ title, signer }) => (
    <PrintSignature
        title={title}
        name={signer?.name || ""}
        signedAt={signer?.signedAt || null}
        signatureDataUrl={signer?.signatureDataUrl || null}
        imageHeight={42}
        style={{ minHeight: 64, fontSize: 10 }}
        titleStyle={{ fontSize: 11 }}
    />
);

const CUOI_CHUYEN_META = {
    companyName: "CÔNG TY TNHH MTV 76",
    formCode: "BM.03.17-QT.03-B8",
    effectiveDate: "01/07/2026",
    version: "00",
    title: "THEO DÕI KIỂM TRA CHẤT LƯỢNG MAY CUỐI CHUYỀN"
};
const CUOI_CHUYEN_ROWS_PER_PAGE = 15;
const CUOI_CHUYEN_DEFECTS_PER_PAGE = 15;

const defectSeverity = (defect) => {
    const type = text(defect?.DefectType).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    if (type.includes("MINOR") || type.includes("NHE")) return "minor";
    if (type.includes("CRITICAL") || type.includes("NGHIEM")) return "critical";
    return "major";
};

const buildCuoiChuyenOfficialPages = ({ phieu = {}, plans = [], dynamicFields = [], xacNhans = [] }) => {
    const signerData = buildPrintData({ kind: "cuoi-chuyen", phieu, plans, dynamicFields, xacNhans });
    const isTimeMode = text(getFieldValue(dynamicFields, "CuoiChuyenTimeDataVersion")) === "1";
    const groups = [];
    const groupMap = new Map();
    plans.forEach((plan, planIndex) => {
        const productKey = text(plan.MaSanPham || plan.TenSanPham) || `plan-${plan.Id || planIndex}`;
        if (!groupMap.has(productKey)) {
            const group = { key: productKey, plans: [] };
            groupMap.set(productKey, group);
            groups.push(group);
        }
        groupMap.get(productKey).plans.push(plan);
    });
    if (!groups.length) groups.push({ key: "empty", plans: [] });

    return groups.flatMap((group) => {
        const defects = group.plans.flatMap((plan) => {
            const slots = Array.isArray(plan.TimeSlots) ? plan.TimeSlots : [];
            return slots.length ? slots.flatMap((slot) => slot.Defects || []) : (plan.Defects || []);
        });
        const columns = [];
        const seen = new Set();
        defects.forEach((defect) => {
            const id = getDefectKey(defect);
            if (!id || seen.has(id)) return;
            seen.add(id);
            columns.push({ id, code: text(defect.MaLoi), name: text(defect.TenLoi), placeholder: false });
        });
        if (!columns.length) columns.push({ id: "placeholder-0", code: "", name: "", placeholder: true });
        const columnChunks = [];
        for (let index = 0; index < columns.length; index += CUOI_CHUYEN_DEFECTS_PER_PAGE) {
            const chunk = columns.slice(index, index + CUOI_CHUYEN_DEFECTS_PER_PAGE);
            while (chunk.length < CUOI_CHUYEN_DEFECTS_PER_PAGE) {
                chunk.push({ id: `placeholder-${index}-${chunk.length}`, code: "", name: "", placeholder: true });
            }
            columnChunks.push(chunk);
        }

        const rows = group.plans.flatMap((plan, planIndex) => {
            const slots = Array.isArray(plan.TimeSlots) ? plan.TimeSlots : [];
            const sources = slots.length ? slots : (isTimeMode ? [] : [{ legacy: true, Defects: plan.Defects || [] }]);
            return sources.map((slot, slotIndex) => {
                const rowDefects = slot.Defects || [];
                const severity = { minor: 0, major: 0, critical: 0 };
                rowDefects.forEach((defect) => { severity[defectSeverity(defect)] += number(defect.SoLuong); });
                const repairs = repairTotals(rowDefects);
                const checkedQty = slot.legacy
                    ? number(plan.SoLuongHieuLuc ?? plan.SoLuongThucTe ?? plan.DaSanXuat ?? plan.SoLuongKeHoach)
                    : number(slot.SoLuongKiem);
                return {
                    key: `${plan.Id || planIndex}-${slot.Id || slotIndex}`,
                    date: formatDate(plan.NgayKeHoach || phieu.NgayKiem),
                    materialOrder: text(plan.LenhXuatVatTu),
                    time: slot.legacy || slot.IsLegacy || !slot.GioKiem
                        ? "" : `${text(slot.GioKiem) < "12:00" ? "S" : "C"} ${text(slot.GioKiem)}`,
                    checkedQty,
                    defectQty: defectTotal(rowDefects) + number(slot.legacy ? plan.SoLoiBuiBan : slot.SoLoiBuiBan)
                        + number(slot.legacy ? plan.SoLoiConTrung : slot.SoLoiConTrung),
                    severity,
                    defects: rowDefects,
                    repairedPass: repairs.passed,
                    repairedFail: repairs.failed
                };
            });
        }).sort((a, b) => a.date.localeCompare(b.date) || a.materialOrder.localeCompare(b.materialOrder)
            || a.time.localeCompare(b.time));
        const rowChunks = [];
        const sourceRows = rows.length ? rows : [];
        const rowPageCount = Math.max(1, Math.ceil(sourceRows.length / CUOI_CHUYEN_ROWS_PER_PAGE));
        for (let pageIndex = 0; pageIndex < rowPageCount; pageIndex += 1) {
            const chunk = sourceRows.slice(pageIndex * CUOI_CHUYEN_ROWS_PER_PAGE, (pageIndex + 1) * CUOI_CHUYEN_ROWS_PER_PAGE);
            while (chunk.length < CUOI_CHUYEN_ROWS_PER_PAGE) chunk.push({ key: `blank-${pageIndex}-${chunk.length}`, blank: true, defects: [] });
            rowChunks.push(chunk);
        }
        const firstPlan = group.plans[0] || {};
        return rowChunks.flatMap((pageRows, rowPageIndex) => columnChunks.map((pageColumns, columnPageIndex) => ({
            key: `${group.key}-${rowPageIndex}-${columnPageIndex}`,
            rows: pageRows,
            columns: pageColumns,
            workshop: uniqueText(group.plans.map((plan) => plan.TenDonVi)).join(", ") || text(phieu.PhanXuong || phieu.DoiTuong),
            team: uniqueText(group.plans.map((plan) => plan.TenBoPhan)).join(", ") || text(phieu.ToMay),
            week: weekNumber(firstPlan.NgayKeHoach || phieu.NgayKiem),
            product: [text(firstPlan.MaSanPham), text(firstPlan.TenSanPham)].filter(Boolean).join(" - "),
            qcSigner: ["CHO_TBP_DUYET", "HOAN_TAT"].includes(text(phieu.TrangThai)) ? signerData.qcSigner : null,
            ttsxSigner: text(phieu.TrangThai) === "HOAN_TAT" ? signerData.ttsxSigner : null
        })));
    });
};

const CuoiChuyenOfficialPrint = ({ printRef, phieu, plans, dynamicFields, xacNhans }) => {
    const pages = useMemo(
        () => buildCuoiChuyenOfficialPages({ phieu, plans, dynamicFields, xacNhans }),
        [phieu, plans, dynamicFields, xacNhans]
    );
    return (
        <div ref={printRef} className="cc-official-root">
            <style>{`
                @page { size: A4 landscape; margin: 0; }
                .cc-official-root { background:#fff; color:#000; font-family:"Times New Roman",serif; }
                .cc-official-page { width:297mm; min-height:210mm; padding:6mm 7mm; box-sizing:border-box; background:#fff; }
                .cc-official-table { width:100%; border-collapse:collapse; table-layout:fixed; }
                .cc-official-table th,.cc-official-table td { border:1px solid #000; padding:1px; text-align:center; vertical-align:middle; line-height:1.05; }
                .cc-official-row { height:8.2mm; }
                .cc-official-vertical { writing-mode:vertical-rl; transform:rotate(180deg); white-space:nowrap; }
                .cc-official-info { display:grid; grid-template-columns:1fr 1fr .45fr; gap:12px; font-size:9px; min-height:7mm; align-items:center; }
                .cc-official-product { text-align:center; font-weight:700; font-size:11px; min-height:6mm; }
                .cc-official-note { margin:2mm 10mm 0; font-size:7px; line-height:1.25; font-weight:700; font-style:italic; }
                @media print {
                    html,body { margin:0!important; padding:0!important; background:#fff!important; }
                    .cc-official-page { break-after:page; page-break-after:always; }
                    .cc-official-page:last-child { break-after:auto; page-break-after:auto; }
                }
            `}</style>
            {pages.map((page) => (
                <section className="cc-official-page" key={page.key}>
                    <table className="cc-official-table" style={{ fontSize: 7 }}>
                        <tbody>
                            <tr>
                                <td rowSpan={3} style={{ width: "14%" }}><img src="/logo.png" alt="Công ty 76" style={{ width: "82%", maxHeight: 58, objectFit: "contain" }} /></td>
                                <td style={{ fontSize: 11 }}>{CUOI_CHUYEN_META.companyName}</td>
                                <td style={{ width: "24%", textAlign: "left", paddingLeft: 5 }}>Mã số: {CUOI_CHUYEN_META.formCode}</td>
                            </tr>
                            <tr>
                                <td rowSpan={2} style={{ fontWeight: 700, fontSize: 15 }}>{CUOI_CHUYEN_META.title}</td>
                                <td style={{ textAlign: "left", paddingLeft: 5 }}>Ngày hiệu lực: {CUOI_CHUYEN_META.effectiveDate}</td>
                            </tr>
                            <tr><td style={{ textAlign: "left", paddingLeft: 5 }}>Phiên bản: {CUOI_CHUYEN_META.version}</td></tr>
                        </tbody>
                    </table>
                    <div className="cc-official-info">
                        <div><strong>Phân xưởng:</strong> {page.workshop}</div>
                        <div><strong>Tổ:</strong> {page.team}</div>
                        <div><strong>Tuần:</strong> {page.week}</div>
                    </div>
                    <div className="cc-official-product">Sản phẩm: {page.product}</div>
                    <table className="cc-official-table" style={{ fontSize: 6.3 }}>
                        <colgroup>
                            <col style={{ width: "5%" }} /><col style={{ width: "7%" }} /><col style={{ width: "5%" }} />
                            <col style={{ width: "4%" }} /><col style={{ width: "3%" }} /><col style={{ width: "3%" }} />
                            {[0, 1, 2].map((value) => <col key={`severity-${value}`} style={{ width: "2%" }} />)}
                            {page.columns.map((column) => <col key={`column-${column.id}`} style={{ width: "3%" }} />)}
                            <col style={{ width: "4%" }} /><col style={{ width: "4%" }} />
                            <col style={{ width: "7%" }} /><col style={{ width: "7%" }} />
                        </colgroup>
                        <thead>
                            <tr style={{ height: 12 }}>
                                <th rowSpan={2}>Ngày</th><th rowSpan={2}>Lệnh<br/>xuất VT</th><th rowSpan={2}>Thời gian<br/>S/C</th>
                                <th rowSpan={2}>Tổng<br/>SL kiểm</th><th rowSpan={2}>SL lỗi</th><th rowSpan={2}>% lỗi</th>
                                <th colSpan={3}>Mức độ lỗi</th><th colSpan={15}>Dạng lỗi (Số lỗi)</th>
                                <th colSpan={2}>Báo cáo sửa lỗi</th><th colSpan={2}>Ký xác nhận</th>
                            </tr>
                            <tr style={{ height: 36 }}>
                                <th><span className="cc-official-vertical">Nhẹ</span></th>
                                <th><span className="cc-official-vertical">Nặng</span></th>
                                <th><span className="cc-official-vertical">Nghiêm trọng</span></th>
                                {page.columns.map((column) => <th key={column.id} title={column.name}>{column.code || column.name}</th>)}
                                <th>SL<br/>đạt</th><th>SL<br/>không đạt</th><th>QC</th><th>TTSX</th>
                            </tr>
                        </thead>
                        <tbody>
                            {page.rows.map((row, rowIndex) => {
                                const defectMap = makeDefectMap(page.columns, row.defects || []);
                                return <tr className="cc-official-row" key={row.key}>
                                    <td>{row.date || ""}</td><td>{row.materialOrder || ""}</td><td>{row.time || ""}</td>
                                    <td>{displayNumber(row.checkedQty)}</td><td>{displayNumber(row.defectQty)}</td>
                                    <td>{number(row.checkedQty) ? `${(number(row.defectQty) * 100 / number(row.checkedQty)).toFixed(2)}%` : ""}</td>
                                    <td>{displayNumber(row.severity?.minor)}</td><td>{displayNumber(row.severity?.major)}</td><td>{displayNumber(row.severity?.critical)}</td>
                                    {page.columns.map((column) => <td key={`${row.key}-${column.id}`}>{displayNumber(defectMap[column.id])}</td>)}
                                    <td>{displayNumber(row.repairedPass)}</td><td>{displayNumber(row.repairedFail)}</td>
                                    {rowIndex === 0 && <>
                                        <td rowSpan={CUOI_CHUYEN_ROWS_PER_PAGE}>
                                            <PrintSignature name={page.qcSigner?.name || ""} signatureDataUrl={page.qcSigner?.signatureDataUrl || null} imageHeight={34} style={{ fontSize: 6.5 }} />
                                        </td>
                                        <td rowSpan={CUOI_CHUYEN_ROWS_PER_PAGE}>
                                            <PrintSignature name={page.ttsxSigner?.name || ""} signatureDataUrl={page.ttsxSigner?.signatureDataUrl || null} imageHeight={34} style={{ fontSize: 6.5 }} />
                                        </td>
                                    </>}
                                </tr>;
                            })}
                        </tbody>
                    </table>
                    <div className="cc-official-note">
                        <div>* Ghi chú: Báo cáo không được sửa chữa tẩy xóa, QC gạch chéo vào thông tin sai và ghi lại thông tin đúng và ký tên bên cạnh.</div>
                        <div>Trường hợp phát sinh dạng lỗi không có sẵn trong báo cáo: QC ghi thêm dạng lỗi vào chỗ trống các ô và gạch bỏ dạng lỗi không xảy ra tại thời điểm đó.</div>
                        <div>Hình thông tin truy xuất lỗi với A-C có danh sách phụ lục kèm theo.</div>
                    </div>
                </section>
            ))}
        </div>
    );
};

const UnifiedInspectionPrintTemplate = forwardRef(function UnifiedInspectionPrintTemplate({
    kind,
    phieu,
    plans = [],
    slots = [],
    dynamicFields = [],
    xacNhans = []
}, ref) {
    const data = useMemo(
        () => buildPrintData({ kind, phieu, plans, slots, dynamicFields, xacNhans }),
        [kind, phieu, plans, slots, dynamicFields, xacNhans]
    );
    if (kind === "cuoi-chuyen") {
        return <CuoiChuyenOfficialPrint printRef={ref} phieu={phieu} plans={plans} dynamicFields={dynamicFields} xacNhans={xacNhans} />;
    }
    const totalColumns = 16 + data.columns.length;
    const fontSize = totalColumns > 24 ? 5.5 : totalColumns > 20 ? 6.3 : 7.2;

    return (
        <div ref={ref} className="unified-print-root">
            <style>{`
                @page { size: A4 landscape; margin: 0; }
                .unified-print-root { background: #fff; color: #000; font-family: "Times New Roman", serif; }
                .unified-print-page { width: 297mm; min-height: 210mm; padding: 5mm 6mm; box-sizing: border-box; background: #fff; }
                .unified-meta-table, .unified-data-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                .unified-logo { width: 90%; max-height: 62px; object-fit: contain; display: block; margin: 0 auto; }
                .unified-info-row { display: grid; grid-template-columns: 1.25fr 1.25fr .5fr; gap: 12px; min-height: 27px; align-items: center; font-size: 10px; }
                .unified-data-row { height: 18px; }
                .unified-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-top: 8px; }
                .unified-signature { min-height: 64px; text-align: center; font-size: 10px; }
                .unified-signature-title { font-weight: 700; font-size: 11px; }
                .unified-signature-mark { height: 34px; display: flex; align-items: center; justify-content: center; }
                .unified-signature-mark span { display: inline-block; padding: 4px 10px; border: 2px solid #f05a5a; color: #f05a5a; font-weight: 700; font-size: 12px; border-radius: 4px; transform: rotate(-7deg); }
                .unified-signature-name { min-height: 15px; font-weight: 700; }
                @media print {
                    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
                    .unified-print-page { break-after: page; page-break-after: always; }
                    .unified-print-page:last-child { break-after: auto; page-break-after: auto; }
                    .unified-data-row { break-inside: avoid; page-break-inside: avoid; }
                }
            `}</style>
            {data.pages.map((rows, pageIndex) => (
                <section className="unified-print-page" key={`page-${pageIndex}`}>
                    <Header workshop={data.workshop} team={data.team} week={data.week} />
                    <table className="unified-data-table" style={{ fontSize }}>
                        <thead>
                            <tr style={{ height: 28 }}>
                                <th rowSpan={2} style={cellStyle}>Ngày</th>
                                <th rowSpan={2} style={cellStyle}>KCS</th>
                                <th rowSpan={2} style={cellStyle}>Công nhân</th>
                                <th rowSpan={2} style={cellStyle}>Sản phẩm</th>
                                <th rowSpan={2} style={cellStyle}>Mã đơn hàng</th>
                                <th rowSpan={2} style={cellStyle}>Công đoạn</th>
                                <th rowSpan={2} style={cellStyle}>Lô (LOT)</th>
                                <th rowSpan={2} style={cellStyle}>Lệnh xuất VT</th>
                                <th rowSpan={2} style={cellStyle}>Số lượng kiểm</th>
                                <th rowSpan={2} style={cellStyle}>Số lượng lỗi</th>
                                <th rowSpan={2} style={cellStyle}>Tỷ lệ lỗi</th>
                                <th colSpan={data.columns.length + 2} style={cellStyle}>Các dạng lỗi (Ngân hàng lỗi)</th>
                                <th colSpan={2} style={cellStyle}>Báo cáo sửa lỗi</th>
                                <th rowSpan={2} style={cellStyle}>Ghi chú</th>
                            </tr>
                            <tr style={{ height: 30 }}>
                                {data.columns.map((column) => (
                                    <th key={column.id} style={cellStyle} title={column.name}>
                                        <div style={{ fontWeight: 700 }}>{column.code || column.name}</div>
                                        {column.code && column.name ? <div style={{ fontSize: "0.82em", fontWeight: 400 }}>{column.name}</div> : null}
                                    </th>
                                ))}
                                <th style={cellStyle}>Bụi bẩn</th>
                                <th style={cellStyle}>Côn trùng</th>
                                <th style={cellStyle}>Đạt</th>
                                <th style={cellStyle}>Kđạt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const ratio = number(row.checkedQty) > 0
                                    ? `${(number(row.defectQty) * 100 / number(row.checkedQty)).toFixed(2)}%`
                                    : "";
                                return (
                                    <tr className="unified-data-row" key={row.key}>
                                        <td style={cellStyle}>{row.date || ""}</td>
                                        <td style={cellStyle}>{row.inspector || ""}</td>
                                        <td style={cellStyle}>{row.worker || ""}</td>
                                        <td style={cellStyle}>{row.product || ""}</td>
                                        <td style={cellStyle}>{row.order || ""}</td>
                                        <td style={cellStyle}>{row.process || ""}</td>
                                        <td style={cellStyle}>{row.lot || ""}</td>
                                        <td style={cellStyle}>{row.materialOrder || ""}</td>
                                        <td style={cellStyle}>{displayNumber(row.checkedQty)}</td>
                                        <td style={cellStyle}>{displayNumber(row.defectQty)}</td>
                                        <td style={cellStyle}>{ratio}</td>
                                        {data.columns.map((column) => (
                                            <td key={`${row.key}-${column.id}`} style={cellStyle}>
                                                {displayNumber(row.defectMap?.[column.id])}
                                            </td>
                                        ))}
                                        <td style={cellStyle}>{displayNumber(row.dirty)}</td>
                                        <td style={cellStyle}>{displayNumber(row.insect)}</td>
                                        <td style={cellStyle}>{displayNumber(row.repairedPass)}</td>
                                        <td style={cellStyle}>{displayNumber(row.repairedFail)}</td>
                                        <td style={cellStyle}>{row.note || ""}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="unified-signatures">
                        <Signature title="QC" signer={data.qcSigner} />
                        <Signature title="TTSX" signer={data.ttsxSigner} />
                    </div>
                </section>
            ))}
        </div>
    );
});

export default UnifiedInspectionPrintTemplate;
