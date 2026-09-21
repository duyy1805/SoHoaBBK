// src/features/phieuKiem/pages/PhieuKiemDetail.jsx

import { useEffect, useRef, useState } from "react";
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
    Tooltip,
    Tabs,
    Tab,
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup
} from "@mui/material";
import { PhieuKiemPrintTemplate } from "../components/PhieuKiemPrintTemplate";
import { DekOfficialPrintTemplate } from "../components/DekOfficialPrintTemplate";
import { PhieuGiamDinhPrintTemplate } from "../components/PhieuGiamDinhPrintTemplate"
import PrintIcon from "@mui/icons-material/Print";
import { useReactToPrint } from "react-to-print";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
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
    calculateAQL,
    saveCustomFields,
    updateLot,
    getThongSoKq,
    completePhieuKiem,
    confirmPX,
    deletePhieuKiem,
    createDongContRetest,
    createPhieuKiemRetest,
    getKCSLookup,
    updatePhieuKiemActualQuantity,
    updateInputInspectionMode
} from "../../../api/phieuKiem.api";

import { getSanPhamNhomKiem, getInspectionLevels, updateSanPhamImage, uploadSanPhamImage } from "../../../api/lookup.api"

import { hasPermission } from "../../../utils/auth";
import CheckItemEditor from "../components/CheckItemEditor";
import MeasurementEditor from "../components/MeasurementEditor";

