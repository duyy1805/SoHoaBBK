import { Outlet } from 'react-router-dom';
import {
    AppBar,
    Box,
    CssBaseline,
    IconButton,
    Toolbar,
    Typography,
    Avatar,
    Menu,
    MenuItem
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useState } from 'react';
import Sidebar from './Sidebar';
import { getCurrentUser, logout } from '../../utils/auth';

const drawerWidth = 240;

export default function AppLayout() {
    const user = getCurrentUser();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    const toggleDrawer = () => {
        setMobileOpen(!mobileOpen);
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <CssBaseline />

            {/* ===== APP BAR ===== */}
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    ml: { sm: `${drawerWidth}px` },
                    width: { sm: `calc(100% - ${drawerWidth}px)` }
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={toggleDrawer}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>

                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Số hoá biên bản kiểm
                    </Typography>

                    <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            {user?.fullName?.charAt(0) || 'U'}
                        </Avatar>
                    </IconButton>

                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={() => setAnchorEl(null)}
                    >
                        <MenuItem disabled>{user?.fullName}</MenuItem>
                        <MenuItem onClick={logout}>Đăng xuất</MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>

            {/* ===== SIDEBAR ===== */}
            <Sidebar
                drawerWidth={drawerWidth}
                mobileOpen={mobileOpen}
                onClose={toggleDrawer}
            />

            {/* ===== MAIN CONTENT (FIX CHUẨN) ===== */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    ml: { sm: `${drawerWidth}px` } // 🔥 DÒNG QUAN TRỌNG
                }}
            >

                {/* Spacer cho AppBar */}
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
}
