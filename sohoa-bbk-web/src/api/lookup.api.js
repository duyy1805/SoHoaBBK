import axiosClient from "./axiosClient";

export const getAssetUrl = (url) => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    const apiBase = axiosClient.defaults.baseURL || "";
    return `${apiBase.replace(/\/api\/?$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
};

/* =====================================================
   1️⃣ DANH MỤC LỖI (DEFECT)
===================================================== */

// Lấy danh sách lỗi
export const getDefectList = (params = {}) => {
    return axiosClient.get("/lookup/defect-list", { params });
};

// Thêm lỗi
export const createDefect = (data) => {
    return axiosClient.post("/lookup/defect", data);
};

// Cập nhật lỗi
export const updateDefect = (id, data) => {
    return axiosClient.put(`/lookup/defect/${id}`, data);
};

// Xoá lỗi
export const deleteDefect = (id) => {
    return axiosClient.delete(`/lookup/defect/${id}`);
};



/* =====================================================
   2️⃣ DANH MỤC NHÓM KIỂM
===================================================== */

// Lấy danh sách nhóm kiểm
export const getNhomKiemList = () => {
    return axiosClient.get("/lookup/nhom-kiem");
};

// Thêm nhóm kiểm
export const createNhomKiem = (data) => {
    return axiosClient.post("/lookup/nhom-kiem", data);
};

// Cập nhật nhóm kiểm
export const updateNhomKiem = (id, data) => {
    return axiosClient.put(`/lookup/nhom-kiem/${id}`, data);
};

// Xoá nhóm kiểm
export const deleteNhomKiem = (id) => {
    return axiosClient.delete(`/lookup/nhom-kiem/${id}`);
};



/* =====================================================
   3️⃣ DANH MỤC CHECK ITEM
===================================================== */

// Lấy check item theo nhóm
export const getCheckItemByNhom = (nhomKiemId) => {
    return axiosClient.get("/lookup/check-item", {
        params: { nhomKiemId }
    });
};

// Thêm check item
export const createCheckItem = (data) => {
    return axiosClient.post("/lookup/check-item", data);
};

// Cập nhật check item
export const updateCheckItem = (id, data) => {
    return axiosClient.put(`/lookup/check-item/${id}`, data);
};

// Xoá check item
export const deleteCheckItem = (id) => {
    return axiosClient.delete(`/lookup/check-item/${id}`);
};

export const getSanPhamList = (page = 0, pageSize = 20, keyword = "") =>
    axiosClient.get("/lookup/san-pham", {
        params: { page, pageSize, keyword }
    });
export const createSanPham = (data) =>
    axiosClient.post("/lookup/san-pham", data);

export const updateSanPham = (id, data) =>
    axiosClient.put(`/lookup/san-pham/${id}`, data);

export const deleteSanPham = (id) =>
    axiosClient.delete(`/lookup/san-pham/${id}`);

export const getSanPhamNhomKiem = (sanPhamId) =>
    axiosClient.get(`/lookup/san-pham/${sanPhamId}/nhom-kiem`);

export const createSanPhamNhomKiem = (data) =>
    axiosClient.post("/lookup/san-pham-nhom-kiem", data);

export const updateSanPhamNhomKiem = (id, data) =>
    axiosClient.put(`/lookup/san-pham-nhom-kiem/${id}`, data);

export const deleteSanPhamNhomKiem = (id) =>
    axiosClient.delete(`/lookup/san-pham-nhom-kiem/${id}`);


export const getInspectionLevelList = () => axiosClient.get("/lookup/inspection-level");

export const createInspectionLevel = (data) =>
    axiosClient.post("/lookup/inspection-level", data);

export const updateInspectionLevel = (id, data) =>
    axiosClient.put(`/lookup/inspection-level/${id}`, data);

export const deleteInspectionLevel = (id) =>
    axiosClient.delete(`/lookup/inspection-level/${id}`);

export const getInspectionLevels = () => axiosClient.get("/lookup/inspection-levels");

/* =====================================================
   4️⃣ DANH MỤC THÔNG SỐ SẢN PHẨM (KIỂM ĐẶC BIỆT)
===================================================== */

export const getSanPhamThongSo = (sanPhamId) =>
    axiosClient.get(`/lookup/san-pham/${sanPhamId}/thong-so`);

export const createSanPhamThongSo = (data) =>
    axiosClient.post("/lookup/san-pham-thong-so", data);

export const deleteSanPhamThongSo = (id) =>
    axiosClient.delete(`/lookup/san-pham-thong-so/${id}`);
