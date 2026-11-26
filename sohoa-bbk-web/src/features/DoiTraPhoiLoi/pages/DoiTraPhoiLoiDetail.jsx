import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert, Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress, Collapse, Dialog,
    DialogActions, DialogContent, DialogTitle, Divider, Grid, Paper, Stack, Step,
    StepLabel, Stepper, Tab, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Tabs, TextField, Typography, MenuItem
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import HistoryIcon from '@mui/icons-material/History';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import BuildCircleOutlinedIcon from '@mui/icons-material/BuildCircleOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import {
    cancelDoiTraPhoiLoi, deleteDoiTraPhoiLoi, executeDoiTraAction,
    exportDoiTraSummaryExcel, getDoiTraKph, getDoiTraPhoiLoiDetail,
    updateDoiTraReceiptBtpType
} from '../../../api/doiTraPhoiLoi.api';
import { hasPermission } from '../../../utils/auth';
import DoiTraPhoiLoiSummaryPrintTemplate from '../components/DoiTraPhoiLoiSummaryPrintTemplate';
import DoiTraPhoiLoiPrintTemplate from '../components/DoiTraPhoiLoiPrintTemplate';
import DoiTraPhoiEditor from '../components/DoiTraPhoiEditor';
import DoiTraDinhMucEditor from '../components/DoiTraDinhMucEditor';
import DoiTraKphWorkflow from '../components/DoiTraKphWorkflow';
import {
    doiTraDinhMucStatusMeta, doiTraHistoryActionLabel, doiTraProductionDepartmentLabel, doiTraStatusMeta,
    formatDoiTraDate, formatDoiTraQuantity
} from '../doiTraPhoiLoi.utils';