const toLocalDateInput = (value = new Date()) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const formatRetestQuantity = (value) => new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
}).format(Number(value || 0));

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
    const [incomingRetestDialogOpen, setIncomingRetestDialogOpen] = useState(false);
    const [incomingRetestKcs, setIncomingRetestKcs] = useState([]);
    const [incomingRetestForm, setIncomingRetestForm] = useState({
        nguoiKiemId: "",
        ngayTaiNhap: toLocalDateInput(),
        soLuongTaiNhap: "",
        ghiChu: ""
    });
    const [incomingRetestError, setIncomingRetestError] = useState("");

    // Thêm state cho thông số KQ đặc biệt
    const [thongSoList, setThongSoList] = useState([]);
    const [thongSoKqList, setThongSoKqList] = useState([]);

    const [loading, setLoading] = useState(true);
    const [creatingSection, setCreatingSection] = useState(false);
    const [confirmingSectionId, setConfirmingSectionId] = useState(null);
    const [loadingAction, setLoadingAction] = useState(false);
    const [actionNotice, setActionNotice] = useState(null);
    const [actualQuantity, setActualQuantity] = useState("");
    const [savingActualQuantity, setSavingActualQuantity] = useState(false);
    const [inputInspectionMode, setInputInspectionMode] = useState("");
    const [savingInputInspectionMode, setSavingInputInspectionMode] = useState(false);
    const componentRef = useRef();
    const dekOfficialPrintRef = useRef();
    const productImageInputRef = useRef(null);
    const [openPrintModal, setOpenPrintModal] = useState(false);
    const [printTab, setPrintTab] = useState("official");
    const [editingItem, setEditingItem] = useState(null);
    const [measurementOpen, setMeasurementOpen] = useState(false);
    const [lotDraft, setLotDraft] = useState("");
    const [orderDraft, setOrderDraft] = useState("");
    const [versionDraft, setVersionDraft] = useState("");
    const [standardReferenceDraft, setStandardReferenceDraft] = useState("");
    const [testEffectiveDateDraft, setTestEffectiveDateDraft] = useState("");
    const [savingDongContInfo, setSavingDongContInfo] = useState(false);
    const sectionsRef = useRef(null);

    // Đổi tên hàm của thư viện thành triggerPrint
    const triggerPrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: phieu ? `PhieuKiem_${phieu.SoPhieu}` : 'PhieuKiem',
    });
    const triggerDekOfficialPrint = useReactToPrint({
        contentRef: dekOfficialPrintRef,
        documentTitle: phieu ? `PhieuKiem_${phieu.SoPhieu}_BanKyDEK` : 'PhieuKiem_BanKyDEK',
    });

    const dynamicCustomer = String(
        dynamicFields.find((field) => ['DongCont_KhachHang', 'KhachHang'].includes(field?.FieldName))?.FieldValue || ''
    ).trim().toUpperCase();
    const isDekPrint = Number(phieu?.LoaiKiemId) === 5
        && String(phieu?.KhachHang || dynamicCustomer).trim().toUpperCase() === 'DEK';

    const openPrintPreview = () => {
        if (isDekPrint) setPrintTab("official");
        setOpenPrintModal(true);
    };

    const handlePrint = async () => {
        try {
            // 1. Gom dữ liệu từ các thẻ input có className="custom-field"
            const activePrintRef = isDekPrint && printTab === "official"
                ? dekOfficialPrintRef
                : componentRef;
            const inputs = activePrintRef.current?.querySelectorAll('.custom-field') || [];
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
            if (isDekPrint && printTab === "official") triggerDekOfficialPrint();
            else triggerPrint();

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
            const loadedDynamicFields = data.dynamicFields || [];
            const getLoadedField = (fieldName) => loadedDynamicFields
                .find((field) => field?.FieldName === fieldName)?.FieldValue || "";
            setSections(data.sections || []);
            setCheckItems(data.checkItems || []);
            setDefects(data.defects || []);
            setDynamicFields(loadedDynamicFields);
            setLotDraft(data.phieu?.Lot || "");
            setOrderDraft(getLoadedField("SoDonHang") || data.phieu?.SoDonHang || data.phieu?.MaDonHang || "");
            setVersionDraft(getLoadedField("PhienBan") || data.phieu?.PhienBan || "");
            setStandardReferenceDraft(
                getLoadedField("ThamChieuTieuChuan")
                || data.phieu?.ThamChieuTieuChuan
                || (Number(data.phieu?.LoaiKiemId) === 5 ? "PDOC, TCKT, TCBG" : "")
            );
            const rawEffectiveDate = getLoadedField("HieuLucTest");
            setTestEffectiveDateDraft(rawEffectiveDate ? toLocalDateInput(rawEffectiveDate) : toLocalDateInput());
            setInputInspectionMode(String(
                (data.dynamicFields || []).find((field) => field?.FieldName === "LoaiKiemTra")?.FieldValue || ""
            ).toUpperCase());
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
                    lotSize: Math.ceil(Number(data.phieu.SoLuongHieuLuc ?? data.phieu.SoLuong ?? 0)),
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

    const handleInputInspectionModeChange = async (event) => {
        const nextMode = String(event.target.value || "").toUpperCase();
        if (!['CD1', 'CD2'].includes(nextMode) || nextMode === inputInspectionMode) return;

        const previousMode = inputInspectionMode;
        try {
            setSavingInputInspectionMode(true);
            setActionNotice(null);
            setInputInspectionMode(nextMode);
            await updateInputInspectionMode(id, nextMode);
            setDynamicFields((current) => {
                const remaining = (current || []).filter((field) => field?.FieldName !== "LoaiKiemTra");
                return [...remaining, { FieldName: "LoaiKiemTra", FieldValue: nextMode }];
            });
            setActionNotice({ type: "success", message: `Đã lưu chế độ kiểm đầu vào ${nextMode}.` });
        } catch (error) {
            setInputInspectionMode(previousMode);
            setActionNotice({
                type: "error",
                message: error.response?.data?.message || "Không lưu được chế độ kiểm đầu vào."
            });
        } finally {
            setSavingInputInspectionMode(false);
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
        setNhomConfigs((current) => current.map((config, configIndex) => {
            if (field === "inspectionLevel" && index === 0) {
                return { ...config, inspectionLevel: value };
            }
            return configIndex === index ? { ...config, [field]: value } : config;
        }));
    };

    const handleCreateSection = async () => {
        if (!nhomConfigs.length) {
            setActionNotice({ type: "error", message: "Sản phẩm chưa được cấu hình nhóm kiểm." });
            return;
        }
        const invalidConfig = nhomConfigs.find((config) =>
            !Number.isInteger(Number(config.lotSize))
            || Number(config.lotSize) <= 0
            || !config.inspectionLevel
        );
        if (invalidConfig) {
            setActionNotice({ type: "error", message: `Nhóm ${invalidConfig.tenNhom} có Lot Size hoặc mức kiểm chưa hợp lệ.` });
            return;
        }
        try {
            setCreatingSection(true);
            setActionNotice(null);
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
            setActionNotice({ type: "success", message: "Đã tạo các nhóm kiểm và cỡ mẫu AQL." });
            window.requestAnimationFrame(() => sectionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
        } catch (err) {
            console.error(err);
            setActionNotice({
                type: "error",
                message: err?.response?.data?.message || "Không thể tạo các nhóm kiểm."
            });
        } finally {
            setCreatingSection(false);
        }
    };

    const handleCalculateAQL = async (section) => {
        if (!window.confirm(`Xác nhận kết quả nhóm “${section.TenNhom}”? Các mục chưa kiểm sẽ được tự động đánh dấu Đạt.`)) return;
        try {
            setConfirmingSectionId(section.Id);
            setActionNotice(null);
            await calculateAQL(section.Id);
            await loadData({ background: true });
            setActionNotice({ type: "success", message: `Đã xác nhận kết quả nhóm ${section.TenNhom}.` });
        } catch (err) {
            setActionNotice({
                type: "error",
                message: err?.response?.data?.message || `Không thể xác nhận nhóm ${section.TenNhom}.`
            });
        } finally {
            setConfirmingSectionId(null);
        }
    };

    const handleSaveDongContInfo = async () => {
        try {
            setSavingDongContInfo(true);
            setActionNotice(null);
            await Promise.all([
                updateLot({ phieuKiemId: Number(id), lot: lotDraft.trim() }),
                saveCustomFields({
                    phieuKiemId: Number(id),
                    fields: {
                        SoDonHang: orderDraft.trim(),
                        PhienBan: versionDraft.trim(),
                        ThamChieuTieuChuan: standardReferenceDraft.trim(),
                        HieuLucTest: testEffectiveDateDraft || ""
                    }
                })
            ]);
            await loadData({ background: true });
            setActionNotice({ type: "success", message: "Đã lưu thông tin kiểm cuối đóng cont." });
        } catch (err) {
            setActionNotice({
                type: "error",
                message: err?.response?.data?.message || "Không thể lưu thông tin kiểm cuối đóng cont."
            });
        } finally {
            setSavingDongContInfo(false);
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
    const canEditInspection = capabilities.canEdit ?? isKCS;
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
    const hasSavedSpecialResults = thongSoKqList.some((result) =>
        result?.GiaTriDo !== null
        && result?.GiaTriDo !== undefined
        && String(result.GiaTriDo).trim() !== ""
    );
    const isDongCont = Number(phieu?.LoaiKiemId) === 5;
    const isIncomingRetest = Boolean(retestInfo?.IsIncomingRetest);
    const isInspectionOpen = ["TAO_MOI", "DA_TAO_SECTION", "DANG_KIEM"].includes(phieu?.TrangThai);
    const canEditDongContInfo = isDongCont && isInspectionOpen && canEditInspection;
    const checkedItemCount = checkItems.filter((item) => Boolean(item.KetQua)).length;
    const acceptedSectionCount = sections.filter((section) => section.KetLuan === "ACCEPT").length;
    const rejectedSectionCount = sections.filter((section) => section.KetLuan === "REJECT").length;
    const confirmedSectionCount = acceptedSectionCount + rejectedSectionCount;
    const pendingSectionNames = sections.filter((section) => !section.KetLuan).map((section) => section.TenNhom);
    const finalResult = (hasReject || hasSpecialReject) ? "KHONG_DAT" : "DAT";
    const getDynamicFieldValue = (fieldName) =>
        (dynamicFields || []).find((field) => field?.FieldName === fieldName)?.FieldValue || "";
    const soDonHang = getDynamicFieldValue("SoDonHang")
        || getDynamicFieldValue("KeHoachDonHang")
        || phieu?.SoDonHang
        || phieu?.MaDonHang
        || (Number(phieu?.LoaiKiemId) === 1 ? phieu?.DoiTuong : "");

    const handleComplete = async () => {
        if (pendingSectionNames.length > 0) {
            setActionNotice({
                type: "warning",
                message: `Còn nhóm chưa xác nhận: ${pendingSectionNames.join(", ")}.`
            });
            return;
        }
        if (thongSoList.length > 0 && !hasSavedSpecialResults) {
            setActionNotice({
                type: "warning",
                message: "Phiếu có kiểm tra cấp độ đặc biệt nhưng chưa lưu kết quả."
            });
            return;
        }
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
        if (retestInfo?.RetestType === "DAU_VAO_TAI_NHAP") {
            try {
                setLoadingAction(true);
                setIncomingRetestError("");
                const response = await getKCSLookup({ loaiKiemId: 1 });
                const options = response.data || [];
                setIncomingRetestKcs(options);
                const defaultInspectorId = options.some((item) => Number(item.Id) === Number(phieu?.NguoiKiemId))
                    ? String(phieu.NguoiKiemId)
                    : String(options[0]?.Id || "");
                setIncomingRetestForm({
                    nguoiKiemId: defaultInspectorId,
                    ngayTaiNhap: toLocalDateInput(),
                    soLuongTaiNhap: "",
                    ghiChu: ""
                });
                setIncomingRetestDialogOpen(true);
            } catch (err) {
                setActionNotice({
                    type: "error",
                    message: err?.response?.data?.message || "Không tải được danh sách KCS"
                });
            } finally {
                setLoadingAction(false);
            }
            return;
        }

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

    const handleSubmitIncomingRetest = async () => {
        const quantityText = String(incomingRetestForm.soLuongTaiNhap || "").trim().replace(",", ".");
        if (!incomingRetestForm.nguoiKiemId || !incomingRetestForm.ngayTaiNhap
            || !/^\d+(?:\.\d{1,2})?$/.test(quantityText) || Number(quantityText) <= 0
            || !incomingRetestForm.ghiChu.trim()) {
            setIncomingRetestError("Vui lòng nhập đủ KCS, ngày, số lượng dương tối đa 2 số lẻ và ghi chú.");
            return;
        }

        try {
            setLoadingAction(true);
            setIncomingRetestError("");
            const response = await createPhieuKiemRetest(id, {
                nguoiKiemId: Number(incomingRetestForm.nguoiKiemId),
                ngayTaiNhap: incomingRetestForm.ngayTaiNhap,
                soLuongTaiNhap: quantityText,
                ghiChu: incomingRetestForm.ghiChu.trim()
            });
            const newId = response.data?.phieuKiemId;
            if (!newId) throw new Error("RETEST_ID_MISSING");
            setIncomingRetestDialogOpen(false);
            navigate(`/phieu-kiem/${newId}`, { state: { returnTo } });
        } catch (err) {
            setIncomingRetestError(err?.response?.data?.message || "Không thể tạo phiếu kiểm lại");
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
                                <Button variant="outlined" startIcon={<PrintIcon />} onClick={openPrintPreview}>
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
                {isIncomingRetest && (
                    <Alert
                        severity="info"
                        icon={<ReplayIcon />}
                        sx={{ mb: 2.5 }}
                        action={retestInfo?.PhieuKiemGocId ? (
                            <Button
                                color="inherit"
                                size="small"
                                onClick={() => navigate(`/phieu-kiem/${retestInfo.PhieuKiemGocId}`, { state: { returnTo } })}
                            >
                                Xem phiếu gốc
                            </Button>
                        ) : null}
                    >
                        <Typography fontWeight={700}>
                            {`Kiểm lại đầu vào – đợt ${retestInfo.DotTaiNhap}`}
                        </Typography>
                        <Typography variant="body2">
                            {`Ngày tái nhập: ${retestInfo.NgayTaiNhap || "---"} · Số lượng: ${formatRetestQuantity(retestInfo.SoLuongTaiNhap)} · ${retestInfo.GhiChu || ""}`}
                        </Typography>
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
                                <Typography fontWeight={600}>
                                    {isIncomingRetest ? formatRetestQuantity(retestInfo.SoLuongTaiNhap) : phieu?.SoLuong}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2">Số lượng thực tế</Typography>
                                {canEditInspection && isInspectionOpen && !isIncomingRetest ? (
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
                            {Number(phieu?.LoaiKiemId) === 1 && (
                                <Grid size={{ xs: 12 }}>
                                    <FormControl
                                        component="fieldset"
                                        disabled={!canEditInspection || savingInputInspectionMode || isIncomingRetest}
                                        sx={{ width: "100%" }}
                                    >
                                        <FormLabel component="legend" sx={{ fontWeight: 700, color: "text.primary" }}>
                                            Chế độ kiểm đầu vào
                                        </FormLabel>
                                        <RadioGroup
                                            value={inputInspectionMode}
                                            onChange={handleInputInspectionModeChange}
                                            sx={{
                                                mt: 0.5,
                                                flexDirection: { xs: "column", md: "row" },
                                                columnGap: 4
                                            }}
                                        >
                                            <FormControlLabel
                                                value="CD1"
                                                control={<Radio />}
                                                label="CĐ1 - Kiểm tra bình thường"
                                            />
                                            <FormControlLabel
                                                value="CD2"
                                                control={<Radio />}
                                                label="CĐ2 - Kiểm lần đầu, lô trước không đạt, có khiếu nại hoặc cảnh báo"
                                            />
                                        </RadioGroup>
                                        <Typography variant="caption" color="text.secondary">
                                            {savingInputInspectionMode
                                                ? "Đang lưu lựa chọn..."
                                                : inputInspectionMode
                                                    ? `Đã chọn ${inputInspectionMode}; bản in sẽ tự động tích đúng ô.`
                                                    : "Chưa chọn chế độ kiểm đầu vào."}
                                        </Typography>
                                    </FormControl>
                                </Grid>
                            )}
                        </Grid>

                    </CardContent>
                </Card>

                {retestInfo?.RetestType === "DAU_VAO_TAI_NHAP" && retestInfo.RetestBatches?.length > 0 && (
                    <Card variant="outlined" sx={{ mb: 2.5, borderRadius: 2 }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
                                Các đợt tái nhập
                            </Typography>
                            <Stack spacing={1}>
                                {retestInfo.RetestBatches.map((batch) => (
                                    <Paper key={batch.PhieuKiemId} variant="outlined" sx={{ p: 1.5 }}>
                                        <Stack
                                            direction={{ xs: "column", md: "row" }}
                                            justifyContent="space-between"
                                            alignItems={{ xs: "flex-start", md: "center" }}
                                            spacing={1}
                                        >
                                            <Box>
                                                <Typography fontWeight={700}>
                                                    {`Đợt ${batch.DotTaiNhap} · ${batch.SoPhieu}`}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {`${batch.NgayTaiNhap} · ${formatRetestQuantity(batch.SoLuongTaiNhap)} · ${batch.TenNguoiKiem || "Chưa phân công"}`}
                                                </Typography>
                                                <Typography variant="body2">{batch.GhiChu}</Typography>
                                            </Box>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                {renderTrangThaiChip(batch.TrangThai)}
                                                {renderKetLuanChip(batch.KetLuan)}
                                                <Button
                                                    size="small"
                                                    onClick={() => navigate(`/phieu-kiem/${batch.PhieuKiemId}`, { state: { returnTo } })}
                                                >
                                                    Mở phiếu
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </Paper>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                )}

                {isDongCont && (
                    <Card variant="outlined" sx={{ mb: 2.5, borderRadius: 2 }}>
                        <CardContent>
                            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={800}>Thông tin kiểm cuối đóng cont</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Các thông tin này được dùng lại trên bản in phiếu kiểm.
                                    </Typography>
                                </Box>
                                {canEditDongContInfo && (
                                    <Button variant="contained" onClick={handleSaveDongContInfo} disabled={savingDongContInfo}>
                                        {savingDongContInfo ? "Đang lưu..." : "Lưu thông tin"}
                                    </Button>
                                )}
                            </Stack>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <TextField fullWidth size="small" label="LOT" value={lotDraft}
                                        disabled={!canEditDongContInfo}
                                        onChange={(event) => setLotDraft(event.target.value)} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <TextField fullWidth size="small" label="Số đơn hàng" value={orderDraft}
                                        disabled={!canEditDongContInfo}
                                        onChange={(event) => setOrderDraft(event.target.value)} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <TextField fullWidth size="small" label="Phiên bản" value={versionDraft}
                                        disabled={!canEditDongContInfo}
                                        onChange={(event) => setVersionDraft(event.target.value)} />
                                </Grid>
                                <Grid size={{ xs: 12, md: 8 }}>
                                    <TextField fullWidth size="small" label="Tham chiếu tiêu chuẩn"
                                        value={standardReferenceDraft}
                                        disabled={!canEditDongContInfo}
                                        onChange={(event) => setStandardReferenceDraft(event.target.value)} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <TextField fullWidth size="small" type="date" label="Hiệu lực test"
                                        value={testEffectiveDateDraft}
                                        disabled={!canEditDongContInfo}
                                        slotProps={{ inputLabel: { shrink: true } }}
                                        onChange={(event) => setTestEffectiveDateDraft(event.target.value)} />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                )}

                {isDongCont && sections.length > 0 && (
                    <Paper variant="outlined" sx={{ mb: 2.5, p: 2, borderRadius: 2 }}>
                        <Typography fontWeight={800} sx={{ mb: 1.5 }}>Tiến độ thực hiện kiểm</Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip label={`Mục đã kiểm: ${checkedItemCount}/${checkItems.length}`} color={checkedItemCount === checkItems.length ? "success" : "default"} />
                            <Chip label={`Nhóm đã xác nhận: ${confirmedSectionCount}/${sections.length}`} color={confirmedSectionCount === sections.length ? "success" : "warning"} />
                            <Chip label={`Nhóm đạt: ${acceptedSectionCount}`} color="success" variant="outlined" />
                            <Chip label={`Nhóm không đạt: ${rejectedSectionCount}`} color={rejectedSectionCount > 0 ? "error" : "default"} variant="outlined" />
                            {thongSoList.length > 0 && (
                                <Chip label={hasSavedSpecialResults ? "Thông số đặc biệt: Đã nhập" : "Thông số đặc biệt: Chưa nhập"}
                                    color={hasSavedSpecialResults ? "success" : "warning"} variant="outlined" />
                            )}
                        </Stack>
                    </Paper>
                )}

                {/* CẤU HÌNH AQL */}

                {phieu?.TrangThai === "TAO_MOI" &&
                    canEditInspection && (

                        <Card sx={{ mb: 2.5, p: 2 }}>

                            <Typography variant="h6" sx={{ mb: 2 }}>
                                Cấu hình AQL theo nhóm kiểm
                            </Typography>

                            {nhomConfigs.length === 0 && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    Sản phẩm chưa được cấu hình nhóm kiểm nên chưa thể bắt đầu kiểm.
                                </Alert>
                            )}

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
                                            inputProps={{ min: 1, step: 1 }}
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
                                        {index === 0 && nhomConfigs.length > 1 && (
                                            <Typography variant="caption" color="text.secondary">
                                                Đổi mức của nhóm đầu tiên sẽ áp dụng cho tất cả nhóm.
                                            </Typography>
                                        )}
                                    </Grid>

                                </Grid>

                            ))}

                            <Button
                                variant="contained"
                                onClick={handleCreateSection}
                                disabled={creatingSection || nhomConfigs.length === 0}
                            >
                                {creatingSection ? "Đang tạo..." : "Tạo các nhóm kiểm"}
                            </Button>

                        </Card>

                    )}

                {/* SECTION */}

                <Box ref={sectionsRef} />

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

                                    <Chip
                                        label={section.KetLuan === "ACCEPT"
                                            ? "Đạt"
                                            : section.KetLuan === "REJECT"
                                                ? "Không đạt"
                                                : "Chưa xác nhận"}
                                        color={section.KetLuan === "ACCEPT"
                                            ? "success"
                                            : section.KetLuan === "REJECT"
                                                ? "error"
                                                : "default"}
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

                                <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: "grey.50" }}>
                                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={800}>
                                                Kết quả AQL — Level {section.InspectionLevel || "—"}, mẫu {section.SoLuongKiem || 0}
                                            </Typography>
                                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                                {[
                                                    ["Critical", section.TotalCritical, section.Ac_Critical],
                                                    ["Major", section.TotalMajor, section.Ac_Major],
                                                    ["Minor", section.TotalMinor, section.Ac_Minor]
                                                ].map(([label, total, accepted]) => {
                                                    const failed = Number(total || 0) > Number(accepted || 0);
                                                    return (
                                                        <Chip
                                                            key={label}
                                                            label={`${label}: ${Number(total || 0)} / Ac ${Number(accepted || 0)}`}
                                                            color={failed ? "error" : "success"}
                                                            variant={failed ? "filled" : "outlined"}
                                                            size="small"
                                                        />
                                                    );
                                                })}
                                            </Stack>
                                        </Box>

                                        {!section.KetLuan
                                            && canEditInspection
                                            && ["DA_TAO_SECTION", "DANG_KIEM"].includes(phieu?.TrangThai) && (
                                                <Button
                                                    variant="contained"
                                                    onClick={() => handleCalculateAQL(section)}
                                                    disabled={confirmingSectionId !== null || Boolean(editingItem)}
                                                    sx={{ alignSelf: { xs: "stretch", md: "center" }, minWidth: 190 }}
                                                >
                                                    {Number(confirmingSectionId) === Number(section.Id)
                                                        ? "Đang xác nhận..."
                                                        : "Xác nhận kết quả nhóm"}
                                                </Button>
                                            )}
                                    </Stack>
                                    {section.KetLuan && (
                                        <Alert severity={section.KetLuan === "ACCEPT" ? "success" : "error"} sx={{ mt: 1.5 }}>
                                            Nhóm đã được xác nhận: {section.KetLuan === "ACCEPT" ? "Đạt" : "Không đạt"}. Các mục kiểm đã được khóa.
                                        </Alert>
                                    )}
                                </Paper>

                            </AccordionDetails>

                        </Accordion>

                    );

                })}

                {!isAllConfirmed && sections.length > 0 && isInspectionOpen && canEditInspection && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        Hãy xác nhận kết quả từng nhóm trước khi hoàn tất phiếu. Còn lại: {pendingSectionNames.join(", ")}.
                    </Alert>
                )}

                {isAllConfirmed && (phieu?.TrangThai === "DANG_KIEM" || phieu?.TrangThai === "DA_TAO_SECTION") && canEditInspection && (
                    <Paper sx={{ position: "sticky", bottom: 0, zIndex: 9, mt: 2, p: 2, borderTop: "1px solid #e0e0e0" }}>
                        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={1}>
                            <Typography variant="body2" color="text.secondary">
                                Kết luận dự kiến: <strong>{finalResult === "DAT" ? "Đạt" : "Không đạt"}</strong>
                            </Typography>
                            <Button
                                variant="contained"
                                color={(hasReject || hasSpecialReject) ? "error" : "success"}
                                onClick={handleComplete}
                                disabled={loadingAction || (thongSoList.length > 0 && !hasSavedSpecialResults)}
                            >
                                {loadingAction ? "Đang xử lý..." : `Xác nhận - ${finalResult}`}
                            </Button>
                        </Stack>
                        {thongSoList.length > 0 && !hasSavedSpecialResults && (
                            <Alert severity="warning" sx={{ mt: 1.5 }}>
                                Cần lưu kết quả kiểm tra cấp độ đặc biệt trước khi hoàn tất phiếu.
                            </Alert>
                        )}
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

                <Dialog
                    open={incomingRetestDialogOpen}
                    onClose={() => !loadingAction && setIncomingRetestDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Tạo phiếu kiểm lại đầu vào</DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2} sx={{ mt: 0.5 }}>
                            <Alert severity="info">
                                Phiếu mới dùng lại chứng từ nhập của {phieu?.SoPhieu}, bắt buộc kiểm CĐ2 và không sao chép kết quả kiểm cũ.
                            </Alert>
                            {incomingRetestError && <Alert severity="error">{incomingRetestError}</Alert>}
                            <TextField
                                select
                                required
                                fullWidth
                                label="KCS phụ trách"
                                value={incomingRetestForm.nguoiKiemId}
                                onChange={(event) => setIncomingRetestForm((current) => ({
                                    ...current,
                                    nguoiKiemId: event.target.value
                                }))}
                            >
                                {incomingRetestKcs.map((item) => (
                                    <MenuItem key={item.Id} value={String(item.Id)}>{item.FullName}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                required
                                fullWidth
                                type="date"
                                label="Ngày tái nhập"
                                value={incomingRetestForm.ngayTaiNhap}
                                inputProps={{ max: toLocalDateInput() }}
                                InputLabelProps={{ shrink: true }}
                                onChange={(event) => setIncomingRetestForm((current) => ({
                                    ...current,
                                    ngayTaiNhap: event.target.value
                                }))}
                            />
                            <TextField
                                required
                                fullWidth
                                type="number"
                                label="Số lượng tái nhập"
                                value={incomingRetestForm.soLuongTaiNhap}
                                inputProps={{ min: 0.01, step: 0.01 }}
                                onChange={(event) => setIncomingRetestForm((current) => ({
                                    ...current,
                                    soLuongTaiNhap: event.target.value
                                }))}
                                helperText="Hỗ trợ tối đa 2 số lẻ; AQL sẽ làm tròn lên để xác định cỡ lô."
                            />
                            <TextField
                                required
                                fullWidth
                                multiline
                                minRows={3}
                                label="Ghi chú tái nhập"
                                value={incomingRetestForm.ghiChu}
                                inputProps={{ maxLength: 1000 }}
                                onChange={(event) => setIncomingRetestForm((current) => ({
                                    ...current,
                                    ghiChu: event.target.value
                                }))}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setIncomingRetestDialogOpen(false)} disabled={loadingAction}>Hủy</Button>
                        <Button variant="contained" onClick={handleSubmitIncomingRetest} disabled={loadingAction}>
                            {loadingAction ? "Đang tạo..." : "Tạo phiếu kiểm lại"}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Print Preview Modal */}
                <Dialog open={openPrintModal} onClose={() => setOpenPrintModal(false)} maxWidth="lg" fullWidth>
                    <DialogTitle>Xem trước bản in</DialogTitle>
                    {isDekPrint && (
                        <Tabs
                            value={printTab}
                            onChange={(_, value) => setPrintTab(value)}
                            sx={{ px: 3, borderBottom: 1, borderColor: "divider" }}
                        >
                            <Tab value="official" label="Bản ký chính thức" />
                            <Tab value="detail" label="Bản in chi tiết" />
                        </Tabs>
                    )}
                    <DialogContent dividers sx={{ bgcolor: '#f0f0f0', p: 3 }}>
                        <input
                            ref={productImageInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={handleProductImageSelected}
                        />
                        {isDekPrint ? (
                            <>
                                <Box sx={{ display: printTab === "official" ? 'flex' : 'none', justifyContent: 'center' }}>
                                    <DekOfficialPrintTemplate
                                        ref={dekOfficialPrintRef}
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
                                </Box>
                                <Box sx={{ display: printTab === "detail" ? 'flex' : 'none', justifyContent: 'center' }}>
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
                                </Box>
                            </>
                        ) : (
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
                        )}
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
