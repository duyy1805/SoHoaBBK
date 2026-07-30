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

export const getAssignableUsers = (bienBanId) => {
    return axiosClient.get(`/bien-ban/${bienBanId}/assign-users`);
};

export const getAssignableUsersByDepartment = (bienBanId, boPhanId) => {
    const query = boPhanId ? `?boPhanId=${boPhanId}` : "";
    return axiosClient.get(`/bien-ban/${bienBanId}/assign-users${query}`);
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

export const confirmOpinionDepartments = (bienBanId, boPhanIds) =>
    axiosClient.post(`/bien-ban/${bienBanId}/opinion-departments/confirm`, { boPhanIds });

export const respondSpecialistOpinion = (bienBanId, opinionId, data) =>
    axiosClient.post(`/bien-ban/${bienBanId}/specialist-opinions/${opinionId}/respond`, data);

export const confirmKphByCreatorDepartment = (bienBanId) =>
    axiosClient.post(`/bien-ban/${bienBanId}/creator-confirm`);

export const updateKphRequirements = (bienBanId, data) =>
    axiosClient.patch(`/bien-ban/${bienBanId}/requirements`, data);

export const assignUserToDepartment = (bienBanId, data) => {
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

/* ================================
   Biên bản SXBT
================================ */
export const getBienBanSxbtDetail = (bienBanId) => {
    return axiosClient.get(`/bien-ban-sxbt/${bienBanId}`);
};

export const saveBienBanSxbtDraftByTPB8 = (bienBanId, data) => {
    return axiosClient.post(`/bien-ban-sxbt/${bienBanId}/save-draft-by-tpb8`, data);
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

export const submitBienBanSxbt = (bienBanId) => {
    return axiosClient.post(`/bien-ban-sxbt/${bienBanId}/submit`);
};

export const confirmBienBanSxbtStep = (bienBanId) => {
    return axiosClient.post(`/bien-ban-sxbt/${bienBanId}/confirm-step`);
};

export const completeBienBanSxbt = (bienBanId) => {
    return axiosClient.post(`/bien-ban-sxbt/${bienBanId}/complete`);
};
