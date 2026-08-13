import { useEffect, useMemo, useRef, useState } from "react";
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
    Divider,
    Grid,
    Paper,
    Stack,
    Typography
} from "@mui/material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PrintIcon from "@mui/icons-material/Print";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AddTaskIcon from "@mui/icons-material/AddTask";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import {
    approveCuoiChuyen,
    completeCuoiChuyen,
    createCuoiChuyenBienBan,
    getPhieuKiemDetail
} from "../../../api/phieuKiem.api";
import { getCurrentUser } from "../../../utils/auth";
import CuoiChuyenPrintTemplate from "../components/CuoiChuyenPrintTemplate";
import InspectionPrintCompareDialog from "../components/InspectionPrintCompareDialog";
import UnifiedInspectionPrintTemplate from "../components/UnifiedInspectionPrintTemplate";
import CuoiChuyenPlanEditor from "../components/CuoiChuyenPlanEditor";
import DeletePhieuKiemButton from "../components/DeletePhieuKiemButton";

const getFieldValue = (dynamicFields = [], name) =>
    dynamicFields.find((field) => field?.FieldName === name)?.FieldValue ?? "";

const APPROVE_BOPHAN_FIELD = "CuoiChuyen_ApproveBoPhanId";
const COMPLETED_BY_FIELD = "CuoiChuyen_CompletedByUserId";
const getUserId = (value) => Number(value?.id || value?.userId || value?.UserId || 0) || null;

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
    if (trangThai === "CHO_TBP_DUYET") return { label: "Chờ Trưởng bộ phận", color: "secondary" };
    if (trangThai === "DANG_KIEM") return { label: "Đang kiểm", color: "info" };
    if (trangThai === "TAO_MOI") return { label: "Mới tạo", color: "default" };
    return { label: trangThai || "---", color: ketLuan === "KHONG_DAT" ? "error" : "default" };
};

