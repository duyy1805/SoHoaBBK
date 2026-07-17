import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Stack,
    Typography
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { getBienBanStatusMeta } from "./bienBanWorkflow";

export default function BienBanWorkflowGuide({ workflow, status }) {
    const statusMeta = getBienBanStatusMeta(status);
    const { activeStep, guidance, steps } = workflow;
    const palette = guidance.tone === "success"
        ? { border: "#86efac", bg: "#f0fdf4", accent: "#15803d" }
        : guidance.tone === "warning"
            ? { border: "#facc15", bg: "#fffbeb", accent: "#a16207" }
            : { border: "#93c5fd", bg: "#eff6ff", accent: "#1d4ed8" };

    return (
        <Stack spacing={2.5} sx={{ mb: 3 }}>
            <Card elevation={0} sx={{ border: `1px solid ${palette.border}`, bgcolor: palette.bg, borderRadius: 3 }}>
                <CardContent sx={{ p: { xs: 2, md: 2.5 }, "&:last-child": { pb: { xs: 2, md: 2.5 } } }}>
                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                                <Typography variant="overline" sx={{ color: palette.accent, fontWeight: 800, letterSpacing: 1 }}>
                                    {guidance.eyebrow}
                                </Typography>
                                <Chip size="small" color={statusMeta.color} label={statusMeta.label} />
                            </Stack>
                            <Typography variant="h6" sx={{ fontWeight: 750, color: "text.primary", mb: 0.5 }}>
                                {guidance.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {guidance.description}
                            </Typography>
                        </Box>
                        {guidance.actionLabel && guidance.onAction && (
                            <Button
                                variant="contained"
                                color={guidance.tone === "success" ? "success" : "primary"}
                                endIcon={<ArrowForwardIcon />}
                                onClick={guidance.onAction}
                                sx={{ alignSelf: { xs: "stretch", md: "center" }, whiteSpace: "nowrap" }}
                            >
                                {guidance.actionLabel}
                            </Button>
                        )}
                    </Stack>
                </CardContent>
            </Card>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" }, gap: 1 }}>
                {steps.map((step, index) => {
                    const completed = index < activeStep;
                    const current = index === activeStep && activeStep < steps.length;
                    return (
                        <Box
                            key={step}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                minHeight: 48,
                                px: 1.25,
                                py: 1,
                                borderRadius: 2,
                                border: "1px solid",
                                borderColor: completed ? "success.light" : current ? "primary.main" : "divider",
                                bgcolor: completed ? "#f0fdf4" : current ? "#eff6ff" : "background.paper"
                            }}
                        >
                            {completed ? (
                                <CheckCircleIcon color="success" fontSize="small" />
                            ) : current ? (
                                <RadioButtonCheckedIcon color="primary" fontSize="small" />
                            ) : (
                                <LockOutlinedIcon color="disabled" fontSize="small" />
                            )}
                            <Box>
                                <Typography variant="caption" color="text.secondary">Bước {index + 1}</Typography>
                                <Typography variant="body2" sx={{ fontWeight: current || completed ? 700 : 500, lineHeight: 1.2 }}>
                                    {step}
                                </Typography>
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Stack>
    );
}
