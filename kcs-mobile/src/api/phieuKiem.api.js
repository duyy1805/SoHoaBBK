// src/api/phieuKiem.api.js

import axiosClient from "./axiosClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

export const deletePhieuKiem = (id) => {
  return axiosClient.delete(`/phieu-kiem/${id}`);
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

export const saveCustomFields = (data) => {
  return axiosClient.post("/phieu-kiem/custom-fields", data);
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
    timeout: 120000
  });
};

export const uploadImagesWithXhr = async (formData) => {
  const token = await AsyncStorage.getItem("token");
  const apiBase = axiosClient.defaults.baseURL || "";

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${apiBase}/phieu-kiem/upload`);
    xhr.timeout = 120000;

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.onload = () => {
      const responseText = xhr.responseText || "{}";
      let data = {};

      try {
        data = JSON.parse(responseText);
      } catch {
        reject(new Error(responseText || "Upload response is not valid JSON"));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ data });
      } else {
        reject(new Error(data.message || `Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.ontimeout = () => reject(new Error("Upload timeout"));
    xhr.send(formData);
  });
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

export const confirmSxbt = (phieuKiemId) => {
  return axiosClient.post("/phieu-kiem/sxbt/confirm-sxbt", { phieuKiemId });
};

export const confirmKhoSxbt = (phieuKiemId, lotRows) => {
  return axiosClient.post("/phieu-kiem/sxbt/confirm-kho", { phieuKiemId, lotRows });
};

export const saveTrenChuyenData = (data) => {
  return axiosClient.post("/phieu-kiem/tren-chuyen/save", data);
};

export const completeTrenChuyen = (phieuKiemId, ketLuan) => {
  return axiosClient.post("/phieu-kiem/tren-chuyen/complete", { phieuKiemId, ketLuan });
};

export const createTrenChuyenBienBan = (phieuKiemId) => {
  return axiosClient.post("/phieu-kiem/tren-chuyen/create-bien-ban", { phieuKiemId });
};

export const deleteTrenChuyenEntry = (entryId) => {
  return axiosClient.delete(`/phieu-kiem/tren-chuyen/entry/${entryId}`);
};

export const approveTrenChuyen = (phieuKiemId) => {
  return axiosClient.post("/phieu-kiem/tren-chuyen/approve", { phieuKiemId });
};

export const saveCuoiChuyenData = (data) => {
  return axiosClient.post("/phieu-kiem/cuoi-chuyen/save", data);
};

export const completeCuoiChuyen = (phieuKiemId, ketLuan) => {
  return axiosClient.post("/phieu-kiem/cuoi-chuyen/complete", { phieuKiemId, ketLuan });
};

export const createCuoiChuyenBienBan = (phieuKiemId) => {
  return axiosClient.post("/phieu-kiem/cuoi-chuyen/create-bien-ban", { phieuKiemId });
};

export const approveCuoiChuyen = (phieuKiemId) => {
  return axiosClient.post("/phieu-kiem/cuoi-chuyen/approve", { phieuKiemId });
};
