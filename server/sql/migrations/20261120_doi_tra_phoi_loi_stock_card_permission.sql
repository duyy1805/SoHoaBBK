SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP',N'U') IS NULL
    THROW 52900,N'Chưa có bảng liên kết phiếu nhập BTP lỗi.',1;
GO

BEGIN TRANSACTION;

IF NOT EXISTS(SELECT 1 FROM dbo.PERMISSIONS WHERE PermissionCode=N'GHI_THE_KHO')
    INSERT dbo.PERMISSIONS(PermissionCode,PermissionName)
    VALUES(N'GHI_THE_KHO',N'Ghi thẻ kho phiếu nhập BTP lỗi');

INSERT dbo.ROLE_PERMISSION(RoleId,PermissionId)
SELECT roleRow.Id,permissionRow.Id
FROM dbo.ROLES roleRow
CROSS JOIN dbo.PERMISSIONS permissionRow
WHERE roleRow.RoleCode=N'ADMIN'
  AND permissionRow.PermissionCode=N'GHI_THE_KHO'
  AND NOT EXISTS(
      SELECT 1 FROM dbo.ROLE_PERMISSION existing
      WHERE existing.RoleId=roleRow.Id AND existing.PermissionId=permissionRow.Id
  );

IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP',N'StockCardRecordedBy') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP ADD StockCardRecordedBy INT NULL;
IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP',N'StockCardRecordedAt') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP ADD StockCardRecordedAt DATETIME2(0) NULL;

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_DTPL_PHIEU_NHAP_BTP_StockCardRecordedBy')
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP WITH CHECK
        ADD CONSTRAINT FK_DTPL_PHIEU_NHAP_BTP_StockCardRecordedBy
        FOREIGN KEY(StockCardRecordedBy) REFERENCES dbo.USERS(Id);

COMMIT TRANSACTION;
GO
