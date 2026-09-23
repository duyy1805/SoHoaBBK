const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const crypto = require('crypto');
const authenticateToken = require('../middlewares/auth.middleware');
const { requireUserAdministrator } = require('../middlewares/userAdmin.middleware');

const { poolPromise } = require('../databaseContext');
const { getTenantConfig } = require('../config/tenant');

const md5 = (text) => {
    return crypto.createHash('md5').update(text).digest('hex');
};

const loadAuthorization = async (pool, user) => {
    const rolesResult = await pool.request().input('UserId', sql.Int, user.Id).query(`
        SELECT DISTINCT r.RoleCode
        FROM dbo.USER_ROLE ur JOIN dbo.ROLES r ON r.Id=ur.RoleId
        WHERE ur.UserId=@UserId AND ISNULL(r.TrangThai,1)=1 ORDER BY r.RoleCode
    `);
    const permResult = await pool.request().input('UserId', sql.Int, user.Id).query(`
        SELECT DISTINCT p.PermissionCode
        FROM dbo.USER_ROLE ur
        JOIN dbo.ROLES r ON r.Id=ur.RoleId AND ISNULL(r.TrangThai,1)=1
        JOIN dbo.ROLE_PERMISSION rp ON rp.RoleId=r.Id
        JOIN dbo.PERMISSIONS p ON p.Id=rp.PermissionId
        WHERE ur.UserId=@UserId ORDER BY p.PermissionCode
    `);
    const managedResult = await pool.request().input('UserId', sql.Int, user.Id).query(`
        SELECT mapping.BoPhanId FROM dbo.USER_BO_PHAN_QUAN_LY mapping
        JOIN dbo.DM_BO_PHAN department ON department.Id=mapping.BoPhanId
        WHERE mapping.UserId=@UserId AND mapping.IsActive=1 AND ISNULL(department.TrangThai,1)=1
    `);
    return {
        roles: rolesResult.recordset.map((row) => row.RoleCode),
        permissions: permResult.recordset.map((row) => row.PermissionCode),
        managedBoPhanIds: [...new Set([Number(user.BoPhanId), ...managedResult.recordset.map((row) => Number(row.BoPhanId))]
            .filter((id) => Number.isInteger(id) && id > 0))]
    };
};

