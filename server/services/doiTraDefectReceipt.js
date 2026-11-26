const sql = require('mssql');

const RECEIPT_VALIDATION_ERROR_MIN = 52410;
const RECEIPT_VALIDATION_ERROR_MAX = 52439;
const requestFor = (executor) => new sql.Request(executor);

const getActiveDefectReceipt = async (executor, phieuId) => {
    const result = await requestFor(executor)
        .input('PhieuId', sql.Int, phieuId)
        .query(`
            SELECT linkRow.Id,linkRow.PhieuId,linkRow.SourcePhieuNhapBtpId,
                linkRow.SoPhieuNhapBtp,linkRow.SoLuongBtpLoi,linkRow.SourceKhoNhapId,
                linkRow.SourceQuyTrinhSanXuatId,linkRow.TrangThai,linkRow.CreatedAt,
                receipt.TrangThai AS ErpTrangThai,receipt.TonTai,
                warehouse.Ten_Kho AS TenKhoNhap,processRow.Ten_QuyTrinhSanXuat AS TenQuyTrinhSanXuat,
                orderProduct.ItemCode AS MaBtp,orderProduct.Ten_SanPham AS TenBtp,
                productionLot.So_LoSanXuat AS SoLoSanXuat
            FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP linkRow
            LEFT JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt
              ON receipt.ID_PhieuNhapBTP=linkRow.SourcePhieuNhapBtpId
            LEFT JOIN TAG_QTKD.dbo.PhieuNhapBTP_ChiTiet detailRow
              ON detailRow.ID_PhieuNhapBTP=receipt.ID_PhieuNhapBTP
            LEFT JOIN TAG_QTKD.dbo.DonHang_SanPham orderProduct
              ON orderProduct.ID_DonHang_SanPham=detailRow.ID_DonHang_SanPham
            LEFT JOIN TAG_QTKD.dbo.DonHang_LoSanXuat productionLot
              ON productionLot.ID_DonHang_LoSanXuat=detailRow.ID_DonHang_LoSanXuat
            LEFT JOIN TAG_QTKD.dbo.DM_Kho warehouse ON warehouse.ID_Kho=linkRow.SourceKhoNhapId
            LEFT JOIN TAG_QTKD.dbo.DM_QuyTrinhSanXuat processRow
              ON processRow.ID_QuyTrinhSanXuat=linkRow.SourceQuyTrinhSanXuatId
            WHERE linkRow.PhieuId=@PhieuId AND linkRow.TrangThai=N'ACTIVE';
        `);
    return result.recordset?.[0] || null;
};

const getActiveDefectReceipts = async (executor, phieuId) => {
    const result = await requestFor(executor)
        .input('PhieuId', sql.Int, phieuId)
        .query(`SELECT linkRow.Id,linkRow.PhieuId,linkRow.SourcePhieuNhapBtpId,
            linkRow.SoPhieuNhapBtp,linkRow.SoLuongBtpLoi,linkRow.SourceKhoNhapId,
            linkRow.SourceQuyTrinhSanXuatId,linkRow.TrangThai,linkRow.CreatedAt,
            linkRow.WarehouseConfirmedBy,linkRow.WarehouseConfirmedAt,
            linkRow.StockCardRecordedBy,linkRow.StockCardRecordedAt,
            receipt.TrangThai AS ErpTrangThai,receipt.TonTai
        FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP linkRow
        JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt
          ON receipt.ID_PhieuNhapBTP=linkRow.SourcePhieuNhapBtpId
        WHERE linkRow.PhieuId=@PhieuId AND linkRow.TrangThai=N'ACTIVE'
        ORDER BY linkRow.Id;`);
    return result.recordset || [];
};

