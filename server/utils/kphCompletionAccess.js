const hasRole = (user, roleCode) => Array.isArray(user?.roles) &&
    user.roles.some((role) => String(role || '').toUpperCase() === roleCode);

const hasPermission = (user, permissionCode) => Array.isArray(user?.permissions) &&
    user.permissions.includes(permissionCode);

const canFinalizeKph = ({ user, record, isCreatorDepartmentLead = false }) =>
    hasRole(user, 'ADMIN') ||
    Number(record?.NguoiLapId) === Number(user?.userId) ||
    (record?.LoaiBienBan === 'STANDALONE' && hasPermission(user, 'KET_LUAN')) ||
    Boolean(isCreatorDepartmentLead);

module.exports = { canFinalizeKph };
