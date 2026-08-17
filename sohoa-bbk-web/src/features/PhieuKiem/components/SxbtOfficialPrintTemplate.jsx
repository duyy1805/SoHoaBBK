import React from "react";
import PrintSignature from "../../../components/common/PrintSignature";

const checkbox = (checked) => (
    <span style={{
        width: 13,
        height: 13,
        border: "1px solid #000",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1
    }}>
        {checked ? "✓" : ""}
    </span>
);

const filledLot = (row = {}) => [
    row.DauTuanGS1,
    row.ThuTu,
    row.LxvtLot,
    row.SoLotSX,
    row.SoLuongNhap,
    row.SoLuongKhoXacNhan
].some((value) => value !== null && value !== undefined && value !== "");

const lotRowsOf = (item = {}) => {
    if (Array.isArray(item.LotRows) && item.LotRows.length) return item.LotRows;
    const fallback = {
        Id: item.BtpLotRowId,
        DauTuanGS1: item.DauTuanGS1,
        ThuTu: item.ThuTu,
        LxvtLot: item.LxvtLot,
        SoLotSX: item.SoLotSX,
        SoLuongNhap: item.SoLuongNhap ?? item.SoLuong,
        SoLuongKhoXacNhan: item.SoLuongKhoXacNhan
    };
    return filledLot(fallback) ? [fallback] : [{}];
};

const uniqueText = (values) => [...new Set(values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean))].join(", ");

const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("vi-VN");
};

const formatSignatureDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `Ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`;
};

const formatQuantity = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toLocaleString("vi-VN") : String(value);
};

const formatRate = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "";
    return parsed.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
};

const normalizeConclusion = (value) => {
    if (value === "DAT") return "ĐẠT";
    if (value === "KHONG_DAT") return "KHÔNG ĐẠT";
    return value || "";
};

const isCritical = (defect = {}) => ["CRITICAL", "NGHIÊM TRỌNG"].includes(
    String(defect.DefectType || "").trim().toUpperCase()
);

const styles = {
    root: {
        background: "#e5e7eb",
        padding: 24,
        color: "#000",
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: "9pt"
    },
    page: {
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto 20px",
        padding: "7mm 9mm",
        boxSizing: "border-box",
        background: "#fff",
        boxShadow: "0 8px 24px rgba(0,0,0,.16)"
    },
    table: { width: "100%", borderCollapse: "collapse", marginBottom: 5 },
    th: {
        border: "1px solid #000",
        padding: "2px 3px",
        textAlign: "center",
        verticalAlign: "middle",
        fontWeight: 700,
        fontSize: "8.5pt"
    },
    td: {
        border: "1px solid #000",
        padding: "2px 3px",
        verticalAlign: "middle",
        fontSize: "8.5pt"
    },
    center: {
        border: "1px solid #000",
        padding: "2px 3px",
        textAlign: "center",
        verticalAlign: "middle",
        fontSize: "8.5pt"
    },
    section: { fontWeight: 700, margin: "4px 0 2px", fontSize: "9pt" },
    dotted: { borderBottom: "1px dotted #000", display: "inline-block", minWidth: 90 }
};

