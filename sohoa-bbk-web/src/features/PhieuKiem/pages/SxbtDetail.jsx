// src/features/PhieuKiem/pages/SxbtDetail.jsx
// Trang chi tiết phiếu kiểm Sản Xuất Bổ Trợ (LoaiKiemId = 4)

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Box, Typography, Card, CardContent, Grid, Chip, Stack,
    CircularProgress, Button, Fade, Paper, Container,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Divider, Alert, LinearProgress,
    Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { useReactToPrint } from "react-to-print";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AssignmentIcon from "@mui/icons-material/Assignment";
import InventoryIcon from "@mui/icons-material/Inventory";
import BarChartIcon from "@mui/icons-material/BarChart";
import BugReportIcon from "@mui/icons-material/BugReport";

import { SxbtPrintTemplate } from "../components/SxbtPrintTemplate";
import {
    completeSxbt,
    confirmKN,
    confirmPX,
    getPhieuKiemDetail
} from "../../../api/phieuKiem.api";
import { getBienBanSxbtDetail } from "../../../api/bienBan.api";
import { hasPermission } from "../../../utils/auth";

// ============================================================
// Helpers
// ============================================================
const STATUS_MAP = {
    CHUA_KIEM: { label: "Chưa kiểm", color: "default" },
    CHO_KIEM_NGHIEM: { label: "Chờ kiểm nghiệm", color: "info" },
    CHO_XUONG_XAC_NHAN: { label: "Chờ Kho xác nhận", color: "warning" },
    HOAN_THANH: { label: "Hoàn thành", color: "success" },
    HOAN_TAT: { label: "Hoàn thành", color: "success" },
};

function TrangThaiChip({ value }) {
    const s = STATUS_MAP[value] || { label: value, color: "default" };
    return <Chip label={s.label} color={s.color} size="small" />;
}

function KetLuanChip({ value }) {
    if (value === "DAT")
        return <Chip label="Đạt" color="success" size="small" icon={<CheckCircleOutlineIcon />} />;
    if (value === "KHONG_DAT")
        return <Chip label="Không Đạt" color="error" size="small" icon={<CancelOutlinedIcon />} />;
    return <Chip label="Chưa kết luận" size="small" />;
}

function InfoItem({ label, children }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                {label}
            </Typography>
            <Box mt={0.3}>{children}</Box>
        </Box>
    );
}

function SectionHeader({ icon, title }) {
    return (
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
            <Box sx={{
                width: 36, height: 36, borderRadius: 2,
                bgcolor: "primary.main", display: "flex", alignItems: "center", justifyContent: "center"
            }}>
                {icon}
            </Box>
            <Typography variant="h6" fontWeight={700}>{title}</Typography>
        </Stack>
    );
}

const DEFECT_TYPE_COLOR = {
    "Nghiêm trọng": "#ef4444",
    "CRITICAL": "#ef4444",
    "Nặng": "#f59e0b",
    "MAJOR": "#f59e0b",
    "Nhẹ": "#3b82f6",
    "MINOR": "#3b82f6",
};

