const express = require('express');
const sql = require('mssql');
const { poolPromise } = require('../db');
const authenticateToken = require('../middlewares/auth.middleware');
const { canLeadDepartment, getManagedDepartmentIds } = require('../utils/managedDepartments');
const { canActAsExecutive, normalizeExecutiveDecision } = require('../utils/executiveApproval');
const { loadSignatureDataUrlMap } = require('../utils/signatureImage');

const router = express.Router();
router.use(authenticateToken);

const uid = (req) => Number(req.user?.userId || req.user?.id || 0);
const validId = (value) => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const isAdmin = (user) => (user?.permissions || []).includes('QUAN_TRI_DM')
    || (user?.roles || []).some((role) => String(role || '').toUpperCase().includes('ADMIN'));
const has = (user, permission) => (user?.permissions || []).includes(permission);
const isLead = (user) => (user?.roles || []).some((role) => String(role || '').toUpperCase().startsWith('TP_'));
const rowVersion = (value) => {
    const buffer = typeof value === 'string' ? Buffer.from(value, 'base64') : null;
    return buffer?.length === 8 ? buffer : null;
};
const encode = (value) => Buffer.isBuffer(value) ? value.toString('base64')
    : Array.isArray(value) ? value.map(encode)
        : value && typeof value === 'object' && !(value instanceof Date)
            ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) : value;
const editableStatuses = ['CHO_THIET_LAP_KPH', 'CHO_Y_KIEN_KPH', 'CHO_XAC_NHAN_CUOI_KPH'];

async function loadRecord(executor, phieuId, lock = false) {
    const result = await new sql.Request(executor).input('Id', sql.Int, phieuId).query(`
        SELECT p.*,workflow.VersionNo,
            COALESCE(p.BoPhanKcsId,creator.BoPhanId) CreatorDepartmentId,
            COALESCE(NULLIF(confirmer.FullName,N''),confirmer.Username) CreatorConfirmedByName
        FROM dbo.DOI_TRA_PHOI_LOI p ${lock ? 'WITH (UPDLOCK,HOLDLOCK)' : ''}
        JOIN dbo.DOI_TRA_PHOI_LOI_WORKFLOW workflow ON workflow.Id=p.WorkflowId
        LEFT JOIN dbo.USERS creator ON creator.Id=p.NguoiLapId
        LEFT JOIN dbo.USERS confirmer ON confirmer.Id=p.CreatorConfirmedBy
        WHERE p.Id=@Id`);
    return result.recordset?.[0];
}

async function access(executor, req, record) {
    const managed = await getManagedDepartmentIds(executor, uid(req), req.user?.boPhanId);
    const creatorManage = isAdmin(req.user) || uid(req) === Number(record.NguoiLapId)
        || await canLeadDepartment(executor, req.user, record.CreatorDepartmentId);
    const selected = await new sql.Request(executor)
        .input('Id', sql.Int, record.Id)
        .input('Ids', sql.NVarChar(sql.MAX), managed.join(','))
        .query(`SELECT TOP 1 BoPhanId FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN
            WHERE PhieuId=@Id AND IsActive=1 AND BoPhanId IN(
                SELECT TRY_CONVERT(INT,value) FROM STRING_SPLIT(@Ids,',')) ORDER BY Id`);
    return { creatorManage, selectedDepartmentId: Number(selected.recordset?.[0]?.BoPhanId) || null, managed };
}

async function stepId(executor, workflowId, code) {
    const result = await new sql.Request(executor).input('WorkflowId', sql.Int, workflowId)
        .input('Code', sql.NVarChar(80), code)
        .query('SELECT Id FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP WHERE WorkflowId=@WorkflowId AND StepCode=@Code');
    return result.recordset?.[0]?.Id || null;
}

async function addHistory(executor, record, actionCode, toStatus, actorId, note = null) {
    await new sql.Request(executor).input('PhieuId', sql.Int, record.Id)
        .input('ActionCode', sql.NVarChar(80), actionCode).input('FromStatus', sql.NVarChar(80), record.TrangThai)
        .input('ToStatus', sql.NVarChar(80), toStatus).input('Actor', sql.Int, actorId)
        .input('Note', sql.NVarChar(2000), note).query(`
            INSERT dbo.DOI_TRA_PHOI_LOI_HISTORY(PhieuId,ActionCode,FromStatus,ToStatus,ActionBy,GhiChu)
            VALUES(@PhieuId,@ActionCode,@FromStatus,@ToStatus,@Actor,@Note)`);
}

