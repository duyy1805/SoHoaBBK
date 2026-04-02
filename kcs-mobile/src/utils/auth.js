// src/utils/auth.js

import AsyncStorage from "@react-native-async-storage/async-storage";
import { removePushToken } from '../api/notification.api';

export const saveAuth = async (data) => {
    await AsyncStorage.setItem("token", data.token);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
};

export const getUser = async () => {
    const user = await AsyncStorage.getItem("user");
    return user ? JSON.parse(user) : null;
};

export const logout = async () => {
    const token = await AsyncStorage.getItem("expoPushToken");
    if (token) {
        try {
            await removePushToken(token);
        } catch (e) { }
    }
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
};