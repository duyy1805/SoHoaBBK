const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const sql = require("mssql");
const JSZip = require("jszip");

const { poolPromise } = require("../db");
const authenticateToken = require("../middlewares/auth.middleware");

const router = express.Router();
const attachmentDir = path.join(__dirname, "..", "private-uploads", "bien-ban");
const maxFileSize = 20 * 1024 * 1024;
const maxFilesPerRequest = 10;

fs.mkdirSync(attachmentDir, { recursive: true });

const allowedMimeTypesByExtension = new Map([
    [".jpg", new Set(["image/jpeg"])],
    [".jpeg", new Set(["image/jpeg"])],
    [".png", new Set(["image/png"])],
    [".gif", new Set(["image/gif"])],
    [".webp", new Set(["image/webp"])],
    [".pdf", new Set(["application/pdf"])],
    [".doc", new Set(["application/msword", "application/octet-stream"])],
    [".docx", new Set([
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
        "application/octet-stream"
    ])],
    [".xls", new Set(["application/vnd.ms-excel", "application/octet-stream"])],
    [".xlsx", new Set([
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/zip",
        "application/octet-stream"
    ])],
    [".ppt", new Set(["application/vnd.ms-powerpoint", "application/octet-stream"])],
    [".pptx", new Set([
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/zip",
        "application/octet-stream"
    ])]
]);

const normalizeOriginalName = (value) => {
    const original = path.basename(String(value || "file"));
    const decoded = Buffer.from(original, "latin1").toString("utf8");
    const selected = decoded.includes("\uFFFD") ? original : decoded;
    return selected.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 500) || "file";
};

