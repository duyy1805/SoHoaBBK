const express = require('express');
const sql = require('mssql');
const { poolPromise } = require('../db');
const authenticateToken = require('../middlewares/auth.middleware');
const { canLeadDepartment, getManagedDepartmentIds } = require('../utils/managedDepartments');
const { canActAsExecutive, normalizeExecutiveDecision } = require('../utils/executiveApproval');
const { loadSignatureDataUrlMap } = require('../utils/signatureImage');

const router = express.Router();
router.use(authenticateToken);
const uid = (req) => Number(req.user?.userId || req.user?.id);
const isAdmin = (u) => (u?.roles || []).some((x) => String(x).toUpperCase() === 'ADMIN') || (u?.permissions || []).includes('QUAN_TRI_DM');
const has = (u, p) => (u?.permissions || []).includes(p);
const isLead = (u) => (u?.roles || []).some((x) => String(x).toUpperCase().startsWith('TP_'));
const id = (v) => Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;
const rv = (v) => { const b = typeof v === 'string' ? Buffer.from(v, 'base64') : null; return b?.length === 8 ? b : null; };
const encode = (v) => Buffer.isBuffer(v) ? v.toString('base64') : Array.isArray(v) ? v.map(encode) : v && typeof v === 'object' && !(v instanceof Date) ? Object.fromEntries(Object.entries(v).map(([k,x]) => [k,encode(x)])) : v;

async function loadRecord(executor, phieuId) {
    const r = await new sql.Request(executor).input('Id',sql.Int,phieuId).query(`
      SELECT p.*,COALESCE(p.BoPhanKcsId,u.BoPhanId) CreatorDepartmentId,
        COALESCE(NULLIF(c.FullName,N''),c.Username) CreatorConfirmedByName
      FROM dbo.DOI_TRA_PHOI_LOI p LEFT JOIN dbo.USERS u ON u.Id=p.NguoiLapId
      LEFT JOIN dbo.USERS c ON c.Id=p.CreatorConfirmedBy WHERE p.Id=@Id`);
    return r.recordset?.[0];
}
async function access(executor, req, record) {
    const managed = await getManagedDepartmentIds(executor,uid(req),req.user?.boPhanId);
    const creatorManage = isAdmin(req.user) || uid(req)===Number(record.NguoiLapId) || await canLeadDepartment(executor,req.user,record.CreatorDepartmentId);
    const selected = await new sql.Request(executor).input('Id',sql.Int,record.Id).input('Ids',sql.NVarChar(sql.MAX),managed.join(',')).query(`
      SELECT TOP 1 BoPhanId FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN WHERE PhieuId=@Id AND IsActive=1
      AND BoPhanId IN(SELECT TRY_CONVERT(INT,value) FROM STRING_SPLIT(@Ids,',')) ORDER BY Id`);
    return { creatorManage, selectedDepartmentId:Number(selected.recordset?.[0]?.BoPhanId)||null, managed };
}
async function currentStep(executor, workflowId, code) {
    const r=await new sql.Request(executor).input('W',sql.Int,workflowId).input('C',sql.NVarChar(80),code)
      .query('SELECT Id FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP WHERE WorkflowId=@W AND StepCode=@C');
    return r.recordset?.[0]?.Id || null;
}
const openStatuses = ['CHO_THIET_LAP_KPH','CHO_Y_KIEN_KPH','CHO_XAC_NHAN_CUOI_KPH','TRA_LAI_KCS'];

