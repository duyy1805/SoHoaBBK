function requireMatchingTenant(req, res, next) {
    const requested = String(req.get('X-App-Tenant') || req.tenant || 'Z76').trim().toUpperCase();
    if (requested !== req.tenant) {
        return res.status(403).json({ message: 'Tenant không khớp với API đang truy cập' });
    }
    next();
}

module.exports = { requireMatchingTenant };
