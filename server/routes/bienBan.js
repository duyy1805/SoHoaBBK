const express = require("express");
const router = express.Router();
const sql = require("mssql");

const { poolPromise } = require("../db");
const { loadSignatureDataUrlMap } = require("../utils/signatureImage");
const {
    getBienBanFiles,
    deleteBienBanData,
    removeBienBanFiles
} = require("../services/kcsRecordDeletion.service");

const authenticateToken = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/permission.middleware");
const requireExactPermission = require("../middlewares/exactPermission.middleware");
const { getManagedDepartmentIds, canLeadDepartment } = require("../utils/managedDepartments");
const { loadBienBanListSummaries, mergeBienBanListSummary } = require("../utils/bienBanListSummary");
const { sortKphListRows } = require("../utils/kphListSorting");
const { loadKphSectionRows } = require("../utils/kphSectionRows");
const { loadInputInspectionSource } = require("../utils/inputInspectionSource");
const { canViewKphListItem } = require("../utils/kphListVisibility");

const hasPermission = (user, permissionCode) =>
    Array.isArray(user?.permissions) && user.permissions.includes(permissionCode);
const hasRole = (user, roleCode) => Array.isArray(user?.roles) &&
    user.roles.some((role) => String(role || "").toUpperCase() === roleCode);
const isAdmin = (user) => hasRole(user, "ADMIN");
const KPH_V01_CUSTOM_FIELDS = new Set([
    "TenBoPhan", "MaBoPhan", "TenSanPham", "MaSanPham", "MaTruyNguyen",
    "DonHang", "Lot", "SoLuongKPH", "DauTuan", "PhatHienTu", "MucDo",
    "SxbtMucCChuyenTraKH", "SxbtMucCXuLyTaiNhaMay"
]);

const hasStrictLeadRole = (user) => Array.isArray(user?.roles) &&
    user.roles.some((role) => String(role || "").toUpperCase().startsWith("TP_"));

const getKphV01FlowAccess = async (pool, bienBanId, user) => {
    const result = await pool.request()
        .input("BienBanId", sql.Int, bienBanId)
        .query(`
            SELECT TOP 1 bb.Id, bb.NguoiLapId, bb.TrangThai, bb.LoaiBienBan,
                ISNULL(bb.MauPhieuVersion, 'V00') AS MauPhieuVersion,
                COALESCE(bb.BoPhanTaoId, creator.BoPhanId) AS BoPhanTaoId,
                bb.OpinionDepartmentsConfirmedAt,
                bb.CreatorConfirmedAt,
                ISNULL(bb.ReviewRound,1) AS ReviewRound,
                bb.LastReturnedBy, bb.LastReturnedAt, bb.LastReturnReason,
                bb.ResubmittedBy, bb.ResubmittedAt
            FROM dbo.BIEN_BAN_KIEM bb
            LEFT JOIN dbo.USERS creator ON creator.Id = bb.NguoiLapId
            WHERE bb.Id = @BienBanId
        `);
    const record = result.recordset?.[0];
    if (!record) return { exists: false, canManage: false, record: null };

    const isKphV01 = record.MauPhieuVersion === "V01" && record.LoaiBienBan !== "SXBT";
    const isCreator = Number(record.NguoiLapId) === Number(user?.userId);
    const isCreatorDepartmentLead = await canLeadDepartment(pool, user, record.BoPhanTaoId);
    const canManage = isCreator || isCreatorDepartmentLead || isAdmin(user);
    const canEdit = isKphV01 && canManage && !record.CreatorConfirmedAt &&
        !["CHO_THEO_DOI", "HOAN_TAT"].includes(record.TrangThai) &&
        (!record.OpinionDepartmentsConfirmedAt || record.TrangThai === "TRA_LAI_CHINH_SUA");
    return {
        exists: true,
        isKphV01,
        canManage,
        canEdit,
        canResubmit: canEdit && record.TrangThai === "TRA_LAI_CHINH_SUA",
        record
    };
};

const getKphCustomFieldAccess = async (pool, bienBanId, user) => {
    const result = await pool.request()
        .input("BienBanId", sql.Int, bienBanId)
        .query(`
            SELECT TOP 1 bb.Id, bb.NguoiLapId, bb.TrangThai, bb.LoaiBienBan,
                ISNULL(bb.MauPhieuVersion, 'V00') AS MauPhieuVersion,
                COALESCE(bb.BoPhanTaoId, creator.BoPhanId) AS CreatorBoPhanId,
                bb.OpinionDepartmentsConfirmedAt, bb.CreatorConfirmedAt
            FROM dbo.BIEN_BAN_KIEM bb
            LEFT JOIN dbo.USERS creator ON creator.Id = bb.NguoiLapId
            WHERE bb.Id = @BienBanId
        `);
    const record = result.recordset?.[0];
    if (!record) return { exists: false, canEdit: false, record: null };
    const isCreator = Number(record.NguoiLapId) === Number(user?.userId);
    const isCreatorDepartmentLead = await canLeadDepartment(pool, user, record.CreatorBoPhanId);
    const canEdit = record.MauPhieuVersion === "V01" && !record.CreatorConfirmedAt &&
        !["CHO_THEO_DOI", "HOAN_TAT"].includes(record.TrangThai) &&
        (!record.OpinionDepartmentsConfirmedAt || record.TrangThai === "TRA_LAI_CHINH_SUA") &&
        (isCreator || isCreatorDepartmentLead || isAdmin(user));
    return { exists: true, canEdit, record };
};

const getKphSectionContributionAccess = async (pool, bienBanId, user, existingFlowAccess = null) => {
    const flowAccess = existingFlowAccess || await getKphV01FlowAccess(pool, bienBanId, user);
    if (!flowAccess.exists || !flowAccess.isKphV01) {
        return { ...flowAccess, canContribute: false, isAssignedDepartment: false, targetBoPhanId: null };
    }
    const managedDepartmentIds = await getManagedDepartmentIds(pool, user?.userId, user?.boPhanId);
    const assignmentResult = await pool.request()
        .input("BienBanId", sql.Int, bienBanId)
        .input("ManagedDepartmentIds", sql.NVarChar(sql.MAX), managedDepartmentIds.join(","))
        .input("PrimaryBoPhanId", sql.Int, Number(user?.boPhanId) || null)
        .query(`
            SELECT TOP 1 opinion.BoPhanId AS AssignedBoPhanId
            FROM dbo.XIN_Y_KIEN opinion
            WHERE opinion.BienBanId=@BienBanId AND ISNULL(opinion.IsActive,1)=1
              AND opinion.BoPhanId IN (
                  SELECT TRY_CONVERT(int,[value]) FROM STRING_SPLIT(@ManagedDepartmentIds,',')
              )
            ORDER BY CASE WHEN opinion.BoPhanId=@PrimaryBoPhanId THEN 0 ELSE 1 END, opinion.Id
        `);
    const assignedBoPhanId = Number(assignmentResult.recordset?.[0]?.AssignedBoPhanId) || null;
    const isAssignedDepartment = Boolean(assignedBoPhanId);
    const isFinalLocked = Boolean(flowAccess.record.CreatorConfirmedAt) ||
        ["CHO_THEO_DOI", "HOAN_TAT"].includes(flowAccess.record.TrangThai);
    const isReturned = flowAccess.record.TrangThai === "TRA_LAI_CHINH_SUA";
    const canContribute = !isFinalLocked && (
        flowAccess.canManage || (!isReturned && isAssignedDepartment)
    );
    return {
        ...flowAccess,
        canContribute,
        isAssignedDepartment,
        targetBoPhanId: isAssignedDepartment
            ? assignedBoPhanId
            : Number(flowAccess.record.BoPhanTaoId)
    };
};

const assertKphSectionContributionOpen = async (transaction, bienBanId, allowReturned = false) => {
    const result = await new sql.Request(transaction)
        .input("BienBanId", sql.Int, bienBanId)
        .query(`
            SELECT TOP 1 TrangThai,CreatorConfirmedAt
            FROM dbo.BIEN_BAN_KIEM WITH (UPDLOCK,HOLDLOCK)
            WHERE Id=@BienBanId
        `);
    const row = result.recordset?.[0];
    if (!row || row.CreatorConfirmedAt || ["CHO_THEO_DOI", "HOAN_TAT"].includes(row.TrangThai) ||
        (row.TrangThai === "TRA_LAI_CHINH_SUA" && !allowReturned)) {
        throw Object.assign(new Error("Biên bản không còn ở giai đoạn bổ sung mục 5, 6, 7"), { statusCode: 409 });
    }
};

const hasLeadRole = (user) => {
    return Array.isArray(user?.roles) && user.roles.some((role) =>
        String(role || "").toUpperCase().startsWith("TP_")
    );
};

const canManageDepartmentAssign = async (pool, user, boPhanId) => {
    if (isAdmin(user) || hasPermission(user, "XAC_NHAN_NGUOI_XU_LY")) {
        return true;
    }

    return canLeadDepartment(pool, user, boPhanId);
};

const getBienBanAssignRows = async (pool, bienBanId) => {
    const result = await pool.request()
        .input("BienBanId", sql.Int, bienBanId)
        .query(`
            SELECT
                a.Id,
                a.BoPhanId,
                bp.MaBoPhan,
                bp.TenBoPhan,
                a.NguoiXuLyId,
                u.FullName AS NguoiXuLy,
                a.AssignedToUserAt,
                CAST(ISNULL(a.IsBpsxSignature, 0) AS BIT) AS IsBpsxSignature
            FROM BIEN_BAN_ASSIGN a
            LEFT JOIN DM_BO_PHAN bp ON bp.Id = a.BoPhanId
            LEFT JOIN USERS u ON u.Id = a.NguoiXuLyId
            WHERE a.BienBanId = @BienBanId
            ORDER BY a.Id
        `);

    return result.recordset;
};

const snapshotSuggestedProductResponsibles = async (executor, bienBanId, opinionIds) => {
    const normalizedOpinionIds = [...new Set((opinionIds || []).map(Number)
        .filter((id) => Number.isInteger(id) && id > 0))];
    if (normalizedOpinionIds.length === 0) return;
    await new sql.Request(executor)
        .input("BienBanId", sql.Int, Number(bienBanId))
        .input("OpinionIds", sql.NVarChar(sql.MAX), normalizedOpinionIds.join(","))
        .query(`
        DECLARE @SanPhamId int;
        DECLARE @IsCongDoan bit = CASE WHEN EXISTS (
            SELECT 1
            FROM dbo.BIEN_BAN_KIEM targetBienBan
            INNER JOIN dbo.PHIEU_KIEM_CONG_DOAN_HEADER congDoanHeader
                ON congDoanHeader.PhieuKiemId = targetBienBan.PhieuKiemId
            WHERE targetBienBan.Id = @BienBanId
        ) THEN 1 ELSE 0 END;

        SELECT TOP (1) @SanPhamId=CASE
            WHEN @IsCongDoan = 1
                THEN TRY_CONVERT(int,localProductField.FieldValue)
            ELSE COALESCE(
                TRY_CONVERT(int,localProductField.FieldValue),
                inspection.SanPhamId,
                productByCode.Id
            )
        END
        FROM dbo.BIEN_BAN_KIEM bb
        LEFT JOIN dbo.PHIEU_KIEM inspection ON inspection.Id=bb.PhieuKiemId
        OUTER APPLY (
            SELECT TOP (1) customField.FieldValue
            FROM dbo.BienBan_CustomFields customField
            WHERE customField.BienBanId=bb.Id AND customField.FieldName=N'LocalProductId'
        ) localProductField
        OUTER APPLY (
            SELECT TOP (1) localProduct.Id
            FROM dbo.DM_SAN_PHAM localProduct
            WHERE localProduct.TrangThai=1
              AND localProduct.MaSanPham=(
                  SELECT TOP (1) cf.FieldValue
                  FROM dbo.BienBan_CustomFields cf
                  WHERE cf.BienBanId=bb.Id AND cf.FieldName=N'MaSanPham'
              )
        ) productByCode
        WHERE bb.Id=@BienBanId;

        IF @SanPhamId IS NOT NULL
        BEGIN
            UPDATE opinion
            SET SuggestedUserId=preferred.UserId,
                ProductResponsibleMappingId=preferred.MappingId,
                SuggestedAt=SYSDATETIME()
            FROM dbo.XIN_Y_KIEN opinion
            CROSS APPLY (
                SELECT TOP (1) mapping.Id AS MappingId,mapping.UserId
                FROM dbo.DM_SAN_PHAM_NGUOI_PHU_TRACH mapping
                JOIN dbo.USERS responsible ON responsible.Id=mapping.UserId
                WHERE mapping.SanPhamId=@SanPhamId
                  AND mapping.IsActive=1
                  AND ISNULL(responsible.TrangThai,0)=1
                  AND responsible.BoPhanId=opinion.BoPhanId
                ORDER BY mapping.AddedAt DESC,mapping.Id DESC
            ) preferred
            WHERE opinion.BienBanId=@BienBanId
              AND ISNULL(opinion.IsActive,1)=1
              AND opinion.SuggestedUserId IS NULL
              AND opinion.Id IN (
                  SELECT TRY_CONVERT(int,[value]) FROM STRING_SPLIT(@OpinionIds,',')
              );
        END;
    `);
};

const getKphBasicReadiness = async (pool, bienBanId) => {
    const headerResult = await pool.request()
        .input("BienBanId", sql.Int, bienBanId)
        .query(`
            SELECT TOP 1 NULLIF(LTRIM(RTRIM(bb.MoTaChung)),N'') AS MoTaChung,
                bb.LoaiBienBan,bb.PhieuKiemId,
                CASE WHEN EXISTS (
                    SELECT 1 FROM dbo.PHIEU_KIEM_CONG_DOAN_HEADER h
                    WHERE h.PhieuKiemId=bb.PhieuKiemId
                ) THEN 1 ELSE 0 END AS IsCongDoan
            FROM dbo.BIEN_BAN_KIEM bb
            WHERE bb.Id=@BienBanId
        `);
    const header = headerResult.recordset?.[0];
    if (!header) return { exists: false, moTaChung: null, defectCount: 0 };

    let defectCount = 0;
    if (header.LoaiBienBan === "STANDALONE") {
        const defectResult = await pool.request().input("BienBanId", sql.Int, bienBanId)
            .query("SELECT COUNT(*) AS DefectCount FROM dbo.BIEN_BAN_DEFECT WHERE BienBanId=@BienBanId");
        defectCount = Number(defectResult.recordset?.[0]?.DefectCount) || 0;
    } else if (header.PhieuKiemId) {
        const overrideResult = await pool.request().input("BienBanId", sql.Int, bienBanId)
            .query("SELECT COUNT(*) AS DefectCount FROM dbo.BIEN_BAN_DEFECT WHERE BienBanId=@BienBanId");
        const overrideCount = Number(overrideResult.recordset?.[0]?.DefectCount) || 0;
        if (overrideCount > 0) {
            return { exists: true, moTaChung: header.MoTaChung, defectCount: overrideCount };
        }
        const defectResult = await pool.request().input("BienBanId", sql.Int, bienBanId)
            .execute(header.IsCongDoan ? "sp_BienBan_CongDoan_GetDefects" : "sp_BienBan_GetDefects");
        defectCount = defectResult.recordset?.length || 0;
    }
    return { exists: true, moTaChung: header.MoTaChung, defectCount };
};

