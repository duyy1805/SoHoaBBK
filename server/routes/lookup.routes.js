const express = require('express');
const router = express.Router();
const sql = require('mssql');
const multer = require('multer');
const XLSX = require('xlsx');
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
sharp.cache(false);

const { poolPromise } = require('../db');
const authenticateToken = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith(".xlsx")) {
      return cb(new Error("Chỉ hỗ trợ file .xlsx"));
    }
    cb(null, true);
  }
});

const defectExcelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith(".xlsx")) {
      return cb(new Error("Chỉ hỗ trợ file .xlsx"));
    }
    cb(null, true);
  }
});

const defectImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\//i.test(file.mimetype)) {
      return cb(new Error("Chỉ hỗ trợ file ảnh"));
    }
    cb(null, true);
  }
});

const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\//i.test(file.mimetype)) {
      return cb(new Error("Chỉ hỗ trợ file ảnh"));
    }
    cb(null, true);
  }
});

const defectUploadDir = path.join(__dirname, "..", "uploads", "defects");
const publicDefectUploadDir = "/uploads/defects";
const defectImportUploadDir = path.join(defectUploadDir, "import");
const publicDefectImportUploadDir = `${publicDefectUploadDir}/import`;
const productUploadDir = path.join(__dirname, "..", "uploads", "products");
const publicProductUploadDir = "/uploads/products";
const defectImportHeaders = [
  "MaLoi",
  "TenLoi",
  "DefectType",
  "LoaiLoiSXBT",
  "PhanHe",
  "MaNhomLoi",
  "TenSanPham",
  "ChungLoai",
  "MoTa",
  "GhiChu",
  "PhuongAnXuLy",
  "PhamViApDung",
  "ThiTruong",
  "ThuTu",
  "TrangThai",
  "Anh"
];
const requiredDefectImportHeaders = ["MaLoi", "TenLoi"];

const slugifyFilePart = (value) => {
  const normalized = String(value || "defect")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "defect";
};

const normalizeDefectType = (loaiLoiSXBT, defectType) => {
  const loai = String(loaiLoiSXBT || "").trim().toUpperCase();
  const type = String(defectType || "").trim().toUpperCase();

  if (loai === "C") return "CRITICAL";
  if (loai === "B" && type === "CRITICAL") return "MAJOR";
  return type || "MAJOR";
};

const trimValue = (value) => String(value ?? "").trim();
const normalizeKey = (value) => trimValue(value).toLowerCase();
const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed].filter(Boolean);
  } catch {
    return [value].filter(Boolean);
  }
};
const normalizeImageUrls = (imageUrls, imageUrl) => {
  const urls = [
    ...parseJsonArray(imageUrls),
    ...parseJsonArray(imageUrl)
  ]
    .map((url) => trimValue(url))
    .filter(Boolean);

  return Array.from(new Set(urls));
};
const stringifyImageUrls = (urls) => {
  const normalized = normalizeImageUrls(urls);
  return normalized.length ? JSON.stringify(normalized) : null;
};
const buildNhomImportKey = (tenNhom, moTaNhom) => `${normalizeKey(tenNhom)}|${normalizeKey(moTaNhom)}`;
const parseOrder = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const parseOptionalOrder = (value) => {
  if (trimValue(value) === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
const parseProductCodesFromFileName = (fileName) => {
  const parsed = path.parse(fileName || "");
  const baseName = String(parsed.name || "").trim();
  if (!baseName) return [];

  return Array.from(new Set(
    baseName
      .split(/[,\;\+\|&]+/)
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  ));
};
const isManagedProductImageUrl = (imageUrl) =>
  typeof imageUrl === "string" && imageUrl.startsWith(`${publicProductUploadDir}/`);
const getProductImageFilePath = (imageUrl) => {
  if (!isManagedProductImageUrl(imageUrl)) return null;
  const relativePath = imageUrl.slice(publicProductUploadDir.length + 1);
  if (!relativePath) return null;
  return path.join(productUploadDir, relativePath);
};
const cleanupUnusedProductImage = async (pool, imageUrl) => {
  if (!isManagedProductImageUrl(imageUrl)) return;

  const usageRes = await pool.request()
    .input("ImageUrl", sql.NVarChar(500), imageUrl)
    .query(`
      SELECT COUNT(*) AS UsageCount
      FROM DM_SAN_PHAM
      WHERE ImageUrl = @ImageUrl
        AND TrangThai = 1
    `);

  const usageCount = Number(usageRes.recordset?.[0]?.UsageCount || 0);
  if (usageCount > 0) return;

  const filePath = getProductImageFilePath(imageUrl);
  if (!filePath) return;

  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    if (err?.code !== "ENOENT") {
      console.warn("Cleanup unused product image failed:", imageUrl, err.message);
    }
  }
};
const decodeXml = (value = "") => value
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'");
const getXmlAttr = (xml, name) => {
  const match = xml.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match ? decodeXml(match[1]) : "";
};
const normalizeZipTarget = (baseDir, target) => {
  const normalized = target.startsWith("/")
    ? path.posix.normalize(target)
    : path.posix.normalize(path.posix.join(baseDir, target));
  return normalized.replace(/^\/+/, "");
};
const parseZipRelationships = (xml, baseDir) => {
  const rels = {};
  for (const match of xml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = getXmlAttr(match[0], "Id");
    const target = getXmlAttr(match[0], "Target");
    if (id && target) rels[id] = normalizeZipTarget(baseDir, target);
  }
  return rels;
};
const getCellText = (worksheet, rowIndex, colIndex) => {
  const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })];
  if (!cell) return "";
  if (cell.w != null) return trimValue(cell.w);
  return trimValue(cell.v);
};
const parseImportStatus = (value, fallback = true) => {
  const normalized = trimValue(value).toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "y", "hoạt động", "hoat dong", "active"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "tạm ngưng", "tam ngung", "inactive"].includes(normalized)) return false;
  return null;
};

async function zipText(zip, entry) {
  const file = zip.file(entry);
  return file ? file.async("string") : "";
}

async function zipBuffer(zip, entry) {
  const file = zip.file(entry);
  return file ? file.async("nodebuffer") : null;
}

async function getSheetPathFromZip(zip, sheetName) {
  const workbookXml = await zipText(zip, "xl/workbook.xml");
  const workbookRelsXml = await zipText(zip, "xl/_rels/workbook.xml.rels");
  const workbookRels = parseZipRelationships(workbookRelsXml, "xl");

  for (const match of workbookXml.matchAll(/<sheet\b[^>]*>/g)) {
    if (getXmlAttr(match[0], "name") !== sheetName) continue;
    return workbookRels[getXmlAttr(match[0], "r:id")] || null;
  }

  return null;
}

async function getSheetDrawingPathFromZip(zip, sheetPath) {
  const sheetXml = await zipText(zip, sheetPath);
  const drawingMatch = sheetXml.match(/<drawing\b[^>]*r:id="([^"]+)"[^>]*\/>/);
  if (!drawingMatch) return null;

  const relPath = `${path.posix.dirname(sheetPath)}/_rels/${path.posix.basename(sheetPath)}.rels`;
  const sheetRelsXml = await zipText(zip, relPath);
  const sheetRels = parseZipRelationships(sheetRelsXml, path.posix.dirname(sheetPath));
  return sheetRels[drawingMatch[1]] || null;
}

async function extractImagesByRowAndColumn(workbookBuffer, sheetName) {
  const zip = await JSZip.loadAsync(workbookBuffer);
  const sheetPath = await getSheetPathFromZip(zip, sheetName);
  if (!sheetPath) return new Map();

  const drawingPath = await getSheetDrawingPathFromZip(zip, sheetPath);
  if (!drawingPath) return new Map();

  const drawingXml = await zipText(zip, drawingPath);
  const drawingRelsPath = `${path.posix.dirname(drawingPath)}/_rels/${path.posix.basename(drawingPath)}.rels`;
  const drawingRels = parseZipRelationships(
    await zipText(zip, drawingRelsPath),
    path.posix.dirname(drawingPath)
  );
  const images = new Map();

  for (const anchor of drawingXml.matchAll(/<xdr:(?:twoCellAnchor|oneCellAnchor|absoluteAnchor)\b[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor|absoluteAnchor)>/g)) {
    const xml = anchor[0];
    const rowMatch = xml.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>[\s\S]*?<\/xdr:from>/);
    const colMatch = xml.match(/<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>[\s\S]*?<\/xdr:from>/);
    const embedMatch = xml.match(/r:embed="([^"]+)"/);
    if (!rowMatch || !colMatch || !embedMatch) continue;

    const mediaPath = drawingRels[embedMatch[1]];
    if (!mediaPath) continue;

    const buffer = await zipBuffer(zip, mediaPath);
    if (!buffer) continue;

    const rowIndex = Number(rowMatch[1]);
    const colIndex = Number(colMatch[1]);
    const key = `${rowIndex}:${colIndex}`;
    if (!images.has(key)) images.set(key, []);
    images.get(key).push({ mediaPath, buffer });
  }

  return images;
}

function parseDefectImportRows(workbook, imagesByCell) {
  const sheet = workbook.Sheets.DanhMucLoi;
  if (!sheet) {
    return {
      rows: [],
      errors: [{ line: 1, message: "Không tìm thấy sheet DanhMucLoi" }]
    };
  }

  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
  const headers = new Map();
  for (let col = range.s.c; col <= range.e.c; col += 1) {
    const value = getCellText(sheet, range.s.r, col);
    if (value) headers.set(value, col);
  }

  const missingHeaders = requiredDefectImportHeaders.filter((header) => !headers.has(header));
  if (missingHeaders.length) {
    return {
      rows: [],
      errors: missingHeaders.map((header) => ({
        line: 1,
        message: `Thiếu cột bắt buộc ${header}`
      }))
    };
  }

  const imageColumn = headers.get("Anh");
  const rows = [];
  for (let rowIndex = range.s.r + 1; rowIndex <= range.e.r; rowIndex += 1) {
    const values = {};
    defectImportHeaders.forEach((header) => {
      const colIndex = headers.get(header);
      values[header] = colIndex == null ? "" : getCellText(sheet, rowIndex, colIndex);
    });

    const image = imageColumn == null
      ? null
      : imagesByCell.get(`${rowIndex}:${imageColumn}`)?.[0] || null;

    const hasValue = defectImportHeaders
      .filter((header) => header !== "Anh")
      .some((header) => trimValue(values[header]) !== "");

    if (!hasValue && !image) continue;

    rows.push({
      line: rowIndex + 1,
      MaLoi: trimValue(values.MaLoi),
      TenLoi: trimValue(values.TenLoi),
      DefectType: trimValue(values.DefectType).toUpperCase(),
      LoaiLoiSXBT: trimValue(values.LoaiLoiSXBT).toUpperCase(),
      PhanHe: trimValue(values.PhanHe),
      MaNhomLoi: trimValue(values.MaNhomLoi),
      TenSanPham: trimValue(values.TenSanPham),
      ChungLoai: trimValue(values.ChungLoai),
      MoTa: trimValue(values.MoTa),
      GhiChu: trimValue(values.GhiChu),
      PhuongAnXuLy: trimValue(values.PhuongAnXuLy),
      PhamViApDung: trimValue(values.PhamViApDung),
      ThiTruong: trimValue(values.ThiTruong),
      ThuTu: values.ThuTu,
      TrangThai: values.TrangThai,
      image
    });
  }

  return { rows, errors: [] };
}

