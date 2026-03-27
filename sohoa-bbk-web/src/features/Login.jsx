import { useState, useEffect } from 'react';
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
    Avatar,
    Checkbox,
    FormControlLabel,
    Divider,
    Fade,
    Grow
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    PersonOutline,
    LockOutlined,
    Login as LoginIcon,
    FactoryOutlined
} from '@mui/icons-material';
import { login } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Load saved credentials on mount
    useEffect(() => {
        const savedUsername = localStorage.getItem('rememberedUsername');
        const savedPassword = localStorage.getItem('rememberedPassword');
        if (savedUsername) {
            setUsername(savedUsername);
            setRememberMe(true);
        }
        if (savedPassword) {
            setPassword(savedPassword);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Save or remove credentials based on remember me
            if (rememberMe) {
                localStorage.setItem('rememberedUsername', username);
                localStorage.setItem('rememberedPassword', password);
            } else {
                localStorage.removeItem('rememberedUsername');
                localStorage.removeItem('rememberedPassword');
            }

            await login(username, password, rememberMe);
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
                position: 'relative',
                overflow: 'hidden',
                // Beautiful gradient background
                background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(131, 58, 180, 0.2) 0%, transparent 50%)',
                    pointerEvents: 'none'
                }
            }}
        >
            {/* Floating decorative elements */}
            <Box
                sx={{
                    position: 'absolute',
                    width: 300,
                    height: 300,
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
                    top: '-100px',
                    right: '-100px',
                    filter: 'blur(40px)',
                    animation: 'float 6s ease-in-out infinite'
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    width: 200,
                    height: 200,
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.1))',
                    bottom: '-50px',
                    left: '-50px',
                    filter: 'blur(40px)',
                    animation: 'float 8s ease-in-out infinite reverse'
                }}
            />

            <Grow in timeout={600}>
                <Paper
                    elevation={24}
                    sx={{
                        p: { xs: 3, sm: 5 },
                        width: '100%',
                        maxWidth: 450,
                        mx: 2,
                        borderRadius: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                        overflow: 'hidden',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 4,
                            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)'
                        }
                    }}
                >
                    {/* Logo/Brand Area */}
                    <Avatar
                        sx={{
                            m: 1,
                            width: 64,
                            height: 64,
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)',
                            mb: 2
                        }}
                    >
                        <FactoryOutlined sx={{ fontSize: 32 }} />
                    </Avatar>

                    <Typography
                        component="h1"
                        variant="h4"
                        sx={{
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 0.5,
                            textAlign: 'center'
                        }}
                    >
                        Số hoá biên bản kiểm
                    </Typography>

                    <Typography
                        variant="body2"
                        sx={{
                            color: 'text.secondary',
                            mb: 3,
                            textAlign: 'center'
                        }}
                    >
                        Hệ thống quản lý kiểm tra chất lượng
                    </Typography>

                    <Divider sx={{ width: '100%', mb: 3 }} />

                    <Fade in={!!error}>
                        <Alert
                            severity="error"
                            sx={{
                                width: '100%',
                                mb: 2,
                                borderRadius: 2,
                                display: error ? 'flex' : 'none',
                                animation: 'shake 0.5s ease-in-out'
                            }}
                        >
                            {error}
                        </Alert>
                    </Fade>

                    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                        <TextField
                            label="Tên đăng nhập"
                            fullWidth
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoFocus={!username}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PersonOutline sx={{ color: '#6366f1' }} />
                                        </InputAdornment>
                                    ),
                                }
                            }}
                            sx={{
                                mb: 2.5,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
                                    },
                                    '&.Mui-focused': {
                                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                    }
                                }
                            }}
                        />

                        <TextField
                            label="Mật khẩu"
                            type={showPassword ? 'text' : 'password'}
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockOutlined sx={{ color: '#6366f1' }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle password visibility"
                                                onClick={handleClickShowPassword}
                                                edge="end"
                                                sx={{
                                                    color: 'text.secondary',
                                                    '&:hover': { color: '#6366f1' }
                                                }}
                                            >
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }
                            }}
                            sx={{
                                mb: 1,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
                                    },
                                    '&.Mui-focused': {
                                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                    }
                                }
                            }}
                        />

                        {/* Remember Me Checkbox */}
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    sx={{
                                        color: '#94a3b8',
                                        '&.Mui-checked': {
                                            color: '#6366f1'
                                        }
                                    }}
                                />
                            }
                            label={
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    Ghi nhớ đăng nhập
                                </Typography>
                            }
                            sx={{ mb: 2, ml: 0 }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={loading}
                            startIcon={!loading && <LoginIcon />}
                            sx={{
                                py: 1.5,
                                borderRadius: 2,
                                fontSize: '1rem',
                                fontWeight: 600,
                                textTransform: 'none',
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                    boxShadow: '0 12px 28px rgba(99, 102, 241, 0.45)',
                                    transform: 'translateY(-2px)'
                                },
                                '&:active': {
                                    transform: 'translateY(0)'
                                },
                                '&:disabled': {
                                    background: 'linear-gradient(135deg, #94a3b8 0%, #cbd5e1 100%)'
                                }
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={24} sx={{ color: 'white' }} />
                            ) : (
                                'Đăng nhập'
                            )}
                        </Button>
                    </Box>

                    {/* Footer */}
                    <Typography
                        variant="caption"
                        sx={{
                            mt: 4,
                            color: 'text.disabled',
                            textAlign: 'center'
                        }}
                    >
                        © 2026 SoHoa BBK. Hệ thống KCS
                    </Typography>
                </Paper>
            </Grow>

            {/* CSS Animations */}
            <style>
                {`
                    @keyframes float {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-20px); }
                    }
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        25% { transform: translateX(-5px); }
                        75% { transform: translateX(5px); }
                    }
                `}
            </style>
        </Box>
    );
}