const sql = require('mssql');
const { groupMaterialsByWarehouse } = require('../utils/doiTraReturnQuantity');

const ERP_VALIDATION_ERROR_MIN = 52310;
const ERP_VALIDATION_ERROR_MAX = 52329;

const requestFor = (executor) => new sql.Request(executor);

const getActiveSupplementIssues = async (executor, phieuId) => {
    const result = await requestFor(executor)
        .input('PhieuId', sql.Int, phieuId)
        .query(`
            SELECT linkRow.Id,linkRow.PhieuId,linkRow.SourceLenhXuatVTId,linkRow.SoLenhXuatVT,
                linkRow.SourceKhoXuatId,linkRow.TrangThai,linkRow.CreatedAt,
                warehouse.Ten_Kho AS TenKhoXuat,issue.TrangThai AS ErpTrangThai,issue.TonTai
            FROM dbo.DOI_TRA_PHOI_LOI_LENH_XUAT_VT linkRow
            LEFT JOIN TAG_QTKD.dbo.LenhXuatVT issue ON issue.ID_LenhXuatVT=linkRow.SourceLenhXuatVTId
            LEFT JOIN TAG_QTKD.dbo.DM_Kho warehouse ON warehouse.ID_Kho=linkRow.SourceKhoXuatId
            WHERE linkRow.PhieuId=@PhieuId AND linkRow.TrangThai=N'ACTIVE'
            ORDER BY linkRow.SourceKhoXuatId,linkRow.Id;
        `);
    return result.recordset || [];
};

