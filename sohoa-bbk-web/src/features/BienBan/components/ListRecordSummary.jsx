import { Box, Chip, Stack, Tooltip, Typography } from "@mui/material";
import { MUC_DO_LABELS, PHAT_HIEN_TU_LABELS } from "./listRecordSummary.constants";

const clampSx = (lines) => ({
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: lines,
    overflow: "hidden",
    overflowWrap: "anywhere"
});

export function MissingValue({ children }) {
    return <Typography variant="caption" color="warning.dark" fontWeight={650}>{children}</Typography>;
}

export function ProductSummary({ item, showSourceType = false }) {
    const productName = item.TenSanPham;
    const productCode = item.MaSanPham;
    const sourceLabel = item.ItemSourceType === "VAT_TU"
        ? "Vật tư"
        : item.ItemSourceType === "SAN_PHAM" ? "BTP/TP" : null;
    return (
        <Stack spacing={0.4} minWidth={0}>
            <Stack direction="row" spacing={0.6} alignItems="center" useFlexGap flexWrap="wrap">
                {showSourceType && sourceLabel && <Chip size="small" variant="outlined" label={sourceLabel} sx={{ height: 20, fontSize: "0.68rem" }} />}
                {productCode && <Typography variant="caption" color="text.secondary" fontWeight={700}>{productCode}</Typography>}
            </Stack>
            {productName ? (
                <Tooltip title={productName} placement="top-start">
                    <Typography variant="body2" fontWeight={750} sx={{ lineHeight: 1.35, ...clampSx(2) }}>{productName}</Typography>
                </Tooltip>
            ) : <MissingValue>Chưa có sản phẩm</MissingValue>}
            {(item.Lot || item.DonHang) && (
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                    {[item.Lot ? `Lot: ${item.Lot}` : null, item.DonHang ? `ĐH: ${item.DonHang}` : null].filter(Boolean).join(" · ")}
                </Typography>
            )}
        </Stack>
    );
}

export function NonconformitySummary({ item }) {
    const defects = Array.isArray(item.MainDefects) ? item.MainDefects.slice(0, 2) : [];
    const extraCount = Math.max(0, Number(item.DefectCount || 0) - defects.length);
    const sourceLabel = PHAT_HIEN_TU_LABELS[item.PhatHienTu];
    const severityLabel = MUC_DO_LABELS[item.MucDo];
    return (
        <Stack spacing={0.65} minWidth={0}>
            {item.MoTaChung ? (
                <Tooltip title={item.MoTaChung} placement="top-start">
                    <Typography variant="body2" fontWeight={650} sx={{ lineHeight: 1.4, ...clampSx(3) }}>{item.MoTaChung}</Typography>
                </Tooltip>
            ) : <MissingValue>Chưa nhập mô tả</MissingValue>}

            <Box>
                {defects.length ? defects.map((defect, index) => (
                    <Typography key={`${defect.MaLoi || "defect"}-${index}`} variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.4, ...clampSx(1) }}>
                        {[defect.MaLoi, defect.TenLoi].filter(Boolean).join(" – ") || "Lỗi chưa đặt tên"}
                    </Typography>
                )) : <MissingValue>Chưa có dòng lỗi</MissingValue>}
                {extraCount > 0 && <Typography variant="caption" color="primary.main" fontWeight={700}>+{extraCount} lỗi khác</Typography>}
            </Box>

            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                {Number(item.DefectCount) > 0 && <Chip size="small" variant="outlined" label={`${item.DefectCount} dòng lỗi`} sx={{ height: 20, fontSize: "0.68rem" }} />}
                {Number(item.TotalDefectQuantity) > 0 && <Chip size="small" variant="outlined" label={`SL lỗi ${Number(item.TotalDefectQuantity).toLocaleString("vi-VN")}`} sx={{ height: 20, fontSize: "0.68rem" }} />}
                {severityLabel && <Chip size="small" color="warning" variant="outlined" label={severityLabel} sx={{ height: 20, fontSize: "0.68rem" }} />}
            </Stack>
            <Typography variant="caption" color={sourceLabel ? "text.secondary" : "warning.dark"}>
                {sourceLabel ? `Phát hiện: ${sourceLabel}` : "Chưa chọn nguồn phát hiện"}
            </Typography>
        </Stack>
    );
}

export function CreatorSummary({ item, showProductionUnit = false }) {
    const department = [item.MaBoPhanTao, item.TenBoPhanTao].filter(Boolean).join(" - ");
    return (
        <Stack spacing={0.25} minWidth={0}>
            <Typography variant="body2" fontWeight={700}>{item.NguoiLap || "Chưa rõ người lập"}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>{department || "Chưa có bộ phận"}</Typography>
            {showProductionUnit && (item.ProductionUnit || item.MaDonVi) && (
                <Typography variant="caption" color="text.secondary">
                    Đơn vị SX: {item.ProductionUnit || item.MaDonVi}
                </Typography>
            )}
        </Stack>
    );
}
