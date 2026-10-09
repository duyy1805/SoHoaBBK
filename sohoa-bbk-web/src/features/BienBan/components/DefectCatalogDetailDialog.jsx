import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    Stack,
    Typography
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import { getAssetUrl } from "../../../api/lookup.api";

const parseImages = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed].filter(Boolean);
    } catch {
        return String(value).split(",").map((item) => item.trim()).filter(Boolean);
    }
};

const catalogImages = (catalog) => [...new Set([
    ...parseImages(catalog?.ImageUrls),
    ...parseImages(catalog?.ImageUrl)
])];

const DetailField = ({ label, value }) => value ? (
    <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
        <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{value}</Typography>
    </Box>
) : null;

export function DefectDetailTrigger({ defect, onOpen, children, fullWidth = false }) {
    const label = children || [defect?.MaLoi, defect?.TenLoi || defect?.TenLoiTuNhap]
        .filter(Boolean).join(" – ") || "Xem chi tiết lỗi";
    return (
        <Button
            type="button"
            variant="text"
            size="small"
            startIcon={<InfoOutlinedIcon fontSize="small" />}
            onClick={(event) => {
                event.stopPropagation();
                onOpen?.(defect);
            }}
            fullWidth={fullWidth}
            sx={{
                justifyContent: "flex-start",
                textAlign: "left",
                textTransform: "none",
                fontWeight: 750,
                px: 0.5,
                minWidth: 0,
                whiteSpace: "normal",
                overflowWrap: "anywhere"
            }}
        >
            {label}
        </Button>
    );
}

export function DefectTreatmentSuggestion({ defect, compact = false }) {
    const suggestion = defect?.CatalogDetail?.PhuongAnXuLy;
    if (!suggestion) return null;
    return (
        <Stack
            direction="row"
            spacing={0.75}
            alignItems="flex-start"
            sx={{
                mt: compact ? 0.5 : 1,
                p: compact ? 0.75 : 1,
                borderRadius: 1.25,
                bgcolor: "rgba(245, 158, 11, 0.10)",
                border: "1px solid rgba(245, 158, 11, 0.28)",
                color: "#854d0e"
            }}
        >
            <LightbulbOutlinedIcon sx={{ fontSize: compact ? 17 : 19, mt: "1px", flexShrink: 0 }} />
            <Typography variant="caption" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.45 }}>
                <Box component="span" fontWeight={800}>Gợi ý xử lý từ danh mục: </Box>
                {suggestion}
            </Typography>
        </Stack>
    );
}

export default function DefectCatalogDetailDialog({ defect, open, onClose }) {
    const catalog = defect?.CatalogDetail || null;
    const images = catalogImages(catalog);
    const title = catalog?.TenLoi || defect?.TenLoi || defect?.TenLoiTuNhap || "Chi tiết lỗi";
    const code = catalog?.MaLoi || defect?.MaLoi;
    const type = catalog?.DefectType || defect?.DefectType;

    return (
        <Dialog open={Boolean(open)} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
            <DialogTitle sx={{ pr: 3 }}>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                    <Typography variant="h6" component="span" fontWeight={850}>{title}</Typography>
                    {code && <Chip size="small" variant="outlined" label={code} />}
                    {type && <Chip size="small" color="warning" variant="outlined" label={type} />}
                </Stack>
            </DialogTitle>
            <DialogContent dividers>
                {!catalog ? (
                    <Alert severity="info">
                        Mã lỗi này không còn thông tin trong danh mục. Nội dung bên dưới là dữ liệu đã lưu trên hồ sơ.
                    </Alert>
                ) : (
                    <Stack spacing={2.25}>
                        <DetailField label="Mô tả lỗi" value={catalog.MoTa} />
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}><DetailField label="Mã nhóm lỗi" value={catalog.MaNhomLoi} /></Grid>
                            <Grid size={{ xs: 12, sm: 6 }}><DetailField label="Phân hệ" value={catalog.PhanHe} /></Grid>
                            <Grid size={{ xs: 12, sm: 6 }}><DetailField label="Sản phẩm" value={catalog.TenSanPham} /></Grid>
                            <Grid size={{ xs: 12, sm: 6 }}><DetailField label="Chủng loại" value={catalog.ChungLoai} /></Grid>
                            <Grid size={{ xs: 12, sm: 6 }}><DetailField label="Phạm vi áp dụng" value={catalog.PhamViApDung} /></Grid>
                            <Grid size={{ xs: 12, sm: 6 }}><DetailField label="Thị trường" value={catalog.ThiTruong} /></Grid>
                            <Grid size={{ xs: 12, sm: 6 }}><DetailField label="Loại lỗi SXBT" value={catalog.LoaiLoiSXBT} /></Grid>
                        </Grid>
                        {catalog.GhiChu && <><Divider /><DetailField label="Ghi chú / Lưu ý" value={catalog.GhiChu} /></>}
                        <DefectTreatmentSuggestion defect={defect} />
                        {images.length > 0 && (
                            <Stack spacing={1}>
                                <Typography variant="subtitle2" fontWeight={800}>Ảnh minh họa từ danh mục</Typography>
                                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1 }}>
                                    {images.map((url, index) => (
                                        <Box
                                            key={`${url}-${index}`}
                                            component="img"
                                            src={getAssetUrl(url)}
                                            alt={`Ảnh minh họa lỗi ${code || title} ${index + 1}`}
                                            loading="lazy"
                                            sx={{ width: "100%", maxHeight: 320, objectFit: "contain", bgcolor: "grey.50", borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}
                                        />
                                    ))}
                                </Box>
                            </Stack>
                        )}
                    </Stack>
                )}
                {!catalog && defect && (
                    <Stack spacing={1.25} sx={{ mt: 2 }}>
                        <DetailField label="Tên lỗi đã lưu" value={defect.TenLoi || defect.TenLoiTuNhap} />
                        <DetailField label="Mô tả đã lưu" value={defect.MoTa} />
                        <DetailField label="Ghi chú trên hồ sơ" value={defect.GhiChu} />
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained">Đóng</Button>
            </DialogActions>
        </Dialog>
    );
}
