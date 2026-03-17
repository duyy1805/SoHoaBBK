import { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert
} from "react-native";

import {
    getBienBanDetail,
    updateMoTaChung,
    completeBienBan,
    confirmAssign,
    confirmUser
} from "../api/bienBan.api";

import AsyncStorage from "@react-native-async-storage/async-storage";
import AssignUserModal from "../components/AssignUserModal";
import XuLyModal from "../components/XuLyModal";
import ChiPhiModal from "../components/ChiPhiModal";
import HanhDongModal from "../components/HanhDongModal";
export default function BienBanDetailScreen({ route, navigation }) {

    const { bienBanId } = route.params;

    const [info, setInfo] = useState(null);
    const [moTaChung, setMoTaChung] = useState("");
    const [moTaConfirmed, setMoTaConfirmed] = useState(false);
    const [defects, setDefects] = useState([]);
    const [assigns, setAssigns] = useState([]);
    const [xuLy, setXuLy] = useState([]);
    const [chiPhi, setChiPhi] = useState([]);
    const [xacNhan, setXacNhan] = useState([]);
    const [hanhDong, setHanhDong] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showXuLyModal, setShowXuLyModal] = useState(false);
    const [showChiPhiModal, setShowChiPhiModal] = useState(false);
    const [showHanhDongModal, setShowHanhDongModal] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserBoPhanId, setCurrentUserBoPhanId] = useState(null);
    /* LOAD DATA */

    useEffect(() => {
        loadUser();
        loadData();
    }, []);

    const loadUser = async () => {
        const userStr = await AsyncStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id);
        setCurrentUserBoPhanId(user.boPhanId);
    };
    const loadData = async () => {

        try {

            setLoading(true);

            const res = await getBienBanDetail(bienBanId);

            setInfo(res.data.info);
            setDefects(res.data.defects || []);
            setAssigns(res.data.assigns || []);
            setXuLy(res.data.xuLy || []);
            setChiPhi(res.data.chiPhi || []);
            setXacNhan(res.data.xacNhan || []);
            setHanhDong(res.data.hanhDong || []);
            const moTa = res.data.info?.MoTaChung || "";

            setMoTaChung(moTa);
            setMoTaConfirmed(!!moTa);
        } catch (err) {

            Alert.alert(
                "Lỗi",
                err?.response?.data?.message || "Không tải được biên bản"
            );

        } finally {

            setLoading(false);

        }

    };
    const getDefectColor = (type) => {

        if (!type) return "#95a5a6";

        const t = type.toLowerCase();

        if (t.includes("critical")) return "#e74c3c";
        if (t.includes("major")) return "#e67e22";
        if (t.includes("minor")) return "#f1c40f";

        return "#3498db";

    };
    /* CONFIRM ASSIGN */

    const handleConfirmAssign = async () => {

        try {

            await confirmAssign(bienBanId);

            Alert.alert("Thành công", "Đã xác nhận phân công");

            loadData();

        } catch (err) {

            Alert.alert(
                "Lỗi",
                err.status = 403 ? "Không được cấp quyền" : err?.response?.data?.message || "Không thể xác nhận phân công"
            );

        }

    };

    const handleConfirmMoTa = async () => {

        if (!moTaChung.trim()) {
            Alert.alert("Thiếu thông tin", "Vui lòng nhập mô tả");
            return;
        }

        try {

            await updateMoTaChung({
                bienBanId,
                moTaChung
            });

            setMoTaConfirmed(true);

            Alert.alert("Thành công", "Đã xác nhận mô tả");

            loadData();

        } catch (err) {

            Alert.alert(
                "Lỗi",
                err?.response?.data?.message || "Không thể lưu mô tả"
            );

        }

    };
    /* COMPLETE */

    const handleComplete = async () => {

        try {

            await completeBienBan(bienBanId);

            Alert.alert("Thành công", "Biên bản đã hoàn thành");

            navigation.goBack();

        } catch (err) {

            Alert.alert(
                "Lỗi",
                err?.response?.data?.message || "Không thể hoàn thành biên bản"
            );

        }

    };

    /* STATUS */

    const getStatusText = (boPhanId) => {
        const done = xuLy.find(x => x.BoPhanId === boPhanId);
        return done ? "✓" : "Chờ";
    };

    const isAssigned = assigns.some(a => a.BoPhanId === currentUserBoPhanId);
    const hasXuLy = xuLy.some(x => x.BoPhanId === currentUserBoPhanId);
    const isConfirmed = xacNhan.some(
        x => x.BoPhanId === currentUserBoPhanId
    );
    const allConfirmed =
        assigns.length > 0 &&
        assigns.every(a =>
            xacNhan.some(x => x.BoPhanId === a.BoPhanId)
        );
    const handleConfirmUser = async () => {

        try {

            await confirmUser(bienBanId);

            Alert.alert("Thành công", "Đã xác nhận thông tin");

            loadData();

        } catch (err) {

            Alert.alert(
                "Lỗi",
                err?.response?.data?.message || "Không thể xác nhận"
            );

        }

    };

    /* LOADING */
    if (loading) {
        return (
            <ActivityIndicator size="large" style={{ marginTop: 40 }} />
        );
    }

    /* UI */

    return (

        <ScrollView style={styles.container}>

            {/* HEADER */}

            <View style={styles.headerCard}>

                <Text style={styles.soPhieu}>{info.SoPhieu}</Text>

                <Text style={styles.product}>{info.TenSanPham}</Text>

                <View style={styles.rowBetween}>
                    <Text style={styles.meta}>Lot: {info.Lot}</Text>
                    <Text style={styles.meta}>Người lập: {info.NguoiLap}</Text>
                </View>

                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{info.TrangThai}</Text>
                </View>

            </View>

            {/* MÔ TẢ CHUNG */}

            <Text style={styles.section}>Mô tả chung</Text>

            <View style={styles.moTaBox}>

                <TextInput
                    style={styles.moTaInput}
                    multiline
                    placeholder="Nhập mô tả chung về lỗi..."
                    value={moTaChung}
                    onChangeText={setMoTaChung}
                    editable={!moTaConfirmed}
                />

                {!moTaConfirmed && (

                    <TouchableOpacity
                        style={styles.moTaButton}
                        onPress={handleConfirmMoTa}
                    >
                        <Text style={styles.btnText}>
                            Xác nhận mô tả
                        </Text>
                    </TouchableOpacity>

                )}

            </View>
            {/* DEFECTS */}

            <Text style={styles.section}>Danh sách lỗi</Text>

            <View style={styles.table}>

                <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 1 }]}>Tên lỗi</Text>
                    <Text style={[styles.th, { width: 90, textAlign: "center" }]}>Mức độ</Text>
                    <Text style={[styles.th, { width: 40, textAlign: "right" }]}>SL</Text>
                </View>

                {defects.map((d, i) => {

                    const color = getDefectColor(d.DefectType);

                    return (

                        <View key={i} style={styles.tableRow}>

                            <Text style={[styles.td, { flex: 1 }]}>
                                {d.TenLoi}
                            </Text>

                            <View style={[styles.badge, { backgroundColor: color }]}>
                                <Text style={styles.badgeText}>
                                    {d.DefectType}
                                </Text>
                            </View>

                            <Text style={[styles.td, { width: 40, textAlign: "right" }]}>
                                {d.SoLuong}
                            </Text>

                        </View>

                    )

                })}

            </View>

            {/* ASSIGN */}

            <Text style={styles.section}>Bộ phận xử lý</Text>

            <View style={styles.card}>

                {assigns.map((a, i) => (
                    <View key={i} style={styles.assignRow}>

                        <View>
                            <Text style={styles.assignName}>{a.MaBoPhan}</Text>
                            <Text style={styles.assignRole}>{a.TenBoPhan}</Text>
                        </View>

                        <Text style={[
                            styles.assignStatus,
                            getStatusText(a.BoPhanId) === "✓"
                                ? styles.done
                                : styles.pending
                        ]}>
                            {getStatusText(a.BoPhanId)}
                        </Text>

                    </View>
                ))}

            </View>

            {/* BUTTONS */}

            {!info.AssignConfirmed && moTaConfirmed && (

                <>

                    <TouchableOpacity
                        style={styles.assignBtn}
                        onPress={() => setShowAssignModal(true)}
                    >
                        <Text style={styles.btnText}>
                            Chọn người xử lý
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={handleConfirmAssign}
                    >
                        <Text style={styles.btnText}>
                            Xác nhận phân công
                        </Text>
                    </TouchableOpacity>

                </>

            )}

            {/* XU LY */}

            <Text style={styles.section}>Đề xuất xử lý</Text>

            <View style={styles.table}>

                {xuLy.map((x, i) => (
                    <View key={i} style={styles.xuLyRow}>

                        <Text style={styles.noiDung}>{x.NoiDung}</Text>

                        <Text style={styles.deNghi}>
                            Đề nghị: {x.DeNghiXuLy}
                        </Text>

                        <View style={styles.rowBetween}>
                            <Text style={styles.boPhan}>
                                {x.NguoiXuLy} - {x.MaBoPhan} - {x.TenBoPhan}
                            </Text>

                            <Text style={styles.deadline}>
                                {new Date(x.ThoiHan).toLocaleDateString("vi-VN")}
                            </Text>
                        </View>

                    </View>
                ))}

            </View>
            {info.AssignConfirmed && isAssigned && !isConfirmed && (

                <TouchableOpacity
                    style={styles.commentBtn}
                    onPress={() => setShowXuLyModal(true)}
                >
                    <Text style={styles.btnText}>
                        Nhập ý kiến xử lý
                    </Text>
                </TouchableOpacity>

            )}
            {/* CHI PHI */}

            <Text style={styles.section}>Chi phí phát sinh</Text>

            {chiPhi.map((c, i) => (
                // Ưu tiên dùng c.id nếu có, nếu không thì dùng index i
                <View key={c.id || i} style={styles.expenseCard}>
                    {/* Phần trên: Loại chi phí & Số tiền */}
                    <View style={styles.expenseHeader}>
                        <View style={styles.expenseTypeWrapper}>
                            <Text style={styles.expenseLabel}>Loại chi phí</Text>
                            <Text style={styles.expenseType}>{c.LoaiChiPhi}</Text>
                        </View>
                        <Text style={styles.expenseCost}>
                            {c.GiaTri?.toLocaleString("vi-VN")} <Text style={styles.currency}>₫</Text>
                        </Text>
                    </View>

                    {/* Đường kẻ ngang phân cách */}
                    <View style={styles.divider} />

                    {/* Phần dưới: Người theo dõi & Bộ phận */}
                    <View style={styles.expenseFooter}>
                        <View style={styles.assigneeWrapper}>
                            <Text style={styles.footerLabel}>Theo dõi</Text>
                            <Text style={styles.assignName}>{c.NguoiXuLy}</Text>
                        </View>
                        <View style={styles.departmentBadge}>
                            <Text style={styles.departmentText}>{c.TenBoPhan}</Text>
                        </View>
                    </View>
                </View>
            ))}

            {info.AssignConfirmed && isAssigned && !isConfirmed && hasXuLy && (

                <TouchableOpacity
                    style={styles.costBtn}
                    onPress={() => setShowChiPhiModal(true)}
                >
                    <Text style={styles.btnText}>
                        Thêm chi phí
                    </Text>
                </TouchableOpacity>

            )}
            <Text style={styles.section}>
                Hành động khắc phục
            </Text>
            <ScrollView style={styles.table}>
                {hanhDong.map((h, i) => (

                    <View key={i} style={styles.xuLyRow}>

                        <Text style={styles.noiDung}>{h.NoiDung}</Text>

                        <View style={styles.rowBetween}>
                            <Text style={styles.boPhan}>
                                {h.MaBoPhan} - {h.TenBoPhan}
                            </Text>

                            <Text style={styles.deadline}>
                                {new Date(h.ThoiHan).toLocaleDateString("vi-VN")}
                            </Text>
                        </View>

                    </View>

                ))}
            </ScrollView>
            {info.AssignConfirmed && isAssigned && !isConfirmed && hasXuLy && (

                <TouchableOpacity
                    style={styles.costBtn}
                    onPress={() => setShowHanhDongModal(true)}
                >
                    <Text style={styles.btnText}>
                        Thêm hành động
                    </Text>
                </TouchableOpacity>

            )}
            {/* XAC NHAN */}

            <Text style={styles.section}>Xác nhận</Text>

            {xacNhan.map((x, i) => (
                <View key={i} style={styles.cardRow}>
                    <Text>{x.FullName}</Text>
                    <Text style={styles.meta}>{x.ThoiGian}</Text>
                </View>
            ))}

            {/* COMPLETE */}
            {info.AssignConfirmed && isAssigned && !isConfirmed && hasXuLy && (

                <TouchableOpacity
                    style={styles.confirmUserBtn}
                    onPress={handleConfirmUser}
                >
                    <Text style={styles.btnText}>
                        Xác nhận thông tin
                    </Text>
                </TouchableOpacity>

            )}
            {allConfirmed && (

                <TouchableOpacity
                    style={styles.completeBtn}
                    onPress={handleComplete}
                >
                    <Text style={styles.btnText}>
                        Hoàn thành biên bản
                    </Text>
                </TouchableOpacity>

            )}

            {/* MODALS */}

            <AssignUserModal
                visible={showAssignModal}
                bienBanId={bienBanId}
                assignedUsers={assigns}
                onClose={() => setShowAssignModal(false)}
                reload={loadData}
            />

            <XuLyModal
                visible={showXuLyModal}
                bienBanId={bienBanId}
                currentUserId={currentUserId}
                reload={loadData}
                onClose={() => setShowXuLyModal(false)}
            />
            <ChiPhiModal
                visible={showChiPhiModal}
                bienBanId={bienBanId}
                reload={loadData}
                onClose={() => setShowChiPhiModal(false)}
            />
            <HanhDongModal
                visible={showHanhDongModal}
                bienBanId={bienBanId}
                reload={loadData}
                onClose={() => setShowHanhDongModal(false)}
            />
        </ScrollView>

    );

}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#f4f6fa",
        padding: 16
    },

    headerCard: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 16,
        marginBottom: 10
    },

    soPhieu: {
        fontSize: 18,
        fontWeight: "700"
    },

    product: {
        marginTop: 4,
        fontSize: 15
    },

    meta: {
        color: "#666",
        fontSize: 13
    },

    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 6
    },

    statusBadge: {
        marginTop: 8,
        alignSelf: "flex-start",
        backgroundColor: "#eaf3ff",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8
    },

    statusText: {
        color: "#2980b9",
        fontWeight: "600"
    },
    moTaBox: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginTop: 8
    },
    moTaInput: {
        backgroundColor: "#f4f6fa",
        borderRadius: 10,
        padding: 12,
        minHeight: 80,
        textAlignVertical: "top"
    },

    moTaButton: {
        backgroundColor: "#2980b9",
        marginTop: 10,
        padding: 12,
        borderRadius: 10,
        alignItems: "center"
    },
    section: {
        marginTop: 20,
        fontWeight: "700",
        fontSize: 16
    },

    table: {
        backgroundColor: "#fff",
        borderRadius: 12,
        marginTop: 8,
        overflow: "hidden"
    },

    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#eef1f5",
        paddingVertical: 10,
        paddingHorizontal: 10
    },

    tableRow: {
        flexDirection: "row",
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderTopWidth: 1,
        borderColor: "#eee"
    },
    badge: {
        width: 90,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 3,
        borderRadius: 6
    },

    badgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600"
    },
    th: {
        fontWeight: "700",
        fontSize: 13
    },

    td: {
        fontSize: 14
    },

    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        marginTop: 8,
        padding: 12
    },

    assignRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: "#eee"
    },

    assignRole: {
        color: "#666",
        fontSize: 13
    },

    assignStatus: {
        fontWeight: "700"
    },

    done: {
        color: "#27ae60"
    },

    pending: {
        color: "#e67e22"
    },

    xuLyRow: {
        padding: 12,
        borderBottomWidth: 1,
        borderColor: "#eee"
    },

    noiDung: {
        fontWeight: "600"
    },

    deNghi: {
        marginTop: 3,
        color: "#555"
    },

    boPhan: {
        fontSize: 13,
        color: "#666"
    },

    deadline: {
        fontSize: 13,
        color: "#e67e22",
        fontWeight: "600"
    },

    cardRow: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
        flexDirection: "row",
        justifyContent: "space-between"
    },
    department: {
        fontWeight: "600",
        color: "#16a085"
    },
    cost: {
        fontWeight: "700"
    },
    costBtn: {
        backgroundColor: "#16a085",
        padding: 12,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10
    },
    // Thêm các style mới này vào StyleSheet của bạn
    expenseCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        marginTop: 12,
        padding: 16,
        // Thêm shadow để card nổi lên trông xịn hơn
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },

    expenseHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    expenseTypeWrapper: {
        flex: 1,
        paddingRight: 10,
    },

    expenseLabel: {
        fontSize: 12,
        color: "#888",
        marginBottom: 2,
    },

    expenseType: {
        fontSize: 15,
        fontWeight: "600",
        color: "#2c3e50",
    },

    expenseCost: {
        fontSize: 16,
        fontWeight: "700",
        color: "#e74c3c", // Màu đỏ cam nhấn mạnh chi phí (hoặc đổi thành #27ae60 nếu là thu nhập)
    },

    currency: {
        fontSize: 13,
        fontWeight: "600",
        color: "#e74c3c",
    },

    divider: {
        height: 1,
        backgroundColor: "#f0f0f0",
        marginVertical: 12,
    },

    expenseFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    assigneeWrapper: {
        flexDirection: "column",
    },

    footerLabel: {
        fontSize: 11,
        color: "#888",
        marginBottom: 2,
    },

    assignName: {
        fontSize: 14,
        fontWeight: "500",
        color: "#34495e",
    },

    departmentBadge: {
        backgroundColor: "#eaf3ff",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },

    departmentText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#2980b9",
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

    commentBtn: {
        backgroundColor: "#8e44ad",
        padding: 12,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10
    },
    confirmUserBtn: {
        backgroundColor: "#f39c12",
        padding: 12,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10
    },
    completeBtn: {
        backgroundColor: "#27ae60",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 30,
        marginBottom: 30
    },

    btnText: {
        color: "#fff",
        fontWeight: "600"
    }

});