router.get('/:id/kph', async (req,res) => {
 try {
  const pool=await poolPromise, record=await loadRecord(pool,id(req.params.id));
  if(!record) return res.status(404).json({message:'Không tìm thấy phiếu'});
  const a=await access(pool,req,record);
  if(!a.creatorManage&&!a.selectedDepartmentId&&!isAdmin(req.user)&&!canActAsExecutive(req.user)
    &&!['THUC_HIEN_KIEM','XEM_PHIEU_KIEM','XAC_NHAN_LOI','THEO_DOI_KPH','KET_LUAN'].some((p)=>has(req.user,p)))
    return res.status(403).json({message:'Bạn không có quyền xem phiếu'});
  const result=await pool.request().input('Id',sql.Int,record.Id).query(`
    SELECT y.*,bp.TenBoPhan,COALESCE(NULLIF(s.FullName,N''),s.Username) OpinionSavedByName,
      COALESCE(NULLIF(c.FullName,N''),c.Username) ConfirmedByName
    FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN y LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id=y.BoPhanId
    LEFT JOIN dbo.USERS s ON s.Id=y.OpinionSavedBy LEFT JOIN dbo.USERS c ON c.Id=y.ConfirmedBy
    WHERE y.PhieuId=@Id AND y.IsActive=1 ORDER BY y.SortOrder,y.Id;
    SELECT * FROM dbo.DOI_TRA_PHOI_LOI_KPH_XU_LY WHERE PhieuId=@Id ORDER BY Id;
    SELECT * FROM dbo.DOI_TRA_PHOI_LOI_KPH_CHI_PHI WHERE PhieuId=@Id ORDER BY Id;
    SELECT * FROM dbo.DOI_TRA_PHOI_LOI_KPH_HANH_DONG WHERE PhieuId=@Id ORDER BY Id;
    SELECT td.*,COALESCE(NULLIF(u.FullName,N''),u.Username) NguoiTheoDoi FROM dbo.DOI_TRA_PHOI_LOI_KPH_THEO_DOI td LEFT JOIN dbo.USERS u ON u.Id=td.NguoiTheoDoiId WHERE td.PhieuId=@Id;
    SELECT a.*,COALESCE(NULLIF(u.FullName,N''),u.Username) ActedByName FROM dbo.DOI_TRA_PHOI_LOI_KPH_BGD_APPROVAL a LEFT JOIN dbo.USERS u ON u.Id=a.ActedBy WHERE a.PhieuId=@Id ORDER BY a.ActedAt;
    SELECT Id,MaBoPhan,TenBoPhan FROM dbo.DM_BO_PHAN WHERE ISNULL(TrangThai,1)=1 ORDER BY TenBoPhan;`);
  const signatureMap=await loadSignatureDataUrlMap(pool,[record.CreatorConfirmedBy,...(result.recordsets[0]||[]).map(x=>x.ConfirmedBy),...(result.recordsets[4]||[]).map(x=>x.NguoiTheoDoiId),...(result.recordsets[5]||[]).map(x=>x.ActedBy)]);
  const opinions=(result.recordsets[0]||[]).map(x=>({...x,HasOpinion:Boolean(x.NoiDung),HasConfirmed:Boolean(x.ConfirmedAt),SignatureDataUrl:signatureMap.get(Number(x.ConfirmedBy))||null,
    CanSaveOpinion:openStatuses.includes(record.TrangThai)&&(a.creatorManage||Number(x.BoPhanId)===a.selectedDepartmentId),
    CanConfirmOpinion:record.TrangThai==='CHO_Y_KIEN_KPH'&&(isAdmin(req.user)||(isLead(req.user)&&a.managed.includes(Number(x.BoPhanId))))
  }));
  const evaluation=result.recordsets[4]?.[0]||null;if(evaluation)evaluation.SignatureDataUrl=signatureMap.get(Number(evaluation.NguoiTheoDoiId))||null;
  const executiveApprovals=(result.recordsets[5]||[]).map(x=>({...x,SignatureDataUrl:signatureMap.get(Number(x.ActedBy))||null}));
  const decorateRows=(rows)=>(rows||[]).map(x=>({...x,CanEdit:openStatuses.includes(record.TrangThai)&&(isAdmin(req.user)||Number(x.CreatedBy)===uid(req))}));
  res.json(encode({opinions,xuLy:decorateRows(result.recordsets[1]),chiPhi:decorateRows(result.recordsets[2]),hanhDong:decorateRows(result.recordsets[3]),evaluation,executiveApprovals,creatorConfirmedByName:record.CreatorConfirmedByName,creatorSignatureDataUrl:signatureMap.get(Number(record.CreatorConfirmedBy))||null,departments:result.recordsets[6]||[],capabilities:{
    canManage:a.creatorManage&&['CHO_THIET_LAP_KPH','TRA_LAI_KCS'].includes(record.TrangThai),canContribute:openStatuses.includes(record.TrangThai)&&(a.creatorManage||Boolean(a.selectedDepartmentId)),
    targetDepartmentId:a.selectedDepartmentId||record.CreatorDepartmentId,canCreatorConfirm:(isAdmin(req.user)||await canLeadDepartment(pool,req.user,record.CreatorDepartmentId))&&record.TrangThai==='CHO_XAC_NHAN_CUOI_KPH',
    canExecutiveApprove:record.TrangThai==='CHO_BGD_XAC_NHAN'&&canActAsExecutive(req.user),canFollowUp:record.TrangThai==='CHO_THEO_DOI'&&(isAdmin(req.user)||uid(req)===Number(record.NguoiLapId)||has(req.user,'THEO_DOI_KPH')||has(req.user,'KET_LUAN'))}}));
 } catch(e){console.error('DTP KPH detail',e);res.status(500).json({message:e.message||'Không tải được dữ liệu KPH'});}
});

