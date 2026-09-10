const express = require("express");
const sql = require("mssql");

const { poolPromise } = require("../db");
const authenticateToken = require("../middlewares/auth.middleware");
const { getManagedDepartmentIds } = require("../utils/managedDepartments");
const { loadBienBanListSummaries, mergeBienBanListSummary } = require("../utils/bienBanListSummary");
const { canViewKphListItem } = require("../utils/kphListVisibility");
const { EXECUTIVE_APPROVAL_PERMISSION, canActAsExecutive } = require("../utils/executiveApproval");

const router = express.Router();

const hasRole = (user, roleCode) => Array.isArray(user?.roles) &&
    user.roles.some((role) => String(role || "").toUpperCase() === roleCode);
const hasLeadRole = (user) => Array.isArray(user?.roles) &&
    user.roles.some((role) => String(role || "").toUpperCase().startsWith("TP_"));
const hasPermission = (user, permissionCode) => Array.isArray(user?.permissions) &&
    user.permissions.includes(permissionCode);
const isAdmin = (user) => hasRole(user, "ADMIN");
const hasGlobalKphVisibility = (user) => isAdmin(user) ||
    ["QUAN_TRI_DM", "XAC_NHAN_NGUOI_XU_LY", "KET_LUAN", EXECUTIVE_APPROVAL_PERMISSION]
        .some((code) => hasPermission(user, code));

const listNormalRecords = async (pool, user) => {
    const request = pool.request();
    const isManager = hasPermission(user, "QUAN_TRI_DM") ||
        hasPermission(user, "XAC_NHAN_NGUOI_XU_LY") ||
        hasPermission(user, EXECUTIVE_APPROVAL_PERMISSION) || hasLeadRole(user);
    if (!isManager) {
        request.input("UserId", sql.Int, user.userId);
        request.input("BoPhanId", sql.Int, user.boPhanId);
    }
    const result = await request.execute("sp_BienBan_GetList");
    return result.recordset || [];
};

const listStandaloneRecords = async (pool, user, managedDepartmentIds) => {
    const rowsById = new Map();
    const mergePersonalizedRow = (item) => {
        const id = Number(item.BienBanId);
        const current = rowsById.get(id);
        if (!current) {
            rowsById.set(id, item);
            return;
        }
        rowsById.set(id, {
            ...current,
            CanCurrentUserAct: Boolean(current.CanCurrentUserAct) || Boolean(item.CanCurrentUserAct),
            MyDepartmentOpinionStatus: current.MyDepartmentOpinionStatus || item.MyDepartmentOpinionStatus || null,
            MyPendingSuggestedUserId: current.MyPendingSuggestedUserId || item.MyPendingSuggestedUserId || null,
            MyPendingSuggestedUserName: current.MyPendingSuggestedUserName || item.MyPendingSuggestedUserName || null
        });
    };

    for (const departmentId of managedDepartmentIds) {
        const result = await pool.request()
            .input("UserId", sql.Int, user.userId)
            .input("BoPhanId", sql.Int, departmentId)
            .input("IsDepartmentLead", sql.Bit, hasRole(user, "TP_BP"))
            .execute("sp_PhieuXuLyKPH_GetList");
        (result.recordset || []).forEach(mergePersonalizedRow);
    }

    if (hasGlobalKphVisibility(user)) {
        const globalResult = await pool.request().execute("sp_PhieuXuLyKPH_GetList");
        return (globalResult.recordset || []).map((item) => {
            const personalized = rowsById.get(Number(item.BienBanId));
            if (!personalized) return item;
            return {
                ...item,
                CanCurrentUserAct: Boolean(personalized.CanCurrentUserAct),
                MyDepartmentOpinionStatus: personalized.MyDepartmentOpinionStatus || null,
                MyPendingSuggestedUserId: personalized.MyPendingSuggestedUserId || null,
                MyPendingSuggestedUserName: personalized.MyPendingSuggestedUserName || null
            };
        });
    }

    return [...rowsById.values()];
};

