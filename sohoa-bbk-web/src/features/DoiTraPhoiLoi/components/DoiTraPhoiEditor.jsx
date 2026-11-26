import { useEffect, useMemo, useState } from 'react';
import {
    Alert, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl, Grid, IconButton, InputLabel,
    MenuItem, Paper, Select, Stack, Tab, Tabs, TextField, Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { getDefectList } from '../../../api/lookup.api';
import {
    createDoiTraManualPhoi, getDoiTraDefectGroups, getDoiTraPhoiOptions,
    getDoiTraTraceabilityLookups, saveDoiTraPhoi
} from '../../../api/doiTraPhoiLoi.api';
import DefectPickerDialog from '../../PhieuKiem/components/DefectPickerDialog';

const clean = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim()
    .toLocaleLowerCase('vi');
const sourceTypeOf = (item) => String(item?.sourceType || item?.SourceType || 'COMPONENT').toUpperCase();
const sourceIdOf = (item) => Number(item?.sourceId || item?.SourceId || (
    sourceTypeOf(item) === 'BTP_STAGE'
        ? item?.sourceCatalogProductId || item?.SourceCatalogProductId
        : sourceTypeOf(item) === 'MANUAL'
            ? item?.sourceManualPhoiId || item?.SourceManualPhoiId
            : item?.sourceLoiPhoiId || item?.SourceLoiPhoiId
) || item?.Id);
const phoiTitle = (item) => sourceTypeOf(item) === 'BTP_STAGE'
    ? [item.SelectedItemCode || item.MaVatTu, item.SelectedItemName || item.TenLoaiPhoi].filter(Boolean).join(' — ')
    : [item.TenLoaiPhoi, item.SoPhoi && `Số phôi ${item.SoPhoi}`, item.KyHieu]
        .filter(Boolean).join(' — ') || `Phôi #${item.SourceLoiPhoiId || item.Id}`;
const phoiMetaLabel = (item) => sourceTypeOf(item) === 'BTP_STAGE'
    ? 'BTP sau công đoạn May'
    : [sourceTypeOf(item) === 'MANUAL' ? 'Phôi nhập tay' : '', item.MaVatTu, item.QuyCachVatTu, item.DaoChat ? `Dao chặt: ${item.DaoChat}` : '']
        .filter(Boolean).join(' — ');
const defectiveQuantity = (item) => (item.defects || []).reduce(
    (total, defect) => total + (Number(defect.soLuongLoi ?? defect.SoLuongLoi) || 0), 0
);
const itemKey = (item) => `${sourceTypeOf(item)}:${sourceIdOf(item)}`;
const issueTraceComplete = (trace) => Boolean(
    (trace.lotSanXuat ?? trace.LotSanXuat)
    && (trace.donViTaoPhoiId ?? trace.DonViTaoPhoiId)
    && (trace.ngayTaoPhoi ?? trace.NgayTaoPhoi)
    && (trace.toSanXuat ?? trace.ToSanXuat)
    && (trace.congNhanSanXuat ?? trace.CongNhanSanXuat)
);
const responsibleLabel = (item) => {
    const source = item?.boPhanGayLoiSource || item?.BoPhanGayLoiSource;
    const value = [item?.MaBoPhanGayLoi, item?.TenBoPhanGayLoi].filter(Boolean).join(' — ');
    if (source === 'TAG_SYSTEM') return `SXBT: ${item?.TenBoPhanGayLoi || ''}`.trim();
    if (source === 'NHA_CUNG_CAP') return `Nhà cung cấp: ${value}`.trim();
    return value;
};
const responsibleOptionLabel = (item) => {
    const value = [item.departmentCode, item.departmentName].filter(Boolean).join(' — ');
    if (item.source === 'TAG_SYSTEM') return `SXBT: ${item.departmentName || ''}`;
    if (item.source === 'NHA_CUNG_CAP') return `Nhà cung cấp: ${value}`;
    return value;
};
const newManualLxvtKey = () => globalThis.crypto?.randomUUID?.()
    || `00000000-0000-4000-8000-${Math.random().toString(16).slice(2).padEnd(12, '0').slice(0, 12)}`;
const filterResponsibleOptions = (options, { inputValue }) => {
    const keyword = clean(inputValue);
    if (!keyword) return options;
    return options.filter((item) => clean(responsibleOptionLabel(item)).includes(keyword));
};

const toDraft = (item, defaultLot = '', requireLxvt = true) => {
    let traces = (item.issueTraceabilities || item.IssueTraceabilities || []).map((trace) => ({
        manualLxvtKey: trace.ManualLxvtKey || trace.manualLxvtKey || newManualLxvtKey(),
        soLenhXuatVT: trace.SoLenhXuatVT || trace.soLenhXuatVT || '',
        lotSanXuat: trace.LotSanXuat || '', dauTuan: trace.DauTuan || '',
        donViTaoPhoiId: trace.DonViTaoPhoiId || '', ngayTaoPhoi: String(trace.NgayTaoPhoi || '').slice(0, 10),
        toSanXuat: trace.ToSanXuat || '', congNhanSanXuat: trace.CongNhanSanXuat || ''
    }));
    if (!requireLxvt && !traces.length) {
        traces = [{
            manualLxvtKey: newManualLxvtKey(), soLenhXuatVT: '',
            lotSanXuat: defaultLot || item.LotSanXuat || '', dauTuan: item.DauTuan || '',
            donViTaoPhoiId: item.DonViTaoPhoiId || '', ngayTaoPhoi: String(item.NgayTaoPhoi || '').slice(0, 10),
            toSanXuat: item.ToSanXuat || '', congNhanSanXuat: item.CongNhanSanXuat || ''
        }];
    }
    return ({
    sourceType: sourceTypeOf(item), sourceId: sourceIdOf(item),
    sourceLoiPhoiId: item.SourceLoiPhoiId ? Number(item.SourceLoiPhoiId) : null,
    sourceCatalogProductId: item.SourceCatalogProductId ? Number(item.SourceCatalogProductId) : null,
    sourceManualPhoiId: item.SourceManualPhoiId ? Number(item.SourceManualPhoiId) : null,
    SelectedItemCode: item.SelectedItemCode || '', SelectedItemName: item.SelectedItemName || '',
    MaVatTu: item.MaVatTu || '',
    QuyCachVatTu: item.QuyCachVatTu || '', TenLoaiPhoi: item.TenLoaiPhoi || '',
    DaoChat: item.DaoChat || '', SoPhoi: item.SoPhoi || '', KyHieu: item.KyHieu || '',
    soLuongKiem: item.SoLuongKiem ?? 1, ghiChu: item.GhiChu || '',
    lotSanXuat: defaultLot || item.LotSanXuat || '',
    lenhXuatVatTu: item.LenhXuatVatTu || (item.issueTraceabilities || item.IssueTraceabilities || [])
        .map((trace) => trace.SoLenhXuatVT).filter(Boolean).join(', '),
    dauTuan: item.DauTuan || '',
    donViTaoPhoiId: item.DonViTaoPhoiId || '',
    ngayTaoPhoi: String(item.NgayTaoPhoi || '').slice(0, 10), toSanXuat: item.ToSanXuat || '',
    congNhanSanXuat: item.CongNhanSanXuat || '',
    issueTraceabilities: traces,
    defects: (item.defects || []).map((defect) => ({
        clientKey: defect.Id ? `saved-${defect.Id}` : newManualLxvtKey(),
        nhomLoiId: defect.NhomLoiId || '', defectId: defect.DefectId || '',
        MaLoi: defect.MaLoi || '', TenLoi: defect.TenLoi || '', DefectType: defect.DefectType || '',
        soLuongLoi: defect.SoLuongLoi ?? 1, ghiChu: defect.GhiChu || '',
        boPhanGayLoiSource: defect.BoPhanGayLoiSource || '', boPhanGayLoiSourceId: defect.BoPhanGayLoiSourceId || '',
        manualLxvtKey: defect.ManualLxvtKey || traces.find((trace) => trace.soLenhXuatVT && trace.soLenhXuatVT === defect.SoLenhXuatVT)?.manualLxvtKey || (!requireLxvt ? traces[0]?.manualLxvtKey : '') || '',
        soLenhXuatVT: defect.SoLenhXuatVT || ''
    }))
    });
};

const MasterItem = ({ item, selected, editing, onClick, requireLxvt }) => {
    const errorQty = editing ? defectiveQuantity(item) : Number(item.SoLuongPhoiLoi || 0);
    const checkedQty = editing ? item.soLuongKiem : item.SoLuongKiem;
    const itemDefects = editing ? item.defects || [] : item.defects || [];
    const manualIssues = item.issueTraceabilities || item.IssueTraceabilities || [];
    const isComplete = errorQty > 0 && itemDefects.length > 0 && manualIssues.length > 0
        && manualIssues.every(issueTraceComplete)
        && (!requireLxvt || manualIssues.every((trace) => Boolean(trace.soLenhXuatVT || trace.SoLenhXuatVT)));
    return <Paper component="button" type="button" onClick={onClick} variant="outlined" sx={{
        width: '100%', p: 1.25, textAlign: 'left', cursor: 'pointer', borderRadius: 1.5,
        borderColor: selected ? 'primary.main' : 'divider', bgcolor: selected ? '#f4f6ff' : 'background.paper',
        color: 'text.primary', font: 'inherit', '&:hover': { borderColor: 'primary.light', bgcolor: '#fafbff' }
    }}>
        <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Box sx={{ minWidth: 0 }}><Typography variant="body2" fontWeight={800} noWrap>{phoiTitle(item)}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">{phoiMetaLabel(item) || 'Chưa có mã vật tư'}</Typography></Box>
            {isComplete ? <CheckCircleOutlineIcon color="success" fontSize="small" /> : <ErrorOutlineIcon color="warning" fontSize="small" />}
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}><Chip size="small" label={`Kiểm ${checkedQty || 0}`} /><Chip size="small" color="error" variant="outlined" label={`Lỗi ${errorQty}`} /></Stack>
    </Paper>;
};

