import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    StatusBar
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getUser, logout } from "../utils/auth";
import { getNotifications } from '../api/notification.api';
const CONG_DOAN_ENABLED = process.env.EXPO_PUBLIC_ENABLE_CONG_DOAN !== "false";
export default function HomeScreen({ navigation }) {
    const [user, setUser] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        loadUser();
    }, []);
    useFocusEffect(
        useCallback(() => {
            getNotifications().then(res => {
                setUnreadCount(res.data.unreadCount || 0);
            }).catch(console.error);
        }, [])
    );
    const loadUser = async () => {
        const storedUser = await getUser();
        if (storedUser) {
            setUser(storedUser);
        }
    };

    const handleLogout = () => {
        Alert.alert("Xác nhận", "Bạn có chắc muốn đăng xuất?", [
            { text: "Huỷ", style: "cancel" },
            {
                text: "Đăng xuất",
                style: "destructive",
                onPress: async () => {
                    await logout();
                    navigation.reset({
                        index: 0,
                        routes: [{ name: "Login" }]
                    });
                }
            }
        ]);
    };
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <LinearGradient
                colors={["#4f8dd6", "#3b82f6"]}
                style={styles.header}
            >
                <View>
                    <Text style={styles.greeting}>Xin chào</Text>
                    <Text style={styles.user}>
                        {user?.fullName || "Người dùng"}
                    </Text>
                    <Text style={styles.subText}>
                        {user?.tenBoPhan || ""}
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                    {/* Nút Chuông Thông Báo */}
                    <TouchableOpacity onPress={() => navigation.navigate("Notifications")}>
                        <View>
                            <Ionicons name="notifications-outline" size={28} color="#fff" />

                            {unreadCount > 0 && (
                                <View style={{
                                    position: 'absolute',
                                    top: -6,
                                    right: -6,
                                    minWidth: 18,
                                    height: 18,
                                    borderRadius: 9,
                                    backgroundColor: 'red',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    paddingHorizontal: 4
                                }}>
                                    <Text style={{
                                        color: '#fff',
                                        fontSize: 10,
                                        fontWeight: 'bold'
                                    }}>
                                        {unreadCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>

                    {/* Nút Đăng Xuất */}
                    <TouchableOpacity onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <View style={styles.content}>
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => navigation.navigate("PhieuList")}
                >
                    <View style={styles.cardLeft}>
                        <View style={[styles.iconWrap, { backgroundColor: "#dbeafe" }]}>
                            <Ionicons name="document-text-outline" size={26} color="#2563eb" />
                        </View>

                        <View style={{ marginLeft: 15 }}>
                            <Text style={styles.cardTitle}>Phiếu kiểm</Text>
                            <Text style={styles.cardSub}>
                                Danh sách & thực hiện kiểm
                            </Text>
                        </View>
                    </View>

                    <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.card}
                    onPress={() => navigation.navigate("BienBanList")}
                >
                    <View style={styles.cardLeft}>
                        <View style={[styles.iconWrap, { backgroundColor: "#dcfce7" }]}>
                            <Ionicons name="clipboard-outline" size={26} color="#16a34a" />
                        </View>

                        <View style={{ marginLeft: 15 }}>
                            <Text style={styles.cardTitle}>Biên bản kiểm</Text>
                            <Text style={styles.cardSub}>
                                Theo dõi & xử lý lỗi
                            </Text>
                        </View>
                    </View>

                    <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
                </TouchableOpacity>

                {CONG_DOAN_ENABLED && user?.permissions?.includes("THUC_HIEN_KIEM") && (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => navigation.navigate("CongDoanList")}
                    >
                        <View style={styles.cardLeft}>
                            <View style={[styles.iconWrap, { backgroundColor: "#dbeafe" }]}>
                                <Ionicons name="checkmark-done-outline" size={26} color="#2563eb" />
                            </View>

                            <View style={styles.cardText}>
                                <Text style={styles.cardTitle}>Theo dõi, kiểm tra nghiệm thu công đoạn</Text>
                                <Text style={styles.cardSub}>
                                    Phiếu dùng chung theo kế hoạch trong ngày
                                </Text>
                            </View>
                        </View>

                        <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f1f5f9"
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        flexDirection: "row",
        justifyContent: "space-between"
    },
    greeting: {
        color: "#fff",
        fontSize: 15,
        opacity: 0.9
    },
    user: {
        color: "#fff",
        fontSize: 22,
        fontWeight: "bold",
        marginTop: 5
    },
    subText: {
        color: "#fff",
        marginTop: 6,
        fontSize: 13,
        opacity: 0.9
    },
    content: {
        padding: 20,
        paddingTop: 30
    },
    card: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 22,
        marginBottom: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5
    },
    cardLeft: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center"
    },
    cardText: {
        flex: 1,
        marginLeft: 15,
        paddingRight: 8
    },
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center"
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: "bold",
        color: "#0f172a"
    },
    cardSub: {
        fontSize: 13,
        color: "#64748b",
        marginTop: 4
    }
});
