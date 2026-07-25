// src/components/XuLyModal.jsx

import { useEffect, useState } from "react";
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import KeyboardFormScrollView from "./KeyboardFormScrollView";

import DateTimePicker from "@react-native-community/datetimepicker";

import {
    getDeNghiXuLy,
    addXuLy
} from "../api/bienBan.api";

export default function XuLyModal({
    visible,
    bienBanId,
    currentUserId,
    onClose,
    reload
}) {

    const [noiDung, setNoiDung] = useState("");
    const [deNghiXuLyId, setDeNghiXuLyId] = useState(null);
    const [deNghiText, setDeNghiText] = useState("");

    const [deNghiList, setDeNghiList] = useState([]);

    const [thoiHan, setThoiHan] = useState(new Date());
    const [showDate, setShowDate] = useState(false);

    const [showSelectModal, setShowSelectModal] = useState(false);

    const [loading, setLoading] = useState(false);

    /* LOAD LOOKUP */

    useEffect(() => {

        if (visible) {

            setNoiDung("");
            setDeNghiXuLyId(null);
            setDeNghiText("");
            setThoiHan(new Date());

            loadLookup();
        }

    }, [visible]);

    const loadLookup = async () => {

        try {

            const res = await getDeNghiXuLy();

            setDeNghiList(res.data || []);

        } catch (err) {

            console.log(err);

        }

    };

    /* DATE */

    const onChangeDate = (event, selectedDate) => {

        setShowDate(false);

        if (selectedDate) {
            setThoiHan(selectedDate);
        }

    };

    /* SELECT */

    const handleSelect = (item) => {

        setDeNghiXuLyId(item.Id);
        setDeNghiText(item.Ten);

        setShowSelectModal(false);

    };

    /* SUBMIT */

    const handleSubmit = async () => {

        if (!noiDung.trim()) {
            Alert.alert("Thiếu dữ liệu", "Vui lòng nhập nội dung");
            return;
        }

        if (!deNghiXuLyId) {
            Alert.alert("Thiếu dữ liệu", "Chọn đề nghị xử lý");
            return;
        }

        try {

            setLoading(true);

            await addXuLy({
                bienBanId,
                noiDung,
                deNghiXuLyId,
                currentUserId,
                thoiHan
            });

            Alert.alert("Thành công", "Đã lưu đề xuất xử lý");

            reload();
            onClose();

        } catch (err) {

            Alert.alert(
                "Lỗi",
                err?.response?.data?.message || "Không thể lưu đề xuất"
            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <Modal visible={visible} animationType="none">

            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >

                {/* HEADER */}

                <View style={styles.header}>

                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.back}>←</Text>
                    </TouchableOpacity>

                    <Text style={styles.title}>
                        Nhập ý kiến xử lý
                    </Text>

                    <View style={{ width: 30 }} />

                </View>

                {/* FORM */}

                <KeyboardFormScrollView
                    style={styles.form}
                    contentContainerStyle={styles.formContent}
                    keyboardShouldPersistTaps="handled"
                >

                    {/* NỘI DUNG */}

                    <Text style={styles.label}>
                        Nội dung
                    </Text>

                    <TextInput
                        style={styles.textarea}
                        placeholderTextColor="#64748b"
                        placeholder="Mô tả nội dung xử lý..."
                        multiline
                        value={noiDung}
                        onChangeText={setNoiDung}
                    />

                    {/* ĐỀ NGHỊ XỬ LÝ */}

                    <Text style={styles.label}>
                        Đề nghị xử lý
                    </Text>

                    <TouchableOpacity
                        style={styles.selectBox}
                        onPress={() => setShowSelectModal(true)}
                    >

                        <Text style={{
                            color: deNghiText ? "#000" : "#999"
                        }}>
                            {deNghiText || "Chọn đề nghị xử lý"}
                        </Text>

                    </TouchableOpacity>

                    {/* THỜI HẠN */}

                    <Text style={styles.label}>
                        Thời hạn
                    </Text>

                    <TouchableOpacity
                        style={styles.dateBox}
                        onPress={() => setShowDate(true)}
                    >

                        <Text>
                            {thoiHan.toLocaleDateString()}
                        </Text>

                    </TouchableOpacity>

                    {showDate && (

                        <DateTimePicker
                            value={thoiHan}
                            mode="date"
                            display="default"
                            onChange={onChangeDate}
                        />

                    )}

                </KeyboardFormScrollView>

                {/* FOOTER */}

                <View style={styles.footer}>

                    <TouchableOpacity
                        style={styles.btn}
                        onPress={handleSubmit}
                        disabled={loading}
                    >

                        <Text style={styles.btnText}>
                            Lưu đề xuất xử lý
                        </Text>

                    </TouchableOpacity>

                </View>

            </KeyboardAvoidingView>

            {/* MODAL CHỌN ĐỀ NGHỊ */}

            <Modal
                visible={showSelectModal}
                transparent
                animationType="fade"
            >

                <View style={styles.overlay}>

                    <View style={styles.selectModal}>

                        <Text style={styles.modalTitle}>
                            Chọn đề nghị xử lý
                        </Text>

                        <FlatList
                            data={deNghiList}
                            keyExtractor={(item) => item.Id.toString()}
                            renderItem={({ item }) => (

                                <TouchableOpacity
                                    style={styles.item}
                                    onPress={() => handleSelect(item)}
                                >

                                    <Text style={styles.itemText}>
                                        {item.Ten}
                                    </Text>

                                </TouchableOpacity>

                            )}
                        />

                        <TouchableOpacity
                            style={styles.cancel}
                            onPress={() => setShowSelectModal(false)}
                        >

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
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 70,
        padding: 16,
        borderBottomWidth: 1,
        borderColor: "#eee",
        backgroundColor: "#fff"
    },

    title: {
        fontSize: 18,
        fontWeight: "600"
    },

    back: {
        fontSize: 22
    },

    form: {
        flex: 1
    },

    formContent: {
        padding: 16,
        paddingBottom: 24
    },

    label: {
        fontWeight: "600",
        marginTop: 16,
        marginBottom: 6
    },

    textarea: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        minHeight: 100,
        borderWidth: 1,
        borderColor: "#e5e7eb"
    },

    selectBox: {
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb"
    },

    dateBox: {
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb"
    },

    footer: {
        padding: 16
    },

    btn: {
        backgroundColor: "#2d8cff",
        padding: 16,
        borderRadius: 14,
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
        borderRadius: 16,
        padding: 16,
        maxHeight: "70%"
    },

    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 12
    },

    item: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: "#eee"
    },

    itemText: {
        fontSize: 16
    },

    cancel: {
        alignItems: "center",
        marginTop: 12
    }

});
