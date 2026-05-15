// src/utils/auth.js

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://z76api.z76.vn/api";

export const saveAuth = async (data) => {
    await AsyncStorage.setItem("token", data.token);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
};

export const getUser = async () => {
    const user = await AsyncStorage.getItem("user");
    return user ? JSON.parse(user) : null;
};

export const logout = async () => {
    const expoPushToken = await AsyncStorage.getItem("expoPushToken");
    const token = await AsyncStorage.getItem("token");

    if (expoPushToken && token) {
        try {
            await axios.post(
                `${API_BASE_URL}/auth/remove-push-token`,
                { token: expoPushToken },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
        } catch (e) { }
    }

    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
};