const PhoiPickerDialog = ({ open, onClose, isStageBtp, search, onSearch, materials, selectedIds, onToggle }) => (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>{isStageBtp ? 'Chọn BTP sau May' : 'Chọn loại phôi'}</DialogTitle>
        <DialogContent dividers>
            <TextField fullWidth value={search} onChange={onSearch}
                placeholder={isStageBtp ? 'Tìm mã hoặc tên BTP…' : 'Tìm vật tư, quy cách, loại phôi, số phôi…'}
                InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }} sx={{ mb: 2 }} />
            {isStageBtp && <Alert severity="info" sx={{ mb: 2 }}>Lỗi phát hiện tại Bao gói được ghi nhận trên BTP sau công đoạn May.</Alert>}
            <Stack spacing={2}>{materials.map((material) => (
                <Box key={`${material.SourceType || 'COMPONENT'}:${material.SourceVatTuId || material.SourceId}`}>
                    <Typography fontWeight={800}>{material.MaVatTu || 'Vật tư chưa có mã'}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{material.QuyCachVatTu || 'Chưa có quy cách'}</Typography>
                    <Stack spacing={0.75}>{material.phoi.map((option) => (
                        <Paper key={itemKey(option)} variant="outlined" sx={{ p: 1 }}>
                            <Stack direction="row" alignItems="center">
                                <Checkbox checked={selectedIds.has(itemKey(option))} onChange={() => onToggle(option, material)} />
                                <Box><Stack direction="row" spacing={0.75} alignItems="center"><Typography variant="body2" fontWeight={700}>{phoiTitle(option)}</Typography>{sourceTypeOf(option) === 'MANUAL' && <Chip size="small" color="warning" variant="outlined" label="Nhập tay" />}</Stack>
                                    <Typography variant="caption" color="text.secondary">
                                        {sourceTypeOf(option) === 'BTP_STAGE' ? 'BTP sau công đoạn May' : option.DaoChat ? `Dao chặt: ${option.DaoChat}` : 'Chưa có dao chặt'}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Paper>
                    ))}</Stack>
                </Box>
            ))}</Stack>
            {!materials.length && <Alert severity="info">Không tìm thấy loại phôi phù hợp.</Alert>}
        </DialogContent>
        <DialogActions><Button onClick={onClose}>Xong</Button></DialogActions>
    </Dialog>
);

