const express = require("express");
const router = express.Router();
const sql = require("mssql");

const { poolPromise } = require("../db");
const authenticateToken = require("../middlewares/auth.middleware");
const requireExactPermission = require("../middlewares/exactPermission.middleware");
const { getManagedDepartmentIds, canLeadDepartment } = require("../utils/managedDepartments");
const { loadBienBanListSummaries, mergeBienBanListSummary } = require("../utils/bienBanListSummary");
const { sortKphListRows } = require("../utils/kphListSorting");
const { loadSignatureDataUrlMap } = require("../utils/signatureImage");
const { loadKphSectionRows } = require("../utils/kphSectionRows");
const { canViewKphListItem } = require("../utils/kphListVisibility");
const {
    getBienBanFiles,
    deleteBienBanData,
    removeBienBanFiles
} = require("../services/kcsRecordDeletion.service");

const hasStrictLeadRole = (user) => Array.isArray(user?.roles) &&
    user.roles.some((role) => String(role || "").toUpperCase().startsWith("TP_"));
const hasRole = (user, roleCode) => Array.isArray(user?.roles) &&
    user.roles.some((role) => String(role || "").toUpperCase() === roleCode);
const hasPermission = (user, permissionCode) => Array.isArray(user?.permissions) &&
    user.permissions.includes(permissionCode);
const isAdmin = (user) => hasRole(user, "ADMIN");
const hasGlobalKphVisibility = (user) => isAdmin(user) ||
    ["QUAN_TRI_DM", "XAC_NHAN_NGUOI_XU_LY", "KET_LUAN"]
        .some((permission) => hasPermission(user, permission));
const isDepartmentLead = (user) => hasRole(user, "TP_BP");

const getStandaloneReadAccess = async (pool, bienBanId, user) => {
    const result = await pool.request()
        .input("BienBanId", sql.Int, bienBanId)
        .input("UserId", sql.Int, Number(user?.userId) || null)
        .input("BoPhanId", sql.Int, Number(user?.boPhanId) || null)
        .input("CanViewAll", sql.Bit, hasGlobalKphVisibility(user))
        .input("IsDepartmentLead", sql.Bit, isDepartmentLead(user))
        .query(`
            SELECT TOP 1
                CAST(1 AS bit) AS ExistsFlag,

                CAST(CASE WHEN
                    -- 1. Quyền xem toàn bộ
                    @CanViewAll = 1

                    -- 2. Chính người lập biên bản
                    OR bb.NguoiLapId = @UserId

                    -- 3. Người cùng bộ phận tạo biên bản
                    OR COALESCE(bb.BoPhanTaoId, creator.BoPhanId) = @BoPhanId

                    -- 4. Trưởng bộ phận quản lý bộ phận tạo
                    OR (
                        @IsDepartmentLead = 1
                        AND EXISTS (
                            SELECT 1
                            FROM dbo.USER_BO_PHAN_QUAN_LY managed
                            WHERE managed.UserId = @UserId
                              AND managed.IsActive = 1
                              AND managed.BoPhanId =
                                  COALESCE(bb.BoPhanTaoId, creator.BoPhanId)
                        )
                    )

                    -- 5. Bộ phận / người được phân công xử lý
                    OR EXISTS (
                        SELECT 1
                        FROM dbo.BIEN_BAN_ASSIGN assignment
                        WHERE assignment.BienBanId = bb.Id
                          AND (
                              assignment.BoPhanId = @BoPhanId
                              OR assignment.NguoiXuLyId = @UserId

                              OR (
                                  @IsDepartmentLead = 1
                                  AND EXISTS (
                                      SELECT 1
                                      FROM dbo.USER_BO_PHAN_QUAN_LY managed
                                      WHERE managed.UserId = @UserId
                                        AND managed.IsActive = 1
                                        AND managed.BoPhanId = assignment.BoPhanId
                                  )
                              )
                          )
                    )

                    -- 6. Bộ phận được xin ý kiến
                    OR EXISTS (
                        SELECT 1
                        FROM dbo.XIN_Y_KIEN opinion
                        WHERE opinion.BienBanId = bb.Id
                          AND (
                              opinion.BoPhanId = @BoPhanId

                              OR (
                                  @IsDepartmentLead = 1
                                  AND EXISTS (
                                      SELECT 1
                                      FROM dbo.USER_BO_PHAN_QUAN_LY managed
                                      WHERE managed.UserId = @UserId
                                        AND managed.IsActive = 1
                                        AND managed.BoPhanId = opinion.BoPhanId
                                  )
                              )
                          )
                          AND ISNULL(opinion.IsActive, 1) = 1
                    )

                    -- 7. Bộ phận ký BPSX
                    OR EXISTS (
                        SELECT 1
                        FROM dbo.BienBan_CustomFields customField
                        WHERE customField.BienBanId = bb.Id
                          AND customField.FieldName = N'BpsxSignatureBoPhanId'
                          AND TRY_CAST(customField.FieldValue AS int) = @BoPhanId
                    )

                    THEN 1
                    ELSE 0
                END AS bit) AS CanRead

            FROM dbo.BIEN_BAN_KIEM bb
            LEFT JOIN dbo.USERS creator
                ON creator.Id = bb.NguoiLapId

            WHERE bb.Id = @BienBanId
              AND bb.LoaiBienBan = N'STANDALONE'
        `);

    const record = result.recordset?.[0];

    return {
        exists: Boolean(record?.ExistsFlag),
        canRead: Boolean(record?.CanRead)
    };
};
const getHeaderAccess = async (pool, bienBanId, user) => {
    const result = await pool.request().input("BienBanId", sql.Int, bienBanId).query(`
        SELECT TOP 1 bb.NguoiLapId, bb.TrangThai, ISNULL(bb.MauPhieuVersion, 'V00') AS MauPhieuVersion,
            COALESCE(bb.BoPhanTaoId, creator.BoPhanId) AS CreatorBoPhanId,
            bb.OpinionDepartmentsConfirmedAt, bb.CreatorConfirmedAt,
            ISNULL(bb.ReviewRound,1) AS ReviewRound
        FROM dbo.BIEN_BAN_KIEM bb
        LEFT JOIN dbo.USERS creator ON creator.Id = bb.NguoiLapId
        WHERE bb.Id = @BienBanId
    `);
    const record = result.recordset?.[0];
    if (!record) return { exists: false, canEdit: false, record: null };
    const canEdit = record.MauPhieuVersion === "V01" && !record.CreatorConfirmedAt &&
        !["CHO_THEO_DOI", "HOAN_TAT"].includes(record.TrangThai) &&
        (!record.OpinionDepartmentsConfirmedAt || record.TrangThai === "TRA_LAI_CHINH_SUA") && (
            Number(record.NguoiLapId) === Number(user?.userId) ||
            await canLeadDepartment(pool, user, record.CreatorBoPhanId) ||
            isAdmin(user)
        );
    return { exists: true, canEdit, record };
};
const KPH_V01_CUSTOM_FIELDS = new Set([
    "TenBoPhan", "MaBoPhan", "TenSanPham", "MaSanPham", "MaTruyNguyen",
    "DonHang", "Lot", "SoLuongKPH", "DauTuan", "PhatHienTu", "MucDo",
    "ItemSourceType", "ItemSourceId", "LocalProductId", "OrderId"
]);

