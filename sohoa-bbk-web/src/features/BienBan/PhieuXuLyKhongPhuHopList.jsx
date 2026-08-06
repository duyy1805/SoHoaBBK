import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Typography,
    Card,
    CardContent,
    CircularProgress,
    Stack,
    Fade,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Chip,
    Paper,
    InputAdornment,
    Tabs,
    Tab,
    MenuItem,
    Collapse,
    TablePagination
} from "@mui/material";
import {
    Add as AddIcon,
    Search as SearchIcon,
    ArrowForward as ArrowForwardIcon,
    FilterList as FilterListIcon,
    RestartAlt as RestartAltIcon
} from "@mui/icons-material";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { createStandaloneBienBan, getStandaloneBienBanList } from "../../api/bienBan.api";
import { decodeToken } from "../../utils/auth";
import { getBienBanStatusMeta } from "./components/bienBanWorkflow";

const normalizeSearchText = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

const VALID_PAGE_SIZES = [5, 10, 25, 50];
const parsePageParam = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed - 1 : 0;
};

const renderTrangThaiChip = (trangThai) => {
    const status = getBienBanStatusMeta(trangThai);
    return <Chip label={status.label} color={status.color} size="small" sx={{ fontWeight: 500 }} />;
};

const ACTIONABLE_MANAGER_STATUSES = new Set([
    "BB_MOI",
    "CHO_PHAN_BO_XU_LY",
    "CHO_PHAN_BO_XY_LY",
    "CHO_TP_B8",
    "CHO_XAC_NHAN",
    "TRA_LAI_CHINH_SUA"
]);

const getWorkBucket = (item, currentUser, access) => {
    if (["HOAN_TAT", "HOAN_THANH", "DA_XAC_NHAN"].includes(item.TrangThai)) return "done";
    const hasServerDecision = item.CanCurrentUserAct !== null && item.CanCurrentUserAct !== undefined;
    const explicitMyTurn = hasServerDecision
        ? item.CanCurrentUserAct === true || item.CanCurrentUserAct === 1
        : Number(item.NguoiXuLyId) === Number(currentUser.userId) ||
            Number(item.BoPhanId) === Number(currentUser.boPhanId) ||
            Number(item.BoPhanDangChoId) === Number(currentUser.boPhanId);
    const globalManagerTurn = access.isGlobalManager && ACTIONABLE_MANAGER_STATUSES.has(item.TrangThai);
    const departmentLeadFallback = !hasServerDecision && access.isDepartmentLead &&
        Number(item.CreatorBoPhanId) === Number(currentUser.boPhanId) &&
        ACTIONABLE_MANAGER_STATUSES.has(item.TrangThai);
    return explicitMyTurn || globalManagerTurn || departmentLeadFallback ? "action" : "waiting";
};