const loadIssueMaterialContext = async (executor, phieuId, userId) => {
    const result = await requestFor(executor)
        .input('PhieuId', sql.Int, phieuId)
        .input('UserId', sql.Int, userId)
        .query(`
            IF NOT EXISTS(
                SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI
                WHERE Id=@PhieuId AND KcsCompletedAt IS NOT NULL
            ) THROW 52321,N'KCS phải hoàn tất kiểm trước khi B7 xác nhận và tạo lệnh xuất vật tư.',1;

            DECLARE @PlanCount INT=(
                SELECT COUNT(*) FROM dbo.DOI_TRA_PHOI_LOI_PLAN
                WHERE PhieuId=@PhieuId AND TRY_CONVERT(INT,PlanID) IS NOT NULL
            );
            IF @PlanCount<>1 THROW 52310,N'Không xác định được duy nhất kế hoạch sản xuất của phiếu.',1;

            DECLARE @PlanId INT=(SELECT TRY_CONVERT(INT,PlanID) FROM dbo.DOI_TRA_PHOI_LOI_PLAN WHERE PhieuId=@PhieuId);
            DECLARE @OrderId INT,@CustomerId SMALLINT,@DepartmentId SMALLINT;
            SELECT @OrderId=productionOrder.ID_DonHang,@CustomerId=customerOrder.ID_KhachHang,
                @DepartmentId=productionPlan.ID_BoPhan
            FROM TAG_QLSX.dbo.KeHoachSanXuat productionPlan
            JOIN TAG_QLSX.dbo.LenhSanXuat productionOrder
              ON productionOrder.ID_LenhSanXuat=productionPlan.ID_LenhSanXuat
             AND productionOrder.TonTai=1
            JOIN TAG_QTKD.dbo.DonHang customerOrder
              ON customerOrder.ID_DonHang=productionOrder.ID_DonHang
             AND customerOrder.TonTai=1
            WHERE productionPlan.ID_KeHoachSanXuat=@PlanId AND productionPlan.TonTai=1;
            IF @OrderId IS NULL OR @CustomerId IS NULL OR @DepartmentId IS NULL
                THROW 52311,N'Kế hoạch, đơn hàng hoặc bộ phận sản xuất không còn hiệu lực.',1;

            DECLARE @ErpAccountCount INT=(
                SELECT COUNT(*)
                FROM dbo.USERS localUser
                JOIN TAG_System.dbo.TaiKhoanDangNhap externalAccount
                  ON LOWER(LTRIM(RTRIM(externalAccount.TenDangNhap))) COLLATE DATABASE_DEFAULT
                   = LOWER(LTRIM(RTRIM(localUser.Username))) COLLATE DATABASE_DEFAULT
                WHERE localUser.Id=@UserId
            );
            IF @ErpAccountCount<>1
                THROW 52312,N'Tài khoản B7 chưa được ánh xạ duy nhất với tài khoản ERP.',1;
            DECLARE @ErpAccountId SMALLINT=(
                SELECT externalAccount.ID_TaiKhoanDangNhap
                FROM dbo.USERS localUser
                JOIN TAG_System.dbo.TaiKhoanDangNhap externalAccount
                  ON LOWER(LTRIM(RTRIM(externalAccount.TenDangNhap))) COLLATE DATABASE_DEFAULT
                   = LOWER(LTRIM(RTRIM(localUser.Username))) COLLATE DATABASE_DEFAULT
                WHERE localUser.Id=@UserId
            );

            CREATE TABLE #Material(
                SourceVatTuId INT NOT NULL PRIMARY KEY,MaVatTu NVARCHAR(100) NULL,
                SoLuongDoiTra DECIMAL(18,3) NULL,SourceDonHangVatTuId INT NULL,
                DinhMucVatTu DECIMAL(18,8) NULL,SourceKhoXuatId SMALLINT NULL,
                DonHangMatchCount INT NOT NULL,WarehouseMatchCount INT NOT NULL
            );
            INSERT #Material(SourceVatTuId,MaVatTu,SoLuongDoiTra,SourceDonHangVatTuId,DinhMucVatTu,
                SourceKhoXuatId,DonHangMatchCount,WarehouseMatchCount)
            SELECT materialGroup.SourceVatTuId,materialGroup.MaVatTu,quota.SoLuongDoiTra,
                orderMaterial.ID_DonHang_VatTu,orderMaterial.DinhMuc_VatTu,warehouseMap.ID_Kho,
                orderMaterialMatch.MatchCount,warehouseMatch.MatchCount
            FROM (
                SELECT SourceVatTuId,MAX(MaVatTu) AS MaVatTu
                FROM dbo.DOI_TRA_PHOI_LOI_PHOI WHERE PhieuId=@PhieuId GROUP BY SourceVatTuId
            ) materialGroup
            LEFT JOIN dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC quota
              ON quota.PhieuId=@PhieuId AND quota.SourceVatTuId=materialGroup.SourceVatTuId
            OUTER APPLY(
                SELECT COUNT(*) AS MatchCount,MIN(ID_DonHang_VatTu) AS MatchId
                FROM TAG_QTKD.dbo.DonHang_VatTu
                WHERE ID_DonHang=@OrderId AND ID_VatTu=materialGroup.SourceVatTuId AND TonTai=1
            ) orderMaterialMatch
            LEFT JOIN TAG_QTKD.dbo.DonHang_VatTu orderMaterial
              ON orderMaterial.ID_DonHang_VatTu=orderMaterialMatch.MatchId AND orderMaterialMatch.MatchCount=1
            OUTER APPLY(
                SELECT COUNT(*) AS MatchCount,MIN(materialWarehouse.ID_Kho) AS MatchId
                FROM TAG_QTKD.dbo.DM_VatTu_Kho materialWarehouse
                JOIN TAG_QTKD.dbo.DM_Kho warehouse
                  ON warehouse.ID_Kho=materialWarehouse.ID_Kho
                 AND warehouse.SuDung=1 AND warehouse.TonTai=1
                WHERE LTRIM(RTRIM(materialWarehouse.Ma_VatTu)) COLLATE DATABASE_DEFAULT
                    = LTRIM(RTRIM(materialGroup.MaVatTu)) COLLATE DATABASE_DEFAULT
            ) warehouseMatch
            LEFT JOIN TAG_QTKD.dbo.DM_VatTu_Kho warehouseMap
              ON LTRIM(RTRIM(warehouseMap.Ma_VatTu)) COLLATE DATABASE_DEFAULT
               = LTRIM(RTRIM(materialGroup.MaVatTu)) COLLATE DATABASE_DEFAULT
             AND warehouseMap.ID_Kho=warehouseMatch.MatchId AND warehouseMatch.MatchCount=1;

            IF NOT EXISTS(SELECT 1 FROM #Material)
                THROW 52313,N'Phiếu không có vật tư để tạo lệnh xuất.',1;
            IF EXISTS(SELECT 1 FROM #Material WHERE SoLuongDoiTra IS NULL OR SoLuongDoiTra<=0)
                THROW 52314,N'Vui lòng nhập số lượng đổi trả lớn hơn 0 cho tất cả vật tư.',1;
            IF EXISTS(
                SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC
                WHERE PhieuId=@PhieuId AND SoLuongDoiTra<>CONVERT(DECIMAL(18,3),SoLuongDoiTra)
            ) THROW 52320,N'Số lượng đổi trả chỉ được có tối đa 3 chữ số thập phân. Vui lòng lưu lại số lượng.',1;

            DECLARE @InvalidOrderMaterials NVARCHAR(1000)=(
                SELECT STUFF((SELECT N', '+ISNULL(MaVatTu,CONVERT(NVARCHAR(20),SourceVatTuId))
                    FROM #Material WHERE DonHangMatchCount<>1 ORDER BY MaVatTu
                    FOR XML PATH(''),TYPE).value('.','NVARCHAR(MAX)'),1,2,N'')
            );
            IF @InvalidOrderMaterials IS NOT NULL
            BEGIN
                DECLARE @InvalidOrderMessage NVARCHAR(2048)=N'Không tìm thấy duy nhất DonHang_VatTu cho: '+@InvalidOrderMaterials;
                THROW 52315,@InvalidOrderMessage,1;
            END;

            DECLARE @MissingQuotas NVARCHAR(1000)=(
                SELECT STUFF((SELECT N', '+ISNULL(MaVatTu,CONVERT(NVARCHAR(20),SourceVatTuId))
                    FROM #Material WHERE DinhMucVatTu IS NULL OR DinhMucVatTu<=0 ORDER BY MaVatTu
                    FOR XML PATH(''),TYPE).value('.','NVARCHAR(MAX)'),1,2,N'')
            );
            IF @MissingQuotas IS NOT NULL
            BEGIN
                DECLARE @MissingQuotaMessage NVARCHAR(2048)=N'DonHang_VatTu chưa có định mức hợp lệ cho: '+@MissingQuotas;
                THROW 52316,@MissingQuotaMessage,1;
            END;

            DECLARE @InvalidWarehouses NVARCHAR(1000)=(
                SELECT STUFF((SELECT N', '+ISNULL(MaVatTu,CONVERT(NVARCHAR(20),SourceVatTuId))
                    FROM #Material WHERE WarehouseMatchCount<>1 ORDER BY MaVatTu
                    FOR XML PATH(''),TYPE).value('.','NVARCHAR(MAX)'),1,2,N'')
            );
            IF @InvalidWarehouses IS NOT NULL
            BEGIN
                DECLARE @InvalidWarehouseMessage NVARCHAR(2048)=N'Không tìm thấy duy nhất kho xuất cho: '+@InvalidWarehouses;
                THROW 52317,@InvalidWarehouseMessage,1;
            END;

            SELECT @PlanId AS PlanId,@OrderId AS OrderId,@CustomerId AS CustomerId,
                @DepartmentId AS DepartmentId,@ErpAccountId AS ErpAccountId;
            SELECT SourceVatTuId,MaVatTu,SoLuongDoiTra,SourceDonHangVatTuId,DinhMucVatTu,SourceKhoXuatId
            FROM #Material ORDER BY SourceKhoXuatId,MaVatTu,SourceVatTuId;
        `);
    return {
        header: result.recordsets?.[0]?.[0],
        materials: result.recordsets?.[1] || []
    };
};

