export const DOI_TRA_STATUS_META = {
    TAO_MOI: { label: 'Phiếu nháp', color: 'default', step: 0 },
    DANG_KIEM: { label: 'KCS đang kiểm', color: 'primary', step: 0 },
    CHO_TBP_KCS_XAC_NHAN: { label: 'Chờ TBP KCS xác nhận', color: 'secondary', step: 1 },
    TRA_LAI_KCS: { label: 'Trả lại KCS', color: 'warning', step: 0 },
    CHO_B7_NHAP_DINH_MUC: { label: 'Chờ B7 nhập định mức', color: 'info', step: 2 },
    HOAN_TAT_DINH_MUC: { label: 'Hoàn tất định mức', color: 'success', step: 3 },
    CHO_THIET_LAP_KPH: { label: 'Chờ thiết lập xử lý KPH', color: 'info', step: 2 },
    CHO_Y_KIEN_KPH: { label: 'Chờ ý kiến phòng ban', color: 'warning', step: 3 },
    CHO_XAC_NHAN_CUOI_KPH: { label: 'Chờ TBP bộ phận lập xác nhận', color: 'secondary', step: 4 },
    CHO_BGD_XAC_NHAN: { label: 'Chờ Ban giám đốc xác nhận', color: 'secondary', step: 5 },
    CHO_THEO_DOI: { label: 'Chờ theo dõi đánh giá', color: 'warning', step: 6 },
    KPH_HOAN_TAT_CHO_B7: { label: 'KPH hoàn tất, chờ B7', color: 'info', step: 7 },
    HOAN_TAT: { label: 'Hoàn tất', color: 'success', step: 8 },
    DA_HUY: { label: 'Đã hủy', color: 'error', step: 0 }
};

export const doiTraStatusMeta = (status) =>
    DOI_TRA_STATUS_META[status] || { label: status || 'Không xác định', color: 'default', step: 0 };

export const DOI_TRA_DINH_MUC_STATUS_META = {
    CHUA_NHAP: { label: 'B7 chưa nhập', color: 'default' },
    DANG_NHAP: { label: 'B7 đang nhập', color: 'info' },
    DA_XAC_NHAN: { label: 'B7 đã xác nhận', color: 'success' },
    CAN_XAC_NHAN_LAI: { label: 'Cần B7 xác nhận lại', color: 'warning' }
};

export const doiTraDinhMucStatusMeta = (status) =>
    DOI_TRA_DINH_MUC_STATUS_META[status]
    || { label: status || 'B7 chưa nhập', color: 'default' };

export const formatDoiTraDate = (value, includeTime = false) => {
    if (!value) return '---';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '---';
    return date.toLocaleString('vi-VN', includeTime
        ? { dateStyle: 'short', timeStyle: 'short' }
        : { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatDoiTraQuantity = (value, maximumFractionDigits = 3) => {
    if (value === null || value === undefined || value === '') return '---';
    const number = Number(value);
    return Number.isFinite(number)
        ? number.toLocaleString('vi-VN', { maximumFractionDigits })
        : String(value);
};
