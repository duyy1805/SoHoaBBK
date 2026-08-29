import { useCallback, useEffect, useState } from 'react';
import {
    Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
    DialogTitle, FormControlLabel, Stack, Switch, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
    createDoiTraDefectGroup, getDoiTraDefectGroupManagement, updateDoiTraDefectGroup
} from '../../../api/doiTraPhoiLoi.api';

const emptyForm = { id: null, maNhom: '', tenNhom: '', sortOrder: 0, trangThai: true, rowVersion: null };

export default function DoiTraDefectGroupManager() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [open, setOpen] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getDoiTraDefectGroupManagement();
            setRows(response.data || []);
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không tải được nhóm lỗi đổi phôi.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const edit = (row) => {
        setForm({
            id: row.Id,
            maNhom: row.MaNhom,
            tenNhom: row.TenNhom,
            sortOrder: row.SortOrder,
            trangThai: Boolean(row.TrangThai),
            rowVersion: row.RowVersion
        });
        setOpen(true);
    };

    const save = async () => {
        const maNhom = form.maNhom.trim();
        const tenNhom = form.tenNhom.trim();
        const sortOrder = Number(form.sortOrder);
        if (!maNhom || !tenNhom || !Number.isInteger(sortOrder) || sortOrder < 0) {
            return window.alert('Vui lòng nhập đầy đủ mã, tên nhóm và thứ tự hợp lệ.');
        }
        try {
            setSaving(true);
            if (form.id) {
                await updateDoiTraDefectGroup(form.id, {
                    tenNhom,
                    sortOrder,
                    trangThai: form.trangThai,
                    rowVersion: form.rowVersion
                });
            } else {
                await createDoiTraDefectGroup({ maNhom, tenNhom, sortOrder });
            }
            setOpen(false);
            setForm(emptyForm);
            await load();
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không lưu được nhóm lỗi.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h6" fontWeight={800}>Nhóm lỗi đổi trả phôi</Typography>
                    <Typography variant="body2" color="text.secondary">KCS tự gán từng lỗi trong DM_DEFECT vào một nhóm trên phiếu.</Typography>
                </Box>
                <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setForm(emptyForm); setOpen(true); }}>Thêm nhóm</Button>
            </Stack>
            {loading ? <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress /></Box> : rows.length === 0 ? (
                <Alert severity="info">Chưa có nhóm lỗi đổi phôi.</Alert>
            ) : (
                <TableContainer><Table size="small">
                    <TableHead><TableRow><TableCell>Mã nhóm</TableCell><TableCell>Tên nhóm</TableCell><TableCell>Thứ tự</TableCell><TableCell>Trạng thái</TableCell><TableCell align="right">Thao tác</TableCell></TableRow></TableHead>
                    <TableBody>{rows.map((row) => <TableRow key={row.Id}>
                        <TableCell>{row.MaNhom}</TableCell><TableCell>{row.TenNhom}</TableCell><TableCell>{row.SortOrder}</TableCell>
                        <TableCell><Chip size="small" color={row.TrangThai ? 'success' : 'default'} label={row.TrangThai ? 'Đang dùng' : 'Ngừng dùng'} /></TableCell>
                        <TableCell align="right"><Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => edit(row)}>Sửa</Button></TableCell>
                    </TableRow>)}</TableBody>
                </Table></TableContainer>
            )}

            <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>{form.id ? 'Cập nhật nhóm lỗi' : 'Thêm nhóm lỗi'}</DialogTitle>
                <DialogContent dividers><Stack spacing={2} sx={{ pt: 0.5 }}>
                    <TextField label="Mã nhóm" value={form.maNhom} disabled={Boolean(form.id)} onChange={(event) => setForm((current) => ({ ...current, maNhom: event.target.value }))} />
                    <TextField label="Tên nhóm" value={form.tenNhom} onChange={(event) => setForm((current) => ({ ...current, tenNhom: event.target.value }))} />
                    <TextField type="number" label="Thứ tự" value={form.sortOrder} inputProps={{ min: 0, step: 1 }} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} />
                    {form.id && <FormControlLabel control={<Switch checked={form.trangThai} onChange={(event) => setForm((current) => ({ ...current, trangThai: event.target.checked }))} />} label="Đang sử dụng" />}
                </Stack></DialogContent>
                <DialogActions><Button onClick={() => setOpen(false)} disabled={saving}>Hủy</Button><Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</Button></DialogActions>
            </Dialog>
        </Box>
    );
}
