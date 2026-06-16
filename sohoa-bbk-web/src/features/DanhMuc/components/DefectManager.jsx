import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    Checkbox,
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
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import {
    getDefectList,
    createDefect,
    updateDefect,
    deleteDefect,
    getAssetUrl,
    uploadDefectImage,
    importDefectExcel,
    downloadDefectTemplate
} from "../../../api/lookup.api";

const emptyForm = {
    TenLoi: "",
    MaLoi: "",
    DefectType: "MAJOR",
    MoTa: "",
    GhiChu: "",
    PhuongAnXuLy: "",
    MaNhomLoi: "",
    LoaiLoiSXBT: "",
    TenSanPham: "",
    ChungLoai: "",
    PhamViApDung: "",
    ThiTruong: "",
    ImageUrl: "",
    ThuTu: "",
    TrangThai: true
};

const phamViApDungOptions = [
    "Kiểm đầu vào",
    "Kiểm công đoạn",
    "Kiểm hoàn chỉnh"
];

const splitPhamViApDung = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
};

const joinPhamViApDung = (value) => splitPhamViApDung(value).join(", ");

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

const getDefectTypeOptions = (loaiLoiSXBT) => {
    if (loaiLoiSXBT === "C") {
        return [{ value: "CRITICAL", label: "CRITICAL (Nghiêm trọng)", color: "error.main" }];
    }

    if (loaiLoiSXBT === "B") {
        return [
            { value: "MAJOR", label: "MAJOR (Nặng)", color: "warning.main" },
            { value: "MINOR", label: "MINOR (Nhẹ)", color: "info.main" }
        ];
    }

    return [
        { value: "CRITICAL", label: "CRITICAL (Nghiêm trọng)", color: "error.main" },
        { value: "MAJOR", label: "MAJOR (Nặng)", color: "warning.main" },
        { value: "MINOR", label: "MINOR (Nhẹ)", color: "info.main" }
    ];
};

const normalizeDefectType = (loaiLoiSXBT, defectType) => {
    if (loaiLoiSXBT === "C") return "CRITICAL";
    if (loaiLoiSXBT === "B" && defectType === "CRITICAL") return "MAJOR";
    return defectType || "MAJOR";
};

const emptyFilters = {
    DefectType: "",
    LoaiLoiSXBT: "",
    TenSanPham: "",
    ChungLoai: "",
    PhamViApDung: "",
    ThiTruong: "",
    TrangThai: ""
};

const getUniqueOptions = (rows, field) =>
    Array.from(new Set(
        rows
            .map((row) => String(row[field] || "").trim())
            .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, "vi"));

const getUniqueScopeOptions = (rows) =>
    Array.from(new Set(rows.flatMap((row) => splitPhamViApDung(row.PhamViApDung))))
        .sort((a, b) => a.localeCompare(b, "vi"));

