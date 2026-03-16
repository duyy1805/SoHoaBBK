const express = require('express');
const router = express.Router();
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const sql = require('mssql');

const { poolPromise } = require('../db');

/* =========================================================
   POST /auth/register
   ========================================================= */
router.post('/register', async (req, res) => {
    const { username, password, fullName, email, boPhan, roleId } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            message: 'Missing username or password'
        });
    }

    try {
        const pool = await poolPromise;
        const passwordHash = await argon2.hash(password);

        const request = pool.request()
            .input('Username', sql.NVarChar, username)
            .input('PasswordHash', sql.NVarChar, passwordHash)
            .input('FullName', sql.NVarChar, fullName)
            .input('Email', sql.NVarChar, email)
            .input('BoPhan', sql.NVarChar, boPhan);

        // roleId là optional
        if (roleId) {
            request.input('RoleId', sql.Int, roleId);
        } else {
            request.input('RoleId', sql.Int, null);
        }

        const result = await request.execute('sp_User_Register_WithRole');

        res.json({
            success: true,
            userId: result.recordset[0].UserId,
            roleId: result.recordset[0].RoleId
        });

    } catch (err) {
        if (err.message && err.message.includes('USERNAME_EXISTS')) {
            return res.status(400).json({
                message: 'Username already exists'
            });
        }

        console.error('Register error:', err);
        res.status(500).json({
            message: 'Register failed'
        });
    }
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
        const validPassword = await argon2.verify(user.PasswordHash, password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        /* 3️⃣ Lấy roles */
        const rolesResult = await pool.request()
            .input('UserId', sql.Int, user.Id)
            .execute('sp_User_GetRoles');

        const roles = rolesResult.recordset.map(r => r.RoleCode);

        /* 4️⃣ Lấy permissions */
        const permResult = await pool.request()
            .input('UserId', sql.Int, user.Id)
            .execute('sp_User_GetPermissions');

        const permissions = permResult.recordset.map(p => p.PermissionCode);

        /* 5️⃣ Tạo JWT */
        const token = jwt.sign(
            {
                userId: user.Id,
                username: user.Username,
                boPhanId: user.BoPhanId,
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
                tenBoPhan: user.TenBoPhan,
                boPhanId: user.BoPhanId,
                roles,
                permissions
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Login failed' });
    }
});

module.exports = router;
