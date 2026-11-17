import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Tab, Tabs, TextField, Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import {
    deleteDoiTraPhoiLoi, exportDoiTraSummaryExcel, getDoiTraPhoiLoiList,
    previewDoiTraSummary
} from '../../../api/doiTraPhoiLoi.api';
import { getCurrentUser } from '../../../utils/auth';
import {
    DOI_TRA_STATUS_META, doiTraDinhMucStatusMeta, doiTraStatusMeta,
    formatDoiTraDate, formatDoiTraQuantity
} from '../doiTraPhoiLoi.utils';
import DoiTraPhoiLoiSummaryPrintTemplate from '../components/DoiTraPhoiLoiSummaryPrintTemplate';
import DoiTraDefectFlowReport from '../components/DoiTraDefectFlowReport';

export default function DoiTraPhoiLoiList() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') === 'report' ? 'report' : 'tickets';
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [summaryOpen, setSummaryOpen] = useState(false);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryData, setSummaryData] = useState(null);
    const [exportingExcel, setExportingExcel] = useState(false);
    const summaryPrintRef = useRef(null);
    const [filters, setFilters] = useState({ keyword: '', status: '', opinionDepartment: 'all', fromDate: '', toDate: '' });
    const [deletingId, setDeletingId] = useState(null);
    const user = useMemo(() => getCurrentUser() || {}, []);
    const permissions = user?.permissions || [];
    const isAdmin = permissions.includes('QUAN_TRI_DM')
        || (user?.roles || []).some((role) => String(role).toUpperCase().includes('ADMIN'));
    const canCreate = isAdmin || permissions.includes('THUC_HIEN_KIEM');
    const canDelete = permissions.includes('XOA_HO_SO_KCS');
    const serverFilters = useMemo(() => Object.fromEntries(Object.entries({
        keyword: filters.keyword,
        status: filters.status,
        fromDate: filters.fromDate,
        toDate: filters.toDate
    }).filter(([, value]) => value)), [filters.fromDate, filters.keyword, filters.status, filters.toDate]);
    const managedDepartmentIds = useMemo(() => new Set(
        (user?.managedBoPhanIds || [user?.boPhanId]).map(Number).filter((id) => Number.isInteger(id) && id > 0)
    ), [user]);
    const opinionDepartmentOptions = useMemo(() => {
        const options = new Map();
        rows.forEach((row) => (Array.isArray(row.OpinionDepartments) ? row.OpinionDepartments : []).forEach((department) => {
            const id = Number(department.id);
            if (!Number.isInteger(id) || id <= 0) return;
            options.set(id, {
                id,
                label: [department.maBoPhan, department.tenBoPhan].filter(Boolean).join(' - ') || `Bộ phận #${id}`
            });
        }));
        return [...options.values()].sort((a, b) => a.label.localeCompare(b.label, 'vi'));
    }, [rows]);
    const filteredRows = useMemo(() => rows.filter((row) => {
        if (filters.opinionDepartment === 'all') return true;
        const departmentIds = (Array.isArray(row.OpinionDepartments) ? row.OpinionDepartments : [])
            .map((department) => Number(department.id));
        if (filters.opinionDepartment === 'mine') {
            return departmentIds.some((id) => managedDepartmentIds.has(id));
        }
        return departmentIds.includes(Number(filters.opinionDepartment));
    }), [filters.opinionDepartment, managedDepartmentIds, rows]);
    const printableRows = filteredRows.filter((row) => row.TrangThai !== 'DA_HUY');

    const printSummary = useReactToPrint({
        contentRef: summaryPrintRef,
        documentTitle: 'BangTongHopPhoiBtpLoiDoiTra'
    });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getDoiTraPhoiLoiList(serverFilters);
            setRows(response.data || []);
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không tải được danh sách phiếu đổi trả phôi lỗi.');
        } finally {
            setLoading(false);
        }
    }, [serverFilters]);

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

    const exportSummaryExcel = async () => {
        if (!selectedIds.length) return;
        try {
            setExportingExcel(true);
            const response = await exportDoiTraSummaryExcel(selectedIds);
            const url = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `tong-hop-doi-phoi-${selectedIds.length}-phieu.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            window.alert('Không xuất được Excel tổng hợp đổi phôi.');
        } finally {
            setExportingExcel(false);
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
                        KCS tạo phiếu nhập và mở KPH; Kho xác nhận nhập, B7 tạo lệnh xuất vật tư đổi trả
                    </Typography>
                </Box>
                {activeTab === 'tickets' && <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={summaryLoading ? <CircularProgress size={18} /> : <PrintIcon />} disabled={summaryLoading || !selectedIds.length} onClick={openSummary}>Xem tổng hợp ({selectedIds.length})</Button>
                    {canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/doi-tra-phoi-loi/create')}>Tạo phiếu</Button>}
                </Stack>}
            </Stack>

            <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                <Tabs value={activeTab} onChange={(_event, value) => setSearchParams(value === 'report' ? { tab: 'report' } : {})}>
                    <Tab value="tickets" label="Danh sách phiếu" />
                    <Tab value="report" label="Báo cáo đối soát BTP lỗi" />
                </Tabs>
            </Paper>

            {activeTab === 'report' ? <DoiTraDefectFlowReport /> : <>
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} useFlexGap sx={{ flexWrap: { md: 'wrap' } }}>
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
                    <TextField select size="small" label="Bộ phận được xin ý kiến" value={filters.opinionDepartment}
                        onChange={(event) => {
                            setSelectedIds([]);
                            setFilters((current) => ({ ...current, opinionDepartment: event.target.value }));
                        }} sx={{ minWidth: 250 }}>
                        <MenuItem value="all">Tất cả bộ phận được xin ý kiến</MenuItem>
                        {managedDepartmentIds.size > 0 && <MenuItem value="mine">Bộ phận của tôi</MenuItem>}
                        {opinionDepartmentOptions.map((department) => (
                            <MenuItem key={department.id} value={String(department.id)}>{department.label}</MenuItem>
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
                ) : filteredRows.length === 0 ? (
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
                                    <TableCell>Kho xác nhận nhập</TableCell>
                                    <TableCell>Số lượng đổi trả B7</TableCell>
                                    <TableCell align="center">Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredRows.map((row) => {
                                    const status = doiTraStatusMeta(row.TrangThai);
                                    const dinhMucStatus = doiTraDinhMucStatusMeta(row.DinhMucTrangThai);
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
                                            <TableCell sx={{ minWidth: 220, maxWidth: 320 }}>
                                                <Chip size="small" color={status.color} label={status.label} />
                                                {row.TrangThai === 'CHO_Y_KIEN_KPH' && <Box sx={{ mt: 0.75 }}>
                                                    <Typography variant="caption" fontWeight={700} display="block">
                                                        {row.DaCoYKien || 0}/{row.SoBoPhan || 0} bộ phận đã xác nhận
                                                    </Typography>
                                                    {row.BoPhanChuaXacNhanText && <Typography variant="caption" color="warning.dark" display="block" sx={{ mt: 0.25, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                                                        Chờ: {row.BoPhanChuaXacNhanText}
                                                    </Typography>}
                                                </Box>}
                                            </TableCell>
                                            <TableCell sx={{ minWidth: 190 }}>
                                                {row.SoPhieuNhapBtp ? <>
                                                    <Chip size="small" variant="outlined"
                                                        color={Number(row.PhieuNhapErpTrangThai) === 5 ? 'success' : 'warning'}
                                                        label={Number(row.PhieuNhapErpTrangThai) === 5 ? 'Đã xác nhận nhập' : 'Chưa xác nhận nhập'} />
                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                                        {row.SoPhieuNhapBtp}
                                                    </Typography>
                                                    {row.WarehouseConfirmedAt && <Typography variant="caption" color="text.secondary" display="block">
                                                        {[row.TenKhoXacNhan, formatDoiTraDate(row.WarehouseConfirmedAt, true)].filter((value) => value && value !== '---').join(' — ')}
                                                    </Typography>}
                                                </> : <Chip size="small" variant="outlined" label="Chưa tạo phiếu nhập" />}
                                            </TableCell>
                                            <TableCell>
                                                <Chip size="small" variant="outlined" color={dinhMucStatus.color} label={dinhMucStatus.label} />
                                                {row.DinhMucTrangThai === 'DA_XAC_NHAN' && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                                    {[row.TenB7XacNhan, formatDoiTraDate(row.B7ConfirmedAt, true)].filter((value) => value && value !== '---').join(' — ')}
                                                </Typography>}
                                            </TableCell>
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
                <DialogTitle>Xem trước bảng tổng hợp phôi, BTP lỗi đổi trả</DialogTitle>
                <DialogContent dividers sx={{ bgcolor: '#e5e7eb', p: 2, overflow: 'auto' }}>
                    <Box sx={{ minWidth: '297mm' }}>
                        {summaryData && <DoiTraPhoiLoiSummaryPrintTemplate ref={summaryPrintRef} data={summaryData} />}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSummaryOpen(false)}>Đóng</Button>
                    <Button variant="outlined" startIcon={exportingExcel ? <CircularProgress size={18} /> : <FileDownloadOutlinedIcon />} disabled={exportingExcel} onClick={exportSummaryExcel}>Xuất Excel</Button>
                    <Button variant="contained" startIcon={<PrintIcon />} onClick={printSummary}>In / Lưu PDF</Button>
                </DialogActions>
            </Dialog>
            </>}
        </Box>
    );
}
