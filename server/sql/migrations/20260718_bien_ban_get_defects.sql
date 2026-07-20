CREATE OR ALTER PROCEDURE dbo.sp_BienBan_GetDefects
    @BienBanId INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @PhieuKiemId INT,
            @MaLoai NVARCHAR(100);

    SELECT
        @PhieuKiemId = bb.PhieuKiemId,
        @MaLoai = UPPER(LTRIM(RTRIM(lk.MaLoai)))
    FROM dbo.BIEN_BAN_KIEM bb
    LEFT JOIN dbo.PHIEU_KIEM pk ON pk.Id = bb.PhieuKiemId
    LEFT JOIN dbo.DM_LOAI_KIEM lk ON lk.Id = pk.LoaiKiemId
    WHERE bb.Id = @BienBanId;

    IF @PhieuKiemId IS NULL
    BEGIN
        SELECT
            CAST(NULL AS INT) AS DefectId,
            CAST(NULL AS NVARCHAR(100)) AS MaLoi,
            CAST(NULL AS NVARCHAR(255)) AS TenLoi,
            CAST(NULL AS NVARCHAR(50)) AS DefectType,
            CAST(NULL AS NVARCHAR(MAX)) AS MoTa,
            CAST(NULL AS INT) AS SoLuong,
            CAST(NULL AS INT) AS SoLuongKiem,
            CAST(NULL AS NVARCHAR(MAX)) AS GhiChu,
            CAST(NULL AS NVARCHAR(MAX)) AS ImageUrls
        WHERE 1 = 0;
        RETURN;
    END;

    IF @MaLoai = N'KIEM_TREN_CHUYEN'
    BEGIN
        SELECT
            source.DefectId,
            dm.MaLoi,
            dm.TenLoi,
            dm.DefectType,
            dm.MoTa,
            SUM(source.SoLuong) AS SoLuong,
            CAST(NULL AS INT) AS SoLuongKiem,
            notes.GhiChu,
            COALESCE(images.ImageUrls, N'[]') AS ImageUrls
        FROM dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT slot
        JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY entryRow ON entryRow.SlotId = slot.Id
        JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT source ON source.EntryId = entryRow.Id
        LEFT JOIN dbo.DM_DEFECT dm ON dm.Id = source.DefectId
        OUTER APPLY (
            SELECT N'[' + STUFF((
                SELECT DISTINCT N',"' + STRING_ESCAPE(CONVERT(NVARCHAR(MAX), imageNode.[value]), 'json') + N'"'
                FROM dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT imageSlot
                JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY imageEntry ON imageEntry.SlotId = imageSlot.Id
                JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT imageDefect ON imageDefect.EntryId = imageEntry.Id
                CROSS APPLY OPENJSON(COALESCE(imageDefect.ImageUrls, N'[]')) imageNode
                WHERE imageSlot.PhieuKiemId = @PhieuKiemId
                  AND imageDefect.DefectId = source.DefectId
                  AND NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), imageNode.[value]))), N'') IS NOT NULL
                FOR XML PATH(''), TYPE
            ).value('.', 'NVARCHAR(MAX)'), 1, 1, N'') + N']' AS ImageUrls
        ) images
        OUTER APPLY (
            SELECT STUFF((
                SELECT DISTINCT N'; ' + LTRIM(RTRIM(noteDefect.GhiChu))
                FROM dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT noteSlot
                JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY noteEntry ON noteEntry.SlotId = noteSlot.Id
                JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT noteDefect ON noteDefect.EntryId = noteEntry.Id
                WHERE noteSlot.PhieuKiemId = @PhieuKiemId
                  AND noteDefect.DefectId = source.DefectId
                  AND NULLIF(LTRIM(RTRIM(noteDefect.GhiChu)), N'') IS NOT NULL
                FOR XML PATH(''), TYPE
            ).value('.', 'NVARCHAR(MAX)'), 1, 2, N'') AS GhiChu
        ) notes
        WHERE slot.PhieuKiemId = @PhieuKiemId
        GROUP BY source.DefectId, dm.MaLoi, dm.TenLoi, dm.DefectType, dm.MoTa, images.ImageUrls, notes.GhiChu
        ORDER BY dm.MaLoi, dm.TenLoi;
        RETURN;
    END;

    IF @MaLoai = N'CUOI_CHUYEN'
    BEGIN
        SELECT
            source.DefectId,
            dm.MaLoi,
            dm.TenLoi,
            dm.DefectType,
            dm.MoTa,
            SUM(source.SoLuong) AS SoLuong,
            CAST(NULL AS INT) AS SoLuongKiem,
            notes.GhiChu,
            COALESCE(images.ImageUrls, N'[]') AS ImageUrls
        FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN planRow
        JOIN dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT source ON source.PlanId = planRow.Id
        LEFT JOIN dbo.DM_DEFECT dm ON dm.Id = source.DefectId
        OUTER APPLY (
            SELECT N'[' + STUFF((
                SELECT DISTINCT N',"' + STRING_ESCAPE(CONVERT(NVARCHAR(MAX), imageNode.[value]), 'json') + N'"'
                FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN imagePlan
                JOIN dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT imageDefect ON imageDefect.PlanId = imagePlan.Id
                CROSS APPLY OPENJSON(COALESCE(imageDefect.ImageUrls, N'[]')) imageNode
                WHERE imagePlan.PhieuKiemId = @PhieuKiemId
                  AND imageDefect.DefectId = source.DefectId
                  AND NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), imageNode.[value]))), N'') IS NOT NULL
                FOR XML PATH(''), TYPE
            ).value('.', 'NVARCHAR(MAX)'), 1, 1, N'') + N']' AS ImageUrls
        ) images
        OUTER APPLY (
            SELECT STUFF((
                SELECT DISTINCT N'; ' + LTRIM(RTRIM(noteDefect.GhiChu))
                FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN notePlan
                JOIN dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT noteDefect ON noteDefect.PlanId = notePlan.Id
                WHERE notePlan.PhieuKiemId = @PhieuKiemId
                  AND noteDefect.DefectId = source.DefectId
                  AND NULLIF(LTRIM(RTRIM(noteDefect.GhiChu)), N'') IS NOT NULL
                FOR XML PATH(''), TYPE
            ).value('.', 'NVARCHAR(MAX)'), 1, 2, N'') AS GhiChu
        ) notes
        WHERE planRow.PhieuKiemId = @PhieuKiemId
        GROUP BY source.DefectId, dm.MaLoi, dm.TenLoi, dm.DefectType, dm.MoTa, images.ImageUrls, notes.GhiChu
        ORDER BY dm.MaLoi, dm.TenLoi;
        RETURN;
    END;

    SELECT
        source.DefectId,
        dm.MaLoi,
        dm.TenLoi,
        dm.DefectType,
        dm.MoTa,
        source.SoLuong,
        sectionRow.SoLuongKiem,
        CAST(NULL AS NVARCHAR(MAX)) AS GhiChu,
        COALESCE(source.ImageUrls, N'[]') AS ImageUrls
    FROM dbo.PHIEU_KIEM_SECTION sectionRow
    JOIN dbo.PHIEU_KIEM_DEFECT source ON source.SectionId = sectionRow.Id
    LEFT JOIN dbo.DM_DEFECT dm ON dm.Id = source.DefectId
    WHERE sectionRow.PhieuKiemId = @PhieuKiemId
    ORDER BY source.Id;
END;
GO
