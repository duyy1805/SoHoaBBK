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
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
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
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem("user", JSON.stringify(res.data.user));
    }

    return res.data;
};


/* ================================
   JWT DECODE (không dùng lib)
   ================================ */
export const isTokenExpired = () => {
    const decoded = decodeToken();
    if (!decoded?.exp) return true;

    const now = Date.now() / 1000; // seconds
    return decoded.exp < now;
};

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

// export const getCurrentUser = () => {
//     const decoded = decodeToken();
//     if (!decoded) return null;

//     return {
//         userId: decoded.userId,
//         username: decoded.username,
//         fullName: decoded.fullName,
//         roles: decoded.roles || [],
//         permissions: decoded.permissions || []
//     };
// };
export const getCurrentUser = () => {
    const userStr =
        localStorage.getItem("user") ||
        sessionStorage.getItem("user");

    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
};

/* ================================
   AUTH CHECK
   ================================ */

export const isAuthenticated = () => {
    const token = getToken();
    if (!token) return false;

    if (isTokenExpired()) {
        removeToken();
        return false;
    }

    return true;
};

/* ================================
   PERMISSION CHECK
   ================================ */

export const hasPermission = (permission) => {
    const user = getCurrentUser();
    if (!user) return false;

    return user.permissions.includes(permission);
};

export const canManageUsers = (user = getCurrentUser()) => {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
    return roles.some((role) => String(role || "").toUpperCase() === "ADMIN")
        || permissions.includes("QUAN_TRI_NGUOI_DUNG");
};

export const canManageCheckCatalog = (user = getCurrentUser()) => {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
    return roles.some((role) => {
        const roleCode = String(role || "").toUpperCase();
        return roleCode === "ADMIN" || roleCode === "IMPORT_DM_KIEM";
    })
        || permissions.includes("QUAN_TRI_DM")
        || permissions.includes("IMPORT_DM_KIEM");
};

/* ================================
   LOGOUT
   ================================ */

export const logout = () => {
    removeToken();
    window.location.href = '/login';
};
