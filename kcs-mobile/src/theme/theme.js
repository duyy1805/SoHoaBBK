import axios from 'axios';
import { getToken } from '../utils/auth';

const axiosClient = axios.create({
    baseURL: 'https://YOUR_API_URL/api',
    timeout: 10000
});

axiosClient.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default axiosClient;
