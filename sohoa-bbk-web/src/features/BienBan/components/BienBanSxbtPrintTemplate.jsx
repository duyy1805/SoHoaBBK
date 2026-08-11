import React, { useEffect, useMemo, useState } from "react";
import { Box } from "@mui/material";
import { PrintSignatureImage } from "../../../components/common/PrintSignature";

const LEVEL_LABELS = {
    B: "Mức chất lượng B",
    C: "Mức chất lượng C"
};

const SIGNATURE_FLOW_BY_LEVEL = {
    B: ["SXBT", "B8"],
    C: ["SXBT", "B8", "B7", "GD"]
};

const SIGNATURE_LABELS = {
    SXBT: "BỘ PHẬN SXBT",
    B8: "PHÒNG KIỂM NGHIỆM",
    B7: "KỸ THUẬT CÔNG NGHỆ",
    GD: "GIÁM ĐỐC"
};

const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("vi-VN");
};

const formatLongDate = (value) => {
    const date = value ? new Date(value) : new Date();
    return `Ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`;
};

export const BienBanSxbtPrintTemplate = React.forwardRef(({
    info = {},
    moTaChung = "",
    defects = [],
    xuLyRows = [],
    hanhDongRows = [],
    dynamicFields = [],
    confirmSteps = []
}, ref) => {
    const customData = useMemo(
        () => (dynamicFields || []).reduce((acc, field) => {
            if (field?.FieldName) acc[field.FieldName] = field.FieldValue;
            return acc;
        }, {}),
        [dynamicFields]
    );

    const [mucCChuyenTraKH, setMucCChuyenTraKH] = useState(false);
    const [mucCXuLyTaiNhaMay, setMucCXuLyTaiNhaMay] = useState(false);

    useEffect(() => {
        // Sync the editable print checkboxes when a different record is loaded.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMucCChuyenTraKH(
            customData.SxbtMucCChuyenTraKH === true || customData.SxbtMucCChuyenTraKH === "true"
        );
        setMucCXuLyTaiNhaMay(
            customData.SxbtMucCXuLyTaiNhaMay === true || customData.SxbtMucCXuLyTaiNhaMay === "true"
        );
    }, [customData.SxbtMucCChuyenTraKH, customData.SxbtMucCXuLyTaiNhaMay]);

    const styles = {
        previewBackground: {
            backgroundColor: "#f0f2f5",
            padding: "20px",
            display: "flex",
            justifyContent: "center",
            fontFamily: '"Times New Roman", Times, serif',
            color: "#000"
        },
        documentPaper: {
            width: "210mm",
            backgroundColor: "#fff",
            padding: "15mm 20mm",
            boxSizing: "border-box",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
        },
        text: { fontSize: "12pt", marginBottom: "4px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
        boldText: { fontSize: "12pt", fontWeight: "bold" },
        sectionTitle: { fontWeight: "bold", fontSize: "12pt", marginTop: "15px", marginBottom: "8px" },
        table: { border: "1px solid #000", borderCollapse: "collapse", tableLayout: "fixed", width: "100%", marginBottom: "10px" },
        th: { border: "1px solid #000", padding: "4px", fontWeight: "bold", textAlign: "center", fontSize: "11pt" },
        td: { border: "1px solid #000", padding: "4px", fontSize: "11pt", verticalAlign: "top", whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
        headerTable: { width: "100%", borderCollapse: "collapse", marginBottom: "15px", border: "1px solid #000" },
        headerTd: { border: "1px solid #000", padding: "6px", textAlign: "center", verticalAlign: "middle" },
        signatureBlock: { display: "flex", justifyContent: "space-between", marginTop: "15px", textAlign: "center", width: "100%" },
        signatureCol: { flex: 1, padding: "0 10px" },
        signedStamp: {
            display: "inline-block",
            padding: "5px 10px",
            border: "2px solid #d32f2f",
            color: "#d32f2f",
            fontWeight: "bold",
            fontSize: "11pt",
            transform: "rotate(-8deg)",
            borderRadius: "4px",
            marginTop: "8px"
        }
    };

    const mucDo = info.MucDoKhongPhuHop || "B";
    const mucBRows = xuLyRows.filter((row) => !row.MucDo || row.MucDo === "B");
    const mucCRows = xuLyRows.filter((row) => !row.MucDo || row.MucDo === "C");
    const signatureFlow = SIGNATURE_FLOW_BY_LEVEL[mucDo] || SIGNATURE_FLOW_BY_LEVEL.B;
    const signatureDisplayFlow = [...signatureFlow].reverse();

    const renderEmptyRows = (count, columns) => Array.from({ length: count }).map((_, index) => (
        <tr key={`empty-${columns}-${index}`}>
            {Array.from({ length: columns }).map((__, colIndex) => (
                <td key={colIndex} style={styles.td}>&nbsp;</td>
            ))}
        </tr>
    ));

    const renderSquareBox = (checked, onClick) => (
        <span
            onClick={onClick}
            style={{
                width: "18px",
                height: "18px",
                border: "1px solid #000",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12pt",
                lineHeight: 1,
                marginLeft: "6px",
                verticalAlign: "middle",
                cursor: "pointer",
                userSelect: "none"
            }}
        >
            {checked ? "x" : ""}
        </span>
    );

    const renderStepSignatures = () => {
        if (signatureFlow.length === 0) return null;

        const stepByMaBoPhan = new Map(
            (confirmSteps || [])
                .filter((step) => step?.MaBoPhan)
                .map((step) => [String(step.MaBoPhan).toUpperCase(), step])
        );

        return (
            <Box className="avoid-break" style={styles.signatureBlock}>
                {signatureDisplayFlow.map((maBoPhan, index) => {
                    const originalOrder = signatureFlow.indexOf(maBoPhan) + 1;
                    const step = stepByMaBoPhan.get(maBoPhan) || confirmSteps.find((item) => item?.StepOrder === originalOrder);
                    const ngayKy = step?.ConfirmedAt ? formatLongDate(step.ConfirmedAt) : "Ngày";
                    const nhanKy = SIGNATURE_LABELS[maBoPhan] || maBoPhan;

                    return (
                        <Box key={step?.Id || `${maBoPhan}-${index}`} style={styles.signatureCol}>
                            <div style={{ ...styles.text, fontStyle: "italic" }}>{ngayKy}</div>
                            <div style={styles.boldText}>{nhanKy}</div>
                            <Box height="16px" />
                            <PrintSignatureImage src={step?.SignatureDataUrl || null} height={54} />
                            <div style={{ ...styles.text, fontWeight: "bold", marginTop: "8px" }}>
                                {step?.TenNguoiXacNhan || ""}
                            </div>
                        </Box>
                    );
                })}
            </Box>
        );
    };

    return (
        <div ref={ref} style={styles.previewBackground} className="preview-background">
            <style>
                {`
                @page {
                    size: A4;
                    margin: 15mm 20mm;
                }

                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        background-color: #fff;
                    }

                    .preview-background { padding: 0 !important; background-color: transparent !important; }
                    .document-paper {
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                    }
                    thead { display: table-header-group; }
                    .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
                    tr { page-break-inside: avoid !important; break-inside: avoid !important; }
                }
                `}
            </style>

            <input type="hidden" name="SxbtMucCChuyenTraKH" className="custom-field" value={String(mucCChuyenTraKH)} />
            <input type="hidden" name="SxbtMucCXuLyTaiNhaMay" className="custom-field" value={String(mucCXuLyTaiNhaMay)} />

            <div className="document-paper" style={styles.documentPaper}>
                <table style={{ width: "100%", borderCollapse: "collapse", border: "none" }}>
                    <thead>
                        <tr>
                            <td style={{ border: "none", paddingBottom: "10px" }}>
                                <table style={styles.headerTable}>
                                    <tbody>
                                        <tr>
                                            <td rowSpan={2} style={{ ...styles.headerTd, width: "20%" }}>
                                                <img src="/logo.png" alt="Logo Z76" style={{ height: "70px", display: "block", margin: "0 auto" }} />
                                            </td>
                                            <td style={{ ...styles.headerTd, width: "50%", borderBottom: "1px solid #000" }}>
                                                <div style={{ fontSize: "14pt" }}>CÔNG TY TNHH MTV 76</div>
                                            </td>
                                            <td rowSpan={2} style={{ ...styles.headerTd, width: "30%", textAlign: "left", paddingLeft: "10px" }}>
                                                <div style={{ fontSize: "11pt" }}>Mã số: BM.01-QT.02-B8</div>
                                                <div style={{ fontSize: "11pt" }}>Ngày HL: 20/01/2026</div>
                                                <div style={{ fontSize: "11pt" }}>Phiên bản: 00</div>
                                                <div style={{ fontSize: "11pt" }}>Trang:</div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={styles.headerTd}>
                                                <div style={{ fontWeight: "bold", fontSize: "14pt" }}>BIÊN BẢN XỬ LÝ SXBT</div>
                                                <div style={{ fontWeight: "bold", fontSize: "14pt" }}>KHÔNG PHÙ HỢP</div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </thead>

                    <tbody>
                        <tr>
                            <td style={{ border: "none" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                                    <div style={styles.text}><strong>Số phiếu:</strong> {info.SoPhieu || ""}</div>
                                    <div style={{ ...styles.text, fontStyle: "italic" }}>{formatLongDate(info.CreatedAt)}</div>
                                </div>

                                <Box className="avoid-break" mb={2}>
                                    <div style={styles.sectionTitle}>1. Thông tin biên bản</div>
                                    <div style={styles.text}><strong>Số biên bản:</strong> {info.SoBienBan || "Biên bản SXBT"}</div>
                                    <div style={styles.text}><strong>Người tạo:</strong> {info.NguoiTao || ""}</div>
                                    <div style={styles.text}><strong>Bộ phận tạo:</strong> {[info.MaBoPhanTao, info.TenBoPhanTao].filter(Boolean).join(" - ")}</div>
                                    <div style={styles.text}><strong>Mã đơn vị SXBT:</strong> {info.MaDonVi || ""}</div>
                                    <div style={styles.text}>
                                        <strong>Nguồn SXBT:</strong>{" "}
                                        {info.SxbtSourceCount > 1
                                            ? `${info.SxbtSourceCount} kế hoạch nhập (${(info.SxbtSources || []).map((source) => `#${source.KeHoachNhapId}/KHSX #${source.ID_KeHoachSanXuat}`).join(", ")})`
                                            : info.SxbtSourceType === "KE_HOACH_NHAP"
                                            ? `Kế hoạch nhập #${info.KeHoachNhapId || ""}`
                                            : (info.So_PhieuNhapBTP || `Phiếu nhập #${info.PhieuNhapBtpId || ""}`)}
                                    </div>
                                    <div style={styles.text}>
                                        <strong>Mức độ không phù hợp:</strong>
                                        <span style={{ marginLeft: "10px" }}>
                                            Mức B {renderSquareBox(mucDo === "B")}
                                        </span>
                                        <span style={{ marginLeft: "24px" }}>
                                            Mức C {renderSquareBox(mucDo === "C")}
                                        </span>
                                    </div>
                                    <div style={styles.text}><strong>Mô tả chung:</strong></div>
                                    <div style={{ ...styles.text, whiteSpace: "pre-wrap", paddingLeft: "8px" }}>
                                        {moTaChung || ""}
                                    </div>
                                </Box>

                                <Box>
                                    <div style={styles.sectionTitle}>2. Chi tiết sự không phù hợp</div>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...styles.th, width: "40px" }}>TT</th>
                                                <th style={styles.th}>Tên lỗi</th>
                                                <th style={{ ...styles.th, width: "120px" }}>Loại lỗi</th>
                                                <th style={{ ...styles.th, width: "90px" }}>Số lượng</th>
                                                <th style={styles.th}>Mô tả</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {defects.length > 0 ? defects.map((d, index) => (
                                                <tr key={`${d.MaLoi || index}-${index}`}>
                                                    <td style={{ ...styles.td, textAlign: "center" }}>{index + 1}</td>
                                                    <td style={styles.td}>{d.TenLoi || d.MaLoi || ""}</td>
                                                    <td style={{ ...styles.td, textAlign: "center" }}>{d.DefectType || ""}</td>
                                                    <td style={{ ...styles.td, textAlign: "center" }}>{d.SoLuong || 0}</td>
                                                    <td style={styles.td}>{d.MoTa || ""}</td>
                                                </tr>
                                            )) : renderEmptyRows(2, 5)}
                                        </tbody>
                                    </table>
                                </Box>

                                <Box mt={2}>
                                    <div style={styles.sectionTitle}>3. Phương án xử lý</div>
                                    {mucDo === "B" ? (
                                        <>
                                            <div style={{ ...styles.text, marginBottom: "6px" }}>
                                                <strong>1. Mức chất lượng B:</strong> Chấp nhận đưa vào sản xuất giảm trừ 10% chi phí gia công lô hàng
                                            </div>
                                            <table style={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ ...styles.th, width: "25%" }}>Chi phí</th>
                                                        <th style={styles.th}>Nội dung</th>
                                                        <th style={{ ...styles.th, width: "22%" }}>Trách nhiệm</th>
                                                        <th style={{ ...styles.th, width: "14%" }}>Thời hạn</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {mucBRows.length > 0 ? mucBRows.map((row, index) => (
                                                        <tr key={row.Id || index}>
                                                            <td style={styles.td}>{row.ChiPhi || ""}</td>
                                                            <td style={styles.td}>{row.NoiDung || ""}</td>
                                                            <td style={styles.td}>{row.TrachNhiem || row.TenBoPhanTrachNhiem || ""}</td>
                                                            <td style={{ ...styles.td, textAlign: "center" }}>{formatDate(row.ThoiHan)}</td>
                                                        </tr>
                                                    )) : renderEmptyRows(4, 4)}
                                                </tbody>
                                            </table>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ ...styles.text, marginBottom: "6px", marginTop: "10px" }}>
                                                <strong>2. Mức chất lượng C:</strong>
                                                <span style={{ marginLeft: "10px" }}>
                                                    Chuyển trả KH
                                                    {renderSquareBox(mucCChuyenTraKH, () => {
                                                        setMucCChuyenTraKH(true);
                                                        setMucCXuLyTaiNhaMay(false);
                                                    })}
                                                </span>
                                                <span style={{ marginLeft: "32px" }}>
                                                    Xử lý tại Nhà máy
                                                    {renderSquareBox(mucCXuLyTaiNhaMay, () => {
                                                        setMucCXuLyTaiNhaMay(true);
                                                        setMucCChuyenTraKH(false);
                                                    })}
                                                </span>
                                            </div>
                                            <table style={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ ...styles.th, width: "18%" }}>Chi phí</th>
                                                        <th style={styles.th}>Nội dung</th>
                                                        <th style={{ ...styles.th, width: "22%" }}>Trách nhiệm</th>
                                                        <th style={{ ...styles.th, width: "14%" }}>Thời hạn</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {mucCRows.length > 0 ? mucCRows.map((row, index) => (
                                                        <tr key={row.Id || `muc-c-${index}`}>
                                                            <td style={styles.td}>{row.ChiPhi || ""}</td>
                                                            <td style={styles.td}>{row.NoiDung || ""}</td>
                                                            <td style={styles.td}>{row.TrachNhiem || row.TenBoPhanTrachNhiem || ""}</td>
                                                            <td style={{ ...styles.td, textAlign: "center" }}>{formatDate(row.ThoiHan)}</td>
                                                        </tr>
                                                    )) : renderEmptyRows(4, 4)}
                                                </tbody>
                                            </table>
                                        </>
                                    )}
                                </Box>

                                <Box mt={2}>
                                    <div style={styles.sectionTitle}>4. Hành động khắc phục</div>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...styles.th, width: "45px" }}>TT</th>
                                                <th style={styles.th}>Nội dung</th>
                                                <th style={{ ...styles.th, width: "26%" }}>Bộ phận thực hiện</th>
                                                <th style={{ ...styles.th, width: "14%" }}>Thời hạn</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {hanhDongRows.length > 0 ? hanhDongRows.map((row, index) => (
                                                <tr key={row.Id || index}>
                                                    <td style={{ ...styles.td, textAlign: "center" }}>{index + 1}</td>
                                                    <td style={styles.td}>{row.NoiDung || ""}</td>
                                                    <td style={styles.td}>
                                                        {row.MaBoPhan && row.TenBoPhan
                                                            ? `${row.MaBoPhan} - ${row.TenBoPhan}`
                                                            : row.TenBoPhan || ""}
                                                    </td>
                                                    <td style={{ ...styles.td, textAlign: "center" }}>{formatDate(row.ThoiHan)}</td>
                                                </tr>
                                            )) : renderEmptyRows(3, 4)}
                                        </tbody>
                                    </table>
                                </Box>

                                {renderStepSignatures()}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
});
