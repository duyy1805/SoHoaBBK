SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_NHOM',N'U') IS NULL
    THROW 52801,N'Chưa chạy migration nhóm nhiều kế hoạch.',1;

IF COL_LENGTH(N'dbo.DOI_TRA_PHOI_LOI_NHOM',N'KphPhieuId') IS NULL
    EXEC(N'ALTER TABLE dbo.DOI_TRA_PHOI_LOI_NHOM ADD KphPhieuId INT NULL;');

EXEC sys.sp_executesql N'
    ;WITH candidate AS(
        SELECT p.NhomPhieuId,p.Id,
            ROW_NUMBER() OVER(PARTITION BY p.NhomPhieuId ORDER BY
                (SELECT COUNT(*) FROM dbo.DOI_TRA_PHOI_LOI_KPH_Y_KIEN y WHERE y.PhieuId=p.Id) DESC,
                CASE p.TrangThai
                    WHEN N''CHO_THEO_DOI'' THEN 7 WHEN N''CHO_BGD_XAC_NHAN'' THEN 6
                    WHEN N''CHO_XAC_NHAN_CUOI_KPH'' THEN 5 WHEN N''CHO_Y_KIEN_KPH'' THEN 4
                    WHEN N''CHO_THIET_LAP_KPH'' THEN 3 ELSE 0 END DESC,
                p.ThuTuKeHoach,p.Id) rn
        FROM dbo.DOI_TRA_PHOI_LOI p
    )
    UPDATE nhom SET KphPhieuId=candidate.Id
    FROM dbo.DOI_TRA_PHOI_LOI_NHOM nhom
    JOIN candidate ON candidate.NhomPhieuId=nhom.Id AND candidate.rn=1
    WHERE nhom.KphPhieuId IS NULL;

    IF EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_NHOM WHERE KphPhieuId IS NULL)
        THROW 52802,N''Không xác định được phiếu chủ KPH cho một số nhóm.'',1;
';

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_DTPL_NHOM_KphPhieu')
    EXEC(N'ALTER TABLE dbo.DOI_TRA_PHOI_LOI_NHOM WITH CHECK ADD CONSTRAINT FK_DTPL_NHOM_KphPhieu
        FOREIGN KEY(KphPhieuId) REFERENCES dbo.DOI_TRA_PHOI_LOI(Id);');

IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.DOI_TRA_PHOI_LOI_NHOM') AND name=N'IX_DTPL_NHOM_KphPhieu')
    EXEC(N'CREATE INDEX IX_DTPL_NHOM_KphPhieu ON dbo.DOI_TRA_PHOI_LOI_NHOM(KphPhieuId);');

EXEC sys.sp_executesql N'
    UPDATE sibling SET TrangThai=ownerRow.TrangThai,CurrentStepId=ownerRow.CurrentStepId,
        RequiresExecutiveApproval=ownerRow.RequiresExecutiveApproval,UpdatedAt=SYSDATETIME()
    FROM dbo.DOI_TRA_PHOI_LOI sibling
    JOIN dbo.DOI_TRA_PHOI_LOI_NHOM groupRow ON groupRow.Id=sibling.NhomPhieuId
    JOIN dbo.DOI_TRA_PHOI_LOI ownerRow ON ownerRow.Id=groupRow.KphPhieuId
    WHERE sibling.Id<>ownerRow.Id AND sibling.TrangThai<>N''DA_HUY'' AND sibling.KcsCompletedAt IS NOT NULL
      AND ownerRow.TrangThai IN(N''CHO_THIET_LAP_KPH'',N''CHO_Y_KIEN_KPH'',N''CHO_XAC_NHAN_CUOI_KPH'',N''CHO_BGD_XAC_NHAN'',N''CHO_THEO_DOI'');
';

COMMIT TRANSACTION;