const getKphV01Data = async (pool, bienBanId, user) => {
    const result = await pool.request()
        .input("BienBanId", sql.Int, bienBanId)
        .query(`
            SELECT TOP 1
                ISNULL(bb.MauPhieuVersion, 'V00') AS MauPhieuVersion,
                bb.TrangThai, bb.LoaiBienBan, bb.NguoiLapId,
                ISNULL(bb.YeuCauChiPhi, 0) AS YeuCauChiPhi,
                ISNULL(bb.YeuCauHanhDong, 0) AS YeuCauHanhDong,
                COALESCE(bb.BoPhanTaoId, u.BoPhanId) AS BoPhanTaoId,
                CAST(CASE WHEN bb.OpinionDepartmentsConfirmedAt IS NULL THEN 0 ELSE 1 END AS bit)
                    AS OpinionDepartmentsConfirmed,
                bb.OpinionDepartmentsConfirmedAt,
                bb.CreatorConfirmedAt,
                bb.CreatorConfirmedBy,
                creatorConfirmer.FullName AS CreatorConfirmerName,
                ISNULL(bb.ReviewRound,1) AS ReviewRound,
                bb.LastReturnedBy, returner.FullName AS LastReturnedByName,
                bb.LastReturnedAt, bb.LastReturnReason,
                bb.ResubmittedBy, bb.ResubmittedAt,
                bp.MaBoPhan AS MaDonViTaoPhieu,
                bp.TenBoPhan AS DonViTaoPhieu
            FROM dbo.BIEN_BAN_KIEM bb
            LEFT JOIN dbo.USERS u ON u.Id = bb.NguoiLapId
            LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = COALESCE(bb.BoPhanTaoId, u.BoPhanId)
            LEFT JOIN dbo.USERS creatorConfirmer ON creatorConfirmer.Id=bb.CreatorConfirmedBy
            LEFT JOIN dbo.USERS returner ON returner.Id=bb.LastReturnedBy
            WHERE bb.Id = @BienBanId;

            SELECT
                yk.Id,
                yk.BoPhanId,
                COALESCE(bp.MaBoPhan, yk.BoPhan) AS MaBoPhan,
                COALESCE(bp.TenBoPhan, yk.BoPhan) AS TenBoPhan,
                yk.TrangThai,
                yk.ThuTu,
                CAST(ISNULL(yk.IsActive, 1) AS bit) AS IsActive,
                yk.CreatedBy,
                yk.CreatedAt,
                yk.RemovedBy,
                yk.RemovedAt,
                tl.LuaChon,
                tl.NoiDung,
                tl.NguoiTraLoiId,
                responder.FullName AS NguoiTraLoi,
                tl.ThoiGian,
                yk.OpinionSavedBy, opinionSaver.FullName AS OpinionSavedByName,
                yk.OpinionSavedAt, yk.OpinionReviewRound,
                yk.ConfirmedBy, confirmer.FullName AS ConfirmedByName,
                yk.ConfirmedAt, yk.ConfirmedReviewRound,
                yk.SuggestedUserId, suggestedUser.FullName AS SuggestedUserName,
                yk.SuggestedAt, responsibleMapping.AddedAt AS ProductResponsibleAddedAt,
                CAST(CASE WHEN NULLIF(LTRIM(RTRIM(tl.NoiDung)),N'') IS NOT NULL
                    AND yk.OpinionReviewRound=ISNULL(bb.ReviewRound,1) THEN 1 ELSE 0 END AS bit) AS HasOpinion,
                CAST(CASE WHEN yk.ConfirmedAt IS NOT NULL
                    AND yk.ConfirmedReviewRound=ISNULL(bb.ReviewRound,1) THEN 1 ELSE 0 END AS bit) AS HasConfirmed,
                yk.RowVersion
            FROM dbo.XIN_Y_KIEN yk
            JOIN dbo.BIEN_BAN_KIEM bb ON bb.Id=yk.BienBanId
            LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = yk.BoPhanId
            OUTER APPLY (
                SELECT TOP 1 response.*
                FROM dbo.TRA_LOI_Y_KIEN response
                WHERE response.XinYKienId = yk.Id
                ORDER BY response.ThoiGian DESC, response.Id DESC
            ) tl
            LEFT JOIN dbo.USERS responder ON responder.Id = tl.NguoiTraLoiId
            LEFT JOIN dbo.USERS opinionSaver ON opinionSaver.Id=yk.OpinionSavedBy
            LEFT JOIN dbo.USERS confirmer ON confirmer.Id=yk.ConfirmedBy
            LEFT JOIN dbo.USERS suggestedUser ON suggestedUser.Id=yk.SuggestedUserId
            LEFT JOIN dbo.DM_SAN_PHAM_NGUOI_PHU_TRACH responsibleMapping
                ON responsibleMapping.Id=yk.ProductResponsibleMappingId
            WHERE yk.BienBanId = @BienBanId
              AND ISNULL(yk.IsActive, 1) = 1
            ORDER BY yk.ThuTu, yk.Id;

            SELECT TOP 1
                td.Id,
                td.KetQua,
                td.PhieuKphMoiSo,
                td.GhiChu,
                td.NguoiTheoDoiId,
                u.FullName AS NguoiTheoDoi,
                td.ThoiGian
            FROM dbo.BIEN_BAN_THEO_DOI_DANH_GIA td
            LEFT JOIN dbo.USERS u ON u.Id = td.NguoiTheoDoiId
            WHERE td.BienBanId = @BienBanId;
        `);

    const meta = result.recordsets?.[0]?.[0] || { MauPhieuVersion: "V00" };
    const activeReview = Boolean(meta.OpinionDepartmentsConfirmed) &&
        !meta.CreatorConfirmedAt && !["TRA_LAI_CHINH_SUA", "CHO_THEO_DOI", "HOAN_TAT"].includes(meta.TrangThai);
    const managedDepartmentIds = await getManagedDepartmentIds(pool, user?.userId, user?.boPhanId);
    const sameDepartment = (departmentId) => managedDepartmentIds.includes(Number(departmentId));
    const specialistOpinions = (result.recordsets?.[1] || []).map((opinion) => {
        const ownsDepartment = sameDepartment(opinion.BoPhanId);
        const canSave = activeReview && !opinion.HasConfirmed && (isAdmin(user) || ownsDepartment);
        const canLeadAct = canSave && Boolean(opinion.HasOpinion) &&
            (isAdmin(user) || (ownsDepartment && hasStrictLeadRole(user)));
        return {
            ...opinion,
            HasResponded: Boolean(opinion.HasConfirmed),
            CanSaveOpinion: canSave,
            CanConfirmOpinion: canLeadAct,
            CanReturn: canLeadAct
        };
    });
    return {
        meta,
        specialistOpinions,
        followUpEvaluation: result.recordsets?.[2]?.[0] || null
    };
};

/* =========================================================
   GET /bien-ban
   Permission : XEM_BIEN_BAN
========================================================= */

router.get(
    "/",
    authenticateToken,
    // authorize("XEM_BIEN_BAN"),
    async (req, res) => {
        try {

            const pool = await poolPromise;
            const request = pool.request();

            // Lọc danh sách biên bản theo quyền hạn: 
            // Nếu không có quyền quản trị (QUAN_TRI_DM), không có quyền phân công, và không phải Trưởng phòng (TP)
            // thì chỉ xem biên bản liên quan đến cá nhân/bộ phận
            const isManager = req.user.permissions.includes("QUAN_TRI_DM") ||
                req.user.permissions.includes("XAC_NHAN_NGUOI_XU_LY") ||
                hasLeadRole(req.user);

            if (!isManager) {
                request.input("UserId", sql.Int, req.user.userId);
                request.input("BoPhanId", sql.Int, req.user.boPhanId);
            }

            const result = await request.execute("sp_BienBan_GetList");
            const rows = result.recordset || [];

            if (rows.length === 0) {
                return res.json(rows);
            }

            const bienBanIds = [...new Set(
                rows
                    .map((item) => Number(item.BienBanId))
                    .filter((id) => Number.isInteger(id) && id > 0)
            )];

            if (bienBanIds.length === 0) {
                return res.json(rows);
            }

            // Không dùng sp_BienBan_GetListProgress ở đây: SP này tổng hợp lại cả
            // luồng thường và SXBT bằng nhiều CTE lồng nhau, dễ vượt request timeout
            // khi tài khoản quản lý được trả về toàn bộ danh sách. Tiến độ biên bản
            // thường được tính ở truy vấn bên dưới; phần này chỉ cần lấy các bước SXBT.
            const sxbtProgressResult = await pool.request()
                .input("BienBanIds", sql.NVarChar(sql.MAX), bienBanIds.join(","))
                .query(`
                    SELECT
                        step.BienBanId,
                        step.BoPhanId,
                        step.TrangThai,
                        step.StepOrder,
                        department.MaBoPhan,
                        department.TenBoPhan
                    FROM dbo.BIEN_BAN_SXBT_CONFIRM_STEP step
                    LEFT JOIN dbo.DM_BO_PHAN department ON department.Id = step.BoPhanId
                    WHERE step.BienBanId IN (
                        SELECT TRY_CONVERT(int, [value])
                        FROM STRING_SPLIT(@BienBanIds, ',')
                    )
                    ORDER BY step.BienBanId, step.StepOrder, step.Id
                `);

            // sp_BienBan_GetListProgress cũ đối chiếu bộ phận của người xác nhận,
            // không tính BoPhanId đích được lưu trực tiếp trên bản ghi xác nhận.
            // Lấy lại tiến độ biên bản thường theo dữ liệu hiện hành; SXBT đã được
            // tổng hợp riêng từ các bước xác nhận ở trên.
            const normalProgressResult = await pool.request().query(`
                SELECT
                    a.BienBanId,
                    a.Id AS AssignId,
                    a.BoPhanId,
                    bp.MaBoPhan,
                    bp.TenBoPhan,
                    CAST(0 AS bit) AS IsOpinionDepartment,
                    CAST(NULL AS int) AS SuggestedUserId,
                    CAST(NULL AS nvarchar(255)) AS SuggestedUserName,
                    CASE WHEN EXISTS (
                        SELECT 1
                        FROM dbo.BIEN_BAN_XAC_NHAN xn
                        LEFT JOIN dbo.USERS u ON u.Id = xn.NguoiXacNhanId
                        WHERE xn.BienBanId = a.BienBanId
                          AND COALESCE(xn.BoPhanId, u.BoPhanId) = a.BoPhanId
                    ) THEN 1 ELSE 0 END AS DaXacNhan
                FROM dbo.BIEN_BAN_ASSIGN a
                JOIN dbo.BIEN_BAN_KIEM bb ON bb.Id = a.BienBanId
                LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = a.BoPhanId
                WHERE a.BienBanId IN (${bienBanIds.join(",")})
                  AND ISNULL(bb.MauPhieuVersion, 'V00') <> 'V01'

                UNION ALL

                SELECT
                    yk.BienBanId,
                    yk.Id AS AssignId,
                    yk.BoPhanId,
                    bp.MaBoPhan,
                    bp.TenBoPhan,
                    CAST(1 AS bit) AS IsOpinionDepartment,
                    yk.SuggestedUserId,
                    suggestedUser.FullName AS SuggestedUserName,
                    CASE WHEN yk.ConfirmedAt IS NOT NULL
                        AND yk.ConfirmedReviewRound=ISNULL(bb.ReviewRound,1)
                        THEN 1 ELSE 0 END AS DaXacNhan
                FROM dbo.XIN_Y_KIEN yk
                JOIN dbo.BIEN_BAN_KIEM bb ON bb.Id = yk.BienBanId
                LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = yk.BoPhanId
                LEFT JOIN dbo.USERS suggestedUser ON suggestedUser.Id=yk.SuggestedUserId
                WHERE yk.BienBanId IN (${bienBanIds.join(",")})
                  AND ISNULL(bb.MauPhieuVersion, 'V00') = 'V01'
                  AND ISNULL(yk.IsActive, 1) = 1
            `);

            const normalProgressByBienBanId = new Map();
            for (const assign of normalProgressResult.recordset || []) {
                const key = Number(assign.BienBanId);
                const progress = normalProgressByBienBanId.get(key) || {
                    total: 0,
                    done: 0,
                    pendingDepartments: [],
                    opinionDepartments: []
                };
                progress.total += 1;
                if (assign.IsOpinionDepartment === true || assign.IsOpinionDepartment === 1) {
                    const departmentId = Number(assign.BoPhanId);
                    if (Number.isInteger(departmentId) && departmentId > 0 &&
                        !progress.opinionDepartments.some((department) => department.id === departmentId)) {
                        progress.opinionDepartments.push({
                            id: departmentId,
                            maBoPhan: assign.MaBoPhan || null,
                            tenBoPhan: assign.TenBoPhan || null
                        });
                    }
                }
                if (Number(assign.DaXacNhan) === 1) {
                    progress.done += 1;
                } else {
                    const displayName = [
                        assign.TenBoPhan || assign.MaBoPhan,
                        assign.SuggestedUserName
                    ].filter(Boolean).join(" — ");
                    if (displayName) progress.pendingDepartments.push(displayName);
                }
                normalProgressByBienBanId.set(key, progress);
            }

            const progressByBienBanId = new Map();
            for (const step of sxbtProgressResult.recordset || []) {
                const key = Number(step.BienBanId);
                const progress = progressByBienBanId.get(key) || {
                    IsSxbt: true,
                    SoBoPhan: 0,
                    DaCoYKien: 0,
                    pendingDepartments: []
                };
                progress.SoBoPhan += 1;
                if (step.TrangThai === "DA_XAC_NHAN") {
                    progress.DaCoYKien += 1;
                } else {
                    progress.pendingDepartments.push(step);
                }
                progressByBienBanId.set(key, progress);
            }

            for (const progress of progressByBienBanId.values()) {
                const pendingStep = progress.pendingDepartments[0] || null;
                progress.BoPhanDangChoId = pendingStep?.BoPhanId || null;
                progress.MaBoPhanDangCho = pendingStep?.MaBoPhan || null;
                progress.TenBoPhanDangCho = pendingStep?.TenBoPhan || null;
                progress.BoPhanChuaXacNhanText = progress.pendingDepartments
                    .map((step) => step.TenBoPhan || step.MaBoPhan)
                    .filter(Boolean)
                    .join(", ") || null;
                progress.ProgressPercent = progress.SoBoPhan > 0
                    ? Math.round(progress.DaCoYKien * 100 / progress.SoBoPhan)
                    : 0;
            }

            const managedDepartmentIds = await getManagedDepartmentIds(pool, req.user.userId, req.user.boPhanId);
            const listMetaResult = await pool.request()
                .input("BienBanIds", sql.NVarChar(sql.MAX), bienBanIds.join(","))
                .input("ManagedDepartmentIds", sql.NVarChar(sql.MAX), managedDepartmentIds.join(","))
                .query(`
                    SELECT
                        bb.Id AS BienBanId,
                        bb.LoaiBienBan,
                        bb.NguoiLapId,
                        ISNULL(bb.MauPhieuVersion, N'V00') AS MauPhieuVersion,
                        bb.OpinionDepartmentsConfirmedAt,
                        bb.CreatorConfirmedAt AS FollowUpReadyAt,
                        CASE
                            WHEN bb.TrangThai = N'HOAN_TAT' THEN followUp.ThoiGian
                            WHEN bb.TrangThai = N'BB_SXBT_HOAN_TAT' THEN sxbtCompletion.ConfirmedAt
                            ELSE NULL
                        END AS CompletedAt,
                        COALESCE(bb.BoPhanTaoId, creator.BoPhanId) AS BoPhanTaoId,
                        creatorDepartment.MaBoPhan AS MaBoPhanTao,
                        creatorDepartment.TenBoPhan AS TenBoPhanTao,
                        pk.LoaiKiemId,
                        inspectionType.MaLoai AS MaLoaiKiem,
                        inspectionType.TenLoai AS TenLoaiKiem,
                        CASE
                            WHEN myOpinion.Id IS NULL
                                OR bb.OpinionDepartmentsConfirmedAt IS NULL
                                OR bb.CreatorConfirmedAt IS NOT NULL
                                OR bb.TrangThai IN (N'TRA_LAI_CHINH_SUA', N'CHO_THEO_DOI', N'HOAN_TAT')
                                THEN NULL
                            WHEN myOpinion.ConfirmedAt IS NOT NULL
                                AND ISNULL(myOpinion.ConfirmedReviewRound, 0) = ISNULL(bb.ReviewRound, 1)
                                THEN N'DA_XAC_NHAN'
                            WHEN NULLIF(LTRIM(RTRIM(myResponse.NoiDung)), N'') IS NOT NULL
                                AND ISNULL(myOpinion.OpinionReviewRound, 0) = ISNULL(bb.ReviewRound, 1)
                                THEN N'CHO_TBP_XAC_NHAN'
                            ELSE N'CHO_Y_KIEN'
                        END AS MyDepartmentOpinionStatus,
                        myOpinion.SuggestedUserId AS MyPendingSuggestedUserId,
                        suggestedUser.FullName AS MyPendingSuggestedUserName,
                        CASE
                            WHEN pk.LoaiKiemId = 4
                                THEN COALESCE(planContractor.Ma_NhaThau, contractor.Ma_NhaThau)
                            ELSE NULL
                        END AS MaDonVi
                    FROM dbo.BIEN_BAN_KIEM bb
                    LEFT JOIN dbo.USERS creator ON creator.Id = bb.NguoiLapId
                    LEFT JOIN dbo.DM_BO_PHAN creatorDepartment
                        ON creatorDepartment.Id = COALESCE(bb.BoPhanTaoId, creator.BoPhanId)
                    OUTER APPLY (
                        SELECT TOP 1 opinion.*
                        FROM dbo.XIN_Y_KIEN opinion
                        WHERE opinion.BienBanId = bb.Id
                          AND opinion.BoPhanId IN (
                              SELECT TRY_CONVERT(int,[value]) FROM STRING_SPLIT(@ManagedDepartmentIds,',')
                          )
                          AND ISNULL(opinion.IsActive, 1) = 1
                        ORDER BY opinion.Id DESC
                    ) myOpinion
                    OUTER APPLY (
                        SELECT TOP 1 response.NoiDung
                        FROM dbo.TRA_LOI_Y_KIEN response
                        WHERE response.XinYKienId = myOpinion.Id
                        ORDER BY response.ThoiGian DESC, response.Id DESC
                    ) myResponse
                    LEFT JOIN dbo.USERS suggestedUser ON suggestedUser.Id=myOpinion.SuggestedUserId
                    LEFT JOIN dbo.PHIEU_KIEM pk ON pk.Id = bb.PhieuKiemId
                    LEFT JOIN dbo.DM_LOAI_KIEM inspectionType ON inspectionType.Id = pk.LoaiKiemId
                    LEFT JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt
                        ON receipt.ID_PhieuNhapBTP = COALESCE(
                            pk.SxbtPhieuNhapBtpId,
                            CASE WHEN pk.SxbtKeHoachNhapId IS NULL THEN pk.SourceId END
                        )
                    LEFT JOIN TAG_System.dbo.DM_BoPhan sourceDepartment
                        ON sourceDepartment.ID_BoPhan = receipt.ID_BoPhan
                    LEFT JOIN TAG_QTKD.dbo.DM_NhaThau contractor
                        ON contractor.ID_BoPhan = sourceDepartment.ID_BoPhan
                    LEFT JOIN TAG_QLSX.dbo.KeHoachSanXuat_NhaThau_ThamChieu_Nhap importPlan
                        ON importPlan.ID_TuTang = pk.SxbtKeHoachNhapId
                    LEFT JOIN TAG_QLSX.dbo.KeHoachSanXuat productionPlan
                        ON productionPlan.ID_KeHoachSanXuat = importPlan.ID_KeHoachSanXuat
                    LEFT JOIN TAG_QTKD.dbo.DM_NhaThau planContractor
                        ON planContractor.ID_BoPhan = productionPlan.ID_BoPhan
                    OUTER APPLY (
                        SELECT TOP 1 evaluation.ThoiGian
                        FROM dbo.BIEN_BAN_THEO_DOI_DANH_GIA evaluation
                        WHERE evaluation.BienBanId = bb.Id
                        ORDER BY evaluation.ThoiGian DESC, evaluation.Id DESC
                    ) followUp
                    OUTER APPLY (
                        SELECT MAX(step.ConfirmedAt) AS ConfirmedAt
                        FROM dbo.BIEN_BAN_SXBT_CONFIRM_STEP step
                        WHERE step.BienBanId = bb.Id
                    ) sxbtCompletion
                    WHERE bb.Id IN (
                        SELECT TRY_CONVERT(int, [value])
                        FROM STRING_SPLIT(@BienBanIds, ',')
                    )
                `);
            const listMetaByBienBanId = new Map(
                (listMetaResult.recordset || []).map((item) => [Number(item.BienBanId), item])
            );
            const listSummaryByBienBanId = await loadBienBanListSummaries(pool, bienBanIds);

            const normalizedRows = rows.map((item) => {
                const listMeta = listMetaByBienBanId.get(Number(item.BienBanId)) || {};
                const enrichedItem = mergeBienBanListSummary({
                    ...item,
                    ...listMeta
                }, listSummaryByBienBanId.get(Number(item.BienBanId)));
                const progress = progressByBienBanId.get(Number(item.BienBanId));
                const normalProgress = normalProgressByBienBanId.get(Number(item.BienBanId));
                if (!progress && !normalProgress) return enrichedItem;

                const isSxbt = progress?.IsSxbt === true || progress?.IsSxbt === 1 ||
                    enrichedItem.LoaiBienBan === "SXBT" ||
                    enrichedItem.LoaiKiemId === 4 ||
                    String(enrichedItem.TrangThai || "").startsWith("BB_SXBT");

                const total = isSxbt ? (Number(progress.SoBoPhan) || 0) : (normalProgress?.total || 0);
                const done = isSxbt ? (Number(progress.DaCoYKien) || 0) : (normalProgress?.done || 0);
                const progressPercent = isSxbt
                    ? Number(progress.ProgressPercent)
                    : (total > 0 ? Math.round((done / total) * 100) : 0);

                return {
                    ...enrichedItem,
                    LoaiBienBan: isSxbt ? "SXBT" : enrichedItem.LoaiBienBan,
                    DaCoYKien: done,
                    SoBoPhan: total,
                    ProgressPercent: Number.isFinite(progressPercent)
                        ? progressPercent
                        : (total > 0 ? Math.round((done / total) * 100) : 0),
                    MaBoPhanDangCho: progress?.MaBoPhanDangCho || null,
                    TenBoPhanDangCho: progress?.TenBoPhanDangCho || null,
                    BoPhanDangChoId: Number(progress?.BoPhanDangChoId) || null,
                    BoPhanChuaXacNhanText: isSxbt
                        ? (progress?.BoPhanChuaXacNhanText || null)
                        : (normalProgress?.pendingDepartments.join(", ") || null),
                    OpinionDepartments: isSxbt ? [] : (normalProgress?.opinionDepartments || [])
                };
            });

            const visibleRows = normalizedRows.filter((item) =>
                canViewKphListItem(item, req.user, managedDepartmentIds)
            );
            res.json(sortKphListRows(visibleRows));

        } catch (err) {

            console.error("GetBienBan error:", err);

            res.status(500).json({
                message: "Lỗi tải danh sách biên bản"
            });

        }
    }
);

