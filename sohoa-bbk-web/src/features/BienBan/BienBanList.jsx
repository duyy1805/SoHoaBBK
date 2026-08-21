import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Typography,
    Card,
    Chip,
    CircularProgress,
    Stack,
    Fade,
    TextField,
    MenuItem,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    InputAdornment,
    IconButton,
    Tooltip,
    Button,
    Tabs,
    Tab,
    Paper,
    Collapse,
    Alert,
    Popover
} from "@mui/material";
import {
    Search as SearchIcon,
    Visibility as VisibilityIcon,
    ArrowForward as ArrowForwardIcon,
    FilterList as FilterListIcon,
    RestartAlt as RestartAltIcon,
    ForumOutlined as ForumOutlinedIcon
} from "@mui/icons-material";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getMyBienBan } from "../../api/bienBan.api"; // Giữ nguyên import của bạn
import { decodeToken } from "../../utils/auth";
import { getBienBanStatusMeta } from "./components/bienBanWorkflow";
import WorkFilterTabLabel from "./components/WorkFilterTabLabel";
import { CreatorSummary, NonconformitySummary, ProductSummary } from "./components/ListRecordSummary";
import ListRecordTime from "./components/ListRecordTime";
import { getRecordReferenceDate } from "./components/listRecordTime.utils";

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

const getMyDepartmentOpinionMeta = (status) => {
    if (status === "CHO_Y_KIEN") {
        return { label: "Bộ phận bạn cần nhập ý kiến", color: "warning" };
    }
    if (status === "CHO_TBP_XAC_NHAN") {
        return { label: "Chờ TBP bộ phận bạn xác nhận", color: "info" };
    }
    return null;
};

const getWorkBucket = (item, currentUser, isManager, isSxbt) => {
    const managedDepartmentIds = new Set((currentUser.managedBoPhanIds || [currentUser.boPhanId]).map(Number));
    if (isSxbt) {
        if (item.TrangThai === "BB_SXBT_HOAN_TAT") return "done";
        return managedDepartmentIds.has(Number(item.BoPhanDangChoId))
            ? "action"
            : "waiting";
    }
    if (["HOAN_TAT", "HOAN_THANH", "DA_XAC_NHAN"].includes(item.TrangThai)) return "done";
    if (!isManager && item.MyDepartmentOpinionStatus === "CHO_Y_KIEN" && item.MyPendingSuggestedUserId) {
        return Number(item.MyPendingSuggestedUserId) === Number(currentUser.userId) ? "action" : "waiting";
    }
    const explicitMyTurn = item.CanCurrentUserAct === true || item.CanCurrentUserAct === 1 ||
        Number(item.NguoiXuLyId) === Number(currentUser.userId) ||
        managedDepartmentIds.has(Number(item.BoPhanId)) ||
        managedDepartmentIds.has(Number(item.BoPhanDangChoId));
    const managerTurn = isManager && ["BB_MOI", "CHO_PHAN_BO_XU_LY", "CHO_PHAN_BO_XY_LY", "CHO_TP_B8", "TRA_LAI_CHINH_SUA"].includes(item.TrangThai);
    return explicitMyTurn || managerTurn ? "action" : "waiting";
};

