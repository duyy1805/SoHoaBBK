import { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, IconButton, MenuItem, Paper, Popover, Stack,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
    Tooltip, Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { createCongDoanPhieu, getCongDoanPhieuList } from "../../../api/phieuKiem.api";
import { getBoPhan } from "../../../api/bienBan.api";
import { getCurrentUser } from "../../../utils/auth";

const today = () => {
    const date = new Date();
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const formatDate = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("vi-VN") : "---";
const statusMeta = {
    TAO_MOI: ["Mới", "default"], CHUA_KIEM: ["Chưa kiểm", "default"],
    DANG_KIEM: ["Đang kiểm", "warning"], CHO_TBP_DUYET: ["Chờ TBP duyệt", "secondary"],
    HOAN_TAT: ["Hoàn tất", "success"]
};
const LIST_DATA_CACHE_KEY = "phieu-kiem-cong-doan:list-data";
const readCachedRows = () => {
    try {
        const value = sessionStorage.getItem(LIST_DATA_CACHE_KEY);
        const parsed = value ? JSON.parse(value) : null;
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        sessionStorage.removeItem(LIST_DATA_CACHE_KEY);
        return null;
    }
};

export default function CongDoanList() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [cachedRows] = useState(readCachedRows);
    const [rows, setRows] = useState(() => cachedRows || []);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(() => !cachedRows);
    const [creating, setCreating] = useState(false);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(() => searchParams.get("q") || "");
    const [dateFrom, setDateFrom] = useState(() => searchParams.get("from") || "");
    const [dateTo, setDateTo] = useState(() => searchParams.get("to") || "");
    const [workshopFilter, setWorkshopFilter] = useState(() => searchParams.get("workshop") || "");
    const [teamFilter, setTeamFilter] = useState(() => searchParams.get("team") || "");
    const [creatorFilter, setCreatorFilter] = useState(() => searchParams.get("creator") || "");
    const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") || "");
    const [filterPopover, setFilterPopover] = useState({ field: "", anchorEl: null });
    const [form, setForm] = useState({ ngayKiem: today(), toMay: "", phanXuongId: "" });
    const tableContainerRef = useRef(null);
    const hasRestoredScrollRef = useRef(false);
    const user = getCurrentUser();
    const canCreate = user?.permissions?.includes("THUC_HIEN_KIEM");
    const listUrl = `${location.pathname}${location.search}`;
    const scrollStorageKey = `phieu-kiem-cong-doan:list-scroll:${listUrl}`;

    useEffect(() => {
        setSearch(searchParams.get("q") || "");
        setDateFrom(searchParams.get("from") || "");
        setDateTo(searchParams.get("to") || "");
        setWorkshopFilter(searchParams.get("workshop") || "");
        setTeamFilter(searchParams.get("team") || "");
        setCreatorFilter(searchParams.get("creator") || "");
        setStatusFilter(searchParams.get("status") || "");
    }, [searchParams]);

    const load = async ({ background = false } = {}) => {
        try {
            if (!background) setLoading(true);
            const response = await getCongDoanPhieuList();
            const nextRows = response.data || [];
            setRows(nextRows);
            sessionStorage.setItem(LIST_DATA_CACHE_KEY, JSON.stringify(nextRows));
        } catch (error) {
            window.alert(error.response?.data?.message || "Không tải được danh sách phiếu công đoạn.");
        } finally {
            if (!background) setLoading(false);
        }
    };
    useEffect(() => {
        load({ background: Boolean(cachedRows) });
        getBoPhan().then((response) => setDepartments(
            (response.data || []).filter((item) =>
                String(item.TenBoPhan || item.Ten_BoPhan || "").toLocaleLowerCase("vi").includes("phân xưởng")
            )
        )).catch(() => setDepartments([]));
    }, [cachedRows]);

    useEffect(() => {
        if (loading || hasRestoredScrollRef.current) return;
        let savedPosition = null;
        try {
            const savedValue = sessionStorage.getItem(scrollStorageKey);
            savedPosition = savedValue ? JSON.parse(savedValue) : null;
        } catch {
            sessionStorage.removeItem(scrollStorageKey);
        }
        const frame = window.requestAnimationFrame(() => {
            if (tableContainerRef.current && Number.isFinite(savedPosition?.tableTop)) {
                tableContainerRef.current.scrollTop = savedPosition.tableTop;
            }
            if (Number.isFinite(savedPosition?.windowTop)) {
                window.scrollTo({ top: savedPosition.windowTop });
            }
            hasRestoredScrollRef.current = true;
        });
        return () => window.cancelAnimationFrame(frame);
    }, [loading, scrollStorageKey]);

    const updateQueryFilter = (setter, key, value) => {
        setter(value);
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            if (value) next.set(key, value);
            else next.delete(key);
            return next;
        }, { replace: true });
    };

    const resetFilters = () => {
        setSearch("");
        setDateFrom("");
        setDateTo("");
        setWorkshopFilter("");
        setTeamFilter("");
        setCreatorFilter("");
        setStatusFilter("");
        setSearchParams({}, { replace: true });
    };

    const rememberScrollPosition = () => {
        sessionStorage.setItem(scrollStorageKey, JSON.stringify({
            tableTop: tableContainerRef.current?.scrollTop || 0,
            windowTop: window.scrollY || 0
        }));
    };

    const openDetail = (phieuKiemId) => {
        rememberScrollPosition();
        navigate(`/phieu-kiem/cong-doan/${phieuKiemId}`, { state: { returnTo: listUrl } });
    };

    const workshopOptions = useMemo(() => [...new Set(rows.map((item) => item.PhanXuong).filter(Boolean))]
        .sort((left, right) => left.localeCompare(right, "vi")), [rows]);
    const filteredRows = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return rows.filter((item) => {
            const inspectionDate = String(item.NgayKiem || "").slice(0, 10);
            if (keyword && !`${item.SoPhieu || ""} ${item.PhanXuong || ""} ${item.ToMay || ""} ${item.TenNguoiTao || ""}`
                .toLowerCase().includes(keyword)) return false;
            if (dateFrom && (!inspectionDate || inspectionDate < dateFrom)) return false;
            if (dateTo && (!inspectionDate || inspectionDate > dateTo)) return false;
            if (workshopFilter && item.PhanXuong !== workshopFilter) return false;
            if (teamFilter && !String(item.ToMay || "").toLocaleLowerCase("vi")
                .includes(teamFilter.trim().toLocaleLowerCase("vi"))) return false;
            if (creatorFilter && !String(item.TenNguoiTao || "").toLocaleLowerCase("vi")
                .includes(creatorFilter.trim().toLocaleLowerCase("vi"))) return false;
            if (statusFilter && item.TrangThai !== statusFilter) return false;
            return true;
        });
    }, [rows, search, dateFrom, dateTo, workshopFilter, teamFilter, creatorFilter, statusFilter]);

    const hasFilters = Boolean(search || dateFrom || dateTo || workshopFilter || teamFilter || creatorFilter || statusFilter);

    const renderColumnFilter = ({ field, label, value, setter, queryKey, placeholder }) => {
        const isOpen = filterPopover.field === field;
        return (
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="space-between">
                <span>{label}</span>
                <Tooltip title={`Lọc ${label.toLocaleLowerCase("vi")}`}>
                    <IconButton
                        size="small"
                        color={value ? "primary" : "default"}
                        onClick={(event) => {
                            event.stopPropagation();
                            setFilterPopover({ field, anchorEl: event.currentTarget });
                        }}
                        sx={{ width: 28, height: 28, bgcolor: value ? "action.selected" : "transparent" }}
                    >
                        <FilterListIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Popover
                    open={isOpen}
                    anchorEl={filterPopover.anchorEl}
                    onClose={() => setFilterPopover({ field: "", anchorEl: null })}
                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                    transformOrigin={{ vertical: "top", horizontal: "left" }}
                >
                    <Box sx={{ p: 1.5, width: 260 }}>
                        <TextField
                            fullWidth
                            size="small"
                            label={label}
                            value={value}
                            placeholder={placeholder}
                            onChange={(event) => updateQueryFilter(setter, queryKey, event.target.value)}
                            autoFocus
                        />
                        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.5 }}>
                            <Button size="small" onClick={() => updateQueryFilter(setter, queryKey, "")}>Bỏ lọc</Button>
                            <Button size="small" variant="contained" onClick={() => setFilterPopover({ field: "", anchorEl: null })}>Đóng</Button>
                        </Stack>
                    </Box>
                </Popover>
            </Stack>
        );
    };

    const create = async () => {
        if (!form.ngayKiem || !Number(form.phanXuongId)) {
            window.alert("Ngày kiểm và phân xưởng sản xuất là bắt buộc.");
            return;
        }
        try {
            setCreating(true);
            const response = await createCongDoanPhieu(form);
            setOpen(false);
            openDetail(response.data.Id);
        } catch (error) {
            window.alert(error.response?.data?.message || "Không tạo được phiếu công đoạn.");
        } finally {
            setCreating(false);
        }
    };

    return (
        <Box>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} spacing={1.5} sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>Theo dõi, kiểm tra nghiệm thu công đoạn</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>Phiếu dùng chung theo kế hoạch sản xuất trong ngày</Typography>
                </Box>
                {canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Tạo phiếu</Button>}
            </Stack>
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
                    <TextField
                        size="small"
                        value={search}
                        onChange={(event) => updateQueryFilter(setSearch, "q", event.target.value)}
                        placeholder="Tìm số phiếu, phân xưởng, tổ/máy, KCS"
                        sx={{ flex: { sm: "1 1 320px" } }}
                    />
                    <TextField size="small" type="date" label="Từ ngày" value={dateFrom}
                        onChange={(event) => updateQueryFilter(setDateFrom, "from", event.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 145 }} />
                    <TextField size="small" type="date" label="Đến ngày" value={dateTo}
                        onChange={(event) => updateQueryFilter(setDateTo, "to", event.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 145 }} />
                    <TextField select size="small" label="Phân xưởng" value={workshopFilter}
                        onChange={(event) => {
                            updateQueryFilter(setWorkshopFilter, "workshop", event.target.value);
                            if (teamFilter) updateQueryFilter(setTeamFilter, "team", "");
                        }} sx={{ minWidth: 180 }}>
                        <MenuItem value="">Tất cả phân xưởng</MenuItem>
                        {workshopOptions.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Trạng thái" value={statusFilter}
                        onChange={(event) => updateQueryFilter(setStatusFilter, "status", event.target.value)} sx={{ minWidth: 160 }}>
                        <MenuItem value="">Tất cả trạng thái</MenuItem>
                        {Object.entries(statusMeta).map(([value, meta]) => <MenuItem key={value} value={value}>{meta[0]}</MenuItem>)}
                    </TextField>
                    <Button startIcon={<RestartAltIcon />} disabled={!hasFilters} onClick={resetFilters}>Xóa lọc</Button>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    Hiển thị {filteredRows.length}/{rows.length} phiếu
                </Typography>
            </Paper>

            <Paper variant="outlined">
                {loading ? (
                    <Box sx={{ py: 8, textAlign: "center" }}><CircularProgress /></Box>
                ) : (
                    <>
                    <Stack spacing={1} sx={{ display: { xs: "flex", md: "none" }, p: 1 }}>
                        {filteredRows.map((item) => {
                            const meta = statusMeta[item.TrangThai] || [item.TrangThai, "default"];
                            return (
                                <Paper key={item.Id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                                    <Stack spacing={1}>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Box>
                                                <Typography color="primary" fontWeight={800}>{item.SoPhieu}</Typography>
                                                <Typography variant="body2">{formatDate(item.NgayKiem)}</Typography>
                                            </Box>
                                            <Chip size="small" label={meta[0]} color={meta[1]} />
                                        </Stack>
                                        <Typography fontWeight={700}>{[item.PhanXuong, item.ToMay].filter(Boolean).join(" · ") || "---"}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {item.SoKeHoach || 0} kế hoạch · HL {item.TongSoLuongHieuLuc || 0} · {item.TongSoLuongLoi || 0} lỗi
                                        </Typography>
                                        <Button fullWidth variant="outlined" startIcon={<VisibilityIcon />} onClick={() => openDetail(item.Id)}>Mở phiếu</Button>
                                    </Stack>
                                </Paper>
                            );
                        })}
                        {!filteredRows.length && <Typography textAlign="center" color="text.secondary" sx={{ py: 5 }}>Chưa có phiếu phù hợp.</Typography>}
                    </Stack>
                    <TableContainer ref={tableContainerRef} sx={{ display: { xs: "none", md: "block" } }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Số phiếu</TableCell><TableCell>Ngày kiểm</TableCell>
                                    <TableCell>
                                        {renderColumnFilter({
                                            field: "team", label: "Phân xưởng / tổ máy", value: teamFilter,
                                            setter: setTeamFilter, queryKey: "team", placeholder: "Nhập tổ / máy"
                                        })}
                                    </TableCell>
                                    <TableCell>
                                        {renderColumnFilter({
                                            field: "creator", label: "Người tạo", value: creatorFilter,
                                            setter: setCreatorFilter, queryKey: "creator", placeholder: "Nhập tên người tạo"
                                        })}
                                    </TableCell>
                                    <TableCell align="right">Kế hoạch</TableCell><TableCell align="right">KH / TT / Hiệu lực</TableCell><TableCell align="right">Số lỗi</TableCell>
                                    <TableCell>Trạng thái</TableCell><TableCell width={64} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredRows.map((item) => {
                                    const meta = statusMeta[item.TrangThai] || [item.TrangThai, "default"];
                                    return (
                                        <TableRow key={item.Id} hover>
                                            <TableCell sx={{ fontWeight: 800, color: "primary.main" }}>{item.SoPhieu}</TableCell>
                                            <TableCell>{formatDate(item.NgayKiem)}</TableCell>
                                            <TableCell>{[item.PhanXuong, item.ToMay].filter(Boolean).join(" · ") || "---"}</TableCell>
                                            <TableCell>{item.TenNguoiTao || "---"}</TableCell>
                                            <TableCell align="right">{item.SoKeHoach || 0}</TableCell>
                                            <TableCell align="right">{item.TongSoLuongKeHoach || 0} / {item.SoKeHoachDaNhapThucTe ? item.TongSoLuongThucTe : "Chưa nhập"} / {item.TongSoLuongHieuLuc || 0}</TableCell>
                                            <TableCell align="right">{item.TongSoLuongLoi || 0}</TableCell>
                                            <TableCell><Chip size="small" label={meta[0]} color={meta[1]} /></TableCell>
                                            <TableCell><Button title="Xem chi tiết" onClick={() => openDetail(item.Id)}><VisibilityIcon /></Button></TableCell>
                                        </TableRow>
                                    );
                                })}
                                {!filteredRows.length && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 7, color: "text.secondary" }}>Chưa có phiếu phù hợp.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    </>
                )}
            </Paper>

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Tạo phiếu kiểm công đoạn</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField type="date" label="Ngày kiểm" value={form.ngayKiem} onChange={(event) => setForm({ ...form, ngayKiem: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} required />
                        <TextField select label="Phân xưởng sản xuất" value={form.phanXuongId} onChange={(event) => setForm({ ...form, phanXuongId: event.target.value })} required>
                            {departments.map((item) => <MenuItem key={item.Id || item.ID_BoPhan} value={item.Id || item.ID_BoPhan}>{item.TenBoPhan || item.Ten_BoPhan || `Bộ phận ${item.Id}`}</MenuItem>)}
                        </TextField>
                        <TextField label="Tổ / máy" value={form.toMay} onChange={(event) => setForm({ ...form, toMay: event.target.value })} />
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpen(false)}>Hủy</Button><Button variant="contained" disabled={creating} onClick={create}>{creating ? "Đang tạo..." : "Tạo phiếu"}</Button></DialogActions>
            </Dialog>
        </Box>
    );
}
