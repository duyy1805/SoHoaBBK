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
    Divider,
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
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
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

const LEVEL_OPTIONS = ["B", "C"];

const statusLabel = (status) => {
    if (status === "BB_SXBT_HOAN_TAT") return "SXBT hoàn tất";
    if (status === "BB_SXBT_CHO_XAC_NHAN") return "Đang xử lý";
    if (status === "BB_SXBT_MOI" || status === "BB_SXBT_TP_B8_DRAFT") return "Chờ xác nhận mức";
    return status || "---";
};

const cardShellSx = {
    borderRadius: 3,
    border: "1px solid rgba(15, 23, 42, 0.08)",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)"
};

const mutedLabelSx = {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "text.secondary"
};

const formatDate = (value) => {
    if (!value) return "---";
    return new Date(value).toLocaleDateString("vi-VN");
};

const parseDefectImages = (defect) => {
    const rawValues = [
        defect?.ImageUrls,
        defect?.ImageUrl,
        defect?.HinhAnh,
        defect?.AnhLoi,
        defect?.UrlAnh
    ].filter(Boolean);

    const urls = [];
    rawValues.forEach((raw) => {
        if (Array.isArray(raw)) {
            raw.forEach((item) => item && urls.push(item));
            return;
        }
        if (typeof raw === "string") {
            const trimmed = raw.trim();
            if (!trimmed) return;
            if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        parsed.forEach((item) => item && urls.push(item));
                    } else if (parsed) {
                        urls.push(parsed);
                    }
                } catch {
                    urls.push(trimmed);
                }
            } else {
                urls.push(trimmed);
            }
        }
    });

    return [...new Set(urls.map((url) => String(url).trim()).filter(Boolean))];
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
                if (input.type === "checkbox") {
                    fieldsData[input.name] = input.checked;
                } else {
                    fieldsData[input.name] = input.value;
                }
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
        <Box
            sx={{
                minHeight: "100vh",
                pb: 5,
                background: "#f5f7fb"
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    mb: 4,
                    borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
                    bgcolor: "rgba(255,255,255,0.88)",
                    backdropFilter: "blur(16px)",
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
                            <Button
                                variant="outlined"
                                startIcon={<PrintIcon />}
                                onClick={() => setOpenPrint(true)}
                            >
                                Xem in
                            </Button>
                        </Stack>
                    </Stack>
                </Container>
            </Paper>

            <Container maxWidth="xl">
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12 }}>
                        <Stack spacing={3}>
                            <Card sx={cardShellSx}>
                                <CardContent>
                                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
                                        <Box>
                                            <Typography sx={{ color: "text.secondary", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                                                Biên bản SXBT
                                            </Typography>
                                            <Typography variant="h4" fontWeight={800}>{info?.SoPhieu || "---"}</Typography>
                                            <Typography sx={{ color: "text.secondary", mt: 0.5 }}>{info?.SoBienBan || "Xử lý sản xuất bổ trợ"}</Typography>
                                        </Box>
                                        <Chip label={statusLabel(info?.TrangThai)} color={isCompleted ? "success" : "default"} />
                                    </Stack>
                                    <Divider sx={{ my: 2 }} />
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <Typography sx={mutedLabelSx}>Người tạo</Typography>
                                            <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                                                <PersonOutlineOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                                <Typography fontWeight={600}>{info?.NguoiTao || "---"}</Typography>
                                            </Stack>
                                        </Grid>
                                        <Grid size={{ xs: 6, md: 4 }}>
                                            <Typography sx={mutedLabelSx}>Bước đã xác nhận</Typography>
                                            <Typography fontWeight={700}>{confirmSteps.filter((step) => step.TrangThai === "DA_XAC_NHAN").length}/{confirmSteps.length}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6, md: 4 }}>
                                            <Typography sx={mutedLabelSx}>Phương án / Hành động</Typography>
                                            <Typography fontWeight={700}>{xuLyRows.length + hanhDongRows.length}</Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>

                            <Card sx={cardShellSx}>
                                <CardContent>
                                    <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
                                        <DescriptionOutlinedIcon color="action" />
                                        <Typography variant="h6" fontWeight={700}>Mô tả chung + Mức độ không phù hợp</Typography>
                                    </Stack>
                                    {canEditBeforeFlow ? (
                                        <TextField
                                            fullWidth
                                            multiline
                                            minRows={4}
                                            placeholder="Nhập mô tả chung của biên bản SXBT..."
                                            value={moTaChung}
                                            onChange={(e) => setMoTaChung(e.target.value)}
                                            sx={{ mb: 2, "& .MuiInputBase-root": { borderRadius: 2.5, bgcolor: "white" } }}
                                        />
                                    ) : (
                                        <Typography
                                            sx={{
                                                mb: 2,
                                                whiteSpace: "pre-wrap",
                                                color: moTaChung?.trim() ? "text.primary" : "text.secondary",
                                                minHeight: 96,
                                                py: 0.5
                                            }}
                                        >
                                            {moTaChung?.trim() || "Chưa có mô tả chung."}
                                        </Typography>
                                    )}
                                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
                                        {LEVEL_OPTIONS.map((level) => (
                                            <Button
                                                key={level}
                                                variant={mucDo === level ? "contained" : "outlined"}
                                                onClick={() => {
                                                    if (!canEditBeforeFlow) return;
                                                    setMucDo(level);
                                                }}
                                                sx={{ minWidth: 112, borderRadius: 2.5, py: 1, fontWeight: 700 }}
                                            >
                                                Mức {level}
                                            </Button>
                                        ))}
                                        {canEditBeforeFlow && (
                                            <Button variant="contained" color="success" disabled={saving} onClick={handleConfirmMucDo} sx={{ borderRadius: 2.5, px: 3, py: 1, fontWeight: 700 }}>
                                                Xác nhận mức độ
                                            </Button>
                                        )}
                                        {isMucDoConfirmed && <Chip label={`Đã xác nhận mức ${mucDo}`} color="success" />}
                                    </Stack>
                                </CardContent>
                            </Card>

                            <Card sx={cardShellSx}>
                                <CardContent>
                                    <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
                                        <ReportProblemOutlinedIcon color="error" />
                                        <Typography variant="h6" fontWeight={700}>Danh sách lỗi</Typography>
                                    </Stack>
                                    {defects.length === 0 ? <Typography color="text.secondary">Chưa có dữ liệu lỗi</Typography> : (
                                        <Stack spacing={1.5}>
                                            {defects.map((item, index) => {
                                                const imageUrls = parseDefectImages(item);
                                                return (
                                                    <Paper key={`${item.MaLoi || index}-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                                                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
                                                            <Box sx={{ flex: 1 }}>
                                                                <Typography fontWeight={700}>{index + 1}. {item.TenLoi || item.MaLoi || "---"}</Typography>
                                                                <Typography variant="body2" color="text.secondary" mt={0.5}>Loại lỗi: {item.DefectType || "---"} | Số lượng: {item.SoLuong || 0}</Typography>
                                                                <Typography variant="body2" color="text.secondary" mt={0.5}>{item.MoTa || "---"}</Typography>
                                                            </Box>
                                                            {imageUrls.length > 0 && (
                                                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ minWidth: { md: 260 } }}>
                                                                    {imageUrls.map((url, imgIdx) => (
                                                                        <Box key={`${url}-${imgIdx}`} component="img" src={getAssetUrl(url)} alt={`Ảnh lỗi ${index + 1}-${imgIdx + 1}`} sx={{ width: 120, height: 90, objectFit: "cover", borderRadius: 1.5, border: "1px solid rgba(15,23,42,0.12)" }} />
                                                                    ))}
                                                                </Stack>
                                                            )}
                                                        </Stack>
                                                    </Paper>
                                                );
                                            })}
                                        </Stack>
                                    )}
                                </CardContent>
                            </Card>

                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, lg: 8 }}>
                                    <SxbtActionSummarySection
                                        xuLyRows={xuLyRows}
                                        hanhDongRows={hanhDongRows}
                                        canEdit={canEditContent}
                                        isMucDoConfirmed={isMucDoConfirmed}
                                        onAddXuLy={() => setOpenXuLy(true)}
                                        onAddHanhDong={() => setOpenHanhDong(true)}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, lg: 4 }}>
                                    <Card sx={cardShellSx}>
                                        <CardContent>
                                            <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
                                                <RuleFolderOutlinedIcon color="action" />
                                                <Typography variant="h6" fontWeight={700}>Chuỗi xác nhận</Typography>
                                            </Stack>
                                            {currentPendingStep && !isCompleted && (
                                                <Paper variant="outlined" sx={{ mb: 2, p: 1.5, borderRadius: 2.5, bgcolor: "#eff6ff", borderColor: "rgba(37, 99, 235, 0.18)" }}>
                                                    <Typography variant="body2" sx={{ color: "#1d4ed8", fontWeight: 700 }}>
                                                        Đang chờ: {currentPendingStep.MaBoPhan || currentPendingStep.TenBoPhan}
                                                    </Typography>
                                                </Paper>
                                            )}
                                            {confirmSteps.length === 0 ? (
                                                <Typography color="text.secondary">Chưa có chuỗi xác nhận</Typography>
                                            ) : confirmSteps.map((step) => (
                                                <Stack key={step.Id} direction="row" spacing={2} sx={{ position: "relative", pb: 2 }}>
                                                    <Stack alignItems="center" sx={{ minWidth: 36 }}>
                                                        <Box sx={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: step.TrangThai === "DA_XAC_NHAN" ? "success.main" : "warning.light", color: step.TrangThai === "DA_XAC_NHAN" ? "white" : "warning.dark", fontWeight: 800 }}>
                                                            {step.StepOrder}
                                                        </Box>
                                                        {step !== confirmSteps[confirmSteps.length - 1] && <Box sx={{ width: 2, flex: 1, minHeight: 26, bgcolor: "rgba(148, 163, 184, 0.35)", mt: 0.5 }} />}
                                                    </Stack>
                                                    <Paper variant="outlined" sx={{ flex: 1, p: 1.5, borderRadius: 2.5, bgcolor: step.TrangThai === "DA_XAC_NHAN" ? "#f0fdf4" : "#fffaf0", borderColor: step.TrangThai === "DA_XAC_NHAN" ? "rgba(34, 197, 94, 0.2)" : "rgba(245, 158, 11, 0.2)" }}>
                                                        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                                                            <Box>
                                                                <Typography fontWeight={700}>{step.TenBoPhan || step.MaBoPhan}</Typography>
                                                                <Typography variant="body2" color="text.secondary">Bộ phận {step.MaBoPhan || `BP ${step.BoPhanId}`}</Typography>
                                                            </Box>
                                                            <Chip size="small" label={step.TrangThai === "DA_XAC_NHAN" ? "Đã xác nhận" : "Chờ xác nhận"} color={step.TrangThai === "DA_XAC_NHAN" ? "success" : "warning"} />
                                                        </Stack>
                                                    </Paper>
                                                </Stack>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            {canConfirmCurrentStep && !isCompleted && (
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={<CheckCircleIcon />}
                                    disabled={saving}
                                    onClick={handleConfirmStep}
                                    sx={{
                                        borderRadius: 2.5,
                                        py: 1.2,
                                        px: 3.5,
                                        alignSelf: "flex-start",
                                        boxShadow: "0 10px 24px rgba(37, 99, 235, 0.18)"
                                    }}
                                >
                                    Xác nhận bước hiện tại
                                </Button>
                            )}
                            {isCompleted && (
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        borderRadius: 2.5,
                                        bgcolor: "#f0fdf4",
                                        borderColor: "rgba(34, 197, 94, 0.18)"
                                    }}
                                >
                                    <Typography sx={{ color: "success.dark", fontWeight: 800 }}>
                                        Biên bản SXBT đã hoàn tất.
                                    </Typography>
                                </Paper>
                            )}
                        </Stack>
                    </Grid>
                </Grid>
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
        </Box>
    );
}

function SxbtActionSummarySection({ xuLyRows, hanhDongRows, canEdit, isMucDoConfirmed, onAddXuLy, onAddHanhDong }) {
    return (
        <Card sx={cardShellSx}>
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>Ý kiến xử lý + Hành động khắc phục</Typography>
                        <Typography variant="body2" color="text.secondary">Hiển thị dạng bảng theo yêu cầu xử lý.</Typography>
                    </Box>
                </Stack>
                {!isMucDoConfirmed && <Typography color="text.secondary">Xác nhận mức độ trước khi thêm phương án xử lý.</Typography>}
                {isMucDoConfirmed && (
                    <Stack spacing={2}>
                        <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden" }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.5, borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                                <Typography fontWeight={700}>Ý kiến / Đề xuất xử lý</Typography>
                                {canEdit && <Button size="small" startIcon={<AddIcon />} onClick={onAddXuLy} variant="outlined">Thêm</Button>}
                            </Stack>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Nội dung</TableCell>
                                        <TableCell>Chi phí</TableCell>
                                        <TableCell>Trách nhiệm</TableCell>
                                        <TableCell>Thời hạn</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {xuLyRows.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} align="center">Chưa có phương án xử lý</TableCell></TableRow>
                                    ) : xuLyRows.map((item, idx) => (
                                        <TableRow key={item.Id || idx}>
                                            <TableCell>{item.NoiDung || "---"}</TableCell>
                                            <TableCell>{item.ChiPhi || "---"}</TableCell>
                                            <TableCell>{item.TrachNhiem || "---"}</TableCell>
                                            <TableCell>{formatDate(item.ThoiHan)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Paper>

                        <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden" }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.5, borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                                <Typography fontWeight={700}>Hành động khắc phục</Typography>
                                {canEdit && <Button size="small" startIcon={<AddIcon />} onClick={onAddHanhDong} variant="outlined">Thêm</Button>}
                            </Stack>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Nội dung</TableCell>
                                        <TableCell>Bộ phận</TableCell>
                                        <TableCell>Người nhập</TableCell>
                                        <TableCell>Thời hạn</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {hanhDongRows.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} align="center">Chưa có hành động cụ thể</TableCell></TableRow>
                                    ) : hanhDongRows.map((item, idx) => (
                                        <TableRow key={item.Id || idx}>
                                            <TableCell>{item.NoiDung || "---"}</TableCell>
                                            <TableCell>{item.MaBoPhan && item.TenBoPhan ? `${item.MaBoPhan} - ${item.TenBoPhan}` : "---"}</TableCell>
                                            <TableCell>{item.NguoiNhap || "---"}</TableCell>
                                            <TableCell>{formatDate(item.ThoiHan)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Paper>
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
}

function SxbtXuLyDialog({ open, onClose, bienBanId, mucDo, reload }) {
    const [departments, setDepartments] = useState([]);
    const [form, setForm] = useState({ chiPhi: "", noiDung: "", boPhanTrachNhiemId: "", thoiHan: "" });

    useEffect(() => {
        if (open) {
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
