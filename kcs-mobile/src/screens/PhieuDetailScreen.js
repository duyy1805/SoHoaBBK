// src/screens/PhieuDetailScreen.jsx

import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TextInput,
    Modal,
    Platform,
    KeyboardAvoidingView
} from "react-native";
import KeyboardFormScrollView from "../components/KeyboardFormScrollView";

import {
    getPhieuKiemDetail,
    calculateAQL,
    completePhieuKiem,
    confirmPX,
    updateLot,
    getThongSoKq,
    deletePhieuKiem,
    saveCustomFields,
    updatePhieuKiemActualQuantity
} from "../api/phieuKiem.api";
import DateTimePicker from "@react-native-community/datetimepicker";

import AsyncStorage from "@react-native-async-storage/async-storage";
import SectionConfigModal from "../components/SectionConfigModal";

const KIEM_DONG_CONT_LOAI_KIEM_ID = 5;
const DAU_VAO_LOAI_KIEM_ID = 1;
const KIEM_DONG_CONT_DEFAULT_THAM_CHIEU = "PDOC, TCKT, TCBG";

export default function PhieuDetailScreen({ route, navigation }) {

    const { id } = route.params;

    const [phieu, setPhieu] = useState(null);
    const [lot, setLot] = useState("");
    const [lotConfirmed, setLotConfirmed] = useState(false);
    const [sections, setSections] = useState([]);
    const [checkItems, setCheckItems] = useState([]);
    const [dynamicFields, setDynamicFields] = useState([]);
    const [permissions, setPermissions] = useState([]);

    const [loadingAQL, setLoadingAQL] = useState(null);
    const [loadingAction, setLoadingAction] = useState(false);
    const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);

    const [trangThai, setTrangThai] = useState(null);
    const [hasThongSo, setHasThongSo] = useState(false);
    const [thongSoList, setThongSoList] = useState([]);
    const [thongSoKqList, setThongSoKqList] = useState([]);
    const [hieuLucTest, setHieuLucTest] = useState(new Date());
    const [hieuLucTestDraft, setHieuLucTestDraft] = useState(new Date());
    const [showHieuLucTestPicker, setShowHieuLucTestPicker] = useState(false);
    const [soDonHang, setSoDonHang] = useState("");
    const [phienBan, setPhienBan] = useState("");
    const [thamChieuTieuChuan, setThamChieuTieuChuan] = useState("");
    const [actualQuantity, setActualQuantity] = useState("");

    const parseStoredDate = (value) => {
        if (!value) return new Date();
        const raw = String(value).trim();
        if (!raw) return new Date();

        const ddmmyyyy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (ddmmyyyy) {
            const [, dd, mm, yyyy] = ddmmyyyy;
            return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        }

        const parsed = new Date(raw);
        return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    useFocusEffect(
        useCallback(() => {
            loadUser();
            loadData();
        }, [])
    );

    const loadUser = async () => {
        const userStr = await AsyncStorage.getItem("user");
        if (!userStr) return;

        const user = JSON.parse(userStr);
        setPermissions(user.permissions || []);
    };

    const loadData = async () => {
        const res = await getPhieuKiemDetail(id);
        const phieuData = res.data.phieu;

        if (Number(phieuData?.LoaiKiemId) === 3) {
            navigation.replace("CuoiChuyenInspection", { id });
            return;
        }
        if (Number(phieuData?.LoaiKiemId) === 4) {
            navigation.replace("SxbtInspection", { id });
            return;
        }
        if (Number(phieuData?.LoaiKiemId) === 6) {
            navigation.replace("TrenChuyenInspection", { id });
            return;
        }

        setPhieu(phieuData);
        setActualQuantity(phieuData?.SoLuongThucTe == null ? "" : String(phieuData.SoLuongThucTe));
        setSections(Array.isArray(res.data.sections) ? res.data.sections : []);
        setCheckItems(Array.isArray(res.data.checkItems) ? res.data.checkItems : []);
        setDynamicFields(res.data.dynamicFields || []);
        setTrangThai(phieuData?.TrangThai);
        const parsedHieuLucTest = parseStoredDate((res.data.dynamicFields || []).find((field) => field?.FieldName === "HieuLucTest")?.FieldValue);
        setHieuLucTest(parsedHieuLucTest);
        setHieuLucTestDraft(parsedHieuLucTest);
        setSoDonHang((res.data.dynamicFields || []).find((field) => field?.FieldName === "SoDonHang")?.FieldValue || "");
        setPhienBan((res.data.dynamicFields || []).find((field) => field?.FieldName === "PhienBan")?.FieldValue || phieuData?.PhienBan || "");
        const savedThamChieuTieuChuan = (res.data.dynamicFields || []).find((field) => field?.FieldName === "ThamChieuTieuChuan")?.FieldValue;
        const defaultThamChieuTieuChuan = Number(phieuData?.LoaiKiemId) === KIEM_DONG_CONT_LOAI_KIEM_ID
            ? KIEM_DONG_CONT_DEFAULT_THAM_CHIEU
            : "";
        setThamChieuTieuChuan(savedThamChieuTieuChuan || phieuData?.ThamChieuTieuChuan || defaultThamChieuTieuChuan);
        const lot = phieuData?.Lot;
        setLot(lot);
        setLotConfirmed(!!lot);
        console.log(phieuData?.LoaiKiemId);
        try {
            const thongSoRes = await getThongSoKq(id);
            const tsList = thongSoRes.data?.thongSo || [];
            const kqList = thongSoRes.data?.ketQua || [];
            setThongSoList(tsList);
            setThongSoKqList(kqList);
            if (tsList.length > 0) {
                setHasThongSo(true);
            }
        } catch (e) {
            console.log("Không tải được thông số kiểm đặc biệt", e?.message);
        }
    };

    const hasPermission = (p) => permissions.includes(p);

    const isKCS = hasPermission("THUC_HIEN_KIEM");
    const isPX = hasPermission("XAC_NHAN_PX");
    const isLeader = hasPermission("PHAN_BO_KIEM");
    const canConfig = isKCS || isLeader;
    const canDeletePhieu = sections.length === 0 && trangThai === "TAO_MOI" && canConfig;

    const isAllConfirmed =
        sections.length > 0 &&
        sections.every(s => s.KetLuan);

    const hasReject = sections.some(s => s.KetLuan === "REJECT");

    // Kiểm tra xem kết quả kiểm đặc biệt có mẫu nào không đạt không
    const hasSpecialReject = thongSoKqList.some(kq => {
        const ts = thongSoList.find(t => t.Id === kq.ThongSoId);
        if (!ts || kq.GiaTriDo === null || kq.GiaTriDo === undefined) return false;
        const num = Number(kq.GiaTriDo);
        const chuan = Number(ts.GiaTriChuan);
        if (isNaN(num) || isNaN(chuan)) return false;
        const min = chuan - Number(ts.DungSaiAm);
        const max = chuan + Number(ts.DungSaiDuong);
        return num < min || num > max;
    });

    const finalResult = (hasReject || hasSpecialReject) ? "KHONG_DAT" : "DAT";
    const hasSavedSpecialResults = thongSoKqList.some(
        (kq) => kq?.GiaTriDo !== null && kq?.GiaTriDo !== undefined && String(kq.GiaTriDo).trim() !== ""
    );

    const isCompleted = trangThai === "HOAN_TAT";

    const renderStatus = (status) => {
        switch (status) {
            case "TAO_MOI": return "Tạo mới";
            case "DA_TAO_SECTION": return "Chưa kiểm";
            case "DANG_KIEM": return "Đang kiểm";
            case "CHO_XUONG_XAC_NHAN": return "Chờ Trưởng bộ phận";
            case "CHO_KHO_XAC_NHAN": return "Chờ Kho xác nhận";
            case "CHO_KIEM_NGHIEM": return "Chờ Trưởng bộ phận";
            case "HOAN_TAT": return "Hoàn tất";
            default: return status;
        }
    };

    const renderResult = (result) => {
        if (result === "DAT") return "Đạt";
        if (result === "KHONG_DAT") return "Không đạt";
        if (result === "NA") return "N/A";
        return "Chưa kết luận";
    };

    const handleConfirmLot = async () => {

        if (!lot.trim()) {
            Alert.alert("Thiếu thông tin", "Vui lòng nhập số lot");
            return;
        }
        try {

            await updateLot({
                phieuKiemId: id,
                lot
            });
            setLotConfirmed(true)
            Alert.alert("Thành công", "Đã xác nhận số lot");
            loadData();
        } catch (err) {

            Alert.alert(
                "Lỗi",
                err?.response?.data?.message || "Không thể lưu số lot"
            );
        }
    };
    const handleCalculateAQL = async (sectionId) => {

        try {

            setLoadingAQL(sectionId);

            await calculateAQL(sectionId);

            Alert.alert("Thành công", "Đã tính AQL");

            await loadData();

        } catch {

            Alert.alert("Lỗi", "Không thể tính AQL");

        } finally {

            setLoadingAQL(null);

        }

    };

    const handleComplete = async () => {
        if (hasThongSo && !hasSavedSpecialResults) {
            Alert.alert(
                "Chưa lưu kiểm đặc biệt",
                "Phiếu có kiểm tra cấp độ đặc biệt nhưng chưa lưu kết quả. Vui lòng lưu kết quả kiểm đặc biệt trước khi hoàn tất phiếu."
            );
            return;
        }

        try {

            setLoadingAction(true);

            await completePhieuKiem(id);

            Alert.alert("Thành công", "Phiếu đã hoàn tất");

            navigation.goBack();

        } catch {

            Alert.alert("Lỗi", "Không thể hoàn tất phiếu");

        } finally {

            setLoadingAction(false);

        }

    };

    const handleConfirmPX = async () => {

        try {

            setLoadingAction(true);

            await confirmPX(id);

            Alert.alert("Thành công", "Trưởng bộ phận đã xác nhận");

            navigation.goBack();

        } catch {

            Alert.alert("Lỗi", "Không thể xác nhận trưởng bộ phận");

        } finally {

            setLoadingAction(false);

        }

    };

    const handleDeletePhieu = () => {
        Alert.alert(
            "Xóa phiếu kiểm",
            "Phiếu sẽ bị xóa cứng và không thể khôi phục. Bạn chắc chắn muốn xóa?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoadingAction(true);
                            await deletePhieuKiem(id);
                            Alert.alert("Thành công", "Đã xoá phiếu kiểm");
                            navigation.goBack();
                        } catch (err) {
                            Alert.alert(
                                "Lỗi",
                                err?.response?.data?.message || "Không thể xoá phiếu kiểm"
                            );
                        } finally {
                            setLoadingAction(false);
                        }
                    }
                }
            ]
        );
    };

    const saveHieuLucTest = async (selectedDate) => {
        const yyyy = selectedDate.getFullYear();
        const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const dd = String(selectedDate.getDate()).padStart(2, "0");
        const normalizedValue = `${yyyy}-${mm}-${dd}`;

        try {
            setLoadingAction(true);
            await saveCustomFields({
                phieuKiemId: Number(id),
                fields: { HieuLucTest: normalizedValue }
            });
            setDynamicFields((prev) => {
                const next = Array.isArray(prev) ? [...prev] : [];
                const idx = next.findIndex((field) => field?.FieldName === "HieuLucTest");
                if (idx >= 0) next[idx] = { ...next[idx], FieldValue: normalizedValue };
                else next.push({ FieldName: "HieuLucTest", FieldValue: normalizedValue });
                return next;
            });
        } catch (err) {
            Alert.alert("Lỗi", err?.response?.data?.message || "Không thể lưu hiệu lực test");
        } finally {
            setLoadingAction(false);
        }
    };

    const saveSoDonHang = async (value) => {
        try {
            setLoadingAction(true);
            await saveCustomFields({
                phieuKiemId: Number(id),
                fields: { SoDonHang: value || "" }
            });
            setDynamicFields((prev) => {
                const next = Array.isArray(prev) ? [...prev] : [];
                const idx = next.findIndex((field) => field?.FieldName === "SoDonHang");
                if (idx >= 0) next[idx] = { ...next[idx], FieldValue: value || "" };
                else next.push({ FieldName: "SoDonHang", FieldValue: value || "" });
                return next;
            });
        } catch (err) {
            Alert.alert("Lỗi", err?.response?.data?.message || "Không thể lưu số đơn hàng");
        } finally {
            setLoadingAction(false);
        }
    };

    const saveSingleCustomField = async (fieldName, value, errorMessage) => {
        try {
            setLoadingAction(true);
            await saveCustomFields({
                phieuKiemId: Number(id),
                fields: { [fieldName]: value || "" }
            });
            setDynamicFields((prev) => {
                const next = Array.isArray(prev) ? [...prev] : [];
                const idx = next.findIndex((field) => field?.FieldName === fieldName);
                if (idx >= 0) next[idx] = { ...next[idx], FieldValue: value || "" };
                else next.push({ FieldName: fieldName, FieldValue: value || "" });
                return next;
            });
        } catch (err) {
            Alert.alert("Lỗi", err?.response?.data?.message || errorMessage);
        } finally {
            setLoadingAction(false);
        }
    };

    const saveActualQuantity = async () => {
        try {
            setLoadingAction(true);
            const response = await updatePhieuKiemActualQuantity(
                id,
                actualQuantity === "" ? null : Number(actualQuantity)
            );
            setPhieu((current) => ({ ...current, ...(response.data || {}) }));
            Alert.alert("Đã lưu", "Đã cập nhật số lượng thực tế.");
        } catch (error) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không cập nhật được số lượng thực tế.");
        } finally {
            setLoadingAction(false);
        }
    };

    return (

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>

            {isCompleted && (
                <View style={styles.completedBanner}>
                    <Text style={styles.completedText}>
                        Phiếu đã hoàn tất
                    </Text>
                </View>
            )}

            <KeyboardFormScrollView
                style={styles.container}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 32 }}
            >

                <View style={styles.infoCard}>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Số phiếu</Text>
                            <Text style={styles.infoValue}>{phieu?.SoPhieu}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Mã CT Nhập</Text>
                            <Text style={[styles.infoValue, { color: '#2563eb', fontWeight: 'bold' }]}>{phieu?.ID_ChungTuNhap || "---"}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Sản phẩm</Text>
                            <Text style={styles.infoValue}>{phieu?.TenSanPham}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Mã hàng</Text>
                            <Text style={styles.infoValue}>{phieu?.MaSanPham}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Trạng thái</Text>
                            <Text style={styles.infoValue}>{renderStatus(phieu?.TrangThai)}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Kết luận</Text>
                            <Text style={[
                                styles.infoValue,
                                phieu?.KetLuan === "DAT" && styles.success,
                                phieu?.KetLuan === "KHONG_DAT" && styles.error
                            ]}>
                                {renderResult(phieu?.KetLuan)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Số lượng kế hoạch</Text>
                            <Text style={styles.infoValue}>{phieu?.SoLuong}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Ngày giao</Text>
                            <Text style={styles.infoValue}>{phieu?.Ngay_Giao ? new Date(phieu.Ngay_Giao).toLocaleDateString('vi-VN') : "---"}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Số lượng thực tế</Text>
                            {isKCS && !isCompleted ? (
                                <View>
                                    <TextInput
                                        style={styles.inlineInput}
                                        value={actualQuantity}
                                        keyboardType="numeric"
                                        placeholder="Chưa nhập"
                                        placeholderTextColor="#64748b"
                                        onChangeText={(value) => setActualQuantity(value.replace(/\D/g, ""))}
                                    />
                                    <TouchableOpacity style={styles.inlineSaveButton} disabled={loadingAction} onPress={saveActualQuantity}>
                                        <Text style={styles.inlineSaveText}>Lưu thực tế</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : <Text style={styles.infoValue}>{phieu?.SoLuongThucTe ?? "Chưa nhập"}</Text>}
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Hiệu lực / chênh lệch</Text>
                            <Text style={styles.infoValue}>
                                {phieu?.SoLuongHieuLuc ?? phieu?.SoLuong ?? 0} / {phieu?.ChenhLechSoLuong ?? "Chưa nhập"}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Người kiểm</Text>
                            <Text style={styles.infoValue}>{phieu?.TenNguoiKiem || "---"}</Text>
                        </View>
                        {phieu?.LoaiKiemId === 6 &&
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Nơi đến</Text>
                                <Text style={styles.infoValue}>{phieu?.DoiTuong || "---"}</Text>
                            </View>
                        }
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Khách hàng</Text>
                            <Text style={styles.infoValue}>{phieu?.KhachHang || "---"}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Số đơn hàng</Text>
                            <TextInput
                                style={styles.inlineInput}
                                placeholder="Nhập số đơn hàng"
                                value={soDonHang}
                                onChangeText={setSoDonHang}
                                onEndEditing={() => saveSoDonHang(soDonHang.trim())}
                                editable={!loadingAction}
                            />
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItemFull}>
                            <Text style={styles.infoLabel}>Phiên bản</Text>
                            <TextInput
                                style={styles.inlineInput}
                                placeholder="Nhập phiên bản"
                                value={phienBan}
                                onChangeText={setPhienBan}
                                onEndEditing={() => saveSingleCustomField("PhienBan", phienBan.trim(), "Không thể lưu phiên bản")}
                                editable={!loadingAction}
                            />
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItemFull}>
                            <Text style={styles.infoLabel}>Tham chiếu tiêu chuẩn</Text>
                            <TextInput
                                style={styles.inlineInput}
                                placeholder="Nhập tham chiếu tiêu chuẩn"
                                value={thamChieuTieuChuan}
                                onChangeText={setThamChieuTieuChuan}
                                onEndEditing={() => saveSingleCustomField("ThamChieuTieuChuan", thamChieuTieuChuan.trim(), "Không thể lưu tham chiếu tiêu chuẩn")}
                                editable={!loadingAction}
                            />
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Hiệu lực test</Text>
                            <TouchableOpacity
                                style={styles.dateBox}
                                onPress={() => {
                                    setHieuLucTestDraft(hieuLucTest);
                                    setShowHieuLucTestPicker(true);
                                }}
                                disabled={loadingAction}
                            >
                                <Text style={styles.infoValue}>{hieuLucTest.toLocaleDateString("vi-VN")}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {showHieuLucTestPicker && Platform.OS !== "ios" && (
                        <DateTimePicker
                            value={hieuLucTest}
                            mode="date"
                            display="default"
                            onChange={async (event, selectedDate) => {
                                setShowHieuLucTestPicker(false);
                                if (!selectedDate) return;
                                setHieuLucTest(selectedDate);
                                await saveHieuLucTest(selectedDate);
                            }}
                        />
                    )}

                    {Platform.OS === "ios" && (
                        <Modal
                            visible={showHieuLucTestPicker}
                            transparent
                            animationType="slide"
                            onRequestClose={() => setShowHieuLucTestPicker(false)}
                        >
                            <View style={styles.dateModalOverlay}>
                                <TouchableOpacity
                                    style={styles.dateModalBackdrop}
                                    activeOpacity={1}
                                    onPress={() => setShowHieuLucTestPicker(false)}
                                />
                                <View style={styles.dateModalSheet}>
                                    <View style={styles.dateModalHeader}>
                                        <TouchableOpacity onPress={() => setShowHieuLucTestPicker(false)}>
                                            <Text style={styles.dateModalAction}>Hủy</Text>
                                        </TouchableOpacity>
                                        <Text style={styles.dateModalTitle}>Hiệu lực test</Text>
                                        <TouchableOpacity
                                            onPress={async () => {
                                                setShowHieuLucTestPicker(false);
                                                setHieuLucTest(hieuLucTestDraft);
                                                await saveHieuLucTest(hieuLucTestDraft);
                                            }}
                                        >
                                            <Text style={styles.dateModalAction}>Xong</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <DateTimePicker
                                        value={hieuLucTestDraft}
                                        mode="date"
                                        display="spinner"
                                        onChange={(event, selectedDate) => {
                                            if (selectedDate) setHieuLucTestDraft(selectedDate);
                                        }}
                                        style={styles.iosDatePicker}
                                    />
                                </View>
                            </View>
                        </Modal>
                    )}

                    {phieu?.BienBanId && (
                        <TouchableOpacity
                            style={styles.bienBanBadge}
                            onPress={() => navigation.navigate("BienBanDetail", { bienBanId: phieu.BienBanId })}
                        >
                            <Text style={styles.bienBanBadgeText}>
                                Xem biên bản KPH
                            </Text>
                        </TouchableOpacity>
                    )}

                </View>

                {trangThai === "TAO_MOI" && canConfig && (
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: "#2563eb", marginBottom: 20 }]}
                        onPress={() => setIsConfigModalVisible(true)}
                    >
                        <Text style={styles.actionText}>
                            Thiết lập nhóm kiểm
                        </Text>
                    </TouchableOpacity>
                )}

                {canDeletePhieu && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton, { marginBottom: 20 }]}
                        onPress={handleDeletePhieu}
                        disabled={loadingAction}
                    >
                        {loadingAction
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.actionText}>Xóa phiếu</Text>
                        }
                    </TouchableOpacity>
                )}

                {hasThongSo && (isKCS || isLeader) && (
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: "#8b5cf6", marginBottom: 20 }]}
                        onPress={() => navigation.navigate("KiemDacBiet", { phieuId: id, trangThai })}
                    >
                        <Text style={styles.actionText}>
                            Kiểm tra cấp độ đặc biệt
                        </Text>
                    </TouchableOpacity>
                )}

                <Text style={styles.sectionLot}>Số lot</Text>

                <View style={styles.lotBox}>

                    <TextInput
                        style={styles.lotInput}
                        multiline
                        placeholder="Nhập số LOT"
                        value={lot}
                        onChangeText={setLot}
                        editable={!lotConfirmed}
                    />

                    {!lotConfirmed && (

                        <TouchableOpacity
                            style={styles.lotButton}
                            onPress={handleConfirmLot}
                        >
                            <Text style={styles.btnText}>
                                Xác nhận số LOT
                            </Text>
                        </TouchableOpacity>

                    )}

                </View>
                {sections.map((section) => {

                    const items = checkItems.filter(
                        (i) => i.SectionId === section.Id
                    );

                    return (

                        <View key={section.Id} style={styles.section}>

                            <View style={styles.sectionHeader}>

                                <Text style={styles.sectionTitle}>
                                    {section.TenNhom}
                                </Text>

                                {section.KetLuan && (

                                    <View
                                        style={[
                                            styles.badge,
                                            section.KetLuan === "ACCEPT"
                                                ? styles.badgeAccept
                                                : styles.badgeReject
                                        ]}
                                    >

                                        <Text style={styles.badgeText}>
                                            {section.KetLuan}
                                        </Text>

                                    </View>

                                )}

                            </View>

                            {items.map((item) => (

                                <TouchableOpacity
                                    key={item.Id}
                                    style={[
                                        styles.itemRow,
                                        (!(isKCS || isLeader) || section.KetLuan) && styles.itemDisabled
                                    ]}
                                    disabled={!(isKCS || isLeader) || !!section.KetLuan}
                                    onPress={() => navigation.navigate("CheckItem", {
                                        item,
                                        canEditDiemTrongYeu: [DAU_VAO_LOAI_KIEM_ID, KIEM_DONG_CONT_LOAI_KIEM_ID]
                                            .includes(Number(phieu?.LoaiKiemId))
                                    })}
                                >

                                    <Text style={styles.itemName}>
                                        {item.TenMucKiem}
                                    </Text>

                                    <Text
                                        style={[
                                            styles.result,
                                            item.KetQua === "DAT" && styles.success,
                                            item.KetQua === "KHONG_DAT" && styles.error,
                                            item.KetQua === "NA" && styles.neutralResult
                                        ]}
                                    >
                                        {item.KetQua ? renderResult(item.KetQua) : "Chưa kiểm"}
                                    </Text>

                                </TouchableOpacity>

                            ))}
                            <View style={styles.aqlInfoBox}>
                                <Text style={styles.aqlLevel}>
                                    Level {section.InspectionLevel} | Mẫu: {section.SoLuongKiem}
                                </Text>

                                <View style={styles.aqlRow}>
                                    <Text style={styles.aqlLabel}>Critical</Text>
                                    <Text
                                        style={[
                                            styles.aqlValue,
                                            section.TotalCritical > section.Ac_Critical && styles.aqlFail
                                        ]}
                                    >
                                        {section.TotalCritical} / {section.Ac_Critical}
                                    </Text>
                                </View>

                                <View style={styles.aqlRow}>
                                    <Text style={styles.aqlLabel}>Major</Text>
                                    <Text
                                        style={[
                                            styles.aqlValue,
                                            section.TotalMajor > section.Ac_Major && styles.aqlFail
                                        ]}
                                    >
                                        {section.TotalMajor} / {section.Ac_Major}
                                    </Text>
                                </View>

                                <View style={styles.aqlRow}>
                                    <Text style={styles.aqlLabel}>Minor</Text>
                                    <Text style={[
                                        styles.aqlValue,
                                        section.TotalMinor > section.Ac_Minor && styles.aqlFail
                                    ]}
                                    >
                                        {section.TotalMinor} / {section.Ac_Minor}
                                    </Text>
                                </View>
                            </View>
                            {!section.KetLuan && (isKCS || isLeader) && (

                                <TouchableOpacity
                                    style={styles.aqlButton}
                                    onPress={() => handleCalculateAQL(section.Id)}
                                    disabled={loadingAQL === section.Id}
                                >

                                    {loadingAQL === section.Id
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={styles.aqlButtonText}>Xác nhận</Text>
                                    }

                                </TouchableOpacity>

                            )}

                        </View>

                    );

                })}

            </KeyboardFormScrollView>

            {/* KCS hoàn tất */}

            {isAllConfirmed && (trangThai === "DANG_KIEM" || trangThai === "DA_TAO_SECTION") && (isKCS || isLeader) && (

                <View style={styles.actionWrapper}>

                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            (hasReject || hasSpecialReject)
                                ? styles.reject
                                : styles.accept
                        ]}
                        onPress={handleComplete}
                        disabled={loadingAction}
                    >

                        {loadingAction
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.actionText}>
                                Xác nhận - {finalResult}
                            </Text>
                        }

                    </TouchableOpacity>

                </View>

            )}

            {/* PX xác nhận */}

            {trangThai === "CHO_XUONG_XAC_NHAN" && isPX && (

                <View style={styles.actionWrapper}>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: "#2563eb" }]}
                        onPress={handleConfirmPX}
                    >

                        <Text style={styles.actionText}>
                            xác nhận trưởng bộ phận
                        </Text>

                    </TouchableOpacity>

                </View>

            )}

            <SectionConfigModal
                visible={isConfigModalVisible}
                onClose={() => setIsConfigModalVisible(false)}
                phieuId={id}
                sanPhamId={phieu?.SanPhamId}
                initialLotSize={phieu?.SoLuongHieuLuc ?? phieu?.SoLuong}
                onSuccess={loadData}
            />

        </KeyboardAvoidingView>

    );
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#f1f5f9",
        padding: 16
    },
    infoCard: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10
    },
    infoItem: {
        flex: 1
    },
    infoItemFull: {
        width: "100%"
    },
    infoLabel: {
        fontSize: 12,
        color: "#64748b",
        marginBottom: 2
    },
    infoValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#0f172a"
    },
    inlineInput: {
        backgroundColor: "#f8fafc",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        paddingVertical: 10,
        paddingHorizontal: 12,
        fontSize: 14,
        fontWeight: "600",
        color: "#0f172a"
    },
    inlineSaveButton: {
        alignSelf: "flex-start",
        marginTop: 6,
        backgroundColor: "#2563eb",
        borderRadius: 8,
        paddingVertical: 7,
        paddingHorizontal: 10
    },
    inlineSaveText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    dateBox: {
        backgroundColor: "#f8fafc",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        paddingVertical: 10,
        paddingHorizontal: 12
    },
    dateModalOverlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(15, 23, 42, 0.22)"
    },
    dateModalBackdrop: {
        ...StyleSheet.absoluteFillObject
    },
    dateModalSheet: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 10,
        paddingBottom: 24
    },
    dateModalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 8
    },
    dateModalTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0f172a"
    },
    dateModalAction: {
        fontSize: 16,
        fontWeight: "600",
        color: "#2563eb"
    },
    iosDatePicker: {
        alignSelf: "center"
    },
    sectionLot: {
        fontWeight: "700",
        fontSize: 16
    },
    lotBox: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginTop: 8
    },
    lotInput: {
        backgroundColor: "#f4f6fa",
        borderRadius: 10,
        padding: 12,
        minHeight: 80,
        textAlignVertical: "top"
    },

    lotButton: {
        backgroundColor: "#2980b9",
        marginTop: 10,
        padding: 12,
        borderRadius: 10,
        alignItems: "center"
    },
    btnText: {
        color: "#fff",
        fontWeight: "600"
    },
    section: {
        marginBottom: 20
    },

    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8
    },

    sectionTitle: {
        fontWeight: "bold",
        fontSize: 16
    },

    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20
    },

    badgeAccept: {
        backgroundColor: "#dcfce7"
    },

    badgeReject: {
        backgroundColor: "#fee2e2"
    },

    badgeText: {
        fontWeight: "700"
    },

    itemRow: {
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 10,
        marginBottom: 8,
        flexDirection: "row",
        justifyContent: "space-between"
    },

    itemDisabled: {
        opacity: 0.5
    },

    itemName: {
        fontWeight: "500"
    },

    result: {
        fontSize: 13
    },

    success: {
        color: "#16a34a"
    },

    error: {
        color: "#dc2626"
    },

    neutralResult: {
        color: "#64748b"
    },

    aqlInfoBox: {
        backgroundColor: "#ffffff",
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#e2e8f0"
    },
    aqlLevel: {
        fontWeight: "600",
        marginBottom: 8,
        color: "#0f172a"
    },
    aqlRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4
    },
    aqlLabel: {
        color: "#475569"
    },
    aqlValue: {
        fontWeight: "600",
        color: "#0f172a"
    },
    aqlFail: {
        color: "#dc2626"
    },
    aqlButton: {
        backgroundColor: "#2563eb",
        padding: 12,
        borderRadius: 10,
        alignItems: "center"
    },

    aqlButtonText: {
        color: "#fff",
        fontWeight: "600"
    },

    actionWrapper: {
        padding: 16,
        backgroundColor: "#fff"
    },

    actionButton: {
        padding: 16,
        borderRadius: 14,
        alignItems: "center"
    },

    accept: {
        backgroundColor: "#16a34a"
    },

    reject: {
        backgroundColor: "#dc2626"
    },

    deleteButton: {
        backgroundColor: "#b91c1c"
    },

    actionText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16
    },

    completedBanner: {
        backgroundColor: "#dcfce7",
        padding: 12,
        alignItems: "center"
    },

    completedText: {
        color: "#166534",
        fontWeight: "700"
    },

    bienBanBadge: {
        backgroundColor: "#fee2e2",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginTop: 8,
        alignSelf: "flex-start",
        borderWidth: 1,
        borderColor: "#fecaca"
    },

    bienBanBadgeText: {
        color: "#dc2626",
        fontWeight: "700",
        fontSize: 12
    }

});
