// src/screens/PhieuListScreen.jsx

import { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    StatusBar
} from "react-native";
import { getMyPhieuKiem } from "../api/phieuKiem.api";

export default function PhieuListScreen({ navigation }) {
    const [data, setData] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const res = await getMyPhieuKiem();
        setData(res.data);
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() =>
                navigation.navigate("PhieuDetail", { id: item.Id })
            }
        >
            <View style={styles.cardHeader}>
                <Text style={styles.soPhieu}>{item.SoPhieu}</Text>
                <Text style={styles.status}>{item.TrangThai}</Text>
            </View>

            <Text style={styles.lot}>LOT: {item.Lot}</Text>
            <Text style={styles.sub}>Loại kiểm: {item.TenLoaiKiem}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <FlatList
                data={data}
                keyExtractor={(item) => item.Id.toString()}
                renderItem={renderItem}
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
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 12,
        marginBottom: 14,
        elevation: 2
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between"
    },
    soPhieu: {
        fontWeight: "bold",
        fontSize: 16,
        color: "#1e293b"
    },
    status: {
        fontSize: 13,
        color: "#64748b"
    },
    lot: {
        marginTop: 6,
        fontWeight: "500"
    },
    sub: {
        marginTop: 4,
        color: "#475569"
    }
});