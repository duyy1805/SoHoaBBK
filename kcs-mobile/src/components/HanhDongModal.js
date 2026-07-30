import { useEffect, useRef, useState } from "react";
import {
    Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, View
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addHanhDong } from "../api/bienBan.api";

const emptyRow = () => ({ noiDung: "", thoiHan: new Date(), theoDoi: "" });

export default function HanhDongModal({ visible, bienBanId, onClose, reload }) {
    const [rows, setRows] = useState([emptyRow()]);
    const [dateRow, setDateRow] = useState(null);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (visible) setRows([emptyRow()]);
    }, [visible]);

    const updateRow = (index, patch) => setRows(current =>
        current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row)
    );
    const removeRow = (index) => setRows(current =>
        current.length === 1 ? [emptyRow()] : current.filter((_, rowIndex) => rowIndex !== index)
    );
    const addRow = () => {
        setRows(current => [...current, emptyRow()]);
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    };
    const submit = async () => {
        if (rows.some(row => !row.noiDung.trim() || !row.theoDoi.trim())) {
            Alert.alert("Thiếu dữ liệu", "Vui lòng nhập nội dung và người theo dõi cho tất cả các dòng.");
            return;
        }
        try {
            setLoading(true);
            await addHanhDong({
                bienBanId,
                items: rows.map(row => ({
                    noiDung: row.noiDung.trim(),
                    thoiHan: row.thoiHan,
                    theoDoi: row.theoDoi.trim()
                }))
            });
            await reload();
            onClose();
            Alert.alert("Thành công", `Đã lưu ${rows.length} dòng hành động.`);
        } catch (err) {
            Alert.alert("Lỗi", err?.response?.data?.message || "Không thể thêm hành động.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}><Text style={styles.back}>←</Text></TouchableOpacity>
                    <Text style={styles.title}>Hành động khắc phục</Text>
                    <View style={styles.spacer} />
                </View>
                <ScrollView ref={scrollRef} style={styles.form} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    {rows.map((row, index) => (
                        <View key={index} style={styles.card}>
                            <View style={styles.rowHeader}>
                                <Text style={styles.rowTitle}>Hành động {index + 1}</Text>
                                <TouchableOpacity onPress={() => removeRow(index)}><Text style={styles.remove}>Xóa</Text></TouchableOpacity>
                            </View>
                            <Text style={styles.label}>Nội dung</Text>
                            <TextInput
                                style={[styles.input, styles.textarea]}
                                multiline
                                value={row.noiDung}
                                onChangeText={value => updateRow(index, { noiDung: value })}
                                placeholder="Nhập nội dung hành động"
                                placeholderTextColor="#64748b"
                                textAlignVertical="top"
                            />
                            <Text style={styles.label}>Thời hạn</Text>
                            <TouchableOpacity style={styles.dateBox} onPress={() => setDateRow(index)}>
                                <Text>{row.thoiHan.toLocaleDateString("vi-VN")}</Text>
                            </TouchableOpacity>
                            <Text style={styles.label}>Theo dõi</Text>
                            <TextInput
                                style={styles.input}
                                value={row.theoDoi}
                                onChangeText={value => updateRow(index, { theoDoi: value })}
                                placeholder="Người/bộ phận theo dõi"
                                placeholderTextColor="#64748b"
                                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)}
                            />
                        </View>
                    ))}
                    <TouchableOpacity style={styles.addButton} onPress={addRow}><Text style={styles.addText}>+ Thêm dòng hành động</Text></TouchableOpacity>
                </ScrollView>
                {dateRow !== null && (
                    <DateTimePicker
                        value={rows[dateRow]?.thoiHan || new Date()}
                        mode="date"
                        onChange={(_, date) => {
                            if (date) updateRow(dateRow, { thoiHan: date });
                            setDateRow(null);
                        }}
                    />
                )}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
                        <Text style={styles.btnText}>{loading ? "Đang lưu..." : `Lưu ${rows.length} dòng`}</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f6f7fb" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 60, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
    back: { fontSize: 24 }, title: { fontSize: 18, fontWeight: "700" }, spacer: { width: 24 },
    form: { flex: 1 }, content: { padding: 16, paddingBottom: 28, gap: 12 },
    card: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 14 },
    rowHeader: { flexDirection: "row", justifyContent: "space-between" },
    rowTitle: { fontWeight: "800", color: "#0f172a" }, remove: { color: "#dc2626", fontWeight: "700" },
    label: { fontWeight: "600", marginTop: 12, marginBottom: 6, color: "#334155" },
    input: { backgroundColor: "#fff", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#cbd5e1", color: "#0f172a" },
    textarea: { minHeight: 90 },
    dateBox: { backgroundColor: "#fff", padding: 13, borderRadius: 8, borderWidth: 1, borderColor: "#cbd5e1" },
    addButton: { padding: 13, borderWidth: 1, borderColor: "#93c5fd", borderRadius: 8, alignItems: "center" },
    addText: { color: "#2563eb", fontWeight: "700" },
    footer: { padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
    btn: { backgroundColor: "#16a085", padding: 15, borderRadius: 10, alignItems: "center" },
    btnText: { color: "#fff", fontWeight: "800" }
});
