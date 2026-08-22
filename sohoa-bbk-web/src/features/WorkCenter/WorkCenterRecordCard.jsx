import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import { MUC_DO_LABELS, PHAT_HIEN_TU_LABELS } from "../BienBan/components/listRecordSummary.constants";
import {
    formatWaitingTime, getReadableStatus, getWaitingPriority, isRepeated,
    PROGRESS_META, RECORD_TYPE_LABELS
} from "./workCenter.utils";

export default function WorkCenterRecordCard({ item, now, selected = false, compact = false, onOpen, onOpenDetail }) {
    const priority = getWaitingPriority(item, now);
    const defects = (item.MainDefects || []).slice(0, 2);
    const recordLabel = item.recordSource === "KPH_STANDALONE" ? "Phiếu KPH độc lập" : RECORD_TYPE_LABELS[item.recordType];
    const sourceLabel = PHAT_HIEN_TU_LABELS[item.PhatHienTu];
    const repeatLabel = MUC_DO_LABELS[item.MucDo];
    const departmentItems = (item.DepartmentProgress || []).slice(0, 4).map((department) => {
        const meta = PROGRESS_META[department.status] || PROGRESS_META.WAITING_STEP;
        return {
            key: `${department.departmentId || department.code}-${department.status}`,
            label: department.code || department.name,
            status: department.status,
            suffix: department.status === "DONE" ? "✓" : meta.shortLabel || "chờ"
        };
    });
    const departmentText = departmentItems.map((department) => `${department.label} ${department.suffix}`).join(" · ");
    const inspectionQuantity = item.HasMixedInspectionQuantity ? null : item.InspectionQuantity;

    const desktopColumns = compact
        ? "96px minmax(270px,1.1fr) minmax(230px,.9fr)"
        : "100px minmax(310px,1.2fr) minmax(285px,.9fr) 132px";

    return (
        <Paper
            variant="outlined"
            onClick={() => onOpen(item)}
            sx={{
                borderRadius: 1.25, overflow: "hidden", cursor: "pointer",
                borderColor: selected ? "primary.main" : "#e5e9f0",
                bgcolor: selected ? "rgba(99,102,241,.035)" : "background.paper",
                boxShadow: "none",
                transition: "box-shadow .2s,border-color .2s,background-color .2s",
                "&:hover": { boxShadow: "0 3px 12px rgba(15,23,42,.055)", borderColor: selected ? "primary.main" : "#cfd6e2" }
            }}
        >
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "96px minmax(0,1fr)", lg: desktopColumns }, alignItems: "stretch" }}>
                <Stack
                    spacing={0.6}
                    sx={{
                        p: 1.15, minHeight: 132, bgcolor: priority.key === "urgent" ? "#fff8f8" : priority.key === "priority" ? "#fffbeb" : "#f8fafc",
                        borderRight: { sm: "1px solid #eef1f6" }, borderBottom: { xs: "1px solid #eef1f6", sm: 0 },
                        gridRow: { sm: "1 / span 3", lg: "1" }
                    }}
                >
                    <Chip size="small" label={priority.label} color={priority.color} sx={{
                        alignSelf: "flex-start", maxWidth: "100%", fontWeight: 850, height: 23,
                        fontSize: priority.key === "normal" ? ".58rem" : ".66rem",
                        "& .MuiChip-label": { px: priority.key === "normal" ? 0.65 : 1, whiteSpace: "nowrap" }
                    }} />
                    <Typography variant="caption" color="text.secondary" lineHeight={1.3}>{recordLabel}</Typography>
                    {priority.key !== "done" && (
                        <Box sx={{ mt: "auto !important" }}>
                            <Typography variant="caption" color="text.secondary">Đã chờ</Typography>
                            <Typography variant="body2" fontWeight={850} color={priority.key === "urgent" ? "error.main" : priority.key === "priority" ? "warning.dark" : "text.primary"}>
                                {formatWaitingTime(priority.elapsedMs)}
                            </Typography>
                        </Box>
                    )}
                    <Stack direction="row" spacing={0.8} color="text.secondary" sx={{ mt: priority.key === "done" ? "auto !important" : 0 }}>
                        <Stack direction="row" spacing={0.25} alignItems="center"><ImageOutlinedIcon sx={{ fontSize: 15 }} /><Typography variant="caption">{item.ImageCount || 0}</Typography></Stack>
                        <Stack direction="row" spacing={0.25} alignItems="center"><AttachFileIcon sx={{ fontSize: 15 }} /><Typography variant="caption">{item.AttachmentCount || 0}</Typography></Stack>
                    </Stack>
                </Stack>

                <Stack spacing={0.45} sx={{ px: 1.5, py: 1.2, minWidth: 0 }}>
                    <Stack direction="row" spacing={0.65} alignItems="center" useFlexGap flexWrap="wrap">
                        <Typography fontWeight={900} color="primary.main">{item.SoBienBan || item.SoPhieu || `BB#${item.bienBanId}`}</Typography>
                        <Chip size="small" variant="outlined" label={getReadableStatus(item.TrangThai)} sx={{ height: 23, maxWidth: 210, "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap title={[item.MaSanPham, item.TenSanPham, item.DonHang, item.Lot].filter(Boolean).join(" · ")}>
                        {[item.MaSanPham, item.TenSanPham, item.DonHang ? `ĐH ${item.DonHang}` : null, item.Lot ? `Lot ${item.Lot}` : null].filter(Boolean).join(" · ") || "Chưa có thông tin sản phẩm"}
                    </Typography>
                    <Typography variant="body2" fontWeight={850} sx={{ lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {item.MoTaChung || "Chưa nhập mô tả không phù hợp"}
                    </Typography>
                    {defects.map((defect, index) => (
                        <Typography key={`${defect.MaLoi}-${index}`} variant="caption" color="text.secondary" noWrap>
                            {[defect.MaLoi, defect.TenLoi].filter(Boolean).join(" – ")}
                        </Typography>
                    ))}
                    <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap" sx={{ pt: 0.25 }}>
                        {item.HasCritical && <Chip size="small" color="error" variant="outlined" label="Critical" sx={{ height: 21, fontSize: ".67rem" }} />}
                        {isRepeated(item) && <Chip size="small" color="warning" variant="outlined" label={repeatLabel || "Lỗi lặp lại"} sx={{ height: 21, fontSize: ".67rem" }} />}
                        {sourceLabel && <Chip size="small" color="info" variant="outlined" label={sourceLabel} sx={{ height: 21, fontSize: ".67rem" }} />}
                    </Stack>
                </Stack>

                <Stack spacing={0.75} sx={{ px: 1.25, py: 1.1, minWidth: 0, borderTop: { xs: "1px solid #eef1f6", sm: "1px solid #eef1f6", lg: 0 } }}>
                    <Typography component="div" variant="caption" color="text.secondary" noWrap title={departmentText || "Chưa phân công bộ phận"}>
                        <Box component="span" sx={{ fontWeight: 800 }}>Ý kiến bộ phận:</Box>{" "}
                        {departmentItems.length ? departmentItems.map((department, index) => {
                            const color = department.status === "DONE"
                                ? "success.main"
                                : department.status === "WAITING_INPUT" || department.status === "WAITING_LEAD"
                                    ? "warning.dark"
                                    : "text.secondary";
                            return (
                                <Box component="span" key={`${department.key}-${index}`}>
                                    {index > 0 && <Box component="span" sx={{ color: "text.disabled", mx: 0.45 }}>·</Box>}
                                    <Box component="span" sx={{ color, fontWeight: department.status === "DONE" ? 750 : 600 }}>
                                        {department.label} {department.suffix}
                                    </Box>
                                </Box>
                            );
                        }) : "Chưa phân công"}
                    </Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 0.65 }}>
                        <Metric label="SL kiểm" value={inspectionQuantity == null ? "—" : Number(inspectionQuantity).toLocaleString("vi-VN")} />
                        <Metric label="SL lỗi" value={Number(item.TotalDefectQuantity || 0).toLocaleString("vi-VN")} />
                        <Metric label="Tỷ lệ" value={item.DefectRate == null || item.HasMixedInspectionQuantity ? "—" : `${Number(item.DefectRate).toFixed(2)}%`} accent />
                    </Box>
                    <Typography variant="caption" color="text.secondary" noWrap title={item.ProposalSummary || "Chưa có phương án"}>
                        <strong>Phương án:</strong> {item.ProposalSummary || "Chưa có phương án"}
                    </Typography>
                    {compact && (
                        <Stack direction="row" spacing={0.6} justifyContent="flex-end">
                            <Button size="small" variant="contained" startIcon={<ChatOutlinedIcon />} onClick={(event) => { event.stopPropagation(); onOpen(item); }}>
                                {item.recordType === "KPH_V01" ? "Ý kiến nhanh" : "Xem nhanh"}
                            </Button>
                            <Button size="small" variant="outlined" onClick={(event) => { event.stopPropagation(); onOpenDetail(item); }}>Chi tiết</Button>
                        </Stack>
                    )}
                </Stack>

                <Stack spacing={0.7} justifyContent="center" sx={{ display: compact ? "none" : "flex", p: 1.1, borderTop: { xs: "1px solid #eef1f6", sm: "1px solid #eef1f6", lg: 0 } }}>
                    <Button size="small" variant="contained" startIcon={<ChatOutlinedIcon />} onClick={(event) => { event.stopPropagation(); onOpen(item); }} sx={{ whiteSpace: "nowrap" }}>
                        {item.recordType === "KPH_V01" ? "Ý kiến nhanh" : "Xem nhanh"}
                    </Button>
                    <Button size="small" variant="outlined" startIcon={<VisibilityOutlinedIcon />} onClick={(event) => { event.stopPropagation(); onOpenDetail(item); }} sx={{ whiteSpace: "nowrap" }}>Xem chi tiết</Button>
                </Stack>
            </Box>
        </Paper>
    );
}

function Metric({ label, value, accent = false }) {
    return (
        <Box sx={{ py: 0.5, px: 0.4, textAlign: "center", border: "1px solid #e8ecf2", borderRadius: 0.8, bgcolor: "rgba(255,255,255,.76)", minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" display="block" fontSize=".64rem">{label}</Typography>
            <Typography variant="body2" fontWeight={900} color={accent && value !== "—" ? "primary.main" : "text.primary"} noWrap>{value}</Typography>
        </Box>
    );
}
