const express = require('express');
const router = express.Router();
const sql = require('mssql');

const { poolPromise } = require('../db');
const authenticateToken = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');

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
      SELECT u.Id, u.FullName
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