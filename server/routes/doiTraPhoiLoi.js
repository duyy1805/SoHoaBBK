const express = require('express');
const sql = require('mssql');
const { poolPromise } = require('../db');
const authenticateToken = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const requireExactPermission = require('../middlewares/exactPermission.middleware');
const { canLeadDepartment } = require('../utils/managedDepartments');
const { loadSignatureDataUrlMap } = require('../utils/signatureImage');

const router = express.Router();
const VIEW_PERMISSIONS = ['THUC_HIEN_KIEM', 'XEM_PHIEU_KIEM'];
const MAX_PLAN_SEARCH_ROWS = 200;

const userIdOf = (req) => Number(req.user?.userId || req.user?.id || 0);
const isAdmin = (user = {}) =>
    (user.permissions || []).includes('QUAN_TRI_DM')
    || (user.roles || []).some((role) => String(role || '').toUpperCase().includes('ADMIN'));
const hasPermission = (user, code) => (user?.permissions || []).includes(code);
const isDateOnly = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
const trimOrNull = (value) => String(value ?? '').trim() || null;
const positiveId = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};
const nonNegativeInteger = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};
const clampTopN = (value) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return MAX_PLAN_SEARCH_ROWS;
    return Math.min(parsed, MAX_PLAN_SEARCH_ROWS);
};
const encodeBinary = (value) => {
    if (Buffer.isBuffer(value)) return value.toString('base64');
    if (Array.isArray(value)) return value.map(encodeBinary);
    if (value && typeof value === 'object' && !(value instanceof Date)) {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeBinary(item)]));
    }
    return value;
};
const rowVersionBuffer = (value) => {
    if (!value || typeof value !== 'string') return null;
    const buffer = Buffer.from(value, 'base64');
    return buffer.length === 8 ? buffer : null;
};
const normalizeDinhMucItems = (value) => (Array.isArray(value) ? value : []).map((item) => {
    const raw = item?.dinhMuc ?? item?.DinhMuc;
    const dinhMuc = raw === '' || raw == null ? null : Number(raw);
    return {
        sourceVatTuId: positiveId(item?.sourceVatTuId ?? item?.SourceVatTuId),
        dinhMuc,
        ghiChu: trimOrNull(item?.ghiChu ?? item?.GhiChu)
    };
});
const normalizeResponsibleDepartment = (body = {}) => {
    const value = body?.boPhanGayLoi;
    if (value && typeof value === 'object') {
        return {
            source: String(value.source || '').trim().toUpperCase(),
            sourceId: positiveId(value.sourceId)
        };
    }
    const legacyId = positiveId(body?.boPhanGayLoiId);
    return legacyId ? { source: 'NOI_BO', sourceId: legacyId } : null;
};

const isB7Actor = async (executor, user) => {
    if (isAdmin(user)) return true;
    const userId = Number(user?.userId || user?.id || 0);
    if (!userId) return false;
    const result = await new sql.Request(executor).input('ActorUserId', sql.Int, userId).query(`
        SELECT TOP (1) 1 AS Allowed
        FROM dbo.USERS actor
        JOIN dbo.DM_BO_PHAN department ON department.Id=actor.BoPhanId
        WHERE actor.Id=@ActorUserId AND ISNULL(actor.TrangThai,0)=1
          AND ISNULL(department.TrangThai,1)=1
          AND UPPER(LTRIM(RTRIM(department.MaBoPhan)))=N'B7';
    `);
    return Boolean(result.recordset?.[0]);
};

const canRunWorkflowAction = async (executor, user, phieu, actionCode) => {
    if (isAdmin(user)) return true;
    const userId = Number(user?.userId || user?.id || 0);
    if (actionCode === 'KCS_SUBMIT' || actionCode === 'KCS_RESUBMIT') {
        return userId === Number(phieu.NguoiLapId) && hasPermission(user, 'THUC_HIEN_KIEM');
    }
    if (actionCode === 'TBP_CONFIRM' || actionCode === 'TBP_RETURN') {
        return hasPermission(user, 'XAC_NHAN_LOI')
            && canLeadDepartment(executor, user, phieu.BoPhanKcsId);
    }
    if (actionCode === 'B7_CONFIRM') return isB7Actor(executor, user);
    return false;
};
const authorizeDoiTraAccess = async (req, res, next) => {
    if (isAdmin(req.user) || hasPermission(req.user, 'XAC_NHAN_LOI')
        || VIEW_PERMISSIONS.some((code) => hasPermission(req.user, code))) return next();
    try {
        const pool = await poolPromise;
        if (await isB7Actor(pool, req.user)) return next();
        const routeId = positiveId(String(req.path || '').split('/').filter(Boolean)[0]);
        if (routeId) {
            const managedIds = await require('../utils/managedDepartments').getManagedDepartmentIds(
                pool, userIdOf(req), req.user?.boPhanId
            );
            const participant = await pool.request()
                .input('PhieuId', sql.Int, routeId)
                .input('UserId', sql.Int, userIdOf(req))
                .input('ManagedIds', sql.NVarChar(sql.MAX), managedIds.join(','))
                .query(`SELECT TOP 1 1 Allowed FROM dbo.DOI_TRA_PHOI_LOI p
                    WHERE p.Id=@PhieuId AND (p.NguoiLapId=@UserId OR EXISTS(
                        SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN y
                        WHERE y.PhieuId=p.Id AND y.IsActive=1 AND y.BoPhanId IN(
                            SELECT TRY_CONVERT(INT,value) FROM STRING_SPLIT(@ManagedIds,','))))`);
            if (participant.recordset?.length) return next();
        }
        return res.status(403).json({ message: 'Bạn không có quyền truy cập phiếu đổi trả phôi lỗi' });
    } catch (error) {
        console.error('DoiTraPhoiLoi access check error:', error);
        return res.status(500).json({ message: 'Không kiểm tra được quyền truy cập phiếu' });
    }
};
const sqlDate = (value) => {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    }
    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    return match?.[1] || null;
};
const errorMessage = (error, fallback) =>
    error?.originalError?.info?.message || error?.message || fallback;
const normalizedPhoiItems = (value) => (Array.isArray(value) ? value : []).map((item, index) => {
    const defects = (Array.isArray(item?.defects) ? item.defects : []).map((defect, defectIndex) => ({
        nhomLoiId: positiveId(defect?.nhomLoiId ?? defect?.NhomLoiId),
        defectId: positiveId(defect?.defectId ?? defect?.DefectId),
        soLuongLoi: positiveId(defect?.soLuongLoi ?? defect?.SoLuongLoi),
        ghiChu: trimOrNull(defect?.ghiChu ?? defect?.GhiChu),
        sortOrder: defectIndex + 1
    }));
    return {
        sourceLoiPhoiId: positiveId(item?.sourceLoiPhoiId ?? item?.SourceLoiPhoiId),
        soLuongKiem: positiveId(item?.soLuongKiem ?? item?.SoLuongKiem),
        soLuongPhoiLoi: nonNegativeInteger(item?.soLuongPhoiLoi ?? item?.SoLuongPhoiLoi),
        ghiChu: trimOrNull(item?.ghiChu ?? item?.GhiChu),
        lotSanXuat: trimOrNull(item?.lotSanXuat ?? item?.LotSanXuat),
        lenhXuatVatTu: trimOrNull(item?.lenhXuatVatTu ?? item?.LenhXuatVatTu),
        dauTuan: trimOrNull(item?.dauTuan ?? item?.DauTuan),
        donViTaoPhoiId: positiveId(item?.donViTaoPhoiId ?? item?.DonViTaoPhoiId),
        ngayTaoPhoi: isDateOnly(item?.ngayTaoPhoi ?? item?.NgayTaoPhoi)
            ? String(item?.ngayTaoPhoi ?? item?.NgayTaoPhoi) : null,
        toSanXuat: trimOrNull(item?.toSanXuat ?? item?.ToSanXuat),
        congNhanSanXuat: trimOrNull(item?.congNhanSanXuat ?? item?.CongNhanSanXuat),
        kcsId: positiveId(item?.kcsId ?? item?.KcsId),
        sortOrder: index + 1,
        defects
    };
});

const loadPlanDetail = async (executor, planSelectKey) => {
    const result = await new sql.Request(executor)
        .input('PlanSelectKey', sql.VarChar(300), planSelectKey)
        .query(`
            EXEC TAG_QLSX.erpint.usp_GetProductionPlanDetail_BySelectKey
                @PlanSelectKey = @PlanSelectKey;
        `);
    return result.recordset?.[0] || null;
};

router.use(authenticateToken);

router.get('/plans', authorize(VIEW_PERMISSIONS), async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('OrderCode', sql.NVarChar(100), trimOrNull(req.query.orderCode))
            .input('Keyword', sql.NVarChar(200), trimOrNull(req.query.keyword))
            .input('DepartmentCode', sql.VarChar(50), trimOrNull(req.query.departmentCode))
            .input('UnitCode', sql.VarChar(50), trimOrNull(req.query.unitCode))
            .input('FromPlanDate', sql.Date, isDateOnly(req.query.fromPlanDate) ? req.query.fromPlanDate : null)
            .input('ToPlanDate', sql.Date, isDateOnly(req.query.toPlanDate) ? req.query.toPlanDate : null)
            .input('TopN', sql.Int, clampTopN(req.query.topN))
            .query(`
                EXEC TAG_QLSX.erpint.usp_SearchProductionPlan
                    @OrderCode = @OrderCode,
                    @Keyword = @Keyword,
                    @DepartmentCode = @DepartmentCode,
                    @UnitCode = @UnitCode,
                    @FromPlanDate = @FromPlanDate,
                    @ToPlanDate = @ToPlanDate,
                    @TopN = @TopN;
            `);
        res.json(result.recordset || []);
    } catch (error) {
        console.error('DoiTraPhoiLoi plan search error:', error);
        res.status(500).json({ message: errorMessage(error, 'Không tải được kế hoạch sản xuất') });
    }
});

router.get('/plans/detail', authorize(VIEW_PERMISSIONS), async (req, res) => {
    const planSelectKey = trimOrNull(req.query.planSelectKey);
    if (!planSelectKey || planSelectKey.length > 300) {
        return res.status(400).json({ message: 'PlanSelectKey không hợp lệ' });
    }
    try {
        const pool = await poolPromise;
        const plan = await loadPlanDetail(pool, planSelectKey);
        if (!plan) return res.status(404).json({ message: 'Không tìm thấy kế hoạch sản xuất' });
        res.json(plan);
    } catch (error) {
        console.error('DoiTraPhoiLoi plan detail error:', error);
        res.status(500).json({ message: errorMessage(error, 'Không tải được chi tiết kế hoạch') });
    }
});

router.get('/defect-groups', authorize(VIEW_PERMISSIONS), async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT Id, MaNhom, TenNhom, SortOrder, TrangThai, CreatedAt, UpdatedAt, RowVersion
            FROM dbo.DM_NHOM_LOI_DOI_TRA_PHOI
            WHERE TrangThai = 1
            ORDER BY SortOrder, Id;
        `);
        res.json(encodeBinary(result.recordset || []));
    } catch (error) {
        console.error('DoiTraPhoiLoi defect group list error:', error);
        res.status(500).json({ message: errorMessage(error, 'Không tải được nhóm lỗi đổi phôi') });
    }
});

router.get('/defect-groups/manage', authorize('QUAN_TRI_DM'), async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT Id, MaNhom, TenNhom, SortOrder, TrangThai, CreatedAt, UpdatedAt, RowVersion
            FROM dbo.DM_NHOM_LOI_DOI_TRA_PHOI
            ORDER BY SortOrder, Id;
        `);
        res.json(encodeBinary(result.recordset || []));
    } catch (error) {
        console.error('DoiTraPhoiLoi defect group management error:', error);
        res.status(500).json({ message: errorMessage(error, 'Không tải được danh mục nhóm lỗi') });
    }
});