router.put('/:id/kph/opinion-departments', async(req,res)=>{
 const ids=[...new Set((req.body?.boPhanIds||[]).map(id).filter(Boolean))], rowVersion=rv(req.body?.rowVersion);
 if(!ids.length||!rowVersion)return res.status(400).json({message:'Chọn ít nhất một bộ phận và tải lại phiên bản phiếu'});
 const pool=await poolPromise,tx=new sql.Transaction(pool);
 try{await tx.begin();const record=await loadRecord(tx,id(req.params.id)),a=record&&await access(tx,req,record);
  if(!record)throw Object.assign(new Error('Không tìm thấy phiếu'),{status:404});
  if(!a.creatorManage||!['CHO_THIET_LAP_KPH','TRA_LAI_KCS'].includes(record.TrangThai))throw Object.assign(new Error('Bạn không thể thiết lập bộ phận ở trạng thái hiện tại'),{status:403});
  const step=await currentStep(tx,record.WorkflowId,'KPH_Y_KIEN');
  await new sql.Request(tx).input('Id',sql.Int,record.Id).input('RV',sql.VarBinary(8),rowVersion).input('Ids',sql.NVarChar(sql.MAX),ids.join(',')).input('User',sql.Int,uid(req)).input('Step',sql.Int,step).query(`
   IF NOT EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND RowVersion=@RV) THROW 52201,N'Phiếu đã thay đổi.',1;
   UPDATE dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN SET IsActive=0,TrangThai=N'DA_HUY',RemovedBy=@User,RemovedAt=SYSDATETIME() WHERE PhieuId=@Id AND IsActive=1 AND BoPhanId NOT IN(SELECT TRY_CONVERT(INT,value) FROM STRING_SPLIT(@Ids,','));
   UPDATE dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN SET IsActive=1,TrangThai=N'CHO_Y_KIEN',RemovedBy=NULL,RemovedAt=NULL WHERE PhieuId=@Id AND BoPhanId IN(SELECT TRY_CONVERT(INT,value) FROM STRING_SPLIT(@Ids,','));
   INSERT dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN(PhieuId,BoPhanId,MaBoPhan,TenBoPhan,SortOrder,CreatedBy)
   SELECT @Id,b.Id,b.MaBoPhan,b.TenBoPhan,ROW_NUMBER()OVER(ORDER BY b.Id),@User FROM dbo.DM_BO_PHAN b JOIN(SELECT TRY_CONVERT(INT,value) Id FROM STRING_SPLIT(@Ids,',')) x ON x.Id=b.Id
   WHERE ISNULL(b.TrangThai,1)=1 AND NOT EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN y WHERE y.PhieuId=@Id AND y.BoPhanId=b.Id);
   UPDATE y SET TrangThai=N'CHO_GUI_LAI' FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN y JOIN dbo.DOI_TRA_PHOI_LOI p ON p.Id=y.PhieuId WHERE y.PhieuId=@Id AND y.IsActive=1 AND p.TrangThai=N'TRA_LAI_KCS';
   UPDATE dbo.DOI_TRA_PHOI_LOI SET TrangThai=CASE WHEN TrangThai=N'TRA_LAI_KCS' THEN TrangThai ELSE N'CHO_Y_KIEN_KPH' END,
     CurrentStepId=CASE WHEN TrangThai=N'TRA_LAI_KCS' THEN CurrentStepId ELSE @Step END,
     OpinionDepartmentsConfirmedBy=@User,OpinionDepartmentsConfirmedAt=SYSDATETIME(),UpdatedAt=SYSDATETIME() WHERE Id=@Id;`);
  await new sql.Request(tx).input('Id',sql.Int,record.Id).input('Ids',sql.NVarChar(sql.MAX),ids.join(',')).query(`
    INSERT dbo.NOTIFICATIONS(UserId,Title,Message,Type,ReferenceId,IsRead,CreatedAt)
    SELECT DISTINCT u.Id,N'Phiếu đổi trả cần ý kiến',N'Bạn có phiếu đổi trả phôi lỗi cần nhập hoặc xác nhận ý kiến.',N'DTP_KPH_OPINION',@Id,0,GETDATE()
    FROM dbo.USERS u WHERE u.TrangThai=1 AND u.BoPhanId IN(SELECT TRY_CONVERT(INT,value) FROM STRING_SPLIT(@Ids,','));`);
  await tx.commit();res.json({success:true});
 }catch(e){try{await tx.rollback()}catch{}res.status(e.status||409).json({message:e.message||'Không cập nhật được bộ phận'});}
});

