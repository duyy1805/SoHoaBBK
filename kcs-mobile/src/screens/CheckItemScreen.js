import { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Modal,
    ScrollView
} from "react-native";
import {
    saveCheckItem,
    getDefectList
} from "../api/phieuKiem.api";

export default function CheckItemScreen({ route, navigation }) {
    const { item } = route.params;

    const [ketQua, setKetQua] = useState(item.KetQua || null);
    const [soLuongLoi, setSoLuongLoi] = useState(
        item.SoLuongLoi ? item.SoLuongLoi.toString() : ""
    );

    const [defects, setDefects] = useState([]);
    const [defectId, setDefectId] = useState(
        item.DefectId ? item.DefectId.toString() : ""
    );
    const [selectedDefect, setSelectedDefect] = useState(
        item.DefectId
            ? {
                Id: item.DefectId,
                MaLoi: item.MaLoi,
                TenLoi: item.TenLoi,
                DefectType: item.DefectType
            }
            : null
    );
    const [searchText, setSearchText] = useState("");
    const [filteredDefects, setFilteredDefects] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadDefects();
    }, []);

    useEffect(() => {
        if (!searchText) {
            setFilteredDefects(defects);
            return;
        }

        const keyword = searchText.toLowerCase();

        const filtered = defects.filter((d) =>
            d.MaLoi.toLowerCase().includes(keyword) ||
            d.TenLoi.toLowerCase().includes(keyword) ||
            d.DefectType.toLowerCase().includes(keyword)
        );

        setFilteredDefects(filtered);
    }, [searchText, defects]);

    const loadDefects = async () => {
        try {
            const res = await getDefectList(item.DefectType || null);
            const data = res.data || [];
            setDefects(data);
            setFilteredDefects(data);
        } catch (err) {
            console.log("Load defect error:", err);
        }
    };

    const handleSave = async () => {
        if (!ketQua) {
            Alert.alert("Thiếu thông tin", "Vui lòng chọn kết quả");
            return;
        }

        if (ketQua === "KHONG_DAT") {
            if (!defectId) {
                Alert.alert("Thiếu thông tin", "Vui lòng chọn lỗi");
                return;
            }

            if (!soLuongLoi || Number(soLuongLoi) <= 0) {
                Alert.alert("Thiếu thông tin", "Nhập số lượng lỗi hợp lệ");
                return;
            }
        }

        try {
            setLoading(true);

            await saveCheckItem({
                checkItemId: Number(item.Id),
                ketQua,
                soLuongLoi:
                    ketQua === "KHONG_DAT"
                        ? Number(soLuongLoi)
                        : 0,
                defectId:
                    ketQua === "KHONG_DAT"
                        ? Number(defectId)
                        : null
            });

            Alert.alert("Thành công", "Đã lưu kết quả");
            navigation.goBack();
        } catch (err) {
            Alert.alert("Lỗi", "Không thể lưu dữ liệu");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{item.TenMucKiem}</Text>

            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Tham chiếu</Text>
                    <Text style={styles.value}>
                        {item.ThamChieu || "--"}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Phương pháp</Text>
                    <Text style={styles.value}>
                        {item.PhuongPhapKiem || "--"}
                    </Text>
                </View>
            </View>

            <View style={styles.standardCard}>
                <Text style={styles.standardTitle}>
                    Tiêu chuẩn kỹ thuật
                </Text>

                <Text style={styles.standard}>
                    {item.TieuChuan}
                </Text>
            </View>

            {/* Chọn kết quả */}
            <View style={styles.row}>
                <TouchableOpacity
                    style={[
                        styles.option,
                        ketQua === "DAT" && styles.success
                    ]}
                    onPress={() => {
                        setKetQua("DAT");
                        setDefectId(null);
                        setSelectedDefect(null);
                        setSoLuongLoi("");
                    }}
                >
                    <Text style={styles.optionText}>Đạt</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.option,
                        ketQua === "KHONG_DAT" && styles.error
                    ]}
                    onPress={() => setKetQua("KHONG_DAT")}
                >
                    <Text style={styles.optionText}>Không đạt</Text>
                </TouchableOpacity>
            </View>

            {/* Nếu không đạt */}
            {ketQua === "KHONG_DAT" && (
                <>
                    <TouchableOpacity
                        style={styles.selectBox}
                        onPress={() => setShowModal(true)}
                    >
                        <Text style={styles.selectText}>
                            {selectedDefect
                                ? `${selectedDefect.MaLoi} - ${selectedDefect.TenLoi}`
                                : "-- Chọn lỗi --"}
                        </Text>
                    </TouchableOpacity>

                    <TextInput
                        placeholder="Số lượng lỗi"
                        keyboardType="numeric"
                        value={soLuongLoi}
                        onChangeText={setSoLuongLoi}
                        style={styles.input}
                    />
                </>
            )}

            <TouchableOpacity
                style={[styles.saveBtn, loading && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.saveText}>Lưu kết quả</Text>
                )}
            </TouchableOpacity>

            {/* Modal chọn lỗi */}
            <Modal visible={showModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Chọn lỗi</Text>

                        <TextInput
                            placeholder="Tìm kiếm mã lỗi / tên lỗi..."
                            value={searchText}
                            onChangeText={setSearchText}
                            style={styles.searchInput}
                        />

                        <ScrollView keyboardShouldPersistTaps="handled">
                            {filteredDefects.map((d) => (
                                <TouchableOpacity
                                    key={d.Id}
                                    style={[
                                        styles.defectItem,
                                        selectedDefect?.Id === d.Id && styles.defectActive
                                    ]}
                                    onPress={() => {
                                        setSelectedDefect(d);
                                        setDefectId(d.Id);
                                        setShowModal(false);
                                        setSearchText("");
                                    }}
                                >
                                    <Text style={styles.defectCode}>
                                        {d.MaLoi}
                                    </Text>

                                    <Text style={styles.defectName}>
                                        {d.TenLoi}
                                    </Text>

                                    <Text style={styles.defectType}>
                                        {d.DefectType}
                                    </Text>
                                </TouchableOpacity>
                            ))}

                            {filteredDefects.length === 0 && (
                                <Text style={styles.noResult}>
                                    Không tìm thấy lỗi
                                </Text>
                            )}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => setShowModal(false)}
                        >
                            <Text style={{ color: "#fff" }}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#f1f5f9"
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#0f172a"
    },
    standard: {
        marginTop: 6,
        marginBottom: 20,
        color: "#475569"
    },
    row: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 20
    },
    option: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: "#e2e8f0",
        alignItems: "center"
    },
    optionText: {
        fontWeight: "600",
        color: "#0f172a"
    },
    success: {
        backgroundColor: "#22c55e"
    },
    error: {
        backgroundColor: "#ef4444"
    },
    selectBox: {
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 12,
        marginBottom: 12
    },
    selectText: {
        color: "#0f172a"
    },
    input: {
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 12,
        marginBottom: 20
    },
    saveBtn: {
        backgroundColor: "#2563eb",
        padding: 16,
        borderRadius: 16,
        alignItems: "center"
    },
    saveText: {
        color: "#fff",
        fontWeight: "600"
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end"
    },
    modalContent: {
        backgroundColor: "#fff",
        padding: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "60%"
    },
    modalTitle: {
        fontWeight: "bold",
        fontSize: 16,
        marginBottom: 15
    },
    defectItem: {
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: "#f1f5f9"
    },
    defectActive: {
        backgroundColor: "#dbeafe"
    },
    defectText: {
        fontSize: 14
    },

    searchInput: {
        backgroundColor: "#f1f5f9",
        padding: 12,
        borderRadius: 12,
        marginBottom: 12
    },
    defectCode: {
        fontWeight: "bold",
        color: "#1e293b"
    },
    defectName: {
        marginTop: 4,
        color: "#334155"
    },
    defectType: {
        marginTop: 2,
        fontSize: 12,
        color: "#64748b"
    },
    noResult: {
        textAlign: "center",
        marginTop: 20,
        color: "#94a3b8"
    },
    closeBtn: {
        backgroundColor: "#2563eb",
        padding: 14,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 10
    },
    infoCard: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        marginTop: 10,
        marginBottom: 10
    },

    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6
    },

    label: {
        color: "#64748b",
        fontSize: 13
    },
    value: {
        fontWeight: "600",
        color: "#0f172a"
    },
    standardCard: {
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 14,
        marginBottom: 20
    },
    standardTitle: {
        fontWeight: "600",
        marginBottom: 6,
        color: "#0f172a"
    },
});