const loadBasicMeta = async (pool, ids) => {
    if (!ids.length) return new Map();
    const result = await pool.request()
        .input("BienBanIds", sql.NVarChar(sql.MAX), ids.join(","))
        .query(`
            SELECT bb.Id AS BienBanId, bb.LoaiBienBan,
                ISNULL(bb.MauPhieuVersion, N'V00') AS MauPhieuVersion,
                bb.TrangThai, bb.CreatedAt, bb.NguoiLapId,
                bb.OpinionDepartmentsConfirmedAt,
                bb.CreatorConfirmedAt AS FollowUpReadyAt,
                ISNULL(bb.RequiresExecutiveApproval,0) AS RequiresExecutiveApproval,
                COALESCE(bb.BoPhanTaoId, creator.BoPhanId) AS CreatorBoPhanId,
                department.MaBoPhan AS MaBoPhanTao,
                department.TenBoPhan AS TenBoPhanTao,
                inspection.LoaiKiemId,
                inspectionType.MaLoai AS MaLoaiKiem,
                inspectionType.TenLoai AS TenLoaiKiem
            FROM dbo.BIEN_BAN_KIEM bb
            LEFT JOIN dbo.USERS creator ON creator.Id = bb.NguoiLapId
            LEFT JOIN dbo.DM_BO_PHAN department
                ON department.Id = COALESCE(bb.BoPhanTaoId, creator.BoPhanId)
            LEFT JOIN dbo.PHIEU_KIEM inspection ON inspection.Id = bb.PhieuKiemId
            LEFT JOIN dbo.DM_LOAI_KIEM inspectionType ON inspectionType.Id = inspection.LoaiKiemId
            WHERE bb.Id IN (
                SELECT TRY_CONVERT(int, [value]) FROM STRING_SPLIT(@BienBanIds, N',')
            )
        `);
    return new Map((result.recordset || []).map((row) => [Number(row.BienBanId), row]));
};

const emptyWorkMeta = () => ({ metadata: new Map(), departments: new Map(), defects: new Map() });

const loadWorkMeta = async (pool, ids, user, managedDepartmentIds) => {
    if (!ids.length) return emptyWorkMeta();
    try {
        const result = await pool.request()
            .input("BienBanIds", sql.NVarChar(sql.MAX), ids.join(","))
            .input("UserId", sql.Int, Number(user.userId) || null)
            .input("ManagedBoPhanIds", sql.NVarChar(sql.MAX), managedDepartmentIds.join(","))
            .execute("sp_KphWorkCenter_GetListMeta");
        const metadata = new Map((result.recordsets?.[0] || []).map((row) => [Number(row.BienBanId), row]));
        const departments = new Map();
        for (const row of result.recordsets?.[1] || []) {
            const key = Number(row.BienBanId);
            const values = departments.get(key) || [];
            values.push({
                departmentId: Number(row.DepartmentId) || null,
                code: row.DepartmentCode || null,
                name: row.DepartmentName || row.DepartmentCode || "Bộ phận",
                status: row.ProgressStatus || "WAITING_STEP",
                responsibleUserName: row.ResponsibleUserName || null,
                updatedAt: row.UpdatedAt || null
            });
            departments.set(key, values);
        }
        const defects = new Map((result.recordsets?.[2] || []).map((row) => [Number(row.BienBanId), row]));
        return { metadata, departments, defects };
    } catch (error) {
        console.warn("Work Center metadata unavailable; returning base list:", error.message);
        return emptyWorkMeta();
    }
};

const getRecordType = (item) => {
    const status = String(item.TrangThai || "").toUpperCase();
    if (item.LoaiBienBan === "SXBT" || Number(item.LoaiKiemId) === 4 || status.startsWith("BB_SXBT")) {
        return "SXBT";
    }
    return item.MauPhieuVersion === "V01" ? "KPH_V01" : "BIEN_BAN_V00";
};

