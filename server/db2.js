const sql = require('mssql');

const config = {
    server: process.env.DB2_SERVER || process.env.DB_SERVER,
    database: process.env.DB2_DATABASE || 'TAG_Duy',
    user: process.env.DB2_USER || process.env.DB_USER,
    password: process.env.DB2_PASSWORD || process.env.DB_PASSWORD,
    port: Number(process.env.DB2_PORT || 3402),
    options: {
        encrypt: false,
        trustedConnection: process.env.DB2_TRUSTED_CONNECTION === 'true',
        enableArithAbort: process.env.DB2_ENABLE_ARITHABORT === 'true',
        trustServerCertificate: true,
        useUTC: false,
        cryptoCredentialsDetails: { servername: undefined }
    }
};

let activePoolPromise;
const getPoolPromise = () => {
    if (!activePoolPromise) {
        activePoolPromise = new sql.ConnectionPool(config).connect()
            .then((pool) => {
                console.log('SQL Server PLP (3402.TAG_Duy) is connected');
                return pool;
            })
            .catch((error) => {
                activePoolPromise = null;
                console.error('DB2 Connection Failed:', error);
                throw error;
            });
    }
    return activePoolPromise;
};

const poolPromise = {
    then(onFulfilled, onRejected) { return getPoolPromise().then(onFulfilled, onRejected); },
    catch(onRejected) { return getPoolPromise().catch(onRejected); },
    finally(onFinally) { return getPoolPromise().finally(onFinally); }
};

module.exports = { poolPromise, getPoolPromise };