router.post('/defect-groups', authorize('QUAN_TRI_DM'), async (req, res) => {
    const maNhom = trimOrNull(req.body?.maNhom);
    const tenNhom = trimOrNull(req.body?.tenNhom);
    const sortOrder = Number(req.body?.sortOrder ?? 0);
    if (!maNhom || maNhom.length > 30 || !tenNhom || tenNhom.length > 255
        || !Number.isInteger(sortOrder) || sortOrder < 0) {
        return res.status(400).json({ message: 'Thông tin nhóm lỗi không hợp lệ' });
    }
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('MaNhom', sql.NVarChar(30), maNhom)
            .input('TenNhom', sql.NVarChar(255), tenNhom)
            .input('SortOrder', sql.Int, sortOrder)
            .query(`
                INSERT dbo.DM_NHOM_LOI_DOI_TRA_PHOI (MaNhom, TenNhom, SortOrder)
                OUTPUT inserted.*
                VALUES (@MaNhom, @TenNhom, @SortOrder);
            `);
        res.status(201).json(encodeBinary(result.recordset[0]));
    } catch (error) {
        const duplicate = [2601, 2627].includes(Number(error?.number || error?.originalError?.info?.number));
        res.status(duplicate ? 409 : 500).json({ message: duplicate ? 'Mã nhóm đã tồn tại' : errorMessage(error, 'Không tạo được nhóm lỗi') });
    }
});

router.put('/defect-groups/:groupId', authorize('QUAN_TRI_DM'), async (req, res) => {
    const groupId = positiveId(req.params.groupId);
    const tenNhom = trimOrNull(req.body?.tenNhom);
    const sortOrder = Number(req.body?.sortOrder ?? 0);
    const trangThai = req.body?.trangThai === true || req.body?.trangThai === 1;
    const rowVersion = rowVersionBuffer(req.body?.rowVersion);
    if (!groupId || !tenNhom || tenNhom.length > 255 || !Number.isInteger(sortOrder)
        || sortOrder < 0 || !rowVersion) {
        return res.status(400).json({ message: 'Thông tin nhóm lỗi hoặc phiên bản dữ liệu không hợp lệ' });
    }
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('Id', sql.Int, groupId)
            .input('TenNhom', sql.NVarChar(255), tenNhom)
            .input('SortOrder', sql.Int, sortOrder)
            .input('TrangThai', sql.Bit, trangThai)
            .input('RowVersion', sql.VarBinary(8), rowVersion)
            .query(`
                UPDATE dbo.DM_NHOM_LOI_DOI_TRA_PHOI
                SET TenNhom=@TenNhom, SortOrder=@SortOrder, TrangThai=@TrangThai,
                    UpdatedAt=SYSDATETIME()
                OUTPUT inserted.*
                WHERE Id=@Id AND RowVersion=@RowVersion;
            `);
        if (!result.recordset[0]) return res.status(409).json({ message: 'Nhóm lỗi đã được người khác cập nhật' });
        res.json(encodeBinary(result.recordset[0]));
    } catch (error) {
        res.status(500).json({ message: errorMessage(error, 'Không cập nhật được nhóm lỗi') });
    }
});

