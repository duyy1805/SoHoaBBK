// src/screens/PhieuListScreen.jsx

import { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    RefreshControl
} from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { getMyPhieuKiem } from "../api/phieuKiem.api";

export default function PhieuListScreen({ navigation }) {
    const [data, setData] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

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
                return { backgroundColor: "#dcfce7", color: "#15803d" };
            case "DANG_KIEM":
                return { backgroundColor: "#fef9c3", color: "#a16207" };
            case "TAO_MOI":
                return { backgroundColor: "#e0f2fe", color: "#0369a1" };
            default:
                return { backgroundColor: "#e2e8f0", color: "#475569" };
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
                            {item.TrangThai}
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
                    <Text style={styles.value}>{item.TenSanPham}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>SL / SL kiểm</Text>
                    <Text style={styles.value}>
                        {item.SoLuong} / {item.SoLuongKiem}
                    </Text>
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
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <FlatList
                data={data}
                keyExtractor={(item) => item.Id.toString()}
                renderItem={renderItem}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={{ padding: 16 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f1f5f9"
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