import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, IconButton, MenuItem, Paper, Stack, Tab,
    Tabs, TextField, Tooltip, Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ApprovalIcon from "@mui/icons-material/Approval";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import ImageIcon from "@mui/icons-material/Image";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
    approveDefectRequest, batchApproveDefectRequests, cancelDefectRequest,
    changeDefectStatus, createDefectRequest, downloadDefectTemplate,
    getAssetUrl, getDefectManagement, importDefectExcel, rejectDefectRequest,
    updateDefectRequest, uploadDefectImages
} from "../../../api/lookup.api";
import { getCurrentUser } from "../../../utils/auth";

const MAX_DEFECT_IMAGES = 10;
const scopes = ["Kiểm đầu vào", "Kiểm công đoạn", "Kiểm hoàn chỉnh"];
const emptyForm = {
    TenLoi: "", MaLoi: "", DefectType: "MAJOR", MoTa: "", GhiChu: "",
    PhuongAnXuLy: "", MaNhomLoi: "", LoaiLoiSXBT: "", TenSanPham: "",
    ChungLoai: "", PhamViApDung: "", ThiTruong: "", ImageUrl: "",
    ImageUrls: [], ThuTu: ""
};
const compareFields = [
    ["MaLoi", "Mã lỗi"], ["TenLoi", "Tên lỗi"], ["DefectType", "Phân loại"],
    ["MoTa", "Mô tả"], ["GhiChu", "Ghi chú"], ["PhuongAnXuLy", "Phương án xử lý"],
    ["MaNhomLoi", "Mã nhóm"], ["LoaiLoiSXBT", "Loại B/C"], ["TenSanPham", "Sản phẩm"],
    ["ChungLoai", "Chủng loại"], ["PhamViApDung", "Phạm vi"], ["ThiTruong", "Thị trường"]
];

const parseImages = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch { return [value].filter(Boolean); }
};
const getImages = (row = {}) => [...new Set([...parseImages(row.ImageUrls), ...parseImages(row.ImageUrl)])];
const splitScopes = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
const formatDate = (value) => value ? new Date(value).toLocaleString("vi-VN") : "---";
const normalizeType = (loai, type) => loai === "C" ? "CRITICAL" : (loai === "B" && type === "CRITICAL" ? "MAJOR" : type || "MAJOR");
const statusMeta = {
    PENDING: { label: "Chờ duyệt", color: "warning" },
    APPROVED: { label: "Đã duyệt", color: "success" },
    REJECTED: { label: "Từ chối", color: "error" },
    CANCELLED: { label: "Đã rút", color: "default" }
};

