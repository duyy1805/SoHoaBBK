import axiosClient from "./axiosClient";


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

export const createPhieuKiem = (data) => {
    return axiosClient.post("/phieu-kiem/create", data);
};

export const createPhieuKiemSXBT = (data) => {
    return axiosClient.post("/phieu-kiem/create-sxbt", data);
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
