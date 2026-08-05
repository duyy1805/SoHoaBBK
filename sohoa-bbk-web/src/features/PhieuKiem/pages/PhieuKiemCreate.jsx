import { useEffect, useState, useMemo } from "react";
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    Button,
    MenuItem,
    Stack,
    IconButton,
    CircularProgress,
    Fade,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Chip,
    Divider,
    InputAdornment,
    Checkbox,
    Alert
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../components/common/ToastContext";
import StaticSelect from "../../../components/common/StaticSelect";

import {
    createPhieuKiem,
    createPhieuKiemSXBT,
    getLoaiKiemLookup,
    getKCSLookup,
    getChungTuNhapChuaKiem,
    getKeHoachSanXuatChuaKiem,
    getLichDongCont,
    getSourceChecked,
    getKeHoachNhapBTPChuaKiem,
    previewSxbtGroups,
} from "../../../api/phieuKiem.api";
import {
    getSanPhamList
} from "../../../api/lookup.api";

const isKeHoachSanXuatLoai = (loai) =>
    loai?.MaLoai === "KIEM_TREN_CHUYEN" || loai?.MaLoai === "CUOI_CHUYEN";

const getLocalDateKey = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const uniquePlanFilterOptions = (rows, valueGetter, labelGetter) => {
    const optionMap = new Map();
    rows.forEach((row) => {
        const value = String(valueGetter(row) || "").trim();
        const label = String(labelGetter(row) || "").trim();
        if (value && label && !optionMap.has(value)) optionMap.set(value, label);
    });
    return [...optionMap.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((left, right) => left.label.localeCompare(right.label, "vi"));
};

const getPlanUnitFilterValue = (row = {}) =>
    String(row.ID_DonVi ?? row.Ten_DonVi ?? "").trim();

const getPlanDepartmentFilterValue = (row = {}) =>
    String(row.ID_BoPhan ?? row.Ten_BoPhan ?? "").trim();

const getPlanProcessFilterValue = (row = {}) =>
    String(
        row.ID_QuyTrinhSanXuat ??
        row.Ten_QuyTrinhSanXuat ??
        row.TenQuyTrinhSanXuat ??
        ""
    ).trim();

export default function PhieuKiemCreate() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [form, setForm] = useState({
        loaiKiemId: "",
        nguoiKiemId: "",
        mucDoKiemTra: ""
    });

    const [loaiKiemList, setLoaiKiemList] = useState([]);
    const [kcsList, setKcsList] = useState([]);

    const [selectedLoai, setSelectedLoai] = useState(null);
    const [selectedLichList, setSelectedLichList] = useState([]);
    const [lichList, setLichList] = useState([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [displaySearchTerm, setDisplaySearchTerm] = useState("");

    const [chungLoaiFilter, setChungLoaiFilter] = useState("");
    const [displayChungLoaiFilter, setDisplayChungLoaiFilter] = useState("");

    const [showChungLoaiFilter, setShowChungLoaiFilter] = useState(false);
    const [planDateFilter, setPlanDateFilter] = useState("");
    const [planUnitFilter, setPlanUnitFilter] = useState("");
    const [planDepartmentFilter, setPlanDepartmentFilter] = useState("");
    const [planProcessFilter, setPlanProcessFilter] = useState("");

    const [openModal, setOpenModal] = useState(false);
    const [sxbtPreview, setSxbtPreview] = useState(null);
    const [sxbtPreviewLoading, setSxbtPreviewLoading] = useState(false);
    const [sxbtPreviewError, setSxbtPreviewError] = useState("");

    const refreshSxbtPreview = async (rows = selectedLichList) => {
        if (selectedLoai?.Id !== 4 || rows.length === 0) {
            setSxbtPreview(null);
            setSxbtPreviewError("");
            return;
        }
        setSxbtPreviewLoading(true);
        setSxbtPreviewError("");
        try {
            const ids = rows.map((row) => row.KeHoachNhapId || row.ID_TuTang);
            const response = await previewSxbtGroups(ids);
            setSxbtPreview(response.data);
        } catch (error) {
            setSxbtPreview(null);
            setSxbtPreviewError(error?.response?.data?.message || "Không thể xem trước cách nhóm kế hoạch SXBT.");
        } finally {
            setSxbtPreviewLoading(false);
        }
    };

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(displaySearchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [displaySearchTerm]);

    // Debounce chung loai filter
    useEffect(() => {
        const timer = setTimeout(() => {
            setChungLoaiFilter(displayChungLoaiFilter);
        }, 500);
        return () => clearTimeout(timer);
    }, [displayChungLoaiFilter]);

    const [loadingModal, setLoadingModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const getCurrentWeek = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    const [week, setWeek] = useState(getCurrentWeek());
    const [displayWeek, setDisplayWeek] = useState(getCurrentWeek());
    const [year] = useState(new Date().getFullYear());

    // Debounce week change
    useEffect(() => {
        if (displayWeek === week) return;

        const timer = setTimeout(() => {
            const val = parseInt(displayWeek) || 0;
            if (val > 0) {
                setWeek(val);
                fetchLichList(selectedLoai, val);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [displayWeek, selectedLoai]);

    useEffect(() => {
        loadLookup();
    }, []);

    const loadLookup = async () => {
        try {
            const [lk, kcs] = await Promise.all([
                getLoaiKiemLookup(),
                getKCSLookup()
            ]);
            setLoaiKiemList(lk.data);
            setKcsList(kcs.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchLichList = async (loai, w = week, y = year) => {
        setOpenModal(true);
        setLoadingModal(true);

        try {
            if (loai?.MaLoai === "KIEM_DONG_CONT") {
                const [lichRes, checkedRes] = await Promise.all([
                    getLichDongCont({ week: w, year: y }),
                    getSourceChecked({
                        week: w,
                        year: y,
                        loaiKiemId: loai.Id
                    })
                ]);

                const lichData = lichRes.data || [];
                console.log("[PhieuKiemCreate][KIEM_DONG_CONT] lichData sample:", lichData.slice(0, 10));
                console.log("[PhieuKiemCreate][KIEM_DONG_CONT] ItemId sample:", lichData.slice(0, 10).map(item => ({
                    ItemId: item.ItemId,
                    itemIdType: typeof item.ItemId
                })));
                const checkedSet = new Set(checkedRes.data || []);

                const filtered = lichData.filter(
                    item => !checkedSet.has(item.ClosingScheduleDetailGuid)
                );
                setLichList(filtered);
            }

            if (loai?.MaLoai === "DAU_VAO") {
                const res = await getChungTuNhapChuaKiem();
                setLichList(res.data || []);
            }
            if (isKeHoachSanXuatLoai(loai)) {
                const res = await getKeHoachSanXuatChuaKiem({ loaiKiemId: loai.Id });
                setLichList(res.data || []);
            }
            if (loai?.Id === 4) {
                const res = await getKeHoachNhapBTPChuaKiem();
                setLichList(res.data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingModal(false);
        }
    };

    const filteredLichList = useMemo(() => {
        let result = lichList;

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter((row) => {
                if (selectedLoai?.MaLoai === "KIEM_DONG_CONT") {
                    return (
                        row.Time?.toLowerCase().includes(lower) ||
                        row.Type?.toLowerCase().includes(lower) ||
                        row.ItemId?.toLowerCase().includes(lower) ||
                        row.ItemName?.toLowerCase().includes(lower) ||
                        row.WarehouseId?.toLowerCase().includes(lower) ||
                        row.InvoiceNo?.toLowerCase().includes(lower) ||
                        row.KhachHang?.toLowerCase().includes(lower)
                    );
                }
                if (selectedLoai?.MaLoai === "DAU_VAO") {
                    return (
                        row.So_DonDatHang?.toLowerCase().includes(lower) ||
                        row.Ma_DonHang?.toLowerCase().includes(lower) ||
                        row.Ma_VatTu?.toLowerCase().includes(lower) ||
                        row.QuyCach?.toLowerCase().includes(lower) ||
                        row.NhaCungCap?.toLowerCase().includes(lower)
                    );
                }
                if (isKeHoachSanXuatLoai(selectedLoai)) {
                    return (
                        row.ID_KeHoachSanXuat?.toString().includes(lower) ||
                        row.MaSanPham?.toLowerCase().includes(lower) ||
                        row.TenSanPham?.toLowerCase().includes(lower) ||
                        row.Ten_QuyTrinhSanXuat?.toLowerCase().includes(lower) ||
                        row.TenQuyTrinhSanXuat?.toLowerCase().includes(lower) ||
                        row.Ten_DonVi?.toLowerCase().includes(lower) ||
                        row.Ten_BoPhan?.toLowerCase().includes(lower)
                    );
                }
                if (selectedLoai?.Id === 4) {
                    return (
                        row.ID_TuTang?.toString().includes(lower) ||
                        row.ID_KeHoachSanXuat?.toString().includes(lower) ||
                        row.Ten_DonVi?.toLowerCase().includes(lower) ||
                        row.Ten_BoPhan?.toLowerCase().includes(lower) ||
                        row.Ma_NhaThau?.toLowerCase().includes(lower) ||
                        row.Ma_DonHang?.toLowerCase().includes(lower) ||
                        row.ItemCode?.toLowerCase().includes(lower) ||
                        row.Ten_SanPham?.toLowerCase().includes(lower) ||
                        row.So_LoSanXuat?.toLowerCase().includes(lower) ||
                        row.Ten_QuyTrinhSanXuat?.toLowerCase().includes(lower)
                    );
                }
                return false;
            });
        }

        if (selectedLoai?.MaLoai === "DAU_VAO" && chungLoaiFilter) {
            const lowerChungLoai = chungLoaiFilter.toLowerCase();
            result = result.filter(row =>
                row.Ten_ChungLoaiVatTu?.toLowerCase().includes(lowerChungLoai)
            );
        }

        if (isKeHoachSanXuatLoai(selectedLoai)) {
            if (planDateFilter) {
                result = result.filter((row) => getLocalDateKey(row.Ngay) === planDateFilter);
            }
            if (planUnitFilter) {
                result = result.filter((row) => getPlanUnitFilterValue(row) === planUnitFilter);
            }
            if (planDepartmentFilter) {
                result = result.filter((row) => getPlanDepartmentFilterValue(row) === planDepartmentFilter);
            }
            if (planProcessFilter) {
                result = result.filter((row) => getPlanProcessFilterValue(row) === planProcessFilter);
            }
        }

        return result;
    }, [lichList, searchTerm, chungLoaiFilter, selectedLoai, planDateFilter, planUnitFilter, planDepartmentFilter, planProcessFilter]);

    const planFilterOptions = useMemo(() => ({
        dates: [...new Set(lichList.map((row) => getLocalDateKey(row.Ngay)).filter(Boolean))]
            .sort((left, right) => right.localeCompare(left)),
        units: uniquePlanFilterOptions(
            lichList,
            getPlanUnitFilterValue,
            (row) => row.Ten_DonVi || `Đơn vị #${row.ID_DonVi}`
        ),
        departments: uniquePlanFilterOptions(
            lichList,
            getPlanDepartmentFilterValue,
            (row) => row.Ten_BoPhan || `Bộ phận #${row.ID_BoPhan}`
        ),
        processes: uniquePlanFilterOptions(
            lichList,
            getPlanProcessFilterValue,
            (row) => row.Ten_QuyTrinhSanXuat || row.TenQuyTrinhSanXuat || `Quy trình #${row.ID_QuyTrinhSanXuat}`
        )
    }), [lichList]);

    const clearPlanFilters = () => {
        setPlanDateFilter("");
        setPlanUnitFilter("");
        setPlanDepartmentFilter("");
        setPlanProcessFilter("");
    };

    const getRowId = (row) => {
        if (selectedLoai?.MaLoai === "KIEM_DONG_CONT") return row.ClosingScheduleDetailGuid;
        if (selectedLoai?.MaLoai === "DAU_VAO") return row.ID_ChungTuNhap_ChiTiet;
        if (isKeHoachSanXuatLoai(selectedLoai)) return row.ID_KeHoachSanXuat;
        if (selectedLoai?.Id === 4) return row.KeHoachNhapId || row.ID_TuTang;
        return row.Id;
    };

    const getRowRenderKey = (row, index) => [
        getRowId(row),
        row.SanPhamId || row.ItemCode || row.MaSanPham || row.ItemId || "no-product",
        row.Ngay || row.RequiredDateString || "no-date",
        row.Ten_QuyTrinhSanXuat || row.TenQuyTrinhSanXuat || "no-process",
        index
    ].join("::");

    const handleLoaiKiemSelect = (option) => {
        const value = option?.Id || "";
        if (!value) {
            setSelectedLoai(null);
            setSelectedLichList([]);
            setSxbtPreview(null);
            setSxbtPreviewError("");
            setSearchTerm("");
            setDisplaySearchTerm("");
            setChungLoaiFilter("");
            setDisplayChungLoaiFilter("");
            setShowChungLoaiFilter(false);
            clearPlanFilters();
            setForm((prev) => ({ ...prev, loaiKiemId: "" }));
            return;
        }

        setSelectedLoai(option);
        setSelectedLichList([]);
        setSxbtPreview(null);
        setSxbtPreviewError("");
        setSearchTerm("");
        setDisplaySearchTerm("");
        setChungLoaiFilter("");
        setDisplayChungLoaiFilter("");
        setShowChungLoaiFilter(false);
        clearPlanFilters();
        setForm((prev) => ({ ...prev, loaiKiemId: value }));
        fetchLichList(option);
    };

    const handleNguoiKiemSelect = (option) => {
        setForm((prev) => ({ ...prev, nguoiKiemId: option?.Id || "" }));
    };

    const handleMucDoKiemTraSelect = (option) => {
        setForm((prev) => ({ ...prev, mucDoKiemTra: option?.value || "" }));
    };

    const mucDoKiemTraOptions = [
        { value: "", label: "-- Không chọn --" },
        { value: "KT lần đầu", label: "KT lần đầu" },
        { value: "KT thường xuyên", label: "KT thường xuyên" },
        { value: "KT lại", label: "KT lại" }
    ];

    const handleToggleRow = (row) => {
        const rowId = getRowId(row);
        if (selectedLoai?.Id === 4) {
            setSxbtPreview(null);
            setSxbtPreviewError("");
        }
        setSelectedLichList(prev => {
            const isSelected = prev.some(item => getRowId(item) === rowId);
            return isSelected ? prev.filter(item => getRowId(item) !== rowId) : [...prev, row];
        });
    };

    const handleSelectAll = (e) => {
        if (selectedLoai?.Id === 4) {
            setSxbtPreview(null);
            setSxbtPreviewError("");
        }
        if (e.target.checked) {
            setSelectedLichList((prev) => {
                const selectedIds = new Set(prev.map((item) => getRowId(item)));
                const next = [...prev];
                filteredLichList.forEach((item) => {
                    const itemId = getRowId(item);
                    if (selectedIds.has(itemId)) return;
                    selectedIds.add(itemId);
                    next.push(item);
                });
                return next;
            });
        } else {
            const filteredIds = new Set(filteredLichList.map((item) => getRowId(item)));
            setSelectedLichList((prev) => prev.filter((item) => !filteredIds.has(getRowId(item))));
        }
    };

    const handleRemoveSelected = (rowId) => {
        const next = selectedLichList.filter(item => getRowId(item) !== rowId);
        setSelectedLichList(next);
        if (selectedLoai?.Id === 4) refreshSxbtPreview(next);
    };

    const formatDateToISO = (dateStr) => {
        const [day, month, year] = dateStr.split("/");
        return `${year}-${month}-${day}`;
    };

    const handleSubmit = async () => {
        try {
            if (!form.loaiKiemId || !form.nguoiKiemId) {
                showToast("Vui lòng chọn Loại kiểm và KCS phụ trách", "error");
                return;
            }
            if (selectedLichList.length === 0) {
                showToast("Vui lòng chọn ít nhất 1 kế hoạch để kiểm", "error");
                return;
            }

            setLoading(true);

            // 1. Dùng Map để cache kết quả dò mã
            const spCache = new Map();

            // 2. Map lấy SanPhamId chính xác qua API
            const resolvedRows = await Promise.all(selectedLichList.map(async (row) => {
                const isDongCont = selectedLoai?.MaLoai === "KIEM_DONG_CONT";
                let mappedSpId = row.SanPhamId;

                if (isDongCont) {
                    const itemCode = row.ItemId;
                    console.log("[PhieuKiemCreate][KIEM_DONG_CONT] resolve ItemId:", {
                        ItemId: row.ItemId,
                        itemIdType: typeof row.ItemId,
                        row
                    });
                    if (spCache.has(itemCode)) {
                        mappedSpId = spCache.get(itemCode);
                    } else {
                        const res = await getSanPhamList(0, 50, itemCode);
                        const resultData = res?.data?.data || [];
                        const exactMatch = resultData.find(sp =>
                            sp.ItemCode === itemCode ||
                            sp.Ma_VatTu === itemCode ||
                            sp.MaSanPham === itemCode
                        );

                        if (exactMatch) {
                            mappedSpId = exactMatch.Id;
                            spCache.set(itemCode, exactMatch.Id);
                        } else {
                            spCache.set(itemCode, null);
                        }
                    }

                    if (!mappedSpId) {
                        throw new Error(`Mã vật tư/sản phẩm [${itemCode}] chưa tồn tại trong danh mục hệ thống.`);
                    }
                }

                return { ...row, mappedSpId, isDongCont };
            }));

            if (selectedLoai?.MaLoai === "CUOI_CHUYEN") {
                const firstRow = resolvedRows[0];
                const cuoiChuyenPlans = resolvedRows.map((row, index) => ({
                    idKeHoachSanXuat: row.ID_KeHoachSanXuat,
                    sanPhamId: row.SanPhamId,
                    maSanPham: row.MaSanPham || "",
                    tenSanPham: row.TenSanPham || "",
                    tenDonVi: row.Ten_DonVi || "",
                    tenBoPhan: row.Ten_BoPhan || "",
                    maDonHang: row.Ma_DonHang || row.MaDonHang || "",
                    tenQuyTrinhSanXuat: row.Ten_QuyTrinhSanXuat || row.TenQuyTrinhSanXuat || "",
                    lot: row.So_LoSanXuat || row.Lot || "",
                    lenhXuatVatTu: row.LenhXuatVatTu || "",
                    soLoiBuiBan: 0,
                    soLoiConTrung: 0,
                    ngayKeHoach: row.Ngay || "",
                    soLuongKeHoach: row.SoLuongKeHoach ?? null,
                    nangSuatDuKien: row.NangSuat_DuKien ?? null,
                    daSanXuat: row.DaSanXuat ?? null,
                    sortOrder: index + 1
                }));

                await createPhieuKiem({
                    loaiKiemId: form.loaiKiemId,
                    nguoiKiemId: form.nguoiKiemId,
                    lot: "",
                    sanPhamId: firstRow.SanPhamId,
                    soLuong: firstRow.NangSuat_DuKien || firstRow.SoLuongKeHoach || 1,
                    doiTuong: firstRow.Ten_DonVi || firstRow.Ten_BoPhan || firstRow.TenSanPham || "",
                    sourceId: firstRow.ID_KeHoachSanXuat,
                    mucDoKiemTra: form.mucDoKiemTra || null,
                    cuoiChuyenPlans
                });

                showToast("Đã tạo thành công 1 phiếu kiểm cuối chuyền!", "success");
                navigate("/phieu-kiem");
                return;
            }

            if (selectedLoai?.Id === 4) {
                if (!sxbtPreview || sxbtPreview.invalidPlans?.length > 0) {
                    throw new Error("Danh sách kế hoạch SXBT chưa có bản xem trước hợp lệ.");
                }
                const response = await createPhieuKiemSXBT({
                    loaiKiemId: form.loaiKiemId,
                    nguoiKiemId: form.nguoiKiemId,
                    mucDoKiemTra: form.mucDoKiemTra || null,
                    keHoachNhapIds: selectedLichList.map((row) => row.KeHoachNhapId || row.ID_TuTang),
                    previewFingerprint: sxbtPreview.fingerprint
                });
                const createdCount = response.data?.createdCount || sxbtPreview.groupCount;
                showToast(`Đã tạo thành công ${createdCount} phiếu từ ${selectedLichList.length} kế hoạch SXBT!`, "success");
                navigate("/phieu-kiem");
                return;
            }

            // 3. Tạo Payload và Submit
            const promises = resolvedRows.map(row => {
                const payload = {
                    loaiKiemId: form.loaiKiemId,
                    nguoiKiemId: form.nguoiKiemId,
                    lot: "",
                    sanPhamId: row.mappedSpId,
                    soLuong: row.isDongCont ? row.Quantity : (isKeHoachSanXuatLoai(selectedLoai) ? row.SoLuongKeHoach : row.SoLuong),
                    doiTuong: row.isDongCont ? `${row.InvoiceNo} - ${row.WarehouseId}` : (isKeHoachSanXuatLoai(selectedLoai) ? row.Ten_DonVi : (row.Ma_DonHang || row.ID_NhaCungCap)),
                    mucDoKiemTra: form.mucDoKiemTra || null
                };

                if (row.isDongCont) {
                    payload.sourceId_LCD = row.ClosingScheduleDetailGuid;
                    payload.Ngay_Giao = formatDateToISO(row.RequiredDateString);
                    payload.snapshotFields = {
                        DongCont_KhachHang: row.KhachHang || "",
                        DongCont_InvoiceNo: row.InvoiceNo || "",
                        DongCont_PackingMethod: row.PackingMethod || "",
                        DongCont_WarehouseId: row.WarehouseId || "",
                        DongCont_Package: row.Package ?? ""
                    };
                } else if (selectedLoai?.MaLoai === "KIEM_TREN_CHUYEN") {
                    payload.sourceId = row.ID_KeHoachSanXuat;
                    payload.ngayKiem = row.Ngay;
                    payload.sanPhamId = row.SanPhamId;
                    payload.soLuong = row.NangSuat_DuKien;
                    payload.doiTuong = row.Ten_DonVi;
                    payload.snapshotFields = {
                        TrenChuyen_TenDonVi: row.Ten_DonVi || "",
                        TrenChuyen_TenBoPhan: row.Ten_BoPhan || "",
                        TrenChuyen_NgayKeHoach: row.Ngay || "",
                        TrenChuyen_SoLuongKeHoach: row.SoLuongKeHoach ?? "",
                        TrenChuyen_NangSuatDuKien: row.NangSuat_DuKien ?? "",
                        TrenChuyen_DaSanXuat: row.DaSanXuat ?? "",
                        TrenChuyen_TenSanPham: row.TenSanPham || "",
                        TrenChuyen_MaSanPham: row.MaSanPham || "",
                        TrenChuyen_IDKeHoachSanXuat: row.ID_KeHoachSanXuat ?? "",
                        TrenChuyen_MaDonHang: row.Ma_DonHang || row.MaDonHang || "",
                        TrenChuyen_TenQuyTrinhSanXuat: row.Ten_QuyTrinhSanXuat || row.TenQuyTrinhSanXuat || "",
                        TrenChuyen_Lot: row.So_LoSanXuat || row.Lot || "",
                        TrenChuyen_LenhXuatVatTu: row.LenhXuatVatTu || ""
                    };
                } else if (selectedLoai?.Id === 4) {
                    payload.keHoachNhapId = row.KeHoachNhapId || row.ID_TuTang;
                } else {
                    payload.sourceId = getRowId(row);
                }
                console.log(row)
                console.log(payload)
                return createPhieuKiem(payload);
            });
            await Promise.all(promises);

            showToast(`Đã tạo thành công ${selectedLichList.length} phiếu kiểm!`, "success");
            navigate("/phieu-kiem");
        } catch (err) {
            if (selectedLoai?.Id === 4 && err?.response?.status === 409) {
                await refreshSxbtPreview(selectedLichList);
            }
            showToast(err?.response?.data?.message || err.message || "Có lỗi xảy ra khi tạo hàng loạt", "error");
        } finally {
            setLoading(false);
        }
    };

    const isAllSelected = filteredLichList.length > 0
        && filteredLichList.every((row) => selectedLichList.some((item) => getRowId(item) === getRowId(row)));

    return (
        <Fade in timeout={300}>
            <Box>
                {/* HEADER */}
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
                    <IconButton onClick={() => navigate("/phieu-kiem")}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                        Tạo Phiếu kiểm
                    </Typography>
                </Stack>

                {/* FORM */}
                <Paper sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Thông tin chung</Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <StaticSelect
                                label="Loại kiểm"
                                placeholder="Chọn loại kiểm..."
                                options={loaiKiemList}
                                value={form.loaiKiemId}
                                onSelect={handleLoaiKiemSelect}
                                valueField="Id"
                                labelField="TenLoai"
                            />
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                            <StaticSelect
                                label="KCS phụ trách"
                                placeholder="Chọn KCS phụ trách..."
                                options={kcsList}
                                value={form.nguoiKiemId}
                                onSelect={handleNguoiKiemSelect}
                                valueField="Id"
                                labelField="FullName"
                            />
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                            <StaticSelect
                                label="Mức độ kiểm tra"
                                placeholder="Chọn mức độ kiểm tra..."
                                options={mucDoKiemTraOptions}
                                value={form.mucDoKiemTra}
                                onSelect={handleMucDoKiemTraSelect}
                                valueField="value"
                                labelField="label"
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight={600}>
                                    Danh sách kế hoạch đã chọn ({selectedLichList.length})
                                </Typography>
                                <Button
                                    startIcon={<AddIcon />}
                                    variant="outlined"
                                    size="small"
                                    disabled={!form.loaiKiemId}
                                    onClick={() => fetchLichList(selectedLoai)}
                                >
                                    Chọn thêm / Sửa danh sách
                                </Button>
                            </Stack>

                            {selectedLichList.length > 0 ? (
                                <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Mã SP/Vật tư</TableCell>
                                                <TableCell>Tên / Quy cách</TableCell>
                                                {isKeHoachSanXuatLoai(selectedLoai) && <TableCell>Quy trình sản xuất</TableCell>}
                                                <TableCell>Số lượng</TableCell>
                                                <TableCell>Nguồn</TableCell>
                                                <TableCell align="center">Xóa</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {selectedLichList.map(row => (
                                                <TableRow key={getRowId(row)}>
                                                    <TableCell fontWeight={600}>
                                                        {selectedLoai?.MaLoai === "DAU_VAO" ? row.Ma_VatTu :
                                                            isKeHoachSanXuatLoai(selectedLoai) ? row.MaSanPham :
                                                                selectedLoai?.Id === 4 ? (row.ItemCode || `KH nhập #${row.ID_TuTang}`) :
                                                                    row.ItemId}
                                                    </TableCell>
                                                    <TableCell>
                                                        {selectedLoai?.MaLoai === "DAU_VAO" ? row.QuyCach :
                                                            isKeHoachSanXuatLoai(selectedLoai) ? row.TenSanPham :
                                                                selectedLoai?.Id === 4
                                                                    ? (row.Ten_SanPham || row.Ma_DonHang || `${row.Ten_DonVi || ''} ${row.Ten_BoPhan ? `- ${row.Ten_BoPhan}` : ''}`)
                                                                    :
                                                                    row.ItemName}
                                                    </TableCell>
                                                    {isKeHoachSanXuatLoai(selectedLoai) && (
                                                        <TableCell>
                                                            {row.Ten_QuyTrinhSanXuat || row.TenQuyTrinhSanXuat || "---"}
                                                        </TableCell>
                                                    )}
                                                    <TableCell>
                                                        <b>{selectedLoai?.MaLoai === "KIEM_DONG_CONT" ? row.Quantity :
                                                            isKeHoachSanXuatLoai(selectedLoai) ? row.NangSuat_DuKien :
                                                                row.SoLuong}</b>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            size="small"
                                                            label={
                                                                selectedLoai?.MaLoai === "DAU_VAO" ? row.Ma_DonHang :
                                                                    isKeHoachSanXuatLoai(selectedLoai) ? row.Ten_DonVi :
                                                                        selectedLoai?.Id === 4 ? row.Ma_DonHang :
                                                                            row.Time || row.Type
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton color="error" size="small" onClick={() => handleRemoveSelected(getRowId(row))}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Paper>
                            ) : (
                                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: "#f9f9f9" }} variant="outlined">
                                    <Typography color="text.secondary">
                                        Chưa có kế hoạch nào được chọn. Vui lòng chọn loại kiểm để lấy dữ liệu.
                                    </Typography>
                                </Paper>
                            )}

                            {selectedLoai?.Id === 4 && selectedLichList.length > 0 && (
                                <Stack spacing={1.5} sx={{ mt: 2 }}>
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        Xem trước phiếu SXBT
                                    </Typography>
                                    {sxbtPreviewLoading && (
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <CircularProgress size={18} />
                                            <Typography color="text.secondary">Đang kiểm tra và nhóm kế hoạch...</Typography>
                                        </Stack>
                                    )}
                                    {sxbtPreviewError && <Alert severity="error">{sxbtPreviewError}</Alert>}
                                    {sxbtPreview?.invalidPlans?.map((invalid) => (
                                        <Alert severity="error" key={invalid.keHoachNhapId}>
                                            KH nhập #{invalid.keHoachNhapId}: {invalid.message}
                                        </Alert>
                                    ))}
                                    {sxbtPreview?.groups?.map((group) => (
                                        <Paper key={group.groupKey} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                                            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                                                <Box>
                                                    <Typography fontWeight={800}>Phiếu dự kiến {group.groupIndex}</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {group.header.TenSanPhamGop || group.header.TenSanPham || "---"} · Ngày nhập {group.header.NgayNhap ? new Date(`${group.header.NgayNhap}T00:00:00`).toLocaleDateString("vi-VN") : "---"}
                                                    </Typography>
                                                </Box>
                                                <Chip label={`${group.plans.length} kế hoạch · ${group.header.NgayNhap ? new Date(`${group.header.NgayNhap}T00:00:00`).toLocaleDateString("vi-VN") : "---"}`} color="primary" variant="outlined" />
                                            </Stack>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>ID KH nhập</TableCell>
                                                        <TableCell>ID KHSX</TableCell>
                                                        <TableCell>Tên sản phẩm gốc</TableCell>
                                                        <TableCell>Nhà thầu / Quy trình</TableCell>
                                                        <TableCell align="right">Số lượng riêng</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {group.plans.map((plan) => (
                                                        <TableRow key={plan.KeHoachNhapId}>
                                                            <TableCell>#{plan.KeHoachNhapId}</TableCell>
                                                            <TableCell>#{plan.ID_KeHoachSanXuat}</TableCell>
                                                            <TableCell>{plan.Ten_SanPham || "---"}</TableCell>
                                                            <TableCell>{plan.Ma_NhaThau || plan.Ten_BoPhan || "---"} · {plan.Ten_QuyTrinhSanXuat || "---"}</TableCell>
                                                            <TableCell align="right"><b>{Number(plan.SoLuong || 0).toLocaleString("vi-VN")}</b></TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </Paper>
                                    ))}
                                </Stack>
                            )}
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Stack direction="row" justifyContent="flex-end">
                                <Button
                                    variant="contained"
                                    onClick={handleSubmit}
                                    disabled={loading || sxbtPreviewLoading || selectedLichList.length === 0 || (selectedLoai?.Id === 4 && (!sxbtPreview || sxbtPreview.invalidPlans?.length > 0))}
                                    startIcon={loading && <CircularProgress size={18} color="inherit" />}
                                >
                                    {selectedLoai?.MaLoai === "CUOI_CHUYEN"
                                        ? "Tạo 1 phiếu kiểm"
                                        : selectedLoai?.Id === 4
                                            ? `Tạo ${sxbtPreview?.groupCount || 0} phiếu từ ${selectedLichList.length} kế hoạch`
                                            : `Tạo ${selectedLichList.length > 0 ? selectedLichList.length : ''} phiếu kiểm`}
                                </Button>
                            </Stack>
                        </Grid>
                    </Grid>
                </Paper>

                <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="lg" fullWidth scroll="paper">
                    <DialogTitle>
                        {selectedLoai?.Id === 4 ? "Chọn kế hoạch nhập BTP cần kiểm" : "Chọn kế hoạch kiểm tra"}
                    </DialogTitle>
                    <DialogContent dividers sx={{ p: 0 }}>
                        {loadingModal ? (
                            <Box sx={{ textAlign: "center", p: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <Box sx={{ p: 2 }}>
                                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                                    <TextField
                                        fullWidth
                                        placeholder="Tìm theo mã, tên, quy trình, số cont, invoice..."
                                        variant="outlined"
                                        value={displaySearchTerm}
                                        onChange={(e) => setDisplaySearchTerm(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon color="action" />
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                    {selectedLoai?.MaLoai === "KIEM_DONG_CONT" && (
                                        <TextField
                                            label="Tuần"
                                            type="number"
                                            sx={{ width: 100 }}
                                            value={displayWeek}
                                            onChange={(e) => setDisplayWeek(e.target.value)}
                                        />
                                    )}
                                </Stack>

                                {isKeHoachSanXuatLoai(selectedLoai) && (
                                    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                                        <Grid container spacing={1.5} alignItems="center">
                                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    size="small"
                                                    label="Ngày kế hoạch"
                                                    value={planDateFilter}
                                                    onChange={(event) => setPlanDateFilter(event.target.value)}
                                                >
                                                    <MenuItem value="">Tất cả ngày</MenuItem>
                                                    {planFilterOptions.dates.map((dateValue) => (
                                                        <MenuItem key={dateValue} value={dateValue}>
                                                            {new Date(`${dateValue}T00:00:00`).toLocaleDateString("vi-VN")}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    size="small"
                                                    label="Đơn vị / Phân xưởng"
                                                    value={planUnitFilter}
                                                    onChange={(event) => setPlanUnitFilter(event.target.value)}
                                                >
                                                    <MenuItem value="">Tất cả đơn vị</MenuItem>
                                                    {planFilterOptions.units.map((option) => (
                                                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                                    ))}
                                                </TextField>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    size="small"
                                                    label="Bộ phận"
                                                    value={planDepartmentFilter}
                                                    onChange={(event) => setPlanDepartmentFilter(event.target.value)}
                                                >
                                                    <MenuItem value="">Tất cả bộ phận</MenuItem>
                                                    {planFilterOptions.departments.map((option) => (
                                                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                                    ))}
                                                </TextField>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    size="small"
                                                    label="Quy trình sản xuất"
                                                    value={planProcessFilter}
                                                    onChange={(event) => setPlanProcessFilter(event.target.value)}
                                                >
                                                    <MenuItem value="">Tất cả quy trình</MenuItem>
                                                    {planFilterOptions.processes.map((option) => (
                                                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                                    ))}
                                                </TextField>
                                            </Grid>
                                            <Grid size={{ xs: 12 }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="caption" color="text.secondary">
                                                        Hiển thị {filteredLichList.length}/{lichList.length} kế hoạch · Đã chọn {selectedLichList.length}
                                                    </Typography>
                                                    <Button
                                                        size="small"
                                                        onClick={clearPlanFilters}
                                                        disabled={!planDateFilter && !planUnitFilter && !planDepartmentFilter && !planProcessFilter}
                                                    >
                                                        Xóa bộ lọc
                                                    </Button>
                                                </Stack>
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                )}

                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    checked={isAllSelected}
                                                    onChange={handleSelectAll}
                                                />
                                            </TableCell>
                                            {selectedLoai?.MaLoai === "KIEM_DONG_CONT" && (
                                                <>
                                                    <TableCell>Cont / Time</TableCell>
                                                    <TableCell>Item Code</TableCell>
                                                    <TableCell>Tên sản phẩm</TableCell>
                                                    <TableCell>Khách hàng / Kho</TableCell>
                                                    <TableCell>ECIS/ Invoice</TableCell>
                                                </>
                                            )}
                                            {selectedLoai?.MaLoai === "DAU_VAO" && (
                                                <>
                                                    <TableCell>Đơn hàng</TableCell>
                                                    <TableCell>Mã vật tư</TableCell>
                                                    <TableCell>Quy cách</TableCell>
                                                    <TableCell sx={{ minWidth: 200 }}>
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            <Typography variant="subtitle2" fontWeight="bold">
                                                                Chủng loại vật tư
                                                            </Typography>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setShowChungLoaiFilter(!showChungLoaiFilter)}
                                                                color={chungLoaiFilter ? "primary" : "default"}
                                                            >
                                                                <FilterListIcon fontSize="small" />
                                                            </IconButton>
                                                        </Stack>
                                                        {showChungLoaiFilter && (
                                                            <TextField
                                                                size="small"
                                                                placeholder="Lọc chủng loại..."
                                                                value={displayChungLoaiFilter}
                                                                onChange={(e) => setDisplayChungLoaiFilter(e.target.value)}
                                                                variant="standard"
                                                                fullWidth
                                                                sx={{ mt: 1 }}
                                                            />
                                                        )}
                                                    </TableCell>
                                                    <TableCell>Nhà cung cấp</TableCell>
                                                </>
                                            )}
                                            {isKeHoachSanXuatLoai(selectedLoai) && (
                                                <>
                                                    <TableCell>Phân xưởng / Bộ phận</TableCell>
                                                    <TableCell>Mã SP</TableCell>
                                                    <TableCell>Tên sản phẩm</TableCell>
                                                    <TableCell>Quy trình sản xuất</TableCell>
                                                    <TableCell>Kế hoạch</TableCell>
                                                    <TableCell>NS Dự kiến</TableCell>
                                                    <TableCell>Đã SX</TableCell>
                                                </>
                                            )}
                                            {selectedLoai?.Id === 4 && (
                                                <>
                                                    <TableCell sx={{ minWidth: 120 }}>KH nhập</TableCell>
                                                    <TableCell sx={{ minWidth: 200 }}>Nhà thầu</TableCell>
                                                    <TableCell sx={{ minWidth: 150 }}>Đơn hàng</TableCell>
                                                    <TableCell sx={{ minWidth: 220 }}>Sản phẩm / Lot</TableCell>
                                                    <TableCell sx={{ minWidth: 160 }}>Quy trình</TableCell>
                                                    <TableCell sx={{ minWidth: 120 }}>Ngày SX</TableCell>
                                                    <TableCell sx={{ minWidth: 120 }}>Loại KH</TableCell>
                                                </>
                                            )}
                                            {!isKeHoachSanXuatLoai(selectedLoai) && (
                                                <TableCell sx={{ minWidth: 80 }}>SL</TableCell>
                                            )}
                                            <TableCell sx={{ minWidth: 120 }}>Ngày</TableCell>
                                        </TableRow>
                                    </TableHead>

                                    <TableBody
                                        key={isKeHoachSanXuatLoai(selectedLoai)
                                            ? [planDateFilter, planUnitFilter, planDepartmentFilter, planProcessFilter, searchTerm].join("|")
                                            : `${selectedLoai?.Id || "none"}|${searchTerm}`}
                                    >
                                        {filteredLichList.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                                                    <Typography color="text.secondary">
                                                        Không tìm thấy kết quả phù hợp.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredLichList.map((row, rowIndex) => {
                                                const isSelected = selectedLichList.some(item => getRowId(item) === getRowId(row));
                                                return (
                                                    <TableRow
                                                        key={getRowRenderKey(row, rowIndex)}
                                                        hover
                                                        onClick={() => handleToggleRow(row)}
                                                        role="checkbox"
                                                        selected={isSelected}
                                                        sx={{ cursor: "pointer" }}
                                                    >
                                                        <TableCell padding="checkbox">
                                                            <Checkbox checked={isSelected} />
                                                        </TableCell>

                                                        {selectedLoai?.MaLoai === "KIEM_DONG_CONT" && (
                                                            <>
                                                                <TableCell><b>{row.Time || row.Type}</b></TableCell>
                                                                <TableCell>{row.ItemId}</TableCell>
                                                                <TableCell>{row.ItemName}</TableCell>
                                                                <TableCell>
                                                                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                                                                        <Chip
                                                                            label={row.KhachHang || "Chưa xác định"}
                                                                            size="small"
                                                                            color={row.KhachHang === "IKEA" ? "primary" : row.KhachHang === "DEK" ? "warning" : "default"}
                                                                        />
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            {row.WarehouseId || "---"}
                                                                        </Typography>
                                                                    </Stack>
                                                                </TableCell>
                                                                <TableCell>{row.InvoiceNo}</TableCell>
                                                            </>
                                                        )}

                                                        {selectedLoai?.MaLoai === "DAU_VAO" && (
                                                            <>
                                                                <TableCell>{row.Ma_DonHang}</TableCell>
                                                                <TableCell>
                                                                    <Typography fontWeight={600}>
                                                                        {row.Ma_VatTu}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell>{row.QuyCach}</TableCell>
                                                                <TableCell>{row.Ten_ChungLoaiVatTu}</TableCell>
                                                                <TableCell>{row.NhaCungCap}</TableCell>
                                                            </>
                                                        )}
                                                        {isKeHoachSanXuatLoai(selectedLoai) && (
                                                            <>
                                                                <TableCell>
                                                                    <Typography variant="body2" fontWeight={600}>{row.Ten_DonVi || "---"}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {row.Ten_BoPhan || "Chưa xác định bộ phận"}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell>{row.MaSanPham}</TableCell>
                                                                <TableCell>{row.TenSanPham}</TableCell>
                                                                <TableCell>{row.Ten_QuyTrinhSanXuat || row.TenQuyTrinhSanXuat || "---"}</TableCell>
                                                                <TableCell>{row.SoLuongKeHoach}</TableCell>
                                                                <TableCell><b>{row.NangSuat_DuKien}</b></TableCell>
                                                                <TableCell>{row.DaSanXuat}</TableCell>
                                                            </>
                                                        )}
                                                        {selectedLoai?.Id === 4 && (
                                                            <>
                                                                <TableCell>
                                                                    <Typography fontWeight={700}>#{row.ID_TuTang}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        KHSX #{row.ID_KeHoachSanXuat}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Typography variant="body2">{row.Ten_BoPhan || "---"}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {row.Ma_NhaThau || row.Ten_DonVi || ""}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell>{row.Ma_DonHang}</TableCell>
                                                                <TableCell>
                                                                    <Typography variant="body2">{row.ItemCode || "---"} · {row.Ten_SanPham || row.Ma_DonHang || "---"}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        Lot: {row.So_LoSanXuat || "---"}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell>{row.Ten_QuyTrinhSanXuat || "---"}</TableCell>
                                                                <TableCell>
                                                                    {row.Ngay_ThucTeSX ? new Date(row.Ngay_ThucTeSX).toLocaleDateString("vi-VN") : "---"}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip
                                                                        size="small"
                                                                        color={Number(row.LoaiKH) === 2 ? "warning" : "default"}
                                                                        label={row.TenLoaiKeHoach || (Number(row.LoaiKH) === 2 ? "Điều chỉnh" : "Kế hoạch gốc")}
                                                                    />
                                                                </TableCell>
                                                            </>
                                                        )}
                                                        {!isKeHoachSanXuatLoai(selectedLoai) && (
                                                            <TableCell><b>{selectedLoai?.MaLoai === "KIEM_DONG_CONT" ? row.Quantity : row.SoLuong}</b></TableCell>
                                                        )}
                                                        <TableCell>
                                                            {selectedLoai?.MaLoai === "KIEM_DONG_CONT"
                                                                ? row.RequiredDateString
                                                                : isKeHoachSanXuatLoai(selectedLoai)
                                                                    ? (row.Ngay ? `${new Date(row.Ngay).toLocaleDateString('vi-VN')} ` : '')
                                                                    : selectedLoai?.Id === 4
                                                                        ? new Date(row.Ngay_NhapBTP).toLocaleDateString('vi-VN')
                                                                        : new Date(row.Ngay_Giao || row.Ngay_Invoice).toLocaleDateString('vi-VN')}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setOpenModal(false)} color="inherit">
                            Đóng
                        </Button>
                        <Button
                            onClick={() => {
                                setOpenModal(false);
                                if (selectedLoai?.Id === 4) refreshSxbtPreview(selectedLichList);
                            }}
                            variant="contained"
                            disabled={selectedLichList.length === 0}
                        >
                            Xác nhận chọn ({selectedLichList.length})
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Fade>
    );
}
