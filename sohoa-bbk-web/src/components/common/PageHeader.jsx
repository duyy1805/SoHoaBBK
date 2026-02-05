import { Box, Typography, Stack, Breadcrumbs, Link, Button, Chip } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useNavigate } from 'react-router-dom';

export default function PageHeader({
    title,
    subtitle,
    breadcrumbs = [],
    action,
    actionIcon,
    actionText,
    onAction,
    badge
}) {
    const navigate = useNavigate();

    return (
        <Box sx={{ mb: 4 }}>
            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
                <Breadcrumbs
                    separator={<NavigateNextIcon fontSize="small" />}
                    sx={{ mb: 2 }}
                >
                    {breadcrumbs.map((crumb, index) => {
                        const isLast = index === breadcrumbs.length - 1;

                        if (isLast) {
                            return (
                                <Typography
                                    key={crumb.label}
                                    color="text.primary"
                                    fontWeight={500}
                                >
                                    {crumb.label}
                                </Typography>
                            );
                        }

                        return (
                            <Link
                                key={crumb.label}
                                underline="hover"
                                color="text.secondary"
                                sx={{ cursor: 'pointer' }}
                                onClick={() => navigate(crumb.path)}
                            >
                                {crumb.label}
                            </Link>
                        );
                    })}
                </Breadcrumbs>
            )}

            {/* Title and Action */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={2}
            >
                <Box>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 700,
                                background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}
                        >
                            {title}
                        </Typography>
                        {badge && (
                            <Chip
                                label={badge}
                                size="small"
                                sx={{
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    fontWeight: 600
                                }}
                            />
                        )}
                    </Stack>
                    {subtitle && (
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>

                {(action || onAction) && (
                    action || (
                        <Button
                            variant="contained"
                            startIcon={actionIcon}
                            onClick={onAction}
                            sx={{
                                borderRadius: 2,
                                px: 3,
                                py: 1,
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
                            }}
                        >
                            {actionText}
                        </Button>
                    )
                )}
            </Stack>
        </Box>
    );
}
