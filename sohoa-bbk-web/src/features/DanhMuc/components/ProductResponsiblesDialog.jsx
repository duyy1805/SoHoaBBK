import { useEffect, useState } from "react";
import {
    Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, IconButton, Stack, TextField, Tooltip, Typography
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
    addSanPhamResponsible,
    getSanPhamResponsibles,
    removeSanPhamResponsible,
    searchSanPhamResponsibleUsers
} from "../../../api/lookup.api";

export default function ProductResponsiblesDialog({ open, product, onClose }) {
    const [mappings, setMappings] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const loadMappings = async () => {
        if (!product?.Id) return;
        const response = await getSanPhamResponsibles(product.Id);
        setMappings(response.data || []);
    };

    useEffect(() => {
        if (!open || !product?.Id) return;
        setError("");
        setSelectedUser(null);
        setKeyword("");
        setLoading(true);
        Promise.all([loadMappings(), searchSanPhamResponsibleUsers("")])
            .then(([, userResponse]) => setUsers(userResponse.data || []))
            .catch((requestError) => setError(requestError?.response?.data?.message || "Không tải được dữ liệu"))
            .finally(() => setLoading(false));
    }, [open, product?.Id]);

    useEffect(() => {
        if (!open) return undefined;
        let active = true;
        const timer = window.setTimeout(async () => {
            try {
                const response = await searchSanPhamResponsibleUsers(keyword);
                if (active) setUsers(response.data || []);
            } catch (requestError) {
                if (active) setError(requestError?.response?.data?.message || "Không tìm được người dùng");
            }
        }, 300);
        return () => { active = false; window.clearTimeout(timer); };
    }, [keyword, open]);

    const addResponsible = async () => {
        if (!selectedUser || saving) return;
        try {
            setSaving(true);
            setError("");
            await addSanPhamResponsible(product.Id, selectedUser.Id);
            setSelectedUser(null);
            await loadMappings();
        } catch (requestError) {
            setError(requestError?.response?.data?.message || "Không thể thêm người phụ trách");
        } finally {
            setSaving(false);
        }
    };

    const removeResponsible = async (mapping) => {
        if (saving) return;
        try {
            setSaving(true);
            setError("");
            await removeSanPhamResponsible(mapping.Id, mapping.RowVersion);
            await loadMappings();
        } catch (requestError) {
            setError(requestError?.response?.data?.message || "Không thể ngừng gắn người phụ trách");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>
                Người phụ trách sản phẩm
                <Typography variant="body2" color="text.secondary">
                    {product?.MaSanPham} — {product?.TenSanPham}
                </Typography>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
                        <Autocomplete
                            fullWidth
                            options={users}
                            value={selectedUser}
                            onChange={(_, value) => setSelectedUser(value)}
                            onInputChange={(_, value, reason) => { if (reason === "input") setKeyword(value); }}
                            filterOptions={(options) => options}
                            getOptionLabel={(option) => `${option.FullName || option.Username} — ${option.TenBoPhan || option.MaBoPhan || "Chưa có bộ phận"}`}
                            isOptionEqualToValue={(option, value) => Number(option.Id) === Number(value.Id)}
                            renderInput={(params) => <TextField {...params} size="small" label="Tìm và chọn người phụ trách" />}
                        />
                        <Button variant="contained" disabled={!selectedUser || saving} onClick={addResponsible} sx={{ whiteSpace: "nowrap" }}>
                            Thêm người
                        </Button>
                    </Stack>
                    <Divider />
                    {loading ? <CircularProgress size={24} /> : mappings.length === 0 ? (
                        <Alert severity="info">Sản phẩm chưa được gắn người phụ trách.</Alert>
                    ) : (
                        <Stack spacing={1}>
                            {mappings.map((mapping) => (
                                <Box key={mapping.Id} sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 1.5, opacity: mapping.IsActive ? 1 : 0.65 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                        <Box>
                                            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                                                <Typography variant="body2" fontWeight={700}>{mapping.FullName || mapping.Username}</Typography>
                                                {mapping.IsPreferredInDepartment && <Chip size="small" color="primary" label="Ưu tiên hiện tại" />}
                                                {!mapping.IsActive && <Chip size="small" label="Đã ngừng" />}
                                            </Stack>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {[mapping.MaBoPhan, mapping.TenBoPhan].filter(Boolean).join(" — ") || "Chưa có bộ phận"}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Gắn bởi {mapping.AddedByName || "—"} · {mapping.AddedAt ? new Date(mapping.AddedAt).toLocaleString("vi-VN") : "—"}
                                            </Typography>
                                        </Box>
                                        {mapping.IsActive && (
                                            <Tooltip title="Ngừng gắn người này">
                                                <span><IconButton color="error" size="small" disabled={saving} onClick={() => removeResponsible(mapping)}><DeleteOutlineIcon /></IconButton></span>
                                            </Tooltip>
                                        )}
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions><Button onClick={onClose}>Đóng</Button></DialogActions>
        </Dialog>
    );
}
