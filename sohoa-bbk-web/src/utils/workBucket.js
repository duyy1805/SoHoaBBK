const DONE_STATUSES = new Set([
    "HOAN_TAT", "HOAN_THANH", "DA_XAC_NHAN", "BB_SXBT_HOAN_TAT"
]);

const PENDING_DEPARTMENT_STATUSES = new Set([
    "CHO_Y_KIEN", "CHO_TBP_XAC_NHAN", "WAITING_INPUT", "WAITING_LEAD", "WAITING_STEP"
]);

const isTrue = (value) => value === true || value === 1;

export const getManagedDepartmentIds = (currentUser = {}) => new Set(
    (currentUser.managedBoPhanIds || [currentUser.boPhanId])
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
);

export const getUnifiedWorkBucket = (item = {}, currentUser = {}) => {
    const status = String(item.TrangThai || "").toUpperCase();
    if (DONE_STATUSES.has(status)) return "done";

    const managedDepartmentIds = getManagedDepartmentIds(currentUser);
    const myDepartmentHasPendingOpinion = PENDING_DEPARTMENT_STATUSES.has(
        String(item.MyDepartmentOpinionStatus || "").toUpperCase()
    );
    const myDepartmentHasPendingProgress = (item.DepartmentProgress || []).some((department) =>
        managedDepartmentIds.has(Number(department.departmentId)) &&
        PENDING_DEPARTMENT_STATUSES.has(String(department.status || "").toUpperCase())
    );
    const myDepartmentIsCurrentStep = managedDepartmentIds.has(Number(item.BoPhanDangChoId)) ||
        managedDepartmentIds.has(Number(item.BoPhanId));
    const personallyAssigned = Number(item.NguoiXuLyId) > 0 &&
        Number(item.NguoiXuLyId) === Number(currentUser.userId || currentUser.id);

    return isTrue(item.CanCurrentUserAct) || myDepartmentHasPendingOpinion ||
        myDepartmentHasPendingProgress || myDepartmentIsCurrentStep || personallyAssigned
        ? "action"
        : "waiting";
};