/* =========================================================
   GET /bien-ban/:id
========================================================= */

router.get(
    "/:id",
    authenticateToken,
    async (req, res) => {

        try {
            const { id } = req.params;
            const pool = await poolPromise;

            const result = await pool.request()
                .input("BienBanId", sql.Int, id)
                .execute("sp_BienBan_GetDetail");
            const rs = result.recordsets;
            const baseInfo = rs[0]?.[0] || null;
            const subtypeResult = baseInfo?.PhieuKiemId
                ? await pool.request()
                    .input("PhieuKiemId", sql.Int, Number(baseInfo.PhieuKiemId))
                    .query(`
                        SELECT
                            CASE WHEN EXISTS (
                            SELECT 1
                            FROM dbo.PHIEU_KIEM_CONG_DOAN_HEADER
                            WHERE PhieuKiemId = @PhieuKiemId
                            ) THEN 1 ELSE 0 END AS IsCongDoan,
                            pk.SoLuong AS SoLuongKeHoach,
                            pk.SoLuongThucTe,
                            COALESCE(pk.SoLuongThucTe, pk.SoLuong) AS SoLuongHieuLuc
                        FROM dbo.PHIEU_KIEM pk
                        WHERE pk.Id = @PhieuKiemId
                    `)
                : null;
            const inspectionQuantity = subtypeResult?.recordset?.[0] || {};
            const isCongDoan = Boolean(inspectionQuantity.IsCongDoan);
            const inputSource = baseInfo?.PhieuKiemId
                ? await loadInputInspectionSource(pool, Number(baseInfo.PhieuKiemId))
                : null;
            if (baseInfo && inputSource) {
                Object.assign(baseInfo, {
                    ID_ChungTuNhap_ChiTiet: inputSource.ID_ChungTuNhap_ChiTiet,
                    ID_ChungTuNhap: inputSource.ID_ChungTuNhap,
                    So_Invoice: inputSource.So_Invoice,
                    NgayChungTuNhap: inputSource.NgayChungTu,
                    ID_DonHang: inputSource.ID_DonHang,
                    MaDonHang: inputSource.Ma_DonHang || baseInfo.DoiTuong || null,
                    SoDonHang: inputSource.Ma_DonHang || baseInfo.DoiTuong || null,
                    NhaCungCap: inputSource.Ten_NhaCungCap || baseInfo.Ten_NhaCungCap || null
                });
            }
            const defectResult = await pool.request()
                .input("BienBanId", sql.Int, id)
                .execute(isCongDoan
                    ? "sp_BienBan_CongDoan_GetDefects"
                    : "sp_BienBan_GetDefects");

            const assignRows = await getBienBanAssignRows(pool, id);
            const v01Data = await getKphV01Data(pool, id, req.user);
            const customFieldAccess = await getKphCustomFieldAccess(pool, id, req.user);
            const flowAccess = await getKphV01FlowAccess(pool, id, req.user);
            const sectionContributionAccess = await getKphSectionContributionAccess(pool, Number(id), req.user, flowAccess);
            let detailDefects = defectResult.recordset || [];
            if (flowAccess.isKphV01 && flowAccess.record.LoaiBienBan !== "STANDALONE") {
                const overrideResult = await pool.request().input("BienBanId", sql.Int, id).query(`
                    SELECT d.*, CAST(NULL AS nvarchar(max)) AS ImageUrls
                    FROM dbo.BIEN_BAN_DEFECT d
                    WHERE d.BienBanId=@BienBanId
                    ORDER BY d.SortOrder,d.Id
                `);
                if (overrideResult.recordset?.length) {
                    const sourceDefects = new Map((defectResult.recordset || []).map((item) => [
                        item.DefectId != null ? `ID:${Number(item.DefectId)}` : `CODE:${item.MaLoi || ""}`,
                        item
                    ]));
                    detailDefects = overrideResult.recordset.map((item) => {
                        const source = sourceDefects.get(
                            item.DefectId != null ? `ID:${Number(item.DefectId)}` : `CODE:${item.MaLoi || ""}`
                        );
                        return {
                            ...item,
                            SoLuongKiem: item.SoLuongKiem ?? source?.SoLuongKiem ?? null,
                            ImageUrls: source?.ImageUrls || item.ImageUrls
                        };
                    });
                }
            }
            const proposalResult = await pool.request()
                .input("BienBanId", sql.Int, id)
                .query(`
                    SELECT x.Id, x.BoPhan, x.NoiDung, x.TrachNhiem, x.TheoDoi,
                        x.DeNghiXuLyId, dx.Ten AS DeNghiXuLy, x.ThoiHan, x.NguoiXuLyId,
                        x.BoPhanId, x.CreatedBy, creator.FullName AS NguoiNhap, x.CreatedAt,
                        bp.MaBoPhan, bp.TenBoPhan
                    FROM dbo.BIEN_BAN_XU_LY x
                    LEFT JOIN dbo.DM_DE_NGHI_XU_LY dx ON dx.Id = x.DeNghiXuLyId
                    LEFT JOIN dbo.USERS creator ON creator.Id = x.CreatedBy
                    LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = x.BoPhanId
                    WHERE x.BienBanId = @BienBanId
                    ORDER BY x.CreatedAt, x.Id
                `);
            const sectionRows = await loadKphSectionRows(pool, id);

            // Gộp custom fields của biên bản và phiếu kiểm.
            // Ưu tiên field trên biên bản nếu trùng tên.
            let dynamicFields = [];
            const info = baseInfo;
            if (info) {
                let bienBanDynamicFields = [];
                let phieuKiemDynamicFields = [];

                if (info.DynamicFieldsJSON) {
                    try {
                        bienBanDynamicFields = JSON.parse(info.DynamicFieldsJSON);
                    } catch (e) {
                        console.error("Lỗi parse DynamicFieldsJSON:", e);
                    }
                }

                if (info.PhieuKiemDynamicFieldsJSON) {
                    try {
                        phieuKiemDynamicFields = JSON.parse(info.PhieuKiemDynamicFieldsJSON);
                    } catch (e) {
                        console.error("Lỗi parse PhieuKiemDynamicFieldsJSON:", e);
                    }
                }

                const mergedFieldMap = new Map();
                phieuKiemDynamicFields.forEach((field) => {
                    if (field?.FieldName) mergedFieldMap.set(field.FieldName, field);
                });
                bienBanDynamicFields.forEach((field) => {
                    if (field?.FieldName) mergedFieldMap.set(field.FieldName, field);
                });

                const defaultFields = {
                    DonHang: info.MaDonHang || (Number(info.LoaiKiemId) === 1 ? info.DoiTuong : null),
                    TenSanPham: info.TenSanPham,
                    MaSanPham: info.MaSanPham,
                    Lot: info.Lot,
                    MaTruyNguyen: info.Lot,
                    SoLuongKPH: inspectionQuantity.SoLuongThucTe
                        ?? inspectionQuantity.SoLuongKeHoach
                        ?? null,
                    PhatHienTu: Number(info.LoaiKiemId) === 1
                        ? "KIEM_TRA_DAU_VAO"
                        : Number(info.LoaiKiemId) === 5
                            ? "KIEM_DONG_CONT"
                            : Number(info.LoaiKiemId) === 6
                                ? "TRONG_SAN_XUAT"
                                : null,
                    MucDo: info.MucDoKhongPhuHop
                };
                Object.entries(defaultFields).forEach(([fieldName, fieldValue]) => {
                    if (!mergedFieldMap.has(fieldName)
                        && fieldValue !== null
                        && fieldValue !== undefined
                        && String(fieldValue).trim() !== "") {
                        mergedFieldMap.set(fieldName, { FieldName: fieldName, FieldValue: String(fieldValue) });
                    }
                });
                dynamicFields = Array.from(mergedFieldMap.values());

                if (Number(info.LoaiKiemId) === 1) info.PhatHienTu = "KIEM_TRA_DAU_VAO";
                if (Number(info.LoaiKiemId) === 5) info.PhatHienTu = "KIEM_DONG_CONT";
                if (Number(info.LoaiKiemId) === 6) info.PhatHienTu = "TRONG_SAN_XUAT";

                if (isCongDoan) {
                    const productCode = mergedFieldMap.get("MaSanPham")?.FieldValue
                        || mergedFieldMap.get("MaItem")?.FieldValue;
                    const productName = mergedFieldMap.get("TenSanPham")?.FieldValue;
                    const lot = mergedFieldMap.get("Lot")?.FieldValue;
                    if (productCode) info.MaSanPham = productCode;
                    if (productName) info.TenSanPham = productName;
                    if (lot) info.Lot = lot;
                }

                delete info.DynamicFieldsJSON;
                delete info.PhieuKiemDynamicFieldsJSON;
            }

            const mergedAssigns = (assignRows.length > 0 ? assignRows : (rs[2] || [])).map((assign) => {
                const fallback = (rs[2] || []).find((item) => item.BoPhanId === assign.BoPhanId) || {};
                return {
                    ...fallback,
                    ...assign
                };
            });

            let phieuKiemXacNhan = [];
            const bienBanXacNhanResult = await pool.request().input("BienBanId", sql.Int, id).query(`
                SELECT
                    xn.Id,
                    xn.BienBanId,
                    xn.NguoiXacNhanId,
                    COALESCE(xn.BoPhanId, u.BoPhanId) AS BoPhanId,
                    xn.ThoiGian,
                    xn.VaiTro,
                    u.FullName,
                    bp.MaBoPhan, bp.TenBoPhan
                FROM dbo.BIEN_BAN_XAC_NHAN xn
                LEFT JOIN dbo.USERS u ON u.Id=xn.NguoiXacNhanId
                LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id=COALESCE(xn.BoPhanId,u.BoPhanId)
                WHERE xn.BienBanId=@BienBanId
            `);
            if ((Number(info?.LoaiKiemId) === 6 || isCongDoan) && Number(info?.PhieuKiemId) > 0) {
                const xacNhanResult = await pool.request()
                    .input("PhieuKiemId", sql.Int, Number(info.PhieuKiemId))
                    .query(`
                        SELECT
                            xn.Id,
                            xn.PhieuKiemId,
                            xn.NguoiXacNhanId,
                            xn.VaiTro,
                            xn.TrangThai,
                            xn.NoiDung,
                            xn.ThoiGian,
                            COALESCE(NULLIF(u.FullName, N''), u.Username) AS TenNguoiXacNhan,
                            u.BoPhanId
                        FROM dbo.PHIEU_KIEM_XAC_NHAN xn
                        LEFT JOIN dbo.USERS u ON u.Id = xn.NguoiXacNhanId
                        WHERE xn.PhieuKiemId = @PhieuKiemId
                        ORDER BY xn.ThoiGian DESC, xn.Id DESC
                    `);
                phieuKiemXacNhan = xacNhanResult.recordset || [];
            }

            const phieuKiemTbpXacNhan = phieuKiemXacNhan.find((item) =>
                ["TBP", "TBP_CONG_DOAN"].includes(String(item?.VaiTro || "").trim().toUpperCase()) &&
                String(item?.TrangThai || "").trim().toUpperCase() !== "TU_CHOI"
            ) || null;

            const bienBanXacNhanRows = bienBanXacNhanResult.recordset || [];
            const signatureMap = await loadSignatureDataUrlMap(pool, [
                ...bienBanXacNhanRows.map((item) => item.NguoiXacNhanId),
                ...phieuKiemXacNhan.map((item) => item.NguoiXacNhanId),
                ...v01Data.specialistOpinions.map((item) => item.ConfirmedBy),
                v01Data.meta.CreatorConfirmedBy,
                v01Data.meta.NguoiLapId ?? info?.NguoiLapId,
                v01Data.followUpEvaluation?.NguoiTheoDoiId
            ]);
            const withSignature = (item, userIdField) => ({
                ...item,
                SignatureDataUrl: signatureMap.get(Number(item?.[userIdField])) || null
            });

            res.json({
                info: info ? {
                    ...info,
                    IsCongDoan: isCongDoan,
                    SoLuongKeHoach: inspectionQuantity.SoLuongKeHoach ?? info.SoLuongKeHoach ?? info.SoLuong ?? null,
                    SoLuongThucTe: inspectionQuantity.SoLuongThucTe ?? info.SoLuongThucTe ?? null,
                    SoLuongHieuLuc: inspectionQuantity.SoLuongHieuLuc ?? info.SoLuongHieuLuc ?? info.SoLuong ?? null,
                    MauPhieuVersion: v01Data.meta.MauPhieuVersion,
                    NguoiLapId: v01Data.meta.NguoiLapId ?? info.NguoiLapId,
                    LoaiBienBan: v01Data.meta.LoaiBienBan ?? info.LoaiBienBan,
                    MaDonViTaoPhieu: v01Data.meta.MaDonViTaoPhieu,
                    DonViTaoPhieu: v01Data.meta.DonViTaoPhieu,
                    BoPhanTaoId: v01Data.meta.BoPhanTaoId,
                    OpinionDepartmentsConfirmed: Boolean(v01Data.meta.OpinionDepartmentsConfirmed),
                    OpinionDepartmentsConfirmedAt: v01Data.meta.OpinionDepartmentsConfirmedAt,
                    CreatorConfirmedAt: v01Data.meta.CreatorConfirmedAt,
                    CreatorConfirmedBy: v01Data.meta.CreatorConfirmedBy,
                    CreatorConfirmerName: v01Data.meta.CreatorConfirmerName,
                    CreatorSignatureDataUrl: signatureMap.get(Number(v01Data.meta.CreatorConfirmedBy)) || null,
                    NguoiLapSignatureDataUrl: signatureMap.get(Number(v01Data.meta.NguoiLapId ?? info.NguoiLapId)) || null,
                    PhieuKiemTbpXacNhanId: phieuKiemTbpXacNhan?.NguoiXacNhanId || null,
                    PhieuKiemTbpXacNhanName: phieuKiemTbpXacNhan?.TenNguoiXacNhan || null,
                    PhieuKiemTbpXacNhanAt: phieuKiemTbpXacNhan?.ThoiGian || null,
                    PhieuKiemTbpSignatureDataUrl: phieuKiemTbpXacNhan
                        ? signatureMap.get(Number(phieuKiemTbpXacNhan.NguoiXacNhanId)) || null
                        : null,
                    ReviewRound: v01Data.meta.ReviewRound,
                    LastReturnedBy: v01Data.meta.LastReturnedBy,
                    LastReturnedByName: v01Data.meta.LastReturnedByName,
                    LastReturnedAt: v01Data.meta.LastReturnedAt,
                    LastReturnReason: v01Data.meta.LastReturnReason,
                    ResubmittedBy: v01Data.meta.ResubmittedBy,
                    ResubmittedAt: v01Data.meta.ResubmittedAt,
                    YeuCauChiPhi: Boolean(v01Data.meta.YeuCauChiPhi),
                    YeuCauHanhDong: Boolean(v01Data.meta.YeuCauHanhDong),
                    CanManageKphFlow: flowAccess.canEdit,
                    CanConfigureRequirements: flowAccess.canEdit,
                    CanContributeKphSections: sectionContributionAccess.canContribute,
                    CanEditReturned: flowAccess.canEdit && flowAccess.record.TrangThai === "TRA_LAI_CHINH_SUA",
                    CanResubmit: flowAccess.canResubmit,
                    CanCreatorConfirm: flowAccess.isKphV01 && Boolean(v01Data.meta.OpinionDepartmentsConfirmedAt) &&
                        !v01Data.meta.CreatorConfirmedAt &&
                        !["TRA_LAI_CHINH_SUA", "CHO_THEO_DOI", "HOAN_TAT"].includes(v01Data.meta.TrangThai) &&
                        v01Data.specialistOpinions.length > 0 &&
                        v01Data.specialistOpinions.every((opinion) => Boolean(opinion.HasConfirmed)) &&
                        (isAdmin(req.user) || await canLeadDepartment(pool, req.user, flowAccess.record.BoPhanTaoId)),
                    IsAdmin: isAdmin(req.user),
                    canEditKphCustomFields: customFieldAccess.canEdit
                } : null,
                defects: detailDefects,
                assigns: mergedAssigns,
                xuLy: proposalResult.recordset || [],
                chiPhi: sectionRows.chiPhi,
                xacNhan: bienBanXacNhanRows.map((item) => withSignature(item, "NguoiXacNhanId")),
                phieuKiemXacNhan: phieuKiemXacNhan.map((item) => withSignature(item, "NguoiXacNhanId")),
                hanhDong: sectionRows.hanhDong,
                dynamicFields: dynamicFields,
                canEditKphCustomFields: customFieldAccess.canEdit,
                templateVersion: v01Data.meta.MauPhieuVersion,
                specialistOpinions: v01Data.specialistOpinions.map((item) => withSignature(item, "ConfirmedBy")),
                followUpEvaluation: v01Data.followUpEvaluation
                    ? withSignature(v01Data.followUpEvaluation, "NguoiTheoDoiId")
                    : null,
                printMeta: v01Data.meta
            });

        } catch (err) {

            console.error("GetBienBanDetail error:");

            res.status(500).json({
                message: "Lỗi tải chi tiết biên bản"
            });
        }
    }
);

