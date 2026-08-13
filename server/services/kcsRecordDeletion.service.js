const sql = require("mssql");
const fs = require("fs");
const path = require("path");

const attachmentDir = path.join(__dirname,"..","private-uploads","bien-ban");
const uploadDir = path.join(__dirname,"..","uploads");

const removeBienBanFiles = async (files = []) => {
    const targets=[];
    for (const file of files) {
        if (file.StoredName && path.basename(file.StoredName) === file.StoredName) {
            targets.push(path.join(attachmentDir,file.StoredName));
        }
        const urls=[];
        if (file.RelativeUrl) urls.push(file.RelativeUrl);
        if (file.ImageUrls) {
            try {
                const parsed=JSON.parse(file.ImageUrls);
                if (Array.isArray(parsed)) urls.push(...parsed);
            } catch {/* dữ liệu ảnh cũ không đúng JSON thì không xóa file vật lý */}
        }
        for (const url of urls) {
            const match=String(url||"").match(/^\/uploads\/([^/]+)$/);
            if(match)targets.push(path.join(uploadDir,path.basename(match[1])));
        }
    }
    await Promise.all([...new Set(targets)].map(async (target) => {
        try {
            await fs.promises.unlink(target);
        } catch (error) {
            if (error.code !== "ENOENT") console.error("Delete KCS attachment file error:",error);
        }
    }));
};

