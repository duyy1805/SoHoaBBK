// src/features/phieuKiem/pages/PhieuKiemDetail.jsx

import { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Chip,
    Stack,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    CircularProgress,
    Button,
    Fade,
    alpha,
    TextField,
    MenuItem,
    Paper,
    Container,
    Alert,
    IconButton,
    Tooltip
} from "@mui/material";
import { PhieuKiemPrintTemplate } from "../components/PhieuKiemPrintTemplate";
import { PhieuGiamDinhPrintTemplate } from "../components/PhieuGiamDinhPrintTemplate"
import PrintIcon from "@mui/icons-material/Print";
import { useReactToPrint } from "react-to-print";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import ReplayIcon from "@mui/icons-material/Replay";

import {
    getPhieuKiemDetail,
    createAllSection,
    saveCustomFields,
    getThongSoKq,
    completePhieuKiem,
    confirmPX,
    deletePhieuKiem,
    createDongContRetest,
    updatePhieuKiemActualQuantity
} from "../../../api/phieuKiem.api";

import { getSanPhamNhomKiem, getInspectionLevels, updateSanPhamImage, uploadSanPhamImage } from "../../../api/lookup.api"

import { hasPermission } from "../../../utils/auth";
import CheckItemEditor from "../components/CheckItemEditor";
import MeasurementEditor from "../components/MeasurementEditor";

