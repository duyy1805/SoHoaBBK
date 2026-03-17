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
            Alert.alert("Lỗi", "Không thể tải danh sách biên bản");
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const renderItem = ({ item }) => {

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() =>
                    navigation.navigate("BienBanDetail", {
                        bienBanId: item.BienBanId
                    })
                }
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

                <View style={styles.row}>

                    <Text>
                        Ý kiến {item.DaCoYKien}/{item.SoBoPhan}
                    </Text>

                    <Text style={styles.status}>
                        {item.TrangThai}
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