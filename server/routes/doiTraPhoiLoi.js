const express = require('express');
const sql = require('mssql');
const { poolPromise } = require('../db');
const authenticateToken = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const requireExactPermission = require('../middlewares/exactPermission.middleware');
const { canLeadDepartment, getManagedDepartmentIds } = require('../utils/managedDepartments');
const { loadSignatureDataUrlMap } = require('../utils/signatureImage');
const { isValidReturnQuantity } = require('../utils/doiTraReturnQuantity');
const { canB7Work } = require('../utils/doiTraParallelWorkflow');
const { writeDoiTraSummaryExcel } = require('../utils/doiTraSummaryExcel');
const { writeDefectFlowExcel } = require('../utils/doiTraDefectFlowExcel');
const { buildDefectFlowReport, normalizeGroupType } = require('../utils/doiTraDefectFlowReport');
const { normalizeDoiTraOperationConfig } = require('../utils/doiTraOperationConfig');
const { normalizePlanSelectKeys, childTicketNumber } = require('../utils/doiTraMultiPlan');
const { loadDefectFlowRecordsets } = require('../services/doiTraDefectFlowReport');
const {
    createDoiTraSupplementIssues,
    cancelDraftSupplementIssuesForKcsReturn,
    ERP_VALIDATION_ERROR_MIN,
    ERP_VALIDATION_ERROR_MAX
} = require('../services/doiTraSupplementIssue');
const {
    createDoiTraDefectReceipts,
    cancelDraftDefectReceipt,
    confirmDefectReceiptByWarehouse,
    recordDefectReceiptStockCard,
    updateDraftDefectReceiptProcess,
    RECEIPT_VALIDATION_ERROR_MIN,
    RECEIPT_VALIDATION_ERROR_MAX
} = require('../services/doiTraDefectReceipt');

const router = express.Router();
const VIEW_PERMISSIONS = ['THUC_HIEN_KIEM', 'XEM_PHIEU_KIEM', 'XAC_NHAN_KHO_SXBT', 'GHI_THE_KHO'];
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
const normalizeReturnQuantityItems = (value) => (Array.isArray(value) ? value : []).map((item) => {
    const raw = item?.soLuongDoiTra ?? item?.SoLuongDoiTra;
    const soLuongDoiTra = raw === '' || raw == null ? null : Number(raw);
    return {
        sourceVatTuId: positiveId(item?.sourceVatTuId ?? item?.SourceVatTuId),
        soLuongDoiTra,
        ghiChu: trimOrNull(item?.ghiChu ?? item?.GhiChu)
    };
});
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
    if (actionCode === 'STOCK_CARD_RECORD') return hasPermission(user, 'GHI_THE_KHO');
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
    if (actionCode === 'KHO_CONFIRM') return hasPermission(user, 'XAC_NHAN_KHO_SXBT');
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
            const managedDepartmentIds = await getManagedDepartmentIds(pool, userIdOf(req), req.user?.boPhanId);
            const participant = await pool.request()
                .input('PhieuId', sql.Int, routeId)
                .input('UserId', sql.Int, userIdOf(req))
                .input('ManagedIds', sql.NVarChar(sql.MAX), managedDepartmentIds.join(','))
                .query(`SELECT TOP 1 1 Allowed FROM dbo.DOI_TRA_PHOI_LOI p
                    WHERE p.Id=@PhieuId AND (p.NguoiLapId=@UserId OR EXISTS(
                        SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_NHOM groupRow
                        JOIN dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN y ON y.PhieuId=groupRow.KphPhieuId
                        WHERE groupRow.Id=p.NhomPhieuId AND y.IsActive=1 AND y.BoPhanId IN(
                            SELECT TRY_CONVERT(INT,value) FROM STRING_SPLIT(@ManagedIds,',')
                        )
                    ))`);
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
    const sourceType = String(item?.sourceType ?? item?.SourceType ?? 'COMPONENT').trim().toUpperCase();
    const legacySourceId = item?.sourceLoiPhoiId ?? item?.SourceLoiPhoiId;
    const sourceId = positiveId(item?.sourceId ?? item?.SourceId ?? (
        sourceType === 'BTP_STAGE'
            ? item?.sourceCatalogProductId ?? item?.SourceCatalogProductId
            : sourceType === 'MANUAL'
                ? item?.sourceManualPhoiId ?? item?.SourceManualPhoiId
                : legacySourceId
    ));
    const defects = (Array.isArray(item?.defects) ? item.defects : []).map((defect, defectIndex) => ({
        nhomLoiId: positiveId(defect?.nhomLoiId ?? defect?.NhomLoiId),
        defectId: positiveId(defect?.defectId ?? defect?.DefectId),
        soLuongLoi: positiveId(defect?.soLuongLoi ?? defect?.SoLuongLoi),
        ghiChu: trimOrNull(defect?.ghiChu ?? defect?.GhiChu),
        boPhanGayLoiSource: String(defect?.boPhanGayLoiSource ?? defect?.BoPhanGayLoiSource ?? '').trim().toUpperCase(),
        boPhanGayLoiSourceId: positiveId(defect?.boPhanGayLoiSourceId ?? defect?.BoPhanGayLoiSourceId),
        sourceLenhXuatVTId: positiveId(defect?.sourceLenhXuatVTId ?? defect?.SourceLenhXuatVTId),
        manualLxvtKey: trimOrNull(defect?.manualLxvtKey ?? defect?.ManualLxvtKey),
        sortOrder: defectIndex + 1
    }));
    const issueTraceabilities = (Array.isArray(item?.issueTraceabilities) ? item.issueTraceabilities : []).map((trace, traceIndex) => ({
        sourceLenhXuatVTId: positiveId(trace?.sourceLenhXuatVTId ?? trace?.SourceLenhXuatVTId),
        manualLxvtKey: trimOrNull(trace?.manualLxvtKey ?? trace?.ManualLxvtKey),
        soLenhXuatVT: trimOrNull(trace?.soLenhXuatVT ?? trace?.SoLenhXuatVT),
        lotSanXuat: trimOrNull(trace?.lotSanXuat ?? trace?.LotSanXuat),
        dauTuan: trimOrNull(trace?.dauTuan ?? trace?.DauTuan),
        donViTaoPhoiId: positiveId(trace?.donViTaoPhoiId ?? trace?.DonViTaoPhoiId),
        ngayTaoPhoi: isDateOnly(trace?.ngayTaoPhoi ?? trace?.NgayTaoPhoi)
            ? String(trace?.ngayTaoPhoi ?? trace?.NgayTaoPhoi) : null,
        toSanXuat: trimOrNull(trace?.toSanXuat ?? trace?.ToSanXuat),
        congNhanSanXuat: trimOrNull(trace?.congNhanSanXuat ?? trace?.CongNhanSanXuat),
        sortOrder: traceIndex + 1
    }));
    return {
        sourceType,
        sourceId,
        sourceLoiPhoiId: sourceType === 'COMPONENT' ? sourceId : null,
        sourceCatalogProductId: sourceType === 'BTP_STAGE' ? sourceId : null,
        sourceManualPhoiId: sourceType === 'MANUAL' ? sourceId : null,
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
        kcsId: null,
        sortOrder: index + 1,
        defects,
        issueTraceabilities
    };
});

const defectFlowFilters = (query = {}) => ({
    fromDate: isDateOnly(query.fromDate) ? String(query.fromDate) : null,
    toDate: isDateOnly(query.toDate) ? String(query.toDate) : null,
    unitId: positiveId(query.unitId),
    departmentId: positiveId(query.departmentId),
    planId: positiveId(query.planId),
    orderId: positiveId(query.orderId),
    warehouseId: positiveId(query.warehouseId),
    keyword: trimOrNull(query.keyword),
    groupBy: normalizeGroupType(query.groupBy),
    page: positiveId(query.page) || 1,
    pageSize: Math.min(positiveId(query.pageSize) || 50, 200)
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

router.get('/operation-configs/manage', authorize('QUAN_TRI_DM'), async (_req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT processRow.ID_QuyTrinhSanXuat AS ProcessId,
                LTRIM(RTRIM(processRow.KyHieu_QuyTrinhSanXuat)) AS OperationCode,
                LTRIM(RTRIM(processRow.Ten_QuyTrinhSanXuat)) AS OperationName,
                config.Id AS ConfigId,
                COALESCE(config.SelectionMode,N'COMPONENT') AS SelectionMode,
                config.BtpSuffix,
                COALESCE(config.RequiresB7,CONVERT(bit,1)) AS RequiresB7,
                COALESCE(config.RequireLenhXuatVatTu,CONVERT(bit,1)) AS RequireLenhXuatVatTu,
                COALESCE(config.IsActive,CONVERT(bit,0)) AS IsActive,
                CAST(CASE WHEN config.Id IS NULL THEN 0 ELSE 1 END AS bit) AS HasConfig,
                config.CreatedAt,config.UpdatedAt
            FROM TAG_QTKD.dbo.DM_QuyTrinhSanXuat processRow
            LEFT JOIN dbo.DOI_TRA_PHOI_LOI_CONG_DOAN_CONFIG config
              ON config.SourceQuyTrinhSanXuatId=processRow.ID_QuyTrinhSanXuat
            ORDER BY processRow.STT_QuyTrinhSanXuat,processRow.ID_QuyTrinhSanXuat;
        `);
        res.json(encodeBinary(result.recordset || []));
    } catch (error) {
        console.error('DoiTraPhoiLoi operation config list error:', error);
        res.status(500).json({ message: errorMessage(error, 'Không tải được cấu hình công đoạn đổi trả') });
    }
});

router.put('/operation-configs/:processId', authorize('QUAN_TRI_DM'), async (req, res) => {
    const processId = positiveId(req.params.processId);
    const normalized = normalizeDoiTraOperationConfig(req.body);
    if (!processId || processId > 255 || normalized.error) {
        return res.status(400).json({ message: normalized.error || 'Quy trình sản xuất không hợp lệ' });
    }

    let transaction;
    try {
        const pool = await poolPromise;
        transaction = new sql.Transaction(pool);
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
        const result = await new sql.Request(transaction)
            .input('ProcessId', sql.TinyInt, processId)
            .input('SelectionMode', sql.NVarChar(30), normalized.selectionMode)
            .input('BtpSuffix', sql.NVarChar(20), normalized.btpSuffix)
            .input('RequiresB7', sql.Bit, normalized.requiresB7)
            .input('RequireLenhXuatVatTu', sql.Bit, normalized.requireLenhXuatVatTu)
            .input('IsActive', sql.Bit, normalized.isActive)
            .query(`
                DECLARE @OperationCode NVARCHAR(100),@OperationName NVARCHAR(255);
                SELECT @OperationCode=LTRIM(RTRIM(KyHieu_QuyTrinhSanXuat)),
                    @OperationName=LTRIM(RTRIM(Ten_QuyTrinhSanXuat))
                FROM TAG_QTKD.dbo.DM_QuyTrinhSanXuat
                WHERE ID_QuyTrinhSanXuat=@ProcessId;
                IF @OperationCode IS NULL
                    THROW 52710,N'Quy trình sản xuất không tồn tại.',1;

                IF EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_CONG_DOAN_CONFIG WITH (UPDLOCK,HOLDLOCK)
                    WHERE SourceQuyTrinhSanXuatId=@ProcessId)
                    UPDATE dbo.DOI_TRA_PHOI_LOI_CONG_DOAN_CONFIG
                    SET OperationCode=@OperationCode,SelectionMode=@SelectionMode,BtpSuffix=@BtpSuffix,
                        RequiresB7=@RequiresB7,RequireLenhXuatVatTu=@RequireLenhXuatVatTu,
                        IsActive=@IsActive,UpdatedAt=SYSDATETIME()
                    WHERE SourceQuyTrinhSanXuatId=@ProcessId;
                ELSE
                    INSERT dbo.DOI_TRA_PHOI_LOI_CONG_DOAN_CONFIG(
                        SourceQuyTrinhSanXuatId,OperationCode,SelectionMode,BtpSuffix,
                        RequiresB7,RequireLenhXuatVatTu,IsActive
                    ) VALUES(@ProcessId,@OperationCode,@SelectionMode,@BtpSuffix,
                        @RequiresB7,@RequireLenhXuatVatTu,@IsActive);

                SELECT config.Id AS ConfigId,@ProcessId AS ProcessId,@OperationCode AS OperationCode,
                    @OperationName AS OperationName,config.SelectionMode,config.BtpSuffix,
                    config.RequiresB7,config.RequireLenhXuatVatTu,config.IsActive,
                    CONVERT(bit,1) AS HasConfig,config.CreatedAt,config.UpdatedAt
                FROM dbo.DOI_TRA_PHOI_LOI_CONG_DOAN_CONFIG config
                WHERE config.SourceQuyTrinhSanXuatId=@ProcessId;
            `);
        await transaction.commit();
        transaction = null;
        res.json(encodeBinary(result.recordset[0]));
    } catch (error) {
        if (transaction) {
            try { await transaction.rollback(); } catch (_) { /* noop */ }
        }
        const number = Number(error?.number || error?.originalError?.info?.number);
        res.status(number === 52710 ? 404 : 500).json({
            message: errorMessage(error, 'Không lưu được cấu hình công đoạn đổi trả')
        });
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

            SELECT N'NOI_BO:' + CONVERT(NVARCHAR(20),department.Id) AS [key],
                N'NOI_BO' AS [source],department.Id AS sourceId,
                department.MaBoPhan AS departmentCode,
                department.TenBoPhan AS departmentName,
                CAST(NULL AS INT) AS unitId,CAST(NULL AS NVARCHAR(255)) AS unitName
            FROM dbo.DM_BO_PHAN department
            WHERE ISNULL(department.TrangThai,1)=1
            UNION ALL
            SELECT DISTINCT N'TAG_SYSTEM:' + CONVERT(NVARCHAR(20),externalDepartment.ID_BoPhan) AS [key],
                N'TAG_SYSTEM' AS [source],CONVERT(INT,externalDepartment.ID_BoPhan) AS sourceId,
                CAST(NULL AS NVARCHAR(100)) AS departmentCode,
                LTRIM(RTRIM(externalDepartment.Ten_BoPhan)) COLLATE DATABASE_DEFAULT AS departmentName,
                CONVERT(INT,externalDepartment.ID_DonVi) AS unitId,
                LTRIM(RTRIM(externalUnit.Ten_DonVi)) COLLATE DATABASE_DEFAULT AS unitName
            FROM TAG_System.dbo.DM_BoPhan externalDepartment
            LEFT JOIN TAG_System.dbo.DM_DonVi externalUnit
              ON externalUnit.ID_DonVi=externalDepartment.ID_DonVi
            WHERE externalDepartment.SuDung=1 AND externalDepartment.TonTai=1
              AND externalDepartment.ID_DonVi=32
            UNION ALL
            SELECT N'NHA_CUNG_CAP:' + CONVERT(NVARCHAR(20),supplier.ID_NhaCungCap) AS [key],
                N'NHA_CUNG_CAP' AS [source],CONVERT(INT,supplier.ID_NhaCungCap) AS sourceId,
                LTRIM(RTRIM(supplier.MaSo_NhaCungCap)) COLLATE DATABASE_DEFAULT AS departmentCode,
                LTRIM(RTRIM(supplier.Ten_NhaCungCap)) COLLATE DATABASE_DEFAULT AS departmentName,
                CAST(NULL AS INT) AS unitId,CAST(NULL AS NVARCHAR(255)) AS unitName
            FROM TAG_QTKD.dbo.DM_NhaCungCap supplier
            WHERE supplier.SuDung=1 AND supplier.TonTai=1
            ORDER BY departmentName,unitName,departmentCode,sourceId;
        `);
        res.json({
            departments: result.recordsets[0] || [],
            responsibleDepartments: result.recordsets[1] || []
        });
    } catch (error) {
        console.error('DoiTraPhoiLoi traceability lookup error:', error);
        res.status(500).json({ message: errorMessage(error, 'Không tải được danh mục truy nguyên') });
    }
});

router.get('/reports/defect-flow', authorizeDoiTraAccess, async (req, res) => {
    const filters = defectFlowFilters(req.query);
    if ((req.query.fromDate && !filters.fromDate) || (req.query.toDate && !filters.toDate)) {
        return res.status(400).json({ message: 'Khoảng ngày báo cáo không hợp lệ' });
    }
    try {
        const pool = await poolPromise;
        const recordsets = await loadDefectFlowRecordsets(pool, filters, false);
        res.json(encodeBinary(buildDefectFlowReport(recordsets, { groupBy: filters.groupBy })));
    } catch (error) {
        const number = Number(error?.number || error?.originalError?.info?.number);
        console.error('DoiTraPhoiLoi defect flow report error:', error);
        res.status(number >= 52500 && number <= 52509 ? 400 : 500)
            .json({ message: errorMessage(error, 'Không tải được báo cáo đối soát BTP lỗi') });
    }
});

router.get('/reports/defect-flow/export', authorizeDoiTraAccess, async (req, res) => {
    const filters = defectFlowFilters(req.query);
    if ((req.query.fromDate && !filters.fromDate) || (req.query.toDate && !filters.toDate)) {
        return res.status(400).json({ message: 'Khoảng ngày báo cáo không hợp lệ' });
    }
    try {
        const pool = await poolPromise;
        const recordsets = await loadDefectFlowRecordsets(pool, filters, true);
        const report = buildDefectFlowReport(recordsets, { groupBy: filters.groupBy });
        const buffer = writeDefectFlowExcel(report);
        const from = filters.fromDate || 'tu-dau';
        const to = filters.toDate || 'hien-tai';
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="bao-cao-doi-soat-btp-loi-${from}-${to}.xlsx"`);
        res.send(buffer);
    } catch (error) {
        const number = Number(error?.number || error?.originalError?.info?.number);
        console.error('DoiTraPhoiLoi defect flow export error:', error);
        res.status(number >= 52500 && number <= 52509 ? 400 : 500)
            .json({ message: errorMessage(error, 'Không xuất được báo cáo đối soát BTP lỗi') });
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

                SELECT phieu.Id,nhom.SoPhieu,phieu.SoPhieu AS SoPhieuKeHoach,
                    phieu.ThuTuKeHoach,phieu.TrangThai,phieu.NgayLap,
                    planRow.PlanID,planRow.PlanNo,planRow.OrderCode,planRow.ProductCode,planRow.ProductName,
                    planRow.DepartmentCode,planRow.DepartmentName,planRow.UnitCode,planRow.UnitName,
                    sxbtUnit.SxbtUnitCode,
                    productionLot.ExpectedProductionLot
                FROM #SelectedPhieu selected
                JOIN dbo.DOI_TRA_PHOI_LOI phieu ON phieu.Id=selected.Id
                JOIN dbo.DOI_TRA_PHOI_LOI_NHOM nhom ON nhom.Id=phieu.NhomPhieuId
                JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId=phieu.Id
                OUTER APPLY(SELECT TOP (1) contractor.Ma_NhaThau AS SxbtUnitCode
                    FROM TAG_QLSX.dbo.KeHoachSanXuat productionPlan
                    JOIN TAG_QTKD.dbo.DM_NhaThau contractor
                      ON contractor.ID_BoPhan=productionPlan.ID_BoPhan
                    WHERE productionPlan.ID_KeHoachSanXuat=TRY_CONVERT(INT,planRow.PlanID)) sxbtUnit
                OUTER APPLY (
                    SELECT MAX(lotRow.So_LoSanXuat) AS ExpectedProductionLot
                    FROM TAG_QLSX.dbo.KeHoachSanXuat_SanPham planProduct
                    JOIN TAG_QTKD.dbo.DonHang_LoSanXuat lotRow
                      ON lotRow.ID_DonHang_LoSanXuat=planProduct.ID_DonHang_LoSanXuat
                     AND lotRow.TonTai=1
                    WHERE planProduct.ID_KeHoachSanXuat=TRY_CONVERT(INT,planRow.PlanID)
                ) productionLot
                ORDER BY phieu.NgayLap,phieu.Id;

                SELECT phoiRow.*,
                    JSON_QUERY((
                        SELECT traceRow.*
                        FROM dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN traceRow
                        WHERE traceRow.PhoiId=phoiRow.Id
                        ORDER BY traceRow.SortOrder,traceRow.Id
                        FOR JSON PATH
                    )) AS IssueTraceabilitiesJson
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

                SELECT quotaRow.PhieuId,quotaRow.SourceVatTuId,quotaRow.SoLuongBoLoiSnapshot,
                    quotaRow.DinhMuc,quotaRow.SoLuongDoiTra,quotaRow.SourceDonViTinhId,
                    quotaRow.TenDonViTinh
                FROM #SelectedPhieu selected
                JOIN dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC quotaRow
                  ON quotaRow.PhieuId=selected.Id
                ORDER BY quotaRow.PhieuId,quotaRow.MaVatTu,quotaRow.SourceVatTuId;

                SELECT receiptLink.PhieuId,receiptLink.SoPhieuNhapBtp,receiptLink.SoLuongBtpLoi,
                    receiptLink.SourceKhoNhapId,warehouse.Ten_Kho AS TenKhoNhap,
                    receiptLink.SourceQuyTrinhSanXuatId,
                    processRow.KyHieu_QuyTrinhSanXuat AS MaQuyTrinhSanXuat,
                    processRow.Ten_QuyTrinhSanXuat,
                    receiptLink.TrangThai,receiptLink.CreatedAt,receipt.TrangThai AS ErpTrangThai,
                    orderProduct.ItemCode AS MaBtp,orderProduct.Ten_SanPham AS TenBtp,
                    productionLot.So_LoSanXuat AS SoLoSanXuat
                FROM #SelectedPhieu selected
                JOIN dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP receiptLink
                  ON receiptLink.PhieuId=selected.Id
                LEFT JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt
                  ON receipt.ID_PhieuNhapBTP=receiptLink.SourcePhieuNhapBtpId
                LEFT JOIN TAG_QTKD.dbo.PhieuNhapBTP_ChiTiet receiptDetail
                  ON receiptDetail.ID_PhieuNhapBTP=receipt.ID_PhieuNhapBTP
                LEFT JOIN TAG_QTKD.dbo.DonHang_SanPham orderProduct
                  ON orderProduct.ID_DonHang_SanPham=receiptDetail.ID_DonHang_SanPham
                LEFT JOIN TAG_QTKD.dbo.DonHang_LoSanXuat productionLot
                  ON productionLot.ID_DonHang_LoSanXuat=receiptDetail.ID_DonHang_LoSanXuat
                LEFT JOIN TAG_QTKD.dbo.DM_Kho warehouse ON warehouse.ID_Kho=receiptLink.SourceKhoNhapId
                LEFT JOIN TAG_QTKD.dbo.DM_QuyTrinhSanXuat processRow
                  ON processRow.ID_QuyTrinhSanXuat=receiptLink.SourceQuyTrinhSanXuatId
                ORDER BY receiptLink.PhieuId,
                    CASE WHEN receiptLink.TrangThai=N'ACTIVE' THEN 0 ELSE 1 END,
                    receiptLink.CreatedAt DESC;
            `);
        const tickets = result.recordsets[0] || [];
        const defects = result.recordsets[2] || [];
        const phoiItems = (result.recordsets[1] || []).map((item) => {
            let issueTraceabilities = [];
            try { issueTraceabilities = JSON.parse(item.IssueTraceabilitiesJson || '[]'); } catch { issueTraceabilities = []; }
            return {
                ...item,
                issueTraceabilities,
                defects: defects.filter((defect) => Number(defect.PhoiId) === Number(item.Id))
            };
        });
        res.json(encodeBinary({
            tickets,
            phoiItems,
            defectGroups: result.recordsets[3] || [],
            dinhMucItems: result.recordsets[4] || [],
            phieuNhapBtpItems: result.recordsets[5] || []
        }));
    } catch (error) {
        console.error('DoiTraPhoiLoi summary preview error:', error);
        const number = Number(error?.number || error?.originalError?.info?.number);
        res.status(number >= 52030 && number <= 52031 ? 409 : 500)
            .json({ message: errorMessage(error, 'Không tạo được dữ liệu xem trước tổng hợp') });
    }
});

