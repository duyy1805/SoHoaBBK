const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { uploadRoot, privateUploadRoot, logRoot } = require('./config/storage');
const { requireMatchingTenant } = require('./middlewares/tenant.middleware');
const { poolPromise, withTenant } = require('./databaseContext');

// Tạo thư mục uploads nếu chưa có
[uploadRoot, privateUploadRoot, logRoot].forEach((directory) => {
    fs.mkdirSync(directory, { recursive: true });
});

const authRouter = require('./routes/auth');
const hrRouter = require('./routes/hr')
const app = express();
app.use(express.json());
const corsOrigins = String(process.env.CORS_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);
app.use(cors(corsOrigins.length ? { origin: corsOrigins, credentials: true } : undefined));
const healthHandler = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT
                DB_NAME() AS AppDatabase,
                CASE WHEN DB_ID(N'TAG_QLSX') IS NULL THEN 0 ELSE 1 END AS HasQlsx,
                CASE WHEN DB_ID(N'TAG_QTKD') IS NULL THEN 0 ELSE 1 END AS HasQtkd,
                CASE WHEN DB_ID(N'TAG_System') IS NULL THEN 0 ELSE 1 END AS HasSystem
        `);
        const checks = result.recordset[0];
        const expectedDatabase = req.tenant === 'PLP' ? (process.env.DB2_DATABASE || 'TAG_Duy') : process.env.DB_DATABASE;
        const healthy = checks.AppDatabase === expectedDatabase
            && Number(checks.HasQlsx) === 1 && Number(checks.HasQtkd) === 1 && Number(checks.HasSystem) === 1;
        res.status(healthy ? 200 : 503).json({ healthy, tenant: req.tenant, databases: checks });
    } catch (error) {
        res.status(503).json({ healthy: false, tenant: req.tenant, message: error.message });
    }
};

const sharedRouters = {
    admin: require('./routes/admin'),
    congDoan: require('./routes/phieuKiemCongDoan'),
    phieuKiem: require('./routes/phieuKiem'),
    bienBanAttachments: require('./routes/bienBanAttachments'),
    bienBan: require('./routes/bienBan'),
    lookup: require('./routes/lookup.routes'),
    notifications: require('./routes/notifications')
};

const createApiRouter = ({ plp = false } = {}) => {
    const router = express.Router();
    router.use(withTenant(plp ? 'PLP' : 'Z76'));
    router.use(requireMatchingTenant);
    router.get('/health', healthHandler);
    router.use('/auth', authRouter);
    router.use('/admin', sharedRouters.admin);
    router.use('/phieu-kiem/cong-doan', sharedRouters.congDoan);
    router.use('/phieu-kiem', sharedRouters.phieuKiem);
    router.use('/bien-ban', sharedRouters.bienBanAttachments);
    router.use('/bien-ban', sharedRouters.bienBan);
    router.use('/lookup', sharedRouters.lookup);
    router.use('/notifications', sharedRouters.notifications);
    if (!plp) {
        router.use('/hr', hrRouter);
        router.use('/doi-tra-phoi-loi', require('./routes/doiTraPhoiLoi'));
        router.use('/doi-tra-phoi-loi', require('./routes/doiTraPhoiLoiKph'));
        router.use('/bien-ban-sxbt', require('./routes/bienBanSxbt'));
        router.use('/phieu-xu-ly-khong-phu-hop', require('./routes/phieuXuLyKhongPhuHop'));
        router.use('/dashboard', require('./routes/dashboard'));
        router.use('/work-center', require('./routes/workCenter'));
    }
    return router;
};

app.use('/api/plp', createApiRouter({ plp: true }));
app.use('/api', createApiRouter());

app.use('/uploads', express.static(uploadRoot));

app.get('/', (req, res) => res.json({ service: 'SoHoaBBK', tenants: ['Z76', 'PLP'] }));

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => console.log(`Server running on port ${PORT} (Z76 + PLP)`));
