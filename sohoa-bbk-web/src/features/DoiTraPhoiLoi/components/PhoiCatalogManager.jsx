import { useCallback, useEffect, useState } from 'react';
import {
    Alert, Box, Button, Chip, CircularProgress, InputAdornment, Paper, Stack, Table,
    TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow,
    TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { getPhoiDetailCatalog } from '../../../api/lookup.api';
import PhoiChiTietDialog from '../../DanhMuc/components/PhoiChiTietDialog';

const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};

export default function PhoiCatalogManager() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [keywordInput, setKeywordInput] = useState('');
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('all');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [total, setTotal] = useState(0);
    const [configured, setConfigured] = useState(0);
    const [missing, setMissing] = useState(0);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const load = useCallback(async ({ background = false } = {}) => {
        try {
            if (!background) setLoading(true);
            setError('');
            const response = await getPhoiDetailCatalog({ keyword, status, page, pageSize });
            setRows(response.data?.data || []);
            setTotal(Number(response.data?.total || 0));
            setConfigured(Number(response.data?.configured || 0));
            setMissing(Number(response.data?.missing || 0));
        } catch (loadError) {
            setError(loadError.response?.data?.message || 'Không tải được danh sách itemcode');
        } finally {
            setLoading(false);
        }
    }, [keyword, page, pageSize, status]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setPage(0);
            setKeyword(keywordInput.trim());
        }, 400);
        return () => window.clearTimeout(timer);
    }, [keywordInput]);

    const openProduct = (product = null) => {
        setSelectedProduct(product);
        setDialogOpen(true);
    };

    return <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
                <Box>
                    <Typography variant="h6" fontWeight={900}>Danh mục chi tiết phôi theo itemcode</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Kiểm tra item đã khai báo hay chưa, thêm nhiều loại phôi và sao chép cấu hình giữa các item.
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => openProduct(null)}>Thêm chi tiết phôi</Button>
            </Stack>
        </Paper>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Paper variant="outlined" sx={{ px: 2, py: 1.25, minWidth: 180 }}>
                <Typography variant="caption" color="text.secondary">Item đang hiển thị</Typography>
                <Typography variant="h6" fontWeight={900}>{total}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ px: 2, py: 1.25, minWidth: 180, borderColor: 'success.light' }}>
                <Stack direction="row" spacing={1} alignItems="center"><CheckCircleOutlineIcon color="success" />
                    <Box><Typography variant="caption" color="text.secondary">Đã có chi tiết phôi</Typography><Typography variant="h6" color="success.main" fontWeight={900}>{configured}</Typography></Box>
                </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ px: 2, py: 1.25, minWidth: 180, borderColor: 'warning.light' }}>
                <Stack direction="row" spacing={1} alignItems="center"><ErrorOutlineIcon color="warning" />
                    <Box><Typography variant="caption" color="text.secondary">Chưa có chi tiết phôi</Typography><Typography variant="h6" color="warning.main" fontWeight={900}>{missing}</Typography></Box>
                </Stack>
            </Paper>
        </Stack>

        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ p: 2 }} justifyContent="space-between">
                <TextField size="small" value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)}
                    placeholder="Tìm itemcode hoặc tên sản phẩm..." sx={{ minWidth: { md: 420 } }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
                <ToggleButtonGroup exclusive size="small" value={status} onChange={(_, value) => {
                    if (!value) return;
                    setStatus(value); setPage(0);
                }}>
                    <ToggleButton value="all">Tất cả</ToggleButton>
                    <ToggleButton value="configured" color="success">Đã có</ToggleButton>
                    <ToggleButton value="missing" color="warning">Chưa có</ToggleButton>
                </ToggleButtonGroup>
            </Stack>
            {error && <Alert severity="error" sx={{ mx: 2, mb: 2 }}>{error}</Alert>}
            <TableContainer sx={{ minHeight: 360 }}>
                <Table stickyHeader size="small">
                    <TableHead><TableRow>
                        <TableCell sx={{ width: 70 }}>STT</TableCell>
                        <TableCell sx={{ minWidth: 150 }}>Itemcode</TableCell>
                        <TableCell sx={{ minWidth: 340 }}>Sản phẩm</TableCell>
                        <TableCell sx={{ minWidth: 160 }}>Trạng thái</TableCell>
                        <TableCell align="right">Số vật tư</TableCell>
                        <TableCell align="right">Số loại phôi</TableCell>
                        <TableCell sx={{ minWidth: 150 }}>Cập nhật cuối</TableCell>
                        <TableCell align="right" sx={{ minWidth: 150 }}>Thao tác</TableCell>
                    </TableRow></TableHead>
                    <TableBody>
                        {loading ? <TableRow><TableCell colSpan={8} align="center" sx={{ py: 8 }}><CircularProgress /></TableCell></TableRow>
                            : !rows.length ? <TableRow><TableCell colSpan={8} align="center" sx={{ py: 8 }}><Inventory2OutlinedIcon color="disabled" sx={{ fontSize: 48 }} /><Typography color="text.secondary">Không có itemcode phù hợp</Typography></TableCell></TableRow>
                                : rows.map((row, index) => {
                                    const hasDetails = Number(row.PhoiCount) > 0;
                                    return <TableRow key={row.Id} hover sx={{ bgcolor: hasDetails ? undefined : 'rgba(237, 108, 2, 0.035)' }}>
                                        <TableCell>{page * pageSize + index + 1}</TableCell>
                                        <TableCell><Typography fontWeight={900} color="primary.main">{row.ItemCode}</Typography></TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={700}>{row.TenSanPham || '—'}</Typography>
                                            <Typography variant="caption" color="text.secondary">{[row.CoSanPham, row.MauSanPham, row.ThiTruong].filter(Boolean).join(' · ') || '—'}</Typography>
                                        </TableCell>
                                        <TableCell><Chip size="small" color={hasDetails ? 'success' : 'warning'} variant={hasDetails ? 'filled' : 'outlined'}
                                            icon={hasDetails ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
                                            label={hasDetails ? 'Đã có chi tiết phôi' : 'Chưa có chi tiết phôi'} /></TableCell>
                                        <TableCell align="right">{Number(row.MaterialCount || 0)}</TableCell>
                                        <TableCell align="right"><Typography fontWeight={800}>{Number(row.PhoiCount || 0)}</Typography></TableCell>
                                        <TableCell>{formatDateTime(row.LastUpdatedAt)}</TableCell>
                                        <TableCell align="right"><Tooltip title={hasDetails ? 'Xem và chỉnh sửa chi tiết phôi' : 'Thêm chi tiết phôi'}>
                                            <Button size="small" variant={hasDetails ? 'outlined' : 'contained'} color={hasDetails ? 'primary' : 'warning'}
                                                startIcon={hasDetails ? <EditOutlinedIcon /> : <AddIcon />} onClick={() => openProduct(row)}>
                                                {hasDetails ? 'Chi tiết' : 'Khai báo'}
                                            </Button>
                                        </Tooltip></TableCell>
                                    </TableRow>;
                                })}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination component="div" count={total} page={page} rowsPerPage={pageSize}
                rowsPerPageOptions={[25, 50, 100]} labelRowsPerPage="Số dòng mỗi trang"
                onPageChange={(_, nextPage) => setPage(nextPage)}
                onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} />
        </Paper>

        <PhoiChiTietDialog open={dialogOpen} initialProduct={selectedProduct}
            onClose={() => setDialogOpen(false)} onChanged={() => load({ background: true })} />
    </Stack>;
}
