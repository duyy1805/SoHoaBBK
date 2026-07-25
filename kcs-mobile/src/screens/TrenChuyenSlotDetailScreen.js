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
  Modal,
  Image,
  Platform,
  KeyboardAvoidingView
} from "react-native";
import KeyboardFormScrollView from "../components/KeyboardFormScrollView";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import {
  getDefectList,
  getPhieuKiemDetail,
  saveTrenChuyenData,
  deleteTrenChuyenEntry,
  uploadImages,
  uploadImagesWithXhr,
  getAssetUrl
} from "../api/phieuKiem.api";
import { getUser } from "../utils/auth";
import {
  getAssetUri,
  getExtensionFromMime,
  getMimeFromName,
  normalizeImageAssetForUpload
} from "../utils/imageUpload";

const HOUR_OPTIONS = ["07:30", "08:30", "09:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30", "16:30"];
const IMAGE_PICKER_OPTIONS = { mediaTypes: ["images"], quality: 0.7, allowsEditing: false };

const canEditStatus = (status) => !["HOAN_TAT", "CHO_TBP_DUYET", "CHO_KIEM_NGHIEM", "CHO_XUONG_XAC_NHAN"].includes(status);
const isPermissionGranted = (status) => status === "granted" || status === "limited";
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
const createUploadFile = (asset, entryIndex, defectIndex, imageIndex, uriOverride = null) => {
  const uri = uriOverride || getAssetUri(asset);
  const mimeType = typeof asset === "string"
    ? getMimeFromName(uri)
    : (asset?.mimeType || getMimeFromName(asset?.fileName || uri));
  const extension = getExtensionFromMime(mimeType);
  const fallbackName = `tren-chuyen-${Date.now()}-${entryIndex}-${defectIndex}-${imageIndex}.${extension}`;
  const rawName = typeof asset === "string" ? uri?.split("/").pop()?.split("?")[0] : asset?.fileName;
  const name = rawName || fallbackName;
  return { uri, name: name.includes(".") ? name : `${name}.${extension}`, type: mimeType };
};

const createEmptyEntry = (index = 0, userInfo = null) => ({
  localId: `entry-${Date.now()}-${index}`,
  congDoan: "",
  tenCongNhanGayLoi: "",
  nguoiGhiNhanId: userInfo?.id || userInfo?.userId || null,
  tenNguoiGhiNhan: userInfo?.fullName || userInfo?.FullName || "",
  ghiChu: "",
  sortOrder: index + 1,
  defects: []
});

