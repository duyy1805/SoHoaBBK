/*
    KPH V01 - idempotent schema migration
    Existing records keep V00; records inserted after this migration default to V01.
*/
SET XACT_ABORT ON;
BEGIN TRAN;

IF COL_LENGTH('dbo.BIEN_BAN_KIEM', 'MauPhieuVersion') IS NULL
    ALTER TABLE dbo.BIEN_BAN_KIEM ADD MauPhieuVersion varchar(10) NULL;

UPDATE dbo.BIEN_BAN_KIEM SET MauPhieuVersion = 'V00' WHERE MauPhieuVersion IS NULL;

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.BIEN_BAN_KIEM')
      AND name = 'MauPhieuVersion' AND is_nullable = 1
)
    ALTER TABLE dbo.BIEN_BAN_KIEM ALTER COLUMN MauPhieuVersion varchar(10) NOT NULL;

IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints dc
    JOIN sys.columns c ON c.default_object_id = dc.object_id
    WHERE c.object_id = OBJECT_ID('dbo.BIEN_BAN_KIEM') AND c.name = 'MauPhieuVersion'
)
    ALTER TABLE dbo.BIEN_BAN_KIEM
        ADD CONSTRAINT DF_BIEN_BAN_KIEM_MauPhieuVersion DEFAULT ('V01') FOR MauPhieuVersion;

IF COL_LENGTH('dbo.BIEN_BAN_DEFECT', 'TenDoiTuong') IS NULL
    ALTER TABLE dbo.BIEN_BAN_DEFECT ADD TenDoiTuong nvarchar(255) NULL;

IF COL_LENGTH('dbo.BIEN_BAN_DEFECT', 'SoLuongKiem') IS NULL
    ALTER TABLE dbo.BIEN_BAN_DEFECT ADD SoLuongKiem int NULL;

IF COL_LENGTH('dbo.BIEN_BAN_CHI_PHI', 'TheoDoiBy') IS NULL
    ALTER TABLE dbo.BIEN_BAN_CHI_PHI ADD TheoDoiBy int NULL;

IF COL_LENGTH('dbo.BIEN_BAN_HANH_DONG', 'TheoDoiBy') IS NULL
    ALTER TABLE dbo.BIEN_BAN_HANH_DONG ADD TheoDoiBy int NULL;

IF COL_LENGTH('dbo.XIN_Y_KIEN', 'BoPhanId') IS NULL
    ALTER TABLE dbo.XIN_Y_KIEN ADD BoPhanId int NULL;

IF COL_LENGTH('dbo.XIN_Y_KIEN', 'ThuTu') IS NULL
    ALTER TABLE dbo.XIN_Y_KIEN ADD ThuTu int NOT NULL CONSTRAINT DF_XIN_Y_KIEN_ThuTu DEFAULT (0);

IF COL_LENGTH('dbo.TRA_LOI_Y_KIEN', 'LuaChon') IS NULL
    ALTER TABLE dbo.TRA_LOI_Y_KIEN ADD LuaChon varchar(10) NULL;

IF OBJECT_ID('dbo.BIEN_BAN_THEO_DOI_DANH_GIA', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BIEN_BAN_THEO_DOI_DANH_GIA (
        Id int IDENTITY(1,1) NOT NULL PRIMARY KEY,
        BienBanId int NOT NULL,
        KetQua varchar(20) NOT NULL,
        PhieuKphMoiSo nvarchar(50) NULL,
        GhiChu nvarchar(max) NULL,
        NguoiTheoDoiId int NOT NULL,
        ThoiGian datetime2(7) NOT NULL CONSTRAINT DF_BB_THEO_DOI_ThoiGian DEFAULT (sysdatetime()),
        CONSTRAINT UQ_BB_THEO_DOI_BienBan UNIQUE (BienBanId),
        CONSTRAINT CK_BB_THEO_DOI_KetQua CHECK (KetQua IN ('THOA_MAN', 'KHONG_THOA_MAN')),
        CONSTRAINT FK_BB_THEO_DOI_BienBan FOREIGN KEY (BienBanId) REFERENCES dbo.BIEN_BAN_KIEM(Id),
        CONSTRAINT FK_BB_THEO_DOI_Nguoi FOREIGN KEY (NguoiTheoDoiId) REFERENCES dbo.USERS(Id)
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.PERMISSIONS WHERE PermissionCode = N'THEO_DOI_KPH')
    INSERT INTO dbo.PERMISSIONS (PermissionCode, PermissionName)
    VALUES (N'THEO_DOI_KPH', N'Theo dõi và đánh giá phiếu không phù hợp');

DECLARE @TheoDoiPermissionId int = (
    SELECT Id FROM dbo.PERMISSIONS WHERE PermissionCode = N'THEO_DOI_KPH'
);

INSERT INTO dbo.ROLE_PERMISSION (RoleId, PermissionId)
SELECT DISTINCT rp.RoleId, @TheoDoiPermissionId
FROM dbo.ROLE_PERMISSION rp
JOIN dbo.PERMISSIONS p ON p.Id = rp.PermissionId AND p.PermissionCode = N'KET_LUAN'
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.ROLE_PERMISSION existing
    WHERE existing.RoleId = rp.RoleId AND existing.PermissionId = @TheoDoiPermissionId
);

COMMIT TRAN;
GO

CREATE OR ALTER PROCEDURE dbo.sp_PhieuXuLyKPH_SaveDefects
    @BienBanId int,
    @DefectsJson nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.BIEN_BAN_KIEM
        WHERE Id = @BienBanId AND LoaiBienBan = N'STANDALONE'
    )
        THROW 51001, N'Không tìm thấy phiếu xử lý không phù hợp', 1;

    BEGIN TRAN;
    DELETE FROM dbo.BIEN_BAN_DEFECT WHERE BienBanId = @BienBanId;

    INSERT INTO dbo.BIEN_BAN_DEFECT (
        BienBanId, DefectId, MaLoi, TenLoi, DefectType, TenLoiTuNhap,
        MoTa, SoLuong, GhiChu, SortOrder, TenDoiTuong, SoLuongKiem
    )
    SELECT
        @BienBanId, src.DefectId, NULLIF(LTRIM(RTRIM(src.MaLoi)), ''),
        NULLIF(LTRIM(RTRIM(src.TenLoi)), ''), NULLIF(LTRIM(RTRIM(src.DefectType)), ''),
        NULLIF(LTRIM(RTRIM(src.TenLoiTuNhap)), ''), NULLIF(LTRIM(RTRIM(src.MoTa)), ''),
        src.SoLuong, NULLIF(LTRIM(RTRIM(src.GhiChu)), ''), src.SortOrder,
        NULLIF(LTRIM(RTRIM(src.TenDoiTuong)), ''), src.SoLuongKiem
    FROM OPENJSON(@DefectsJson)
    WITH (
        DefectId int '$.defectId', MaLoi nvarchar(50) '$.maLoi', TenLoi nvarchar(255) '$.tenLoi',
        DefectType nvarchar(20) '$.defectType', TenLoiTuNhap nvarchar(255) '$.tenLoiTuNhap',
        MoTa nvarchar(max) '$.moTa', SoLuong int '$.soLuong', GhiChu nvarchar(max) '$.ghiChu',
        SortOrder int '$.sortOrder', TenDoiTuong nvarchar(255) '$.tenDoiTuong', SoLuongKiem int '$.soLuongKiem'
    ) src;

    COMMIT TRAN;
END;
GO
