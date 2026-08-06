import { useEffect, useRef, useState } from "react";
import {
    Alert,
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
    Divider,
    Stack,
    Typography,
    TextField
} from "@mui/material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PrintIcon from "@mui/icons-material/Print";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AddTaskIcon from "@mui/icons-material/AddTask";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import StairsOutlinedIcon from "@mui/icons-material/StairsOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { approveTrenChuyen, completeTrenChuyen, createTrenChuyenBienBan, getPhieuKiemDetail, updatePhieuKiemActualQuantity, updateTrenChuyenSourceFields } from "../../../api/phieuKiem.api";
import { updateSanPhamImage, uploadSanPhamImage } from "../../../api/lookup.api";
import { getCurrentUser } from "../../../utils/auth";
import TrenChuyenPrintTemplate from "../components/TrenChuyenPrintTemplate";
import InspectionPrintCompareDialog from "../components/InspectionPrintCompareDialog";
import UnifiedInspectionPrintTemplate from "../components/UnifiedInspectionPrintTemplate";
import TrenChuyenSlotEditor from "../components/TrenChuyenSlotEditor";

const getFieldValue = (dynamicFields = [], name) =>
    dynamicFields.find((field) => field?.FieldName === name)?.FieldValue ?? "";
const APPROVE_BOPHAN_FIELD = "TrenChuyen_ApproveBoPhanId";

const formatDate = (value) => {
    if (!value) return "---";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "---";
    return date.toLocaleDateString("vi-VN");
};

const statusMeta = (trangThai, ketLuan) => {
    if (trangThai === "HOAN_TAT") {
        return {
            label: ketLuan === "KHONG_DAT" ? "Hoàn tất - Không đạt" : "Hoàn tất",
            color: ketLuan === "KHONG_DAT" ? "error" : "success"
        };
    }
    if (trangThai === "CHO_KIEM_NGHIEM") return { label: "Chờ kiểm nghiệm", color: "warning" };
    if (trangThai === "CHO_TBP_DUYET") return { label: "Chờ Trưởng bộ phận", color: "secondary" };
    if (trangThai === "DANG_KIEM") return { label: "Đang kiểm", color: "info" };
    if (trangThai === "TAO_MOI") return { label: "Mới tạo", color: "default" };
    return { label: trangThai || "---", color: ketLuan === "KHONG_DAT" ? "error" : "default" };
};

function InfoLine({ label, value }) {
    return (
        <Box>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase" }}>
                {label}
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.4, color: "#0f172a", fontWeight: 600 }}>
                {value || "---"}
            </Typography>
        </Box>
    );
}

function StatCard({ icon, label, value, accent = "#2563eb" }) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                height: "100%",
                borderColor: "#dbe4f0",
                borderRadius: 2.5,
                bgcolor: "#fff"
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                    sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        bgcolor: `${accent}14`,
                        color: accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    {icon}
                </Box>
                <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase" }}>
                        {label}
                    </Typography>
                    <Typography variant="h5" sx={{ color: "#0f172a", fontWeight: 800, lineHeight: 1.1 }}>
                        {value ?? 0}
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    );
}

