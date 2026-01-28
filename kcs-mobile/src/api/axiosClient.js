import axios from 'axios';
import { getToken } from '../utils/auth';

const axiosClient = axios.create({
    baseURL: 'http://192.168.89.68:5001/api',
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
