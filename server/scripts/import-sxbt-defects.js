#!/usr/bin/env node

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const sql = require("mssql");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const workbookArg = args.find((arg) => arg !== "--dry-run");
const workbookPath = path.resolve(workbookArg || path.join(__dirname, "..", "..", "dm_defects_sxbt.xlsx"));
const uploadDir = path.join(__dirname, "..", "uploads", "defects", "sxbt");
const publicUploadDir = "/uploads/defects/sxbt";

const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT, 10),
    options: {
        encrypt: false,
        trustedConnection: process.env.DB_TRUSTED_CONNECTION === "true",
        enableArithAbort: process.env.DB_ENABLE_ARITHABORT === "true",
        trustServerCertificate: true,
        useUTC: false,
        cryptoCredentialsDetails: {
            servername: undefined
        }
    }
};

function unzip(entry) {
    return execFileSync("unzip", ["-p", workbookPath, entry], { maxBuffer: 1024 * 1024 * 100 });
}

function unzipText(entry) {
    return unzip(entry).toString("utf8");
}

function decodeXml(value = "") {
    return value
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

function attr(xml, name) {
    const match = xml.match(new RegExp(`${name}="([^"]*)"`, "i"));
    return match ? decodeXml(match[1]) : "";
}

function normalizeTarget(baseDir, target) {
    const normalized = path.posix.normalize(path.posix.join(baseDir, target));
    return normalized.replace(/^\/+/, "");
}

function parseRelationships(xml, baseDir) {
    const rels = {};
    for (const match of xml.matchAll(/<Relationship\b[^>]*>/g)) {
        const id = attr(match[0], "Id");
        const target = attr(match[0], "Target");
        if (id && target) rels[id] = normalizeTarget(baseDir, target);
    }
    return rels;
}

function parseSharedStrings(xml) {
    const strings = [];
    for (const match of xml.matchAll(/<si\b[\s\S]*?<\/si>/g)) {
        const text = [...match[0].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
            .map((item) => decodeXml(item[1]))
            .join("");
        strings.push(text);
    }
    return strings;
}

function columnIndex(cellRef) {
    const letters = (cellRef.match(/[A-Z]+/) || [""])[0];
    let index = 0;
    for (const letter of letters) {
        index = index * 26 + letter.charCodeAt(0) - 64;
    }
    return index - 1;
}

function parseSheetRows(xml, sharedStrings) {
    const rows = [];
    for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
        const rowNo = Number(attr(rowMatch[0], "r"));
        const values = [];
        for (const cellMatch of rowMatch[1].matchAll(/<c\b[^>]*>([\s\S]*?)<\/c>/g)) {
            const cellXml = cellMatch[0];
            const ref = attr(cellXml, "r");
            const type = attr(cellXml, "t");
            const idx = columnIndex(ref);
            const vMatch = cellMatch[1].match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
            const inlineText = [...cellMatch[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
                .map((item) => decodeXml(item[1]))
                .join("");
            const raw = vMatch ? decodeXml(vMatch[1]) : inlineText;
            values[idx] = type === "s" && raw !== "" ? sharedStrings[Number(raw)] || "" : raw;
        }
        rows.push({ rowNo, values });
    }
    return rows;
}

function parseDrawingImages(drawingXml, drawingRels) {
    const imagesByRow = new Map();
    for (const anchor of drawingXml.matchAll(/<xdr:(?:twoCellAnchor|oneCellAnchor)\b[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/g)) {
        const xml = anchor[0];
        const rowMatch = xml.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>[\s\S]*?<\/xdr:from>/);
        const colMatch = xml.match(/<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>[\s\S]*?<\/xdr:from>/);
        const embedMatch = xml.match(/r:embed="([^"]+)"/);
        if (!rowMatch || !colMatch || !embedMatch) continue;

        const rowNo = Number(rowMatch[1]) + 1;
        const colNo = Number(colMatch[1]) + 1;
        if (colNo !== 5) continue;

        const mediaPath = drawingRels[embedMatch[1]];
        if (!mediaPath) continue;
        if (!imagesByRow.has(rowNo)) imagesByRow.set(rowNo, []);
        imagesByRow.get(rowNo).push(mediaPath);
    }
    return imagesByRow;
}

function getSheetPathByName(sheetName) {
    const workbook = unzipText("xl/workbook.xml");
    const workbookRels = parseRelationships(unzipText("xl/_rels/workbook.xml.rels"), "xl");
    for (const match of workbook.matchAll(/<sheet\b[^>]*>/g)) {
        if (attr(match[0], "name") !== sheetName) continue;
        const relId = attr(match[0], "r:id");
        return workbookRels[relId];
    }
    throw new Error(`Không tìm thấy sheet ${sheetName}`);
}

function getSheetDrawingPath(sheetPath, sheetXml) {
    const drawingMatch = sheetXml.match(/<drawing\b[^>]*r:id="([^"]+)"[^>]*\/>/);
    if (!drawingMatch) return null;
    const relPath = `${path.posix.dirname(sheetPath)}/_rels/${path.posix.basename(sheetPath)}.rels`;
    const sheetRels = parseRelationships(unzipText(relPath), path.posix.dirname(sheetPath));
    return sheetRels[drawingMatch[1]] || null;
}

function buildRows() {
    const sheetPath = getSheetPathByName("L05");
    const sheetXml = unzipText(sheetPath);
    const sharedStrings = parseSharedStrings(unzipText("xl/sharedStrings.xml"));
    const rows = parseSheetRows(sheetXml, sharedStrings);

    const drawingPath = getSheetDrawingPath(sheetPath, sheetXml);
    const imagesByRow = new Map();
    if (drawingPath) {
        const drawingXml = unzipText(drawingPath);
        const drawingRelsPath = `${path.posix.dirname(drawingPath)}/_rels/${path.posix.basename(drawingPath)}.rels`;
        const drawingRels = parseRelationships(unzipText(drawingRelsPath), path.posix.dirname(drawingPath));
        for (const [rowNo, mediaPaths] of parseDrawingImages(drawingXml, drawingRels)) {
            imagesByRow.set(rowNo, mediaPaths);
        }
    }

    let sequence = 0;
    return rows
        .map(({ rowNo, values }) => ({
            rowNo,
            stt: String(values[0] || "").trim(),
            maNhomLoi: String(values[1] || "").trim(),
            loaiLoi: String(values[2] || "").trim(),
            moTa: String(values[3] || "").trim(),
            phamVi: String(values[5] || "").trim(),
            thiTruong: String(values[6] || "").trim(),
            mediaPath: imagesByRow.get(rowNo)?.[0] || null
        }))
        .filter((row) => row.maNhomLoi === "L05" && row.moTa)
        .map((row) => {
            sequence += 1;
            const maLoi = `SXBT-L05-${String(sequence).padStart(3, "0")}`;
            return { ...row, maLoi, thuTu: sequence };
        });
}

function saveImage(row) {
    if (!row.mediaPath) return null;
    fs.mkdirSync(uploadDir, { recursive: true });

    const ext = path.extname(row.mediaPath).toLowerCase() || ".png";
    const fileName = `${row.maLoi}${ext}`;
    fs.writeFileSync(path.join(uploadDir, fileName), unzip(row.mediaPath));
    return `${publicUploadDir}/${fileName}`;
}

async function upsertDefect(pool, row) {
    const imageUrl = saveImage(row);
    const imageUrls = imageUrl ? JSON.stringify([imageUrl]) : null;
    const ghiChu = row.phamVi || null;

    const existing = await pool.request()
        .input("MaLoi", sql.NVarChar(50), row.maLoi)
        .query("SELECT Id FROM dbo.DM_DEFECT WHERE MaLoi = @MaLoi");

    if (existing.recordset.length > 0) {
        await pool.request()
            .input("Id", sql.Int, existing.recordset[0].Id)
            .input("TenLoi", sql.NVarChar(255), row.moTa)
            .input("DefectType", sql.NVarChar(20), "MAJOR")
            .input("MoTa", sql.NVarChar(sql.MAX), row.moTa)
            .input("GhiChu", sql.NVarChar(sql.MAX), ghiChu)
            .input("TrangThai", sql.Bit, true)
            .input("MaLoi", sql.NVarChar(50), row.maLoi)
            .input("PhanHe", sql.NVarChar(20), "SXBT")
            .input("MaNhomLoi", sql.NVarChar(20), row.maNhomLoi)
            .input("LoaiLoiSXBT", sql.NVarChar(10), row.loaiLoi || null)
            .input("TenSanPham", sql.NVarChar(255), null)
            .input("ChungLoai", sql.NVarChar(255), null)
            .input("PhamViApDung", sql.NVarChar(500), row.phamVi || null)
            .input("ThiTruong", sql.NVarChar(255), row.thiTruong || null)
            .input("ImageUrl", sql.NVarChar(500), imageUrl)
            .input("ImageUrls", sql.NVarChar(sql.MAX), imageUrls)
            .input("ThuTu", sql.Int, row.thuTu)
            .execute("sp_DM_UpdateDefect");
        return "updated";
    }

    await pool.request()
        .input("TenLoi", sql.NVarChar(255), row.moTa)
        .input("DefectType", sql.NVarChar(20), "MAJOR")
        .input("MoTa", sql.NVarChar(sql.MAX), row.moTa)
        .input("GhiChu", sql.NVarChar(sql.MAX), ghiChu)
        .input("MaLoi", sql.NVarChar(50), row.maLoi)
        .input("PhanHe", sql.NVarChar(20), "SXBT")
        .input("MaNhomLoi", sql.NVarChar(20), row.maNhomLoi)
        .input("LoaiLoiSXBT", sql.NVarChar(10), row.loaiLoi || null)
        .input("TenSanPham", sql.NVarChar(255), null)
        .input("ChungLoai", sql.NVarChar(255), null)
        .input("PhamViApDung", sql.NVarChar(500), row.phamVi || null)
        .input("ThiTruong", sql.NVarChar(255), row.thiTruong || null)
        .input("ImageUrl", sql.NVarChar(500), imageUrl)
        .input("ImageUrls", sql.NVarChar(sql.MAX), imageUrls)
        .input("ThuTu", sql.Int, row.thuTu)
        .execute("sp_DM_CreateDefect");
    return "inserted";
}

async function main() {
    if (!fs.existsSync(workbookPath)) {
        throw new Error(`Không tìm thấy file Excel: ${workbookPath}`);
    }

    const rows = buildRows();
    if (isDryRun) {
        const withImages = rows.filter((row) => row.mediaPath).length;
        console.log(`Dry run: ${rows.length} SXBT L05 defects parsed, ${withImages} rows with images.`);
        console.table(rows.map((row) => ({
            MaLoi: row.maLoi,
            ThuTu: row.thuTu,
            Loai: row.loaiLoi,
            MoTa: row.moTa.slice(0, 60),
            HasImage: Boolean(row.mediaPath)
        })));
        return;
    }

    const pool = await sql.connect(dbConfig);
    let inserted = 0;
    let updated = 0;

    for (const row of rows) {
        const result = await upsertDefect(pool, row);
        if (result === "inserted") inserted += 1;
        if (result === "updated") updated += 1;
    }

    await pool.close();
    console.log(`Imported SXBT defects: ${inserted} inserted, ${updated} updated, ${rows.length} total.`);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
