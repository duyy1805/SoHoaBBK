import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Modal, RefreshControl, StyleSheet,
  ScrollView, Text, TextInput, TouchableOpacity, View
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  addCongDoanPlan, approveCongDoanPhieu, completeCongDoanPhieu,
  createCongDoanBienBan, deleteCongDoanPlan, getCongDoanPhieuDetail,
  getCongDoanPlans
} from "../api/phieuKiem.api";
import { getUser } from "../utils/auth";

const openStates = ["TAO_MOI", "DANG_KIEM", "CHUA_KIEM"];
const displayDate = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("vi-VN") : "---";
const getStatusMeta = (status) => {
  switch (status) {
    case "TAO_MOI":
    case "CHUA_KIEM":
      return { label: "Chưa kiểm", bg: "#e0f2fe", color: "#0369a1" };
    case "DANG_KIEM":
      return { label: "Đang kiểm", bg: "#dbeafe", color: "#1d4ed8" };
    case "CHO_TBP_DUYET":
      return { label: "Chờ Trưởng bộ phận", bg: "#ede9fe", color: "#6d28d9" };
    case "HOAN_TAT":
      return { label: "Hoàn tất", bg: "#dcfce7", color: "#15803d" };
    default:
      return { label: status || "---", bg: "#e2e8f0", color: "#475569" };
  }
};

