const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const crypto = require('crypto');
const authenticateToken = require('../middlewares/auth.middleware');
const { requireUserAdministrator } = require('../middlewares/userAdmin.middleware');

const { poolPromise } = require('../db');

const md5 = (text) => {
    return crypto.createHash('md5').update(text).digest('hex');
};
/* =========================================================
   POST /auth/register
   ========================================================= */
router.post('/register', authenticateToken, requireUserAdministrator, async (req, res) => {
    res.status(410).json({
        message: 'Endpoint đăng ký cũ đã ngừng sử dụng. Vui lòng tạo tài khoản tại /api/admin/users.'
    });
});

/* =========================================================
   POST /auth/login
   ========================================================= */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Missing username or password' });
    }

    try {
        const pool = await poolPromise;

        /* 1️⃣ Lấy user */
        const userResult = await pool.request()
            .input('Username', sql.NVarChar, username)
            .execute('sp_User_GetByUsername');

        const user = userResult.recordset[0];
        if (!user || !user.TrangThai) {
            return res.status(401).json({ message: 'Invalid account' });
        }

        /* 2️⃣ Check password */
        // const validPassword = await argon2.verify(user.PasswordHash, password);
        // if (!validPassword) {
        //     return res.status(401).json({ message: 'Invalid password' });
        // }

        const passwordHash = md5(password);

        if (passwordHash !== user.PasswordHash) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        /* 3️⃣ Lấy roles */
        const rolesResult = await pool.request()
            .input('UserId', sql.Int, user.Id)
            .query(`
                SELECT DISTINCT r.RoleCode
                FROM dbo.USER_ROLE ur
                JOIN dbo.ROLES r ON r.Id=ur.RoleId
                WHERE ur.UserId=@UserId AND ISNULL(r.TrangThai,1)=1
                ORDER BY r.RoleCode
            `);

        const roles = rolesResult.recordset.map(r => r.RoleCode);

        /* 4️⃣ Lấy permissions */
        const permResult = await pool.request()
            .input('UserId', sql.Int, user.Id)
            .query(`
                SELECT DISTINCT p.PermissionCode
                FROM dbo.USER_ROLE ur
                JOIN dbo.ROLES r ON r.Id=ur.RoleId AND ISNULL(r.TrangThai,1)=1
                JOIN dbo.ROLE_PERMISSION rp ON rp.RoleId=r.Id
                JOIN dbo.PERMISSIONS p ON p.Id=rp.PermissionId
                WHERE ur.UserId=@UserId
                ORDER BY p.PermissionCode
            `);

        const permissions = permResult.recordset.map(p => p.PermissionCode);

        const managedDepartmentResult = await pool.request()
            .input('UserId', sql.Int, user.Id)
            .query(`
                SELECT mapping.BoPhanId
                FROM dbo.USER_BO_PHAN_QUAN_LY mapping
                JOIN dbo.DM_BO_PHAN department ON department.Id=mapping.BoPhanId
                WHERE mapping.UserId=@UserId AND mapping.IsActive=1
                  AND ISNULL(department.TrangThai,1)=1
                ORDER BY mapping.BoPhanId
            `);
        const managedBoPhanIds = [...new Set([
            Number(user.BoPhanId),
            ...managedDepartmentResult.recordset.map((item) => Number(item.BoPhanId))
        ].filter((id) => Number.isInteger(id) && id > 0))];

        /* 5️⃣ Tạo JWT */
        const token = jwt.sign(
            {
                userId: user.Id,
                username: user.Username,
                boPhanId: user.BoPhanId,
                managedBoPhanIds,
                roles,
                permissions
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: user.Id,
                username: user.Username,
                fullName: user.FullName,
                boPhan: user.BoPhan,
                maBoPhan: user.MaBoPhan,
                tenBoPhan: user.TenBoPhan,
                boPhanId: user.BoPhanId,
                managedBoPhanIds,
                roles,
                permissions
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Login failed' });
    }
});

// API lưu Token khi đăng nhập
router.post('/save-push-token', authenticateToken, async (req, res) => {
    const { token } = req.body;
    const userId = req.user.userId;

    try {
        const pool = await poolPromise;
        // Kiểm tra xem token này đã tồn tại cho user này chưa
        const check = await pool.request()
            .input('UserId', sql.Int, userId)
            .input('Token', sql.NVarChar, token)
            .query('SELECT Id FROM USER_PUSH_TOKENS WHERE UserId = @UserId AND ExpoPushToken = @Token');

        if (check.recordset.length === 0) {
            await pool.request()
                .input('UserId', sql.Int, userId)
                .input('Token', sql.NVarChar, token)
                .query('INSERT INTO USER_PUSH_TOKENS (UserId, ExpoPushToken) VALUES (@UserId, @Token)');
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Failed to save token' });
    }
});

// API xóa Token khi đăng xuất
router.post('/remove-push-token', authenticateToken, async (req, res) => {
    const { token } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('Token', sql.NVarChar, token)
            .query('DELETE FROM USER_PUSH_TOKENS WHERE ExpoPushToken = @Token');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Failed to remove token' });
    }
});

module.exports = router;
