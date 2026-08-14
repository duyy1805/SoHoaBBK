import {
    Box, IconButton, Stack, Tooltip, Typography
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

const STEP_HELP = [
    "Người lập hoàn thiện thông tin sự không phù hợp và danh sách lỗi.",
    "Người có quyền quản lý chọn và chốt các bộ phận cần phối hợp hoặc cho ý kiến.",
    "Các bộ phận ghi nhận đề xuất, chi phí và hành động xử lý nếu có.",
    "Nhân viên bộ phận nhập ý kiến; Trưởng bộ phận kiểm tra và xác nhận.",
    "Các xác nhận bắt buộc được hoàn thành trước khi chuyển sang theo dõi.",
    "Người có quyền theo dõi đánh giá hiệu lực và hoàn tất hồ sơ."
];

export default function BienBanWorkflowGuide({ workflow, sectionItems = [], onNavigate }) {
    const { activeStep, returnedStep, steps } = workflow;

    return (
        <Stack spacing={0.75} sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ letterSpacing: "0.04em" }}>
                TIẾN ĐỘ XỬ LÝ
            </Typography>
            <Box
                sx={{
                    display: "grid",
                    gridAutoFlow: { xs: "column", lg: "row" },
                    gridAutoColumns: { xs: "minmax(190px, 72vw)", sm: "minmax(180px, 38vw)", lg: "auto" },
                    gridTemplateColumns: { lg: "repeat(6, minmax(0, 1fr))" },
                    gap: 0.75,
                    overflowX: { xs: "auto", lg: "visible" },
                    pb: { xs: 0.75, lg: 0 },
                    scrollbarWidth: "thin"
                }}
            >
                {steps.map((step, index) => {
                    const completed = index < activeStep;
                    const returned = index === returnedStep;
                    const current = !returned && index === activeStep && activeStep < steps.length;
                    const targetId = sectionItems[index]?.id;
                    return (
                        <Box
                            key={step}
                            component={targetId ? "button" : "div"}
                            type={targetId ? "button" : undefined}
                            onClick={targetId ? () => onNavigate?.(targetId) : undefined}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                                minHeight: 42,
                                px: 0.875,
                                py: 0.375,
                                borderRadius: 1.5,
                                border: "1px solid",
                                borderColor: returned ? "error.main" : completed ? "success.light" : current ? "primary.main" : "divider",
                                bgcolor: returned ? "#fff5f5" : completed ? "#f0fdf4" : current ? "#eff6ff" : "background.paper",
                                color: "text.primary",
                                textAlign: "left",
                                font: "inherit",
                                cursor: targetId ? "pointer" : "default",
                                "&:hover": targetId ? {
                                    borderColor: returned ? "error.dark" : current ? "primary.dark" : "primary.light",
                                    bgcolor: returned ? "#fee2e2" : current ? "#e0edff" : "#f8fafc"
                                } : undefined
                            }}
                        >
                            {returned ? (
                                <ErrorOutlineIcon color="error" fontSize="small" />
                            ) : completed ? (
                                <CheckCircleIcon color="success" fontSize="small" />
                            ) : current ? (
                                <RadioButtonCheckedIcon color="primary" fontSize="small" />
                            ) : (
                                <LockOutlinedIcon color="disabled" fontSize="small" />
                            )}
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="caption" color={returned ? "error.main" : "text.secondary"} sx={{ lineHeight: 1 }}>
                                    Bước {index + 1}{returned ? " · Đã trả lại" : ""}
                                </Typography>
                                <Typography variant="body2" noWrap sx={{ fontWeight: returned || current || completed ? 700 : 500, lineHeight: 1.15 }}>
                                    {step}
                                </Typography>
                            </Box>
                            <Tooltip title={returned ? "Tạm dừng — chờ bộ phận lập chỉnh sửa và gửi lại." : STEP_HELP[index]} arrow>
                                <IconButton
                                    component="span"
                                    size="small"
                                    aria-label={`Giải thích bước ${index + 1}`}
                                    onClick={(event) => event.stopPropagation()}
                                    sx={{ p: 0.25, flexShrink: 0 }}
                                >
                                    <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    );
                })}
            </Box>
        </Stack>
    );
}
