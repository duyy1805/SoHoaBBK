import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import BugReportIcon from "@mui/icons-material/BugReport";
import ImageIcon from "@mui/icons-material/Image";

import {
    getDefectList,
    createDefect,
    updateDefect,
    deleteDefect,
    getAssetUrl,
    uploadDefectImage
} from "../../../api/lookup.api";

const emptyForm = {
    TenLoi: "",
    MaLoi: "",
    DefectType: "MAJOR",
    MoTa: "",
    GhiChu: "",
    MaNhomLoi: "",
    LoaiLoiSXBT: "",
    PhamViApDung: "",
    ThiTruong: "",
    ImageUrl: "",
    ThuTu: "",
    TrangThai: true
};

const cellSx = {
    py: 1,
    px: 1.5,
    fontSize: 14,
    borderColor: "#e5e7eb",
    verticalAlign: "middle"
};

const headerCellSx = {
    ...cellSx,
    py: 1.25,
    fontSize: 13,
    fontWeight: 700,
    color: "text.secondary",
    bgcolor: "#f8fafc",
    whiteSpace: "nowrap"
};

const clampTextSx = {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    lineHeight: 1.35
};

const getDefectTypeProps = (type) => {
    switch (type) {
        case "CRITICAL":
            return { color: "error", label: "CRITICAL" };
        case "MAJOR":
            return { color: "warning", label: "MAJOR" };
        case "MINOR":
            return { color: "info", label: "MINOR" };
        default:
            return { color: "default", label: type || "UNKNOWN" };
    }
};

