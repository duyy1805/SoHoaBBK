const express = require('express');
const router = express.Router();
const sql = require('mssql');
const multer = require('multer');
const XLSX = require('xlsx');

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

const trimValue = (value) => String(value ?? "").trim();
const normalizeKey = (value) => trimValue(value).toLowerCase();
const buildNhomImportKey = (tenNhom, moTaNhom) => `${normalizeKey(tenNhom)}|${normalizeKey(moTaNhom)}`;
const parseOrder = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

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
  ThuTuGanNhom: row.ThuTuGanNhom
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
    const { defectType } = req.query;

    try {
      const pool = await poolPromise;

      const result = await pool.request()
        .input(
          "DefectType",
          sql.NVarChar(20),
          defectType || null
        )
        .execute("sp_DM_GetDefectList");

      res.json(result.recordset);
    } catch (err) {
      console.error("Get defect list error:", err);
      res.status(500).json({
        message: "Không lấy được danh mục lỗi"
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
    const { TenLoi, DefectType, MoTa, GhiChu } = req.body;

    try {
      const pool = await poolPromise;

      await pool.request()
        .input("TenLoi", sql.NVarChar(255), TenLoi)
        .input("DefectType", sql.NVarChar(20), DefectType)
        .input("MoTa", sql.NVarChar(sql.MAX), MoTa)
        .input("GhiChu", sql.NVarChar(sql.MAX), GhiChu)
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
    const { TenLoi, DefectType, TrangThai, MoTa, GhiChu } = req.body;

    try {
      const pool = await poolPromise;

      await pool.request()
        .input("Id", sql.Int, id)
        .input("TenLoi", sql.NVarChar(255), TenLoi)
        .input("DefectType", sql.NVarChar(20), DefectType)
        .input("TrangThai", sql.Bit, TrangThai)
        .input("MoTa", sql.NVarChar(sql.MAX), MoTa)
        .input("GhiChu", sql.NVarChar(sql.MAX), GhiChu)
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
    const { NhomKiemId, TenMucKiem, ThamChieu, PhuongPhapKiem, TieuChuan, ThuTu } = req.body;

    try {
      const pool = await poolPromise;

      await pool.request()
        .input("NhomKiemId", sql.Int, NhomKiemId)
        .input("TenMucKiem", sql.NVarChar(255), TenMucKiem)
        .input("ThamChieu", sql.NVarChar(sql.MAX), ThamChieu)
        .input("PhuongPhapKiem", sql.NVarChar(sql.MAX), PhuongPhapKiem)
        .input("TieuChuan", sql.NVarChar(sql.MAX), TieuChuan)
        .input("ThuTu", sql.Int, ThuTu)
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
    const { TenMucKiem, ThamChieu, PhuongPhapKiem, TieuChuan, ThuTu, TrangThai } = req.body;

    try {
      const pool = await poolPromise;

      await pool.request()
        .input("Id", sql.Int, id)
        .input("TenMucKiem", sql.NVarChar(255), TenMucKiem)
        .input("ThamChieu", sql.NVarChar(sql.MAX), ThamChieu)
        .input("PhuongPhapKiem", sql.NVarChar(sql.MAX), PhuongPhapKiem)
        .input("TieuChuan", sql.NVarChar(sql.MAX), TieuChuan)
        .input("ThuTu", sql.Int, ThuTu)
        .input("TrangThai", sql.Bit, TrangThai)
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
  "/san-pham",
  authenticateToken,
  authorize("QUAN_TRI_DM"),
  async (req, res) => {

    const { MaSanPham, TenSanPham, MoTa } = req.body;

    try {

      const pool = await poolPromise;

      await pool.request()
        .input("MaSanPham", sql.NVarChar(50), MaSanPham)
        .input("TenSanPham", sql.NVarChar(255), TenSanPham)
        .input("MoTa", sql.NVarChar(sql.MAX), MoTa)
        .execute("sp_DM_CreateSanPham");

      res.json({ success: true });

    } catch (err) {

      if (err.message.includes("tồn tại")) {
        return res.status(409).json({
          message: err.message
        });
      }

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
    const { MaSanPham, TenSanPham, MoTa } = req.body;

    try {

      const pool = await poolPromise;

      await pool.request()
        .input("Id", sql.Int, id)
        .input("MaSanPham", sql.NVarChar(50), MaSanPham)
        .input("TenSanPham", sql.NVarChar(255), TenSanPham)
        .input("MoTa", sql.NVarChar(sql.MAX), MoTa)
        .execute("sp_DM_UpdateSanPham");

      res.json({ success: true });

    } catch (err) {

      if (err.message.includes("tồn tại")) {
        return res.status(409).json({
          message: err.message
        });
      }

      console.error(err);

      res.status(500).json({
        message: "Không thể cập nhật"
      });
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
        ThuTuGanNhom: 1
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
        ThuTuGanNhom: 1
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
        "ThuTuGanNhom"
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
      { wch: 16 }
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
            ThuTuGanNhom: nhom.ThuTu || ""
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
              ThuTuGanNhom: nhom.ThuTu || ""
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
          "ThuTuGanNhom"
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
        { wch: 16 }
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
            ThuTu: itemOrder
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
