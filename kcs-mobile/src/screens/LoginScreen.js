import { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    StatusBar,
    Animated,
    Dimensions
} from 'react-native';
import {
    TextInput,
    Button,
    Text,
    Checkbox,
    ActivityIndicator,
    Surface
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import axiosClient from '../api/axiosClient';
import {
    saveToken,
    saveRememberedCredentials,
    getRememberedCredentials,
    removeRememberedCredentials
} from '../utils/auth';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Animation values
    const fadeAnim = useState(new Animated.Value(0))[0];
    const slideAnim = useState(new Animated.Value(50))[0];

    useEffect(() => {
        // Load remembered credentials
        loadRememberedCredentials();

        // Start animations
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true
            })
        ]).start();
    }, []);

    const loadRememberedCredentials = async () => {
        const { username: savedUsername, password: savedPassword } = await getRememberedCredentials();
        if (savedUsername) {
            setUsername(savedUsername);
            setRememberMe(true);
        }
        if (savedPassword) {
            setPassword(savedPassword);
        }
    };

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            setError('Vui lòng nhập tài khoản và mật khẩu');
            return;
        }

        setError('');
        setLoading(true);

        try {
            // Save or remove remembered credentials
            if (rememberMe) {
                await saveRememberedCredentials(username, password);
            } else {
                await removeRememberedCredentials();
            }

            const res = await axiosClient.post('/auth/login', {
                username,
                password
            });

            await saveToken(res.data.token);
            navigation.replace('PhieuKiemList');
        } catch (err) {
            setError(
                err.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không đúng'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Gradient Background */}
            <LinearGradient
                colors={['#0f2027', '#203a43', '#2c5364']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Decorative circles */}
            <View style={styles.circle1} />
            <View style={styles.circle2} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <Animated.View
                    style={[
                        styles.formContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <Surface style={styles.card} elevation={5}>
                        {/* Gradient top bar */}
                        <LinearGradient
                            colors={['#6366f1', '#8b5cf6', '#06b6d4']}
                            style={styles.topBar}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        />

                        {/* Logo */}
                        <View style={styles.logoContainer}>
                            <LinearGradient
                                colors={['#6366f1', '#8b5cf6']}
                                style={styles.logoGradient}
                            >
                                <Text style={styles.logoText}>KCS</Text>
                            </LinearGradient>
                        </View>

                        {/* Title */}
                        <Text style={styles.title}>SoHoa BBK</Text>
                        <Text style={styles.subtitle}>Hệ thống kiểm tra chất lượng</Text>

                        {/* Divider */}
                        <View style={styles.divider} />

                        {/* Error message */}
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Username Input */}
                        <TextInput
                            label="Tên đăng nhập"
                            value={username}
                            onChangeText={setUsername}
                            style={styles.input}
                            mode="outlined"
                            left={<TextInput.Icon icon="account-outline" color="#6366f1" />}
                            outlineColor="#e2e8f0"
                            activeOutlineColor="#6366f1"
                            outlineStyle={styles.inputOutline}
                            autoCapitalize="none"
                        />

                        {/* Password Input */}
                        <TextInput
                            label="Mật khẩu"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            style={styles.input}
                            mode="outlined"
                            left={<TextInput.Icon icon="lock-outline" color="#6366f1" />}
                            right={
                                <TextInput.Icon
                                    icon={showPassword ? 'eye-off' : 'eye'}
                                    onPress={() => setShowPassword(!showPassword)}
                                    color="#94a3b8"
                                />
                            }
                            outlineColor="#e2e8f0"
                            activeOutlineColor="#6366f1"
                            outlineStyle={styles.inputOutline}
                        />

                        {/* Remember Me */}
                        <TouchableOpacity
                            style={styles.rememberContainer}
                            onPress={() => setRememberMe(!rememberMe)}
                            activeOpacity={0.7}
                        >
                            <Checkbox
                                status={rememberMe ? 'checked' : 'unchecked'}
                                onPress={() => setRememberMe(!rememberMe)}
                                color="#6366f1"
                                uncheckedColor="#94a3b8"
                            />
                            <Text style={styles.rememberText}>Ghi nhớ đăng nhập</Text>
                        </TouchableOpacity>

                        {/* Login Button */}
                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.8}
                            style={styles.buttonWrapper}
                        >
                            <LinearGradient
                                colors={loading ? ['#94a3b8', '#cbd5e1'] : ['#6366f1', '#8b5cf6']}
                                style={styles.loginButton}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text style={styles.buttonText}>Đăng nhập</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Footer */}
                        <Text style={styles.footer}>© 2026 SoHoa BBK. Hệ thống KCS</Text>
                    </Surface>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f2027'
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
    },
    circle1: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        top: -100,
        right: -100
    },
    circle2: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(6, 182, 212, 0.15)',
        bottom: -50,
        left: -50
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'center'
    },
    formContainer: {
        paddingHorizontal: 24
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 20,
        paddingHorizontal: 24,
        paddingBottom: 24,
        paddingTop: 0,
        overflow: 'hidden'
    },
    topBar: {
        height: 4,
        marginHorizontal: -24,
        marginBottom: 24
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 12
    },
    logoGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8
    },
    logoText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff'
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
        color: '#1e293b',
        marginBottom: 4
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        color: '#64748b',
        marginBottom: 16
    },
    divider: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginBottom: 20
    },
    errorContainer: {
        backgroundColor: '#fef2f2',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#fecaca'
    },
    errorText: {
        color: '#dc2626',
        textAlign: 'center',
        fontSize: 14
    },
    input: {
        marginBottom: 16,
        backgroundColor: '#ffffff'
    },
    inputOutline: {
        borderRadius: 12
    },
    rememberContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        marginLeft: -8
    },
    rememberText: {
        color: '#64748b',
        fontSize: 14
    },
    buttonWrapper: {
        marginBottom: 20
    },
    loginButton: {
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 8
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600'
    },
    footer: {
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 12
    }
});
