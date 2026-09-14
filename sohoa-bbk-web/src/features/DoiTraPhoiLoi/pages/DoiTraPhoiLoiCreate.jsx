import { useState } from 'react';
import {
    Alert, Box, Button, Chip, CircularProgress, Grid, Paper, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import AddTaskIcon from '@mui/icons-material/AddTask';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import { createDoiTraPhoiLoi, searchDoiTraProductionPlans } from '../../../api/doiTraPhoiLoi.api';
import { formatDoiTraDate, formatDoiTraQuantity } from '../doiTraPhoiLoi.utils';

export default function DoiTraPhoiLoiCreate() {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState('');
    const [plans, setPlans] = useState([]);
    const [selected, setSelected] = useState(null);
    const [searching, setSearching] = useState(false);
    const [creating, setCreating] = useState(false);
    const [searched, setSearched] = useState(false);

    const search = async () => {
        if (!keyword.trim()) {
            window.alert('Vui lòng nhập mã kế hoạch, đơn hàng, sản phẩm hoặc bộ phận.');
            return;
        }
        try {
            setSearching(true);
            setSearched(true);
            const response = await searchDoiTraProductionPlans({ keyword: keyword.trim(), topN: 50 });
            setPlans(response.data || []);
            setSelected(null);
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không tìm được kế hoạch sản xuất.');
        } finally {
            setSearching(false);
        }
    };

    const create = async () => {
        if (!selected?.PlanSelectKey) return;
        try {
            setCreating(true);
            const response = await createDoiTraPhoiLoi(selected.PlanSelectKey);
            navigate(`/doi-tra-phoi-loi/${response.data.Id}?tab=phoi`, { replace: true });
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không tạo được phiếu đổi trả phôi lỗi.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <Box>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/doi-tra-phoi-loi')} sx={{ mb: 1 }}>
                Quay lại danh sách
            </Button>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight={800}>Tạo phiếu đổi trả phôi lỗi</Typography>
                    <Typography color="text.secondary">Chọn kế hoạch sản xuất để bắt đầu nhập phôi và kết quả KCS</Typography>
                </Box>
                <Chip color="primary" variant="outlined" label="Bước 1 · Chọn kế hoạch" sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }} />
            </Stack>

            <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 2, mb: 2 }}>
                <Typography fontWeight={800} sx={{ mb: 1.5 }}>1. Tìm kế hoạch sản xuất</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <TextField fullWidth size="small" value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        onKeyDown={(event) => { if (event.key === 'Enter') search(); }}
                        placeholder="Mã kế hoạch, đơn hàng, mã/tên sản phẩm, công đoạn hoặc bộ phận" />
                    <Button variant="contained" startIcon={searching ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
                        disabled={searching} onClick={search} sx={{ minWidth: 150 }}>
                        Tìm kế hoạch
                    </Button>
                </Stack>
            </Paper>

            {selected && <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, borderColor: 'primary.light', bgcolor: '#f5f7ff' }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    <CheckCircleIcon color="success" /><Typography fontWeight={800}>Kế hoạch đã chọn</Typography>
                </Stack>
                <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">Kế hoạch</Typography><Typography fontWeight={800}>{selected.PlanNo || selected.PlanID}</Typography></Grid>
                    <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">Sản phẩm</Typography><Typography variant="body2" fontWeight={700}>{[selected.ProductCode, selected.ProductName].filter(Boolean).join(' — ')}</Typography></Grid>
                    <Grid size={{ xs: 6, sm: 2 }}><Typography variant="caption" color="text.secondary">Đơn hàng</Typography><Typography variant="body2" fontWeight={700}>{selected.OrderCode || '---'}</Typography></Grid>
                    <Grid size={{ xs: 6, sm: 2 }}><Typography variant="caption" color="text.secondary">Số lượng</Typography><Typography variant="body2" fontWeight={700}>{formatDoiTraQuantity(selected.PlanQty)}</Typography></Grid>
                    <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">Công đoạn</Typography><Typography variant="body2">{selected.OperationName || selected.OperationCode || '---'}</Typography></Grid>
                    <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">Đơn vị thực hiện</Typography><Typography variant="body2">{[selected.DepartmentName, selected.UnitName].filter(Boolean).join(' — ') || '---'}</Typography></Grid>
                    <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">Ngày kế hoạch</Typography><Typography variant="body2">{formatDoiTraDate(selected.PlanDate)}</Typography></Grid>
                </Grid>
            </Paper>}

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                {searching ? (
                    <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
                ) : searched && plans.length === 0 ? (
                    <Alert severity="info" sx={{ m: 2 }}>Không tìm thấy kế hoạch phù hợp.</Alert>
                ) : !searched ? (
                    <Alert severity="info" sx={{ m: 2 }}>Nhập từ khóa để tìm kế hoạch sản xuất.</Alert>
                ) : (
                    <TableContainer sx={{ maxHeight: 'calc(100vh - 340px)' }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Mã kế hoạch</TableCell>
                                    <TableCell>Đơn hàng</TableCell>
                                    <TableCell>Sản phẩm</TableCell>
                                    <TableCell>Công đoạn</TableCell>
                                    <TableCell>Bộ phận</TableCell>
                                    <TableCell>Ngày KH</TableCell>
                                    <TableCell align="right">Số lượng</TableCell>
                                    <TableCell align="center">Chọn</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {plans.map((plan) => {
                                    const isSelected = selected?.PlanSelectKey === plan.PlanSelectKey;
                                    return (
                                        <TableRow key={plan.PlanSelectKey} hover selected={isSelected}>
                                            <TableCell><b>{plan.PlanNo || plan.PlanID}</b></TableCell>
                                            <TableCell>{plan.OrderCode || '---'}</TableCell>
                                            <TableCell>{plan.ProductCode || '---'}<br /><Typography variant="caption" color="text.secondary">{plan.ProductName || '---'}</Typography></TableCell>
                                            <TableCell>{plan.OperationName || plan.OperationCode || '---'}</TableCell>
                                            <TableCell>{plan.DepartmentName || '---'}</TableCell>
                                            <TableCell>{formatDoiTraDate(plan.PlanDate)}</TableCell>
                                            <TableCell align="right">{formatDoiTraQuantity(plan.PlanQty)}</TableCell>
                                            <TableCell align="center">
                                                <Button size="small" variant={isSelected ? 'contained' : 'outlined'} onClick={() => setSelected(plan)}>
                                                    {isSelected ? 'Đã chọn' : 'Chọn'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            <Paper elevation={4} sx={{ position: 'sticky', bottom: 12, zIndex: 5, mt: 2, p: 1.25, borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                        {selected ? `Đã chọn ${selected.PlanNo || selected.PlanID}` : 'Chọn một kế hoạch để tiếp tục'}
                    </Typography>
                    <Button variant="contained" startIcon={creating ? <CircularProgress size={18} color="inherit" /> : <AddTaskIcon />}
                        disabled={!selected || creating} onClick={create}>
                        Tạo phiếu và nhập phôi
                    </Button>
                </Stack>
            </Paper>
        </Box>
    );
}
