// src/screens/LoginScreen.jsx

import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator
} from "react-native";
import { loginApi } from "../api/auth.api";
import { saveAuth } from "../utils/auth";

export default function LoginScreen({ navigation }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
            return;
        }

        try {
            setLoading(true);

            const res = await loginApi({ username, password });

            // Chỉ cho KCS đăng nhập app
            if (!res.data.user.permissions.includes("THUC_HIEN_KIEM")) {
                Alert.alert("Không có quyền", "Tài khoản không được phép dùng app kiểm");
                return;
            }

            await saveAuth(res.data);

            navigation.replace("Home");
        } catch (err) {
            Alert.alert("Đăng nhập thất bại", "Sai tài khoản hoặc mật khẩu");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>AQL CHECK</Text>

            <TextInput
                placeholder="Tên đăng nhập"
                style={styles.input}
                value={username}
                onChangeText={setUsername}
            />

            <TextInput
                placeholder="Mật khẩu"
                secureTextEntry
                style={styles.input}
                value={password}
                onChangeText={setPassword}
            />

            <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Đăng nhập</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#f3f4f6"
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 32,
        textAlign: "center"
    },
    input: {
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 10,
        marginBottom: 16
    },
    button: {
        backgroundColor: "#2563eb",
        padding: 16,
        borderRadius: 10,
        alignItems: "center"
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold"
    }
});