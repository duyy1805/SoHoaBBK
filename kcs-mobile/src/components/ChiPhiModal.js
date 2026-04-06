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

import {
    addChiPhi,
    getBoPhan
} from "../api/bienBan.api";

export default function ChiPhiModal({
    visible,
    bienBanId,
    currentUserId,
    onClose,
    reload
}) {

    const [loaiChiPhi, setLoaiChiPhi] = useState("");
    const [giaTri, setGiaTri] = useState("");

    const [boPhanId, setBoPhanId] = useState(null);
    const [boPhanText, setBoPhanText] = useState("");

    const [boPhanList, setBoPhanList] = useState([]);

    const [thoiHan, setThoiHan] = useState(new Date());
    const [showDate, setShowDate] = useState(false);

    const [showBoPhanModal, setShowBoPhanModal] = useState(false);

    const [loading, setLoading] = useState(false);


    /* LOAD LOOKUP */

    useEffect(() => {

        if (visible) {

            setLoaiChiPhi("");
            setGiaTri("");
            setBoPhanId(null);
            setBoPhanText("");
            setThoiHan(new Date());

            loadBoPhan();

        }

    }, [visible]);

    const formatMoney = (value) => {
        const number = value.replace(/\D/g, "");
        return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const unformatMoney = (value) => {
        return value.replace(/\./g, "");
    };

    const loadBoPhan = async () => {

        try {

            const res = await getBoPhan();

            setBoPhanList(res.data || []);

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


    /* SUBMIT */

    const handleSubmit = async () => {

        if (!loaiChiPhi.trim()) {
            Alert.alert("Thiếu dữ liệu", "Nhập loại chi phí");
            return;
        }

        if (!giaTri) {
            Alert.alert("Thiếu dữ liệu", "Nhập giá trị");
            return;
        }

        try {

            setLoading(true);
            await addChiPhi({
                bienBanId,
                loaiChiPhi,
                giaTri: Number(unformatMoney(giaTri)),
                thoiHan
            });

            Alert.alert("Thành công", "Đã thêm chi phí");

            reload();
            onClose();

        } catch (err) {

            Alert.alert(
                "Lỗi",
                err?.response?.data?.message || "Không thể thêm chi phí"
            );

        } finally {

            setLoading(false);

        }

    };


    return (

        <Modal visible={visible} animationType="none">

            <View style={styles.container}>


                {/* HEADER */}

                <View style={styles.header}>

                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.back}>←</Text>
                    </TouchableOpacity>

                    <Text style={styles.title}>
                        Thêm chi phí phát sinh
                    </Text>

                    <View style={{ width: 30 }} />

                </View>


                {/* FORM */}

                <View style={styles.form}>


                    {/* LOẠI CHI PHÍ */}

                    <Text style={styles.label}>
                        Loại chi phí
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Ví dụ: Vật tư/BTP/TP"
                        value={loaiChiPhi}
                        onChangeText={setLoaiChiPhi}
                    />


                    {/* GIÁ TRỊ */}

                    <Text style={styles.label}>
                        Giá trị (VND)
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Nhập số tiền"
                        // keyboardType="numeric"
                        value={giaTri}
                        onChangeText={(text) => {
                            const formatted = formatMoney(text);
                            setGiaTri(formatted);
                        }}
                    />

                    {/* BỘ PHẬN */}

                    {/* <Text style={styles.label}>
                        Bộ phận chịu trách nhiệm
                    </Text>

                    <TouchableOpacity
                        style={styles.selectBox}
                        onPress={() => setShowBoPhanModal(true)}
                    >

                        <Text style={{
                            color: boPhanText ? "#000" : "#999"
                        }}>
                            {boPhanText || "Chọn bộ phận"}
                        </Text>

                    </TouchableOpacity> */}


                    {/* THỜI HẠN */}

                    <Text style={styles.label}>
                        Thời hạn
                    </Text>

                    <TouchableOpacity
                        style={styles.dateBox}
                        onPress={() => setShowDate(true)}
                    >

                        <Text>
                            {thoiHan.toLocaleDateString("vi-VN")}
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

                </View>


                {/* FOOTER */}

                <View style={styles.footer}>

                    <TouchableOpacity
                        style={styles.btn}
                        onPress={handleSubmit}
                        disabled={loading}
                    >

                        <Text style={styles.btnText}>
                            Lưu chi phí
                        </Text>

                    </TouchableOpacity>

                </View>

            </View>


            {/* MODAL CHỌN BỘ PHẬN */}

            {/* <Modal
                visible={showBoPhanModal}
                transparent
                animationType="fade"
            >

                <View style={styles.overlay}>

                    <View style={styles.selectModal}>

                        <Text style={styles.modalTitle}>
                            Chọn bộ phận
                        </Text>

                        <FlatList
                            data={boPhanList}
                            keyExtractor={(item) => item.Id.toString()}
                            renderItem={({ item }) => (

                                <TouchableOpacity
                                    style={styles.item}
                                    onPress={() => {

                                        setBoPhanId(item.Id);
                                        setBoPhanText(item.MaBoPhan + " - " + item.TenBoPhan);

                                        setShowBoPhanModal(false);

                                    }}
                                >

                                    <Text style={styles.itemText}>
                                        {item.MaBoPhan} - {item.TenBoPhan}
                                    </Text>

                                </TouchableOpacity>

                            )}
                        />

                        <TouchableOpacity
                            style={styles.cancel}
                            onPress={() => setShowBoPhanModal(false)}
                        >

                            <Text>Đóng</Text>

                        </TouchableOpacity>

                    </View>

                </View>

            </Modal> */}

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
        padding: 16
    },

    label: {
        fontWeight: "600",
        marginTop: 16,
        marginBottom: 6
    },

    input: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
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
        backgroundColor: "#16a085",
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