router.post('/summary-export', authorizeDoiTraAccess, async (req, res) => {
    const phieuIds = [...new Set((Array.isArray(req.body?.phieuIds) ? req.body.phieuIds : [])
        .map(positiveId).filter(Boolean))];
    if (!phieuIds.length || phieuIds.length > 100) {
        return res.status(400).json({ message: 'Vui lòng chọn từ 1 đến 100 phiếu để xuất Excel' });
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
                    THROW 52031, N'Không thể xuất phiếu đã hủy.', 1;

                SELECT phoiRow.Id AS PhoiId,phieu.Id AS PhieuId,nhom.SoPhieu,
                    phieu.SoPhieu AS SoPhieuKeHoach,phieu.ThuTuKeHoach,phieu.NgayLap,
                    planRow.PlanID,planRow.PlanNo,planRow.OrderCode,planRow.ProductCode,planRow.ProductName,
                    planRow.OperationCode,planRow.OperationName,planRow.DepartmentCode,planRow.DepartmentName,
                    planRow.UnitCode,planRow.UnitName,sxbtUnit.SxbtUnitCode,
                    productionLot.ExpectedProductionLot,phoiRow.*,
                    quota.SoLuongBoLoiSnapshot,quota.SoLuongDoiTra,quota.TenDonViTinh,
                    JSON_QUERY((
                        SELECT traceRow.*
                        FROM dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN traceRow
                        WHERE traceRow.PhoiId=phoiRow.Id
                        ORDER BY traceRow.SortOrder,traceRow.Id
                        FOR JSON PATH
                    )) AS IssueTraceabilitiesJson
                FROM #SelectedPhieu selected
                JOIN dbo.DOI_TRA_PHOI_LOI phieu ON phieu.Id=selected.Id
                JOIN dbo.DOI_TRA_PHOI_LOI_NHOM nhom ON nhom.Id=phieu.NhomPhieuId
                JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId=phieu.Id
                JOIN dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow ON phoiRow.PhieuId=phieu.Id
                LEFT JOIN dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC quota
                  ON quota.PhieuId=phieu.Id AND quota.SourceVatTuId=phoiRow.SourceVatTuId
                OUTER APPLY(SELECT TOP (1) contractor.Ma_NhaThau AS SxbtUnitCode
                    FROM TAG_QLSX.dbo.KeHoachSanXuat productionPlan
                    JOIN TAG_QTKD.dbo.DM_NhaThau contractor
                      ON contractor.ID_BoPhan=productionPlan.ID_BoPhan
                    WHERE productionPlan.ID_KeHoachSanXuat=TRY_CONVERT(INT,planRow.PlanID)) sxbtUnit
                OUTER APPLY (
                    SELECT MAX(lotRow.So_LoSanXuat) AS ExpectedProductionLot
                    FROM TAG_QLSX.dbo.KeHoachSanXuat_SanPham planProduct
                    JOIN TAG_QTKD.dbo.DonHang_LoSanXuat lotRow
                      ON lotRow.ID_DonHang_LoSanXuat=planProduct.ID_DonHang_LoSanXuat
                     AND lotRow.TonTai=1
                    WHERE planProduct.ID_KeHoachSanXuat=TRY_CONVERT(INT,planRow.PlanID)
                ) productionLot
                ORDER BY phieu.NgayLap,phieu.Id,phoiRow.SortOrder,phoiRow.Id;

                SELECT defectRow.*
                FROM #SelectedPhieu selected
                JOIN dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow ON phoiRow.PhieuId=selected.Id
                JOIN dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT defectRow ON defectRow.PhoiId=phoiRow.Id
                ORDER BY phoiRow.PhieuId,phoiRow.SortOrder,defectRow.SortOrder,defectRow.Id;

                SELECT nhom.SoPhieu,phieu.SoPhieu AS SoPhieuKeHoach,phieu.ThuTuKeHoach,
                    receiptLink.SoPhieuNhapBtp,receiptLink.SoLuongBtpLoi,
                    warehouse.Ten_Kho AS TenKhoNhap,processRow.Ten_QuyTrinhSanXuat,
                    receiptLink.TrangThai,receiptLink.CreatedAt,receipt.TrangThai AS ErpTrangThai,
                    orderProduct.ItemCode AS MaBtp,orderProduct.Ten_SanPham AS TenBtp,
                    productionLot.So_LoSanXuat AS SoLoSanXuat
                FROM #SelectedPhieu selected
                JOIN dbo.DOI_TRA_PHOI_LOI phieu ON phieu.Id=selected.Id
                JOIN dbo.DOI_TRA_PHOI_LOI_NHOM nhom ON nhom.Id=phieu.NhomPhieuId
                JOIN dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP receiptLink ON receiptLink.PhieuId=selected.Id
                LEFT JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt ON receipt.ID_PhieuNhapBTP=receiptLink.SourcePhieuNhapBtpId
                LEFT JOIN TAG_QTKD.dbo.PhieuNhapBTP_ChiTiet receiptDetail ON receiptDetail.ID_PhieuNhapBTP=receipt.ID_PhieuNhapBTP
                LEFT JOIN TAG_QTKD.dbo.DonHang_SanPham orderProduct ON orderProduct.ID_DonHang_SanPham=receiptDetail.ID_DonHang_SanPham
                LEFT JOIN TAG_QTKD.dbo.DonHang_LoSanXuat productionLot ON productionLot.ID_DonHang_LoSanXuat=receiptDetail.ID_DonHang_LoSanXuat
                LEFT JOIN TAG_QTKD.dbo.DM_Kho warehouse ON warehouse.ID_Kho=receiptLink.SourceKhoNhapId
                LEFT JOIN TAG_QTKD.dbo.DM_QuyTrinhSanXuat processRow ON processRow.ID_QuyTrinhSanXuat=receiptLink.SourceQuyTrinhSanXuatId
                ORDER BY phieu.NgayLap,phieu.Id,receiptLink.CreatedAt,receiptLink.Id;
            `);
        const buffer = writeDoiTraSummaryExcel({
            items: result.recordsets[0] || [],
            defects: result.recordsets[1] || [],
            receipts: result.recordsets[2] || []
        });
        const suffix = phieuIds.length === 1 ? `-${phieuIds[0]}` : `-${phieuIds.length}-phieu`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="tong-hop-doi-phoi${suffix}.xlsx"`);
        res.send(buffer);
    } catch (error) {
        console.error('DoiTraPhoiLoi summary export error:', error);
        const number = Number(error?.number || error?.originalError?.info?.number);
        res.status(number >= 52030 && number <= 52031 ? 409 : 500)
            .json({ message: errorMessage(error, 'Không xuất được Excel tổng hợp đổi phôi') });
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
                    phieu.NhomPhieuId,phieu.ThuTuKeHoach,nhom.SoPhieu AS SoPhieuNhom,nhom.KphPhieuId,
                    ROW_NUMBER() OVER(PARTITION BY phieu.NhomPhieuId ORDER BY phieu.ThuTuKeHoach,phieu.Id) AS ThuTuHienThi,
                    batchCount.SoKeHoach,
                    phieu.NguoiLapId, phieu.BoPhanKcsId, phieu.CreatedAt, phieu.UpdatedAt,
                    ISNULL(phieu.ReviewRound,1) AS ReviewRound,
                    COALESCE(phieu.DinhMucTrangThai,
                        CASE WHEN phieu.B7ConfirmedAt IS NULL THEN N'CHUA_NHAP' ELSE N'DA_XAC_NHAN' END
                    ) AS DinhMucTrangThai,
                    phieu.B7ConfirmedAt,
                    COALESCE(NULLIF(creator.FullName, N''), creator.Username) AS TenNguoiLap,
                    COALESCE(NULLIF(b7Actor.FullName, N''), b7Actor.Username) AS TenB7XacNhan,
                    receiptLink.SoPhieuNhapBtp,receiptLink.WarehouseConfirmedAt,
                    receiptLink.StockCardRecordedAt,receiptLink.PhieuNhapErpTrangThai,
                    receiptLink.TenKhoXacNhan,receiptLink.TenNguoiGhiTheKho,
                    department.MaBoPhan AS MaBoPhanKcs,
                    department.TenBoPhan AS TenBoPhanKcs,
                    planRow.PlanSelectKey, planRow.PlanID, planRow.PlanNo,
                    planRow.OrderCode, planRow.ProductCode, planRow.ProductName,
                    planRow.OperationCode, planRow.OperationName,
                    planRow.SourceQuyTrinhSanXuatId,planRow.PhoiSelectionMode,
                    planRow.BtpStageSuffix,planRow.RequiresB7,planRow.RequireLenhXuatVatTu,
                    planRow.DepartmentCode, planRow.DepartmentName,
                    planRow.UnitCode, planRow.UnitName, sxbtUnit.SxbtUnitCode, planRow.PlanDate,
                    planRow.PlanQty, planRow.Uom, planRow.ERPPlanStatus
                FROM dbo.DOI_TRA_PHOI_LOI phieu
                INNER JOIN dbo.DOI_TRA_PHOI_LOI_NHOM nhom ON nhom.Id=phieu.NhomPhieuId
                CROSS APPLY(SELECT COUNT(*) AS SoKeHoach FROM dbo.DOI_TRA_PHOI_LOI child
                    WHERE child.NhomPhieuId=phieu.NhomPhieuId) batchCount
                INNER JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId = phieu.Id
                OUTER APPLY(SELECT TOP (1) contractor.Ma_NhaThau AS SxbtUnitCode
                    FROM TAG_QLSX.dbo.KeHoachSanXuat productionPlan
                    JOIN TAG_QTKD.dbo.DM_NhaThau contractor
                      ON contractor.ID_BoPhan=productionPlan.ID_BoPhan
                    WHERE productionPlan.ID_KeHoachSanXuat=TRY_CONVERT(INT,planRow.PlanID)) sxbtUnit
                LEFT JOIN dbo.USERS creator ON creator.Id = phieu.NguoiLapId
                LEFT JOIN dbo.USERS b7Actor ON b7Actor.Id = phieu.B7ConfirmedBy
                OUTER APPLY(SELECT
                    STUFF((SELECT N', '+activeLink.SoPhieuNhapBtp
                        FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP activeLink
                        JOIN TAG_QTKD.dbo.PhieuNhapBTP activeReceipt
                          ON activeReceipt.ID_PhieuNhapBTP=activeLink.SourcePhieuNhapBtpId
                        WHERE activeLink.PhieuId=phieu.Id AND activeLink.TrangThai=N'ACTIVE'
                          AND activeReceipt.TonTai=1
                        ORDER BY activeLink.Id
                        FOR XML PATH(N''),TYPE).value(N'.',N'nvarchar(max)'),1,2,N'') AS SoPhieuNhapBtp,
                    CASE WHEN EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP activeLink
                            JOIN TAG_QTKD.dbo.PhieuNhapBTP activeReceipt
                              ON activeReceipt.ID_PhieuNhapBTP=activeLink.SourcePhieuNhapBtpId
                            WHERE activeLink.PhieuId=phieu.Id AND activeLink.TrangThai=N'ACTIVE'
                              AND activeReceipt.TonTai=1)
                        AND NOT EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP activeLink
                            JOIN TAG_QTKD.dbo.PhieuNhapBTP activeReceipt
                              ON activeReceipt.ID_PhieuNhapBTP=activeLink.SourcePhieuNhapBtpId
                            WHERE activeLink.PhieuId=phieu.Id AND activeLink.TrangThai=N'ACTIVE'
                              AND activeReceipt.TonTai=1 AND activeReceipt.TrangThai<>5)
                        THEN CONVERT(TINYINT,5)
                        WHEN NOT EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP activeLink
                            JOIN TAG_QTKD.dbo.PhieuNhapBTP activeReceipt
                              ON activeReceipt.ID_PhieuNhapBTP=activeLink.SourcePhieuNhapBtpId
                            WHERE activeLink.PhieuId=phieu.Id AND activeLink.TrangThai=N'ACTIVE'
                              AND activeReceipt.TonTai=1 AND activeReceipt.TrangThai NOT IN(4,5))
                         AND EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP activeLink
                            JOIN TAG_QTKD.dbo.PhieuNhapBTP activeReceipt
                              ON activeReceipt.ID_PhieuNhapBTP=activeLink.SourcePhieuNhapBtpId
                            WHERE activeLink.PhieuId=phieu.Id AND activeLink.TrangThai=N'ACTIVE'
                              AND activeReceipt.TonTai=1 AND activeReceipt.TrangThai=4)
                        THEN CONVERT(TINYINT,4) ELSE CONVERT(TINYINT,0) END AS PhieuNhapErpTrangThai,
                    CASE WHEN NOT EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP activeLink
                            JOIN TAG_QTKD.dbo.PhieuNhapBTP activeReceipt
                              ON activeReceipt.ID_PhieuNhapBTP=activeLink.SourcePhieuNhapBtpId
                            WHERE activeLink.PhieuId=phieu.Id AND activeLink.TrangThai=N'ACTIVE'
                              AND activeReceipt.TonTai=1 AND activeLink.WarehouseConfirmedAt IS NULL)
                        THEN (SELECT MAX(activeLink.WarehouseConfirmedAt)
                            FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP activeLink
                            WHERE activeLink.PhieuId=phieu.Id AND activeLink.TrangThai=N'ACTIVE') END AS WarehouseConfirmedAt,
                    STUFF((SELECT N', '+COALESCE(NULLIF(warehouseActor.FullName,N''),warehouseActor.Username)
                        FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP activeLink
                        JOIN dbo.USERS warehouseActor ON warehouseActor.Id=activeLink.WarehouseConfirmedBy
                        WHERE activeLink.PhieuId=phieu.Id AND activeLink.TrangThai=N'ACTIVE'
                        ORDER BY activeLink.Id
                        FOR XML PATH(N''),TYPE).value(N'.',N'nvarchar(max)'),1,2,N'') AS TenKhoXacNhan,
                    (SELECT MAX(activeLink.StockCardRecordedAt)
                        FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP activeLink
                        WHERE activeLink.PhieuId=phieu.Id AND activeLink.TrangThai=N'ACTIVE') AS StockCardRecordedAt,
                    STUFF((SELECT N', '+COALESCE(NULLIF(stockActor.FullName,N''),stockActor.Username)
                        FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP activeLink
                        JOIN dbo.USERS stockActor ON stockActor.Id=activeLink.StockCardRecordedBy
                        WHERE activeLink.PhieuId=phieu.Id AND activeLink.TrangThai=N'ACTIVE'
                        ORDER BY activeLink.Id
                        FOR XML PATH(N''),TYPE).value(N'.',N'nvarchar(max)'),1,2,N'') AS TenNguoiGhiTheKho) receiptLink
                LEFT JOIN dbo.DM_BO_PHAN department ON department.Id = phieu.BoPhanKcsId
                WHERE (@Status IS NULL OR phieu.TrangThai = @Status)
                  AND (@FromDate IS NULL OR phieu.NgayLap >= @FromDate)
                  AND (@ToDate IS NULL OR phieu.NgayLap <= @ToDate)
                  AND (
                    @Keyword IS NULL
                    OR phieu.SoPhieu LIKE N'%' + @Keyword + N'%'
                    OR nhom.SoPhieu LIKE N'%' + @Keyword + N'%'
                    OR planRow.PlanNo LIKE N'%' + @Keyword + N'%'
                    OR planRow.OrderCode LIKE N'%' + @Keyword + N'%'
                    OR planRow.ProductCode LIKE N'%' + @Keyword + N'%'
                    OR planRow.ProductName LIKE N'%' + @Keyword + N'%'
                    OR planRow.DepartmentName LIKE N'%' + @Keyword + N'%'
                  )
                ORDER BY nhom.NgayLap DESC,nhom.Id DESC,phieu.ThuTuKeHoach,phieu.Id;
            `);
        const rows = result.recordset || [];
        const phieuIds = [...new Set(rows.map((item) => Number(item.KphPhieuId || item.Id))
            .filter((id) => Number.isInteger(id) && id > 0))];
        if (!phieuIds.length) return res.json([]);

        const opinionResult = await pool.request()
            .input('PhieuIdsJson', sql.NVarChar(sql.MAX), JSON.stringify(phieuIds))
            .query(`
                SELECT opinion.PhieuId,opinion.BoPhanId,
                    COALESCE(NULLIF(opinion.MaBoPhan,N''),department.MaBoPhan) AS MaBoPhan,
                    COALESCE(NULLIF(opinion.TenBoPhan,N''),department.TenBoPhan) AS TenBoPhan,
                    CASE WHEN ISNULL(opinion.ConfirmedReviewRound,0)=ISNULL(phieu.ReviewRound,1)
                        THEN 1 ELSE 0 END AS DaXacNhan
                FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN opinion
                JOIN dbo.DOI_TRA_PHOI_LOI phieu ON phieu.Id=opinion.PhieuId
                LEFT JOIN dbo.DM_BO_PHAN department ON department.Id=opinion.BoPhanId
                JOIN OPENJSON(@PhieuIdsJson) WITH (Id INT '$') selected ON selected.Id=opinion.PhieuId
                WHERE opinion.IsActive=1
                ORDER BY opinion.PhieuId,opinion.SortOrder,opinion.Id;
            `);
        const progressByPhieu = new Map();
        for (const opinion of opinionResult.recordset || []) {
            const phieuId = Number(opinion.PhieuId);
            const progress = progressByPhieu.get(phieuId) || { departments: [], pending: [], done: 0 };
            const department = {
                id: Number(opinion.BoPhanId),
                maBoPhan: opinion.MaBoPhan || null,
                tenBoPhan: opinion.TenBoPhan || null,
                daXacNhan: Number(opinion.DaXacNhan) === 1
            };
            progress.departments.push(department);
            if (department.daXacNhan) progress.done += 1;
            else progress.pending.push(department);
            progressByPhieu.set(phieuId, progress);
        }
        res.json(encodeBinary(rows.map((item) => {
            const progress = progressByPhieu.get(Number(item.KphPhieuId || item.Id)) || { departments: [], pending: [], done: 0 };
            return {
                ...item,
                SoBoPhan: progress.departments.length,
                DaCoYKien: progress.done,
                OpinionDepartments: progress.departments,
                BoPhanChuaXacNhanText: progress.pending
                    .map((department) => department.tenBoPhan || department.maBoPhan || `Bộ phận #${department.id}`)
                    .join(', ') || null
            };
        })));
    } catch (error) {
        console.error('DoiTraPhoiLoi list error:', error);
        res.status(500).json({ message: errorMessage(error, 'Không tải được danh sách phiếu đổi trả phôi lỗi') });
    }
});

