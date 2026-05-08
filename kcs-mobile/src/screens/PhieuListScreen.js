// src/screens/PhieuListScreen.jsx

import { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    RefreshControl,
    TextInput,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { getMyPhieuKiem } from "../api/phieuKiem.api";

export default function PhieuListScreen({ navigation }) {
    const [data, setData] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchText, setSearchText] = useState("");

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const filteredData = (data || []).filter(item => {
        const searchLower = searchText.toLowerCase();
        const maSP = (item.MaSanPham || "").toLowerCase();
        const tenSP = (item.TenSanPham || "").toLowerCase();
        const ngayGiao = item.Ngay_Giao ? new Date(item.Ngay_Giao).toLocaleDateString("vi-VN") : "";

        return maSP.includes(searchLower) ||
            tenSP.includes(searchLower) ||
            ngayGiao.includes(searchLower);
    });

    const truncate = (text, max = 30) => {
        if (!text) return "";
        return text.length > max ? text.slice(0, max) + "..." : text;
    };
    const loadData = async () => {
        try {
            const res = await getMyPhieuKiem();
            setData(res.data || []);
        } catch (err) {
            console.log(err);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, []);

    const getStatusStyle = (status) => {
        switch (status) {
            case "HOAN_TAT":
                return { backgroundColor: "#dcfce7", color: "#15803d", text: "Hoàn tất" };

            case "DANG_KIEM":
                return { backgroundColor: "#fef9c3", color: "#a16207", text: "Đang kiểm" };

            case "DA_TAO_SECTION":
                return { backgroundColor: "#e0f2fe", color: "#0369a1", text: "Đang kiểm" };

            case "CHO_XUONG_XAC_NHAN":
                return { backgroundColor: "#fef3c7", color: "#b45309", text: "Chờ PX" };

            case "CHO_KIEM_NGHIEM":
                return { backgroundColor: "#ede9fe", color: "#6d28d9", text: "Chờ kiểm nghiệm" };

            default:
                return { backgroundColor: "#e2e8f0", color: "#475569", text: status };
        }
    };

    const renderItem = ({ item }) => {
        const statusStyle = getStatusStyle(item.TrangThai);

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() =>
                    navigation.navigate("PhieuDetail", { id: item.Id })
                }
            >
                <View style={styles.header}>
                    <Text style={styles.soPhieu}>{item.SoPhieu}</Text>
                    <View
                        style={[
                            styles.badge,
                            { backgroundColor: statusStyle.backgroundColor }
                        ]}
                    >
                        <Text style={[styles.badgeText, { color: statusStyle.color }]}>
                            {statusStyle.text}
                        </Text>
                    </View>
                </View>

                <Text style={styles.lot}>LOT: {item.Lot}</Text>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Loại kiểm</Text>
                    <Text style={styles.value}>{item.TenLoaiKiem}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Itemcode</Text>
                    <Text style={styles.value}>{item.MaSanPham}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Quy cách</Text>
                    <Text
                        style={styles.value}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {truncate(item.TenSanPham)}
                    </Text>
                </View>
                {item.Ngay_Giao && (
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Ngày giao</Text>
                        <Text style={styles.value}>
                            {new Date(item.Ngay_Giao).toLocaleDateString("vi-VN")}
                        </Text>
                    </View>
                )}
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Số lượng</Text>
                    <Text style={styles.value}>
                        {item.SoLuong}
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Nơi đến</Text>
                    <Text style={styles.value}>{item.DoiTuong}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Người kiểm</Text>
                    <Text style={styles.value}>{item.TenNguoiKiem}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.empty}>
            <Text style={styles.emptyText}>Không có phiếu kiểm</Text>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <StatusBar barStyle="dark-content" />

            <FlatList
                data={filteredData}
                keyExtractor={(item) => item.Id.toString()}
                renderItem={renderItem}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={{ padding: 16 }}
            />

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm theo Mã SP, Quy cách, Ngày giao (dd/mm/yyyy)..."
                    value={searchText}
                    onChangeText={setSearchText}
                    clearButtonMode="while-editing"
                />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f1f5f9"
    },
    searchContainer: {
        padding: 12,
        backgroundColor: "#ffffff",
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        paddingBottom: 24
    },
    searchInput: {
        backgroundColor: "#f1f5f9",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 12,
        fontSize: 15,
        color: "#1e293b",
        borderWidth: 1,
        borderColor: "#cbd5e1",
    },
    card: {
        backgroundColor: "#ffffff",
        padding: 18,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },
    soPhieu: {
        fontWeight: "bold",
        fontSize: 17,
        color: "#0f172a"
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "600"
    },
    lot: {
        marginTop: 8,
        fontWeight: "600",
        color: "#334155"
    },
    divider: {
        height: 1,
        backgroundColor: "#e2e8f0",
        marginVertical: 10
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 6
    },
    label: {
        color: "#64748b",
        fontSize: 13
    },
    value: {
        color: "#1e293b",
        fontWeight: "500"
    },
    empty: {
        alignItems: "center",
        marginTop: 80
    },
    emptyText: {
        color: "#94a3b8",
        fontSize: 15
    }
});