export default function BienBanList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    // Filters & Pagination state
    const [filterStatus, setFilterStatus] = useState(() => searchParams.get("status") || "");
    const [filterSoPhieu, setFilterSoPhieu] = useState(() => searchParams.get("number") || "");
    const [filterLoaiKiem, setFilterLoaiKiem] = useState(() => searchParams.get("inspectionType") || "");
    const [filterProduct, setFilterProduct] = useState(() => searchParams.get("product") || "");
    const [filterCreator, setFilterCreator] = useState(() => searchParams.get("creator") || "");
    const [filterPopover, setFilterPopover] = useState({ field: "", anchorEl: null });
    const [searchText, setSearchText] = useState(() => searchParams.get("q") || "");
    const [page, setPage] = useState(() => parsePageParam(searchParams.get("page")));
    const [rowsPerPage, setRowsPerPage] = useState(() => {
        const value = Number(searchParams.get("pageSize"));
        return VALID_PAGE_SIZES.includes(value) ? value : 10;
    });
    const [workFilter, setWorkFilter] = useState(() => searchParams.get("work") || "all");
    const [departmentFilter, setDepartmentFilter] = useState(() => searchParams.get("creatorDepartment") || "all");
    const [opinionDepartmentFilter, setOpinionDepartmentFilter] = useState(() => searchParams.get("opinionDepartment") || "all");
    const [typeFilter, setTypeFilter] = useState(() => searchParams.get("type") || "all");
    const [dateFrom, setDateFrom] = useState(() => searchParams.get("from") || "");
    const [dateTo, setDateTo] = useState(() => searchParams.get("to") || "");
    const [advancedOpen, setAdvancedOpen] = useState(() => searchParams.get("advanced") === "1");
    const tableContainerRef = useRef(null);
    const restoredScrollKeyRef = useRef("");
    const currentUser = useMemo(() => decodeToken() || {}, []);
    const managedDepartmentIds = useMemo(() => new Set(
        (currentUser.managedBoPhanIds || [currentUser.boPhanId]).map(Number)
    ), [currentUser]);
    const isManager = (currentUser.roles || []).some((role) =>
        String(role || "").toUpperCase().startsWith("TP_")
    ) || (currentUser.permissions || []).some((permission) =>
        ["QUAN_TRI_DM", "XAC_NHAN_NGUOI_XU_LY", "KET_LUAN"].includes(permission)
    );

    const listUrl = `${location.pathname}${location.search}`;
    const scrollStorageKey = `bien-ban:list-scroll:${listUrl}`;

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
        setFilterStatus(searchParams.get("status") || "");
        setFilterSoPhieu(searchParams.get("number") || "");
        setFilterLoaiKiem(searchParams.get("inspectionType") || "");
        setFilterProduct(searchParams.get("product") || "");
        setFilterCreator(searchParams.get("creator") || "");
        setSearchText(searchParams.get("q") || "");
        setPage(parsePageParam(searchParams.get("page")));
        const pageSize = Number(searchParams.get("pageSize"));
        setRowsPerPage(VALID_PAGE_SIZES.includes(pageSize) ? pageSize : 10);
        setWorkFilter(searchParams.get("work") || "all");
        setDepartmentFilter(searchParams.get("creatorDepartment") || "all");
        setOpinionDepartmentFilter(searchParams.get("opinionDepartment") || "all");
        setTypeFilter(searchParams.get("type") || "all");
        setDateFrom(searchParams.get("from") || "");
        setDateTo(searchParams.get("to") || "");
        setAdvancedOpen(searchParams.get("advanced") === "1");
    }, [searchParams]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setLoadError("");
            const res = await getMyBienBan();
            setData(res.data || []);
        } catch (err) {
            console.error(err);
            setData([]);
            setLoadError(err.response?.data?.message || "Không thể tải danh sách biên bản. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    const isSxbtBienBan = (item) =>
        item.LoaiBienBan === "SXBT" ||
        item.LoaiKiemId === 4 ||
        String(item.TrangThai || "").startsWith("BB_SXBT");

    const getLoaiKiemLabel = (item) => item.TenLoaiKiem || (
        item.LoaiKiemId
            ? `Loại ${item.LoaiKiemId}`
            : item.LoaiBienBan === "STANDALONE"
                ? "Tạo độc lập"
                : "—"
    );
    const getLoaiKiemValue = (item) => item.LoaiKiemId
        ? String(item.LoaiKiemId)
        : item.LoaiBienBan === "STANDALONE" ? "standalone" : "unknown";

    const renderTrangThaiChip = (item) => {
        const { TrangThai: trangThai } = item;
        if (isSxbtBienBan(item)) {
            if (trangThai === "BB_SXBT_HOAN_TAT") {
                return <Chip label="SXBT hoàn tất" color="success" size="small" sx={{ fontWeight: 500 }} />;
            }
            if (trangThai === "BB_SXBT_CHO_XAC_NHAN") {
                const waitingDepartment = item.MaBoPhanDangCho || item.TenBoPhanDangCho;
                return (
                    <Chip
                        label={waitingDepartment ? `Chờ ${waitingDepartment}` : "Đang xử lý SXBT"}
                        color="info"
                        size="small"
                        sx={{ fontWeight: 500 }}
                    />
                );
            }
            if (trangThai === "BB_SXBT_MOI" || trangThai === "BB_SXBT_TP_B8_DRAFT") {
                return <Chip label="Chờ xác nhận mức" color="warning" size="small" sx={{ fontWeight: 500 }} />;
            }
        }

        const status = getBienBanStatusMeta(trangThai);

        return <Chip label={status.label} color={status.color} size="small" sx={{ fontWeight: 500 }} />;
    };

    const getPendingDepartmentsText = (item) => {
        if (!item.BoPhanChuaXacNhanText) return "";
        if (isSxbtBienBan(item)) {
            if (item.TrangThai === "BB_SXBT_HOAN_TAT") return "";
            if (item.TrangThai === "BB_SXBT_MOI" || item.TrangThai === "BB_SXBT_TP_B8_DRAFT") return "";
        } else if (item.TrangThai === "DA_XAC_NHAN") {
            return "";
        }
        return `Chưa xác nhận: ${item.BoPhanChuaXacNhanText}`;
    };

    // Lọc dữ liệu bằng useMemo để tối ưu hiệu năng
    const workCounts = useMemo(() => data.reduce((result, item) => {
        const bucket = getWorkBucket(item, currentUser, isManager, isSxbtBienBan(item));
        result[bucket] += 1;
        return result;
    }, { action: 0, waiting: 0, done: 0 }), [data, currentUser, isManager]);

    const departmentOptions = useMemo(() => {
        const options = new Map();
        data.forEach((item) => {
            const id = Number(item.BoPhanTaoId);
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

    const loaiKiemOptions = useMemo(() => {
        const options = new Map();
        data.forEach((item) => options.set(getLoaiKiemValue(item), getLoaiKiemLabel(item)));
        return [...options.entries()]
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label, "vi"));
    }, [data]);

    const filteredData = useMemo(() => {
        return data.filter((item) => {
            if (filterSoPhieu && !normalizeSearchText(item.SoPhieu).includes(normalizeSearchText(filterSoPhieu))) return false;
            if (filterLoaiKiem && getLoaiKiemValue(item) !== filterLoaiKiem) return false;
            if (filterProduct && !normalizeSearchText(`${item.MaSanPham || ""} ${item.TenSanPham || ""} ${item.Lot || ""} ${item.DonHang || ""}`)
                .includes(normalizeSearchText(filterProduct))) return false;
            if (filterCreator && !normalizeSearchText(`${item.NguoiLap || ""} ${item.MaBoPhanTao || ""} ${item.TenBoPhanTao || ""}`)
                .includes(normalizeSearchText(filterCreator))) return false;
            if (workFilter !== "all" && getWorkBucket(item, currentUser, isManager, isSxbtBienBan(item)) !== workFilter) return false;
            if (departmentFilter === "mine" && !managedDepartmentIds.has(Number(item.BoPhanTaoId))) return false;
            if (!["all", "mine"].includes(departmentFilter) && Number(item.BoPhanTaoId) !== Number(departmentFilter)) return false;
            const opinionDepartmentIds = (Array.isArray(item.OpinionDepartments) ? item.OpinionDepartments : [])
                .map((department) => Number(department.id));
            if (opinionDepartmentFilter === "mine" && !opinionDepartmentIds.some((id) => managedDepartmentIds.has(Number(id)))) return false;
            if (!["all", "mine"].includes(opinionDepartmentFilter) && !opinionDepartmentIds.includes(Number(opinionDepartmentFilter))) return false;
            if (typeFilter === "sxbt" && !isSxbtBienBan(item)) return false;
            if (typeFilter === "normal" && isSxbtBienBan(item)) return false;
            // Lọc theo trạng thái
            if (filterStatus && item.TrangThai !== filterStatus) return false;

            const referenceDate = getRecordReferenceDate(item);
            if (dateFrom && (!referenceDate || referenceDate < new Date(`${dateFrom}T00:00:00`))) return false;
            if (dateTo && (!referenceDate || referenceDate > new Date(`${dateTo}T23:59:59.999`))) return false;

            // Lọc theo text (Tìm kiếm trên nhiều cột)
            if (searchText) {
                const searchLower = normalizeSearchText(searchText.trim());
                const searchableText = normalizeSearchText([
                    item.SoPhieu,
                    item.TenLoaiKiem,
                    item.MaLoaiKiem,
                    item.MaSanPham,
                    item.TenSanPham,
                    item.Lot,
                    item.DonHang,
                    item.MoTaChung,
                    item.PhatHienTu,
                    item.MucDo,
                    ...(Array.isArray(item.MainDefects)
                        ? item.MainDefects.flatMap((defect) => [defect.MaLoi, defect.TenLoi])
                        : []),
                    item.NguoiLap,
                    item.MaBoPhanTao,
                    item.TenBoPhanTao,
                    ...(Array.isArray(item.OpinionDepartments)
                        ? item.OpinionDepartments.flatMap((department) => [department.maBoPhan, department.tenBoPhan])
                        : []),
                    item.MaDonVi
                ].filter(Boolean).join(" "));
                if (!searchableText.includes(searchLower)) return false;
            }
            return true;
        });
    }, [data, filterStatus, filterSoPhieu, filterLoaiKiem, filterProduct, filterCreator, searchText, workFilter, departmentFilter, opinionDepartmentFilter, typeFilter, dateFrom, dateTo, currentUser, isManager, managedDepartmentIds]);

    const resetFilters = () => {
        setSearchText("");
        setFilterStatus("");
        setFilterSoPhieu("");
        setFilterLoaiKiem("");
        setFilterProduct("");
        setFilterCreator("");
        setDepartmentFilter("all");
        setOpinionDepartmentFilter("all");
        setTypeFilter("all");
        setDateFrom("");
        setDateTo("");
        setWorkFilter("all");
        setPage(0);
        updateQuery({
            q: "",
            status: "",
            number: "",
            inspectionType: "",
            product: "",
            creator: "",
            creatorDepartment: "",
            opinionDepartment: "",
            type: "",
            from: "",
            to: "",
            work: "all",
            page: 1
        });
    };

    // Xử lý phân trang
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

    const getItemPath = (item) => isSxbtBienBan(item)
        ? `/bien-ban/sxbt/${item.BienBanId}`
        : `/bien-ban/${item.BienBanId}`;

    const openDetail = (item) => {
        rememberScrollPosition();
        navigate(getItemPath(item), { state: { returnTo: listUrl } });
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

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
        updateQuery({ page: newPage + 1 });
    };

    const handleChangeRowsPerPage = (event) => {
        const nextPageSize = parseInt(event.target.value, 10);
        setRowsPerPage(nextPageSize);
        setPage(0);
        updateQuery({ pageSize: nextPageSize, page: 1 });
    };

    const getProgressLabel = (item) => isSxbtBienBan(item)
        ? item.SoBoPhan > 0
            ? `Xác nhận ${item.DaCoYKien}/${item.SoBoPhan} bộ phận`
            : "Chưa mở luồng"
        : `Xác nhận ${item.DaCoYKien}/${item.SoBoPhan} bộ phận`;

    const renderProgress = (item) => (
        <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" noWrap>
                    {getProgressLabel(item)}
                </Typography>
                <Typography variant="caption" fontWeight={700} color="primary.main">
                    {item.ProgressPercent || 0}%
                </Typography>
            </Stack>
            <LinearProgress
                variant="determinate"
                value={item.ProgressPercent || 0}
                sx={{ height: 5, borderRadius: 999, bgcolor: "rgba(99,102,241,0.12)" }}
            />
        </Box>
    );

    const getActionLabel = (item) => {
        const bucket = getWorkBucket(item, currentUser, isManager, isSxbtBienBan(item));
        if (bucket === "action") return "Xử lý ngay";
        if (bucket === "done") return "Xem kết quả";
        return "Xem tiến độ";
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Fade in timeout={400}>
            <Box>
                {/* Header & Filters */}
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", md: "center" }}
                    spacing={2}
                    sx={{ mb: 2.5 }}
                >
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 700,
                            background: "linear-gradient(135deg, #1e293b 0%, #475569 100%)",
                            backgroundClip: "text",
                            WebkitTextFillColor: "transparent"
                        }}
                    >
                        Danh sách Biên bản
                    </Typography>

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
                </Stack>

                {loadError && (
                    <Alert severity="error" sx={{ mb: 2 }} action={(
                        <Button color="inherit" size="small" onClick={loadData}>Tải lại</Button>
                    )}>
                        {loadError}
                    </Alert>
                )}

                <Paper variant="outlined" sx={{ mb: 2, p: 2, borderRadius: 2.5 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                        <TextField
                            size="small"
                            placeholder="Tìm số phiếu, sản phẩm, LOT, người lập..."
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
                            onChange={(e) => updateFilter(setOpinionDepartmentFilter, "opinionDepartment", e.target.value)}
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
                            value={filterStatus}
                            onChange={(e) => updateFilter(setFilterStatus, "status", e.target.value)}
                            sx={{ minWidth: { xs: "100%", md: 210 } }}
                        >
                            <MenuItem value="">Tất cả trạng thái</MenuItem>
                            <MenuItem value="BB_MOI">Mới tạo</MenuItem>
                            <MenuItem value="CHO_PHAN_BO_XU_LY">Chờ phân công xử lý</MenuItem>
                            <MenuItem value="CHO_TP_B8">Chờ kết luận</MenuItem>
                            <MenuItem value="DA_KET_LUAN">Đã kết luận</MenuItem>
                            <MenuItem value="CHO_XAC_NHAN">Chờ xác nhận</MenuItem>
                            <MenuItem value="TRA_LAI_CHINH_SUA">Trả lại chỉnh sửa</MenuItem>
                            <MenuItem value="DA_XAC_NHAN">Đã xác nhận</MenuItem>
                            <MenuItem value="CHO_THEO_DOI">Chờ theo dõi đánh giá</MenuItem>
                            <MenuItem value="HOAN_TAT">Hoàn tất</MenuItem>
                            <MenuItem value="BB_SXBT_MOI">SXBT chờ xác nhận mức</MenuItem>
                            <MenuItem value="BB_SXBT_TP_B8_DRAFT">SXBT chờ xác nhận mức</MenuItem>
                            <MenuItem value="BB_SXBT_CHO_XAC_NHAN">SXBT đang xử lý</MenuItem>
                            <MenuItem value="BB_SXBT_HOAN_TAT">SXBT hoàn tất</MenuItem>
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
                                select
                                size="small"
                                label="Loại kiểm"
                                value={filterLoaiKiem}
                                onChange={(e) => updateFilter(setFilterLoaiKiem, "inspectionType", e.target.value)}
                                sx={{ minWidth: 190 }}
                            >
                                <MenuItem value="">Tất cả loại kiểm</MenuItem>
                                {loaiKiemOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                size="small"
                                label="Loại biên bản"
                                value={typeFilter}
                                onChange={(e) => updateFilter(setTypeFilter, "type", e.target.value)}
                                sx={{ minWidth: 190 }}
                            >
                                <MenuItem value="all">Tất cả loại</MenuItem>
                                <MenuItem value="normal">Biên bản kiểm</MenuItem>
                                <MenuItem value="sxbt">Biên bản SXBT</MenuItem>
                            </TextField>
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
                        Hiển thị {filteredData.length} / {data.length} biên bản
                    </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: "hidden" }}>
                    <Tabs
                        value={workFilter}
                        onChange={(_, value) => {
                            setWorkFilter(value);
                            setPage(0);
                            updateQuery({ work: value, page: 1 });
                        }}
                        variant="scrollable"
                        scrollButtons="auto"
                        aria-label="Lọc biên bản theo công việc"
                    >
                        <Tab value="action" label={<WorkFilterTabLabel label="Cần tôi xử lý" count={workCounts.action} description="Các biên bản mà bạn hoặc bộ phận của bạn đang có nhiệm vụ hoặc quyền thực hiện bước tiếp theo." />} />
                        <Tab value="waiting" label={<WorkFilterTabLabel label="Đang chờ" count={workCounts.waiting} description="Các biên bản bạn được xem nhưng hiện đang chờ người hoặc bộ phận khác xử lý." />} />
                        <Tab value="done" label={<WorkFilterTabLabel label="Hoàn tất" count={workCounts.done} description="Các biên bản đã hoàn thành quy trình và chỉ còn phục vụ tra cứu hoặc in lại." />} />
                        <Tab value="all" label={<WorkFilterTabLabel label="Tất cả" count={data.length} description="Toàn bộ biên bản mà tài khoản của bạn có quyền xem, không phân biệt tiến độ xử lý." />} />
                    </Tabs>
                </Paper>

                {/* Danh sách desktop + card mobile */}
                <Card sx={{ borderRadius: 2.5, boxShadow: "0 4px 20px rgba(15,23,42,0.06)", overflow: "hidden" }}>
                    <TableContainer ref={tableContainerRef} sx={{ display: { xs: "none", md: "block" }, maxHeight: 'calc(100vh - 240px)' }}>
                        <Table
                            stickyHeader
                            size="small"
                            sx={{
                                tableLayout: "fixed",
                                "& .MuiTableCell-root": { px: 1.5, py: 1.25, verticalAlign: "middle" },
                                "& tbody tr": { transition: "background-color 0.15s ease" },
                                "& tbody tr:hover": { backgroundColor: "rgba(99,102,241,0.04)" }
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ width: "17%", fontWeight: 700, bgcolor: 'background.paper' }}>
                                        {renderFilterHeader({ field: "number", label: "Biên bản", value: filterSoPhieu, onChange: (value) => updateFilter(setFilterSoPhieu, "number", value), placeholder: "Nhập số biên bản" })}
                                    </TableCell>
                                    <TableCell sx={{ width: "22%", fontWeight: 700, bgcolor: 'background.paper' }}>
                                        {renderFilterHeader({ field: "product", label: "Đối tượng kiểm", value: filterProduct, onChange: (value) => updateFilter(setFilterProduct, "product", value), placeholder: "Nhập mã, tên, Lot hoặc đơn hàng" })}
                                    </TableCell>
                                    <TableCell sx={{ width: "30%", fontWeight: 700, bgcolor: 'background.paper' }}>Nội dung không phù hợp</TableCell>
                                    <TableCell sx={{ width: "15%", fontWeight: 700, bgcolor: 'background.paper' }}>
                                        {renderFilterHeader({ field: "creator", label: "Người lập", value: filterCreator, onChange: (value) => updateFilter(setFilterCreator, "creator", value), placeholder: "Nhập người lập hoặc bộ phận" })}
                                    </TableCell>
                                    <TableCell sx={{ width: "16%", fontWeight: 700, bgcolor: 'background.paper' }}>Tiến độ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                            <Typography color="text.secondary">Không tìm thấy biên bản nào phù hợp.</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedData.map((item) => {
                                    const pendingText = getPendingDepartmentsText(item);
                                    const bucket = getWorkBucket(item, currentUser, isManager, isSxbtBienBan(item));
                                    const myOpinionMeta = getMyDepartmentOpinionMeta(item.MyDepartmentOpinionStatus);
                                    return (
                                        <TableRow
                                            key={item.BienBanId}
                                            hover
                                            onClick={() => openDetail(item)}
                                            sx={{
                                                cursor: "pointer",
                                                ...(myOpinionMeta ? {
                                                    bgcolor: "rgba(245, 158, 11, 0.055)",
                                                    "& td:first-of-type": { borderLeft: "4px solid", borderLeftColor: "warning.main" }
                                                } : {})
                                            }}
                                        >
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ lineHeight: 1.3, overflowWrap: "anywhere" }}>
                                                    {item.SoPhieu}
                                                </Typography>
                                                <ListRecordTime item={item} />
                                                <Stack spacing={0.5} alignItems="flex-start" sx={{ mt: 0.65 }}>
                                                    <Chip label={getLoaiKiemLabel(item)} size="small" variant="outlined" sx={{ height: 21, fontSize: "0.7rem" }} />
                                                    {renderTrangThaiChip(item)}
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <ProductSummary item={item} />
                                            </TableCell>
                                            <TableCell>
                                                <NonconformitySummary item={item} />
                                            </TableCell>
                                            <TableCell>
                                                <CreatorSummary item={item} showProductionUnit={isSxbtBienBan(item)} />
                                            </TableCell>
                                            <TableCell onClick={(event) => event.stopPropagation()}>
                                                <Stack spacing={0.65} sx={{ minWidth: 0 }}>
                                                    {renderProgress(item)}
                                                    {myOpinionMeta && (
                                                        <Chip
                                                            icon={<ForumOutlinedIcon />}
                                                            label={myOpinionMeta.label}
                                                            color={myOpinionMeta.color}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ maxWidth: "100%", fontWeight: 700 }}
                                                        />
                                                    )}
                                                    {pendingText && (
                                                        <Tooltip title={pendingText}>
                                                            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: "100%", lineHeight: 1.3 }}>
                                                                {pendingText}
                                                            </Typography>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip title={getActionLabel(item)}>
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => openDetail(item)}
                                                            sx={{ alignSelf: "flex-end", ...(bucket === "action" ? { bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" } } : {}) }}
                                                        >
                                                            {bucket === "action" ? <ArrowForwardIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Stack spacing={1.25} sx={{ display: { xs: "flex", md: "none" }, p: 1.25, bgcolor: "grey.50" }}>
                        {paginatedData.length === 0 ? (
                            <Box sx={{ py: 6, textAlign: "center" }}>
                                <Typography color="text.secondary">Không tìm thấy biên bản nào phù hợp.</Typography>
                            </Box>
                        ) : paginatedData.map((item) => {
                            const pendingText = getPendingDepartmentsText(item);
                            const myOpinionMeta = getMyDepartmentOpinionMeta(item.MyDepartmentOpinionStatus);
                            return (
                                <Paper
                                    key={item.BienBanId}
                                    variant="outlined"
                                    onClick={() => openDetail(item)}
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        cursor: "pointer",
                                        bgcolor: myOpinionMeta ? "rgba(245, 158, 11, 0.055)" : "background.paper",
                                        borderLeft: myOpinionMeta ? "4px solid" : undefined,
                                        borderLeftColor: myOpinionMeta ? "warning.main" : undefined
                                    }}
                                >
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={800} color="primary.main">{item.SoPhieu}</Typography>
                                            <ListRecordTime item={item} />
                                        </Box>
                                        {renderTrangThaiChip(item)}
                                    </Stack>

                                    <Chip
                                        label={getLoaiKiemLabel(item)}
                                        size="small"
                                        variant="outlined"
                                        sx={{ mt: 1, alignSelf: "flex-start" }}
                                    />

                                    <Box sx={{ mt: 1.25 }}><ProductSummary item={item} /></Box>
                                    <Box sx={{ mt: 1.25, pt: 1.25, borderTop: 1, borderColor: "divider" }}>
                                        <NonconformitySummary item={item} />
                                    </Box>

                                    {myOpinionMeta && (
                                        <Chip
                                            icon={<ForumOutlinedIcon />}
                                            label={myOpinionMeta.label}
                                            color={myOpinionMeta.color}
                                            size="small"
                                            variant="outlined"
                                            sx={{ mt: 1, fontWeight: 700 }}
                                        />
                                    )}

                                    <Box sx={{ my: 1.25, pt: 1.25, borderTop: 1, borderColor: "divider" }}>
                                        <Typography variant="caption" color="text.secondary">Người lập</Typography>
                                        <CreatorSummary item={item} showProductionUnit={isSxbtBienBan(item)} />
                                    </Box>

                                    {renderProgress(item)}
                                    {pendingText && (
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                                            {pendingText}
                                        </Typography>
                                    )}
                                    <Button
                                        fullWidth
                                        size="small"
                                        variant={getWorkBucket(item, currentUser, isManager, isSxbtBienBan(item)) === "action" ? "contained" : "outlined"}
                                        endIcon={<ArrowForwardIcon />}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            openDetail(item);
                                        }}
                                        sx={{ mt: 1.25 }}
                                    >
                                        {getActionLabel(item)}
                                    </Button>
                                </Paper>
                            );
                        })}
                    </Stack>

                    <TablePagination
                        component="div"
                        count={filteredData.length}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Số dòng/trang:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} trên ${count}`}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                    />
                </Card>
            </Box>
        </Fade>
    );
}
