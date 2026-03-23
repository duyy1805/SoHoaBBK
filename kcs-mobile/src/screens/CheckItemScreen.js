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

    const [defects, setDefects] = useState([]);
    const [selectedDefects, setSelectedDefects] = useState([]);

    const [searchText, setSearchText] = useState("");
    const [filteredDefects, setFilteredDefects] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {

        loadDefects();

        /* load defect hiện có */

        if (item.Defects && item.Defects.length > 0) {

            const mapped = item.Defects.map(d => ({
                defectId: d.DefectId,
                MaLoi: d.MaLoi,
                TenLoi: d.TenLoi,
                DefectType: d.DefectType,
                soLuong: d.SoLuong
            }));

            setSelectedDefects(mapped);

        }

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

            console.log(err);

        }

    };

    const handleAddDefect = (d) => {

        const exists = selectedDefects.find(x => x.defectId === d.Id);

        if (exists) {
            Alert.alert("Thông báo", "Lỗi đã được chọn");
            return;
        }

        setSelectedDefects(prev => [
            ...prev,
            {
                defectId: d.Id,
                MaLoi: d.MaLoi,
                TenLoi: d.TenLoi,
                DefectType: d.DefectType,
                soLuong: 1
            }
        ]);

        setShowModal(false);
        setSearchText("");

    };

    const updateQty = (index, value) => {

        const updated = [...selectedDefects];
        updated[index].soLuong = Number(value) || 0;

        setSelectedDefects(updated);

    };

    const removeDefect = (defectId) => {

        setSelectedDefects(
            selectedDefects.filter(x => x.defectId !== defectId)
        );

    };

    const handleSave = async () => {

        if (!ketQua) {
            Alert.alert("Thiếu thông tin", "Vui lòng chọn kết quả");
            return;
        }

        if (ketQua === "KHONG_DAT") {

            if (selectedDefects.length === 0) {
                Alert.alert("Thiếu thông tin", "Chọn ít nhất 1 lỗi");
                return;
            }

        }

        try {

            setLoading(true);

            await saveCheckItem({

                checkItemId: Number(item.Id),
                ketQua,
                defects: selectedDefects.map(d => ({
                    defectId: d.defectId,
                    soLuong: d.soLuong
                }))

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

            {/* info */}

            <View style={styles.infoCard}>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Tham chiếu</Text>
                    <Text style={styles.value}>{item.ThamChieu || "--"}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Phương pháp</Text>
                    <Text style={styles.value}>{item.PhuongPhapKiem || "--"}</Text>
                </View>

            </View>

            <View style={styles.standardCard}>
                <Text style={styles.standardTitle}>Tiêu chuẩn kỹ thuật</Text>
                <Text style={styles.standard}>{item.TieuChuan}</Text>
            </View>

            {/* chọn kết quả */}

            <View style={styles.row}>

                <TouchableOpacity
                    style={[styles.option, ketQua === "DAT" && styles.success]}
                    onPress={() => {
                        setKetQua("DAT");
                        setSelectedDefects([]);
                    }}
                >
                    <Text style={styles.optionText}>Đạt</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.option, ketQua === "KHONG_DAT" && styles.error]}
                    onPress={() => setKetQua("KHONG_DAT")}
                >
                    <Text style={styles.optionText}>Không đạt</Text>
                </TouchableOpacity>

            </View>

            {/* defects */}

            {ketQua === "KHONG_DAT" && (

                <>

                    <TouchableOpacity
                        style={styles.selectBox}
                        onPress={() => setShowModal(true)}
                    >
                        <Text style={styles.selectText}>+ Thêm lỗi</Text>
                    </TouchableOpacity>

                    {selectedDefects.map((d, index) => (
                        <View key={index} style={styles.defectRow}>

                            <View style={{ flex: 1 }}>
                                <Text style={styles.defectCode}>{d.MaLoi}</Text>
                                <Text style={styles.defectName}>{d.TenLoi}</Text>
                            </View>

                            <TextInput
                                style={styles.qtyInput}
                                // keyboardType="numeric"
                                value={String(d.soLuong)}
                                onChangeText={(val) => updateQty(index, val)}
                            />

                            <TouchableOpacity onPress={() => removeDefect(d.defectId)}>
                                <Text style={{ color: "#ef4444", fontWeight: "bold" }}>X</Text>
                            </TouchableOpacity>

                        </View>
                    ))}

                </>

            )}

            <TouchableOpacity
                style={[styles.saveBtn, loading && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={loading}
            >

                {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.saveText}>Lưu kết quả</Text>
                }

            </TouchableOpacity>

            {/* modal chọn lỗi */}

            <Modal visible={showModal} transparent animationType="slide">

                <View style={styles.modalOverlay}>

                    <View style={styles.modalContent}>

                        <Text style={styles.modalTitle}>Chọn lỗi</Text>

                        <TextInput
                            placeholder="Tìm mã lỗi / tên lỗi..."
                            value={searchText}
                            onChangeText={setSearchText}
                            style={styles.searchInput}
                        />

                        <ScrollView>

                            {filteredDefects.map((d) => (
                                <TouchableOpacity
                                    key={d.Id}
                                    style={styles.defectItem}
                                    onPress={() => handleAddDefect(d)}
                                >

                                    <Text style={styles.defectCode}>{d.MaLoi}</Text>
                                    <Text style={styles.defectName}>{d.TenLoi}</Text>
                                    <Text style={styles.defectType}>{d.DefectType}</Text>

                                </TouchableOpacity>
                            ))}

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

    standard: {
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
        fontWeight: "600"
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
        marginBottom: 10
    },

    selectText: {
        fontWeight: "600"
    },

    defectRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 12,
        marginBottom: 8
    },

    defectCode: {
        fontWeight: "bold"
    },

    defectName: {
        color: "#475569"
    },

    qtyInput: {
        width: 60,
        backgroundColor: "#f1f5f9",
        padding: 8,
        borderRadius: 8,
        textAlign: "center",
        marginRight: 10
    },

    saveBtn: {
        backgroundColor: "#2563eb",
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 20
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

    searchInput: {
        backgroundColor: "#f1f5f9",
        padding: 12,
        borderRadius: 12,
        marginBottom: 12
    },

    defectItem: {
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: "#f1f5f9"
    },

    defectType: {
        fontSize: 12,
        color: "#64748b"
    },

    closeBtn: {
        backgroundColor: "#2563eb",
        padding: 14,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 10
    }

});