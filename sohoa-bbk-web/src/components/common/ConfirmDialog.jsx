import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    Box,
    Typography,
    alpha
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';

const iconMap = {
    warning: { icon: WarningAmberIcon, color: '#f59e0b', bgcolor: 'rgba(245, 158, 11, 0.1)' },
    success: { icon: CheckCircleIcon, color: '#22c55e', bgcolor: 'rgba(34, 197, 94, 0.1)' },
    error: { icon: ErrorIcon, color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' },
    info: { icon: InfoIcon, color: '#6366f1', bgcolor: 'rgba(99, 102, 241, 0.1)' }
};

export default function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title = 'Xác nhận',
    message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    type = 'warning',
    loading = false
}) {
    const { icon: Icon, color, bgcolor } = iconMap[type] || iconMap.warning;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    p: 1
                }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: bgcolor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Icon sx={{ color: color, fontSize: 28 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={600}>
                        {title}
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent>
                <DialogContentText sx={{ color: 'text.secondary', fontSize: '0.95rem' }}>
                    {message}
                </DialogContentText>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    sx={{
                        borderRadius: 2,
                        px: 3,
                        color: 'text.secondary',
                        borderColor: 'divider',
                        '&:hover': {
                            borderColor: 'text.secondary',
                            bgcolor: 'grey.50'
                        }
                    }}
                >
                    {cancelText}
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    disabled={loading}
                    sx={{
                        borderRadius: 2,
                        px: 3,
                        bgcolor: color,
                        '&:hover': {
                            bgcolor: alpha(color, 0.9)
                        }
                    }}
                >
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