router.get('/traceability-lookups', authorize(VIEW_PERMISSIONS), async (_req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT Id, MaBoPhan, TenBoPhan
            FROM dbo.DM_BO_PHAN
            WHERE ISNULL(TrangThai,1)=1
            ORDER BY TenBoPhan, MaBoPhan;

            SELECT DISTINCT userRow.Id, userRow.Username, userRow.FullName, userRow.BoPhanId,
                department.MaBoPhan, department.TenBoPhan
            FROM dbo.USERS userRow
            LEFT JOIN dbo.DM_BO_PHAN department ON department.Id=userRow.BoPhanId
            WHERE ISNULL(userRow.TrangThai,0)=1
              AND EXISTS (
                SELECT 1
                FROM dbo.USER_ROLE userRole
                INNER JOIN dbo.ROLE_PERMISSION rolePermission ON rolePermission.RoleId=userRole.RoleId
                INNER JOIN dbo.PERMISSIONS permissionRow ON permissionRow.Id=rolePermission.PermissionId
                WHERE userRole.UserId=userRow.Id AND permissionRow.PermissionCode=N'THUC_HIEN_KIEM'
              )
            ORDER BY userRow.FullName, userRow.Username;

            SELECT N'NOI_BO:' + CONVERT(NVARCHAR(20),department.Id) AS [key],
                N'NOI_BO' AS [source],department.Id AS sourceId,
                department.MaBoPhan AS departmentCode,
                department.TenBoPhan AS departmentName,
                CAST(NULL AS INT) AS unitId,CAST(NULL AS NVARCHAR(255)) AS unitName
            FROM dbo.DM_BO_PHAN department
            WHERE ISNULL(department.TrangThai,1)=1
            UNION ALL
            SELECT N'TAG_SYSTEM:' + CONVERT(NVARCHAR(20),externalDepartment.ID_BoPhan) AS [key],
                N'TAG_SYSTEM' AS [source],CONVERT(INT,externalDepartment.ID_BoPhan) AS sourceId,
                CAST(NULL AS NVARCHAR(100)) AS departmentCode,
                LTRIM(RTRIM(externalDepartment.Ten_BoPhan)) COLLATE DATABASE_DEFAULT AS departmentName,
                CONVERT(INT,externalDepartment.ID_DonVi) AS unitId,
                LTRIM(RTRIM(externalUnit.Ten_DonVi)) COLLATE DATABASE_DEFAULT AS unitName
            FROM TAG_System.dbo.DM_BoPhan externalDepartment
            LEFT JOIN TAG_System.dbo.DM_DonVi externalUnit
              ON externalUnit.ID_DonVi=externalDepartment.ID_DonVi
            WHERE externalDepartment.SuDung=1 AND externalDepartment.TonTai=1
              AND NOT EXISTS (
                  SELECT 1 FROM dbo.DM_BO_PHAN localDepartment
                  WHERE ISNULL(localDepartment.TrangThai,1)=1
                    AND UPPER(LTRIM(RTRIM(localDepartment.TenBoPhan)))=
                        UPPER(LTRIM(RTRIM(externalDepartment.Ten_BoPhan COLLATE DATABASE_DEFAULT)))
              )
            ORDER BY departmentName,unitName,departmentCode,sourceId;
        `);
        res.json({
            departments: result.recordsets[0] || [],
            inspectors: result.recordsets[1] || [],
            responsibleDepartments: result.recordsets[2] || []
        });
    } catch (error) {
        console.error('DoiTraPhoiLoi traceability lookup error:', error);
        res.status(500).json({ message: errorMessage(error, 'Không tải được danh mục truy nguyên') });
    }
});

router.post('/summary-preview', authorizeDoiTraAccess, async (req, res) => {
    const phieuIds = [...new Set((Array.isArray(req.body?.phieuIds) ? req.body.phieuIds : [])
        .map(positiveId).filter(Boolean))];
    if (!phieuIds.length || phieuIds.length > 100) {
        return res.status(400).json({ message: 'Vui lòng chọn từ 1 đến 100 phiếu để tổng hợp' });
    }
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('PhieuIdsJson', sql.NVarChar(sql.MAX), JSON.stringify(phieuIds))
            .query(`
                CREATE TABLE #SelectedPhieu (Id INT NOT NULL PRIMARY KEY);
                INSERT #SelectedPhieu SELECT value FROM OPENJSON(@PhieuIdsJson) WITH (value INT '$');

                IF EXISTS (SELECT 1 FROM #SelectedPhieu selected LEFT JOIN dbo.DOI_TRA_PHOI_LOI phieu ON phieu.Id=selected.Id WHERE phieu.Id IS NULL)
                    THROW 52030, N'Có phiếu đổi trả không tồn tại.', 1;
                IF EXISTS (SELECT 1 FROM #SelectedPhieu selected JOIN dbo.DOI_TRA_PHOI_LOI phieu ON phieu.Id=selected.Id WHERE phieu.TrangThai=N'DA_HUY')
                    THROW 52031, N'Không thể tổng hợp phiếu đã hủy.', 1;

                SELECT phieu.Id,phieu.SoPhieu,phieu.TrangThai,phieu.NgayLap,
                    planRow.PlanID,planRow.PlanNo,planRow.OrderCode,planRow.ProductCode,planRow.ProductName,
                    planRow.DepartmentCode,planRow.DepartmentName,planRow.UnitCode,planRow.UnitName
                FROM #SelectedPhieu selected
                JOIN dbo.DOI_TRA_PHOI_LOI phieu ON phieu.Id=selected.Id
                JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId=phieu.Id
                ORDER BY phieu.NgayLap,phieu.Id;

                SELECT phoiRow.*
                FROM #SelectedPhieu selected
                JOIN dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow ON phoiRow.PhieuId=selected.Id
                ORDER BY phoiRow.PhieuId,phoiRow.SortOrder,phoiRow.Id;

                SELECT defectRow.*
                FROM #SelectedPhieu selected
                JOIN dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow ON phoiRow.PhieuId=selected.Id
                JOIN dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT defectRow ON defectRow.PhoiId=phoiRow.Id
                ORDER BY phoiRow.PhieuId,phoiRow.SortOrder,defectRow.SortOrder,defectRow.Id;

                SELECT groupRow.Id,groupRow.MaNhom,groupRow.TenNhom,groupRow.SortOrder,groupRow.TrangThai
                FROM dbo.DM_NHOM_LOI_DOI_TRA_PHOI groupRow
                WHERE groupRow.TrangThai=1 OR EXISTS (
                    SELECT 1 FROM #SelectedPhieu selected
                    JOIN dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow ON phoiRow.PhieuId=selected.Id
                    JOIN dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT defectRow ON defectRow.PhoiId=phoiRow.Id
                    WHERE defectRow.NhomLoiId=groupRow.Id
                )
                ORDER BY groupRow.SortOrder,groupRow.Id;
            `);
        const tickets = result.recordsets[0] || [];
        const defects = result.recordsets[2] || [];
        const phoiItems = (result.recordsets[1] || []).map((item) => ({
            ...item,
            defects: defects.filter((defect) => Number(defect.PhoiId) === Number(item.Id))
        }));
        res.json(encodeBinary({ tickets, phoiItems, defectGroups: result.recordsets[3] || [], isDraft: true }));
    } catch (error) {
        console.error('DoiTraPhoiLoi summary preview error:', error);
        const number = Number(error?.number || error?.originalError?.info?.number);
        res.status(number >= 52030 && number <= 52031 ? 409 : 500)
            .json({ message: errorMessage(error, 'Không tạo được dữ liệu xem trước tổng hợp') });
    }
});

router.get('/', authorizeDoiTraAccess, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('Keyword', sql.NVarChar(200), trimOrNull(req.query.keyword))
            .input('Status', sql.NVarChar(40), trimOrNull(req.query.status))
            .input('FromDate', sql.Date, isDateOnly(req.query.fromDate) ? req.query.fromDate : null)
            .input('ToDate', sql.Date, isDateOnly(req.query.toDate) ? req.query.toDate : null)
            .query(`
                SELECT phieu.Id, phieu.SoPhieu, phieu.TrangThai, phieu.NgayLap,
                    phieu.NguoiLapId, phieu.BoPhanKcsId, phieu.CreatedAt, phieu.UpdatedAt,
                    COALESCE(phieu.DinhMucTrangThai,
                        CASE WHEN phieu.B7ConfirmedAt IS NULL THEN N'CHUA_NHAP' ELSE N'DA_XAC_NHAN' END
                    ) AS DinhMucTrangThai,
                    phieu.B7ConfirmedAt,
                    COALESCE(NULLIF(creator.FullName, N''), creator.Username) AS TenNguoiLap,
                    COALESCE(NULLIF(b7Actor.FullName, N''), b7Actor.Username) AS TenB7XacNhan,
                    department.MaBoPhan AS MaBoPhanKcs,
                    department.TenBoPhan AS TenBoPhanKcs,
                    planRow.PlanSelectKey, planRow.PlanID, planRow.PlanNo,
                    planRow.OrderCode, planRow.ProductCode, planRow.ProductName,
                    planRow.OperationCode, planRow.OperationName,
                    planRow.DepartmentCode, planRow.DepartmentName,
                    planRow.UnitCode, planRow.UnitName, planRow.PlanDate,
                    planRow.PlanQty, planRow.Uom, planRow.ERPPlanStatus
                FROM dbo.DOI_TRA_PHOI_LOI phieu
                INNER JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId = phieu.Id
                LEFT JOIN dbo.USERS creator ON creator.Id = phieu.NguoiLapId
                LEFT JOIN dbo.USERS b7Actor ON b7Actor.Id = phieu.B7ConfirmedBy
                LEFT JOIN dbo.DM_BO_PHAN department ON department.Id = phieu.BoPhanKcsId
                WHERE (@Status IS NULL OR phieu.TrangThai = @Status)
                  AND (@FromDate IS NULL OR phieu.NgayLap >= @FromDate)
                  AND (@ToDate IS NULL OR phieu.NgayLap <= @ToDate)
                  AND (
                    @Keyword IS NULL
                    OR phieu.SoPhieu LIKE N'%' + @Keyword + N'%'
                    OR planRow.PlanNo LIKE N'%' + @Keyword + N'%'
                    OR planRow.OrderCode LIKE N'%' + @Keyword + N'%'
                    OR planRow.ProductCode LIKE N'%' + @Keyword + N'%'
                    OR planRow.ProductName LIKE N'%' + @Keyword + N'%'
                    OR planRow.DepartmentName LIKE N'%' + @Keyword + N'%'
                  )
                ORDER BY phieu.NgayLap DESC, phieu.Id DESC;
            `);
        res.json(encodeBinary(result.recordset || []));
    } catch (error) {
        console.error('DoiTraPhoiLoi list error:', error);
        res.status(500).json({ message: errorMessage(error, 'Không tải được danh sách phiếu đổi trả phôi lỗi') });
    }
});

router.post('/', authorize('THUC_HIEN_KIEM'), async (req, res) => {
    const planSelectKey = trimOrNull(req.body?.planSelectKey);
    if (!planSelectKey || planSelectKey.length > 300) {
        return res.status(400).json({ message: 'Vui lòng chọn kế hoạch sản xuất hợp lệ' });
    }

    let transaction;
    let transactionStarted = false;
    try {
        const pool = await poolPromise;
        const plan = await loadPlanDetail(pool, planSelectKey);
        if (!plan) return res.status(404).json({ message: 'Kế hoạch sản xuất không còn tồn tại' });

        const userId = userIdOf(req);
        if (!userId) return res.status(401).json({ message: 'Không xác định được người lập phiếu' });

        transaction = new sql.Transaction(pool);
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
        transactionStarted = true;
        const request = new sql.Request(transaction);
        const created = await request
            .input('NguoiLapId', sql.Int, userId)
            .input('BoPhanKcsId', sql.Int, positiveId(req.user?.boPhanId))
            .input('PlanSelectKey', sql.VarChar(300), planSelectKey)
            .input('PlanID', sql.VarChar(50), trimOrNull(plan.PlanID))
            .input('PlanNo', sql.NVarChar(200), trimOrNull(plan.PlanNo))
            .input('OrderCode', sql.NVarChar(200), trimOrNull(plan.OrderCode))
            .input('ProductCode', sql.NVarChar(100), trimOrNull(plan.ProductCode))
            .input('ProductName', sql.NVarChar(500), trimOrNull(plan.ProductName))
            .input('OperationCode', sql.NVarChar(100), trimOrNull(plan.OperationCode))
            .input('OperationName', sql.NVarChar(255), trimOrNull(plan.OperationName))
            .input('DepartmentCode', sql.NVarChar(100), trimOrNull(plan.DepartmentCode))
            .input('DepartmentName', sql.NVarChar(500), trimOrNull(plan.DepartmentName))
            .input('UnitCode', sql.NVarChar(100), trimOrNull(plan.UnitCode))
            .input('UnitName', sql.NVarChar(255), trimOrNull(plan.UnitName))
            .input('DepartmentShortName', sql.NVarChar(255), trimOrNull(plan.DepartmentShortName))
            .input('PlanDate', sql.Date, sqlDate(plan.PlanDate))
            .input('PlanQty', sql.Decimal(18, 3), plan.PlanQty == null ? null : Number(plan.PlanQty))
            .input('Uom', sql.NVarChar(100), trimOrNull(plan.Uom))
            .input('ERPPlanStatus', sql.NVarChar(100), trimOrNull(plan.PlanStatus))
            .query(`
                DECLARE @LockResult INT;
                DECLARE @Prefix NVARCHAR(30) = N'DTP-' + CONVERT(CHAR(6), GETDATE(), 12) + N'-';
                DECLARE @NextNumber INT;
                DECLARE @SoPhieu NVARCHAR(50);
                DECLARE @PhieuId INT;
                DECLARE @WorkflowId INT;
                DECLARE @CurrentStepId INT;
                DECLARE @DinhMucStepId INT;

                SELECT @WorkflowId=Id FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW
                WHERE EntityType=N'PHIEU_KIEM' AND IsActive=1;
                SELECT @CurrentStepId=Id FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP
                WHERE WorkflowId=@WorkflowId AND SortOrder=(
                    SELECT MIN(SortOrder) FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP WHERE WorkflowId=@WorkflowId
                );
                IF @WorkflowId IS NULL OR @CurrentStepId IS NULL
                    THROW 52003, N'Chưa cấu hình workflow đổi trả phôi lỗi đang hoạt động.', 1;
                SELECT @DinhMucStepId=Id FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP
                WHERE WorkflowId=@WorkflowId AND StepCode=N'B7_DINH_MUC';

                EXEC @LockResult = sys.sp_getapplock
                    @Resource = N'DOI_TRA_PHOI_LOI_NUMBER',
                    @LockMode = N'Exclusive',
                    @LockOwner = N'Transaction',
                    @LockTimeout = 10000;
                IF @LockResult < 0 THROW 52001, N'Không thể cấp số phiếu. Vui lòng thử lại.', 1;

                SELECT @NextNumber = ISNULL(MAX(TRY_CONVERT(INT, SUBSTRING(SoPhieu, LEN(@Prefix) + 1, 20))), 0) + 1
                FROM dbo.DOI_TRA_PHOI_LOI WITH (UPDLOCK, HOLDLOCK)
                WHERE SoPhieu LIKE @Prefix + N'%';
                SET @SoPhieu = @Prefix + CASE
                    WHEN @NextNumber < 1000 THEN RIGHT(N'000' + CONVERT(NVARCHAR(20), @NextNumber), 3)
                    ELSE CONVERT(NVARCHAR(20), @NextNumber)
                END;

                INSERT dbo.DOI_TRA_PHOI_LOI (
                    SoPhieu, TrangThai, NgayLap, NguoiLapId, BoPhanKcsId, WorkflowId, CurrentStepId,
                    DinhMucTrangThai,DinhMucCurrentStepId
                ) VALUES (
                    @SoPhieu, N'TAO_MOI', CONVERT(date, GETDATE()), @NguoiLapId, @BoPhanKcsId, @WorkflowId, @CurrentStepId,
                    N'CHUA_NHAP',@DinhMucStepId
                );
                SET @PhieuId = SCOPE_IDENTITY();

                INSERT dbo.DOI_TRA_PHOI_LOI_PLAN (
                    PhieuId, PlanSelectKey, PlanID, PlanNo, OrderCode, ProductCode, ProductName,
                    OperationCode, OperationName, DepartmentCode, DepartmentName,
                    UnitCode, UnitName, DepartmentShortName, PlanDate, PlanQty, Uom, ERPPlanStatus
                ) VALUES (
                    @PhieuId, @PlanSelectKey, @PlanID, @PlanNo, @OrderCode, @ProductCode, @ProductName,
                    @OperationCode, @OperationName, @DepartmentCode, @DepartmentName,
                    @UnitCode, @UnitName, @DepartmentShortName, @PlanDate, @PlanQty, @Uom, @ERPPlanStatus
                );

                INSERT dbo.DOI_TRA_PHOI_LOI_HISTORY (
                    PhieuId, ActionCode, FromStatus, ToStatus, ActionBy, GhiChu
                ) VALUES (
                    @PhieuId, N'CREATE_DRAFT', NULL, N'TAO_MOI', @NguoiLapId, N'Tạo phiếu nháp từ kế hoạch ERP'
                );

                SELECT @PhieuId AS Id, @SoPhieu AS SoPhieu;
            `);
        await transaction.commit();
        transactionStarted = false;
        res.status(201).json(created.recordset[0]);
    } catch (error) {
        if (transaction && transactionStarted) {
            try { await transaction.rollback(); } catch (rollbackError) { console.error('DoiTraPhoiLoi rollback error:', rollbackError); }
        }
        console.error('DoiTraPhoiLoi create error:', error);
        const duplicate = [2601, 2627].includes(Number(error?.number || error?.originalError?.info?.number));
        res.status(duplicate ? 409 : 500).json({ message: errorMessage(error, 'Không tạo được phiếu đổi trả phôi lỗi') });
    }
});

router.get('/:id/phoi-options', authorize(VIEW_PERMISSIONS), async (req, res) => {
    const phieuId = positiveId(req.params.id);
    if (!phieuId) return res.status(400).json({ message: 'Mã phiếu không hợp lệ' });
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('PhieuId', sql.Int, phieuId)
            .query(`
                DECLARE @ProductCode NVARCHAR(100);
                SELECT @ProductCode = ProductCode
                FROM dbo.DOI_TRA_PHOI_LOI_PLAN
                WHERE PhieuId = @PhieuId;

                IF @ProductCode IS NULL
                    THROW 52010, N'Phiếu chưa có mã sản phẩm từ kế hoạch.', 1;

                IF NOT EXISTS (
                    SELECT 1 FROM TAG_QTKD.dbo.DM_SanPham
                    WHERE LTRIM(RTRIM(ItemCode)) = LTRIM(RTRIM(@ProductCode)) AND TonTai = 1
                ) THROW 52011, N'Không tìm thấy sản phẩm còn hiệu lực tương ứng với kế hoạch.', 1;

                SELECT DISTINCT
                    sourceRow.ID_LoiPhoi AS SourceLoiPhoiId,
                    product.ID_SanPham AS SourceSanPhamId,
                    sourceRow.ID_VatTu AS SourceVatTuId,
                    sourceRow.GuID AS SourceGuid,
                    @ProductCode AS ProductCode,
                    material.Ma_VatTu AS MaVatTu,
                    material.QuyCach AS QuyCachVatTu,
                    sourceRow.Ten_loaiPhoi AS TenLoaiPhoi,
                    sourceRow.DaoChat,
                    sourceRow.So_phoi AS SoPhoi,
                    sourceRow.KyHieu
                FROM TAG_QTKD.dbo.DM_SanPham product
                INNER JOIN TAG_Giang.dbo.DA_TruyNguyen_SanPham_LoiPhoi sourceRow
                    ON sourceRow.ID_SanPham = product.ID_SanPham
                INNER JOIN TAG_QTKD.dbo.DM_VatTu material
                    ON material.ID_VatTu = sourceRow.ID_VatTu
                WHERE LTRIM(RTRIM(product.ItemCode)) = LTRIM(RTRIM(@ProductCode))
                  AND product.TonTai = 1
                  AND ISNULL(sourceRow.TonTai, 1) = 1
                  AND ISNULL(material.TonTai, 1) = 1
                ORDER BY material.Ma_VatTu, sourceRow.Ten_loaiPhoi, sourceRow.So_phoi;
            `);
        const rows = result.recordset || [];
        if (!rows.length) return res.status(404).json({ message: 'Sản phẩm của kế hoạch chưa được khai báo danh sách phôi.' });
        const materials = [];
        const byMaterial = new Map();
        rows.forEach((row) => {
            const key = String(row.SourceVatTuId);
            if (!byMaterial.has(key)) {
                const material = {
                    SourceVatTuId: row.SourceVatTuId,
                    MaVatTu: row.MaVatTu,
                    QuyCachVatTu: row.QuyCachVatTu,
                    phoi: []
                };
                byMaterial.set(key, material);
                materials.push(material);
            }
            byMaterial.get(key).phoi.push(row);
        });
        res.json(encodeBinary({ ProductCode: rows[0]?.ProductCode, materials }));
    } catch (error) {
        console.error('DoiTraPhoiLoi blank options error:', error);
        const business = Number(error?.number || error?.originalError?.info?.number) >= 52010
            && Number(error?.number || error?.originalError?.info?.number) <= 52011;
        res.status(business ? 422 : 500).json({ message: errorMessage(error, 'Không tải được danh sách phôi') });
    }
});

router.put('/:id/phoi', authorize('THUC_HIEN_KIEM'), async (req, res) => {
    const phieuId = positiveId(req.params.id);
    const rowVersion = rowVersionBuffer(req.body?.rowVersion);
    const items = normalizedPhoiItems(req.body?.items);
    const invalidItem = items.some((item) => !item.sourceLoiPhoiId || !item.soLuongKiem
        || item.soLuongPhoiLoi == null || item.soLuongPhoiLoi > item.soLuongKiem
        || (item.lotSanXuat?.length || 0) > 100 || (item.lenhXuatVatTu?.length || 0) > 100
        || (item.dauTuan?.length || 0) > 100 || (item.toSanXuat?.length || 0) > 255
        || (item.congNhanSanXuat?.length || 0) > 1000
        || item.defects.some((defect) => !defect.nhomLoiId || !defect.defectId
            || !defect.soLuongLoi));
    if (!phieuId || !rowVersion || invalidItem) {
        return res.status(400).json({ message: 'Danh sách phôi, số lượng hoặc phiên bản dữ liệu không hợp lệ' });
    }
    const sourceIds = items.map((item) => item.sourceLoiPhoiId);
    if (new Set(sourceIds).size !== sourceIds.length
        || items.some((item) => new Set(item.defects.map((defect) => defect.defectId)).size !== item.defects.length)) {
        return res.status(400).json({ message: 'Danh sách phôi hoặc lỗi đang bị trùng' });
    }

    try {
        const pool = await poolPromise;
        const flattenedDefects = items.flatMap((item) => item.defects.map((defect) => ({
            sourceLoiPhoiId: item.sourceLoiPhoiId,
            ...defect
        })));
        const result = await pool.request()
            .input('PhieuId', sql.Int, phieuId)
            .input('UserId', sql.Int, userIdOf(req))
            .input('IsAdmin', sql.Bit, isAdmin(req.user))
            .input('RowVersion', sql.VarBinary(8), rowVersion)
            .input('ItemsJson', sql.NVarChar(sql.MAX), JSON.stringify(items))
            .input('DefectsJson', sql.NVarChar(sql.MAX), JSON.stringify(flattenedDefects))
            .query(`
                SET XACT_ABORT ON;
                BEGIN TRANSACTION;

                DECLARE @ProductCode NVARCHAR(100), @ProductName NVARCHAR(500), @FromStatus NVARCHAR(40);
                SELECT @FromStatus = phieu.TrangThai, @ProductCode = planRow.ProductCode,
                       @ProductName = planRow.ProductName
                FROM dbo.DOI_TRA_PHOI_LOI phieu WITH (UPDLOCK, HOLDLOCK)
                INNER JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId = phieu.Id
                WHERE phieu.Id = @PhieuId AND phieu.RowVersion = @RowVersion
                  AND phieu.TrangThai IN (N'TAO_MOI',N'TRA_LAI_KCS')
                  AND (@IsAdmin = 1 OR phieu.NguoiLapId = @UserId);

                IF @FromStatus IS NULL
                    THROW 52020, N'Phiếu đã thay đổi, không còn ở bước KCS hoặc bạn không có quyền sửa.', 1;

                SELECT SourceVatTuId,MAX(SoLuongPhoiLoi) AS SoLuongBoLoi
                INTO #OldMaterialBasis
                FROM dbo.DOI_TRA_PHOI_LOI_PHOI
                WHERE PhieuId=@PhieuId GROUP BY SourceVatTuId;

                CREATE TABLE #InputPhoi (
                    SourceLoiPhoiId INT NOT NULL PRIMARY KEY,
                    SoLuongKiem INT NOT NULL,
                    SoLuongPhoiLoi INT NOT NULL,
                    GhiChu NVARCHAR(1000) NULL,
                    LotSanXuat NVARCHAR(100) NULL,
                    LenhXuatVatTu NVARCHAR(100) NULL,
                    DauTuan NVARCHAR(100) NULL,
                    DonViTaoPhoiId INT NULL,
                    NgayTaoPhoi DATE NULL,
                    ToSanXuat NVARCHAR(255) NULL,
                    CongNhanSanXuat NVARCHAR(1000) NULL,
                    KcsId INT NULL,
                    SortOrder INT NOT NULL
                );
                INSERT #InputPhoi
                SELECT SourceLoiPhoiId, SoLuongKiem, SoLuongPhoiLoi, NULLIF(GhiChu, N''),
                    NULLIF(LotSanXuat,N''),NULLIF(LenhXuatVatTu,N''),NULLIF(DauTuan,N''),
                    DonViTaoPhoiId,NgayTaoPhoi,NULLIF(ToSanXuat,N''),NULLIF(CongNhanSanXuat,N''),KcsId,SortOrder
                FROM OPENJSON(@ItemsJson) WITH (
                    SourceLoiPhoiId INT '$.sourceLoiPhoiId', SoLuongKiem INT '$.soLuongKiem',
                    SoLuongPhoiLoi INT '$.soLuongPhoiLoi', GhiChu NVARCHAR(1000) '$.ghiChu',
                    LotSanXuat NVARCHAR(100) '$.lotSanXuat',LenhXuatVatTu NVARCHAR(100) '$.lenhXuatVatTu',
                    DauTuan NVARCHAR(100) '$.dauTuan',DonViTaoPhoiId INT '$.donViTaoPhoiId',
                    NgayTaoPhoi DATE '$.ngayTaoPhoi',ToSanXuat NVARCHAR(255) '$.toSanXuat',
                    CongNhanSanXuat NVARCHAR(1000) '$.congNhanSanXuat',KcsId INT '$.kcsId',
                    SortOrder INT '$.sortOrder'
                );

                IF EXISTS (
                    SELECT 1 FROM #InputPhoi inputRow
                    LEFT JOIN dbo.DM_BO_PHAN department ON department.Id=inputRow.DonViTaoPhoiId AND ISNULL(department.TrangThai,1)=1
                    WHERE inputRow.DonViTaoPhoiId IS NOT NULL AND department.Id IS NULL
                ) THROW 52023, N'Đơn vị tạo phôi không tồn tại hoặc đã ngừng sử dụng.', 1;

                IF EXISTS (
                    SELECT 1 FROM #InputPhoi inputRow
                    LEFT JOIN dbo.USERS inspector ON inspector.Id=inputRow.KcsId AND ISNULL(inspector.TrangThai,0)=1
                    WHERE inputRow.KcsId IS NOT NULL AND (
                        inspector.Id IS NULL OR NOT EXISTS (
                            SELECT 1 FROM dbo.USER_ROLE userRole
                            JOIN dbo.ROLE_PERMISSION rolePermission ON rolePermission.RoleId=userRole.RoleId
                            JOIN dbo.PERMISSIONS permissionRow ON permissionRow.Id=rolePermission.PermissionId
                            WHERE userRole.UserId=inputRow.KcsId AND permissionRow.PermissionCode=N'THUC_HIEN_KIEM'
                        )
                    )
                ) THROW 52024, N'KCS được chọn không hợp lệ hoặc không còn quyền thực hiện kiểm.', 1;

                CREATE TABLE #SourcePhoi (
                    SourceLoiPhoiId INT NOT NULL PRIMARY KEY, SourceSanPhamId INT NOT NULL,
                    SourceVatTuId INT NOT NULL, SourceGuid UNIQUEIDENTIFIER NULL,
                    MaVatTu NVARCHAR(30) NULL, QuyCachVatTu NVARCHAR(4000) NULL,
                    TenLoaiPhoi NVARCHAR(200) NULL, DaoChat NVARCHAR(100) NULL,
                    SoPhoi NVARCHAR(30) NULL, KyHieu NVARCHAR(50) NULL
                );
                INSERT #SourcePhoi
                SELECT DISTINCT sourceRow.ID_LoiPhoi, product.ID_SanPham, sourceRow.ID_VatTu,
                       sourceRow.GuID, material.Ma_VatTu, material.QuyCach,
                       sourceRow.Ten_loaiPhoi, sourceRow.DaoChat,
                       sourceRow.So_phoi, sourceRow.KyHieu
                FROM TAG_QTKD.dbo.DM_SanPham product
                INNER JOIN TAG_Giang.dbo.DA_TruyNguyen_SanPham_LoiPhoi sourceRow
                    ON sourceRow.ID_SanPham = product.ID_SanPham
                INNER JOIN TAG_QTKD.dbo.DM_VatTu material ON material.ID_VatTu = sourceRow.ID_VatTu
                INNER JOIN #InputPhoi inputRow ON inputRow.SourceLoiPhoiId = sourceRow.ID_LoiPhoi
                WHERE LTRIM(RTRIM(product.ItemCode)) = LTRIM(RTRIM(@ProductCode))
                  AND product.TonTai = 1 AND ISNULL(sourceRow.TonTai, 1) = 1
                  AND ISNULL(material.TonTai, 1) = 1
                ;

                IF EXISTS (SELECT 1 FROM #InputPhoi inputRow LEFT JOIN #SourcePhoi sourceRow
                           ON sourceRow.SourceLoiPhoiId=inputRow.SourceLoiPhoiId
                           WHERE sourceRow.SourceLoiPhoiId IS NULL)
                    THROW 52021, N'Có phôi không còn hiệu lực hoặc không thuộc sản phẩm của kế hoạch.', 1;

                CREATE TABLE #InputDefect (
                    SourceLoiPhoiId INT NOT NULL, NhomLoiId INT NOT NULL, DefectId INT NOT NULL,
                    SoLuongLoi INT NOT NULL, GhiChu NVARCHAR(1000) NULL, SortOrder INT NOT NULL,
                    PRIMARY KEY (SourceLoiPhoiId, DefectId)
                );
                INSERT #InputDefect
                SELECT SourceLoiPhoiId, NhomLoiId, DefectId, SoLuongLoi, NULLIF(GhiChu, N''), SortOrder
                FROM OPENJSON(@DefectsJson) WITH (
                    SourceLoiPhoiId INT '$.sourceLoiPhoiId', NhomLoiId INT '$.nhomLoiId',
                    DefectId INT '$.defectId', SoLuongLoi INT '$.soLuongLoi',
                    GhiChu NVARCHAR(1000) '$.ghiChu', SortOrder INT '$.sortOrder'
                );

                IF EXISTS (
                    SELECT 1 FROM #InputDefect inputDefect
                    LEFT JOIN dbo.DM_NHOM_LOI_DOI_TRA_PHOI groupRow
                        ON groupRow.Id=inputDefect.NhomLoiId AND groupRow.TrangThai=1
                    LEFT JOIN dbo.DM_DEFECT defectRow ON defectRow.Id=inputDefect.DefectId
                    LEFT JOIN #InputPhoi inputPhoi ON inputPhoi.SourceLoiPhoiId=inputDefect.SourceLoiPhoiId
                    WHERE groupRow.Id IS NULL OR defectRow.Id IS NULL OR inputPhoi.SourceLoiPhoiId IS NULL
                       OR inputDefect.SoLuongLoi <= 0 OR inputDefect.SoLuongLoi > inputPhoi.SoLuongPhoiLoi
                ) THROW 52022, N'Nhóm lỗi, lỗi hoặc số lượng lỗi không hợp lệ.', 1;

                DELETE FROM dbo.DOI_TRA_PHOI_LOI_PHOI WHERE PhieuId=@PhieuId;

                INSERT dbo.DOI_TRA_PHOI_LOI_PHOI (
                    PhieuId, SourceLoiPhoiId, SourceSanPhamId, SourceVatTuId, SourceGuid,
                    ProductCode, ProductName, MaVatTu, QuyCachVatTu, TenLoaiPhoi,
                    DaoChat, SoPhoi, KyHieu, SoLuongKiem, SoLuongPhoiLoi, GhiChu,
                    LotSanXuat,LenhXuatVatTu,DauTuan,DonViTaoPhoiId,MaDonViTaoPhoi,TenDonViTaoPhoi,
                    NgayTaoPhoi,ToSanXuat,CongNhanSanXuat,KcsId,TenKcs,MaBoPhanKcs,TenBoPhanKcs,SortOrder
                )
                SELECT @PhieuId, sourceRow.SourceLoiPhoiId, sourceRow.SourceSanPhamId,
                       sourceRow.SourceVatTuId, sourceRow.SourceGuid, @ProductCode, @ProductName,
                       sourceRow.MaVatTu, sourceRow.QuyCachVatTu, sourceRow.TenLoaiPhoi,
                       sourceRow.DaoChat, sourceRow.SoPhoi, sourceRow.KyHieu,
                       inputRow.SoLuongKiem, inputRow.SoLuongPhoiLoi, inputRow.GhiChu,
                       inputRow.LotSanXuat,inputRow.LenhXuatVatTu,inputRow.DauTuan,inputRow.DonViTaoPhoiId,
                       department.MaBoPhan,department.TenBoPhan,inputRow.NgayTaoPhoi,inputRow.ToSanXuat,
                       inputRow.CongNhanSanXuat,inputRow.KcsId,
                       COALESCE(NULLIF(inspector.FullName,N''),inspector.Username),
                       inspectorDepartment.MaBoPhan,inspectorDepartment.TenBoPhan,inputRow.SortOrder
                FROM #InputPhoi inputRow
                INNER JOIN #SourcePhoi sourceRow ON sourceRow.SourceLoiPhoiId=inputRow.SourceLoiPhoiId
                LEFT JOIN dbo.DM_BO_PHAN department ON department.Id=inputRow.DonViTaoPhoiId
                LEFT JOIN dbo.USERS inspector ON inspector.Id=inputRow.KcsId
                LEFT JOIN dbo.DM_BO_PHAN inspectorDepartment ON inspectorDepartment.Id=inspector.BoPhanId;

                INSERT dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT (
                    PhoiId, NhomLoiId, DefectId, MaNhomLoi, TenNhomLoi,
                    MaLoi, TenLoi, DefectType, MoTa, SoLuongLoi, GhiChu, SortOrder
                )
                SELECT savedPhoi.Id, groupRow.Id, defectRow.Id, groupRow.MaNhom, groupRow.TenNhom,
                       defectRow.MaLoi, defectRow.TenLoi, defectRow.DefectType, defectRow.MoTa,
                       inputDefect.SoLuongLoi, inputDefect.GhiChu, inputDefect.SortOrder
                FROM #InputDefect inputDefect
                INNER JOIN dbo.DOI_TRA_PHOI_LOI_PHOI savedPhoi
                    ON savedPhoi.PhieuId=@PhieuId AND savedPhoi.SourceLoiPhoiId=inputDefect.SourceLoiPhoiId
                INNER JOIN dbo.DM_NHOM_LOI_DOI_TRA_PHOI groupRow ON groupRow.Id=inputDefect.NhomLoiId
                INNER JOIN dbo.DM_DEFECT defectRow ON defectRow.Id=inputDefect.DefectId;

                IF EXISTS(
                    SELECT SourceVatTuId,SoLuongBoLoi FROM #OldMaterialBasis
                    EXCEPT
                    SELECT SourceVatTuId,MAX(SoLuongPhoiLoi) FROM dbo.DOI_TRA_PHOI_LOI_PHOI WHERE PhieuId=@PhieuId GROUP BY SourceVatTuId
                ) OR EXISTS(
                    SELECT SourceVatTuId,MAX(SoLuongPhoiLoi) FROM dbo.DOI_TRA_PHOI_LOI_PHOI WHERE PhieuId=@PhieuId GROUP BY SourceVatTuId
                    EXCEPT SELECT SourceVatTuId,SoLuongBoLoi FROM #OldMaterialBasis
                )
                BEGIN
                    UPDATE dbo.DOI_TRA_PHOI_LOI SET
                        DinhMucTrangThai=CASE WHEN B7ConfirmedAt IS NULL THEN ISNULL(DinhMucTrangThai,N'CHUA_NHAP') ELSE N'CAN_XAC_NHAN_LAI' END,
                        B7ConfirmedBy=NULL,B7ConfirmedAt=NULL
                    WHERE Id=@PhieuId;
                END;

                UPDATE dbo.DOI_TRA_PHOI_LOI SET UpdatedAt=SYSDATETIME() WHERE Id=@PhieuId;
                INSERT dbo.DOI_TRA_PHOI_LOI_HISTORY
                    (PhieuId, ActionCode, FromStatus, ToStatus, ActionBy, GhiChu)
                VALUES (@PhieuId, N'SAVE_PHOI_DRAFT', @FromStatus, @FromStatus, @UserId,
                        N'Lưu nháp danh sách phôi và lỗi');

                COMMIT TRANSACTION;
                SELECT Id, SoPhieu, TrangThai, RowVersion FROM dbo.DOI_TRA_PHOI_LOI WHERE Id=@PhieuId;
            `);
        res.json(encodeBinary({ success: true, phieu: result.recordset[0] }));
    } catch (error) {
        console.error('DoiTraPhoiLoi save blanks error:', error);
        const number = Number(error?.number || error?.originalError?.info?.number);
        res.status(number >= 52020 && number <= 52024 ? 409 : 500)
            .json({ message: errorMessage(error, 'Không lưu được danh sách phôi và lỗi') });
    }
});

router.put('/:id/dinh-muc', authorizeDoiTraAccess, async (req, res) => {
    const phieuId = positiveId(req.params.id);
    const rowVersion = rowVersionBuffer(req.body?.rowVersion);
    const items = normalizeDinhMucItems(req.body?.items);
    const invalid = items.some((item) => !item.sourceVatTuId
        || (item.dinhMuc !== null && (!Number.isFinite(item.dinhMuc) || item.dinhMuc <= 0 || item.dinhMuc >= 1e12))
        || (item.ghiChu?.length || 0) > 1000);
    if (!phieuId || !rowVersion || invalid
        || new Set(items.map((item) => item.sourceVatTuId)).size !== items.length) {
        return res.status(400).json({ message: 'Danh sách định mức hoặc phiên bản dữ liệu không hợp lệ' });
    }

    let transaction;
    let started = false;
    try {
        const pool = await poolPromise;
        transaction = new sql.Transaction(pool);
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
        started = true;

        if (!await isB7Actor(transaction, req.user)) {
            await transaction.rollback();
            started = false;
            return res.status(403).json({ message: 'Chỉ nhân viên B7 hoặc Admin được nhập định mức' });
        }

        const result = await new sql.Request(transaction)
            .input('PhieuId', sql.Int, phieuId)
            .input('UserId', sql.Int, userIdOf(req))
            .input('RowVersion', sql.VarBinary(8), rowVersion)
            .input('ItemsJson', sql.NVarChar(sql.MAX), JSON.stringify(items))
            .query(`
                DECLARE @FromStatus NVARCHAR(80);
                SELECT @FromStatus=TrangThai
                FROM dbo.DOI_TRA_PHOI_LOI WITH (UPDLOCK,HOLDLOCK)
                WHERE Id=@PhieuId AND RowVersion=@RowVersion
                  AND TrangThai NOT IN(N'DA_HUY',N'HOAN_TAT');
                IF @FromStatus IS NULL
                    THROW 52102, N'Phiếu đã thay đổi hoặc đã khóa định mức.', 1;

                CREATE TABLE #Input (
                    SourceVatTuId INT NOT NULL PRIMARY KEY,
                    DinhMuc DECIMAL(18,6) NULL,
                    GhiChu NVARCHAR(1000) NULL
                );
                INSERT #Input (SourceVatTuId,DinhMuc,GhiChu)
                SELECT sourceVatTuId,dinhMuc,NULLIF(ghiChu,N'')
                FROM OPENJSON(@ItemsJson) WITH (
                    sourceVatTuId INT '$.sourceVatTuId',
                    dinhMuc DECIMAL(18,6) '$.dinhMuc',
                    ghiChu NVARCHAR(1000) '$.ghiChu'
                );

                IF EXISTS (
                    SELECT 1 FROM #Input inputRow
                    WHERE NOT EXISTS (
                        SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
                        WHERE phoiRow.PhieuId=@PhieuId
                          AND phoiRow.SourceVatTuId=inputRow.SourceVatTuId
                    )
                ) THROW 52103, N'Có vật tư không thuộc phiếu.', 1;

                CREATE TABLE #Material (
                    SourceVatTuId INT NOT NULL PRIMARY KEY,
                    MaVatTu NVARCHAR(100) NULL,
                    QuyCachVatTu NVARCHAR(4000) NULL,
                    SoLuongBoLoi INT NOT NULL
                );
                INSERT #Material(SourceVatTuId,MaVatTu,QuyCachVatTu,SoLuongBoLoi)
                SELECT phoiRow.SourceVatTuId,MAX(phoiRow.MaVatTu),MAX(phoiRow.QuyCachVatTu),
                    MAX(phoiRow.SoLuongPhoiLoi)
                FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
                WHERE phoiRow.PhieuId=@PhieuId
                GROUP BY phoiRow.SourceVatTuId;

                IF EXISTS (
                    SELECT 1
                    FROM #Input inputRow
                    JOIN #Material materialGroup ON materialGroup.SourceVatTuId=inputRow.SourceVatTuId
                    WHERE inputRow.DinhMuc IS NOT NULL
                      AND TRY_CONVERT(DECIMAL(18,6),CONVERT(DECIMAL(38,12),materialGroup.SoLuongBoLoi)*inputRow.DinhMuc) IS NULL
                ) THROW 52104, N'Số lượng đổi trả vượt giới hạn cho phép.', 1;

                UPDATE saved
                SET MaVatTu=materialGroup.MaVatTu,QuyCachVatTu=materialGroup.QuyCachVatTu,
                    SoLuongBoLoiSnapshot=materialGroup.SoLuongBoLoi,
                    DinhMuc=inputRow.DinhMuc,
                    SoLuongDoiTra=TRY_CONVERT(DECIMAL(18,6),CONVERT(DECIMAL(38,12),materialGroup.SoLuongBoLoi)*inputRow.DinhMuc),
                    SourceDonViTinhId=unitRow.ID_DonViTinh,
                    TenDonViTinh=unitRow.Ten_DonViTinh,
                    GhiChu=inputRow.GhiChu,UpdatedBy=@UserId,UpdatedAt=SYSDATETIME()
                FROM dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC saved
                JOIN #Input inputRow ON inputRow.SourceVatTuId=saved.SourceVatTuId
                JOIN #Material materialGroup ON materialGroup.SourceVatTuId=inputRow.SourceVatTuId
                LEFT JOIN TAG_QTKD.dbo.DM_VatTu material ON material.ID_VatTu=materialGroup.SourceVatTuId
                LEFT JOIN TAG_QTKD.dbo.DM_DonViTinh unitRow ON unitRow.ID_DonViTinh=material.ID_DonViTinh
                WHERE saved.PhieuId=@PhieuId;

                INSERT dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC (
                    PhieuId,SourceVatTuId,MaVatTu,QuyCachVatTu,SoLuongBoLoiSnapshot,DinhMuc,SoLuongDoiTra,
                    SourceDonViTinhId,TenDonViTinh,GhiChu,CreatedBy,UpdatedBy
                )
                SELECT @PhieuId,materialGroup.SourceVatTuId,materialGroup.MaVatTu,materialGroup.QuyCachVatTu,
                    materialGroup.SoLuongBoLoi,inputRow.DinhMuc,
                    TRY_CONVERT(DECIMAL(18,6),CONVERT(DECIMAL(38,12),materialGroup.SoLuongBoLoi)*inputRow.DinhMuc),
                    unitRow.ID_DonViTinh,unitRow.Ten_DonViTinh,inputRow.GhiChu,@UserId,@UserId
                FROM #Input inputRow
                JOIN #Material materialGroup ON materialGroup.SourceVatTuId=inputRow.SourceVatTuId
                LEFT JOIN TAG_QTKD.dbo.DM_VatTu material ON material.ID_VatTu=materialGroup.SourceVatTuId
                LEFT JOIN TAG_QTKD.dbo.DM_DonViTinh unitRow ON unitRow.ID_DonViTinh=material.ID_DonViTinh
                WHERE NOT EXISTS (
                    SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC saved
                    WHERE saved.PhieuId=@PhieuId AND saved.SourceVatTuId=inputRow.SourceVatTuId
                );

                UPDATE dbo.DOI_TRA_PHOI_LOI SET DinhMucTrangThai=N'DANG_NHAP',B7ConfirmedBy=NULL,B7ConfirmedAt=NULL,UpdatedAt=SYSDATETIME() WHERE Id=@PhieuId;
                INSERT dbo.DOI_TRA_PHOI_LOI_HISTORY
                    (PhieuId,ActionCode,FromStatus,ToStatus,ActionBy,GhiChu)
                VALUES (@PhieuId,N'SAVE_DINH_MUC_DRAFT',@FromStatus,@FromStatus,@UserId,N'Lưu nháp định mức đổi trả');

                SELECT Id,SoPhieu,TrangThai,RowVersion FROM dbo.DOI_TRA_PHOI_LOI WHERE Id=@PhieuId;
            `);
        await transaction.commit();
        started = false;
        res.json(encodeBinary({ success: true, phieu: result.recordset?.[0] }));
    } catch (error) {
        if (transaction && started) {
            try { await transaction.rollback(); } catch (rollbackError) { console.error('DoiTraPhoiLoi quota rollback error:', rollbackError); }
        }
        console.error('DoiTraPhoiLoi save quota error:', error);
        const number = Number(error?.number || error?.originalError?.info?.number);
        res.status(number >= 52102 && number <= 52104 ? 409 : 500)
            .json({ message: errorMessage(error, 'Không lưu được định mức đổi trả') });
    }
});

router.post('/:id/actions/:actionCode', authorizeDoiTraAccess, async (req, res) => {
    const phieuId = positiveId(req.params.id);
    const rowVersion = rowVersionBuffer(req.body?.rowVersion);
    const actionCode = String(req.params.actionCode || '').trim().toUpperCase();
    const ghiChu = trimOrNull(req.body?.ghiChu);
    const responsibleDepartmentRequest = normalizeResponsibleDepartment(req.body);
    const isKcsAction = ['KCS_SUBMIT', 'KCS_RESUBMIT'].includes(actionCode);
    const supportedActions = ['KCS_SUBMIT', 'KCS_RESUBMIT', 'TBP_CONFIRM', 'TBP_RETURN', 'B7_CONFIRM'];
    if (!phieuId || !rowVersion || !supportedActions.includes(actionCode)
        || (ghiChu?.length || 0) > 1000 || (actionCode === 'TBP_RETURN' && !ghiChu)
        || (isKcsAction && (!responsibleDepartmentRequest?.sourceId
            || !['NOI_BO', 'TAG_SYSTEM'].includes(responsibleDepartmentRequest.source)))) {
        return res.status(400).json({ message: 'Hành động, nội dung hoặc phiên bản dữ liệu không hợp lệ' });
    }

    let transaction;
    let started = false;
    try {
        const pool = await poolPromise;
        transaction = new sql.Transaction(pool);
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
        started = true;

        const loaded = await new sql.Request(transaction)
            .input('PhieuId', sql.Int, phieuId)
            .input('RowVersion', sql.VarBinary(8), rowVersion)
            .input('ActionCode', sql.NVarChar(80), actionCode)
            .query(`
                SELECT phieu.Id,phieu.NguoiLapId,phieu.BoPhanKcsId,phieu.TrangThai,
                    phieu.WorkflowId,phieu.CurrentStepId,
                    transitionRow.Id AS TransitionId,transitionRow.ActionCode,transitionRow.ActionName,
                    transitionRow.ToStepId,transitionRow.ToStatusCode
                FROM dbo.DOI_TRA_PHOI_LOI phieu WITH (UPDLOCK,HOLDLOCK)
                JOIN dbo.DOI_TRA_PHOI_LOI_WORKFLOW_TRANSITION transitionRow
                  ON transitionRow.WorkflowId=phieu.WorkflowId
                 AND transitionRow.FromStepId=phieu.CurrentStepId
                 AND transitionRow.FromStatusCode=phieu.TrangThai
                 AND transitionRow.ActionCode=@ActionCode
                 AND transitionRow.IsActive=1
                WHERE phieu.Id=@PhieuId AND phieu.RowVersion=@RowVersion;
            `);
        const workflowAction = loaded.recordset?.[0];
        if (!workflowAction) {
            await transaction.rollback();
            started = false;
            return res.status(409).json({ message: 'Phiếu đã thay đổi hoặc hành động không còn hợp lệ' });
        }
        if (!await canRunWorkflowAction(transaction, req.user, workflowAction, actionCode)) {
            await transaction.rollback();
            started = false;
            return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
        }

        let responsibleDepartment = null;
        if (isKcsAction && responsibleDepartmentRequest.source === 'NOI_BO') {
            const lookup = await new sql.Request(transaction)
                .input('SourceId', sql.Int, responsibleDepartmentRequest.sourceId)
                .query(`SELECT TOP (1) Id AS SourceId,MaBoPhan AS DepartmentCode,
                    TenBoPhan AS DepartmentName
                    FROM dbo.DM_BO_PHAN
                    WHERE Id=@SourceId AND ISNULL(TrangThai,1)=1;`);
            responsibleDepartment = lookup.recordset?.[0] || null;
        } else if (isKcsAction) {
            const lookup = await new sql.Request(transaction)
                .input('SourceId', sql.Int, responsibleDepartmentRequest.sourceId)
                .query(`SELECT TOP (1) CONVERT(INT,department.ID_BoPhan) AS SourceId,
                    LTRIM(RTRIM(department.Ten_BoPhan)) COLLATE DATABASE_DEFAULT AS DepartmentName,
                    CONVERT(INT,department.ID_DonVi) AS UnitId,
                    LTRIM(RTRIM(unitRow.Ten_DonVi)) COLLATE DATABASE_DEFAULT AS UnitName
                    FROM TAG_System.dbo.DM_BoPhan department
                    LEFT JOIN TAG_System.dbo.DM_DonVi unitRow ON unitRow.ID_DonVi=department.ID_DonVi
                    WHERE department.ID_BoPhan=@SourceId
                      AND department.SuDung=1 AND department.TonTai=1;`);
            responsibleDepartment = lookup.recordset?.[0] || null;
        }
        if (isKcsAction && !responsibleDepartment) {
            await transaction.rollback();
            started = false;
            return res.status(409).json({ message: 'Bộ phận gây lỗi không tồn tại hoặc đã ngừng sử dụng' });
        }

        const result = await new sql.Request(transaction)
            .input('PhieuId', sql.Int, phieuId)
            .input('UserId', sql.Int, userIdOf(req))
            .input('ActionCode', sql.NVarChar(80), actionCode)
            .input('FromStatus', sql.NVarChar(80), workflowAction.TrangThai)
            .input('ToStatus', sql.NVarChar(80), workflowAction.ToStatusCode)
            .input('ToStepId', sql.Int, workflowAction.ToStepId)
            .input('GhiChu', sql.NVarChar(1000), ghiChu)
            .input('BoPhanGayLoiSource', sql.NVarChar(20), responsibleDepartmentRequest?.source || null)
            .input('BoPhanGayLoiSourceId', sql.Int, responsibleDepartment?.SourceId || null)
            .input('BoPhanGayLoiId', sql.Int,
                responsibleDepartmentRequest?.source === 'NOI_BO' ? responsibleDepartment?.SourceId : null)
            .input('MaBoPhanGayLoi', sql.NVarChar(100), responsibleDepartment?.DepartmentCode || null)
            .input('TenBoPhanGayLoi', sql.NVarChar(255), responsibleDepartment?.DepartmentName || null)
            .input('DonViGayLoiSourceId', sql.Int, responsibleDepartment?.UnitId || null)
            .input('TenDonViGayLoi', sql.NVarChar(255), responsibleDepartment?.UnitName || null)
            .query(`
                IF @ActionCode IN (N'KCS_SUBMIT',N'KCS_RESUBMIT')
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI WHERE PhieuId=@PhieuId)
                        THROW 52110, N'Phiếu phải có ít nhất một loại phôi.', 1;
                    IF EXISTS (
                        SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
                        WHERE phoiRow.PhieuId=@PhieuId AND (
                            phoiRow.SoLuongKiem<=0 OR phoiRow.SoLuongPhoiLoi<=0
                            OR phoiRow.SoLuongPhoiLoi>phoiRow.SoLuongKiem
                            OR NULLIF(LTRIM(RTRIM(phoiRow.LotSanXuat)),N'') IS NULL
                            OR NULLIF(LTRIM(RTRIM(phoiRow.LenhXuatVatTu)),N'') IS NULL
                            OR NULLIF(LTRIM(RTRIM(phoiRow.DauTuan)),N'') IS NULL
                            OR phoiRow.DonViTaoPhoiId IS NULL OR phoiRow.NgayTaoPhoi IS NULL
                            OR NULLIF(LTRIM(RTRIM(phoiRow.ToSanXuat)),N'') IS NULL
                            OR NULLIF(LTRIM(RTRIM(phoiRow.CongNhanSanXuat)),N'') IS NULL
                            OR phoiRow.KcsId IS NULL
                        )
                    ) THROW 52111, N'Mỗi loại phôi phải có đủ số lượng, LOT, LXVT và thông tin tem truy nguyên.', 1;
                    IF EXISTS (
                        SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
                        LEFT JOIN dbo.DM_BO_PHAN sourceDepartment
                          ON sourceDepartment.Id=phoiRow.DonViTaoPhoiId AND ISNULL(sourceDepartment.TrangThai,1)=1
                        LEFT JOIN dbo.USERS selectedKcs
                          ON selectedKcs.Id=phoiRow.KcsId AND ISNULL(selectedKcs.TrangThai,0)=1
                        WHERE phoiRow.PhieuId=@PhieuId
                          AND (sourceDepartment.Id IS NULL OR selectedKcs.Id IS NULL)
                    ) THROW 52118, N'Đơn vị tạo phôi hoặc KCS được chọn không còn hoạt động.', 1;
                    IF EXISTS (
                        SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
                        WHERE phoiRow.PhieuId=@PhieuId AND NOT EXISTS (
                            SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT defectRow WHERE defectRow.PhoiId=phoiRow.Id
                        )
                    ) THROW 52112, N'Mỗi loại phôi phải có ít nhất một lỗi.', 1;
                    IF EXISTS (
                        SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT defectRow
                        JOIN dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow ON phoiRow.Id=defectRow.PhoiId
                        WHERE phoiRow.PhieuId=@PhieuId AND (
                            defectRow.NhomLoiId IS NULL OR defectRow.DefectId IS NULL
                            OR defectRow.SoLuongLoi<=0 OR defectRow.SoLuongLoi>phoiRow.SoLuongPhoiLoi
                        )
                    ) THROW 52113, N'Phiếu có nhóm lỗi, lỗi hoặc số lượng lỗi không hợp lệ.', 1;
                    UPDATE phieu SET
                        TrangThai=@ToStatus,CurrentStepId=@ToStepId,
                        BoPhanGayLoiId=@BoPhanGayLoiId,
                        BoPhanGayLoiSource=@BoPhanGayLoiSource,
                        BoPhanGayLoiSourceId=@BoPhanGayLoiSourceId,
                        MaBoPhanGayLoi=@MaBoPhanGayLoi,
                        TenBoPhanGayLoi=@TenBoPhanGayLoi,
                        DonViGayLoiSourceId=@DonViGayLoiSourceId,
                        TenDonViGayLoi=@TenDonViGayLoi,KcsCompletedBy=@UserId,
                        KcsCompletedAt=SYSDATETIME(),TbpKcsConfirmedBy=NULL,TbpKcsConfirmedAt=NULL,
                        LyDoTraLai=NULL,UpdatedAt=SYSDATETIME()
                    FROM dbo.DOI_TRA_PHOI_LOI phieu
                    WHERE phieu.Id=@PhieuId;
                END
                ELSE IF @ActionCode=N'TBP_CONFIRM'
                BEGIN
                    DECLARE @IsKphResubmit BIT=CASE WHEN EXISTS(
                        SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI WHERE Id=@PhieuId AND LastReturnedAt IS NOT NULL
                    ) THEN 1 ELSE 0 END;
                    UPDATE phieu SET TrangThai=@ToStatus,CurrentStepId=@ToStepId,
                        TbpKcsConfirmedBy=@UserId,TbpKcsConfirmedAt=SYSDATETIME(),LyDoTraLai=NULL,
                        RequiresExecutiveApproval=CASE WHEN phieu.LastReturnedAt IS NULL THEN ISNULL(settingRow.BitValue,0) ELSE phieu.RequiresExecutiveApproval END,
                        ReviewRound=CASE WHEN @IsKphResubmit=1 THEN ReviewRound+1 ELSE ReviewRound END,
                        UpdatedAt=SYSDATETIME()
                    FROM dbo.DOI_TRA_PHOI_LOI phieu
                    OUTER APPLY(SELECT TOP 1 BitValue FROM dbo.SYSTEM_SETTINGS WHERE SettingKey=N'REQUIRE_EXECUTIVE_APPROVAL_KPH') settingRow
                    WHERE phieu.Id=@PhieuId;
                    IF @IsKphResubmit=1
                        UPDATE dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN SET TrangThai=N'CHO_Y_KIEN',OpinionSavedBy=NULL,
                            OpinionSavedAt=NULL,OpinionReviewRound=NULL,ConfirmedBy=NULL,ConfirmedAt=NULL,ConfirmedReviewRound=NULL
                        WHERE PhieuId=@PhieuId AND IsActive=1;
                END
                ELSE IF @ActionCode=N'TBP_RETURN'
                    UPDATE dbo.DOI_TRA_PHOI_LOI SET TrangThai=@ToStatus,CurrentStepId=@ToStepId,
                        KcsCompletedBy=NULL,KcsCompletedAt=NULL,TbpKcsConfirmedBy=NULL,TbpKcsConfirmedAt=NULL,
                        LyDoTraLai=@GhiChu,UpdatedAt=SYSDATETIME() WHERE Id=@PhieuId;
                ELSE IF @ActionCode=N'B7_CONFIRM'
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI WHERE PhieuId=@PhieuId)
                        THROW 52115, N'Phiếu không có loại phôi để xác nhận định mức.', 1;
                    IF EXISTS (
                        SELECT 1
                        FROM (
                            SELECT SourceVatTuId,MAX(SoLuongPhoiLoi) AS SoLuongBoLoi
                            FROM dbo.DOI_TRA_PHOI_LOI_PHOI
                            WHERE PhieuId=@PhieuId
                            GROUP BY SourceVatTuId
                        ) materialGroup
                        LEFT JOIN dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC quota
                          ON quota.PhieuId=@PhieuId AND quota.SourceVatTuId=materialGroup.SourceVatTuId
                        WHERE quota.Id IS NULL OR quota.DinhMuc IS NULL OR quota.DinhMuc<=0
                    ) THROW 52116, N'Vui lòng nhập định mức lớn hơn 0 cho tất cả vật tư.', 1;
                    IF EXISTS (
                        SELECT 1
                        FROM (
                            SELECT SourceVatTuId,MAX(SoLuongPhoiLoi) AS SoLuongBoLoi
                            FROM dbo.DOI_TRA_PHOI_LOI_PHOI
                            WHERE PhieuId=@PhieuId
                            GROUP BY SourceVatTuId
                        ) materialGroup
                        JOIN dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC quota
                          ON quota.PhieuId=@PhieuId AND quota.SourceVatTuId=materialGroup.SourceVatTuId
                        WHERE TRY_CONVERT(DECIMAL(18,6),CONVERT(DECIMAL(38,12),materialGroup.SoLuongBoLoi)*quota.DinhMuc) IS NULL
                    ) THROW 52117, N'Số lượng đổi trả vượt giới hạn cho phép.', 1;

                    UPDATE quota SET SoLuongBoLoiSnapshot=materialGroup.SoLuongBoLoi,
                        SoLuongDoiTra=TRY_CONVERT(DECIMAL(18,6),CONVERT(DECIMAL(38,12),materialGroup.SoLuongBoLoi)*quota.DinhMuc),
                        UpdatedBy=@UserId,UpdatedAt=SYSDATETIME()
                    FROM dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC quota
                    JOIN (
                        SELECT SourceVatTuId,MAX(SoLuongPhoiLoi) AS SoLuongBoLoi
                        FROM dbo.DOI_TRA_PHOI_LOI_PHOI
                        WHERE PhieuId=@PhieuId
                        GROUP BY SourceVatTuId
                    ) materialGroup ON materialGroup.SourceVatTuId=quota.SourceVatTuId
                    WHERE quota.PhieuId=@PhieuId;

                    UPDATE dbo.DOI_TRA_PHOI_LOI SET TrangThai=@ToStatus,CurrentStepId=NULL,
                        B7ConfirmedBy=@UserId,B7ConfirmedAt=SYSDATETIME(),UpdatedAt=SYSDATETIME()
                    WHERE Id=@PhieuId;
                END;

                INSERT dbo.DOI_TRA_PHOI_LOI_HISTORY
                    (PhieuId,ActionCode,FromStatus,ToStatus,ActionBy,GhiChu)
                VALUES (@PhieuId,@ActionCode,@FromStatus,@ToStatus,@UserId,@GhiChu);
                SELECT Id,SoPhieu,TrangThai,RowVersion FROM dbo.DOI_TRA_PHOI_LOI WHERE Id=@PhieuId;
            `);
        await transaction.commit();
        started = false;
        res.json(encodeBinary({ success: true, phieu: result.recordset?.[0] }));
    } catch (error) {
        if (transaction && started) {
            try { await transaction.rollback(); } catch (rollbackError) { console.error('DoiTraPhoiLoi action rollback error:', rollbackError); }
        }
        console.error('DoiTraPhoiLoi workflow action error:', error);
        const number = Number(error?.number || error?.originalError?.info?.number);
        const status = number >= 52110 && number <= 52118 ? 422 : 409;
        res.status(status).json({ message: errorMessage(error, 'Không thực hiện được hành động workflow') });
    }
});

router.get('/:id', authorizeDoiTraAccess, async (req, res) => {
    const phieuId = positiveId(req.params.id);
    if (!phieuId) return res.status(400).json({ message: 'Mã phiếu không hợp lệ' });
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('PhieuId', sql.Int, phieuId)
            .query(`
                SELECT phieu.*,
                    COALESCE(NULLIF(creator.FullName, N''), creator.Username) AS TenNguoiLap,
                    kcsDepartment.MaBoPhan AS MaBoPhanKcs,
                    kcsDepartment.TenBoPhan AS TenBoPhanKcs,
                    COALESCE(phieu.MaBoPhanGayLoi,responsibleDepartment.MaBoPhan) AS MaBoPhanGayLoiSnapshot,
                    COALESCE(phieu.TenBoPhanGayLoi,responsibleDepartment.TenBoPhan) AS TenBoPhanGayLoiSnapshot,
                    phieu.TenDonViGayLoi AS TenDonViGayLoiSnapshot,
                    COALESCE(NULLIF(kcsActor.FullName,N''),kcsActor.Username) AS TenKcsHoanTat,
                    COALESCE(NULLIF(tbpActor.FullName,N''),tbpActor.Username) AS TenTbpKcsXacNhan,
                    COALESCE(NULLIF(b7Actor.FullName,N''),b7Actor.Username) AS TenB7XacNhan
                FROM dbo.DOI_TRA_PHOI_LOI phieu
                LEFT JOIN dbo.USERS creator ON creator.Id = phieu.NguoiLapId
                LEFT JOIN dbo.DM_BO_PHAN kcsDepartment ON kcsDepartment.Id = phieu.BoPhanKcsId
                LEFT JOIN dbo.DM_BO_PHAN responsibleDepartment ON responsibleDepartment.Id = phieu.BoPhanGayLoiId
                LEFT JOIN dbo.USERS kcsActor ON kcsActor.Id=phieu.KcsCompletedBy
                LEFT JOIN dbo.USERS tbpActor ON tbpActor.Id=phieu.TbpKcsConfirmedBy
                LEFT JOIN dbo.USERS b7Actor ON b7Actor.Id=phieu.B7ConfirmedBy
                WHERE phieu.Id = @PhieuId;

                SELECT * FROM dbo.DOI_TRA_PHOI_LOI_PLAN WHERE PhieuId = @PhieuId ORDER BY Id;

                SELECT history.*, COALESCE(NULLIF(actor.FullName, N''), actor.Username) AS TenNguoiThucHien
                FROM dbo.DOI_TRA_PHOI_LOI_HISTORY history
                LEFT JOIN dbo.USERS actor ON actor.Id = history.ActionBy
                WHERE history.PhieuId = @PhieuId
                ORDER BY history.CreatedAt, history.Id;

                SELECT phoiRow.*,unitRow.ID_DonViTinh AS CurrentDonViTinhId,
                    unitRow.Ten_DonViTinh AS CurrentTenDonViTinh
                FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
                LEFT JOIN TAG_QTKD.dbo.DM_VatTu material ON material.ID_VatTu=phoiRow.SourceVatTuId
                LEFT JOIN TAG_QTKD.dbo.DM_DonViTinh unitRow ON unitRow.ID_DonViTinh=material.ID_DonViTinh
                WHERE phoiRow.PhieuId=@PhieuId ORDER BY phoiRow.SortOrder,phoiRow.Id;

                SELECT defectRow.*
                FROM dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT defectRow
                INNER JOIN dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow ON phoiRow.Id=defectRow.PhoiId
                WHERE phoiRow.PhieuId=@PhieuId
                ORDER BY phoiRow.SortOrder, defectRow.SortOrder, defectRow.Id;

                SELECT workflow.Id AS WorkflowId,workflow.WorkflowCode,workflow.WorkflowName,workflow.VersionNo,
                    stepRow.Id AS StepId,stepRow.StepCode,stepRow.StepName,stepRow.SortOrder,
                stepRow.PendingStatusCode,stepRow.CompletedStatusCode,stepRow.IsRequired,stepRow.TrackCode,
                    CAST(CASE WHEN stepRow.Id=phieu.CurrentStepId THEN 1 ELSE 0 END AS bit) AS IsCurrent
                FROM dbo.DOI_TRA_PHOI_LOI phieu
                JOIN dbo.DOI_TRA_PHOI_LOI_WORKFLOW workflow ON workflow.Id=phieu.WorkflowId
                JOIN dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP stepRow ON stepRow.WorkflowId=workflow.Id
                WHERE phieu.Id=@PhieuId AND ISNULL(stepRow.TrackCode,N'MAIN')=N'MAIN'
                ORDER BY stepRow.SortOrder,stepRow.Id;

                SELECT groupRow.Id,groupRow.MaNhom,groupRow.TenNhom,groupRow.SortOrder,groupRow.TrangThai
                FROM dbo.DM_NHOM_LOI_DOI_TRA_PHOI groupRow
                WHERE groupRow.TrangThai=1 OR EXISTS (
                    SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
                    JOIN dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT defectRow ON defectRow.PhoiId=phoiRow.Id
                    WHERE phoiRow.PhieuId=@PhieuId AND defectRow.NhomLoiId=groupRow.Id
                )
                ORDER BY groupRow.SortOrder,groupRow.Id;

                SELECT quota.*
                FROM dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC quota
                WHERE quota.PhieuId=@PhieuId
                ORDER BY quota.MaVatTu,quota.SourceVatTuId;

                SELECT transitionRow.Id,transitionRow.ActionCode,transitionRow.ActionName,
                    transitionRow.FromStepId,transitionRow.ToStepId,
                    transitionRow.FromStatusCode,transitionRow.ToStatusCode,
                    transitionRow.RequiredPermission,transitionRow.SortOrder,transitionRow.ConfigJson
                FROM dbo.DOI_TRA_PHOI_LOI phieu
                JOIN dbo.DOI_TRA_PHOI_LOI_WORKFLOW_TRANSITION transitionRow
                  ON transitionRow.WorkflowId=phieu.WorkflowId
                 AND transitionRow.FromStepId=phieu.CurrentStepId
                 AND transitionRow.FromStatusCode=phieu.TrangThai
                 AND transitionRow.IsActive=1
                WHERE phieu.Id=@PhieuId
                ORDER BY transitionRow.SortOrder,transitionRow.Id;
            `);
        const phieu = result.recordsets[0]?.[0];
        if (!phieu) return res.status(404).json({ message: 'Không tìm thấy phiếu đổi trả phôi lỗi' });
        const userId = userIdOf(req);
        const phoiItems = (result.recordsets[3] || []).map((item) => ({
            ...item,
            defects: (result.recordsets[4] || []).filter((defect) => Number(defect.PhoiId) === Number(item.Id))
        }));
        const canEditPhoi = ['TAO_MOI', 'TRA_LAI_KCS'].includes(phieu.TrangThai)
            && (isAdmin(req.user) || (
                Number(phieu.NguoiLapId) === userId
                && hasPermission(req.user, 'THUC_HIEN_KIEM')
            ));
        const b7Actor = await isB7Actor(pool, req.user);
        const availableActions = [];
        for (const action of result.recordsets[8] || []) {
            if (await canRunWorkflowAction(pool, req.user, phieu, action.ActionCode)) {
                let config = {};
                try { config = action.ConfigJson ? JSON.parse(action.ConfigJson) : {}; } catch (_error) { config = {}; }
                availableActions.push({ ...action, ConfigJson: undefined, config });
            }
        }
        const signatures = await loadSignatureDataUrlMap(pool, [
            phieu.NguoiLapId, phieu.KcsCompletedBy, phieu.TbpKcsConfirmedBy, phieu.B7ConfirmedBy
        ]);
        phieu.NguoiLapSignatureDataUrl = signatures.get(Number(phieu.NguoiLapId)) || null;
        phieu.KcsSignatureDataUrl = signatures.get(Number(phieu.KcsCompletedBy)) || null;
        phieu.TbpKcsSignatureDataUrl = signatures.get(Number(phieu.TbpKcsConfirmedBy)) || null;
        phieu.B7SignatureDataUrl = signatures.get(Number(phieu.B7ConfirmedBy)) || null;
        res.json(encodeBinary({
            phieu,
            plans: result.recordsets[1] || [],
            history: result.recordsets[2] || [],
            phoiItems,
            workflow: {
                definition: result.recordsets[5]?.[0] ? {
                    Id: result.recordsets[5][0].WorkflowId,
                    WorkflowCode: result.recordsets[5][0].WorkflowCode,
                    WorkflowName: result.recordsets[5][0].WorkflowName,
                    VersionNo: result.recordsets[5][0].VersionNo
                } : null,
                steps: result.recordsets[5] || [],
                availableActions
            },
            defectGroups: result.recordsets[6] || [],
            dinhMucItems: result.recordsets[7] || [],
            capabilities: {
                canCancel: phieu.TrangThai === 'TAO_MOI' && canEditPhoi,
                canEditPhoi,
                canEditDinhMuc: !['DA_HUY', 'HOAN_TAT'].includes(phieu.TrangThai) && b7Actor,
                canSaveDinhMuc: !['DA_HUY', 'HOAN_TAT'].includes(phieu.TrangThai) && b7Actor,
                canConfirmDinhMuc: !['DA_HUY', 'HOAN_TAT'].includes(phieu.TrangThai) && b7Actor
            }
        }));
    } catch (error) {
        console.error('DoiTraPhoiLoi detail error:', error);
        res.status(500).json({ message: errorMessage(error, 'Không tải được phiếu đổi trả phôi lỗi') });
    }
});

router.post('/:id/cancel', authorize('THUC_HIEN_KIEM'), async (req, res) => {
    const phieuId = positiveId(req.params.id);
    const rowVersion = rowVersionBuffer(req.body?.rowVersion);
    if (!phieuId || !rowVersion) {
        return res.status(400).json({ message: 'Mã phiếu hoặc phiên bản dữ liệu không hợp lệ' });
    }
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('PhieuId', sql.Int, phieuId)
            .input('UserId', sql.Int, userIdOf(req))
            .input('IsAdmin', sql.Bit, isAdmin(req.user))
            .input('RowVersion', sql.VarBinary(8), rowVersion)
            .query(`
                SET XACT_ABORT ON;
                BEGIN TRANSACTION;

                DECLARE @FromStatus NVARCHAR(40);
                SELECT @FromStatus = TrangThai
                FROM dbo.DOI_TRA_PHOI_LOI WITH (UPDLOCK, HOLDLOCK)
                WHERE Id = @PhieuId
                  AND RowVersion = @RowVersion
                  AND TrangThai = N'TAO_MOI'
                  AND (@IsAdmin = 1 OR NguoiLapId = @UserId);

                IF @FromStatus IS NULL
                BEGIN
                    ROLLBACK;
                    THROW 52002, N'Phiếu đã thay đổi, không còn ở trạng thái nháp hoặc bạn không có quyền hủy.', 1;
                END;

                UPDATE dbo.DOI_TRA_PHOI_LOI
                SET TrangThai = N'DA_HUY', CancelledBy = @UserId, CancelledAt = SYSDATETIME(),
                    CurrentStepId = NULL, UpdatedAt = SYSDATETIME()
                WHERE Id = @PhieuId;

                INSERT dbo.DOI_TRA_PHOI_LOI_HISTORY (
                    PhieuId, ActionCode, FromStatus, ToStatus, ActionBy, GhiChu
                ) VALUES (
                    @PhieuId, N'CANCEL_DRAFT', @FromStatus, N'DA_HUY', @UserId, N'Hủy phiếu nháp'
                );

                COMMIT;
                SELECT Id, SoPhieu, TrangThai, RowVersion FROM dbo.DOI_TRA_PHOI_LOI WHERE Id = @PhieuId;
            `);
        res.json(encodeBinary({ success: true, phieu: result.recordset[0] }));
    } catch (error) {
        console.error('DoiTraPhoiLoi cancel error:', error);
        res.status(409).json({ message: errorMessage(error, 'Không hủy được phiếu') });
    }
});

router.delete('/:id', requireExactPermission('XOA_HO_SO_KCS'), async (req, res) => {
    const phieuId = positiveId(req.params.id);
    if (!phieuId) return res.status(400).json({ message: 'Id phiếu không hợp lệ' });

    let transaction;
    let started = false;
    try {
        const pool = await poolPromise;
        transaction = new sql.Transaction(pool);
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
        started = true;

        const result = await new sql.Request(transaction)
            .input('PhieuId', sql.Int, phieuId)
            .input('DeletedBy', sql.Int, userIdOf(req))
            .query(`
                DECLARE @SoPhieu NVARCHAR(100),@SnapshotJson NVARCHAR(MAX);
                SELECT @SoPhieu=SoPhieu
                FROM dbo.DOI_TRA_PHOI_LOI WITH (UPDLOCK,HOLDLOCK)
                WHERE Id=@PhieuId;
                IF @SoPhieu IS NULL
                    THROW 52130,N'Không tìm thấy phiếu đổi trả phôi lỗi.',1;

                SET @SnapshotJson=(
                    SELECT phieu.*,
                        JSON_QUERY((SELECT planRow.* FROM dbo.DOI_TRA_PHOI_LOI_PLAN planRow WHERE planRow.PhieuId=phieu.Id FOR JSON PATH)) AS Plans,
                        JSON_QUERY((SELECT historyRow.* FROM dbo.DOI_TRA_PHOI_LOI_HISTORY historyRow WHERE historyRow.PhieuId=phieu.Id FOR JSON PATH)) AS History,
                        JSON_QUERY((SELECT quotaRow.* FROM dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC quotaRow WHERE quotaRow.PhieuId=phieu.Id FOR JSON PATH)) AS VatTuDinhMuc,
                        JSON_QUERY((SELECT item.* FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN item WHERE item.PhieuId=phieu.Id FOR JSON PATH)) AS KphYKien,
                        JSON_QUERY((SELECT item.* FROM dbo.DOI_TRA_PHOI_LOI_KPH_XU_LY item WHERE item.PhieuId=phieu.Id FOR JSON PATH)) AS KphXuLy,
                        JSON_QUERY((SELECT item.* FROM dbo.DOI_TRA_PHOI_LOI_KPH_CHI_PHI item WHERE item.PhieuId=phieu.Id FOR JSON PATH)) AS KphChiPhi,
                        JSON_QUERY((SELECT item.* FROM dbo.DOI_TRA_PHOI_LOI_KPH_HANH_DONG item WHERE item.PhieuId=phieu.Id FOR JSON PATH)) AS KphHanhDong,
                        JSON_QUERY((SELECT item.* FROM dbo.DOI_TRA_PHOI_LOI_KPH_REVIEW_HISTORY item WHERE item.PhieuId=phieu.Id FOR JSON PATH)) AS KphHistory,
                        JSON_QUERY((
                            SELECT phoiRow.*,
                                JSON_QUERY((SELECT defectRow.* FROM dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT defectRow WHERE defectRow.PhoiId=phoiRow.Id FOR JSON PATH)) AS Defects,
                                JSON_QUERY((SELECT quotaRow.* FROM dbo.DOI_TRA_PHOI_LOI_PHOI_DINH_MUC quotaRow WHERE quotaRow.PhoiId=phoiRow.Id FOR JSON PATH)) AS DinhMuc
                            FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
                            WHERE phoiRow.PhieuId=phieu.Id FOR JSON PATH
                        )) AS PhoiItems
                    FROM dbo.DOI_TRA_PHOI_LOI phieu
                    WHERE phieu.Id=@PhieuId
                    FOR JSON PATH,WITHOUT_ARRAY_WRAPPER
                );

                INSERT dbo.KCS_RECORD_DELETE_AUDIT
                    (EntityType,EntityId,RecordNumber,DeletedBy,SnapshotJson)
                VALUES (N'DOI_TRA_PHOI_LOI',@PhieuId,@SoPhieu,@DeletedBy,@SnapshotJson);

                DELETE FROM dbo.DOI_TRA_PHOI_LOI WHERE Id=@PhieuId;
                SELECT @@ROWCOUNT AS DeletedCount;
            `);

        await transaction.commit();
        started = false;
        if (!Number(result.recordset?.[0]?.DeletedCount)) {
            return res.status(404).json({ message: 'Phiếu đã bị xóa hoặc không còn tồn tại' });
        }
        res.json({ success: true, message: 'Đã xóa phiếu đổi trả phôi lỗi và toàn bộ dữ liệu liên quan' });
    } catch (error) {
        if (transaction && started) {
            try { await transaction.rollback(); } catch { /* no-op */ }
        }
        const number = Number(error?.number || error?.originalError?.info?.number);
        console.error('DoiTraPhoiLoi delete error:', error);
        res.status(number === 52130 ? 404 : 500)
            .json({ message: errorMessage(error, 'Không thể xóa phiếu đổi trả phôi lỗi') });
    }
});

module.exports = router;
