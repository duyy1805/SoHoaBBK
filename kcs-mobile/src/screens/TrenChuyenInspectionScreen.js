import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  approveTrenChuyen,
  completeTrenChuyen,
  createTrenChuyenBienBan,
  getPhieuKiemDetail,
  updatePhieuKiemActualQuantity
} from "../api/phieuKiem.api";
import { getUser } from "../utils/auth";

const HOUR_OPTIONS = ["07:30", "08:30", "09:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30", "16:30"];

const getFieldValue = (fields = [], name) =>
  fields.find((field) => field?.FieldName === name)?.FieldValue ?? "";

const APPROVE_BOPHAN_FIELD = "TrenChuyen_ApproveBoPhanId";
const canEditStatus = (status) => !["HOAN_TAT", "CHO_TBP_DUYET", "CHO_KIEM_NGHIEM", "CHO_XUONG_XAC_NHAN"].includes(status);
const getStatusMeta = (status) => {
  switch (status) {
    case "TAO_MOI":
      return { label: "Chưa kiểm", bg: "#e0f2fe", color: "#0369a1" };
    case "DANG_KIEM":
      return { label: "Đang kiểm", bg: "#dbeafe", color: "#1d4ed8" };
    case "CHO_TBP_DUYET":
      return { label: "Chờ Trưởng bộ phận", bg: "#ede9fe", color: "#6d28d9" };
    case "HOAN_TAT":
      return { label: "Hoàn tất", bg: "#dcfce7", color: "#15803d" };
    case "CHO_KIEM_NGHIEM":
      return { label: "Chờ kiểm nghiệm", bg: "#ede9fe", color: "#6d28d9" };
    case "CHO_XUONG_XAC_NHAN":
      return { label: "Chờ Trưởng bộ phận", bg: "#fef3c7", color: "#b45309" };
    default:
      return { label: status || "---", bg: "#e2e8f0", color: "#475569" };
  }
};
const getSeverityCounts = (defects = []) => defects.reduce((acc, defect) => {
  const qty = Number(defect?.SoLuong) || 0;
  const type = String(defect?.DefectType || "").toUpperCase();
  if (type === "CRITICAL") acc.critical += qty;
  else if (type === "MAJOR") acc.major += qty;
  else acc.minor += qty;
  return acc;
}, { critical: 0, major: 0, minor: 0 });

