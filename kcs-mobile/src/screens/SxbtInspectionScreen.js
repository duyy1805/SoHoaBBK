import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    Platform,
    Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
    getPhieuKiemDetail,
    getBtpItems,
    getAssetUrl,
    getDefectList,
    saveSxbtData,
    completeSxbt,
    confirmKhoSxbt
} from "../api/phieuKiem.api";
import { getUser } from "../utils/auth";

const SHOW_MANUAL_BTP_LOT_EDITOR = true;
const SHOW_MANUAL_BTP_LOT_ADD_ROW = false;

export default function SxbtInspectionScreen({ route, navigation }) {
    const { id } = route.params;

    // 1. All States
    const [user, setUser] = useState(null);
    const [phieu, setPhieu] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Mục I: Điều kiện VC
    const [dkvcThungSanXe, setDkvcThungSanXe] = useState("DAT");
    const [dkvcNgoaiQuan, setDkvcNgoaiQuan] = useState("DAT");

    // Mục II: Danh sách BTP
    const [btpItems, setBtpItems] = useState([]);
    const [selectedBtp, setSelectedBtp] = useState(null);
    const [btpModalVisible, setBtpModalVisible] = useState(false);
    const [khoLotQuantities, setKhoLotQuantities] = useState({});

    // Mục III: Tỷ lệ
    const [loaiMau, setLoaiMau] = useState("LAN_1_2");
    const [tyLeMauInput, setTyLeMauInput] = useState("100");
    const [soLuongMau, setSoLuongMau] = useState("");
    const [ketLuan, setKetLuan] = useState("DAT");

    // Mục IV: Lỗi
    const [defects, setDefects] = useState([]);
    const [defectList, setDefectList] = useState([]);
    const [masterDefectList, setMasterDefectList] = useState([]);
    const [defectModalVisible, setDefectModalVisible] = useState(false);
    const [selectedDefectTarget, setSelectedDefectTarget] = useState(null);
    const [searchText, setSearchText] = useState("");

    // 2. Derived Variables
    const hasPermission = (p) => user?.permissions?.includes(p);
    const isKCS = hasPermission("THUC_HIEN_KIEM") || user?.Role === "KCS";
    const isKhoSXBT = hasPermission("XAC_NHAN_KHO_SXBT");

    const isCompleted = phieu?.TrangThai === "CHO_SXBT_XAC_NHAN" ||
        phieu?.TrangThai === "CHO_KHO_XAC_NHAN" ||
        phieu?.TrangThai === "CHO_KIEM_NGHIEM" ||
        phieu?.TrangThai === "CHO_XUONG_XAC_NHAN" ||
        phieu?.TrangThai === "HOAN_THANH" ||
        phieu?.TrangThai === "HOAN_TAT";
    const canEditKhoQuantity = phieu?.TrangThai === "CHO_KHO_XAC_NHAN" && isKhoSXBT;

    console.log("Status check:", { isCompleted, isKCS, status: phieu?.TrangThai });

    const getStatusColor = (status) => {
        switch (status) {
            case "CHUA_KIEM": return "#94a3b8";
            case "HOAN_THANH": return "#10b981";
            case "CHO_KHO_XAC_NHAN": return "#2563eb";
            case "CHO_XUONG_XAC_NHAN": return "#f59e0b";
            case "CHO_KIEM_NGHIEM": return "#3b82f6";
            default: return "#64748b";
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case "CHUA_KIEM": return "Chưa kiểm";
            case "HOAN_THANH": return "Hoàn thành";
            case "HOAN_TAT": return "Hoàn thành";
            case "CHO_KHO_XAC_NHAN": return "Chờ Kho xác nhận";
            case "CHO_XUONG_XAC_NHAN": return "Chờ Kho xác nhận";
            case "CHO_KIEM_NGHIEM": return "Chờ TP_B8 xác nhận";
            default: return status;
        }
    };

    const filteredDefects = masterDefectList.filter(d =>
        (d.TenLoi || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (d.MaLoi || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (d.TenSanPham || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (d.ChungLoai || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (d.PhamViApDung || '').toLowerCase().includes(searchText.toLowerCase())
    );

    const isFilledBtpLotRow = (row = {}) =>
        (row.SoLuongNhap !== undefined && row.SoLuongNhap !== null && row.SoLuongNhap !== "") ||
        !!row.DauTuanGS1 ||
        !!row.ThuTu ||
        !!row.LxvtLot ||
        !!row.SoLotSX;

    const legacyLotRowFromItem = (item = {}) => {
        item = item || {};
        return {
            BtpItemId: item.Id,
            DauTuanGS1: item.DauTuanGS1 || "",
            ThuTu: item.ThuTu || "",
            LxvtLot: item.LxvtLot || "",
            SoLotSX: item.SoLotSX || "",
            SoLuongNhap: item.SoLuongNhap ?? "",
            SortOrder: 1
        };
    };

    const normalizeBtpLotRows = (item = {}) => {
        item = item || {};
        const sourceRows = Array.isArray(item.LotRows) && item.LotRows.length > 0
            ? item.LotRows
            : (isFilledBtpLotRow(legacyLotRowFromItem(item)) ? [legacyLotRowFromItem(item)] : []);

        return sourceRows.map((row, index) => ({
            Id: row.Id,
            BtpItemId: row.BtpItemId || item.Id,
            DauTuanGS1: row.DauTuanGS1 || "",
            ThuTu: row.ThuTu || "",
            LxvtLot: row.LxvtLot || "",
            SoLotSX: row.SoLotSX || "",
            SoLuongNhap: row.SoLuongNhap ?? "",
            SoLuongKhoXacNhan: row.SoLuongKhoXacNhan ?? "",
            SortOrder: row.SortOrder || index + 1
        }));
    };

    const normalizeBtpItem = (item = {}) => ({
        ...item,
        LotRows: normalizeBtpLotRows(item)
    });

    const getBtpLotRows = (item = {}) => normalizeBtpLotRows(item);

    const getDefectRowKey = (defect = {}) =>
        `${defect.DefectId || "defect"}-${defect.BtpLotRowId || "unassigned"}`;

    const getDefectsForLot = (item = {}, lotRow = {}) =>
        defectList.filter(d =>
            Number(d.BtpItemId) === Number(item.Id) &&
            Number(d.BtpLotRowId) === Number(lotRow.Id)
        );

    const getUnassignedDefects = () => defectList.filter(d => {
        if (!d.BtpLotRowId) return true;
        return !btpItems.some(item =>
            getBtpLotRows(item).some(row =>
                Number(d.BtpItemId) === Number(item.Id) &&
                Number(d.BtpLotRowId) === Number(row.Id)
            )
        );
    });

    const getLotContextText = (item = {}, lotRow = {}) => {
        const parts = [];
        if (item.SourceID_KeHoachSanXuat) parts.push(`KH #${item.SourceID_KeHoachSanXuat}`);
        if (lotRow.SoLotSX) parts.push(`Lot SX: ${lotRow.SoLotSX}`);
        if (lotRow.SoLuongNhap !== undefined && lotRow.SoLuongNhap !== null && lotRow.SoLuongNhap !== "") {
            parts.push(`SL nhập: ${formatQuantity(lotRow.SoLuongNhap)}`);
        }
        return parts.join(" · ");
    };

    const getDefectTypeTone = (type) => {
        if (type === "CRITICAL" || type === "Nghiêm trọng") {
            return { bg: "#fee2e2", text: "#dc2626", label: "Nghiêm trọng" };
        }
        if (type === "MAJOR" || type === "Nặng") {
            return { bg: "#fef3c7", text: "#d97706", label: "Nặng" };
        }
        if (type === "MINOR" || type === "Nhẹ") {
            return { bg: "#e0f2fe", text: "#0369a1", label: "Nhẹ" };
        }
        return { bg: "#e0f2fe", text: "#0369a1", label: type || "Nhẹ" };
    };

    const openDefectModalForLot = (item, lotRow) => {
        setSelectedDefectTarget({ item, lotRow });
        setDefectModalVisible(true);
    };

    const formatQuantity = (value) =>
        value !== undefined && value !== null && value !== ""
            ? Number(value).toLocaleString("vi-VN")
            : "---";

    const getBtpTotalInputQuantity = (item = {}) =>
        getBtpLotRows(item).reduce((sum, row) => sum + (Number(row.SoLuongNhap) || 0), 0);

    const getLotRowKey = (row = {}, fallback) => String(row.Id || fallback);

    const initializeKhoLotQuantities = (items = []) => {
        const next = {};
        items.forEach((item) => {
            getBtpLotRows(item).forEach((row, rowIndex) => {
                next[getLotRowKey(row, `${item.Id}-${rowIndex}`)] =
                    row.SoLuongKhoXacNhan !== undefined && row.SoLuongKhoXacNhan !== null
                        ? String(row.SoLuongKhoXacNhan)
                        : "";
            });
        });
        setKhoLotQuantities(next);
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [detailRes, defectRes, userData] = await Promise.all([
                getPhieuKiemDetail(id),
                getDefectList({ phanHe: "SXBT" }),
                getUser()
            ]);

            const data = detailRes.data;
            const phieuInfo = data.phieu || data; // fallback for older structure if any

            setPhieu(phieuInfo);
            setUser(userData);

            // 1. Mục I: Điều kiện VC (từ dynamicFields)
            const fields = data.dynamicFields || [];
            const dkThung = fields.find(f => f.FieldName === "DKVC_THUNG_SAN_XE")?.FieldValue;
            const dkNgoaiQuan = fields.find(f => f.FieldName === "DKVC_NGOAI_QUAN")?.FieldValue;
            if (dkThung) setDkvcThungSanXe(dkThung);
            if (dkNgoaiQuan) setDkvcNgoaiQuan(dkNgoaiQuan);

            // 2. Mục II: BTP Items
            const normalizedBtpItems = (data.btpItems || []).map(normalizeBtpItem);
            setBtpItems(normalizedBtpItems);
            initializeKhoLotQuantities(normalizedBtpItems);

            // 3. Mục III: Tỷ lệ (từ summary)
            if (data.summary && data.summary.SoLuongMau) {
                const savedLoaiMau = data.summary.LoaiMau || "LAN_1_2";
                setLoaiMau(savedLoaiMau);
                setSoLuongMau(String(data.summary.SoLuongMau));
                if (data.summary.TyLe !== undefined && data.summary.TyLe !== null) {
                    setTyLeMauInput(String(Number(data.summary.TyLe).toFixed(1)).replace(/\.0$/, ""));
                } else {
                    const total = phieuInfo.SoLuong || 0;
                    const savedSamples = Number(data.summary.SoLuongMau) || 0;
                    setTyLeMauInput(total > 0 ? String(((savedSamples / total) * 100).toFixed(1)).replace(/\.0$/, "") : String(getDefaultSampleRate(savedLoaiMau)));
                }
            } else {
                setLoaiMau("LAN_1_2");
                setTyLeMauInput("100");
                if (phieuInfo.SoLuong) {
                    setSoLuongMau(String(phieuInfo.SoLuong)); // Mặc định Lần 1,2 là 100%
                }
            }
            if (phieuInfo.KetLuan) setKetLuan(phieuInfo.KetLuan);

            // 4. Mục IV: Lỗi
            const masterDefects = (defectRes.data || []);
            setMasterDefectList(masterDefects);

            const savedDefects = data.defects || [];
            const activeFormattedDefects = savedDefects.map(s => {
                const master = masterDefects.find(m => m.Id === s.DefectId);
                return {
                    DefectId: s.DefectId,
                    TenLoi: master ? master.TenLoi : s.TenLoi,
                    DefectType: master ? master.DefectType : s.DefectType,
                    SoLuong: s.SoLuong,
                    IsLapLai: s.IsLapLai,
                    BtpItemId: s.BtpItemId || null,
                    BtpLotRowId: s.BtpLotRowId || null,
                    BtpTenSanPham: s.BtpTenSanPham || "",
                    BtpSoLotSX: s.BtpSoLotSX || "",
                    SourceID_KeHoachSanXuat: s.SourceID_KeHoachSanXuat || null
                };
            }).filter(d => d.SoLuong > 0);

            setDefectList(activeFormattedDefects);

        } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Không thể tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    const getDefaultSampleRate = (type) => {
        if (type === 'LAN_3') return 5;
        if (type === 'LO_TRUOC_KHONG_DAT') return 5;
        return 100;
    };

    const formatPercentInput = (value) => String(Number(value).toFixed(1)).replace(/\.0$/, "");

    // Handle Loai Mau Change
    const handleLoaiMauChange = (type) => {
        setLoaiMau(type);
        const rate = getDefaultSampleRate(type);
        setTyLeMauInput(String(rate));
        const total = phieu?.SoLuong || 0;
        if (total > 0) {
            setSoLuongMau(String(Math.ceil(total * rate / 100)));
        }
    };

    const handleTyLeMauChange = (value) => {
        const normalized = value.replace(',', '.');
        setTyLeMauInput(normalized);
        const rate = Number(normalized);
        const total = phieu?.SoLuong || 0;
        if (!Number.isNaN(rate) && total > 0) {
            setSoLuongMau(String(Math.ceil(total * rate / 100)));
        }
    };

    const handleSoLuongMauChange = (value) => {
        setSoLuongMau(value);
        const samples = Number(value);
        const total = phieu?.SoLuong || 0;
        if (!Number.isNaN(samples) && total > 0) {
            setTyLeMauInput(formatPercentInput((samples / total) * 100));
        }
    };

    // Manual BTP lot editor is kept behind SHOW_MANUAL_BTP_LOT_EDITOR for temporary rollout.
    const handleBtpLotChange = (index, field, value) => {
        setSelectedBtp(prev => {
            const rows = getBtpLotRows(prev);
            const nextRows = rows.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [field]: value } : row
            );
            return { ...prev, LotRows: nextRows };
        });
    };

    const inputValue = (value) => value === undefined || value === null ? "" : String(value);

    const saveBtpItem = () => {
        const cleanBtp = { ...(selectedBtp || {}) };
        const lotRows = getBtpLotRows(cleanBtp)
            .map((row, index) => ({
                ...row,
                BtpItemId: cleanBtp.Id,
                SortOrder: index + 1
            }));
        const firstLot = lotRows[0] || {};
        cleanBtp.LotRows = lotRows;
        cleanBtp.SoLuongNhap = firstLot.SoLuongNhap ?? null;
        cleanBtp.DauTuanGS1 = firstLot.DauTuanGS1 || null;
        cleanBtp.ThuTu = firstLot.ThuTu || null;
        cleanBtp.LxvtLot = firstLot.LxvtLot || null;
        cleanBtp.SoLotSX = firstLot.SoLotSX || null;
        setBtpItems(prev => prev.map(item => item.Id === cleanBtp.Id ? cleanBtp : item));
        setBtpModalVisible(false);
    };

    // Handle Defect
    const handleDefectChange = (defectKey, delta) => {
        setDefectList(prev => prev.map(d => {
            if (getDefectRowKey(d) === defectKey) {
                const newQuantity = Math.max(0, d.SoLuong + delta);
                return { ...d, SoLuong: newQuantity };
            }
            return d;
        }));
    };

    const handleDefectQuantityInput = (defectKey, value) => {
        const normalizedValue = value.replace(/[^0-9]/g, "");
        setDefectList(prev => prev.map(d =>
            getDefectRowKey(d) === defectKey
                ? { ...d, SoLuong: normalizedValue === "" ? 0 : Number(normalizedValue) }
                : d
        ));
    };

    const toggleLapLai = (defectKey) => {
        setDefectList(prev => prev.map(d => getDefectRowKey(d) === defectKey ? { ...d, IsLapLai: !d.IsLapLai } : d));
    };

    const addDefect = (masterDefect) => {
        const targetItem = selectedDefectTarget?.item || null;
        const targetLotRow = selectedDefectTarget?.lotRow || null;
        const targetBtpItemId = targetItem?.Id || null;
        const targetBtpLotRowId = targetLotRow?.Id || null;
        const exists = defectList.find(d =>
            d.DefectId === masterDefect.Id &&
            String(d.BtpLotRowId || "") === String(targetBtpLotRowId || "")
        );
        if (exists) {
            handleDefectChange(getDefectRowKey(exists), 1);
        } else {
            setDefectList(prev => [...prev, {
                DefectId: masterDefect.Id,
                TenLoi: masterDefect.TenLoi,
                DefectType: masterDefect.DefectType,
                SoLuong: 1,
                IsLapLai: false,
                BtpItemId: targetBtpItemId,
                BtpLotRowId: targetBtpLotRowId,
                BtpTenSanPham: targetItem?.TenSanPham || "",
                BtpSoLotSX: targetLotRow?.SoLotSX || "",
                SourceID_KeHoachSanXuat: targetItem?.SourceID_KeHoachSanXuat || null
            }]);
        }
        setDefectModalVisible(false);
        setSelectedDefectTarget(null);
    };

    // Calculate Percentages
    const totalSamples = parseInt(soLuongMau) || 0;
    const totalDefects = defectList.reduce((sum, d) => sum + d.SoLuong, 0);
    const criticalDefects = defectList.filter(d => d.DefectType === 'Nghiêm trọng').reduce((sum, d) => sum + d.SoLuong, 0);
    const majorMinorDefects = totalDefects - criticalDefects;

    const manualSampleRate = Number(tyLeMauInput);
    const tyLe = tyLeMauInput !== "" && !Number.isNaN(manualSampleRate)
        ? manualSampleRate
        : (totalSamples > 0 ? (totalSamples / (phieu?.SoLuong || 1)) * 100 : 0);
    const tyLeLoi = totalSamples > 0 ? (totalDefects / totalSamples) * 100 : 0;
    const tyLeDat = 100 - tyLeLoi;
    const tyLeCritical = totalSamples > 0 ? (criticalDefects / totalSamples) * 100 : 0;
    const tyLeMajorMinor = totalSamples > 0 ? (majorMinorDefects / totalSamples) * 100 : 0;

    const handleConfirmKho = async () => {
        const lotRows = [];
        btpItems.forEach((item) => {
            getBtpLotRows(item).forEach((row, rowIndex) => {
                const key = getLotRowKey(row, `${item.Id}-${rowIndex}`);
                lotRows.push({
                    lotRowId: row.Id,
                    soLuongKhoXacNhan: khoLotQuantities[key]
                });
            });
        });

        if (lotRows.length === 0 || lotRows.some((row) => !row.lotRowId || row.soLuongKhoXacNhan === "" || row.soLuongKhoXacNhan === undefined || row.soLuongKhoXacNhan === null)) {
            Alert.alert("Thiếu dữ liệu", "Vui lòng nhập số lượng Kho xác nhận cho tất cả dòng lot.");
            return;
        }

        try {
            setSaving(true);
            await confirmKhoSxbt(id, lotRows);
            Alert.alert("Thành công", "Kho đã xác nhận số lượng nhập. Phiếu đã hoàn thành.");
            navigation.goBack();
        } catch (error) {
            Alert.alert("Lỗi", error?.response?.data?.message || "Không thể xác nhận Kho");
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async (showSuccessAlert = true) => {
        try {
            setSaving(true);
            const activeDefects = defectList.filter(d => d.SoLuong > 0);

            const payload = {
                phieuKiemId: id,
                dynamicFields: [
                    { FieldCode: "DKVC_THUNG_SAN_XE", Value: dkvcThungSanXe },
                    { FieldCode: "DKVC_NGOAI_QUAN", Value: dkvcNgoaiQuan }
                ],
                summary: {
                    LoaiMau: loaiMau,
                    SoLuongMau: totalSamples,
                    TyLe: tyLe,
                    TyLeDat: tyLeDat,
                    TyLeLoiNghiemTrong: tyLeCritical,
                    TyLeLoiNangNhe: tyLeMajorMinor
                },
                ...(SHOW_MANUAL_BTP_LOT_EDITOR ? { btpItems } : {}),
                defects: activeDefects
            };

            await saveSxbtData(payload);
            if (showSuccessAlert) {
                Alert.alert("Đã lưu nháp", "Đã lưu nháp phiếu kiểm.");
            }
            loadData();
        } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Không thể lưu dữ liệu.");
        } finally {
            setSaving(false);
        }
    };

    const handleComplete = async () => {
        Alert.alert(
            "Xác nhận hoàn tất",
            `Kết luận: ${ketLuan === 'DAT' ? 'Đạt ✓' : 'Không Đạt ✗'}. Sau khi hoàn tất sẽ không thể chỉnh sửa.`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Hoàn tất",
                    onPress: async () => {
                        try {
                            setSaving(true);
                            // Bước 1: Lưu toàn bộ dữ liệu (không đổi TrangThai)
                            const activeDefects = defectList.filter(d => d.SoLuong > 0);
                            const payload = {
                                phieuKiemId: id,
                                dynamicFields: [
                                    { FieldCode: "DKVC_THUNG_SAN_XE", Value: dkvcThungSanXe },
                                    { FieldCode: "DKVC_NGOAI_QUAN", Value: dkvcNgoaiQuan }
                                ],
                                summary: {
                                    LoaiMau: loaiMau,
                                    SoLuongMau: totalSamples,
                                    TyLe: tyLe,
                                    TyLeDat: tyLeDat,
                                    TyLeLoiNghiemTrong: tyLeCritical,
                                    TyLeLoiNangNhe: tyLeMajorMinor
                                },
                                ...(SHOW_MANUAL_BTP_LOT_EDITOR ? { btpItems } : {}),
                                defects: activeDefects
                                // Không gửi ketLuan ở đây – SP Save không đổi TrangThai
                            };
                            await saveSxbtData(payload);

                            // Bước 2: Hoàn tất – gửi kết luận để SP Complete đổi TrangThai
                            await completeSxbt(id, ketLuan);

                            Alert.alert("Đã hoàn tất", "Chờ Kho xác nhận số lượng");
                            navigation.goBack();
                        } catch (error) {
                            console.error(error);
                            Alert.alert("Lỗi", "Không thể hoàn tất phiếu.");
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    };


    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0052cc" />
            </View>
        );
    }


    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView style={styles.scroll}>
                <View style={styles.headerCard}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title}>Phiếu: {phieu?.SoPhieu}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(phieu?.TrangThai) }]}>
                            <Text style={styles.statusText}>{getStatusLabel(phieu?.TrangThai)}</Text>
                        </View>
                    </View>

                    <View style={styles.infoGrid}>
                        <View style={[styles.infoItem, { width: '100%', marginBottom: 10 }]}>
                            <Text style={styles.infoLabel}>Mã đơn hàng</Text>
                            <Text style={styles.infoValue}>{phieu?.MaDonHang || "---"}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', width: '100%' }}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Số lượng KH</Text>
                                <Text style={styles.infoValue}>{phieu?.SoLuong || 0}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Ngày nhập</Text>
                                <Text style={styles.infoValue}>
                                    {phieu?.NgayNhap ? new Date(phieu.NgayNhap).toLocaleDateString('vi-VN') : "---"}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {phieu?.BienBanId && (
                        <TouchableOpacity
                            style={styles.bienBanBadge}
                            onPress={() => navigation.navigate("BienBanSxbtDetail", { bienBanId: phieu.BienBanId })}
                        >
                            <MaterialCommunityIcons name="alert-circle" size={18} color="#ef4444" />
                            <Text style={styles.bienBanBadgeText}>Xem biên bản KPH</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* MỤC I */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>I. Điều kiện vận chuyển</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Thùng, sàn xe sạch:</Text>
                        <View style={styles.radioGroup}>
                            <TouchableOpacity disabled={isCompleted} onPress={() => setDkvcThungSanXe("DAT")} style={[styles.radio, dkvcThungSanXe === "DAT" && styles.radioActive]}>
                                <Text style={dkvcThungSanXe === "DAT" && styles.radioTextActive}>Đạt</Text>
                            </TouchableOpacity>
                            <TouchableOpacity disabled={isCompleted} onPress={() => setDkvcThungSanXe("KHONG_DAT")} style={[styles.radio, dkvcThungSanXe === "KHONG_DAT" && styles.radioActive]}>
                                <Text style={dkvcThungSanXe === "KHONG_DAT" && styles.radioTextActive}>K.Đạt</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Ngoại quan SP:</Text>
                        <View style={styles.radioGroup}>
                            <TouchableOpacity disabled={isCompleted} onPress={() => setDkvcNgoaiQuan("DAT")} style={[styles.radio, dkvcNgoaiQuan === "DAT" && styles.radioActive]}>
                                <Text style={dkvcNgoaiQuan === "DAT" && styles.radioTextActive}>Đạt</Text>
                            </TouchableOpacity>
                            <TouchableOpacity disabled={isCompleted} onPress={() => setDkvcNgoaiQuan("KHONG_DAT")} style={[styles.radio, dkvcNgoaiQuan === "KHONG_DAT" && styles.radioActive]}>
                                <Text style={dkvcNgoaiQuan === "KHONG_DAT" && styles.radioTextActive}>K.Đạt</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* MỤC II */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>II. Chi tiết BTP</Text>
                    {btpItems.map((item, index) => {
                        const lotRows = getBtpLotRows(item);
                        const totalInputQuantity = getBtpTotalInputQuantity(item);

                        return (
                            <View
                                key={item.Id}
                                style={styles.itemRow}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName}>{item.TenSanPham}</Text>
                                    <Text style={styles.itemSub}>
                                        {item.SourceID_KeHoachSanXuat ? `KH #${item.SourceID_KeHoachSanXuat} • ` : ""}
                                        SL phiếu: {formatQuantity(item.SoLuong)} {item.DonViTinh || ""}
                                        {item.MaDonHang ? ` • Đơn hàng: ${item.MaDonHang}` : ""}
                                    </Text>
                                    <View style={styles.btpDetailBox}>
                                        {lotRows.length > 0 ? (
                                            <>
                                                <Text style={styles.btpDetailText}>
                                                    • Dữ liệu từ phiếu nhập: <Text style={{ fontWeight: 'bold' }}>{lotRows.length}</Text> dòng lot
                                                    {totalInputQuantity > 0 ? <Text> - Tổng SL nhập: <Text style={{ fontWeight: 'bold' }}>{formatQuantity(totalInputQuantity)}</Text></Text> : null}
                                                </Text>
                                                {lotRows.map((row, rowIndex) => (
                                                    <View key={`${item.Id}-lot-${rowIndex}`} style={styles.btpLotReadonlyRow}>
                                                        <Text style={styles.btpLotReadonlyTitle}>Lot {rowIndex + 1}</Text>
                                                        <Text style={styles.btpLotReadonlyText}>Số lượng nhập: {formatQuantity(row.SoLuongNhap)}</Text>
                                                        <Text style={styles.btpLotReadonlyText}>Số Lot SX: {row.SoLotSX || "---"}</Text>
                                                        <Text style={styles.btpLotReadonlyText}>
                                                            Tổng cái Kho xác nhận: {row.SoLuongKhoXacNhan !== undefined && row.SoLuongKhoXacNhan !== null && row.SoLuongKhoXacNhan !== ""
                                                                ? formatQuantity(row.SoLuongKhoXacNhan)
                                                                : "---"}
                                                        </Text>
                                                        {canEditKhoQuantity && (
                                                            <TextInput
                                                                style={styles.khoQuantityInput}
                                                                placeholder="Nhập số lượng Kho xác nhận"
                                                                keyboardType="decimal-pad"
                                                                value={khoLotQuantities[getLotRowKey(row, `${item.Id}-${rowIndex}`)] || ""}
                                                                onChangeText={(value) => {
                                                                    const normalized = value.replace(",", ".").replace(/[^0-9.]/g, "");
                                                                    const key = getLotRowKey(row, `${item.Id}-${rowIndex}`);
                                                                    setKhoLotQuantities(prev => ({ ...prev, [key]: normalized }));
                                                                }}
                                                            />
                                                        )}
                                                    </View>
                                                ))}
                                            </>
                                        ) : (
                                            <Text style={[styles.btpDetailText, { color: '#9ca3af', fontStyle: 'italic' }]}>Chưa có dữ liệu lot từ phiếu nhập</Text>
                                        )}
                                    </View>
                                    {SHOW_MANUAL_BTP_LOT_EDITOR && !isCompleted && (
                                        <TouchableOpacity
                                            style={styles.addLotBtn}
                                            onPress={() => {
                                                setSelectedBtp(normalizeBtpItem(item));
                                                setBtpModalVisible(true);
                                            }}
                                        >
                                            <Text style={styles.addLotBtnText}>Cập nhật dấu tuần/lot</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* MỤC III */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>III. Tỷ lệ kiểm</Text>

                    <View style={styles.typeGroup}>
                        {['LAN_1_2', 'LAN_3', 'LO_TRUOC_KHONG_DAT'].map(type => (
                            <TouchableOpacity
                                key={type}
                                disabled={isCompleted}
                                style={[styles.typeBtn, loaiMau === type && styles.typeBtnActive]}
                                onPress={() => handleLoaiMauChange(type)}
                            >
                                <Text style={[styles.typeBtnText, loaiMau === type && styles.typeBtnTextActive]}>
                                    {type === 'LAN_1_2' ? 'Lần 1,2' : type === 'LAN_3' ? 'Lần 3' : 'Lô trước KĐ'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {loaiMau !== 'LAN_1_2' && (
                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>Tỷ lệ mẫu (%)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Nhập tỷ lệ mẫu"
                                keyboardType="decimal-pad"
                                value={String(tyLeMauInput)}
                                editable={!isCompleted}
                                onChangeText={handleTyLeMauChange}
                            />
                        </View>
                    )}

                    <View style={styles.formGroup}>
                        <Text style={styles.inputLabel}>Số lượng mẫu</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Số lượng mẫu"
                            keyboardType="numeric"
                            value={String(soLuongMau)}
                            editable={!isCompleted}
                            onChangeText={handleSoLuongMauChange}
                        />
                    </View>

                    <View style={styles.statsBox}>
                        <Text>Tỷ lệ mẫu: {tyLe.toFixed(1)}%</Text>
                        <Text>Tỷ lệ đạt: {tyLeDat.toFixed(1)}%</Text>
                        <Text>Lỗi Nghiêm trọng: {tyLeCritical.toFixed(1)}%</Text>
                        <Text>Lỗi Nặng/Nhẹ: {tyLeMajorMinor.toFixed(1)}%</Text>
                    </View>

                    <View style={styles.row}>
                        <Text style={styles.label}>Kết luận phiếu:</Text>
                        <View style={styles.radioGroup}>
                            <TouchableOpacity disabled={isCompleted} onPress={() => setKetLuan("DAT")} style={[styles.radio, ketLuan === "DAT" && styles.radioActive]}>
                                <Text style={ketLuan === "DAT" && styles.radioTextActive}>Đạt</Text>
                            </TouchableOpacity>
                            <TouchableOpacity disabled={isCompleted} onPress={() => setKetLuan("KHONG_DAT")} style={[styles.radio, ketLuan === "KHONG_DAT" && styles.radioActive]}>
                                <Text style={ketLuan === "KHONG_DAT" && styles.radioTextActive}>K.Đạt</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* MỤC IV */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>IV. Ghi nhận lỗi</Text>

                    {btpItems.map((item) => (
                        getBtpLotRows(item).map((lotRow, lotIndex) => {
                            const lotDefects = getDefectsForLot(item, lotRow);
                            return (
                                <View key={`${item.Id}-${lotRow.Id || lotIndex}`} style={styles.defectTargetCard}>
                                    <View style={styles.defectTargetHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.defectTargetTitle}>{item.TenSanPham || "BTP"}</Text>
                                            <Text style={styles.defectTargetMeta}>{getLotContextText(item, lotRow) || `Dòng lot ${lotIndex + 1}`}</Text>
                                        </View>
                                        {!isCompleted && lotRow.Id && (
                                            <TouchableOpacity onPress={() => openDefectModalForLot(item, lotRow)} style={styles.addDefectBtn}>
                                                <Text style={styles.addDefectBtnText}>+ Thêm lỗi</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {lotDefects.length === 0 ? (
                                        <Text style={styles.emptyDefectText}>Chưa ghi nhận lỗi cho dòng này</Text>
                                    ) : lotDefects.map(d => {
                                        const defectKey = getDefectRowKey(d);
                                        const tone = getDefectTypeTone(d.DefectType);
                                        return (
                                            <View key={defectKey} style={styles.defectLineCard}>
                                                <View style={styles.defectLineTop}>
                                                    <View style={styles.defectLineInfo}>
                                                        <Text style={styles.defectRowName}>{d.TenLoi}</Text>
                                                        <View style={[styles.defectTypePill, { backgroundColor: tone.bg }]}>
                                                            <Text style={[styles.defectTypePillText, { color: tone.text }]}>{tone.label}</Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.defectActions}>
                                                        <Text style={styles.counterLabel}>Số lỗi</Text>
                                                        <View style={styles.counter}>
                                                            <TouchableOpacity disabled={isCompleted} onPress={() => handleDefectChange(defectKey, -1)} style={styles.countBtn}>
                                                                <Text style={styles.countBtnText}>-</Text>
                                                            </TouchableOpacity>
                                                            <TextInput
                                                                style={styles.countInput}
                                                                value={String(d.SoLuong)}
                                                                editable={!isCompleted}
                                                                keyboardType="number-pad"
                                                                selectTextOnFocus
                                                                onChangeText={(value) => handleDefectQuantityInput(defectKey, value)}
                                                            />
                                                            <TouchableOpacity disabled={isCompleted} onPress={() => handleDefectChange(defectKey, 1)} style={styles.countBtn}>
                                                                <Text style={styles.countBtnText}>+</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                </View>

                                                <TouchableOpacity
                                                    disabled={isCompleted}
                                                    onPress={() => toggleLapLai(defectKey)}
                                                    style={[styles.repeatToggle, d.IsLapLai && styles.repeatToggleActive]}
                                                >
                                                    <View style={[styles.repeatCheckBox, d.IsLapLai && styles.repeatCheckBoxActive]}>
                                                        {d.IsLapLai ? <Text style={styles.repeatCheckText}>✓</Text> : null}
                                                    </View>
                                                    <Text style={[styles.repeatText, d.IsLapLai && styles.repeatTextActive]}>Lỗi lặp lại</Text>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </View>
                            );
                        })
                    ))}

                    {getUnassignedDefects().length > 0 && (
                        <View style={styles.defectTargetCard}>
                            <Text style={styles.defectTargetTitle}>Lỗi chưa gắn dòng BTP</Text>
                            <Text style={styles.defectTargetMeta}>Dữ liệu cũ hoặc lỗi chưa có thông tin lot</Text>
                            {getUnassignedDefects().map(d => {
                                const defectKey = getDefectRowKey(d);
                                const tone = getDefectTypeTone(d.DefectType);
                                return (
                                    <View key={defectKey} style={styles.defectLineCard}>
                                        <View style={styles.defectLineTop}>
                                            <View style={styles.defectLineInfo}>
                                                <Text style={styles.defectRowName}>{d.TenLoi}</Text>
                                                <View style={[styles.defectTypePill, { backgroundColor: tone.bg }]}>
                                                    <Text style={[styles.defectTypePillText, { color: tone.text }]}>{tone.label}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.defectActions}>
                                                <Text style={styles.counterLabel}>Số lỗi</Text>
                                                <View style={styles.counter}>
                                                    <TouchableOpacity disabled={isCompleted} onPress={() => handleDefectChange(defectKey, -1)} style={styles.countBtn}>
                                                        <Text style={styles.countBtnText}>-</Text>
                                                    </TouchableOpacity>
                                                    <TextInput
                                                        style={styles.countInput}
                                                        value={String(d.SoLuong)}
                                                        editable={!isCompleted}
                                                        keyboardType="number-pad"
                                                        selectTextOnFocus
                                                        onChangeText={(value) => handleDefectQuantityInput(defectKey, value)}
                                                    />
                                                    <TouchableOpacity disabled={isCompleted} onPress={() => handleDefectChange(defectKey, 1)} style={styles.countBtn}>
                                                        <Text style={styles.countBtnText}>+</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            disabled={isCompleted}
                                            onPress={() => toggleLapLai(defectKey)}
                                            style={[styles.repeatToggle, d.IsLapLai && styles.repeatToggleActive]}
                                        >
                                            <View style={[styles.repeatCheckBox, d.IsLapLai && styles.repeatCheckBoxActive]}>
                                                {d.IsLapLai ? <Text style={styles.repeatCheckText}>✓</Text> : null}
                                            </View>
                                            <Text style={[styles.repeatText, d.IsLapLai && styles.repeatTextActive]}>Lỗi lặp lại</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                {!isCompleted && isKCS && (
                    <View style={styles.draftActionRow}>
                        <TouchableOpacity
                            style={[styles.saveBtn, styles.draftBtn]}
                            onPress={() => handleSave(true)}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="#334155" /> : <Text style={styles.draftBtnText}>Lưu nháp</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveBtn, styles.completeBtn]}
                            onPress={handleComplete}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Hoàn tất</Text>}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Kho xác nhận số lượng */}
                {phieu?.TrangThai === "CHO_KHO_XAC_NHAN" && isKhoSXBT && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.saveBtn, { flex: 1, backgroundColor: "#0f766e" }]}
                            onPress={handleConfirmKho}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Kho xác nhận số lượng</Text>}
                        </TouchableOpacity>
                    </View>
                )}

            </ScrollView>

            {/* Defect Selection Modal */}
            <Modal visible={defectModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.modalContent}
                    >
                        <Text style={styles.modalTitle}>Chọn lỗi</Text>

                        <TextInput
                            placeholder="Tìm mã lỗi / tên lỗi..."
                            value={searchText}
                            onChangeText={setSearchText}
                            style={styles.searchInput}
                        />

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {filteredDefects.length === 0 ? (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Ionicons name="search-outline" size={40} color="#cbd5e1" />
                                    <Text style={{ color: "#94a3b8", marginTop: 8 }}>Không tìm thấy mã lỗi phù hợp</Text>
                                </View>
                            ) : (
                                filteredDefects.map((d) => {
                                    const typeColor = d.DefectType === 'CRITICAL' ? '#ef4444' : d.DefectType === 'MAJOR' ? '#f59e0b' : '#3b82f6';
                                    return (
                                        <TouchableOpacity
                                            key={d.Id}
                                            style={styles.defectItem}
                                            onPress={() => addDefect(d)}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                                        <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
                                                            <Text style={styles.typeBadgeText}>{d.DefectType}</Text>
                                                        </View>
                                                        <Text style={styles.defectCode}>{d.MaLoi}</Text>
                                                    </View>
                                                    <Text style={styles.defectName}>{d.TenLoi}</Text>
                                                </View>
                                                <Ionicons name="add-circle-outline" size={24} color="#2563eb" />
                                            </View>

                                            {d.MoTa && (
                                                <Text style={styles.defectDesc}>{d.MoTa}</Text>
                                            )}

                                            {(d.TenSanPham || d.ChungLoai) && (
                                                <Text style={styles.defectDesc}>
                                                    {[d.TenSanPham, d.ChungLoai].filter(Boolean).join(" - ")}
                                                </Text>
                                            )}

                                            {d.ImageUrl && (
                                                <Image
                                                    source={{ uri: getAssetUrl(d.ImageUrl) }}
                                                    style={styles.defectImage}
                                                    resizeMode="cover"
                                                />
                                            )}

                                            {(d.PhamViApDung || d.GhiChu) && (
                                                <View style={styles.noteBox}>
                                                    <Ionicons name="alert-circle-outline" size={14} color="#2563eb" />
                                                    <Text style={styles.noteText}>{d.PhamViApDung || d.GhiChu}</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>

                        <TouchableOpacity style={styles.closeBtn} onPress={() => setDefectModalVisible(false)}>
                            <Text style={styles.saveText}>Đóng</Text>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {SHOW_MANUAL_BTP_LOT_EDITOR && (
                <Modal visible={btpModalVisible} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === "ios" ? "padding" : "height"}
                            style={[styles.modalContent, styles.btpModalContent]}
                        >
                            <Text style={styles.modalTitle}>Cập nhật thông tin BTP</Text>
                            {selectedBtp && (
                                <>
                                    <View style={styles.btpModalHeader}>
                                        <Text style={styles.itemName}>{selectedBtp.TenSanPham}</Text>
                                        <Text style={styles.itemSub}>Đơn vị tính: {selectedBtp.DonViTinh || "---"}</Text>
                                        <Text style={styles.itemSub}>
                                            Kế hoạch sản xuất: {selectedBtp.SourceID_KeHoachSanXuat ? `KH #${selectedBtp.SourceID_KeHoachSanXuat}` : "---"}
                                        </Text>
                                        {selectedBtp.MaDonHang ? (
                                            <Text style={styles.itemSub}>Đơn hàng: {selectedBtp.MaDonHang}</Text>
                                        ) : null}
                                    </View>

                                    <ScrollView
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={styles.btpModalScrollContent}
                                    >
                                        {getBtpLotRows(selectedBtp).map((row, rowIndex) => (
                                            <View key={`manual-lot-${rowIndex}`} style={styles.btpLotEditCard}>
                                                <View style={styles.btpLotEditHeader}>
                                                    <Text style={styles.btpLotReadonlyTitle}>Dòng lot {rowIndex + 1}</Text>
                                                </View>
                                                <Text style={styles.btpLotReadonlyText}>Số lượng nhập: {formatQuantity(row.SoLuongNhap)}</Text>
                                                <Text style={[styles.btpLotReadonlyText, { marginBottom: 8 }]}>Số Lot SX: {row.SoLotSX || "---"}</Text>

                                                {[
                                                    ["DauTuanGS1", "Dấu tuần/GS1", "Nhập dấu tuần/GS1", "default"],
                                                    ["ThuTu", "TT", "Nhập TT", "default"],
                                                    ["LxvtLot", "LXVT/LOT", "Nhập LXVT/LOT", "default"]
                                                ].map(([field, label, placeholder, keyboardType]) => (
                                                    <View key={field} style={styles.formGroup}>
                                                        <Text style={styles.inputLabel}>{label}</Text>
                                                        <TextInput
                                                            style={styles.input}
                                                            placeholder={placeholder}
                                                            keyboardType={keyboardType}
                                                            value={inputValue(row[field])}
                                                            onChangeText={(value) => handleBtpLotChange(rowIndex, field, value)}
                                                        />
                                                    </View>
                                                ))}
                                            </View>
                                        ))}

                                        {SHOW_MANUAL_BTP_LOT_ADD_ROW && (
                                            <TouchableOpacity style={styles.addLotBtn}>
                                                <Text style={styles.addLotBtnText}>+ Thêm dấu tuần/lô</Text>
                                            </TouchableOpacity>
                                        )}
                                    </ScrollView>
                                </>
                            )}

                            <View style={styles.modalActionRow}>
                                <TouchableOpacity style={[styles.closeBtn, { flex: 1, backgroundColor: "#e5e7eb" }]} onPress={() => setBtpModalVisible(false)}>
                                    <Text style={[styles.saveText, { color: "#111827" }]}>Hủy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.closeBtn, { flex: 1, backgroundColor: "#0052cc" }]} onPress={saveBtpItem}>
                                    <Text style={styles.saveText}>Xong</Text>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f3f4f6" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    scroll: { padding: 12 },
    headerCard: { backgroundColor: "#fff", padding: 16, borderRadius: 8, marginBottom: 12 },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    title: { fontSize: 18, fontWeight: "bold", color: "#1f2937" },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    statusText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
    infoGrid: { borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 12 },
    infoItem: { flex: 1 },
    infoLabel: { fontSize: 10, color: "#6b7280", marginBottom: 2 },
    infoValue: { fontSize: 13, fontWeight: "bold", color: "#1f2937" },
    bienBanBadge: { backgroundColor: "#fee2e2", padding: 8, borderRadius: 6, marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
    bienBanBadgeText: { color: "#ef4444", fontWeight: "bold" },
    card: { backgroundColor: "#fff", padding: 16, borderRadius: 8, marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12, color: "#0052cc" },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    label: { fontSize: 14, color: "#4b5563" },
    radioGroup: { flexDirection: "row", gap: 8 },
    radio: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: "#d1d5db" },
    radioActive: { backgroundColor: "#0052cc", borderColor: "#0052cc" },
    radioTextActive: { color: "#fff", fontWeight: "bold" },
    itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
    itemName: { fontSize: 14, fontWeight: "bold", color: "#1f2937", marginBottom: 4 },
    itemSub: { fontSize: 13, color: "#6b7280" },
    btpDetailBox: { marginTop: 8, padding: 8, backgroundColor: "#f8fafc", borderRadius: 6, borderWidth: 1, borderColor: "#f1f5f9" },
    btpDetailText: { fontSize: 12, color: "#475569", marginBottom: 2 },
    btpLotReadonlyRow: { marginTop: 8, padding: 10, backgroundColor: "#fff", borderRadius: 6, borderWidth: 1, borderColor: "#e5e7eb" },
    btpLotReadonlyTitle: { fontSize: 12, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
    btpLotReadonlyText: { fontSize: 12, color: "#475569", marginBottom: 2 },
    btpModalContent: { paddingBottom: Platform.OS === "ios" ? 36 : 24 },
    btpModalScrollContent: { paddingBottom: 12 },
    btpModalHeader: { backgroundColor: "#fff", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 12 },
    btpLotEditCard: { backgroundColor: "#fff", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 12 },
    btpLotEditHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    khoQuantityInput: { marginTop: 8, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 6, padding: 10, fontSize: 13, backgroundColor: "#f8fafc" },
    addLotBtn: { marginTop: 10, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: "#93c5fd", backgroundColor: "#eff6ff", alignItems: "center" },
    addLotBtnText: { color: "#2563eb", fontWeight: "700", fontSize: 13 },
    typeGroup: { flexDirection: "row", gap: 8, marginBottom: 16 },
    typeBtn: { flex: 1, padding: 8, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, alignItems: "center" },
    typeBtnActive: { backgroundColor: "#dbeafe", borderColor: "#3b82f6" },
    typeBtnText: { fontSize: 12, color: "#4b5563" },
    typeBtnTextActive: { color: "#2563eb", fontWeight: "bold" },
    input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, padding: 10, marginBottom: 12 },
    statsBox: { backgroundColor: "#f3f4f6", padding: 12, borderRadius: 6, marginBottom: 12 },
    defectTargetCard: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 14, padding: 12, marginTop: 12, backgroundColor: "#f8fafc" },
    defectTargetHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
    defectTargetTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a", lineHeight: 20 },
    defectTargetMeta: { fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 17 },
    emptyDefectText: { fontSize: 12, color: "#94a3b8", marginTop: 10, fontStyle: "italic" },
    defectLineCard: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" },
    defectLineTop: { flexDirection: "row", alignItems: "center", gap: 10 },
    defectLineInfo: { flex: 1, minWidth: 0 },
    defectRowName: { fontSize: 15, fontWeight: "800", color: "#111827", lineHeight: 20 },
    defectTypePill: { alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    defectTypePillText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
    defectActions: { alignItems: "center" },
    counterLabel: { fontSize: 10, fontWeight: "700", color: "#64748b", marginBottom: 4, textTransform: "uppercase" },
    counter: { flexDirection: "row", alignItems: "center", backgroundColor: "#f1f5f9", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden" },
    countBtn: { width: 36, height: 34, alignItems: "center", justifyContent: "center" },
    countBtnText: { fontSize: 20, fontWeight: "800", color: "#334155" },
    countText: { paddingHorizontal: 8, fontWeight: "bold", minWidth: 24, textAlign: "center" },
    countInput: { paddingHorizontal: 4, paddingVertical: 4, fontWeight: "800", minWidth: 38, textAlign: "center", color: "#0f172a", fontSize: 15 },
    repeatToggle: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", marginTop: 12, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#fff" },
    repeatToggleActive: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
    repeatCheckBox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: "#94a3b8", alignItems: "center", justifyContent: "center", backgroundColor: "#fff", marginRight: 8 },
    repeatCheckBoxActive: { borderColor: "#7c3aed", backgroundColor: "#7c3aed" },
    repeatCheckText: { color: "#fff", fontSize: 14, fontWeight: "900", lineHeight: 16 },
    repeatText: { fontSize: 12, fontWeight: "800", color: "#64748b" },
    repeatTextActive: { color: "#c2410c" },
    saveBtn: { padding: 16, borderRadius: 8, alignItems: "center", marginVertical: 16 },
    saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
    draftActionRow: { flexDirection: "row", gap: 10, marginVertical: 16 },
    draftBtn: { flex: 0.9, backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1" },
    draftBtnText: { color: "#334155", fontWeight: "800", fontSize: 16 },
    completeBtn: { flex: 1.1, backgroundColor: "#0052cc" },
    formGroup: { marginBottom: 2 },
    inputLabel: { fontSize: 13, fontWeight: "600", color: "#334155", marginBottom: 6 },
    actionRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 16 },
    addDefectBtn: { paddingHorizontal: 11, paddingVertical: 7, backgroundColor: "#eff6ff", borderRadius: 999, borderWidth: 1, borderColor: "#bfdbfe" },
    addDefectBtnText: { color: "#1d4ed8", fontWeight: "800", fontSize: 12 },

    // Defect Modal Styles (matched with CheckItemScreen)
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContent: { backgroundColor: "#f8fafc", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "90%", minHeight: "60%" },
    modalTitle: { fontSize: 20, fontWeight: "bold", color: "#0f172a", marginBottom: 15, textAlign: "center" },
    searchInput: { backgroundColor: "#fff", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 15, fontSize: 15 },
    defectItem: { backgroundColor: "#fff", padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    defectCode: { fontWeight: "bold", fontSize: 14, color: "#64748b", marginLeft: 8 },
    defectName: { fontSize: 16, fontWeight: "600", color: "#0f172a", marginTop: 2 },
    defectDesc: { fontSize: 13, color: "#64748b", marginTop: 6, lineHeight: 18 },
    defectImage: { width: "100%", height: 160, borderRadius: 12, marginTop: 10, backgroundColor: "#e2e8f0" },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    typeBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
    noteBox: { flexDirection: "row", alignItems: "center", marginTop: 8, backgroundColor: "#eff6ff", padding: 8, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#2563eb' },
    noteText: { fontSize: 12, color: "#1e40af", fontWeight: "500", marginLeft: 4, flex: 1 },
    closeBtn: { backgroundColor: "#64748b", padding: 14, borderRadius: 14, alignItems: "center", marginTop: 15 },
    modalActionRow: { flexDirection: "row", gap: 12, marginBottom: Platform.OS === "ios" ? 10 : 4 },
    saveText: { color: "#fff", fontWeight: "bold", fontSize: 16 }
});
