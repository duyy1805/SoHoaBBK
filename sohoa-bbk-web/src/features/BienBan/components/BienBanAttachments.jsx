import { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    Stack,
    Tooltip,
    Typography
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import {
    deleteBienBanAttachment,
    downloadBienBanAttachment,
    getBienBanAttachments,
    uploadBienBanAttachments
} from "../../../api/bienBan.api";

const maxFiles = 10;
const maxFileSize = 20 * 1024 * 1024;
const allowedExtensions = new Set([
    "jpg", "jpeg", "png", "gif", "webp", "pdf",
    "doc", "docx", "xls", "xlsx", "ppt", "pptx"
]);
const accept = ".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

const formatBytes = (value) => {
    const bytes = Number(value || 0);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

const extensionOf = (name) => String(name || "").split(".").pop()?.toLowerCase() || "";

const errorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

export default function BienBanAttachments({ bienBanId }) {
    const inputRef = useRef(null);
    const [attachments, setAttachments] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [downloadingId, setDownloadingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [notice, setNotice] = useState(null);

    const loadAttachments = useCallback(async () => {
        if (!bienBanId) return;
        try {
            setLoading(true);
            const response = await getBienBanAttachments(bienBanId);
            setAttachments(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            setNotice({ type: "error", message: errorMessage(error, "Không tải được file đính kèm") });
        } finally {
            setLoading(false);
        }
    }, [bienBanId]);

    useEffect(() => {
        loadAttachments();
    }, [loadAttachments]);

    const handleFilesSelected = (event) => {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        if (files.length > maxFiles) {
            setNotice({ type: "error", message: "Mỗi lần chỉ được chọn tối đa 10 file." });
            return;
        }
        const invalidType = files.find((file) => !allowedExtensions.has(extensionOf(file.name)));
        if (invalidType) {
            setNotice({ type: "error", message: `File ${invalidType.name} không thuộc định dạng được hỗ trợ.` });
            return;
        }
        const invalidSize = files.find((file) => file.size <= 0 || file.size > maxFileSize);
        if (invalidSize) {
            setNotice({ type: "error", message: `File ${invalidSize.name} phải lớn hơn 0 và không vượt quá 20 MB.` });
            return;
        }
        setSelectedFiles(files);
        setNotice(null);
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;
        try {
            setUploading(true);
            setNotice(null);
            await uploadBienBanAttachments(bienBanId, selectedFiles);
            setSelectedFiles([]);
            await loadAttachments();
            setNotice({ type: "success", message: "Đã tải file đính kèm lên biên bản." });
        } catch (error) {
            setNotice({ type: "error", message: errorMessage(error, "Không tải được file đính kèm") });
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (attachment) => {
        try {
            setDownloadingId(attachment.id);
            setNotice(null);
            const response = await downloadBienBanAttachment(bienBanId, attachment.id);
            const objectUrl = URL.createObjectURL(response.data);
            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = attachment.originalName || "file-dinh-kem";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        } catch (error) {
            setNotice({ type: "error", message: errorMessage(error, "Không tải xuống được file") });
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDelete = async (attachment) => {
        if (!window.confirm(`Xóa file “${attachment.originalName}”?`)) return;
        try {
            setDeletingId(attachment.id);
            setNotice(null);
            await deleteBienBanAttachment(bienBanId, attachment.id);
            setAttachments((current) => current.filter((item) => item.id !== attachment.id));
            setNotice({ type: "success", message: "Đã xóa file đính kèm." });
        } catch (error) {
            setNotice({ type: "error", message: errorMessage(error, "Không xóa được file đính kèm") });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 }, "&:last-child": { pb: { xs: 2, md: 2.5 } } }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
                    <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <AttachFileIcon color="primary" />
                            <Typography variant="h6" fontWeight={700}>File đính kèm</Typography>
                            <Chip size="small" label={attachments.length} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Ảnh, PDF, Word, Excel hoặc PowerPoint; tối đa 20 MB mỗi file và 10 file mỗi lần.
                        </Typography>
                    </Box>
                    <Button
                        variant="outlined"
                        startIcon={<CloudUploadOutlinedIcon />}
                        disabled={uploading}
                        onClick={() => inputRef.current?.click()}
                        sx={{ alignSelf: { xs: "stretch", sm: "center" }, whiteSpace: "nowrap" }}
                    >
                        Chọn file
                    </Button>
                    <input
                        ref={inputRef}
                        hidden
                        type="file"
                        multiple
                        accept={accept}
                        onChange={handleFilesSelected}
                    />
                </Stack>

                {selectedFiles.length > 0 && (
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "stretch", sm: "center" }}
                        spacing={1.5}
                        sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}
                    >
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={700}>
                                Đã chọn {selectedFiles.length} file
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                                {selectedFiles.map((file) => file.name).join(", ")}
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                            <Button disabled={uploading} onClick={() => setSelectedFiles([])}>Bỏ chọn</Button>
                            <Button variant="contained" disabled={uploading} onClick={handleUpload}>
                                {uploading ? "Đang tải..." : "Tải lên"}
                            </Button>
                        </Stack>
                    </Stack>
                )}

                {notice && <Alert severity={notice.type} sx={{ mt: 2 }}>{notice.message}</Alert>}
                <Divider sx={{ my: 2 }} />

                {loading ? (
                    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ py: 3 }}>
                        <CircularProgress size={22} />
                        <Typography color="text.secondary">Đang tải file đính kèm...</Typography>
                    </Stack>
                ) : attachments.length === 0 ? (
                    <Box sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>
                        <InsertDriveFileOutlinedIcon sx={{ fontSize: 36, opacity: 0.55 }} />
                        <Typography variant="body2">Chưa có file đính kèm.</Typography>
                    </Box>
                ) : (
                    <Stack divider={<Divider flexItem />}>
                        {attachments.map((attachment) => (
                            <Stack
                                key={attachment.id}
                                direction={{ xs: "column", sm: "row" }}
                                justifyContent="space-between"
                                alignItems={{ xs: "stretch", sm: "center" }}
                                spacing={1.5}
                                sx={{ py: 1.25 }}
                            >
                                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                                    <InsertDriveFileOutlinedIcon color="action" />
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={700} sx={{ overflowWrap: "anywhere" }}>
                                            {attachment.originalName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {formatBytes(attachment.sizeBytes)} · {attachment.uploadedByName} · {attachment.createdAt ? new Date(attachment.createdAt).toLocaleString("vi-VN") : "---"}
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                    <Tooltip title="Tải xuống">
                                        <span>
                                            <IconButton
                                                color="primary"
                                                disabled={downloadingId === attachment.id}
                                                onClick={() => handleDownload(attachment)}
                                            >
                                                {downloadingId === attachment.id ? <CircularProgress size={20} /> : <DownloadOutlinedIcon />}
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    {attachment.canDelete && (
                                        <Tooltip title="Xóa file">
                                            <span>
                                                <IconButton
                                                    color="error"
                                                    disabled={deletingId === attachment.id}
                                                    onClick={() => handleDelete(attachment)}
                                                >
                                                    {deletingId === attachment.id ? <CircularProgress size={20} /> : <DeleteOutlineIcon />}
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    )}
                                </Stack>
                            </Stack>
                        ))}
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
}
