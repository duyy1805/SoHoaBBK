import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    alpha,
    Autocomplete,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    FormControl,
    Grid,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    useTheme
} from "@mui/material";
import {
    AssignmentTurnedInOutlined as CompletedIcon,
    ErrorOutline as ErrorIcon,
    FactCheckOutlined as TotalIcon,
    FilterAltOutlined as FilterIcon,
    PendingActionsOutlined as PendingIcon,
    Refresh as RefreshIcon,
    ReportProblemOutlined as KphIcon,
    TaskAltOutlined as PassIcon,
    TrendingDown,
    TrendingFlat,
    TrendingUp,
    WarningAmberOutlined as WarningIcon
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import { getDashboardOverview } from "../../api/dashboard.api";
import { hasPermission } from "../../utils/auth";

const toDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getPresetDates = (preset) => {
    const today = new Date();
    const from = new Date(today);
    if (preset === "7_DAYS") from.setDate(today.getDate() - 6);
    if (preset === "30_DAYS") from.setDate(today.getDate() - 29);
    if (preset === "THIS_MONTH") from.setDate(1);
    return { fromDate: toDateKey(from), toDate: toDateKey(today) };
};

const initialDates = getPresetDates("TODAY");
const initialFilters = {
    preset: "TODAY",
    ...initialDates,
    loaiKiemId: "",
    boPhanId: "",
    sanPhamId: "",
    result: ""
};

const emptyOverview = {
    stats: {
        totalInspections: { value: 0, trend: 0 },
        completedInspections: { value: 0, trend: 0 },
        pendingInspections: { value: 0, trend: 0 },
        passRate: { value: 0, trend: 0 },
        failedInspections: { value: 0, trend: 0 },
        openKph: { value: 0, trend: 0 }
    },
    qualityTrend: [],
    actionRequired: {},
    defectStats: { summary: {}, byType: [], topDefects: [], byInspectionType: [] },
    hotspots: { products: [], departments: [], processes: [] },
    attentionItems: [],
    filterOptions: { inspectionTypes: [], departments: [], products: [] }
};

const formatNumber = (value) => Number(value || 0).toLocaleString("vi-VN");
const formatDateTime = (value) => value
    ? new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
    : "--";

const getStatus = (status) => {
    const statuses = {
        TAO_MOI: ["Chưa kiểm", "default"],
        CHUA_KIEM: ["Chưa kiểm", "default"],
        DA_TAO_SECTION: ["Chưa kiểm", "default"],
        DANG_KIEM: ["Đang kiểm", "warning"],
        CHO_TBP_DUYET: ["Chờ BP xác nhận", "info"],
        CHO_XUONG_XAC_NHAN: ["Chờ BP xác nhận", "info"],
        CHO_KIEM_NGHIEM: ["Chờ BP xác nhận", "info"],
        CHO_SXBT_XAC_NHAN: ["Chờ SXBT xác nhận", "info"],
        CHO_KHO_XAC_NHAN: ["Chờ Kho xác nhận", "secondary"],
        HOAN_TAT: ["Hoàn tất", "success"],
        HOAN_THANH: ["Hoàn tất", "success"]
    };
    const [label, color] = statuses[status] || [status || "Chưa xác định", "default"];
    return { label, color };
};

const getInspectionPath = (row) => {
    if (Number(row.LoaiKiemId) === 3) return `/phieu-kiem/cuoi-chuyen/${row.Id}`;
    if (Number(row.LoaiKiemId) === 4) return `/phieu-kiem/sxbt/${row.Id}`;
    if (Number(row.LoaiKiemId) === 6) {
        return String(row.SoPhieu || "").startsWith("CD-")
            ? `/phieu-kiem/cong-doan/${row.Id}`
            : `/phieu-kiem/tren-chuyen/${row.Id}`;
    }
    return `/phieu-kiem/${row.Id}`;
};

const getTypeLabel = (type) => ({
    CRITICAL: "Nghiêm trọng",
    MAJOR: "Nặng",
    MINOR: "Nhẹ",
    UNKNOWN: "Khác"
}[type] || type || "Khác");
const SEVERITY_COLORS = { CRITICAL: "#dc2626", MAJOR: "#f59e0b", MINOR: "#22c55e", UNKNOWN: "#94a3b8" };

function KpiCard({ label, value, trend, color, icon, suffix = "", inverse = false }) {
    const numericTrend = Number(trend || 0);
    const improved = inverse ? numericTrend <= 0 : numericTrend >= 0;
    const TrendIcon = numericTrend > 0 ? TrendingUp : numericTrend < 0 ? TrendingDown : TrendingFlat;
    return (
        <Card variant="outlined" sx={{ height: "100%", borderColor: "divider" }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
                        <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>{value}{suffix}</Typography>
                    </Box>
                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(color, 0.1), color, display: "flex" }}>
                        <Box component={icon} sx={{ fontSize: 20 }} />
                    </Box>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1 }}>
                    <TrendIcon sx={{ fontSize: 15, color: numericTrend === 0 ? "text.disabled" : improved ? "success.main" : "error.main" }} />
                    <Typography variant="caption" color="text.secondary">
                        {numericTrend > 0 ? "+" : ""}{numericTrend}% so với kỳ trước
                    </Typography>
                </Stack>
            </CardContent>
        </Card>
    );
}

