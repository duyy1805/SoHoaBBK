export const BIEN_BAN_STATUS = {
    BB_MOI: { label: "Mới tạo", color: "default" },
    CHO_PHAN_BO_XY_LY: { label: "Chờ phân công xử lý", color: "warning" },
    CHO_PHAN_BO_XU_LY: { label: "Chờ phân công xử lý", color: "warning" },
    CHO_TP_B8: { label: "Chờ TP B8 kết luận", color: "secondary" },
    DA_KET_LUAN: { label: "Đã kết luận", color: "primary" },
    CHO_XAC_NHAN: { label: "Đang xử lý và xác nhận", color: "info" },
    DA_XAC_NHAN: { label: "Đã xác nhận", color: "success" },
    CHO_THEO_DOI: { label: "Chờ theo dõi đánh giá", color: "warning" },
    HOAN_THANH: { label: "Hoàn thành", color: "success" },
    HOAN_TAT: { label: "Hoàn tất", color: "success" }
};

export const getBienBanStatusMeta = (status) => (
    BIEN_BAN_STATUS[status] || { label: status || "Mới tạo", color: "default" }
);

const WORKFLOW_STEPS = [
    "Thông tin & lỗi",
    "Phân công",
    "Phương án xử lý",
    "Ý kiến chuyên môn",
    "Xác nhận",
    "Theo dõi & hoàn tất"
];

const sameDepartment = (left, right) => Number(left) === Number(right);