const allocateIssueNumber = async (executor) => {
    const result = await requestFor(executor).query(`
        DECLARE @LockResult INT;
        EXEC @LockResult=sys.sp_getapplock @Resource=N'TAG_QTKD_LENHXUATVT_NUMBER',
            @LockMode=N'Exclusive',@LockOwner=N'Transaction',@LockTimeout=10000;
        IF @LockResult<0 THROW 52318,N'Không thể cấp số lệnh xuất vật tư.',1;
        DECLARE @Prefix NVARCHAR(16)=N'LXVT-'+CONVERT(CHAR(7),GETDATE(),120)+N'-';
        DECLARE @NextNumber INT=(
            SELECT ISNULL(MAX(TRY_CONVERT(INT,SUBSTRING(So_LenhXuatVT,LEN(@Prefix)+1,20))),0)+1
            FROM TAG_QTKD.dbo.LenhXuatVT WITH(UPDLOCK,HOLDLOCK)
            WHERE So_LenhXuatVT LIKE @Prefix+N'%'
        );
        SELECT @Prefix+RIGHT(N'0000'+CONVERT(NVARCHAR(20),@NextNumber),
            CASE WHEN @NextNumber<10000 THEN 4 ELSE LEN(CONVERT(NVARCHAR(20),@NextNumber)) END) AS SoLenh;
    `);
    return result.recordset?.[0]?.SoLenh;
};

