import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";

// --- MUI Core ---
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    Chip,
    Stack,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Checkbox,
    ListItemText,
    Select,
    FormControl,
    InputLabel,
    Divider,
    Container
} from "@mui/material";

// --- MUI Icons ---
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PrintIcon from "@mui/icons-material/Print";
import DescriptionIcon from '@mui/icons-material/Description';
import BugReportIcon from '@mui/icons-material/BugReport';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import LightbulbCircleIcon from '@mui/icons-material/LightbulbCircle';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import VerifiedIcon from '@mui/icons-material/Verified';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';

// --- API & Utils ---
import {
    getBienBanDetail,
    updateMoTaChung,
    completeBienBan,
    confirmAssign,
    confirmUser,
    getBoPhan,
    assignDepartments,
    addXuLy,
    addChiPhi,
    addHanhDong,
    getDeNghiXuLy
} from "../../api/bienBan.api";
import { decodeToken } from "../../utils/auth";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { BienBanPrintTemplate } from "./components/BienBanPrintTemplate";
import { useToast } from "../../components/common/ToastContext";

export default function BienBanDetail() {
    const { id: bienBanId } = useParams();
    const navigate = useNavigate();
    const componentRef = useRef();
    const { showToast } = useToast();

    const [info, setInfo] = useState(null);
    const [moTaChung, setMoTaChung] = useState("");
    const [moTaConfirmed, setMoTaConfirmed] = useState(false);

    const [defects, setDefects] = useState([]);
    const [assigns, setAssigns] = useState([]);
    const [xuLy, setXuLy] = useState([]);
    const [chiPhi, setChiPhi] = useState([]);
    const [xacNhan, setXacNhan] = useState([]);
    const [hanhDong, setHanhDong] = useState([]);

    const [loading, setLoading] = useState(true);

    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserBoPhanId, setCurrentUserBoPhanId] = useState(null);

    // Modals state
    const [openAssignModal, setOpenAssignModal] = useState(false);
    const [openXuLyModal, setOpenXuLyModal] = useState(false);
    const [openChiPhiModal, setOpenChiPhiModal] = useState(false);
    const [openHanhDongModal, setOpenHanhDongModal] = useState(false);
    const [openPrintModal, setOpenPrintModal] = useState(false);

    // Confirm Dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });

    useEffect(() => {
        const decoded = decodeToken();
        if (decoded) {
            setCurrentUserId(decoded.userId);
            setCurrentUserBoPhanId(decoded.boPhanId);
        }
        loadData();
    }, [bienBanId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getBienBanDetail(bienBanId);

            setInfo(res.data.info);
            setDefects(res.data.defects || []);
            setAssigns(res.data.assigns || []);
            setXuLy(res.data.xuLy || []);
            setChiPhi(res.data.chiPhi || []);
            setXacNhan(res.data.xacNhan || []);
            setHanhDong(res.data.hanhDong || []);

            const moTa = res.data.info?.MoTaChung || "";
            setMoTaChung(moTa);
            setMoTaConfirmed(!!moTa);

        } catch (err) {
            console.error("Lỗi tải biên bản:", err);
            showToast(err?.response?.data?.message || "Không tải được biên bản", "error");
        } finally {
            setLoading(false);
        }
    };

    const getDefectColor = (type) => {
        if (!type) return "default";
        const t = type.toLowerCase();
        if (t.includes("critical")) return "error";
        if (t.includes("major")) return "warning";
        if (t.includes("minor")) return "info";
        return "primary";
    };

    // --- Actions ---
    const handleConfirmMoTa = async () => {
        if (!moTaChung.trim()) {
            showToast("Vui lòng nhập mô tả chung!", "warning");
            return;
        }
        try {
            await updateMoTaChung({ bienBanId, moTaChung });
            setMoTaConfirmed(true);
            showToast("Đã lưu mô tả chung", "success");
            loadData();
        } catch (err) {
            showToast(err?.response?.data?.message || "Không thể lưu mô tả", "error");
        }
    };

    const handleConfirmAssign = () => {
        setConfirmDialog({
            open: true,
            title: 'Xác nhận phân công',
            message: 'Bạn có chắc chắn muốn xác nhận danh sách bộ phận xử lý này?',
            type: 'warning',
            onConfirm: async () => {
                try {
                    await confirmAssign(bienBanId);
                    showToast("Đã chốt phân công xử lý", "success");
                    loadData();
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                } catch (err) {
                    showToast(err?.response?.data?.message || "Lỗi xác nhận phân công", "error");
                }
            }
        });
    };

    const handleConfirmUser = () => {
        setConfirmDialog({
            open: true,
            title: 'Xác nhận thông tin',
            message: 'Bạn xác nhận các thông tin xử lý của bộ phận là chính xác?',
            type: 'info',
            onConfirm: async () => {
                try {
                    await confirmUser(bienBanId);
                    showToast("Xác nhận thông tin thành công", "success");
                    loadData();
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                } catch (err) {
                    showToast(err?.response?.data?.message || "Lỗi xác nhận thông tin", "error");
                }
            }
        });
    };

    const handleComplete = () => {
        setConfirmDialog({
            open: true,
            title: 'Hoàn thành biên bản',
            message: 'Bạn có chắc chắn muốn hoàn thành biên bản này? Hành động này không thể hoàn tác.',
            type: 'success',
            onConfirm: async () => {
                try {
                    await completeBienBan(bienBanId);
                    showToast("Đã hoàn thành biên bản", "success");
                    navigate(-1);
                } catch (err) {
                    showToast(err?.response?.data?.message || "Lỗi hoàn thành biên bản", "error");
                }
            }
        });
    };

    const handlePrintPreview = () => setOpenPrintModal(true);
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: info ? `BienBan_${info.SoPhieu}` : 'BienBan',
    });

    // --- UI Helpers & Conditions ---
    const getStatusText = (boPhanId) => xuLy.some(x => x.BoPhanId === boPhanId) ? "Đã xử lý" : "Đang chờ";
    const getStatusColor = (boPhanId) => xuLy.some(x => x.BoPhanId === boPhanId) ? "success" : "warning";

    const isAssigned = assigns.some(a => a.BoPhanId === currentUserBoPhanId);
    const hasXuLy = xuLy.some(x => x.BoPhanId === currentUserBoPhanId);
    const isConfirmed = xacNhan.some(x => x.BoPhanId === currentUserBoPhanId);
    const allConfirmed = assigns.length > 0 && assigns.every(a => xacNhan.some(x => x.BoPhanId === a.BoPhanId));

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <Stack alignItems="center" spacing={2}>
                    <CircularProgress />
                    <Typography color="text.secondary">Đang tải dữ liệu biên bản...</Typography>
                </Stack>
            </Box>
        );
    }

    if (!info) return <Typography align="center" mt={4}>Không tìm thấy thông tin biên bản</Typography>;

    return (
        <Box sx={{ bgcolor: '#f4f6f8', minHeight: '100vh', pb: 5 }}>
            {/* Top Toolbar */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 10 }}>
                <Container maxWidth="xl">
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate(-1)}
                            color="inherit"
                        >
                            Danh sách biên bản
                        </Button>
                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="outlined"
                                startIcon={<PrintIcon />}
                                onClick={handlePrintPreview}
                                sx={{ bgcolor: 'white' }}
                            >
                                In PDF
                            </Button>
                        </Stack>
                    </Stack>
                </Container>
            </Paper>

            <Box sx={{ px: { xs: 2, md: 4 } }}>
                {/* <Container > */}
                <Grid container spacing={3}>
                    {/* LEFT COLUMN: Thông tin chung & Lỗi */}
                    <Grid size={{ xs: 12, lg: 4 }}>
                        <Stack spacing={3}>
                            {/* Card Header Info */}
                            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                        <Typography variant="h5" color="primary.main" fontWeight="bold">
                                            {info.SoPhieu}
                                        </Typography>
                                        <Chip label={info.TrangThai} color="primary" variant="filled" size="small" />
                                    </Stack>
                                    <Divider sx={{ mb: 2 }} />
                                    <Stack spacing={1.5}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Sản phẩm</Typography>
                                            <Typography variant="body1" fontWeight="500">{info.TenSanPham}</Typography>
                                        </Box>
                                        <Stack direction="row" spacing={4}>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Lot</Typography>
                                                <Typography variant="body2">{info.Lot}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Người lập</Typography>
                                                <Typography variant="body2">{info.NguoiLap}</Typography>
                                            </Box>
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>

                            {/* Card Mô Tả Chung */}
                            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                <CardContent>
                                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                        <DescriptionIcon color="action" /> Mô tả chung
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        multiline
                                        minRows={4}
                                        placeholder="Nhập mô tả chi tiết về tình trạng lỗi..."
                                        value={moTaChung}
                                        onChange={(e) => setMoTaChung(e.target.value)}
                                        disabled={moTaConfirmed}
                                        sx={{
                                            bgcolor: moTaConfirmed ? '#f5f5f5' : '#fff',
                                            '& .MuiInputBase-root': { borderRadius: 1.5 }
                                        }}
                                    />
                                    {!moTaConfirmed && (
                                        <Box sx={{ mt: 2, textAlign: 'right' }}>
                                            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleConfirmMoTa}>
                                                Lưu mô tả
                                            </Button>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Card Danh Sách Lỗi */}
                            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                <CardContent sx={{ p: 0 }}>
                                    <Box sx={{ p: 2, pb: 1 }}>
                                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <BugReportIcon color="error" /> Chi tiết lỗi
                                        </Typography>
                                    </Box>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                                <TableRow>
                                                    <TableCell>Tên lỗi</TableCell>
                                                    <TableCell align="center">Mức độ</TableCell>
                                                    <TableCell align="right">SL</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {defects.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>Chưa có dữ liệu lỗi</TableCell>
                                                    </TableRow>
                                                ) : (
                                                    defects.map((d, i) => (
                                                        <TableRow key={i} hover>
                                                            <TableCell>{d.TenLoi}</TableCell>
                                                            <TableCell align="center">
                                                                <Chip label={d.DefectType} color={getDefectColor(d.DefectType)} size="small" variant="outlined" />
                                                            </TableCell>
                                                            <TableCell align="right" fontWeight="bold">{d.SoLuong}</TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        </Stack>
                    </Grid>

                    {/* RIGHT COLUMN: Các luồng xử lý */}
                    <Grid size={{ xs: 8 }}>
                        <Stack spacing={3}>

                            {/* Phân công xử lý */}
                            {moTaConfirmed && (
                                <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <GroupWorkIcon color="primary" /> Bộ phận phối hợp xử lý
                                            </Typography>
                                            {!info.AssignConfirmed && (
                                                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setOpenAssignModal(true)}>
                                                    Cập nhật
                                                </Button>
                                            )}
                                        </Stack>
                                        <Divider sx={{ mb: 2 }} />

                                        {assigns.length === 0 ? (
                                            <Typography color="text.secondary" fontStyle="italic">Chưa có bộ phận được phân công.</Typography>
                                        ) : (
                                            <Grid container spacing={2}>
                                                {assigns.map((a, i) => (
                                                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                                                        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
                                                            <Box>
                                                                <Typography variant="body2" fontWeight="bold">{a.TenBoPhan}</Typography>
                                                                <Typography variant="caption" color="text.secondary">Mã: {a.MaBoPhan}</Typography>
                                                            </Box>
                                                            <Chip size="small" label={getStatusText(a.BoPhanId)} color={getStatusColor(a.BoPhanId)} />
                                                        </Paper>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        )}

                                        {!info.AssignConfirmed && assigns.length > 0 && (
                                            <Box sx={{ mt: 3, textAlign: 'right' }}>
                                                <Button variant="contained" color="warning" onClick={handleConfirmAssign} startIcon={<AssignmentTurnedInIcon />}>
                                                    Chốt phân công
                                                </Button>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Ý kiến xử lý */}
                            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                <CardContent sx={{ p: 0 }}>
                                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <LightbulbCircleIcon color="warning" /> Ý kiến / Đề xuất xử lý
                                        </Typography>
                                        {info.AssignConfirmed && isAssigned && !isConfirmed && (
                                            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpenXuLyModal(true)}>
                                                Thêm ý kiến
                                            </Button>
                                        )}
                                    </Box>
                                    <TableContainer>
                                        <Table>
                                            <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                                <TableRow>
                                                    <TableCell>Nội dung & Đề nghị</TableCell>
                                                    <TableCell sx={{ width: '30%' }}>Người xử lý & Thời hạn</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {xuLy.length === 0 ? (
                                                    <TableRow><TableCell colSpan={2} align="center" sx={{ py: 3, color: 'text.secondary' }}>Chưa có ý kiến xử lý</TableCell></TableRow>
                                                ) : (
                                                    xuLy.map((x, i) => (
                                                        <TableRow key={i} hover>
                                                            <TableCell>
                                                                <Typography variant="body2" fontWeight="500">{x.NoiDung}</Typography>
                                                                <Chip size="small" label={`Đề nghị: ${x.DeNghiXuLy}`} sx={{ mt: 1 }} />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2" fontWeight="bold">{x.NguoiXuLy}</Typography>
                                                                <Typography variant="caption" color="text.secondary" display="block">{x.MaBoPhan}</Typography>
                                                                <Typography variant="caption" color="error.main">Hạn: {new Date(x.ThoiHan).toLocaleDateString("vi-VN")}</Typography>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>

                            {/* Group: Chi phí & Hành động khắc phục (2 Cột) */}
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, height: '100%' }}>
                                        <CardContent>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1.1rem' }}>
                                                    <AttachMoneyIcon color="success" /> Chi phí phát sinh
                                                </Typography>
                                                {info.AssignConfirmed && isAssigned && !isConfirmed && hasXuLy && (
                                                    <Button size="small" color="success" onClick={() => setOpenChiPhiModal(true)}><AddIcon /></Button>
                                                )}
                                            </Stack>
                                            <Divider sx={{ mb: 2 }} />
                                            {chiPhi.length === 0 ? (
                                                <Typography color="text.secondary" variant="body2">Không ghi nhận chi phí.</Typography>
                                            ) : (
                                                <Stack spacing={1.5}>
                                                    {chiPhi.map((c, i) => (
                                                        <Paper key={i} variant="outlined" sx={{ p: 1.5, bgcolor: '#fbfdf8' }}>
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                                <Typography variant="body2" fontWeight="500">{c.LoaiChiPhi}</Typography>
                                                                <Typography variant="body2" color="success.main" fontWeight="bold">
                                                                    {c.GiaTri?.toLocaleString("vi-VN")} đ
                                                                </Typography>
                                                            </Box>
                                                            <Typography variant="caption" color="text.secondary">{c.TenBoPhan}</Typography>
                                                        </Paper>
                                                    ))}
                                                </Stack>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, height: '100%' }}>
                                        <CardContent>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1.1rem' }}>
                                                    <BuildCircleIcon color="info" /> Hành động khắc phục
                                                </Typography>
                                                {info.AssignConfirmed && isAssigned && !isConfirmed && hasXuLy && (
                                                    <Button size="small" color="info" onClick={() => setOpenHanhDongModal(true)}><AddIcon /></Button>
                                                )}
                                            </Stack>
                                            <Divider sx={{ mb: 2 }} />
                                            {hanhDong.length === 0 ? (
                                                <Typography color="text.secondary" variant="body2">Chưa có hành động cụ thể.</Typography>
                                            ) : (
                                                <Stack spacing={1.5}>
                                                    {hanhDong.map((h, i) => (
                                                        <Paper key={i} variant="outlined" sx={{ p: 1.5, bgcolor: '#f8fafc' }}>
                                                            <Typography variant="body2" fontWeight="500" mb={1}>{h.NoiDung}</Typography>
                                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                                <Typography variant="caption" color="text.secondary">{h.TenBoPhan}</Typography>
                                                                <Typography variant="caption" color="error.main">Hạn: {new Date(h.ThoiHan).toLocaleDateString("vi-VN")}</Typography>
                                                            </Stack>
                                                        </Paper>
                                                    ))}
                                                </Stack>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            {/* Lịch sử xác nhận */}
                            {xacNhan.length > 0 && (
                                <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                    <CardContent>
                                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <VerifiedIcon color="success" /> Lịch sử xác nhận
                                        </Typography>
                                        <Grid container spacing={2}>
                                            {xacNhan.map((x, i) => (
                                                <Grid size={{ xs: 12, sm: 6 }} key={i}>
                                                    <Paper variant="outlined" sx={{ p: 1.5, borderLeft: '4px solid #4caf50' }}>
                                                        <Typography variant="body2" fontWeight="bold">{x.FullName}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{new Date(x.ThoiGian).toLocaleString("vi-VN")}</Typography>
                                                    </Paper>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </CardContent>
                                </Card>
                            )}
                        </Stack>
                    </Grid>
                </Grid>

                {/* Floating Bottom Action Bar */}
                {((info.AssignConfirmed && isAssigned && !isConfirmed && hasXuLy) || allConfirmed) && (
                    <Paper elevation={4} sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, p: 2, bgcolor: 'white', zIndex: 100, borderTop: '1px solid #e0e0e0' }}>
                        <Container maxWidth="xl">
                            <Stack direction="row" justifyContent="flex-end" spacing={2}>
                                {info.AssignConfirmed && isAssigned && !isConfirmed && hasXuLy && (
                                    <Button variant="contained" color="warning" size="large" onClick={handleConfirmUser} startIcon={<VerifiedIcon />}>
                                        Xác nhận tiến độ xử lý của bộ phận
                                    </Button>
                                )}
                                {allConfirmed && (
                                    <Button variant="contained" color="success" size="large" onClick={handleComplete} startIcon={<SaveIcon />}>
                                        Hoàn tất Biên Bản
                                    </Button>
                                )}
                            </Stack>
                        </Container>
                    </Paper>
                )}
                {/* </Container> */}
            </Box>
            {/* --- Dialogs (Giữ nguyên logic, chỉnh nhẹ CSS) --- */}

            {/* Print Preview Modal */}
            <Dialog open={openPrintModal} onClose={() => setOpenPrintModal(false)} maxWidth="lg" fullWidth>
                <DialogTitle>Xem trước bản in</DialogTitle>
                <DialogContent dividers sx={{ bgcolor: '#525659', p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Paper sx={{ width: '210mm', minHeight: '297mm', p: 0, boxShadow: 3 }}>
                            <BienBanPrintTemplate
                                ref={componentRef}
                                info={{ ...info, MoTaChung: moTaChung }}
                                defects={defects}
                                xuLy={xuLy}
                                chiPhi={chiPhi}
                                hanhDong={hanhDong}
                                xacNhan={xacNhan}
                            />
                        </Paper>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenPrintModal(false)} color="inherit">Đóng</Button>
                    <Button startIcon={<PrintIcon />} onClick={handlePrint} variant="contained" color="primary">
                        Tiến hành In
                    </Button>
                </DialogActions>
            </Dialog>

            <AssignDepartmentDialog
                open={openAssignModal}
                onClose={() => setOpenAssignModal(false)}
                bienBanId={bienBanId}
                reload={loadData}
                assignedIds={assigns.map(a => a.BoPhanId)}
            />
            <XuLyDialog open={openXuLyModal} onClose={() => setOpenXuLyModal(false)} bienBanId={bienBanId} currentUserId={currentUserId} reload={loadData} />
            <ChiPhiDialog open={openChiPhiModal} onClose={() => setOpenChiPhiModal(false)} bienBanId={bienBanId} reload={loadData} />
            <HanhDongDialog open={openHanhDongModal} onClose={() => setOpenHanhDongModal(false)} bienBanId={bienBanId} reload={loadData} />

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
            />
        </Box>
    );
}

// --- Sub-components (Dialogs) ---

function AssignDepartmentDialog({ open, onClose, bienBanId, reload, assignedIds }) {
    const [departments, setDepartments] = useState([]);
    // 1. Khởi tạo state với giá trị từ prop
    const [selected, setSelected] = useState(assignedIds || []);

    // 2. Lưu lại prop cũ để so sánh
    const [prevAssignedIds, setPrevAssignedIds] = useState(assignedIds);

    // 3. Cập nhật state ngay trong lúc render nếu prop thay đổi
    if (assignedIds !== prevAssignedIds) {
        setPrevAssignedIds(assignedIds);
        setSelected(assignedIds);
    }

    // 4. useEffect giờ ĐƠN THUẦN chỉ dùng để gọi API (tác vụ bất đồng bộ)
    useEffect(() => {
        if (open) {
            getBoPhan().then(res => setDepartments(res.data));
        }
    }, [open]);

    const handleSubmit = async () => {
        try {
            await assignDepartments(bienBanId, selected);
            reload();
            onClose();
        } catch (err) {
            alert(err?.response?.data?.message || "Lỗi phân công");
        }
    };

    const handleChange = (event) => {
        const { target: { value } } = event;
        setSelected(typeof value === 'string' ? value.split(',') : value);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle fontWeight="bold">Chọn bộ phận xử lý</DialogTitle>
            <DialogContent dividers>
                <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel>Danh sách bộ phận</InputLabel>
                    <Select
                        multiple
                        value={selected}
                        onChange={handleChange}
                        label="Danh sách bộ phận"
                        renderValue={(selected) => selected.map(id => departments.find(d => d.Id === id)?.TenBoPhan).join(', ')}
                    >
                        {departments.map((dep) => (
                            <MenuItem key={dep.Id} value={dep.Id}>
                                <Checkbox checked={selected.indexOf(dep.Id) > -1} />
                                <ListItemText primary={dep.TenBoPhan} secondary={dep.MaBoPhan} />
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">Hủy</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">Lưu thay đổi</Button>
            </DialogActions>
        </Dialog>
    );
}

function XuLyDialog({ open, onClose, bienBanId, currentUserId, reload }) {
    const [form, setForm] = useState({ NoiDung: '', DeNghiXuLyId: '', ThoiHan: '' });
    const [deNghis, setDeNghis] = useState([]);

    useEffect(() => {
        if (open) {
            getDeNghiXuLy().then(res => setDeNghis(res.data));
        }
    }, [open]);

    const handleSubmit = async () => {
        try {
            await addXuLy({
                bienBanId,
                noiDung: form.NoiDung,
                deNghiXuLyId: form.DeNghiXuLyId,
                thoiHan: form.ThoiHan,
                currentUserId
            });
            reload();
            onClose();
        } catch (err) {
            alert(err?.response?.data?.message || "Lỗi thêm xử lý");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle fontWeight="bold">Nhập ý kiến xử lý</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <TextField
                        label="Nội dung ý kiến"
                        fullWidth
                        multiline
                        rows={3}
                        value={form.NoiDung}
                        onChange={e => setForm({ ...form, NoiDung: e.target.value })}
                    />
                    <FormControl fullWidth>
                        <InputLabel>Hình thức đề nghị xử lý</InputLabel>
                        <Select
                            value={form.DeNghiXuLyId}
                            label="Hình thức đề nghị xử lý"
                            onChange={e => setForm({ ...form, DeNghiXuLyId: e.target.value })}
                        >
                            {deNghis.map(d => (
                                <MenuItem key={d.Id} value={d.Id}>{d.Ten}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Hạn hoàn thành"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        value={form.ThoiHan}
                        onChange={e => setForm({ ...form, ThoiHan: e.target.value })}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">Hủy</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">Ghi nhận</Button>
            </DialogActions>
        </Dialog>
    );
}

function ChiPhiDialog({ open, onClose, bienBanId, reload }) {
    const [form, setForm] = useState({ LoaiChiPhi: '', GiaTri: '', ThoiHan: '' });

    const handleSubmit = async () => {
        try {
            await addChiPhi({
                bienBanId,
                loaiChiPhi: form.LoaiChiPhi,
                giaTri: Number(form.GiaTri),
                thoiHan: form.ThoiHan
            });
            reload();
            onClose();
        } catch (err) {
            alert(err?.response?.data?.message || "Lỗi thêm chi phí");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle fontWeight="bold">Ghi nhận chi phí phát sinh</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <TextField
                        label="Tên/Loại chi phí"
                        fullWidth
                        value={form.LoaiChiPhi}
                        onChange={e => setForm({ ...form, LoaiChiPhi: e.target.value })}
                    />
                    <TextField
                        label="Giá trị (VND)"
                        type="number"
                        fullWidth
                        value={form.GiaTri}
                        onChange={e => setForm({ ...form, GiaTri: e.target.value })}
                    />
                    <TextField
                        label="Thời hạn dự kiến"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        value={form.ThoiHan}
                        onChange={e => setForm({ ...form, ThoiHan: e.target.value })}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">Hủy</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">Lưu chi phí</Button>
            </DialogActions>
        </Dialog>
    );
}

function HanhDongDialog({ open, onClose, bienBanId, reload }) {
    const [form, setForm] = useState({ NoiDung: '', ThoiHan: '' });

    const handleSubmit = async () => {
        try {
            await addHanhDong({
                bienBanId,
                noiDung: form.NoiDung,
                thoiHan: form.ThoiHan
            });
            reload();
            onClose();
        } catch (err) {
            alert(err?.response?.data?.message || "Lỗi thêm hành động");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle fontWeight="bold">Thêm hành động khắc phục</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <TextField
                        label="Nội dung hành động"
                        fullWidth
                        multiline
                        rows={3}
                        value={form.NoiDung}
                        onChange={e => setForm({ ...form, NoiDung: e.target.value })}
                    />
                    <TextField
                        label="Thời hạn hoàn thành"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        value={form.ThoiHan}
                        onChange={e => setForm({ ...form, ThoiHan: e.target.value })}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">Hủy</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">Cập nhật</Button>
            </DialogActions>
        </Dialog>
    );
}