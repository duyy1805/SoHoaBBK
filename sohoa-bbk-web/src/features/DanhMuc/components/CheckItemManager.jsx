import { useState, useEffect, useCallback } from "react";
import {
    Card, CardContent, Table, TableHead,
    TableRow, TableCell, TableBody,
    IconButton, Button, Dialog,
    DialogTitle, DialogContent, DialogActions,
    TextField, Stack, Alert,
    Box, Typography, CircularProgress,
    Autocomplete, TableContainer, Paper, Tooltip,
    Chip, Checkbox, FormControlLabel,
    Accordion, AccordionSummary, AccordionDetails
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import ChecklistRtlIcon from "@mui/icons-material/ChecklistRtl";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useToast } from "../../../components/common/ToastContext"
import ConfirmDialog from "../../../components/common/ConfirmDialog"
import {
    getNhomKiemList,
    getCheckItemByNhom,
    createCheckItem,
    updateCheckItem,
    deleteCheckItem,
    importDanhMucKiemExcel,
    previewImportDanhMucKiemExcel,
    downloadDanhMucKiemTemplate
} from "../../../api/lookup.api";

const previewAction = {
    CREATE: { label: "Tạo mới", color: "success" },
    CLONE: { label: "Tách nhóm riêng", color: "warning" },
    REACTIVATE: { label: "Kích hoạt lại", color: "info" },
    UPDATE: { label: "Giữ và cập nhật", color: "primary" }
};

function GroupPreviewList({ groups = [], current = false }) {
    if (!groups.length) {
        return (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                Không có nhóm kiểm.
            </Typography>
        );
    }

    return (
        <Stack spacing={1.25}>
            {groups.map((group, groupIndex) => {
                const action = previewAction[group.Action] || previewAction.UPDATE;
                return (
                    <Paper
                        key={`${group.NhomKiemId || group.TenNhom}-${group.AssignmentId || groupIndex}`}
                        variant="outlined"
                        sx={{ p: 1.5, opacity: group.WillDeactivate ? 0.7 : 1 }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography fontWeight={650}>{group.TenNhom}</Typography>
                            {current ? (
                                <>
                                    <Chip
                                        size="small"
                                        label={group.WillClone ? "Sẽ tách bản riêng" : group.WillDeactivate ? "Sẽ ẩn" : "Đang dùng"}
                                        color={group.WillClone ? "warning" : group.WillDeactivate ? "error" : "default"}
                                        variant={group.WillDeactivate ? "filled" : "outlined"}
                                    />
                                    {group.Shared && <Chip size="small" label="Nhóm dùng chung" color="warning" variant="outlined" />}
                                </>
                            ) : (
                                <Chip size="small" label={action.label} color={action.color} variant="outlined" />
                            )}
                        </Stack>
                        {group.MoTa && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                {group.MoTa}
                            </Typography>
                        )}
                        <Stack component="ul" spacing={0.35} sx={{ pl: 2.5, mb: 0, mt: 1 }}>
                            {(group.items || []).map((item, itemIndex) => (
                                <Typography
                                    component="li"
                                    variant="body2"
                                    key={`${item.Id || item.TenMucKiem}-${itemIndex}`}
                                    sx={{
                                        textDecoration: item.WillDeactivate && !group.WillClone ? "line-through" : "none",
                                        color: item.WillDeactivate && !group.WillClone ? "error.main" : "text.primary"
                                    }}
                                >
                                    {item.TenMucKiem}
                                    {item.DiemTrongYeu ? " · Điểm trọng yếu" : ""}
                                </Typography>
                            ))}
                        </Stack>
                    </Paper>
                );
            })}
        </Stack>
    );
}

