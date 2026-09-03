import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { deleteDoiTraPhoiLoi, getDoiTraPhoiLoiList, previewDoiTraSummary } from '../../../api/doiTraPhoiLoi.api';
import { getCurrentUser } from '../../../utils/auth';
import { DOI_TRA_STATUS_META, doiTraStatusMeta, formatDoiTraDate, formatDoiTraQuantity } from '../doiTraPhoiLoi.utils';
import DoiTraPhoiLoiSummaryPrintTemplate from '../components/DoiTraPhoiLoiSummaryPrintTemplate';

export default function DoiTraPhoiLoiList() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [summaryOpen, setSummaryOpen] = useState(false);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryData, setSummaryData] = useState(null);
    const summaryPrintRef = useRef(null);
    const [filters, setFilters] = useState({ keyword: '', status: '', fromDate: '', toDate: '' });
    const [deletingId, setDeletingId] = useState(null);
    const user = getCurrentUser();
    const permissions = user?.permissions || [];
    const isAdmin = permissions.includes('QUAN_TRI_DM')
        || (user?.roles || []).some((role) => String(role).toUpperCase().includes('ADMIN'));
    const canCreate = isAdmin || permissions.includes('THUC_HIEN_KIEM');
    const canDelete = permissions.includes('XOA_HO_SO_KCS');
    const printableRows = rows.filter((row) => row.TrangThai !== 'DA_HUY');

    const printSummary = useReactToPrint({
        contentRef: summaryPrintRef,
        documentTitle: 'TongHopDoiTraPhoiLoi_BanNhap'
    });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getDoiTraPhoiLoiList(Object.fromEntries(
                Object.entries(filters).filter(([, value]) => value)
            ));
            setRows(response.data || []);
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không tải được danh sách phiếu đổi trả phôi lỗi.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { load(); }, [load]);

    const openSummary = async () => {
        if (!selectedIds.length) return window.alert('Vui lòng chọn ít nhất một phiếu chưa hủy.');
        try {
            setSummaryLoading(true);
            const response = await previewDoiTraSummary(selectedIds);
            setSummaryData(response.data);
            setSummaryOpen(true);
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không tạo được bản xem trước tổng hợp.');
        } finally {
            setSummaryLoading(false);
        }
    };

    const deleteTicket = async (row) => {
        if (!window.confirm(`Xóa phiếu ${row.SoPhieu || row.Id} cùng toàn bộ dữ liệu liên quan? Hành động này không thể hoàn tác.`)) return;
        try {
            setDeletingId(row.Id);
            await deleteDoiTraPhoiLoi(row.Id);
            setSelectedIds((current) => current.filter((id) => Number(id) !== Number(row.Id)));
            await load();
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không thể xóa phiếu đổi trả phôi lỗi.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Box>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight={800} color="#0f172a">Đổi trả phôi lỗi</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Theo dõi phiếu từ bước KCS kiểm đến khi B7 nhập định mức đổi trả
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={summaryLoading ? <CircularProgress size={18} /> : <PrintIcon />} disabled={summaryLoading || !selectedIds.length} onClick={openSummary}>Xem tổng hợp ({selectedIds.length})</Button>
                    {canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/doi-tra-phoi-loi/create')}>Tạo phiếu</Button>}
                </Stack>
            </Stack>

            <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                    <TextField
                        size="small"
                        placeholder="Tìm số phiếu, kế hoạch, đơn hàng, sản phẩm"
                        value={filters.keyword}
                        onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
                        slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.disabled' }} /> } }}
                        sx={{ flex: 1, minWidth: 260 }}
                    />
                    <TextField select size="small" label="Trạng thái" value={filters.status}
                        onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                        sx={{ minWidth: 210 }}>
                        <MenuItem value="">Tất cả trạng thái</MenuItem>
                        {Object.entries(DOI_TRA_STATUS_META).map(([value, meta]) => (
                            <MenuItem key={value} value={value}>{meta.label}</MenuItem>
                        ))}
                    </TextField>
                    <TextField size="small" type="date" label="Từ ngày" value={filters.fromDate}
                        onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))}
                        slotProps={{ inputLabel: { shrink: true } }} />
                    <TextField size="small" type="date" label="Đến ngày" value={filters.toDate}
                        onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))}
                        slotProps={{ inputLabel: { shrink: true } }} />
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                {loading ? (
                    <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
                ) : rows.length === 0 ? (
                    <Alert severity="info" sx={{ m: 2 }}>Chưa có phiếu đổi trả phôi lỗi phù hợp.</Alert>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                    <TableCell padding="checkbox"><Checkbox checked={printableRows.length > 0 && selectedIds.length === printableRows.length} indeterminate={selectedIds.length > 0 && selectedIds.length < printableRows.length} onChange={(event) => setSelectedIds(event.target.checked ? printableRows.map((row) => row.Id) : [])} /></TableCell>
                                    <TableCell>Số phiếu</TableCell>
                                    <TableCell>Ngày lập</TableCell>
                                    <TableCell>Kế hoạch / Đơn hàng</TableCell>
                                    <TableCell>Sản phẩm</TableCell>
                                    <TableCell>Công đoạn / Bộ phận</TableCell>
                                    <TableCell align="right">Số lượng KH</TableCell>
                                    <TableCell>Người lập</TableCell>
                                    <TableCell>Trạng thái</TableCell>
                                    <TableCell align="center">Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row) => {
                                    const status = doiTraStatusMeta(row.TrangThai);
                                    return (
                                        <TableRow key={row.Id} hover>
                                            <TableCell padding="checkbox"><Checkbox disabled={row.TrangThai === 'DA_HUY'} checked={selectedIds.includes(row.Id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, row.Id] : current.filter((id) => id !== row.Id))} /></TableCell>
                                            <TableCell><Typography variant="body2" fontWeight={800} color="primary.main">{row.SoPhieu}</Typography></TableCell>
                                            <TableCell>{formatDoiTraDate(row.NgayLap)}</TableCell>
                                            <TableCell>{row.PlanNo || row.PlanID || '---'}<br /><Typography variant="caption" color="text.secondary">{row.OrderCode || '---'}</Typography></TableCell>
                                            <TableCell>{row.ProductCode || '---'}<br /><Typography variant="caption" color="text.secondary">{row.ProductName || '---'}</Typography></TableCell>
                                            <TableCell>{row.OperationName || row.OperationCode || '---'}<br /><Typography variant="caption" color="text.secondary">{row.DepartmentName || '---'}</Typography></TableCell>
                                            <TableCell align="right">{formatDoiTraQuantity(row.PlanQty)}</TableCell>
                                            <TableCell>{row.TenNguoiLap || '---'}</TableCell>
                                            <TableCell><Chip size="small" color={status.color} label={status.label} /></TableCell>
                                            <TableCell align="center">
                                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                                    <Button size="small" startIcon={<VisibilityOutlinedIcon />} onClick={() => navigate(`/doi-tra-phoi-loi/${row.Id}`)}>Xem</Button>
                                                    {canDelete && <Button size="small" color="error" startIcon={deletingId === row.Id ? <CircularProgress size={16} /> : <DeleteOutlineIcon />} disabled={deletingId !== null} onClick={() => deleteTicket(row)}>{deletingId === row.Id ? 'Đang xóa…' : 'Xóa'}</Button>}
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
            <Dialog open={summaryOpen} onClose={() => setSummaryOpen(false)} maxWidth="xl" fullWidth>
                <DialogTitle>Xem trước phiếu tổng hợp VT/BTP/TP lỗi đổi trả</DialogTitle>
                <DialogContent dividers sx={{ bgcolor: '#e5e7eb', p: 2, overflow: 'auto' }}>
                    <Box sx={{ minWidth: '297mm' }}>
                        {summaryData && <DoiTraPhoiLoiSummaryPrintTemplate ref={summaryPrintRef} data={summaryData} />}
                    </Box>
                </DialogContent>
                <DialogActions><Button onClick={() => setSummaryOpen(false)}>Đóng</Button><Button variant="contained" startIcon={<PrintIcon />} onClick={printSummary}>In / Lưu PDF</Button></DialogActions>
            </Dialog>
        </Box>
    );
}
