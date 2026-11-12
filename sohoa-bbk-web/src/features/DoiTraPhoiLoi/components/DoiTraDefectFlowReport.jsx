import { useEffect, useMemo, useState } from 'react';
import {
    Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Grid, MenuItem,
    Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TextField, Typography
} from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
    exportDoiTraDefectFlowReport, getDoiTraDefectFlowReport
} from '../../../api/doiTraPhoiLoi.api';

const dateInput = (value) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const today = new Date();
const initialFilters = {
    fromDate: dateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
    toDate: dateInput(today), unitId: '', departmentId: '', planId: '', orderId: '',
    warehouseId: '', keyword: '', groupBy: 'COUNTERPARTY'
};
const number = (value) => Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 });
const date = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '---';
const GROUP_OPTIONS = [
    { value: 'COUNTERPARTY', label: 'Đối tượng nghiệp vụ' },
    { value: 'WAREHOUSE', label: 'Kho' },
    { value: 'PLAN', label: 'Kế hoạch' },
    { value: 'ORDER', label: 'Đơn hàng' },
    { value: 'PRODUCT', label: 'BTP / lô' }
];
const EVENT_LABELS = {
    PRODUCTION_RETURN_DEFECT: 'Đơn vị sản xuất trả BTP lỗi',
    PRODUCTION_RECEIVE_BTP: 'Kho trả BTP cho đơn vị sản xuất',
    CUTTING_RECEIVE_DEFECT: 'Kho xuất BTP lỗi cho đơn vị cắt',
    CUTTING_RETURN_REPAIRED: 'Đơn vị cắt trả BTP sau sửa'
};

function MetricCard({ title, totals, valueOf, color, subtitle }) {
    return (
        <Card variant="outlined" sx={{ height: '100%', borderTop: `4px solid ${color}` }}>
            <CardContent>
                <Typography variant="body2" color="text.secondary" fontWeight={700}>{title}</Typography>
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {totals.length ? totals.map((item) => {
                        const value = valueOf(item);
                        return <Typography key={`${title}-${item.UomId}`} variant="h6" fontWeight={800} color={Number(value) < 0 ? 'error.main' : 'text.primary'}>
                            {number(value)} <Typography component="span" variant="body2">{item.UomName}</Typography>
                        </Typography>;
                    }) : <Typography variant="h6" fontWeight={800}>0</Typography>}
                </Stack>
                {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
            </CardContent>
        </Card>
    );
}

function ChartBarRow({ label, value, max, color }) {
    const numericValue = Number(value || 0);
    const width = numericValue > 0 ? `${Math.max(1, numericValue / max * 100)}%` : '0%';
    return <Box sx={{ display: 'grid', gridTemplateColumns: '64px minmax(0, 1fr) 72px', gap: 1, alignItems: 'center' }}>
        <Typography variant="caption" noWrap>{label}</Typography>
        <Box sx={{ height: 10, borderRadius: 1, bgcolor: '#eef2f7', overflow: 'hidden', minWidth: 0 }}>
            <Box sx={{ height: '100%', borderRadius: 1, bgcolor: color, width, minWidth: numericValue > 0 ? 4 : 0 }} />
        </Box>
        <Typography variant="caption" sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{number(numericValue)}</Typography>
    </Box>;
}

function FlowSection({ title, description, data, openingLabel, sentLabel, returnedLabel, closingLabel, accent }) {
    const totals = data?.totals || [];
    const groups = useMemo(() => data?.groups || [], [data?.groups]);
    const chartRows = useMemo(() => [...groups]
        .sort((a, b) => (Number(b.PeriodSent) + Number(b.PeriodReturned)) - (Number(a.PeriodSent) + Number(a.PeriodReturned)))
        .slice(0, 10), [groups]);
    const chartMax = Math.max(1, ...chartRows.flatMap((item) => [Number(item.PeriodSent || 0), Number(item.PeriodReturned || 0)]));
    const pendingCount = totals.reduce((sum, item) => sum + Number(item.PendingVoucherCount || 0), 0);

    return <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderTop: `5px solid ${accent}` }}>
        <Typography variant="h6" fontWeight={900}>{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{description}</Typography>
        <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><MetricCard title={openingLabel} totals={totals} valueOf={(item) => item.OpeningBalance} color="#64748b" /></Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><MetricCard title={sentLabel} totals={totals} valueOf={(item) => item.PeriodSent} color="#dc2626" /></Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><MetricCard title={returnedLabel} totals={totals} valueOf={(item) => item.PeriodReturned} color="#16a34a" /></Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><MetricCard title={closingLabel} totals={totals} valueOf={(item) => item.ClosingBalance} color={accent} /></Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><MetricCard title="Chờ duyệt" totals={totals} valueOf={(item) => Number(item.PendingSentQuantity || 0) + Number(item.PendingReturnedQuantity || 0)} color="#ca8a04" subtitle={`${pendingCount} phiếu`} /></Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, lg: 6 }} sx={{ minWidth: 0 }}>
                <Box sx={{ mt: 2, minWidth: 0 }}>
                    <Typography fontWeight={800} sx={{ mb: 1.5 }}>So sánh hai chiều theo nhóm</Typography>
                    {chartRows.length === 0 ? <Alert severity="info">Không có phát sinh trong khoảng ngày đã chọn.</Alert> : <Stack spacing={1.2}>
                        {chartRows.map((item) => <Box key={`${item.GroupKey}-${item.UomId}`} sx={{ minWidth: 0 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, alignItems: 'start', mb: 0.25 }}><Typography variant="body2" fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{item.GroupLabel}</Typography><Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>{item.UomName}</Typography></Box>
                            <ChartBarRow label="Chiều đi" value={item.PeriodSent} max={chartMax} color="#dc2626" />
                            <ChartBarRow label="Chiều về" value={item.PeriodReturned} max={chartMax} color="#16a34a" />
                        </Box>)}
                    </Stack>}
                </Box>
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
                <TableContainer sx={{ mt: 2, maxHeight: 410 }}><Table size="small" stickyHeader>
                    <TableHead><TableRow><TableCell>Nhóm</TableCell><TableCell>ĐVT</TableCell><TableCell align="right">Đầu kỳ</TableCell><TableCell align="right">Đi</TableCell><TableCell align="right">Về</TableCell><TableCell align="right">Cuối kỳ</TableCell></TableRow></TableHead>
                    <TableBody>
                        {groups.map((item) => <TableRow key={`${item.GroupKey}-${item.UomId}`} hover><TableCell>{item.GroupLabel}</TableCell><TableCell>{item.UomName}</TableCell><TableCell align="right">{number(item.OpeningBalance)}</TableCell><TableCell align="right">{number(item.PeriodSent)}</TableCell><TableCell align="right">{number(item.PeriodReturned)}</TableCell><TableCell align="right" sx={{ color: Number(item.ClosingBalance) < 0 ? 'error.main' : 'inherit', fontWeight: 800 }}>{number(item.ClosingBalance)}</TableCell></TableRow>)}
                        {!groups.length && <TableRow><TableCell colSpan={6} align="center">Không có dữ liệu tổng hợp.</TableCell></TableRow>}
                    </TableBody>
                </Table></TableContainer>
            </Grid>
        </Grid>
    </Paper>;
}

