import { useEffect, useState, useMemo } from "react";
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
    Fade,
    Dialog,
    DialogTitle,
    DialogContent,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Chip,
    Divider,
    InputAdornment
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../components/common/ToastContext";

import {
    createPhieuKiem,
    getSanPhamLookup,
    getLoaiKiemLookup,
    getKCSLookup,
    getLichDongContChuaKiem,
    getChungTuNhapChuaKiem
} from "../../../api/phieuKiem.api";

export default function PhieuKiemCreate() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [form, setForm] = useState({
        sanPhamId: "",
        loaiKiemId: "",
        lot: "",
        doiTuong: "",
        nguoiKiemId: "",
        sourceId: null
    });

    const [sanPhamList, setSanPhamList] = useState([]);
    const [loaiKiemList, setLoaiKiemList] = useState([]);
    const [kcsList, setKcsList] = useState([]);

    const [selectedLoai, setSelectedLoai] = useState(null);
    const [selectedLich, setSelectedLich] = useState(null);

    const [lichList, setLichList] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [openModal, setOpenModal] = useState(false);
    const [loadingModal, setLoadingModal] = useState(false);

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

    // 🔥 XỬ LÝ LỌC DỮ LIỆU TÌM KIẾM
    const filteredLichList = useMemo(() => {
        if (!searchTerm) return lichList;
        const lower = searchTerm.toLowerCase();

        return lichList.filter((row) => {
            if (selectedLoai?.MaLoai === "KIEM_DONG_CONT") {
                return (
                    row.So_Cont?.toLowerCase().includes(lower) ||
                    row.ItemCode?.toLowerCase().includes(lower) ||
                    row.Ten_Hang?.toLowerCase().includes(lower) ||
                    row.Ma_KhachHang?.toLowerCase().includes(lower) ||
                    row.So_Invoice?.toLowerCase().includes(lower)
                );
            }
            if (selectedLoai?.MaLoai === "DAU_VAO") {
                return (
                    row.So_Invoice?.toLowerCase().includes(lower) ||
                    row.Ma_DonHang?.toLowerCase().includes(lower) ||
                    row.Ma_VatTu?.toLowerCase().includes(lower) ||
                    row.QuyCach?.toLowerCase().includes(lower) ||
                    row.Ten_NhaCungCap?.toLowerCase().includes(lower)
                );
            }
            return false;
        });
    }, [lichList, searchTerm, selectedLoai]);

    // 🔥 HANDLE CHANGE
    const handleChange = async (e) => {
        const { name, value } = e.target;

        if (name === "loaiKiemId") {
            const loai = loaiKiemList.find(x => x.Id === value);
            setSelectedLoai(loai);

            // reset
            setSelectedLich(null);
            setSearchTerm(""); // Reset thanh tìm kiếm
            setForm(prev => ({
                ...prev,
                loaiKiemId: value,
                sanPhamId: "",
                lot: "",
                doiTuong: "",
                sourceId: null,
                soLuong: null
            }));

            setOpenModal(true);
            setLoadingModal(true);

            try {
                let res;

                if (loai?.MaLoai === "KIEM_DONG_CONT") {
                    res = await getLichDongContChuaKiem();
                }

                if (loai?.MaLoai === "DAU_VAO") {
                    res = await getChungTuNhapChuaKiem();
                }

                setLichList(res?.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingModal(false);
            }

            return;
        }

        setForm(prev => ({ ...prev, [name]: value }));
    };

    // 🔥 CHỌN KẾ HOẠCH
    const handleSelectLich = (row) => {
        let sp;

        // 🔹 KIỂM ĐÓNG CONT
        if (selectedLoai?.MaLoai === "KIEM_DONG_CONT") {
            sp = sanPhamList.find(
                x => x.MaSanPham?.toLowerCase() === row.ItemCode?.toLowerCase()
            );

            if (!sp) {
                showToast(`Sản phẩm chưa có trong danh mục: ${row.ItemCode}`, "error");
                return;
            }

            setForm(prev => ({
                ...prev,
                sanPhamId: sp.Id,
                lot: row.So_Cont,
                doiTuong: row.Ma_KhachHang,
                sourceId: row.ID_Lich,
                soLuong: row.SoLuong
            }));
        }

        // 🔹 KIỂM ĐẦU VÀO
        if (selectedLoai?.MaLoai === "DAU_VAO") {
            sp = sanPhamList.find(
                x => x.MaSanPham?.toLowerCase() === row.Ma_VatTu?.toLowerCase()
            );

            if (!sp) {
                showToast(`Vật tư chưa có trong danh mục: ${row.Ma_VatTu}`, "error");
                return;
            }

            setForm(prev => ({
                ...prev,
                sanPhamId: sp.Id,
                lot: row.So_Invoice,
                doiTuong: row.Ma_DonHang || row.ID_NhaCungCap,
                sourceId: row.ID_ChungTuNhap_ChiTiet,
                soLuong: row.SoLuong
            }));
        }

        setSelectedLich(row);
        setOpenModal(false);
    };

    // 🔥 SUBMIT
    const handleSubmit = async () => {
        try {
            if (!form.loaiKiemId || !form.nguoiKiemId) {
                showToast("Vui lòng nhập đầy đủ thông tin", "error");
                return;
            }

            setLoading(true);
            await createPhieuKiem(form);
            navigate("/phieu-kiem");
        } catch (err) {
            showToast(err?.response?.data?.message || "Lỗi tạo phiếu", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Fade in timeout={300}>
            <Box>

                {/* HEADER */}
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
                    <IconButton onClick={() => navigate("/phieu-kiem")}>
                        <ArrowBackIcon />
                    </IconButton>

                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Tạo Phiếu kiểm
                    </Typography>
                </Stack>

                {/* FORM */}
                <Paper sx={{ p: 4, borderRadius: 4 }}>

                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Thông tin chung
                    </Typography>

                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={3}>

                        {/* LOẠI KIỂM */}
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

                        {/* KCS */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                select
                                fullWidth
                                label="KCS phụ trách"
                                name="nguoiKiemId"
                                value={form.nguoiKiemId}
                                onChange={handleChange}
                            >
                                {kcsList.map((u) => (
                                    <MenuItem key={u.Id} value={u.Id}>
                                        {u.FullName}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {/* SẢN PHẨM */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="Sản phẩm"
                                value={
                                    selectedLich
                                        ? selectedLoai?.MaLoai === "DAU_VAO"
                                            ? `${selectedLich.Ma_VatTu} - ${selectedLich.QuyCach}`
                                            : `${selectedLich.ItemCode} - ${selectedLich.Ten_Hang}`
                                        : ""
                                }
                                placeholder="Chọn loại kiểm để chọn kế hoạch"
                                InputProps={{ readOnly: true }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="Số lượng kiểm"
                                value={form.soLuong || ""}
                                InputProps={{ readOnly: true }}
                            />
                        </Grid>
                        {/* LOT */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="LOT"
                                name="lot"
                                value={form.lot}
                                onChange={handleChange}
                            />
                        </Grid>

                        {/* ĐỐI TƯỢNG */}
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                label="Khách hàng / PO"
                                value={form.doiTuong}
                                InputProps={{ readOnly: true }}
                            />
                        </Grid>

                        {/* KẾ HOẠCH INFO */}
                        {selectedLich && (
                            <Grid size={{ xs: 12 }}>
                                <Paper sx={{ p: 2, bgcolor: "#f5f5f5" }}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <AssignmentIcon color="primary" />

                                        <Typography>
                                            Cont/Invoice: <b>{selectedLich.So_Cont || selectedLich.So_Invoice}</b>
                                        </Typography>

                                        <Chip label={`SL: ${selectedLich.SoLuong}`} />

                                        <Chip
                                            label={new Date(selectedLich.Ngay_Giao || selectedLich.Ngay_Invoice).toLocaleDateString()}
                                            color="warning"
                                        />

                                        <Button size="small" onClick={() => setOpenModal(true)}>
                                            Chọn lại
                                        </Button>
                                    </Stack>
                                </Paper>
                            </Grid>
                        )}

                        {/* BUTTON */}
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

                {/* MODAL */}
                <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="lg" fullWidth scroll="paper">
                    <DialogTitle>Chọn kế hoạch kiểm tra</DialogTitle>
                    <DialogContent dividers>

                        {loadingModal ? (
                            <Box sx={{ textAlign: "center", p: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <Box>
                                {/* THANH TÌM KIẾM */}
                                <TextField
                                    fullWidth
                                    placeholder="Tìm kiếm theo mã, tên, số cont, invoice..."
                                    variant="outlined"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    sx={{ mb: 3 }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon color="action" />
                                            </InputAdornment>
                                        )
                                    }}
                                />

                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>

                                            {selectedLoai?.MaLoai === "KIEM_DONG_CONT" && (
                                                <>
                                                    <TableCell>Cont</TableCell>
                                                    <TableCell>Item Code</TableCell>
                                                    <TableCell>Tên sản phẩm</TableCell>
                                                    <TableCell>Khách hàng</TableCell>
                                                    <TableCell>Invoice</TableCell>
                                                </>
                                            )}

                                            {selectedLoai?.MaLoai === "DAU_VAO" && (
                                                <>
                                                    <TableCell>Invoice</TableCell>
                                                    <TableCell>Đơn hàng</TableCell>
                                                    <TableCell>Mã vật tư</TableCell>
                                                    <TableCell>Quy cách</TableCell>
                                                    <TableCell>Nhà cung cấp</TableCell>
                                                </>
                                            )}

                                            <TableCell>SL</TableCell>
                                            <TableCell>Ngày</TableCell>

                                        </TableRow>
                                    </TableHead>

                                    <TableBody>
                                        {filteredLichList.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                                    <Typography color="text.secondary">
                                                        Không tìm thấy kết quả phù hợp.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredLichList.map((row) => (
                                                <TableRow
                                                    key={
                                                        selectedLoai?.MaLoai === "KIEM_DONG_CONT"
                                                            ? row.ID_Lich
                                                            : row.ID_ChungTuNhap_ChiTiet
                                                    }
                                                    hover
                                                    sx={{ cursor: "pointer" }}
                                                    onClick={() => handleSelectLich(row)}
                                                >

                                                    {/* DONG CONT */}
                                                    {selectedLoai?.MaLoai === "KIEM_DONG_CONT" && (
                                                        <>
                                                            <TableCell><b>{row.So_Cont}</b></TableCell>
                                                            <TableCell>{row.ItemCode}</TableCell>
                                                            <TableCell>{row.Ten_Hang}</TableCell>
                                                            <TableCell>
                                                                <Chip label={row.Ma_KhachHang} size="small" />
                                                            </TableCell>
                                                            <TableCell>{row.So_Invoice}</TableCell>
                                                        </>
                                                    )}

                                                    {/* NHẬP */}
                                                    {selectedLoai?.MaLoai === "DAU_VAO" && (
                                                        <>
                                                            <TableCell><b>{row.So_Invoice}</b></TableCell>
                                                            <TableCell>{row.Ma_DonHang}</TableCell>
                                                            <TableCell>
                                                                <Typography fontWeight={600}>
                                                                    {row.Ma_VatTu}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>{row.QuyCach}</TableCell>
                                                            <TableCell>{row.Ten_NhaCungCap}</TableCell>
                                                        </>
                                                    )}

                                                    <TableCell><b>{row.SoLuong}</b></TableCell>

                                                    <TableCell>
                                                        {new Date(
                                                            row.Ngay_Giao || row.Ngay_Invoice
                                                        ).toLocaleDateString()}
                                                    </TableCell>

                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}

                    </DialogContent>
                </Dialog>

            </Box>
        </Fade>
    );
}