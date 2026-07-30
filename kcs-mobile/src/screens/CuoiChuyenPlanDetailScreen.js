import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import KeyboardFormScrollView from "../components/KeyboardFormScrollView";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import {
  getAssetUrl,
  getDefectList,
  getPhieuKiemDetail,
  saveCuoiChuyenData,
  uploadImages,
  uploadImagesWithXhr
} from "../api/phieuKiem.api";
import {
  getAssetUri,
  getExtensionFromMime,
  getMimeFromName,
  normalizeImageAssetForUpload
} from "../utils/imageUpload";
import { getUser } from "../utils/auth";

const IMAGE_PICKER_OPTIONS = { mediaTypes: ["images"], quality: 0.7, allowsEditing: false };
const canEditStatus = (status) => !["HOAN_TAT", "CHO_TBP_DUYET", "CHO_KIEM_NGHIEM", "CHO_XUONG_XAC_NHAN"].includes(status);
const isPermissionGranted = (status) => status === "granted" || status === "limited";

const createUploadFile = (asset, defectIndex, imageIndex, uriOverride = null) => {
  const uri = uriOverride || getAssetUri(asset);
  const mimeType = typeof asset === "string"
    ? getMimeFromName(uri)
    : (asset?.mimeType || getMimeFromName(asset?.fileName || uri));
  const extension = getExtensionFromMime(mimeType);
  const fallbackName = `cuoi-chuyen-${Date.now()}-${defectIndex}-${imageIndex}.${extension}`;
  const rawName = typeof asset === "string" ? uri?.split("/").pop()?.split("?")[0] : asset?.fileName;
  const name = rawName || fallbackName;
  return { uri, name: name.includes(".") ? name : `${name}.${extension}`, type: mimeType };
};

const formatDate = (value) => {
  if (!value) return "---";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "---";
  return date.toLocaleDateString("vi-VN");
};