const enrichDefectCodes = async (pool, defects = []) => {
    const defectIds = [...new Set(
        defects
            .filter((item) => !item.MaLoi && item.DefectId)
            .map((item) => Number(item.DefectId))
            .filter((id) => Number.isInteger(id) && id > 0)
    )];

    if (defectIds.length === 0) return defects;

    const result = await pool.request().query(`
        SELECT Id, MaLoi, TenLoi, DefectType
        FROM dbo.DM_DEFECT
        WHERE Id IN (${defectIds.join(",")})
    `);
    const defectMap = new Map((result.recordset || []).map((item) => [Number(item.Id), item]));

    return defects.map((item) => {
        const catalog = defectMap.get(Number(item.DefectId));
        return catalog ? { ...catalog, ...item, MaLoi: item.MaLoi || catalog.MaLoi } : item;
    });
};

router.get("/", authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const canViewAll = hasGlobalKphVisibility(req.user);

        const managedDepartmentIds = await getManagedDepartmentIds(pool, req.user.userId, req.user.boPhanId);
        let rows = [];
        if (canViewAll) {
            const result = await pool.request().execute("sp_PhieuXuLyKPH_GetList");
            rows = result.recordset || [];
        } else {
            const rowsById = new Map();
            for (const departmentId of managedDepartmentIds) {
                const result = await pool.request()
                    .input("UserId", sql.Int, req.user.userId)
                    .input("BoPhanId", sql.Int, departmentId)
                    .input("IsDepartmentLead", sql.Bit, isDepartmentLead(req.user))
                    .execute("sp_PhieuXuLyKPH_GetList");
                (result.recordset || []).forEach((item) => rowsById.set(Number(item.BienBanId), item));
            }
            rows = [...rowsById.values()];
        }
        const ids = rows.map((item) => Number(item.BienBanId)).filter((id) => Number.isInteger(id) && id > 0);
        if (!ids.length) return res.json(rows);
        const creatorDepartmentResult = await pool.request().query(`
            SELECT
                bb.Id AS BienBanId,
                bb.LoaiBienBan,
                bb.NguoiLapId,
                ISNULL(bb.MauPhieuVersion, N'V00') AS MauPhieuVersion,
                bb.OpinionDepartmentsConfirmedAt,
                bb.CreatorConfirmedAt AS FollowUpReadyAt,
                CASE WHEN bb.TrangThai = N'HOAN_TAT' THEN followUp.ThoiGian ELSE NULL END AS CompletedAt,
                COALESCE(bb.BoPhanTaoId, creator.BoPhanId) AS CreatorBoPhanId,
                department.MaBoPhan AS MaBoPhanTao,
                department.TenBoPhan AS TenBoPhanTao
            FROM dbo.BIEN_BAN_KIEM bb
            LEFT JOIN dbo.USERS creator ON creator.Id = bb.NguoiLapId
            LEFT JOIN dbo.DM_BO_PHAN department
                ON department.Id = COALESCE(bb.BoPhanTaoId, creator.BoPhanId)
            OUTER APPLY (
                SELECT TOP 1 evaluation.ThoiGian
                FROM dbo.BIEN_BAN_THEO_DOI_DANH_GIA evaluation
                WHERE evaluation.BienBanId = bb.Id
                ORDER BY evaluation.ThoiGian DESC, evaluation.Id DESC
            ) followUp
            WHERE bb.Id IN (${ids.join(",")})
        `);
        const creatorDepartmentMap = new Map(
            (creatorDepartmentResult.recordset || []).map((item) => [Number(item.BienBanId), item])
        );
        const summaryFieldMap = await loadBienBanListSummaries(pool, ids);
        const progressResult = await pool.request().query(`
            SELECT yk.BienBanId,yk.BoPhanId,bp.MaBoPhan,bp.TenBoPhan,
                yk.SuggestedUserId,suggestedUser.FullName AS SuggestedUserName,
                CASE WHEN EXISTS (
                    SELECT 1 FROM dbo.TRA_LOI_Y_KIEN response
                    WHERE response.XinYKienId=yk.Id
                      AND NULLIF(LTRIM(RTRIM(response.NoiDung)),N'') IS NOT NULL
                ) AND yk.OpinionReviewRound=ISNULL(bb.ReviewRound,1)
                    THEN 1 ELSE 0 END AS HasOpinion,
                CASE WHEN yk.ConfirmedAt IS NOT NULL
                    AND yk.ConfirmedReviewRound=ISNULL(bb.ReviewRound,1) THEN 1 ELSE 0 END DaXacNhan
            FROM dbo.XIN_Y_KIEN yk
            JOIN dbo.BIEN_BAN_KIEM bb ON bb.Id=yk.BienBanId
            LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id=yk.BoPhanId
            LEFT JOIN dbo.USERS suggestedUser ON suggestedUser.Id=yk.SuggestedUserId
            WHERE yk.BienBanId IN (${ids.join(",")}) AND ISNULL(yk.IsActive,1)=1
        `);
        const progressMap = new Map();
        for (const item of progressResult.recordset || []) {
            const key = Number(item.BienBanId);
            const progress = progressMap.get(key) || { total: 0, done: 0, pending: [], departments: [] };
            progress.total += 1;
            const departmentId = Number(item.BoPhanId);
            if (Number.isInteger(departmentId) && departmentId > 0
                && !progress.departments.some((department) => department.id === departmentId)) {
                progress.departments.push({
                    id: departmentId,
                    maBoPhan: item.MaBoPhan || null,
                    tenBoPhan: item.TenBoPhan || null
                });
            }
            if (Number(item.DaXacNhan) === 1) progress.done += 1;
            else progress.pending.push({
                departmentId,
                departmentName: item.TenBoPhan || item.MaBoPhan,
                suggestedUserId: Number(item.SuggestedUserId) || null,
                suggestedUserName: item.SuggestedUserName || null,
                hasOpinion: Number(item.HasOpinion) === 1
            });
            progressMap.set(key, progress);
        }
        const normalizedRows = rows.map((item) => {
            const creatorDepartment = creatorDepartmentMap.get(Number(item.BienBanId)) || {};
            const summaryFields = summaryFieldMap.get(Number(item.BienBanId));
            const progress = progressMap.get(Number(item.BienBanId));
            if (!progress) return mergeBienBanListSummary({
                ...item,
                ...creatorDepartment,
                OpinionDepartments: []
            }, summaryFields);
            const myPending = progress.pending.find((pending) =>
                managedDepartmentIds.includes(pending.departmentId)
            );
            return mergeBienBanListSummary({
                ...item,
                ...creatorDepartment,
                SoBoPhan: progress.total,
                DaCoYKien: progress.done,
                BoPhanChuaXacNhanText: progress.pending.map((pending) =>
                    [pending.departmentName, pending.suggestedUserName].filter(Boolean).join(" — ")
                ).filter(Boolean).join(", ") || null,
                MyPendingSuggestedUserId: myPending?.suggestedUserId || null,
                MyDepartmentOpinionStatus: myPending
                    ? (myPending.hasOpinion ? "CHO_TBP_XAC_NHAN" : "CHO_Y_KIEN")
                    : null,
                OpinionDepartments: progress.departments
            }, summaryFields);
        });
        const visibleRows = normalizedRows.filter((item) =>
            canViewKphListItem(item, req.user, managedDepartmentIds)
        );
        res.json(sortKphListRows(visibleRows));
    } catch (err) {
        console.error("GetStandaloneBienBanList error:", err);
        res.status(500).json({ message: "Không tải được danh sách phiếu xử lý không phù hợp" });
    }
});

