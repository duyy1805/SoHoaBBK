/* =========================================================
   Update regular inspection approval flow:
   KCS complete -> CHO_XUONG_XAC_NHAN -> XAC_NHAN_PX -> HOAN_TAT

   Run this on the target SQL Server database after deploying code.
   SXBT, tren chuyen, and cuoi chuyen flows are intentionally not changed.
========================================================= */

CREATE OR ALTER PROCEDURE [dbo].[SP_PhieuKiem_My]
(
    @UserId INT,
    @Mode NVARCHAR(50)
)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        pk.Id,
        pk.SoPhieu,
        pk.Lot,
        pk.LoaiKiemId,
        pk.DoiTuong,
        pk.CreatedAt,
        pk.KetLuan,
        pk.TrangThai,
        pk.SoLuong,
        pk.Ngay_Giao,
        sp.MaSanPham,
        sp.TenSanPham,
        u.FullName AS TenNguoiKiem,
        lk.TenLoai AS TenLoaiKiem,
        CASE
            WHEN pk.TrangThai = 'DA_TAO_SECTION' THEN N'Chưa kiểm'
            WHEN pk.TrangThai = 'DANG_KIEM' THEN N'Đang kiểm'
            WHEN pk.TrangThai = 'CHO_XUONG_XAC_NHAN' THEN N'Chờ Trưởng bộ phận'
            WHEN pk.TrangThai = 'CHO_KIEM_NGHIEM' THEN N'Chờ Trưởng bộ phận'
            WHEN pk.TrangThai = 'HOAN_TAT' THEN N'Hoàn tất'
        END AS TrangThaiText
    FROM PHIEU_KIEM pk
    LEFT JOIN DM_SAN_PHAM sp ON pk.SanPhamId = sp.Id
    LEFT JOIN USERS u ON u.Id = pk.NguoiKiemId
    LEFT JOIN USERS u1 ON u1.Id = @UserId
    LEFT JOIN DM_LOAI_KIEM lk ON lk.Id = pk.LoaiKiemId
    LEFT JOIN DM_BO_PHAN bp ON u.BoPhanId = bp.Id
    LEFT JOIN DM_BO_PHAN bp1 ON u1.BoPhanId = bp1.Id
    WHERE
    (
        (@Mode = 'KCS'
            AND pk.NguoiKiemId = @UserId
            AND pk.TrangThai IN ('TAO_MOI','DA_TAO_SECTION','DANG_KIEM'))
        OR
        (@Mode = 'TO_TRUONG_KCS'
            AND u.BoPhanId = u1.BoPhanId)
        OR
        (@Mode = 'PX'
            AND pk.TrangThai = 'CHO_XUONG_XAC_NHAN')
        OR
        (@Mode = 'VIEW')
    )
    AND
    (
        NULLIF(LTRIM(RTRIM(u1.AllowedLoaiKiemIds)), '') IS NULL
        OR EXISTS (
            SELECT 1
            FROM STRING_SPLIT(u1.AllowedLoaiKiemIds, ',') allowed
            WHERE TRY_CONVERT(INT, LTRIM(RTRIM(allowed.value))) = pk.LoaiKiemId
        )
    )
    ORDER BY pk.CreatedAt DESC;
END
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_PhieuKiem_XacNhanPX]
    @PhieuKiemId INT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO PHIEU_KIEM_XAC_NHAN
    (
        PhieuKiemId,
        NguoiXacNhanId,
        VaiTro,
        TrangThai,
        ThoiGian
    )
    VALUES
    (
        @PhieuKiemId,
        @UserId,
        'PX',
        'DONG_Y',
        GETDATE()
    );

    UPDATE PHIEU_KIEM
    SET TrangThai = 'HOAN_TAT'
    WHERE Id = @PhieuKiemId;
END
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_PhieuKiem_Complete]
    @PhieuKiemId INT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @RejectCount INT;
    SELECT @RejectCount = COUNT(*)
    FROM PHIEU_KIEM_SECTION
    WHERE PhieuKiemId = @PhieuKiemId
      AND KetLuan = 'REJECT';

    DECLARE @SpecialRejectCount INT;
    SELECT @SpecialRejectCount = COUNT(*)
    FROM PHIEU_KIEM_THONG_SO_KQ kq
    JOIN SAN_PHAM_THONG_SO ts ON ts.Id = kq.ThongSoId
    WHERE kq.PhieuKiemId = @PhieuKiemId
      AND kq.GiaTriDo IS NOT NULL
      AND TRY_CAST(ts.GiaTriChuan AS FLOAT) IS NOT NULL
      AND (
          kq.GiaTriDo < TRY_CAST(ts.GiaTriChuan AS FLOAT) - ts.DungSaiAm
          OR
          kq.GiaTriDo > TRY_CAST(ts.GiaTriChuan AS FLOAT) + ts.DungSaiDuong
      );

    IF @RejectCount > 0 OR @SpecialRejectCount > 0
    BEGIN
        UPDATE PHIEU_KIEM
        SET KetLuan = 'KHONG_DAT',
            TrangThai = 'CHO_XUONG_XAC_NHAN'
        WHERE Id = @PhieuKiemId;

        IF NOT EXISTS (SELECT 1 FROM BIEN_BAN_KIEM WHERE PhieuKiemId = @PhieuKiemId)
        BEGIN
            INSERT INTO BIEN_BAN_KIEM (PhieuKiemId, NguoiLapId, TrangThai)
            VALUES (@PhieuKiemId, @UserId, 'BB_MOI');
        END
    END
    ELSE
    BEGIN
        UPDATE PHIEU_KIEM
        SET KetLuan = 'DAT',
            TrangThai = 'CHO_XUONG_XAC_NHAN',
            NgayKiem = GETDATE()
        WHERE Id = @PhieuKiemId;
    END
END
GO

UPDATE dbo.PHIEU_KIEM
SET TrangThai = 'CHO_XUONG_XAC_NHAN'
WHERE TrangThai = 'CHO_KIEM_NGHIEM'
  AND LoaiKiemId NOT IN (3, 4, 6);
GO
