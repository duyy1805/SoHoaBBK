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
    TextInput
} from "react-native";

import {
    getAssignableUsers,
    assignUsers,
} from "../api/bienBan.api";

export default function AssignUserModal({
    visible,
    onClose,
    bienBanId,
    assignedUsers = [],
    reload
}) {

    const [users, setUsers] = useState([]);
    const [selected, setSelected] = useState([]);
    const [search, setSearch] = useState("");

    /* load users */

    useEffect(() => {

        if (visible) {
            loadUsers();
        }

    }, [visible]);

    /* set selected ban đầu */

    useEffect(() => {

        if (assignedUsers?.length) {

            const ids = assignedUsers.map(x => x.NguoiXuLyId);

            setSelected(ids);

        }

    }, [assignedUsers]);

    const loadUsers = async () => {

        try {

            const res = await getAssignableUsers(bienBanId);

            setUsers(res.data || []);

        } catch (err) {

            console.log(err);

        }

    };

    /* toggle */

    const toggleUser = (id) => {

        if (selected.includes(id)) {
            setSelected(selected.filter(x => x !== id));
        } else {
            setSelected([...selected, id]);
        }

    };

    /* submit */

    const handleSubmit = async () => {

        await assignUsers(bienBanId, selected);

        reload();
        onClose();

    };

    /* filter */

    const filteredUsers = users.filter(u => {

        const keyword = search.toLowerCase();

        return (
            u.FullName?.toLowerCase().includes(keyword) ||
            u.RoleName?.toLowerCase().includes(keyword)
        );

    });

    /* render */

    const renderUser = ({ item }) => (

        <TouchableOpacity
            style={styles.user}
            onPress={() => toggleUser(item.Id)}
        >

            <View>

                <Text style={styles.name}>
                    {item.FullName}
                </Text>

                <Text style={styles.role}>
                    {item.RoleName}
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
                        Chọn người xử lý
                    </Text>

                    <View style={{ width: 30 }} />

                </View>

                {/* SEARCH */}

                <TextInput
                    placeholder="Tìm người xử lý..."
                    value={search}
                    onChangeText={setSearch}
                    style={styles.search}
                />

                {/* USER LIST */}

                <FlatList
                    data={filteredUsers}
                    renderItem={renderUser}
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