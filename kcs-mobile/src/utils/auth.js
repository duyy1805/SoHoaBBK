// src/utils/auth.js

import AsyncStorage from "@react-native-async-storage/async-storage";

export const saveAuth = async (data) => {
    await AsyncStorage.setItem("token", data.token);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
};

export const getUser = async () => {
    const user = await AsyncStorage.getItem("user");
    return user ? JSON.parse(user) : null;
};

export const logout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
};