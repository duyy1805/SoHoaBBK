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
import { getBoPhan } from "../api/bienBan.api";

const toDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const parseDateString = (value) => {
    if (!value) return null;
    const [year, month, day] = String(value).split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
};

export default function SxbtHanhDongModal({ visible, onClose, onSave }) {
    const [noiDung, setNoiDung] = useState("");
    const [thoiHan, setThoiHan] = useState("");
    const [boPhanId, setBoPhanId] = useState(null);
    const [boPhanText, setBoPhanText] = useState("");
    const [boPhanList, setBoPhanList] = useState([]);
    const [showBoPhanModal, setShowBoPhanModal] = useState(false);
    const [showDate, setShowDate] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setNoiDung("");
        setThoiHan("");
        setBoPhanId(null);
        setBoPhanText("");
        loadBoPhan();
    }, [visible]);

    const loadBoPhan = async () => {
        try {
            const res = await getBoPhan();
            setBoPhanList(res.data || []);
        } catch (err) {
            setBoPhanList([]);
        }
    };

    const handleSubmit = () => {
        if (!noiDung.trim()) {
            Alert.alert("Thiếu dữ liệu", "Nhập nội dung hành động");
            return;
        }
        if (!boPhanId) {
            Alert.alert("Thiếu dữ liệu", "Chọn bộ phận chịu trách nhiệm");
            return;
        }

        onSave?.({
            noiDung: noiDung.trim(),
            thoiHan: thoiHan || null,
            boPhanId,
            boPhanText
        });
    };

    return (
        <Modal visible={visible} animationType="none">
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.back}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Thêm hành động khắc phục</Text>
                    <View style={{ width: 30 }} />
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Nội dung hành động</Text>
                    <TextInput
                        style={styles.textarea}
                        placeholder="Nhập nội dung hành động..."
                        multiline
                        value={noiDung}
                        onChangeText={setNoiDung}
                    />

                    <Text style={styles.label}>Thời hạn hoàn thành</Text>
                    <TouchableOpacity style={styles.dateBox} onPress={() => setShowDate(true)}>
                        <Text style={{ color: thoiHan ? "#111827" : "#9ca3af" }}>
                            {thoiHan || "Chọn thời hạn"}
                        </Text>
                    </TouchableOpacity>

                    {showDate && (
                        <DateTimePicker
                            value={parseDateString(thoiHan) || new Date()}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowDate(false);
                                if (selectedDate) {
                                    setThoiHan(toDateString(selectedDate));
                                }
                            }}
                        />
                    )}

                    <Text style={styles.label}>Bộ phận thực hiện</Text>
                    <TouchableOpacity style={styles.dateBox} onPress={() => setShowBoPhanModal(true)}>
                        <Text style={{ color: boPhanText ? "#111827" : "#9ca3af" }}>
                            {boPhanText || "Chọn bộ phận"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.btn} onPress={handleSubmit}>
                        <Text style={styles.btnText}>Cập nhật</Text>
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
    textarea: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        padding: 12,
        minHeight: 100,
        textAlignVertical: "top"
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
