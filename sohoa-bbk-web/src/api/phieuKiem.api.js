import axiosClient from './axiosClient';

/* ================================
   PHIẾU KIỂM – WEB
   ================================ */

// Lấy danh sách phiếu kiểm (web)
export const getPhieuKiemList = (params = {}) => {
    return axiosClient.get('/phieu-kiem', { params });
};

// Lấy chi tiết phiếu kiểm
export const getPhieuKiemDetail = (id) => {
    return axiosClient.get(`/phieu-kiem/${id}`);
};

// Phân bổ phiếu kiểm (Tổ trưởng)
export const phanBoPhieuKiem = (data) => {
    return axiosClient.post('/phieu-kiem/phan-bo', data);
};

/* ================================
   MOBILE – KIỂM TRA
   ================================ */

// Lấy tiêu chí + chỉ số theo phiếu kiểm
export const getTieuChiChiSo = (phieuKiemId) => {
    return axiosClient.get(`/phieu-kiem/${phieuKiemId}/tieu-chi`);
};

// Lưu kết quả 1 chỉ số kiểm
export const saveKQChiSo = (data) => {
    /**
     * data = {
     *   phieuKiemId,
     *   chiSoId,
     *   giaTri,
     *   dat
     * }
     */
    return axiosClient.post('/phieu-kiem/kq-chi-so', data);
};

// KCS kết luận phiếu kiểm
export const ketLuanPhieuKiem = (data) => {
    /**
     * data = {
     *   phieuKiemId,
     *   ketLuan: 'Đạt' | 'Không đạt'
     * }
     */
    return axiosClient.post('/phieu-kiem/ket-luan', data);
};
