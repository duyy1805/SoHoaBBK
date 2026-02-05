import {
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Divider,
    Box,
    Typography,
    alpha
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FactoryIcon from '@mui/icons-material/Factory';
import { useLocation, useNavigate } from 'react-router-dom';
import { hasPermission } from '../../utils/auth';

export default function Sidebar({ drawerWidth, mobileOpen, onClose }) {
    const location = useLocation();
    const navigate = useNavigate();

    const menus = [
        {
            label: 'Dashboard',
            icon: <DashboardIcon />,
            path: '/dashboard',
            permission: 'XEM_BAO_CAO'
        },
        {
            label: 'Phiếu kiểm',
            icon: <AssignmentIcon />,
            path: '/phieu-kiem',
            permission: 'THUC_HIEN_KIEM'
        },
        {
            label: 'Biên bản',
            icon: <DescriptionIcon />,
            path: '/bien-ban',
            permission: 'LAP_BIEN_BAN'
        }
    ];

    const content = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Logo Area */}
            <Toolbar
                sx={{
                    py: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                }}
            >
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                    }}
                >
                    <FactoryIcon sx={{ color: 'white', fontSize: 24 }} />
                </Box>
                <Box>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            lineHeight: 1.2
                        }}
                    >
                        SoHoa BBK
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Hệ thống KCS
                    </Typography>
                </Box>
            </Toolbar>

            {/* Navigation Menu */}
            <Box sx={{ flex: 1, py: 2, px: 1.5 }}>
                <Typography
                    variant="overline"
                    sx={{
                        px: 2,
                        py: 1,
                        display: 'block',
                        color: 'text.secondary',
                        fontWeight: 600,
                        letterSpacing: 1
                    }}
                >
                    Menu chính
                </Typography>

                <List sx={{ py: 0 }}>
                    {menus
                        .filter(m => hasPermission(m.permission))
                        .map(m => {
                            const isSelected = location.pathname.startsWith(m.path);

                            return (
                                <ListItemButton
                                    key={m.path}
                                    selected={isSelected}
                                    onClick={() => navigate(m.path)}
                                    sx={{
                                        borderRadius: 2,
                                        mb: 0.5,
                                        py: 1.2,
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            bgcolor: alpha('#6366f1', 0.08),
                                            '& .MuiListItemIcon-root': {
                                                color: '#6366f1'
                                            }
                                        },
                                        '&.Mui-selected': {
                                            bgcolor: alpha('#6366f1', 0.12),
                                            '&:hover': {
                                                bgcolor: alpha('#6366f1', 0.16)
                                            },
                                            '& .MuiListItemIcon-root': {
                                                color: '#6366f1'
                                            },
                                            '& .MuiListItemText-primary': {
                                                color: '#6366f1',
                                                fontWeight: 600
                                            }
                                        }
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 40,
                                            color: isSelected ? '#6366f1' : 'text.secondary'
                                        }}
                                    >
                                        {m.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={m.label}
                                        primaryTypographyProps={{
                                            fontWeight: isSelected ? 600 : 500,
                                            color: isSelected ? '#6366f1' : 'text.primary'
                                        }}
                                    />
                                    {isSelected && (
                                        <Box
                                            sx={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                bgcolor: '#6366f1'
                                            }}
                                        />
                                    )}
                                </ListItemButton>
                            );
                        })}
                </List>
            </Box>

            {/* Footer */}
            <Box
                sx={{
                    p: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center'
                }}
            >
                <Typography variant="caption" color="text.disabled">
                    © 2026 SoHoa BBK v1.0
                </Typography>
            </Box>
        </Box>
    );

    return (
        <>
            {/* MOBILE */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={onClose}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', sm: 'none' },
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        border: 'none'
                    }
                }}
            >
                {content}
            </Drawer>

            {/* DESKTOP */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        border: 'none',
                        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.04)'
                    }
                }}
                open
            >
                {content}
            </Drawer>
        </>
    );
}
