import { useEffect, useRef, useState } from "react";
import {
  Alert,
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
import { respondSpecialistOpinion } from "../api/bienBan.api";

export default function OpinionResponseModal({
  visible,
  bienBanId,
  department,
  onClose,
  reload
}) {
  const [noiDung, setNoiDung] = useState("");
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (visible) setNoiDung("");
  }, [visible]);

  const submit = async () => {
    const value = noiDung.trim();
    if (!value) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập nội dung ý kiến của phòng ban.");
      return;
    }
    try {
      setSaving(true);
      await respondSpecialistOpinion(
        bienBanId,
        department?.Id,
        { noiDung: value }
      );
      await reload();
      onClose();
      Alert.alert("Thành công", "Đã xác nhận ý kiến phòng ban.");
    } catch (error) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể xác nhận ý kiến.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>Ý kiến phòng ban chuyên môn</Text>
                <Text style={styles.subtitle}>{department?.TenBoPhan || department?.MaBoPhan}</Text>
              </View>
              <TouchableOpacity onPress={onClose} accessibilityLabel="Đóng">
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.helper}>
                Nhập một nội dung ý kiến chung của phòng ban đối với biên bản.
              </Text>
              <TextInput
                style={styles.input}
                multiline
                value={noiDung}
                onChangeText={setNoiDung}
                placeholder="Nhập nội dung ý kiến..."
                placeholderTextColor="#64748b"
                textAlignVertical="top"
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)}
              />
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} disabled={saving} onPress={submit}>
                <Text style={styles.submitText}>{saving ? "Đang lưu..." : "Xác nhận ý kiến"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  keyboard: { width: "100%", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "86%",
    minHeight: "55%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden"
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0"
  },
  headerText: { flex: 1 },
  title: { color: "#0f172a", fontSize: 18, fontWeight: "800" },
  subtitle: { color: "#64748b", marginTop: 4 },
  close: { color: "#475569", fontSize: 20, paddingHorizontal: 8 },
  scroll: { flexShrink: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
  helper: { color: "#475569", lineHeight: 20 },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    color: "#0f172a",
    backgroundColor: "#fff"
  },
  footer: { flexDirection: "row", gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  cancelButton: { flex: 1, padding: 13, borderRadius: 8, backgroundColor: "#e2e8f0", alignItems: "center" },
  cancelText: { color: "#334155", fontWeight: "700" },
  submitButton: { flex: 2, padding: 13, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "800" }
});
