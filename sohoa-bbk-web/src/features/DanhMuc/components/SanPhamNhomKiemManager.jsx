import { useEffect, useState, useMemo } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Table,
    TableRow,
    TableCell,
    TableHead,
    TableBody,
    IconButton,
    Checkbox,
    TextField,
    Box,
    Typography,
    Autocomplete,
    CircularProgress
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";

import {
    getSanPhamNhomKiem,
    createSanPhamNhomKiem,
    deleteSanPhamNhomKiem,
    getNhomKiemList
} from "../../../api/lookup.api";

export default function SanPhamNhomKiemManager({
    sanPham,
    open,
    onClose
}) {

    const [nhomList, setNhomList] = useState([]);
    const [data, setData] = useState([]);

    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);

    // load data
    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getSanPhamNhomKiem(sanPham.Id);
            setData(res.data || []);
        } finally {
            setLoading(false);
        }
    };

    const loadNhom = async () => {
        const res = await getNhomKiemList();
        setNhomList(res.data || []);
    };

    useEffect(() => {
        if (open) {
            loadData();
            loadNhom();
        }
    }, [open]);

    // ❗ loại bỏ nhóm đã chọn
    const nhomAvailable = useMemo(() => {
        const usedIds = data.map(x => x.NhomKiemId);
        return nhomList
            .filter(n => !usedIds.includes(n.Id))
            .sort((a, b) => a.ThuTu - b.ThuTu);
    }, [nhomList, data]);

    const handleAdd = async () => {
        if (!selected) return;

        await createSanPhamNhomKiem({
            SanPhamId: sanPham.Id,
            NhomKiemId: selected.Id,
            BatBuoc: true,
            ThuTu: data.length + 1
        });

        setSelected(null);
        loadData();
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Xoá nhóm này?")) return;

        await deleteSanPhamNhomKiem(id);
        loadData();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">

            <DialogTitle>
                Nhóm kiểm của sản phẩm: {sanPham?.TenSanPham}
            </DialogTitle>

            <DialogContent>

                {/* TABLE */}
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nhóm kiểm</TableCell>
                            <TableCell>Bắt buộc</TableCell>
                            <TableCell>Thứ tự</TableCell>
                            <TableCell />
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {data.map((row) => (
                            <TableRow key={row.Id}>
                                <TableCell>
                                    <Typography fontWeight={600}>
                                        {row.TenNhom}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Checkbox checked={row.BatBuoc} disabled />
                                </TableCell>

                                <TableCell>{row.ThuTu}</TableCell>

                                <TableCell align="right">
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

                {/* AUTOCOMPLETE */}
                <Box sx={{ mt: 3 }}>
                    <Autocomplete
                        options={nhomAvailable}
                        value={selected}
                        onChange={(e, value) => setSelected(value)}
                        loading={loading}
                        getOptionLabel={(option) =>
                            `${option.TenNhom} - ${option.MoTa || ""}`
                        }
                        isOptionEqualToValue={(opt, val) => opt.Id === val.Id}
                        noOptionsText="Không còn nhóm phù hợp"
                        renderOption={(props, option) => (
                            <li {...props}>
                                <Box>
                                    <Typography fontWeight={600}>
                                        {option.TenNhom}
                                    </Typography>

                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        {option.MoTa}
                                    </Typography>
                                </Box>
                            </li>
                        )}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Tìm & chọn nhóm kiểm"
                                placeholder="Nhập tên hoặc mô tả..."
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {loading && <CircularProgress size={18} />}
                                            {params.InputProps.endAdornment}
                                        </>
                                    )
                                }}
                            />
                        )}
                    />
                </Box>

                {/* PREVIEW */}
                {selected && (
                    <Box
                        sx={{
                            mt: 2,
                            p: 2,
                            border: "1px dashed #ccc",
                            borderRadius: 2,
                            background: "#fafafa"
                        }}
                    >
                        <Typography fontWeight={600}>
                            {selected.TenNhom}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                            {selected.MoTa}
                        </Typography>

                        <Typography variant="caption">
                            Thứ tự mặc định: {selected.ThuTu}
                        </Typography>
                    </Box>
                )}

            </DialogContent>

            <DialogActions>

                <Button onClick={onClose}>
                    Đóng
                </Button>

                <Button
                    variant="contained"
                    onClick={handleAdd}
                    disabled={!selected}
                >
                    Thêm nhóm
                </Button>

            </DialogActions>

        </Dialog>
    );
}