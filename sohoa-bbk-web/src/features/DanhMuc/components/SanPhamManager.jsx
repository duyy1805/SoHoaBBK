import { useEffect, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
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
    MenuItem,
    Chip
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

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

    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({});

    const [nhomDialog, setNhomDialog] = useState(false);
    const [selectedSanPham, setSelectedSanPham] = useState(null);

    const [nhomData, setNhomData] = useState([]);
    const [nhomList, setNhomList] = useState([]);

    const [selectedNhom, setSelectedNhom] = useState("");
    const [batBuoc, setBatBuoc] = useState(true);
    const [thuTu, setThuTu] = useState(1);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const res = await getSanPhamList();
        setData(res.data || []);
    };

    const loadSanPhamNhom = async (sanPhamId) => {
        const res = await getSanPhamNhomKiem(sanPhamId);
        setNhomData(res.data || []);
    };

    const openNhomManager = async (sanPham) => {

        setSelectedSanPham(sanPham);
        setNhomDialog(true);

        const nhom = await getNhomKiemList();
        setNhomList(nhom.data || []);

        const res = await getSanPhamNhomKiem(sanPham.Id);

        setNhomData(res.data || []);

        setThuTu((res.data?.length || 0) + 1);
        setSelectedNhom("");
        setBatBuoc(true);
    };

    const handleSave = async () => {

        if (!form.MaSanPham || !form.TenSanPham) return;

        if (form.Id)
            await updateSanPham(form.Id, form);
        else
            await createSanPham(form);

        setOpen(false);
        loadData();
    };

    const handleDelete = async (id) => {

        if (!window.confirm("Xóa sản phẩm?")) return;

        await deleteSanPham(id);
        loadData();
    };

    const handleAddNhom = async () => {

        if (!selectedNhom) return;

        const exists = nhomData.some(
            n => n.NhomKiemId === selectedNhom
        );

        if (exists) {
            alert("Nhóm kiểm đã tồn tại");
            return;
        }

        await createSanPhamNhomKiem({
            SanPhamId: selectedSanPham.Id,
            NhomKiemId: selectedNhom,
            BatBuoc: true,
            ThuTu: thuTu
        });

        setSelectedNhom("");
        setThuTu(thuTu + 1);

        loadSanPhamNhom(selectedSanPham.Id);
    };

    const handleDeleteNhom = async (id) => {

        await deleteSanPhamNhomKiem(id);

        loadSanPhamNhom(selectedSanPham.Id);
    };

    return (
        <Box sx={{ p: 0 }}>

            <Typography variant="h5" sx={{ mb: 3 }}>
                Quản lý Sản phẩm
            </Typography>

            <Button
                variant="contained"
                sx={{ mb: 2 }}
                onClick={() => {
                    setForm({});
                    setOpen(true);
                }}
            >
                Thêm sản phẩm
            </Button>

            <Card>
                <CardContent sx={{ p: 0 }}>

                    <Table>

                        <TableHead>
                            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                                <TableCell>Mã</TableCell>
                                <TableCell>Tên sản phẩm</TableCell>
                                <TableCell>Mô tả</TableCell>
                                <TableCell>Nhóm kiểm</TableCell>
                                <TableCell align="right">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>

                            {data.map((row) => (

                                <TableRow key={row.Id} hover>

                                    <TableCell>{row.MaSanPham}</TableCell>

                                    <TableCell>{row.TenSanPham}</TableCell>

                                    <TableCell>{row.MoTa}</TableCell>

                                    <TableCell>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => openNhomManager(row)}
                                        >
                                            Quản lý
                                        </Button>
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

            {/* Dialog sản phẩm */}

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">

                <DialogTitle>
                    {form.Id ? "Cập nhật sản phẩm" : "Thêm sản phẩm"}
                </DialogTitle>

                <DialogContent dividers>

                    <Stack spacing={3}>

                        <TextField
                            label="Mã sản phẩm"
                            fullWidth
                            value={form.MaSanPham || ""}
                            onChange={(e) =>
                                setForm({ ...form, MaSanPham: e.target.value })
                            }
                        />

                        <TextField
                            label="Tên sản phẩm"
                            fullWidth
                            value={form.TenSanPham || ""}
                            onChange={(e) =>
                                setForm({ ...form, TenSanPham: e.target.value })
                            }
                        />

                        <TextField
                            label="Mô tả"
                            multiline
                            rows={3}
                            fullWidth
                            value={form.MoTa || ""}
                            onChange={(e) =>
                                setForm({ ...form, MoTa: e.target.value })
                            }
                        />

                    </Stack>

                </DialogContent>

                <DialogActions>

                    <Button onClick={() => setOpen(false)}>
                        Huỷ
                    </Button>

                    <Button variant="contained" onClick={handleSave}>
                        Lưu
                    </Button>

                </DialogActions>

            </Dialog>

            {/* Dialog nhóm kiểm */}

            <Dialog
                open={nhomDialog}
                onClose={() => setNhomDialog(false)}
                maxWidth="md"
                fullWidth
            >

                <DialogTitle>
                    Nhóm kiểm của {selectedSanPham?.TenSanPham}
                </DialogTitle>

                <DialogContent>

                    <Stack direction="row" spacing={2} sx={{ mb: 3 }}>

                        <TextField
                            select
                            label="Nhóm kiểm"
                            value={selectedNhom}
                            onChange={(e) => setSelectedNhom(e.target.value)}
                            sx={{ width: 260 }}
                        >
                            {nhomList.map(n => (
                                <MenuItem key={n.Id} value={n.Id}>
                                    {n.TenNhom}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            label="Thứ tự"
                            type="number"
                            value={thuTu}
                            onChange={(e) => setThuTu(Number(e.target.value))}
                            sx={{ width: 140 }}
                        />

                        <Button
                            variant="contained"
                            onClick={handleAddNhom}
                        >
                            Thêm
                        </Button>

                    </Stack>

                    <Table size="small">

                        <TableHead>
                            <TableRow>
                                <TableCell>Nhóm kiểm</TableCell>
                                <TableCell>Thứ tự</TableCell>
                                <TableCell align="right"></TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>

                            {nhomData.map(row => (

                                <TableRow key={row.Id}>

                                    <TableCell>
                                        <Chip label={row.TenNhom} size="small" />
                                    </TableCell>

                                    <TableCell>
                                        {row.ThuTu}
                                    </TableCell>

                                    <TableCell align="right">

                                        <IconButton
                                            onClick={() => handleDeleteNhom(row.Id)}
                                        >
                                            <DeleteIcon color="error" />
                                        </IconButton>

                                    </TableCell>

                                </TableRow>

                            ))}

                        </TableBody>

                    </Table>

                </DialogContent>

            </Dialog>

        </Box>
    );
}