const loadReceiptContext = async (executor, phieuId, userId, quantity, warehouseId, selectedProcessId) => {
    const result = await requestFor(executor)
        .input('PhieuId', sql.Int, phieuId)
        .input('UserId', sql.Int, userId)
        .input('Quantity', sql.Decimal(18, 2), quantity)
        .input('WarehouseId', sql.SmallInt, warehouseId)
        .input('SelectedProcessId', sql.TinyInt, selectedProcessId)
        .query(`
            DECLARE @PlanCount INT=(SELECT COUNT(*) FROM dbo.DOI_TRA_PHOI_LOI_PLAN
                WHERE PhieuId=@PhieuId AND TRY_CONVERT(INT,PlanID) IS NOT NULL);
            IF @PlanCount<>1 THROW 52410,N'Không xác định được duy nhất kế hoạch sản xuất của phiếu.',1;

            DECLARE @PlanId INT=(SELECT TRY_CONVERT(INT,PlanID) FROM dbo.DOI_TRA_PHOI_LOI_PLAN WHERE PhieuId=@PhieuId);
            DECLARE @SnapshotOperation NVARCHAR(100)=(SELECT OperationCode FROM dbo.DOI_TRA_PHOI_LOI_PLAN WHERE PhieuId=@PhieuId);
            DECLARE @PlanQuantity DECIMAL(18,3)=(SELECT PlanQty FROM dbo.DOI_TRA_PHOI_LOI_PLAN WHERE PhieuId=@PhieuId);

            IF @Quantity<=0 OR @Quantity>@PlanQuantity
                THROW 52411,N'Số lượng BTP lỗi phải lớn hơn 0 và không vượt số lượng kế hoạch.',1;

            DECLARE @OrderId INT,@CustomerId SMALLINT,@UnitId SMALLINT,@DepartmentId SMALLINT,
                @ProcessId TINYINT,@CurrentOperation NVARCHAR(100);
            SELECT @OrderId=productionOrder.ID_DonHang,@CustomerId=customerOrder.ID_KhachHang,
                @UnitId=productionOrder.ID_DonVi,@DepartmentId=CASE WHEN productionOrder.ID_DonVi=32 THEN productionPlan.ID_BoPhan ELSE 0 END,
                @ProcessId=productionPlan.ID_QuyTrinhSanXuat,@CurrentOperation=processRow.KyHieu_QuyTrinhSanXuat
            FROM TAG_QLSX.dbo.KeHoachSanXuat productionPlan
            JOIN TAG_QLSX.dbo.LenhSanXuat productionOrder
              ON productionOrder.ID_LenhSanXuat=productionPlan.ID_LenhSanXuat AND productionOrder.TonTai=1
            JOIN TAG_QTKD.dbo.DonHang customerOrder
              ON customerOrder.ID_DonHang=productionOrder.ID_DonHang AND customerOrder.TonTai=1
            JOIN TAG_QTKD.dbo.DM_QuyTrinhSanXuat processRow
              ON processRow.ID_QuyTrinhSanXuat=productionPlan.ID_QuyTrinhSanXuat
            WHERE productionPlan.ID_KeHoachSanXuat=@PlanId AND productionPlan.TonTai=1;

            IF @OrderId IS NULL OR @CustomerId IS NULL OR @UnitId IS NULL OR @ProcessId IS NULL
                THROW 52412,N'Kế hoạch, đơn hàng hoặc quy trình sản xuất không còn hiệu lực.',1;
            IF UPPER(LTRIM(RTRIM(ISNULL(@SnapshotOperation,N''))))<>UPPER(LTRIM(RTRIM(ISNULL(@CurrentOperation,N''))))
                THROW 52413,N'Công đoạn của kế hoạch đã thay đổi. Vui lòng tạo lại phiếu từ kế hoạch hiện tại.',1;
            IF @WarehouseId IS NULL OR NOT EXISTS(
                SELECT 1 FROM TAG_QTKD.dbo.DM_Kho warehouse
                WHERE warehouse.ID_Kho=@WarehouseId AND warehouse.SuDung=1 AND warehouse.TonTai=1
            ) THROW 52414,N'Kho nhập BTP đã chọn không tồn tại hoặc không còn sử dụng.',1;
            IF @SelectedProcessId IS NULL OR NOT EXISTS(
                SELECT 1 FROM TAG_QTKD.dbo.DM_QuyTrinhSanXuat processRow
                WHERE processRow.ID_QuyTrinhSanXuat=@SelectedProcessId
            ) THROW 52424,N'Loại BTP đã chọn không tồn tại.',1;

            DECLARE @ProductCount INT=(
                SELECT COUNT(*)
                FROM TAG_QLSX.dbo.KeHoachSanXuat_SanPham planProduct
                JOIN TAG_QTKD.dbo.DonHang_SanPham orderProduct
                  ON orderProduct.ID_DonHang_SanPham=planProduct.ID_DonHang_SanPham
                 AND orderProduct.ID_DonHang=@OrderId AND orderProduct.TonTai=1
                JOIN TAG_QTKD.dbo.DonHang_LoSanXuat productionLot
                  ON productionLot.ID_DonHang_LoSanXuat=planProduct.ID_DonHang_LoSanXuat
                 AND productionLot.ID_DonHang=@OrderId AND productionLot.TonTai=1
                WHERE planProduct.ID_KeHoachSanXuat=@PlanId
            );
            IF @ProductCount<>1 THROW 52415,N'Không xác định được duy nhất BTP và lô sản xuất của kế hoạch.',1;

            DECLARE @OrderProductId INT,@ProductionLotId INT;
            SELECT @OrderProductId=planProduct.ID_DonHang_SanPham,
                @ProductionLotId=planProduct.ID_DonHang_LoSanXuat
            FROM TAG_QLSX.dbo.KeHoachSanXuat_SanPham planProduct
            JOIN TAG_QTKD.dbo.DonHang_SanPham orderProduct
              ON orderProduct.ID_DonHang_SanPham=planProduct.ID_DonHang_SanPham
            WHERE planProduct.ID_KeHoachSanXuat=@PlanId;

            DECLARE @ErpAccountCount INT=(SELECT COUNT(*) FROM dbo.USERS localUser
                JOIN TAG_System.dbo.TaiKhoanDangNhap externalAccount
                  ON LOWER(LTRIM(RTRIM(externalAccount.TenDangNhap))) COLLATE DATABASE_DEFAULT
                   = LOWER(LTRIM(RTRIM(localUser.Username))) COLLATE DATABASE_DEFAULT
                WHERE localUser.Id=@UserId);
            IF @ErpAccountCount<>1 THROW 52416,N'Tài khoản KCS chưa được ánh xạ duy nhất với tài khoản ERP.',1;
            DECLARE @ErpAccountId SMALLINT=(SELECT externalAccount.ID_TaiKhoanDangNhap FROM dbo.USERS localUser
                JOIN TAG_System.dbo.TaiKhoanDangNhap externalAccount
                  ON LOWER(LTRIM(RTRIM(externalAccount.TenDangNhap))) COLLATE DATABASE_DEFAULT
                   = LOWER(LTRIM(RTRIM(localUser.Username))) COLLATE DATABASE_DEFAULT
                WHERE localUser.Id=@UserId);

            SELECT @PlanId PlanId,@OrderId OrderId,@CustomerId CustomerId,@UnitId UnitId,
                @DepartmentId DepartmentId,@SelectedProcessId ProcessId,@WarehouseId WarehouseId,
                @OrderProductId OrderProductId,@ProductionLotId ProductionLotId,@ErpAccountId ErpAccountId;
        `);
    return result.recordset?.[0] || null;
};

