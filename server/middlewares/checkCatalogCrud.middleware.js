const CHECK_CATALOG_ROLE = 'IMPORT_DM_KIEM';

const authorizeCheckCatalogCrud = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthenticated' });
    }

    const roles = Array.isArray(req.user.roles) ? req.user.roles : [];
    const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    const normalizedRoles = roles.map((role) => String(role || '').toUpperCase());

    const canManage = normalizedRoles.includes(CHECK_CATALOG_ROLE)
        || normalizedRoles.includes('ADMIN')
        || permissions.includes(CHECK_CATALOG_ROLE)
        || permissions.includes('QUAN_TRI_DM');

    if (!canManage) {
        return res.status(403).json({
            message: 'Forbidden',
            requiredRoles: [CHECK_CATALOG_ROLE]
        });
    }

    next();
};

module.exports = authorizeCheckCatalogCrud;
