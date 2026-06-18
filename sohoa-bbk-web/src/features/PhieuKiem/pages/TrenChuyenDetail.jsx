import { useEffect, useRef, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fade,
    Grid,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PrintIcon from "@mui/icons-material/Print";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AddTaskIcon from "@mui/icons-material/AddTask";
import { createTrenChuyenBienBan, getPhieuKiemDetail } from "../../../api/phieuKiem.api";
import TrenChuyenPrintTemplate from "../components/TrenChuyenPrintTemplate";

const getFieldValue = (dynamicFields = [], name) =>
    dynamicFields.find((field) => field?.FieldName === name)?.FieldValue ?? "";

export default function TrenChuyenDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const printRef = useRef();

    const [loading, setLoading] = useState(true);
    const [creatingBienBan, setCreatingBienBan] = useState(false);
    const [phieu, setPhieu] = useState(null);
    const [slots, setSlots] = useState([]);
    const [summary, setSummary] = useState(null);
    const [dynamicFields, setDynamicFields] = useState([]);
    const [openPrint, setOpenPrint] = useState(false);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: phieu?.SoPhieu ? `TrenChuyen_${phieu.SoPhieu}` : "PhieuKiemTrenChuyen"
    });

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getPhieuKiemDetail(id);
            const data = res.data || {};
            if (data?.phieu?.LoaiKiemId !== 6) {
                navigate(`/phieu-kiem/${id}`, { replace: true });
                return;
            }
            setPhieu(data.phieu || null);
            setSlots(data.slots || []);
            setSummary(data.summary || null);
            setDynamicFields(data.dynamicFields || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBienBan = async () => {
        try {
            setCreatingBienBan(true);
            const res = await createTrenChuyenBienBan(id);
            const bienBanId = res?.data?.bienBanId;
            await loadData();
            if (bienBanId) {
                navigate(`/bien-ban/${bienBanId}`);
            }
        } catch (error) {
            console.error(error);
            window.alert(error?.response?.data?.message || "Không thể sinh biên bản.");
        } finally {
            setCreatingBienBan(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Fade in timeout={300}>
            <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", pb: 5 }}>
                <Paper elevation={0} sx={{ p: 2, mb: 3, borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 10 }}>
                    <Container maxWidth="xl">
                        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2}>
                            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} color="inherit">
                                Danh sách phiếu kiểm
                            </Button>
                            <Stack direction="row" spacing={2}>
                                {phieu?.BienBanId ? (
                                    <Button
                                        variant="outlined"
                                        startIcon={<AssignmentIcon />}
                                        onClick={() => navigate(`/bien-ban/${phieu.BienBanId}`)}
                                    >
                                        Xem biên bản KPH
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddTaskIcon />}
                                        onClick={handleCreateBienBan}
                                        disabled={creatingBienBan}
                                    >
                                        Sinh biên bản
                                    </Button>
                                )}
                                <Button variant="contained" startIcon={<PrintIcon />} onClick={() => setOpenPrint(true)}>
                                    Xem in
                                </Button>
                            </Stack>
                        </Stack>
                    </Container>
                </Paper>

                <Container maxWidth="xl">
                    <Stack spacing={3}>
                        <Card>
                            <CardContent>
                                <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={3}>
                                    <Box>
                                        <Typography variant="h4" fontWeight={700}>{phieu?.SoPhieu || "---"}</Typography>
                                        <Typography sx={{ mt: 1, color: "text.secondary" }}>
                                            {getFieldValue(dynamicFields, "TrenChuyen_TenSanPham") || phieu?.TenSanPham || "---"}
                                        </Typography>
                                        <Typography sx={{ color: "text.secondary" }}>
                                            Item code: {getFieldValue(dynamicFields, "TrenChuyen_MaSanPham") || phieu?.MaSanPham || "---"}
                                        </Typography>
                                    </Box>
                                    <Stack spacing={1} alignItems={{ xs: "flex-start", lg: "flex-end" }}>
                                        <Chip label={phieu?.TrangThai || "---"} color={phieu?.KetLuan === "KHONG_DAT" ? "error" : "default"} />
                                        <Typography variant="body2">Đơn vị: {getFieldValue(dynamicFields, "TrenChuyen_TenDonVi") || phieu?.DoiTuong || "---"}</Typography>
                                        <Typography variant="body2">Chuyền/Bộ phận: {getFieldValue(dynamicFields, "TrenChuyen_TenBoPhan") || "---"}</Typography>
                                        <Typography variant="body2">Ngày kế hoạch: {getFieldValue(dynamicFields, "TrenChuyen_NgayKeHoach") ? new Date(getFieldValue(dynamicFields, "TrenChuyen_NgayKeHoach")).toLocaleDateString("vi-VN") : "---"}</Typography>
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>

                        <Grid container spacing={3}>
                            <Grid item xs={12} md={3}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">Tổng khung giờ</Typography>
                                    <Typography variant="h5" fontWeight={700}>{summary?.TotalSlots || 0}</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">Tổng công đoạn</Typography>
                                    <Typography variant="h5" fontWeight={700}>{summary?.TotalEntries || 0}</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">Dòng lỗi</Typography>
                                    <Typography variant="h5" fontWeight={700}>{summary?.TotalDefectRows || 0}</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">Tổng số lỗi</Typography>
                                    <Typography variant="h5" fontWeight={700}>{summary?.TotalDefectQuantity || 0}</Typography>
                                </Paper>
                            </Grid>
                        </Grid>

                        <Card>
                            <CardContent>
                                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                                    Ghi nhận theo khung giờ
                                </Typography>
                                <Stack spacing={2}>
                                    {slots.length === 0 ? (
                                        <Typography color="text.secondary">Chưa có dữ liệu khung giờ.</Typography>
                                    ) : slots.map((slot) => (
                                        <Paper key={slot.Id} variant="outlined" sx={{ p: 2 }}>
                                            <Stack spacing={1.5}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="subtitle1" fontWeight={700}>
                                                        Khung giờ {slot.GioKiem}
                                                    </Typography>
                                                    <Chip size="small" label={`${slot.Entries?.length || 0} công đoạn`} />
                                                </Stack>
                                                <TableContainer component={Paper} variant="outlined">
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell sx={{ width: 220 }}>Công đoạn</TableCell>
                                                                <TableCell>Lỗi ghi nhận</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {(slot.Entries || []).length === 0 ? (
                                                                <TableRow>
                                                                    <TableCell colSpan={2} align="center">Khung giờ này chưa có lỗi.</TableCell>
                                                                </TableRow>
                                                            ) : (slot.Entries || []).map((entry) => (
                                                                <TableRow key={entry.Id}>
                                                                    <TableCell>
                                                                        <Stack spacing={0.5}>
                                                                            <Typography variant="body2" fontWeight={700}>{entry.CongDoan}</Typography>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                Người ghi nhận: {entry.TenNguoiGhiNhan || "—"}
                                                                            </Typography>
                                                                        </Stack>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Stack spacing={0.5}>
                                                                            {(entry.Defects || []).map((defect) => (
                                                                                <Typography key={defect.Id || `${entry.Id}-${defect.DefectId}`} variant="body2">
                                                                                    {defect.MaLoi || "---"} - {defect.TenLoi || "---"}: {defect.SoLuong}
                                                                                    {defect.GhiChu ? ` (${defect.GhiChu})` : ""}
                                                                                </Typography>
                                                                            ))}
                                                                        </Stack>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </Stack>
                                        </Paper>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Stack>
                </Container>

                <Dialog open={openPrint} onClose={() => setOpenPrint(false)} maxWidth="lg" fullWidth>
                    <DialogTitle>Xem in phiếu kiểm trên chuyền</DialogTitle>
                    <DialogContent dividers sx={{ bgcolor: "#e5e7eb", p: 2 }}>
                        <TrenChuyenPrintTemplate
                            ref={printRef}
                            phieu={phieu}
                            dynamicFields={dynamicFields}
                            slots={slots}
                            summary={summary}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenPrint(false)}>Đóng</Button>
                        <Button variant="contained" startIcon={<PrintIcon />} onClick={() => handlePrint()}>
                            In / Lưu PDF
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Fade>
    );
}
