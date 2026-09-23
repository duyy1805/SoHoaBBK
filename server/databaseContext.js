const { AsyncLocalStorage } = require('async_hooks');
const { poolPromise: z76PoolPromise } = require('./db');
const { poolPromise: plpPoolPromise } = require('./db2');

const context = new AsyncLocalStorage();
const normalizeTenant = (value) => String(value || 'Z76').trim().toUpperCase() === 'PLP' ? 'PLP' : 'Z76';
const getTenant = () => normalizeTenant(context.getStore()?.tenant);
const getPoolPromise = () => getTenant() === 'PLP' ? plpPoolPromise : z76PoolPromise;

// Thenable động: các route cũ vẫn có thể `await poolPromise`, nhưng pool được
// chọn tại thời điểm request thay vì tại thời điểm require module.
const poolPromise = {
    then(onFulfilled, onRejected) {
        return getPoolPromise().then(onFulfilled, onRejected);
    },
    catch(onRejected) {
        return getPoolPromise().catch(onRejected);
    },
    finally(onFinally) {
        return getPoolPromise().finally(onFinally);
    }
};

const withTenant = (tenant) => (req, res, next) => {
    const normalized = normalizeTenant(tenant);
    context.run({ tenant: normalized }, () => {
        req.tenant = normalized;
        next();
    });
};

module.exports = { poolPromise, getPoolPromise, getTenant, withTenant };