async function returnToSetup(transaction, record, actorId, reason, opinionId = null, departmentId = null, source = 'KPH_RETURN') {
    const setupStep = await stepId(transaction, record.WorkflowId, 'KPH_THIET_LAP');
    await new sql.Request(transaction).input('Id', sql.Int, record.Id).input('Actor', sql.Int, actorId)
        .input('Reason', sql.NVarChar(2000), reason).input('Step', sql.Int, setupStep)
        .input('OpinionId', sql.Int, opinionId).input('DepartmentId', sql.Int, departmentId)
        .input('Round', sql.Int, record.ReviewRound).query(`
            UPDATE dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN SET TrangThai=N'CHO_GUI_LAI',
                ConfirmedBy=NULL,ConfirmedAt=NULL,ConfirmedReviewRound=NULL
            WHERE PhieuId=@Id AND IsActive=1;
            UPDATE dbo.DOI_TRA_PHOI_LOI SET TrangThai=N'CHO_THIET_LAP_KPH',CurrentStepId=@Step,
                ReviewRound=ISNULL(ReviewRound,1)+1,OpinionDepartmentsConfirmedBy=NULL,
                OpinionDepartmentsConfirmedAt=NULL,CreatorConfirmedBy=NULL,CreatorConfirmedAt=NULL,
                LastReturnedBy=@Actor,LastReturnedAt=SYSDATETIME(),LastReturnReason=@Reason,
                LyDoTraLai=@Reason,UpdatedAt=SYSDATETIME() WHERE Id=@Id;
            INSERT dbo.DOI_TRA_PHOI_LOI_KPH_REVIEW_HISTORY
                (PhieuId,YKienId,BoPhanId,ReviewRound,ActionCode,ActorUserId,Reason)
            VALUES(@Id,@OpinionId,@DepartmentId,@Round,N'TRA_LAI_THIET_LAP',@Actor,@Reason);`);
    await addHistory(transaction, record, source, 'CHO_THIET_LAP_KPH', actorId, reason);
}

