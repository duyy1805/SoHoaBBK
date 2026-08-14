const sql = require("mssql");

const cleanText = (value) => {
    const text = String(value ?? "").trim();
    return text || null;
};

const normalizeIds = (values) => [...new Set((values || [])
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0))];

const loadBienBanListSummaries = async (pool, bienBanIds) => {
    const ids = normalizeIds(bienBanIds);
    if (!ids.length) return new Map();

    const result = await pool.request()
        .input("BienBanIds", sql.NVarChar(sql.MAX), ids.join(","))
        .query(`
            DECLARE @Target TABLE (BienBanId int PRIMARY KEY);
            INSERT @Target (BienBanId)
            SELECT DISTINCT TRY_CONVERT(int,[value])
            FROM STRING_SPLIT(@BienBanIds,',')
            WHERE TRY_CONVERT(int,[value]) IS NOT NULL;

            SELECT bb.Id AS BienBanId,bb.MoTaChung,bb.PhieuKiemId,
                pk.Lot AS InspectionLot,localProduct.MaSanPham AS InspectionProductCode,
                localProduct.TenSanPham AS InspectionProductName
            FROM dbo.BIEN_BAN_KIEM bb
            JOIN @Target target ON target.BienBanId=bb.Id
            LEFT JOIN dbo.PHIEU_KIEM pk ON pk.Id=bb.PhieuKiemId
            LEFT JOIN dbo.DM_SAN_PHAM localProduct ON localProduct.Id=pk.SanPhamId;

            SELECT fields.BienBanId,fields.FieldName,fields.FieldValue,fields.SourcePriority
            FROM (
                SELECT bb.Id AS BienBanId,customField.FieldName,customField.FieldValue,1 AS SourcePriority
                FROM dbo.BIEN_BAN_KIEM bb
                JOIN @Target target ON target.BienBanId=bb.Id
                JOIN dbo.PhieuKiem_CustomFields customField ON customField.PhieuKiemId=bb.PhieuKiemId
                WHERE customField.FieldName IN (
                    N'MaSanPham',N'MaItem',N'TenSanPham',N'Lot',N'DonHang',N'PhatHienTu',N'MucDo',
                    N'TrenChuyen_MaSanPham',N'TrenChuyen_TenSanPham',N'TrenChuyen_Lot',N'TrenChuyen_MaDonHang',
                    N'TrenChuyen_TenDonVi',N'TrenChuyen_TenBoPhan',N'ItemSourceType'
                )
                UNION ALL
                SELECT customField.BienBanId,customField.FieldName,customField.FieldValue,2 AS SourcePriority
                FROM dbo.BienBan_CustomFields customField
                JOIN @Target target ON target.BienBanId=customField.BienBanId
                WHERE customField.FieldName IN (
                    N'MaSanPham',N'MaItem',N'TenSanPham',N'Lot',N'DonHang',N'PhatHienTu',N'MucDo',
                    N'TrenChuyen_MaSanPham',N'TrenChuyen_TenSanPham',N'TrenChuyen_Lot',N'TrenChuyen_MaDonHang',
                    N'TrenChuyen_TenDonVi',N'TrenChuyen_TenBoPhan',N'ItemSourceType'
                )
            ) fields
            WHERE NULLIF(LTRIM(RTRIM(fields.FieldValue)),N'') IS NOT NULL
            ORDER BY fields.BienBanId,fields.SourcePriority,fields.FieldName;

            ;WITH OverrideCount AS (
                SELECT defect.BienBanId,COUNT(*) AS Total
                FROM dbo.BIEN_BAN_DEFECT defect
                JOIN @Target target ON target.BienBanId=defect.BienBanId
                GROUP BY defect.BienBanId
            ), DefectSource AS (
                SELECT defect.BienBanId,defect.Id AS SourceOrder,defect.MaLoi,
                    COALESCE(NULLIF(defect.TenLoi,N''),NULLIF(defect.TenLoiTuNhap,N''),catalog.TenLoi) AS TenLoi,
                    defect.DefectType,ISNULL(defect.SoLuong,0) AS SoLuong
                FROM dbo.BIEN_BAN_DEFECT defect
                JOIN @Target target ON target.BienBanId=defect.BienBanId
                LEFT JOIN dbo.DM_DEFECT catalog ON catalog.Id=defect.DefectId

                UNION ALL
                SELECT bb.Id,source.Id,catalog.MaLoi,catalog.TenLoi,
                    COALESCE(source.DefectType,catalog.DefectType),ISNULL(source.SoLuong,0)
                FROM dbo.BIEN_BAN_KIEM bb
                JOIN @Target target ON target.BienBanId=bb.Id
                JOIN dbo.PHIEU_KIEM_SECTION sectionRow ON sectionRow.PhieuKiemId=bb.PhieuKiemId
                JOIN dbo.PHIEU_KIEM_DEFECT source ON source.SectionId=sectionRow.Id
                LEFT JOIN dbo.DM_DEFECT catalog ON catalog.Id=source.DefectId
                LEFT JOIN OverrideCount overrideRow ON overrideRow.BienBanId=bb.Id
                WHERE overrideRow.BienBanId IS NULL

                UNION ALL
                SELECT bb.Id,source.Id,catalog.MaLoi,catalog.TenLoi,catalog.DefectType,ISNULL(source.SoLuong,0)
                FROM dbo.BIEN_BAN_KIEM bb
                JOIN @Target target ON target.BienBanId=bb.Id
                JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT slot ON slot.PhieuKiemId=bb.PhieuKiemId
                JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY entryRow ON entryRow.SlotId=slot.Id
                JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT source ON source.EntryId=entryRow.Id
                LEFT JOIN dbo.DM_DEFECT catalog ON catalog.Id=source.DefectId
                LEFT JOIN OverrideCount overrideRow ON overrideRow.BienBanId=bb.Id
                WHERE overrideRow.BienBanId IS NULL

                UNION ALL
                SELECT bb.Id,source.Id,catalog.MaLoi,catalog.TenLoi,catalog.DefectType,ISNULL(source.SoLuong,0)
                FROM dbo.BIEN_BAN_KIEM bb
                JOIN @Target target ON target.BienBanId=bb.Id
                JOIN dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN planRow ON planRow.PhieuKiemId=bb.PhieuKiemId
                JOIN dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT source ON source.PlanId=planRow.Id
                LEFT JOIN dbo.DM_DEFECT catalog ON catalog.Id=source.DefectId
                LEFT JOIN OverrideCount overrideRow ON overrideRow.BienBanId=bb.Id
                WHERE overrideRow.BienBanId IS NULL

                UNION ALL
                SELECT bb.Id,source.Id,catalog.MaLoi,catalog.TenLoi,catalog.DefectType,ISNULL(source.SoLuong,0)
                FROM dbo.BIEN_BAN_KIEM bb
                JOIN @Target target ON target.BienBanId=bb.Id
                JOIN dbo.PHIEU_KIEM_CONG_DOAN_PLAN planRow ON planRow.PhieuKiemId=bb.PhieuKiemId
                JOIN dbo.PHIEU_KIEM_CONG_DOAN_DEFECT source ON source.PlanId=planRow.Id
                LEFT JOIN dbo.DM_DEFECT catalog ON catalog.Id=source.DefectId
                LEFT JOIN OverrideCount overrideRow ON overrideRow.BienBanId=bb.Id
                WHERE overrideRow.BienBanId IS NULL
            ), DefectGrouped AS (
                SELECT BienBanId,COALESCE(NULLIF(MaLoi,N''),N'') AS MaLoi,
                    COALESCE(NULLIF(TenLoi,N''),N'Lỗi chưa đặt tên') AS TenLoi,
                    MAX(DefectType) AS DefectType,SUM(SoLuong) AS SoLuong,MIN(SourceOrder) AS SourceOrder
                FROM DefectSource
                GROUP BY BienBanId,COALESCE(NULLIF(MaLoi,N''),N''),COALESCE(NULLIF(TenLoi,N''),N'Lỗi chưa đặt tên')
            )
            SELECT BienBanId,MaLoi,TenLoi,DefectType,SoLuong,
                COUNT(*) OVER (PARTITION BY BienBanId) AS DefectCount,
                SUM(SoLuong) OVER (PARTITION BY BienBanId) AS TotalDefectQuantity,
                ROW_NUMBER() OVER (PARTITION BY BienBanId ORDER BY SourceOrder,MaLoi,TenLoi) AS DisplayOrder
            FROM DefectGrouped
            ORDER BY BienBanId,DisplayOrder;
        `);

    const summaries = new Map();
    for (const header of result.recordsets?.[0] || []) {
        summaries.set(Number(header.BienBanId), {
            MoTaChung: cleanText(header.MoTaChung),
            MaSanPham: cleanText(header.InspectionProductCode),
            TenSanPham: cleanText(header.InspectionProductName),
            Lot: cleanText(header.InspectionLot),
            DonHang: null,
            PhatHienTu: null,
            MucDo: null,
            ItemSourceType: null,
            ProductionUnit: null,
            DefectCount: 0,
            TotalDefectQuantity: 0,
            MainDefects: []
        });
    }

    for (const field of result.recordsets?.[1] || []) {
        const summary = summaries.get(Number(field.BienBanId));
        if (!summary) continue;
        const value = cleanText(field.FieldValue);
        if (!value) continue;
        const fieldMap = {
            MaSanPham: "MaSanPham", MaItem: "MaSanPham", TrenChuyen_MaSanPham: "MaSanPham",
            TenSanPham: "TenSanPham", TrenChuyen_TenSanPham: "TenSanPham",
            Lot: "Lot", TrenChuyen_Lot: "Lot",
            DonHang: "DonHang", TrenChuyen_MaDonHang: "DonHang",
            PhatHienTu: "PhatHienTu", MucDo: "MucDo", ItemSourceType: "ItemSourceType",
            TrenChuyen_TenDonVi: "ProductionUnit", TrenChuyen_TenBoPhan: "ProductionUnit"
        };
        const targetField = fieldMap[field.FieldName];
        if (targetField) summary[targetField] = value;
    }

    for (const defect of result.recordsets?.[2] || []) {
        const summary = summaries.get(Number(defect.BienBanId));
        if (!summary) continue;
        summary.DefectCount = Number(defect.DefectCount) || 0;
        summary.TotalDefectQuantity = Number(defect.TotalDefectQuantity) || 0;
        if (Number(defect.DisplayOrder) <= 2) {
            summary.MainDefects.push({
                MaLoi: cleanText(defect.MaLoi),
                TenLoi: cleanText(defect.TenLoi),
                DefectType: cleanText(defect.DefectType),
                SoLuong: Number(defect.SoLuong) || 0
            });
        }
    }
    return summaries;
};

