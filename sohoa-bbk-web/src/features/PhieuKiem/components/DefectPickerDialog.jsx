import { useMemo, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SearchIcon from "@mui/icons-material/Search";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { getAssetUrl } from "../../../api/lookup.api";
import ResponsiveInspectionDialog from "./ResponsiveInspectionDialog";

const normalize = (value) => String(value || "").trim().toLocaleLowerCase("vi");

const defectColor = (type) => {
    const normalized = String(type || "").toUpperCase();
    if (normalized === "CRITICAL" || normalized === "NGHIÊM TRỌNG") return "error";
    if (normalized === "MAJOR" || normalized === "NẶNG") return "warning";
    return "primary";
};

const defectImages = (defect) => {
    let urls = [];
    if (Array.isArray(defect?.ImageUrls)) {
        urls = defect.ImageUrls;
    } else if (defect?.ImageUrls) {
        try {
            const parsed = JSON.parse(defect.ImageUrls);
            urls = Array.isArray(parsed) ? parsed : [];
        } catch {
            urls = String(defect.ImageUrls).split(",").map((item) => item.trim());
        }
    }
    if (defect?.ImageUrl) urls.unshift(defect.ImageUrl);
    return [...new Set(urls.filter(Boolean))];
};

export default function DefectPickerDialog({
    defects = [],
    onSelect,
    disabled = false,
    buttonLabel = "Chọn lỗi",
    title = "Chọn lỗi",
    fullWidth = false
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filteredDefects = useMemo(() => {
        const keyword = normalize(search);
        if (!keyword) return defects;
        return defects.filter((defect) => [
            defect.MaLoi,
            defect.TenLoi,
            defect.MoTa,
            defect.DefectType,
            defect.TenSanPham,
            defect.ChungLoai,
            defect.PhamViApDung,
            defect.GhiChu
        ].some((value) => normalize(value).includes(keyword)));
    }, [defects, search]);

    const handleClose = () => {
        setOpen(false);
        setSearch("");
    };

    const handleSelect = (defect) => {
        onSelect?.(defect);
        handleClose();
    };

    return (
        <>
            <Button
                variant="outlined"
                startIcon={<AddCircleOutlineIcon />}
                disabled={disabled}
                fullWidth={fullWidth}
                onClick={() => setOpen(true)}
                sx={{ minHeight: 44 }}
            >
                {buttonLabel}
            </Button>
            <ResponsiveInspectionDialog
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>{title}</DialogTitle>
                <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2 } }}>
                    <TextField
                        autoFocus
                        fullWidth
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Tìm mã lỗi / tên lỗi..."
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                )
                            }
                        }}
                        sx={{ mb: 2 }}
                    />
                    {filteredDefects.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
                            <SearchIcon sx={{ fontSize: 44, color: "grey.400" }} />
                            <Typography>Không tìm thấy mã lỗi phù hợp</Typography>
                        </Box>
                    ) : (
                        <Stack spacing={1.5}>
                            {filteredDefects.map((defect) => {
                                const images = defectImages(defect);
                                return (
                                <Card key={defect.Id} variant="outlined" sx={{ overflow: "hidden" }}>
                                    <CardActionArea onClick={() => handleSelect(defect)}>
                                        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                                        <Chip
                                                            size="small"
                                                            color={defectColor(defect.DefectType)}
                                                            label={defect.DefectType || "---"}
                                                            sx={{ fontWeight: 800 }}
                                                        />
                                                        <Typography variant="body2" color="text.secondary" fontWeight={800}>
                                                            {defect.MaLoi || "---"}
                                                        </Typography>
                                                    </Stack>
                                                    <Typography fontWeight={800} sx={{ mt: 0.75 }}>
                                                        {defect.TenLoi || "---"}
                                                    </Typography>
                                                </Box>
                                                <AddCircleOutlineIcon color="primary" />
                                            </Stack>
                                            {defect.MoTa && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
                                                    {defect.MoTa}
                                                </Typography>
                                            )}
                                            {(defect.TenSanPham || defect.ChungLoai) && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                                                    {[defect.TenSanPham, defect.ChungLoai].filter(Boolean).join(" - ")}
                                                </Typography>
                                            )}
                                        </CardContent>
                                        {images.length > 0 && (
                                            <Box
                                                sx={{
                                                    display: "grid",
                                                    gridTemplateColumns: images.length === 1 ? "1fr" : "repeat(2, minmax(0, 1fr))",
                                                    gap: 0.5,
                                                    p: 0.5,
                                                    bgcolor: "grey.100",
                                                    borderTop: "1px solid",
                                                    borderColor: "divider"
                                                }}
                                            >
                                                {images.map((url, imageIndex) => (
                                                    <Box
                                                        key={`${url}-${imageIndex}`}
                                                        component="img"
                                                        src={getAssetUrl(url)}
                                                        alt={`Ảnh lỗi ${defect.MaLoi || defect.TenLoi || ""} ${imageIndex + 1}`}
                                                        loading="lazy"
                                                        sx={{
                                                            width: "100%",
                                                            height: images.length === 1 ? { xs: 190, sm: 260 } : { xs: 130, sm: 180 },
                                                            objectFit: "contain",
                                                            bgcolor: "common.white",
                                                            borderRadius: 1
                                                        }}
                                                    />
                                                ))}
                                            </Box>
                                        )}
                                        {(defect.PhamViApDung || defect.GhiChu) && (
                                            <Stack
                                                direction="row"
                                                spacing={1}
                                                alignItems="flex-start"
                                                sx={{ m: 1.5, p: 1, bgcolor: "rgba(37, 99, 235, 0.08)", borderRadius: 1.5, color: "primary.dark" }}
                                            >
                                                <WarningAmberOutlinedIcon fontSize="small" />
                                                <Typography variant="caption" sx={{ whiteSpace: "pre-wrap" }}>
                                                    {defect.PhamViApDung || defect.GhiChu}
                                                </Typography>
                                            </Stack>
                                        )}
                                    </CardActionArea>
                                </Card>
                                );
                            })}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ pb: { xs: "calc(12px + env(safe-area-inset-bottom))", sm: 1 } }}>
                    <Button onClick={handleClose}>Đóng</Button>
                </DialogActions>
            </ResponsiveInspectionDialog>
        </>
    );
}
