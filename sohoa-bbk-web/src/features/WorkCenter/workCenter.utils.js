const DONE_STATUSES = new Set(["HOAN_TAT", "HOAN_THANH", "DA_XAC_NHAN", "BB_SXBT_HOAN_TAT"]);
const HOUR_MS = 60 * 60 * 1000;

const STATUS_LABELS = {
    BB_MOI: "Mới tạo",
    CHO_PHAN_BO_XY_LY: "Chờ phân công xử lý",
    CHO_PHAN_BO_XU_LY: "Chờ phân công xử lý",
    CHO_TP_B8: "Chờ TP B8 kết luận",
    DA_KET_LUAN: "Đã kết luận",
    CHO_XAC_NHAN: "Đang xử lý và xác nhận",
    DA_XAC_NHAN: "Đã xác nhận",
    CHO_THEO_DOI: "Chờ theo dõi đánh giá",
    TRA_LAI_CHINH_SUA: "Trả lại chỉnh sửa",
    HOAN_THANH: "Hoàn thành",
    HOAN_TAT: "Hoàn tất",
    BB_SXBT_MOI: "SXBT chờ xác nhận mức",
    BB_SXBT_TP_B8_DRAFT: "SXBT chờ xác nhận mức",
    BB_SXBT_CHO_XAC_NHAN: "SXBT đang xử lý",
    BB_SXBT_HOAN_TAT: "SXBT hoàn tất"
};

export const normalizeText = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

export const getWorkBucket = (item) => {
    if (DONE_STATUSES.has(String(item.TrangThai || "").toUpperCase())) return "done";
    return item.CanCurrentUserAct === true || item.CanCurrentUserAct === 1 ||
        ["CHO_Y_KIEN", "CHO_TBP_XAC_NHAN"].includes(item.MyDepartmentOpinionStatus)
        ? "action" : "waiting";
};

export const isRepeated = (item) => String(item.MucDo || "").toUpperCase() === "LOILAPLAI";

export const recordDateValue = (item) => {
    const value = item.CurrentStageStartedAt || item.CreatedAt || item.NgayLap || item.NgayTao || item.ListSortAt;
    const timestamp = value ? new Date(value).getTime() : 0;
    return Number.isFinite(timestamp) ? timestamp : 0;
};

export const getWaitingPriority = (item, now = Date.now()) => {
    if (getWorkBucket(item) === "done") {
        return { key: "done", label: "ĐÃ XỬ LÝ", color: "success", rank: 0, elapsedMs: 0 };
    }
    const startedAt = recordDateValue(item);
    if (!startedAt) {
        return { key: "tracking", label: "THEO DÕI", color: "default", rank: 1, elapsedMs: null };
    }
    const elapsedMs = Math.max(0, now - startedAt);
    if (item.IsOverdue || elapsedMs >= 8 * HOUR_MS) {
        return { key: "urgent", label: "GẤP", color: "error", rank: 4, elapsedMs };
    }
    if (elapsedMs >= 4 * HOUR_MS) {
        return { key: "priority", label: "ƯU TIÊN", color: "warning", rank: 3, elapsedMs };
    }
    return { key: "normal", label: "BÌNH THƯỜNG", color: "default", rank: 2, elapsedMs };
};

export const formatWaitingTime = (elapsedMs) => {
    if (elapsedMs == null) return "Chưa có mốc thời gian";
    const totalMinutes = Math.max(0, Math.floor(elapsedMs / 60000));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `${days} ngày ${hours}h`;
    return `${hours}h ${String(minutes).padStart(2, "0")}'`;
};

export const getReadableStatus = (status) => {
    const normalized = String(status || "").trim().toUpperCase();
    if (STATUS_LABELS[normalized]) return STATUS_LABELS[normalized];
    if (!normalized) return "Mới tạo";
    return normalized.toLowerCase().split("_").filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
};

export const searchableRecordText = (item) => normalizeText([
    item.SoBienBan, item.SoPhieu, item.MaSanPham, item.TenSanPham, item.Lot, item.DonHang,
    item.MoTaChung, item.NguoiLap, item.MaBoPhanTao, item.TenBoPhanTao,
    ...(item.MainDefects || []).flatMap((defect) => [defect.MaLoi, defect.TenLoi]),
    ...(item.DepartmentProgress || []).flatMap((department) => [department.code, department.name])
].filter(Boolean).join(" "));

export const sortRecords = (items, sort, now = Date.now()) => [...items].sort((left, right) => {
    if (sort === "oldest") return recordDateValue(left) - recordDateValue(right);
    if (sort === "priority") {
        const leftPriority = getWaitingPriority(left, now);
        const rightPriority = getWaitingPriority(right, now);
        return Number(right.IsOverdue) - Number(left.IsOverdue) ||
            rightPriority.rank - leftPriority.rank ||
            (rightPriority.elapsedMs || 0) - (leftPriority.elapsedMs || 0) ||
            recordDateValue(right) - recordDateValue(left);
    }
    return recordDateValue(right) - recordDateValue(left);
});

export const exportWorkCenterCsv = (items) => {
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
        ["Loại hồ sơ", "Số phiếu", "Trạng thái", "Sản phẩm", "Lot", "Đơn hàng", "Mô tả KPH", "SL lỗi", "Hạn xử lý", "Quá hạn"],
        ...items.map((item) => [
            item.recordType, item.SoBienBan || item.SoPhieu || `BB#${item.bienBanId}`,
            getReadableStatus(item.TrangThai), [item.MaSanPham, item.TenSanPham].filter(Boolean).join(" - "),
            item.Lot, item.DonHang, item.MoTaChung, item.TotalDefectQuantity,
            item.DueAt ? new Date(item.DueAt).toLocaleDateString("vi-VN") : "",
            item.IsOverdue ? "Có" : "Không"
        ])
    ];
    const blob = new Blob(["\uFEFF", rows.map((row) => row.map(escape).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `trung-tam-xu-ly-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
};

export const RECORD_TYPE_LABELS = {
    KPH_V01: "KPH V01",
    BIEN_BAN_V00: "Biên bản",
    SXBT: "SXBT"
};

export const PROGRESS_META = {
    WAITING_INPUT: { label: "Chờ ý kiến", color: "default" },
    WAITING_LEAD: { label: "Chờ TBP", color: "warning" },
    DONE: { label: "Đã xong", color: "success" },
    WAITING_STEP: { label: "Đang chờ", color: "info" }
};
