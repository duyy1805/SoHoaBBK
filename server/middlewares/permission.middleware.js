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
            return res.status(401).json({
                message: 'Unauthenticated'
            });
        }

        const userPermissions = req.user.permissions;

        if (!Array.isArray(userPermissions)) {
            return res.status(403).json({
                message: 'No permissions found'
            });
        }

        // Cho phép truyền 1 permission hoặc nhiều permission (OR)
        const requiredPermissions = Array.isArray(permissionCode)
            ? permissionCode
            : [permissionCode];

        const hasPermission = requiredPermissions.some(p =>
            userPermissions.includes(p)
        );

        if (!hasPermission) {
            return res.status(403).json({
                message: 'Forbidden',
                requiredPermissions
            });
        }

        next();
    };
};

module.exports = authorize;