export default function TrenChuyenInspectionScreen({ route, navigation }) {
  const { id } = route.params;

  const [user, setUser] = useState(null);
  const [phieu, setPhieu] = useState(null);
  const [slots, setSlots] = useState([]);
  const [dynamicFields, setDynamicFields] = useState([]);
  const [summary, setSummary] = useState(null);
  const [xacNhans, setXacNhans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hourModalVisible, setHourModalVisible] = useState(false);
  const [actualQuantity, setActualQuantity] = useState("");

  const canEdit = user?.permissions?.includes("THUC_HIEN_KIEM") && canEditStatus(phieu?.TrangThai);
  const approveBoPhanId = Number(getFieldValue(dynamicFields, APPROVE_BOPHAN_FIELD) || 0) || null;
  const canApprove = Boolean(
    phieu?.TrangThai === "CHO_TBP_DUYET" && (
      user?.permissions?.includes("QUAN_TRI_DM") || (
        user?.permissions?.includes("PHAN_CONG_NGUOI_XU_LY") &&
        approveBoPhanId &&
        Number(user?.boPhanId) === approveBoPhanId
      )
    )
  );
  const statusMeta = getStatusMeta(phieu?.TrangThai);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [detailRes, userInfo] = await Promise.all([
        getPhieuKiemDetail(id),
        getUser()
      ]);

      const data = detailRes.data || {};
      setPhieu(data.phieu || null);
      setActualQuantity(data.phieu?.SoLuongThucTe == null ? "" : String(data.phieu.SoLuongThucTe));
      setDynamicFields(data.dynamicFields || []);
      setSummary(data.summary || null);
      setXacNhans(Array.isArray(data.xacNhans) ? data.xacNhans : []);
      setUser(userInfo);
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch (error) {
      console.error("TrenChuyen load error:", error);
      Alert.alert("Lỗi", "Không thể tải phiếu kiểm trên chuyền.");
    } finally {
      setLoading(false);
    }
  };

  const remainingHours = useMemo(() => {
    const used = new Set((slots || []).map((slot) => slot.GioKiem));
    return HOUR_OPTIONS.filter((hour) => !used.has(hour));
  }, [slots]);

  const getSlotSummary = (slot) => {
    const entries = Array.isArray(slot.Entries) ? slot.Entries : [];
    const allDefects = entries.flatMap((entry) => entry.Defects || []);
    const defectRows = entries.reduce((sum, entry) => sum + ((entry.Defects || []).length), 0);
    const defectQty = entries.reduce(
      (sum, entry) => sum + (entry.Defects || []).reduce((inner, defect) => inner + (Number(defect.SoLuong) || 0), 0),
      0
    );
    const congDoanPreview = entries
      .map((entry) => entry.CongDoan)
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");

    return {
      entryCount: entries.length,
      defectRows,
      defectQty,
      congDoanPreview,
      severity: getSeverityCounts(allDefects)
    };
  };

  const overallSeverity = useMemo(() => {
    const allDefects = (slots || []).flatMap((slot) =>
      (slot.Entries || []).flatMap((entry) => entry.Defects || [])
    );
    return getSeverityCounts(allDefects);
  }, [slots]);

  const latestTbpApproval = useMemo(
    () => (xacNhans || []).find((item) => String(item?.VaiTro || "").toUpperCase() === "TBP"),
    [xacNhans]
  );

  const formatDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("vi-VN");
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

  const handleComplete = async () => {
    Alert.alert(
      "Hoàn tất phiếu",
      "Chọn kết luận thực tế trước khi chuyển phiếu sang bước duyệt của TBP.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đạt",
          onPress: async () => {
            try {
              setSaving(true);
              await completeTrenChuyen(id, "DAT");
              Alert.alert("Thành công", "Đã chuyển phiếu sang bước duyệt TBP.");
              await loadData();
            } catch (error) {
              console.error("TrenChuyen complete error:", error);
              Alert.alert("Lỗi", error?.response?.data?.message || "Không thể hoàn tất phiếu.");
            } finally {
              setSaving(false);
            }
          }
        },
        {
          text: "Không đạt",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              await completeTrenChuyen(id, "KHONG_DAT");
              Alert.alert("Thành công", "Đã chuyển phiếu sang bước duyệt TBP.");
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

  const handleApprove = async () => {
    Alert.alert(
      "Duyệt phiếu",
      "Xác nhận hoàn tất duyệt phiếu kiểm trên chuyền?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Duyệt",
          onPress: async () => {
            try {
              setSaving(true);
              await approveTrenChuyen(id);
              Alert.alert("Thành công", "Phiếu đã được TBP duyệt.");
              await loadData();
            } catch (error) {
              console.error("TrenChuyen approve error:", error);
              Alert.alert("Lỗi", error?.response?.data?.message || "Không thể duyệt phiếu.");
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const openSlot = (gioKiem) => {
    navigation.navigate("TrenChuyenSlotDetail", { id, gioKiem });
  };

  const saveActualQuantity = async () => {
    try {
      setSaving(true);
      const response = await updatePhieuKiemActualQuantity(id, actualQuantity === "" ? null : Number(actualQuantity));
      setPhieu((current) => ({ ...current, ...(response.data || {}) }));
    } catch (error) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không cập nhật được số lượng thực tế.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.content, canEdit ? styles.contentWithBottomBar : null]}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.soPhieu}>{phieu?.SoPhieu || "---"}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>
          </View>
          <Text style={styles.productText}>{getFieldValue(dynamicFields, "TrenChuyen_TenSanPham") || phieu?.TenSanPham || "---"}</Text>
          <Text style={styles.metaText}>Item code: {getFieldValue(dynamicFields, "TrenChuyen_MaSanPham") || phieu?.MaSanPham || "---"}</Text>
          <Text style={styles.metaText}>Đơn vị / chuyền: {getFieldValue(dynamicFields, "TrenChuyen_TenDonVi") || phieu?.DoiTuong || "---"} / {getFieldValue(dynamicFields, "TrenChuyen_TenBoPhan") || "---"}</Text>
          <Text style={styles.metaText}>Ngày kế hoạch: {getFieldValue(dynamicFields, "TrenChuyen_NgayKeHoach") ? new Date(getFieldValue(dynamicFields, "TrenChuyen_NgayKeHoach")).toLocaleDateString("vi-VN") : "---"}</Text>
          <Text style={styles.metaText}>KH: {getFieldValue(dynamicFields, "TrenChuyen_SoLuongKeHoach") || "---"} | NS dự kiến: {getFieldValue(dynamicFields, "TrenChuyen_NangSuatDuKien") || "---"} | Đã SX: {getFieldValue(dynamicFields, "TrenChuyen_DaSanXuat") || "---"}</Text>
          <View style={styles.actualRow}>
            <TextInput
              style={styles.actualInput}
              value={actualQuantity}
              editable={canEdit}
              keyboardType="numeric"
              placeholder="Số lượng thực tế (không bắt buộc)"
              placeholderTextColor="#64748b"
              onChangeText={(value) => setActualQuantity(value.replace(/\D/g, ""))}
            />
            {canEdit && <TouchableOpacity style={styles.actualSaveButton} disabled={saving} onPress={saveActualQuantity}><Text style={styles.actualSaveText}>Lưu</Text></TouchableOpacity>}
          </View>
          <Text style={styles.metaText}>Hiệu lực: {phieu?.SoLuongHieuLuc ?? phieu?.SoLuong ?? 0} | Chênh lệch: {phieu?.ChenhLechSoLuong ?? "Chưa nhập"}</Text>
        </View>

        {latestTbpApproval ? (
          <View style={styles.approvalCard}>
            <View style={styles.approvalIconWrap}>
              <Ionicons name="checkmark-done-circle-outline" size={18} color="#15803d" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.approvalTitle}>TBP đã xác nhận</Text>
              <Text style={styles.approvalText}>{latestTbpApproval.TenNguoiXacNhan || "Không rõ người xác nhận"}</Text>
              {latestTbpApproval.ThoiGian ? (
                <Text style={styles.approvalSubtext}>{formatDateTime(latestTbpApproval.ThoiGian)}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          {phieu?.BienBanId ? (
            <TouchableOpacity style={styles.primaryActionButton} onPress={() => navigation.navigate("BienBanDetail", { bienBanId: phieu.BienBanId })}>
              <Ionicons name="document-text-outline" size={18} color="#fff" />
              <Text style={styles.primaryActionText}>Xem biên bản KPH</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.secondaryActionButton} onPress={handleCreateBienBan} disabled={saving}>
              <Ionicons name="add-circle-outline" size={18} color="#2563eb" />
              <Text style={styles.secondaryActionText}>Sinh biên bản</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Tổng hợp</Text>
          <View style={styles.summaryHero}>
            <Text style={styles.summaryHeroValue}>{summary?.TotalDefectQuantity || 0}</Text>
            <Text style={styles.summaryHeroLabel}>Tổng số lỗi ghi nhận</Text>
          </View>
          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatPill}>
              <Text style={styles.summaryStatValue}>{summary?.TotalSlots || 0}</Text>
              <Text style={styles.summaryStatLabel}>Khung giờ</Text>
            </View>
            <View style={styles.summaryStatPill}>
              <Text style={styles.summaryStatValue}>{summary?.TotalEntries || 0}</Text>
              <Text style={styles.summaryStatLabel}>Công đoạn</Text>
            </View>
            <View style={styles.summaryStatPill}>
              <Text style={styles.summaryStatValue}>{summary?.TotalDefectRows || 0}</Text>
              <Text style={styles.summaryStatLabel}>Dòng lỗi</Text>
            </View>
          </View>
          <View style={styles.summarySeverityBlock}>
            <Text style={styles.summarySeverityTitle}>Theo mức độ</Text>
            <View style={styles.severityRow}>
              <View style={[styles.severityChip, styles.severityMinor]}>
                <Text style={[styles.severityValue, styles.severityMinorText]}>{overallSeverity.minor}</Text>
                <Text style={[styles.severityLabel, styles.severityMinorText]}>Nhẹ</Text>
              </View>
              <View style={[styles.severityChip, styles.severityMajor]}>
                <Text style={[styles.severityValue, styles.severityMajorText]}>{overallSeverity.major}</Text>
                <Text style={[styles.severityLabel, styles.severityMajorText]}>Nặng</Text>
              </View>
              <View style={[styles.severityChip, styles.severityCritical]}>
                <Text style={[styles.severityValue, styles.severityCriticalText]}>{overallSeverity.critical}</Text>
                <Text style={[styles.severityLabel, styles.severityCriticalText]}>Nghiêm trọng</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Khung giờ ghi nhận</Text>
            {canEdit ? (
              <TouchableOpacity style={styles.inlineAddButton} onPress={() => setHourModalVisible(true)} disabled={remainingHours.length === 0}>
                <Ionicons name="add-circle-outline" size={18} color="#2563eb" />
                <Text style={styles.inlineAddButtonText}>Thêm giờ</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {(slots || []).length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Chưa có khung giờ nào được ghi nhận.</Text>
            </View>
          ) : (
            (slots || [])
              .slice()
              .sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0))
              .map((slot) => {
                const info = getSlotSummary(slot);
                return (
                  <TouchableOpacity key={slot.Id || slot.GioKiem} style={styles.slotCard} activeOpacity={0.85} onPress={() => openSlot(slot.GioKiem)}>
                    <View style={styles.slotCardHeader}>
                      <Text style={styles.slotTitle}>Khung giờ {slot.GioKiem}</Text>
                      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                    </View>
                    <View style={styles.slotMetricRow}>
                      <View style={styles.slotMetricChip}>
                        <Text style={styles.slotMetricValue}>{info.entryCount}</Text>
                        <Text style={styles.slotMetricLabel}>Công đoạn</Text>
                      </View>
                      <View style={styles.slotMetricChip}>
                        <Text style={styles.slotMetricValue}>{info.defectRows}</Text>
                        <Text style={styles.slotMetricLabel}>Dòng lỗi</Text>
                      </View>
                      <View style={styles.slotMetricChip}>
                        <Text style={styles.slotMetricValue}>{info.defectQty}</Text>
                        <Text style={styles.slotMetricLabel}>Tổng lỗi</Text>
                      </View>
                    </View>
                    <View style={styles.severityRow}>
                      <View style={[styles.severityChip, styles.severityMinor]}>
                        <Text style={[styles.severityValue, styles.severityMinorText]}>{info.severity.minor}</Text>
                        <Text style={[styles.severityLabel, styles.severityMinorText]}>Nhẹ</Text>
                      </View>
                      <View style={[styles.severityChip, styles.severityMajor]}>
                        <Text style={[styles.severityValue, styles.severityMajorText]}>{info.severity.major}</Text>
                        <Text style={[styles.severityLabel, styles.severityMajorText]}>Nặng</Text>
                      </View>
                      <View style={[styles.severityChip, styles.severityCritical]}>
                        <Text style={[styles.severityValue, styles.severityCriticalText]}>{info.severity.critical}</Text>
                        <Text style={[styles.severityLabel, styles.severityCriticalText]}>Nghiêm trọng</Text>
                      </View>
                    </View>
                    {info.congDoanPreview ? (
                      <Text style={styles.slotPreview}>Công đoạn: {info.congDoanPreview}</Text>
                    ) : (
                      <Text style={styles.slotPreviewEmpty}>Chưa nhập lỗi cho khung giờ này</Text>
                    )}
                  </TouchableOpacity>
                );
              })
          )}
        </View>

      </ScrollView>

      {canEdit || canApprove ? (
        <View style={styles.bottomActionBar}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={canApprove ? handleApprove : handleComplete}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.primaryButtonText}>{canApprove ? "Duyệt phiếu" : "Hoàn tất phiếu"}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

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
                <TouchableOpacity key={hour} style={styles.modalOption} onPress={() => {
                  setHourModalVisible(false);
                  openSlot(hour);
                }}>
                  <Text style={styles.modalOptionText}>{hour}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fb" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 16 },
  contentWithBottomBar: { paddingBottom: 108 },
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  soPhieu: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  statusBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  statusBadgeText: { fontWeight: "700", fontSize: 12 },
  productText: { fontSize: 18, fontWeight: "700", color: "#111827" },
  metaText: { fontSize: 14, color: "#475569", marginTop: 6, lineHeight: 21 },
  approvalCard: {
    backgroundColor: "#ecfdf5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start"
  },
  approvalIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center"
  },
  approvalTitle: { fontSize: 12, fontWeight: "700", color: "#15803d", textTransform: "uppercase" },
  approvalText: { fontSize: 15, fontWeight: "700", color: "#14532d", marginTop: 3 },
  approvalSubtext: { fontSize: 13, color: "#166534", marginTop: 2 },
  actionRow: { flexDirection: "row", gap: 12 },
  primaryActionButton: {
    flex: 1,
    minHeight: 48,
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  primaryActionText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryActionButton: {
    flex: 1,
    minHeight: 48,
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe"
  },
  secondaryActionText: { color: "#2563eb", fontWeight: "700", fontSize: 15 },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  sectionBlock: { backgroundColor: "#fff", borderRadius: 16, padding: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  summaryHero: {
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  summaryHeroValue: { fontSize: 36, lineHeight: 40, fontWeight: "800", color: "#0f172a" },
  summaryHeroLabel: { marginTop: 6, color: "#64748b", fontSize: 14, fontWeight: "600" },
  summaryStatsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  summaryStatPill: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  summaryStatValue: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  summaryStatLabel: { marginTop: 3, color: "#64748b", fontSize: 12, fontWeight: "600" },
  summarySeverityBlock: { marginTop: 14 },
  summarySeverityTitle: { fontSize: 12, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 8 },
  inlineAddButton: { flexDirection: "row", alignItems: "center", gap: 6 },
  inlineAddButtonText: { color: "#2563eb", fontWeight: "600" },
  slotCard: {
    borderWidth: 1,
    borderColor: "#dbe5f1",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fbfdff"
  },
  slotCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  actualRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  actualInput: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, paddingHorizontal: 12, backgroundColor: "#fff", color: "#0f172a" },
  actualSaveButton: { minWidth: 58, borderRadius: 10, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center" },
  actualSaveText: { color: "#fff", fontWeight: "700" },
  slotTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  slotMetricRow: { flexDirection: "row", gap: 8, marginTop: 4, marginBottom: 10 },
  slotMetricChip: {
    flex: 1,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#dbeafe"
  },
  slotMetricValue: { color: "#1d4ed8", fontSize: 16, fontWeight: "800" },
  slotMetricLabel: { color: "#64748b", fontSize: 11, marginTop: 2, fontWeight: "600" },
  slotPreview: { marginTop: 4, color: "#0f172a", fontWeight: "500", lineHeight: 20 },
  slotPreviewEmpty: { marginTop: 8, color: "#94a3b8", fontStyle: "italic" },
  severityRow: { flexDirection: "row", gap: 8, marginTop: 2, marginBottom: 2 },
  severityChip: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1
  },
  severityValue: { fontSize: 16, fontWeight: "800" },
  severityLabel: { marginTop: 2, fontSize: 11, fontWeight: "700" },
  severityMinor: { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" },
  severityMinorText: { color: "#64748b" },
  severityMajor: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  severityMajorText: { color: "#c2410c" },
  severityCritical: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  severityCriticalText: { color: "#b91c1c" },
  emptyCard: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 16 },
  emptyText: { color: "#64748b", fontStyle: "italic" },
  bottomActionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    minHeight: 52,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563eb",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.35)", justifyContent: "center", padding: 16 },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  modalOption: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8 },
  modalOptionText: { fontSize: 14, fontWeight: "600", color: "#0f172a" }
});