router.get('/:id/kph', async (req, res) => {
    try {
        const pool = await poolPromise;
        const record = await loadRecord(pool, validId(req.params.id));
        if (!record) return res.status(404).json({ message: 'Không tìm thấy phiếu' });
        if (Number(record.VersionNo) < 5) return res.json({ legacy: true, opinions: [], xuLy: [], chiPhi: [], hanhDong: [], departments: [], capabilities: {} });
        const rights = await access(pool, req, record);
        if (!rights.creatorManage && !rights.selectedDepartmentId && !isAdmin(req.user) && !canActAsExecutive(req.user)
            && !['THUC_HIEN_KIEM', 'XEM_PHIEU_KIEM', 'XAC_NHAN_LOI', 'THEO_DOI_KPH', 'KET_LUAN'].some((permission) => has(req.user, permission))) {
            return res.status(403).json({ message: 'Bạn không có quyền xem KPH của phiếu' });
        }
        const result = await pool.request().input('Id', sql.Int, record.Id).query(`
            SELECT y.*,bp.TenBoPhan,COALESCE(NULLIF(saved.FullName,N''),saved.Username) OpinionSavedByName,
                COALESCE(NULLIF(confirmed.FullName,N''),confirmed.Username) ConfirmedByName
            FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN y
            LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id=y.BoPhanId
            LEFT JOIN dbo.USERS saved ON saved.Id=y.OpinionSavedBy
            LEFT JOIN dbo.USERS confirmed ON confirmed.Id=y.ConfirmedBy
            WHERE y.PhieuId=@Id AND y.IsActive=1 ORDER BY y.SortOrder,y.Id;
            SELECT * FROM dbo.DOI_TRA_PHOI_LOI_KPH_XU_LY WHERE PhieuId=@Id ORDER BY Id;
            SELECT * FROM dbo.DOI_TRA_PHOI_LOI_KPH_CHI_PHI WHERE PhieuId=@Id ORDER BY Id;
            SELECT * FROM dbo.DOI_TRA_PHOI_LOI_KPH_HANH_DONG WHERE PhieuId=@Id ORDER BY Id;
            SELECT followUp.*,COALESCE(NULLIF(actor.FullName,N''),actor.Username) NguoiTheoDoi
              FROM dbo.DOI_TRA_PHOI_LOI_KPH_THEO_DOI followUp LEFT JOIN dbo.USERS actor ON actor.Id=followUp.NguoiTheoDoiId
              WHERE followUp.PhieuId=@Id ORDER BY followUp.Id DESC;
            SELECT approval.*,COALESCE(NULLIF(actor.FullName,N''),actor.Username) ActedByName
              FROM dbo.DOI_TRA_PHOI_LOI_KPH_BGD_APPROVAL approval LEFT JOIN dbo.USERS actor ON actor.Id=approval.ActedBy
              WHERE approval.PhieuId=@Id ORDER BY approval.ActedAt;
            SELECT Id,MaBoPhan,TenBoPhan FROM dbo.DM_BO_PHAN WHERE ISNULL(TrangThai,1)=1 ORDER BY TenBoPhan;`);
        const signatures = await loadSignatureDataUrlMap(pool, [record.CreatorConfirmedBy,
            ...(result.recordsets[0] || []).map((item) => item.ConfirmedBy),
            ...(result.recordsets[4] || []).map((item) => item.NguoiTheoDoiId),
            ...(result.recordsets[5] || []).map((item) => item.ActedBy)]);
        const opinions = (result.recordsets[0] || []).map((item) => ({ ...item,
            HasOpinion: Boolean(item.NoiDung), HasConfirmed: Boolean(item.ConfirmedAt),
            SignatureDataUrl: signatures.get(Number(item.ConfirmedBy)) || null,
            CanSaveOpinion: editableStatuses.includes(record.TrangThai)
                && (rights.creatorManage || rights.managed.includes(Number(item.BoPhanId))),
            CanConfirmOpinion: record.TrangThai === 'CHO_Y_KIEN_KPH'
                && (isAdmin(req.user) || (isLead(req.user) && rights.managed.includes(Number(item.BoPhanId))))
        }));
        const decorate = (rows) => (rows || []).map((item) => ({ ...item,
            CanEdit: editableStatuses.includes(record.TrangThai)
                && (isAdmin(req.user) || Number(item.CreatedBy) === uid(req)) }));
        const evaluation = result.recordsets[4]?.[0] || null;
        if (evaluation) evaluation.SignatureDataUrl = signatures.get(Number(evaluation.NguoiTheoDoiId)) || null;
        res.json(encode({ opinions, xuLy: decorate(result.recordsets[1]), chiPhi: decorate(result.recordsets[2]),
            hanhDong: decorate(result.recordsets[3]), evaluation,
            executiveApprovals: (result.recordsets[5] || []).map((item) => ({ ...item,
                SignatureDataUrl: signatures.get(Number(item.ActedBy)) || null })),
            creatorConfirmedByName: record.CreatorConfirmedByName,
            creatorSignatureDataUrl: signatures.get(Number(record.CreatorConfirmedBy)) || null,
            departments: result.recordsets[6] || [], capabilities: {
                canManage: rights.creatorManage && record.TrangThai === 'CHO_THIET_LAP_KPH',
                canContribute: editableStatuses.includes(record.TrangThai) && (rights.creatorManage || Boolean(rights.selectedDepartmentId)),
                targetDepartmentId: rights.selectedDepartmentId || record.CreatorDepartmentId,
                canCreatorConfirm: record.TrangThai === 'CHO_XAC_NHAN_CUOI_KPH'
                    && (isAdmin(req.user) || await canLeadDepartment(pool, req.user, record.CreatorDepartmentId)),
                canExecutiveApprove: record.TrangThai === 'CHO_BGD_XAC_NHAN' && canActAsExecutive(req.user),
                canFollowUp: record.TrangThai === 'CHO_THEO_DOI' && (isAdmin(req.user)
                    || uid(req) === Number(record.NguoiLapId) || has(req.user, 'THEO_DOI_KPH') || has(req.user, 'KET_LUAN'))
            } }));
    } catch (error) {
        console.error('DTP KPH detail:', error);
        res.status(500).json({ message: error.message || 'Không tải được dữ liệu KPH' });
    }
});

