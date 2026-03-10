// src/api/bienBan.api.js

import axiosClient from "./axiosClient";

/* ================================
   Danh sách biên bản
================================ */

export const getMyBienBan = () => {
    return axiosClient.get("/bien-ban");
};

/* ================================
   Chi tiết biên bản
================================ */

export const getBienBanDetail = (id) => {
    return axiosClient.get(`/bien-ban/${id}`);
};

/* ================================
   Lỗi từ phiếu kiểm
================================ */

export const getBienBanDefects = (id) => {
    return axiosClient.get(`/bien-ban/${id}/defects`);
};

/* ================================
   Lưu thông tin biên bản
================================ */

export const updateBienBan = (data) => {
    return axiosClient.post("/bien-ban/update", data);
};

/* ================================
   Danh sách user có thể xử lý
================================ */

export const getAssignableUsers = (bienBanId) => {
    return axiosClient.get(`/bien-ban/${bienBanId}/assign-users`);
};

/* ================================
   Phân công xử lý
================================ */

export const assignUsers = (bienBanId, userIds) => {
    return axiosClient.post(`/bien-ban/${bienBanId}/assign`, {
        userIds
    });
};

export const confirmAssign = (bienBanId) => {
    return axiosClient.post(`/bien-ban/${bienBanId}/confirm-assign`);
};
/* ================================
   Thêm ý kiến xử lý
================================ */

export const addXuLy = (data) => {
    return axiosClient.post("/bien-ban/xu-ly", data);
};

/* ================================
   Thêm chi phí
================================ */

export const addChiPhi = (data) => {
    return axiosClient.post("/bien-ban/chi-phi", data);
};

/* ================================
   Hoàn thành biên bản
================================ */

export const completeBienBan = (bienBanId) => {
    return axiosClient.post("/bien-ban/complete", {
        bienBanId
    });
};