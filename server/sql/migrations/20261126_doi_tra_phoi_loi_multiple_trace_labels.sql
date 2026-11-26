SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN',N'U') IS NULL
    THROW 52900,N'Chưa có bảng tem truy nguyên đổi trả phôi.',1;

IF EXISTS (
    SELECT 1 FROM sys.key_constraints
    WHERE parent_object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN')
      AND name=N'UQ_DTPLPLXVT_Phoi_Issue'
)
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN
        DROP CONSTRAINT UQ_DTPLPLXVT_Phoi_Issue;

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN')
      AND name=N'SourceLenhXuatVTId' AND is_nullable=0
)
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN
        ALTER COLUMN SourceLenhXuatVTId INT NULL;

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN')
      AND name=N'SoLenhXuatVT' AND is_nullable=0
)
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN
        ALTER COLUMN SoLenhXuatVT NVARCHAR(100) NULL;

IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN',N'ManualLxvtKey') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN
        ADD ManualLxvtKey UNIQUEIDENTIFIER NULL;

-- Một số môi trường đã có index từ bản cập nhật thủ công trước đó. SQL Server
-- không cho đổi nullability của cột khi index này còn phụ thuộc vào cột.
IF EXISTS(SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN')
      AND name=N'UX_DTPL_PHOI_LXVT_ManualKey')
    DROP INDEX UX_DTPL_PHOI_LXVT_ManualKey
    ON dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN;

IF EXISTS(SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN')
      AND name=N'UX_DTPLPLXVT_Phoi_ManualKey')
    DROP INDEX UX_DTPLPLXVT_Phoi_ManualKey
    ON dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN;

UPDATE dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN
SET ManualLxvtKey=NEWID()
WHERE ManualLxvtKey IS NULL;

ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN
    ALTER COLUMN ManualLxvtKey UNIQUEIDENTIFIER NOT NULL;

IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT',N'ManualLxvtKey') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT
        ADD ManualLxvtKey UNIQUEIDENTIFIER NULL;

UPDATE defectRow
SET ManualLxvtKey=traceRow.ManualLxvtKey
FROM dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT defectRow
JOIN dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN traceRow
  ON traceRow.PhoiId=defectRow.PhoiId
 AND traceRow.SourceLenhXuatVTId=defectRow.SourceLenhXuatVTId
WHERE defectRow.ManualLxvtKey IS NULL
  AND defectRow.SourceLenhXuatVTId IS NOT NULL;

-- Chuyển thông tin tem cấp phôi của phiếu Bao gói cũ thành tem truy nguyên đầu tiên.
INSERT dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN(
    PhoiId,ManualLxvtKey,SourceLenhXuatVTId,SoLenhXuatVT,SourceKhoXuatId,TenKhoXuat,
    LotSanXuat,DauTuan,DonViTaoPhoiId,MaDonViTaoPhoi,TenDonViTaoPhoi,
    NgayTaoPhoi,ToSanXuat,CongNhanSanXuat,SortOrder
)
SELECT phoiRow.Id,NEWID(),NULL,NULL,NULL,NULL,
       phoiRow.LotSanXuat,phoiRow.DauTuan,phoiRow.DonViTaoPhoiId,
       phoiRow.MaDonViTaoPhoi,phoiRow.TenDonViTaoPhoi,
       phoiRow.NgayTaoPhoi,phoiRow.ToSanXuat,phoiRow.CongNhanSanXuat,1
FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
JOIN dbo.DOI_TRA_PHOI_LOI_PLAN planRow ON planRow.PhieuId=phoiRow.PhieuId
WHERE planRow.RequireLenhXuatVatTu=0
  AND NOT EXISTS(
      SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN traceRow
      WHERE traceRow.PhoiId=phoiRow.Id
  );

UPDATE defectRow
SET ManualLxvtKey=firstTrace.ManualLxvtKey
FROM dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT defectRow
CROSS APPLY (
    SELECT TOP (1) traceRow.ManualLxvtKey
    FROM dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN traceRow
    WHERE traceRow.PhoiId=defectRow.PhoiId
    ORDER BY traceRow.SortOrder,traceRow.Id
) firstTrace
WHERE defectRow.ManualLxvtKey IS NULL;

IF EXISTS(SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT')
      AND name=N'UX_DTPLPD_Issue_Defect_Responsibility')
    DROP INDEX UX_DTPLPD_Issue_Defect_Responsibility ON dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT;

IF EXISTS(SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT')
      AND name=N'UX_DTPLPD_NoIssue_Defect_Responsibility')
    DROP INDEX UX_DTPLPD_NoIssue_Defect_Responsibility ON dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT;

IF NOT EXISTS(SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN')
      AND name=N'UX_DTPLPLXVT_Phoi_ManualKey')
    CREATE UNIQUE INDEX UX_DTPLPLXVT_Phoi_ManualKey
    ON dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN(PhoiId,ManualLxvtKey);

IF NOT EXISTS(SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN')
      AND name=N'UX_DTPLPLXVT_Phoi_SourceIssue')
    CREATE UNIQUE INDEX UX_DTPLPLXVT_Phoi_SourceIssue
    ON dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN(PhoiId,SourceLenhXuatVTId)
    WHERE SourceLenhXuatVTId IS NOT NULL;

IF NOT EXISTS(SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT')
      AND name=N'UX_DTPLPD_Trace_Defect_Responsibility')
    CREATE UNIQUE INDEX UX_DTPLPD_Trace_Defect_Responsibility
    ON dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT(
        PhoiId,ManualLxvtKey,DefectId,BoPhanGayLoiSource,BoPhanGayLoiSourceId
    )
    WHERE ManualLxvtKey IS NOT NULL
      AND BoPhanGayLoiSource IS NOT NULL AND BoPhanGayLoiSourceId IS NOT NULL;

COMMIT;
GO
