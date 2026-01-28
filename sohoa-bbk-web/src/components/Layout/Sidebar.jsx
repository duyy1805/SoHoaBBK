import {
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Divider,
    Box
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';
import DashboardIcon from '@mui/icons-material/Dashboard';
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
        <Box>
            <Toolbar sx={{ fontWeight: 'bold', justifyContent: 'center' }}>
                BBK System
            </Toolbar>
            <Divider />
            <List>
                {menus
                    .filter(m => hasPermission(m.permission))
                    .map(m => (
                        <ListItemButton
                            key={m.path}
                            selected={location.pathname.startsWith(m.path)}
                            onClick={() => navigate(m.path)}
                            sx={{
                                '&.Mui-selected': {
                                    backgroundColor: 'primary.light',
                                    color: 'primary.contrastText',
                                    '& .MuiListItemIcon-root': {
                                        color: 'primary.contrastText'
                                    }
                                }
                            }}
                        >
                            <ListItemIcon>{m.icon}</ListItemIcon>
                            <ListItemText primary={m.label} />
                        </ListItemButton>
                    ))}
            </List>
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
                    '& .MuiDrawer-paper': { width: drawerWidth }
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
                        boxSizing: 'border-box'
                    }
                }}
                open
            >
                {content}
            </Drawer>
        </>
    );
}
