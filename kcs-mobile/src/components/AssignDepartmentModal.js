import { useEffect, useState } from "react";
import {
    View,
    Text,
    Modal,
    TextInput,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    SafeAreaView
} from "react-native";

import {
    getBoPhan,
    assignDepartments
} from "../api/bienBan.api";

export default function AssignDepartmentModal({
    visible,
    bienBanId,
    assignedDepartments = [],
    onClose,
    reload
}) {
    const [departments, setDepartments] = useState([]);
    const [selected, setSelected] = useState([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (visible) {
            setSelected(assignedDepartments.map(d => d.BoPhanId));
            loadDepartments();
        }
    }, [visible]);

    const loadDepartments = async () => {
        try {
            const res = await getBoPhan();
            setDepartments(res.data);
        } catch (err) {
            Alert.alert("Lỗi", "Không tải được danh sách bộ phận");
        }
    };

    const toggleDepartment = (id) => {
        if (selected.includes(id)) {
            setSelected(selected.filter(x => x !== id));
        } else {
            setSelected([...selected, id]);
        }
    };

    const handleSubmit = async () => {
        if (selected.length === 0) {
            Alert.alert("Thông báo", "Vui lòng chọn ít nhất một bộ phận");
            return;
        }
        try {
            await assignDepartments(bienBanId, selected);
            reload();
            onClose();
        } catch (err) {
            Alert.alert(
                "Lỗi",
                err?.response?.status === 403 ? "Không được cấp quyền" : "Không thể xác nhận"
            );
        }
    };

    const filteredDepartments = departments.filter(d => {
        const keyword = search.toLowerCase();
        return (
            d.TenBoPhan?.toLowerCase().includes(keyword) ||
            d.MaBoPhan?.toLowerCase().includes(keyword)
        );
    });

    const renderDepartment = ({ item }) => (
        <TouchableOpacity
            style={styles.departmentItem}
            onPress={() => toggleDepartment(item.Id)}
        >
            <View style={styles.departmentInfo}>
                <Text style={styles.name}>{item.TenBoPhan}</Text>
                <Text style={styles.role}>{item.MaBoPhan}</Text>
            </View>
            <Text style={styles.check}>
                {selected.includes(item.Id) ? "✓" : ""}
            </Text>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} animationType="slide">
          <SafeAreaView style={styles.container}>
                {/* HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.back}>←</Text>
                    </TouchableOpacity>

                    <Text style={styles.title}>Chọn bộ phận xử lý</Text>

                    <View style={{ width: 30 }} />
                </View>

                {/* SEARCH */}
                <TextInput
                    placeholder="Tìm bộ phận..."
                    value={search}
                    onChangeText={setSearch}
                    style={styles.search}
                />

                {/* LIST */}
                <FlatList
                    data={filteredDepartments}
                    renderItem={renderDepartment}
                    keyExtractor={(item) => item.Id.toString()}
                    contentContainerStyle={{ paddingBottom: 100 }}
                />

                {/* FOOTER */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.btn} onPress={handleSubmit}>
                        <Text style={styles.btnText}>Xác nhận</Text>
                    </TouchableOpacity>
                </View>
          </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff"
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1,
        borderColor: "#eee"
    },
    title: {
        fontSize: 18,
        fontWeight: "bold"
    },
    back: {
        fontSize: 22
    },
    search: {
        margin: 16,
        padding: 12,
        backgroundColor: "#f4f6fa",
        borderRadius: 10
    },
    departmentItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderColor: "#eee"
    },
    departmentInfo: {
        flex: 1,
        paddingRight: 12
    },
    name: {
        fontWeight: "600",
        fontSize: 16
    },
    role: {
        color: "#666",
        marginTop: 4
    },
    check: {
        fontSize: 18,
        color: "#27ae60",
        fontWeight: "bold"
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderColor: "#eee"
    },
    btn: {
        backgroundColor: "#2980b9",
        padding: 14,
        borderRadius: 10,
        alignItems: "center"
    },
    btnText: {
        color: "#fff",
        fontWeight: "600"
    }
});
