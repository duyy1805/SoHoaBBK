const sql = require("mssql");
const { canLeadDepartment } = require("./managedDepartments");

const normalizeIds = (values) => [...new Set((Array.isArray(values) ? values : [])
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0))];

const getRecipientDepartments = async (executor, bienBanId) => {
    const result = await new sql.Request(executor)
        .input("BienBanId", sql.Int, Number(bienBanId))
        .query(`
            SELECT recipient.Id, recipient.BoPhanId,
                department.MaBoPhan, department.TenBoPhan,
                recipient.CreatedBy, recipient.CreatedAt
            FROM dbo.BIEN_BAN_BO_PHAN_NHAN recipient
            JOIN dbo.DM_BO_PHAN department ON department.Id=recipient.BoPhanId
            WHERE recipient.BienBanId=@BienBanId
            ORDER BY department.MaBoPhan, department.TenBoPhan
        `);
    return result.recordset || [];
};

const loadRecipientDepartmentMap = async (executor, bienBanIds) => {
    const ids = normalizeIds(bienBanIds);
    const map = new Map();
    if (!ids.length) return map;
    const result = await new sql.Request(executor)
        .input("BienBanIds", sql.NVarChar(sql.MAX), ids.join(","))
        .query(`
            SELECT recipient.BienBanId, recipient.BoPhanId,
                department.MaBoPhan, department.TenBoPhan
            FROM dbo.BIEN_BAN_BO_PHAN_NHAN recipient
            JOIN dbo.DM_BO_PHAN department ON department.Id=recipient.BoPhanId
            WHERE recipient.BienBanId IN (
                SELECT TRY_CONVERT(int,[value]) FROM STRING_SPLIT(@BienBanIds,',')
            )
            ORDER BY department.MaBoPhan, department.TenBoPhan
        `);
    for (const row of result.recordset || []) {
        const key = Number(row.BienBanId);
        const values = map.get(key) || [];
        values.push({
            id: Number(row.BoPhanId),
            BoPhanId: Number(row.BoPhanId),
            maBoPhan: row.MaBoPhan || null,
            tenBoPhan: row.TenBoPhan || null,
            MaBoPhan: row.MaBoPhan || null,
            TenBoPhan: row.TenBoPhan || null
        });
        map.set(key, values);
    }
    return map;
};

const getRecipientBienBanIds = async (executor, departmentIds, loaiBienBan = null) => {
    const ids = normalizeIds(departmentIds);
    if (!ids.length) return [];
    const result = await new sql.Request(executor)
        .input("DepartmentIds", sql.NVarChar(sql.MAX), ids.join(","))
        .input("LoaiBienBan", sql.NVarChar(30), loaiBienBan)
        .query(`
            SELECT DISTINCT recipient.BienBanId
            FROM dbo.BIEN_BAN_BO_PHAN_NHAN recipient
            JOIN dbo.BIEN_BAN_KIEM bb ON bb.Id=recipient.BienBanId
            WHERE recipient.BoPhanId IN (
                SELECT TRY_CONVERT(int,[value]) FROM STRING_SPLIT(@DepartmentIds,',')
            )
              AND (@LoaiBienBan IS NULL OR bb.LoaiBienBan=@LoaiBienBan)
        `);
    return (result.recordset || []).map((row) => Number(row.BienBanId));
};

const getRecipientManageAccess = async (executor, bienBanId, user) => {
    const result = await new sql.Request(executor)
        .input("BienBanId", sql.Int, Number(bienBanId))
        .query(`
            SELECT TOP 1 bb.Id, bb.NguoiLapId,
                COALESCE(bb.BoPhanTaoId, creator.BoPhanId) AS BoPhanTaoId
            FROM dbo.BIEN_BAN_KIEM bb
            LEFT JOIN dbo.USERS creator ON creator.Id=bb.NguoiLapId
            WHERE bb.Id=@BienBanId
        `);
    const record = result.recordset?.[0];
    if (!record) return { exists: false, canManage: false };
    const isAdmin = Array.isArray(user?.roles) && user.roles.some((role) =>
        String(role || "").toUpperCase() === "ADMIN"
    );
    const canManage = isAdmin || Number(record.NguoiLapId) === Number(user?.userId) ||
        await canLeadDepartment(executor, user, record.BoPhanTaoId);
    return { exists: true, canManage, record };
};

module.exports = {
    normalizeRecipientDepartmentIds: normalizeIds,
    getRecipientDepartments,
    loadRecipientDepartmentMap,
    getRecipientBienBanIds,
    getRecipientManageAccess
};