router.post(
    "/update-mo-ta",
    authenticateToken,
    async (req, res) => {

        const { bienBanId, moTaChung } = req.body;

        try {

            const pool = await poolPromise;
            const flowAccess = await getKphV01FlowAccess(pool, Number(bienBanId), req.user);
            if (!flowAccess.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
            if (flowAccess.record.MauPhieuVersion === "V01") {
                if (!flowAccess.canEdit) {
                    return res.status(403).json({ message: "Chỉ bộ phận tạo phiếu được cập nhật mô tả" });
                }
            }
            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("MoTaChung", sql.NVarChar(sql.MAX), moTaChung)
                .execute("sp_BienBan_UpdateMoTaChung");

            res.json({ success: true });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                message: "Không thể cập nhật mô tả"
            });

        }

    });

router.post("/:id/defects", authenticateToken, async (req, res) => {
    const bienBanId = Number(req.params.id);
    const normalizedDefects = (Array.isArray(req.body?.defects) ? req.body.defects : []).map((item, index) => ({
        defectId: Number(item?.DefectId ?? item?.defectId) || null,
        maLoi: String(item?.MaLoi ?? item?.maLoi ?? "").trim(),
        tenLoi: String(item?.TenLoi ?? item?.tenLoi ?? "").trim(),
        defectType: String(item?.DefectType ?? item?.defectType ?? "").trim(),
        tenLoiTuNhap: String(item?.TenLoiTuNhap ?? item?.tenLoiTuNhap ?? "").trim(),
        moTa: String(item?.MoTa ?? item?.moTa ?? "").trim(),
        soLuong: Number(item?.SoLuong ?? item?.soLuong),
        ghiChu: String(item?.GhiChu ?? item?.ghiChu ?? "").trim(),
        tenDoiTuong: String(item?.TenDoiTuong ?? item?.tenDoiTuong ?? "").trim(),
        soLuongKiem: item?.SoLuongKiem ?? item?.soLuongKiem ?? null,
        sortOrder: index + 1
    }));
    if (!Number.isInteger(bienBanId) || bienBanId < 1) {
        return res.status(400).json({ message: "Biên bản không hợp lệ" });
    }
    if (normalizedDefects.length === 0 || normalizedDefects.some((item) =>
        (!item.defectId && !item.tenLoiTuNhap) || !Number.isFinite(item.soLuong) || item.soLuong <= 0
    )) {
        return res.status(400).json({ message: "Cần ít nhất một lỗi hợp lệ và số lượng lỗi phải lớn hơn 0" });
    }

    try {
        const pool = await poolPromise;
        const access = await getKphV01FlowAccess(pool, bienBanId, req.user);
        if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
        if (!access.isKphV01) return res.status(409).json({ message: "Biên bản không sử dụng luồng KPH V01" });
        if (!access.canEdit) return res.status(403).json({ message: "Bạn không có quyền sửa lỗi ở trạng thái hiện tại" });

        await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .input("DefectsJson", sql.NVarChar(sql.MAX), JSON.stringify(normalizedDefects))
            .query(`
                SET XACT_ABORT ON;
                BEGIN TRANSACTION;
                DELETE FROM dbo.BIEN_BAN_DEFECT WHERE BienBanId=@BienBanId;
                INSERT dbo.BIEN_BAN_DEFECT
                    (BienBanId,DefectId,MaLoi,TenLoi,DefectType,TenLoiTuNhap,MoTa,SoLuong,GhiChu,SortOrder,TenDoiTuong,SoLuongKiem)
                SELECT @BienBanId,src.DefectId,NULLIF(src.MaLoi,N''),NULLIF(src.TenLoi,N''),
                    NULLIF(src.DefectType,N''),NULLIF(src.TenLoiTuNhap,N''),NULLIF(src.MoTa,N''),
                    src.SoLuong,NULLIF(src.GhiChu,N''),src.SortOrder,NULLIF(src.TenDoiTuong,N''),src.SoLuongKiem
                FROM OPENJSON(@DefectsJson) WITH (
                    DefectId int '$.defectId',MaLoi nvarchar(50) '$.maLoi',TenLoi nvarchar(255) '$.tenLoi',
                    DefectType nvarchar(20) '$.defectType',TenLoiTuNhap nvarchar(255) '$.tenLoiTuNhap',
                    MoTa nvarchar(max) '$.moTa',SoLuong int '$.soLuong',GhiChu nvarchar(max) '$.ghiChu',
                    SortOrder int '$.sortOrder',TenDoiTuong nvarchar(255) '$.tenDoiTuong',SoLuongKiem int '$.soLuongKiem'
                ) src;
                COMMIT TRANSACTION;
            `);
        res.json({ success: true, message: "Đã lưu danh sách lỗi của biên bản" });
    } catch (error) {
        console.error("SaveKphBienBanDefects error:", error);
        res.status(500).json({ message: error?.originalError?.info?.message || "Không thể lưu danh sách lỗi" });
    }
});

/* =========================================================
   POST /bien-ban/xu-ly
========================================================= */
router.post(
    "/xu-ly",
    authenticateToken,
    // authorize("XAC_NHAN_LOI"),
    async (req, res) => {

        try {

            const { bienBanId } = req.body;
            const items = (Array.isArray(req.body?.items) ? req.body.items : [req.body])
                .map((item) => ({
                    noiDung: String(item?.noiDung || "").trim(),
                    deNghiXuLyId: Number(item?.deNghiXuLyId) || null,
                    thoiHan: item?.thoiHan || null,
                    trachNhiem: String(item?.trachNhiem || "").trim(),
                    theoDoi: String(item?.theoDoi || "").trim()
                }));
            const pool = await poolPromise;
            if (items.length === 0 || items.some((item) =>
                !item.noiDung || !item.thoiHan || !item.trachNhiem || !item.theoDoi
            )) {
                return res.status(400).json({ message: "Vui lòng nhập đầy đủ nội dung, thời hạn, trách nhiệm và theo dõi" });
            }
            const access = await getKphSectionContributionAccess(pool, Number(bienBanId), req.user);
            if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
            if (!access.isKphV01) {
                return res.status(409).json({ message: "Biên bản không sử dụng luồng KPH V01" });
            }
            if (!access.canContribute) {
                const isLocked = access.record.CreatorConfirmedAt ||
                    ["TRA_LAI_CHINH_SUA", "CHO_THEO_DOI", "HOAN_TAT"].includes(access.record.TrangThai);
                return res.status(isLocked ? 409 : 403).json({
                    message: isLocked
                        ? "Biên bản đã khóa mục 5"
                        : "Chỉ bộ phận lập hoặc bộ phận được xin ý kiến được nhập mục 5"
                });
            }
            const targetBoPhanId = access.targetBoPhanId;
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                await assertKphSectionContributionOpen(transaction, Number(bienBanId), access.canManage);
                for (const item of items) {
                    await new sql.Request(transaction)
                        .input("BienBanId", sql.Int, bienBanId)
                        .input("NoiDung", sql.NVarChar(sql.MAX), item.noiDung)
                        .input("DeNghiXuLyId", sql.Int, item.deNghiXuLyId)
                        .input("ThoiHan", sql.Date, item.thoiHan)
                        .input("UserId", sql.Int, req.user.userId)
                        .input("BoPhanId", sql.Int, targetBoPhanId)
                        .input("TrachNhiem", sql.NVarChar(255), item.trachNhiem)
                        .input("TheoDoi", sql.NVarChar(255), item.theoDoi)
                        .query(`
                            INSERT INTO dbo.BIEN_BAN_XU_LY
                                (BienBanId, NoiDung, DeNghiXuLyId, BoPhanId, ThoiHan, TrachNhiem, TheoDoi, CreatedBy, CreatedAt)
                            VALUES (@BienBanId, @NoiDung, @DeNghiXuLyId, @BoPhanId, @ThoiHan, @TrachNhiem, @TheoDoi, @UserId, SYSDATETIME())
                        `);
                }
                await transaction.commit();
            } catch (error) {
                await transaction.rollback();
                throw error;
            }

            res.json({ success: true, inserted: items.length });

        } catch (err) {

            console.error(err);

            res.status(err.statusCode || 500).json({
                message: err.message || "Thêm đề xuất xử lý thất bại"
            });

        }

    }
);

