import axios from 'axios';
import { getToken, removeToken } from '../utils/auth';
const axiosClient = axios.create({
    // baseURL: "https://z76api.z76.vn/api",
    baseURL: "http://localhost:5001/api",
    timeout: 15000
});

// Gắn token vào header
axiosClient.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Xử lý response lỗi
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const url = error.config?.url;
        // ⭐ chỉ redirect khi KHÔNG phải login
        if (status === 401 && !url?.includes('/auth/login')) {
            removeToken();
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default axiosClient;
