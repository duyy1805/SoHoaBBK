SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI',N'U') IS NULL
    THROW 52600,N'Chưa có phân hệ đổi trả phôi lỗi.',1;
IF OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP',N'U') IS NULL
    THROW 52601,N'Chưa có bảng liên kết phiếu nhập BTP lỗi.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.PERMISSIONS WHERE PermissionCode=N'XAC_NHAN_KHO_SXBT')
    THROW 52602,N'Thiếu quyền XAC_NHAN_KHO_SXBT dành cho Kho.',1;
GO

BEGIN TRANSACTION;

IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP',N'WarehouseConfirmedBy') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP ADD WarehouseConfirmedBy INT NULL;
IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP',N'WarehouseConfirmedAt') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP ADD WarehouseConfirmedAt DATETIME2(0) NULL;
GO

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_DTPL_PHIEU_NHAP_BTP_WarehouseConfirmedBy')
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP WITH CHECK
        ADD CONSTRAINT FK_DTPL_PHIEU_NHAP_BTP_WarehouseConfirmedBy
        FOREIGN KEY(WarehouseConfirmedBy) REFERENCES dbo.USERS(Id);
GO

DECLARE @WorkflowId INT=(SELECT Id FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW
    WHERE WorkflowCode=N'DTP_DEFAULT' AND VersionNo=6);
IF @WorkflowId IS NULL
BEGIN
    INSERT dbo.DOI_TRA_PHOI_LOI_WORKFLOW(WorkflowCode,WorkflowName,VersionNo,EntityType,IsActive)
    VALUES(N'DTP_DEFAULT',N'Đổi phôi lỗi: KCS mở KPH, B7 và Kho xác nhận độc lập',6,N'PHIEU_KIEM',0);
    SET @WorkflowId=SCOPE_IDENTITY();
END;

DECLARE @Steps TABLE(Code NVARCHAR(80),Name NVARCHAR(255),Ord INT,Pending NVARCHAR(80),Completed NVARCHAR(80),Track NVARCHAR(40));
INSERT @Steps VALUES
(N'KCS_KIEM',N'KCS kiểm, tạo phiếu nhập và mở KPH',10,N'TAO_MOI',N'CHO_THIET_LAP_KPH',N'MAIN'),
(N'KPH_THIET_LAP',N'Thiết lập KPH',20,N'CHO_THIET_LAP_KPH',N'CHO_Y_KIEN_KPH',N'MAIN'),
(N'KPH_Y_KIEN',N'Lấy ý kiến KPH',30,N'CHO_Y_KIEN_KPH',N'CHO_XAC_NHAN_CUOI_KPH',N'MAIN'),
(N'KPH_XAC_NHAN_CUOI',N'Xác nhận cuối KPH',40,N'CHO_XAC_NHAN_CUOI_KPH',N'CHO_BGD_XAC_NHAN',N'MAIN'),
(N'KPH_BGD',N'Ban giám đốc xác nhận',50,N'CHO_BGD_XAC_NHAN',N'CHO_THEO_DOI',N'MAIN'),
(N'KPH_THEO_DOI',N'Theo dõi đánh giá KPH',60,N'CHO_THEO_DOI',N'KPH_HOAN_TAT_CHO_B7',N'MAIN'),
(N'B7_DINH_MUC',N'B7 nhập số lượng đổi trả và tạo LXVT',70,N'CHUA_NHAP',N'DA_XAC_NHAN',N'DINH_MUC'),
(N'KHO_XAC_NHAN_NHAP',N'Kho xác nhận phiếu nhập BTP lỗi',80,N'CHUA_XAC_NHAN',N'DA_XAC_NHAN',N'KHO_NHAP');

INSERT dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP
    (WorkflowId,StepCode,StepName,SortOrder,PendingStatusCode,CompletedStatusCode,TrackCode)
SELECT @WorkflowId,s.Code,s.Name,s.Ord,s.Pending,s.Completed,s.Track
FROM @Steps s
WHERE NOT EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP x
    WHERE x.WorkflowId=@WorkflowId AND x.StepCode=s.Code);

DECLARE @Kcs INT=(SELECT Id FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP WHERE WorkflowId=@WorkflowId AND StepCode=N'KCS_KIEM');
DECLARE @Setup INT=(SELECT Id FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP WHERE WorkflowId=@WorkflowId AND StepCode=N'KPH_THIET_LAP');
DECLARE @B7 INT=(SELECT Id FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP WHERE WorkflowId=@WorkflowId AND StepCode=N'B7_DINH_MUC');

