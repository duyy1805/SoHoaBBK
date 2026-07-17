/**
 * Permission middleware (RBAC)
 * Dùng permissionCode, KHÔNG dùng role trực tiếp
 *
 * Ví dụ:
 *   authorize('PHAN_BO_KIEM')
 *   authorize(['XIN_Y_KIEN', 'KET_LUAN']) // OR
 */

const authorize = (permissionCode) => {
    return (req, res, next) => {
        // Chưa authenticate
        if (!req.user) {
            console.warn(`[AUTHZ] ${req.method} ${req.originalUrl}: unauthenticated`);
            return res.status(401).json({
                message: 'Unauthenticated'
            });
        }

        const userPermissions = req.user.permissions;
        const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [];

        if (!Array.isArray(userPermissions)) {
            console.warn(`[AUTHZ] ${req.method} ${req.originalUrl}: permissions missing`, {
                userId: req.user?.userId
            });
            return res.status(403).json({
                message: 'No permissions found'
            });
        }

        const isAdmin = userPermissions.includes('QUAN_TRI_DM')
            || userRoles.some((role) => String(role || '').toUpperCase().includes('ADMIN'));

        if (isAdmin) {
            return next();
        }

        // Cho phép truyền 1 permission hoặc nhiều permission (OR)
        const requiredPermissions = Array.isArray(permissionCode)
            ? permissionCode
            : [permissionCode];

        const hasPermission = requiredPermissions.some(p =>
            userPermissions.includes(p)
        );

        if (!hasPermission) {
            console.warn(`[AUTHZ] ${req.method} ${req.originalUrl}: forbidden`, {
                userId: req.user?.userId,
                requiredPermissions,
                userPermissions
            });
            return res.status(403).json({
                message: 'Forbidden',
                requiredPermissions
            });
        }

        next();
    };
};

module.exports = authorize;
