import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Card, Table, TableHead,
    TableRow, TableCell, TableBody,
    IconButton, Button, Dialog,
    DialogTitle, DialogContent, DialogActions,
    TextField, Stack, Chip, Alert,
    Box, Typography, MenuItem,
    TableContainer, Paper, Tooltip, CircularProgress
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import BugReportIcon from "@mui/icons-material/BugReport";

import {
    getDefectList,
    createDefect,
    updateDefect,
    deleteDefect
} from "../../../api/lookup.api";

export default function DefectManager() {

    const [data, setData] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // ================= LOAD DATA =================
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

    // ================= SAVE =================
    const handleSave = async () => {
        if (!form.TenLoi || !form.DefectType) return;

        try {
            if (form.Id) {
                await updateDefect(form.Id, form);
            } else {
                await createDefect(form);
            }

            setOpen(false);
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || "Có lỗi xảy ra khi lưu");
        }
    };

    // ================= DELETE =================
    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa mã lỗi này?")) return;

        try {
            await deleteDefect(id);
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || "Không thể xoá");
        }
    };

    // ================= HELPER =================
    const getDefectTypeProps = (type) => {
        switch (type) {
            case "CRITICAL": return { color: "error", label: "CRITICAL" };
            case "MAJOR": return { color: "warning", label: "MAJOR" };
            case "MINOR": return { color: "info", label: "MINOR" };
            default: return { color: "default", label: type || "UNKNOWN" };
        }
    };

    const filteredData = useMemo(() => {
        const value = keyword.trim().toLowerCase();

        return data.filter((row) => {
            const matchesKeyword = !value || [
                row.MaLoi,
                row.TenLoi,
                row.MoTa,
                row.GhiChu,
                row.DefectType
            ].some((field) => String(field || "").toLowerCase().includes(value));
            const matchesType = typeFilter === "ALL" || row.DefectType === typeFilter;
            const isActive = row.TrangThai !== false && row.TrangThai !== 0;
            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && isActive) ||
                (statusFilter === "INACTIVE" && !isActive);

            return matchesKeyword && matchesType && matchesStatus;
        });
    }, [data, keyword, typeFilter, statusFilter]);

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>

            {error && (
                <Alert severity="error" onClose={() => setError("")} sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* HEADER */}
            <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                spacing={2}
                sx={{ mb: 3 }}
            >
                <Stack direction="row" alignItems="center" spacing={1}>
                    <BugReportIcon color="primary" fontSize="large" />
                    <Typography variant="h5" fontWeight="bold">
                        Danh mục Lỗi (Defects)
                    </Typography>
                    <Chip label={`${filteredData.length}/${data.length}`} size="small" />
                </Stack>

                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                    <TextField
                        size="small"
                        label="Tìm lỗi"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        sx={{ minWidth: { md: 220 } }}
                    />
                    <TextField
                        select
                        size="small"
                        label="Phân loại"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value="ALL">Tất cả</MenuItem>
                        <MenuItem value="CRITICAL">CRITICAL</MenuItem>
                        <MenuItem value="MAJOR">MAJOR</MenuItem>
                        <MenuItem value="MINOR">MINOR</MenuItem>
                    </TextField>
                    <TextField
                        select
                        size="small"
                        label="Trạng thái"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value="ALL">Tất cả</MenuItem>
                        <MenuItem value="ACTIVE">Hoạt động</MenuItem>
                        <MenuItem value="INACTIVE">Tạm ngưng</MenuItem>
                    </TextField>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => {
                            setForm({});
                            setOpen(true);
                        }}
                        sx={{ height: { xs: 40, sm: 'auto' }, whiteSpace: "nowrap" }}
                    >
                        Thêm lỗi mới
                    </Button>
                </Stack>
            </Stack>

            {/* TABLE */}
            <Card elevation={2}>
                <TableContainer component={Paper} sx={{ position: "relative" }}>

                    {/* Loading Overlay */}
                    {loading && (
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                background: "rgba(255,255,255,0.7)",
                                zIndex: 10
                            }}
                        >
                            <CircularProgress />
                        </Box>
                    )}

                    <Table sx={{ minWidth: 800 }}>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                                <TableCell sx={{ fontWeight: 600, width: '10%' }}>Mã lỗi</TableCell>
                                <TableCell sx={{ fontWeight: 600, width: '25%' }}>Tên lỗi</TableCell>
                                <TableCell sx={{ fontWeight: 600, width: '25%' }}>Mô tả chi tiết</TableCell>
                                <TableCell sx={{ fontWeight: 600, width: '15%' }}>Phân loại</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="center">Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 600, width: 100 }} align="right">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {filteredData.length === 0 && !loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                        <BugReportIcon sx={{ fontSize: 60, color: "text.disabled", mb: 1 }} />
                                        <Typography variant="h6" color="text.secondary">Chưa có dữ liệu lỗi</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Bấm "Thêm lỗi mới" để tạo danh mục lỗi.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map(row => (
                                    <TableRow key={row.Id} hover>
                                        <TableCell>
                                            <Typography fontWeight={600} color="text.secondary">
                                                {row.MaLoi || "--"}
                                            </Typography>
                                        </TableCell>

                                        <TableCell sx={{ fontWeight: 500 }}>
                                            {row.TenLoi}
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {row.MoTa || "--"}
                                            </Typography>
                                            {row.GhiChu && (
                                                <Typography variant="caption" sx={{ display: 'block', color: 'primary.main', fontStyle: 'italic' }}>
                                                    Lưu ý: {row.GhiChu}
                                                </Typography>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <Chip
                                                label={getDefectTypeProps(row.DefectType).label}
                                                color={getDefectTypeProps(row.DefectType).color}
                                                size="small"
                                                sx={{ fontWeight: 'bold', borderRadius: 1 }}
                                            />
                                        </TableCell>

                                        <TableCell align="center">
                                            <Chip
                                                label={row.TrangThai ? "Hoạt động" : "Tạm ngưng"}
                                                color={row.TrangThai ? "success" : "default"}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>

                                        <TableCell align="right">
                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end" sx={{ whiteSpace: "nowrap" }}>
                                                <Tooltip title="Chỉnh sửa">
                                                    <IconButton
                                                        color="primary"
                                                        onClick={() => {
                                                            setForm(row);
                                                            setOpen(true);
                                                        }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>

                                                <Tooltip title="Xóa">
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => handleDelete(row.Id)}
                                                    >
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

            {/* DIALOG THÊM / SỬA */}
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: "bold", pb: 1 }}>
                    {form.Id ? "Cập nhật thông tin lỗi" : "Thêm mã lỗi mới"}
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <TextField
                            label="Tên lỗi (Ngắn gọn)"
                            required
                            fullWidth
                            placeholder="Ví dụ: Thùng móp méo, In sai màu..."
                            value={form.TenLoi || ""}
                            onChange={(e) => setForm({ ...form, TenLoi: e.target.value })}
                        />

                        <TextField
                            label="Mô tả chi tiết"
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="Mô tả cụ thể hơn về đặc điểm lỗi để KCS dễ nhận biết..."
                            value={form.MoTa || ""}
                            onChange={(e) => setForm({ ...form, MoTa: e.target.value })}
                        />

                        <TextField
                            label="Ghi chú / Lưu ý"
                            fullWidth
                            placeholder="Các lưu ý đặc biệt khi kiểm tra lỗi này..."
                            value={form.GhiChu || ""}
                            onChange={(e) => setForm({ ...form, GhiChu: e.target.value })}
                        />

                        <TextField
                            select
                            label="Phân loại độ nghiêm trọng (Defect Type)"
                            required
                            fullWidth
                            value={form.DefectType || ""}
                            onChange={(e) => setForm({ ...form, DefectType: e.target.value })}
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
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, bgcolor: "#f8fafc" }}>
                    <Button onClick={() => setOpen(false)} color="inherit">
                        Huỷ bỏ
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

        </Box>
    );
}