const Info = ({ label, value }) => (
    <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" fontWeight={700}>{value || '---'}</Typography>
    </Box>
);
const DETAIL_TABS = ['overview', 'phoi', 'inspection', 'kph', 'quota', 'history'];
const buildReceiptDrafts = (suggestions = []) => Object.values(suggestions.reduce((groups, item) => {
    const processId = Number(item.SuggestedProcessId) || '';
    const key = processId ? `PROCESS:${processId}` : `UNMAPPED:${item.PhoiId}`;
    if (!groups[key]) {
        groups[key] = {
            key,
            processId,
            warehouseId: '',
            quantity: Number(item.SuggestedQuantity) || '',
            items: []
        };
    }
    groups[key].quantity = Math.max(Number(groups[key].quantity) || 0, Number(item.SuggestedQuantity) || 0) || '';
    groups[key].items.push(item);
    return groups;
}, {}));
export default function DoiTraPhoiLoiDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const summaryPrintRef = useRef(null);
    const kphPrintRef = useRef(null);
    const [data, setData] = useState({ phieu: null, plans: [], history: [], phoiItems: [], dinhMucItems: [], workflow: { steps: [], availableActions: [] }, defectGroups: [], capabilities: {} });
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [printOpen, setPrintOpen] = useState(false);
    const [printTab, setPrintTab] = useState('summary');
    const [kphData, setKphData] = useState(null);
    const [phoiDirty, setPhoiDirty] = useState(false);
    const [quotaDirty, setQuotaDirty] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [actionDialog, setActionDialog] = useState(null);
    const [actionNote, setActionNote] = useState('');
    const [receiptDrafts, setReceiptDrafts] = useState([]);
    const [actionLoading, setActionLoading] = useState(false);
    const [editReceiptBtpTypeOpen, setEditReceiptBtpTypeOpen] = useState(false);
    const [editReceiptBtpTypeId, setEditReceiptBtpTypeId] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [exportingExcel, setExportingExcel] = useState(false);

    const load = useCallback(async ({ background = false } = {}) => {
        try {
            if (!background) setLoading(true);
            const response = await getDoiTraPhoiLoiDetail(id);
            setData(response.data || { phieu: null, plans: [], history: [], phoiItems: [], workflow: { steps: [] }, defectGroups: [], capabilities: {} });
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không tải được phiếu đổi trả phôi lỗi.');
        } finally {
            if (!background) setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        if (!data.phieu) return;
        if (searchParams.get('tab') === 'quota' && !data.plans?.[0]?.RequiresB7) {
            setSearchParams({ tab: 'overview' }, { replace: true, state: location.state });
            return;
        }
    }, [data, location.state, searchParams, setSearchParams]);
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!phoiDirty && !quotaDirty) return;
            event.preventDefault(); event.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [phoiDirty, quotaDirty]);

    const printSummary = useReactToPrint({
        contentRef: summaryPrintRef,
        documentTitle: data.phieu?.SoPhieu ? `TongHopDoiTra_${data.phieu.SoPhieu}` : 'TongHopDoiTraPhoiLoi'
    });
    const printKph = useReactToPrint({
        contentRef: kphPrintRef,
        documentTitle: data.phieu?.SoPhieu ? `KPH_${data.phieu.SoPhieu}` : 'XuLyKPH_DoiTraPhoiLoi'
    });
    const activeTab = DETAIL_TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'overview';
    const hasUnsavedChanges = phoiDirty || quotaDirty;
    const changeTab = (_, nextTab) => {
        if (hasUnsavedChanges && !window.confirm('Bạn có thay đổi chưa lưu. Bỏ thay đổi và chuyển sang khu vực khác?')) return;
        setPhoiDirty(false); setQuotaDirty(false); setSearchParams({ tab: nextTab }, { state: location.state });
    };
    const goBack = () => {
        if (hasUnsavedChanges && !window.confirm('Bạn có thay đổi chưa lưu. Bỏ thay đổi và quay lại danh sách?')) return;
        navigate(location.state?.returnTo || '/doi-tra-phoi-loi');
    };
    const openPrintPreview = async () => {
        setPrintTab('summary'); setPrintOpen(true);
        if (Number(data.workflow?.definition?.VersionNo) < 5 || kphData) return;
        try {
            const response = await getDoiTraKph(id);
            setKphData(response.data || null);
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không tải được dữ liệu bản in KPH.');
        }
    };

    const exportSummaryExcel = async () => {
        try {
            setExportingExcel(true);
            const response = await exportDoiTraSummaryExcel([Number(id)]);
            const url = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            const safeNumber = String(data.phieu?.SoPhieuNhom || data.phieu?.SoPhieu || id).replace(/[^\w.-]+/g, '_');
            link.href = url;
            link.download = `tong-hop-doi-phoi-${safeNumber}.xlsx`;
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

    const cancel = async () => {
        if (!window.confirm('Hủy phiếu nháp này? Phiếu sẽ được giữ lại trong lịch sử.')) return;
        try {
            setCancelling(true);
            await cancelDoiTraPhoiLoi(id, data.phieu.RowVersion);
            await load({ background: true });
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không hủy được phiếu.');
        } finally {
            setCancelling(false);
        }
    };

    const deleteTicket = async () => {
        if (!window.confirm(`Xóa phiếu ${data.phieu.SoPhieu} cùng toàn bộ dữ liệu liên quan? Hành động này không thể hoàn tác.`)) return;
        try {
            setDeleting(true);
            await deleteDoiTraPhoiLoi(id);
            navigate('/doi-tra-phoi-loi', { replace: true });
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không thể xóa phiếu đổi trả phôi lỗi.');
        } finally {
            setDeleting(false);
        }
    };

    const openAction = async (action) => {
        if (phoiDirty && ['KCS_SUBMIT', 'KCS_RESUBMIT'].includes(action.ActionCode)) {
            return window.alert('Danh sách phôi đang có thay đổi chưa lưu. Vui lòng lưu nháp trước.');
        }
        setActionDialog(action);
        setActionNote('');
        setReceiptDrafts(buildReceiptDrafts(data.receiptSuggestions));
    };

    const executeAction = async () => {
        if (!actionDialog) return;
        if (actionDialog.ActionCode === 'TBP_RETURN' && !actionNote.trim()) return window.alert('Vui lòng nhập lý do trả lại.');
        const isKcsCompletion = ['KCS_SUBMIT', 'KCS_RESUBMIT'].includes(actionDialog.ActionCode);
        if (isKcsCompletion) {
            if (!receiptDrafts.length || receiptDrafts.some((item) => !Number(item.processId)
                || !Number(item.warehouseId) || !Number(item.quantity))) {
                return window.alert('Vui lòng nhập đủ Loại BTP, Kho nhập và Số lượng cho tất cả phiếu nhập dự kiến.');
            }
            if (new Set(receiptDrafts.map((item) => Number(item.processId))).size !== receiptDrafts.length) {
                return window.alert('Hai phiếu nhập dự kiến đang chọn cùng Loại BTP. Vui lòng gộp hoặc chọn lại loại BTP.');
            }
            if (receiptDrafts.some((item) => Number(item.quantity) > Number(data.plans?.[0]?.PlanQty || 0)
                || Math.abs(Number(item.quantity) * 100 - Math.round(Number(item.quantity) * 100)) > 1e-8)) {
                return window.alert('Số lượng mỗi phiếu phải lớn hơn 0, tối đa 2 chữ số thập phân và không vượt số lượng kế hoạch.');
            }
        }
        try {
            setActionLoading(true);
            await executeDoiTraAction(id, actionDialog.ActionCode, {
                rowVersion: data.phieu.RowVersion,
                ghiChu: actionNote.trim() || null,
                receipts: isKcsCompletion ? receiptDrafts.map((item) => ({
                    quyTrinhSanXuatId: Number(item.processId),
                    khoNhapId: Number(item.warehouseId),
                    soLuongBtpLoi: Number(item.quantity),
                    phoiIds: item.items.map((phoi) => Number(phoi.PhoiId)),
                    suggestedProcessByPhoi: Object.fromEntries(item.items.map((phoi) => [phoi.PhoiId, phoi.SuggestedProcessId || null]))
                })) : null
            });
            setActionDialog(null);
            await load({ background: true });
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không thực hiện được thao tác.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <Box sx={{ py: 10, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
    if (!data.phieu) return <Alert severity="error">Không tìm thấy phiếu đổi trả phôi lỗi.</Alert>;

    const { phieu, plans, siblingPlans = [], history, phoiItems = [], dinhMucItems = [], lenhXuatVatTuItems = [], phieuNhapBtpItems = [], warehouses = [], btpTypes = [], workflow = {}, defectGroups = [], capabilities } = data;
    const btpTypeNameById = new Map(btpTypes.map((item) => [Number(item.Id), item.TenQuyTrinh]));
    const plan = plans[0] || {};
    const currentSibling = siblingPlans.find((item) => Number(item.Id) === Number(id));
    const requiresB7 = Boolean(plan.RequiresB7);
    const isStageBtp = plan.PhoiSelectionMode === 'PREVIOUS_STAGE_BTP';
    const displayProductCode = isStageBtp
        ? [plan.ProductCode, plan.BtpStageSuffix || 'M'].filter(Boolean).join('.')
        : plan.ProductCode;
    const status = doiTraStatusMeta(phieu.TrangThai);
    const workflowSteps = workflow.steps || [];
    const mainSteps = workflowSteps.filter((step) => String(step.TrackCode || 'MAIN').toUpperCase() !== 'DINH_MUC'
        && (step.StepCode !== 'KPH_BGD' || Boolean(phieu.RequiresExecutiveApproval)));
    const configuredStepIndex = mainSteps.findIndex((step) => step.IsCurrent);
    const activeStep = phieu.TrangThai === 'HOAN_TAT'
        ? mainSteps.length
        : (configuredStepIndex >= 0 ? configuredStepIndex : Math.min(status.step, Math.max(mainSteps.length - 1, 0)));
    const isKphWorkflow = Number(workflow.definition?.VersionNo) >= 5;
    const availableActions = workflow.availableActions || [];
    const regularActions = availableActions.filter((action) => !['B7_CONFIRM', 'KHO_CONFIRM', 'STOCK_CARD_RECORD'].includes(action.ActionCode));
    const canB7Confirm = Boolean(capabilities.canConfirmDinhMuc);
    const quotaStatus = doiTraDinhMucStatusMeta(phieu.DinhMucTrangThai);
    const expectedBtp = Number(plan.ExpectedBtpCount) === 1
        ? [plan.ExpectedBtpCode, plan.ExpectedBtpName].filter(Boolean).join(' — ')
        : 'Không xác định duy nhất';
    const activeReceipt = phieuNhapBtpItems.find((item) => item.TrangThai === 'ACTIVE');
    const activeReceipts = phieuNhapBtpItems.filter((item) => item.TrangThai === 'ACTIVE');
    const warehouseConfirmed = activeReceipts.length > 0
        && activeReceipts.every((item) => [4, 5].includes(Number(item.ErpTrangThai)));
    const stockCardRecorded = activeReceipts.length > 0
        && activeReceipts.every((item) => Number(item.ErpTrangThai) === 5);
    const updateReceiptDraft = (key, field, value) => setReceiptDrafts((current) => {
        const source = current.find((item) => item.key === key);
        if (!source) return current;
        if (field === 'processId' && value) {
            const target = current.find((item) => item.key !== key && Number(item.processId) === Number(value));
            if (target) {
                return current.filter((item) => item.key !== key).map((item) => item.key === target.key ? {
                    ...item,
                    items: [...item.items, ...source.items],
                    quantity: Math.max(Number(item.quantity) || 0, Number(source.quantity) || 0) || '',
                    warehouseId: item.warehouseId || source.warehouseId
                } : item);
            }
        }
        return current.map((item) => item.key === key ? { ...item, [field]: value } : item);
    });
    const openEditReceiptBtpType = () => {
        setEditReceiptBtpTypeId(activeReceipt?.SourceQuyTrinhSanXuatId || '');
        setEditReceiptBtpTypeOpen(true);
    };
    const saveReceiptBtpType = async () => {
        if (!Number(editReceiptBtpTypeId)) return window.alert('Vui lòng chọn Loại BTP.');
        try {
            setActionLoading(true);
            await updateDoiTraReceiptBtpType(id, Number(editReceiptBtpTypeId));
            setEditReceiptBtpTypeOpen(false);
            await load({ background: true });
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không cập nhật được loại BTP.');
        } finally {
            setActionLoading(false);
        }
    };
    const summaryData = {
        tickets: [{ ...plan, ...phieu, SoPhieu: phieu.SoPhieuNhom || phieu.SoPhieu }],
        phoiItems,
        dinhMucItems,
        phieuNhapBtpItems,
        defectGroups,
    };

    return (
        <Box>
            <Button startIcon={<ArrowBackIcon />} onClick={goBack} sx={{ mb: 1 }}>Quay lại danh sách</Button>
            {siblingPlans.length > 1 && <Paper variant="outlined" sx={{ p: 1.25, mb: 2, borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
                    <Box sx={{ minWidth: { md: 220 } }}>
                        <Typography fontWeight={900}>Kế hoạch đang xử lý</Typography>
                        <Typography variant="caption" color="text.secondary">{siblingPlans.length} kế hoạch trong phiếu · nhập để tìm nhanh</Typography>
                    </Box>
                    <Autocomplete
                        size="small"
                        fullWidth
                        disableClearable
                        options={siblingPlans}
                        value={currentSibling || siblingPlans[0]}
                        isOptionEqualToValue={(option, value) => Number(option.Id) === Number(value.Id)}
                        getOptionLabel={(item) => `KH ${item.ThuTuHienThi} · ${item.PlanNo || item.PlanID || '---'} · ${doiTraStatusMeta(item.TrangThai).label}`}
                        onChange={(_event, item) => {
                            if (!item || Number(item.Id) === Number(id)) return;
                            if (hasUnsavedChanges && !window.confirm('Bỏ thay đổi chưa lưu và chuyển sang kế hoạch khác?')) return;
                            setPhoiDirty(false); setQuotaDirty(false);
                            navigate(`/doi-tra-phoi-loi/${item.Id}?tab=${activeTab}`, { state: location.state });
                        }}
                        renderOption={(props, item) => {
                            const itemStatus = doiTraStatusMeta(item.TrangThai);
                            return <Box component="li" {...props} key={item.Id} sx={{ gap: 1 }}>
                                <Chip size="small" variant="outlined" label={`KH ${item.ThuTuHienThi}`} />
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography variant="body2" fontWeight={800} noWrap>{item.PlanNo || item.PlanID || '---'}</Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>{item.OrderCode || item.ProductCode || '---'}</Typography>
                                </Box>
                                <Chip size="small" color={itemStatus.color} label={itemStatus.label} />
                            </Box>;
                        }}
                        renderInput={(params) => <TextField {...params} placeholder="Tìm kế hoạch trong phiếu" />}
                        slotProps={{ listbox: { sx: { maxHeight: 360 } } }}
                    />
                </Stack>
            </Paper>}
            <Paper variant="outlined" sx={{ position: { md: 'sticky' }, top: { md: 8 }, zIndex: 4, mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: { md: '0 6px 22px rgba(15,23,42,.08)' } }}>
                <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5}>
                        <Box sx={{ minWidth: 0 }}><Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap><Typography variant="h5" fontWeight={900}>{phieu.SoPhieuNhom || phieu.SoPhieu}</Typography>{siblingPlans.length > 1 && <Chip size="small" variant="outlined" label={`Kế hoạch ${currentSibling?.ThuTuHienThi || phieu.ThuTuKeHoach}/${siblingPlans.length}`} />}<Chip size="small" color={status.color} label={status.label} /></Stack><Typography variant="body2" color="text.secondary" noWrap>{[plan.PlanNo || plan.PlanID, displayProductCode, plan.ProductName].filter(Boolean).join(' · ')}</Typography></Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Button size="small" endIcon={<ExpandMoreIcon sx={{ transform: showDetails ? 'rotate(180deg)' : 'none' }} />} onClick={() => setShowDetails((value) => !value)}>Xem chi tiết</Button>
                            {hasPermission('XOA_HO_SO_KCS') && <Button size="small" color="error" variant="outlined" startIcon={deleting ? <CircularProgress size={16} /> : <DeleteOutlineIcon />} disabled={deleting} onClick={deleteTicket}>Xóa</Button>}
                            {capabilities.canCancel && <Button size="small" color="error" variant="outlined" startIcon={<CancelOutlinedIcon />} disabled={cancelling} onClick={cancel}>Hủy</Button>}
                            <Button size="small" variant="contained" startIcon={<PrintIcon />} onClick={openPrintPreview}>Xem trước bản in</Button>
                        </Stack>
                    </Stack>
                    <Grid container spacing={1.5} sx={{ mt: 0.5 }}><Grid size={{ xs: 6, md: 3 }}><Info label="Đơn vị sản xuất" value={doiTraProductionDepartmentLabel(plan, [plan.DepartmentCode, plan.DepartmentName].filter(Boolean).join(' — '))} /></Grid><Grid size={{ xs: 6, md: 3 }}><Info label="Đơn hàng" value={plan.OrderCode} /></Grid><Grid size={{ xs: 6, md: 3 }}><Info label="Người lập" value={phieu.TenNguoiLap} /></Grid><Grid size={{ xs: 6, md: 3 }}><Info label="Ngày lập" value={formatDoiTraDate(phieu.NgayLap)} /></Grid></Grid>
                    <Collapse in={showDetails}><Divider sx={{ my: 1.5 }} /><Grid container spacing={1.5}><Grid size={{ xs: 12, sm: 4 }}><Info label="Công đoạn" value={[plan.OperationCode, plan.OperationName].filter(Boolean).join(' — ')} /></Grid><Grid size={{ xs: 12, sm: 4 }}><Info label="Số lượng kế hoạch" value={formatDoiTraQuantity(plan.PlanQty)} /></Grid><Grid size={{ xs: 12, sm: 4 }}><Info label="Bộ phận gây lỗi" value={[phieu.MaBoPhanGayLoiSnapshot, phieu.TenBoPhanGayLoiSnapshot, phieu.TenDonViGayLoiSnapshot].filter(Boolean).join(' — ')} /></Grid></Grid></Collapse>
                </Box>
                <Box sx={{ px: { xs: 1, md: 2 }, py: 1.25, borderTop: 1, borderColor: 'divider', bgcolor: '#fafbff' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                        <Typography variant="caption" fontWeight={900} color="text.secondary">TIẾN TRÌNH XỬ LÝ</Typography>
                        {requiresB7
                            ? <Chip size="small" color={quotaStatus.color} label={`Đổi trả: ${quotaStatus.label}`} />
                            : <Stack direction="row" spacing={0.75}>
                                <Chip size="small" color={phieu.TrangThai === 'KPH_HOAN_TAT_CHO_KHO' || phieu.TrangThai === 'HOAN_TAT' ? 'success' : 'info'} label={`KPH: ${phieu.TrangThai === 'KPH_HOAN_TAT_CHO_KHO' || phieu.TrangThai === 'HOAN_TAT' ? 'Hoàn tất' : 'Đang xử lý'}`} />
                                <Chip size="small" color={warehouseConfirmed ? 'success' : 'warning'} label={`Kho: ${warehouseConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận'}`} />
                                <Chip size="small" color={stockCardRecorded ? 'success' : 'warning'} label={`Thẻ kho: ${stockCardRecorded ? 'Đã ghi' : 'Chờ ghi'}`} />
                            </Stack>}
                    </Stack>
                    <Box sx={{ overflowX: 'auto', pb: 0.5 }}>
                        <Stepper activeStep={activeStep} alternativeLabel sx={{ minWidth: { xs: 760, md: 0 }, '& .MuiStepLabel-label': { fontSize: '0.72rem', mt: 0.5 } }}>
                            {(mainSteps.length ? mainSteps : [{ StepName: 'KCS kiểm, tạo phiếu nhập và mở KPH' }, { StepName: 'Thiết lập và xử lý KPH' }]).map((step) => <Step key={step.StepCode || step.StepName}><StepLabel>{step.StepName}</StepLabel></Step>)}
                        </Stepper>
                    </Box>
                </Box>
                <Tabs value={activeTab} onChange={changeTab} variant="scrollable" scrollButtons="auto" sx={{ borderTop: 1, borderColor: 'divider', px: 1 }}>
                    <Tab value="overview" icon={<DashboardOutlinedIcon />} iconPosition="start" label="Tổng quan" />
                    <Tab value="phoi" icon={<Inventory2OutlinedIcon />} iconPosition="start" label={`Danh sách phôi (${phoiItems.length})`} />
                    <Tab value="inspection" icon={<TaskAltOutlinedIcon />} iconPosition="start" label={`Kết quả kiểm (${phoiItems.length})`} />
                    {isKphWorkflow && <Tab value="kph" icon={<BuildCircleOutlinedIcon />} iconPosition="start" label={`Xử lý KPH${kphData?.opinions?.filter((item) => !item.HasConfirmed).length ? ` (${kphData.opinions.filter((item) => !item.HasConfirmed).length})` : ''}`} />}
                    {requiresB7 && <Tab value="quota" icon={<CalculateOutlinedIcon />} iconPosition="start" label={quotaStatus.label} />}
                    <Tab value="history" icon={<HistoryIcon />} iconPosition="start" label={`Lịch sử (${history.length})`} />
                </Tabs>
            </Paper>

            {phieu.TrangThai === 'TRA_LAI_KCS' && <Alert severity="warning" sx={{ mb: 2 }}><strong>Lý do trả lại:</strong> {phieu.LyDoTraLai || 'Chưa ghi rõ lý do'}</Alert>}
            {hasUnsavedChanges && <Alert severity="warning" sx={{ mb: 2 }}>Bạn đang có thay đổi chưa lưu. Hãy lưu trước khi chuyển khu vực hoặc thực hiện xác nhận.</Alert>}

            {activeTab === 'overview' && <Stack spacing={2}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 8 }}><Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}><CardContent><Typography fontWeight={900} sx={{ mb: 1.5 }}>Thông tin kế hoạch</Typography><Grid container spacing={1.5}><Grid size={{ xs: 12, sm: 6 }}><Info label="Kế hoạch" value={plan.PlanNo || plan.PlanID} /></Grid><Grid size={{ xs: 12, sm: 6 }}><Info label="Sản phẩm" value={[displayProductCode, plan.ProductName].filter(Boolean).join(' — ')} /></Grid><Grid size={{ xs: 12, sm: 6 }}><Info label="Đơn hàng" value={plan.OrderCode} /></Grid><Grid size={{ xs: 12, sm: 6 }}><Info label="Đơn vị" value={doiTraProductionDepartmentLabel(plan, [plan.DepartmentName, plan.UnitName].filter(Boolean).join(' — '))} /></Grid><Grid size={{ xs: 6, sm: 4 }}><Info label="Công đoạn" value={[plan.OperationCode, plan.OperationName].filter(Boolean).join(' — ')} /></Grid><Grid size={{ xs: 6, sm: 4 }}><Info label="Số lượng kế hoạch" value={formatDoiTraQuantity(plan.PlanQty)} /></Grid><Grid size={{ xs: 12, sm: 4 }}><Info label="Trạng thái ERP" value={plan.ERPPlanStatus} /></Grid>{isStageBtp && <Grid size={{ xs: 12 }}><Info label="Đối tượng kiểm" value={`${displayProductCode} — BTP sau công đoạn May`} /></Grid>}</Grid></CardContent></Card></Grid>
                    <Grid size={{ xs: 12, md: 4 }}><Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}><CardContent><Typography fontWeight={900}>{requiresB7 ? 'KPH, B7 và Kho xử lý độc lập' : 'KPH và Kho xác nhận nhập'}</Typography><Stack direction="row" spacing={1} sx={{ my: 1.5 }} flexWrap="wrap" useFlexGap>{requiresB7 && <Chip size="small" color={quotaStatus.color} label={quotaStatus.label} />} {!requiresB7 && <Chip size="small" variant="outlined" label="Không áp dụng B7" />}<Chip size="small" color={warehouseConfirmed ? 'success' : 'warning'} label={warehouseConfirmed ? 'Kho đã xác nhận nhập' : 'Kho chưa xác nhận nhập'} /><Chip size="small" color={stockCardRecorded ? 'success' : 'warning'} label={stockCardRecorded ? 'Đã ghi thẻ kho' : 'Chưa ghi thẻ kho'} /></Stack><Typography variant="body2" color="text.secondary">{requiresB7 ? 'Ngay khi KCS hoàn tất, hệ thống tạo phiếu nhập BTP lỗi và mở KPH. B7 và Kho có thể xác nhận trên hai nhánh độc lập.' : 'Phiếu Bao gói hoàn tất khi KPH kết thúc và phiếu nhập đã được ghi thẻ kho.'}</Typography></CardContent></Card></Grid>
                </Grid>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}><Typography fontWeight={900} sx={{ mb: 1.5 }}>Thông tin xác nhận</Typography><Grid container spacing={2}><Grid size={{ xs: 12, md: 4 }}><Info label="KCS hoàn tất" value={phieu.KcsCompletedAt ? `${phieu.TenKcsHoanTat || '---'} — ${formatDoiTraDate(phieu.KcsCompletedAt, true)}` : null} /></Grid>{Number(workflow.definition?.VersionNo) < 6 && <Grid size={{ xs: 12, md: 4 }}><Info label="TBP KCS xác nhận" value={phieu.TbpKcsConfirmedAt ? `${phieu.TenTbpKcsXacNhan || '---'} — ${formatDoiTraDate(phieu.TbpKcsConfirmedAt, true)}` : null} /></Grid>}{requiresB7 && <Grid size={{ xs: 12, md: 4 }}><Info label="B7 xác nhận số lượng" value={phieu.B7ConfirmedAt ? `${phieu.TenB7XacNhan || '---'} — ${formatDoiTraDate(phieu.B7ConfirmedAt, true)}` : null} /></Grid>}<Grid size={{ xs: 12, md: 4 }}><Info label="Kho xác nhận nhập" value={activeReceipt?.WarehouseConfirmedAt ? `${activeReceipt.TenKhoXacNhan || '---'} — ${formatDoiTraDate(activeReceipt.WarehouseConfirmedAt, true)}` : null} /></Grid><Grid size={{ xs: 12, md: 4 }}><Info label="Ghi thẻ kho" value={activeReceipt?.StockCardRecordedAt ? `${activeReceipt.TenNguoiGhiTheKho || '---'} — ${formatDoiTraDate(activeReceipt.StockCardRecordedAt, true)}` : null} /></Grid></Grid></Paper>
                {lenhXuatVatTuItems.length > 0 && <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}><Typography fontWeight={900} sx={{ mb: 1.5 }}>Lệnh xuất vật tư bổ sung</Typography><Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>{lenhXuatVatTuItems.map((item) => <Chip key={item.Id} color={item.TrangThai === 'ACTIVE' ? 'success' : 'default'} variant={item.TrangThai === 'ACTIVE' ? 'filled' : 'outlined'} label={`${item.SoLenhXuatVT} · ${item.TenKhoXuat || `Kho ${item.SourceKhoXuatId}`} · ${item.TrangThai === 'ACTIVE' ? 'Hiệu lực' : 'Đã hủy'}`} />)}</Stack></Paper>}
                {phieuNhapBtpItems.length > 0 && <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ mb: 1.5 }}><Typography fontWeight={900}>Phiếu nhập BTP lỗi</Typography><Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>{capabilities.canEditReceiptBtpType && <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={openEditReceiptBtpType}>Đổi loại BTP</Button>}{capabilities.canConfirmWarehouse && <Button variant="contained" color="success" startIcon={<TaskAltOutlinedIcon />} onClick={() => openAction({ ActionCode: 'KHO_CONFIRM', ActionName: 'Kho xác nhận nhập BTP lỗi' })}>Kho xác nhận nhập</Button>}{capabilities.canRecordStockCard && <Button variant="contained" color="primary" startIcon={<Inventory2OutlinedIcon />} onClick={() => openAction({ ActionCode: 'STOCK_CARD_RECORD', ActionName: 'Ghi thẻ kho phiếu nhập BTP lỗi' })}>Ghi thẻ kho</Button>}</Stack></Stack><Stack spacing={1}>{phieuNhapBtpItems.map((item) => <Box key={item.Id}><Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap><Chip color={item.TrangThai === 'ACTIVE' ? 'info' : 'default'} label={`${item.SoPhieuNhapBtp} · ${formatDoiTraQuantity(item.SoLuongBtpLoi, 2)} · ${item.TenKhoNhap || `Kho ${item.SourceKhoNhapId}`}`} /><Chip size="small" color="primary" variant="outlined" label={`Loại BTP: ${btpTypeNameById.get(Number(item.SourceQuyTrinhSanXuatId)) || item.TenQuyTrinhSanXuat || 'Chưa xác định'}`} /><Chip size="small" color={Number(item.ErpTrangThai) === 5 ? 'success' : Number(item.ErpTrangThai) === 4 ? 'info' : 'warning'} variant="outlined" label={Number(item.ErpTrangThai) === 5 ? 'Đã ghi thẻ kho' : Number(item.ErpTrangThai) === 4 ? 'Kho đã xác nhận' : 'Chờ Kho xác nhận'} /></Stack><Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>{[item.MaBtp, item.TenBtp, item.SoLoSanXuat && `Lô ${item.SoLoSanXuat}`, Number(item.ErpTrangThai) === 0 ? 'ERP: Đang lập' : Number(item.ErpTrangThai) === 4 ? 'ERP: Kho đã xác nhận' : Number(item.ErpTrangThai) === 5 ? 'ERP: Đã ghi thẻ kho' : `ERP: ${item.ErpTrangThai}`].filter(Boolean).join(' · ')}</Typography>{item.WarehouseConfirmedAt && <Typography variant="caption" display="block" color="success.main">Kho xác nhận: {[item.TenKhoXacNhan, formatDoiTraDate(item.WarehouseConfirmedAt, true)].filter(Boolean).join(' — ')}</Typography>}{item.StockCardRecordedAt && <Typography variant="caption" display="block" color="primary.main">Ghi thẻ kho: {[item.TenNguoiGhiTheKho, formatDoiTraDate(item.StockCardRecordedAt, true)].filter(Boolean).join(' — ')}</Typography>}</Box>)}</Stack></Paper>}
                {phieu.TrangThai === 'HOAN_TAT' && <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}><Box sx={{ p: 2 }}><Typography fontWeight={900}>Tổng hợp phôi và kết quả xử lý</Typography></Box><TableContainer><Table size="small"><TableHead><TableRow sx={{ bgcolor: '#f8fafc' }}><TableCell>Loại phôi / vật tư</TableCell><TableCell align="right">SL kiểm</TableCell><TableCell align="right">SL lỗi</TableCell><TableCell>Trạng thái</TableCell></TableRow></TableHead><TableBody>{phoiItems.map((item) => <TableRow key={item.Id}><TableCell><Typography variant="body2" fontWeight={800}>{item.TenLoaiPhoi || `Phôi #${item.Id}`}</Typography><Typography variant="caption" display="block" color="text.secondary">{item.MaVatTu} — {item.QuyCachVatTu}</Typography></TableCell><TableCell align="right">{formatDoiTraQuantity(item.SoLuongKiem)}</TableCell><TableCell align="right">{formatDoiTraQuantity(item.SoLuongPhoiLoi)}</TableCell><TableCell><Chip size="small" color="success" label="Đã xử lý" /></TableCell></TableRow>)}</TableBody></Table></TableContainer></Paper>}
            </Stack>}

            {activeTab === 'phoi' && <Paper variant="outlined" sx={{ p: { xs: 1.25, md: 2 }, borderRadius: 2 }}><DoiTraPhoiEditor mode="list" phieuId={id} phieu={phieu} plan={plan} items={phoiItems} canEdit={capabilities.canEditPhoi} onSaved={() => load({ background: true })} onContinue={() => setSearchParams({ tab: 'inspection' }, { state: location.state })} onDirtyChange={setPhoiDirty} /></Paper>}

            {activeTab === 'inspection' && <Paper variant="outlined" sx={{ p: { xs: 1.25, md: 2 }, borderRadius: 2 }}><DoiTraPhoiEditor mode="inspection" phieuId={id} phieu={phieu} plan={plan} items={phoiItems} canEdit={capabilities.canEditPhoi} onSaved={() => load({ background: true })} onDirtyChange={setPhoiDirty} />{regularActions.length > 0 && <Paper elevation={3} sx={{ position: 'sticky', bottom: 8, zIndex: 3, p: 1, mt: 2, borderRadius: 2 }}><Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>{regularActions.map((action) => <Button key={action.ActionCode} variant={action.ActionCode === 'TBP_RETURN' ? 'outlined' : 'contained'} color={action.ActionCode === 'TBP_RETURN' ? 'warning' : 'primary'} startIcon={action.ActionCode === 'TBP_RETURN' ? <ReplayOutlinedIcon /> : <TaskAltOutlinedIcon />} disabled={phoiDirty && ['KCS_SUBMIT', 'KCS_RESUBMIT'].includes(action.ActionCode)} onClick={() => openAction(action)}>{action.ActionName}</Button>)}</Stack></Paper>}</Paper>}

            {activeTab === 'kph' && (isKphWorkflow
                ? <DoiTraKphWorkflow phieu={phieu} onChanged={() => load({ background: true })} onData={setKphData} />
                : <Alert severity="info">Phiếu này đã hoàn tất theo workflow cũ và không yêu cầu bổ sung KPH.</Alert>)}

            {activeTab === 'quota' && requiresB7 && <Paper variant="outlined" sx={{ p: { xs: 1.25, md: 2 }, borderRadius: 2 }}><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}><Typography fontWeight={900}>Số lượng đổi trả theo mã vật tư</Typography><Chip size="small" color={quotaStatus.color} label={quotaStatus.label} /></Stack>{lenhXuatVatTuItems.filter((item) => item.TrangThai === 'ACTIVE').length > 0 && <Alert severity="success" sx={{ mb: 1.5 }}>Lệnh xuất bổ sung: {lenhXuatVatTuItems.filter((item) => item.TrangThai === 'ACTIVE').map((item) => item.SoLenhXuatVT).join(', ')}</Alert>}{phoiItems.length && phieu.TrangThai !== 'DA_HUY' ? <DoiTraDinhMucEditor phieu={phieu} phoiItems={phoiItems} dinhMucItems={dinhMucItems} canEdit={capabilities.canEditDinhMuc} canConfirm={canB7Confirm} onChanged={() => load({ background: true })} onDirtyChange={setQuotaDirty} /> : <Alert severity="info">Phiếu chưa có loại phôi để nhập số lượng đổi trả.</Alert>}</Paper>}

            {activeTab === 'history' && <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}><Stack direction="row" spacing={1} alignItems="center" sx={{ p: 2 }}><HistoryIcon color="action" /><Box><Typography fontWeight={900}>Lịch sử phiếu</Typography><Typography variant="caption" color="text.secondary">Các mốc tạo phiếu, lưu nháp gần nhất và trình duyệt</Typography></Box></Stack><TableContainer><Table size="small"><TableHead><TableRow sx={{ bgcolor: '#f8fafc' }}><TableCell>Thời gian</TableCell><TableCell>Hành động</TableCell><TableCell>Trạng thái</TableCell><TableCell>Người thực hiện</TableCell><TableCell>Ghi chú</TableCell></TableRow></TableHead><TableBody>{history.map((item) => <TableRow key={item.Id}><TableCell>{formatDoiTraDate(item.CreatedAt, true)}</TableCell><TableCell>{doiTraHistoryActionLabel(item.ActionCode)}</TableCell><TableCell>{doiTraStatusMeta(item.ToStatus).label}</TableCell><TableCell>{item.TenNguoiThucHien || '---'}</TableCell><TableCell>{item.GhiChu || '---'}</TableCell></TableRow>)}</TableBody></Table></TableContainer></Paper>}

            <Dialog open={Boolean(actionDialog)} onClose={() => !actionLoading && setActionDialog(null)} fullWidth maxWidth="md">
                <DialogTitle>{actionDialog?.ActionName}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ pt: 0.5 }}>
                        <TextField
                            label={actionDialog?.ActionCode === 'TBP_RETURN' ? 'Lý do trả lại' : 'Ghi chú'}
                            required={actionDialog?.ActionCode === 'TBP_RETURN'}
                            multiline minRows={3} value={actionNote}
                            onChange={(event) => setActionNote(event.target.value)}
                            inputProps={{ maxLength: 1000 }}
                        />
                        {['KCS_SUBMIT', 'KCS_RESUBMIT'].includes(actionDialog?.ActionCode) && <>
                            <Alert severity="info">Hệ thống dự kiến tạo <strong>{receiptDrafts.length} phiếu nhập BTP</strong> theo quy trình được cấp của từng vật tư trong đơn hàng. KCS kiểm tra và có thể điều chỉnh trước khi xác nhận.</Alert>
                            {receiptDrafts.map((draft, index) => <Paper key={draft.key} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                <Typography fontWeight={900} sx={{ mb: 0.5 }}>Phiếu nhập dự kiến {index + 1}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                    Vật tư: {draft.items.map((item) => `${item.MaVatTu || `#${item.PhoiId}`} — ${item.TenLoaiPhoi || 'Phôi'}`).join(', ')}
                                </Typography>
                                <Grid container spacing={1.5}>
                                    <Grid size={{ xs: 12, md: 4 }}><TextField required fullWidth select label="Loại BTP" value={draft.processId}
                                        onChange={(event) => updateReceiptDraft(draft.key, 'processId', event.target.value)}>
                                        <MenuItem value=""><em>Chọn loại BTP</em></MenuItem>
                                        {btpTypes.map((item) => <MenuItem key={item.Id} value={item.Id}>{item.TenQuyTrinh || item.MaQuyTrinh || `Loại BTP ${item.Id}`}</MenuItem>)}
                                    </TextField></Grid>
                                    <Grid size={{ xs: 12, md: 4 }}><TextField required fullWidth select label="Kho nhập" value={draft.warehouseId}
                                        onChange={(event) => updateReceiptDraft(draft.key, 'warehouseId', event.target.value)}>
                                        <MenuItem value=""><em>Chọn kho nhập</em></MenuItem>
                                        {warehouses.map((warehouse) => <MenuItem key={warehouse.Id} value={warehouse.Id}>{warehouse.TenKho || `Kho ${warehouse.Id}`}</MenuItem>)}
                                    </TextField></Grid>
                                    <Grid size={{ xs: 12, md: 4 }}><TextField required fullWidth type="number" label="Số lượng BTP lỗi" value={draft.quantity}
                                        onChange={(event) => updateReceiptDraft(draft.key, 'quantity', event.target.value)}
                                        inputProps={{ min: 0.01, max: plan.PlanQty, step: 0.01 }} />
                                    </Grid>
                                </Grid>
                                {draft.items.some((item) => Number(item.MappingCount) > 1) && <Alert severity="warning" sx={{ mt: 1.5 }}>Có vật tư được cấp cho nhiều quy trình; hệ thống đang lấy dòng cấu hình đầu tiên. Vui lòng kiểm tra lại Loại BTP.</Alert>}
                                {draft.items.some((item) => !item.SuggestedProcessId) && <Alert severity="warning" sx={{ mt: 1.5 }}>Có vật tư chưa xác định được quy trình cấp trong đơn hàng. KCS cần chọn Loại BTP thủ công.</Alert>}
                            </Paper>)}
                            <Alert severity="info">
                                BTP: {expectedBtp}{plan.ExpectedProductionLot ? ` · Lô ${plan.ExpectedProductionLot}` : ''}<br />
                                Công đoạn: {[plan.OperationCode, plan.OperationName].filter(Boolean).join(' — ') || '---'}.
                            </Alert>
                            <Alert severity="info">Khi xác nhận, hệ thống tạo riêng từng phiếu nhập BTP lỗi ở trạng thái Đang lập và đồng thời mở luồng KPH.</Alert>
                        </>}
                        {actionDialog?.ActionCode === 'KHO_CONFIRM' && <Alert severity="warning">Xác nhận sẽ chuyển phiếu nhập BTP lỗi sang trạng thái ERP 4 và ghi tài khoản đăng nhập hiện tại vào Người phê duyệt 1.</Alert>}
                        {actionDialog?.ActionCode === 'STOCK_CARD_RECORD' && <Alert severity="warning">Ghi thẻ kho sẽ chuyển phiếu nhập BTP lỗi từ trạng thái ERP 4 sang 5 và ghi tài khoản đăng nhập hiện tại vào Người phê duyệt 2.</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button disabled={actionLoading} onClick={() => setActionDialog(null)}>Đóng</Button>
                    <Button variant="contained" disabled={actionLoading} startIcon={actionLoading ? <CircularProgress size={18} /> : <TaskAltOutlinedIcon />} onClick={executeAction}>Xác nhận</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={editReceiptBtpTypeOpen} onClose={() => !actionLoading && setEditReceiptBtpTypeOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Thay đổi loại BTP</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ pt: 0.5 }}>
                        <TextField required fullWidth select label="Loại BTP" value={editReceiptBtpTypeId}
                            onChange={(event) => setEditReceiptBtpTypeId(event.target.value)}>
                            <MenuItem value=""><em>Chọn loại BTP</em></MenuItem>
                            {btpTypes.map((item) => <MenuItem key={item.Id} value={item.Id}>
                                {[item.MaQuyTrinh, item.TenQuyTrinh].filter(Boolean).join(' — ') || `Loại BTP ${item.Id}`}
                            </MenuItem>)}
                        </TextField>
                        <Alert severity="warning">Thay đổi sẽ cập nhật loại BTP trên phiếu nhập ERP đang lập. Sau khi Kho xác nhận trạng thái 5 sẽ không thể sửa.</Alert>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button disabled={actionLoading} onClick={() => setEditReceiptBtpTypeOpen(false)}>Đóng</Button>
                    <Button variant="contained" disabled={actionLoading} onClick={saveReceiptBtpType}>Lưu thay đổi</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={printOpen} onClose={() => setPrintOpen(false)} maxWidth="xl" fullWidth>
                <DialogTitle sx={{ pb: 0 }}>Xem trước bản in đổi trả phôi lỗi</DialogTitle>
                {isKphWorkflow && <Tabs value={printTab} onChange={(_, value) => setPrintTab(value)} sx={{ px: 3 }}>
                    <Tab value="summary" label="Tổng hợp đổi phôi" />
                    <Tab value="kph" label="Xử lý KPH" />
                </Tabs>}
                <DialogContent dividers sx={{ bgcolor: '#e5e7eb', p: 2, overflow: 'auto' }}>
                    <Box sx={{ display: printTab === 'summary' ? 'block' : 'none', minWidth: '297mm' }}>
                        <DoiTraPhoiLoiSummaryPrintTemplate ref={summaryPrintRef} data={summaryData} />
                    </Box>
                    {isKphWorkflow && <Box sx={{ display: printTab === 'kph' ? 'flex' : 'none', justifyContent: 'center' }}>
                        <DoiTraPhoiLoiPrintTemplate ref={kphPrintRef} data={{ ...data, phieu: { ...phieu, SoPhieu: phieu.SoPhieuNhom || phieu.SoPhieu }, kph: kphData || {} }} />
                    </Box>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPrintOpen(false)}>Đóng</Button>
                    {printTab === 'summary' && <Button variant="outlined" startIcon={exportingExcel ? <CircularProgress size={18} /> : <FileDownloadOutlinedIcon />} disabled={exportingExcel} onClick={exportSummaryExcel}>Xuất Excel</Button>}
                    <Button variant="contained" startIcon={<PrintIcon />} onClick={printTab === 'kph' ? printKph : printSummary}>In / Lưu PDF</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
