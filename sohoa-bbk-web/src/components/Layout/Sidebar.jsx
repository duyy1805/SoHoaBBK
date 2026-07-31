import {
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Box,
    Typography,
    Tooltip
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';
import FactoryIcon from '@mui/icons-material/Factory';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Sidebar({
    collapsed,
    drawerWidth,
    collapsedWidth,
    mobileOpen,
    onMobileClose
}) {
    const location = useLocation();
    const navigate = useNavigate();

    const menus = [
        { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
        { label: 'Phiếu kiểm', icon: <AssignmentIcon />, path: '/phieu-kiem' },
        { label: 'Biên bản', icon: <DescriptionIcon />, path: '/bien-ban' },
        { label: 'Phiếu xử lý không phù hợp', icon: <ReportProblemIcon />, path: '/phieu-xu-ly-khong-phu-hop' },
        { label: 'Danh mục', icon: <FactoryIcon />, path: '/danh-muc' }
    ];

    const renderContent = () => (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* ================= LOGO AREA ================= */}
            <Toolbar
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? 0 : 1.5,
                    px: collapsed ? 0 : 2,
                    minHeight: 60,
                    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)'
                }}
            >
                <Box
                    sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        background:
                            'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow:
                            '0 4px 12px rgba(99, 102, 241, 0.3)',
                        flexShrink: 0,
                        cursor: 'pointer'
                    }}
                    onClick={() => navigate('/dashboard')}
                >
                    <FactoryIcon sx={{ color: '#fff', fontSize: 20 }} />
                </Box>

                {!collapsed && (
                    <Box
                        sx={{
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            transition: 'opacity 0.2s ease'
                        }}
                    >
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 700,
                                background:
                                    'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                lineHeight: 1.2
                            }}
                        >
                            Số hoá BBK
                        </Typography>

                        <Typography
                            variant="caption"
                            color="text.secondary"
                        >
                            Hệ thống KCS
                        </Typography>
                    </Box>
                )}
            </Toolbar>

            {/* ================= MENU ================= */}
            <Box sx={{ flex: 1, px: 1 }}>
                <List sx={{ py: 1 }}>
                    {menus.map(m => {
                        const selected =
                            location.pathname === m.path ||
                            location.pathname.startsWith(m.path + '/');

                        const item = (
                            <ListItemButton
                                onClick={() => navigate(m.path)}
                                selected={selected}
                                sx={{
                                    borderRadius: 2,
                                    mb: 0.5,
                                    justifyContent: collapsed
                                        ? 'center'
                                        : 'flex-start',
                                    px: collapsed ? 1 : 2,
                                    py: 0.75,
                                    position: 'relative',
                                    transition:
                                        'all 0.2s ease'
                                }}
                            >
                                {/* Active Indicator */}
                                {selected && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 8,
                                            bottom: 8,
                                            width: 4,
                                            borderRadius: 2,
                                            bgcolor: '#6366f1'
                                        }}
                                    />
                                )}

                                <ListItemIcon
                                    sx={{
                                        minWidth: 0,
                                        mr: collapsed ? 0 : 2,
                                        justifyContent: 'center',
                                        color: selected
                                            ? '#6366f1'
                                            : 'text.secondary'
                                    }}
                                >
                                    {m.icon}
                                </ListItemIcon>

                                {!collapsed && (
                                    <ListItemText
                                        primary={m.label}
                                        sx={{
                                            opacity: collapsed ? 0 : 1,
                                            whiteSpace: 'nowrap',
                                            transition: 'opacity 0.2s ease',
                                            ml: collapsed ? 0 : 2
                                        }}
                                        primaryTypographyProps={{
                                            fontWeight: selected ? 600 : 500,
                                            fontSize: 13,
                                            noWrap: true
                                        }}
                                    />
                                )}
                            </ListItemButton>
                        );

                        return collapsed ? (
                            <Tooltip
                                title={m.label}
                                placement="right"
                                key={m.path}
                            >
                                <Box>{item}</Box>
                            </Tooltip>
                        ) : (
                            <Box key={m.path}>{item}</Box>
                        );
                    })}
                </List>
            </Box>

            {/* ================= FOOTER ================= */}
            {!collapsed && (
                <Box
                    sx={{
                        p: 2,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        textAlign: 'center'
                    }}
                >
                    <Typography
                        variant="caption"
                        color="text.disabled"
                    >
                        © 2026 SoHoa BBK v1.0
                    </Typography>
                </Box>
            )}
        </Box>
    );

    return (
        <>
            {/* ========== MOBILE ========== */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={onMobileClose}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', sm: 'none' }
                }}
            >
                {renderContent()}
            </Drawer>

            {/* ========== DESKTOP ========== */}
            <Drawer
                variant="permanent"
                open
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': {
                        width: collapsed
                            ? collapsedWidth
                            : drawerWidth,
                        transition:
                            'width 0.3s cubic-bezier(0.4,0,0.2,1)',
                        overflowX: 'hidden',
                        border: 'none',
                        boxShadow:
                            '4px 0 20px rgba(0,0,0,0.05)'
                    }
                }}
            >
                {renderContent()}
            </Drawer>
        </>
    );
}