router.patch("/:id/requirements", authenticateToken, async (req, res) => {
    try {
        const bienBanId = Number(req.params.id);
        const pool = await poolPromise;
        const access = await getKphV01FlowAccess(pool, bienBanId, req.user);
        if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
        if (!access.canEdit) return res.status(403).json({ message: "Chỉ bộ phận tạo phiếu được cấu hình yêu cầu ở trạng thái chỉnh sửa" });
        const current = await pool.request().input("BienBanId", sql.Int, bienBanId).query(`
            SELECT TOP 1 TrangThai, ISNULL(MauPhieuVersion, 'V00') MauPhieuVersion,
                ISNULL(YeuCauChiPhi, 0) YeuCauChiPhi, ISNULL(YeuCauHanhDong, 0) YeuCauHanhDong
            FROM dbo.BIEN_BAN_KIEM WHERE Id = @BienBanId
        `);
        const row = current.recordset?.[0];
        if (!row) return res.status(404).json({ message: "Không tìm thấy biên bản" });
        if (row.MauPhieuVersion !== "V01" || access.record.CreatorConfirmedAt ||
            ["CHO_THEO_DOI", "HOAN_TAT"].includes(row.TrangThai)) {
            return res.status(409).json({ message: "Không thể thay đổi yêu cầu ở trạng thái hiện tại" });
        }
        const yeuCauChiPhi = req.body.yeuCauChiPhi === undefined ? Boolean(row.YeuCauChiPhi) : Boolean(req.body.yeuCauChiPhi);
        const yeuCauHanhDong = req.body.yeuCauHanhDong === undefined ? Boolean(row.YeuCauHanhDong) : Boolean(req.body.yeuCauHanhDong);
        if (!yeuCauChiPhi) {
            const exists = await pool.request().input("BienBanId", sql.Int, bienBanId).query("SELECT TOP 1 1 AS Found FROM dbo.BIEN_BAN_CHI_PHI WHERE BienBanId=@BienBanId");
            if (exists.recordset?.length) return res.status(409).json({ message: "Không thể bỏ yêu cầu chi phí khi đã có dữ liệu" });
        }
        if (!yeuCauHanhDong) {
            const exists = await pool.request().input("BienBanId", sql.Int, bienBanId).query("SELECT TOP 1 1 AS Found FROM dbo.BIEN_BAN_HANH_DONG WHERE BienBanId=@BienBanId");
            if (exists.recordset?.length) return res.status(409).json({ message: "Không thể bỏ yêu cầu hành động khi đã có dữ liệu" });
        }
        await pool.request().input("BienBanId", sql.Int, bienBanId).input("YeuCauChiPhi", sql.Bit, yeuCauChiPhi).input("YeuCauHanhDong", sql.Bit, yeuCauHanhDong)
            .query("UPDATE dbo.BIEN_BAN_KIEM SET YeuCauChiPhi=@YeuCauChiPhi, YeuCauHanhDong=@YeuCauHanhDong WHERE Id=@BienBanId");
        res.json({ success: true, yeuCauChiPhi, yeuCauHanhDong });
    } catch (err) { res.status(500).json({ message: "Không thể cập nhật yêu cầu" }); }
});
/* =========================================================
   POST /bien-ban/complete
========================================================= */

router.post(
    "/complete",
    authenticateToken,
    authorize("KET_LUAN"),
    async (req, res) => {

        try {

            const { bienBanId } = req.body;

            const pool = await poolPromise;

            const versionResult = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .query(`
                    SELECT TOP 1 ISNULL(MauPhieuVersion, 'V00') AS MauPhieuVersion
                    FROM dbo.BIEN_BAN_KIEM
                    WHERE Id = @BienBanId
                `);
            const templateVersion = versionResult.recordset?.[0]?.MauPhieuVersion || "V00";

            if (templateVersion === "V01") {
                return res.status(409).json({
                    message: "KPH V01 phải được xác nhận cuối bởi bộ phận tạo phiếu"
                });
            }

            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("NguoiXacNhanId", sql.Int, req.user.userId)
                .execute("sp_BienBan_Complete");

            res.json({ success: true });

        } catch (err) {

            console.error("CompleteBienBan error:", err);

            res.status(500).json({
                message: err.message
            });

        }

    }
);

router.post(
    "/:id/assign",
    authenticateToken,
    authorize("XAC_NHAN_NGUOI_XU_LY"),
    async (req, res) => {

        try {

            const bienBanId = parseInt(req.params.id, 10);
            const { boPhanIds, bpsxSignatureBoPhanId = null } = req.body;
            const normalizedBoPhanIds = [...new Set((Array.isArray(boPhanIds) ? boPhanIds : [])
                .map((id) => Number(id))
                .filter((id) => Number.isInteger(id) && id > 0))];
            const parsedBpsxSignatureBoPhanId = bpsxSignatureBoPhanId ? Number(bpsxSignatureBoPhanId) : null;
            const normalizedBpsxSignatureBoPhanId = Number.isInteger(parsedBpsxSignatureBoPhanId) && parsedBpsxSignatureBoPhanId > 0
                ? parsedBpsxSignatureBoPhanId
                : null;

            if (normalizedBoPhanIds.length === 0) {
                return res.status(400).json({
                    message: "Vui lòng chọn ít nhất một bộ phận xử lý"
                });
            }

            if (bpsxSignatureBoPhanId && normalizedBpsxSignatureBoPhanId === null) {
                return res.status(400).json({
                    message: "Bộ phận sản xuất không hợp lệ"
                });
            }

            const pool = await poolPromise;
            const version = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .query("SELECT TOP 1 ISNULL(MauPhieuVersion,'V00') AS MauPhieuVersion FROM dbo.BIEN_BAN_KIEM WHERE Id=@BienBanId");
            if (version.recordset?.[0]?.MauPhieuVersion === "V01") {
                return res.status(409).json({ message: "KPH V01 sử dụng danh sách bộ phận cần lấy ý kiến" });
            }
            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("BoPhanIds", sql.NVarChar, normalizedBoPhanIds.join(","))
                .input("BpsxSignatureBoPhanId", sql.Int, normalizedBpsxSignatureBoPhanId)
                .input("AssignedBy", sql.Int, req.user.userId)
                .execute("sp_BienBan_AssignBoPhan");

            res.json({ success: true });

        } catch (err) {
            console.error(err);
            const message = err?.originalError?.info?.message || err.message || "Không thể phân công bộ phận";
            res.status(/đã xác nhận|đã có ý kiến/i.test(message) ? 409 : 500).json({ message });

        }

    }
);

router.get(
    "/:id/assign-users",
    authenticateToken,
    async (req, res) => {
        try {
            const bienBanId = parseInt(req.params.id, 10);
            const queryBoPhanId = req.query.boPhanId ? parseInt(req.query.boPhanId, 10) : null;
            const targetBoPhanId = queryBoPhanId || req.user.boPhanId;

            if (!targetBoPhanId) {
                return res.status(400).json({
                    message: "Thiếu bộ phận cần lấy danh sách nhân sự"
                });
            }

            if (!await canManageDepartmentAssign(pool, req.user, targetBoPhanId)) {
                return res.status(403).json({
                    message: "Không được phép xem danh sách nhân sự của bộ phận này"
                });
            }

            const pool = await poolPromise;

            const assignCheck = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("BoPhanId", sql.Int, targetBoPhanId)
                .query(`
                    SELECT TOP 1 Id
                    FROM BIEN_BAN_ASSIGN
                    WHERE BienBanId = @BienBanId AND BoPhanId = @BoPhanId
                `);

            if (assignCheck.recordset.length === 0) {
                return res.status(404).json({
                    message: "Bộ phận này chưa được phân công cho biên bản"
                });
            }

            const result = await pool.request()
                .input("BoPhanId", sql.Int, targetBoPhanId)
                .query(`
                    SELECT
                        u.Id,
                        u.Username,
                        u.FullName,
                        u.BoPhanId,
                        bp.TenBoPhan,
                        bp.MaBoPhan
                    FROM USERS u
                    LEFT JOIN DM_BO_PHAN bp ON bp.Id = u.BoPhanId
                    WHERE u.TrangThai = 1
                      AND u.BoPhanId = @BoPhanId
                    ORDER BY u.FullName, u.Username
                `);

            res.json(result.recordset);
        } catch (err) {
            console.error("GetAssignableUsers error:", err);
            res.status(500).json({
                message: "Không lấy được danh sách nhân sự"
            });
        }

    }
);

router.post(
    "/:id/assign-user",
    authenticateToken,
    authorize("PHAN_CONG_NGUOI_XU_LY"),
    async (req, res) => {
        try {
            const bienBanId = parseInt(req.params.id, 10);
            const boPhanId = parseInt(req.body.boPhanId, 10);
            const nguoiXuLyId = parseInt(req.body.nguoiXuLyId, 10);

            if (!boPhanId || !nguoiXuLyId) {
                return res.status(400).json({
                    message: "Thiếu bộ phận hoặc người xử lý"
                });
            }

            const pool = await poolPromise;
            const version = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .query("SELECT TOP 1 ISNULL(MauPhieuVersion,'V00') AS MauPhieuVersion FROM dbo.BIEN_BAN_KIEM WHERE Id=@BienBanId");
            if (version.recordset?.[0]?.MauPhieuVersion === "V01") {
                return res.status(409).json({ message: "KPH V01 không phân công cá nhân xử lý" });
            }
            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("BoPhanId", sql.Int, boPhanId)
                .input("NguoiXuLyId", sql.Int, nguoiXuLyId)
                .execute("sp_BienBan_AssignNhanVien");

            res.json({ success: true });

        } catch (err) {
            console.error("AssignUser error:", err);

            res.status(500).json({
                message: err.message || "Không thể phân cá nhân xử lý"
            });
        }
    }
);

router.post(
    "/:id/confirm-assign",
    authenticateToken,
    authorize("XAC_NHAN_NGUOI_XU_LY"),
    async (req, res) => {
        try {
            const bienBanId = parseInt(req.params.id, 10);
            const pool = await poolPromise;
            const version = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .query("SELECT TOP 1 ISNULL(MauPhieuVersion,'V00') AS MauPhieuVersion FROM dbo.BIEN_BAN_KIEM WHERE Id=@BienBanId");
            if (version.recordset?.[0]?.MauPhieuVersion === "V01") {
                return res.status(409).json({ message: "KPH V01 không sử dụng bước chốt phân công xử lý" });
            }
            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .execute("sp_BienBan_ConfirmAssign");
            res.json({ success: true });
        } catch (err) {
            console.error("ConfirmAssign error:", err);
            res.status(409).json({
                message: err?.originalError?.info?.message || err.message || "Không thể xác nhận phân công"
            });
        }
    }
)

router.post(
    "/chi-phi",
    authenticateToken,
    async (req, res) => {

        try {

            const { bienBanId } = req.body;
            const items = (Array.isArray(req.body?.items) ? req.body.items : [req.body])
                .map((item) => ({
                    loaiChiPhi: String(item?.loaiChiPhi || "").trim(),
                    giaTri: Number(item?.giaTri) || 0,
                    thoiHan: item?.thoiHan || null,
                    trachNhiem: String(item?.trachNhiem || "").trim() || null,
                    theoDoi: String(item?.theoDoi || "").trim() || null
                }));
            if (items.length === 0 || items.some((item) => !item.loaiChiPhi)) {
                return res.status(400).json({ message: "Vui lòng nhập tên chi phí" });
            }
            if (items.some((item) => item.trachNhiem?.length > 255 || item.theoDoi?.length > 255)) {
                return res.status(400).json({ message: "Trách nhiệm và theo dõi không được vượt quá 255 ký tự" });
            }
            const pool = await poolPromise;

            const access = await getKphSectionContributionAccess(pool, Number(bienBanId), req.user);
            if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
            if (access.isKphV01 && !access.canContribute) {
                const isLocked = access.record.CreatorConfirmedAt ||
                    ["TRA_LAI_CHINH_SUA", "CHO_THEO_DOI", "HOAN_TAT"].includes(access.record.TrangThai);
                return res.status(isLocked ? 409 : 403).json({
                    message: isLocked
                        ? "Biên bản đã khóa mục 6"
                        : "Chỉ bộ phận lập hoặc bộ phận được xin ý kiến được nhập mục 6"
                });
            }
            const requirement = await pool.request().input("BienBanId", sql.Int, bienBanId).query("SELECT TOP 1 ISNULL(YeuCauChiPhi,0) AS Required, TrangThai, CreatorConfirmedAt FROM dbo.BIEN_BAN_KIEM WHERE Id=@BienBanId");
            if ((!access.isKphV01 && !requirement.recordset?.[0]?.Required) || requirement.recordset?.[0]?.CreatorConfirmedAt ||
                (["CHO_THEO_DOI", "HOAN_TAT"].includes(requirement.recordset?.[0]?.TrangThai) ||
                    (requirement.recordset?.[0]?.TrangThai === "TRA_LAI_CHINH_SUA" && !access.canManage))) {
                return res.status(409).json({ message: "Mục chi phí không được yêu cầu hoặc phiếu đã hoàn tất" });
            }

            const targetBoPhanId = access.isKphV01
                ? access.targetBoPhanId
                : req.user.boPhanId;
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                if (access.isKphV01) {
                    await assertKphSectionContributionOpen(transaction, Number(bienBanId), access.canManage);
                    await new sql.Request(transaction).input("BienBanId", sql.Int, bienBanId)
                        .query("UPDATE dbo.BIEN_BAN_KIEM SET YeuCauChiPhi=1 WHERE Id=@BienBanId");
                }
                for (const item of items) {
                    await new sql.Request(transaction)
                        .input("BienBanId", sql.Int, bienBanId)
                        .input("LoaiChiPhi", sql.NVarChar(255), item.loaiChiPhi)
                        .input("GiaTri", sql.Decimal(18, 2), item.giaTri)
                        .input("BoPhanId", sql.Int, targetBoPhanId)
                        .input("ThoiHan", sql.Date, item.thoiHan)
                        .input("CreatedBy", sql.Int, req.user.userId)
                        .input("TrachNhiem", sql.NVarChar(255), item.trachNhiem)
                        .input("TheoDoi", sql.NVarChar(255), item.theoDoi)
                        .execute("sp_BienBan_AddChiPhi");
                }
                await new sql.Request(transaction)
                    .input("BienBanId", sql.Int, bienBanId)
                    .input("UserId", sql.Int, req.user.userId)
                    .query(`
                        UPDATE dbo.BIEN_BAN_CHI_PHI
                        SET TheoDoiBy = @UserId
                        WHERE BienBanId = @BienBanId
                          AND CreatedBy = @UserId
                          AND TheoDoiBy IS NULL
                    `);
                await transaction.commit();
            } catch (error) {
                await transaction.rollback();
                throw error;
            }

            res.json({ success: true, inserted: items.length });

        } catch (err) {

            console.error("AddChiPhi error:", err);

            res.status(err.statusCode || 500).json({
                message: err.message || "Không thể thêm chi phí"
            });

        }

    });

