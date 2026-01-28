import axiosClient from './axiosClient';

/* ================================
   AUTH
   ================================ */

// Login
export const login = (data) => {
    return axiosClient.post('/auth/login', data);
};

/* ================================
   PHIẾU KIỂM – MOBILE
   ================================ */

/**
 * Lấy danh sách phiếu kiểm được phân cho KCS đang đăng nhập
 * API backend đề xuất:
 *   GET /phieu-kiem/my
 */
export const getMyPhieuKiem = () => {
    return axiosClient.get('/phieu-kiem/');
};

/**
 * Lấy thông tin chung phiếu kiểm
 * Dùng cho header màn hình kiểm
 *   GET /phieu-kiem/:id
 */
export const getPhieuKiemDetail = (id) => {
    return axiosClient.get(`/phieu-kiem/${id}`);
};

/**
 * Lấy tiêu chí + chỉ số + kết quả kiểm (nếu có)
 * Dùng cho màn hình kiểm
 *   GET /phieu-kiem/:id/tieu-chi
 */
export const getTieuChiChiSo = (phieuKiemId) => {
    return axiosClient.get(`/phieu-kiem/${phieuKiemId}/tieu-chi`);
};

/**
 * Lưu kết quả kiểm từng chỉ số (LƯU TẠM)
 * API backend đề xuất:
 *   POST /phieu-kiem/chi-so-ket-qua
 */
export const saveChiSoKetQua = (data) => {
    /**
     * data = {
     *   phieuKiemId,
     *   chiSoId,
     *   giaTri,
     *   dat
     * }
     */
    return axiosClient.post('/phieu-kiem/chi-so-ket-qua', data);
};

/**
 * Hoàn thành kiểm tra
 * (KCS kết luận đạt / không đạt)
 * API backend:
 *   POST /phieu-kiem/ket-luan
 */
export const ketLuanPhieuKiem = (data) => {
    /**
     * data = {
     *   phieuKiemId,
     *   ketLuan: 'Đạt' | 'Không đạt'
     * }
     */
    return axiosClient.post('/phieu-kiem/ket-luan', data);
};
