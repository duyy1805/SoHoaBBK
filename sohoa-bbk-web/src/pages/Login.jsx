import { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Alert,
    Paper,
    InputAdornment,
    IconButton,
    CircularProgress,
    Avatar
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    PersonOutline,
    LockOutlined,
    Login as LoginIcon
} from '@mui/icons-material';
import { login } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(username, password);
            navigate('/phieu-kiem');
        } catch (err) {
            setError(
                err.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không đúng'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleClickShowPassword = () => setShowPassword((show) => !show);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // Tạo background gradient đẹp mắt
                background: 'linear-gradient(135deg, #1976d2 0%, #64b5f6 100%)',
                padding: 2
            }}
        >
            <Paper
                elevation={6}
                sx={{
                    p: 4,
                    width: '100%',
                    maxWidth: 400,
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)' // Nền trắng hơi trong suốt
                }}
            >
                {/* Avatar Icon phía trên */}
                <Avatar sx={{ m: 1, bgcolor: 'primary.main', width: 56, height: 56 }}>
                    <LockOutlined fontSize="large" />
                </Avatar>

                <Typography component="h1" variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    Đăng nhập hệ thống
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Vui lòng nhập thông tin để tiếp tục
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                    <TextField
                        label="Tên đăng nhập"
                        fullWidth
                        margin="normal"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoFocus
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <PersonOutline color="action" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        label="Mật khẩu"
                        type={showPassword ? 'text' : 'password'}
                        fullWidth
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <LockOutlined color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="toggle password visibility"
                                        onClick={handleClickShowPassword}
                                        edge="end"
                                    >
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={loading}
                        startIcon={!loading && <LoginIcon />}
                        sx={{
                            mt: 4,
                            mb: 2,
                            py: 1.5,
                            borderRadius: 2,
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            textTransform: 'none',
                            boxShadow: '0 4px 6px 2px rgba(25, 118, 210, .3)'
                        }}
                    >
                        {loading ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : (
                            'Đăng nhập'
                        )}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}