async function buildDefectImportImages(rows) {
  const prepared = new Map();
  const errors = [];

  for (const row of rows) {
    if (!row.image) continue;
    try {
      const imageBuffer = await sharp(row.image.buffer)
        .rotate()
        .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();
      prepared.set(row.line, imageBuffer);
    } catch (err) {
      errors.push({ line: row.line, message: "Ảnh nhúng không hợp lệ hoặc không đọc được" });
    }
  }

  return { prepared, errors };
}

const normalizeImportRow = (row, index) => ({
  line: index + 2,
  MaSanPham: trimValue(row.MaSanPham),
  TenNhom: trimValue(row.TenNhom),
  MoTaNhom: trimValue(row.MoTaNhom),
  ThuTuNhom: row.ThuTuNhom,
  TenMucKiem: trimValue(row.TenMucKiem),
  ThamChieu: trimValue(row.ThamChieu),
  PhuongPhapKiem: trimValue(row.PhuongPhapKiem),
  TieuChuan: trimValue(row.TieuChuan),
  ThuTuMuc: row.ThuTuMuc,
  ThuTuGanNhom: row.ThuTuGanNhom,
  DiemTrongYeuRaw: trimValue(row.DiemTrongYeu)
});

const parseOptionalDiemTrongYeu = (rawValue) => {
  const normalized = normalizeKey(rawValue);
  if (!normalized) return { valid: true, value: null };
  if (["có", "co", "true", "1"].includes(normalized)) return { valid: true, value: true };
  if (["không", "khong", "false", "0"].includes(normalized)) return { valid: true, value: false };
  return { valid: false, value: null };
};

const normalizeThongSoImportRow = (row, index) => ({
  line: index + 2,
  MaSanPham: trimValue(row.MaSanPham),
  NhomThongSo: trimValue(row.NhomThongSo),
  TenThongSo: trimValue(row.TenThongSo),
  GiaTriChuan: trimValue(row.GiaTriChuan),
  DungSaiAm: row.DungSaiAm,
  DungSaiDuong: row.DungSaiDuong,
  DonVi: trimValue(row.DonVi),
  ThuTu: row.ThuTu
});

const requestWithTransaction = (transaction) => new sql.Request(transaction);

async function getAllSanPham(pool) {
  const pageSize = 500;
  let page = 0;
  let items = [];

  while (true) {
    const result = await pool.request()
      .input("Page", page)
      .input("PageSize", pageSize)
      .input("Keyword", null)
      .execute("sp_DM_GetSanPhamList");

    const rows = result.recordsets?.[0] || [];
    items = items.concat(rows);

    if (rows.length < pageSize) break;
    page += 1;
  }

  return items;
}

async function getNhomKiemListInTransaction(transaction) {
  const result = await requestWithTransaction(transaction)
    .execute("sp_DM_GetNhomKiemList");
  return result.recordset || [];
}

async function getCheckItemsInTransaction(transaction, nhomKiemId) {
  const result = await requestWithTransaction(transaction)
    .input("NhomKiemId", sql.Int, nhomKiemId)
    .execute("sp_DM_GetCheckItemList");
  return result.recordset || [];
}

async function getSanPhamNhomKiemInTransaction(transaction, sanPhamId) {
  const result = await requestWithTransaction(transaction)
    .input("SanPhamId", sql.Int, sanPhamId)
    .execute("sp_SANPHAM_GetNhomKiemBySanPham");
  return result.recordset || [];
}

async function getThongSoInTransaction(transaction, sanPhamId) {
  const result = await requestWithTransaction(transaction)
    .input("SanPhamId", sql.Int, sanPhamId)
    .execute("sp_DM_SanPhamThongSo_Get");
  return result.recordset || [];
}

router.get('/loai-kiem', authenticateToken, async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .execute("sp_DM_GetLoaiKiem");

    res.json(result.recordset);

  } catch (err) {
    console.error("Loai kiem error:", err);
    res.status(500).json({ message: "Không lấy được loại kiểm" });
  }
});

router.get(
  "/defect-list",
  authenticateToken,
  async (req, res) => {
    const { defectType, phanHe } = req.query;
    const phanHeFilter = phanHe || "ALL";

    try {
      const pool = await poolPromise;

      const result = await pool.request()
        .input(
          "DefectType",
          sql.NVarChar(20),
          defectType || null
        )
        .input(
          "PhanHe",
          sql.NVarChar(20),
          phanHeFilter
        )
        .execute("sp_DM_GetDefectList");

      const rows = result.recordset || [];
      const ids = rows
        .map((row) => Number(row.Id))
        .filter((id) => Number.isInteger(id) && id > 0);

      if (ids.length) {
        try {
          const imageResult = await pool.request().query(`
            SELECT Id, ImageUrls
            FROM dbo.DM_DEFECT
            WHERE Id IN (${ids.join(",")})
          `);
          const imageUrlsById = new Map(
            (imageResult.recordset || []).map((row) => [row.Id, row.ImageUrls])
          );

          rows.forEach((row) => {
            if (imageUrlsById.has(row.Id)) {
              row.ImageUrls = imageUrlsById.get(row.Id);
            }
          });
        } catch (imageErr) {
          console.warn("Cannot attach defect ImageUrls:", imageErr.message);
        }
      }

      res.json(rows);
    } catch (err) {
      console.error("Get defect list error:", err);
      res.status(500).json({
        message: "Không lấy được danh mục lỗi"
      });
    }
  }
);

router.post(
  "/defect-image",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  defectImageUpload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Vui lòng chọn ảnh lỗi" });
      }

      fs.mkdirSync(defectUploadDir, { recursive: true });

      const baseName = slugifyFilePart(req.body.maLoi || req.body.tenLoi || "defect");
      const fileName = `${baseName}-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
      const outputPath = path.join(defectUploadDir, fileName);

      await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toFile(outputPath);

      res.json({
        success: true,
        imageUrl: `${publicDefectUploadDir}/${fileName}`
      });
    } catch (err) {
      console.error("Upload defect image error:", err);
      res.status(500).json({ message: "Không thể tải ảnh lỗi lên server" });
    }
  }
);

router.post(
  "/defect-images",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  defectImageUpload.array("images", 10),
  async (req, res) => {
    try {
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ message: "Vui lòng chọn ảnh lỗi" });
      }

      fs.mkdirSync(defectUploadDir, { recursive: true });

      const imageUrls = [];
      const savedFiles = [];
      const baseName = slugifyFilePart(req.body.maLoi || req.body.tenLoi || "defect");

      try {
        for (const file of files) {
          const fileName = `${baseName}-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
          const outputPath = path.join(defectUploadDir, fileName);

          await sharp(file.buffer)
            .rotate()
            .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 82 })
            .toFile(outputPath);

          savedFiles.push(outputPath);
          imageUrls.push(`${publicDefectUploadDir}/${fileName}`);
        }
      } catch (err) {
        savedFiles.forEach((filePath) => {
          try {
            fs.unlinkSync(filePath);
          } catch (unlinkErr) {
            console.warn("Cannot cleanup uploaded defect image:", unlinkErr.message);
          }
        });
        throw err;
      }

      res.json({
        success: true,
        imageUrls
      });
    } catch (err) {
      console.error("Upload defect images error:", err);
      res.status(500).json({ message: "Không thể tải ảnh lỗi lên server" });
    }
  }
);

router.get(
  "/import-defect/template",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {
    const rows = [
      {
        MaLoi: "LOI-001",
        TenLoi: "Đường may không đều",
        DefectType: "MAJOR",
        LoaiLoiSXBT: "B",
        PhanHe: "KCS",
        MaNhomLoi: "L01",
        TenSanPham: "Balo mẫu",
        ChungLoai: "Balo",
        MoTa: "Đường may lệch hoặc không đều so với mẫu chuẩn",
        GhiChu: "",
        PhuongAnXuLy: "Sửa lại hoặc loại bỏ nếu không đạt tiêu chuẩn",
        PhamViApDung: "Kiểm ngoại quan",
        ThiTruong: "Nội địa",
        ThuTu: 1,
        TrangThai: 1,
        Anh: ""
      },
      {
        MaLoi: "LOI-002",
        TenLoi: "Bề mặt vải bẩn",
        DefectType: "MINOR",
        LoaiLoiSXBT: "B",
        PhanHe: "KCS",
        MaNhomLoi: "L02",
        TenSanPham: "Lều mẫu",
        ChungLoai: "Lều",
        MoTa: "Có vết bẩn nhỏ trên bề mặt vải",
        GhiChu: "Chèn ảnh trực tiếp vào cột Anh nếu cần",
        PhuongAnXuLy: "Vệ sinh lại, nếu không sạch thì phân loại lỗi",
        PhamViApDung: "Kiểm ngoại quan",
        ThiTruong: "Xuất khẩu",
        ThuTu: 2,
        TrangThai: 1,
        Anh: ""
      }
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: defectImportHeaders });

    worksheet["!cols"] = [
      { wch: 16 },
      { wch: 28 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 24 },
      { wch: 18 },
      { wch: 42 },
      { wch: 28 },
      { wch: 34 },
      { wch: 24 },
      { wch: 18 },
      { wch: 10 },
      { wch: 12 },
      { wch: 24 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhMucLoi");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx"
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=\"mau-import-danh-muc-loi.xlsx\""
    );
    res.send(buffer);
  }
);