const allocateReceiptNumber = async (executor) => {
    const result = await requestFor(executor).query(`
        DECLARE @LockResult INT;
        EXEC @LockResult=sys.sp_getapplock @Resource=N'TAG_QTKD_PHIEUNHAPBTP_NUMBER',
            @LockMode=N'Exclusive',@LockOwner=N'Transaction',@LockTimeout=10000;
        IF @LockResult<0 THROW 52417,N'Không thể cấp số phiếu nhập BTP.',1;
        DECLARE @Prefix NVARCHAR(20)=N'PNBTP-'+CONVERT(CHAR(7),GETDATE(),120)+N'-';
        DECLARE @NextNumber INT=(SELECT ISNULL(MAX(TRY_CONVERT(INT,SUBSTRING(So_PhieuNhapBTP,LEN(@Prefix)+1,20))),0)+1
            FROM TAG_QTKD.dbo.PhieuNhapBTP WITH(UPDLOCK,HOLDLOCK)
            WHERE So_PhieuNhapBTP LIKE @Prefix+N'%');
        SELECT @Prefix+RIGHT(N'0000'+CONVERT(NVARCHAR(20),@NextNumber),
            CASE WHEN @NextNumber<10000 THEN 4 ELSE LEN(CONVERT(NVARCHAR(20),@NextNumber)) END) AS ReceiptNumber;
    `);
    return result.recordset?.[0]?.ReceiptNumber;
};

