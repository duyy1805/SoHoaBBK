const sql = require("mssql");

const EXECUTIVE_APPROVAL_PERMISSION = "XAC_NHAN_BAN_GIAM_DOC";

const hasRole = (user, roleCode) => Array.isArray(user?.roles) &&
    user.roles.some((role) => String(role || "").toUpperCase() === roleCode);

const hasPermission = (user, permissionCode) => Array.isArray(user?.permissions) &&
    user.permissions.includes(permissionCode);

const canActAsExecutive = (user) => hasRole(user, "ADMIN") ||
    hasPermission(user, EXECUTIVE_APPROVAL_PERMISSION);

const normalizeExecutiveDecision = (value) => {
    const decision = String(value || "").trim().toUpperCase();
    return ["APPROVE", "RETURN"].includes(decision) ? decision : null;
};

const isExecutiveApprovalTarget = (record) =>
    record?.MauPhieuVersion === "V01" && record?.LoaiBienBan !== "SXBT" &&
    Boolean(record?.RequiresExecutiveApproval);

const getExecutiveNextStatus = (decision) =>
    decision === "APPROVE" ? "CHO_THEO_DOI" : "TRA_LAI_CHINH_SUA";

const loadExecutiveApprovalHistory = async (pool, bienBanId) => {
    const result = await pool.request()
        .input("BienBanId", sql.Int, Number(bienBanId))
        .query(`
            SELECT approval.Id,approval.BienBanId,approval.ReviewRound,
                approval.Decision,approval.Reason,approval.ActedBy,approval.ActedAt,
                actor.FullName AS ActedByName
            FROM dbo.BIEN_BAN_BGD_APPROVAL approval
            LEFT JOIN dbo.USERS actor ON actor.Id=approval.ActedBy
            WHERE approval.BienBanId=@BienBanId
            ORDER BY approval.ReviewRound DESC,approval.Id DESC
        `);
    return result.recordset || [];
};

module.exports = {
    EXECUTIVE_APPROVAL_PERMISSION,
    canActAsExecutive,
    normalizeExecutiveDecision,
    isExecutiveApprovalTarget,
    getExecutiveNextStatus,
    loadExecutiveApprovalHistory
};
