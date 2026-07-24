import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Modal, RefreshControl, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { getBoPhan } from "../api/bienBan.api";
import { createCongDoanPhieu, getCongDoanPhieuList } from "../api/phieuKiem.api";

const localDate = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};
const displayDate = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("vi-VN") : "---";
const stateLabel = {
  TAO_MOI: "Mới", CHUA_KIEM: "Chưa kiểm", DANG_KIEM: "Đang kiểm",
  CHO_TBP_DUYET: "Chờ TBP duyệt", HOAN_TAT: "Hoàn tất"
};

export default function CongDoanListScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({
    ngayKiem: localDate(), toMay: "", phanXuongId: ""
  });

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await getCongDoanPhieuList();
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không tải được danh sách phiếu công đoạn.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    getBoPhan().then((response) => setDepartments(
      (response.data || []).filter((item) =>
        String(item.TenBoPhan || item.Ten_BoPhan || "").toLocaleLowerCase("vi").includes("phân xưởng")
      )
    )).catch(() => setDepartments([]));
  }, []);

  const create = async () => {
    if (!form.ngayKiem || !Number(form.phanXuongId)) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập ngày kiểm và chọn phân xưởng sản xuất.");
      return;
    }
    try {
      setCreating(true);
      const response = await createCongDoanPhieu(form);
      setModalVisible(false);
      navigation.navigate("CongDoanDetail", { id: response.data.Id });
    } catch (error) {
      Alert.alert("Không thể tạo phiếu", error.response?.data?.message || "Vui lòng thử lại.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View>
          <Text style={styles.heading}>Phiếu công đoạn</Text>
          <Text style={styles.subheading}>{items.length} phiếu dùng chung</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.primaryText}>Tạo phiếu</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.Id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
        ListEmptyComponent={<Text style={styles.empty}>Chưa có phiếu công đoạn.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("CongDoanDetail", { id: item.Id })}>
            <View style={styles.cardTop}>
              <Text style={styles.code}>{item.SoPhieu}</Text>
              <Text style={styles.status}>{stateLabel[item.TrangThai] || item.TrangThai}</Text>
            </View>
            <Text style={styles.product}>{item.PhanXuong || "Chưa nhập phân xưởng"}{item.ToMay ? ` · ${item.ToMay}` : ""}</Text>
            <Text style={styles.meta}>{displayDate(item.NgayKiem)} · {item.SoKeHoach || 0} kế hoạch · {item.TongSoLuongLoi || 0} lỗi</Text>
            <Text style={styles.meta}>Người tạo: {item.TenNguoiTao || "---"}</Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo phiếu công đoạn</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#334155" /></TouchableOpacity>
            </View>
            <Text style={styles.label}>Ngày kiểm (yyyy-mm-dd)</Text>
            <TextInput style={styles.input} value={form.ngayKiem} onChangeText={(value) => setForm({ ...form, ngayKiem: value })} />
            <Text style={styles.label}>Phân xưởng sản xuất</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={form.phanXuongId} onValueChange={(value) => setForm({ ...form, phanXuongId: value })}>
                <Picker.Item label="Chọn phân xưởng" value="" />
                {departments.map((item) => (
                  <Picker.Item key={item.Id || item.ID_BoPhan} label={item.TenBoPhan || item.Ten_BoPhan || item.TenBoPhanDayDu || `Bộ phận ${item.Id}`} value={item.Id || item.ID_BoPhan} />
                ))}
              </Picker>
            </View>
            <Text style={styles.label}>Tổ / máy</Text>
            <TextInput style={styles.input} value={form.toMay} onChangeText={(value) => setForm({ ...form, toMay: value })} placeholder="Ví dụ: Tổ 1" />
            <TouchableOpacity style={[styles.createButton, creating && styles.disabled]} disabled={creating} onPress={create}>
              {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createText}>Tạo phiếu</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  toolbar: { padding: 16, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  heading: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  subheading: { marginTop: 3, color: "#64748b" },
  primaryButton: { height: 42, paddingHorizontal: 14, backgroundColor: "#2563eb", borderRadius: 7, flexDirection: "row", alignItems: "center", gap: 6 },
  primaryText: { color: "#fff", fontWeight: "700" },
  list: { padding: 14, paddingBottom: 30 },
  card: { padding: 15, backgroundColor: "#fff", borderRadius: 7, marginBottom: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  code: { fontWeight: "800", fontSize: 16, color: "#1d4ed8" },
  status: { fontSize: 12, color: "#1d4ed8", backgroundColor: "#dbeafe", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, overflow: "hidden" },
  product: { marginTop: 10, fontWeight: "600", color: "#1e293b" },
  meta: { marginTop: 6, color: "#64748b", fontSize: 13 },
  empty: { paddingTop: 80, textAlign: "center", color: "#64748b" },
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#fff", padding: 20, paddingBottom: 32, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { fontSize: 19, fontWeight: "800", color: "#0f172a" },
  label: { marginTop: 10, marginBottom: 5, fontWeight: "600", color: "#334155" },
  input: { height: 44, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 6, paddingHorizontal: 12, color: "#0f172a" },
  pickerWrap: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 6, overflow: "hidden" },
  createButton: { height: 46, marginTop: 20, backgroundColor: "#2563eb", borderRadius: 6, alignItems: "center", justifyContent: "center" },
  createText: { color: "#fff", fontWeight: "800" },
  disabled: { opacity: 0.55 }
});