export default function PhieuKiemDetail() {

    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const returnTo = location.state?.returnTo || "/phieu-kiem";
    const returnToList = () => navigate(returnTo);

    const [phieu, setPhieu] = useState(null);
    const [sections, setSections] = useState([]);
    const [checkItems, setCheckItems] = useState([]);
    const [defects, setDefects] = useState([]);
    const [dynamicFields, setDynamicFields] = useState([]);
    const [xacNhans, setXacNhans] = useState([]);
    const [nhomConfigs, setNhomConfigs] = useState([]);
    const [levels, setLevels] = useState([]);
    const [capabilities, setCapabilities] = useState({});
    const [retestInfo, setRetestInfo] = useState(null);

    // Thêm state cho thông số KQ đặc biệt
    const [thongSoList, setThongSoList] = useState([]);
    const [thongSoKqList, setThongSoKqList] = useState([]);

    const [loading, setLoading] = useState(true);
    const [creatingSection, setCreatingSection] = useState(false);
    const [loadingAction, setLoadingAction] = useState(false);
    const [actionNotice, setActionNotice] = useState(null);
    const [actualQuantity, setActualQuantity] = useState("");
    const [savingActualQuantity, setSavingActualQuantity] = useState(false);
    const componentRef = useRef();
    const productImageInputRef = useRef(null);
    const [openPrintModal, setOpenPrintModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [measurementOpen, setMeasurementOpen] = useState(false);

    // Đổi tên hàm của thư viện thành triggerPrint
    const triggerPrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: phieu ? `PhieuKiem_${phieu.SoPhieu}` : 'PhieuKiem',
    });

    const handlePrint = async () => {
        try {
            // 1. Gom dữ liệu từ các thẻ input có className="custom-field"
            const inputs = document.querySelectorAll('.custom-field');
            const fieldsData = {};

            inputs.forEach(input => {
                if (input.name) {
                    fieldsData[input.name] = input.value;
                }
            });

            // 2. Gọi API lưu dữ liệu qua axiosClient
            await saveCustomFields({
                phieuKiemId: phieu.Id,
                fields: fieldsData
            });

            // 3. API chạy thành công thì mới mở popup In của trình duyệt
            triggerPrint();

        } catch (error) {
            console.error("Lỗi khi lưu dữ liệu in:", error);
            // Có thể thay bằng thư viện toast của bạn (ví dụ: toast.error(...))
            alert("Lưu thông tin thất bại. Vui lòng thử lại!");
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async ({ background = false } = {}) => {
        try {
            if (!background) setLoading(true);
            const res = await getPhieuKiemDetail(id);
            const data = res.data;
            if (data?.phieu?.LoaiKiemId === 3) {
                navigate(`/phieu-kiem/cuoi-chuyen/${id}`, { replace: true });
                return;
            }
            if (data?.phieu?.LoaiKiemId === 6) {
                navigate(`/phieu-kiem/tren-chuyen/${id}`, { replace: true });
                return;
            }
            setPhieu(data.phieu);
            setActualQuantity(data.phieu?.SoLuongThucTe == null ? "" : String(data.phieu.SoLuongThucTe));
            setSections(data.sections);
            setCheckItems(data.checkItems);
            setDefects(data.defects);
            setDynamicFields(data.dynamicFields);
            setXacNhans(data.xacNhans || []);
            setCapabilities(data.capabilities || {});
            setRetestInfo(data.retestInfo || null);

            // Lấy thêm thông số kết quả kiểm tra cấp độ đặc biệt
            try {
                const tsRes = await getThongSoKq(id);
                if (tsRes.data) {
                    setThongSoList(tsRes.data.thongSo || []);
                    setThongSoKqList(tsRes.data.ketQua || []);
                }
            } catch (err) {
                console.error("[DEBUG] Lỗi gọi thong-so-kq:", err?.response?.status, err?.response?.data || err.message);
            }

            if (data.phieu?.SanPhamId && data.phieu.TrangThai === "TAO_MOI") {

                const nhomRes = await getSanPhamNhomKiem(data.phieu.SanPhamId);

                const configs = nhomRes.data.map(n => ({
                    nhomKiemId: n.NhomKiemId,
                    tenNhom: n.TenNhom,
                    lotSize: data.phieu.SoLuongHieuLuc ?? data.phieu.SoLuong,
                    inspectionLevel: "II"
                }));
                setNhomConfigs(configs);

                const levelsRes = await getInspectionLevels();
                setLevels(levelsRes.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            if (!background) setLoading(false);
        }
    };

    const handleSaveActualQuantity = async () => {
        try {
            setSavingActualQuantity(true);
            const value = actualQuantity === "" ? null : Number(actualQuantity);
            const response = await updatePhieuKiemActualQuantity(id, value);
            setPhieu((current) => ({ ...current, ...(response.data || {}) }));
            setActionNotice({ type: "success", message: "Đã cập nhật số lượng thực tế." });
        } catch (error) {
            setActionNotice({
                type: "error",
                message: error.response?.data?.message || "Không cập nhật được số lượng thực tế."
            });
        } finally {
            setSavingActualQuantity(false);
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
                maSanPham: phieu?.MaSanPham,
                tenSanPham: phieu?.TenSanPham
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


    const updateConfig = (index, field, value) => {

        const newConfigs = [...nhomConfigs];
        newConfigs[index][field] = value;
        setNhomConfigs(newConfigs);

    };

    const handleCreateSection = async () => {

        try {

            setCreatingSection(true);

            const payload = {

                phieuKiemId: id,

                sections: nhomConfigs.map(n => ({
                    nhomKiemId: n.nhomKiemId,
                    lotSize: Number(n.lotSize),
                    inspectionLevel: n.inspectionLevel
                }))

            };

            await createAllSection(payload);

            await loadData({ background: true });

        } catch (err) {

            console.error(err);

        } finally {

            setCreatingSection(false);

        }

    };

    if (loading) {

        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
                <CircularProgress />
            </Box>
        );

    }

    const renderKetLuanChip = (value) => {

        if (value === "DAT")
            return <Chip label="Đạt" color="success" size="small" />;

        if (value === "KHONG_DAT")
            return <Chip label="Không đạt" color="error" size="small" />;

        if (value === "NA")
            return <Chip label="N/A" color="default" size="small" />;

        return <Chip label="Chưa kết luận" size="small" />;

    };

    const renderTrangThaiChip = (trangThai) => {
        switch (trangThai) {
            case "DA_TAO_SECTION":
                return <Chip label="Chưa kiểm" size="small" />;
            case "DANG_KIEM":
                return <Chip label="Đang kiểm" color="warning" size="small" />;
            case "CHO_XUONG_XAC_NHAN":
                return <Chip label="Chờ Trưởng bộ phận" color="info" size="small" />;
            case "CHO_KIEM_NGHIEM":
                return <Chip label="Chờ Trưởng bộ phận" color="info" size="small" />;
            case "HOAN_TAT":
                return <Chip label="Hoàn tất" color="success" size="small" />;
            default:
                return <Chip label={trangThai} size="small" />;
        }
    };

    const isKCS = hasPermission("THUC_HIEN_KIEM");
    const isLeader = hasPermission("PHAN_BO_KIEM");
    const canEditInspection = capabilities.canEdit ?? (isKCS || isLeader);
    const isPX = hasPermission("XAC_NHAN_PX");
    const canDeletePhieu = hasPermission("XOA_HO_SO_KCS");
    const isAllConfirmed = sections.length > 0 && sections.every(s => s.KetLuan);
    const hasReject = sections.some(s => s.KetLuan === "REJECT");
    const hasSpecialReject = thongSoKqList.some(kq => {
        const ts = thongSoList.find(t => Number(t.Id) === Number(kq.ThongSoId));
        if (!ts || kq.GiaTriDo === null || kq.GiaTriDo === undefined || kq.GiaTriDo === "") return false;
        const num = Number(kq.GiaTriDo);
        const chuan = Number(ts.GiaTriChuan);
        if (Number.isNaN(num) || Number.isNaN(chuan)) return false;
        const min = chuan - Number(ts.DungSaiAm || 0);
        const max = chuan + Number(ts.DungSaiDuong || 0);
        return num < min || num > max;
    });
    const finalResult = (hasReject || hasSpecialReject) ? "KHONG_DAT" : "DAT";
    const getDynamicFieldValue = (fieldName) =>
        (dynamicFields || []).find((field) => field?.FieldName === fieldName)?.FieldValue || "";
    const soDonHang = getDynamicFieldValue("SoDonHang");

    const handleComplete = async () => {
        try {
            setLoadingAction(true);
            setActionNotice(null);
            await completePhieuKiem(id);
            await loadData({ background: true });
            setActionNotice({ type: "success", message: "Xác nhận hoàn tất phiếu kiểm thành công" });
        } catch (err) {
            setActionNotice({
                type: "error",
                message: err?.response?.data?.message || "Không thể hoàn tất phiếu kiểm"
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
            await loadData({ background: true });
            setActionNotice({ type: "success", message: "Xác nhận trưởng bộ phận thành công" });
        } catch (err) {
            setActionNotice({
                type: "error",
                message: err?.response?.data?.message || "Không thể xác nhận trưởng bộ phận"
            });
        } finally {
            setLoadingAction(false);
        }
    };

    const handleDeletePhieu = async () => {
        const confirmed = window.confirm("Phiếu kiểm, toàn bộ dữ liệu kiểm và các biên bản phát sinh từ phiếu sẽ bị xóa cứng, không thể khôi phục. Bạn chắc chắn muốn xóa?");
        if (!confirmed) return;

        try {
            setLoadingAction(true);
            setActionNotice(null);
            await deletePhieuKiem(id);
            returnToList();
        } catch (err) {
            setActionNotice({
                type: "error",
                message: err?.response?.data?.message || "Không thể xoá phiếu kiểm"
            });
        } finally {
            setLoadingAction(false);
        }
    };

    const handleCreateRetest = async () => {
        const confirmed = window.confirm(
            "Phiếu kiểm lại sẽ giữ nguyên lịch đóng cont và KCS phụ trách, nhưng không sao chép AQL, checklist, kết quả, lỗi, ảnh, chữ ký hoặc biên bản. Phiếu cũ vẫn được giữ nguyên. Bạn muốn tiếp tục?"
        );
        if (!confirmed) return;

        try {
            setLoadingAction(true);
            setActionNotice(null);
            const response = await createDongContRetest(id);
            const newId = response.data?.phieuKiemId;
            if (!newId) throw new Error("RETEST_ID_MISSING");
            navigate(`/phieu-kiem/${newId}`, { state: { returnTo } });
        } catch (err) {
            setActionNotice({
                type: "error",
                message: err?.response?.data?.message || "Không thể tạo phiếu kiểm lại"
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

                {/* HEADER */}

                <Paper elevation={0} sx={{ p: 2, mb: 3, borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 10 }}>
                    <Container maxWidth="xl">
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
                            <Button
                                startIcon={<ArrowBackIcon />}
                                onClick={returnToList}
                                color="inherit"
                            >
                                Danh sách phiếu kiểm
                            </Button>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: "center", sm: "flex-end" }}>
                                {capabilities.canRetest && (
                                    <Button
                                        variant="contained"
                                        startIcon={<ReplayIcon />}
                                        onClick={handleCreateRetest}
                                        disabled={loadingAction}
                                    >
                                        {loadingAction ? "Đang tạo..." : "Tạo phiếu kiểm lại"}
                                    </Button>
                                )}
                                {retestInfo?.PhieuKiemTiepTheoId && (
                                    <Button
                                        variant="outlined"
                                        startIcon={<ReplayIcon />}
                                        onClick={() => navigate(`/phieu-kiem/${retestInfo.PhieuKiemTiepTheoId}`, { state: { returnTo } })}
                                    >
                                        {`Phiếu kiểm lại: ${retestInfo.PhieuKiemTiepTheoSoPhieu}`}
                                    </Button>
                                )}
                                {canDeletePhieu && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={handleDeletePhieu}
                                        disabled={loadingAction}
                                    >
                                        {loadingAction ? "Đang xoá..." : "Xóa phiếu"}
                                    </Button>
                                )}
                                {phieu?.BienBanId && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<AssignmentIcon />}
                                        onClick={() => navigate(`/bien-ban/${phieu.BienBanId}`)}
                                    >
                                        Xem biên bản KPH
                                    </Button>
                                )}
                                <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => setOpenPrintModal(true)}>
                                    In phiếu kiểm
                                </Button>
                                {thongSoList.length > 0 && (
                                    <Button
                                        variant="outlined"
                                        startIcon={<ScienceOutlinedIcon />}
                                        onClick={() => setMeasurementOpen(true)}
                                    >
                                        Thông số đặc biệt
                                    </Button>
                                )}
                            </Stack>
                        </Stack>
                    </Container>
                </Paper>
                {Number(retestInfo?.LanKiemLai || 0) > 0 && (
                    <Alert
                        severity="info"
                        icon={<ReplayIcon />}
                        sx={{ mb: 2.5 }}
                        action={retestInfo?.PhieuKiemTruocId ? (
                            <Button
                                color="inherit"
                                size="small"
                                onClick={() => navigate(`/phieu-kiem/${retestInfo.PhieuKiemTruocId}`, { state: { returnTo } })}
                            >
                                Xem phiếu trước
                            </Button>
                        ) : null}
                    >
                        {`Kiểm lại lần ${retestInfo.LanKiemLai} từ ${retestInfo.PhieuKiemTruocSoPhieu || "phiếu trước"}`}
                    </Alert>
                )}
                {/* THÔNG TIN PHIẾU */}

                <Card sx={{ mb: 2.5, borderRadius: 2 }}>
                    <CardContent>

                        <Grid container spacing={2}>

                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2">Số phiếu</Typography>
                                <Typography fontWeight={600}>{phieu?.SoPhieu}</Typography>
                            </Grid>

                            {phieu?.ID_ChungTuNhap && (
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <Typography variant="subtitle2">Mã CT Nhập</Typography>
                                    <Typography fontWeight={600} color="primary">{phieu.ID_ChungTuNhap}</Typography>
                                </Grid>
                            )}

                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2">Tên sản phẩm</Typography>
                                <Typography fontWeight={600}>{phieu?.TenSanPham}</Typography>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2">Itemcode</Typography>
                                <Typography fontWeight={600}>{phieu?.MaSanPham}</Typography>
                            </Grid>

                            {Number(phieu?.LoaiKiemId) === 5 && (
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <Typography variant="subtitle2">Khách hàng</Typography>
                                    <Chip
                                        size="small"
                                        label={phieu?.KhachHang || "Chưa xác định"}
                                        color={phieu?.KhachHang === "IKEA" ? "primary" : phieu?.KhachHang === "DEK" ? "warning" : "default"}
                                    />
                                </Grid>
                            )}

                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2">LOT</Typography>
                                <Typography fontWeight={600}>{phieu?.Lot}</Typography>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2">Số đơn hàng</Typography>
                                <Typography fontWeight={600}>{soDonHang || "---"}</Typography>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2">Số lượng kế hoạch</Typography>
                                <Typography fontWeight={600}>{phieu?.SoLuong}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2">Số lượng thực tế</Typography>
                                {hasPermission("THUC_HIEN_KIEM") && !["HOAN_TAT", "DA_DUYET"].includes(phieu?.TrangThai) ? (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <TextField
                                            size="small"
                                            type="number"
                                            value={actualQuantity}
                                            placeholder="Chưa nhập"
                                            inputProps={{ min: 0, step: 1 }}
                                            onChange={(event) => setActualQuantity(event.target.value.replace(/\D/g, ""))}
                                        />
                                        <Button size="small" variant="outlined" disabled={savingActualQuantity} onClick={handleSaveActualQuantity}>
                                            Lưu
                                        </Button>
                                    </Stack>
                                ) : <Typography fontWeight={600}>{phieu?.SoLuongThucTe ?? "Chưa nhập"}</Typography>}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2">Số lượng hiệu lực</Typography>
                                <Typography fontWeight={700} color="primary">{phieu?.SoLuongHieuLuc ?? phieu?.SoLuong ?? 0}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2">Chênh lệch</Typography>
                                <Typography fontWeight={600}>{phieu?.ChenhLechSoLuong ?? "Chưa nhập"}</Typography>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2">Người kiểm</Typography>
                                <Typography fontWeight={600}>{phieu?.TenNguoiKiem}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2">Trạng thái</Typography>
                                {renderTrangThaiChip(phieu?.TrangThai)}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2">Kết luận</Typography>
                                {renderKetLuanChip(phieu?.KetLuan)}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2">Mức độ kiểm tra</Typography>
                                <Typography fontWeight={600} color="secondary">{phieu?.MucDoKiemTra || "Chưa xác định"}</Typography>
                            </Grid>
                        </Grid>

                    </CardContent>
                </Card>

                {/* CẤU HÌNH AQL */}

                {phieu?.TrangThai === "TAO_MOI" &&
                    hasPermission("PHAN_BO_KIEM") && (

                        <Card sx={{ mb: 2.5, p: 2 }}>

                            <Typography variant="h6" sx={{ mb: 2 }}>
                                Cấu hình AQL theo nhóm kiểm
                            </Typography>

                            {nhomConfigs.map((n, index) => (

                                <Grid container spacing={2} key={n.nhomKiemId} sx={{ mb: 2 }}>

                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <Typography sx={{ mt: 1 }}>
                                            {n.tenNhom}
                                        </Typography>
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <TextField
                                            label="Lot Size"
                                            type="number"
                                            fullWidth
                                            value={n.lotSize}
                                            onChange={(e) =>
                                                updateConfig(index, "lotSize", e.target.value)
                                            }
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <TextField
                                            select
                                            label="Inspection Level"
                                            fullWidth
                                            value={n.inspectionLevel || ""}
                                            onChange={(e) =>
                                                updateConfig(index, "inspectionLevel", e.target.value)
                                            }
                                        >
                                            {levels.map((lv) => (
                                                <MenuItem
                                                    key={lv.InspectionLevel}
                                                    value={lv.InspectionLevel}
                                                >
                                                    {lv.InspectionLevel}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </Grid>

                                </Grid>

                            ))}

                            <Button
                                variant="contained"
                                onClick={handleCreateSection}
                                disabled={creatingSection}
                            >
                                {creatingSection ? "Đang tạo..." : "Tạo Section"}
                            </Button>

                        </Card>

                    )}

                {/* SECTION */}

                {sections.map(section => {

                    const sectionItems = checkItems.filter(
                        c => c.SectionId === section.Id
                    );

                    return (

                        <Accordion defaultExpanded key={section.Id} sx={{ mb: 2 }}>

                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>

                                <Stack direction="row" spacing={2} alignItems="center">

                                    <AssignmentIcon color="primary" />

                                    <Typography fontWeight={600}>
                                        {section.TenNhom}
                                    </Typography>

                                    <Chip
                                        label={`Mẫu: ${section.SoLuongKiem}`}
                                        size="small"
                                    />

                                </Stack>

                            </AccordionSummary>

                            <AccordionDetails>

                                {sectionItems.map(item => {

                                    // const itemDefects = defects.filter(
                                    //     d => d.CheckItemId === item.Id
                                    // );

                                    const totalLoi = item.SoLuongLoi || 0;
                                    const canEditItem = canEditInspection
                                        && !section.KetLuan
                                        && ["DA_TAO_SECTION", "DANG_KIEM"].includes(phieu?.TrangThai);
                                    const statusConfig = item.KetQua === "DAT"
                                        ? {
                                            label: "Đạt",
                                            color: "success",
                                            borderColor: "success.light",
                                            bgcolor: alpha("#22c55e", 0.05)
                                        }
                                        : item.KetQua === "KHONG_DAT"
                                            ? {
                                                label: "Có lỗi",
                                                color: "error",
                                                borderColor: "error.light",
                                                bgcolor: alpha("#ef4444", 0.05)
                                            }
                                            : item.KetQua === "NA"
                                                ? {
                                                    label: "N/A",
                                                    color: "default",
                                                    borderColor: "grey.300",
                                                    bgcolor: "grey.50"
                                                }
                                                : {
                                                    label: "Chưa kiểm",
                                                    color: "default",
                                                    borderColor: "divider",
                                                    bgcolor: "background.paper"
                                                };

                                    return (

                                        <Card
                                            key={item.Id}
                                            sx={{
                                                mb: 1,
                                                px: { xs: 1.25, sm: 1.5 },
                                                py: { xs: 1, sm: 1.25 },
                                                borderRadius: 2,
                                                border: "1px solid",
                                                borderColor: statusConfig.borderColor,
                                                bgcolor: statusConfig.bgcolor,
                                                boxShadow: "none"
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: "grid",
                                                    gridTemplateColumns: canEditItem
                                                        ? "minmax(0, 1fr) auto auto auto"
                                                        : "minmax(0, 1fr) auto auto",
                                                    gap: { xs: 0.75, sm: 1.5 },
                                                    alignItems: "center",
                                                    minHeight: 44
                                                }}
                                            >
                                                <Typography
                                                    title={item.TenMucKiem}
                                                    fontWeight={600}
                                                    sx={{
                                                        minWidth: 0,
                                                        lineHeight: 1.25,
                                                        display: "-webkit-box",
                                                        WebkitBoxOrient: "vertical",
                                                        WebkitLineClamp: 2,
                                                        overflow: "hidden"
                                                    }}
                                                >
                                                    {item.TenMucKiem}
                                                </Typography>

                                                <Typography
                                                    variant="caption"
                                                    color={totalLoi > 0 ? "error.main" : "text.secondary"}
                                                    fontWeight={700}
                                                    whiteSpace="nowrap"
                                                >
                                                    Lỗi: {totalLoi}
                                                </Typography>

                                                <Chip
                                                    label={statusConfig.label}
                                                    color={statusConfig.color}
                                                    size="small"
                                                    sx={{
                                                        height: 26,
                                                        fontWeight: 700,
                                                        "& .MuiChip-label": { px: 1 }
                                                    }}
                                                />

                                                {canEditItem && (
                                                    <Tooltip title={item.KetQua ? "Sửa kết quả" : "Thực hiện kiểm"}>
                                                        <IconButton
                                                            color="primary"
                                                            aria-label={item.KetQua ? `Sửa kết quả ${item.TenMucKiem}` : `Kiểm ${item.TenMucKiem}`}
                                                            onClick={() => setEditingItem({
                                                                ...item,
                                                                Defects: defects.filter((defect) => Number(defect.CheckItemId) === Number(item.Id))
                                                            })}
                                                            sx={{
                                                                width: 44,
                                                                height: 44,
                                                                border: "1px solid",
                                                                borderColor: "primary.light",
                                                                borderRadius: 1.5
                                                            }}
                                                        >
                                                            <EditOutlinedIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>

                                        </Card>

                                    );

                                })}

                            </AccordionDetails>

                        </Accordion>

                    );

                })}

                {isAllConfirmed && (phieu?.TrangThai === "DANG_KIEM" || phieu?.TrangThai === "DA_TAO_SECTION") && (isKCS || isLeader) && (
                    <Paper sx={{ position: "sticky", bottom: 0, zIndex: 9, mt: 2, p: 2, borderTop: "1px solid #e0e0e0" }}>
                        <Stack direction="row" justifyContent="flex-end">
                            <Button
                                variant="contained"
                                color={(hasReject || hasSpecialReject) ? "error" : "success"}
                                onClick={handleComplete}
                                disabled={loadingAction}
                            >
                                {loadingAction ? "Đang xử lý..." : `Xác nhận - ${finalResult}`}
                            </Button>
                        </Stack>
                    </Paper>
                )}

                {phieu?.TrangThai === "CHO_XUONG_XAC_NHAN" && isPX && (
                    <Paper sx={{ position: "sticky", bottom: 0, zIndex: 9, mt: 2, p: 2, borderTop: "1px solid #e0e0e0" }}>
                        <Stack direction="row" justifyContent="flex-end">
                            <Button
                                variant="contained"
                                onClick={handleConfirmPX}
                                disabled={loadingAction}
                            >
                                {loadingAction ? "Đang xử lý..." : "Xác nhận trưởng bộ phận"}
                            </Button>
                        </Stack>
                    </Paper>
                )}

                {/* Print Preview Modal */}
                <Dialog open={openPrintModal} onClose={() => setOpenPrintModal(false)} maxWidth="lg" fullWidth>
                    <DialogTitle>Xem trước bản in</DialogTitle>
                    <DialogContent dividers sx={{ bgcolor: '#f0f0f0', p: 3 }}>
                        <input
                            ref={productImageInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={handleProductImageSelected}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            {phieu.LoaiKiemId === 1 ? (
                                <PhieuGiamDinhPrintTemplate
                                    ref={componentRef}
                                    phieu={phieu}
                                    sections={sections}
                                    checkItems={checkItems}
                                    defects={defects}
                                    dynamicFields={dynamicFields}
                                    xacNhans={xacNhans}
                                />
                            ) : (
                                <PhieuKiemPrintTemplate
                                    ref={componentRef}
                                    phieu={phieu}
                                    sections={sections}
                                    checkItems={checkItems}
                                    defects={defects}
                                    dynamicFields={dynamicFields}
                                    xacNhans={xacNhans}
                                    thongSoList={thongSoList}
                                    thongSoKqList={thongSoKqList}
                                    onRequestProductImageUpload={handleTriggerProductImageUpload}
                                />
                            )}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenPrintModal(false)}>Hủy</Button>
                        <Button startIcon={<PrintIcon />} onClick={handlePrint} variant="contained" color="primary">
                            In / Lưu PDF
                        </Button>
                    </DialogActions>
                </Dialog>
                <CheckItemEditor
                    open={Boolean(editingItem)}
                    item={editingItem}
                    canEditDiemTrongYeu={[1, 5].includes(Number(phieu?.LoaiKiemId))}
                    onClose={() => setEditingItem(null)}
                    onSaved={async () => {
                        await loadData({ background: true });
                        setActionNotice({ type: "success", message: "Đã lưu kết quả mục kiểm." });
                    }}
                />
                <MeasurementEditor
                    open={measurementOpen}
                    phieuId={id}
                    specs={thongSoList}
                    results={thongSoKqList}
                    readOnly={!["DA_TAO_SECTION", "DANG_KIEM"].includes(phieu?.TrangThai) || !canEditInspection}
                    onClose={() => setMeasurementOpen(false)}
                    onSaved={async () => {
                        await loadData({ background: true });
                        setActionNotice({ type: "success", message: "Đã lưu kết quả thông số đặc biệt." });
                    }}
                />
            </Box>
        </Fade>
    );

}
