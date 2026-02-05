import axiosClient from '../api/axiosClient';

/* ================================
   TOKEN STORAGE
   ================================ */

export const getToken = () => {
    // Check both storage locations
    return localStorage.getItem('token') || sessionStorage.getItem('token');
};

export const setToken = (token, rememberMe = true) => {
    if (rememberMe) {
        localStorage.setItem('token', token);
        sessionStorage.removeItem('token');
    } else {
        sessionStorage.setItem('token', token);
        localStorage.removeItem('token');
    }
};

export const removeToken = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
};

/* ================================
   LOGIN
   ================================ */

export const login = async (username, password, rememberMe = true) => {
    const res = await axiosClient.post('/auth/login', {
        username,
        password
    });

    if (res.data?.token) {
        setToken(res.data.token, rememberMe);
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