const ManualPhoiDialog = ({ open, onClose, materials, saving, onSubmit }) => {
    const [form, setForm] = useState({ sourceVatTuId: '', tenLoaiPhoi: '', daoChat: '', soPhoi: '1', kyHieu: '' });
    const materialOptions = useMemo(() => [...new Map(materials
        .filter((item) => item.SourceVatTuId)
        .map((item) => [Number(item.SourceVatTuId), item])).values()], [materials]);
    const selectedMaterial = materialOptions.find((item) => Number(item.SourceVatTuId) === Number(form.sourceVatTuId)) || null;
    return <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
        <DialogTitle>Nhập thêm phôi thực tế</DialogTitle>
        <DialogContent dividers><Stack spacing={1.5}>
            <Alert severity="info">Phôi nhập tay được lưu theo sản phẩm để có thể chọn lại ở các phiếu sau. Vật tư ERP vẫn được giữ để B7 cấp bù đúng vật tư.</Alert>
            <Autocomplete options={materialOptions} value={selectedMaterial} isOptionEqualToValue={(a, b) => Number(a.SourceVatTuId) === Number(b.SourceVatTuId)} getOptionLabel={(item) => [item.MaVatTu, item.QuyCachVatTu].filter(Boolean).join(' — ')} onChange={(_, value) => setForm((current) => ({ ...current, sourceVatTuId: value?.SourceVatTuId || '' }))} renderInput={(params) => <TextField {...params} required label="Vật tư ERP" />} />
            <TextField required label="Tên loại phôi" value={form.tenLoaiPhoi} onChange={(event) => setForm((current) => ({ ...current, tenLoaiPhoi: event.target.value }))} inputProps={{ maxLength: 200 }} />
            <Grid container spacing={1.25}>
                <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label="Dao chặt" value={form.daoChat} onChange={(event) => setForm((current) => ({ ...current, daoChat: event.target.value }))} inputProps={{ maxLength: 100 }} /></Grid>
                <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label="Số phôi" value={form.soPhoi} onChange={(event) => setForm((current) => ({ ...current, soPhoi: event.target.value }))} helperText="Dữ liệu không hợp lệ sẽ tính là 1" inputProps={{ maxLength: 30 }} /></Grid>
                <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label="Ký hiệu" value={form.kyHieu} onChange={(event) => setForm((current) => ({ ...current, kyHieu: event.target.value }))} inputProps={{ maxLength: 50 }} /></Grid>
            </Grid>
        </Stack></DialogContent>
        <DialogActions><Button disabled={saving} onClick={onClose}>Đóng</Button><Button variant="contained" disabled={saving || !form.sourceVatTuId || !form.tenLoaiPhoi.trim()} startIcon={saving ? <CircularProgress size={18} /> : <AddIcon />} onClick={() => onSubmit(form)}>Lưu và chọn phôi</Button></DialogActions>
    </Dialog>;
};

const DefectEntryRow = ({ defect, groups, defects, responsibleDepartments, onPatch, onSelect, onDelete }) => {
    const chosen = defects.find((option) => Number(option.Id) === Number(defect.defectId));
    const responsible = responsibleDepartments.find((option) => option.source === defect.boPhanGayLoiSource
        && Number(option.sourceId) === Number(defect.boPhanGayLoiSourceId));
    return <Paper variant="outlined" sx={{ p: 1.25, bgcolor: '#fcfcfd' }}><Grid container spacing={1} alignItems="center">
        <Grid size={{ xs: 12, md: 2 }}><FormControl required fullWidth size="small"><InputLabel>Nhóm lỗi</InputLabel><Select label="Nhóm lỗi" value={defect.nhomLoiId} onChange={(event) => onPatch(defect.clientKey, { nhomLoiId: Number(event.target.value) })}>{groups.map((group) => <MenuItem key={group.Id} value={Number(group.Id)}>{group.MaNhom} — {group.TenNhom}</MenuItem>)}</Select></FormControl></Grid>
        <Grid size={{ xs: 12, md: 4 }}><DefectPickerDialog fullWidth defects={defects} onSelect={(value) => onSelect(defect.clientKey, value)} buttonLabel={chosen ? `${chosen.MaLoi || ''} — ${chosen.TenLoi || ''}` : 'Chọn lỗi từ danh mục'} /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><Autocomplete size="small" options={responsibleDepartments} filterOptions={filterResponsibleOptions} value={responsible || null} isOptionEqualToValue={(a, b) => a.key === b.key} getOptionKey={(row) => row.key} getOptionLabel={responsibleOptionLabel} onChange={(_, value) => onPatch(defect.clientKey, { boPhanGayLoiSource: value?.source || '', boPhanGayLoiSourceId: value?.sourceId || '' })} renderInput={(params) => <TextField {...params} required label="Bộ phận/NCC gây lỗi" />} /></Grid>
        <Grid size={{ xs: 9, md: 1 }}><TextField fullWidth size="small" type="number" label="SL lỗi" value={defect.soLuongLoi} onChange={(event) => onPatch(defect.clientKey, { soLuongLoi: event.target.value })} /></Grid>
        <Grid size={{ xs: 3, md: 1 }} textAlign="right"><IconButton color="error" onClick={() => onDelete(defect.clientKey)}><DeleteOutlineIcon /></IconButton></Grid>
        <Grid size={12}><TextField fullWidth size="small" label="Ghi chú lỗi" value={defect.ghiChu} onChange={(event) => onPatch(defect.clientKey, { ghiChu: event.target.value })} /></Grid>
    </Grid></Paper>;
};