router.put('/:id/kph/opinion-departments', async (req, res) => {
    const departmentIds = [...new Set((req.body?.boPhanIds || []).map(validId).filter(Boolean))];
    const version = rowVersion(req.body?.rowVersion);
    if (!departmentIds.length || !version) return res.status(400).json({ message: 'Chọn ít nhất một bộ phận và tải lại phiên bản phiếu' });
    const pool = await poolPromise; const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
        const record = await loadRecord(transaction, validId(req.params.id), true);
        const rights = record && await access(transaction, req, record);
        if (!record) throw Object.assign(new Error('Không tìm thấy phiếu'), { status: 404 });
        if (!rights.creatorManage || record.TrangThai !== 'CHO_THIET_LAP_KPH') throw Object.assign(new Error('Bạn không thể thiết lập KPH ở trạng thái hiện tại'), { status: 403 });
        const opinionStep = await stepId(transaction, record.WorkflowId, 'KPH_Y_KIEN');
        await new sql.Request(transaction).input('Id', sql.Int, record.Id).input('RV', sql.VarBinary(8), version)
            .input('Ids', sql.NVarChar(sql.MAX), departmentIds.join(',')).input('User', sql.Int, uid(req))
            .input('Step', sql.Int, opinionStep).input('Round', sql.Int, record.ReviewRound).query(`
                IF NOT EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI WHERE Id=@Id AND RowVersion=@RV AND TrangThai=N'CHO_THIET_LAP_KPH')
                    THROW 52201,N'Phiếu đã thay đổi.',1;
                UPDATE dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN SET IsActive=0,TrangThai=N'DA_HUY',RemovedBy=@User,RemovedAt=SYSDATETIME()
                  WHERE PhieuId=@Id AND IsActive=1 AND BoPhanId NOT IN(SELECT TRY_CONVERT(INT,value) FROM STRING_SPLIT(@Ids,','));
                UPDATE dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN SET IsActive=1,TrangThai=N'CHO_GUI_LAI',RemovedBy=NULL,RemovedAt=NULL,
                    ConfirmedBy=NULL,ConfirmedAt=NULL,ConfirmedReviewRound=NULL
                  WHERE PhieuId=@Id AND BoPhanId IN(SELECT TRY_CONVERT(INT,value) FROM STRING_SPLIT(@Ids,','));
                INSERT dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN(PhieuId,BoPhanId,MaBoPhan,TenBoPhan,SortOrder,CreatedBy,TrangThai)
                SELECT @Id,b.Id,b.MaBoPhan,b.TenBoPhan,ROW_NUMBER() OVER(ORDER BY b.TenBoPhan),@User,N'CHO_Y_KIEN'
                  FROM dbo.DM_BO_PHAN b JOIN(SELECT TRY_CONVERT(INT,value) Id FROM STRING_SPLIT(@Ids,',')) selected ON selected.Id=b.Id
                  WHERE ISNULL(b.TrangThai,1)=1 AND NOT EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN y WHERE y.PhieuId=@Id AND y.BoPhanId=b.Id);
                UPDATE dbo.DOI_TRA_PHOI_LOI SET TrangThai=N'CHO_Y_KIEN_KPH',CurrentStepId=@Step,
                    OpinionDepartmentsConfirmedBy=@User,OpinionDepartmentsConfirmedAt=SYSDATETIME(),LyDoTraLai=NULL,UpdatedAt=SYSDATETIME() WHERE Id=@Id;`);
        await addHistory(transaction, record, 'KPH_SETUP', 'CHO_Y_KIEN_KPH', uid(req), `Vòng ${record.ReviewRound}`);
        await new sql.Request(transaction).input('Id', sql.Int, record.Id).input('Ids', sql.NVarChar(sql.MAX), departmentIds.join(','))
            .query(`INSERT dbo.NOTIFICATIONS(UserId,Title,Message,Type,ReferenceId,IsRead,CreatedAt)
                SELECT DISTINCT u.Id,N'Phiếu đổi trả cần ý kiến',N'Bạn có phiếu đổi trả phôi lỗi cần nhập hoặc xác nhận ý kiến.',N'DTP_KPH_OPINION',@Id,0,GETDATE()
                FROM dbo.USERS u WHERE u.TrangThai=1 AND u.BoPhanId IN(SELECT TRY_CONVERT(INT,value) FROM STRING_SPLIT(@Ids,','));`);
        await transaction.commit(); res.json({ success: true });
    } catch (error) { try { await transaction.rollback(); } catch (_) { /* noop */ } res.status(error.status || 409).json({ message: error.message || 'Không cập nhật được bộ phận' }); }
});

const sections = {
    'xu-ly': { table: 'DOI_TRA_PHOI_LOI_KPH_XU_LY', content: 'NoiDung' },
    'chi-phi': { table: 'DOI_TRA_PHOI_LOI_KPH_CHI_PHI', content: 'LoaiChiPhi' },
    'hanh-dong': { table: 'DOI_TRA_PHOI_LOI_KPH_HANH_DONG', content: 'NoiDung' }
};
const sectionPayload = (req) => ({
    content: String(req.body?.noiDung || req.body?.loaiChiPhi || '').trim(),
    value: Number(req.body?.giaTri) || 0, deadline: req.body?.thoiHan || null,
    responsibility: String(req.body?.trachNhiem || '').trim() || null,
    follow: String(req.body?.theoDoi || '').trim() || null
});

