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

const CongDoanPrintTemplate = forwardRef(function CongDoanPrintTemplate({ phieu, plans = [] }, ref) {
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

    const rows = useMemo(() => plans.map((plan) => {
        const defectMap = (plan.Defects || []).reduce((map, defect) => ({
            ...map,
            [defect.DefectId]: Number(map[defect.DefectId] || 0) + Number(defect.SoLuong || 0)
        }), {});
        const catalogDefects = (plan.Defects || [])
            .reduce((sum, defect) => sum + Number(defect.SoLuong || 0), 0);
        const total = catalogDefects
            + Number(plan.SoLoiBuiBan || 0)
            + Number(plan.SoLoiConTrung || 0);
        const checked = Number(plan.SoLuongKeHoach || 0);
        const workers = [...new Set(
            (plan.Defects || [])
                .map((defect) => String(defect.TenCongNhan || "").trim())
                .filter(Boolean)
        )];
        return {
            ...plan,
            defectMap,
            total,
            workers,
            ratio: checked > 0 ? `${(total * 100 / checked).toFixed(2)}%` : "Không tính",
            repairedPass: (plan.Defects || [])
                .reduce((sum, defect) => sum + Number(defect.SoLuongDatSauSua || 0), 0),
            repairedFail: (plan.Defects || [])
                .reduce((sum, defect) => sum + Number(defect.SoLuongKhongDatSauSua || 0), 0)
        };
    }), [plans]);

    const totalColumns = 16 + defectColumns.length;
    const tableFontSize = totalColumns > 22 ? 6.3 : totalColumns > 19 ? 7 : 7.8;

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
                        <th rowSpan={2} style={cell}>Số lượng kiểm</th>
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
                            <td style={cell}>{formatDate(row.NgayKeHoach || phieu?.NgayKiem)}</td>
                            <td style={cell}>{text(row.TenNguoiGhiNhan)}</td>
                            <td style={cell}>{row.workers.join(", ")}</td>
                            <td style={cell}>{[row.MaSanPham, row.TenSanPham].filter(Boolean).join(" - ")}</td>
                            <td style={cell}>{text(row.MaDonHang)}</td>
                            <td style={cell}>{text(row.TenDonVi || row.TenBoPhan)}</td>
                            <td style={cell}>{text(row.Lot)}</td>
                            <td style={cell}>{text(row.LenhXuatVatTu)}</td>
                            <td style={cell}>{text(row.SoLuongKeHoach)}</td>
                            <td style={cell}>{row.total || ""}</td>
                            <td style={cell}>{row.ratio}</td>
                            {defectColumns.map((item) => (
                                <td key={item.id} style={cell}>{row.defectMap[item.id] || ""}</td>
                            ))}
                            <td style={cell}>{Number(row.SoLoiBuiBan || 0) || ""}</td>
                            <td style={cell}>{Number(row.SoLoiConTrung || 0) || ""}</td>
                            <td style={cell}>{row.repairedPass || ""}</td>
                            <td style={cell}>{row.repairedFail || ""}</td>
                            <td style={cell}>{text(row.GhiChu)}</td>
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
        </div>
    );
});

export default CongDoanPrintTemplate;