export const SxbtOfficialPrintTemplate = React.forwardRef(({
    phieu = {},
    btpItems = [],
    summary = null,
    defects = [],
    dynamicFields = []
}, ref) => {
    const dynVal = (name) => dynamicFields.find((field) => field.FieldName === name)?.FieldValue ?? "";
    const groups = Array.from(btpItems.reduce((map, item) => {
        const itemCode = String(item.ItemCode || item.MaSanPham || phieu.MaSanPham || "CHUA_CO_ITEMCODE").trim();
        if (!map.has(itemCode)) map.set(itemCode, { itemCode, items: [] });
        map.get(itemCode).items.push(item);
        return map;
    }, new Map()).values());

    if (!groups.length) {
        groups.push({
            itemCode: phieu.MaSanPham || "CHUA_CO_ITEMCODE",
            items: [{
                Id: null,
                ItemCode: phieu.MaSanPham,
                TenSanPham: phieu.TenSanPham,
                MaDonHang: phieu.MaDonHang,
                MaSo_KhachHang: phieu.MaSo_KhachHang,
                NgayNhap: phieu.NgayNhap,
                SoLuongNhap: phieu.SoLuong
            }]
        });
    }

    const unassignedDefects = defects.filter((defect) => !defect.BtpItemId);
    const signatureSlots = [
        {
            key: "SXBT",
            title: "BỘ PHẬN SXBT",
            userName: dynVal("SxbtConfirmedByName"),
            date: dynVal("SxbtConfirmedAt"),
            signatureDataUrl: dynVal("SxbtConfirmedBySignatureDataUrl") || null
        },
        {
            key: "KHO",
            title: "BỘ PHẬN KHO",
            userName: dynVal("SxbtKhoConfirmedByName"),
            date: dynVal("SxbtKhoConfirmedAt"),
            signatureDataUrl: dynVal("SxbtKhoConfirmedBySignatureDataUrl") || null
        },
        {
            key: "KCS",
            title: "KCS",
            userName: dynVal("SxbtKcsCompletedByName") || phieu.TenNguoiKiem || "",
            date: dynVal("SxbtKcsCompletedAt") || phieu.NgayKiem,
            signatureDataUrl: dynVal("SxbtKcsCompletedBySignatureDataUrl") || null
        }
    ];

    const minRows = (current, minimum, columns, keyPrefix) => Array.from({
        length: Math.max(0, minimum - current)
    }).map((_, index) => (
        <tr key={`${keyPrefix}-${index}`}>
            {Array.from({ length: columns }).map((__, columnIndex) => (
                <td key={columnIndex} style={{ ...styles.td, height: 17 }} />
            ))}
        </tr>
    ));

    return (
        <div ref={ref} style={styles.root} className="sxbt-official-preview">
            <style>{`
                @page { size: A4 portrait; margin: 7mm 9mm; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
                    .sxbt-official-preview { padding: 0 !important; background: transparent !important; }
                    .sxbt-official-page {
                        width: 100% !important;
                        min-height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        break-after: page;
                        page-break-after: always;
                    }
                    .sxbt-official-page:last-child { break-after: auto; page-break-after: auto; }
                    .sxbt-official-avoid { break-inside: avoid; page-break-inside: avoid; }
                    thead { display: table-header-group; }
                    tr { break-inside: avoid; page-break-inside: avoid; }
                }
            `}</style>

            {groups.map((group, groupIndex) => {
                const itemIds = new Set(group.items.map((item) => Number(item.Id)).filter(Boolean));
                const rows = group.items.flatMap((item) => lotRowsOf(item).map((lot, lotIndex) => ({
                    item,
                    lot,
                    key: `${item.Id || group.itemCode}-${lot.Id || lotIndex}`
                })));
                const groupDefects = defects.filter((defect) => itemIds.has(Number(defect.BtpItemId)));
                if (groupIndex === 0) groupDefects.push(...unassignedDefects);
                const criticalDefects = groupDefects.filter(isCritical);
                const otherDefects = groupDefects.filter((defect) => !isCritical(defect));
                const sampleQuantity = Number(summary?.SoLuongMau || 0);
                const totalPlanQuantity = rows.reduce((sum, row) => {
                    const value = row.lot.SoLuongNhap ?? row.item.SoLuongNhap ?? row.item.SoLuong;
                    return sum + (Number(value) || 0);
                }, 0);
                const customerCodes = uniqueText([
                    ...group.items.map((item) => item.MaSo_KhachHang),
                    phieu.MaSo_KhachHang
                ]);
                const orderCodes = uniqueText(group.items.map((item) => item.MaDonHang || phieu.MaDonHang));
                const entryDates = uniqueText(group.items.map((item) => formatDate(item.NgayNhap || phieu.NgayNhap)));
                const sampleType = summary?.LoaiMau || "";

                const renderDefectRows = (items, allowedText, prefix) => items.map((defect, index) => {
                    const percentage = sampleQuantity > 0
                        ? formatRate((Number(defect.SoLuong || 0) * 100) / sampleQuantity)
                        : "";
                    const unassigned = !defect.BtpItemId && groups.length > 1;
                    return (
                        <tr key={`${prefix}-${defect.Id || defect.DefectId || index}`}>
                            <td style={styles.center}>{index + 1}</td>
                            <td style={styles.td}>
                                {defect.TenLoi || ""}
                                {defect.BtpSoLotSX ? ` (Lot ${defect.BtpSoLotSX})` : ""}
                                {unassigned ? " (Chưa xác định ItemCode)" : ""}
                            </td>
                            <td style={styles.center}>{defect.MaLoi || ""}</td>
                            <td style={styles.center}>{formatQuantity(defect.SoLuong)}</td>
                            <td style={styles.center}>{percentage}</td>
                            <td style={{ ...styles.center, fontWeight: 700 }}>{index === 0 ? allowedText : ""}</td>
                            <td style={styles.center}>{checkbox(Boolean(defect.IsLapLai))}</td>
                        </tr>
                    );
                });

                return (
                    <section key={group.itemCode} className="sxbt-official-page" style={styles.page}>
                        <table style={{ ...styles.table, marginBottom: 4 }}>
                            <tbody>
                                <tr>
                                    <td style={{ ...styles.center, width: "18%", padding: 3 }}>
                                        <img src="/logo.png" alt="Z76" style={{ height: 46, display: "block", margin: "0 auto" }} />
                                    </td>
                                    <td style={{ ...styles.center, fontWeight: 700, fontSize: "14pt" }}>
                                        PHIẾU KIỂM TRA CHẤT LƯỢNG
                                    </td>
                                    <td style={{ ...styles.td, width: "25%", fontSize: "8pt" }}>
                                        <div><b>Mã số:</b> BM.01-HD.07-QT.03-B8</div>
                                        <div>Ngày hiệu lực: 01/6/2026</div>
                                        <div>Phiên bản: 08</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px 12px", marginBottom: 3 }}>
                            <div>Mã KH: <span style={styles.dotted}>{customerCodes}</span></div>
                            <div>Ngày nhập: <span style={styles.dotted}>{entryDates}</span></div>
                            <div>Số phiếu: <span style={styles.dotted}>{phieu.SoPhieu || ""}</span></div>
                            <div style={{ gridColumn: "span 2" }}>Số lượng nhập (KH): <span style={{ ...styles.dotted, minWidth: 150 }}>{formatQuantity(totalPlanQuantity)}</span></div>
                            <div>Số đơn hàng: <span style={styles.dotted}>{orderCodes}</span></div>
                        </div>

                        <div style={styles.section}>I. Kiểm tra điều kiện vận chuyển</div>
                        <table style={{ ...styles.table, marginBottom: 2 }}>
                            <tbody>
                                {[
                                    ["1. Thùng, sàn xe sạch, không thủng, ẩm ướt, có mùi lạ", dynVal("DKVC_THUNG_SAN_XE")],
                                    ["2. Ngoại quan sản phẩm không thấm nước, ẩm ướt", dynVal("DKVC_NGOAI_QUAN")]
                                ].map(([label, value]) => (
                                    <tr key={label}>
                                        <td style={{ border: 0, padding: "1px 0", width: "65%" }}>{label}</td>
                                        <td style={{ border: 0, padding: 1, textAlign: "center" }}>{checkbox(value === "DAT")}</td>
                                        <td style={{ border: 0, padding: 1 }}>Đạt</td>
                                        <td style={{ border: 0, padding: 1, textAlign: "center" }}>{checkbox(value === "KHONG_DAT")}</td>
                                        <td style={{ border: 0, padding: 1 }}>Không đạt</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <div style={styles.section}>II. Số lượng theo chứng từ của KH</div>
                            <div>Thời gian kiểm: Bắt đầu:.................. Kết thúc:..................</div>
                        </div>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ ...styles.th, width: "23%" }}>Tên vật tư, hàng hóa</th>
                                    <th style={styles.th}>Dấu tuần/<br />GS1</th>
                                    <th style={{ ...styles.th, width: "6%" }}>TT</th>
                                    <th style={styles.th}>LXVT/<br />LOT VT</th>
                                    <th style={styles.th}>Lot SX</th>
                                    <th style={styles.th}>Số lượng</th>
                                    <th style={{ ...styles.th, width: "17%" }}>Thực nhập<br />(Kho xác nhận)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(({ item, lot, key }, index) => (
                                    <tr key={key}>
                                        <td style={styles.td}>{index === 0 ? (item.TenSanPham || phieu.TenSanPham || "") : ""}</td>
                                        <td style={styles.center}>{lot.DauTuanGS1 || ""}</td>
                                        <td style={styles.center}>{lot.ThuTu || ""}</td>
                                        <td style={styles.center}>{lot.LxvtLot || ""}</td>
                                        <td style={styles.center}>{lot.SoLotSX || item.SoLotSX || ""}</td>
                                        <td style={styles.center}>{formatQuantity(lot.SoLuongNhap ?? item.SoLuongNhap ?? item.SoLuong)}</td>
                                        <td style={styles.center}>{formatQuantity(lot.SoLuongKhoXacNhan)}</td>
                                    </tr>
                                ))}
                                {minRows(rows.length, 4, 7, `quantity-${group.itemCode}`)}
                            </tbody>
                        </table>

                        <div style={styles.section}>III. Tỷ lệ kiểm</div>
                        <table style={styles.table}>
                            <tbody>
                                <tr>
                                    <td style={{ ...styles.center, border: 0 }}>{checkbox(sampleType === "LAN_1_2")} &nbsp; SP mới nhập<br />lần 1,2 (100%)</td>
                                    <td style={{ ...styles.center, border: 0 }}>{checkbox(sampleType === "LAN_3")} &nbsp; SP nhập từ<br />lần 3 (3÷5%)</td>
                                    <td style={{ ...styles.center, border: 0 }}>{checkbox(sampleType === "LO_TRUOC_KHONG_DAT")} &nbsp; Lô trước không đạt<br />(6÷10%)</td>
                                </tr>
                            </tbody>
                        </table>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Số lượng mẫu</th>
                                    <th style={styles.th}>Tỷ lệ (%)</th>
                                    <th style={styles.th}>Tỷ lệ đạt (%)</th>
                                    <th style={styles.th} colSpan={2}>Tỷ lệ lỗi (%)</th>
                                    <th style={styles.th}>Kết luận</th>
                                </tr>
                                <tr>
                                    <th style={styles.th} /><th style={styles.th} /><th style={styles.th} />
                                    <th style={styles.th}>Nghiêm trọng</th>
                                    <th style={styles.th}>Nặng, nhẹ</th>
                                    <th style={styles.th} />
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={styles.center}>{formatQuantity(summary?.SoLuongMau)}</td>
                                    <td style={styles.center}>{formatRate(summary?.TyLe)}</td>
                                    <td style={styles.center}>{formatRate(summary?.TyLeDat)}</td>
                                    <td style={styles.center}>{formatRate(summary?.TyLeLoiNghiemTrong)}</td>
                                    <td style={styles.center}>{formatRate(summary?.TyLeLoiNangNhe)}</td>
                                    <td style={{ ...styles.center, fontWeight: 700 }}>{normalizeConclusion(phieu.KetLuan)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div style={styles.section}>IV. Chi tiết các dạng lỗi</div>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ ...styles.th, width: "5%" }}>TT</th>
                                    <th style={{ ...styles.th, width: "42%" }}>Các dạng lỗi không đạt</th>
                                    <th style={styles.th} colSpan={5}>Chi tiết lỗi</th>
                                </tr>
                                <tr>
                                    <th style={styles.th}>1</th>
                                    <th style={{ ...styles.th, textAlign: "left" }}>Lỗi nghiêm trọng (Theo ngân hàng lỗi mức C)</th>
                                    <th style={styles.th}>Mã lỗi</th><th style={styles.th}>Số lỗi</th>
                                    <th style={styles.th}>Tổng (%)</th><th style={styles.th}>Cho phép</th><th style={styles.th}>Lặp lại</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderDefectRows(criticalDefects, "0", "critical")}
                                {minRows(criticalDefects.length, 3, 7, `critical-${group.itemCode}`)}
                                <tr>
                                    <th style={styles.th}>2</th>
                                    <th style={{ ...styles.th, textAlign: "left" }}>Lỗi nặng, lỗi nhẹ (Theo ngân hàng lỗi mức B)</th>
                                    <th style={styles.th} /><th style={styles.th} /><th style={styles.th} /><th style={styles.th} /><th style={styles.th} />
                                </tr>
                                {renderDefectRows(otherDefects, "≤ 4%", "other")}
                                {minRows(otherDefects.length, 7, 7, `other-${group.itemCode}`)}
                            </tbody>
                        </table>

                        <div className="sxbt-official-avoid">
                            <div style={{ marginTop: 3 }}><b>V. Nhận xét/ kiến nghị:</b> ....................................................................................................................</div>
                            <div>............................................................................................................................................................</div>
                            <div style={{ textAlign: "center", fontStyle: "italic", marginTop: 4 }}>
                                <b>LƯU Ý:</b> KH có Phiếu xử lý không phù hợp (hoặc có phiếu kiểm tra chất lượng không đạt):<br />
                                3 lần liên tiếp hoặc 3 lần /tháng yêu cầu dừng nhập hàng, đánh giá lại năng lực
                            </div>
                            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                                {signatureSlots.map((slot) => (
                                    <PrintSignature
                                        key={slot.key}
                                        style={{ flex: 1 }}
                                        title={slot.title}
                                        name={slot.userName}
                                        signedAt={slot.date}
                                        signatureDataUrl={slot.signatureDataUrl}
                                        formatDate={formatSignatureDate}
                                        imageHeight={58}
                                        titleStyle={{ fontSize: "9.5pt" }}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>
                );
            })}
        </div>
    );
});

SxbtOfficialPrintTemplate.displayName = "SxbtOfficialPrintTemplate";