router.post(
    "/hanh-dong",
    authenticateToken,
    async (req, res) => {

        try {

            const { bienBanId } = req.body;
            const items = (Array.isArray(req.body?.items) ? req.body.items : [req.body])
                .map((item) => ({
                    noiDung: String(item?.noiDung || "").trim(),
                    thoiHan: item?.thoiHan || null,
                    trachNhiem: String(item?.trachNhiem || "").trim() || null,
                    theoDoi: String(item?.theoDoi || "").trim() || null
                }));
            if (items.length === 0 || items.some((item) =>
                !item.noiDung || !item.thoiHan
            )) {
                return res.status(400).json({ message: "Vui lòng nhập đầy đủ nội dung và thời hạn" });
            }
            if (items.some((item) => item.trachNhiem?.length > 255 || item.theoDoi?.length > 255)) {
                return res.status(400).json({ message: "Trách nhiệm và theo dõi không được vượt quá 255 ký tự" });
            }

            const userId = req.user.userId;

            const pool = await poolPromise;

            const access = await getKphSectionContributionAccess(pool, Number(bienBanId), req.user);
            if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
            if (access.isKphV01 && !access.canContribute) {
                const isLocked = access.record.CreatorConfirmedAt ||
                    ["TRA_LAI_CHINH_SUA", "CHO_THEO_DOI", "HOAN_TAT"].includes(access.record.TrangThai);
                return res.status(isLocked ? 409 : 403).json({
                    message: isLocked
                        ? "Biên bản đã khóa mục 7"
                        : "Chỉ bộ phận lập hoặc bộ phận được xin ý kiến được nhập mục 7"
                });
            }
            const requirement = await pool.request().input("BienBanId", sql.Int, bienBanId).query("SELECT TOP 1 ISNULL(YeuCauHanhDong,0) AS Required, TrangThai, CreatorConfirmedAt FROM dbo.BIEN_BAN_KIEM WHERE Id=@BienBanId");
            if ((!access.isKphV01 && !requirement.recordset?.[0]?.Required) || requirement.recordset?.[0]?.CreatorConfirmedAt ||
                (["CHO_THEO_DOI", "HOAN_TAT"].includes(requirement.recordset?.[0]?.TrangThai) ||
                    (requirement.recordset?.[0]?.TrangThai === "TRA_LAI_CHINH_SUA" && !access.canManage))) {
                return res.status(409).json({ message: "Mục hành động không được yêu cầu hoặc phiếu đã hoàn tất" });
            }

            const targetBoPhanId = access.isKphV01
                ? access.targetBoPhanId
                : req.user.boPhanId;
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                if (access.isKphV01) {
                    await assertKphSectionContributionOpen(transaction, Number(bienBanId), access.canManage);
                    await new sql.Request(transaction).input("BienBanId", sql.Int, bienBanId)
                        .query("UPDATE dbo.BIEN_BAN_KIEM SET YeuCauHanhDong=1 WHERE Id=@BienBanId");
                }
                for (const item of items) {
                    await new sql.Request(transaction)
                        .input("BienBanId", sql.Int, bienBanId)
                        .input("NoiDung", sql.NVarChar(sql.MAX), item.noiDung)
                        .input("BoPhanId", sql.Int, targetBoPhanId)
                        .input("ThoiHan", sql.Date, item.thoiHan)
                        .input("TheoDoi", sql.NVarChar(255), item.theoDoi)
                        .input("CreatedBy", sql.Int, userId)
                        .input("TrachNhiem", sql.NVarChar(255), item.trachNhiem)
                        .execute("sp_BienBan_HanhDong_Add");
                }
                await new sql.Request(transaction)
                    .input("BienBanId", sql.Int, bienBanId)
                    .input("UserId", sql.Int, userId)
                    .query(`
                        UPDATE dbo.BIEN_BAN_HANH_DONG
                        SET TheoDoiBy = @UserId
                        WHERE BienBanId = @BienBanId
                          AND CreatedBy = @UserId
                          AND TheoDoiBy IS NULL
                    `);
                await transaction.commit();
            } catch (error) {
                await transaction.rollback();
                throw error;
            }

            res.json({
                message: "Đã thêm hành động",
                inserted: items.length
            });

        } catch (err) {

            res.status(err.statusCode || 500).json({
                message: err.message || "Không thể thêm hành động"
            });

        }

    }
);

const kphOwnedSectionConfigs = {
    "xu-ly": {
        tableName: "dbo.BIEN_BAN_XU_LY",
        validate: (body) => {
            const value = {
                noiDung: String(body?.noiDung || "").trim(),
                deNghiXuLyId: Number(body?.deNghiXuLyId) || null,
                thoiHan: body?.thoiHan || null,
                trachNhiem: String(body?.trachNhiem || "").trim(),
                theoDoi: String(body?.theoDoi || "").trim()
            };
            return {
                value,
                error: !value.noiDung || !value.thoiHan || !value.trachNhiem || !value.theoDoi
                    ? "Vui lòng nhập đầy đủ nội dung, thời hạn, trách nhiệm và theo dõi"
                    : null
            };
        },
        update: (request, value) => request
            .input("NoiDung", sql.NVarChar(sql.MAX), value.noiDung)
            .input("DeNghiXuLyId", sql.Int, value.deNghiXuLyId)
            .input("ThoiHan", sql.Date, value.thoiHan)
            .input("TrachNhiem", sql.NVarChar(255), value.trachNhiem)
            .input("TheoDoi", sql.NVarChar(255), value.theoDoi)
            .query(`UPDATE dbo.BIEN_BAN_XU_LY SET NoiDung=@NoiDung,DeNghiXuLyId=@DeNghiXuLyId,
                ThoiHan=@ThoiHan,TrachNhiem=@TrachNhiem,TheoDoi=@TheoDoi WHERE Id=@RowId`)
    },
    "chi-phi": {
        tableName: "dbo.BIEN_BAN_CHI_PHI",
        validate: (body) => {
            const value = {
                loaiChiPhi: String(body?.loaiChiPhi || "").trim(),
                giaTri: Number(body?.giaTri),
                thoiHan: body?.thoiHan || null,
                trachNhiem: String(body?.trachNhiem || "").trim() || null,
                theoDoi: String(body?.theoDoi || "").trim() || null
            };
            return {
                value,
                error: !value.loaiChiPhi || !Number.isFinite(value.giaTri) || value.giaTri < 0
                    ? "Tên chi phí và giá trị không âm là bắt buộc"
                    : null
            };
        },
        update: (request, value) => request
            .input("LoaiChiPhi", sql.NVarChar(255), value.loaiChiPhi)
            .input("GiaTri", sql.Money, value.giaTri)
            .input("ThoiHan", sql.Date, value.thoiHan)
            .input("TrachNhiem", sql.NVarChar(255), value.trachNhiem)
            .input("TheoDoi", sql.NVarChar(255), value.theoDoi)
            .query(`UPDATE dbo.BIEN_BAN_CHI_PHI SET LoaiChiPhi=@LoaiChiPhi,GiaTri=@GiaTri,
                ThoiHan=@ThoiHan,TrachNhiem=@TrachNhiem,TheoDoi=@TheoDoi WHERE Id=@RowId`)
    },
    "hanh-dong": {
        tableName: "dbo.BIEN_BAN_HANH_DONG",
        validate: (body) => {
            const value = {
                noiDung: String(body?.noiDung || "").trim(),
                thoiHan: body?.thoiHan || null,
                trachNhiem: String(body?.trachNhiem || "").trim() || null,
                theoDoi: String(body?.theoDoi || "").trim() || null
            };
            return {
                value,
                error: !value.noiDung || !value.thoiHan
                    ? "Nội dung và thời hạn là bắt buộc"
                    : null
            };
        },
        update: (request, value) => request
            .input("NoiDung", sql.NVarChar(sql.MAX), value.noiDung)
            .input("ThoiHan", sql.Date, value.thoiHan)
            .input("TrachNhiem", sql.NVarChar(255), value.trachNhiem)
            .input("TheoDoi", sql.NVarChar(255), value.theoDoi)
            .query(`UPDATE dbo.BIEN_BAN_HANH_DONG SET NoiDung=@NoiDung,ThoiHan=@ThoiHan,
                TrachNhiem=@TrachNhiem,TheoDoi=@TheoDoi WHERE Id=@RowId`)
    }
};

const getOwnedSectionRow = async (executor, config, rowId) => {
    const result = await new sql.Request(executor)
        .input("RowId", sql.Int, rowId)
        .query(`SELECT sectionRow.Id,sectionRow.BienBanId,sectionRow.CreatedBy,
            bienBan.TrangThai,bienBan.CreatorConfirmedAt
            FROM ${config.tableName} sectionRow
            JOIN dbo.BIEN_BAN_KIEM bienBan ON bienBan.Id=sectionRow.BienBanId
            WHERE sectionRow.Id=@RowId`);
    return result.recordset?.[0] || null;
};

const assertOwnedSectionAccess = async (pool, config, rowId, user) => {
    const row = await getOwnedSectionRow(pool, config, rowId);
    if (!row) throw Object.assign(new Error("Không tìm thấy nội dung"), { statusCode: 404 });
    if (Number(row.CreatedBy) !== Number(user?.userId) && !isAdmin(user)) {
        throw Object.assign(new Error("Bạn chỉ được sửa hoặc xóa nội dung do mình nhập"), { statusCode: 403 });
    }
    const access = await getKphSectionContributionAccess(pool, Number(row.BienBanId), user);
    if (row.CreatorConfirmedAt || ["CHO_THEO_DOI", "HOAN_TAT"].includes(row.TrangThai) ||
        (row.TrangThai === "TRA_LAI_CHINH_SUA" && !access.canManage)) {
        throw Object.assign(new Error("Biên bản đã khóa, không thể thay đổi nội dung"), { statusCode: 409 });
    }
    if (access.isKphV01 && !access.canContribute) {
        throw Object.assign(new Error("Bạn không còn quyền cập nhật mục này"), { statusCode: 403 });
    }
    return { row, access };
};

router.patch("/section-rows/:section/:rowId", authenticateToken, async (req, res) => {
    const config = kphOwnedSectionConfigs[req.params.section];
    const rowId = Number(req.params.rowId);
    if (!config || !Number.isInteger(rowId) || rowId <= 0) {
        return res.status(400).json({ message: "Nội dung cần sửa không hợp lệ" });
    }
    const normalized = config.validate(req.body);
    if (normalized.error) return res.status(400).json({ message: normalized.error });
    if (String(normalized.value.trachNhiem || "").length > 255 || String(normalized.value.theoDoi || "").length > 255) {
        return res.status(400).json({ message: "Trách nhiệm và theo dõi không được vượt quá 255 ký tự" });
    }
    try {
        const pool = await poolPromise;
        const { row, access } = await assertOwnedSectionAccess(pool, config, rowId, req.user);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            if (access.isKphV01) {
                await assertKphSectionContributionOpen(transaction, Number(row.BienBanId), access.canManage);
            }
            const request = new sql.Request(transaction).input("RowId", sql.Int, rowId);
            await config.update(request, normalized.value);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        res.json({ success: true, message: "Đã cập nhật nội dung" });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || "Không thể cập nhật nội dung" });
    }
});

router.delete("/section-rows/:section/:rowId", authenticateToken, async (req, res) => {
    const config = kphOwnedSectionConfigs[req.params.section];
    const rowId = Number(req.params.rowId);
    if (!config || !Number.isInteger(rowId) || rowId <= 0) {
        return res.status(400).json({ message: "Nội dung cần xóa không hợp lệ" });
    }
    try {
        const pool = await poolPromise;
        const { row, access } = await assertOwnedSectionAccess(pool, config, rowId, req.user);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            if (access.isKphV01) {
                await assertKphSectionContributionOpen(transaction, Number(row.BienBanId), access.canManage);
            }
            await new sql.Request(transaction).input("RowId", sql.Int, rowId)
                .query(`DELETE FROM ${config.tableName} WHERE Id=@RowId`);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        res.json({ success: true, message: "Đã xóa nội dung" });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || "Không thể xóa nội dung" });
    }
});

router.post(
    "/xac-nhan",
    (req, res, next) => {
        console.log("[POST /bien-ban/xac-nhan] Request received", {
            bienBanId: req.body?.bienBanId,
            requestedBoPhanId: req.body?.boPhanId,
            hasAuthorization: Boolean(req.headers.authorization)
        });
        next();
    },
    authenticateToken,
    authorize("DUYET_Y_KIEN"),
    async (req, res) => {

        try {

            const { bienBanId } = req.body
            const userId = req.user.userId
            const pool = await poolPromise
            const version = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .query("SELECT TOP 1 ISNULL(MauPhieuVersion,'V00') AS MauPhieuVersion FROM dbo.BIEN_BAN_KIEM WHERE Id=@BienBanId");
            if (version.recordset?.[0]?.MauPhieuVersion === "V01") {
                return res.status(409).json({ message: "KPH V01 không sử dụng xác nhận tiến độ theo bộ phận" });
            }
            const requestedBoPhanId = Number(req.body.boPhanId) || null;
            const targetBoPhanId = requestedBoPhanId || Number(req.user.boPhanId);
            if (!isAdmin(req.user) && !await canLeadDepartment(pool, req.user, targetBoPhanId) &&
                Number(targetBoPhanId) !== Number(req.user.boPhanId)) {
                return res.status(403).json({ message: "Bạn không được xác nhận cho bộ phận này" });
            }

            const pendingOpinion = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("BoPhanId", sql.Int, targetBoPhanId || null)
                .query(`
                    SELECT TOP 1 yk.Id
                    FROM dbo.BIEN_BAN_KIEM bb
                    JOIN dbo.XIN_Y_KIEN yk ON yk.BienBanId = bb.Id
                    WHERE bb.Id = @BienBanId
                      AND bb.MauPhieuVersion = 'V01'
                      AND yk.BoPhanId = @BoPhanId
                      AND NOT EXISTS (
                          SELECT 1
                          FROM dbo.TRA_LOI_Y_KIEN tl
                          WHERE tl.XinYKienId = yk.Id
                      )
                `)

            if (pendingOpinion.recordset?.length) {
                return res.status(409).json({
                    message: "Vui lòng xác nhận ý kiến phòng ban chuyên môn trước"
                })
            }
            const target = await pool.request().input("BienBanId", sql.Int, bienBanId).input("BoPhanId", sql.Int, targetBoPhanId).query(`
                SELECT TOP 1 bp.MaBoPhan,
                    CASE WHEN UPPER(bp.MaBoPhan)='B7' AND NOT EXISTS (
                        SELECT 1 FROM dbo.BIEN_BAN_XU_LY xl WHERE xl.BienBanId=@BienBanId AND xl.BoPhanId=@BoPhanId
                    ) THEN 1 ELSE 0 END AS MissingB7Proposal
                FROM dbo.BIEN_BAN_ASSIGN a JOIN dbo.DM_BO_PHAN bp ON bp.Id=a.BoPhanId
                WHERE a.BienBanId=@BienBanId AND a.BoPhanId=@BoPhanId
            `);
            if (!target.recordset?.length) return res.status(403).json({ message: "Bộ phận không nằm trong danh sách phân xử lý" });
            if (target.recordset[0].MissingB7Proposal) return res.status(409).json({ message: "B7 chưa nhập đề xuất xử lý" });

            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("NguoiXacNhanId", sql.Int, userId)
                .input("BoPhanId", sql.Int, targetBoPhanId || null)
                .execute("sp_BienBan_XacNhan1")

            res.json({
                message: "Đã xác nhận"
            })

        } catch (err) {

            console.error("[POST /bien-ban/xac-nhan] Xác nhận thất bại", {
                bienBanId: req.body?.bienBanId,
                userId: req.user?.userId,
                userBoPhanId: req.user?.boPhanId,
                requestedBoPhanId: req.body?.boPhanId,
                error: {
                    name: err?.name,
                    message: err?.message,
                    code: err?.code,
                    number: err?.number,
                    state: err?.state,
                    class: err?.class,
                    lineNumber: err?.lineNumber,
                    serverName: err?.serverName,
                    procName: err?.procName,
                    originalError: err?.originalError?.message,
                    precedingErrors: err?.precedingErrors?.map((item) => ({
                        message: item?.message,
                        number: item?.number,
                        state: item?.state,
                        class: item?.class,
                        lineNumber: item?.lineNumber,
                        procName: item?.procName
                    })),
                    stack: err?.stack
                }
            });

            res.status(500).json({
                message: "Không thể xác nhận",
                ...(process.env.NODE_ENV !== "production" && {
                    detail: err?.originalError?.message || err?.message
                })
            })

        }

    }
)

