import axios from 'axios';
import { getToken, removeToken } from '../utils/auth';
import { getApiBaseUrl, getTenant } from '../config/tenant';

const axiosClient = axios.create({
    timeout: 15000
});

// Gắn token vào header
axiosClient.interceptors.request.use(
    (config) => {
        const tenant = getTenant();
        config.baseURL = getApiBaseUrl(tenant);
        config.headers['X-App-Tenant'] = tenant;
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