router.get("/", authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const managedDepartmentIds = await getManagedDepartmentIds(pool, req.user.userId, req.user.boPhanId);
        const [normalRows, standaloneRows] = await Promise.all([
            listNormalRecords(pool, req.user),
            listStandaloneRecords(pool, req.user, managedDepartmentIds)
        ]);

        const standaloneIds = new Set(standaloneRows.map((row) => Number(row.BienBanId)));
        const rowsById = new Map();
        normalRows.forEach((row) => rowsById.set(Number(row.BienBanId), row));
        standaloneRows.forEach((row) => rowsById.set(Number(row.BienBanId), row));
        const ids = [...rowsById.keys()].filter((id) => Number.isInteger(id) && id > 0);
        const dtpResult = await pool.request()
            .input('UserId', sql.Int, Number(req.user.userId) || null)
            .input('ManagedIds', sql.NVarChar(sql.MAX), managedDepartmentIds.join(','))
            .input('CanViewAll', sql.Bit, hasGlobalKphVisibility(req.user))
            .query(`SELECT p.Id,p.SoPhieu,p.TrangThai,p.DinhMucTrangThai,p.CreatedAt,p.UpdatedAt,p.NguoiLapId,
                planRow.ProductCode,planRow.ProductName,planRow.OrderCode,planRow.PlanNo,
                CAST(CASE WHEN p.NguoiLapId=@UserId OR EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN y
                    WHERE y.PhieuId=p.Id AND y.IsActive=1 AND y.BoPhanId IN(SELECT TRY_CONVERT(INT,value) FROM STRING_SPLIT(@ManagedIds,',')))
                    OR EXISTS(SELECT 1 FROM dbo.USERS bu JOIN dbo.DM_BO_PHAN bd ON bd.Id=bu.BoPhanId WHERE bu.Id=@UserId AND UPPER(LTRIM(RTRIM(bd.MaBoPhan)))=N'B7')
                    OR (p.TrangThai=N'CHO_BGD_XAC_NHAN' AND @CanViewAll=1) THEN 1 ELSE 0 END AS BIT) CanCurrentUserAct
              FROM dbo.DOI_TRA_PHOI_LOI p JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId=p.Id
              WHERE p.TrangThai NOT IN(N'DA_HUY',N'HOAN_TAT') AND (@CanViewAll=1 OR p.NguoiLapId=@UserId OR EXISTS(SELECT 1 FROM dbo.USERS bu JOIN dbo.DM_BO_PHAN bd ON bd.Id=bu.BoPhanId WHERE bu.Id=@UserId AND UPPER(LTRIM(RTRIM(bd.MaBoPhan)))=N'B7') OR EXISTS(
                SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN y WHERE y.PhieuId=p.Id AND y.IsActive=1
                AND y.BoPhanId IN(SELECT TRY_CONVERT(INT,value) FROM STRING_SPLIT(@ManagedIds,','))))`);
        const dtpItems=(dtpResult.recordset||[]).map((item)=>({
            ...item,BienBanId:item.Id,SoBienBan:item.SoPhieu,recordKey:`DTP:${item.Id}`,
            recordSource:'DOI_TRA_PHOI_LOI',recordType:'DTP_KPH',detailRoute:`/doi-tra-phoi-loi/${item.Id}`,
            TenLoaiKiem:'Đổi trả phôi lỗi',TenSanPham:item.ProductName,MaSanPham:item.ProductCode,
            DepartmentProgress:[],DefectCount:0,AttachmentCount:0,ImageCount:0
        }));
        if (!ids.length) return res.json({ items: dtpItems, generatedAt: new Date().toISOString() });

        const [basicMeta, summaries, workMeta] = await Promise.all([
            loadBasicMeta(pool, ids),
            loadBienBanListSummaries(pool, ids),
            loadWorkMeta(pool, ids, req.user, managedDepartmentIds)
        ]);

        const items = ids.map((bienBanId) => {
            const base = rowsById.get(bienBanId) || {};
            const basic = basicMeta.get(bienBanId) || {};
            const metadata = workMeta.metadata.get(bienBanId) || {};
            const defectMeta = workMeta.defects.get(bienBanId) || {};
            const merged = mergeBienBanListSummary({ ...base, ...basic }, summaries.get(bienBanId));
            const recordSource = standaloneIds.has(bienBanId) || merged.LoaiBienBan === "STANDALONE"
                ? "KPH_STANDALONE" : "BIEN_BAN";
            const recordType = getRecordType(merged);
            const detailRoute = recordSource === "KPH_STANDALONE"
                ? `/phieu-xu-ly-khong-phu-hop/${bienBanId}`
                : recordType === "SXBT" ? `/bien-ban/sxbt/${bienBanId}` : `/bien-ban/${bienBanId}`;
            return {
                ...merged,
                CanCurrentUserAct: Boolean(merged.CanCurrentUserAct) ||
                    (merged.TrangThai === "CHO_BGD_XAC_NHAN" && canActAsExecutive(user)),
                BienBanId: bienBanId,
                recordKey: `${recordSource}:${bienBanId}`,
                bienBanId,
                recordSource,
                recordType,
                detailRoute,
                HasCritical: Boolean(defectMeta.HasCritical ?? metadata.HasCritical),
                DefectCount: Number(defectMeta.DefectCount ?? merged.DefectCount) || 0,
                TotalDefectQuantity: Number(defectMeta.TotalDefectQuantity ?? merged.TotalDefectQuantity) || 0,
                InspectionQuantity: defectMeta.InspectionQuantity == null ? null : Number(defectMeta.InspectionQuantity),
                HasMixedInspectionQuantity: Boolean(defectMeta.HasMixedInspectionQuantity),
                DefectRate: defectMeta.DefectRate == null ? null : Number(defectMeta.DefectRate),
                AttachmentCount: Number(metadata.AttachmentCount) || 0,
                ImageCount: Number(metadata.ImageCount) || 0,
                DueAt: metadata.DueAt || null,
                IsOverdue: Boolean(metadata.IsOverdue),
                ProposalSummary: metadata.ProposalSummary || null,
                DepartmentProgress: workMeta.departments.get(bienBanId) || []
            };
        }).filter((item) => canViewKphListItem(item, req.user, managedDepartmentIds));

        res.json({ items: [...items, ...dtpItems], generatedAt: new Date().toISOString() });
    } catch (error) {
        console.error("Get Work Center error:", error);
        res.status(500).json({ message: "Không tải được Trung tâm xử lý" });
    }
});

module.exports = router;