export default function TrenChuyenSlotDetailScreen({ route, navigation }) {
  const { id, gioKiem } = route.params;
  const insets = useSafeAreaInsets();
  const [phieu, setPhieu] = useState(null);
  const [allSlots, setAllSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [defectCatalog, setDefectCatalog] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defectModalVisible, setDefectModalVisible] = useState(false);
  const [activeEntryIndex, setActiveEntryIndex] = useState(-1);
  const [defectSearch, setDefectSearch] = useState("");
  const [previewUri, setPreviewUri] = useState(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const canEdit = user?.permissions?.includes("THUC_HIEN_KIEM") && canEditStatus(phieu?.TrangThai);
  const statusMeta = getStatusMeta(phieu?.TrangThai);
  const canManageAllEntries = Boolean(
    user?.permissions?.includes("PHAN_BO_KIEM") || user?.permissions?.includes("KET_LUAN")
  );

  useEffect(() => {
    loadData();
  }, [id, gioKiem]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [detailRes, defectRes, userInfo] = await Promise.all([
        getPhieuKiemDetail(id),
        getDefectList(),
        getUser()
      ]);
      const data = detailRes.data || {};
      const slots = Array.isArray(data.slots) ? data.slots : [];
      const existingSlot = slots.find((item) => item.GioKiem === gioKiem);

      const mappedSlots = slots.map((item, slotIndex) => ({
        localId: item.Id || `slot-${item.GioKiem}-${slotIndex}`,
        id: item.Id,
        gioKiem: item.GioKiem,
        sortOrder: item.SortOrder || slotIndex + 1,
        entries: Array.isArray(item.Entries) ? item.Entries.map((entry, entryIndex) => ({
          localId: entry.Id || `entry-${item.Id || slotIndex}-${entryIndex}`,
          id: entry.Id,
          congDoan: entry.CongDoan || "",
          tenCongNhanGayLoi: entry.TenCongNhanGayLoi || "",
          nguoiGhiNhanId: entry.NguoiGhiNhanId || null,
          tenNguoiGhiNhan: entry.TenNguoiGhiNhan || "",
          ghiChu: entry.GhiChu || "",
          sortOrder: entry.SortOrder || entryIndex + 1,
          defects: Array.isArray(entry.Defects) ? entry.Defects.map((defect, defectIndex) => ({
            localId: defect.Id || `defect-${entry.Id || entryIndex}-${defectIndex}`,
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
        })) : []
      }));

      setAllSlots(mappedSlots);
      setPhieu(data.phieu || null);
      setUser(userInfo);
      setDefectCatalog(Array.isArray(defectRes.data) ? defectRes.data : []);

      if (existingSlot) {
        const mapped = mappedSlots.find((item) => item.gioKiem === gioKiem);
        setSlot(mapped);
      } else {
        const hourIndex = HOUR_OPTIONS.indexOf(gioKiem);
        setSlot({
          localId: `slot-${gioKiem}-${Date.now()}`,
          gioKiem,
          sortOrder: hourIndex >= 0 ? hourIndex + 1 : mappedSlots.length + 1,
          entries: []
        });
      }
    } catch (error) {
      console.error("TrenChuyen slot load error:", error);
      Alert.alert("Lỗi", "Không thể tải dữ liệu khung giờ.");
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

  const slotMetrics = useMemo(() => ({
    entryCount: slot?.entries?.length || 0,
    defectRows: (slot?.entries || []).reduce((sum, entry) => sum + ((entry.defects || []).length), 0),
    defectQty: (slot?.entries || []).reduce(
      (sum, entry) => sum + (entry.defects || []).reduce((inner, defect) => inner + (Number(defect.soLuong) || 0), 0),
      0
    )
  }), [slot]);

  const addEntry = () => {
    setSlot((prev) => ({
      ...prev,
      entries: [...(prev?.entries || []), createEmptyEntry(prev?.entries?.length || 0, user)]
    }));
  };

  const updateEntry = (entryIndex, patch) => {
    setSlot((prev) => ({
      ...prev,
      entries: (prev.entries || []).map((entry, currentIndex) =>
        currentIndex === entryIndex ? { ...entry, ...patch } : entry
      )
    }));
  };

  const removeEntry = (entryIndex) => {
    setSlot((prev) => ({
      ...prev,
      entries: (prev.entries || [])
        .filter((_, currentIndex) => currentIndex !== entryIndex)
        .map((entry, currentIndex) => ({ ...entry, sortOrder: currentIndex + 1 }))
    }));
  };

  const canDeleteEntry = (entry) => {
    const currentUserId = user?.id || user?.userId;
    if (!canEdit) return false;
    if (canManageAllEntries) return true;
    if (!entry?.nguoiGhiNhanId || !currentUserId) return true;
    return Number(entry.nguoiGhiNhanId) === Number(currentUserId);
  };

  const openDefectModal = (entryIndex) => {
    setActiveEntryIndex(entryIndex);
    setDefectSearch("");
    setDefectModalVisible(true);
  };

  const addDefectToEntry = (defect) => {
    if (activeEntryIndex < 0) return;
    setSlot((prev) => ({
      ...prev,
      entries: prev.entries.map((entry, currentIndex) => {
        if (currentIndex !== activeEntryIndex) return entry;
        const existingIndex = entry.defects.findIndex((item) => Number(item.defectId) === Number(defect.Id));
        if (existingIndex >= 0) {
          const nextDefects = [...entry.defects];
          const current = Number(nextDefects[existingIndex].soLuong || 0);
          nextDefects[existingIndex] = { ...nextDefects[existingIndex], soLuong: String(current + 1) };
          return { ...entry, defects: nextDefects };
        }
        return {
          ...entry,
          defects: [...entry.defects, {
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
      })
    }));
    setDefectModalVisible(false);
  };

  const updateDefect = (entryIndex, defectIndex, patch) => {
    setSlot((prev) => ({
      ...prev,
      entries: prev.entries.map((entry, currentEntryIndex) => {
        if (currentEntryIndex !== entryIndex) return entry;
        return {
          ...entry,
          defects: entry.defects.map((defect, currentDefectIndex) =>
            currentDefectIndex === defectIndex
              ? (typeof patch === "function" ? patch(defect) : { ...defect, ...patch })
              : defect
          )
        };
      })
    }));
  };

  const removeDefect = (entryIndex, defectIndex) => {
    setSlot((prev) => ({
      ...prev,
      entries: prev.entries.map((entry, currentEntryIndex) =>
        currentEntryIndex === entryIndex
          ? { ...entry, defects: entry.defects.filter((_, currentDefectIndex) => currentDefectIndex !== defectIndex) }
          : entry
      )
    }));
  };

  const removeLocalImage = (entryIndex, defectIndex, imageIndex) => {
    updateDefect(entryIndex, defectIndex, (prev) => ({
      ...prev,
      localImages: (prev.localImages || []).filter((_, currentIndex) => currentIndex !== imageIndex)
    }));
  };

  const removeSavedImage = (entryIndex, defectIndex, imageIndex) => {
    updateDefect(entryIndex, defectIndex, (prev) => ({
      ...prev,
      savedImages: (prev.savedImages || []).filter((_, currentIndex) => currentIndex !== imageIndex)
    }));
  };

  const handlePreviewImage = (uri) => {
    setPreviewUri(uri);
    setIsPreviewVisible(true);
  };

  const handlePickImage = (entryIndex, defectIndex) => {
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
              const imageAsset = await normalizeImageAssetForUpload(result.assets?.[0], { prefix: "tren-chuyen" });
              if (!imageAsset) return;
              updateDefect(entryIndex, defectIndex, (prev) => ({
                ...prev,
                localImages: [...(prev.localImages || []), imageAsset]
              }));
            }
          } catch (error) {
            console.error(error);
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
              const imageAsset = await normalizeImageAssetForUpload(result.assets?.[0], { prefix: "tren-chuyen" });
              if (!imageAsset) return;
              updateDefect(entryIndex, defectIndex, (prev) => ({
                ...prev,
                localImages: [...(prev.localImages || []), imageAsset]
              }));
            }
          } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Không thể mở thư viện ảnh.");
          }
        }
      },
      { text: "Hủy", style: "cancel" }
    ]);
  };

  const appendImagesToFormData = (formData, images, entryIndex, defectIndex, uriOverrides = {}) => {
    images.forEach((asset, imageIndex) => {
      const uri = uriOverrides[imageIndex] || getAssetUri(asset);
      if (!uri) return;
      formData.append("images", createUploadFile(asset, entryIndex, defectIndex, imageIndex, uri));
    });
  };

  const copyImagesToCache = async (images, entryIndex, defectIndex) => {
    const cachedUris = {};
    for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
      const asset = images[imageIndex];
      const sourceUri = getAssetUri(asset);
      if (!sourceUri) continue;
      const uploadFile = createUploadFile(asset, entryIndex, defectIndex, imageIndex);
      const extension = getExtensionFromMime(uploadFile.type);
      const destination = `${FileSystem.cacheDirectory}tren-chuyen-${Date.now()}-${entryIndex}-${defectIndex}-${imageIndex}.${extension}`;
      await FileSystem.copyAsync({ from: sourceUri, to: destination });
      cachedUris[imageIndex] = destination;
    }
    return cachedUris;
  };

  const uploadDefectImages = async (images, entryIndex, defectIndex) => {
    const formData = new FormData();
    appendImagesToFormData(formData, images, entryIndex, defectIndex);
    try {
      const uploadRes = await uploadImages(formData);
      return uploadRes.data?.filePaths || [];
    } catch (error) {
      if (Platform.OS !== "android") throw error;
      const cachedUris = await copyImagesToCache(images, entryIndex, defectIndex);
      const retryFormData = new FormData();
      appendImagesToFormData(retryFormData, images, entryIndex, defectIndex, cachedUris);
      const retryUploadRes = await uploadImagesWithXhr(retryFormData);
      return retryUploadRes.data?.filePaths || [];
    }
  };

  const buildPayloadSlots = (sourceSlots) => sourceSlots.map((item, slotIndex) => ({
    gioKiem: item.gioKiem,
    sortOrder: item.sortOrder || slotIndex + 1,
    entries: (item.entries || []).map((entry, entryIndex) => ({
      congDoan: String(entry.congDoan || "").trim(),
      tenCongNhanGayLoi: String(entry.tenCongNhanGayLoi || "").trim(),
      nguoiGhiNhanId: entry.nguoiGhiNhanId || user?.id || user?.userId || null,
      ghiChu: String(entry.ghiChu || "").trim(),
      sortOrder: entry.sortOrder || entryIndex + 1,
      defects: (entry.defects || [])
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
    }))
  }));

  const validateSlot = (currentSlot) => {
    if (!currentSlot?.gioKiem || !HOUR_OPTIONS.includes(currentSlot.gioKiem)) {
      return "Khung giờ không hợp lệ.";
    }
    let hasData = false;
    for (const entry of currentSlot.entries || []) {
      const validDefects = (entry.defects || []).filter((defect) => defect.defectId > 0 && defect.soLuong > 0);
      if (validDefects.length === 0) continue;
      hasData = true;
      if (!String(entry.congDoan || "").trim()) {
        return `Khung giờ ${currentSlot.gioKiem} có công đoạn chưa nhập.`;
      }
      if (!String(entry.tenCongNhanGayLoi || "").trim()) {
        return `Khung giờ ${currentSlot.gioKiem} có tên công nhân gây lỗi chưa nhập.`;
      }
    }
    if (!hasData) {
      return "Cần có ít nhất một công đoạn có lỗi để lưu khung giờ.";
    }
    return "";
  };

  const handleSave = async () => {
    const validationMessage = validateSlot(slot);
    if (validationMessage) {
      Alert.alert("Dữ liệu chưa hợp lệ", validationMessage);
      return;
    }

    const uploadReadySlot = {
      ...slot,
      entries: (slot.entries || []).map((entry) => ({
        ...entry,
        defects: (entry.defects || []).map((defect) => ({
          ...defect,
          savedImages: Array.isArray(defect.savedImages) ? [...defect.savedImages] : [],
          localImages: Array.isArray(defect.localImages) ? [...defect.localImages] : []
        }))
      }))
    };

    try {
      setSaving(true);

      for (let entryIndex = 0; entryIndex < (uploadReadySlot.entries || []).length; entryIndex++) {
        const entry = uploadReadySlot.entries[entryIndex];
        for (let defectIndex = 0; defectIndex < (entry.defects || []).length; defectIndex++) {
          const defect = entry.defects[defectIndex];
          if (Array.isArray(defect.localImages) && defect.localImages.length > 0) {
            const uploadedUrls = await uploadDefectImages(defect.localImages, entryIndex, defectIndex);
            defect.savedImages = [...(defect.savedImages || []), ...uploadedUrls];
            defect.localImages = [];
          }
        }
      }

      const otherSlots = (allSlots || []).filter((item) => item.gioKiem !== gioKiem);
      const mergedSlots = [...otherSlots, uploadReadySlot].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      await saveTrenChuyenData({
        phieuKiemId: id,
        slots: buildPayloadSlots(mergedSlots)
      });

      Alert.alert("Thành công", "Đã lưu khung giờ.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể lưu dữ liệu.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entryIndex) => {
    const entry = slot?.entries?.[entryIndex];
    if (!entry) return;

    if (!canDeleteEntry(entry)) {
      Alert.alert("Không có quyền", "Bạn chỉ có thể xóa công đoạn do chính mình ghi nhận.");
      return;
    }

    Alert.alert("Xóa công đoạn", `Xóa công đoạn ${entry.congDoan || `#${entryIndex + 1}`} khỏi khung giờ ${gioKiem}?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);
            if (entry.id) {
              await deleteTrenChuyenEntry(entry.id);
              const remainingPersisted = (slot.entries || []).filter((_, idx) => idx !== entryIndex);
              if (remainingPersisted.length === 0) {
                navigation.goBack();
                return;
              }
              await loadData();
              return;
            }

            removeEntry(entryIndex);
          } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", error?.response?.data?.message || "Không thể xóa công đoạn.");
          } finally {
            setSaving(false);
          }
        }
      }
    ]);
  };

  if (loading || !slot) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardFormScrollView
        contentContainerStyle={[styles.content, canEdit ? styles.contentWithBottomBar : null]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerEyebrow}>Ghi nhận lỗi theo giờ</Text>
              <Text style={styles.slotTitle}>Khung giờ {slot.gioKiem}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>
          </View>

          <View style={styles.headerMetaRow}>
            <View style={styles.headerMetaChip}>
              <Text style={styles.headerMetaValue}>{slotMetrics.entryCount}</Text>
              <Text style={styles.headerMetaLabel}>Công đoạn</Text>
            </View>
            <View style={styles.headerMetaChip}>
              <Text style={styles.headerMetaValue}>{slotMetrics.defectRows}</Text>
              <Text style={styles.headerMetaLabel}>Dòng lỗi</Text>
            </View>
            <View style={styles.headerMetaChip}>
              <Text style={styles.headerMetaValue}>{slotMetrics.defectQty}</Text>
              <Text style={styles.headerMetaLabel}>Tổng lỗi</Text>
            </View>
          </View>

          <Text style={styles.metaText}>{phieu?.SoPhieu || "---"}</Text>

        </View>

        {(slot.entries || []).length === 0 ? (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="albums-outline" size={22} color="#2563eb" />
            </View>
            <Text style={styles.emptyStateTitle}>Chưa có công đoạn nào</Text>
            <Text style={styles.emptyStateDescription}>
              Thêm công đoạn có phát sinh lỗi trong khung giờ này để bắt đầu ghi nhận.
            </Text>
          </View>
        ) : null}

        {(slot.entries || []).map((entry, entryIndex) => (
          <View key={entry.localId} style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <View>
                <Text style={styles.entryTitle}>Công đoạn {entryIndex + 1}</Text>
                <Text style={styles.entrySubtitle}>
                  {(entry.defects || []).length} lỗi được ghi nhận
                  {entry.tenNguoiGhiNhan ? ` • ${entry.tenNguoiGhiNhan}` : ""}
                </Text>
              </View>
              {canDeleteEntry(entry) ? (
                <TouchableOpacity style={styles.iconGhostButton} onPress={() => handleDeleteEntry(entryIndex)}>
                  <Ionicons name="close" size={18} color="#ef4444" />
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.fieldLabel}>Mã công đoạn</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: 1.2 / 2.3"
              value={entry.congDoan}
              onChangeText={(value) => updateEntry(entryIndex, { congDoan: value })}
              editable={canEdit}
            />

            <Text style={styles.fieldLabel}>Tên công nhân gây lỗi</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập tên công nhân"
              value={entry.tenCongNhanGayLoi}
              onChangeText={(value) => updateEntry(entryIndex, { tenCongNhanGayLoi: value })}
              editable={canEdit}
            />

            <View style={styles.defectHeader}>
              <Text style={styles.fieldLabel}>Lỗi ghi nhận</Text>
              {canEdit ? (
                <TouchableOpacity style={styles.addDefectButton} onPress={() => openDefectModal(entryIndex)}>
                  <Ionicons name="add-circle-outline" size={18} color="#2563eb" />
                  <Text style={styles.addDefectText}>Thêm lỗi</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {(entry.defects || []).length === 0 ? (
              <View style={styles.emptyInlineBox}>
                <Text style={styles.emptyInlineText}>Chưa có lỗi trong công đoạn này.</Text>
              </View>
            ) : (entry.defects || []).map((defect, defectIndex) => (
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
                      onChangeText={(value) => updateDefect(entryIndex, defectIndex, { soLuong: value })}
                      editable={canEdit}
                    />
                    <View style={styles.defectInlineButtons}>
                      {canEdit ? (
                        <TouchableOpacity style={styles.imageButton} onPress={() => handlePickImage(entryIndex, defectIndex)}>
                          <Ionicons name="image-outline" size={18} color="#2563eb" />
                        </TouchableOpacity>
                      ) : null}
                      {canEdit ? (
                        <TouchableOpacity style={styles.iconGhostButton} onPress={() => removeDefect(entryIndex, defectIndex)}>
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
                        onChangeText={(value) => updateDefect(entryIndex, defectIndex, { soLuongDatSauSua: value })}
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
                        onChangeText={(value) => updateDefect(entryIndex, defectIndex, { soLuongKhongDatSauSua: value })}
                        editable={canEdit}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.imageList}>
                  {(defect.savedImages || []).map((url, imageIndex) => (
                    <View key={`saved-${imageIndex}`} style={styles.imageThumbWrap}>
                      <TouchableOpacity onPress={() => handlePreviewImage(getAssetUrl(url))}>
                        <Image source={{ uri: getAssetUrl(url) }} style={styles.imageThumb} />
                      </TouchableOpacity>
                      {canEdit ? (
                        <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => removeSavedImage(entryIndex, defectIndex, imageIndex)}>
                          <Ionicons name="close-circle" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}

                  {(defect.localImages || []).map((asset, imageIndex) => {
                    const uri = getAssetUri(asset);
                    if (!uri) return null;
                    return (
                      <View key={`local-${imageIndex}`} style={styles.imageThumbWrap}>
                        <TouchableOpacity onPress={() => handlePreviewImage(uri)}>
                          <Image source={{ uri }} style={styles.imageThumb} />
                        </TouchableOpacity>
                        {canEdit ? (
                          <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => removeLocalImage(entryIndex, defectIndex, imageIndex)}>
                            <Ionicons name="close-circle" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })}
                </View>

              </View>
            ))}
          </View>
        ))}

      </KeyboardFormScrollView>

      {canEdit ? (
        <View style={styles.bottomActionBar}>
          <TouchableOpacity style={styles.secondaryButton} onPress={addEntry}>
            <Ionicons name="add-circle-outline" size={18} color="#2563eb" />
            <Text style={styles.secondaryButtonText}>Thêm công đoạn</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Lưu</Text>}
          </TouchableOpacity>
        </View>
      ) : null}

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
                  <TouchableOpacity key={defect.Id} style={styles.modalDefectItem} onPress={() => addDefectToEntry(defect)}>
                    <View style={styles.modalDefectTopRow}>
                      <View style={styles.modalDefectTitleRow}>
                        <View style={[styles.modalTypeBadge, { backgroundColor: typeColor }]}>
                          <Text style={styles.modalTypeBadgeText}>{defect.DefectType || "---"}</Text>
                        </View>
                        <Text style={styles.modalDefectCode}>{defect.MaLoi || "---"}</Text>
                      </View>
                      <TouchableOpacity style={styles.modalAddButton} onPress={() => addDefectToEntry(defect)}>
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

      <Modal visible={isPreviewVisible} transparent animationType="fade" onRequestClose={() => setIsPreviewVisible(false)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewCloseArea} activeOpacity={1} onPress={() => setIsPreviewVisible(false)}>
            <Image source={{ uri: previewUri }} style={styles.previewFullImage} resizeMode="contain" />
            <TouchableOpacity style={styles.previewCloseBtn} onPress={() => setIsPreviewVisible(false)}>
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
  statusBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, alignSelf: "flex-start" },
  statusBadgeText: { fontWeight: "700", fontSize: 12 },
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
  entryCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  entryTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  entrySubtitle: { marginTop: 4, color: "#64748b", fontSize: 13 },
  iconGhostButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff5f5"
  },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    backgroundColor: "#fff",
    marginBottom: 12
  },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  defectHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2, marginBottom: 8 },
  addDefectButton: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#eff6ff" },
  addDefectText: { color: "#2563eb", fontWeight: "700" },
  emptyInlineBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 12
  },
  emptyInlineText: { color: "#64748b", fontStyle: "italic" },
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
  imageButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff"
  },
  imageLinkButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  imageLinkText: { color: "#2563eb", fontWeight: "700", fontSize: 13 },
  imageList: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  imageThumbWrap: { marginRight: 12, marginBottom: 12, position: "relative" },
  imageThumb: { width: 76, height: 76, borderRadius: 12, borderWidth: 1, borderColor: "#cbd5e1" },
  imageRemoveBtn: { position: "absolute", top: -8, right: -8, backgroundColor: "#fff", borderRadius: 12 },
  bottomActionBar: {
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
  secondaryButton: {
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
  secondaryButtonText: { color: "#2563eb", fontWeight: "700", fontSize: 15 },
  primaryButton: {
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
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
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
  modalDefectMeta: { fontSize: 12, color: "#64748b", fontWeight: "600" },
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
