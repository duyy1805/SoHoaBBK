const USER_ADMIN_PERMISSION = "QUAN_TRI_NGUOI_DUNG";

const isUserAdministrator = (user = {}) => {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    return roles.some((role) => String(role || "").toUpperCase() === "ADMIN")
        || permissions.includes(USER_ADMIN_PERMISSION);
};

const requireUserAdministrator = (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthenticated" });
    if (!isUserAdministrator(req.user)) {
        return res.status(403).json({ message: "Bạn không có quyền quản trị người dùng" });
    }
    next();
};

module.exports = {
    USER_ADMIN_PERMISSION,
    isUserAdministrator,
    requireUserAdministrator
};

