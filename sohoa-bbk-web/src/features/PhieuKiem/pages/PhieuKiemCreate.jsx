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
    createPhieuKiemSXBT,
    getLoaiKiemLookup,
    getKCSLookup,
    getChungTuNhapChuaKiem,
    getKeHoachSanXuatChuaKiem,
    getLichDongCont,
    getSourceChecked,
    getPhieuNhapBTPChuaKiem,
} from "../../../api/phieuKiem.api";
import {
    getSanPhamList
} from "../../../api/lookup.api";

export default function PhieuKiemCreate() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [form, setForm] = useState({
        loaiKiemId: "",
        nguoiKiemId: "",
        mucDoKiemTra: ""
    });

    const [loaiKiemList, setLoaiKiemList] = useState([]);
    const [kcsList, setKcsList] = useState([]);

    const [selectedLoai, setSelectedLoai] = useState(null);
    const [selectedLichList, setSelectedLichList] = useState([]);
    const [lichList, setLichList] = useState([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [displaySearchTerm, setDisplaySearchTerm] = useState("");

    const [chungLoaiFilter, setChungLoaiFilter] = useState("");
    const [displayChungLoaiFilter, setDisplayChungLoaiFilter] = useState("");

    const [showChungLoaiFilter, setShowChungLoaiFilter] = useState(false);

    const [openModal, setOpenModal] = useState(false);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(displaySearchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [displaySearchTerm]);

    // Debounce chung loai filter
    useEffect(() => {
        const timer = setTimeout(() => {
            setChungLoaiFilter(displayChungLoaiFilter);
        }, 500);
        return () => clearTimeout(timer);
    }, [displayChungLoaiFilter]);

    const [loadingModal, setLoadingModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const getCurrentWeek = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    const [week, setWeek] = useState(getCurrentWeek());
    const [displayWeek, setDisplayWeek] = useState(getCurrentWeek());
    const [year] = useState(new Date().getFullYear());

    // Debounce week change
    useEffect(() => {
        if (displayWeek === week) return;

        const timer = setTimeout(() => {
            const val = parseInt(displayWeek) || 0;
            if (val > 0) {
                setWeek(val);
                fetchLichList(selectedLoai, val);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [displayWeek, selectedLoai]);

    useEffect(() => {
        loadLookup();
    }, []);

    const loadLookup = async () => {
        try {
            const [lk, kcs] = await Promise.all([
                getLoaiKiemLookup(),
                getKCSLookup()
            ]);
            setLoaiKiemList(lk.data);
            setKcsList(kcs.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchLichList = async (loai, w = week, y = year) => {
        setOpenModal(true);
        setLoadingModal(true);

        try {
            if (loai?.MaLoai === "KIEM_DONG_CONT") {
                const [lichRes, checkedRes] = await Promise.all([
                    getLichDongCont({ week: w, year: y }),
                    getSourceChecked({
                        week: w,
                        year: y,
                        loaiKiemId: loai.Id
                    })
                ]);

                const lichData = lichRes.data || [];
                const checkedSet = new Set(checkedRes.data || []);

                const filtered = lichData.filter(
                    item => !checkedSet.has(item.ClosingScheduleDetailGuid)
                );
                setLichList(filtered);
            }

            if (loai?.MaLoai === "DAU_VAO") {
                const res = await getChungTuNhapChuaKiem();
                setLichList(res.data || []);
            }
            if (loai?.MaLoai === "KIEM_TREN_CHUYEN") {
                const res = await getKeHoachSanXuatChuaKiem();
                setLichList(res.data || []);
            }
            if (loai?.Id === 4) {
                const res = await getPhieuNhapBTPChuaKiem();
                setLichList(res.data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingModal(false);
        }
    };

    const filteredLichList = useMemo(() => {
        let result = lichList;

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter((row) => {
                if (selectedLoai?.MaLoai === "KIEM_DONG_CONT") {
                    return (
                        row.Time?.toLowerCase().includes(lower) ||
                        row.Type?.toLowerCase().includes(lower) ||
                        row.ItemId?.toLowerCase().includes(lower) ||
                        row.ItemName?.toLowerCase().includes(lower) ||
                        row.WarehouseId?.toLowerCase().includes(lower) ||
                        row.InvoiceNo?.toLowerCase().includes(lower)
                    );
                }
                if (selectedLoai?.MaLoai === "DAU_VAO") {
                    return (
                        row.So_DonDatHang?.toLowerCase().includes(lower) ||
                        row.Ma_DonHang?.toLowerCase().includes(lower) ||
                        row.Ma_VatTu?.toLowerCase().includes(lower) ||
                        row.QuyCach?.toLowerCase().includes(lower) ||
                        row.NhaCungCap?.toLowerCase().includes(lower)
                    );
                }
                if (selectedLoai?.MaLoai === "KIEM_TREN_CHUYEN") {
                    return (
                        row.ID_KeHoachSanXuat?.toString().includes(lower) ||
                        row.MaSanPham?.toLowerCase().includes(lower) ||
                        row.TenSanPham?.toLowerCase().includes(lower) ||
                        row.Ten_DonVi?.toLowerCase().includes(lower) ||
                        row.Ten_BoPhan?.toLowerCase().includes(lower)
                    );
                }
                if (selectedLoai?.Id === 4) {
                    return (
                        row.So_PhieuNhapBTP?.toLowerCase().includes(lower) ||
                        row.Ten_DonVi?.toLowerCase().includes(lower) ||
                        row.Ten_BoPhan?.toLowerCase().includes(lower) ||
                        row.Ma_DonHang?.toLowerCase().includes(lower)
                    );
                }
                return false;
            });
        }

        if (selectedLoai?.MaLoai === "DAU_VAO" && chungLoaiFilter) {
            const lowerChungLoai = chungLoaiFilter.toLowerCase();
            result = result.filter(row =>
                row.Ten_ChungLoaiVatTu?.toLowerCase().includes(lowerChungLoai)
            );
        }

        return result;
    }, [lichList, searchTerm, chungLoaiFilter, selectedLoai]);

    const getRowId = (row) => {
        if (selectedLoai?.MaLoai === "KIEM_DONG_CONT") return row.ClosingScheduleDetailGuid;
        if (selectedLoai?.MaLoai === "DAU_VAO") return row.ID_ChungTuNhap_ChiTiet;
        if (selectedLoai?.MaLoai === "KIEM_TREN_CHUYEN") return row.ID_KeHoachSanXuat;
        if (selectedLoai?.Id === 4) return row.SourceId;
        return row.Id;
    };

    const handleChange = async (e) => {
        const { name, value } = e.target;

        if (name === "loaiKiemId") {
            const loai = loaiKiemList.find(x => x.Id === value);
            setSelectedLoai(loai);

            setSelectedLichList([]);
            setSearchTerm("");
            setDisplaySearchTerm("");
            setChungLoaiFilter("");
            setDisplayChungLoaiFilter("");
            setShowChungLoaiFilter(false);
            setForm(prev => ({ ...prev, loaiKiemId: value }));

            fetchLichList(loai);
            return;
        }

        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleToggleRow = (row) => {
        const rowId = getRowId(row);
        setSelectedLichList(prev => {
            const isSelected = prev.some(item => getRowId(item) === rowId);
            return isSelected ? prev.filter(item => getRowId(item) !== rowId) : [...prev, row];
        });
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedLichList(filteredLichList);
        } else {
            setSelectedLichList([]);
        }
    };

    const handleRemoveSelected = (rowId) => {
        setSelectedLichList(prev => prev.filter(item => getRowId(item) !== rowId));
    };

    const formatDateToISO = (dateStr) => {
        const [day, month, year] = dateStr.split("/");
        return `${year}-${month}-${day}`;
    };

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

            // 1. Dùng Map để cache kết quả dò mã
            const spCache = new Map();

            // 2. Map lấy SanPhamId chính xác qua API
            const resolvedRows = await Promise.all(selectedLichList.map(async (row) => {
                const isDongCont = selectedLoai?.MaLoai === "KIEM_DONG_CONT";
                let mappedSpId = row.SanPhamId;

                if (isDongCont) {
                    const itemCode = row.ItemId;
                    if (spCache.has(itemCode)) {
                        mappedSpId = spCache.get(itemCode);
                    } else {
                        const res = await getSanPhamList(0, 50, itemCode);
                        const resultData = res?.data?.data || [];
                        const exactMatch = resultData.find(sp =>
                            sp.ItemCode === itemCode ||
                            sp.Ma_VatTu === itemCode ||
                            sp.MaSanPham === itemCode
                        );

                        if (exactMatch) {
                            mappedSpId = exactMatch.Id;
                            spCache.set(itemCode, exactMatch.Id);
                        } else {
                            spCache.set(itemCode, null);
                        }
                    }

                    if (!mappedSpId) {
                        throw new Error(`Mã vật tư/sản phẩm [${itemCode}] chưa tồn tại trong danh mục hệ thống.`);
                    }
                }

                return { ...row, mappedSpId, isDongCont };
            }));

            // 3. Tạo Payload và Submit
            const promises = resolvedRows.map(row => {
                const payload = {
                    loaiKiemId: form.loaiKiemId,
                    nguoiKiemId: form.nguoiKiemId,
                    lot: "",
                    sanPhamId: row.mappedSpId,
                    soLuong: row.isDongCont ? row.Quantity : (selectedLoai?.MaLoai === "KIEM_TREN_CHUYEN" ? row.SoLuongKeHoach : row.SoLuong),
                    doiTuong: row.isDongCont ? `${row.InvoiceNo} - ${row.WarehouseId}` : (selectedLoai?.MaLoai === "KIEM_TREN_CHUYEN" ? row.Ten_DonVi : (row.Ma_DonHang || row.ID_NhaCungCap)),
                    mucDoKiemTra: form.mucDoKiemTra || null
                };

                if (row.isDongCont) {
                    payload.sourceId_LCD = row.ClosingScheduleDetailGuid;
                    payload.Ngay_Giao = formatDateToISO(row.RequiredDateString);
                } else if (selectedLoai?.MaLoai === "KIEM_TREN_CHUYEN") {
                    payload.sourceId = row.ID_KeHoachSanXuat;
                    payload.sanPhamId = row.SanPhamId;
                    payload.soLuong = row.NangSuat_DuKien;
                    payload.doiTuong = row.Ten_DonVi;
                } else if (selectedLoai?.Id === 4) {
                    payload.sourceId = row.SourceId;
                    payload.soLuong = row.SoLuong;
                    payload.doiTuong = `${row.Ten_DonVi || ''} ${row.Ten_BoPhan ? `- ${row.Ten_BoPhan}` : ''}`;
                    // we will need a dummy sanPhamId or allow null for this type, assuming handled in backend later
                    payload.sanPhamId = 0; 
                } else {
                    payload.sourceId = getRowId(row);
                }

                if (selectedLoai?.Id === 4) {
                    return createPhieuKiemSXBT(payload);
                }
                return createPhieuKiem(payload);
            });
            await Promise.all(promises);

            showToast(`Đã tạo thành công ${selectedLichList.length} phiếu kiểm!`, "success");
            navigate("/phieu-kiem");
        } catch (err) {
            showToast(err.message || err?.response?.data?.message || "Có lỗi xảy ra khi tạo hàng loạt", "error");
        } finally {
            setLoading(false);
        }
    };

    const isAllSelected = filteredLichList.length > 0 && selectedLichList.length === filteredLichList.length;

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
                        <Grid size={{ xs: 12, md: 4 }}>
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

                        <Grid size={{ xs: 12, md: 4 }}>
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

                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                select
                                fullWidth
                                label="Mức độ kiểm tra"
                                name="mucDoKiemTra"
                                value={form.mucDoKiemTra}
                                onChange={handleChange}
                            >
                                <MenuItem value=""><em>-- Không chọn --</em></MenuItem>
                                <MenuItem value="KT lần đầu">KT lần đầu</MenuItem>
                                <MenuItem value="KT thường xuyên">KT thường xuyên</MenuItem>
                                <MenuItem value="KT lại">KT lại</MenuItem>
                            </TextField>
                        </Grid>

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
                                                        {selectedLoai?.MaLoai === "DAU_VAO" ? row.Ma_VatTu :
                                                            selectedLoai?.MaLoai === "KIEM_TREN_CHUYEN" ? row.MaSanPham :
                                                                selectedLoai?.Id === 4 ? row.So_PhieuNhapBTP :
                                                                    row.ItemId}
                                                    </TableCell>
                                                    <TableCell>
                                                        {selectedLoai?.MaLoai === "DAU_VAO" ? row.QuyCach :
                                                            selectedLoai?.MaLoai === "KIEM_TREN_CHUYEN" ? row.TenSanPham :
                                                                selectedLoai?.Id === 4 ? `${row.Ten_DonVi || ''} ${row.Ten_BoPhan ? `- ${row.Ten_BoPhan}` : ''}` :
                                                                    row.ItemName}
                                                    </TableCell>
                                                    <TableCell>
                                                        <b>{selectedLoai?.MaLoai === "KIEM_DONG_CONT" ? row.Quantity :
                                                            selectedLoai?.MaLoai === "KIEM_TREN_CHUYEN" ? row.NangSuat_DuKien :
                                                                row.SoLuong}</b>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            size="small"
                                                            label={
                                                                selectedLoai?.MaLoai === "DAU_VAO" ? row.Ma_DonHang :
                                                                    selectedLoai?.MaLoai === "KIEM_TREN_CHUYEN" ? row.Ten_DonVi :
                                                                        selectedLoai?.Id === 4 ? row.Ma_DonHang :
                                                                            row.Time || row.Type
                                                            }
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

                <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="lg" fullWidth scroll="paper">
                    <DialogTitle>Chọn kế hoạch kiểm tra</DialogTitle>
                    <DialogContent dividers sx={{ p: 0 }}>
                        {loadingModal ? (
                            <Box sx={{ textAlign: "center", p: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <Box sx={{ p: 2 }}>
                                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                                    <TextField
                                        fullWidth
                                        placeholder="Tìm kiếm theo mã, tên, số cont, invoice..."
                                        variant="outlined"
                                        value={displaySearchTerm}
                                        onChange={(e) => setDisplaySearchTerm(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon color="action" />
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                    {selectedLoai?.MaLoai === "KIEM_DONG_CONT" && (
                                        <TextField
                                            label="Tuần"
                                            type="number"
                                            sx={{ width: 100 }}
                                            value={displayWeek}
                                            onChange={(e) => setDisplayWeek(e.target.value)}
                                        />
                                    )}
                                </Stack>

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
                                                    <TableCell>Cont / Time</TableCell>
                                                    <TableCell>Item Code</TableCell>
                                                    <TableCell>Tên sản phẩm</TableCell>
                                                    <TableCell>Khách hàng / Kho</TableCell>
                                                    <TableCell>ECIS/ Invoice</TableCell>
                                                </>
                                            )}
                                            {selectedLoai?.MaLoai === "DAU_VAO" && (
                                                <>
                                                    <TableCell>Đơn hàng</TableCell>
                                                    <TableCell>Mã vật tư</TableCell>
                                                    <TableCell>Quy cách</TableCell>
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
                                                                value={displayChungLoaiFilter}
                                                                onChange={(e) => setDisplayChungLoaiFilter(e.target.value)}
                                                                variant="standard"
                                                                fullWidth
                                                                sx={{ mt: 1 }}
                                                            />
                                                        )}
                                                    </TableCell>
                                                    <TableCell>Nhà cung cấp</TableCell>
                                                </>
                                            )}
                                            {selectedLoai?.MaLoai === "KIEM_TREN_CHUYEN" && (
                                                <>
                                                    <TableCell>Phân xưởng</TableCell>
                                                    <TableCell>Mã SP</TableCell>
                                                    <TableCell>Tên sản phẩm</TableCell>
                                                    <TableCell>Kế hoạch</TableCell>
                                                    <TableCell>NS Dự kiến</TableCell>
                                                    <TableCell>Đã SX</TableCell>
                                                </>
                                            )}
                                            {selectedLoai?.Id === 4 && (
                                                <>
                                                    <TableCell sx={{ minWidth: 160 }}>Số phiếu nhập</TableCell>
                                                    <TableCell sx={{ minWidth: 160 }}>Mã đơn hàng</TableCell>
                                                    <TableCell sx={{ minWidth: 200 }}>Đơn vị</TableCell>
                                                    <TableCell sx={{ minWidth: 200 }}>Bộ phận</TableCell>
                                                    <TableCell sx={{ minWidth: 150 }}>Kho nhập</TableCell>
                                                </>
                                            )}
                                            {selectedLoai?.MaLoai !== "KIEM_TREN_CHUYEN" && (
                                                <TableCell sx={{ minWidth: 80 }}>SL</TableCell>
                                            )}
                                            <TableCell sx={{ minWidth: 120 }}>Ngày</TableCell>
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
                                                                <TableCell><b>{row.Time || row.Type}</b></TableCell>
                                                                <TableCell>{row.ItemId}</TableCell>
                                                                <TableCell>{row.ItemName}</TableCell>
                                                                <TableCell>
                                                                    <Chip label={row.WarehouseId} size="small" />
                                                                </TableCell>
                                                                <TableCell>{row.InvoiceNo}</TableCell>
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
                                                                <TableCell>{row.NhaCungCap}</TableCell>
                                                            </>
                                                        )}
                                                        {selectedLoai?.MaLoai === "KIEM_TREN_CHUYEN" && (
                                                            <>
                                                                <TableCell>{row.Ten_DonVi}</TableCell>
                                                                <TableCell>{row.MaSanPham}</TableCell>
                                                                <TableCell>{row.TenSanPham}</TableCell>
                                                                <TableCell>{row.SoLuongKeHoach}</TableCell>
                                                                <TableCell><b>{row.NangSuat_DuKien}</b></TableCell>
                                                                <TableCell>{row.DaSanXuat}</TableCell>
                                                            </>
                                                        )}
                                                        {selectedLoai?.Id === 4 && (
                                                            <>
                                                                <TableCell><b>{row.So_PhieuNhapBTP}</b></TableCell>
                                                                <TableCell>{row.Ma_DonHang}</TableCell>
                                                                <TableCell>{row.Ten_DonVi}</TableCell>
                                                                <TableCell>{row.Ten_BoPhan}</TableCell>
                                                                <TableCell>{row.Ten_KhoNhap}</TableCell>
                                                            </>
                                                        )}
                                                        {selectedLoai?.MaLoai !== "KIEM_TREN_CHUYEN" && (
                                                            <TableCell><b>{selectedLoai?.MaLoai === "KIEM_DONG_CONT" ? row.Quantity : row.SoLuong}</b></TableCell>
                                                        )}
                                                        <TableCell>
                                                            {selectedLoai?.MaLoai === "KIEM_DONG_CONT"
                                                                ? row.RequiredDateString
                                                                : selectedLoai?.MaLoai === "KIEM_TREN_CHUYEN"
                                                                    ? (row.Ngay ? `${new Date(row.Ngay).toLocaleDateString('vi-VN')} ` : '')
                                                                    : selectedLoai?.Id === 4
                                                                        ? new Date(row.Ngay_NhapBTP).toLocaleDateString('vi-VN')
                                                                        : new Date(row.Ngay_Giao || row.Ngay_Invoice).toLocaleDateString('vi-VN')}
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
        </Fade>
    );
}