export default function PhieuXuLyKhongPhuHopList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [searchText, setSearchText] = useState(() => searchParams.get("q") || "");
    const [workFilter, setWorkFilter] = useState(() => searchParams.get("work") || "all");
    const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") || "");
    const [departmentFilter, setDepartmentFilter] = useState(() => searchParams.get("creatorDepartment") || "all");
    const [dateFrom, setDateFrom] = useState(() => searchParams.get("from") || "");
    const [dateTo, setDateTo] = useState(() => searchParams.get("to") || "");
    const [advancedOpen, setAdvancedOpen] = useState(() => searchParams.get("advanced") === "1");
    const [page, setPage] = useState(() => parsePageParam(searchParams.get("page")));
    const [rowsPerPage, setRowsPerPage] = useState(() => {
        const value = Number(searchParams.get("pageSize"));
        return VALID_PAGE_SIZES.includes(value) ? value : 10;
    });
    const tableContainerRef = useRef(null);
    const restoredScrollKeyRef = useRef("");
    const initialWorkFilterResolvedRef = useRef(searchParams.has("work"));
    const currentUser = useMemo(() => decodeToken() || {}, []);
    const access = useMemo(() => {
        const permissions = currentUser.permissions || [];
        const roles = (currentUser.roles || []).map((role) => String(role || "").toUpperCase());
        return {
            isGlobalManager: roles.includes("ADMIN") || permissions.some((permission) =>
                ["QUAN_TRI_DM", "XAC_NHAN_NGUOI_XU_LY", "KET_LUAN"].includes(permission)
            ),
            isDepartmentLead: roles.includes("TP_BP") || permissions.includes("PHAN_CONG_NGUOI_XU_LY")
        };
    }, [currentUser]);

    const listUrl = `${location.pathname}${location.search}`;
    const scrollStorageKey = `phieu-xu-ly-kph:list-scroll:${listUrl}`;

    const updateQuery = useCallback((updates) => {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            Object.entries(updates).forEach(([key, value]) => {
                if (value === "" || value === null || value === undefined) next.delete(key);
                else next.set(key, String(value));
            });
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    useEffect(() => {
        setSearchText(searchParams.get("q") || "");
        setWorkFilter(searchParams.get("work") || "all");
        setStatusFilter(searchParams.get("status") || "");
        setDepartmentFilter(searchParams.get("creatorDepartment") || "all");
        setDateFrom(searchParams.get("from") || "");
        setDateTo(searchParams.get("to") || "");
        setAdvancedOpen(searchParams.get("advanced") === "1");
        setPage(parsePageParam(searchParams.get("page")));
        const pageSize = Number(searchParams.get("pageSize"));
        setRowsPerPage(VALID_PAGE_SIZES.includes(pageSize) ? pageSize : 10);
    }, [searchParams]);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getStandaloneBienBanList();
            const rows = res.data || [];
            setData(rows);
            if (!initialWorkFilterResolvedRef.current) {
                initialWorkFilterResolvedRef.current = true;
                if (rows.some((item) => getWorkBucket(item, currentUser, access) === "action")) {
                    setWorkFilter("action");
                    updateQuery({ work: "action", page: 1 });
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [currentUser, access, updateQuery]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const counts = useMemo(() => data.reduce((result, item) => {
        const bucket = getWorkBucket(item, currentUser, access);
        result[bucket] += 1;
        return result;
    }, { action: 0, waiting: 0, done: 0 }), [data, currentUser, access]);

    const departmentOptions = useMemo(() => {
        const options = new Map();
        data.forEach((item) => {
            const id = Number(item.CreatorBoPhanId);
            if (!Number.isInteger(id) || id <= 0) return;
            options.set(id, {
                id,
                label: [item.MaBoPhanTao, item.TenBoPhanTao].filter(Boolean).join(" - ") || `Bộ phận #${id}`
            });
        });
        return [...options.values()].sort((a, b) => a.label.localeCompare(b.label, "vi"));
    }, [data]);

    const statusOptions = useMemo(() => [...new Set(data.map((item) => item.TrangThai).filter(Boolean))]
        .map((value) => ({ value, label: getBienBanStatusMeta(value).label }))
        .sort((a, b) => a.label.localeCompare(b.label, "vi")), [data]);

    const filteredData = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        return data.filter((item) => {
            if (workFilter !== "all" && getWorkBucket(item, currentUser, access) !== workFilter) return false;
            if (statusFilter && item.TrangThai !== statusFilter) return false;
            if (departmentFilter === "mine" && Number(item.CreatorBoPhanId) !== Number(currentUser.boPhanId)) return false;
            if (!["all", "mine"].includes(departmentFilter) && Number(item.CreatorBoPhanId) !== Number(departmentFilter)) return false;

            const createdAt = item.CreatedAt ? new Date(item.CreatedAt) : null;
            if (dateFrom && (!createdAt || createdAt < new Date(`${dateFrom}T00:00:00`))) return false;
            if (dateTo && (!createdAt || createdAt > new Date(`${dateTo}T23:59:59.999`))) return false;

            if (!keyword) return true;
            const searchableText = normalizeSearchText([
                item.SoBienBan,
                item.MoTaChung,
                item.NguoiLap,
                item.MaBoPhanTao,
                item.TenBoPhanTao
            ].filter(Boolean).join(" "));
            return searchableText.includes(normalizeSearchText(keyword));
        });
    }, [data, searchText, workFilter, statusFilter, departmentFilter, dateFrom, dateTo, currentUser, access]);

    const paginatedData = useMemo(() => {
        const startIndex = page * rowsPerPage;
        return filteredData.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredData, page, rowsPerPage]);

    useEffect(() => {
        if (loading) return;
        const maxPage = Math.max(0, Math.ceil(filteredData.length / rowsPerPage) - 1);
        if (page > maxPage) {
            setPage(maxPage);
            updateQuery({ page: maxPage + 1 });
        }
    }, [filteredData.length, loading, page, rowsPerPage, updateQuery]);

    useEffect(() => {
        if (loading || restoredScrollKeyRef.current === scrollStorageKey) return;
        const savedValue = sessionStorage.getItem(scrollStorageKey);
        let savedPosition = null;
        try {
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
            restoredScrollKeyRef.current = scrollStorageKey;
        });
        return () => window.cancelAnimationFrame(frame);
    }, [loading, paginatedData.length, scrollStorageKey]);

    const rememberScrollPosition = () => {
        sessionStorage.setItem(scrollStorageKey, JSON.stringify({
            tableTop: tableContainerRef.current?.scrollTop || 0,
            windowTop: window.scrollY || 0
        }));
    };

    const openDetail = (bienBanId) => {
        rememberScrollPosition();
        navigate(`/phieu-xu-ly-khong-phu-hop/${bienBanId}`, { state: { returnTo: listUrl } });
    };

    const updateFilter = (setter, queryKey, value) => {
        setter(value);
        setPage(0);
        updateQuery({ [queryKey]: value, page: 1 });
    };

    const resetFilters = () => {
        setSearchText("");
        setStatusFilter("");
        setDepartmentFilter("all");
        setDateFrom("");
        setDateTo("");
        setWorkFilter("all");
        setPage(0);
        initialWorkFilterResolvedRef.current = true;
        updateQuery({
            q: "",
            status: "",
            creatorDepartment: "",
            from: "",
            to: "",
            work: "all",
            page: 1
        });
    };

    const handleCreate = async () => {
        try {
            setCreating(true);
            const res = await createStandaloneBienBan();
            const bienBanId = res.data?.bienBanId;
            if (bienBanId) {
                openDetail(bienBanId);
            }
        } catch (err) {
            console.error(err);
            window.alert(err?.response?.data?.message || "Không thể tạo phiếu xử lý không phù hợp");
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Fade in timeout={300}>
            <Box>
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", md: "center" }}
                    spacing={2}
                    sx={{ mb: 3 }}
                >
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        Phiếu xử lý không phù hợp
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <Button
                            variant={advancedOpen ? "contained" : "outlined"}
                            startIcon={<FilterListIcon />}
                            onClick={() => {
                                const nextOpen = !advancedOpen;
                                setAdvancedOpen(nextOpen);
                                updateQuery({ advanced: nextOpen ? 1 : "" });
                            }}
                        >
                            {advancedOpen ? "Thu gọn bộ lọc" : "Bộ lọc nâng cao"}
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleCreate}
                            disabled={creating}
                        >
                            {creating ? "Đang tạo..." : "Tạo phiếu"}
                        </Button>
                    </Stack>
                </Stack>

                <Paper variant="outlined" sx={{ mb: 2, p: 2, borderRadius: 2.5 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                        <TextField
                            size="small"
                            placeholder="Tìm số biên bản, mô tả, người lập..."
                            value={searchText}
                            onChange={(e) => updateFilter(setSearchText, "q", e.target.value)}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    )
                                }
                            }}
                            sx={{ flex: 1, minWidth: { xs: "100%", md: 280 } }}
                        />
                        <TextField
                            select
                            size="small"
                            label="Bộ phận lập"
                            value={departmentFilter}
                            onChange={(e) => updateFilter(setDepartmentFilter, "creatorDepartment", e.target.value)}
                            sx={{ minWidth: { xs: "100%", md: 220 } }}
                        >
                            <MenuItem value="all">Tất cả bộ phận</MenuItem>
                            {currentUser.boPhanId && <MenuItem value="mine">Bộ phận của tôi</MenuItem>}
                            {departmentOptions.map((department) => (
                                <MenuItem key={department.id} value={String(department.id)}>{department.label}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label="Trạng thái"
                            value={statusFilter}
                            onChange={(e) => updateFilter(setStatusFilter, "status", e.target.value)}
                            sx={{ minWidth: { xs: "100%", md: 210 } }}
                        >
                            <MenuItem value="">Tất cả trạng thái</MenuItem>
                            {statusOptions.map((status) => (
                                <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                            ))}
                        </TextField>
                    </Stack>

                    <Collapse in={advancedOpen}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            alignItems={{ xs: "stretch", sm: "center" }}
                            sx={{ mt: 1.5 }}
                        >
                            <TextField
                                size="small"
                                label="Từ ngày"
                                type="date"
                                value={dateFrom}
                                onChange={(e) => updateFilter(setDateFrom, "from", e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <TextField
                                size="small"
                                label="Đến ngày"
                                type="date"
                                value={dateTo}
                                onChange={(e) => updateFilter(setDateTo, "to", e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <Button color="inherit" startIcon={<RestartAltIcon />} onClick={resetFilters}>
                                Xóa bộ lọc
                            </Button>
                        </Stack>
                    </Collapse>

                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.25 }}>
                        Hiển thị {filteredData.length} / {data.length} phiếu
                    </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: "hidden" }}>
                    <Tabs
                        value={workFilter}
                        onChange={(_, value) => {
                            setWorkFilter(value);
                            setPage(0);
                            initialWorkFilterResolvedRef.current = true;
                            updateQuery({ work: value, page: 1 });
                        }}
                        variant="scrollable"
                        scrollButtons="auto"
                        aria-label="Lọc phiếu theo công việc"
                    >
                        <Tab value="action" label={`Cần tôi xử lý (${counts.action})`} />
                        <Tab value="waiting" label={`Đang chờ (${counts.waiting})`} />
                        <Tab value="done" label={`Hoàn tất (${counts.done})`} />
                        <Tab value="all" label={`Tất cả (${data.length})`} />
                    </Tabs>
                </Paper>

                <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: 0 }}>
                        <TableContainer ref={tableContainerRef} component={Paper} elevation={0}>
                            <Table>
                                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                                    <TableRow>
                                        <TableCell>Số biên bản</TableCell>
                                        <TableCell>Mô tả chung</TableCell>
                                        <TableCell>Người lập</TableCell>
                                        <TableCell>Ngày tạo</TableCell>
                                        <TableCell>Tiến độ</TableCell>
                                        <TableCell>Trạng thái</TableCell>
                                        <TableCell align="center">Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                                                Chưa có phiếu xử lý không phù hợp
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedData.map((item) => (
                                            <TableRow
                                                key={item.BienBanId}
                                                hover
                                                onClick={() => openDetail(item.BienBanId)}
                                                sx={{ cursor: "pointer" }}
                                            >
                                                <TableCell sx={{ fontWeight: 600 }}>{item.SoBienBan || `BB#${item.BienBanId}`}</TableCell>
                                                <TableCell>{item.MoTaChung || "---"}</TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{item.NguoiLap || "---"}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {[item.MaBoPhanTao, item.TenBoPhanTao].filter(Boolean).join(" - ") || "Chưa có bộ phận"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>{item.CreatedAt ? new Date(item.CreatedAt).toLocaleString("vi-VN") : "---"}</TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {item.SoBoPhan > 0 ? `${item.DaCoYKien || 0}/${item.SoBoPhan} bộ phận` : "Chưa phân công"}
                                                    </Typography>
                                                    {item.BoPhanChuaXacNhanText && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            Chờ: {item.BoPhanChuaXacNhanText}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>{renderTrangThaiChip(item.TrangThai)}</TableCell>
                                                <TableCell align="center">
                                                    <Button
                                                        size="small"
                                                        variant={getWorkBucket(item, currentUser, access) === "action" ? "contained" : "outlined"}
                                                        endIcon={<ArrowForwardIcon />}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            openDetail(item.BienBanId);
                                                        }}
                                                        sx={{ whiteSpace: "nowrap" }}
                                                    >
                                                        {getWorkBucket(item, currentUser, access) === "action"
                                                            ? "Xử lý ngay"
                                                            : getWorkBucket(item, currentUser, access) === "done" ? "Xem kết quả" : "Xem tiến độ"}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={filteredData.length}
                            page={page}
                            onPageChange={(_, newPage) => {
                                setPage(newPage);
                                updateQuery({ page: newPage + 1 });
                            }}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(event) => {
                                const nextPageSize = parseInt(event.target.value, 10);
                                setRowsPerPage(nextPageSize);
                                setPage(0);
                                updateQuery({ pageSize: nextPageSize, page: 1 });
                            }}
                            labelRowsPerPage="Số dòng/trang:"
                            labelDisplayedRows={({ from, to, count }) => `${from}-${to} trên ${count}`}
                            rowsPerPageOptions={[5, 10, 25, 50]}
                        />
                    </CardContent>
                </Card>
            </Box>
        </Fade>
    );
}
