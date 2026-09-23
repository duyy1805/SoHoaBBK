require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const sql = require('mssql');
const { poolPromise } = require('../db');

const migrationDirectory = path.join(__dirname, '..', 'sql', 'migrations');
const splitBatches = (content) => content.split(/^\s*GO\s*;?\s*$/gim).filter((batch) => batch.trim());

async function main() {
    const pool = await poolPromise;
    await pool.request().query(`IF OBJECT_ID(N'dbo.SCHEMA_MIGRATIONS',N'U') IS NULL
        CREATE TABLE dbo.SCHEMA_MIGRATIONS(MigrationName nvarchar(255) NOT NULL PRIMARY KEY,Checksum char(64) NULL,AppliedAt datetime2 NOT NULL DEFAULT SYSDATETIME());
        IF COL_LENGTH(N'dbo.SCHEMA_MIGRATIONS',N'Checksum') IS NULL ALTER TABLE dbo.SCHEMA_MIGRATIONS ADD Checksum char(64) NULL;`);
    const files = (await fs.readdir(migrationDirectory)).filter((name) => /^\d.*\.sql$/i.test(name) && !/\.rollback\.sql$/i.test(name)).sort();
    for (const file of files) {
        const applied = await pool.request().input('Name', sql.NVarChar(255), file)
            .query('SELECT 1 Applied FROM dbo.SCHEMA_MIGRATIONS WHERE MigrationName=@Name');
        if (applied.recordset.length) continue;
        const content = await fs.readFile(path.join(migrationDirectory, file), 'utf8');
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            for (const batch of splitBatches(content)) await new sql.Request(transaction).batch(batch);
            await new sql.Request(transaction)
                .input('Name', sql.NVarChar(255), file)
                .input('Checksum', sql.Char(64), crypto.createHash('sha256').update(content).digest('hex'))
                .query('IF NOT EXISTS(SELECT 1 FROM dbo.SCHEMA_MIGRATIONS WHERE MigrationName=@Name) INSERT dbo.SCHEMA_MIGRATIONS(MigrationName,Checksum) VALUES(@Name,@Checksum)');
            await transaction.commit();
            console.log(`Applied ${file}`);
        } catch (error) {
            await transaction.rollback();
            throw Object.assign(error, { message: `${file}: ${error.message}` });
        }
    }
    await pool.close();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