// ============================================================
export default function SxbtDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const printRef = useRef();

    const [loading, setLoading] = useState(true);
    const [phieu, setPhieu] = useState(null);
    const [btpItems, setBtpItems] = useState([]);
    const [summary, setSummary] = useState(null);
    const [defects, setDefects] = useState([]);
    const [dynamicFields, setDynamicFields] = useState([]);
    const [confirmSteps, setConfirmSteps] = useState([]);
    const [error, setError] = useState(null);
    const [actionNotice, setActionNotice] = useState(null);
    const [loadingAction, setLoadingAction] = useState(false);
    const [openPrint, setOpenPrint] = useState(false);

    const triggerPrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: phieu ? `SXBT_${phieu.SoPhieu}` : 'PhieuKiemSXBT',
    });

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await getPhieuKiemDetail(id);
            const data = res.data;
            setPhieu(data.phieu || null);
            setBtpItems(data.btpItems || []);
            setSummary(data.summary || null);
            setDefects((data.defects || []).filter(d => d.SoLuong > 0));
            setDynamicFields(data.dynamicFields || []);

            if (data.phieu?.BienBanId) {
                try {
                    const bienBanRes = await getBienBanSxbtDetail(data.phieu.BienBanId);
                    setConfirmSteps(
                        (bienBanRes.data?.confirmSteps || []).filter((step) => step.TrangThai === "DA_XAC_NHAN")
                    );
                } catch (innerErr) {
                    console.error("Không tải được bước xác nhận SXBT:", innerErr);
                    setConfirmSteps([]);
                }
            } else {
                setConfirmSteps([]);
            }
        } catch (err) {
            console.error(err);
            setError("Không thể tải dữ liệu phiếu kiểm.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error}</Alert>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
                    Quay lại
                </Button>
            </Box>
        );
    }

    // ---- Derived stats ----
    const dkThungSanXe = dynamicFields.find(f => f.FieldName === "DKVC_THUNG_SAN_XE")?.FieldValue;
    const dkNgoaiQuan = dynamicFields.find(f => f.FieldName === "DKVC_NGOAI_QUAN")?.FieldValue;

    const tyLe = summary?.TyLe ?? 0;
    const tyLeDat = summary?.TyLeDat ?? 0;
    const tyLeCritical = summary?.TyLeLoiNghiemTrong ?? 0;
    const tyLeMajor = summary?.TyLeLoiNangNhe ?? 0;
    const soLuongMau = summary?.SoLuongMau ?? 0;
    const loaiMau = summary?.LoaiMau;

    const LOAI_MAU_LABEL = {
        LAN_1_2: "Lần 1, 2 (100%)",
        LAN_3: "Lần 3 (5%)",
        LO_TRUOC_KHONG_DAT: "Lô trước KĐ (3%)",
    };

    const isKCS = hasPermission("THUC_HIEN_KIEM");
    const isPX = hasPermission("XAC_NHAN_PX");
    const isKN = hasPermission("XAC_NHAN_KIEM_NGHIEM");
    const isCompleted = ["CHO_KIEM_NGHIEM", "CHO_XUONG_XAC_NHAN", "HOAN_THANH", "HOAN_TAT"].includes(phieu?.TrangThai);

    const inferredKetLuan = phieu?.KetLuan ||
        (dkThungSanXe === "KHONG_DAT" || dkNgoaiQuan === "KHONG_DAT" || defects.length > 0 ? "KHONG_DAT" : "DAT");

    const handleComplete = async () => {
        const label = inferredKetLuan === "DAT" ? "Đạt" : "Không đạt";
        if (!window.confirm(`Xác nhận hoàn tất phiếu SXBT với kết luận: ${label}?`)) return;

        try {
            setLoadingAction(true);
            setActionNotice(null);
            await completeSxbt(id, inferredKetLuan);
            await loadData();
            setActionNotice({ type: "success", message: "Hoàn tất phiếu SXBT thành công. Phiếu đã chuyển sang bước xác nhận tiếp theo." });
        } catch (err) {
            setActionNotice({
                type: "error",
                message: err?.response?.data?.message || "Không thể hoàn tất phiếu SXBT"
            });
        } finally {
            setLoadingAction(false);
        }
    };

    const handleConfirmPX = async () => {
        try {
            setLoadingAction(true);
            setActionNotice(null);
            await confirmPX(id);
            await loadData();
            setActionNotice({ type: "success", message: "Kho đã xác nhận phiếu SXBT thành công" });
        } catch (err) {
            setActionNotice({
                type: "error",
                message: err?.response?.data?.message || "Không thể xác nhận phiếu SXBT"
            });
        } finally {
            setLoadingAction(false);
        }
    };

    const handleConfirmKN = async () => {
        try {
            setLoadingAction(true);
            setActionNotice(null);
            await confirmKN(id);
            await loadData();
            setActionNotice({ type: "success", message: "Đã xác nhận kiểm nghiệm phiếu SXBT thành công" });
        } catch (err) {
            setActionNotice({
                type: "error",
                message: err?.response?.data?.message || "Không thể xác nhận kiểm nghiệm phiếu SXBT"
            });
        } finally {
            setLoadingAction(false);
        }
    };

    return (
        <Fade in timeout={300}>
            <Box>
                {actionNotice && (
                    <Alert
                        severity={actionNotice.type}
                        onClose={() => setActionNotice(null)}
                        sx={{ mb: 2 }}
                    >
                        {actionNotice.message}
                    </Alert>
                )}

                {/* ---- Sticky Header ---- */}
                <Paper elevation={0} sx={{ p: 2, mb: 3, borderBottom: "1px solid #e0e0e0", position: "sticky", top: 0, zIndex: 10, bgcolor: "background.paper" }}>
                    <Container maxWidth="xl">
                        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2}>
                            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} color="inherit">
                                Danh sách phiếu kiểm
                            </Button>
                            {/* <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="subtitle1" fontWeight={700} color="primary">
                                    {phieu?.SoPhieu}
                                </Typography>
                                <TrangThaiChip value={phieu?.TrangThai} />
                                <KetLuanChip value={phieu?.KetLuan} />
                            </Stack> */}
                            <Stack direction="row" spacing={1}>
                                {phieu?.BienBanId && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        startIcon={<AssignmentIcon />}
                                        onClick={() => navigate(`/bien-ban/sxbt/${phieu.BienBanId}`)}
                                    >
                                        Xem biên bản SXBT
                                    </Button>
                                )}
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<PrintIcon />}
                                    onClick={() => setOpenPrint(true)}
                                >
                                    In phiếu
                                </Button>
                            </Stack>
                        </Stack>
                    </Container>
                </Paper>

                <Container maxWidth="xl">
                    {/* ---- I. Thông tin phiếu ---- */}
                    <Card sx={{ mb: 3, borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                        <CardContent sx={{ p: 3 }}>
                            <SectionHeader icon={<AssignmentIcon sx={{ color: "#fff", fontSize: 20 }} />} title="Thông tin phiếu kiểm" />
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoItem label="Số phiếu">
                                        <Typography fontWeight={700} color="primary">{phieu?.SoPhieu || "—"}</Typography>
                                    </InfoItem>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoItem label="Mã đơn hàng">
                                        <Typography fontWeight={600}>{phieu?.MaDonHang || "—"}</Typography>
                                    </InfoItem>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoItem label="Số lượng KH">
                                        <Typography fontWeight={600}>{phieu?.SoLuong?.toLocaleString("vi-VN") || "—"}</Typography>
                                    </InfoItem>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoItem label="Ngày nhập">
                                        <Typography fontWeight={600}>
                                            {phieu?.NgayNhap ? new Date(phieu.NgayNhap).toLocaleDateString("vi-VN") : "—"}
                                        </Typography>
                                    </InfoItem>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoItem label="Người kiểm">
                                        <Typography fontWeight={600}>{phieu?.TenNguoiKiem || "—"}</Typography>
                                    </InfoItem>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoItem label="Trạng thái">
                                        <TrangThaiChip value={phieu?.TrangThai} />
                                    </InfoItem>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoItem label="Kết luận">
                                        <KetLuanChip value={phieu?.KetLuan} />
                                    </InfoItem>
                                </Grid>
                            </Grid>

                            {/* Điều kiện vận chuyển */}
                            {(dkThungSanXe || dkNgoaiQuan) && (
                                <>
                                    <Divider sx={{ my: 2.5 }} />
                                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, textTransform: "uppercase", fontSize: 11, letterSpacing: 0.8 }}>
                                        I. Điều kiện vận chuyển
                                    </Typography>
                                    <Stack direction="row" spacing={3}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Thùng, sàn xe sạch</Typography>
                                            <Box mt={0.5}>
                                                {dkThungSanXe === "DAT"
                                                    ? <Chip label="Đạt" color="success" size="small" icon={<CheckCircleOutlineIcon />} />
                                                    : dkThungSanXe === "KHONG_DAT"
                                                        ? <Chip label="Không đạt" color="error" size="small" icon={<CancelOutlinedIcon />} />
                                                        : <Chip label="Chưa nhập" size="small" />}
                                            </Box>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Ngoại quan sản phẩm</Typography>
                                            <Box mt={0.5}>
                                                {dkNgoaiQuan === "DAT"
                                                    ? <Chip label="Đạt" color="success" size="small" icon={<CheckCircleOutlineIcon />} />
                                                    : dkNgoaiQuan === "KHONG_DAT"
                                                        ? <Chip label="Không đạt" color="error" size="small" icon={<CancelOutlinedIcon />} />
                                                        : <Chip label="Chưa nhập" size="small" />}
                                            </Box>
                                        </Box>
                                    </Stack>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* ---- II. Chi tiết BTP ---- */}
                    {btpItems.length > 0 && (
                        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                            <CardContent sx={{ p: 3 }}>
                                <SectionHeader icon={<InventoryIcon sx={{ color: "#fff", fontSize: 20 }} />} title="II. Chi tiết BTP" />
                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: "grey.50" }}>
                                                <TableCell sx={{ fontWeight: 700 }}>Tên sản phẩm</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Số lượng</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>ĐVT</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Dấu tuần/GS1</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>TT</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>LXVT/LOT</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Số Lot SX</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Số bó hàng</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Số cái/bó</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {btpItems.map((item) => (
                                                <TableRow key={item.Id} hover>
                                                    <TableCell sx={{ fontWeight: 600 }}>{item.TenSanPham}</TableCell>
                                                    <TableCell align="right">{item.SoLuong?.toLocaleString("vi-VN")}</TableCell>
                                                    <TableCell>{item.DonViTinh}</TableCell>
                                                    <TableCell>{item.DauTuanGS1 || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                                                    <TableCell>{item.ThuTu || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                                                    <TableCell>{item.LxvtLot || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                                                    <TableCell>{item.SoLotSX || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                                                    <TableCell>{item.SoBoHang || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                                                    <TableCell>{item.SoCaiBo || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* ---- III. Tỷ lệ kiểm ---- */}
                    {summary && (
                        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                            <CardContent sx={{ p: 3 }}>
                                <SectionHeader icon={<BarChartIcon sx={{ color: "#fff", fontSize: 20 }} />} title="III. Tỷ lệ kiểm" />
                                <Grid container spacing={3} sx={{ mb: 3 }}>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <InfoItem label="Loại mẫu">
                                            <Typography fontWeight={600}>{LOAI_MAU_LABEL[loaiMau] || loaiMau || "—"}</Typography>
                                        </InfoItem>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <InfoItem label="Số lượng mẫu">
                                            <Typography fontWeight={700} fontSize={20}>{soLuongMau?.toLocaleString("vi-VN")}</Typography>
                                        </InfoItem>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <InfoItem label="Tỷ lệ mẫu / tổng">
                                            <Typography fontWeight={700} fontSize={20}>{Number(tyLe).toFixed(1)}%</Typography>
                                        </InfoItem>
                                    </Grid>
                                </Grid>

                                <Divider sx={{ mb: 2.5 }} />

                                <Grid container spacing={2.5}>
                                    {[
                                        { label: "Tỷ lệ đạt", value: tyLeDat, color: "#22c55e", bg: "#dcfce7" },
                                        { label: "Lỗi nghiêm trọng", value: tyLeCritical, color: "#ef4444", bg: "#fee2e2" },
                                        { label: "Lỗi nặng / nhẹ", value: tyLeMajor, color: "#f59e0b", bg: "#fef9c3" },
                                    ].map(({ label, value, color, bg }) => (
                                        <Grid size={{ xs: 12, sm: 4 }} key={label}>
                                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: bg, borderColor: color }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
                                                <Typography variant="h5" fontWeight={800} color={color} mt={0.5}>
                                                    {Number(value).toFixed(1)}%
                                                </Typography>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={Math.min(Number(value), 100)}
                                                    sx={{
                                                        mt: 1, height: 6, borderRadius: 3,
                                                        bgcolor: "rgba(0,0,0,0.08)",
                                                        "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 }
                                                    }}
                                                />
                                            </Paper>
                                        </Grid>
                                    ))}
                                </Grid>
                            </CardContent>
                        </Card>
                    )}

                    {/* ---- IV. Danh sách lỗi ---- */}
                    <Card sx={{ mb: 3, borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                        <CardContent sx={{ p: 3 }}>
                            <SectionHeader icon={<BugReportIcon sx={{ color: "#fff", fontSize: 20 }} />} title="IV. Ghi nhận lỗi" />

                            {defects.length === 0 ? (
                                <Box sx={{ textAlign: "center", py: 4 }}>
                                    <CheckCircleOutlineIcon sx={{ fontSize: 48, color: "success.light", mb: 1 }} />
                                    <Typography color="text.secondary">Không ghi nhận lỗi nào</Typography>
                                </Box>
                            ) : (
                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: "grey.50" }}>
                                                <TableCell sx={{ fontWeight: 700 }}>Tên lỗi</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Loại lỗi</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 700 }}>Số lượng</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 700 }}>Lặp lại</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {defects.map((d, idx) => {
                                                const color = DEFECT_TYPE_COLOR[d.DefectType] || "#64748b";
                                                return (
                                                    <TableRow key={d.DefectId ?? idx} hover>
                                                        <TableCell sx={{ fontWeight: 600 }}>{d.TenLoi}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={d.DefectType}
                                                                size="small"
                                                                sx={{ bgcolor: color, color: "#fff", fontWeight: 700, fontSize: 11 }}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Chip
                                                                label={d.SoLuong}
                                                                color={d.SoLuong > 0 ? "error" : "default"}
                                                                size="small"
                                                                sx={{ fontWeight: 700, minWidth: 40 }}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            {d.IsLapLai
                                                                ? <Chip label="Lặp lại" color="warning" size="small" icon={<WarningAmberIcon />} />
                                                                : <Typography variant="caption" color="text.disabled">—</Typography>}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </CardContent>
                    </Card>

                    {!isCompleted && isKCS && (
                        <Paper sx={{ position: "sticky", bottom: 0, zIndex: 9, mt: 2, mb: 3, p: 2, borderTop: "1px solid #e0e0e0" }}>
                            <Stack direction="row" justifyContent="flex-end">
                                <Button
                                    variant="contained"
                                    color={inferredKetLuan === "DAT" ? "success" : "error"}
                                    onClick={handleComplete}
                                    disabled={loadingAction}
                                >
                                    {loadingAction ? "Đang xử lý..." : `Hoàn tất - ${inferredKetLuan === "DAT" ? "Đạt" : "Không đạt"}`}
                                </Button>
                            </Stack>
                        </Paper>
                    )}

                    {phieu?.TrangThai === "CHO_XUONG_XAC_NHAN" && isPX && (
                        <Paper sx={{ position: "sticky", bottom: 0, zIndex: 9, mt: 2, mb: 3, p: 2, borderTop: "1px solid #e0e0e0" }}>
                            <Stack direction="row" justifyContent="flex-end">
                                <Button
                                    variant="contained"
                                    onClick={handleConfirmPX}
                                    disabled={loadingAction}
                                >
                                    {loadingAction ? "Đang xử lý..." : "Kho xác nhận"}
                                </Button>
                            </Stack>
                        </Paper>
                    )}

                    {phieu?.TrangThai === "CHO_KIEM_NGHIEM" && isKN && (
                        <Paper sx={{ position: "sticky", bottom: 0, zIndex: 9, mt: 2, mb: 3, p: 2, borderTop: "1px solid #e0e0e0" }}>
                            <Stack direction="row" justifyContent="flex-end">
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={handleConfirmKN}
                                    disabled={loadingAction}
                                >
                                    {loadingAction ? "Đang xử lý..." : "Xác nhận kiểm nghiệm"}
                                </Button>
                            </Stack>
                        </Paper>
                    )}
                </Container>

                {/* ===== DIALOG IN PHIẾU ===== */}
                <Dialog open={openPrint} onClose={() => setOpenPrint(false)} maxWidth="md" fullWidth>
                    <DialogTitle>Xem trước phiếu kiểm SXBT</DialogTitle>
                    <DialogContent dividers sx={{ bgcolor: '#e5e7eb', p: 2 }}>
                        <SxbtPrintTemplate
                            ref={printRef}
                            phieu={phieu}
                            btpItems={btpItems}
                            summary={summary}
                            defects={defects}
                            dynamicFields={dynamicFields}
                            confirmSteps={confirmSteps}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenPrint(false)}>Đóng</Button>
                        <Button
                            variant="contained"
                            startIcon={<PrintIcon />}
                            onClick={() => triggerPrint()}
                        >
                            In / Lưu PDF
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Fade>
    );
}
