const DONE_STATUSES = new Set([
    "HOAN_TAT",
    "HOAN_THANH",
    "DA_XAC_NHAN",
    "BB_SXBT_HOAN_TAT"
]);

export const getRecordTimeMeta = (item = {}) => {
    const status = String(item.TrangThai || "").trim().toUpperCase();
    if (DONE_STATUSES.has(status)) {
        return {
            label: "Hoàn tất",
            value: item.CompletedAt || item.ListSortAt || item.FollowUpReadyAt || item.CreatedAt,
            color: "success.dark"
        };
    }
    if (status === "CHO_THEO_DOI") {
        return {
            label: "Chờ theo dõi từ",
            value: item.FollowUpReadyAt || item.ListSortAt || item.CreatedAt,
            color: "warning.dark"
        };
    }
    if (status === "CHO_BGD_XAC_NHAN" && (item.FollowUpReadyAt || item.CreatorConfirmedAt)) {
        return {
            label: "Chờ BGD từ",
            value: item.FollowUpReadyAt || item.CreatorConfirmedAt,
            color: "warning.dark"
        };
    }
    if (item.OpinionDepartmentsConfirmedAt && !item.CreatorConfirmedAt && !item.FollowUpReadyAt) {
        return {
            label: "Gửi xin ý kiến",
            value: item.OpinionDepartmentsConfirmedAt,
            color: "info.dark"
        };
    }
    return {
        label: "Ngày lập",
        value: item.CreatedAt || item.ListSortAt,
        color: "text.secondary"
    };
};

export const getRecordCreatedDate = (item = {}) => {
    const value = item.CreatedAt || item.NgayLap || item.NgayTao || item.ListSortAt;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const getRecordReferenceDate = (item = {}) => {
    const value = getRecordTimeMeta(item).value;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};
