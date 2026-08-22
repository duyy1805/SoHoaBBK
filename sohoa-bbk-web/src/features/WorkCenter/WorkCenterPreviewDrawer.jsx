import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Divider, Drawer, IconButton,
    Paper, Skeleton, Stack, Typography
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import BrokenImageOutlinedIcon from "@mui/icons-material/BrokenImageOutlined";
import { useNavigate } from "react-router-dom";
import { getWorkCenterDetail } from "../../api/workCenter.api";
import { downloadBienBanAttachment, getBienBanAttachments } from "../../api/bienBan.api";
import { getAssetUrl } from "../../api/phieuKiem.api";
import WorkCenterQuickOpinion from "./WorkCenterQuickOpinion";
import {
    getReadableStatus, getWaitingPriority, PROGRESS_META, RECORD_TYPE_LABELS
} from "./workCenter.utils";
import { MUC_DO_LABELS, PHAT_HIEN_TU_LABELS } from "../BienBan/components/listRecordSummary.constants";

const isImage = (attachment) => String(attachment.mimeType || "").startsWith("image/") ||
    /\.(jpe?g|png|gif|webp)$/i.test(attachment.originalName || "");

const imageMimeType = (attachment, blob) => {
    const declared = String(attachment?.mimeType || "").toLowerCase();
    if (declared.startsWith("image/")) return declared;
    const responseType = String(blob?.type || "").toLowerCase();
    if (responseType.startsWith("image/")) return responseType;
    const extension = String(attachment?.originalName || "").split(".").pop()?.toLowerCase();
    return ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" })[extension] || "image/jpeg";
};

const createImageUrl = async (attachment, responseData) => {
    const data = responseData instanceof Blob
        ? await responseData.arrayBuffer()
        : responseData;
    return URL.createObjectURL(new Blob([data], { type: imageMimeType(attachment, responseData) }));
};

const parseImageUrls = (value) => {
    if (Array.isArray(value)) return value.filter((url) => typeof url === "string" && url.trim());
    if (typeof value !== "string" || !value.trim()) return [];
    try {
        const parsed = JSON.parse(value);
        return (Array.isArray(parsed) ? parsed : [parsed]).filter((url) => typeof url === "string" && url.trim());
    } catch {
        return [value].filter(Boolean);
    }
};

