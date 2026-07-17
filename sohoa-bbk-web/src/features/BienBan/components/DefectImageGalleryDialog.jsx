import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export default function DefectImageGalleryDialog({ images = [], index = 0, onChangeIndex, onClose }) {
    const open = images.length > 0;
    const move = (offset) => {
        if (images.length <= 1) return;
        onChangeIndex((index + offset + images.length) % images.length);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>Ảnh lỗi</DialogTitle>
            <DialogContent dividers>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <IconButton onClick={() => move(-1)} disabled={images.length <= 1} aria-label="Ảnh trước" sx={{ border: "1px solid", borderColor: "divider", flexShrink: 0 }}>
                        <ChevronLeftIcon />
                    </IconButton>
                    <Box sx={{ flex: 1, minWidth: 0, minHeight: 320, display: "grid", placeItems: "center", bgcolor: "#f8fafc", border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
                        {images[index] && <Box component="img" src={images[index]} alt={`Ảnh lỗi ${index + 1}`} sx={{ display: "block", width: "100%", maxHeight: 520, objectFit: "contain" }} />}
                    </Box>
                    <IconButton onClick={() => move(1)} disabled={images.length <= 1} aria-label="Ảnh sau" sx={{ border: "1px solid", borderColor: "divider", flexShrink: 0 }}>
                        <ChevronRightIcon />
                    </IconButton>
                </Stack>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1.5, fontWeight: 700 }}>
                    {index + 1}/{images.length}
                </Typography>
            </DialogContent>
            <DialogActions><Button onClick={onClose}>Đóng</Button></DialogActions>
        </Dialog>
    );
}
