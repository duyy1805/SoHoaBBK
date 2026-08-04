import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PrintIcon from "@mui/icons-material/Print";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import RuleFolderOutlinedIcon from "@mui/icons-material/RuleFolderOutlined";
import {
    addBienBanSxbtXuLyRow,
    confirmBienBanSxbtMucDo,
    confirmBienBanSxbtStep,
    getBienBanSxbtDetail,
    getBoPhan,
    saveBienBanCustomFields,
    saveBienBanSxbtDraft
} from "../../api/bienBan.api";
import { getAssetUrl } from "../../api/lookup.api";
import { getCurrentUser } from "../../utils/auth";
import { useToast } from "../../components/common/ToastContext";
import { useReactToPrint } from "react-to-print";
import { BienBanSxbtPrintTemplate } from "./components/BienBanSxbtPrintTemplate";
import BienBanAttachments from "./components/BienBanAttachments";

const LEVEL_OPTIONS = ["B", "C"];

const statusLabel = (status) => {
    if (status === "BB_SXBT_HOAN_TAT") return "SXBT hoàn tất";
    if (status === "BB_SXBT_CHO_XAC_NHAN") return "Đang xử lý";
    if (status === "BB_SXBT_MOI" || status === "BB_SXBT_TP_B8_DRAFT") return "Chờ xác nhận mức";
    return status || "---";
};

const cardShellSx = {
    borderRadius: 2,
    border: "1px solid #e2e8f0",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)"
};

const mutedLabelSx = {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0,
    textTransform: "uppercase",
    color: "text.secondary"
};

const sectionTitleSx = {
    fontSize: 17,
    fontWeight: 700,
    color: "#0f172a"
};

const flowPanelSx = {
    fontFamily: (theme) => theme.typography.fontFamily,
    "& .MuiTypography-root": {
        fontFamily: "inherit"
    },
    "& .MuiChip-label": {
        fontFamily: "inherit"
    }
};

const tableSx = {
    minWidth: 720,
    "& .MuiTableCell-head": {
        bgcolor: "#f8fafc",
        color: "#64748b",
        fontSize: 12,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0,
        borderBottomColor: "#e2e8f0"
    },
    "& .MuiTableCell-body": {
        color: "#1e293b",
        borderBottomColor: "#eef2f7",
        verticalAlign: "top"
    },
    "& .MuiTableRow-root:last-child .MuiTableCell-body": {
        borderBottom: 0
    }
};

const formatDate = (value) => {
    if (!value) return "---";
    return new Date(value).toLocaleDateString("vi-VN");
};

const parseImageUrls = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value !== "string") return [];

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed].filter(Boolean);
    } catch {
        return [value].filter(Boolean);
    }
};

const getDefectImages = (defect) => {
    const urls = [
        ...parseImageUrls(defect?.ImageUrls),
        ...parseImageUrls(defect?.ImageUrl)
    ];
    return [...new Set(urls)];
};

