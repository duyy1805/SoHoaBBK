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
    TextInput
} from "react-native";

import {
    getPhieuKiemDetail,
    calculateAQL,
    completePhieuKiem,
    confirmPX,
    confirmKN,
    updateLot
} from "../api/phieuKiem.api";

import AsyncStorage from "@react-native-async-storage/async-storage";
import SectionConfigModal from "../components/SectionConfigModal";

export default function PhieuDetailScreen({ route, navigation }) {

    const { id } = route.params;

    const [phieu, setPhieu] = useState(null);
    const [lot, setLot] = useState("");
    const [lotConfirmed, setLotConfirmed] = useState(false);
    const [sections, setSections] = useState([]);
    const [checkItems, setCheckItems] = useState([]);
    const [permissions, setPermissions] = useState([]);

    const [loadingAQL, setLoadingAQL] = useState(null);
    const [loadingAction, setLoadingAction] = useState(false);
    const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);

    const [trangThai, setTrangThai] = useState(null);

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

        setPhieu(res.data.phieu);
        setSections(res.data.sections);
        setCheckItems(res.data.checkItems);
        setTrangThai(res.data.phieu?.TrangThai);
        const lot = res.data.phieu?.Lot;
        setLot(lot);
        setLotConfirmed(!!lot);
    };

    const hasPermission = (p) => permissions.includes(p);

    const isKCS = hasPermission("THUC_HIEN_KIEM");
    const isPX = hasPermission("XAC_NHAN_PX");
    const isKN = hasPermission("XAC_NHAN_KIEM_NGHIEM");
    const canConfig = hasPermission("THUC_HIEN_KIEM");
    const isAllConfirmed =
        sections.length > 0 &&
        sections.every(s => s.KetLuan);

    const hasReject = sections.some(s => s.KetLuan === "REJECT");

    const finalResult = hasReject ? "KHONG_DAT" : "DAT";

    const isCompleted = trangThai === "HOAN_TAT";

    const renderStatus = (status) => {
        switch (status) {
            case "TAO_MOI": return "Tạo mới";
            case "DA_TAO_SECTION": return "Chưa kiểm";
            case "DANG_KIEM": return "Đang kiểm";
            case "CHO_XUONG_XAC_NHAN": return "Chờ PX xác nhận";
            case "CHO_KIEM_NGHIEM": return "Chờ kiểm nghiệm";
            case "HOAN_TAT": return "Hoàn tất";
            default: return status;
        }
    };

    const renderResult = (result) => {
        if (result === "DAT") return "Đạt";
        if (result === "KHONG_DAT") return "Không đạt";
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

            Alert.alert("Thành công", "PX đã xác nhận");

            navigation.goBack();

        } catch {

            Alert.alert("Lỗi", "Không thể xác nhận PX");

        } finally {

            setLoadingAction(false);

        }

    };

    const handleConfirmKN = async () => {

        try {

            setLoadingAction(true);

            await confirmKN(id);

            Alert.alert("Thành công", "Đã xác nhận kiểm nghiệm");

            navigation.goBack();

        } catch {

            Alert.alert("Lỗi", "Không thể xác nhận");

        } finally {

            setLoadingAction(false);

        }

    };

    return (

        <View style={{ flex: 1 }}>

            {isCompleted && (
                <View style={styles.completedBanner}>
                    <Text style={styles.completedText}>
                        Phiếu đã hoàn tất
                    </Text>
                </View>
            )}

            <ScrollView style={styles.container}>

                <View style={styles.infoCard}>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Số phiếu</Text>
                            <Text style={styles.infoValue}>{phieu?.SoPhieu}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Sản phẩm</Text>
                            <Text style={styles.infoValue}>{phieu?.TenSanPham}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Mã hàng</Text>
                            <Text style={styles.infoValue}>{phieu?.MaSanPham}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Số lượng</Text>
                            <Text style={styles.infoValue}>{phieu?.SoLuong}</Text>
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
                            <Text style={styles.infoLabel}>Ngày giao</Text>
                            <Text style={styles.infoValue}>{phieu?.Ngay_Giao ? new Date(phieu.Ngay_Giao).toLocaleDateString('vi-VN') : "---"}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Người kiểm</Text>
                            <Text style={styles.infoValue}>{phieu?.TenNguoiKiem || "---"}</Text>
                        </View>
                    </View>

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
                                        (!isKCS || section.KetLuan) && styles.itemDisabled
                                    ]}
                                    disabled={!isKCS || !!section.KetLuan}
                                    onPress={() =>
                                        navigation.navigate("CheckItem", { item })
                                    }
                                >

                                    <Text style={styles.itemName}>
                                        {item.TenMucKiem}
                                    </Text>

                                    <Text
                                        style={[
                                            styles.result,
                                            item.KetQua === "DAT" && styles.success,
                                            item.KetQua === "KHONG_DAT" && styles.error
                                        ]}
                                    >
                                        {item.KetQua || "Chưa kiểm"}
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
                            {!section.KetLuan && isKCS && (

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

            </ScrollView>

            {/* KCS hoàn tất */}

            {isAllConfirmed && !isCompleted && isKCS && (

                <View style={styles.actionWrapper}>

                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            hasReject
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
                            Xác nhận phân xưởng
                        </Text>

                    </TouchableOpacity>

                </View>

            )}

            {/* Kiểm nghiệm xác nhận */}

            {trangThai === "CHO_KIEM_NGHIEM" && isKN && (

                <View style={styles.actionWrapper}>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: "#7c3aed" }]}
                        onPress={handleConfirmKN}
                    >

                        <Text style={styles.actionText}>
                            Xác nhận kiểm nghiệm
                        </Text>

                    </TouchableOpacity>

                </View>

            )}

            <SectionConfigModal
                visible={isConfigModalVisible}
                onClose={() => setIsConfigModalVisible(false)}
                phieuId={id}
                sanPhamId={phieu?.SanPhamId}
                initialLotSize={phieu?.SoLuong}
                onSuccess={loadData}
            />

        </View>

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
    }

});