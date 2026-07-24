import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Paper, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Typography
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddTaskIcon from "@mui/icons-material/AddTask";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PrintIcon from "@mui/icons-material/Print";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { useNavigate, useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import {
    approveCongDoanPhieu, createCongDoanBienBan, getCongDoanPhieuDetail
} from "../../../api/phieuKiem.api";
import { getCurrentUser } from "../../../utils/auth";
import CongDoanPrintTemplate from "../components/CongDoanPrintTemplate";

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

export default function CongDoanDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const printRef = useRef(null);
    const [data, setData] = useState({ phieu: null, plans: [], xacNhans: [] });
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(false);
    const [creatingBienBan, setCreatingBienBan] = useState(false);
    const [printOpen, setPrintOpen] = useState(false);
    const user = getCurrentUser();

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getCongDoanPhieuDetail(id);
            setData(response.data || { phieu: null, plans: [], xacNhans: [] });
        } catch (error) {
            window.alert(error.response?.data?.message || "Không tải được phiếu công đoạn.");
        } finally {
            setLoading(false);
        }
    }, [id]);
    useEffect(() => { load(); }, [load]);

    const totals = useMemo(() => ({
        plans: data.plans.length,
        quantity: data.plans.reduce((sum, item) => sum + Number(item.SoLuongKeHoach || 0), 0),
        defects: data.plans.reduce((sum, item) => sum + Number(item.TongLoi || 0), 0)
    }), [data.plans]);
    const canApprove = data.phieu?.TrangThai === "CHO_TBP_DUYET"
        && user?.permissions?.includes("PHAN_CONG_NGUOI_XU_LY")
        && (Number(user?.boPhanId) === Number(data.phieu?.BoPhanDuyetId) || user?.permissions?.includes("QUAN_TRI_DM"));
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: data.phieu?.SoPhieu ? `CongDoan_${data.phieu.SoPhieu}` : "PhieuKiemCongDoan"
    });
    const approve = async () => {
        if (!window.confirm("Duyệt phiếu kiểm công đoạn này?")) return;
        try {
            setApproving(true);
            await approveCongDoanPhieu(id);
            await load();
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
            await load();
            if (bienBanId) navigate(`/bien-ban/${bienBanId}`);
        } catch (error) {
            window.alert(error.response?.data?.message || "Không sinh được biên bản KPH.");
        } finally {
            setCreatingBienBan(false);
        }
    };

    if (loading) return <Box sx={{ py: 10, textAlign: "center" }}><CircularProgress /></Box>;
    if (!data.phieu) return <Alert severity="error">Không tìm thấy phiếu kiểm công đoạn.</Alert>;

    const phieu = data.phieu;
    const state = statusMeta[phieu.TrangThai] || [phieu.TrangThai, "default"];
    return (
        <Box>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate("/phieu-kiem/cong-doan")}>Quay lại</Button>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>Phiếu công đoạn {phieu.SoPhieu}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.8 }}>
                            <Chip size="small" label={state[0]} color={state[1]} />
                            <Typography variant="body2" color="text.secondary">{formatDate(phieu.NgayKiem)} · {phieu.TenNguoiTao || "---"}</Typography>
                        </Stack>
                    </Box>
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
                    {canApprove && <Button variant="contained" startIcon={<TaskAltIcon />} disabled={approving} onClick={approve}>Duyệt phiếu</Button>}
                    {phieu.KetLuan === "KHONG_DAT" && phieu.BienBanId ? (
                        <Button
                            variant="outlined"
                            startIcon={<AssignmentIcon />}
                            onClick={() => navigate(`/bien-ban/${phieu.BienBanId}`)}
                        >
                            Xem biên bản KPH
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
                                Sinh biên bản KPH
                            </Button>
                        ) : null}
                    <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => setPrintOpen(true)}>In BM.03-QT.03-B8</Button>
                </Stack>
            </Stack>

            <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
                    <Box><Typography variant="caption" color="text.secondary">PHÂN XƯỞNG</Typography><Typography fontWeight={700}>{phieu.PhanXuong || "---"}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">TỔ / MÁY</Typography><Typography fontWeight={700}>{phieu.ToMay || "---"}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">SỐ KẾ HOẠCH</Typography><Typography fontWeight={700}>{totals.plans}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">TỔNG SL KIỂM</Typography><Typography fontWeight={700}>{totals.quantity.toLocaleString("vi-VN")}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">TỔNG LỖI</Typography><Typography fontWeight={700}>{totals.defects.toLocaleString("vi-VN")}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">KẾT LUẬN</Typography><Typography fontWeight={700}>{conclusionLabel[phieu.KetLuan] || phieu.KetLuan || "---"}</Typography></Box>
                </Stack>
            </Paper>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead><TableRow>
                        <TableCell>ID kế hoạch</TableCell><TableCell>Ngày / KCS / Công nhân</TableCell><TableCell>Sản phẩm</TableCell><TableCell>Đơn vị / bộ phận</TableCell>
                        <TableCell>Đơn hàng / LOT / LXVT</TableCell><TableCell align="right">SL kiểm</TableCell>
                        <TableCell align="right">SL lỗi</TableCell><TableCell align="right">Tỷ lệ lỗi</TableCell><TableCell>Lỗi ghi nhận</TableCell>
                    </TableRow></TableHead>
                    <TableBody>
                        {data.plans.map((plan) => (
                            <TableRow key={plan.Id}>
                                <TableCell sx={{ fontWeight: 800, color: "primary.main" }}>#{plan.ID_KeHoachSanXuat}</TableCell>
                                <TableCell>
                                    {formatDate(plan.NgayKeHoach)}<br />
                                    <Typography variant="caption" color="text.secondary">KCS: {plan.TenNguoiGhiNhan || "---"}</Typography><br />
                                    <Typography variant="caption" fontWeight={700}>
                                        CN: {[...new Set((plan.Defects || []).map((item) => item.TenCongNhan).filter(Boolean))].join(", ") || "---"}
                                    </Typography>
                                </TableCell>
                                <TableCell><b>{plan.MaSanPham || "---"}</b><br />{plan.TenSanPham || "---"}<br /><Typography variant="caption" color="primary">Quy trình: {plan.TenQuyTrinhSanXuat || "---"}</Typography></TableCell>
                                <TableCell>{plan.TenDonVi || "---"}<br />{plan.TenBoPhan || "---"}</TableCell>
                                <TableCell>{plan.MaDonHang || "---"}<br />LOT: {plan.Lot || "---"}<br />LXVT: {plan.LenhXuatVatTu || "---"}</TableCell>
                                <TableCell align="right">{Number(plan.SoLuongKeHoach || 0).toLocaleString("vi-VN")}</TableCell>
                                <TableCell align="right">{Number(plan.TongLoi || 0).toLocaleString("vi-VN")}</TableCell>
                                <TableCell align="right">{plan.TyLeLoi == null ? <Chip size="small" color="warning" label="SL kế hoạch = 0" /> : `${Number(plan.TyLeLoi).toFixed(2)}%`}</TableCell>
                                <TableCell>
                                    {[
                                        ...(plan.Defects || []).map((item) => `${item.TenCongNhan ? `${item.TenCongNhan} - ` : ""}${item.MaLoi || item.TenLoi}: ${item.SoLuong}`),
                                        Number(plan.SoLoiBuiBan || 0) > 0 ? `Bụi bẩn: ${plan.SoLoiBuiBan}` : null,
                                        Number(plan.SoLoiConTrung || 0) > 0 ? `Côn trùng: ${plan.SoLoiConTrung}` : null
                                    ].filter(Boolean).join("; ") || "Không phát sinh"}
                                </TableCell>
                            </TableRow>
                        ))}
                        {!data.plans.length && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6, color: "text.secondary" }}>Phiếu chưa có kế hoạch.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={printOpen} onClose={() => setPrintOpen(false)} fullWidth maxWidth={false} PaperProps={{ sx: { width: "96vw", maxWidth: "none" } }}>
                <DialogTitle>Xem trước phiếu công đoạn</DialogTitle>
                <DialogContent dividers sx={{ overflow: "auto", bgcolor: "#e5e7eb" }}>
                    <Box sx={{ width: "fit-content", mx: "auto", boxShadow: 3 }}><CongDoanPrintTemplate ref={printRef} phieu={phieu} plans={data.plans} xacNhans={data.xacNhans} /></Box>
                </DialogContent>
                <DialogActions><Button onClick={() => setPrintOpen(false)}>Đóng</Button><Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>In</Button></DialogActions>
            </Dialog>
        </Box>
    );
}