export default function DefectManager() {
    const [data, setData] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [filters, setFilters] = useState(emptyFilters);
    const [previewImage, setPreviewImage] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [importOpen, setImportOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

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

    const filterOptions = useMemo(() => ({
        TenSanPham: getUniqueOptions(data, "TenSanPham"),
        ChungLoai: getUniqueOptions(data, "ChungLoai"),
        PhamViApDung: getUniqueScopeOptions(data),
        ThiTruong: getUniqueOptions(data, "ThiTruong")
    }), [data]);

    const hasActiveFilters = useMemo(
        () => keyword.trim() || Object.values(filters).some(Boolean),
        [filters, keyword]
    );

    const filteredData = useMemo(() => {
        const value = keyword.trim().toLowerCase();
        return data.filter((row) => {
            const matchesKeyword = !value || [
                row.MaLoi,
                row.TenLoi,
                row.MoTa,
                row.GhiChu,
                row.PhuongAnXuLy,
                row.TenSanPham,
                row.ChungLoai,
                row.PhamViApDung,
                row.ThiTruong,
                row.MaNhomLoi,
                row.LoaiLoiSXBT
            ].some((field) => String(field || "").toLowerCase().includes(value));

            const matchesFilters =
                (!filters.DefectType || row.DefectType === filters.DefectType) &&
                (!filters.LoaiLoiSXBT || row.LoaiLoiSXBT === filters.LoaiLoiSXBT) &&
                (!filters.TenSanPham || row.TenSanPham === filters.TenSanPham) &&
                (!filters.ChungLoai || row.ChungLoai === filters.ChungLoai) &&
                (!filters.PhamViApDung || splitPhamViApDung(row.PhamViApDung).includes(filters.PhamViApDung)) &&
                (!filters.ThiTruong || row.ThiTruong === filters.ThiTruong) &&
                (!filters.TrangThai || String(row.TrangThai !== false && row.TrangThai !== 0) === filters.TrangThai);

            return matchesKeyword && matchesFilters;
        });
    }, [data, filters, keyword]);

    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setKeyword("");
        setFilters(emptyFilters);
    };

    const handleOpenCreate = useCallback(() => {
        setForm(emptyForm);
        setImageFile(null);
        setImagePreview("");
        setOpen(true);
    }, []);

    const handleOpenEdit = useCallback((row) => {
        setForm({
            ...emptyForm,
            ...row,
            PhamViApDung: row.PhamViApDung || "",
            PhuongAnXuLy: row.PhuongAnXuLy || "",
            TenSanPham: row.TenSanPham || "",
            ChungLoai: row.ChungLoai || "",
            DefectType: normalizeDefectType(row.LoaiLoiSXBT, row.DefectType),
            TrangThai: row.TrangThai !== false && row.TrangThai !== 0,
            ThuTu: row.ThuTu ?? ""
        });
        setImageFile(null);
        setImagePreview("");
        setOpen(true);
    }, []);

    const buildPayload = () => ({
        ...form,
        TenLoi: form.TenLoi?.trim(),
        MaLoi: form.MaLoi?.trim() || null,
        DefectType: normalizeDefectType(form.LoaiLoiSXBT, form.DefectType),
        MoTa: form.MoTa || form.TenLoi || null,
        GhiChu: form.GhiChu || null,
        PhuongAnXuLy: form.PhuongAnXuLy || null,
        PhanHe: form.PhanHe || null,
        MaNhomLoi: form.MaNhomLoi || null,
        LoaiLoiSXBT: form.LoaiLoiSXBT || null,
        TenSanPham: form.TenSanPham || null,
        ChungLoai: form.ChungLoai || null,
        PhamViApDung: joinPhamViApDung(form.PhamViApDung) || null,
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
        setForm((prev) => ({ ...prev, ImageUrl: "" }));
    };

    const handleLoaiLoiChange = useCallback((value) => {
        setForm((prev) => ({
            ...prev,
            LoaiLoiSXBT: value,
            DefectType: normalizeDefectType(value, prev.DefectType)
        }));
    }, []);

    const defectTypeOptions = getDefectTypeOptions(form.LoaiLoiSXBT);

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

    const handleDelete = useCallback(async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa mã lỗi này?")) return;

        try {
            await deleteDefect(id);
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || "Không thể xoá");
        }
    }, [loadData]);

    const handleDownloadTemplate = async () => {
        try {
            const res = await downloadDefectTemplate();
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.download = "mau-import-danh-muc-loi.xlsx";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.response?.data?.message || "Không tải được file mẫu import danh mục lỗi");
        }
    };

    const handleImportExcel = async () => {
        if (!importFile) return;

        try {
            setImporting(true);
            setImportResult(null);
            const res = await importDefectExcel(importFile);
            setImportResult({
                type: "success",
                message: res.data?.message || "Import thành công",
                summary: res.data?.summary
            });
            setImportFile(null);
            await loadData();
        } catch (err) {
            setImportResult({
                type: "error",
                message: err.response?.data?.message || "Import thất bại",
                errors: err.response?.data?.errors || []
            });
        } finally {
            setImporting(false);
        }
    };

    const tableBody = useMemo(() => {
        if (filteredData.length === 0 && !loading) {
            return (
                <TableRow>
                    <TableCell colSpan={13} align="center" sx={{ py: 6 }}>
                        <BugReportIcon sx={{ fontSize: 60, color: "text.disabled", mb: 1 }} />
                        <Typography variant="h6" color="text.secondary">Chưa có dữ liệu lỗi</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Bấm "Thêm lỗi mới" để tạo danh mục lỗi.
                        </Typography>
                    </TableCell>
                </TableRow>
            );
        }

        return filteredData.map((row, index) => (
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
                            {/* {row.PhanHe} */}
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
                    <Typography variant="body2" noWrap color={row.TenSanPham ? "text.primary" : "text.disabled"}>
                        {row.TenSanPham || "--"}
                    </Typography>
                </TableCell>

                <TableCell sx={cellSx}>
                    <Typography variant="body2" noWrap color={row.ChungLoai ? "text.primary" : "text.disabled"}>
                        {row.ChungLoai || "--"}
                    </Typography>
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
                    <Tooltip title={row.PhuongAnXuLy || ""}>
                        <Typography
                            variant="body2"
                            color={row.PhuongAnXuLy ? "text.primary" : "text.disabled"}
                            sx={clampTextSx}
                        >
                            {row.PhuongAnXuLy || "--"}
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
                                    loading="lazy"
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
        ));
    }, [filteredData, handleDelete, handleOpenEdit, loading]);

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
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={handleDownloadTemplate}
                        disabled={importing}
                        sx={{ whiteSpace: "nowrap" }}
                    >
                        Tải file mẫu
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<UploadFileIcon />}
                        onClick={() => {
                            setImportOpen(true);
                            setImportResult(null);
                        }}
                        sx={{ whiteSpace: "nowrap" }}
                    >
                        Import Excel
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate} sx={{ whiteSpace: "nowrap" }}>
                        Thêm lỗi mới
                    </Button>
                </Stack>
            </Stack>

            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: "#f8fafc" }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
                    <TextField
                        size="small"
                        label="Phân loại"
                        select
                        value={filters.DefectType}
                        onChange={(event) => handleFilterChange("DefectType", event.target.value)}
                        sx={{ minWidth: { md: 150 } }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="CRITICAL">CRITICAL</MenuItem>
                        <MenuItem value="MAJOR">MAJOR</MenuItem>
                        <MenuItem value="MINOR">MINOR</MenuItem>
                    </TextField>

                    <TextField
                        size="small"
                        label="Loại B/C"
                        select
                        value={filters.LoaiLoiSXBT}
                        onChange={(event) => handleFilterChange("LoaiLoiSXBT", event.target.value)}
                        sx={{ minWidth: { md: 120 } }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="B">B</MenuItem>
                        <MenuItem value="C">C</MenuItem>
                    </TextField>

                    <TextField
                        size="small"
                        label="Sản phẩm"
                        select
                        value={filters.TenSanPham}
                        onChange={(event) => handleFilterChange("TenSanPham", event.target.value)}
                        sx={{ minWidth: { md: 180 } }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        {filterOptions.TenSanPham.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        size="small"
                        label="Chủng loại"
                        select
                        value={filters.ChungLoai}
                        onChange={(event) => handleFilterChange("ChungLoai", event.target.value)}
                        sx={{ minWidth: { md: 160 } }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        {filterOptions.ChungLoai.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        size="small"
                        label="Phạm vi"
                        select
                        value={filters.PhamViApDung}
                        onChange={(event) => handleFilterChange("PhamViApDung", event.target.value)}
                        sx={{ minWidth: { md: 180 } }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        {filterOptions.PhamViApDung.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        size="small"
                        label="Thị trường"
                        select
                        value={filters.ThiTruong}
                        onChange={(event) => handleFilterChange("ThiTruong", event.target.value)}
                        sx={{ minWidth: { md: 150 } }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        {filterOptions.ThiTruong.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        size="small"
                        label="Trạng thái"
                        select
                        value={filters.TrangThai}
                        onChange={(event) => handleFilterChange("TrangThai", event.target.value)}
                        sx={{ minWidth: { md: 140 } }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="true">Hoạt động</MenuItem>
                        <MenuItem value="false">Tạm ngưng</MenuItem>
                    </TextField>

                    <Button variant="text" onClick={resetFilters} disabled={!hasActiveFilters} sx={{ whiteSpace: "nowrap" }}>
                        Xóa lọc
                    </Button>
                </Stack>
            </Paper>

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

                    <Table size="small" stickyHeader sx={{ minWidth: 1480, "& tbody tr:hover": { bgcolor: "#f8fbff" } }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ ...headerCellSx, width: 78 }}>STT</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 130 }}>Mã lỗi</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 300 }}>Tên / mô tả lỗi</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 120 }}>Phân loại</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 90 }} align="center">Loại</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 180 }}>Sản phẩm</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 150 }}>Chủng loại</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 180 }}>Phạm vi</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 190 }}>Phương án xử lý</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 130 }}>Thị trường</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 110 }} align="center">Ảnh</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 120 }} align="center">Trạng thái</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: 100 }} align="right">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>{tableBody}</TableBody>
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

                        <TextField
                            label="Phương án xử lý"
                            fullWidth
                            multiline
                            minRows={2}
                            placeholder="Ví dụ: Sửa lại, loại bỏ, trả NCC, phân loại lại..."
                            value={form.PhuongAnXuLy || ""}
                            onChange={(event) => setForm({ ...form, PhuongAnXuLy: event.target.value })}
                        />


                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                select
                                label="Loại B/C"
                                fullWidth
                                value={form.LoaiLoiSXBT || ""}
                                onChange={(event) => handleLoaiLoiChange(event.target.value)}
                            >
                                <MenuItem value="">Chưa phân loại</MenuItem>
                                <MenuItem value="B">B</MenuItem>
                                <MenuItem value="C">C</MenuItem>
                            </TextField>

                            <TextField
                                select
                                label="Phân loại độ nghiêm trọng"
                                required
                                fullWidth
                                value={normalizeDefectType(form.LoaiLoiSXBT, form.DefectType)}
                                onChange={(event) => setForm({ ...form, DefectType: event.target.value })}
                                disabled={form.LoaiLoiSXBT === "C"}
                            >
                                {defectTypeOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        <Typography color={option.color} fontWeight={600}>{option.label}</Typography>
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Stack>

                        {form.Id && (
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
                        )}

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Mã nhóm lỗi"
                                fullWidth
                                value={form.MaNhomLoi || ""}
                                onChange={(event) => setForm({ ...form, MaNhomLoi: event.target.value })}
                            />
                            <TextField
                                label="Tên sản phẩm"
                                fullWidth
                                value={form.TenSanPham || ""}
                                onChange={(event) => setForm({ ...form, TenSanPham: event.target.value })}
                            />
                        </Stack>

                        <TextField
                            label="Chủng loại"
                            fullWidth
                            value={form.ChungLoai || ""}
                            onChange={(event) => setForm({ ...form, ChungLoai: event.target.value })}
                        />

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                select
                                label="Phạm vi áp dụng"
                                fullWidth
                                value={splitPhamViApDung(form.PhamViApDung)}
                                onChange={(event) => setForm({ ...form, PhamViApDung: event.target.value })}
                                SelectProps={{
                                    multiple: true,
                                    renderValue: (selected) => selected.join(", ")
                                }}
                            >
                                {phamViApDungOptions.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        <Checkbox checked={splitPhamViApDung(form.PhamViApDung).includes(option)} />
                                        {option}
                                    </MenuItem>
                                ))}
                            </TextField>
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

            <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Import danh mục lỗi từ Excel
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2.5}>
                        <Alert severity="info">
                            File .xlsx cần có sheet <strong>DanhMucLoi</strong>. Cột bắt buộc: <strong>MaLoi</strong>, <strong>TenLoi</strong>. Cột <strong>Anh</strong> dùng để chèn ảnh trực tiếp vào ô cùng dòng.
                        </Alert>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <Button
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={handleDownloadTemplate}
                                disabled={importing}
                            >
                                Tải file mẫu
                            </Button>

                            <Button
                                variant="contained"
                                component="label"
                                startIcon={<UploadFileIcon />}
                                disabled={importing}
                            >
                                Chọn file .xlsx
                                <input
                                    hidden
                                    type="file"
                                    accept=".xlsx"
                                    onChange={(event) => {
                                        setImportFile(event.target.files?.[0] || null);
                                        setImportResult(null);
                                        event.target.value = "";
                                    }}
                                />
                            </Button>
                        </Stack>

                        {importFile && (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography fontWeight={600}>{importFile.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {(importFile.size / 1024).toFixed(1)} KB
                                </Typography>
                            </Paper>
                        )}

                        {importResult && (
                            <Alert severity={importResult.type}>
                                <Typography fontWeight={600}>{importResult.message}</Typography>

                                {importResult.summary && (
                                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                                        <Typography variant="body2">Tổng dòng: {importResult.summary.totalRows}</Typography>
                                        <Typography variant="body2">Tạo mới: {importResult.summary.created}</Typography>
                                        <Typography variant="body2">Cập nhật: {importResult.summary.updated}</Typography>
                                        <Typography variant="body2">Có ảnh: {importResult.summary.withImages}</Typography>
                                    </Stack>
                                )}
                            </Alert>
                        )}

                        {importResult?.errors?.length > 0 && (
                            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ width: 100, fontWeight: 600 }}>Dòng</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Lỗi</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {importResult.errors.map((item, index) => (
                                            <TableRow key={`${item.line}-${index}`}>
                                                <TableCell>{item.line}</TableCell>
                                                <TableCell>{item.message}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, bgcolor: "#f8fafc" }}>
                    <Button onClick={() => setImportOpen(false)} color="inherit" disabled={importing}>
                        Đóng
                    </Button>
                    <Button variant="contained" onClick={handleImportExcel} disabled={!importFile || importing}>
                        {importing ? "Đang import..." : "Import"}
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
