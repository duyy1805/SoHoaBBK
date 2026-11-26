SET XACT_ABORT ON;
GO

CREATE OR ALTER FUNCTION dbo.fn_AqlConfig_NormalizeKey
(
    @Value NVARCHAR(255)
)
RETURNS NVARCHAR(255)
AS
BEGIN
    DECLARE @Result NVARCHAR(255) = LOWER(LTRIM(RTRIM(ISNULL(@Value, N''))));
    SET @Result = REPLACE(REPLACE(REPLACE(@Result, CHAR(9), N' '), CHAR(10), N' '), CHAR(13), N' ');
    WHILE CHARINDEX(N'  ', @Result) > 0
        SET @Result = REPLACE(@Result, N'  ', N' ');
    RETURN @Result;
END;
GO

IF OBJECT_ID(N'dbo.DM_CHECK_ITEM_AQL_CONFIG', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DM_CHECK_ITEM_AQL_CONFIG
    (
        Id INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_DM_CHECK_ITEM_AQL_CONFIG PRIMARY KEY,
        KhachHang VARCHAR(10) NOT NULL,
        TenNhom NVARCHAR(255) NOT NULL,
        NhomKiemKey NVARCHAR(255) NOT NULL,
        TenMucKiem NVARCHAR(255) NOT NULL,
        TenMucKiemKey NVARCHAR(255) NOT NULL,
        InspectionLevel NVARCHAR(100) NOT NULL,
        TrangThai BIT NOT NULL
            CONSTRAINT DF_DM_CHECK_ITEM_AQL_CONFIG_TrangThai DEFAULT (1),
        CreatedBy INT NULL,
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_DM_CHECK_ITEM_AQL_CONFIG_CreatedAt DEFAULT (SYSDATETIME()),
        UpdatedBy INT NULL,
        UpdatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_DM_CHECK_ITEM_AQL_CONFIG_UpdatedAt DEFAULT (SYSDATETIME()),
        CONSTRAINT CK_DM_CHECK_ITEM_AQL_CONFIG_KhachHang
            CHECK (KhachHang IN ('IKEA', 'DEK'))
    );

    CREATE UNIQUE INDEX UX_DM_CHECK_ITEM_AQL_CONFIG_Key
        ON dbo.DM_CHECK_ITEM_AQL_CONFIG (KhachHang, NhomKiemKey, TenMucKiemKey);

    CREATE INDEX IX_DM_CHECK_ITEM_AQL_CONFIG_Lookup
        ON dbo.DM_CHECK_ITEM_AQL_CONFIG (KhachHang, TrangThai, NhomKiemKey, TenMucKiemKey)
        INCLUDE (InspectionLevel, TenNhom, TenMucKiem);
END;
GO

DECLARE @Seed TABLE
(
    TenNhom NVARCHAR(255) NOT NULL,
    TenMucKiem NVARCHAR(255) NOT NULL,
    InspectionLevel NVARCHAR(100) NOT NULL
);

INSERT @Seed (TenNhom, TenMucKiem, InspectionLevel)
VALUES
    (N'Bao gói', N'Kích thước hộp', N'S2'),
    (N'Bao gói', N'Trọng lượng hộp', N'S2'),
    (N'Bao gói', N'Thông tin đóng thùng', N'S2'),
    (N'Bao gói', N'Kiểm tra đóng gói', N'S2'),
    (N'Sản phẩm', N'Thông số', N'S2'),
    (N'Sản phẩm', N'Hình in', N'S2'),
    (N'Sản phẩm', N'Truy vết', N'S2'),
    (N'Sản phẩm', N'Tem carelabel', N'S2'),
    (N'Sản phẩm', N'Tem cảnh báo cháy', N'S2'),
    (N'Sản phẩm', N'Tem hướng dẫn lắp ráp', N'S2'),
    (N'Sản phẩm', N'RFID', N'S2'),
    (N'Sản phẩm', N'Bacode', N'S2'),
    (N'Sản phẩm', N'Tem thị trường Ấn Độ (nếu có)', N'S2'),
    (N'Sản phẩm', N'Chức năng khóa kéo', N'S2'),
    (N'Sản phẩm', N'Chức năng khóa sập, then/ chốt hãm', N'S2'),
    (N'Sản phẩm', N'Chức năng chịu lực', N'S2'),
    (N'Sản phẩm', N'Chức năng then trượt', N'S2'),
    (N'Sản phẩm', N'Lắp ráp', N'S2');

INSERT dbo.DM_CHECK_ITEM_AQL_CONFIG
(
    KhachHang, TenNhom, NhomKiemKey, TenMucKiem, TenMucKiemKey,
    InspectionLevel, TrangThai
)
SELECT
    'DEK', seed.TenNhom, dbo.fn_AqlConfig_NormalizeKey(seed.TenNhom),
    seed.TenMucKiem, dbo.fn_AqlConfig_NormalizeKey(seed.TenMucKiem),
    seed.InspectionLevel, 1
FROM @Seed seed
WHERE NOT EXISTS
(
    SELECT 1
    FROM dbo.DM_CHECK_ITEM_AQL_CONFIG existing
    WHERE existing.KhachHang = 'DEK'
      AND existing.NhomKiemKey = dbo.fn_AqlConfig_NormalizeKey(seed.TenNhom)
      AND existing.TenMucKiemKey = dbo.fn_AqlConfig_NormalizeKey(seed.TenMucKiem)
);
GO

CREATE OR ALTER PROCEDURE dbo.sp_PhieuKiem_CalculateAQL
    @SectionId INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TotalCritical INT = 0,
            @TotalMajor INT = 0,
            @TotalMinor INT = 0,
            @HasRejectedItem BIT = 0,
            @PhieuKiemId INT,
            @LoaiKiemId INT,
            @Customer VARCHAR(10),
            @InvoiceNo NVARCHAR(255),
            @PackingMethod NVARCHAR(255);

    SELECT @PhieuKiemId = sectionRow.PhieuKiemId,
           @LoaiKiemId = inspection.LoaiKiemId,
           @InvoiceNo = NULLIF(LTRIM(RTRIM(COALESCE(invoiceField.FieldValue,
                CASE
                    WHEN CHARINDEX(N' - ', inspection.DoiTuong) > 0
                        THEN LEFT(inspection.DoiTuong, CHARINDEX(N' - ', inspection.DoiTuong) - 1)
                    ELSE inspection.DoiTuong
                END))), N''),
           @PackingMethod = NULLIF(LTRIM(RTRIM(packingField.FieldValue)), N''),
           @Customer = CASE
                WHEN UPPER(LTRIM(RTRIM(COALESCE(customerField.FieldValue, N'')))) IN ('IKEA', 'DEK')
                    THEN UPPER(LTRIM(RTRIM(customerField.FieldValue)))
                ELSE NULL
           END
    FROM dbo.PHIEU_KIEM_SECTION sectionRow
    JOIN dbo.PHIEU_KIEM inspection ON inspection.Id = sectionRow.PhieuKiemId
    OUTER APPLY (
        SELECT TOP (1) FieldValue
        FROM dbo.PhieuKiem_CustomFields
        WHERE PhieuKiemId = inspection.Id AND FieldName IN (N'DongCont_KhachHang', N'KhachHang')
        ORDER BY CASE WHEN FieldName = N'DongCont_KhachHang' THEN 0 ELSE 1 END
    ) customerField
    OUTER APPLY (
        SELECT TOP (1) FieldValue
        FROM dbo.PhieuKiem_CustomFields
        WHERE PhieuKiemId = inspection.Id AND FieldName = N'DongCont_InvoiceNo'
    ) invoiceField
    OUTER APPLY (
        SELECT TOP (1) FieldValue
        FROM dbo.PhieuKiem_CustomFields
        WHERE PhieuKiemId = inspection.Id AND FieldName = N'DongCont_PackingMethod'
    ) packingField
    WHERE sectionRow.Id = @SectionId;

    IF @LoaiKiemId = 5 AND @Customer IS NULL
    BEGIN
        SET @Customer = CASE
            WHEN UPPER(ISNULL(@InvoiceNo, N'')) LIKE N'%ECIS%' THEN 'IKEA'
            WHEN UPPER(ISNULL(@InvoiceNo, N'')) LIKE N'%DC%' THEN 'DEK'
            WHEN NULLIF(@PackingMethod, N'') IS NOT NULL
                 AND @PackingMethod NOT LIKE N'%[^0-9]%' THEN 'DEK'
            ELSE NULL
        END;
    END;

    SELECT
        @TotalCritical = ISNULL(SUM(CASE WHEN DefectType = 'CRITICAL' THEN SoLuong ELSE 0 END), 0),
        @TotalMajor = ISNULL(SUM(CASE WHEN DefectType = 'MAJOR' THEN SoLuong ELSE 0 END), 0),
        @TotalMinor = ISNULL(SUM(CASE WHEN DefectType = 'MINOR' THEN SoLuong ELSE 0 END), 0)
    FROM dbo.PHIEU_KIEM_DEFECT
    WHERE SectionId = @SectionId;

    CREATE TABLE #EffectiveItems
    (
        CheckItemId INT NOT NULL PRIMARY KEY,
        KetQua NVARCHAR(50) NULL,
        LotSize INT NOT NULL,
        EffectiveInspectionLevel NVARCHAR(100) NULL,
        UsesItemAql BIT NOT NULL,
        SectionAcCritical INT NULL,
        SectionAcMajor INT NULL,
        SectionAcMinor INT NULL
    );

    INSERT #EffectiveItems
    (
        CheckItemId, KetQua, LotSize, EffectiveInspectionLevel, UsesItemAql,
        SectionAcCritical, SectionAcMajor, SectionAcMinor
    )
    SELECT checkItem.Id,
           checkItem.KetQua,
           sectionRow.TongSo,
           COALESCE(
               NULLIF(checkItem.InspectionLevelOverride, N''),
               NULLIF(config.InspectionLevel, N''),
               sectionRow.InspectionLevel
           ),
           CASE
               WHEN NULLIF(checkItem.InspectionLevelOverride, N'') IS NOT NULL
                 OR NULLIF(config.InspectionLevel, N'') IS NOT NULL THEN 1
               ELSE 0
           END,
           sectionRow.Ac_Critical,
           sectionRow.Ac_Major,
           sectionRow.Ac_Minor
    FROM dbo.PHIEU_KIEM_CHECK_ITEM checkItem
    JOIN dbo.PHIEU_KIEM_SECTION sectionRow ON sectionRow.Id = checkItem.SectionId
    OUTER APPLY (
        SELECT TOP (1) configRule.InspectionLevel
        FROM dbo.DM_CHECK_ITEM_AQL_CONFIG configRule
        WHERE @LoaiKiemId = 5
          AND configRule.TrangThai = 1
          AND configRule.KhachHang = @Customer
          AND configRule.NhomKiemKey = dbo.fn_AqlConfig_NormalizeKey(sectionRow.TenNhom)
          AND configRule.TenMucKiemKey = dbo.fn_AqlConfig_NormalizeKey(checkItem.TenMucKiem)
        ORDER BY configRule.Id
    ) config
    WHERE checkItem.SectionId = @SectionId;

    IF EXISTS
    (
        SELECT 1
        FROM #EffectiveItems item
        WHERE item.UsesItemAql = 1
          AND ISNULL(item.KetQua, N'') <> N'NA'
          AND NOT EXISTS
          (
              SELECT 1
              FROM dbo.DM_AQL_PLAN planRow
              WHERE planRow.InspectionLevel = item.EffectiveInspectionLevel
                AND item.LotSize BETWEEN planRow.LotMin AND planRow.LotMax
          )
          AND NOT EXISTS
          (
              SELECT 1
              FROM dbo.DM_AQL_PLAN planRow
              WHERE planRow.InspectionLevel = item.EffectiveInspectionLevel
              GROUP BY planRow.InspectionLevel
              HAVING item.LotSize < MIN(planRow.LotMin)
          )
    )
    BEGIN
        THROW 50001, N'AQL hiệu lực chưa có bảng lấy mẫu phù hợp với cỡ lô. Vui lòng kiểm tra cấu hình AQL theo mục kiểm.', 1;
    END;

    IF EXISTS
    (
        SELECT 1
        FROM #EffectiveItems item
        OUTER APPLY
        (
            SELECT TOP (1) 1 AS PlanFound,
                   planRow.Ac_Critical, planRow.Ac_Major, planRow.Ac_Minor
            FROM dbo.DM_AQL_PLAN planRow
            WHERE planRow.InspectionLevel = item.EffectiveInspectionLevel
              AND item.LotSize BETWEEN planRow.LotMin AND planRow.LotMax
            ORDER BY planRow.LotMin DESC
        ) effectiveAql
        OUTER APPLY
        (
            SELECT MIN(planRow.LotMin) AS MinimumLot
            FROM dbo.DM_AQL_PLAN planRow
            WHERE planRow.InspectionLevel = item.EffectiveInspectionLevel
        ) levelRange
        CROSS APPLY
        (
            SELECT
                CASE
                    WHEN effectiveAql.PlanFound = 1 THEN effectiveAql.Ac_Critical
                    WHEN levelRange.MinimumLot IS NOT NULL AND item.LotSize < levelRange.MinimumLot THEN 0
                    WHEN item.UsesItemAql = 0 THEN item.SectionAcCritical
                    ELSE NULL
                END AS Ac_Critical,
                CASE
                    WHEN effectiveAql.PlanFound = 1 THEN effectiveAql.Ac_Major
                    WHEN levelRange.MinimumLot IS NOT NULL AND item.LotSize < levelRange.MinimumLot THEN 0
                    WHEN item.UsesItemAql = 0 THEN item.SectionAcMajor
                    ELSE NULL
                END AS Ac_Major,
                CASE
                    WHEN effectiveAql.PlanFound = 1 THEN effectiveAql.Ac_Minor
                    WHEN levelRange.MinimumLot IS NOT NULL AND item.LotSize < levelRange.MinimumLot THEN 0
                    WHEN item.UsesItemAql = 0 THEN item.SectionAcMinor
                    ELSE NULL
                END AS Ac_Minor
        ) thresholds
        OUTER APPLY
        (
            SELECT
                ISNULL(SUM(CASE WHEN defect.DefectType = 'CRITICAL' THEN defect.SoLuong ELSE 0 END), 0) AS TotalCritical,
                ISNULL(SUM(CASE WHEN defect.DefectType = 'MAJOR' THEN defect.SoLuong ELSE 0 END), 0) AS TotalMajor,
                ISNULL(SUM(CASE WHEN defect.DefectType = 'MINOR' THEN defect.SoLuong ELSE 0 END), 0) AS TotalMinor
            FROM dbo.PHIEU_KIEM_DEFECT defect
            WHERE defect.CheckItemId = item.CheckItemId
        ) defectTotals
        WHERE ISNULL(item.KetQua, N'') <> N'NA'
          AND (
              defectTotals.TotalCritical > thresholds.Ac_Critical
              OR defectTotals.TotalMajor > thresholds.Ac_Major
              OR defectTotals.TotalMinor > thresholds.Ac_Minor
          )
    )
        SET @HasRejectedItem = 1;

    UPDATE dbo.PHIEU_KIEM_SECTION
    SET TotalCritical = @TotalCritical,
        TotalMajor = @TotalMajor,
        TotalMinor = @TotalMinor,
        KetLuan = CASE WHEN @HasRejectedItem = 1 THEN 'REJECT' ELSE 'ACCEPT' END
    WHERE Id = @SectionId;
END;
GO
