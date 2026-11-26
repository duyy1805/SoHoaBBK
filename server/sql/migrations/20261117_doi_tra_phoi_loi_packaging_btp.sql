SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI',N'U') IS NULL
    THROW 52700,N'Chưa có phân hệ đổi trả phôi lỗi.',1;
IF OBJECT_ID(N'dbo.DM_SAN_PHAM',N'U') IS NULL
    THROW 52701,N'Chưa có danh mục sản phẩm nội bộ.',1;
GO

BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_CONG_DOAN_CONFIG',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DOI_TRA_PHOI_LOI_CONG_DOAN_CONFIG(
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DTPL_CD_CONFIG PRIMARY KEY,
        SourceQuyTrinhSanXuatId TINYINT NOT NULL,
        OperationCode NVARCHAR(100) NOT NULL,
        SelectionMode NVARCHAR(30) NOT NULL,
        BtpSuffix NVARCHAR(20) NULL,
        RequiresB7 BIT NOT NULL CONSTRAINT DF_DTPL_CD_CONFIG_RequiresB7 DEFAULT(1),
        RequireLenhXuatVatTu BIT NOT NULL CONSTRAINT DF_DTPL_CD_CONFIG_RequireLXVT DEFAULT(1),
        IsActive BIT NOT NULL CONSTRAINT DF_DTPL_CD_CONFIG_IsActive DEFAULT(1),
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_DTPL_CD_CONFIG_CreatedAt DEFAULT(SYSDATETIME()),
        UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_DTPL_CD_CONFIG_UpdatedAt DEFAULT(SYSDATETIME()),
        CONSTRAINT UQ_DTPL_CD_CONFIG_Process UNIQUE(SourceQuyTrinhSanXuatId),
        CONSTRAINT CK_DTPL_CD_CONFIG_Mode CHECK(SelectionMode IN(N'COMPONENT',N'PREVIOUS_STAGE_BTP')),
        CONSTRAINT CK_DTPL_CD_CONFIG_Suffix CHECK(
            (SelectionMode=N'COMPONENT' AND BtpSuffix IS NULL)
            OR (SelectionMode=N'PREVIOUS_STAGE_BTP' AND NULLIF(LTRIM(RTRIM(BtpSuffix)),N'') IS NOT NULL)
        )
    );
END;

DECLARE @BaoGoiCount INT=(
    SELECT COUNT(*) FROM TAG_QTKD.dbo.DM_QuyTrinhSanXuat
    WHERE UPPER(LTRIM(RTRIM(KyHieu_QuyTrinhSanXuat)))=N'B'
);
IF @BaoGoiCount<>1
    THROW 52702,N'Không xác định được duy nhất quy trình Bao gói có ký hiệu B.',1;

DECLARE @BaoGoiProcessId TINYINT=(
    SELECT ID_QuyTrinhSanXuat FROM TAG_QTKD.dbo.DM_QuyTrinhSanXuat
    WHERE UPPER(LTRIM(RTRIM(KyHieu_QuyTrinhSanXuat)))=N'B'
);

IF EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_CONG_DOAN_CONFIG WHERE SourceQuyTrinhSanXuatId=@BaoGoiProcessId)
    UPDATE dbo.DOI_TRA_PHOI_LOI_CONG_DOAN_CONFIG
    SET OperationCode=N'B',SelectionMode=N'PREVIOUS_STAGE_BTP',BtpSuffix=N'M',
        RequiresB7=0,RequireLenhXuatVatTu=0,IsActive=1,UpdatedAt=SYSDATETIME()
    WHERE SourceQuyTrinhSanXuatId=@BaoGoiProcessId;
ELSE
    INSERT dbo.DOI_TRA_PHOI_LOI_CONG_DOAN_CONFIG(
        SourceQuyTrinhSanXuatId,OperationCode,SelectionMode,BtpSuffix,RequiresB7,RequireLenhXuatVatTu
    ) VALUES(@BaoGoiProcessId,N'B',N'PREVIOUS_STAGE_BTP',N'M',0,0);

IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_PLAN',N'SourceQuyTrinhSanXuatId') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PLAN ADD SourceQuyTrinhSanXuatId TINYINT NULL;
IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_PLAN',N'PhoiSelectionMode') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PLAN ADD PhoiSelectionMode NVARCHAR(30) NOT NULL
        CONSTRAINT DF_DTPL_PLAN_PhoiSelectionMode DEFAULT(N'COMPONENT');
IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_PLAN',N'BtpStageSuffix') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PLAN ADD BtpStageSuffix NVARCHAR(20) NULL;
IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_PLAN',N'RequiresB7') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PLAN ADD RequiresB7 BIT NOT NULL
        CONSTRAINT DF_DTPL_PLAN_RequiresB7 DEFAULT(1);
IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_PLAN',N'RequireLenhXuatVatTu') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PLAN ADD RequireLenhXuatVatTu BIT NOT NULL
        CONSTRAINT DF_DTPL_PLAN_RequireLXVT DEFAULT(1);

IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_PHOI',N'SourceType') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHOI ADD SourceType NVARCHAR(20) NOT NULL
        CONSTRAINT DF_DTPLP_SourceType DEFAULT(N'COMPONENT');
IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_PHOI',N'SourceCatalogProductId') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHOI ADD SourceCatalogProductId INT NULL;
IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_PHOI',N'SelectedItemCode') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHOI ADD SelectedItemCode NVARCHAR(100) NULL;
IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_PHOI',N'SelectedItemName') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHOI ADD SelectedItemName NVARCHAR(500) NULL;
GO

IF EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI') AND name=N'UQ_DTPLP_Phieu_Source')
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHOI DROP CONSTRAINT UQ_DTPLP_Phieu_Source;

ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHOI ALTER COLUMN SourceLoiPhoiId INT NULL;
ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHOI ALTER COLUMN SourceVatTuId INT NULL;

IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI') AND name=N'UX_DTPLP_Component')
    CREATE UNIQUE INDEX UX_DTPLP_Component ON dbo.DOI_TRA_PHOI_LOI_PHOI(PhieuId,SourceLoiPhoiId)
    WHERE SourceType=N'COMPONENT' AND SourceLoiPhoiId IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI') AND name=N'UX_DTPLP_BtpStage')
    CREATE UNIQUE INDEX UX_DTPLP_BtpStage ON dbo.DOI_TRA_PHOI_LOI_PHOI(PhieuId,SourceCatalogProductId)
    WHERE SourceType=N'BTP_STAGE' AND SourceCatalogProductId IS NOT NULL;

IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_DTPLP_SourceType')
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHOI WITH CHECK ADD CONSTRAINT CK_DTPLP_SourceType CHECK(
        (SourceType=N'COMPONENT' AND SourceLoiPhoiId IS NOT NULL AND SourceVatTuId IS NOT NULL AND SourceCatalogProductId IS NULL)
        OR (SourceType=N'BTP_STAGE' AND SourceLoiPhoiId IS NULL AND SourceVatTuId IS NULL AND SourceCatalogProductId IS NOT NULL)
    );
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_DTPLP_CatalogProduct')
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHOI WITH CHECK ADD CONSTRAINT FK_DTPLP_CatalogProduct
        FOREIGN KEY(SourceCatalogProductId) REFERENCES dbo.DM_SAN_PHAM(Id);

-- Dữ liệu Bao gói hiện tại chỉ là dữ liệu thử nghiệm. Chặn xóa nếu đã sinh chứng từ ERP.
IF EXISTS(
    SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PLAN planRow
    JOIN dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP receiptLink ON receiptLink.PhieuId=planRow.PhieuId
    JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt ON receipt.ID_PhieuNhapBTP=receiptLink.SourcePhieuNhapBtpId
    WHERE UPPER(LTRIM(RTRIM(planRow.OperationCode)))=N'B' AND receipt.TonTai=1
) OR EXISTS(
    SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PLAN planRow
    JOIN dbo.DOI_TRA_PHOI_LOI_LENH_XUAT_VT issueLink ON issueLink.PhieuId=planRow.PhieuId
    JOIN TAG_QTKD.dbo.LenhXuatVT issue ON issue.ID_LenhXuatVT=issueLink.SourceLenhXuatVTId
    WHERE UPPER(LTRIM(RTRIM(planRow.OperationCode)))=N'B' AND issue.TonTai=1
)
    THROW 52703,N'Phiếu Bao gói thử nghiệm đã có chứng từ ERP. Cần thu hồi chứng từ trước khi chạy migration.',1;