router.get("/catalog-items", authenticateToken, async (req, res) => {
    try {
        const keyword = String(req.query.keyword || "").trim();
        const orderId = Number(req.query.orderId) || null;
        const page = Math.max(Number(req.query.page) || 0, 0);
        const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 20, 1), 50);
        const pool = await poolPromise;
        const result = await pool.request()
            .input("Keyword", sql.NVarChar(200), keyword || null)
            .input("OrderId", sql.Int, orderId)
            .input("Offset", sql.Int, page * pageSize)
            .input("PageSize", sql.Int, pageSize)
            .query(`
                WITH catalog AS (
                    SELECT localProduct.Id AS LocalProductId,
                        localProduct.MaSanPham AS Code,
                        localProduct.TenSanPham AS Name,
                        CASE WHEN material.ID_VatTu IS NOT NULL THEN N'VAT_TU' ELSE N'SAN_PHAM' END AS SourceType,
                        COALESCE(material.ID_VatTu, sourceProduct.ID_SanPham) AS SourceId
                    FROM dbo.DM_SAN_PHAM localProduct
                    OUTER APPLY (
                        SELECT TOP (1) materialRow.ID_VatTu
                        FROM TAG_QTKD.dbo.DM_VatTu materialRow
                        WHERE materialRow.Ma_VatTu = localProduct.MaSanPham
                          AND ISNULL(materialRow.TonTai, 1) = 1
                        ORDER BY materialRow.ID_VatTu
                    ) material
                    OUTER APPLY (
                        SELECT TOP (1) productRow.ID_SanPham
                        FROM TAG_QTKD.dbo.DM_SanPham productRow
                        WHERE productRow.ItemCode = localProduct.MaSanPham
                          AND ISNULL(productRow.TonTai, 1) = 1
                        ORDER BY productRow.ID_SanPham
                    ) sourceProduct
                    WHERE localProduct.TrangThai = 1
                      AND (material.ID_VatTu IS NOT NULL OR sourceProduct.ID_SanPham IS NOT NULL)
                      AND (@Keyword IS NULL OR localProduct.MaSanPham LIKE N'%' + @Keyword + N'%'
                           OR localProduct.TenSanPham LIKE N'%' + @Keyword + N'%')
                      AND (@OrderId IS NULL OR material.ID_VatTu IS NOT NULL OR EXISTS (
                          SELECT 1 FROM TAG_QTKD.dbo.DonHang_SanPham orderProduct
                          WHERE orderProduct.ID_DonHang = @OrderId
                            AND orderProduct.ID_SanPham = sourceProduct.ID_SanPham
                            AND ISNULL(orderProduct.TonTai, 1) = 1
                      ))
                )
                SELECT *, COUNT(*) OVER() AS Total
                FROM catalog
                ORDER BY Code
                OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
            `);
        const rows = result.recordset || [];
        res.json({
            data: rows.map(({ Total, ...item }) => item),
            total: Number(rows[0]?.Total || 0)
        });
    } catch (err) {
        console.error("SearchStandaloneCatalogItems error:", err);
        res.status(500).json({ message: "Không tìm được danh mục VT/BTP/TP" });
    }
});

