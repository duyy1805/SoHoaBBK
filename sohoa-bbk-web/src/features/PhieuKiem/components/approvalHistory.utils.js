export const formatApprovalDateTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false
    }).format(date);
};

export const latestApprovalSummary = (item) => {
    if (!item?.LatestApprovalAt) return "—";
    return [
        item.LatestApprovalLabel,
        item.LatestApprovalBy,
        formatApprovalDateTime(item.LatestApprovalAt)
    ].filter(Boolean).join(" · ");
};
