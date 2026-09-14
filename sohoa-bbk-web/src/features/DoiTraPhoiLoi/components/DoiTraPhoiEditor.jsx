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
    getDoiTraDefectGroups, getDoiTraPhoiOptions, getDoiTraTraceabilityLookups, saveDoiTraPhoi
} from '../../../api/doiTraPhoiLoi.api';
import DefectPickerDialog from '../../PhieuKiem/components/DefectPickerDialog';

const clean = (value) => String(value || '').trim().toLocaleLowerCase('vi');
const phoiTitle = (item) => [item.TenLoaiPhoi, item.SoPhoi && `Số phôi ${item.SoPhoi}`, item.KyHieu]
    .filter(Boolean).join(' — ') || `Phôi #${item.SourceLoiPhoiId || item.Id}`;
const defectiveQuantity = (item) => (item.defects || []).reduce(
    (total, defect) => total + (Number(defect.soLuongLoi ?? defect.SoLuongLoi) || 0), 0
);
const itemKey = (item) => Number(item.sourceLoiPhoiId || item.SourceLoiPhoiId || item.Id);
const traceComplete = (item) => Boolean(
    (item.lotSanXuat ?? item.LotSanXuat) && (item.lenhXuatVatTu ?? item.LenhXuatVatTu)
    && (item.dauTuan ?? item.DauTuan) && (item.donViTaoPhoiId ?? item.DonViTaoPhoiId)
    && (item.ngayTaoPhoi ?? item.NgayTaoPhoi) && (item.toSanXuat ?? item.ToSanXuat)
    && (item.congNhanSanXuat ?? item.CongNhanSanXuat) && (item.kcsId ?? item.KcsId)
);

const toDraft = (item, defaultLot = '') => ({
    sourceLoiPhoiId: Number(item.SourceLoiPhoiId), MaVatTu: item.MaVatTu || '',
    QuyCachVatTu: item.QuyCachVatTu || '', TenLoaiPhoi: item.TenLoaiPhoi || '',
    DaoChat: item.DaoChat || '', SoPhoi: item.SoPhoi || '', KyHieu: item.KyHieu || '',
    soLuongKiem: item.SoLuongKiem ?? 1, ghiChu: item.GhiChu || '',
    lotSanXuat: item.LotSanXuat || defaultLot, lenhXuatVatTu: item.LenhXuatVatTu || '',
    dauTuan: item.DauTuan || '', donViTaoPhoiId: item.DonViTaoPhoiId || '',
    ngayTaoPhoi: String(item.NgayTaoPhoi || '').slice(0, 10), toSanXuat: item.ToSanXuat || '',
    congNhanSanXuat: item.CongNhanSanXuat || '', kcsId: item.KcsId || '',
    defects: (item.defects || []).map((defect) => ({
        nhomLoiId: defect.NhomLoiId || '', defectId: defect.DefectId || '',
        MaLoi: defect.MaLoi || '', TenLoi: defect.TenLoi || '', DefectType: defect.DefectType || '',
        soLuongLoi: defect.SoLuongLoi ?? 1, ghiChu: defect.GhiChu || ''
    }))
});

const MasterItem = ({ item, selected, editing, onClick }) => {
    const errorQty = editing ? defectiveQuantity(item) : Number(item.SoLuongPhoiLoi || 0);
    const checkedQty = editing ? item.soLuongKiem : item.SoLuongKiem;
    const isComplete = traceComplete(item) && errorQty > 0;
    return <Paper component="button" type="button" onClick={onClick} variant="outlined" sx={{
        width: '100%', p: 1.25, textAlign: 'left', cursor: 'pointer', borderRadius: 1.5,
        borderColor: selected ? 'primary.main' : 'divider', bgcolor: selected ? '#f4f6ff' : 'background.paper',
        color: 'text.primary', font: 'inherit', '&:hover': { borderColor: 'primary.light', bgcolor: '#fafbff' }
    }}>
        <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Box sx={{ minWidth: 0 }}><Typography variant="body2" fontWeight={800} noWrap>{phoiTitle(item)}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">{item.MaVatTu || 'Chưa có mã vật tư'}</Typography></Box>
            {isComplete ? <CheckCircleOutlineIcon color="success" fontSize="small" /> : <ErrorOutlineIcon color="warning" fontSize="small" />}
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}><Chip size="small" label={`Kiểm ${checkedQty || 0}`} /><Chip size="small" color="error" variant="outlined" label={`Lỗi ${errorQty}`} /></Stack>
    </Paper>;
};

