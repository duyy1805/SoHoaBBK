const KPH_B7_OPEN_STATUSES = Object.freeze([
    'CHO_THIET_LAP_KPH', 'CHO_Y_KIEN_KPH', 'CHO_XAC_NHAN_CUOI_KPH',
    'CHO_BGD_XAC_NHAN', 'CHO_THEO_DOI', 'KPH_HOAN_TAT_CHO_B7'
]);

const canB7Work = ({ status, tbpConfirmedAt, dinhMucStatus, hasActiveIssue = false }) =>
    KPH_B7_OPEN_STATUSES.includes(status)
    && Boolean(tbpConfirmedAt)
    && dinhMucStatus !== 'DA_XAC_NHAN'
    && !hasActiveIssue;

const statusAfterB7Confirm = (currentStatus) =>
    currentStatus === 'KPH_HOAN_TAT_CHO_B7' ? 'HOAN_TAT' : currentStatus;

const statusAfterKphCompletion = (dinhMucStatus) =>
    dinhMucStatus === 'DA_XAC_NHAN' ? 'HOAN_TAT' : 'KPH_HOAN_TAT_CHO_B7';

module.exports = { KPH_B7_OPEN_STATUSES, canB7Work, statusAfterB7Confirm, statusAfterKphCompletion };