router.post(
  "/import-defect",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  (req, res, next) => {
    defectExcelUpload.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || "File không hợp lệ" });
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn file .xlsx" });
    }

    let rows = [];

    try {
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      if (!workbook.SheetNames.includes("DanhMucLoi")) {
        return res.status(400).json({
          message: "File phải có sheet tên DanhMucLoi",
          errors: [{ line: 1, message: "Không tìm thấy sheet DanhMucLoi" }]
        });
      }

      const imagesByCell = await extractImagesByRowAndColumn(req.file.buffer, "DanhMucLoi");
      const parsed = parseDefectImportRows(workbook, imagesByCell);
      rows = parsed.rows;

      if (parsed.errors.length) {
        return res.status(400).json({
          message: "File có dữ liệu không hợp lệ",
          errors: parsed.errors
        });
      }
    } catch (err) {
      console.error("Parse import defect error:", err);
      return res.status(400).json({ message: "Không đọc được file Excel" });
    }

    if (!rows.length) {
      return res.status(400).json({
        message: "File không có dữ liệu",
        errors: [{ line: 1, message: "File không có dòng dữ liệu để import" }]
      });
    }

    const errors = [];
    const maLoiInFile = new Set();
    rows.forEach((row) => {
      if (!row.MaLoi) {
        errors.push({ line: row.line, message: "Thiếu MaLoi" });
      } else if (maLoiInFile.has(normalizeKey(row.MaLoi))) {
        errors.push({ line: row.line, message: `MaLoi bị trùng trong file: ${row.MaLoi}` });
      } else {
        maLoiInFile.add(normalizeKey(row.MaLoi));
      }

      if (!row.TenLoi) {
        errors.push({ line: row.line, message: "Thiếu TenLoi" });
      }

      if (row.DefectType && !["CRITICAL", "MAJOR", "MINOR"].includes(row.DefectType)) {
        errors.push({ line: row.line, message: "DefectType chỉ nhận CRITICAL, MAJOR hoặc MINOR" });
      }

      if (trimValue(row.ThuTu) !== "" && parseOptionalOrder(row.ThuTu) == null) {
        errors.push({ line: row.line, message: "ThuTu phải là số nguyên dương" });
      }

      if (parseImportStatus(row.TrangThai, true) == null) {
        errors.push({ line: row.line, message: "TrangThai chỉ nhận 1/0, true/false, Hoạt động/Tạm ngưng" });
      }
    });

    const imageResult = await buildDefectImportImages(rows);
    errors.push(...imageResult.errors);

    if (errors.length) {
      return res.status(400).json({
        message: "File có dữ liệu không hợp lệ",
        errors
      });
    }

    const savedFiles = [];

    try {
      const pool = await poolPromise;
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      const summary = {
        totalRows: rows.length,
        created: 0,
        updated: 0,
        withImages: imageResult.prepared.size,
        skippedImages: 0
      };

      try {
        fs.mkdirSync(defectImportUploadDir, { recursive: true });

        for (const row of rows) {
          const existingResult = await requestWithTransaction(transaction)
            .input("MaLoi", sql.NVarChar(50), row.MaLoi)
            .query("SELECT Id, ImageUrl, ImageUrls, TrangThai FROM dbo.DM_DEFECT WHERE MaLoi = @MaLoi");
          const existing = existingResult.recordset?.[0] || null;

          let imageUrl = existing?.ImageUrl || null;
          let imageUrls = normalizeImageUrls(existing?.ImageUrls, existing?.ImageUrl);
          const imageBuffer = imageResult.prepared.get(row.line);
          if (imageBuffer) {
            const fileName = `${slugifyFilePart(row.MaLoi)}-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
            const outputPath = path.join(defectImportUploadDir, fileName);
            fs.writeFileSync(outputPath, imageBuffer);
            savedFiles.push(outputPath);
            imageUrl = `${publicDefectImportUploadDir}/${fileName}`;
            imageUrls = [imageUrl];
          }

          const statusFallback = existing
            ? existing.TrangThai !== false && existing.TrangThai !== 0
            : true;
          const trangThai = parseImportStatus(row.TrangThai, statusFallback);
          const normalizedDefectType = normalizeDefectType(row.LoaiLoiSXBT, row.DefectType);
          const thuTu = parseOptionalOrder(row.ThuTu);

          if (existing) {
            await requestWithTransaction(transaction)
              .input("Id", sql.Int, existing.Id)
              .input("TenLoi", sql.NVarChar(255), row.TenLoi)
              .input("DefectType", sql.NVarChar(20), normalizedDefectType)
              .input("TrangThai", sql.Bit, trangThai)
              .input("MoTa", sql.NVarChar(sql.MAX), row.MoTa || row.TenLoi || null)
              .input("GhiChu", sql.NVarChar(sql.MAX), row.GhiChu || null)
              .input("PhuongAnXuLy", sql.NVarChar(sql.MAX), row.PhuongAnXuLy || null)
              .input("MaLoi", sql.NVarChar(50), row.MaLoi)
              .input("PhanHe", sql.NVarChar(20), row.PhanHe || null)
              .input("MaNhomLoi", sql.NVarChar(20), row.MaNhomLoi || null)
              .input("LoaiLoiSXBT", sql.NVarChar(10), row.LoaiLoiSXBT || null)
              .input("TenSanPham", sql.NVarChar(255), row.TenSanPham || null)
              .input("ChungLoai", sql.NVarChar(255), row.ChungLoai || null)
              .input("PhamViApDung", sql.NVarChar(500), row.PhamViApDung || null)
              .input("ThiTruong", sql.NVarChar(255), row.ThiTruong || null)
              .input("ImageUrl", sql.NVarChar(500), imageUrl)
              .input("ImageUrls", sql.NVarChar(sql.MAX), stringifyImageUrls(imageUrls))
              .input("ThuTu", sql.Int, thuTu)
              .execute("sp_DM_UpdateDefect");
            summary.updated += 1;
          } else {
            await requestWithTransaction(transaction)
              .input("TenLoi", sql.NVarChar(255), row.TenLoi)
              .input("DefectType", sql.NVarChar(20), normalizedDefectType)
              .input("MoTa", sql.NVarChar(sql.MAX), row.MoTa || row.TenLoi || null)
              .input("GhiChu", sql.NVarChar(sql.MAX), row.GhiChu || null)
              .input("PhuongAnXuLy", sql.NVarChar(sql.MAX), row.PhuongAnXuLy || null)
              .input("MaLoi", sql.NVarChar(50), row.MaLoi)
              .input("PhanHe", sql.NVarChar(20), row.PhanHe || null)
              .input("MaNhomLoi", sql.NVarChar(20), row.MaNhomLoi || null)
              .input("LoaiLoiSXBT", sql.NVarChar(10), row.LoaiLoiSXBT || null)
              .input("TenSanPham", sql.NVarChar(255), row.TenSanPham || null)
              .input("ChungLoai", sql.NVarChar(255), row.ChungLoai || null)
              .input("PhamViApDung", sql.NVarChar(500), row.PhamViApDung || null)
              .input("ThiTruong", sql.NVarChar(255), row.ThiTruong || null)
              .input("ImageUrl", sql.NVarChar(500), imageUrl)
              .input("ImageUrls", sql.NVarChar(sql.MAX), stringifyImageUrls(imageUrls))
              .input("ThuTu", sql.Int, thuTu)
              .execute("sp_DM_CreateDefect");

            if (!trangThai) {
              const createdResult = await requestWithTransaction(transaction)
                .input("MaLoi", sql.NVarChar(50), row.MaLoi)
                .query("SELECT Id FROM dbo.DM_DEFECT WHERE MaLoi = @MaLoi");
              const created = createdResult.recordset?.[0] || null;

              if (created) {
                await requestWithTransaction(transaction)
                  .input("Id", sql.Int, created.Id)
                  .input("TenLoi", sql.NVarChar(255), row.TenLoi)
                  .input("DefectType", sql.NVarChar(20), normalizedDefectType)
                  .input("TrangThai", sql.Bit, trangThai)
                  .input("MoTa", sql.NVarChar(sql.MAX), row.MoTa || row.TenLoi || null)
                  .input("GhiChu", sql.NVarChar(sql.MAX), row.GhiChu || null)
                  .input("PhuongAnXuLy", sql.NVarChar(sql.MAX), row.PhuongAnXuLy || null)
                  .input("MaLoi", sql.NVarChar(50), row.MaLoi)
                  .input("PhanHe", sql.NVarChar(20), row.PhanHe || null)
                  .input("MaNhomLoi", sql.NVarChar(20), row.MaNhomLoi || null)
                  .input("LoaiLoiSXBT", sql.NVarChar(10), row.LoaiLoiSXBT || null)
                  .input("TenSanPham", sql.NVarChar(255), row.TenSanPham || null)
                  .input("ChungLoai", sql.NVarChar(255), row.ChungLoai || null)
                  .input("PhamViApDung", sql.NVarChar(500), row.PhamViApDung || null)
                  .input("ThiTruong", sql.NVarChar(255), row.ThiTruong || null)
                  .input("ImageUrl", sql.NVarChar(500), imageUrl)
                  .input("ImageUrls", sql.NVarChar(sql.MAX), stringifyImageUrls(imageUrls))
                  .input("ThuTu", sql.Int, thuTu)
                  .execute("sp_DM_UpdateDefect");
              }
            }

            summary.created += 1;
          }
        }

        await transaction.commit();
        return res.json({
          success: true,
          message: "Import danh mục lỗi thành công",
          summary
        });
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } catch (err) {
      savedFiles.forEach((filePath) => {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.warn("Cannot cleanup imported defect image:", unlinkErr.message);
        }
      });
      console.error("Import defect error:", err);
      return res.status(500).json({
        message: "Import danh mục lỗi thất bại",
        error: err.message
      });
    }
  }
);

router.get('/kcs', authenticateToken, async (req, res) => {
  const pool = await poolPromise;
  const result = await pool.request().query(`
      SELECT DISTINCT u.Id, u.FullName
      FROM USERS u
      JOIN USER_ROLE ur ON u.Id = ur.UserId
      JOIN ROLES r ON ur.RoleId = r.Id
      WHERE r.RoleCode = 'KCS' or r.RoleCode = 'TO_TRUONG_KCS'
        AND u.TrangThai = 1
  `);
  res.json(result.recordset);
});

router.post(
  "/defect",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {
    const {
      TenLoi,
      DefectType,
      MoTa,
      GhiChu,
      PhuongAnXuLy,
      MaLoi,
      PhanHe,
      MaNhomLoi,
      LoaiLoiSXBT,
      TenSanPham,
      ChungLoai,
      PhamViApDung,
      ThiTruong,
      ImageUrl,
      ImageUrls,
      ThuTu
    } = req.body;

    try {
      const pool = await poolPromise;
      const normalizedDefectType = normalizeDefectType(LoaiLoiSXBT, DefectType);
      const normalizedImageUrls = normalizeImageUrls(ImageUrls, ImageUrl).slice(0, 10);
      const primaryImageUrl = normalizedImageUrls[0] || null;

      await pool.request()
        .input("TenLoi", sql.NVarChar(255), TenLoi)
        .input("DefectType", sql.NVarChar(20), normalizedDefectType)
        .input("MoTa", sql.NVarChar(sql.MAX), MoTa)
        .input("GhiChu", sql.NVarChar(sql.MAX), GhiChu)
        .input("PhuongAnXuLy", sql.NVarChar(sql.MAX), PhuongAnXuLy || null)
        .input("MaLoi", sql.NVarChar(50), MaLoi || null)
        .input("PhanHe", sql.NVarChar(20), PhanHe || null)
        .input("MaNhomLoi", sql.NVarChar(20), MaNhomLoi || null)
        .input("LoaiLoiSXBT", sql.NVarChar(10), LoaiLoiSXBT || null)
        .input("TenSanPham", sql.NVarChar(255), TenSanPham || null)
        .input("ChungLoai", sql.NVarChar(255), ChungLoai || null)
        .input("PhamViApDung", sql.NVarChar(500), PhamViApDung || null)
        .input("ThiTruong", sql.NVarChar(255), ThiTruong || null)
        .input("ImageUrl", sql.NVarChar(500), primaryImageUrl)
        .input("ImageUrls", sql.NVarChar(sql.MAX), stringifyImageUrls(normalizedImageUrls))
        .input("ThuTu", sql.Int, ThuTu ?? null)
        .execute("sp_DM_CreateDefect");

      res.json({ message: "Tạo lỗi thành công" });

    } catch (err) {
      console.error("Create defect error:", err);
      res.status(500).json({ message: "Tạo lỗi thất bại" });
    }
  }
);

router.put(
  "/defect/:id",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {
    const { id } = req.params;
    const {
      TenLoi,
      DefectType,
      TrangThai,
      MoTa,
      GhiChu,
      PhuongAnXuLy,
      MaLoi,
      PhanHe,
      MaNhomLoi,
      LoaiLoiSXBT,
      TenSanPham,
      ChungLoai,
      PhamViApDung,
      ThiTruong,
      ImageUrl,
      ImageUrls,
      ThuTu
    } = req.body;

    try {
      const pool = await poolPromise;
      const normalizedDefectType = normalizeDefectType(LoaiLoiSXBT, DefectType);
      const normalizedImageUrls = normalizeImageUrls(ImageUrls, ImageUrl).slice(0, 10);
      const primaryImageUrl = normalizedImageUrls[0] || null;

      await pool.request()
        .input("Id", sql.Int, id)
        .input("TenLoi", sql.NVarChar(255), TenLoi)
        .input("DefectType", sql.NVarChar(20), normalizedDefectType)
        .input("TrangThai", sql.Bit, TrangThai)
        .input("MoTa", sql.NVarChar(sql.MAX), MoTa)
        .input("GhiChu", sql.NVarChar(sql.MAX), GhiChu)
        .input("PhuongAnXuLy", sql.NVarChar(sql.MAX), PhuongAnXuLy || null)
        .input("MaLoi", sql.NVarChar(50), MaLoi || null)
        .input("PhanHe", sql.NVarChar(20), PhanHe || null)
        .input("MaNhomLoi", sql.NVarChar(20), MaNhomLoi || null)
        .input("LoaiLoiSXBT", sql.NVarChar(10), LoaiLoiSXBT || null)
        .input("TenSanPham", sql.NVarChar(255), TenSanPham || null)
        .input("ChungLoai", sql.NVarChar(255), ChungLoai || null)
        .input("PhamViApDung", sql.NVarChar(500), PhamViApDung || null)
        .input("ThiTruong", sql.NVarChar(255), ThiTruong || null)
        .input("ImageUrl", sql.NVarChar(500), primaryImageUrl)
        .input("ImageUrls", sql.NVarChar(sql.MAX), stringifyImageUrls(normalizedImageUrls))
        .input("ThuTu", sql.Int, ThuTu ?? null)
        .execute("sp_DM_UpdateDefect");

      res.json({ message: "Cập nhật thành công" });

    } catch (err) {
      console.error("Update defect error:", err);
      res.status(500).json({ message: "Cập nhật thất bại" });
    }
  }
);

router.delete(
  "/defect/:id",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {
    const { id } = req.params;

    try {
      const pool = await poolPromise;

      await pool.request()
        .input("Id", sql.Int, id)
        .execute("sp_DM_DeleteDefect");

      res.json({ message: "Đã xoá" });

    } catch (err) {
      console.error("Delete defect error:", err);
      res.status(500).json({ message: "Xoá thất bại" });
    }
  }
);

router.get(
  "/nhom-kiem",
  authenticateToken,
  async (req, res) => {
    try {
      const pool = await poolPromise;

      const result = await pool.request()
        .execute("sp_DM_GetNhomKiemList");

      res.json(result.recordset);

    } catch (err) {
      console.error("Get nhom kiem error:", err);
      res.status(500).json({ message: "Không lấy được nhóm kiểm" });
    }
  }
);

router.post(
  "/nhom-kiem",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {
    const { TenNhom, MoTa, ThuTu } = req.body;

    try {
      const pool = await poolPromise;

      await pool.request()
        .input("TenNhom", sql.NVarChar(255), TenNhom)
        .input("MoTa", sql.NVarChar(sql.MAX), MoTa)
        .input("ThuTu", sql.Int, ThuTu)
        .execute("sp_DM_CreateNhomKiem");

      res.json({ message: "Tạo nhóm kiểm thành công" });

    } catch (err) {
      console.error("Create nhom kiem error:", err);
      res.status(500).json({ message: "Tạo thất bại" });
    }
  }
);

router.put(
  "/nhom-kiem/:id",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {
    const { id } = req.params;
    const { TenNhom, MoTa, ThuTu, TrangThai } = req.body;

    try {
      const pool = await poolPromise;

      await pool.request()
        .input("Id", sql.Int, id)
        .input("TenNhom", sql.NVarChar(255), TenNhom)
        .input("MoTa", sql.NVarChar(sql.MAX), MoTa)
        .input("ThuTu", sql.Int, ThuTu)
        .input("TrangThai", sql.Bit, TrangThai)
        .execute("sp_DM_UpdateNhomKiem");

      res.json({ message: "Cập nhật thành công" });

    } catch (err) {
      console.error("Update nhom kiem error:", err);
      res.status(500).json({ message: "Cập nhật thất bại" });
    }
  }
);

router.delete(
  "/nhom-kiem/:id",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {
    const { id } = req.params;

    try {
      const pool = await poolPromise;

      await pool.request()
        .input("Id", sql.Int, id)
        .execute("sp_DM_DeleteNhomKiem");

      res.json({ message: "Đã xoá nhóm kiểm" });

    } catch (err) {
      console.error("Delete nhom kiem error:", err);
      res.status(500).json({ message: "Xoá thất bại" });
    }
  }
);

router.get(
  "/check-item",
  authenticateToken,
  async (req, res) => {
    const { nhomKiemId } = req.query;

    try {
      const pool = await poolPromise;

      const result = await pool.request()
        .input("NhomKiemId", sql.Int, nhomKiemId || null)
        .execute("sp_DM_GetCheckItemList");

      res.json(result.recordset);

    } catch (err) {
      console.error("Get check item error:", err);
      res.status(500).json({ message: "Không lấy được mục kiểm" });
    }
  }
);

router.post(
  "/check-item",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {
    const { NhomKiemId, TenMucKiem, ThamChieu, PhuongPhapKiem, TieuChuan, ThuTu, DiemTrongYeu } = req.body;

    try {
      const pool = await poolPromise;

      await pool.request()
        .input("NhomKiemId", sql.Int, NhomKiemId)
        .input("TenMucKiem", sql.NVarChar(255), TenMucKiem)
        .input("ThamChieu", sql.NVarChar(sql.MAX), ThamChieu)
        .input("PhuongPhapKiem", sql.NVarChar(sql.MAX), PhuongPhapKiem)
        .input("TieuChuan", sql.NVarChar(sql.MAX), TieuChuan)
        .input("ThuTu", sql.Int, ThuTu)
        .input("DiemTrongYeu", sql.Bit, DiemTrongYeu === true)
        .execute("sp_DM_CreateCheckItem");

      res.json({ message: "Tạo mục kiểm thành công" });

    } catch (err) {
      console.error("Create check item error:", err);
      res.status(500).json({ message: "Tạo thất bại" });
    }
  }
);

router.put(
  "/check-item/:id",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {
    const { id } = req.params;
    const { TenMucKiem, ThamChieu, PhuongPhapKiem, TieuChuan, ThuTu, TrangThai, DiemTrongYeu } = req.body;

    try {
      const pool = await poolPromise;
      let diemTrongYeu = DiemTrongYeu;
      if (typeof diemTrongYeu !== "boolean") {
        const current = await pool.request()
          .input("Id", sql.Int, id)
          .query("SELECT DiemTrongYeu FROM dbo.DM_CHECK_ITEM WHERE Id = @Id");
        diemTrongYeu = current.recordset?.[0]?.DiemTrongYeu === true;
      }

      await pool.request()
        .input("Id", sql.Int, id)
        .input("TenMucKiem", sql.NVarChar(255), TenMucKiem)
        .input("ThamChieu", sql.NVarChar(sql.MAX), ThamChieu)
        .input("PhuongPhapKiem", sql.NVarChar(sql.MAX), PhuongPhapKiem)
        .input("TieuChuan", sql.NVarChar(sql.MAX), TieuChuan)
        .input("ThuTu", sql.Int, ThuTu)
        .input("TrangThai", sql.Bit, TrangThai)
        .input("DiemTrongYeu", sql.Bit, diemTrongYeu)
        .execute("sp_DM_UpdateCheckItem");

      res.json({ message: "Cập nhật thành công" });

    } catch (err) {
      console.error("Update check item error:", err);
      res.status(500).json({ message: "Cập nhật thất bại" });
    }
  }
);

router.delete(
  "/check-item/:id",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {
    const { id } = req.params;

    try {
      const pool = await poolPromise;

      await pool.request()
        .input("Id", sql.Int, id)
        .execute("sp_DM_DeleteCheckItem");

      res.json({ message: "Đã xoá mục kiểm" });

    } catch (err) {
      console.error("Delete check item error:", err);
      res.status(500).json({ message: "Xoá thất bại" });
    }
  }
);

router.get(
  "/san-pham",
  authenticateToken,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 0;
      const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100);
      const keyword = req.query.keyword || null;

      const pool = await poolPromise;

      const result = await pool.request()
        .input("Page", page)
        .input("PageSize", pageSize)
        .input("Keyword", keyword)
        .execute("sp_DM_GetSanPhamList");

      res.json({
        data: result.recordsets[0],
        total: result.recordsets[1][0].Total
      });

    } catch (err) {
      console.error("Get san pham error:", err);
      res.status(500).json({
        message: "Không lấy được danh sách sản phẩm"
      });
    }
  }
);

router.post(
  "/san-pham-image",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  productImageUpload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Vui lòng chọn ảnh sản phẩm" });
      }

      fs.mkdirSync(productUploadDir, { recursive: true });

      const baseName = slugifyFilePart(req.body.maSanPham || req.body.tenSanPham || "san-pham");
      const fileName = `${baseName}-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
      const outputPath = path.join(productUploadDir, fileName);

      await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 84 })
        .toFile(outputPath);

      res.json({
        success: true,
        imageUrl: `${publicProductUploadDir}/${fileName}`
      });
    } catch (err) {
      console.error("Upload product image error:", err);
      res.status(500).json({ message: "Không thể tải ảnh sản phẩm lên server" });
    }
  }
);

