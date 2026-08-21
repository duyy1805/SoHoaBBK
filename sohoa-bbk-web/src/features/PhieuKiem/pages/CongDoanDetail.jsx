import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Paper, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Typography, TextField, Card,
    CardActionArea, CardContent, Radio, InputAdornment, IconButton, Tooltip,
    Collapse
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddTaskIcon from "@mui/icons-material/AddTask";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PrintIcon from "@mui/icons-material/Print";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import BrokenImageOutlinedIcon from "@mui/icons-material/BrokenImageOutlined";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import {
    addCongDoanPlan, approveCongDoanPhieu, completeCongDoanPhieu,
    createCongDoanBienBan, deleteCongDoanPlan, getCongDoanPhieuDetail,
    getCongDoanPlans, getAssetUrl
} from "../../../api/phieuKiem.api";
import { getCurrentUser } from "../../../utils/auth";
import CongDoanPrintTemplate from "../components/CongDoanPrintTemplate";
import InspectionPrintCompareDialog from "../components/InspectionPrintCompareDialog";
import UnifiedInspectionPrintTemplate from "../components/UnifiedInspectionPrintTemplate";
import CongDoanPlanEditor from "../components/CongDoanPlanEditor";
import ResponsiveInspectionDialog from "../components/ResponsiveInspectionDialog";
import DefectImageGalleryDialog from "../../BienBan/components/DefectImageGalleryDialog";
import DeletePhieuKiemButton from "../components/DeletePhieuKiemButton";

const formatDate = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("vi-VN") : "---";
const statusMeta = {
    TAO_MOI: ["Chưa kiểm", "info"], CHUA_KIEM: ["Chưa kiểm", "info"],
    DANG_KIEM: ["Đang kiểm", "primary"], CHO_TBP_DUYET: ["Chờ Trưởng bộ phận", "secondary"],
    HOAN_TAT: ["Hoàn tất", "success"]
};
const conclusionLabel = {
    DAT: "Đạt",
    KHONG_DAT: "Không đạt"
};
const sourcePlanId = (plan) => Number(plan?.ID_KeHoachSanXuat || plan?.Id || 0);
const planProcess = (plan) => plan?.Ten_QuyTrinhSanXuat || plan?.TenQuyTrinhSanXuat || "";
const planOrder = (plan) => plan?.Ma_DonHang || plan?.MaDonHang || "";
const planCode = (plan) => plan?.MaSanPham || plan?.ItemCode || "";
const formatQuantity = (value) => Number(value || 0).toLocaleString("vi-VN");
const defectName = (defect = {}) => [defect.MaLoi, defect.TenLoi].filter(Boolean).join(" – ") || "Lỗi chưa xác định";

const defectImages = (defect) => {
    const source = defect?.ImageUrls;
    if (Array.isArray(source)) return source.filter(Boolean);
    if (!source || typeof source !== "string") return defect?.ImageUrl ? [defect.ImageUrl] : [];
    try {
        const parsed = JSON.parse(source);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
        return source.split(",").map((item) => item.trim()).filter(Boolean);
    }
};

const planDefectLabels = (plan) => {
    const labels = new Map();
    const add = (key, label, quantity) => {
        const current = labels.get(key) || { key, label, quantity: 0 };
        current.quantity += Number(quantity || 0);
        labels.set(key, current);
    };
    (plan.Defects || []).forEach((defect) => {
        const code = defect.MaLoi || "Chưa có mã";
        add(`defect-${defect.DefectId || code}`, `${code} – ${defect.TenLoi || "Chưa có tên lỗi"}`, defect.SoLuong);
    });
    const specialRows = [plan, ...(plan.Lots || [])];
    specialRows.forEach((row) => {
        add("special-dust", "Bụi bẩn", row.SoLoiBuiBan);
        add("special-insect", "Côn trùng", row.SoLoiConTrung);
    });
    return [...labels.values()].filter((item) => item.quantity > 0);
};

const approvalTotals = (plans) => {
    const result = { total: 0, types: new Set(), passed: 0, failed: 0, pending: 0 };
    plans.forEach((plan) => {
        (plan.Defects || []).forEach((defect) => {
            const quantity = Number(defect.SoLuong || 0);
            const passed = Number(defect.SoLuongDatSauSua || 0);
            const failed = Number(defect.SoLuongKhongDatSauSua || 0);
            result.total += quantity;
            result.passed += passed;
            result.failed += failed;
            result.pending += Math.max(0, quantity - passed - failed);
            if (quantity > 0) result.types.add(`defect-${defect.DefectId || defect.MaLoi || defect.TenLoi}`);
        });
        [plan, ...(plan.Lots || [])].forEach((row) => {
            const dust = Number(row.SoLoiBuiBan || 0);
            const insects = Number(row.SoLoiConTrung || 0);
            result.total += dust + insects;
            if (dust > 0) result.types.add("special-dust");
            if (insects > 0) result.types.add("special-insect");
        });
    });
    return { ...result, types: result.types.size };
};