DELETE notificationRow
FROM dbo.NOTIFICATIONS notificationRow
JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId=notificationRow.ReferenceId
WHERE UPPER(LTRIM(RTRIM(planRow.OperationCode)))=N'B'
  AND notificationRow.Type IN(N'DTP_KPH_OPINION',N'DTP_EXECUTIVE_APPROVAL');
DELETE phieu
FROM dbo.DOI_TRA_PHOI_LOI phieu
JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId=phieu.Id
WHERE UPPER(LTRIM(RTRIM(planRow.OperationCode)))=N'B';

DECLARE @PreviousWorkflowId INT=(SELECT TOP 1 Id FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW
    WHERE WorkflowCode=N'DTP_DEFAULT' ORDER BY VersionNo DESC);
DECLARE @WorkflowId INT=(SELECT Id FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW
    WHERE WorkflowCode=N'DTP_DEFAULT' AND VersionNo=7);
IF @WorkflowId IS NULL
BEGIN
    INSERT dbo.DOI_TRA_PHOI_LOI_WORKFLOW(WorkflowCode,WorkflowName,VersionNo,EntityType,IsActive)
    VALUES(N'DTP_DEFAULT',N'Đổi phôi lỗi: hỗ trợ BTP sau công đoạn và Kho xác nhận',7,N'PHIEU_KIEM',0);
    SET @WorkflowId=SCOPE_IDENTITY();

    INSERT dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP(
        WorkflowId,StepCode,StepName,SortOrder,PendingStatusCode,CompletedStatusCode,
        RequiredPermission,RequiredDepartmentCode,IsRequired,ConfigJson,TrackCode
    )
    SELECT @WorkflowId,StepCode,StepName,SortOrder,PendingStatusCode,CompletedStatusCode,
        RequiredPermission,RequiredDepartmentCode,IsRequired,ConfigJson,TrackCode
    FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP WHERE WorkflowId=@PreviousWorkflowId;

    INSERT dbo.DOI_TRA_PHOI_LOI_WORKFLOW_TRANSITION(
        WorkflowId,ActionCode,ActionName,FromStepId,ToStepId,FromStatusCode,ToStatusCode,
        RequiredPermission,SortOrder,IsActive,ConfigJson
    )
    SELECT @WorkflowId,t.ActionCode,t.ActionName,fromStepNew.Id,toStepNew.Id,t.FromStatusCode,t.ToStatusCode,
        t.RequiredPermission,t.SortOrder,t.IsActive,t.ConfigJson
    FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW_TRANSITION t
    JOIN dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP fromStepOld ON fromStepOld.Id=t.FromStepId
    JOIN dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP fromStepNew
      ON fromStepNew.WorkflowId=@WorkflowId AND fromStepNew.StepCode=fromStepOld.StepCode
    LEFT JOIN dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP toStepOld ON toStepOld.Id=t.ToStepId
    LEFT JOIN dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP toStepNew
      ON toStepNew.WorkflowId=@WorkflowId AND toStepNew.StepCode=toStepOld.StepCode
    WHERE t.WorkflowId=@PreviousWorkflowId;
END;

UPDATE dbo.DOI_TRA_PHOI_LOI_WORKFLOW SET IsActive=0,UpdatedAt=SYSDATETIME()
WHERE EntityType=N'PHIEU_KIEM' AND WorkflowCode=N'DTP_DEFAULT' AND Id<>@WorkflowId;
UPDATE dbo.DOI_TRA_PHOI_LOI_WORKFLOW SET IsActive=1,UpdatedAt=SYSDATETIME() WHERE Id=@WorkflowId;

COMMIT;
GO
