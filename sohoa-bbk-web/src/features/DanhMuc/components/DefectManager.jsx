import { useState, useEffect } from "react";
import {
    Card, CardContent, Table, TableHead,
    TableRow, TableCell, TableBody,
    IconButton, Button, Dialog,
    DialogTitle, DialogContent, DialogActions,
    TextField, Stack, Chip, Alert,
    Box, Typography, MenuItem
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

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

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await getDefectList();
                setData(res.data);
            } catch (err) {
                setError("Không thể tải dữ liệu: " + err.message);
            }
        }
        fetchData();
    }, []);

    async function reload() {
        const res = await getDefectList();
        setData(res.data);
    }

    async function handleSave() {
        try {
            if (form.Id) {
                await updateDefect(form.Id, form);
            } else {
                await createDefect(form);
            }

            setOpen(false);
            reload();

        } catch (err) {
            setError(err.response?.data?.message || "Có lỗi xảy ra");
        }
    }

    async function handleDelete(id) {
        try {
            await deleteDefect(id);
            reload();
        } catch (err) {
            setError(err.response?.data?.message || "Không thể xoá");
        }
    }

    return (
        <Box sx={{ p: 0 }}>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            {/* HEADER */}
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2
                }}
            >
                <Typography variant="h6" fontWeight={600}>
                    Danh sách lỗi
                </Typography>

                <Button
                    variant="contained"
                    onClick={() => {
                        setForm({});
                        setOpen(true);
                    }}
                >
                    Thêm lỗi
                </Button>
            </Box>

            {/* TABLE CARD */}
            <Card elevation={2}>
                <CardContent sx={{ p: 0 }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                                <TableCell sx={{ fontWeight: 600 }}>Mã lỗi</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Tên lỗi</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Loại</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {data.map(row => (
                                <TableRow
                                    key={row.Id}
                                    hover
                                >
                                    <TableCell>{row.MaLoi}</TableCell>
                                    <TableCell>{row.TenLoi}</TableCell>
                                    <TableCell>
                                        <Box
                                            sx={{
                                                fontWeight: 600,
                                                color:
                                                    row.DefectType === "CRITICAL"
                                                        ? "error.main"
                                                        : row.DefectType === "MAJOR"
                                                            ? "warning.main"
                                                            : row.DefectType === "MINOR"
                                                                ? "info.main"
                                                                : "inherit"
                                            }}
                                        >
                                            {row.DefectType}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={row.TrangThai ? "Hoạt động" : "Ngưng"}
                                            color={row.TrangThai ? "success" : "default"}
                                            size="small"
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

            {/* DIALOG */}
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {form.Id ? "Cập nhật lỗi" : "Thêm lỗi"}
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="Tên lỗi"
                            fullWidth
                            value={form.TenLoi || ""}
                            onChange={(e) =>
                                setForm({ ...form, TenLoi: e.target.value })
                            }
                        />

                        <TextField
                            select
                            label="Loại lỗi"
                            fullWidth
                            value={form.DefectType || ""}
                            onChange={(e) =>
                                setForm({ ...form, DefectType: e.target.value })
                            }
                            sx={{
                                "& .MuiInputBase-input": {
                                    fontWeight: 600,
                                    color:
                                        form.DefectType === "CRITICAL"
                                            ? "error.main"
                                            : form.DefectType === "MAJOR"
                                                ? "warning.main"
                                                : form.DefectType === "MINOR"
                                                    ? "info.main"
                                                    : "inherit"
                                }
                            }}
                        >
                            <MenuItem value="CRITICAL" sx={{ color: "error.main", fontWeight: 600 }}>
                                CRITICAL
                            </MenuItem>
                            <MenuItem value="MAJOR" sx={{ color: "warning.main", fontWeight: 600 }}>
                                MAJOR
                            </MenuItem>
                            <MenuItem value="MINOR" sx={{ color: "info.main", fontWeight: 600 }}>
                                MINOR
                            </MenuItem>
                        </TextField>
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