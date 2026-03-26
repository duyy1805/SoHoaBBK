const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Không có token
    if (!token) {
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
        return res.status(401).json({
            message: 'Invalid or expired token'
        });
    }
};

module.exports = authenticateToken;
