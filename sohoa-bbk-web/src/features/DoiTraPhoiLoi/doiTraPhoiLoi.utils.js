export const DOI_TRA_STATUS_META = {
    TAO_MOI: { label: 'Phiếu nháp', color: 'default', step: 0 },
    DANG_KIEM: { label: 'KCS đang kiểm', color: 'primary', step: 0 },
    CHO_TBP_KCS_XAC_NHAN: { label: 'Chờ TBP KCS xác nhận', color: 'secondary', step: 1 },
    TRA_LAI_KCS: { label: 'Trả lại KCS', color: 'warning', step: 0 },
    CHO_B7_NHAP_DINH_MUC: { label: 'Chờ B7 nhập số lượng đổi trả', color: 'info', step: 2 },
    HOAN_TAT: { label: 'Hoàn tất', color: 'success', step: 3 },
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

export const DOI_TRA_HISTORY_ACTION_LABELS = {
    CREATE_DRAFT: 'Tạo phiếu',
    SAVE_PHOI_DRAFT: 'Lưu nháp kết quả kiểm',
    SAVE_RETURN_QUANTITY_DRAFT: 'Lưu nháp số lượng đổi trả',
    KCS_SUBMIT: 'KCS trình duyệt',
    KCS_RESUBMIT: 'KCS trình duyệt lại',
    TBP_CONFIRM: 'TBP KCS duyệt',
    TBP_RETURN: 'TBP KCS trả lại',
    B7_CONFIRM: 'B7 xác nhận hoàn tất',
    CANCEL_DRAFT: 'Hủy phiếu nháp'
};

export const doiTraHistoryActionLabel = (actionCode) =>
    DOI_TRA_HISTORY_ACTION_LABELS[actionCode] || actionCode || '---';

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