const createDoiTraSupplementIssues = async (executor, { phieuId, userId, soPhieu }) => {
    const existing = await getActiveSupplementIssues(executor, phieuId);
    if (existing.length) return existing;

    const { header, materials } = await loadIssueMaterialContext(executor, phieuId, userId);
    if (!header || !materials.length) {
        const error = new Error('Không đủ dữ liệu tạo lệnh xuất vật tư');
        error.number = ERP_VALIDATION_ERROR_MIN;
        throw error;
    }
    const groups = groupMaterialsByWarehouse(materials);

    for (const [warehouseId, rows] of groups.entries()) {
        const issueNumber = await allocateIssueNumber(executor);
        const inserted = await requestFor(executor)
            .input('IssueTypeId', sql.TinyInt, 2)
            .input('IssueNumber', sql.NVarChar(20), issueNumber)
            .input('CustomerId', sql.SmallInt, header.CustomerId)
            .input('WarehouseId', sql.SmallInt, warehouseId)
            .input('DepartmentId', sql.SmallInt, header.DepartmentId)
            .input('PlanId', sql.Int, header.PlanId)
            .input('ErpAccountId', sql.SmallInt, header.ErpAccountId)
            .input('Note', sql.NVarChar(255), `Tự động từ phiếu đổi trả ${soPhieu}`)
            .query(`
                IF EXISTS(SELECT 1 FROM TAG_QTKD.dbo.LenhXuatVT WHERE So_LenhXuatVT=@IssueNumber)
                    THROW 52319,N'Số lệnh xuất vật tư vừa được sử dụng. Vui lòng thử lại.',1;
                INSERT TAG_QTKD.dbo.LenhXuatVT(
                    ID_HinhThucXuatVT,So_LenhXuatVT,Ngay_LenhXuatVT,ID_KhachHang,ID_KhoXuat,
                    ID_KhoNhap,ID_DonVi,ID_BoPhan,ID_KeHoachSanXuat,ID_BoDinhMuc_SanXuat,
                    ID_DoiTuongVT,ID_NhaCungCap,ID_LenhCapTuDong,LuongQT,NoiDen,NguoiNhanHang,
                    LyDoXuat,GhiChu,TaiKhoan_Lap,Ngay_Lap,TaiKhoan_SuaCuoi,Ngay_SuaCuoi,
                    TaiKhoan_PheDuyet,Ngay_PheDuyet,TrangThai,TonTai
                ) VALUES(
                    @IssueTypeId,@IssueNumber,GETDATE(),@CustomerId,@WarehouseId,
                    NULL,NULL,@DepartmentId,@PlanId,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,@Note,
                    @ErpAccountId,GETDATE(),@ErpAccountId,GETDATE(),NULL,NULL,0,1
                );
                SELECT CONVERT(INT,SCOPE_IDENTITY()) AS IssueId;
            `);
        const issueId = Number(inserted.recordset?.[0]?.IssueId);
        if (!issueId) throw new Error('Không nhận được mã lệnh xuất vật tư');

        for (const row of rows) {
            await requestFor(executor)
                .input('IssueId', sql.Int, issueId)
                .input('OrderMaterialId', sql.Int, row.SourceDonHangVatTuId)
                .input('MaterialId', sql.Int, row.SourceVatTuId)
                .input('Quota', sql.Decimal(18, 8), row.DinhMucVatTu)
                .input('Quantity', sql.Decimal(18, 3), row.SoLuongDoiTra)
                .input('PhieuId', sql.Int, phieuId)
                .input('UserId', sql.Int, userId)
                .query(`
                    INSERT TAG_QTKD.dbo.LenhXuatVT_VatTu(
                        ID_LenhXuatVT,ID_DonHang_VatTu,ID_VatTu,DinhMuc_VatTu,SoLuong_VatTu
                    ) VALUES(@IssueId,@OrderMaterialId,@MaterialId,@Quota,@Quantity);
                    UPDATE dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC
                    SET SourceDonHangVatTuId=@OrderMaterialId,DinhMuc=@Quota,
                        SourceLenhXuatVTId=@IssueId,UpdatedBy=@UserId,UpdatedAt=SYSDATETIME()
                    WHERE PhieuId=@PhieuId AND SourceVatTuId=@MaterialId;
                `);
        }

        await requestFor(executor)
            .input('PhieuId', sql.Int, phieuId)
            .input('IssueId', sql.Int, issueId)
            .input('IssueNumber', sql.NVarChar(20), issueNumber)
            .input('WarehouseId', sql.SmallInt, warehouseId)
            .input('UserId', sql.Int, userId)
            .query(`
                INSERT dbo.DOI_TRA_PHOI_LOI_LENH_XUAT_VT(
                    PhieuId,SourceLenhXuatVTId,SoLenhXuatVT,SourceKhoXuatId,TrangThai,CreatedBy
                ) VALUES(@PhieuId,@IssueId,@IssueNumber,@WarehouseId,N'ACTIVE',@UserId);
            `);
    }
    return getActiveSupplementIssues(executor, phieuId);
};

