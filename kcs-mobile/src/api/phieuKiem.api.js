// src/api/phieuKiem.api.js

import axiosClient from "./axiosClient";

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

export const getDefectList = (defectType = null) => {
  return axiosClient.get("/lookup/defect-list", {
    params: defectType
      ? { defectType }
      : {}
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
  return axiosClient.post("/phieu-kiem/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};