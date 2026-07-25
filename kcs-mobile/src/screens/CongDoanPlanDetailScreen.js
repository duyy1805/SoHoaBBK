import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import {
  getAssetUrl, getCongDoanPhieuDetail, getDefectList, saveCongDoanDefects,
  updateCongDoanPlan, uploadImages
} from "../api/phieuKiem.api";
import { getUser } from "../utils/auth";
import DefectEntryCard from "../components/inspection/DefectEntryCard";
import DefectPickerModal from "../components/inspection/DefectPickerModal";
import KeyboardFormScrollView from "../components/KeyboardFormScrollView";

const openStates = ["TAO_MOI", "DANG_KIEM", "CHUA_KIEM"];
const normalizeWorker = (value) => String(value || "").trim().toLocaleLowerCase("vi");
const emptyDefect = (item, tenCongNhan) => ({
  defectId: item.Id, maLoi: item.MaLoi, tenLoi: item.TenLoi, moTa: item.MoTa,
  defectType: item.DefectType,
  tenCongNhan: String(tenCongNhan || "").trim(),
  soLuong: "1", soLuongDatSauSua: "", soLuongKhongDatSauSua: "",
  ghiChu: "", imageUrls: [], localImages: []
});

export default function CongDoanPlanDetailScreen({ route, navigation }) {
  const { id, planId } = route.params;
  const [phieu, setPhieu] = useState(null);
  const [plan, setPlan] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [currentWorkerName, setCurrentWorkerName] = useState("");
  const scrollRef = useRef(null);

  const revealFocusedInput = useCallback((event) => {
    const target = event?.nativeEvent?.target;
    if (!target) return;
    setTimeout(() => {
      scrollRef.current
        ?.getScrollResponder()
        ?.scrollResponderScrollNativeHandleToKeyboard(
          target,
          Platform.OS === "ios" ? 120 : 96,
          true
        );
    }, Platform.OS === "ios" ? 180 : 120);
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [detailResponse, defectResponse, storedUser] = await Promise.all([
        getCongDoanPhieuDetail(id), getDefectList(), getUser()
      ]);
      const detail = detailResponse.data || {};
      const found = (detail.plans || []).find((item) => Number(item.Id) === Number(planId));
      setPhieu(detail.phieu);
      setUser(storedUser);
      setCatalog(defectResponse.data || []);
      setPlan(found ? {
        ...found,
        maDonHang: found.MaDonHang || "",
        lot: found.Lot || "",
        lenhXuatVatTu: found.LenhXuatVatTu || "",
        ghiChu: found.GhiChu || "",
        soLoiBuiBan: String(found.SoLoiBuiBan || ""),
        soLoiConTrung: String(found.SoLoiConTrung || ""),
        defects: (found.Defects || []).map((item) => ({
          defectId: item.DefectId, maLoi: item.MaLoi, tenLoi: item.TenLoi, moTa: item.MoTa,
          defectType: item.DefectType,
          tenCongNhan: item.TenCongNhan || "",
          soLuong: String(item.SoLuong ?? ""),
          soLuongDatSauSua: item.SoLuongDatSauSua == null ? "" : String(item.SoLuongDatSauSua),
          soLuongKhongDatSauSua: item.SoLuongKhongDatSauSua == null ? "" : String(item.SoLuongKhongDatSauSua),
          ghiChu: item.GhiChu || "",
          imageUrls: Array.isArray(item.ImageUrls) ? item.ImageUrls : [],
          localImages: []
        }))
      } : null);
    } catch (error) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không tải được chi tiết kế hoạch.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [id, planId]);

  const editable = openStates.includes(phieu?.TrangThai) && user?.permissions?.includes("THUC_HIEN_KIEM");
  const metrics = useMemo(() => {
    const catalogTotal = (plan?.defects || []).reduce((sum, item) => sum + (Number(item.soLuong) || 0), 0);
    const total = catalogTotal + Number(plan?.soLoiBuiBan || 0) + Number(plan?.soLoiConTrung || 0);
    const quantity = Number(plan?.SoLuongKeHoach || 0);
    return { total, ratio: quantity > 0 ? total * 100 / quantity : null };
  }, [plan]);
  const filteredCatalog = useMemo(() => {
    const workerKey = normalizeWorker(currentWorkerName);
    const used = new Set((plan?.defects || [])
      .filter((item) => normalizeWorker(item.tenCongNhan) === workerKey)
      .map((item) => Number(item.defectId)));
    const keyword = search.trim().toLowerCase();
    return catalog.filter((item) => !used.has(Number(item.Id)) && (!keyword
      || `${item.MaLoi || ""} ${item.TenLoi || ""} ${item.MoTa || ""}`.toLowerCase().includes(keyword)));
  }, [catalog, currentWorkerName, plan?.defects, search]);

  const updateDefect = (index, patch) => setPlan((current) => ({
    ...current,
    defects: current.defects.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
  }));
  const addDefect = (item) => {
    setPlan((current) => ({
      ...current,
      defects: [...current.defects, emptyDefect(item, currentWorkerName)]
    }));
    setModalVisible(false);
  };
  const removeDefect = (index) => setPlan((current) => ({
    ...current, defects: current.defects.filter((_, itemIndex) => itemIndex !== index)
  }));

  const pickImages = async (index) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!["granted", "limited"].includes(permission.status)) {
      Alert.alert("Thiếu quyền", "Vui lòng cấp quyền truy cập thư viện ảnh.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 5, quality: 0.7
    });
    if (!result.canceled) {
      updateDefect(index, { localImages: [...(plan.defects[index].localImages || []), ...(result.assets || [])] });
    }
  };

  const uploadLocalImages = async (defect) => {
    if (!defect.localImages?.length) return defect.imageUrls || [];
    const formData = new FormData();
    defect.localImages.forEach((asset, index) => {
      const extension = asset.mimeType?.split("/")[1] || "jpg";
      formData.append("images", {
        uri: asset.uri,
        name: asset.fileName || `cong-doan-${Date.now()}-${index}.${extension}`,
        type: asset.mimeType || "image/jpeg"
      });
    });
    const response = await uploadImages(formData);
    return [...(defect.imageUrls || []), ...(response.data.filePaths || [])];
  };

  const validate = () => {
    const specialDefects = [plan.soLoiBuiBan, plan.soLoiConTrung];
    if (specialDefects.some((value) => !Number.isInteger(Number(value || 0)) || Number(value || 0) < 0)) {
      Alert.alert("Dữ liệu chưa hợp lệ", "Số lỗi bụi bẩn và côn trùng phải là số nguyên không âm.");
      return false;
    }
    const defectKeys = new Set();
    for (const defect of plan.defects) {
      const defectKey = `${Number(defect.defectId)}|${normalizeWorker(defect.tenCongNhan)}`;
      if (defectKeys.has(defectKey)) {
        Alert.alert("Dữ liệu chưa hợp lệ", `Lỗi ${defect.maLoi || defect.tenLoi} đã được nhập cho cùng công nhân.`);
        return false;
      }
      defectKeys.add(defectKey);
      const quantity = Number(defect.soLuong);
      const pass = Number(defect.soLuongDatSauSua || 0);
      const fail = Number(defect.soLuongKhongDatSauSua || 0);
      if (!Number.isInteger(quantity) || quantity <= 0 || pass < 0 || fail < 0 || pass + fail > quantity) {
        Alert.alert("Dữ liệu chưa hợp lệ", `Lỗi ${defect.maLoi || defect.tenLoi}: số sửa đạt và không đạt không được vượt số lượng lỗi.`);
        return false;
      }
    }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const updated = await updateCongDoanPlan(id, planId, {
        lot: plan.lot, lenhXuatVatTu: plan.lenhXuatVatTu,
        ghiChu: plan.ghiChu,
        soLoiBuiBan: Number(plan.soLoiBuiBan || 0),
        soLoiConTrung: Number(plan.soLoiConTrung || 0),
        rowVersion: plan.RowVersion
      });
      const defects = [];
      for (let index = 0; index < plan.defects.length; index += 1) {
        const item = plan.defects[index];
        const imageUrls = await uploadLocalImages(item);
        defects.push({
          defectId: Number(item.defectId), soLuong: Number(item.soLuong),
          tenCongNhan: String(item.tenCongNhan || "").trim() || null,
          soLuongDatSauSua: item.soLuongDatSauSua === "" ? null : Number(item.soLuongDatSauSua),
          soLuongKhongDatSauSua: item.soLuongKhongDatSauSua === "" ? null : Number(item.soLuongKhongDatSauSua),
          ghiChu: item.ghiChu, imageUrls, sortOrder: index + 1
        });
      }
      await saveCongDoanDefects(id, planId, { rowVersion: updated.data.RowVersion, defects });
      Alert.alert("Đã lưu", "Dữ liệu kế hoạch và lỗi đã được cập nhật.");
      await load();
    } catch (error) {
      const message = error.response?.data?.message || "Không lưu được dữ liệu.";
      Alert.alert(error.response?.status === 409 ? "Dữ liệu đã thay đổi" : "Lỗi", message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !plan) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <KeyboardFormScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summary}>
          <Text style={styles.planId}>Kế hoạch #{plan.ID_KeHoachSanXuat}</Text>
          <Text style={styles.code}>{plan.MaSanPham || "---"}</Text>
          <Text style={styles.name}>{plan.TenSanPham || "---"}</Text>
          <Text style={styles.processName}>Quy trình: {plan.TenQuyTrinhSanXuat || "---"}</Text>
          <Text style={styles.meta}>{plan.TenDonVi || "---"} · {plan.TenBoPhan || "---"}</Text>
          <View style={styles.metrics}>
            <Text style={styles.metric}>Số lượng kiểm{"\n"}<Text style={styles.metricValue}>{plan.SoLuongKeHoach || 0}</Text></Text>
            <Text style={styles.metric}>Số lượng lỗi{"\n"}<Text style={styles.metricValue}>{metrics.total}</Text></Text>
            <Text style={styles.metric}>Tỷ lệ lỗi{"\n"}<Text style={styles.metricValue}>{metrics.ratio == null ? "Không tính" : `${metrics.ratio.toFixed(2)}%`}</Text></Text>
          </View>
          {Number(plan.SoLuongKeHoach || 0) === 0 && <Text style={styles.warning}>Số lượng kế hoạch bằng 0, không thể tính tỷ lệ lỗi.</Text>}
        </View>

        <Text style={styles.sectionTitle}>Thông tin kế hoạch</Text>
        <View style={styles.readOnlyField}>
          <Text style={styles.label}>Mã đơn hàng</Text>
          <Text style={styles.readOnlyValue}>{plan.maDonHang || "---"}</Text>
        </View>
        {[
          ["LOT", "lot"], ["Lệnh xuất vật tư", "lenhXuatVatTu"], ["Ghi chú chung", "ghiChu"]
        ].map(([label, field]) => (
          <View key={field} style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={[styles.input, !editable && styles.readOnly]}
              value={plan[field]} editable={editable}
              multiline={field === "ghiChu"}
              onFocus={revealFocusedInput}
              placeholderTextColor="#64748b"
              onChangeText={(value) => setPlan((current) => ({ ...current, [field]: value }))}
            />
          </View>
        ))}

        {editable && (
          <View style={styles.workerContext}>
            <Text style={styles.label}>Công nhân cho lỗi sắp ghi nhận</Text>
            <TextInput
              style={styles.input}
              value={currentWorkerName}
              placeholder="Có thể để trống"
              placeholderTextColor="#64748b"
              onFocus={revealFocusedInput}
              onChangeText={setCurrentWorkerName}
            />
          </View>
        )}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Lỗi ghi nhận ({plan.defects.length})</Text>
          {editable && (
            <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
              <Ionicons name="add-circle-outline" size={20} color="#2563eb" /><Text style={styles.addText}>Chọn lỗi</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.specialDefects}>
          <View style={styles.specialDefectField}>
            <Text style={styles.label}>Bụi bẩn</Text>
            <TextInput
              style={[styles.specialDefectInput, !editable && styles.readOnly]}
              value={plan.soLoiBuiBan}
              editable={editable}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#64748b"
              onFocus={revealFocusedInput}
              onChangeText={(value) => setPlan((current) => ({
                ...current, soLoiBuiBan: value.replace(/\D/g, "")
              }))}
            />
          </View>
          <View style={styles.specialDefectField}>
            <Text style={styles.label}>Côn trùng</Text>
            <TextInput
              style={[styles.specialDefectInput, !editable && styles.readOnly]}
              value={plan.soLoiConTrung}
              editable={editable}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#64748b"
              onFocus={revealFocusedInput}
              onChangeText={(value) => setPlan((current) => ({
                ...current, soLoiConTrung: value.replace(/\D/g, "")
              }))}
            />
          </View>
        </View>
        {plan.defects.map((defect, index) => (
          <DefectEntryCard
            key={`${defect.defectId}-${index}`}
            defect={defect}
            editable={editable}
            onChange={(patch) => updateDefect(index, patch)}
            onRemove={() => removeDefect(index)}
            onPickImages={() => pickImages(index)}
            resolveAssetUrl={getAssetUrl}
            onInputFocus={revealFocusedInput}
          />
        ))}
        {editable && (
          <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} disabled={saving} onPress={save}>
            {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="save-outline" size={20} color="#fff" /><Text style={styles.saveText}>Lưu kế hoạch</Text></>}
          </TouchableOpacity>
        )}
      </KeyboardFormScrollView>

      <DefectPickerModal
        visible={modalVisible}
        defects={filteredCatalog}
        search={search}
        onSearchChange={setSearch}
        onSelect={addDefect}
        onClose={() => setModalVisible(false)}
        resolveAssetUrl={getAssetUrl}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" }, center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 14, paddingBottom: 120 }, summary: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbe3ec", borderRadius: 7, padding: 16 },
  planId: { color: "#64748b", fontSize: 12, fontWeight: "700", marginBottom: 5 },
  code: { fontSize: 17, fontWeight: "800", color: "#1d4ed8" }, name: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginTop: 5 },
  processName: { color: "#1d4ed8", fontWeight: "600", marginTop: 6 },
  meta: { color: "#64748b", marginTop: 5 }, metrics: { flexDirection: "row", marginTop: 15, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 12 },
  metric: { flex: 1, color: "#64748b", fontSize: 12 }, metricValue: { color: "#0f172a", fontSize: 16, fontWeight: "800" },
  warning: { color: "#b45309", backgroundColor: "#fef3c7", padding: 8, marginTop: 10, borderRadius: 5 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a", marginTop: 20, marginBottom: 9 }, sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  field: { marginBottom: 10 }, label: { color: "#334155", fontWeight: "600", marginBottom: 5 }, input: { minHeight: 42, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#fff" },
  readOnlyField: { marginBottom: 10 }, readOnlyValue: { minHeight: 42, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 11, backgroundColor: "#f1f5f9", color: "#334155", fontWeight: "600" },
  readOnly: { backgroundColor: "#f1f5f9", color: "#64748b" }, addButton: { flexDirection: "row", gap: 5, alignItems: "center", paddingTop: 10 },
  addText: { color: "#2563eb", fontWeight: "700" }, defect: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 7, padding: 13, marginBottom: 10 },
  workerContext: { marginTop: 16, marginBottom: 2 },
  specialDefects: { flexDirection: "row", gap: 10, marginBottom: 12 },
  specialDefectField: { flex: 1 },
  specialDefectInput: { height: 44, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 6, paddingHorizontal: 12, backgroundColor: "#fff", fontSize: 17, fontWeight: "700", color: "#0f172a", textAlign: "center" },
  defectHeader: { flexDirection: "row", justifyContent: "space-between" }, flex: { flex: 1 }, defectCode: { fontWeight: "800", color: "#1d4ed8" }, defectName: { color: "#1e293b", fontWeight: "600", marginTop: 3 },
  quantityRow: { flexDirection: "row", gap: 8, marginVertical: 12 }, quantityField: { flex: 1 }, smallLabel: { fontSize: 11, color: "#64748b", marginBottom: 4 },
  numberInput: { height: 40, textAlign: "center", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 6, backgroundColor: "#fff" },
  images: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 10 }, image: { width: 58, height: 58, borderRadius: 5 },
  imageButton: { width: 58, height: 58, borderWidth: 1, borderStyle: "dashed", borderColor: "#93c5fd", borderRadius: 5, alignItems: "center", justifyContent: "center" },
  saveButton: { height: 48, backgroundColor: "#2563eb", borderRadius: 6, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", marginTop: 12 },
  saveText: { color: "#fff", fontWeight: "800" }, disabled: { opacity: 0.55 }, modalPage: { flex: 1, backgroundColor: "#f8fafc", paddingTop: 55 },
  modalHeader: { paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, modalTitle: { fontSize: 19, fontWeight: "800", color: "#0f172a" },
  search: { margin: 16, height: 44, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#fff", borderRadius: 6, paddingHorizontal: 12 },
  catalogItem: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 7, padding: 13, marginBottom: 8 }
});
