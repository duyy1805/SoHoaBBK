import { useEffect, useState } from "react";
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    FlatList
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addBienBanSxbtXuLyRow, getBoPhan } from "../api/bienBan.api";

export default function SxbtXuLyModal({
    visible,
    bienBanId,
    mucDo,
    onClose,
    reload
}) {
    const [chiPhi, setChiPhi] = useState("");
    const [noiDung, setNoiDung] = useState("");
    const [boPhanId, setBoPhanId] = useState(null);
    const [boPhanText, setBoPhanText] = useState("");
    const [boPhanList, setBoPhanList] = useState([]);
    const [thoiHan, setThoiHan] = useState(new Date());
    const [showDate, setShowDate] = useState(false);
    const [showBoPhanModal, setShowBoPhanModal] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setChiPhi("");
        setNoiDung("");
        setBoPhanId(null);
        setBoPhanText("");
        setThoiHan(new Date());
        getBoPhan()
            .then((res) => setBoPhanList(res.data || []))
            .catch(() => setBoPhanList([]));
    }, [visible]);

    const handleSubmit = async () => {
        if (!noiDung.trim()) {
            Alert.alert("Thiếu dữ liệu", "Vui lòng nhập nội dung");
            return;
        }
        if (!boPhanId) {
            Alert.alert("Thiếu dữ liệu", "Vui lòng chọn bộ phận trách nhiệm");
            return;
        }

        try {
            setLoading(true);
            await addBienBanSxbtXuLyRow(bienBanId, {
                mucDo,
                chiPhi: chiPhi || null,
                noiDung,
                boPhanTrachNhiemId: boPhanId,
                thoiHan
            });
            Alert.alert("Thành công", "Đã lưu phương án xử lý");
            reload();
            onClose();
        } catch (err) {
            Alert.alert("Lỗi", err?.response?.data?.message || "Không thể lưu phương án xử lý");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="none">
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.back}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Nhập phương án xử lý</Text>
                    <View style={{ width: 30 }} />
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Chi phí</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nhập chi phí"
                        value={chiPhi}
                        onChangeText={setChiPhi}
                    />

                    <Text style={styles.label}>Nội dung</Text>
                    <TextInput
                        style={styles.textarea}
                        placeholder="Nhập nội dung xử lý"
                        multiline
                        value={noiDung}
                        onChangeText={setNoiDung}
                    />

                    <Text style={styles.label}>Trách nhiệm</Text>
                    <TouchableOpacity style={styles.selectBox} onPress={() => setShowBoPhanModal(true)}>
                        <Text style={{ color: boPhanText ? "#000" : "#999" }}>
                            {boPhanText || "Chọn bộ phận"}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Thời hạn</Text>
                    <TouchableOpacity style={styles.dateBox} onPress={() => setShowDate(true)}>
                        <Text>{thoiHan.toLocaleDateString("vi-VN")}</Text>
                    </TouchableOpacity>

                    {showDate && (
                        <DateTimePicker
                            value={thoiHan}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowDate(false);
                                if (selectedDate) setThoiHan(selectedDate);
                            }}
                        />
                    )}
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
                        <Text style={styles.btnText}>Lưu phương án xử lý</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Modal visible={showBoPhanModal} transparent animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.selectModal}>
                        <Text style={styles.modalTitle}>Chọn bộ phận</Text>
                        <FlatList
                            data={boPhanList}
                            keyExtractor={(item) => item.Id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.item}
                                    onPress={() => {
                                        setBoPhanId(item.Id);
                                        setBoPhanText(`${item.MaBoPhan} - ${item.TenBoPhan}`);
                                        setShowBoPhanModal(false);
                                    }}
                                >
                                    <Text>{item.MaBoPhan} - {item.TenBoPhan}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowBoPhanModal(false)}>
                            <Text>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f6f7fb"
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 70,
        padding: 16,
        borderBottomWidth: 1,
        borderColor: "#eee",
        backgroundColor: "#fff"
    },
    back: {
        fontSize: 22
    },
    title: {
        fontSize: 18,
        fontWeight: "600"
    },
    form: {
        padding: 16
    },
    label: {
        fontWeight: "600",
        marginTop: 16,
        marginBottom: 6
    },
    input: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        padding: 12
    },
    textarea: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        padding: 12,
        minHeight: 100,
        textAlignVertical: "top"
    },
    selectBox: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        padding: 12
    },
    dateBox: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        padding: 12
    },
    footer: {
        padding: 16
    },
    btn: {
        backgroundColor: "#2d8cff",
        borderRadius: 14,
        padding: 16,
        alignItems: "center"
    },
    btnText: {
        color: "#fff",
        fontWeight: "600"
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        padding: 20
    },
    selectModal: {
        backgroundColor: "#fff",
        borderRadius: 12,
        maxHeight: "70%",
        padding: 16
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 12
    },
    item: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee"
    },
    closeBtn: {
        alignSelf: "flex-end",
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 12
    }
});
