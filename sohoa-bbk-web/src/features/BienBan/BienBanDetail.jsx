import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";

// --- MUI Core ---
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    Chip,
    Stack,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Checkbox,
    ListItemText,
    Select,
    FormControl,
    InputLabel,
    Divider,
    List,
    ListItem,
    ListItemButton,
    Autocomplete,
    IconButton
} from "@mui/material";

// --- MUI Icons ---
import PrintIcon from "@mui/icons-material/Print";
import DescriptionIcon from '@mui/icons-material/Description';
import BugReportIcon from '@mui/icons-material/BugReport';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import LightbulbCircleIcon from '@mui/icons-material/LightbulbCircle';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import VerifiedIcon from '@mui/icons-material/Verified';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CheckIcon from '@mui/icons-material/Check';

// --- API & Utils ---
import {
    getBienBanDetail,
    getStandaloneBienBanDetail,
    updateMoTaChung,
    completeBienBan,
    confirmAssign,
    confirmUser,
    getBoPhan,
    assignDepartments,
    saveStandaloneBienBanHeader,
    saveStandaloneBienBanDefects,
    saveBienBanDefects,
    addXuLy,
    addChiPhi,
    addHanhDong,
    getDeNghiXuLy,
    saveBienBanCustomFields,
    getAssignableUsers,
    assignUser,
    deleteStandaloneBienBan,
    deleteBienBan,
    searchStandaloneCatalogItems,
    searchStandaloneOrders,
    confirmOpinionDepartments,
    confirmKphByCreatorDepartment,
    resubmitKphReview
} from "../../api/bienBan.api";
import { getDefectList } from "../../api/lookup.api";
import { decodeToken } from "../../utils/auth";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { BienBanPrintTemplate } from "./components/BienBanPrintTemplate";
import { BienBanTrenChuyenPrintTemplate } from "./components/BienBanTrenChuyenPrintTemplate";
import { PhieuXuLyKhongPhuHopPrintTemplate } from "./components/PhieuXuLyKhongPhuHopPrintTemplate";
import KphV01WorkflowSections from "./components/KphV01WorkflowSections";
import BienBanDetailSidebar from "./components/BienBanDetailSidebar";
import BienBanDetailToolbar from "./components/BienBanDetailToolbar";
import BienBanWorkflowGuide from "./components/BienBanWorkflowGuide";
import ResponsiveDataList from "./components/ResponsiveDataList";
import DefectImageGalleryDialog from "./components/DefectImageGalleryDialog";
import BienBanAttachments from "./components/BienBanAttachments";
import DefectPickerDialog from "../PhieuKiem/components/DefectPickerDialog";
import {
    buildBienBanWorkflow,
    getBienBanStatusMeta
} from "./components/bienBanWorkflow";
import { useToast } from "../../components/common/ToastContext";

const PHAT_HIEN_TU_OPTIONS = [
    ["KIEM_TRA_DAU_VAO", "a) Kiểm tra đầu vào"], ["TRONG_SAN_XUAT", "b) Trong sản xuất"],
    ["KIEM_DONG_CONT", "c) Kiểm cuối"], ["TAI_NCC", "d) Kiểm tra tại NCC"],
    ["KHACH_HANG", "e) Khách hàng"], ["TRONG_KHO", "f) Trong kho"]
];
const MUC_DO_KPH_OPTIONS = [
    ["LoiLanDau", "a) Lỗi lần đầu"], ["LoiLapLai", "b) Lỗi lặp lại"],
    ["LoiDonLe", "c) Lỗi đơn lẻ"], ["LoiHangLoat", "d) Lỗi hàng loạt"]
];
const KPH_HEADER_FIELDS = [
    ["Đơn vị sản xuất", "TenBoPhan"], ["Mã đơn vị", "MaBoPhan"],
    ["Tên VT/BTP/TP", "TenSanPham"], ["Mã Item", "MaSanPham"],
    ["Mã truy nguyên", "MaTruyNguyen"], ["Số lượng", "SoLuongKPH"],
    ["Đơn hàng", "DonHang"], ["Lô/Lot sản xuất", "Lot"], ["Dấu tuần", "DauTuan"]
];
const DETAIL_SECTIONS = [
    { id: "bien-ban-thong-tin", label: "Thông tin & lỗi" },
    { id: "bien-ban-phan-cong", label: "Phân công" },
    { id: "bien-ban-phuong-an", label: "Phương án xử lý" },
    { id: "bien-ban-y-kien-chuyen-mon", label: "Ý kiến chuyên môn" },
    { id: "bien-ban-xac-nhan", label: "Xác nhận" },
    { id: "bien-ban-theo-doi", label: "Theo dõi & hoàn tất" }
];