export default function CheckItemManager() {

    const [nhomList, setNhomList] = useState([]);
    const [selectedNhom, setSelectedNhom] = useState("");
    const [data, setData] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState(null);
    const [previewing, setPreviewing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const { showToast } = useToast();

    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });
    // ================= LOAD NHOM =================
    const loadNhom = useCallback(async () => {
        try {
            const res = await getNhomKiemList();
            setNhomList(res?.data || []);
        } catch (error) {
            const message = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
            setError(message);
        }
    }, []);

    // ================= LOAD DATA =================
    const loadData = useCallback(async () => {
        if (!selectedNhom) {
            setData([]);
            return;
        }

        try {
            setLoading(true);
            const res = await getCheckItemByNhom(selectedNhom);
            setData(res?.data || []);
            setError("");
        } catch (error) {
            const message = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [selectedNhom]);

    // load nhóm khi mount
    useEffect(() => {
        loadNhom();
    }, [loadNhom]);

    // load mục kiểm khi chọn nhóm
    useEffect(() => {
        loadData();
    }, [loadData]);

    // ================= SAVE =================
    const handleSave = async () => {
        if (!form.TenMucKiem) return;

        try {
            if (form.Id) {
                await updateCheckItem(form.Id, form);
            } else {
                await createCheckItem({
                    ...form,
                    NhomKiemId: selectedNhom
                });
            }

            setOpen(false);
            await loadData();
            showToast("Lưu thành công", "success");
        } catch (err) {
            setError(err.response?.data?.message || "Có lỗi khi lưu");
        }
    };

    // ================= DELETE =================
    const handleDelete = async (id) => {
        setConfirmDialog({
            open: true,
            title: "Xác nhận xóa",
            message: "Bạn có chắc chắn muốn xóa mục kiểm này?",
            type: "error",
            onConfirm: async () => {
                try {
                    await deleteCheckItem(id);
                    await loadData();
                    showToast("Xóa thành công", "success");
                } catch (err) {
                    setError(err.response?.data?.message || "Không thể xoá");
                } finally {
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const handleDownloadTemplate = async () => {
        try {
            const res = await downloadDanhMucKiemTemplate();
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.download = "mau-import-danh-muc-kiem.xlsx";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.response?.data?.message || "Không tải được file mẫu");
        }
    };

    const handlePreviewImportExcel = async () => {
        if (!importFile) return;

        try {
            setPreviewing(true);
            setImportResult(null);
            setImportPreview(null);
            const res = await previewImportDanhMucKiemExcel(importFile);
            setImportPreview(res.data?.summary || null);
        } catch (err) {
            setImportResult({
                type: "error",
                message: err.response?.data?.message || "Không xem trước được dữ liệu",
                errors: err.response?.data?.errors || []
            });
        } finally {
            setPreviewing(false);
        }
    };

    const handleImportExcel = async () => {
        if (!importFile || !importPreview) return;

        try {
            setImporting(true);
            setImportResult(null);
            const res = await importDanhMucKiemExcel(importFile);
            setImportResult({
                type: "success",
                message: res.data?.message || "Đồng bộ thành công",
                summary: res.data?.summary
            });
            setImportPreview(null);
            setImportFile(null);
            await loadNhom();
            await loadData();
            showToast("Đồng bộ danh mục kiểm thành công", "success");
        } catch (err) {
            setImportResult({
                type: "error",
                message: err.response?.data?.message || "Import thất bại",
                errors: err.response?.data?.errors || []
            });
        } finally {
            setImporting(false);
        }
    };

    const requestImportConfirmation = () => {
        if (!importFile || !importPreview) return;
        setConfirmDialog({
            open: true,
            title: "Xác nhận đồng bộ danh mục kiểm",
            message: `Danh mục của ${importPreview.affectedProducts} sản phẩm trong file sẽ được thay thế hoàn toàn. Dữ liệu không còn trong file sẽ bị ngừng hoạt động. Bạn có muốn tiếp tục?`,
            type: "warning",
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, open: false }));
                await handleImportExcel();
            }
        });
    };

    // Lấy object nhóm hiện tại cho Autocomplete
    const selectedNhomObj = nhomList.find(n => n.Id === selectedNhom) || null;

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>

            <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
                Quản lý Chi tiết Mục kiểm
            </Typography>

            {error && (
                <Alert severity="error" onClose={() => setError("")} sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* HEADER SELECT & ACTION */}
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "flex-start" }}
                sx={{ mb: 3 }}
            >
                <Box sx={{ width: { xs: "100%", sm: 400 } }}>
                    <Autocomplete
                        options={nhomList}
                        value={selectedNhomObj}
                        onChange={(_, newValue) => setSelectedNhom(newValue?.Id || "")}
                        getOptionLabel={(option) => option.TenNhom || ""}
                        isOptionEqualToValue={(opt, val) => opt.Id === val.Id}
                        sx={{ bgcolor: "background.paper" }}
                        renderOption={(props, option) => {
                            return (
                                <Box
                                    component="li"
                                    key={option.Id}
                                    {...props}
                                    sx={{ borderBottom: '1px solid #eee', py: 1.5 }}
                                >
                                    <Box>
                                        <Typography variant="body1" fontWeight={500}>
                                            {option.TenNhom}
                                        </Typography>
                                        {option.MoTa && (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                {option.MoTa}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            );
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Chọn nhóm kiểm để xem/thêm mục kiểm..."
                                variant="outlined"
                            />
                        )}
                    />
                    {selectedNhomObj?.MoTa && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 0.5 }}>
                            <strong>Mô tả:</strong> {selectedNhomObj.MoTa}
                        </Typography>
                    )}
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <Button
                        variant="outlined"
                        startIcon={<UploadFileIcon />}
                        onClick={() => {
                            setImportResult(null);
                            setImportOpen(true);
                        }}
                        sx={{ height: 56 }}
                    >
                        Import Excel
                    </Button>

                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        disabled={!selectedNhom}
                        onClick={() => {
                            // Mặc định thứ tự tiếp theo
                            const nextThuTu = data.length > 0 ? Math.max(...data.map(d => d.ThuTu || 0)) + 1 : 1;
                            setForm({ ThuTu: nextThuTu });
                            setOpen(true);
                        }}
                        sx={{ height: 56 }}
                    >
                        Thêm mục kiểm
                    </Button>
                </Stack>
            </Stack>

            {/* MAIN CONTENT AREA */}
            {!selectedNhom ? (
                // Empty state khi chưa chọn nhóm
                <Card elevation={1} sx={{ py: 10, textAlign: "center", bgcolor: "#f8fafc", borderRadius: 2 }}>
                    <TouchAppIcon sx={{ fontSize: 60, color: "text.disabled", mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" fontWeight={600}>
                        Chưa chọn Nhóm kiểm
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Vui lòng chọn một nhóm kiểm ở phía trên để xem và quản lý danh sách mục kiểm.
                    </Typography>
                </Card>
            ) : (
                <Card elevation={2}>
                    <TableContainer component={Paper} sx={{ position: "relative" }}>

                        {/* Loading Overlay */}
                        {loading && (
                            <Box
                                sx={{
                                    position: "absolute",
                                    inset: 0,
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    background: "rgba(255, 255, 255, 0.7)",
                                    zIndex: 10
                                }}
                            >
                                <CircularProgress />
                            </Box>
                        )}

                        <Table sx={{ minWidth: 800 }}>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                                    <TableCell sx={{ fontWeight: 600, width: 80 }} align="center">Thứ tự</TableCell>
                                    <TableCell sx={{ fontWeight: 600, width: '25%' }}>Tên mục kiểm</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Tham chiếu</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Phương pháp kiểm</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Tiêu chuẩn</TableCell>
                                    <TableCell sx={{ fontWeight: 600, width: 140 }} align="center">Điểm trọng yếu</TableCell>
                                    <TableCell sx={{ fontWeight: 600, width: 120 }} align="right">Thao tác</TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {data.length === 0 && !loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                                            <ChecklistRtlIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
                                            <Typography color="text.secondary">Nhóm này chưa có mục kiểm nào.</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.sort((a, b) => (a.ThuTu || 0) - (b.ThuTu || 0)).map(row => (
                                        <TableRow key={row.Id} hover>
                                            <TableCell align="center">
                                                <Typography fontWeight="bold" color="text.secondary">
                                                    #{row.ThuTu}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 500 }}>{row.TenMucKiem}</TableCell>
                                            <TableCell>
                                                {row.ThamChieu ? <Chip label={row.ThamChieu} size="small" variant="outlined" /> : "--"}
                                            </TableCell>
                                            <TableCell>{row.PhuongPhapKiem || "--"}</TableCell>
                                            <TableCell sx={{ color: "text.secondary" }}>{row.TieuChuan || "--"}</TableCell>
                                            <TableCell align="center">
                                                {row.DiemTrongYeu ? <Chip label="Trọng yếu" size="small" color="warning" /> : "--"}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Stack direction="row" spacing={0.5} justifyContent="flex-end" sx={{ whiteSpace: "nowrap" }}>
                                                    <Tooltip title="Chỉnh sửa">
                                                        <IconButton color="primary" onClick={() => { setForm({ ...row }); setOpen(true); }}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Xóa">
                                                        <IconButton color="error" onClick={() => handleDelete(row.Id)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            )}

            {/* DIALOG THÊM / SỬA */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: "bold", pb: 1 }}>
                    {form.Id ? "Cập nhật mục kiểm" : "Thêm mục kiểm mới"}
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <TextField
                            label="Tên mục kiểm"
                            required
                            fullWidth
                            value={form.TenMucKiem || ""}
                            onChange={(e) => setForm({ ...form, TenMucKiem: e.target.value })}
                            placeholder="Nhập tên nội dung cần kiểm tra..."
                        />

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Tham chiếu"
                                fullWidth
                                value={form.ThamChieu || ""}
                                onChange={(e) => setForm({ ...form, ThamChieu: e.target.value })}
                                placeholder="VD: ISO, Bản vẽ..."
                            />
                            <TextField
                                label="Thứ tự"
                                type="number"
                                sx={{ width: { xs: "100%", sm: 120 } }}
                                value={form.ThuTu || ""}
                                onChange={(e) => setForm({ ...form, ThuTu: Number(e.target.value) })}
                                InputProps={{ inputProps: { min: 1 } }}
                            />
                        </Stack>

                        <TextField
                            label="Phương pháp kiểm"
                            fullWidth
                            value={form.PhuongPhapKiem || ""}
                            onChange={(e) => setForm({ ...form, PhuongPhapKiem: e.target.value })}
                            placeholder="VD: Bằng mắt thường, Thước kẹp..."
                        />

                        <TextField
                            label="Tiêu chuẩn (Yêu cầu/Dung sai)"
                            fullWidth
                            multiline
                            rows={2}
                            value={form.TieuChuan || ""}
                            onChange={(e) => setForm({ ...form, TieuChuan: e.target.value })}
                            placeholder="Mô tả tiêu chuẩn đạt..."
                        />

                        <FormControlLabel
                            control={(
                                <Checkbox
                                    checked={Boolean(form.DiemTrongYeu)}
                                    onChange={(e) => setForm({ ...form, DiemTrongYeu: e.target.checked })}
                                />
                            )}
                            label="Điểm trọng yếu"
                        />
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, bgcolor: "#f8fafc" }}>
                    <Button onClick={() => setOpen(false)} color="inherit">
                        Huỷ bỏ
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={!form.TenMucKiem}
                    >
                        {form.Id ? "Cập nhật" : "Lưu mục kiểm"}
                    </Button>
                </DialogActions>
            </Dialog>
            <ConfirmDialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
            />

            <Dialog
                open={importOpen}
                onClose={() => !importing && !previewing && setImportOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: "bold", pb: 1 }}>
                    Import danh mục kiểm từ Excel
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2.5}>
                        <Alert severity="info">
                            <strong>Danh mục của các sản phẩm có trong file sẽ được thay thế hoàn toàn theo file Excel.</strong>
                            <br />
                            Nhóm, mục kiểm hoặc liên kết không còn trong file sẽ được ngừng hoạt động; sản phẩm không xuất hiện trong file không bị ảnh hưởng.
                            <br /><br />
                            File .xlsx cần có sheet <strong>DanhMucKiem</strong> với các cột: MaSanPham, TenNhom, MoTaNhom, ThuTuNhom, TenMucKiem, ThamChieu, PhuongPhapKiem, TieuChuan, ThuTuMuc, ThuTuGanNhom, DiemTrongYeu.
                            <br />
                            <strong>MoTaNhom</strong> là bắt buộc và dùng để phân biệt các nhóm kiểm trùng tên giữa từng sản phẩm/vật tư.
                            <br />
                            <strong>DiemTrongYeu</strong> là tùy chọn, nhận Có/Không, true/false hoặc 1/0.
                        </Alert>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <Button
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={handleDownloadTemplate}
                                disabled={importing || previewing}
                            >
                                Tải file mẫu
                            </Button>

                            <Button
                                variant="contained"
                                component="label"
                                startIcon={<UploadFileIcon />}
                                disabled={importing || previewing}
                            >
                                Chọn file .xlsx
                                <input
                                    hidden
                                    type="file"
                                    accept=".xlsx"
                                    onChange={(e) => {
                                        setImportFile(e.target.files?.[0] || null);
                                        setImportPreview(null);
                                        setImportResult(null);
                                        e.target.value = "";
                                    }}
                                />
                            </Button>
                        </Stack>

                        {importFile && (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography fontWeight={600}>{importFile.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {(importFile.size / 1024).toFixed(1)} KB
                                </Typography>
                            </Paper>
                        )}

                        {importPreview && (
                            <Stack spacing={1.5}>
                                <Alert severity="warning" icon={false}>
                                    <Typography fontWeight={700} sx={{ mb: 1 }}>
                                        Xem trước đồng bộ: {importPreview.affectedProducts} sản phẩm, {importPreview.totalRows} dòng Excel
                                    </Typography>
                                    <Stack spacing={0.5}>
                                        <Typography variant="body2">
                                            Nhóm kiểm: tạo {importPreview.createdNhom}, cập nhật {importPreview.updatedNhom}, kích hoạt lại {importPreview.reactivatedNhom}, ngừng hoạt động {importPreview.deactivatedNhom}
                                        </Typography>
                                        <Typography variant="body2">
                                            Mục kiểm: tạo {importPreview.createdMuc}, cập nhật {importPreview.updatedMuc}, kích hoạt lại {importPreview.reactivatedMuc}, ngừng hoạt động {importPreview.deactivatedMuc}
                                        </Typography>
                                        <Typography variant="body2">
                                            Liên kết sản phẩm: tạo {importPreview.createdGanNhom}, cập nhật {importPreview.updatedGanNhom}, kích hoạt lại {importPreview.reactivatedGanNhom}, ngừng hoạt động {importPreview.deactivatedGanNhom}
                                        </Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            Nhóm dùng chung sẽ tách riêng: {importPreview.clonedNhom}
                                        </Typography>
                                    </Stack>
                                </Alert>

                                <Box>
                                    <Typography fontWeight={700} sx={{ mb: 1 }}>
                                        Chi tiết theo sản phẩm
                                    </Typography>
                                    {(importPreview.products || []).map((product) => (
                                        <Accordion key={product.Id} disableGutters variant="outlined">
                                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography fontWeight={650}>{product.MaSanPham}</Typography>
                                                    <Typography variant="body2" color="text.secondary" noWrap>
                                                        {product.TenSanPham || "Chưa có tên sản phẩm"} · hiện có {product.currentGroups?.length || 0} nhóm · sau đồng bộ {product.resultGroups?.length || 0} nhóm
                                                    </Typography>
                                                </Box>
                                            </AccordionSummary>
                                            <AccordionDetails sx={{ bgcolor: "grey.50" }}>
                                                <Box
                                                    sx={{
                                                        display: "grid",
                                                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                                                        gap: 2
                                                    }}
                                                >
                                                    <Box>
                                                        <Typography fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
                                                            Đang sử dụng hiện tại
                                                        </Typography>
                                                        <GroupPreviewList groups={product.currentGroups} current />
                                                    </Box>
                                                    <Box>
                                                        <Typography fontWeight={700} color="primary.main" sx={{ mb: 1 }}>
                                                            Sau khi đồng bộ theo Excel
                                                        </Typography>
                                                        <GroupPreviewList groups={product.resultGroups} />
                                                    </Box>
                                                </Box>
                                            </AccordionDetails>
                                        </Accordion>
                                    ))}
                                </Box>
                            </Stack>
                        )}

                        {importResult && (
                            <Alert severity={importResult.type}>
                                <Typography fontWeight={600}>{importResult.message}</Typography>

                                {importResult.summary && (
                                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                                        <Typography variant="body2">Tổng dòng: {importResult.summary.totalRows}</Typography>
                                        <Typography variant="body2">Nhóm kiểm: tạo {importResult.summary.createdNhom}, cập nhật {importResult.summary.updatedNhom}, kích hoạt lại {importResult.summary.reactivatedNhom}, ngừng hoạt động {importResult.summary.deactivatedNhom}</Typography>
                                        <Typography variant="body2">Mục kiểm: tạo {importResult.summary.createdMuc}, cập nhật {importResult.summary.updatedMuc}, kích hoạt lại {importResult.summary.reactivatedMuc}, ngừng hoạt động {importResult.summary.deactivatedMuc}</Typography>
                                        <Typography variant="body2">Gán sản phẩm: tạo {importResult.summary.createdGanNhom}, cập nhật {importResult.summary.updatedGanNhom}, kích hoạt lại {importResult.summary.reactivatedGanNhom}, ngừng hoạt động {importResult.summary.deactivatedGanNhom}</Typography>
                                        <Typography variant="body2">Nhóm dùng chung đã tách: {importResult.summary.clonedNhom}</Typography>
                                    </Stack>
                                )}
                            </Alert>
                        )}

                        {importResult?.errors?.length > 0 && (
                            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ width: 100, fontWeight: 600 }}>Dòng</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Lỗi</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {importResult.errors.map((item, index) => (
                                            <TableRow key={`${item.line}-${index}`}>
                                                <TableCell>{item.line}</TableCell>
                                                <TableCell>{item.message}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, bgcolor: "#f8fafc" }}>
                    <Button
                        onClick={() => setImportOpen(false)}
                        color="inherit"
                        disabled={importing || previewing}
                    >
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        onClick={importPreview ? requestImportConfirmation : handlePreviewImportExcel}
                        disabled={!importFile || importing || previewing}
                    >
                        {previewing
                            ? "Đang phân tích..."
                            : importing
                                ? "Đang đồng bộ..."
                                : importPreview
                                    ? "Đồng bộ theo file"
                                    : "Xem trước"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
