import React from "react";
import {
  Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const typeColor = (type) => {
  if (type === "CRITICAL") return "#ef4444";
  if (type === "MAJOR") return "#f59e0b";
  return "#3b82f6";
};

export default function DefectPickerModal({
  visible,
  defects,
  search,
  onSearchChange,
  onSelect,
  onClose,
  resolveAssetUrl
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.content}>
          <Text style={styles.title}>Chọn lỗi</Text>
          <TextInput
            style={styles.search}
            placeholder="Tìm mã lỗi / tên lỗi..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={onSearchChange}
          />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {defects.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={40} color="#cbd5e1" />
                <Text style={styles.emptyText}>Không tìm thấy mã lỗi phù hợp</Text>
              </View>
            ) : defects.map((defect) => (
              <TouchableOpacity key={defect.Id} style={styles.item} onPress={() => onSelect(defect)}>
                <View style={styles.topRow}>
                  <View style={styles.titleRow}>
                    <View style={[styles.typeBadge, { backgroundColor: typeColor(defect.DefectType) }]}>
                      <Text style={styles.typeText}>{defect.DefectType || "---"}</Text>
                    </View>
                    <Text style={styles.code}>{defect.MaLoi || "---"}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={24} color="#2563eb" />
                </View>
                <Text style={styles.name}>{defect.TenLoi || "---"}</Text>
                {defect.MoTa ? <Text style={styles.description}>{defect.MoTa}</Text> : null}
                {(defect.TenSanPham || defect.ChungLoai) ? (
                  <Text style={styles.description}>{[defect.TenSanPham, defect.ChungLoai].filter(Boolean).join(" - ")}</Text>
                ) : null}
                {defect.ImageUrl ? (
                  <Image source={{ uri: resolveAssetUrl(defect.ImageUrl) }} style={styles.image} resizeMode="cover" />
                ) : null}
                {(defect.PhamViApDung || defect.GhiChu) ? (
                  <View style={styles.note}>
                    <Ionicons name="alert-circle-outline" size={14} color="#2563eb" />
                    <Text style={styles.noteText}>{defect.PhamViApDung || defect.GhiChu}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Đóng</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "flex-end" },
  content: { maxHeight: "90%", minHeight: "60%", backgroundColor: "#f8fafc", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 24 },
  title: { fontSize: 20, fontWeight: "800", color: "#0f172a", textAlign: "center", marginBottom: 15 },
  search: { minHeight: 52, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 16, paddingHorizontal: 14, backgroundColor: "#fff", fontSize: 15, marginBottom: 15 },
  list: { paddingBottom: 8 },
  empty: { padding: 28, alignItems: "center" },
  emptyText: { color: "#94a3b8", marginTop: 8 },
  item: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  code: { fontSize: 14, color: "#64748b", fontWeight: "800", marginLeft: 8 },
  name: { fontSize: 16, color: "#0f172a", fontWeight: "700", marginTop: 5 },
  description: { fontSize: 13, color: "#64748b", marginTop: 6, lineHeight: 18 },
  image: { width: "100%", height: 160, borderRadius: 12, marginTop: 10, backgroundColor: "#e2e8f0" },
  note: { flexDirection: "row", alignItems: "center", marginTop: 8, backgroundColor: "#eff6ff", padding: 8, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: "#2563eb" },
  noteText: { color: "#1e40af", fontSize: 12, fontWeight: "500", marginLeft: 4, flex: 1 },
  closeButton: { backgroundColor: "#64748b", padding: 14, borderRadius: 14, alignItems: "center", marginTop: 8 },
  closeText: { color: "#fff", fontWeight: "800", fontSize: 16 }
});
