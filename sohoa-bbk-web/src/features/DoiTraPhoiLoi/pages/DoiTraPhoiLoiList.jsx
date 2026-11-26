import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, IconButton, MenuItem, Paper, Popover, Stack, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, Tab, Tabs, TextField,
    Tooltip, Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import {
    deleteDoiTraPhoiLoi, exportDoiTraSummaryExcel, getDoiTraPhoiLoiList,
    previewDoiTraSummary
} from '../../../api/doiTraPhoiLoi.api';
import { getCurrentUser } from '../../../utils/auth';
import {
    DOI_TRA_DINH_MUC_STATUS_META, DOI_TRA_STATUS_META, doiTraDinhMucStatusMeta,
    doiTraProductionDepartmentLabel, doiTraStatusMeta,
    formatDoiTraDate, formatDoiTraQuantity
} from '../doiTraPhoiLoi.utils';
import DoiTraPhoiLoiSummaryPrintTemplate from '../components/DoiTraPhoiLoiSummaryPrintTemplate';
import DoiTraDefectFlowReport from '../components/DoiTraDefectFlowReport';

const emptyColumnFilters = {
    ticketNo: '', createdDate: '', planOrder: '', product: '', operationDepartment: '',
    planQuantity: '', creator: '', status: '', warehouseStatus: '', b7Status: ''
};

const columnFilterQueryKeys = {
    ticketNo: 'fTicket', createdDate: 'fCreated', planOrder: 'fPlan', product: 'fProduct',
    operationDepartment: 'fOperation', planQuantity: 'fQuantity', creator: 'fCreator',
    status: 'fStatus', warehouseStatus: 'fWarehouse', b7Status: 'fB7'
};

const readColumnFilters = (searchParams) => Object.fromEntries(
    Object.entries(columnFilterQueryKeys).map(([field, queryKey]) => [field, searchParams.get(queryKey) || ''])
);

const readExpandedGroups = (searchParams) => new Set(
    (searchParams.get('expanded') || '').split(',').map((value) => value.trim()).filter(Boolean)
);

const statusColumnOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    ...Object.entries(DOI_TRA_STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))
];
const warehouseColumnOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'CONFIRMED', label: 'Kho đã xác nhận' },
    { value: 'STOCK_RECORDED', label: 'Đã ghi thẻ kho' },
    { value: 'PENDING', label: 'Chờ Kho xác nhận' },
    { value: 'NOT_CREATED', label: 'Chưa tạo phiếu nhập' }
];
const b7ColumnOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    ...Object.entries(DOI_TRA_DINH_MUC_STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))
];

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