router.get("/orders", authenticateToken, async (req, res) => {
    try {
        const keyword = String(req.query.keyword || "").trim();
        const localProductId = Number(req.query.localProductId) || null;
        const page = Math.max(Number(req.query.page) || 0, 0);
        const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 20, 1), 50);
        const pool = await poolPromise;
        const result = await pool.request()
            .input("Keyword", sql.NVarChar(200), keyword || null)
            .input("LocalProductId", sql.Int, localProductId)
            .input("Offset", sql.Int, page * pageSize)
            .input("PageSize", sql.Int, pageSize)
            .query(`
                WITH orders AS (
                    SELECT DISTINCT orderRow.ID_DonHang AS OrderId, orderRow.Ma_DonHang AS OrderCode
                    FROM TAG_QTKD.dbo.DonHang orderRow
                    WHERE ISNULL(orderRow.TonTai, 1) = 1
                      AND (@Keyword IS NULL OR orderRow.Ma_DonHang LIKE N'%' + @Keyword + N'%')
                      AND (@LocalProductId IS NULL OR EXISTS (
                          SELECT 1
                          FROM dbo.DM_SAN_PHAM localProduct
                          INNER JOIN TAG_QTKD.dbo.DM_SanPham sourceProduct
                              ON sourceProduct.ItemCode = localProduct.MaSanPham
                          INNER JOIN TAG_QTKD.dbo.DonHang_SanPham orderProduct
                              ON orderProduct.ID_SanPham = sourceProduct.ID_SanPham
                             AND orderProduct.ID_DonHang = orderRow.ID_DonHang
                          WHERE localProduct.Id = @LocalProductId
                            AND ISNULL(sourceProduct.TonTai, 1) = 1
                            AND ISNULL(orderProduct.TonTai, 1) = 1
                      ))
                )
                SELECT *, COUNT(*) OVER() AS Total
                FROM orders
                ORDER BY OrderCode DESC
                OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
            `);
        const rows = result.recordset || [];
        res.json({
            data: rows.map(({ Total, ...item }) => item),
            total: Number(rows[0]?.Total || 0)
        });
    } catch (err) {
        console.error("SearchStandaloneOrders error:", err);
        res.status(500).json({ message: "Không tìm được danh sách đơn hàng" });
    }
});

router.post("/", authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("NguoiLapId", sql.Int, req.user.userId)
            .execute("sp_PhieuXuLyKPH_Create");

        res.json({
            bienBanId: result.recordset?.[0]?.BienBanId || null
        });
    } catch (err) {
        console.error("CreateStandaloneBienBan error:", err);
        res.status(500).json({ message: "Không thể tạo phiếu xử lý không phù hợp" });
    }
});