router.post(
  "/san-pham-images/import",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  productImageUpload.array("images", 500),
  async (req, res) => {
    const khachHang = String(req.body?.KhachHang || "").trim() || null;

    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "Vui lòng chọn ít nhất một ảnh sản phẩm" });
      }

      fs.mkdirSync(productUploadDir, { recursive: true });

      const pool = await poolPromise;
      const summary = {
        totalFiles: req.files.length,
        matched: 0,
        updated: 0,
        skipped: 0,
        errors: []
      };

      for (const file of req.files) {
        const maSanPhams = parseProductCodesFromFileName(file.originalname);

        if (maSanPhams.length === 0) {
          summary.skipped += 1;
          summary.errors.push({ fileName: file.originalname, message: "Không đọc được item code từ tên file" });
          continue;
        }

        const sanPhamRes = await pool.request()
          .input("MaSanPhams", sql.NVarChar(sql.MAX), maSanPhams.join(","))
          .query(`
            SELECT Id, MaSanPham, ImageUrl
            FROM DM_SAN_PHAM
            WHERE MaSanPham IN (
              SELECT LTRIM(RTRIM(value))
              FROM STRING_SPLIT(@MaSanPhams, ',')
            )
              AND TrangThai = 1
          `);

        const sanPhams = sanPhamRes.recordset || [];
        if (sanPhams.length === 0) {
          summary.skipped += 1;
          summary.errors.push({
            fileName: file.originalname,
            maSanPham: maSanPhams.join(", "),
            message: "Không tìm thấy sản phẩm theo item code"
          });
          continue;
        }

        const foundCodes = new Set(sanPhams.map((item) => String(item.MaSanPham).trim()));
        const missingCodes = maSanPhams.filter((code) => !foundCodes.has(code));
        if (missingCodes.length > 0) {
          summary.errors.push({
            fileName: file.originalname,
            maSanPham: missingCodes.join(", "),
            message: "Không tìm thấy một số item code trong tên file"
          });
        }

        summary.matched += sanPhams.length;

        try {
          const primaryCode = sanPhams[0]?.MaSanPham || maSanPhams[0];
          const fileName = `${slugifyFilePart(primaryCode)}-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
          const outputPath = path.join(productUploadDir, fileName);
          const imageUrl = `${publicProductUploadDir}/${fileName}`;
          const oldImageUrls = Array.from(new Set(
            sanPhams
              .map((item) => item.ImageUrl)
              .filter((item) => item && item !== imageUrl)
          ));

          await sharp(file.buffer)
            .rotate()
            .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 84 })
            .toFile(outputPath);

          for (const sanPham of sanPhams) {
            await pool.request()
              .input("Id", sql.Int, sanPham.Id)
              .input("ImageUrl", sql.NVarChar(500), imageUrl)
              .input("KhachHang", sql.NVarChar(255), khachHang)
              .query(`
                UPDATE DM_SAN_PHAM
                SET
                  ImageUrl = @ImageUrl,
                  KhachHang = NULLIF(LTRIM(RTRIM(@KhachHang)), '')
                WHERE Id = @Id
              `);
          }

          for (const oldImageUrl of oldImageUrls) {
            await cleanupUnusedProductImage(pool, oldImageUrl);
          }

          summary.updated += sanPhams.length;
        } catch (error) {
          summary.errors.push({
            fileName: file.originalname,
            maSanPham: maSanPhams.join(", "),
            message: error.message || "Không thể xử lý ảnh"
          });
        }
      }

      const hasErrors = summary.errors.length > 0;
      const hasUpdates = summary.updated > 0;
      const level = hasErrors ? (hasUpdates ? "warning" : "error") : "success";
      const message = hasErrors
        ? (hasUpdates
          ? "Import ảnh hoàn tất, nhưng có item code không tồn tại hoặc file không xử lý được"
          : "Import ảnh thất bại, không có sản phẩm nào được cập nhật")
        : "Import ảnh sản phẩm thành công";

      res.json({
        success: hasUpdates,
        level,
        message,
        summary
      });
    } catch (err) {
      console.error("Import product images error:", err);
      res.status(500).json({ message: "Không thể import ảnh sản phẩm" });
    }
  }
);

router.post(
  "/san-pham",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {

    const { MaSanPham, TenSanPham, MoTa, ImageUrl, KhachHang } = req.body;

    try {

      const pool = await poolPromise;
      const duplicate = await pool.request()
        .input("MaSanPham", sql.NVarChar(50), MaSanPham)
        .query(`
          SELECT 1
          FROM DM_SAN_PHAM
          WHERE MaSanPham = @MaSanPham
            AND TrangThai = 1
        `);

      if (duplicate.recordset.length > 0) {
        return res.status(409).json({ message: "Mã sản phẩm đã tồn tại" });
      }

      const result = await pool.request()
        .input("MaSanPham", sql.NVarChar(50), MaSanPham)
        .input("TenSanPham", sql.NVarChar(255), TenSanPham)
        .input("MoTa", sql.NVarChar(sql.MAX), MoTa || null)
        .input("ImageUrl", sql.NVarChar(500), ImageUrl || null)
        .input("KhachHang", sql.NVarChar(255), KhachHang || null)
        .query(`
          INSERT INTO DM_SAN_PHAM (
            MaSanPham,
            TenSanPham,
            MoTa,
            ImageUrl,
            KhachHang,
            TrangThai,
            CreatedAt
          )
          OUTPUT inserted.Id
          VALUES (
            @MaSanPham,
            @TenSanPham,
            @MoTa,
            @ImageUrl,
            @KhachHang,
            1,
            SYSDATETIME()
          )
        `);

      res.json({ success: true, id: result.recordset?.[0]?.Id || null });

    } catch (err) {
      console.error("Create san pham error:", err);

      res.status(500).json({
        message: "Không thể tạo sản phẩm"
      });
    }
  }
);

router.put(
  "/san-pham/:id",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {

    const { id } = req.params;
    const { MaSanPham, TenSanPham, MoTa, ImageUrl, KhachHang } = req.body;

    try {

      const pool = await poolPromise;

      const duplicate = await pool.request()
        .input("Id", sql.Int, id)
        .input("MaSanPham", sql.NVarChar(50), MaSanPham)
        .query(`
          SELECT 1
          FROM DM_SAN_PHAM
          WHERE MaSanPham = @MaSanPham
            AND Id <> @Id
            AND TrangThai = 1
        `);

      if (duplicate.recordset.length > 0) {
        return res.status(409).json({ message: "Mã sản phẩm đã tồn tại" });
      }

      const currentRes = await pool.request()
        .input("Id", sql.Int, id)
        .query(`
          SELECT ImageUrl
          FROM DM_SAN_PHAM
          WHERE Id = @Id
        `);

      const oldImageUrl = currentRes.recordset?.[0]?.ImageUrl || null;

      await pool.request()
        .input("Id", sql.Int, id)
        .input("MaSanPham", sql.NVarChar(50), MaSanPham)
        .input("TenSanPham", sql.NVarChar(255), TenSanPham)
        .input("MoTa", sql.NVarChar(sql.MAX), MoTa || null)
        .input("ImageUrl", sql.NVarChar(500), ImageUrl || null)
        .input("KhachHang", sql.NVarChar(255), KhachHang || null)
        .query(`
          UPDATE DM_SAN_PHAM
          SET
            MaSanPham = @MaSanPham,
            TenSanPham = @TenSanPham,
            MoTa = @MoTa,
            ImageUrl = @ImageUrl,
            KhachHang = @KhachHang
          WHERE Id = @Id
        `);

      if (oldImageUrl && oldImageUrl !== (ImageUrl || null)) {
        await cleanupUnusedProductImage(pool, oldImageUrl);
      }

      res.json({ success: true });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Không thể cập nhật"
      });
    }
  }
);

router.patch(
  "/san-pham/:id/image",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {
    const { id } = req.params;
    const imageUrl = req.body?.imageUrl;

    try {
      const pool = await poolPromise;
      const currentRes = await pool.request()
        .input("Id", sql.Int, id)
        .query(`
          SELECT ImageUrl
          FROM DM_SAN_PHAM
          WHERE Id = @Id
        `);

      const oldImageUrl = currentRes.recordset?.[0]?.ImageUrl || null;

      const result = await pool.request()
        .input("Id", sql.Int, id)
        .input("ImageUrl", sql.NVarChar(500), imageUrl || null)
        .query(`
          UPDATE DM_SAN_PHAM
          SET ImageUrl = @ImageUrl
          OUTPUT inserted.Id
          WHERE Id = @Id
        `);

      if (result.recordset.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
      }

      if (oldImageUrl && oldImageUrl !== (imageUrl || null)) {
        await cleanupUnusedProductImage(pool, oldImageUrl);
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Update san pham image error:", err);
      res.status(500).json({ message: "Không thể cập nhật ảnh sản phẩm" });
    }
  }
);

router.delete(
  "/san-pham/:id",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {

    const { id } = req.params;

    try {

      const pool = await poolPromise;

      await pool.request()
        .input("Id", sql.Int, id)
        .execute("sp_DM_DeleteSanPham");

      res.json({ success: true });

    } catch (err) {

      if (err.message.includes("sử dụng")) {
        return res.status(409).json({
          message: err.message
        });
      }

      console.error(err);

      res.status(500).json({
        message: "Không thể xoá"
      });
    }
  }
);

router.get(
  "/san-pham/:sanPhamId/nhom-kiem",
  authenticateToken,
  async (req, res) => {

    const { sanPhamId } = req.params;

    try {

      const pool = await poolPromise;

      const result = await pool.request()
        .input("SanPhamId", sql.Int, sanPhamId)
        .execute("sp_SANPHAM_GetNhomKiemBySanPham");

      res.json(result.recordset);

    } catch (err) {

      console.error("Get nhom kiem error:", err);

      res.status(500).json({
        message: "Không lấy được nhóm kiểm"
      });
    }
  }
);

router.post(
  "/san-pham-nhom-kiem",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {

    const { SanPhamId, NhomKiemId, BatBuoc, ThuTu } = req.body;

    try {

      const pool = await poolPromise;

      await pool.request()
        .input("SanPhamId", sql.Int, SanPhamId)
        .input("NhomKiemId", sql.Int, NhomKiemId)
        .input("BatBuoc", sql.Bit, BatBuoc)
        .input("ThuTu", sql.Int, ThuTu)
        .execute("sp_SANPHAM_AddNhomKiem");

      res.json({ success: true });

    } catch (err) {

      if (err.message.includes("tồn tại")) {
        return res.status(409).json({
          message: err.message
        });
      }

      console.error(err);

      res.status(500).json({
        message: "Không thể thêm nhóm kiểm"
      });
    }
  }
);

router.put(
  "/san-pham-nhom-kiem/:id",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {

    const { id } = req.params;
    const { BatBuoc, ThuTu } = req.body;

    try {

      const pool = await poolPromise;

      await pool.request()
        .input("Id", sql.Int, id)
        .input("BatBuoc", sql.Bit, BatBuoc)
        .input("ThuTu", sql.Int, ThuTu)
        .execute("sp_SANPHAM_UpdateNhomKiem");

      res.json({ success: true });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        message: "Không thể cập nhật"
      });
    }
  }
);

router.delete(
  "/san-pham-nhom-kiem/:id",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {

    const { id } = req.params;

    try {

      const pool = await poolPromise;

      await pool.request()
        .input("Id", sql.Int, id)
        .execute("sp_SANPHAM_DeleteNhomKiem");

      res.json({ success: true });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        message: "Không thể xoá"
      });
    }
  }
);

router.get(
  "/import-danh-muc-kiem/template",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {
    const rows = [
      {
        MaSanPham: "SP001",
        TenNhom: "Ngoại quan",
        MoTaNhom: "Kiểm ngoại quan của balo",
        ThuTuNhom: 1,
        TenMucKiem: "Bề mặt vải",
        ThamChieu: "Bản vẽ/tiêu chuẩn",
        PhuongPhapKiem: "Quan sát bằng mắt thường",
        TieuChuan: "Không trầy xước, móp méo",
        ThuTuMuc: 1,
        ThuTuGanNhom: 1,
        DiemTrongYeu: "Không"
      },
      {
        MaSanPham: "SP002",
        TenNhom: "Ngoại quan",
        MoTaNhom: "Kiểm ngoại quan của lều",
        ThuTuNhom: 1,
        TenMucKiem: "Đường may mép lều",
        ThamChieu: "Mẫu chuẩn",
        PhuongPhapKiem: "Quan sát bằng mắt thường",
        TieuChuan: "Đường may đều, không bung chỉ",
        ThuTuMuc: 1,
        ThuTuGanNhom: 1,
        DiemTrongYeu: "Có"
      }
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: [
        "MaSanPham",
        "TenNhom",
        "MoTaNhom",
        "ThuTuNhom",
        "TenMucKiem",
        "ThamChieu",
        "PhuongPhapKiem",
        "TieuChuan",
        "ThuTuMuc",
        "ThuTuGanNhom",
        "DiemTrongYeu"
      ]
    });

    worksheet["!cols"] = [
      { wch: 16 },
      { wch: 24 },
      { wch: 34 },
      { wch: 12 },
      { wch: 28 },
      { wch: 22 },
      { wch: 28 },
      { wch: 34 },
      { wch: 12 },
      { wch: 16 },
      { wch: 18 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhMucKiem");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx"
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=\"mau-import-danh-muc-kiem.xlsx\""
    );
    res.send(buffer);
  }
);

router.get(
  "/san-pham/:sanPhamId/danh-muc-kiem/export",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {
    const { sanPhamId } = req.params;

    try {
      const pool = await poolPromise;
      const sanPhamList = await getAllSanPham(pool);
      const sanPham = sanPhamList.find(item => Number(item.Id) === Number(sanPhamId));

      if (!sanPham) {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm/vật tư" });
      }

      const nhomResult = await pool.request()
        .input("SanPhamId", sql.Int, sanPhamId)
        .execute("sp_SANPHAM_GetNhomKiemBySanPham");

      const allNhomResult = await pool.request()
        .execute("sp_DM_GetNhomKiemList");
      const nhomDetailById = new Map(
        (allNhomResult.recordset || []).map(item => [Number(item.Id), item])
      );
      const nhomRows = nhomResult.recordset || [];
      const rows = [];

      for (const nhom of nhomRows.sort((a, b) => (a.ThuTu || 0) - (b.ThuTu || 0))) {
        const nhomDetail = nhomDetailById.get(Number(nhom.NhomKiemId)) || nhom;
        const itemResult = await pool.request()
          .input("NhomKiemId", sql.Int, nhom.NhomKiemId)
          .execute("sp_DM_GetCheckItemList");

        const checkItems = itemResult.recordset || [];

        if (!checkItems.length) {
          rows.push({
            MaSanPham: sanPham.MaSanPham,
            TenNhom: nhomDetail.TenNhom || nhom.TenNhom,
            MoTaNhom: nhomDetail.MoTa || "",
            ThuTuNhom: nhomDetail.ThuTu || nhom.ThuTu || "",
            TenMucKiem: "",
            ThamChieu: "",
            PhuongPhapKiem: "",
            TieuChuan: "",
            ThuTuMuc: "",
            ThuTuGanNhom: nhom.ThuTu || "",
            DiemTrongYeu: ""
          });
          continue;
        }

        checkItems
          .sort((a, b) => (a.ThuTu || 0) - (b.ThuTu || 0))
          .forEach(item => {
            rows.push({
              MaSanPham: sanPham.MaSanPham,
              TenNhom: nhomDetail.TenNhom || nhom.TenNhom,
              MoTaNhom: nhomDetail.MoTa || "",
              ThuTuNhom: nhomDetail.ThuTu || nhom.ThuTu || "",
              TenMucKiem: item.TenMucKiem || "",
              ThamChieu: item.ThamChieu || "",
              PhuongPhapKiem: item.PhuongPhapKiem || "",
              TieuChuan: item.TieuChuan || "",
              ThuTuMuc: item.ThuTu || "",
              ThuTuGanNhom: nhom.ThuTu || "",
              DiemTrongYeu: item.DiemTrongYeu ? "Có" : "Không"
            });
          });
      }

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows, {
        header: [
          "MaSanPham",
          "TenNhom",
          "MoTaNhom",
          "ThuTuNhom",
          "TenMucKiem",
          "ThamChieu",
          "PhuongPhapKiem",
          "TieuChuan",
          "ThuTuMuc",
          "ThuTuGanNhom",
          "DiemTrongYeu"
        ]
      });

      worksheet["!cols"] = [
        { wch: 16 },
        { wch: 24 },
        { wch: 34 },
        { wch: 12 },
        { wch: 28 },
        { wch: 22 },
        { wch: 28 },
        { wch: 34 },
        { wch: 12 },
        { wch: 16 },
        { wch: 18 }
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "DanhMucKiem");

      const buffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx"
      });

      const safeCode = String(sanPham.MaSanPham || sanPham.Id)
        .replace(/[^\w.-]+/g, "_")
        .slice(0, 80);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="danh-muc-kiem-${safeCode}.xlsx"`
      );
      res.send(buffer);
    } catch (err) {
      console.error("Export danh muc kiem error:", err);
      res.status(500).json({
        message: "Không xuất được danh mục kiểm",
        error: err.message
      });
    }
  }
);

