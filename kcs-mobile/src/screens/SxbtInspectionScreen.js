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
import { Checkbox } from "react-native-paper";
import {
    getPhieuKiemDetail,
    getBtpItems,
    getAssetUrl,
    getDefectList,
    saveSxbtData,
    completeSxbt,
    confirmPX,
    confirmKN
} from "../api/phieuKiem.api";
import { getUser } from "../utils/auth";

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
    const [searchText, setSearchText] = useState("");

    // 2. Derived Variables
    const hasPermission = (p) => user?.permissions?.includes(p);
    const isKCS = hasPermission("THUC_HIEN_KIEM") || user?.Role === "KCS";
    const isPX = hasPermission("XAC_NHAN_PX");
    const isKN = hasPermission("XAC_NHAN_KIEM_NGHIEM");

    const isCompleted = phieu?.TrangThai === "CHO_KIEM_NGHIEM" ||
        phieu?.TrangThai === "CHO_XUONG_XAC_NHAN" ||
        phieu?.TrangThai === "HOAN_THANH" ||
        phieu?.TrangThai === "HOAN_TAT";

    console.log("Status check:", { isCompleted, isKCS, status: phieu?.TrangThai });

    const getStatusColor = (status) => {
        switch (status) {
            case "CHUA_KIEM": return "#94a3b8";
            case "HOAN_THANH": return "#10b981";
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

    const createEmptyBtpLotRow = (btpItemId, sortOrder = 1) => ({
        BtpItemId: btpItemId,
        DauTuanGS1: "",
        ThuTu: "",
        LxvtLot: "",
        SoLotSX: "",
        SoLuongNhap: "",
        SortOrder: sortOrder
    });

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
            SortOrder: row.SortOrder || index + 1
        }));
    };

    const normalizeBtpItem = (item = {}) => ({
        ...item,
        LotRows: normalizeBtpLotRows(item)
    });

    const getBtpLotRows = (item = {}) => normalizeBtpLotRows(item);

    const getBtpTotalInputQuantity = (item = {}) =>
        getBtpLotRows(item).reduce((sum, row) => sum + (Number(row.SoLuongNhap) || 0), 0);

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
            setBtpItems((data.btpItems || []).map(normalizeBtpItem));

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
            const masterDefects = (defectRes.data || []).filter(
                item => String(item?.PhanHe || "").trim().toUpperCase() === "SXBT"
            );
            setMasterDefectList(masterDefects);

            const savedDefects = data.defects || [];
            const activeFormattedDefects = savedDefects.map(s => {
                const master = masterDefects.find(m => m.Id === s.DefectId);
                return {
                    DefectId: s.DefectId,
                    TenLoi: master ? master.TenLoi : s.TenLoi,
                    DefectType: master ? master.DefectType : s.DefectType,
                    SoLuong: s.SoLuong,
                    IsLapLai: s.IsLapLai
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

    // Handle BTP Modal
    const handleBtpLotChange = (index, field, value) => {
        setSelectedBtp(prev => {
            const rows = getBtpLotRows(prev);
            const nextRows = rows.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [field]: value } : row
            );
            return { ...prev, LotRows: nextRows };
        });
    };

    const addBtpLotRow = () => {
        setSelectedBtp(prev => {
            const rows = getBtpLotRows(prev);
            return {
                ...prev,
                LotRows: [...rows, createEmptyBtpLotRow(prev?.Id, rows.length + 1)]
            };
        });
    };

    const removeBtpLotRow = (index) => {
        setSelectedBtp(prev => {
            const rows = getBtpLotRows(prev)
                .filter((_, rowIndex) => rowIndex !== index)
                .map((row, rowIndex) => ({ ...row, SortOrder: rowIndex + 1 }));
            return { ...prev, LotRows: rows };
        });
    };

    const inputValue = (value) => value === undefined || value === null ? "" : String(value);

    const saveBtpItem = () => {
        const cleanBtp = { ...(selectedBtp || {}) };
        const lotRows = getBtpLotRows(cleanBtp)
            .filter(isFilledBtpLotRow)
            .map((row, index) => ({
                ...row,
                BtpItemId: cleanBtp.Id,
                SoLuongNhap: row.SoLuongNhap === "" || row.SoLuongNhap === undefined || row.SoLuongNhap === null
                    ? null
                    : Number(String(row.SoLuongNhap).replace(",", ".")) || 0,
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

    // Handle Defect
    const handleDefectChange = (defectId, delta) => {
        setDefectList(prev => prev.map(d => {
            if (d.DefectId === defectId) {
                const newQuantity = Math.max(0, d.SoLuong + delta);
                return { ...d, SoLuong: newQuantity };
            }
            return d;
        }));
    };

    const handleDefectQuantityInput = (defectId, value) => {
        const normalizedValue = value.replace(/[^0-9]/g, "");
        setDefectList(prev => prev.map(d =>
            d.DefectId === defectId
                ? { ...d, SoLuong: normalizedValue === "" ? 0 : Number(normalizedValue) }
                : d
        ));
    };

    const toggleLapLai = (defectId) => {
        setDefectList(prev => prev.map(d => d.DefectId === defectId ? { ...d, IsLapLai: !d.IsLapLai } : d));
    };

    const addDefect = (masterDefect) => {
        const exists = defectList.find(d => d.DefectId === masterDefect.Id);
        if (exists) {
            handleDefectChange(masterDefect.Id, 1);
        } else {
            setDefectList(prev => [...prev, {
                DefectId: masterDefect.Id,
                TenLoi: masterDefect.TenLoi,
                DefectType: masterDefect.DefectType,
                SoLuong: 1,
                IsLapLai: false
            }]);
        }
        setDefectModalVisible(false);
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

    // Các hàm xác nhận
    const handleConfirmPX = async () => {
        try {
            setSaving(true);
            await confirmPX(id);
            Alert.alert("Thành công", "Kho đã xác nhận");
            navigation.goBack();
        } catch {
            Alert.alert("Lỗi", "Không thể xác nhận");
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmKN = async () => {
        try {
            setSaving(true);
            await confirmKN(id);
            Alert.alert("Thành công", "Đã xác nhận kiểm nghiệm");
            navigation.goBack();
        } catch {
            Alert.alert("Lỗi", "Không thể xác nhận");
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
                btpItems: btpItems,
                summary: {
                    LoaiMau: loaiMau,
                    SoLuongMau: totalSamples,
                    TyLe: tyLe,
                    TyLeDat: tyLeDat,
                    TyLeLoiNghiemTrong: tyLeCritical,
                    TyLeLoiNangNhe: tyLeMajorMinor
                },
                defects: activeDefects,
                ketLuan: ketLuan
            };

            await saveSxbtData(payload);
            if (showSuccessAlert) {
                Alert.alert("Thành công", "Đã lưu kết quả kiểm tra.");
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
                                btpItems,
                                summary: {
                                    LoaiMau: loaiMau,
                                    SoLuongMau: totalSamples,
                                    TyLe: tyLe,
                                    TyLeDat: tyLeDat,
                                    TyLeLoiNghiemTrong: tyLeCritical,
                                    TyLeLoiNangNhe: tyLeMajorMinor
                                },
                                defects: activeDefects
                                // Không gửi ketLuan ở đây – SP Save không đổi TrangThai
                            };
                            await saveSxbtData(payload);

                            // Bước 2: Hoàn tất – gửi kết luận để SP Complete đổi TrangThai
                            await completeSxbt(id, ketLuan);

                            Alert.alert("Đã hoàn tất", "Chờ TPB8 xác nhận");
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
                        const previewRows = lotRows.slice(0, 2);

                        return (
                            <TouchableOpacity
                                key={item.Id}
                                style={styles.itemRow}
                                disabled={isCompleted}
                                onPress={() => { setSelectedBtp(normalizeBtpItem(item)); setBtpModalVisible(true); }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName}>{item.TenSanPham}</Text>
                                    <Text style={styles.itemSub}>SL phiếu: {item.SoLuong} {item.DonViTinh}</Text>
                                    <View style={styles.btpDetailBox}>
                                        {lotRows.length > 0 ? (
                                            <>
                                                <Text style={styles.btpDetailText}>
                                                    • Đã nhập <Text style={{ fontWeight: 'bold' }}>{lotRows.length}</Text> dòng lot
                                                    {totalInputQuantity > 0 ? <Text> - Tổng SL: <Text style={{ fontWeight: 'bold' }}>{totalInputQuantity}</Text></Text> : null}
                                                </Text>
                                                {previewRows.map((row, rowIndex) => (
                                                    <Text key={`${item.Id}-lot-${rowIndex}`} style={styles.btpDetailText}>
                                                        • {row.DauTuanGS1 || "Chưa có dấu tuần"} / {row.SoLotSX || "Chưa có lot"}
                                                        {row.SoLuongNhap !== "" && row.SoLuongNhap !== null && row.SoLuongNhap !== undefined ? ` - SL ${row.SoLuongNhap}` : ""}
                                                    </Text>
                                                ))}
                                                {lotRows.length > previewRows.length && (
                                                    <Text style={[styles.btpDetailText, { color: '#64748b' }]}>• Còn {lotRows.length - previewRows.length} dòng khác</Text>
                                                )}
                                            </>
                                        ) : (
                                            <Text style={[styles.btpDetailText, { color: '#9ca3af', fontStyle: 'italic' }]}>Chưa nhập thông tin chi tiết</Text>
                                        )}
                                    </View>
                                </View>
                                {!isCompleted && <MaterialCommunityIcons name="pencil" size={20} color="#0052cc" style={{ alignSelf: 'flex-start', marginTop: 4 }} />}
                            </TouchableOpacity>
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
                    <View style={styles.row}>
                        <Text style={styles.sectionTitle}>IV. Ghi nhận lỗi</Text>
                        {!isCompleted && (
                            <TouchableOpacity onPress={() => setDefectModalVisible(true)} style={styles.addDefectBtn}>
                                <Text style={styles.addDefectBtnText}>+ Thêm lỗi</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {defectList.map(d => (
                        <View key={d.DefectId} style={styles.defectRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.defectName}>{d.TenLoi}</Text>
                                <Text style={styles.defectType}>{d.DefectType}</Text>
                            </View>

                            <View style={styles.counter}>
                                <TouchableOpacity disabled={isCompleted} onPress={() => handleDefectChange(d.DefectId, -1)} style={styles.countBtn}>
                                    <Text style={styles.countBtnText}>-</Text>
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.countInput}
                                    value={String(d.SoLuong)}
                                    editable={!isCompleted}
                                    keyboardType="number-pad"
                                    selectTextOnFocus
                                    onChangeText={(value) => handleDefectQuantityInput(d.DefectId, value)}
                                />
                                <TouchableOpacity disabled={isCompleted} onPress={() => handleDefectChange(d.DefectId, 1)} style={styles.countBtn}>
                                    <Text style={styles.countBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.lapLaiBox}>
                                <Text style={styles.lapLaiText}>Lặp lại</Text>
                                <Checkbox
                                    status={d.IsLapLai ? 'checked' : 'unchecked'}
                                    disabled={isCompleted}
                                    onPress={() => toggleLapLai(d.DefectId)}
                                />
                            </View>
                        </View>
                    ))}
                </View>

                {!isCompleted && isKCS && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.saveBtn, { flex: 1, backgroundColor: "#0052cc" }]}
                            onPress={handleComplete}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Hoàn Tất</Text>}
                        </TouchableOpacity>
                    </View>
                )}

                {/* PX xác nhận */}
                {phieu?.TrangThai === "CHO_XUONG_XAC_NHAN" && isPX && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.saveBtn, { flex: 1, backgroundColor: "#2563eb" }]}
                            onPress={handleConfirmPX}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Kho xác nhận</Text>}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Kiểm nghiệm xác nhận */}
                {phieu?.TrangThai === "CHO_KIEM_NGHIEM" && isKN && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.saveBtn, { flex: 1, backgroundColor: "#7c3aed" }]}
                            onPress={handleConfirmKN}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Xác nhận kiểm nghiệm</Text>}
                        </TouchableOpacity>
                    </View>
                )}

            </ScrollView>

            {/* BTP Input Modal */}
            <Modal visible={btpModalVisible} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalBg}
                >
                    <View style={styles.btpModalContent}>
                        <Text style={styles.btpModalTitle}>Cập nhật thông tin BTP</Text>

                        <View style={styles.btpInfoBox}>
                            <Text style={styles.btpInfoName}>{selectedBtp?.TenSanPham || "BTP"}</Text>
                            {!!selectedBtp?.DonViTinh && (
                                <Text style={styles.btpInfoMeta}>Đơn vị tính: {selectedBtp.DonViTinh}</Text>
                            )}
                        </View>

                        <ScrollView
                            style={styles.btpModalScroll}
                            contentContainerStyle={styles.btpModalScrollContent}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="none"
                            showsVerticalScrollIndicator
                        >
                            {getBtpLotRows(selectedBtp).length === 0 && (
                                <View style={styles.emptyLotBox}>
                                    <Text style={styles.emptyLotText}>Chưa có dòng dấu tuần/lot</Text>
                                </View>
                            )}

                            {getBtpLotRows(selectedBtp).map((row, rowIndex) => (
                                <View key={`btp-lot-${rowIndex}`} style={styles.lotCard}>
                                    <View style={styles.lotHeader}>
                                        <Text style={styles.lotTitle}>Dòng lot {rowIndex + 1}</Text>
                                        <TouchableOpacity onPress={() => removeBtpLotRow(rowIndex)} style={styles.removeLotBtn}>
                                            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.inputLabel}>Số lượng</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Nhập số lượng"
                                            value={inputValue(row.SoLuongNhap)}
                                            onChangeText={(t) => handleBtpLotChange(rowIndex, 'SoLuongNhap', t)}
                                            keyboardType="decimal-pad"
                                        />
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.inputLabel}>Dấu tuần/GS1</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Nhập dấu tuần/GS1"
                                            value={inputValue(row.DauTuanGS1)}
                                            onChangeText={(t) => handleBtpLotChange(rowIndex, 'DauTuanGS1', t)}
                                        />
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.inputLabel}>TT</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Nhập TT"
                                            value={inputValue(row.ThuTu)}
                                            onChangeText={(t) => handleBtpLotChange(rowIndex, 'ThuTu', t)}
                                        />
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.inputLabel}>LXVT/LOT</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Nhập LXVT/LOT"
                                            value={inputValue(row.LxvtLot)}
                                            onChangeText={(t) => handleBtpLotChange(rowIndex, 'LxvtLot', t)}
                                        />
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.inputLabel}>Số Lot SX</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Nhập số Lot SX"
                                            value={inputValue(row.SoLotSX)}
                                            onChangeText={(t) => handleBtpLotChange(rowIndex, 'SoLotSX', t)}
                                        />
                                    </View>
                                </View>
                            ))}

                            <TouchableOpacity style={styles.addLotBtn} onPress={addBtpLotRow}>
                                <MaterialCommunityIcons name="plus" size={18} color="#0052cc" />
                                <Text style={styles.addLotText}>Thêm dấu tuần/lot</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setBtpModalVisible(false)}>
                                <Text>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalBtnSave} onPress={saveBtpItem}>
                                <Text style={{ color: '#fff' }}>Xong</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

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
    typeGroup: { flexDirection: "row", gap: 8, marginBottom: 16 },
    typeBtn: { flex: 1, padding: 8, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, alignItems: "center" },
    typeBtnActive: { backgroundColor: "#dbeafe", borderColor: "#3b82f6" },
    typeBtnText: { fontSize: 12, color: "#4b5563" },
    typeBtnTextActive: { color: "#2563eb", fontWeight: "bold" },
    input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, padding: 10, marginBottom: 12 },
    statsBox: { backgroundColor: "#f3f4f6", padding: 12, borderRadius: 6, marginBottom: 12 },
    defectRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
    defectName: { fontWeight: "bold", fontSize: 14 },
    defectType: { fontSize: 12, color: "#ef4444" },
    counter: { flexDirection: "row", alignItems: "center", backgroundColor: "#f3f4f6", borderRadius: 6, marginHorizontal: 8 },
    countBtn: { padding: 8, width: 36, alignItems: "center" },
    countBtnText: { fontSize: 18, fontWeight: "bold", color: "#4b5563" },
    countText: { paddingHorizontal: 8, fontWeight: "bold", minWidth: 24, textAlign: "center" },
    countInput: { paddingHorizontal: 8, paddingVertical: 6, fontWeight: "bold", minWidth: 42, textAlign: "center", color: "#0f172a" },
    lapLaiBox: { alignItems: "center" },
    lapLaiText: { fontSize: 10, color: "#6b7280" },
    saveBtn: { backgroundColor: "#10b981", padding: 16, borderRadius: 8, alignItems: "center", marginVertical: 16 },
    saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
    modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", paddingHorizontal: 12, paddingTop: 24 },
    modalContent: { backgroundColor: "#fff", padding: 20, borderRadius: 8 },
    modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
    btpModalContent: { backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, width: "100%", maxHeight: "88%" },
    btpModalTitle: { fontSize: 18, fontWeight: "bold", color: "#0f172a", marginBottom: 12 },
    btpInfoBox: { backgroundColor: "#f8fafc", borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "#e2e8f0" },
    btpInfoName: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
    btpInfoMeta: { fontSize: 12, color: "#64748b", marginTop: 4 },
    btpModalScroll: { flexGrow: 0 },
    btpModalScrollContent: { paddingBottom: 8 },
    formGroup: { marginBottom: 2 },
    inputLabel: { fontSize: 13, fontWeight: "600", color: "#334155", marginBottom: 6 },
    emptyLotBox: { padding: 14, borderRadius: 10, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 12 },
    emptyLotText: { color: "#94a3b8", fontStyle: "italic", textAlign: "center" },
    lotCard: { padding: 12, borderRadius: 12, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 12 },
    lotHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    lotTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
    removeLotBtn: { padding: 6 },
    addLotBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#bfdbfe", backgroundColor: "#eff6ff" },
    addLotText: { color: "#0052cc", fontWeight: "700" },
    modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 16 },
    modalBtnCancel: { padding: 12 },
    modalBtnSave: { backgroundColor: "#0052cc", padding: 12, borderRadius: 6 },
    actionRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 16 },
    addDefectBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#e0e7ff", borderRadius: 6 },
    addDefectBtnText: { color: "#4f46e5", fontWeight: "bold", fontSize: 13 },

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
    saveText: { color: "#fff", fontWeight: "bold", fontSize: 16 }
});
