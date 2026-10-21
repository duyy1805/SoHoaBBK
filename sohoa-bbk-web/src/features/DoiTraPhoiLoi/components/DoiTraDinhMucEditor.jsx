import { useEffect, useMemo, useState } from 'react';
import {
    Alert, Button, CircularProgress, Paper, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import { confirmDoiTraSoLuong, saveDoiTraSoLuong } from '../../../api/doiTraPhoiLoi.api';
import { formatDoiTraQuantity } from '../doiTraPhoiLoi.utils';

const titleOf = (item) => [item.TenLoaiPhoi, item.SoPhoi && `Số phôi ${item.SoPhoi}`, item.KyHieu]
    .filter(Boolean).join(' — ') || `Phôi #${item.Id}`;

const createDraft = (phoiItems, savedItems) => {
    const byMaterial = new Map((savedItems || []).map((item) => [Number(item.SourceVatTuId), item]));
    const materialGroups = new Map();
    (phoiItems || []).forEach((phoi) => {
        const sourceVatTuId = Number(phoi.SourceVatTuId);
        const current = materialGroups.get(sourceVatTuId);
        if (current) {
            current.phoiItems.push(phoi);
            current.soLuongBoLoi = Math.max(current.soLuongBoLoi, Number(phoi.SoLuongPhoiLoi) || 0);
        } else {
            materialGroups.set(sourceVatTuId, {
                sourceVatTuId,
                maVatTu: phoi.MaVatTu,
                quyCachVatTu: phoi.QuyCachVatTu,
                currentUnit: phoi.CurrentTenDonViTinh,
                soLuongBoLoi: Number(phoi.SoLuongPhoiLoi) || 0,
                phoiItems: [phoi]
            });
        }
    });
    return Array.from(materialGroups.values()).map((material) => {
        const saved = byMaterial.get(material.sourceVatTuId) || {};
        return {
            sourceVatTuId: material.sourceVatTuId,
            soLuongDoiTra: saved.SoLuongDoiTra ?? '',
            ghiChu: saved.GhiChu || '',
            unit: saved.TenDonViTinh || material.currentUnit || '',
            material
        };
    });
};

export default function DoiTraDinhMucEditor({
    phieu, phoiItems = [], dinhMucItems = [], canEdit, canConfirm, onChanged, onDirtyChange
}) {
    const [draft, setDraft] = useState(() => createDraft(phoiItems, dinhMucItems));
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        setDraft(createDraft(phoiItems, dinhMucItems));
        setDirty(false);
    }, [dinhMucItems, phoiItems]);
    useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
    useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

    const complete = useMemo(() => draft.length > 0 && draft.every((item) => Number(item.soLuongDoiTra) > 0), [draft]);
    const patch = (index, values) => {
        setDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...values } : item));
        setDirty(true);
    };

    const save = async () => {
        const invalid = draft.some((item) => item.soLuongDoiTra !== '' && (
            Number(item.soLuongDoiTra) <= 0
            || Math.abs(Number(item.soLuongDoiTra) * 1000 - Math.round(Number(item.soLuongDoiTra) * 1000)) > 1e-7
        ));
        if (invalid) return window.alert('Số lượng đổi trả phải lớn hơn 0 và có tối đa 3 chữ số thập phân.');
        try {
            setSaving(true);
            await saveDoiTraSoLuong(phieu.Id, phieu.RowVersion, draft.map((item) => ({
                sourceVatTuId: item.sourceVatTuId,
                soLuongDoiTra: item.soLuongDoiTra === '' ? null : Number(item.soLuongDoiTra),
                ghiChu: item.ghiChu
            })));
            setDirty(false);
            await onChanged?.();
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không lưu được số lượng đổi trả.');
        } finally {
            setSaving(false);
        }
    };

    const confirm = async () => {
        if (dirty) return window.alert('Vui lòng lưu nháp số lượng đổi trả trước khi xác nhận.');
        if (!complete) return window.alert('Vui lòng nhập số lượng đổi trả cho tất cả vật tư.');
        if (!window.confirm('Xác nhận số lượng đổi trả và tạo lệnh xuất vật tư bổ sung?')) return;
        try {
            setConfirming(true);
            await confirmDoiTraSoLuong(phieu.Id, phieu.RowVersion);
            await onChanged?.();
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không xác nhận được số lượng đổi trả.');
        } finally {
            setConfirming(false);
        }
    };

    if (!phoiItems.length) return <Alert severity="info">Phiếu chưa có loại phôi.</Alert>;

    return (
        <Stack spacing={1.5}>
            <Alert severity="info">
                Sau khi TBP KCS xác nhận, B7 nhập số lượng đổi trả để hệ thống lấy định mức đơn hàng và tạo lệnh xuất bổ sung theo từng kho.
            </Alert>
            {dirty && <Alert severity="warning">Số lượng đổi trả đang có thay đổi chưa lưu.</Alert>}
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead><TableRow sx={{ bgcolor: '#f8fafc' }}>
                        <TableCell>Vật tư / các chi tiết trong bộ</TableCell><TableCell align="right">Số bộ lỗi</TableCell>
                        <TableCell sx={{ minWidth: 170 }}>Số lượng đổi trả</TableCell><TableCell>ĐVT</TableCell>
                        <TableCell sx={{ minWidth: 220 }}>Ghi chú</TableCell>
                    </TableRow></TableHead>
                    <TableBody>{draft.map((item, index) => <TableRow key={item.sourceVatTuId}>
                            <TableCell>
                                <Typography variant="body2" fontWeight={700}>{item.material.maVatTu || '---'}</Typography>
                                {item.material.quyCachVatTu && <Typography variant="caption" display="block">{item.material.quyCachVatTu}</Typography>}
                                <Typography variant="caption" color="text.secondary">
                                    {item.material.phoiItems.map(titleOf).join('; ')}
                                </Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="body2" fontWeight={700}>{formatDoiTraQuantity(item.material.soLuongBoLoi)}</Typography>
                                <Typography variant="caption" color="text.secondary">Lớn nhất trong {item.material.phoiItems.length} chi tiết</Typography>
                            </TableCell>
                            <TableCell><TextField fullWidth size="small" type="number" value={item.soLuongDoiTra} disabled={!canEdit} inputProps={{ min: 0.001, step: 0.001 }} onChange={(event) => patch(index, { soLuongDoiTra: event.target.value })} /></TableCell>
                            <TableCell>{item.unit || '---'}</TableCell>
                            <TableCell><TextField fullWidth size="small" value={item.ghiChu} disabled={!canEdit} onChange={(event) => patch(index, { ghiChu: event.target.value })} /></TableCell>
                        </TableRow>)}</TableBody>
                </Table>
            </TableContainer>
            {canEdit && <Paper elevation={3} sx={{ position: 'sticky', bottom: 8, zIndex: 3, p: 1, borderRadius: 2 }}><Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="outlined" startIcon={saving ? <CircularProgress size={18} /> : <SaveOutlinedIcon />} disabled={saving || confirming} onClick={save}>Lưu nháp số lượng</Button>
                {canConfirm && <Button variant="contained" color="success" startIcon={confirming ? <CircularProgress size={18} /> : <TaskAltOutlinedIcon />} disabled={saving || confirming || dirty || !complete} onClick={confirm}>Xác nhận &amp; tạo LXVT</Button>}
            </Stack></Paper>}
        </Stack>
    );
}
