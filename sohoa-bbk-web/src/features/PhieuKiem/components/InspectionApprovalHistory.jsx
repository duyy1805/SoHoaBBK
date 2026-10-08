import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import { formatApprovalDateTime } from "./approvalHistory.utils";

const statusLabel = (status) => ({
    DONG_Y: "Đồng ý",
    DA_XAC_NHAN: "Đã xác nhận",
    DA_DUYET: "Đã duyệt",
    DA_HOAN_TAT: "Đã hoàn tất",
    BO_QUA: "Bỏ qua"
}[String(status || "").toUpperCase()] || status || "Đã ghi nhận");

export default function InspectionApprovalHistory({ history = [] }) {
    const rows = [...(Array.isArray(history) ? history : [])].sort((left, right) =>
        new Date(left?.occurredAt || 0).getTime() - new Date(right?.occurredAt || 0).getTime()
    );

    return (
        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 2.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: rows.length ? 1.5 : 0 }}>
                <AccessTimeOutlinedIcon color="primary" />
                <Box>
                    <Typography fontWeight={800}>Lịch sử duyệt/xác nhận</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Các mốc được sắp xếp theo thời gian thực hiện.
                    </Typography>
                </Box>
            </Stack>
            {!rows.length ? (
                <Typography variant="body2" color="text.secondary">Chưa có lịch sử duyệt/xác nhận.</Typography>
            ) : (
                <Stack spacing={1}>
                    {rows.map((event, index) => (
                        <Box key={event.eventKey || `${event.role}-${event.occurredAt}-${index}`}
                            sx={{ display: "grid", gridTemplateColumns: "24px minmax(0,1fr)", gap: 1 }}>
                            <CheckCircleOutlineOutlinedIcon color={event.status === "BO_QUA" ? "warning" : "success"}
                                sx={{ fontSize: 20, mt: 0.25 }} />
                            <Box sx={{ pb: index === rows.length - 1 ? 0 : 1, borderBottom: index === rows.length - 1 ? 0 : "1px solid", borderColor: "divider" }}>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={0.75}
                                    justifyContent="space-between" alignItems={{ sm: "center" }}>
                                    <Typography variant="body2" fontWeight={800}>{event.label || "Xác nhận phiếu"}</Typography>
                                    <Chip size="small" variant="outlined" color={event.status === "BO_QUA" ? "warning" : "success"}
                                        label={statusLabel(event.status)} sx={{ alignSelf: { xs: "flex-start", sm: "center" } }} />
                                </Stack>
                                <Typography variant="body2" sx={{ mt: 0.35 }}>
                                    {event.actorName || "Không rõ người thực hiện"}
                                    {event.departmentName ? ` · ${[event.departmentCode, event.departmentName].filter(Boolean).join(" - ")}` : ""}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {formatApprovalDateTime(event.occurredAt)}
                                </Typography>
                                {event.note && <Typography variant="caption" display="block" color="text.secondary">Nội dung: {event.note}</Typography>}
                            </Box>
                        </Box>
                    ))}
                </Stack>
            )}
        </Paper>
    );
}