router.post(
    "/:id/opinion-departments/confirm",
    authenticateToken,
    async (req, res) => {
        const bienBanId = Number(req.params.id);
        const boPhanIds = [...new Set((Array.isArray(req.body?.boPhanIds) ? req.body.boPhanIds : [])
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0))];
        if (boPhanIds.length === 0) {
            return res.status(400).json({ message: "Vui lòng chọn ít nhất một bộ phận cần lấy ý kiến" });
        }

        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        let transactionStarted = false;
        try {
            const access = await getKphV01FlowAccess(pool, bienBanId, req.user);
            if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
            if (!access.isKphV01) {
                return res.status(409).json({ message: "Biên bản không sử dụng luồng KPH V01" });
            }
            if (!access.canEdit) {
                return res.status(403).json({ message: "Chỉ bộ phận tạo phiếu được xác nhận danh sách cần ý kiến" });
            }
            if (access.record.CreatorConfirmedAt || ["CHO_THEO_DOI", "HOAN_TAT"].includes(access.record.TrangThai)) {
                return res.status(409).json({ message: "Biên bản đã được xác nhận và khóa nội dung" });
            }

            const readiness = await getKphBasicReadiness(pool, bienBanId);
            if (!readiness.moTaChung || readiness.defectCount < 1) {
                return res.status(409).json({ message: "Vui lòng hoàn thiện thông tin cơ bản và ít nhất một dòng lỗi" });
            }

            await transaction.begin();
            transactionStarted = true;
            const existingResult = await new sql.Request(transaction)
                .input("BienBanId", sql.Int, bienBanId)
                .query(`
                    SELECT yk.Id, yk.BoPhanId, ISNULL(yk.IsActive, 1) AS IsActive,
                        CASE WHEN EXISTS (
                            SELECT 1
                            FROM dbo.TRA_LOI_Y_KIEN tl
                            WHERE tl.XinYKienId = yk.Id
                        ) THEN 1 ELSE 0 END AS HasResponded
                    FROM dbo.XIN_Y_KIEN yk WITH (UPDLOCK, HOLDLOCK)
                    WHERE yk.BienBanId = @BienBanId
                `);
            const existing = existingResult.recordset || [];
            const selectedSet = new Set(boPhanIds);
            const invalidRemoval = access.record.TrangThai !== "TRA_LAI_CHINH_SUA" && existing.find((item) =>
                item.IsActive && !selectedSet.has(Number(item.BoPhanId)) && item.HasResponded
            );
            if (invalidRemoval) {
                await transaction.rollback();
                transactionStarted = false;
                return res.status(409).json({ message: "Không thể bỏ bộ phận đã có phản hồi" });
            }

            const opinionSyncResult = await new sql.Request(transaction)
                .input("BienBanId", sql.Int, bienBanId)
                .input("SelectedIds", sql.NVarChar(sql.MAX), boPhanIds.join(","))
                .input("UserId", sql.Int, req.user.userId)
                .input("IsReturned", sql.Bit, access.record.TrangThai === "TRA_LAI_CHINH_SUA")
                .query(`
                    DECLARE @NewOpinions TABLE (Id int NOT NULL);

                    UPDATE dbo.XIN_Y_KIEN
                    SET IsActive = 0, TrangThai = N'DA_HUY',
                        RemovedBy = @UserId, RemovedAt = SYSDATETIME()
                    WHERE BienBanId = @BienBanId
                      AND ISNULL(IsActive, 1) = 1
                      AND BoPhanId NOT IN (
                          SELECT TRY_CAST(value AS int) FROM STRING_SPLIT(@SelectedIds, ',')
                      );

                    UPDATE dbo.XIN_Y_KIEN
                    SET IsActive = 1,
                        TrangThai = CASE WHEN @IsReturned=1 THEN N'CHO_GUI_LAI' ELSE N'CHO_Y_KIEN' END,
                        RemovedBy = NULL, RemovedAt = NULL
                    WHERE BienBanId = @BienBanId
                      AND BoPhanId IN (
                          SELECT TRY_CAST(value AS int) FROM STRING_SPLIT(@SelectedIds, ',')
                      );

                    INSERT INTO dbo.XIN_Y_KIEN
                        (BienBanId, BoPhanId, BoPhan, TrangThai, ThuTu, IsActive, CreatedBy, CreatedAt)
                    OUTPUT inserted.Id INTO @NewOpinions(Id)
                    SELECT @BienBanId, bp.Id, bp.MaBoPhan,
                        CASE WHEN @IsReturned=1 THEN N'CHO_GUI_LAI' ELSE N'CHO_Y_KIEN' END,
                        ROW_NUMBER() OVER (ORDER BY bp.Id) +
                            ISNULL((SELECT MAX(ThuTu) FROM dbo.XIN_Y_KIEN WHERE BienBanId = @BienBanId), 0),
                        1, @UserId, SYSDATETIME()
                    FROM dbo.DM_BO_PHAN bp
                    JOIN (
                        SELECT DISTINCT TRY_CAST(value AS int) AS BoPhanId
                        FROM STRING_SPLIT(@SelectedIds, ',')
                    ) selected ON selected.BoPhanId = bp.Id
                    WHERE NOT EXISTS (
                        SELECT 1 FROM dbo.XIN_Y_KIEN yk
                        WHERE yk.BienBanId = @BienBanId AND yk.BoPhanId = bp.Id
                    );

                    UPDATE dbo.BIEN_BAN_KIEM
                    SET OpinionDepartmentsConfirmedAt = CASE WHEN @IsReturned=1 THEN OpinionDepartmentsConfirmedAt ELSE SYSDATETIME() END,
                        OpinionDepartmentsConfirmedBy = @UserId,
                        TrangThai = CASE
                            WHEN TrangThai IN (N'BB_MOI', N'CHO_PHAN_BO_XY_LY', N'CHO_PHAN_BO_XU_LY')
                                THEN N'CHO_XAC_NHAN'
                            ELSE TrangThai
                        END
                    WHERE Id = @BienBanId;

                    SELECT Id AS XinYKienId FROM @NewOpinions;
                `);
            await snapshotSuggestedProductResponsibles(
                transaction,
                bienBanId,
                (opinionSyncResult.recordset || []).map((item) => item.XinYKienId)
            );
            await transaction.commit();
            transactionStarted = false;
            res.json({ success: true });
        } catch (error) {
            if (transactionStarted) {
                try { await transaction.rollback(); } catch (_) { /* no-op */ }
            }
            console.error("ConfirmOpinionDepartments error:", error);
            res.status(500).json({ message: error?.originalError?.info?.message || "Không thể cập nhật danh sách cần ý kiến" });
        }
    }
);

router.post(
    "/:id/creator-confirm",
    authenticateToken,
    async (req, res) => {
        const bienBanId = Number(req.params.id);
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        try {
            const access = await getKphV01FlowAccess(pool, bienBanId, req.user);
            if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
            if (!access.isKphV01) {
                return res.status(409).json({ message: "Biên bản không sử dụng luồng KPH V01" });
            }
            const isCreatorDepartmentLead = await canLeadDepartment(pool, req.user, access.record.BoPhanTaoId);
            if (!isAdmin(req.user) && !isCreatorDepartmentLead) {
                return res.status(403).json({ message: "Chỉ Trưởng bộ phận tạo phiếu hoặc ADMIN được xác nhận cuối" });
            }
            if (!access.record.OpinionDepartmentsConfirmedAt) {
                return res.status(409).json({ message: "Danh sách bộ phận cần ý kiến chưa được xác nhận" });
            }
            if (access.record.TrangThai === "TRA_LAI_CHINH_SUA") {
                return res.status(409).json({ message: "Biên bản đang được chỉnh sửa sau khi trả lại" });
            }
            if (access.record.CreatorConfirmedAt || ["CHO_THEO_DOI", "HOAN_TAT"].includes(access.record.TrangThai)) {
                return res.status(409).json({ message: "Biên bản đã được xác nhận" });
            }

            await transaction.begin();
            const readiness = await new sql.Request(transaction)
                .input("BienBanId", sql.Int, bienBanId)
                .query(`
                    SELECT
                        bb.TrangThai,bb.CreatorConfirmedAt,
                        (SELECT COUNT(*) FROM dbo.XIN_Y_KIEN
                         WHERE BienBanId=@BienBanId AND ISNULL(IsActive,1)=1) AS TotalOpinions,
                        (SELECT COUNT(*) FROM dbo.XIN_Y_KIEN yk
                         JOIN dbo.BIEN_BAN_KIEM bb ON bb.Id=yk.BienBanId
                         WHERE yk.BienBanId=@BienBanId AND ISNULL(yk.IsActive,1)=1
                           AND yk.ConfirmedAt IS NOT NULL
                           AND yk.ConfirmedReviewRound=ISNULL(bb.ReviewRound,1)) AS ConfirmedOpinions
                    FROM dbo.BIEN_BAN_KIEM bb WITH (UPDLOCK,HOLDLOCK)
                    WHERE bb.Id=@BienBanId
                `);
            const state = readiness.recordset?.[0] || {};
            if (state.TrangThai === "TRA_LAI_CHINH_SUA" || state.CreatorConfirmedAt) {
                throw Object.assign(new Error("Biên bản không còn ở trạng thái xác nhận cuối"), { statusCode: 409 });
            }
            if (Number(state.TotalOpinions) === 0) {
                throw Object.assign(new Error("Chưa có bộ phận cần lấy ý kiến"), { statusCode: 409 });
            }
            if (Number(state.ConfirmedOpinions) < Number(state.TotalOpinions)) {
                throw Object.assign(new Error("Chưa đủ xác nhận của các Trưởng bộ phận"), { statusCode: 409 });
            }

            await new sql.Request(transaction)
                .input("BienBanId", sql.Int, bienBanId)
                .input("UserId", sql.Int, req.user.userId)
                .query(`
                    UPDATE dbo.BIEN_BAN_KIEM
                    SET CreatorConfirmedAt = SYSDATETIME(),
                        CreatorConfirmedBy = @UserId,
                        TrangThai = N'CHO_THEO_DOI'
                    WHERE Id = @BienBanId AND CreatorConfirmedAt IS NULL
                `);
            await transaction.commit();
            res.json({ success: true });
        } catch (error) {
            try { await transaction.rollback(); } catch { /* transaction chưa bắt đầu */ }
            console.error("CreatorConfirmKph error:", error);
            res.status(error.statusCode || 500).json({ message: error.message || "Không thể xác nhận cuối biên bản" });
        }
    }
);

router.post(
    "/:id/specialist-opinions",
    authenticateToken,
    authorize("XAC_NHAN_NGUOI_XU_LY"),
    async (_req, res) => {
        res.status(409).json({
            message: "Vui lòng sử dụng danh sách bộ phận cần lấy ý kiến"
        });
    }
);

router.put("/:id/specialist-opinions/:opinionId/draft", authenticateToken, async (req, res) => {
    const bienBanId = Number(req.params.id);
    const opinionId = Number(req.params.opinionId);
    const noiDung = String(req.body?.noiDung || "").trim();
    if (!noiDung) return res.status(400).json({ message: "Vui lòng nhập nội dung ý kiến" });
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const current = await new sql.Request(transaction)
            .input("BienBanId", sql.Int, bienBanId)
            .input("OpinionId", sql.Int, opinionId)
            .query(`
                SELECT yk.BoPhanId, yk.ConfirmedAt, yk.ConfirmedReviewRound,
                    ISNULL(bb.ReviewRound,1) AS ReviewRound
                FROM dbo.XIN_Y_KIEN yk WITH (UPDLOCK,HOLDLOCK)
                JOIN dbo.BIEN_BAN_KIEM bb ON bb.Id=yk.BienBanId
                WHERE yk.Id=@OpinionId AND yk.BienBanId=@BienBanId
                  AND ISNULL(yk.IsActive,1)=1 AND ISNULL(bb.MauPhieuVersion,'V00')='V01'
                  AND ISNULL(bb.LoaiBienBan,'GENERAL') IN ('GENERAL','STANDALONE')
                  AND bb.OpinionDepartmentsConfirmedAt IS NOT NULL
                  AND bb.CreatorConfirmedAt IS NULL
                  AND bb.TrangThai NOT IN ('TRA_LAI_CHINH_SUA','CHO_THEO_DOI','HOAN_TAT')
            `);
        const row = current.recordset?.[0];
        if (!row) throw Object.assign(new Error("Yêu cầu ý kiến không còn ở trạng thái nhập ý kiến"), { statusCode: 409 });
        const managedDepartmentIds = await getManagedDepartmentIds(transaction, req.user.userId, req.user.boPhanId);
        if (!isAdmin(req.user) && !managedDepartmentIds.includes(Number(row.BoPhanId))) {
            throw Object.assign(new Error("Bạn không thuộc bộ phận được xin ý kiến"), { statusCode: 403 });
        }
        if (row.ConfirmedAt && Number(row.ConfirmedReviewRound) === Number(row.ReviewRound)) {
            throw Object.assign(new Error("Ý kiến đã được Trưởng bộ phận xác nhận"), { statusCode: 409 });
        }
        await new sql.Request(transaction)
            .input("BienBanId", sql.Int, bienBanId)
            .input("OpinionId", sql.Int, opinionId)
            .input("BoPhanId", sql.Int, row.BoPhanId)
            .input("ReviewRound", sql.Int, row.ReviewRound)
            .input("UserId", sql.Int, req.user.userId)
            .input("NoiDung", sql.NVarChar(sql.MAX), noiDung)
            .query(`
                DECLARE @ResponseId int;
                SELECT TOP 1 @ResponseId=Id FROM dbo.TRA_LOI_Y_KIEN WITH (UPDLOCK,HOLDLOCK)
                WHERE XinYKienId=@OpinionId ORDER BY ThoiGian DESC,Id DESC;
                IF @ResponseId IS NULL
                    INSERT dbo.TRA_LOI_Y_KIEN (XinYKienId,NguoiTraLoiId,NoiDung,LuaChon,ThoiGian)
                    VALUES (@OpinionId,@UserId,@NoiDung,'CO',SYSDATETIME());
                ELSE
                    UPDATE dbo.TRA_LOI_Y_KIEN
                    SET NguoiTraLoiId=@UserId,NoiDung=@NoiDung,LuaChon='CO',ThoiGian=SYSDATETIME()
                    WHERE Id=@ResponseId;

                UPDATE dbo.XIN_Y_KIEN
                SET OpinionSavedBy=@UserId,OpinionSavedAt=SYSDATETIME(),
                    OpinionReviewRound=@ReviewRound,TrangThai=N'CHO_TBP_XAC_NHAN'
                WHERE Id=@OpinionId;

                INSERT dbo.BIEN_BAN_KPH_REVIEW_HISTORY
                    (BienBanId,XinYKienId,BoPhanId,ReviewRound,ActionCode,ActorUserId,OpinionContent)
                VALUES (@BienBanId,@OpinionId,@BoPhanId,@ReviewRound,'LUU_Y_KIEN',@UserId,@NoiDung);
            `);
        await transaction.commit();
        res.json({ success: true, message: "Đã lưu ý kiến, chờ Trưởng bộ phận xác nhận" });
    } catch (error) {
        try { await transaction.rollback(); } catch { /* transaction chưa bắt đầu */ }
        console.error("SaveSpecialistOpinionDraft error:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Không thể lưu ý kiến" });
    }
});

