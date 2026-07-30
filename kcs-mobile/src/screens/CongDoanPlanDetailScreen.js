import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import {
  getAssetUrl, getCongDoanPhieuDetail, getDefectList,
  updateCongDoanPlan, uploadImages
} from "../api/phieuKiem.api";
import { getUser } from "../utils/auth";
import DefectEntryCard from "../components/inspection/DefectEntryCard";
import DefectPickerModal from "../components/inspection/DefectPickerModal";
import KeyboardFormScrollView from "../components/KeyboardFormScrollView";
import MobileSelect from "../components/MobileSelect";

const openStates = ["TAO_MOI", "DANG_KIEM", "CHUA_KIEM"];
const normalizeWorker = (value) => String(value || "").trim().toLocaleLowerCase("vi");
const emptyDefect = (item, tenCongNhan, lotTarget = {}) => ({
  defectId: item.Id, maLoi: item.MaLoi, tenLoi: item.TenLoi, moTa: item.MoTa,
  defectType: item.DefectType,
  lotId: lotTarget.id || null,
  lotClientKey: lotTarget.clientKey || null,
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
  const [selectedLotKey, setSelectedLotKey] = useState(null);
  const [legacySpecialTarget, setLegacySpecialTarget] = useState("");
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
        soLuongThucTe: found.SoLuongThucTe == null ? "" : String(found.SoLuongThucTe),
        lots: (found.Lots || []).map((item, index) => ({
          id: item.Id || null,
          clientKey: item.Id ? `id:${item.Id}` : `lot-${index + 1}`,
          rowVersion: item.RowVersion || null,
          lot: item.Lot || "",
          lenhXuatVatTu: item.LenhXuatVatTu || "",
          soLuong: String(item.SoLuong ?? ""),
          soLoiBuiBan: String(item.SoLoiBuiBan || ""),
          soLoiConTrung: String(item.SoLoiConTrung || "")
        })),
        ghiChu: found.GhiChu || "",
        soLoiBuiBan: String(found.SoLoiBuiBan || ""),
        soLoiConTrung: String(found.SoLoiConTrung || ""),
        defects: (found.Defects || []).map((item) => ({
          defectId: item.DefectId, maLoi: item.MaLoi, tenLoi: item.TenLoi, moTa: item.MoTa,
          defectType: item.DefectType,
          lotId: item.PlanLotId || null,
          lotClientKey: item.PlanLotId ? `id:${item.PlanLotId}` : null,
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
  const lotKeyOf = (lot) => lot?.id ? `id:${lot.id}` : lot?.clientKey || null;
  const defectLotKey = (defect) => defect?.lotId ? `id:${defect.lotId}` : defect?.lotClientKey || null;
  const metrics = useMemo(() => {
    const catalogTotal = (plan?.defects || []).reduce((sum, item) => sum + (Number(item.soLuong) || 0), 0);
    const lotSpecialTotal = (plan?.lots || []).reduce((sum, lot) =>
      sum + Number(lot.soLoiBuiBan || 0) + Number(lot.soLoiConTrung || 0), 0);
    const total = catalogTotal + lotSpecialTotal
      + Number(plan?.soLoiBuiBan || 0) + Number(plan?.soLoiConTrung || 0);
    const quantity = plan?.soLuongThucTe === "" || plan?.soLuongThucTe == null
      ? Number(plan?.SoLuongKeHoach || 0)
      : Number(plan.soLuongThucTe);
    return { total, ratio: quantity > 0 ? total * 100 / quantity : null };
  }, [plan]);
  const effectiveQuantity = plan?.soLuongThucTe === "" || plan?.soLuongThucTe == null
    ? Number(plan?.SoLuongKeHoach || 0)
    : Number(plan.soLuongThucTe);
  const allocatedQuantity = (plan?.lots || []).reduce((sum, item) => sum + Number(item.soLuong || 0), 0);
  const lotOptions = (plan?.lots || []).map((lot, index) => ({
    value: lotKeyOf(lot),
    label: `Lot ${lot.lot || "—"} · LXVT ${lot.lenhXuatVatTu || "—"}`,
    description: `Số lượng ${lot.soLuong || 0} · Dòng ${index + 1}`
  }));
  const moveLegacySpecialDefects = () => {
    const targetIndex = plan.lots.findIndex((lot) => lotKeyOf(lot) === legacySpecialTarget);
    if (targetIndex < 0) {
      Alert.alert("Chưa chọn Lot", "Vui lòng chọn Lot nhận lỗi Bụi bẩn/Côn trùng.");
      return;
    }
    setPlan((current) => ({
      ...current,
      soLoiBuiBan: "",
      soLoiConTrung: "",
      lots: current.lots.map((lot, index) => index === targetIndex ? {
        ...lot,
        soLoiBuiBan: String(Number(lot.soLoiBuiBan || 0) + Number(current.soLoiBuiBan || 0)),
        soLoiConTrung: String(Number(lot.soLoiConTrung || 0) + Number(current.soLoiConTrung || 0))
      } : lot)
    }));
    setLegacySpecialTarget("");
  };
  const filteredCatalog = useMemo(() => {
    const workerKey = normalizeWorker(currentWorkerName);
    const used = new Set((plan?.defects || [])
      .filter((item) =>
        normalizeWorker(item.tenCongNhan) === workerKey
        && defectLotKey(item) === selectedLotKey
      )
      .map((item) => Number(item.defectId)));
    const keyword = search.trim().toLowerCase();
    return catalog.filter((item) => !used.has(Number(item.Id)) && (!keyword
      || `${item.MaLoi || ""} ${item.TenLoi || ""} ${item.MoTa || ""}`.toLowerCase().includes(keyword)));
  }, [catalog, currentWorkerName, plan?.defects, search, selectedLotKey]);

  const updateDefect = (index, patch) => setPlan((current) => ({
    ...current,
    defects: current.defects.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
  }));
  const addDefect = (item) => {
    const targetLot = (plan?.lots || []).find((lot) => lotKeyOf(lot) === selectedLotKey);
    setPlan((current) => ({
      ...current,
      defects: [...current.defects, emptyDefect(item, currentWorkerName, targetLot)]
    }));
    setModalVisible(false);
    setSelectedLotKey(null);
  };
  const removeDefect = (index) => setPlan((current) => ({
    ...current, defects: current.defects.filter((_, itemIndex) => itemIndex !== index)
  }));
  const updateLot = (index, patch) => setPlan((current) => ({
    ...current,
    lots: current.lots.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
  }));
  const addLot = () => setPlan((current) => ({
    ...current,
    lots: [...current.lots, {
      id: null,
      clientKey: `lot-${Date.now()}-${current.lots.length + 1}`,
      rowVersion: null,
      lot: "",
      lenhXuatVatTu: "",
      soLuong: "",
      soLoiBuiBan: "",
      soLoiConTrung: ""
    }]
  }));
  const removeLot = (index) => {
    const target = plan.lots[index];
    const targetKey = lotKeyOf(target);
    const hasDefects = plan.defects.some((defect) => defectLotKey(defect) === targetKey)
      || Number(target.soLoiBuiBan || 0) > 0
      || Number(target.soLoiConTrung || 0) > 0;
    if (hasDefects) {
      Alert.alert("Không thể xóa", "Hãy xóa hoặc chuyển toàn bộ lỗi của Lot trước.");
      return;
    }
    setPlan((current) => ({
      ...current, lots: current.lots.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

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
    if (plan.soLuongThucTe !== ""
      && (!Number.isInteger(Number(plan.soLuongThucTe)) || Number(plan.soLuongThucTe) < 0)) {
      Alert.alert("Dữ liệu chưa hợp lệ", "Số lượng thực tế phải là số nguyên không âm hoặc để trống.");
      return false;
    }
    if (plan.lots.length) {
      const invalidLot = plan.lots.some((item) =>
        (!item.lot.trim() && !item.lenhXuatVatTu.trim())
        || !Number.isInteger(Number(item.soLuong))
        || Number(item.soLuong) <= 0
        || !Number.isInteger(Number(item.soLoiBuiBan || 0))
        || Number(item.soLoiBuiBan || 0) < 0
        || !Number.isInteger(Number(item.soLoiConTrung || 0))
        || Number(item.soLoiConTrung || 0) < 0
      );
      if (invalidLot) {
        Alert.alert("Dữ liệu chưa hợp lệ", "Mỗi dòng phải có Lot hoặc Lệnh xuất vật tư và số lượng nguyên dương.");
        return false;
      }
      if (allocatedQuantity > effectiveQuantity) {
        Alert.alert("Phân bổ vượt số lượng", `Đã phân bổ ${allocatedQuantity}/${effectiveQuantity}.`);
        return false;
      }
    }
    const specialDefects = plan.lots.length
      ? plan.lots.flatMap((lot) => [lot.soLoiBuiBan, lot.soLoiConTrung])
      : [plan.soLoiBuiBan, plan.soLoiConTrung];
    if (specialDefects.some((value) => !Number.isInteger(Number(value || 0)) || Number(value || 0) < 0)) {
      Alert.alert("Dữ liệu chưa hợp lệ", "Số lỗi bụi bẩn và côn trùng phải là số nguyên không âm.");
      return false;
    }
    const defectKeys = new Set();
    for (const defect of plan.defects) {
      const defectKey = `${defectLotKey(defect) || "general"}|${Number(defect.defectId)}|${normalizeWorker(defect.tenCongNhan)}`;
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
    for (const lot of plan.lots) {
      const targetKey = lotKeyOf(lot);
      const lotDefectTotal = plan.defects
        .filter((defect) => defectLotKey(defect) === targetKey)
        .reduce((sum, defect) => sum + Number(defect.soLuong || 0), 0)
        + Number(lot.soLoiBuiBan || 0)
        + Number(lot.soLoiConTrung || 0);
      if (lotDefectTotal > Number(lot.soLuong || 0)) {
        Alert.alert("Lỗi vượt số lượng Lot", `Lot ${lot.lot || lot.lenhXuatVatTu} có ${lotDefectTotal} lỗi trên ${lot.soLuong} sản phẩm.`);
        return false;
      }
    }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const defects = [];
      for (let index = 0; index < plan.defects.length; index += 1) {
        const item = plan.defects[index];
        const imageUrls = await uploadLocalImages(item);
        defects.push({
          defectId: Number(item.defectId),
          lotId: item.lotId || null,
          lotClientKey: item.lotId ? null : item.lotClientKey || null,
          soLuong: Number(item.soLuong),
          tenCongNhan: String(item.tenCongNhan || "").trim() || null,
          soLuongDatSauSua: item.soLuongDatSauSua === "" ? null : Number(item.soLuongDatSauSua),
          soLuongKhongDatSauSua: item.soLuongKhongDatSauSua === "" ? null : Number(item.soLuongKhongDatSauSua),
          ghiChu: item.ghiChu,
          imageUrls,
          sortOrder: index + 1
        });
      }
      await updateCongDoanPlan(id, planId, {
        soLuongThucTe: plan.soLuongThucTe === "" ? null : Number(plan.soLuongThucTe),
        lots: plan.lots.map((item) => ({
          id: item.id,
          clientKey: item.clientKey,
          rowVersion: item.rowVersion,
          lot: item.lot.trim(),
          lenhXuatVatTu: item.lenhXuatVatTu.trim(),
          soLuong: Number(item.soLuong),
          soLoiBuiBan: Number(item.soLoiBuiBan || 0),
          soLoiConTrung: Number(item.soLoiConTrung || 0)
        })),
        ghiChu: plan.ghiChu,
        soLoiBuiBan: Number(plan.soLoiBuiBan || 0),
        soLoiConTrung: Number(plan.soLoiConTrung || 0),
        defects,
        rowVersion: plan.RowVersion
      });
      Alert.alert("Đã lưu nháp", "Dữ liệu Lot và lỗi đã được cập nhật.");
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
            <Text style={styles.metric}>Kế hoạch{"\n"}<Text style={styles.metricValue}>{plan.SoLuongKeHoach || 0}</Text></Text>
            <Text style={styles.metric}>Hiệu lực{"\n"}<Text style={styles.metricValue}>{effectiveQuantity}</Text></Text>
            <Text style={styles.metric}>Số lượng lỗi{"\n"}<Text style={styles.metricValue}>{metrics.total}</Text></Text>
            <Text style={styles.metric}>Tỷ lệ lỗi{"\n"}<Text style={styles.metricValue}>{metrics.ratio == null ? "Không tính" : `${metrics.ratio.toFixed(2)}%`}</Text></Text>
          </View>
          {effectiveQuantity === 0 && <Text style={styles.warning}>Số lượng hiệu lực bằng 0, không thể tính tỷ lệ lỗi.</Text>}
        </View>

        <Text style={styles.sectionTitle}>Thông tin kế hoạch</Text>
        <View style={styles.readOnlyField}>
          <Text style={styles.label}>Mã đơn hàng</Text>
          <Text style={styles.readOnlyValue}>{plan.maDonHang || "---"}</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Số lượng thực tế (không bắt buộc)</Text>
          <TextInput
            style={[styles.input, !editable && styles.readOnly]}
            value={plan.soLuongThucTe}
            editable={editable}
            keyboardType="numeric"
            placeholder="Chưa nhập — dùng số lượng kế hoạch"
            placeholderTextColor="#64748b"
            onFocus={revealFocusedInput}
            onChangeText={(value) => setPlan((current) => ({
              ...current, soLuongThucTe: value.replace(/\D/g, "")
            }))}
          />
          <Text style={styles.quantityHint}>
            Hiệu lực: {effectiveQuantity} · Chênh lệch: {plan.soLuongThucTe === "" ? "Chưa nhập" : effectiveQuantity - Number(plan.SoLuongKeHoach || 0)}
          </Text>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Phân bổ Lot / Lệnh xuất VT</Text>
          {editable && (
            <TouchableOpacity style={styles.addButton} onPress={addLot}>
              <Ionicons name="add-circle-outline" size={20} color="#2563eb" />
              <Text style={styles.addText}>Thêm dòng</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[
          styles.quantityHint,
          plan.lots.length > 0 && allocatedQuantity < effectiveQuantity && styles.warningText,
          allocatedQuantity > effectiveQuantity && styles.danger
        ]}>
          Đã phân bổ {allocatedQuantity}/{effectiveQuantity} · Còn lại {effectiveQuantity - allocatedQuantity}
        </Text>
        {plan.lots.map((item, index) => {
          const targetKey = lotKeyOf(item);
          const lotDefects = plan.defects
            .map((defect, defectIndex) => ({ defect, defectIndex }))
            .filter(({ defect }) => defectLotKey(defect) === targetKey);
          const lotErrorTotal = lotDefects.reduce((sum, row) =>
            sum + Number(row.defect.soLuong || 0), 0)
            + Number(item.soLoiBuiBan || 0)
            + Number(item.soLoiConTrung || 0);
          return (
            <View style={styles.lotCard} key={targetKey}>
              <View style={styles.lotCardHeader}>
                <Text style={styles.lotCardTitle}>Dòng Lot {index + 1}</Text>
                {editable && (
                  <TouchableOpacity style={styles.removeLotButton} onPress={() => removeLot(index)}>
                    <Ionicons name="trash-outline" size={19} color="#dc2626" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.lotRow}>
                <TextInput
                  style={[styles.lotTextInput, !editable && styles.readOnly]}
                  value={item.lot}
                  editable={editable}
                  placeholder="Lot"
                  placeholderTextColor="#64748b"
                  onFocus={revealFocusedInput}
                  onChangeText={(value) => updateLot(index, { lot: value })}
                />
                <TextInput
                  style={[styles.lotTextInput, !editable && styles.readOnly]}
                  value={item.lenhXuatVatTu}
                  editable={editable}
                  placeholder="Lệnh xuất VT"
                  placeholderTextColor="#64748b"
                  onFocus={revealFocusedInput}
                  onChangeText={(value) => updateLot(index, { lenhXuatVatTu: value })}
                />
                <TextInput
                  style={[styles.lotQuantityInput, !editable && styles.readOnly]}
                  value={item.soLuong}
                  editable={editable}
                  keyboardType="numeric"
                  placeholder="SL"
                  placeholderTextColor="#64748b"
                  onFocus={revealFocusedInput}
                  onChangeText={(value) => updateLot(index, { soLuong: value.replace(/\D/g, "") })}
                />
              </View>
              <View style={styles.specialDefects}>
                <View style={styles.specialDefectField}>
                  <Text style={styles.label}>Bụi bẩn</Text>
                  <TextInput
                    style={[styles.specialDefectInput, !editable && styles.readOnly]}
                    value={item.soLoiBuiBan}
                    editable={editable}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#64748b"
                    onFocus={revealFocusedInput}
                    onChangeText={(value) => updateLot(index, { soLoiBuiBan: value.replace(/\D/g, "") })}
                  />
                </View>
                <View style={styles.specialDefectField}>
                  <Text style={styles.label}>Côn trùng</Text>
                  <TextInput
                    style={[styles.specialDefectInput, !editable && styles.readOnly]}
                    value={item.soLoiConTrung}
                    editable={editable}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#64748b"
                    onFocus={revealFocusedInput}
                    onChangeText={(value) => updateLot(index, { soLoiConTrung: value.replace(/\D/g, "") })}
                  />
                </View>
              </View>
              <View style={styles.lotDefectHeader}>
                <Text style={styles.lotDefectTitle}>Lỗi của Lot ({lotErrorTotal}/{item.soLuong || 0})</Text>
                {editable && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                      setSelectedLotKey(targetKey);
                      setModalVisible(true);
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#2563eb" />
                    <Text style={styles.addText}>Thêm lỗi</Text>
                  </TouchableOpacity>
                )}
              </View>
              {!lotDefects.length && <Text style={styles.emptyText}>Chưa ghi nhận lỗi cho Lot này.</Text>}
              {lotDefects.map(({ defect, defectIndex }) => (
                <DefectEntryCard
                  key={`${targetKey}-${defect.defectId}-${defectIndex}`}
                  defect={defect}
                  editable={editable}
                  onChange={(patch) => updateDefect(defectIndex, patch)}
                  onRemove={() => removeDefect(defectIndex)}
                  onPickImages={() => pickImages(defectIndex)}
                  resolveAssetUrl={getAssetUrl}
                  onInputFocus={revealFocusedInput}
                />
              ))}
            </View>
          );
        })}
        {!plan.lots.length && <Text style={styles.emptyText}>Không bắt buộc phân bổ Lot.</Text>}

        {[
          ["Ghi chú chung", "ghiChu"]
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
        {!plan.lots.length && <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Lỗi ghi nhận ({plan.defects.length})</Text>
          {editable && (
            <TouchableOpacity style={styles.addButton} onPress={() => {
              setSelectedLotKey(null);
              setModalVisible(true);
            }}>
              <Ionicons name="add-circle-outline" size={20} color="#2563eb" /><Text style={styles.addText}>Chọn lỗi</Text>
            </TouchableOpacity>
          )}
        </View>}
        {!plan.lots.length && <View style={styles.specialDefects}>
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
        </View>}
        {!plan.lots.length && plan.defects.map((defect, index) => (
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
        {plan.lots.length > 0 && (
          plan.defects.some((defect) => !defectLotKey(defect))
          || Number(plan.soLoiBuiBan || 0) > 0
          || Number(plan.soLoiConTrung || 0) > 0
        ) && (
          <View style={styles.legacyCard}>
            <Text style={styles.legacyTitle}>Lỗi chưa xác định Lot</Text>
            <Text style={styles.warning}>Có thể lưu nháp, nhưng cần phân lại toàn bộ lỗi bên dưới trước khi hoàn tất.</Text>
            {(Number(plan.soLoiBuiBan || 0) > 0 || Number(plan.soLoiConTrung || 0) > 0) && (
              <View style={styles.legacyMoveBox}>
                <Text style={styles.label}>Bụi bẩn: {plan.soLoiBuiBan || 0} · Côn trùng: {plan.soLoiConTrung || 0}</Text>
                <MobileSelect
                  value={legacySpecialTarget}
                  options={lotOptions}
                  title="Chọn Lot nhận lỗi đặc biệt"
                  placeholder="Chọn Lot"
                  disabled={!editable}
                  onValueChange={setLegacySpecialTarget}
                />
                {editable && (
                  <TouchableOpacity style={styles.moveButton} onPress={moveLegacySpecialDefects}>
                    <Text style={styles.moveButtonText}>Chuyển vào Lot</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {plan.defects.map((defect, defectIndex) => !defectLotKey(defect) ? (
              <View key={`legacy-${defect.defectId}-${defectIndex}`}>
                <MobileSelect
                  value=""
                  options={lotOptions}
                  title="Chọn Lot cho lỗi"
                  placeholder="Chọn Lot cho lỗi này"
                  disabled={!editable}
                  onValueChange={(value) => {
                    const target = plan.lots.find((lot) => lotKeyOf(lot) === value);
                    updateDefect(defectIndex, {
                      lotId: target?.id || null,
                      lotClientKey: target?.id ? `id:${target.id}` : target?.clientKey || null
                    });
                  }}
                />
                <DefectEntryCard
                  defect={defect}
                  editable={editable}
                  onChange={(patch) => updateDefect(defectIndex, patch)}
                  onRemove={() => removeDefect(defectIndex)}
                  onPickImages={() => pickImages(defectIndex)}
                  resolveAssetUrl={getAssetUrl}
                  onInputFocus={revealFocusedInput}
                />
              </View>
            ) : null)}
          </View>
        )}
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
        onClose={() => {
          setModalVisible(false);
          setSelectedLotKey(null);
        }}
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
  quantityHint: { color: "#475569", fontSize: 12, marginTop: 6, marginBottom: 8 },
  warningText: { color: "#b45309", fontWeight: "700" },
  danger: { color: "#b91c1c", fontWeight: "700" },
  lotCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, padding: 12, marginBottom: 14 },
  lotCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  lotCardTitle: { color: "#0f172a", fontSize: 16, fontWeight: "800" },
  lotDefectHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 8 },
  lotDefectTitle: { color: "#334155", fontWeight: "800" },
  lotRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  lotTextInput: { flex: 1, minWidth: 0, height: 42, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 6, paddingHorizontal: 8, backgroundColor: "#fff" },
  lotQuantityInput: { width: 58, height: 42, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 6, paddingHorizontal: 6, textAlign: "center", backgroundColor: "#fff" },
  removeLotButton: { width: 34, height: 42, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#64748b", fontStyle: "italic", marginBottom: 12 },
  legacyCard: { borderWidth: 1, borderColor: "#f59e0b", backgroundColor: "#fffbeb", borderRadius: 12, padding: 12, marginTop: 16 },
  legacyTitle: { color: "#92400e", fontSize: 17, fontWeight: "800", marginBottom: 8 },
  legacyMoveBox: { gap: 8, marginBottom: 12 },
  moveButton: { minHeight: 42, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#2563eb" },
  moveButtonText: { color: "#fff", fontWeight: "800" },
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
