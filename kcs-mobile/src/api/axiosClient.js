// src/api/axiosClient.js

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logout } from "../utils/auth";
import { navigationRef } from "../navigation/navigationRef";
import Toast from "react-native-toast-message";

const axiosClient = axios.create({
    // baseURL: "https://z76api.z76.vn/api", // ⚠ đổi thành IP máy chạy server
    baseURL: "http://localhost:5001/api",
    timeout: 30000
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

axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { response, config } = error;

        if (response && response.status === 401) {
            // Không auto logout nếu là request login
            if (config.url && config.url.includes("/auth/login")) {
                return Promise.reject(error);
            }

            // Auto logout khi token hết hạn
            await logout();
            Toast.show({
                type: "error",
                text1: "Hết hạn phiên đăng nhập",
                text2: "Vui lòng đăng nhập lại",
            });

            if (navigationRef.isReady()) {
                navigationRef.reset({
                    index: 0,
                    routes: [{ name: "Login" }],
                });
            }
        }
        return Promise.reject(error);
    }
);

export default axiosClient;