/* Nội dung nhập tay cho mục "Mô tả chi tiết KPH" trên bản in. */
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI',N'U') IS NULL
    THROW 52500,N'Chưa có phân hệ đổi trả phôi lỗi.',1;

IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI',N'MoTaChiTietKph') IS NULL
    ALTER TABLE dbo.DOI_TRA_PHOI_LOI ADD MoTaChiTietKph NVARCHAR(4000) NULL;

SELECT N'Đã bổ sung trường mô tả chi tiết KPH.' AS KetQua;
