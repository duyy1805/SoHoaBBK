const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Không có token
    if (!token) {
        console.warn(`[AUTH] ${req.method} ${req.originalUrl}: missing access token`);
        return res.status(401).json({
            message: 'Missing access token'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        /*
            decoded = {
                userId,
                username,
                roles,
                permissions,
                iat,
                exp
            }
        */

        req.user = decoded;
        next();
    } catch (err) {
        console.warn(`[AUTH] ${req.method} ${req.originalUrl}: invalid or expired token`, {
            message: err?.message,
            name: err?.name
        });
        return res.status(401).json({
            message: 'Invalid or expired token'
        });
    }
};

module.exports = authenticateToken;