const IssueTraceCard = ({ trace, index, departments, requireLxvt, onPatch, onRemove }) => (
    <Paper variant="outlined" sx={{ p: 1.5, borderColor: 'secondary.light' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
            <Box sx={{ flex: 1 }}><Typography fontWeight={900}>{requireLxvt ? `Lệnh xuất vật tư ${index + 1}` : `Tem truy nguyên ${index + 1}`}</Typography><Typography variant="caption" color="text.secondary">Nhập theo thông tin trên tem</Typography></Box>
            <IconButton color="error" aria-label={requireLxvt ? 'Bỏ LXVT và thông tin truy nguyên' : 'Bỏ tem truy nguyên'} onClick={() => onRemove(trace)}><DeleteOutlineIcon /></IconButton>
        </Stack>
        <Grid container spacing={1.25}>
            {requireLxvt && <Grid size={{ xs: 12, md: 4 }}><TextField required fullWidth size="small" label="Số lệnh xuất vật tư" value={trace.soLenhXuatVT} onChange={(event) => onPatch(index, { soLenhXuatVT: event.target.value })} /></Grid>}
            <Grid size={{ xs: 12, md: 4 }}><TextField required fullWidth size="small" label="Lot sản xuất" value={trace.lotSanXuat} onChange={(event) => onPatch(index, { lotSanXuat: event.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Dấu tuần" value={trace.dauTuan} onChange={(event) => onPatch(index, { dauTuan: event.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><Autocomplete size="small" options={departments} value={departments.find((row) => Number(row.Id) === Number(trace.donViTaoPhoiId)) || null} getOptionLabel={(row) => [row.MaBoPhan, row.TenBoPhan].filter(Boolean).join(' — ')} onChange={(_, value) => onPatch(index, { donViTaoPhoiId: value?.Id || '' })} renderInput={(params) => <TextField {...params} required label="Đơn vị tạo phôi" />} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField required fullWidth size="small" type="date" label="Ngày tạo phôi" value={trace.ngayTaoPhoi} onChange={(event) => onPatch(index, { ngayTaoPhoi: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField required fullWidth size="small" label="Tổ sản xuất" value={trace.toSanXuat} onChange={(event) => onPatch(index, { toSanXuat: event.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField required fullWidth size="small" label="Công nhân sản xuất" value={trace.congNhanSanXuat} onChange={(event) => onPatch(index, { congNhanSanXuat: event.target.value })} /></Grid>
        </Grid>
    </Paper>
);

export default function DoiTraPhoiEditor({ mode = 'inspection', phieuId, phieu, plan, items = [], canEdit, onSaved, onContinue, onDirtyChange }) {
    const defaultLot = plan?.ExpectedProductionLot || '';
    const requireLxvt = plan?.RequireLenhXuatVatTu !== false && Number(plan?.RequireLenhXuatVatTu) !== 0;
    const isStageBtp = plan?.PhoiSelectionMode === 'PREVIOUS_STAGE_BTP';
    const [editing, setEditing] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [manualPhoiOpen, setManualPhoiOpen] = useState(false);
    const [savingManualPhoi, setSavingManualPhoi] = useState(false);
    const [loadingLookups, setLoadingLookups] = useState(false);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [detailTab, setDetailTab] = useState('trace');
    const [selectedManualIssueKey, setSelectedManualIssueKey] = useState('');
    const [selectedKey, setSelectedKey] = useState(null);
    const [options, setOptions] = useState([]);
    const [groups, setGroups] = useState([]);
    const [defects, setDefects] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [responsibleDepartments, setResponsibleDepartments] = useState([]);
    const [draft, setDraft] = useState(() => items.map((item) => toDraft(item, defaultLot, requireLxvt)));
    const visibleItems = editing ? draft : items;
    const selectedItem = visibleItems.find((item) => itemKey(item) === selectedKey) || visibleItems[0] || null;
    const selectedIndex = selectedItem ? visibleItems.findIndex((item) => itemKey(item) === itemKey(selectedItem)) : -1;

    useEffect(() => { if (!editing) setDraft(items.map((item) => toDraft(item, defaultLot, requireLxvt))); }, [defaultLot, editing, items, requireLxvt]);
    useEffect(() => { if (visibleItems.length && !visibleItems.some((item) => itemKey(item) === selectedKey)) setSelectedKey(itemKey(visibleItems[0])); }, [selectedKey, visibleItems]);
    useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

    const selectedIds = useMemo(() => new Set(draft.map(itemKey)), [draft]);
    const filteredOptions = useMemo(() => {
        const keyword = clean(search); if (!keyword) return options;
        return options.map((material) => ({ ...material, phoi: material.phoi.filter((item) => [material.MaVatTu, material.QuyCachVatTu, item.TenLoaiPhoi, item.DaoChat, item.SoPhoi, item.KyHieu].some((value) => clean(value).includes(keyword))) })).filter((material) => material.phoi.length);
    }, [options, search]);

    const loadLookups = async () => {
        setLoadingLookups(true);
        try {
            const [p, g, d, t] = await Promise.all([
                getDoiTraPhoiOptions(phieuId), getDoiTraDefectGroups(), getDefectList({ phanHe: 'ALL' }),
                getDoiTraTraceabilityLookups()
            ]);
            setOptions(p.data?.materials || []); setGroups(g.data || []); setDefects(d.data || []);
            const responsibilityMap = new Map((t.data?.responsibleDepartments || []).map((item) => [`${item.source}:${item.sourceId}`, item]));
            setDepartments(t.data?.departments || []); setResponsibleDepartments([...responsibilityMap.values()]);
        } catch (error) { window.alert(error.response?.data?.message || 'Không tải được danh sách phôi hoặc lỗi.'); }
        finally { setLoadingLookups(false); }
    };
    const beginEdit = async () => { setDraft(items.map((item) => toDraft(item, defaultLot, requireLxvt))); setDetailTab('trace'); setEditing(true); onDirtyChange?.(false); await loadLookups(); };
    const updateDraft = (updater) => { setDraft(updater); onDirtyChange?.(true); };
    const patchItem = (patch) => updateDraft((current) => current.map((item, index) => index === selectedIndex ? { ...item, ...patch } : item));
    const patchDefect = (clientKey, patch) => patchItem({ defects: selectedItem.defects.map((defect) => defect.clientKey === clientKey ? { ...defect, ...patch } : defect) });
    const selectDefect = (clientKey, selected) => {
        const current = selectedItem.defects.find((defect) => defect.clientKey === clientKey);
        if (!current) return;
        if (selectedItem.defects.some((item) => item.clientKey !== clientKey && Number(item.defectId) === Number(selected.Id)
            && item.manualLxvtKey === current.manualLxvtKey
            && item.boPhanGayLoiSource === current.boPhanGayLoiSource && Number(item.boPhanGayLoiSourceId) === Number(current.boPhanGayLoiSourceId))) return window.alert('Lỗi này đã được chọn cho cùng LXVT và bộ phận/nhà thầu/nhà cung cấp.');
        patchDefect(clientKey, { defectId: selected.Id, MaLoi: selected.MaLoi || '', TenLoi: selected.TenLoi || '', DefectType: selected.DefectType || '' });
    };
    const addDefectForIssue = (issue) => patchItem({
        defects: [...selectedItem.defects, {
            clientKey: newManualLxvtKey(),
            nhomLoiId: '', defectId: '', soLuongLoi: 1, ghiChu: '',
            boPhanGayLoiSource: '', boPhanGayLoiSourceId: '',
            manualLxvtKey: issue?.manualLxvtKey || issue?.ManualLxvtKey || '', soLenhXuatVT: issue?.soLenhXuatVT || issue?.SoLenhXuatVT || ''
        }]
    });
    const addIssueTrace = () => patchItem({
        issueTraceabilities: [...selectedItem.issueTraceabilities, {
            manualLxvtKey: newManualLxvtKey(), soLenhXuatVT: '', lotSanXuat: defaultLot,
            dauTuan: '', donViTaoPhoiId: '', ngayTaoPhoi: '', toSanXuat: '', congNhanSanXuat: ''
        }]
    });
    const patchIssueTrace = (index, patch) => patchItem({ issueTraceabilities: selectedItem.issueTraceabilities.map((trace, currentIndex) => currentIndex === index ? { ...trace, ...patch } : trace) });
    const removeIssueTrace = (trace) => patchItem({
        issueTraceabilities: selectedItem.issueTraceabilities.filter((item) => item.manualLxvtKey !== trace.manualLxvtKey),
        defects: selectedItem.defects.filter((defect) => defect.manualLxvtKey !== trace.manualLxvtKey)
    });
    const togglePhoi = (option, material) => {
        const key = itemKey(option);
        updateDraft((current) => current.some((item) => itemKey(item) === key)
            ? current.filter((item) => itemKey(item) !== key)
            : [...current, toDraft({ ...material, ...option }, defaultLot, requireLxvt)]);
        setSelectedKey(key);
    };
    const createManualPhoi = async (form) => {
        try {
            setSavingManualPhoi(true);
            const response = await createDoiTraManualPhoi(phieuId, form);
            const created = response.data;
            if (!created) throw new Error('Không nhận được dữ liệu phôi vừa tạo');
            setOptions((current) => {
                const materialIndex = current.findIndex((item) => Number(item.SourceVatTuId) === Number(created.SourceVatTuId));
                if (materialIndex < 0) return [...current, { SourceType: 'MANUAL', SourceVatTuId: created.SourceVatTuId, MaVatTu: created.MaVatTu, QuyCachVatTu: created.QuyCachVatTu, phoi: [created] }];
                return current.map((item, index) => index === materialIndex ? { ...item, phoi: [...item.phoi, created] } : item);
            });
            const key = itemKey(created);
            updateDraft((current) => current.some((item) => itemKey(item) === key) ? current : [...current, toDraft(created, defaultLot, requireLxvt)]);
            setSelectedKey(key);
            setManualPhoiOpen(false);
        } catch (error) {
            window.alert(error.response?.data?.message || error.message || 'Không tạo được phôi nhập tay.');
        } finally {
            setSavingManualPhoi(false);
        }
    };
    const validate = () => {
        for (const item of draft) {
            const checked = Number(item.soLuongKiem); const rejected = defectiveQuantity(item);
            if (!Number.isInteger(checked) || checked <= 0 || rejected > checked) return 'Số lượng kiểm phải là số nguyên dương và không được nhỏ hơn tổng số lượng lỗi.';
            if (mode !== 'list' && !item.issueTraceabilities.length) return requireLxvt ? 'Vui lòng thêm ít nhất một lệnh xuất vật tư.' : 'Vui lòng thêm ít nhất một tem truy nguyên.';
            if (mode !== 'list' && item.issueTraceabilities.some((trace) => (requireLxvt && !trace.soLenhXuatVT.trim()) || !issueTraceComplete(trace))) return requireLxvt ? 'Mỗi lệnh xuất vật tư phải có số lệnh và đầy đủ thông tin tem truy nguyên.' : 'Mỗi tem truy nguyên phải có đầy đủ thông tin.';
            if (mode !== 'list' && item.defects.some((defect) => !defect.manualLxvtKey)) return requireLxvt ? 'Mỗi lỗi phải được gán với một lệnh xuất vật tư đã nhập.' : 'Mỗi lỗi phải được gán với một tem truy nguyên.';
            for (const defect of item.defects) {
                if (!defect.nhomLoiId || !defect.defectId || !defect.boPhanGayLoiSourceId || !Number.isInteger(Number(defect.soLuongLoi)) || Number(defect.soLuongLoi) <= 0) return 'Mỗi dòng lỗi cần có nhóm lỗi, lỗi, bộ phận/nhà thầu/nhà cung cấp gây lỗi và số lượng hợp lệ.';
            }
        }
        return null;
    };
    const save = async (continueAfter = false) => {
        const message = validate(); if (message) return window.alert(message);
        try {
            setSaving(true);
            await saveDoiTraPhoi(phieuId, phieu.RowVersion, draft.map((item) => ({
                sourceType: item.sourceType, sourceId: Number(item.sourceId),
                sourceLoiPhoiId: item.sourceType === 'COMPONENT' ? Number(item.sourceId) : null,
                soLuongKiem: Number(item.soLuongKiem), soLuongPhoiLoi: defectiveQuantity(item), ghiChu: item.ghiChu,
                lotSanXuat: item.lotSanXuat, lenhXuatVatTu: item.issueTraceabilities.map((trace) => trace.soLenhXuatVT.trim()).filter(Boolean).join(', '), dauTuan: item.dauTuan,
                donViTaoPhoiId: item.donViTaoPhoiId ? Number(item.donViTaoPhoiId) : null, ngayTaoPhoi: item.ngayTaoPhoi || null,
                toSanXuat: item.toSanXuat, congNhanSanXuat: item.congNhanSanXuat,
                issueTraceabilities: item.issueTraceabilities,
                defects: item.defects.map((defect) => ({ nhomLoiId: Number(defect.nhomLoiId), defectId: Number(defect.defectId), soLuongLoi: Number(defect.soLuongLoi), ghiChu: defect.ghiChu, boPhanGayLoiSource: defect.boPhanGayLoiSource, boPhanGayLoiSourceId: Number(defect.boPhanGayLoiSourceId), manualLxvtKey: defect.manualLxvtKey || null }))
            })));
            setEditing(false); onDirtyChange?.(false); await onSaved?.();
            if (continueAfter) onContinue?.();
        } catch (error) { window.alert(error.response?.data?.message || 'Không lưu được danh sách phôi và lỗi.'); }
        finally { setSaving(false); }
    };

    if (mode === 'list') return <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <Box><Typography fontWeight={900}>Danh sách phôi cần kiểm</Typography><Typography variant="body2" color="text.secondary">{isStageBtp ? 'Công đoạn Bao gói chọn BTP sau May theo mã .M.' : 'Chọn các loại phôi theo vật tư và nhập số lượng KCS cần kiểm.'}</Typography></Box>
            <Box sx={{ flex: 1 }} />
            {!editing && canEdit && <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={beginEdit}>{items.length ? 'Chỉnh sửa danh sách' : 'Chọn phôi'}</Button>}
            {editing && !isStageBtp && <Button variant="outlined" color="warning" startIcon={<AddIcon />} disabled={loadingLookups} onClick={() => setManualPhoiOpen(true)}>Nhập thêm phôi</Button>}
            {editing && <Button variant="outlined" startIcon={<AddIcon />} disabled={loadingLookups} onClick={() => setPickerOpen(true)}>Chọn phôi từ danh sách</Button>}
        </Stack>
        {loadingLookups && <Alert icon={<CircularProgress size={18} />} severity="info">Đang tải danh sách phôi…</Alert>}
        {!visibleItems.length ? <Alert severity="info">Chưa có phôi nào được chọn. Nhấn “Chọn phôi” để bắt đầu.</Alert> : <Stack spacing={1}>
            {visibleItems.map((item, index) => <Paper key={itemKey(item)} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Grid container spacing={1.25} alignItems="center">
                    <Grid size={{ xs: 12, md: 6 }}><Typography variant="body2" fontWeight={900}>{phoiTitle(item)}</Typography><Typography variant="caption" color="text.secondary">{phoiMetaLabel(item)}</Typography></Grid>
                    <Grid size={{ xs: 8, sm: 4, md: 2 }}>{editing ? <TextField fullWidth size="small" type="number" label="Số lượng kiểm" value={item.soLuongKiem} inputProps={{ min: 1, step: 1 }} onChange={(event) => updateDraft((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, soLuongKiem: event.target.value } : row))} /> : <><Typography variant="caption" color="text.secondary">Số lượng kiểm</Typography><Typography fontWeight={900}>{item.SoLuongKiem}</Typography></>}</Grid>
                    <Grid size={{ xs: 4, sm: 3, md: 2 }}><Typography variant="caption" color="text.secondary">Số phôi lỗi</Typography><Typography fontWeight={800} color="error.main">{editing ? defectiveQuantity(item) : item.SoLuongPhoiLoi || 0}</Typography></Grid>
                    <Grid size={{ xs: 12, sm: 5, md: 2 }} sx={{ textAlign: 'right' }}>{editing ? <IconButton color="error" aria-label="Bỏ phôi khỏi danh sách" onClick={() => updateDraft((current) => current.filter((_, rowIndex) => rowIndex !== index))}><DeleteOutlineIcon /></IconButton> : <Chip size="small" color={(item.defects || []).length && (item.issueTraceabilities || []).length && item.issueTraceabilities.every(issueTraceComplete) && item.defects.every((defect) => defect.ManualLxvtKey) ? 'success' : 'default'} label={(item.defects || []).length && (item.issueTraceabilities || []).length && item.issueTraceabilities.every(issueTraceComplete) && item.defects.every((defect) => defect.ManualLxvtKey) ? 'Đã có kết quả' : 'Chưa kiểm'} />}</Grid>
                </Grid>
            </Paper>)}
        </Stack>}
        {editing && <Paper elevation={3} sx={{ position: 'sticky', bottom: 8, zIndex: 3, p: 1, borderRadius: 2 }}><Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1} justifyContent="flex-end"><Button disabled={saving} onClick={() => { setEditing(false); onDirtyChange?.(false); }}>Hủy chỉnh sửa</Button><Button variant="outlined" startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />} disabled={saving || loadingLookups || !draft.length} onClick={() => save(false)}>Lưu danh sách</Button><Button variant="contained" disabled={saving || loadingLookups || !draft.length} onClick={() => save(true)}>Lưu và nhập kết quả kiểm</Button></Stack></Paper>}
        <PhoiPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} isStageBtp={isStageBtp}
            search={search} onSearch={(event) => setSearch(event.target.value)} materials={filteredOptions}
            selectedIds={selectedIds} onToggle={togglePhoi} />
        {manualPhoiOpen && <ManualPhoiDialog open onClose={() => setManualPhoiOpen(false)} materials={options}
            saving={savingManualPhoi} onSubmit={createManualPhoi} />}
    </Stack>;

    const readDefects = selectedItem?.defects || [];
    const selectedIssueOptions = (selectedItem?.issueTraceabilities || []).map((trace) => ({
        manualLxvtKey: trace.manualLxvtKey || trace.ManualLxvtKey,
        SoLenhXuatVT: trace.soLenhXuatVT || trace.SoLenhXuatVT
    }));
    const selectedManualIssue = selectedIssueOptions.find((option) => option.manualLxvtKey === selectedManualIssueKey)
        || selectedIssueOptions[0] || null;
    const defectGroupsByIssue = [...readDefects.reduce((result, defect) => {
        const issueId = defect.manualLxvtKey || defect.ManualLxvtKey || '';
        const key = issueId || 'NO_ISSUE';
        if (!result.has(key)) {
            const issue = selectedIssueOptions.find((option) => option.manualLxvtKey === issueId);
            result.set(key, {
                issueId,
                issue: issue || (issueId ? { manualLxvtKey: issueId, SoLenhXuatVT: defect.soLenhXuatVT || defect.SoLenhXuatVT } : null),
                entries: []
            });
        }
        result.get(key).entries.push({ defect });
        return result;
    }, new Map(selectedIssueOptions.map((issue) => [issue.manualLxvtKey, {
        issueId: issue.manualLxvtKey,
        issue,
        entries: []
    }]))).values()];
    return <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <Box><Typography fontWeight={800}>Kết quả kiểm theo loại phôi</Typography><Typography variant="caption" color="text.secondary">Chọn một phôi bên trái để nhập hoặc xem chi tiết.</Typography></Box>
            <Box sx={{ flex: 1 }} />
            {!editing && canEdit && <Button startIcon={<EditOutlinedIcon />} variant="contained" disabled={!items.length} onClick={beginEdit}>Nhập kết quả kiểm</Button>}
        </Stack>
        {loadingLookups && <Alert icon={<CircularProgress size={18} />} severity="info">Đang tải danh sách phôi và lỗi…</Alert>}
        {!visibleItems.length ? <Alert severity="warning">Chưa chọn loại phôi.</Alert> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: '290px minmax(0,1fr)' }, gap: 1.5, alignItems: 'start' }}>
            <Stack spacing={1} sx={{ maxHeight: { md: 'calc(100vh - 310px)' }, overflow: 'auto', pr: { md: 0.5 }, flexDirection: { xs: 'row', md: 'column' }, '& > *': { minWidth: { xs: 250, md: 0 } } }}>
                {visibleItems.map((item) => <MasterItem key={itemKey(item)} item={item} editing={editing}
                    requireLxvt={requireLxvt} selected={itemKey(item) === itemKey(selectedItem)}
                    onClick={() => setSelectedKey(itemKey(item))} />)}
            </Stack>
            {selectedItem && <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', minWidth: 0 }}>
                <Box sx={{ p: 1.5, bgcolor: '#fafbff' }}><Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Box sx={{ minWidth: 0 }}><Typography fontWeight={900}>{phoiTitle(selectedItem)}</Typography><Typography variant="body2" color="text.secondary">{phoiMetaLabel(selectedItem)}</Typography></Box>
                    {editing && <Chip size="small" color="primary" variant="outlined" label="Đang nhập kết quả" />}
                </Stack>
                    {editing ? <Grid container spacing={1} sx={{ mt: 0.5 }}><Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Số lượng kiểm" value={selectedItem.soLuongKiem} slotProps={{ input: { readOnly: true } }} helperText="Chỉnh tại tab Danh sách phôi" /></Grid><Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Số phôi lỗi" value={defectiveQuantity(selectedItem)} slotProps={{ input: { readOnly: true } }} helperText="Tự động theo tổng lỗi" /></Grid><Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Ghi chú phôi" value={selectedItem.ghiChu} onChange={(e) => patchItem({ ghiChu: e.target.value })} /></Grid></Grid> : <Stack direction="row" spacing={1} sx={{ mt: 1 }}><Chip label={`Số lượng kiểm: ${selectedItem.SoLuongKiem}`} /><Chip color="error" label={`Số phôi lỗi: ${selectedItem.SoLuongPhoiLoi}`} /></Stack>}</Box>
                <Tabs value={detailTab} onChange={(_, value) => setDetailTab(value)} variant="scrollable" sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}><Tab value="trace" label={requireLxvt ? '1. Tem truy nguyên & LXVT' : '1. Tem truy nguyên'} /><Tab value="defects" label={`2. Các dạng lỗi (${readDefects.length})`} /></Tabs>
                <Box sx={{ p: { xs: 1.25, md: 1.75 } }}>
                    {detailTab === 'defects' && (editing ? <Stack spacing={1}>
                        {!selectedIssueOptions.length && <Alert severity="warning">{requireLxvt ? 'Chưa có LXVT nào được nhập. Hãy quay lại bước 1 để thêm LXVT và thông tin tem truy nguyên.' : 'Chưa có tem truy nguyên. Hãy quay lại bước 1 để thêm tem.'}</Alert>}
                        {selectedIssueOptions.length > 0 && <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#fafbff' }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                            <Autocomplete sx={{ flex: 1, minWidth: 0 }} size="small" options={selectedIssueOptions} value={selectedManualIssue} isOptionEqualToValue={(a, b) => a.manualLxvtKey === b.manualLxvtKey} getOptionLabel={(option) => requireLxvt ? (option.SoLenhXuatVT || 'Chưa nhập số LXVT') : `Tem truy nguyên ${selectedIssueOptions.findIndex((item) => item.manualLxvtKey === option.manualLxvtKey) + 1}`} onChange={(_, value) => setSelectedManualIssueKey(value?.manualLxvtKey || '')} renderInput={(params) => <TextField {...params} label={requireLxvt ? 'Chọn LXVT đã nhập tem' : 'Chọn tem truy nguyên'} />} />
                            <Button variant="contained" startIcon={<AddIcon />} disabled={!selectedManualIssue} onClick={() => addDefectForIssue(selectedManualIssue)}>{requireLxvt ? 'Thêm lỗi cho LXVT' : 'Thêm lỗi cho tem'}</Button>
                        </Stack></Paper>}
                        {defectGroupsByIssue.map((issueGroup) => <Paper key={issueGroup.issueId || 'NO_ISSUE'} variant="outlined" sx={{ p: 1.25, borderColor: issueGroup.issueId ? 'primary.light' : 'warning.light' }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mb: 1 }}>
                                <Box sx={{ flex: 1 }}><Typography fontWeight={900}>{issueGroup.issue ? (requireLxvt ? `LXVT ${issueGroup.issue.SoLenhXuatVT}` : `Tem truy nguyên ${selectedIssueOptions.findIndex((item) => item.manualLxvtKey === issueGroup.issueId) + 1}`) : (requireLxvt ? 'Chưa gán LXVT' : 'Chưa gán tem')}</Typography><Typography variant="caption" color="text.secondary">{requireLxvt ? 'Lệnh xuất vật tư nhập tay' : 'Thông tin nguồn tạo phôi'}</Typography></Box>
                                {issueGroup.issue && <Button size="small" startIcon={<AddIcon />} onClick={() => addDefectForIssue(issueGroup.issue)}>Thêm lỗi</Button>}
                            </Stack>
                            <Stack spacing={1}>{issueGroup.entries.map(({ defect }) => <DefectEntryRow key={defect.clientKey} defect={defect} groups={groups} defects={defects} responsibleDepartments={responsibleDepartments} onPatch={patchDefect} onSelect={selectDefect} onDelete={(clientKey) => patchItem({ defects: selectedItem.defects.filter((item) => item.clientKey !== clientKey) })} />)}</Stack>
                        </Paper>)}
                        {!defectGroupsByIssue.length && <Alert severity="info">Chưa thêm dạng lỗi cho phôi này.</Alert>}
                    </Stack> : readDefects.length ? <Stack spacing={1}>{defectGroupsByIssue.map((issueGroup) => <Paper key={issueGroup.issueId || 'NO_ISSUE'} variant="outlined" sx={{ p: 1.25 }}><Typography fontWeight={900} color={issueGroup.issueId ? 'secondary.main' : 'warning.main'}>{issueGroup.issue ? (requireLxvt ? `LXVT ${issueGroup.issue.SoLenhXuatVT}` : `Tem truy nguyên ${selectedIssueOptions.findIndex((item) => item.manualLxvtKey === issueGroup.issueId) + 1}`) : (requireLxvt ? 'Không có LXVT' : 'Không có tem truy nguyên')}</Typography><Stack spacing={1} sx={{ mt: 1 }}>{issueGroup.entries.map(({ defect }) => <Box key={defect.Id}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}><Chip size="small" color="primary" label={defect.TenNhomLoi} /><Typography variant="body2" fontWeight={700} sx={{ flex: 1 }}>{[defect.MaLoi, defect.TenLoi].filter(Boolean).join(' — ')}</Typography><Chip size="small" color="error" variant="outlined" label={`SL ${defect.SoLuongLoi}`} /></Stack><Typography variant="caption" color="text.secondary">Bộ phận/nhà thầu/nhà cung cấp gây lỗi: {responsibleLabel(defect) || '---'}</Typography>{defect.GhiChu && <Typography variant="caption" display="block" color="text.secondary">{defect.GhiChu}</Typography>}</Box>)}</Stack></Paper>)}</Stack> : <Alert severity="info">Chưa cập nhật nhóm lỗi/lỗi.</Alert>)}
                    {detailTab === 'trace' && (editing ? <Stack spacing={2}>
                        <Alert severity="info">{requireLxvt ? 'Nhập một hoặc nhiều LXVT. Mỗi lệnh có tem truy nguyên và các lỗi riêng.' : 'Nhập một hoặc nhiều tem truy nguyên. Mỗi tem có các lỗi riêng.'}</Alert>
                        {selectedItem.issueTraceabilities.map((trace, index) => <IssueTraceCard key={trace.manualLxvtKey} trace={trace} index={index} departments={departments} requireLxvt={requireLxvt} onPatch={patchIssueTrace} onRemove={removeIssueTrace} />)}
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><Button variant="outlined" startIcon={<AddIcon />} onClick={addIssueTrace}>{requireLxvt ? 'Thêm LXVT' : 'Thêm tem truy nguyên'}</Button><Button variant="contained" disabled={!selectedItem.issueTraceabilities.length} onClick={() => setDetailTab('defects')}>Tiếp tục nhập dạng lỗi</Button></Stack>
                    </Stack> : selectedItem.issueTraceabilities?.length ? <Stack spacing={1.25}>{selectedItem.issueTraceabilities.map((trace, index) => <Paper key={trace.ManualLxvtKey || trace.Id} variant="outlined" sx={{ p: 1.5 }}><Typography fontWeight={900}>{requireLxvt ? `LXVT ${trace.SoLenhXuatVT}` : `Tem truy nguyên ${index + 1}`}</Typography><Grid container spacing={1.5} sx={{ mt: 0.5 }}>{[['Lot sản xuất', trace.LotSanXuat], ['Dấu tuần', trace.DauTuan], ['Đơn vị tạo phôi', trace.TenDonViTaoPhoi], ['Ngày tạo phôi', String(trace.NgayTaoPhoi || '').slice(0, 10)], ['Tổ sản xuất', trace.ToSanXuat], ['Công nhân sản xuất', trace.CongNhanSanXuat]].map(([label, value]) => <Grid key={label} size={{ xs: 12, sm: 6, md: 4 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={700}>{value || '---'}</Typography></Grid>)}</Grid></Paper>)}</Stack> : <Alert severity="info">{requireLxvt ? 'Chưa nhập lệnh xuất vật tư.' : 'Chưa nhập tem truy nguyên.'}</Alert>)}
                </Box>
            </Paper>}
        </Box>}
        {editing && <Paper elevation={3} sx={{ position: 'sticky', bottom: 8, zIndex: 3, p: 1, borderRadius: 2 }}><Stack direction="row" spacing={1} justifyContent="flex-end"><Button disabled={saving} onClick={() => { setEditing(false); onDirtyChange?.(false); }}>Hủy chỉnh sửa</Button><Button startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />} variant="contained" disabled={saving || loadingLookups} onClick={() => save(false)}>Lưu nháp</Button></Stack></Paper>}
        <PhoiPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} isStageBtp={isStageBtp}
            search={search} onSearch={(event) => setSearch(event.target.value)} materials={filteredOptions}
            selectedIds={selectedIds} onToggle={togglePhoi} />
    </Stack>;
}
