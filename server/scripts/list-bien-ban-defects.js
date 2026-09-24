require("dotenv").config();

const sql = require("mssql");
const { poolPromise: z76PoolPromise } = require("../db");
const { poolPromise: plpPoolPromise } = require("../db2");

const DEFAULT_KEYWORDS = ["Nấm mốc", "sai tem"];

const normalizeText = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const parseArgs = () => {
    const args = process.argv.slice(2);
    const tenantIndex = args.indexOf("--tenant");
    const json = args.includes("--json");
    const terms = args.filter((arg, index) => arg !== "--json" && index !== tenantIndex && index !== tenantIndex + 1);
    const tenant = tenantIndex >= 0 ? String(args[tenantIndex + 1] || "Z76").toUpperCase() : "Z76";
    if (!["Z76", "PLP"].includes(tenant)) {
        throw new Error("--tenant chỉ nhận Z76 hoặc PLP");
    }
    return { tenant, json, keywords: terms.length ? terms : DEFAULT_KEYWORDS };
};

async function getDefects(pool, bienBan) {
    const override = await pool.request()
        .input("BienBanId", sql.Int, bienBan.Id)
        .query(`
            SELECT d.DefectId, d.MaLoi, d.TenLoi, d.TenLoiTuNhap, d.DefectType,
                   d.MoTa, d.SoLuong, d.SoLuongKiem, d.GhiChu
            FROM dbo.BIEN_BAN_DEFECT d
            WHERE d.BienBanId = @BienBanId
            ORDER BY d.SortOrder, d.Id
        `);
    if (override.recordset.length) return override.recordset;

    const source = await pool.request()
        .input("BienBanId", sql.Int, bienBan.Id)
        .execute(bienBan.IsCongDoan ? "sp_BienBan_CongDoan_GetDefects" : "sp_BienBan_GetDefects");
    return source.recordset || [];
}

async function main() {
    const { tenant, json, keywords } = parseArgs();
    const pool = await (tenant === "PLP" ? plpPoolPromise : z76PoolPromise);
    try {
        const headers = await pool.request().query(`
            SELECT bb.Id, bb.SoBienBan, bb.PhieuKiemId, bb.LoaiBienBan, bb.TrangThai,
                   bb.CreatedAt, pk.SoPhieu, product.MaSanPham, product.TenSanPham,
                   CAST(CASE WHEN EXISTS (
                       SELECT 1 FROM dbo.PHIEU_KIEM_CONG_DOAN_HEADER cd
                       WHERE cd.PhieuKiemId = bb.PhieuKiemId
                   ) THEN 1 ELSE 0 END AS bit) AS IsCongDoan
            FROM dbo.BIEN_BAN_KIEM bb
            LEFT JOIN dbo.PHIEU_KIEM pk ON pk.Id = bb.PhieuKiemId
            LEFT JOIN dbo.DM_SAN_PHAM product ON product.Id = pk.SanPhamId
            ORDER BY bb.CreatedAt DESC, bb.Id DESC
        `);

        const normalizedKeywords = keywords.map(normalizeText);
        const matches = [];
        for (const bienBan of headers.recordset) {
            const defects = await getDefects(pool, bienBan);
            for (const defect of defects) {
                const searchable = normalizeText([
                    defect.MaLoi, defect.TenLoi, defect.TenLoiTuNhap, defect.MoTa, defect.GhiChu
                ].filter(Boolean).join(" "));
                const matchedKeywords = keywords.filter((_, index) => searchable.includes(normalizedKeywords[index]));
                if (matchedKeywords.length) {
                    matches.push({
                        BienBanId: bienBan.Id,
                        SoBienBan: bienBan.SoBienBan,
                        SoPhieu: bienBan.SoPhieu,
                        MaSanPham: bienBan.MaSanPham,
                        TenSanPham: bienBan.TenSanPham,
                        TrangThai: bienBan.TrangThai,
                        NgayLap: bienBan.CreatedAt,
                        MaLoi: defect.MaLoi,
                        TenLoi: defect.TenLoi || defect.TenLoiTuNhap,
                        SoLuong: defect.SoLuong,
                        TuKhoaKhop: matchedKeywords.join(", ")
                    });
                }
            }
        }

        if (json) {
            console.log(JSON.stringify(matches, null, 2));
        } else if (matches.length) {
            console.table(matches);
        } else {
            console.log(`Không tìm thấy biên bản nào có lỗi khớp: ${keywords.join(", ")}.`);
        }
        console.log(`Tổng cộng: ${matches.length} dòng lỗi trên ${new Set(matches.map((item) => item.BienBanId)).size} biên bản.`);
    } finally {
        await pool.close();
    }
}

main().catch((error) => {
    console.error("Không thể lấy danh sách biên bản:", error.message);
    process.exitCode = 1;
});