const mergeBienBanListSummary = (row, summary) => ({
    ...row,
    MaSanPham: cleanText(summary?.MaSanPham) || cleanText(row.MaSanPham),
    TenSanPham: cleanText(summary?.TenSanPham) || cleanText(row.TenSanPham),
    Lot: cleanText(summary?.Lot) || cleanText(row.Lot),
    DonHang: cleanText(summary?.DonHang) || cleanText(row.DonHang),
    MoTaChung: cleanText(summary?.MoTaChung) || cleanText(row.MoTaChung),
    PhatHienTu: cleanText(summary?.PhatHienTu) || cleanText(row.PhatHienTu),
    MucDo: cleanText(summary?.MucDo) || cleanText(row.MucDo),
    ItemSourceType: cleanText(summary?.ItemSourceType) || cleanText(row.ItemSourceType),
    ProductionUnit: cleanText(summary?.ProductionUnit) || cleanText(row.ProductionUnit),
    DefectCount: Number(summary?.DefectCount ?? row.DefectCount) || 0,
    TotalDefectQuantity: Number(summary?.TotalDefectQuantity ?? row.TotalDefectQuantity) || 0,
    MainDefects: Array.isArray(summary?.MainDefects) ? summary.MainDefects : (row.MainDefects || [])
});

module.exports = { loadBienBanListSummaries, mergeBienBanListSummary };
