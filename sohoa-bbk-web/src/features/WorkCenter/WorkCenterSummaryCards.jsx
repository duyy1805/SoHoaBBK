import { Box, Paper, Stack, Typography } from "@mui/material";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import AlarmOutlinedIcon from "@mui/icons-material/AlarmOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ReplayIcon from "@mui/icons-material/Replay";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import { getWorkBucket, isRepeated } from "./workCenter.utils";

const cards = [
    { key: "action", label: "Cần tôi xử lý", icon: AssignmentTurnedInOutlinedIcon, color: "#4f46e5", test: (item) => getWorkBucket(item) === "action" },
    { key: "overdue", label: "Quá hạn", icon: AlarmOutlinedIcon, color: "#dc2626", test: (item) => item.IsOverdue },
    { key: "critical", label: "Critical", icon: ErrorOutlineIcon, color: "#e11d48", test: (item) => item.HasCritical },
    { key: "repeated", label: "Lỗi lặp lại", icon: ReplayIcon, color: "#d97706", test: isRepeated },
    { key: "waiting", label: "Chờ bộ phận khác", icon: AccountTreeOutlinedIcon, color: "#0284c7", test: (item) => getWorkBucket(item) === "waiting" }
];

export default function WorkCenterSummaryCards({ items, activeKey, onSelect }) {
    return (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, minmax(0, 1fr))" }, gap: 1 }}>
            {cards.map((card) => {
                const Icon = card.icon;
                const active = activeKey === card.key;
                return (
                    <Paper
                        key={card.key}
                        variant="outlined"
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelect(active ? "" : card.key)}
                        onKeyDown={(event) => event.key === "Enter" && onSelect(active ? "" : card.key)}
                        sx={{ px: 1.35, py: 1, minHeight: 68, borderRadius: 1.25, cursor: "pointer", borderColor: active ? card.color : "#e5e9f0", bgcolor: active ? `${card.color}0A` : "background.paper", transition: "border-color .2s,transform .2s", "&:hover": { transform: "translateY(-1px)", borderColor: card.color } }}
                    >
                        <Stack direction="row" spacing={1.25} alignItems="center">
                            <Box sx={{ width: 34, height: 34, borderRadius: 1.25, bgcolor: `${card.color}14`, color: card.color, display: "grid", placeItems: "center", flexShrink: 0 }}>
                                <Icon fontSize="small" />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1 }}>{card.label}</Typography>
                                <Typography fontSize="1.12rem" fontWeight={850} lineHeight={1.15}>{items.filter(card.test).length}</Typography>
                            </Box>
                        </Stack>
                    </Paper>
                );
            })}
        </Box>
    );
}
