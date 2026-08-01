import { useCallback, useEffect, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Stack,
    TextField,
    TableContainer,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    Tooltip,
    Alert,
    Divider,
    Grid
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { useToast } from "../../../components/common/ToastContext";

import {
    getSanPhamThongSo,
    createSanPhamThongSo,
    deleteSanPhamThongSo
} from "../../../api/lookup.api";

export default function SanPhamThongSoDialog({ open, onClose, selectedSanPham }) {
    const { showToast } = useToast();
    const [thongSoData, setThongSoData] = useState([]);

    // Form state
    const [form, setForm] = useState({
        Id: null,
        NhomThongSo: "Kích thước sản phẩm",
        TenThongSo: "",
        GiaTriChuan: "",
        DungSaiAm: 0,
        DungSaiDuong: 0,
        DonVi: "mm",
        ThuTu: 1
    });

    const loadThongSo = useCallback(async (sanPhamId) => {
        try {
            const res = await getSanPhamThongSo(sanPhamId);
            setThongSoData(res.data || []);
            setForm(prev => ({ ...prev, ThuTu: (res.data?.length || 0) + 1 }));
        } catch {
            showToast("Lỗi tải cấu hình thông số", "error");
        }
    }, [showToast]);

    useEffect(() => {
        if (open && selectedSanPham) {
            const timer = window.setTimeout(() => {
                loadThongSo(selectedSanPham.Id);
                setForm({
                    Id: null,
                    NhomThongSo: "Kích thước sản phẩm",
                    TenThongSo: "",
                    GiaTriChuan: "",
                    DungSaiAm: 0,
                    DungSaiDuong: 0,
                    DonVi: "mm",
                    ThuTu: 1
                });
            }, 0);
            return () => window.clearTimeout(timer);
        }
        return undefined;
    }, [loadThongSo, open, selectedSanPham]);

    const handleSave = async () => {
        if (!form.NhomThongSo || !form.GiaTriChuan) {
            showToast("Vui lòng nhập Nhóm thông số và Giá trị chuẩn", "warning");
            return;
        }

        try {
            const payload = {
                ...form,
                SanPhamId: selectedSanPham.Id
            };
            await createSanPhamThongSo(payload);
            showToast("Đã lưu thông số thành công", "success");
            
            // Reset form partly
            setForm(prev => ({
                ...prev,
                Id: null,
                TenThongSo: "",
                GiaTriChuan: "",
                ThuTu: prev.ThuTu + 1
            }));
            
            loadThongSo(selectedSanPham.Id);
        } catch {
            showToast("Lỗi lưu thông số", "error");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa thông số này?")) {
            try {
                await deleteSanPhamThongSo(id);
                showToast("Đã xóa thông số", "success");
                loadThongSo(selectedSanPham.Id);
            } catch {
                showToast("Lỗi xóa thông số", "error");
            }
        }
    };

    const handleEdit = (item) => {
        setForm({
            Id: item.Id,
            NhomThongSo: item.NhomThongSo,
            TenThongSo: item.TenThongSo || "",
            GiaTriChuan: item.GiaTriChuan,
            DungSaiAm: item.DungSaiAm,
            DungSaiDuong: item.DungSaiDuong,
            DonVi: item.DonVi || "",
            ThuTu: item.ThuTu
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
                <Typography variant="h6" fontWeight="bold">
                    Cấu hình Thông số kiểm (Cấp độ đặc biệt)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Sản phẩm: <Typography component="span" fontWeight="bold" color="primary">{selectedSanPham?.TenSanPham}</Typography> ({selectedSanPham?.MaSanPham})
                </Typography>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0 }}>
                {/* Vùng Thêm/Sửa mới */}
                <Box sx={{ p: 3, backgroundColor: "#f8fafc" }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                        {form.Id ? "CẬP NHẬT THÔNG SỐ" : "THÊM THÔNG SỐ MỚI"}
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <TextField
                                fullWidth size="small" label="Nhóm (vd: Hộp, Kích thước)"
                                value={form.NhomThongSo}
                                onChange={(e) => setForm({ ...form, NhomThongSo: e.target.value })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <TextField
                                fullWidth size="small" label="Tên thông số (tuỳ chọn)"
                                value={form.TenThongSo}
                                onChange={(e) => setForm({ ...form, TenThongSo: e.target.value })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 2 }}>
                            <TextField
                                fullWidth size="small" label="Giá trị chuẩn (vd: 580)"
                                value={form.GiaTriChuan}
                                onChange={(e) => setForm({ ...form, GiaTriChuan: e.target.value })}
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField
                                fullWidth size="small" label="Dung sai - (Âm)" type="number"
                                value={form.DungSaiAm}
                                onChange={(e) => setForm({ ...form, DungSaiAm: Number(e.target.value) })}
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField
                                fullWidth size="small" label="Dung sai + (Dương)" type="number"
                                value={form.DungSaiDuong}
                                onChange={(e) => setForm({ ...form, DungSaiDuong: Number(e.target.value) })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 2 }}>
                            <TextField
                                fullWidth size="small" label="Đơn vị (vd: mm)"
                                value={form.DonVi}
                                onChange={(e) => setForm({ ...form, DonVi: e.target.value })}
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField
                                fullWidth size="small" label="Thứ tự" type="number"
                                value={form.ThuTu}
                                onChange={(e) => setForm({ ...form, ThuTu: Number(e.target.value) })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }} display="flex" alignItems="center" gap={1}>
                            <Button
                                variant="contained"
                                onClick={handleSave}
                                disabled={!form.NhomThongSo || !form.GiaTriChuan}
                                startIcon={form.Id ? <EditIcon /> : <AddIcon />}
                            >
                                {form.Id ? "Cập nhật" : "Thêm"}
                            </Button>
                            {form.Id && (
                                <Button variant="outlined" color="inherit" onClick={() => setForm({ ...form, Id: null })}>
                                    Hủy
                                </Button>
                            )}
                        </Grid>
                    </Grid>
                </Box>

                <Divider />

                {/* Vùng Danh sách */}
                <Box sx={{ p: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                        DANH SÁCH THÔNG SỐ ({thongSoData.length})
                    </Typography>

                    {thongSoData.length === 0 ? (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            Chưa có cấu hình thông số đặc biệt cho sản phẩm này.
                        </Alert>
                    ) : (
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                                        <TableCell align="center" sx={{ fontWeight: 600 }}>TT</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Nhóm</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Tên thông số</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 600 }}>Giá trị chuẩn</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 600 }}>Dung sai (- / +)</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 600 }}>Đơn vị</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {thongSoData.map(row => (
                                        <TableRow key={row.Id} hover>
                                            <TableCell align="center">{row.ThuTu}</TableCell>
                                            <TableCell><Typography fontWeight={500}>{row.NhomThongSo}</Typography></TableCell>
                                            <TableCell>{row.TenThongSo}</TableCell>
                                            <TableCell align="center"><Typography fontWeight="bold" color="primary">{row.GiaTriChuan}</Typography></TableCell>
                                            <TableCell align="center">-{row.DungSaiAm} / +{row.DungSaiDuong}</TableCell>
                                            <TableCell align="center">{row.DonVi}</TableCell>
                                            <TableCell align="right">
                                                <Tooltip title="Sửa">
                                                    <IconButton size="small" color="info" onClick={() => handleEdit(row)}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Xoá">
                                                    <IconButton size="small" color="error" onClick={() => handleDelete(row.Id)}>
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
                <Button variant="outlined" onClick={onClose}>
                    Đóng cửa sổ
                </Button>
            </DialogActions>
        </Dialog>
    );
}