router.post('/', authorize('THUC_HIEN_KIEM'), async (req, res) => {
    const planSelectKeys = normalizePlanSelectKeys(req.body?.planSelectKeys, req.body?.planSelectKey);
    if (!planSelectKeys.length) {
        return res.status(400).json({ message: 'Vui lòng chọn ít nhất một kế hoạch sản xuất hợp lệ' });
    }

    let transaction;
    let transactionStarted = false;
    try {
        const pool = await poolPromise;
        const plans = await Promise.all(planSelectKeys.map((key) => loadPlanDetail(pool, key)));
        if (plans.some((plan) => !plan)) {
            return res.status(404).json({ message: 'Có kế hoạch sản xuất không còn tồn tại' });
        }

        const userId = userIdOf(req);
        if (!userId) return res.status(401).json({ message: 'Không xác định được người lập phiếu' });

        transaction = new sql.Transaction(pool);
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
        transactionStarted = true;
        const batchResult = await new sql.Request(transaction)
            .input('NguoiLapId', sql.Int, userId)
            .query(`
                DECLARE @LockResult INT;
                DECLARE @Prefix NVARCHAR(30) = N'DTP-' + CONVERT(CHAR(6), GETDATE(), 12) + N'-';
                DECLARE @NextNumber INT;
                DECLARE @SoPhieu NVARCHAR(50);
                EXEC @LockResult = sys.sp_getapplock
                    @Resource = N'DOI_TRA_PHOI_LOI_NHOM_NUMBER',
                    @LockMode = N'Exclusive',
                    @LockOwner = N'Transaction',
                    @LockTimeout = 10000;
                IF @LockResult < 0 THROW 52001, N'Không thể cấp số phiếu. Vui lòng thử lại.', 1;

                SELECT @NextNumber = ISNULL(MAX(TRY_CONVERT(INT, SUBSTRING(SoPhieu, LEN(@Prefix) + 1, 20))), 0) + 1
                FROM dbo.DOI_TRA_PHOI_LOI_NHOM WITH (UPDLOCK, HOLDLOCK)
                WHERE SoPhieu LIKE @Prefix + N'%';
                SET @SoPhieu = @Prefix + CASE
                    WHEN @NextNumber < 1000 THEN RIGHT(N'000' + CONVERT(NVARCHAR(20), @NextNumber), 3)
                    ELSE CONVERT(NVARCHAR(20), @NextNumber)
                END;
                INSERT dbo.DOI_TRA_PHOI_LOI_NHOM(SoPhieu,NgayLap,NguoiLapId)
                VALUES(@SoPhieu,CONVERT(date,GETDATE()),@NguoiLapId);
                SELECT SCOPE_IDENTITY() AS NhomPhieuId,@SoPhieu AS SoPhieu;
            `);
        const batch = batchResult.recordset[0];
        const children = [];
        for (let index = 0; index < plans.length; index += 1) {
            const plan = plans[index];
            const childNumber = childTicketNumber(batch.SoPhieu, index, plans.length);
            const created = await new sql.Request(transaction)
                .input('NhomPhieuId', sql.Int, batch.NhomPhieuId)
                .input('ThuTuKeHoach', sql.Int, index + 1)
                .input('SoPhieu', sql.NVarChar(50), childNumber)
                .input('NguoiLapId', sql.Int, userId)
                .input('BoPhanKcsId', sql.Int, positiveId(req.user?.boPhanId))
                .input('PlanSelectKey', sql.VarChar(300), planSelectKeys[index])
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
                    DECLARE @PhieuId INT,@WorkflowId INT,@CurrentStepId INT,@DinhMucStepId INT;
                    DECLARE @ProcessId TINYINT,@CurrentOperationCode NVARCHAR(100);
                    DECLARE @SelectionMode NVARCHAR(30)=N'COMPONENT',@BtpSuffix NVARCHAR(20)=NULL;
                    DECLARE @RequiresB7 BIT=1,@RequireLenhXuatVatTu BIT=1;
                    SELECT @ProcessId=productionPlan.ID_QuyTrinhSanXuat,
                        @CurrentOperationCode=processRow.KyHieu_QuyTrinhSanXuat
                    FROM TAG_QLSX.dbo.KeHoachSanXuat productionPlan
                    JOIN TAG_QTKD.dbo.DM_QuyTrinhSanXuat processRow
                      ON processRow.ID_QuyTrinhSanXuat=productionPlan.ID_QuyTrinhSanXuat
                    WHERE productionPlan.ID_KeHoachSanXuat=TRY_CONVERT(INT,@PlanID) AND productionPlan.TonTai=1;
                    IF @ProcessId IS NULL THROW 52004,N'Không xác định được quy trình sản xuất hiện tại của kế hoạch.',1;
                    IF UPPER(LTRIM(RTRIM(ISNULL(@OperationCode,N''))))
                        <>UPPER(LTRIM(RTRIM(ISNULL(@CurrentOperationCode,N''))))
                        THROW 52005,N'Công đoạn của kế hoạch đã thay đổi. Vui lòng tải lại kế hoạch.',1;
                    SELECT @SelectionMode=SelectionMode,@BtpSuffix=BtpSuffix,
                        @RequiresB7=RequiresB7,@RequireLenhXuatVatTu=RequireLenhXuatVatTu
                    FROM dbo.DOI_TRA_PHOI_LOI_CONG_DOAN_CONFIG
                    WHERE SourceQuyTrinhSanXuatId=@ProcessId AND IsActive=1;
                    SELECT @WorkflowId=Id FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW
                    WHERE EntityType=N'PHIEU_KIEM' AND IsActive=1;
                    SELECT @CurrentStepId=Id FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP
                    WHERE WorkflowId=@WorkflowId AND SortOrder=(SELECT MIN(SortOrder)
                        FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP WHERE WorkflowId=@WorkflowId);
                    IF @WorkflowId IS NULL OR @CurrentStepId IS NULL
                        THROW 52003,N'Chưa cấu hình workflow đổi trả phôi lỗi đang hoạt động.',1;
                    SELECT @DinhMucStepId=Id FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP
                    WHERE WorkflowId=@WorkflowId AND StepCode=N'B7_DINH_MUC';
                    INSERT dbo.DOI_TRA_PHOI_LOI(
                        SoPhieu,TrangThai,NgayLap,NguoiLapId,BoPhanKcsId,WorkflowId,CurrentStepId,
                        DinhMucTrangThai,DinhMucCurrentStepId,NhomPhieuId,ThuTuKeHoach
                    ) VALUES(
                        @SoPhieu,N'TAO_MOI',CONVERT(date,GETDATE()),@NguoiLapId,@BoPhanKcsId,@WorkflowId,@CurrentStepId,
                        CASE WHEN @RequiresB7=1 THEN N'CHUA_NHAP' ELSE N'KHONG_AP_DUNG' END,
                        CASE WHEN @RequiresB7=1 THEN @DinhMucStepId ELSE NULL END,@NhomPhieuId,@ThuTuKeHoach
                    );
                    SET @PhieuId=SCOPE_IDENTITY();
                    INSERT dbo.DOI_TRA_PHOI_LOI_PLAN(
                        PhieuId,PlanSelectKey,PlanID,PlanNo,OrderCode,ProductCode,ProductName,
                        OperationCode,OperationName,DepartmentCode,DepartmentName,
                        UnitCode,UnitName,DepartmentShortName,PlanDate,PlanQty,Uom,ERPPlanStatus,
                        SourceQuyTrinhSanXuatId,PhoiSelectionMode,BtpStageSuffix,RequiresB7,RequireLenhXuatVatTu
                    ) VALUES(
                        @PhieuId,@PlanSelectKey,@PlanID,@PlanNo,@OrderCode,@ProductCode,@ProductName,
                        @OperationCode,@OperationName,@DepartmentCode,@DepartmentName,
                        @UnitCode,@UnitName,@DepartmentShortName,@PlanDate,@PlanQty,@Uom,@ERPPlanStatus,
                        @ProcessId,@SelectionMode,@BtpSuffix,@RequiresB7,@RequireLenhXuatVatTu
                    );
                    INSERT dbo.DOI_TRA_PHOI_LOI_HISTORY(PhieuId,ActionCode,FromStatus,ToStatus,ActionBy,GhiChu)
                    VALUES(@PhieuId,N'CREATE_DRAFT',NULL,N'TAO_MOI',@NguoiLapId,
                        N'Tạo kế hoạch con trong phiếu nhóm '+CONVERT(NVARCHAR(50),@NhomPhieuId));
                    SELECT @PhieuId AS Id,@SoPhieu AS ChildSoPhieu,@ThuTuKeHoach AS ThuTuKeHoach;
                `);
            children.push(created.recordset[0]);
        }
        await new sql.Request(transaction)
            .input('NhomPhieuId', sql.Int, batch.NhomPhieuId)
            .input('KphPhieuId', sql.Int, children[0].Id)
            .query(`UPDATE dbo.DOI_TRA_PHOI_LOI_NHOM
                SET KphPhieuId=@KphPhieuId,UpdatedAt=SYSDATETIME()
                WHERE Id=@NhomPhieuId AND KphPhieuId IS NULL;`);
        await transaction.commit();
        transactionStarted = false;
        res.status(201).json({
            Id: children[0].Id,
            NhomPhieuId: batch.NhomPhieuId,
            SoPhieu: batch.SoPhieu,
            children
        });
    } catch (error) {
        if (transaction && transactionStarted) {
            try { await transaction.rollback(); } catch (rollbackError) { console.error('DoiTraPhoiLoi rollback error:', rollbackError); }
        }
        console.error('DoiTraPhoiLoi create error:', error);
        const number = Number(error?.number || error?.originalError?.info?.number);
        const duplicate = [2601, 2627].includes(number);
        const business = number >= 52003 && number <= 52005;
        res.status(duplicate ? 409 : business ? 422 : 500).json({ message: errorMessage(error, 'Không tạo được phiếu đổi trả phôi lỗi') });
    }
});

router.post('/:id/manual-phoi', authorize('THUC_HIEN_KIEM'), async (req, res) => {
    const phieuId = positiveId(req.params.id);
    const sourceVatTuId = positiveId(req.body?.sourceVatTuId);
    const tenLoaiPhoi = trimOrNull(req.body?.tenLoaiPhoi);
    const daoChat = trimOrNull(req.body?.daoChat);
    const soPhoi = trimOrNull(req.body?.soPhoi) || '1';
    const kyHieu = trimOrNull(req.body?.kyHieu);
    if (!phieuId || !sourceVatTuId || !tenLoaiPhoi
        || tenLoaiPhoi.length > 200 || (daoChat?.length || 0) > 100
        || soPhoi.length > 30 || (kyHieu?.length || 0) > 50) {
        return res.status(400).json({ message: 'Thông tin phôi nhập tay không hợp lệ' });
    }
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('PhieuId', sql.Int, phieuId)
            .input('UserId', sql.Int, userIdOf(req))
            .input('IsAdmin', sql.Bit, isAdmin(req.user))
            .input('SourceVatTuId', sql.Int, sourceVatTuId)
            .input('TenLoaiPhoi', sql.NVarChar(200), tenLoaiPhoi)
            .input('DaoChat', sql.NVarChar(100), daoChat)
            .input('SoPhoi', sql.NVarChar(30), soPhoi)
            .input('KyHieu', sql.NVarChar(50), kyHieu)
            .query(`
                SET XACT_ABORT ON;
                BEGIN TRANSACTION;
                DECLARE @ProductCode NVARCHAR(100),@SelectionMode NVARCHAR(30),@ManualId INT;
                SELECT @ProductCode=planRow.ProductCode,@SelectionMode=planRow.PhoiSelectionMode
                FROM dbo.DOI_TRA_PHOI_LOI phieu WITH(UPDLOCK,HOLDLOCK)
                JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId=phieu.Id
                WHERE phieu.Id=@PhieuId AND phieu.TrangThai IN(N'TAO_MOI',N'TRA_LAI_KCS')
                  AND (@IsAdmin=1 OR phieu.NguoiLapId=@UserId);
                IF @ProductCode IS NULL
                    THROW 52015,N'Phiếu không còn ở bước KCS hoặc bạn không có quyền thêm phôi.',1;
                IF @SelectionMode<>N'COMPONENT'
                    THROW 52016,N'Công đoạn này chỉ cho phép chọn BTP theo cấu hình, không áp dụng phôi nhập tay.',1;
                IF (SELECT COUNT(*) FROM TAG_QTKD.dbo.DM_SanPham
                    WHERE LTRIM(RTRIM(ItemCode))=LTRIM(RTRIM(@ProductCode)) AND TonTai=1)<>1
                    THROW 52017,N'Không tìm thấy duy nhất sản phẩm ERP của kế hoạch.',1;
                IF NOT EXISTS(
                    SELECT 1 FROM TAG_QTKD.dbo.DM_SanPham product
                    JOIN TAG_Giang.dbo.DA_TruyNguyen_SanPham_LoiPhoi sourceRow
                      ON sourceRow.ID_SanPham=product.ID_SanPham AND sourceRow.ID_VatTu=@SourceVatTuId
                     AND ISNULL(sourceRow.TonTai,1)=1
                    JOIN TAG_QTKD.dbo.DM_VatTu material
                      ON material.ID_VatTu=sourceRow.ID_VatTu AND ISNULL(material.TonTai,1)=1
                    WHERE LTRIM(RTRIM(product.ItemCode))=LTRIM(RTRIM(@ProductCode)) AND product.TonTai=1
                ) THROW 52017,N'Vật tư đã chọn không thuộc danh sách phôi của sản phẩm kế hoạch.',1;

                SELECT TOP 1 @ManualId=Id
                FROM dbo.DM_PHOI_DOI_TRA_NHAP_TAY WITH(UPDLOCK,HOLDLOCK)
                WHERE LTRIM(RTRIM(ProductCode))=LTRIM(RTRIM(@ProductCode))
                  AND SourceVatTuId=@SourceVatTuId AND IsActive=1
                  AND UPPER(LTRIM(RTRIM(TenLoaiPhoi)))=UPPER(LTRIM(RTRIM(@TenLoaiPhoi)))
                  AND ISNULL(UPPER(LTRIM(RTRIM(DaoChat))),N'')=ISNULL(UPPER(LTRIM(RTRIM(@DaoChat))),N'')
                  AND ISNULL(UPPER(LTRIM(RTRIM(SoPhoi))),N'')=ISNULL(UPPER(LTRIM(RTRIM(@SoPhoi))),N'')
                  AND ISNULL(UPPER(LTRIM(RTRIM(KyHieu))),N'')=ISNULL(UPPER(LTRIM(RTRIM(@KyHieu))),N'');
                IF @ManualId IS NULL
                BEGIN
                    INSERT dbo.DM_PHOI_DOI_TRA_NHAP_TAY(
                        ProductCode,SourceVatTuId,MaVatTu,QuyCachVatTu,TenLoaiPhoi,
                        DaoChat,SoPhoi,KyHieu,CreatedBy
                    )
                    SELECT @ProductCode,material.ID_VatTu,material.Ma_VatTu,material.QuyCach,
                        @TenLoaiPhoi,@DaoChat,@SoPhoi,@KyHieu,@UserId
                    FROM TAG_QTKD.dbo.DM_VatTu material
                    WHERE material.ID_VatTu=@SourceVatTuId AND ISNULL(material.TonTai,1)=1;
                    SET @ManualId=SCOPE_IDENTITY();
                END;
                IF @ManualId IS NULL THROW 52017,N'Không tạo được phôi nhập tay từ vật tư đã chọn.',1;

                SELECT N'MANUAL' AS SourceType,manualRow.Id AS SourceId,
                    CAST(NULL AS INT) AS SourceLoiPhoiId,product.ID_SanPham AS SourceSanPhamId,
                    manualRow.SourceVatTuId,CAST(NULL AS INT) AS SourceCatalogProductId,
                    manualRow.Id AS SourceManualPhoiId,CAST(NULL AS UNIQUEIDENTIFIER) AS SourceGuid,
                    manualRow.ProductCode,manualRow.MaVatTu,manualRow.QuyCachVatTu,
                    manualRow.TenLoaiPhoi,manualRow.DaoChat,manualRow.SoPhoi,manualRow.KyHieu,
                    manualRow.MaVatTu AS SelectedItemCode,manualRow.TenLoaiPhoi AS SelectedItemName
                FROM dbo.DM_PHOI_DOI_TRA_NHAP_TAY manualRow
                CROSS JOIN TAG_QTKD.dbo.DM_SanPham product
                WHERE manualRow.Id=@ManualId
                  AND LTRIM(RTRIM(product.ItemCode))=LTRIM(RTRIM(manualRow.ProductCode)) AND product.TonTai=1;
                COMMIT;
            `);
        res.status(201).json(encodeBinary(result.recordset?.[0]));
    } catch (error) {
        console.error('DoiTraPhoiLoi create manual blank error:', error);
        const number = Number(error?.number || error?.originalError?.info?.number);
        res.status(number >= 52015 && number <= 52017 ? 422 : 500)
            .json({ message: errorMessage(error, 'Không tạo được phôi nhập tay') });
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
                DECLARE @ProductCode NVARCHAR(100),@PlanId INT,@SnapshotProcessId TINYINT,
                    @SelectionMode NVARCHAR(30),@BtpSuffix NVARCHAR(20),@CurrentProcessId TINYINT;
                SELECT @ProductCode=ProductCode,@PlanId=TRY_CONVERT(INT,PlanID),
                    @SnapshotProcessId=SourceQuyTrinhSanXuatId,
                    @SelectionMode=PhoiSelectionMode,@BtpSuffix=BtpStageSuffix
                FROM dbo.DOI_TRA_PHOI_LOI_PLAN
                WHERE PhieuId = @PhieuId;

                IF @ProductCode IS NULL
                    THROW 52010, N'Phiếu chưa có mã sản phẩm từ kế hoạch.', 1;

                IF (SELECT COUNT(*) FROM TAG_QTKD.dbo.DM_SanPham
                    WHERE LTRIM(RTRIM(ItemCode)) = LTRIM(RTRIM(@ProductCode)) AND TonTai = 1
                )<>1 THROW 52011, N'Không tìm thấy duy nhất sản phẩm còn hiệu lực tương ứng với kế hoạch.', 1;

                SELECT @CurrentProcessId=ID_QuyTrinhSanXuat
                FROM TAG_QLSX.dbo.KeHoachSanXuat
                WHERE ID_KeHoachSanXuat=@PlanId AND TonTai=1;
                IF @CurrentProcessId IS NULL OR @CurrentProcessId<>@SnapshotProcessId
                    THROW 52012,N'Quy trình của kế hoạch đã thay đổi. Vui lòng tạo lại phiếu.',1;

                IF @SelectionMode=N'PREVIOUS_STAGE_BTP'
                BEGIN
                    DECLARE @StageCode NVARCHAR(100)=@ProductCode+N'.'+@BtpSuffix;
                    IF (SELECT COUNT(*) FROM dbo.DM_SAN_PHAM
                        WHERE LTRIM(RTRIM(MaSanPham))=LTRIM(RTRIM(@StageCode)) AND TrangThai=1)<>1
                        THROW 52013,N'Không tìm thấy duy nhất BTP sau công đoạn trong danh mục nội bộ.',1;

                    SELECT N'BTP_STAGE' AS SourceType,catalog.Id AS SourceId,
                        CAST(NULL AS INT) AS SourceLoiPhoiId,product.ID_SanPham AS SourceSanPhamId,
                        CAST(NULL AS INT) AS SourceVatTuId,catalog.Id AS SourceCatalogProductId,
                        CAST(NULL AS INT) AS SourceManualPhoiId,
                        CAST(NULL AS UNIQUEIDENTIFIER) AS SourceGuid,@ProductCode AS ProductCode,
                        catalog.MaSanPham AS MaVatTu,N'BTP sau công đoạn May' AS QuyCachVatTu,
                        catalog.TenSanPham AS TenLoaiPhoi,CAST(NULL AS NVARCHAR(100)) AS DaoChat,
                        N'1' AS SoPhoi,CAST(NULL AS NVARCHAR(50)) AS KyHieu,
                        catalog.MaSanPham AS SelectedItemCode,catalog.TenSanPham AS SelectedItemName
                    FROM dbo.DM_SAN_PHAM catalog
                    CROSS JOIN TAG_QTKD.dbo.DM_SanPham product
                    WHERE LTRIM(RTRIM(catalog.MaSanPham))=LTRIM(RTRIM(@StageCode)) AND catalog.TrangThai=1
                      AND LTRIM(RTRIM(product.ItemCode))=LTRIM(RTRIM(@ProductCode)) AND product.TonTai=1;
                    RETURN;
                END;

                SELECT DISTINCT
                    N'COMPONENT' AS SourceType,sourceRow.ID_LoiPhoi AS SourceId,
                    sourceRow.ID_LoiPhoi AS SourceLoiPhoiId,
                    product.ID_SanPham AS SourceSanPhamId,
                    sourceRow.ID_VatTu AS SourceVatTuId,
                    CAST(NULL AS INT) AS SourceCatalogProductId,
                    CAST(NULL AS INT) AS SourceManualPhoiId,
                    sourceRow.GuID AS SourceGuid,
                    @ProductCode AS ProductCode,
                    material.Ma_VatTu AS MaVatTu,
                    material.QuyCach AS QuyCachVatTu,
                    sourceRow.Ten_loaiPhoi AS TenLoaiPhoi,
                    sourceRow.DaoChat,
                    sourceRow.So_phoi AS SoPhoi,
                    sourceRow.KyHieu,
                    material.Ma_VatTu AS SelectedItemCode,sourceRow.Ten_loaiPhoi AS SelectedItemName
                FROM TAG_QTKD.dbo.DM_SanPham product
                INNER JOIN TAG_Giang.dbo.DA_TruyNguyen_SanPham_LoiPhoi sourceRow
                    ON sourceRow.ID_SanPham = product.ID_SanPham
                INNER JOIN TAG_QTKD.dbo.DM_VatTu material
                    ON material.ID_VatTu = sourceRow.ID_VatTu
                WHERE LTRIM(RTRIM(product.ItemCode)) = LTRIM(RTRIM(@ProductCode))
                  AND product.TonTai = 1
                  AND ISNULL(sourceRow.TonTai, 1) = 1
                  AND ISNULL(material.TonTai, 1) = 1
                UNION ALL
                SELECT N'MANUAL',manualRow.Id,NULL,product.ID_SanPham,
                    manualRow.SourceVatTuId,NULL,manualRow.Id,NULL,@ProductCode,
                    manualRow.MaVatTu,manualRow.QuyCachVatTu,manualRow.TenLoaiPhoi,
                    manualRow.DaoChat,manualRow.SoPhoi,manualRow.KyHieu,
                    manualRow.MaVatTu,manualRow.TenLoaiPhoi
                FROM dbo.DM_PHOI_DOI_TRA_NHAP_TAY manualRow
                CROSS JOIN TAG_QTKD.dbo.DM_SanPham product
                WHERE LTRIM(RTRIM(manualRow.ProductCode))=LTRIM(RTRIM(@ProductCode))
                  AND manualRow.IsActive=1
                  AND LTRIM(RTRIM(product.ItemCode))=LTRIM(RTRIM(@ProductCode)) AND product.TonTai=1
                ORDER BY MaVatTu,TenLoaiPhoi,SoPhoi;
            `);
        const rows = result.recordset || [];
        if (!rows.length) return res.status(404).json({ message: 'Sản phẩm của kế hoạch chưa được khai báo danh sách phôi.' });
        const selectionMode = rows[0]?.SourceType === 'BTP_STAGE' ? 'PREVIOUS_STAGE_BTP' : 'COMPONENT';
        const materials = [];
        const byMaterial = new Map();
        rows.forEach((row) => {
            const key = row.SourceType === 'BTP_STAGE'
                ? `BTP_STAGE:${row.SourceCatalogProductId}` : `COMPONENT:${row.SourceVatTuId}`;
            if (!byMaterial.has(key)) {
                const material = {
                    SourceType: row.SourceType,
                    SourceId: row.SourceId,
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
        res.json(encodeBinary({ ProductCode: rows[0]?.ProductCode, selectionMode, materials }));
    } catch (error) {
        console.error('DoiTraPhoiLoi blank options error:', error);
        const business = Number(error?.number || error?.originalError?.info?.number) >= 52010
            && Number(error?.number || error?.originalError?.info?.number) <= 52013;
        res.status(business ? 422 : 500).json({ message: errorMessage(error, 'Không tải được danh sách phôi') });
    }
});

router.get('/:id/material-issue-options', authorize(VIEW_PERMISSIONS), async (req, res) => {
    const phieuId = positiveId(req.params.id);
    if (!phieuId) return res.status(400).json({ message: 'Mã phiếu không hợp lệ' });
    try {
        const pool = await poolPromise;
        const result = await pool.request().input('PhieuId', sql.Int, phieuId).query(`
            DECLARE @PlanId INT=(SELECT TRY_CONVERT(INT,PlanID)
                FROM dbo.DOI_TRA_PHOI_LOI_PLAN WHERE PhieuId=@PhieuId);
            IF @PlanId IS NULL THROW 52014,N'Phiếu chưa có kế hoạch ERP hợp lệ.',1;

            SELECT issue.ID_LenhXuatVT AS SourceLenhXuatVTId,
                LTRIM(RTRIM(issue.So_LenhXuatVT)) AS SoLenhXuatVT,
                issue.Ngay_LenhXuatVT AS NgayLenhXuatVT,issue.TrangThai,
                issue.ID_KhoXuat AS SourceKhoXuatId,warehouse.Ten_Kho AS TenKhoXuat
            FROM TAG_QTKD.dbo.LenhXuatVT issue
            LEFT JOIN TAG_QTKD.dbo.DM_Kho warehouse ON warehouse.ID_Kho=issue.ID_KhoXuat
            WHERE issue.ID_KeHoachSanXuat=@PlanId AND issue.TonTai=1
            ORDER BY issue.Ngay_LenhXuatVT DESC,issue.ID_LenhXuatVT DESC;
        `);
        res.json(encodeBinary(result.recordset || []));
    } catch (error) {
        console.error('DoiTraPhoiLoi material issue options error:', error);
        const number = Number(error?.number || error?.originalError?.info?.number);
        res.status(number === 52014 ? 422 : 500).json({
            message: errorMessage(error, 'Không tải được lệnh xuất vật tư của kế hoạch')
        });
    }
});

router.put('/:id/phoi', authorize('THUC_HIEN_KIEM'), async (req, res) => {
    const phieuId = positiveId(req.params.id);
    const rowVersion = rowVersionBuffer(req.body?.rowVersion);
    const items = normalizedPhoiItems(req.body?.items);
    const invalidItem = items.some((item) => !['COMPONENT', 'BTP_STAGE', 'MANUAL'].includes(item.sourceType)
        || !item.sourceId || !item.soLuongKiem
        || item.soLuongPhoiLoi == null || item.soLuongPhoiLoi > item.soLuongKiem
        || (item.lotSanXuat?.length || 0) > 100 || (item.lenhXuatVatTu?.length || 0) > 100
        || (item.dauTuan?.length || 0) > 100 || (item.toSanXuat?.length || 0) > 255
        || (item.congNhanSanXuat?.length || 0) > 1000
        || item.issueTraceabilities.some((trace) => !trace.manualLxvtKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trace.manualLxvtKey)
            || trace.manualLxvtKey.length > 36 || (trace.soLenhXuatVT?.length || 0) > 100
            || (trace.lotSanXuat?.length || 0) > 100 || (trace.dauTuan?.length || 0) > 100
            || (trace.toSanXuat?.length || 0) > 255 || (trace.congNhanSanXuat?.length || 0) > 1000)
        || item.defects.some((defect) => !defect.nhomLoiId || !defect.defectId
            || !defect.soLuongLoi || !defect.boPhanGayLoiSourceId
            || !['NOI_BO', 'TAG_SYSTEM', 'NHA_CUNG_CAP'].includes(defect.boPhanGayLoiSource)));
    if (!phieuId || !rowVersion || invalidItem) {
        return res.status(400).json({ message: 'Danh sách phôi, số lượng hoặc phiên bản dữ liệu không hợp lệ' });
    }
    const sourceIds = items.map((item) => `${item.sourceType}:${item.sourceId}`);
    if (new Set(sourceIds).size !== sourceIds.length
        || items.some((item) => new Set(item.issueTraceabilities.map((trace) => trace.manualLxvtKey)).size !== item.issueTraceabilities.length)
        || items.some((item) => {
            const issueNumbers = item.issueTraceabilities.map((trace) => trace.soLenhXuatVT?.toUpperCase()).filter(Boolean);
            return new Set(issueNumbers).size !== issueNumbers.length;
        })
        || items.some((item) => new Set(item.defects.map((defect) => `${defect.manualLxvtKey || ''}:${defect.defectId}:${defect.boPhanGayLoiSource}:${defect.boPhanGayLoiSourceId}`)).size !== item.defects.length)) {
        return res.status(400).json({ message: 'Danh sách phôi hoặc lỗi đang bị trùng' });
    }

    try {
        const pool = await poolPromise;
        const flattenedDefects = items.flatMap((item) => item.defects.map((defect) => ({
            sourceType: item.sourceType,
            sourceId: item.sourceId,
            ...defect
        })));
        const flattenedIssueTraceabilities = items.flatMap((item) => item.issueTraceabilities.map((trace) => ({
            sourceType: item.sourceType,
            sourceId: item.sourceId,
            ...trace
        })));
        const result = await pool.request()
            .input('PhieuId', sql.Int, phieuId)
            .input('UserId', sql.Int, userIdOf(req))
            .input('IsAdmin', sql.Bit, isAdmin(req.user))
            .input('RowVersion', sql.VarBinary(8), rowVersion)
            .input('ItemsJson', sql.NVarChar(sql.MAX), JSON.stringify(items))
            .input('DefectsJson', sql.NVarChar(sql.MAX), JSON.stringify(flattenedDefects))
            .input('IssueTraceabilitiesJson', sql.NVarChar(sql.MAX), JSON.stringify(flattenedIssueTraceabilities))
            .query(`
                SET XACT_ABORT ON;
                BEGIN TRANSACTION;

                DECLARE @ProductCode NVARCHAR(100), @ProductName NVARCHAR(500), @FromStatus NVARCHAR(40),
                    @PlanID VARCHAR(50), @ProductionLot NVARCHAR(100),@SelectionMode NVARCHAR(30),
                    @BtpSuffix NVARCHAR(20),@SnapshotProcessId TINYINT,@CurrentProcessId TINYINT,@RequireLxvt BIT;
                SELECT @FromStatus = phieu.TrangThai, @ProductCode = planRow.ProductCode,
                       @ProductName = planRow.ProductName, @PlanID = planRow.PlanID,
                       @SelectionMode=planRow.PhoiSelectionMode,@BtpSuffix=planRow.BtpStageSuffix,
                       @SnapshotProcessId=planRow.SourceQuyTrinhSanXuatId,@RequireLxvt=planRow.RequireLenhXuatVatTu
                FROM dbo.DOI_TRA_PHOI_LOI phieu WITH (UPDLOCK, HOLDLOCK)
                INNER JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId = phieu.Id
                WHERE phieu.Id = @PhieuId AND phieu.RowVersion = @RowVersion
                  AND phieu.TrangThai IN (N'TAO_MOI',N'TRA_LAI_KCS')
                  AND (@IsAdmin = 1 OR phieu.NguoiLapId = @UserId);

                IF @FromStatus IS NULL
                    THROW 52020, N'Phiếu đã thay đổi, không còn ở bước KCS hoặc bạn không có quyền sửa.', 1;

                SELECT @CurrentProcessId=ID_QuyTrinhSanXuat
                FROM TAG_QLSX.dbo.KeHoachSanXuat
                WHERE ID_KeHoachSanXuat=TRY_CONVERT(INT,@PlanID) AND TonTai=1;
                IF @CurrentProcessId IS NULL OR @CurrentProcessId<>@SnapshotProcessId
                    THROW 52027,N'Quy trình của kế hoạch đã thay đổi. Vui lòng tạo lại phiếu.',1;

                SELECT @ProductionLot=MAX(productionLot.So_LoSanXuat)
                FROM TAG_QLSX.dbo.KeHoachSanXuat_SanPham planProduct
                JOIN TAG_QTKD.dbo.DonHang_LoSanXuat productionLot
                  ON productionLot.ID_DonHang_LoSanXuat=planProduct.ID_DonHang_LoSanXuat
                 AND productionLot.TonTai=1
                WHERE planProduct.ID_KeHoachSanXuat=TRY_CONVERT(INT,@PlanID);

                IF EXISTS(
                    SELECT 1
                    FROM dbo.DOI_TRA_PHOI_LOI_LENH_XUAT_VT issueLink
                    JOIN TAG_QTKD.dbo.LenhXuatVT issue
                      ON issue.ID_LenhXuatVT=issueLink.SourceLenhXuatVTId
                    WHERE issueLink.PhieuId=@PhieuId AND issueLink.TrangThai=N'ACTIVE'
                      AND (issue.TrangThai<>0 OR issue.TonTai<>1 OR EXISTS(
                          SELECT 1 FROM TAG_QTKD.dbo.PhieuXuatVT issueVoucher
                          WHERE issueVoucher.ID_LenhXuatVT=issue.ID_LenhXuatVT AND issueVoucher.TonTai=1
                      ))
                ) THROW 52026,N'Lệnh xuất bổ sung đã được xử lý trên ERP. Cần thu hồi nghiệp vụ ERP trước khi sửa phiếu.',1;

                SELECT phoiRow.SourceVatTuId,
                    MAX(CONVERT(INT,CEILING(
                        CONVERT(DECIMAL(38,10),phoiRow.SoLuongPhoiLoi) /
                        CASE WHEN TRY_CONVERT(DECIMAL(18,6),NULLIF(LTRIM(RTRIM(phoiRow.SoPhoi)),N''))>0
                            THEN TRY_CONVERT(DECIMAL(18,6),NULLIF(LTRIM(RTRIM(phoiRow.SoPhoi)),N''))
                            ELSE CONVERT(DECIMAL(18,6),1) END
                    ))) AS SoLuongBoLoi
                INTO #OldMaterialBasis
                FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
                WHERE phoiRow.PhieuId=@PhieuId AND phoiRow.SourceVatTuId IS NOT NULL
                GROUP BY phoiRow.SourceVatTuId;

                CREATE TABLE #InputPhoi (
                    SourceType NVARCHAR(20) NOT NULL,
                    SourceId INT NOT NULL,
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
                    SortOrder INT NOT NULL,
                    PRIMARY KEY(SourceType,SourceId)
                );
                INSERT #InputPhoi
                SELECT SourceType,SourceId,SoLuongKiem, SoLuongPhoiLoi, NULLIF(GhiChu, N''),
                    NULLIF(LotSanXuat,N''),NULLIF(LenhXuatVatTu,N''),NULLIF(DauTuan,N''),DonViTaoPhoiId,NgayTaoPhoi,
                    NULLIF(ToSanXuat,N''),NULLIF(CongNhanSanXuat,N''),SortOrder
                FROM OPENJSON(@ItemsJson) WITH (
                    SourceType NVARCHAR(20) '$.sourceType',SourceId INT '$.sourceId',
                    SoLuongKiem INT '$.soLuongKiem',
                    SoLuongPhoiLoi INT '$.soLuongPhoiLoi', GhiChu NVARCHAR(1000) '$.ghiChu',
                    LotSanXuat NVARCHAR(100) '$.lotSanXuat',LenhXuatVatTu NVARCHAR(100) '$.lenhXuatVatTu',
                    DauTuan NVARCHAR(100) '$.dauTuan',
                    DonViTaoPhoiId INT '$.donViTaoPhoiId',
                    NgayTaoPhoi DATE '$.ngayTaoPhoi',ToSanXuat NVARCHAR(255) '$.toSanXuat',
                    CongNhanSanXuat NVARCHAR(1000) '$.congNhanSanXuat',SortOrder INT '$.sortOrder'
                );

                IF EXISTS (
                    SELECT 1 FROM #InputPhoi inputRow
                    LEFT JOIN dbo.DM_BO_PHAN department ON department.Id=inputRow.DonViTaoPhoiId AND ISNULL(department.TrangThai,1)=1
                    WHERE inputRow.DonViTaoPhoiId IS NOT NULL AND department.Id IS NULL
                ) THROW 52023, N'Đơn vị tạo phôi không tồn tại hoặc đã ngừng sử dụng.', 1;

                IF EXISTS(SELECT 1 FROM #InputPhoi WHERE SourceType NOT IN(N'COMPONENT',N'BTP_STAGE',N'MANUAL'))
                    THROW 52021,N'Loại nguồn phôi không hợp lệ.',1;
                IF EXISTS(SELECT 1 FROM #InputPhoi WHERE
                    (@SelectionMode=N'PREVIOUS_STAGE_BTP' AND SourceType<>N'BTP_STAGE') OR
                    (@SelectionMode<>N'PREVIOUS_STAGE_BTP' AND SourceType NOT IN(N'COMPONENT',N'MANUAL')))
                    THROW 52021,N'Phôi đã chọn không đúng chế độ của công đoạn.',1;

                CREATE TABLE #SourcePhoi (
                    SourceType NVARCHAR(20) NOT NULL,SourceId INT NOT NULL,
                    SourceLoiPhoiId INT NULL, SourceSanPhamId INT NOT NULL,
                    SourceVatTuId INT NULL,SourceCatalogProductId INT NULL,SourceManualPhoiId INT NULL,
                    SourceGuid UNIQUEIDENTIFIER NULL,
                    MaVatTu NVARCHAR(30) NULL, QuyCachVatTu NVARCHAR(4000) NULL,
                    TenLoaiPhoi NVARCHAR(200) NULL, DaoChat NVARCHAR(100) NULL,
                    SoPhoi NVARCHAR(30) NULL, KyHieu NVARCHAR(50) NULL,
                    SelectedItemCode NVARCHAR(100) NULL,SelectedItemName NVARCHAR(500) NULL,
                    PRIMARY KEY(SourceType,SourceId)
                );
                INSERT #SourcePhoi
                SELECT DISTINCT N'COMPONENT',sourceRow.ID_LoiPhoi,sourceRow.ID_LoiPhoi,
                       product.ID_SanPham,sourceRow.ID_VatTu,NULL,NULL,
                       sourceRow.GuID, material.Ma_VatTu, material.QuyCach,
                       sourceRow.Ten_loaiPhoi, sourceRow.DaoChat,
                       sourceRow.So_phoi, sourceRow.KyHieu,material.Ma_VatTu,sourceRow.Ten_loaiPhoi
                FROM TAG_QTKD.dbo.DM_SanPham product
                INNER JOIN TAG_Giang.dbo.DA_TruyNguyen_SanPham_LoiPhoi sourceRow
                    ON sourceRow.ID_SanPham = product.ID_SanPham
                INNER JOIN TAG_QTKD.dbo.DM_VatTu material ON material.ID_VatTu = sourceRow.ID_VatTu
                INNER JOIN #InputPhoi inputRow ON inputRow.SourceType=N'COMPONENT'
                    AND inputRow.SourceId=sourceRow.ID_LoiPhoi
                WHERE LTRIM(RTRIM(product.ItemCode)) = LTRIM(RTRIM(@ProductCode))
                  AND product.TonTai = 1 AND ISNULL(sourceRow.TonTai, 1) = 1
                  AND ISNULL(material.TonTai, 1) = 1
                ;

                INSERT #SourcePhoi
                SELECT N'MANUAL',manualRow.Id,NULL,product.ID_SanPham,
                    manualRow.SourceVatTuId,NULL,manualRow.Id,NULL,
                    manualRow.MaVatTu,manualRow.QuyCachVatTu,manualRow.TenLoaiPhoi,
                    manualRow.DaoChat,manualRow.SoPhoi,manualRow.KyHieu,
                    manualRow.MaVatTu,manualRow.TenLoaiPhoi
                FROM dbo.DM_PHOI_DOI_TRA_NHAP_TAY manualRow
                CROSS JOIN TAG_QTKD.dbo.DM_SanPham product
                JOIN #InputPhoi inputRow ON inputRow.SourceType=N'MANUAL' AND inputRow.SourceId=manualRow.Id
                WHERE LTRIM(RTRIM(manualRow.ProductCode))=LTRIM(RTRIM(@ProductCode))
                  AND manualRow.IsActive=1
                  AND LTRIM(RTRIM(product.ItemCode))=LTRIM(RTRIM(@ProductCode)) AND product.TonTai=1;

                IF @SelectionMode=N'PREVIOUS_STAGE_BTP'
                BEGIN
                    DECLARE @StageCode NVARCHAR(100)=@ProductCode+N'.'+@BtpSuffix;
                    IF (SELECT COUNT(*) FROM dbo.DM_SAN_PHAM
                        WHERE LTRIM(RTRIM(MaSanPham))=LTRIM(RTRIM(@StageCode)) AND TrangThai=1)<>1
                        THROW 52028,N'Không tìm thấy duy nhất BTP sau công đoạn trong danh mục nội bộ.',1;
                    IF (SELECT COUNT(*) FROM TAG_QTKD.dbo.DM_SanPham
                        WHERE LTRIM(RTRIM(ItemCode))=LTRIM(RTRIM(@ProductCode)) AND TonTai=1)<>1
                        THROW 52029,N'Không tìm thấy duy nhất sản phẩm ERP của kế hoạch.',1;

                    INSERT #SourcePhoi
                    SELECT N'BTP_STAGE',catalog.Id,NULL,product.ID_SanPham,NULL,catalog.Id,NULL,NULL,
                        catalog.MaSanPham,N'BTP sau công đoạn May',LEFT(catalog.TenSanPham,200),NULL,N'1',NULL,
                        catalog.MaSanPham,catalog.TenSanPham
                    FROM dbo.DM_SAN_PHAM catalog
                    CROSS JOIN TAG_QTKD.dbo.DM_SanPham product
                    JOIN #InputPhoi inputRow ON inputRow.SourceType=N'BTP_STAGE' AND inputRow.SourceId=catalog.Id
                    WHERE LTRIM(RTRIM(catalog.MaSanPham))=LTRIM(RTRIM(@StageCode)) AND catalog.TrangThai=1
                      AND LTRIM(RTRIM(product.ItemCode))=LTRIM(RTRIM(@ProductCode)) AND product.TonTai=1;
                END;

                IF EXISTS (SELECT 1 FROM #InputPhoi inputRow LEFT JOIN #SourcePhoi sourceRow
                           ON sourceRow.SourceType=inputRow.SourceType AND sourceRow.SourceId=inputRow.SourceId
                           WHERE sourceRow.SourceId IS NULL)
                    THROW 52021, N'Có phôi không còn hiệu lực hoặc không thuộc sản phẩm của kế hoạch.', 1;

                CREATE TABLE #InputIssueTrace(
                    SourceType NVARCHAR(20) NOT NULL,SourceId INT NOT NULL,
                    ManualLxvtKey UNIQUEIDENTIFIER NOT NULL,SoLenhXuatVT NVARCHAR(100) NULL,
                    LotSanXuat NVARCHAR(100) NULL,
                    DauTuan NVARCHAR(100) NULL,DonViTaoPhoiId INT NULL,NgayTaoPhoi DATE NULL,
                    ToSanXuat NVARCHAR(255) NULL,CongNhanSanXuat NVARCHAR(1000) NULL,
                    SortOrder INT NOT NULL,
                    PRIMARY KEY(SourceType,SourceId,ManualLxvtKey)
                );
                INSERT #InputIssueTrace
                SELECT SourceType,SourceId,ManualLxvtKey,LTRIM(RTRIM(SoLenhXuatVT)),NULLIF(LotSanXuat,N''),
                    NULLIF(DauTuan,N''),DonViTaoPhoiId,NgayTaoPhoi,NULLIF(ToSanXuat,N''),
                    NULLIF(CongNhanSanXuat,N''),SortOrder
                FROM OPENJSON(@IssueTraceabilitiesJson) WITH(
                    SourceType NVARCHAR(20) '$.sourceType',SourceId INT '$.sourceId',
                    ManualLxvtKey UNIQUEIDENTIFIER '$.manualLxvtKey',SoLenhXuatVT NVARCHAR(100) '$.soLenhXuatVT',LotSanXuat NVARCHAR(100) '$.lotSanXuat',
                    DauTuan NVARCHAR(100) '$.dauTuan',DonViTaoPhoiId INT '$.donViTaoPhoiId',
                    NgayTaoPhoi DATE '$.ngayTaoPhoi',ToSanXuat NVARCHAR(255) '$.toSanXuat',
                    CongNhanSanXuat NVARCHAR(1000) '$.congNhanSanXuat',SortOrder INT '$.sortOrder'
                );

                IF EXISTS(
                    SELECT 1 FROM #InputIssueTrace traceRow
                    LEFT JOIN #InputPhoi inputPhoi ON inputPhoi.SourceType=traceRow.SourceType
                        AND inputPhoi.SourceId=traceRow.SourceId
                    LEFT JOIN dbo.DM_BO_PHAN department ON department.Id=traceRow.DonViTaoPhoiId
                        AND ISNULL(department.TrangThai,1)=1
                    WHERE inputPhoi.SourceId IS NULL OR (@RequireLxvt=1 AND NULLIF(LTRIM(RTRIM(traceRow.SoLenhXuatVT)),N'') IS NULL)
                       OR (traceRow.DonViTaoPhoiId IS NOT NULL AND department.Id IS NULL)
                ) THROW 52033,N'Thông tin tem có phôi, LXVT hoặc đơn vị tạo phôi không hợp lệ.',1;

                CREATE TABLE #InputDefect (
                    SourceType NVARCHAR(20) NOT NULL,SourceId INT NOT NULL,
                    NhomLoiId INT NOT NULL, DefectId INT NOT NULL,
                    SoLuongLoi INT NOT NULL, GhiChu NVARCHAR(1000) NULL, SortOrder INT NOT NULL,
                    BoPhanGayLoiSource NVARCHAR(20) NOT NULL, BoPhanGayLoiSourceId INT NOT NULL,
                    ManualLxvtKey UNIQUEIDENTIFIER NULL
                );
                INSERT #InputDefect
                SELECT SourceType,SourceId,NhomLoiId,DefectId,SoLuongLoi,NULLIF(GhiChu,N''),SortOrder,
                    BoPhanGayLoiSource,BoPhanGayLoiSourceId,ManualLxvtKey
                FROM OPENJSON(@DefectsJson) WITH (
                    SourceType NVARCHAR(20) '$.sourceType',SourceId INT '$.sourceId',
                    NhomLoiId INT '$.nhomLoiId',
                    DefectId INT '$.defectId', SoLuongLoi INT '$.soLuongLoi',
                    GhiChu NVARCHAR(1000) '$.ghiChu', SortOrder INT '$.sortOrder',
                    BoPhanGayLoiSource NVARCHAR(20) '$.boPhanGayLoiSource',
                    BoPhanGayLoiSourceId INT '$.boPhanGayLoiSourceId',
                    ManualLxvtKey UNIQUEIDENTIFIER '$.manualLxvtKey'
                );

                IF EXISTS (
                    SELECT 1 FROM #InputDefect
                    GROUP BY SourceType,SourceId,ManualLxvtKey,DefectId,
                        BoPhanGayLoiSource,BoPhanGayLoiSourceId
                    HAVING COUNT(*)>1
                ) THROW 52032,N'Lỗi đã được nhập trùng trong cùng một lệnh xuất vật tư và đơn vị gây lỗi.',1;

                IF EXISTS (
                    SELECT 1 FROM #InputDefect inputDefect
                    LEFT JOIN dbo.DM_NHOM_LOI_DOI_TRA_PHOI groupRow
                        ON groupRow.Id=inputDefect.NhomLoiId AND groupRow.TrangThai=1
                    LEFT JOIN dbo.DM_DEFECT defectRow ON defectRow.Id=inputDefect.DefectId
                    LEFT JOIN #InputPhoi inputPhoi ON inputPhoi.SourceType=inputDefect.SourceType
                        AND inputPhoi.SourceId=inputDefect.SourceId
                    WHERE groupRow.Id IS NULL OR defectRow.Id IS NULL OR inputPhoi.SourceId IS NULL
                       OR inputDefect.SoLuongLoi <= 0 OR inputDefect.SoLuongLoi > inputPhoi.SoLuongPhoiLoi
                       OR inputDefect.BoPhanGayLoiSource NOT IN (N'NOI_BO',N'TAG_SYSTEM',N'NHA_CUNG_CAP')
                ) THROW 52022, N'Nhóm lỗi, lỗi hoặc số lượng lỗi không hợp lệ.', 1;

                IF EXISTS (SELECT 1 FROM #InputDefect d LEFT JOIN dbo.DM_BO_PHAN bp
                    ON bp.Id=d.BoPhanGayLoiSourceId AND ISNULL(bp.TrangThai,1)=1
                    WHERE d.BoPhanGayLoiSource=N'NOI_BO' AND bp.Id IS NULL)
                    THROW 52025, N'Bộ phận gây lỗi không tồn tại hoặc đã ngừng hoạt động.', 1;
                IF EXISTS (SELECT 1 FROM #InputDefect d LEFT JOIN TAG_System.dbo.DM_BoPhan bp
                    ON bp.ID_BoPhan=d.BoPhanGayLoiSourceId AND bp.SuDung=1 AND bp.TonTai=1 AND bp.ID_DonVi=32
                    WHERE d.BoPhanGayLoiSource=N'TAG_SYSTEM' AND bp.ID_BoPhan IS NULL)
                    THROW 52025, N'Nhà thầu SXBT gây lỗi không tồn tại hoặc đã ngừng hoạt động.', 1;
                IF EXISTS (SELECT 1 FROM #InputDefect d LEFT JOIN TAG_QTKD.dbo.DM_NhaCungCap supplier
                    ON supplier.ID_NhaCungCap=d.BoPhanGayLoiSourceId AND supplier.SuDung=1 AND supplier.TonTai=1
                    WHERE d.BoPhanGayLoiSource=N'NHA_CUNG_CAP' AND supplier.ID_NhaCungCap IS NULL)
                    THROW 52025, N'Nhà cung cấp gây lỗi không tồn tại hoặc đã ngừng sử dụng.', 1;
                IF EXISTS(
                    SELECT 1 FROM #InputDefect inputDefect
                    LEFT JOIN #InputIssueTrace traceRow
                      ON traceRow.SourceType=inputDefect.SourceType AND traceRow.SourceId=inputDefect.SourceId
                     AND traceRow.ManualLxvtKey=inputDefect.ManualLxvtKey
                    WHERE inputDefect.ManualLxvtKey IS NOT NULL
                      AND traceRow.ManualLxvtKey IS NULL
                ) THROW 52034,N'Chỉ được gán lỗi cho tem truy nguyên đã nhập.',1;
                IF EXISTS(SELECT 1 FROM #InputDefect WHERE ManualLxvtKey IS NULL)
                    THROW 52034,N'Mỗi lỗi phải được gán cho một tem truy nguyên đã nhập.',1;

                DELETE FROM dbo.DOI_TRA_PHOI_LOI_PHOI WHERE PhieuId=@PhieuId;

                INSERT dbo.DOI_TRA_PHOI_LOI_PHOI (
                    PhieuId,SourceType,SourceLoiPhoiId,SourceSanPhamId,SourceVatTuId,
                    SourceCatalogProductId,SourceManualPhoiId,SourceGuid,SelectedItemCode,SelectedItemName,
                    ProductCode, ProductName, MaVatTu, QuyCachVatTu, TenLoaiPhoi,
                    DaoChat, SoPhoi, KyHieu, SoLuongKiem, SoLuongPhoiLoi, GhiChu,
                    LotSanXuat,LenhXuatVatTu,DauTuan,DonViTaoPhoiId,MaDonViTaoPhoi,TenDonViTaoPhoi,
                    NgayTaoPhoi,ToSanXuat,CongNhanSanXuat,KcsId,TenKcs,MaBoPhanKcs,TenBoPhanKcs,SortOrder
                )
                SELECT @PhieuId,sourceRow.SourceType,sourceRow.SourceLoiPhoiId,sourceRow.SourceSanPhamId,
                       sourceRow.SourceVatTuId,sourceRow.SourceCatalogProductId,sourceRow.SourceManualPhoiId,sourceRow.SourceGuid,
                       sourceRow.SelectedItemCode,sourceRow.SelectedItemName,@ProductCode,@ProductName,
                       sourceRow.MaVatTu, sourceRow.QuyCachVatTu, sourceRow.TenLoaiPhoi,
                       sourceRow.DaoChat, sourceRow.SoPhoi, sourceRow.KyHieu,
                       inputRow.SoLuongKiem, inputRow.SoLuongPhoiLoi, inputRow.GhiChu,
                       COALESCE(NULLIF(@ProductionLot,N''),inputRow.LotSanXuat),inputRow.LenhXuatVatTu,
                       inputRow.DauTuan,inputRow.DonViTaoPhoiId,
                       department.MaBoPhan,department.TenBoPhan,inputRow.NgayTaoPhoi,inputRow.ToSanXuat,
                       inputRow.CongNhanSanXuat,NULL,NULL,NULL,NULL,inputRow.SortOrder
                FROM #InputPhoi inputRow
                INNER JOIN #SourcePhoi sourceRow ON sourceRow.SourceType=inputRow.SourceType
                    AND sourceRow.SourceId=inputRow.SourceId
                LEFT JOIN dbo.DM_BO_PHAN department ON department.Id=inputRow.DonViTaoPhoiId;

                INSERT dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN(
                    PhoiId,ManualLxvtKey,SourceLenhXuatVTId,SoLenhXuatVT,SourceKhoXuatId,TenKhoXuat,
                    LotSanXuat,DauTuan,DonViTaoPhoiId,MaDonViTaoPhoi,TenDonViTaoPhoi,
                    NgayTaoPhoi,ToSanXuat,CongNhanSanXuat,SortOrder
                )
                SELECT savedPhoi.Id,traceRow.ManualLxvtKey,NULL,traceRow.SoLenhXuatVT,
                    NULL,NULL,traceRow.LotSanXuat,traceRow.DauTuan,
                    traceRow.DonViTaoPhoiId,department.MaBoPhan,department.TenBoPhan,
                    traceRow.NgayTaoPhoi,traceRow.ToSanXuat,traceRow.CongNhanSanXuat,traceRow.SortOrder
                FROM #InputIssueTrace traceRow
                JOIN dbo.DOI_TRA_PHOI_LOI_PHOI savedPhoi
                  ON savedPhoi.PhieuId=@PhieuId AND savedPhoi.SourceType=traceRow.SourceType
                 AND ((savedPhoi.SourceType=N'COMPONENT' AND savedPhoi.SourceLoiPhoiId=traceRow.SourceId)
                   OR (savedPhoi.SourceType=N'BTP_STAGE' AND savedPhoi.SourceCatalogProductId=traceRow.SourceId)
                   OR (savedPhoi.SourceType=N'MANUAL' AND savedPhoi.SourceManualPhoiId=traceRow.SourceId))
                LEFT JOIN dbo.DM_BO_PHAN department ON department.Id=traceRow.DonViTaoPhoiId;

                INSERT dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT (
                    PhoiId, NhomLoiId, DefectId, MaNhomLoi, TenNhomLoi,
                    MaLoi, TenLoi, DefectType, MoTa, SoLuongLoi, GhiChu, SortOrder,
                    ManualLxvtKey,SourceLenhXuatVTId,SoLenhXuatVT,
                    BoPhanGayLoiSource,BoPhanGayLoiSourceId,BoPhanGayLoiId,MaBoPhanGayLoi,TenBoPhanGayLoi,
                    DonViGayLoiSourceId,TenDonViGayLoi
                )
                SELECT savedPhoi.Id, groupRow.Id, defectRow.Id, groupRow.MaNhom, groupRow.TenNhom,
                       defectRow.MaLoi, defectRow.TenLoi, defectRow.DefectType, defectRow.MoTa,
                       inputDefect.SoLuongLoi, inputDefect.GhiChu, inputDefect.SortOrder,
                       inputDefect.ManualLxvtKey,NULL,traceRow.SoLenhXuatVT,
                       inputDefect.BoPhanGayLoiSource,inputDefect.BoPhanGayLoiSourceId,
                       CASE WHEN inputDefect.BoPhanGayLoiSource=N'NOI_BO' THEN localDepartment.Id END,
                       COALESCE(localDepartment.MaBoPhan,LTRIM(RTRIM(supplier.MaSo_NhaCungCap)) COLLATE DATABASE_DEFAULT),
                       COALESCE(localDepartment.TenBoPhan,LTRIM(RTRIM(externalDepartment.Ten_BoPhan)) COLLATE DATABASE_DEFAULT,
                           LTRIM(RTRIM(supplier.Ten_NhaCungCap)) COLLATE DATABASE_DEFAULT),
                       externalDepartment.ID_DonVi,LTRIM(RTRIM(externalUnit.Ten_DonVi)) COLLATE DATABASE_DEFAULT
                FROM #InputDefect inputDefect
                INNER JOIN dbo.DOI_TRA_PHOI_LOI_PHOI savedPhoi
                    ON savedPhoi.PhieuId=@PhieuId AND savedPhoi.SourceType=inputDefect.SourceType
                    AND ((savedPhoi.SourceType=N'COMPONENT' AND savedPhoi.SourceLoiPhoiId=inputDefect.SourceId)
                      OR (savedPhoi.SourceType=N'BTP_STAGE' AND savedPhoi.SourceCatalogProductId=inputDefect.SourceId)
                      OR (savedPhoi.SourceType=N'MANUAL' AND savedPhoi.SourceManualPhoiId=inputDefect.SourceId))
                INNER JOIN dbo.DM_NHOM_LOI_DOI_TRA_PHOI groupRow ON groupRow.Id=inputDefect.NhomLoiId
                INNER JOIN dbo.DM_DEFECT defectRow ON defectRow.Id=inputDefect.DefectId
                LEFT JOIN #InputIssueTrace traceRow
                  ON traceRow.SourceType=inputDefect.SourceType AND traceRow.SourceId=inputDefect.SourceId
                 AND traceRow.ManualLxvtKey=inputDefect.ManualLxvtKey
                LEFT JOIN dbo.DM_BO_PHAN localDepartment ON localDepartment.Id=inputDefect.BoPhanGayLoiSourceId
                    AND inputDefect.BoPhanGayLoiSource=N'NOI_BO'
                LEFT JOIN TAG_System.dbo.DM_BoPhan externalDepartment ON externalDepartment.ID_BoPhan=inputDefect.BoPhanGayLoiSourceId
                    AND inputDefect.BoPhanGayLoiSource=N'TAG_SYSTEM'
                LEFT JOIN TAG_System.dbo.DM_DonVi externalUnit ON externalUnit.ID_DonVi=externalDepartment.ID_DonVi
                LEFT JOIN TAG_QTKD.dbo.DM_NhaCungCap supplier ON supplier.ID_NhaCungCap=inputDefect.BoPhanGayLoiSourceId
                    AND inputDefect.BoPhanGayLoiSource=N'NHA_CUNG_CAP';

                IF EXISTS(
                    SELECT SourceVatTuId,SoLuongBoLoi FROM #OldMaterialBasis
                    EXCEPT
                    SELECT phoiRow.SourceVatTuId,MAX(CONVERT(INT,CEILING(
                        CONVERT(DECIMAL(38,10),phoiRow.SoLuongPhoiLoi) /
                        CASE WHEN TRY_CONVERT(DECIMAL(18,6),NULLIF(LTRIM(RTRIM(phoiRow.SoPhoi)),N''))>0
                            THEN TRY_CONVERT(DECIMAL(18,6),NULLIF(LTRIM(RTRIM(phoiRow.SoPhoi)),N''))
                            ELSE CONVERT(DECIMAL(18,6),1) END
                    ))) FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
                    WHERE phoiRow.PhieuId=@PhieuId AND phoiRow.SourceVatTuId IS NOT NULL
                    GROUP BY phoiRow.SourceVatTuId
                ) OR EXISTS(
                    SELECT phoiRow.SourceVatTuId,MAX(CONVERT(INT,CEILING(
                        CONVERT(DECIMAL(38,10),phoiRow.SoLuongPhoiLoi) /
                        CASE WHEN TRY_CONVERT(DECIMAL(18,6),NULLIF(LTRIM(RTRIM(phoiRow.SoPhoi)),N''))>0
                            THEN TRY_CONVERT(DECIMAL(18,6),NULLIF(LTRIM(RTRIM(phoiRow.SoPhoi)),N''))
                            ELSE CONVERT(DECIMAL(18,6),1) END
                    ))) FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
                    WHERE phoiRow.PhieuId=@PhieuId AND phoiRow.SourceVatTuId IS NOT NULL
                    GROUP BY phoiRow.SourceVatTuId
                    EXCEPT SELECT SourceVatTuId,SoLuongBoLoi FROM #OldMaterialBasis
                )
                BEGIN
                    UPDATE dbo.DOI_TRA_PHOI_LOI SET
                        DinhMucTrangThai=CASE WHEN DinhMucTrangThai=N'KHONG_AP_DUNG' THEN N'KHONG_AP_DUNG'
                            WHEN B7ConfirmedAt IS NOT NULL OR EXISTS(
                            SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC savedQuantity
                            WHERE savedQuantity.PhieuId=@PhieuId
                        ) THEN N'CAN_XAC_NHAN_LAI' ELSE ISNULL(DinhMucTrangThai,N'CHUA_NHAP') END,
                        B7ConfirmedBy=NULL,B7ConfirmedAt=NULL
                    WHERE Id=@PhieuId;
                END;

                UPDATE dbo.DOI_TRA_PHOI_LOI SET UpdatedAt=SYSDATETIME() WHERE Id=@PhieuId;
                IF EXISTS (
                    SELECT 1
                    FROM dbo.DOI_TRA_PHOI_LOI_HISTORY WITH (UPDLOCK, HOLDLOCK)
                    WHERE PhieuId=@PhieuId AND ActionCode=N'SAVE_PHOI_DRAFT'
                      AND ISNULL(FromStatus,N'')=ISNULL(@FromStatus,N'')
                      AND ISNULL(ToStatus,N'')=ISNULL(@FromStatus,N'')
                )
                    UPDATE dbo.DOI_TRA_PHOI_LOI_HISTORY
                    SET ActionBy=@UserId, GhiChu=N'Lưu nháp danh sách phôi và lỗi', CreatedAt=SYSDATETIME()
                    WHERE Id=(
                        SELECT TOP 1 Id
                        FROM dbo.DOI_TRA_PHOI_LOI_HISTORY
                        WHERE PhieuId=@PhieuId AND ActionCode=N'SAVE_PHOI_DRAFT'
                          AND ISNULL(FromStatus,N'')=ISNULL(@FromStatus,N'')
                          AND ISNULL(ToStatus,N'')=ISNULL(@FromStatus,N'')
                        ORDER BY CreatedAt DESC, Id DESC
                    );
                ELSE
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
        res.status(number >= 52020 && number <= 52034 ? 409 : 500)
            .json({ message: errorMessage(error, 'Không lưu được danh sách phôi và lỗi') });
    }
});

const saveReturnQuantities = async (req, res) => {
    const phieuId = positiveId(req.params.id);
    const rowVersion = rowVersionBuffer(req.body?.rowVersion);
    const items = normalizeReturnQuantityItems(req.body?.items);
    const invalid = items.some((item) => !item.sourceVatTuId
        || (item.soLuongDoiTra !== null && !isValidReturnQuantity(item.soLuongDoiTra))
        || (item.ghiChu?.length || 0) > 1000);
    if (!phieuId || !rowVersion || invalid
        || new Set(items.map((item) => item.sourceVatTuId)).size !== items.length) {
        return res.status(400).json({ message: 'Danh sách số lượng đổi trả hoặc phiên bản dữ liệu không hợp lệ' });
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
            return res.status(403).json({ message: 'Chỉ nhân viên B7 hoặc Admin được nhập số lượng đổi trả' });
        }

        const result = await new sql.Request(transaction)
            .input('PhieuId', sql.Int, phieuId)
            .input('UserId', sql.Int, userIdOf(req))
            .input('RowVersion', sql.VarBinary(8), rowVersion)
            .input('ItemsJson', sql.NVarChar(sql.MAX), JSON.stringify(items))
            .query(`
                DECLARE @FromStatus NVARCHAR(80);
                SELECT @FromStatus=phieu.TrangThai
                FROM dbo.DOI_TRA_PHOI_LOI phieu WITH (UPDLOCK,HOLDLOCK)
                JOIN dbo.DOI_TRA_PHOI_LOI_WORKFLOW workflowRow ON workflowRow.Id=phieu.WorkflowId
                JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId=phieu.Id
                WHERE phieu.Id=@PhieuId AND phieu.RowVersion=@RowVersion
                  AND planRow.RequiresB7=1
                  AND ((workflowRow.VersionNo>=6 AND phieu.KcsCompletedAt IS NOT NULL)
                    OR (workflowRow.VersionNo<6 AND phieu.TbpKcsConfirmedAt IS NOT NULL))
                  AND ISNULL(phieu.DinhMucTrangThai,N'CHUA_NHAP')<>N'DA_XAC_NHAN'
                  AND phieu.TrangThai IN(N'CHO_CAC_KE_HOACH_KCS',N'CHO_THIET_LAP_KPH',N'CHO_Y_KIEN_KPH',N'CHO_XAC_NHAN_CUOI_KPH',
                      N'CHO_BGD_XAC_NHAN',N'CHO_THEO_DOI',N'KPH_HOAN_TAT_CHO_B7');
                IF @FromStatus IS NULL
                    THROW 52102, N'Phiếu đã thay đổi hoặc đã khóa số lượng đổi trả.', 1;
                IF EXISTS(
                    SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_LENH_XUAT_VT
                    WHERE PhieuId=@PhieuId AND TrangThai=N'ACTIVE'
                ) THROW 52105,N'Phiếu đã tạo lệnh xuất bổ sung, không thể sửa số lượng đổi trả.',1;

                CREATE TABLE #Input (
                    SourceVatTuId INT NOT NULL PRIMARY KEY,
                    SoLuongDoiTra DECIMAL(18,3) NULL,
                    GhiChu NVARCHAR(1000) NULL
                );
                INSERT #Input (SourceVatTuId,SoLuongDoiTra,GhiChu)
                SELECT sourceVatTuId,soLuongDoiTra,NULLIF(ghiChu,N'')
                FROM OPENJSON(@ItemsJson) WITH (
                    sourceVatTuId INT '$.sourceVatTuId',
                    soLuongDoiTra DECIMAL(18,3) '$.soLuongDoiTra',
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
                    MAX(CONVERT(INT,CEILING(
                        CONVERT(DECIMAL(38,10),phoiRow.SoLuongPhoiLoi) /
                        CASE WHEN TRY_CONVERT(DECIMAL(18,6),NULLIF(LTRIM(RTRIM(phoiRow.SoPhoi)),N''))>0
                            THEN TRY_CONVERT(DECIMAL(18,6),NULLIF(LTRIM(RTRIM(phoiRow.SoPhoi)),N''))
                            ELSE CONVERT(DECIMAL(18,6),1) END
                    )))
                FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
                WHERE phoiRow.PhieuId=@PhieuId
                GROUP BY phoiRow.SourceVatTuId;

                UPDATE saved
                SET MaVatTu=materialGroup.MaVatTu,QuyCachVatTu=materialGroup.QuyCachVatTu,
                    SoLuongBoLoiSnapshot=materialGroup.SoLuongBoLoi,
                    SoLuongDoiTra=inputRow.SoLuongDoiTra,
                    SourceDonHangVatTuId=NULL,SourceLenhXuatVTId=NULL,
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
                    materialGroup.SoLuongBoLoi,NULL,inputRow.SoLuongDoiTra,
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
                IF EXISTS (
                    SELECT 1
                    FROM dbo.DOI_TRA_PHOI_LOI_HISTORY WITH (UPDLOCK, HOLDLOCK)
                    WHERE PhieuId=@PhieuId AND ActionCode=N'SAVE_RETURN_QUANTITY_DRAFT'
                      AND ISNULL(FromStatus,N'')=ISNULL(@FromStatus,N'')
                      AND ISNULL(ToStatus,N'')=ISNULL(@FromStatus,N'')
                )
                    UPDATE dbo.DOI_TRA_PHOI_LOI_HISTORY
                    SET ActionBy=@UserId, GhiChu=N'Lưu nháp số lượng đổi trả', CreatedAt=SYSDATETIME()
                    WHERE Id=(
                        SELECT TOP 1 Id
                        FROM dbo.DOI_TRA_PHOI_LOI_HISTORY
                        WHERE PhieuId=@PhieuId AND ActionCode=N'SAVE_RETURN_QUANTITY_DRAFT'
                          AND ISNULL(FromStatus,N'')=ISNULL(@FromStatus,N'')
                          AND ISNULL(ToStatus,N'')=ISNULL(@FromStatus,N'')
                        ORDER BY CreatedAt DESC, Id DESC
                    );
                ELSE
                    INSERT dbo.DOI_TRA_PHOI_LOI_HISTORY
                        (PhieuId,ActionCode,FromStatus,ToStatus,ActionBy,GhiChu)
                    VALUES (@PhieuId,N'SAVE_RETURN_QUANTITY_DRAFT',@FromStatus,@FromStatus,@UserId,N'Lưu nháp số lượng đổi trả');

                SELECT Id,SoPhieu,TrangThai,RowVersion FROM dbo.DOI_TRA_PHOI_LOI WHERE Id=@PhieuId;
            `);
        if (isKcsCompletion) {
            await new sql.Request(transaction)
                .input('PhieuId', sql.Int, phieuId)
                .input('UserId', sql.Int, userIdOf(req))
                .query(`
                    DECLARE @GroupId INT,@PendingCount INT,@RequiresExecutive BIT;
                    SELECT @GroupId=NhomPhieuId FROM dbo.DOI_TRA_PHOI_LOI WHERE Id=@PhieuId;
                    SELECT @PendingCount=COUNT(*)
                    FROM dbo.DOI_TRA_PHOI_LOI sibling
                    WHERE sibling.NhomPhieuId=@GroupId AND sibling.TrangThai<>N'DA_HUY'
                      AND NOT EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP receipt
                          WHERE receipt.PhieuId=sibling.Id AND receipt.TrangThai=N'ACTIVE');
                    IF @PendingCount>0
                    BEGIN
                        UPDATE dbo.DOI_TRA_PHOI_LOI SET TrangThai=N'CHO_CAC_KE_HOACH_KCS',CurrentStepId=NULL,
                            UpdatedAt=SYSDATETIME() WHERE Id=@PhieuId;
                    END
                    ELSE
                    BEGIN
                        SET @RequiresExecutive=ISNULL((SELECT TOP 1 CAST(BitValue AS bit)
                            FROM dbo.SYSTEM_SETTINGS WHERE SettingKey=N'REQUIRE_EXECUTIVE_APPROVAL_KPH'),0);
                        INSERT dbo.DOI_TRA_PHOI_LOI_HISTORY(PhieuId,ActionCode,FromStatus,ToStatus,ActionBy,GhiChu)
                        SELECT sibling.Id,N'GROUP_KPH_OPEN',sibling.TrangThai,N'CHO_THIET_LAP_KPH',@UserId,
                            N'Tất cả kế hoạch đã hoàn tất KCS; mở một KPH chung cho nhóm'
                        FROM dbo.DOI_TRA_PHOI_LOI sibling
                        WHERE sibling.NhomPhieuId=@GroupId AND sibling.TrangThai=N'CHO_CAC_KE_HOACH_KCS';
                        UPDATE sibling SET TrangThai=N'CHO_THIET_LAP_KPH',CurrentStepId=setupStep.Id,
                            RequiresExecutiveApproval=@RequiresExecutive,UpdatedAt=SYSDATETIME()
                        FROM dbo.DOI_TRA_PHOI_LOI sibling
                        JOIN dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP setupStep
                          ON setupStep.WorkflowId=sibling.WorkflowId AND setupStep.StepCode=N'KPH_THIET_LAP'
                        WHERE sibling.NhomPhieuId=@GroupId AND sibling.TrangThai<>N'DA_HUY'
                          AND sibling.KcsCompletedAt IS NOT NULL;
                    END;
                `);
        }
        await transaction.commit();
        started = false;
        res.json(encodeBinary({ success: true, phieu: result.recordset?.[0] }));
    } catch (error) {
        if (transaction && started) {
            try { await transaction.rollback(); } catch (rollbackError) { console.error('DoiTraPhoiLoi quota rollback error:', rollbackError); }
        }
        console.error('DoiTraPhoiLoi save return quantity error:', error);
        const number = Number(error?.number || error?.originalError?.info?.number);
        res.status(number >= 52102 && number <= 52105 ? 409 : 500)
            .json({ message: errorMessage(error, 'Không lưu được số lượng đổi trả') });
    }
};

router.put('/:id/so-luong-doi-tra', authorizeDoiTraAccess, saveReturnQuantities);
router.put('/:id/dinh-muc', authorizeDoiTraAccess, saveReturnQuantities);

router.post('/:id/actions/:actionCode', authorizeDoiTraAccess, async (req, res) => {
    const phieuId = positiveId(req.params.id);
    const rowVersion = rowVersionBuffer(req.body?.rowVersion);
    const actionCode = String(req.params.actionCode || '').trim().toUpperCase();
    const ghiChu = trimOrNull(req.body?.ghiChu);
    const rawBtpQuantity = req.body?.soLuongBtpLoi;
    const soLuongBtpLoi = rawBtpQuantity === '' || rawBtpQuantity == null ? null : Number(rawBtpQuantity);
    const khoNhapId = positiveId(req.body?.khoNhapId);
    const quyTrinhSanXuatId = positiveId(req.body?.quyTrinhSanXuatId);
    const isKcsCompletion = ['KCS_SUBMIT', 'KCS_RESUBMIT'].includes(actionCode);
    const receiptDrafts = (Array.isArray(req.body?.receipts) ? req.body.receipts : (isKcsCompletion ? [{
        soLuongBtpLoi,
        khoNhapId,
        quyTrinhSanXuatId,
        phoiIds: (Array.isArray(req.body?.phoiIds) ? req.body.phoiIds : [])
    }] : [])).map((item) => ({
        quantity: Number(item?.soLuongBtpLoi),
        warehouseId: positiveId(item?.khoNhapId),
        processId: positiveId(item?.quyTrinhSanXuatId),
        phoiIds: [...new Set((Array.isArray(item?.phoiIds) ? item.phoiIds : []).map(positiveId).filter(Boolean))],
        suggestedProcessByPhoi: item?.suggestedProcessByPhoi || {}
    }));
    const supportedActions = ['KCS_SUBMIT', 'KCS_RESUBMIT', 'TBP_CONFIRM', 'TBP_RETURN', 'B7_CONFIRM', 'KHO_CONFIRM', 'STOCK_CARD_RECORD'];
    const invalidReceiptDraft = receiptDrafts.some((item) => !item.warehouseId || item.warehouseId > 32767
        || !item.processId || item.processId > 255 || !Number.isFinite(item.quantity) || item.quantity <= 0
        || Math.abs(item.quantity * 100 - Math.round(item.quantity * 100)) > 1e-8 || !item.phoiIds.length);
    const duplicateProcess = new Set(receiptDrafts.map((item) => item.processId)).size !== receiptDrafts.length;
    if (isKcsCompletion && (!receiptDrafts.length || invalidReceiptDraft || duplicateProcess)) {
        return res.status(400).json({ message: 'Danh sách phiếu nhập BTP dự kiến không hợp lệ hoặc bị trùng loại BTP' });
    }
    if (!phieuId || !rowVersion || !supportedActions.includes(actionCode)
        || (ghiChu?.length || 0) > 1000 || (actionCode === 'TBP_RETURN' && !ghiChu)
    ) {
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
                SELECT phieu.Id,phieu.SoPhieu,phieu.NguoiLapId,phieu.BoPhanKcsId,phieu.TrangThai,
                    phieu.WorkflowId,phieu.CurrentStepId,planRow.RequiresB7,planRow.RequireLenhXuatVatTu,
                    transitionRow.Id AS TransitionId,transitionRow.ActionCode,transitionRow.ActionName,
                    CASE WHEN @ActionCode IN(N'B7_CONFIRM',N'KHO_CONFIRM',N'STOCK_CARD_RECORD') THEN phieu.CurrentStepId ELSE transitionRow.ToStepId END AS ToStepId,
                    CASE WHEN @ActionCode=N'B7_CONFIRM' AND phieu.TrangThai=N'KPH_HOAN_TAT_CHO_B7'
                         THEN N'HOAN_TAT' WHEN @ActionCode=N'B7_CONFIRM' THEN phieu.TrangThai
                         WHEN @ActionCode=N'STOCK_CARD_RECORD' AND planRow.RequiresB7=0
                              AND phieu.TrangThai=N'KPH_HOAN_TAT_CHO_KHO' THEN N'HOAN_TAT'
                         WHEN @ActionCode IN(N'KHO_CONFIRM',N'STOCK_CARD_RECORD') THEN phieu.TrangThai
                         ELSE transitionRow.ToStatusCode END AS ToStatusCode
                FROM dbo.DOI_TRA_PHOI_LOI phieu WITH (UPDLOCK,HOLDLOCK)
                JOIN dbo.DOI_TRA_PHOI_LOI_WORKFLOW workflowRow ON workflowRow.Id=phieu.WorkflowId
                JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId=phieu.Id
                LEFT JOIN dbo.DOI_TRA_PHOI_LOI_WORKFLOW_TRANSITION transitionRow
                  ON transitionRow.WorkflowId=phieu.WorkflowId
                 AND transitionRow.FromStepId=phieu.CurrentStepId
                 AND transitionRow.FromStatusCode=phieu.TrangThai
                 AND transitionRow.ActionCode=@ActionCode
                 AND transitionRow.IsActive=1
                WHERE phieu.Id=@PhieuId AND phieu.RowVersion=@RowVersion
                  AND ((@ActionCode NOT IN(N'B7_CONFIRM',N'KHO_CONFIRM',N'STOCK_CARD_RECORD') AND transitionRow.Id IS NOT NULL)
                    OR (@ActionCode=N'B7_CONFIRM' AND workflowRow.VersionNo>=5
                        AND planRow.RequiresB7=1
                        AND ((workflowRow.VersionNo>=6 AND phieu.KcsCompletedAt IS NOT NULL)
                          OR (workflowRow.VersionNo<6 AND phieu.TbpKcsConfirmedAt IS NOT NULL))
                        AND ISNULL(phieu.DinhMucTrangThai,N'CHUA_NHAP')<>N'DA_XAC_NHAN'
                        AND phieu.TrangThai IN(N'CHO_CAC_KE_HOACH_KCS',N'CHO_THIET_LAP_KPH',N'CHO_Y_KIEN_KPH',N'CHO_XAC_NHAN_CUOI_KPH',
                            N'CHO_BGD_XAC_NHAN',N'CHO_THEO_DOI',N'KPH_HOAN_TAT_CHO_B7'))
                    OR (@ActionCode=N'KHO_CONFIRM' AND workflowRow.VersionNo>=6
                        AND phieu.KcsCompletedAt IS NOT NULL
                        AND phieu.TrangThai<>N'DA_HUY'
                        AND EXISTS(SELECT 1
                            FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP receiptLink
                            JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt
                              ON receipt.ID_PhieuNhapBTP=receiptLink.SourcePhieuNhapBtpId
                            WHERE receiptLink.PhieuId=phieu.Id AND receiptLink.TrangThai=N'ACTIVE'
                              AND receipt.TonTai=1 AND receipt.TrangThai=0
                              AND receiptLink.WarehouseConfirmedAt IS NULL))
                    OR (@ActionCode=N'STOCK_CARD_RECORD' AND workflowRow.VersionNo>=6
                        AND phieu.KcsCompletedAt IS NOT NULL
                        AND phieu.TrangThai<>N'DA_HUY'
                        AND EXISTS(SELECT 1
                            FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP receiptLink
                            JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt
                              ON receipt.ID_PhieuNhapBTP=receiptLink.SourcePhieuNhapBtpId
                            WHERE receiptLink.PhieuId=phieu.Id AND receiptLink.TrangThai=N'ACTIVE'
                              AND receipt.TonTai=1 AND receipt.TrangThai=4
                              AND receiptLink.StockCardRecordedAt IS NULL)));
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

        if (isKcsCompletion) {
            const submittedPhoiIds = receiptDrafts.flatMap((item) => item.phoiIds);
            if (new Set(submittedPhoiIds).size !== submittedPhoiIds.length) {
                throw Object.assign(new Error('Một vật tư lỗi không được nằm trong nhiều phiếu nhập dự kiến.'), { number: 52120 });
            }
            const coverage = await new sql.Request(transaction)
                .input('PhieuId', sql.Int, phieuId)
                .input('PhoiJson', sql.NVarChar(sql.MAX), JSON.stringify(submittedPhoiIds))
                .query(`SELECT
                    (SELECT COUNT(*) FROM dbo.DOI_TRA_PHOI_LOI_PHOI WHERE PhieuId=@PhieuId) AS RequiredCount,
                    (SELECT COUNT(*) FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoi
                        JOIN OPENJSON(@PhoiJson) WITH(Id INT '$') selected ON selected.Id=phoi.Id
                        WHERE phoi.PhieuId=@PhieuId) AS SubmittedCount;`);
            const coverageRow = coverage.recordset?.[0];
            if (Number(coverageRow?.RequiredCount) !== Number(coverageRow?.SubmittedCount)) {
                throw Object.assign(new Error('Mỗi vật tư lỗi phải được xếp vào đúng một phiếu nhập dự kiến.'), { number: 52120 });
            }
        }

        let generatedIssues = [];
        let generatedReceipt = null;
        if (actionCode === 'B7_CONFIRM') {
            generatedIssues = await createDoiTraSupplementIssues(transaction, {
                phieuId,
                userId: userIdOf(req),
                soPhieu: workflowAction.SoPhieu
            });
        } else if (isKcsCompletion) {
            generatedReceipt = await createDoiTraDefectReceipts(transaction, {
                phieuId,
                userId: userIdOf(req),
                soPhieu: workflowAction.SoPhieu,
                receipts: receiptDrafts.map((item) => ({
                    ...item,
                    phoiItems: item.phoiIds.map((phoiId) => ({
                        phoiId,
                        suggestedProcessId: positiveId(item.suggestedProcessByPhoi?.[phoiId])
                    }))
                }))
            });
        } else if (actionCode === 'KHO_CONFIRM') {
            generatedReceipt = await confirmDefectReceiptByWarehouse(transaction, {
                phieuId,
                userId: userIdOf(req)
            });
        } else if (actionCode === 'STOCK_CARD_RECORD') {
            generatedReceipt = await recordDefectReceiptStockCard(transaction, {
                phieuId,
                userId: userIdOf(req)
            });
        } else if (actionCode === 'TBP_RETURN') {
            await cancelDraftDefectReceipt(transaction, {
                phieuId,
                userId: userIdOf(req),
                reason: ghiChu
            });
            await cancelDraftSupplementIssuesForKcsReturn(transaction, {
                phieuId,
                userId: userIdOf(req),
                reason: ghiChu
            });
        }

        const result = await new sql.Request(transaction)
            .input('PhieuId', sql.Int, phieuId)
            .input('UserId', sql.Int, userIdOf(req))
            .input('ActionCode', sql.NVarChar(80), actionCode)
            .input('FromStatus', sql.NVarChar(80), workflowAction.TrangThai)
            .input('ToStatus', sql.NVarChar(80), workflowAction.ToStatusCode)
            .input('ToStepId', sql.Int, workflowAction.ToStepId)
            .input('GhiChu', sql.NVarChar(1000), ghiChu)
            .query(`
                IF @ActionCode IN (N'KCS_SUBMIT',N'KCS_RESUBMIT')
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI WHERE PhieuId=@PhieuId)
                        THROW 52110, N'Phiếu phải có ít nhất một loại phôi.', 1;
                    UPDATE phoiRow
                    SET KcsId=@UserId,
                        TenKcs=COALESCE(NULLIF(inspector.FullName,N''),inspector.Username),
                        MaBoPhanKcs=inspectorDepartment.MaBoPhan,
                        TenBoPhanKcs=inspectorDepartment.TenBoPhan
                    FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
                    INNER JOIN dbo.USERS inspector ON inspector.Id=@UserId
                    LEFT JOIN dbo.DM_BO_PHAN inspectorDepartment ON inspectorDepartment.Id=inspector.BoPhanId
                    WHERE phoiRow.PhieuId=@PhieuId;
                    IF EXISTS (
                        SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
                        JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId=phoiRow.PhieuId
                        WHERE phoiRow.PhieuId=@PhieuId AND (
                            phoiRow.SoLuongKiem<=0 OR phoiRow.SoLuongPhoiLoi<=0
                            OR phoiRow.SoLuongPhoiLoi>phoiRow.SoLuongKiem
                            OR NOT EXISTS (
                                SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN traceRow
                                WHERE traceRow.PhoiId=phoiRow.Id)
                            OR EXISTS (
                                SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN traceRow
                                WHERE traceRow.PhoiId=phoiRow.Id AND (
                                    (planRow.RequireLenhXuatVatTu=1 AND NULLIF(LTRIM(RTRIM(traceRow.SoLenhXuatVT)),N'') IS NULL)
                                    OR NULLIF(LTRIM(RTRIM(traceRow.LotSanXuat)),N'') IS NULL
                                    OR traceRow.DonViTaoPhoiId IS NULL OR traceRow.NgayTaoPhoi IS NULL
                                    OR NULLIF(LTRIM(RTRIM(traceRow.ToSanXuat)),N'') IS NULL
                                    OR NULLIF(LTRIM(RTRIM(traceRow.CongNhanSanXuat)),N'') IS NULL))
                        )
                    ) THROW 52111, N'Mỗi loại phôi phải có đủ số lượng, lot sản xuất và thông tin tem truy nguyên.', 1;
                    IF EXISTS (
                        SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
                        JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId=phoiRow.PhieuId
                        JOIN dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN traceRow ON traceRow.PhoiId=phoiRow.Id
                        LEFT JOIN dbo.DM_BO_PHAN sourceDepartment
                          ON sourceDepartment.Id=traceRow.DonViTaoPhoiId AND ISNULL(sourceDepartment.TrangThai,1)=1
                        WHERE phoiRow.PhieuId=@PhieuId
                          AND sourceDepartment.Id IS NULL
                    ) THROW 52118, N'Đơn vị tạo phôi không còn hoạt động.', 1;
                    IF EXISTS (
                        SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
                        WHERE phoiRow.PhieuId=@PhieuId AND NOT EXISTS (
                            SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT defectRow WHERE defectRow.PhoiId=phoiRow.Id
                        )
                    ) THROW 52112, N'Mỗi loại phôi phải có ít nhất một lỗi.', 1;
                    IF EXISTS (
                        SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT defectRow
                        JOIN dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow ON phoiRow.Id=defectRow.PhoiId
                        LEFT JOIN dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN traceRow
                          ON traceRow.PhoiId=defectRow.PhoiId AND traceRow.ManualLxvtKey=defectRow.ManualLxvtKey
                        WHERE phoiRow.PhieuId=@PhieuId AND traceRow.Id IS NULL
                    ) THROW 52120, N'Mỗi lỗi phải được gán với một tem truy nguyên hợp lệ.', 1;
                    IF EXISTS (
                        SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT defectRow
                        JOIN dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow ON phoiRow.Id=defectRow.PhoiId
                        WHERE phoiRow.PhieuId=@PhieuId AND (
                            defectRow.NhomLoiId IS NULL OR defectRow.DefectId IS NULL
                            OR defectRow.SoLuongLoi<=0 OR defectRow.SoLuongLoi>phoiRow.SoLuongPhoiLoi
                        )
                    ) THROW 52113, N'Phiếu có nhóm lỗi, lỗi hoặc số lượng lỗi không hợp lệ.', 1;
                    IF EXISTS (
                        SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT defectRow
                        JOIN dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow ON phoiRow.Id=defectRow.PhoiId
                        WHERE phoiRow.PhieuId=@PhieuId
                          AND (defectRow.BoPhanGayLoiSource NOT IN (N'NOI_BO',N'TAG_SYSTEM',N'NHA_CUNG_CAP')
                               OR defectRow.BoPhanGayLoiSourceId IS NULL)
                    ) THROW 52119, N'Mỗi lỗi phải có bộ phận, nhà thầu hoặc nhà cung cấp gây lỗi hợp lệ.', 1;
                    UPDATE phieu SET
                        TrangThai=@ToStatus,CurrentStepId=@ToStepId,
                        KcsCompletedBy=@UserId,
                        KcsCompletedAt=SYSDATETIME(),TbpKcsConfirmedBy=NULL,TbpKcsConfirmedAt=NULL,
                        LyDoTraLai=NULL,UpdatedAt=SYSDATETIME()
                        ,RequiresExecutiveApproval=CASE WHEN @ToStatus=N'CHO_THIET_LAP_KPH'
                            THEN ISNULL((SELECT TOP 1 CAST(BitValue AS bit)
                                FROM dbo.SYSTEM_SETTINGS WHERE SettingKey=N'REQUIRE_EXECUTIVE_APPROVAL_KPH'),0)
                            ELSE RequiresExecutiveApproval END
                    FROM dbo.DOI_TRA_PHOI_LOI phieu
                    WHERE phieu.Id=@PhieuId;
                END
                ELSE IF @ActionCode=N'TBP_CONFIRM'
                BEGIN
                    UPDATE phieu SET TrangThai=@ToStatus,CurrentStepId=@ToStepId,
                        TbpKcsConfirmedBy=@UserId,TbpKcsConfirmedAt=SYSDATETIME(),LyDoTraLai=NULL,
                        RequiresExecutiveApproval=ISNULL((SELECT TOP 1 CAST(BitValue AS bit)
                            FROM dbo.SYSTEM_SETTINGS WHERE SettingKey=N'REQUIRE_EXECUTIVE_APPROVAL_KPH'),0),
                        UpdatedAt=SYSDATETIME()
                    FROM dbo.DOI_TRA_PHOI_LOI phieu
                    WHERE phieu.Id=@PhieuId;
                END
                ELSE IF @ActionCode=N'TBP_RETURN'
                    UPDATE dbo.DOI_TRA_PHOI_LOI SET TrangThai=@ToStatus,CurrentStepId=@ToStepId,
                        KcsCompletedBy=NULL,KcsCompletedAt=NULL,TbpKcsConfirmedBy=NULL,TbpKcsConfirmedAt=NULL,
                        LyDoTraLai=@GhiChu,UpdatedAt=SYSDATETIME() WHERE Id=@PhieuId;
                ELSE IF @ActionCode=N'B7_CONFIRM'
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI WHERE PhieuId=@PhieuId)
                        THROW 52115, N'Phiếu không có loại phôi để xác nhận số lượng đổi trả.', 1;
                    IF EXISTS (
                        SELECT 1
                        FROM (
                            SELECT phoiRow.SourceVatTuId,MAX(CONVERT(INT,CEILING(
                                CONVERT(DECIMAL(38,10),phoiRow.SoLuongPhoiLoi) /
                                CASE WHEN TRY_CONVERT(DECIMAL(18,6),NULLIF(LTRIM(RTRIM(phoiRow.SoPhoi)),N''))>0
                                    THEN TRY_CONVERT(DECIMAL(18,6),NULLIF(LTRIM(RTRIM(phoiRow.SoPhoi)),N''))
                                    ELSE CONVERT(DECIMAL(18,6),1) END
                            ))) AS SoLuongBoLoi
                            FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
                            WHERE phoiRow.PhieuId=@PhieuId
                            GROUP BY phoiRow.SourceVatTuId
                        ) materialGroup
                        LEFT JOIN dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC quota
                          ON quota.PhieuId=@PhieuId AND quota.SourceVatTuId=materialGroup.SourceVatTuId
                        WHERE quota.Id IS NULL OR quota.SoLuongDoiTra IS NULL OR quota.SoLuongDoiTra<=0
                    ) THROW 52116, N'Vui lòng nhập số lượng đổi trả lớn hơn 0 cho tất cả vật tư.', 1;

                    UPDATE dbo.DOI_TRA_PHOI_LOI SET TrangThai=@ToStatus,
                        CurrentStepId=CASE WHEN @ToStatus=N'HOAN_TAT' THEN NULL ELSE CurrentStepId END,
                        DinhMucTrangThai=N'DA_XAC_NHAN',DinhMucCurrentStepId=NULL,
                        B7ConfirmedBy=@UserId,B7ConfirmedAt=SYSDATETIME(),UpdatedAt=SYSDATETIME()
                    WHERE Id=@PhieuId;
                END
                ELSE IF @ActionCode IN(N'KHO_CONFIRM',N'STOCK_CARD_RECORD')
                    UPDATE dbo.DOI_TRA_PHOI_LOI SET TrangThai=@ToStatus,
                        CurrentStepId=CASE WHEN @ToStatus=N'HOAN_TAT' THEN NULL ELSE CurrentStepId END,
                        UpdatedAt=SYSDATETIME() WHERE Id=@PhieuId;

                INSERT dbo.DOI_TRA_PHOI_LOI_HISTORY
                    (PhieuId,ActionCode,FromStatus,ToStatus,ActionBy,GhiChu)
                VALUES (@PhieuId,@ActionCode,@FromStatus,@ToStatus,@UserId,@GhiChu);
                SELECT Id,SoPhieu,TrangThai,RowVersion FROM dbo.DOI_TRA_PHOI_LOI WHERE Id=@PhieuId;
            `);
        await transaction.commit();
        started = false;
        res.json(encodeBinary({ success: true, phieu: result.recordset?.[0], generatedIssues, generatedReceipt }));
    } catch (error) {
        if (transaction && started) {
            try { await transaction.rollback(); } catch (rollbackError) { console.error('DoiTraPhoiLoi action rollback error:', rollbackError); }
        }
        console.error('DoiTraPhoiLoi workflow action error:', error);
        const number = Number(error?.number || error?.originalError?.info?.number);
        const status = (number >= 52110 && number <= 52122)
            || (number >= ERP_VALIDATION_ERROR_MIN && number <= ERP_VALIDATION_ERROR_MAX)
            || (number >= RECEIPT_VALIDATION_ERROR_MIN && number <= RECEIPT_VALIDATION_ERROR_MAX) ? 422 : 409;
        res.status(status).json({ message: errorMessage(error, 'Không thực hiện được hành động workflow') });
    }
});

router.put('/:id/receipt/btp-type', authorizeDoiTraAccess, async (req, res) => {
    const phieuId = positiveId(req.params.id);
    const processId = positiveId(req.body?.quyTrinhSanXuatId);
    if (!phieuId || !processId || processId > 255) {
        return res.status(400).json({ message: 'Phiếu hoặc loại BTP không hợp lệ' });
    }
    try {
        const pool = await poolPromise;
        const permissionResult = await pool.request()
            .input('PhieuId', sql.Int, phieuId)
            .query(`SELECT NguoiLapId,KcsCompletedBy,TrangThai FROM dbo.DOI_TRA_PHOI_LOI WHERE Id=@PhieuId;`);
        const phieu = permissionResult.recordset?.[0];
        if (!phieu) return res.status(404).json({ message: 'Không tìm thấy phiếu đổi trả phôi lỗi' });
        const userId = userIdOf(req);
        const isKcsOwner = hasPermission(req.user, 'THUC_HIEN_KIEM')
            && [Number(phieu.NguoiLapId), Number(phieu.KcsCompletedBy)].includes(userId);
        if (!isAdmin(req.user) && !isKcsOwner) {
            return res.status(403).json({ message: 'Chỉ KCS thực hiện phiếu được thay đổi loại BTP' });
        }
        if (phieu.TrangThai === 'DA_HUY') {
            return res.status(409).json({ message: 'Phiếu đã hủy, không thể thay đổi loại BTP' });
        }
        const receipt = await updateDraftDefectReceiptProcess(pool, { phieuId, userId, processId });
        return res.json(encodeBinary({ success: true, receipt }));
    } catch (error) {
        console.error('DoiTraPhoiLoi update receipt BTP type error:', error);
        const number = Number(error?.number || error?.originalError?.info?.number);
        return res.status(number >= RECEIPT_VALIDATION_ERROR_MIN && number <= RECEIPT_VALIDATION_ERROR_MAX ? 422 : 409)
            .json({ message: errorMessage(error, 'Không cập nhật được loại BTP của phiếu nhập') });
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
                SELECT phieu.*,nhom.SoPhieu AS SoPhieuNhom,nhom.NgayLap AS NgayLapNhom,
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
                JOIN dbo.DOI_TRA_PHOI_LOI_NHOM nhom ON nhom.Id=phieu.NhomPhieuId
                LEFT JOIN dbo.USERS creator ON creator.Id = phieu.NguoiLapId
                LEFT JOIN dbo.DM_BO_PHAN kcsDepartment ON kcsDepartment.Id = phieu.BoPhanKcsId
                LEFT JOIN dbo.DM_BO_PHAN responsibleDepartment ON responsibleDepartment.Id = phieu.BoPhanGayLoiId
                LEFT JOIN dbo.USERS kcsActor ON kcsActor.Id=phieu.KcsCompletedBy
                LEFT JOIN dbo.USERS tbpActor ON tbpActor.Id=phieu.TbpKcsConfirmedBy
                LEFT JOIN dbo.USERS b7Actor ON b7Actor.Id=phieu.B7ConfirmedBy
                WHERE phieu.Id = @PhieuId;

                SELECT planRow.*,
                    sxbtUnit.SxbtUnitCode,
                    btpPreview.ExpectedBtpCount,btpPreview.ExpectedBtpCode,btpPreview.ExpectedBtpName,
                    btpPreview.ExpectedProductionLot,
                    currentPlan.ID_QuyTrinhSanXuat AS ExpectedProcessId,
                    currentProcess.Ten_QuyTrinhSanXuat AS ExpectedProcessName
                FROM dbo.DOI_TRA_PHOI_LOI_PLAN planRow
                LEFT JOIN TAG_QLSX.dbo.KeHoachSanXuat currentPlan
                  ON currentPlan.ID_KeHoachSanXuat=TRY_CONVERT(INT,planRow.PlanID)
                 AND currentPlan.TonTai=1
                LEFT JOIN TAG_QTKD.dbo.DM_QuyTrinhSanXuat currentProcess
                  ON currentProcess.ID_QuyTrinhSanXuat=currentPlan.ID_QuyTrinhSanXuat
                OUTER APPLY(SELECT TOP (1) contractor.Ma_NhaThau AS SxbtUnitCode
                    FROM TAG_QTKD.dbo.DM_NhaThau contractor
                    WHERE contractor.ID_BoPhan=currentPlan.ID_BoPhan) sxbtUnit
                OUTER APPLY(
                    SELECT COUNT(*) AS ExpectedBtpCount,
                        MAX(orderProduct.ItemCode) AS ExpectedBtpCode,
                        MAX(orderProduct.Ten_SanPham) AS ExpectedBtpName,
                        MAX(productionLot.So_LoSanXuat) AS ExpectedProductionLot
                    FROM TAG_QLSX.dbo.KeHoachSanXuat_SanPham planProduct
                    JOIN TAG_QTKD.dbo.DonHang_SanPham orderProduct
                      ON orderProduct.ID_DonHang_SanPham=planProduct.ID_DonHang_SanPham
                     AND orderProduct.TonTai=1
                    JOIN TAG_QTKD.dbo.DonHang_LoSanXuat productionLot
                      ON productionLot.ID_DonHang_LoSanXuat=planProduct.ID_DonHang_LoSanXuat
                     AND productionLot.TonTai=1
                    WHERE planProduct.ID_KeHoachSanXuat=TRY_CONVERT(INT,planRow.PlanID)
                ) btpPreview
                WHERE planRow.PhieuId=@PhieuId
                ORDER BY planRow.Id;

                ;WITH rankedHistory AS (
                    SELECT history.*,
                        ROW_NUMBER() OVER (
                            PARTITION BY history.ActionCode,
                                ISNULL(history.FromStatus,N''), ISNULL(history.ToStatus,N'')
                            ORDER BY history.CreatedAt DESC, history.Id DESC
                        ) AS ActionRank
                    FROM dbo.DOI_TRA_PHOI_LOI_HISTORY history
                    WHERE history.PhieuId = @PhieuId
                )
                SELECT history.Id,history.PhieuId,history.ActionCode,history.FromStatus,
                    history.ToStatus,history.ActionBy,history.GhiChu,history.CreatedAt,
                    COALESCE(NULLIF(actor.FullName, N''), actor.Username) AS TenNguoiThucHien
                FROM rankedHistory history
                LEFT JOIN dbo.USERS actor ON actor.Id = history.ActionBy
                WHERE history.ActionCode NOT IN (N'SAVE_PHOI_DRAFT',N'SAVE_RETURN_QUANTITY_DRAFT')
                   OR history.ActionRank = 1
                ORDER BY history.CreatedAt, history.Id;

                SELECT phoiRow.*,unitRow.ID_DonViTinh AS CurrentDonViTinhId,
                    unitRow.Ten_DonViTinh AS CurrentTenDonViTinh,
                    JSON_QUERY((
                        SELECT traceRow.*
                        FROM dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN traceRow
                        WHERE traceRow.PhoiId=phoiRow.Id
                        ORDER BY traceRow.SortOrder,traceRow.Id
                        FOR JSON PATH
                    )) AS IssueTraceabilitiesJson
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

                SELECT issueLink.Id,issueLink.SourceLenhXuatVTId,issueLink.SoLenhXuatVT,
                    issueLink.SourceKhoXuatId,warehouse.Ten_Kho AS TenKhoXuat,
                    issueLink.TrangThai,issueLink.CreatedAt,issueLink.CancelledAt,issueLink.CancelReason,
                    issue.TrangThai AS ErpTrangThai,issue.TonTai
                FROM dbo.DOI_TRA_PHOI_LOI_LENH_XUAT_VT issueLink
                LEFT JOIN TAG_QTKD.dbo.LenhXuatVT issue
                  ON issue.ID_LenhXuatVT=issueLink.SourceLenhXuatVTId
                LEFT JOIN TAG_QTKD.dbo.DM_Kho warehouse
                  ON warehouse.ID_Kho=issueLink.SourceKhoXuatId
                WHERE issueLink.PhieuId=@PhieuId
                ORDER BY CASE WHEN issueLink.TrangThai=N'ACTIVE' THEN 0 ELSE 1 END,
                    issueLink.CreatedAt DESC,issueLink.Id DESC;

                SELECT receiptLink.Id,receiptLink.SourcePhieuNhapBtpId,receiptLink.SoPhieuNhapBtp,
                    receiptLink.SoLuongBtpLoi,receiptLink.SourceKhoNhapId,warehouse.Ten_Kho AS TenKhoNhap,
                    receiptLink.SourceQuyTrinhSanXuatId,
                    processRow.KyHieu_QuyTrinhSanXuat AS MaQuyTrinhSanXuat,
                    processRow.Ten_QuyTrinhSanXuat,
                    receiptLink.TrangThai,receiptLink.CreatedAt,receiptLink.CancelledAt,receiptLink.CancelReason,
                    receiptLink.WarehouseConfirmedBy,receiptLink.WarehouseConfirmedAt,
                    COALESCE(NULLIF(warehouseActor.FullName,N''),warehouseActor.Username) AS TenKhoXacNhan,
                    receiptLink.StockCardRecordedBy,receiptLink.StockCardRecordedAt,
                    COALESCE(NULLIF(stockCardActor.FullName,N''),stockCardActor.Username) AS TenNguoiGhiTheKho,
                    receipt.TrangThai AS ErpTrangThai,receipt.TonTai,
                    orderProduct.ItemCode AS MaBtp,orderProduct.Ten_SanPham AS TenBtp,
                    productionLot.So_LoSanXuat AS SoLoSanXuat
                FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP receiptLink
                LEFT JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt
                  ON receipt.ID_PhieuNhapBTP=receiptLink.SourcePhieuNhapBtpId
                LEFT JOIN TAG_QTKD.dbo.PhieuNhapBTP_ChiTiet receiptDetail
                  ON receiptDetail.ID_PhieuNhapBTP=receipt.ID_PhieuNhapBTP
                LEFT JOIN TAG_QTKD.dbo.DonHang_SanPham orderProduct
                  ON orderProduct.ID_DonHang_SanPham=receiptDetail.ID_DonHang_SanPham
                LEFT JOIN TAG_QTKD.dbo.DonHang_LoSanXuat productionLot
                  ON productionLot.ID_DonHang_LoSanXuat=receiptDetail.ID_DonHang_LoSanXuat
                LEFT JOIN TAG_QTKD.dbo.DM_Kho warehouse ON warehouse.ID_Kho=receiptLink.SourceKhoNhapId
                LEFT JOIN TAG_QTKD.dbo.DM_QuyTrinhSanXuat processRow
                  ON processRow.ID_QuyTrinhSanXuat=receiptLink.SourceQuyTrinhSanXuatId
                LEFT JOIN dbo.USERS warehouseActor ON warehouseActor.Id=receiptLink.WarehouseConfirmedBy
                LEFT JOIN dbo.USERS stockCardActor ON stockCardActor.Id=receiptLink.StockCardRecordedBy
                WHERE receiptLink.PhieuId=@PhieuId
                ORDER BY CASE WHEN receiptLink.TrangThai=N'ACTIVE' THEN 0 ELSE 1 END,
                    receiptLink.CreatedAt DESC,receiptLink.Id DESC;

                SELECT warehouse.ID_Kho AS Id,warehouse.Ten_Kho AS TenKho
                FROM TAG_QTKD.dbo.DM_Kho warehouse
                WHERE warehouse.SuDung=1 AND warehouse.TonTai=1
                ORDER BY warehouse.Ten_Kho,warehouse.ID_Kho;

                SELECT child.Id,child.SoPhieu,child.ThuTuKeHoach,
                    ROW_NUMBER() OVER(ORDER BY child.ThuTuKeHoach,child.Id) AS ThuTuHienThi,child.TrangThai,
                    child.DinhMucTrangThai,planRow.PlanID,planRow.PlanNo,planRow.OrderCode,
                    planRow.ProductCode,planRow.ProductName,planRow.OperationCode,planRow.OperationName,
                    planRow.RequiresB7,receiptLink.SoPhieuNhapBtp,receiptLink.WarehouseConfirmedAt,
                    receipt.TrangThai AS PhieuNhapErpTrangThai
                FROM dbo.DOI_TRA_PHOI_LOI currentRow
                JOIN dbo.DOI_TRA_PHOI_LOI child ON child.NhomPhieuId=currentRow.NhomPhieuId
                JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId=child.Id
                LEFT JOIN dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP receiptLink
                  ON receiptLink.PhieuId=child.Id AND receiptLink.TrangThai=N'ACTIVE'
                LEFT JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt
                  ON receipt.ID_PhieuNhapBTP=receiptLink.SourcePhieuNhapBtpId
                WHERE currentRow.Id=@PhieuId
                ORDER BY child.ThuTuKeHoach,child.Id;

                SELECT processRow.ID_QuyTrinhSanXuat AS Id,
                    processRow.KyHieu_QuyTrinhSanXuat AS MaQuyTrinh,
                    processRow.Ten_QuyTrinhSanXuat AS TenQuyTrinh
                FROM TAG_QTKD.dbo.DM_QuyTrinhSanXuat processRow
                ORDER BY processRow.Ten_QuyTrinhSanXuat,processRow.ID_QuyTrinhSanXuat;

                SELECT phoi.Id AS PhoiId,phoi.MaVatTu,phoi.TenLoaiPhoi,
                    phoi.SourceVatTuId,phoi.SoLuongPhoiLoi,phoi.SoPhoi,
                    selectedMaterial.CapCho_QuyTrinhSanXuat AS SuggestedProcessId,
                    suggestedProcess.KyHieu_QuyTrinhSanXuat AS SuggestedProcessCode,
                    suggestedProcess.Ten_QuyTrinhSanXuat AS SuggestedProcessName,
                    ISNULL(selectedMaterial.MappingCount,0) AS MappingCount,
                    CONVERT(DECIMAL(18,2),CEILING(CONVERT(DECIMAL(38,10),phoi.SoLuongPhoiLoi)/
                        CASE WHEN TRY_CONVERT(DECIMAL(18,6),NULLIF(LTRIM(RTRIM(phoi.SoPhoi)),N''))>0
                            THEN TRY_CONVERT(DECIMAL(18,6),NULLIF(LTRIM(RTRIM(phoi.SoPhoi)),N''))
                            ELSE CONVERT(DECIMAL(18,6),1) END)) AS SuggestedQuantity
                FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoi
                JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId=phoi.PhieuId
                OUTER APPLY(SELECT TOP (1) productionOrder.ID_DonHang
                    FROM TAG_QLSX.dbo.KeHoachSanXuat productionPlan
                    JOIN TAG_QLSX.dbo.LenhSanXuat productionOrder
                      ON productionOrder.ID_LenhSanXuat=productionPlan.ID_LenhSanXuat
                    WHERE productionPlan.ID_KeHoachSanXuat=TRY_CONVERT(INT,planRow.PlanID)
                      AND productionPlan.TonTai=1 AND productionOrder.TonTai=1) orderContext
                OUTER APPLY(SELECT TOP (1) orderMaterial.CapCho_QuyTrinhSanXuat,
                        COUNT(*) OVER() AS MappingCount
                    FROM TAG_QTKD.dbo.DonHang_VatTu orderMaterial
                    WHERE orderMaterial.ID_DonHang=orderContext.ID_DonHang
                      AND orderMaterial.ID_VatTu=phoi.SourceVatTuId
                      AND orderMaterial.TonTai=1
                      AND orderMaterial.CapCho_QuyTrinhSanXuat IS NOT NULL
                    ORDER BY orderMaterial.ID_DonHang_VatTu) selectedMaterial
                LEFT JOIN TAG_QTKD.dbo.DM_QuyTrinhSanXuat suggestedProcess
                  ON suggestedProcess.ID_QuyTrinhSanXuat=selectedMaterial.CapCho_QuyTrinhSanXuat
                WHERE phoi.PhieuId=@PhieuId
                ORDER BY phoi.SortOrder,phoi.Id;
            `);
        const phieu = result.recordsets[0]?.[0];
        if (!phieu) return res.status(404).json({ message: 'Không tìm thấy phiếu đổi trả phôi lỗi' });
        const planSnapshot = result.recordsets[1]?.[0] || {};
        const userId = userIdOf(req);
        const phoiItems = (result.recordsets[3] || []).map((item) => {
            let issueTraceabilities = [];
            try { issueTraceabilities = JSON.parse(item.IssueTraceabilitiesJson || '[]'); } catch { issueTraceabilities = []; }
            return {
                ...item,
                issueTraceabilities,
                defects: (result.recordsets[4] || []).filter((defect) => Number(defect.PhoiId) === Number(item.Id))
            };
        });
        const canEditPhoi = ['TAO_MOI', 'TRA_LAI_KCS'].includes(phieu.TrangThai)
            && (isAdmin(req.user) || (
                Number(phieu.NguoiLapId) === userId
                && hasPermission(req.user, 'THUC_HIEN_KIEM')
            ));
        const b7Actor = await isB7Actor(pool, req.user);
        const issueLinks = result.recordsets[9] || [];
        const receiptLinks = result.recordsets[10] || [];
        const workflowVersion = Number(result.recordsets[5]?.[0]?.VersionNo || 0);
        const hasActiveIssue = issueLinks.some((item) => item.TrangThai === 'ACTIVE');
        const canWorkB7 = Boolean(planSnapshot.RequiresB7) && canB7Work({
            status: phieu.TrangThai,
            workflowReadyAt: workflowVersion >= 6 ? phieu.KcsCompletedAt : phieu.TbpKcsConfirmedAt,
            dinhMucStatus: phieu.DinhMucTrangThai,
            hasActiveIssue
        });
        const activeReceipts = receiptLinks.filter((item) => item.TrangThai === 'ACTIVE');
        const activeReceipt = activeReceipts[0];
        const canEditReceiptBtpType = activeReceipts.length === 1
            && Number(activeReceipt.TonTai) === 1
            && Number(activeReceipt.ErpTrangThai) === 0
            && phieu.TrangThai !== 'DA_HUY'
            && (isAdmin(req.user) || (hasPermission(req.user, 'THUC_HIEN_KIEM')
                && [Number(phieu.NguoiLapId), Number(phieu.KcsCompletedBy)].includes(userId)));
        const canConfirmWarehouse = workflowVersion >= 6
            && Boolean(phieu.KcsCompletedAt)
            && phieu.TrangThai !== 'DA_HUY'
            && activeReceipts.length > 0
            && activeReceipts.every((item) => Number(item.TonTai) === 1
                && Number(item.ErpTrangThai) === 0)
            && activeReceipts.every((item) => !item.WarehouseConfirmedAt)
            && (isAdmin(req.user) || hasPermission(req.user, 'XAC_NHAN_KHO_SXBT'));
        const canRecordStockCard = workflowVersion >= 6
            && Boolean(phieu.KcsCompletedAt)
            && phieu.TrangThai !== 'DA_HUY'
            && activeReceipts.length > 0
            && activeReceipts.every((item) => Number(item.TonTai) === 1
                && [4, 5].includes(Number(item.ErpTrangThai)))
            && activeReceipts.some((item) => Number(item.ErpTrangThai) === 4
                && !item.StockCardRecordedAt)
            && hasPermission(req.user, 'GHI_THE_KHO');
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
            doiTraItems: result.recordsets[7] || [],
            lenhXuatVatTuItems: issueLinks,
            phieuNhapBtpItems: receiptLinks,
            warehouses: result.recordsets[11] || [],
            siblingPlans: result.recordsets[12] || [],
            btpTypes: result.recordsets[13] || [],
            receiptSuggestions: result.recordsets[14] || [],
            capabilities: {
                canCancel: phieu.TrangThai === 'TAO_MOI' && canEditPhoi,
                canEditPhoi,
                canEditReceiptBtpType,
                canEditDinhMuc: canWorkB7 && b7Actor,
                canSaveDinhMuc: canWorkB7 && b7Actor,
                canConfirmDinhMuc: canWorkB7 && b7Actor,
                canConfirmWarehouse,
                canRecordStockCard
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

                UPDATE groupRow SET KphPhieuId=replacement.Id,UpdatedAt=SYSDATETIME()
                FROM dbo.DOI_TRA_PHOI_LOI_NHOM groupRow
                CROSS APPLY(SELECT TOP 1 sibling.Id FROM dbo.DOI_TRA_PHOI_LOI sibling
                    WHERE sibling.NhomPhieuId=groupRow.Id AND sibling.Id<>@PhieuId
                      AND sibling.TrangThai<>N'DA_HUY'
                    ORDER BY sibling.ThuTuKeHoach,sibling.Id) replacement
                WHERE groupRow.KphPhieuId=@PhieuId;

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
                DECLARE @SoPhieu NVARCHAR(100),@SnapshotJson NVARCHAR(MAX),@NhomPhieuId INT,@DeletedCount INT;
                SELECT @SoPhieu=SoPhieu,@NhomPhieuId=NhomPhieuId
                FROM dbo.DOI_TRA_PHOI_LOI WITH (UPDLOCK,HOLDLOCK)
                WHERE Id=@PhieuId;
                IF @SoPhieu IS NULL
                    THROW 52130,N'Không tìm thấy phiếu đổi trả phôi lỗi.',1;
                IF EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_NHOM groupRow
                    WHERE groupRow.Id=@NhomPhieuId AND groupRow.KphPhieuId=@PhieuId)
                   AND EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI sibling
                    WHERE sibling.NhomPhieuId=@NhomPhieuId AND sibling.Id<>@PhieuId)
                    THROW 52133,N'Không thể xóa kế hoạch đang giữ KPH chung. Hãy hủy kế hoạch hoặc xóa các kế hoạch khác trước.',1;
                IF EXISTS(
                    SELECT 1
                    FROM dbo.DOI_TRA_PHOI_LOI_LENH_XUAT_VT issueLink
                    JOIN TAG_QTKD.dbo.LenhXuatVT issue
                      ON issue.ID_LenhXuatVT=issueLink.SourceLenhXuatVTId
                    WHERE issueLink.PhieuId=@PhieuId AND issue.TonTai=1
                ) THROW 52131,N'Phiếu còn lệnh xuất vật tư bổ sung tồn tại trên ERP. Hãy xóa lệnh xuất trước khi xóa phiếu.',1;
                IF EXISTS(
                    SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP receiptLink
                    JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt
                      ON receipt.ID_PhieuNhapBTP=receiptLink.SourcePhieuNhapBtpId
                    WHERE receiptLink.PhieuId=@PhieuId AND receipt.TonTai=1
                ) THROW 52132,N'Phiếu còn phiếu nhập BTP lỗi tồn tại trên ERP. Hãy hủy phiếu nhập trước khi xóa.',1;

                SET @SnapshotJson=(
                    SELECT phieu.*,
                        JSON_QUERY((SELECT planRow.* FROM dbo.DOI_TRA_PHOI_LOI_PLAN planRow WHERE planRow.PhieuId=phieu.Id FOR JSON PATH)) AS Plans,
                        JSON_QUERY((SELECT historyRow.* FROM dbo.DOI_TRA_PHOI_LOI_HISTORY historyRow WHERE historyRow.PhieuId=phieu.Id FOR JSON PATH)) AS History,
                        JSON_QUERY((SELECT quotaRow.* FROM dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC quotaRow WHERE quotaRow.PhieuId=phieu.Id FOR JSON PATH)) AS VatTuDinhMuc,
                        JSON_QUERY((SELECT issueRow.* FROM dbo.DOI_TRA_PHOI_LOI_LENH_XUAT_VT issueRow WHERE issueRow.PhieuId=phieu.Id FOR JSON PATH)) AS LenhXuatVatTu,
                        JSON_QUERY((SELECT receiptRow.* FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP receiptRow WHERE receiptRow.PhieuId=phieu.Id FOR JSON PATH)) AS PhieuNhapBtp,
                        JSON_QUERY((SELECT item.* FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN item WHERE item.PhieuId=phieu.Id FOR JSON PATH)) AS KphYKien,
                        JSON_QUERY((SELECT item.* FROM dbo.DOI_TRA_PHOI_LOI_KPH_XU_LY item WHERE item.PhieuId=phieu.Id FOR JSON PATH)) AS KphXuLy,
                        JSON_QUERY((SELECT item.* FROM dbo.DOI_TRA_PHOI_LOI_KPH_CHI_PHI item WHERE item.PhieuId=phieu.Id FOR JSON PATH)) AS KphChiPhi,
                        JSON_QUERY((SELECT item.* FROM dbo.DOI_TRA_PHOI_LOI_KPH_HANH_DONG item WHERE item.PhieuId=phieu.Id FOR JSON PATH)) AS KphHanhDong,
                        JSON_QUERY((SELECT item.* FROM dbo.DOI_TRA_PHOI_LOI_KPH_REVIEW_HISTORY item WHERE item.PhieuId=phieu.Id FOR JSON PATH)) AS KphReviewHistory,
                        JSON_QUERY((SELECT item.* FROM dbo.DOI_TRA_PHOI_LOI_KPH_BGD_APPROVAL item WHERE item.PhieuId=phieu.Id FOR JSON PATH)) AS KphBgdApproval,
                        JSON_QUERY((SELECT item.* FROM dbo.DOI_TRA_PHOI_LOI_KPH_THEO_DOI item WHERE item.PhieuId=phieu.Id FOR JSON PATH)) AS KphTheoDoi,
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

                DELETE FROM dbo.NOTIFICATIONS
                WHERE ReferenceId=@PhieuId AND Type IN(N'DTP_KPH_OPINION',N'DTP_EXECUTIVE_APPROVAL');
                UPDATE dbo.DOI_TRA_PHOI_LOI_NHOM SET KphPhieuId=NULL,UpdatedAt=SYSDATETIME()
                WHERE Id=@NhomPhieuId AND KphPhieuId=@PhieuId;
                DELETE FROM dbo.DOI_TRA_PHOI_LOI WHERE Id=@PhieuId;
                SET @DeletedCount=@@ROWCOUNT;
                IF @DeletedCount=1 AND NOT EXISTS(
                    SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI WHERE NhomPhieuId=@NhomPhieuId
                ) DELETE dbo.DOI_TRA_PHOI_LOI_NHOM WHERE Id=@NhomPhieuId;
                SELECT @DeletedCount AS DeletedCount;
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
        res.status(number === 52130 ? 404 : [52131, 52132, 52133].includes(number) ? 409 : 500)
            .json({ message: errorMessage(error, 'Không thể xóa phiếu đổi trả phôi lỗi') });
    }
});

module.exports = router;
