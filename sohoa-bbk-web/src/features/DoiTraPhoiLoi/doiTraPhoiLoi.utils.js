export const DOI_TRA_STATUS_META = {
    TAO_MOI: { label: 'Phiếu nháp', color: 'default', step: 0 },
    DANG_KIEM: { label: 'KCS đang kiểm', color: 'primary', step: 0 },
    CHO_TBP_KCS_XAC_NHAN: { label: 'Chờ TBP KCS xác nhận', color: 'secondary', step: 1 },
    TRA_LAI_KCS: { label: 'Trả lại KCS', color: 'warning', step: 0 },
    CHO_B7_NHAP_DINH_MUC: { label: 'Chờ B7 nhập định mức', color: 'info', step: 2 },
    HOAN_TAT_DINH_MUC: { label: 'Hoàn tất định mức', color: 'success', step: 3 },
    DA_HUY: { label: 'Đã hủy', color: 'error', step: 0 }
};

export const doiTraStatusMeta = (status) =>
    DOI_TRA_STATUS_META[status] || { label: status || 'Không xác định', color: 'default', step: 0 };

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
