import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    StatusBar
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getUser, logout } from "../utils/auth";

export default function HomeScreen({ navigation }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadUser();
    }, []);

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

                <TouchableOpacity onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={28} color="#fff" />
                </TouchableOpacity>
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
        flexDirection: "row",
        alignItems: "center"
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