const createDoiTraDefectReceipt = async (executor, {
    phieuId, userId, soPhieu, quantity, warehouseId, processId, phoiItems = []
}) => {
    const context = await loadReceiptContext(executor, phieuId, userId, quantity, warehouseId, processId);
    if (!context) throw Object.assign(new Error('Không đủ dữ liệu tạo phiếu nhập BTP lỗi'), { number: 52410 });
    const receiptNumber = await allocateReceiptNumber(executor);
    const inserted = await requestFor(executor)
        .input('ReceiptNumber', sql.NVarChar(20), receiptNumber)
        .input('ProcessId', sql.TinyInt, context.ProcessId)
        .input('WarehouseId', sql.SmallInt, context.WarehouseId)
        .input('CustomerId', sql.SmallInt, context.CustomerId)
        .input('UnitId', sql.SmallInt, context.UnitId)
        .input('DepartmentId', sql.SmallInt, context.DepartmentId)
        .input('ErpAccountId', sql.SmallInt, context.ErpAccountId)
        .input('Note', sql.NVarChar(255), `Tự động từ phiếu đổi trả ${soPhieu}`)
        .query(`
            DECLARE @ReceiptId INT,@Now DATETIME=GETDATE();
            EXEC TAG_QTKD.dbo.pr_PhieuNhapBTP_Insert
                @ID_HinhThucNhapBTP=10,@So_PhieuNhapBTP=@ReceiptNumber,@Ngay_NhapBTP=@Now,
                @ID_PhieuXuatBTP=NULL,@ID_QuyTrinhSanXuat=@ProcessId,@ID_KhoNhap=@WarehouseId,
                @ID_KhoXuat=NULL,@ID_KhachHang=@CustomerId,@ID_DonVi=@UnitId,@ID_BoPhan=@DepartmentId,
                @ID_NhaCungCap=NULL,@IsNhapKHSX=1,@NguoiGiaoHang=NULL,@GhiChu=@Note,
                @TaiKhoan_Lap=@ErpAccountId,@Ngay_Lap=@Now,@TaiKhoan_SuaCuoi=@ErpAccountId,
                @Ngay_SuaCuoi=@Now,@TaiKhoan_PheDuyet1=NULL,@Ngay_PheDuyet1=NULL,
                @TaiKhoan_PheDuyet2=NULL,@Ngay_PheDuyet2=NULL,@TaiKhoan_DuyetKy=NULL,
                @Ngay_DuyetKy=NULL,@TrangThai=0,@TonTai=1,@ID_PhieuNhapBTP=@ReceiptId OUTPUT;
            SELECT @ReceiptId ReceiptId;
        `);
    const receiptId = Number(inserted.recordset?.[0]?.ReceiptId);
    if (!receiptId) throw Object.assign(new Error('ERP không trả về mã phiếu nhập BTP'), { number: 52418 });

    await requestFor(executor)
        .input('ReceiptId', sql.Int, receiptId)
        .input('OrderId', sql.Int, context.OrderId)
        .input('ProductionLotId', sql.Int, context.ProductionLotId)
        .input('OrderProductId', sql.Int, context.OrderProductId)
        .input('Quantity', sql.Decimal(18, 2), quantity)
        .input('PhieuId', sql.Int, phieuId)
        .input('ReceiptNumber', sql.NVarChar(20), receiptNumber)
        .input('WarehouseId', sql.SmallInt, context.WarehouseId)
        .input('ProcessId', sql.TinyInt, context.ProcessId)
        .input('UserId', sql.Int, userId)
        .input('PhoiJson', sql.NVarChar(sql.MAX), JSON.stringify(phoiItems))
        .query(`
            EXEC TAG_QTKD.dbo.pr_PhieuNhapBTP_ChiTiet_Insert
                @ID_PhieuNhapBTP=@ReceiptId,@ID_DonHang=@OrderId,
                @ID_DonHang_LoSanXuat=@ProductionLotId,@ID_DonHang_SanPham=@OrderProductId,
                @SoLuong_NhapKho=@Quantity,@DonGia=NULL,@ThanhTien=NULL;
            INSERT dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP(
                PhieuId,SourcePhieuNhapBtpId,SoPhieuNhapBtp,SoLuongBtpLoi,
                SourceKhoNhapId,SourceQuyTrinhSanXuatId,TrangThai,CreatedBy
            ) VALUES(@PhieuId,@ReceiptId,@ReceiptNumber,@Quantity,@WarehouseId,@ProcessId,N'ACTIVE',@UserId);
            DECLARE @ReceiptLinkId INT=SCOPE_IDENTITY();
            INSERT dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP_PHOI(
                ReceiptLinkId,PhoiId,SuggestedProcessId,SelectedProcessId
            )
            SELECT @ReceiptLinkId,j.PhoiId,j.SuggestedProcessId,@ProcessId
            FROM OPENJSON(@PhoiJson) WITH(
                PhoiId INT '$.phoiId',SuggestedProcessId TINYINT '$.suggestedProcessId'
            ) j;
            UPDATE dbo.DOI_TRA_PHOI_LOI SET SoLuongBtpLoi=CASE
                WHEN SoLuongBtpLoi IS NULL OR SoLuongBtpLoi<@Quantity THEN @Quantity ELSE SoLuongBtpLoi END
            WHERE Id=@PhieuId;
        `);
    return getActiveDefectReceipt(executor, phieuId);
};

