// src/features/PhieuKiem/pages/SxbtDetail.jsx
// Trang chi tiết phiếu kiểm Sản Xuất Bổ Trợ (LoaiKiemId = 4)

import { useEffect, useState, useRef } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import {
    Box, Typography, Card, CardContent, Grid, Chip, Stack,
    CircularProgress, Button, Fade, Paper, Container,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Divider, Alert, LinearProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField
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
import CallSplitIcon from "@mui/icons-material/CallSplit";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

import { SxbtPrintTemplate } from "../components/SxbtPrintTemplate";
import {
    completeSxbt,
    splitCompleteSxbt,
    confirmSxbt,
    confirmKhoSxbt,
    getPhieuKiemDetail
} from "../../../api/phieuKiem.api";
import { getBienBanSxbtDetail } from "../../../api/bienBan.api";
import { hasPermission } from "../../../utils/auth";
import SxbtDraftEditor from "../components/SxbtDraftEditor";
import DeletePhieuKiemButton from "../components/DeletePhieuKiemButton";

// ============================================================
// Helpers
// ============================================================
const STATUS_MAP = {
    CHUA_KIEM: { label: "Chưa kiểm", color: "default" },
    CHO_KHO_XAC_NHAN: { label: "Chờ Kho xác nhận", color: "info" },
    CHO_SXBT_XAC_NHAN: { label: "Chờ SXBT xác nhận", color: "warning" },
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

const isFilledLotRow = (row = {}) =>
    (row.SoLuongNhap !== null && row.SoLuongNhap !== undefined && row.SoLuongNhap !== "") ||
    row.DauTuanGS1 ||
    row.ThuTu ||
    row.LxvtLot ||
    row.SoLotSX;

const getBtpLotRows = (item = {}) => {
    const rows = Array.isArray(item.LotRows) && item.LotRows.length > 0
        ? item.LotRows
        : [{
            BtpItemId: item.Id,
            DauTuanGS1: item.DauTuanGS1,
            ThuTu: item.ThuTu,
            LxvtLot: item.LxvtLot,
            SoLotSX: item.SoLotSX,
            SoLuongNhap: item.SoLuongNhap,
            SoLuongKhoXacNhan: item.SoLuongKhoXacNhan,
            SortOrder: 1
        }].filter(isFilledLotRow);

    return rows.length > 0 ? rows : [{}];
};

const getLotRowKey = (row = {}, fallback) => String(row.Id || fallback);

const formatQuantity = (value) =>
    value !== undefined && value !== null && value !== ""
        ? Number(value).toLocaleString("vi-VN")
        : "—";

const getLotContextText = (item = {}, lotRow = {}) => {
    const parts = [];
    if (item.KeHoachNhapId) parts.push(`KH nhập #${item.KeHoachNhapId}`);
    if (item.SourceID_KeHoachSanXuat) parts.push(`KHSX #${item.SourceID_KeHoachSanXuat}`);
    if (lotRow.SoLotSX) parts.push(`Lot SX: ${lotRow.SoLotSX}`);
    if (lotRow.SoLuongNhap !== undefined && lotRow.SoLuongNhap !== null && lotRow.SoLuongNhap !== "") {
        parts.push(`SL nhập: ${formatQuantity(lotRow.SoLuongNhap)}`);
    }
    return parts.join(" · ");
};

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
    const location = useLocation();
    const { id } = useParams();
    const navigate = useNavigate();
    const returnToList = () => navigate(location.state?.returnTo || "/phieu-kiem");
    const printRef = useRef();

    const [loading, setLoading] = useState(true);
    const [phieu, setPhieu] = useState(null);
    const [btpItems, setBtpItems] = useState([]);
    const [summary, setSummary] = useState(null);
    const [defects, setDefects] = useState([]);
    const [dynamicFields, setDynamicFields] = useState([]);
    const [capabilities, setCapabilities] = useState({});
    const [confirmSteps, setConfirmSteps] = useState([]);
    const [khoLotQuantities, setKhoLotQuantities] = useState({});
    const [error, setError] = useState(null);
    const [actionNotice, setActionNotice] = useState(null);
    const [loadingAction, setLoadingAction] = useState(false);
    const [openPrint, setOpenPrint] = useState(false);
    const [splitInfo, setSplitInfo] = useState(null);
    const [openSplit, setOpenSplit] = useState(false);
    const [splitQuantities, setSplitQuantities] = useState({});
    const [draftOpen, setDraftOpen] = useState(false);
    const [draftConclusion, setDraftConclusion] = useState("");
    const triggerPrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: phieu ? `SXBT_${phieu.SoPhieu}` : 'PhieuKiemSXBT',
    });

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async ({ background = false } = {}) => {
        try {
            if (!background) setLoading(true);
            setError(null);
            const res = await getPhieuKiemDetail(id);
            const data = res.data;
            const nextBtpItems = data.btpItems || [];
            setPhieu(data.phieu || null);
            setBtpItems(nextBtpItems);
            setKhoLotQuantities(buildKhoQuantityState(nextBtpItems));
            setSummary(data.summary || null);
            setDefects((data.defects || []).filter(d => d.SoLuong > 0));
            setDynamicFields(data.dynamicFields || []);
            setCapabilities(data.capabilities || {});
            setSplitInfo(data.splitInfo || null);

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
            if (!background) setLoading(false);
        }
    };

    const buildKhoQuantityState = (items = []) => {
        const next = {};
        items.forEach((item) => {
            getBtpLotRows(item).forEach((row, rowIndex) => {
                next[getLotRowKey(row, `${item.Id}-${rowIndex}`)] =
                    row.SoLuongKhoXacNhan !== undefined && row.SoLuongKhoXacNhan !== null
                        ? String(row.SoLuongKhoXacNhan)
                        : "";
            });
        });
        return next;
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
                <Button startIcon={<ArrowBackIcon />} onClick={returnToList} sx={{ mt: 2 }}>
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
    const soLuongKeHoach = Number(phieu?.SoLuongKeHoach ?? phieu?.SoLuong ?? 0);
    const hasActualQuantity = phieu?.SoLuongThucTe !== null && phieu?.SoLuongThucTe !== undefined;
    const soLuongHieuLuc = Number(phieu?.SoLuongHieuLuc ?? (hasActualQuantity ? phieu.SoLuongThucTe : soLuongKeHoach));

    const LOAI_MAU_LABEL = {
        LAN_1_2: "Lần 1, 2 (100%)",
        LAN_3: "Lần 3 (5%)",
        LO_TRUOC_KHONG_DAT: "Lô trước KĐ (3%)",
    };

    const isKCS = hasPermission("THUC_HIEN_KIEM");
    const isKhoSXBT = hasPermission("XAC_NHAN_KHO_SXBT");
    const isSxbtApprover = hasPermission("XAC_NHAN_SXBT");
    const isCompleted = ["CHO_SXBT_XAC_NHAN", "CHO_KHO_XAC_NHAN", "CHO_KIEM_NGHIEM", "CHO_XUONG_XAC_NHAN", "HOAN_THANH", "HOAN_TAT"].includes(phieu?.TrangThai);
    const canEditKhoQuantity = phieu?.TrangThai === "CHO_KHO_XAC_NHAN" && isKhoSXBT;
    const defectGroups = btpItems.flatMap((item) =>
        getBtpLotRows(item).map((lotRow, lotIndex) => ({
            key: `${item.Id}-${lotRow.Id || lotIndex}`,
            item,
            lotRow,
            lotIndex,
            defects: defects.filter(d =>
                Number(d.BtpItemId) === Number(item.Id) &&
                Number(d.BtpLotRowId) === Number(lotRow.Id)
            )
        }))
    );
    const unassignedDefects = defects.filter(d =>
        !d.BtpLotRowId ||
        !defectGroups.some(group =>
            Number(d.BtpItemId) === Number(group.item.Id) &&
            Number(d.BtpLotRowId) === Number(group.lotRow.Id)
        )
    );

    const inferredKetLuan = phieu?.KetLuan ||
        (dkThungSanXe === "KHONG_DAT" || dkNgoaiQuan === "KHONG_DAT" || defects.length > 0 ? "KHONG_DAT" : "DAT");
    const splitLotRows = btpItems.flatMap((item) =>
        getBtpLotRows(item).map((lotRow, lotIndex) => ({ item, lotRow, lotIndex }))
    );
    const totalDefectQuantity = defects.reduce((sum, defect) => sum + Number(defect.SoLuong || 0), 0);
    const splitRejectedTotal = splitLotRows.reduce(
        (sum, { lotRow }) => sum + (Number(splitQuantities[String(lotRow.Id)]) || 0),
        0
    );
    const splitCurrentTotal = splitLotRows.reduce(
        (sum, { lotRow }) => sum + (Number(lotRow.SoLuongNhap) || 0),
        0
    );
    const splitPassedTotal = splitCurrentTotal - splitRejectedTotal;
    const splitMovedDefectQuantity = defects
        .filter((defect) => (Number(splitQuantities[String(defect.BtpLotRowId)]) || 0) > 0)
        .reduce((sum, defect) => sum + Number(defect.SoLuong || 0), 0);
    const splitPassedDefectQuantity = totalDefectQuantity - splitMovedDefectQuantity;
    const splitSampleRate = Number(tyLe) > 0 ? Number(tyLe) : 100;
    const splitPassedSamples = Math.ceil(splitPassedTotal * splitSampleRate / 100);
    const splitRejectedSamples = Math.ceil(splitRejectedTotal * splitSampleRate / 100);
    const calculateSplitPassRate = (defectQuantity, sampleQuantity) =>
        sampleQuantity > 0 ? 100 - (defectQuantity / sampleQuantity) * 100 : 0;

    const getSplitValidationError = () => {
        if (splitLotRows.length === 0 || splitLotRows.some(({ lotRow }) => !lotRow.Id)) {
            return "Phiếu chưa có đầy đủ dòng lô để tách.";
        }
        for (const { lotRow } of splitLotRows) {
            const rawValue = splitQuantities[String(lotRow.Id)] ?? "0";
            const value = Number(rawValue);
            if (rawValue === "" || !Number.isInteger(value) || value < 0 || value > Number(lotRow.SoLuongNhap || 0)) {
                return "Số lượng KĐ phải là số nguyên từ 0 đến số lượng hiện tại.";
            }
        }
        if (splitRejectedTotal <= 0) return "Tổng số lượng KĐ phải lớn hơn 0.";
        if (splitPassedTotal <= 0) return "Phiếu gốc phải còn ít nhất một sản phẩm đạt.";
        if (splitMovedDefectQuantity <= 0) return "Phiếu KĐ phải nhận ít nhất một lỗi từ các dòng được tách.";
        return "";
    };

    const handleOpenSplit = () => {
        setSplitQuantities(Object.fromEntries(
            splitLotRows.filter(({ lotRow }) => lotRow.Id).map(({ lotRow }) => [String(lotRow.Id), "0"])
        ));
        setOpenSplit(true);
    };

    const handleSplitComplete = async () => {
        const validationError = getSplitValidationError();
        if (validationError) {
            setActionNotice({ type: "error", message: validationError });
            return;
        }

        try {
            setLoadingAction(true);
            setActionNotice(null);
            const response = await splitCompleteSxbt(id, splitLotRows.map(({ lotRow }) => ({
                lotRowId: lotRow.Id,
                rejectQuantity: Number(splitQuantities[String(lotRow.Id)] || 0)
            })));
            setOpenSplit(false);
            await loadData({ background: true });
            setActionNotice({
                type: "success",
                message: `Đã tạo phiếu KĐ ${response.data?.rejectedPhieu?.soPhieu || ""}.`
            });
        } catch (err) {
            setActionNotice({ type: "error", message: err?.response?.data?.message || "Không thể tách phiếu SXBT." });
        } finally {
            setLoadingAction(false);
        }
    };

    const handleComplete = async () => {
        const completionConclusion = draftConclusion || inferredKetLuan;
        const label = completionConclusion === "DAT" ? "Đạt" : "Không đạt";
        if (!window.confirm(`Xác nhận hoàn tất phiếu SXBT với kết luận: ${label}?`)) return;

        try {
            setLoadingAction(true);
            setActionNotice(null);
            await completeSxbt(id, completionConclusion);
            await loadData({ background: true });
            setActionNotice({ type: "success", message: "Hoàn tất phiếu SXBT thành công. Phiếu đã chuyển sang bước Kho xác nhận số lượng." });
        } catch (err) {
            setActionNotice({
                type: "error",
                message: err?.response?.data?.message || "Không thể hoàn tất phiếu SXBT"
            });
        } finally {
            setLoadingAction(false);
        }
    };

    const handleConfirmKho = async () => {
        const lotRows = btpItems.flatMap((item) =>
            getBtpLotRows(item).map((row, rowIndex) => ({
                lotRowId: row.Id,
                soLuongKhoXacNhan: khoLotQuantities[getLotRowKey(row, `${item.Id}-${rowIndex}`)]
            }))
        );

        if (lotRows.length === 0 || lotRows.some((row) => !row.lotRowId || row.soLuongKhoXacNhan === "" || row.soLuongKhoXacNhan === undefined || row.soLuongKhoXacNhan === null)) {
            setActionNotice({ type: "error", message: "Vui lòng nhập số lượng Kho xác nhận cho tất cả dòng lot." });
            return;
        }

        try {
            setLoadingAction(true);
            setActionNotice(null);
            await confirmKhoSxbt(id, lotRows);
            await loadData({ background: true });
            setActionNotice({ type: "success", message: "Kho đã xác nhận số lượng nhập. Phiếu đang chờ SXBT xác nhận." });
        } catch (err) {
            setActionNotice({
                type: "error",
                message: err?.response?.data?.message || "Không thể xác nhận Kho"
            });
        } finally {
            setLoadingAction(false);
        }
    };

    const handleConfirmSxbt = async () => {
        if (!window.confirm("Xác nhận hoàn tất phiếu SXBT sau khi Kho đã xác nhận số lượng?")) return;

        try {
            setLoadingAction(true);
            setActionNotice(null);
            await confirmSxbt(id);
            await loadData({ background: true });
            setActionNotice({ type: "success", message: "SXBT đã xác nhận. Phiếu đã hoàn thành." });
        } catch (err) {
            setActionNotice({
                type: "error",
                message: err?.response?.data?.message || "Không thể xác nhận SXBT"
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
                            <Button startIcon={<ArrowBackIcon />} onClick={returnToList} color="inherit">
                                Danh sách phiếu kiểm
                            </Button>
                            {/* <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="subtitle1" fontWeight={700} color="primary">
                                    {phieu?.SoPhieu}
                                </Typography>
                                <TrangThaiChip value={phieu?.TrangThai} />
                                <KetLuanChip value={phieu?.KetLuan} />
                            </Stack> */}
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: "center", sm: "flex-end" }}>
                                <DeletePhieuKiemButton phieuKiemId={id} soPhieu={phieu?.SoPhieu} onDeleted={returnToList} />
                                {(capabilities.canEdit ?? (isKCS && !isCompleted)) && (
                                    <Button
                                        variant="contained"
                                        startIcon={<EditOutlinedIcon />}
                                        onClick={() => setDraftOpen(true)}
                                    >
                                        Nhập kết quả
                                    </Button>
                                )}
                                {splitInfo && (
                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        size="small"
                                        startIcon={<CallSplitIcon />}
                                        onClick={() => navigate(`/phieu-kiem/sxbt/${
                                            splitInfo.CurrentRole === "PASSED"
                                                ? splitInfo.RejectedPhieuKiemId
                                                : splitInfo.OriginalPhieuKiemId
                                        }`)}
                                    >
                                        {splitInfo.CurrentRole === "PASSED"
                                            ? `Phiếu KĐ: ${splitInfo.RejectedSoPhieu}`
                                            : `Phiếu gốc: ${splitInfo.OriginalSoPhieu}`}
                                    </Button>
                                )}
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
                    <Card sx={{ mb: 2, borderRadius: 2, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                        <CardContent sx={{ p: 2 }}>
                            <SectionHeader icon={<AssignmentIcon sx={{ color: "#fff", fontSize: 20 }} />} title="Thông tin phiếu kiểm" />
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoItem label="Số phiếu">
                                        <Typography fontWeight={700} color="primary">{phieu?.SoPhieu || "—"}</Typography>
                                    </InfoItem>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoItem label="Nguồn SXBT">
                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                            <Typography fontWeight={600}>
                                                {phieu?.SxbtSourceCount > 1
                                                    ? `${phieu.SxbtSourceCount} kế hoạch nhập`
                                                    : phieu?.SxbtSourceType === "KE_HOACH_NHAP"
                                                    ? `Kế hoạch nhập #${phieu?.KeHoachNhapId || "—"}`
                                                    : (phieu?.So_PhieuNhapBTP || `Phiếu nhập #${phieu?.PhieuNhapBtpId || "—"}`)}
                                            </Typography>
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                label={phieu?.SxbtSourceType === "KE_HOACH_NHAP" ? "Nguồn mới" : "Legacy"}
                                            />
                                        </Stack>
                                    </InfoItem>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoItem label="Mã đơn hàng">
                                        <Typography fontWeight={600}>{phieu?.MaDonHang || "—"}</Typography>
                                    </InfoItem>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoItem label="Mã đơn vị">
                                        <Typography fontWeight={600}>{phieu?.MaDonVi || phieu?.Ma_NhaThau || "—"}</Typography>
                                    </InfoItem>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoItem label={phieu?.SxbtSourceCount > 1 ? "Số kế hoạch" : "Số lượng KH"}>
                                        <Typography fontWeight={600}>
                                            {phieu?.SxbtSourceCount > 1
                                                ? phieu.SxbtSourceCount
                                                : phieu?.SoLuong?.toLocaleString("vi-VN") || "—"}
                                        </Typography>
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
                                    <InfoItem label="Ngày thực tế sản xuất">
                                        <Typography fontWeight={600}>
                                            {phieu?.Ngay_ThucTeSX ? new Date(phieu.Ngay_ThucTeSX).toLocaleDateString("vi-VN") : "—"}
                                        </Typography>
                                    </InfoItem>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoItem label="Bộ phận / Nhà thầu">
                                        <Typography fontWeight={600}>{phieu?.Ten_BoPhan || phieu?.DoiTuong || "—"}</Typography>
                                    </InfoItem>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <InfoItem label="Quy trình">
                                        <Typography fontWeight={600}>{phieu?.Ten_QuyTrinhSanXuat || "—"}</Typography>
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
                        <Card sx={{ mb: 2, borderRadius: 2, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                            <CardContent sx={{ p: 2 }}>
                                <SectionHeader icon={<InventoryIcon sx={{ color: "#fff", fontSize: 20 }} />} title="II. Chi tiết BTP" />
                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: "grey.50" }}>
                                                <TableCell sx={{ fontWeight: 700 }}>ID KH nhập</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>ID KHSX</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Tên sản phẩm</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Số lượng</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>ĐVT</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Dấu tuần/GS1</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>TT</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>LXVT/LOT</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Số Lot SX</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>SL nhập</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Tổng số Kho xác nhận</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {btpItems.flatMap((item) =>
                                                getBtpLotRows(item).map((lotRow, lotIndex) => (
                                                    <TableRow key={`${item.Id}-${lotIndex}`} hover>
                                                        <TableCell>#{item.KeHoachNhapId || "—"}</TableCell>
                                                        <TableCell>#{item.SourceID_KeHoachSanXuat || "—"}</TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>{item.TenSanPham}</TableCell>
                                                        <TableCell align="right">{item.SoLuong?.toLocaleString("vi-VN")}</TableCell>
                                                        <TableCell>{item.DonViTinh}</TableCell>
                                                        <TableCell>{lotRow.DauTuanGS1 || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                                                        <TableCell>{lotRow.ThuTu || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                                                        <TableCell>{lotRow.LxvtLot || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                                                        <TableCell>{lotRow.SoLotSX || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                                                        <TableCell align="right">
                                                            {lotRow.SoLuongNhap !== null && lotRow.SoLuongNhap !== undefined && lotRow.SoLuongNhap !== ""
                                                                ? Number(lotRow.SoLuongNhap).toLocaleString("vi-VN")
                                                                : <Typography variant="caption" color="text.disabled">—</Typography>}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {canEditKhoQuantity ? (
                                                                <TextField
                                                                    size="small"
                                                                    type="number"
                                                                    inputProps={{ min: 0, step: "0.01", style: { textAlign: "right" } }}
                                                                    value={khoLotQuantities[getLotRowKey(lotRow, `${item.Id}-${lotIndex}`)] || ""}
                                                                    onChange={(event) => {
                                                                        const key = getLotRowKey(lotRow, `${item.Id}-${lotIndex}`);
                                                                        setKhoLotQuantities(prev => ({ ...prev, [key]: event.target.value }));
                                                                    }}
                                                                    sx={{ width: 130 }}
                                                                />
                                                            ) : lotRow.SoLuongKhoXacNhan !== null && lotRow.SoLuongKhoXacNhan !== undefined && lotRow.SoLuongKhoXacNhan !== "" ? (
                                                                Number(lotRow.SoLuongKhoXacNhan).toLocaleString("vi-VN")
                                                            ) : (
                                                                <Typography variant="caption" color="text.disabled">—</Typography>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* ---- III. Tỷ lệ kiểm ---- */}
                    {(summary || phieu) && (
                        <Card sx={{ mb: 2, borderRadius: 2, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                            <CardContent sx={{ p: 2 }}>
                                <SectionHeader icon={<BarChartIcon sx={{ color: "#fff", fontSize: 20 }} />} title="III. Tỷ lệ kiểm" />
                                <Grid container spacing={2} sx={{ mb: 2 }}>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <InfoItem label="Số lượng kế hoạch">
                                            <Typography fontWeight={700}>{soLuongKeHoach.toLocaleString("vi-VN")}</Typography>
                                        </InfoItem>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <InfoItem label="Số lượng thực tế">
                                            <Typography fontWeight={700}>
                                                {hasActualQuantity ? Number(phieu.SoLuongThucTe).toLocaleString("vi-VN") : "—"}
                                            </Typography>
                                        </InfoItem>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <InfoItem label="Số lượng dùng tính tỷ lệ">
                                            <Typography fontWeight={700}>{soLuongHieuLuc.toLocaleString("vi-VN")}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {hasActualQuantity ? "Theo số lượng thực tế" : "Theo số lượng kế hoạch"}
                                            </Typography>
                                        </InfoItem>
                                    </Grid>
                                </Grid>
                                <Divider sx={{ mb: 2 }} />
                                <Grid container spacing={2} sx={{ mb: 2 }}>
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
                                        <InfoItem label={`Tỷ lệ mẫu / ${hasActualQuantity ? "số lượng thực tế" : "số lượng kế hoạch"}`}>
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
                    <Card sx={{ mb: 2, borderRadius: 2, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                        <CardContent sx={{ p: 2 }}>
                            <SectionHeader icon={<BugReportIcon sx={{ color: "#fff", fontSize: 20 }} />} title="IV. Ghi nhận lỗi" />

                            {defects.length === 0 ? (
                                <Box sx={{ textAlign: "center", py: 4 }}>
                                    <CheckCircleOutlineIcon sx={{ fontSize: 48, color: "success.light", mb: 1 }} />
                                    <Typography color="text.secondary">Không ghi nhận lỗi nào</Typography>
                                </Box>
                            ) : (
                                <Stack spacing={2}>
                                    {defectGroups.filter(group => group.defects.length > 0).map((group) => (
                                        <Box key={group.key}>
                                            <Typography fontWeight={800}>{group.item.TenSanPham || "BTP"}</Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                {getLotContextText(group.item, group.lotRow) || `Dòng lot ${group.lotIndex + 1}`}
                                            </Typography>
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
                                                        {group.defects.map((d, idx) => {
                                                            const color = DEFECT_TYPE_COLOR[d.DefectType] || "#64748b";
                                                            return (
                                                                <TableRow key={`${d.DefectId}-${d.BtpLotRowId}-${idx}`} hover>
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
                                        </Box>
                                    ))}

                                    {unassignedDefects.length > 0 && (
                                        <Box>
                                            <Typography fontWeight={800}>Lỗi chưa gắn dòng BTP</Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                Dữ liệu cũ hoặc lỗi chưa có thông tin lot
                                            </Typography>
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
                                                        {unassignedDefects.map((d, idx) => {
                                                            const color = DEFECT_TYPE_COLOR[d.DefectType] || "#64748b";
                                                            return (
                                                                <TableRow key={`${d.DefectId}-unassigned-${idx}`} hover>
                                                                    <TableCell sx={{ fontWeight: 600 }}>{d.TenLoi}</TableCell>
                                                                    <TableCell>
                                                                        <Chip label={d.DefectType} size="small" sx={{ bgcolor: color, color: "#fff", fontWeight: 700, fontSize: 11 }} />
                                                                    </TableCell>
                                                                    <TableCell align="center">
                                                                        <Chip label={d.SoLuong} color={d.SoLuong > 0 ? "error" : "default"} size="small" sx={{ fontWeight: 700, minWidth: 40 }} />
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
                                        </Box>
                                    )}
                                </Stack>
                            )}
                        </CardContent>
                    </Card>

                    {!isCompleted && isKCS && (
                        <Paper sx={{ position: "sticky", bottom: 0, zIndex: 9, mt: 2, mb: 3, p: 2, borderTop: "1px solid #e0e0e0" }}>
                            <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    startIcon={<CallSplitIcon />}
                                    onClick={handleOpenSplit}
                                    disabled={loadingAction}
                                >
                                    Tách & hoàn tất
                                </Button>
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

                    {phieu?.TrangThai === "CHO_KHO_XAC_NHAN" && isKhoSXBT && (
                        <Paper sx={{ position: "sticky", bottom: 0, zIndex: 9, mt: 2, mb: 3, p: 2, borderTop: "1px solid #e0e0e0" }}>
                            <Stack direction="row" justifyContent="flex-end">
                                <Button
                                    variant="contained"
                                    color="success"
                                    onClick={handleConfirmKho}
                                    disabled={loadingAction}
                                >
                                    {loadingAction ? "Đang xử lý..." : "Kho xác nhận số lượng"}
                                </Button>
                            </Stack>
                        </Paper>
                    )}

                    {phieu?.TrangThai === "CHO_SXBT_XAC_NHAN" && isSxbtApprover && (
                        <Paper sx={{ position: "sticky", bottom: 0, zIndex: 9, mt: 2, mb: 3, p: 2, borderTop: "1px solid #e0e0e0" }}>
                            <Stack direction="row" justifyContent="flex-end">
                                <Button
                                    variant="contained"
                                    color="success"
                                    onClick={handleConfirmSxbt}
                                    disabled={loadingAction}
                                >
                                    {loadingAction ? "Đang xử lý..." : "SXBT xác nhận hoàn tất"}
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
                            splitInfo={splitInfo}
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

                <Dialog open={openSplit} onClose={() => !loadingAction && setOpenSplit(false)} maxWidth="lg" fullWidth>
                    <DialogTitle>Tách & hoàn tất phiếu SXBT</DialogTitle>
                    <DialogContent dividers>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Nhập số lượng không đạt theo từng dòng lô. Dòng nhập 0 và lỗi của dòng đó vẫn ở phiếu đạt.
                        </Alert>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Sản phẩm / dòng lô</TableCell>
                                        <TableCell align="right">Hiện tại</TableCell>
                                        <TableCell align="center">Số lỗi</TableCell>
                                        <TableCell align="center" sx={{ width: 150 }}>Số lượng KĐ</TableCell>
                                        <TableCell align="right">Còn đạt</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {splitLotRows.map(({ item, lotRow, lotIndex }) => {
                                        const currentQuantity = Number(lotRow.SoLuongNhap || 0);
                                        const rejectedQuantity = Number(splitQuantities[String(lotRow.Id)] || 0);
                                        const rowDefectQuantity = defects
                                            .filter((defect) => Number(defect.BtpLotRowId) === Number(lotRow.Id))
                                            .reduce((sum, defect) => sum + Number(defect.SoLuong || 0), 0);
                                        return (
                                            <TableRow key={`split-${lotRow.Id || lotIndex}`}>
                                                <TableCell>
                                                    <Typography fontWeight={700}>{item.TenSanPham || "BTP"}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {getLotContextText(item, lotRow) || `Dòng lô ${lotIndex + 1}`}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">{formatQuantity(currentQuantity)}</TableCell>
                                                <TableCell align="center">{rowDefectQuantity}</TableCell>
                                                <TableCell align="center">
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        value={splitQuantities[String(lotRow.Id)] ?? "0"}
                                                        onChange={(event) => setSplitQuantities((current) => ({
                                                            ...current,
                                                            [String(lotRow.Id)]: event.target.value
                                                        }))}
                                                        inputProps={{ min: 0, max: currentQuantity, step: 1, style: { textAlign: "right" } }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">{formatQuantity(currentQuantity - rejectedQuantity)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Alert severity="success">
                                    Phiếu đạt: {formatQuantity(splitPassedTotal)} cái · {splitPassedSamples} mẫu · Đạt {calculateSplitPassRate(splitPassedDefectQuantity, splitPassedSamples).toFixed(1)}%
                                </Alert>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Alert severity="error">
                                    Phiếu KĐ: {formatQuantity(splitRejectedTotal)} cái · {splitRejectedSamples} mẫu · Đạt {calculateSplitPassRate(splitMovedDefectQuantity, splitRejectedSamples).toFixed(1)}% · {splitMovedDefectQuantity} lỗi
                                </Alert>
                            </Grid>
                        </Grid>
                        {getSplitValidationError() && <Alert severity="warning" sx={{ mt: 2 }}>{getSplitValidationError()}</Alert>}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenSplit(false)} disabled={loadingAction}>Hủy</Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={handleSplitComplete}
                            disabled={loadingAction || !!getSplitValidationError()}
                        >
                            {loadingAction ? "Đang tách..." : "Tách & hoàn tất"}
                        </Button>
                    </DialogActions>
                </Dialog>
                <SxbtDraftEditor
                    open={draftOpen}
                    phieu={phieu}
                    sourceBtpItems={btpItems}
                    sourceSummary={summary}
                    sourceDefects={defects}
                    dynamicFields={dynamicFields}
                    onClose={() => setDraftOpen(false)}
                    onSaved={async ({ conclusion }) => {
                        setDraftConclusion(conclusion);
                        await loadData({ background: true });
                        setActionNotice({ type: "success", message: "Đã lưu nháp phiếu SXBT." });
                    }}
                />
            </Box>
        </Fade>
    );
}
