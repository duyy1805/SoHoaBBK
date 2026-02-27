// src/features/phieuKiem/pages/PhieuKiemCreate.jsx

import { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    Button,
    MenuItem,
    Stack,
    IconButton,
    Tooltip,
    CircularProgress,
    Fade
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import {
    createPhieuKiem,
    getSanPhamLookup,
    getLoaiKiemLookup,
    getKCSLookup
} from "../../../api/phieuKiem.api";

export default function PhieuKiemCreate() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        sanPhamId: "",
        loaiKiemId: "",
        lot: "",
        doiTuong: "",
        nguoiKiemId: ""
    });

    const [sanPhamList, setSanPhamList] = useState([]);
    const [loaiKiemList, setLoaiKiemList] = useState([]);
    const [kcsList, setKcsList] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadLookup();
    }, []);

    const loadLookup = async () => {
        try {
            const [sp, lk, kcs] = await Promise.all([
                getSanPhamLookup(),
                getLoaiKiemLookup(),
                getKCSLookup()
            ]);

            setSanPhamList(sp.data);
            setLoaiKiemList(lk.data);
            setKcsList(kcs.data);

        } catch (err) {
            console.error(err);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        try {
            console.log(form);
            setLoading(true);
            await createPhieuKiem(form);
            navigate("/phieu-kiem");
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Fade in timeout={300}>
            <Box>
                {/* HEADER */}
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
                    <Tooltip title="Quay lại">
                        <IconButton onClick={() => navigate("/phieu-kiem")}>
                            <ArrowBackIcon />
                        </IconButton>
                    </Tooltip>

                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Phân bổ Phiếu kiểm
                    </Typography>
                </Stack>

                {/* FORM */}
                <Paper sx={{ p: 4, borderRadius: 4, boxShadow: 3 }}>
                    <Grid container spacing={3}>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                select
                                fullWidth
                                label="Sản phẩm"
                                name="sanPhamId"
                                value={form.sanPhamId}
                                onChange={handleChange}
                            >
                                {sanPhamList.map((sp) => (
                                    <MenuItem key={sp.Id} value={sp.Id}>
                                        {sp.TenSanPham}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                select
                                fullWidth
                                label="Loại kiểm"
                                name="loaiKiemId"
                                value={form.loaiKiemId}
                                onChange={handleChange}
                            >
                                {loaiKiemList.map((lk) => (
                                    <MenuItem key={lk.Id} value={lk.Id}>
                                        {lk.TenLoai}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="LOT"
                                name="lot"
                                value={form.lot}
                                onChange={handleChange}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="Đối tượng (PO/NCC)"
                                name="doiTuong"
                                value={form.doiTuong}
                                onChange={handleChange}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <TextField
                                select
                                fullWidth
                                label="KCS phụ trách"
                                name="nguoiKiemId"
                                value={form.nguoiKiemId}
                                onChange={handleChange}
                            >
                                {kcsList.map((user) => (
                                    <MenuItem key={user.Id} value={user.Id}>
                                        {user.FullName}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Stack direction="row" justifyContent="flex-end">
                                <Button
                                    variant="contained"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    startIcon={loading && <CircularProgress size={18} />}
                                >
                                    Tạo phiếu kiểm
                                </Button>
                            </Stack>
                        </Grid>

                    </Grid>
                </Paper>
            </Box>
        </Fade>
    );
}