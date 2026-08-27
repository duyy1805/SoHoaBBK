// src/api/bienBan.api.js

import axiosClient from "./axiosClient";

/* ================================
   Danh sách biên bản
================================ */

export const getMyBienBan = () => {
    return axiosClient.get("/bien-ban");
};

export const getStandaloneBienBanList = () => {
    return axiosClient.get("/phieu-xu-ly-khong-phu-hop");
};

export const createStandaloneBienBan = () => {
    return axiosClient.post("/phieu-xu-ly-khong-phu-hop");
};

/* ================================
   Chi tiết biên bản
================================ */

export const getBienBanDetail = (id) => {
    return axiosClient.get(`/bien-ban/${id}`);
};

export const getStandaloneBienBanDetail = (id) => {
    return axiosClient.get(`/phieu-xu-ly-khong-phu-hop/${id}`);
};

export const searchStandaloneCatalogItems = (params = {}) =>
    axiosClient.get("/phieu-xu-ly-khong-phu-hop/catalog-items", { params });

export const searchStandaloneOrders = (params = {}) =>
    axiosClient.get("/phieu-xu-ly-khong-phu-hop/orders", { params });

/* ================================
   Lỗi từ phiếu kiểm
================================ */

export const getBienBanDefects = (id) => {
    return axiosClient.get(`/bien-ban/${id}/defects`);
};

export const saveBienBanDefects = (bienBanId, defects) =>
    axiosClient.post(`/bien-ban/${bienBanId}/defects`, { defects });

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

export const assignDepartments = (bienBanId, boPhanIds, bpsxSignatureBoPhanId = null) => {
    return axiosClient.post(`/bien-ban/${bienBanId}/assign`, {
        boPhanIds,
        bpsxSignatureBoPhanId
    });
};

export const saveRecipientDepartments = (bienBanId, boPhanIds) =>
    axiosClient.post(`/bien-ban/${bienBanId}/recipient-departments`, { boPhanIds });

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

export const confirmUser = (bienBanId, boPhanId = null) =>
    axiosClient.post("/bien-ban/xac-nhan", { bienBanId, ...(boPhanId ? { boPhanId } : {}) });

export const updateKphRequirements = (bienBanId, data) =>
    axiosClient.patch(`/bien-ban/${bienBanId}/requirements`, data);

export const confirmOpinionDepartments = (bienBanId, boPhanIds) =>
    axiosClient.post(`/bien-ban/${bienBanId}/opinion-departments/confirm`, { boPhanIds });

export const confirmKphByCreatorDepartment = (bienBanId) =>
    axiosClient.post(`/bien-ban/${bienBanId}/creator-confirm`);

export const addHanhDong = (data) =>
    axiosClient.post("/bien-ban/hanh-dong", data);

export const updateOwnedSectionRow = (section, rowId, data) =>
    axiosClient.patch(`/bien-ban/section-rows/${section}/${rowId}`, data);

export const deleteOwnedSectionRow = (section, rowId) =>
    axiosClient.delete(`/bien-ban/section-rows/${section}/${rowId}`);
/* ================================
   Hoàn thành biên bản
================================ */

export const completeBienBan = (bienBanId) => {
    return axiosClient.post("/bien-ban/complete", {
        bienBanId
    });
};

export const saveSpecialistOpinionDraft = (bienBanId, opinionId, data) =>
    axiosClient.put(`/bien-ban/${bienBanId}/specialist-opinions/${opinionId}/draft`, data);

export const confirmSpecialistOpinion = (bienBanId, opinionId) =>
    axiosClient.post(`/bien-ban/${bienBanId}/specialist-opinions/${opinionId}/confirm`);

export const returnSpecialistOpinion = (bienBanId, opinionId, reason) =>
    axiosClient.post(`/bien-ban/${bienBanId}/specialist-opinions/${opinionId}/return`, { reason });

export const resubmitKphReview = (bienBanId) =>
    axiosClient.post(`/bien-ban/${bienBanId}/resubmit`);

export const saveFollowUpEvaluation = (bienBanId, data) => {
    return axiosClient.post(`/bien-ban/${bienBanId}/follow-up-evaluation`, data);
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

export const saveStandaloneBienBanHeader = (bienBanId, data) => {
    return axiosClient.post(`/phieu-xu-ly-khong-phu-hop/${bienBanId}/header`, data);
};

export const saveStandaloneBienBanDefects = (bienBanId, defects) => {
    return axiosClient.post(`/phieu-xu-ly-khong-phu-hop/${bienBanId}/defects`, { defects });
};

export const deleteStandaloneBienBan = (bienBanId) => {
    return axiosClient.delete(`/phieu-xu-ly-khong-phu-hop/${bienBanId}`);
};

export const deleteBienBan = (bienBanId) => {
    return axiosClient.delete(`/bien-ban/${bienBanId}`);
};

/* ================================
   File đính kèm biên bản
================================ */
export const getBienBanAttachments = (bienBanId) =>
    axiosClient.get(`/bien-ban/${bienBanId}/attachments`);

export const uploadBienBanAttachments = (bienBanId, files = []) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    return axiosClient.post(`/bien-ban/${bienBanId}/attachments`, formData, {
        timeout: 120000
    });
};

export const downloadBienBanAttachment = (bienBanId, attachmentId) =>
    axiosClient.get(`/bien-ban/${bienBanId}/attachments/${attachmentId}/download`, {
        responseType: "blob",
        timeout: 120000
    });

export const deleteBienBanAttachment = (bienBanId, attachmentId) =>
    axiosClient.delete(`/bien-ban/${bienBanId}/attachments/${attachmentId}`);

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