const cancelDraftSupplementIssuesForKcsReturn = async (executor, { phieuId, userId, reason }) => {
    const result = await requestFor(executor)
        .input('PhieuId', sql.Int, phieuId)
        .input('UserId', sql.Int, userId)
        .input('Reason', sql.NVarChar(1000), reason || 'Phiếu đổi trả được trả lại KCS')
        .query(`
            SELECT linkRow.Id,linkRow.SourceLenhXuatVTId,issue.TrangThai,issue.TonTai,
                CAST(CASE WHEN EXISTS(
                    SELECT 1 FROM TAG_QTKD.dbo.PhieuXuatVT issueVoucher
                    WHERE issueVoucher.ID_LenhXuatVT=linkRow.SourceLenhXuatVTId AND issueVoucher.TonTai=1
                ) THEN 1 ELSE 0 END AS bit) AS HasIssueVoucher
            INTO #ActiveIssues
            FROM dbo.DOI_TRA_PHOI_LOI_LENH_XUAT_VT linkRow WITH(UPDLOCK,HOLDLOCK)
            JOIN TAG_QTKD.dbo.LenhXuatVT issue ON issue.ID_LenhXuatVT=linkRow.SourceLenhXuatVTId
            WHERE linkRow.PhieuId=@PhieuId AND linkRow.TrangThai=N'ACTIVE';

            UPDATE issue SET TonTai=0,
                GhiChu=LEFT(CONCAT(NULLIF(issue.GhiChu,N''),N' | Hủy do phiếu đổi trả trả lại KCS'),255),
                Ngay_SuaCuoi=GETDATE()
            FROM TAG_QTKD.dbo.LenhXuatVT issue
            JOIN #ActiveIssues activeIssue ON activeIssue.SourceLenhXuatVTId=issue.ID_LenhXuatVT
            WHERE issue.TrangThai=0 AND issue.TonTai=1 AND activeIssue.HasIssueVoucher=0;

            UPDATE linkRow SET TrangThai=N'CANCELLED',CancelledBy=@UserId,CancelledAt=SYSDATETIME(),CancelReason=@Reason
            FROM dbo.DOI_TRA_PHOI_LOI_LENH_XUAT_VT linkRow
            JOIN #ActiveIssues activeIssue ON activeIssue.Id=linkRow.Id
            WHERE activeIssue.TrangThai=0 AND activeIssue.TonTai=1 AND activeIssue.HasIssueVoucher=0;

            UPDATE quota SET SourceLenhXuatVTId=NULL,UpdatedAt=SYSDATETIME()
            FROM dbo.DOI_TRA_PHOI_LOI_VAT_TU_DINH_MUC quota
            JOIN #ActiveIssues activeIssue ON activeIssue.SourceLenhXuatVTId=quota.SourceLenhXuatVTId
            WHERE activeIssue.TrangThai=0 AND activeIssue.TonTai=1 AND activeIssue.HasIssueVoucher=0;

            IF NOT EXISTS(
                SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_LENH_XUAT_VT
                WHERE PhieuId=@PhieuId AND TrangThai=N'ACTIVE'
            ) AND EXISTS(SELECT 1 FROM #ActiveIssues)
                UPDATE dbo.DOI_TRA_PHOI_LOI SET DinhMucTrangThai=N'CAN_XAC_NHAN_LAI',
                    DinhMucCurrentStepId=COALESCE(DinhMucCurrentStepId,(
                        SELECT TOP(1) stepRow.Id
                        FROM dbo.DOI_TRA_PHOI_LOI_WORKFLOW_STEP stepRow
                        WHERE stepRow.WorkflowId=DOI_TRA_PHOI_LOI.WorkflowId AND stepRow.StepCode=N'B7_DINH_MUC'
                    )),B7ConfirmedBy=NULL,B7ConfirmedAt=NULL,UpdatedAt=SYSDATETIME()
                WHERE Id=@PhieuId;

            SELECT COUNT(*) AS LockedCount FROM #ActiveIssues
            WHERE TrangThai<>0 OR TonTai<>1 OR HasIssueVoucher=1;
        `);
    return { lockedCount: Number(result.recordset?.[0]?.LockedCount || 0) };
};

module.exports = {
    ERP_VALIDATION_ERROR_MIN,
    ERP_VALIDATION_ERROR_MAX,
    getActiveSupplementIssues,
    createDoiTraSupplementIssues,
    cancelDraftSupplementIssuesForKcsReturn
};
