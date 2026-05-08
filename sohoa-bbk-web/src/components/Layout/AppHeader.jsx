import { useState } from 'react';
import {
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Box,
    Tooltip,
    Avatar,
    Menu,
    MenuItem,
    ListItemIcon,
    Divider
} from '@mui/material';

import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';

import { getCurrentUser, logout } from '../../utils/auth';

export default function AppHeader({
    collapsed,
    drawerWidth,
    onToggleCollapse,
    onMobileToggle
}) {
    const user = getCurrentUser();

    // Menu state
    const [anchorEl, setAnchorEl] = useState(null);
    const openMenu = Boolean(anchorEl);

    const handleOpenMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        handleCloseMenu();
        await logout();
    };

    const initials = user?.fullName
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';
    return (
        <>
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    ml: { sm: `${drawerWidth}px` },
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    backdropFilter: 'blur(20px)',
                    background: 'rgba(255,255,255,0.85)',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                    color: 'text.primary' // Đảm bảo text không bị trắng trên nền sáng
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                            sx={{ display: { xs: 'block', sm: 'none' } }}
                            onClick={onMobileToggle}
                        >
                            <MenuIcon />
                        </IconButton>

                        <IconButton
                            sx={{ display: { xs: 'none', sm: 'block' } }}
                            onClick={onToggleCollapse}
                        >
                            {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
                        </IconButton>

                        <Typography
                            variant="h6"
                            sx={{ fontWeight: 600 }}
                        >
                            SoHoa BBK
                        </Typography>
                    </Box>

                    <Tooltip title="Tài khoản">
                        <IconButton
                            onClick={handleOpenMenu}
                            size="small"
                            sx={{ ml: 2 }}
                            aria-controls={openMenu ? 'account-menu' : undefined}
                            aria-haspopup="true"
                            aria-expanded={openMenu ? 'true' : undefined}
                        >
                            <Avatar
                                sx={{
                                    width: 38,
                                    height: 38,
                                    fontSize: 14,
                                    bgcolor: '#6366f1',
                                    fontWeight: 'bold'
                                }}
                            >
                                {initials}
                            </Avatar>
                        </IconButton>
                    </Tooltip>
                </Toolbar>
            </AppBar>

            {/* Dropdown Menu User */}
            <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={openMenu}
                onClose={handleCloseMenu}
                onClick={handleCloseMenu} // Click vào item nào cũng đóng menu
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
                        mt: 1.5,
                        minWidth: 200,
                        '& .MuiAvatar-root': {
                            width: 32,
                            height: 32,
                            ml: -0.5,
                            mr: 1,
                        },
                        // Tạo hình mũi tên trỏ lên (arrow indicator)
                        '&::before': {
                            content: '""',
                            display: 'block',
                            position: 'absolute',
                            top: 0,
                            right: 18,
                            width: 10,
                            height: 10,
                            bgcolor: 'background.paper',
                            transform: 'translateY(-50%) rotate(45deg)',
                            zIndex: 0,
                        },
                    },
                }}
            >
                {/* Thông tin User */}
                <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold" noWrap>
                        {user?.fullName || 'Người dùng'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                        {user?.email || user?.username || 'user@example.com'}
                    </Typography>
                </Box>

                <Divider sx={{ my: 0.5 }} />

                <MenuItem onClick={handleCloseMenu}>
                    <ListItemIcon>
                        <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    Hồ sơ cá nhân
                </MenuItem>

                <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                        <LogoutIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <Typography color="error" fontWeight={500}>Đăng xuất</Typography>
                </MenuItem>
            </Menu>
        </>
    );
}