router.post(
  "/import-danh-muc-kiem",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  (req, res, next) => {
    excelUpload.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || "File không hợp lệ" });
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn file .xlsx" });
    }

    let rows = [];

    try {
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames.includes("DanhMucKiem")
        ? "DanhMucKiem"
        : null;

      if (!sheetName) {
        return res.status(400).json({
          message: "File phải có sheet tên DanhMucKiem",
          errors: [{ line: 1, message: "Không tìm thấy sheet DanhMucKiem" }]
        });
      }

      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: "",
        raw: false
      }).map(normalizeImportRow);
    } catch (err) {
      console.error("Parse import danh muc kiem error:", err);
      return res.status(400).json({ message: "Không đọc được file Excel" });
    }

    if (!rows.length) {
      return res.status(400).json({
        message: "File không có dữ liệu",
        errors: [{ line: 1, message: "File không có dòng dữ liệu để import" }]
      });
    }

    try {
      const pool = await poolPromise;
      const sanPhamList = await getAllSanPham(pool);
      const sanPhamByCode = new Map(
        sanPhamList.map(item => [normalizeKey(item.MaSanPham), item])
      );

      const errors = [];

      rows.forEach((row) => {
        const criticalValue = parseOptionalDiemTrongYeu(row.DiemTrongYeuRaw);
        row.DiemTrongYeu = criticalValue.value;

        if (!row.MaSanPham) {
          errors.push({ line: row.line, message: "Thiếu MaSanPham" });
        } else if (!sanPhamByCode.has(normalizeKey(row.MaSanPham))) {
          errors.push({ line: row.line, message: `MaSanPham không tồn tại: ${row.MaSanPham}` });
        }

        if (!row.TenNhom) {
          errors.push({ line: row.line, message: "Thiếu TenNhom" });
        }

        if (!row.MoTaNhom) {
          errors.push({ line: row.line, message: "Thiếu MoTaNhom để phân biệt nhóm kiểm" });
        }

        if (!row.TenMucKiem) {
          errors.push({ line: row.line, message: "Thiếu TenMucKiem" });
        }

        if (!criticalValue.valid) {
          errors.push({
            line: row.line,
            message: "DiemTrongYeu chỉ nhận Có/Không, true/false hoặc 1/0"
          });
        }
      });

      if (errors.length) {
        return res.status(400).json({
          message: "File có dữ liệu không hợp lệ",
          errors
        });
      }

      const nhomRows = new Map();
      const itemRows = new Map();
      const assignRows = new Map();

      rows.forEach((row, index) => {
        const nhomKey = buildNhomImportKey(row.TenNhom, row.MoTaNhom);
        const sanPham = sanPhamByCode.get(normalizeKey(row.MaSanPham));
        const nhomOrder = parseOrder(row.ThuTuNhom, index + 1);
        const itemOrder = parseOrder(row.ThuTuMuc, index + 1);
        const assignOrder = parseOrder(row.ThuTuGanNhom, index + 1);

        if (!nhomRows.has(nhomKey)) {
          nhomRows.set(nhomKey, {
            TenNhom: row.TenNhom,
            MoTa: row.MoTaNhom,
            ThuTu: nhomOrder
          });
        }

        const itemKey = `${nhomKey}|${normalizeKey(row.TenMucKiem)}`;
        if (!itemRows.has(itemKey)) {
          itemRows.set(itemKey, {
            nhomKey,
            TenMucKiem: row.TenMucKiem,
            ThamChieu: row.ThamChieu,
            PhuongPhapKiem: row.PhuongPhapKiem,
            TieuChuan: row.TieuChuan,
            ThuTu: itemOrder,
            DiemTrongYeu: row.DiemTrongYeu
          });
        }

        const assignKey = `${sanPham.Id}|${nhomKey}`;
        if (!assignRows.has(assignKey)) {
          assignRows.set(assignKey, {
            SanPhamId: sanPham.Id,
            nhomKey,
            ThuTu: assignOrder
          });
        }
      });

      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      const summary = {
        totalRows: rows.length,
        createdNhom: 0,
        updatedNhom: 0,
        createdMuc: 0,
        updatedMuc: 0,
        createdGanNhom: 0,
        updatedGanNhom: 0
      };

      try {
        let nhomList = await getNhomKiemListInTransaction(transaction);
        const nhomByName = new Map(
          nhomList.map(item => [buildNhomImportKey(item.TenNhom, item.MoTa), item])
        );

        for (const [nhomKey, nhom] of nhomRows.entries()) {
          const existed = nhomByName.get(nhomKey);

          if (existed) {
            await requestWithTransaction(transaction)
              .input("Id", sql.Int, existed.Id)
              .input("TenNhom", sql.NVarChar(255), nhom.TenNhom)
              .input("MoTa", sql.NVarChar(sql.MAX), nhom.MoTa)
              .input("ThuTu", sql.Int, nhom.ThuTu)
              .input("TrangThai", sql.Bit, existed.TrangThai)
              .execute("sp_DM_UpdateNhomKiem");
            summary.updatedNhom += 1;
          } else {
            await requestWithTransaction(transaction)
              .input("TenNhom", sql.NVarChar(255), nhom.TenNhom)
              .input("MoTa", sql.NVarChar(sql.MAX), nhom.MoTa)
              .input("ThuTu", sql.Int, nhom.ThuTu)
              .execute("sp_DM_CreateNhomKiem");
            summary.createdNhom += 1;
          }

          nhomList = await getNhomKiemListInTransaction(transaction);
          nhomByName.clear();
          nhomList.forEach(item => nhomByName.set(buildNhomImportKey(item.TenNhom, item.MoTa), item));
        }

        const itemCache = new Map();
        const getItemByName = async (nhomKiemId, tenMucKiem) => {
          if (!itemCache.has(nhomKiemId)) {
            const items = await getCheckItemsInTransaction(transaction, nhomKiemId);
            itemCache.set(
              nhomKiemId,
              new Map(items.map(item => [normalizeKey(item.TenMucKiem), item]))
            );
          }

          return itemCache.get(nhomKiemId).get(normalizeKey(tenMucKiem));
        };

        for (const item of itemRows.values()) {
          const nhom = nhomByName.get(item.nhomKey);
          const existed = await getItemByName(nhom.Id, item.TenMucKiem);

          if (existed) {
            await requestWithTransaction(transaction)
              .input("Id", sql.Int, existed.Id)
              .input("TenMucKiem", sql.NVarChar(255), item.TenMucKiem)
              .input("ThamChieu", sql.NVarChar(sql.MAX), item.ThamChieu)
              .input("PhuongPhapKiem", sql.NVarChar(sql.MAX), item.PhuongPhapKiem)
              .input("TieuChuan", sql.NVarChar(sql.MAX), item.TieuChuan)
              .input("ThuTu", sql.Int, item.ThuTu)
              .input("TrangThai", sql.Bit, existed.TrangThai)
              .input("DiemTrongYeu", sql.Bit, item.DiemTrongYeu ?? existed.DiemTrongYeu ?? false)
              .execute("sp_DM_UpdateCheckItem");
            summary.updatedMuc += 1;
          } else {
            await requestWithTransaction(transaction)
              .input("NhomKiemId", sql.Int, nhom.Id)
              .input("TenMucKiem", sql.NVarChar(255), item.TenMucKiem)
              .input("ThamChieu", sql.NVarChar(sql.MAX), item.ThamChieu)
              .input("PhuongPhapKiem", sql.NVarChar(sql.MAX), item.PhuongPhapKiem)
              .input("TieuChuan", sql.NVarChar(sql.MAX), item.TieuChuan)
              .input("ThuTu", sql.Int, item.ThuTu)
              .input("DiemTrongYeu", sql.Bit, item.DiemTrongYeu ?? false)
              .execute("sp_DM_CreateCheckItem");
            itemCache.delete(nhom.Id);
            summary.createdMuc += 1;
          }
        }

        const assignmentCache = new Map();
        const getAssignmentByNhomId = async (sanPhamId, nhomKiemId) => {
          if (!assignmentCache.has(sanPhamId)) {
            const assignments = await getSanPhamNhomKiemInTransaction(transaction, sanPhamId);
            assignmentCache.set(
              sanPhamId,
              new Map(assignments.map(item => [Number(item.NhomKiemId), item]))
            );
          }

          return assignmentCache.get(sanPhamId).get(Number(nhomKiemId));
        };

        for (const assignment of assignRows.values()) {
          const nhom = nhomByName.get(assignment.nhomKey);
          const existed = await getAssignmentByNhomId(assignment.SanPhamId, nhom.Id);

          if (existed) {
            await requestWithTransaction(transaction)
              .input("Id", sql.Int, existed.Id)
              .input("BatBuoc", sql.Bit, true)
              .input("ThuTu", sql.Int, assignment.ThuTu)
              .execute("sp_SANPHAM_UpdateNhomKiem");
            summary.updatedGanNhom += 1;
          } else {
            await requestWithTransaction(transaction)
              .input("SanPhamId", sql.Int, assignment.SanPhamId)
              .input("NhomKiemId", sql.Int, nhom.Id)
              .input("BatBuoc", sql.Bit, true)
              .input("ThuTu", sql.Int, assignment.ThuTu)
              .execute("sp_SANPHAM_AddNhomKiem");
            assignmentCache.delete(assignment.SanPhamId);
            summary.createdGanNhom += 1;
          }
        }

        await transaction.commit();

        res.json({
          success: true,
          message: "Import danh mục kiểm thành công",
          summary
        });
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } catch (err) {
      console.error("Import danh muc kiem error:", err);
      res.status(500).json({
        message: "Import danh mục kiểm thất bại",
        error: err.message
      });
    }
  }
);

