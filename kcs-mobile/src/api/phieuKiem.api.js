// src/api/phieuKiem.api.js

import axiosClient from "./axiosClient";

export const getAssetUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = axiosClient.defaults.baseURL || "";
  return `${apiBase.replace(/\/api\/?$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
};

/* ================================
   Lấy danh sách phiếu của KCS
================================ */

export const getMyPhieuKiem = () => {
  return axiosClient.get("/phieu-kiem/my");
};

/* ================================
   Lấy chi tiết phiếu
================================ */

export const getPhieuKiemDetail = (id) => {
  return axiosClient.get(`/phieu-kiem/${id}`);
};

export const getDefectList = (params = null) => {
  const queryParams = typeof params === "string"
    ? { defectType: params }
    : (params || {});

  return axiosClient.get("/lookup/defect-list", {
    params: queryParams
  });
};

export const updateLot = (data) => {
  return axiosClient.post("/phieu-kiem/update-lot", data);
};

export const saveCheckItem = (data) => {
  return axiosClient.post("/phieu-kiem/check-item", data);
};

export const calculateAQL = (sectionId) => {
  return axiosClient.post("phieu-kiem/calculate-aql", { sectionId });
};

export const createAllSection = (data) => {
  return axiosClient.post("/phieu-kiem/section", data);
};
/* ================================
   Complete phiếu
================================ */

export const completePhieuKiem = (phieuKiemId) => {
  return axiosClient.post("/phieu-kiem/complete", {
    phieuKiemId
  });
};

export const confirmPX = (phieuKiemId) => {
  return axiosClient.post("/phieu-kiem/xac-nhan-px", {
    phieuKiemId
  });
};

export const confirmKN = (phieuKiemId) => {
  return axiosClient.post("/phieu-kiem/xac-nhan-kiem-nghiem", {
    phieuKiemId
  });
};

export const uploadImages = (formData) => {
  return axiosClient.post("/phieu-kiem/upload", formData);
};

export const getThongSoKq = (phieuKiemId) => {
  return axiosClient.get(`/phieu-kiem/${phieuKiemId}/thong-so-kq`);
};

export const saveThongSoKq = (phieuKiemId, results) => {
  return axiosClient.post(`/phieu-kiem/${phieuKiemId}/thong-so-kq`, { results });
};

/* ================================
   Sản Xuất Bổ Trợ
================================ */

export const getBtpItems = (phieuKiemId) => {
  return axiosClient.get(`/phieu-kiem/${phieuKiemId}/btp-items`);
};

export const saveSxbtData = (data) => {
  return axiosClient.post("/phieu-kiem/sxbt-save", data);
};
export const completeSxbt = (phieuKiemId, ketLuan) => {
  return axiosClient.post("/phieu-kiem/sxbt-complete", { phieuKiemId, ketLuan });
};
