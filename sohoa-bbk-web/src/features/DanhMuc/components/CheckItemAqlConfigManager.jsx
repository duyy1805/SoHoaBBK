import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    MenuItem,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
    createCheckItemAqlConfig,
    getCheckItemAqlConfigOptions,
    getCheckItemAqlConfigs,
    updateCheckItemAqlConfig,
    updateCheckItemAqlConfigStatus
} from "../../../api/lookup.api";
import { getCurrentUser } from "../../../utils/auth";
import { useToast } from "../../../components/common/ToastContext";

const emptyForm = {
    TenNhom: "",
    TenMucKiem: "",
    InspectionLevel: "",
    KhachHangList: ["DEK"],
    TrangThai: true
};

const canManageAqlConfig = () => {
    const user = getCurrentUser();
    const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    return permissions.includes("QUAN_TRI_DM")
        || roles.some((role) => String(role || "").toUpperCase() === "ADMIN");
};

export default function CheckItemAqlConfigManager() {
    const canManage = canManageAqlConfig();
    const { showToast } = useToast();
    const [rows, setRows] = useState([]);
    const [options, setOptions] = useState({ items: [], inspectionLevels: [] });
    const [filters, setFilters] = useState({ customer: "", groupName: "", status: "", keyword: "" });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);

    const loadOptions = useCallback(async () => {
        try {
            const response = await getCheckItemAqlConfigOptions();
            setOptions(response.data || { items: [], inspectionLevels: [] });
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Không tải được danh sách nhóm và mục kiểm");
        }
    }, []);

    const loadRows = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getCheckItemAqlConfigs({
                customer: filters.customer || undefined,
                groupName: filters.groupName || undefined,
                status: filters.status === "" ? undefined : filters.status,
                keyword: filters.keyword || undefined
            });
            setRows(response.data || []);
            setError("");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Không tải được cấu hình AQL");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { loadOptions(); }, [loadOptions]);
    useEffect(() => { loadRows(); }, [loadRows]);

    const groupOptions = useMemo(() => {
        const map = new Map();
        (options.items || []).forEach((item) => {
            if (!map.has(item.NhomKiemKey)) map.set(item.NhomKiemKey, item.TenNhom);
        });
        return [...map.entries()].map(([key, label]) => ({ key, label }));
    }, [options.items]);

    const selectedGroupKey = useMemo(
        () => groupOptions.find((group) => group.label === form.TenNhom)?.key || "",
        [form.TenNhom, groupOptions]
    );
    const itemOptions = useMemo(
        () => (options.items || []).filter((item) => item.NhomKiemKey === selectedGroupKey),
        [options.items, selectedGroupKey]
    );

    const openCreate = () => {
        setForm({ ...emptyForm, KhachHangList: ["DEK"] });
        setError("");
        setOpen(true);
    };

    const openEdit = (row) => {
        setForm({
            ...row,
            KhachHangList: [row.KhachHang],
            TrangThai: Boolean(row.TrangThai)
        });
        setError("");
        setOpen(true);
    };

    const toggleCustomer = (customer) => {
        setForm((current) => {
            const selected = current.KhachHangList || [];
            const next = selected.includes(customer)
                ? selected.filter((value) => value !== customer)
                : [...selected, customer];
            return { ...current, KhachHangList: next };
        });
    };

    const save = async () => {
        if (!form.TenNhom || !form.TenMucKiem || !form.InspectionLevel || !form.KhachHangList?.length) {
            setError("Vui lòng chọn đầy đủ nhóm, mục kiểm, AQL và khách hàng.");
            return;
        }
        try {
            setSaving(true);
            setError("");
            if (form.Id) {
                await updateCheckItemAqlConfig(form.Id, {
                    ...form,
                    KhachHang: form.KhachHangList[0]
                });
            } else {
                await createCheckItemAqlConfig(form);
            }
            setOpen(false);
            await loadRows();
            showToast("Lưu cấu hình AQL thành công", "success");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Không lưu được cấu hình AQL");
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (row) => {
        try {
            await updateCheckItemAqlConfigStatus(row.Id, !row.TrangThai);
            await loadRows();
            showToast(!row.TrangThai ? "Đã bật cấu hình" : "Đã tắt cấu hình", "success");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Không cập nhật được trạng thái");
        }
    };

    return (
        <Box>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h6" fontWeight={700}>AQL theo mục kiểm</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Ưu tiên: AQL chỉnh riêng trên phiếu → cấu hình theo khách hàng → AQL của nhóm.
                    </Typography>
                </Box>
                {canManage && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                        Thêm cấu hình
                    </Button>
                )}
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                        <TextField
                            select label="Khách hàng" value={filters.customer}
                            onChange={(event) => setFilters((current) => ({ ...current, customer: event.target.value }))}
                            sx={{ minWidth: 150 }}
                        >
                            <MenuItem value="">Tất cả</MenuItem>
                            <MenuItem value="DEK">DEK</MenuItem>
                            <MenuItem value="IKEA">IKEA</MenuItem>
                        </TextField>
                        <TextField
                            select label="Nhóm kiểm" value={filters.groupName}
                            onChange={(event) => setFilters((current) => ({ ...current, groupName: event.target.value }))}
                            sx={{ minWidth: 210 }}
                        >
                            <MenuItem value="">Tất cả</MenuItem>
                            {groupOptions.map((group) => <MenuItem key={group.key} value={group.label}>{group.label}</MenuItem>)}
                        </TextField>
                        <TextField
                            select label="Trạng thái" value={filters.status}
                            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                            sx={{ minWidth: 160 }}
                        >
                            <MenuItem value="">Tất cả</MenuItem>
                            <MenuItem value="true">Đang bật</MenuItem>
                            <MenuItem value="false">Đã tắt</MenuItem>
                        </TextField>
                        <TextField
                            label="Tìm nhóm hoặc mục kiểm" value={filters.keyword}
                            onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
                            fullWidth
                        />
                    </Stack>
                </CardContent>
            </Card>

            <Card variant="outlined">
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: "grey.100" }}>
                                <TableCell>Khách hàng</TableCell>
                                <TableCell>Nhóm kiểm</TableCell>
                                <TableCell>Mục kiểm</TableCell>
                                <TableCell>AQL</TableCell>
                                <TableCell>Cảnh báo</TableCell>
                                <TableCell>Áp dụng</TableCell>
                                <TableCell align="right" />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5 }}><CircularProgress size={28} /></TableCell></TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5 }} color="text.secondary">Chưa có cấu hình phù hợp.</TableCell></TableRow>
                            ) : rows.map((row) => (
                                <TableRow key={row.Id} hover>
                                    <TableCell><Chip size="small" label={row.KhachHang} color={row.KhachHang === "DEK" ? "primary" : "secondary"} /></TableCell>
                                    <TableCell>{row.TenNhom}</TableCell>
                                    <TableCell>{row.TenMucKiem}</TableCell>
                                    <TableCell><Chip size="small" variant="outlined" label={row.InspectionLevel} /></TableCell>
                                    <TableCell>
                                        {!row.IsMatched && <Tooltip title="Không tìm thấy mục kiểm đang hoạt động khớp tên"><WarningAmberIcon color="warning" fontSize="small" /></Tooltip>}
                                        {!row.HasAqlPlan && <Tooltip title="AQL không còn dữ liệu bảng lấy mẫu"><WarningAmberIcon color="error" fontSize="small" /></Tooltip>}
                                        {row.IsMatched && row.HasAqlPlan && "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Switch checked={Boolean(row.TrangThai)} disabled={!canManage} onChange={() => toggleStatus(row)} />
                                    </TableCell>
                                    <TableCell align="right">
                                        {canManage && <IconButton onClick={() => openEdit(row)} aria-label={`Sửa ${row.TenMucKiem}`}><EditIcon /></IconButton>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={open} onClose={saving ? undefined : () => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{form.Id ? "Cập nhật cấu hình AQL" : "Thêm cấu hình AQL"}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 0.5 }}>
                        {error && <Alert severity="error">{error}</Alert>}
                        <Autocomplete
                            options={groupOptions}
                            getOptionLabel={(option) => option.label || ""}
                            value={groupOptions.find((group) => group.label === form.TenNhom) || null}
                            onChange={(_, option) => setForm((current) => ({ ...current, TenNhom: option?.label || "", TenMucKiem: "" }))}
                            renderInput={(params) => <TextField {...params} label="Nhóm kiểm" required />}
                        />
                        <Autocomplete
                            options={itemOptions}
                            getOptionLabel={(option) => option.TenMucKiem || ""}
                            value={itemOptions.find((item) => item.TenMucKiem === form.TenMucKiem) || null}
                            onChange={(_, option) => setForm((current) => ({ ...current, TenMucKiem: option?.TenMucKiem || "" }))}
                            disabled={!form.TenNhom}
                            renderInput={(params) => <TextField {...params} label="Mục kiểm" required />}
                        />
                        <TextField
                            select label="AQL áp dụng" required value={form.InspectionLevel || ""}
                            onChange={(event) => setForm((current) => ({ ...current, InspectionLevel: event.target.value }))}
                        >
                            {(options.inspectionLevels || []).map((level) => (
                                <MenuItem key={level.InspectionLevel} value={level.InspectionLevel}>{level.InspectionLevel}</MenuItem>
                            ))}
                        </TextField>
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Áp dụng khách hàng</Typography>
                            <FormControlLabel
                                control={<Checkbox checked={form.KhachHangList?.includes("DEK") || false} onChange={() => toggleCustomer("DEK")} disabled={Boolean(form.Id)} />}
                                label="DEK"
                            />
                            <FormControlLabel
                                control={<Checkbox checked={form.KhachHangList?.includes("IKEA") || false} onChange={() => toggleCustomer("IKEA")} disabled={Boolean(form.Id)} />}
                                label="IKEA"
                            />
                            {form.Id && <Typography variant="caption" color="text.secondary" display="block">Khi sửa, cấu hình giữ nguyên khách hàng hiện tại.</Typography>}
                        </Box>
                        <FormControlLabel
                            control={<Switch checked={Boolean(form.TrangThai)} onChange={(event) => setForm((current) => ({ ...current, TrangThai: event.target.checked }))} />}
                            label="Bật áp dụng"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} disabled={saving}>Hủy</Button>
                    <Button variant="contained" onClick={save} disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
