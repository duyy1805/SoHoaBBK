import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  approveCuoiChuyen,
  completeCuoiChuyen,
  createCuoiChuyenBienBan,
  getPhieuKiemDetail
} from "../api/phieuKiem.api";
import { getUser } from "../utils/auth";

const APPROVE_BOPHAN_FIELD = "CuoiChuyen_ApproveBoPhanId";
const COMPLETED_BY_FIELD = "CuoiChuyen_CompletedByUserId";
const getFieldValue = (fields = [], name) =>
  fields.find((field) => field?.FieldName === name)?.FieldValue ?? "";
const getUserId = (value) => Number(value?.id || value?.userId || value?.UserId || 0) || null;
const canEditStatus = (status) => !["HOAN_TAT", "CHO_TBP_DUYET", "CHO_KIEM_NGHIEM", "CHO_XUONG_XAC_NHAN"].includes(status);

const getStatusMeta = (status) => {
  switch (status) {
    case "TAO_MOI":
      return { label: "Chưa kiểm", bg: "#e0f2fe", color: "#0369a1" };
    case "DANG_KIEM":
      return { label: "Đang kiểm", bg: "#dbeafe", color: "#1d4ed8" };
    case "CHO_TBP_DUYET":
      return { label: "Chờ TBP duyệt", bg: "#ede9fe", color: "#6d28d9" };
    case "HOAN_TAT":
      return { label: "Hoàn tất", bg: "#dcfce7", color: "#15803d" };
    default:
      return { label: status || "---", bg: "#e2e8f0", color: "#475569" };
  }
};

const formatDate = (value) => {
  if (!value) return "---";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "---";
  return date.toLocaleDateString("vi-VN");
};
const getSeverityCounts = (defects = []) => defects.reduce((acc, defect) => {
  const qty = Number(defect?.SoLuong) || 0;
  const type = String(defect?.DefectType || "").toUpperCase();
  if (type === "CRITICAL") acc.critical += qty;
  else if (type === "MAJOR") acc.major += qty;
  else acc.minor += qty;
  return acc;
}, { critical: 0, major: 0, minor: 0 });