export default function CuoiChuyenPlanDetailScreen({ route, navigation }) {
  const { id, planId } = route.params;
  const insets = useSafeAreaInsets();

  const [phieu, setPhieu] = useState(null);
  const [allPlans, setAllPlans] = useState([]);
  const [plan, setPlan] = useState(null);
  const [defectCatalog, setDefectCatalog] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defectModalVisible, setDefectModalVisible] = useState(false);
  const [defectSearch, setDefectSearch] = useState("");
  const [previewUri, setPreviewUri] = useState(null);

  const canEdit = user?.permissions?.includes("THUC_HIEN_KIEM") && canEditStatus(phieu?.TrangThai);

  useEffect(() => {
    loadData();
  }, [id, planId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [detailRes, defectRes, userInfo] = await Promise.all([
        getPhieuKiemDetail(id),
        getDefectList(),
        getUser()
      ]);
      const data = detailRes.data || {};
      const mappedPlans = (Array.isArray(data.plans) ? data.plans : []).map((item, planIndex) => ({
        localId: item.Id || `plan-${planIndex}`,
        id: item.Id,
        idKeHoachSanXuat: item.ID_KeHoachSanXuat,
        sanPhamId: item.SanPhamId,
        maSanPham: item.MaSanPham || "",
        tenSanPham: item.TenSanPham || "",
        tenDonVi: item.TenDonVi || "",
        tenBoPhan: item.TenBoPhan || "",
        ngayKeHoach: item.NgayKeHoach || "",
        soLuongKeHoach: item.SoLuongKeHoach,
        soLuongThucTe: item.SoLuongThucTe == null ? "" : String(item.SoLuongThucTe),
        nangSuatDuKien: item.NangSuatDuKien,
        daSanXuat: item.DaSanXuat,
        sortOrder: item.SortOrder || planIndex + 1,
        defects: Array.isArray(item.Defects) ? item.Defects.map((defect, defectIndex) => ({
          localId: defect.Id || `defect-${item.Id}-${defectIndex}`,
          id: defect.Id,
          defectId: defect.DefectId,
          MaLoi: defect.MaLoi,
          TenLoi: defect.TenLoi,
          MoTa: defect.MoTa,
          DefectType: defect.DefectType,
          soLuong: defect.SoLuong != null ? String(defect.SoLuong) : "",
          soLuongDatSauSua: defect.SoLuongDatSauSua != null ? String(defect.SoLuongDatSauSua) : "",
          soLuongKhongDatSauSua: defect.SoLuongKhongDatSauSua != null ? String(defect.SoLuongKhongDatSauSua) : "",
          ghiChu: defect.GhiChu || "",
          savedImages: Array.isArray(defect.ImageUrls) ? defect.ImageUrls : [],
          localImages: []
        })) : []
      }));

      const currentPlan = mappedPlans.find((item) => Number(item.id) === Number(planId));
      setPhieu(data.phieu || null);
      setAllPlans(mappedPlans);
      setPlan(currentPlan || null);
      setDefectCatalog(Array.isArray(defectRes.data) ? defectRes.data : []);
      setUser(userInfo);
    } catch (error) {
      console.error("CuoiChuyen plan load error:", error);
      Alert.alert("Lỗi", "Không thể tải dữ liệu kế hoạch cuối chuyền.");
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

  const metrics = useMemo(() => ({
    defectRows: plan?.defects?.length || 0,
    defectQty: (plan?.defects || []).reduce((sum, defect) => sum + (Number(defect.soLuong) || 0), 0),
    repairedPass: (plan?.defects || []).reduce((sum, defect) => sum + (Number(defect.soLuongDatSauSua) || 0), 0),
    repairedFail: (plan?.defects || []).reduce((sum, defect) => sum + (Number(defect.soLuongKhongDatSauSua) || 0), 0)
  }), [plan]);

  const addDefect = (defect) => {
    setPlan((prev) => {
      const existingIndex = (prev.defects || []).findIndex((item) => Number(item.defectId) === Number(defect.Id));
      if (existingIndex >= 0) {
        const nextDefects = [...prev.defects];
        const current = Number(nextDefects[existingIndex].soLuong || 0);
        nextDefects[existingIndex] = { ...nextDefects[existingIndex], soLuong: String(current + 1) };
        return { ...prev, defects: nextDefects };
      }
      return {
        ...prev,
        defects: [...(prev.defects || []), {
          localId: `defect-${Date.now()}-${defect.Id}`,
          defectId: defect.Id,
          MaLoi: defect.MaLoi,
          TenLoi: defect.TenLoi,
          MoTa: defect.MoTa,
          DefectType: defect.DefectType,
          soLuong: "1",
          soLuongDatSauSua: "",
          soLuongKhongDatSauSua: "",
          ghiChu: "",
          savedImages: [],
          localImages: []
        }]
      };
    });
    setDefectModalVisible(false);
  };

  const updateDefect = (defectIndex, patch) => {
    setPlan((prev) => ({
      ...prev,
      defects: (prev.defects || []).map((defect, currentIndex) =>
        currentIndex === defectIndex
          ? (typeof patch === "function" ? patch(defect) : { ...defect, ...patch })
          : defect
      )
    }));
  };

  const removeDefect = (defectIndex) => {
    setPlan((prev) => ({
      ...prev,
      defects: (prev.defects || []).filter((_, currentIndex) => currentIndex !== defectIndex)
    }));
  };

  const removeLocalImage = (defectIndex, imageIndex) => {
    updateDefect(defectIndex, (prev) => ({
      ...prev,
      localImages: (prev.localImages || []).filter((_, currentIndex) => currentIndex !== imageIndex)
    }));
  };

  const removeSavedImage = (defectIndex, imageIndex) => {
    updateDefect(defectIndex, (prev) => ({
      ...prev,
      savedImages: (prev.savedImages || []).filter((_, currentIndex) => currentIndex !== imageIndex)
    }));
  };

  const handlePickImage = (defectIndex) => {
    Alert.alert("Thêm hình ảnh", "Chọn nguồn ảnh", [
      {
        text: "Chụp ảnh",
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (!isPermissionGranted(status)) {
              Alert.alert("Lỗi", "Bạn cần cấp quyền camera để chụp ảnh.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync(IMAGE_PICKER_OPTIONS);
            if (!result.canceled) {
              const imageAsset = await normalizeImageAssetForUpload(result.assets?.[0], { prefix: "cuoi-chuyen" });
              if (!imageAsset) return;
              updateDefect(defectIndex, (prev) => ({
                ...prev,
                localImages: [...(prev.localImages || []), imageAsset]
              }));
            }
          } catch (error) {
            Alert.alert("Lỗi", "Không thể mở camera.");
          }
        }
      },
      {
        text: "Chọn từ thư viện",
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!isPermissionGranted(status)) {
              Alert.alert("Lỗi", "Bạn cần cấp quyền thư viện ảnh.");
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync(IMAGE_PICKER_OPTIONS);
            if (!result.canceled) {
              const imageAsset = await normalizeImageAssetForUpload(result.assets?.[0], { prefix: "cuoi-chuyen" });
              if (!imageAsset) return;
              updateDefect(defectIndex, (prev) => ({
                ...prev,
                localImages: [...(prev.localImages || []), imageAsset]
              }));
            }
          } catch (error) {
            Alert.alert("Lỗi", "Không thể mở thư viện ảnh.");
          }
        }
      },
      { text: "Hủy", style: "cancel" }
    ]);
  };

  const appendImagesToFormData = (formData, images, defectIndex, uriOverrides = {}) => {
    images.forEach((asset, imageIndex) => {
      const uri = uriOverrides[imageIndex] || getAssetUri(asset);
      if (!uri) return;
      formData.append("images", createUploadFile(asset, defectIndex, imageIndex, uri));
    });
  };

  const copyImagesToCache = async (images, defectIndex) => {
    const cachedUris = {};
    for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
      const asset = images[imageIndex];
      const sourceUri = getAssetUri(asset);
      if (!sourceUri) continue;
      const uploadFile = createUploadFile(asset, defectIndex, imageIndex);
      const extension = getExtensionFromMime(uploadFile.type);
      const destination = `${FileSystem.cacheDirectory}cuoi-chuyen-${Date.now()}-${defectIndex}-${imageIndex}.${extension}`;
      await FileSystem.copyAsync({ from: sourceUri, to: destination });
      cachedUris[imageIndex] = destination;
    }
    return cachedUris;
  };

  const uploadDefectImages = async (images, defectIndex) => {
    const formData = new FormData();
    appendImagesToFormData(formData, images, defectIndex);
    try {
      const uploadRes = await uploadImages(formData);
      return uploadRes.data?.filePaths || [];
    } catch (error) {
      if (Platform.OS !== "android") throw error;
      const cachedUris = await copyImagesToCache(images, defectIndex);
      const retryFormData = new FormData();
      appendImagesToFormData(retryFormData, images, defectIndex, cachedUris);
      const retryUploadRes = await uploadImagesWithXhr(retryFormData);
      return retryUploadRes.data?.filePaths || [];
    }
  };

  const validatePlan = () => {
    if (plan.soLuongThucTe !== ""
      && (!Number.isInteger(Number(plan.soLuongThucTe)) || Number(plan.soLuongThucTe) < 0)) {
      return "Số lượng thực tế phải là số nguyên không âm hoặc để trống.";
    }
    const validDefects = (plan?.defects || []).filter((defect) => Number(defect.defectId) > 0 && Number(defect.soLuong) > 0);
    if (validDefects.length === 0) {
      return "Cần có ít nhất một lỗi để lưu kế hoạch.";
    }
    const effective = plan.soLuongThucTe === "" ? Number(plan.soLuongKeHoach || 0) : Number(plan.soLuongThucTe);
    const totalDefects = validDefects.reduce((sum, defect) => sum + Number(defect.soLuong || 0), 0);
    if (totalDefects > effective) {
      return `Tổng lỗi (${totalDefects}) vượt số lượng hiệu lực (${effective}).`;
    }
    return "";
  };

  const buildPayloadPlans = (sourcePlans) => sourcePlans.map((item) => ({
    planId: item.id,
    sortOrder: item.sortOrder,
    soLuongThucTe: item.soLuongThucTe === "" ? null : Number(item.soLuongThucTe),
    defects: (item.defects || [])
      .filter((defect) => Number(defect.defectId) > 0 && Number(defect.soLuong) > 0)
      .map((defect, defectIndex) => ({
        defectId: Number(defect.defectId),
        soLuong: Number(defect.soLuong || 0),
        soLuongDatSauSua: String(defect.soLuongDatSauSua || "").trim() === "" ? null : Number(defect.soLuongDatSauSua || 0),
        soLuongKhongDatSauSua: String(defect.soLuongKhongDatSauSua || "").trim() === "" ? null : Number(defect.soLuongKhongDatSauSua || 0),
        ghiChu: String(defect.ghiChu || "").trim(),
        imageUrls: Array.isArray(defect.savedImages) ? defect.savedImages : [],
        sortOrder: defectIndex + 1
      }))
  }));

  const handleSave = async () => {
    const validationMessage = validatePlan();
    if (validationMessage) {
      Alert.alert("Dữ liệu chưa hợp lệ", validationMessage);
      return;
    }

    const uploadReadyPlan = {
      ...plan,
      defects: (plan.defects || []).map((defect) => ({
        ...defect,
        savedImages: Array.isArray(defect.savedImages) ? [...defect.savedImages] : [],
        localImages: Array.isArray(defect.localImages) ? [...defect.localImages] : []
      }))
    };

    try {
      setSaving(true);
      for (let defectIndex = 0; defectIndex < (uploadReadyPlan.defects || []).length; defectIndex++) {
        const defect = uploadReadyPlan.defects[defectIndex];
        if (Array.isArray(defect.localImages) && defect.localImages.length > 0) {
          const uploadedUrls = await uploadDefectImages(defect.localImages, defectIndex);
          defect.savedImages = [...(defect.savedImages || []), ...uploadedUrls];
          defect.localImages = [];
        }
      }

      const mergedPlans = (allPlans || []).map((item) => Number(item.id) === Number(planId) ? uploadReadyPlan : item);
      await saveCuoiChuyenData({
        phieuKiemId: id,
        plans: buildPayloadPlans(mergedPlans)
      });

      Alert.alert("Thành công", "Đã lưu lỗi theo kế hoạch.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể lưu dữ liệu.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !plan) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <KeyboardFormScrollView
        contentContainerStyle={[styles.content, canEdit ? styles.contentWithBottomBar : null]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerEyebrow}>Ghi nhận lỗi theo kế hoạch</Text>
              <Text style={styles.slotTitle}>{plan.maSanPham || `KH #${plan.idKeHoachSanXuat}`}</Text>
              <Text style={styles.metaText}>{plan.tenSanPham || "---"}</Text>
            </View>
          </View>

          <View style={styles.headerMetaRow}>
            <View style={styles.headerMetaChip}>
              <Text style={styles.headerMetaValue}>{metrics.defectRows}</Text>
              <Text style={styles.headerMetaLabel}>Dòng lỗi</Text>
            </View>
            <View style={styles.headerMetaChip}>
              <Text style={styles.headerMetaValue}>{metrics.defectQty}</Text>
              <Text style={styles.headerMetaLabel}>Tổng lỗi</Text>
            </View>
            <View style={styles.headerMetaChip}>
              <Text style={styles.headerMetaValue}>{metrics.repairedPass}/{metrics.repairedFail}</Text>
              <Text style={styles.headerMetaLabel}>Đạt/KĐ</Text>
            </View>
          </View>

          <Text style={styles.metaText}>{plan.tenDonVi || "---"} / {plan.tenBoPhan || "---"} • {formatDate(plan.ngayKeHoach)}</Text>
        </View>

        <View style={styles.actualQuantityCard}>
          <Text style={styles.actualQuantityLabel}>Số lượng thực tế (không bắt buộc)</Text>
          <TextInput
            style={styles.actualQuantityInput}
            value={plan.soLuongThucTe}
            editable={canEdit}
            keyboardType="numeric"
            placeholder="Chưa nhập — dùng kế hoạch"
            placeholderTextColor="#64748b"
            onChangeText={(value) => setPlan((current) => ({
              ...current, soLuongThucTe: value.replace(/\D/g, "")
            }))}
          />
          <Text style={styles.actualQuantityHint}>
            Kế hoạch: {plan.soLuongKeHoach ?? 0} · Hiệu lực: {plan.soLuongThucTe === "" ? plan.soLuongKeHoach ?? 0 : plan.soLuongThucTe}
            {" · "}Chênh lệch: {plan.soLuongThucTe === "" ? "Chưa nhập" : Number(plan.soLuongThucTe) - Number(plan.soLuongKeHoach || 0)}
          </Text>
        </View>

        {(plan.defects || []).length === 0 ? (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="albums-outline" size={22} color="#2563eb" />
            </View>
            <Text style={styles.emptyStateTitle}>Chưa có lỗi</Text>
            <Text style={styles.emptyStateDescription}>Thêm lỗi phát sinh của kế hoạch này để bắt đầu ghi nhận.</Text>
          </View>
        ) : null}

        {(plan.defects || []).map((defect, defectIndex) => (
          <View key={defect.localId} style={styles.defectCard}>
            <View style={styles.defectCompactRow}>
              <View style={styles.defectInfoCol}>
                <View style={styles.defectCodeBadge}>
                  <Text style={styles.defectCode}>{defect.MaLoi || "---"}</Text>
                </View>
                <Text style={styles.defectName}>{defect.TenLoi || "---"}</Text>
                {defect.MoTa ? <Text style={styles.defectDesc} numberOfLines={3}>{defect.MoTa}</Text> : null}
                <Text style={styles.defectType}>{defect.DefectType || "---"}</Text>
              </View>

              <View style={styles.defectActionCol}>
                <TextInput
                  style={styles.quantityInput}
                  placeholder="SL"
                  keyboardType="numeric"
                  value={defect.soLuong}
                  onChangeText={(value) => updateDefect(defectIndex, { soLuong: value.replace(/[^0-9]/g, "") })}
                  editable={canEdit}
                />
                <View style={styles.defectInlineButtons}>
                  {canEdit ? (
                    <TouchableOpacity style={styles.imageButton} onPress={() => handlePickImage(defectIndex)}>
                      <Ionicons name="image-outline" size={18} color="#2563eb" />
                    </TouchableOpacity>
                  ) : null}
                  {canEdit ? (
                    <TouchableOpacity style={styles.iconGhostButton} onPress={() => removeDefect(defectIndex)}>
                      <Ionicons name="close" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.repairReportBox}>
              <Text style={styles.repairReportTitle}>Báo cáo sửa lỗi</Text>
              <View style={styles.repairReportRow}>
                <View style={styles.repairInputGroup}>
                  <Text style={styles.repairInputLabel}>Đạt</Text>
                  <TextInput
                    style={styles.repairInput}
                    placeholder="0"
                    keyboardType="numeric"
                    value={defect.soLuongDatSauSua}
                    onChangeText={(value) => updateDefect(defectIndex, { soLuongDatSauSua: value.replace(/[^0-9]/g, "") })}
                    editable={canEdit}
                  />
                </View>
                <View style={styles.repairInputGroup}>
                  <Text style={styles.repairInputLabel}>Không đạt</Text>
                  <TextInput
                    style={styles.repairInput}
                    placeholder="0"
                    keyboardType="numeric"
                    value={defect.soLuongKhongDatSauSua}
                    onChangeText={(value) => updateDefect(defectIndex, { soLuongKhongDatSauSua: value.replace(/[^0-9]/g, "") })}
                    editable={canEdit}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Ghi chú</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              editable={canEdit}
              value={defect.ghiChu}
              onChangeText={(value) => updateDefect(defectIndex, { ghiChu: value })}
            />

            <View style={styles.imageList}>
              {(defect.savedImages || []).map((uri, imageIndex) => (
                <View key={`saved-${uri}-${imageIndex}`} style={styles.imageThumbWrap}>
                  <TouchableOpacity onPress={() => setPreviewUri(getAssetUrl(uri))}>
                    <Image source={{ uri: getAssetUrl(uri) }} style={styles.imageThumb} />
                  </TouchableOpacity>
                  {canEdit ? (
                    <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => removeSavedImage(defectIndex, imageIndex)}>
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
              {(defect.localImages || []).map((asset, imageIndex) => {
                const uri = getAssetUri(asset);
                if (!uri) return null;
                return (
                  <View key={`local-${uri}-${imageIndex}`} style={styles.imageThumbWrap}>
                    <TouchableOpacity onPress={() => setPreviewUri(uri)}>
                      <Image source={{ uri }} style={styles.imageThumb} />
                    </TouchableOpacity>
                    {canEdit ? (
                      <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => removeLocalImage(defectIndex, imageIndex)}>
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </KeyboardFormScrollView>

      {canEdit ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={styles.addDefectButton} onPress={() => setDefectModalVisible(true)}>
            <Ionicons name="add" size={20} color="#2563eb" />
            <Text style={styles.addDefectText}>Thêm lỗi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, saving ? styles.disabledButton : null]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Lưu</Text>}
          </TouchableOpacity>
        </View>
      ) : null}
      </KeyboardAvoidingView>

      <Modal visible={defectModalVisible} transparent animationType="slide" onRequestClose={() => setDefectModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) }]}
          >
            <Text style={styles.modalTitle}>Chọn lỗi</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Tìm mã lỗi / tên lỗi..."
              placeholderTextColor="#cbd5e1"
              value={defectSearch}
              onChangeText={setDefectSearch}
            />

            <KeyboardFormScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              {filteredDefects.length === 0 ? (
                <View style={styles.modalEmptyState}>
                  <Ionicons name="search-outline" size={40} color="#cbd5e1" />
                  <Text style={styles.modalEmptyText}>Không tìm thấy mã lỗi phù hợp</Text>
                </View>
              ) : filteredDefects.map((defect) => {
                const typeColor = defect.DefectType === "CRITICAL" ? "#ef4444" : defect.DefectType === "MAJOR" ? "#f59e0b" : "#3b82f6";
                return (
                  <TouchableOpacity key={defect.Id} style={styles.modalDefectItem} onPress={() => addDefect(defect)}>
                    <View style={styles.modalDefectTopRow}>
                      <View style={styles.modalDefectTitleRow}>
                        <View style={[styles.modalTypeBadge, { backgroundColor: typeColor }]}>
                          <Text style={styles.modalTypeBadgeText}>{defect.DefectType || "---"}</Text>
                        </View>
                        <Text style={styles.modalDefectCode}>{defect.MaLoi || "---"}</Text>
                      </View>
                      <TouchableOpacity style={styles.modalAddButton} onPress={() => addDefect(defect)}>
                        <Ionicons name="add-circle-outline" size={24} color="#2563eb" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.modalDefectName}>{defect.TenLoi || "---"}</Text>
                    {defect.MoTa ? <Text style={styles.modalDefectDesc}>{defect.MoTa}</Text> : null}
                    {(defect.TenSanPham || defect.ChungLoai) ? (
                      <Text style={styles.modalDefectDesc}>
                        {[defect.TenSanPham, defect.ChungLoai].filter(Boolean).join(" - ")}
                      </Text>
                    ) : null}
                    {defect.ImageUrl ? (
                      <Image
                        source={{ uri: getAssetUrl(defect.ImageUrl) }}
                        style={styles.modalDefectImage}
                        resizeMode="cover"
                      />
                    ) : null}
                    {(defect.PhamViApDung || defect.GhiChu) ? (
                      <View style={styles.modalNoteBox}>
                        <Ionicons name="alert-circle-outline" size={14} color="#2563eb" />
                        <Text style={styles.modalNoteText}>{defect.PhamViApDung || defect.GhiChu}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </KeyboardFormScrollView>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setDefectModalVisible(false)}>
              <Text style={styles.closeBtnText}>Đóng</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={Boolean(previewUri)} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewCloseArea} activeOpacity={1} onPress={() => setPreviewUri(null)}>
            {previewUri ? <Image source={{ uri: previewUri }} style={styles.previewFullImage} resizeMode="contain" /> : null}
            <TouchableOpacity style={styles.previewCloseBtn} onPress={() => setPreviewUri(null)}>
              <Ionicons name="close-circle" size={40} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fb" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 16 },
  contentWithBottomBar: { paddingBottom: 104 },
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  headerEyebrow: { color: "#64748b", fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 6 },
  slotTitle: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  headerMetaRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  headerMetaChip: {
    flex: 1,
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbeafe",
    paddingVertical: 10,
    paddingHorizontal: 10
  },
  headerMetaValue: { color: "#1d4ed8", fontSize: 16, fontWeight: "800" },
  headerMetaLabel: { marginTop: 2, color: "#64748b", fontSize: 11, fontWeight: "600" },
  metaText: { fontSize: 13, color: "#475569", marginTop: 12 },
  emptyStateCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center"
  },
  emptyStateIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    marginBottom: 12
  },
  emptyStateTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  emptyStateDescription: { marginTop: 6, color: "#64748b", fontSize: 14, lineHeight: 20, textAlign: "center" },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    backgroundColor: "#fff",
    color: "#0f172a",
    marginBottom: 12
  },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  defectCard: {
    borderWidth: 1,
    borderColor: "#dbe5f1",
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#fbfdff",
    marginBottom: 12
  },
  defectCompactRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  defectInfoCol: { flex: 1 },
  defectActionCol: { width: 96, alignItems: "center", gap: 10 },
  defectCodeBadge: { alignSelf: "flex-start", backgroundColor: "#dbeafe", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 8 },
  defectCode: { fontSize: 11, color: "#1d4ed8", fontWeight: "800" },
  defectName: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  defectDesc: { fontSize: 13, color: "#475569", marginTop: 6, lineHeight: 19 },
  defectType: { fontSize: 12, color: "#64748b", marginTop: 4, fontWeight: "600" },
  quantityInput: {
    width: 78,
    height: 48,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#1d4ed8",
    backgroundColor: "#fff"
  },
  defectInlineButtons: { flexDirection: "row", alignItems: "center", gap: 8 },
  imageButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff"
  },
  iconGhostButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff5f5"
  },
  repairReportBox: {
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  repairReportTitle: { fontSize: 13, fontWeight: "800", color: "#334155", marginBottom: 10 },
  repairReportRow: { flexDirection: "row", gap: 10 },
  repairInputGroup: { flex: 1 },
  repairInputLabel: { fontSize: 12, fontWeight: "700", color: "#64748b", marginBottom: 6 },
  repairInput: {
    height: 42,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 10,
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    backgroundColor: "#fff",
    textAlign: "center"
  },
  actualQuantityCard: { marginTop: 12, padding: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbe3ec", borderRadius: 14 },
  actualQuantityLabel: { color: "#334155", fontWeight: "700", marginBottom: 7 },
  actualQuantityInput: { minHeight: 46, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, paddingHorizontal: 12, backgroundColor: "#fff", color: "#0f172a", fontSize: 16 },
  actualQuantityHint: { color: "#64748b", fontSize: 12, marginTop: 7 },
  imageList: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  imageThumbWrap: { marginRight: 12, marginBottom: 12, position: "relative" },
  imageThumb: { width: 76, height: 76, borderRadius: 12, borderWidth: 1, borderColor: "#cbd5e1" },
  imageRemoveBtn: { position: "absolute", top: -8, right: -8, backgroundColor: "#fff", borderRadius: 12 },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 12,
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
  addDefectButton: {
    flex: 1.25,
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe"
  },
  addDefectText: { color: "#2563eb", fontWeight: "700", fontSize: 15 },
  saveButton: {
    flex: 0.9,
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
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  disabledButton: { opacity: 0.65 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
    minHeight: "60%"
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#0f172a", marginBottom: 15, textAlign: "center" },
  searchInput: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 15,
    fontSize: 15
  },
  modalEmptyState: { padding: 20, alignItems: "center" },
  modalEmptyText: { color: "#94a3b8", marginTop: 8 },
  modalDefectItem: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2
  },
  modalDefectTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalDefectTitleRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  modalTypeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  modalTypeBadgeMinor: { backgroundColor: "#3b82f6" },
  modalTypeBadgeMajor: { backgroundColor: "#f59e0b" },
  modalTypeBadgeCritical: { backgroundColor: "#ef4444" },
  modalTypeBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  modalDefectCode: { fontSize: 14, color: "#64748b", fontWeight: "bold", marginLeft: 8 },
  modalDefectName: { fontSize: 16, color: "#0f172a", fontWeight: "600", marginTop: 2 },
  modalDefectDesc: { fontSize: 13, color: "#64748b", marginTop: 6, lineHeight: 18 },
  modalAddButton: { marginLeft: 8, alignSelf: "flex-start" },
  modalDefectImage: { width: "100%", height: 160, borderRadius: 12, marginTop: 10, backgroundColor: "#e2e8f0" },
  modalNoteBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#eff6ff",
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#2563eb"
  },
  modalNoteText: { color: "#1e40af", fontSize: 12, fontWeight: "500", marginLeft: 4, flex: 1 },
  closeBtn: { backgroundColor: "#64748b", padding: 14, borderRadius: 14, alignItems: "center", marginTop: 15 },
  closeBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  previewOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.9)", justifyContent: "center", alignItems: "center" },
  previewCloseArea: { flex: 1, width: "100%", justifyContent: "center", alignItems: "center" },
  previewFullImage: { width: "92%", height: "80%" },
  previewCloseBtn: { position: "absolute", top: 48, right: 20 }
});
