SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT',N'U') IS NULL
    THROW 52800,N'Chưa có bảng chi tiết lỗi đổi trả phôi.',1;

IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT',N'SourceLenhXuatVTId') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT ADD SourceLenhXuatVTId INT NULL;
IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT',N'SoLenhXuatVT') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT ADD SoLenhXuatVT NVARCHAR(100) NULL;
GO

IF OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN(
        Id INT IDENTITY(1,1) NOT NULL,
        PhoiId INT NOT NULL,
        SourceLenhXuatVTId INT NOT NULL,
        SoLenhXuatVT NVARCHAR(100) NOT NULL,
        SourceKhoXuatId INT NULL,
        TenKhoXuat NVARCHAR(255) NULL,
        LotSanXuat NVARCHAR(100) NULL,
        DauTuan NVARCHAR(100) NULL,
        DonViTaoPhoiId INT NULL,
        MaDonViTaoPhoi NVARCHAR(100) NULL,
        TenDonViTaoPhoi NVARCHAR(255) NULL,
        NgayTaoPhoi DATE NULL,
        ToSanXuat NVARCHAR(255) NULL,
        CongNhanSanXuat NVARCHAR(1000) NULL,
        SortOrder INT NOT NULL CONSTRAINT DF_DTPLPLXVT_SortOrder DEFAULT 0,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_DTPLPLXVT_CreatedAt DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_DTPLPLXVT_UpdatedAt DEFAULT SYSDATETIME(),
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT PK_DTPLPLXVT PRIMARY KEY(Id),
        CONSTRAINT FK_DTPLPLXVT_Phoi FOREIGN KEY(PhoiId)
            REFERENCES dbo.DOI_TRA_PHOI_LOI_PHOI(Id) ON DELETE CASCADE,
        CONSTRAINT UQ_DTPLPLXVT_Phoi_Issue UNIQUE(PhoiId,SourceLenhXuatVTId)
    );
    CREATE INDEX IX_DTPLPLXVT_Issue ON dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN(SourceLenhXuatVTId);
END;
GO

-- Một lỗi giống nhau có thể phát sinh trên nhiều LXVT của cùng một phôi.
IF EXISTS(SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT')
      AND name=N'UX_DTPLPD_Phoi_Defect_Responsibility')
    DROP INDEX UX_DTPLPD_Phoi_Defect_Responsibility ON dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT;

IF NOT EXISTS(SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT')
      AND name=N'UX_DTPLPD_Issue_Defect_Responsibility')
    CREATE UNIQUE INDEX UX_DTPLPD_Issue_Defect_Responsibility
    ON dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT(
        PhoiId,SourceLenhXuatVTId,DefectId,BoPhanGayLoiSource,BoPhanGayLoiSourceId
    )
    WHERE SourceLenhXuatVTId IS NOT NULL
      AND BoPhanGayLoiSource IS NOT NULL AND BoPhanGayLoiSourceId IS NOT NULL;

IF NOT EXISTS(SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT')
      AND name=N'UX_DTPLPD_NoIssue_Defect_Responsibility')
    CREATE UNIQUE INDEX UX_DTPLPD_NoIssue_Defect_Responsibility
    ON dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT(PhoiId,DefectId,BoPhanGayLoiSource,BoPhanGayLoiSourceId)
    WHERE SourceLenhXuatVTId IS NULL
      AND BoPhanGayLoiSource IS NOT NULL AND BoPhanGayLoiSourceId IS NOT NULL;
GO

-- Giữ nội dung LXVT cũ ở cấp phôi làm snapshot lịch sử. ID ERP để trống vì dữ liệu cũ là nhập tay.
UPDATE defectRow
SET SoLenhXuatVT=NULLIF(LTRIM(RTRIM(phoiRow.LenhXuatVatTu)),N'')
FROM dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT defectRow
JOIN dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow ON phoiRow.Id=defectRow.PhoiId
WHERE NULLIF(LTRIM(RTRIM(defectRow.SoLenhXuatVT)),N'') IS NULL
  AND NULLIF(LTRIM(RTRIM(phoiRow.LenhXuatVatTu)),N'') IS NOT NULL;

-- Chuyển dữ liệu tem cấp phôi sang từng LXVT đã được gắn với lỗi, nếu có ID ERP rõ ràng.
INSERT dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN(
    PhoiId,SourceLenhXuatVTId,SoLenhXuatVT,SourceKhoXuatId,TenKhoXuat,
    LotSanXuat,DauTuan,DonViTaoPhoiId,MaDonViTaoPhoi,TenDonViTaoPhoi,
    NgayTaoPhoi,ToSanXuat,CongNhanSanXuat,SortOrder
)
SELECT phoiRow.Id,linkedIssue.SourceLenhXuatVTId,linkedIssue.SoLenhXuatVT,
    issue.ID_KhoXuat,warehouse.Ten_Kho,phoiRow.LotSanXuat,phoiRow.DauTuan,
    phoiRow.DonViTaoPhoiId,phoiRow.MaDonViTaoPhoi,phoiRow.TenDonViTaoPhoi,
    phoiRow.NgayTaoPhoi,phoiRow.ToSanXuat,phoiRow.CongNhanSanXuat,
    ROW_NUMBER() OVER(PARTITION BY phoiRow.Id ORDER BY linkedIssue.SourceLenhXuatVTId)
FROM dbo.DOI_TRA_PHOI_LOI_PHOI phoiRow
JOIN (
    SELECT DISTINCT PhoiId,SourceLenhXuatVTId,SoLenhXuatVT
    FROM dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT
    WHERE SourceLenhXuatVTId IS NOT NULL
) linkedIssue ON linkedIssue.PhoiId=phoiRow.Id
JOIN TAG_QTKD.dbo.LenhXuatVT issue ON issue.ID_LenhXuatVT=linkedIssue.SourceLenhXuatVTId
LEFT JOIN TAG_QTKD.dbo.DM_Kho warehouse ON warehouse.ID_Kho=issue.ID_KhoXuat
WHERE NOT EXISTS(
    SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHOI_LXVT_TRUY_NGUYEN existingRow
    WHERE existingRow.PhoiId=phoiRow.Id
      AND existingRow.SourceLenhXuatVTId=linkedIssue.SourceLenhXuatVTId
);

IF NOT EXISTS(SELECT 1 FROM sys.indexes
    WHERE object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT')
      AND name=N'IX_DTPLPD_SourceLenhXuatVT')
    CREATE INDEX IX_DTPLPD_SourceLenhXuatVT
    ON dbo.DOI_TRA_PHOI_LOI_PHOI_DEFECT(SourceLenhXuatVTId)
    WHERE SourceLenhXuatVTId IS NOT NULL;

COMMIT;
GO