export default function DoiTraPhoiEditor({ mode = 'inspection', phieuId, phieu, plan, items = [], canEdit, onSaved, onContinue, onDirtyChange }) {
    const defaultLot = plan?.PlanNo || plan?.PlanID || '';
    const [editing, setEditing] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [loadingLookups, setLoadingLookups] = useState(false);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [detailTab, setDetailTab] = useState('defects');
    const [selectedKey, setSelectedKey] = useState(null);
    const [options, setOptions] = useState([]);
    const [groups, setGroups] = useState([]);
    const [defects, setDefects] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [inspectors, setInspectors] = useState([]);
    const [draft, setDraft] = useState(() => items.map((item) => toDraft(item, defaultLot)));
    const visibleItems = editing ? draft : items;
    const selectedItem = visibleItems.find((item) => itemKey(item) === Number(selectedKey)) || visibleItems[0] || null;
    const selectedIndex = selectedItem ? visibleItems.findIndex((item) => itemKey(item) === itemKey(selectedItem)) : -1;

    useEffect(() => { if (!editing) setDraft(items.map((item) => toDraft(item, defaultLot))); }, [defaultLot, editing, items]);
    useEffect(() => { if (visibleItems.length && !visibleItems.some((item) => itemKey(item) === Number(selectedKey))) setSelectedKey(itemKey(visibleItems[0])); }, [selectedKey, visibleItems]);
    useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

    const selectedIds = useMemo(() => new Set(draft.map(itemKey)), [draft]);
    const filteredOptions = useMemo(() => {
        const keyword = clean(search); if (!keyword) return options;
        return options.map((material) => ({ ...material, phoi: material.phoi.filter((item) => [material.MaVatTu, material.QuyCachVatTu, item.TenLoaiPhoi, item.DaoChat, item.SoPhoi, item.KyHieu].some((value) => clean(value).includes(keyword))) })).filter((material) => material.phoi.length);
    }, [options, search]);

    const loadLookups = async () => {
        setLoadingLookups(true);
        try {
            const [p, g, d, t] = await Promise.all([getDoiTraPhoiOptions(phieuId), getDoiTraDefectGroups(), getDefectList({ phanHe: 'ALL' }), getDoiTraTraceabilityLookups()]);
            setOptions(p.data?.materials || []); setGroups(g.data || []); setDefects(d.data || []);
            setDepartments(t.data?.departments || []); setInspectors(t.data?.inspectors || []);
        } catch (error) { window.alert(error.response?.data?.message || 'Không tải được danh sách phôi hoặc lỗi.'); }
        finally { setLoadingLookups(false); }
    };
    const beginEdit = async () => { setDraft(items.map((item) => toDraft(item, defaultLot))); setEditing(true); onDirtyChange?.(false); await loadLookups(); };
    const updateDraft = (updater) => { setDraft(updater); onDirtyChange?.(true); };
    const patchItem = (patch) => updateDraft((current) => current.map((item, index) => index === selectedIndex ? { ...item, ...patch } : item));
    const patchDefect = (defectIndex, patch) => patchItem({ defects: selectedItem.defects.map((defect, index) => index === defectIndex ? { ...defect, ...patch } : defect) });
    const selectDefect = (defectIndex, selected) => {
        if (selectedItem.defects.some((item, index) => index !== defectIndex && Number(item.defectId) === Number(selected.Id))) return window.alert('Lỗi này đã được chọn cho loại phôi.');
        patchDefect(defectIndex, { defectId: selected.Id, MaLoi: selected.MaLoi || '', TenLoi: selected.TenLoi || '', DefectType: selected.DefectType || '' });
    };
    const togglePhoi = (option, material) => {
        const key = Number(option.SourceLoiPhoiId);
        updateDraft((current) => current.some((item) => itemKey(item) === key) ? current.filter((item) => itemKey(item) !== key) : [...current, toDraft({ ...option, ...material, SourceLoiPhoiId: key }, defaultLot)]);
        setSelectedKey(key);
    };
    const validate = () => {
        for (const item of draft) {
            const checked = Number(item.soLuongKiem); const rejected = defectiveQuantity(item);
            if (!Number.isInteger(checked) || checked <= 0 || rejected > checked) return 'Số lượng kiểm phải là số nguyên dương và không được nhỏ hơn tổng số lượng lỗi.';
            for (const defect of item.defects) if (!defect.nhomLoiId || !defect.defectId || !Number.isInteger(Number(defect.soLuongLoi)) || Number(defect.soLuongLoi) <= 0) return 'Mỗi dòng lỗi cần có nhóm lỗi, lỗi và số lượng hợp lệ.';
        }
        return null;
    };
    const save = async (continueAfter = false) => {
        const message = validate(); if (message) return window.alert(message);
        try {
            setSaving(true);
            await saveDoiTraPhoi(phieuId, phieu.RowVersion, draft.map((item) => ({
                sourceLoiPhoiId: Number(item.sourceLoiPhoiId), soLuongKiem: Number(item.soLuongKiem), soLuongPhoiLoi: defectiveQuantity(item), ghiChu: item.ghiChu,
                lotSanXuat: item.lotSanXuat, lenhXuatVatTu: item.lenhXuatVatTu, dauTuan: item.dauTuan,
                donViTaoPhoiId: item.donViTaoPhoiId ? Number(item.donViTaoPhoiId) : null, ngayTaoPhoi: item.ngayTaoPhoi || null,
                toSanXuat: item.toSanXuat, congNhanSanXuat: item.congNhanSanXuat, kcsId: item.kcsId ? Number(item.kcsId) : null,
                defects: item.defects.map((defect) => ({ nhomLoiId: Number(defect.nhomLoiId), defectId: Number(defect.defectId), soLuongLoi: Number(defect.soLuongLoi), ghiChu: defect.ghiChu }))
            })));
            setEditing(false); onDirtyChange?.(false); await onSaved?.();
            if (continueAfter) onContinue?.();
        } catch (error) { window.alert(error.response?.data?.message || 'Không lưu được danh sách phôi và lỗi.'); }
        finally { setSaving(false); }
    };

    if (mode === 'list') return <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <Box><Typography fontWeight={900}>Danh sách phôi cần kiểm</Typography><Typography variant="body2" color="text.secondary">Chọn các loại phôi theo vật tư và nhập số lượng KCS cần kiểm.</Typography></Box>
            <Box sx={{ flex: 1 }} />
            {!editing && canEdit && <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={beginEdit}>{items.length ? 'Chỉnh sửa danh sách' : 'Chọn phôi'}</Button>}
            {editing && <Button variant="outlined" startIcon={<AddIcon />} disabled={loadingLookups} onClick={() => setPickerOpen(true)}>Chọn phôi từ danh sách</Button>}
        </Stack>
        {loadingLookups && <Alert icon={<CircularProgress size={18} />} severity="info">Đang tải danh sách phôi…</Alert>}
        {!visibleItems.length ? <Alert severity="info">Chưa có phôi nào được chọn. Nhấn “Chọn phôi” để bắt đầu.</Alert> : <Stack spacing={1}>
            {visibleItems.map((item, index) => <Paper key={itemKey(item)} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Grid container spacing={1.25} alignItems="center">
                    <Grid size={{ xs: 12, md: 6 }}><Typography variant="body2" fontWeight={900}>{phoiTitle(item)}</Typography><Typography variant="caption" color="text.secondary">{[item.MaVatTu, item.QuyCachVatTu, item.DaoChat].filter(Boolean).join(' — ')}</Typography></Grid>
                    <Grid size={{ xs: 8, sm: 4, md: 2 }}>{editing ? <TextField fullWidth size="small" type="number" label="Số lượng kiểm" value={item.soLuongKiem} inputProps={{ min: 1, step: 1 }} onChange={(event) => updateDraft((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, soLuongKiem: event.target.value } : row))} /> : <><Typography variant="caption" color="text.secondary">Số lượng kiểm</Typography><Typography fontWeight={900}>{item.SoLuongKiem}</Typography></>}</Grid>
                    <Grid size={{ xs: 4, sm: 3, md: 2 }}><Typography variant="caption" color="text.secondary">Số phôi lỗi</Typography><Typography fontWeight={800} color="error.main">{editing ? defectiveQuantity(item) : item.SoLuongPhoiLoi || 0}</Typography></Grid>
                    <Grid size={{ xs: 12, sm: 5, md: 2 }} sx={{ textAlign: 'right' }}>{editing ? <IconButton color="error" aria-label="Bỏ phôi khỏi danh sách" onClick={() => updateDraft((current) => current.filter((_, rowIndex) => rowIndex !== index))}><DeleteOutlineIcon /></IconButton> : <Chip size="small" color={traceComplete(item) && (item.defects || []).length ? 'success' : 'default'} label={traceComplete(item) && (item.defects || []).length ? 'Đã có kết quả' : 'Chưa kiểm'} />}</Grid>
                </Grid>
            </Paper>)}
        </Stack>}
        {editing && <Paper elevation={3} sx={{ position: 'sticky', bottom: 8, zIndex: 3, p: 1, borderRadius: 2 }}><Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1} justifyContent="flex-end"><Button disabled={saving} onClick={() => { setEditing(false); onDirtyChange?.(false); }}>Hủy chỉnh sửa</Button><Button variant="outlined" startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />} disabled={saving || loadingLookups || !draft.length} onClick={() => save(false)}>Lưu danh sách</Button><Button variant="contained" disabled={saving || loadingLookups || !draft.length} onClick={() => save(true)}>Lưu và nhập kết quả kiểm</Button></Stack></Paper>}
        <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="md"><DialogTitle>Chọn loại phôi</DialogTitle><DialogContent dividers><TextField fullWidth value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm vật tư, quy cách, loại phôi, số phôi…" InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }} sx={{ mb: 2 }} /><Stack spacing={2}>{filteredOptions.map((material) => <Box key={material.SourceVatTuId}><Typography fontWeight={800}>{material.MaVatTu || 'Vật tư chưa có mã'}</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{material.QuyCachVatTu || 'Chưa có quy cách'}</Typography><Stack spacing={0.75}>{material.phoi.map((option) => <Paper key={option.SourceLoiPhoiId} variant="outlined" sx={{ p: 1 }}><Stack direction="row" alignItems="center"><Checkbox checked={selectedIds.has(Number(option.SourceLoiPhoiId))} onChange={() => togglePhoi(option, material)} /><Box><Typography variant="body2" fontWeight={700}>{phoiTitle(option)}</Typography><Typography variant="caption" color="text.secondary">{option.DaoChat || 'Chưa có dao chặt'}</Typography></Box></Stack></Paper>)}</Stack></Box>)}</Stack>{!filteredOptions.length && <Alert severity="info">Không tìm thấy loại phôi phù hợp.</Alert>}</DialogContent><DialogActions><Button onClick={() => setPickerOpen(false)}>Xong</Button></DialogActions></Dialog>
    </Stack>;

    const readDefects = selectedItem?.defects || [];
    return <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <Box><Typography fontWeight={800}>Kết quả kiểm theo loại phôi</Typography><Typography variant="caption" color="text.secondary">Chọn một phôi bên trái để nhập hoặc xem chi tiết.</Typography></Box>
            <Box sx={{ flex: 1 }} />
            {!editing && canEdit && <Button startIcon={<EditOutlinedIcon />} variant="contained" disabled={!items.length} onClick={beginEdit}>Nhập kết quả kiểm</Button>}
        </Stack>
        {loadingLookups && <Alert icon={<CircularProgress size={18} />} severity="info">Đang tải danh sách phôi và lỗi…</Alert>}
        {!visibleItems.length ? <Alert severity="warning">Chưa chọn loại phôi.</Alert> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: '290px minmax(0,1fr)' }, gap: 1.5, alignItems: 'start' }}>
            <Stack spacing={1} sx={{ maxHeight: { md: 'calc(100vh - 310px)' }, overflow: 'auto', pr: { md: 0.5 }, flexDirection: { xs: 'row', md: 'column' }, '& > *': { minWidth: { xs: 250, md: 0 } } }}>
                {visibleItems.map((item) => <MasterItem key={itemKey(item)} item={item} editing={editing} selected={itemKey(item) === itemKey(selectedItem)} onClick={() => setSelectedKey(itemKey(item))} />)}
            </Stack>
            {selectedItem && <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', minWidth: 0 }}>
                <Box sx={{ p: 1.5, bgcolor: '#fafbff' }}><Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Box sx={{ minWidth: 0 }}><Typography fontWeight={900}>{phoiTitle(selectedItem)}</Typography><Typography variant="body2" color="text.secondary">{[selectedItem.MaVatTu, selectedItem.QuyCachVatTu, selectedItem.DaoChat].filter(Boolean).join(' — ')}</Typography></Box>
                    {editing && <Chip size="small" color="primary" variant="outlined" label="Đang nhập kết quả" />}
                </Stack>
                {editing ? <Grid container spacing={1} sx={{ mt: 0.5 }}><Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Số lượng kiểm" value={selectedItem.soLuongKiem} slotProps={{ input: { readOnly: true } }} helperText="Chỉnh tại tab Danh sách phôi" /></Grid><Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Số phôi lỗi" value={defectiveQuantity(selectedItem)} slotProps={{ input: { readOnly: true } }} helperText="Tự động theo tổng lỗi" /></Grid><Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Ghi chú phôi" value={selectedItem.ghiChu} onChange={(e) => patchItem({ ghiChu: e.target.value })} /></Grid></Grid> : <Stack direction="row" spacing={1} sx={{ mt: 1 }}><Chip label={`Số lượng kiểm: ${selectedItem.SoLuongKiem}`} /><Chip color="error" label={`Số phôi lỗi: ${selectedItem.SoLuongPhoiLoi}`} /></Stack>}</Box>
                <Tabs value={detailTab} onChange={(_, value) => setDetailTab(value)} variant="scrollable" sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}><Tab value="defects" label={`Kết quả lỗi (${readDefects.length})`} /><Tab value="trace" label="LOT và truy nguyên" /></Tabs>
                <Box sx={{ p: { xs: 1.25, md: 1.75 } }}>
                    {detailTab === 'defects' && (editing ? <Stack spacing={1}>
                        {selectedItem.defects.map((defect, index) => { const chosen = defects.find((option) => Number(option.Id) === Number(defect.defectId)); return <Paper key={index} variant="outlined" sx={{ p: 1.25, bgcolor: '#fcfcfd' }}><Grid container spacing={1} alignItems="center"><Grid size={{ xs: 12, md: 3 }}><FormControl fullWidth size="small"><InputLabel>Nhóm lỗi</InputLabel><Select label="Nhóm lỗi" value={defect.nhomLoiId} onChange={(e) => patchDefect(index, { nhomLoiId: e.target.value })}>{groups.map((group) => <MenuItem key={group.Id} value={group.Id}>{group.MaNhom} — {group.TenNhom}</MenuItem>)}</Select></FormControl></Grid><Grid size={{ xs: 12, md: 5 }}><DefectPickerDialog fullWidth defects={defects} onSelect={(value) => selectDefect(index, value)} buttonLabel={chosen ? `${chosen.MaLoi || ''} — ${chosen.TenLoi || ''}` : 'Chọn lỗi từ danh mục'} /></Grid><Grid size={{ xs: 9, md: 2 }}><TextField fullWidth size="small" type="number" label="Số lượng lỗi" value={defect.soLuongLoi} onChange={(e) => patchDefect(index, { soLuongLoi: e.target.value })} /></Grid><Grid size={{ xs: 3, md: 2 }} textAlign="right"><IconButton color="error" onClick={() => patchItem({ defects: selectedItem.defects.filter((_, i) => i !== index) })}><DeleteOutlineIcon /></IconButton></Grid><Grid size={12}><TextField fullWidth size="small" label="Ghi chú lỗi" value={defect.ghiChu} onChange={(e) => patchDefect(index, { ghiChu: e.target.value })} /></Grid></Grid></Paper>; })}
                        <Button startIcon={<AddIcon />} onClick={() => patchItem({ defects: [...selectedItem.defects, { nhomLoiId: '', defectId: '', soLuongLoi: 1, ghiChu: '' }] })}>Thêm dòng lỗi</Button>
                    </Stack> : readDefects.length ? <Stack spacing={1}>{readDefects.map((defect) => <Paper key={defect.Id} variant="outlined" sx={{ p: 1.25 }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}><Chip size="small" color="primary" label={defect.TenNhomLoi} /><Typography variant="body2" fontWeight={700} sx={{ flex: 1 }}>{[defect.MaLoi, defect.TenLoi].filter(Boolean).join(' — ')}</Typography><Chip size="small" color="error" variant="outlined" label={`SL ${defect.SoLuongLoi}`} /></Stack>{defect.GhiChu && <Typography variant="caption" color="text.secondary">{defect.GhiChu}</Typography>}</Paper>)}</Stack> : <Alert severity="info">Chưa cập nhật nhóm lỗi/lỗi.</Alert>)}
                    {detailTab === 'trace' && (editing ? <Grid container spacing={1.25}><Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="LOT SX" value={selectedItem.lotSanXuat} onChange={(e) => patchItem({ lotSanXuat: e.target.value })} /></Grid><Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="LXVT" value={selectedItem.lenhXuatVatTu} onChange={(e) => patchItem({ lenhXuatVatTu: e.target.value })} /></Grid><Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Dấu tuần" value={selectedItem.dauTuan} onChange={(e) => patchItem({ dauTuan: e.target.value })} /></Grid><Grid size={{ xs: 12, md: 4 }}><Autocomplete size="small" options={departments} value={departments.find((row) => Number(row.Id) === Number(selectedItem.donViTaoPhoiId)) || null} getOptionLabel={(row) => [row.MaBoPhan, row.TenBoPhan].filter(Boolean).join(' — ')} onChange={(_, value) => patchItem({ donViTaoPhoiId: value?.Id || '' })} renderInput={(params) => <TextField {...params} label="Đơn vị tạo phôi" />} /></Grid><Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" type="date" label="Ngày tạo phôi" value={selectedItem.ngayTaoPhoi} onChange={(e) => patchItem({ ngayTaoPhoi: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} /></Grid><Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Tổ sản xuất" value={selectedItem.toSanXuat} onChange={(e) => patchItem({ toSanXuat: e.target.value })} /></Grid><Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" label="Công nhân sản xuất" value={selectedItem.congNhanSanXuat} onChange={(e) => patchItem({ congNhanSanXuat: e.target.value })} /></Grid><Grid size={{ xs: 12, md: 6 }}><Autocomplete size="small" options={inspectors} value={inspectors.find((row) => Number(row.Id) === Number(selectedItem.kcsId)) || null} getOptionLabel={(row) => [row.FullName || row.Username, row.TenBoPhan].filter(Boolean).join(' — ')} onChange={(_, value) => patchItem({ kcsId: value?.Id || '' })} renderInput={(params) => <TextField {...params} label="KCS" />} /></Grid></Grid> : <Grid container spacing={1.5}>{[['LOT SX', selectedItem.LotSanXuat], ['LXVT', selectedItem.LenhXuatVatTu], ['Dấu tuần', selectedItem.DauTuan], ['Đơn vị tạo phôi', selectedItem.TenDonViTaoPhoi], ['Ngày tạo phôi', String(selectedItem.NgayTaoPhoi || '').slice(0, 10)], ['Tổ sản xuất', selectedItem.ToSanXuat], ['Công nhân sản xuất', selectedItem.CongNhanSanXuat], ['KCS', selectedItem.TenKcs]].map(([label, value]) => <Grid key={label} size={{ xs: 12, sm: 6, md: 4 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={700}>{value || '---'}</Typography></Grid>)}</Grid>)}
                </Box>
            </Paper>}
        </Box>}
        {editing && <Paper elevation={3} sx={{ position: 'sticky', bottom: 8, zIndex: 3, p: 1, borderRadius: 2 }}><Stack direction="row" spacing={1} justifyContent="flex-end"><Button disabled={saving} onClick={() => { setEditing(false); onDirtyChange?.(false); }}>Hủy chỉnh sửa</Button><Button startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />} variant="contained" disabled={saving || loadingLookups} onClick={() => save(false)}>Lưu nháp</Button></Stack></Paper>}
        <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="md"><DialogTitle>Chọn loại phôi</DialogTitle><DialogContent dividers><TextField fullWidth value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm vật tư, quy cách, loại phôi, số phôi…" InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }} sx={{ mb: 2 }} /><Stack spacing={2}>{filteredOptions.map((material) => <Box key={material.SourceVatTuId}><Typography fontWeight={800}>{material.MaVatTu || 'Vật tư chưa có mã'}</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{material.QuyCachVatTu || 'Chưa có quy cách'}</Typography><Stack spacing={0.75}>{material.phoi.map((option) => <Paper key={option.SourceLoiPhoiId} variant="outlined" sx={{ p: 1 }}><Stack direction="row" alignItems="center"><Checkbox checked={selectedIds.has(Number(option.SourceLoiPhoiId))} onChange={() => togglePhoi(option, material)} /><Box><Typography variant="body2" fontWeight={700}>{phoiTitle(option)}</Typography><Typography variant="caption" color="text.secondary">{option.DaoChat || 'Chưa có dao chặt'}</Typography></Box></Stack></Paper>)}</Stack></Box>)}</Stack>{!filteredOptions.length && <Alert severity="info">Không tìm thấy loại phôi phù hợp.</Alert>}</DialogContent><DialogActions><Button onClick={() => setPickerOpen(false)}>Xong</Button></DialogActions></Dialog>
    </Stack>;
}
