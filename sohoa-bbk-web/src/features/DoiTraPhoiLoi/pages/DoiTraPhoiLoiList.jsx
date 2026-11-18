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
    DOI_TRA_DINH_MUC_STATUS_META, DOI_TRA_STATUS_META, doiTraDinhMucStatusMeta, doiTraStatusMeta,
    formatDoiTraDate, formatDoiTraQuantity
} from '../doiTraPhoiLoi.utils';
import DoiTraPhoiLoiSummaryPrintTemplate from '../components/DoiTraPhoiLoiSummaryPrintTemplate';
import DoiTraDefectFlowReport from '../components/DoiTraDefectFlowReport';

const emptyColumnFilters = {
    ticketNo: '', createdDate: '', planOrder: '', product: '', operationDepartment: '',
    planQuantity: '', creator: '', status: '', warehouseStatus: '', b7Status: ''
};

const searchable = (value) => String(value ?? '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').trim();

const containsSearch = (values, keyword) => !keyword
    || values.some((value) => searchable(value).includes(searchable(keyword)));

const dateKey = (value) => {
    if (!value) return '';
    const raw = String(value);
    const isoDate = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (isoDate) return isoDate;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const columnFilterSx = {
    minWidth: 105,
    '& .MuiInputBase-root': { fontSize: 12 },
    '& .MuiInputBase-input': { py: 0.75 },
    '& .MuiSelect-select': { py: '6px !important' }
};

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
    const [columnFilters, setColumnFilters] = useState(emptyColumnFilters);
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
        if (filters.opinionDepartment !== 'all') {
            const departmentIds = (Array.isArray(row.OpinionDepartments) ? row.OpinionDepartments : [])
                .map((department) => Number(department.id));
            if (filters.opinionDepartment === 'mine') {
                if (!departmentIds.some((id) => managedDepartmentIds.has(id))) return false;
            } else if (!departmentIds.includes(Number(filters.opinionDepartment))) return false;
        }

        if (!containsSearch([row.SoPhieu], columnFilters.ticketNo)) return false;
        if (columnFilters.createdDate && dateKey(row.NgayLap) !== columnFilters.createdDate) return false;
        if (!containsSearch([row.PlanNo, row.PlanID, row.OrderCode], columnFilters.planOrder)) return false;
        if (!containsSearch([row.ProductCode, row.ProductName], columnFilters.product)) return false;
        if (!containsSearch([
            row.OperationCode, row.OperationName, row.DepartmentCode, row.DepartmentName
        ], columnFilters.operationDepartment)) return false;
        if (columnFilters.planQuantity) {
            const expectedQuantity = Number(String(columnFilters.planQuantity).replace(',', '.'));
            if (!Number.isFinite(expectedQuantity) || Number(row.PlanQty) !== expectedQuantity) return false;
        }
        if (!containsSearch([row.TenNguoiLap], columnFilters.creator)) return false;
        if (columnFilters.status && row.TrangThai !== columnFilters.status) return false;
        if (columnFilters.warehouseStatus === 'CONFIRMED'
            && (!row.SoPhieuNhapBtp || Number(row.PhieuNhapErpTrangThai) !== 5)) return false;
        if (columnFilters.warehouseStatus === 'PENDING'
            && (!row.SoPhieuNhapBtp || Number(row.PhieuNhapErpTrangThai) === 5)) return false;
        if (columnFilters.warehouseStatus === 'NOT_CREATED' && row.SoPhieuNhapBtp) return false;
        if (columnFilters.b7Status && row.DinhMucTrangThai !== columnFilters.b7Status) return false;
        return true;
    }), [columnFilters, filters.opinionDepartment, managedDepartmentIds, rows]);
    const printableRows = filteredRows.filter((row) => row.TrangThai !== 'DA_HUY');
    const printableIdSet = new Set(printableRows.map((row) => Number(row.Id)));
    const visibleSelectedIds = selectedIds.filter((id) => printableIdSet.has(Number(id)));

    const setColumnFilter = (name, value) => {
        setSelectedIds([]);
        setColumnFilters((current) => ({ ...current, [name]: value }));
    };

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
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                    <TableCell padding="checkbox"><Checkbox checked={printableRows.length > 0 && visibleSelectedIds.length === printableRows.length} indeterminate={visibleSelectedIds.length > 0 && visibleSelectedIds.length < printableRows.length} onChange={(event) => setSelectedIds(event.target.checked ? printableRows.map((row) => row.Id) : [])} /></TableCell>
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
                                <TableRow sx={{ bgcolor: '#fff', '& .MuiTableCell-root': { py: 0.75, verticalAlign: 'top' } }}>
                                    <TableCell padding="checkbox" />
                                    <TableCell><TextField fullWidth size="small" variant="standard" placeholder="Lọc số phiếu" value={columnFilters.ticketNo} onChange={(event) => setColumnFilter('ticketNo', event.target.value)} sx={columnFilterSx} /></TableCell>
                                    <TableCell><TextField fullWidth size="small" variant="standard" type="date" value={columnFilters.createdDate} onChange={(event) => setColumnFilter('createdDate', event.target.value)} sx={{ ...columnFilterSx, minWidth: 125 }} inputProps={{ 'aria-label': 'Lọc ngày lập' }} /></TableCell>
                                    <TableCell><TextField fullWidth size="small" variant="standard" placeholder="KH hoặc đơn hàng" value={columnFilters.planOrder} onChange={(event) => setColumnFilter('planOrder', event.target.value)} sx={{ ...columnFilterSx, minWidth: 145 }} /></TableCell>
                                    <TableCell><TextField fullWidth size="small" variant="standard" placeholder="Mã hoặc tên SP" value={columnFilters.product} onChange={(event) => setColumnFilter('product', event.target.value)} sx={{ ...columnFilterSx, minWidth: 145 }} /></TableCell>
                                    <TableCell><TextField fullWidth size="small" variant="standard" placeholder="Công đoạn/BP" value={columnFilters.operationDepartment} onChange={(event) => setColumnFilter('operationDepartment', event.target.value)} sx={{ ...columnFilterSx, minWidth: 145 }} /></TableCell>
                                    <TableCell><TextField fullWidth size="small" variant="standard" type="number" placeholder="SL" value={columnFilters.planQuantity} onChange={(event) => setColumnFilter('planQuantity', event.target.value)} sx={{ ...columnFilterSx, minWidth: 80 }} inputProps={{ min: 0, 'aria-label': 'Lọc số lượng kế hoạch' }} /></TableCell>
                                    <TableCell><TextField fullWidth size="small" variant="standard" placeholder="Người lập" value={columnFilters.creator} onChange={(event) => setColumnFilter('creator', event.target.value)} sx={columnFilterSx} /></TableCell>
                                    <TableCell><TextField select fullWidth size="small" variant="standard" value={columnFilters.status} onChange={(event) => setColumnFilter('status', event.target.value)} sx={{ ...columnFilterSx, minWidth: 160 }} SelectProps={{ displayEmpty: true }}><MenuItem value="">Tất cả</MenuItem>{Object.entries(DOI_TRA_STATUS_META).map(([value, meta]) => <MenuItem key={value} value={value}>{meta.label}</MenuItem>)}</TextField></TableCell>
                                    <TableCell><TextField select fullWidth size="small" variant="standard" value={columnFilters.warehouseStatus} onChange={(event) => setColumnFilter('warehouseStatus', event.target.value)} sx={{ ...columnFilterSx, minWidth: 155 }} SelectProps={{ displayEmpty: true }}><MenuItem value="">Tất cả</MenuItem><MenuItem value="CONFIRMED">Đã xác nhận nhập</MenuItem><MenuItem value="PENDING">Chưa xác nhận nhập</MenuItem><MenuItem value="NOT_CREATED">Chưa tạo phiếu nhập</MenuItem></TextField></TableCell>
                                    <TableCell><TextField select fullWidth size="small" variant="standard" value={columnFilters.b7Status} onChange={(event) => setColumnFilter('b7Status', event.target.value)} sx={{ ...columnFilterSx, minWidth: 155 }} SelectProps={{ displayEmpty: true }}><MenuItem value="">Tất cả</MenuItem>{Object.entries(DOI_TRA_DINH_MUC_STATUS_META).map(([value, meta]) => <MenuItem key={value} value={value}>{meta.label}</MenuItem>)}</TextField></TableCell>
                                    <TableCell align="center"><Button size="small" disabled={!Object.values(columnFilters).some(Boolean)} onClick={() => { setSelectedIds([]); setColumnFilters(emptyColumnFilters); }}>Xóa lọc</Button></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredRows.length === 0 && <TableRow><TableCell colSpan={12}>
                                    <Alert severity="info">Chưa có phiếu đổi trả phôi lỗi phù hợp. Bạn có thể thay đổi hoặc xóa bộ lọc ngay trên đầu cột.</Alert>
                                </TableCell></TableRow>}
                                {filteredRows.map((row) => {
                                    const status = doiTraStatusMeta(row.TrangThai);
                                    const dinhMucStatus = doiTraDinhMucStatusMeta(row.DinhMucTrangThai);
                                    const displayProductCode = row.PhoiSelectionMode === 'PREVIOUS_STAGE_BTP'
                                        ? [row.ProductCode, row.BtpStageSuffix || 'M'].filter(Boolean).join('.')
                                        : row.ProductCode;
                                    return (
                                        <TableRow key={row.Id} hover>
                                            <TableCell padding="checkbox"><Checkbox disabled={row.TrangThai === 'DA_HUY'} checked={selectedIds.includes(row.Id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, row.Id] : current.filter((id) => id !== row.Id))} /></TableCell>
                                            <TableCell><Typography variant="body2" fontWeight={800} color="primary.main">{row.SoPhieu}</Typography></TableCell>
                                            <TableCell>{formatDoiTraDate(row.NgayLap)}</TableCell>
                                            <TableCell>{row.PlanNo || row.PlanID || '---'}<br /><Typography variant="caption" color="text.secondary">{row.OrderCode || '---'}</Typography></TableCell>
                                            <TableCell>{displayProductCode || '---'}<br /><Typography variant="caption" color="text.secondary">{row.PhoiSelectionMode === 'PREVIOUS_STAGE_BTP' ? `BTP sau công đoạn May · ${row.ProductName || '---'}` : (row.ProductName || '---')}</Typography></TableCell>
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
