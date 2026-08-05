const express = require("express");
const router = express.Router();
const sql = require("mssql");
const fs = require("fs");
const path = require("path");

const { poolPromise } = require("../db");
const authenticateToken = require("../middlewares/auth.middleware");
const bienBanAttachmentDir = path.join(__dirname, "..", "private-uploads", "bien-ban");

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
                CAST(CASE WHEN @CanViewAll = 1
                    OR bb.NguoiLapId = @UserId
                    OR (@IsDepartmentLead = 1
                        AND COALESCE(bb.BoPhanTaoId, creator.BoPhanId) = @BoPhanId)
                    OR EXISTS (
                        SELECT 1 FROM dbo.BIEN_BAN_ASSIGN assignment
                        WHERE assignment.BienBanId = bb.Id
                          AND (assignment.BoPhanId = @BoPhanId OR assignment.NguoiXuLyId = @UserId)
                    )
                    OR EXISTS (
                        SELECT 1 FROM dbo.XIN_Y_KIEN opinion
                        WHERE opinion.BienBanId = bb.Id
                          AND opinion.BoPhanId = @BoPhanId
                          AND ISNULL(opinion.IsActive, 1) = 1
                    )
                    OR EXISTS (
                        SELECT 1 FROM dbo.BienBan_CustomFields customField
                        WHERE customField.BienBanId = bb.Id
                          AND customField.FieldName = N'BpsxSignatureBoPhanId'
                          AND TRY_CAST(customField.FieldValue AS int) = @BoPhanId
                    )
                    THEN 1 ELSE 0 END AS bit) AS CanRead
            FROM dbo.BIEN_BAN_KIEM bb
            LEFT JOIN dbo.USERS creator ON creator.Id = bb.NguoiLapId
            WHERE bb.Id = @BienBanId AND bb.LoaiBienBan = N'STANDALONE'
        `);
    const record = result.recordset?.[0];
    return { exists: Boolean(record?.ExistsFlag), canRead: Boolean(record?.CanRead) };
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
        (Number(record.CreatorBoPhanId) === Number(user?.boPhanId) && hasStrictLeadRole(user)) ||
        isAdmin(user)
    );
    return { exists: true, canEdit, record };
};
const KPH_V01_CUSTOM_FIELDS = new Set([
    "TenBoPhan", "MaBoPhan", "TenSanPham", "MaSanPham", "MaTruyNguyen",
    "DonHang", "Lot", "SoLuongKPH", "DauTuan", "PhatHienTu", "MucDo"
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

        const request = pool.request();
        if (!canViewAll) {
            request.input("UserId", sql.Int, req.user.userId);
            request.input("BoPhanId", sql.Int, req.user.boPhanId);
            request.input("IsDepartmentLead", sql.Bit, isDepartmentLead(req.user));
        }

        const result = await request.execute("sp_PhieuXuLyKPH_GetList");
        const rows = result.recordset || [];
        const ids = rows.map((item) => Number(item.BienBanId)).filter((id) => Number.isInteger(id) && id > 0);
        if (!ids.length) return res.json(rows);
        const creatorDepartmentResult = await pool.request().query(`
            SELECT
                bb.Id AS BienBanId,
                COALESCE(bb.BoPhanTaoId, creator.BoPhanId) AS CreatorBoPhanId,
                department.MaBoPhan AS MaBoPhanTao,
                department.TenBoPhan AS TenBoPhanTao
            FROM dbo.BIEN_BAN_KIEM bb
            LEFT JOIN dbo.USERS creator ON creator.Id = bb.NguoiLapId
            LEFT JOIN dbo.DM_BO_PHAN department
                ON department.Id = COALESCE(bb.BoPhanTaoId, creator.BoPhanId)
            WHERE bb.Id IN (${ids.join(",")})
        `);
        const creatorDepartmentMap = new Map(
            (creatorDepartmentResult.recordset || []).map((item) => [Number(item.BienBanId), item])
        );
        const progressResult = await pool.request().query(`
            SELECT yk.BienBanId,yk.BoPhanId,bp.MaBoPhan,bp.TenBoPhan,
                CASE WHEN yk.ConfirmedAt IS NOT NULL
                    AND yk.ConfirmedReviewRound=ISNULL(bb.ReviewRound,1) THEN 1 ELSE 0 END DaXacNhan
            FROM dbo.XIN_Y_KIEN yk
            JOIN dbo.BIEN_BAN_KIEM bb ON bb.Id=yk.BienBanId
            LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id=yk.BoPhanId
            WHERE yk.BienBanId IN (${ids.join(",")}) AND ISNULL(yk.IsActive,1)=1
        `);
        const progressMap = new Map();
        for (const item of progressResult.recordset || []) {
            const key = Number(item.BienBanId);
            const progress = progressMap.get(key) || { total: 0, done: 0, pending: [] };
            progress.total += 1;
            if (Number(item.DaXacNhan) === 1) progress.done += 1;
            else progress.pending.push(item.TenBoPhan || item.MaBoPhan);
            progressMap.set(key, progress);
        }
        res.json(rows.map((item) => {
            const creatorDepartment = creatorDepartmentMap.get(Number(item.BienBanId)) || {};
            const progress = progressMap.get(Number(item.BienBanId));
            if (!progress) return { ...item, ...creatorDepartment };
            return {
                ...item,
                ...creatorDepartment,
                SoBoPhan: progress.total,
                DaCoYKien: progress.done,
                BoPhanChuaXacNhanText: progress.pending.filter(Boolean).join(", ") || null
            };
        }));
    } catch (err) {
        console.error("GetStandaloneBienBanList error:", err);
        res.status(500).json({ message: "Không tải được danh sách phiếu xử lý không phù hợp" });
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
        const proposalResult = await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .query(`
                SELECT x.Id, x.BoPhan, x.NoiDung, x.TrachNhiem, x.TheoDoi,
                    dx.Ten AS DeNghiXuLy, x.ThoiHan, x.NguoiXuLyId,
                    x.BoPhanId, creator.FullName AS NguoiNhap, x.CreatedAt,
                    bp.MaBoPhan, bp.TenBoPhan
                FROM dbo.BIEN_BAN_XU_LY x
                LEFT JOIN dbo.DM_DE_NGHI_XU_LY dx ON dx.Id = x.DeNghiXuLyId
                LEFT JOIN dbo.USERS creator ON creator.Id = x.CreatedBy
                LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = x.BoPhanId
                WHERE x.BienBanId = @BienBanId
                ORDER BY x.CreatedAt, x.Id
            `);

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
                Number(opinion.BoPhanId) === Number(req.user.boPhanId)
            );
            const canManageAsCreator = Number(headerAccess.record?.NguoiLapId) === Number(req.user.userId) ||
                (Number(headerAccess.record?.CreatorBoPhanId) === Number(req.user.boPhanId) && hasStrictLeadRole(req.user)) ||
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
                (isAdmin(req.user) || (
                    Number(info.BoPhanTaoId) === Number(req.user.boPhanId) && hasStrictLeadRole(req.user)
                ));
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

        res.json({
            info,
            defects: await enrichDefectCodes(pool, defectResult.recordset || []),
            assigns: result.recordsets?.[2] || [],
            xuLy: proposalResult.recordset || [],
            chiPhi: result.recordsets?.[4] || [],
            xacNhan: confirmationResult.recordset || [],
            hanhDong: result.recordsets?.[6] || [],
            dynamicFields,
            templateVersion: printMeta.MauPhieuVersion,
            specialistOpinions: (v01Result.recordsets?.[1] || []).map((opinion) => {
                const activeReview = Boolean(printMeta.OpinionDepartmentsConfirmed) &&
                    !printMeta.CreatorConfirmedAt &&
                    !["TRA_LAI_CHINH_SUA", "CHO_THEO_DOI", "HOAN_TAT"].includes(printMeta.TrangThai);
                const ownsDepartment = Number(opinion.BoPhanId) === Number(req.user.boPhanId);
                const canSave = activeReview && !opinion.HasConfirmed && (isAdmin(req.user) || ownsDepartment);
                const canLeadAct = canSave && Boolean(opinion.HasOpinion) &&
                    (isAdmin(req.user) || (ownsDepartment && hasStrictLeadRole(req.user)));
                return {
                    ...opinion,
                    HasResponded: Boolean(opinion.HasConfirmed),
                    CanSaveOpinion: canSave,
                    CanConfirmOpinion: canLeadAct,
                    CanReturn: canLeadAct
                };
            }),
            followUpEvaluation: v01Result.recordsets?.[2]?.[0] || null,
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
            defectId: item?.defectId ?? item?.DefectId ?? null,
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
        await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .input("DefectsJson", sql.NVarChar(sql.MAX), JSON.stringify(normalizedDefects))
            .execute("sp_PhieuXuLyKPH_SaveDefects");

        res.json({ success: true });
    } catch (err) {
        console.error("SaveStandaloneBienBanDefects error:", err);
        res.status(500).json({ message: err.message || "Không thể lưu danh sách lỗi" });
    }
});

router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const bienBanId = Number(req.params.id);
        const pool = await poolPromise;
        const attachmentResult = await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .query(`
                IF OBJECT_ID(N'dbo.BIEN_BAN_DINH_KEM', N'U') IS NOT NULL
                    SELECT StoredName FROM dbo.BIEN_BAN_DINH_KEM WHERE BienBanId = @BienBanId;
                ELSE
                    SELECT CAST(NULL AS NVARCHAR(255)) AS StoredName WHERE 1 = 0;
            `);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            await new sql.Request(transaction)
                .input("BienBanId", sql.Int, bienBanId)
                .query(`
                    IF OBJECT_ID(N'dbo.BIEN_BAN_KPH_REVIEW_HISTORY',N'U') IS NOT NULL
                        DELETE FROM dbo.BIEN_BAN_KPH_REVIEW_HISTORY WHERE BienBanId=@BienBanId;
                    DELETE tl
                    FROM dbo.TRA_LOI_Y_KIEN tl
                    JOIN dbo.XIN_Y_KIEN yk ON yk.Id = tl.XinYKienId
                    WHERE yk.BienBanId = @BienBanId;
                    DELETE FROM dbo.XIN_Y_KIEN WHERE BienBanId = @BienBanId;
                    DELETE FROM dbo.BIEN_BAN_THEO_DOI_DANH_GIA WHERE BienBanId = @BienBanId;
                `);
            await new sql.Request(transaction)
                .input("BienBanId", sql.Int, bienBanId)
                .execute("dbo.sp_PhieuXuLyKPH_Delete");
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }

        await Promise.all((attachmentResult.recordset || []).map(async ({ StoredName }) => {
            if (!StoredName || path.basename(StoredName) !== StoredName) return;
            try {
                await fs.promises.unlink(path.join(bienBanAttachmentDir, StoredName));
            } catch (error) {
                if (error.code !== "ENOENT") console.error("Delete standalone attachment file error:", error);
            }
        }));

        res.json({ success: true, message: "Đã xóa phiếu xử lý không phù hợp" });
    } catch (err) {
        console.error("DeleteStandaloneBienBan error:", err);
        res.status(500).json({ message: err.message || "Không thể xóa phiếu xử lý không phù hợp" });
    }
});

module.exports = router;