export default function BienBanDetail({ standalone = false }) {
    const { id: bienBanId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const componentRef = useRef();
    const latestLoadRequestRef = useRef(0);
    const hasLoadedRef = useRef(false);
    const serverDraftSnapshotRef = useRef(null);
    const confirmSavingRef = useRef(false);
    const dirtyRef = useRef(false);
    const { showToast } = useToast();

    const returnToList = (isStandalone = standalone) => {
        if (location.state?.returnTo) {
            navigate(location.state.returnTo);
            return;
        }
        if (isStandalone) {
            navigate("/phieu-xu-ly-khong-phu-hop");
            return;
        }
        navigate(-1);
    };

    const [info, setInfo] = useState(null);
    const [moTaChung, setMoTaChung] = useState("");
    const [moTaConfirmed, setMoTaConfirmed] = useState(false);

    const [defects, setDefects] = useState([]);
    const [assigns, setAssigns] = useState([]);
    const [xuLy, setXuLy] = useState([]);
    const [chiPhi, setChiPhi] = useState([]);
    const [xacNhan, setXacNhan] = useState([]);
    const [phieuKiemXacNhan, setPhieuKiemXacNhan] = useState([]);
    const [hanhDong, setHanhDong] = useState([]);
    const [specialistOpinions, setSpecialistOpinions] = useState([]);
    const [followUpEvaluation, setFollowUpEvaluation] = useState(null);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [actionSaving, setActionSaving] = useState({
        header: false,
        description: false,
        defects: false
    });

    const [currentUserBoPhanId, setCurrentUserBoPhanId] = useState(null);
    const [currentUserManagedBoPhanIds, setCurrentUserManagedBoPhanIds] = useState([]);
    const [currentUserPermissions, setCurrentUserPermissions] = useState([]);
    const [currentUserRoles, setCurrentUserRoles] = useState([]);

    // Modals state
    const [openAssignModal, setOpenAssignModal] = useState(false);
    const [openAssignUserModal, setOpenAssignUserModal] = useState(false);
    const [selectedAssign, setSelectedAssign] = useState(null);
    const [openXuLyModal, setOpenXuLyModal] = useState(false);
    const [openChiPhiModal, setOpenChiPhiModal] = useState(false);
    const [openHanhDongModal, setOpenHanhDongModal] = useState(false);
    const [openPrintModal, setOpenPrintModal] = useState(false);
    const [imagePreview, setImagePreview] = useState({ images: [], index: 0 });

    const [dynamicFields, setDynamicFields] = useState([]);
    const [canEditKphCustomFields, setCanEditKphCustomFields] = useState(false);
    const [isEditingKphHeader, setIsEditingKphHeader] = useState(false);
    const [isEditingStandaloneHeader, setIsEditingStandaloneHeader] = useState(false);
    const [headerFields, setHeaderFields] = useState({
        TenBoPhan: "",
        MaBoPhan: "",
        TenSanPham: "",
        MaSanPham: "",
        MaTruyNguyen: "",
        DonHang: "",
        Lot: "",
        SoLuongKPH: "",
        DauTuan: "",
        PhatHienTu: "",
        MucDo: "",
        ItemSourceType: "",
        ItemSourceId: "",
        LocalProductId: "",
        OrderId: ""
    });
    const [catalogItemOptions, setCatalogItemOptions] = useState([]);
    const [orderOptions, setOrderOptions] = useState([]);
    const [selectedCatalogItem, setSelectedCatalogItem] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [catalogItemSearch, setCatalogItemSearch] = useState("");
    const [orderSearch, setOrderSearch] = useState("");
    const [catalogItemLoading, setCatalogItemLoading] = useState(false);
    const [orderLoading, setOrderLoading] = useState(false);
    const [defectOptions, setDefectOptions] = useState([]);
    const [isEditingStandaloneDefects, setIsEditingStandaloneDefects] = useState(false);
    // Confirm Dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });
    const [confirmSaving, setConfirmSaving] = useState(false);

    useEffect(() => {
        const dirty = isEditingKphHeader || isEditingStandaloneHeader || isEditingStandaloneDefects;
        dirtyRef.current = dirty;
        const warnBeforeLeave = (event) => {
            if (!dirty) return;
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", warnBeforeLeave);
        return () => window.removeEventListener("beforeunload", warnBeforeLeave);
    }, [isEditingKphHeader, isEditingStandaloneHeader, isEditingStandaloneDefects]);

    useEffect(() => {
        hasLoadedRef.current = false;
        serverDraftSnapshotRef.current = null;
        const decoded = decodeToken();
        if (decoded) {
            setCurrentUserBoPhanId(decoded.boPhanId);
            setCurrentUserManagedBoPhanIds(decoded.managedBoPhanIds || [decoded.boPhanId].filter(Boolean));
            setCurrentUserPermissions(decoded.permissions || []);
            setCurrentUserRoles(decoded.roles || []);
        }
        loadData({ background: false });
    }, [bienBanId]);

    useEffect(() => {
        const loadDefects = async () => {
            try {
                const res = await getDefectList();
                setDefectOptions(res.data || []);
            } catch (err) {
                console.error("LoadStandaloneDefectOptions error:", err);
            }
        };

        loadDefects();
    }, [standalone]);

    useEffect(() => {
        if (!standalone || !info?.CanManageKphFlow) return undefined;
        let active = true;
        const timer = setTimeout(async () => {
            setCatalogItemLoading(true);
            try {
                const response = await searchStandaloneCatalogItems({
                    keyword: catalogItemSearch,
                    orderId: selectedOrder?.OrderId || undefined,
                    page: 0,
                    pageSize: 20
                });
                if (active) setCatalogItemOptions(response.data?.data || []);
            } catch (error) {
                if (active) console.error("SearchStandaloneCatalogItems error:", error);
            } finally {
                if (active) setCatalogItemLoading(false);
            }
        }, 300);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [standalone, info?.CanManageKphFlow, catalogItemSearch, selectedOrder?.OrderId]);

    useEffect(() => {
        if (!standalone || !info?.CanManageKphFlow) return undefined;
        let active = true;
        const timer = setTimeout(async () => {
            setOrderLoading(true);
            try {
                const response = await searchStandaloneOrders({
                    keyword: orderSearch,
                    localProductId: selectedCatalogItem?.SourceType === "SAN_PHAM"
                        ? selectedCatalogItem.LocalProductId
                        : undefined,
                    page: 0,
                    pageSize: 20
                });
                if (active) setOrderOptions(response.data?.data || []);
            } catch (error) {
                if (active) console.error("SearchStandaloneOrders error:", error);
            } finally {
                if (active) setOrderLoading(false);
            }
        }, 300);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [standalone, info?.CanManageKphFlow, orderSearch, selectedCatalogItem?.LocalProductId, selectedCatalogItem?.SourceType]);

    const loadData = async ({ background = hasLoadedRef.current } = {}) => {
        const requestId = ++latestLoadRequestRef.current;
        try {
            if (!background) {
                setLoading(true);
                setLoadError("");
            }
            const res = standalone
                ? await getStandaloneBienBanDetail(bienBanId)
                : await getBienBanDetail(bienBanId);
            if (requestId !== latestLoadRequestRef.current) return;

            setInfo(res.data.info);
            const parsedDefects = (res.data.defects || []).map(d => {
                let images = [];
                if (d.ImageUrls) {
                    try {
                        // Nếu là chuỗi JSON thì parse, nếu là mảng thì dùng luôn
                        images = typeof d.ImageUrls === 'string' ? JSON.parse(d.ImageUrls) : d.ImageUrls;
                        // Đảm bảo kết quả là mảng
                        if (!Array.isArray(images)) images = [images];
                    } catch {
                        // Nếu parse lỗi thì coi như là 1 chuỗi đơn
                        images = [d.ImageUrls];
                    }
                }
                return { ...d, ImageUrls: images };
            });
            if (!background || !isEditingStandaloneDefects) {
                setDefects(parsedDefects);
            }
            setAssigns(res.data.assigns || []);
            setXuLy(res.data.xuLy || []);
            setChiPhi(res.data.chiPhi || []);
            setXacNhan(res.data.xacNhan || []);
            setPhieuKiemXacNhan(res.data.phieuKiemXacNhan || []);
            setHanhDong(res.data.hanhDong || []);
            setSpecialistOpinions(res.data.specialistOpinions || []);
            setFollowUpEvaluation(res.data.followUpEvaluation || null);
            setDynamicFields(res.data.dynamicFields || []);
            setCanEditKphCustomFields(Boolean(res.data.canEditKphCustomFields ?? res.data.info?.canEditKphCustomFields));
            const fieldsMap = (res.data.dynamicFields || []).reduce((acc, field) => {
                if (field?.FieldName) {
                    acc[field.FieldName] = field.FieldValue || "";
                }
                return acc;
            }, {});
            const nextHeaderFields = {
                TenBoPhan: fieldsMap.TenBoPhan || res.data.info?.DonViTaoPhieu || res.data.info?.TenBoPhan || "",
                MaBoPhan: fieldsMap.MaBoPhan || res.data.info?.MaDonViTaoPhieu || res.data.info?.MaBoPhan || "",
                TenSanPham: fieldsMap.TenSanPham || res.data.info?.TenSanPham || "",
                MaSanPham: fieldsMap.MaSanPham || fieldsMap.MaItem || res.data.info?.MaSanPham || "",
                MaTruyNguyen: fieldsMap.MaTruyNguyen || "",
                DonHang: fieldsMap.DonHang || "",
                Lot: fieldsMap.Lot || res.data.info?.Lot || "",
                SoLuongKPH: fieldsMap.SoLuongKPH !== "" && fieldsMap.SoLuongKPH != null
                    ? fieldsMap.SoLuongKPH
                    : (res.data.info?.SoLuongThucTe ?? res.data.info?.SoLuongKeHoach ?? ""),
                DauTuan: fieldsMap.DauTuan || "",
                PhatHienTu: fieldsMap.PhatHienTu || "",
                MucDo: fieldsMap.MucDo || "",
                ItemSourceType: fieldsMap.ItemSourceType || "",
                ItemSourceId: fieldsMap.ItemSourceId || "",
                LocalProductId: fieldsMap.LocalProductId || "",
                OrderId: fieldsMap.OrderId || ""
            };
            const moTa = res.data.info?.MoTaChung || "";
            serverDraftSnapshotRef.current = {
                headerFields: nextHeaderFields,
                defects: parsedDefects,
                moTaChung: moTa,
                moTaConfirmed: Boolean(moTa)
            };
            if (!background || !isEditingKphHeader) {
                setHeaderFields(nextHeaderFields);
                setSelectedCatalogItem(nextHeaderFields.LocalProductId ? {
                    LocalProductId: Number(nextHeaderFields.LocalProductId),
                    SourceType: nextHeaderFields.ItemSourceType,
                    SourceId: Number(nextHeaderFields.ItemSourceId) || null,
                    Code: nextHeaderFields.MaSanPham,
                    Name: nextHeaderFields.TenSanPham
                } : null);
                setSelectedOrder(nextHeaderFields.OrderId ? {
                    OrderId: Number(nextHeaderFields.OrderId),
                    OrderCode: nextHeaderFields.DonHang
                } : null);
            }
            if (!background || moTaConfirmed) {
                setMoTaChung(moTa);
                setMoTaConfirmed(Boolean(moTa));
            }
            if (!background) {
                setIsEditingStandaloneHeader(!moTa && Boolean(res.data.info?.CanManageKphFlow));
                setIsEditingStandaloneDefects(
                    (res.data.defects || []).length === 0 && Boolean(res.data.info?.CanManageKphFlow)
                );
            }
            hasLoadedRef.current = true;
            setLoadError("");

        } catch (err) {
            if (requestId !== latestLoadRequestRef.current) return;
            console.error("Lỗi tải biên bản:", err);
            const message = err?.response?.data?.message || "Không tải được biên bản";
            if (!background) setLoadError(message);
            showToast(message, "error");
        } finally {
            if (requestId === latestLoadRequestRef.current && !background) {
                setLoading(false);
            }
        }
    };

    const refreshData = () => loadData({ background: true });

    const restoreServerDrafts = ({ header = false, defects: restoreDefects = false } = {}) => {
        const snapshot = serverDraftSnapshotRef.current;
        if (!snapshot) return;
        if (header) {
            setHeaderFields(snapshot.headerFields);
            setSelectedCatalogItem(snapshot.headerFields.LocalProductId ? {
                LocalProductId: Number(snapshot.headerFields.LocalProductId),
                SourceType: snapshot.headerFields.ItemSourceType,
                SourceId: Number(snapshot.headerFields.ItemSourceId) || null,
                Code: snapshot.headerFields.MaSanPham,
                Name: snapshot.headerFields.TenSanPham
            } : null);
            setSelectedOrder(snapshot.headerFields.OrderId ? {
                OrderId: Number(snapshot.headerFields.OrderId),
                OrderCode: snapshot.headerFields.DonHang
            } : null);
            setIsEditingKphHeader(false);
        }
        if (restoreDefects) {
            setDefects(snapshot.defects);
            setIsEditingStandaloneDefects(false);
        }
    };

    const restoreStandaloneHeader = () => {
        const snapshot = serverDraftSnapshotRef.current;
        if (!snapshot) return;
        restoreServerDrafts({ header: true });
        setMoTaChung(snapshot.moTaChung || "");
        setMoTaConfirmed(Boolean(snapshot.moTaConfirmed));
        setIsEditingStandaloneHeader(false);
    };

    const handleHeaderFieldChange = (fieldName, value) => {
        setHeaderFields((prev) => ({ ...prev, [fieldName]: value }));
    };

    const handleCatalogItemChange = (_, item) => {
        setSelectedCatalogItem(item);
        if (!item) {
            setHeaderFields((current) => ({
                ...current,
                TenSanPham: "", MaSanPham: "", ItemSourceType: "", ItemSourceId: "", LocalProductId: ""
            }));
            return;
        }
        setHeaderFields((current) => ({
            ...current,
            TenSanPham: item.Name || "",
            MaSanPham: item.Code || "",
            ItemSourceType: item.SourceType || "",
            ItemSourceId: String(item.SourceId || ""),
            LocalProductId: String(item.LocalProductId || "")
        }));
    };

    const handleOrderChange = (_, order) => {
        setSelectedOrder(order);
        setHeaderFields((current) => ({
            ...current,
            OrderId: order ? String(order.OrderId) : "",
            DonHang: order?.OrderCode || ""
        }));
    };

    const handleSaveKphCustomFields = async () => {
        if (actionSaving.header) return;
        try {
            setActionSaving((current) => ({ ...current, header: true }));
            await saveBienBanCustomFields({ bienBanId: info?.BienBanId || bienBanId, fields: headerFields });
            setIsEditingKphHeader(false);
            showToast("Đã lưu thông tin mẫu KPH", "success");
            await refreshData();
        } catch (err) {
            showToast(err?.response?.data?.message || "Không thể lưu thông tin mẫu KPH", "error");
        } finally {
            setActionSaving((current) => ({ ...current, header: false }));
        }
    };

    const getDefectColor = (type) => {
        if (!type) return "default";
        const t = type.toLowerCase();
        if (t.includes("critical")) return "error";
        if (t.includes("major")) return "warning";
        if (t.includes("minor")) return "info";
        return "primary";
    };

    // --- Actions ---
    const handleConfirmMoTa = async () => {
        if (standalone) {
            await handleSaveStandaloneHeader();
            return;
        }
        if (actionSaving.description) return;
        if (!moTaChung.trim()) {
            showToast("Vui lòng nhập mô tả chung!", "warning");
            focusFirstFieldInSection("bien-ban-thong-tin");
            return;
        }
        try {
            setActionSaving((current) => ({ ...current, description: true }));
            await updateMoTaChung({ bienBanId, moTaChung });
            setMoTaConfirmed(true);
            showToast("Đã lưu mô tả chung", "success");
            await refreshData();
        } catch (err) {
            showToast(err?.response?.data?.message || "Không thể lưu mô tả", "error");
        } finally {
            setActionSaving((current) => ({ ...current, description: false }));
        }
    };

    const handleSaveStandaloneHeader = async () => {
        if (actionSaving.description) return;
        if (!moTaChung.trim()) {
            showToast("Vui lòng nhập mô tả chung!", "warning");
            focusFirstFieldInSection("bien-ban-thong-tin");
            return;
        }

        try {
            setActionSaving((current) => ({ ...current, description: true }));
            await saveStandaloneBienBanHeader(bienBanId, {
                moTaChung,
                fields: headerFields
            });
            setMoTaConfirmed(true);
            setIsEditingStandaloneHeader(false);
            showToast("Đã lưu thông tin phiếu", "success");
            await refreshData();
        } catch (err) {
            showToast(err?.response?.data?.message || "Không thể lưu thông tin phiếu", "error");
        } finally {
            setActionSaving((current) => ({ ...current, description: false }));
        }
    };

    const addCatalogDefectRow = () => {
        setDefects((prev) => [
            ...prev,
            {
                DefectId: "",
                MaLoi: "",
                TenLoi: "",
                DefectType: "MINOR",
                MoTa: "",
                SoLuongKiem: "",
                SoLuong: 1,
                GhiChu: "",
                SortOrder: prev.length + 1,
                sourceType: "catalog"
            }
        ]);
    };

    const updateStandaloneDefect = (index, patch) => {
        setDefects((prev) => prev.map((item, idx) => (
            idx === index ? { ...item, ...patch } : item
        )));
    };

    const handleCatalogDefectSelected = (index, defectId) => {
        const selected = defectOptions.find((item) => Number(item.Id) === Number(defectId));
        updateStandaloneDefect(index, {
            sourceType: "catalog",
            DefectId: selected?.Id || null,
            MaLoi: selected?.MaLoi || "",
            TenLoi: selected?.TenLoi || "",
            DefectType: selected?.DefectType || "MINOR",
            MoTa: selected?.MoTa || "",
            TenLoiTuNhap: ""
        });
    };

    const removeStandaloneDefect = (index) => {
        setDefects((prev) => prev.filter((_, idx) => idx !== index).map((item, idx) => ({
            ...item,
            SortOrder: idx + 1
        })));
    };

    const handleSaveStandaloneDefects = async () => {
        if (actionSaving.defects) return;
        if (defects.length === 0 || defects.some((item) => !item.DefectId)) {
            showToast("Mỗi dòng lỗi phải được chọn từ ngân hàng lỗi", "warning");
            focusFirstFieldInSection("bien-ban-thong-tin");
            return;
        }
        const payload = defects
            .map((item, index) => ({
                DefectId: item.DefectId ? Number(item.DefectId) : null,
                MaLoi: item.MaLoi || "",
                TenLoi: item.TenLoi || "",
                DefectType: item.DefectType || "",
                TenLoiTuNhap: "",
                MoTa: item.MoTa || "",
                SoLuongKiem: item.SoLuongKiem === "" || item.SoLuongKiem === null || item.SoLuongKiem === undefined
                    ? null
                    : Number(item.SoLuongKiem),
                SoLuong: Number(item.SoLuong) || 0,
                GhiChu: item.GhiChu || "",
                SortOrder: index + 1
            }))
            .filter((item) => item.DefectId && item.SoLuong > 0);

        if (payload.length === 0) {
            showToast("Cần nhập ít nhất một lỗi hợp lệ", "warning");
            return;
        }

        const invalidQuantity = payload.find((item) =>
            !Number.isInteger(item.SoLuongKiem) || item.SoLuongKiem <= 0 ||
            !Number.isInteger(item.SoLuong) || item.SoLuong <= 0 ||
            item.SoLuong > item.SoLuongKiem
        );
        if (invalidQuantity) {
            showToast("Số lượng kiểm phải lớn hơn 0 và không được nhỏ hơn số lượng lỗi", "warning");
            return;
        }

        try {
            setActionSaving((current) => ({ ...current, defects: true }));
            if (isStandaloneBienBan) await saveStandaloneBienBanDefects(bienBanId, payload);
            else await saveBienBanDefects(bienBanId, payload);
            setIsEditingStandaloneDefects(false);
            showToast("Đã lưu danh sách lỗi", "success");
            await refreshData();
        } catch (err) {
            showToast(err?.response?.data?.message || "Không thể lưu danh sách lỗi", "error");
        } finally {
            setActionSaving((current) => ({ ...current, defects: false }));
        }
    };

    const handleConfirmAssign = () => {
        setConfirmDialog({
            open: true,
            title: 'Xác nhận phân công',
            message: 'Bạn có chắc chắn muốn xác nhận danh sách bộ phận xử lý này?',
            type: 'warning',
            onConfirm: async () => {
                if (confirmSavingRef.current) return;
                confirmSavingRef.current = true;
                setConfirmSaving(true);
                try {
                    await confirmAssign(bienBanId);
                    showToast("Đã chốt phân công xử lý", "success");
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                    await refreshData();
                } catch (err) {
                    showToast(err?.response?.data?.message || "Lỗi xác nhận phân công", "error");
                } finally {
                    confirmSavingRef.current = false;
                    setConfirmSaving(false);
                }
            }
        });
    };

    const handleConfirmUser = (targetBoPhanId = null) => {
        // Khi truyền trực tiếp cho onClick, React đưa SyntheticEvent vào tham số đầu.
        // Chỉ admin xác nhận thay bộ phận mới được phép truyền một ID số.
        const normalizedTargetBoPhanId = targetBoPhanId != null
            && Number.isInteger(Number(targetBoPhanId))
            && Number(targetBoPhanId) > 0
            ? Number(targetBoPhanId)
            : null;

        setConfirmDialog({
            open: true,
            title: 'Xác nhận thông tin',
            message: 'Bạn xác nhận các thông tin xử lý của bộ phận là chính xác?',
            type: 'info',
            onConfirm: async () => {
                if (confirmSavingRef.current) return;
                confirmSavingRef.current = true;
                setConfirmSaving(true);
                try {
                    await confirmUser(bienBanId, normalizedTargetBoPhanId);
                    showToast("Xác nhận thông tin thành công", "success");
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                    await refreshData();
                } catch (err) {
                    console.error("[BienBanDetail] Xác nhận tiến độ xử lý thất bại", {
                        bienBanId,
                        targetBoPhanId: normalizedTargetBoPhanId,
                        requestUrl: err?.config?.baseURL
                            ? `${err.config.baseURL}${err.config.url}`
                            : err?.config?.url,
                        status: err?.response?.status,
                        response: err?.response?.data,
                        message: err?.message,
                        code: err?.code
                    });
                    showToast(err?.response?.data?.message || "Lỗi xác nhận thông tin", "error");
                } finally {
                    confirmSavingRef.current = false;
                    setConfirmSaving(false);
                }
            }
        });
    };

    const handleComplete = () => {
        setConfirmDialog({
            open: true,
            title: info?.MauPhieuVersion === "V01" ? 'Xác nhận cuối của bộ phận tạo phiếu' : 'Hoàn thành biên bản',
            message: info?.MauPhieuVersion === "V01"
                ? 'Sau khi xác nhận, mục 5/6/7 và các ý kiến sẽ bị khóa, biên bản chuyển sang theo dõi đánh giá.'
                : 'Bạn có chắc chắn muốn hoàn thành biên bản này? Hành động này không thể hoàn tác.',
            type: 'success',
            onConfirm: async () => {
                if (confirmSavingRef.current) return;
                confirmSavingRef.current = true;
                setConfirmSaving(true);
                try {
                    if (info?.MauPhieuVersion === "V01") {
                        await confirmKphByCreatorDepartment(bienBanId);
                        showToast("Đã xác nhận và chuyển biên bản sang theo dõi", "success");
                        setConfirmDialog(prev => ({ ...prev, open: false }));
                        await refreshData();
                    } else {
                        await completeBienBan(bienBanId);
                        showToast("Đã hoàn thành biên bản", "success");
                        returnToList(isStandaloneBienBan);
                    }
                } catch (err) {
                    showToast(err?.response?.data?.message || "Lỗi hoàn thành biên bản", "error");
                } finally {
                    confirmSavingRef.current = false;
                    setConfirmSaving(false);
                }
            }
        });
    };

    const patchSpecialistOpinion = (opinionId, changes) => {
        const next = specialistOpinions.map((item) =>
            Number(item.Id) === Number(opinionId) ? { ...item, ...changes } : item
        );
        setSpecialistOpinions(next);
        if (Object.prototype.hasOwnProperty.call(changes, "HasConfirmed")) {
            const canCreatorRole = currentUserRoles.some((role) => String(role || "").toUpperCase() === "ADMIN") ||
                (currentUserManagedBoPhanIds.map(Number).includes(Number(info?.BoPhanTaoId)) &&
                    currentUserRoles.some((role) => String(role || "").toUpperCase().startsWith("TP_")));
            setInfo((currentInfo) => ({
                ...currentInfo,
                CanCreatorConfirm: canCreatorRole && next.length > 0 &&
                    next.every((item) => Boolean(item.HasConfirmed)) &&
                    !["TRA_LAI_CHINH_SUA", "CHO_THEO_DOI", "HOAN_TAT"].includes(currentInfo.TrangThai)
            }));
        }
    };

    const handleReviewReturned = ({ reason, returnedByName, returnedAt }) => {
        const decoded = decodeToken() || {};
        const canEditAfterReturn = currentUserRoles.some((role) => String(role || "").toUpperCase() === "ADMIN") ||
            Number(info?.NguoiLapId) === Number(decoded.userId) ||
            (currentUserManagedBoPhanIds.map(Number).includes(Number(info?.BoPhanTaoId)) &&
                currentUserRoles.some((role) => String(role || "").toUpperCase().startsWith("TP_")));
        setInfo((current) => ({
            ...current,
            TrangThai: "TRA_LAI_CHINH_SUA",
            LastReturnReason: reason,
            LastReturnedByName: returnedByName,
            LastReturnedAt: returnedAt,
            CreatorConfirmedAt: null,
            CanManageKphFlow: canEditAfterReturn,
            CanEditReturned: canEditAfterReturn,
            CanResubmit: canEditAfterReturn,
            CanContributeKphSections: canEditAfterReturn,
            CanCreatorConfirm: false
        }));
        setCanEditKphCustomFields(canEditAfterReturn);
        setSpecialistOpinions((current) => current.map((item) => ({
            ...item,
            HasConfirmed: false,
            HasResponded: false,
            ConfirmedBy: null,
            ConfirmedByName: null,
            ConfirmedAt: null,
            TrangThai: "CHO_GUI_LAI",
            CanSaveOpinion: false,
            CanConfirmOpinion: false,
            CanReturn: false
        })));
    };

    const handleResubmit = () => {
        setConfirmDialog({
            open: true,
            title: "Gửi lại các bộ phận xác nhận",
            message: "Nội dung sẽ bị khóa và tất cả bộ phận phải lưu ý kiến, xác nhận lại trong vòng mới.",
            type: "warning",
            onConfirm: async () => {
                try {
                    const response = await resubmitKphReview(bienBanId);
                    setInfo((current) => ({
                        ...current,
                        TrangThai: "CHO_XAC_NHAN",
                        ReviewRound: response.data?.reviewRound || Number(current.ReviewRound || 1) + 1,
                        CanManageKphFlow: false,
                        CanEditReturned: false,
                        CanResubmit: false,
                        CanContributeKphSections: true,
                        CanCreatorConfirm: false
                    }));
                    setCanEditKphCustomFields(false);
                    setSpecialistOpinions((current) => current.map((item) => ({
                        ...item,
                        HasOpinion: false,
                        HasConfirmed: false,
                        HasResponded: false,
                        OpinionSavedByName: null,
                        OpinionSavedAt: null,
                        ConfirmedByName: null,
                        ConfirmedAt: null,
                        TrangThai: "CHO_Y_KIEN",
                        CanSaveOpinion: isAdminUser || currentUserManagedBoPhanIds.map(Number).includes(Number(item.BoPhanId)),
                        CanConfirmOpinion: false,
                        CanReturn: false
                    })));
                    setConfirmDialog((current) => ({ ...current, open: false }));
                    showToast(response.data?.message || "Đã gửi lại các bộ phận xác nhận", "success");
                } catch (error) {
                    showToast(error?.response?.data?.message || "Không thể gửi lại biên bản", "error");
                }
            }
        });
    };

    const handleDeleteStandalone = () => {
        setConfirmDialog({
            open: true,
            title: 'Xóa phiếu xử lý không phù hợp',
            message: 'Phiếu này sẽ bị xóa cùng toàn bộ lỗi, phân bổ và lịch sử xử lý liên quan. Hành động này không hoàn tác.',
            type: 'warning',
            onConfirm: async () => {
                try {
                    await deleteStandaloneBienBan(bienBanId);
                    showToast("Đã xóa phiếu xử lý không phù hợp", "success");
                    returnToList(true);
                } catch (err) {
                    showToast(err?.response?.data?.message || "Không thể xóa phiếu", "error");
                } finally {
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const handleDeleteBienBan = () => {
        setConfirmDialog({
            open: true,
            title: 'Xóa biên bản',
            message: 'Biên bản sẽ bị xóa cùng toàn bộ phân công, ý kiến, xác nhận, dữ liệu xử lý và file đính kèm. Phiếu kiểm gốc vẫn được giữ lại. Hành động này không hoàn tác.',
            type: 'warning',
            onConfirm: async () => {
                try {
                    await deleteBienBan(bienBanId);
                    showToast("Đã xóa biên bản", "success");
                    returnToList(false);
                } catch (err) {
                    showToast(err?.response?.data?.message || "Không thể xóa biên bản", "error");
                } finally {
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const handlePrintPreview = () => setOpenPrintModal(true);
    const triggerPrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: info ? `BienBan_${info.SoPhieu}` : 'BienBan',
    });
    const handlePrint = async () => {
        try {
            if (!canEditKphCustomFields) {
                triggerPrint();
                return;
            }
            // 1. Gom dữ liệu từ các thẻ input
            const inputs = document.querySelectorAll('.custom-field');
            const fieldsData = {};

            inputs.forEach(input => {
                if (input.name) {
                    // Nếu là checkbox/radio lưu value dạng boolean/string
                    if (input.type === 'checkbox') {
                        fieldsData[input.name] = input.checked;
                    } else {
                        fieldsData[input.name] = input.value;
                    }
                }
            });

            // 2. Gọi API lưu dữ liệu
            await saveBienBanCustomFields({
                bienBanId: info.BienBanId || bienBanId,
                fields: fieldsData
            });

            // 3. Bật hộp thoại in
            triggerPrint();

        } catch (error) {
            console.error("Lỗi khi lưu dữ liệu in:", error);
            showToast("Lưu thông tin thất bại. Vui lòng thử lại!", "error");
        }
    };

    // --- UI Helpers & Conditions ---
    const getStatusText = (boPhanId) => xacNhan.some(x => Number(x.BoPhanId) === Number(boPhanId)) ? "Đã xác nhận" : "Đang chờ";
    const getStatusColor = (boPhanId) => xacNhan.some(x => Number(x.BoPhanId) === Number(boPhanId)) ? "success" : "warning";

    const isAdminUser = currentUserRoles.some((role) => String(role || "").toUpperCase() === "ADMIN");
    const isManagerOrQA = isAdminUser || currentUserPermissions.includes("XAC_NHAN_NGUOI_XU_LY") ||
        currentUserPermissions.includes("KET_LUAN") ||
        currentUserPermissions.includes("QUAN_TRI_DM");
    const isStandaloneBienBan = standalone || info?.LoaiBienBan === "STANDALONE";
    const isTrenChuyenBienBan = Number(info?.LoaiKiemId) === 6 && !info?.IsCongDoan;

    const isV01 = info?.MauPhieuVersion === "V01";
    const canEditKphDefects = isV01 && Boolean(info?.CanManageKphFlow);
    const workflowDepartments = isV01 ? specialistOpinions : assigns;
    const currentUserDepartmentIds = new Set((currentUserManagedBoPhanIds.length
        ? currentUserManagedBoPhanIds : [currentUserBoPhanId]).map(Number));
    const isAssigned = workflowDepartments.some(a => currentUserDepartmentIds.has(Number(a.BoPhanId)));
    const canAddProposal = isV01
        ? Boolean(info?.CanContributeKphSections)
        : isAssigned;
    const hasXuLy = xuLy.some(x => currentUserDepartmentIds.has(Number(x.BoPhanId)));
    const isConfirmed = xacNhan.some(x => currentUserDepartmentIds.has(Number(x.BoPhanId)));
    const allConfirmed = assigns.length > 0 && assigns.every(a =>
        xacNhan.some(x => Number(x.BoPhanId) === Number(a.BoPhanId))
    );
    const allOpinionsConfirmed = specialistOpinions.length > 0 &&
        specialistOpinions.every(item => Boolean(item.HasConfirmed));
    const requiredSectionsReady = xuLy.length > 0 &&
        (!info?.YeuCauChiPhi || chiPhi.length > 0) && (!info?.YeuCauHanhDong || hanhDong.length > 0);
    const hasCompletionPermission = isAdminUser ||
        currentUserPermissions.includes("QUAN_TRI_DM") ||
        currentUserPermissions.includes("KET_LUAN");
    const canSubmitCompletion = isV01
        ? Boolean(info?.CanCreatorConfirm) && Boolean(info?.OpinionDepartmentsConfirmed) && allOpinionsConfirmed &&
            !["TRA_LAI_CHINH_SUA", "CHO_THEO_DOI", "HOAN_TAT"].includes(info?.TrangThai)
        : hasCompletionPermission && allConfirmed && requiredSectionsReady &&
            !["CHO_THEO_DOI", "HOAN_TAT"].includes(info?.TrangThai);
    const canConfirmProcessing = !isV01 && Boolean(info?.AssignConfirmed) &&
        isAssigned && !isConfirmed && hasXuLy;
    const defectCount = defects.length;
    const totalDefectQty = defects.reduce((sum, item) => sum + (Number(item.SoLuong) || 0), 0);
    const scrollToSection = (sectionId, { focus = false } = {}) => {
        const target = document.getElementById(sectionId) || document.getElementById("bien-ban-xu-ly");
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
        if (focus && target) {
            window.setTimeout(() => {
                target.querySelector("input:not([disabled]), textarea:not([disabled]), button:not([disabled])")?.focus();
            }, 450);
        }
    };
    const focusFirstFieldInSection = (sectionId) => {
        scrollToSection(sectionId);
        window.setTimeout(() => {
            const section = document.getElementById(sectionId);
            section?.querySelector('[aria-invalid="true"], input:not([disabled]), textarea:not([disabled])')?.focus();
        }, 450);
    };
    const workflow = buildBienBanWorkflow({
        info,
        defects,
        assigns: workflowDepartments,
        xuLy,
        xacNhan,
        opinions: specialistOpinions,
        evaluation: followUpEvaluation,
        currentUserBoPhanId,
        isManagerOrQA: isV01 ? Boolean(info?.CanManageKphFlow) : isManagerOrQA,
        basicInfoConfirmed: moTaConfirmed,
        canConfirmProcessing,
        canSubmitCompletion,
        actions: {
            editInfo: () => scrollToSection("bien-ban-thong-tin", { focus: true }),
            manageAssignments: () => setOpenAssignModal(true),
            confirmAssignments: handleConfirmAssign,
            addProcessing: () => setOpenXuLyModal(true),
            openOpinions: () => scrollToSection("bien-ban-y-kien-chuyen-mon", { focus: true }),
            confirmProcessing: handleConfirmUser,
            complete: handleComplete,
            openFollowUp: () => scrollToSection("bien-ban-theo-doi", { focus: true })
        }
    });
    const statusMeta = getBienBanStatusMeta(info?.TrangThai);
    const missingItems = [
        !moTaConfirmed ? "Mô tả sự không phù hợp" : null,
        defects.length === 0 ? "Ít nhất một dòng lỗi" : null,
        moTaConfirmed && workflowDepartments.length === 0 ? (isV01 ? "Bộ phận cần lấy ý kiến" : "Bộ phận phối hợp xử lý") : null,
        isV01 && specialistOpinions.some((item) => !item.HasConfirmed) ? "Ý kiến hoặc xác nhận của bộ phận" : null
    ].filter(Boolean);
    const departmentsForSidebar = workflowDepartments.map((department) => ({
        ...department,
        IsConfirmed: isV01
            ? Boolean(department.HasConfirmed)
            : xacNhan.some((item) => Number(item.BoPhanId) === Number(department.BoPhanId))
    }));
    const sidebarFields = {
        ...headerFields,
        PhatHienTu: PHAT_HIEN_TU_OPTIONS.find(([value]) => value === headerFields.PhatHienTu)?.[1] || headerFields.PhatHienTu,
        MucDo: MUC_DO_KPH_OPTIONS.find(([value]) => value === headerFields.MucDo)?.[1] || headerFields.MucDo
    };
    const primaryAction = workflow.guidance.actionLabel && workflow.guidance.onAction ? {
        label: workflow.guidance.actionLabel,
        onClick: workflow.guidance.onAction,
        color: workflow.guidance.tone === "success" ? "success" : "primary"
    } : null;
    const isSavingAny = Object.values(actionSaving).some(Boolean) || confirmSaving;
    const hasUnsavedChanges = isEditingKphHeader || isEditingStandaloneHeader || isEditingStandaloneDefects;
    const saveState = isSavingAny
        ? { label: "Đang lưu…", color: "primary.main" }
        : hasUnsavedChanges
            ? { label: "Có thay đổi chưa lưu", color: "warning.main" }
            : { label: "Đã đồng bộ", color: "success.main" };
    const renderDefectDetails = (defect, index) => (
        <Box>
            <Typography variant="body2" fontWeight="bold" color="primary">
                {defect.TenLoi || defect.TenLoiTuNhap || defect.MaLoi || `Dòng lỗi ${index + 1}`}
            </Typography>
            {defect.MoTa && <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>{defect.MoTa}</Typography>}
            {Array.isArray(defect.ImageUrls) && defect.ImageUrls.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 1 }}>
                    {defect.ImageUrls.map((url, imageIndex) => (
                        <Box
                            key={url || imageIndex}
                            component="img"
                            src={url.startsWith("http") ? url : `https://z76api.z76.vn${url}`}
                            alt={`Ảnh lỗi ${imageIndex + 1}`}
                            sx={{ width: 56, height: 56, objectFit: "cover", borderRadius: 1, cursor: "pointer", border: "1px solid", borderColor: "divider" }}
                            onClick={() => setImagePreview({
                                images: defect.ImageUrls.map((item) => item.startsWith("http") ? item : `https://z76api.z76.vn${item}`),
                                index: imageIndex
                            })}
                        />
                    ))}
                </Stack>
            )}
        </Box>
    );
    const leaveDetail = () => {
        if (dirtyRef.current && !window.confirm("Bạn có thay đổi chưa lưu. Bạn vẫn muốn rời trang?")) return;
        returnToList(isStandaloneBienBan);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <Stack alignItems="center" spacing={2}>
                    <CircularProgress />
                    <Typography color="text.secondary">Đang tải dữ liệu biên bản...</Typography>
                </Stack>
            </Box>
        );
    }

    if (!info) {
        return (
            <Stack alignItems="center" spacing={2} sx={{ mt: 6 }}>
                <Typography color="text.secondary">
                    {loadError || "Không tìm thấy thông tin biên bản"}
                </Typography>
                <Button variant="outlined" onClick={() => loadData({ background: false })}>
                    Thử tải lại
                </Button>
            </Stack>
        );
    }

    return (
        <Box sx={{ bgcolor: '#f4f6f8', minHeight: '100vh', pb: 3 }}>
            <BienBanDetailToolbar
                recordNumber={isStandaloneBienBan ? info.SoBienBan : info.SoPhieu}
                statusMeta={statusMeta}
                backLabel={isStandaloneBienBan ? "Danh sách phiếu xử lý không phù hợp" : "Danh sách biên bản"}
                onBack={leaveDetail}
                primaryAction={primaryAction}
                saveState={saveState}
                onPrint={handlePrintPreview}
                onOpenInspection={!isStandaloneBienBan && info.PhieuKiemId ? () => navigate(info.IsCongDoan
                    ? `/phieu-kiem/cong-doan/${info.PhieuKiemId}`
                    : `/phieu-kiem/${info.PhieuKiemId}`) : null}
                onDelete={currentUserPermissions.includes("XOA_HO_SO_KCS")
                    ? (isStandaloneBienBan ? handleDeleteStandalone : handleDeleteBienBan)
                    : null}
                deleteLabel={isStandaloneBienBan ? "Xóa phiếu" : "Xóa biên bản"}
            />

            <Box sx={{ px: { xs: 1, sm: 1.5, md: 3 }, pt: 1.5 }}>
                <BienBanWorkflowGuide workflow={workflow} sectionItems={DETAIL_SECTIONS} onNavigate={scrollToSection} />
                {info.TrangThai === "TRA_LAI_CHINH_SUA" && (
                    <Paper variant="outlined" sx={{ mb: 2, p: 1.5, borderColor: "error.main", bgcolor: "#fff5f5" }}>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
                            <Box id={!isV01 ? "bien-ban-y-kien-chuyen-mon" : undefined} sx={{ scrollMarginTop: 86 }}>
                                <Typography color="error.main" fontWeight={800}>Biên bản đã được trả lại để chỉnh sửa</Typography>
                                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>{info.LastReturnReason || "Chưa ghi nhận lý do"}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {info.LastReturnedByName || "Trưởng bộ phận"}
                                    {info.LastReturnedAt ? ` · ${new Date(info.LastReturnedAt).toLocaleString("vi-VN")}` : ""}
                                </Typography>
                            </Box>
                            {info.CanResubmit && <Button variant="contained" color="warning" startIcon={<AssignmentTurnedInIcon />} onClick={handleResubmit}>
                                Gửi lại các bộ phận xác nhận
                            </Button>}
                        </Stack>
                    </Paper>
                )}
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 3fr) minmax(280px, 1fr)" },
                        gridTemplateAreas: { xs: '"sidebar" "main"', lg: '"main sidebar"' },
                        gap: { xs: 1.5, md: 2 },
                        alignItems: "start"
                    }}
                >
                    <Box sx={{
                        gridArea: "main",
                        minWidth: 0,
                        "& .MuiCard-root": { borderRadius: 2 },
                        "& .MuiCardContent-root": { p: { xs: 1.25, md: 1.5 } },
                        "& .MuiCardContent-root:last-child": { pb: { xs: 1.25, md: 1.5 } },
                        "& .MuiTypography-h6": { fontSize: { xs: "1rem", md: "1.075rem" }, lineHeight: 1.3 }
                    }}>
                    <Grid container spacing={1.5}>
                    {/* Thông tin chung & lỗi: dùng toàn chiều rộng theo bố cục hồ sơ một cột. */}
                    <Grid id="bien-ban-thong-tin" size={{ xs: 12 }} sx={{ scrollMarginTop: 100 }}>
                        <Stack spacing={2}>
                            {/* Card Header Info */}
                            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                                    <Typography variant="subtitle1" fontWeight={800} mb={1}>Thông tin chung</Typography>
                                    <Divider sx={{ mb: 1 }} />
                                    {isStandaloneBienBan ? (
                                        <Stack spacing={1.5}>
                                            <Grid container spacing={2}>
                                                <Grid size={{ xs: 12, sm: 4 }}>
                                                    <Typography variant="caption" color="text.secondary">Người lập</Typography>
                                                    <Typography variant="body1" fontWeight="500">{info.NguoiLap || "---"}</Typography>
                                                </Grid>
                                                <Grid size={{ xs: 12, sm: 4 }}>
                                                    <Typography variant="caption" color="text.secondary">Ngày tạo</Typography>
                                                    <Typography variant="body2">
                                                        {info.CreatedAt ? new Date(info.CreatedAt).toLocaleString("vi-VN") : "---"}
                                                    </Typography>
                                                </Grid>
                                                <Grid size={{ xs: 12, sm: 4 }}>
                                                    <Typography variant="caption" color="text.secondary">Mức độ không phù hợp</Typography>
                                                    <Typography variant="body2">
                                                        {MUC_DO_KPH_OPTIONS.find(([value]) => value === headerFields.MucDo)?.[1]
                                                            || info.MucDoKhongPhuHop
                                                            || "---"}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                                <Chip size="small" variant="outlined" label={`Số dòng lỗi: ${defectCount}`} />
                                                <Chip size="small" variant="outlined" label={`Tổng SL lỗi: ${totalDefectQty}`} />
                                                <Chip size="small" variant="outlined" label={`${isV01 ? "Bộ phận cần ý kiến" : "Bộ phận xử lý"}: ${workflowDepartments.length}`} />
                                            </Stack>
                                        </Stack>
                                    ) : (
                                        <Grid container spacing={{ xs: 1, md: 2 }} alignItems="start">
                                            <Grid size={{ xs: 12, md: 5 }}>
                                                <Typography variant="caption" color="text.secondary">Sản phẩm</Typography>
                                                <Typography variant="body1" fontWeight="500">{info.TenSanPham}</Typography>
                                            </Grid>
                                            <Grid size={{ xs: 6, sm: 3, md: 1.5 }}><Typography variant="caption" color="text.secondary">Lot</Typography><Typography variant="body2">{info.Lot || '—'}</Typography></Grid>
                                            <Grid size={{ xs: 6, sm: 3, md: 2 }}><Typography variant="caption" color="text.secondary">Người lập</Typography><Typography variant="body2">{info.NguoiLap || '—'}</Typography></Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 3.5 }}><Typography variant="caption" color="text.secondary">Nơi đến</Typography><Typography variant="body2">{info.DoiTuong || '—'}</Typography></Grid>
                                        </Grid>
                                    )}
                                </CardContent>
                            </Card>

                            {!isStandaloneBienBan && info.MauPhieuVersion === "V01" && (
                                <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.25}>
                                            <Typography variant="h6"><DescriptionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Thông tin sự không phù hợp</Typography>
                                            {canEditKphCustomFields && !isEditingKphHeader && <Button variant="outlined" onClick={() => setIsEditingKphHeader(true)}>Chỉnh sửa</Button>}
                                        </Stack>
                                        <Grid container spacing={1.25}>
                                            {KPH_HEADER_FIELDS.map(([label, field]) => (
                                                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={field}>
                                                    {isEditingKphHeader ? <TextField fullWidth size="small" label={label} value={headerFields[field] || ""} onChange={(e) => handleHeaderFieldChange(field, e.target.value)} /> : <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 1 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={600}>{headerFields[field] || '—'}</Typography></Box>}
                                                </Grid>
                                            ))}
                                            {[["2. Sự không phù hợp được phát hiện từ", "PhatHienTu", PHAT_HIEN_TU_OPTIONS], ["3. Mức độ không phù hợp", "MucDo", MUC_DO_KPH_OPTIONS]].map(([label, field, options]) => (
                                                <Grid size={{ xs: 12, md: 6 }} key={field}>
                                                    {isEditingKphHeader ? <TextField fullWidth select size="small" label={label} value={headerFields[field] || ""} onChange={(e) => handleHeaderFieldChange(field, e.target.value)}><MenuItem value="">Chưa chọn</MenuItem>{options.map(([value, text]) => <MenuItem value={value} key={value}>{text}</MenuItem>)}</TextField> : <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 1 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={600}>{options.find(([value]) => value === headerFields[field])?.[1] || '—'}</Typography></Box>}
                                                </Grid>
                                            ))}
                                        </Grid>
                                        {isEditingKphHeader && <Stack direction="row" justifyContent="flex-end" spacing={1} mt={2}><Button disabled={actionSaving.header} onClick={() => restoreServerDrafts({ header: true })}>Hủy</Button><Button disabled={actionSaving.header} variant="contained" startIcon={<SaveIcon />} onClick={handleSaveKphCustomFields}>{actionSaving.header ? "Đang lưu..." : "Lưu thông tin"}</Button></Stack>}
                                    </CardContent>
                                </Card>
                            )}

                            {isStandaloneBienBan ? (
                                <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <DescriptionIcon color="action" /> Thông tin phiếu
                                            </Typography>
                                            {info.CanManageKphFlow && !isEditingStandaloneHeader && (
                                                <Button size="small" variant="outlined" onClick={() => setIsEditingStandaloneHeader(true)}>Chỉnh sửa</Button>
                                            )}
                                        </Stack>
                                        <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                                            Thông tin nhận diện
                                        </Typography>
                                        <Grid container spacing={2}>
                                            {[
                                                ["Đơn vị sản xuất", "TenBoPhan"],
                                                ["Mã ĐVSX", "MaBoPhan"],
                                                ["Mã truy nguyên", "MaTruyNguyen"],
                                                ["Lô SX", "Lot"],
                                                ["Số lượng", "SoLuongKPH"],
                                                ["Dấu tuần", "DauTuan"]
                                            ].map(([label, field]) => (
                                                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={field}>
                                                    {isEditingStandaloneHeader ? (
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            label={label}
                                                            value={headerFields[field] || ""}
                                                            onChange={(e) => handleHeaderFieldChange(field, e.target.value)}
                                                        />
                                                    ) : (
                                                        <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 1 }}>
                                                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                                                            <Typography variant="body2" fontWeight={600}>{headerFields[field] || '—'}</Typography>
                                                        </Box>
                                                    )}
                                                </Grid>
                                            ))}
                                            <Grid size={{ xs: 12, md: 8 }}>
                                                {isEditingStandaloneHeader ? (
                                                    <Autocomplete
                                                        options={catalogItemOptions}
                                                        value={selectedCatalogItem}
                                                        loading={catalogItemLoading}
                                                        onChange={handleCatalogItemChange}
                                                        onInputChange={(_, value, reason) => {
                                                            if (reason === "input") setCatalogItemSearch(value);
                                                        }}
                                                        filterOptions={(options) => options}
                                                        isOptionEqualToValue={(option, value) => Number(option.LocalProductId) === Number(value.LocalProductId)}
                                                        getOptionLabel={(option) => [option.Code, option.Name].filter(Boolean).join(" - ")}
                                                        renderOption={(props, option) => (
                                                            <Box component="li" {...props} key={`${option.SourceType}-${option.LocalProductId}`}>
                                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                                                                    <Chip size="small" color={option.SourceType === "VAT_TU" ? "warning" : "primary"} label={option.SourceType === "VAT_TU" ? "Vật tư" : "BTP/TP"} />
                                                                    <Box sx={{ minWidth: 0 }}>
                                                                        <Typography variant="body2" fontWeight={700}>{option.Code}</Typography>
                                                                        <Typography variant="caption" color="text.secondary">{option.Name}</Typography>
                                                                    </Box>
                                                                </Stack>
                                                            </Box>
                                                        )}
                                                        renderInput={(params) => (
                                                            <TextField
                                                                {...params}
                                                                size="small"
                                                                label="VT/BTP/TP (không bắt buộc)"
                                                                placeholder="Nhập mã hoặc tên để tìm..."
                                                                slotProps={{
                                                                    input: {
                                                                        ...params.InputProps,
                                                                        endAdornment: <>{catalogItemLoading && <CircularProgress size={18} />}{params.InputProps.endAdornment}</>
                                                                    }
                                                                }}
                                                            />
                                                        )}
                                                    />
                                                ) : (
                                                    <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 1 }}>
                                                        <Typography variant="caption" color="text.secondary">VT/BTP/TP</Typography>
                                                        <Typography variant="body2" fontWeight={600}>{[headerFields.MaSanPham, headerFields.TenSanPham].filter(Boolean).join(" - ") || '—'}</Typography>
                                                    </Box>
                                                )}
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                    {isEditingStandaloneHeader ? (
                                                        <Autocomplete
                                                            options={orderOptions}
                                                            value={selectedOrder}
                                                            loading={orderLoading}
                                                            onChange={handleOrderChange}
                                                            onInputChange={(_, value, reason) => {
                                                                if (reason === "input") setOrderSearch(value);
                                                            }}
                                                            filterOptions={(options) => options}
                                                            isOptionEqualToValue={(option, value) => Number(option.OrderId) === Number(value.OrderId)}
                                                            getOptionLabel={(option) => option.OrderCode || ""}
                                                            renderInput={(params) => (
                                                                <TextField
                                                                    {...params}
                                                                    size="small"
                                                                    label="Đơn hàng (không bắt buộc)"
                                                                    placeholder="Nhập mã đơn hàng..."
                                                                    helperText={selectedCatalogItem?.SourceType === "SAN_PHAM"
                                                                        ? "Chỉ hiển thị đơn hàng có BTP/TP đã chọn"
                                                                        : selectedCatalogItem?.SourceType === "VAT_TU"
                                                                            ? "Vật tư có thể chọn bất kỳ đơn hàng"
                                                                            : "Có thể chọn đơn hàng độc lập"}
                                                                    slotProps={{
                                                                        input: {
                                                                            ...params.InputProps,
                                                                            endAdornment: <>{orderLoading && <CircularProgress size={18} />}{params.InputProps.endAdornment}</>
                                                                        }
                                                                    }}
                                                                />
                                                            )}
                                                        />
                                                    ) : (
                                                        <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 1 }}>
                                                            <Typography variant="caption" color="text.secondary">Đơn hàng</Typography>
                                                            <Typography variant="body2" fontWeight={600}>{headerFields.DonHang || '—'}</Typography>
                                                        </Box>
                                                    )}
                                            </Grid>
                                            {[
                                                ["2. Sự không phù hợp được phát hiện từ", "PhatHienTu", PHAT_HIEN_TU_OPTIONS],
                                                ["3. Mức độ không phù hợp", "MucDo", MUC_DO_KPH_OPTIONS]
                                            ].map(([label, field, options]) => (
                                                <Grid size={{ xs: 12, md: 6 }} key={field}>
                                                    {isEditingStandaloneHeader ? (
                                                        <TextField
                                                            fullWidth
                                                            select
                                                            size="small"
                                                            label={label}
                                                            value={headerFields[field] || ""}
                                                            onChange={(event) => handleHeaderFieldChange(field, event.target.value)}
                                                        >
                                                            <MenuItem value="">Chưa chọn</MenuItem>
                                                            {options.map(([value, text]) => (
                                                                <MenuItem value={value} key={value}>{text}</MenuItem>
                                                            ))}
                                                        </TextField>
                                                    ) : (
                                                        <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 1 }}>
                                                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                                                            <Typography variant="body2" fontWeight={600}>
                                                                {options.find(([value]) => value === headerFields[field])?.[1] || '—'}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Grid>
                                            ))}
                                            <Grid size={{ xs: 12 }}>
                                                <Divider sx={{ my: 0.5 }} />
                                            </Grid>
                                            <Grid size={{ xs: 12 }}>
                                                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                                                    Mô tả sự không phù hợp
                                                </Typography>
                                            </Grid>
                                            <Grid size={{ xs: 12 }}>
                                                {isEditingStandaloneHeader ? (
                                                    <TextField
                                                        fullWidth
                                                        multiline
                                                        minRows={4}
                                                        label="Mô tả chung"
                                                        placeholder="Nhập mô tả chi tiết về tình trạng không phù hợp..."
                                                        value={moTaChung}
                                                        onChange={(e) => setMoTaChung(e.target.value)}
                                                        sx={{
                                                            bgcolor: '#fff',
                                                            '& .MuiInputBase-root': { borderRadius: 1.5 }
                                                        }}
                                                    />
                                                ) : (
                                                    <Box sx={{ p: 1.25, bgcolor: '#f8fafc', borderRadius: 1, minHeight: 64 }}>
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                                                            Mô tả chung
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight={500} sx={{ whiteSpace: 'pre-wrap' }}>
                                                            {moTaChung || '—'}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Grid>
                                        </Grid>
                                        {isEditingStandaloneHeader && (
                                            <Stack direction="row" justifyContent="flex-end" spacing={1} mt={2}>
                                                <Button disabled={actionSaving.description} color="inherit" onClick={restoreStandaloneHeader}>Hủy</Button>
                                                <Button disabled={actionSaving.description} variant="contained" startIcon={<SaveIcon />} onClick={handleSaveStandaloneHeader}>
                                                    {actionSaving.description ? "Đang lưu..." : "Lưu thông tin phiếu"}
                                                </Button>
                                            </Stack>
                                        )}
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <DescriptionIcon color="action" /> Mô tả chung
                                            </Typography>
                                            {moTaConfirmed && info.CanManageKphFlow && (
                                                <Button size="small" variant="outlined" onClick={() => setMoTaConfirmed(false)}>Chỉnh sửa</Button>
                                            )}
                                        </Stack>
                                        {moTaConfirmed ? (
                                            <Box sx={{ px: 1 }}>
                                                <Typography
                                                    variant="body1"
                                                    sx={{
                                                        whiteSpace: 'pre-wrap',
                                                        color: 'text.primary',
                                                        lineHeight: 1.7
                                                    }}
                                                >
                                                    {moTaChung}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <>
                                                <TextField
                                                    fullWidth
                                                    multiline
                                                    minRows={4}
                                                    placeholder="Nhập mô tả chi tiết về tình trạng lỗi..."
                                                    value={moTaChung}
                                                    onChange={(e) => setMoTaChung(e.target.value)}
                                                    sx={{
                                                        bgcolor: '#fff',
                                                        '& .MuiInputBase-root': { borderRadius: 1.5 }
                                                    }}
                                                />
                                                <Box sx={{ mt: 2, textAlign: 'right' }}>
                                                    <Button disabled={actionSaving.description} variant="contained" startIcon={<SaveIcon />} onClick={handleConfirmMoTa}>
                                                        {actionSaving.description ? "Đang lưu..." : "Lưu mô tả"}
                                                    </Button>
                                                </Box>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Card Danh Sách Lỗi */}
                            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                {(isStandaloneBienBan || canEditKphDefects) ? (
                                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                            <Box>
                                                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <BugReportIcon color="error" /> Mô tả chi tiết sự không phù hợp
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                    Các lỗi trên phiếu phải được chọn từ ngân hàng lỗi.
                                                </Typography>
                                            </Box>
                                            {isEditingStandaloneDefects && canEditKphDefects ? (
                                                <Stack direction="row" spacing={1}>
                                                    <Button size="small" variant="contained" onClick={addCatalogDefectRow}>
                                                        Thêm lỗi
                                                    </Button>
                                                </Stack>
                                            ) : canEditKphDefects ? (
                                                <Stack direction="row" spacing={1}>
                                                    <Button size="small" variant="outlined" onClick={() => setIsEditingStandaloneDefects(true)}>
                                                        Chỉnh sửa
                                                    </Button>
                                                </Stack>
                                            ) : null}
                                        </Stack>
                                        {!isEditingStandaloneDefects ? (
                                            defects.length === 0 ? (
                                                <Box sx={{ py: 5, textAlign: "center", color: "text.secondary", border: "1px dashed #d0d7de", borderRadius: 2 }}>
                                                    Chưa có dòng lỗi. Bấm chỉnh sửa để chọn lỗi từ ngân hàng lỗi.
                                                </Box>
                                            ) : (
                                                <Stack spacing={1.5}>
                                                    {defects.map((d, i) => {
                                                        const title = d.TenLoi || d.TenLoiTuNhap || d.MoTa || `Dòng lỗi ${i + 1}`;
                                                        return (
                                                            <Paper
                                                                key={`${d.Id || "saved"}-${i}`}
                                                                variant="outlined"
                                                                sx={{ p: 1.75, borderRadius: 2, bgcolor: "#fff" }}
                                                            >
                                                                <Stack
                                                                    direction={{ xs: "column", md: "row" }}
                                                                    justifyContent="space-between"
                                                                    spacing={1.5}
                                                                    alignItems={{ xs: "flex-start", md: "center" }}
                                                                >
                                                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                                                        <Typography variant="body2" fontWeight={700}>
                                                                            {title}
                                                                        </Typography>
                                                                        {d.MoTa && (
                                                                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, whiteSpace: "pre-wrap" }}>
                                                                                {d.MoTa}
                                                                            </Typography>
                                                                        )}
                                                                        {d.GhiChu && (
                                                                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                                                                                Ghi chú: {d.GhiChu}
                                                                            </Typography>
                                                                        )}
                                                                    </Box>
                                                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                                                        <Chip size="small" variant="outlined" label={d.DefectType || "MINOR"} />
                                                                        <Chip size="small" variant="outlined" label={`SL kiểm ${d.SoLuongKiem || "—"}`} />
                                                                        <Chip size="small" variant="outlined" label={`SL lỗi ${d.SoLuong || 1}`} />
                                                                        {Number(d.SoLuongKiem) > 0 && (
                                                                            <Chip
                                                                                size="small"
                                                                                color="info"
                                                                                variant="outlined"
                                                                                label={`Tỷ lệ ${((Number(d.SoLuong || 0) / Number(d.SoLuongKiem)) * 100).toFixed(2)}%`}
                                                                            />
                                                                        )}
                                                                        {d.MaLoi && <Chip size="small" variant="outlined" label={d.MaLoi} />}
                                                                    </Stack>
                                                                </Stack>
                                                            </Paper>
                                                        );
                                                    })}
                                                </Stack>
                                            )
                                        ) : defects.length === 0 ? (
                                            <Box sx={{ py: 5, textAlign: "center", color: "text.secondary", border: "1px dashed #d0d7de", borderRadius: 2 }}>
                                                Chưa có dòng lỗi. Thêm dòng và chọn lỗi từ ngân hàng lỗi để bắt đầu.
                                            </Box>
                                        ) : (
                                            <Stack spacing={2}>
                                                {defects.map((d, i) => {
                                                    const selectedOption = defectOptions.find((option) => Number(option.Id) === Number(d.DefectId)) || null;

                                                    return (
                                                        <Paper
                                                            key={`${d.Id || "new"}-${i}`}
                                                            variant="outlined"
                                                            sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "#fcfcfd" }}
                                                        >
                                                            <Stack spacing={1}>
                                                                <Grid container spacing={1} alignItems="center">
                                                                    <Grid size={{ xs: 12, md: 10 }}>
                                                                        <DefectPickerDialog
                                                                            defects={defectOptions}
                                                                            onSelect={(value) => handleCatalogDefectSelected(i, value?.Id || "")}
                                                                            buttonLabel={selectedOption
                                                                                ? `${selectedOption.MaLoi ? `${selectedOption.MaLoi} - ` : ""}${selectedOption.TenLoi || ""}`
                                                                                : "Chọn lỗi từ ngân hàng lỗi"}
                                                                            fullWidth
                                                                        />
                                                                    </Grid>
                                                                    <Grid size={{ xs: 12, md: 2 }}>
                                                                        <Stack direction="row" justifyContent={{ xs: "space-between", md: "flex-end" }} alignItems="center" spacing={1}>
                                                                            <Chip size="small" color={getDefectColor(d.DefectType)} label={d.DefectType || "MINOR"} />
                                                                            <IconButton color="error" size="small" aria-label="Xóa dòng lỗi" onClick={() => removeStandaloneDefect(i)}>
                                                                                <DeleteOutlineIcon />
                                                                            </IconButton>
                                                                        </Stack>
                                                                    </Grid>
                                                                </Grid>
                                                                <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, whiteSpace: "pre-wrap" }}>
                                                                    {selectedOption?.MoTa || "Chưa chọn lỗi từ ngân hàng lỗi"}
                                                                </Typography>
                                                                <Grid container spacing={1}>
                                                                    <Grid size={{ xs: 6, md: 2 }}>
                                                                        <TextField
                                                                            fullWidth
                                                                            size="small"
                                                                            type="number"
                                                                            label="Số lượng kiểm"
                                                                            value={d.SoLuongKiem ?? ""}
                                                                            onChange={(e) => updateStandaloneDefect(i, { SoLuongKiem: e.target.value })}
                                                                            inputProps={{ min: 1, step: 1 }}
                                                                        />
                                                                    </Grid>
                                                                    <Grid size={{ xs: 6, md: 2 }}>
                                                                        <TextField
                                                                            fullWidth
                                                                            size="small"
                                                                            type="number"
                                                                            label="Số lượng lỗi"
                                                                            value={d.SoLuong ?? 1}
                                                                            onChange={(e) => updateStandaloneDefect(i, { SoLuong: e.target.value })}
                                                                            inputProps={{ min: 1, step: 1 }}
                                                                        />
                                                                    </Grid>
                                                                    <Grid size={{ xs: 12, md: 8 }}>
                                                                        <TextField
                                                                            fullWidth
                                                                            size="small"
                                                                            label="Ghi chú"
                                                                            value={d.GhiChu || ""}
                                                                            onChange={(e) => updateStandaloneDefect(i, { GhiChu: e.target.value })}
                                                                        />
                                                                    </Grid>
                                                                </Grid>
                                                            </Stack>
                                                        </Paper>
                                                    );
                                                })}
                                            </Stack>
                                        )}
                                        {isEditingStandaloneDefects && (
                                            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
                                                <Button disabled={actionSaving.defects} variant="text" color="inherit" onClick={() => restoreServerDrafts({ defects: true })}>
                                                    Hủy
                                                </Button>
                                                <Button disabled={actionSaving.defects} variant="contained" startIcon={<SaveIcon />} onClick={handleSaveStandaloneDefects}>
                                                    {actionSaving.defects ? "Đang lưu..." : "Lưu danh sách lỗi"}
                                                </Button>
                                            </Box>
                                        )}
                                    </CardContent>
                                ) : (
                                    <CardContent sx={{ p: 0 }}>
                                        <Box sx={{ p: 2, pb: 1 }}>
                                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <BugReportIcon color="error" /> Chi tiết lỗi
                                            </Typography>
                                        </Box>
                                        <Box sx={{ px: { xs: 1.25, md: 2 }, pb: 1.5 }}>
                                            <ResponsiveDataList
                                                rows={defects}
                                                emptyText="Chưa có dữ liệu lỗi"
                                                columns={[
                                                    { key: "info", label: "Thông tin lỗi", render: renderDefectDetails },
                                                    { key: "mucDo", label: "Mức độ", align: "center", render: (row) => <Chip label={row.DefectType || "—"} color={getDefectColor(row.DefectType)} size="small" variant="outlined" /> },
                                                    { key: "soLuong", label: "Số lượng", align: "right", render: (row) => <Typography variant="body2" fontWeight="bold">{row.SoLuong}</Typography> }
                                                ]}
                                            />
                                        </Box>
                                    </CardContent>
                                )}
                            </Card>

                            <Box id="bien-ban-xac-nhan" sx={{ scrollMarginTop: 86 }} />
                            {isStandaloneBienBan && isV01 && (
                                <Card
                                    elevation={0}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: info.CreatorConfirmedAt ? 'success.light' : 'warning.light',
                                        borderRadius: 2,
                                        bgcolor: info.CreatorConfirmedAt ? '#f0fdf4' : '#fffbeb'
                                    }}
                                >
                                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                        <Stack
                                            direction={{ xs: 'column', md: 'row' }}
                                            justifyContent="space-between"
                                            alignItems={{ xs: 'stretch', md: 'center' }}
                                            spacing={2}
                                        >
                                            <Box>
                                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <VerifiedIcon color={info.CreatorConfirmedAt ? "success" : "warning"} />
                                                        Xác nhận của Trưởng bộ phận
                                                    </Typography>
                                                    <Chip
                                                        size="small"
                                                        color={info.CreatorConfirmedAt ? "success" : "warning"}
                                                        label={info.CreatorConfirmedAt ? "Đã xác nhận" : "Chưa xác nhận"}
                                                    />
                                                </Stack>
                                                {info.CreatorConfirmedAt ? (
                                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                        Người xác nhận: <strong>{info.CreatorConfirmerName || "Trưởng bộ phận tạo phiếu"}</strong>
                                                        {` · ${new Date(info.CreatorConfirmedAt).toLocaleString("vi-VN")}`}
                                                    </Typography>
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                        Sử dụng xác nhận cuối của Trưởng bộ phận tạo phiếu. Chữ ký này được hiển thị giữa mục 4 và mục 5 trên bản in.
                                                        Nút xác nhận sẽ xuất hiện khi các bộ phận đã xác nhận đầy đủ ý kiến.
                                                    </Typography>
                                                )}
                                            </Box>
                                            {!info.CreatorConfirmedAt && canSubmitCompletion && (
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    startIcon={<VerifiedIcon />}
                                                    onClick={handleComplete}
                                                    sx={{ flexShrink: 0 }}
                                                >
                                                    Xác nhận và chuyển theo dõi
                                                </Button>
                                            )}
                                        </Stack>
                                    </CardContent>
                                </Card>
                            )}
                        </Stack>
                    </Grid>

                    {/* Các luồng xử lý */}
                    <Grid id="bien-ban-xu-ly" size={{ xs: 12 }} sx={{ scrollMarginTop: 100 }}>
                        <Stack spacing={2}>

                            {/* Phân công xử lý */}
                            {moTaConfirmed && !isV01 && (
                                <Card id="bien-ban-phan-cong" elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, scrollMarginTop: 86 }}>
                                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.25}>
                                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <GroupWorkIcon color="primary" /> {isV01 ? "Bộ phận cần lấy ý kiến" : "Bộ phận phối hợp xử lý"}
                                            </Typography>
                                            {isV01 && info.CanManageKphFlow && !info.CreatorConfirmedAt && (
                                                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setOpenAssignModal(true)}>
                                                    {specialistOpinions.length ? "Bổ sung / cập nhật" : "Chọn bộ phận"}
                                                </Button>
                                            )}
                                        </Stack>
                                        <Divider sx={{ mb: 2 }} />

                                        {workflowDepartments.length === 0 ? (
                                            <Typography color="text.secondary" fontStyle="italic">Chưa có bộ phận được chọn.</Typography>
                                        ) : (
                                            <ResponsiveDataList
                                                rows={workflowDepartments}
                                                emptyText="Chưa có bộ phận được chọn."
                                                columns={[
                                                    { key: "boPhan", label: "Bộ phận", cellSx: { fontWeight: 700 }, render: (row) => row.TenBoPhan || "—" },
                                                    { key: "ma", label: "Mã bộ phận", render: (row) => row.MaBoPhan || "—" },
                                                    {
                                                        key: "trangThai", label: "Trạng thái", align: "right",
                                                        render: (row) => <Chip size="small"
                                                            label={isV01 ? (row.HasConfirmed ? "Đã xác nhận" : row.HasOpinion ? "Chờ TBP xác nhận" : "Chờ ý kiến") : getStatusText(row.BoPhanId)}
                                                            color={isV01 ? (row.HasConfirmed ? "success" : row.HasOpinion ? "warning" : "default") : getStatusColor(row.BoPhanId)} />
                                                    }
                                                ]}
                                            />
                                        )}
                                        {!isV01 && info.AssignConfirmed && <Stack direction="row" flexWrap="wrap" sx={{ mt: 2, gap: 1 }}>{assigns.filter((a) => (isAdminUser || currentUserDepartmentIds.has(Number(a.BoPhanId))) && !xacNhan.some((x) => Number(x.BoPhanId) === Number(a.BoPhanId))).map((a) => <Button key={a.BoPhanId} size="small" variant="outlined" onClick={() => handleConfirmUser(a.BoPhanId)}>Xác nhận {a.MaBoPhan}</Button>)}</Stack>}

                                        {!isV01 && !info.AssignConfirmed && assigns.length > 0 && isManagerOrQA && (
                                            <Box sx={{ mt: 2, textAlign: 'right' }}>
                                                <Button variant="contained" color="warning" onClick={handleConfirmAssign} startIcon={<AssignmentTurnedInIcon />}>
                                                    Chốt phân công
                                                </Button>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Ý kiến xử lý */}
                            <Card id="bien-ban-phuong-an" elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, scrollMarginTop: 86 }}>
                                <CardContent sx={{ p: 0 }}>
                                    <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <LightbulbCircleIcon color="warning" /> Ý kiến / Đề xuất xử lý
                                        </Typography>
                                        {canAddProposal && !["CHO_THEO_DOI", "HOAN_TAT"].includes(info.TrangThai) && (
                                            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpenXuLyModal(true)}>
                                                Thêm đề xuất
                                            </Button>
                                        )}
                                    </Box>
                                    <Box sx={{ px: { xs: 1.25, md: 2 }, pb: 1.5 }}>
                                        <ResponsiveDataList
                                            rows={xuLy}
                                            emptyText="Chưa có ý kiến xử lý"
                                            columns={[
                                                { key: "noiDung", label: "Nội dung ý kiến", cellSx: { whiteSpace: "pre-wrap", minWidth: 220 }, render: (row) => row.NoiDung || "—" },
                                                { key: "deNghi", label: "Đề nghị xử lý", render: (row) => row.DeNghiXuLy || "—" },
                                                { key: "trachNhiem", label: "Trách nhiệm", render: (row) => row.TrachNhiem || "—" },
                                                { key: "theoDoi", label: "Theo dõi", cellSx: { fontWeight: 600 }, render: (row) => row.TheoDoi || "—" },
                                                { key: "thoiHan", label: "Thời hạn", cellSx: { whiteSpace: "nowrap", color: "error.main" }, render: (row) => row.ThoiHan ? new Date(row.ThoiHan).toLocaleDateString("vi-VN") : "—" }
                                            ]}
                                        />
                                    </Box>
                                </CardContent>
                            </Card>

                            {/* Chi phí & hành động khắc phục xếp dọc để bảng có đủ không gian. */}
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12 }}>
                                    <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, height: '100%' }}>
                                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.25}>
                                                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1.1rem' }}>
                                                    <AttachMoneyIcon color="success" /> Chi phí phát sinh
                                                </Typography>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Chip size="small"
                                                        color={(isV01 ? chiPhi.length > 0 : info.YeuCauChiPhi) ? "success" : "default"}
                                                        label={isV01 ? (chiPhi.length > 0 ? "Có ghi nhận" : "Tùy chọn") : (info.YeuCauChiPhi ? "Yêu cầu" : "Không yêu cầu")}
                                                    />
                                                    {info.CanContributeKphSections && !["CHO_THEO_DOI", "HOAN_TAT"].includes(info.TrangThai) && (
                                                        <Button size="small" color="success" startIcon={<AddIcon />} onClick={() => setOpenChiPhiModal(true)}>
                                                            Thêm chi phí
                                                        </Button>
                                                    )}
                                                </Stack>
                                            </Stack>
                                            <Divider sx={{ mb: 2 }} />
                                            <ResponsiveDataList
                                                rows={chiPhi}
                                                emptyText="Không ghi nhận chi phí."
                                                columns={[
                                                    { key: "loai", label: "Loại chi phí", render: (row) => row.LoaiChiPhi || "—" },
                                                    { key: "boPhan", label: "Bộ phận", render: (row) => row.TenBoPhan || "—" },
                                                    { key: "giaTri", label: "Giá trị", align: "right", cellSx: { color: "success.main", fontWeight: 700, whiteSpace: "nowrap" }, render: (row) => `${Number(row.GiaTri || 0).toLocaleString("vi-VN")} đ` }
                                                ]}
                                            />
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, height: '100%' }}>
                                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.25}>
                                                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1.1rem' }}>
                                                    <BuildCircleIcon color="info" /> Hành động khắc phục
                                                </Typography>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Chip size="small"
                                                        color={(isV01 ? hanhDong.length > 0 : info.YeuCauHanhDong) ? "success" : "default"}
                                                        label={isV01 ? (hanhDong.length > 0 ? "Có ghi nhận" : "Tùy chọn") : (info.YeuCauHanhDong ? "Yêu cầu" : "Không yêu cầu")}
                                                    />
                                                    {info.CanContributeKphSections && !["CHO_THEO_DOI", "HOAN_TAT"].includes(info.TrangThai) && (
                                                        <Button size="small" color="info" startIcon={<AddIcon />} onClick={() => setOpenHanhDongModal(true)}>
                                                            Thêm hành động
                                                        </Button>
                                                    )}
                                                </Stack>
                                            </Stack>
                                            <Divider sx={{ mb: 2 }} />
                                            <ResponsiveDataList
                                                rows={hanhDong}
                                                emptyText="Chưa có hành động cụ thể."
                                                columns={[
                                                    { key: "noiDung", label: "Nội dung", cellSx: { whiteSpace: "pre-wrap" }, render: (row) => row.NoiDung || "—" },
                                                    { key: "boPhan", label: "Bộ phận", render: (row) => row.TenBoPhan || "—" },
                                                    { key: "thoiHan", label: "Thời hạn", cellSx: { color: "error.main", whiteSpace: "nowrap" }, render: (row) => row.ThoiHan ? new Date(row.ThoiHan).toLocaleDateString("vi-VN") : "—" },
                                                    { key: "theoDoi", label: "Người theo dõi", render: (row) => row.NguoiTheoDoi || row.NguoiXuLy || row.TheoDoi || "—" }
                                                ]}
                                            />
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            {isV01 && <Box id="bien-ban-phan-cong" sx={{ scrollMarginTop: 86 }} />}
                            <Box>
                                <KphV01WorkflowSections
                                    bienBanId={bienBanId} info={info}
                                    opinions={specialistOpinions} evaluation={followUpEvaluation}
                                    currentUserBoPhanId={currentUserBoPhanId} permissions={currentUserPermissions}
                                    roles={currentUserRoles}
                                    isAdmin={Boolean(info?.IsAdmin) || isAdminUser}
                                    onPatchOpinion={patchSpecialistOpinion}
                                    onReturned={handleReviewReturned}
                                    reload={refreshData} showToast={showToast}
                                    canManageDepartments={Boolean(info.CanManageKphFlow && !info.CreatorConfirmedAt)}
                                    onManageDepartments={() => setOpenAssignModal(true)}
                                />
                            </Box>

                            {/* Lịch sử xác nhận */}
                            {!isV01 && <Box id="bien-ban-theo-doi" sx={{ scrollMarginTop: 86 }} />}
                            {xacNhan.length > 0 && (
                                <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <VerifiedIcon color="success" /> Lịch sử xác nhận
                                        </Typography>
                                        <Grid container spacing={2}>
                                            {xacNhan.map((x, i) => (
                                                <Grid size={{ xs: 12, sm: 6 }} key={i}>
                                                    <Paper variant="outlined" sx={{ p: 1.5, borderLeft: '4px solid #4caf50' }}>
                                                        <Typography variant="body2" fontWeight="bold">{x.FullName}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{new Date(x.ThoiGian).toLocaleString("vi-VN")}</Typography>
                                                    </Paper>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </CardContent>
                                </Card>
                            )}
                        </Stack>
                    </Grid>
                    </Grid>

                    <Box id="bien-ban-tai-lieu" sx={{ mt: 1.5, scrollMarginTop: 86 }}>
                        <BienBanAttachments bienBanId={bienBanId} />
                    </Box>
                    </Box>

                    <Box sx={{ gridArea: "sidebar", minWidth: 0 }}>
                        <BienBanDetailSidebar
                            workflow={workflow}
                            info={info}
                            headerFields={sidebarFields}
                            defectsCount={defectCount}
                            totalDefectQty={totalDefectQty}
                            departments={departmentsForSidebar}
                            missingItems={missingItems}
                            sectionItems={DETAIL_SECTIONS}
                            onNavigate={scrollToSection}
                        />
                    </Box>
                </Box>

            </Box>
            {/* --- Dialogs (Giữ nguyên logic, chỉnh nhẹ CSS) --- */}

            {/* Print Preview Modal */}
            <Dialog open={openPrintModal} onClose={() => setOpenPrintModal(false)} maxWidth="lg" fullWidth>
                <DialogTitle>Xem trước bản in</DialogTitle>
                <DialogContent dividers sx={{ bgcolor: '#525659', p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Paper sx={{ width: '210mm', minHeight: '297mm', p: 0, boxShadow: 3 }}>
                            {isStandaloneBienBan ? (
                                <PhieuXuLyKhongPhuHopPrintTemplate
                                    ref={componentRef}
                                    info={{ ...info, MoTaChung: moTaChung }}
                                    defects={defects}
                                    xuLy={xuLy}
                                    chiPhi={chiPhi}
                                    hanhDong={hanhDong}
                                    xacNhan={xacNhan}
                                    phieuKiemXacNhan={phieuKiemXacNhan}
                                    assigns={workflowDepartments}
                                    dynamicFields={dynamicFields}
                                    specialistOpinions={specialistOpinions}
                                    followUpEvaluation={followUpEvaluation}
                                />
                            ) : isTrenChuyenBienBan ? (
                                <BienBanTrenChuyenPrintTemplate
                                    ref={componentRef}
                                    info={{ ...info, MoTaChung: moTaChung }}
                                    defects={defects}
                                    xuLy={xuLy}
                                    chiPhi={chiPhi}
                                    hanhDong={hanhDong}
                                    xacNhan={xacNhan}
                                    phieuKiemXacNhan={phieuKiemXacNhan}
                                    assigns={workflowDepartments}
                                    dynamicFields={dynamicFields}
                                    specialistOpinions={specialistOpinions}
                                    followUpEvaluation={followUpEvaluation}
                                    canEditCustomFields={canEditKphCustomFields}
                                />
                            ) : (
                                <BienBanPrintTemplate
                                    ref={componentRef}
                                    info={{ ...info, MoTaChung: moTaChung }}
                                    defects={defects}
                                    xuLy={xuLy}
                                    chiPhi={chiPhi}
                                    hanhDong={hanhDong}
                                    xacNhan={xacNhan}
                                    phieuKiemXacNhan={phieuKiemXacNhan}
                                    assigns={workflowDepartments}
                                    dynamicFields={dynamicFields}
                                    specialistOpinions={specialistOpinions}
                                    followUpEvaluation={followUpEvaluation}
                                    canEditCustomFields={canEditKphCustomFields}
                                />
                            )}
                        </Paper>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenPrintModal(false)} color="inherit">Đóng</Button>
                    <Button startIcon={<PrintIcon />} onClick={handlePrint} variant="contained" color="primary">
                        Tiến hành In
                    </Button>
                </DialogActions>
            </Dialog>

            <AssignDepartmentDialog
                open={openAssignModal}
                onClose={() => setOpenAssignModal(false)}
                bienBanId={bienBanId}
                reload={refreshData}
                assignedIds={workflowDepartments.map(a => a.BoPhanId)}
                isOpinionFlow={isV01}
            />
            <XuLyDialog open={openXuLyModal} onClose={() => setOpenXuLyModal(false)} bienBanId={bienBanId} reload={refreshData} />
            <ChiPhiDialog open={openChiPhiModal} onClose={() => setOpenChiPhiModal(false)} bienBanId={bienBanId} reload={refreshData} />
            <HanhDongDialog open={openHanhDongModal} onClose={() => setOpenHanhDongModal(false)} bienBanId={bienBanId} reload={refreshData} />

            <AssignUserDialog
                open={openAssignUserModal}
                onClose={() => {
                    setOpenAssignUserModal(false);
                    setSelectedAssign(null);
                }}
                bienBanId={bienBanId}
                boPhanId={selectedAssign?.BoPhanId}
                tenBoPhan={selectedAssign?.TenBoPhan}
                currentUserId={selectedAssign?.NguoiXuLyId}
                reload={refreshData}
            />

            <DefectImageGalleryDialog images={imagePreview.images} index={imagePreview.index} onChangeIndex={(index) => setImagePreview((prev) => ({ ...prev, index }))} onClose={() => setImagePreview({ images: [], index: 0 })} />

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
                loading={confirmSaving}
            />
        </Box>
    );
}

// --- Sub-components (Dialogs) ---

function AssignDepartmentDialog({ open, onClose, bienBanId, reload, assignedIds, isOpinionFlow = false }) {
    const [departments, setDepartments] = useState([]);
    const [saving, setSaving] = useState(false);
    // 1. Khởi tạo state với giá trị từ prop
    const [selected, setSelected] = useState(assignedIds || []);

    // 2. Lưu lại prop cũ để so sánh
    const [prevAssignedIds, setPrevAssignedIds] = useState(assignedIds);

    // 3. Cập nhật state ngay trong lúc render nếu prop thay đổi
    if (assignedIds !== prevAssignedIds) {
        setPrevAssignedIds(assignedIds);
        setSelected(assignedIds);
    }

    // 4. useEffect giờ ĐƠN THUẦN chỉ dùng để gọi API (tác vụ bất đồng bộ)
    useEffect(() => {
        if (open) {
            getBoPhan().then(res => setDepartments(res.data));
        }
    }, [open]);

    const handleSubmit = async () => {
        if (saving) return;
        try {
            setSaving(true);
            if (isOpinionFlow) {
                await confirmOpinionDepartments(bienBanId, selected);
            } else {
                await assignDepartments(bienBanId, selected);
            }
            onClose();
            await reload();
        } catch (err) {
            alert(err?.response?.data?.message || "Lỗi phân công");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (event) => {
        const { target: { value } } = event;
        setSelected(typeof value === 'string' ? value.split(',') : value);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle fontWeight="bold">{isOpinionFlow ? "Chọn bộ phận cần lấy ý kiến" : "Chọn bộ phận xử lý"}</DialogTitle>
            <DialogContent dividers>
                <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel>Danh sách bộ phận</InputLabel>
                    <Select
                        multiple
                        value={selected}
                        onChange={handleChange}
                        label="Danh sách bộ phận"
                        renderValue={(selected) => selected.map(id => departments.find(d => d.Id === id)?.TenBoPhan).join(', ')}
                    >
                        {departments.map((dep) => (
                            <MenuItem key={dep.Id} value={dep.Id}>
                                <Checkbox checked={selected.indexOf(dep.Id) > -1} />
                                <ListItemText primary={dep.TenBoPhan} secondary={dep.MaBoPhan} />
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit" disabled={saving}>Hủy</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary" disabled={saving}>
                    {saving ? "Đang lưu..." : (isOpinionFlow ? "Xác nhận danh sách" : "Lưu thay đổi")}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

const emptyXuLyRow = () => ({ NoiDung: '', DeNghiXuLyId: '', ThoiHan: '', TrachNhiem: '', TheoDoi: '' });
const emptyChiPhiRow = () => ({ LoaiChiPhi: '', GiaTri: '', ThoiHan: '' });
const emptyHanhDongRow = () => ({ NoiDung: '', ThoiHan: '', TheoDoi: '' });

function XuLyDialog({ open, onClose, bienBanId, reload }) {
    const [rows, setRows] = useState([emptyXuLyRow()]);
    const [deNghis, setDeNghis] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            getDeNghiXuLy().then(res => setDeNghis(res.data));
        }
    }, [open]);

    const handleClose = () => {
        setRows([emptyXuLyRow()]);
        onClose();
    };
    const updateRow = (index, field, value) => {
        setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
    };
    const removeRow = (index) => setRows(current => current.length === 1
        ? [emptyXuLyRow()]
        : current.filter((_, rowIndex) => rowIndex !== index));

    const handleSubmit = async () => {
        if (saving) return;
        if (rows.some(row => !row.NoiDung.trim() || !row.ThoiHan || !row.TrachNhiem.trim() || !row.TheoDoi.trim())) {
            alert("Vui lòng nhập đầy đủ nội dung, thời hạn, trách nhiệm và theo dõi cho tất cả các dòng");
            return;
        }
        try {
            setSaving(true);
            await addXuLy({
                bienBanId,
                items: rows.map(row => ({
                    noiDung: row.NoiDung.trim(),
                    deNghiXuLyId: row.DeNghiXuLyId || null,
                    thoiHan: row.ThoiHan,
                    trachNhiem: row.TrachNhiem.trim(),
                    theoDoi: row.TheoDoi.trim()
                }))
            });
            handleClose();
            await reload();
        } catch (err) {
            alert(err?.response?.data?.message || "Lỗi thêm xử lý");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xl">
            <DialogTitle fontWeight="bold">Nhập đề xuất xử lý</DialogTitle>
            <DialogContent dividers>
                <TableContainer>
                    <Table size="small" sx={{ minWidth: 1050 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ minWidth: 260 }}>Nội dung đề xuất</TableCell>
                                <TableCell sx={{ minWidth: 210 }}>Hình thức xử lý</TableCell>
                                <TableCell sx={{ minWidth: 150 }}>Trách nhiệm</TableCell>
                                <TableCell sx={{ minWidth: 150 }}>Thời hạn</TableCell>
                                <TableCell sx={{ minWidth: 150 }}>Theo dõi</TableCell>
                                <TableCell width={52} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell><TextField size="small" fullWidth multiline minRows={2} value={row.NoiDung} onChange={e => updateRow(index, "NoiDung", e.target.value)} /></TableCell>
                                    <TableCell>
                                        <TextField select size="small" fullWidth value={row.DeNghiXuLyId} onChange={e => updateRow(index, "DeNghiXuLyId", e.target.value)}>
                                            <MenuItem value="">Không chọn</MenuItem>
                                            {deNghis.map(d => <MenuItem key={d.Id} value={d.Id}>{d.Ten}</MenuItem>)}
                                        </TextField>
                                    </TableCell>
                                    <TableCell><TextField size="small" fullWidth value={row.TrachNhiem} onChange={e => updateRow(index, "TrachNhiem", e.target.value)} /></TableCell>
                                    <TableCell><TextField size="small" type="date" fullWidth value={row.ThoiHan} onChange={e => updateRow(index, "ThoiHan", e.target.value)} /></TableCell>
                                    <TableCell><TextField size="small" fullWidth value={row.TheoDoi} onChange={e => updateRow(index, "TheoDoi", e.target.value)} /></TableCell>
                                    <TableCell>
                                        <Button color="error" onClick={() => removeRow(index)} aria-label={`Xóa dòng ${index + 1}`}><DeleteOutlineIcon /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Button startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={() => setRows(current => [...current, emptyXuLyRow()])}>
                    Thêm dòng đề xuất
                </Button>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={handleClose} color="inherit" disabled={saving}>Hủy</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary" disabled={saving}>
                    {saving ? "Đang lưu..." : `Lưu ${rows.length} dòng`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function ChiPhiDialog({ open, onClose, bienBanId, reload }) {
    const [rows, setRows] = useState([emptyChiPhiRow()]);
    const [saving, setSaving] = useState(false);

    const handleClose = () => {
        setRows([emptyChiPhiRow()]);
        onClose();
    };
    const updateRow = (index, field, value) => {
        setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
    };
    const removeRow = (index) => setRows(current => current.length === 1
        ? [emptyChiPhiRow()]
        : current.filter((_, rowIndex) => rowIndex !== index));

    const handleSubmit = async () => {
        if (saving) return;
        if (rows.some(row => !row.LoaiChiPhi.trim())) {
            alert("Vui lòng nhập tên cho tất cả các dòng chi phí");
            return;
        }
        try {
            setSaving(true);
            await addChiPhi({
                bienBanId,
                items: rows.map(row => ({
                    loaiChiPhi: row.LoaiChiPhi.trim(),
                    giaTri: Number(row.GiaTri) || 0,
                    thoiHan: row.ThoiHan || null
                }))
            });
            handleClose();
            await reload();
        } catch (err) {
            alert(err?.response?.data?.message || "Lỗi thêm chi phí");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
            <DialogTitle fontWeight="bold">Ghi nhận chi phí phát sinh</DialogTitle>
            <DialogContent dividers>
                <TableContainer>
                    <Table size="small" sx={{ minWidth: 720 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ minWidth: 300 }}>Tên/Loại chi phí</TableCell>
                                <TableCell sx={{ minWidth: 180 }}>Giá trị (VND)</TableCell>
                                <TableCell sx={{ minWidth: 170 }}>Thời hạn dự kiến</TableCell>
                                <TableCell width={52} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell><TextField size="small" fullWidth value={row.LoaiChiPhi} onChange={e => updateRow(index, "LoaiChiPhi", e.target.value)} placeholder="Ví dụ: Chi phí vật tư" /></TableCell>
                                    <TableCell><TextField size="small" type="number" fullWidth value={row.GiaTri} onChange={e => updateRow(index, "GiaTri", e.target.value)} /></TableCell>
                                    <TableCell><TextField size="small" type="date" fullWidth value={row.ThoiHan} onChange={e => updateRow(index, "ThoiHan", e.target.value)} /></TableCell>
                                    <TableCell>
                                        <Button color="error" onClick={() => removeRow(index)} aria-label={`Xóa dòng ${index + 1}`}><DeleteOutlineIcon /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Button startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={() => setRows(current => [...current, emptyChiPhiRow()])}>
                    Thêm dòng chi phí
                </Button>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={handleClose} color="inherit" disabled={saving}>Hủy</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary" disabled={saving}>
                    {saving ? "Đang lưu..." : `Lưu ${rows.length} dòng`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function HanhDongDialog({ open, onClose, bienBanId, reload }) {
    const [rows, setRows] = useState([emptyHanhDongRow()]);
    const [saving, setSaving] = useState(false);

    const handleClose = () => {
        setRows([emptyHanhDongRow()]);
        onClose();
    };
    const updateRow = (index, field, value) => {
        setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
    };
    const removeRow = (index) => setRows(current => current.length === 1
        ? [emptyHanhDongRow()]
        : current.filter((_, rowIndex) => rowIndex !== index));

    const handleSubmit = async () => {
        if (saving) return;
        if (rows.some(row => !row.NoiDung.trim() || !row.ThoiHan || !row.TheoDoi.trim())) {
            alert("Vui lòng nhập đầy đủ nội dung, thời hạn và theo dõi cho tất cả các dòng");
            return;
        }
        try {
            setSaving(true);
            await addHanhDong({
                bienBanId,
                items: rows.map(row => ({
                    noiDung: row.NoiDung.trim(),
                    thoiHan: row.ThoiHan,
                    theoDoi: row.TheoDoi.trim()
                }))
            });
            handleClose();
            await reload();
        } catch (err) {
            alert(err?.response?.data?.message || "Lỗi thêm hành động");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
            <DialogTitle fontWeight="bold">Thêm hành động khắc phục</DialogTitle>
            <DialogContent dividers>
                <TableContainer>
                    <Table size="small" sx={{ minWidth: 800 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ minWidth: 390 }}>Nội dung hành động</TableCell>
                                <TableCell sx={{ minWidth: 180 }}>Thời hạn hoàn thành</TableCell>
                                <TableCell sx={{ minWidth: 200 }}>Theo dõi</TableCell>
                                <TableCell width={52} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell><TextField size="small" fullWidth multiline minRows={2} value={row.NoiDung} onChange={e => updateRow(index, "NoiDung", e.target.value)} /></TableCell>
                                    <TableCell><TextField size="small" type="date" fullWidth value={row.ThoiHan} onChange={e => updateRow(index, "ThoiHan", e.target.value)} /></TableCell>
                                    <TableCell><TextField size="small" fullWidth value={row.TheoDoi} onChange={e => updateRow(index, "TheoDoi", e.target.value)} /></TableCell>
                                    <TableCell>
                                        <Button color="error" onClick={() => removeRow(index)} aria-label={`Xóa dòng ${index + 1}`}><DeleteOutlineIcon /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Button startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={() => setRows(current => [...current, emptyHanhDongRow()])}>
                    Thêm dòng hành động
                </Button>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={handleClose} color="inherit" disabled={saving}>Hủy</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary" disabled={saving}>
                    {saving ? "Đang lưu..." : `Lưu ${rows.length} dòng`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function AssignUserDialog({ open, onClose, bienBanId, boPhanId, tenBoPhan, currentUserId, reload }) {
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (open && boPhanId) {
            loadUsers();
            setSelectedUserId(currentUserId || null);
        }
    }, [open, boPhanId, currentUserId]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const res = await getAssignableUsers(bienBanId, boPhanId);
            setUsers(res.data || []);
        } catch (err) {
            console.error("Load users error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedUserId || assigning) return;
        try {
            setAssigning(true);
            await assignUser(bienBanId, {
                boPhanId,
                nguoiXuLyId: selectedUserId
            });
            onClose();
            await reload();
        } catch (err) {
            alert(err?.response?.data?.message || "Lỗi phân công");
        } finally {
            setAssigning(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.FullName?.toLowerCase().includes(search.toLowerCase()) ||
        u.Username?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle fontWeight="bold">
                Phân cá nhân xử lý
                <Typography variant="caption" display="block" color="text.secondary">
                    Bộ phận: {tenBoPhan}
                </Typography>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
                <Box sx={{ p: 2 }}>
                    <TextField
                        placeholder="Tìm kiếm nhân viên..."
                        fullWidth
                        size="small"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </Box>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : (
                    <List sx={{ pt: 0, maxHeight: 400, overflow: 'auto' }}>
                        {filteredUsers.map((user) => (
                            <ListItem key={user.Id} disablePadding>
                                <ListItemButton onClick={() => setSelectedUserId(user.Id)} selected={selectedUserId === user.Id}>
                                    <ListItemText
                                        primary={user.FullName || user.Username}
                                        secondary={user.Username}
                                    />
                                    {selectedUserId === user.Id && <CheckIcon color="primary" />}
                                </ListItemButton>
                            </ListItem>
                        ))}
                        {filteredUsers.length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', p: 4 }}>
                                Không tìm thấy nhân sự phù hợp.
                            </Typography>
                        )}
                    </List>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit" disabled={assigning}>Hủy</Button>
                <Button onClick={handleAssign} variant="contained" color="primary" disabled={!selectedUserId || assigning}>
                    {assigning ? "Đang lưu..." : "Xác nhận"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