router.get(
  "/de-nghi-xu-ly",
  authenticateToken,
  // authorize("QUAN_TRI_DM"),
  async (req, res) => {

    try {

      const pool = await poolPromise;

      const result = await pool.request()
        .execute("sp_DM_DeNghiXuLy_Get");

      res.json(result.recordset);

    } catch (err) {

      console.error("GetDeNghiXuLy error:", err);

      res.status(500).json({
        message: "Không tải được danh mục đề nghị xử lý"
      });

    }

  }
);

router.get(
  "/bo-phan",
  authenticateToken,
  async (req, res) => {

    try {

      const pool = await poolPromise;

      const result = await pool.request()
        .execute("sp_DM_BoPhan_Get");

      res.json(result.recordset);

    } catch (err) {

      console.error("GetBoPhan error:", err);

      res.status(500).json({
        message: "Không tải được danh mục bộ phận"
      });

    }

  }
);

router.post(
  "/inspection-level",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {

    const {
      InspectionLevel,
      LotMin,
      LotMax,
      SampleSize,
      Ac_Critical,
      Re_Critical,
      Ac_Major,
      Re_Major,
      Ac_Minor,
      Re_Minor
    } = req.body;

    try {

      const pool = await poolPromise;

      const result = await pool.request()
        .input("InspectionLevel", sql.NVarChar(100), InspectionLevel)
        .input("LotMin", sql.Int, LotMin)
        .input("LotMax", sql.Int, LotMax)
        .input("SampleSize", sql.Int, SampleSize)
        .input("Ac_Critical", sql.Int, Ac_Critical)
        .input("Re_Critical", sql.Int, Re_Critical)
        .input("Ac_Major", sql.Int, Ac_Major)
        .input("Re_Major", sql.Int, Re_Major)
        .input("Ac_Minor", sql.Int, Ac_Minor)
        .input("Re_Minor", sql.Int, Re_Minor)
        .execute("sp_DM_AQL_PLAN_Create");

      res.json({
        success: true,
        id: result.recordset?.[0]?.Id
      });

    } catch (err) {

      if (err.message.includes("trùng")) {
        return res.status(409).json({ message: err.message });
      }

      console.error("Create AQL error:", err);

      res.status(500).json({
        message: "Không thể tạo Inspection Level"
      });
    }
  }
);

