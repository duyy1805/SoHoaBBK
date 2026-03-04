import { useState, useEffect, useCallback } from "react";
import {
    Card, CardContent, Table, TableHead,
    TableRow, TableCell, TableBody,
    IconButton, Button, Dialog,
    DialogTitle, DialogContent, DialogActions,
    TextField, Stack, Alert, MenuItem,
    Box, Typography, CircularProgress
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import {
    getNhomKiemList,
    getCheckItemByNhom,
    createCheckItem,
    updateCheckItem,
    deleteCheckItem
} from "../../../api/lookup.api";

export default function CheckItemManager() {

    const [nhomList, setNhomList] = useState([]);
    const [selectedNhom, setSelectedNhom] = useState("");
    const [data, setData] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // ================= LOAD NHOM =================
    const loadNhom = useCallback(async () => {
        try {
            const res = await getNhomKiemList();
            setNhomList(res?.data || []);
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Có lỗi xảy ra";

            setError(message);
        }
    }, []);

    // ================= LOAD DATA =================
    const loadData = useCallback(async () => {
        if (!selectedNhom) {
            setData([]);
            return;
        }

        try {
            setLoading(true);
            const res = await getCheckItemByNhom(selectedNhom);
            setData(res?.data || []);
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Có lỗi xảy ra";

            setError(message);
        } finally {
            setLoading(false);
        }
    }, [selectedNhom]);

    // load nhóm khi mount
    useEffect(() => {
        loadNhom();
    }, [loadNhom]);

    // load mục kiểm khi chọn nhóm
    useEffect(() => {
        loadData();
    }, [loadData]);

    // ================= SAVE =================
    const handleSave = async () => {
        try {
            if (form.Id) {
                await updateCheckItem(form.Id, form);
            } else {
                await createCheckItem({
                    ...form,
                    NhomKiemId: selectedNhom
                });
            }

            setOpen(false);
            await loadData();

        } catch (err) {
            setError(err.response?.data?.message || "Có lỗi khi lưu");
        }
    };

    // ================= DELETE =================
    const handleDelete = async (id) => {
        try {
            await deleteCheckItem(id);
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || "Không thể xoá");
        }
    };

    return (
        <Box sx={{ p: 0 }}>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* HEADER SELECT */}
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    mb: 3
                }}
            >
                <TextField
                    select
                    label="Chọn nhóm kiểm"
                    value={selectedNhom}
                    onChange={(e) => setSelectedNhom(e.target.value)}
                    sx={{ width: 300 }}
                >
                    {nhomList.map(n => (
                        <MenuItem key={n.Id} value={n.Id}>
                            {n.TenNhom}
                        </MenuItem>
                    ))}
                </TextField>

                {selectedNhom && (
                    <Button
                        variant="contained"
                        onClick={() => {
                            setForm({});
                            setOpen(true);
                        }}
                    >
                        Thêm mục kiểm
                    </Button>
                )}
            </Box>

            {/* TABLE */}
            {selectedNhom && (
                <Card elevation={2}>
                    <CardContent sx={{ p: 0, position: "relative" }}>

                        {loading && (
                            <Box
                                sx={{
                                    position: "absolute",
                                    inset: 0,
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
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
                                    <TableCell sx={{ fontWeight: 600 }}>
                                        Thứ tự
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>
                                        Tên mục kiểm
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>
                                        Tiêu chuẩn
                                    </TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {data.map(row => (
                                    <TableRow key={row.Id} hover>
                                        <TableCell>{row.ThuTu}</TableCell>
                                        <TableCell>{row.TenMucKiem}</TableCell>
                                        <TableCell>{row.TieuChuan}</TableCell>
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
            )}

            {/* DIALOG */}
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {form.Id ? "Cập nhật mục kiểm" : "Thêm mục kiểm"}
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="Tên mục kiểm"
                            fullWidth
                            value={form.TenMucKiem || ""}
                            onChange={(e) =>
                                setForm({ ...form, TenMucKiem: e.target.value })
                            }
                        />
                        <TextField
                            label="Tiêu chuẩn"
                            fullWidth
                            value={form.TieuChuan || ""}
                            onChange={(e) =>
                                setForm({ ...form, TieuChuan: e.target.value })
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