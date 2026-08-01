import React, { forwardRef, useMemo } from "react";

const border = "1px solid #000";
const cell = {
    border,
    padding: "2px",
    textAlign: "center",
    verticalAlign: "middle",
    lineHeight: 1.1,
    overflowWrap: "anywhere"
};
const text = (value) => value == null || value === "" ? "" : String(value);
const formatDate = (value) => value
    ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("vi-VN")
    : "";
const weekNumber = (value) => {
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    const firstDay = new Date(date.getFullYear(), 0, 1);
    return Math.ceil((((date - firstDay) / 86400000) + firstDay.getDay() + 1) / 7);
};

const signerByRole = (xacNhans, role) => [...(xacNhans || [])]
    .reverse()
    .find((item) => String(item?.VaiTro || "").toUpperCase() === role)
    ?.TenNguoiXacNhan || "";

const CongDoanPrintTemplate = forwardRef(function CongDoanPrintTemplate(
    { phieu, plans = [], xacNhans = [] },
    ref
) {
    const defectColumns = useMemo(() => {
        const map = new Map();
        plans.forEach((plan) => (plan.Defects || []).forEach((defect) => {
            if (!map.has(defect.DefectId)) {
                map.set(defect.DefectId, {
                    id: defect.DefectId,
                    code: defect.MaLoi,
                    name: defect.TenLoi
                });
            }
        }));
        return [...map.values()];
    }, [plans]);

    const rows = useMemo(() => plans.flatMap((plan) => {
        const lots = Array.isArray(plan.Lots) ? plan.Lots : [];
        const unassignedDefects = (plan.Defects || []).filter((defect) => !defect.PlanLotId);
        const targets = lots.length ? [
            ...lots.map((lot) => ({ lot, defects: (plan.Defects || []).filter((defect) => Number(defect.PlanLotId) === Number(lot.Id)) })),
            ...(unassignedDefects.length || Number(plan.SoLoiBuiBan || 0) > 0 || Number(plan.SoLoiConTrung || 0) > 0
                ? [{ lot: null, defects: unassignedDefects }]
                : [])
        ] : [{ lot: null, defects: plan.Defects || [] }];

        return targets.flatMap(({ lot, defects }, targetIndex) => {
            const specialDirty = lot ? Number(lot.SoLoiBuiBan || 0) : Number(plan.SoLoiBuiBan || 0);
            const specialInsect = lot ? Number(lot.SoLoiConTrung || 0) : Number(plan.SoLoiConTrung || 0);
            const checked = Number(lot?.SoLuong ?? plan.SoLuongHieuLuc ?? plan.SoLuongKeHoach ?? 0);

            const detailLines = [
                ...defects
                    .filter((defect) => Number(defect.SoLuong || 0) > 0)
                    .map((defect, defectIndex) => ({
                        key: `defect-${defect.Id || defectIndex}`,
                        defectId: defect.DefectId,
                        quantity: Number(defect.SoLuong || 0),
                        worker: String(defect.TenCongNhan || "").trim(),
                        repairedPass: defect.SoLuongDatSauSua,
                        repairedFail: defect.SoLuongKhongDatSauSua,
                        note: defect.GhiChu || ""
                    })),
                ...(specialDirty > 0 ? [{
                    key: "special-dirty",
                    specialType: "dirty",
                    quantity: specialDirty,
                    worker: "",
                    repairedPass: null,
                    repairedFail: null,
                    note: ""
                }] : []),
                ...(specialInsect > 0 ? [{
                    key: "special-insect",
                    specialType: "insect",
                    quantity: specialInsect,
                    worker: "",
                    repairedPass: null,
                    repairedFail: null,
                    note: ""
                }] : [])
            ];

            if (!detailLines.length) {
                detailLines.push({
                    key: "no-defect",
                    quantity: 0,
                    worker: "",
                    repairedPass: null,
                    repairedFail: null,
                    note: ""
                });
            }

            return detailLines.map((detail, detailIndex) => ({
                ...plan,
                Id: `${plan.Id}-${lot?.Id || `general-${targetIndex}`}-${detail.key}`,
                isFirstInGroup: detailIndex === 0,
                rowSpan: detailLines.length,
                defectId: detail.defectId || null,
                specialType: detail.specialType || null,
                total: detail.quantity,
                worker: detail.worker,
                lotDisplay: lot ? lot.Lot : (lots.length ? "Chưa xác định Lot" : plan.Lot),
                lxvtDisplay: lot ? lot.LenhXuatVatTu : plan.LenhXuatVatTu,
                SoLuongHieuLuc: checked,
                ratio: checked > 0 ? `${(detail.quantity * 100 / checked).toFixed(2)}%` : "Không tính",
                repairedPass: detail.repairedPass,
                repairedFail: detail.repairedFail,
                rowNote: [detail.note, detailIndex === 0 ? plan.GhiChu : ""].filter(Boolean).join("; ")
            }));
        });
    }), [plans]);

    const totalColumns = 16 + defectColumns.length;
    const tableFontSize = totalColumns > 22 ? 6.3 : totalColumns > 19 ? 7 : 7.8;
    const kcsSignerName = signerByRole(xacNhans, "KCS_CONG_DOAN");
    const departmentHeadSignerName = signerByRole(xacNhans, "TBP_CONG_DOAN");

    return (
        <div
            ref={ref}
            style={{
                width: "297mm",
                minHeight: "210mm",
                padding: "5mm 6mm",
                boxSizing: "border-box",
                background: "#fff",
                color: "#000",
                fontFamily: '"Times New Roman", serif',
                fontSize: 9
            }}
        >
            <style>{`
                @page { size: A4 landscape; margin: 0; }
                @media print {
                    html, body { margin: 0 !important; padding: 0 !important; }
                    .cong-doan-print-row { break-inside: avoid; }
                }
            `}</style>

            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <tbody>
                    <tr style={{ height: 25 }}>
                        <td rowSpan={3} style={{ ...cell, width: "16%" }}>
                            <img src="/logo.png" alt="Công ty 76" style={{ width: "90%", maxHeight: 62, objectFit: "contain" }} />
                        </td>
                        <td style={{ ...cell, borderBottom: "none", fontSize: 11 }}>
                            CÔNG TY TNHH MỘT THÀNH VIÊN 76
                        </td>
                        <td style={{ ...cell, width: "23%", textAlign: "left", paddingLeft: 6 }}>
                            Mã số: BM.03-QT.03-B8
                        </td>
                    </tr>
                    <tr style={{ height: 25 }}>
                        <td rowSpan={2} style={{ ...cell, borderTop: "none", fontWeight: 700, fontSize: 15 }}>
                            THEO DÕI KIỂM TRA, NGHIỆM THU - CÔNG ĐOẠN
                        </td>
                        <td style={{ ...cell, textAlign: "left", paddingLeft: 6 }}>
                            Ngày hiệu lực: 01/7/2026
                        </td>
                    </tr>
                    <tr style={{ height: 25 }}>
                        <td style={{ ...cell, textAlign: "left", paddingLeft: 6 }}>Phiên bản: 00</td>
                    </tr>
                </tbody>
            </table>

            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginTop: 8, marginBottom: 8, fontSize: 11 }}>
                <tbody>
                    <tr style={{ height: 24 }}>
                        <td style={{ width: "35%", fontWeight: 700 }}>Phân xưởng: {text(phieu?.PhanXuong)}</td>
                        <td style={{ width: "35%", fontWeight: 700 }}>Tổ/máy: {text(phieu?.ToMay)}</td>
                        <td style={{ fontWeight: 700 }}>Tuần: {weekNumber(phieu?.NgayKiem)}</td>
                    </tr>
                </tbody>
            </table>

            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: tableFontSize }}>
                <thead>
                    <tr style={{ height: 28 }}>
                        <th rowSpan={2} style={cell}>Ngày</th>
                        <th rowSpan={2} style={cell}>KCS</th>
                        <th rowSpan={2} style={cell}>Công nhân</th>
                        <th rowSpan={2} style={cell}>Sản phẩm</th>
                        <th rowSpan={2} style={cell}>Mã đơn hàng</th>
                        <th rowSpan={2} style={cell}>ĐVSX</th>
                        <th rowSpan={2} style={cell}>Lô (LOT)</th>
                        <th rowSpan={2} style={cell}>Lệnh xuất VT</th>
                        <th rowSpan={2} style={cell}>KH / TT / SL Lot</th>
                        <th rowSpan={2} style={cell}>Số lượng lỗi</th>
                        <th rowSpan={2} style={cell}>Tỷ lệ lỗi</th>
                        <th colSpan={defectColumns.length + 2} style={cell}>Các dạng lỗi (Ngân hàng lỗi)</th>
                        <th colSpan={2} style={cell}>Báo cáo sửa lỗi</th>
                        <th rowSpan={2} style={cell}>Ghi chú</th>
                    </tr>
                    <tr style={{ height: 22, fontStyle: "italic", fontWeight: 400 }}>
                        {defectColumns.map((item) => (
                            <th key={item.id} style={cell} title={item.name}>{item.code || item.name}</th>
                        ))}
                        <th style={cell}>Bụi bẩn</th>
                        <th style={cell}>Côn trùng</th>
                        <th style={cell}>Đạt</th>
                        <th style={cell}>Kđạt</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.Id} className="cong-doan-print-row" style={{ height: 25 }}>
                            {row.isFirstInGroup && (
                                <td rowSpan={row.rowSpan} style={cell}>{formatDate(row.NgayKeHoach || phieu?.NgayKiem)}</td>
                            )}
                            {row.isFirstInGroup && (
                                <td rowSpan={row.rowSpan} style={cell}>{text(row.TenNguoiGhiNhan)}</td>
                            )}
                            <td style={cell}>{text(row.worker)}</td>
                            {row.isFirstInGroup && (
                                <td rowSpan={row.rowSpan} style={cell}>{[row.MaSanPham, row.TenSanPham].filter(Boolean).join(" - ")}</td>
                            )}
                            {row.isFirstInGroup && (
                                <td rowSpan={row.rowSpan} style={cell}>{text(row.MaDonHang)}</td>
                            )}
                            {row.isFirstInGroup && (
                                <td rowSpan={row.rowSpan} style={cell}>{text(row.TenDonVi || row.TenBoPhan)}</td>
                            )}
                            {row.isFirstInGroup && (
                                <td rowSpan={row.rowSpan} style={cell}>{text(row.lotDisplay)}</td>
                            )}
                            {row.isFirstInGroup && (
                                <td rowSpan={row.rowSpan} style={cell}>{text(row.lxvtDisplay)}</td>
                            )}
                            {row.isFirstInGroup && (
                                <td rowSpan={row.rowSpan} style={cell}>
                                    {text(row.SoLuongKeHoach)} / {row.SoLuongThucTe == null ? "Chưa nhập" : text(row.SoLuongThucTe)} / {text(row.SoLuongHieuLuc)}
                                </td>
                            )}
                            <td style={cell}>{row.total || ""}</td>
                            <td style={cell}>{row.ratio}</td>
                            {defectColumns.map((item) => (
                                <td key={item.id} style={cell}>
                                    {Number(row.defectId) === Number(item.id) ? row.total || "" : ""}
                                </td>
                            ))}
                            <td style={cell}>{row.specialType === "dirty" ? row.total : ""}</td>
                            <td style={cell}>{row.specialType === "insect" ? row.total : ""}</td>
                            <td style={cell}>{row.repairedPass == null ? "" : text(row.repairedPass)}</td>
                            <td style={cell}>{row.repairedFail == null ? "" : text(row.repairedFail)}</td>
                            <td style={cell}>{text(row.rowNote)}</td>
                        </tr>
                    ))}
                    {Array.from({ length: Math.max(1, 20 - rows.length) }).map((_, index) => (
                        <tr key={`empty-${index}`} style={{ height: 19 }}>
                            {Array.from({ length: totalColumns }).map((__, columnIndex) => (
                                <td key={columnIndex} style={cell} />
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 40,
                marginTop: 16,
                fontSize: 12
            }}>
                {[
                    ["KCS", kcsSignerName],
                    ["TRƯỞNG BỘ PHẬN", departmentHeadSignerName]
                ].map(([title, signerName]) => (
                    <div key={title} style={{ textAlign: "center", minHeight: 118 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
                        <div style={{
                            height: 72,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            {signerName ? (
                                <span style={{
                                    display: "inline-block",
                                    padding: "8px 16px 7px",
                                    border: "2px solid #f05a5a",
                                    color: "#f05a5a",
                                    fontWeight: 700,
                                    fontSize: 17,
                                    lineHeight: 1,
                                    textTransform: "uppercase",
                                    borderRadius: 4,
                                    transform: "rotate(-9deg) translateY(4px)",
                                    letterSpacing: "0.8px",
                                    backgroundColor: "rgba(255,255,255,0.92)"
                                }}>
                                    Đã ký
                                </span>
                            ) : null}
                        </div>
                        <div style={{ minHeight: 20, marginTop: 4, fontWeight: 700, fontSize: 12 }}>
                            {signerName}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default CongDoanPrintTemplate;