router.post('/:id/kph/sections/:section', async (req, res) => {
    const config = sections[req.params.section]; const payload = sectionPayload(req);
    if (!config || !payload.content) return res.status(400).json({ message: 'Nội dung không hợp lệ' });
    try {
        const pool = await poolPromise; const record = await loadRecord(pool, validId(req.params.id)); const rights = record && await access(pool, req, record);
        if (!record) return res.status(404).json({ message: 'Không tìm thấy phiếu' });
        if (!editableStatuses.includes(record.TrangThai) || (!rights.creatorManage && !rights.selectedDepartmentId)) return res.status(403).json({ message: 'Bạn không có quyền nhập nội dung' });
        await pool.request().input('Id', sql.Int, record.Id).input('BP', sql.Int, rights.selectedDepartmentId || record.CreatorDepartmentId)
            .input('User', sql.Int, uid(req)).input('Content', sql.NVarChar(sql.MAX), payload.content)
            .input('Value', sql.Decimal(18, 2), payload.value).input('Deadline', sql.Date, payload.deadline)
            .input('Responsibility', sql.NVarChar(255), payload.responsibility).input('Follow', sql.NVarChar(255), payload.follow).query(
                req.params.section === 'chi-phi'
                    ? `INSERT dbo.${config.table}(PhieuId,BoPhanId,LoaiChiPhi,GiaTri,ThoiHan,TrachNhiem,TheoDoi,CreatedBy) VALUES(@Id,@BP,@Content,@Value,@Deadline,@Responsibility,@Follow,@User)`
                    : `INSERT dbo.${config.table}(PhieuId,BoPhanId,NoiDung,ThoiHan,TrachNhiem,TheoDoi,CreatedBy) VALUES(@Id,@BP,@Content,@Deadline,@Responsibility,@Follow,@User)`);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ message: error.message || 'Không lưu được nội dung' }); }
});

router.patch('/:id/kph/sections/:section/:rowId', async (req, res) => {
    const config = sections[req.params.section]; const payload = sectionPayload(req); const rowId = validId(req.params.rowId);
    if (!config || !rowId || !payload.content) return res.status(400).json({ message: 'Nội dung không hợp lệ' });
    try {
        const pool = await poolPromise; const record = await loadRecord(pool, validId(req.params.id));
        if (!record || !editableStatuses.includes(record.TrangThai)) return res.status(409).json({ message: 'Phiếu đã khóa nội dung' });
        const result = await pool.request().input('Id', sql.Int, record.Id).input('Row', sql.Int, rowId)
            .input('User', sql.Int, uid(req)).input('Admin', sql.Bit, isAdmin(req.user))
            .input('Content', sql.NVarChar(sql.MAX), payload.content).input('Value', sql.Decimal(18, 2), payload.value)
            .input('Deadline', sql.Date, payload.deadline).input('Responsibility', sql.NVarChar(255), payload.responsibility)
            .input('Follow', sql.NVarChar(255), payload.follow).query(req.params.section === 'chi-phi'
                ? `UPDATE dbo.${config.table} SET LoaiChiPhi=@Content,GiaTri=@Value,ThoiHan=@Deadline,TrachNhiem=@Responsibility,TheoDoi=@Follow,UpdatedAt=SYSDATETIME() WHERE Id=@Row AND PhieuId=@Id AND (@Admin=1 OR CreatedBy=@User);SELECT @@ROWCOUNT Changed;`
                : `UPDATE dbo.${config.table} SET NoiDung=@Content,ThoiHan=@Deadline,TrachNhiem=@Responsibility,TheoDoi=@Follow,UpdatedAt=SYSDATETIME() WHERE Id=@Row AND PhieuId=@Id AND (@Admin=1 OR CreatedBy=@User);SELECT @@ROWCOUNT Changed;`);
        if (!result.recordset?.[0]?.Changed) return res.status(403).json({ message: 'Chỉ người nhập hoặc Admin được sửa nội dung' });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ message: error.message || 'Không sửa được nội dung' }); }
});

router.delete('/:id/kph/sections/:section/:rowId', async (req, res) => {
    const config = sections[req.params.section]; const rowId = validId(req.params.rowId);
    if (!config || !rowId) return res.status(400).json({ message: 'Nội dung không hợp lệ' });
    try {
        const pool = await poolPromise; const record = await loadRecord(pool, validId(req.params.id));
        if (!record || !editableStatuses.includes(record.TrangThai)) return res.status(409).json({ message: 'Phiếu đã khóa nội dung' });
        const result = await pool.request().input('Id', sql.Int, record.Id).input('Row', sql.Int, rowId)
            .input('User', sql.Int, uid(req)).input('Admin', sql.Bit, isAdmin(req.user))
            .query(`DELETE dbo.${config.table} WHERE Id=@Row AND PhieuId=@Id AND (@Admin=1 OR CreatedBy=@User);SELECT @@ROWCOUNT Changed;`);
        if (!result.recordset?.[0]?.Changed) return res.status(403).json({ message: 'Chỉ người nhập hoặc Admin được xóa nội dung' });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ message: error.message || 'Không xóa được nội dung' }); }
});