export default function DoiTraPhoiLoiList() {
    const navigate = useNavigate();
    const location = useLocation();
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
    const [filters, setFilters] = useState(() => ({
        keyword: searchParams.get('q') || '',
        status: searchParams.get('status') || '',
        opinionDepartment: searchParams.get('opinionDepartment') || 'all',
        fromDate: searchParams.get('from') || '',
        toDate: searchParams.get('to') || ''
    }));
    const [columnFilters, setColumnFilters] = useState(() => readColumnFilters(searchParams));
    const [filterPopover, setFilterPopover] = useState({ field: '', anchorEl: null });
    const [deletingId, setDeletingId] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState(() => readExpandedGroups(searchParams));
    const user = useMemo(() => getCurrentUser() || {}, []);
    const permissions = user?.permissions || [];
    const isAdmin = permissions.includes('QUAN_TRI_DM')
        || (user?.roles || []).some((role) => String(role).toUpperCase().includes('ADMIN'));
    const canCreate = isAdmin || permissions.includes('THUC_HIEN_KIEM');
    const canDelete = permissions.includes('XOA_HO_SO_KCS');
    const listUrl = `${location.pathname}${location.search}`;
    const updateQuery = useCallback((updates) => {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            Object.entries(updates).forEach(([key, value]) => {
                if (value === '' || value === null || value === undefined || value === 'all') next.delete(key);
                else next.set(key, String(value));
            });
            return next;
        }, { replace: true });
    }, [setSearchParams]);
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

        if (!containsSearch([row.SoPhieuNhom, row.SoPhieu], columnFilters.ticketNo)) return false;
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
            && (!row.SoPhieuNhapBtp || ![4, 5].includes(Number(row.PhieuNhapErpTrangThai)))) return false;
        if (columnFilters.warehouseStatus === 'STOCK_RECORDED'
            && (!row.SoPhieuNhapBtp || Number(row.PhieuNhapErpTrangThai) !== 5)) return false;
        if (columnFilters.warehouseStatus === 'PENDING'
            && (!row.SoPhieuNhapBtp || Number(row.PhieuNhapErpTrangThai) !== 0)) return false;
        if (columnFilters.warehouseStatus === 'NOT_CREATED' && row.SoPhieuNhapBtp) return false;
        if (columnFilters.b7Status && row.DinhMucTrangThai !== columnFilters.b7Status) return false;
        return true;
    }), [columnFilters, filters.opinionDepartment, managedDepartmentIds, rows]);
    const printableRows = filteredRows.filter((row) => row.TrangThai !== 'DA_HUY');
    const groupedRows = useMemo(() => {
        const groups = new Map();
        filteredRows.forEach((row) => {
            const key = Number(row.NhomPhieuId) || `single:${row.Id}`;
            const current = groups.get(key) || { key, rows: [] };
            current.rows.push(row);
            groups.set(key, current);
        });
        return [...groups.values()].map((group) => {
            const activeRows = group.rows.filter((row) => row.TrangThai !== 'DA_HUY');
            const completedCount = activeRows.filter((row) => row.TrangThai === 'HOAN_TAT').length;
            const cancelledCount = group.rows.length - activeRows.length;
            const warehouseConfirmedCount = activeRows.filter((row) => [4, 5].includes(Number(row.PhieuNhapErpTrangThai))).length;
            const stockCardRecordedCount = activeRows.filter((row) => Number(row.PhieuNhapErpTrangThai) === 5).length;
            const warehouseCreatedCount = activeRows.filter((row) => Boolean(row.SoPhieuNhapBtp)).length;
            const b7Rows = activeRows.filter((row) => row.DinhMucTrangThai !== 'KHONG_AP_DUNG');
            const b7ConfirmedCount = b7Rows.filter((row) => row.DinhMucTrangThai === 'DA_XAC_NHAN').length;
            const pendingOpinionDepartments = [...new Set(activeRows
                .filter((row) => row.TrangThai === 'CHO_Y_KIEN_KPH' && row.BoPhanChuaXacNhanText)
                .map((row) => row.BoPhanChuaXacNhanText))];
            const firstRow = group.rows[0];
            let statusLabel = `${completedCount}/${activeRows.length} kế hoạch hoàn tất`;
            let statusColor = completedCount === activeRows.length && activeRows.length > 0 ? 'success' : 'info';
            if (!activeRows.length) {
                statusLabel = 'Đã hủy toàn bộ';
                statusColor = 'error';
            } else if (completedCount === 0 && activeRows.every((row) => row.TrangThai === 'TAO_MOI')) {
                statusLabel = 'Chưa bắt đầu xử lý';
                statusColor = 'default';
            }
            return {
                ...group, firstRow, activeRows, completedCount, cancelledCount, statusLabel, statusColor,
                warehouseConfirmedCount, stockCardRecordedCount, warehouseCreatedCount, b7Rows, b7ConfirmedCount,
                pendingOpinionDepartments
            };
        });
    }, [filteredRows]);
    const printableIdSet = new Set(printableRows.map((row) => Number(row.Id)));
    const visibleSelectedIds = selectedIds.filter((id) => printableIdSet.has(Number(id)));

    const toggleGroup = (key) => {
        const normalizedKey = String(key);
        const next = new Set(expandedGroups);
        if (next.has(normalizedKey)) next.delete(normalizedKey); else next.add(normalizedKey);
        setExpandedGroups(next);
        updateQuery({ expanded: [...next].join(',') });
    };

    const setMainFilter = (name, value) => {
        setSelectedIds([]);
        setFilters((current) => ({ ...current, [name]: value }));
        const queryKeys = { keyword: 'q', status: 'status', opinionDepartment: 'opinionDepartment', fromDate: 'from', toDate: 'to' };
        updateQuery({ [queryKeys[name]]: value });
    };

    const toggleGroupSelection = (group, checked) => {
        const groupIds = group.activeRows.map((row) => Number(row.Id));
        setSelectedIds((current) => checked
            ? [...new Set([...current.map(Number), ...groupIds])]
            : current.filter((id) => !groupIds.includes(Number(id))));
    };

    const setColumnFilter = (name, value) => {
        setSelectedIds([]);
        setColumnFilters((current) => ({ ...current, [name]: value }));
        updateQuery({ [columnFilterQueryKeys[name]]: value });
    };

    const closeFilterPopover = () => setFilterPopover({ field: '', anchorEl: null });
    const clearColumnFilters = () => {
        setSelectedIds([]);
        setColumnFilters(emptyColumnFilters);
        updateQuery(Object.fromEntries(Object.values(columnFilterQueryKeys).map((key) => [key, ''])));
        closeFilterPopover();
    };
    const renderFilterHeader = ({ field, label, placeholder, options, type = 'text' }) => {
        const value = columnFilters[field];
        const isOpen = filterPopover.field === field;
        const hasValue = Boolean(value);
        return <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="space-between">
            <span>{label}</span>
            <Tooltip title={`Lọc ${label.toLocaleLowerCase('vi')}`}>
                <IconButton size="small" color={hasValue ? 'primary' : 'default'}
                    onClick={(event) => {
                        event.stopPropagation();
                        setFilterPopover({ field, anchorEl: event.currentTarget });
                    }}
                    sx={{ width: 28, height: 28, bgcolor: hasValue ? 'action.selected' : 'transparent' }}>
                    <FilterListIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Popover open={isOpen} anchorEl={filterPopover.anchorEl} onClose={closeFilterPopover}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                onClick={(event) => event.stopPropagation()}>
                <Box sx={{ p: 2, width: 290 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>{label}</Typography>
                    <TextField autoFocus select={Boolean(options)} fullWidth size="small" type={type}
                        placeholder={placeholder} value={value}
                        onChange={(event) => setColumnFilter(field, event.target.value)}
                        onKeyDown={(event) => event.key === 'Escape' && closeFilterPopover()}
                        slotProps={type === 'date' ? { inputLabel: { shrink: true } } : undefined}>
                        {options?.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                    </TextField>
                    <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2 }}>
                        <Button variant="outlined" size="small" onClick={() => setColumnFilter(field, '')}>Bỏ lọc</Button>
                        <Button variant="contained" size="small" onClick={closeFilterPopover}>Đóng</Button>
                    </Stack>
                </Box>
            </Popover>
        </Stack>;
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
    useEffect(() => {
        setFilters({
            keyword: searchParams.get('q') || '',
            status: searchParams.get('status') || '',
            opinionDepartment: searchParams.get('opinionDepartment') || 'all',
            fromDate: searchParams.get('from') || '',
            toDate: searchParams.get('to') || ''
        });
        setColumnFilters(readColumnFilters(searchParams));
        setExpandedGroups(readExpandedGroups(searchParams));
    }, [searchParams]);

    const openDetail = (phieuId) => navigate(`/doi-tra-phoi-loi/${phieuId}`, {
        state: { returnTo: listUrl }
    });

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
        if (!window.confirm(`Xóa kế hoạch ${row.PlanNo || row.PlanID || row.SoPhieu || row.Id} khỏi phiếu ${row.SoPhieuNhom || row.SoPhieu}? Toàn bộ dữ liệu xử lý riêng của kế hoạch này sẽ bị xóa và không thể hoàn tác.`)) return;
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
                <Tabs value={activeTab} onChange={(_event, value) => updateQuery({ tab: value === 'report' ? 'report' : '' })}>
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
                        onChange={(event) => setMainFilter('keyword', event.target.value)}
                        slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.disabled' }} /> } }}
                        sx={{ flex: 1, minWidth: 260 }}
                    />
                    <TextField select size="small" label="Trạng thái" value={filters.status}
                        onChange={(event) => setMainFilter('status', event.target.value)}
                        sx={{ minWidth: 210 }}>
                        <MenuItem value="">Tất cả trạng thái</MenuItem>
                        {Object.entries(DOI_TRA_STATUS_META).map(([value, meta]) => (
                            <MenuItem key={value} value={value}>{meta.label}</MenuItem>
                        ))}
                    </TextField>
                    <TextField select size="small" label="Bộ phận được xin ý kiến" value={filters.opinionDepartment}
                        onChange={(event) => {
                            setMainFilter('opinionDepartment', event.target.value);
                        }} sx={{ minWidth: 250 }}>
                        <MenuItem value="all">Tất cả bộ phận được xin ý kiến</MenuItem>
                        {managedDepartmentIds.size > 0 && <MenuItem value="mine">Bộ phận của tôi</MenuItem>}
                        {opinionDepartmentOptions.map((department) => (
                            <MenuItem key={department.id} value={String(department.id)}>{department.label}</MenuItem>
                        ))}
                    </TextField>
                    <TextField size="small" type="date" label="Từ ngày" value={filters.fromDate}
                        onChange={(event) => setMainFilter('fromDate', event.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }} />
                    <TextField size="small" type="date" label="Đến ngày" value={filters.toDate}
                        onChange={(event) => setMainFilter('toDate', event.target.value)}
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
                                    <TableCell>{renderFilterHeader({ field: 'ticketNo', label: 'Số phiếu', placeholder: 'Nhập số phiếu' })}</TableCell>
                                    <TableCell>{renderFilterHeader({ field: 'createdDate', label: 'Ngày lập', type: 'date' })}</TableCell>
                                    <TableCell>{renderFilterHeader({ field: 'planOrder', label: 'Kế hoạch / Đơn hàng', placeholder: 'Nhập kế hoạch hoặc đơn hàng' })}</TableCell>
                                    <TableCell>{renderFilterHeader({ field: 'product', label: 'Sản phẩm', placeholder: 'Nhập mã hoặc tên sản phẩm' })}</TableCell>
                                    <TableCell>{renderFilterHeader({ field: 'operationDepartment', label: 'Công đoạn / Bộ phận', placeholder: 'Nhập công đoạn hoặc bộ phận' })}</TableCell>
                                    <TableCell align="right">{renderFilterHeader({ field: 'planQuantity', label: 'Số lượng KH', placeholder: 'Nhập số lượng', type: 'number' })}</TableCell>
                                    <TableCell>{renderFilterHeader({ field: 'creator', label: 'Người lập', placeholder: 'Nhập tên người lập' })}</TableCell>
                                    <TableCell>{renderFilterHeader({ field: 'status', label: 'Trạng thái', options: statusColumnOptions })}</TableCell>
                                    <TableCell>{renderFilterHeader({ field: 'warehouseStatus', label: 'Kho / thẻ kho', options: warehouseColumnOptions })}</TableCell>
                                    <TableCell>{renderFilterHeader({ field: 'b7Status', label: 'Trạng thái B7', options: b7ColumnOptions })}</TableCell>
                                    <TableCell align="center">{Object.values(columnFilters).some(Boolean) && <Tooltip title="Xóa toàn bộ bộ lọc cột"><IconButton size="small" color="primary" onClick={clearColumnFilters}><RestartAltIcon fontSize="small" /></IconButton></Tooltip>}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredRows.length === 0 && <TableRow><TableCell colSpan={12}>
                                    <Alert severity="info">Chưa có phiếu đổi trả phôi lỗi phù hợp. Bạn có thể thay đổi hoặc xóa bộ lọc ngay trên đầu cột.</Alert>
                                </TableCell></TableRow>}
                                {groupedRows.map((group) => {
                                    const isExpanded = expandedGroups.has(String(group.key));
                                    const groupSelectedCount = group.activeRows.filter((row) => selectedIds.includes(row.Id)).length;
                                    return [
                                        <TableRow key={`group-${group.key}`} sx={{ bgcolor: '#f8fafc', '& > td': { borderBottomColor: 'divider' } }}>
                                            <TableCell padding="checkbox">
                                                <Checkbox disabled={!group.activeRows.length}
                                                    checked={group.activeRows.length > 0 && groupSelectedCount === group.activeRows.length}
                                                    indeterminate={groupSelectedCount > 0 && groupSelectedCount < group.activeRows.length}
                                                    onChange={(event) => toggleGroupSelection(group, event.target.checked)} />
                                            </TableCell>
                                            <TableCell colSpan={7} sx={{ py: 1.25 }}>
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                                                        <IconButton size="small" onClick={() => toggleGroup(group.key)} aria-label={isExpanded ? 'Thu gọn kế hoạch' : 'Mở danh sách kế hoạch'}>
                                                            {isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                                                        </IconButton>
                                                        <Box sx={{ minWidth: 0 }}>
                                                            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                                                                <Typography fontWeight={800} color="primary.main">{group.firstRow.SoPhieuNhom || group.firstRow.SoPhieu}</Typography>
                                                                <Chip size="small" variant="outlined" label={`${group.rows.length} kế hoạch`} />
                                                                {group.cancelledCount > 0 && <Chip size="small" color="error" variant="outlined" label={`${group.cancelledCount} đã hủy`} />}
                                                            </Stack>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Ngày lập {formatDoiTraDate(group.firstRow.NgayLap)} · Người lập: {group.firstRow.TenNguoiLap || '---'}
                                                            </Typography>
                                                        </Box>
                                                </Stack>
                                            </TableCell>
                                            <TableCell sx={{ minWidth: 210 }}>
                                                <Chip size="small" color={group.statusColor} label={group.statusLabel} />
                                                {group.pendingOpinionDepartments.length > 0 && <Typography variant="caption" color="warning.dark" fontWeight={700} display="block" sx={{ mt: 0.5, whiteSpace: 'normal' }}>
                                                    Chờ ý kiến: {group.pendingOpinionDepartments.join('; ')}
                                                </Typography>}
                                            </TableCell>
                                            <TableCell sx={{ minWidth: 165 }}>
                                                <Chip size="small" variant="outlined"
                                                    color={group.warehouseConfirmedCount === group.activeRows.length && group.activeRows.length ? 'success' : 'warning'}
                                                    label={`Kho ${group.warehouseConfirmedCount}/${group.activeRows.length}`} />
                                                <Chip size="small" variant="outlined" sx={{ ml: 0.5 }}
                                                    color={group.stockCardRecordedCount === group.activeRows.length && group.activeRows.length ? 'success' : 'warning'}
                                                    label={`Thẻ ${group.stockCardRecordedCount}/${group.activeRows.length}`} />
                                                {group.warehouseCreatedCount < group.activeRows.length && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                                    {group.activeRows.length - group.warehouseCreatedCount} KH chưa tạo phiếu nhập
                                                </Typography>}
                                            </TableCell>
                                            <TableCell sx={{ minWidth: 145 }}>
                                                {group.b7Rows.length > 0
                                                    ? <Chip size="small" variant="outlined" color={group.b7ConfirmedCount === group.b7Rows.length ? 'success' : 'warning'} label={`B7 ${group.b7ConfirmedCount}/${group.b7Rows.length}`} />
                                                    : <Chip size="small" variant="outlined" label="Không áp dụng B7" />}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title={isExpanded ? 'Thu gọn kế hoạch' : 'Xem chi tiết từng kế hoạch'}>
                                                    <IconButton color="primary" onClick={() => toggleGroup(group.key)}>
                                                        {isExpanded ? <KeyboardArrowDownIcon /> : <VisibilityOutlinedIcon />}
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Mở phiếu"><IconButton color="primary" onClick={() => openDetail(group.firstRow.Id)}><KeyboardArrowRightIcon /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>,
                                        ...(isExpanded ? group.rows.map((row) => {
                                            const status = doiTraStatusMeta(row.TrangThai);
                                            const dinhMucStatus = doiTraDinhMucStatusMeta(row.DinhMucTrangThai);
                                            const displayProductCode = row.PhoiSelectionMode === 'PREVIOUS_STAGE_BTP'
                                                ? [row.ProductCode, row.BtpStageSuffix || 'M'].filter(Boolean).join('.')
                                                : row.ProductCode;
                                            return <TableRow key={row.Id} hover sx={{ '& > td': { bgcolor: '#fff' } }}>
                                            <TableCell padding="checkbox" sx={{ pl: 3 }}><Checkbox disabled={row.TrangThai === 'DA_HUY'} checked={selectedIds.includes(row.Id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, row.Id] : current.filter((id) => id !== row.Id))} /></TableCell>
                                            <TableCell>
                                                <Chip size="small" color="primary" variant="outlined" label={`KH ${row.ThuTuHienThi || 1}/${row.SoKeHoach || group.rows.length}`} />
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{row.SoPhieu}</Typography>
                                            </TableCell>
                                            <TableCell>{formatDoiTraDate(row.NgayLap)}</TableCell>
                                            <TableCell>{row.PlanNo || row.PlanID || '---'}<br /><Typography variant="caption" color="text.secondary">{row.OrderCode || '---'}</Typography></TableCell>
                                            <TableCell>{displayProductCode || '---'}<br /><Typography variant="caption" color="text.secondary">{row.PhoiSelectionMode === 'PREVIOUS_STAGE_BTP' ? `BTP sau công đoạn May · ${row.ProductName || '---'}` : (row.ProductName || '---')}</Typography></TableCell>
                                            <TableCell>{row.OperationName || row.OperationCode || '---'}<br /><Typography variant="caption" color="text.secondary">{doiTraProductionDepartmentLabel(row, row.DepartmentName || '---')}</Typography></TableCell>
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
                                                        color={Number(row.PhieuNhapErpTrangThai) === 5 ? 'success' : Number(row.PhieuNhapErpTrangThai) === 4 ? 'info' : 'warning'}
                                                        label={Number(row.PhieuNhapErpTrangThai) === 5 ? 'Đã ghi thẻ kho' : Number(row.PhieuNhapErpTrangThai) === 4 ? 'Kho đã xác nhận' : 'Chờ Kho xác nhận'} />
                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                                        {row.SoPhieuNhapBtp}
                                                    </Typography>
                                                    {row.WarehouseConfirmedAt && <Typography variant="caption" color="text.secondary" display="block">
                                                        Kho: {[row.TenKhoXacNhan, formatDoiTraDate(row.WarehouseConfirmedAt, true)].filter((value) => value && value !== '---').join(' — ')}
                                                    </Typography>}
                                                    {row.StockCardRecordedAt && <Typography variant="caption" color="text.secondary" display="block">
                                                        Thẻ kho: {[row.TenNguoiGhiTheKho, formatDoiTraDate(row.StockCardRecordedAt, true)].filter((value) => value && value !== '---').join(' — ')}
                                                    </Typography>}
                                                </> : <Chip size="small" variant="outlined" label="Chưa tạo phiếu nhập" />}
                                            </TableCell>
                                            <TableCell sx={{ minWidth: 150 }}>
                                                <Chip size="small" variant="outlined" color={dinhMucStatus.color} label={dinhMucStatus.label} />
                                                {row.DinhMucTrangThai === 'DA_XAC_NHAN' && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                                    {[row.TenB7XacNhan, formatDoiTraDate(row.B7ConfirmedAt, true)].filter((value) => value && value !== '---').join(' — ')}
                                                </Typography>}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                                    <Button size="small" startIcon={<VisibilityOutlinedIcon />} onClick={() => openDetail(row.Id)}>Xem</Button>
                                                    {canDelete && <Tooltip title="Chỉ xóa kế hoạch này khỏi phiếu"><Button size="small" color="error" startIcon={deletingId === row.Id ? <CircularProgress size={16} /> : <DeleteOutlineIcon />} disabled={deletingId !== null} onClick={() => deleteTicket(row)}>{deletingId === row.Id ? 'Đang xóa…' : 'Xóa KH'}</Button></Tooltip>}
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                        }) : [])
                                    ];
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
