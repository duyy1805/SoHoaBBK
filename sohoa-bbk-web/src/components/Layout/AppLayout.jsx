import { Box, CssBaseline } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';

const DRAWER_WIDTH = 238;
const COLLAPSED_WIDTH = 70;

export default function AppLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleToggleCollapse = () => {
        setCollapsed(prev => !prev);
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f7fb' }}>
            <CssBaseline />

            <AppHeader
                collapsed={collapsed}
                drawerWidth={collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH}
                onToggleCollapse={handleToggleCollapse}
                onMobileToggle={() => setMobileOpen(!mobileOpen)}
            />

            <Sidebar
                collapsed={collapsed}
                drawerWidth={DRAWER_WIDTH}
                collapsedWidth={COLLAPSED_WIDTH}
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
            />

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    minHeight: '100dvh',
                    transition: 'margin 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    ml: {
                        sm: collapsed ? `${COLLAPSED_WIDTH}px` : `${DRAWER_WIDTH}px`
                    },
                    p: {
                        xs: '12px max(12px, env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))',
                        md: 2
                    }
                }}
            >
                <Box sx={{ height: 56 }} />
                <Outlet />
            </Box>
        </Box>
    );
}