const getBienBanFiles = async (executor, bienBanIds) => {
    const ids = [...new Set((bienBanIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    if (!ids.length) return [];
    const result = await new sql.Request(executor)
        .input("BienBanIds", sql.NVarChar(sql.MAX), ids.join(","))
        .query(`
            SELECT attachment.BienBanId,attachment.StoredName,CAST(NULL AS nvarchar(max)) AS RelativeUrl
            FROM dbo.BIEN_BAN_DINH_KEM attachment
            WHERE attachment.BienBanId IN (
                SELECT TRY_CONVERT(int,[value]) FROM STRING_SPLIT(@BienBanIds,',')
            )
            UNION ALL
            SELECT image.BienBanId,NULL,image.Url
            FROM dbo.BIEN_BAN_ANH image
            WHERE image.BienBanId IN (
                SELECT TRY_CONVERT(int,[value]) FROM STRING_SPLIT(@BienBanIds,',')
            );
        `);
    return result.recordset || [];
};

const getPhieuKiemFiles = async (executor,phieuKiemId) => {
    const result=await new sql.Request(executor).input("PhieuKiemId",sql.Int,Number(phieuKiemId)).query(`
        SELECT defect.ImageUrls
        FROM dbo.PHIEU_KIEM_DEFECT defect
        LEFT JOIN dbo.PHIEU_KIEM_SECTION sectionRow ON sectionRow.Id=defect.SectionId
        LEFT JOIN dbo.PHIEU_KIEM_BTP_ITEM btpItem ON btpItem.Id=defect.BtpItemId
        WHERE sectionRow.PhieuKiemId=@PhieuKiemId OR btpItem.PhieuKiemId=@PhieuKiemId
        UNION ALL
        SELECT defect.ImageUrls FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT defect
        JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY entryRow ON entryRow.Id=defect.EntryId
        JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT slotRow ON slotRow.Id=entryRow.SlotId
        WHERE slotRow.PhieuKiemId=@PhieuKiemId
        UNION ALL
        SELECT defect.ImageUrls FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT defect
        JOIN dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN planRow ON planRow.Id=defect.PlanId
        WHERE planRow.PhieuKiemId=@PhieuKiemId
        UNION ALL
        SELECT defect.ImageUrls FROM dbo.PHIEU_KIEM_CONG_DOAN_DEFECT defect
        LEFT JOIN dbo.PHIEU_KIEM_CONG_DOAN_PLAN_LOT lotRow ON lotRow.Id=defect.PlanLotId
        JOIN dbo.PHIEU_KIEM_CONG_DOAN_PLAN planRow ON planRow.Id=COALESCE(defect.PlanId,lotRow.PlanId)
        WHERE planRow.PhieuKiemId=@PhieuKiemId;
    `);
    return result.recordset||[];
};

const deleteBienBanData = async (transaction, bienBanIds, deletedBy) => {
    const ids = [...new Set((bienBanIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    if (!ids.length) return 0;
    const result = await new sql.Request(transaction)
        .input("BienBanIds", sql.NVarChar(sql.MAX), ids.join(","))
        .input("DeletedBy", sql.Int, Number(deletedBy))
        .query(`
            SELECT bb.Id,bb.SoBienBan,bb.TrangThai,bb.LoaiBienBan,bb.PhieuKiemId,bb.NguoiLapId,bb.CreatedAt
            INTO #TargetBienBan
            FROM dbo.BIEN_BAN_KIEM bb WITH (UPDLOCK,HOLDLOCK)
            WHERE bb.Id IN (SELECT TRY_CONVERT(int,[value]) FROM STRING_SPLIT(@BienBanIds,','));

            SELECT Id INTO #TargetOpinion
            FROM dbo.XIN_Y_KIEN WHERE BienBanId IN (SELECT Id FROM #TargetBienBan);

            INSERT dbo.KCS_RECORD_DELETE_AUDIT(EntityType,EntityId,RecordNumber,DeletedBy,SnapshotJson)
            SELECT CASE WHEN LoaiBienBan=N'STANDALONE' THEN N'PHIEU_XU_LY_KPH' ELSE N'BIEN_BAN' END,
                Id,SoBienBan,@DeletedBy,
                (SELECT target.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)
            FROM #TargetBienBan target;

            DELETE FROM dbo.BIEN_BAN_KPH_REVIEW_HISTORY
            WHERE BienBanId IN (SELECT Id FROM #TargetBienBan)
               OR XinYKienId IN (SELECT Id FROM #TargetOpinion);
            DELETE FROM dbo.TRA_LOI_Y_KIEN WHERE XinYKienId IN (SELECT Id FROM #TargetOpinion);
            DELETE FROM dbo.XIN_Y_KIEN WHERE Id IN (SELECT Id FROM #TargetOpinion);
            DELETE FROM dbo.BIEN_BAN_THEO_DOI_DANH_GIA WHERE BienBanId IN (SELECT Id FROM #TargetBienBan);
            DELETE FROM dbo.BIEN_BAN_SXBT_CONFIRM_STEP WHERE BienBanId IN (SELECT Id FROM #TargetBienBan);
            DELETE FROM dbo.BIEN_BAN_SXBT_XULY_ROW WHERE BienBanId IN (SELECT Id FROM #TargetBienBan);
            DELETE FROM dbo.BIEN_BAN_XAC_NHAN WHERE BienBanId IN (SELECT Id FROM #TargetBienBan);
            DELETE FROM dbo.BIEN_BAN_HANH_DONG WHERE BienBanId IN (SELECT Id FROM #TargetBienBan);
            DELETE FROM dbo.BIEN_BAN_CHI_PHI WHERE BienBanId IN (SELECT Id FROM #TargetBienBan);
            DELETE FROM dbo.BIEN_BAN_XU_LY WHERE BienBanId IN (SELECT Id FROM #TargetBienBan);
            DELETE FROM dbo.BIEN_BAN_ASSIGN WHERE BienBanId IN (SELECT Id FROM #TargetBienBan);
            DELETE FROM dbo.BIEN_BAN_DEFECT WHERE BienBanId IN (SELECT Id FROM #TargetBienBan);
            DELETE FROM dbo.BIEN_BAN_ANH WHERE BienBanId IN (SELECT Id FROM #TargetBienBan);
            DELETE FROM dbo.BienBan_CustomFields WHERE BienBanId IN (SELECT Id FROM #TargetBienBan);
            DELETE FROM dbo.BIEN_BAN_DINH_KEM WHERE BienBanId IN (SELECT Id FROM #TargetBienBan);

            DECLARE @DeletedCount int=(SELECT COUNT(*) FROM #TargetBienBan);
            DELETE FROM dbo.BIEN_BAN_KIEM WHERE Id IN (SELECT Id FROM #TargetBienBan);
            SELECT @DeletedCount AS DeletedCount;
        `);
    return Number(result.recordset?.[0]?.DeletedCount) || 0;
};

const deletePhieuKiemData = async (transaction, phieuKiemId, deletedBy) => {
    const result = await new sql.Request(transaction)
        .input("PhieuKiemId", sql.Int, Number(phieuKiemId))
        .input("DeletedBy", sql.Int, Number(deletedBy))
        .query(`
            SELECT TOP (1) pk.Id,pk.SoPhieu,pk.TrangThai,pk.NguoiLapId,pk.CreatedAt
            INTO #TargetPhieu
            FROM dbo.PHIEU_KIEM pk WITH (UPDLOCK,HOLDLOCK)
            WHERE pk.Id=@PhieuKiemId;

            IF NOT EXISTS(SELECT 1 FROM #TargetPhieu)
                THROW 51040,N'Không tìm thấy phiếu kiểm',1;

            INSERT dbo.KCS_RECORD_DELETE_AUDIT(EntityType,EntityId,RecordNumber,DeletedBy,SnapshotJson)
            SELECT N'PHIEU_KIEM',Id,SoPhieu,@DeletedBy,
                (SELECT target.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)
            FROM #TargetPhieu target;

            SELECT Id INTO #TargetSection FROM dbo.PHIEU_KIEM_SECTION WHERE PhieuKiemId=@PhieuKiemId;
            SELECT Id INTO #TargetCheckItem FROM dbo.PHIEU_KIEM_CHECK_ITEM WHERE SectionId IN (SELECT Id FROM #TargetSection);
            SELECT Id INTO #TargetBtpItem FROM dbo.PHIEU_KIEM_BTP_ITEM WHERE PhieuKiemId=@PhieuKiemId;
            SELECT Id INTO #TargetSlot FROM dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT WHERE PhieuKiemId=@PhieuKiemId;
            SELECT Id INTO #TargetEntry FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY WHERE SlotId IN (SELECT Id FROM #TargetSlot);
            SELECT Id INTO #TargetCuoiChuyenPlan FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN WHERE PhieuKiemId=@PhieuKiemId;
            SELECT Id INTO #TargetCongDoanPlan FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN WHERE PhieuKiemId=@PhieuKiemId;
            SELECT Id INTO #TargetCongDoanLot FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN_LOT WHERE PlanId IN (SELECT Id FROM #TargetCongDoanPlan);
            SELECT Id INTO #TargetSplit FROM dbo.PHIEU_KIEM_SXBT_SPLIT
            WHERE OriginalPhieuKiemId=@PhieuKiemId OR RejectedPhieuKiemId=@PhieuKiemId;

            DELETE FROM dbo.PHIEU_KIEM_DEFECT
            WHERE SectionId IN (SELECT Id FROM #TargetSection)
               OR CheckItemId IN (SELECT Id FROM #TargetCheckItem)
               OR BtpItemId IN (SELECT Id FROM #TargetBtpItem);
            DELETE FROM dbo.PHIEU_KIEM_CHECK_ITEM WHERE Id IN (SELECT Id FROM #TargetCheckItem);
            DELETE FROM dbo.PHIEU_KIEM_SECTION WHERE Id IN (SELECT Id FROM #TargetSection);
            DELETE FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT WHERE EntryId IN (SELECT Id FROM #TargetEntry);
            DELETE FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY WHERE Id IN (SELECT Id FROM #TargetEntry);
            DELETE FROM dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT WHERE Id IN (SELECT Id FROM #TargetSlot);
            DELETE FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT WHERE PlanId IN (SELECT Id FROM #TargetCuoiChuyenPlan);
            DELETE FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN WHERE Id IN (SELECT Id FROM #TargetCuoiChuyenPlan);
            DELETE FROM dbo.PHIEU_KIEM_CONG_DOAN_DEFECT
            WHERE PlanId IN (SELECT Id FROM #TargetCongDoanPlan) OR PlanLotId IN (SELECT Id FROM #TargetCongDoanLot);
            DELETE FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN_LOT WHERE Id IN (SELECT Id FROM #TargetCongDoanLot);
            DELETE FROM dbo.PHIEU_KIEM_CONG_DOAN_PLAN WHERE Id IN (SELECT Id FROM #TargetCongDoanPlan);
            DELETE FROM dbo.PHIEU_KIEM_CONG_DOAN_HEADER WHERE PhieuKiemId=@PhieuKiemId;
            DELETE FROM dbo.PHIEU_KIEM_BTP_ITEM_LOT WHERE BtpItemId IN (SELECT Id FROM #TargetBtpItem);
            DELETE FROM dbo.PHIEU_KIEM_BTP_ITEM WHERE Id IN (SELECT Id FROM #TargetBtpItem);
            DELETE FROM dbo.PHIEU_KIEM_SXBT_SPLIT_ROW WHERE SplitId IN (SELECT Id FROM #TargetSplit);
            DELETE FROM dbo.PHIEU_KIEM_SXBT_SPLIT WHERE Id IN (SELECT Id FROM #TargetSplit);
            DELETE FROM dbo.PHIEU_KIEM_SXBT_PLAN WHERE PhieuKiemId=@PhieuKiemId;
            DELETE FROM dbo.PHIEU_KIEM_SXBT_SUMMARY WHERE PhieuKiemId=@PhieuKiemId;
            DELETE FROM dbo.PHIEU_KIEM_THONG_SO_KQ WHERE PhieuKiemId=@PhieuKiemId;
            DELETE FROM dbo.PHIEU_KIEM_XAC_NHAN WHERE PhieuKiemId=@PhieuKiemId;
            DELETE FROM dbo.PhieuKiem_CustomFields WHERE PhieuKiemId=@PhieuKiemId;
            DELETE FROM dbo.NOTIFICATIONS WHERE Type=N'NEW_PHIEU' AND ReferenceId=@PhieuKiemId;
            DELETE FROM dbo.PHIEU_KIEM WHERE Id=@PhieuKiemId;
        `);
    return result;
};

module.exports = { getBienBanFiles, getPhieuKiemFiles, deleteBienBanData, deletePhieuKiemData, removeBienBanFiles };
