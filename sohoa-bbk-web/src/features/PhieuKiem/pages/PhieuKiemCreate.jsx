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
    getLoaiKiemLookup,
    getKCSLookup,
    getChungTuNhapChuaKiem,
    getLichDongCont,
    getSourceChecked,
} from "../../../api/phieuKiem.api";
import {
    getSanPhamList
} from "../../../api/lookup.api";
export default function PhieuKiemCreate() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [form, setForm] = useState({
        loaiKiemId: "",
        nguoiKiemId: ""
    });

    const [loaiKiemList, setLoaiKiemList] = useState([]);
    const [kcsList, setKcsList] = useState([]);

    const [selectedLoai, setSelectedLoai] = useState(null);
    const [selectedLichList, setSelectedLichList] = useState([]);
    const [lichList, setLichList] = useState([]);

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
            // Không cần tải trước toàn bộ SanPhamList nữa để tối ưu hiệu năng
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

    const fetchLichList = async (loai) => {
        setOpenModal(true);
        setLoadingModal(true);

        try {
            if (loai?.MaLoai === "KIEM_DONG_CONT") {
                const week = 12; // Có thể đưa vào state sau
                const year = 2026;

                const [lichRes, checkedRes] = await Promise.all([
                    getLichDongCont({ week, year }),
                    getSourceChecked({
                        week,
                        year,
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
                        row.Ten_NhaCungCap?.toLowerCase().includes(lower)
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

    const getRowId = (row) => selectedLoai?.MaLoai === "KIEM_DONG_CONT" ? row.ClosingScheduleDetailGuid : row.ID_KeHoach_ChiTiet;

    const handleChange = async (e) => {
        const { name, value } = e.target;

        if (name === "loaiKiemId") {
            const loai = loaiKiemList.find(x => x.Id === value);
            setSelectedLoai(loai);

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

            // 1. Dùng Map để cache kết quả dò mã, tránh gọi trùng API nếu chọn nhiều Cont có cùng ItemId
            const spCache = new Map();

            // 2. Map lấy SanPhamId chính xác qua API
            const resolvedRows = await Promise.all(selectedLichList.map(async (row) => {
                const isDongCont = selectedLoai?.MaLoai === "KIEM_DONG_CONT";
                let mappedSpId = row.SanPhamId; // Nếu là ĐẦU VÀO thì đã có sẵn ID int

                if (isDongCont) {
                    const itemCode = row.ItemId;
                    if (spCache.has(itemCode)) {
                        mappedSpId = spCache.get(itemCode);
                    } else {
                        // Gọi API dò mã
                        const res = await getSanPhamList(0, 50, itemCode);
                        const resultData = res?.data?.data || [];

                        // Cực kỳ quan trọng: Lọc lại CHÍNH XÁC bằng == vì API trả về LIKE
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
                    soLuong: row.isDongCont ? row.Quantity : row.SoLuong,
                    doiTuong: row.isDongCont ? row.WarehouseId : (row.Ma_DonHang || row.ID_NhaCungCap)
                };

                if (row.isDongCont) {
                    payload.sourceId_LCD = row.ClosingScheduleDetailGuid;
                    payload.Ngay_Giao = formatDateToISO(row.RequiredDateString);
                } else {
                    payload.sourceId = getRowId(row);
                }
                console.log(payload.Ngay_Giao)

                return createPhieuKiem(payload);
            });
            await Promise.all(promises);

            showToast(`Đã tạo thành công ${selectedLichList.length} phiếu kiểm!`, "success");
            navigate("/phieu-kiem");
        } catch (err) {
            // Hiển thị lỗi throw ở khâu Map SanPhamId hoặc lỗi từ API backend
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
                                                        {selectedLoai?.MaLoai === "DAU_VAO" ? row.Ma_VatTu : row.ItemId}
                                                    </TableCell>
                                                    <TableCell>
                                                        {selectedLoai?.MaLoai === "DAU_VAO" ? row.QuyCach : row.ItemName}
                                                    </TableCell>
                                                    <TableCell>
                                                        <b>{selectedLoai?.MaLoai === "KIEM_DONG_CONT" ? row.Quantity : row.SoLuong}</b>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            size="small"
                                                            label={selectedLoai?.MaLoai === "DAU_VAO" ? row.Ma_DonHang : row.Time || row.Type}
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
                                                                <TableCell>{row.Ten_NhaCungCap}</TableCell>
                                                            </>
                                                        )}

                                                        <TableCell><b>{selectedLoai?.MaLoai === "KIEM_DONG_CONT" ? row.Quantity : row.SoLuong}</b></TableCell>
                                                        <TableCell>
                                                            {selectedLoai?.MaLoai === "KIEM_DONG_CONT"
                                                                ? row.RequiredDateString
                                                                : new Date(row.Ngay_Giao || row.NgayLap).toLocaleDateString('vi-VN')}
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