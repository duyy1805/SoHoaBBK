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
    TablePagination,
    IconButton,
    Tooltip,
    Popover
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
import WorkFilterTabLabel from "./components/WorkFilterTabLabel";
import {
    CreatorSummary,
    NonconformitySummary,
    ProductSummary
} from "./components/ListRecordSummary";
import { MUC_DO_LABELS, PHAT_HIEN_TU_LABELS } from "./components/listRecordSummary.constants";

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
    const managedDepartmentIds = new Set((currentUser.managedBoPhanIds || [currentUser.boPhanId]).map(Number));
    if (["HOAN_TAT", "HOAN_THANH", "DA_XAC_NHAN"].includes(item.TrangThai)) return "done";
    if (!access.isGlobalManager && item.MyDepartmentOpinionStatus === "CHO_Y_KIEN" && item.MyPendingSuggestedUserId) {
        return Number(item.MyPendingSuggestedUserId) === Number(currentUser.userId) ? "action" : "waiting";
    }
    const hasServerDecision = item.CanCurrentUserAct !== null && item.CanCurrentUserAct !== undefined;
    const explicitMyTurn = hasServerDecision
        ? item.CanCurrentUserAct === true || item.CanCurrentUserAct === 1
        : Number(item.NguoiXuLyId) === Number(currentUser.userId) ||
            managedDepartmentIds.has(Number(item.BoPhanId)) ||
            managedDepartmentIds.has(Number(item.BoPhanDangChoId));
    const globalManagerTurn = access.isGlobalManager && ACTIONABLE_MANAGER_STATUSES.has(item.TrangThai);
    const departmentLeadFallback = !hasServerDecision && access.isDepartmentLead &&
        managedDepartmentIds.has(Number(item.CreatorBoPhanId)) &&
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
    const [numberFilter, setNumberFilter] = useState(() => searchParams.get("number") || "");
    const [itemFilter, setItemFilter] = useState(() => searchParams.get("item") || "");
    const [kphFilter, setKphFilter] = useState(() => searchParams.get("kph") || "");
    const [descriptionFilter, setDescriptionFilter] = useState(() => searchParams.get("description") || "");
    const [creatorFilter, setCreatorFilter] = useState(() => searchParams.get("creator") || "");
    const [filterPopover, setFilterPopover] = useState({ field: "", anchorEl: null });
    const [departmentFilter, setDepartmentFilter] = useState(() => searchParams.get("creatorDepartment") || "all");
    const [opinionDepartmentFilter, setOpinionDepartmentFilter] = useState(() => searchParams.get("opinionDepartment") || "all");
    const [dateFrom, setDateFrom] = useState(() => searchParams.get("from") || "");
    const [dateTo, setDateTo] = useState(() => searchParams.get("to") || "");
    const [advancedOpen, setAdvancedOpen] = useState(() => searchParams.get("advanced") === "1");
    const [page, setPage] = useState(() => parsePageParam(searchParams.get("page")));
    const [rowsPerPage, setRowsPerPage] = useState(() => {
        const value = Number(searchParams.get("pageSize"));
        return VALID_PAGE_SIZES.includes(value) ? value : 10;
    });
    const tableContainerRef = useRef(null);
    const hasRestoredScrollRef = useRef(false);
    const initialWorkFilterResolvedRef = useRef(searchParams.has("work"));
    const currentUser = useMemo(() => decodeToken() || {}, []);
    const managedDepartmentIds = useMemo(() => new Set(
        (currentUser.managedBoPhanIds || [currentUser.boPhanId]).map(Number)
    ), [currentUser]);
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
        setNumberFilter(searchParams.get("number") || "");
        setItemFilter(searchParams.get("item") || "");
        setKphFilter(searchParams.get("kph") || "");
        setDescriptionFilter(searchParams.get("description") || "");
        setCreatorFilter(searchParams.get("creator") || "");
        setDepartmentFilter(searchParams.get("creatorDepartment") || "all");
        setOpinionDepartmentFilter(searchParams.get("opinionDepartment") || "all");
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
            setData(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (loading || initialWorkFilterResolvedRef.current) return;
        initialWorkFilterResolvedRef.current = true;
        if (data.some((item) => getWorkBucket(item, currentUser, access) === "action")) {
            setWorkFilter("action");
            updateQuery({ work: "action", page: 1 });
        }
    }, [access, currentUser, data, loading, updateQuery]);

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

    const opinionDepartmentOptions = useMemo(() => {
        const options = new Map();
        data.forEach((item) => {
            (Array.isArray(item.OpinionDepartments) ? item.OpinionDepartments : []).forEach((department) => {
                const id = Number(department.id);
                if (!Number.isInteger(id) || id <= 0) return;
                options.set(id, {
                    id,
                    label: [department.maBoPhan, department.tenBoPhan].filter(Boolean).join(" - ") || `Bộ phận #${id}`
                });
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
            if (numberFilter && !normalizeSearchText(item.SoBienBan || `BB#${item.BienBanId}`)
                .includes(normalizeSearchText(numberFilter))) return false;
            if (itemFilter && !normalizeSearchText(`${item.MaSanPham || ""} ${item.TenSanPham || ""} ${item.DonHang || ""} ${item.Lot || ""}`)
                .includes(normalizeSearchText(itemFilter))) return false;
            if (kphFilter && !normalizeSearchText(`${PHAT_HIEN_TU_LABELS[item.PhatHienTu] || ""} ${MUC_DO_LABELS[item.MucDo] || ""}`)
                .includes(normalizeSearchText(kphFilter))) return false;
            if (descriptionFilter && !normalizeSearchText(item.MoTaChung).includes(normalizeSearchText(descriptionFilter))) return false;
            if (creatorFilter && !normalizeSearchText(`${item.NguoiLap || ""} ${item.MaBoPhanTao || ""} ${item.TenBoPhanTao || ""}`)
                .includes(normalizeSearchText(creatorFilter))) return false;
            if (workFilter !== "all" && getWorkBucket(item, currentUser, access) !== workFilter) return false;
            if (statusFilter && item.TrangThai !== statusFilter) return false;
            if (departmentFilter === "mine" && !managedDepartmentIds.has(Number(item.CreatorBoPhanId))) return false;
            if (!["all", "mine"].includes(departmentFilter) && Number(item.CreatorBoPhanId) !== Number(departmentFilter)) return false;
            const opinionDepartmentIds = (Array.isArray(item.OpinionDepartments) ? item.OpinionDepartments : [])
                .map((department) => Number(department.id));
            if (opinionDepartmentFilter === "mine" && !opinionDepartmentIds.some((id) => managedDepartmentIds.has(Number(id)))) return false;
            if (!["all", "mine"].includes(opinionDepartmentFilter)
                && !opinionDepartmentIds.includes(Number(opinionDepartmentFilter))) return false;

            const createdAt = item.CreatedAt ? new Date(item.CreatedAt) : null;
            if (dateFrom && (!createdAt || createdAt < new Date(`${dateFrom}T00:00:00`))) return false;
            if (dateTo && (!createdAt || createdAt > new Date(`${dateTo}T23:59:59.999`))) return false;

            if (!keyword) return true;
            const searchableText = normalizeSearchText([
                item.SoBienBan,
                item.MoTaChung,
                item.NguoiLap,
                item.MaBoPhanTao,
                item.TenBoPhanTao,
                ...(Array.isArray(item.OpinionDepartments)
                    ? item.OpinionDepartments.flatMap((department) => [department.maBoPhan, department.tenBoPhan])
                    : []),
                item.MaSanPham,
                item.TenSanPham,
                item.DonHang,
                item.Lot,
                PHAT_HIEN_TU_LABELS[item.PhatHienTu],
                MUC_DO_LABELS[item.MucDo],
                ...(Array.isArray(item.MainDefects)
                    ? item.MainDefects.flatMap((defect) => [defect.MaLoi, defect.TenLoi])
                    : [])
            ].filter(Boolean).join(" "));
            return searchableText.includes(normalizeSearchText(keyword));
        });
    }, [data, searchText, numberFilter, itemFilter, kphFilter, descriptionFilter, creatorFilter, workFilter, statusFilter, departmentFilter, opinionDepartmentFilter, dateFrom, dateTo, currentUser, access, managedDepartmentIds]);

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
        if (loading || hasRestoredScrollRef.current) return;
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
            hasRestoredScrollRef.current = true;
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

    const closeFilterPopover = () => setFilterPopover({ field: "", anchorEl: null });

    const renderFilterHeader = ({ field, label, value, onChange, placeholder, options }) => {
        const isOpen = filterPopover.field === field;
        const hasValue = Boolean(value);
        return (
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="space-between">
                <span>{label}</span>
                <Tooltip title={`Lọc ${label.toLowerCase()}`}>
                    <IconButton
                        size="small"
                        color={hasValue ? "primary" : "default"}
                        onClick={(event) => {
                            event.stopPropagation();
                            setFilterPopover({ field, anchorEl: event.currentTarget });
                        }}
                        sx={{ width: 28, height: 28, bgcolor: hasValue ? "action.selected" : "transparent" }}
                    >
                        <FilterListIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Popover
                    open={isOpen}
                    anchorEl={filterPopover.anchorEl}
                    onClose={closeFilterPopover}
                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                    transformOrigin={{ vertical: "top", horizontal: "left" }}
                    onClick={(event) => event.stopPropagation()}
                >
                    <Box sx={{ p: 2, width: 280 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>{label}</Typography>
                        <TextField
                            autoFocus
                            select={Boolean(options)}
                            fullWidth
                            size="small"
                            placeholder={placeholder}
                            value={value}
                            onChange={(event) => onChange(event.target.value)}
                            onKeyDown={(event) => event.key === "Escape" && closeFilterPopover()}
                        >
                            {options?.map((option) => (
                                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                            ))}
                        </TextField>
                        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2 }}>
                            <Button variant="outlined" size="small" onClick={() => onChange("")}>Bỏ lọc</Button>
                            <Button variant="contained" size="small" onClick={closeFilterPopover}>Đóng</Button>
                        </Stack>
                    </Box>
                </Popover>
            </Stack>
        );
    };

    const resetFilters = () => {
        setSearchText("");
        setStatusFilter("");
        setNumberFilter("");
        setItemFilter("");
        setKphFilter("");
        setDescriptionFilter("");
        setCreatorFilter("");
        setDepartmentFilter("all");
        setOpinionDepartmentFilter("all");
        setDateFrom("");
        setDateTo("");
        setWorkFilter("all");
        setPage(0);
        initialWorkFilterResolvedRef.current = true;
        updateQuery({
            q: "",
            status: "",
            number: "",
            item: "",
            kph: "",
            description: "",
            creator: "",
            creatorDepartment: "",
            opinionDepartment: "",
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
                            label="Bộ phận được xin ý kiến"
                            value={opinionDepartmentFilter}
                            onChange={(event) => updateFilter(setOpinionDepartmentFilter, "opinionDepartment", event.target.value)}
                            sx={{ minWidth: { xs: "100%", md: 250 } }}
                        >
                            <MenuItem value="all">Tất cả bộ phận được xin ý kiến</MenuItem>
                            {currentUser.boPhanId && <MenuItem value="mine">Bộ phận của tôi</MenuItem>}
                            {opinionDepartmentOptions.map((department) => (
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
                                label="Nguồn / mức độ KPH"
                                value={kphFilter}
                                onChange={(e) => updateFilter(setKphFilter, "kph", e.target.value)}
                                sx={{ minWidth: 220 }}
                            />
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
                        <Tab value="action" label={<WorkFilterTabLabel label="Cần tôi xử lý" count={counts.action} description="Các phiếu mà bạn hoặc bộ phận của bạn đang có nhiệm vụ hoặc quyền thực hiện bước tiếp theo." />} />
                        <Tab value="waiting" label={<WorkFilterTabLabel label="Đang chờ" count={counts.waiting} description="Các phiếu bạn được xem nhưng hiện đang chờ người hoặc bộ phận khác xử lý." />} />
                        <Tab value="done" label={<WorkFilterTabLabel label="Hoàn tất" count={counts.done} description="Các phiếu đã hoàn thành quy trình và chỉ còn phục vụ tra cứu hoặc in lại." />} />
                        <Tab value="all" label={<WorkFilterTabLabel label="Tất cả" count={data.length} description="Toàn bộ phiếu xử lý không phù hợp mà tài khoản của bạn có quyền xem." />} />
                    </Tabs>
                </Paper>

                <Card sx={{ borderRadius: 2.5, boxShadow: "0 4px 20px rgba(15,23,42,0.06)", overflow: "hidden" }}>
                    <CardContent sx={{ p: 0 }}>
                        <TableContainer
                            ref={tableContainerRef}
                            sx={{ display: { xs: "none", md: "block" }, maxHeight: "calc(100vh - 240px)" }}
                        >
                            <Table stickyHeader size="small" sx={{ tableLayout: "fixed", "& .MuiTableCell-root": { px: 1.25, py: 1.25, fontSize: "0.8rem", verticalAlign: "top" } }}>
                                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                                    <TableRow>
                                        <TableCell sx={{ width: "17%" }}>
                                            {renderFilterHeader({ field: "number", label: "Phiếu KPH", value: numberFilter, onChange: (value) => updateFilter(setNumberFilter, "number", value), placeholder: "Nhập số phiếu" })}
                                        </TableCell>
                                        <TableCell sx={{ width: "22%" }}>
                                            {renderFilterHeader({ field: "item", label: "VT/BTP/TP", value: itemFilter, onChange: (value) => updateFilter(setItemFilter, "item", value), placeholder: "Nhập mã, tên, Lot hoặc đơn hàng" })}
                                        </TableCell>
                                        <TableCell sx={{ width: "30%" }}>
                                            {renderFilterHeader({ field: "description", label: "Sự không phù hợp", value: descriptionFilter, onChange: (value) => updateFilter(setDescriptionFilter, "description", value), placeholder: "Nhập mô tả" })}
                                        </TableCell>
                                        <TableCell sx={{ width: "15%" }}>
                                            {renderFilterHeader({ field: "creator", label: "Người lập", value: creatorFilter, onChange: (value) => updateFilter(setCreatorFilter, "creator", value), placeholder: "Nhập người lập hoặc bộ phận" })}
                                        </TableCell>
                                        <TableCell sx={{ width: "16%" }}>Tiến độ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
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
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={700} color="primary.main">{item.SoBienBan || `BB#${item.BienBanId}`}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {item.CreatedAt ? new Date(item.CreatedAt).toLocaleString("vi-VN") : "Chưa có ngày tạo"}
                                                    </Typography>
                                                    <Box sx={{ mt: 0.6 }}>{renderTrangThaiChip(item.TrangThai)}</Box>
                                                </TableCell>
                                                <TableCell>
                                                    <ProductSummary item={item} showSourceType />
                                                </TableCell>
                                                <TableCell>
                                                    <NonconformitySummary item={item} />
                                                </TableCell>
                                                <TableCell>
                                                    <CreatorSummary item={item} />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption" fontWeight={600} sx={{ display: "block" }}>
                                                        {item.SoBoPhan > 0 ? `${item.DaCoYKien || 0}/${item.SoBoPhan} bộ phận` : "Chưa phân công"}
                                                    </Typography>
                                                    {item.BoPhanChuaXacNhanText && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.3, mt: 0.4 }}>
                                                            Chờ: {item.BoPhanChuaXacNhanText}
                                                        </Typography>
                                                    )}
                                                    <Button
                                                        size="small"
                                                        variant={getWorkBucket(item, currentUser, access) === "action" ? "contained" : "outlined"}
                                                        endIcon={<ArrowForwardIcon />}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            openDetail(item.BienBanId);
                                                        }}
                                                        sx={{ whiteSpace: "nowrap", mt: 0.8, minWidth: 0 }}
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
                        <Stack spacing={1.25} sx={{ display: { xs: "flex", md: "none" }, p: 1.25, bgcolor: "grey.50" }}>
                            {paginatedData.length === 0 ? (
                                <Box sx={{ py: 5, textAlign: "center" }}>
                                    <Typography color="text.secondary">Chưa có phiếu xử lý không phù hợp</Typography>
                                </Box>
                            ) : paginatedData.map((item) => {
                                const bucket = getWorkBucket(item, currentUser, access);
                                return (
                                    <Paper key={item.BienBanId} variant="outlined" onClick={() => openDetail(item.BienBanId)} sx={{ p: 1.5, borderRadius: 2, cursor: "pointer" }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={800} color="primary.main">{item.SoBienBan || `BB#${item.BienBanId}`}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {item.CreatedAt ? new Date(item.CreatedAt).toLocaleString("vi-VN") : "Chưa có ngày tạo"}
                                                </Typography>
                                            </Box>
                                            {renderTrangThaiChip(item.TrangThai)}
                                        </Stack>
                                        <Box sx={{ mt: 1.25 }}><ProductSummary item={item} showSourceType /></Box>
                                        <Box sx={{ mt: 1.25, pt: 1.25, borderTop: 1, borderColor: "divider" }}><NonconformitySummary item={item} /></Box>
                                        <Box sx={{ mt: 1.25, pt: 1.25, borderTop: 1, borderColor: "divider" }}>
                                            <Typography variant="caption" color="text.secondary">Người lập</Typography>
                                            <CreatorSummary item={item} />
                                        </Box>
                                        <Box sx={{ mt: 1.25, pt: 1.25, borderTop: 1, borderColor: "divider" }}>
                                            <Typography variant="caption" fontWeight={600} sx={{ display: "block" }}>
                                                {item.SoBoPhan > 0 ? `${item.DaCoYKien || 0}/${item.SoBoPhan} bộ phận hoàn thành` : "Chưa phân công bộ phận"}
                                            </Typography>
                                            {item.BoPhanChuaXacNhanText && <Typography variant="caption" color="text.secondary">Chờ: {item.BoPhanChuaXacNhanText}</Typography>}
                                        </Box>
                                        <Button
                                            fullWidth
                                            size="small"
                                            variant={bucket === "action" ? "contained" : "outlined"}
                                            endIcon={<ArrowForwardIcon />}
                                            onClick={(event) => { event.stopPropagation(); openDetail(item.BienBanId); }}
                                            sx={{ mt: 1.25 }}
                                        >
                                            {bucket === "action" ? "Xử lý ngay" : bucket === "done" ? "Xem kết quả" : "Xem tiến độ"}
                                        </Button>
                                    </Paper>
                                );
                            })}
                        </Stack>
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
