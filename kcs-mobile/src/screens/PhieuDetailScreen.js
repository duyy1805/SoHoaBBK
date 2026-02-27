// src/screens/PhieuDetailScreen.jsx

import { useEffect, useState, useCallback } from "react"
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet
} from "react-native";
import { getPhieuKiemDetail } from "../api/phieuKiem.api";

export default function PhieuDetailScreen({ route, navigation }) {
    const { id } = route.params;

    const [sections, setSections] = useState([]);
    const [checkItems, setCheckItems] = useState([]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        const res = await getPhieuKiemDetail(id);
        setSections(res.data.sections);
        setCheckItems(res.data.checkItems);
    };

    return (
        <ScrollView style={styles.container}>
            {sections.map((section) => {
                const items = checkItems.filter(
                    (i) => i.SectionId === section.Id
                );

                return (
                    <View key={section.Id} style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {section.TenNhom}
                        </Text>

                        {items.map((item) => (
                            <TouchableOpacity
                                key={item.Id}
                                style={styles.itemRow}
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
                    </View>
                );
            })}
        </ScrollView>
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
    }
});