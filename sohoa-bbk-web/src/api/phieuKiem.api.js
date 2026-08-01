import axiosClient from "./axiosClient";

export const getAssetUrl = (url) => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    const apiBase = axiosClient.defaults.baseURL || "";
    return `${apiBase.replace(/\/api\/?$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
};


// Lấy danh sách sản phẩm
export const getSanPhamLookup = () => {
    return axiosClient.get("/lookup/san-pham");
};

// Lấy danh sách loại kiểm
export const getLoaiKiemLookup = () => {
    return axiosClient.get("/lookup/loai-kiem");
};

// Lấy danh sách KCS
export const getKCSLookup = () => {
    return axiosClient.get("/lookup/kcs");
};
/* =========================================================
   DANH SÁCH & CHI TIẾT
========================================================= */

// Danh sách phiếu kiểm
export const getPhieuKiemList = (params) => {
    return axiosClient.get("/phieu-kiem/my", { params });
};

export const getPhieuKiem = () => {
    return axiosClient.get("/phieu-kiem/my");
};

// Chi tiết phiếu kiểm
export const getPhieuKiemDetail = (id) => {
    return axiosClient.get(`/phieu-kiem/${id}`);
};

export const deletePhieuKiem = (id) => {
    return axiosClient.delete(`/phieu-kiem/${id}`);
};

const normalizeCreatePayload = (data = {}) => ({
    ...data,
    doiTuong: data.doiTuong == null ? "" : String(data.doiTuong),
});

export const createPhieuKiem = (data) => {
    return axiosClient.post("/phieu-kiem/create", normalizeCreatePayload(data));
};

export const createPhieuKiemSXBT = (data) => {
    return axiosClient.post("/phieu-kiem/create-sxbt", normalizeCreatePayload(data));
};

export const getLichDongContChuaKiem = () =>
    axiosClient.get("/phieu-kiem/lich-dong-cont/chua-kiem");

// ESAM lịch đóng cont
export const getLichDongCont = (params) => {
    return axiosClient.get("/hr/lich-dong-cont", { params });
};

// danh sách đã kiểm
export const getSourceChecked = (params) => {
    return axiosClient.get("/phieu-kiem/source-checked", { params });
};

export const getChungTuNhapChuaKiem = () =>
    axiosClient.get("/phieu-kiem/chung-tu-nhap/chua-kiem");

export const getKeHoachSanXuatChuaKiem = () =>
    axiosClient.get("/phieu-kiem/ke-hoach-san-xuat/chua-kiem");

export const getPhieuNhapBTPChuaKiem = () =>
    axiosClient.get("/phieu-kiem/phieu-nhap-btp/chua-kiem");

export const getKeHoachNhapBTPChuaKiem = () =>
    axiosClient.get("/phieu-kiem/ke-hoach-nhap-btp/chua-kiem");
/* =========================================================
   PHÂN BỔ (TO_TRUONG_KCS)
========================================================= */

export const phanBoPhieuKiem = (data) => {
    return axiosClient.post("/phieu-kiem/phan-bo", data);
};


/* =========================================================
   THỰC HIỆN KIỂM (KCS)
========================================================= */

// Tạo section + load AQL + clone checklist
export const createAllSection = (data) => {
    return axiosClient.post("/phieu-kiem/section", data);
};

// Lưu kết quả check item
export const saveCheckItem = (data) => {
    return axiosClient.post("/phieu-kiem/check-item", data);
};

export const uploadInspectionImages = (files = []) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    return axiosClient.post("/phieu-kiem/upload", formData, {
        timeout: 120000
    });
};

// Tính AQL
export const calculateAQL = (sectionId) => {
    return axiosClient.post("/phieu-kiem/calculate-aql", { sectionId });
};

// Hoàn tất phiếu kiểm
export const completePhieuKiem = (phieuKiemId) => {
    return axiosClient.post("/phieu-kiem/complete", { phieuKiemId });
};

export const confirmPX = (phieuKiemId) => {
    return axiosClient.post("/phieu-kiem/xac-nhan-px", { phieuKiemId });
};

export const confirmKN = (phieuKiemId) => {
    return axiosClient.post("/phieu-kiem/xac-nhan-kiem-nghiem", { phieuKiemId });
};

export const completeSxbt = (phieuKiemId, ketLuan) => {
    return axiosClient.post("/phieu-kiem/sxbt-complete", { phieuKiemId, ketLuan });
};

export const splitCompleteSxbt = (phieuKiemId, lotRows) => {
    return axiosClient.post("/phieu-kiem/sxbt/split-complete", { phieuKiemId, lotRows });
};

export const confirmSxbt = (phieuKiemId) => {
    return axiosClient.post("/phieu-kiem/sxbt/confirm-sxbt", { phieuKiemId });
};

export const confirmKhoSxbt = (phieuKiemId, lotRows) => {
    return axiosClient.post("/phieu-kiem/sxbt/confirm-kho", { phieuKiemId, lotRows });
};

export const saveSxbtData = (data) => {
    return axiosClient.post("/phieu-kiem/sxbt-save", data);
};

export const saveTrenChuyenData = (data) => {
    return axiosClient.post("/phieu-kiem/tren-chuyen/save", data);
};

export const completeTrenChuyen = (phieuKiemId, ketLuan) => {
    return axiosClient.post("/phieu-kiem/tren-chuyen/complete", { phieuKiemId, ketLuan });
};

export const updatePhieuKiemActualQuantity = (id, soLuongThucTe) =>
    axiosClient.patch(`/phieu-kiem/${id}/actual-quantity`, { soLuongThucTe });

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

/* =========================================================
   PHIẾU KIỂM CÔNG ĐOẠN
========================================================= */

export const getCongDoanPhieuList = (params) =>
    axiosClient.get("/phieu-kiem/cong-doan", { params });

export const createCongDoanPhieu = (data) =>
    axiosClient.post("/phieu-kiem/cong-doan", data);

export const getCongDoanPhieuDetail = (id) =>
    axiosClient.get(`/phieu-kiem/cong-doan/${id}`);

export const getCongDoanPlans = (date, phieuKiemId) =>
    axiosClient.get("/phieu-kiem/cong-doan/plans", { params: { date, phieuKiemId } });

export const addCongDoanPlan = (id, idKeHoachSanXuat) =>
    axiosClient.post(`/phieu-kiem/cong-doan/${id}/plans`, { idKeHoachSanXuat });

export const updateCongDoanPlan = (id, planId, data) =>
    axiosClient.put(`/phieu-kiem/cong-doan/${id}/plans/${planId}`, data);

export const saveCongDoanDefects = (id, planId, data) =>
    axiosClient.put(`/phieu-kiem/cong-doan/${id}/plans/${planId}/defects`, data);

export const deleteCongDoanPlan = (id, planId) =>
    axiosClient.delete(`/phieu-kiem/cong-doan/${id}/plans/${planId}`);

export const completeCongDoanPhieu = (id, ketLuan) =>
    axiosClient.post(`/phieu-kiem/cong-doan/${id}/complete`, { ketLuan });

export const approveCongDoanPhieu = (id) =>
    axiosClient.post(`/phieu-kiem/cong-doan/${id}/approve`);

export const createCongDoanBienBan = (id) =>
    axiosClient.post(`/phieu-kiem/cong-doan/${id}/create-bien-ban`);

export const deleteCongDoanPhieu = (id) =>
    axiosClient.delete(`/phieu-kiem/cong-doan/${id}`);

/* =========================================================
   KẾT LUẬN (TP_B8 / LANH_DAO)
========================================================= */

export const ketLuanPhieuKiem = (data) => {
    return axiosClient.post("/phieu-kiem/ket-luan", data);
};

// Thêm API lưu field động
export const saveCustomFields = (data) => {
    return axiosClient.post("/phieu-kiem/custom-fields", data);
};

export const getThongSoKq = (phieuKiemId) => {
    return axiosClient.get(`/phieu-kiem/${phieuKiemId}/thong-so-kq`);
};

export const saveThongSoKq = (phieuKiemId, results) => {
    return axiosClient.post(`/phieu-kiem/${phieuKiemId}/thong-so-kq`, { results });
};
