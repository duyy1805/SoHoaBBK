import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
    DialogTitle, FormControlLabel, MenuItem, Stack, Switch, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
    getDoiTraOperationConfigs, updateDoiTraOperationConfig
} from '../../../api/doiTraPhoiLoi.api';

const toForm = (row) => ({
    processId: row.ProcessId,
    operationCode: row.OperationCode || '',
    operationName: row.OperationName || '',
    selectionMode: row.SelectionMode || 'COMPONENT',
    btpSuffix: row.BtpSuffix || '',
    requiresB7: Boolean(row.RequiresB7),
    requireLenhXuatVatTu: Boolean(row.RequireLenhXuatVatTu),
    isActive: Boolean(row.IsActive)
});

const modeLabel = (mode) => mode === 'PREVIOUS_STAGE_BTP'
    ? 'BTP sau công đoạn trước' : 'Chi tiết phôi cấu thành';

export default function DoiTraOperationConfigManager() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getDoiTraOperationConfigs();
            setRows(response.data || []);
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không tải được cấu hình luồng đổi trả.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filteredRows = useMemo(() => {
        const keyword = search.trim().toLocaleLowerCase('vi');
        if (!keyword) return rows;
        return rows.filter((row) => [row.OperationCode, row.OperationName]
            .some((value) => String(value || '').toLocaleLowerCase('vi').includes(keyword)));
    }, [rows, search]);

    const save = async () => {
        const suffix = form.btpSuffix.trim().replace(/^\.+/, '').toUpperCase();
        if (form.selectionMode === 'PREVIOUS_STAGE_BTP'
            && (!suffix || suffix.length > 20 || !/^[A-Z0-9_-]+$/.test(suffix))) {
            return window.alert('Hậu tố BTP phải gồm 1-20 ký tự chữ, số, gạch ngang hoặc gạch dưới.');
        }
        try {
            setSaving(true);
            await updateDoiTraOperationConfig(form.processId, {
                selectionMode: form.selectionMode,
                btpSuffix: form.selectionMode === 'PREVIOUS_STAGE_BTP' ? suffix : null,
                requiresB7: form.requiresB7,
                requireLenhXuatVatTu: form.requireLenhXuatVatTu,
                isActive: form.isActive
            });
            setForm(null);
            await load();
        } catch (error) {
            window.alert(error.response?.data?.message || 'Không lưu được cấu hình luồng đổi trả.');
        } finally {
            setSaving(false);
        }
    };

    return <Box>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
            <Box>
                <Typography variant="h6" fontWeight={800}>Luồng đổi trả theo công đoạn</Typography>
                <Typography variant="body2" color="text.secondary">
                    Cấu hình được chụp khi tạo phiếu mới. Thay đổi tại đây không làm đổi luồng của phiếu đã tạo.
                </Typography>
            </Box>
            <TextField size="small" label="Tìm công đoạn" value={search}
                onChange={(event) => setSearch(event.target.value)} sx={{ width: { xs: '100%', md: 280 } }} />
        </Stack>

        <Alert severity="info" sx={{ mb: 2 }}>
            Nếu không bật cấu hình riêng, công đoạn dùng mặc định: chọn chi tiết phôi, áp dụng B7 và bắt buộc LXVT.
        </Alert>

        {loading ? <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box> : (
            <TableContainer><Table size="small">
                <TableHead><TableRow>
                    <TableCell>Công đoạn</TableCell><TableCell>Chế độ chọn phôi</TableCell>
                    <TableCell>Hậu tố BTP</TableCell><TableCell>B7</TableCell>
                    <TableCell>LXVT</TableCell><TableCell>Áp dụng</TableCell><TableCell align="right">Thao tác</TableCell>
                </TableRow></TableHead>
                <TableBody>{filteredRows.map((row) => <TableRow key={row.ProcessId} hover>
                    <TableCell><Typography variant="body2" fontWeight={800}>{row.OperationCode || '---'} — {row.OperationName}</Typography><Typography variant="caption" color="text.secondary">ID {row.ProcessId}</Typography></TableCell>
                    <TableCell><Chip size="small" color={row.SelectionMode === 'PREVIOUS_STAGE_BTP' ? 'primary' : 'default'} label={modeLabel(row.SelectionMode)} /></TableCell>
                    <TableCell>{row.BtpSuffix ? `.${row.BtpSuffix}` : '---'}</TableCell>
                    <TableCell>{row.RequiresB7 ? 'Có' : 'Không'}</TableCell>
                    <TableCell>{row.RequireLenhXuatVatTu ? 'Bắt buộc' : 'Không bắt buộc'}</TableCell>
                    <TableCell><Chip size="small" color={row.IsActive ? 'success' : 'default'} label={row.IsActive ? 'Đang áp dụng' : row.HasConfig ? 'Đã tắt' : 'Mặc định'} /></TableCell>
                    <TableCell align="right"><Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => setForm(toForm(row))}>Cấu hình</Button></TableCell>
                </TableRow>)}</TableBody>
            </Table></TableContainer>
        )}

        <Dialog open={Boolean(form)} onClose={() => !saving && setForm(null)} fullWidth maxWidth="sm">
            {form && <>
                <DialogTitle>Cấu hình {form.operationCode} — {form.operationName}</DialogTitle>
                <DialogContent dividers><Stack spacing={2} sx={{ pt: 0.5 }}>
                    <FormControlLabel control={<Switch checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />} label="Áp dụng cấu hình riêng cho phiếu tạo mới" />
                    <TextField select label="Chế độ chọn phôi" value={form.selectionMode}
                        disabled={!form.isActive} onChange={(event) => setForm((current) => ({ ...current, selectionMode: event.target.value }))}>
                        <MenuItem value="COMPONENT">Chi tiết phôi cấu thành</MenuItem>
                        <MenuItem value="PREVIOUS_STAGE_BTP">BTP sau công đoạn trước</MenuItem>
                    </TextField>
                    {form.selectionMode === 'PREVIOUS_STAGE_BTP' && <TextField required label="Hậu tố mã BTP" value={form.btpSuffix}
                        disabled={!form.isActive} placeholder="Ví dụ: M" helperText="Hệ thống tìm mã <ItemCode>.<Hậu tố>; chỉ nhập M, không nhập dấu chấm."
                        onChange={(event) => setForm((current) => ({ ...current, btpSuffix: event.target.value }))} />}
                    <FormControlLabel control={<Switch checked={form.requiresB7} disabled={!form.isActive}
                        onChange={(event) => setForm((current) => ({ ...current, requiresB7: event.target.checked }))} />} label="Yêu cầu B7 nhập số lượng và tạo LXVT bổ sung" />
                    <FormControlLabel control={<Switch checked={form.requireLenhXuatVatTu} disabled={!form.isActive}
                        onChange={(event) => setForm((current) => ({ ...current, requireLenhXuatVatTu: event.target.checked }))} />} label="Bắt buộc KCS nhập tham chiếu LXVT" />
                    {!form.isActive && <Alert severity="warning">Khi tắt, phiếu mới dùng cấu hình mặc định của hệ thống.</Alert>}
                </Stack></DialogContent>
                <DialogActions><Button disabled={saving} onClick={() => setForm(null)}>Hủy</Button><Button variant="contained" disabled={saving} onClick={save}>{saving ? 'Đang lưu…' : 'Lưu cấu hình'}</Button></DialogActions>
            </>}
        </Dialog>
    </Box>;
}
