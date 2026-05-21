import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Paper,
    Stack,
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
import BugReportIcon from "@mui/icons-material/BugReport";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ImageIcon from "@mui/icons-material/Image";

import {
    createDefect,
    deleteDefect,
    getAssetUrl,
    getDefectList,
    updateDefect
} from "../../../api/lookup.api";

const emptyForm = {
    PhanHe: "SXBT",
    MaNhomLoi: "L05",
    DefectType: "MAJOR",
    LoaiLoiSXBT: "B",
    TrangThai: true
};

const isSxbtDefect = (row) => String(row?.PhanHe || "").trim().toUpperCase() === "SXBT";

const cellSx = {
    py: 1,
    px: 1.5,
    fontSize: 14,
    borderColor: "#e5e7eb",
    verticalAlign: "middle"
};

const headerCellSx = {
    ...cellSx,
    py: 1.25,
    fontSize: 13,
    fontWeight: 700,
    color: "text.secondary",
    bgcolor: "#f8fafc",
    whiteSpace: "nowrap"
};

const clampTextSx = {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    lineHeight: 1.35
};

export default function SxbtDefectManager() {
    const [data, setData] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [open, setOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState("");

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getDefectList({ phanHe: "SXBT" });
            setData((res?.data || []).filter(isSxbtDefect));
            setError("");
        } catch (err) {
            setError("Không thể tải danh mục lỗi SXBT: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredData = useMemo(() => {
        const value = keyword.trim().toLowerCase();
        if (!value) return data;
        return data.filter((row) =>
            [row.MaLoi, row.TenLoi, row.MoTa, row.PhamViApDung, row.ThiTruong]
                .some((field) => String(field || "").toLowerCase().includes(value))
        );
    }, [data, keyword]);

    const handleOpenCreate = () => {
        setForm(emptyForm);
        setOpen(true);
    };

    const handleOpenEdit = (row) => {
        setForm({
            ...emptyForm,
            ...row,
            PhamViApDung: row.PhamViApDung || row.GhiChu || "",
            TrangThai: row.TrangThai !== false && row.TrangThai !== 0
        });
        setOpen(true);
    };

    const handleSave = async () => {
        if (!form.TenLoi || !form.DefectType) return;

        const payload = {
            ...form,
            PhanHe: "SXBT",
            MaNhomLoi: form.MaNhomLoi || "L05",
            DefectType: form.DefectType || "MAJOR",
            LoaiLoiSXBT: form.LoaiLoiSXBT || "B",
            MoTa: form.MoTa || form.TenLoi,
            GhiChu: form.GhiChu || form.PhamViApDung || null,
            ThuTu: form.ThuTu === "" || form.ThuTu == null ? null : Number(form.ThuTu)
        };

        try {
            if (form.Id) {
                await updateDefect(form.Id, payload);
            } else {
                await createDefect(payload);
            }
            setOpen(false);
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || "Có lỗi xảy ra khi lưu danh mục lỗi SXBT");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xoá lỗi SXBT này?")) return;
        try {
            await deleteDefect(id);
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || "Không thể xoá lỗi SXBT");
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            {error && (
                <Alert severity="error" onClose={() => setError("")} sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", md: "center" }}
                spacing={2}
                sx={{ mb: 3 }}
            >
                <Stack direction="row" alignItems="center" spacing={1}>
                    <BugReportIcon color="primary" fontSize="large" />
                    <Typography variant="h5" fontWeight={700}>
                        Danh mục lỗi SXBT
                    </Typography>
                    <Chip label={`${filteredData.length}/${data.length}`} size="small" />
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField
                        size="small"
                        label="Tìm lỗi SXBT"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        sx={{ minWidth: { sm: 260 } }}
                    />
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                        Thêm lỗi SXBT
                    </Button>
                </Stack>
            </Stack>

            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
                <TableContainer component={Paper} sx={{ position: "relative", boxShadow: "none", overflowX: "hidden" }}>
                    {loading && (
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: "rgba(255,255,255,0.7)",
                                zIndex: 2
                            }}
                        >
                            <CircularProgress />
                        </Box>
                    )}

                    <Table
                        size="small"
                        stickyHeader
                        sx={{
                            width: "100%",
                            tableLayout: "fixed",
                            "& tbody tr:hover": { bgcolor: "#f8fbff" }
                        }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ ...headerCellSx, width: "4.5%" }}>STT</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: "12%" }}>Mã lỗi</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: "5%" }} align="center">Loại</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: "38%" }}>Mô tả lỗi</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: "16%" }}>Phạm vi</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: "7%" }}>TT</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: "6%" }} align="center">Ảnh</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: "6.5%" }} align="center">TT</TableCell>
                                <TableCell sx={{ ...headerCellSx, width: "5%" }} align="right"></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredData.length === 0 && !loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                                        <ImageIcon sx={{ color: "text.disabled", fontSize: 56, mb: 1 }} />
                                        <Typography color="text.secondary">Chưa có danh mục lỗi SXBT</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : filteredData.map((row) => (
                                <TableRow key={row.Id} hover sx={{ height: 76 }}>
                                    <TableCell sx={cellSx}>
                                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                            {row.ThuTu || "--"}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={cellSx}>
                                        <Tooltip title={row.MaLoi || ""}>
                                            <Chip
                                                label={row.MaLoi || "--"}
                                                size="small"
                                                variant="outlined"
                                                sx={{
                                                    maxWidth: "100%",
                                                    borderRadius: 1,
                                                    fontWeight: 700,
                                                    color: "text.primary",
                                                    "& .MuiChip-label": {
                                                        display: "block",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis"
                                                    }
                                                }}
                                            />
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell sx={cellSx} align="center">
                                        <Chip
                                            label={row.LoaiLoiSXBT || "B"}
                                            color="warning"
                                            size="small"
                                            sx={{ width: 34, height: 26, borderRadius: "50%", fontWeight: 800 }}
                                        />
                                    </TableCell>
                                    <TableCell sx={cellSx}>
                                        <Tooltip title={row.TenLoi || ""}>
                                            <Typography variant="body2" fontWeight={700} sx={clampTextSx}>
                                                {row.TenLoi}
                                            </Typography>
                                        </Tooltip>
                                        {row.MoTa && row.MoTa !== row.TenLoi && (
                                            <Typography variant="caption" color="text.secondary" sx={clampTextSx}>
                                                {row.MoTa}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell sx={cellSx}>
                                        <Tooltip title={row.PhamViApDung || row.GhiChu || ""}>
                                            <Typography
                                                variant="body2"
                                                color={row.PhamViApDung || row.GhiChu ? "text.primary" : "text.disabled"}
                                                sx={clampTextSx}
                                            >
                                                {row.PhamViApDung || row.GhiChu || "--"}
                                            </Typography>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell sx={cellSx}>
                                        <Typography variant="body2" noWrap color={row.ThiTruong ? "text.primary" : "text.disabled"}>
                                            {row.ThiTruong || "--"}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={cellSx} align="center">
                                        {row.ImageUrl ? (
                                            <Tooltip title="Xem ảnh lỗi">
                                                <Box
                                                    component="button"
                                                    type="button"
                                                    onClick={() => setPreviewImage(getAssetUrl(row.ImageUrl))}
                                                    sx={{
                                                        width: 56,
                                                        height: 42,
                                                        p: 0,
                                                        border: "1px solid",
                                                        borderColor: "divider",
                                                        borderRadius: 1,
                                                        overflow: "hidden",
                                                        cursor: "pointer",
                                                        bgcolor: "#f8fafc"
                                                    }}
                                                >
                                                    <Box
                                                        component="img"
                                                        src={getAssetUrl(row.ImageUrl)}
                                                        alt=""
                                                        sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                                    />
                                                </Box>
                                            </Tooltip>
                                        ) : "--"}
                                    </TableCell>
                                    <TableCell sx={cellSx} align="center">
                                        <Chip
                                            label={row.TrangThai ? "Hoạt động" : "Tạm ngưng"}
                                            color={row.TrangThai ? "success" : "default"}
                                            size="small"
                                            variant="outlined"
                                            sx={{ borderRadius: 1, height: 24, fontSize: 12 }}
                                        />
                                    </TableCell>
                                    <TableCell sx={cellSx} align="right">
                                        <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                                            <Tooltip title="Chỉnh sửa">
                                                <IconButton size="small" color="primary" onClick={() => handleOpenEdit(row)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Xoá">
                                                <IconButton size="small" color="error" onClick={() => handleDelete(row.Id)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {form.Id ? "Cập nhật lỗi SXBT" : "Thêm lỗi SXBT"}
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Mã lỗi"
                                fullWidth
                                placeholder="Tự sinh nếu để trống"
                                value={form.MaLoi || ""}
                                onChange={(event) => setForm({ ...form, MaLoi: event.target.value })}
                            />
                            <TextField
                                label="STT"
                                type="number"
                                sx={{ width: { sm: 160 } }}
                                value={form.ThuTu ?? ""}
                                onChange={(event) => setForm({ ...form, ThuTu: event.target.value })}
                            />
                        </Stack>

                        <TextField
                            label="Mô tả lỗi"
                            required
                            fullWidth
                            multiline
                            minRows={2}
                            value={form.TenLoi || ""}
                            onChange={(event) => setForm({ ...form, TenLoi: event.target.value, MoTa: event.target.value })}
                        />

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Mã nhóm lỗi"
                                fullWidth
                                value={form.MaNhomLoi || "L05"}
                                onChange={(event) => setForm({ ...form, MaNhomLoi: event.target.value })}
                            />
                            <TextField
                                select
                                label="Loại lỗi SXBT"
                                fullWidth
                                value={form.LoaiLoiSXBT || "B"}
                                onChange={(event) => setForm({ ...form, LoaiLoiSXBT: event.target.value })}
                            >
                                <MenuItem value="B">B</MenuItem>
                                <MenuItem value="C">C</MenuItem>
                            </TextField>
                            <TextField
                                select
                                label="Defect Type"
                                fullWidth
                                value={form.DefectType || "MAJOR"}
                                onChange={(event) => setForm({ ...form, DefectType: event.target.value })}
                            >
                                <MenuItem value="CRITICAL">CRITICAL</MenuItem>
                                <MenuItem value="MAJOR">MAJOR</MenuItem>
                                <MenuItem value="MINOR">MINOR</MenuItem>
                            </TextField>
                        </Stack>

                        <TextField
                            label="Phạm vi áp dụng"
                            fullWidth
                            multiline
                            minRows={2}
                            value={form.PhamViApDung || ""}
                            onChange={(event) => setForm({ ...form, PhamViApDung: event.target.value })}
                        />

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Thị trường"
                                fullWidth
                                value={form.ThiTruong || ""}
                                onChange={(event) => setForm({ ...form, ThiTruong: event.target.value })}
                            />
                            <TextField
                                select
                                label="Trạng thái"
                                fullWidth
                                value={form.TrangThai ? "1" : "0"}
                                onChange={(event) => setForm({ ...form, TrangThai: event.target.value === "1" })}
                            >
                                <MenuItem value="1">Hoạt động</MenuItem>
                                <MenuItem value="0">Tạm ngưng</MenuItem>
                            </TextField>
                        </Stack>

                        <TextField
                            label="Đường dẫn ảnh"
                            fullWidth
                            placeholder="/uploads/defects/sxbt/SXBT-L05-001.png"
                            value={form.ImageUrl || ""}
                            onChange={(event) => setForm({ ...form, ImageUrl: event.target.value })}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, bgcolor: "#f8fafc" }}>
                    <Button onClick={() => setOpen(false)} color="inherit">Huỷ</Button>
                    <Button variant="contained" onClick={handleSave} disabled={!form.TenLoi || !form.DefectType}>
                        {form.Id ? "Cập nhật" : "Lưu dữ liệu"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(previewImage)} onClose={() => setPreviewImage("")} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Ảnh lỗi SXBT</DialogTitle>
                <DialogContent dividers>
                    <Box
                        component="img"
                        src={previewImage}
                        alt="Ảnh lỗi SXBT"
                        sx={{ display: "block", width: "100%", maxHeight: 520, objectFit: "contain" }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewImage("")}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
