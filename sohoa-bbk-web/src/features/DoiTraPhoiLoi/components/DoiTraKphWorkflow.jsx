import { useEffect, useMemo, useState } from 'react';
import {
    Alert, Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress,
    Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton,
    MenuItem, Stack, TextField, Tooltip, Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import LightbulbCircleIcon from '@mui/icons-material/LightbulbCircle';
import {
    addDoiTraKphSection, approveDoiTraKphExecutive, confirmDoiTraKphCreator,
    confirmDoiTraKphOpinion, deleteDoiTraKphSection, followUpDoiTraKph, getDoiTraKph,
    returnDoiTraKphOpinion, saveDoiTraKphDepartments, saveDoiTraKphOpinion,
    updateDoiTraKphSection
} from '../../../api/doiTraPhoiLoi.api';
import ResponsiveDataList from '../../BienBan/components/ResponsiveDataList';

const EMPTY_SECTION = { noiDung: '', giaTri: '', thoiHan: '', trachNhiem: '', theoDoi: '' };
const SECTION_META = {
    'xu-ly': { title: 'Ý kiến / Đề xuất xử lý', dataKey: 'xuLy', icon: <LightbulbCircleIcon color="warning" />, add: 'Thêm đề xuất', color: 'primary' },
    'chi-phi': { title: 'Chi phí phát sinh', dataKey: 'chiPhi', icon: <AttachMoneyIcon color="success" />, add: 'Thêm chi phí', color: 'success' },
    'hanh-dong': { title: 'Hành động khắc phục', dataKey: 'hanhDong', icon: <BuildCircleIcon color="info" />, add: 'Thêm hành động', color: 'info' }
};
const dateOnly = (value) => value ? String(value).slice(0, 10) : '';
const PersonTime = ({ label, name, time, color = 'text.secondary' }) => name ? <Box>
    <Typography variant="caption" color={color} display="block">{label}: <strong>{name}</strong></Typography>
    {time && <Typography variant="caption" color="text.secondary">{new Date(time).toLocaleString('vi-VN')}</Typography>}
</Box> : <Typography variant="caption" color="text.disabled">{label}: —</Typography>;

export default function DoiTraKphWorkflow({ phieu, onChanged, onData }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [departmentDialog, setDepartmentDialog] = useState(false);
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [sectionDialog, setSectionDialog] = useState({ open: false, section: '', row: null, draft: EMPTY_SECTION });
    const [returnDialog, setReturnDialog] = useState({ open: false, opinion: null, reason: '' });
    const [bgdReturnDialog, setBgdReturnDialog] = useState({ open: false, reason: '' });
    const [opinionDrafts, setOpinionDrafts] = useState({});
    const [followUp, setFollowUp] = useState({ ketQua: '', phieuKphMoiSo: '', ghiChu: '' });

    const load = async () => {
        try {
            const response = await getDoiTraKph(phieu.Id);
            const next = response.data;
            setData(next); onData?.(next);
            setSelectedDepartments((next.departments || []).filter((department) =>
                (next.opinions || []).some((opinion) => Number(opinion.BoPhanId) === Number(department.Id))));
            setOpinionDrafts(Object.fromEntries((next.opinions || []).map((item) => [item.Id, item.NoiDung || ''])));
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [phieu.Id, phieu.RowVersion]); // eslint-disable-line react-hooks/exhaustive-deps
    const run = async (key, action) => {
        try { setBusy(key); await action(); await onChanged?.(); await load(); }
        catch (error) { window.alert(error.response?.data?.message || 'Không thực hiện được thao tác.'); }
        finally { setBusy(''); }
    };
    const capabilities = data?.capabilities || {};
    const opinions = data?.opinions || [];
    const selectedIds = useMemo(() => selectedDepartments.map((item) => item.Id), [selectedDepartments]);
    const departmentLabel = (item) => [item.MaBoPhan, item.TenBoPhan].filter(Boolean).join(' — ');

    const openSection = (section, row = null) => setSectionDialog({
        open: true, section, row,
        draft: row ? { noiDung: row.NoiDung || row.LoaiChiPhi || '', giaTri: row.GiaTri ?? '', thoiHan: dateOnly(row.ThoiHan), trachNhiem: row.TrachNhiem || '', theoDoi: row.TheoDoi || '' } : { ...EMPTY_SECTION }
    });
    const saveSection = () => {
        const { section, row, draft } = sectionDialog;
        if (!draft.noiDung.trim()) return window.alert('Vui lòng nhập nội dung.');
        if (section !== 'chi-phi' && !draft.thoiHan) return window.alert('Vui lòng nhập thời hạn.');
        if (section === 'xu-ly' && (!draft.trachNhiem.trim() || !draft.theoDoi.trim())) return window.alert('Vui lòng nhập trách nhiệm và theo dõi.');
        return run(`section-${section}`, async () => {
            const payload = { ...draft, loaiChiPhi: draft.noiDung };
            if (row) await updateDoiTraKphSection(phieu.Id, section, row.Id, payload);
            else await addDoiTraKphSection(phieu.Id, section, payload);
            setSectionDialog({ open: false, section: '', row: null, draft: EMPTY_SECTION });
        });
    };
    const rowActions = (section, row) => !row.CanEdit ? '—' : <Stack direction="row" justifyContent="flex-end">
        <Tooltip title="Sửa"><IconButton size="small" onClick={() => openSection(section, row)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Xóa"><IconButton size="small" color="error" onClick={() => window.confirm('Xóa nội dung này?') && run(`delete-${section}-${row.Id}`, () => deleteDoiTraKphSection(phieu.Id, section, row.Id))}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
    </Stack>;

    if (loading) return <Box sx={{ py: 3, display: 'grid', placeItems: 'center' }}><CircularProgress size={28} /></Box>;
    return <Stack spacing={2}>
        {phieu.TrangThai === 'TRA_LAI_KCS' && <Alert severity="error"><strong>Phiếu đã được trả về KCS:</strong> {phieu.LastReturnReason || phieu.LyDoTraLai || 'Chưa có lý do'}</Alert>}

        <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}><CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.25}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><GroupWorkIcon color="primary" /> Bộ phận cần lấy ý kiến</Typography>
                {capabilities.canManage && <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setDepartmentDialog(true)}>{opinions.length ? 'Bổ sung / cập nhật' : 'Chọn bộ phận'}</Button>}
            </Stack><Divider sx={{ mb: 2 }} />
            <ResponsiveDataList rows={opinions} emptyText="Chưa có bộ phận được chọn." getRowKey={(row) => row.Id} columns={[
                { key: 'department', label: 'Bộ phận', cellSx: { fontWeight: 700 }, render: (row) => row.TenBoPhan || '—' },
                { key: 'code', label: 'Mã bộ phận', render: (row) => row.MaBoPhan || '—' },
                { key: 'status', label: 'Trạng thái', align: 'right', render: (row) => <Chip size="small" color={row.HasConfirmed ? 'success' : row.HasOpinion ? 'warning' : 'default'} label={row.HasConfirmed ? 'Đã xác nhận' : row.HasOpinion ? 'Chờ TBP xác nhận' : 'Chờ ý kiến'} /> }
            ]} />
        </CardContent></Card>

        {Object.entries(SECTION_META).map(([section, meta]) => {
            const rows = data?.[meta.dataKey] || [];
            const columns = section === 'chi-phi' ? [
                { key: 'content', label: 'Loại chi phí', render: (row) => row.LoaiChiPhi || '—' },
                { key: 'value', label: 'Giá trị', align: 'right', cellSx: { color: 'success.main', fontWeight: 700, whiteSpace: 'nowrap' }, render: (row) => `${Number(row.GiaTri || 0).toLocaleString('vi-VN')} đ` },
                { key: 'responsible', label: 'Trách nhiệm', render: (row) => row.TrachNhiem || '—' },
                { key: 'deadline', label: 'Thời hạn', render: (row) => row.ThoiHan ? new Date(row.ThoiHan).toLocaleDateString('vi-VN') : '—' },
                { key: 'follow', label: 'Theo dõi', render: (row) => row.TheoDoi || '—' },
                { key: 'actions', label: '', align: 'right', render: (row) => rowActions(section, row) }
            ] : [
                { key: 'content', label: section === 'xu-ly' ? 'Nội dung ý kiến' : 'Nội dung', cellSx: { whiteSpace: 'pre-wrap', minWidth: 220 }, render: (row) => row.NoiDung || '—' },
                { key: 'responsible', label: 'Trách nhiệm', render: (row) => row.TrachNhiem || '—' },
                { key: 'follow', label: 'Theo dõi', render: (row) => row.TheoDoi || '—' },
                { key: 'deadline', label: 'Thời hạn', cellSx: { color: 'error.main', whiteSpace: 'nowrap' }, render: (row) => row.ThoiHan ? new Date(row.ThoiHan).toLocaleDateString('vi-VN') : '—' },
                { key: 'actions', label: '', align: 'right', render: (row) => rowActions(section, row) }
            ];
            return <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }} key={section}><CardContent sx={{ p: 0 }}>
                <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{meta.icon}{meta.title}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                        {section !== 'xu-ly' && <Chip size="small" color={rows.length ? 'success' : 'default'} label={rows.length ? 'Có ghi nhận' : 'Tùy chọn'} />}
                        {capabilities.canContribute && <Button size="small" variant={section === 'xu-ly' ? 'contained' : 'text'} color={meta.color} startIcon={<AddIcon />} onClick={() => openSection(section)}>{meta.add}</Button>}
                    </Stack>
                </Box><Box sx={{ px: { xs: 1.25, md: 2 }, pb: 1.5 }}><ResponsiveDataList rows={rows} emptyText={section === 'chi-phi' ? 'Không ghi nhận chi phí.' : section === 'hanh-dong' ? 'Chưa có hành động cụ thể.' : 'Chưa có ý kiến xử lý'} getRowKey={(row) => row.Id} columns={columns} /></Box>
            </CardContent></Card>;
        })}

        <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}><CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>Ý kiến phòng ban chuyên môn</Typography>
            {opinions.length > 0 && <Alert severity="info" sx={{ mb: 1.5, py: 0.25 }}><strong>Quy trình:</strong> Nhân viên lưu ý kiến chung, sau đó TBP xác nhận hoặc trả lại KCS.</Alert>}
            <ResponsiveDataList rows={opinions} emptyText="Bộ phận tạo phiếu chưa gửi danh sách cần lấy ý kiến." getRowKey={(row) => row.Id} columns={[
                { key: 'department', label: 'Bộ phận', cellSx: { width: 170, verticalAlign: 'top' }, render: (row) => <Stack><Typography variant="body2" fontWeight={800}>{row.TenBoPhan || row.MaBoPhan}</Typography><Typography variant="caption" color="text.secondary">{row.MaBoPhan}</Typography></Stack> },
                { key: 'opinion', label: 'Nội dung ý kiến', cellSx: { minWidth: 260, verticalAlign: 'top' }, render: (row) => row.CanSaveOpinion ? <TextField fullWidth multiline minRows={2} size="small" placeholder="Nếu không có góp ý, nhập “Không có ý kiến”" value={opinionDrafts[row.Id] || ''} onChange={(e) => setOpinionDrafts((p) => ({ ...p, [row.Id]: e.target.value }))} /> : <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{row.NoiDung || '—'}</Typography> },
                { key: 'people', label: 'Người thực hiện', cellSx: { width: 210, verticalAlign: 'top' }, render: (row) => <Stack spacing={0.5}><PersonTime label="Nhập" name={row.OpinionSavedByName} time={row.OpinionSavedAt} /><PersonTime label="Xác nhận" name={row.ConfirmedByName} time={row.ConfirmedAt} color="success.main" /></Stack> },
                { key: 'status', label: 'Trạng thái', cellSx: { width: 145, verticalAlign: 'top' }, render: (row) => <Chip size="small" color={row.HasConfirmed ? 'success' : row.HasOpinion ? 'warning' : 'default'} label={row.HasConfirmed ? 'Đã xác nhận' : row.HasOpinion ? 'Chờ TBP xác nhận' : 'Chờ nhập ý kiến'} /> },
                { key: 'actions', label: 'Thao tác', align: 'right', cellSx: { width: 180, verticalAlign: 'top' }, render: (row) => <Stack spacing={0.75} alignItems="flex-end">{row.CanSaveOpinion && <Button size="small" variant="outlined" disabled={busy === `save-${row.Id}`} onClick={() => run(`save-${row.Id}`, () => saveDoiTraKphOpinion(phieu.Id, row.Id, opinionDrafts[row.Id]))}>{row.HasOpinion ? 'Cập nhật' : 'Lưu ý kiến'}</Button>}{row.CanConfirmOpinion && <Stack direction="row"><Button size="small" color="error" onClick={() => setReturnDialog({ open: true, opinion: row, reason: '' })}>Trả lại</Button><Button size="small" variant="contained" color="success" onClick={() => run(`confirm-${row.Id}`, () => confirmDoiTraKphOpinion(phieu.Id, row.Id))}>Xác nhận</Button></Stack>}</Stack> }
            ]} />
        </CardContent></Card>

        {capabilities.canCreatorConfirm && <Button variant="contained" color="success" sx={{ alignSelf: 'flex-end' }} onClick={() => run('creator', () => confirmDoiTraKphCreator(phieu.Id))}>TBP bộ phận lập xác nhận cuối</Button>}
        {capabilities.canExecutiveApprove && <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}><CardContent><Typography variant="h6">Ban giám đốc xác nhận</Typography><Stack direction="row" spacing={1} justifyContent="flex-end"><Button color="error" onClick={() => setBgdReturnDialog({ open: true, reason: '' })}>Trả lại KCS</Button><Button variant="contained" color="success" onClick={() => run('bgd-ok', () => approveDoiTraKphExecutive(phieu.Id, 'APPROVE', ''))}>Xác nhận</Button></Stack></CardContent></Card>}
        <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}><CardContent><Typography variant="h6" sx={{ mb: 2 }}>Theo dõi đánh giá</Typography>
            {data?.evaluation ? <Stack spacing={1}><Chip sx={{ alignSelf: 'flex-start' }} color={data.evaluation.KetQua === 'THOA_MAN' ? 'success' : 'error'} label={data.evaluation.KetQua === 'THOA_MAN' ? 'Thỏa mãn' : 'Không thỏa mãn'} /><Typography sx={{ whiteSpace: 'pre-wrap' }}>{data.evaluation.GhiChu || 'Không có ghi chú'}</Typography><Typography variant="caption" color="text.secondary">{data.evaluation.NguoiTheoDoi} · {new Date(data.evaluation.ThoiGian).toLocaleString('vi-VN')}</Typography></Stack> : capabilities.canFollowUp ? <Stack spacing={2}><TextField select size="small" label="Kết quả" value={followUp.ketQua} onChange={(e) => setFollowUp((p) => ({ ...p, ketQua: e.target.value }))}><MenuItem value="THOA_MAN">Thỏa mãn</MenuItem><MenuItem value="KHONG_THOA_MAN">Không thỏa mãn</MenuItem></TextField>{followUp.ketQua === 'KHONG_THOA_MAN' && <TextField size="small" label="Số phiếu KPH mới" value={followUp.phieuKphMoiSo} onChange={(e) => setFollowUp((p) => ({ ...p, phieuKphMoiSo: e.target.value }))} />}<TextField multiline minRows={3} label="Ghi chú" value={followUp.ghiChu} onChange={(e) => setFollowUp((p) => ({ ...p, ghiChu: e.target.value }))} /><Button variant="contained" color="success" disabled={!followUp.ketQua} onClick={() => run('follow', () => followUpDoiTraKph(phieu.Id, followUp))}>Hoàn tất đánh giá</Button></Stack> : <Typography color="text.secondary">Phiếu chưa chuyển sang bước theo dõi đánh giá.</Typography>}
        </CardContent></Card>

        <Dialog open={departmentDialog} onClose={() => !busy && setDepartmentDialog(false)} fullWidth maxWidth="sm"><DialogTitle>Chọn bộ phận cần lấy ý kiến</DialogTitle><DialogContent dividers><Autocomplete multiple options={data.departments || []} value={selectedDepartments} isOptionEqualToValue={(a, b) => Number(a.Id) === Number(b.Id)} getOptionLabel={departmentLabel} onChange={(_, value) => setSelectedDepartments(value)} renderInput={(params) => <TextField {...params} label="Bộ phận cần lấy ý kiến" />} /></DialogContent><DialogActions><Button onClick={() => setDepartmentDialog(false)}>Hủy</Button><Button variant="contained" disabled={!selectedIds.length || busy === 'departments'} onClick={() => run('departments', async () => { await saveDoiTraKphDepartments(phieu.Id, phieu.RowVersion, selectedIds); setDepartmentDialog(false); })}>Xác nhận danh sách</Button></DialogActions></Dialog>
        <Dialog open={sectionDialog.open} onClose={() => !busy && setSectionDialog((p) => ({ ...p, open: false }))} fullWidth maxWidth="sm"><DialogTitle>{sectionDialog.row ? 'Cập nhật' : 'Thêm'} {SECTION_META[sectionDialog.section]?.title.toLowerCase()}</DialogTitle><DialogContent dividers><Stack spacing={2} sx={{ pt: 0.5 }}><TextField autoFocus fullWidth multiline minRows={3} label={sectionDialog.section === 'chi-phi' ? 'Loại chi phí' : 'Nội dung'} value={sectionDialog.draft.noiDung} onChange={(e) => setSectionDialog((p) => ({ ...p, draft: { ...p.draft, noiDung: e.target.value } }))} />{sectionDialog.section === 'chi-phi' && <TextField fullWidth type="number" label="Giá trị" value={sectionDialog.draft.giaTri} onChange={(e) => setSectionDialog((p) => ({ ...p, draft: { ...p.draft, giaTri: e.target.value } }))} />}<TextField fullWidth type="date" label="Thời hạn" slotProps={{ inputLabel: { shrink: true } }} value={sectionDialog.draft.thoiHan} onChange={(e) => setSectionDialog((p) => ({ ...p, draft: { ...p.draft, thoiHan: e.target.value } }))} /><TextField fullWidth label="Trách nhiệm" value={sectionDialog.draft.trachNhiem} onChange={(e) => setSectionDialog((p) => ({ ...p, draft: { ...p.draft, trachNhiem: e.target.value } }))} /><TextField fullWidth label="Theo dõi" value={sectionDialog.draft.theoDoi} onChange={(e) => setSectionDialog((p) => ({ ...p, draft: { ...p.draft, theoDoi: e.target.value } }))} /></Stack></DialogContent><DialogActions><Button onClick={() => setSectionDialog((p) => ({ ...p, open: false }))}>Hủy</Button><Button variant="contained" disabled={busy.startsWith('section-')} onClick={saveSection}>Lưu</Button></DialogActions></Dialog>
        <Dialog open={returnDialog.open} onClose={() => !busy && setReturnDialog({ open: false, opinion: null, reason: '' })} fullWidth maxWidth="sm"><DialogTitle>Trả lại phiếu cho KCS</DialogTitle><DialogContent dividers><Alert severity="warning" sx={{ mb: 2 }}>Toàn bộ xác nhận trong vòng hiện tại sẽ mất hiệu lực.</Alert><TextField autoFocus required fullWidth multiline minRows={3} label="Lý do trả lại" value={returnDialog.reason} onChange={(e) => setReturnDialog((p) => ({ ...p, reason: e.target.value }))} /></DialogContent><DialogActions><Button onClick={() => setReturnDialog({ open: false, opinion: null, reason: '' })}>Hủy</Button><Button color="error" variant="contained" disabled={!returnDialog.reason.trim()} onClick={() => run('return', async () => { await returnDoiTraKphOpinion(phieu.Id, returnDialog.opinion.Id, returnDialog.reason.trim()); setReturnDialog({ open: false, opinion: null, reason: '' }); })}>Trả lại</Button></DialogActions></Dialog>
        <Dialog open={bgdReturnDialog.open} onClose={() => !busy && setBgdReturnDialog({ open: false, reason: '' })} fullWidth maxWidth="sm"><DialogTitle>Ban giám đốc trả lại KCS</DialogTitle><DialogContent dividers><TextField autoFocus required fullWidth multiline minRows={3} label="Lý do trả lại" value={bgdReturnDialog.reason} onChange={(e) => setBgdReturnDialog({ open: true, reason: e.target.value })} /></DialogContent><DialogActions><Button onClick={() => setBgdReturnDialog({ open: false, reason: '' })}>Hủy</Button><Button color="error" variant="contained" disabled={!bgdReturnDialog.reason.trim()} onClick={() => run('bgd-return', async () => { await approveDoiTraKphExecutive(phieu.Id, 'RETURN', bgdReturnDialog.reason.trim()); setBgdReturnDialog({ open: false, reason: '' }); })}>Trả lại KCS</Button></DialogActions></Dialog>
    </Stack>;
}
