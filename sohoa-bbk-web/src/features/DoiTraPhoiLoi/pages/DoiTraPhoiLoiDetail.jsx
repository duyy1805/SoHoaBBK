import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert, Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog,
    DialogActions, DialogContent, DialogTitle, Divider, Grid, Paper, Stack, Step,
    StepLabel, Stepper, Tab, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Tabs, TextField, Typography, createFilterOptions
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import HistoryIcon from '@mui/icons-material/History';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useNavigate, useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import {
    cancelDoiTraPhoiLoi, deleteDoiTraPhoiLoi, executeDoiTraAction,
    getDoiTraPhoiLoiDetail, getDoiTraTraceabilityLookups
} from '../../../api/doiTraPhoiLoi.api';
import { hasPermission } from '../../../utils/auth';
import DoiTraPhoiLoiPrintTemplate from '../components/DoiTraPhoiLoiPrintTemplate';
import DoiTraPhoiLoiSummaryPrintTemplate from '../components/DoiTraPhoiLoiSummaryPrintTemplate';
import DoiTraPhoiEditor from '../components/DoiTraPhoiEditor';
import DoiTraDinhMucEditor from '../components/DoiTraDinhMucEditor';
import DoiTraKphWorkflow from '../components/DoiTraKphWorkflow';
import { doiTraStatusMeta, formatDoiTraDate, formatDoiTraQuantity } from '../doiTraPhoiLoi.utils';

const Info = ({ label, value }) => (
    <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" fontWeight={700}>{value || '---'}</Typography>
    </Box>
);
const responsibleDepartmentLabel = (item) => item?.source === 'TAG_SYSTEM'
    ? [item.departmentName, item.unitName].filter(Boolean).join(' — ')
    : [item?.departmentCode, item?.departmentName].filter(Boolean).join(' — ');
const filterResponsibleDepartments = createFilterOptions({
    stringify: (item) => [
        item.departmentCode, item.departmentName, item.unitName, item.sourceId, item.source
    ].filter(Boolean).join(' ')
});

export default function DoiTraPhoiLoiDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const printRef = useRef(null);
    const summaryPrintRef = useRef(null);
    const [data, setData] = useState({ phieu: null, plans: [], history: [], phoiItems: [], dinhMucItems: [], workflow: { steps: [], availableActions: [] }, defectGroups: [], capabilities: {} });
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [printOpen, setPrintOpen] = useState(false);
    const [printTab, setPrintTab] = useState('kph');
    const [phoiDirty, setPhoiDirty] = useState(false);
    const [actionDialog, setActionDialog] = useState(null);
    const [actionNote, setActionNote] = useState('');
    const [responsibleDepartment, setResponsibleDepartment] = useState(null);
    const [responsibleDepartments, setResponsibleDepartments] = useState([]);
    const [actionLoading, setActionLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [kphData, setKphData] = useState(null);

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

    const printKph = useReactToPrint({
        contentRef: printRef,
        documentTitle: data.phieu?.SoPhieu ? `DoiTraPhoiLoi_${data.phieu.SoPhieu}` : 'DoiTraPhoiLoi'
    });
    const printSummary = useReactToPrint({
        contentRef: summaryPrintRef,
        documentTitle: data.phieu?.SoPhieu ? `TongHopDoiTra_${data.phieu.SoPhieu}` : 'TongHopDoiTraPhoiLoi'
    });

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
        setResponsibleDepartment(null);
        if (['KCS_SUBMIT', 'KCS_RESUBMIT'].includes(action.ActionCode)) {
            try {
                let options = responsibleDepartments;
                if (!options.length) {
                    const response = await getDoiTraTraceabilityLookups();
                    options = response.data?.responsibleDepartments || [];
                    setResponsibleDepartments(options);
                }
                const currentSource = data.phieu?.BoPhanGayLoiSource
                    || (data.phieu?.BoPhanGayLoiId ? 'NOI_BO' : null);
                const currentSourceId = data.phieu?.BoPhanGayLoiSourceId
                    || data.phieu?.BoPhanGayLoiId;
                setResponsibleDepartment(options.find((item) => item.source === currentSource
                    && Number(item.sourceId) === Number(currentSourceId)) || null);
            } catch (error) {
                setActionDialog(null);
                window.alert(error.response?.data?.message || 'Không tải được danh sách bộ phận.');
            }
        }
    };

    const executeAction = async () => {
        if (!actionDialog) return;
        const isKcs = ['KCS_SUBMIT', 'KCS_RESUBMIT'].includes(actionDialog.ActionCode);
        if (isKcs && !responsibleDepartment) return window.alert('Vui lòng chọn bộ phận gây lỗi.');
        if (actionDialog.ActionCode === 'TBP_RETURN' && !actionNote.trim()) return window.alert('Vui lòng nhập lý do trả lại.');
        try {
            setActionLoading(true);
            await executeDoiTraAction(id, actionDialog.ActionCode, {
                rowVersion: data.phieu.RowVersion,
                ghiChu: actionNote.trim() || null,
                boPhanGayLoi: responsibleDepartment ? {
                    source: responsibleDepartment.source,
                    sourceId: responsibleDepartment.sourceId
                } : null
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

    const { phieu, plans, history, phoiItems = [], dinhMucItems = [], workflow = {}, defectGroups = [], capabilities } = data;
    const plan = plans[0] || {};
    const status = doiTraStatusMeta(phieu.TrangThai);
    const workflowSteps = workflow.steps || [];
    const configuredStepIndex = workflowSteps.findIndex((step) => step.IsCurrent);
    const activeStep = phieu.TrangThai === 'HOAN_TAT'
        ? workflowSteps.length
        : (configuredStepIndex >= 0 ? configuredStepIndex : Math.min(status.step, Math.max(workflowSteps.length - 1, 0)));
    const availableActions = workflow.availableActions || [];
    const regularActions = availableActions.filter((action) => action.ActionCode !== 'B7_CONFIRM');
    const canB7Confirm = Boolean(capabilities.canConfirmDinhMuc);
    const summaryData = {
        tickets: [{ ...plan, ...phieu }],
        phoiItems,
        defectGroups,
        isDraft: true
    };

    return (
        <Box>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
                <Box>
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/doi-tra-phoi-loi')} sx={{ mb: 0.5 }}>
                        Quay lại danh sách
                    </Button>
                    <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                        <Typography variant="h5" fontWeight={800}>{phieu.SoPhieu}</Typography>
                        <Chip size="small" color={status.color} label={status.label} />
                    </Stack>
                    <Typography color="text.secondary">Phiếu đổi trả phôi lỗi</Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                    {hasPermission('XOA_HO_SO_KCS') && (
                        <Button color="error" variant="outlined" startIcon={deleting ? <CircularProgress size={18} /> : <DeleteOutlineIcon />}
                            disabled={deleting} onClick={deleteTicket}>{deleting ? 'Đang xóa…' : 'Xóa phiếu'}</Button>
                    )}
                    {capabilities.canCancel && (
                        <Button color="error" variant="outlined" startIcon={cancelling ? <CircularProgress size={18} /> : <CancelOutlinedIcon />}
                            disabled={cancelling} onClick={cancel}>Hủy phiếu</Button>
                    )}
                    <Button variant="contained" startIcon={<PrintIcon />} onClick={() => { setPrintTab('kph'); setPrintOpen(true); }}>Xem trước bản in</Button>
                </Stack>
            </Stack>

            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 2, borderRadius: 2 }}>
                <Stepper activeStep={activeStep} alternativeLabel>
                    {(workflowSteps.length ? workflowSteps.map((step) => step.StepName) : ['KCS kiểm và xác định bộ phận gây lỗi', 'TBP KCS xác nhận', 'B7 nhập định mức đổi trả']).map((label) => (
                        <Step key={label}><StepLabel>{label}</StepLabel></Step>
                    ))}
                </Stepper>
                <Alert severity={phieu.DinhMucTrangThai === 'DA_XAC_NHAN' ? 'success' : phieu.DinhMucTrangThai === 'CAN_XAC_NHAN_LAI' ? 'warning' : 'info'} sx={{ mt: 2 }}>
                    <strong>Nhánh B7:</strong> {{ CHUA_NHAP: 'Chưa nhập định mức', DANG_NHAP: 'Đang nhập định mức', DA_XAC_NHAN: 'Đã xác nhận định mức', CAN_XAC_NHAN_LAI: 'Dữ liệu vật tư/số bộ lỗi đã đổi — cần B7 xác nhận lại' }[phieu.DinhMucTrangThai] || 'Chưa khởi tạo'}
                </Alert>
                {phieu.TrangThai === 'TRA_LAI_KCS' && <Alert severity="warning" sx={{ mt: 2 }}><strong>Lý do trả lại:</strong> {phieu.LyDoTraLai || 'Chưa ghi rõ lý do'}</Alert>}
                {phoiDirty && <Alert severity="warning" sx={{ mt: 2 }}>Bạn đang có thay đổi phôi/lỗi chưa lưu. Hãy lưu nháp trước khi hoàn tất KCS.</Alert>}
                {regularActions.length > 0 && <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
                    {regularActions.map((action) => <Button
                        key={action.ActionCode}
                        variant={action.ActionCode === 'TBP_RETURN' ? 'outlined' : 'contained'}
                        color={action.ActionCode === 'TBP_RETURN' ? 'warning' : 'primary'}
                        startIcon={action.ActionCode === 'TBP_RETURN' ? <ReplayOutlinedIcon /> : <TaskAltOutlinedIcon />}
                        disabled={phoiDirty && ['KCS_SUBMIT', 'KCS_RESUBMIT'].includes(action.ActionCode)}
                        onClick={() => openAction(action)}
                    >{action.ActionName}</Button>)}
                </Stack>}
            </Paper>

            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>Thông tin phiếu</Typography>
                            <Stack spacing={1.25}>
                                <Info label="Ngày lập" value={formatDoiTraDate(phieu.NgayLap)} />
                                <Info label="Người lập" value={phieu.TenNguoiLap} />
                                <Info label="Bộ phận KCS" value={[phieu.MaBoPhanKcs, phieu.TenBoPhanKcs].filter(Boolean).join(' - ')} />
                                <Info label="Bộ phận gây lỗi" value={[
                                    phieu.MaBoPhanGayLoiSnapshot,
                                    phieu.TenBoPhanGayLoiSnapshot,
                                    phieu.TenDonViGayLoiSnapshot
                                ].filter(Boolean).join(' — ')} />
                                <Info label="Thời gian tạo" value={formatDoiTraDate(phieu.CreatedAt, true)} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 8 }}>
                    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>Kế hoạch sản xuất</Typography>
                            <Grid container spacing={1.5}>
                                <Grid size={{ xs: 12, sm: 6 }}><Info label="Mã kế hoạch" value={plan.PlanNo || plan.PlanID} /></Grid>
                                <Grid size={{ xs: 12, sm: 6 }}><Info label="Đơn hàng" value={plan.OrderCode} /></Grid>
                                <Grid size={{ xs: 12, sm: 6 }}><Info label="Sản phẩm" value={[plan.ProductCode, plan.ProductName].filter(Boolean).join(' - ')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6 }}><Info label="Công đoạn" value={[plan.OperationCode, plan.OperationName].filter(Boolean).join(' - ')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6 }}><Info label="Bộ phận thực hiện" value={plan.DepartmentName} /></Grid>
                                <Grid size={{ xs: 12, sm: 6 }}><Info label="Đơn vị" value={plan.UnitName} /></Grid>
                                <Grid size={{ xs: 12, sm: 4 }}><Info label="Ngày kế hoạch" value={formatDoiTraDate(plan.PlanDate)} /></Grid>
                                <Grid size={{ xs: 12, sm: 4 }}><Info label="Số lượng kế hoạch" value={formatDoiTraQuantity(plan.PlanQty)} /></Grid>
                                <Grid size={{ xs: 12, sm: 4 }}><Info label="Trạng thái ERP" value={plan.ERPPlanStatus} /></Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Inventory2OutlinedIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={800}>Danh sách phôi lỗi</Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <DoiTraPhoiEditor
                    phieuId={id}
                    phieu={phieu}
                    plan={plan}
                    items={phoiItems}
                    canEdit={capabilities.canEditPhoi}
                    onSaved={() => load({ background: true })}
                    onDirtyChange={setPhoiDirty}
                />
            </Paper>

            {phoiItems.length > 0 && phieu.TrangThai !== 'DA_HUY' && <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>Định mức đổi trả</Typography>
                <DoiTraDinhMucEditor
                    phieu={phieu}
                    phoiItems={phoiItems}
                    dinhMucItems={dinhMucItems}
                    canEdit={capabilities.canEditDinhMuc}
                    canConfirm={canB7Confirm}
                    onChanged={() => load({ background: true })}
                />
            </Paper>}

            {['CHO_THIET_LAP_KPH', 'CHO_Y_KIEN_KPH', 'CHO_XAC_NHAN_CUOI_KPH', 'CHO_BGD_XAC_NHAN', 'CHO_THEO_DOI', 'KPH_HOAN_TAT_CHO_B7', 'HOAN_TAT', 'TRA_LAI_KCS'].includes(phieu.TrangThai) && <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>Xử lý không phù hợp</Typography>
                <DoiTraKphWorkflow phieu={phieu} onChanged={() => load({ background: true })} onData={setKphData} />
            </Paper>}

            {(phieu.KcsCompletedAt || phieu.TbpKcsConfirmedAt || phieu.B7ConfirmedAt) && <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>Thông tin xác nhận</Typography>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}><Info label="KCS hoàn tất" value={phieu.KcsCompletedAt ? `${phieu.TenKcsHoanTat || '---'} — ${formatDoiTraDate(phieu.KcsCompletedAt, true)}` : null} /></Grid>
                    <Grid size={{ xs: 12, md: 4 }}><Info label="TBP KCS xác nhận" value={phieu.TbpKcsConfirmedAt ? `${phieu.TenTbpKcsXacNhan || '---'} — ${formatDoiTraDate(phieu.TbpKcsConfirmedAt, true)}` : null} /></Grid>
                    <Grid size={{ xs: 12, md: 4 }}><Info label="B7 xác nhận định mức" value={phieu.B7ConfirmedAt ? `${phieu.TenB7XacNhan || '---'} — ${formatDoiTraDate(phieu.B7ConfirmedAt, true)}` : null} /></Grid>
                </Grid>
            </Paper>}

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 2, pb: 1 }}>
                    <HistoryIcon color="action" />
                    <Typography variant="subtitle1" fontWeight={800}>Lịch sử phiếu</Typography>
                </Stack>
                <TableContainer>
                    <Table size="small">
                        <TableHead><TableRow sx={{ bgcolor: '#f8fafc' }}><TableCell>Thời gian</TableCell><TableCell>Hành động</TableCell><TableCell>Trạng thái</TableCell><TableCell>Người thực hiện</TableCell><TableCell>Ghi chú</TableCell></TableRow></TableHead>
                        <TableBody>
                            {history.map((item) => (
                                <TableRow key={item.Id}>
                                    <TableCell>{formatDoiTraDate(item.CreatedAt, true)}</TableCell>
                                    <TableCell>{item.ActionCode}</TableCell>
                                    <TableCell>{doiTraStatusMeta(item.ToStatus).label}</TableCell>
                                    <TableCell>{item.TenNguoiThucHien || '---'}</TableCell>
                                    <TableCell>{item.GhiChu || '---'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={Boolean(actionDialog)} onClose={() => !actionLoading && setActionDialog(null)} fullWidth maxWidth="sm">
                <DialogTitle>{actionDialog?.ActionName}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ pt: 0.5 }}>
                        {['KCS_SUBMIT', 'KCS_RESUBMIT'].includes(actionDialog?.ActionCode) && <Autocomplete
                            options={responsibleDepartments}
                            value={responsibleDepartment}
                            isOptionEqualToValue={(option, value) => option.key === value.key}
                            getOptionLabel={responsibleDepartmentLabel}
                            filterOptions={filterResponsibleDepartments}
                            onChange={(_, value) => setResponsibleDepartment(value)}
                            renderInput={(params) => <TextField {...params} required label="Bộ phận gây lỗi" />}
                        />}
                        <TextField
                            label={actionDialog?.ActionCode === 'TBP_RETURN' ? 'Lý do trả lại' : 'Ghi chú'}
                            required={actionDialog?.ActionCode === 'TBP_RETURN'}
                            multiline minRows={3} value={actionNote}
                            onChange={(event) => setActionNote(event.target.value)}
                            inputProps={{ maxLength: 1000 }}
                        />
                        {['KCS_SUBMIT', 'KCS_RESUBMIT'].includes(actionDialog?.ActionCode) && <Alert severity="info">Sau khi gửi, danh sách phôi và lỗi sẽ bị khóa đến khi TBP KCS trả lại.</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button disabled={actionLoading} onClick={() => setActionDialog(null)}>Đóng</Button>
                    <Button variant="contained" disabled={actionLoading} startIcon={actionLoading ? <CircularProgress size={18} /> : <TaskAltOutlinedIcon />} onClick={executeAction}>Xác nhận</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={printOpen} onClose={() => setPrintOpen(false)} maxWidth="xl" fullWidth>
                <DialogTitle sx={{ pb: 0 }}>Xem trước bản in đổi trả phôi lỗi</DialogTitle>
                <Tabs value={printTab} onChange={(_, value) => setPrintTab(value)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
                    <Tab value="kph" label="Phiếu xử lý KPH" />
                    <Tab value="summary" label="Phiếu tổng hợp" />
                </Tabs>
                <DialogContent dividers sx={{ bgcolor: '#e5e7eb', p: 2, overflow: 'auto' }}>
                    <Box sx={{ display: printTab === 'kph' ? 'flex' : 'none', justifyContent: 'center' }}>
                        <DoiTraPhoiLoiPrintTemplate ref={printRef} data={{ ...data, kph: kphData }} />
                    </Box>
                    <Box sx={{ display: printTab === 'summary' ? 'block' : 'none', minWidth: '297mm' }}>
                        <DoiTraPhoiLoiSummaryPrintTemplate ref={summaryPrintRef} data={summaryData} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPrintOpen(false)}>Đóng</Button>
                    <Button variant="contained" startIcon={<PrintIcon />} onClick={() => printTab === 'kph' ? printKph() : printSummary()}>In / Lưu PDF</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