export default function CongDoanDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [data, setData] = useState({ phieu: null, plans: [] });
  const [user, setUser] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [search, setSearch] = useState("");
  const [processFilter, setProcessFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const addPlanInFlightRef = useRef(false);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [response, storedUser] = await Promise.all([getCongDoanPhieuDetail(id), getUser()]);
      setData(response.data || { phieu: null, plans: [] });
      setUser(storedUser);
    } catch (error) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không tải được phiếu công đoạn.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const phieu = data.phieu;
  const editable = openStates.includes(phieu?.TrangThai) && user?.permissions?.includes("THUC_HIEN_KIEM");
  const canApprove = phieu?.TrangThai === "CHO_TBP_DUYET"
    && user?.permissions?.includes("PHAN_CONG_NGUOI_XU_LY")
    && (Number(user?.boPhanId) === Number(phieu?.BoPhanDuyetId) || user?.permissions?.includes("QUAN_TRI_DM"));
  const statusMeta = getStatusMeta(phieu?.TrangThai);
  const canComplete = editable && (data.plans?.length || 0) > 0;
  const showBottomAction = canComplete || canApprove;
  const canCreateBienBan = phieu?.KetLuan === "KHONG_DAT"
    && !phieu?.BienBanId
    && user?.permissions?.includes("THUC_HIEN_KIEM");

  const candidates = useMemo(() => {
    const used = new Set((data.plans || []).map((item) => Number(item.ID_KeHoachSanXuat)));
    const keyword = search.trim().toLowerCase();
    return availablePlans.filter((item) => {
      if (used.has(Number(item.ID_KeHoachSanXuat))) return false;
      if (processFilter && item.Ten_QuyTrinhSanXuat !== processFilter) return false;
      const haystack = `${item.ID_KeHoachSanXuat || ""} ${item.Ma_DonHang || item.MaDonHang || ""} ${item.MaSanPham || item.ItemCode || ""} ${item.TenSanPham || ""} ${item.Ten_QuyTrinhSanXuat || ""} ${item.Ten_DonVi || ""} ${item.Ten_BoPhan || ""}`.toLowerCase();
      return !keyword || haystack.includes(keyword);
    });
  }, [availablePlans, data.plans, processFilter, search]);

  const processOptions = useMemo(() => [...new Set(
    availablePlans.map((item) => item.Ten_QuyTrinhSanXuat).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "vi")), [availablePlans]);

  const openPlanPicker = async () => {
    try {
      setBusy(true);
      const response = await getCongDoanPlans(String(phieu.NgayKiem).slice(0, 10), id);
      setAvailablePlans(response.data || []);
      setProcessFilter("");
      setPickerVisible(true);
    } catch (error) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không tải được kế hoạch trong ngày.");
    } finally {
      setBusy(false);
    }
  };

  const addPlan = async (plan) => {
    if (addPlanInFlightRef.current) return;
    addPlanInFlightRef.current = true;
    try {
      setBusy(true);
      await addCongDoanPlan(id, plan.ID_KeHoachSanXuat);
      setPickerVisible(false);
      await load(true);
    } catch (error) {
      Alert.alert("Không thể thêm", error.response?.data?.message || "Vui lòng tải lại và thử lại.");
    } finally {
      addPlanInFlightRef.current = false;
      setBusy(false);
    }
  };

  const removePlan = (plan) => {
    Alert.alert("Xóa kế hoạch", `Xóa ${plan.MaSanPham || plan.TenSanPham || "kế hoạch này"} khỏi phiếu?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa", style: "destructive", onPress: async () => {
          try {
            await deleteCongDoanPlan(id, plan.Id);
            await load(true);
          } catch (error) {
            Alert.alert("Không thể xóa", error.response?.data?.message || "Bạn không có quyền xóa dòng này.");
          }
        }
      }
    ]);
  };

  const submitComplete = async (ketLuan) => {
    try {
      setBusy(true);
      await completeCongDoanPhieu(id, ketLuan);
      Alert.alert("Thành công", "Đã chuyển phiếu sang bước duyệt TBP.");
      await load(true);
    } catch (error) {
      Alert.alert("Không thể hoàn tất", error.response?.data?.message || "Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const complete = () => {
    Alert.alert("Hoàn tất phiếu", "Chọn kết luận thực tế trước khi chuyển phiếu sang bước duyệt của TBP.", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đạt",
        onPress: () => submitComplete("DAT")
      },
      {
        text: "Không đạt",
        style: "destructive",
        onPress: () => submitComplete("KHONG_DAT")
      }
    ]);
  };

  const submitApprove = async () => {
    try {
      setBusy(true);
      await approveCongDoanPhieu(id);
      Alert.alert("Thành công", "Phiếu đã được TBP duyệt.");
      await load(true);
    } catch (error) {
      Alert.alert("Không thể duyệt", error.response?.data?.message || "Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const approve = () => {
    Alert.alert("Duyệt phiếu", "Xác nhận hoàn tất duyệt phiếu kiểm công đoạn?", [
      { text: "Hủy", style: "cancel" },
      { text: "Duyệt", onPress: submitApprove }
    ]);
  };

  const createBienBan = async () => {
    try {
      setBusy(true);
      const response = await createCongDoanBienBan(id);
      const bienBanId = response?.data?.bienBanId;
      Alert.alert("Thành công", "Đã sinh biên bản xử lý không phù hợp.");
      await load(true);
      if (bienBanId) navigation.navigate("BienBanDetail", { bienBanId });
    } catch (error) {
      Alert.alert("Không thể sinh biên bản", error.response?.data?.message || "Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !phieu) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={data.plans || []}
        keyExtractor={(item) => String(item.Id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
        contentContainerStyle={[styles.list, showBottomAction && styles.listWithBottomBar]}
        ListHeaderComponent={(
          <>
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <Text style={styles.code}>{phieu.SoPhieu}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                </View>
              </View>
              <Text style={styles.title}>{phieu.PhanXuong || "Chưa nhập phân xưởng"}{phieu.ToMay ? ` · ${phieu.ToMay}` : ""}</Text>
              <Text style={styles.meta}>Ngày kiểm: {displayDate(phieu.NgayKiem)}</Text>
              <Text style={styles.meta}>Người tạo: {phieu.TenNguoiTao || "---"}</Text>
            </View>
            {phieu.KetLuan === "KHONG_DAT" && (phieu.BienBanId || canCreateBienBan) ? (
              <View style={styles.kphActionRow}>
                {phieu.BienBanId ? (
                  <TouchableOpacity
                    style={styles.primaryActionButton}
                    onPress={() => navigation.navigate("BienBanDetail", { bienBanId: phieu.BienBanId })}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#fff" />
                    <Text style={styles.primaryActionText}>Xem biên bản KPH</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.secondaryActionButton} disabled={busy} onPress={createBienBan}>
                    <Ionicons name="add-circle-outline" size={18} color="#2563eb" />
                    <Text style={styles.secondaryActionText}>Sinh biên bản KPH</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Kế hoạch ({data.plans?.length || 0})</Text>
              {editable && (
                <TouchableOpacity style={styles.addButton} disabled={busy} onPress={openPlanPicker}>
                  <Ionicons name="add-circle-outline" size={20} color="#2563eb" />
                  <Text style={styles.addText}>Thêm kế hoạch</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Chưa có kế hoạch. Chọn “Thêm kế hoạch” để bắt đầu.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("CongDoanPlanDetail", { id, planId: item.Id })}>
            <View style={styles.cardTop}>
              <View style={styles.flex}>
                <Text style={styles.planId}>Kế hoạch #{item.ID_KeHoachSanXuat}</Text>
                <Text style={styles.planCode}>{item.MaSanPham || "---"}</Text>
                <Text style={styles.planName}>{item.TenSanPham || "Chưa có tên sản phẩm"}</Text>
              </View>
              {editable && (
                <TouchableOpacity style={styles.deleteIcon} onPress={() => removePlan(item)}>
                  <Ionicons name="trash-outline" size={19} color="#b91c1c" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.meta}>{item.TenDonVi || "---"} · {item.TenBoPhan || "---"}</Text>
            <Text style={styles.meta}>Quy trình: {item.TenQuyTrinhSanXuat || "---"}</Text>
            <Text style={styles.meta}>Đơn hàng: {item.MaDonHang || "---"}</Text>
            <View style={styles.metrics}>
              <Text style={styles.metric}>Kế hoạch: <Text style={styles.metricStrong}>{item.SoLuongKeHoach || 0}</Text></Text>
              <Text style={styles.metric}>Lỗi: <Text style={styles.metricStrong}>{item.TongLoi || 0}</Text></Text>
              <Text style={styles.metric}>Tỷ lệ: <Text style={styles.metricStrong}>{item.TyLeLoi == null ? "Cảnh báo SL=0" : `${item.TyLeLoi}%`}</Text></Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {showBottomAction ? (
        <View style={styles.bottomActionBar}>
          <TouchableOpacity
            style={styles.primaryButton}
            disabled={busy}
            onPress={canApprove ? approve : complete}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{canApprove ? "Duyệt phiếu" : "Hoàn tất phiếu"}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={pickerVisible} animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.pickerPage}>
          <View style={styles.pickerHeader}>
            <View><Text style={styles.pickerTitle}>Kế hoạch ngày {displayDate(phieu.NgayKiem)}</Text><Text style={styles.meta}>{candidates.length} kế hoạch có thể chọn</Text></View>
            <TouchableOpacity onPress={() => setPickerVisible(false)}><Ionicons name="close" size={26} color="#334155" /></TouchableOpacity>
          </View>
          <TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Tìm ID kế hoạch, đơn hàng, sản phẩm, quy trình" />
          <View style={styles.filterHeader}>
            <Ionicons name="filter-outline" size={16} color="#475569" />
            <Text style={styles.filterLabel}>Quy trình sản xuất</Text>
          </View>
          <ScrollView
            horizontal
            style={styles.processTabsScroll}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.processTabs}
            keyboardShouldPersistTaps="handled"
          >
            {["", ...processOptions].map((item) => {
              const selected = processFilter === item;
              return (
                <TouchableOpacity
                  key={item || "all"}
                  style={[styles.processTab, selected && styles.processTabActive]}
                  onPress={() => setProcessFilter(item)}
                >
                  <Text style={[styles.processTabText, selected && styles.processTabTextActive]}>
                    {item || "Tất cả"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <FlatList
            style={styles.candidateList}
            data={candidates}
            keyExtractor={(item, index) => `${item.ID_KeHoachSanXuat}-${item.SanPhamId || index}`}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>Không còn kế hoạch phù hợp.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.candidate} disabled={busy} onPress={() => addPlan(item)}>
                <Text style={styles.planId}>Kế hoạch #{item.ID_KeHoachSanXuat}</Text>
                <Text style={styles.planCode}>{item.MaSanPham || item.ItemCode || "---"}</Text>
                <Text style={styles.planName}>{item.TenSanPham || "---"}</Text>
                <Text style={styles.processName}>{item.Ten_QuyTrinhSanXuat || "Chưa có tên quy trình sản xuất"}</Text>
                <Text style={styles.meta}>Đơn hàng: {item.Ma_DonHang || item.MaDonHang || "---"}</Text>
                <Text style={styles.meta}>{item.Ten_DonVi || "---"} · {item.Ten_BoPhan || "---"} · SL {item.SoLuongKeHoach || 0}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 14, paddingBottom: 30 },
  listWithBottomBar: { paddingBottom: 108 },
  header: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbe3ec", borderRadius: 7, padding: 16 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  code: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: "800", color: "#1d4ed8" },
  statusBadge: { maxWidth: 145, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  statusBadgeText: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  title: { fontSize: 17, fontWeight: "700", color: "#0f172a", marginTop: 12 },
  meta: { color: "#64748b", fontSize: 13, marginTop: 5 },
  kphActionRow: { flexDirection: "row", marginTop: 12 },
  primaryActionButton: {
    flex: 1, minHeight: 48, backgroundColor: "#2563eb", borderRadius: 14,
    paddingHorizontal: 16, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 8
  },
  primaryActionText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryActionButton: {
    flex: 1, minHeight: 48, backgroundColor: "#eff6ff", borderRadius: 14,
    paddingHorizontal: 16, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 8, borderWidth: 1, borderColor: "#bfdbfe"
  },
  secondaryActionText: { color: "#2563eb", fontWeight: "700", fontSize: 15 },
  sectionTitleRow: { marginTop: 20, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
  addButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 8 },
  addText: { color: "#2563eb", fontWeight: "700" },
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 7, padding: 14, marginBottom: 9 },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  flex: { flex: 1 },
  planId: { color: "#64748b", fontSize: 12, fontWeight: "700", marginBottom: 4 },
  planCode: { color: "#1d4ed8", fontWeight: "800" },
  planName: { color: "#1e293b", fontWeight: "600", marginTop: 4 },
  processName: { color: "#1d4ed8", fontSize: 13, fontWeight: "600", marginTop: 5 },
  deleteIcon: { padding: 7 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12, borderTopWidth: 1, borderTopColor: "#f1f5f9", marginTop: 12, paddingTop: 10 },
  metric: { color: "#64748b", fontSize: 12 },
  metricStrong: { color: "#0f172a", fontWeight: "800" },
  empty: { textAlign: "center", color: "#64748b", padding: 30 },
  bottomActionBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingTop: 12, paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0",
    shadowColor: "#0f172a", shadowOpacity: 0.04, shadowRadius: 8, elevation: 4
  },
  primaryButton: {
    backgroundColor: "#2563eb", borderRadius: 16, minHeight: 52,
    paddingVertical: 14, alignItems: "center", justifyContent: "center",
    shadowColor: "#2563eb", shadowOpacity: 0.18, shadowRadius: 10, elevation: 3
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  pickerPage: { flex: 1, backgroundColor: "#f8fafc", paddingTop: 55 },
  pickerHeader: { paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between" },
  pickerTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  search: { margin: 16, height: 44, backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 6, paddingHorizontal: 12 },
  filterHeader: { marginHorizontal: 16, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  filterLabel: { color: "#475569", fontSize: 13, fontWeight: "700" },
  processTabsScroll: { height: 50, flexGrow: 0, flexShrink: 0 },
  processTabs: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  processTab: { height: 38, paddingHorizontal: 14, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 6, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  processTabActive: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  processTabText: { color: "#475569", fontSize: 14, fontWeight: "600" },
  processTabTextActive: { color: "#1d4ed8", fontWeight: "800" },
  candidateList: { flex: 1 },
  candidate: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 7, padding: 14, marginBottom: 9 }
});
