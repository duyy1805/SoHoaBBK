import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import axiosClient from '../api/axiosClient';
import { saveToken } from '../utils/auth';

export default function LoginScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        const res = await axiosClient.post('/auth/login', {
            username,
            password
        });

        await saveToken(res.data.token);
        navigation.replace('PhieuKiemList');
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineMedium">KCS Login</Text>

            <TextInput
                label="Tài khoản"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
            />

            <TextInput
                label="Mật khẩu"
                value={password}
                secureTextEntry
                onChangeText={setPassword}
                style={styles.input}
            />

            <Button mode="contained" onPress={handleLogin}>
                Đăng nhập
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 24
    },
    input: {
        marginBottom: 12
    }
});
