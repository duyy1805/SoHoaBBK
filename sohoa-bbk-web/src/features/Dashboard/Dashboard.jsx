import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    alpha,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    useTheme
} from "@mui/material";
import {
    Add as AddIcon,
    ArrowForward as ArrowForwardIcon,
    Assignment as AssignmentIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    ListAlt as ListAltIcon,
    PendingActions as PendingIcon,
    Refresh as RefreshIcon,
    Remove as RemoveIcon,
    Settings as SettingsIcon,
    TrendingDown as TrendingDownIcon,
    TrendingUp as TrendingUpIcon
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import PageHeader from "../../components/common/PageHeader";
import { getDashboardOverview } from "../../api/dashboard.api";
import { getCurrentUser, hasPermission } from "../../utils/auth";

const emptyOverview = {
    stats: {
        totalInspections: { value: 0, trend: 0 },
        pendingInspections: { value: 0, trend: 0 },
        passRate: { value: 0, trend: 0 },
        defectReports: { value: 0, trend: 0 }
    },
    recentInspections: [],
    weeklyCompleted: [],
    defectStats: {
        summary: {
            totalQuantity: 0,
            totalOccurrences: 0,
            affectedInspections: 0
        },
        byType: [],
        byInspectionType: [],
        topDefects: []
    }
};

const formatNumber = (value) => Number(value || 0).toLocaleString("vi-VN");

const formatDate = (value) => {
    if (!value) return "--";
    return new Date(value).toLocaleDateString("vi-VN");
};

const formatDayLabel = (dateKey) => {
    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateKey;
    const day = date.getDay();
    return day === 0 ? "CN" : `T${day + 1}`;
};

const getInspectionPath = (inspection) =>
    Number(inspection.LoaiKiemId) === 4
        ? `/phieu-kiem/sxbt/${inspection.Id}`
        : `/phieu-kiem/${inspection.Id}`;

const getStatusProps = (status) => {
    switch (status) {
        case "TAO_MOI":
        case "DA_TAO_SECTION":
            return { label: "Chưa kiểm", color: "default" };
        case "DANG_KIEM":
            return { label: "Đang kiểm", color: "warning" };
        case "CHO_XUONG_XAC_NHAN":
            return { label: "Chờ PX xác nhận", color: "info" };
        case "CHO_KIEM_NGHIEM":
            return { label: "Chờ kiểm nghiệm", color: "secondary" };
        case "HOAN_TAT":
            return { label: "Hoàn tất", color: "success" };
        default:
            return { label: status || "Chưa xác định", color: "default" };
    }
};

const getResultProps = (result) => {
    if (result === "DAT") return { label: "Đạt", color: "success" };
    if (result === "KHONG_DAT") return { label: "Không đạt", color: "error" };
    return null;
};

const getDefectTypeProps = (type) => {
    switch (type) {
        case "CRITICAL":
            return { label: "Critical", color: "error" };
        case "MAJOR":
            return { label: "Major", color: "warning" };
        case "MINOR":
            return { label: "Minor", color: "info" };
        default:
            return { label: type || "Khác", color: "default" };
    }
};

const StatCard = ({ title, value, icon, color, trend, trendUnit = "%", lowerIsBetter = false }) => {
    const numericTrend = Number(trend || 0);
    const TrendIcon = numericTrend > 0
        ? TrendingUpIcon
        : numericTrend < 0
            ? TrendingDownIcon
            : RemoveIcon;
    const improved = lowerIsBetter ? numericTrend <= 0 : numericTrend >= 0;
    const trendColor = numericTrend === 0
        ? "text.secondary"
        : improved
            ? "success.main"
            : "error.main";
    const trendLabel = `${numericTrend > 0 ? "+" : ""}${numericTrend}${trendUnit}`;

    return (
        <Card sx={{ height: "100%" }}>
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography color="text.secondary" variant="subtitle2" gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="h4" fontWeight={700}>
                            {value}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1 }}>
                            <TrendIcon sx={{ color: trendColor, fontSize: 16 }} />
                            <Typography variant="caption" color={trendColor} fontWeight={600}>
                                {trendLabel}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                vs tháng trước
                            </Typography>
                        </Stack>
                    </Box>
                    <Box
                        sx={{
                            backgroundColor: alpha(color, 0.1),
                            color,
                            p: 1.5,
                            borderRadius: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <Box component={icon} />
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default function Dashboard() {
    const theme = useTheme();
    const navigate = useNavigate();
    const [user] = useState(() => getCurrentUser());
    const [overview, setOverview] = useState(emptyOverview);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const canViewInspections = hasPermission("XEM_PHIEU_KIEM");

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getDashboardOverview();
            setOverview({
                ...emptyOverview,
                ...(res.data || {}),
                stats: {
                    ...emptyOverview.stats,
                    ...(res.data?.stats || {})
                },
                defectStats: {
                    ...emptyOverview.defectStats,
                    ...(res.data?.defectStats || {}),
                    summary: {
                        ...emptyOverview.defectStats.summary,
                        ...(res.data?.defectStats?.summary || {})
                    }
                }
            });
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Không thể tải dữ liệu Dashboard");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const stats = [
        {
            title: "Tổng phiếu kiểm",
            value: formatNumber(overview.stats.totalInspections.value),
            icon: AssignmentIcon,
            color: theme.palette.primary.main,
            trend: overview.stats.totalInspections.trend
        },
        {
            title: "Đang chờ xử lý",
            value: formatNumber(overview.stats.pendingInspections.value),
            icon: PendingIcon,
            color: theme.palette.warning.main,
            trend: overview.stats.pendingInspections.trend,
            lowerIsBetter: true
        },
        {
            title: "Tỉ lệ đạt",
            value: `${formatNumber(overview.stats.passRate.value)}%`,
            icon: CheckCircleIcon,
            color: theme.palette.success.main,
            trend: overview.stats.passRate.trend,
            trendUnit: " điểm %"
        },
        {
            title: "Biên bản lỗi",
            value: formatNumber(overview.stats.defectReports.value),
            icon: ErrorIcon,
            color: theme.palette.error.main,
            trend: overview.stats.defectReports.trend,
            lowerIsBetter: true
        }
    ];

    const quickActions = [
        {
            label: "Tạo phiếu kiểm",
            icon: AddIcon,
            path: "/phieu-kiem/create",
            color: "primary",
            visible: hasPermission("PHAN_BO_KIEM")
        },
        {
            label: "Xem danh sách",
            icon: ListAltIcon,
            path: "/phieu-kiem",
            color: "secondary",
            visible: hasPermission("XEM_PHIEU_KIEM")
        },
        {
            label: "Báo cáo lỗi",
            icon: ErrorIcon,
            path: "/bien-ban",
            color: "error",
            visible: true
        },
        {
            label: "Cấu hình",
            icon: SettingsIcon,
            path: "/danh-muc",
            color: "warning",
            visible: hasPermission("QUAN_TRI_DM")
        }
    ].filter((action) => action.visible);

    const weeklyMax = useMemo(
        () => Math.max(...overview.weeklyCompleted.map((item) => Number(item.CompletedCount) || 0), 1),
        [overview.weeklyCompleted]
    );

    const defectTypeTotal = useMemo(
        () => Math.max(...overview.defectStats.byType.map((item) => Number(item.Quantity) || 0), 1),
        [overview.defectStats.byType]
    );

    if (loading) {
        return (
            <Box sx={{ minHeight: "55vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <PageHeader
                title={user ? `Chào ${user.fullName || user.username}` : "Bảng điều khiển"}
                subtitle={user
                    ? `Bạn thuộc bộ phận ${user.tenBoPhan || "Chưa xác định"}. Dữ liệu tổng hợp theo tháng hiện tại.`
                    : "Tổng quan hệ thống Quản lý Chất lượng (KCS)"}
            />

            {error && (
                <Alert
                    severity="error"
                    action={
                        <Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={loadData}>
                            Tải lại
                        </Button>
                    }
                    sx={{ mb: 3 }}
                >
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {stats.map((stat) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.title}>
                        <StatCard {...stat} />
                    </Grid>
                ))}

                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ overflow: "hidden" }}>
                        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography variant="h6">Kiểm tra gần đây</Typography>
                            {canViewInspections && (
                                <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate("/phieu-kiem")}>
                                    Xem tất cả
                                </Button>
                            )}
                        </Box>
                        <Divider />
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Mã phiếu</TableCell>
                                        <TableCell>Sản phẩm</TableCell>
                                        <TableCell>Ngày tạo</TableCell>
                                        <TableCell>Trạng thái</TableCell>
                                        <TableCell align="right">Kết quả</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {overview.recentInspections.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                                                <Typography color="text.secondary">Chưa có phiếu kiểm.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : overview.recentInspections.map((row) => {
                                        const status = getStatusProps(row.TrangThai);
                                        const result = getResultProps(row.KetLuan);

                                        return (
                                            <TableRow
                                                key={row.Id}
                                                hover
                                                sx={{ cursor: canViewInspections ? "pointer" : "default" }}
                                                onClick={() => {
                                                    if (canViewInspections) navigate(getInspectionPath(row));
                                                }}
                                            >
                                                <TableCell sx={{ fontWeight: 600, color: "primary.main" }}>
                                                    {row.SoPhieu || "--"}
                                                </TableCell>
                                                <TableCell>{row.TenSanPham || "--"}</TableCell>
                                                <TableCell>{formatDate(row.CreatedAt)}</TableCell>
                                                <TableCell>
                                                    <Chip label={status.label} size="small" color={status.color} variant="outlined" />
                                                </TableCell>
                                                <TableCell align="right">
                                                    {result ? (
                                                        <Chip label={result.label} size="small" color={result.color} />
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary">--</Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    <Paper sx={{ mt: 3, p: 3 }}>
                        <Typography variant="h6">Phiếu hoàn tất trong 7 ngày gần nhất</Typography>
                        <Box
                            sx={{
                                height: 220,
                                display: "flex",
                                alignItems: "flex-end",
                                justifyContent: "space-around",
                                gap: 1.5,
                                pt: 3
                            }}
                        >
                            {overview.weeklyCompleted.map((item) => {
                                const count = Number(item.CompletedCount) || 0;
                                const height = count > 0 ? Math.max((count / weeklyMax) * 100, 8) : 2;

                                return (
                                    <Box key={item.DateKey} sx={{ textAlign: "center", width: "12%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                                        <Typography variant="caption" fontWeight={700} sx={{ mb: 0.75 }}>
                                            {count}
                                        </Typography>
                                        <Box
                                            title={`${item.DateKey}: ${count} phiếu hoàn tất`}
                                            sx={{
                                                height: `${height}%`,
                                                bgcolor: count > 0 ? alpha(theme.palette.primary.main, 0.78) : "divider",
                                                borderRadius: "4px 4px 0 0",
                                                transition: "height 0.3s ease",
                                                "&:hover": { bgcolor: theme.palette.primary.main }
                                            }}
                                        />
                                        <Typography variant="caption" sx={{ mt: 1 }}>
                                            {formatDayLabel(item.DateKey)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {item.DateKey?.slice(5)}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Paper>

                    <Paper sx={{ mt: 3, overflow: "hidden" }}>
                        <Box sx={{ p: 2 }}>
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                justifyContent="space-between"
                                alignItems={{ xs: "flex-start", sm: "center" }}
                                spacing={1}
                            >
                                <Box>
                                    <Typography variant="h6">Lỗi xuất hiện toàn thời gian</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Tổng hợp toàn bộ lỗi đã ghi nhận từ các phiếu kiểm.
                                    </Typography>
                                </Box>
                                <Chip
                                    icon={<ErrorIcon />}
                                    label={`${formatNumber(overview.defectStats.summary.totalQuantity)} lỗi`}
                                    color="error"
                                    variant="outlined"
                                    sx={{ fontWeight: 700 }}
                                />
                            </Stack>

                            <Grid container spacing={1.5} sx={{ mt: 2 }}>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Card variant="outlined" sx={{ bgcolor: alpha(theme.palette.error.main, 0.04) }}>
                                        <CardContent sx={{ py: 1.75, "&:last-child": { pb: 1.75 } }}>
                                            <Typography variant="caption" color="text.secondary">Tổng số lượng lỗi</Typography>
                                            <Typography variant="h5" fontWeight={800}>
                                                {formatNumber(overview.defectStats.summary.totalQuantity)}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Card variant="outlined">
                                        <CardContent sx={{ py: 1.75, "&:last-child": { pb: 1.75 } }}>
                                            <Typography variant="caption" color="text.secondary">Lượt ghi nhận</Typography>
                                            <Typography variant="h5" fontWeight={800}>
                                                {formatNumber(overview.defectStats.summary.totalOccurrences)}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Card variant="outlined">
                                        <CardContent sx={{ py: 1.75, "&:last-child": { pb: 1.75 } }}>
                                            <Typography variant="caption" color="text.secondary">Phiếu có lỗi</Typography>
                                            <Typography variant="h5" fontWeight={800}>
                                                {formatNumber(overview.defectStats.summary.affectedInspections)}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            <Stack spacing={1.25} sx={{ mt: 2 }}>
                                {overview.defectStats.byType.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">
                                        Chưa có lỗi được ghi nhận trong tháng.
                                    </Typography>
                                ) : overview.defectStats.byType.map((item) => {
                                    const quantity = Number(item.Quantity) || 0;
                                    const pct = Math.max((quantity / defectTypeTotal) * 100, quantity > 0 ? 8 : 0);
                                    const typeProps = getDefectTypeProps(item.DefectType);

                                    return (
                                        <Box key={item.DefectType || "UNKNOWN"}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                                <Chip label={typeProps.label} size="small" color={typeProps.color} variant="outlined" />
                                                <Typography variant="body2" fontWeight={700}>
                                                    {formatNumber(quantity)} lỗi / {formatNumber(item.Occurrences)} lượt
                                                </Typography>
                                            </Stack>
                                            <Box sx={{ height: 8, borderRadius: 999, bgcolor: "divider", overflow: "hidden" }}>
                                                <Box
                                                    sx={{
                                                        width: `${pct}%`,
                                                        height: "100%",
                                                        bgcolor: `${typeProps.color}.main`
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Stack>

                            <Box sx={{ mt: 3 }}>
                                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                                    Theo loại kiểm
                                </Typography>
                                <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: "none" }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Loại kiểm</TableCell>
                                                <TableCell align="right">Số lượng</TableCell>
                                                <TableCell align="right">Lượt</TableCell>
                                                <TableCell align="right">Phiếu</TableCell>
                                                <TableCell align="right">C/M/m</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {overview.defectStats.byInspectionType.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Chưa có lỗi theo loại kiểm.
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ) : overview.defectStats.byInspectionType.map((item) => (
                                                <TableRow key={item.LoaiKiemId || item.TenLoai} hover>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={700}>
                                                            {item.TenLoai || "Chưa xác định"}
                                                        </Typography>
                                                        {item.MaLoai && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                {item.MaLoai}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                        {formatNumber(item.Quantity)}
                                                    </TableCell>
                                                    <TableCell align="right">{formatNumber(item.Occurrences)}</TableCell>
                                                    <TableCell align="right">{formatNumber(item.AffectedInspections)}</TableCell>
                                                    <TableCell align="right">
                                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap">
                                                            <Chip size="small" color="error" variant="outlined" label={formatNumber(item.CriticalQuantity)} />
                                                            <Chip size="small" color="warning" variant="outlined" label={formatNumber(item.MajorQuantity)} />
                                                            <Chip size="small" color="info" variant="outlined" label={formatNumber(item.MinorQuantity)} />
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </Box>

                        <Divider />
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Top lỗi</TableCell>
                                        <TableCell>Loại</TableCell>
                                        <TableCell align="right">Số lượng</TableCell>
                                        <TableCell align="right">Lượt</TableCell>
                                        <TableCell align="right">Phiếu</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {overview.defectStats.topDefects.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                                <Typography color="text.secondary">Chưa có dữ liệu lỗi.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : overview.defectStats.topDefects.map((item, index) => {
                                        const typeProps = getDefectTypeProps(item.DefectType);
                                        return (
                                            <TableRow key={`${item.DefectId || "unknown"}-${index}`} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={700}>
                                                        {item.MaLoi || "--"}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {item.TenLoi || "Chưa xác định"}
                                                    </Typography>
                                                    {item.MoTa && item.MoTa !== item.TenLoi && (
                                                        <Typography
                                                            variant="caption"
                                                            color="text.disabled"
                                                            sx={{
                                                                display: "block",
                                                                mt: 0.25,
                                                                maxWidth: 360,
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap"
                                                            }}
                                                            title={item.MoTa}
                                                        >
                                                            {item.MoTa}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={typeProps.label} size="small" color={typeProps.color} variant="outlined" />
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                    {formatNumber(item.Quantity)}
                                                </TableCell>
                                                <TableCell align="right">{formatNumber(item.Occurrences)}</TableCell>
                                                <TableCell align="right">{formatNumber(item.AffectedInspections)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Thao tác nhanh</Typography>
                        {quickActions.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                Không có thao tác phù hợp với quyền hiện tại.
                            </Typography>
                        ) : (
                            <Grid container spacing={2}>
                                {quickActions.map((action) => (
                                    <Grid size={{ xs: 12, sm: 6 }} key={action.path}>
                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            color={action.color}
                                            onClick={() => navigate(action.path)}
                                            sx={{
                                                height: 100,
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 1,
                                                borderStyle: "dashed",
                                                "&:hover": { borderStyle: "solid" }
                                            }}
                                        >
                                            <Box component={action.icon} />
                                            <Typography variant="caption" fontWeight={600}>
                                                {action.label}
                                            </Typography>
                                        </Button>
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
