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

export const updateMoTaChung = (data) => {
    return axiosClient.post("/bien-ban/update-mo-ta", data);
};

/* ================================
   Danh sách user có thể xử lý
================================ */

export const getAssignableUsers = (bienBanId, boPhanId) => {
    return axiosClient.get(`/bien-ban/${bienBanId}/assign-users`, {
        params: { boPhanId }
    });
};

/* ================================
   Phân công xử lý
================================ */

export const assignDepartments = (bienBanId, boPhanIds) => {
    return axiosClient.post(`/bien-ban/${bienBanId}/assign`, {
        boPhanIds
    });
};

export const confirmAssign = (bienBanId) => {
    return axiosClient.post(`/bien-ban/${bienBanId}/confirm-assign`);
};

export const assignUser = (bienBanId, data) => {
    return axiosClient.post(`/bien-ban/${bienBanId}/assign-user`, data);
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

export const confirmUser = (bienBanId) =>
    axiosClient.post("/bien-ban/xac-nhan", { bienBanId });

export const addHanhDong = (data) =>
    axiosClient.post("/bien-ban/hanh-dong", data);
/* ================================
   Hoàn thành biên bản
================================ */

export const completeBienBan = (bienBanId) => {
    return axiosClient.post("/bien-ban/complete", {
        bienBanId
    });
};

export const getDeNghiXuLy = () => {
    return axiosClient.get("/lookup/de-nghi-xu-ly");
};

export const getBoPhan = () => {
    return axiosClient.get("/lookup/bo-phan");
};

export const saveBienBanCustomFields = (data) => {
    return axiosClient.post("/bien-ban/custom-fields", data);
};

/* ================================
   Biên bản SXBT
================================ */
export const getBienBanSxbtDetail = (bienBanId) => {
    return axiosClient.get(`/bien-ban-sxbt/${bienBanId}`);
};

export const saveBienBanSxbtDraft = (bienBanId, data) => {
    return axiosClient.post(`/bien-ban-sxbt/${bienBanId}/save-draft-by-tpb8`, data);
};

export const addBienBanSxbtXuLyRow = (bienBanId, data) => {
    return axiosClient.post(`/bien-ban-sxbt/${bienBanId}/xu-ly-row`, data);
};

export const confirmBienBanSxbtMucDo = (bienBanId, mucDoKhongPhuHop) => {
    return axiosClient.post(`/bien-ban-sxbt/${bienBanId}/confirm-muc-do`, {
        mucDoKhongPhuHop
    });
};

export const confirmBienBanSxbtStep = (bienBanId) => {
    return axiosClient.post(`/bien-ban-sxbt/${bienBanId}/confirm-step`);
};
