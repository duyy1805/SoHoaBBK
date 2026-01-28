import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveToken = async (token) => {
    await AsyncStorage.setItem('token', token);
};

export const getToken = async () => {
    return AsyncStorage.getItem('token');
};

export const logout = async () => {
    await AsyncStorage.removeItem('token');
};
