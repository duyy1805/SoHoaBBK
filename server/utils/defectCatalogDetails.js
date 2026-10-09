const sql = require("mssql");

const normalizeCode = (value) => String(value || "").trim().toLocaleUpperCase("vi");

const toCatalogDetail = (row) => row ? ({
    Id: row.Id,
    MaLoi: row.MaLoi,
    TenLoi: row.TenLoi,
    DefectType: row.DefectType,
    MoTa: row.MoTa,
    GhiChu: row.GhiChu,
    PhuongAnXuLy: row.PhuongAnXuLy,
    PhanHe: row.PhanHe,
    MaNhomLoi: row.MaNhomLoi,
    LoaiLoiSXBT: row.LoaiLoiSXBT,
    TenSanPham: row.TenSanPham,
    ChungLoai: row.ChungLoai,
    PhamViApDung: row.PhamViApDung,
    ThiTruong: row.ThiTruong,
    ImageUrl: row.ImageUrl,
    ImageUrls: row.ImageUrls
}) : null;

const attachCatalogDetails = (defects = [], catalogRows = []) => {
    const byId = new Map();
    const byCode = new Map();

    catalogRows.forEach((row) => {
        const id = Number(row?.Id);
        if (Number.isInteger(id) && id > 0) byId.set(id, row);
        const code = normalizeCode(row?.MaLoi);
        if (code) byCode.set(code, row);
    });

    return defects.map((defect) => {
        const defectId = Number(defect?.DefectId);
        const catalog = (Number.isInteger(defectId) && defectId > 0 ? byId.get(defectId) : null)
            || byCode.get(normalizeCode(defect?.MaLoi))
            || null;
        return { ...defect, CatalogDetail: toCatalogDetail(catalog) };
    });
};

const enrichDefectsWithCatalog = async (pool, defects = []) => {
    if (!Array.isArray(defects) || defects.length === 0) return [];

    const ids = [...new Set(defects
        .map((item) => Number(item?.DefectId))
        .filter((id) => Number.isInteger(id) && id > 0))];
    const codes = [...new Set(defects
        .map((item) => normalizeCode(item?.MaLoi))
        .filter(Boolean))];

    if (!ids.length && !codes.length) return attachCatalogDetails(defects, []);

    const request = pool.request();
    const conditions = [];
    if (ids.length) {
        const params = ids.map((id, index) => {
            const name = `DefectId${index}`;
            request.input(name, sql.Int, id);
            return `@${name}`;
        });
        conditions.push(`d.Id IN (${params.join(",")})`);
    }
    if (codes.length) {
        const params = codes.map((code, index) => {
            const name = `DefectCode${index}`;
            request.input(name, sql.NVarChar(100), code);
            return `@${name}`;
        });
        conditions.push(`UPPER(LTRIM(RTRIM(d.MaLoi))) IN (${params.join(",")})`);
    }

    const result = await request.query(`
        SELECT d.Id,d.MaLoi,d.TenLoi,d.DefectType,d.MoTa,d.GhiChu,d.PhuongAnXuLy,
            d.PhanHe,d.MaNhomLoi,d.LoaiLoiSXBT,d.TenSanPham,d.ChungLoai,
            d.PhamViApDung,d.ThiTruong,d.ImageUrl,d.ImageUrls
        FROM dbo.DM_DEFECT d
        WHERE ${conditions.join(" OR ")}
    `);

    return attachCatalogDetails(defects, result.recordset || []);
};

module.exports = { attachCatalogDetails, enrichDefectsWithCatalog };
