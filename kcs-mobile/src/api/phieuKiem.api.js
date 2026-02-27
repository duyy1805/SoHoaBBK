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

/* ================================
   Lưu kết quả 1 mục kiểm
================================ */

export const saveCheckItem = (data) => {
    /*
      data = {
        checkItemId,
        ketQua,        // DAT | KHONG_DAT
        soLuongLoi,
        defects: [
          { defectType, soLuong }
        ]
      }
    */
    return axiosClient.post("/phieu-kiem/check-item", data);
};

/* ================================
   Complete phiếu
================================ */

export const completePhieuKiem = (phieuKiemId) => {
    return axiosClient.post("/phieu-kiem/complete", {
        phieuKiemId
    });
};