const createDoiTraDefectReceipts = async (executor, { phieuId, userId, soPhieu, receipts }) => {
    const existing = await getActiveDefectReceipts(executor, phieuId);
    if (existing.length) return { receipts: existing, idempotent: true };
    for (const receipt of receipts) {
        await createDoiTraDefectReceipt(executor, {
            phieuId,
            userId,
            soPhieu,
            quantity: receipt.quantity,
            warehouseId: receipt.warehouseId,
            processId: receipt.processId,
            phoiItems: receipt.phoiItems
        });
    }
    return { receipts: await getActiveDefectReceipts(executor, phieuId), idempotent: false };
};

const cancelDraftDefectReceipt = async (executor, { phieuId, userId, reason }) => {
    const result = await requestFor(executor)
        .input('PhieuId', sql.Int, phieuId)
        .input('UserId', sql.Int, userId)
        .input('Reason', sql.NVarChar(1000), reason || 'TBP KCS trả lại')
        .query(`
            IF NOT EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP
                WHERE PhieuId=@PhieuId AND TrangThai=N'ACTIVE') RETURN;
            IF EXISTS(SELECT 1
                FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP linkRow WITH(UPDLOCK,HOLDLOCK)
                JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt WITH(UPDLOCK,HOLDLOCK)
                  ON receipt.ID_PhieuNhapBTP=linkRow.SourcePhieuNhapBtpId
                WHERE linkRow.PhieuId=@PhieuId AND linkRow.TrangThai=N'ACTIVE'
                  AND (receipt.TrangThai<>0 OR receipt.TonTai<>1))
                THROW 52420,N'Phiếu nhập BTP lỗi đã được xử lý trên ERP. Cần thu hồi nghiệp vụ ERP trước khi trả lại KCS.',1;
            UPDATE receipt SET TonTai=0,Ngay_SuaCuoi=GETDATE()
            FROM TAG_QTKD.dbo.PhieuNhapBTP receipt
            JOIN dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP linkRow
              ON linkRow.SourcePhieuNhapBtpId=receipt.ID_PhieuNhapBTP
            WHERE linkRow.PhieuId=@PhieuId AND linkRow.TrangThai=N'ACTIVE'
              AND receipt.TrangThai=0 AND receipt.TonTai=1;
            UPDATE dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP
            SET TrangThai=N'CANCELLED',CancelledBy=@UserId,CancelledAt=SYSDATETIME(),CancelReason=@Reason
            WHERE PhieuId=@PhieuId AND TrangThai=N'ACTIVE';
            UPDATE dbo.DOI_TRA_PHOI_LOI SET SoLuongBtpLoi=NULL WHERE Id=@PhieuId;
        `);
    return result;
};

