// src/components/AssignUserModal.jsx

import { useEffect, useState } from "react";
import {
    View,
    Text,
    Modal,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    TextInput,
    Alert
} from "react-native";

import {
    getBoPhan,
    assignDepartments
} from "../api/bienBan.api";

export default function AssignUserModal({
    visible,
    onClose,
    bienBanId,
    assignedUsers = [],
    reload
}) {

    const [departments, setDepartments] = useState([]);
    const [selected, setSelected] = useState([]);
    const [search, setSearch] = useState("");

    /* LOAD DEPARTMENTS */

    useEffect(() => {

        if (visible) {
            loadDepartments();
        }

    }, [visible]);

    /* SET SELECTED BAN ĐẦU */

    useEffect(() => {

        if (assignedUsers?.length) {

            const ids = assignedUsers.map(x => x.BoPhanId);

            setSelected(ids);

        }

    }, [assignedUsers]);

    const loadDepartments = async () => {

        try {

            const res = await getBoPhan();

            setDepartments(res.data || []);

        } catch (err) {

            console.log(err);

        }

    };

    /* TOGGLE */

    const toggleDepartment = (id) => {

        if (selected.includes(id)) {

            setSelected(selected.filter(x => x !== id));

        } else {

            setSelected([...selected, id]);

        }

    };

    /* SUBMIT */

    const handleSubmit = async () => {

        try {
            const res = await assignDepartments(bienBanId, selected);
            reload();
            onClose();
        } catch (err) {
            err.status = 403 ? Alert.alert("Không thể xác nhận", "Không được cấp quyền") : console.log(err);
        }
    };

    /* FILTER */

    const filteredDepartments = departments.filter(d => {

        const keyword = search.toLowerCase();

        return (
            d.TenBoPhan?.toLowerCase().includes(keyword) ||
            d.MaBoPhan?.toLowerCase().includes(keyword)
        );

    });

    /* RENDER ITEM */

    const renderDepartment = ({ item }) => (

        <TouchableOpacity
            style={styles.user}
            onPress={() => toggleDepartment(item.Id)}
        >

            <View>

                <Text style={styles.name}>
                    {item.TenBoPhan}
                </Text>

                <Text style={styles.role}>
                    {item.MaBoPhan}
                </Text>

            </View>

            <Text style={styles.check}>
                {selected.includes(item.Id) ? "✓" : ""}
            </Text>

        </TouchableOpacity>

    );

    return (

        <Modal
            visible={visible}
            animationType="slide"
        >

            <SafeAreaView style={styles.container}>

                {/* HEADER */}

                <View style={styles.header}>

                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.back}>
                            ←
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.title}>
                        Chọn bộ phận xử lý
                    </Text>

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

                    <TouchableOpacity
                        style={styles.btn}
                        onPress={handleSubmit}
                    >

                        <Text style={styles.btnText}>
                            Xác nhận
                        </Text>

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
        paddingHorizontal: 16,
        paddingVertical: 12,
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
        backgroundColor: "#f1f5f9",
        margin: 16,
        padding: 12,
        borderRadius: 10
    },

    user: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1,
        borderColor: "#eee"
    },

    name: {
        fontWeight: "600",
        fontSize: 16
    },

    role: {
        color: "#666",
        marginTop: 2
    },

    check: {
        fontSize: 20,
        color: "#27ae60"
    },

    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderColor: "#eee"
    },

    btn: {
        backgroundColor: "#2ecc71",
        padding: 16,
        borderRadius: 12,
        alignItems: "center"
    },

    btnText: {
        color: "#fff",
        fontWeight: "600"
    }

});