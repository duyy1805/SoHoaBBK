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
    CircularProgress,
    Fade,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Chip,
    Divider,
    InputAdornment,
    Checkbox
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
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

    // Form chỉ cần giữ ID loại kiểm và ID người kiểm, các thông tin khác lấy từ List
    const [form, setForm] = useState({
        loaiKiemId: "",
        nguoiKiemId: ""
    });

    const [sanPhamList, setSanPhamList] = useState([]);
    const [loaiKiemList, setLoaiKiemList] = useState([]);
    const [kcsList, setKcsList] = useState([]);

    const [selectedLoai, setSelectedLoai] = useState(null);

    // Thay selectedLich bằng mảng chứa các kế hoạch đã chọn
    const [selectedLichList, setSelectedLichList] = useState([]);

    const [lichList, setLichList] = useState([]);

    // States cho Tìm kiếm & Filter
    const [searchTerm, setSearchTerm] = useState("");
    const [chungLoaiFilter, setChungLoaiFilter] = useState("");
    const [showChungLoaiFilter, setShowChungLoaiFilter] = useState(false);

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

    // 🔥 XỬ LÝ LỌC DỮ LIỆU TÌM KIẾM & CHỦNG LOẠI
    const filteredLichList = useMemo(() => {
        let result = lichList;

        // 1. Lọc theo search tổng
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter((row) => {
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
                        row.So_DonDatHang?.toLowerCase().includes(lower) ||
                        row.Ma_DonHang?.toLowerCase().includes(lower) ||
                        row.Ma_VatTu?.toLowerCase().includes(lower) ||
                        row.QuyCach?.toLowerCase().includes(lower) ||
                        row.Ten_NhaCungCap?.toLowerCase().includes(lower)
                    );
                }
                return false;
            });
        }

        // 2. Lọc riêng cho cột Chủng loại vật tư (Nếu là ĐẦU VÀO)
        if (selectedLoai?.MaLoai === "DAU_VAO" && chungLoaiFilter) {

            console.log(chungLoaiFilter);
            const lowerChungLoai = chungLoaiFilter.toLowerCase();
            result = result.filter(row =>
                row.Ten_ChungLoaiVatTu?.toLowerCase().includes(lowerChungLoai)
            );
        }

        return result;
    }, [lichList, searchTerm, chungLoaiFilter, selectedLoai]);

    // Lấy ID định danh tùy theo loại phiếu
    const getRowId = (row) => selectedLoai?.MaLoai === "KIEM_DONG_CONT" ? row.ID_Lich : row.ID_KeHoach_ChiTiet;

    // 🔥 HANDLE CHANGE LOẠI KIỂM
    const handleChange = async (e) => {
        const { name, value } = e.target;

        if (name === "loaiKiemId") {
            const loai = loaiKiemList.find(x => x.Id === value);
            setSelectedLoai(loai);

            // Reset dữ liệu khi đổi loại kiểm
            setSelectedLichList([]);
            setSearchTerm("");
            setChungLoaiFilter("");
            setShowChungLoaiFilter(false);
            setForm(prev => ({ ...prev, loaiKiemId: value }));

            fetchLichList(loai);
            return;
        }

        setForm(prev => ({ ...prev, [name]: value }));
    };

    const fetchLichList = async (loai) => {
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
    };

    // 🔥 XỬ LÝ CHECKBOX (Chọn 1 / Chọn nhiều)
    const handleToggleRow = (row) => {
        if (!row.SanPhamId) {
            showToast(`Sản phẩm/Vật tư chưa có trong danh mục: ${row.Ma_VatTu || row.ItemCode}`, "error");
            return;
        }
        const rowId = getRowId(row);
        setSelectedLichList(prev => {
            const isSelected = prev.some(item => getRowId(item) === rowId);
            return isSelected ? prev.filter(item => getRowId(item) !== rowId) : [...prev, row];
        });
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const validRows = filteredLichList.filter(row => {
                if (!row.SanPhamId) return false;
                return true;
            });
            setSelectedLichList(validRows);
        } else {
            setSelectedLichList([]);
        }
    };

    const handleRemoveSelected = (rowId) => {
        setSelectedLichList(prev => prev.filter(item => getRowId(item) !== rowId));
    };

    // 🔥 SUBMIT TẠO HÀNG LOẠT
    const handleSubmit = async () => {
        try {
            if (!form.loaiKiemId || !form.nguoiKiemId) {
                showToast("Vui lòng chọn Loại kiểm và KCS phụ trách", "error");
                return;
            }
            if (selectedLichList.length === 0) {
                showToast("Vui lòng chọn ít nhất 1 kế hoạch để kiểm", "error");
                return;
            }

            setLoading(true);

            // Tạo payload cho từng kế hoạch đã chọn
            const promises = selectedLichList.map(row => {
                const payload = {
                    loaiKiemId: form.loaiKiemId,
                    nguoiKiemId: form.nguoiKiemId,
                    lot: "", // Theo yêu cầu: Lot để trống khi tạo hàng loạt
                    sanPhamId: row.SanPhamId,
                    soLuong: row.SoLuong,
                    // Xử lý đối tượng và sourceId tùy loại kiểm
                    doiTuong: selectedLoai?.MaLoai === "DAU_VAO" ? (row.Ma_DonHang || row.ID_NhaCungCap) : row.Ma_KhachHang,
                    sourceId: getRowId(row)
                };
                return createPhieuKiem(payload);
            });

            // Gửi đồng loạt tất cả các request
            await Promise.all(promises);

            showToast(`Đã tạo thành công ${selectedLichList.length} phiếu kiểm!`, "success");
            navigate("/phieu-kiem");
        } catch (err) {
            showToast(err?.response?.data?.message || "Có lỗi xảy ra khi tạo hàng loạt", "error");
        } finally {
            setLoading(false);
        }
    };

    const isAllSelected = filteredLichList.length > 0 && selectedLichList.length === filteredLichList.filter(r => r.SanPhamId).length;

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
                    <Typography variant="h6" sx={{ mb: 2 }}>Thông tin chung</Typography>
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
                        <Grid item size={{ xs: 12, md: 6 }}>
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

                        {/* DANH SÁCH ĐÃ CHỌN */}
                        <Grid size={{ xs: 12 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight={600}>
                                    Danh sách kế hoạch đã chọn ({selectedLichList.length})
                                </Typography>
                                <Button
                                    startIcon={<AddIcon />}
                                    variant="outlined"
                                    size="small"
                                    disabled={!form.loaiKiemId}
                                    onClick={() => fetchLichList(selectedLoai)}
                                >
                                    Chọn thêm / Sửa danh sách
                                </Button>
                            </Stack>

                            {selectedLichList.length > 0 ? (
                                <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Mã SP/Vật tư</TableCell>
                                                <TableCell>Tên / Quy cách</TableCell>
                                                <TableCell>Số lượng</TableCell>
                                                <TableCell>Nguồn</TableCell>
                                                <TableCell align="center">Xóa</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {selectedLichList.map(row => (
                                                <TableRow key={getRowId(row)}>
                                                    <TableCell fontWeight={600}>
                                                        {selectedLoai?.MaLoai === "DAU_VAO" ? row.Ma_VatTu : row.ItemCode}
                                                    </TableCell>
                                                    <TableCell>
                                                        {selectedLoai?.MaLoai === "DAU_VAO" ? row.QuyCach : row.Ten_Hang}
                                                    </TableCell>
                                                    <TableCell><b>{row.SoLuong}</b></TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            size="small"
                                                            label={selectedLoai?.MaLoai === "DAU_VAO" ? row.Ma_DonHang : row.So_Cont}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton color="error" size="small" onClick={() => handleRemoveSelected(getRowId(row))}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Paper>
                            ) : (
                                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: "#f9f9f9" }} variant="outlined">
                                    <Typography color="text.secondary">
                                        Chưa có kế hoạch nào được chọn. Vui lòng chọn loại kiểm để lấy dữ liệu.
                                    </Typography>
                                </Paper>
                            )}
                        </Grid>

                        {/* BUTTON TẠO HÀNG LOẠT */}
                        <Grid size={{ xs: 12 }}>
                            <Stack direction="row" justifyContent="flex-end">
                                <Button
                                    variant="contained"
                                    onClick={handleSubmit}
                                    disabled={loading || selectedLichList.length === 0}
                                    startIcon={loading && <CircularProgress size={18} color="inherit" />}
                                >
                                    Tạo {selectedLichList.length > 0 ? selectedLichList.length : ''} phiếu kiểm
                                </Button>
                            </Stack>
                        </Grid>
                    </Grid>
                </Paper>

                {/* MODAL CHỌN KẾ HOẠCH */}
                <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="lg" fullWidth scroll="paper">
                    <DialogTitle>Chọn kế hoạch kiểm tra</DialogTitle>
                    <DialogContent dividers sx={{ p: 0 }}>
                        {loadingModal ? (
                            <Box sx={{ textAlign: "center", p: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <Box sx={{ p: 2 }}>
                                {/* THANH TÌM KIẾM TỔNG */}
                                <TextField
                                    fullWidth
                                    placeholder="Tìm kiếm theo mã, tên, số cont, invoice..."
                                    variant="outlined"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    sx={{ mb: 2 }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon color="action" />
                                            </InputAdornment>
                                        )
                                    }}
                                />

                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    checked={isAllSelected}
                                                    onChange={handleSelectAll}
                                                />
                                            </TableCell>
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
                                                    <TableCell>Đơn hàng</TableCell>
                                                    <TableCell>Mã vật tư</TableCell>
                                                    <TableCell>Quy cách</TableCell>
                                                    {/* CỘT CÓ FILTER */}
                                                    <TableCell sx={{ minWidth: 200 }}>
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            <Typography variant="subtitle2" fontWeight="bold">
                                                                Chủng loại vật tư
                                                            </Typography>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setShowChungLoaiFilter(!showChungLoaiFilter)}
                                                                color={chungLoaiFilter ? "primary" : "default"}
                                                            >
                                                                <FilterListIcon fontSize="small" />
                                                            </IconButton>
                                                        </Stack>
                                                        {showChungLoaiFilter && (
                                                            <TextField
                                                                size="small"
                                                                placeholder="Lọc chủng loại..."
                                                                value={chungLoaiFilter}
                                                                onChange={(e) => setChungLoaiFilter(e.target.value)}
                                                                variant="standard"
                                                                fullWidth
                                                                sx={{ mt: 1 }}
                                                            />
                                                        )}
                                                    </TableCell>
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
                                                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                                                    <Typography color="text.secondary">
                                                        Không tìm thấy kết quả phù hợp.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredLichList.map((row) => {
                                                const isSelected = selectedLichList.some(item => getRowId(item) === getRowId(row));
                                                return (
                                                    <TableRow
                                                        key={getRowId(row)}
                                                        hover
                                                        onClick={() => handleToggleRow(row)}
                                                        role="checkbox"
                                                        selected={isSelected}
                                                        sx={{ cursor: "pointer" }}
                                                    >
                                                        <TableCell padding="checkbox">
                                                            <Checkbox checked={isSelected} />
                                                        </TableCell>

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

                                                        {selectedLoai?.MaLoai === "DAU_VAO" && (
                                                            <>
                                                                <TableCell>{row.Ma_DonHang}</TableCell>
                                                                <TableCell>
                                                                    <Typography fontWeight={600}>
                                                                        {row.Ma_VatTu}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell>{row.QuyCach}</TableCell>
                                                                <TableCell>{row.Ten_ChungLoaiVatTu}</TableCell>
                                                                <TableCell>{row.Ten_NhaCungCap}</TableCell>
                                                            </>
                                                        )}

                                                        <TableCell><b>{row.SoLuong}</b></TableCell>
                                                        <TableCell>
                                                            {new Date(row.Ngay_Giao || row.NgayLap).toLocaleDateString('vi-VN')}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setOpenModal(false)} color="inherit">
                            Đóng
                        </Button>
                        <Button onClick={() => setOpenModal(false)} variant="contained" disabled={selectedLichList.length === 0}>
                            Xác nhận chọn ({selectedLichList.length})
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Fade >
    );
}