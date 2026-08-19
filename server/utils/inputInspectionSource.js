const sql = require("mssql");

const loadInputInspectionSource = async (executor, phieuKiemId) => {
    const normalizedId = Number(phieuKiemId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) return null;

    const result = await executor.request()
        .input("PhieuKiemId", sql.Int, normalizedId)
        .query(`
            SELECT TOP (1)
                inspection.SourceId AS ID_ChungTuNhap_ChiTiet,
                receipt.ID_ChungTuNhap,
                receipt.So_Invoice,
                COALESCE(receipt.NgayVe_DuKien,receipt.Ngay_Invoice) AS NgayChungTu,
                orderRow.ID_DonHang,
                orderRow.Ma_DonHang,
                supplier.Ten_NhaCungCap
            FROM dbo.PHIEU_KIEM inspection
            JOIN dbo.DM_LOAI_KIEM inspectionType ON inspectionType.Id=inspection.LoaiKiemId
            LEFT JOIN TAG_QTKD.dbo.ChungTuNhap_ChiTiet receiptDetail
                ON receiptDetail.ID_ChungTuNhap_ChiTiet=inspection.SourceId
            LEFT JOIN TAG_QTKD.dbo.ChungTuNhap receipt
                ON receipt.ID_ChungTuNhap=receiptDetail.ID_ChungTuNhap
            LEFT JOIN TAG_QTKD.dbo.DonHang_VatTu orderMaterial
                ON orderMaterial.ID_DonHang_VatTu=receiptDetail.ID_DonHang_VatTu
            LEFT JOIN TAG_QTKD.dbo.DonHang orderRow
                ON orderRow.ID_DonHang=orderMaterial.ID_DonHang AND orderRow.TonTai=1
            LEFT JOIN TAG_QTKD.dbo.DM_NhaCungCap supplier
                ON supplier.ID_NhaCungCap=receipt.ID_NhaCungCap AND supplier.TonTai=1
            WHERE inspection.Id=@PhieuKiemId AND inspectionType.MaLoai=N'DAU_VAO';
        `);
    return result.recordset?.[0] || null;
};

const attachInputInspectionSource = async (executor, phieu = null) => {
    if (!phieu?.Id) return phieu;
    const source = await loadInputInspectionSource(executor, phieu.Id);
    if (!source) return phieu;

    Object.assign(phieu, {
        ID_ChungTuNhap_ChiTiet: source.ID_ChungTuNhap_ChiTiet,
        ID_ChungTuNhap: source.ID_ChungTuNhap,
        So_Invoice: source.So_Invoice,
        NgayChungTuNhap: source.NgayChungTu,
        ID_DonHang: source.ID_DonHang,
        MaDonHang: source.Ma_DonHang || phieu.MaDonHang || phieu.DoiTuong || null,
        SoDonHang: source.Ma_DonHang || phieu.SoDonHang || phieu.DoiTuong || null,
        NhaCungCap: source.Ten_NhaCungCap || phieu.NhaCungCap || null
    });
    return phieu;
};

module.exports = { loadInputInspectionSource, attachInputInspectionSource };