router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const bienBanId = Number(req.params.id);
        const pool = await poolPromise;
        const readAccess = await getStandaloneReadAccess(pool, bienBanId, req.user);
        if (!readAccess.exists) {
            return res.status(404).json({ message: "Không tìm thấy phiếu xử lý không phù hợp" });
        }
        if (!readAccess.canRead) {
            return res.status(403).json({ message: "Bạn không có quyền xem phiếu xử lý không phù hợp này" });
        }
        const result = await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .execute("sp_PhieuXuLyKPH_GetDetail");

        const info = result.recordsets?.[0]?.[0] || null;
        let dynamicFields = [];
        if (info?.DynamicFieldsJSON) {
            try {
                dynamicFields = JSON.parse(info.DynamicFieldsJSON);
            } catch (error) {
                console.error("ParseStandaloneBienBanDynamicFields error:", error);
            }
        }

        if (info) {
            delete info.DynamicFieldsJSON;
        }

        const v01Result = await pool.request()
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
                    bb.CreatorConfirmedAt, bb.CreatorConfirmedBy,
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
                    yk.Id, yk.BoPhanId,
                    COALESCE(bp.MaBoPhan, yk.BoPhan) AS MaBoPhan,
                    COALESCE(bp.TenBoPhan, yk.BoPhan) AS TenBoPhan,
                    yk.TrangThai, yk.ThuTu,
                    CAST(ISNULL(yk.IsActive, 1) AS bit) AS IsActive,
                    tl.LuaChon, tl.NoiDung, tl.NguoiTraLoiId,
                    u.FullName AS NguoiTraLoi, tl.ThoiGian,
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
                LEFT JOIN dbo.USERS u ON u.Id = tl.NguoiTraLoiId
                LEFT JOIN dbo.USERS opinionSaver ON opinionSaver.Id=yk.OpinionSavedBy
                LEFT JOIN dbo.USERS confirmer ON confirmer.Id=yk.ConfirmedBy
                LEFT JOIN dbo.USERS suggestedUser ON suggestedUser.Id=yk.SuggestedUserId
                LEFT JOIN dbo.DM_SAN_PHAM_NGUOI_PHU_TRACH responsibleMapping
                    ON responsibleMapping.Id=yk.ProductResponsibleMappingId
                WHERE yk.BienBanId = @BienBanId
                  AND ISNULL(yk.IsActive, 1) = 1
                ORDER BY yk.ThuTu, yk.Id;

                SELECT TOP 1 td.*, u.FullName AS NguoiTheoDoi
                FROM dbo.BIEN_BAN_THEO_DOI_DANH_GIA td
                LEFT JOIN dbo.USERS u ON u.Id = td.NguoiTheoDoiId
                WHERE td.BienBanId = @BienBanId;
            `);
        const printMeta = v01Result.recordsets?.[0]?.[0] || { MauPhieuVersion: "V00" };
        const headerAccess = await getHeaderAccess(pool, bienBanId, req.user);
        const managedDepartmentIds = await getManagedDepartmentIds(pool, req.user.userId, req.user.boPhanId);
        const proposalResult = await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
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
        const sectionRows = await loadKphSectionRows(pool, bienBanId);

        if (info) Object.assign(info, printMeta);
        if (info) {
            info.YeuCauChiPhi = Boolean(printMeta.YeuCauChiPhi);
            info.YeuCauHanhDong = Boolean(printMeta.YeuCauHanhDong);
            info.BoPhanTaoId = printMeta.BoPhanTaoId;
            info.OpinionDepartmentsConfirmed = Boolean(printMeta.OpinionDepartmentsConfirmed);
            info.OpinionDepartmentsConfirmedAt = printMeta.OpinionDepartmentsConfirmedAt;
            info.CreatorConfirmedAt = printMeta.CreatorConfirmedAt;
            info.CanManageKphFlow = headerAccess.canEdit;
            info.CanConfigureRequirements = headerAccess.canEdit;
            info.IsAdmin = isAdmin(req.user);
            info.CanEditReturned = headerAccess.canEdit && info.TrangThai === "TRA_LAI_CHINH_SUA";
            info.CanResubmit = info.CanEditReturned;
            const opinionRows = v01Result.recordsets?.[1] || [];
            const isAssignedDepartment = opinionRows.some((opinion) =>
                managedDepartmentIds.includes(Number(opinion.BoPhanId))
            );
            const canManageAsCreator = Number(headerAccess.record?.NguoiLapId) === Number(req.user.userId) ||
                await canLeadDepartment(pool, req.user, headerAccess.record?.CreatorBoPhanId) ||
                isAdmin(req.user);
            info.CanContributeKphSections = !printMeta.CreatorConfirmedAt &&
                !["CHO_THEO_DOI", "HOAN_TAT"].includes(printMeta.TrangThai) &&
                (canManageAsCreator || (
                    printMeta.TrangThai !== "TRA_LAI_CHINH_SUA" && isAssignedDepartment
                ));
            info.CanCreatorConfirm = Boolean(printMeta.OpinionDepartmentsConfirmedAt) &&
                !printMeta.CreatorConfirmedAt &&
                !["TRA_LAI_CHINH_SUA", "CHO_THEO_DOI", "HOAN_TAT"].includes(printMeta.TrangThai) &&
                opinionRows.length > 0 && opinionRows.every((opinion) => Boolean(opinion.HasConfirmed)) &&
                (isAdmin(req.user) || await canLeadDepartment(pool, req.user, info.BoPhanTaoId));
        }

        const defectResult = await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .query(`
                SELECT d.*, CAST(NULL AS nvarchar(max)) AS ImageUrls
                FROM dbo.BIEN_BAN_DEFECT d
                WHERE d.BienBanId = @BienBanId
                ORDER BY d.SortOrder, d.Id
            `);
        const confirmationResult = await pool.request().input("BienBanId", sql.Int, bienBanId).query(`
            SELECT xn.*, COALESCE(xn.BoPhanId,u.BoPhanId) AS BoPhanId, u.FullName,
                bp.MaBoPhan, bp.TenBoPhan
            FROM dbo.BIEN_BAN_XAC_NHAN xn
            LEFT JOIN dbo.USERS u ON u.Id=xn.NguoiXacNhanId
            LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id=COALESCE(xn.BoPhanId,u.BoPhanId)
            WHERE xn.BienBanId=@BienBanId
        `);
        const confirmationRows = confirmationResult.recordset || [];
        const specialistOpinionRows = v01Result.recordsets?.[1] || [];
        const followUpEvaluation = v01Result.recordsets?.[2]?.[0] || null;
        const signatureMap = await loadSignatureDataUrlMap(pool, [
            ...confirmationRows.map((item) => item.NguoiXacNhanId),
            ...specialistOpinionRows.map((item) => item.ConfirmedBy),
            printMeta.CreatorConfirmedBy,
            printMeta.NguoiLapId ?? info?.NguoiLapId,
            followUpEvaluation?.NguoiTheoDoiId
        ]);
        if (info) {
            info.NguoiLapSignatureDataUrl = signatureMap.get(
                Number(printMeta.NguoiLapId ?? info.NguoiLapId)
            ) || null;
            info.CreatorSignatureDataUrl = signatureMap.get(
                Number(printMeta.CreatorConfirmedBy)
            ) || null;
        }

        res.json({
            info,
            defects: await enrichDefectCodes(pool, defectResult.recordset || []),
            assigns: result.recordsets?.[2] || [],
            xuLy: proposalResult.recordset || [],
            chiPhi: sectionRows.chiPhi,
            xacNhan: confirmationRows.map((item) => ({
                ...item,
                SignatureDataUrl: signatureMap.get(Number(item.NguoiXacNhanId)) || null
            })),
            hanhDong: sectionRows.hanhDong,
            dynamicFields,
            templateVersion: printMeta.MauPhieuVersion,
            specialistOpinions: specialistOpinionRows.map((opinion) => {
                const activeReview = Boolean(printMeta.OpinionDepartmentsConfirmed) &&
                    !printMeta.CreatorConfirmedAt &&
                    !["TRA_LAI_CHINH_SUA", "CHO_THEO_DOI", "HOAN_TAT"].includes(printMeta.TrangThai);
                const ownsDepartment = managedDepartmentIds.includes(Number(opinion.BoPhanId));
                const canSave = activeReview && !opinion.HasConfirmed && (isAdmin(req.user) || ownsDepartment);
                const canLeadAct = canSave && Boolean(opinion.HasOpinion) &&
                    (isAdmin(req.user) || (ownsDepartment && hasStrictLeadRole(req.user)));
                return {
                    ...opinion,
                    SignatureDataUrl: signatureMap.get(Number(opinion.ConfirmedBy)) || null,
                    HasResponded: Boolean(opinion.HasConfirmed),
                    CanSaveOpinion: canSave,
                    CanConfirmOpinion: canLeadAct,
                    CanReturn: canLeadAct
                };
            }),
            followUpEvaluation: followUpEvaluation ? {
                ...followUpEvaluation,
                SignatureDataUrl: signatureMap.get(Number(followUpEvaluation.NguoiTheoDoiId)) || null
            } : null,
            printMeta,
            canEditKphCustomFields: headerAccess.canEdit
        });
    } catch (err) {
        console.error("GetStandaloneBienBanDetail error:", err);
        res.status(500).json({ message: "Không tải được chi tiết phiếu xử lý không phù hợp" });
    }
});

router.post("/:id/header", authenticateToken, async (req, res) => {
    try {
        const bienBanId = Number(req.params.id);
        const { moTaChung = "", fields = {} } = req.body || {};

        const pool = await poolPromise;
        const access = await getHeaderAccess(pool, bienBanId, req.user);
        if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
        if (access.record.MauPhieuVersion !== "V01") return res.status(409).json({ message: "Biên bản không sử dụng mẫu V01" });
        if (!access.canEdit) return res.status(403).json({ message: "Bạn không có quyền sửa thông tin mẫu KPH" });
        const normalizedFields = Object.fromEntries(
            Object.entries(fields || {}).filter(([key]) => KPH_V01_CUSTOM_FIELDS.has(key))
        );
        const rawLocalProductId = normalizedFields.LocalProductId;
        const hasCatalogItem = rawLocalProductId !== null
            && rawLocalProductId !== undefined
            && String(rawLocalProductId).trim() !== "";
        const localProductId = hasCatalogItem ? Number(rawLocalProductId) : null;

        if (hasCatalogItem && (!Number.isInteger(localProductId) || localProductId <= 0)) {
            return res.status(400).json({ message: "VT/BTP/TP đã chọn không hợp lệ" });
        }

        if (hasCatalogItem) {
            const catalogResult = await pool.request()
                .input("LocalProductId", sql.Int, localProductId)
                .query(`
                SELECT TOP (1) localProduct.Id AS LocalProductId,
                    localProduct.MaSanPham AS Code,
                    localProduct.TenSanPham AS Name,
                    material.ID_VatTu,
                    sourceProduct.ID_SanPham
                FROM dbo.DM_SAN_PHAM localProduct
                OUTER APPLY (
                    SELECT TOP (1) materialRow.ID_VatTu
                    FROM TAG_QTKD.dbo.DM_VatTu materialRow
                    WHERE materialRow.Ma_VatTu = localProduct.MaSanPham
                      AND ISNULL(materialRow.TonTai, 1) = 1
                    ORDER BY materialRow.ID_VatTu
                ) material
                OUTER APPLY (
                    SELECT TOP (1) productRow.ID_SanPham
                    FROM TAG_QTKD.dbo.DM_SanPham productRow
                    WHERE productRow.ItemCode = localProduct.MaSanPham
                      AND ISNULL(productRow.TonTai, 1) = 1
                    ORDER BY productRow.ID_SanPham
                ) sourceProduct
                WHERE localProduct.Id = @LocalProductId
                  AND localProduct.TrangThai = 1
                  AND (material.ID_VatTu IS NOT NULL OR sourceProduct.ID_SanPham IS NOT NULL);
                `);
            const catalogItem = catalogResult.recordset?.[0];
            if (!catalogItem) {
                return res.status(400).json({ message: "VT/BTP/TP đã chọn không còn tồn tại trong danh mục" });
            }

            const isMaterial = Boolean(catalogItem.ID_VatTu);
            const orderId = Number(normalizedFields.OrderId) || null;
            let orderCode = "";
            if (orderId) {
                const orderRequest = pool.request()
                    .input("OrderId", sql.Int, orderId);
                if (!isMaterial) {
                    orderRequest.input("SourceProductId", sql.Int, catalogItem.ID_SanPham);
                }
                const orderResult = await orderRequest.query(isMaterial ? `
                        SELECT TOP (1) Ma_DonHang
                        FROM TAG_QTKD.dbo.DonHang
                        WHERE ID_DonHang = @OrderId
                          AND ISNULL(TonTai, 1) = 1;
                    ` : `
                        SELECT TOP (1) orderRow.Ma_DonHang
                        FROM TAG_QTKD.dbo.DonHang orderRow
                        INNER JOIN TAG_QTKD.dbo.DonHang_SanPham orderProduct
                            ON orderProduct.ID_DonHang = orderRow.ID_DonHang
                        WHERE orderRow.ID_DonHang = @OrderId
                          AND orderProduct.ID_SanPham = @SourceProductId
                          AND ISNULL(orderRow.TonTai, 1) = 1
                          AND ISNULL(orderProduct.TonTai, 1) = 1;
                    `);
                orderCode = orderResult.recordset?.[0]?.Ma_DonHang || "";
                if (!orderCode) {
                    return res.status(400).json({
                        message: isMaterial
                            ? "Đơn hàng đã chọn không còn tồn tại"
                            : "BTP/TP không thuộc đơn hàng đã chọn"
                    });
                }
            }

            Object.assign(normalizedFields, {
                LocalProductId: String(catalogItem.LocalProductId),
                ItemSourceType: isMaterial ? "VAT_TU" : "SAN_PHAM",
                ItemSourceId: String(isMaterial ? catalogItem.ID_VatTu : catalogItem.ID_SanPham),
                MaSanPham: catalogItem.Code || "",
                TenSanPham: catalogItem.Name || "",
                OrderId: orderId ? String(orderId) : "",
                DonHang: orderCode
            });
        } else {
            const orderId = Number(normalizedFields.OrderId) || null;
            let orderCode = "";
            if (orderId) {
                const orderResult = await pool.request()
                    .input("OrderId", sql.Int, orderId)
                    .query(`
                        SELECT TOP (1) Ma_DonHang
                        FROM TAG_QTKD.dbo.DonHang
                        WHERE ID_DonHang = @OrderId
                          AND ISNULL(TonTai, 1) = 1;
                    `);
                orderCode = orderResult.recordset?.[0]?.Ma_DonHang || "";
                if (!orderCode) {
                    return res.status(400).json({ message: "Đơn hàng đã chọn không còn tồn tại" });
                }
            }

            Object.assign(normalizedFields, {
                LocalProductId: "",
                ItemSourceType: "",
                ItemSourceId: "",
                MaSanPham: "",
                TenSanPham: "",
                OrderId: orderId ? String(orderId) : "",
                DonHang: orderCode
            });
        }
        await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .input("MoTaChung", sql.NVarChar(sql.MAX), moTaChung)
            .input("FieldsJson", sql.NVarChar(sql.MAX), JSON.stringify(normalizedFields))
            .execute("sp_PhieuXuLyKPH_SaveHeader");

        res.json({ success: true });
    } catch (err) {
        console.error("SaveStandaloneBienBanHeader error:", err);
        res.status(500).json({ message: err.message || "Không thể lưu thông tin chung" });
    }
});

router.post("/:id/defects", authenticateToken, async (req, res) => {
    try {
        const bienBanId = Number(req.params.id);
        const { defects = [] } = req.body || {};
        const normalizedDefects = (Array.isArray(defects) ? defects : []).map((item, index) => ({
            defectId: Number(item?.defectId ?? item?.DefectId) || null,
            maLoi: item?.maLoi ?? item?.MaLoi ?? "",
            tenLoi: item?.tenLoi ?? item?.TenLoi ?? "",
            defectType: item?.defectType ?? item?.DefectType ?? "",
            tenLoiTuNhap: item?.tenLoiTuNhap ?? item?.TenLoiTuNhap ?? "",
            moTa: item?.moTa ?? item?.MoTa ?? "",
            soLuong: item?.soLuong ?? item?.SoLuong ?? 0,
            ghiChu: item?.ghiChu ?? item?.GhiChu ?? "",
            tenDoiTuong: item?.tenDoiTuong ?? item?.TenDoiTuong ?? "",
            soLuongKiem: item?.soLuongKiem ?? item?.SoLuongKiem ?? null,
            sortOrder: item?.sortOrder ?? item?.SortOrder ?? index + 1
        }));

        if (normalizedDefects.length === 0 || normalizedDefects.some((item) => !Number.isInteger(item.defectId) || item.defectId <= 0)) {
            return res.status(400).json({
                message: "Mỗi dòng lỗi phải được chọn từ ngân hàng lỗi"
            });
        }

        const invalidDefect = normalizedDefects.find((item) => {
            const soLuong = Number(item.soLuong);
            const soLuongKiem = item.soLuongKiem === null || item.soLuongKiem === ""
                ? null
                : Number(item.soLuongKiem);
            return !Number.isInteger(soLuong) || soLuong <= 0 ||
                !Number.isInteger(soLuongKiem) || soLuongKiem <= 0 ||
                soLuong > soLuongKiem;
        });
        if (invalidDefect) {
            return res.status(400).json({
                message: "Số lượng kiểm phải lớn hơn 0 và không được nhỏ hơn số lượng lỗi"
            });
        }

        const pool = await poolPromise;
        const access = await getHeaderAccess(pool, bienBanId, req.user);
        if (!access.exists) return res.status(404).json({ message: "Không tìm thấy biên bản" });
        if (!access.canEdit) return res.status(403).json({ message: "Bạn không có quyền sửa lỗi ở trạng thái hiện tại" });

        const defectIds = [...new Set(normalizedDefects.map((item) => item.defectId))];
        const catalogResult = await pool.request().query(`
            SELECT Id, MaLoi, TenLoi, DefectType, MoTa
            FROM dbo.DM_DEFECT
            WHERE Id IN (${defectIds.join(",")})
        `);
        const catalogById = new Map((catalogResult.recordset || []).map((item) => [Number(item.Id), item]));
        if (defectIds.some((defectId) => !catalogById.has(defectId))) {
            return res.status(400).json({ message: "Có lỗi không tồn tại trong ngân hàng lỗi" });
        }

        const catalogDefects = normalizedDefects.map((item) => {
            const catalog = catalogById.get(item.defectId);
            return {
                ...item,
                maLoi: catalog.MaLoi || "",
                tenLoi: catalog.TenLoi || "",
                defectType: catalog.DefectType || "",
                tenLoiTuNhap: "",
                moTa: catalog.MoTa || ""
            };
        });
        await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .input("DefectsJson", sql.NVarChar(sql.MAX), JSON.stringify(catalogDefects))
            .execute("sp_PhieuXuLyKPH_SaveDefects");

        res.json({ success: true });
    } catch (err) {
        console.error("SaveStandaloneBienBanDefects error:", err);
        res.status(500).json({ message: err.message || "Không thể lưu danh sách lỗi" });
    }
});

router.delete("/:id", authenticateToken, requireExactPermission("XOA_HO_SO_KCS"), async (req, res) => {
    try {
        const bienBanId = Number(req.params.id);
        if (!Number.isInteger(bienBanId) || bienBanId <= 0) {
            return res.status(400).json({ message: "Id phiếu không hợp lệ" });
        }
        const pool = await poolPromise;
        const recordResult = await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .query(`
                SELECT TOP(1) Id FROM dbo.BIEN_BAN_KIEM
                WHERE Id=@BienBanId AND LoaiBienBan=N'STANDALONE';
            `);
        if (!recordResult.recordset?.length) {
            return res.status(404).json({ message: "Không tìm thấy phiếu xử lý không phù hợp" });
        }
        const files = await getBienBanFiles(pool, [bienBanId]);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            await deleteBienBanData(transaction, [bienBanId], req.user.userId);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        await removeBienBanFiles(files);

        res.json({ success: true, message: "Đã xóa phiếu xử lý không phù hợp" });
    } catch (err) {
        console.error("DeleteStandaloneBienBan error:", err);
        res.status(500).json({ message: err.message || "Không thể xóa phiếu xử lý không phù hợp" });
    }
});

module.exports = router;
