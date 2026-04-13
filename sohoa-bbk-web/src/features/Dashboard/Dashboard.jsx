import React, { useState, useEffect } from 'react';
import {
    Grid,
    Paper,
    Typography,
    Box,
    Card,
    CardContent,
    Stack,
    IconButton,
    Button,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    useTheme,
    alpha
} from '@mui/material';
import {
    Assignment as AssignmentIcon,
    Error as ErrorIcon,
    CheckCircle as CheckCircleIcon,
    PendingActions as PendingIcon,
    TrendingUp as TrendingUpIcon,
    ArrowForward as ArrowForwardIcon,
    Add as AddIcon,
    ListAlt as ListAltIcon,
    Settings as SettingsIcon,
    Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { getCurrentUser } from '../../utils/auth';

const StatCard = ({ title, value, icon: Icon, color, trend }) => {
    const theme = useTheme();
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography color="text.secondary" variant="subtitle2" gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="h4" fontWeight={700}>
                            {value}
                        </Typography>
                        {trend && (
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1 }}>
                                <TrendingUpIcon sx={{ color: 'success.main', fontSize: 16 }} />
                                <Typography variant="caption" color="success.main" fontWeight={600}>
                                    {trend}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    vs tháng trước
                                </Typography>
                            </Stack>
                        )}
                    </Box>
                    <Box
                        sx={{
                            backgroundColor: alpha(color, 0.1),
                            color: color,
                            p: 1.5,
                            borderRadius: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Icon />
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default function Dashboard() {
    const theme = useTheme();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const currentUser = getCurrentUser();
        setUser(currentUser);
    }, []);

    // Mock data
    const stats = [
        { title: 'Tổng phiếu kiểm', value: '1,284', icon: AssignmentIcon, color: theme.palette.primary.main, trend: '+12%' },
        { title: 'Đang chờ xử lý', value: '42', icon: PendingIcon, color: theme.palette.warning.main, trend: '-5%' },
        { title: 'Tỉ lệ đạt', value: '94.2%', icon: CheckCircleIcon, color: theme.palette.success.main, trend: '+2%' },
        { title: 'Biên bản lỗi', value: '18', icon: ErrorIcon, color: theme.palette.error.main, trend: '+8%' },
    ];

    const recentInspections = [
        { id: 'PK-00124', product: 'Thùng carton A1', date: '2024-04-10', status: 'Hoàn tất', result: 'Đạt' },
        { id: 'PK-00123', product: 'Hộp giấy in offset', date: '2024-04-10', status: 'Chờ PX', result: '-' },
        { id: 'PK-00122', product: 'Pallet gỗ', date: '2024-04-09', status: 'Hoàn tất', result: 'Không đạt' },
        { id: 'PK-00121', product: 'Màng PE', date: '2024-04-09', status: 'Hoàn tất', result: 'Đạt' },
        { id: 'PK-00120', product: 'Thùng carton B2', date: '2024-04-08', status: 'Hoàn tất', result: 'Đạt' },
    ];

    const quickActions = [
        { label: 'Tạo phiếu kiểm', icon: AddIcon, path: '/phieu-kiem/create', color: 'primary' },
        { label: 'Xem danh sách', icon: ListAltIcon, path: '/phieu-kiem', color: 'secondary' },
        { label: 'Báo cáo lỗi', icon: ErrorIcon, path: '/bien-ban', color: 'error' },
        { label: 'Cấu hình', icon: SettingsIcon, path: '/danh-muc', color: 'warning' },
    ];

    return (
        <Box>
            <PageHeader
                title={user ? `Chào ${user.fullName || user.username}` : "Bảng điều khiển"}
                subtitle={user ? `Bạn thuộc bộ phận ${user.tenBoPhan || 'Chưa xác định'}. Chúc bạn một ngày làm việc hiệu quả!` : "Tổng quan hệ thống Quản lý Chất lượng (KCS)"}
            />

            <Grid container spacing={3}>
                {/* Stats */}
                {stats.map((stat, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                        <StatCard {...stat} />
                    </Grid>
                ))}

                {/* Main Content Area */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 0, overflow: 'hidden' }}>
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6">Kiểm tra gần đây</Typography>
                            <Button
                                size="small"
                                endIcon={<ArrowForwardIcon />}
                                onClick={() => navigate('/phieu-kiem')}
                            >
                                Xem tất cả
                            </Button>
                        </Box>
                        <Divider />
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Mã phiếu</TableCell>
                                        <TableCell>Sản phẩm</TableCell>
                                        <TableCell>Ngày</TableCell>
                                        <TableCell>Trạng thái</TableCell>
                                        <TableCell align="right">Kết quả</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {recentInspections.map((row) => (
                                        <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/phieu-kiem/${row.id}`)}>
                                            <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{row.id}</TableCell>
                                            <TableCell>{row.product}</TableCell>
                                            <TableCell>{row.date}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={row.status}
                                                    size="small"
                                                    color={row.status === 'Hoàn tất' ? 'success' : 'warning'}
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                {row.result !== '-' ? (
                                                    <Chip
                                                        label={row.result}
                                                        size="small"
                                                        color={row.result === 'Đạt' ? 'success' : 'error'}
                                                    />
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary">-</Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    {/* Weekly Activity Placeholder */}
                    <Paper sx={{ mt: 3, p: 3 }}>
                        <Typography variant="h6" gutterBottom>Hiệu suất hàng tuần</Typography>
                        <Box sx={{
                            height: 200,
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'space-around',
                            pt: 2
                        }}>
                            {[65, 45, 75, 55, 85, 40, 60].map((height, i) => (
                                <Box key={i} sx={{ textAlign: 'center', width: '10%' }}>
                                    <Box sx={{
                                        height: `${height}%`,
                                        bgcolor: alpha(theme.palette.primary.main, i === 4 ? 1 : 0.6),
                                        borderRadius: '4px 4px 0 0',
                                        transition: 'height 0.3s ease',
                                        '&:hover': { bgcolor: theme.palette.primary.main }
                                    }} />
                                    <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                                        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][i]}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>

                {/* Sidebar area */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={3}>
                        {/* Quick Actions */}
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Thao tác nhanh</Typography>
                            <Grid container spacing={2}>
                                {quickActions.map((action, index) => (
                                    <Grid size={{ xs: 12, sm: 6 }} key={index}>
                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            color={action.color}
                                            onClick={() => navigate(action.path)}
                                            sx={{
                                                height: 100,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 1,
                                                borderStyle: 'dashed',
                                                '&:hover': { borderStyle: 'solid' }
                                            }}
                                        >
                                            <action.icon />
                                            <Typography variant="caption" fontWeight={600}>
                                                {action.label}
                                            </Typography>
                                        </Button>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>

                        {/* Summary Info */}
                        <Paper sx={{ p: 3, bgcolor: alpha(theme.palette.primary.main, 0.03), border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.1) }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                <AssessmentIcon color="primary" />
                                <Typography variant="h6">Ghi chú vận hành</Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Hệ thống đang hoạt động bình thường. Đã đồng bộ 100% dữ liệu với máy chủ sản xuất.
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Stack spacing={1.5}>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2">Phiên bản</Typography>
                                    <Typography variant="body2" fontWeight={600}>v2.4.0</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2">Lần cuối cập nhật</Typography>
                                    <Typography variant="body2" fontWeight={600}>10 phút trước</Typography>
                                </Stack>
                            </Stack>
                        </Paper>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
}