const confirmDefectReceiptByWarehouse = async (executor, { phieuId, userId }) => {
    const result = await requestFor(executor)
        .input('PhieuId', sql.Int, phieuId)
        .input('UserId', sql.Int, userId)
        .query(`
            IF NOT EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP
                WHERE PhieuId=@PhieuId AND TrangThai=N'ACTIVE')
                THROW 52421,N'Không tìm thấy phiếu nhập BTP lỗi đang hiệu lực để Kho xác nhận.',1;
            IF EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP linkRow WITH(UPDLOCK,HOLDLOCK)
                JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt WITH(UPDLOCK,HOLDLOCK)
                  ON receipt.ID_PhieuNhapBTP=linkRow.SourcePhieuNhapBtpId
                WHERE linkRow.PhieuId=@PhieuId AND linkRow.TrangThai=N'ACTIVE' AND receipt.TonTai<>1)
                THROW 52422,N'Phiếu nhập BTP lỗi đã bị hủy trên ERP.',1;
            IF EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP linkRow
                JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt
                  ON receipt.ID_PhieuNhapBTP=linkRow.SourcePhieuNhapBtpId
                WHERE linkRow.PhieuId=@PhieuId AND linkRow.TrangThai=N'ACTIVE'
                  AND receipt.TrangThai NOT IN(0,4,5))
                THROW 52423,N'Phiếu nhập BTP lỗi đã chuyển sang trạng thái ERP không thể xác nhận nhập.',1;

            DECLARE @ErpAccountId SMALLINT;
            IF (SELECT COUNT(*) FROM dbo.USERS localUser
                JOIN TAG_System.dbo.TaiKhoanDangNhap externalAccount
                  ON LOWER(LTRIM(RTRIM(externalAccount.TenDangNhap))) COLLATE DATABASE_DEFAULT
                   = LOWER(LTRIM(RTRIM(localUser.Username))) COLLATE DATABASE_DEFAULT
                WHERE localUser.Id=@UserId)<>1
                THROW 52430,N'Tài khoản Kho chưa được ánh xạ duy nhất với tài khoản TAG_System.',1;
            SELECT @ErpAccountId=externalAccount.ID_TaiKhoanDangNhap
            FROM dbo.USERS localUser
            JOIN TAG_System.dbo.TaiKhoanDangNhap externalAccount
              ON LOWER(LTRIM(RTRIM(externalAccount.TenDangNhap))) COLLATE DATABASE_DEFAULT
               = LOWER(LTRIM(RTRIM(localUser.Username))) COLLATE DATABASE_DEFAULT
            WHERE localUser.Id=@UserId;

            UPDATE receipt SET TrangThai=4,TaiKhoan_PheDuyet1=@ErpAccountId,
                Ngay_PheDuyet1=COALESCE(Ngay_PheDuyet1,GETDATE()),
                TaiKhoan_SuaCuoi=@ErpAccountId,Ngay_SuaCuoi=GETDATE()
            FROM TAG_QTKD.dbo.PhieuNhapBTP receipt
            JOIN dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP linkRow
              ON linkRow.SourcePhieuNhapBtpId=receipt.ID_PhieuNhapBTP
            WHERE linkRow.PhieuId=@PhieuId AND linkRow.TrangThai=N'ACTIVE'
              AND receipt.TrangThai=0 AND receipt.TonTai=1;

            UPDATE dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP
            SET WarehouseConfirmedBy=COALESCE(WarehouseConfirmedBy,@UserId),
                WarehouseConfirmedAt=COALESCE(WarehouseConfirmedAt,SYSDATETIME())
            WHERE PhieuId=@PhieuId AND TrangThai=N'ACTIVE';

            SELECT linkRow.Id,linkRow.SourcePhieuNhapBtpId,linkRow.SoPhieuNhapBtp,
                linkRow.WarehouseConfirmedBy,linkRow.WarehouseConfirmedAt,
                receipt.TrangThai AS ErpTrangThai,receipt.TonTai,
                CAST(0 AS bit) AS Idempotent
            FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP linkRow
            JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt
              ON receipt.ID_PhieuNhapBTP=linkRow.SourcePhieuNhapBtpId
            WHERE linkRow.PhieuId=@PhieuId AND linkRow.TrangThai=N'ACTIVE';
        `);
    return result.recordset || [];
};

