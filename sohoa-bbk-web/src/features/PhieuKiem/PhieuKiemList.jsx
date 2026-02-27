import { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Chip,
    IconButton,
    CircularProgress,
    TextField,
    InputAdornment,
    Card,
    CardContent,
    Stack,
    Tooltip,
    Fade,
    alpha
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingIcon from '@mui/icons-material/Pending';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';
import { getPhieuKiemList } from '../../api/phieuKiem.api';

const renderStatus = (ketLuan) => {
    if (ketLuan === 'Đạt') {
        return (
            <Chip
                icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                label="Đạt"
                color="success"
                size="small"
                sx={{
                    fontWeight: 600,
                    '& .MuiChip-icon': { ml: 0.5 }
                }}
            />
        );
    }
    if (ketLuan === 'Không đạt') {
        return (
            <Chip
                icon={<CancelIcon sx={{ fontSize: 16 }} />}
                label="Không đạt"
                color="error"
                size="small"
                sx={{
                    fontWeight: 600,
                    '& .MuiChip-icon': { ml: 0.5 }
                }}
            />
        );
    }
    return (
        <Chip
            icon={<PendingIcon sx={{ fontSize: 16 }} />}
            label="Chưa kết luận"
            size="small"
            sx={{
                fontWeight: 500,
                bgcolor: 'grey.100',
                '& .MuiChip-icon': { ml: 0.5 }
            }}
        />
    );
};

export default function PhieuKiemList() {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (searchTerm) {
            const filtered = data.filter(item =>
                item.SoPhieu?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.TenChungLoai?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.TenNguoiKiem?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredData(filtered);
        } else {
            setFilteredData(data);
        }
    }, [searchTerm, data]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getPhieuKiemList();
            setData(res.data || []);
            setFilteredData(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Statistics
    const stats = {
        total: data.length,
        passed: data.filter(d => d.KetLuan === 'Đạt').length,
        failed: data.filter(d => d.KetLuan === 'Không đạt').length,
        pending: data.filter(d => !d.KetLuan).length
    };

    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 400,
                    gap: 2
                }}
            >
                <CircularProgress size={48} sx={{ color: '#6366f1' }} />
                <Typography color="text.secondary">Đang tải dữ liệu...</Typography>
            </Box>
        );
    }

    return (
        <Fade in timeout={400}>
            <Box>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 1
                        }}
                    >
                        Danh sách Phiếu kiểm
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Quản lý và theo dõi tất cả phiếu kiểm tra chất lượng
                    </Typography>
                </Box>

                {/* Stats Cards */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
                    <Card sx={{ flex: 1, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    bgcolor: alpha('#6366f1', 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <AssignmentIcon sx={{ color: '#6366f1' }} />
                            </Box>
                            <Box>
                                <Typography variant="h4" fontWeight={700}>{stats.total}</Typography>
                                <Typography variant="body2" color="text.secondary">Tổng phiếu</Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    <Card sx={{ flex: 1, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    bgcolor: alpha('#22c55e', 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <CheckCircleIcon sx={{ color: '#22c55e' }} />
                            </Box>
                            <Box>
                                <Typography variant="h4" fontWeight={700} color="success.main">{stats.passed}</Typography>
                                <Typography variant="body2" color="text.secondary">Đạt</Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    <Card sx={{ flex: 1, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    bgcolor: alpha('#ef4444', 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <CancelIcon sx={{ color: '#ef4444' }} />
                            </Box>
                            <Box>
                                <Typography variant="h4" fontWeight={700} color="error.main">{stats.failed}</Typography>
                                <Typography variant="body2" color="text.secondary">Không đạt</Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    <Card sx={{ flex: 1, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    bgcolor: alpha('#f59e0b', 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <PendingIcon sx={{ color: '#f59e0b' }} />
                            </Box>
                            <Box>
                                <Typography variant="h4" fontWeight={700} sx={{ color: '#f59e0b' }}>{stats.pending}</Typography>
                                <Typography variant="body2" color="text.secondary">Chờ kết luận</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Stack>

                {/* Search and Actions */}
                <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
                    <TextField
                        placeholder="Tìm kiếm theo số phiếu, chủng loại, người kiểm..."
                        size="small"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{
                            flex: 1,
                            maxWidth: 400,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                bgcolor: 'white'
                            }
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            )
                        }}
                    />
                    <Tooltip title="Làm mới">
                        <IconButton onClick={loadData} sx={{ bgcolor: 'white', boxShadow: 1 }}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>

                {/* Table */}
                <TableContainer
                    component={Paper}
                    sx={{
                        borderRadius: 3,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        overflow: 'hidden'
                    }}
                >
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Số phiếu</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Loại kiểm</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Chủng loại</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Lot</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Đối tượng</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Người kiểm</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Thời gian</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Kết luận</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary' }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {filteredData.map((row, index) => (
                                <TableRow
                                    key={row.Id}
                                    hover
                                    sx={{
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            bgcolor: alpha('#6366f1', 0.04)
                                        },
                                        '&:last-child td': { border: 0 }
                                    }}
                                >
                                    <TableCell>
                                        <Typography fontWeight={600} color="primary">
                                            {row.SoPhieu}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{row.LoaiKiem}</TableCell>
                                    <TableCell>{row.TenChungLoai}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={row.Lot || 'N/A'}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontFamily: 'monospace' }}
                                        />
                                    </TableCell>
                                    <TableCell>{row.DoiTuong}</TableCell>
                                    <TableCell>{row.TenNguoiKiem}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {new Date(row.ThoiGianKiem).toLocaleDateString('vi-VN')}
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled">
                                            {new Date(row.ThoiGianKiem).toLocaleTimeString('vi-VN')}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{renderStatus(row.KetLuan)}</TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Xem chi tiết">
                                            <IconButton
                                                onClick={() => navigate(`/phieu-kiem/${row.Id}`)}
                                                sx={{
                                                    bgcolor: alpha('#6366f1', 0.1),
                                                    '&:hover': {
                                                        bgcolor: alpha('#6366f1', 0.2)
                                                    }
                                                }}
                                            >
                                                <VisibilityIcon sx={{ color: '#6366f1', fontSize: 20 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {filteredData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                                        <Box sx={{ color: 'text.secondary' }}>
                                            <AssignmentIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                                            <Typography variant="body1">
                                                {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Không có dữ liệu'}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Fade>
    );
}
