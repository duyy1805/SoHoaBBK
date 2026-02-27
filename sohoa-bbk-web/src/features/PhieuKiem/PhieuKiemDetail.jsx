import { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    Chip,
    Button,
    Stack,
    CircularProgress,
    Grid,
    Card,
    CardContent,
    Divider,
    IconButton,
    Tooltip,
    Fade,
    alpha
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import DescriptionIcon from '@mui/icons-material/Description';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getPhieuKiemDetail,
    getTieuChiChiSo,
    // ketLuanPhieuKiem
} from '../../api/phieuKiem.api';

export default function PhieuKiemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [info, setInfo] = useState(null);
    const [tieuChi, setTieuChi] = useState([]);
    const [loading, setLoading] = useState(true);
    // const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const [detailRes, tcRes] = await Promise.all([
                getPhieuKiemDetail(id),
                getTieuChiChiSo(id)
            ]);
            console.log(detailRes.data)
            setInfo(detailRes.data);
            setTieuChi(tcRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    console.log("duy")
    // const handleKetLuan = async (ketLuan) => {
    //     setSubmitting(true);
    //     try {
    //         await ketLuanPhieuKiem({
    //             phieuKiemId: id,
    //             ketLuan
    //         });
    //         loadData();
    //     } finally {
    //         setSubmitting(false);
    //     }
    // };

    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 400,
                    gap: 2
                }}
            >
                <CircularProgress size={48} sx={{ color: '#6366f1' }} />
                <Typography color="text.secondary">Đang tải chi tiết phiếu kiểm...</Typography>
            </Box>
        );
    }

    const renderKetLuanChip = () => {
        if (info?.KetLuan === 'Đạt') {
            return (
                <Chip
                    icon={<CheckCircleIcon />}
                    label="Đạt"
                    color="success"
                    sx={{ fontWeight: 600, px: 1 }}
                />
            );
        }
        if (info?.KetLuan === 'Không đạt') {
            return (
                <Chip
                    icon={<CancelIcon />}
                    label="Không đạt"
                    color="error"
                    sx={{ fontWeight: 600, px: 1 }}
                />
            );
        }
        return (
            <Chip
                label="Chưa kết luận"
                sx={{ fontWeight: 500, bgcolor: 'warning.light', color: 'warning.dark' }}
            />
        );
    };

    return (
        <Fade in timeout={400}>
            <Box>
                {/* Header */}
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
                    <Tooltip title="Quay lại">
                        <IconButton
                            onClick={() => navigate('/phieu-kiem')}
                            sx={{
                                bgcolor: 'white',
                                boxShadow: 1,
                                '&:hover': { bgcolor: 'grey.100' }
                            }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                    </Tooltip>
                    <Box>
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
                            Chi tiết Phiếu kiểm
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Mã phiếu: <strong>{info?.SoPhieu}</strong>
                        </Typography>
                    </Box>
                </Stack>

                {/* Info Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Card
                            sx={{
                                borderRadius: 3,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                height: '100%'
                            }}
                        >
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                                    Thông tin chung
                                </Typography>

                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 2,
                                                    bgcolor: alpha('#6366f1', 0.1),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <AssignmentIcon sx={{ color: '#6366f1', fontSize: 20 }} />
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Loại kiểm
                                                </Typography>
                                                <Typography fontWeight={600}>{info?.LoaiKiem}</Typography>
                                            </Box>
                                        </Stack>
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 2,
                                                    bgcolor: alpha('#8b5cf6', 0.1),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <CategoryIcon sx={{ color: '#8b5cf6', fontSize: 20 }} />
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Chủng loại
                                                </Typography>
                                                <Typography fontWeight={600}>{info?.TenChungLoai}</Typography>
                                            </Box>
                                        </Stack>
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 2,
                                                    bgcolor: alpha('#06b6d4', 0.1),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <PersonIcon sx={{ color: '#06b6d4', fontSize: 20 }} />
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Người kiểm
                                                </Typography>
                                                <Typography fontWeight={600}>{info?.TenNguoiKiem}</Typography>
                                            </Box>
                                        </Stack>
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 2,
                                                    bgcolor: alpha('#f59e0b', 0.1),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <AccessTimeIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Thời gian kiểm
                                                </Typography>
                                                <Typography fontWeight={600}>
                                                    {info?.ThoiGianKiem
                                                        ? new Date(info.ThoiGianKiem).toLocaleString('vi-VN')
                                                        : 'Chưa có'}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card
                            sx={{
                                borderRadius: 3,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                height: '100%',
                                background: info?.KetLuan === 'Đạt'
                                    ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
                                    : info?.KetLuan === 'Không đạt'
                                        ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
                                        : 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)'
                            }}
                        >
                            <CardContent
                                sx={{
                                    p: 3,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    textAlign: 'center'
                                }}
                            >
                                <FactCheckIcon
                                    sx={{
                                        fontSize: 48,
                                        mb: 2,
                                        color: info?.KetLuan === 'Đạt'
                                            ? 'success.main'
                                            : info?.KetLuan === 'Không đạt'
                                                ? 'error.main'
                                                : 'warning.main'
                                    }}
                                />
                                <Typography variant="overline" color="text.secondary">
                                    Kết luận
                                </Typography>
                                {renderKetLuanChip()}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Tiêu chí + Chỉ số */}
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                    Tiêu chí kiểm tra
                </Typography>

                {tieuChi.map((tc, index) => (
                    <Accordion
                        key={tc.tieuChiId}
                        defaultExpanded={index === 0}
                        sx={{
                            borderRadius: '12px !important',
                            mb: 2,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                            '&:before': { display: 'none' },
                            overflow: 'hidden'
                        }}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            sx={{
                                bgcolor: alpha('#6366f1', 0.04),
                                '&:hover': { bgcolor: alpha('#6366f1', 0.08) }
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 1,
                                        bgcolor: '#6366f1',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: 14
                                    }}
                                >
                                    {index + 1}
                                </Box>
                                <Typography fontWeight={600}>{tc.tenTieuChi}</Typography>
                                <Chip
                                    label={`${tc.chiSo.length} chỉ số`}
                                    size="small"
                                    sx={{ bgcolor: alpha('#6366f1', 0.1), color: '#6366f1' }}
                                />
                            </Stack>
                        </AccordionSummary>

                        <AccordionDetails sx={{ p: 0 }}>
                            <List disablePadding>
                                {tc.chiSo.map((cs, csIndex) => (
                                    <ListItem
                                        key={cs.chiSoId}
                                        divider={csIndex < tc.chiSo.length - 1}
                                        sx={{
                                            py: 2,
                                            px: 3,
                                            '&:hover': { bgcolor: 'grey.50' }
                                        }}
                                        secondaryAction={
                                            cs.dat !== null && (
                                                <Chip
                                                    icon={cs.dat ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : <CancelIcon sx={{ fontSize: 16 }} />}
                                                    label={cs.dat ? 'Đạt' : 'Không đạt'}
                                                    color={cs.dat ? 'success' : 'error'}
                                                    size="small"
                                                    sx={{ fontWeight: 600 }}
                                                />
                                            )
                                        }
                                    >
                                        <ListItemText
                                            primary={
                                                <Typography fontWeight={500}>{cs.tenChiSo}</Typography>
                                            }
                                            secondary={
                                                <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Kiểu: <strong>{cs.kieuDuLieu}</strong>
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Giá trị: <strong>{cs.giaTri ?? 'Chưa nhập'}</strong>
                                                    </Typography>
                                                </Stack>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </AccordionDetails>
                    </Accordion>
                ))}

                {/* Actions */}
                {/* {!info?.KetLuan && (
                    <Card
                        sx={{
                            mt: 4,
                            p: 3,
                            borderRadius: 3,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                            bgcolor: alpha('#6366f1', 0.02)
                        }}
                    >
                        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                            Đưa ra kết luận
                        </Typography>
                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="contained"
                                color="success"
                                size="large"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => handleKetLuan('Đạt')}
                                disabled={submitting}
                                sx={{
                                    borderRadius: 2,
                                    px: 4,
                                    py: 1.5,
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                                }}
                            >
                                Kết luận Đạt
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                size="large"
                                startIcon={<CancelIcon />}
                                onClick={() => handleKetLuan('Không đạt')}
                                disabled={submitting}
                                sx={{
                                    borderRadius: 2,
                                    px: 4,
                                    py: 1.5,
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                }}
                            >
                                Kết luận Không đạt
                            </Button>
                        </Stack>
                    </Card>
                )} */}

                {info?.KetLuan === 'Không đạt' && (
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<DescriptionIcon />}
                        onClick={() => navigate(`/bien-ban/lap/${id}`)}
                        sx={{
                            mt: 4,
                            borderRadius: 2,
                            px: 4,
                            py: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                        }}
                    >
                        Lập biên bản
                    </Button>
                )}
            </Box>
        </Fade>
    );
}