router.put(
  "/inspection-level/:id",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {

    const { id } = req.params;

    const {
      InspectionLevel,
      LotMin,
      LotMax,
      SampleSize,
      Ac_Critical,
      Re_Critical,
      Ac_Major,
      Re_Major,
      Ac_Minor,
      Re_Minor
    } = req.body;

    try {

      const pool = await poolPromise;

      await pool.request()
        .input("Id", sql.Int, id)
        .input("InspectionLevel", sql.NVarChar(10), InspectionLevel)
        .input("LotMin", sql.Int, LotMin)
        .input("LotMax", sql.Int, LotMax)
        .input("SampleSize", sql.Int, SampleSize)
        .input("Ac_Critical", sql.Int, Ac_Critical)
        .input("Re_Critical", sql.Int, Re_Critical)
        .input("Ac_Major", sql.Int, Ac_Major)
        .input("Re_Major", sql.Int, Re_Major)
        .input("Ac_Minor", sql.Int, Ac_Minor)
        .input("Re_Minor", sql.Int, Re_Minor)
        .execute("sp_DM_AQL_PLAN_Update");

      res.json({ success: true });

    } catch (err) {

      if (err.message.includes("trùng")) {
        return res.status(409).json({ message: err.message });
      }

      console.error("Update AQL error:", err);

      res.status(500).json({
        message: "Không thể cập nhật"
      });
    }
  }
);

router.delete(
  "/inspection-level/:id",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {

    const { id } = req.params;

    try {

      const pool = await poolPromise;

      await pool.request()
        .input("Id", sql.Int, id)
        .execute("sp_DM_AQL_PLAN_Delete");

      res.json({ success: true });

    } catch (err) {

      console.error("Delete AQL error:", err);

      res.status(500).json({
        message: "Không thể xoá"
      });
    }
  }
);

router.get(
  "/inspection-level",
  authenticateToken,
  async (req, res) => {

    const { inspectionLevel } = req.query;

    try {

      const pool = await poolPromise;

      const result = await pool.request()
        .input("InspectionLevel", sql.NVarChar(10), inspectionLevel || null)
        .execute("sp_DM_AQL_PLAN_GetList");

      res.json(result.recordset);

    } catch (err) {

      console.error("Get list AQL error:", err);

      res.status(500).json({
        message: "Không thể lấy danh sách"
      });
    }
  }
);

