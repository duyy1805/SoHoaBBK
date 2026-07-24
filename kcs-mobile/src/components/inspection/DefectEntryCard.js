import React from "react";
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function DefectEntryCard({
  defect,
  editable,
  onChange,
  onRemove,
  onPickImages,
  resolveAssetUrl
}) {
  const removeSavedImage = (index) => onChange({
    imageUrls: (defect.imageUrls || []).filter((_, current) => current !== index)
  });
  const removeLocalImage = (index) => onChange({
    localImages: (defect.localImages || []).filter((_, current) => current !== index)
  });

  return (
    <View style={styles.card}>
      <View style={styles.compactRow}>
        <View style={styles.info}>
          <View style={styles.codeBadge}><Text style={styles.code}>{defect.maLoi || "---"}</Text></View>
          <Text style={styles.name}>{defect.tenLoi || "---"}</Text>
          {defect.moTa ? <Text style={styles.description} numberOfLines={3}>{defect.moTa}</Text> : null}
          <Text style={styles.type}>{defect.defectType || "---"}</Text>
        </View>
        <View style={styles.actions}>
          <TextInput
            style={styles.quantity}
            placeholder="SL"
            keyboardType="numeric"
            value={defect.soLuong}
            editable={editable}
            onChangeText={(value) => onChange({ soLuong: value.replace(/\D/g, "") })}
          />
          {editable ? (
            <View style={styles.inlineButtons}>
              <TouchableOpacity style={styles.imageButton} onPress={onPickImages}>
                <Ionicons name="image-outline" size={18} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
                <Ionicons name="close" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>

      <Text style={styles.fieldLabel}>Công nhân ghi nhận lỗi</Text>
      <TextInput
        style={[styles.workerInput, !editable && styles.readOnly]}
        value={defect.tenCongNhan}
        editable={editable}
        placeholder="Có thể để trống"
        onChangeText={(value) => onChange({ tenCongNhan: value })}
      />

      <View style={styles.repairBox}>
        <Text style={styles.repairTitle}>Báo cáo sửa lỗi</Text>
        <View style={styles.repairRow}>
          <View style={styles.repairGroup}>
            <Text style={styles.label}>Đạt</Text>
            <TextInput style={styles.repairInput} placeholder="0" keyboardType="numeric" value={defect.soLuongDatSauSua} editable={editable} onChangeText={(value) => onChange({ soLuongDatSauSua: value.replace(/\D/g, "") })} />
          </View>
          <View style={styles.repairGroup}>
            <Text style={styles.label}>Không đạt</Text>
            <TextInput style={styles.repairInput} placeholder="0" keyboardType="numeric" value={defect.soLuongKhongDatSauSua} editable={editable} onChangeText={(value) => onChange({ soLuongKhongDatSauSua: value.replace(/\D/g, "") })} />
          </View>
        </View>
      </View>

      <Text style={styles.fieldLabel}>Ghi chú</Text>
      <TextInput style={[styles.noteInput, !editable && styles.readOnly]} multiline value={defect.ghiChu} editable={editable} onChangeText={(value) => onChange({ ghiChu: value })} />

      <View style={styles.images}>
        {(defect.imageUrls || []).map((uri, index) => (
          <View key={`${uri}-${index}`} style={styles.imageWrap}>
            <Image source={{ uri: resolveAssetUrl(uri) }} style={styles.thumb} />
            {editable ? <TouchableOpacity style={styles.imageRemove} onPress={() => removeSavedImage(index)}><Ionicons name="close-circle" size={20} color="#ef4444" /></TouchableOpacity> : null}
          </View>
        ))}
        {(defect.localImages || []).map((asset, index) => (
          <View key={`${asset.uri}-${index}`} style={styles.imageWrap}>
            <Image source={{ uri: asset.uri }} style={styles.thumb} />
            {editable ? <TouchableOpacity style={styles.imageRemove} onPress={() => removeLocalImage(index)}><Ionicons name="close-circle" size={20} color="#ef4444" /></TouchableOpacity> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: "#dbe5f1", borderRadius: 16, padding: 14, backgroundColor: "#fbfdff", marginBottom: 12 },
  compactRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  info: { flex: 1 },
  codeBadge: { alignSelf: "flex-start", backgroundColor: "#dbeafe", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 8 },
  code: { fontSize: 11, color: "#1d4ed8", fontWeight: "800" },
  name: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  description: { fontSize: 13, color: "#475569", marginTop: 6, lineHeight: 19 },
  type: { fontSize: 12, color: "#64748b", marginTop: 4, fontWeight: "600" },
  actions: { width: 96, alignItems: "center", gap: 10 },
  quantity: { width: 78, height: 48, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, textAlign: "center", fontSize: 20, fontWeight: "700", color: "#1d4ed8", backgroundColor: "#fff" },
  inlineButtons: { flexDirection: "row", gap: 8 },
  imageButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#eff6ff" },
  removeButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#fff5f5" },
  repairBox: { marginTop: 12, marginBottom: 12, padding: 12, borderRadius: 14, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0" },
  repairTitle: { fontSize: 13, fontWeight: "800", color: "#334155", marginBottom: 10 },
  repairRow: { flexDirection: "row", gap: 10 },
  repairGroup: { flex: 1 },
  label: { fontSize: 12, fontWeight: "700", color: "#64748b", marginBottom: 6 },
  repairInput: { height: 42, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, paddingHorizontal: 10, fontSize: 16, fontWeight: "700", color: "#0f172a", backgroundColor: "#fff", textAlign: "center" },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 8 },
  workerInput: { height: 42, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingHorizontal: 10, backgroundColor: "#fff", color: "#0f172a", marginBottom: 12 },
  noteInput: { minHeight: 76, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, padding: 12, backgroundColor: "#fff", textAlignVertical: "top" },
  readOnly: { backgroundColor: "#f1f5f9", color: "#64748b" },
  images: { flexDirection: "row", flexWrap: "wrap", marginTop: 12 },
  imageWrap: { marginRight: 12, marginBottom: 12, position: "relative" },
  thumb: { width: 76, height: 76, borderRadius: 12, borderWidth: 1, borderColor: "#cbd5e1" },
  imageRemove: { position: "absolute", top: -8, right: -8, backgroundColor: "#fff", borderRadius: 12 }
});