router.put('/:id/kph/opinions/:opinionId/draft', async (req, res) => {
    const content = String(req.body?.noiDung || '').trim();
    if (!content) return res.status(400).json({ message: 'Vui lòng nhập ý kiến' });
    try {
        const pool = await poolPromise; const record = await loadRecord(pool, validId(req.params.id)); const rights = record && await access(pool, req, record);
        if (!record || !editableStatuses.includes(record.TrangThai)) return res.status(409).json({ message: 'Phiếu đã khóa ý kiến' });
        const result = await pool.request().input('Id', sql.Int, record.Id).input('Opinion', sql.Int, validId(req.params.opinionId))
            .input('ManagedIds', sql.NVarChar(sql.MAX), rights.managed.join(',')).input('User', sql.Int, uid(req))
            .input('Content', sql.NVarChar(sql.MAX), content).input('Round', sql.Int, record.ReviewRound).query(`
                UPDATE dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN SET NoiDung=@Content,OpinionSavedBy=@User,OpinionSavedAt=SYSDATETIME(),
                    OpinionReviewRound=@Round,ConfirmedBy=NULL,ConfirmedAt=NULL,ConfirmedReviewRound=NULL,TrangThai=N'CHO_TBP_XAC_NHAN'
                WHERE Id=@Opinion AND PhieuId=@Id AND IsActive=1 AND (BoPhanId IN(
                    SELECT TRY_CONVERT(INT,value) FROM STRING_SPLIT(@ManagedIds,',')) OR @User=(SELECT NguoiLapId FROM dbo.DOI_TRA_PHOI_LOI WHERE Id=@Id));
                SELECT @@ROWCOUNT Changed;`);
        if (!result.recordset?.[0]?.Changed) return res.status(403).json({ message: 'Bạn không có quyền nhập ý kiến này' });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ message: error.message || 'Không lưu được ý kiến' }); }
});

router.post('/:id/kph/opinions/:opinionId/confirm', async (req, res) => {
    const pool = await poolPromise; const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
        const record = await loadRecord(transaction, validId(req.params.id), true);
        const opinionResult = await new sql.Request(transaction).input('Id', sql.Int, record?.Id)
            .input('Opinion', sql.Int, validId(req.params.opinionId)).query('SELECT * FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Opinion AND PhieuId=@Id AND IsActive=1');
        const opinion = opinionResult.recordset?.[0];
        if (!opinion || record.TrangThai !== 'CHO_Y_KIEN_KPH' || (!isAdmin(req.user) && !await canLeadDepartment(transaction, req.user, opinion.BoPhanId))) throw Object.assign(new Error('Không có quyền xác nhận ý kiến'), { status: 403 });
        if (!opinion.NoiDung || Number(opinion.OpinionReviewRound) !== Number(record.ReviewRound)) throw Object.assign(new Error('Bộ phận chưa lưu ý kiến vòng hiện tại'), { status: 409 });
        if (Number(opinion.ConfirmedReviewRound) === Number(record.ReviewRound)) throw Object.assign(new Error('Ý kiến đã được xác nhận trong vòng hiện tại'), { status: 409 });
        await new sql.Request(transaction).input('Id', sql.Int, record.Id).input('Opinion', sql.Int, opinion.Id)
            .input('User', sql.Int, uid(req)).input('Round', sql.Int, record.ReviewRound).query(`
                UPDATE dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN SET ConfirmedBy=@User,ConfirmedAt=SYSDATETIME(),ConfirmedReviewRound=@Round,TrangThai=N'DA_XAC_NHAN' WHERE Id=@Opinion;
                INSERT dbo.DOI_TRA_PHOI_LOI_KPH_REVIEW_HISTORY(PhieuId,YKienId,BoPhanId,ReviewRound,ActionCode,ActorUserId)
                SELECT @Id,Id,BoPhanId,@Round,N'XAC_NHAN',@User FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN WHERE Id=@Opinion;`);
        const pending = await new sql.Request(transaction).input('Id', sql.Int, record.Id).input('Round', sql.Int, record.ReviewRound)
            .query('SELECT COUNT(*) C FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN WHERE PhieuId=@Id AND IsActive=1 AND ISNULL(ConfirmedReviewRound,0)<>@Round');
        if (!Number(pending.recordset[0].C)) {
            const finalStep = await stepId(transaction, record.WorkflowId, 'KPH_XAC_NHAN_CUOI');
            await new sql.Request(transaction).input('Id', sql.Int, record.Id).input('Step', sql.Int, finalStep)
                .query("UPDATE dbo.DOI_TRA_PHOI_LOI SET TrangThai=N'CHO_XAC_NHAN_CUOI_KPH',CurrentStepId=@Step,UpdatedAt=SYSDATETIME() WHERE Id=@Id");
            await addHistory(transaction, record, 'KPH_ALL_OPINIONS_CONFIRMED', 'CHO_XAC_NHAN_CUOI_KPH', uid(req));
        }
        await transaction.commit(); res.json({ success: true });
    } catch (error) { try { await transaction.rollback(); } catch (_) { /* noop */ } res.status(error.status || 500).json({ message: error.message || 'Không xác nhận được ý kiến' }); }
});

