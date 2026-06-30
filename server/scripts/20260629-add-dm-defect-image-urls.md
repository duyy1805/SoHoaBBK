# Add ImageUrls To DM_DEFECT

Run this SQL before deploying the backend changes that send `ImageUrls` to
`sp_DM_CreateDefect` and `sp_DM_UpdateDefect`.

```sql
SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

IF COL_LENGTH('dbo.DM_DEFECT', 'ImageUrls') IS NULL
BEGIN
    ALTER TABLE dbo.DM_DEFECT
        ADD ImageUrls NVARCHAR(MAX) NULL;
END;

UPDATE dbo.DM_DEFECT
SET ImageUrls = CONCAT('["', STRING_ESCAPE(ImageUrl, 'json'), '"]')
WHERE ImageUrl IS NOT NULL
  AND LTRIM(RTRIM(ImageUrl)) <> ''
  AND (ImageUrls IS NULL OR LTRIM(RTRIM(ImageUrls)) = '');

COMMIT TRANSACTION;
GO

ALTER PROCEDURE [dbo].[sp_DM_CreateDefect]
    @TenLoi NVARCHAR(255),
    @DefectType NVARCHAR(20),
    @MoTa NVARCHAR(MAX) = NULL,
    @GhiChu NVARCHAR(MAX) = NULL,
    @MaLoi NVARCHAR(50) = NULL,
    @PhanHe NVARCHAR(20) = NULL,
    @MaNhomLoi NVARCHAR(20) = NULL,
    @LoaiLoiSXBT NVARCHAR(10) = NULL,
    @TenSanPham NVARCHAR(255) = NULL,
    @ChungLoai NVARCHAR(255) = NULL,
    @PhamViApDung NVARCHAR(500) = NULL,
    @ThiTruong NVARCHAR(255) = NULL,
    @ImageUrl NVARCHAR(500) = NULL,
    @ImageUrls NVARCHAR(MAX) = NULL,
    @ThuTu INT = NULL,
    @PhuongAnXuLy NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NULLIF(LTRIM(RTRIM(@MaLoi)), '') IS NULL
    BEGIN
        IF NULLIF(LTRIM(RTRIM(@MaNhomLoi)), '') IS NULL
        BEGIN
            RAISERROR(N'Vui lòng nhập MaNhomLoi để tự sinh MaLoi.', 16, 1);
            RETURN;
        END;

        DECLARE @NextStt INT;

        SELECT @NextStt = ISNULL(MAX(
            TRY_CONVERT(INT, SUBSTRING(MaLoi, LEN(@MaNhomLoi) + 2, 50))
        ), 0) + 1
        FROM dbo.DM_DEFECT WITH (UPDLOCK, HOLDLOCK)
        WHERE MaNhomLoi = @MaNhomLoi
          AND MaLoi LIKE @MaNhomLoi + '-%';

        SET @MaLoi = @MaNhomLoi + '-' + RIGHT('0000' + CAST(@NextStt AS VARCHAR(10)), 4);
    END;

    INSERT INTO dbo.DM_DEFECT (
        TenLoi,
        DefectType,
        MoTa,
        GhiChu,
        MaLoi,
        PhanHe,
        MaNhomLoi,
        LoaiLoiSXBT,
        TenSanPham,
        ChungLoai,
        PhamViApDung,
        ThiTruong,
        ImageUrl,
        ImageUrls,
        ThuTu,
        PhuongAnXuLy,
        TrangThai
    )
    VALUES (
        @TenLoi,
        @DefectType,
        @MoTa,
        @GhiChu,
        @MaLoi,
        @PhanHe,
        @MaNhomLoi,
        @LoaiLoiSXBT,
        @TenSanPham,
        @ChungLoai,
        @PhamViApDung,
        @ThiTruong,
        @ImageUrl,
        @ImageUrls,
        @ThuTu,
        @PhuongAnXuLy,
        1
    );
END;
GO

ALTER PROCEDURE [dbo].[sp_DM_UpdateDefect]
    @Id INT,
    @TenLoi NVARCHAR(255),
    @DefectType NVARCHAR(20),
    @TrangThai BIT,
    @MoTa NVARCHAR(MAX) = NULL,
    @GhiChu NVARCHAR(MAX) = NULL,
    @PhuongAnXuLy NVARCHAR(MAX) = NULL,
    @MaLoi NVARCHAR(50) = NULL,
    @PhanHe NVARCHAR(20) = NULL,
    @MaNhomLoi NVARCHAR(20) = NULL,
    @LoaiLoiSXBT NVARCHAR(10) = NULL,
    @TenSanPham NVARCHAR(255) = NULL,
    @ChungLoai NVARCHAR(255) = NULL,
    @PhamViApDung NVARCHAR(500) = NULL,
    @ThiTruong NVARCHAR(255) = NULL,
    @ImageUrl NVARCHAR(500) = NULL,
    @ImageUrls NVARCHAR(MAX) = NULL,
    @ThuTu INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.DM_DEFECT
    SET
        MaLoi = COALESCE(NULLIF(LTRIM(RTRIM(@MaLoi)), ''), MaLoi),
        TenLoi = @TenLoi,
        DefectType = @DefectType,
        TrangThai = @TrangThai,
        MoTa = @MoTa,
        GhiChu = @GhiChu,
        PhuongAnXuLy = @PhuongAnXuLy,
        PhanHe = @PhanHe,
        MaNhomLoi = @MaNhomLoi,
        LoaiLoiSXBT = @LoaiLoiSXBT,
        TenSanPham = @TenSanPham,
        ChungLoai = @ChungLoai,
        PhamViApDung = @PhamViApDung,
        ThiTruong = @ThiTruong,
        ImageUrl = @ImageUrl,
        ImageUrls = @ImageUrls,
        ThuTu = @ThuTu
    WHERE Id = @Id;
END;
GO
```

`sp_DM_GetDefectList` does not have to select `ImageUrls` for the current backend
route; `/lookup/defect-list` attaches `ImageUrls` by `Id` after executing the
procedure.