function ImageStrip({ data, onOpen }) {
    const images = getImages(data);
    if (!images.length) return <Typography variant="caption" color="text.disabled">Không có ảnh</Typography>;
    return (
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            {images.map((url, index) => (
                <Box component="button" type="button" key={`${url}-${index}`} onClick={() => onOpen(images, index)}
                    sx={{ width: 54, height: 44, p: 0, border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden", cursor: "pointer" }}>
                    <Box component="img" src={getAssetUrl(url)} alt={`Ảnh lỗi ${index + 1}`} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </Box>
            ))}
        </Stack>
    );
}

export default function DefectManager() {
    const user = getCurrentUser() || {};
    const userId = Number(user.id || user.userId || 0);
    const [management, setManagement] = useState({ capabilities: {}, defects: [], requests: [] });
    const [tab, setTab] = useState("mine");
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editTarget, setEditTarget] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const previewUrlsRef = useRef([]);
    const [reviewRequest, setReviewRequest] = useState(null);
    const [rejectNote, setRejectNote] = useState("");
    const [selected, setSelected] = useState([]);
    const [importOpen, setImportOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [gallery, setGallery] = useState({ images: [], index: 0 });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getDefectManagement();
            setManagement(res.data || { capabilities: {}, defects: [], requests: [] });
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Không tải được dữ liệu quản lý lỗi");
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);
    useEffect(() => { previewUrlsRef.current = previewUrls; }, [previewUrls]);
    useEffect(() => () => previewUrlsRef.current.forEach(URL.revokeObjectURL), []);

    const defectMap = useMemo(() => new Map(management.defects.map((item) => [Number(item.Id), item])), [management.defects]);
    const pending = useMemo(() => management.requests.filter((item) => item.Status === "PENDING"), [management.requests]);
    const rows = useMemo(() => {
        const search = keyword.trim().toLowerCase();
        let values;
        if (tab === "pending") values = pending;
        else {
            const ownRequests = management.requests.filter((item) =>
                (!userId || Number(item.CreatedBy) === userId) && item.Status !== "APPROVED"
            );
            values = [
                ...ownRequests,
                ...management.defects
            ];
        }
        if (!search) return values;
        return values.filter((item) => {
            const data = item.ProposedData || item;
            return [data.MaLoi, data.TenLoi, data.MoTa, item.CreatedByName, item.ReviewNote]
                .some((value) => String(value || "").toLowerCase().includes(search));
        });
    }, [keyword, management.defects, management.requests, pending, tab, userId]);

    const openImages = (images, index = 0) => setGallery({ images: images.map(getAssetUrl), index });
    const cleanupFormImages = () => {
        previewUrlsRef.current.forEach(URL.revokeObjectURL);
        setImageFiles([]); setPreviewUrls([]);
    };
    const openCreate = () => {
        cleanupFormImages(); setEditTarget(null); setForm(emptyForm); setFormOpen(true);
    };
    const openEdit = (target) => {
        cleanupFormImages();
        const data = target.ProposedData || target;
        setEditTarget(target);
        setForm({ ...emptyForm, ...data, ImageUrls: getImages(data), ImageUrl: getImages(data)[0] || "" });
        setFormOpen(true);
    };
    const closeForm = () => { cleanupFormImages(); setFormOpen(false); setEditTarget(null); };
    const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    const handleFiles = (event) => {
        const files = Array.from(event.target.files || []);
        const allowed = Math.max(0, MAX_DEFECT_IMAGES - getImages(form).length - imageFiles.length);
        const accepted = files.slice(0, allowed);
        setImageFiles((prev) => [...prev, ...accepted]);
        setPreviewUrls((prev) => [...prev, ...accepted.map(URL.createObjectURL)]);
        event.target.value = "";
    };

    const buildPayload = (images) => ({
        ...form,
        TenLoi: String(form.TenLoi || "").trim(),
        MaLoi: String(form.MaLoi || "").trim() || null,
        MaNhomLoi: String(form.MaNhomLoi || "").trim() || null,
        DefectType: normalizeType(form.LoaiLoiSXBT, form.DefectType),
        PhamViApDung: splitScopes(form.PhamViApDung).join(", ") || null,
        ImageUrls: images,
        ImageUrl: images[0] || null,
        ThuTu: form.ThuTu === "" ? null : Number(form.ThuTu)
    });

    const saveForm = async () => {
        if (!form.TenLoi || (!form.MaLoi && !form.MaNhomLoi)) {
            setError("Vui lòng nhập tên lỗi và mã nhóm lỗi"); return;
        }
        setSaving(true);
        try {
            let images = getImages(form);
            if (imageFiles.length) {
                const upload = await uploadDefectImages(imageFiles, { maLoi: form.MaLoi, tenLoi: form.TenLoi });
                images = [...images, ...(upload.data?.imageUrls || [])].slice(0, MAX_DEFECT_IMAGES);
            }
            const payload = buildPayload(images);
            if (editTarget?.ProposedData) {
                await updateDefectRequest(editTarget.Id, payload, editTarget.RowVersion);
            } else {
                await createDefectRequest(payload, editTarget?.Id || null);
            }
            setNotice(editTarget ? "Đã gửi nội dung sửa đổi chờ duyệt" : "Đã gửi đề xuất lỗi mới chờ duyệt");
            closeForm(); await loadData();
        } catch (err) { setError(err.response?.data?.message || "Không lưu được đề xuất"); }
        finally { setSaving(false); }
    };

    const cancelRequest = async (request) => {
        if (!window.confirm("Rút đề xuất này khỏi hàng chờ duyệt?")) return;
        try { await cancelDefectRequest(request.Id, request.RowVersion); await loadData(); }
        catch (err) { setError(err.response?.data?.message || "Không rút được đề xuất"); }
    };
    const approve = async (request) => {
        setSaving(true);
        try { await approveDefectRequest(request.Id, request.RowVersion); setReviewRequest(null); await loadData(); }
        catch (err) { setError(err.response?.data?.message || "Không duyệt được đề xuất"); }
        finally { setSaving(false); }
    };
    const reject = async () => {
        if (!rejectNote.trim()) return;
        setSaving(true);
        try { await rejectDefectRequest(reviewRequest.Id, rejectNote.trim(), reviewRequest.RowVersion); setReviewRequest(null); setRejectNote(""); await loadData(); }
        catch (err) { setError(err.response?.data?.message || "Không từ chối được đề xuất"); }
        finally { setSaving(false); }
    };
    const approveSelected = async () => {
        const items = pending.filter((item) => selected.includes(item.Id)).map((item) => ({ id: item.Id, rowVersion: item.RowVersion }));
        if (!items.length) return;
        setSaving(true);
        try { const res = await batchApproveDefectRequests(items); setNotice(res.data?.message || "Đã duyệt đề xuất"); setSelected([]); await loadData(); }
        catch (err) { setError(err.response?.data?.message || "Không duyệt được các đề xuất"); }
        finally { setSaving(false); }
    };
    const toggleStatus = async (defect) => {
        try { await changeDefectStatus(defect.Id, !(defect.TrangThai !== false && defect.TrangThai !== 0)); await loadData(); }
        catch (err) { setError(err.response?.data?.message || "Không đổi được trạng thái"); }
    };

    const downloadTemplate = async () => {
        try {
            const res = await downloadDefectTemplate();
            const url = URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a"); link.href = url; link.download = "mau-import-danh-muc-loi.xlsx";
            document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
        } catch { setError("Không tải được file mẫu"); }
    };
    const doImport = async () => {
        if (!importFile) return;
        setSaving(true);
        try { const res = await importDefectExcel(importFile); setImportResult(res.data); setImportFile(null); await loadData(); }
        catch (err) { setImportResult({ message: err.response?.data?.message || "Import thất bại", errors: err.response?.data?.errors || [] }); }
        finally { setSaving(false); }
    };

    const renderRow = (item) => {
        const isRequest = Boolean(item.ProposedData);
        const data = item.ProposedData || item;
        const meta = statusMeta[item.Status] || { label: data.TrangThai === false || data.TrangThai === 0 ? "Tạm ngưng" : "Đã duyệt", color: data.TrangThai === false || data.TrangThai === 0 ? "default" : "success" };
        const canEditRequest = isRequest && ["PENDING", "REJECTED"].includes(item.Status) && Number(item.CreatedBy) === userId;
        const canEditDefect = !isRequest && (Number(item.CreatedBy) === userId || management.capabilities.isAdmin);
        return (
            <Paper key={`${isRequest ? "request" : "defect"}-${item.Id}`} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
                    {tab === "pending" && <Checkbox checked={selected.includes(item.Id)} onChange={(event) => setSelected((prev) => event.target.checked ? [...prev, item.Id] : prev.filter((id) => id !== item.Id))} />}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
                            <Chip size="small" variant="outlined" label={data.MaLoi || "Mã sinh khi duyệt"} />
                            <Chip size="small" color={meta.color} label={meta.label} />
                            <Chip size="small" variant="outlined" label={data.DefectType || "MAJOR"} />
                        </Stack>
                        <Typography fontWeight={800} sx={{ mt: 0.75 }}>{data.TenLoi || "Chưa có tên lỗi"}</Typography>
                        <Typography variant="body2" color="text.secondary">{data.MoTa || "Không có mô tả"}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Người thêm: {item.CreatedByName || "Dữ liệu hệ thống"} · {formatDate(item.CreatedAt)}
                        </Typography>
                        {item.ReviewNote && <Alert severity="error" sx={{ mt: 1, py: 0 }}>Lý do từ chối: {item.ReviewNote}</Alert>}
                    </Box>
                    <ImageStrip data={data} onOpen={openImages} />
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="flex-end">
                        {isRequest && management.capabilities.canApprove && item.Status === "PENDING" && (
                            <Button size="small" startIcon={<ApprovalIcon />} onClick={() => { setReviewRequest(item); setRejectNote(""); }}>Xem duyệt</Button>
                        )}
                        {(canEditRequest || canEditDefect) && <Tooltip title="Sửa"><IconButton onClick={() => openEdit(item)}><EditIcon /></IconButton></Tooltip>}
                        {canEditRequest && <Tooltip title="Rút đề xuất"><IconButton color="error" onClick={() => cancelRequest(item)}><CancelOutlinedIcon /></IconButton></Tooltip>}
                        {!isRequest && management.capabilities.canChangeStatus && (
                            <Button size="small" color={data.TrangThai === false || data.TrangThai === 0 ? "success" : "warning"} onClick={() => toggleStatus(data)}>
                                {data.TrangThai === false || data.TrangThai === 0 ? "Kích hoạt" : "Tạm ngưng"}
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </Paper>
        );
    };

    const currentReviewData = reviewRequest?.DefectId ? defectMap.get(Number(reviewRequest.DefectId)) : null;
    const proposedReviewData = reviewRequest?.ProposedData || {};

    return (
        <Box sx={{ width: "100%", minWidth: 0 }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
                <Box><Typography variant="h5" fontWeight={800}>Danh mục lỗi dùng chung</Typography><Typography color="text.secondary">Đề xuất theo người thêm và chỉ sử dụng sau khi được duyệt.</Typography></Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button startIcon={<DownloadIcon />} onClick={downloadTemplate}>File mẫu</Button>
                    <Button startIcon={<UploadFileIcon />} onClick={() => { setImportOpen(true); setImportResult(null); }}>Import</Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Thêm lỗi mới</Button>
                </Stack>
            </Stack>
            {error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}
            {notice && <Alert severity="success" onClose={() => setNotice("")} sx={{ mb: 2 }}>{notice}</Alert>}
            <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                <Tabs value={tab} onChange={(_, value) => setTab(value)}>
                    <Tab value="mine" label="Toàn bộ danh mục" />
                    {management.capabilities.canApprove && <Tab value="pending" label={`Chờ duyệt (${pending.length})`} />}
                </Tabs>
            </Paper>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
                <TextField size="small" fullWidth placeholder="Tìm mã lỗi, tên lỗi, người thêm..." value={keyword} onChange={(event) => setKeyword(event.target.value)} />
                {tab === "pending" && <Button variant="contained" disabled={!selected.length || saving} startIcon={<CheckCircleOutlineIcon />} onClick={approveSelected}>Duyệt đã chọn ({selected.length})</Button>}
            </Stack>
            {loading ? <Box sx={{ display: "grid", placeItems: "center", py: 8 }}><CircularProgress /></Box> : (
                <Stack spacing={1}>{rows.length ? rows.map(renderRow) : <Paper variant="outlined" sx={{ p: 5, textAlign: "center" }}><Typography color="text.secondary">Không có dữ liệu phù hợp.</Typography></Paper>}</Stack>
            )}

            <Dialog open={formOpen} onClose={closeForm} maxWidth="md" fullWidth>
                <DialogTitle>{editTarget ? "Gửi đề xuất chỉnh sửa" : "Thêm đề xuất lỗi mới"}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField label="Mã lỗi" fullWidth placeholder="Tự sinh khi duyệt nếu để trống" value={form.MaLoi || ""} onChange={(e) => updateForm("MaLoi", e.target.value)} />
                            <TextField label="Mã nhóm lỗi" required fullWidth value={form.MaNhomLoi || ""} onChange={(e) => updateForm("MaNhomLoi", e.target.value)} />
                            <TextField label="STT" type="number" sx={{ width: { sm: 130 } }} value={form.ThuTu ?? ""} onChange={(e) => updateForm("ThuTu", e.target.value)} />
                        </Stack>
                        <TextField label="Tên lỗi" required multiline minRows={2} value={form.TenLoi || ""} onChange={(e) => updateForm("TenLoi", e.target.value)} />
                        <TextField label="Mô tả chi tiết" multiline minRows={2} value={form.MoTa || ""} onChange={(e) => updateForm("MoTa", e.target.value)} />
                        <TextField label="Ghi chú / Lưu ý" value={form.GhiChu || ""} onChange={(e) => updateForm("GhiChu", e.target.value)} />
                        <TextField label="Phương án xử lý" multiline minRows={2} value={form.PhuongAnXuLy || ""} onChange={(e) => updateForm("PhuongAnXuLy", e.target.value)} />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField select label="Loại B/C" fullWidth value={form.LoaiLoiSXBT || ""} onChange={(e) => { updateForm("LoaiLoiSXBT", e.target.value); updateForm("DefectType", normalizeType(e.target.value, form.DefectType)); }}><MenuItem value="">Chưa phân loại</MenuItem><MenuItem value="B">B</MenuItem><MenuItem value="C">C</MenuItem></TextField>
                            <TextField select label="Phân loại" fullWidth value={normalizeType(form.LoaiLoiSXBT, form.DefectType)} onChange={(e) => updateForm("DefectType", e.target.value)} disabled={form.LoaiLoiSXBT === "C"}><MenuItem value="CRITICAL">CRITICAL</MenuItem>{form.LoaiLoiSXBT !== "C" && <MenuItem value="MAJOR">MAJOR</MenuItem>}{form.LoaiLoiSXBT !== "C" && <MenuItem value="MINOR">MINOR</MenuItem>}</TextField>
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField label="Tên sản phẩm" fullWidth value={form.TenSanPham || ""} onChange={(e) => updateForm("TenSanPham", e.target.value)} />
                            <TextField label="Chủng loại" fullWidth value={form.ChungLoai || ""} onChange={(e) => updateForm("ChungLoai", e.target.value)} />
                            <TextField label="Thị trường" fullWidth value={form.ThiTruong || ""} onChange={(e) => updateForm("ThiTruong", e.target.value)} />
                        </Stack>
                        <TextField select SelectProps={{ multiple: true }} label="Phạm vi áp dụng" value={splitScopes(form.PhamViApDung)} onChange={(e) => updateForm("PhamViApDung", e.target.value.join(", "))}>{scopes.map((scope) => <MenuItem key={scope} value={scope}><Checkbox checked={splitScopes(form.PhamViApDung).includes(scope)} />{scope}</MenuItem>)}</TextField>
                        <Paper variant="outlined" sx={{ p: 1.5 }}>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between"><Box><Typography fontWeight={700}>Ảnh lỗi</Typography><Typography variant="caption" color="text.secondary">Tối đa {MAX_DEFECT_IMAGES} ảnh</Typography></Box><Button component="label" startIcon={<ImageIcon />}>Chọn ảnh<input hidden type="file" accept="image/*" multiple onChange={handleFiles} /></Button></Stack>
                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                                {getImages(form).map((url) => <Box key={url} sx={{ position: "relative" }}><Box component="img" src={getAssetUrl(url)} sx={{ width: 74, height: 62, objectFit: "cover", borderRadius: 1 }} /><IconButton size="small" onClick={() => setForm((prev) => { const images = getImages(prev).filter((item) => item !== url); return { ...prev, ImageUrls: images, ImageUrl: images[0] || "" }; })} sx={{ position: "absolute", right: -7, top: -7, bgcolor: "white" }}><DeleteIcon fontSize="small" /></IconButton></Box>)}
                                {previewUrls.map((url, index) => <Box key={url} sx={{ position: "relative" }}><Box component="img" src={url} sx={{ width: 74, height: 62, objectFit: "cover", borderRadius: 1 }} /><IconButton size="small" onClick={() => { URL.revokeObjectURL(url); setPreviewUrls((prev) => prev.filter((_, i) => i !== index)); setImageFiles((prev) => prev.filter((_, i) => i !== index)); }} sx={{ position: "absolute", right: -7, top: -7, bgcolor: "white" }}><DeleteIcon fontSize="small" /></IconButton></Box>)}
                            </Stack>
                        </Paper>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={closeForm}>Hủy</Button><Button variant="contained" disabled={saving} onClick={saveForm}>Gửi chờ duyệt</Button></DialogActions>
            </Dialog>

            <Dialog open={Boolean(reviewRequest)} onClose={() => setReviewRequest(null)} maxWidth="lg" fullWidth>
                <DialogTitle>Duyệt đề xuất danh mục lỗi</DialogTitle>
                <DialogContent dividers>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                        {currentReviewData && <Paper variant="outlined" sx={{ p: 2, flex: 1 }}><Typography fontWeight={800} sx={{ mb: 1 }}>Dữ liệu đang hiệu lực</Typography>{compareFields.map(([field, label]) => <Box key={field} sx={{ mb: 1 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="body2">{String(currentReviewData[field] ?? "---")}</Typography></Box>)}</Paper>}
                        <Paper variant="outlined" sx={{ p: 2, flex: 1, borderColor: "primary.light" }}><Typography fontWeight={800} sx={{ mb: 1 }}>Dữ liệu đề xuất</Typography>{compareFields.map(([field, label]) => { const changed = currentReviewData && String(currentReviewData[field] ?? "") !== String(proposedReviewData[field] ?? ""); return <Box key={field} sx={{ mb: 1, bgcolor: changed ? "warning.50" : "transparent", px: changed ? 1 : 0 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={changed ? 700 : 400}>{String(proposedReviewData[field] ?? "---")}</Typography></Box>; })}<Divider sx={{ my: 1 }} /><ImageStrip data={proposedReviewData} onOpen={openImages} /></Paper>
                    </Stack>
                    <TextField label="Lý do từ chối" fullWidth multiline minRows={2} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} sx={{ mt: 2 }} />
                </DialogContent>
                <DialogActions><Button onClick={() => setReviewRequest(null)}>Đóng</Button><Button color="error" disabled={!rejectNote.trim() || saving} onClick={reject}>Từ chối</Button><Button variant="contained" disabled={saving} onClick={() => approve(reviewRequest)}>Duyệt</Button></DialogActions>
            </Dialog>

            <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Import đề xuất danh mục lỗi</DialogTitle><DialogContent dividers><Stack spacing={2}><Alert severity="info">Mỗi dòng hợp lệ sẽ tạo một đề xuất chờ duyệt.</Alert><Button component="label" variant="outlined">Chọn file .xlsx<input hidden type="file" accept=".xlsx" onChange={(e) => setImportFile(e.target.files?.[0] || null)} /></Button>{importFile && <Typography>{importFile.name}</Typography>}{importResult && <Alert severity={importResult.errors?.length ? "warning" : "success"}>{importResult.message}<br />Tạo mới: {importResult.summary?.created || 0}; cập nhật: {importResult.summary?.updated || 0}{(importResult.errors || []).map((item) => <Typography key={`${item.line}-${item.message}`} variant="caption" display="block">Dòng {item.line}: {item.message}</Typography>)}</Alert>}</Stack></DialogContent><DialogActions><Button onClick={() => setImportOpen(false)}>Đóng</Button><Button variant="contained" disabled={!importFile || saving} onClick={doImport}>Tạo đề xuất</Button></DialogActions>
            </Dialog>

            <Dialog open={Boolean(gallery.images.length)} onClose={() => setGallery({ images: [], index: 0 })} maxWidth="md" fullWidth><DialogContent sx={{ p: 1, bgcolor: "#111827", textAlign: "center" }}><Box component="img" src={gallery.images[gallery.index]} sx={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain" }} /></DialogContent><DialogActions><Button onClick={() => setGallery((prev) => ({ ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length }))}>Ảnh trước</Button><Typography>{gallery.index + 1}/{gallery.images.length}</Typography><Button onClick={() => setGallery((prev) => ({ ...prev, index: (prev.index + 1) % prev.images.length }))}>Ảnh sau</Button></DialogActions></Dialog>
        </Box>
    );
}