export function buildBienBanWorkflow({
    info,
    defects = [],
    assigns = [],
    xuLy = [],
    xacNhan = [],
    opinions = [],
    evaluation,
    currentUserBoPhanId,
    isManagerOrQA,
    basicInfoConfirmed = true,
    canConfirmProcessing,
    canConfirmBpsxSignature,
    canSubmitCompletion,
    actions = {}
}) {
    const status = String(info?.TrangThai || "BB_MOI");
    const isFinished = ["HOAN_TAT", "HOAN_THANH", "DA_XAC_NHAN"].includes(status) || Boolean(evaluation);
    const isV01 = info?.MauPhieuVersion === "V01";
    const assignConfirmed = isV01
        ? Boolean(info?.OpinionDepartmentsConfirmed)
        : Boolean(info?.AssignConfirmed);
    const ownPendingOpinion = opinions.some((item) =>
        sameDepartment(item.BoPhanId, currentUserBoPhanId) && !item.HasResponded
    );
    const allProcessingDone = !isV01 || xuLy.length > 0;
    const allOpinionsAnswered = !isV01 ||
        (opinions.length > 0 && opinions.every((item) => item.HasResponded));
    const allConfirmed = assigns.length > 0 && assigns.every((assign) =>
        xacNhan.some((item) => sameDepartment(item.BoPhanId, assign.BoPhanId))
    );
    const basicReady = basicInfoConfirmed && defects.length > 0;

    let activeStep = 0;
    if (basicReady) activeStep = 1;
    if (assignConfirmed) activeStep = 2;
    if (assignConfirmed && allProcessingDone) activeStep = 3;
    if (assignConfirmed && allProcessingDone && allOpinionsAnswered) activeStep = 4;
    if (allConfirmed || status === "CHO_THEO_DOI") activeStep = 5;
    if (isFinished) activeStep = 6;

    const waitingDepartments = assigns
        .filter((assign) => !xacNhan.some((item) => sameDepartment(item.BoPhanId, assign.BoPhanId)))
        .map((assign) => assign.TenBoPhan || assign.MaBoPhan)
        .filter(Boolean);

    let guidance = {
        eyebrow: "TRẠNG THÁI HIỆN TẠI",
        title: "Phiếu đang được xử lý",
        description: waitingDepartments.length
            ? `Đang chờ xác nhận từ: ${waitingDepartments.join(", ")}.`
            : "Theo dõi tiến độ của các bộ phận ở các bước bên dưới.",
        actionLabel: null,
        onAction: null,
        tone: "info"
    };

    if (isFinished) {
        guidance = {
            eyebrow: "ĐÃ HOÀN TẤT",
            title: "Phiếu đã hoàn thành quy trình",
            description: "Các nội dung đã được khóa. Bạn có thể xem lại lịch sử hoặc in phiếu.",
            tone: "success"
        };
    } else if (!basicReady) {
        guidance = {
            eyebrow: "VIỆC BẠN CẦN LÀM",
            title: defects.length === 0 ? "Bổ sung thông tin và ít nhất một dòng lỗi" : "Xác nhận thông tin phiếu",
            description: "Hoàn thiện nội dung phát hiện không phù hợp trước khi phân công xử lý.",
            actionLabel: "Hoàn thiện thông tin",
            onAction: actions.editInfo,
            tone: "warning"
        };
    } else if (!assignConfirmed && isManagerOrQA) {
        guidance = {
            eyebrow: "VIỆC BẠN CẦN LÀM",
            title: assigns.length ? "Kiểm tra và chốt phân công" : "Phân công bộ phận xử lý",
            description: assigns.length
                ? `Đã chọn ${assigns.length} bộ phận. Sau khi chốt, thông tin và danh sách lỗi sẽ được khóa.`
                : "Chọn các bộ phận chịu trách nhiệm và bộ phận sản xuất liên quan.",
            actionLabel: assigns.length ? "Chốt phân công" : "Phân công bộ phận",
            onAction: assigns.length ? actions.confirmAssignments : actions.manageAssignments,
            tone: "warning"
        };
    } else if (!assignConfirmed) {
        guidance = {
            eyebrow: "ĐANG CHỜ",
            title: "Chờ người phụ trách chốt phân công",
            description: "Bạn sẽ nhận được thao tác xử lý khi danh sách bộ phận được xác nhận.",
            tone: "info"
        };
    } else if (isV01 && isManagerOrQA && xuLy.length === 0) {
        guidance = {
            eyebrow: "VIỆC BẠN CẦN LÀM",
            title: "Nhập đề xuất xử lý",
            description: "Ghi rõ đề xuất, người thực hiện và thời hạn xử lý.",
            actionLabel: "Nhập phương án xử lý",
            onAction: actions.addProcessing,
            tone: "warning"
        };
    } else if (ownPendingOpinion) {
        guidance = {
            eyebrow: "VIỆC BẠN CẦN LÀM",
            title: "Phản hồi và xác nhận chuyên môn",
            description: "Nhập nội dung nếu cần và xác nhận ý kiến chuyên môn của bộ phận.",
            actionLabel: "Đến phần ý kiến chuyên môn",
            onAction: actions.openOpinions,
            tone: "warning"
        };
    } else if (canConfirmProcessing || canConfirmBpsxSignature) {
        guidance = {
            eyebrow: "VIỆC BẠN CẦN LÀM",
            title: canConfirmBpsxSignature && !canConfirmProcessing
                ? "Xác nhận của bộ phận sản xuất"
                : "Xác nhận kết quả xử lý của bộ phận",
            description: "Kiểm tra phương án và hành động khắc phục trước khi xác nhận.",
            actionLabel: "Kiểm tra và xác nhận",
            onAction: actions.confirmProcessing,
            tone: "warning"
        };
    } else if (canSubmitCompletion) {
        guidance = {
            eyebrow: "VIỆC BẠN CẦN LÀM",
            title: "Tất cả bộ phận đã hoàn thành",
            description: "Phiếu đã đủ điều kiện để chuyển sang theo dõi hoặc hoàn tất.",
            actionLabel: "Hoàn tất biên bản",
            onAction: actions.complete,
            tone: "success"
        };
    } else if (status === "CHO_THEO_DOI") {
        guidance = {
            eyebrow: "BƯỚC CUỐI",
            title: "Chờ theo dõi và đánh giá hiệu lực",
            description: "Người có quyền theo dõi KPH sẽ ghi nhận kết quả đánh giá tại bước cuối.",
            actionLabel: "Đến phần theo dõi",
            onAction: actions.openFollowUp,
            tone: "info"
        };
    }

    return { activeStep, guidance, steps: WORKFLOW_STEPS };
}
