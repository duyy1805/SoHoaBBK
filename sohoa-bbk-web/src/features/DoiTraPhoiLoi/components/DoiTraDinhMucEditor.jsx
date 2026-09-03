import { useEffect, useMemo, useState } from 'react';
import {
    Alert, Button, CircularProgress, Paper, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import { executeDoiTraAction, saveDoiTraDinhMuc } from '../../../api/doiTraPhoiLoi.api';
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
            dinhMuc: saved.DinhMuc ?? '',
            ghiChu: saved.GhiChu || '',
            unit: saved.TenDonViTinh || material.currentUnit || '',
            material
        };
    });
};

export default function DoiTraDinhMucEditor({
    phieu, phoiItems = [], dinhMucItems = [], canEdit, canConfirm, onChanged
}) {
    const [draft, setDraft] = useState(() => createDraft(phoiItems, dinhMucItems));
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        setDraft(createDraft(phoiItems, dinhMucItems));
        setDirty(false);
    }, [dinhMucItems, phoiItems]);

    const complete = useMemo(() => draft.length > 0 && draft.every((item) => Number(item.dinhMuc) > 0), [draft]);
    const patch = (index, values) => {
        setDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...values } : item));
        setDirty(true);
    };

    const save = async () => {
        const invalid = draft.some((item) => item.dinhMuc !== '' && Number(item.dinhMuc) <= 0);
        if (invalid) return window.alert('Định mức đã nhập phải lớn hơn 0.');
        try {
            setSaving(true);
            await saveDoiTraDinhMuc(phieu.Id, phieu.RowVersion, draft.map((item) => ({
                sourceVatTuId: item.sourceVatTuId,
                dinhMuc: item.dinhMuc === '' ? null : Number(item.dinhMuc),
                ghiChu: item.ghiChu
            })));
            setDirty(false);
            await onChanged?.();
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không lưu được định mức đổi trả.');
        } finally {
            setSaving(false);
        }
    };

    const confirm = async () => {
        if (dirty) return window.alert('Vui lòng lưu nháp định mức trước khi xác nhận.');
        if (!complete) return window.alert('Vui lòng nhập định mức cho tất cả vật tư.');
        if (!window.confirm('Xác nhận định mức và hoàn tất bước B7? Sau bước này dữ liệu sẽ bị khóa.')) return;
        try {
            setConfirming(true);
            await executeDoiTraAction(phieu.Id, 'B7_CONFIRM', { rowVersion: phieu.RowVersion, ghiChu: null });
            await onChanged?.();
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không xác nhận được định mức.');
        } finally {
            setConfirming(false);
        }
    };

    if (!phoiItems.length) return <Alert severity="info">Phiếu chưa có loại phôi.</Alert>;

    return (
        <Stack spacing={1.5}>
            <Alert severity="info">
                Mỗi mã vật tư là một bộ. Số bộ lỗi được lấy theo chi tiết có số lượng phôi lỗi lớn nhất trong bộ.
            </Alert>
            {dirty && <Alert severity="warning">Định mức đang có thay đổi chưa lưu.</Alert>}
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead><TableRow sx={{ bgcolor: '#f8fafc' }}>
                        <TableCell>Vật tư / các chi tiết trong bộ</TableCell><TableCell align="right">Số bộ lỗi</TableCell>
                        <TableCell sx={{ minWidth: 150 }}>Định mức</TableCell><TableCell>ĐVT</TableCell>
                        <TableCell align="right">Số lượng đổi trả</TableCell><TableCell sx={{ minWidth: 220 }}>Ghi chú</TableCell>
                    </TableRow></TableHead>
                    <TableBody>{draft.map((item, index) => {
                        const total = item.material.soLuongBoLoi * Number(item.dinhMuc || 0);
                        return <TableRow key={item.sourceVatTuId}>
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
                            <TableCell><TextField fullWidth size="small" type="number" value={item.dinhMuc} disabled={!canEdit} inputProps={{ min: 0.000001, step: 0.000001 }} onChange={(event) => patch(index, { dinhMuc: event.target.value })} /></TableCell>
                            <TableCell>{item.unit || '---'}</TableCell>
                            <TableCell align="right">{item.dinhMuc === '' ? '---' : formatDoiTraQuantity(total, 6)}</TableCell>
                            <TableCell><TextField fullWidth size="small" value={item.ghiChu} disabled={!canEdit} onChange={(event) => patch(index, { ghiChu: event.target.value })} /></TableCell>
                        </TableRow>;
                    })}</TableBody>
                </Table>
            </TableContainer>
            {canEdit && <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="outlined" startIcon={saving ? <CircularProgress size={18} /> : <SaveOutlinedIcon />} disabled={saving || confirming} onClick={save}>Lưu nháp định mức</Button>
                {canConfirm && <Button variant="contained" color="success" startIcon={confirming ? <CircularProgress size={18} /> : <TaskAltOutlinedIcon />} disabled={saving || confirming || dirty || !complete} onClick={confirm}>Xác nhận định mức</Button>}
            </Stack>}
        </Stack>
    );
}
