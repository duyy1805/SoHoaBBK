import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Card, CardContent, Table, TableHead,
    TableRow, TableCell, TableBody,
    IconButton, Button, Dialog,
    DialogTitle, DialogContent, DialogActions,
    TextField, Stack, Chip, Alert, MenuItem,
    Box, Typography, CircularProgress
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import {
    getNhomKiemList,
    createNhomKiem,
    updateNhomKiem,
    deleteNhomKiem
} from "../../../api/lookup.api";

export default function NhomKiemManager() {

    const [data, setData] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // ✅ loadData chuẩn
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const res = await getNhomKiemList();
            setData(res?.data || []);

        } catch (err) {
            setError(err.response?.data?.message || "Không thể tải dữ liệu");
        } finally {
            setLoading(false);
        }
    }, []);

    // ✅ effect an toàn
    useEffect(() => {
        let mounted = true;

        async function init() {
            if (!mounted) return;
            await loadData();
        }

        init();

        return () => {
            mounted = false;
        };
    }, [loadData]);

    const handleSave = async () => {
        try {
            form.Id
                ? await updateNhomKiem(form.Id, form)
                : await createNhomKiem(form);

            setOpen(false);
            await loadData(); // ✅ await reload

        } catch (err) {
            setError(err.response?.data?.message || "Có lỗi");
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteNhomKiem(id);
            await loadData(); // ✅ await reload
        } catch (err) {
            setError(err.response?.data?.message || "Không thể xoá");
        }
    };

    const filteredData = useMemo(() => {
        const value = keyword.trim().toLowerCase();

        return data.filter((row) => {
            const matchesKeyword = !value || [
                row.TenNhom,
                row.MoTa,
                row.ThuTu
            ].some((field) => String(field || "").toLowerCase().includes(value));
            const isActive = row.TrangThai !== false && row.TrangThai !== 0;
            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && isActive) ||
                (statusFilter === "INACTIVE" && !isActive);

            return matchesKeyword && matchesStatus;
        });
    }, [data, keyword, statusFilter]);

    return (
        <Box sx={{ p: 0 }}>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2
                }}
            >
                <Typography variant="h6" fontWeight={600}>
                    Danh sách nhóm kiểm
                </Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField
                        size="small"
                        label="Tìm nhóm"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        sx={{ minWidth: { sm: 220 } }}
                    />
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
                        <MenuItem value="INACTIVE">Ngưng</MenuItem>
                    </TextField>
                    <Chip label={`${filteredData.length}/${data.length}`} sx={{ height: 40 }} />
                    <Button
                        variant="contained"
                        onClick={() => {
                            setForm({});
                            setOpen(true);
                        }}
                        sx={{ whiteSpace: "nowrap" }}
                    >
                        Thêm nhóm kiểm
                    </Button>
                </Stack>
            </Box>

            <Card elevation={2}>
                <CardContent sx={{ p: 0, position: "relative" }}>

                    {loading && (
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(255,255,255,0.6)",
                                zIndex: 10
                            }}
                        >
                            <CircularProgress />
                        </Box>
                    )}

                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                                <TableCell sx={{ fontWeight: 600 }}>Tên nhóm</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Mô tả</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Thứ tự</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {filteredData.length === 0 && !loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">Không có nhóm kiểm phù hợp</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : filteredData.map(row => (
                                <TableRow key={row.Id} hover>
                                    <TableCell>{row.TenNhom}</TableCell>
                                    <TableCell>{row.MoTa}</TableCell>
                                    <TableCell>{row.ThuTu}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={row.TrangThai ? "Hoạt động" : "Ngưng"}
                                            size="small"
                                            color={row.TrangThai ? "success" : "default"}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            onClick={() => {
                                                setForm(row);
                                                setOpen(true);
                                            }}
                                        >
                                            <EditIcon />
                                        </IconButton>

                                        <IconButton
                                            onClick={() => handleDelete(row.Id)}
                                        >
                                            <DeleteIcon color="error" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                </CardContent>
            </Card>

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {form.Id ? "Cập nhật nhóm kiểm" : "Thêm nhóm kiểm"}
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="Tên nhóm"
                            fullWidth
                            value={form.TenNhom || ""}
                            onChange={(e) =>
                                setForm({ ...form, TenNhom: e.target.value })
                            }
                        />
                        <TextField
                            label="Mô tả"
                            fullWidth
                            value={form.MoTa || ""}
                            onChange={(e) =>
                                setForm({ ...form, MoTa: e.target.value })
                            }
                        />
                        <TextField
                            label="Thứ tự"
                            type="number"
                            fullWidth
                            value={form.ThuTu || ""}
                            onChange={(e) =>
                                setForm({ ...form, ThuTu: e.target.value })
                            }
                        />
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpen(false)}>
                        Huỷ
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleSave}
                    >
                        Lưu
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}
