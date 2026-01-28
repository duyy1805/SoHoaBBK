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
    CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getPhieuKiemDetail,
    getTieuChiChiSo,
    ketLuanPhieuKiem
} from '../../api/phieuKiem.api';

export default function PhieuKiemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [info, setInfo] = useState(null);
    const [tieuChi, setTieuChi] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const [detailRes, tcRes] = await Promise.all([
                getPhieuKiemDetail(id),
                getTieuChiChiSo(id)
            ]);
            console.log(tcRes.data);
            setInfo(detailRes.data);
            setTieuChi(tcRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleKetLuan = async (ketLuan) => {
        await ketLuanPhieuKiem({
            phieuKiemId: id,
            ketLuan
        });
        loadData();
    };

    if (loading) {
        return (
            <Box textAlign="center" mt={5}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h5" mb={2}>
                Chi tiết Phiếu kiểm {info?.SoPhieu}
            </Typography>

            {/* ===== THÔNG TIN CHUNG ===== */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography>Loại kiểm: {info?.LoaiKiem}</Typography>
                <Typography>Chủng loại: {info?.TenChungLoai}</Typography>
                <Typography>Người kiểm: {info?.TenNguoiKiem}</Typography>
                <Typography>
                    Kết luận:{' '}
                    {info?.KetLuan ? (
                        <Chip
                            label={info.KetLuan}
                            color={info.KetLuan === 'Đạt' ? 'success' : 'error'}
                            size="small"
                        />
                    ) : (
                        'Chưa kết luận'
                    )}
                </Typography>
            </Paper>

            {/* ===== TIÊU CHÍ + CHỈ SỐ + KẾT QUẢ KIỂM ===== */}
            {tieuChi.map(tc => (
                <Accordion key={tc.tieuChiId} defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography fontWeight="bold">
                            {tc.tenTieuChi}
                        </Typography>
                    </AccordionSummary>

                    <AccordionDetails>
                        <List dense>
                            {tc.chiSo.map(cs => (
                                <ListItem
                                    key={cs.chiSoId}
                                    divider
                                    secondaryAction={
                                        cs.dat !== null && (
                                            <Chip
                                                label={cs.dat ? 'Đạt' : 'Không đạt'}
                                                color={cs.dat ? 'success' : 'error'}
                                                size="small"
                                            />
                                        )
                                    }
                                >
                                    <ListItemText
                                        primary={cs.tenChiSo}
                                        secondary={
                                            <>
                                                <Typography
                                                    variant="caption"
                                                    component="span"
                                                    display="block"
                                                >
                                                    Kiểu dữ liệu: {cs.kieuDuLieu}
                                                </Typography>

                                                <Typography
                                                    variant="body2"
                                                    component="span"
                                                    display="block"
                                                    color="text.secondary"
                                                >
                                                    Giá trị kiểm: {cs.giaTri ?? 'Chưa nhập'}
                                                </Typography>
                                            </>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </AccordionDetails>
                </Accordion>
            ))}


            {/* ===== ACTION ===== */}
            {!info?.KetLuan && (
                <Stack direction="row" spacing={2} mt={3}>
                    <Button
                        color="success"
                        onClick={() => handleKetLuan('Đạt')}
                    >
                        Kết luận Đạt
                    </Button>
                    <Button
                        color="error"
                        onClick={() => handleKetLuan('Không đạt')}
                    >
                        Kết luận Không đạt
                    </Button>
                </Stack>
            )}

            {info?.KetLuan === 'Không đạt' && (
                <Button
                    sx={{ mt: 3 }}
                    onClick={() => navigate(`/bien-ban/lap/${id}`)}
                >
                    Lập biên bản
                </Button>
            )}
        </Box>
    );
}