export default function BienBanSxbtDetail() {
    const { id: bienBanId } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const currentUser = getCurrentUser();
    const printRef = useRef();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [info, setInfo] = useState(null);
    const [defects, setDefects] = useState([]);
    const [confirmSteps, setConfirmSteps] = useState([]);
    const [xuLyRows, setXuLyRows] = useState([]);
    const [hanhDongRows, setHanhDongRows] = useState([]);
    const [dynamicFields, setDynamicFields] = useState([]);
    const [moTaChung, setMoTaChung] = useState("");
    const [mucDo, setMucDo] = useState("B");
    const [openXuLy, setOpenXuLy] = useState(false);
    const [openHanhDong, setOpenHanhDong] = useState(false);
    const [openPrint, setOpenPrint] = useState(false);
    const [previewImage, setPreviewImage] = useState("");

    useEffect(() => {
        loadData();
    }, [bienBanId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getBienBanSxbtDetail(bienBanId);
            const data = res.data || {};
            const infoData = data.info || {};
            setInfo(infoData);
            setDefects(data.defects || []);
            setConfirmSteps(data.confirmSteps || []);
            setXuLyRows(data.xuLyRows || []);
            setHanhDongRows(data.hanhDong || []);
            setDynamicFields(data.dynamicFields || []);
            setMoTaChung(infoData.MoTaChung || "");
            setMucDo(infoData.MucDoKhongPhuHop || "B");
        } catch (err) {
            showToast(err?.response?.data?.message || "Không tải được biên bản SXBT", "error");
        } finally {
            setLoading(false);
        }
    };

    const isMucDoConfirmed = info?.MucDoKhongPhuHopConfirmed === true || info?.MucDoKhongPhuHopConfirmed === 1;
    const isCompleted = info?.TrangThai === "BB_SXBT_HOAN_TAT";
    const currentPendingStep = useMemo(
        () => confirmSteps.find((step) => step.TrangThai !== "DA_XAC_NHAN"),
        [confirmSteps]
    );
    const completedSteps = confirmSteps.filter((step) => step.TrangThai === "DA_XAC_NHAN").length;
    const canConfirmCurrentStep = !!currentPendingStep &&
        Number(currentPendingStep.BoPhanId) === Number(currentUser?.boPhanId);
    const canEditBeforeFlow = !isMucDoConfirmed && !isCompleted;
    const canEditCurrentStep = isMucDoConfirmed && !isCompleted && canConfirmCurrentStep;
    const canEditContent = canEditBeforeFlow || canEditCurrentStep;

    const buildDraftPayload = (nextHanhDongRows = hanhDongRows) => ({
        moTaChung,
        mucDoKhongPhuHop: mucDo,
        xuLyRows: xuLyRows.map((row, idx) => ({
            rowCode: row.RowCode || `ROW_${idx + 1}`,
            sortOrder: row.SortOrder || idx + 1,
            chiPhi: row.ChiPhi || null,
            noiDung: row.NoiDung || null,
            nguoiNhapId: row.NguoiNhapId || null,
            boPhanTrachNhiemId: row.BoPhanTrachNhiemId || null,
            thoiHan: row.ThoiHan || null
        })),
        hanhDong: nextHanhDongRows.map((item) => ({
            noiDung: item.NoiDung || null,
            thoiHan: item.ThoiHan || null,
            boPhanId: item.BoPhanId || null,
            nguoiNhapId: item.NguoiNhapId || null
        }))
    });

    const handleConfirmMucDo = async () => {
        if (!moTaChung.trim()) {
            showToast("Vui lòng nhập mô tả chung", "warning");
            return;
        }
        try {
            setSaving(true);
            await saveBienBanSxbtDraft(bienBanId, buildDraftPayload());
            await confirmBienBanSxbtMucDo(bienBanId, mucDo);
            showToast(`Đã xác nhận mức độ ${mucDo}`, "success");
            await loadData();
        } catch (err) {
            showToast(err?.response?.data?.message || "Không thể xác nhận mức độ", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmStep = async () => {
        try {
            setSaving(true);
            await confirmBienBanSxbtStep(bienBanId);
            showToast("Đã xác nhận bước hiện tại", "success");
            await loadData();
        } catch (err) {
            showToast(err?.response?.data?.message || "Không thể xác nhận bước", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleAddHanhDong = async ({ noiDung, thoiHan, boPhan }) => {
        const nextRows = [
            ...hanhDongRows,
            {
                NoiDung: noiDung,
                ThoiHan: thoiHan || null,
                BoPhanId: boPhan.Id,
                MaBoPhan: boPhan.MaBoPhan,
                TenBoPhan: boPhan.TenBoPhan,
                NguoiNhapId: currentUser?.id || currentUser?.userId || null,
                NguoiNhap: currentUser?.fullName || currentUser?.username || ""
            }
        ];
        await saveBienBanSxbtDraft(bienBanId, buildDraftPayload(nextRows));
        await loadData();
    };

    const triggerPrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: info?.SoPhieu ? `BienBanSXBT_${info.SoPhieu}` : "BienBanSXBT"
    });

    const handlePrint = async () => {
        try {
            const inputs = document.querySelectorAll(".custom-field");
            const fieldsData = {};

            inputs.forEach((input) => {
                if (!input.name) return;
                fieldsData[input.name] = input.type === "checkbox" ? input.checked : input.value;
            });

            await saveBienBanCustomFields({
                bienBanId: info?.BienBanId || bienBanId,
                fields: fieldsData
            });

            triggerPrint();
        } catch (err) {
            showToast(err?.response?.data?.message || "Không lưu được thông tin in SXBT", "error");
        }
    };

    if (loading) {
        return (
            <Box sx={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: "100vh", pb: 5, background: "#f4f7fb" }}>
            <Paper
                elevation={0}
                sx={{
                    p: 1.5,
                    mb: 3,
                    borderBottom: "1px solid #e2e8f0",
                    bgcolor: "rgba(255,255,255,0.94)",
                    backdropFilter: "blur(12px)",
                    position: "sticky",
                    top: 0,
                    zIndex: 10
                }}
            >
                <Container maxWidth="xl">
                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
                        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} color="inherit">
                            Danh sách biên bản
                        </Button>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            {info?.PhieuKiemId && (
                                <Button
                                    variant="outlined"
                                    startIcon={<AssignmentTurnedInIcon />}
                                    onClick={() => navigate(`/phieu-kiem/sxbt/${info.PhieuKiemId}`)}
                                >
                                    Xem phiếu kiểm
                                </Button>
                            )}
                            <Button variant="contained" startIcon={<PrintIcon />} onClick={() => setOpenPrint(true)} sx={{ bgcolor: "#172033" }}>
                                Xem in
                            </Button>
                        </Stack>
                    </Stack>
                </Container>
            </Paper>

            <Container maxWidth="xl">
                <Stack spacing={2}>
                    <Card sx={{ ...cardShellSx, overflow: "hidden" }}>
                        <CardContent sx={{ p: { xs: 1.5, md: 2 }, "&:last-child": { pb: { xs: 1.5, md: 2 } } }}>
                            <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={2}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
                                        <Typography sx={{ fontSize: { xs: 21, md: 25 }, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
                                            {info?.SoPhieu || "---"}
                                        </Typography>
                                        <Chip
                                            label={statusLabel(info?.TrangThai)}
                                            color={isCompleted ? "success" : "warning"}
                                            variant={isCompleted ? "filled" : "outlined"}
                                            sx={{ fontWeight: 800, borderRadius: 1.5 }}
                                        />
                                    </Stack>
                                    <Typography sx={{ mt: 0.5, color: "#64748b", fontSize: 13, fontWeight: 600 }}>
                                        {info?.SoBienBan || "Biên bản xử lý sản xuất bổ trợ"}
                                    </Typography>
                                </Box>

                                <Grid container spacing={1.5} sx={{ minWidth: { lg: 760 } }}>
                                    <Grid size={{ xs: 6, md: 3 }}>
                                        <InfoTile icon={<PersonOutlineOutlinedIcon />} label="Người tạo" value={info?.NguoiTao || "---"} />
                                    </Grid>
                                    <Grid size={{ xs: 6, md: 3 }}>
                                        <InfoTile icon={<ApartmentOutlinedIcon />} label="Loại phát sinh" value={info?.LoaiPhatSinh || "SXBT"} />
                                    </Grid>
                                    <Grid size={{ xs: 6, md: 3 }}>
                                        <InfoTile icon={<ApartmentOutlinedIcon />} label="Mã đơn vị SXBT" value={info?.MaDonVi || "---"} />
                                    </Grid>
                                    <Grid size={{ xs: 6, md: 3 }}>
                                        <InfoTile
                                            icon={<RuleFolderOutlinedIcon />}
                                            label="Nguồn SXBT"
                                            value={info?.SxbtSourceCount > 1
                                                ? `${info.SxbtSourceCount} kế hoạch: ${(info.SxbtSources || []).map((source) => `#${source.KeHoachNhapId}/KHSX #${source.ID_KeHoachSanXuat}`).join(", ")}`
                                                : info?.SxbtSourceType === "KE_HOACH_NHAP"
                                                ? `Kế hoạch nhập #${info?.KeHoachNhapId || "---"}`
                                                : (info?.So_PhieuNhapBTP || `Phiếu nhập #${info?.PhieuNhapBtpId || "---"}`)}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 6, md: 3 }}>
                                        <InfoTile icon={<ReportProblemOutlinedIcon />} label="Mức độ" value={`Mức ${mucDo || "---"}`} />
                                    </Grid>
                                    <Grid size={{ xs: 6, md: 3 }}>
                                        <InfoTile icon={<RuleFolderOutlinedIcon />} label="Luồng" value={`${completedSteps}/${confirmSteps.length || 0}`} />
                                    </Grid>
                                </Grid>
                            </Stack>
                        </CardContent>
                    </Card>

                    <BienBanAttachments bienBanId={bienBanId} />

                    <Grid container spacing={2} alignItems="flex-start">
                        <Grid size={{ xs: 12, lg: 8.5 }}>
                            <Stack spacing={2}>
                                <Card sx={cardShellSx}>
                                    <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                                        <Stack direction={{ xs: "column", md: "row" }} spacing={2.5}>
                                            <Box sx={{ flex: 1 }}>
                                                <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                                                    <DescriptionOutlinedIcon sx={{ color: "#2563eb" }} />
                                                    <Typography sx={sectionTitleSx}>Thông tin chung</Typography>
                                                </Stack>
                                                {canEditBeforeFlow ? (
                                                    <TextField
                                                        fullWidth
                                                        multiline
                                                        minRows={4}
                                                        placeholder="Nhập mô tả chung của biên bản SXBT..."
                                                        value={moTaChung}
                                                        onChange={(e) => setMoTaChung(e.target.value)}
                                                        sx={{
                                                            "& .MuiInputBase-root": {
                                                                borderRadius: 2,
                                                                bgcolor: "white"
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <Paper
                                                        elevation={0}
                                                        sx={{
                                                            p: 2,
                                                            minHeight: 126,
                                                            borderRadius: 2,
                                                            bgcolor: "#f8fbff",
                                                            borderLeft: "4px solid #2563eb"
                                                        }}
                                                    >
                                                        <Typography sx={{ color: "#1e293b", fontSize: 16, lineHeight: 1.7, fontWeight: 600 }}>
                                                            {moTaChung || "Chưa có mô tả chung"}
                                                        </Typography>
                                                    </Paper>
                                                )}
                                            </Box>
                                            <Box sx={{ width: { xs: "100%", md: 300 } }}>
                                                <Typography sx={mutedLabelSx}>Mức không phù hợp</Typography>
                                                <Stack direction="row" spacing={1} mt={1} mb={2}>
                                                    {LEVEL_OPTIONS.map((level) => (
                                                        <Box
                                                            key={level}
                                                            onClick={() => {
                                                                if (canEditBeforeFlow) setMucDo(level);
                                                            }}
                                                            sx={{
                                                                minWidth: 96,
                                                                px: 2,
                                                                py: 1.15,
                                                                borderRadius: 1.5,
                                                                textAlign: "center",
                                                                cursor: canEditBeforeFlow ? "pointer" : "default",
                                                                fontWeight: 700,
                                                                bgcolor: mucDo === level ? "#172033" : "#f8fafc",
                                                                color: mucDo === level ? "white" : "#475569",
                                                                border: mucDo === level ? "1px solid #172033" : "1px solid #cbd5e1",
                                                                boxShadow: mucDo === level ? "0 8px 18px rgba(15, 23, 42, 0.16)" : "none",
                                                                opacity: canEditBeforeFlow || mucDo === level ? 1 : 0.72
                                                            }}
                                                        >
                                                            {`Mức ${level}`}
                                                        </Box>
                                                    ))}
                                                </Stack>
                                                {isMucDoConfirmed ? (
                                                    <Chip
                                                        icon={<CheckCircleIcon />}
                                                        label={`Đã xác nhận mức ${mucDo}`}
                                                        sx={{
                                                            bgcolor: "#dcfce7",
                                                            color: "#166534",
                                                            fontWeight: 700,
                                                            borderRadius: 1.5,
                                                            "& .MuiChip-icon": { color: "#16a34a" }
                                                        }}
                                                    />
                                                ) : canEditBeforeFlow && (
                                                    <Button fullWidth variant="contained" color="success" disabled={saving} onClick={handleConfirmMucDo} sx={{ borderRadius: 1.5, fontWeight: 800 }}>
                                                        Xác nhận mức độ
                                                    </Button>
                                                )}
                                            </Box>
                                        </Stack>
                                    </CardContent>
                                </Card>

                                <Card sx={cardShellSx}>
                                    <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                                        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                                            <ReportProblemOutlinedIcon sx={{ color: "#dc2626" }} />
                                            <Typography sx={sectionTitleSx}>Danh sách lỗi</Typography>
                                        </Stack>
                                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, borderColor: "#e2e8f0" }}>
                                            <Table size="small" sx={tableSx}>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell width={70}>STT</TableCell>
                                                        <TableCell width={120}>Ảnh</TableCell>
                                                        <TableCell>Mã lỗi</TableCell>
                                                        <TableCell>Tên lỗi</TableCell>
                                                        <TableCell>Mô tả</TableCell>
                                                        <TableCell align="right">Số lượng</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {defects.length === 0 ? (
                                                        <EmptyTableRow colSpan={6} label="Chưa có dữ liệu lỗi" />
                                                    ) : defects.map((item, index) => {
                                                        const images = getDefectImages(item);
                                                        return (
                                                            <TableRow key={`${item.MaLoi}-${index}`}>
                                                                <TableCell>{index + 1}</TableCell>
                                                                <TableCell>
                                                                    {images.length > 0 ? (
                                                                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                                                            {images.slice(0, 3).map((url, imageIndex) => {
                                                                                const imageUrl = getAssetUrl(url);
                                                                                return (
                                                                                    <Box
                                                                                        key={`${url}-${imageIndex}`}
                                                                                        component="img"
                                                                                        src={imageUrl}
                                                                                        alt={item.TenLoi || item.MaLoi || "Ảnh lỗi"}
                                                                                        onClick={() => setPreviewImage(imageUrl)}
                                                                                        sx={{
                                                                                            width: 52,
                                                                                            height: 52,
                                                                                            objectFit: "cover",
                                                                                            borderRadius: 1.25,
                                                                                            border: "1px solid #cbd5e1",
                                                                                            cursor: "pointer",
                                                                                            bgcolor: "#f8fafc",
                                                                                            boxShadow: "0 4px 10px rgba(15, 23, 42, 0.08)",
                                                                                            "&:hover": { opacity: 0.86 }
                                                                                        }}
                                                                                    />
                                                                                );
                                                                            })}
                                                                        </Stack>
                                                                    ) : (
                                                                        <Typography variant="body2" color="text.secondary">---</Typography>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell sx={{ fontWeight: 800 }}>{item.MaLoi || "---"}</TableCell>
                                                                <TableCell>{item.TenLoi || "---"}</TableCell>
                                                                <TableCell>{item.MoTa || "---"}</TableCell>
                                                                <TableCell align="right">{item.SoLuong || 0}</TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </CardContent>
                                </Card>

                                {isMucDoConfirmed && (
                                    <>
                                        <SxbtXuLySection rows={xuLyRows} canEdit={canEditContent} onAdd={() => setOpenXuLy(true)} />
                                        <SxbtHanhDongSection rows={hanhDongRows} canEdit={canEditContent} onAdd={() => setOpenHanhDong(true)} />
                                    </>
                                )}
                            </Stack>
                        </Grid>

                        <Grid size={{ xs: 12, lg: 3.5 }}>
                            <Stack spacing={2} sx={{ position: { lg: "sticky" }, top: { lg: 76 } }}>
                                <Card sx={cardShellSx}>
                                    <CardContent sx={{ p: { xs: 2, md: 3 }, ...flowPanelSx }}>
                                        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                                            <RuleFolderOutlinedIcon sx={{ color: "#2563eb" }} />
                                            <Typography sx={sectionTitleSx}>Luồng hiện tại</Typography>
                                        </Stack>

                                        {currentPendingStep && !isCompleted && (
                                            <Paper variant="outlined" sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: "#eff6ff", borderColor: "#bfdbfe" }}>
                                                <Typography
                                                    variant="caption"
                                                    sx={{ color: "#1d4ed8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0 }}
                                                >
                                                    Đang chờ
                                                </Typography>
                                                <Typography variant="subtitle1" sx={{ mt: 0.5, fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}>
                                                    {currentPendingStep.TenBoPhan || currentPendingStep.MaBoPhan || "---"}
                                                </Typography>
                                            </Paper>
                                        )}

                                        {confirmSteps.length === 0 ? (
                                            <Typography color="text.secondary">Chưa có chuỗi xác nhận</Typography>
                                        ) : confirmSteps.map((step, index) => {
                                            const done = step.TrangThai === "DA_XAC_NHAN";
                                            const active = currentPendingStep?.Id === step.Id && !isCompleted;
                                            return (
                                                <Stack key={step.Id || index} direction="row" spacing={1.5} sx={{ pb: index === confirmSteps.length - 1 ? 0 : 2 }}>
                                                    <Stack alignItems="center" sx={{ minWidth: 30 }}>
                                                        <Box
                                                            sx={{
                                                                width: 28,
                                                                height: 28,
                                                                borderRadius: "50%",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                bgcolor: done ? "#16a34a" : active ? "#2563eb" : "#e2e8f0",
                                                                color: done || active ? "white" : "#64748b",
                                                                fontSize: 13,
                                                                fontWeight: 700,
                                                                fontFamily: "inherit",
                                                                lineHeight: 1
                                                            }}
                                                        >
                                                            {step.StepOrder || index + 1}
                                                        </Box>
                                                        {index < confirmSteps.length - 1 && (
                                                            <Box sx={{ width: 2, flex: 1, minHeight: 30, bgcolor: "#e2e8f0", mt: 0.5 }} />
                                                        )}
                                                    </Stack>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                                                            <Box>
                                                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}>
                                                                    {step.TenBoPhan || step.MaBoPhan || "---"}
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500, lineHeight: 1.4 }}>
                                                                    {step.MaBoPhan || `BP ${step.BoPhanId}`}
                                                                </Typography>
                                                            </Box>
                                                            <Chip
                                                                size="small"
                                                                label={done ? "Xong" : active ? "Hiện tại" : "Chờ"}
                                                                color={done ? "success" : active ? "primary" : "default"}
                                                                variant={done || active ? "filled" : "outlined"}
                                                                sx={{ borderRadius: 1.25, fontWeight: 700 }}
                                                            />
                                                        </Stack>
                                                    </Box>
                                                </Stack>
                                            );
                                        })}
                                    </CardContent>
                                </Card>

                                {canConfirmCurrentStep && !isCompleted && (
                                    <Button
                                        variant="contained"
                                        size="large"
                                        startIcon={<CheckCircleIcon />}
                                        disabled={saving}
                                        onClick={handleConfirmStep}
                                        sx={{ borderRadius: 1.5, py: 1.2, fontWeight: 700 }}
                                    >
                                        Xác nhận bước hiện tại
                                    </Button>
                                )}

                                {isCompleted && (
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "#f0fdf4", borderColor: "#bbf7d0" }}>
                                        <Typography sx={{ color: "success.dark", fontWeight: 700 }}>
                                            Biên bản SXBT đã hoàn tất.
                                        </Typography>
                                    </Paper>
                                )}
                            </Stack>
                        </Grid>
                    </Grid>
                </Stack>
            </Container>

            <SxbtXuLyDialog open={openXuLy} onClose={() => setOpenXuLy(false)} bienBanId={bienBanId} mucDo={mucDo} reload={loadData} />
            <SxbtHanhDongDialog
                open={openHanhDong}
                onClose={() => setOpenHanhDong(false)}
                onSave={async (payload) => {
                    try {
                        await handleAddHanhDong(payload);
                        setOpenHanhDong(false);
                        showToast("Đã thêm hành động khắc phục", "success");
                    } catch (err) {
                        showToast(err?.response?.data?.message || "Không thể thêm hành động", "error");
                    }
                }}
            />
            <Dialog open={openPrint} onClose={() => setOpenPrint(false)} maxWidth="md" fullWidth>
                <DialogTitle>Xem trước biên bản SXBT</DialogTitle>
                <DialogContent dividers sx={{ bgcolor: "#e5e7eb", p: 2 }}>
                    <BienBanSxbtPrintTemplate
                        ref={printRef}
                        info={info}
                        moTaChung={moTaChung}
                        defects={defects}
                        xuLyRows={xuLyRows}
                        hanhDongRows={hanhDongRows}
                        dynamicFields={dynamicFields}
                        confirmSteps={confirmSteps}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenPrint(false)}>Đóng</Button>
                    <Button variant="contained" startIcon={<PrintIcon />} onClick={() => handlePrint()}>
                        In / Lưu PDF
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(previewImage)} onClose={() => setPreviewImage("")} maxWidth="md" fullWidth>
                <DialogTitle>Ảnh lỗi SXBT</DialogTitle>
                <DialogContent dividers>
                    <Box
                        component="img"
                        src={previewImage}
                        alt="Ảnh lỗi SXBT"
                        sx={{ display: "block", width: "100%", maxHeight: 620, objectFit: "contain" }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewImage("")}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

function InfoTile({ icon, label, value }) {
    return (
        <Paper variant="outlined" sx={{ p: 1.5, height: "100%", borderRadius: 2, bgcolor: "#f8fafc", borderColor: "#e2e8f0" }}>
            <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ color: "#2563eb", display: "flex", "& svg": { fontSize: 19 } }}>{icon}</Box>
                <Typography sx={mutedLabelSx}>{label}</Typography>
            </Stack>
            <Typography sx={{ mt: 0.75, fontWeight: 700, color: "#0f172a", wordBreak: "break-word" }}>
                {value}
            </Typography>
        </Paper>
    );
}

function EmptyTableRow({ colSpan, label }) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} align="center" sx={{ py: 4, color: "text.secondary" }}>
                {label}
            </TableCell>
        </TableRow>
    );
}

function SxbtXuLySection({ rows, canEdit, onAdd }) {
    return (
        <Card sx={cardShellSx}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} spacing={2}>
                    <Box>
                        <Typography sx={sectionTitleSx}>Ý kiến / đề xuất xử lý</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Phương án xử lý, bộ phận chịu trách nhiệm và thời hạn.
                        </Typography>
                    </Box>
                    {canEdit && <Button startIcon={<AddIcon />} onClick={onAdd} variant="outlined">Thêm</Button>}
                </Stack>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, borderColor: "#e2e8f0" }}>
                    <Table size="small" sx={tableSx}>
                        <TableHead>
                            <TableRow>
                                <TableCell width={70}>STT</TableCell>
                                <TableCell>Nội dung</TableCell>
                                <TableCell>Trách nhiệm</TableCell>
                                <TableCell>Người nhập</TableCell>
                                <TableCell>Chi phí</TableCell>
                                <TableCell>Thời hạn</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.length === 0 ? (
                                <EmptyTableRow colSpan={6} label="Chưa có phương án xử lý" />
                            ) : rows.map((item, index) => (
                                <TableRow key={item.Id || index}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{item.NoiDung || "---"}</TableCell>
                                    <TableCell>{item.TrachNhiem || item.TenBoPhan || item.MaBoPhan || "---"}</TableCell>
                                    <TableCell>{item.NguoiNhap || "---"}</TableCell>
                                    <TableCell>{item.ChiPhi || "---"}</TableCell>
                                    <TableCell>
                                        <Chip size="small" icon={<AccessTimeOutlinedIcon />} label={formatDate(item.ThoiHan)} variant="outlined" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
}

function SxbtHanhDongSection({ rows, canEdit, onAdd }) {
    return (
        <Card sx={cardShellSx}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} spacing={2}>
                    <Box>
                        <Typography sx={sectionTitleSx}>Hành động khắc phục</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Theo dõi đầu việc khắc phục theo bộ phận thực hiện.
                        </Typography>
                    </Box>
                    {canEdit && <Button startIcon={<AddIcon />} onClick={onAdd} variant="outlined">Thêm</Button>}
                </Stack>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, borderColor: "#e2e8f0" }}>
                    <Table size="small" sx={tableSx}>
                        <TableHead>
                            <TableRow>
                                <TableCell width={70}>STT</TableCell>
                                <TableCell>Nội dung hành động</TableCell>
                                <TableCell>Bộ phận thực hiện</TableCell>
                                <TableCell>Người nhập</TableCell>
                                <TableCell>Thời hạn</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.length === 0 ? (
                                <EmptyTableRow colSpan={5} label="Chưa có hành động cụ thể" />
                            ) : rows.map((item, index) => (
                                <TableRow key={item.Id || index}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{item.NoiDung || "---"}</TableCell>
                                    <TableCell>{item.MaBoPhan && item.TenBoPhan ? `${item.MaBoPhan} - ${item.TenBoPhan}` : item.TenBoPhan || item.MaBoPhan || "---"}</TableCell>
                                    <TableCell>{item.NguoiNhap || "---"}</TableCell>
                                    <TableCell>
                                        <Chip size="small" icon={<AccessTimeOutlinedIcon />} label={formatDate(item.ThoiHan)} variant="outlined" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
}

function SxbtXuLyDialog({ open, onClose, bienBanId, mucDo, reload }) {
    const [departments, setDepartments] = useState([]);
    const [form, setForm] = useState({ chiPhi: "", noiDung: "", boPhanTrachNhiemId: "", thoiHan: "" });

    useEffect(() => {
        if (open) {
            // Reset form whenever the dialog is opened.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setForm({ chiPhi: "", noiDung: "", boPhanTrachNhiemId: "", thoiHan: "" });
            getBoPhan().then((res) => setDepartments(res.data || []));
        }
    }, [open]);

    const handleSubmit = async () => {
        await addBienBanSxbtXuLyRow(bienBanId, { mucDo, ...form });
        await reload();
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Nhập phương án xử lý</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField label="Chi phí" value={form.chiPhi} onChange={(e) => setForm({ ...form, chiPhi: e.target.value })} />
                    <TextField label="Nội dung" multiline rows={3} value={form.noiDung} onChange={(e) => setForm({ ...form, noiDung: e.target.value })} />
                    <FormControl fullWidth>
                        <InputLabel>Trách nhiệm</InputLabel>
                        <Select label="Trách nhiệm" value={form.boPhanTrachNhiemId} onChange={(e) => setForm({ ...form, boPhanTrachNhiemId: e.target.value })}>
                            {departments.map((item) => <MenuItem key={item.Id} value={item.Id}>{item.MaBoPhan} - {item.TenBoPhan}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField label="Thời hạn" type="date" InputLabelProps={{ shrink: true }} value={form.thoiHan} onChange={(e) => setForm({ ...form, thoiHan: e.target.value })} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={!form.noiDung || !form.boPhanTrachNhiemId}>Lưu</Button>
            </DialogActions>
        </Dialog>
    );
}

function SxbtHanhDongDialog({ open, onClose, onSave }) {
    const [departments, setDepartments] = useState([]);
    const [form, setForm] = useState({ noiDung: "", thoiHan: "", boPhanId: "" });

    useEffect(() => {
        if (open) {
            // Reset form whenever the dialog is opened.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setForm({ noiDung: "", thoiHan: "", boPhanId: "" });
            getBoPhan().then((res) => setDepartments(res.data || []));
        }
    }, [open]);

    const handleSubmit = async () => {
        const boPhan = departments.find((item) => item.Id === form.boPhanId);
        await onSave({ ...form, boPhan });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Thêm hành động khắc phục</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField label="Nội dung hành động" multiline rows={3} value={form.noiDung} onChange={(e) => setForm({ ...form, noiDung: e.target.value })} />
                    <TextField label="Thời hạn hoàn thành" type="date" InputLabelProps={{ shrink: true }} value={form.thoiHan} onChange={(e) => setForm({ ...form, thoiHan: e.target.value })} />
                    <FormControl fullWidth>
                        <InputLabel>Bộ phận thực hiện</InputLabel>
                        <Select label="Bộ phận thực hiện" value={form.boPhanId} onChange={(e) => setForm({ ...form, boPhanId: e.target.value })}>
                            {departments.map((item) => <MenuItem key={item.Id} value={item.Id}>{item.MaBoPhan} - {item.TenBoPhan}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={!form.noiDung || !form.boPhanId}>Lưu</Button>
            </DialogActions>
        </Dialog>
    );
}
