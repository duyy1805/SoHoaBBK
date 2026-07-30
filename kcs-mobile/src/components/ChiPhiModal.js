import { useEffect, useRef, useState } from "react";
import {
    Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, View
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addChiPhi } from "../api/bienBan.api";

const emptyRow = () => ({ loaiChiPhi: "", giaTri: "", thoiHan: new Date() });

export default function ChiPhiModal({ visible, bienBanId, onClose, reload }) {
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
    const formatMoney = (value) => value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    const handleSubmit = async () => {
        if (rows.some(row => !row.loaiChiPhi.trim() || !row.giaTri)) {
            Alert.alert("Thiếu dữ liệu", "Vui lòng nhập tên và giá trị cho tất cả các dòng chi phí.");
            return;
        }
        try {
            setLoading(true);
            await addChiPhi({
                bienBanId,
                items: rows.map(row => ({
                    loaiChiPhi: row.loaiChiPhi.trim(),
                    giaTri: Number(row.giaTri.replace(/\./g, "")),
                    thoiHan: row.thoiHan
                }))
            });
            await reload();
            onClose();
            Alert.alert("Thành công", `Đã lưu ${rows.length} dòng chi phí.`);
        } catch (err) {
            Alert.alert("Lỗi", err?.response?.data?.message || "Không thể thêm chi phí.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}><Text style={styles.back}>←</Text></TouchableOpacity>
                    <Text style={styles.title}>Chi phí phát sinh</Text>
                    <View style={styles.headerSpacer} />
                </View>
                <ScrollView
                    ref={scrollRef}
                    style={styles.form}
                    contentContainerStyle={styles.formContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {rows.map((row, index) => (
                        <View key={index} style={styles.card}>
                            <View style={styles.rowHeader}>
                                <Text style={styles.rowTitle}>Chi phí {index + 1}</Text>
                                <TouchableOpacity onPress={() => removeRow(index)}><Text style={styles.remove}>Xóa</Text></TouchableOpacity>
                            </View>
                            <Text style={styles.label}>Tên/Loại chi phí</Text>
                            <TextInput
                                style={styles.input}
                                value={row.loaiChiPhi}
                                onChangeText={value => updateRow(index, { loaiChiPhi: value })}
                                placeholder="Ví dụ: Chi phí vật tư"
                                placeholderTextColor="#64748b"
                            />
                            <Text style={styles.label}>Giá trị (VND)</Text>
                            <TextInput
                                style={styles.input}
                                value={row.giaTri}
                                onChangeText={value => updateRow(index, { giaTri: formatMoney(value) })}
                                keyboardType="numeric"
                                placeholder="Nhập số tiền"
                                placeholderTextColor="#64748b"
                            />
                            <Text style={styles.label}>Thời hạn</Text>
                            <TouchableOpacity style={styles.dateBox} onPress={() => setDateRow(index)}>
                                <Text>{row.thoiHan.toLocaleDateString("vi-VN")}</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    <TouchableOpacity style={styles.addButton} onPress={addRow}>
                        <Text style={styles.addText}>+ Thêm dòng chi phí</Text>
                    </TouchableOpacity>
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
                    <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
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
    back: { fontSize: 24 }, title: { fontSize: 18, fontWeight: "700" }, headerSpacer: { width: 24 },
    form: { flex: 1 }, formContent: { padding: 16, paddingBottom: 28, gap: 12 },
    card: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 14 },
    rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    rowTitle: { fontWeight: "800", color: "#0f172a" }, remove: { color: "#dc2626", fontWeight: "700" },
    label: { fontWeight: "600", marginTop: 12, marginBottom: 6, color: "#334155" },
    input: { backgroundColor: "#fff", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#cbd5e1", color: "#0f172a" },
    dateBox: { backgroundColor: "#fff", padding: 13, borderRadius: 8, borderWidth: 1, borderColor: "#cbd5e1" },
    addButton: { padding: 13, borderWidth: 1, borderColor: "#93c5fd", borderRadius: 8, alignItems: "center" },
    addText: { color: "#2563eb", fontWeight: "700" },
    footer: { padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
    btn: { backgroundColor: "#16a085", padding: 15, borderRadius: 10, alignItems: "center" },
    btnText: { color: "#fff", fontWeight: "800" }
});
