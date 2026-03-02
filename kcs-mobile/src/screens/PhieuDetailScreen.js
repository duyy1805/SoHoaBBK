// src/screens/PhieuDetailScreen.jsx

import { useEffect, useState, useCallback } from "react"
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { getPhieuKiemDetail, calculateAQL, completePhieuKiem } from "../api/phieuKiem.api";
import { ActivityIndicator, Alert } from "react-native";

export default function PhieuDetailScreen({ route, navigation }) {
    const { id } = route.params;

    const [sections, setSections] = useState([]);
    const [checkItems, setCheckItems] = useState([]);

    const [loadingAQL, setLoadingAQL] = useState(null);
    const [loadingComplete, setLoadingComplete] = useState(false);
    const [trangThai, setTrangThai] = useState(null);

    const isAllConfirmed =
        sections.length > 0 &&
        sections.every(s => s.KetLuan);

    const hasReject = sections.some(s => s.KetLuan === "REJECT");
    const finalResult = hasReject ? "KHONG_DAT" : "DAT";
    const isCompleted = trangThai === "HOAN_TAT";
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        const res = await getPhieuKiemDetail(id);
        setSections(res.data.sections);
        setCheckItems(res.data.checkItems);
        setTrangThai(res.data.phieu?.TrangThai);
    };

    const handleCalculateAQL = async (sectionId) => {
        try {
            setLoadingAQL(sectionId);
            await calculateAQL(sectionId);

            Alert.alert("Thành công", "Đã tính AQL");
            await loadData(); // reload lại dữ liệu
        } catch (err) {
            Alert.alert("Lỗi", "Không thể tính AQL");
        } finally {
            setLoadingAQL(null);
        }
    };

    const handleComplete = async () => {
        try {
            setLoadingComplete(true);

            await completePhieuKiem(Number(id));

            Alert.alert("Thành công", "Phiếu đã hoàn tất");
            navigation.goBack(); // về danh sách
        } catch (err) {
            Alert.alert("Lỗi", "Không thể hoàn tất phiếu");
        } finally {
            setLoadingComplete(false);
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
                                        section.KetLuan && styles.itemDisabled
                                    ]}
                                    disabled={!!section.KetLuan}
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
                            {!section.KetLuan && (
                                <TouchableOpacity
                                    style={styles.aqlButton}
                                    onPress={() => handleCalculateAQL(section.Id)}
                                    disabled={loadingAQL === section.Id}
                                >
                                    {loadingAQL === section.Id ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.aqlButtonText}>
                                            Xác nhận
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}
            </ScrollView>
            {isAllConfirmed && !isCompleted && (
                <View style={styles.completeWrapper}>
                    <TouchableOpacity
                        style={[
                            styles.completeButton,
                            hasReject
                                ? styles.completeReject
                                : styles.completeAccept
                        ]}
                        onPress={handleComplete}
                        disabled={loadingComplete}
                    >
                        {loadingComplete ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.completeText}>
                                Xác nhận - {finalResult}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f1f5f9",
        padding: 16
    },
    section: {
        marginBottom: 20
    },
    sectionTitle: {
        fontWeight: "bold",
        fontSize: 16,
        marginBottom: 8,
        color: "#1e293b"
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8
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
        fontSize: 12,
        fontWeight: "700",
        color: "#1e293b"
    },
    itemDisabled: {
        opacity: 0.5
    },
    itemRow: {
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 10,
        marginBottom: 8,
        flexDirection: "row",
        justifyContent: "space-between"
    },
    itemName: {
        fontWeight: "500"
    },
    result: {
        fontSize: 13,
        color: "#64748b"
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
        alignItems: "center",
        marginTop: 8
    },
    aqlButtonText: {
        color: "#fff",
        fontWeight: "600"
    },
    completeWrapper: {
        padding: 16,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderColor: "#e2e8f0"
    },
    completeAccept: {
        backgroundColor: "#16a34a"
    },
    completeReject: {
        backgroundColor: "#dc2626"
    },
    completeButton: {
        backgroundColor: "#16a34a",
        padding: 16,
        borderRadius: 14,
        alignItems: "center"
    },
    completeText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16
    },
    completedBanner: {
        backgroundColor: "#dcfce7",
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: "center"
    },
    completedText: {
        color: "#166534",
        fontWeight: "700"
    }
});