export default function CuoiChuyenInspectionScreen({ route, navigation }) {
  const { id } = route.params;
  const [user, setUser] = useState(null);
  const [phieu, setPhieu] = useState(null);
  const [plans, setPlans] = useState([]);
  const [dynamicFields, setDynamicFields] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const statusMeta = getStatusMeta(phieu?.TrangThai);
  const canEdit = user?.permissions?.includes("THUC_HIEN_KIEM") && canEditStatus(phieu?.TrangThai);
  const approveBoPhanId = Number(getFieldValue(dynamicFields, APPROVE_BOPHAN_FIELD) || 0) || null;
  const completedByUserId = Number(getFieldValue(dynamicFields, COMPLETED_BY_FIELD) || 0) || null;
  const isCompletedByCurrentUser = completedByUserId && getUserId(user) === completedByUserId;
  const canApprove = Boolean(
    !isCompletedByCurrentUser &&
    phieu?.TrangThai === "CHO_TBP_DUYET" && (
      user?.permissions?.includes("QUAN_TRI_DM") || (
        user?.permissions?.includes("PHAN_CONG_NGUOI_XU_LY") &&
        approveBoPhanId &&
        Number(user?.boPhanId) === approveBoPhanId
      )
    )
  );

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
      setPlans(Array.isArray(data.plans) ? data.plans : []);
      setSummary(data.summary || null);
      setDynamicFields(data.dynamicFields || []);
      setUser(userInfo);
    } catch (error) {
      console.error("CuoiChuyen load error:", error);
      Alert.alert("Lỗi", "Không thể tải phiếu kiểm cuối chuyền.");
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const allDefects = plans.flatMap((plan) => plan.Defects || []);
    return {
      plans: plans.length,
      defectRows: allDefects.length,
      defectQty: allDefects.reduce((sum, defect) => sum + (Number(defect.SoLuong) || 0), 0),
      repairedPass: allDefects.reduce((sum, defect) => sum + (Number(defect.SoLuongDatSauSua) || 0), 0),
      repairedFail: allDefects.reduce((sum, defect) => sum + (Number(defect.SoLuongKhongDatSauSua) || 0), 0)
    };
  }, [plans]);
  const overallSeverity = useMemo(() => getSeverityCounts(plans.flatMap((plan) => plan.Defects || [])), [plans]);

  const getPlanSummary = (plan) => {
    const defects = Array.isArray(plan.Defects) ? plan.Defects : [];
    const defectRows = defects.length;
    const defectQty = defects.reduce((sum, defect) => sum + (Number(defect.SoLuong) || 0), 0);
    const defectPreview = defects
      .map((defect) => defect.TenLoi || defect.MaLoi)
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");

    return {
      defectRows,
      defectQty,
      defectPreview,
      severity: getSeverityCounts(defects)
    };
  };

  const handleOpenPlan = (plan) => {
    navigation.navigate("CuoiChuyenPlanDetail", {
      id,
      planId: plan.Id
    });
  };

  const handleCreateBienBan = async () => {
    try {
      setSaving(true);
      const res = await createCuoiChuyenBienBan(id);
      const bienBanId = res?.data?.bienBanId;
      Alert.alert("Thành công", "Đã sinh biên bản xử lý.");
      await loadData();
      if (bienBanId) {
        navigation.navigate("BienBanDetail", { bienBanId });
      }
    } catch (error) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể sinh biên bản.");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    Alert.alert("Hoàn tất phiếu", "Chọn kết luận thực tế trước khi chuyển phiếu sang bước duyệt của TBP.", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đạt",
        onPress: async () => {
          try {
            setSaving(true);
            await completeCuoiChuyen(id, "DAT");
            Alert.alert("Thành công", "Đã chuyển phiếu sang bước duyệt TBP.");
            await loadData();
          } catch (error) {
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
            await completeCuoiChuyen(id, "KHONG_DAT");
            Alert.alert("Thành công", "Đã chuyển phiếu sang bước duyệt TBP.");
            await loadData();
          } catch (error) {
            Alert.alert("Lỗi", error?.response?.data?.message || "Không thể hoàn tất phiếu.");
          } finally {
            setSaving(false);
          }
        }
      }
    ]);
  };

  const handleApprove = async () => {
    Alert.alert("Duyệt TBP", "Xác nhận duyệt phiếu kiểm cuối chuyền?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Duyệt",
        onPress: async () => {
          try {
            setSaving(true);
            await approveCuoiChuyen(id);
            Alert.alert("Thành công", "Đã duyệt phiếu.");
            await loadData();
          } catch (error) {
            Alert.alert("Lỗi", error?.response?.data?.message || "Không thể duyệt phiếu.");
          } finally {
            setSaving(false);
          }
        }
      }
    ]);
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
      <ScrollView contentContainerStyle={[styles.content, canEdit || canApprove ? styles.contentWithBottomBar : null]}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.soPhieu}>{phieu?.SoPhieu || "---"}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>
          </View>
          <Text style={styles.productText}>Kiểm cuối chuyền</Text>
          <Text style={styles.metaText}>KCS: {phieu?.TenNguoiKiem || "---"}</Text>
          <Text style={styles.metaText}>Ngày tạo: {formatDate(phieu?.CreatedAt)} | Mức kiểm: {phieu?.MucDoKiemTra || "---"}</Text>
          <Text style={styles.metaText}>Số kế hoạch: {summary?.TotalPlans ?? totals.plans} | Tổng lỗi: {summary?.TotalDefectQuantity ?? totals.defectQty}</Text>
        </View>

        <View style={styles.actionRow}>
          {phieu?.BienBanId ? (
            <TouchableOpacity style={styles.primaryActionButton} onPress={() => navigation.navigate("BienBanDetail", { bienBanId: phieu.BienBanId })}>
              <Ionicons name="document-text-outline" size={18} color="#fff" />
              <Text style={styles.primaryActionText}>Xem biên bản KPH</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.secondaryActionButton} onPress={handleCreateBienBan} disabled={saving || totals.defectQty <= 0}>
              <Ionicons name="add-circle-outline" size={18} color="#2563eb" />
              <Text style={styles.secondaryActionText}>Sinh biên bản</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Tổng hợp</Text>
          <View style={styles.summaryHero}>
            <Text style={styles.summaryHeroValue}>{summary?.TotalDefectQuantity || totals.defectQty || 0}</Text>
            <Text style={styles.summaryHeroLabel}>Tổng số lỗi ghi nhận</Text>
          </View>
          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatPill}>
              <Text style={styles.summaryStatValue}>{summary?.TotalPlans ?? totals.plans}</Text>
              <Text style={styles.summaryStatLabel}>Kế hoạch</Text>
            </View>
            <View style={styles.summaryStatPill}>
              <Text style={styles.summaryStatValue}>{summary?.TotalDefectRows ?? totals.defectRows}</Text>
              <Text style={styles.summaryStatLabel}>Dòng lỗi</Text>
            </View>
            <View style={styles.summaryStatPill}>
              <Text style={styles.summaryStatValue}>{totals.repairedPass}/{totals.repairedFail}</Text>
              <Text style={styles.summaryStatLabel}>Sau sửa Đ/KĐ</Text>
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
            <Text style={styles.sectionTitle}>Kế hoạch kiểm</Text>
          </View>

          {plans.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Phiếu cuối chuyền này chưa có dữ liệu kế hoạch sản xuất.</Text>
            </View>
          ) : plans.map((plan) => {
            const info = getPlanSummary(plan);
            return (
              <TouchableOpacity key={plan.Id} style={styles.slotCard} activeOpacity={0.85} onPress={() => handleOpenPlan(plan)}>
                <View style={styles.slotCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.slotTitle}>{plan.MaSanPham || `KH #${plan.ID_KeHoachSanXuat}`}</Text>
                    <Text style={styles.slotSubTitle}>{plan.TenSanPham || "---"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </View>
                <Text style={styles.planMetaText}>{plan.TenDonVi || "---"} / {plan.TenBoPhan || "---"} • {formatDate(plan.NgayKeHoach)}</Text>
                <View style={styles.slotMetricRow}>
                  <View style={styles.slotMetricChip}>
                    <Text style={styles.slotMetricValue}>{plan.NangSuatDuKien ?? "---"}</Text>
                    <Text style={styles.slotMetricLabel}>NS dự kiến</Text>
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
                {info.defectPreview ? (
                  <Text style={styles.slotPreview}>Lỗi: {info.defectPreview}</Text>
                ) : (
                  <Text style={styles.slotPreviewEmpty}>Chưa nhập lỗi cho kế hoạch này</Text>
                )}
              </TouchableOpacity>
            );
          })}
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
  slotCard: {
    borderWidth: 1,
    borderColor: "#dbe5f1",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fbfdff"
  },
  slotCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  slotTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  slotSubTitle: { marginTop: 3, color: "#475569", fontWeight: "600" },
  planMetaText: { color: "#64748b", marginBottom: 10, lineHeight: 19 },
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
  primaryButtonText: { color: "#fff", fontWeight: "700" }
});
