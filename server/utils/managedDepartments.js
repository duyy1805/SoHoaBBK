const sql = require("mssql");

const normalizeDepartmentIds = (values) => [...new Set(
    (Array.isArray(values) ? values : [])
        .map(Number)
        .filter((value) => Number.isInteger(value) && value > 0)
)];

const getManagedDepartmentIds = async (executor, userId, primaryDepartmentId = null) => {
    const ids = [];
    const primaryId = Number(primaryDepartmentId);
    if (Number.isInteger(primaryId) && primaryId > 0) ids.push(primaryId);
    if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) return ids;

    const result = await new sql.Request(executor)
        .input("UserId", sql.Int, Number(userId))
        .query(`
            SELECT mapping.BoPhanId
            FROM dbo.USER_BO_PHAN_QUAN_LY mapping
            JOIN dbo.DM_BO_PHAN department ON department.Id=mapping.BoPhanId
            WHERE mapping.UserId=@UserId
              AND mapping.IsActive=1
              AND ISNULL(department.TrangThai,1)=1
        `);
    return normalizeDepartmentIds([...ids, ...(result.recordset || []).map((row) => row.BoPhanId)]);
};

const canLeadDepartment = async (executor, user, departmentId) => {
    const targetId = Number(departmentId);
    if (!Number.isInteger(targetId) || targetId <= 0) return false;
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const isLead = roles.some((role) => String(role || "").toUpperCase().startsWith("TP_"));
    if (!isLead) return false;
    const ids = await getManagedDepartmentIds(executor, user?.userId, user?.boPhanId);
    return ids.includes(targetId);
};

module.exports = { normalizeDepartmentIds, getManagedDepartmentIds, canLeadDepartment };
