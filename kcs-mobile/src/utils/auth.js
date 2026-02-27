import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'token';
const REMEMBERED_USERNAME_KEY = 'rememberedUsername';

/* ================================
   TOKEN STORAGE
   ================================ */

export const saveToken = async (token) => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getToken = async () => {
    return AsyncStorage.getItem(TOKEN_KEY);
};

export const removeToken = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
};

/* ================================
   REMEMBER ME (Username + Password)
   ================================ */

export const saveRememberedCredentials = async (username, password) => {
    await AsyncStorage.setItem(REMEMBERED_USERNAME_KEY, username);
    await AsyncStorage.setItem('rememberedPassword', password);
};

export const getRememberedCredentials = async () => {
    const username = await AsyncStorage.getItem(REMEMBERED_USERNAME_KEY);
    const password = await AsyncStorage.getItem('rememberedPassword');
    return { username, password };
};

export const removeRememberedCredentials = async () => {
    await AsyncStorage.removeItem(REMEMBERED_USERNAME_KEY);
    await AsyncStorage.removeItem('rememberedPassword');
};

/* ================================
   LOGOUT
   ================================ */

export const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
};
