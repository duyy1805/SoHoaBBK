import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Collapse, Dialog,
    DialogActions, DialogContent, DialogTitle, Divider, Grid, Paper, Stack, Step,
    StepLabel, Stepper, Tab, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Tabs, TextField, Typography
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import {
    cancelDoiTraPhoiLoi, deleteDoiTraPhoiLoi, executeDoiTraAction, getDoiTraPhoiLoiDetail
} from '../../../api/doiTraPhoiLoi.api';
import { hasPermission } from '../../../utils/auth';
import DoiTraPhoiLoiSummaryPrintTemplate from '../components/DoiTraPhoiLoiSummaryPrintTemplate';
import DoiTraPhoiEditor from '../components/DoiTraPhoiEditor';
import DoiTraDinhMucEditor from '../components/DoiTraDinhMucEditor';
import { doiTraDinhMucStatusMeta, doiTraStatusMeta, formatDoiTraDate, formatDoiTraQuantity } from '../doiTraPhoiLoi.utils';

const Info = ({ label, value }) => (
    <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" fontWeight={700}>{value || '---'}</Typography>
    </Box>
);
const DETAIL_TABS = ['overview', 'phoi', 'inspection', 'quota', 'history'];
const chooseDefaultTab = (detail) => {
    const actions = detail.workflow?.availableActions || [];
    if (actions.some((item) => ['TBP_CONFIRM', 'TBP_RETURN'].includes(item.ActionCode))) return 'inspection';
    if (actions.some((item) => ['KCS_SUBMIT', 'KCS_RESUBMIT'].includes(item.ActionCode))) return detail.phoiItems?.length ? 'inspection' : 'phoi';
    if (detail.capabilities?.canEditDinhMuc && detail.phoiItems?.length && detail.phieu?.DinhMucTrangThai !== 'DA_XAC_NHAN') return 'quota';
    return 'overview';
};

export default function DoiTraPhoiLoiDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const summaryPrintRef = useRef(null);
    const [data, setData] = useState({ phieu: null, plans: [], history: [], phoiItems: [], dinhMucItems: [], workflow: { steps: [], availableActions: [] }, defectGroups: [], capabilities: {} });
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [printOpen, setPrintOpen] = useState(false);
    const [phoiDirty, setPhoiDirty] = useState(false);
    const [quotaDirty, setQuotaDirty] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [actionDialog, setActionDialog] = useState(null);
    const [actionNote, setActionNote] = useState('');
    const [btpDefectQuantity, setBtpDefectQuantity] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

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
        if (!data.phieu || DETAIL_TABS.includes(searchParams.get('tab'))) return;
        setSearchParams({ tab: chooseDefaultTab(data) }, { replace: true });
    }, [data, searchParams, setSearchParams]);
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
    const activeTab = DETAIL_TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'overview';
    const hasUnsavedChanges = phoiDirty || quotaDirty;
    const changeTab = (_, nextTab) => {
        if (hasUnsavedChanges && !window.confirm('Bạn có thay đổi chưa lưu. Bỏ thay đổi và chuyển sang khu vực khác?')) return;
        setPhoiDirty(false); setQuotaDirty(false); setSearchParams({ tab: nextTab });
    };
    const goBack = () => {
        if (hasUnsavedChanges && !window.confirm('Bạn có thay đổi chưa lưu. Bỏ thay đổi và quay lại danh sách?')) return;
        navigate('/doi-tra-phoi-loi');
    };
    const openPrintPreview = () => setPrintOpen(true);

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
        setBtpDefectQuantity(data.phieu?.SoLuongBtpLoi || '');
    };

    const executeAction = async () => {
        if (!actionDialog) return;
        if (actionDialog.ActionCode === 'TBP_RETURN' && !actionNote.trim()) return window.alert('Vui lòng nhập lý do trả lại.');
        const isKcsCompletion = ['KCS_SUBMIT', 'KCS_RESUBMIT'].includes(actionDialog.ActionCode);
        const quantity = Number(btpDefectQuantity);
        if (isKcsCompletion && (!Number.isFinite(quantity) || quantity <= 0
            || quantity > Number(data.plans?.[0]?.PlanQty || 0)
            || Math.abs(quantity * 100 - Math.round(quantity * 100)) > 1e-8)) {
            return window.alert('Số lượng BTP lỗi phải lớn hơn 0, tối đa 2 chữ số thập phân và không vượt số lượng kế hoạch.');
        }
        try {
            setActionLoading(true);
            await executeDoiTraAction(id, actionDialog.ActionCode, {
                rowVersion: data.phieu.RowVersion,
                ghiChu: actionNote.trim() || null,
                soLuongBtpLoi: isKcsCompletion ? quantity : null
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

    const { phieu, plans, history, phoiItems = [], dinhMucItems = [], lenhXuatVatTuItems = [], phieuNhapBtpItems = [], workflow = {}, defectGroups = [], capabilities } = data;
    const plan = plans[0] || {};
    const status = doiTraStatusMeta(phieu.TrangThai);
    const workflowSteps = workflow.steps || [];
    const mainSteps = workflowSteps.filter((step) => String(step.TrackCode || 'MAIN').toUpperCase() !== 'DINH_MUC');
    const configuredStepIndex = mainSteps.findIndex((step) => step.IsCurrent);
    const activeStep = phieu.TrangThai === 'HOAN_TAT'
        ? mainSteps.length
        : (configuredStepIndex >= 0 ? configuredStepIndex : Math.min(status.step, Math.max(mainSteps.length - 1, 0)));
    const availableActions = workflow.availableActions || [];
    const regularActions = availableActions.filter((action) => action.ActionCode !== 'B7_CONFIRM');
    const canB7Confirm = Boolean(capabilities.canConfirmDinhMuc);
    const quotaStatus = doiTraDinhMucStatusMeta(phieu.DinhMucTrangThai);
    const expectedBtp = Number(plan.ExpectedBtpCount) === 1
        ? [plan.ExpectedBtpCode, plan.ExpectedBtpName].filter(Boolean).join(' — ')
        : 'Không xác định duy nhất';
    const expectedWarehouse = plan.ExpectedWarehouseName || 'Chưa cấu hình';
    const summaryData = {
        tickets: [{ ...plan, ...phieu }],
        phoiItems,
        dinhMucItems,
        phieuNhapBtpItems,
        defectGroups,
    };

    return (
        <Box>
            <Button startIcon={<ArrowBackIcon />} onClick={goBack} sx={{ mb: 1 }}>Quay lại danh sách</Button>
            <Paper variant="outlined" sx={{ position: { md: 'sticky' }, top: { md: 8 }, zIndex: 4, mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: { md: '0 6px 22px rgba(15,23,42,.08)' } }}>
                <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5}>
                        <Box sx={{ minWidth: 0 }}><Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap><Typography variant="h5" fontWeight={900}>{phieu.SoPhieu}</Typography><Chip size="small" color={status.color} label={status.label} /></Stack><Typography variant="body2" color="text.secondary" noWrap>{[plan.PlanNo || plan.PlanID, plan.ProductCode, plan.ProductName].filter(Boolean).join(' · ')}</Typography></Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Button size="small" endIcon={<ExpandMoreIcon sx={{ transform: showDetails ? 'rotate(180deg)' : 'none' }} />} onClick={() => setShowDetails((value) => !value)}>Xem chi tiết</Button>
                            {hasPermission('XOA_HO_SO_KCS') && <Button size="small" color="error" variant="outlined" startIcon={deleting ? <CircularProgress size={16} /> : <DeleteOutlineIcon />} disabled={deleting} onClick={deleteTicket}>Xóa</Button>}
                            {capabilities.canCancel && <Button size="small" color="error" variant="outlined" startIcon={<CancelOutlinedIcon />} disabled={cancelling} onClick={cancel}>Hủy</Button>}
                            <Button size="small" variant="contained" startIcon={<PrintIcon />} onClick={openPrintPreview}>Xem trước bản in</Button>
                        </Stack>
                    </Stack>
                    <Grid container spacing={1.5} sx={{ mt: 0.5 }}><Grid size={{ xs: 6, md: 3 }}><Info label="Đơn vị sản xuất" value={[plan.DepartmentCode, plan.DepartmentName].filter(Boolean).join(' — ')} /></Grid><Grid size={{ xs: 6, md: 3 }}><Info label="Đơn hàng" value={plan.OrderCode} /></Grid><Grid size={{ xs: 6, md: 3 }}><Info label="Người lập" value={phieu.TenNguoiLap} /></Grid><Grid size={{ xs: 6, md: 3 }}><Info label="Ngày lập" value={formatDoiTraDate(phieu.NgayLap)} /></Grid></Grid>
                    <Collapse in={showDetails}><Divider sx={{ my: 1.5 }} /><Grid container spacing={1.5}><Grid size={{ xs: 12, sm: 4 }}><Info label="Công đoạn" value={[plan.OperationCode, plan.OperationName].filter(Boolean).join(' — ')} /></Grid><Grid size={{ xs: 12, sm: 4 }}><Info label="Số lượng kế hoạch" value={formatDoiTraQuantity(plan.PlanQty)} /></Grid><Grid size={{ xs: 12, sm: 4 }}><Info label="Bộ phận gây lỗi" value={[phieu.MaBoPhanGayLoiSnapshot, phieu.TenBoPhanGayLoiSnapshot, phieu.TenDonViGayLoiSnapshot].filter(Boolean).join(' — ')} /></Grid></Grid></Collapse>
                </Box>
                <Box sx={{ px: { xs: 1, md: 2 }, py: 1.25, borderTop: 1, borderColor: 'divider', bgcolor: '#fafbff' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                        <Typography variant="caption" fontWeight={900} color="text.secondary">TIẾN TRÌNH XỬ LÝ</Typography>
                        <Chip size="small" color={quotaStatus.color} label={`Đổi trả: ${quotaStatus.label}`} />
                    </Stack>
                    <Box sx={{ overflowX: 'auto', pb: 0.5 }}>
                        <Stepper activeStep={activeStep} alternativeLabel sx={{ minWidth: { xs: 760, md: 0 }, '& .MuiStepLabel-label': { fontSize: '0.72rem', mt: 0.5 } }}>
                            {(mainSteps.length ? mainSteps : [{ StepName: 'KCS kiểm và nhập BTP lỗi' }, { StepName: 'TBP KCS xác nhận' }, { StepName: 'B7 tạo lệnh xuất VT' }]).map((step) => <Step key={step.StepCode || step.StepName}><StepLabel>{step.StepName}</StepLabel></Step>)}
                        </Stepper>
                    </Box>
                </Box>
                <Tabs value={activeTab} onChange={changeTab} variant="scrollable" scrollButtons="auto" sx={{ borderTop: 1, borderColor: 'divider', px: 1 }}>
                    <Tab value="overview" icon={<DashboardOutlinedIcon />} iconPosition="start" label="Tổng quan" />
                    <Tab value="phoi" icon={<Inventory2OutlinedIcon />} iconPosition="start" label={`Danh sách phôi (${phoiItems.length})`} />
                    <Tab value="inspection" icon={<TaskAltOutlinedIcon />} iconPosition="start" label={`Kết quả kiểm (${phoiItems.length})`} />
                    <Tab value="quota" icon={<CalculateOutlinedIcon />} iconPosition="start" label={quotaStatus.label} />
                    <Tab value="history" icon={<HistoryIcon />} iconPosition="start" label={`Lịch sử (${history.length})`} />
                </Tabs>
            </Paper>

            {phieu.TrangThai === 'TRA_LAI_KCS' && <Alert severity="warning" sx={{ mb: 2 }}><strong>Lý do trả lại:</strong> {phieu.LyDoTraLai || 'Chưa ghi rõ lý do'}</Alert>}
            {hasUnsavedChanges && <Alert severity="warning" sx={{ mb: 2 }}>Bạn đang có thay đổi chưa lưu. Hãy lưu trước khi chuyển khu vực hoặc thực hiện xác nhận.</Alert>}

            {activeTab === 'overview' && <Stack spacing={2}>
                <Grid container spacing={2}><Grid size={{ xs: 12, md: 8 }}><Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}><CardContent><Typography fontWeight={900} sx={{ mb: 1.5 }}>Thông tin kế hoạch</Typography><Grid container spacing={1.5}><Grid size={{ xs: 12, sm: 6 }}><Info label="Kế hoạch" value={plan.PlanNo || plan.PlanID} /></Grid><Grid size={{ xs: 12, sm: 6 }}><Info label="Sản phẩm" value={[plan.ProductCode, plan.ProductName].filter(Boolean).join(' — ')} /></Grid><Grid size={{ xs: 12, sm: 6 }}><Info label="Đơn hàng" value={plan.OrderCode} /></Grid><Grid size={{ xs: 12, sm: 6 }}><Info label="Đơn vị" value={[plan.DepartmentName, plan.UnitName].filter(Boolean).join(' — ')} /></Grid><Grid size={{ xs: 6, sm: 4 }}><Info label="Công đoạn" value={[plan.OperationCode, plan.OperationName].filter(Boolean).join(' — ')} /></Grid><Grid size={{ xs: 6, sm: 4 }}><Info label="Số lượng kế hoạch" value={formatDoiTraQuantity(plan.PlanQty)} /></Grid><Grid size={{ xs: 12, sm: 4 }}><Info label="Trạng thái ERP" value={plan.ERPPlanStatus} /></Grid></Grid></CardContent></Card></Grid><Grid size={{ xs: 12, md: 4 }}><Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}><CardContent><Typography fontWeight={900}>B7 cấp vật tư đổi trả</Typography><Chip size="small" color={quotaStatus.color} label={quotaStatus.label} sx={{ my: 1.5 }} /><Typography variant="body2" color="text.secondary">Sau khi TBP KCS xác nhận, B7 nhập số lượng đổi trả và tạo lệnh xuất vật tư bổ sung.</Typography></CardContent></Card></Grid></Grid>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}><Typography fontWeight={900} sx={{ mb: 1.5 }}>Thông tin xác nhận</Typography><Grid container spacing={2}><Grid size={{ xs: 12, md: 4 }}><Info label="KCS hoàn tất" value={phieu.KcsCompletedAt ? `${phieu.TenKcsHoanTat || '---'} — ${formatDoiTraDate(phieu.KcsCompletedAt, true)}` : null} /></Grid><Grid size={{ xs: 12, md: 4 }}><Info label="TBP KCS xác nhận" value={phieu.TbpKcsConfirmedAt ? `${phieu.TenTbpKcsXacNhan || '---'} — ${formatDoiTraDate(phieu.TbpKcsConfirmedAt, true)}` : null} /></Grid><Grid size={{ xs: 12, md: 4 }}><Info label="B7 xác nhận số lượng" value={phieu.B7ConfirmedAt ? `${phieu.TenB7XacNhan || '---'} — ${formatDoiTraDate(phieu.B7ConfirmedAt, true)}` : null} /></Grid></Grid></Paper>
                {lenhXuatVatTuItems.length > 0 && <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}><Typography fontWeight={900} sx={{ mb: 1.5 }}>Lệnh xuất vật tư bổ sung</Typography><Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>{lenhXuatVatTuItems.map((item) => <Chip key={item.Id} color={item.TrangThai === 'ACTIVE' ? 'success' : 'default'} variant={item.TrangThai === 'ACTIVE' ? 'filled' : 'outlined'} label={`${item.SoLenhXuatVT} · ${item.TenKhoXuat || `Kho ${item.SourceKhoXuatId}`} · ${item.TrangThai === 'ACTIVE' ? 'Hiệu lực' : 'Đã hủy'}`} />)}</Stack></Paper>}
                {phieuNhapBtpItems.length > 0 && <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}><Typography fontWeight={900} sx={{ mb: 1.5 }}>Phiếu nhập BTP lỗi</Typography><Stack spacing={1}>{phieuNhapBtpItems.map((item) => <Box key={item.Id}><Chip color={item.TrangThai === 'ACTIVE' ? 'info' : 'default'} label={`${item.SoPhieuNhapBtp} · ${formatDoiTraQuantity(item.SoLuongBtpLoi, 2)} · ${item.TenKhoNhap || `Kho ${item.SourceKhoNhapId}`}`} /><Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>{[item.MaBtp, item.TenBtp, item.SoLoSanXuat && `Lô ${item.SoLoSanXuat}`, item.TenQuyTrinhSanXuat, item.ErpTrangThai === 0 ? 'ERP: Đang lập' : `ERP: ${item.ErpTrangThai}`].filter(Boolean).join(' · ')}</Typography></Box>)}</Stack></Paper>}
                {phieu.TrangThai === 'HOAN_TAT' && <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}><Box sx={{ p: 2 }}><Typography fontWeight={900}>Tổng hợp phôi và kết quả xử lý</Typography></Box><TableContainer><Table size="small"><TableHead><TableRow sx={{ bgcolor: '#f8fafc' }}><TableCell>Loại phôi / vật tư</TableCell><TableCell align="right">SL kiểm</TableCell><TableCell align="right">SL lỗi</TableCell><TableCell>Trạng thái</TableCell></TableRow></TableHead><TableBody>{phoiItems.map((item) => <TableRow key={item.Id}><TableCell><Typography variant="body2" fontWeight={800}>{item.TenLoaiPhoi || `Phôi #${item.Id}`}</Typography><Typography variant="caption" display="block" color="text.secondary">{item.MaVatTu} — {item.QuyCachVatTu}</Typography></TableCell><TableCell align="right">{formatDoiTraQuantity(item.SoLuongKiem)}</TableCell><TableCell align="right">{formatDoiTraQuantity(item.SoLuongPhoiLoi)}</TableCell><TableCell><Chip size="small" color="success" label="Đã xử lý" /></TableCell></TableRow>)}</TableBody></Table></TableContainer></Paper>}
            </Stack>}

            {activeTab === 'phoi' && <Paper variant="outlined" sx={{ p: { xs: 1.25, md: 2 }, borderRadius: 2 }}><DoiTraPhoiEditor mode="list" phieuId={id} phieu={phieu} plan={plan} items={phoiItems} canEdit={capabilities.canEditPhoi} onSaved={() => load({ background: true })} onContinue={() => setSearchParams({ tab: 'inspection' })} onDirtyChange={setPhoiDirty} /></Paper>}

            {activeTab === 'inspection' && <Paper variant="outlined" sx={{ p: { xs: 1.25, md: 2 }, borderRadius: 2 }}><DoiTraPhoiEditor mode="inspection" phieuId={id} phieu={phieu} plan={plan} items={phoiItems} canEdit={capabilities.canEditPhoi} onSaved={() => load({ background: true })} onDirtyChange={setPhoiDirty} />{regularActions.length > 0 && <Paper elevation={3} sx={{ position: 'sticky', bottom: 8, zIndex: 3, p: 1, mt: 2, borderRadius: 2 }}><Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>{regularActions.map((action) => <Button key={action.ActionCode} variant={action.ActionCode === 'TBP_RETURN' ? 'outlined' : 'contained'} color={action.ActionCode === 'TBP_RETURN' ? 'warning' : 'primary'} startIcon={action.ActionCode === 'TBP_RETURN' ? <ReplayOutlinedIcon /> : <TaskAltOutlinedIcon />} disabled={phoiDirty && ['KCS_SUBMIT', 'KCS_RESUBMIT'].includes(action.ActionCode)} onClick={() => openAction(action)}>{action.ActionName}</Button>)}</Stack></Paper>}</Paper>}

            {activeTab === 'quota' && <Paper variant="outlined" sx={{ p: { xs: 1.25, md: 2 }, borderRadius: 2 }}><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}><Typography fontWeight={900}>Số lượng đổi trả theo mã vật tư</Typography><Chip size="small" color={quotaStatus.color} label={quotaStatus.label} /></Stack>{lenhXuatVatTuItems.filter((item) => item.TrangThai === 'ACTIVE').length > 0 && <Alert severity="success" sx={{ mb: 1.5 }}>Lệnh xuất bổ sung: {lenhXuatVatTuItems.filter((item) => item.TrangThai === 'ACTIVE').map((item) => item.SoLenhXuatVT).join(', ')}</Alert>}{phoiItems.length && phieu.TrangThai !== 'DA_HUY' ? <DoiTraDinhMucEditor phieu={phieu} phoiItems={phoiItems} dinhMucItems={dinhMucItems} canEdit={capabilities.canEditDinhMuc} canConfirm={canB7Confirm} onChanged={() => load({ background: true })} onDirtyChange={setQuotaDirty} /> : <Alert severity="info">Phiếu chưa có loại phôi để nhập số lượng đổi trả.</Alert>}</Paper>}

            {activeTab === 'history' && <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}><Stack direction="row" spacing={1} alignItems="center" sx={{ p: 2 }}><HistoryIcon color="action" /><Typography fontWeight={900}>Lịch sử phiếu</Typography></Stack><TableContainer><Table size="small"><TableHead><TableRow sx={{ bgcolor: '#f8fafc' }}><TableCell>Thời gian</TableCell><TableCell>Hành động</TableCell><TableCell>Trạng thái</TableCell><TableCell>Người thực hiện</TableCell><TableCell>Ghi chú</TableCell></TableRow></TableHead><TableBody>{history.map((item) => <TableRow key={item.Id}><TableCell>{formatDoiTraDate(item.CreatedAt, true)}</TableCell><TableCell>{item.ActionCode}</TableCell><TableCell>{doiTraStatusMeta(item.ToStatus).label}</TableCell><TableCell>{item.TenNguoiThucHien || '---'}</TableCell><TableCell>{item.GhiChu || '---'}</TableCell></TableRow>)}</TableBody></Table></TableContainer></Paper>}

            <Dialog open={Boolean(actionDialog)} onClose={() => !actionLoading && setActionDialog(null)} fullWidth maxWidth="sm">
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
                            <TextField required fullWidth type="number" label="Số lượng BTP lỗi" value={btpDefectQuantity} onChange={(event) => setBtpDefectQuantity(event.target.value)} inputProps={{ min: 0.01, max: plan.PlanQty, step: 0.01 }} helperText={`Tối đa ${formatDoiTraQuantity(plan.PlanQty, 2)} · Tối đa 2 chữ số thập phân`} />
                            <Alert severity="info">
                                BTP: {expectedBtp}{plan.ExpectedProductionLot ? ` · Lô ${plan.ExpectedProductionLot}` : ''}<br />
                                Công đoạn: {[plan.OperationCode, plan.OperationName].filter(Boolean).join(' — ') || '---'}<br />
                                Kho nhập dự kiến: {expectedWarehouse}. Backend sẽ đối chiếu lại toàn bộ dữ liệu theo PlanID trước khi tạo phiếu.
                            </Alert>
                            <Alert severity="info">Khi xác nhận, hệ thống tạo phiếu nhập BTP lỗi ở trạng thái Đang lập. Danh sách phôi và lỗi sẽ bị khóa đến khi TBP KCS trả lại.</Alert>
                        </>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button disabled={actionLoading} onClick={() => setActionDialog(null)}>Đóng</Button>
                    <Button variant="contained" disabled={actionLoading} startIcon={actionLoading ? <CircularProgress size={18} /> : <TaskAltOutlinedIcon />} onClick={executeAction}>Xác nhận</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={printOpen} onClose={() => setPrintOpen(false)} maxWidth="xl" fullWidth>
                <DialogTitle sx={{ pb: 0 }}>Xem trước bản in đổi trả phôi lỗi</DialogTitle>
                <DialogContent dividers sx={{ bgcolor: '#e5e7eb', p: 2, overflow: 'auto' }}>
                    <Box sx={{ minWidth: '297mm' }}>
                        <DoiTraPhoiLoiSummaryPrintTemplate ref={summaryPrintRef} data={summaryData} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPrintOpen(false)}>Đóng</Button>
                    <Button variant="contained" startIcon={<PrintIcon />} onClick={printSummary}>In / Lưu PDF</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