export default function WorkCenterPreviewDrawer({ record, now, docked = false, onClose, onListChanged }) {
    const navigate = useNavigate();
    const [detail, setDetail] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [imageUrls, setImageUrls] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const clearImages = useCallback(() => {
        setImageUrls((current) => {
            current.forEach((item) => URL.revokeObjectURL(item.url));
            return [];
        });
    }, []);

    const load = useCallback(async () => {
        if (!record) return;
        try {
            setLoading(true);
            setError("");
            clearImages();
            const [detailResponse, attachmentResponse] = await Promise.all([
                getWorkCenterDetail(record),
                getBienBanAttachments(record.bienBanId).catch(() => ({ data: [] }))
            ]);
            setDetail(detailResponse.data || null);
            const files = Array.isArray(attachmentResponse.data) ? attachmentResponse.data : [];
            setAttachments(files);
            const previews = await Promise.all(files.filter(isImage).slice(0, 3).map(async (attachment) => {
                try {
                    const response = await downloadBienBanAttachment(record.bienBanId, attachment.id);
                    return { id: attachment.id, name: attachment.originalName, url: await createImageUrl(attachment, response.data), error: false };
                } catch (previewError) {
                    return {
                        id: attachment.id,
                        name: attachment.originalName,
                        url: "",
                        error: true,
                        message: previewError?.response?.data?.message || "Không tải được ảnh"
                    };
                }
            }));
            setImageUrls(previews);
        } catch (loadError) {
            setError(loadError?.response?.data?.message || "Không tải được nội dung phiếu");
            setDetail(null);
        } finally {
            setLoading(false);
        }
    }, [clearImages, record]);

    useEffect(() => {
        if (record) load();
        else {
            setDetail(null);
            setAttachments([]);
            clearImages();
        }
        return clearImages;
    }, [clearImages, load, record]);

    const info = detail?.info || detail?.bienBan || detail?.data || {};
    const defects = useMemo(() => detail?.defects || detail?.loi || [], [detail]);
    const defectImages = useMemo(() => [...new Set(defects.flatMap((defect) => parseImageUrls(defect.ImageUrls || defect.ImageUrl)))]
        .map((url) => ({ url: getAssetUrl(url), name: "Ảnh lỗi" })), [defects]);
    const proposals = detail?.xuLy || detail?.xuLyRows || [];
    const opinions = detail?.specialistOpinions || [];
    const priority = record ? getWaitingPriority(record, now) : null;
    const title = record?.SoBienBan || record?.SoPhieu || `BB#${record?.bienBanId || ""}`;
    const inspectionQuantity = record?.HasMixedInspectionQuantity ? null : record?.InspectionQuantity;

    const changed = async () => {
        await load();
        await onListChanged?.();
    };

    const content = (
        <Stack sx={{ height: "100%", minHeight: 0 }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
                <Box minWidth={0}>
                    <Stack direction="row" spacing={0.65} useFlexGap flexWrap="wrap" alignItems="center">
                        <Typography variant="h6" fontWeight={900}>{title}</Typography>
                        {priority && <Chip size="small" color={priority.color} label={priority.label} sx={{ fontWeight: 850 }} />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {record?.recordSource === "KPH_STANDALONE" ? "KPH độc lập" : RECORD_TYPE_LABELS[record?.recordType]} · {getReadableStatus(record?.TrangThai)}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={0.25}>
                    <IconButton size="small" onClick={load} disabled={loading} aria-label="Tải lại"><RefreshIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => record && navigate(record.detailRoute)} aria-label="Mở toàn bộ phiếu"><OpenInNewIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={onClose} aria-label="Đóng panel"><CloseIcon fontSize="small" /></IconButton>
                </Stack>
            </Stack>

            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 2, py: 1.5 }}>
                {loading && !detail ? <Stack spacing={1}><Skeleton height={80} /><Skeleton height={120} /><Skeleton height={150} /></Stack> : error ? (
                    <Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>Thử lại</Button>}>{error}</Alert>
                ) : detail ? (
                    <Stack spacing={1.4} divider={<Divider flexItem />}>
                        <Stack spacing={0.6}>
                            <Typography variant="caption" color="text.secondary" noWrap>
                                {[record?.MaSanPham, record?.TenSanPham, record?.DonHang ? `ĐH ${record.DonHang}` : null, record?.Lot ? `Lot ${record.Lot}` : null].filter(Boolean).join(" · ") || "Chưa có thông tin sản phẩm"}
                            </Typography>
                            <Typography fontWeight={900} sx={{ lineHeight: 1.35 }}>{info.MoTaChung || record?.MoTaChung || "Chưa có mô tả không phù hợp"}</Typography>
                            <Stack direction="row" spacing={0.55} useFlexGap flexWrap="wrap">
                                {record?.HasCritical && <Chip size="small" color="error" variant="outlined" label="Critical" />}
                                {record?.MucDo && <Chip size="small" color="warning" variant="outlined" label={MUC_DO_LABELS[record.MucDo] || record.MucDo} />}
                                {record?.PhatHienTu && <Chip size="small" color="info" variant="outlined" label={PHAT_HIEN_TU_LABELS[record.PhatHienTu] || record.PhatHienTu} />}
                            </Stack>
                        </Stack>

                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 0.75 }}>
                            <PanelMetric label="SL kiểm" value={inspectionQuantity == null ? "—" : Number(inspectionQuantity).toLocaleString("vi-VN")} />
                            <PanelMetric label="SL lỗi" value={Number(record?.TotalDefectQuantity || 0).toLocaleString("vi-VN")} />
                            <PanelMetric label="Tỷ lệ lỗi" value={record?.DefectRate == null || record?.HasMixedInspectionQuantity ? "—" : `${Number(record.DefectRate).toFixed(2)}%`} accent />
                        </Box>

                        <Stack spacing={0.65}>
                            <Typography variant="caption" color="text.secondary" fontWeight={800}>LỖI GHI NHẬN ({defects.length})</Typography>
                            {defects.length ? defects.slice(0, 5).map((defect, index) => (
                                <Stack key={defect.Id || index} direction="row" justifyContent="space-between" spacing={1}>
                                    <Typography variant="body2" noWrap title={[defect.MaLoi, defect.TenLoi || defect.TenLoiTuNhap].filter(Boolean).join(" – ")}>
                                        {[defect.MaLoi, defect.TenLoi || defect.TenLoiTuNhap].filter(Boolean).join(" – ") || `Lỗi ${index + 1}`}
                                    </Typography>
                                    <Typography variant="body2" fontWeight={800}>{Number(defect.SoLuong || 0)}</Typography>
                                </Stack>
                            )) : <Typography variant="body2" color="text.secondary">Chưa có dòng lỗi</Typography>}
                        </Stack>

                        {defectImages.length > 0 && (
                            <Stack spacing={0.7}>
                                <Typography variant="caption" color="text.secondary" fontWeight={800}>ẢNH LỖI ({defectImages.length})</Typography>
                                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0.65 }}>
                                    {defectImages.slice(0, 6).map((image, index) => (
                                        <Box component="img" key={`${image.url}-${index}`} src={image.url} alt={`Ảnh lỗi ${index + 1}`}
                                            sx={{ width: "100%", aspectRatio: "1.25", objectFit: "cover", borderRadius: 0.75, border: "1px solid #e7ebf1", bgcolor: "#f8fafc" }} />
                                    ))}
                                </Box>
                            </Stack>
                        )}

                        {(imageUrls.length > 0 || attachments.length > 0) && (
                            <Stack spacing={0.7}>
                                <Typography variant="caption" color="text.secondary" fontWeight={800}>FILE ĐÍNH KÈM ({attachments.length})</Typography>
                                {imageUrls.length > 0 && <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0.65 }}>
                                    {imageUrls.map((image) => image.error ? (
                                        <Stack key={image.id} alignItems="center" justifyContent="center" spacing={0.25} title={image.message}
                                            sx={{ minWidth: 0, aspectRatio: "1.25", bgcolor: "#f8fafc", borderRadius: 0.75, border: "1px solid #e7ebf1", color: "text.secondary" }}>
                                            <BrokenImageOutlinedIcon fontSize="small" />
                                            <Typography variant="caption" noWrap sx={{ maxWidth: "90%" }}>Không xem được</Typography>
                                        </Stack>
                                    ) : <Box component="img" key={image.id} src={image.url} alt={image.name} title={image.name}
                                        sx={{ width: "100%", aspectRatio: "1.25", objectFit: "cover", borderRadius: 0.75, border: "1px solid #e7ebf1", bgcolor: "#f8fafc" }} />)}
                                </Box>}
                                {attachments.filter((item) => !isImage(item)).slice(0, 3).map((attachment) => (
                                    <Stack key={attachment.id} direction="row" spacing={0.5} alignItems="center"><AttachFileIcon fontSize="small" color="action" /><Typography variant="caption" noWrap>{attachment.originalName}</Typography></Stack>
                                ))}
                            </Stack>
                        )}

                        <Stack spacing={0.45}>
                            <Typography variant="caption" color="text.secondary" fontWeight={800}>PHƯƠNG ÁN XỬ LÝ</Typography>
                            {proposals.length ? proposals.slice(0, 3).map((proposal, index) => (
                                <Typography key={proposal.Id || index} variant="body2">{proposal.DeNghiXuLy || proposal.NoiDung || "Phương án xử lý"}{proposal.NoiDung && proposal.DeNghiXuLy ? ` — ${proposal.NoiDung}` : ""}</Typography>
                            )) : <Typography variant="body2" color="text.secondary">{record?.ProposalSummary || "Chưa có phương án"}</Typography>}
                        </Stack>

                        {record?.recordType === "KPH_V01" && opinions.length > 0 ? (
                            <WorkCenterQuickOpinion bienBanId={record.bienBanId} opinions={opinions} onChanged={changed} />
                        ) : (
                            <Stack spacing={0.65}>
                                <Typography variant="caption" color="text.secondary" fontWeight={800}>TIẾN ĐỘ BỘ PHẬN</Typography>
                                {record?.DepartmentProgress?.length ? record.DepartmentProgress.map((department, index) => {
                                    const meta = PROGRESS_META[department.status] || PROGRESS_META.WAITING_STEP;
                                    return <Stack key={`${department.departmentId}-${index}`} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                        <Typography variant="body2" noWrap>{department.code || department.name}</Typography>
                                        <Chip size="small" color={meta.color} label={meta.label} sx={{ height: 22, fontSize: ".66rem" }} />
                                    </Stack>;
                                }) : <Typography variant="body2" color="text.secondary">Chưa phân công bộ phận</Typography>}
                            </Stack>
                        )}
                    </Stack>
                ) : null}
            </Box>

            <Stack direction="row" spacing={1} sx={{ p: 1.25, borderTop: 1, borderColor: "divider", bgcolor: "background.paper" }}>
                <Button fullWidth variant="outlined" disabled={!record} onClick={() => record && navigate(record.detailRoute)}>Xem toàn bộ phiếu</Button>
                {record?.recordType !== "KPH_V01" && <Button fullWidth variant="contained" disabled={!record} onClick={() => record && navigate(record.detailRoute)}>Xử lý phiếu</Button>}
            </Stack>
        </Stack>
    );

    if (docked) {
        if (!record) return null;
        return <Paper variant="outlined" sx={{ position: "sticky", top: 72, height: "calc(100dvh - 88px)", minHeight: 560, borderRadius: 1.25, borderColor: "#e5e9f0", overflow: "hidden" }}>{content}</Paper>;
    }

    return (
        <Drawer anchor="right" open={Boolean(record)} onClose={onClose}
            slotProps={{ paper: { sx: { width: { xs: "100%", sm: 430 }, maxWidth: "100%" } } }}>
            {content}
        </Drawer>
    );
}

function PanelMetric({ label, value, accent = false }) {
    return (
        <Box sx={{ px: 0.6, py: 0.7, textAlign: "center", border: "1px solid #e7ebf1", borderRadius: 0.8 }}>
            <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
            <Typography fontWeight={900} color={accent && value !== "—" ? "primary.main" : "text.primary"}>{value}</Typography>
        </Box>
    );
}
