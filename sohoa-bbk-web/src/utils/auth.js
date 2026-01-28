import axiosClient from '../api/axiosClient';

/* ================================
   TOKEN STORAGE
   ================================ */

export const getToken = () => {
    return localStorage.getItem('token');
};

export const setToken = (token) => {
    localStorage.setItem('token', token);
};

export const removeToken = () => {
    localStorage.removeItem('token');
};

/* ================================
   LOGIN
   ================================ */

export const login = async (username, password) => {
    const res = await axiosClient.post('/auth/login', {
        username,
        password
    });

    if (res.data?.token) {
        setToken(res.data.token);
    }

    return res.data;
};

/* ================================
   JWT DECODE (không dùng lib)
   ================================ */

export const decodeToken = () => {
    const token = getToken();
    if (!token) return null;

    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return decoded;
    } catch (err) {
        console.error('Decode token error', err);
        return null;
    }
};

/* ================================
   USER INFO
   ================================ */

export const getCurrentUser = () => {
    const decoded = decodeToken();
    if (!decoded) return null;

    return {
        userId: decoded.userId,
        username: decoded.username,
        fullName: decoded.fullName,
        roles: decoded.roles || [],
        permissions: decoded.permissions || []
    };
};

/* ================================
   AUTH CHECK
   ================================ */

export const isAuthenticated = () => {
    return !!getToken();
};

/* ================================
   PERMISSION CHECK
   ================================ */

export const hasPermission = (permission) => {
    const user = getCurrentUser();
    if (!user) return false;

    return user.permissions.includes(permission);
};

/* ================================
   LOGOUT
   ================================ */

export const logout = () => {
    removeToken();
    window.location.href = '/login';
};