const authenticatePlpAccount = async (pool, username, password, tenant, unitCode) => {
    const procedure = String(process.env.PLP_AUTH_PROCEDURE || '').trim();
    let source;
    if (procedure) {
        if (!/^(?:\[[\w]+\]|[\w]+)(?:\.(?:\[[\w]+\]|[\w]+)){1,2}$/.test(procedure)) {
            throw new Error('PLP_AUTH_PROCEDURE không hợp lệ');
        }
        const sourceResult = await pool.request()
            .input('Username', sql.NVarChar(100), username)
            .input('Password', sql.NVarChar(500), password)
            .execute(procedure);
        source = sourceResult.recordset?.[0];
    } else {
        const sourceResult = await pool.request()
            .input('Username', sql.NVarChar(100), username)
            .query(`
                SELECT TOP (1)
                    account.ID_TaiKhoanDangNhap, account.TenDangNhap, account.MatKhau,
                    account.TenDayDu, account.Email, account.ID_DonVi, account.ID_BoPhan,
                    account.SuDung AS IsActive
                FROM TAG_System.dbo.TaiKhoanDangNhap account
                WHERE LOWER(LTRIM(RTRIM(account.TenDangNhap)))=LOWER(LTRIM(RTRIM(@Username)))
                  AND account.SuDung=1 AND account.TonTai=1
            `);
        source = sourceResult.recordset?.[0];
        const expectedHash = String(source?.MatKhau || '').toLowerCase();
        const suppliedHash = md5(password).toLowerCase();
        if (expectedHash.length !== suppliedHash.length
            || !crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(suppliedHash))) return null;
        delete source.MatKhau;
    }
    if (!source) return null;
    const authenticated = source.IsAuthenticated;
    if (authenticated !== undefined && ![true, 1, '1', 'true'].includes(
        typeof authenticated === 'string' ? authenticated.toLowerCase() : authenticated
    )) return null;
    const active = source.TrangThai ?? source.IsActive ?? 1;
    if (![true, 1, '1', 'true'].includes(typeof active === 'string' ? active.toLowerCase() : active)) return null;

    const externalId = Number(source.ID_TaiKhoanDangNhap ?? source.ExternalAccountId);
    if (!Number.isInteger(externalId) || externalId <= 0) {
        throw new Error('Stored procedure xac thuc PLP khong tra ve ID_TaiKhoanDangNhap');
    }
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
        const linked = await new sql.Request(transaction)
            .input('ExternalTenant', sql.NVarChar(20), tenant)
            .input('ExternalAccountId', sql.Int, externalId)
            .input('Username', sql.NVarChar(100), source.TenDangNhap || username)
            .input('FullName', sql.NVarChar(255), source.TenDayDu || source.FullName || username)
            .input('Email', sql.NVarChar(255), source.Email || null)
            .input('UnitCode', sql.NVarChar(100), unitCode)
            .query(`
                DECLARE @BoPhanId INT = (
                    SELECT TOP (1) Id FROM dbo.DM_BO_PHAN
                    WHERE MaBoPhan=@UnitCode AND ISNULL(TrangThai,1)=1
                );
                IF @BoPhanId IS NULL THROW 50001, N'Chua cau hinh bo phan Phat Long Phuoc', 1;

                MERGE dbo.USERS WITH (HOLDLOCK) AS target
                USING (SELECT @ExternalTenant ExternalTenant, @ExternalAccountId ExternalAccountId) source
                   ON target.ExternalTenant=source.ExternalTenant AND target.ExternalAccountId=source.ExternalAccountId
                WHEN MATCHED THEN UPDATE SET
                    Username=@Username, FullName=@FullName, Email=@Email,
                    BoPhanId=@BoPhanId, BoPhan=(SELECT TenBoPhan FROM dbo.DM_BO_PHAN WHERE Id=@BoPhanId),
                    TrangThai=1, UpdatedAt=SYSDATETIME()
                WHEN NOT MATCHED THEN INSERT
                    (Username,PasswordHash,FullName,Email,BoPhanId,BoPhan,TrangThai,CreatedAt,UpdatedAt,ExternalTenant,ExternalAccountId)
                    VALUES
                    (@Username,N'EXTERNAL_ONLY',@FullName,@Email,@BoPhanId,
                     (SELECT TenBoPhan FROM dbo.DM_BO_PHAN WHERE Id=@BoPhanId),1,SYSDATETIME(),SYSDATETIME(),@ExternalTenant,@ExternalAccountId)
                OUTPUT INSERTED.Id;

                DECLARE @UserId INT=(SELECT Id FROM dbo.USERS WHERE ExternalTenant=@ExternalTenant AND ExternalAccountId=@ExternalAccountId);
                IF NOT EXISTS (SELECT 1 FROM dbo.USER_ROLE WHERE UserId=@UserId)
                    INSERT dbo.USER_ROLE(UserId,RoleId)
                    SELECT @UserId,Id FROM dbo.ROLES WHERE RoleCode=N'PLP_VIEWER';

                SELECT u.*, b.MaBoPhan, b.TenBoPhan
                FROM dbo.USERS u LEFT JOIN dbo.DM_BO_PHAN b ON b.Id=u.BoPhanId WHERE u.Id=@UserId;
            `);
        await transaction.commit();
        return linked.recordsets.at(-1)?.[0];
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
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
        const { tenant, isPlp, unitCode } = getTenantConfig(req);
        const pool = await poolPromise;

        const userResult = isPlp ? null : await pool.request()
            .input('Username', sql.NVarChar, username).execute('sp_User_GetByUsername');
        const user = isPlp ? await authenticatePlpAccount(pool, username, password, tenant, unitCode) : userResult.recordset[0];
        if (!user || !user.TrangThai) {
            return res.status(401).json({ message: 'Invalid account' });
        }

        /* 2️⃣ Check password */
        // const validPassword = await argon2.verify(user.PasswordHash, password);
        // if (!validPassword) {
        //     return res.status(401).json({ message: 'Invalid password' });
        // }

        const passwordHash = isPlp ? null : md5(password);
        if (!isPlp && passwordHash !== user.PasswordHash) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        /* 3️⃣ Lấy roles */
        const { roles, permissions, managedBoPhanIds } = await loadAuthorization(pool, user);

        /* 5️⃣ Tạo JWT */
        const token = jwt.sign(
            {
                userId: user.Id,
                username: user.Username,
                boPhanId: user.BoPhanId,
                managedBoPhanIds,
                roles,
                permissions,
                tenant
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
                permissions,
                tenant
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
