require('dotenv').config();
const sql = require('mssql');

const connection = (prefix, fallbackPort) => ({
    server: process.env[`${prefix}_DB_SERVER`] || process.env.DB_SERVER,
    database: 'TAG_Duy',
    user: process.env[`${prefix}_DB_USER`] || process.env.DB_USER,
    password: process.env[`${prefix}_DB_PASSWORD`] || process.env.DB_PASSWORD,
    port: Number(process.env[`${prefix}_DB_PORT`] || fallbackPort),
    options: { encrypt: false, trustServerCertificate: true, useUTC: false }
});

async function main() {
    const source = await new sql.ConnectionPool(connection('Z76', 3400)).connect();
    const target = await new sql.ConnectionPool({
        server: process.env.DB2_SERVER || process.env.DB_SERVER,
        database: process.env.DB2_DATABASE || 'TAG_Duy',
        user: process.env.DB2_USER || process.env.DB_USER,
        password: process.env.DB2_PASSWORD || process.env.DB_PASSWORD,
        port: Number(process.env.DB2_PORT || 3402),
        options: { encrypt: false, trustServerCertificate: true, useUTC: false }
    }).connect();
    try {
        const result = await source.request().query(`
            SELECT MaLoi,TenLoi,DefectType,TrangThai,MoTa,GhiChu,PhanHe,MaNhomLoi,
                   PhamViApDung,ThiTruong,ThuTu,TenSanPham,ChungLoai,PhuongAnXuLy
            FROM dbo.DM_DEFECT WHERE ISNULL(TrangThai,1)=1
        `);
        for (const row of result.recordset) {
            await target.request()
                .input('Json', sql.NVarChar(sql.MAX), JSON.stringify(row))
                .query(`
                    DECLARE @MaLoi nvarchar(50)=JSON_VALUE(@Json,'$.MaLoi');
                    DECLARE @DefectType nvarchar(20)=JSON_VALUE(@Json,'$.DefectType');
                    DECLARE @PhanHe nvarchar(20)=JSON_VALUE(@Json,'$.PhanHe');
                    IF NOT EXISTS(SELECT 1 FROM dbo.DM_DEFECT WHERE ISNULL(MaLoi,N'')=ISNULL(@MaLoi,N'') AND ISNULL(DefectType,N'')=ISNULL(@DefectType,N'') AND ISNULL(PhanHe,N'')=ISNULL(@PhanHe,N''))
                    INSERT dbo.DM_DEFECT(MaLoi,TenLoi,DefectType,TrangThai,MoTa,GhiChu,PhanHe,MaNhomLoi,PhamViApDung,ThiTruong,ThuTu,TenSanPham,ChungLoai,PhuongAnXuLy,CreatedAt)
                    SELECT @MaLoi,JSON_VALUE(@Json,'$.TenLoi'),@DefectType,1,JSON_VALUE(@Json,'$.MoTa'),JSON_VALUE(@Json,'$.GhiChu'),@PhanHe,
                           JSON_VALUE(@Json,'$.MaNhomLoi'),JSON_VALUE(@Json,'$.PhamViApDung'),JSON_VALUE(@Json,'$.ThiTruong'),TRY_CONVERT(int,JSON_VALUE(@Json,'$.ThuTu')),
                           JSON_VALUE(@Json,'$.TenSanPham'),JSON_VALUE(@Json,'$.ChungLoai'),JSON_VALUE(@Json,'$.PhuongAnXuLy'),SYSDATETIME();
                `);
        }
        console.log(`Seeded ${result.recordset.length} defect definitions into PLP`);
    } finally {
        await Promise.all([source.close(), target.close()]);
    }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
