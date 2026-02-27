// src/screens/CheckItemScreen.jsx

import { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StyleSheet
} from "react-native";
import { saveCheckItem } from "../api/phieuKiem.api";

export default function CheckItemScreen({ route, navigation }) {
    const { item } = route.params;

    const [ketQua, setKetQua] = useState(null);
    const [soLuongLoi, setSoLuongLoi] = useState("");

    const handleSave = async () => {
        await saveCheckItem({
            checkItemId: item.Id,
            ketQua,
            soLuongLoi: Number(soLuongLoi)
        });
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{item.TenMucKiem}</Text>
            <Text style={styles.standard}>{item.TieuChuan}</Text>

            <View style={styles.row}>
                <TouchableOpacity
                    style={[
                        styles.option,
                        ketQua === "DAT" && styles.activeSuccess
                    ]}
                    onPress={() => setKetQua("DAT")}
                >
                    <Text>Đạt</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.option,
                        ketQua === "KHONG_DAT" && styles.activeError
                    ]}
                    onPress={() => setKetQua("KHONG_DAT")}
                >
                    <Text>Không đạt</Text>
                </TouchableOpacity>
            </View>

            {ketQua === "KHONG_DAT" && (
                <TextInput
                    placeholder="Số lượng lỗi"
                    keyboardType="numeric"
                    value={soLuongLoi}
                    onChangeText={setSoLuongLoi}
                    style={styles.input}
                />
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                    Lưu kết quả
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#f1f5f9"
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 6
    },
    standard: {
        marginBottom: 20,
        color: "#475569"
    },
    row: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 16
    },
    option: {
        flex: 1,
        padding: 14,
        borderRadius: 10,
        backgroundColor: "#e2e8f0",
        alignItems: "center"
    },
    activeSuccess: {
        backgroundColor: "#16a34a"
    },
    activeError: {
        backgroundColor: "#dc2626"
    },
    input: {
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 10,
        marginBottom: 16
    },
    saveBtn: {
        backgroundColor: "#1e293b",
        padding: 16,
        borderRadius: 12,
        alignItems: "center"
    }
});