// src/api/axiosClient.js

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const axiosClient = axios.create({
    baseURL: "http://192.168.88.3:5001/api", // ⚠ đổi thành IP máy chạy server
    timeout: 10000
});

axiosClient.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

export default axiosClient;