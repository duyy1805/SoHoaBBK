import { useState } from "react";
import {
    Box, Button, Chip, Container, Divider, IconButton, ListItemIcon,
    Menu, MenuItem, Paper, Stack, Tooltip, Typography
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PrintIcon from "@mui/icons-material/Print";

export default function BienBanDetailToolbar({
    recordNumber,
    statusMeta,
    backLabel,
    onBack,
    primaryAction,
    onPrint,
    onOpenInspection,
    onDelete,
    deleteLabel,
    saveState
}) {
    const [anchorEl, setAnchorEl] = useState(null);
    const closeMenu = () => setAnchorEl(null);
    const runMenuAction = (action) => {
        closeMenu();
        action?.();
    };

    return (
        <Paper
            elevation={1}
            sx={{
                position: "sticky", top: 0, zIndex: 30,
                borderRadius: 0, borderBottom: "1px solid", borderColor: "divider"
            }}
        >
            <Container maxWidth={false} sx={{ px: { xs: 1, md: 3 }, py: 0.75 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Stack direction="row" alignItems="center" spacing={1} minWidth={0}>
                        <Tooltip title={backLabel}>
                            <IconButton size="small" onClick={onBack} aria-label={backLabel}>
                                <ArrowBackIcon />
                            </IconButton>
                        </Tooltip>
                        <Box minWidth={0}>
                            <Typography
                                variant="subtitle1"
                                fontWeight={800}
                                noWrap
                                sx={{ lineHeight: 1.25, maxWidth: { xs: 145, sm: 300 } }}
                            >
                                {recordNumber || "Hồ sơ KPH"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: { xs: "none", sm: "block" } }}>
                                {backLabel}
                            </Typography>
                        </Box>
                        <Chip size="small" color={statusMeta.color} label={statusMeta.label} sx={{ flexShrink: 0 }} />
                        {saveState?.label && (
                            <Typography
                                variant="caption"
                                color={saveState.color || "text.secondary"}
                                sx={{ display: { xs: "none", md: "block" }, whiteSpace: "nowrap" }}
                            >
                                {saveState.label}
                            </Typography>
                        )}
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={0.75}>
                        {primaryAction?.label && primaryAction?.onClick && (
                            <Button
                                size="small"
                                variant="contained"
                                color={primaryAction.color || "primary"}
                                onClick={primaryAction.onClick}
                                sx={{ whiteSpace: "nowrap", display: { xs: "none", sm: "inline-flex" } }}
                            >
                                {primaryAction.label}
                            </Button>
                        )}
                        {onDelete && (
                            <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteOutlineIcon />}
                                onClick={onDelete}
                                sx={{ whiteSpace: "nowrap", display: { xs: "none", md: "inline-flex" } }}
                            >
                                {deleteLabel || "Xóa hồ sơ"}
                            </Button>
                        )}
                        {onOpenInspection && (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<AssignmentTurnedInIcon />}
                                onClick={onOpenInspection}
                                sx={{ whiteSpace: "nowrap", display: { xs: "none", md: "inline-flex" } }}
                            >
                                Xem phiếu kiểm
                            </Button>
                        )}
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PrintIcon />}
                            onClick={onPrint}
                            sx={{ whiteSpace: "nowrap", display: { xs: "none", md: "inline-flex" } }}
                        >
                            In PDF
                        </Button>
                        <Tooltip title="Thao tác khác">
                            <IconButton
                                size="small"
                                aria-label="Thao tác khác"
                                aria-controls={anchorEl ? "bien-ban-actions-menu" : undefined}
                                aria-haspopup="true"
                                onClick={(event) => setAnchorEl(event.currentTarget)}
                                sx={{ display: { xs: "inline-flex", md: "none" } }}
                            >
                                <MoreVertIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Stack>
                {primaryAction?.label && primaryAction?.onClick && (
                    <Button
                        fullWidth size="small" variant="contained"
                        color={primaryAction.color || "primary"}
                        onClick={primaryAction.onClick}
                        sx={{ mt: 0.75, display: { xs: "inline-flex", sm: "none" } }}
                    >
                        {primaryAction.label}
                    </Button>
                )}
            </Container>

            <Menu id="bien-ban-actions-menu" anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
                {onDelete && (
                    <MenuItem onClick={() => runMenuAction(onDelete)} sx={{ color: "error.main" }}>
                        <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
                        {deleteLabel || "Xóa hồ sơ"}
                    </MenuItem>
                )}
                {onDelete && <Divider />}
                {onOpenInspection && (
                    <MenuItem onClick={() => runMenuAction(onOpenInspection)}>
                        <ListItemIcon><AssignmentTurnedInIcon fontSize="small" /></ListItemIcon>
                        Xem phiếu kiểm
                    </MenuItem>
                )}
                <MenuItem onClick={() => runMenuAction(onPrint)}>
                    <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon>
                    In PDF
                </MenuItem>
            </Menu>
        </Paper>
    );
}