export default function DoiTraDefectFlowReport() {
    const [draftFilters, setDraftFilters] = useState(initialFilters);
    const [appliedFilters, setAppliedFilters] = useState(initialFilters);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');
    const [report, setReport] = useState(null);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await getDoiTraDefectFlowReport({ ...appliedFilters, page, pageSize });
                if (active) setReport(response.data);
            } catch (requestError) {
                if (active) setError(requestError.response?.data?.message || 'Không tải được báo cáo đối soát BTP lỗi.');
            } finally {
                if (active) setLoading(false);
            }
        };
        load();
        return () => { active = false; };
    }, [appliedFilters, page, pageSize]);

    const options = report?.filterOptions || {};
    const updateFilter = (key) => (event) => setDraftFilters((current) => ({ ...current, [key]: event.target.value }));
    const applyFilters = () => { setPage(1); setAppliedFilters({ ...draftFilters }); };
    const exportExcel = async () => {
        try {
            setExporting(true);
            const response = await exportDoiTraDefectFlowReport(appliedFilters);
            const url = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `bao-cao-doi-soat-btp-loi-${appliedFilters.fromDate}-${appliedFilters.toDate}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không xuất được báo cáo Excel.');
        } finally {
            setExporting(false);
        }
    };

    return <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}><TextField fullWidth size="small" type="date" label="Từ ngày" value={draftFilters.fromDate} onChange={updateFilter('fromDate')} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}><TextField fullWidth size="small" type="date" label="Đến ngày" value={draftFilters.toDate} onChange={updateFilter('toDate')} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}><TextField fullWidth select size="small" label="Đơn vị" value={draftFilters.unitId} onChange={updateFilter('unitId')}><MenuItem value="">Tất cả</MenuItem>{(options.units || []).filter((item) => item.UnitId).map((item) => <MenuItem key={item.UnitId} value={item.UnitId}>{item.UnitName}</MenuItem>)}</TextField></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}><TextField fullWidth select size="small" label="Bộ phận" value={draftFilters.departmentId} onChange={updateFilter('departmentId')}><MenuItem value="">Tất cả</MenuItem>{(options.departments || []).filter((item) => item.DepartmentId).map((item) => <MenuItem key={item.DepartmentId} value={item.DepartmentId}>{item.DepartmentName}</MenuItem>)}</TextField></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}><TextField fullWidth select size="small" label="Kho" value={draftFilters.warehouseId} onChange={updateFilter('warehouseId')}><MenuItem value="">Tất cả</MenuItem>{(options.warehouses || []).filter((item) => item.WarehouseId).map((item) => <MenuItem key={item.WarehouseId} value={item.WarehouseId}>{item.WarehouseName}</MenuItem>)}</TextField></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}><TextField fullWidth select size="small" label="Nhóm theo" value={draftFilters.groupBy} onChange={updateFilter('groupBy')}>{GROUP_OPTIONS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</TextField></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}><TextField fullWidth select size="small" label="Kế hoạch" value={draftFilters.planId} onChange={updateFilter('planId')}><MenuItem value="">Tất cả</MenuItem>{(options.plans || []).filter((item) => item.PlanId).map((item) => <MenuItem key={item.PlanId} value={item.PlanId}>{item.PlanNo}</MenuItem>)}</TextField></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}><TextField fullWidth select size="small" label="Đơn hàng" value={draftFilters.orderId} onChange={updateFilter('orderId')}><MenuItem value="">Tất cả</MenuItem>{(options.orders || []).filter((item) => item.OrderId).map((item) => <MenuItem key={item.OrderId} value={item.OrderId}>{item.OrderCode}</MenuItem>)}</TextField></Grid>
                <Grid size={{ xs: 12, md: 5 }}><TextField fullWidth size="small" label="Tìm chứng từ, đối tượng, mã/tên BTP hoặc lô" value={draftFilters.keyword} onChange={updateFilter('keyword')} onKeyDown={(event) => { if (event.key === 'Enter') applyFilters(); }} /></Grid>
                <Grid size={{ xs: 12, md: 3 }}><Stack direction="row" spacing={1}><Button fullWidth variant="contained" startIcon={<SearchIcon />} onClick={applyFilters}>Xem báo cáo</Button><Button fullWidth variant="outlined" startIcon={exporting ? <CircularProgress size={18} /> : <FileDownloadOutlinedIcon />} disabled={exporting || loading} onClick={exportExcel}>Xuất Excel</Button></Stack></Grid>
            </Grid>
            {report && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>{report.meta?.DataStartDate ? `Mốc dữ liệu: ${date(report.meta.DataStartDate)}.` : 'Không giới hạn mốc dữ liệu lịch sử.'} Số thực tế chỉ tính chứng từ đã duyệt; Bộ và Chiếc được tách riêng.</Typography>}
        </Paper>

        {error && <Alert severity="error">{error}</Alert>}
        {(report?.warnings || []).length > 0 && <Alert severity="warning">Có {(report?.warnings || []).length} dòng chênh lệch cuối kỳ âm. Cần kiểm tra dữ liệu trước mốc hoặc thông tin BTP/đối tượng giữa phiếu đi và về.</Alert>}

        {loading ? <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : <>
            <FlowSection title="1. Đơn vị sản xuất → Kho → Đơn vị sản xuất" description="Đối chiếu BTP lỗi đơn vị sản xuất trả kho (nhập ID 10) và BTP kho trả lại đơn vị sản xuất (xuất ID 10)." data={report?.flows?.production} openingLabel="Đầu kỳ chờ kho trả" sentLabel="Đơn vị SX trả lỗi" returnedLabel="Kho trả BTP cho SX" closingLabel="Cuối kỳ chờ kho trả" accent="#4f46e5" />
            <FlowSection title="2. Kho → Đơn vị cắt → Kho" description="Đối chiếu BTP lỗi kho xuất cho đơn vị cắt sửa (xuất ID 9) và BTP kho nhận lại sau sửa (nhập ID 11)." data={report?.flows?.cutting} openingLabel="Đầu kỳ đang ở đơn vị cắt" sentLabel="Kho xuất đi sửa" returnedLabel="Kho nhận sau sửa" closingLabel="Cuối kỳ đang sửa" accent="#0f766e" />

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ p: 2 }}><Typography variant="h6" fontWeight={900}>Đối soát toàn bộ theo kho</Typography><Typography variant="body2" color="text.secondary">Bốn chiều nghiệp vụ được giữ riêng theo từng kho và đơn vị tính.</Typography></Box>
                <TableContainer><Table size="small"><TableHead><TableRow sx={{ bgcolor: '#f8fafc' }}><TableCell>Kho</TableCell><TableCell>ĐVT</TableCell><TableCell align="right">SX trả lỗi</TableCell><TableCell align="right">Kho trả SX</TableCell><TableCell align="right">Còn chờ trả SX</TableCell><TableCell align="right">Xuất đơn vị cắt</TableCell><TableCell align="right">Nhận sau sửa</TableCell><TableCell align="right">Còn đang sửa</TableCell><TableCell align="right">Phiếu chờ</TableCell></TableRow></TableHead><TableBody>
                    {(report?.warehouseReconciliation || []).map((item) => <TableRow key={`${item.WarehouseId}-${item.UomId}`} hover><TableCell>{item.WarehouseName}</TableCell><TableCell>{item.UomName}</TableCell><TableCell align="right">{number(item.ProductionReturnedDefect)}</TableCell><TableCell align="right">{number(item.ProductionReceivedBtp)}</TableCell><TableCell align="right" sx={{ color: Number(item.ProductionClosing) < 0 ? 'error.main' : 'inherit', fontWeight: 800 }}>{number(item.ProductionClosing)}</TableCell><TableCell align="right">{number(item.CuttingReceivedDefect)}</TableCell><TableCell align="right">{number(item.CuttingReturnedRepaired)}</TableCell><TableCell align="right" sx={{ color: Number(item.CuttingClosing) < 0 ? 'error.main' : 'inherit', fontWeight: 800 }}>{number(item.CuttingClosing)}</TableCell><TableCell align="right">{number(item.PendingVoucherCount)}</TableCell></TableRow>)}
                    {!(report?.warehouseReconciliation || []).length && <TableRow><TableCell colSpan={9} align="center">Không có dữ liệu kho.</TableCell></TableRow>}
                </TableBody></Table></TableContainer>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ p: 2 }}><Typography variant="h6" fontWeight={900}>Chi tiết chứng từ</Typography></Box>
                <TableContainer><Table size="small"><TableHead><TableRow sx={{ bgcolor: '#f8fafc' }}><TableCell>Ngày</TableCell><TableCell>Nghiệp vụ</TableCell><TableCell>Chứng từ</TableCell><TableCell>Đối tượng</TableCell><TableCell>Kế hoạch / Đơn hàng</TableCell><TableCell>BTP / Lô</TableCell><TableCell>Kho</TableCell><TableCell align="right">Số lượng</TableCell><TableCell>Trạng thái</TableCell></TableRow></TableHead><TableBody>
                    {(report?.details || []).map((item, index) => <TableRow key={`${item.MovementType}-${item.VoucherId}-${item.ProductId}-${item.LotId}-${index}`} hover><TableCell>{date(item.VoucherDate)}</TableCell><TableCell><Typography variant="body2" fontWeight={700}>{EVENT_LABELS[item.EventType] || item.EventType}</Typography><Typography variant="caption" color="text.secondary">Hình thức {item.FormId}</Typography></TableCell><TableCell>{item.VoucherNo}</TableCell><TableCell>{item.CounterpartyLabel}</TableCell><TableCell>{item.PlanNo}<br /><Typography variant="caption" color="text.secondary">{item.OrderCode}</Typography></TableCell><TableCell>{[item.ProductCode, item.ProductName].filter(Boolean).join(' — ')}<br /><Typography variant="caption" color="text.secondary">Lô {item.LotNo || '---'}</Typography></TableCell><TableCell>{item.WarehouseName}</TableCell><TableCell align="right">{number(item.Quantity)} {item.UomName}</TableCell><TableCell><Chip size="small" variant="outlined" color={item.IsApproved ? 'success' : 'default'} label={item.IsApproved ? 'Đã duyệt' : `Chờ duyệt (${item.ErpStatus})`} /></TableCell></TableRow>)}
                    {!(report?.details || []).length && <TableRow><TableCell colSpan={9} align="center">Không có phát sinh.</TableCell></TableRow>}
                </TableBody></Table></TableContainer>
                <TablePagination component="div" count={Number(report?.pagination?.TotalRows || 0)} page={Math.max(0, page - 1)} rowsPerPage={pageSize} rowsPerPageOptions={[25, 50, 100, 200]} onPageChange={(_event, nextPage) => setPage(nextPage + 1)} onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} labelRowsPerPage="Số dòng mỗi trang" />
            </Paper>
        </>}
    </Stack>;
}