function StatCard({ icon, label, value, accent = "#2563eb" }) {
    return (
        <Paper variant="outlined" sx={{ p: 2, height: "100%", borderColor: "#dbe4f0", borderRadius: 2.5, bgcolor: "#fff" }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: `${accent}14`, color: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
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

export default function CuoiChuyenDetail() {
    const location = useLocation();
    const { id } = useParams();
    const navigate = useNavigate();
    const returnToList = () => navigate(location.state?.returnTo || "/phieu-kiem");
    const oldPrintRef = useRef();
    const newPrintRef = useRef();

    const [loading, setLoading] = useState(true);
    const [creatingBienBan, setCreatingBienBan] = useState(false);
    const [approving, setApproving] = useState(false);
    const [phieu, setPhieu] = useState(null);
    const [plans, setPlans] = useState([]);
    const [summary, setSummary] = useState(null);
    const [dynamicFields, setDynamicFields] = useState([]);
    const [xacNhans, setXacNhans] = useState([]);
    const [capabilities, setCapabilities] = useState({});
    const [openPrint, setOpenPrint] = useState(false);
    const [editingPlanId, setEditingPlanId] = useState(null);
    const [completeOpen, setCompleteOpen] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [currentUser] = useState(() => getCurrentUser());

    const handlePrintOld = useReactToPrint({
        contentRef: oldPrintRef,
        documentTitle: phieu?.SoPhieu ? `CuoiChuyen_${phieu.SoPhieu}_MauCu` : "PhieuKiemCuoiChuyen_MauCu"
    });
    const handlePrintNew = useReactToPrint({
        contentRef: newPrintRef,
        documentTitle: phieu?.SoPhieu ? `CuoiChuyen_${phieu.SoPhieu}_MauMoi` : "PhieuKiemCuoiChuyen_MauMoi"
    });

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async ({ background = false } = {}) => {
        try {
            if (!background) setLoading(true);
            const res = await getPhieuKiemDetail(id);
            const data = res.data || {};
            if (data?.phieu?.LoaiKiemId !== 3) {
                navigate(`/phieu-kiem/${id}`, { replace: true });
                return;
            }
            setPhieu(data.phieu || null);
            setPlans(Array.isArray(data.plans) ? data.plans : []);
            setSummary(data.summary || null);
            setDynamicFields(data.dynamicFields || []);
            setXacNhans(Array.isArray(data.xacNhans) ? data.xacNhans : []);
            setCapabilities(data.capabilities || {});
        } catch (error) {
            console.error(error);
        } finally {
            if (!background) setLoading(false);
        }
    };

    const totals = useMemo(() => {
        const allDefects = plans.flatMap((plan) => plan.Defects || []);
        return {
            planCount: plans.length,
            defectRows: allDefects.length,
            defectQty: allDefects.reduce((sum, defect) => sum + (Number(defect.SoLuong) || 0), 0)
                + plans.reduce((sum, plan) => sum + Number(plan.SoLoiBuiBan || 0) + Number(plan.SoLoiConTrung || 0), 0),
            repairedPass: allDefects.reduce((sum, defect) => sum + (Number(defect.SoLuongDatSauSua) || 0), 0),
            repairedFail: allDefects.reduce((sum, defect) => sum + (Number(defect.SoLuongKhongDatSauSua) || 0), 0)
        };
    }, [plans]);

    const approveBoPhanId = Number(getFieldValue(dynamicFields, APPROVE_BOPHAN_FIELD) || 0) || null;
    const completedByUserId = Number(getFieldValue(dynamicFields, COMPLETED_BY_FIELD) || 0) || null;
    const isCompletedByCurrentUser = completedByUserId && getUserId(currentUser) === completedByUserId;
    const canApprove = Boolean(
        !isCompletedByCurrentUser &&
        phieu?.TrangThai === "CHO_TBP_DUYET" && (
            currentUser?.permissions?.includes("QUAN_TRI_DM") || (
                currentUser?.permissions?.includes("PHAN_CONG_NGUOI_XU_LY") &&
                approveBoPhanId &&
                Number(currentUser?.boPhanId) === approveBoPhanId
            )
        )
    );

    const handleApprove = async () => {
        if (!window.confirm("Duyệt phiếu kiểm cuối chuyền này?")) return;
        try {
            setApproving(true);
            await approveCuoiChuyen(id);
            await loadData({ background: true });
        } catch (error) {
            window.alert(error?.response?.data?.message || "Không thể duyệt phiếu.");
        } finally {
            setApproving(false);
        }
    };

    const handleCreateBienBan = async () => {
        try {
            setCreatingBienBan(true);
            const res = await createCuoiChuyenBienBan(id);
            const bienBanId = res?.data?.bienBanId;
            await loadData({ background: true });
            if (bienBanId) {
                navigate(`/bien-ban/${bienBanId}`);
            }
        } catch (error) {
            window.alert(error?.response?.data?.message || "Không thể sinh biên bản.");
        } finally {
            setCreatingBienBan(false);
        }
    };

    const canEdit = capabilities.canEdit ?? Boolean(
        currentUser?.permissions?.includes("THUC_HIEN_KIEM")
        && !["HOAN_TAT", "CHO_TBP_DUYET", "CHO_KIEM_NGHIEM", "CHO_XUONG_XAC_NHAN"].includes(phieu?.TrangThai)
    );

    const handleComplete = async (ketLuan) => {
        try {
            setCompleting(true);
            await completeCuoiChuyen(id, ketLuan);
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
            <Container sx={{ py: 4, textAlign: "center" }}>
                <CircularProgress />
            </Container>
        );
    }

    if (!phieu) {
        return (
            <Container sx={{ py: 4 }}>
                <Alert severity="error">Không tìm thấy phiếu kiểm cuối chuyền.</Alert>
            </Container>
        );
    }

    const status = statusMeta(phieu.TrangThai, phieu.KetLuan);

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} spacing={2} sx={{ mb: 3 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Button startIcon={<ArrowBackIcon />} onClick={returnToList} color="inherit">
                        Quay lại
                    </Button>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>
                            Phiếu kiểm cuối chuyền {phieu.SoPhieu}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
                            <Chip label={status.label} color={status.color} size="small" />
                            <Typography variant="body2" color="text.secondary">
                                {phieu.TenNguoiKiem || "---"} • {formatDate(phieu.CreatedAt)}
                            </Typography>
                        </Stack>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <DeletePhieuKiemButton phieuKiemId={id} soPhieu={phieu?.SoPhieu} onDeleted={returnToList} />
                    <Button startIcon={<PrintIcon />} variant="outlined" onClick={() => setOpenPrint(true)}>
                        In phiếu
                    </Button>
                    {canApprove ? (
                        <Button startIcon={<AddTaskIcon />} variant="contained" color="secondary" onClick={handleApprove} disabled={approving}>
                            Duyệt TBP
                        </Button>
                    ) : null}
                    {canEdit && (
                        <Button variant="contained" color="success" onClick={() => setCompleteOpen(true)}>
                            Hoàn tất phiếu
                        </Button>
                    )}
                    {phieu?.BienBanId ? (
                        <Button
                            startIcon={<AssignmentIcon />}
                            variant="outlined"
                            onClick={() => navigate(`/bien-ban/${phieu.BienBanId}`)}
                        >
                            Xem biên bản KPH
                        </Button>
                    ) : (
                        <Button
                            startIcon={<AssignmentIcon />}
                            variant="contained"
                            color="error"
                            onClick={handleCreateBienBan}
                            disabled={creatingBienBan || totals.defectQty <= 0}
                        >
                            Sinh biên bản
                        </Button>
                    )}
                </Stack>
            </Stack>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 2.4 }}>
                    <StatCard icon={<Inventory2OutlinedIcon />} label="Kế hoạch" value={summary?.TotalPlans ?? totals.planCount} />
                </Grid>
                <Grid size={{ xs: 12, md: 2.4 }}>
                    <StatCard icon={<ReportProblemOutlinedIcon />} label="Dòng lỗi" value={summary?.TotalDefectRows ?? totals.defectRows} accent="#f97316" />
                </Grid>
                <Grid size={{ xs: 12, md: 2.4 }}>
                    <StatCard icon={<ErrorOutlineOutlinedIcon />} label="Tổng lỗi" value={totals.defectQty} accent="#dc2626" />
                </Grid>
                <Grid size={{ xs: 12, md: 2.4 }}>
                    <StatCard icon={<CheckCircleOutlineOutlinedIcon />} label="Đạt sau sửa" value={totals.repairedPass} accent="#16a34a" />
                </Grid>
                <Grid size={{ xs: 12, md: 2.4 }}>
                    <StatCard icon={<ErrorOutlineOutlinedIcon />} label="Không đạt" value={totals.repairedFail} accent="#be123c" />
                </Grid>
            </Grid>

            <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2.5 }}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 3 }}>
                        <InfoLine label="Loại kiểm" value={phieu.TenLoaiKiem || "Kiểm cuối chuyền"} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                        <InfoLine label="Ngày kiểm" value={formatDate(phieu.NgayKiem || phieu.CreatedAt)} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                        <InfoLine label="Mức kiểm tra" value={phieu.MucDoKiemTra} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                        <InfoLine label="Kết luận" value={phieu.KetLuan} />
                    </Grid>
                </Grid>
            </Paper>

            <Stack spacing={2}>
                {plans.length === 0 ? (
                    <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2.5 }}>
                        <Typography color="text.secondary">Phiếu chưa có kế hoạch sản xuất.</Typography>
                    </Paper>
                ) : plans.map((plan, index) => {
                    const defects = Array.isArray(plan.Defects) ? plan.Defects : [];
                    const defectQty = defects.reduce((sum, defect) => sum + (Number(defect.SoLuong) || 0), 0)
                        + Number(plan.SoLoiBuiBan || 0) + Number(plan.SoLoiConTrung || 0);
                    return (
                        <Card key={plan.Id || index} variant="outlined" sx={{ borderRadius: 2.5 }}>
                            <CardContent>
                                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
                                    <Box>
                                        <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 800 }}>
                                            Kế hoạch #{plan.ID_KeHoachSanXuat}
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
                                            {plan.MaSanPham} - {plan.TenSanPham}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {plan.TenDonVi || "---"} {plan.TenBoPhan ? `• ${plan.TenBoPhan}` : ""} • {formatDate(plan.NgayKeHoach)}
                                        </Typography>
                                        <Typography variant="body2" color="primary.main" fontWeight={600}>
                                            Quy trình: {plan.Ten_QuyTrinhSanXuat || plan.TenQuyTrinhSanXuat || "---"}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Đơn hàng: {plan.MaDonHang || plan.Ma_DonHang || "---"} • LOT: {plan.Lot || "---"} • LXVT: {plan.LenhXuatVatTu || "---"}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        <Chip label={`KH: ${plan.SoLuongKeHoach ?? "---"}`} size="small" />
                                        <Chip label={`TT: ${plan.SoLuongThucTe ?? "Chưa nhập"}`} size="small" color={plan.SoLuongThucTe == null ? "default" : "primary"} />
                                        <Chip label={`Hiệu lực: ${plan.SoLuongHieuLuc ?? plan.SoLuongKeHoach ?? "---"}`} size="small" color="success" variant="outlined" />
                                        <Chip label={`Chênh: ${plan.ChenhLechSoLuong ?? "—"}`} size="small" variant="outlined" />
                                        <Chip label={`NSDK: ${plan.NangSuatDuKien ?? "---"}`} size="small" />
                                        <Chip label={`Đã SX: ${plan.DaSanXuat ?? "---"}`} size="small" />
                                        <Chip label={`Lỗi: ${defectQty}`} size="small" color={defectQty > 0 ? "error" : "default"} />
                                        <Chip label={`Bụi bẩn: ${plan.SoLoiBuiBan || 0}`} size="small" variant="outlined" />
                                        <Chip label={`Côn trùng: ${plan.SoLoiConTrung || 0}`} size="small" variant="outlined" />
                                        {canEdit && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<EditOutlinedIcon />}
                                                onClick={() => setEditingPlanId(plan.Id)}
                                            >
                                                Nhập kết quả
                                            </Button>
                                        )}
                                    </Stack>
                                </Stack>

                                <Divider sx={{ my: 2 }} />

                                {defects.length === 0 ? (
                                    <Typography color="text.secondary">Chưa ghi nhận lỗi cho kế hoạch này.</Typography>
                                ) : (
                                    <Grid container spacing={1.5}>
                                        {defects.map((defect) => (
                                            <Grid key={defect.Id || `${plan.Id}-${defect.DefectId}`} size={{ xs: 12, md: 6 }}>
                                                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f8fafc" }}>
                                                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                                                        <Box>
                                                            <Typography sx={{ fontWeight: 800 }}>
                                                                {defect.MaLoi} - {defect.TenLoi}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {defect.MoTa || defect.GhiChu || "---"}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                Công nhân: {defect.TenCongNhan || "---"}
                                                            </Typography>
                                                        </Box>
                                                        <Chip label={defect.SoLuong} color="error" size="small" />
                                                    </Stack>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Sau sửa: Đạt {defect.SoLuongDatSauSua ?? "—"} / Không đạt {defect.SoLuongKhongDatSauSua ?? "—"}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                        ))}
                                    </Grid>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </Stack>

            <InspectionPrintCompareDialog
                open={openPrint}
                onClose={() => setOpenPrint(false)}
                title="Bản in phiếu kiểm cuối chuyền"
                onPrintNew={handlePrintNew}
                onPrintOld={handlePrintOld}
                newContent={(
                    <UnifiedInspectionPrintTemplate
                        ref={newPrintRef}
                        kind="cuoi-chuyen"
                        phieu={phieu}
                        plans={plans}
                        dynamicFields={dynamicFields}
                        xacNhans={xacNhans}
                    />
                )}
                oldContent={(
                    <CuoiChuyenPrintTemplate
                        ref={oldPrintRef}
                        phieu={phieu}
                        plans={plans}
                        dynamicFields={dynamicFields}
                        xacNhans={xacNhans}
                    />
                )}
            />
            <Dialog open={completeOpen} onClose={completing ? undefined : () => setCompleteOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Hoàn tất phiếu cuối chuyền</DialogTitle>
                <DialogContent dividers>
                    <Typography>Chọn kết luận thực tế để chuyển phiếu sang bước duyệt của Trưởng bộ phận.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCompleteOpen(false)} disabled={completing}>Hủy</Button>
                    <Button color="error" variant="outlined" disabled={completing} onClick={() => handleComplete("KHONG_DAT")}>Không đạt</Button>
                    <Button color="success" variant="contained" disabled={completing} onClick={() => handleComplete("DAT")}>Đạt</Button>
                </DialogActions>
            </Dialog>
            <CuoiChuyenPlanEditor
                open={Boolean(editingPlanId)}
                phieuId={id}
                planId={editingPlanId}
                plans={plans}
                onClose={() => setEditingPlanId(null)}
                onSaved={() => loadData({ background: true })}
            />
        </Container>
    );
}
