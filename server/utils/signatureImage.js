const fs = require("fs/promises");
const path = require("path");
const sql = require("mssql");

const signatureDirectory = path.join(__dirname, "..", "private-uploads", "signatures");

const resolveSignaturePath = (storedPath) => {
    const fileName = path.basename(String(storedPath || ""));
    return fileName ? path.join(signatureDirectory, fileName) : null;
};

const readSignatureDataUrl = async (storedPath) => {
    const filePath = resolveSignaturePath(storedPath);
    if (!filePath) return null;
    try {
        const buffer = await fs.readFile(filePath);
        return `data:image/png;base64,${buffer.toString("base64")}`;
    } catch (error) {
        if (error?.code !== "ENOENT") {
            console.warn("Không đọc được ảnh chữ ký:", error.message);
        }
        return null;
    }
};

const loadSignatureDataUrlMap = async (executor, userIds = []) => {
    const ids = [...new Set(
        userIds.map(Number).filter((value) => Number.isInteger(value) && value > 0)
    )];
    if (!ids.length) return new Map();

    const request = new sql.Request(executor);
    const placeholders = ids.map((id, index) => {
        request.input(`SignatureUserId${index}`, sql.Int, id);
        return `@SignatureUserId${index}`;
    });
    const result = await request.query(`
        SELECT Id, SignatureImagePath
        FROM dbo.USERS
        WHERE Id IN (${placeholders.join(",")})
          AND NULLIF(LTRIM(RTRIM(SignatureImagePath)), N'') IS NOT NULL
    `);

    const entries = await Promise.all((result.recordset || []).map(async (row) => [
        Number(row.Id),
        await readSignatureDataUrl(row.SignatureImagePath)
    ]));
    return new Map(entries.filter(([, dataUrl]) => Boolean(dataUrl)));
};

const attachSignatureDataUrls = async (executor, records = [], userIdField = "NguoiXacNhanId") => {
    const source = Array.isArray(records) ? records : [];
    const signatureMap = await loadSignatureDataUrlMap(
        executor,
        source.map((record) => record?.[userIdField])
    );
    return source.map((record) => ({
        ...record,
        SignatureDataUrl: signatureMap.get(Number(record?.[userIdField])) || null
    }));
};

module.exports = {
    signatureDirectory,
    resolveSignaturePath,
    readSignatureDataUrl,
    loadSignatureDataUrlMap,
    attachSignatureDataUrls
};

