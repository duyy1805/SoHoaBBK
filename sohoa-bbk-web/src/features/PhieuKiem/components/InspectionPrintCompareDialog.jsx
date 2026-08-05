import { useState } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Tab,
    Tabs
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";

export default function InspectionPrintCompareDialog({
    open,
    onClose,
    title,
    newContent,
    oldContent,
    onPrintNew,
    onPrintOld
}) {
    const [selectedTab, setSelectedTab] = useState(0);

    const handleClose = () => {
        if (onClose) onClose();
    };

    const handlePrint = () => {
        if (selectedTab === 0) onPrintNew?.();
        else onPrintOld?.();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            onTransitionEnter={() => setSelectedTab(0)}
            fullWidth
            maxWidth={false}
            PaperProps={{ sx: { width: "96vw", maxWidth: "none", height: "94vh" } }}
        >
            <DialogTitle sx={{ pb: 0 }}>{title}</DialogTitle>
            <Tabs
                value={selectedTab}
                onChange={(_, value) => setSelectedTab(value)}
                sx={{ px: 3, borderBottom: 1, borderColor: "divider" }}
            >
                <Tab label="Mẫu mới" />
                <Tab label="Mẫu cũ" />
            </Tabs>
            <DialogContent dividers sx={{ bgcolor: "#e5e7eb", overflow: "auto", p: 2 }}>
                <Box
                    role="tabpanel"
                    hidden={selectedTab !== 0}
                    sx={{ width: "fit-content", minWidth: "100%" }}
                >
                    {selectedTab === 0 ? (
                        <Box sx={{ width: "fit-content", mx: "auto", boxShadow: 3 }}>{newContent}</Box>
                    ) : null}
                </Box>
                <Box
                    role="tabpanel"
                    hidden={selectedTab !== 1}
                    sx={{ width: "fit-content", minWidth: "100%" }}
                >
                    {selectedTab === 1 ? (
                        <Box sx={{ width: "fit-content", mx: "auto", boxShadow: 3 }}>{oldContent}</Box>
                    ) : null}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Đóng</Button>
                <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
                    {selectedTab === 0 ? "In mẫu mới" : "In mẫu cũ"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
