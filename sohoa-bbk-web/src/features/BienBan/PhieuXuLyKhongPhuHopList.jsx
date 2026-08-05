import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useNavigate } from "react-router-dom";
import { createStandaloneBienBan, getStandaloneBienBanList } from "../../api/bienBan.api";
import { decodeToken } from "../../utils/auth";
import { getBienBanStatusMeta } from "./components/bienBanWorkflow";

const normalizeSearchText = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

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
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [workFilter, setWorkFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
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

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getStandaloneBienBanList();
            const rows = res.data || [];
            setData(rows);
            if (rows.some((item) => getWorkBucket(item, currentUser, access) === "action")) {
                setWorkFilter("action");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [currentUser, access]);

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

    const resetFilters = () => {
        setSearchText("");
        setStatusFilter("");
        setDepartmentFilter("all");
        setDateFrom("");
        setDateTo("");
        setWorkFilter("all");
        setPage(0);
    };

    const handleCreate = async () => {
        try {
            setCreating(true);
            const res = await createStandaloneBienBan();
            const bienBanId = res.data?.bienBanId;
            if (bienBanId) {
                navigate(`/phieu-xu-ly-khong-phu-hop/${bienBanId}`);
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
                            onClick={() => setAdvancedOpen((open) => !open)}
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
                            onChange={(e) => {
                                setSearchText(e.target.value);
                                setPage(0);
                            }}
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
                            onChange={(e) => {
                                setDepartmentFilter(e.target.value);
                                setPage(0);
                            }}
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
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(0);
                            }}
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
                                onChange={(e) => {
                                    setDateFrom(e.target.value);
                                    setPage(0);
                                }}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <TextField
                                size="small"
                                label="Đến ngày"
                                type="date"
                                value={dateTo}
                                onChange={(e) => {
                                    setDateTo(e.target.value);
                                    setPage(0);
                                }}
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
                        <TableContainer component={Paper} elevation={0}>
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
                                            <TableRow key={item.BienBanId} hover>
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
                                                        onClick={() => navigate(`/phieu-xu-ly-khong-phu-hop/${item.BienBanId}`)}
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
                            onPageChange={(_, newPage) => setPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(event) => {
                                setRowsPerPage(parseInt(event.target.value, 10));
                                setPage(0);
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