const isAdmin = (user) => Array.isArray(user?.roles) &&
    user.roles.some((role) => String(role || "").toUpperCase() === "ADMIN");

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, attachmentDir),
    filename: (_req, file, callback) => {
        const extension = path.extname(file.originalname || "").toLowerCase();
        callback(null, `${crypto.randomUUID()}${extension}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: maxFileSize, files: maxFilesPerRequest },
    fileFilter: (_req, file, callback) => {
        const extension = path.extname(file.originalname || "").toLowerCase();
        const allowedMimeTypes = allowedMimeTypesByExtension.get(extension);
        if (!allowedMimeTypes || !allowedMimeTypes.has(String(file.mimetype || "").toLowerCase())) {
            const error = new Error("Định dạng file không được hỗ trợ");
            error.code = "UNSUPPORTED_ATTACHMENT_TYPE";
            return callback(error);
        }
        callback(null, true);
    }
});

const removeFiles = async (files = []) => {
    await Promise.all(files.map(async (file) => {
        if (!file?.path) return;
        try {
            await fs.promises.unlink(file.path);
        } catch (error) {
            if (error.code !== "ENOENT") console.error("Cleanup attachment error:", error);
        }
    }));
};

const startsWithBytes = (buffer, bytes) => bytes.every((byte, index) => buffer[index] === byte);

const validateUploadedFile = async (file) => {
    if (!file?.size) throw new Error("File rỗng không được hỗ trợ");
    const extension = path.extname(file.originalname || "").toLowerCase();
    const buffer = await fs.promises.readFile(file.path);
    let valid = false;

    if ([".docx", ".xlsx", ".pptx"].includes(extension)) {
        try {
            const zip = await JSZip.loadAsync(buffer);
            const requiredEntry = extension === ".docx"
                ? "word/document.xml"
                : extension === ".xlsx"
                    ? "xl/workbook.xml"
                    : "ppt/presentation.xml";
            valid = Boolean(zip.file("[Content_Types].xml") && zip.file(requiredEntry));
        } catch (_) {
            valid = false;
        }
    } else if ([".doc", ".xls", ".ppt"].includes(extension)) {
        valid = startsWithBytes(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    } else if (extension === ".pdf") {
        valid = buffer.subarray(0, 5).toString("ascii") === "%PDF-";
    } else if ([".jpg", ".jpeg"].includes(extension)) {
        valid = startsWithBytes(buffer, [0xff, 0xd8, 0xff]);
    } else if (extension === ".png") {
        valid = startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    } else if (extension === ".gif") {
        valid = ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"));
    } else if (extension === ".webp") {
        valid = buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
            buffer.subarray(8, 12).toString("ascii") === "WEBP";
    }

    if (!valid) {
        throw new Error(`Nội dung file ${normalizeOriginalName(file.originalname)} không khớp định dạng cho phép`);
    }
};

const mapAttachment = (row, user) => ({
    id: row.Id,
    bienBanId: row.BienBanId,
    originalName: row.OriginalName,
    mimeType: row.MimeType,
    sizeBytes: Number(row.SizeBytes),
    uploadedBy: row.UploadedBy,
    uploadedByName: row.UploadedByName || row.UploadedByUsername || "---",
    createdAt: row.CreatedAt,
    downloadUrl: `/bien-ban/${row.BienBanId}/attachments/${row.Id}/download`,
    canDelete: Number(row.UploadedBy) === Number(user?.userId) || isAdmin(user)
});

const ensureBienBanExists = async (pool, bienBanId) => {
    const result = await pool.request()
        .input("BienBanId", sql.Int, bienBanId)
        .query("SELECT TOP 1 Id FROM dbo.BIEN_BAN_KIEM WHERE Id = @BienBanId");
    return Boolean(result.recordset?.[0]);
};

const runUpload = (req, res, next) => {
    upload.array("files", maxFilesPerRequest)(req, res, (error) => {
        if (!error) return next();
        removeFiles(req.files).finally(() => {
            if (error instanceof multer.MulterError) {
                if (error.code === "LIMIT_FILE_SIZE") {
                    return res.status(413).json({ message: "Mỗi file đính kèm không được vượt quá 20 MB" });
                }
                if (["LIMIT_FILE_COUNT", "LIMIT_UNEXPECTED_FILE"].includes(error.code)) {
                    return res.status(400).json({ message: "Mỗi lần chỉ được tải lên tối đa 10 file" });
                }
            }
            const status = error.code === "UNSUPPORTED_ATTACHMENT_TYPE" ? 400 : 500;
            return res.status(status).json({ message: error.message || "Không thể tải file đính kèm" });
        });
    });
};

router.get("/:id/attachments", authenticateToken, async (req, res) => {
    const bienBanId = Number(req.params.id);
    if (!Number.isInteger(bienBanId) || bienBanId <= 0) {
        return res.status(400).json({ message: "Biên bản không hợp lệ" });
    }

    try {
        const pool = await poolPromise;
        if (!await ensureBienBanExists(pool, bienBanId)) {
            return res.status(404).json({ message: "Không tìm thấy biên bản" });
        }
        const result = await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .query(`
                SELECT attachment.Id, attachment.BienBanId, attachment.OriginalName,
                    attachment.MimeType, attachment.SizeBytes, attachment.UploadedBy,
                    attachment.CreatedAt, uploader.FullName AS UploadedByName,
                    uploader.Username AS UploadedByUsername
                FROM dbo.BIEN_BAN_DINH_KEM attachment
                LEFT JOIN dbo.USERS uploader ON uploader.Id = attachment.UploadedBy
                WHERE attachment.BienBanId = @BienBanId
                  AND attachment.IsDeleted = 0
                ORDER BY attachment.CreatedAt DESC, attachment.Id DESC
            `);
        res.json((result.recordset || []).map((row) => mapAttachment(row, req.user)));
    } catch (error) {
        console.error("List attachments error:", error);
        res.status(500).json({ message: "Không tải được danh sách file đính kèm" });
    }
});

router.post("/:id/attachments", authenticateToken, runUpload, async (req, res) => {
    const bienBanId = Number(req.params.id);
    const files = Array.isArray(req.files) ? req.files : [];
    if (!Number.isInteger(bienBanId) || bienBanId <= 0) {
        await removeFiles(files);
        return res.status(400).json({ message: "Biên bản không hợp lệ" });
    }
    if (files.length === 0) {
        return res.status(400).json({ message: "Vui lòng chọn ít nhất một file" });
    }

    let transaction;
    try {
        for (const file of files) await validateUploadedFile(file);
        const pool = await poolPromise;
        if (!await ensureBienBanExists(pool, bienBanId)) {
            await removeFiles(files);
            return res.status(404).json({ message: "Không tìm thấy biên bản" });
        }

        transaction = new sql.Transaction(pool);
        await transaction.begin();
        const inserted = [];
        for (const file of files) {
            const result = await new sql.Request(transaction)
                .input("BienBanId", sql.Int, bienBanId)
                .input("OriginalName", sql.NVarChar(500), normalizeOriginalName(file.originalname))
                .input("StoredName", sql.NVarChar(255), file.filename)
                .input("MimeType", sql.NVarChar(255), file.mimetype)
                .input("SizeBytes", sql.BigInt, file.size)
                .input("UploadedBy", sql.Int, req.user.userId)
                .query(`
                    INSERT INTO dbo.BIEN_BAN_DINH_KEM
                        (BienBanId, OriginalName, StoredName, MimeType, SizeBytes, UploadedBy)
                    OUTPUT INSERTED.Id, INSERTED.BienBanId, INSERTED.OriginalName,
                        INSERTED.MimeType, INSERTED.SizeBytes, INSERTED.UploadedBy,
                        INSERTED.CreatedAt
                    VALUES
                        (@BienBanId, @OriginalName, @StoredName, @MimeType, @SizeBytes, @UploadedBy)
                `);
            inserted.push(result.recordset[0]);
        }
        await transaction.commit();
        transaction = null;
        res.status(201).json(inserted.map((row) => mapAttachment({
            ...row,
            UploadedByName: req.user.fullName,
            UploadedByUsername: req.user.username
        }, req.user)));
    } catch (error) {
        if (transaction) {
            try { await transaction.rollback(); } catch (_) { /* no-op */ }
        }
        await removeFiles(files);
        console.error("Upload attachments error:", error);
        const isValidationError = /^File rỗng|^Nội dung file/.test(error.message || "");
        res.status(isValidationError ? 400 : 500).json({
            message: isValidationError ? error.message : "Không lưu được file đính kèm"
        });
    }
});

router.get("/:id/attachments/:attachmentId/download", authenticateToken, async (req, res) => {
    const bienBanId = Number(req.params.id);
    const attachmentId = Number(req.params.attachmentId);
    if (!Number.isInteger(bienBanId) || !Number.isInteger(attachmentId)) {
        return res.status(400).json({ message: "File đính kèm không hợp lệ" });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .input("AttachmentId", sql.Int, attachmentId)
            .query(`
                SELECT TOP 1 Id, OriginalName, StoredName, MimeType
                FROM dbo.BIEN_BAN_DINH_KEM
                WHERE Id = @AttachmentId AND BienBanId = @BienBanId AND IsDeleted = 0
            `);
        const attachment = result.recordset?.[0];
        if (!attachment) return res.status(404).json({ message: "Không tìm thấy file đính kèm" });
        if (path.basename(attachment.StoredName) !== attachment.StoredName) {
            return res.status(409).json({ message: "Đường dẫn file đính kèm không hợp lệ" });
        }

        const absolutePath = path.join(attachmentDir, attachment.StoredName);
        try {
            await fs.promises.access(absolutePath, fs.constants.R_OK);
        } catch (_) {
            return res.status(404).json({ message: "File vật lý không còn tồn tại" });
        }

        res.setHeader("X-Content-Type-Options", "nosniff");
        res.type(attachment.MimeType);
        res.download(absolutePath, attachment.OriginalName, (error) => {
            if (error && !res.headersSent) {
                console.error("Download attachment error:", error);
                res.status(500).json({ message: "Không tải được file đính kèm" });
            }
        });
    } catch (error) {
        console.error("Download attachment error:", error);
        res.status(500).json({ message: "Không tải được file đính kèm" });
    }
});

router.delete("/:id/attachments/:attachmentId", authenticateToken, async (req, res) => {
    const bienBanId = Number(req.params.id);
    const attachmentId = Number(req.params.attachmentId);
    if (!Number.isInteger(bienBanId) || !Number.isInteger(attachmentId)) {
        return res.status(400).json({ message: "File đính kèm không hợp lệ" });
    }

    try {
        const pool = await poolPromise;
        const current = await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .input("AttachmentId", sql.Int, attachmentId)
            .query(`
                SELECT TOP 1 Id, StoredName, UploadedBy
                FROM dbo.BIEN_BAN_DINH_KEM
                WHERE Id = @AttachmentId AND BienBanId = @BienBanId AND IsDeleted = 0
            `);
        const attachment = current.recordset?.[0];
        if (!attachment) return res.status(404).json({ message: "Không tìm thấy file đính kèm" });
        if (Number(attachment.UploadedBy) !== Number(req.user.userId) && !isAdmin(req.user)) {
            return res.status(403).json({ message: "Chỉ người tải lên hoặc Admin được xóa file" });
        }

        await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .input("AttachmentId", sql.Int, attachmentId)
            .input("DeletedBy", sql.Int, req.user.userId)
            .query(`
                UPDATE dbo.BIEN_BAN_DINH_KEM
                SET IsDeleted = 1, DeletedBy = @DeletedBy, DeletedAt = SYSDATETIME()
                WHERE Id = @AttachmentId AND BienBanId = @BienBanId AND IsDeleted = 0
            `);

        if (path.basename(attachment.StoredName) === attachment.StoredName) {
            try {
                await fs.promises.unlink(path.join(attachmentDir, attachment.StoredName));
            } catch (error) {
                if (error.code !== "ENOENT") console.error("Delete attachment file error:", error);
            }
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Delete attachment error:", error);
        res.status(500).json({ message: "Không xóa được file đính kèm" });
    }
});

module.exports = router;
