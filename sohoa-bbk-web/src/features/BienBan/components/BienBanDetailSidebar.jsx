import {
    Alert, Box, Button, Card, CardContent, Chip, Divider, List,
    ListItemButton, ListItemText, Stack, Typography
} from "@mui/material";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";

const taskPalette = {
    success: { border: "#86efac", bg: "#f0fdf4", color: "#15803d" },
    warning: { border: "#facc15", bg: "#fffbeb", color: "#a16207" },
    info: { border: "#93c5fd", bg: "#eff6ff", color: "#1d4ed8" }
};

export default function BienBanDetailSidebar({
    workflow,
    info,
    headerFields,
    defectsCount,
    totalDefectQty,
    departments = [],
    missingItems = [],
    sectionItems = [],
    onNavigate
}) {
    const guidance = workflow.guidance;
    const palette = taskPalette[guidance.tone] || taskPalette.info;
    const hasAction = Boolean(guidance.actionLabel && guidance.onAction);

    return (
        <Stack spacing={1.5} sx={{ position: { lg: "sticky" }, top: { lg: 72 }, alignSelf: "start" }}>
            <Card elevation={0} sx={{ border: `1px solid ${palette.border}`, bgcolor: palette.bg, borderRadius: 2 }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.75}>
                        <TaskAltIcon sx={{ color: palette.color }} fontSize="small" />
                        <Typography variant="caption" fontWeight={800} sx={{ color: palette.color, letterSpacing: "0.04em" }}>
                            {guidance.eyebrow}
                        </Typography>
                    </Stack>
                    <Typography fontWeight={800} sx={{ lineHeight: 1.3 }}>{guidance.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{guidance.description}</Typography>

                    {missingItems.length > 0 && (
                        <Alert severity="warning" icon={false} sx={{ mt: 1.25, py: 0.25, px: 1 }}>
                            <Typography variant="caption" fontWeight={800}>Còn thiếu</Typography>
                            {missingItems.map((item) => (
                                <Typography key={item} variant="caption" display="block">• {item}</Typography>
                            ))}
                        </Alert>
                    )}

                    {hasAction ? (
                        <Button fullWidth size="small" variant="contained" onClick={guidance.onAction} sx={{ mt: 1.25 }}>
                            {guidance.actionLabel}
                        </Button>
                    ) : (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.25 }}>
                            Bạn không có thao tác cần thực hiện tại thời điểm này.
                        </Typography>
                    )}
                </CardContent>
            </Card>

            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <Inventory2OutlinedIcon color="primary" fontSize="small" />
                        <Typography fontWeight={800}>Tóm tắt phiếu</Typography>
                    </Stack>
                    <Stack spacing={0.75}>
                        <SummaryLine label="Sản phẩm" value={headerFields?.TenSanPham || info?.TenSanPham || "—"} />
                        <SummaryLine label="Nguồn phát hiện" value={headerFields?.PhatHienTu || "—"} />
                        <SummaryLine label="Mức độ" value={headerFields?.MucDo || info?.MucDoKhongPhuHop || "—"} />
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap pt={0.5}>
                            <Chip size="small" variant="outlined" label={`${defectsCount} dòng lỗi`} />
                            <Chip size="small" variant="outlined" label={`SL lỗi ${totalDefectQty}`} />
                            <Chip size="small" variant="outlined" label={`${departments.length} bộ phận`} />
                        </Stack>
                    </Stack>
                    {departments.length > 0 && (
                        <>
                            <Divider sx={{ my: 1.25 }} />
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>TIẾN ĐỘ BỘ PHẬN</Typography>
                            <Stack spacing={0.75} mt={0.75}>
                                {departments.map((department, index) => {
                                    const completed = Boolean(department.HasConfirmed || department.IsConfirmed);
                                    const waitingLead = Boolean(department.HasOpinion) && !completed;
                                    return (
                                        <Stack key={department.Id || department.BoPhanId || index} direction="row" justifyContent="space-between" spacing={1}>
                                            <Typography variant="body2" noWrap>{department.TenBoPhan || department.MaBoPhan || "Bộ phận"}</Typography>
                                            <Chip
                                                size="small"
                                                color={completed ? "success" : waitingLead ? "warning" : "default"}
                                                label={completed ? "Đã xong" : waitingLead ? "Chờ TBP" : "Đang chờ"}
                                                sx={{ height: 20, fontSize: "0.68rem" }}
                                            />
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.5, pt: 1.5, pb: 0.75 }}>
                        <AssignmentOutlinedIcon color="action" fontSize="small" />
                        <Typography fontWeight={800}>Đi đến nội dung</Typography>
                    </Stack>
                    <List dense disablePadding sx={{ pb: 0.75 }}>
                        {sectionItems.map((item, index) => (
                            <ListItemButton key={item.id} onClick={() => onNavigate(item.id)} sx={{ px: 1.5, py: 0.5 }}>
                                <Chip size="small" label={index + 1} sx={{ mr: 1, width: 24, height: 24 }} />
                                <ListItemText primary={item.label} primaryTypographyProps={{ variant: "body2", fontWeight: 650 }} />
                                <ChevronRightIcon fontSize="small" color="disabled" />
                            </ListItemButton>
                        ))}
                    </List>
                </CardContent>
            </Card>
        </Stack>
    );
}

function SummaryLine({ label, value }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="body2" fontWeight={700} sx={{ overflowWrap: "anywhere" }}>{value}</Typography>
        </Box>
    );
}