const sectionConfig={
 'xu-ly':{table:'DOI_TRA_PHOI_LOI_KPH_XU_LY',columns:'NoiDung,DeNghiXuLyId,ThoiHan,TrachNhiem,TheoDoi',values:'@NoiDung,@DeNghi,@ThoiHan,@TrachNhiem,@TheoDoi'},
 'chi-phi':{table:'DOI_TRA_PHOI_LOI_KPH_CHI_PHI',columns:'LoaiChiPhi,GiaTri,ThoiHan,TrachNhiem,TheoDoi',values:'@NoiDung,@GiaTri,@ThoiHan,@TrachNhiem,@TheoDoi'},
 'hanh-dong':{table:'DOI_TRA_PHOI_LOI_KPH_HANH_DONG',columns:'NoiDung,ThoiHan,TrachNhiem,TheoDoi',values:'@NoiDung,@ThoiHan,@TrachNhiem,@TheoDoi'}
};
router.post('/:id/kph/sections/:section',async(req,res)=>{
 const c=sectionConfig[req.params.section],phieuId=id(req.params.id),noiDung=String(req.body?.noiDung||req.body?.loaiChiPhi||'').trim();
 if(!c||!phieuId||!noiDung)return res.status(400).json({message:'Nội dung không hợp lệ'});
 try{const pool=await poolPromise,record=await loadRecord(pool,phieuId),a=record&&await access(pool,req,record);
  if(!record)return res.status(404).json({message:'Không tìm thấy phiếu'});if(!openStatuses.includes(record.TrangThai)||(!a.creatorManage&&!a.selectedDepartmentId))return res.status(403).json({message:'Bạn không có quyền nhập nội dung'});
  if(req.params.section!=='chi-phi'&&!req.body?.thoiHan)return res.status(400).json({message:'Vui lòng nhập thời hạn'});
  if(req.params.section==='xu-ly'&&(!String(req.body?.trachNhiem||'').trim()||!String(req.body?.theoDoi||'').trim()))return res.status(400).json({message:'Vui lòng nhập trách nhiệm và theo dõi'});
  await pool.request().input('Id',sql.Int,phieuId).input('BP',sql.Int,a.selectedDepartmentId||record.CreatorDepartmentId).input('User',sql.Int,uid(req)).input('NoiDung',sql.NVarChar(sql.MAX),noiDung).input('DeNghi',sql.Int,id(req.body?.deNghiXuLyId)).input('GiaTri',sql.Decimal(18,2),Number(req.body?.giaTri)||0).input('ThoiHan',sql.Date,req.body?.thoiHan||null).input('TrachNhiem',sql.NVarChar(255),String(req.body?.trachNhiem||'').trim()||null).input('TheoDoi',sql.NVarChar(255),String(req.body?.theoDoi||'').trim()||null).query(`INSERT dbo.${c.table}(PhieuId,BoPhanId,${c.columns},CreatedBy) VALUES(@Id,@BP,${c.values},@User)`);
  res.json({success:true});
 }catch(e){res.status(500).json({message:e.message||'Không lưu được nội dung'});}
});

router.patch('/:id/kph/sections/:section/:rowId',async(req,res)=>{
 const c=sectionConfig[req.params.section],phieuId=id(req.params.id),rowId=id(req.params.rowId),noiDung=String(req.body?.noiDung||req.body?.loaiChiPhi||'').trim();
 if(!c||!phieuId||!rowId||!noiDung)return res.status(400).json({message:'Nội dung không hợp lệ'});
 try{const pool=await poolPromise,record=await loadRecord(pool,phieuId);if(!record||!openStatuses.includes(record.TrangThai))return res.status(409).json({message:'Phiếu đã khóa nội dung'});
  const result=await pool.request().input('Id',sql.Int,phieuId).input('Row',sql.Int,rowId).input('User',sql.Int,uid(req)).input('Admin',sql.Bit,isAdmin(req.user)).input('NoiDung',sql.NVarChar(sql.MAX),noiDung).input('GiaTri',sql.Decimal(18,2),Number(req.body?.giaTri)||0).input('ThoiHan',sql.Date,req.body?.thoiHan||null).input('TrachNhiem',sql.NVarChar(255),String(req.body?.trachNhiem||'').trim()||null).input('TheoDoi',sql.NVarChar(255),String(req.body?.theoDoi||'').trim()||null).query(req.params.section==='chi-phi'?`UPDATE dbo.${c.table} SET LoaiChiPhi=@NoiDung,GiaTri=@GiaTri,ThoiHan=@ThoiHan,TrachNhiem=@TrachNhiem,TheoDoi=@TheoDoi,UpdatedAt=SYSDATETIME() WHERE Id=@Row AND PhieuId=@Id AND (@Admin=1 OR CreatedBy=@User);SELECT @@ROWCOUNT Changed;`:`UPDATE dbo.${c.table} SET NoiDung=@NoiDung,ThoiHan=@ThoiHan,TrachNhiem=@TrachNhiem,TheoDoi=@TheoDoi,UpdatedAt=SYSDATETIME() WHERE Id=@Row AND PhieuId=@Id AND (@Admin=1 OR CreatedBy=@User);SELECT @@ROWCOUNT Changed;`);
  if(!result.recordset?.[0]?.Changed)return res.status(403).json({message:'Chỉ người nhập hoặc Admin được sửa nội dung'});res.json({success:true});
 }catch(e){res.status(500).json({message:e.message||'Không sửa được nội dung'});}
});
router.delete('/:id/kph/sections/:section/:rowId',async(req,res)=>{
 const c=sectionConfig[req.params.section],phieuId=id(req.params.id),rowId=id(req.params.rowId);if(!c||!phieuId||!rowId)return res.status(400).json({message:'Nội dung không hợp lệ'});
 try{const pool=await poolPromise,record=await loadRecord(pool,phieuId);if(!record||!openStatuses.includes(record.TrangThai))return res.status(409).json({message:'Phiếu đã khóa nội dung'});const result=await pool.request().input('Id',sql.Int,phieuId).input('Row',sql.Int,rowId).input('User',sql.Int,uid(req)).input('Admin',sql.Bit,isAdmin(req.user)).query(`DELETE dbo.${c.table} WHERE Id=@Row AND PhieuId=@Id AND (@Admin=1 OR CreatedBy=@User);SELECT @@ROWCOUNT Changed;`);if(!result.recordset?.[0]?.Changed)return res.status(403).json({message:'Chỉ người nhập hoặc Admin được xóa nội dung'});res.json({success:true});}catch(e){res.status(500).json({message:e.message||'Không xóa được nội dung'});}
});