router.get(
  "/inspection-level/:id",
  authenticateToken,
  async (req, res) => {

    const { id } = req.params;

    try {

      const pool = await poolPromise;

      const result = await pool.request()
        .input("Id", sql.Int, id)
        .execute("sp_DM_AQL_PLAN_GetById");

      res.json(result.recordset[0]);

    } catch (err) {

      console.error("Get detail AQL error:", err);

      res.status(500).json({
        message: "Không thể lấy dữ liệu"
      });
    }
  }
);

router.get(
  "/inspection-levels",
  authenticateToken,
  async (req, res) => {

    try {

      const pool = await poolPromise;

      const result = await pool.request()
        .execute("sp_DM_AQL_PLAN_GetLevels");

      res.json(result.recordset);

    } catch (err) {

      console.error("Get levels error:", err);

      res.status(500).json({
        message: "Không thể lấy Inspection Level"
      });
    }
  }
);

// --- CẤU HÌNH THÔNG SỐ ĐẶC BIỆT ---
router.get(
  "/import-thong-so-kiem/template",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {
    const rows = [
      {
        MaSanPham: "SP001",
        NhomThongSo: "Kích thước sản phẩm",
        TenThongSo: "Dài",
        GiaTriChuan: "580",
        DungSaiAm: 5,
        DungSaiDuong: 5,
        DonVi: "mm",
        ThuTu: 1
      },
      {
        MaSanPham: "SP001",
        NhomThongSo: "Kích thước sản phẩm",
        TenThongSo: "Rộng",
        GiaTriChuan: "320",
        DungSaiAm: 3,
        DungSaiDuong: 3,
        DonVi: "mm",
        ThuTu: 2
      }
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: [
        "MaSanPham",
        "NhomThongSo",
        "TenThongSo",
        "GiaTriChuan",
        "DungSaiAm",
        "DungSaiDuong",
        "DonVi",
        "ThuTu"
      ]
    });

    worksheet["!cols"] = [
      { wch: 16 },
      { wch: 28 },
      { wch: 24 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "ThongSoKiem");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx"
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=\"mau-import-thong-so-kiem.xlsx\""
    );
    res.send(buffer);
  }
);

router.post(
  "/import-thong-so-kiem",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  (req, res, next) => {
    excelUpload.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || "File không hợp lệ" });
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn file .xlsx" });
    }

    let rows = [];

    try {
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames.includes("ThongSoKiem")
        ? "ThongSoKiem"
        : null;

      if (!sheetName) {
        return res.status(400).json({
          message: "File phải có sheet tên ThongSoKiem",
          errors: [{ line: 1, message: "Không tìm thấy sheet ThongSoKiem" }]
        });
      }

      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: "",
        raw: false
      }).map(normalizeThongSoImportRow);
    } catch (err) {
      console.error("Parse import thong-so error:", err);
      return res.status(400).json({ message: "Không đọc được file Excel" });
    }

    if (!rows.length) {
      return res.status(400).json({
        message: "File không có dữ liệu",
        errors: [{ line: 1, message: "File không có dòng dữ liệu để import" }]
      });
    }

    try {
      const pool = await poolPromise;
      const sanPhamList = await getAllSanPham(pool);
      const sanPhamByCode = new Map(
        sanPhamList.map(item => [normalizeKey(item.MaSanPham), item])
      );

      const errors = [];

      rows.forEach((row) => {
        if (!row.MaSanPham) {
          errors.push({ line: row.line, message: "Thiếu MaSanPham" });
        } else if (!sanPhamByCode.has(normalizeKey(row.MaSanPham))) {
          errors.push({ line: row.line, message: `MaSanPham không tồn tại: ${row.MaSanPham}` });
        }

        if (!row.NhomThongSo) {
          errors.push({ line: row.line, message: "Thiếu NhomThongSo" });
        }

        if (!row.GiaTriChuan) {
          errors.push({ line: row.line, message: "Thiếu GiaTriChuan" });
        }
      });

      if (errors.length) {
        return res.status(400).json({
          message: "File có dữ liệu không hợp lệ",
          errors
        });
      }

      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      const summary = {
        totalRows: rows.length,
        created: 0,
        updated: 0
      };

      try {
        const thongSoCache = new Map();
        const getExistingThongSo = async (sanPhamId, nhomThongSo, tenThongSo) => {
          if (!thongSoCache.has(sanPhamId)) {
            const items = await getThongSoInTransaction(transaction, sanPhamId);
            thongSoCache.set(
              sanPhamId,
              new Map(items.map(item => [
                `${normalizeKey(item.NhomThongSo)}|${normalizeKey(item.TenThongSo)}`,
                item
              ]))
            );
          }

          return thongSoCache
            .get(sanPhamId)
            .get(`${normalizeKey(nhomThongSo)}|${normalizeKey(tenThongSo)}`);
        };

        for (const [index, row] of rows.entries()) {
          const sanPham = sanPhamByCode.get(normalizeKey(row.MaSanPham));
          const existed = await getExistingThongSo(sanPham.Id, row.NhomThongSo, row.TenThongSo);
          const thuTu = parseOrder(row.ThuTu, index + 1);
          const dungSaiAm = Number.parseFloat(row.DungSaiAm);
          const dungSaiDuong = Number.parseFloat(row.DungSaiDuong);

          await requestWithTransaction(transaction)
            .input("Id", sql.Int, existed?.Id || null)
            .input("SanPhamId", sql.Int, sanPham.Id)
            .input("NhomThongSo", sql.NVarChar(100), row.NhomThongSo)
            .input("TenThongSo", sql.NVarChar(100), row.TenThongSo || null)
            .input("GiaTriChuan", sql.NVarChar(100), row.GiaTriChuan)
            .input("DungSaiAm", sql.Float, Number.isFinite(dungSaiAm) ? dungSaiAm : 0)
            .input("DungSaiDuong", sql.Float, Number.isFinite(dungSaiDuong) ? dungSaiDuong : 0)
            .input("DonVi", sql.NVarChar(50), row.DonVi || null)
            .input("ThuTu", sql.Int, thuTu)
            .execute("sp_DM_SanPhamThongSo_Save");

          if (existed) {
            summary.updated += 1;
          } else {
            summary.created += 1;
            thongSoCache.delete(sanPham.Id);
          }
        }

        await transaction.commit();
        res.json({
          success: true,
          message: "Import thông số kiểm thành công",
          summary
        });
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } catch (err) {
      console.error("Import thong-so error:", err);
      res.status(500).json({
        message: "Import thông số kiểm thất bại",
        error: err.message
      });
    }
  }
);

router.get(
  "/san-pham/:sanPhamId/thong-so",
  authenticateToken,
  async (req, res) => {
    const { sanPhamId } = req.params;
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .input("SanPhamId", sql.Int, sanPhamId)
        .execute("sp_DM_SanPhamThongSo_Get");
      res.json(result.recordset);
    } catch (err) {
      console.error("Get thong-so error:", err);
      res.status(500).json({ message: "Lỗi tải cấu hình thông số" });
    }
  }
);

router.get(
  "/san-pham/:sanPhamId/thong-so/export",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {
    const { sanPhamId } = req.params;

    try {
      const pool = await poolPromise;
      const sanPhamList = await getAllSanPham(pool);
      const sanPham = sanPhamList.find(item => Number(item.Id) === Number(sanPhamId));

      if (!sanPham) {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm/vật tư" });
      }

      const result = await pool.request()
        .input("SanPhamId", sql.Int, sanPhamId)
        .execute("sp_DM_SanPhamThongSo_Get");

      const rows = (result.recordset || [])
        .sort((a, b) => (a.ThuTu || 0) - (b.ThuTu || 0))
        .map(item => ({
          MaSanPham: sanPham.MaSanPham,
          NhomThongSo: item.NhomThongSo || "",
          TenThongSo: item.TenThongSo || "",
          GiaTriChuan: item.GiaTriChuan || "",
          DungSaiAm: item.DungSaiAm ?? "",
          DungSaiDuong: item.DungSaiDuong ?? "",
          DonVi: item.DonVi || "",
          ThuTu: item.ThuTu || ""
        }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows, {
        header: [
          "MaSanPham",
          "NhomThongSo",
          "TenThongSo",
          "GiaTriChuan",
          "DungSaiAm",
          "DungSaiDuong",
          "DonVi",
          "ThuTu"
        ]
      });

      worksheet["!cols"] = [
        { wch: 16 },
        { wch: 28 },
        { wch: 24 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 10 }
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "ThongSoKiem");

      const buffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx"
      });

      const safeCode = String(sanPham.MaSanPham || sanPham.Id)
        .replace(/[^\w.-]+/g, "_")
        .slice(0, 80);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="thong-so-kiem-${safeCode}.xlsx"`
      );
      res.send(buffer);
    } catch (err) {
      console.error("Export thong-so error:", err);
      res.status(500).json({
        message: "Không xuất được thông số kiểm",
        error: err.message
      });
    }
  }
);

router.post(
  "/san-pham-thong-so",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {
    const { Id, SanPhamId, NhomThongSo, TenThongSo, GiaTriChuan, DungSaiAm, DungSaiDuong, DonVi, ThuTu } = req.body;
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .input("Id", sql.Int, Id || null)
        .input("SanPhamId", sql.Int, SanPhamId)
        .input("NhomThongSo", sql.NVarChar(100), NhomThongSo)
        .input("TenThongSo", sql.NVarChar(100), TenThongSo || null)
        .input("GiaTriChuan", sql.NVarChar(100), GiaTriChuan)
        .input("DungSaiAm", sql.Float, DungSaiAm)
        .input("DungSaiDuong", sql.Float, DungSaiDuong)
        .input("DonVi", sql.NVarChar(50), DonVi || null)
        .input("ThuTu", sql.Int, ThuTu || 0)
        .execute("sp_DM_SanPhamThongSo_Save");
      res.json({ message: "Đã lưu thành công", id: result.recordset[0].InsertedId });
    } catch (err) {
      console.error("Save thong-so error:", err);
      res.status(500).json({ message: "Lỗi lưu cấu hình thông số" });
    }
  }
);

router.delete(
  "/san-pham-thong-so/:id",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const pool = await poolPromise;
      await pool.request()
        .input("Id", sql.Int, id)
        .execute("sp_DM_SanPhamThongSo_Delete");
      res.json({ message: "Đã xoá thành công" });
    } catch (err) {
      console.error("Delete thong-so error:", err);
      res.status(500).json({ message: "Lỗi xoá cấu hình thông số" });
    }
  }
);

module.exports = router;
