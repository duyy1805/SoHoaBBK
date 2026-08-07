import { Box, Tooltip, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export default function WorkFilterTabLabel({ label, count, description }) {
    return (
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
            <Typography component="span" variant="body2" fontWeight={600}>
                {label} ({count})
            </Typography>
            <Tooltip title={description} arrow placement="top">
                <Box
                    component="span"
                    tabIndex={0}
                    aria-label={`Giải thích tab ${label}`}
                    sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        color: "text.secondary",
                        borderRadius: "50%",
                        outline: "none",
                        "&:hover, &:focus-visible": { color: "primary.main" }
                    }}
                >
                    <InfoOutlinedIcon sx={{ fontSize: 17 }} />
                </Box>
            </Tooltip>
        </Box>
    );
}
