import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog,
    DialogActions, DialogContent, DialogTitle, Divider, Grid, Paper, Stack, Step,
    StepLabel, Stepper, Tab, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Tabs, Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import HistoryIcon from '@mui/icons-material/History';
import { useNavigate, useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { cancelDoiTraPhoiLoi, getDoiTraPhoiLoiDetail } from '../../../api/doiTraPhoiLoi.api';
import DoiTraPhoiLoiPrintTemplate from '../components/DoiTraPhoiLoiPrintTemplate';
import DoiTraPhoiLoiSummaryPrintTemplate from '../components/DoiTraPhoiLoiSummaryPrintTemplate';
import DoiTraPhoiEditor from '../components/DoiTraPhoiEditor';
import { doiTraStatusMeta, formatDoiTraDate, formatDoiTraQuantity } from '../doiTraPhoiLoi.utils';

const Info = ({ label, value }) => (
    <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" fontWeight={700}>{value || '---'}</Typography>
    </Box>
);

export default function DoiTraPhoiLoiDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const printRef = useRef(null);
    const summaryPrintRef = useRef(null);
    const [data, setData] = useState({ phieu: null, plans: [], history: [], phoiItems: [], workflow: { steps: [] }, defectGroups: [], capabilities: {} });
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [printOpen, setPrintOpen] = useState(false);
    const [printTab, setPrintTab] = useState('kph');

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

    if (loading) return <Box sx={{ py: 10, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
    if (!data.phieu) return <Alert severity="error">Không tìm thấy phiếu đổi trả phôi lỗi.</Alert>;

    const { phieu, plans, history, phoiItems = [], workflow = {}, defectGroups = [], capabilities } = data;
    const plan = plans[0] || {};
    const status = doiTraStatusMeta(phieu.TrangThai);
    const workflowSteps = workflow.steps || [];
    const configuredStepIndex = workflowSteps.findIndex((step) => step.IsCurrent);
    const activeStep = configuredStepIndex >= 0 ? configuredStepIndex : Math.min(status.step, Math.max(workflowSteps.length - 1, 0));
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
                    <Typography color="text.secondary">Phiếu đổi trả phôi lỗi — giai đoạn khởi tạo bộ khung</Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="flex-start">
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
                <Alert severity="info" sx={{ mt: 2 }}>
                    Giai đoạn hiện tại cho phép KCS lưu nháp phôi và lỗi. Các thao tác hoàn tất KCS, TBP xác nhận và B7 nhập định mức sẽ được mở ở giai đoạn sau.
                </Alert>
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
                />
            </Paper>

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

            <Dialog open={printOpen} onClose={() => setPrintOpen(false)} maxWidth="xl" fullWidth>
                <DialogTitle sx={{ pb: 0 }}>Xem trước bản in đổi trả phôi lỗi</DialogTitle>
                <Tabs value={printTab} onChange={(_, value) => setPrintTab(value)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
                    <Tab value="kph" label="Phiếu xử lý KPH" />
                    <Tab value="summary" label="Phiếu tổng hợp" />
                </Tabs>
                <DialogContent dividers sx={{ bgcolor: '#e5e7eb', p: 2, overflow: 'auto' }}>
                    <Box sx={{ display: printTab === 'kph' ? 'flex' : 'none', justifyContent: 'center' }}>
                        <DoiTraPhoiLoiPrintTemplate ref={printRef} data={data} />
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