const recordDefectReceiptStockCard = async (executor, { phieuId, userId }) => {
    const result = await requestFor(executor)
        .input('PhieuId', sql.Int, phieuId)
        .input('UserId', sql.Int, userId)
        .query(`
            IF NOT EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP
                WHERE PhieuId=@PhieuId AND TrangThai=N'ACTIVE')
                THROW 52431,N'Không tìm thấy phiếu nhập BTP lỗi đang hiệu lực để ghi thẻ kho.',1;
            IF EXISTS(SELECT 1 FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP linkRow WITH(UPDLOCK,HOLDLOCK)
                JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt WITH(UPDLOCK,HOLDLOCK)
                  ON receipt.ID_PhieuNhapBTP=linkRow.SourcePhieuNhapBtpId
                WHERE linkRow.PhieuId=@PhieuId AND linkRow.TrangThai=N'ACTIVE'
                  AND (receipt.TonTai<>1 OR receipt.TrangThai NOT IN(4,5)))
                THROW 52432,N'Tất cả phiếu nhập BTP lỗi phải được Kho xác nhận ở trạng thái 4 trước khi ghi thẻ kho.',1;

            DECLARE @ErpAccountId SMALLINT;
            IF (SELECT COUNT(*) FROM dbo.USERS localUser
                JOIN TAG_System.dbo.TaiKhoanDangNhap externalAccount
                  ON LOWER(LTRIM(RTRIM(externalAccount.TenDangNhap))) COLLATE DATABASE_DEFAULT
                   = LOWER(LTRIM(RTRIM(localUser.Username))) COLLATE DATABASE_DEFAULT
                WHERE localUser.Id=@UserId)<>1
                THROW 52433,N'Tài khoản ghi thẻ kho chưa được ánh xạ duy nhất với tài khoản TAG_System.',1;
            SELECT @ErpAccountId=externalAccount.ID_TaiKhoanDangNhap
            FROM dbo.USERS localUser
            JOIN TAG_System.dbo.TaiKhoanDangNhap externalAccount
              ON LOWER(LTRIM(RTRIM(externalAccount.TenDangNhap))) COLLATE DATABASE_DEFAULT
               = LOWER(LTRIM(RTRIM(localUser.Username))) COLLATE DATABASE_DEFAULT
            WHERE localUser.Id=@UserId;

            UPDATE receipt SET TrangThai=5,TaiKhoan_PheDuyet2=@ErpAccountId,
                Ngay_PheDuyet2=COALESCE(Ngay_PheDuyet2,GETDATE()),
                TaiKhoan_SuaCuoi=@ErpAccountId,Ngay_SuaCuoi=GETDATE()
            FROM TAG_QTKD.dbo.PhieuNhapBTP receipt
            JOIN dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP linkRow
              ON linkRow.SourcePhieuNhapBtpId=receipt.ID_PhieuNhapBTP
            WHERE linkRow.PhieuId=@PhieuId AND linkRow.TrangThai=N'ACTIVE'
              AND receipt.TrangThai=4 AND receipt.TonTai=1;

            UPDATE dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP
            SET StockCardRecordedBy=COALESCE(StockCardRecordedBy,@UserId),
                StockCardRecordedAt=COALESCE(StockCardRecordedAt,SYSDATETIME())
            WHERE PhieuId=@PhieuId AND TrangThai=N'ACTIVE';

            SELECT linkRow.Id,linkRow.SourcePhieuNhapBtpId,linkRow.SoPhieuNhapBtp,
                linkRow.StockCardRecordedBy,linkRow.StockCardRecordedAt,
                receipt.TrangThai AS ErpTrangThai,receipt.TonTai,
                CAST(0 AS bit) AS Idempotent
            FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP linkRow
            JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt
              ON receipt.ID_PhieuNhapBTP=linkRow.SourcePhieuNhapBtpId
            WHERE linkRow.PhieuId=@PhieuId AND linkRow.TrangThai=N'ACTIVE';
        `);
    return result.recordset || [];
};

