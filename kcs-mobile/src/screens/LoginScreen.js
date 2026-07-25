// src/screens/LoginScreen.jsx

import { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import KeyboardFormScrollView from "../components/KeyboardFormScrollView";
import { Checkbox } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginApi } from "../api/auth.api";
import { saveAuth } from "../utils/auth";

export default function LoginScreen({ navigation }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadRememberedUser = async () => {
            const savedUser = await AsyncStorage.getItem("rememberedUsername");
            if (savedUser) {
                setUsername(savedUser);
                setRememberMe(true);
            }
        };
        loadRememberedUser();
    }, []);

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
            return;
        }

        try {
            setLoading(true);

            const res = await loginApi({ username, password });

            // Lưu thông tin Remember Me
            if (rememberMe) {
                await AsyncStorage.setItem("rememberedUsername", username);
            } else {
                await AsyncStorage.removeItem("rememberedUsername");
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
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <KeyboardFormScrollView
                bottomOffset={32}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
            <Text style={styles.title}>AQL CHECK</Text>

            <TextInput
                placeholderTextColor="#64748b"
                placeholder="Tên đăng nhập"
                style={styles.input}
                value={username}
                onChangeText={setUsername}
            />

            <TextInput
                placeholderTextColor="#64748b"
                placeholder="Mật khẩu"
                secureTextEntry
                style={styles.input}
                value={password}
                onChangeText={setPassword}
            />
            <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRememberMe((v) => !v)}
                activeOpacity={0.7}
            >
                <Ionicons
                    name={rememberMe ? 'checkbox' : 'square-outline'}
                    size={20}
                    color="#2563eb"
                />
                <Text style={styles.rememberText}>Ghi nhớ đăng nhập</Text>
            </TouchableOpacity>
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
            </KeyboardFormScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f3f4f6"
    },
    content: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 24,
        paddingBottom: 40,
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
    rememberRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
    },
    rememberText: {
        color: "#4b5563"
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
