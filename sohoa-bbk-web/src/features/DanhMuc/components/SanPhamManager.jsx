import { Fragment, useEffect, useState, useMemo } from "react";
import {
    Box,
    Button,
    Card,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Stack,
    Chip,
    Autocomplete,
    TableContainer,
    Paper,
    Tooltip,
    Grid,
    Divider,
    Alert,
    InputAdornment,
    Collapse,
    CircularProgress
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import SettingsOverscanIcon from '@mui/icons-material/SettingsOverscan';
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ConfirmDialog from "../../../components/common/ConfirmDialog"
import SanPhamThongSoDialog from "./SanPhamThongSoDialog";
import {
    getSanPhamList,
    createSanPham,
    updateSanPham,
    deleteSanPham,
    getAssetUrl,
    exportSanPhamDanhMucKiem,
    exportSanPhamThongSo,
    importThongSoKiemExcel,
    downloadThongSoKiemTemplate,
    getSanPhamNhomKiem,
    createSanPhamNhomKiem,
    deleteSanPhamNhomKiem,
    getNhomKiemList,
    getCheckItemByNhom,
    uploadSanPhamImage,
    importSanPhamImages
} from "../../../api/lookup.api";

function CheckItemPreview({ items = [] }) {
    if (!items.length) {
        return <Alert severity="info">Nhóm này chưa có mục kiểm hoạt động.</Alert>;
    }

    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: "grey.100" }}>
                        <TableCell sx={{ width: 56, fontWeight: 650 }}>STT</TableCell>
                        <TableCell sx={{ minWidth: 180, fontWeight: 650 }}>Mục kiểm</TableCell>
                        <TableCell sx={{ minWidth: 150, fontWeight: 650 }}>Tham chiếu</TableCell>
                        <TableCell sx={{ minWidth: 190, fontWeight: 650 }}>Phương pháp kiểm</TableCell>
                        <TableCell sx={{ minWidth: 220, fontWeight: 650 }}>Tiêu chuẩn</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {[...items].sort((a, b) => (a.ThuTu || 0) - (b.ThuTu || 0)).map((item, index) => (
                        <TableRow key={item.Id || `${item.TenMucKiem}-${index}`}>
                            <TableCell>{item.ThuTu || index + 1}</TableCell>
                            <TableCell>
                                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                                    <Typography variant="body2" fontWeight={600}>{item.TenMucKiem}</Typography>
                                    {item.DiemTrongYeu && <Chip size="small" color="error" label="Trọng yếu" variant="outlined" />}
                                </Stack>
                            </TableCell>
                            <TableCell>{item.ThamChieu || "—"}</TableCell>
                            <TableCell>{item.PhuongPhapKiem || "—"}</TableCell>
                            <TableCell>{item.TieuChuan || "—"}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

export default function SanPhamManager() {
    const [data, setData] = useState([]);

    // State Sản phẩm
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({});

    const [searchQuery, setSearchQuery] = useState("");
    // State Nhóm kiểm & Thông số
    const [nhomDialog, setNhomDialog] = useState(false);
    const [thongSoDialog, setThongSoDialog] = useState(false);
    const [selectedSanPham, setSelectedSanPham] = useState(null);
    const [nhomData, setNhomData] = useState([]);
    const [nhomList, setNhomList] = useState([]);
    const [selectedNhomObj, setSelectedNhomObj] = useState(null);
    const [thuTu, setThuTu] = useState(1);
    const [expandedNhomId, setExpandedNhomId] = useState(null);
    const [nhomItems, setNhomItems] = useState({});
    const [loadingNhomId, setLoadingNhomId] = useState(null);
    const [nhomPreviewError, setNhomPreviewError] = useState("");

    const [page, setPage] = useState(0);
    const [pageSize] = useState(20);
    const [hasMore, setHasMore] = useState(true);
    const [exportingId, setExportingId] = useState(null);
    const [exportingThongSoId, setExportingThongSoId] = useState(null);
    const [importOpen, setImportOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [imageImportOpen, setImageImportOpen] = useState(false);
    const [imageImportFiles, setImageImportFiles] = useState([]);
    const [imageImportCustomer, setImageImportCustomer] = useState("");
    const [imageImporting, setImageImporting] = useState(false);
    const [imageImportResult, setImageImportResult] = useState(null);

    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");

    const loadData = async (reset = false, keyword = searchQuery) => {
        const currentPage = reset ? 0 : page;

        const res = await getSanPhamList(currentPage, pageSize, keyword);

        const newData = res.data.data || [];

        if (reset) {
            setData(newData);
        } else {
            setData(prev => [...prev, ...newData]);
        }

        setHasMore(newData.length === pageSize);
        setPage(currentPage + 1);
    };

    // useEffect(() => {
    //     loadData(true);
    // }, []);
    useEffect(() => {
        const timer = setTimeout(() => {
            loadData(true, searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        return () => {
            if (imagePreview?.startsWith?.("blob:")) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    // Logic tìm kiếm đa trường: Tìm theo Mã, Tên và Mô tả
    // const filteredData = useMemo(() => {
    //     if (!searchQuery) return data;
    //     const lowerCaseQuery = searchQuery.toLowerCase();

    //     return data.filter(
    //         (item) =>
    //             item.MaSanPham?.toLowerCase().includes(lowerCaseQuery) ||
    //             item.TenSanPham?.toLowerCase().includes(lowerCaseQuery) ||
    //             item.MoTa?.toLowerCase().includes(lowerCaseQuery)
    //     );
    // }, [data, searchQuery]);
    const loadSanPhamNhom = async (sanPhamId) => {
        const res = await getSanPhamNhomKiem(sanPhamId);
        setNhomData(res.data || []);
    };

    const openNhomManager = async (sanPham) => {
        setSelectedSanPham(sanPham);
        setNhomDialog(true);
        setExpandedNhomId(null);
        setNhomItems({});
        setNhomPreviewError("");

        const [nhomRes, sanPhamNhomRes] = await Promise.all([
            getNhomKiemList(),
            getSanPhamNhomKiem(sanPham.Id)
        ]);

        setNhomList(nhomRes.data || []);
        setNhomData(sanPhamNhomRes.data || []);
        setThuTu((sanPhamNhomRes.data?.length || 0) + 1);
        setSelectedNhomObj(null);
    };

    const loadNhomItems = async (nhomKiemId) => {
        if (nhomItems[nhomKiemId]) return nhomItems[nhomKiemId];
        try {
            setLoadingNhomId(nhomKiemId);
            setNhomPreviewError("");
            const response = await getCheckItemByNhom(nhomKiemId);
            const items = response.data || [];
            setNhomItems(prev => ({ ...prev, [nhomKiemId]: items }));
            return items;
        } catch (error) {
            setNhomPreviewError(error.response?.data?.message || "Không tải được các mục kiểm trong nhóm");
            return [];
        } finally {
            setLoadingNhomId(null);
        }
    };

    const toggleNhomItems = async (nhomKiemId) => {
        if (expandedNhomId === nhomKiemId) {
            setExpandedNhomId(null);
            return;
        }
        setExpandedNhomId(nhomKiemId);
        await loadNhomItems(nhomKiemId);
    };

    const openThongSoManager = (sanPham) => {
        setSelectedSanPham(sanPham);
        setThongSoDialog(true);
    };

    const nhomAvailable = useMemo(() => {
        return nhomList
            .filter(n => !nhomData.some(d => d.NhomKiemId === n.Id))
            .sort((a, b) => a.ThuTu - b.ThuTu);
    }, [nhomList, nhomData]);

    const handleSave = async () => {
        if (!form.MaSanPham || !form.TenSanPham) return;

        let imageUrl = form.ImageUrl || "";
        if (imageFile) {
            const uploadRes = await uploadSanPhamImage(imageFile, {
                maSanPham: form.MaSanPham,
                tenSanPham: form.TenSanPham
            });
            imageUrl = uploadRes?.data?.imageUrl || imageUrl;
        }

        const payload = {
            ...form,
            ImageUrl: imageUrl || null
        };

        if (form.Id) await updateSanPham(form.Id, payload);
        else await createSanPham(payload);

        setOpen(false);
        setImageFile(null);
        setImagePreview("");
        loadData();
    };

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

    const handleDelete = async (id) => {
        setConfirmDialog({
            open: true,
            title: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa sản phẩm này?',
            type: 'error',
            onConfirm: async () => {
                await deleteSanPham(id);
                loadData();
            }
        });
    };

    const handleAddNhom = async () => {
        if (!selectedNhomObj) return;

        await createSanPhamNhomKiem({
            SanPhamId: selectedSanPham.Id,
            NhomKiemId: selectedNhomObj.Id,
            BatBuoc: true,
            ThuTu: thuTu
        });

        setSelectedNhomObj(null);
        setThuTu(prev => prev + 1);
        loadSanPhamNhom(selectedSanPham.Id);
    };

    const handleDeleteNhom = async (id) => {
        await deleteSanPhamNhomKiem(id);
        loadSanPhamNhom(selectedSanPham.Id);
    };

    const handleExportDanhMucKiem = async (sanPham) => {
        try {
            setExportingId(sanPham.Id);
            const res = await exportSanPhamDanhMucKiem(sanPham.Id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            const safeCode = String(sanPham.MaSanPham || sanPham.Id).replace(/[^\w.-]+/g, "_");

            link.href = url;
            link.download = `danh-muc-kiem-${safeCode}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setConfirmDialog({
                open: true,
                title: "Không tải được file",
                message: err.response?.data?.message || "Không xuất được danh mục kiểm của sản phẩm này",
                type: "error",
                onConfirm: () => setConfirmDialog(prev => ({ ...prev, open: false }))
            });
        } finally {
            setExportingId(null);
        }
    };

    const handleExportThongSo = async (sanPham) => {
        try {
            setExportingThongSoId(sanPham.Id);
            const res = await exportSanPhamThongSo(sanPham.Id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            const safeCode = String(sanPham.MaSanPham || sanPham.Id).replace(/[^\w.-]+/g, "_");

            link.href = url;
            link.download = `thong-so-kiem-${safeCode}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setConfirmDialog({
                open: true,
                title: "Không tải được file",
                message: err.response?.data?.message || "Không xuất được thông số kiểm của sản phẩm này",
                type: "error",
                onConfirm: () => setConfirmDialog(prev => ({ ...prev, open: false }))
            });
        } finally {
            setExportingThongSoId(null);
        }
    };

    const handleDownloadThongSoTemplate = async () => {
        try {
            const res = await downloadThongSoKiemTemplate();
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.download = "mau-import-thong-so-kiem.xlsx";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setConfirmDialog({
                open: true,
                title: "Không tải được file",
                message: err.response?.data?.message || "Không tải được file mẫu import thông số kiểm",
                type: "error",
                onConfirm: () => setConfirmDialog(prev => ({ ...prev, open: false }))
            });
        }
    };

    const handleImportThongSoExcel = async () => {
        if (!importFile) return;

        try {
            setImporting(true);
            setImportResult(null);
            const res = await importThongSoKiemExcel(importFile);
            setImportResult({
                type: "success",
                message: res.data?.message || "Import thành công",
                summary: res.data?.summary
            });
            setImportFile(null);
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

    const handleImportProductImages = async () => {
        if (!imageImportFiles.length) return;

        try {
            setImageImporting(true);
            setImageImportResult(null);
            const res = await importSanPhamImages(imageImportFiles, imageImportCustomer);
            const resultType = res.data?.level || ((res.data?.summary?.errors?.length || 0) > 0 ? "warning" : "success");
            setImageImportResult({
                type: resultType,
                message: res.data?.message || "Import ảnh sản phẩm thành công",
                summary: res.data?.summary,
                errors: res.data?.summary?.errors || []
            });
            loadData(true);
        } catch (err) {
            setImageImportResult({
                type: "error",
                message: err.response?.data?.message || "Import ảnh sản phẩm thất bại",
                errors: err.response?.data?.errors || []
            });
        } finally {
            setImageImporting(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* Header */}
            {/* Header */}
            <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                spacing={2}
                sx={{ mb: 3 }}
            >
                <Typography variant="h5" fontWeight="bold">
                    Quản lý Sản phẩm
                </Typography>

                <Stack direction="row" spacing={2} alignItems="center">
                    <TextField
                        size="small"
                        placeholder="Tìm mã, tên, quy cách, khách hàng..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ backgroundColor: "#fff", minWidth: { sm: 280 } }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => {
                            setForm({});
                            setImageFile(null);
                            setImagePreview("");
                            setOpen(true);
                        }}
                        sx={{ whiteSpace: "nowrap" }}
                    >
                        Thêm sản phẩm
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<UploadFileIcon />}
                        onClick={() => setImportOpen(true)}
                        sx={{ whiteSpace: "nowrap" }}
                    >
                        Import thông số
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<UploadFileIcon />}
                        onClick={() => setImageImportOpen(true)}
                        sx={{ whiteSpace: "nowrap" }}
                    >
                        Import ảnh
                    </Button>
                </Stack>
            </Stack>

            {/* Main Table */}
            <Card elevation={2}>
                <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                                <TableCell sx={{ fontWeight: 600 }}>Mã/ItemCode</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Ảnh</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Quy cách</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Khách hàng</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Mô tả</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600 }}>Cấu hình</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                        <Typography color="text.secondary">Chưa có dữ liệu</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row) => (
                                    <TableRow key={row.Id} hover>
                                        <TableCell><Chip label={row.MaSanPham} size="small" color="default" /></TableCell>
                                        <TableCell>
                                            {row.ImageUrl ? (
                                                <Box
                                                    component="img"
                                                    src={getAssetUrl(row.ImageUrl)}
                                                    alt={row.TenSanPham}
                                                    sx={{
                                                        width: 56,
                                                        height: 56,
                                                        objectFit: "contain",
                                                        border: "1px solid #e5e7eb",
                                                        borderRadius: 1,
                                                        bgcolor: "#fff",
                                                        p: 0.5
                                                    }}
                                                />
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">--</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>{row.TenSanPham}</TableCell>
                                        <TableCell sx={{ color: "text.secondary" }}>{row.KhachHang || "--"}</TableCell>
                                        <TableCell sx={{ color: "text.secondary" }}>{row.MoTa || "--"}</TableCell>
                                        <TableCell align="center">
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<AssignmentTurnedInIcon />}
                                                onClick={() => openNhomManager(row)}
                                                sx={{ mr: 1 }}
                                            >
                                                Nhóm kiểm
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="secondary"
                                                startIcon={<SettingsOverscanIcon />}
                                                onClick={() => openThongSoManager(row)}
                                            >
                                                Thông số kiểm
                                            </Button>
                                            <Tooltip title="Tải danh mục kiểm theo mẫu import">
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="success"
                                                        onClick={() => handleExportDanhMucKiem(row)}
                                                        disabled={exportingId === row.Id}
                                                        sx={{ ml: 1 }}
                                                    >
                                                        <DownloadIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Tải thông số kiểm">
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="info"
                                                        onClick={() => handleExportThongSo(row)}
                                                        disabled={exportingThongSoId === row.Id}
                                                        sx={{ ml: 0.5 }}
                                                    >
                                                        <DownloadIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Chỉnh sửa">
                                                <IconButton onClick={() => { setForm({ ...row }); setImageFile(null); setImagePreview(""); setOpen(true); }} color="primary">
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Xóa">
                                                <IconButton onClick={() => handleDelete(row.Id)} color="error">
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
            {hasMore && (
                <Box textAlign="center" p={2}>
                    <Button onClick={() => loadData(false)}>
                        Tải thêm
                    </Button>
                </Box>
            )}
            {/* Dialog Form Sản phẩm */}
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: "bold" }}>
                    {form.Id ? "Cập nhật thông tin sản phẩm" : "Thêm sản phẩm mới"}
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <TextField
                            label="Mã sản phẩm"
                            required
                            fullWidth
                            value={form.MaSanPham || ""}
                            onChange={(e) => setForm({ ...form, MaSanPham: e.target.value })}
                        />
                        <TextField
                            label="Tên sản phẩm"
                            required
                            fullWidth
                            value={form.TenSanPham || ""}
                            onChange={(e) => setForm({ ...form, TenSanPham: e.target.value })}
                        />
                        <TextField
                            label="Mô tả"
                            multiline
                            rows={3}
                            fullWidth
                            value={form.MoTa || ""}
                            onChange={(e) => setForm({ ...form, MoTa: e.target.value })}
                        />
                        <TextField
                            label="Khách hàng áp dụng"
                            fullWidth
                            placeholder="Ví dụ: IKEA, DEK"
                            value={form.KhachHang || ""}
                            onChange={(e) => setForm({ ...form, KhachHang: e.target.value })}
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "flex-start" }}>
                            <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
                                Tải ảnh lên
                                <input hidden accept="image/*" type="file" onChange={handleImageChange} />
                            </Button>
                            {(imagePreview || form.ImageUrl) ? (
                                <Button color="error" onClick={handleRemoveImage}>
                                    Xóa ảnh
                                </Button>
                            ) : null}
                        </Stack>
                        {(imagePreview || form.ImageUrl) ? (
                            <Box
                                component="img"
                                src={imagePreview || getAssetUrl(form.ImageUrl)}
                                alt={form.TenSanPham || "Ảnh sản phẩm"}
                                sx={{
                                    width: "100%",
                                    maxHeight: 220,
                                    objectFit: "contain",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 2,
                                    bgcolor: "#fff",
                                    p: 1
                                }}
                            />
                        ) : (
                            <Alert severity="info">Chưa có ảnh sản phẩm. Tải ảnh lên để dùng cho phiếu kiểm và xem in.</Alert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setOpen(false)} color="inherit">Huỷ bỏ</Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={!form.MaSanPham || !form.TenSanPham}
                    >
                        {form.Id ? "Cập nhật" : "Lưu sản phẩm"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Quản lý Nhóm kiểm - Đã nâng cấp UI/UX */}
            <Dialog open={nhomDialog} onClose={() => setNhomDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h6" fontWeight="bold">
                        Cấu hình Nhóm kiểm
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Sản phẩm: <Typography component="span" fontWeight="bold" color="primary">{selectedSanPham?.TenSanPham}</Typography> ({selectedSanPham?.MaSanPham})
                    </Typography>
                </DialogTitle>

                <DialogContent dividers sx={{ p: 0 }}>
                    {/* Vùng Thêm mới */}
                    <Box sx={{ p: 3, backgroundColor: "#f8fafc" }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                            THÊM NHÓM KIỂM VÀO SẢN PHẨM
                        </Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
                            <Autocomplete
                                sx={{ flex: 1, width: "100%" }}
                                options={nhomAvailable}
                                value={selectedNhomObj}
                                onChange={(_, value) => {
                                    setSelectedNhomObj(value);
                                    if (value?.Id) loadNhomItems(value.Id);
                                }}
                                getOptionLabel={(option) => option.TenNhom || ""}
                                isOptionEqualToValue={(opt, val) => opt.Id === val.Id}
                                renderOption={(props, option) => (
                                    <Box component="li" {...props} sx={{ borderBottom: '1px solid #eee', py: 1.5 }}>
                                        <Box>
                                            <Typography variant="body1" fontWeight={500}>
                                                {option.TenNhom}
                                            </Typography>
                                            {option.MoTa && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                    {option.MoTa}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                )}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Tìm kiếm / Chọn nhóm kiểm..."
                                        placeholder="Gõ để tìm..."
                                        variant="outlined"
                                        sx={{ bgcolor: 'background.paper' }}
                                    />
                                )}
                            />

                            <TextField
                                label="Thứ tự"
                                type="number"
                                value={thuTu}
                                onChange={(e) => setThuTu(Number(e.target.value))}
                                sx={{ width: { xs: "100%", sm: 100 }, bgcolor: 'background.paper' }}
                                InputProps={{ inputProps: { min: 1 } }}
                            />

                            <Button
                                variant="contained"
                                onClick={handleAddNhom}
                                disabled={!selectedNhomObj}
                                sx={{ height: 56, minWidth: 100, width: { xs: "100%", sm: "auto" } }}
                            >
                                Thêm
                            </Button>
                        </Stack>

                        {selectedNhomObj && (
                            <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: "background.paper" }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 1.5 }}>
                                    <Box>
                                        <Typography fontWeight={700}>Xem trước: {selectedNhomObj.TenNhom}</Typography>
                                        {selectedNhomObj.MoTa && (
                                            <Typography variant="body2" color="text.secondary">
                                                {selectedNhomObj.MoTa}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Chip
                                        size="small"
                                        label={`${nhomItems[selectedNhomObj.Id]?.length || 0} mục kiểm`}
                                        color="primary"
                                        variant="outlined"
                                    />
                                </Stack>
                                {loadingNhomId === selectedNhomObj.Id ? (
                                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
                                        <CircularProgress size={20} />
                                        <Typography variant="body2">Đang tải nội dung nhóm...</Typography>
                                    </Stack>
                                ) : (
                                    <CheckItemPreview items={nhomItems[selectedNhomObj.Id] || []} />
                                )}
                            </Paper>
                        )}
                    </Box>

                    <Divider />

                    {/* Vùng Danh sách đã chọn */}
                    <Box sx={{ p: 3 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                            DANH SÁCH NHÓM KIỂM ĐÃ GÁN ({nhomData.length})
                        </Typography>

                        {nhomPreviewError && (
                            <Alert severity="error" onClose={() => setNhomPreviewError("")} sx={{ mb: 2 }}>
                                {nhomPreviewError}
                            </Alert>
                        )}

                        {nhomData.length === 0 ? (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                Sản phẩm này chưa được gán nhóm kiểm nào. Hãy chọn từ danh sách phía trên.
                            </Alert>
                        ) : (
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                                            <TableCell sx={{ width: 80, fontWeight: 600 }} align="center">Thứ tự</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Tên nhóm kiểm</TableCell>
                                            <TableCell align="right" sx={{ width: 100, fontWeight: 600 }}>Thao tác</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {nhomData.sort((a, b) => a.ThuTu - b.ThuTu).map(row => (
                                            <Fragment key={row.Id}>
                                                <TableRow hover>
                                                    <TableCell align="center">
                                                        <Typography fontWeight="bold" color="text.secondary">
                                                            #{row.ThuTu}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography fontWeight={500}>{row.TenNhom}</Typography>
                                                        {row.MoTa && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                {row.MoTa}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Tooltip title="Xem các mục kiểm trong nhóm">
                                                            <Button
                                                                size="small"
                                                                onClick={() => toggleNhomItems(row.NhomKiemId)}
                                                                endIcon={expandedNhomId === row.NhomKiemId ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                                sx={{ mr: 0.5 }}
                                                            >
                                                                Xem
                                                            </Button>
                                                        </Tooltip>
                                                        <Tooltip title="Gỡ bỏ nhóm này">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleDeleteNhom(row.Id)}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell colSpan={3} sx={{ py: 0, borderBottom: expandedNhomId === row.NhomKiemId ? undefined : 0 }}>
                                                        <Collapse in={expandedNhomId === row.NhomKiemId} timeout="auto" unmountOnExit>
                                                            <Box sx={{ py: 2 }}>
                                                                {loadingNhomId === row.NhomKiemId ? (
                                                                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
                                                                        <CircularProgress size={20} />
                                                                        <Typography variant="body2">Đang tải mục kiểm...</Typography>
                                                                    </Stack>
                                                                ) : (
                                                                    <CheckItemPreview items={nhomItems[row.NhomKiemId] || []} />
                                                                )}
                                                            </Box>
                                                        </Collapse>
                                                    </TableCell>
                                                </TableRow>
                                            </Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2, bgcolor: "#f8fafc" }}>
                    <Button variant="outlined" onClick={() => setNhomDialog(false)}>
                        Đóng cửa sổ
                    </Button>
                </DialogActions>
            </Dialog>
            <ConfirmDialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
            />

            <Dialog
                open={importOpen}
                onClose={() => !importing && setImportOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: "bold", pb: 1 }}>
                    Import thông số kiểm từ Excel
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2.5}>
                        <Alert severity="info">
                            File .xlsx cần có sheet <strong>ThongSoKiem</strong> với các cột: MaSanPham, NhomThongSo, TenThongSo, GiaTriChuan, DungSaiAm, DungSaiDuong, DonVi, ThuTu.
                        </Alert>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <Button
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={handleDownloadThongSoTemplate}
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
                                    onChange={(e) => {
                                        setImportFile(e.target.files?.[0] || null);
                                        setImportResult(null);
                                        e.target.value = "";
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
                                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                                        Tổng dòng: {importResult.summary.totalRows}, tạo: {importResult.summary.created ?? 0}, cập nhật: {importResult.summary.updated ?? 0}
                                    </Typography>
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
                    <Button variant="contained" onClick={handleImportThongSoExcel} disabled={!importFile || importing}>
                        {importing ? "Đang import..." : "Import"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={imageImportOpen}
                onClose={() => !imageImporting && setImageImportOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: "bold", pb: 1 }}>
                    Import ảnh sản phẩm theo item code
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2.5}>
                        <Alert severity="info">
                            Chọn nhiều ảnh hoặc cả folder ảnh. Tên file phải là <strong>item code</strong>, ví dụ <strong>21312.jpg</strong>. Nếu nhiều sản phẩm dùng chung một ảnh, có thể đặt tên file như <strong>21312,23123.jpg</strong>. Có thể nhập khách hàng chung để gán cho toàn bộ ảnh khớp trong lần import này.
                        </Alert>
                        <TextField
                            label="Khách hàng áp dụng"
                            placeholder="Ví dụ: IKEA, DEK"
                            value={imageImportCustomer}
                            onChange={(e) => setImageImportCustomer(e.target.value)}
                            fullWidth
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <Button
                                variant="contained"
                                component="label"
                                startIcon={<UploadFileIcon />}
                                disabled={imageImporting}
                            >
                                Chọn nhiều ảnh / folder
                                <input
                                    hidden
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    webkitdirectory=""
                                    directory=""
                                    onChange={(e) => {
                                        setImageImportFiles(Array.from(e.target.files || []));
                                        setImageImportResult(null);
                                        e.target.value = "";
                                    }}
                                />
                            </Button>
                        </Stack>
                        {imageImportFiles.length > 0 ? (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography fontWeight={600}>
                                    Đã chọn {imageImportFiles.length} file ảnh
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Ví dụ: {imageImportFiles.slice(0, 5).map((file) => file.name).join(", ")}
                                    {imageImportFiles.length > 5 ? " ..." : ""}
                                </Typography>
                            </Paper>
                        ) : null}
                        {imageImportResult && (
                            <Alert severity={imageImportResult.type}>
                                <Typography fontWeight={600}>{imageImportResult.message}</Typography>
                                {imageImportResult.summary && (
                                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                                        Tổng file: {imageImportResult.summary.totalFiles}, khớp sản phẩm: {imageImportResult.summary.matched}, cập nhật: {imageImportResult.summary.updated}, bỏ qua: {imageImportResult.summary.skipped}
                                    </Typography>
                                )}
                            </Alert>
                        )}
                        {imageImportResult?.errors?.length > 0 && (
                            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 600 }}>File</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Mã SP</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Lỗi</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {imageImportResult.errors.map((item, index) => (
                                            <TableRow key={`${item.fileName}-${index}`}>
                                                <TableCell>{item.fileName}</TableCell>
                                                <TableCell>{item.maSanPham || "--"}</TableCell>
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
                    <Button onClick={() => setImageImportOpen(false)} color="inherit" disabled={imageImporting}>
                        Đóng
                    </Button>
                    <Button variant="contained" onClick={handleImportProductImages} disabled={!imageImportFiles.length || imageImporting}>
                        {imageImporting ? "Đang import..." : "Import ảnh"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Thông số đặc biệt */}
            <SanPhamThongSoDialog
                open={thongSoDialog}
                onClose={() => setThongSoDialog(false)}
                selectedSanPham={selectedSanPham}
            />
        </Box>
    );
}
