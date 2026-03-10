// src/screens/BienBanDetailScreen.jsx

import { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator
} from "react-native";

import {
    getBienBanDetail,
    completeBienBan,
    confirmAssign
} from "../api/bienBan.api";

import AssignUserModal from "../components/AssignUserModal";

export default function BienBanDetailScreen({ route, navigation }) {

    const { bienBanId } = route.params;

    const [info, setInfo] = useState(null);
    const [defects, setDefects] = useState([]);
    const [assigns, setAssigns] = useState([]);
    const [xuLy, setXuLy] = useState([]);
    const [chiPhi, setChiPhi] = useState([]);
    const [xacNhan, setXacNhan] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showAssignModal, setShowAssignModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {

        try {

            const res = await getBienBanDetail(bienBanId);

            setInfo(res.data.info);
            setDefects(res.data.defects);
            setAssigns(res.data.assigns);
            setXuLy(res.data.xuLy);
            setChiPhi(res.data.chiPhi);
            setXacNhan(res.data.xacNhan);

        } catch (err) {

            console.log("LoadBienBanDetail error:", err);

        } finally {

            setLoading(false);

        }

    };
    const handleConfirmAssign = async () => {

        try {

            await confirmAssign(bienBanId);

            loadData();

        } catch (err) {

            console.log("ConfirmAssign error:", err);

        }

    };
    const handleComplete = async () => {

        try {

            await completeBienBan(bienBanId);

            navigation.goBack();

        } catch (err) {

            console.log("CompleteBienBan error:", err);

        }

    };

    if (loading) {
        return (
            <ActivityIndicator style={{ marginTop: 40 }} />
        );
    }

    return (

        <ScrollView style={styles.container}>

            {/* ===============================
          THÔNG TIN BIÊN BẢN
      =============================== */}

            <View style={styles.card}>

                <Text style={styles.title}>
                    {info.SoPhieu}
                </Text>

                <Text style={styles.text}>
                    {info.TenSanPham}
                </Text>

                <Text style={styles.text}>
                    Lot: {info.Lot}
                </Text>

                <Text style={styles.text}>
                    Người lập: {info.NguoiLap}
                </Text>

                <Text style={styles.status}>
                    {info.TrangThai}
                </Text>

            </View>

            {/* ===============================
          DANH SÁCH LỖI
      =============================== */}

            <Text style={styles.section}>Danh sách lỗi</Text>

            <View style={styles.card}>

                {defects.map((d, i) => (

                    <View key={i} style={styles.defectRow}>

                        <Text style={styles.defectCode}>
                            {d.MaLoi}
                        </Text>

                        <Text style={styles.defectName}>
                            {d.TenLoi}
                        </Text>

                        <Text style={styles.defectQty}>
                            {d.SoLuong}
                        </Text>

                    </View>

                ))}

            </View>

            {/* ===============================
          NGƯỜI XỬ LÝ
      =============================== */}

            <Text style={styles.section}>Người xử lý</Text>

            <View style={styles.card}>

                {assigns.map((a, i) => {

                    const done = xuLy.find(
                        x => x.CreatedBy === a.NguoiXuLyId
                    );

                    return (

                        <View key={i} style={styles.assignRow}>

                            <View>

                                <Text style={styles.assignName}>
                                    {a.FullName}
                                </Text>

                                <Text style={styles.assignRole}>
                                    {a.RoleName}
                                </Text>

                            </View>

                            <Text
                                style={[
                                    styles.assignStatus,
                                    done ? styles.done : styles.pending
                                ]}
                            >
                                {done ? "✓" : "Chờ"}
                            </Text>

                        </View>

                    );

                })}

            </View>

            {!info.AssignConfirmed && (
                <>
                    <TouchableOpacity
                        style={styles.assignBtn}
                        onPress={() => setShowAssignModal(true)}
                    >
                        <Text style={{ color: "#fff" }}>
                            Chọn người xử lý
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={handleConfirmAssign}
                    >
                        <Text style={{ color: "#fff" }}>
                            Xác nhận phân công
                        </Text>
                    </TouchableOpacity>
                </>
            )}

            {/* ===============================
          ĐỀ XUẤT XỬ LÝ
      =============================== */}

            <Text style={styles.section}>Đề xuất xử lý</Text>

            {xuLy.map((x, i) => (

                <View key={i} style={styles.card}>

                    <Text style={styles.label}>Nội dung</Text>
                    <Text>{x.NoiDung}</Text>

                    <Text style={styles.label}>Đề nghị</Text>
                    <Text>{x.DeNghiXuLy}</Text>

                    <Text style={styles.label}>Trách nhiệm</Text>
                    <Text>{x.TrachNhiem}</Text>

                    <Text style={styles.label}>Thời hạn</Text>
                    <Text>{x.ThoiHan}</Text>

                </View>

            ))}

            {/* ===============================
          CHI PHÍ
      =============================== */}

            <Text style={styles.section}>Chi phí phát sinh</Text>

            {chiPhi.map((c, i) => (

                <View key={i} style={styles.card}>

                    <Text>{c.LoaiChiPhi}</Text>

                    <Text style={styles.cost}>
                        {c.GiaTri}
                    </Text>

                </View>

            ))}

            {/* ===============================
          XÁC NHẬN
      =============================== */}

            <Text style={styles.section}>Xác nhận</Text>

            {xacNhan.map((x, i) => (

                <View key={i} style={styles.card}>

                    <Text style={styles.text}>
                        {x.FullName}
                    </Text>

                    <Text style={styles.text}>
                        {x.VaiTro}
                    </Text>

                    <Text style={styles.time}>
                        {x.ThoiGian}
                    </Text>

                </View>

            ))}

            {/* ===============================
          COMPLETE
      =============================== */}

            <TouchableOpacity
                style={styles.completeBtn}
                onPress={handleComplete}
            >
                <Text style={{ color: "#fff" }}>
                    Hoàn thành biên bản
                </Text>
            </TouchableOpacity>

            <AssignUserModal
                visible={showAssignModal}
                bienBanId={bienBanId}
                assignedUsers={assigns}
                onClose={() => setShowAssignModal(false)}
                reload={loadData}
            />

        </ScrollView>

    );
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#f5f6fa"
    },

    card: {
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 12,
        marginTop: 8
    },

    title: {
        fontSize: 18,
        fontWeight: "bold"
    },

    section: {
        marginTop: 24,
        fontWeight: "bold",
        fontSize: 16
    },

    text: {
        marginTop: 4
    },

    status: {
        marginTop: 6,
        fontWeight: "bold",
        color: "#2980b9"
    },

    defectRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6
    },

    defectCode: {
        width: 80,
        fontWeight: "bold"
    },

    defectName: {
        flex: 1
    },

    defectQty: {
        width: 40,
        textAlign: "right"
    },

    assignRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8
    },

    assignName: {
        fontWeight: "600"
    },

    assignRole: {
        color: "#666"
    },

    assignStatus: {
        fontWeight: "bold"
    },

    done: {
        color: "#27ae60"
    },

    pending: {
        color: "#e67e22"
    },

    assignBtn: {
        backgroundColor: "#3498db",
        padding: 12,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10
    },
    confirmBtn: {
        backgroundColor: "#e67e22",
        padding: 12,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10
    },
    label: {
        marginTop: 10,
        fontWeight: "600"
    },

    cost: {
        fontWeight: "bold",
        marginTop: 4
    },

    time: {
        color: "#888",
        marginTop: 4
    },

    completeBtn: {
        backgroundColor: "#27ae60",
        padding: 14,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 30,
        marginBottom: 30
    }

});