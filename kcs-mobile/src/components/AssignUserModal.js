import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

import {
    assignUserToDepartment,
    getAssignableUsersByDepartment
} from "../api/bienBan.api";

export default function AssignUserModal({
    visible,
    onClose,
    bienBanId,
    boPhanId,
    tenBoPhan,
    currentAssignedUserId,
    reload
}) {
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(currentAssignedUserId || null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!visible) {
            setSearch("");
            return;
        }

        setSelectedUserId(currentAssignedUserId || null);
        loadUsers();
    }, [visible, currentAssignedUserId, boPhanId]);

    const loadUsers = async () => {
        if (!bienBanId || !boPhanId) {
            setUsers([]);
            return;
        }

        try {
            setLoading(true);
            const res = await getAssignableUsersByDepartment(bienBanId, boPhanId);
            setUsers(res.data || []);
        } catch (err) {
            Alert.alert(
                "Lỗi",
                err?.response?.data?.message || "Không tải được danh sách nhân sự"
            );
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return users;

        return users.filter((user) => (
            user.FullName?.toLowerCase().includes(keyword) ||
            user.Username?.toLowerCase().includes(keyword) ||
            user.MaBoPhan?.toLowerCase().includes(keyword) ||
            user.TenBoPhan?.toLowerCase().includes(keyword)
        ));
    }, [search, users]);

    const handleSubmit = async () => {
        if (!selectedUserId) {
            Alert.alert("Thiếu thông tin", "Vui lòng chọn một cá nhân xử lý.");
            return;
        }

        try {
            setSubmitting(true);
            await assignUserToDepartment(bienBanId, {
                boPhanId,
                nguoiXuLyId: selectedUserId
            });
            reload();
            onClose();
        } catch (err) {
            Alert.alert(
                "Lỗi",
                err?.response?.data?.message || "Không thể phân công cá nhân"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const renderUser = ({ item }) => (
        <TouchableOpacity
            style={styles.user}
            onPress={() => setSelectedUserId(item.Id)}
        >
            <View style={styles.userInfo}>
                <Text style={styles.name}>{item.FullName || item.Username}</Text>
                <Text style={styles.role}>
                    {item.Username}
                    {item.TenBoPhan ? ` - ${item.TenBoPhan}` : ""}
                </Text>
            </View>

            <Text style={styles.check}>
                {selectedUserId === item.Id ? "✓" : ""}
            </Text>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.back}>←</Text>
                    </TouchableOpacity>

                    <View style={styles.titleWrapper}>
                        <Text style={styles.title}>Phân cá nhân xử lý</Text>
                        <Text style={styles.subtitle}>{tenBoPhan || "Bộ phận xử lý"}</Text>
                    </View>

                    <View style={{ width: 30 }} />
                </View>

                <TextInput
                    placeholder="Tìm cá nhân..."
                    value={search}
                    onChangeText={setSearch}
                    style={styles.search}
                />

                {loading ? (
                    <ActivityIndicator size="large" style={styles.loader} />
                ) : (
                    <FlatList
                        data={filteredUsers}
                        renderItem={renderUser}
                        keyExtractor={(item) => item.Id.toString()}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>
                                Không có cá nhân phù hợp trong bộ phận này.
                            </Text>
                        }
                    />
                )}

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.btn, submitting && styles.btnDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        <Text style={styles.btnText}>
                            {submitting ? "Đang lưu..." : "Xác nhận"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
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
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 70,
        padding: 16,
        borderBottomWidth: 1,
        borderColor: "#eee",
        backgroundColor: "#fff"
    },

    titleWrapper: {
        alignItems: "center"
    },

    title: {
        fontSize: 18,
        fontWeight: "bold"
    },

    subtitle: {
        marginTop: 4,
        color: "#666"
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

    loader: {
        marginTop: 40
    },

    listContent: {
        paddingBottom: 100
    },

    user: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderColor: "#eee"
    },

    userInfo: {
        flex: 1,
        paddingRight: 12
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

    emptyText: {
        textAlign: "center",
        color: "#666",
        paddingHorizontal: 24,
        paddingTop: 32
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

    btnDisabled: {
        opacity: 0.7
    },

    btnText: {
        color: "#fff",
        fontWeight: "600"
    }
});