function Panel({ title, subtitle, action, children, sx }) {
    return (
        <Paper variant="outlined" sx={{ p: 2.25, height: "100%", ...sx }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
                    {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
                </Box>
                {action}
            </Stack>
            {children}
        </Paper>
    );
}

function TrendChart({ data }) {
    const width = 720;
    const height = 210;
    const pad = 26;
    const points = data.map((row, index) => {
        const x = data.length <= 1 ? width / 2 : pad + (index * (width - pad * 2)) / (data.length - 1);
        const y = height - pad - (Math.max(0, Math.min(100, Number(row.PassRate || 0))) * (height - pad * 2)) / 100;
        return { ...row, x, y };
    });
    const line = points.map((point) => `${point.x},${point.y}`).join(" ");

    if (!data.length) return <EmptyState text="Không có dữ liệu xu hướng trong khoảng đã chọn" />;
    return (
        <Box sx={{ width: "100%", overflow: "hidden" }}>
            <Box component="svg" viewBox={`0 0 ${width} ${height}`} sx={{ display: "block", width: "100%", height: 230 }}>
                {[0, 25, 50, 75, 100].map((value) => {
                    const y = height - pad - (value * (height - pad * 2)) / 100;
                    return <line key={value} x1={pad} y1={y} x2={width - pad} y2={y} stroke="#e7eaf0" strokeWidth="1" />;
                })}
                {points.length > 1 && <polyline points={line} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
                {points.map((point) => (
                    <g key={point.DateKey}>
                        <Tooltip title={`${new Date(`${point.DateKey}T00:00:00`).toLocaleDateString("vi-VN")}: ${point.PassRate}% đạt`}>
                            <circle cx={point.x} cy={point.y} r="5" fill="#fff" stroke="#2563eb" strokeWidth="3" />
                        </Tooltip>
                    </g>
                ))}
            </Box>
            <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">{new Date(`${data[0].DateKey}T00:00:00`).toLocaleDateString("vi-VN")}</Typography>
                <Typography variant="caption" color="text.secondary">Tỷ lệ đạt (%)</Typography>
                <Typography variant="caption" color="text.secondary">{new Date(`${data[data.length - 1].DateKey}T00:00:00`).toLocaleDateString("vi-VN")}</Typography>
            </Stack>
        </Box>
    );
}

function EmptyState({ text }) {
    return <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}><Typography variant="body2">{text}</Typography></Box>;
}

export default function Dashboard() {
    const theme = useTheme();
    const navigate = useNavigate();
    const canViewInspections = hasPermission("XEM_PHIEU_KIEM");
    const [filters, setFilters] = useState(initialFilters);
    const [appliedFilters, setAppliedFilters] = useState(initialFilters);
    const [overview, setOverview] = useState(emptyOverview);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [hotspotMode, setHotspotMode] = useState("products");

    const loadData = useCallback(async (nextFilters, initial = false) => {
        try {
            if (initial) setLoading(true); else setRefreshing(true);
            const { preset: _preset, ...params } = nextFilters;
            void _preset;
            const response = await getDashboardOverview(params);
            setOverview((current) => ({
                ...emptyOverview,
                ...response.data,
                stats: { ...emptyOverview.stats, ...(response.data?.stats || {}) },
                filterOptions: response.data?.filterOptions || current.filterOptions || emptyOverview.filterOptions
            }));
            setError("");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Không thể tải dữ liệu Dashboard");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData(initialFilters, true);
    }, [loadData]);

    const setFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value }));
    const changePreset = (preset) => {
        const dates = getPresetDates(preset);
        setFilters((current) => ({ ...current, preset, ...dates }));
    };
    const applyFilters = () => {
        setAppliedFilters(filters);
        loadData(filters);
    };
    const resetFilters = () => {
        setFilters(initialFilters);
        setAppliedFilters(initialFilters);
        loadData(initialFilters);
    };

    const kpis = [
        ["Tổng phiếu kiểm", overview.stats.totalInspections, TotalIcon, theme.palette.primary.main, false, ""],
        ["Hoàn thành", overview.stats.completedInspections, CompletedIcon, theme.palette.success.main, false, ""],
        ["Chờ xử lý", overview.stats.pendingInspections, PendingIcon, theme.palette.warning.main, true, ""],
        ["Tỷ lệ đạt", overview.stats.passRate, PassIcon, theme.palette.success.dark, false, "%"],
        ["Không đạt", overview.stats.failedInspections, ErrorIcon, theme.palette.error.main, true, ""],
        ["KPH mở", overview.stats.openKph, KphIcon, theme.palette.error.dark, true, ""]
    ];

    const actionItems = [
        ["Phiếu không đạt", overview.actionRequired.FailedCount, "error.main", "FAILED"],
        ["Chờ bộ phận xác nhận", overview.actionRequired.AwaitingDepartmentCount, "warning.main", "PENDING"],
        ["Chờ Kho/SXBT xác nhận", overview.actionRequired.AwaitingWarehouseCount, "info.main", "PENDING"],
        ["KPH quá hạn", overview.actionRequired.OverdueKphCount, "error.dark", ""]
    ];

    const defectTotal = overview.defectStats.byType.reduce((sum, row) => sum + Number(row.Quantity || 0), 0);
    const donut = useMemo(() => {
        let position = 0;
        const segments = overview.defectStats.byType.map((row) => {
            const percent = defectTotal ? (Number(row.Quantity || 0) / defectTotal) * 100 : 0;
            const segment = `${SEVERITY_COLORS[row.DefectType] || SEVERITY_COLORS.UNKNOWN} ${position}% ${position + percent}%`;
            position += percent;
            return segment;
        });
        return segments.length ? `conic-gradient(${segments.join(",")})` : "#e5e7eb";
    }, [defectTotal, overview.defectStats.byType]);

    const hotspotRows = overview.hotspots[hotspotMode] || [];
    const maxHotspotDefects = Math.max(...hotspotRows.map((row) => Number(row.DefectQuantity || 0)), 1);
    const maxDefects = Math.max(...overview.defectStats.topDefects.map((row) => Number(row.Quantity || 0)), 1);
    const activeFilterCount = [appliedFilters.loaiKiemId, appliedFilters.boPhanId, appliedFilters.sanPhamId, appliedFilters.result].filter(Boolean).length;

    if (loading) {
        return <Box sx={{ minHeight: "60vh", display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ pb: 4 }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2} sx={{ mb: 2.5 }}>
                <Box>
                    <Typography variant="h5" fontWeight={850}>Dashboard chất lượng</Typography>
                    <Typography variant="body2" color="text.secondary">Tổng quan hoạt động kiểm tra chất lượng và các điểm cần xử lý</Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                    {activeFilterCount > 0 && <Chip size="small" color="primary" label={`${activeFilterCount} bộ lọc`} />}
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadData(appliedFilters)} disabled={refreshing}>Làm mới</Button>
                </Stack>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper variant="outlined" sx={{ p: 2, mb: 2.5 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    <FilterIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={800}>Bộ lọc dữ liệu</Typography>
                </Stack>
                <Grid container spacing={1.5} alignItems="center">
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <FormControl fullWidth size="small"><InputLabel>Thời gian</InputLabel><Select value={filters.preset} label="Thời gian" onChange={(event) => changePreset(event.target.value)}>
                            <MenuItem value="TODAY">Hôm nay</MenuItem><MenuItem value="7_DAYS">7 ngày gần nhất</MenuItem><MenuItem value="30_DAYS">30 ngày gần nhất</MenuItem><MenuItem value="THIS_MONTH">Tháng này</MenuItem><MenuItem value="CUSTOM">Tùy chọn</MenuItem>
                        </Select></FormControl>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3, md: 1.7 }}><TextField fullWidth size="small" type="date" label="Từ ngày" value={filters.fromDate} onChange={(event) => setFilters((current) => ({ ...current, preset: "CUSTOM", fromDate: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
                    <Grid size={{ xs: 6, sm: 3, md: 1.7 }}><TextField fullWidth size="small" type="date" label="Đến ngày" value={filters.toDate} onChange={(event) => setFilters((current) => ({ ...current, preset: "CUSTOM", toDate: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.1 }}><FormControl fullWidth size="small"><InputLabel>Loại kiểm</InputLabel><Select value={filters.loaiKiemId} label="Loại kiểm" onChange={(event) => setFilter("loaiKiemId", event.target.value)}><MenuItem value="">Tất cả loại kiểm</MenuItem>{overview.filterOptions.inspectionTypes.map((item) => <MenuItem key={item.Id} value={item.Id}>{item.TenLoai}</MenuItem>)}</Select></FormControl></Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.1 }}><FormControl fullWidth size="small"><InputLabel>Bộ phận</InputLabel><Select value={filters.boPhanId} label="Bộ phận" onChange={(event) => setFilter("boPhanId", event.target.value)}><MenuItem value="">Tất cả bộ phận</MenuItem>{overview.filterOptions.departments.map((item) => <MenuItem key={item.Id} value={item.Id}>{item.TenBoPhan}</MenuItem>)}</Select></FormControl></Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.1 }}><Autocomplete size="small" options={overview.filterOptions.products} value={overview.filterOptions.products.find((item) => Number(item.Id) === Number(filters.sanPhamId)) || null} onChange={(_, value) => setFilter("sanPhamId", value?.Id || "")} getOptionLabel={(item) => `${item.MaSanPham || "--"} - ${item.TenSanPham || ""}`} isOptionEqualToValue={(option, value) => Number(option.Id) === Number(value.Id)} renderInput={(params) => <TextField {...params} label="Sản phẩm" placeholder="Tất cả sản phẩm" />} /></Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}><FormControl fullWidth size="small"><InputLabel>Kết quả</InputLabel><Select value={filters.result} label="Kết quả" onChange={(event) => setFilter("result", event.target.value)}><MenuItem value="">Tất cả trạng thái</MenuItem><MenuItem value="PENDING">Chờ xử lý</MenuItem><MenuItem value="COMPLETED">Hoàn thành</MenuItem><MenuItem value="PASSED">Đạt</MenuItem><MenuItem value="FAILED">Không đạt</MenuItem></Select></FormControl></Grid>
                    <Grid size={{ xs: 12, md: 10 }}><Stack direction="row" spacing={1}><Button variant="contained" startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <FilterIcon />} onClick={applyFilters} disabled={refreshing || !filters.fromDate || !filters.toDate}>Áp dụng</Button><Button color="inherit" onClick={resetFilters}>Đặt lại</Button></Stack></Grid>
                </Grid>
            </Paper>

            <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                {kpis.map(([label, metric, Icon, color, inverse, suffix]) => <Grid key={label} size={{ xs: 6, sm: 4, lg: 2 }}><KpiCard label={label} value={formatNumber(metric.value)} trend={metric.trend} color={color} icon={Icon} inverse={inverse} suffix={suffix} /></Grid>)}
            </Grid>

            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, lg: 8 }}><Panel title="Xu hướng chất lượng" subtitle="Tỷ lệ phiếu đạt theo ngày"><TrendChart data={overview.qualityTrend} /></Panel></Grid>
                <Grid size={{ xs: 12, lg: 4 }}><Panel title="Cần xử lý" subtitle="Các đầu việc cần được ưu tiên" action={<WarningIcon color="warning" />}>
                    <Stack spacing={0.75}>{actionItems.map(([label, count, color, result]) => <Box key={label} onClick={() => result && navigate(`/phieu-kiem?result=${result}`)} sx={{ px: 1.5, py: 1.25, borderRadius: 1.5, bgcolor: "action.hover", cursor: result ? "pointer" : "default", display: "flex", justifyContent: "space-between", alignItems: "center" }}><Stack direction="row" alignItems="center" spacing={1}><Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} /><Typography variant="body2">{label}</Typography></Stack><Typography fontWeight={800}>{formatNumber(count)}</Typography></Box>)}</Stack>
                </Panel></Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, lg: 7 }}><Panel title="Pareto top lỗi" subtitle="Các lỗi có số lượng ghi nhận cao nhất">
                    {overview.defectStats.topDefects.length ? <Stack spacing={1.4}>{overview.defectStats.topDefects.map((row, index) => <Box key={`${row.DefectId}-${row.DefectType}`}><Stack direction="row" justifyContent="space-between" spacing={2}><Typography variant="body2" noWrap>{index + 1}. {row.TenLoi}</Typography><Typography variant="body2" fontWeight={800}>{formatNumber(row.Quantity)}</Typography></Stack><LinearProgress variant="determinate" value={(Number(row.Quantity || 0) / maxDefects) * 100} sx={{ mt: 0.6, height: 7, borderRadius: 8, bgcolor: alpha(theme.palette.primary.main, 0.08) }} /></Box>)}</Stack> : <EmptyState text="Chưa ghi nhận lỗi" />}
                </Panel></Grid>
                <Grid size={{ xs: 12, lg: 5 }}><Panel title="Phân loại lỗi" subtitle={`Tổng ${formatNumber(defectTotal)} lỗi`}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems="center" justifyContent="center">
                        <Box sx={{ width: 160, height: 160, borderRadius: "50%", background: donut, position: "relative", flexShrink: 0, "&::after": { content: '""', position: "absolute", inset: 34, borderRadius: "50%", bgcolor: "background.paper" } }}><Box sx={{ position: "absolute", inset: 0, zIndex: 1, display: "grid", placeItems: "center", textAlign: "center" }}><Box><Typography variant="h6" fontWeight={850}>{formatNumber(defectTotal)}</Typography><Typography variant="caption" color="text.secondary">tổng lỗi</Typography></Box></Box></Box>
                        <Stack spacing={1.2} sx={{ minWidth: 180 }}>{overview.defectStats.byType.map((row) => { const percent = defectTotal ? Math.round((Number(row.Quantity || 0) / defectTotal) * 1000) / 10 : 0; return <Stack key={row.DefectType} direction="row" justifyContent="space-between" spacing={3}><Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: SEVERITY_COLORS[row.DefectType] || SEVERITY_COLORS.UNKNOWN }} /><Typography variant="body2">{getTypeLabel(row.DefectType)}</Typography></Stack><Typography variant="body2" fontWeight={800}>{percent}%</Typography></Stack>; })}</Stack>
                    </Stack>
                </Panel></Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, lg: 7 }}><Panel title="Điểm nóng chất lượng" action={<ToggleButtonGroup size="small" exclusive value={hotspotMode} onChange={(_, value) => value && setHotspotMode(value)}><ToggleButton value="products">Sản phẩm</ToggleButton><ToggleButton value="departments">Bộ phận</ToggleButton><ToggleButton value="processes">Công đoạn</ToggleButton></ToggleButtonGroup>}>
                    {hotspotRows.length ? <Stack spacing={1.25}>{hotspotRows.map((row, index) => { const completed = Number(row.CompletedCount || 0); const rate = completed ? Math.round((Number(row.PassedCount || 0) / completed) * 1000) / 10 : null; return <Box key={`${row.ItemId || "x"}-${row.ItemName}-${index}`}><Stack direction="row" justifyContent="space-between" spacing={2}><Typography variant="body2" noWrap>{row.ItemName}</Typography><Stack direction="row" spacing={1}><Typography variant="caption" color="error.main" fontWeight={700}>{formatNumber(row.DefectQuantity)} lỗi</Typography>{rate !== null && <Typography variant="caption" color="text.secondary">• {rate}% đạt</Typography>}</Stack></Stack><LinearProgress color={Number(row.DefectQuantity || 0) > 0 ? "error" : "success"} variant="determinate" value={(Number(row.DefectQuantity || 0) / maxHotspotDefects) * 100} sx={{ mt: 0.55, height: 6, borderRadius: 4 }} /></Box>; })}</Stack> : <EmptyState text="Chưa có điểm nóng trong khoảng đã chọn" />}
                </Panel></Grid>
                <Grid size={{ xs: 12, lg: 5 }}><Panel title="Theo loại kiểm" subtitle="Tỷ lệ đạt trên các phiếu đã hoàn thành">
                    {overview.defectStats.byInspectionType.length ? <Stack spacing={1.6}>{overview.defectStats.byInspectionType.map((row) => <Box key={row.LoaiKiemId}><Stack direction="row" justifyContent="space-between"><Typography variant="body2">{row.TenLoai}</Typography><Typography variant="body2" fontWeight={800}>{row.PassRate}%</Typography></Stack><LinearProgress color={Number(row.PassRate) >= 95 ? "success" : Number(row.PassRate) >= 80 ? "warning" : "error"} variant="determinate" value={Number(row.PassRate || 0)} sx={{ mt: 0.7, height: 7, borderRadius: 6 }} /></Box>)}</Stack> : <EmptyState text="Chưa có phiếu hoàn thành" />}
                </Panel></Grid>
            </Grid>

            <Panel title="Phiếu / sự cố cần chú ý" subtitle="Ưu tiên phiếu không đạt, có lỗi hoặc đang chờ xử lý">
                <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Mã phiếu</TableCell><TableCell>Sản phẩm</TableCell><TableCell>Loại kiểm</TableCell><TableCell>Trạng thái</TableCell><TableCell align="right">Lỗi</TableCell><TableCell>Người phụ trách</TableCell><TableCell>Thời gian</TableCell></TableRow></TableHead><TableBody>
                    {overview.attentionItems.length ? overview.attentionItems.map((row) => { const status = getStatus(row.TrangThai); return <TableRow key={row.Id} hover onClick={() => canViewInspections && navigate(getInspectionPath(row))} sx={{ cursor: canViewInspections ? "pointer" : "default" }}><TableCell><Typography variant="body2" color="primary.main" fontWeight={800}>{row.SoPhieu}</Typography></TableCell><TableCell>{row.TenSanPham}</TableCell><TableCell>{row.TenLoai}</TableCell><TableCell><Chip size="small" variant="outlined" label={status.label} color={status.color} /></TableCell><TableCell align="right"><Chip size="small" label={formatNumber(row.DefectQuantity)} color={Number(row.DefectQuantity) > 0 ? "error" : "default"} variant={Number(row.DefectQuantity) > 0 ? "filled" : "outlined"} /></TableCell><TableCell>{row.NguoiPhuTrach}</TableCell><TableCell>{formatDateTime(row.NgayDuLieu)}</TableCell></TableRow>; }) : <TableRow><TableCell colSpan={7}><EmptyState text="Không có phiếu cần chú ý" /></TableCell></TableRow>}
                </TableBody></Table></TableContainer>
            </Panel>
        </Box>
    );
}
