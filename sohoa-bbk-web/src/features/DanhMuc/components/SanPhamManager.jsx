import { useEffect, useState, useMemo } from "react";
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
    InputAdornment
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import SettingsOverscanIcon from '@mui/icons-material/SettingsOverscan';
import ConfirmDialog from "../../../components/common/ConfirmDialog"
import SanPhamThongSoDialog from "./SanPhamThongSoDialog";
import {
    getSanPhamList,
    createSanPham,
    updateSanPham,
    deleteSanPham,
    getSanPhamNhomKiem,
    createSanPhamNhomKiem,
    deleteSanPhamNhomKiem,
    getNhomKiemList
} from "../../../api/lookup.api";

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

    const [page, setPage] = useState(0);
    const [pageSize] = useState(20);
    const [hasMore, setHasMore] = useState(true);

    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });

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

        const [nhomRes, sanPhamNhomRes] = await Promise.all([
            getNhomKiemList(),
            getSanPhamNhomKiem(sanPham.Id)
        ]);

        setNhomList(nhomRes.data || []);
        setNhomData(sanPhamNhomRes.data || []);
        setThuTu((sanPhamNhomRes.data?.length || 0) + 1);
        setSelectedNhomObj(null);
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

        if (form.Id) await updateSanPham(form.Id, form);
        else await createSanPham(form);

        setOpen(false);
        loadData();
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
                        placeholder="Tìm mã, tên, quy cách..."
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
                            setOpen(true);
                        }}
                        sx={{ whiteSpace: "nowrap" }}
                    >
                        Thêm sản phẩm
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
                                <TableCell sx={{ fontWeight: 600 }}>Quy cách</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Mô tả</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600 }}>Cấu hình</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                        <Typography color="text.secondary">Chưa có dữ liệu</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row) => (
                                    <TableRow key={row.Id} hover>
                                        <TableCell><Chip label={row.MaSanPham} size="small" color="default" /></TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>{row.TenSanPham}</TableCell>
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
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Chỉnh sửa">
                                                <IconButton onClick={() => { setForm({ ...row }); setOpen(true); }} color="primary">
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
                                onChange={(_, value) => setSelectedNhomObj(value)}
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
                    </Box>

                    <Divider />

                    {/* Vùng Danh sách đã chọn */}
                    <Box sx={{ p: 3 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                            DANH SÁCH NHÓM KIỂM ĐÃ GÁN ({nhomData.length})
                        </Typography>

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
                                            <TableRow key={row.Id} hover>
                                                <TableCell align="center">
                                                    <Typography fontWeight="bold" color="text.secondary">
                                                        #{row.ThuTu}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography fontWeight={500}>{row.TenNhom}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
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

            {/* Dialog Thông số đặc biệt */}
            <SanPhamThongSoDialog
                open={thongSoDialog}
                onClose={() => setThongSoDialog(false)}
                selectedSanPham={selectedSanPham}
            />
        </Box>
    );
}