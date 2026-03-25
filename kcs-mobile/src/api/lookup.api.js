// src/api/lookup.api.js

import axiosClient from "./axiosClient";

export const getSanPhamNhomKiem = (sanPhamId) => {
  return axiosClient.get(`/lookup/san-pham/${sanPhamId}/nhom-kiem`);
};

export const getInspectionLevels = () => {
  return axiosClient.get("/lookup/inspection-levels");
};