export default function TrenChuyenDetail() {
    const location = useLocation();
    const { id } = useParams();
    const navigate = useNavigate();
    const returnToList = () => navigate(location.state?.returnTo || "/phieu-kiem");
    const oldPrintRef = useRef();
    const newPrintRef = useRef();
    const productImageInputRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [creatingBienBan, setCreatingBienBan] = useState(false);
    const [phieu, setPhieu] = useState(null);
    const [slots, setSlots] = useState([]);
    const [summary, setSummary] = useState(null);
    const [dynamicFields, setDynamicFields] = useState([]);
    const [xacNhans, setXacNhans] = useState([]);
    const [capabilities, setCapabilities] = useState({});
    const [openPrint, setOpenPrint] = useState(false);
    const [approving, setApproving] = useState(false);
    const [actualQuantity, setActualQuantity] = useState("");
    const [savingActual, setSavingActual] = useState(false);
    const [savingSourceFields, setSavingSourceFields] = useState(false);
    const [sourceFields, setSourceFields] = useState({ maDonHang: "", tenQuyTrinhSanXuat: "", lot: "", lenhXuatVatTu: "" });
    const [editingHour, setEditingHour] = useState(undefined);
    const [slotEditorOpen, setSlotEditorOpen] = useState(false);
    const [completeOpen, setCompleteOpen] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [currentUser] = useState(() => getCurrentUser());

    const handlePrintOld = useReactToPrint({
        contentRef: oldPrintRef,
        documentTitle: phieu?.SoPhieu ? `TrenChuyen_${phieu.SoPhieu}_MauCu` : "PhieuKiemTrenChuyen_MauCu"
    });
    const handlePrintNew = useReactToPrint({
        contentRef: newPrintRef,
        documentTitle: phieu?.SoPhieu ? `TrenChuyen_${phieu.SoPhieu}_MauMoi` : "PhieuKiemTrenChuyen_MauMoi"
    });

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async ({ background = false } = {}) => {
        try {
            if (!background) setLoading(true);
            const res = await getPhieuKiemDetail(id);
            const data = res.data || {};
            if (data?.phieu?.LoaiKiemId !== 6) {
                navigate(`/phieu-kiem/${id}`, { replace: true });
                return;
            }
            setPhieu(data.phieu || null);
            setActualQuantity(data.phieu?.SoLuongThucTe == null ? "" : String(data.phieu.SoLuongThucTe));
            setSlots(data.slots || []);
            setSummary(data.summary || null);
            setDynamicFields(data.dynamicFields || []);
            setSourceFields({
                maDonHang: getFieldValue(data.dynamicFields, "TrenChuyen_MaDonHang"),
                tenQuyTrinhSanXuat: getFieldValue(data.dynamicFields, "TrenChuyen_TenQuyTrinhSanXuat"),
                lot: getFieldValue(data.dynamicFields, "TrenChuyen_Lot"),
                lenhXuatVatTu: getFieldValue(data.dynamicFields, "TrenChuyen_LenhXuatVatTu")
            });
            setXacNhans(data.xacNhans || []);
            setCapabilities(data.capabilities || {});
        } catch (error) {
            console.error(error);
        } finally {
            if (!background) setLoading(false);
        }
    };

    const saveActualQuantity = async () => {
        try {
            setSavingActual(true);
            const response = await updatePhieuKiemActualQuantity(id, actualQuantity === "" ? null : Number(actualQuantity));
            setPhieu((current) => ({ ...current, ...(response.data || {}) }));
        } catch (error) {
            window.alert(error.response?.data?.message || "Không cập nhật được số lượng thực tế.");
        } finally {
            setSavingActual(false);
        }
    };

    const saveSourceFields = async () => {
        try {
            setSavingSourceFields(true);
            await updateTrenChuyenSourceFields(id, {
                TrenChuyen_MaDonHang: sourceFields.maDonHang,
                TrenChuyen_TenQuyTrinhSanXuat: sourceFields.tenQuyTrinhSanXuat,
                TrenChuyen_Lot: sourceFields.lot,
                TrenChuyen_LenhXuatVatTu: sourceFields.lenhXuatVatTu
            });
            await loadData({ background: true });
        } catch (error) {
            window.alert(error.response?.data?.message || "Không bổ sung được thông tin nguồn.");
        } finally {
            setSavingSourceFields(false);
        }
    };

    const handleTriggerProductImageUpload = () => {
        if (!phieu?.SanPhamId) {
            window.alert("Phiếu chưa có sản phẩm để gắn ảnh.");
            return;
        }
        productImageInputRef.current?.click();
    };

    const handleProductImageSelected = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !phieu?.SanPhamId) return;

        try {
            const uploadRes = await uploadSanPhamImage(file, {
                maSanPham: phieu?.MaSanPham || getFieldValue(dynamicFields, "TrenChuyen_MaSanPham"),
                tenSanPham: phieu?.TenSanPham || getFieldValue(dynamicFields, "TrenChuyen_TenSanPham")
            });
            const imageUrl = uploadRes?.data?.imageUrl;
            if (!imageUrl) throw new Error("UPLOAD_FAILED");
            await updateSanPhamImage(phieu.SanPhamId, imageUrl);
            await loadData({ background: true });
        } catch (error) {
            console.error(error);
            window.alert(error?.response?.data?.message || "Không thể cập nhật ảnh sản phẩm.");
        }
    };

    const handleCreateBienBan = async () => {
        try {
            setCreatingBienBan(true);
            const res = await createTrenChuyenBienBan(id);
            const bienBanId = res?.data?.bienBanId;
            await loadData({ background: true });
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

    const status = statusMeta(phieu?.TrangThai, phieu?.KetLuan);
    const approveBoPhanId = Number(getFieldValue(dynamicFields, APPROVE_BOPHAN_FIELD) || 0) || null;
    const canApprove = Boolean(
        phieu?.TrangThai === "CHO_TBP_DUYET" && (
            currentUser?.permissions?.includes("QUAN_TRI_DM") || (
                currentUser?.permissions?.includes("PHAN_CONG_NGUOI_XU_LY") &&
                approveBoPhanId &&
                Number(currentUser?.boPhanId) === approveBoPhanId
            )
        )
    );
    const canEdit = capabilities.canEdit ?? Boolean(
        currentUser?.permissions?.includes("THUC_HIEN_KIEM")
        && !["HOAN_TAT", "CHO_TBP_DUYET", "CHO_KIEM_NGHIEM", "CHO_XUONG_XAC_NHAN"].includes(phieu?.TrangThai)
    );
    const productName = getFieldValue(dynamicFields, "TrenChuyen_TenSanPham") || phieu?.TenSanPham || "---";
    const itemCode = getFieldValue(dynamicFields, "TrenChuyen_MaSanPham") || phieu?.MaSanPham || "---";
    const donVi = getFieldValue(dynamicFields, "TrenChuyen_TenDonVi") || phieu?.DoiTuong || "---";
    const chuyen = getFieldValue(dynamicFields, "TrenChuyen_TenBoPhan") || "---";
    const ngayKeHoach = formatDate(getFieldValue(dynamicFields, "TrenChuyen_NgayKeHoach"));
    const soLuongKeHoach = getFieldValue(dynamicFields, "TrenChuyen_SoLuongKeHoach") || "---";
    const nangSuatDuKien = getFieldValue(dynamicFields, "TrenChuyen_NangSuatDuKien") || "---";
    const daSanXuat = getFieldValue(dynamicFields, "TrenChuyen_DaSanXuat") || "---";

    const severitySummary = slots.reduce((acc, slot) => {
        (slot.Entries || []).forEach((entry) => {
            (entry.Defects || []).forEach((defect) => {
                const qty = Number(defect.SoLuong || 0);
                const type = String(defect.DefectType || "").toUpperCase();
                if (type.includes("CRITICAL")) acc.critical += qty;
                else if (type.includes("MINOR")) acc.minor += qty;
                else acc.major += qty;
            });
        });
        return acc;
    }, { minor: 0, major: 0, critical: 0 });
    const specialDefectTotal = slots.reduce((total, slot) => total + (slot.Entries || []).reduce(
        (entryTotal, entry) => entryTotal + Number(entry.SoLoiBuiBan || 0) + Number(entry.SoLoiConTrung || 0),
        0
    ), 0);
    const latestTbpApproval = (xacNhans || []).find((item) => String(item?.VaiTro || "").toUpperCase() === "TBP");

    const handleApprove = async () => {
        try {
            setApproving(true);
            await approveTrenChuyen(id);
            await loadData({ background: true });
        } catch (error) {
            console.error(error);
            window.alert(error?.response?.data?.message || "Không thể duyệt phiếu.");
        } finally {
            setApproving(false);
        }
    };

    const handleComplete = async (ketLuan) => {
        try {
            setCompleting(true);
            await completeTrenChuyen(id, ketLuan);
            setCompleteOpen(false);
            await loadData({ background: true });
        } catch (error) {
            window.alert(error?.response?.data?.message || "Không thể hoàn tất phiếu.");
        } finally {
            setCompleting(false);
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
                            <Button startIcon={<ArrowBackIcon />} onClick={returnToList} color="inherit">
                                Danh sách phiếu kiểm
                            </Button>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {canApprove ? (
                                    <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={<CheckCircleOutlineOutlinedIcon />}
                                        onClick={handleApprove}
                                        disabled={approving}
                                    >
                                        Duyệt phiếu
                                    </Button>
                                ) : null}
                                {canEdit && (
                                    <>
                                        <Button
                                            variant="outlined"
                                            startIcon={<AddIcon />}
                                            onClick={() => {
                                                setEditingHour(undefined);
                                                setSlotEditorOpen(true);
                                            }}
                                        >
                                            Thêm khung giờ
                                        </Button>
                                        <Button variant="contained" color="success" onClick={() => setCompleteOpen(true)}>
                                            Hoàn tất phiếu
                                        </Button>
                                    </>
                                )}
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
                    <Stack spacing={2}>
                        <Card sx={{ borderRadius: 3, border: "1px solid #e2e8f0", boxShadow: "0 14px 40px rgba(15, 23, 42, 0.06)" }}>
                            <CardContent>
                                <Stack spacing={2}>
                                    <Stack direction={{ xs: "column", xl: "row" }} justifyContent="space-between" spacing={2}>
                                        <Box sx={{ maxWidth: 860 }}>
                                            <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
                                                <Typography variant="h5" fontWeight={800} color="#0f172a">
                                                    {phieu?.SoPhieu || "---"}
                                                </Typography>
                                                <Chip size="small" color={status.color} label={status.label} />
                                                {phieu?.BienBanId ? (
                                                    <Chip size="small" color="warning" variant="outlined" label={`Biên bản #${phieu.BienBanId}`} />
                                                ) : null}
                                            </Stack>
                                            <Typography sx={{ mt: 1, color: "#0f172a", fontSize: { xs: 21, md: 25 }, fontWeight: 800, lineHeight: 1.2 }}>
                                                {productName}
                                            </Typography>
                                            <Typography sx={{ mt: 0.5, color: "text.secondary", fontSize: 13 }}>
                                                Item code: {itemCode}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ minWidth: { xs: "100%", xl: 340 } }}>
                                            <Alert
                                                icon={<Inventory2OutlinedIcon fontSize="inherit" />}
                                                severity={phieu?.KetLuan === "KHONG_DAT" ? "error" : "info"}
                                                sx={{
                                                    borderRadius: 2.5,
                                                    alignItems: "flex-start",
                                                    "& .MuiAlert-message": { width: "100%" }
                                                }}
                                            >
                                                <Typography fontWeight={700} sx={{ mb: 0.5 }}>
                                                    Tình trạng phiếu
                                                </Typography>
                                                <Typography variant="body2">
                                                    {phieu?.KetLuan === "KHONG_DAT"
                                                        ? "Phiếu có lỗi ghi nhận. Kiểm tra lại biên bản KPH và các khung giờ phát sinh."
                                                        : "Phiếu đang theo dõi lỗi theo khung giờ và công đoạn trên chuyền."}
                                                </Typography>
                                            </Alert>
                                        </Box>
                                    </Stack>

                                    <Divider />

                                    <Grid container spacing={2.5}>
                                        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                                            <InfoLine label="Đơn vị" value={donVi} />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                                            <InfoLine label="Chuyền / Bộ phận" value={chuyen} />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6, lg: 2 }}>
                                            <InfoLine label="Ngày kế hoạch" value={ngayKeHoach} />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6, lg: 2 }}>
                                            <InfoLine label="Kế hoạch" value={soLuongKeHoach} />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                                            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>THỰC TẾ / HIỆU LỰC / CHÊNH</Typography>
                                            {currentUser?.permissions?.includes("THUC_HIEN_KIEM") && !["HOAN_TAT", "CHO_TBP_DUYET"].includes(phieu?.TrangThai) ? (
                                                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                                    <TextField size="small" type="number" value={actualQuantity} placeholder="Chưa nhập" inputProps={{ min: 0, step: 1 }} onChange={(event) => setActualQuantity(event.target.value.replace(/\D/g, ""))} />
                                                    <Button size="small" variant="outlined" disabled={savingActual} onClick={saveActualQuantity}>Lưu</Button>
                                                </Stack>
                                            ) : (
                                                <Typography fontWeight={600}>{phieu?.SoLuongThucTe ?? "Chưa nhập"} / {phieu?.SoLuongHieuLuc ?? phieu?.SoLuong ?? 0} / {phieu?.ChenhLechSoLuong ?? "—"}</Typography>
                                            )}
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6, lg: 2 }}>
                                            <InfoLine label="NS dự kiến / Đã SX" value={`${nangSuatDuKien} / ${daSanXuat}`} />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>THÔNG TIN NGUỒN CHO BIỂU MẪU</Typography>
                                            <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 0.75 }}>
                                                <TextField size="small" fullWidth label="Mã đơn hàng" value={sourceFields.maDonHang} disabled={!canEdit || Boolean(getFieldValue(dynamicFields, "TrenChuyen_MaDonHang"))} onChange={(event) => setSourceFields((current) => ({ ...current, maDonHang: event.target.value }))} />
                                                <TextField size="small" fullWidth label="Quy trình sản xuất" value={sourceFields.tenQuyTrinhSanXuat} disabled={!canEdit || Boolean(getFieldValue(dynamicFields, "TrenChuyen_TenQuyTrinhSanXuat"))} onChange={(event) => setSourceFields((current) => ({ ...current, tenQuyTrinhSanXuat: event.target.value }))} />
                                                <TextField size="small" fullWidth label="LOT" value={sourceFields.lot} disabled={!canEdit} onChange={(event) => setSourceFields((current) => ({ ...current, lot: event.target.value }))} />
                                                <TextField size="small" fullWidth label="Lệnh xuất vật tư" value={sourceFields.lenhXuatVatTu} disabled={!canEdit} onChange={(event) => setSourceFields((current) => ({ ...current, lenhXuatVatTu: event.target.value }))} />
                                                {canEdit ? (
                                                    <Button variant="outlined" disabled={savingSourceFields} onClick={saveSourceFields}>Cập nhật</Button>
                                                ) : null}
                                            </Stack>
                                        </Grid>
                                    </Grid>

                                    {latestTbpApproval ? (
                                        <Alert severity="success" variant="outlined" sx={{ borderRadius: 2.5 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                TBP đã xác nhận: {latestTbpApproval.TenNguoiXacNhan || "Không rõ người xác nhận"}
                                            </Typography>
                                            {latestTbpApproval.ThoiGian ? (
                                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                    {new Date(latestTbpApproval.ThoiGian).toLocaleString("vi-VN")}
                                                </Typography>
                                            ) : null}
                                        </Alert>
                                    ) : null}
                                </Stack>
                            </CardContent>
                        </Card>

                        <Card sx={{ borderRadius: 3, border: "1px solid #e2e8f0", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.04)" }}>
                            <CardContent>
                                <Stack spacing={2.5}>
                                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
                                        <Box>
                                            <Typography variant="h6" fontWeight={800} color="#0f172a">
                                                Tổng hợp theo phiếu
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Gói lại số liệu chính để dễ quét trước khi xem từng khung giờ.
                                            </Typography>
                                        </Box>
                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                            <Chip size="small" label={`Nhẹ: ${severitySummary.minor}`} color="info" variant="outlined" />
                                            <Chip size="small" label={`Nặng: ${severitySummary.major}`} color="warning" variant="outlined" />
                                            <Chip size="small" label={`Nghiêm trọng: ${severitySummary.critical}`} color="error" variant="outlined" />
                                        </Stack>
                                    </Stack>

                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                                            <StatCard icon={<ScheduleOutlinedIcon fontSize="small" />} label="Khung giờ" value={summary?.TotalSlots || 0} accent="#2563eb" />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                                            <StatCard icon={<StairsOutlinedIcon fontSize="small" />} label="Công đoạn" value={summary?.TotalEntries || 0} accent="#0f766e" />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                                            <StatCard icon={<ReportProblemOutlinedIcon fontSize="small" />} label="Dòng lỗi" value={summary?.TotalDefectRows || 0} accent="#d97706" />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                                            <StatCard icon={<ErrorOutlineOutlinedIcon fontSize="small" />} label="Tổng số lỗi" value={Number(summary?.TotalDefectQuantity || 0) + specialDefectTotal} accent="#dc2626" />
                                        </Grid>
                                    </Grid>
                                </Stack>
                            </CardContent>
                        </Card>

                        <Card sx={{ borderRadius: 3, border: "1px solid #e2e8f0", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.04)" }}>
                            <CardContent>
                                <Stack spacing={2.5}>
                                    <Box>
                                        <Typography variant="h6" fontWeight={800} color="#0f172a">
                                            Ghi nhận theo khung giờ
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Mỗi khung giờ gom các công đoạn được ghi nhận và các lỗi phát sinh tương ứng.
                                        </Typography>
                                    </Box>

                                    {slots.length === 0 ? (
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 4,
                                                borderRadius: 2.5,
                                                borderStyle: "dashed",
                                                borderColor: "#cbd5e1",
                                                bgcolor: "#f8fafc",
                                                textAlign: "center"
                                            }}
                                        >
                                            <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 32, color: "#94a3b8", mb: 1 }} />
                                            <Typography fontWeight={700} color="#334155">
                                                Chưa có dữ liệu khung giờ
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Phiếu này chưa ghi nhận công đoạn hoặc lỗi theo giờ.
                                            </Typography>
                                        </Paper>
                                    ) : slots.map((slot) => (
                                        <Paper
                                            key={slot.Id}
                                            variant="outlined"
                                            sx={{
                                                p: 2.5,
                                                borderRadius: 2.5,
                                                borderColor: "#dbe4f0",
                                                bgcolor: "#fff"
                                            }}
                                        >
                                            <Stack spacing={2}>
                                                <Stack
                                                    direction={{ xs: "column", lg: "row" }}
                                                    justifyContent="space-between"
                                                    alignItems={{ xs: "flex-start", lg: "center" }}
                                                    spacing={1.5}
                                                >
                                                    <Stack spacing={0.4}>
                                                        <Typography variant="h6" fontWeight={800} color="#0f172a">
                                                            Khung giờ {slot.GioKiem}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {(slot.Entries || []).length} công đoạn được ghi nhận
                                                        </Typography>
                                                    </Stack>
                                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                        {canEdit && (
                                                            <Button
                                                                size="small"
                                                                startIcon={<EditOutlinedIcon />}
                                                                variant="outlined"
                                                                onClick={() => {
                                                                    setEditingHour(slot.GioKiem);
                                                                    setSlotEditorOpen(true);
                                                                }}
                                                            >
                                                                Nhập kết quả
                                                            </Button>
                                                        )}
                                                        <Chip size="small" color="default" label={`${slot.Entries?.length || 0} công đoạn`} />
                                                        <Chip
                                                            size="small"
                                                            color="info"
                                                            variant="outlined"
                                                            label={`Nhẹ: ${
                                                                (slot.Entries || []).reduce((acc, entry) => acc + (entry.Defects || []).reduce((sum, defect) => {
                                                                    const type = String(defect.DefectType || "").toUpperCase();
                                                                    return sum + (type.includes("MINOR") ? Number(defect.SoLuong || 0) : 0);
                                                                }, 0), 0)
                                                            }`}
                                                        />
                                                        <Chip
                                                            size="small"
                                                            color="warning"
                                                            variant="outlined"
                                                            label={`Nặng: ${
                                                                (slot.Entries || []).reduce((acc, entry) => acc + (entry.Defects || []).reduce((sum, defect) => {
                                                                    const type = String(defect.DefectType || "").toUpperCase();
                                                                    return sum + (!type.includes("MINOR") && !type.includes("CRITICAL") ? Number(defect.SoLuong || 0) : 0);
                                                                }, 0), 0)
                                                            }`}
                                                        />
                                                        <Chip
                                                            size="small"
                                                            color="error"
                                                            variant="outlined"
                                                            label={`Nghiêm trọng: ${
                                                                (slot.Entries || []).reduce((acc, entry) => acc + (entry.Defects || []).reduce((sum, defect) => {
                                                                    const type = String(defect.DefectType || "").toUpperCase();
                                                                    return sum + (type.includes("CRITICAL") ? Number(defect.SoLuong || 0) : 0);
                                                                }, 0), 0)
                                                            }`}
                                                        />
                                                    </Stack>
                                                </Stack>

                                                <Stack spacing={1.5}>
                                                    {(slot.Entries || []).length === 0 ? (
                                                        <Typography color="text.secondary">Khung giờ này chưa có lỗi.</Typography>
                                                    ) : (slot.Entries || []).map((entry) => (
                                                        <Paper
                                                            key={entry.Id}
                                                            variant="outlined"
                                                            sx={{
                                                                p: 2,
                                                                borderRadius: 2,
                                                                borderColor: "#e2e8f0",
                                                                bgcolor: "#fcfdff"
                                                            }}
                                                        >
                                                            <Stack spacing={1.5}>
                                                                <Stack
                                                                    direction={{ xs: "column", md: "row" }}
                                                                    justifyContent="space-between"
                                                                    spacing={1}
                                                                >
                                                                    <Box>
                                                                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                                                            Công đoạn {entry.CongDoan}
                                                                        </Typography>
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            Công nhân: {entry.TenCongNhanGayLoi || "—"}
                                                                        </Typography>
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            Người ghi nhận: {entry.TenNguoiGhiNhan || "—"}
                                                                        </Typography>
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            Số lượng kiểm: {entry.SoLuongKiem ?? "—"} • Bụi bẩn: {entry.SoLoiBuiBan || 0} • Côn trùng: {entry.SoLoiConTrung || 0}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Chip
                                                                        size="small"
                                                                        icon={<ReportProblemOutlinedIcon />}
                                                                        label={`${(entry.Defects || []).reduce((sum, defect) => sum + Number(defect.SoLuong || 0), Number(entry.SoLoiBuiBan || 0) + Number(entry.SoLoiConTrung || 0))} lỗi`}
                                                                        color="default"
                                                                        sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
                                                                    />
                                                                </Stack>

                                                                <Stack spacing={1}>
                                                                    {(entry.Defects || []).map((defect) => (
                                                                        <Box
                                                                            key={defect.Id || `${entry.Id}-${defect.DefectId}`}
                                                                            sx={{
                                                                                border: "1px solid #e5edf7",
                                                                                borderRadius: 2,
                                                                                p: 1.5,
                                                                                bgcolor: "#fff"
                                                                            }}
                                                                        >
                                                                            <Stack
                                                                                direction={{ xs: "column", lg: "row" }}
                                                                                justifyContent="space-between"
                                                                                spacing={1}
                                                                            >
                                                                                <Box sx={{ minWidth: 0 }}>
                                                                                    <Typography variant="body2" fontWeight={800} color="#0f172a">
                                                                                        {defect.MaLoi || "---"} - {defect.TenLoi || "---"}
                                                                                    </Typography>
                                                                                    {defect.MoTa ? (
                                                                                        <Typography
                                                                                            variant="body2"
                                                                                            color="text.secondary"
                                                                                            sx={{
                                                                                                mt: 0.4,
                                                                                                display: "-webkit-box",
                                                                                                WebkitLineClamp: 2,
                                                                                                WebkitBoxOrient: "vertical",
                                                                                                overflow: "hidden"
                                                                                            }}
                                                                                        >
                                                                                            {defect.MoTa}
                                                                                        </Typography>
                                                                                    ) : null}
                                                                                </Box>
                                                                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
                                                                                    <Chip size="small" label={`SL: ${defect.SoLuong || 0}`} color="primary" variant="outlined" />
                                                                                    <Chip
                                                                                        size="small"
                                                                                        label={`Sau sửa: Đạt ${defect.SoLuongDatSauSua ?? "—"} / Không đạt ${defect.SoLuongKhongDatSauSua ?? "—"}`}
                                                                                        color="success"
                                                                                        variant="outlined"
                                                                                    />
                                                                                    <Chip
                                                                                        size="small"
                                                                                        label={defect.DefectType || "MAJOR"}
                                                                                        color={
                                                                                            String(defect.DefectType || "").toUpperCase().includes("CRITICAL")
                                                                                                ? "error"
                                                                                                : String(defect.DefectType || "").toUpperCase().includes("MINOR")
                                                                                                    ? "info"
                                                                                                    : "warning"
                                                                                        }
                                                                                        variant="outlined"
                                                                                    />
                                                                                </Stack>
                                                                            </Stack>
                                                                        </Box>
                                                                    ))}
                                                                </Stack>
                                                            </Stack>
                                                        </Paper>
                                                    ))}
                                                </Stack>
                                            </Stack>
                                        </Paper>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Stack>
                </Container>

                <input
                    ref={productImageInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleProductImageSelected}
                />
                <InspectionPrintCompareDialog
                    open={openPrint}
                    onClose={() => setOpenPrint(false)}
                    title="Xem in phiếu kiểm trên chuyền"
                    onPrintNew={handlePrintNew}
                    onPrintOld={handlePrintOld}
                    newContent={(
                        <UnifiedInspectionPrintTemplate
                            ref={newPrintRef}
                            kind="tren-chuyen"
                            phieu={phieu}
                            slots={slots}
                            dynamicFields={dynamicFields}
                            xacNhans={xacNhans}
                        />
                    )}
                    oldContent={(
                        <TrenChuyenPrintTemplate
                            ref={oldPrintRef}
                            phieu={phieu}
                            dynamicFields={dynamicFields}
                            slots={slots}
                            summary={summary}
                            xacNhans={xacNhans}
                            onRequestProductImageUpload={handleTriggerProductImageUpload}
                        />
                    )}
                />
                <Dialog open={completeOpen} onClose={completing ? undefined : () => setCompleteOpen(false)} fullWidth maxWidth="xs">
                    <DialogTitle>Hoàn tất phiếu trên chuyền</DialogTitle>
                    <DialogContent dividers>
                        <Typography>Chọn kết luận thực tế để chuyển phiếu sang bước duyệt.</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCompleteOpen(false)} disabled={completing}>Hủy</Button>
                        <Button color="error" variant="outlined" disabled={completing} onClick={() => handleComplete("KHONG_DAT")}>Không đạt</Button>
                        <Button color="success" variant="contained" disabled={completing} onClick={() => handleComplete("DAT")}>Đạt</Button>
                    </DialogActions>
                </Dialog>
                <TrenChuyenSlotEditor
                    open={slotEditorOpen}
                    phieuId={id}
                    gioKiem={editingHour}
                    slots={slots}
                    onClose={() => setSlotEditorOpen(false)}
                    onSaved={() => loadData({ background: true })}
                />
            </Box>
        </Fade>
    );
}
