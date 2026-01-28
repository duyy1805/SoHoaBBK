import axiosClient from './axiosClient';

/* ================================
   BIÊN BẢN KIỂM
   ================================ */

// Lập biên bản
export const lapBienBan = (data) => {
    /**
     * data = {
     *   phieuKiemId,
     *   loaiTrachNhiem,
     *   moTaLoi
     * }
     */
    return axiosClient.post('/bien-ban/lap', data);
};

// Lấy danh sách biên bản (sau này dùng)
export const getBienBanList = (params = {}) => {
    return axiosClient.get('/bien-ban', { params });
};

// Lấy chi tiết biên bản
export const getBienBanDetail = (id) => {
    return axiosClient.get(`/bien-ban/${id}`);
};