router.put('/:id/kph/opinions/:opinionId/draft',async(req,res)=>{
 const content=String(req.body?.noiDung||'').trim();if(!content)return res.status(400).json({message:'Vui lòng nhập ý kiến'});
 try{const pool=await poolPromise,record=await loadRecord(pool,id(req.params.id)),a=record&&await access(pool,req,record),opinionId=id(req.params.opinionId);
  if(!record||!opinionId)return res.status(404).json({message:'Không tìm thấy yêu cầu ý kiến'});
  const result=await pool.request().input('Id',sql.Int,record.Id).input('Opinion',sql.Int,opinionId).input('BP',sql.Int,a.selectedDepartmentId).input('User',sql.Int,uid(req)).input('Content',sql.NVarChar(sql.MAX),content).input('Round',sql.Int,record.ReviewRound).query(`
   UPDATE dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN SET NoiDung=@Content,OpinionSavedBy=@User,OpinionSavedAt=SYSDATETIME(),OpinionReviewRound=@Round,ConfirmedBy=NULL,ConfirmedAt=NULL,TrangThai=N'CHO_TBP_XAC_NHAN'
   WHERE Id=@Opinion AND PhieuId=@Id AND IsActive=1 AND (@BP=BoPhanId OR @User=(SELECT NguoiLapId FROM dbo.DOI_TRA_PHOI_LOI WHERE Id=@Id));SELECT @@ROWCOUNT Changed;`);
  if(!result.recordset?.[0]?.Changed)return res.status(403).json({message:'Bạn không có quyền nhập ý kiến này'});res.json({success:true});
 }catch(e){res.status(500).json({message:e.message||'Không lưu được ý kiến'});}
});

router.post('/:id/kph/opinions/:opinionId/confirm',async(req,res)=>{
 const pool=await poolPromise,tx=new sql.Transaction(pool);try{await tx.begin();const record=await loadRecord(tx,id(req.params.id)),opinionId=id(req.params.opinionId);
  const o=await new sql.Request(tx).input('O',sql.Int,opinionId).input('Id',sql.Int,record?.Id).query('SELECT * FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN WITH(UPDLOCK,HOLDLOCK) WHERE Id=@O AND PhieuId=@Id AND IsActive=1');const row=o.recordset?.[0];
  if(!row||record.TrangThai!=='CHO_Y_KIEN_KPH'||(!isAdmin(req.user)&&!await canLeadDepartment(tx,req.user,row.BoPhanId)))throw Object.assign(new Error('Không có quyền xác nhận ý kiến'),{status:403});
  if(!row.NoiDung||Number(row.OpinionReviewRound)!==Number(record.ReviewRound))throw Object.assign(new Error('Bộ phận chưa lưu ý kiến vòng hiện tại'),{status:409});
  await new sql.Request(tx).input('O',sql.Int,opinionId).input('Id',sql.Int,record.Id).input('User',sql.Int,uid(req)).input('Round',sql.Int,record.ReviewRound).query(`UPDATE dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN SET ConfirmedBy=@User,ConfirmedAt=SYSDATETIME(),ConfirmedReviewRound=@Round,TrangThai=N'DA_XAC_NHAN' WHERE Id=@O;INSERT dbo.DOI_TRA_PHOI_LOI_KPH_REVIEW_HISTORY(PhieuId,YKienId,BoPhanId,ReviewRound,ActionCode,ActorUserId) SELECT @Id,Id,BoPhanId,@Round,N'XAC_NHAN',@User FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN WHERE Id=@O;`);
  const pending=await new sql.Request(tx).input('Id',sql.Int,record.Id).input('Round',sql.Int,record.ReviewRound).query('SELECT COUNT(*) C FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN WHERE PhieuId=@Id AND IsActive=1 AND ISNULL(ConfirmedReviewRound,0)<>@Round');
  if(!Number(pending.recordset[0].C)){const step=await currentStep(tx,record.WorkflowId,'KPH_XAC_NHAN_CUOI');await new sql.Request(tx).input('Id',sql.Int,record.Id).input('Step',sql.Int,step).query("UPDATE dbo.DOI_TRA_PHOI_LOI SET TrangThai=N'CHO_XAC_NHAN_CUOI_KPH',CurrentStepId=@Step,UpdatedAt=SYSDATETIME() WHERE Id=@Id");}
  await tx.commit();res.json({success:true});
 }catch(e){try{await tx.rollback()}catch{}res.status(e.status||500).json({message:e.message||'Không xác nhận được ý kiến'});}
});

