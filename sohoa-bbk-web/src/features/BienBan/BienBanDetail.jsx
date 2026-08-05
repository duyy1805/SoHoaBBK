import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
    Container,
    List,
    ListItem,
    ListItemButton
} from "@mui/material";

// --- MUI Icons ---
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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
import BienBanWorkflowGuide from "./components/BienBanWorkflowGuide";
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

export default function BienBanDetail({ standalone = false }) {
    const { id: bienBanId } = useParams();
    const navigate = useNavigate();
    const componentRef = useRef();
    const latestLoadRequestRef = useRef(0);
    const hasLoadedRef = useRef(false);
    const serverDraftSnapshotRef = useRef(null);
    const confirmSavingRef = useRef(false);
    const { showToast } = useToast();

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
        MucDo: ""
    });
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
        hasLoadedRef.current = false;
        serverDraftSnapshotRef.current = null;
        const decoded = decodeToken();
        if (decoded) {
            setCurrentUserBoPhanId(decoded.boPhanId);
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
                SoLuongKPH: fieldsMap.SoLuongKPH || "",
                DauTuan: fieldsMap.DauTuan || "",
                PhatHienTu: fieldsMap.PhatHienTu || "",
                MucDo: fieldsMap.MucDo || ""
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
            }
            if (!background || moTaConfirmed) {
                setMoTaChung(moTa);
                setMoTaConfirmed(Boolean(moTa));
            }
            if (!background) {
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
            setIsEditingKphHeader(false);
        }
        if (restoreDefects) {
            setDefects(snapshot.defects);
            setIsEditingStandaloneDefects(false);
        }
    };

    const handleHeaderFieldChange = (fieldName, value) => {
        setHeaderFields((prev) => ({ ...prev, [fieldName]: value }));
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
            return;
        }

        try {
            setActionSaving((current) => ({ ...current, description: true }));
            await saveStandaloneBienBanHeader(bienBanId, {
                moTaChung,
                fields: headerFields
            });
            setMoTaConfirmed(true);
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

    const addManualDefectRow = () => {
        setDefects((prev) => [
            ...prev,
            {
                DefectId: null,
                MaLoi: "",
                TenLoi: "",
                TenLoiTuNhap: "",
                DefectType: "MINOR",
                MoTa: "",
                SoLuongKiem: "",
                SoLuong: 1,
                GhiChu: "",
                SortOrder: prev.length + 1,
                sourceType: "manual"
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
        const payload = defects
            .map((item, index) => ({
                DefectId: item.DefectId ? Number(item.DefectId) : null,
                MaLoi: item.MaLoi || "",
                TenLoi: item.TenLoi || "",
                DefectType: item.DefectType || "",
                TenLoiTuNhap: item.TenLoiTuNhap || "",
                MoTa: item.MoTa || "",
                SoLuongKiem: item.SoLuongKiem === "" || item.SoLuongKiem === null || item.SoLuongKiem === undefined
                    ? null
                    : Number(item.SoLuongKiem),
                SoLuong: Number(item.SoLuong) || 0,
                GhiChu: item.GhiChu || "",
                SortOrder: index + 1
            }))
            .filter((item) => (item.DefectId || item.TenLoiTuNhap) && item.SoLuong > 0);

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
                        navigate(-1);
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
                (Number(info?.BoPhanTaoId) === Number(currentUserBoPhanId) &&
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
            (Number(info?.BoPhanTaoId) === Number(currentUserBoPhanId) &&
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
                        CanSaveOpinion: isAdminUser || Number(item.BoPhanId) === Number(currentUserBoPhanId),
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
                    navigate("/phieu-xu-ly-khong-phu-hop");
                } catch (err) {
                    showToast(err?.response?.data?.message || "Không thể xóa phiếu", "error");
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
    const isAssigned = workflowDepartments.some(a => Number(a.BoPhanId) === Number(currentUserBoPhanId));
    const canAddProposal = isV01
        ? Boolean(info?.CanContributeKphSections)
        : isAssigned;
    const hasXuLy = xuLy.some(x => Number(x.BoPhanId) === Number(currentUserBoPhanId));
    const isConfirmed = xacNhan.some(x => Number(x.BoPhanId) === Number(currentUserBoPhanId));
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
    const scrollToSection = (sectionId) => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
            editInfo: () => scrollToSection("bien-ban-thong-tin"),
            manageAssignments: () => setOpenAssignModal(true),
            confirmAssignments: handleConfirmAssign,
            addProcessing: () => setOpenXuLyModal(true),
            openOpinions: () => scrollToSection("bien-ban-y-kien-chuyen-mon"),
            confirmProcessing: handleConfirmUser,
            complete: handleComplete,
            openFollowUp: () => scrollToSection("bien-ban-y-kien-chuyen-mon")
        }
    });
    const statusMeta = getBienBanStatusMeta(info?.TrangThai);

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
        <Box sx={{ bgcolor: '#f4f6f8', minHeight: '100vh', pb: 5 }}>
            {/* Top Toolbar */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 10 }}>
                <Container maxWidth="xl">
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate(isStandaloneBienBan ? "/phieu-xu-ly-khong-phu-hop" : -1)}
                            color="inherit"
                        >
                            {isStandaloneBienBan ? "Danh sách phiếu xử lý không phù hợp" : "Danh sách biên bản"}
                        </Button>
                        <Stack direction="row" spacing={2}>
                            {isStandaloneBienBan && (
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<DeleteOutlineIcon />}
                                    onClick={handleDeleteStandalone}
                                >
                                    Xóa phiếu
                                </Button>
                            )}
                            {!isStandaloneBienBan && info.PhieuKiemId && (
                                <Button
                                    variant="outlined"
                                    startIcon={<AssignmentTurnedInIcon />}
                                    onClick={() => navigate(info.IsCongDoan
                                        ? `/phieu-kiem/cong-doan/${info.PhieuKiemId}`
                                        : `/phieu-kiem/${info.PhieuKiemId}`)}
                                >
                                    Xem phiếu kiểm
                                </Button>
                            )}
                            <Button
                                variant="outlined"
                                startIcon={<PrintIcon />}
                                onClick={handlePrintPreview}
                                sx={{ bgcolor: 'white' }}
                            >
                                In PDF
                            </Button>
                        </Stack>
                    </Stack>
                </Container>
            </Paper>

            <Box sx={{ px: { xs: 2, md: 4 } }}>
                <BienBanWorkflowGuide workflow={workflow} status={info.TrangThai} />
                {info.TrangThai === "TRA_LAI_CHINH_SUA" && (
                    <Paper variant="outlined" sx={{ mb: 3, p: 2, borderColor: "error.main", bgcolor: "#fff5f5" }}>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
                            <Box>
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
                {/* <Container > */}
                <Grid container spacing={3}>
                    {/* Thông tin chung & lỗi: dùng toàn chiều rộng theo bố cục hồ sơ một cột. */}
                    <Grid id="bien-ban-thong-tin" size={{ xs: 12 }} sx={{ scrollMarginTop: 100 }}>
                        <Stack spacing={3}>
                            {/* Card Header Info */}
                            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.25}>
                                        <Typography variant="h5" color="primary.main" fontWeight="bold">
                                            {isStandaloneBienBan ? info.SoBienBan : info.SoPhieu}
                                        </Typography>
                                        <Chip label={statusMeta.label} color={statusMeta.color} variant="filled" size="small" />
                                    </Stack>
                                    <Divider sx={{ mb: 1.5 }} />
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
                                                    <Typography variant="body2">{info.MucDoKhongPhuHop || "---"}</Typography>
                                                </Grid>
                                            </Grid>
                                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                                <Chip size="small" variant="outlined" label={`Số dòng lỗi: ${defectCount}`} />
                                                <Chip size="small" variant="outlined" label={`Tổng SL lỗi: ${totalDefectQty}`} />
                                                <Chip size="small" variant="outlined" label={`${isV01 ? "Bộ phận cần ý kiến" : "Bộ phận xử lý"}: ${workflowDepartments.length}`} />
                                            </Stack>
                                            <Typography variant="body2" color="text.secondary">
                                                Nhập thông tin từ trên xuống, lưu phần đầu phiếu trước, sau đó bổ sung các dòng lỗi và tiếp tục các bước xử lý phía dưới.
                                            </Typography>
                                        </Stack>
                                    ) : (
                                        <Grid container spacing={{ xs: 1.5, md: 3 }} alignItems="start">
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
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                            <Typography variant="h6"><DescriptionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Thông tin sự không phù hợp</Typography>
                                            {canEditKphCustomFields && !isEditingKphHeader && <Button variant="outlined" onClick={() => setIsEditingKphHeader(true)}>Chỉnh sửa</Button>}
                                        </Stack>
                                        <Grid container spacing={2}>
                                            {KPH_HEADER_FIELDS.map(([label, field]) => (
                                                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={field}>
                                                    {isEditingKphHeader ? <TextField fullWidth size="small" label={label} value={headerFields[field] || ""} onChange={(e) => handleHeaderFieldChange(field, e.target.value)} /> : <Box sx={{ p: 1.25, bgcolor: '#f8fafc', borderRadius: 1 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={600}>{headerFields[field] || '—'}</Typography></Box>}
                                                </Grid>
                                            ))}
                                            {[["2. Sự không phù hợp được phát hiện từ", "PhatHienTu", PHAT_HIEN_TU_OPTIONS], ["3. Mức độ không phù hợp", "MucDo", MUC_DO_KPH_OPTIONS]].map(([label, field, options]) => (
                                                <Grid size={{ xs: 12, md: 6 }} key={field}>
                                                    {isEditingKphHeader ? <TextField fullWidth select size="small" label={label} value={headerFields[field] || ""} onChange={(e) => handleHeaderFieldChange(field, e.target.value)}><MenuItem value="">Chưa chọn</MenuItem>{options.map(([value, text]) => <MenuItem value={value} key={value}>{text}</MenuItem>)}</TextField> : <Box sx={{ p: 1.25, bgcolor: '#f8fafc', borderRadius: 1 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={600}>{options.find(([value]) => value === headerFields[field])?.[1] || '—'}</Typography></Box>}
                                                </Grid>
                                            ))}
                                        </Grid>
                                        {isEditingKphHeader && <Stack direction="row" justifyContent="flex-end" spacing={1} mt={2}><Button disabled={actionSaving.header} onClick={() => restoreServerDrafts({ header: true })}>Hủy</Button><Button disabled={actionSaving.header} variant="contained" startIcon={<SaveIcon />} onClick={handleSaveKphCustomFields}>{actionSaving.header ? "Đang lưu..." : "Lưu thông tin"}</Button></Stack>}
                                    </CardContent>
                                </Card>
                            )}

                            {isStandaloneBienBan ? (
                                <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                    <CardContent>
                                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <DescriptionIcon color="action" /> Thông tin phiếu
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Phần đầu phiếu này độc lập với phiếu kiểm. Toàn bộ thông tin được nhập tay và dùng lại cho bản in.
                                        </Typography>
                                        <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                                            Thông tin nhận diện
                                        </Typography>
                                        <Grid container spacing={2}>
                                            {[
                                                ["Đơn vị sản xuất", "TenBoPhan"],
                                                ["Mã ĐVSX", "MaBoPhan"],
                                                ["Tên VT/BTP/TP", "TenSanPham"],
                                                ["Mã Item", "MaSanPham"],
                                                ["Mã truy nguyên", "MaTruyNguyen"],
                                                ["Đơn hàng", "DonHang"],
                                                ["Lô SX", "Lot"],
                                                ["Số lượng", "SoLuongKPH"],
                                                ["Dấu tuần", "DauTuan"]
                                            ].map(([label, field]) => (
                                                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={field}>
                                                    <TextField
                                                        fullWidth
                                                        size="small"
                                                        label={label}
                                                        disabled={!info.CanManageKphFlow}
                                                        value={headerFields[field] || ""}
                                                        onChange={(e) => handleHeaderFieldChange(field, e.target.value)}
                                                    />
                                                </Grid>
                                            ))}
                                            {[
                                                ["2. Sự không phù hợp được phát hiện từ", "PhatHienTu", PHAT_HIEN_TU_OPTIONS],
                                                ["3. Mức độ không phù hợp", "MucDo", MUC_DO_KPH_OPTIONS]
                                            ].map(([label, field, options]) => (
                                                <Grid size={{ xs: 12, md: 6 }} key={field}>
                                                    <TextField
                                                        fullWidth
                                                        select
                                                        size="small"
                                                        label={label}
                                                        disabled={!info.CanManageKphFlow}
                                                        value={headerFields[field] || ""}
                                                        onChange={(event) => handleHeaderFieldChange(field, event.target.value)}
                                                    >
                                                        <MenuItem value="">Chưa chọn</MenuItem>
                                                        {options.map(([value, text]) => (
                                                            <MenuItem value={value} key={value}>{text}</MenuItem>
                                                        ))}
                                                    </TextField>
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
                                                <TextField
                                                    fullWidth
                                                    multiline
                                                    minRows={4}
                                                    disabled={!info.CanManageKphFlow}
                                                    label="Mô tả chung"
                                                    placeholder="Nhập mô tả chi tiết về tình trạng không phù hợp..."
                                                    value={moTaChung}
                                                    onChange={(e) => setMoTaChung(e.target.value)}
                                                    sx={{
                                                        bgcolor: '#fff',
                                                        '& .MuiInputBase-root': { borderRadius: 1.5 }
                                                    }}
                                                />
                                            </Grid>
                                        </Grid>
                                        {info.CanManageKphFlow && <Box sx={{ mt: 2, textAlign: 'right' }}>
                                            <Button disabled={actionSaving.description} variant="contained" startIcon={<SaveIcon />} onClick={handleSaveStandaloneHeader}>
                                                {actionSaving.description ? "Đang lưu..." : "Lưu thông tin phiếu"}
                                            </Button>
                                        </Box>}
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                    <CardContent>
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
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                            <Box>
                                                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <BugReportIcon color="error" /> Mô tả chi tiết sự không phù hợp
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                    Có thể chọn lỗi từ danh mục chuẩn hoặc nhập tay một nội dung không phù hợp phát sinh thực tế.
                                                </Typography>
                                            </Box>
                                            {isEditingStandaloneDefects && canEditKphDefects ? (
                                                <Stack direction="row" spacing={1}>
                                                    <Button size="small" variant="contained" onClick={addCatalogDefectRow}>
                                                        Thêm từ danh mục
                                                    </Button>
                                                    <Button size="small" variant="outlined" onClick={addManualDefectRow}>
                                                        Thêm nhập tay
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
                                                    Chưa có dòng lỗi. Bấm chỉnh sửa để thêm từ danh mục hoặc nhập tay.
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
                                                Chưa có dòng lỗi. Chọn từ danh mục hoặc thêm một dòng nhập tay để bắt đầu.
                                            </Box>
                                        ) : (
                                            <Stack spacing={2}>
                                                {defects.map((d, i) => {
                                                    const isManual = d.sourceType === "manual" || (!d.DefectId && d.TenLoiTuNhap);
                                                    const selectedOption = defectOptions.find((option) => Number(option.Id) === Number(d.DefectId)) || null;

                                                    return (
                                                        <Paper
                                                            key={`${d.Id || "new"}-${i}`}
                                                            variant="outlined"
                                                            sx={{ p: 2.5, borderRadius: 2, bgcolor: "#fcfcfd" }}
                                                        >
                                                            <Grid container spacing={2}>
                                                                <Grid size={{ xs: 12, md: 2 }}>
                                                                    <TextField
                                                                        fullWidth
                                                                        select
                                                                        size="small"
                                                                        label="Loại dòng"
                                                                        value={isManual ? "manual" : "catalog"}
                                                                        onChange={(e) => {
                                                                            const nextType = e.target.value;
                                                                            updateStandaloneDefect(i, nextType === "manual"
                                                                                ? {
                                                                                    sourceType: "manual",
                                                                                    DefectId: null,
                                                                                    MaLoi: "",
                                                                                    TenLoi: "",
                                                                                    TenLoiTuNhap: d.TenLoiTuNhap || "",
                                                                                    MoTa: ""
                                                                                }
                                                                                : {
                                                                                    sourceType: "catalog",
                                                                                    DefectId: "",
                                                                                    MaLoi: "",
                                                                                    TenLoi: "",
                                                                                    TenLoiTuNhap: "",
                                                                                    MoTa: ""
                                                                                });
                                                                        }}
                                                                    >
                                                                        <MenuItem value="catalog">Danh mục</MenuItem>
                                                                        <MenuItem value="manual">Nhập tay</MenuItem>
                                                                    </TextField>
                                                                </Grid>

                                                                <Grid size={{ xs: 12, md: 7 }}>
                                                                    {isManual ? (
                                                                        <Stack spacing={1.5}>
                                                                            <TextField
                                                                                fullWidth
                                                                                size="small"
                                                                                label="Tên lỗi / nội dung không phù hợp"
                                                                                value={d.TenLoiTuNhap || ""}
                                                                                onChange={(e) => updateStandaloneDefect(i, { TenLoiTuNhap: e.target.value })}
                                                                            />
                                                                            <TextField
                                                                                fullWidth
                                                                                size="small"
                                                                                multiline
                                                                                minRows={2}
                                                                                label="Mô tả chi tiết"
                                                                                value={d.MoTa || ""}
                                                                                onChange={(e) => updateStandaloneDefect(i, { MoTa: e.target.value })}
                                                                            />
                                                                        </Stack>
                                                                    ) : (
                                                                        <Stack spacing={1.5}>
                                                                            <DefectPickerDialog
                                                                                defects={defectOptions}
                                                                                onSelect={(value) => handleCatalogDefectSelected(i, value?.Id || "")}
                                                                                buttonLabel={selectedOption
                                                                                    ? `${selectedOption.MaLoi ? `${selectedOption.MaLoi} - ` : ""}${selectedOption.TenLoi || ""}`
                                                                                    : "Chọn lỗi từ danh mục"}
                                                                                fullWidth
                                                                            />
                                                                            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "#fff" }}>
                                                                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                                                                    Mô tả hiện tại
                                                                                </Typography>
                                                                                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                                                                                    {d.MoTa || "Chưa có mô tả cho lỗi này"}
                                                                                </Typography>
                                                                            </Paper>
                                                                        </Stack>
                                                                    )}
                                                                </Grid>

                                                                <Grid size={{ xs: 12, md: 3 }}>
                                                                    <Stack spacing={1.5}>
                                                                        <TextField
                                                                            fullWidth
                                                                            select
                                                                            size="small"
                                                                            label="Mức độ"
                                                                            value={d.DefectType || "MINOR"}
                                                                            onChange={(e) => updateStandaloneDefect(i, { DefectType: e.target.value })}
                                                                            disabled={!isManual}
                                                                        >
                                                                            <MenuItem value="MINOR">MINOR</MenuItem>
                                                                            <MenuItem value="MAJOR">MAJOR</MenuItem>
                                                                            <MenuItem value="CRITICAL">CRITICAL</MenuItem>
                                                                        </TextField>
                                                                        <TextField
                                                                            fullWidth
                                                                            size="small"
                                                                            type="number"
                                                                            label="Số lượng kiểm"
                                                                            value={d.SoLuongKiem ?? ""}
                                                                            onChange={(e) => updateStandaloneDefect(i, { SoLuongKiem: e.target.value })}
                                                                            inputProps={{ min: 1, step: 1 }}
                                                                        />
                                                                        <TextField
                                                                            fullWidth
                                                                            size="small"
                                                                            type="number"
                                                                            label="Số lượng lỗi"
                                                                            value={d.SoLuong ?? 1}
                                                                            onChange={(e) => updateStandaloneDefect(i, { SoLuong: e.target.value })}
                                                                            inputProps={{ min: 1, step: 1 }}
                                                                        />
                                                                        <TextField
                                                                            fullWidth
                                                                            size="small"
                                                                            multiline
                                                                            minRows={2}
                                                                            label="Ghi chú"
                                                                            value={d.GhiChu || ""}
                                                                            onChange={(e) => updateStandaloneDefect(i, { GhiChu: e.target.value })}
                                                                        />
                                                                        <Button color="error" variant="text" onClick={() => removeStandaloneDefect(i)}>
                                                                            Xóa dòng lỗi
                                                                        </Button>
                                                                    </Stack>
                                                                </Grid>
                                                            </Grid>
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
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                                    <TableRow>
                                                        <TableCell>Thông tin lỗi</TableCell>
                                                        <TableCell align="center" sx={{ width: 100 }}>Mức độ</TableCell>
                                                        <TableCell align="right" sx={{ width: 60 }}>SL</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {defects.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>Chưa có dữ liệu lỗi</TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        defects.map((d, i) => (
                                                            <TableRow key={i} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                                <TableCell>
                                                                    <Typography variant="body2" fontWeight="bold" color="primary">
                                                                        {d.TenLoi || d.TenLoiTuNhap || d.MaLoi || `Dòng lỗi ${i + 1}`}
                                                                    </Typography>
                                                                    {d.MoTa && (
                                                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                                                                            {d.MoTa}
                                                                        </Typography>
                                                                    )}
                                                                    {Array.isArray(d.ImageUrls) && d.ImageUrls.length > 0 && (
                                                                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                                                                            {d.ImageUrls.map((url, idx) => (
                                                                                <Box
                                                                                    key={idx}
                                                                                    component="img"
                                                                                    src={url.startsWith('http') ? url : `https://z76api.z76.vn${url}`}
                                                                                    sx={{
                                                                                        width: 60,
                                                                                        height: 60,
                                                                                        objectFit: 'cover',
                                                                                        borderRadius: 1,
                                                                                        cursor: 'pointer',
                                                                                        border: '1px solid #e0e0e0',
                                                                                        '&:hover': { opacity: 0.8 }
                                                                                    }}
                                                                                    onClick={() => setImagePreview({
                                                                                        images: d.ImageUrls.map((item) => item.startsWith('http') ? item : `https://z76api.z76.vn${item}`),
                                                                                        index: idx
                                                                                    })}
                                                                                />
                                                                            ))}
                                                                        </Stack>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    <Chip label={d.DefectType} color={getDefectColor(d.DefectType)} size="small" variant="outlined" />
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    <Typography variant="body2" fontWeight="bold">{d.SoLuong}</Typography>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </CardContent>
                                )}
                            </Card>
                        </Stack>
                    </Grid>

                    {/* Các luồng xử lý */}
                    <Grid id="bien-ban-xu-ly" size={{ xs: 12 }} sx={{ scrollMarginTop: 100 }}>
                        <Stack spacing={3}>

                            {/* Phân công xử lý */}
                            {moTaConfirmed && (
                                <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
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
                                            <TableContainer sx={{ border: '1px solid #e5e7eb', borderRadius: 1 }}>
                                                <Table size="small">
                                                    <TableHead sx={{ bgcolor: '#f8fafc' }}><TableRow><TableCell>Bộ phận</TableCell><TableCell>Mã bộ phận</TableCell><TableCell align="right">Trạng thái</TableCell></TableRow></TableHead>
                                                    <TableBody>{workflowDepartments.map((a, i) => <TableRow key={a.Id || i} hover><TableCell sx={{ fontWeight: 700 }}>{a.TenBoPhan || '—'}</TableCell><TableCell>{a.MaBoPhan || '—'}</TableCell><TableCell align="right"><Chip size="small" label={isV01 ? (a.HasConfirmed ? "Đã xác nhận" : a.HasOpinion ? "Chờ TBP xác nhận" : "Chờ ý kiến") : getStatusText(a.BoPhanId)} color={isV01 ? (a.HasConfirmed ? "success" : a.HasOpinion ? "warning" : "default") : getStatusColor(a.BoPhanId)} /></TableCell></TableRow>)}</TableBody>
                                                </Table>
                                            </TableContainer>
                                        )}
                                        {!isV01 && isAdminUser && info.AssignConfirmed && <Stack direction="row" flexWrap="wrap" sx={{ mt: 2, gap: 1 }}>{assigns.filter((a) => !xacNhan.some((x) => Number(x.BoPhanId) === Number(a.BoPhanId))).map((a) => <Button key={a.BoPhanId} size="small" variant="outlined" onClick={() => handleConfirmUser(a.BoPhanId)}>Xác nhận thay {a.MaBoPhan}</Button>)}</Stack>}

                                        {!isV01 && !info.AssignConfirmed && assigns.length > 0 && isManagerOrQA && (
                                            <Box sx={{ mt: 3, textAlign: 'right' }}>
                                                <Button variant="contained" color="warning" onClick={handleConfirmAssign} startIcon={<AssignmentTurnedInIcon />}>
                                                    Chốt phân công
                                                </Button>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Ý kiến xử lý */}
                            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                <CardContent sx={{ p: 0 }}>
                                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <LightbulbCircleIcon color="warning" /> Ý kiến / Đề xuất xử lý
                                        </Typography>
                                        {canAddProposal && !["CHO_THEO_DOI", "HOAN_TAT"].includes(info.TrangThai) && (
                                            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpenXuLyModal(true)}>
                                                Thêm đề xuất
                                            </Button>
                                        )}
                                    </Box>
                                    <TableContainer>
                                        <Table>
                                            <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                                <TableRow>
                                                    <TableCell>Nội dung ý kiến</TableCell>
                                                    <TableCell>Đề nghị xử lý</TableCell>
                                                    <TableCell>Trách nhiệm</TableCell>
                                                    <TableCell>Theo dõi</TableCell>
                                                    <TableCell>Thời hạn</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {xuLy.length === 0 ? (
                                                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>Chưa có ý kiến xử lý</TableCell></TableRow>
                                                ) : (
                                                    xuLy.map((x, i) => (
                                                        <TableRow key={i} hover>
                                                            <TableCell sx={{ whiteSpace: 'pre-wrap', minWidth: 220 }}>{x.NoiDung || '—'}</TableCell>
                                                            <TableCell>{x.DeNghiXuLy || '—'}</TableCell>
                                                            <TableCell>{x.TrachNhiem || '—'}</TableCell>
                                                            <TableCell sx={{ fontWeight: 600 }}>{x.TheoDoi || '—'}</TableCell>
                                                            <TableCell sx={{ whiteSpace: 'nowrap', color: 'error.main' }}>{x.ThoiHan ? new Date(x.ThoiHan).toLocaleDateString("vi-VN") : '—'}</TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>

                            {/* Chi phí & hành động khắc phục xếp dọc để bảng có đủ không gian. */}
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12 }}>
                                    <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, height: '100%' }}>
                                        <CardContent>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
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
                                            <TableContainer sx={{ border: '1px solid #e5e7eb', borderRadius: 1 }}>
                                                <Table size="small">
                                                    <TableHead sx={{ bgcolor: '#f8fafc' }}><TableRow><TableCell>Loại chi phí</TableCell><TableCell>Bộ phận</TableCell><TableCell align="right">Giá trị</TableCell></TableRow></TableHead>
                                                    <TableBody>{chiPhi.length === 0 ? <TableRow><TableCell colSpan={3} align="center" sx={{ color: 'text.secondary' }}>Không ghi nhận chi phí.</TableCell></TableRow> : chiPhi.map((c, i) => <TableRow key={i} hover><TableCell>{c.LoaiChiPhi || '—'}</TableCell><TableCell>{c.TenBoPhan || '—'}</TableCell><TableCell align="right" sx={{ color: 'success.main', fontWeight: 700, whiteSpace: 'nowrap' }}>{Number(c.GiaTri || 0).toLocaleString("vi-VN")} đ</TableCell></TableRow>)}</TableBody>
                                                </Table>
                                            </TableContainer>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, height: '100%' }}>
                                        <CardContent>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
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
                                            <TableContainer sx={{ border: '1px solid #e5e7eb', borderRadius: 1 }}>
                                                <Table size="small">
                                                    <TableHead sx={{ bgcolor: '#f8fafc' }}><TableRow><TableCell>Nội dung</TableCell><TableCell>Bộ phận</TableCell><TableCell>Thời hạn</TableCell><TableCell>Người theo dõi</TableCell></TableRow></TableHead>
                                                    <TableBody>{hanhDong.length === 0 ? <TableRow><TableCell colSpan={4} align="center" sx={{ color: 'text.secondary' }}>Chưa có hành động cụ thể.</TableCell></TableRow> : hanhDong.map((h, i) => <TableRow key={i} hover><TableCell sx={{ whiteSpace: 'pre-wrap' }}>{h.NoiDung || '—'}</TableCell><TableCell>{h.TenBoPhan || '—'}</TableCell><TableCell sx={{ color: 'error.main', whiteSpace: 'nowrap' }}>{h.ThoiHan ? new Date(h.ThoiHan).toLocaleDateString("vi-VN") : '—'}</TableCell><TableCell>{h.NguoiTheoDoi || h.NguoiXuLy || h.TheoDoi || '—'}</TableCell></TableRow>)}</TableBody>
                                                </Table>
                                            </TableContainer>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            <Box id="bien-ban-y-kien-chuyen-mon" sx={{ scrollMarginTop: 100 }}>
                                <KphV01WorkflowSections
                                    bienBanId={bienBanId} info={info}
                                    opinions={specialistOpinions} evaluation={followUpEvaluation}
                                    currentUserBoPhanId={currentUserBoPhanId} permissions={currentUserPermissions}
                                    roles={currentUserRoles}
                                    isAdmin={Boolean(info?.IsAdmin) || isAdminUser}
                                    onPatchOpinion={patchSpecialistOpinion}
                                    onReturned={handleReviewReturned}
                                    reload={refreshData} showToast={showToast}
                                />
                            </Box>

                            {/* Lịch sử xác nhận */}
                            {xacNhan.length > 0 && (
                                <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                    <CardContent>
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

                <Box sx={{ mt: 3 }}>
                    <BienBanAttachments bienBanId={bienBanId} />
                </Box>

                {/* Floating Bottom Action Bar */}
                {(canConfirmProcessing || canSubmitCompletion) && (
                    <Paper elevation={4} sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, p: 2, bgcolor: 'white', zIndex: 100, borderTop: '1px solid #e0e0e0' }}>
                        <Container maxWidth="xl">
                            <Stack direction="row" justifyContent="flex-end" spacing={2}>
                                {canConfirmProcessing && (
                                    <Button variant="contained" color="warning" size="large" onClick={() => handleConfirmUser()} startIcon={<VerifiedIcon />}>
                                        Xác nhận tiến độ xử lý của bộ phận
                                    </Button>
                                )}
                                {canSubmitCompletion && (
                                    <Button variant="contained" color="success" size="large" onClick={handleComplete} startIcon={<SaveIcon />}>
                                        {isV01 ? "Xác nhận và chuyển theo dõi" : "Hoàn tất Biên Bản"}
                                    </Button>
                                )}
                            </Stack>
                        </Container>
                    </Paper>
                )}
                {/* </Container> */}
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
