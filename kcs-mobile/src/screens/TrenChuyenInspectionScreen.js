import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  completeTrenChuyen,
  createTrenChuyenBienBan,
  getDefectList,
  getPhieuKiemDetail,
  saveTrenChuyenData
} from "../api/phieuKiem.api";
import { getUser } from "../utils/auth";

const HOUR_OPTIONS = ["07:30", "08:30", "09:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30", "16:30"];

const getFieldValue = (fields = [], name) =>
  fields.find((field) => field?.FieldName === name)?.FieldValue ?? "";

const canEditStatus = (status) => !["HOAN_TAT", "CHO_KIEM_NGHIEM", "CHO_XUONG_XAC_NHAN"].includes(status);

const createEmptySlot = (gioKiem, index = 0) => ({
  localId: `slot-${gioKiem}-${Date.now()}`,
  gioKiem,
  sortOrder: index + 1,
  entries: []
});

const createEmptyEntry = (index = 0) => ({
  localId: `entry-${Date.now()}-${index}`,
  congDoan: "",
  ghiChu: "",
  sortOrder: index + 1,
  defects: []
});

export default function TrenChuyenInspectionScreen({ route, navigation }) {
  const { id } = route.params;

  const [user, setUser] = useState(null);
  const [phieu, setPhieu] = useState(null);
  const [slots, setSlots] = useState([]);
  const [dynamicFields, setDynamicFields] = useState([]);
  const [summary, setSummary] = useState(null);
  const [defectCatalog, setDefectCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defectModalVisible, setDefectModalVisible] = useState(false);
  const [hourModalVisible, setHourModalVisible] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState(-1);
  const [activeEntryIndex, setActiveEntryIndex] = useState(-1);
  const [defectSearch, setDefectSearch] = useState("");

  const canEdit = user?.permissions?.includes("THUC_HIEN_KIEM") && canEditStatus(phieu?.TrangThai);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [detailRes, defectRes, userInfo] = await Promise.all([
        getPhieuKiemDetail(id),
        getDefectList(),
        getUser()
      ]);

      const data = detailRes.data || {};
      setPhieu(data.phieu || null);
      setDynamicFields(data.dynamicFields || []);
      setSummary(data.summary || null);
      setUser(userInfo);

      const defects = Array.isArray(defectRes.data) ? defectRes.data : [];
      setDefectCatalog(defects);

      const nextSlots = Array.isArray(data.slots) ? data.slots.map((slot, slotIndex) => ({
        localId: slot.Id || `slot-${slot.GioKiem}-${slotIndex}`,
        id: slot.Id,
        gioKiem: slot.GioKiem || "",
        sortOrder: slot.SortOrder || slotIndex + 1,
        entries: Array.isArray(slot.Entries) ? slot.Entries.map((entry, entryIndex) => ({
          localId: entry.Id || `entry-${slot.Id || slotIndex}-${entryIndex}`,
          id: entry.Id,
          congDoan: entry.CongDoan || "",
          ghiChu: entry.GhiChu || "",
          sortOrder: entry.SortOrder || entryIndex + 1,
          defects: Array.isArray(entry.Defects) ? entry.Defects.map((defect, defectIndex) => ({
            localId: defect.Id || `defect-${entry.Id || entryIndex}-${defectIndex}`,
            id: defect.Id,
            defectId: defect.DefectId,
            MaLoi: defect.MaLoi,
            TenLoi: defect.TenLoi,
            DefectType: defect.DefectType,
            soLuong: defect.SoLuong != null ? String(defect.SoLuong) : "",
            ghiChu: defect.GhiChu || ""
          })) : []
        })) : []
      })) : [];

      setSlots(nextSlots);
    } catch (error) {
      console.error("TrenChuyen load error:", error);
      Alert.alert("Lỗi", "Không thể tải phiếu kiểm trên chuyền.");
    } finally {
      setLoading(false);
    }
  };

  const filteredDefects = useMemo(() => {
    const keyword = defectSearch.trim().toLowerCase();
    if (!keyword) return defectCatalog;
    return defectCatalog.filter((item) =>
      String(item?.MaLoi || "").toLowerCase().includes(keyword) ||
      String(item?.TenLoi || "").toLowerCase().includes(keyword) ||
      String(item?.MoTa || "").toLowerCase().includes(keyword)
    );
  }, [defectCatalog, defectSearch]);

  const remainingHours = useMemo(() => {
    const used = new Set(slots.map((slot) => slot.gioKiem));
    return HOUR_OPTIONS.filter((hour) => !used.has(hour));
  }, [slots]);

  const updateSlotEntry = (slotIndex, entryIndex, patch) => {
    setSlots((prev) => prev.map((slot, currentSlotIndex) => {
      if (currentSlotIndex !== slotIndex) return slot;
      return {
        ...slot,
        entries: slot.entries.map((entry, currentEntryIndex) => (
          currentEntryIndex === entryIndex ? { ...entry, ...patch } : entry
        ))
      };
    }));
  };

  const addSlot = (gioKiem) => {
    setSlots((prev) => [...prev, createEmptySlot(gioKiem, prev.length)]);
    setHourModalVisible(false);
  };

  const removeSlot = (slotIndex) => {
    setSlots((prev) => prev
      .filter((_, index) => index !== slotIndex)
      .map((slot, index) => ({ ...slot, sortOrder: index + 1 }))
    );
  };

  const addEntry = (slotIndex) => {
    setSlots((prev) => prev.map((slot, index) => (
      index === slotIndex
        ? {
            ...slot,
            entries: [...slot.entries, createEmptyEntry(slot.entries.length)]
          }
        : slot
    )));
  };

  const removeEntry = (slotIndex, entryIndex) => {
    setSlots((prev) => prev.map((slot, index) => (
      index === slotIndex
        ? {
            ...slot,
            entries: slot.entries
              .filter((_, currentEntryIndex) => currentEntryIndex !== entryIndex)
              .map((entry, currentEntryIndex) => ({ ...entry, sortOrder: currentEntryIndex + 1 }))
          }
        : slot
    )));
  };

  const openDefectModal = (slotIndex, entryIndex) => {
    setActiveSlotIndex(slotIndex);
    setActiveEntryIndex(entryIndex);
    setDefectSearch("");
    setDefectModalVisible(true);
  };

  const addDefectToEntry = (defect) => {
    if (activeSlotIndex < 0 || activeEntryIndex < 0) return;

    setSlots((prev) => prev.map((slot, slotIndex) => {
      if (slotIndex !== activeSlotIndex) return slot;
      return {
        ...slot,
        entries: slot.entries.map((entry, entryIndex) => {
          if (entryIndex !== activeEntryIndex) return entry;

          const existingIndex = entry.defects.findIndex((item) => Number(item.defectId) === Number(defect.Id));
          if (existingIndex >= 0) {
            const nextDefects = [...entry.defects];
            const current = Number(nextDefects[existingIndex].soLuong || 0);
            nextDefects[existingIndex] = { ...nextDefects[existingIndex], soLuong: String(current + 1) };
            return { ...entry, defects: nextDefects };
          }

          return {
            ...entry,
            defects: [
              ...entry.defects,
              {
                localId: `defect-${Date.now()}-${defect.Id}`,
                defectId: defect.Id,
                MaLoi: defect.MaLoi,
                TenLoi: defect.TenLoi,
                DefectType: defect.DefectType,
                soLuong: "1",
                ghiChu: ""
              }
            ]
          };
        })
      };
    }));
  };

  const updateDefect = (slotIndex, entryIndex, defectIndex, patch) => {
    setSlots((prev) => prev.map((slot, currentSlotIndex) => {
      if (currentSlotIndex !== slotIndex) return slot;
      return {
        ...slot,
        entries: slot.entries.map((entry, currentEntryIndex) => {
          if (currentEntryIndex !== entryIndex) return entry;
          return {
            ...entry,
            defects: entry.defects.map((defect, currentDefectIndex) => (
              currentDefectIndex === defectIndex ? { ...defect, ...patch } : defect
            ))
          };
        })
      };
    }));
  };

  const removeDefect = (slotIndex, entryIndex, defectIndex) => {
    setSlots((prev) => prev.map((slot, currentSlotIndex) => {
      if (currentSlotIndex !== slotIndex) return slot;
      return {
        ...slot,
        entries: slot.entries.map((entry, currentEntryIndex) => (
          currentEntryIndex === entryIndex
            ? { ...entry, defects: entry.defects.filter((_, currentDefectIndex) => currentDefectIndex !== defectIndex) }
            : entry
        ))
      };
    }));
  };

  const buildPayloadSlots = () => slots.map((slot, slotIndex) => ({
    gioKiem: slot.gioKiem,
    sortOrder: slotIndex + 1,
    entries: (slot.entries || []).map((entry, entryIndex) => ({
      congDoan: String(entry.congDoan || "").trim(),
      ghiChu: String(entry.ghiChu || "").trim(),
      sortOrder: entryIndex + 1,
      defects: (entry.defects || [])
        .filter((defect) => Number(defect.defectId) > 0 && Number(defect.soLuong) > 0)
        .map((defect, defectIndex) => ({
          defectId: Number(defect.defectId),
          soLuong: Number(defect.soLuong || 0),
          ghiChu: String(defect.ghiChu || "").trim(),
          sortOrder: defectIndex + 1
        }))
    }))
  }));

  const validateSlots = (payloadSlots, { requireData = false } = {}) => {
    const seenHours = new Set();
    let hasData = false;

    for (const slot of payloadSlots) {
      if (!slot.gioKiem) {
        return "Khung giờ không hợp lệ.";
      }
      if (!HOUR_OPTIONS.includes(slot.gioKiem)) {
        return "Khung giờ phải nằm trong danh sách cố định.";
      }
      if (seenHours.has(slot.gioKiem)) {
        return "Không được trùng khung giờ trong cùng một phiếu.";
      }
      seenHours.add(slot.gioKiem);

      for (const entry of slot.entries || []) {
        const validDefects = (entry.defects || []).filter((defect) => defect.defectId > 0 && defect.soLuong > 0);
        if (validDefects.length === 0) {
          continue;
        }
        hasData = true;
        if (!entry.congDoan) {
          return `Khung giờ ${slot.gioKiem} có công đoạn chưa nhập.`;
        }
      }
    }

    if (requireData && !hasData) {
      return "Cần có ít nhất một công đoạn có lỗi để hoàn tất phiếu.";
    }

    return "";
  };

  const handleSave = async (showSuccess = true) => {
    const payloadSlots = buildPayloadSlots();
    const validationMessage = validateSlots(payloadSlots);
    if (validationMessage) {
      Alert.alert("Dữ liệu chưa hợp lệ", validationMessage);
      return false;
    }

    try {
      setSaving(true);
      await saveTrenChuyenData({
        phieuKiemId: id,
        slots: payloadSlots
      });
      if (showSuccess) {
        Alert.alert("Thành công", "Đã lưu phiếu kiểm trên chuyền.");
      }
      await loadData();
      return true;
    } catch (error) {
      console.error("TrenChuyen save error:", error);
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể lưu dữ liệu.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    const payloadSlots = buildPayloadSlots();
    const validationMessage = validateSlots(payloadSlots, { requireData: true });
    if (validationMessage) {
      Alert.alert("Dữ liệu chưa hợp lệ", validationMessage);
      return;
    }

    const saved = await handleSave(false);
    if (!saved) return;

    Alert.alert(
      "Hoàn tất phiếu",
      "Hoàn tất phiếu kiểm trên chuyền? Dữ liệu sẽ được chốt nhưng chưa tự sinh biên bản.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Hoàn tất",
          onPress: async () => {
            try {
              setSaving(true);
              await completeTrenChuyen(id);
              Alert.alert("Thành công", "Đã hoàn tất phiếu kiểm trên chuyền.");
              await loadData();
            } catch (error) {
              console.error("TrenChuyen complete error:", error);
              Alert.alert("Lỗi", error?.response?.data?.message || "Không thể hoàn tất phiếu.");
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleCreateBienBan = async () => {
    try {
      setSaving(true);
      const res = await createTrenChuyenBienBan(id);
      const bienBanId = res?.data?.bienBanId;
      Alert.alert("Thành công", "Đã sinh biên bản xử lý.");
      await loadData();
      if (bienBanId) {
        navigation.navigate("BienBanDetail", { bienBanId });
      }
    } catch (error) {
      console.error("TrenChuyen create bien ban error:", error);
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể sinh biên bản.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.soPhieu}>{phieu?.SoPhieu || "---"}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{phieu?.TrangThai || "---"}</Text>
            </View>
          </View>
          <Text style={styles.productText}>{getFieldValue(dynamicFields, "TrenChuyen_TenSanPham") || phieu?.TenSanPham || "---"}</Text>
          <Text style={styles.metaText}>Item code: {getFieldValue(dynamicFields, "TrenChuyen_MaSanPham") || phieu?.MaSanPham || "---"}</Text>
          <Text style={styles.metaText}>Đơn vị / chuyền: {getFieldValue(dynamicFields, "TrenChuyen_TenDonVi") || phieu?.DoiTuong || "---"} / {getFieldValue(dynamicFields, "TrenChuyen_TenBoPhan") || "---"}</Text>
          <Text style={styles.metaText}>Ngày kế hoạch: {getFieldValue(dynamicFields, "TrenChuyen_NgayKeHoach") ? new Date(getFieldValue(dynamicFields, "TrenChuyen_NgayKeHoach")).toLocaleDateString("vi-VN") : "---"}</Text>
          <Text style={styles.metaText}>KH: {getFieldValue(dynamicFields, "TrenChuyen_SoLuongKeHoach") || "---"} | NS dự kiến: {getFieldValue(dynamicFields, "TrenChuyen_NangSuatDuKien") || "---"} | Đã SX: {getFieldValue(dynamicFields, "TrenChuyen_DaSanXuat") || "---"}</Text>

          {phieu?.BienBanId ? (
            <TouchableOpacity style={styles.bienBanButton} onPress={() => navigation.navigate("BienBanDetail", { bienBanId: phieu.BienBanId })}>
              <Text style={styles.bienBanButtonText}>Xem biên bản KPH</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.bienBanButton} onPress={handleCreateBienBan} disabled={saving}>
              <Text style={styles.bienBanButtonText}>Sinh biên bản</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Tổng hợp</Text>
          <Text style={styles.summaryText}>Khung giờ: {summary?.TotalSlots || 0}</Text>
          <Text style={styles.summaryText}>Công đoạn: {summary?.TotalEntries || 0}</Text>
          <Text style={styles.summaryText}>Dòng lỗi: {summary?.TotalDefectRows || 0}</Text>
          <Text style={styles.summaryText}>Tổng số lỗi: {summary?.TotalDefectQuantity || 0}</Text>
        </View>

        {slots.map((slot, slotIndex) => (
          <View key={slot.localId} style={styles.slotCard}>
            <View style={styles.slotHeader}>
              <Text style={styles.slotTitle}>Khung giờ {slot.gioKiem}</Text>
              {canEdit ? (
                <TouchableOpacity onPress={() => removeSlot(slotIndex)}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              ) : null}
            </View>

            {(slot.entries || []).length === 0 ? (
              <Text style={styles.emptyText}>Khung giờ này chưa có công đoạn lỗi.</Text>
            ) : (slot.entries || []).map((entry, entryIndex) => (
              <View key={entry.localId} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>Công đoạn {entryIndex + 1}</Text>
                  {canEdit ? (
                    <TouchableOpacity onPress={() => removeEntry(slotIndex, entryIndex)}>
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Công đoạn, ví dụ: 1.2 / 2.3"
                  value={entry.congDoan}
                  onChangeText={(value) => updateSlotEntry(slotIndex, entryIndex, { congDoan: value })}
                  editable={canEdit}
                />

                <View style={styles.defectHeader}>
                  <Text style={styles.defectTitle}>Lỗi ghi nhận</Text>
                  {canEdit ? (
                    <TouchableOpacity style={styles.addDefectButton} onPress={() => openDefectModal(slotIndex, entryIndex)}>
                      <Ionicons name="add-circle-outline" size={18} color="#2563eb" />
                      <Text style={styles.addDefectText}>Thêm lỗi</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {(entry.defects || []).length === 0 ? (
                  <Text style={styles.emptyText}>Chưa có lỗi trong công đoạn này.</Text>
                ) : (entry.defects || []).map((defect, defectIndex) => (
                  <View key={defect.localId} style={styles.defectCard}>
                    <View style={styles.defectCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.defectName}>{defect.MaLoi || "---"} - {defect.TenLoi || "---"}</Text>
                        <Text style={styles.defectType}>{defect.DefectType || "---"}</Text>
                      </View>
                      {canEdit ? (
                        <TouchableOpacity onPress={() => removeDefect(slotIndex, entryIndex, defectIndex)}>
                          <Ionicons name="close-circle" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Số lượng lỗi"
                      keyboardType="numeric"
                      value={defect.soLuong}
                      onChangeText={(value) => updateDefect(slotIndex, entryIndex, defectIndex, { soLuong: value })}
                      editable={canEdit}
                    />
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Ghi chú lỗi"
                      multiline
                      value={defect.ghiChu}
                      onChangeText={(value) => updateDefect(slotIndex, entryIndex, defectIndex, { ghiChu: value })}
                      editable={canEdit}
                    />
                  </View>
                ))}

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ghi chú công đoạn"
                  multiline
                  value={entry.ghiChu}
                  onChangeText={(value) => updateSlotEntry(slotIndex, entryIndex, { ghiChu: value })}
                  editable={canEdit}
                />
              </View>
            ))}

            {canEdit ? (
              <TouchableOpacity style={styles.inlineAddButton} onPress={() => addEntry(slotIndex)}>
                <Ionicons name="add-circle-outline" size={18} color="#2563eb" />
                <Text style={styles.inlineAddButtonText}>Thêm công đoạn</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}

        {canEdit ? (
          <>
            <TouchableOpacity style={styles.outlineButton} onPress={() => setHourModalVisible(true)} disabled={remainingHours.length === 0}>
              <Ionicons name="time-outline" size={18} color="#2563eb" />
              <Text style={styles.outlineButtonText}>Thêm khung giờ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => handleSave(true)} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Lưu nháp</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryButton, styles.completeButton]} onPress={handleComplete} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Hoàn tất phiếu</Text>}
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>

      <Modal visible={hourModalVisible} animationType="slide" onRequestClose={() => setHourModalVisible(false)} transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn khung giờ</Text>
              <TouchableOpacity onPress={() => setHourModalVisible(false)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
              {remainingHours.length === 0 ? (
                <Text style={styles.emptyText}>Đã dùng hết các khung giờ.</Text>
              ) : remainingHours.map((hour) => (
                <TouchableOpacity key={hour} style={styles.modalOption} onPress={() => addSlot(hour)}>
                  <Text style={styles.modalOptionText}>{hour}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={defectModalVisible} animationType="slide" onRequestClose={() => setDefectModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn lỗi</Text>
            <TouchableOpacity onPress={() => setDefectModalVisible(false)}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Tìm mã lỗi / tên lỗi"
            value={defectSearch}
            onChangeText={setDefectSearch}
          />
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {filteredDefects.map((defect) => (
              <TouchableOpacity
                key={defect.Id}
                style={styles.modalDefectItem}
                onPress={() => {
                  addDefectToEntry(defect);
                  setDefectModalVisible(false);
                }}
              >
                <Text style={styles.modalDefectCode}>{defect.MaLoi || "---"}</Text>
                <Text style={styles.modalDefectName}>{defect.TenLoi || "---"}</Text>
                <Text style={styles.modalDefectMeta}>{defect.DefectType || "---"}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc"
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  content: {
    padding: 16,
    gap: 16
  },
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  soPhieu: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a"
  },
  statusBadge: {
    backgroundColor: "#dbeafe",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  statusBadgeText: {
    color: "#1d4ed8",
    fontWeight: "600"
  },
  productText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827"
  },
  metaText: {
    fontSize: 13,
    color: "#475569",
    marginTop: 4
  },
  bienBanButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#0f172a",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10
  },
  bienBanButtonText: {
    color: "#fff",
    fontWeight: "600"
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8
  },
  summaryText: {
    color: "#334155",
    marginBottom: 4
  },
  slotCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16
  },
  slotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  slotTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a"
  },
  entryCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b"
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
    marginBottom: 10
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: "top"
  },
  defectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  defectTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a"
  },
  addDefectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  addDefectText: {
    color: "#2563eb",
    fontWeight: "600"
  },
  defectCard: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#f8fbff",
    marginBottom: 10
  },
  defectCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  defectName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a"
  },
  defectType: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2
  },
  emptyText: {
    color: "#64748b",
    fontStyle: "italic"
  },
  inlineAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  inlineAddButtonText: {
    color: "#2563eb",
    fontWeight: "600"
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  outlineButtonText: {
    color: "#2563eb",
    fontWeight: "700"
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  completeButton: {
    backgroundColor: "#0f172a"
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700"
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "center",
    padding: 16
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    maxHeight: "70%"
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a"
  },
  modalOption: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a"
  },
  modalDefectItem: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff"
  },
  modalDefectCode: {
    fontSize: 12,
    color: "#1d4ed8",
    fontWeight: "700"
  },
  modalDefectName: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
    marginTop: 2
  },
  modalDefectMeta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2
  }
});
