import { useState, useEffect, useCallback } from "react";
import {
    Card, CardContent, Table, TableHead,
    TableRow, TableCell, TableBody,
    IconButton, Button, Dialog,
    DialogTitle, DialogContent, DialogActions,
    TextField, Stack, Alert,
    Box, Typography, CircularProgress
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import {
    getInspectionLevelList,
    createInspectionLevel,
    updateInspectionLevel,
    deleteInspectionLevel
} from "../../../api/lookup.api";

export default function InspectionLevelManager() {

    const [data, setData] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // ✅ load data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const res = await getInspectionLevelList();
            setData(res?.data || []);

        } catch (err) {
            setError(err.response?.data?.message || "Không thể tải dữ liệu");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ✅ save
    const handleSave = async () => {
        try {

            if (form.LotMin > form.LotMax) {
                return setError("LotMin phải <= LotMax");
            }

            form.Id
                ? await updateInspectionLevel(form.Id, form)
                : await createInspectionLevel(form);

            setOpen(false);
            await loadData();

        } catch (err) {
            setError(err.response?.data?.message || "Có lỗi");
        }
    };

    // ✅ delete
    const handleDelete = async (id) => {
        try {
            await deleteInspectionLevel(id);
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || "Không thể xoá");
        }
    };

    return (
        <Box>

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
                    Danh mục Inspection Level (AQL)
                </Typography>

                <Button
                    variant="contained"
                    onClick={() => {
                        setForm({});
                        setOpen(true);
                    }}
                >
                    Thêm
                </Button>
            </Box>

            <Card>
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
                                <TableCell>Level</TableCell>
                                <TableCell>Số lượng</TableCell>
                                <TableCell>SL mẫu</TableCell>
                                <TableCell>Critical</TableCell>
                                <TableCell>Major</TableCell>
                                <TableCell>Minor</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {data.map(row => (
                                <TableRow key={row.Id} hover>
                                    <TableCell>{row.InspectionLevel}</TableCell>
                                    <TableCell>
                                        {row.LotMin} - {row.LotMax}
                                    </TableCell>
                                    <TableCell>{row.SampleSize}</TableCell>
                                    <TableCell>
                                        {row.Ac_Critical} / {row.Re_Critical}
                                    </TableCell>
                                    <TableCell>
                                        {row.Ac_Major} / {row.Re_Major}
                                    </TableCell>
                                    <TableCell>
                                        {row.Ac_Minor} / {row.Re_Minor}
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

            {/* ================= DIALOG ================= */}

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {form.Id ? "Cập nhật AQL" : "Thêm AQL"}
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>

                        <TextField
                            label="Inspection Level (I, II...)"
                            value={form.InspectionLevel || ""}
                            onChange={(e) =>
                                setForm({ ...form, InspectionLevel: e.target.value })
                            }
                            fullWidth
                        />

                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Lot Min"
                                type="number"
                                fullWidth
                                value={form.LotMin || ""}
                                onChange={(e) =>
                                    setForm({ ...form, LotMin: +e.target.value })
                                }
                            />
                            <TextField
                                label="Lot Max"
                                type="number"
                                fullWidth
                                value={form.LotMax || ""}
                                onChange={(e) =>
                                    setForm({ ...form, LotMax: +e.target.value })
                                }
                            />
                        </Stack>

                        <TextField
                            label="Sample Size"
                            type="number"
                            fullWidth
                            value={form.SampleSize || ""}
                            onChange={(e) =>
                                setForm({ ...form, SampleSize: +e.target.value })
                            }
                        />

                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Ac Critical"
                                type="number"
                                fullWidth
                                value={form.Ac_Critical || ""}
                                onChange={(e) =>
                                    setForm({ ...form, Ac_Critical: +e.target.value })
                                }
                            />
                            <TextField
                                label="Re Critical"
                                type="number"
                                fullWidth
                                value={form.Re_Critical || ""}
                                onChange={(e) =>
                                    setForm({ ...form, Re_Critical: +e.target.value })
                                }
                            />
                        </Stack>

                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Ac Major"
                                type="number"
                                fullWidth
                                value={form.Ac_Major || ""}
                                onChange={(e) =>
                                    setForm({ ...form, Ac_Major: +e.target.value })
                                }
                            />
                            <TextField
                                label="Re Major"
                                type="number"
                                fullWidth
                                value={form.Re_Major || ""}
                                onChange={(e) =>
                                    setForm({ ...form, Re_Major: +e.target.value })
                                }
                            />
                        </Stack>

                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Ac Minor"
                                type="number"
                                fullWidth
                                value={form.Ac_Minor || ""}
                                onChange={(e) =>
                                    setForm({ ...form, Ac_Minor: +e.target.value })
                                }
                            />
                            <TextField
                                label="Re Minor"
                                type="number"
                                fullWidth
                                value={form.Re_Minor || ""}
                                onChange={(e) =>
                                    setForm({ ...form, Re_Minor: +e.target.value })
                                }
                            />
                        </Stack>

                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Huỷ</Button>
                    <Button variant="contained" onClick={handleSave}>
                        Lưu
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}