function DefectThumbnail({ url, index, onOpen }) {
    const [broken, setBroken] = useState(false);
    return (
        <Box
            component="button"
            type="button"
            aria-label={`Xem ảnh lỗi ${index + 1}`}
            onClick={onOpen}
            sx={{
                width: 58, height: 58, p: 0, border: "1px solid", borderColor: "divider",
                borderRadius: 1.25, overflow: "hidden", cursor: "pointer", bgcolor: "grey.100",
                display: "grid", placeItems: "center"
            }}
        >
            {broken ? <BrokenImageOutlinedIcon color="disabled" /> : (
                <Box
                    component="img"
                    src={getAssetUrl(url)}
                    alt={`Ảnh lỗi ${index + 1}`}
                    loading="lazy"
                    onError={() => setBroken(true)}
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            )}
        </Box>
    );
}

function RepairStatus({ defect }) {
    const quantity = Number(defect.SoLuong || 0);
    const passed = Number(defect.SoLuongDatSauSua || 0);
    const failed = Number(defect.SoLuongKhongDatSauSua || 0);
    const pending = Math.max(0, quantity - passed - failed);
    return (
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
            {passed > 0 && <Chip size="small" color="success" variant="outlined" label={`Sửa đạt ${passed}`} />}
            {failed > 0 && <Chip size="small" color="error" variant="outlined" label={`Không đạt ${failed}`} />}
            {pending > 0 && <Chip size="small" color="warning" variant="outlined" label={`Chưa có KQ ${pending}`} />}
        </Stack>
    );
}

function PlanDefectDetails({ plan, onOpenImages }) {
    const groups = [
        ...(plan.Lots || []).map((lot, index) => ({
            key: `lot-${lot.Id || index}`,
            title: `Lot ${lot.Lot || "—"} · LXVT ${lot.LenhXuatVatTu || "—"}`,
            quantity: lot.SoLuong,
            defects: (plan.Defects || []).filter((defect) => Number(defect.PlanLotId) === Number(lot.Id)),
            dust: Number(lot.SoLoiBuiBan || 0),
            insects: Number(lot.SoLoiConTrung || 0)
        })),
        {
            key: "unassigned",
            title: (plan.Lots || []).length ? "Chưa xác định Lot" : "Lỗi chung của kế hoạch",
            quantity: null,
            defects: (plan.Defects || []).filter((defect) => !defect.PlanLotId),
            dust: Number(plan.SoLoiBuiBan || 0),
            insects: Number(plan.SoLoiConTrung || 0)
        }
    ].filter((group) => group.defects.length || group.dust > 0 || group.insects > 0);

    if (!groups.length) return <Alert severity="success">Kế hoạch không phát sinh lỗi.</Alert>;
    return (
        <Stack spacing={1.25}>
            {groups.map((group) => (
                <Paper key={group.key} variant="outlined" sx={{ p: { xs: 1.25, sm: 1.5 }, borderRadius: 2, bgcolor: "#fbfdff" }}>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={0.5} sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={800}>{group.title}</Typography>
                        {group.quantity != null && <Typography variant="caption" color="text.secondary">Số lượng Lot: {formatQuantity(group.quantity)}</Typography>}
                    </Stack>
                    <Stack spacing={1}>
                        {group.defects.map((defect, index) => {
                            const images = defectImages(defect);
                            return (
                                <Box key={defect.Id || `${group.key}-${defect.DefectId}-${index}`} sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
                                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography variant="body2" fontWeight={800} color="#0f172a">
                                                {defect.MaLoi || "Chưa có mã"} – {defect.TenLoi || "Chưa có tên lỗi"}
                                            </Typography>
                                            {defect.MoTa && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{defect.MoTa}</Typography>}
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                                Công nhân: {defect.TenCongNhan || "Chưa xác định"} · Số lượng: <b>{formatQuantity(defect.SoLuong)}</b>
                                            </Typography>
                                            {defect.GhiChu && <Typography variant="caption" display="block" sx={{ mt: 0.25 }}>Ghi chú: {defect.GhiChu}</Typography>}
                                        </Box>
                                        <RepairStatus defect={defect} />
                                    </Stack>
                                    {images.length > 0 && (
                                        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                                            {images.map((url, imageIndex) => (
                                                <DefectThumbnail key={`${url}-${imageIndex}`} url={url} index={imageIndex} onOpen={() => onOpenImages(images, imageIndex)} />
                                            ))}
                                        </Stack>
                                    )}
                                </Box>
                            );
                        })}
                        {group.dust > 0 && (
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
                                <Typography variant="body2" fontWeight={800}>Bụi bẩn</Typography>
                                <Chip size="small" color="warning" variant="outlined" label={`Số lượng ${group.dust}`} />
                            </Stack>
                        )}
                        {group.insects > 0 && (
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
                                <Typography variant="body2" fontWeight={800}>Côn trùng</Typography>
                                <Chip size="small" color="warning" variant="outlined" label={`Số lượng ${group.insects}`} />
                            </Stack>
                        )}
                    </Stack>
                </Paper>
            ))}
        </Stack>
    );
}

