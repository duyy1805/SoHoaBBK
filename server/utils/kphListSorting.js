const timestampValue = (value) => {
    if (!value) return 0;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
};

const getListSortAt = (row = {}) => {
    const status = String(row.TrangThai || '').trim().toUpperCase();
    if (['HOAN_TAT', 'HOAN_THANH', 'DA_XAC_NHAN', 'BB_SXBT_HOAN_TAT'].includes(status)) {
        return row.CompletedAt || row.FollowUpReadyAt || row.CreatedAt || null;
    }
    if (status === 'CHO_THEO_DOI') {
        return row.FollowUpReadyAt || row.CreatedAt || null;
    }
    return row.CreatedAt || null;
};

const sortKphListRows = (rows = []) => rows
    .map((row) => ({ ...row, ListSortAt: getListSortAt(row) }))
    .sort((left, right) =>
        timestampValue(right.ListSortAt) - timestampValue(left.ListSortAt)
        || Number(right.BienBanId || right.Id || 0) - Number(left.BienBanId || left.Id || 0)
    );

module.exports = { getListSortAt, sortKphListRows };
