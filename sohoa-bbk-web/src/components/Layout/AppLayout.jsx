import { Outlet, useNavigate } from 'react-router-dom';
import {
    AppBar,
    Box,
    CssBaseline,
    IconButton,
    Toolbar,
    Typography,
    Avatar,
    Menu,
    MenuItem,
    Divider,
    ListItemIcon,
    Tooltip,
    Badge
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import { useState } from 'react';
import Sidebar from './Sidebar';
import { getCurrentUser, logout } from '../../utils/auth';

const drawerWidth = 280;

export default function AppLayout() {
    const user = getCurrentUser();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    const toggleDrawer = () => {
        setMobileOpen(!mobileOpen);
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
            <CssBaseline />

            {/* ===== APP BAR ===== */}
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    ml: { sm: `${drawerWidth}px` },
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton
                            edge="start"
                            onClick={toggleDrawer}
                            sx={{ mr: 2, display: { sm: 'none' }, color: 'text.primary' }}
                        >
                            <MenuIcon />
                        </IconButton>

                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 600,
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                display: { xs: 'none', md: 'block' }
                            }}
                        >
                            Số hoá Biên bản kiểm
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {/* Notifications */}
                        <Tooltip title="Thông báo">
                            <IconButton sx={{ color: 'text.secondary' }}>
                                <Badge badgeContent={3} color="error">
                                    <NotificationsIcon />
                                </Badge>
                            </IconButton>
                        </Tooltip>

                        {/* Settings */}
                        <Tooltip title="Cài đặt">
                            <IconButton sx={{ color: 'text.secondary' }}>
                                <SettingsIcon />
                            </IconButton>
                        </Tooltip>

                        {/* User Menu */}
                        <Tooltip title="Tài khoản">
                            <IconButton
                                onClick={(e) => setAnchorEl(e.currentTarget)}
                                sx={{ ml: 1 }}
                            >
                                <Avatar
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                        fontWeight: 600,
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    {getInitials(user?.fullName)}
                                </Avatar>
                            </IconButton>
                        </Tooltip>

                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={() => setAnchorEl(null)}
                            onClick={() => setAnchorEl(null)}
                            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                            PaperProps={{
                                elevation: 8,
                                sx: {
                                    mt: 1.5,
                                    minWidth: 200,
                                    borderRadius: 2,
                                    overflow: 'visible',
                                    '&::before': {
                                        content: '""',
                                        display: 'block',
                                        position: 'absolute',
                                        top: 0,
                                        right: 14,
                                        width: 10,
                                        height: 10,
                                        bgcolor: 'background.paper',
                                        transform: 'translateY(-50%) rotate(45deg)',
                                        zIndex: 0
                                    }
                                }
                            }}
                        >
                            <Box sx={{ px: 2, py: 1.5 }}>
                                <Typography variant="subtitle1" fontWeight={600}>
                                    {user?.fullName || 'User'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {user?.username}
                                </Typography>
                            </Box>
                            <Divider />
                            <MenuItem sx={{ py: 1.5 }}>
                                <ListItemIcon>
                                    <PersonIcon fontSize="small" />
                                </ListItemIcon>
                                Hồ sơ cá nhân
                            </MenuItem>
                            <MenuItem sx={{ py: 1.5 }}>
                                <ListItemIcon>
                                    <SettingsIcon fontSize="small" />
                                </ListItemIcon>
                                Cài đặt
                            </MenuItem>
                            <Divider />
                            <MenuItem
                                onClick={logout}
                                sx={{
                                    py: 1.5,
                                    color: 'error.main',
                                    '&:hover': { bgcolor: 'error.lighter' }
                                }}
                            >
                                <ListItemIcon>
                                    <LogoutIcon fontSize="small" color="error" />
                                </ListItemIcon>
                                Đăng xuất
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* ===== SIDEBAR ===== */}
            <Sidebar
                drawerWidth={drawerWidth}
                mobileOpen={mobileOpen}
                onClose={toggleDrawer}
            />

            {/* ===== MAIN CONTENT ===== */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    ml: { sm: `${drawerWidth}px` },
                    minHeight: '100vh',
                    bgcolor: '#f8fafc'
                }}
            >
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
}