export default function CongDoanDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const oldPrintRef = useRef(null);
    const newPrintRef = useRef(null);
    const [data, setData] = useState({ phieu: null, plans: [], xacNhans: [], capabilities: {} });
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(false);
    const [creatingBienBan, setCreatingBienBan] = useState(false);
    const [printOpen, setPrintOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [addPlanOpen, setAddPlanOpen] = useState(false);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [selectedSourcePlan, setSelectedSourcePlan] = useState("");
    const [planSearch, setPlanSearch] = useState("");
    const [processFilter, setProcessFilter] = useState("");
    const [addingPlan, setAddingPlan] = useState(false);
    const [completeOpen, setCompleteOpen] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [expandedPlanIds, setExpandedPlanIds] = useState(() => new Set());
    const [gallery, setGallery] = useState({ images: [], index: 0 });
    const autoExpandedPhieuRef = useRef(null);
    const user = getCurrentUser();
    const returnTo = typeof location.state?.returnTo === "string"
        && /^\/phieu-kiem\/cong-doan(?:\?|$)/.test(location.state.returnTo)
        ? location.state.returnTo
        : "/phieu-kiem/cong-doan";

    const load = useCallback(async ({ background = false } = {}) => {
        try {
            if (!background) setLoading(true);
            const response = await getCongDoanPhieuDetail(id);
            setData(response.data || { phieu: null, plans: [], xacNhans: [] });
        } catch (error) {
            window.alert(error.response?.data?.message || "Không tải được phiếu công đoạn.");
        } finally {
            if (!background) setLoading(false);
        }
    }, [id]);
    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (data.phieu?.TrangThai !== "CHO_TBP_DUYET" || autoExpandedPhieuRef.current === data.phieu?.Id) return;
        setExpandedPlanIds(new Set(data.plans.filter((plan) => Number(plan.TongLoi || 0) > 0).map((plan) => Number(plan.Id))));
        autoExpandedPhieuRef.current = data.phieu?.Id;
    }, [data.phieu?.Id, data.phieu?.TrangThai, data.plans]);

    const totals = useMemo(() => ({
        plans: data.plans.length,
        planned: data.plans.reduce((sum, item) => sum + Number(item.SoLuongKeHoach || 0), 0),
        actual: data.plans.reduce((sum, item) => sum + Number(item.SoLuongThucTe || 0), 0),
        actualCount: data.plans.filter((item) => item.SoLuongThucTe != null).length,
        effective: data.plans.reduce((sum, item) => sum + Number(item.SoLuongHieuLuc || 0), 0),
        defects: data.plans.reduce((sum, item) => sum + Number(item.TongLoi || 0), 0)
    }), [data.plans]);
    const defectApproval = useMemo(() => approvalTotals(data.plans), [data.plans]);
    const togglePlanDetails = (planId) => setExpandedPlanIds((current) => {
        const next = new Set(current);
        if (next.has(Number(planId))) next.delete(Number(planId));
        else next.add(Number(planId));
        return next;
    });
    const openImages = (images, index) => setGallery({
        images: images.map(getAssetUrl).filter(Boolean),
        index
    });
    const processOptions = useMemo(() => [...new Set(
        availablePlans.map(planProcess).filter(Boolean)
    )].sort((left, right) => left.localeCompare(right, "vi")), [availablePlans]);
    const candidatePlans = useMemo(() => {
        const usedPlanIds = new Set(data.plans.map((plan) => Number(plan.ID_KeHoachSanXuat)));
        const keyword = planSearch.trim().toLocaleLowerCase("vi");
        return availablePlans.filter((plan) => {
            if (usedPlanIds.has(sourcePlanId(plan))) return false;
            if (processFilter && planProcess(plan) !== processFilter) return false;
            if (!keyword) return true;
            return [
                sourcePlanId(plan),
                planCode(plan),
                plan.TenSanPham,
                planProcess(plan),
                planOrder(plan),
                plan.Ten_DonVi,
                plan.TenDonVi,
                plan.Ten_BoPhan,
                plan.TenBoPhan,
                plan.Lot,
                plan.LenhXuatVatTu
            ].some((value) => String(value || "").toLocaleLowerCase("vi").includes(keyword));
        });
    }, [availablePlans, data.plans, planSearch, processFilter]);
    const managedDepartmentIds = new Set([
        user?.boPhanId,
        ...(user?.managedBoPhanIds || [])
    ].map(Number).filter((value) => Number.isInteger(value) && value > 0));
    const canApprove = data.capabilities?.canApprove ?? (
        data.phieu?.TrangThai === "CHO_TBP_DUYET"
        && user?.permissions?.includes("PHAN_CONG_NGUOI_XU_LY")
        && (managedDepartmentIds.has(Number(data.phieu?.BoPhanDuyetId)) || user?.permissions?.includes("QUAN_TRI_DM"))
    );
    const canEdit = data.capabilities?.canEdit ?? (
        ["TAO_MOI", "DANG_KIEM", "CHUA_KIEM"].includes(data.phieu?.TrangThai)
        && user?.permissions?.includes("THUC_HIEN_KIEM")
    );
    const handlePrintOld = useReactToPrint({
        contentRef: oldPrintRef,
        documentTitle: data.phieu?.SoPhieu ? `CongDoan_${data.phieu.SoPhieu}_MauCu` : "PhieuKiemCongDoan_MauCu"
    });
    const handlePrintNew = useReactToPrint({
        contentRef: newPrintRef,
        documentTitle: data.phieu?.SoPhieu ? `CongDoan_${data.phieu.SoPhieu}_MauMoi` : "PhieuKiemCongDoan_MauMoi"
    });
    const approve = async () => {
        if (!window.confirm("Duyệt phiếu kiểm công đoạn này?")) return;
        try {
            setApproving(true);
            await approveCongDoanPhieu(id);
            await load({ background: true });
        } catch (error) {
            window.alert(error.response?.data?.message || "Không duyệt được phiếu.");
        } finally {
            setApproving(false);
        }
    };
    const createBienBan = async () => {
        try {
            setCreatingBienBan(true);
            const response = await createCongDoanBienBan(id);
            const bienBanId = response?.data?.bienBanId;
            await load({ background: true });
            if (bienBanId) navigate(`/bien-ban/${bienBanId}`);
        } catch (error) {
            window.alert(error.response?.data?.message || "Không sinh được biên bản KPH.");
        } finally {
            setCreatingBienBan(false);
        }
    };

    const openAddPlan = async () => {
        try {
            const response = await getCongDoanPlans(String(data.phieu.NgayKiem || "").slice(0, 10), id);
            setAvailablePlans(response.data || []);
            setSelectedSourcePlan("");
            setPlanSearch("");
            setProcessFilter("");
            setAddPlanOpen(true);
        } catch (error) {
            window.alert(error.response?.data?.message || "Không tải được kế hoạch sản xuất.");
        }
    };

    const addPlan = async () => {
        try {
            setAddingPlan(true);
            await addCongDoanPlan(id, Number(selectedSourcePlan));
            setAddPlanOpen(false);
            await load({ background: true });
        } catch (error) {
            window.alert(error.response?.data?.message || "Không thêm được kế hoạch.");
        } finally {
            setAddingPlan(false);
        }
    };

    const removePlan = async (planId) => {
        if (!window.confirm("Xóa kế hoạch này khỏi phiếu công đoạn?")) return;
        try {
            await deleteCongDoanPlan(id, planId);
            await load({ background: true });
        } catch (error) {
            window.alert(error.response?.data?.message || "Không xóa được kế hoạch.");
        }
    };

    const complete = async (ketLuan) => {
        try {
            setCompleting(true);
            await completeCongDoanPhieu(id, ketLuan);
            setCompleteOpen(false);
            await load({ background: true });
        } catch (error) {
            window.alert(error.response?.data?.message || "Không hoàn tất được phiếu.");
        } finally {
            setCompleting(false);
        }
    };

    if (loading) return <Box sx={{ py: 10, textAlign: "center" }}><CircularProgress /></Box>;
    if (!data.phieu) return <Alert severity="error">Không tìm thấy phiếu kiểm công đoạn.</Alert>;

    const phieu = data.phieu;
    const state = statusMeta[phieu.TrangThai] || [phieu.TrangThai, "default"];
    const summaryItems = [
        ["PHÂN XƯỞNG", phieu.PhanXuong || "---"],
        ["TỔ / MÁY", phieu.ToMay || "---"],
        ["SỐ KẾ HOẠCH", totals.plans],
        ["TỔNG KẾ HOẠCH", totals.planned.toLocaleString("vi-VN")],
        ["TỔNG THỰC TẾ", totals.actualCount ? totals.actual.toLocaleString("vi-VN") : "Chưa nhập"],
        ["TỔNG HIỆU LỰC", totals.effective.toLocaleString("vi-VN")],
        ["TỔNG LỖI", totals.defects.toLocaleString("vi-VN")],
        ["KẾT LUẬN", conclusionLabel[phieu.KetLuan] || phieu.KetLuan || "---"]
    ];
    return (
        <Box>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Tooltip title="Quay lại danh sách">
                        <IconButton
                            color="inherit"
                            aria-label="Quay lại danh sách phiếu công đoạn"
                            onClick={() => navigate(returnTo)}
                            sx={{ flexShrink: 0 }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                    </Tooltip>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 800,
                                color: "#0f172a",
                                fontSize: { xs: "1.15rem", sm: "1.5rem" },
                                lineHeight: 1.25
                            }}
                        >
                            Phiếu công đoạn {phieu.SoPhieu}
                        </Typography>
                        <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mt: 0.6 }}>
                            <Chip size="small" label={state[0]} color={state[1]} />
                            <Typography variant="body2" color="text.secondary">{formatDate(phieu.NgayKiem)} · {phieu.TenNguoiTao || "---"}</Typography>
                        </Stack>
                    </Box>
                </Stack>
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "repeat(3, minmax(0, 1fr))", sm: "repeat(3, auto)" },
                        gap: 0.75,
                        justifyContent: { sm: "end" },
                        "& .MuiButton-root": {
                            minWidth: 0,
                            minHeight: 44,
                            px: { xs: 0.75, sm: 1.5 },
                            whiteSpace: "nowrap"
                        }
                    }}
                >
                    <DeletePhieuKiemButton phieuKiemId={id} soPhieu={phieu?.SoPhieu}
                        onDeleted={() => navigate(returnTo)} />
                    {canEdit && (
                        <>
                            <Button variant="outlined" startIcon={<AddIcon />} onClick={openAddPlan}>
                                <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>Thêm KH</Box>
                                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Thêm kế hoạch</Box>
                            </Button>
                            <Button variant="contained" color="success" onClick={() => setCompleteOpen(true)}>
                                <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>Hoàn tất</Box>
                                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Hoàn tất phiếu</Box>
                            </Button>
                        </>
                    )}
                    {canApprove && <Button variant="contained" startIcon={<TaskAltIcon />} disabled={approving} onClick={approve}>Duyệt</Button>}
                    {phieu.KetLuan === "KHONG_DAT" && phieu.BienBanId ? (
                        <Button
                            variant="outlined"
                            startIcon={<AssignmentIcon />}
                            onClick={() => navigate(`/bien-ban/${phieu.BienBanId}`)}
                        >
                            Biên bản
                        </Button>
                    ) : null}
                    {phieu.KetLuan === "KHONG_DAT"
                        && !phieu.BienBanId
                        && user?.permissions?.includes("THUC_HIEN_KIEM") ? (
                            <Button
                                variant="outlined"
                                startIcon={<AddTaskIcon />}
                                disabled={creatingBienBan}
                                onClick={createBienBan}
                            >
                                Tạo BB
                            </Button>
                        ) : null}
                    <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => setPrintOpen(true)}>
                        <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>In phiếu</Box>
                        <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>In BM.03-QT.03-B8</Box>
                    </Button>
                </Box>
            </Stack>

            <Paper
                variant="outlined"
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
                    gap: { xs: 1.25, sm: 2 },
                    p: { xs: 1.5, sm: 2 },
                    mb: 2,
                    borderRadius: 2
                }}
            >
                {summaryItems.map(([label, value]) => (
                    <Box key={label} sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.1 }}>
                            {label}
                        </Typography>
                        <Typography fontWeight={700} sx={{ mt: 0.35, lineHeight: 1.25, overflowWrap: "anywhere" }}>
                            {value}
                        </Typography>
                    </Box>
                ))}
            </Paper>

            {defectApproval.total > 0 && (
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 1.5, sm: 2 },
                        mb: 2,
                        borderRadius: 2,
                        borderColor: defectApproval.failed > 0 ? "error.light" : "warning.light",
                        bgcolor: defectApproval.failed > 0 ? "rgba(239, 68, 68, 0.035)" : "rgba(245, 158, 11, 0.035)"
                    }}
                >
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 1.25 }}>
                        <Box>
                            <Typography fontWeight={800}>Tổng hợp lỗi cần duyệt</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Xem chi tiết từng lỗi và kết quả sửa trước khi duyệt phiếu.
                            </Typography>
                        </Box>
                        {defectApproval.failed > 0 ? (
                            <Chip color="error" label={`Còn ${formatQuantity(defectApproval.failed)} không đạt`} sx={{ alignSelf: "flex-start", fontWeight: 800 }} />
                        ) : defectApproval.pending > 0 ? (
                            <Chip color="warning" label={`${formatQuantity(defectApproval.pending)} chưa có KQ sửa`} sx={{ alignSelf: "flex-start", fontWeight: 800 }} />
                        ) : (
                            <Chip color="success" label="Đã cập nhật kết quả sửa" sx={{ alignSelf: "flex-start", fontWeight: 800 }} />
                        )}
                    </Stack>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(5, minmax(0, 1fr))" }, gap: 1 }}>
                        {[
                            ["Tổng lỗi", defectApproval.total, "error.main"],
                            ["Loại lỗi", defectApproval.types, "text.primary"],
                            ["Sửa đạt", defectApproval.passed, "success.main"],
                            ["Không đạt", defectApproval.failed, defectApproval.failed > 0 ? "error.main" : "text.primary"],
                            ["Chưa có KQ sửa", defectApproval.pending, defectApproval.pending > 0 ? "warning.dark" : "text.primary"]
                        ].map(([label, value, color]) => (
                            <Box key={label} sx={{ p: 1, borderRadius: 1.5, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
                                <Typography variant="caption" color="text.secondary">{label}</Typography>
                                <Typography fontWeight={900} color={color}>{formatQuantity(value)}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Paper>
            )}

            <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" } }}>
                {data.plans.map((plan) => {
                    const labels = planDefectLabels(plan);
                    const expanded = expandedPlanIds.has(Number(plan.Id));
                    return (
                    <Paper key={plan.Id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                        <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                    <Typography variant="caption" color="primary" fontWeight={800}>Kế hoạch #{plan.ID_KeHoachSanXuat}</Typography>
                                    <Typography fontWeight={800}>{plan.MaSanPham || "---"}</Typography>
                                    <Typography variant="body2">{plan.TenSanPham || "---"}</Typography>
                                </Box>
                                <Chip size="small" color={Number(plan.TongLoi || 0) > 0 ? "error" : "default"} label={`${plan.TongLoi || 0} lỗi`} />
                            </Stack>
                            <Typography variant="body2" color="primary.main" fontWeight={600}>
                                Quy trình: {planProcess(plan) || "---"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                KH {Number(plan.SoLuongKeHoach || 0).toLocaleString("vi-VN")} · TT {plan.SoLuongThucTe == null ? "Chưa nhập" : Number(plan.SoLuongThucTe).toLocaleString("vi-VN")} · Hiệu lực {Number(plan.SoLuongHieuLuc || 0).toLocaleString("vi-VN")}
                            </Typography>
                            <Typography variant="body2">
                                {(plan.Lots || []).length ? `${plan.Lots.length} dòng Lot/LXVT` : "Không phân bổ Lot"}
                            </Typography>
                            {labels.length > 0 && (
                                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                                    {labels.map((item) => <Chip key={item.key} size="small" color="error" variant="outlined" label={`${item.label}: ${formatQuantity(item.quantity)}`} />)}
                                </Stack>
                            )}
                            {labels.length > 0 && (
                                <>
                                    <Button
                                        fullWidth
                                        variant={expanded ? "contained" : "outlined"}
                                        color="inherit"
                                        startIcon={<ImageOutlinedIcon />}
                                        endIcon={<ExpandMoreIcon sx={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 160ms" }} />}
                                        onClick={() => togglePlanDetails(plan.Id)}
                                    >
                                        {expanded ? "Ẩn chi tiết lỗi" : "Xem chi tiết lỗi"}
                                    </Button>
                                    <Collapse in={expanded} unmountOnExit>
                                        <Box sx={{ pt: 0.5 }}><PlanDefectDetails plan={plan} onOpenImages={openImages} /></Box>
                                    </Collapse>
                                </>
                            )}
                            {canEdit && (
                                <Stack direction="row" spacing={1}>
                                    <Button fullWidth variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => setEditingPlan(plan)}>Nhập kết quả</Button>
                                    <Button color="error" aria-label="Xóa kế hoạch" onClick={() => removePlan(plan.Id)}><DeleteOutlineIcon /></Button>
                                </Stack>
                            )}
                        </Stack>
                    </Paper>
                    );
                })}
            </Stack>

            <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: "none", md: "block" } }}>
                <Table size="small">
                    <TableHead><TableRow>
                        <TableCell>ID kế hoạch</TableCell><TableCell>Ngày / KCS / Công nhân</TableCell><TableCell>Sản phẩm</TableCell><TableCell>Đơn vị / bộ phận</TableCell>
                        <TableCell>Đơn hàng / LOT / LXVT</TableCell><TableCell align="right">KH / TT / Hiệu lực</TableCell>
                        <TableCell align="right">SL lỗi</TableCell><TableCell align="right">Tỷ lệ lỗi</TableCell><TableCell>Lỗi ghi nhận</TableCell><TableCell>Thao tác</TableCell>
                    </TableRow></TableHead>
                    <TableBody>
                        {data.plans.map((plan) => {
                            const labels = planDefectLabels(plan);
                            const expanded = expandedPlanIds.has(Number(plan.Id));
                            return (
                            <Fragment key={plan.Id}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800, color: "primary.main" }}>#{plan.ID_KeHoachSanXuat}</TableCell>
                                <TableCell>
                                    {formatDate(plan.NgayKeHoach)}<br />
                                    <Typography variant="caption" color="text.secondary">KCS: {plan.TenNguoiGhiNhan || "---"}</Typography><br />
                                    <Typography variant="caption" fontWeight={700}>
                                        CN: {[...new Set((plan.Defects || []).map((item) => item.TenCongNhan).filter(Boolean))].join(", ") || "---"}
                                    </Typography>
                                </TableCell>
                                <TableCell><b>{plan.MaSanPham || "---"}</b><br />{plan.TenSanPham || "---"}<br /><Typography variant="caption" color="primary">Quy trình: {planProcess(plan) || "---"}</Typography></TableCell>
                                <TableCell>{plan.TenDonVi || "---"}<br />{plan.TenBoPhan || "---"}</TableCell>
                                <TableCell>
                                    {plan.MaDonHang || "---"}<br />
                                    {(plan.Lots || []).length ? (plan.Lots || []).map((lot, lotIndex) => {
                                        const lotDefects = (plan.Defects || []).filter((defect) =>
                                            Number(defect.PlanLotId) === Number(lot.Id)
                                        );
                                        const defectText = [
                                            ...lotDefects.map((defect) =>
                                                `${defect.TenCongNhan ? `${defect.TenCongNhan} - ` : ""}${defectName(defect)}: ${defect.SoLuong}`
                                            ),
                                            Number(lot.SoLoiBuiBan || 0) > 0 ? `Bụi bẩn: ${lot.SoLoiBuiBan}` : null,
                                            Number(lot.SoLoiConTrung || 0) > 0 ? `Côn trùng: ${lot.SoLoiConTrung}` : null
                                        ].filter(Boolean).join("; ");
                                        return (
                                            <Box key={lot.Id || lotIndex} sx={{ mt: 0.6 }}>
                                                <Typography variant="caption" fontWeight={800}>
                                                    Lot {lot.Lot || "—"} · LXVT {lot.LenhXuatVatTu || "—"} · SL {lot.SoLuong}
                                                </Typography>
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                    {defectText || "Không phát sinh lỗi"}
                                                </Typography>
                                            </Box>
                                        );
                                    }) : "Không phân bổ Lot"}
                                </TableCell>
                                <TableCell align="right">
                                    {Number(plan.SoLuongKeHoach || 0).toLocaleString("vi-VN")} / {plan.SoLuongThucTe == null ? "Chưa nhập" : Number(plan.SoLuongThucTe).toLocaleString("vi-VN")} / <b>{Number(plan.SoLuongHieuLuc || 0).toLocaleString("vi-VN")}</b>
                                    <br /><Typography variant="caption" color="text.secondary">Chênh: {plan.ChenhLechSoLuong == null ? "—" : Number(plan.ChenhLechSoLuong).toLocaleString("vi-VN")}</Typography>
                                </TableCell>
                                <TableCell align="right">{Number(plan.TongLoi || 0).toLocaleString("vi-VN")}</TableCell>
                                <TableCell align="right">{Number(plan.SoLuongHieuLuc || 0) <= 0 ? <Chip size="small" color="warning" label="SL hiệu lực = 0" /> : `${(Number(plan.TongLoi || 0) * 100 / Number(plan.SoLuongHieuLuc)).toFixed(2)}%`}</TableCell>
                                <TableCell>
                                    {labels.length ? (
                                        <Stack spacing={0.45}>
                                            {labels.map((item) => (
                                                <Typography key={item.key} variant="caption" sx={{ lineHeight: 1.25 }}>
                                                    <b>{item.label}</b>: {formatQuantity(item.quantity)}
                                                </Typography>
                                            ))}
                                        </Stack>
                                    ) : "Không phát sinh"}
                                </TableCell>
                                <TableCell>
                                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                                        {labels.length > 0 && (
                                            <Button
                                                size="small"
                                                variant={expanded ? "contained" : "outlined"}
                                                color="inherit"
                                                endIcon={<ExpandMoreIcon sx={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 160ms" }} />}
                                                onClick={() => togglePlanDetails(plan.Id)}
                                            >
                                                Chi tiết
                                            </Button>
                                        )}
                                        {canEdit && (
                                            <>
                                            <Button size="small" variant="outlined" onClick={() => setEditingPlan(plan)}>Nhập</Button>
                                            <Button size="small" color="error" onClick={() => removePlan(plan.Id)}>Xóa</Button>
                                            </>
                                        )}
                                    </Stack>
                                </TableCell>
                            </TableRow>
                            {labels.length > 0 && (
                                <TableRow>
                                    <TableCell colSpan={10} sx={{ p: 0, borderBottom: expanded ? undefined : 0, bgcolor: "grey.50" }}>
                                        <Collapse in={expanded} unmountOnExit>
                                            <Box sx={{ p: 1.5 }}><PlanDefectDetails plan={plan} onOpenImages={openImages} /></Box>
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            )}
                            </Fragment>
                            );
                        })}
                        {!data.plans.length && <TableRow><TableCell colSpan={10} align="center" sx={{ py: 6, color: "text.secondary" }}>Phiếu chưa có kế hoạch.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </TableContainer>

            <InspectionPrintCompareDialog
                open={printOpen}
                onClose={() => setPrintOpen(false)}
                title="Xem trước phiếu công đoạn"
                onPrintNew={handlePrintNew}
                onPrintOld={handlePrintOld}
                newContent={(
                    <UnifiedInspectionPrintTemplate
                        ref={newPrintRef}
                        kind="cong-doan"
                        phieu={phieu}
                        plans={data.plans}
                        xacNhans={data.xacNhans}
                    />
                )}
                oldContent={(
                    <CongDoanPrintTemplate
                        ref={oldPrintRef}
                        phieu={phieu}
                        plans={data.plans}
                        xacNhans={data.xacNhans}
                    />
                )}
            />
            <ResponsiveInspectionDialog
                open={addPlanOpen}
                onClose={addingPlan ? undefined : () => setAddPlanOpen(false)}
                maxWidth="md"
            >
                <DialogTitle>
                    Chọn kế hoạch ngày {formatDate(data.phieu?.NgayKiem)}
                    <Typography variant="body2" color="text.secondary">
                        {candidatePlans.length} kế hoạch phù hợp
                    </Typography>
                </DialogTitle>
                <DialogContent dividers sx={{ pb: { xs: 11, sm: 2 } }}>
                    <Stack spacing={1.5}>
                        <TextField
                            fullWidth
                            value={planSearch}
                            onChange={(event) => setPlanSearch(event.target.value)}
                            placeholder="Tìm ID, đơn hàng, sản phẩm, quy trình..."
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    )
                                }
                            }}
                        />
                        {processOptions.length > 0 && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    QUY TRÌNH SẢN XUẤT
                                </Typography>
                                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
                                    <Chip
                                        clickable
                                        label="Tất cả"
                                        color={!processFilter ? "primary" : "default"}
                                        variant={!processFilter ? "filled" : "outlined"}
                                        onClick={() => setProcessFilter("")}
                                    />
                                    {processOptions.map((process) => (
                                        <Chip
                                            key={process}
                                            clickable
                                            label={process}
                                            color={processFilter === process ? "primary" : "default"}
                                            variant={processFilter === process ? "filled" : "outlined"}
                                            onClick={() => setProcessFilter(process)}
                                        />
                                    ))}
                                </Stack>
                            </Box>
                        )}
                        {!candidatePlans.length ? (
                            <Alert severity="info">Không còn kế hoạch phù hợp với phiếu công đoạn này.</Alert>
                        ) : (
                            <Stack spacing={1}>
                                {candidatePlans.map((plan) => {
                                    const planId = sourcePlanId(plan);
                                    const selected = Number(selectedSourcePlan) === planId;
                                    return (
                                        <Card
                                            key={`${planId}-${plan.SanPhamId || planCode(plan)}`}
                                            variant="outlined"
                                            sx={{
                                                borderColor: selected ? "primary.main" : "divider",
                                                borderWidth: selected ? 2 : 1,
                                                bgcolor: selected ? "rgba(37, 99, 235, 0.05)" : "background.paper"
                                            }}
                                        >
                                            <CardActionArea onClick={() => setSelectedSourcePlan(planId)}>
                                                <CardContent sx={{ p: { xs: 1.25, sm: 1.5 } }}>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                                        <Box sx={{ minWidth: 0 }}>
                                                            <Typography variant="caption" color="primary" fontWeight={800}>
                                                                Kế hoạch #{planId}
                                                            </Typography>
                                                            <Typography
                                                                variant="body2"
                                                                fontWeight={800}
                                                                sx={{
                                                                    mt: 0.25,
                                                                    lineHeight: 1.25,
                                                                    display: "-webkit-box",
                                                                    WebkitBoxOrient: "vertical",
                                                                    WebkitLineClamp: 2,
                                                                    overflow: "hidden"
                                                                }}
                                                            >
                                                                {[planCode(plan), plan.TenSanPham].filter(Boolean).join(" · ")
                                                                    || "Chưa có thông tin sản phẩm"}
                                                            </Typography>
                                                        </Box>
                                                        <Radio
                                                            checked={selected}
                                                            value={planId}
                                                            onChange={() => setSelectedSourcePlan(planId)}
                                                            inputProps={{ "aria-label": `Chọn kế hoạch ${planId}` }}
                                                        />
                                                    </Stack>

                                                    <Box
                                                        sx={{
                                                            display: "grid",
                                                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                                            columnGap: { xs: 1, sm: 2 },
                                                            rowGap: 0.75,
                                                            mt: 1
                                                        }}
                                                    >
                                                        {[
                                                            ["Quy trình", planProcess(plan) || "---"],
                                                            ["Số lượng KH", formatQuantity(plan.SoLuongKeHoach)],
                                                            ["Đơn hàng", planOrder(plan) || "---"],
                                                            ["Lot / LXVT", [plan.Lot, plan.LenhXuatVatTu].filter(Boolean).join(" · ") || "---"],
                                                            ["Đơn vị", plan.Ten_DonVi || plan.TenDonVi || "---"],
                                                            ["Bộ phận", plan.Ten_BoPhan || plan.TenBoPhan || "---"]
                                                        ].map(([label, value]) => (
                                                            <Box key={label} sx={{ minWidth: 0 }}>
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                    sx={{ display: "block", lineHeight: 1.1 }}
                                                                >
                                                                    {label}
                                                                </Typography>
                                                                <Typography
                                                                    variant="body2"
                                                                    fontWeight={label === "Số lượng KH" ? 800 : 600}
                                                                    sx={{
                                                                        mt: 0.2,
                                                                        lineHeight: 1.25,
                                                                        overflowWrap: "anywhere"
                                                                    }}
                                                                >
                                                                    {value}
                                                                </Typography>
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                </CardContent>
                                            </CardActionArea>
                                        </Card>
                                    );
                                })}
                            </Stack>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{
                    position: { xs: "fixed", sm: "static" },
                    left: 0,
                    right: 0,
                    bottom: 0,
                    bgcolor: "background.paper",
                    borderTop: { xs: "1px solid rgba(15, 23, 42, 0.12)", sm: 0 },
                    pb: { xs: "calc(10px + env(safe-area-inset-bottom))", sm: 1.5 }
                }}>
                    <Button onClick={() => setAddPlanOpen(false)} disabled={addingPlan}>Hủy</Button>
                    <Button variant="contained" disabled={!selectedSourcePlan || addingPlan} onClick={addPlan}>
                        {addingPlan ? "Đang thêm..." : selectedSourcePlan ? `Thêm kế hoạch #${selectedSourcePlan}` : "Thêm"}
                    </Button>
                </DialogActions>
            </ResponsiveInspectionDialog>
            <Dialog open={completeOpen} onClose={completing ? undefined : () => setCompleteOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Hoàn tất phiếu công đoạn</DialogTitle>
                <DialogContent dividers><Typography>Chọn kết luận thực tế của phiếu.</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setCompleteOpen(false)} disabled={completing}>Hủy</Button>
                    <Button color="error" variant="outlined" disabled={completing} onClick={() => complete("KHONG_DAT")}>Không đạt</Button>
                    <Button color="success" variant="contained" disabled={completing} onClick={() => complete("DAT")}>Đạt</Button>
                </DialogActions>
            </Dialog>
            <CongDoanPlanEditor
                open={Boolean(editingPlan)}
                phieuId={id}
                sourcePlan={editingPlan}
                onClose={() => setEditingPlan(null)}
                onSaved={() => load({ background: true })}
            />
            <DefectImageGalleryDialog
                images={gallery.images}
                index={gallery.index}
                onChangeIndex={(index) => setGallery((current) => ({ ...current, index }))}
                onClose={() => setGallery({ images: [], index: 0 })}
            />
        </Box>
    );
}