export default function DefectManager() {
    const [data, setData] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [previewImage, setPreviewImage] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getDefectList();
            setData(res?.data || []);
            setError("");
        } catch (err) {
            setError("Không thể tải dữ liệu: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    const filteredData = useMemo(() => {
        const value = keyword.trim().toLowerCase();
        if (!value) return data;

        return data.filter((row) =>
            [
                row.MaLoi,
                row.TenLoi,
                row.MoTa,
                row.GhiChu,
                row.PhamViApDung,
                row.ThiTruong,
                row.MaNhomLoi,
                row.LoaiLoiSXBT
            ].some((field) => String(field || "").toLowerCase().includes(value))
        );
    }, [data, keyword]);

    const handleOpenCreate = () => {
        setForm(emptyForm);
        setImageFile(null);
        setImagePreview("");
        setOpen(true);
    };

    const handleOpenEdit = (row) => {
        setForm({
            ...emptyForm,
            ...row,
            PhamViApDung: row.PhamViApDung || "",
            TrangThai: row.TrangThai !== false && row.TrangThai !== 0,
            ThuTu: row.ThuTu ?? ""
        });
        setImageFile(null);
        setImagePreview("");
        setOpen(true);
    };

    const buildPayload = () => ({
        ...form,
        TenLoi: form.TenLoi?.trim(),
        MaLoi: form.MaLoi?.trim() || null,
        DefectType: form.DefectType || "MAJOR",
        MoTa: form.MoTa || form.TenLoi || null,
        GhiChu: form.GhiChu || null,
        PhanHe: form.PhanHe || null,
        MaNhomLoi: form.MaNhomLoi || null,
        LoaiLoiSXBT: form.LoaiLoiSXBT || null,
        PhamViApDung: form.PhamViApDung || null,
        ThiTruong: form.ThiTruong || null,
        ImageUrl: form.ImageUrl || null,
        ThuTu: form.ThuTu === "" || form.ThuTu == null ? null : Number(form.ThuTu),
        TrangThai: form.TrangThai !== false && form.TrangThai !== 0
    });

    const handleImageChange = (event) => {
        const file = event.target.files?.[0] || null;
        setImageFile(file);
        setImagePreview(file ? URL.createObjectURL(file) : "");
        event.target.value = "";
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview("");
        setForm({ ...form, ImageUrl: "" });
    };

    const handleSave = async () => {
        if (!form.TenLoi || !form.DefectType) return;

        try {
            let imageUrl = form.ImageUrl || null;
            if (imageFile) {
                const uploadRes = await uploadDefectImage(imageFile, {
                    maLoi: form.MaLoi,
                    tenLoi: form.TenLoi
                });
                imageUrl = uploadRes?.data?.imageUrl || imageUrl;
            }

            const payload = {
                ...buildPayload(),
                ImageUrl: imageUrl
            };

            if (form.Id) {
                await updateDefect(form.Id, payload);
            } else {
                await createDefect(payload);
            }

            setOpen(false);
            setImageFile(null);
            setImagePreview("");
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || "Có lỗi xảy ra khi lưu");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa mã lỗi này?")) return;

        try {
            await deleteDefect(id);
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || "Không thể xoá");
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
            {error && (
                <Alert severity="error" onClose={() => setError("")} sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Stack
                direction={{ xs: "column", lg: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", lg: "center" }}
                spacing={2}
                sx={{ mb: 3, width: "100%", minWidth: 0 }}
            >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flexWrap: "wrap" }}>
                    <BugReportIcon color="primary" fontSize="large" />
                    <Typography variant="h5" fontWeight={700} sx={{ minWidth: 0 }}>
                        Danh mục lỗi dùng chung
                    </Typography>
                    <Chip label={`${filteredData.length}/${data.length}`} size="small" />
                </Stack>

                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{ width: { xs: "100%", lg: "auto" }, minWidth: 0, flexShrink: 1 }}
                >
                    <TextField
                        size="small"
                        label="Tìm lỗi"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        sx={{ minWidth: 0, width: { xs: "100%", sm: 320, lg: 420 }, maxWidth: "100%" }}
                    />
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate} sx={{ whiteSpace: "nowrap" }}>
                        Thêm lỗi mới
                    </Button>
                </Stack>
            </Stack>

            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", maxWidth: "100%" }}>
                <TableContainer component={Paper} sx={{ position: "relative", boxShadow: "none", width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                    {loading && (
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                bgcolor: "rgba(255,255,255,0.7)",
                                zIndex: 10
                            }}
                        >
                            <CircularProgress />
                        </Box>
                    )}

                    <Table size="small" stickyHeader sx={{ minWidth: 1100, "& tbody tr:hover": { bgcolor: "#f8fbff" } }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ ...headerCellSx, width: 78 }}>STT</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 130 }}>Mã lỗi</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 300 }}>Tên / mô tả lỗi</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 120 }}>Phân loại</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 90 }} align="center">Loại</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 180 }}>Phạm vi</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 130 }}>Thị trường</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 110 }} align="center">Ảnh</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 120 }} align="center">Trạng thái</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 100 }} align="right">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {filteredData.length === 0 && !loading ? (
                                <TableRow>
                                    <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                                        <BugReportIcon sx={{ fontSize: 60, color: "text.disabled", mb: 1 }} />
                                        <Typography variant="h6" color="text.secondary">Chưa có dữ liệu lỗi</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Bấm "Thêm lỗi mới" để tạo danh mục lỗi.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((row, index) => (
                                    <TableRow key={row.Id} hover>
                                        <TableCell sx={cellSx}>
                                            <Typography variant="body2" color="text.secondary" fontWeight={700}>
                                                {row.ThuTu || index + 1}
                                            </Typography>
                                        </TableCell>

                                        <TableCell sx={cellSx}>
                                            <Tooltip title={row.MaLoi || ""}>
                                                <Chip
                                                    label={row.MaLoi || "--"}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{
                                                        maxWidth: "100%",
                                                        borderRadius: 1,
                                                        fontWeight: 700,
                                                        color: "text.primary",
                                                        "& .MuiChip-label": {
                                                            display: "block",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis"
                                                        }
                                                    }}
                                                />
                                            </Tooltip>
                                            {row.PhanHe && (
                                                <Typography variant="caption" display="block" color="text.disabled" sx={{ mt: 0.5 }}>
                                                    {row.PhanHe}
                                                </Typography>
                                            )}
                                        </TableCell>

                                        <TableCell sx={cellSx}>
                                            <Tooltip title={row.TenLoi || ""}>
                                                <Typography variant="body2" fontWeight={700} sx={clampTextSx}>
                                                    {row.TenLoi}
                                                </Typography>
                                            </Tooltip>
                                            {row.MoTa && row.MoTa !== row.TenLoi && (
                                                <Typography variant="caption" color="text.secondary" sx={clampTextSx}>
                                                    {row.MoTa}
                                                </Typography>
                                            )}
                                            {row.GhiChu && (
                                                <Typography variant="caption" color="primary.main" sx={clampTextSx}>
                                                    {row.GhiChu}
                                                </Typography>
                                            )}
                                        </TableCell>

                                        <TableCell sx={cellSx}>
                                            <Chip
                                                label={getDefectTypeProps(row.DefectType).label}
                                                color={getDefectTypeProps(row.DefectType).color}
                                                size="small"
                                                sx={{ fontWeight: 700, borderRadius: 1 }}
                                            />
                                        </TableCell>

                                        <TableCell sx={cellSx} align="center">
                                            {row.LoaiLoiSXBT ? (
                                                <Chip
                                                    label={row.LoaiLoiSXBT}
                                                    color="warning"
                                                    size="small"
                                                    sx={{ width: 34, height: 26, borderRadius: "50%", fontWeight: 800 }}
                                                />
                                            ) : "--"}
                                        </TableCell>

                                        <TableCell sx={cellSx}>
                                            <Tooltip title={row.PhamViApDung || ""}>
                                                <Typography
                                                    variant="body2"
                                                    color={row.PhamViApDung ? "text.primary" : "text.disabled"}
                                                    sx={clampTextSx}
                                                >
                                                    {row.PhamViApDung || "--"}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>

                                        <TableCell sx={cellSx}>
                                            <Typography variant="body2" noWrap color={row.ThiTruong ? "text.primary" : "text.disabled"}>
                                                {row.ThiTruong || "--"}
                                            </Typography>
                                        </TableCell>

                                        <TableCell sx={cellSx} align="center">
                                            {row.ImageUrl ? (
                                                <Tooltip title="Xem ảnh lỗi">
                                                    <Box
                                                        component="button"
                                                        type="button"
                                                        onClick={() => setPreviewImage(getAssetUrl(row.ImageUrl))}
                                                        sx={{
                                                            width: 58,
                                                            height: 44,
                                                            p: 0,
                                                            border: "1px solid",
                                                            borderColor: "divider",
                                                            borderRadius: 1,
                                                            overflow: "hidden",
                                                            cursor: "pointer",
                                                            bgcolor: "#f8fafc"
                                                        }}
                                                    >
                                                        <Box
                                                            component="img"
                                                            src={getAssetUrl(row.ImageUrl)}
                                                            alt={row.TenLoi || "Ảnh lỗi"}
                                                            sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                                        />
                                                    </Box>
                                                </Tooltip>
                                            ) : (
                                                <ImageIcon sx={{ color: "text.disabled", fontSize: 22 }} />
                                            )}
                                        </TableCell>

                                        <TableCell sx={cellSx} align="center">
                                            <Chip
                                                label={row.TrangThai ? "Hoạt động" : "Tạm ngưng"}
                                                color={row.TrangThai ? "success" : "default"}
                                                size="small"
                                                variant="outlined"
                                                sx={{ borderRadius: 1, height: 24, fontSize: 12 }}
                                            />
                                        </TableCell>

                                        <TableCell sx={cellSx} align="right">
                                            <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                                                <Tooltip title="Chỉnh sửa">
                                                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(row)}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>

                                                <Tooltip title="Xóa">
                                                    <IconButton size="small" color="error" onClick={() => handleDelete(row.Id)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {form.Id ? "Cập nhật thông tin lỗi" : "Thêm mã lỗi mới"}
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Mã lỗi"
                                fullWidth
                                placeholder="Tự sinh nếu để trống"
                                value={form.MaLoi || ""}
                                onChange={(event) => setForm({ ...form, MaLoi: event.target.value })}
                            />
                            <TextField
                                label="STT"
                                type="number"
                                sx={{ width: { sm: 160 } }}
                                value={form.ThuTu ?? ""}
                                onChange={(event) => setForm({ ...form, ThuTu: event.target.value })}
                            />
                        </Stack>

                        <TextField
                            label="Tên lỗi"
                            required
                            fullWidth
                            multiline
                            minRows={2}
                            placeholder="Ví dụ: Thùng móp méo, Vải không đạt yêu cầu..."
                            value={form.TenLoi || ""}
                            onChange={(event) => setForm({ ...form, TenLoi: event.target.value })}
                        />

                        <TextField
                            label="Mô tả chi tiết"
                            fullWidth
                            multiline
                            minRows={2}
                            value={form.MoTa || ""}
                            onChange={(event) => setForm({ ...form, MoTa: event.target.value })}
                        />

                        <TextField
                            label="Ghi chú / Lưu ý"
                            fullWidth
                            value={form.GhiChu || ""}
                            onChange={(event) => setForm({ ...form, GhiChu: event.target.value })}
                        />

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                select
                                label="Phân loại độ nghiêm trọng"
                                required
                                fullWidth
                                value={form.DefectType || "MAJOR"}
                                onChange={(event) => setForm({ ...form, DefectType: event.target.value })}
                            >
                                <MenuItem value="CRITICAL">
                                    <Typography color="error.main" fontWeight={600}>CRITICAL (Nghiêm trọng)</Typography>
                                </MenuItem>
                                <MenuItem value="MAJOR">
                                    <Typography color="warning.main" fontWeight={600}>MAJOR (Nặng)</Typography>
                                </MenuItem>
                                <MenuItem value="MINOR">
                                    <Typography color="info.main" fontWeight={600}>MINOR (Nhẹ)</Typography>
                                </MenuItem>
                            </TextField>

                            <TextField
                                select
                                label="Trạng thái"
                                fullWidth
                                value={form.TrangThai ? "1" : "0"}
                                onChange={(event) => setForm({ ...form, TrangThai: event.target.value === "1" })}
                            >
                                <MenuItem value="1">Hoạt động</MenuItem>
                                <MenuItem value="0">Tạm ngưng</MenuItem>
                            </TextField>
                        </Stack>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Mã nhóm lỗi"
                                fullWidth
                                value={form.MaNhomLoi || ""}
                                onChange={(event) => setForm({ ...form, MaNhomLoi: event.target.value })}
                            />
                            <TextField
                                label="Loại B/C"
                                fullWidth
                                value={form.LoaiLoiSXBT || ""}
                                onChange={(event) => setForm({ ...form, LoaiLoiSXBT: event.target.value })}
                            />
                        </Stack>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Phạm vi áp dụng"
                                fullWidth
                                multiline
                                minRows={2}
                                value={form.PhamViApDung || ""}
                                onChange={(event) => setForm({ ...form, PhamViApDung: event.target.value })}
                            />
                            <TextField
                                label="Thị trường"
                                fullWidth
                                value={form.ThiTruong || ""}
                                onChange={(event) => setForm({ ...form, ThiTruong: event.target.value })}
                            />
                        </Stack>

                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "#f8fafc" }}>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
                                <Box
                                    sx={{
                                        width: 112,
                                        height: 84,
                                        borderRadius: 1.5,
                                        border: "1px solid",
                                        borderColor: "divider",
                                        overflow: "hidden",
                                        bgcolor: "white",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0
                                    }}
                                >
                                    {imagePreview || form.ImageUrl ? (
                                        <Box
                                            component="img"
                                            src={imagePreview || getAssetUrl(form.ImageUrl)}
                                            alt="Ảnh lỗi"
                                            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        />
                                    ) : (
                                        <ImageIcon sx={{ color: "text.disabled", fontSize: 36 }} />
                                    )}
                                </Box>

                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography fontWeight={700}>Ảnh lỗi</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                        Chọn ảnh từ máy. Hệ thống sẽ đổi tên, nén ảnh và lưu đường dẫn vào dữ liệu lỗi.
                                    </Typography>
                                    {form.ImageUrl && !imageFile && (
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                                            Ảnh hiện tại: {form.ImageUrl}
                                        </Typography>
                                    )}
                                    {imageFile && (
                                        <Typography variant="caption" color="primary.main" sx={{ display: "block", mt: 0.75 }}>
                                            Ảnh mới: {imageFile.name}
                                        </Typography>
                                    )}
                                </Box>

                                <Stack direction={{ xs: "row", sm: "column" }} spacing={1}>
                                    <Button variant="outlined" component="label">
                                        Chọn ảnh
                                        <input hidden accept="image/*" type="file" onChange={handleImageChange} />
                                    </Button>
                                    {(form.ImageUrl || imageFile) && (
                                        <Button color="error" onClick={handleRemoveImage}>
                                            Xóa ảnh
                                        </Button>
                                    )}
                                </Stack>
                            </Stack>
                        </Paper>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, bgcolor: "#f8fafc" }}>
                    <Button onClick={() => setOpen(false)} color="inherit">
                        Hủy bỏ
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={!form.TenLoi || !form.DefectType}
                    >
                        {form.Id ? "Cập nhật" : "Lưu dữ liệu"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(previewImage)} onClose={() => setPreviewImage("")} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Ảnh lỗi</DialogTitle>
                <DialogContent dividers>
                    <Box
                        component="img"
                        src={previewImage}
                        alt="Ảnh lỗi"
                        sx={{ display: "block", width: "100%", maxHeight: 520, objectFit: "contain" }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewImage("")}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