DECLARE @Transitions TABLE(ActionCode NVARCHAR(80),ActionName NVARCHAR(255),FromStatus NVARCHAR(80),Ord INT);
INSERT @Transitions VALUES
(N'KCS_SUBMIT',N'Hoàn tất KCS, tạo phiếu nhập BTP lỗi và mở KPH',N'TAO_MOI',10),
(N'KCS_RESUBMIT',N'Hoàn tất lại KCS, tạo phiếu nhập BTP lỗi và mở KPH',N'TRA_LAI_KCS',15);
INSERT dbo.DOI_TRA_PHOI_LOI_WORKFLOW_TRANSITION
    (WorkflowId,ActionCode,ActionName,FromStepId,ToStepId,FromStatusCode,ToStatusCode,RequiredPermission,SortOrder,ConfigJson)
SELECT @WorkflowId,t.ActionCode,t.ActionName,@Kcs,@Setup,t.FromStatus,N'CHO_THIET_LAP_KPH',
    N'THUC_HIEN_KIEM',t.Ord,N'{"handler":"KCS_COMPLETE_WITH_BTP_RECEIPT_AND_OPEN_KPH"}'
FROM @Transitions t
WHERE NOT EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW_TRANSITION x
    WHERE x.WorkflowId=@WorkflowId AND x.ActionCode=t.ActionCode AND x.FromStatusCode=t.FromStatus);

;WITH ActiveV5 AS(
    SELECT p.Id,p.TrangThai
    FROM dbo.DOI_TRA_PHOI_LOI p
    JOIN dbo.DOI_TRA_PHOI_LOI_WORKFLOW workflowRow ON workflowRow.Id=p.WorkflowId
    WHERE workflowRow.WorkflowCode=N'DTP_DEFAULT' AND workflowRow.VersionNo=5
      AND p.TrangThai NOT IN(N'HOAN_TAT',N'DA_HUY')
)
UPDATE p SET WorkflowId=@WorkflowId,
    TrangThai=CASE WHEN sourceRow.TrangThai=N'CHO_TBP_KCS_XAC_NHAN'
        THEN N'CHO_THIET_LAP_KPH' ELSE sourceRow.TrangThai END,
    CurrentStepId=CASE
        WHEN sourceRow.TrangThai IN(N'TAO_MOI',N'TRA_LAI_KCS') THEN @Kcs
        WHEN sourceRow.TrangThai IN(N'CHO_TBP_KCS_XAC_NHAN',N'CHO_THIET_LAP_KPH') THEN @Setup
        ELSE (SELECT TOP 1 stepRow.Id FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP stepRow
            WHERE stepRow.WorkflowId=@WorkflowId
              AND stepRow.PendingStatusCode=sourceRow.TrangThai ORDER BY stepRow.SortOrder)
    END,
    DinhMucCurrentStepId=CASE WHEN ISNULL(p.DinhMucTrangThai,N'CHUA_NHAP')=N'DA_XAC_NHAN' THEN NULL ELSE @B7 END,
    RequiresExecutiveApproval=CASE WHEN sourceRow.TrangThai=N'CHO_TBP_KCS_XAC_NHAN'
        THEN ISNULL((SELECT TOP 1 CAST(BitValue AS bit) FROM dbo.SYSTEM_SETTINGS
            WHERE SettingKey=N'REQUIRE_EXECUTIVE_APPROVAL_KPH'),0)
        ELSE p.RequiresExecutiveApproval END,
    UpdatedAt=SYSDATETIME()
FROM dbo.DOI_TRA_PHOI_LOI p
JOIN ActiveV5 sourceRow ON sourceRow.Id=p.Id;

UPDATE dbo.DOI_TRA_PHOI_LOI_WORKFLOW SET IsActive=0,UpdatedAt=SYSDATETIME()
WHERE EntityType=N'PHIEU_KIEM' AND WorkflowCode=N'DTP_DEFAULT' AND Id<>@WorkflowId;
UPDATE dbo.DOI_TRA_PHOI_LOI_WORKFLOW SET IsActive=1,UpdatedAt=SYSDATETIME()
WHERE Id=@WorkflowId;

COMMIT;
GO