router.post('/:id/kph/opinions/:opinionId/return', async (req, res) => {
    const reason = String(req.body?.reason || '').trim(); if (!reason) return res.status(400).json({ message: 'Vui lòng nhập lý do trả lại' });
    const pool = await poolPromise; const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE); const record = await loadRecord(transaction, validId(req.params.id), true);
        const result = await new sql.Request(transaction).input('Id', sql.Int, record?.Id).input('Opinion', sql.Int, validId(req.params.opinionId))
            .query('SELECT * FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN WHERE Id=@Opinion AND PhieuId=@Id AND IsActive=1');
        const opinion = result.recordset?.[0];
        if (!opinion || record.TrangThai !== 'CHO_Y_KIEN_KPH'
            || (!isAdmin(req.user) && !await canLeadDepartment(transaction, req.user, opinion.BoPhanId))) throw Object.assign(new Error('Không có quyền trả lại'), { status: 403 });
        await returnToSetup(transaction, record, uid(req), reason, opinion.Id, opinion.BoPhanId, 'KPH_OPINION_RETURN');
        await transaction.commit(); res.json({ success: true });
    } catch (error) { try { await transaction.rollback(); } catch (_) { /* noop */ } res.status(error.status || 500).json({ message: error.message || 'Không trả lại được KPH' }); }
});

router.post('/:id/kph/creator-confirm', async (req, res) => {
    const pool = await poolPromise; const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE); const record = await loadRecord(transaction, validId(req.params.id), true);
        if (!record || record.TrangThai !== 'CHO_XAC_NHAN_CUOI_KPH' || (!isAdmin(req.user) && !await canLeadDepartment(transaction, req.user, record.CreatorDepartmentId))) throw Object.assign(new Error('Không có quyền xác nhận cuối'), { status: 403 });
        const next = record.RequiresExecutiveApproval ? 'CHO_BGD_XAC_NHAN' : 'CHO_THEO_DOI';
        const nextStep = await stepId(transaction, record.WorkflowId, record.RequiresExecutiveApproval ? 'KPH_BGD' : 'KPH_THEO_DOI');
        await new sql.Request(transaction).input('Id', sql.Int, record.Id).input('User', sql.Int, uid(req))
            .input('Next', sql.NVarChar(80), next).input('Step', sql.Int, nextStep).query(`
                UPDATE dbo.DOI_TRA_PHOI_LOI SET CreatorConfirmedBy=@User,CreatorConfirmedAt=SYSDATETIME(),TrangThai=@Next,CurrentStepId=@Step,UpdatedAt=SYSDATETIME() WHERE Id=@Id;
                IF @Next=N'CHO_BGD_XAC_NHAN' INSERT dbo.NOTIFICATIONS(UserId,Title,Message,Type,ReferenceId,IsRead,CreatedAt)
                SELECT DISTINCT u.Id,N'Phiếu đổi trả chờ BGD',N'Phiếu đổi trả phôi lỗi đang chờ Ban giám đốc xác nhận.',N'DTP_EXECUTIVE_APPROVAL',@Id,0,GETDATE()
                FROM dbo.USERS u WHERE u.TrangThai=1 AND EXISTS(SELECT 1 FROM dbo.USER_ROLE ur JOIN dbo.ROLE_PERMISSION rp ON rp.RoleId=ur.RoleId JOIN dbo.PERMISSIONS permission ON permission.Id=rp.PermissionId WHERE ur.UserId=u.Id AND permission.PermissionCode=N'XAC_NHAN_BAN_GIAM_DOC');`);
        await addHistory(transaction, record, 'KPH_CREATOR_CONFIRM', next, uid(req));
        await transaction.commit(); res.json({ success: true, nextStatus: next });
    } catch (error) { try { await transaction.rollback(); } catch (_) { /* noop */ } res.status(error.status || 500).json({ message: error.message || 'Không xác nhận được KPH' }); }
});