router.post("/:id/specialist-opinions/:opinionId/confirm", authenticateToken, async (req, res) => {
    const bienBanId = Number(req.params.id);
    const opinionId = Number(req.params.opinionId);
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const current = await new sql.Request(transaction)
            .input("BienBanId", sql.Int, bienBanId)
            .input("OpinionId", sql.Int, opinionId)
            .query(`
                SELECT yk.BoPhanId,yk.ConfirmedAt,yk.ConfirmedReviewRound,
                    yk.OpinionReviewRound,ISNULL(bb.ReviewRound,1) AS ReviewRound,response.NoiDung
                FROM dbo.XIN_Y_KIEN yk WITH (UPDLOCK,HOLDLOCK)
                JOIN dbo.BIEN_BAN_KIEM bb ON bb.Id=yk.BienBanId
                OUTER APPLY (SELECT TOP 1 tl.NoiDung FROM dbo.TRA_LOI_Y_KIEN tl
                    WHERE tl.XinYKienId=yk.Id ORDER BY tl.ThoiGian DESC,tl.Id DESC) response
                WHERE yk.Id=@OpinionId AND yk.BienBanId=@BienBanId AND ISNULL(yk.IsActive,1)=1
                  AND ISNULL(bb.MauPhieuVersion,'V00')='V01'
                  AND ISNULL(bb.LoaiBienBan,'GENERAL') IN ('GENERAL','STANDALONE')
                  AND bb.OpinionDepartmentsConfirmedAt IS NOT NULL
                  AND bb.CreatorConfirmedAt IS NULL
                  AND bb.TrangThai NOT IN ('TRA_LAI_CHINH_SUA','CHO_THEO_DOI','HOAN_TAT')
            `);
        const row = current.recordset?.[0];
        if (!row) throw Object.assign(new Error("Yêu cầu ý kiến không còn hiệu lực"), { statusCode: 409 });
        const ownsDepartment = await canLeadDepartment(transaction, req.user, row.BoPhanId);
        if (!isAdmin(req.user) && !ownsDepartment) {
            throw Object.assign(new Error("Chỉ Trưởng bộ phận được xin ý kiến hoặc ADMIN được xác nhận"), { statusCode: 403 });
        }
        if (!row.NoiDung?.trim() || Number(row.OpinionReviewRound) !== Number(row.ReviewRound)) {
            throw Object.assign(new Error("Bộ phận chưa lưu ý kiến trong vòng hiện tại"), { statusCode: 409 });
        }
        if (row.ConfirmedAt && Number(row.ConfirmedReviewRound) === Number(row.ReviewRound)) {
            throw Object.assign(new Error("Bộ phận đã xác nhận trong vòng hiện tại"), { statusCode: 409 });
        }
        await new sql.Request(transaction)
            .input("BienBanId", sql.Int, bienBanId).input("OpinionId", sql.Int, opinionId)
            .input("BoPhanId", sql.Int, row.BoPhanId).input("ReviewRound", sql.Int, row.ReviewRound)
            .input("UserId", sql.Int, req.user.userId).input("NoiDung", sql.NVarChar(sql.MAX), row.NoiDung)
            .query(`
                UPDATE dbo.XIN_Y_KIEN SET ConfirmedBy=@UserId,ConfirmedAt=SYSDATETIME(),
                    ConfirmedReviewRound=@ReviewRound,TrangThai=N'DA_XAC_NHAN' WHERE Id=@OpinionId;
                INSERT dbo.BIEN_BAN_KPH_REVIEW_HISTORY
                    (BienBanId,XinYKienId,BoPhanId,ReviewRound,ActionCode,ActorUserId,OpinionContent)
                VALUES (@BienBanId,@OpinionId,@BoPhanId,@ReviewRound,'XAC_NHAN',@UserId,@NoiDung);
            `);
        await transaction.commit();
        res.json({ success: true, message: "Đã xác nhận và ghi nhận chữ ký" });
    } catch (error) {
        try { await transaction.rollback(); } catch { /* transaction chưa bắt đầu */ }
        console.error("ConfirmSpecialistOpinion error:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Không thể xác nhận ý kiến" });
    }
});

router.post("/:id/specialist-opinions/:opinionId/return", authenticateToken, async (req, res) => {
    const bienBanId = Number(req.params.id);
    const opinionId = Number(req.params.opinionId);
    const reason = String(req.body?.reason || "").trim();
    if (!reason) return res.status(400).json({ message: "Vui lòng nhập lý do trả lại" });
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const current = await new sql.Request(transaction)
            .input("BienBanId", sql.Int, bienBanId).input("OpinionId", sql.Int, opinionId)
            .query(`
                SELECT yk.BoPhanId,yk.OpinionReviewRound,yk.ConfirmedAt,yk.ConfirmedReviewRound,
                    ISNULL(bb.ReviewRound,1) ReviewRound,response.NoiDung
                FROM dbo.XIN_Y_KIEN yk WITH (UPDLOCK,HOLDLOCK)
                JOIN dbo.BIEN_BAN_KIEM bb WITH (UPDLOCK,HOLDLOCK) ON bb.Id=yk.BienBanId
                OUTER APPLY (SELECT TOP 1 tl.NoiDung FROM dbo.TRA_LOI_Y_KIEN tl
                    WHERE tl.XinYKienId=yk.Id ORDER BY tl.ThoiGian DESC,tl.Id DESC) response
                WHERE yk.Id=@OpinionId AND yk.BienBanId=@BienBanId AND ISNULL(yk.IsActive,1)=1
                  AND ISNULL(bb.MauPhieuVersion,'V00')='V01'
                  AND ISNULL(bb.LoaiBienBan,'GENERAL') IN ('GENERAL','STANDALONE')
                  AND bb.OpinionDepartmentsConfirmedAt IS NOT NULL
                  AND bb.CreatorConfirmedAt IS NULL
                  AND bb.TrangThai NOT IN ('TRA_LAI_CHINH_SUA','CHO_THEO_DOI','HOAN_TAT')
            `);
        const row = current.recordset?.[0];
        if (!row) throw Object.assign(new Error("Yêu cầu ý kiến không còn hiệu lực"), { statusCode: 409 });
        const ownsDepartment = await canLeadDepartment(transaction, req.user, row.BoPhanId);
        if (!isAdmin(req.user) && !ownsDepartment) {
            throw Object.assign(new Error("Chỉ Trưởng bộ phận được xin ý kiến hoặc ADMIN được trả lại"), { statusCode: 403 });
        }
        if (!row.NoiDung?.trim() || Number(row.OpinionReviewRound) !== Number(row.ReviewRound)) {
            throw Object.assign(new Error("Bộ phận chưa lưu ý kiến trong vòng hiện tại"), { statusCode: 409 });
        }
        if (row.ConfirmedAt && Number(row.ConfirmedReviewRound) === Number(row.ReviewRound)) {
            throw Object.assign(new Error("Bộ phận đã xác nhận trong vòng hiện tại"), { statusCode: 409 });
        }
        await new sql.Request(transaction)
            .input("BienBanId", sql.Int, bienBanId).input("OpinionId", sql.Int, opinionId)
            .input("BoPhanId", sql.Int, row.BoPhanId).input("ReviewRound", sql.Int, row.ReviewRound)
            .input("UserId", sql.Int, req.user.userId).input("NoiDung", sql.NVarChar(sql.MAX), row.NoiDung)
            .input("Reason", sql.NVarChar(2000), reason)
            .query(`
                UPDATE dbo.XIN_Y_KIEN SET ConfirmedBy=NULL,ConfirmedAt=NULL,
                    ConfirmedReviewRound=NULL,TrangThai=N'CHO_GUI_LAI'
                WHERE BienBanId=@BienBanId AND ISNULL(IsActive,1)=1;
                UPDATE dbo.BIEN_BAN_KIEM SET TrangThai=N'TRA_LAI_CHINH_SUA',
                    LastReturnedBy=@UserId,LastReturnedAt=SYSDATETIME(),LastReturnReason=@Reason
                WHERE Id=@BienBanId AND CreatorConfirmedAt IS NULL;
                INSERT dbo.BIEN_BAN_KPH_REVIEW_HISTORY
                    (BienBanId,XinYKienId,BoPhanId,ReviewRound,ActionCode,ActorUserId,OpinionContent,Reason)
                VALUES (@BienBanId,@OpinionId,@BoPhanId,@ReviewRound,'TRA_LAI',@UserId,@NoiDung,@Reason);
            `);
        await transaction.commit();
        res.json({ success: true, message: "Đã trả lại biên bản cho bộ phận lập chỉnh sửa" });
    } catch (error) {
        try { await transaction.rollback(); } catch { /* transaction chưa bắt đầu */ }
        console.error("ReturnSpecialistOpinion error:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Không thể trả lại biên bản" });
    }
});

router.post("/:id/resubmit", authenticateToken, async (req, res) => {
    const bienBanId = Number(req.params.id);
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    try {
        const access = await getKphV01FlowAccess(pool, bienBanId, req.user);
        if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
        if (!access.isKphV01 || !access.canResubmit) {
            return res.status(access.canManage ? 409 : 403).json({ message: "Bạn không thể gửi lại biên bản ở trạng thái hiện tại" });
        }
        const basicReadiness = await getKphBasicReadiness(pool, bienBanId);
        if (!basicReadiness.moTaChung || basicReadiness.defectCount < 1) {
            return res.status(409).json({ message: "Vui lòng hoàn thiện thông tin và ít nhất một dòng lỗi" });
        }
        await transaction.begin();
        const readiness = await new sql.Request(transaction).input("BienBanId", sql.Int, bienBanId).query(`
            SELECT TrangThai,
                (SELECT COUNT(*) FROM dbo.XIN_Y_KIEN WHERE BienBanId=@BienBanId AND ISNULL(IsActive,1)=1) OpinionCount,
                ISNULL(ReviewRound,1) ReviewRound
            FROM dbo.BIEN_BAN_KIEM WITH (UPDLOCK,HOLDLOCK) WHERE Id=@BienBanId
        `);
        const row = readiness.recordset?.[0];
        if (row?.TrangThai !== "TRA_LAI_CHINH_SUA") {
            throw Object.assign(new Error("Biên bản không còn ở trạng thái chờ gửi lại"), { statusCode: 409 });
        }
        if (Number(row.OpinionCount) < 1) {
            throw Object.assign(new Error("Vui lòng hoàn thiện thông tin, lỗi và danh sách bộ phận cần ý kiến"), { statusCode: 409 });
        }
        const nextRound = Number(row.ReviewRound) + 1;
        await new sql.Request(transaction)
            .input("BienBanId", sql.Int, bienBanId).input("ReviewRound", sql.Int, nextRound)
            .input("UserId", sql.Int, req.user.userId)
            .query(`
                UPDATE dbo.XIN_Y_KIEN SET OpinionSavedBy=NULL,OpinionSavedAt=NULL,OpinionReviewRound=NULL,
                    ConfirmedBy=NULL,ConfirmedAt=NULL,ConfirmedReviewRound=NULL,TrangThai=N'CHO_Y_KIEN'
                WHERE BienBanId=@BienBanId AND ISNULL(IsActive,1)=1;
                UPDATE dbo.BIEN_BAN_KIEM SET ReviewRound=@ReviewRound,TrangThai=N'CHO_XAC_NHAN',
                    ResubmittedBy=@UserId,ResubmittedAt=SYSDATETIME()
                WHERE Id=@BienBanId AND TrangThai=N'TRA_LAI_CHINH_SUA';
                INSERT dbo.BIEN_BAN_KPH_REVIEW_HISTORY
                    (BienBanId,ReviewRound,ActionCode,ActorUserId)
                VALUES (@BienBanId,@ReviewRound,'GUI_LAI',@UserId);
            `);
        await transaction.commit();
        res.json({ success: true, message: "Đã gửi lại các bộ phận xác nhận", reviewRound: nextRound });
    } catch (error) {
        try { await transaction.rollback(); } catch { /* transaction chưa bắt đầu */ }
        console.error("ResubmitKphReview error:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Không thể gửi lại biên bản" });
    }
});

router.post("/:id/specialist-opinions/:opinionId/respond", authenticateToken, (_req, res) => {
    res.status(410).json({ message: "Luồng xác nhận cũ đã ngừng sử dụng. Vui lòng cập nhật ứng dụng." });
});

router.post(
    "/:id/follow-up-evaluation",
    authenticateToken,
    authorize(["THEO_DOI_KPH", "KET_LUAN"]),
    async (req, res) => {
        const bienBanId = Number(req.params.id);
        const ketQua = String(req.body?.ketQua || "").toUpperCase();
        const phieuKphMoiSo = String(req.body?.phieuKphMoiSo || "").trim();
        const ghiChu = String(req.body?.ghiChu || "").trim();

        if (!["THOA_MAN", "KHONG_THOA_MAN"].includes(ketQua)) {
            return res.status(400).json({ message: "Kết quả theo dõi không hợp lệ" });
        }
        if (ketQua === "KHONG_THOA_MAN" && !phieuKphMoiSo) {
            return res.status(400).json({ message: "Vui lòng nhập số phiếu KPH mới" });
        }

        const pool = await poolPromise;
        try {
            const state = await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .query(`
                    SELECT TOP 1 bb.TrangThai,
                        CASE WHEN EXISTS (
                            SELECT 1 FROM dbo.BIEN_BAN_THEO_DOI_DANH_GIA td
                            WHERE td.BienBanId = bb.Id
                        ) THEN 1 ELSE 0 END AS DaDanhGia
                    FROM dbo.BIEN_BAN_KIEM bb WHERE bb.Id = @BienBanId
                `);
            const row = state.recordset?.[0];
            if (!row) return res.status(404).json({ message: "Không tìm thấy phiếu" });
            if (row.DaDanhGia) return res.status(409).json({ message: "Phiếu đã được đánh giá và không thể sửa" });
            if (row.TrangThai !== "CHO_THEO_DOI") {
                return res.status(409).json({ message: "Phiếu chưa sẵn sàng để theo dõi đánh giá" });
            }

            await pool.request()
                .input("BienBanId", sql.Int, bienBanId)
                .input("KetQua", sql.VarChar(20), ketQua)
                .input("PhieuKphMoiSo", sql.NVarChar(50), phieuKphMoiSo || null)
                .input("GhiChu", sql.NVarChar(sql.MAX), ghiChu || null)
                .input("UserId", sql.Int, req.user.userId)
                .query(`
                    INSERT INTO dbo.BIEN_BAN_THEO_DOI_DANH_GIA
                        (BienBanId, KetQua, PhieuKphMoiSo, GhiChu, NguoiTheoDoiId)
                    VALUES (@BienBanId, @KetQua, @PhieuKphMoiSo, @GhiChu, @UserId);
                    UPDATE dbo.BIEN_BAN_KIEM SET TrangThai = N'HOAN_TAT' WHERE Id = @BienBanId;
                `);
            res.json({ success: true });
        } catch (error) {
            console.error("SaveFollowUpEvaluation error:", error);
            res.status(500).json({ message: "Không thể lưu kết quả theo dõi" });
        }
    }
);

router.post('/custom-fields', authenticateToken, async (req, res) => {
    try {
        const { bienBanId, fields } = req.body;
        const pool = await poolPromise;
        const access = await getKphCustomFieldAccess(pool, Number(bienBanId), req.user);
        if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
        if (access.record.MauPhieuVersion !== "V01") return res.status(409).json({ message: "Biên bản không sử dụng mẫu V01" });
        if (!access.canEdit) return res.status(403).json({ message: "Bạn không có quyền sửa thông tin mẫu KPH" });
        const normalizedFields = Object.fromEntries(
            Object.entries(fields || {}).filter(([key]) => KPH_V01_CUSTOM_FIELDS.has(key))
        );
        if (Object.keys(normalizedFields).length === 0) return res.status(400).json({ message: "Không có trường dữ liệu hợp lệ để lưu" });
        const jsonString = JSON.stringify(normalizedFields);
        await pool.request()
            .input('BienBanId', sql.Int, bienBanId)
            .input('JsonData', sql.NVarChar(sql.MAX), jsonString)
            .execute('SP_Upsert_BienBan_CustomFields');

        res.status(200).json({ success: true, message: 'Đã lưu thông tin fields' });
    } catch (error) {
        console.error("Lỗi lưu custom fields biên bản:", error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

router.delete('/:id',authenticateToken,requireExactPermission('XOA_HO_SO_KCS'),async(req,res)=>{
    const bienBanId=Number(req.params.id);
    if(!Number.isInteger(bienBanId)||bienBanId<=0){
        return res.status(400).json({message:'Id biên bản không hợp lệ'});
    }
    const pool=await poolPromise;
    const transaction=new sql.Transaction(pool);
    let transactionStarted=false;
    try{
        const record=await pool.request().input('BienBanId',sql.Int,bienBanId).query(`
            SELECT TOP(1) Id,LoaiBienBan FROM dbo.BIEN_BAN_KIEM WHERE Id=@BienBanId
        `);
        const bienBan=record.recordset?.[0];
        if(!bienBan)return res.status(404).json({message:'Không tìm thấy biên bản'});
        if(bienBan.LoaiBienBan==='STANDALONE'){
            return res.status(409).json({message:'Vui lòng xóa tại màn Phiếu xử lý không phù hợp'});
        }
        const files=await getBienBanFiles(pool,[bienBanId]);
        await transaction.begin();
        transactionStarted=true;
        const deletedCount=await deleteBienBanData(transaction,[bienBanId],req.user.userId);
        if(!deletedCount){
            await transaction.rollback();
            transactionStarted=false;
            return res.status(404).json({message:'Biên bản đã bị xóa hoặc không còn tồn tại'});
        }
        await transaction.commit();
        transactionStarted=false;
        await removeBienBanFiles(files);
        res.json({success:true,message:'Đã xóa biên bản và toàn bộ dữ liệu liên quan'});
    }catch(error){
        if(transactionStarted){try{await transaction.rollback();}catch{/* no-op */}}
        console.error('DeleteBienBan error:',error);
        res.status(500).json({message:error?.originalError?.info?.message||error.message||'Không thể xóa biên bản'});
    }
});
module.exports = router;