router.post('/:id/kph/opinions/:opinionId/return',async(req,res)=>{
 const reason=String(req.body?.reason||'').trim();if(!reason)return res.status(400).json({message:'Vui lòng nhập lý do trả lại'});
 const pool=await poolPromise,tx=new sql.Transaction(pool);try{await tx.begin();const record=await loadRecord(tx,id(req.params.id)),opinionId=id(req.params.opinionId),o=await new sql.Request(tx).input('O',sql.Int,opinionId).input('Id',sql.Int,record?.Id).query('SELECT * FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN WHERE Id=@O AND PhieuId=@Id AND IsActive=1'),row=o.recordset?.[0];
  if(!row||(!isAdmin(req.user)&&!await canLeadDepartment(tx,req.user,row.BoPhanId)))throw Object.assign(new Error('Không có quyền trả lại'),{status:403});const step=await currentStep(tx,record.WorkflowId,'KCS_KIEM');
  await new sql.Request(tx).input('Id',sql.Int,record.Id).input('O',sql.Int,opinionId).input('User',sql.Int,uid(req)).input('Round',sql.Int,record.ReviewRound).input('Reason',sql.NVarChar(2000),reason).input('Step',sql.Int,step).query(`UPDATE dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN SET ConfirmedBy=NULL,ConfirmedAt=NULL,ConfirmedReviewRound=NULL,TrangThai=N'CHO_GUI_LAI' WHERE PhieuId=@Id AND IsActive=1;UPDATE dbo.DOI_TRA_PHOI_LOI SET TrangThai=N'TRA_LAI_KCS',CurrentStepId=@Step,KcsCompletedBy=NULL,KcsCompletedAt=NULL,TbpKcsConfirmedBy=NULL,TbpKcsConfirmedAt=NULL,CreatorConfirmedBy=NULL,CreatorConfirmedAt=NULL,LastReturnedBy=@User,LastReturnedAt=SYSDATETIME(),LastReturnReason=@Reason,LyDoTraLai=@Reason,UpdatedAt=SYSDATETIME() WHERE Id=@Id;INSERT dbo.DOI_TRA_PHOI_LOI_KPH_REVIEW_HISTORY(PhieuId,YKienId,BoPhanId,ReviewRound,ActionCode,ActorUserId,Reason) VALUES(@Id,@O,${Number(row.BoPhanId)},@Round,N'TRA_LAI',@User,@Reason);`);
  await tx.commit();res.json({success:true});
 }catch(e){try{await tx.rollback()}catch{}res.status(e.status||500).json({message:e.message||'Không trả lại được phiếu'});}
});

router.post('/:id/kph/creator-confirm',async(req,res)=>{
 const pool=await poolPromise,tx=new sql.Transaction(pool);try{await tx.begin();const record=await loadRecord(tx,id(req.params.id));if(!record||record.TrangThai!=='CHO_XAC_NHAN_CUOI_KPH'||(!isAdmin(req.user)&&!await canLeadDepartment(tx,req.user,record.CreatorDepartmentId)))throw Object.assign(new Error('Không có quyền xác nhận cuối'),{status:403});
  const next=record.RequiresExecutiveApproval?'CHO_BGD_XAC_NHAN':'CHO_THEO_DOI',step=await currentStep(tx,record.WorkflowId,record.RequiresExecutiveApproval?'KPH_BGD':'KPH_THEO_DOI');await new sql.Request(tx).input('Id',sql.Int,record.Id).input('User',sql.Int,uid(req)).input('Next',sql.NVarChar(80),next).input('Step',sql.Int,step).query(`UPDATE dbo.DOI_TRA_PHOI_LOI SET CreatorConfirmedBy=@User,CreatorConfirmedAt=SYSDATETIME(),TrangThai=@Next,CurrentStepId=@Step,UpdatedAt=SYSDATETIME() WHERE Id=@Id;
    IF @Next=N'CHO_BGD_XAC_NHAN' INSERT dbo.NOTIFICATIONS(UserId,Title,Message,Type,ReferenceId,IsRead,CreatedAt)
    SELECT DISTINCT u.Id,N'Phiếu đổi trả chờ BGD',N'Phiếu đổi trả phôi lỗi đang chờ Ban giám đốc xác nhận.',N'DTP_EXECUTIVE_APPROVAL',@Id,0,GETDATE()
    FROM dbo.USERS u WHERE u.TrangThai=1 AND EXISTS(SELECT 1 FROM dbo.USER_ROLE ur JOIN dbo.ROLE_PERMISSION rp ON rp.RoleId=ur.RoleId JOIN dbo.PERMISSIONS p ON p.Id=rp.PermissionId WHERE ur.UserId=u.Id AND p.PermissionCode=N'XAC_NHAN_BAN_GIAM_DOC');`);await tx.commit();res.json({success:true,nextStatus:next});
 }catch(e){try{await tx.rollback()}catch{}res.status(e.status||500).json({message:e.message||'Không xác nhận được phiếu'});}
});

