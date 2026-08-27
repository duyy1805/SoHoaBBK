const hasRole = (user, roleCode) => Array.isArray(user?.roles) &&
    user.roles.some((role) => String(role || "").toUpperCase() === roleCode);

const isPrivateKphDraft = (item = {}) =>
    String(item.LoaiBienBan || "").toUpperCase() !== "SXBT" &&
    String(item.MauPhieuVersion || "V00").toUpperCase() === "V01" && (
        !item.OpinionDepartmentsConfirmedAt ||
        String(item.TrangThai || "").toUpperCase() === "TRA_LAI_CHINH_SUA"
    );

const canViewKphListItem = (item, user, managedDepartmentIds = []) => {
    if (!isPrivateKphDraft(item)) return true;
    if (hasRole(user, "ADMIN")) return true;
    if (Number(item.NguoiLapId) === Number(user?.userId)) return true;

    const managedIds = managedDepartmentIds.map(Number);
    const isRecipient = (Array.isArray(item.RecipientDepartments) ? item.RecipientDepartments : [])
        .some((department) => managedIds.includes(Number(department.BoPhanId || department.id)));
    if (isRecipient) return true;

    const creatorDepartmentId = Number(item.CreatorBoPhanId || item.BoPhanTaoId);
    return managedIds.includes(creatorDepartmentId);
};

module.exports = { canViewKphListItem, isPrivateKphDraft };