router.post('/:id/kph/executive-approval', async (req, res) => {
    const decision = normalizeExecutiveDecision(req.body?.decision); const reason = String(req.body?.reason || '').trim();
    if (!decision || (decision === 'RETURN' && !reason)) return res.status(400).json({ message: 'Quyết định hoặc lý do không hợp lệ' });
    if (!canActAsExecutive(req.user)) return res.status(403).json({ message: 'Không có quyền BGD' });
    const pool = await poolPromise; const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE); const record = await loadRecord(transaction, validId(req.params.id), true);
        if (!record || record.TrangThai !== 'CHO_BGD_XAC_NHAN') throw Object.assign(new Error('Phiếu không còn chờ BGD'), { status: 409 });
        const returned = decision === 'RETURN';
        await new sql.Request(transaction).input('Id', sql.Int, record.Id).input('Round', sql.Int, record.ReviewRound)
            .input('Decision', sql.VarChar(20), returned ? 'RETURNED' : 'APPROVED').input('Reason', sql.NVarChar(4000), returned ? reason : null)
            .input('User', sql.Int, uid(req)).query('INSERT dbo.DOI_TRA_PHOI_LOI_KPH_BGD_APPROVAL(PhieuId,ReviewRound,Decision,Reason,ActedBy) VALUES(@Id,@Round,@Decision,@Reason,@User)');
        if (returned) await returnToSetup(transaction, record, uid(req), reason, null, null, 'KPH_EXECUTIVE_RETURN');
        else {
            const followStep = await stepId(transaction, record.WorkflowId, 'KPH_THEO_DOI');
            await new sql.Request(transaction).input('Id', sql.Int, record.Id).input('Step', sql.Int, followStep)
                .query("UPDATE dbo.DOI_TRA_PHOI_LOI SET TrangThai=N'CHO_THEO_DOI',CurrentStepId=@Step,UpdatedAt=SYSDATETIME() WHERE Id=@Id");
            await addHistory(transaction, record, 'KPH_EXECUTIVE_APPROVE', 'CHO_THEO_DOI', uid(req));
        }
        await transaction.commit(); res.json({ success: true });
    } catch (error) { try { await transaction.rollback(); } catch (_) { /* noop */ } res.status(error.status || 500).json({ message: error.message || 'Không xử lý được xác nhận BGD' }); }
});

router.post('/:id/kph/follow-up', async (req, res) => {
    const resultCode = String(req.body?.ketQua || '').toUpperCase(); const newNumber = String(req.body?.phieuKphMoiSo || '').trim();
    if (!['THOA_MAN', 'KHONG_THOA_MAN'].includes(resultCode) || (resultCode === 'KHONG_THOA_MAN' && !newNumber)) return res.status(400).json({ message: 'Kết quả theo dõi không hợp lệ' });
    const pool = await poolPromise; const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE); const record = await loadRecord(transaction, validId(req.params.id), true);
        if (!record || record.TrangThai !== 'CHO_THEO_DOI' || (!isAdmin(req.user) && uid(req) !== Number(record.NguoiLapId) && !has(req.user, 'THEO_DOI_KPH') && !has(req.user, 'KET_LUAN'))) throw Object.assign(new Error('Không có quyền theo dõi phiếu'), { status: 403 });
        const next = record.DinhMucTrangThai === 'DA_XAC_NHAN' ? 'HOAN_TAT' : 'KPH_HOAN_TAT_CHO_B7';
        await new sql.Request(transaction).input('Id', sql.Int, record.Id).input('Result', sql.VarChar(20), resultCode)
            .input('NewNo', sql.NVarChar(50), newNumber || null).input('Note', sql.NVarChar(sql.MAX), String(req.body?.ghiChu || '').trim() || null)
            .input('User', sql.Int, uid(req)).input('Next', sql.NVarChar(80), next).query(`
                INSERT dbo.DOI_TRA_PHOI_LOI_KPH_THEO_DOI(PhieuId,KetQua,PhieuKphMoiSo,GhiChu,NguoiTheoDoiId) VALUES(@Id,@Result,@NewNo,@Note,@User);
                UPDATE dbo.DOI_TRA_PHOI_LOI SET TrangThai=@Next,CurrentStepId=NULL,UpdatedAt=SYSDATETIME() WHERE Id=@Id;`);
        await addHistory(transaction, record, 'KPH_FOLLOW_UP', next, uid(req), resultCode === 'THOA_MAN' ? 'Thỏa mãn' : `Không thỏa mãn - ${newNumber}`);
        await transaction.commit(); res.json({ success: true, nextStatus: next });
    } catch (error) { try { await transaction.rollback(); } catch (_) { /* noop */ } res.status(error.status || 500).json({ message: error.message || 'Không lưu được đánh giá' }); }
});

module.exports = router;