router.post('/:id/kph/executive-approval',async(req,res)=>{
 const decision=normalizeExecutiveDecision(req.body?.decision),reason=String(req.body?.reason||'').trim();if(!decision||(decision==='RETURN'&&!reason))return res.status(400).json({message:'Quyết định hoặc lý do không hợp lệ'});if(!canActAsExecutive(req.user))return res.status(403).json({message:'Không có quyền BGD'});
 const pool=await poolPromise,tx=new sql.Transaction(pool);try{await tx.begin();const record=await loadRecord(tx,id(req.params.id));if(!record||record.TrangThai!=='CHO_BGD_XAC_NHAN')throw Object.assign(new Error('Phiếu không còn chờ BGD'),{status:409});const returned=decision==='RETURN',step=await currentStep(tx,record.WorkflowId,returned?'KCS_KIEM':'KPH_THEO_DOI');
  await new sql.Request(tx).input('Id',sql.Int,record.Id).input('Round',sql.Int,record.ReviewRound).input('Decision',sql.VarChar(20),returned?'RETURNED':'APPROVED').input('Reason',sql.NVarChar(4000),returned?reason:null).input('User',sql.Int,uid(req)).input('Step',sql.Int,step).query(`INSERT dbo.DOI_TRA_PHOI_LOI_KPH_BGD_APPROVAL(PhieuId,ReviewRound,Decision,Reason,ActedBy) VALUES(@Id,@Round,@Decision,@Reason,@User);UPDATE dbo.DOI_TRA_PHOI_LOI SET TrangThai=CASE WHEN @Decision='RETURNED' THEN N'TRA_LAI_KCS' ELSE N'CHO_THEO_DOI' END,CurrentStepId=@Step,KcsCompletedBy=CASE WHEN @Decision='RETURNED' THEN NULL ELSE KcsCompletedBy END,KcsCompletedAt=CASE WHEN @Decision='RETURNED' THEN NULL ELSE KcsCompletedAt END,TbpKcsConfirmedBy=CASE WHEN @Decision='RETURNED' THEN NULL ELSE TbpKcsConfirmedBy END,TbpKcsConfirmedAt=CASE WHEN @Decision='RETURNED' THEN NULL ELSE TbpKcsConfirmedAt END,CreatorConfirmedBy=CASE WHEN @Decision='RETURNED' THEN NULL ELSE CreatorConfirmedBy END,CreatorConfirmedAt=CASE WHEN @Decision='RETURNED' THEN NULL ELSE CreatorConfirmedAt END,LastReturnedBy=CASE WHEN @Decision='RETURNED' THEN @User ELSE LastReturnedBy END,LastReturnedAt=CASE WHEN @Decision='RETURNED' THEN SYSDATETIME() ELSE LastReturnedAt END,LastReturnReason=CASE WHEN @Decision='RETURNED' THEN @Reason ELSE LastReturnReason END,LyDoTraLai=CASE WHEN @Decision='RETURNED' THEN @Reason ELSE LyDoTraLai END,UpdatedAt=SYSDATETIME() WHERE Id=@Id;IF @Decision='RETURNED' UPDATE dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN SET TrangThai=N'CHO_GUI_LAI',ConfirmedBy=NULL,ConfirmedAt=NULL,ConfirmedReviewRound=NULL WHERE PhieuId=@Id AND IsActive=1;`);await tx.commit();res.json({success:true});
 }catch(e){try{await tx.rollback()}catch{}res.status(e.status||500).json({message:e.message||'Không xử lý được xác nhận BGD'});}
});

