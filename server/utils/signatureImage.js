const fs = require("fs/promises");
const path = require("path");
const sql = require("mssql");

const signatureDirectory = path.join(__dirname, "..", "private-uploads", "signatures");

const detectImageMimeType = (buffer) => {
    if (!Buffer.isBuffer(buffer) || !buffer.length) return null;

    const isPng = buffer.length >= 8
        && buffer[0] === 0x89
        && buffer[1] === 0x50
        && buffer[2] === 0x4E
        && buffer[3] === 0x47
        && buffer[4] === 0x0D
        && buffer[5] === 0x0A
        && buffer[6] === 0x1A
        && buffer[7] === 0x0A;
    if (isPng) return "image/png";

    const isJpeg = buffer.length >= 3
        && buffer[0] === 0xFF
        && buffer[1] === 0xD8
        && buffer[2] === 0xFF;
    if (isJpeg) return "image/jpeg";

    return null;
};

const imageBufferToDataUrl = (buffer) => {
    const mimeType = detectImageMimeType(buffer);
    return mimeType ? `data:${mimeType};base64,${buffer.toString("base64")}` : null;
};

const resolveSignaturePath = (storedPath) => {
    const fileName = path.basename(String(storedPath || ""));
    return fileName ? path.join(signatureDirectory, fileName) : null;
};

const readSignatureDataUrl = async (storedPath) => {
    const filePath = resolveSignaturePath(storedPath);
    if (!filePath) return null;
    try {
        const buffer = await fs.readFile(filePath);
        const dataUrl = imageBufferToDataUrl(buffer);
        if (!dataUrl) {
            console.warn("Ảnh chữ ký cục bộ không đúng định dạng PNG/JPEG.");
        }
        return dataUrl;
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
        SELECT Id, Username, SignatureImagePath
        FROM dbo.USERS
        WHERE Id IN (${placeholders.join(",")})
    `);

    const users = result.recordset || [];
    const localEntries = await Promise.all(users.map(async (row) => ({
        userId: Number(row.Id),
        dataUrl: await readSignatureDataUrl(row.SignatureImagePath)
    })));
    const signatureMap = new Map(
        localEntries
            .filter(({ dataUrl }) => Boolean(dataUrl))
            .map(({ userId, dataUrl }) => [userId, dataUrl])
    );

    const unresolvedUserIds = users
        .map((row) => Number(row.Id))
        .filter((userId) => !signatureMap.has(userId));
    if (!unresolvedUserIds.length) return signatureMap;

    try {
        const fallbackRequest = new sql.Request(executor);
        const fallbackPlaceholders = unresolvedUserIds.map((id, index) => {
            fallbackRequest.input(`FallbackSignatureUserId${index}`, sql.Int, id);
            return `@FallbackSignatureUserId${index}`;
        });
        const fallbackResult = await fallbackRequest.query(`
            SELECT
                U.Id AS LocalUserId,
                ExternalSignature.ChuKy
            FROM dbo.USERS AS U
            CROSS APPLY (
                SELECT TOP (1) SignatureSource.ChuKy
                FROM TAG_System.dbo.TaiKhoanDangNhap AS ExternalAccount
                INNER JOIN TAG_System.dbo.TaiKhoanDangNhap_ChuKy AS SignatureSource
                    ON SignatureSource.ID_TaiKhoanDangNhap = ExternalAccount.ID_TaiKhoanDangNhap
                WHERE LOWER(LTRIM(RTRIM(ExternalAccount.TenDangNhap))) COLLATE DATABASE_DEFAULT
                    = LOWER(LTRIM(RTRIM(U.Username))) COLLATE DATABASE_DEFAULT
                  AND SignatureSource.ChuKy IS NOT NULL
                  AND DATALENGTH(SignatureSource.ChuKy) > 0
                ORDER BY ExternalAccount.ID_TaiKhoanDangNhap DESC
            ) AS ExternalSignature
            WHERE U.Id IN (${fallbackPlaceholders.join(",")})
        `);

        (fallbackResult.recordset || []).forEach((row) => {
            const userId = Number(row.LocalUserId);
            const dataUrl = imageBufferToDataUrl(row.ChuKy);
            if (dataUrl && !signatureMap.has(userId)) {
                signatureMap.set(userId, dataUrl);
            }
        });
    } catch (error) {
        console.warn("Không tải được chữ ký dự phòng từ TAG_System:", error.message);
    }

    return signatureMap;
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
    detectImageMimeType,
    imageBufferToDataUrl,
    readSignatureDataUrl,
    loadSignatureDataUrlMap,
    attachSignatureDataUrls
};
