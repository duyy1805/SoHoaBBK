// src/components/SectionConfigModal.js

import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { getSanPhamNhomKiem, getInspectionLevels } from "../api/lookup.api";
import { createAllSection } from "../api/phieuKiem.api";
import KeyboardFormScrollView from "./KeyboardFormScrollView";

export default function SectionConfigModal({ visible, onClose, phieuId, sanPhamId, initialLotSize, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nhomConfigs, setNhomConfigs] = useState([]);
  const [levels, setLevels] = useState([]);

  useEffect(() => {
    if (visible && sanPhamId) {
      loadConfigs();
    }
  }, [visible, sanPhamId]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const [nhomRes, levelsRes] = await Promise.all([
        getSanPhamNhomKiem(sanPhamId),
        getInspectionLevels(),
      ]);

      const configs = nhomRes.data.map((n) => ({
        nhomKiemId: n.NhomKiemId,
        tenNhom: n.TenNhom,
        lotSize: String(initialLotSize || 0),
        inspectionLevel: "II",
      }));

      setNhomConfigs(configs);
      setLevels(levelsRes.data);
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Không thể tải cấu hình nhóm kiểm");
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (index, field, value) => {
    const newConfigs = [...nhomConfigs];
    newConfigs[index][field] = value;
    setNhomConfigs(newConfigs);
  };

  const handleSelectInspectionLevel = (index, value) => {
    if (index === 0) {
      setNhomConfigs((currentConfigs) =>
        currentConfigs.map((config) => ({
          ...config,
          inspectionLevel: value,
        }))
      );
      return;
    }

    updateConfig(index, "inspectionLevel", value);
  };

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      const payload = {
        phieuKiemId: phieuId,
        sections: nhomConfigs.map((n) => ({
          nhomKiemId: n.nhomKiemId,
          lotSize: Number(n.lotSize),
          inspectionLevel: n.inspectionLevel,
        })),
      };
      await createAllSection(payload);
      Alert.alert("Thành công", "Đã cập nhật các nhóm kiểm");
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Lỗi từ server:", err.response?.data || err.message);
      Alert.alert("Lỗi", "Không thể cập nhật nhóm kiểm");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalContent}
          keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
        >
          <View style={styles.header}>
            <Text style={styles.modalTitle}>Thiết lập nhóm kiểm</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>Đóng</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 40 }} />
          ) : (
            <KeyboardFormScrollView
              style={styles.configList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.configListContent}
            >
              {nhomConfigs.map((n, index) => (
                <View key={n.nhomKiemId} style={styles.configItem}>
                  <Text style={styles.nhomName}>{n.tenNhom}</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Số lượng lô (Lot Size)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={n.lotSize}
                      onChangeText={(val) => updateConfig(index, "lotSize", val)}
                      placeholder="Nhập số lượng..."
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Mức kiểm tra (Inspection Level)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.levelScroll}>
                      {levels.map((lv) => (
                        <TouchableOpacity
                          key={lv.InspectionLevel}
                          style={[
                            styles.levelChip,
                            n.inspectionLevel === lv.InspectionLevel && styles.levelChipSelected
                          ]}
                          onPress={() => handleSelectInspectionLevel(index, lv.InspectionLevel)}
                        >
                          <Text style={[
                            styles.levelText,
                            n.inspectionLevel === lv.InspectionLevel && styles.levelTextSelected
                          ]}>
                            {lv.InspectionLevel}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              ))}
            </KeyboardFormScrollView>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.confirmBtn, (submitting || loading || nhomConfigs.length === 0) && styles.disabledBtn]}
              onPress={handleConfirm}
              disabled={submitting || loading || nhomConfigs.length === 0}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmText}>Tạo các nhóm kiểm</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
  },
  closeText: {
    color: "#64748b",
    fontSize: 16,
  },
  configList: {
    marginBottom: 20,
  },
  configListContent: {
    paddingBottom: 24,
  },
  configItem: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  nhomName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    color: "#1e293b",
    borderLeftWidth: 4,
    borderLeftColor: "#2563eb",
    paddingLeft: 10,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1e293b",
    height: 48,
  },
  levelScroll: {
    flexDirection: "row",
  },
  levelChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  levelChipSelected: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  levelText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "600",
  },
  levelTextSelected: {
    color: "#fff",
  },
  footer: {
    paddingBottom: 20,
  },
  confirmBtn: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  disabledBtn: {
    backgroundColor: "#94a3b8",
  },
});