router.post('/:id/kph/follow-up',async(req,res)=>{
 const ketQua=String(req.body?.ketQua||'').toUpperCase(),newNo=String(req.body?.phieuKphMoiSo||'').trim();if(!['THOA_MAN','KHONG_THOA_MAN'].includes(ketQua)||(ketQua==='KHONG_THOA_MAN'&&!newNo))return res.status(400).json({message:'Kết quả theo dõi không hợp lệ'});
 const pool=await poolPromise,tx=new sql.Transaction(pool);try{await tx.begin();const record=await loadRecord(tx,id(req.params.id));if(!record||record.TrangThai!=='CHO_THEO_DOI'||(!isAdmin(req.user)&&uid(req)!==Number(record.NguoiLapId)&&!has(req.user,'THEO_DOI_KPH')&&!has(req.user,'KET_LUAN')))throw Object.assign(new Error('Không có quyền theo dõi phiếu'),{status:403});const next=record.DinhMucTrangThai==='DA_XAC_NHAN'?'HOAN_TAT':'KPH_HOAN_TAT_CHO_B7';
  await new sql.Request(tx).input('Id',sql.Int,record.Id).input('K',sql.VarChar(20),ketQua).input('No',sql.NVarChar(50),newNo||null).input('Note',sql.NVarChar(sql.MAX),String(req.body?.ghiChu||'').trim()||null).input('User',sql.Int,uid(req)).input('Next',sql.NVarChar(80),next).query('INSERT dbo.DOI_TRA_PHOI_LOI_KPH_THEO_DOI(PhieuId,KetQua,PhieuKphMoiSo,GhiChu,NguoiTheoDoiId) VALUES(@Id,@K,@No,@Note,@User);UPDATE dbo.DOI_TRA_PHOI_LOI SET TrangThai=@Next,CurrentStepId=NULL,UpdatedAt=SYSDATETIME() WHERE Id=@Id');await tx.commit();res.json({success:true,nextStatus:next});
 }catch(e){try{await tx.rollback()}catch{}res.status(e.status||500).json({message:e.message||'Không lưu được đánh giá'});}
});

router.post('/:id/dinh-muc/confirm',async(req,res)=>{
 const rowVersion=rv(req.body?.rowVersion),pool=await poolPromise,tx=new sql.Transaction(pool);try{await tx.begin();const record=await loadRecord(tx,id(req.params.id));
  const dept=await new sql.Request(tx).input('User',sql.Int,uid(req)).query("SELECT TOP 1 1 Allowed FROM dbo.USERS u JOIN dbo.DM_BO_PHAN b ON b.Id=u.BoPhanId WHERE u.Id=@User AND UPPER(LTRIM(RTRIM(b.MaBoPhan)))=N'B7' AND u.TrangThai=1");if(!record||!rowVersion||record.TrangThai==='DA_HUY'||record.TrangThai==='HOAN_TAT'||(!isAdmin(req.user)&&!dept.recordset.length))throw Object.assign(new Error('Không thể xác nhận định mức'),{status:403});
  await new sql.Request(tx).input('Id',sql.Int,record.Id).input('RV',sql.VarBinary(8),rowVersion).input('User',sql.Int,uid(req)).query(`IF NOT EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND RowVersion=@RV) THROW 52210,N'Phiếu đã thay đổi.',1;IF EXISTS(SELECT SourceVatTuId FROM dbo.DOI_TRA_PHOI_LOI_PHOI WHERE PhieuId=@Id GROUP BY SourceVatTuId EXCEPT SELECT SourceVatTuId FROM dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC WHERE PhieuId=@Id AND DinhMuc>0) THROW 52211,N'Chưa nhập đủ định mức.',1;UPDATE q SET SoLuongBoLoiSnapshot=x.Qty,SoLuongDoiTra=TRY_CONVERT(DECIMAL(18,6),CONVERT(DECIMAL(38,12),x.Qty)*q.DinhMuc),UpdatedBy=@User,UpdatedAt=SYSDATETIME() FROM dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC q JOIN(SELECT SourceVatTuId,MAX(SoLuongPhoiLoi) Qty FROM dbo.DOI_TRA_PHOI_LOI_PHOI WHERE PhieuId=@Id GROUP BY SourceVatTuId)x ON x.SourceVatTuId=q.SourceVatTuId WHERE q.PhieuId=@Id;UPDATE dbo.DOI_TRA_PHOI_LOI SET DinhMucTrangThai=N'DA_XAC_NHAN',DinhMucCurrentStepId=NULL,B7ConfirmedBy=@User,B7ConfirmedAt=SYSDATETIME(),TrangThai=CASE WHEN TrangThai=N'KPH_HOAN_TAT_CHO_B7' THEN N'HOAN_TAT' ELSE TrangThai END,UpdatedAt=SYSDATETIME() WHERE Id=@Id;`);await tx.commit();res.json({success:true});
 }catch(e){try{await tx.rollback()}catch{}res.status(e.status||409).json({message:e.message||'Không xác nhận được định mức'});}
});

module.exports=router;
