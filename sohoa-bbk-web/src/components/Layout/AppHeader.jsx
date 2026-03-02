import {
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Box,
    Tooltip,
    Avatar
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { getCurrentUser } from '../../utils/auth';

export default function AppHeader({
    collapsed,
    drawerWidth,
    onToggleCollapse,
    onMobileToggle
}) {
    const user = getCurrentUser();

    const initials = user?.fullName
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    return (
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
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)'
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

                <Tooltip title={user?.fullName}>
                    <Avatar
                        sx={{
                            width: 38,
                            height: 38,
                            fontSize: 14,
                            bgcolor: '#6366f1'
                        }}
                    >
                        {initials}
                    </Avatar>
                </Tooltip>
            </Toolbar>
        </AppBar>
    );
}