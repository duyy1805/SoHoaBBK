import { useEffect, useState } from "react";
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
    MenuItem
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";

import {
    getSanPhamNhomKiem,
    createSanPhamNhomKiem,
    deleteSanPhamNhomKiem
} from "../../../api/lookup.api";

import { getNhomKiemList } from "../../../api/lookup.api";

export default function SanPhamNhomKiemManager({
    sanPham,
    open,
    onClose
}) {

    const [nhomList, setNhomList] = useState([]);
    const [data, setData] = useState([]);

    const [selectedNhom, setSelectedNhom] = useState("");

    const loadData = async () => {
        const res = await getSanPhamNhomKiem(sanPham.Id);
        setData(res.data);
    };

    const loadNhom = async () => {
        const res = await getNhomKiemList();
        setNhomList(res.data);
    };

    useEffect(() => {
        if (open) {
            loadData();
            loadNhom();
        }
    }, [open]);

    const handleAdd = async () => {

        if (!selectedNhom) return;

        await createSanPhamNhomKiem({
            SanPhamId: sanPham.Id,
            NhomKiemId: selectedNhom,
            BatBuoc: true,
            ThuTu: data.length + 1
        });

        setSelectedNhom("");
        loadData();
    };

    const handleDelete = async (id) => {

        await deleteSanPhamNhomKiem(id);

        loadData();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">

            <DialogTitle>
                Nhóm kiểm của sản phẩm: {sanPham?.TenSanPham}
            </DialogTitle>

            <DialogContent>

                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nhóm kiểm</TableCell>
                            <TableCell>Bắt buộc</TableCell>
                            <TableCell>Thứ tự</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>

                        {data.map((row) => (

                            <TableRow key={row.Id}>

                                <TableCell>{row.TenNhom}</TableCell>

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

                <TextField
                    select
                    label="Thêm nhóm kiểm"
                    fullWidth
                    sx={{ mt: 3 }}
                    value={selectedNhom}
                    onChange={(e) => setSelectedNhom(e.target.value)}
                >

                    {nhomList.map((n) => (
                        <MenuItem key={n.Id} value={n.Id}>
                            {n.TenNhom}
                        </MenuItem>
                    ))}

                </TextField>

            </DialogContent>

            <DialogActions>

                <Button onClick={onClose}>
                    Đóng
                </Button>

                <Button
                    variant="contained"
                    onClick={handleAdd}
                >
                    Thêm nhóm
                </Button>

            </DialogActions>

        </Dialog>
    );
}