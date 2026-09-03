import { useEffect, useMemo, useState } from 'react';
import {
    Alert, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl, Grid, IconButton, InputLabel,
    MenuItem, Paper, Select, Stack, TextField, Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { getDefectList } from '../../../api/lookup.api';
import {
    getDoiTraDefectGroups, getDoiTraPhoiOptions, getDoiTraTraceabilityLookups, saveDoiTraPhoi
} from '../../../api/doiTraPhoiLoi.api';
import DefectPickerDialog from '../../PhieuKiem/components/DefectPickerDialog';

const clean = (value) => String(value || '').trim().toLocaleLowerCase('vi');
const phoiTitle = (item) => [item.TenLoaiPhoi, item.SoPhoi && `Số phôi ${item.SoPhoi}`, item.KyHieu]
    .filter(Boolean).join(' — ') || `Phôi #${item.SourceLoiPhoiId}`;
const defectiveQuantity = (item) => (item.defects || []).reduce(
    (total, defect) => total + (Number(defect.soLuongLoi) || 0),
    0
);

const toDraft = (item, defaultLot = '') => ({
    sourceLoiPhoiId: Number(item.SourceLoiPhoiId),
    MaVatTu: item.MaVatTu || '',
    QuyCachVatTu: item.QuyCachVatTu || '',
    TenLoaiPhoi: item.TenLoaiPhoi || '',
    DaoChat: item.DaoChat || '',
    SoPhoi: item.SoPhoi || '',
    KyHieu: item.KyHieu || '',
    soLuongKiem: item.SoLuongKiem ?? 1,
    soLuongPhoiLoi: item.SoLuongPhoiLoi ?? 1,
    ghiChu: item.GhiChu || '',
    lotSanXuat: item.LotSanXuat || defaultLot,
    lenhXuatVatTu: item.LenhXuatVatTu || '',
    dauTuan: item.DauTuan || '',
    donViTaoPhoiId: item.DonViTaoPhoiId || '',
    ngayTaoPhoi: String(item.NgayTaoPhoi || '').slice(0, 10),
    toSanXuat: item.ToSanXuat || '',
    congNhanSanXuat: item.CongNhanSanXuat || '',
    kcsId: item.KcsId || '',
    defects: (item.defects || []).map((defect) => ({
        nhomLoiId: defect.NhomLoiId || '',
        defectId: defect.DefectId || '',
        MaLoi: defect.MaLoi || '',
        TenLoi: defect.TenLoi || '',
        DefectType: defect.DefectType || '',
        soLuongLoi: defect.SoLuongLoi ?? 1,
        ghiChu: defect.GhiChu || ''
    }))
});

export default function DoiTraPhoiEditor({ phieuId, phieu, plan, items = [], canEdit, onSaved, onDirtyChange }) {
    const defaultLot = plan?.PlanNo || plan?.PlanID || '';
    const [editing, setEditing] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [loadingLookups, setLoadingLookups] = useState(false);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [options, setOptions] = useState([]);
    const [groups, setGroups] = useState([]);
    const [defects, setDefects] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [inspectors, setInspectors] = useState([]);
    const [draft, setDraft] = useState(() => items.map((item) => toDraft(item, defaultLot)));

    useEffect(() => {
        if (!editing) setDraft(items.map((item) => toDraft(item, defaultLot)));
    }, [defaultLot, editing, items]);

    useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

    const selectedIds = useMemo(() => new Set(draft.map((item) => Number(item.sourceLoiPhoiId))), [draft]);
    const filteredOptions = useMemo(() => {
        const keyword = clean(search);
        if (!keyword) return options;
        return options.map((material) => ({
            ...material,
            phoi: material.phoi.filter((item) => [
                material.MaVatTu, material.QuyCachVatTu, item.TenLoaiPhoi,
                item.DaoChat, item.SoPhoi, item.KyHieu
            ].some((value) => clean(value).includes(keyword)))
        })).filter((material) => material.phoi.length > 0);
    }, [options, search]);

    const loadLookups = async () => {
        setLoadingLookups(true);
        try {
            const [phoiResponse, groupResponse, defectResponse, traceabilityResponse] = await Promise.all([
                getDoiTraPhoiOptions(phieuId),
                getDoiTraDefectGroups(),
                getDefectList({ phanHe: 'ALL' }),
                getDoiTraTraceabilityLookups()
            ]);
            setOptions(phoiResponse.data?.materials || []);
            setGroups(groupResponse.data || []);
            setDefects(defectResponse.data || []);
            setDepartments(traceabilityResponse.data?.departments || []);
            setInspectors(traceabilityResponse.data?.inspectors || []);
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không tải được danh sách phôi hoặc lỗi.');
        } finally {
            setLoadingLookups(false);
        }
    };

    const beginEdit = async () => {
        setDraft(items.map((item) => toDraft(item, defaultLot)));
        setEditing(true);
        onDirtyChange?.(false);
        await loadLookups();
    };

    const updateDraft = (updater) => {
        setDraft(updater);
        onDirtyChange?.(true);
    };
    const patchItem = (index, patch) => updateDraft((current) => current.map((item, itemIndex) => (
        itemIndex === index ? { ...item, ...patch } : item
    )));
    const patchDefect = (itemIndex, defectIndex, patch) => updateDraft((current) => current.map((item, currentItemIndex) => (
        currentItemIndex !== itemIndex ? item : {
            ...item,
            defects: item.defects.map((defect, currentDefectIndex) => (
                currentDefectIndex === defectIndex ? { ...defect, ...patch } : defect
            ))
        }
    )));

    const togglePhoi = (option, material) => {
        const id = Number(option.SourceLoiPhoiId);
        updateDraft((current) => current.some((item) => Number(item.sourceLoiPhoiId) === id)
            ? current.filter((item) => Number(item.sourceLoiPhoiId) !== id)
            : [...current, toDraft({ ...option, ...material, SourceLoiPhoiId: id }, defaultLot)]);
    };

    const selectDefect = (itemIndex, defectIndex, selected) => {
        const duplicated = draft[itemIndex].defects.some((item, index) => (
            index !== defectIndex && Number(item.defectId) === Number(selected.Id)
        ));
        if (duplicated) return window.alert('Lỗi này đã được chọn cho loại phôi.');
        patchDefect(itemIndex, defectIndex, {
            defectId: selected.Id,
            MaLoi: selected.MaLoi || '',
            TenLoi: selected.TenLoi || '',
            DefectType: selected.DefectType || ''
        });
    };

    const validate = () => {
        for (const item of draft) {
            const checked = Number(item.soLuongKiem);
            const rejected = defectiveQuantity(item);
            if (!Number.isInteger(checked) || checked <= 0 || rejected > checked) {
                return 'Số lượng kiểm phải là số nguyên dương và không được nhỏ hơn tổng số lượng lỗi.';
            }
            for (const defect of item.defects) {
                const quantity = Number(defect.soLuongLoi);
                if (!defect.nhomLoiId || !defect.defectId || !Number.isInteger(quantity)
                    || quantity <= 0) {
                    return 'Mỗi dòng lỗi cần có nhóm lỗi, lỗi và số lượng hợp lệ.';
                }
            }
        }
        return null;
    };

    const save = async () => {
        const message = validate();
        if (message) return window.alert(message);
        try {
            setSaving(true);
            await saveDoiTraPhoi(phieuId, phieu.RowVersion, draft.map((item) => ({
                sourceLoiPhoiId: Number(item.sourceLoiPhoiId),
                soLuongKiem: Number(item.soLuongKiem),
                soLuongPhoiLoi: defectiveQuantity(item),
                ghiChu: item.ghiChu,
                lotSanXuat: item.lotSanXuat,
                lenhXuatVatTu: item.lenhXuatVatTu,
                dauTuan: item.dauTuan,
                donViTaoPhoiId: item.donViTaoPhoiId ? Number(item.donViTaoPhoiId) : null,
                ngayTaoPhoi: item.ngayTaoPhoi || null,
                toSanXuat: item.toSanXuat,
                congNhanSanXuat: item.congNhanSanXuat,
                kcsId: item.kcsId ? Number(item.kcsId) : null,
                defects: item.defects.map((defect) => ({
                    nhomLoiId: Number(defect.nhomLoiId),
                    defectId: Number(defect.defectId),
                    soLuongLoi: Number(defect.soLuongLoi),
                    ghiChu: defect.ghiChu
                }))
            })));
            setEditing(false);
            onDirtyChange?.(false);
            await onSaved?.();
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không lưu được danh sách phôi và lỗi.');
        } finally {
            setSaving(false);
        }
    };

    if (!editing) return (
        <Stack spacing={1.5}>
            {items.length === 0 ? (
                <Alert severity="info">Chưa chọn loại phôi lỗi.</Alert>
            ) : items.map((item) => (
                <Paper key={item.Id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                        <Box>
                            <Typography fontWeight={800}>{phoiTitle(item)}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {[item.MaVatTu, item.QuyCachVatTu, item.DaoChat].filter(Boolean).join(' — ') || 'Chưa có thông tin vật tư'}
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip label={`SL kiểm: ${item.SoLuongKiem}`} />
                            <Chip color="error" label={`Phôi lỗi: ${item.SoLuongPhoiLoi}`} />
                        </Stack>
                    </Stack>
                    <Divider sx={{ my: 1.25 }} />
                    <Grid container spacing={1} sx={{ mb: 1.25 }}>
                        <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">LOT SX</Typography><Typography variant="body2" fontWeight={700}>{item.LotSanXuat || '---'}</Typography></Grid>
                        <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">LXVT / Dấu tuần</Typography><Typography variant="body2" fontWeight={700}>{[item.LenhXuatVatTu, item.DauTuan].filter(Boolean).join(' / ') || '---'}</Typography></Grid>
                        <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">Đơn vị tạo phôi</Typography><Typography variant="body2" fontWeight={700}>{item.TenDonViTaoPhoi || '---'}</Typography></Grid>
                        <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">Ngày tạo / Tổ SX</Typography><Typography variant="body2" fontWeight={700}>{[String(item.NgayTaoPhoi || '').slice(0, 10), item.ToSanXuat].filter(Boolean).join(' / ') || '---'}</Typography></Grid>
                        <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">Công nhân SX</Typography><Typography variant="body2" fontWeight={700}>{item.CongNhanSanXuat || '---'}</Typography></Grid>
                        <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">KCS</Typography><Typography variant="body2" fontWeight={700}>{item.TenKcs || '---'}</Typography></Grid>
                    </Grid>
                    <Divider sx={{ my: 1.25 }} />
                    {(item.defects || []).length === 0 ? (
                        <Typography variant="body2" color="text.secondary">Chưa cập nhật nhóm lỗi/lỗi.</Typography>
                    ) : (
                        <Stack spacing={0.75}>{item.defects.map((defect) => (
                            <Stack key={defect.Id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                                <Chip size="small" color="primary" label={defect.TenNhomLoi} />
                                <Typography variant="body2" fontWeight={700}>
                                    {[defect.MaLoi, defect.TenLoi].filter(Boolean).join(' — ')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">SL: {defect.SoLuongLoi}</Typography>
                            </Stack>
                        ))}</Stack>
                    )}
                </Paper>
            ))}
            {canEdit && <Button startIcon={<EditOutlinedIcon />} variant="outlined" onClick={beginEdit}>Chỉnh sửa phôi và lỗi</Button>}
        </Stack>
    );

    return (
        <Stack spacing={2}>
            {loadingLookups && <Alert icon={<CircularProgress size={18} />} severity="info">Đang tải danh sách phôi và lỗi…</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button startIcon={<AddIcon />} variant="outlined" disabled={loadingLookups} onClick={() => setPickerOpen(true)}>Chọn loại phôi</Button>
                <Box sx={{ flex: 1 }} />
                <Button onClick={() => { setEditing(false); onDirtyChange?.(false); }} disabled={saving}>Hủy chỉnh sửa</Button>
                <Button startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />} variant="contained" disabled={saving || loadingLookups} onClick={save}>Lưu nháp</Button>
            </Stack>

            {draft.length === 0 && <Alert severity="warning">Chưa chọn loại phôi.</Alert>}
            {draft.map((item, itemIndex) => (
                <Paper key={item.sourceLoiPhoiId} variant="outlined" sx={{ p: { xs: 1.25, md: 2 }, borderRadius: 2 }}>
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Box>
                            <Typography fontWeight={800}>{phoiTitle(item)}</Typography>
                            <Typography variant="body2" color="text.secondary">{[item.MaVatTu, item.QuyCachVatTu, item.DaoChat].filter(Boolean).join(' — ')}</Typography>
                        </Box>
                        <IconButton color="error" onClick={() => updateDraft((current) => current.filter((_, index) => index !== itemIndex))}><DeleteOutlineIcon /></IconButton>
                    </Stack>
                    <Grid container spacing={1.25} sx={{ mt: 0.5 }}>
                        <Grid size={{ xs: 6, md: 2 }}><TextField fullWidth size="small" type="number" label="Số lượng kiểm" value={item.soLuongKiem} inputProps={{ min: 1, step: 1 }} onChange={(event) => patchItem(itemIndex, { soLuongKiem: event.target.value })} /></Grid>
                        <Grid size={{ xs: 6, md: 2 }}><TextField fullWidth size="small" type="number" label="Số phôi lỗi" value={defectiveQuantity(item)} slotProps={{ input: { readOnly: true } }} helperText="Tự động bằng tổng số lỗi" /></Grid>
                        <Grid size={{ xs: 12, md: 8 }}><TextField fullWidth size="small" label="Ghi chú phôi" value={item.ghiChu} onChange={(event) => patchItem(itemIndex, { ghiChu: event.target.value })} /></Grid>
                    </Grid>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ mt: 2, mb: 1 }}>Thông tin LOT và tem truy nguyên</Typography>
                    <Grid container spacing={1.25}>
                        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="LOT SX" value={item.lotSanXuat} onChange={(event) => patchItem(itemIndex, { lotSanXuat: event.target.value })} /></Grid>
                        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="LXVT" value={item.lenhXuatVatTu} onChange={(event) => patchItem(itemIndex, { lenhXuatVatTu: event.target.value })} /></Grid>
                        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Dấu tuần" value={item.dauTuan} onChange={(event) => patchItem(itemIndex, { dauTuan: event.target.value })} /></Grid>
                        <Grid size={{ xs: 12, md: 4 }}><Autocomplete size="small" options={departments} value={departments.find((row) => Number(row.Id) === Number(item.donViTaoPhoiId)) || null} getOptionLabel={(row) => [row.MaBoPhan, row.TenBoPhan].filter(Boolean).join(' — ')} onChange={(_, value) => patchItem(itemIndex, { donViTaoPhoiId: value?.Id || '' })} renderInput={(params) => <TextField {...params} label="Đơn vị tạo phôi" />} /></Grid>
                        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" type="date" label="Ngày tạo phôi" value={item.ngayTaoPhoi} onChange={(event) => patchItem(itemIndex, { ngayTaoPhoi: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
                        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Tổ sản xuất" value={item.toSanXuat} onChange={(event) => patchItem(itemIndex, { toSanXuat: event.target.value })} /></Grid>
                        <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" label="Công nhân sản xuất" value={item.congNhanSanXuat} onChange={(event) => patchItem(itemIndex, { congNhanSanXuat: event.target.value })} helperText="Có thể nhập nhiều tên" /></Grid>
                        <Grid size={{ xs: 12, md: 6 }}><Autocomplete size="small" options={inspectors} value={inspectors.find((row) => Number(row.Id) === Number(item.kcsId)) || null} getOptionLabel={(row) => [row.FullName || row.Username, row.TenBoPhan].filter(Boolean).join(' — ')} onChange={(_, value) => patchItem(itemIndex, { kcsId: value?.Id || '' })} renderInput={(params) => <TextField {...params} label="KCS" />} /></Grid>
                    </Grid>
                    <Divider sx={{ my: 1.5 }} />
                    <Stack spacing={1.25}>
                        {item.defects.map((defect, defectIndex) => {
                            const selected = defects.find((option) => Number(option.Id) === Number(defect.defectId));
                            return (
                                <Paper key={`${item.sourceLoiPhoiId}-${defectIndex}`} variant="outlined" sx={{ p: 1.25, bgcolor: '#fafafa' }}>
                                    <Grid container spacing={1} alignItems="center">
                                        <Grid size={{ xs: 12, md: 3 }}>
                                            <FormControl fullWidth size="small"><InputLabel>Nhóm lỗi</InputLabel><Select label="Nhóm lỗi" value={defect.nhomLoiId} onChange={(event) => patchDefect(itemIndex, defectIndex, { nhomLoiId: event.target.value })}>{groups.map((group) => <MenuItem key={group.Id} value={group.Id}>{group.MaNhom} — {group.TenNhom}</MenuItem>)}</Select></FormControl>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 5 }}><DefectPickerDialog fullWidth defects={defects} onSelect={(value) => selectDefect(itemIndex, defectIndex, value)} buttonLabel={selected ? `${selected.MaLoi || ''} — ${selected.TenLoi || ''}` : 'Chọn lỗi từ danh mục'} /></Grid>
                                        <Grid size={{ xs: 9, md: 2 }}><TextField fullWidth size="small" type="number" label="Số lượng lỗi" value={defect.soLuongLoi} inputProps={{ min: 1, step: 1 }} onChange={(event) => patchDefect(itemIndex, defectIndex, { soLuongLoi: event.target.value })} /></Grid>
                                        <Grid size={{ xs: 3, md: 2 }} sx={{ textAlign: 'right' }}><IconButton color="error" onClick={() => patchItem(itemIndex, { defects: item.defects.filter((_, index) => index !== defectIndex) })}><DeleteOutlineIcon /></IconButton></Grid>
                                        <Grid size={12}><TextField fullWidth size="small" label="Ghi chú lỗi" value={defect.ghiChu} onChange={(event) => patchDefect(itemIndex, defectIndex, { ghiChu: event.target.value })} /></Grid>
                                    </Grid>
                                </Paper>
                            );
                        })}
                        <Button size="small" startIcon={<AddIcon />} onClick={() => patchItem(itemIndex, { defects: [...item.defects, { nhomLoiId: '', defectId: '', MaLoi: '', TenLoi: '', DefectType: '', soLuongLoi: 1, ghiChu: '' }] })}>Thêm lỗi cho phôi</Button>
                    </Stack>
                </Paper>
            ))}

            <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>Chọn loại phôi</DialogTitle>
                <DialogContent dividers>
                    <TextField fullWidth value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm vật tư, quy cách, loại phôi, số phôi…" InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }} sx={{ mb: 2 }} />
                    <Stack spacing={2}>{filteredOptions.map((material) => (
                        <Box key={material.SourceVatTuId}>
                            <Typography fontWeight={800}>{material.MaVatTu || 'Vật tư chưa có mã'}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{material.QuyCachVatTu || 'Chưa có quy cách'}</Typography>
                            <Stack spacing={0.75}>{material.phoi.map((option) => (
                                <Paper key={option.SourceLoiPhoiId} variant="outlined" sx={{ p: 1 }}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Checkbox checked={selectedIds.has(Number(option.SourceLoiPhoiId))} onChange={() => togglePhoi(option, material)} />
                                        <Box><Typography variant="body2" fontWeight={700}>{phoiTitle(option)}</Typography><Typography variant="caption" color="text.secondary">{option.DaoChat || 'Chưa có dao chặt'}</Typography></Box>
                                    </Stack>
                                </Paper>
                            ))}</Stack>
                        </Box>
                    ))}</Stack>
                    {!filteredOptions.length && <Alert severity="info">Không tìm thấy loại phôi phù hợp.</Alert>}
                </DialogContent>
                <DialogActions><Button onClick={() => setPickerOpen(false)}>Xong</Button></DialogActions>
            </Dialog>
        </Stack>
    );
}
