import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

export default function ExecutiveApprovalReturnModal({ visible, saving, onClose, onSubmit }) {
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (!visible) setReason("");
    }, [visible]);

    const submit = () => {
        const normalized = reason.trim();
        if (normalized) onSubmit(normalized);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={styles.sheet}>
                    <ScrollView
                        contentContainerStyle={styles.content}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={styles.title}>Ban giám đốc trả lại hồ sơ</Text>
                        <Text style={styles.hint}>Nêu rõ nội dung cần chỉnh sửa trước khi hồ sơ được gửi lại qua các bước xác nhận.</Text>
                        <TextInput
                            style={styles.input}
                            multiline
                            value={reason}
                            onChangeText={setReason}
                            placeholder="Nhập lý do trả lại"
                            placeholderTextColor="#64748b"
                            textAlignVertical="top"
                            maxLength={4000}
                            autoFocus
                        />
                        <View style={styles.actions}>
                            <TouchableOpacity style={styles.cancelButton} disabled={saving} onPress={onClose}>
                                <Text style={styles.cancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.returnButton, (!reason.trim() || saving) && styles.disabled]}
                                disabled={!reason.trim() || saving}
                                onPress={submit}
                            >
                                <Text style={styles.returnText}>{saving ? "Đang xử lý…" : "Trả lại để chỉnh sửa"}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
    sheet: { maxHeight: "72%", backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    content: { padding: 20, paddingBottom: 28 },
    title: { fontSize: 19, fontWeight: "700", color: "#0f172a" },
    hint: { marginTop: 8, color: "#475569", lineHeight: 20 },
    input: {
        marginTop: 16, minHeight: 130, borderWidth: 1, borderColor: "#cbd5e1",
        borderRadius: 10, padding: 12, color: "#0f172a", backgroundColor: "#fff"
    },
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 18 },
    cancelButton: { paddingHorizontal: 18, paddingVertical: 12 },
    cancelText: { color: "#475569", fontWeight: "600" },
    returnButton: { backgroundColor: "#dc2626", paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 },
    returnText: { color: "#fff", fontWeight: "700" },
    disabled: { opacity: 0.5 }
});