const updateDraftDefectReceiptProcess = async (executor, { phieuId, userId, processId }) => {
    await requestFor(executor)
        .input('PhieuId', sql.Int, phieuId)
        .input('UserId', sql.Int, userId)
        .input('ProcessId', sql.TinyInt, processId)
        .query(`
            DECLARE @ReceiptId INT,@ErpStatus TINYINT,@Exists BIT,@OldProcessId TINYINT,
                @FromStatus NVARCHAR(80),@ErpAccountId SMALLINT;

            SELECT @ReceiptId=linkRow.SourcePhieuNhapBtpId,@ErpStatus=receipt.TrangThai,
                @Exists=receipt.TonTai,@OldProcessId=linkRow.SourceQuyTrinhSanXuatId
            FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP linkRow WITH(UPDLOCK,HOLDLOCK)
            JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt WITH(UPDLOCK,HOLDLOCK)
              ON receipt.ID_PhieuNhapBTP=linkRow.SourcePhieuNhapBtpId
            WHERE linkRow.PhieuId=@PhieuId AND linkRow.TrangThai=N'ACTIVE';

            IF @ReceiptId IS NULL
                THROW 52425,N'Không tìm thấy phiếu nhập BTP lỗi đang hiệu lực.',1;
            IF @Exists<>1
                THROW 52426,N'Phiếu nhập BTP lỗi đã bị hủy trên ERP.',1;
            IF @ErpStatus IN(4,5)
                THROW 52427,N'Phiếu nhập BTP lỗi đã được Kho xác nhận, không thể thay đổi loại BTP.',1;
            IF @ProcessId IS NULL OR NOT EXISTS(
                SELECT 1 FROM TAG_QTKD.dbo.DM_QuyTrinhSanXuat processRow
                WHERE processRow.ID_QuyTrinhSanXuat=@ProcessId
            ) THROW 52428,N'Loại BTP đã chọn không tồn tại.',1;

            IF (SELECT COUNT(*) FROM dbo.USERS localUser
                JOIN TAG_System.dbo.TaiKhoanDangNhap externalAccount
                  ON LOWER(LTRIM(RTRIM(externalAccount.TenDangNhap))) COLLATE DATABASE_DEFAULT
                   = LOWER(LTRIM(RTRIM(localUser.Username))) COLLATE DATABASE_DEFAULT
                WHERE localUser.Id=@UserId)<>1
                THROW 52429,N'Tài khoản KCS chưa được ánh xạ duy nhất với tài khoản ERP.',1;

            SELECT @ErpAccountId=externalAccount.ID_TaiKhoanDangNhap
            FROM dbo.USERS localUser
            JOIN TAG_System.dbo.TaiKhoanDangNhap externalAccount
              ON LOWER(LTRIM(RTRIM(externalAccount.TenDangNhap))) COLLATE DATABASE_DEFAULT
               = LOWER(LTRIM(RTRIM(localUser.Username))) COLLATE DATABASE_DEFAULT
            WHERE localUser.Id=@UserId;

            IF @OldProcessId<>@ProcessId
            BEGIN
                UPDATE TAG_QTKD.dbo.PhieuNhapBTP
                SET ID_QuyTrinhSanXuat=@ProcessId,TaiKhoan_SuaCuoi=@ErpAccountId,Ngay_SuaCuoi=GETDATE()
                WHERE ID_PhieuNhapBTP=@ReceiptId AND TrangThai NOT IN(4,5) AND TonTai=1;
                IF @@ROWCOUNT<>1
                    THROW 52427,N'Phiếu nhập BTP lỗi vừa được Kho xác nhận, không thể thay đổi loại BTP.',1;

                UPDATE dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP
                SET SourceQuyTrinhSanXuatId=@ProcessId
                WHERE PhieuId=@PhieuId AND SourcePhieuNhapBtpId=@ReceiptId AND TrangThai=N'ACTIVE';
                UPDATE mappingRow SET SelectedProcessId=@ProcessId
                FROM dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP_PHOI mappingRow
                JOIN dbo.DOI_TRA_PHOI_LOI_PHIEU_NHAP_BTP linkRow ON linkRow.Id=mappingRow.ReceiptLinkId
                WHERE linkRow.PhieuId=@PhieuId AND linkRow.SourcePhieuNhapBtpId=@ReceiptId;

                SELECT @FromStatus=TrangThai FROM dbo.DOI_TRA_PHOI_LOI WHERE Id=@PhieuId;
                UPDATE dbo.DOI_TRA_PHOI_LOI SET UpdatedAt=SYSDATETIME() WHERE Id=@PhieuId;
                INSERT dbo.DOI_TRA_PHOI_LOI_HISTORY
                    (PhieuId,ActionCode,FromStatus,ToStatus,ActionBy,GhiChu)
                VALUES(@PhieuId,N'KCS_UPDATE_BTP_TYPE',@FromStatus,@FromStatus,@UserId,
                    CONCAT(N'Đổi loại BTP từ ',@OldProcessId,N' sang ',@ProcessId));
            END;
        `);
    return getActiveDefectReceipt(executor, phieuId);
};

module.exports = {
    RECEIPT_VALIDATION_ERROR_MIN,
    RECEIPT_VALIDATION_ERROR_MAX,
    getActiveDefectReceipt,
    getActiveDefectReceipts,
    createDoiTraDefectReceipt,
    createDoiTraDefectReceipts,
    cancelDraftDefectReceipt,
    confirmDefectReceiptByWarehouse,
    recordDefectReceiptStockCard,
    updateDraftDefectReceiptProcess
};
