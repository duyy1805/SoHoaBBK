// src/screens/BienBanListScreen.jsx

import { useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    Alert
} from "react-native";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";
import { getMyBienBan } from "../api/bienBan.api";

export default function BienBanListScreen({ navigation }) {

    const [data, setData] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {

            const res = await getMyBienBan();

            setData(res.data || []);

        } catch (err) {
            console.log("Load BienBan error:", err);
            Toast.show({
                type: "error",
                text1: "Lỗi",
                text2: err.response?.data?.message || "Không thể tải danh sách biên bản"
            });
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const renderItem = ({ item }) => {
        const isSxbtBienBan = item.LoaiBienBan === "SXBT" ||
            item.LoaiKiemId === 4 ||
            String(item.TrangThai || "").startsWith("BB_SXBT");

        const getStatusLabel = () => {
            if (!isSxbtBienBan) return item.TrangThai;
            if (item.TrangThai === "BB_SXBT_HOAN_TAT") return "SXBT hoàn tất";
            if (item.TrangThai === "BB_SXBT_CHO_XAC_NHAN") {
                const waitingDepartment = item.MaBoPhanDangCho || item.TenBoPhanDangCho;
                return waitingDepartment ? `Chờ ${waitingDepartment}` : "Đang xử lý SXBT";
            }
            if (item.TrangThai === "BB_SXBT_MOI" || item.TrangThai === "BB_SXBT_TP_B8_DRAFT") {
                return "Chờ xác nhận mức";
            }
            return item.TrangThai;
        };

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => {
                    const screenName = isSxbtBienBan
                        ? "BienBanSxbtDetail"
                        : "BienBanDetail";
                    navigation.navigate(screenName, { bienBanId: item.BienBanId });
                }}
            >

                <Text style={styles.title}>
                    {item.SoPhieu}
                </Text>

                <Text style={styles.product}>
                    {item.TenSanPham}
                </Text>

                <Text style={styles.lot}>
                    Lot: {item.Lot}
                </Text>

                <Text style={styles.creator}>
                    Người lập: {item.NguoiLap}
                </Text>
                <Text style={styles.creator}>
                    Bộ phận: {[item.MaBoPhanTao, item.TenBoPhanTao].filter(Boolean).join(" - ") || "---"}
                </Text>
                {isSxbtBienBan && item.MaDonVi ? (
                    <Text style={styles.creator}>Mã đơn vị SXBT: {item.MaDonVi}</Text>
                ) : null}

                <View style={styles.row}>

                    <Text>
                        {isSxbtBienBan
                            ? item.SoBoPhan > 0
                                ? `Xác nhận ${item.DaCoYKien}/${item.SoBoPhan}`
                                : "Chưa mở luồng"
                            : `Phản hồi ${item.DaCoYKien}/${item.SoBoPhan}`}
                    </Text>

                    <Text style={styles.status}>
                        {getStatusLabel()}
                    </Text>

                </View>

                {/* Progress Bar */}

                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${item.ProgressPercent}%` }
                        ]}
                    />
                </View>

            </TouchableOpacity>
        );
    };

    return (
        <FlatList
            data={data}
            keyExtractor={(item) => item.BienBanId.toString()}
            renderItem={renderItem}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            }
            contentContainerStyle={{ padding: 16 }}
        />
    );
}

const styles = StyleSheet.create({

    card: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2
    },

    title: {
        fontWeight: "bold",
        fontSize: 16
    },

    product: {
        marginTop: 4
    },

    lot: {
        color: "#666"
    },

    creator: {
        color: "#888",
        marginTop: 2
    },

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8
    },

    status: {
        fontWeight: "bold",
        color: "#007AFF"
    },

    progressBar: {
        height: 6,
        backgroundColor: "#eee",
        marginTop: 6,
        borderRadius: 4
    },

    progressFill: {
        height: 6,
        backgroundColor: "#4CAF50",
        borderRadius: 4
    }

});
