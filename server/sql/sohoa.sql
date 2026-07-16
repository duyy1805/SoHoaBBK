/*
 Navicat Premium Dump SQL

 Source Server         : Z76_ERP
 Source Server Type    : SQL Server
 Source Server Version : 13005026 (13.00.5026)
 Source Host           : 125.212.207.52:3400
 Source Catalog        : TAG_Duy
 Source Schema         : dbo

 Target Server Type    : SQL Server
 Target Server Version : 13005026 (13.00.5026)
 File Encoding         : 65001

 Date: 09/07/2026 10:33:42
*/


-- ----------------------------
-- Table structure for BIEN_BAN_ANH
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[BIEN_BAN_ANH]') AND type IN ('U'))
	DROP TABLE [dbo].[BIEN_BAN_ANH]
GO

CREATE TABLE [dbo].[BIEN_BAN_ANH] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [BienBanId] int  NOT NULL,
  [Url] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [MoTa] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL
)
GO

ALTER TABLE [dbo].[BIEN_BAN_ANH] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for BIEN_BAN_ASSIGN
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[BIEN_BAN_ASSIGN]') AND type IN ('U'))
	DROP TABLE [dbo].[BIEN_BAN_ASSIGN]
GO

CREATE TABLE [dbo].[BIEN_BAN_ASSIGN] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [BienBanId] int  NOT NULL,
  [AssignedBy] int  NULL,
  [AssignedAt] datetime2(7) DEFAULT getdate() NULL,
  [NguoiXuLyId] int  NULL,
  [BoPhanId] int  NULL,
  [AssignedToUserAt] datetime2(7)  NULL,
  [IsBpsxSignature] bit DEFAULT 0 NOT NULL
)
GO

ALTER TABLE [dbo].[BIEN_BAN_ASSIGN] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for BIEN_BAN_CHI_PHI
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[BIEN_BAN_CHI_PHI]') AND type IN ('U'))
	DROP TABLE [dbo].[BIEN_BAN_CHI_PHI]
GO

CREATE TABLE [dbo].[BIEN_BAN_CHI_PHI] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [BienBanId] int  NOT NULL,
  [LoaiChiPhi] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [GiaTri] money  NULL,
  [ThoiHan] date  NULL,
  [CreatedBy] int  NULL,
  [CreatedAt] datetime2(7) DEFAULT getdate() NULL,
  [BoPhanId] int  NULL,
  [TheoDoiBy] int  NULL
)
GO

ALTER TABLE [dbo].[BIEN_BAN_CHI_PHI] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for BIEN_BAN_DEFECT
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[BIEN_BAN_DEFECT]') AND type IN ('U'))
	DROP TABLE [dbo].[BIEN_BAN_DEFECT]
GO

CREATE TABLE [dbo].[BIEN_BAN_DEFECT] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [BienBanId] int  NOT NULL,
  [DefectId] int  NULL,
  [MaLoi] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TenLoi] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [DefectType] nvarchar(20) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TenLoiTuNhap] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [MoTa] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SoLuong] int DEFAULT 1 NOT NULL,
  [GhiChu] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SortOrder] int DEFAULT 0 NOT NULL,
  [CreatedAt] datetime2(7) DEFAULT sysdatetime() NOT NULL,
  [TenDoiTuong] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
  [SoLuongKiem] int NULL
)
GO

ALTER TABLE [dbo].[BIEN_BAN_DEFECT] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for BIEN_BAN_HANH_DONG
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[BIEN_BAN_HANH_DONG]') AND type IN ('U'))
	DROP TABLE [dbo].[BIEN_BAN_HANH_DONG]
GO

CREATE TABLE [dbo].[BIEN_BAN_HANH_DONG] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [BienBanId] int  NOT NULL,
  [NoiDung] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [BoPhanId] int  NULL,
  [ThoiHan] date  NULL,
  [TheoDoi] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TheoDoiBy] int NULL,
  [CreatedBy] int  NULL,
  [CreatedAt] datetime2(7) DEFAULT getdate() NULL
)
GO

ALTER TABLE [dbo].[BIEN_BAN_HANH_DONG] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for BIEN_BAN_KIEM
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[BIEN_BAN_KIEM]') AND type IN ('U'))
	DROP TABLE [dbo].[BIEN_BAN_KIEM]
GO

CREATE TABLE [dbo].[BIEN_BAN_KIEM] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [PhieuKiemId] int  NULL,
  [LoaiTrachNhiem] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TrangThai] nvarchar(30) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [KetLuan] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SoBienBan] nvarchar(30) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [NguoiLapId] int  NULL,
  [CreatedAt] datetime2(7) DEFAULT sysdatetime() NULL,
  [MucDoKhongPhuHop] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [MoTaChung] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [AssignConfirmed] bit DEFAULT 0 NULL,
  [LoaiBienBan] nvarchar(20) COLLATE SQL_Latin1_General_CP1_CI_AS DEFAULT 'GENERAL' NULL,
  [MucDoKhongPhuHopConfirmed] bit DEFAULT 0 NOT NULL,
  [DynamicFieldsJSON] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [MauPhieuVersion] varchar(10) DEFAULT 'V01' NOT NULL
)
GO

ALTER TABLE [dbo].[BIEN_BAN_KIEM] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for BIEN_BAN_SXBT_CONFIRM_STEP
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[BIEN_BAN_SXBT_CONFIRM_STEP]') AND type IN ('U'))
	DROP TABLE [dbo].[BIEN_BAN_SXBT_CONFIRM_STEP]
GO

CREATE TABLE [dbo].[BIEN_BAN_SXBT_CONFIRM_STEP] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [BienBanId] int  NOT NULL,
  [MucDo] nchar(1) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [BoPhanId] int  NOT NULL,
  [StepOrder] int  NOT NULL,
  [TrangThai] nvarchar(30) COLLATE SQL_Latin1_General_CP1_CI_AS DEFAULT 'CHO_XAC_NHAN' NOT NULL,
  [ConfirmedBy] int  NULL,
  [ConfirmedAt] datetime2(7)  NULL,
  [CreatedAt] datetime2(7) DEFAULT getdate() NOT NULL
)
GO

ALTER TABLE [dbo].[BIEN_BAN_SXBT_CONFIRM_STEP] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for BIEN_BAN_SXBT_CONFIRM_TEMPLATE
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[BIEN_BAN_SXBT_CONFIRM_TEMPLATE]') AND type IN ('U'))
	DROP TABLE [dbo].[BIEN_BAN_SXBT_CONFIRM_TEMPLATE]
GO

CREATE TABLE [dbo].[BIEN_BAN_SXBT_CONFIRM_TEMPLATE] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [MucDo] nchar(1) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [BoPhanId] int  NOT NULL,
  [StepOrder] int  NOT NULL
)
GO

ALTER TABLE [dbo].[BIEN_BAN_SXBT_CONFIRM_TEMPLATE] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for BIEN_BAN_SXBT_XULY_ROW
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[BIEN_BAN_SXBT_XULY_ROW]') AND type IN ('U'))
	DROP TABLE [dbo].[BIEN_BAN_SXBT_XULY_ROW]
GO

CREATE TABLE [dbo].[BIEN_BAN_SXBT_XULY_ROW] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [BienBanId] int  NOT NULL,
  [MucDo] nchar(1) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [RowCode] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [ChiPhi] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [NoiDung] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TrachNhiem] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [ThoiHan] date  NULL,
  [SortOrder] int  NOT NULL,
  [CreatedAt] datetime2(7) DEFAULT getdate() NOT NULL,
  [UpdatedAt] datetime2(7)  NULL,
  [TieuMuc] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [NguoiNhapId] int  NULL
)
GO

ALTER TABLE [dbo].[BIEN_BAN_SXBT_XULY_ROW] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for BIEN_BAN_XAC_NHAN
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[BIEN_BAN_XAC_NHAN]') AND type IN ('U'))
	DROP TABLE [dbo].[BIEN_BAN_XAC_NHAN]
GO

CREATE TABLE [dbo].[BIEN_BAN_XAC_NHAN] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [BienBanId] int  NOT NULL,
  [NguoiXacNhanId] int  NULL,
  [NoiDung] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [ThoiGian] datetime2(7) DEFAULT sysdatetime() NULL,
  [VaiTro] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL
)
GO

ALTER TABLE [dbo].[BIEN_BAN_XAC_NHAN] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for BIEN_BAN_XU_LY
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[BIEN_BAN_XU_LY]') AND type IN ('U'))
	DROP TABLE [dbo].[BIEN_BAN_XU_LY]
GO

CREATE TABLE [dbo].[BIEN_BAN_XU_LY] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [BienBanId] int  NOT NULL,
  [BoPhan] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [NoiDung] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [DeNghiXuLy] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [ThoiHan] date  NULL,
  [CreatedBy] int  NULL,
  [CreatedAt] datetime2(7) DEFAULT getdate() NULL,
  [NguoiXuLyId] int  NULL,
  [BoPhanId] int  NULL,
  [TheoDoiBy] int  NULL,
  [DeNghiXuLyId] int  NULL,
  [TheoDoi] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TrachNhiem] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL
)
GO

ALTER TABLE [dbo].[BIEN_BAN_XU_LY] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for BienBan_CustomFields
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[BienBan_CustomFields]') AND type IN ('U'))
	DROP TABLE [dbo].[BienBan_CustomFields]
GO

CREATE TABLE [dbo].[BienBan_CustomFields] (
  [BienBanId] int  NOT NULL,
  [FieldName] varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [FieldValue] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL
)
GO

ALTER TABLE [dbo].[BienBan_CustomFields] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for DM_AQL_PLAN
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[DM_AQL_PLAN]') AND type IN ('U'))
	DROP TABLE [dbo].[DM_AQL_PLAN]
GO

CREATE TABLE [dbo].[DM_AQL_PLAN] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [InspectionLevel] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [LotMin] int  NULL,
  [LotMax] int  NULL,
  [SampleSize] int  NULL,
  [Ac_Critical] int  NULL,
  [Re_Critical] int  NULL,
  [Ac_Major] int  NULL,
  [Re_Major] int  NULL,
  [Ac_Minor] int  NULL,
  [Re_Minor] int  NULL
)
GO

ALTER TABLE [dbo].[DM_AQL_PLAN] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for DM_BO_PHAN
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[DM_BO_PHAN]') AND type IN ('U'))
	DROP TABLE [dbo].[DM_BO_PHAN]
GO

CREATE TABLE [dbo].[DM_BO_PHAN] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [MaBoPhan] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TenBoPhan] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TrangThai] bit DEFAULT 1 NULL
)
GO

ALTER TABLE [dbo].[DM_BO_PHAN] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for DM_CHECK_ITEM
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[DM_CHECK_ITEM]') AND type IN ('U'))
	DROP TABLE [dbo].[DM_CHECK_ITEM]
GO

CREATE TABLE [dbo].[DM_CHECK_ITEM] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [NhomKiemId] int  NOT NULL,
  [TenMucKiem] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TieuChuan] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [ThuTu] int  NULL,
  [TrangThai] bit DEFAULT 1 NULL,
  [ThamChieu] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [PhuongPhapKiem] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL
)
GO

ALTER TABLE [dbo].[DM_CHECK_ITEM] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for DM_DE_NGHI_XU_LY
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[DM_DE_NGHI_XU_LY]') AND type IN ('U'))
	DROP TABLE [dbo].[DM_DE_NGHI_XU_LY]
GO

CREATE TABLE [dbo].[DM_DE_NGHI_XU_LY] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [Ten] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL
)
GO

ALTER TABLE [dbo].[DM_DE_NGHI_XU_LY] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for DM_DEFECT
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[DM_DEFECT]') AND type IN ('U'))
	DROP TABLE [dbo].[DM_DEFECT]
GO

CREATE TABLE [dbo].[DM_DEFECT] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [MaLoi] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TenLoi] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [DefectType] nvarchar(20) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TrangThai] bit DEFAULT 1 NULL,
  [MoTa] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [GhiChu] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [PhanHe] nvarchar(20) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [MaNhomLoi] nvarchar(20) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [LoaiLoiSXBT] nvarchar(10) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [PhamViApDung] nvarchar(500) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [ThiTruong] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [ImageUrl] nvarchar(500) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [ThuTu] int  NULL,
  [TenSanPham] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [ChungLoai] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [PhuongAnXuLy] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [ImageUrls] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL
)
GO

ALTER TABLE [dbo].[DM_DEFECT] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for DM_LOAI_KIEM
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[DM_LOAI_KIEM]') AND type IN ('U'))
	DROP TABLE [dbo].[DM_LOAI_KIEM]
GO

CREATE TABLE [dbo].[DM_LOAI_KIEM] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [MaLoai] nvarchar(30) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TenLoai] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL
)
GO

ALTER TABLE [dbo].[DM_LOAI_KIEM] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for DM_NHOM_KIEM
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[DM_NHOM_KIEM]') AND type IN ('U'))
	DROP TABLE [dbo].[DM_NHOM_KIEM]
GO

CREATE TABLE [dbo].[DM_NHOM_KIEM] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [TenNhom] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [MoTa] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [ThuTu] int  NULL,
  [TrangThai] bit DEFAULT 1 NULL
)
GO

ALTER TABLE [dbo].[DM_NHOM_KIEM] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for DM_SAN_PHAM
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[DM_SAN_PHAM]') AND type IN ('U'))
	DROP TABLE [dbo].[DM_SAN_PHAM]
GO

CREATE TABLE [dbo].[DM_SAN_PHAM] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [MaSanPham] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TenSanPham] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [MoTa] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TrangThai] bit DEFAULT 1 NULL,
  [CreatedAt] datetime2(7) DEFAULT sysdatetime() NULL,
  [ImageUrl] nvarchar(500) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [KhachHang] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL
)
GO

ALTER TABLE [dbo].[DM_SAN_PHAM] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for NOTIFICATIONS
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[NOTIFICATIONS]') AND type IN ('U'))
	DROP TABLE [dbo].[NOTIFICATIONS]
GO

CREATE TABLE [dbo].[NOTIFICATIONS] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [UserId] int  NOT NULL,
  [Title] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [Message] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [Type] varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [ReferenceId] int  NULL,
  [IsRead] bit DEFAULT 0 NULL,
  [CreatedAt] datetime DEFAULT getdate() NULL
)
GO

ALTER TABLE [dbo].[NOTIFICATIONS] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for PERMISSIONS
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[PERMISSIONS]') AND type IN ('U'))
	DROP TABLE [dbo].[PERMISSIONS]
GO

CREATE TABLE [dbo].[PERMISSIONS] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [PermissionCode] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [PermissionName] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL
)
GO

ALTER TABLE [dbo].[PERMISSIONS] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for PHIEU_KIEM
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[PHIEU_KIEM]') AND type IN ('U'))
	DROP TABLE [dbo].[PHIEU_KIEM]
GO

CREATE TABLE [dbo].[PHIEU_KIEM] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [SoPhieu] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SanPhamId] int  NOT NULL,
  [LoaiKiemId] int  NOT NULL,
  [Lot] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [DoiTuong] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [NguoiKiemId] int  NULL,
  [CreatedAt] datetime2(7) DEFAULT sysdatetime() NULL,
  [KetLuan] nvarchar(20) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TrangThai] nvarchar(20) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SourceId] int  NULL,
  [SoLuong] int  NULL,
  [NguoiLapId] int  NULL,
  [SourceId_LCD] uniqueidentifier  NULL,
  [Ngay_Giao] datetime2(7)  NULL,
  [NgayKiem] datetime2(7)  NULL,
  [MucDoKiemTra] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL
)
GO

ALTER TABLE [dbo].[PHIEU_KIEM] SET (LOCK_ESCALATION = TABLE)
GO

EXEC sp_addextendedproperty
'MS_Description', N'Ngày giao hàng lịch đóng cont',
'SCHEMA', N'dbo',
'TABLE', N'PHIEU_KIEM',
'COLUMN', N'Ngay_Giao'
GO


-- ----------------------------
-- Table structure for PHIEU_KIEM_BTP_ITEM
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[PHIEU_KIEM_BTP_ITEM]') AND type IN ('U'))
	DROP TABLE [dbo].[PHIEU_KIEM_BTP_ITEM]
GO

CREATE TABLE [dbo].[PHIEU_KIEM_BTP_ITEM] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [PhieuKiemId] int  NOT NULL,
  [ItemCode] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TenSanPham] nvarchar(500) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SoLuong] decimal(18,2)  NULL,
  [DonViTinh] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [MaDonHang] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [DauTuanGS1] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [ThuTu] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [LxvtLot] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SoLotSX] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SoBoHang] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SoCaiBo] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [NgayNhap] datetime  NULL,
  [SoLuongNhap] decimal(18,2)  NULL,
  [SourceID_DonHang] int  NULL,
  [SourceID_DonHang_SanPham] int  NULL,
  [SourceID_DonHang_LoSanXuat] int  NULL,
  [SourceID_KeHoachSanXuat] int  NULL
)
GO

ALTER TABLE [dbo].[PHIEU_KIEM_BTP_ITEM] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for PHIEU_KIEM_BTP_ITEM_LOT
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[PHIEU_KIEM_BTP_ITEM_LOT]') AND type IN ('U'))
	DROP TABLE [dbo].[PHIEU_KIEM_BTP_ITEM_LOT]
GO

CREATE TABLE [dbo].[PHIEU_KIEM_BTP_ITEM_LOT] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [BtpItemId] int  NOT NULL,
  [DauTuanGS1] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [ThuTu] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [LxvtLot] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SoLotSX] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SoLuongNhap] decimal(18,2)  NULL,
  [SortOrder] int DEFAULT 1 NOT NULL,
  [CreatedAt] datetime2(7) DEFAULT sysutcdatetime() NULL,
  [UpdatedAt] datetime2(7)  NULL
)
GO

ALTER TABLE [dbo].[PHIEU_KIEM_BTP_ITEM_LOT] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for PHIEU_KIEM_CHECK_ITEM
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[PHIEU_KIEM_CHECK_ITEM]') AND type IN ('U'))
	DROP TABLE [dbo].[PHIEU_KIEM_CHECK_ITEM]
GO

CREATE TABLE [dbo].[PHIEU_KIEM_CHECK_ITEM] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [SectionId] int  NOT NULL,
  [TenMucKiem] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TieuChuan] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [KetQua] nvarchar(10) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SoLuongLoi] int DEFAULT 0 NULL,
  [ThamChieu] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [PhuongPhapKiem] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [GiaTriDo] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL
)
GO

ALTER TABLE [dbo].[PHIEU_KIEM_CHECK_ITEM] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for PHIEU_KIEM_CUOI_CHUYEN_DEFECT
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[PHIEU_KIEM_CUOI_CHUYEN_DEFECT]') AND type IN ('U'))
	DROP TABLE [dbo].[PHIEU_KIEM_CUOI_CHUYEN_DEFECT]
GO

CREATE TABLE [dbo].[PHIEU_KIEM_CUOI_CHUYEN_DEFECT] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [PlanId] int  NOT NULL,
  [DefectId] int  NOT NULL,
  [SoLuong] int  NOT NULL,
  [SoLuongDatSauSua] int  NULL,
  [SoLuongKhongDatSauSua] int  NULL,
  [GhiChu] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [ImageUrls] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SortOrder] int DEFAULT 1 NOT NULL,
  [CreatedAt] datetime2(7) DEFAULT sysutcdatetime() NOT NULL,
  [UpdatedAt] datetime2(7)  NULL
)
GO

ALTER TABLE [dbo].[PHIEU_KIEM_CUOI_CHUYEN_DEFECT] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for PHIEU_KIEM_CUOI_CHUYEN_PLAN
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[PHIEU_KIEM_CUOI_CHUYEN_PLAN]') AND type IN ('U'))
	DROP TABLE [dbo].[PHIEU_KIEM_CUOI_CHUYEN_PLAN]
GO

CREATE TABLE [dbo].[PHIEU_KIEM_CUOI_CHUYEN_PLAN] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [PhieuKiemId] int  NOT NULL,
  [ID_KeHoachSanXuat] int  NOT NULL,
  [SanPhamId] int  NULL,
  [MaSanPham] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TenSanPham] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TenDonVi] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TenBoPhan] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [NgayKeHoach] date  NULL,
  [SoLuongKeHoach] int  NULL,
  [NangSuatDuKien] int  NULL,
  [DaSanXuat] int  NULL,
  [SortOrder] int DEFAULT 1 NOT NULL,
  [CreatedAt] datetime2(7) DEFAULT sysutcdatetime() NOT NULL,
  [UpdatedAt] datetime2(7)  NULL
)
GO

ALTER TABLE [dbo].[PHIEU_KIEM_CUOI_CHUYEN_PLAN] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for PHIEU_KIEM_DEFECT
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[PHIEU_KIEM_DEFECT]') AND type IN ('U'))
	DROP TABLE [dbo].[PHIEU_KIEM_DEFECT]
GO

CREATE TABLE [dbo].[PHIEU_KIEM_DEFECT] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [SectionId] int  NOT NULL,
  [DefectId] int  NULL,
  [DefectType] nvarchar(20) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SoLuong] int  NOT NULL,
  [CheckItemId] int  NULL,
  [ImageUrls] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [IsLapLai] bit DEFAULT 0 NULL
)
GO

ALTER TABLE [dbo].[PHIEU_KIEM_DEFECT] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for PHIEU_KIEM_SECTION
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[PHIEU_KIEM_SECTION]') AND type IN ('U'))
	DROP TABLE [dbo].[PHIEU_KIEM_SECTION]
GO

CREATE TABLE [dbo].[PHIEU_KIEM_SECTION] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [PhieuKiemId] int  NOT NULL,
  [TenNhom] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TongSo] int  NULL,
  [SoLuongKiem] int  NULL,
  [InspectionLevel] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [Ac_Critical] int  NULL,
  [Re_Critical] int  NULL,
  [Ac_Major] int  NULL,
  [Re_Major] int  NULL,
  [Ac_Minor] int  NULL,
  [Re_Minor] int  NULL,
  [TotalCritical] int DEFAULT 0 NULL,
  [TotalMajor] int DEFAULT 0 NULL,
  [TotalMinor] int DEFAULT 0 NULL,
  [KetLuan] nvarchar(20) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL
)
GO

ALTER TABLE [dbo].[PHIEU_KIEM_SECTION] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for PHIEU_KIEM_SXBT_SUMMARY
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[PHIEU_KIEM_SXBT_SUMMARY]') AND type IN ('U'))
	DROP TABLE [dbo].[PHIEU_KIEM_SXBT_SUMMARY]
GO

CREATE TABLE [dbo].[PHIEU_KIEM_SXBT_SUMMARY] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [PhieuKiemId] int  NOT NULL,
  [LoaiMau] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SoLuongMau] int  NULL,
  [TyLe] decimal(5,2)  NULL,
  [TyLeDat] decimal(5,2)  NULL,
  [TyLeLoiNghiemTrong] decimal(5,2)  NULL,
  [TyLeLoiNangNhe] decimal(5,2)  NULL
)
GO

ALTER TABLE [dbo].[PHIEU_KIEM_SXBT_SUMMARY] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for PHIEU_KIEM_THONG_SO_KQ
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[PHIEU_KIEM_THONG_SO_KQ]') AND type IN ('U'))
	DROP TABLE [dbo].[PHIEU_KIEM_THONG_SO_KQ]
GO

CREATE TABLE [dbo].[PHIEU_KIEM_THONG_SO_KQ] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [PhieuKiemId] int  NOT NULL,
  [ThongSoId] int  NOT NULL,
  [ThuTuMau] int  NOT NULL,
  [GiaTriDo] float(53)  NULL,
  [GhiChu] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL
)
GO

ALTER TABLE [dbo].[PHIEU_KIEM_THONG_SO_KQ] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for PHIEU_KIEM_TREN_CHUYEN_ENTRY
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[PHIEU_KIEM_TREN_CHUYEN_ENTRY]') AND type IN ('U'))
	DROP TABLE [dbo].[PHIEU_KIEM_TREN_CHUYEN_ENTRY]
GO

CREATE TABLE [dbo].[PHIEU_KIEM_TREN_CHUYEN_ENTRY] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [SlotId] int  NOT NULL,
  [CongDoan] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [GhiChu] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SortOrder] int DEFAULT 0 NOT NULL,
  [CreatedAt] datetime2(7) DEFAULT sysdatetime() NOT NULL,
  [UpdatedAt] datetime2(7) DEFAULT sysdatetime() NOT NULL,
  [NguoiGhiNhanId] int  NULL,
  [TenCongNhanGayLoi] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL
)
GO

ALTER TABLE [dbo].[PHIEU_KIEM_TREN_CHUYEN_ENTRY] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT]') AND type IN ('U'))
	DROP TABLE [dbo].[PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT]
GO

CREATE TABLE [dbo].[PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [EntryId] int  NOT NULL,
  [DefectId] int  NOT NULL,
  [SoLuong] int  NOT NULL,
  [GhiChu] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SortOrder] int DEFAULT 0 NOT NULL,
  [CreatedAt] datetime2(7) DEFAULT sysdatetime() NOT NULL,
  [ImageUrls] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [SoLuongDatSauSua] int  NULL,
  [SoLuongKhongDatSauSua] int  NULL
)
GO

ALTER TABLE [dbo].[PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for PHIEU_KIEM_TREN_CHUYEN_SLOT
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[PHIEU_KIEM_TREN_CHUYEN_SLOT]') AND type IN ('U'))
	DROP TABLE [dbo].[PHIEU_KIEM_TREN_CHUYEN_SLOT]
GO

CREATE TABLE [dbo].[PHIEU_KIEM_TREN_CHUYEN_SLOT] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [PhieuKiemId] int  NOT NULL,
  [GioKiem] nvarchar(20) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [SortOrder] int DEFAULT 0 NOT NULL,
  [CreatedAt] datetime2(7) DEFAULT sysdatetime() NOT NULL,
  [UpdatedAt] datetime2(7) DEFAULT sysdatetime() NOT NULL
)
GO

ALTER TABLE [dbo].[PHIEU_KIEM_TREN_CHUYEN_SLOT] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for PHIEU_KIEM_XAC_NHAN
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[PHIEU_KIEM_XAC_NHAN]') AND type IN ('U'))
	DROP TABLE [dbo].[PHIEU_KIEM_XAC_NHAN]
GO

CREATE TABLE [dbo].[PHIEU_KIEM_XAC_NHAN] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [PhieuKiemId] int  NULL,
  [NguoiXacNhanId] int  NULL,
  [VaiTro] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TrangThai] nvarchar(20) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [NoiDung] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [ThoiGian] datetime2(7)  NULL
)
GO

ALTER TABLE [dbo].[PHIEU_KIEM_XAC_NHAN] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for PhieuKiem_CustomFields
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[PhieuKiem_CustomFields]') AND type IN ('U'))
	DROP TABLE [dbo].[PhieuKiem_CustomFields]
GO

CREATE TABLE [dbo].[PhieuKiem_CustomFields] (
  [PhieuKiemId] int  NOT NULL,
  [FieldName] varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [FieldValue] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL
)
GO

ALTER TABLE [dbo].[PhieuKiem_CustomFields] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for ROLE_PERMISSION
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[ROLE_PERMISSION]') AND type IN ('U'))
	DROP TABLE [dbo].[ROLE_PERMISSION]
GO

CREATE TABLE [dbo].[ROLE_PERMISSION] (
  [RoleId] int  NOT NULL,
  [PermissionId] int  NOT NULL
)
GO

ALTER TABLE [dbo].[ROLE_PERMISSION] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for ROLES
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[ROLES]') AND type IN ('U'))
	DROP TABLE [dbo].[ROLES]
GO

CREATE TABLE [dbo].[ROLES] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [RoleCode] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [RoleName] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL
)
GO

ALTER TABLE [dbo].[ROLES] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for SAN_PHAM_NHOM_KIEM
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[SAN_PHAM_NHOM_KIEM]') AND type IN ('U'))
	DROP TABLE [dbo].[SAN_PHAM_NHOM_KIEM]
GO

CREATE TABLE [dbo].[SAN_PHAM_NHOM_KIEM] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [SanPhamId] int  NOT NULL,
  [NhomKiemId] int  NOT NULL,
  [BatBuoc] bit DEFAULT 1 NULL,
  [ThuTu] int DEFAULT 0 NULL,
  [TrangThai] bit DEFAULT 1 NULL
)
GO

ALTER TABLE [dbo].[SAN_PHAM_NHOM_KIEM] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for SAN_PHAM_THONG_SO
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[SAN_PHAM_THONG_SO]') AND type IN ('U'))
	DROP TABLE [dbo].[SAN_PHAM_THONG_SO]
GO

CREATE TABLE [dbo].[SAN_PHAM_THONG_SO] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [SanPhamId] int  NOT NULL,
  [NhomThongSo] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TenThongSo] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [GiaTriChuan] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [DungSaiAm] float(53)  NOT NULL,
  [DungSaiDuong] float(53)  NOT NULL,
  [DonVi] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [ThuTu] int DEFAULT 0 NULL
)
GO

ALTER TABLE [dbo].[SAN_PHAM_THONG_SO] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for TRA_LOI_Y_KIEN
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[TRA_LOI_Y_KIEN]') AND type IN ('U'))
	DROP TABLE [dbo].[TRA_LOI_Y_KIEN]
GO

CREATE TABLE [dbo].[TRA_LOI_Y_KIEN] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [XinYKienId] int  NOT NULL,
  [NguoiTraLoiId] int  NULL,
  [NoiDung] nvarchar(max) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [ThoiGian] datetime2(7) DEFAULT sysdatetime() NULL,
  [LuaChon] varchar(10) NULL
)
GO

ALTER TABLE [dbo].[TRA_LOI_Y_KIEN] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for USER_PUSH_TOKENS
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[USER_PUSH_TOKENS]') AND type IN ('U'))
	DROP TABLE [dbo].[USER_PUSH_TOKENS]
GO

CREATE TABLE [dbo].[USER_PUSH_TOKENS] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [UserId] int  NOT NULL,
  [ExpoPushToken] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [CreatedAt] datetime DEFAULT getdate() NULL
)
GO

ALTER TABLE [dbo].[USER_PUSH_TOKENS] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for USER_ROLE
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[USER_ROLE]') AND type IN ('U'))
	DROP TABLE [dbo].[USER_ROLE]
GO

CREATE TABLE [dbo].[USER_ROLE] (
  [UserId] int  NOT NULL,
  [RoleId] int  NOT NULL
)
GO

ALTER TABLE [dbo].[USER_ROLE] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for USERS
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[USERS]') AND type IN ('U'))
	DROP TABLE [dbo].[USERS]
GO

CREATE TABLE [dbo].[USERS] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [Username] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [PasswordHash] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NOT NULL,
  [FullName] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [Email] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [BoPhan] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TrangThai] bit DEFAULT 1 NULL,
  [CreatedAt] datetime2(7) DEFAULT sysdatetime() NULL,
  [BoPhanId] int  NULL,
  [AllowedLoaiKiemIds] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL
)
GO

ALTER TABLE [dbo].[USERS] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- Table structure for XIN_Y_KIEN
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[XIN_Y_KIEN]') AND type IN ('U'))
	DROP TABLE [dbo].[XIN_Y_KIEN]
GO

CREATE TABLE [dbo].[XIN_Y_KIEN] (
  [Id] int  IDENTITY(1,1) NOT NULL,
  [BienBanId] int  NOT NULL,
  [BoPhan] nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [TrangThai] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS  NULL,
  [CreatedAt] datetime2(7) DEFAULT sysdatetime() NULL,
  [BoPhanId] int NULL,
  [ThuTu] int DEFAULT 0 NOT NULL
)
GO

ALTER TABLE [dbo].[XIN_Y_KIEN] SET (LOCK_ESCALATION = TABLE)
GO


-- ----------------------------
-- procedure structure for SP_PhieuKiem_My
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[SP_PhieuKiem_My]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[SP_PhieuKiem_My]
GO

CREATE PROCEDURE [dbo].[SP_PhieuKiem_My]
(
    @UserId INT,
    @Mode NVARCHAR(50)
)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        pk.Id,
        pk.SoPhieu,
        pk.Lot,
        pk.LoaiKiemId,
        pk.DoiTuong,
        pk.CreatedAt,
        pk.KetLuan,
        pk.TrangThai,
        pk.SoLuong,
        pk.Ngay_Giao,
        sp.MaSanPham,
        sp.TenSanPham,
        u.FullName AS TenNguoiKiem,
        lk.TenLoai AS TenLoaiKiem,
        CASE
            WHEN pk.TrangThai = 'DA_TAO_SECTION' THEN N'Chưa kiểm'
            WHEN pk.TrangThai = 'DANG_KIEM' THEN N'Đang kiểm'
            WHEN pk.TrangThai = 'CHO_XUONG_XAC_NHAN' THEN N'Chờ Trưởng bộ phận'
            WHEN pk.TrangThai = 'CHO_KIEM_NGHIEM' THEN N'Chờ Trưởng bộ phận'
            WHEN pk.TrangThai = 'HOAN_TAT' THEN N'Hoàn tất'
        END AS TrangThaiText
    FROM PHIEU_KIEM pk
    LEFT JOIN DM_SAN_PHAM sp ON pk.SanPhamId = sp.Id
    LEFT JOIN USERS u ON u.Id = pk.NguoiKiemId
    LEFT JOIN USERS u1 ON u1.Id = @UserId
    LEFT JOIN DM_LOAI_KIEM lk ON lk.Id = pk.LoaiKiemId
    LEFT JOIN DM_BO_PHAN bp ON u.BoPhanId = bp.Id
    LEFT JOIN DM_BO_PHAN bp1 ON u1.BoPhanId = bp1.Id
    WHERE
    (
        (@Mode = 'KCS'
            AND pk.NguoiKiemId = @UserId
            AND pk.TrangThai IN ('TAO_MOI','DA_TAO_SECTION','DANG_KIEM'))
        OR
        (@Mode = 'TO_TRUONG_KCS'
            AND u.BoPhanId = u1.BoPhanId)
        OR
        (@Mode = 'PX'
            AND pk.TrangThai = 'CHO_XUONG_XAC_NHAN')
        OR
        (@Mode = 'VIEW')
    )
    AND
    (
        NULLIF(LTRIM(RTRIM(u1.AllowedLoaiKiemIds)), '') IS NULL
        OR EXISTS (
            SELECT 1
            FROM STRING_SPLIT(u1.AllowedLoaiKiemIds, ',') allowed
            WHERE TRY_CONVERT(INT, LTRIM(RTRIM(allowed.value))) = pk.LoaiKiemId
        )
    )
    ORDER BY pk.CreatedAt DESC;
END
GO


-- ----------------------------
-- procedure structure for sp_DM_DeleteDefect
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_DeleteDefect]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_DeleteDefect]
GO

CREATE PROCEDURE [dbo].[sp_DM_DeleteDefect]
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Check đã sử dụng chưa
    IF EXISTS (
        SELECT 1 
        FROM PHIEU_KIEM_DEFECT 
        WHERE DefectId = @Id
    )
    BEGIN
        RAISERROR(N'Danh mục lỗi đã được sử dụng',16,1);
        RETURN;
    END

    UPDATE DM_DEFECT
    SET TrangThai = 0
    WHERE Id = @Id;
END
GO


-- ----------------------------
-- procedure structure for sp_DM_GetNhomKiemList
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_GetNhomKiemList]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_GetNhomKiemList]
GO

CREATE PROCEDURE [dbo].[sp_DM_GetNhomKiemList]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        Id,
        TenNhom,
        MoTa,
        ThuTu,
        TrangThai
    FROM DM_NHOM_KIEM
    WHERE TrangThai = 1
    ORDER BY ThuTu;
END
GO


-- ----------------------------
-- procedure structure for sp_DM_CreateNhomKiem
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_CreateNhomKiem]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_CreateNhomKiem]
GO

CREATE PROCEDURE [dbo].[sp_DM_CreateNhomKiem]
    @TenNhom NVARCHAR(255),
    @MoTa NVARCHAR(MAX),
    @ThuTu INT
AS
BEGIN
    INSERT INTO DM_NHOM_KIEM (
        TenNhom,
        MoTa,
        ThuTu,
        TrangThai
    )
    VALUES (
        @TenNhom,
        @MoTa,
        @ThuTu,
        1
    );
END
GO


-- ----------------------------
-- procedure structure for sp_DM_UpdateNhomKiem
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_UpdateNhomKiem]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_UpdateNhomKiem]
GO

CREATE PROCEDURE [dbo].[sp_DM_UpdateNhomKiem]
    @Id INT,
    @TenNhom NVARCHAR(255),
    @MoTa NVARCHAR(MAX),
    @ThuTu INT,
    @TrangThai BIT
AS
BEGIN
    UPDATE DM_NHOM_KIEM
    SET
        TenNhom = @TenNhom,
        MoTa = @MoTa,
        ThuTu = @ThuTu,
        TrangThai = @TrangThai
    WHERE Id = @Id;
END
GO


-- ----------------------------
-- procedure structure for sp_DM_GetCheckItemList
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_GetCheckItemList]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_GetCheckItemList]
GO

CREATE PROCEDURE [dbo].[sp_DM_GetCheckItemList]
    @NhomKiemId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        Id,
        NhomKiemId,
        TenMucKiem,
        ThamChieu,
        PhuongPhapKiem,
        TieuChuan,
        ThuTu,
        TrangThai
    FROM DM_CHECK_ITEM
    WHERE TrangThai = 1
      AND (@NhomKiemId IS NULL OR NhomKiemId = @NhomKiemId)
    ORDER BY ThuTu;
END
GO


-- ----------------------------
-- procedure structure for sp_DM_CreateCheckItem
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_CreateCheckItem]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_CreateCheckItem]
GO

CREATE PROCEDURE [dbo].[sp_DM_CreateCheckItem]
    @NhomKiemId INT,
    @TenMucKiem NVARCHAR(255),
    @ThamChieu NVARCHAR(MAX),
    @PhuongPhapKiem NVARCHAR(MAX),
    @TieuChuan NVARCHAR(MAX),
    @ThuTu INT
AS
BEGIN
    INSERT INTO DM_CHECK_ITEM (
        NhomKiemId,
        TenMucKiem,
        ThamChieu,
        PhuongPhapKiem,
        TieuChuan,
        ThuTu,
        TrangThai
    )
    VALUES (
        @NhomKiemId,
        @TenMucKiem,
        @ThamChieu,
        @PhuongPhapKiem,
        @TieuChuan,
        @ThuTu,
        1
    );
END
GO


-- ----------------------------
-- procedure structure for sp_DM_UpdateCheckItem
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_UpdateCheckItem]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_UpdateCheckItem]
GO

CREATE PROCEDURE [dbo].[sp_DM_UpdateCheckItem]
    @Id INT,
    @TenMucKiem NVARCHAR(255),
    @TieuChuan NVARCHAR(MAX),
    @ThamChieu NVARCHAR(MAX),
    @PhuongPhapKiem NVARCHAR(MAX),    
    @ThuTu INT,
    @TrangThai BIT
AS
BEGIN
    UPDATE DM_CHECK_ITEM
    SET
        TenMucKiem = @TenMucKiem,
        ThamChieu = @ThamChieu,
        PhuongPhapKiem = @PhuongPhapKiem,
        TieuChuan = @TieuChuan,
        ThuTu = @ThuTu,
        TrangThai = @TrangThai
    WHERE Id = @Id;
END
GO


-- ----------------------------
-- procedure structure for sp_DM_GetSanPhamList
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_GetSanPhamList]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_GetSanPhamList]
GO

CREATE PROCEDURE [dbo].[sp_DM_GetSanPhamList]
    @Page INT = 0,
    @PageSize INT = 20,
    @Keyword NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.DM_SAN_PHAM
    WHERE
        @Keyword IS NULL
        OR MaSanPham LIKE '%' + @Keyword + '%'
        OR TenSanPham LIKE '%' + @Keyword + '%'
        OR KhachHang LIKE '%' + @Keyword + '%'
    ORDER BY Id
    OFFSET (@Page * @PageSize) ROWS
    FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS Total
    FROM dbo.DM_SAN_PHAM
    WHERE
        @Keyword IS NULL
        OR MaSanPham LIKE '%' + @Keyword + '%'
        OR TenSanPham LIKE '%' + @Keyword + '%'
        OR KhachHang LIKE '%' + @Keyword + '%';
END;
GO


-- ----------------------------
-- procedure structure for sp_DM_CreateSanPham
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_CreateSanPham]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_CreateSanPham]
GO

CREATE PROCEDURE [dbo].[sp_DM_CreateSanPham]
    @MaSanPham NVARCHAR(50),
    @TenSanPham NVARCHAR(255),
    @MoTa NVARCHAR(MAX),
    @ImageUrl NVARCHAR(500) = NULL,
    @KhachHang NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM dbo.DM_SAN_PHAM
        WHERE MaSanPham = @MaSanPham
          AND TrangThai = 1
    )
    BEGIN
        RAISERROR(N'Mã sản phẩm đã tồn tại', 16, 1);
        RETURN;
    END;

    INSERT INTO dbo.DM_SAN_PHAM (
        MaSanPham,
        TenSanPham,
        MoTa,
        ImageUrl,
        KhachHang,
        TrangThai,
        CreatedAt
    )
    VALUES (
        @MaSanPham,
        @TenSanPham,
        @MoTa,
        NULLIF(LTRIM(RTRIM(@ImageUrl)), ''),
        NULLIF(LTRIM(RTRIM(@KhachHang)), ''),
        1,
        SYSDATETIME()
    );
END;
GO


-- ----------------------------
-- procedure structure for sp_User_Register_WithRole
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_User_Register_WithRole]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_User_Register_WithRole]
GO

CREATE PROCEDURE [dbo].[sp_User_Register_WithRole]
    @Username NVARCHAR(50),
    @PasswordHash NVARCHAR(255),
    @FullName NVARCHAR(255),
    @Email NVARCHAR(255),
    @BoPhan NVARCHAR(100),
    @RoleId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRAN;

        -- 1. Check trùng username
        IF EXISTS (SELECT 1 FROM USERS WHERE Username = @Username)
        BEGIN
            RAISERROR(N'USERNAME_EXISTS', 16, 1);
            ROLLBACK TRAN;
            RETURN;
        END

        -- 2. Tạo user
        INSERT INTO USERS (Username, PasswordHash, FullName, Email, BoPhan)
        VALUES (@Username, @PasswordHash, @FullName, @Email, @BoPhan);

        DECLARE @UserId INT = SCOPE_IDENTITY();

        -- 3. Nếu không truyền RoleId → lấy role KCS
        IF @RoleId IS NULL
        BEGIN
            SELECT @RoleId = Id
            FROM ROLES
            WHERE RoleCode = N'KCS';
        END

        -- 4. Gán role cho user
        INSERT INTO USER_ROLE (UserId, RoleId)
        VALUES (@UserId, @RoleId);

        COMMIT TRAN;

        SELECT @UserId AS UserId, @RoleId AS RoleId;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        THROW;
    END CATCH
END
GO


-- ----------------------------
-- procedure structure for sp_DM_UpdateSanPham
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_UpdateSanPham]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_UpdateSanPham]
GO

CREATE PROCEDURE [dbo].[sp_DM_UpdateSanPham]
    @Id INT,
    @MaSanPham NVARCHAR(50),
    @TenSanPham NVARCHAR(255),
    @MoTa NVARCHAR(MAX),
    @ImageUrl NVARCHAR(500) = NULL,
    @KhachHang NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM dbo.DM_SAN_PHAM
        WHERE MaSanPham = @MaSanPham
          AND Id <> @Id
          AND TrangThai = 1
    )
    BEGIN
        RAISERROR(N'Mã sản phẩm đã tồn tại', 16, 1);
        RETURN;
    END;

    UPDATE dbo.DM_SAN_PHAM
    SET
        MaSanPham = @MaSanPham,
        TenSanPham = @TenSanPham,
        MoTa = @MoTa,
        ImageUrl = NULLIF(LTRIM(RTRIM(@ImageUrl)), ''),
        KhachHang = NULLIF(LTRIM(RTRIM(@KhachHang)), '')
    WHERE Id = @Id;
END;
GO


-- ----------------------------
-- procedure structure for sp_User_GetRoles
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_User_GetRoles]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_User_GetRoles]
GO

CREATE PROCEDURE [dbo].[sp_User_GetRoles]
    @UserId INT
AS
BEGIN
    SELECT
        r.Id,
        r.RoleCode,
        r.RoleName
    FROM USER_ROLE ur
    JOIN ROLES r ON ur.RoleId = r.Id
    WHERE ur.UserId = @UserId;
END
GO


-- ----------------------------
-- procedure structure for sp_DM_DeleteSanPham
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_DeleteSanPham]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_DeleteSanPham]
GO

CREATE PROCEDURE [dbo].[sp_DM_DeleteSanPham]
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM SAN_PHAM_NHOM_KIEM
        WHERE SanPhamId = @Id
    )
    BEGIN
        RAISERROR(N'Sản phẩm đã được sử dụng',16,1);
        RETURN;
    END

    UPDATE DM_SAN_PHAM
    SET TrangThai = 0
    WHERE Id = @Id
END
GO


-- ----------------------------
-- procedure structure for sp_SANPHAM_GetNhomKiemBySanPham
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_SANPHAM_GetNhomKiemBySanPham]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_SANPHAM_GetNhomKiemBySanPham]
GO

CREATE PROCEDURE [dbo].[sp_SANPHAM_GetNhomKiemBySanPham]
    @SanPhamId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        spnk.Id,
        spnk.SanPhamId,
        spnk.NhomKiemId,
        nk.TenNhom,
        spnk.BatBuoc,
        spnk.ThuTu,
        spnk.TrangThai
    FROM SAN_PHAM_NHOM_KIEM spnk
    JOIN DM_NHOM_KIEM nk
        ON nk.Id = spnk.NhomKiemId
    WHERE spnk.SanPhamId = @SanPhamId
      AND spnk.TrangThai = 1
    ORDER BY spnk.ThuTu
END
GO


-- ----------------------------
-- procedure structure for sp_User_GetPermissions
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_User_GetPermissions]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_User_GetPermissions]
GO

CREATE PROCEDURE [dbo].[sp_User_GetPermissions]
    @UserId INT
AS
BEGIN
    SELECT DISTINCT
        p.PermissionCode
    FROM USER_ROLE ur
    JOIN ROLE_PERMISSION rp ON ur.RoleId = rp.RoleId
    JOIN PERMISSIONS p ON rp.PermissionId = p.Id
    WHERE ur.UserId = @UserId;
END
GO


-- ----------------------------
-- procedure structure for sp_DM_SanPhamThongSo_Get
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_SanPhamThongSo_Get]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_SanPhamThongSo_Get]
GO

CREATE PROCEDURE [dbo].[sp_DM_SanPhamThongSo_Get]
    @SanPhamId INT
AS
BEGIN
    SELECT 
        Id, SanPhamId, NhomThongSo, TenThongSo, GiaTriChuan, DungSaiAm, DungSaiDuong, DonVi, ThuTu
    FROM SAN_PHAM_THONG_SO
    WHERE SanPhamId = @SanPhamId
    ORDER BY ThuTu ASC, NhomThongSo ASC, Id ASC
END
GO


-- ----------------------------
-- procedure structure for sp_SANPHAM_AddNhomKiem
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_SANPHAM_AddNhomKiem]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_SANPHAM_AddNhomKiem]
GO

CREATE PROCEDURE [dbo].[sp_SANPHAM_AddNhomKiem]
    @SanPhamId INT,
    @NhomKiemId INT,
    @BatBuoc BIT,
    @ThuTu INT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM SAN_PHAM_NHOM_KIEM
        WHERE SanPhamId = @SanPhamId
        AND NhomKiemId = @NhomKiemId
        AND TrangThai = 1
    )
    BEGIN
        RAISERROR(N'Nhóm kiểm đã tồn tại trong sản phẩm',16,1)
        RETURN
    END

    INSERT INTO SAN_PHAM_NHOM_KIEM
    (
        SanPhamId,
        NhomKiemId,
        BatBuoc,
        ThuTu,
        TrangThai
    )
    VALUES
    (
        @SanPhamId,
        @NhomKiemId,
        @BatBuoc,
        @ThuTu,
        1
    )
END
GO


-- ----------------------------
-- procedure structure for sp_DM_SanPhamThongSo_Save
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_SanPhamThongSo_Save]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_SanPhamThongSo_Save]
GO

CREATE PROCEDURE [dbo].[sp_DM_SanPhamThongSo_Save]
    @Id INT = NULL,
    @SanPhamId INT,
    @NhomThongSo NVARCHAR(100),
    @TenThongSo NVARCHAR(100) = NULL,
    @GiaTriChuan NVARCHAR(100),
    @DungSaiAm FLOAT,
    @DungSaiDuong FLOAT,
    @DonVi NVARCHAR(50) = NULL,
    @ThuTu INT = 0
AS
BEGIN
    IF @Id IS NOT NULL AND @Id > 0
    BEGIN
        UPDATE SAN_PHAM_THONG_SO
        SET SanPhamId = @SanPhamId,
            NhomThongSo = @NhomThongSo,
            TenThongSo = @TenThongSo,
            GiaTriChuan = @GiaTriChuan,
            DungSaiAm = @DungSaiAm,
            DungSaiDuong = @DungSaiDuong,
            DonVi = @DonVi,
            ThuTu = @ThuTu
        WHERE Id = @Id
        SELECT @Id AS InsertedId
    END
    ELSE
    BEGIN
        INSERT INTO SAN_PHAM_THONG_SO (SanPhamId, NhomThongSo, TenThongSo, GiaTriChuan, DungSaiAm, DungSaiDuong, DonVi, ThuTu)
        VALUES (@SanPhamId, @NhomThongSo, @TenThongSo, @GiaTriChuan, @DungSaiAm, @DungSaiDuong, @DonVi, @ThuTu)
        
        SELECT SCOPE_IDENTITY() AS InsertedId
    END
END
GO


-- ----------------------------
-- procedure structure for sp_SANPHAM_UpdateNhomKiem
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_SANPHAM_UpdateNhomKiem]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_SANPHAM_UpdateNhomKiem]
GO

CREATE PROCEDURE [dbo].[sp_SANPHAM_UpdateNhomKiem]
    @Id INT,
    @BatBuoc BIT,
    @ThuTu INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE SAN_PHAM_NHOM_KIEM
    SET
        BatBuoc = @BatBuoc,
        ThuTu = @ThuTu
    WHERE Id = @Id
END
GO


-- ----------------------------
-- procedure structure for sp_DM_SanPhamThongSo_Delete
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_SanPhamThongSo_Delete]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_SanPhamThongSo_Delete]
GO

CREATE PROCEDURE [dbo].[sp_DM_SanPhamThongSo_Delete]
    @Id INT
AS
BEGIN
    DELETE FROM PHIEU_KIEM_THONG_SO_KQ WHERE ThongSoId = @Id;
    DELETE FROM SAN_PHAM_THONG_SO WHERE Id = @Id;
END
GO


-- ----------------------------
-- procedure structure for sp_SANPHAM_DeleteNhomKiem
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_SANPHAM_DeleteNhomKiem]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_SANPHAM_DeleteNhomKiem]
GO

CREATE PROCEDURE [dbo].[sp_SANPHAM_DeleteNhomKiem]
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE SAN_PHAM_NHOM_KIEM
    SET TrangThai = 0
    WHERE Id = @Id
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_ThongSo_GetResults
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_ThongSo_GetResults]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_ThongSo_GetResults]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_ThongSo_GetResults]
    @PhieuKiemId INT
AS
BEGIN
    -- Lấy thông tin phiếu kiểm để biết SanPhamId
    DECLARE @SanPhamId INT;
    SELECT @SanPhamId = SanPhamId FROM PHIEU_KIEM WHERE Id = @PhieuKiemId;

    -- Trả về bảng 1: Danh sách các thông số chuẩn của sản phẩm đó
    SELECT 
        Id, SanPhamId, NhomThongSo, TenThongSo, GiaTriChuan, DungSaiAm, DungSaiDuong, DonVi, ThuTu
    FROM SAN_PHAM_THONG_SO
    WHERE SanPhamId = @SanPhamId
    ORDER BY ThuTu ASC, NhomThongSo ASC, Id ASC;

    -- Trả về bảng 2: Các kết quả đo đã nhập
    SELECT 
        Id, PhieuKiemId, ThongSoId, ThuTuMau, GiaTriDo, GhiChu
    FROM PHIEU_KIEM_THONG_SO_KQ
    WHERE PhieuKiemId = @PhieuKiemId
    ORDER BY ThuTuMau ASC, ThongSoId ASC;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_ThongSo_SaveResult
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_ThongSo_SaveResult]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_ThongSo_SaveResult]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_ThongSo_SaveResult]
    @PhieuKiemId INT,
    @ThongSoId INT,
    @ThuTuMau INT,
    @GiaTriDo FLOAT,
    @GhiChu NVARCHAR(255) = NULL
AS
BEGIN
    DECLARE @Id INT;
    SELECT @Id = Id FROM PHIEU_KIEM_THONG_SO_KQ 
    WHERE PhieuKiemId = @PhieuKiemId AND ThongSoId = @ThongSoId AND ThuTuMau = @ThuTuMau;

    IF @Id IS NOT NULL
    BEGIN
        UPDATE PHIEU_KIEM_THONG_SO_KQ
        SET GiaTriDo = @GiaTriDo,
            GhiChu = @GhiChu
        WHERE Id = @Id;
    END
    ELSE
    BEGIN
        INSERT INTO PHIEU_KIEM_THONG_SO_KQ (PhieuKiemId, ThongSoId, ThuTuMau, GiaTriDo, GhiChu)
        VALUES (@PhieuKiemId, @ThongSoId, @ThuTuMau, @GiaTriDo, @GhiChu);
    END
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_XacNhanPX
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_XacNhanPX]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_XacNhanPX]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_XacNhanPX]
    @PhieuKiemId INT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO PHIEU_KIEM_XAC_NHAN
    (
        PhieuKiemId,
        NguoiXacNhanId,
        VaiTro,
        TrangThai,
        ThoiGian
    )
    VALUES
    (
        @PhieuKiemId,
        @UserId,
        'PX',
        'DONG_Y',
        GETDATE()
    );

    UPDATE PHIEU_KIEM
    SET TrangThai = 'HOAN_TAT'
    WHERE Id = @PhieuKiemId;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_XacNhanKiemNghiem
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_XacNhanKiemNghiem]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_XacNhanKiemNghiem]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_XacNhanKiemNghiem]
    @PhieuKiemId INT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO PHIEU_KIEM_XAC_NHAN
    (
        PhieuKiemId,
        NguoiXacNhanId,
        VaiTro,
        TrangThai,
        ThoiGian
    )
    VALUES
    (
        @PhieuKiemId,
        @UserId,
        'KIEM_NGHIEM',
        'DONG_Y',
        GETDATE()
    );

    UPDATE PHIEU_KIEM
    SET TrangThai = 'HOAN_TAT'
    WHERE Id = @PhieuKiemId;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_SXBT_Save
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_SXBT_Save]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_SXBT_Save]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_SXBT_Save]
    @PhieuKiemId INT,
    @DynamicFieldsJson NVARCHAR(MAX),
    @BtpItemsJson NVARCHAR(MAX),
    @SummaryJson NVARCHAR(MAX),
    @DefectsJson NVARCHAR(MAX),
    @KetLuan NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRAN;
    BEGIN TRY
        IF @DynamicFieldsJson IS NOT NULL AND @DynamicFieldsJson != '[]' AND @DynamicFieldsJson != 'null'
        BEGIN
            DELETE FROM PhieuKiem_CustomFields
            WHERE PhieuKiemId = @PhieuKiemId AND FieldName IN (
                SELECT JSON_VALUE(value, '$.FieldCode') FROM OPENJSON(@DynamicFieldsJson)
            );

            INSERT INTO PhieuKiem_CustomFields (PhieuKiemId, FieldName, FieldValue)
            SELECT @PhieuKiemId, FieldCode, Value
            FROM OPENJSON(@DynamicFieldsJson)
            WITH (
                FieldCode VARCHAR(50) '$.FieldCode',
                Value NVARCHAR(MAX) '$.Value'
            );
        END

        IF @BtpItemsJson IS NOT NULL AND @BtpItemsJson != '[]' AND @BtpItemsJson != 'null'
        BEGIN
            IF OBJECT_ID('tempdb..#BtpItems') IS NOT NULL DROP TABLE #BtpItems;
            IF OBJECT_ID('tempdb..#LotRows') IS NOT NULL DROP TABLE #LotRows;

            SELECT *
            INTO #BtpItems
            FROM OPENJSON(@BtpItemsJson)
            WITH (
                Id INT '$.Id',
                DauTuanGS1 NVARCHAR(100) '$.DauTuanGS1',
                ThuTu NVARCHAR(50) '$.ThuTu',
                LxvtLot NVARCHAR(100) '$.LxvtLot',
                SoLotSX NVARCHAR(100) '$.SoLotSX',
                SoLuongNhap DECIMAL(18,2) '$.SoLuongNhap',
                SoBoHang NVARCHAR(100) '$.SoBoHang',
                SoCaiBo NVARCHAR(100) '$.SoCaiBo',
                LotRows NVARCHAR(MAX) '$.LotRows' AS JSON
            );

            SELECT
                item.Id AS BtpItemId,
                lot.DauTuanGS1,
                lot.ThuTu,
                lot.LxvtLot,
                lot.SoLotSX,
                lot.SoLuongNhap,
                COALESCE(lot.SortOrder, TRY_CONVERT(INT, lotJson.[key]) + 1) AS SortOrder
            INTO #LotRows
            FROM #BtpItems item
            CROSS APPLY OPENJSON(item.LotRows) lotJson
            CROSS APPLY OPENJSON(lotJson.value)
            WITH (
                DauTuanGS1 NVARCHAR(100) '$.DauTuanGS1',
                ThuTu NVARCHAR(50) '$.ThuTu',
                LxvtLot NVARCHAR(100) '$.LxvtLot',
                SoLotSX NVARCHAR(100) '$.SoLotSX',
                SoLuongNhap DECIMAL(18,2) '$.SoLuongNhap',
                SortOrder INT '$.SortOrder'
            ) AS lot
            WHERE item.LotRows IS NOT NULL;

            INSERT INTO #LotRows (
                BtpItemId, DauTuanGS1, ThuTu, LxvtLot, SoLotSX, SoLuongNhap, SortOrder
            )
            SELECT
                item.Id,
                item.DauTuanGS1,
                item.ThuTu,
                item.LxvtLot,
                item.SoLotSX,
                item.SoLuongNhap,
                1
            FROM #BtpItems item
            WHERE item.LotRows IS NULL
              AND (
                    item.SoLuongNhap IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(item.DauTuanGS1)), N'') IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(item.ThuTu)), N'') IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(item.LxvtLot)), N'') IS NOT NULL
                    OR NULLIF(LTRIM(RTRIM(item.SoLotSX)), N'') IS NOT NULL
                );

            UPDATE item
            SET
                item.SoBoHang = json.SoBoHang,
                item.SoCaiBo = json.SoCaiBo
            FROM dbo.PHIEU_KIEM_BTP_ITEM item
            INNER JOIN #BtpItems json ON item.Id = json.Id
            WHERE item.PhieuKiemId = @PhieuKiemId;
            DELETE lot
            FROM dbo.PHIEU_KIEM_BTP_ITEM_LOT lot
            INNER JOIN dbo.PHIEU_KIEM_BTP_ITEM item ON item.Id = lot.BtpItemId
            INNER JOIN #BtpItems json ON json.Id = item.Id
            WHERE item.PhieuKiemId = @PhieuKiemId;

            INSERT INTO dbo.PHIEU_KIEM_BTP_ITEM_LOT (
                BtpItemId, DauTuanGS1, ThuTu, LxvtLot, SoLotSX, SoLuongNhap, SortOrder
            )
            SELECT
                item.Id,
                rows.DauTuanGS1,
                rows.ThuTu,
                rows.LxvtLot,
                rows.SoLotSX,
                rows.SoLuongNhap,
                rows.SortOrder
            FROM #LotRows rows
            INNER JOIN dbo.PHIEU_KIEM_BTP_ITEM item ON item.Id = rows.BtpItemId
            WHERE item.PhieuKiemId = @PhieuKiemId;

            ;WITH first_lot AS (
                SELECT
                    lot.*,
                    ROW_NUMBER() OVER (PARTITION BY lot.BtpItemId ORDER BY lot.SortOrder, lot.Id) AS rn
                FROM dbo.PHIEU_KIEM_BTP_ITEM_LOT lot
                INNER JOIN dbo.PHIEU_KIEM_BTP_ITEM item ON item.Id = lot.BtpItemId
                INNER JOIN #BtpItems json ON json.Id = item.Id
                WHERE item.PhieuKiemId = @PhieuKiemId
            )
            UPDATE item
            SET
                item.DauTuanGS1 = first_lot.DauTuanGS1,
                item.ThuTu = first_lot.ThuTu,
                item.LxvtLot = first_lot.LxvtLot,
                item.SoLotSX = first_lot.SoLotSX,
                item.SoLuongNhap = first_lot.SoLuongNhap
            FROM dbo.PHIEU_KIEM_BTP_ITEM item
            INNER JOIN #BtpItems json ON json.Id = item.Id
            LEFT JOIN first_lot ON first_lot.BtpItemId = item.Id AND first_lot.rn = 1
            WHERE item.PhieuKiemId = @PhieuKiemId;
        END

        IF @SummaryJson IS NOT NULL AND @SummaryJson != '{}' AND @SummaryJson != 'null'
        BEGIN
            DELETE FROM PHIEU_KIEM_SXBT_SUMMARY WHERE PhieuKiemId = @PhieuKiemId;

            INSERT INTO PHIEU_KIEM_SXBT_SUMMARY (
                PhieuKiemId, LoaiMau, SoLuongMau, TyLe, TyLeDat, TyLeLoiNghiemTrong, TyLeLoiNangNhe
            )
            SELECT
                @PhieuKiemId,
                JSON_VALUE(@SummaryJson, '$.LoaiMau'),
                JSON_VALUE(@SummaryJson, '$.SoLuongMau'),
                JSON_VALUE(@SummaryJson, '$.TyLe'),
                JSON_VALUE(@SummaryJson, '$.TyLeDat'),
                JSON_VALUE(@SummaryJson, '$.TyLeLoiNghiemTrong'),
                JSON_VALUE(@SummaryJson, '$.TyLeLoiNangNhe');
        END

        IF @DefectsJson IS NOT NULL
        BEGIN
            DECLARE @SectionId INT;
            SELECT TOP 1 @SectionId = Id FROM PHIEU_KIEM_SECTION WHERE PhieuKiemId = @PhieuKiemId;
            IF @SectionId IS NULL
            BEGIN
                INSERT INTO PHIEU_KIEM_SECTION (PhieuKiemId, TenNhom)
                VALUES (@PhieuKiemId, N'Kiểm Sản Xuất Bổ Trợ');
                SET @SectionId = SCOPE_IDENTITY();
                END

            DELETE FROM PHIEU_KIEM_DEFECT WHERE SectionId = @SectionId AND CheckItemId IS NULL;

            IF @DefectsJson != '[]' AND @DefectsJson != 'null'
            BEGIN
                INSERT INTO PHIEU_KIEM_DEFECT (SectionId, DefectId, DefectType, SoLuong, CheckItemId, IsLapLai)
                SELECT @SectionId, DefectId, DefectType, SoLuong, NULL, IsLapLai
                FROM OPENJSON(@DefectsJson)
                WITH (
                    DefectId INT '$.DefectId',
                    DefectType NVARCHAR(20) '$.DefectType',
                    SoLuong INT '$.SoLuong',
                    IsLapLai BIT '$.IsLapLai'
                );
            END
        END

        IF @KetLuan IS NOT NULL
        BEGIN
            UPDATE PHIEU_KIEM
            SET KetLuan = @KetLuan, TrangThai = CASE WHEN @KetLuan = N'CHUA_KIEM' THEN TrangThai ELSE N'HOAN_THANH' END
            WHERE Id = @PhieuKiemId;
        END

        COMMIT TRAN;
        SELECT 1 AS Code, N'Lưu kết quả kiểm tra thành công' AS Message;
    END TRY
    BEGIN CATCH
        ROLLBACK TRAN;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_GetDetail_SXBT
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_GetDetail_SXBT]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_GetDetail_SXBT]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_GetDetail_SXBT]
    @PhieuKiemId INT,
    @UserId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @UserId IS NOT NULL
       AND EXISTS (SELECT 1 FROM PHIEU_KIEM WHERE Id = @PhieuKiemId)
       AND NOT EXISTS (
            SELECT 1
            FROM PHIEU_KIEM pk
            JOIN USERS u ON u.Id = @UserId
            WHERE pk.Id = @PhieuKiemId
              AND (
                    NULLIF(LTRIM(RTRIM(u.AllowedLoaiKiemIds)), '') IS NULL
                    OR EXISTS (
                        SELECT 1
                        FROM STRING_SPLIT(u.AllowedLoaiKiemIds, ',') allowed
                        WHERE TRY_CONVERT(INT, LTRIM(RTRIM(allowed.value))) = pk.LoaiKiemId
                    )
              )
       )
    BEGIN
        THROW 51001, 'FORBIDDEN_LOAI_KIEM', 1;
    END;

    SELECT
        pk.Id,
        pk.SoPhieu,
        pk.SanPhamId,
        pk.LoaiKiemId,
        pk.Lot,
        pk.DoiTuong,
        pk.NguoiKiemId,
        pk.CreatedAt,
        pk.KetLuan,
        pk.TrangThai,
        pk.SoLuong,
        pk.NgayKiem,
        pk.Ngay_Giao,
        pk.MucDoKiemTra,
        sp.TenSanPham,
        sp.ImageUrl,
        u.FullName AS TenNguoiKiem,
        sp.MaSanPham,
        lk.TenLoai AS TenLoaiKiem,
        bbk.Id AS BienBanId,
        MaDonHang = STUFF((
            SELECT DISTINCT ', ' + MaDonHang
            FROM PHIEU_KIEM_BTP_ITEM
            WHERE PhieuKiemId = pk.Id
            FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, ''),
            (SELECT Ngay_NhapBTP FROM TAG_QTKD.dbo.PhieuNhapBTP WHERE ID_PhieuNhapBTP = pk.SourceId) AS NgayNhap,
        (
            SELECT FieldName, FieldValue
            FROM PhieuKiem_CustomFields ctf
            WHERE ctf.PhieuKiemId = pk.Id
            FOR JSON PATH
        ) AS DynamicFieldsJSON
    FROM PHIEU_KIEM pk
    LEFT JOIN DM_SAN_PHAM sp ON pk.SanPhamId = sp.Id
    LEFT JOIN USERS u ON u.Id = pk.NguoiKiemId
    LEFT JOIN DM_LOAI_KIEM lk ON lk.Id = pk.LoaiKiemId
    LEFT JOIN BIEN_BAN_KIEM bbk ON bbk.PhieuKiemId = pk.Id
    WHERE pk.Id = @PhieuKiemId;

    SELECT *
    FROM PHIEU_KIEM_BTP_ITEM
    WHERE PhieuKiemId = @PhieuKiemId;

    SELECT *
    FROM PHIEU_KIEM_SXBT_SUMMARY
    WHERE PhieuKiemId = @PhieuKiemId;

    SELECT d.*, dm.TenLoi, dm.MaLoi
    FROM PHIEU_KIEM_DEFECT d
    JOIN PHIEU_KIEM_SECTION s ON d.SectionId = s.Id
    LEFT JOIN DM_DEFECT dm ON dm.Id = d.DefectId
    WHERE s.PhieuKiemId = @PhieuKiemId;

    SELECT lot.*
    FROM PHIEU_KIEM_BTP_ITEM_LOT lot
    INNER JOIN PHIEU_KIEM_BTP_ITEM item ON item.Id = lot.BtpItemId
    WHERE item.PhieuKiemId = @PhieuKiemId
    ORDER BY lot.BtpItemId, lot.SortOrder, lot.Id;
END;
GO


-- ----------------------------
-- procedure structure for sp_DM_DeleteCheckItem
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_DeleteCheckItem]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_DeleteCheckItem]
GO

CREATE PROCEDURE [dbo].[sp_DM_DeleteCheckItem] @Id INT

AS
BEGIN
  set nocount on;
  update DM_CHECK_ITEM
  set TrangThai = 0
  WHERE Id = @Id
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuNhapBTP_GetList_ChuaKiem
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuNhapBTP_GetList_ChuaKiem]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuNhapBTP_GetList_ChuaKiem]
GO

CREATE PROCEDURE [dbo].[sp_PhieuNhapBTP_GetList_ChuaKiem]
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LoaiKiemId INT = 4; -- Sản xuất bổ trợ

    SELECT 
        a.ID_PhieuNhapBTP AS SourceId,
        a.So_PhieuNhapBTP,
        a.Ngay_NhapBTP,
        kn.Ten_Kho AS Ten_KhoNhap,
        dv.Ten_DonVi,
        bp.Ten_BoPhan,
        b.SoLuong_NhapKho AS SoLuong,
        Ma_DonHang = STUFF(( SELECT DISTINCT ', ' + nc.Ma_DonHang
                             FROM TAG_QTKD.dbo.PhieuNhapBTP_ChiTiet na
                             INNER JOIN TAG_QTKD.dbo.DonHang nc ON na.ID_DonHang = nc.ID_DonHang
                             WHERE na.ID_PhieuNhapBTP = a.ID_PhieuNhapBTP                        
                             FOR XML PATH , TYPE ).value('.[1]', 'nvarchar(max)'), 1, 2, ''),
        pk.Id as PhieuKiemId,
        CASE 
            WHEN pk.SourceId IS NULL THEN N'Chưa kiểm'
            ELSE N'Đã kiểm'
        END AS TrangThai
    FROM TAG_QTKD.dbo.PhieuNhapBTP a
    LEFT JOIN TAG_QTKD.dbo.DM_Kho kn ON a.ID_KhoNhap = kn.ID_Kho
    LEFT JOIN TAG_System.dbo.DM_DonVi dv ON a.ID_DonVi = dv.ID_DonVi
    LEFT JOIN TAG_System.dbo.DM_BoPhan bp ON a.ID_BoPhan = bp.ID_BoPhan
    LEFT JOIN (
        SELECT ba.ID_PhieuNhapBTP, SUM(bb.SoLuong_NhapKho) AS SoLuong_NhapKho
        FROM TAG_QTKD.dbo.PhieuNhapBTP ba
        INNER JOIN TAG_QTKD.dbo.PhieuNhapBTP_ChiTiet bb ON ba.ID_PhieuNhapBTP = bb.ID_PhieuNhapBTP
        WHERE ba.TonTai = 1
        GROUP BY ba.ID_PhieuNhapBTP
    ) b ON a.ID_PhieuNhapBTP = b.ID_PhieuNhapBTP
    LEFT JOIN PHIEU_KIEM pk
        ON pk.SourceId = a.ID_PhieuNhapBTP
        AND pk.LoaiKiemId = @LoaiKiemId
    WHERE 
        a.TonTai = 1
        AND a.ID_DonVi = 32
        AND pk.Id IS NULL
        AND a.Ngay_NhapBTP >= DATEADD(DAY, -3, GETDATE())
    ORDER BY a.Ngay_NhapBTP DESC, a.ID_PhieuNhapBTP DESC;
END
GO


-- ----------------------------
-- procedure structure for sp_BienBan_Complete
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_Complete]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_Complete]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_Complete]
    @BienBanId INT,
    @NguoiXacNhanId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @LoaiBienBan NVARCHAR(50);
    DECLARE @VaiTro NVARCHAR(50);

    SELECT @LoaiBienBan = LoaiBienBan
    FROM dbo.BIEN_BAN_KIEM
    WHERE Id = @BienBanId;

    IF @LoaiBienBan IS NULL
    BEGIN
        RAISERROR(N'Không tìm thấy biên bản', 16, 1);
        RETURN;
    END;

    SET @VaiTro = CASE
        WHEN @LoaiBienBan = N'STANDALONE' THEN N'KPH_KN'
        ELSE NULL
    END;

    BEGIN TRAN;

    BEGIN TRY
        UPDATE dbo.BIEN_BAN_KIEM
        SET TrangThai = CASE
                WHEN @LoaiBienBan = N'STANDALONE' THEN N'HOAN_THANH'
                ELSE N'DA_XAC_NHAN'
            END
        WHERE Id = @BienBanId;

        IF @NguoiXacNhanId IS NOT NULL
           AND NOT EXISTS (
                SELECT 1
                FROM dbo.BIEN_BAN_XAC_NHAN
                WHERE BienBanId = @BienBanId
                  AND NguoiXacNhanId = @NguoiXacNhanId
                  AND ISNULL(VaiTro, '') = ISNULL(@VaiTro, '')
           )
        BEGIN
            INSERT INTO dbo.BIEN_BAN_XAC_NHAN (
                BienBanId,
                NguoiXacNhanId,
                ThoiGian,
                VaiTro
            )
            VALUES (
                @BienBanId,
                @NguoiXacNhanId,
                SYSDATETIME(),
                @VaiTro
            );
        END;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH;
END;
GO


-- ----------------------------
-- procedure structure for sp_BienBan_Get
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_Get]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_Get]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_Get]
    @PhieuKiemId INT
AS
BEGIN

SELECT
bb.Id BienBanId,
pk.SoPhieu,
pk.Lot,
pk.DoiTuong,
pk.ThoiGianKiem,

sp.MaSanPham,
sp.TenSanPham,

lk.TenLoai AS PhatHienTu,

bb.MucDoKhongPhuHop,
bb.MoTaChung

FROM BIEN_BAN_KIEM bb
JOIN PHIEU_KIEM pk ON bb.PhieuKiemId = pk.Id
LEFT JOIN DM_SAN_PHAM sp ON pk.SanPhamId = sp.Id
LEFT JOIN DM_LOAI_KIEM lk ON pk.LoaiKiemId = lk.Id

WHERE pk.Id = @PhieuKiemId

END
GO


-- ----------------------------
-- procedure structure for sp_BienBan_Defect
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_Defect]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_Defect]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_Defect]
    @PhieuKiemId INT
AS
BEGIN

SELECT
d.MaLoi,
d.TenLoi,
pkd.SoLuong

FROM PHIEU_KIEM_DEFECT pkd
JOIN DM_DEFECT d ON pkd.DefectId = d.Id
JOIN PHIEU_KIEM_SECTION s ON pkd.SectionId = s.Id

WHERE s.PhieuKiemId = @PhieuKiemId

END
GO


-- ----------------------------
-- procedure structure for sp_BienBan_GetAssignableUsers
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_GetAssignableUsers]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_GetAssignableUsers]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_GetAssignableUsers]
AS
BEGIN

SELECT
u.Id,
u.FullName,
r.RoleName

FROM USERS u

JOIN USER_ROLE ur
    ON u.Id = ur.UserId

JOIN ROLES r
    ON ur.RoleId = r.Id

WHERE r.RoleCode IN
(
'TP_B8',
'TP_BP',
'PX',
'B3',
'B8',
'NV_BP',
'TP_B3',
'TP_B7'
)

END
GO


-- ----------------------------
-- procedure structure for sp_Dashboard_GetDefectStats
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_Dashboard_GetDefectStats]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_Dashboard_GetDefectStats]
GO

CREATE PROCEDURE [dbo].[sp_Dashboard_GetDefectStats]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ISNULL(SUM(pkd.SoLuong), 0) AS TotalQuantity,
        COUNT(1) AS TotalOccurrences,
        COUNT(DISTINCT pk.Id) AS AffectedInspections
    FROM dbo.PHIEU_KIEM_DEFECT pkd
    INNER JOIN dbo.PHIEU_KIEM_SECTION s ON s.Id = pkd.SectionId
    INNER JOIN dbo.PHIEU_KIEM pk ON pk.Id = s.PhieuKiemId;

    SELECT
        ISNULL(pkd.DefectType, 'UNKNOWN') AS DefectType,
        COUNT(1) AS Occurrences,
        ISNULL(SUM(pkd.SoLuong), 0) AS Quantity
    FROM dbo.PHIEU_KIEM_DEFECT pkd
    INNER JOIN dbo.PHIEU_KIEM_SECTION s ON s.Id = pkd.SectionId
    INNER JOIN dbo.PHIEU_KIEM pk ON pk.Id = s.PhieuKiemId
    GROUP BY ISNULL(pkd.DefectType, 'UNKNOWN')
    ORDER BY Quantity DESC, Occurrences DESC;

    SELECT
        pk.LoaiKiemId,
        ISNULL(lk.MaLoai, '') AS MaLoai,
        ISNULL(lk.TenLoai, N'Chưa xác định') AS TenLoai,
        COUNT(1) AS Occurrences,
        ISNULL(SUM(pkd.SoLuong), 0) AS Quantity,
        COUNT(DISTINCT pk.Id) AS AffectedInspections,
        ISNULL(SUM(CASE WHEN pkd.DefectType = 'CRITICAL' THEN pkd.SoLuong ELSE 0 END), 0) AS CriticalQuantity,
        ISNULL(SUM(CASE WHEN pkd.DefectType = 'MAJOR' THEN pkd.SoLuong ELSE 0 END), 0) AS MajorQuantity,
        ISNULL(SUM(CASE WHEN pkd.DefectType = 'MINOR' THEN pkd.SoLuong ELSE 0 END), 0) AS MinorQuantity
    FROM dbo.PHIEU_KIEM_DEFECT pkd
    INNER JOIN dbo.PHIEU_KIEM_SECTION s ON s.Id = pkd.SectionId
    INNER JOIN dbo.PHIEU_KIEM pk ON pk.Id = s.PhieuKiemId
    LEFT JOIN dbo.DM_LOAI_KIEM lk ON lk.Id = pk.LoaiKiemId
    GROUP BY pk.LoaiKiemId, lk.MaLoai, lk.TenLoai
    ORDER BY Quantity DESC, Occurrences DESC, TenLoai;

    SELECT TOP 8
        pkd.DefectId,
        ISNULL(d.MaLoi, '') AS MaLoi,
        ISNULL(d.TenLoi, N'Chưa xác định') AS TenLoi,
        ISNULL(d.MoTa, '') AS MoTa,
        ISNULL(pkd.DefectType, d.DefectType) AS DefectType,
        COUNT(1) AS Occurrences,
        ISNULL(SUM(pkd.SoLuong), 0) AS Quantity,
        COUNT(DISTINCT pk.Id) AS AffectedInspections
    FROM dbo.PHIEU_KIEM_DEFECT pkd
    INNER JOIN dbo.PHIEU_KIEM_SECTION s ON s.Id = pkd.SectionId
    INNER JOIN dbo.PHIEU_KIEM pk ON pk.Id = s.PhieuKiemId
    LEFT JOIN dbo.DM_DEFECT d ON d.Id = pkd.DefectId
    GROUP BY
        pkd.DefectId,
        d.MaLoi,
        d.TenLoi,
        d.MoTa,
        ISNULL(pkd.DefectType, d.DefectType)
    ORDER BY Quantity DESC, Occurrences DESC, TenLoi;
END
GO


-- ----------------------------
-- procedure structure for sp_BienBan_AssignUser
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_AssignUser]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_AssignUser]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_AssignUser]
(
    @BienBanId INT,
    @UserIds NVARCHAR(MAX),
    @AssignedBy INT
)
AS
BEGIN
    SET NOCOUNT ON;
    
    IF EXISTS (
        SELECT 1
        FROM BIEN_BAN_KIEM
        WHERE Id = @BienBanId
        AND AssignConfirmed = 1
    )
    BEGIN
        RAISERROR(N'Danh sách người xử lý đã được xác nhận',16,1)
        RETURN
    END
    
    BEGIN TRAN;
  
    DECLARE @Users TABLE (Id INT);

    INSERT INTO @Users(Id)
    SELECT value
    FROM STRING_SPLIT(@UserIds, ',');


    /* XÓA user không còn được chọn */

    DELETE FROM BIEN_BAN_ASSIGN
    WHERE BienBanId = @BienBanId
    AND NguoiXuLyId NOT IN
    (
        SELECT Id FROM @Users
    );


    /* THÊM user mới */

    INSERT INTO BIEN_BAN_ASSIGN
    (
        BienBanId,
        NguoiXuLyId,
        AssignedBy
    )
    SELECT
        @BienBanId,
        u.Id,
        @AssignedBy
    FROM @Users u
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM BIEN_BAN_ASSIGN a
        WHERE a.BienBanId = @BienBanId
        AND a.NguoiXuLyId = u.Id
    );

    COMMIT TRAN;

END
GO


-- ----------------------------
-- procedure structure for sp_BienBan_ConfirmAssign
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_ConfirmAssign]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_ConfirmAssign]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_ConfirmAssign]
(
    @BienBanId INT
)
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.BIEN_BAN_ASSIGN WHERE BienBanId = @BienBanId)
      THROW 51020, N'Vui lòng chọn ít nhất một bộ phận xử lý', 1;

  IF EXISTS (
      SELECT 1
      FROM dbo.BIEN_BAN_KIEM bb
      WHERE bb.Id = @BienBanId
        AND ISNULL(bb.MauPhieuVersion, 'V00') = 'V01'
        AND (
            EXISTS (
                SELECT a.BoPhanId FROM dbo.BIEN_BAN_ASSIGN a WHERE a.BienBanId = @BienBanId
                EXCEPT
                SELECT yk.BoPhanId FROM dbo.XIN_Y_KIEN yk WHERE yk.BienBanId = @BienBanId
            )
            OR EXISTS (
                SELECT yk.BoPhanId FROM dbo.XIN_Y_KIEN yk WHERE yk.BienBanId = @BienBanId
                EXCEPT
                SELECT a.BoPhanId FROM dbo.BIEN_BAN_ASSIGN a WHERE a.BienBanId = @BienBanId
            )
        )
  )
      THROW 51021, N'Danh sách ý kiến chuyên môn chưa khớp phân công xử lý', 1;

  UPDATE dbo.BIEN_BAN_KIEM
  SET AssignConfirmed = 1,
      TrangThai = 'CHO_XAC_NHAN'
  WHERE Id = @BienBanId;

END
GO


-- ----------------------------
-- procedure structure for sp_BienBan_AddXuLy
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_AddXuLy]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_AddXuLy]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_AddXuLy]
(
    @BienBanId INT,
    @NoiDung NVARCHAR(MAX),
    @DeNghiXuLyId INT,
    @ThoiHan DATE,
    @UserId INT,
    @BoPhanId INT
)
AS
BEGIN

-- DECLARE @TheoDoiUserId INT
-- 
-- SELECT TOP 1 @TheoDoiUserId = u.Id
-- FROM USERS u
-- JOIN USER_ROLE ur ON u.Id = ur.UserId
-- JOIN ROLES r ON ur.RoleId = r.Id
-- WHERE r.RoleCode = 'TP_B8'

INSERT INTO BIEN_BAN_XU_LY
(
BienBanId,
NoiDung,
DeNghiXuLyId,
BoPhanId,
ThoiHan,
TheoDoiBy,
NguoiXuLyId,
CreatedAt
)

VALUES
(
@BienBanId,
@NoiDung,
@DeNghiXuLyId,
@BoPhanId,
@ThoiHan,
@UserId,
@UserId,
GETDATE()
)

END
GO


-- ----------------------------
-- procedure structure for sp_DM_DeNghiXuLy_Get
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_DeNghiXuLy_Get]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_DeNghiXuLy_Get]
GO

CREATE PROCEDURE [dbo].[sp_DM_DeNghiXuLy_Get]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        Id,
        Ten
    FROM DM_DE_NGHI_XU_LY
    ORDER BY Id
END
GO


-- ----------------------------
-- procedure structure for sp_DM_BoPhan_Get
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_BoPhan_Get]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_BoPhan_Get]
GO

CREATE PROCEDURE [dbo].[sp_DM_BoPhan_Get]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        Id,
        MaBoPhan,
        TenBoPhan
    FROM DM_BO_PHAN
    WHERE TrangThai = 1
    ORDER BY MaBoPhan
END
GO


-- ----------------------------
-- procedure structure for sp_BienBan_AddChiPhi
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_AddChiPhi]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_AddChiPhi]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_AddChiPhi]
(
    @BienBanId INT,
    @LoaiChiPhi NVARCHAR(255),
    @GiaTri MONEY,
    @BoPhanId INT,
    @ThoiHan DATE,
    @CreatedBy INT
)
AS
BEGIN

SET NOCOUNT ON;

INSERT INTO BIEN_BAN_CHI_PHI
(
    BienBanId,
    LoaiChiPhi,
    GiaTri,
    ThoiHan,
    CreatedBy,
    CreatedAt,
    BoPhanId
)
VALUES
(
    @BienBanId,
    @LoaiChiPhi,
    @GiaTri,
    @ThoiHan,
    @CreatedBy,
    GETDATE(),
    @BoPhanId
)

END
GO


-- ----------------------------
-- procedure structure for sp_BienBan_XacNhan1
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_XacNhan1]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_XacNhan1]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_XacNhan1]
    @BienBanId INT,
    @NguoiXacNhanId INT,
    @BoPhanId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @LoaiBienBan NVARCHAR(50);
    DECLARE @EffectiveBoPhanId INT;
    DECLARE @VaiTro NVARCHAR(50) = NULL;

    SELECT @LoaiBienBan = LoaiBienBan
    FROM dbo.BIEN_BAN_KIEM
    WHERE Id = @BienBanId;

    IF @LoaiBienBan IS NULL
    BEGIN
        RAISERROR(N'Không tìm thấy biên bản', 16, 1);
        RETURN;
    END;

    SELECT @EffectiveBoPhanId = COALESCE(@BoPhanId, BoPhanId)
    FROM dbo.USERS
    WHERE Id = @NguoiXacNhanId;

    IF @LoaiBienBan = N'STANDALONE'
       AND EXISTS (
            SELECT 1
            FROM dbo.BienBan_CustomFields
            WHERE BienBanId = @BienBanId
              AND FieldName = N'BpsxSignatureBoPhanId'
              AND TRY_CAST(FieldValue AS INT) = @EffectiveBoPhanId
       )
    BEGIN
        SET @VaiTro = N'KPH_BPSX';
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.BIEN_BAN_XAC_NHAN
        WHERE BienBanId = @BienBanId
          AND NguoiXacNhanId = @NguoiXacNhanId
          AND ISNULL(VaiTro, '') = ISNULL(@VaiTro, '')
    )
    BEGIN
        INSERT INTO dbo.BIEN_BAN_XAC_NHAN (
            BienBanId,
            NguoiXacNhanId,
            ThoiGian,
            VaiTro
        )
        VALUES (
            @BienBanId,
            @NguoiXacNhanId,
            SYSDATETIME(),
            @VaiTro
        );
    END;
END;
GO


-- ----------------------------
-- procedure structure for sp_BienBan_GetListProgress
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_GetListProgress]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_GetListProgress]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_GetListProgress]
    @BienBanIds NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    IF NULLIF(LTRIM(RTRIM(@BienBanIds)), '') IS NULL
    BEGIN
        SELECT
            CAST(NULL AS INT) AS BienBanId,
            CAST(0 AS BIT) AS IsSxbt,
            CAST(0 AS INT) AS SoBoPhan,
            CAST(0 AS INT) AS DaCoYKien,
            CAST(0 AS INT) AS ProgressPercent,
            CAST(NULL AS NVARCHAR(50)) AS MaBoPhanDangCho,
            CAST(NULL AS NVARCHAR(255)) AS TenBoPhanDangCho,
            CAST(NULL AS NVARCHAR(MAX)) AS BoPhanChuaXacNhanText
        WHERE 1 = 0;
        RETURN;
    END;

    ;WITH ParsedIds AS (
        SELECT DISTINCT TRY_CAST(LTRIM(RTRIM(node.value('.', 'NVARCHAR(20)'))) AS INT) AS BienBanId
        FROM (SELECT CAST('<i>' + REPLACE(@BienBanIds, ',', '</i><i>') + '</i>' AS XML) AS XmlIds) src
        CROSS APPLY src.XmlIds.nodes('/i') AS split(node)
        WHERE TRY_CAST(LTRIM(RTRIM(node.value('.', 'NVARCHAR(20)'))) AS INT) IS NOT NULL
    ),
    NormalAssignProgress AS (
        SELECT
            a.BienBanId,
            a.BoPhanId,
            a.Id AS AssignId,
            bp.MaBoPhan,
            bp.TenBoPhan,
            CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM dbo.BIEN_BAN_XAC_NHAN x
                    LEFT JOIN dbo.USERS u ON u.Id = x.NguoiXacNhanId
                    WHERE x.BienBanId = a.BienBanId
                      AND u.BoPhanId = a.BoPhanId
                ) THEN 1
                ELSE 0
            END AS DaXacNhan
        FROM dbo.BIEN_BAN_ASSIGN a
        INNER JOIN ParsedIds p ON p.BienBanId = a.BienBanId
        LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = a.BoPhanId
    ),
    NormalAgg AS (
        SELECT
            nap.BienBanId,
            COUNT(*) AS SoBoPhan,
            SUM(nap.DaXacNhan) AS DaCoYKien,
            NULLIF(
                STUFF((
                    SELECT ', ' + pending.DisplayName
                    FROM (
                        SELECT
                            nap2.AssignId,
                            COALESCE(NULLIF(nap2.TenBoPhan, ''), NULLIF(nap2.MaBoPhan, '')) AS DisplayName
                        FROM NormalAssignProgress nap2
                        WHERE nap2.BienBanId = nap.BienBanId
                          AND nap2.DaXacNhan = 0
                    ) pending
                    WHERE pending.DisplayName IS NOT NULL
                    ORDER BY pending.AssignId
                    FOR XML PATH(''), TYPE
                ).value('.', 'NVARCHAR(MAX)'), 1, 2, ''),
                ''
            ) AS BoPhanChuaXacNhanText
        FROM NormalAssignProgress nap
        GROUP BY nap.BienBanId
    ),
    SxbtRankedSteps AS (
        SELECT
            s.BienBanId,
            s.BoPhanId,
            s.TrangThai,
            s.StepOrder,
            bp.MaBoPhan,
            bp.TenBoPhan,
            ROW_NUMBER() OVER (
                PARTITION BY s.BienBanId
                ORDER BY CASE WHEN s.TrangThai <> 'DA_XAC_NHAN' THEN 0 ELSE 1 END, s.StepOrder
            ) AS PendingRank
        FROM dbo.BIEN_BAN_SXBT_CONFIRM_STEP s
        INNER JOIN ParsedIds p ON p.BienBanId = s.BienBanId
        LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = s.BoPhanId
    ),
    SxbtAgg AS (
        SELECT
            rs.BienBanId,
            COUNT(*) AS SoBoPhan,
            SUM(CASE WHEN rs.TrangThai = 'DA_XAC_NHAN' THEN 1 ELSE 0 END) AS DaCoYKien,
            MAX(CASE WHEN rs.PendingRank = 1 AND rs.TrangThai <> 'DA_XAC_NHAN' THEN rs.MaBoPhan END) AS MaBoPhanDangCho,
            MAX(CASE WHEN rs.PendingRank = 1 AND rs.TrangThai <> 'DA_XAC_NHAN' THEN rs.TenBoPhan END) AS TenBoPhanDangCho,
            NULLIF(
                STUFF((
                    SELECT ', ' + pending.DisplayName
                    FROM (
                        SELECT
                            rs2.StepOrder,
                            COALESCE(NULLIF(rs2.TenBoPhan, ''), NULLIF(rs2.MaBoPhan, '')) AS DisplayName
                        FROM SxbtRankedSteps rs2
                        WHERE rs2.BienBanId = rs.BienBanId
                          AND rs2.TrangThai <> 'DA_XAC_NHAN'
                    ) pending
                    WHERE pending.DisplayName IS NOT NULL
                    ORDER BY pending.StepOrder
                    FOR XML PATH(''), TYPE
                ).value('.', 'NVARCHAR(MAX)'), 1, 2, ''),
                ''
            ) AS BoPhanChuaXacNhanText
        FROM SxbtRankedSteps rs
        GROUP BY rs.BienBanId
    )
    SELECT
        p.BienBanId,
        CASE WHEN sxbt.BienBanId IS NOT NULL THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS IsSxbt,
        COALESCE(sxbt.SoBoPhan, normal.SoBoPhan, 0) AS SoBoPhan,
        COALESCE(sxbt.DaCoYKien, normal.DaCoYKien, 0) AS DaCoYKien,
        CASE
            WHEN COALESCE(sxbt.SoBoPhan, normal.SoBoPhan, 0) > 0
                THEN CAST(ROUND(
                    COALESCE(sxbt.DaCoYKien, normal.DaCoYKien, 0) * 100.0
                    / COALESCE(sxbt.SoBoPhan, normal.SoBoPhan, 0),
                    0
                ) AS INT)
            ELSE 0
        END AS ProgressPercent,
        sxbt.MaBoPhanDangCho,
        sxbt.TenBoPhanDangCho,
        COALESCE(sxbt.BoPhanChuaXacNhanText, normal.BoPhanChuaXacNhanText) AS BoPhanChuaXacNhanText
    FROM ParsedIds p
    LEFT JOIN SxbtAgg sxbt ON sxbt.BienBanId = p.BienBanId
    LEFT JOIN NormalAgg normal ON normal.BienBanId = p.BienBanId
    ORDER BY p.BienBanId;
END;
GO


-- ----------------------------
-- procedure structure for sp_BienBan_HanhDong_Add
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_HanhDong_Add]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_HanhDong_Add]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_HanhDong_Add]
(
    @BienBanId INT,
    @NoiDung NVARCHAR(MAX),
    @BoPhanId INT,
    @ThoiHan DATE,
    @TheoDoi NVARCHAR(255),
    @CreatedBy INT
)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO BIEN_BAN_HANH_DONG
    (
        BienBanId,
        NoiDung,
        BoPhanId,
        ThoiHan,
        TheoDoi,
        CreatedBy
    )
    VALUES
    (
        @BienBanId,
        @NoiDung,
        @BoPhanId,
        @ThoiHan,
        @TheoDoi,
        @CreatedBy
    )

END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_SXBT_Complete
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_SXBT_Complete]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_SXBT_Complete]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_SXBT_Complete]
    @PhieuKiemId INT,
    @KetLuan NVARCHAR(50),
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRAN;
    BEGIN TRY
        DECLARE @SectionId INT;
        SELECT TOP 1 @SectionId = Id
        FROM dbo.PHIEU_KIEM_SECTION
        WHERE PhieuKiemId = @PhieuKiemId;

        IF @SectionId IS NULL
        BEGIN
            INSERT INTO dbo.PHIEU_KIEM_SECTION (PhieuKiemId, TenNhom)
            VALUES (@PhieuKiemId, N'Kiểm Sản Xuất Bổ Trợ');
            SET @SectionId = SCOPE_IDENTITY();
        END

        UPDATE dbo.PHIEU_KIEM_SECTION
        SET KetLuan = CASE WHEN @KetLuan = 'DAT' THEN 'ACCEPT' ELSE 'REJECT' END
        WHERE Id = @SectionId;

        UPDATE dbo.PHIEU_KIEM
        SET KetLuan = @KetLuan,
            TrangThai = 'CHO_KIEM_NGHIEM',
            NgayKiem = GETDATE()
        WHERE Id = @PhieuKiemId;

        IF @KetLuan = 'KHONG_DAT'
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM dbo.BIEN_BAN_KIEM WHERE PhieuKiemId = @PhieuKiemId)
            BEGIN
                INSERT INTO dbo.BIEN_BAN_KIEM (PhieuKiemId, NguoiLapId, TrangThai, LoaiBienBan)
                VALUES (@PhieuKiemId, @UserId, 'BB_SXBT_MOI', 'SXBT');
            END
            ELSE
            BEGIN
                UPDATE dbo.BIEN_BAN_KIEM
                SET LoaiBienBan = 'SXBT',
                    TrangThai = CASE WHEN TrangThai = 'BB_MOI' THEN 'BB_SXBT_MOI' ELSE TrangThai END
                WHERE PhieuKiemId = @PhieuKiemId;
            END
        END

        COMMIT TRAN;
        SELECT 1 AS Code, N'Hoàn tất phiếu kiểm SXBT thành công' AS Message;
    END TRY
    BEGIN CATCH
        ROLLBACK TRAN;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH
END
GO


-- ----------------------------
-- procedure structure for sp_BienBan_AssignBoPhan
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_AssignBoPhan]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_AssignBoPhan]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_AssignBoPhan]
    @BienBanId INT,
    @BoPhanIds NVARCHAR(MAX),
    @AssignedBy INT = NULL,
    @BpsxSignatureBoPhanId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @LoaiBienBan NVARCHAR(50),
            @MauPhieuVersion VARCHAR(10),
            @AssignConfirmed BIT;

    SELECT @LoaiBienBan = LoaiBienBan,
           @MauPhieuVersion = ISNULL(MauPhieuVersion, 'V00'),
           @AssignConfirmed = ISNULL(AssignConfirmed, 0)
    FROM dbo.BIEN_BAN_KIEM
    WHERE Id = @BienBanId;

    IF @LoaiBienBan IS NULL
    BEGIN
        RAISERROR(N'Không tìm thấy biên bản', 16, 1);
        RETURN;
    END;

    IF @MauPhieuVersion = 'V01' AND @AssignConfirmed = 1
        THROW 51022, N'Phân công đã được xác nhận và không thể thay đổi', 1;

    IF @MauPhieuVersion = 'V01' AND EXISTS (
        SELECT 1
        FROM dbo.XIN_Y_KIEN yk
        JOIN dbo.TRA_LOI_Y_KIEN tl ON tl.XinYKienId = yk.Id
        WHERE yk.BienBanId = @BienBanId
    )
        THROW 51023, N'Không thể thay đổi phân công sau khi đã có ý kiến ký xác nhận', 1;

    DECLARE @Selected TABLE (
        BoPhanId INT NOT NULL PRIMARY KEY,
        ThuTu INT NOT NULL
    );

    INSERT INTO @Selected (BoPhanId, ThuTu)
    SELECT TRY_CAST(value AS INT), MIN(TRY_CAST([key] AS INT)) + 1
    FROM OPENJSON(N'[' + ISNULL(@BoPhanIds, '') + N']')
    WHERE TRY_CAST(value AS INT) IS NOT NULL
    GROUP BY TRY_CAST(value AS INT);
    IF NOT EXISTS (SELECT 1 FROM @Selected)
    BEGIN
        RAISERROR(N'Vui lòng chọn ít nhất một bộ phận xử lý', 16, 1);
        RETURN;
    END;

    IF EXISTS (
        SELECT 1 FROM @Selected s
        WHERE NOT EXISTS (SELECT 1 FROM dbo.DM_BO_PHAN bp WHERE bp.Id = s.BoPhanId)
    )
    BEGIN
        RAISERROR(N'Danh sách bộ phận xử lý không hợp lệ', 16, 1);
        RETURN;
    END;

    IF @BpsxSignatureBoPhanId IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM dbo.DM_BO_PHAN
            WHERE Id = @BpsxSignatureBoPhanId
       )
    BEGIN
        RAISERROR(N'Bộ phận sản xuất không hợp lệ', 16, 1);
        RETURN;
    END;

    BEGIN TRAN;
    BEGIN TRY
        DELETE a
        FROM dbo.BIEN_BAN_ASSIGN a
        WHERE a.BienBanId = @BienBanId
          AND NOT EXISTS (
              SELECT 1
              FROM @Selected s
              WHERE s.BoPhanId = a.BoPhanId
          );

        INSERT INTO dbo.BIEN_BAN_ASSIGN (
            BienBanId,
            BoPhanId,
            IsBpsxSignature
        )
        SELECT
            @BienBanId,
            s.BoPhanId,
            CASE WHEN s.BoPhanId = @BpsxSignatureBoPhanId THEN 1 ELSE 0 END
        FROM @Selected s
        WHERE NOT EXISTS (
            SELECT 1
            FROM dbo.BIEN_BAN_ASSIGN a
            WHERE a.BienBanId = @BienBanId
              AND a.BoPhanId = s.BoPhanId
        );

        UPDATE a
        SET IsBpsxSignature = CASE
                WHEN a.BoPhanId = @BpsxSignatureBoPhanId THEN 1
                ELSE 0
            END
        FROM dbo.BIEN_BAN_ASSIGN a
        WHERE a.BienBanId = @BienBanId;

        IF @MauPhieuVersion = 'V01'
        BEGIN
            DELETE yk
            FROM dbo.XIN_Y_KIEN yk
            WHERE yk.BienBanId = @BienBanId
              AND NOT EXISTS (
                  SELECT 1 FROM @Selected s WHERE s.BoPhanId = yk.BoPhanId
              );

            ;WITH DuplicateOpinions AS (
                SELECT yk.Id,
                       ROW_NUMBER() OVER (PARTITION BY yk.BoPhanId ORDER BY yk.Id) AS RowNumber
                FROM dbo.XIN_Y_KIEN yk
                WHERE yk.BienBanId = @BienBanId
            )
            DELETE yk
            FROM dbo.XIN_Y_KIEN yk
            JOIN DuplicateOpinions duplicate ON duplicate.Id = yk.Id
            WHERE duplicate.RowNumber > 1;

            UPDATE yk
            SET yk.ThuTu = s.ThuTu,
                yk.BoPhan = bp.MaBoPhan,
                yk.TrangThai = N'DANG_XIN'
            FROM dbo.XIN_Y_KIEN yk
            JOIN @Selected s ON s.BoPhanId = yk.BoPhanId
            JOIN dbo.DM_BO_PHAN bp ON bp.Id = s.BoPhanId
            WHERE yk.BienBanId = @BienBanId;

            INSERT INTO dbo.XIN_Y_KIEN (BienBanId, BoPhanId, BoPhan, TrangThai, ThuTu)
            SELECT @BienBanId, s.BoPhanId, bp.MaBoPhan, N'DANG_XIN', s.ThuTu
            FROM @Selected s
            JOIN dbo.DM_BO_PHAN bp ON bp.Id = s.BoPhanId
            WHERE NOT EXISTS (
                SELECT 1
                FROM dbo.XIN_Y_KIEN yk
                WHERE yk.BienBanId = @BienBanId AND yk.BoPhanId = s.BoPhanId
            );
        END;

        IF @LoaiBienBan = N'STANDALONE'
        BEGIN
            DELETE FROM dbo.BienBan_CustomFields
            WHERE BienBanId = @BienBanId
              AND FieldName = N'BpsxSignatureBoPhanId';

            IF @BpsxSignatureBoPhanId IS NOT NULL
            BEGIN
                INSERT INTO dbo.BienBan_CustomFields (
                    BienBanId,
                    FieldName,
                    FieldValue
                )
                VALUES (
                    @BienBanId,
                    N'BpsxSignatureBoPhanId',
                    CONVERT(NVARCHAR(50), @BpsxSignatureBoPhanId)
                );
            END;
        END;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH;
END;
GO


-- ----------------------------
-- procedure structure for sp_BienBan_UpdateMoTaChung
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_UpdateMoTaChung]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_UpdateMoTaChung]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_UpdateMoTaChung]
    @BienBanId INT,
    @MoTaChung NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE BIEN_BAN_KIEM
    SET MoTaChung = @MoTaChung,
        TrangThai = N'CHO_PHAN_BO_XU_LY'
    WHERE Id = @BienBanId;

END
GO


-- ----------------------------
-- procedure structure for sp_LichDongCont_GetList
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_LichDongCont_GetList]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_LichDongCont_GetList]
GO

CREATE PROCEDURE [dbo].[sp_LichDongCont_GetList]
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LoaiKiemId INT;

    -- Lấy Id loại kiểm đóng cont
    SELECT @LoaiKiemId = Id
    FROM DM_LOAI_KIEM
    WHERE MaLoai = 'KIEM_DONG_CONT';

    SELECT 
        l.ID_Lich,
        l.So_Invoice,
        l.So_Cont,
        l.Ten_Hang,
        l.ItemCode,
        l.SoLuong,
        l.Pallet,
        l.Ngay_Giao,
        l.Ma_KhachHang,
        sp.Id as SanPhamId
    FROM TAG_QTKD.dbo.Lich_Dong_Cont l

    -- loại bỏ những cái đã kiểm
    LEFT JOIN PHIEU_KIEM pk
        ON pk.SourceId = l.ID_Lich
        AND pk.LoaiKiemId = @LoaiKiemId
    LEFT JOIN DM_SAN_PHAM sp ON sp.MaSanPham = l.ItemCode
    WHERE 
        pk.Id IS NULL  -- chưa kiểm
        AND l.Ngay_Giao >= DATEADD(DAY, -7, GETDATE())

    ORDER BY l.Ngay_Giao DESC;
END
GO


-- ----------------------------
-- procedure structure for sp_ChungTuNhapChiTiet_GetList_ChuaKiem
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_ChungTuNhapChiTiet_GetList_ChuaKiem]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_ChungTuNhapChiTiet_GetList_ChuaKiem]
GO

CREATE PROCEDURE [dbo].[sp_ChungTuNhapChiTiet_GetList_ChuaKiem]
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LoaiKiemId INT;

    -- Loại kiểm đầu vào
    SELECT @LoaiKiemId = Id
    FROM DM_LOAI_KIEM
    WHERE MaLoai = 'DAU_VAO';

    IF @LoaiKiemId IS NULL
    BEGIN
        RAISERROR(N'Không tìm thấy loại kiểm DAU_VAO trong DM_LOAI_KIEM', 16, 1);
        RETURN;
    END;

    ;WITH CTE_GopChiTiet AS
    (
        SELECT
            ctd.ID_ChungTuNhap,
            ctd.ID_VatTu,

            MAX(ctd.ID_ChungTuNhap_ChiTiet) AS ID_ChungTuNhap_ChiTiet,
            SUM(ISNULL(ctd.SoLuong_ChungTu, 0)) AS SoLuong
        FROM TAG_QTKD.dbo.ChungTuNhap_ChiTiet ctd
        GROUP BY
            ctd.ID_ChungTuNhap,
            ctd.ID_VatTu
    )
    SELECT 
        ct.ID_ChungTuNhap,
        ct.So_Invoice,
        ct.Ngay_Invoice,
        ct.ID_NhaCungCap,
        ncc.Ten_NhaCungCap AS NhaCungCap,

        dh.ID_DonHang,
        dh.Ma_DonHang,

        gop.ID_ChungTuNhap_ChiTiet,

        vt.ID_VatTu,
        vt.Ma_VatTu,
        vt.QuyCach,
        vt.ItemCode,
        clvt.Ten_ChungLoaiVatTu,

        gop.SoLuong,
        ctdMax.DonGia_ChungTu,

        sp.Id AS SanPhamId,

        N'Chưa kiểm' AS TrangThai

    FROM CTE_GopChiTiet gop

    INNER JOIN TAG_QTKD.dbo.ChungTuNhap ct
        ON ct.ID_ChungTuNhap = gop.ID_ChungTuNhap

    -- Lấy dòng chi tiết có ID lớn nhất để lấy đơn giá, đơn hàng vật tư
    INNER JOIN TAG_QTKD.dbo.ChungTuNhap_ChiTiet ctdMax
        ON ctdMax.ID_ChungTuNhap_ChiTiet = gop.ID_ChungTuNhap_ChiTiet

    LEFT JOIN TAG_QTKD.dbo.DM_VatTu vt 
        ON vt.ID_VatTu = gop.ID_VatTu

    LEFT JOIN TAG_QTKD.dbo.DM_ChungLoaiVatTu clvt 
        ON vt.ID_ChungLoaiVatTu = clvt.ID_ChungLoaiVatTu
        
    LEFT JOIN TAG_QTKD.dbo.DonHang_VatTu dhvt
        ON dhvt.ID_DonHang_VatTu = ctdMax.ID_DonHang_VatTu

    LEFT JOIN TAG_QTKD.dbo.DonHang dh
        ON dh.ID_DonHang = dhvt.ID_DonHang
        AND dh.TonTai = 1

    LEFT JOIN TAG_QTKD.dbo.DM_NhaCungCap ncc
        ON ct.ID_NhaCungCap = ncc.ID_NhaCungCap
        AND ncc.TonTai = 1   

    LEFT JOIN DM_SAN_PHAM sp 
        ON sp.MaSanPham = vt.Ma_VatTu 
        AND sp.TenSanPham = vt.QuyCach

    WHERE 
        ct.Ngay_Invoice >= DATEADD(DAY, -2, CONVERT(date, GETDATE()))
        AND ct.Ngay_Invoice <  DATEADD(DAY, 3, CONVERT(date, GETDATE()))

        -- Quan trọng:
        -- Nếu bất kỳ dòng chi tiết nào trong cùng nhóm đã kiểm,
        -- thì cả nhóm được xem là đã kiểm và không lấy ra nữa.
        AND NOT EXISTS
        (
            SELECT 1
            FROM TAG_QTKD.dbo.ChungTuNhap_ChiTiet ctdCheck
            INNER JOIN PHIEU_KIEM pk
                ON pk.SourceId = ctdCheck.ID_ChungTuNhap_ChiTiet
                AND pk.LoaiKiemId = @LoaiKiemId
            WHERE 
                ctdCheck.ID_ChungTuNhap = gop.ID_ChungTuNhap
                AND ctdCheck.ID_VatTu = gop.ID_VatTu
        )

    ORDER BY 
        ct.Ngay_Invoice DESC,
        ct.So_Invoice,
        dh.Ma_DonHang;
END
GO


-- ----------------------------
-- procedure structure for sp_BienBanSXBT_Submit
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBanSXBT_Submit]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBanSXBT_Submit]
GO

CREATE PROCEDURE [dbo].[sp_BienBanSXBT_Submit]
    @BienBanId INT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRAN;
    BEGIN TRY
        DECLARE @MucDo NCHAR(1);
        SELECT @MucDo = MucDoKhongPhuHop
        FROM dbo.BIEN_BAN_KIEM
        WHERE Id = @BienBanId;

        IF @MucDo NOT IN ('B', 'C', 'D')
            RAISERROR('Biên bản SXBT chưa chọn mức B/C/D', 16, 1);

        DELETE FROM dbo.BIEN_BAN_SXBT_CONFIRM_STEP WHERE BienBanId = @BienBanId;

        INSERT INTO dbo.BIEN_BAN_SXBT_CONFIRM_STEP (BienBanId, MucDo, BoPhanId, StepOrder, TrangThai)
        SELECT @BienBanId, @MucDo, t.BoPhanId, t.StepOrder, 'CHO_XAC_NHAN'
        FROM dbo.BIEN_BAN_SXBT_CONFIRM_TEMPLATE t
        WHERE t.MucDo = @MucDo
        ORDER BY t.StepOrder;

        UPDATE dbo.BIEN_BAN_KIEM
        SET TrangThai = 'BB_SXBT_CHO_XAC_NHAN'
        WHERE Id = @BienBanId;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        ROLLBACK TRAN;
        DECLARE @Err NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
    END CATCH
END
GO


-- ----------------------------
-- procedure structure for SP_Upsert_PhieuKiem_CustomFields
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[SP_Upsert_PhieuKiem_CustomFields]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[SP_Upsert_PhieuKiem_CustomFields]
GO

CREATE PROCEDURE [dbo].[SP_Upsert_PhieuKiem_CustomFields]
    @PhieuKiemId INT,
    @JsonData NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    -- Dùng MERGE để: Nếu đã có FieldName thì Cập nhật, chưa có thì Thêm mới
    MERGE PhieuKiem_CustomFields AS Target
    USING (
        SELECT 
            @PhieuKiemId AS PhieuKiemId, 
            [key] COLLATE DATABASE_DEFAULT AS FieldName,   -- Fix lỗi collation ở đây
            [value] COLLATE DATABASE_DEFAULT AS FieldValue -- Fix lỗi collation ở đây
        FROM OPENJSON(@JsonData)
    ) AS Source
    ON (Target.PhieuKiemId = Source.PhieuKiemId AND Target.FieldName = Source.FieldName)
    WHEN MATCHED THEN 
        UPDATE SET Target.FieldValue = Source.FieldValue
    WHEN NOT MATCHED BY TARGET THEN 
        INSERT (PhieuKiemId, FieldName, FieldValue) 
        VALUES (Source.PhieuKiemId, Source.FieldName, Source.FieldValue);
END
GO


-- ----------------------------
-- procedure structure for sp_BienBanSXBT_Complete
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBanSXBT_Complete]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBanSXBT_Complete]
GO

CREATE PROCEDURE [dbo].[sp_BienBanSXBT_Complete]
    @BienBanId INT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1 FROM dbo.BIEN_BAN_SXBT_CONFIRM_STEP
        WHERE BienBanId = @BienBanId
          AND TrangThai <> 'DA_XAC_NHAN'
    )
    BEGIN
        RAISERROR('Chưa đủ xác nhận bộ phận', 16, 1);
        RETURN;
    END

    UPDATE dbo.BIEN_BAN_KIEM
    SET TrangThai = 'BB_SXBT_HOAN_TAT'
    WHERE Id = @BienBanId;
END
GO


-- ----------------------------
-- procedure structure for sp_DM_AQL_PLAN_GetList
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_AQL_PLAN_GetList]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_AQL_PLAN_GetList]
GO

CREATE PROCEDURE [dbo].[sp_DM_AQL_PLAN_GetList]
(
    @InspectionLevel NVARCHAR(10) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        Id,
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
    FROM DM_AQL_PLAN
    WHERE 
        (@InspectionLevel IS NULL OR InspectionLevel = @InspectionLevel)
    ORDER BY InspectionLevel, LotMin;
END
GO


-- ----------------------------
-- procedure structure for sp_DM_AQL_PLAN_GetById
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_AQL_PLAN_GetById]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_AQL_PLAN_GetById]
GO

CREATE PROCEDURE [dbo].[sp_DM_AQL_PLAN_GetById]
(
    @Id INT
)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM DM_AQL_PLAN
    WHERE Id = @Id;
END
GO


-- ----------------------------
-- procedure structure for sp_DM_AQL_PLAN_Create
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_AQL_PLAN_Create]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_AQL_PLAN_Create]
GO

CREATE PROCEDURE [dbo].[sp_DM_AQL_PLAN_Create]
(
    @InspectionLevel NVARCHAR(10),
    @LotMin INT,
    @LotMax INT,
    @SampleSize INT,
    @Ac_Critical INT,
    @Re_Critical INT,
    @Ac_Major INT,
    @Re_Major INT,
    @Ac_Minor INT,
    @Re_Minor INT
)
AS
BEGIN
    SET NOCOUNT ON;

    -- ❌ check trùng khoảng Lot
    IF EXISTS (
        SELECT 1
        FROM DM_AQL_PLAN
        WHERE InspectionLevel = @InspectionLevel
        AND (
            (@LotMin BETWEEN LotMin AND LotMax)
            OR (@LotMax BETWEEN LotMin AND LotMax)
        )
    )
    BEGIN
        RAISERROR(N'Khoảng Lot bị trùng!', 16, 1);
        RETURN;
    END

    INSERT INTO DM_AQL_PLAN
    (
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
    )
    VALUES
    (
        @InspectionLevel,
        @LotMin,
        @LotMax,
        @SampleSize,
        @Ac_Critical,
        @Re_Critical,
        @Ac_Major,
        @Re_Major,
        @Ac_Minor,
        @Re_Minor
    );

    SELECT SCOPE_IDENTITY() AS Id;
END
GO


-- ----------------------------
-- procedure structure for sp_DM_AQL_PLAN_Update
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_AQL_PLAN_Update]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_AQL_PLAN_Update]
GO

CREATE PROCEDURE [dbo].[sp_DM_AQL_PLAN_Update]
(
    @Id INT,
    @InspectionLevel NVARCHAR(10),
    @LotMin INT,
    @LotMax INT,
    @SampleSize INT,
    @Ac_Critical INT,
    @Re_Critical INT,
    @Ac_Major INT,
    @Re_Major INT,
    @Ac_Minor INT,
    @Re_Minor INT
)
AS
BEGIN
    SET NOCOUNT ON;

    -- ❌ check trùng (loại trừ chính nó)
    IF EXISTS (
        SELECT 1
        FROM DM_AQL_PLAN
        WHERE InspectionLevel = @InspectionLevel
        AND Id <> @Id
        AND (
            (@LotMin BETWEEN LotMin AND LotMax)
            OR (@LotMax BETWEEN LotMin AND LotMax)
        )
    )
    BEGIN
        RAISERROR(N'Khoảng Lot bị trùng!', 16, 1);
        RETURN;
    END

    UPDATE DM_AQL_PLAN
    SET
        InspectionLevel = @InspectionLevel,
        LotMin = @LotMin,
        LotMax = @LotMax,
        SampleSize = @SampleSize,
        Ac_Critical = @Ac_Critical,
        Re_Critical = @Re_Critical,
        Ac_Major = @Ac_Major,
        Re_Major = @Re_Major,
        Ac_Minor = @Ac_Minor,
        Re_Minor = @Re_Minor
    WHERE Id = @Id;
END
GO


-- ----------------------------
-- procedure structure for sp_BienBanSXBT_AddXuLyRow
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBanSXBT_AddXuLyRow]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBanSXBT_AddXuLyRow]
GO

CREATE PROCEDURE [dbo].[sp_BienBanSXBT_AddXuLyRow]
    @BienBanId INT,
    @MucDo NCHAR(1),
    @ChiPhi NVARCHAR(255) = NULL,
    @NoiDung NVARCHAR(MAX) = NULL,
    @BoPhanTrachNhiemId INT = NULL,
    @ThoiHan DATE = NULL,
    @NguoiNhapId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRAN;
    BEGIN TRY
        DECLARE @SortOrder INT;
        DECLARE @TrachNhiem NVARCHAR(255) = NULL;
        DECLARE @RowCode NVARCHAR(50);

        SELECT @SortOrder = ISNULL(MAX(SortOrder), 0) + 1
        FROM dbo.BIEN_BAN_SXBT_XULY_ROW
        WHERE BienBanId = @BienBanId
          AND MucDo = @MucDo;

        IF @SortOrder IS NULL
            SET @SortOrder = 1;

        SET @RowCode = CONCAT('ROW_', @SortOrder);

        IF @BoPhanTrachNhiemId IS NOT NULL
        BEGIN
            SELECT TOP 1
                @TrachNhiem = CONCAT(MaBoPhan, ' - ', TenBoPhan)
            FROM dbo.DM_BO_PHAN
            WHERE Id = @BoPhanTrachNhiemId;
        END

        INSERT INTO dbo.BIEN_BAN_SXBT_XULY_ROW (
            BienBanId,
            MucDo,
            RowCode,
            TieuMuc,
            ChiPhi,
            NoiDung,
            TrachNhiem,
            NguoiNhapId,
            ThoiHan,
            SortOrder,
            UpdatedAt
        )
        VALUES (
            @BienBanId,
            @MucDo,
            @RowCode,
            NULL,
            NULLIF(LTRIM(RTRIM(@ChiPhi)), ''),
            NULLIF(LTRIM(RTRIM(@NoiDung)), ''),
            NULLIF(LTRIM(RTRIM(@TrachNhiem)), ''),
            @NguoiNhapId,
            @ThoiHan,
            @SortOrder,
            GETDATE()
        );

        COMMIT TRAN;
        SELECT 1 AS Code, N'Da them phuong an xu ly SXBT' AS Message;
    END TRY
    BEGIN CATCH
        ROLLBACK TRAN;
        DECLARE @Err NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
    END CATCH
END
GO


-- ----------------------------
-- procedure structure for sp_DM_AQL_PLAN_Delete
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_AQL_PLAN_Delete]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_AQL_PLAN_Delete]
GO

CREATE PROCEDURE [dbo].[sp_DM_AQL_PLAN_Delete]
(
    @Id INT
)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM DM_AQL_PLAN
    WHERE Id = @Id;
END
GO


-- ----------------------------
-- procedure structure for sp_DM_AQL_PLAN_GetLevels
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_AQL_PLAN_GetLevels]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_AQL_PLAN_GetLevels]
GO

CREATE PROCEDURE [dbo].[sp_DM_AQL_PLAN_GetLevels]
AS
BEGIN
    SELECT DISTINCT InspectionLevel
    FROM DM_AQL_PLAN
    ORDER BY InspectionLevel;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_UpdateLot
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_UpdateLot]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_UpdateLot]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_UpdateLot]
    @PhieuKiemId INT,
    @Lot NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE PHIEU_KIEM
    SET Lot = @Lot
    WHERE Id = @PhieuKiemId;

END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_GetSourceChecked_ByWeekRange
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_GetSourceChecked_ByWeekRange]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_GetSourceChecked_ByWeekRange]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_GetSourceChecked_ByWeekRange]
(
    @LoaiKiemId INT,
    @Week INT,
    @Year INT
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @StartDate DATE;
    DECLARE @EndDate DATE;

    /*
        Tính ngày đầu tuần (@Week - 2)
        và ngày cuối tuần (@Week)
    */

    -- Lấy ngày đầu năm
    DECLARE @FirstDayOfYear DATE = DATEFROMPARTS(@Year, 1, 1);

    -- Tính offset đến tuần cần lấy
    SET @StartDate = DATEADD(WEEK, @Week - 3, @FirstDayOfYear);
    SET @EndDate   = DATEADD(WEEK, @Week, @FirstDayOfYear);

    /*
        Chuẩn hóa về đầu tuần (Monday)
    */
    SET DATEFIRST 1; -- Monday

    SET @StartDate = DATEADD(DAY, 1 - DATEPART(WEEKDAY, @StartDate), @StartDate);
    SET @EndDate   = DATEADD(DAY, 7 - DATEPART(WEEKDAY, @EndDate), @EndDate);

    /*
        Query
    */
    SELECT DISTINCT SourceId_LCD
    FROM PHIEU_KIEM
    WHERE LoaiKiemId = @LoaiKiemId
      AND CreatedAt >= @StartDate
      AND CreatedAt <= @EndDate
      AND SourceId_LCD IS NOT NULL;
END
GO


-- ----------------------------
-- procedure structure for sp_BienBanSXBT_GetDetail
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBanSXBT_GetDetail]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBanSXBT_GetDetail]
GO

CREATE PROCEDURE [dbo].[sp_BienBanSXBT_GetDetail]
    @BienBanId INT,
    @UserId INT,
    @BoPhanId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        bb.Id AS BienBanId,
        bb.PhieuKiemId,
        bb.SoBienBan,
        bb.TrangThai,
        bb.LoaiBienBan,
        bb.MucDoKhongPhuHop,
        bb.MoTaChung,
        bb.CreatedAt,
        bb.NguoiLapId,
        ulap.FullName AS NguoiTao,
        pk.SoPhieu,
        pk.LoaiKiemId
    FROM dbo.BIEN_BAN_KIEM bb
    JOIN dbo.PHIEU_KIEM pk ON pk.Id = bb.PhieuKiemId
    LEFT JOIN dbo.USERS ulap ON ulap.Id = bb.NguoiLapId
    WHERE bb.Id = @BienBanId AND ISNULL(bb.LoaiBienBan, 'GENERAL') = 'SXBT';

    SELECT
        d.MaLoi,
        d.TenLoi,
        d.DefectType,
        d.MoTa,
        d.ImageUrl,
        d.MaNhomLoi,
        d.PhamViApDung,
        d.ThiTruong,
        d.GhiChu,
        pd.SoLuong
    FROM dbo.BIEN_BAN_KIEM bb
    JOIN dbo.PHIEU_KIEM pk ON pk.Id = bb.PhieuKiemId
    JOIN dbo.PHIEU_KIEM_SECTION s ON s.PhieuKiemId = pk.Id
    JOIN dbo.PHIEU_KIEM_DEFECT pd ON pd.SectionId = s.Id
    JOIN dbo.DM_DEFECT d ON d.Id = pd.DefectId
    WHERE bb.Id = @BienBanId;

    SELECT
        r.Id,
        r.BienBanId,
        r.MucDo,
        r.RowCode,
        r.TieuMuc,
        r.ChiPhi,
        r.NoiDung,
        r.TrachNhiem,
        r.NguoiNhapId,
        unhap.FullName AS NguoiNhap,
        CONVERT(VARCHAR(10), r.ThoiHan, 120) AS ThoiHan,
        r.SortOrder
    FROM dbo.BIEN_BAN_SXBT_XULY_ROW r
    LEFT JOIN dbo.USERS unhap ON unhap.Id = r.NguoiNhapId
    WHERE r.BienBanId = @BienBanId
    ORDER BY r.SortOrder;

    SELECT
        hd.Id,
        hd.NoiDung,
        CONVERT(VARCHAR(10), hd.ThoiHan, 120) AS ThoiHan,
        hd.BoPhanId,
        bp.MaBoPhan,
        bp.TenBoPhan,
        hd.CreatedBy AS NguoiNhapId,
        unhap.FullName AS NguoiNhap
    FROM dbo.BIEN_BAN_HANH_DONG hd
    LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = hd.BoPhanId
    LEFT JOIN dbo.USERS unhap ON unhap.Id = hd.CreatedBy
    WHERE hd.BienBanId = @BienBanId
    ORDER BY hd.Id;

    SELECT
        s.Id,
        s.BienBanId,
        s.MucDo,
        s.BoPhanId,
        bp.MaBoPhan,
        bp.TenBoPhan,
        s.StepOrder,
        s.TrangThai,
        ISNULL(NULLIF(u.FullName, ''), u.Username) AS TenNguoiXacNhan,
        s.ConfirmedBy,
        s.ConfirmedAt
    FROM dbo.BIEN_BAN_SXBT_CONFIRM_STEP s
    LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = s.BoPhanId
    LEFT JOIN dbo.USERS u ON u.Id = s.ConfirmedBy
    WHERE s.BienBanId = @BienBanId
    ORDER BY s.StepOrder;
END
GO


-- ----------------------------
-- procedure structure for sp_DM_DeleteNhomKiem
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_DeleteNhomKiem]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_DeleteNhomKiem]
GO

CREATE PROCEDURE [dbo].[sp_DM_DeleteNhomKiem]
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRAN;

        -- Check tồn tại
        IF NOT EXISTS (
            SELECT 1 FROM DM_NHOM_KIEM WHERE Id = @Id
        )
        BEGIN
            THROW 50000, N'Nhóm kiểm không tồn tại', 1;
        END

        -- Check đã sử dụng trong sản phẩm
        IF EXISTS (
            SELECT 1 
            FROM SAN_PHAM_NHOM_KIEM 
            WHERE NhomKiemId = @Id
        )
        BEGIN
            THROW 50001, N'Nhóm kiểm đã được sử dụng', 1;
        END

        -- Check check item
        IF EXISTS (
            SELECT 1 
            FROM DM_CHECK_ITEM 
            WHERE NhomKiemId = @Id
        )
        BEGIN
            THROW 50002, N'Nhóm kiểm đã có checkitem', 1;
        END

        -- Soft delete
        UPDATE DM_NHOM_KIEM
        SET TrangThai = 0
        WHERE Id = @Id;

        COMMIT TRAN;

        SELECT 1 AS Success;

    END TRY
    BEGIN CATCH
        ROLLBACK TRAN;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50099, @ErrorMessage, 1;
    END CATCH
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_GetDetail_TrenChuyen
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_GetDetail_TrenChuyen]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_GetDetail_TrenChuyen]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_GetDetail_TrenChuyen]
    @PhieuKiemId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT
        pk.Id, pk.SoPhieu, pk.SanPhamId, pk.LoaiKiemId, pk.Lot, pk.DoiTuong,
        pk.NguoiKiemId, pk.CreatedAt, pk.KetLuan, pk.TrangThai,
        pk.SoLuong, pk.NgayKiem, pk.Ngay_Giao, pk.MucDoKiemTra, pk.SourceId,
        sp.TenSanPham,
        u.FullName AS TenNguoiKiem,
        sp.MaSanPham,
        lk.TenLoai AS TenLoaiKiem,
        bbk.Id AS BienBanId,
        (
            SELECT FieldName, FieldValue
            FROM dbo.PhieuKiem_CustomFields ctf
            WHERE ctf.PhieuKiemId = pk.Id
            FOR JSON PATH
        ) AS DynamicFieldsJSON
    FROM dbo.PHIEU_KIEM pk
    LEFT JOIN dbo.DM_SAN_PHAM sp ON pk.SanPhamId = sp.Id
    LEFT JOIN dbo.USERS u ON u.Id = pk.NguoiKiemId
    LEFT JOIN dbo.DM_LOAI_KIEM lk ON lk.Id = pk.LoaiKiemId
    LEFT JOIN dbo.BIEN_BAN_KIEM bbk ON bbk.PhieuKiemId = pk.Id
    WHERE pk.Id = @PhieuKiemId;

    SELECT
        s.Id,
        s.PhieuKiemId,
        s.GioKiem,
        s.SortOrder,
        s.CreatedAt,
        s.UpdatedAt
    FROM dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT s
    WHERE s.PhieuKiemId = @PhieuKiemId
    ORDER BY s.SortOrder, s.Id;

    SELECT
        e.Id AS EntryId,
        e.SlotId,
        e.CongDoan,
        e.TenCongNhanGayLoi,
        e.NguoiGhiNhanId,
        ug.FullName AS TenNguoiGhiNhan,
        e.GhiChu AS EntryGhiChu,
        e.SortOrder AS EntrySortOrder,
        e.CreatedAt AS EntryCreatedAt,
        e.UpdatedAt AS EntryUpdatedAt,
        d.Id AS DefectRowId,
        d.DefectId,
        d.SoLuong,
        d.SoLuongDatSauSua,
        d.SoLuongKhongDatSauSua,
        d.GhiChu AS DefectGhiChu,
        d.ImageUrls AS DefectImageUrls,
        d.SortOrder AS DefectSortOrder,
        dm.MaLoi,
        dm.TenLoi,
        dm.MoTa,
        dm.DefectType,
        dm.PhuongAnXuLy,
        dm.ImageUrl
    FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY e
    INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT s ON s.Id = e.SlotId
    LEFT JOIN dbo.USERS ug ON ug.Id = e.NguoiGhiNhanId
    LEFT JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT d ON d.EntryId = e.Id
    LEFT JOIN dbo.DM_DEFECT dm ON dm.Id = d.DefectId
    WHERE s.PhieuKiemId = @PhieuKiemId
    ORDER BY s.SortOrder, e.SortOrder, e.Id, d.SortOrder, d.Id;

    SELECT
        ISNULL((SELECT COUNT(*) FROM dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT WHERE PhieuKiemId = @PhieuKiemId), 0) AS TotalSlots,
        ISNULL((
            SELECT COUNT(*)
            FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY e
            INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT s ON s.Id = e.SlotId
            WHERE s.PhieuKiemId = @PhieuKiemId
        ), 0) AS TotalEntries,
        ISNULL((
            SELECT COUNT(*)
            FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT d
            INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY e ON e.Id = d.EntryId
            INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT s ON s.Id = e.SlotId
            WHERE s.PhieuKiemId = @PhieuKiemId
        ), 0) AS TotalDefectRows,
        ISNULL((
            SELECT SUM(d.SoLuong)
            FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT d
            INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY e ON e.Id = d.EntryId
            INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT s ON s.Id = e.SlotId
            WHERE s.PhieuKiemId = @PhieuKiemId
        ), 0) AS TotalDefectQuantity;

    SELECT
        xn.Id,
        xn.PhieuKiemId,
        xn.NguoiXacNhanId,
        xn.VaiTro,
        xn.TrangThai,
        xn.NoiDung,
        xn.ThoiGian,
        u.FullName AS TenNguoiXacNhan,
        u.BoPhanId
    FROM dbo.PHIEU_KIEM_XAC_NHAN xn
    LEFT JOIN dbo.USERS u ON u.Id = xn.NguoiXacNhanId
    WHERE xn.PhieuKiemId = @PhieuKiemId
    ORDER BY xn.ThoiGian DESC, xn.Id DESC;
END;
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_SaveCheckItem1
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_SaveCheckItem1]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_SaveCheckItem1]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_SaveCheckItem1]
    @CheckItemId INT,
    @KetQua NVARCHAR(10),
    @Defects NVARCHAR(MAX) = NULL,
    @GiaTriDo NVARCHAR(MAX) = NULL -- THAM SỐ MỚI
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @SectionId INT;

    SELECT @SectionId = SectionId FROM PHIEU_KIEM_CHECK_ITEM WHERE Id = @CheckItemId;

    -- Update kết luận (Đạt/Không đạt) và giá trị đo thực tế
    UPDATE PHIEU_KIEM_CHECK_ITEM 
    SET KetQua = @KetQua, 
        GiaTriDo = @GiaTriDo 
    WHERE Id = @CheckItemId;

    -- xoá defect cũ
    DELETE FROM PHIEU_KIEM_DEFECT WHERE CheckItemId = @CheckItemId;

    -- insert defect mới
    IF @Defects IS NOT NULL
    BEGIN
        INSERT INTO PHIEU_KIEM_DEFECT
        (
            SectionId,
            CheckItemId,
            DefectId,
            DefectType,
            SoLuong,
            ImageUrls -- THÊM CỘT NÀY
        )
        SELECT
            @SectionId,
            @CheckItemId,
            d.DefectId,
            dm.DefectType,
            d.SoLuong,
            d.ImageUrls -- THÊM DÒNG NÀY
        FROM OPENJSON(@Defects)
        WITH
        (
            DefectId INT '$.defectId',
            SoLuong INT '$.soLuong',
            ImageUrls NVARCHAR(MAX) '$.imageUrls' AS JSON 
        ) d
        JOIN DM_DEFECT dm ON dm.Id = d.DefectId;
    END

    /* ==========================
       update tổng lỗi check item
    ===========================*/

    UPDATE PHIEU_KIEM_CHECK_ITEM
    SET SoLuongLoi =
    (
        SELECT ISNULL(SUM(SoLuong),0)
        FROM PHIEU_KIEM_DEFECT
        WHERE CheckItemId = @CheckItemId
    )
    WHERE Id = @CheckItemId;

    /* ==========================
       update tổng lỗi section
    ===========================*/

    UPDATE PHIEU_KIEM_SECTION
    SET
        TotalCritical =
        (
            SELECT ISNULL(SUM(SoLuong),0)
            FROM PHIEU_KIEM_DEFECT
            WHERE SectionId = @SectionId
            AND DefectType = 'CRITICAL'
        ),
        TotalMajor =
        (
            SELECT ISNULL(SUM(SoLuong),0)
            FROM PHIEU_KIEM_DEFECT
            WHERE SectionId = @SectionId
            AND DefectType = 'MAJOR'
        ),
        TotalMinor =
        (
            SELECT ISNULL(SUM(SoLuong),0)
            FROM PHIEU_KIEM_DEFECT
            WHERE SectionId = @SectionId
            AND DefectType = 'MINOR'
        )
    WHERE Id = @SectionId;

END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_TrenChuyen_SaveEntries
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_TrenChuyen_SaveEntries]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_TrenChuyen_SaveEntries]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_TrenChuyen_SaveEntries]
    @PhieuKiemId INT,
    @UserId INT,
    @SlotsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @AllowedHours TABLE (GioKiem NVARCHAR(20) PRIMARY KEY);
    INSERT INTO @AllowedHours (GioKiem)
    VALUES (N'07:30'), (N'08:30'), (N'09:30'), (N'10:30'), (N'11:30'),
           (N'12:30'), (N'13:30'), (N'14:30'), (N'15:30'), (N'16:30');

    BEGIN TRAN;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.PHIEU_KIEM WHERE Id = @PhieuKiemId)
            RAISERROR(N'Không tìm thấy phiếu kiểm', 16, 1);

        IF EXISTS (
            SELECT 1
            FROM dbo.PHIEU_KIEM
            WHERE Id = @PhieuKiemId
              AND TrangThai IN ('HOAN_TAT', 'CHO_TBP_DUYET', 'CHO_KIEM_NGHIEM', 'CHO_XUONG_XAC_NHAN')
        )
            RAISERROR(N'Phiếu đã hoàn tất hoặc đang chờ duyệt/xác nhận, không thể chỉnh sửa', 16, 1);

        DECLARE @Slots TABLE (
            JsonIndex INT NOT NULL,
            GioKiem NVARCHAR(20) NOT NULL,
            SortOrder INT NOT NULL,
            EntriesJson NVARCHAR(MAX) NULL
        );

        INSERT INTO @Slots (JsonIndex, GioKiem, SortOrder, EntriesJson)
        SELECT
            TRY_CAST([key] AS INT) AS JsonIndex,
            LTRIM(RTRIM(ISNULL(JSON_VALUE([value], '$.gioKiem'), ''))),
            ISNULL(TRY_CAST(JSON_VALUE([value], '$.sortOrder') AS INT), TRY_CAST([key] AS INT) + 1),
            JSON_QUERY([value], '$.entries')
        FROM OPENJSON(@SlotsJson);

        IF EXISTS (
            SELECT 1
            FROM @Slots s
            LEFT JOIN @AllowedHours h ON h.GioKiem = s.GioKiem
            WHERE s.GioKiem = '' OR h.GioKiem IS NULL
        )
            RAISERROR(N'Khung giờ không hợp lệ', 16, 1);

        IF EXISTS (
            SELECT GioKiem
            FROM @Slots
            GROUP BY GioKiem
            HAVING COUNT(*) > 1
        )
            RAISERROR(N'Khung giờ bị trùng trong cùng phiếu', 16, 1);

        DECLARE @Entries TABLE (
            SlotJsonIndex INT NOT NULL,
            EntryJsonIndex INT NOT NULL,
            CongDoan NVARCHAR(50) NOT NULL,
            TenCongNhanGayLoi NVARCHAR(255) NULL,
            NguoiGhiNhanId INT NULL,
            GhiChu NVARCHAR(MAX) NULL,
            SortOrder INT NOT NULL,
            DefectsJson NVARCHAR(MAX) NULL
        );

        INSERT INTO @Entries (
            SlotJsonIndex,
            EntryJsonIndex,
            CongDoan,
            TenCongNhanGayLoi,
            NguoiGhiNhanId,
            GhiChu,
            SortOrder,
            DefectsJson
        )
        SELECT
            s.JsonIndex,
            TRY_CAST(j.[key] AS INT) AS EntryJsonIndex,
            LTRIM(RTRIM(ISNULL(JSON_VALUE(j.[value], '$.congDoan'), ''))),
            NULLIF(LTRIM(RTRIM(JSON_VALUE(j.[value], '$.tenCongNhanGayLoi'))), ''),
            TRY_CAST(JSON_VALUE(j.[value], '$.nguoiGhiNhanId') AS INT),
            NULLIF(LTRIM(RTRIM(JSON_VALUE(j.[value], '$.ghiChu'))), ''),
            ISNULL(TRY_CAST(JSON_VALUE(j.[value], '$.sortOrder') AS INT), TRY_CAST(j.[key] AS INT) + 1),
            JSON_QUERY(j.[value], '$.defects')
        FROM @Slots s
        CROSS APPLY OPENJSON(s.EntriesJson) j;

        DELETE FROM @Entries
        WHERE CongDoan = '';

        DECLARE @EntryDefects TABLE (
            SlotJsonIndex INT NOT NULL,
            EntryJsonIndex INT NOT NULL,
            DefectId INT NOT NULL,
            SoLuong INT NOT NULL,
            SoLuongDatSauSua INT NULL,
            SoLuongKhongDatSauSua INT NULL,
            GhiChu NVARCHAR(MAX) NULL,
            ImageUrls NVARCHAR(MAX) NULL,
            SortOrder INT NOT NULL
        );

        INSERT INTO @EntryDefects (
            SlotJsonIndex,
            EntryJsonIndex,
            DefectId,
            SoLuong,
            SoLuongDatSauSua,
            SoLuongKhongDatSauSua,
            GhiChu,
            ImageUrls,
            SortOrder
        )
        SELECT
            e.SlotJsonIndex,
            e.EntryJsonIndex,
            defect.DefectId,
            defect.SoLuong,
            defect.SoLuongDatSauSua,
            defect.SoLuongKhongDatSauSua,
            defect.GhiChu,
            defect.ImageUrls,
            ISNULL(defect.SortOrder, 0)
        FROM @Entries e
        CROSS APPLY OPENJSON(e.DefectsJson) WITH (
            DefectId INT '$.defectId',
            SoLuong INT '$.soLuong',
            SoLuongDatSauSua INT '$.soLuongDatSauSua',
            SoLuongKhongDatSauSua INT '$.soLuongKhongDatSauSua',
            GhiChu NVARCHAR(MAX) '$.ghiChu',
            ImageUrls NVARCHAR(MAX) '$.imageUrls' AS JSON,
            SortOrder INT '$.sortOrder'
        ) defect
        WHERE defect.DefectId IS NOT NULL
          AND ISNULL(defect.SoLuong, 0) > 0;

        DELETE e
        FROM @Entries e
        WHERE NOT EXISTS (
            SELECT 1
            FROM @EntryDefects d
            WHERE d.SlotJsonIndex = e.SlotJsonIndex
              AND d.EntryJsonIndex = e.EntryJsonIndex
        );

        DELETE s
        FROM @Slots s
        WHERE NOT EXISTS (
            SELECT 1
            FROM @Entries e
            WHERE e.SlotJsonIndex = s.JsonIndex
        );

        DELETE d
        FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT d
        INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY e ON e.Id = d.EntryId
        INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT s ON s.Id = e.SlotId
        WHERE s.PhieuKiemId = @PhieuKiemId;

        DELETE e
        FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY e
        INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT s ON s.Id = e.SlotId
        WHERE s.PhieuKiemId = @PhieuKiemId;

        DELETE FROM dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT
        WHERE PhieuKiemId = @PhieuKiemId;

        DECLARE @InsertedSlots TABLE (
            SlotId INT NOT NULL,
            JsonIndex INT NOT NULL
        );

        MERGE dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT AS target
        USING (
            SELECT
                @PhieuKiemId AS PhieuKiemId,
                src.GioKiem,
                src.SortOrder,
                src.JsonIndex
            FROM @Slots src
        ) AS src
        ON 1 = 0
        WHEN NOT MATCHED THEN
            INSERT (
                PhieuKiemId,
                GioKiem,
                SortOrder
            )
            VALUES (
                src.PhieuKiemId,
                src.GioKiem,
                src.SortOrder
            )
        OUTPUT inserted.Id, src.JsonIndex
            INTO @InsertedSlots(SlotId, JsonIndex);

        DECLARE @InsertedEntries TABLE (
            EntryId INT NOT NULL,
            SlotJsonIndex INT NOT NULL,
            EntryJsonIndex INT NOT NULL
        );

        MERGE dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY AS target
        USING (
            SELECT
                map.SlotId,
                src.CongDoan,
                src.TenCongNhanGayLoi,
                ISNULL(src.NguoiGhiNhanId, @UserId) AS NguoiGhiNhanId,
                src.GhiChu,
                src.SortOrder,
                src.SlotJsonIndex,
                src.EntryJsonIndex
            FROM @Entries src
            INNER JOIN @InsertedSlots map ON map.JsonIndex = src.SlotJsonIndex
        ) AS src
        ON 1 = 0
        WHEN NOT MATCHED THEN
            INSERT (
                SlotId,
                CongDoan,
                TenCongNhanGayLoi,
                NguoiGhiNhanId,
                GhiChu,
                SortOrder
            )
            VALUES (
                src.SlotId,
                src.CongDoan,
                src.TenCongNhanGayLoi,
                src.NguoiGhiNhanId,
                src.GhiChu,
                src.SortOrder
            )
        OUTPUT inserted.Id, src.SlotJsonIndex, src.EntryJsonIndex
            INTO @InsertedEntries(EntryId, SlotJsonIndex, EntryJsonIndex);

        INSERT INTO dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT (
            EntryId,
            DefectId,
            SoLuong,
            SoLuongDatSauSua,
            SoLuongKhongDatSauSua,
            GhiChu,
            ImageUrls,
            SortOrder
        )
        SELECT
            map.EntryId,
            src.DefectId,
            src.SoLuong,
            src.SoLuongDatSauSua,
            src.SoLuongKhongDatSauSua,
            src.GhiChu,
            src.ImageUrls,
            CASE WHEN src.SortOrder > 0 THEN src.SortOrder ELSE ROW_NUMBER() OVER (
                PARTITION BY src.SlotJsonIndex, src.EntryJsonIndex
                ORDER BY src.DefectId
            ) END
        FROM @EntryDefects src
        INNER JOIN @InsertedEntries map
            ON map.SlotJsonIndex = src.SlotJsonIndex
           AND map.EntryJsonIndex = src.EntryJsonIndex;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH
END;
GO


-- ----------------------------
-- procedure structure for sp_BienBanSXBT_SaveDraftByTPB8
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBanSXBT_SaveDraftByTPB8]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBanSXBT_SaveDraftByTPB8]
GO

CREATE PROCEDURE [dbo].[sp_BienBanSXBT_SaveDraftByTPB8]
    @BienBanId INT,
    @MoTaChung NVARCHAR(MAX) = NULL,
    @MucDoKhongPhuHop NVARCHAR(1),
    @XuLyRowsJson NVARCHAR(MAX),
    @HanhDongJson NVARCHAR(MAX) = NULL,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRAN;
    BEGIN TRY
        IF @MucDoKhongPhuHop NOT IN ('B', 'C')
            RAISERROR('MucDoKhongPhuHop khong hop le', 16, 1);

        UPDATE dbo.BIEN_BAN_KIEM
        SET MoTaChung = @MoTaChung,
            MucDoKhongPhuHop = @MucDoKhongPhuHop,
            LoaiBienBan = 'SXBT',
            TrangThai = CASE
                WHEN ISNULL(MucDoKhongPhuHopConfirmed, 0) = 1 THEN TrangThai
                ELSE 'BB_SXBT_TP_B8_DRAFT'
            END
        WHERE Id = @BienBanId;

        DELETE FROM dbo.BIEN_BAN_SXBT_XULY_ROW
        WHERE BienBanId = @BienBanId;

        INSERT INTO dbo.BIEN_BAN_SXBT_XULY_ROW (
            BienBanId, MucDo, RowCode, TieuMuc, ChiPhi, NoiDung, TrachNhiem, NguoiNhapId, ThoiHan, SortOrder, UpdatedAt
        )
        SELECT
            @BienBanId,
            @MucDoKhongPhuHop,
            ISNULL(NULLIF(LTRIM(RTRIM(j.RowCode)), ''), CONCAT('ROW_', ROW_NUMBER() OVER (ORDER BY (SELECT 1)))),
            NULLIF(LTRIM(RTRIM(j.TieuMuc)), ''),
            NULLIF(LTRIM(RTRIM(j.ChiPhi)), ''),
            NULLIF(LTRIM(RTRIM(j.NoiDung)), ''),
            NULLIF(LTRIM(RTRIM(j.TrachNhiem)), ''),
            ISNULL(j.NguoiNhapId, @UserId),
            TRY_CONVERT(DATE, j.ThoiHan),
            ISNULL(j.SortOrder, ROW_NUMBER() OVER (ORDER BY (SELECT 1))),
            GETDATE()
        FROM OPENJSON(@XuLyRowsJson)
        WITH (
            RowCode NVARCHAR(50) '$.rowCode',
            TieuMuc NVARCHAR(255) '$.tieuMuc',
            ChiPhi NVARCHAR(255) '$.chiPhi',
            NoiDung NVARCHAR(MAX) '$.noiDung',
            TrachNhiem NVARCHAR(255) '$.trachNhiem',
            NguoiNhapId INT '$.nguoiNhapId',
            ThoiHan NVARCHAR(30) '$.thoiHan',
            SortOrder INT '$.sortOrder'
        ) j;

        IF @HanhDongJson IS NOT NULL
        BEGIN
            DELETE FROM dbo.BIEN_BAN_HANH_DONG WHERE BienBanId = @BienBanId;

            INSERT INTO dbo.BIEN_BAN_HANH_DONG (BienBanId, NoiDung, ThoiHan, BoPhanId, CreatedBy)
            SELECT
                @BienBanId,
                h.NoiDung,
                TRY_CONVERT(DATE, h.ThoiHan),
                h.BoPhanId,
                ISNULL(h.NguoiNhapId, @UserId)
            FROM OPENJSON(@HanhDongJson)
            WITH (
                NoiDung NVARCHAR(MAX) '$.noiDung',
                ThoiHan NVARCHAR(30) '$.thoiHan',
                BoPhanId INT '$.boPhanId',
                NguoiNhapId INT '$.nguoiNhapId'
            ) h
            WHERE NULLIF(LTRIM(RTRIM(ISNULL(h.NoiDung, ''))), '') IS NOT NULL;
        END

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        ROLLBACK TRAN;
        DECLARE @Err NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
    END CATCH
END
GO


-- ----------------------------
-- procedure structure for sp_DM_GetSanPham
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_GetSanPham]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_GetSanPham]
GO

CREATE PROCEDURE [dbo].[sp_DM_GetSanPham]
    @TrangThai BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        Id,
        MaSanPham,
        TenSanPham,
        MoTa,
        TrangThai,
        CreatedAt
    FROM DM_SAN_PHAM
    WHERE (@TrangThai IS NULL OR TrangThai = @TrangThai)
    ORDER BY TenSanPham;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_TrenChuyen_Complete
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_TrenChuyen_Complete]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_TrenChuyen_Complete]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_TrenChuyen_Complete]
    @PhieuKiemId INT,
    @KetLuan NVARCHAR(20),
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRAN;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.PHIEU_KIEM WHERE Id = @PhieuKiemId)
            RAISERROR(N'Không tìm thấy phiếu kiểm', 16, 1);

        IF UPPER(ISNULL(@KetLuan, '')) NOT IN ('DAT', 'KHONG_DAT')
            RAISERROR(N'Kết luận không hợp lệ', 16, 1);

        IF NOT EXISTS (
            SELECT 1
            FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY e
            INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT s ON s.Id = e.SlotId
            WHERE s.PhieuKiemId = @PhieuKiemId
        )
            RAISERROR(N'Phiếu chưa có dữ liệu ghi nhận để hoàn tất', 16, 1);

        IF EXISTS (
            SELECT 1
            FROM dbo.PHIEU_KIEM
            WHERE Id = @PhieuKiemId
              AND TrangThai IN ('HOAN_TAT', 'CHO_KIEM_NGHIEM', 'CHO_XUONG_XAC_NHAN')
        )
            RAISERROR(N'Phiếu đã hoàn tất hoặc đã chuyển bước xác nhận, không thể hoàn tất lại', 16, 1);

        UPDATE dbo.PHIEU_KIEM
        SET KetLuan = UPPER(@KetLuan),
            TrangThai = 'CHO_TBP_DUYET',
            NgayKiem = ISNULL(NgayKiem, GETDATE())
        WHERE Id = @PhieuKiemId;

        DELETE FROM dbo.PHIEU_KIEM_XAC_NHAN
        WHERE PhieuKiemId = @PhieuKiemId
          AND VaiTro = 'TBP';

        SELECT
            Id AS PhieuKiemId,
            KetLuan,
            TrangThai
        FROM dbo.PHIEU_KIEM
        WHERE Id = @PhieuKiemId;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH
END;
GO


-- ----------------------------
-- procedure structure for sp_BienBanSXBT_ConfirmStep
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBanSXBT_ConfirmStep]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBanSXBT_ConfirmStep]
GO

CREATE PROCEDURE [dbo].[sp_BienBanSXBT_ConfirmStep]
    @BienBanId INT,
    @UserId INT,
    @BoPhanId INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRAN;
    BEGIN TRY
        DECLARE @StepId INT;
        DECLARE @ExpectedBoPhanId INT;

        SELECT TOP 1
            @StepId = Id,
            @ExpectedBoPhanId = BoPhanId
        FROM dbo.BIEN_BAN_SXBT_CONFIRM_STEP
        WHERE BienBanId = @BienBanId
          AND TrangThai <> 'DA_XAC_NHAN'
        ORDER BY StepOrder;

        IF @StepId IS NULL
            RAISERROR('Không còn bước xác nhận nào', 16, 1);

        IF @ExpectedBoPhanId <> @BoPhanId
            RAISERROR('Không đúng lượt xác nhận của bộ phận', 16, 1);

        UPDATE dbo.BIEN_BAN_SXBT_CONFIRM_STEP
        SET TrangThai = 'DA_XAC_NHAN',
            ConfirmedBy = @UserId,
            ConfirmedAt = GETDATE()
        WHERE Id = @StepId;

        IF NOT EXISTS (
            SELECT 1
            FROM dbo.BIEN_BAN_SXBT_CONFIRM_STEP
            WHERE BienBanId = @BienBanId
              AND TrangThai <> 'DA_XAC_NHAN'
        )
        BEGIN
            UPDATE dbo.BIEN_BAN_KIEM
            SET TrangThai = 'BB_SXBT_HOAN_TAT'
            WHERE Id = @BienBanId;
        END

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        ROLLBACK TRAN;
        DECLARE @Err NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
    END CATCH
END
GO


-- ----------------------------
-- procedure structure for sp_DM_GetLoaiKiem
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_GetLoaiKiem]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_GetLoaiKiem]
GO

CREATE PROCEDURE [dbo].[sp_DM_GetLoaiKiem]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        Id,
        MaLoai,
        TenLoai
    FROM DM_LOAI_KIEM
    ORDER BY TenLoai;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_TrenChuyen_CreateBienBan
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_TrenChuyen_CreateBienBan]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_TrenChuyen_CreateBienBan]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_TrenChuyen_CreateBienBan]
    @PhieuKiemId INT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRAN;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.PHIEU_KIEM WHERE Id = @PhieuKiemId)
            RAISERROR(N'Không tìm thấy phiếu kiểm', 16, 1);

        DECLARE @TongLoi INT = 0;

        SELECT @TongLoi = ISNULL(SUM(d.SoLuong), 0)
        FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT d
        INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY e ON e.Id = d.EntryId
        INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT s ON s.Id = e.SlotId
        WHERE s.PhieuKiemId = @PhieuKiemId;

        IF @TongLoi <= 0
            RAISERROR(N'Phiếu chưa có lỗi để sinh biên bản', 16, 1);

        DECLARE @BienBanId INT;

        SELECT @BienBanId = Id
        FROM dbo.BIEN_BAN_KIEM
        WHERE PhieuKiemId = @PhieuKiemId;

        IF @BienBanId IS NULL
        BEGIN
            INSERT INTO dbo.BIEN_BAN_KIEM (
                PhieuKiemId,
                LoaiTrachNhiem,
                TrangThai,
                NguoiLapId,
                LoaiBienBan
            )
            VALUES (
                @PhieuKiemId,
                NULL,
                'BB_MOI',
                @UserId,
                'GENERAL'
            );

            SET @BienBanId = SCOPE_IDENTITY();
        END

        UPDATE dbo.PHIEU_KIEM
        SET KetLuan = 'KHONG_DAT',
            NgayKiem = ISNULL(NgayKiem, GETDATE())
        WHERE Id = @PhieuKiemId;

        SELECT @BienBanId AS BienBanId;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH
END;
GO


-- ----------------------------
-- procedure structure for sp_DM_GetNhomKiem_BySanPham
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_GetNhomKiem_BySanPham]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_GetNhomKiem_BySanPham]
GO

CREATE PROCEDURE [dbo].[sp_DM_GetNhomKiem_BySanPham]
    @SanPhamId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        nk.Id,
        nk.TenNhom,
        nk.MoTa,
        nk.ThuTu,
        nk.TrangThai
    FROM SAN_PHAM_NHOM_KIEM spnk
    INNER JOIN DM_NHOM_KIEM nk ON spnk.NhomKiemId = nk.Id
    WHERE spnk.SanPhamId = @SanPhamId
      AND nk.TrangThai = 1
    ORDER BY nk.ThuTu;
END
GO


-- ----------------------------
-- procedure structure for sp_DM_GetCheckItem_ByNhom
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_GetCheckItem_ByNhom]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_GetCheckItem_ByNhom]
GO

CREATE PROCEDURE [dbo].[sp_DM_GetCheckItem_ByNhom]
    @NhomKiemId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        Id,
        NhomKiemId,
        TenMucKiem,
        ThamChieu,
        PhuongPhapKiem,
        TieuChuan,
        ThuTu,
        TrangThai
    FROM DM_CHECK_ITEM
    WHERE NhomKiemId = @NhomKiemId
      AND TrangThai = 1
    ORDER BY ThuTu;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_TrenChuyen_Approve
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_TrenChuyen_Approve]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_TrenChuyen_Approve]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_TrenChuyen_Approve]
    @PhieuKiemId INT,
    @UserId INT,
    @BoPhanId INT,
    @IsAdmin BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRAN;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.PHIEU_KIEM WHERE Id = @PhieuKiemId)
            RAISERROR(N'Không tìm thấy phiếu kiểm', 16, 1);

        IF NOT EXISTS (
            SELECT 1
            FROM dbo.PHIEU_KIEM
            WHERE Id = @PhieuKiemId
              AND TrangThai = 'CHO_TBP_DUYET'
        )
            RAISERROR(N'Phiếu chưa ở trạng thái chờ TBP duyệt', 16, 1);

        DECLARE @ExpectedBoPhanId INT;
        SELECT TOP 1 @ExpectedBoPhanId = TRY_CAST(FieldValue AS INT)
        FROM dbo.PhieuKiem_CustomFields
        WHERE PhieuKiemId = @PhieuKiemId
          AND FieldName = 'TrenChuyen_ApproveBoPhanId';

        IF @ExpectedBoPhanId IS NULL
            RAISERROR(N'Phiếu chưa xác định bộ phận duyệt', 16, 1);

        IF ISNULL(@IsAdmin, 0) = 0 AND @ExpectedBoPhanId <> @BoPhanId
            RAISERROR(N'Bạn không thuộc đúng bộ phận duyệt của phiếu này', 16, 1);

        DELETE FROM dbo.PHIEU_KIEM_XAC_NHAN
        WHERE PhieuKiemId = @PhieuKiemId
          AND VaiTro = 'TBP';

        INSERT INTO dbo.PHIEU_KIEM_XAC_NHAN
        (
            PhieuKiemId,
            NguoiXacNhanId,
            VaiTro,
            TrangThai,
            NoiDung,
            ThoiGian
        )
        VALUES
        (
            @PhieuKiemId,
            @UserId,
            'TBP',
            'DONG_Y',
            N'TBP xác nhận phiếu kiểm trên chuyền',
            GETDATE()
        );

        UPDATE dbo.PHIEU_KIEM
        SET TrangThai = 'HOAN_TAT'
        WHERE Id = @PhieuKiemId;

        SELECT
            Id AS PhieuKiemId,
            KetLuan,
            TrangThai
        FROM dbo.PHIEU_KIEM
        WHERE Id = @PhieuKiemId;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH
END;
GO


-- ----------------------------
-- procedure structure for sp_DM_GetAQLPlan
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_GetAQLPlan]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_GetAQLPlan]
GO

CREATE PROCEDURE [dbo].[sp_DM_GetAQLPlan]
    @LotSize INT,
    @InspectionLevel NVARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        Id,
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
    FROM DM_AQL_PLAN
    WHERE @LotSize BETWEEN LotMin AND LotMax
      AND InspectionLevel = @InspectionLevel
    ORDER BY LotMin ASC;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_Start
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_Start]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_Start]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_Start]
    @PhieuKiemId INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE PHIEU_KIEM
    SET TrangThai = 'DANG_KIEM'
    WHERE Id = @PhieuKiemId
      AND TrangThai = 'DA_TAO_SECTION';

    IF @@ROWCOUNT = 0
        RAISERROR('INVALID_STATE',16,1);
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_SaveSectionResult
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_SaveSectionResult]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_SaveSectionResult]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_SaveSectionResult]
    @SectionId INT,
    @TongSo INT,
    @SoLuongKiem INT,
    @InspectionLevel NVARCHAR(10),
    @Ac_Critical INT,
    @Re_Critical INT,
    @Ac_Major INT,
    @Re_Major INT,
    @Ac_Minor INT,
    @Re_Minor INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE PHIEU_KIEM_SECTION
    SET TongSo = @TongSo,
        SoLuongKiem = @SoLuongKiem,
        InspectionLevel = @InspectionLevel,
        Ac_Critical = @Ac_Critical,
        Re_Critical = @Re_Critical,
        Ac_Major = @Ac_Major,
        Re_Major = @Re_Major,
        Ac_Minor = @Ac_Minor,
        Re_Minor = @Re_Minor
    WHERE Id = @SectionId;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_SaveCheckItem
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_SaveCheckItem]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_SaveCheckItem]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_SaveCheckItem]
    @CheckItemId INT,
    @KetQua NVARCHAR(10),
    @Defects NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SectionId INT;

    SELECT @SectionId = SectionId
    FROM PHIEU_KIEM_CHECK_ITEM
    WHERE Id = @CheckItemId;

    -- update kết quả
    UPDATE PHIEU_KIEM_CHECK_ITEM
    SET KetQua = @KetQua
    WHERE Id = @CheckItemId;

    -- xoá defect cũ
    DELETE FROM PHIEU_KIEM_DEFECT
    WHERE CheckItemId = @CheckItemId;

    -- insert defect mới
    IF @Defects IS NOT NULL
    BEGIN

        INSERT INTO PHIEU_KIEM_DEFECT
        (
            SectionId,
            CheckItemId,
            DefectId,
            DefectType,
            SoLuong
        )
        SELECT
            @SectionId,
            @CheckItemId,
            d.DefectId,
            dm.DefectType,
            d.SoLuong
        FROM OPENJSON(@Defects)
        WITH
        (
            DefectId INT '$.defectId',
            SoLuong INT '$.soLuong'
        ) d
        JOIN DM_DEFECT dm ON dm.Id = d.DefectId;

    END

    /* ==========================
       update tổng lỗi check item
    ===========================*/

    UPDATE PHIEU_KIEM_CHECK_ITEM
    SET SoLuongLoi =
    (
        SELECT ISNULL(SUM(SoLuong),0)
        FROM PHIEU_KIEM_DEFECT
        WHERE CheckItemId = @CheckItemId
    )
    WHERE Id = @CheckItemId;

    /* ==========================
       update tổng lỗi section
    ===========================*/

    UPDATE PHIEU_KIEM_SECTION
    SET
        TotalCritical =
        (
            SELECT ISNULL(SUM(SoLuong),0)
            FROM PHIEU_KIEM_DEFECT
            WHERE SectionId = @SectionId
            AND DefectType = 'CRITICAL'
        ),
        TotalMajor =
        (
            SELECT ISNULL(SUM(SoLuong),0)
            FROM PHIEU_KIEM_DEFECT
            WHERE SectionId = @SectionId
            AND DefectType = 'MAJOR'
        ),
        TotalMinor =
        (
            SELECT ISNULL(SUM(SoLuong),0)
            FROM PHIEU_KIEM_DEFECT
            WHERE SectionId = @SectionId
            AND DefectType = 'MINOR'
        )
    WHERE Id = @SectionId;

END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_SaveDefect
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_SaveDefect]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_SaveDefect]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_SaveDefect]
    @SectionId INT,
    @DefectId INT,
    @DefectType NVARCHAR(20),
    @SoLuong INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO PHIEU_KIEM_DEFECT (
        SectionId,
        DefectId,
        DefectType,
        SoLuong
    )
    VALUES (
        @SectionId,
        @DefectId,
        @DefectType,
        @SoLuong
    );
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_CalculateAQL
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_CalculateAQL]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_CalculateAQL]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_CalculateAQL]
    @SectionId INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TotalCritical INT = 0,
            @TotalMajor INT = 0,
            @TotalMinor INT = 0;

    SELECT
        @TotalCritical = SUM(CASE WHEN DefectType='CRITICAL' THEN SoLuong ELSE 0 END),
        @TotalMajor = SUM(CASE WHEN DefectType='MAJOR' THEN SoLuong ELSE 0 END),
        @TotalMinor = SUM(CASE WHEN DefectType='MINOR' THEN SoLuong ELSE 0 END)
    FROM PHIEU_KIEM_DEFECT
    WHERE SectionId = @SectionId;

    UPDATE PHIEU_KIEM_SECTION
    SET TotalCritical = ISNULL(@TotalCritical,0),
        TotalMajor = ISNULL(@TotalMajor,0),
        TotalMinor = ISNULL(@TotalMinor,0)
    WHERE Id = @SectionId;

    UPDATE PHIEU_KIEM_SECTION
    SET KetLuan =
        CASE
            WHEN @TotalCritical >= Re_Critical THEN 'REJECT'
            WHEN @TotalMajor >= Re_Major THEN 'REJECT'
            WHEN @TotalMinor >= Re_Minor THEN 'REJECT'
            ELSE 'ACCEPT'
        END
    WHERE Id = @SectionId;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuXuLyKPH_Create
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuXuLyKPH_Create]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuXuLyKPH_Create]
GO

CREATE PROCEDURE [dbo].[sp_PhieuXuLyKPH_Create]
    @NguoiLapId INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.BIEN_BAN_KIEM (
        PhieuKiemId,
        LoaiTrachNhiem,
        TrangThai,
        NguoiLapId,
        LoaiBienBan,
        SoBienBan,
        AssignConfirmed
    )
    VALUES (
        NULL,
        NULL,
        N'BB_MOI',
        @NguoiLapId,
        N'STANDALONE',
        NULL,
        0
    );

    DECLARE @BienBanId INT = SCOPE_IDENTITY();

    UPDATE dbo.BIEN_BAN_KIEM
    SET SoBienBan = CONCAT(
        'BB',
        CONVERT(VARCHAR(8), GETDATE(), 112),
        '-',
        RIGHT('0000' + CAST(@BienBanId AS VARCHAR(10)), 4)
    )
    WHERE Id = @BienBanId;

    SELECT @BienBanId AS BienBanId;
END;
GO


-- ----------------------------
-- procedure structure for SP_Upsert_BienBan_CustomFields
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[SP_Upsert_BienBan_CustomFields]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[SP_Upsert_BienBan_CustomFields]
GO

CREATE PROCEDURE [dbo].[SP_Upsert_BienBan_CustomFields]
    @BienBanId INT,
    @JsonData NVARCHAR(MAX) -- Dữ liệu mảng JSON truyền từ API xuống (VD: {"NguoiGiao":"A", "NguoiNhan":"B"})
AS
BEGIN
    SET NOCOUNT ON;

    -- Dùng MERGE để: Nếu đã có FieldName thì Cập nhật, chưa có thì Thêm mới
    MERGE BienBan_CustomFields AS Target
    USING (
        SELECT 
            @BienBanId AS BienBanId, 
            [key] COLLATE DATABASE_DEFAULT AS FieldName,   -- Fix lỗi collation
            [value] COLLATE DATABASE_DEFAULT AS FieldValue -- Fix lỗi collation
        FROM OPENJSON(@JsonData) -- Parse JSON thành dạng bảng
    ) AS Source
    ON (Target.BienBanId = Source.BienBanId AND Target.FieldName = Source.FieldName)
    
    WHEN MATCHED THEN 
        -- Nếu dòng (BienBanId, FieldName) đã tồn tại -> Cập nhật giá trị mới
        UPDATE SET Target.FieldValue = Source.FieldValue
        
    WHEN NOT MATCHED BY TARGET THEN 
        -- Nếu chưa tồn tại -> Thêm dòng mới
        INSERT (BienBanId, FieldName, FieldValue) 
        VALUES (Source.BienBanId, Source.FieldName, Source.FieldValue);
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_Complete
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_Complete]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_Complete]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_Complete]
    @PhieuKiemId INT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Đếm section thường bị REJECT
    DECLARE @RejectCount INT;
    SELECT @RejectCount = COUNT(*)
    FROM PHIEU_KIEM_SECTION
    WHERE PhieuKiemId = @PhieuKiemId
      AND KetLuan = 'REJECT';

    -- 2. Kiểm tra kết quả đặc biệt: có mẫu nào nằm ngoài dung sai không
    DECLARE @SpecialRejectCount INT;
    SELECT @SpecialRejectCount = COUNT(*)
    FROM PHIEU_KIEM_THONG_SO_KQ kq
    JOIN SAN_PHAM_THONG_SO ts ON ts.Id = kq.ThongSoId
    WHERE kq.PhieuKiemId = @PhieuKiemId
      AND kq.GiaTriDo IS NOT NULL
      AND TRY_CAST(ts.GiaTriChuan AS FLOAT) IS NOT NULL
      AND (
          kq.GiaTriDo < TRY_CAST(ts.GiaTriChuan AS FLOAT) - ts.DungSaiAm
          OR
          kq.GiaTriDo > TRY_CAST(ts.GiaTriChuan AS FLOAT) + ts.DungSaiDuong
      );

    -- 3. Kết luận: KHONG_DAT nếu có bất kỳ lỗi nào
    IF @RejectCount > 0 OR @SpecialRejectCount > 0
    BEGIN
        UPDATE PHIEU_KIEM
        SET KetLuan = 'KHONG_DAT',
            TrangThai = 'CHO_XUONG_XAC_NHAN'
        WHERE Id = @PhieuKiemId;

        -- Tạo biên bản nếu chưa tồn tại
        IF NOT EXISTS (SELECT 1 FROM BIEN_BAN_KIEM WHERE PhieuKiemId = @PhieuKiemId)
        BEGIN
            INSERT INTO BIEN_BAN_KIEM (PhieuKiemId, NguoiLapId, TrangThai)
            VALUES (@PhieuKiemId, @UserId, 'BB_MOI');
        END
    END
    ELSE
    BEGIN
        UPDATE PHIEU_KIEM
        SET KetLuan = 'DAT',
            TrangThai = 'CHO_XUONG_XAC_NHAN',
            NgayKiem = GETDATE()
        WHERE Id = @PhieuKiemId;
    END
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuXuLyKPH_GetList
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuXuLyKPH_GetList]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuXuLyKPH_GetList]
GO

CREATE PROCEDURE [dbo].[sp_PhieuXuLyKPH_GetList]
    @UserId INT = NULL,
    @BoPhanId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        bb.Id AS BienBanId,
        bb.SoBienBan,
        bb.TrangThai,
        bb.LoaiBienBan,
        bb.CreatedAt,
        bb.MoTaChung,
        u.FullName AS NguoiLap,
        COUNT(DISTINCT a.Id) AS SoBoPhan,
        COUNT(DISTINCT x.Id) AS DaCoYKien,
        CAST(
            CASE
                WHEN COUNT(DISTINCT a.Id) = 0 THEN 0
                ELSE COUNT(DISTINCT x.Id) * 100.0 / COUNT(DISTINCT a.Id)
            END
        AS INT) AS ProgressPercent
    FROM dbo.BIEN_BAN_KIEM bb
    LEFT JOIN dbo.USERS u ON u.Id = bb.NguoiLapId
    LEFT JOIN dbo.BIEN_BAN_ASSIGN a ON a.BienBanId = bb.Id
    LEFT JOIN dbo.BIEN_BAN_XU_LY x ON x.BienBanId = bb.Id AND x.BoPhanId = a.BoPhanId
    WHERE bb.LoaiBienBan = N'STANDALONE'
      AND (
            (@UserId IS NULL AND @BoPhanId IS NULL)
         OR bb.NguoiLapId = @UserId
         OR a.BoPhanId = @BoPhanId
         OR a.NguoiXuLyId = @UserId
         OR EXISTS (
                SELECT 1
                FROM dbo.BienBan_CustomFields ctfSig
                WHERE ctfSig.BienBanId = bb.Id
                  AND ctfSig.FieldName = N'BpsxSignatureBoPhanId'
                  AND TRY_CAST(ctfSig.FieldValue AS INT) = @BoPhanId
            )
      )
    GROUP BY
        bb.Id,
        bb.SoBienBan,
        bb.TrangThai,
        bb.LoaiBienBan,
        bb.CreatedAt,
        bb.MoTaChung,
        u.FullName
    ORDER BY bb.CreatedAt DESC, bb.Id DESC;
END;
GO


-- ----------------------------
-- procedure structure for sp_Dashboard_GetKPIs
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_Dashboard_GetKPIs]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_Dashboard_GetKPIs]
GO

CREATE PROCEDURE [dbo].[sp_Dashboard_GetKPIs]
    @TuNgay DATETIME2 = NULL,
    @DenNgay DATETIME2 = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Xử lý tham số ngày (Nếu NULL thì lấy từ đầu tháng đến hiện tại)
    IF @TuNgay IS NULL SET @TuNgay = DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0);
    IF @DenNgay IS NULL SET @DenNgay = GETDATE();

    DECLARE @TongPhieu INT = 0;
    DECLARE @PhieuCho INT = 0;
    DECLARE @PhieuDat INT = 0;
    DECLARE @TongBienBan INT = 0;

    -- Tính các chỉ số cho Phiếu Kiểm
    SELECT 
        @TongPhieu = COUNT(Id),
        -- Giả định Trạng thái: 'Chờ duyệt', 'Đang kiểm' là đang chờ xử lý
        @PhieuCho = SUM(CASE WHEN TrangThai IN ('Chờ duyệt', 'Đang kiểm', 'Chờ PX') THEN 1 ELSE 0 END),
        -- Giả định Kết luận: 'Đạt', 'Pass', 'OK' 
        @PhieuDat = SUM(CASE WHEN KetLuan = N'Đạt' OR KetLuan = 'Pass' THEN 1 ELSE 0 END)
    FROM PHIEU_KIEM 
    WHERE CreatedAt >= @TuNgay AND CreatedAt <= @DenNgay;

    -- Tính số lượng Biên bản sự cố
    SELECT @TongBienBan = COUNT(Id)
    FROM BIEN_BAN_KIEM
    WHERE CreatedAt >= @TuNgay AND CreatedAt <= @DenNgay;

    -- Trả về kết quả
    SELECT 
        ISNULL(@TongPhieu, 0) AS TongPhieuKiem,
        ISNULL(@PhieuCho, 0) AS PhieuDangCho,
        ISNULL(@PhieuDat, 0) AS PhieuDat,
        CASE 
            WHEN @TongPhieu = 0 THEN 0 
            ELSE ROUND((CAST(@PhieuDat AS FLOAT) / @TongPhieu) * 100, 2) 
        END AS TiLeDat_PhanTram,
        ISNULL(@TongBienBan, 0) AS TongBienBanSuCo;
END;
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_GetDetail
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_GetDetail]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_GetDetail]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_GetDetail]
    @PhieuKiemId INT,
    @UserId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @UserId IS NOT NULL
       AND EXISTS (SELECT 1 FROM PHIEU_KIEM WHERE Id = @PhieuKiemId)
       AND NOT EXISTS (
            SELECT 1
            FROM PHIEU_KIEM pk
            JOIN USERS u ON u.Id = @UserId
            WHERE pk.Id = @PhieuKiemId
              AND (
                    NULLIF(LTRIM(RTRIM(u.AllowedLoaiKiemIds)), '') IS NULL
                    OR EXISTS (
                        SELECT 1
                        FROM STRING_SPLIT(u.AllowedLoaiKiemIds, ',') allowed
                        WHERE TRY_CONVERT(INT, LTRIM(RTRIM(allowed.value))) = pk.LoaiKiemId
                    )
              )
       )
    BEGIN
        THROW 51001, 'FORBIDDEN_LOAI_KIEM', 1;
    END;

    SELECT DISTINCT
        pk.Id, pk.SoPhieu, pk.SanPhamId, pk.LoaiKiemId, pk.Lot, pk.DoiTuong,
        pk.NguoiKiemId, pk.CreatedAt, pk.KetLuan, pk.TrangThai,
        pk.SoLuong, pk.NgayKiem, pk.Ngay_Giao, pk.MucDoKiemTra, pk.SourceId,
        sp.TenSanPham,
        sp.ImageUrl,
        u.FullName AS TenNguoiKiem,
        sp.MaSanPham,
        lk.TenLoai AS TenLoaiKiem,
        u1.FullName AS KiemNghiem,
        u2.FullName AS BoPhan,
        ncc.Ten_NhaCungCap AS NhaCungCap,
        bbk.Id AS BienBanId,
        (
            SELECT FieldName, FieldValue
            FROM PhieuKiem_CustomFields ctf
            WHERE ctf.PhieuKiemId = pk.Id
            FOR JSON PATH
        ) AS DynamicFieldsJSON
    FROM PHIEU_KIEM pk
    LEFT JOIN DM_SAN_PHAM sp ON pk.SanPhamId = sp.Id
    LEFT JOIN USERS u ON u.Id = pk.NguoiKiemId
    LEFT JOIN PHIEU_KIEM_SECTION s ON pk.Id = s.PhieuKiemId
    LEFT JOIN PHIEU_KIEM_XAC_NHAN xn ON xn.PhieuKiemId = pk.Id AND xn.VaiTro = 'KIEM_NGHIEM'
    LEFT JOIN USERS u1 ON u1.Id = xn.NguoiXacNhanId
    LEFT JOIN PHIEU_KIEM_XAC_NHAN xn1 ON xn1.PhieuKiemId = pk.Id AND xn1.VaiTro IN ('PX','TBP')
    LEFT JOIN USERS u2 ON u2.Id = xn1.NguoiXacNhanId
    LEFT JOIN DM_LOAI_KIEM lk ON lk.Id = pk.LoaiKiemId
    LEFT JOIN TAG_QTKD.dbo.ChungTuNhap_ChiTiet ctd ON pk.SourceId = ctd.ID_ChungTuNhap_ChiTiet AND pk.LoaiKiemId = 1
    LEFT JOIN TAG_QTKD.dbo.ChungTuNhap ct ON ct.ID_ChungTuNhap = ctd.ID_ChungTuNhap
    LEFT JOIN TAG_QTKD.dbo.DM_NhaCungCap ncc ON ct.ID_NhaCungCap = ncc.ID_NhaCungCap AND ncc.TonTai = 1
    LEFT JOIN BIEN_BAN_KIEM bbk ON bbk.PhieuKiemId = pk.Id
    WHERE pk.Id = @PhieuKiemId;

    SELECT *
    FROM PHIEU_KIEM_SECTION
    WHERE PhieuKiemId = @PhieuKiemId;

    SELECT ci.*, d.DefectId, d.SoLuong, d.DefectType, d.ImageUrls, dm.MaLoi, dm.TenLoi
    FROM PHIEU_KIEM_CHECK_ITEM ci
    JOIN PHIEU_KIEM_SECTION s ON ci.SectionId = s.Id
    LEFT JOIN PHIEU_KIEM_DEFECT d ON ci.Id = d.CheckItemId
    LEFT JOIN DM_DEFECT dm ON dm.Id = d.DefectId
    WHERE s.PhieuKiemId = @PhieuKiemId;

    SELECT d.*
    FROM PHIEU_KIEM_DEFECT d
    JOIN PHIEU_KIEM_SECTION s ON d.SectionId = s.Id
    WHERE s.PhieuKiemId = @PhieuKiemId;
END;
GO


-- ----------------------------
-- procedure structure for sp_PhieuXuLyKPH_GetDetail
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuXuLyKPH_GetDetail]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuXuLyKPH_GetDetail]
GO

CREATE PROCEDURE [dbo].[sp_PhieuXuLyKPH_GetDetail]
    @BienBanId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        bb.Id AS BienBanId,
        bb.SoBienBan,
        bb.TrangThai,
        bb.MucDoKhongPhuHop,
        bb.MoTaChung,
        bb.CreatedAt,
        bb.AssignConfirmed,
        bb.LoaiBienBan,
        bb.NguoiLapId,
        u.FullName AS NguoiLap,
        bp.TenBoPhan,
        bp.MaBoPhan,
        bpsx.BoPhanId AS BpsxSignatureBoPhanId,
        bpsx.TenBoPhan AS BpsxSignatureTenBoPhan,
        bpsx.MaBoPhan AS BpsxSignatureMaBoPhan,
        (
            SELECT FieldName, FieldValue
            FROM dbo.BienBan_CustomFields ctf
            WHERE ctf.BienBanId = bb.Id
            FOR JSON PATH
        ) AS DynamicFieldsJSON
    FROM dbo.BIEN_BAN_KIEM bb
    LEFT JOIN dbo.USERS u ON u.Id = bb.NguoiLapId
    LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = u.BoPhanId
    OUTER APPLY (
        SELECT TOP 1
            bpSig.Id AS BoPhanId,
            bpSig.TenBoPhan,
            bpSig.MaBoPhan
        FROM dbo.BienBan_CustomFields ctfSig
        JOIN dbo.DM_BO_PHAN bpSig ON bpSig.Id = TRY_CAST(ctfSig.FieldValue AS INT)
        WHERE ctfSig.BienBanId = bb.Id
          AND ctfSig.FieldName = N'BpsxSignatureBoPhanId'
    ) bpsx
    WHERE bb.Id = @BienBanId
      AND bb.LoaiBienBan = N'STANDALONE';

    SELECT
        d.Id,
        d.BienBanId,
        d.DefectId,
        d.MaLoi,
        d.TenLoi,
        d.DefectType,
        d.TenLoiTuNhap,
        d.MoTa,
        d.SoLuong,
        CAST(NULL AS INT) AS SoLuongKiem,
        d.GhiChu,
        d.SortOrder,
        CAST(NULL AS NVARCHAR(MAX)) AS ImageUrls
    FROM dbo.BIEN_BAN_DEFECT d
    WHERE d.BienBanId = @BienBanId
    ORDER BY d.SortOrder, d.Id;

    SELECT
        a.Id,
        a.BoPhanId,
        bp.MaBoPhan,
        bp.TenBoPhan,
        CAST(
            CASE
                WHEN TRY_CAST(ctfSig.FieldValue AS INT) = a.BoPhanId THEN 1
                ELSE 0
            END
        AS BIT) AS IsBpsxSignature
    FROM dbo.BIEN_BAN_ASSIGN a
    JOIN dbo.DM_BO_PHAN bp ON a.BoPhanId = bp.Id
    LEFT JOIN dbo.BienBan_CustomFields ctfSig
        ON ctfSig.BienBanId = a.BienBanId
       AND ctfSig.FieldName = N'BpsxSignatureBoPhanId'
    WHERE a.BienBanId = @BienBanId;

    SELECT
        x.Id,
        x.BoPhan,
        x.NoiDung,
        dx.Ten AS DeNghiXuLy,
        x.ThoiHan,
        x.NguoiXuLyId,
        a.BoPhanId,
        u1.FullName AS NguoiNhap,
        x.CreatedAt,
        u2.FullName AS NguoiXuLy,
        bp.MaBoPhan,
        bp.TenBoPhan
    FROM dbo.BIEN_BAN_XU_LY x
    LEFT JOIN dbo.BIEN_BAN_KIEM k ON k.Id = x.BienBanId
    LEFT JOIN dbo.DM_DE_NGHI_XU_LY dx ON dx.Id = x.DeNghiXuLyId
    JOIN dbo.BIEN_BAN_ASSIGN a ON a.BienBanId = k.Id AND a.BoPhanId = x.BoPhanId
    LEFT JOIN dbo.USERS u1 ON x.DeNghiXuLyId = u1.Id
    LEFT JOIN dbo.USERS u2 ON x.NguoiXuLyId = u2.Id
    LEFT JOIN dbo.DM_BO_PHAN bp ON u2.BoPhanId = bp.Id
    WHERE x.BienBanId = @BienBanId;

    SELECT
        c.Id,
        c.LoaiChiPhi,
        c.GiaTri,
        c.ThoiHan,
        c.BoPhanId,
        bp.MaBoPhan,
        bp.TenBoPhan,
        u.FullName AS NguoiXuLy,
        c.CreatedAt
    FROM dbo.BIEN_BAN_CHI_PHI c
    LEFT JOIN dbo.USERS u ON c.CreatedBy = u.Id
    LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = c.BoPhanId
    WHERE c.BienBanId = @BienBanId;

    SELECT
        x.*,
        u.FullName,
        u.BoPhanId,
        bp.MaBoPhan,
        bp.TenBoPhan
    FROM dbo.BIEN_BAN_XAC_NHAN x
    LEFT JOIN dbo.USERS u ON x.NguoiXacNhanId = u.Id
    LEFT JOIN dbo.DM_BO_PHAN bp ON bp.Id = u.BoPhanId
    WHERE x.BienBanId = @BienBanId;

    SELECT
        h.Id,
        h.NoiDung,
        h.ThoiHan,
        h.TheoDoi,
        h.BoPhanId,
        bp.TenBoPhan,
        u.FullName AS NguoiXuLy
    FROM dbo.BIEN_BAN_HANH_DONG h
    LEFT JOIN dbo.DM_BO_PHAN bp ON h.BoPhanId = bp.Id
    LEFT JOIN dbo.USERS u ON h.CreatedBy = u.Id
    WHERE h.BienBanId = @BienBanId
    ORDER BY h.CreatedAt ASC, h.Id ASC;
END;
GO


-- ----------------------------
-- procedure structure for sp_DM_GetDefectList
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_GetDefectList]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_GetDefectList]
GO

CREATE PROCEDURE [dbo].[sp_DM_GetDefectList]
    @DefectType NVARCHAR(20) = NULL,
    @PhanHe NVARCHAR(20) = 'ALL'
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        Id,
        MaLoi,
        TenLoi,
        DefectType,
        MoTa,
        GhiChu,
        PhuongAnXuLy,
        PhanHe,
        MaNhomLoi,
        LoaiLoiSXBT,
        TenSanPham,
        ChungLoai,
        PhamViApDung,
        ThiTruong,
        ImageUrl,
        ThuTu,
        TrangThai
    FROM dbo.DM_DEFECT
    WHERE
        (@DefectType IS NULL OR DefectType = @DefectType)
        AND TrangThai = 1
--         AND (
--             ISNULL(@PhanHe, 'ALL') = 'ALL'
--             OR PhanHe = 'ALL'
--         )
    ORDER BY
        ISNULL(ThuTu, 2147483647),
        MaLoi,
        Id;
END
GO


-- ----------------------------
-- procedure structure for sp_BienBan_AssignNhanVien
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_AssignNhanVien]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_AssignNhanVien]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_AssignNhanVien]
(
    @BienBanId INT,
    @BoPhanId INT,
    @NguoiXuLyId INT
--     @AssignedBy INT
)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM BIEN_BAN_ASSIGN
        WHERE BienBanId = @BienBanId
          AND BoPhanId = @BoPhanId
    )
    BEGIN
        RAISERROR(N'Bộ phận chưa được phân',16,1)
        RETURN
    END

    UPDATE BIEN_BAN_ASSIGN
    SET 
        NguoiXuLyId = @NguoiXuLyId,
        AssignedToUserAt = GETDATE()   -- 🔥 QUAN TRỌNG
    WHERE BienBanId = @BienBanId
      AND BoPhanId = @BoPhanId
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_GetList
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_GetList]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_GetList]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_GetList]
    @TrangThai NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        pk.Id,
        pk.SoPhieu,
        pk.Lot,
        pk.LoaiKiemId,
        pk.DoiTuong,
        pk.KetLuan,
        pk.TrangThai,
        pk.NgayKiem as ThoiGianKiem,
        sp.TenSanPham
    FROM PHIEU_KIEM pk
    JOIN DM_SAN_PHAM sp ON pk.SanPhamId = sp.Id
    WHERE (@TrangThai IS NULL OR pk.TrangThai = @TrangThai)
    ORDER BY pk.NgayKiem DESC;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuXuLyKPH_SaveHeader
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuXuLyKPH_SaveHeader]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuXuLyKPH_SaveHeader]
GO

CREATE PROCEDURE [dbo].[sp_PhieuXuLyKPH_SaveHeader]
    @BienBanId INT,
    @MoTaChung NVARCHAR(MAX),
    @FieldsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.BIEN_BAN_KIEM
        WHERE Id = @BienBanId
          AND LoaiBienBan = N'STANDALONE'
    )
    BEGIN
        RAISERROR(N'Không tìm thấy phiếu xử lý không phù hợp', 16, 1);
        RETURN;
    END

    UPDATE dbo.BIEN_BAN_KIEM
    SET MoTaChung = @MoTaChung,
        TrangThai = CASE
            WHEN ISNULL(NULLIF(LTRIM(RTRIM(@MoTaChung)), ''), '') <> '' THEN N'CHO_PHAN_BO_XU_LY'
            ELSE TrangThai
        END
    WHERE Id = @BienBanId;

    EXEC dbo.SP_Upsert_BienBan_CustomFields
        @BienBanId = @BienBanId,
        @JsonData = @FieldsJson;
END;
GO


-- ----------------------------
-- procedure structure for sp_DM_CreateDefect
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_CreateDefect]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_CreateDefect]
GO

CREATE PROCEDURE [dbo].[sp_DM_CreateDefect]
    @TenLoi NVARCHAR(255),
    @DefectType NVARCHAR(20),
    @MoTa NVARCHAR(MAX) = NULL,
    @GhiChu NVARCHAR(MAX) = NULL,
    @MaLoi NVARCHAR(50) = NULL,
    @PhanHe NVARCHAR(20) = NULL,
    @MaNhomLoi NVARCHAR(20) = NULL,
    @LoaiLoiSXBT NVARCHAR(10) = NULL,
    @TenSanPham NVARCHAR(255) = NULL,
    @ChungLoai NVARCHAR(255) = NULL,
    @PhamViApDung NVARCHAR(500) = NULL,
    @ThiTruong NVARCHAR(255) = NULL,
    @ImageUrl NVARCHAR(500) = NULL,
    @ImageUrls NVARCHAR(MAX) = NULL,
    @ThuTu INT = NULL,
    @PhuongAnXuLy NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NULLIF(LTRIM(RTRIM(@MaLoi)), '') IS NULL
    BEGIN
        IF NULLIF(LTRIM(RTRIM(@MaNhomLoi)), '') IS NULL
        BEGIN
            RAISERROR(N'Vui lòng nhập MaNhomLoi để tự sinh MaLoi.', 16, 1);
            RETURN;
        END;

        DECLARE @NextStt INT;

        SELECT @NextStt = ISNULL(MAX(
            TRY_CONVERT(INT, SUBSTRING(MaLoi, LEN(@MaNhomLoi) + 2, 50))
        ), 0) + 1
        FROM dbo.DM_DEFECT WITH (UPDLOCK, HOLDLOCK)
        WHERE MaNhomLoi = @MaNhomLoi
          AND MaLoi LIKE @MaNhomLoi + '-%';

        SET @MaLoi = @MaNhomLoi + '-' + RIGHT('0000' + CAST(@NextStt AS VARCHAR(10)), 4);
    END;

    INSERT INTO dbo.DM_DEFECT (
        TenLoi,
        DefectType,
        MoTa,
        GhiChu,
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
        ThuTu,
        PhuongAnXuLy,
        TrangThai
    )
    VALUES (
        @TenLoi,
        @DefectType,
        @MoTa,
        @GhiChu,
        @MaLoi,
        @PhanHe,
        @MaNhomLoi,
        @LoaiLoiSXBT,
        @TenSanPham,
        @ChungLoai,
        @PhamViApDung,
        @ThiTruong,
        @ImageUrl,
        @ImageUrls,
        @ThuTu,
        @PhuongAnXuLy,
        1
    );
END;
GO


-- ----------------------------
-- procedure structure for sp_User_GetByBoPhan
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_User_GetByBoPhan]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_User_GetByBoPhan]
GO

CREATE PROCEDURE [dbo].[sp_User_GetByBoPhan]
(
    @BoPhanId INT
)
AS
BEGIN
    SELECT Id, FullName
    FROM USERS
    WHERE BoPhanId = @BoPhanId
END
GO


-- ----------------------------
-- procedure structure for sp_BienBan_Create
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_Create]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_Create]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_Create]
    @PhieuKiemId INT,
    @LoaiTrachNhiem NVARCHAR(50),
    @NguoiLapId INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @KetLuan NVARCHAR(20);

    SELECT @KetLuan = KetLuan
    FROM PHIEU_KIEM
    WHERE Id = @PhieuKiemId;

    IF @KetLuan <> 'KHONG_DAT'
        RAISERROR('PHIEU_NOT_REJECTED',16,1);

    INSERT INTO BIEN_BAN_KIEM (
        PhieuKiemId,
        LoaiTrachNhiem,
        TrangThai,
        NguoiLapId
    )
    VALUES (
        @PhieuKiemId,
        @LoaiTrachNhiem,
        'CHO_XAC_NHAN',
        @NguoiLapId
    );

    SELECT SCOPE_IDENTITY() AS BienBanId;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuXuLyKPH_SaveDefects
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuXuLyKPH_SaveDefects]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuXuLyKPH_SaveDefects]
GO

CREATE PROCEDURE [dbo].[sp_PhieuXuLyKPH_SaveDefects]
    @BienBanId INT,
    @DefectsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.BIEN_BAN_KIEM
        WHERE Id = @BienBanId
          AND LoaiBienBan = N'STANDALONE'
    )
    BEGIN
        RAISERROR(N'Không tìm thấy phiếu xử lý không phù hợp', 16, 1);
        RETURN;
    END

    DELETE FROM dbo.BIEN_BAN_DEFECT
    WHERE BienBanId = @BienBanId;

    INSERT INTO dbo.BIEN_BAN_DEFECT (
        BienBanId,
        DefectId,
        MaLoi,
        TenLoi,
        DefectType,
        TenLoiTuNhap,
        MoTa,
        SoLuong,
        GhiChu,
        SortOrder
    )
    SELECT
        @BienBanId,
        src.DefectId,
        NULLIF(LTRIM(RTRIM(src.MaLoi)), ''),
        NULLIF(LTRIM(RTRIM(src.TenLoi)), ''),
        NULLIF(LTRIM(RTRIM(src.DefectType)), ''),
        NULLIF(LTRIM(RTRIM(src.TenLoiTuNhap)), ''),
        NULLIF(LTRIM(RTRIM(src.MoTa)), ''),
        CASE WHEN ISNULL(src.SoLuong, 0) > 0 THEN src.SoLuong ELSE 1 END,
        NULLIF(LTRIM(RTRIM(src.GhiChu)), ''),
        CASE WHEN ISNULL(src.SortOrder, 0) > 0 THEN src.SortOrder ELSE src.JsonOrder END
    FROM (
        SELECT
            TRY_CAST([key] AS INT) + 1 AS JsonOrder,
            TRY_CAST(COALESCE(JSON_VALUE([value], '$.defectId'), JSON_VALUE([value], '$.DefectId')) AS INT) AS DefectId,
            COALESCE(JSON_VALUE([value], '$.maLoi'), JSON_VALUE([value], '$.MaLoi')) AS MaLoi,
            COALESCE(JSON_VALUE([value], '$.tenLoi'), JSON_VALUE([value], '$.TenLoi')) AS TenLoi,
            COALESCE(JSON_VALUE([value], '$.defectType'), JSON_VALUE([value], '$.DefectType')) AS DefectType,
            COALESCE(JSON_VALUE([value], '$.tenLoiTuNhap'), JSON_VALUE([value], '$.TenLoiTuNhap')) AS TenLoiTuNhap,
            COALESCE(JSON_VALUE([value], '$.moTa'), JSON_VALUE([value], '$.MoTa')) AS MoTa,
            TRY_CAST(COALESCE(JSON_VALUE([value], '$.soLuong'), JSON_VALUE([value], '$.SoLuong')) AS INT) AS SoLuong,
            COALESCE(JSON_VALUE([value], '$.ghiChu'), JSON_VALUE([value], '$.GhiChu')) AS GhiChu,
            TRY_CAST(COALESCE(JSON_VALUE([value], '$.sortOrder'), JSON_VALUE([value], '$.SortOrder')) AS INT) AS SortOrder
        FROM OPENJSON(@DefectsJson)
    ) src
    WHERE src.DefectId IS NOT NULL
       OR ISNULL(NULLIF(LTRIM(RTRIM(src.TenLoiTuNhap)), ''), '') <> ''
       OR ISNULL(NULLIF(LTRIM(RTRIM(src.TenLoi)), ''), '') <> '';
END;
GO


-- ----------------------------
-- procedure structure for sp_DM_UpdateDefect
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_DM_UpdateDefect]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_DM_UpdateDefect]
GO

CREATE PROCEDURE [dbo].[sp_DM_UpdateDefect]
    @Id INT,
    @TenLoi NVARCHAR(255),
    @DefectType NVARCHAR(20),
    @TrangThai BIT,
    @MoTa NVARCHAR(MAX) = NULL,
    @GhiChu NVARCHAR(MAX) = NULL,
    @PhuongAnXuLy NVARCHAR(MAX) = NULL,
    @MaLoi NVARCHAR(50) = NULL,
    @PhanHe NVARCHAR(20) = NULL,
    @MaNhomLoi NVARCHAR(20) = NULL,
    @LoaiLoiSXBT NVARCHAR(10) = NULL,
    @TenSanPham NVARCHAR(255) = NULL,
    @ChungLoai NVARCHAR(255) = NULL,
    @PhamViApDung NVARCHAR(500) = NULL,
    @ThiTruong NVARCHAR(255) = NULL,
    @ImageUrl NVARCHAR(500) = NULL,
    @ImageUrls NVARCHAR(MAX) = NULL,
    @ThuTu INT = NULL
AS
BEGIN
SET NOCOUNT ON;

    UPDATE dbo.DM_DEFECT
    SET
        MaLoi = NULLIF(LTRIM(RTRIM(@MaLoi)), ''),
        TenLoi = @TenLoi,
        DefectType = @DefectType,
        TrangThai = @TrangThai,
        MoTa = @MoTa,
        GhiChu = @GhiChu,
        PhuongAnXuLy = @PhuongAnXuLy,
        PhanHe = @PhanHe,
        MaNhomLoi = @MaNhomLoi,
        LoaiLoiSXBT = @LoaiLoiSXBT,
        TenSanPham = @TenSanPham,
        ChungLoai = @ChungLoai,
        PhamViApDung = @PhamViApDung,
        ThiTruong = @ThiTruong,
        ImageUrl = @ImageUrl,
        ImageUrls = @ImageUrls,
        ThuTu = @ThuTu
    WHERE Id = @Id;
END;
GO


-- ----------------------------
-- procedure structure for sp_BienBan_XacNhan
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_XacNhan]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_XacNhan]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_XacNhan]
    @BienBanId INT,
    @NguoiXacNhanId INT,
    @NoiDung NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM BIEN_BAN_KIEM
        WHERE Id = @BienBanId
          AND TrangThai = 'CHO_XAC_NHAN'
    )
        RAISERROR('INVALID_STATE',16,1);

    INSERT INTO BIEN_BAN_XAC_NHAN (
        BienBanId,
        NguoiXacNhanId,
        NoiDung
    )
    VALUES (
        @BienBanId,
        @NguoiXacNhanId,
        @NoiDung
    );

    UPDATE BIEN_BAN_KIEM
    SET TrangThai = 'DA_XAC_NHAN'
    WHERE Id = @BienBanId;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuXuLyKPH_Delete
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuXuLyKPH_Delete]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuXuLyKPH_Delete]
GO

CREATE PROCEDURE [dbo].[sp_PhieuXuLyKPH_Delete]
    @BienBanId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.BIEN_BAN_KIEM
        WHERE Id = @BienBanId
          AND LoaiBienBan = N'STANDALONE'
    )
    BEGIN
        RAISERROR(N'Không tìm thấy phiếu xử lý không phù hợp', 16, 1);
        RETURN;
    END

    BEGIN TRAN;
    BEGIN TRY
        DELETE FROM dbo.BIEN_BAN_DEFECT WHERE BienBanId = @BienBanId;
        DELETE FROM dbo.BienBan_CustomFields WHERE BienBanId = @BienBanId;
        DELETE FROM dbo.BIEN_BAN_XAC_NHAN WHERE BienBanId = @BienBanId;
        DELETE FROM dbo.BIEN_BAN_HANH_DONG WHERE BienBanId = @BienBanId;
        DELETE FROM dbo.BIEN_BAN_CHI_PHI WHERE BienBanId = @BienBanId;
        DELETE FROM dbo.BIEN_BAN_XU_LY WHERE BienBanId = @BienBanId;
        DELETE FROM dbo.BIEN_BAN_ASSIGN WHERE BienBanId = @BienBanId;
        DELETE FROM dbo.BIEN_BAN_KIEM WHERE Id = @BienBanId AND LoaiBienBan = N'STANDALONE';

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH
END;
GO


-- ----------------------------
-- procedure structure for sp_BienBan_TrinhB8
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_TrinhB8]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_TrinhB8]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_TrinhB8]
    @BienBanId INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE BIEN_BAN_KIEM
    SET TrangThai = 'CHO_TPB8'
    WHERE Id = @BienBanId
      AND TrangThai = 'DA_XAC_NHAN';

    IF @@ROWCOUNT = 0
        RAISERROR('INVALID_STATE',16,1);
END
GO


-- ----------------------------
-- procedure structure for sp_BienBan_XinYKien
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_XinYKien]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_XinYKien]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_XinYKien]
    @BienBanId INT,
    @BoPhan NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM BIEN_BAN_KIEM
        WHERE Id = @BienBanId
          AND TrangThai = 'CHO_TPB8'
    )
        RAISERROR('INVALID_STATE',16,1);

    INSERT INTO XIN_Y_KIEN (
        BienBanId,
        BoPhan,
        TrangThai
    )
    VALUES (
        @BienBanId,
        @BoPhan,
        'DANG_XIN'
    );

    UPDATE BIEN_BAN_KIEM
    SET TrangThai = 'XIN_Y_KIEN'
    WHERE Id = @BienBanId;
END
GO


-- ----------------------------
-- procedure structure for sp_BienBan_TraLoiYKien
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_TraLoiYKien]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_TraLoiYKien]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_TraLoiYKien]
    @XinYKienId INT,
    @NguoiTraLoiId INT,
    @NoiDung NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO TRA_LOI_Y_KIEN (
        XinYKienId,
        NguoiTraLoiId,
        NoiDung
    )
    VALUES (
        @XinYKienId,
        @NguoiTraLoiId,
        @NoiDung
    );
END
GO


-- ----------------------------
-- procedure structure for sp_BienBan_DuyetYKien
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_DuyetYKien]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_DuyetYKien]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_DuyetYKien]
    @BienBanId INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE BIEN_BAN_KIEM
    SET TrangThai = 'CHO_KET_LUAN'
    WHERE Id = @BienBanId
      AND TrangThai = 'XIN_Y_KIEN';

    IF @@ROWCOUNT = 0
        RAISERROR('INVALID_STATE',16,1);
END
GO


-- ----------------------------
-- procedure structure for sp_BienBan_KetLuan
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_KetLuan]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_KetLuan]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_KetLuan]
    @BienBanId INT,
    @KetLuan NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM BIEN_BAN_KIEM
        WHERE Id = @BienBanId
          AND TrangThai IN ('CHO_TPB8','CHO_KET_LUAN')
    )
        RAISERROR('INVALID_STATE',16,1);

    UPDATE BIEN_BAN_KIEM
    SET TrangThai = 'DA_KET_LUAN',
        KetLuan = @KetLuan
    WHERE Id = @BienBanId;
END
GO


-- ----------------------------
-- procedure structure for sp_BienBan_GetDetail
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_GetDetail]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_GetDetail]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_GetDetail]
    @BienBanId INT
AS
BEGIN
    SET NOCOUNT ON;

    /* =====================================================
       1. THÔNG TIN BIÊN BẢN + PHIẾU KIỂM
    ===================================================== */

    SELECT
        bb.Id AS BienBanId,
        bb.SoBienBan,
        bb.TrangThai,
        bb.MucDoKhongPhuHop,
        bb.MoTaChung,
        bb.CreatedAt,
        bb.AssignConfirmed,
        pk.Id AS PhieuKiemId,
        pk.SoPhieu,
        pk.Lot,
        pk.DoiTuong,
        pk.CreatedAt as NgayTao,
        pk.LoaiKiemId,
        sp.MaSanPham,
        sp.TenSanPham,
        lk.MaLoai AS PhatHienTu,
        u.FullName AS NguoiLap,
        bp.TenBoPhan,
        bp.MaBoPhan,
        ncc.Ten_NhaCungCap as Ten_NhaCungCap,
        (
            SELECT FieldName, FieldValue
            FROM BienBan_CustomFields ctf
            WHERE ctf.BienBanId = bb.Id
            FOR JSON PATH
        ) AS DynamicFieldsJSON,
        (
            SELECT FieldName, FieldValue
            FROM PhieuKiem_CustomFields pkcf
            WHERE pkcf.PhieuKiemId = pk.Id
            FOR JSON PATH
        ) AS PhieuKiemDynamicFieldsJSON
    FROM BIEN_BAN_KIEM bb
    JOIN PHIEU_KIEM pk
        ON bb.PhieuKiemId = pk.Id
    LEFT JOIN DM_SAN_PHAM sp
        ON pk.SanPhamId = sp.Id
    LEFT JOIN DM_LOAI_KIEM lk
        ON pk.LoaiKiemId = lk.Id
    LEFT JOIN USERS u
        ON bb.NguoiLapId = u.Id
    LEFT JOIN DM_BO_PHAN bp ON u.BoPhanId = bp.Id
    LEFT JOIN TAG_QTKD.dbo.ChungTuNhap_ChiTiet ctd ON pk.SourceId = ctd.ID_ChungTuNhap_ChiTiet
    LEFT JOIN TAG_QTKD.dbo.ChungTuNhap ct ON ct.ID_ChungTuNhap = ctd.ID_ChungTuNhap
    LEFT JOIN TAG_QTKD.dbo.DM_NhaCungCap ncc ON ct.ID_NhaCungCap = ncc.ID_NhaCungCap AND ncc.TonTai = 1
    WHERE bb.Id = @BienBanId;

    /* =====================================================
       2. DANH SÁCH LỖI TỪ PHIẾU KIỂM / PHIẾU TRÊN CHUYỀN
    ===================================================== */

    IF EXISTS (
        SELECT 1
        FROM BIEN_BAN_KIEM bb
        JOIN PHIEU_KIEM pk ON bb.PhieuKiemId = pk.Id
        WHERE bb.Id = @BienBanId
          AND pk.LoaiKiemId = 6
    )
    BEGIN
        SELECT
            td.DefectId,
            dm.MaLoi,
            dm.TenLoi,
            dm.DefectType,
            dm.MoTa,
            SUM(td.SoLuong) AS SoLuong,
            CAST(NULL AS INT) AS SoLuongKiem,
            (
                SELECT DISTINCT img.[value]
                FROM dbo.BIEN_BAN_KIEM bb2
                JOIN dbo.PHIEU_KIEM pk2 ON pk2.Id = bb2.PhieuKiemId
                JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT s2 ON s2.PhieuKiemId = pk2.Id
                JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY e2 ON e2.SlotId = s2.Id
                JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT td2 ON td2.EntryId = e2.Id
                CROSS APPLY OPENJSON(ISNULL(td2.ImageUrls, '[]')) img
                WHERE bb2.Id = @BienBanId
                AND td2.DefectId = td.DefectId
                FOR JSON PATH
            ) AS ImageUrls
        FROM BIEN_BAN_KIEM bb
        JOIN PHIEU_KIEM pk ON bb.PhieuKiemId = pk.Id
        JOIN PHIEU_KIEM_TREN_CHUYEN_SLOT s ON s.PhieuKiemId = pk.Id
        JOIN PHIEU_KIEM_TREN_CHUYEN_ENTRY e ON e.SlotId = s.Id
        JOIN PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT td ON td.EntryId = e.Id
        JOIN DM_DEFECT dm ON dm.Id = td.DefectId
        WHERE bb.Id = @BienBanId
        GROUP BY
            td.DefectId,
            dm.MaLoi,
            dm.TenLoi,
            dm.DefectType,
            dm.MoTa
        ORDER BY dm.MaLoi, dm.TenLoi;
    END
    ELSE
    BEGIN
        SELECT
            pkd.DefectId AS DefectId,
            d.MaLoi,
            d.TenLoi,
            d.DefectType,
            d.MoTa,
            pkd.SoLuong,
            s.SoLuongKiem,
            pkd.ImageUrls
        FROM BIEN_BAN_KIEM bb
        JOIN PHIEU_KIEM pk
            ON bb.PhieuKiemId = pk.Id
        JOIN PHIEU_KIEM_SECTION s
            ON s.PhieuKiemId = pk.Id
        JOIN PHIEU_KIEM_DEFECT pkd
            ON pkd.SectionId = s.Id
        JOIN DM_DEFECT d
            ON pkd.DefectId = d.Id
        WHERE bb.Id = @BienBanId;
    END

    /* =====================================================
       3. BỘ PHẬN ĐƯỢC PHÂN Ý KIẾN
    ===================================================== */

    SELECT
        a.Id,
        a.BoPhanId,
        bp.MaBoPhan,
        bp.TenBoPhan
    FROM BIEN_BAN_ASSIGN a
    JOIN DM_BO_PHAN bp
        ON a.BoPhanId = bp.Id
    WHERE a.BienBanId = @BienBanId;

    /* =====================================================
       4. ĐỀ XUẤT XỬ LÝ (Ý KIẾN CÁC BỘ PHẬN)
    ===================================================== */

    SELECT
        x.Id,
        x.BoPhan,
        x.NoiDung,
        dx.Ten AS DeNghiXuLy,
        x.ThoiHan,
        x.NguoiXuLyId,
        a.BoPhanId,
        u1.FullName AS NguoiNhap,
        x.CreatedAt,
        u2.FullName AS NguoiXuLy,
        bp.MaBoPhan,
        bp.TenBoPhan
    FROM BIEN_BAN_XU_LY x
    LEFT JOIN BIEN_BAN_KIEM k ON k.Id = x.BienBanId
    LEFT JOIN DM_DE_NGHI_XU_LY dx ON dx.Id = x.DeNghiXuLyId
    JOIN BIEN_BAN_ASSIGN a ON a.BienBanId = k.Id AND a.BoPhanId = x.BoPhanId
    LEFT JOIN USERS u1 ON x.DeNghiXuLyId = u1.Id
    LEFT JOIN USERS u2 ON x.NguoiXuLyId = u2.Id
    LEFT JOIN DM_BO_PHAN bp ON u2.BoPhanId = bp.Id
    WHERE x.BienBanId = @BienBanId;

    /* =====================================================
       5. CHI PHÍ PHÁT SINH
    ===================================================== */

    SELECT
        c.Id,
        c.LoaiChiPhi,
        c.GiaTri,
        c.ThoiHan,
        c.BoPhanId,
        bp.MaBoPhan,
        bp.TenBoPhan,
        u.FullName AS NguoiXuLy,
        c.CreatedAt
    FROM BIEN_BAN_CHI_PHI c
    LEFT JOIN USERS u
        ON c.CreatedBy = u.Id
    LEFT JOIN DM_BO_PHAN bp ON bp.Id = c.BoPhanId
    WHERE c.BienBanId = @BienBanId;
    /* =====================================================
       7. XÁC NHẬN BIÊN BẢN
    ===================================================== */

    SELECT
        x.*,
        u.FullName,
        u.BoPhanId
    FROM BIEN_BAN_XAC_NHAN x
    LEFT JOIN USERS u ON x.NguoiXacNhanId = u.Id
    LEFT JOIN DM_BO_PHAN b ON u.BoPhanId = b.Id
    WHERE x.BienBanId = @BienBanId;

    /* =====================================================
       8. Hành động khắc phục
    ===================================================== */

    SELECT
        h.Id,
        h.NoiDung,
        h.ThoiHan,
        h.TheoDoi,
        h.BoPhanId,
        bp.TenBoPhan,
        h.CreatedAt
    FROM BIEN_BAN_HANH_DONG h
    LEFT JOIN DM_BO_PHAN bp ON bp.Id = h.BoPhanId
    WHERE h.BienBanId = @BienBanId
    ORDER BY h.CreatedAt ASC;
END;
GO


-- ----------------------------
-- procedure structure for sp_BienBan_GetList
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_BienBan_GetList]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_BienBan_GetList]
GO

CREATE PROCEDURE [dbo].[sp_BienBan_GetList]
(
    @UserId INT = NULL,
    @BoPhanId INT = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        bb.Id AS BienBanId,
        pk.SoPhieu,
        sp.TenSanPham,
        pk.Lot,
        u1.FullName AS NguoiLap,
        bb.TrangThai,
        bb.LoaiBienBan,
        bb.CreatedAt,
        
        COUNT(DISTINCT a.Id) AS SoBoPhan,
        COUNT(DISTINCT x.Id) AS DaCoYKien,

        CAST(
            CASE 
                WHEN COUNT(DISTINCT a.Id)=0 
                THEN 0
                ELSE COUNT(DISTINCT x.Id)*100.0 / COUNT(DISTINCT a.Id)
            END
        AS INT) AS ProgressPercent

    FROM BIEN_BAN_KIEM bb

    JOIN PHIEU_KIEM pk
        ON bb.PhieuKiemId = pk.Id

    LEFT JOIN DM_SAN_PHAM sp
        ON pk.SanPhamId = sp.Id

    LEFT JOIN USERS u1
        ON bb.NguoiLapId = u1.Id
    
    LEFT JOIN BIEN_BAN_ASSIGN a
        ON bb.Id = a.BienBanId

    LEFT JOIN BIEN_BAN_XU_LY x
        ON bb.Id = x.BienBanId AND x.BoPhanId = a.BoPhanId

    WHERE 
        (@UserId IS NULL AND @BoPhanId IS NULL) -- Trường hợp xem tất cả (Admin)
        OR bb.NguoiLapId = @UserId -- Người lập biên bản
        OR a.BoPhanId = @BoPhanId -- Bộ phận được phân công
        OR a.NguoiXuLyId = @UserId -- Cá nhân được phân công

    GROUP BY
        bb.Id,
        pk.SoPhieu,
        sp.TenSanPham,
        pk.Lot,
        u1.FullName,
        bb.TrangThai,
        bb.LoaiBienBan,
        bb.CreatedAt

    ORDER BY bb.CreatedAt DESC
END
GO


-- ----------------------------
-- procedure structure for sp_KeHoachSanXuat_GetList_ChuaKiem_TrenChuyen
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_KeHoachSanXuat_GetList_ChuaKiem_TrenChuyen]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_KeHoachSanXuat_GetList_ChuaKiem_TrenChuyen]
GO

CREATE PROCEDURE [dbo].[sp_KeHoachSanXuat_GetList_ChuaKiem_TrenChuyen]
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LoaiKiemId INT;

    -- 🔥 Lấy loại kiểm trên chuyền
    SELECT @LoaiKiemId = Id
    FROM DM_LOAI_KIEM
    WHERE MaLoai = 'KIEM_TREN_CHUYEN';

    SELECT 
        b.ID_KeHoachSanXuat,
        b.Ngay_BatDauSX,
        b.Ngay_KetThucSX,
        khsx_n.SoLuong_SanPham AS NangSuat_DuKien,
        khsx_n.Ngay,
        qt.Ten_QuyTrinhSanXuat,
        f.Ten_BoPhan,
        d.Ten_DonVi,
        
        sp.Id AS SanPhamId,
        dhsp.ItemCode,
        sp.MaSanPham,
        sp.TenSanPham,

        a.SoLuong_SanPham AS SoLuongKeHoach,

        ISNULL(sx.SL, 0) AS DaSanXuat,

        CASE 
            WHEN pk.Id IS NULL THEN N'Chưa kiểm'
            ELSE N'Đã kiểm'
        END AS TrangThai

    FROM TAG_QLSX.dbo.KeHoachSanXuat_SanPham a

    LEFT JOIN TAG_QLSX.dbo.KeHoachSanXuat b 
        ON a.ID_KeHoachSanXuat = b.ID_KeHoachSanXuat
        
    LEFT JOIN TAG_QLSX.dbo.KeHoachSanXuat_Ngay khsx_n 
        ON a.ID_KeHoachSanXuat = khsx_n.ID_KeHoachSanXuat
        
    LEFT JOIN TAG_QTKD.dbo.DM_QuyTrinhSanXuat qt
        ON qt.ID_QuyTrinhSanXuat = b.ID_QuyTrinhSanXuat

    LEFT JOIN TAG_System.dbo.DM_BoPhan f 
        ON f.ID_BoPhan = b.ID_BoPhan

    LEFT JOIN TAG_QLSX.dbo.LenhSanXuat c 
        ON c.ID_LenhSanXuat = b.ID_LenhSanXuat

    LEFT JOIN TAG_System.dbo.DM_DonVi d 
        ON d.ID_DonVi = c.ID_DonVi

    -- 🔥 sản lượng thực tế
    LEFT JOIN (
        SELECT 
            ID_KeHoachSanXuat,
            SUM(SoLuong_SanPham) AS SL
        FROM TAG_QLSX.dbo.TienDoSanXuat
        GROUP BY ID_KeHoachSanXuat
    ) sx 
        ON sx.ID_KeHoachSanXuat = b.ID_KeHoachSanXuat

    LEFT JOIN TAG_QTKD.dbo.DonHang_SanPham dhsp
        ON a.ID_DonHang_SanPham = dhsp.ID_DonHang_SanPham

    LEFT JOIN DM_SAN_PHAM sp 
        ON sp.MaSanPham = dhsp.ItemCode

    -- 🔥 CHECK ĐÃ KIỂM CHƯA
    LEFT JOIN PHIEU_KIEM pk 
        ON pk.SourceId = a.ID_KeHoachSanXuat
        AND pk.LoaiKiemId = @LoaiKiemId

    WHERE 
        pk.Id IS NULL   -- 🔥 CHƯA KIỂM

        AND b.TonTai = 1
        AND c.TonTai = 1

        -- 🔥 đang chạy kế hoạch
        AND cast(b.Ngay_BatDauSX as date) <= cast(GETDATE() as date)
        AND cast(b.Ngay_KetThucSX as date) >= cast(GETDATE() as date)
        AND khsx_n.Ngay = CAST(GETDATE() AS DATE)
        -- 🔥 lọc PX giống logic cũ
        AND d.Ten_DonVi IN (
--             N'Phân xưởng A5', 
            N'Phân xưởng A3',
--             N'Phân xưởng A1.2', 
--             N'Phân xưởng may CSHB', 
            N'Phân xưởng may CSPT'
        )
--         AND b.ID_QuyTrinhSanXuat = 5
    ORDER BY 
        b.Ngay_BatDauSX DESC,
        d.Ten_DonVi,
        sp.MaSanPham;

END
GO


-- ----------------------------
-- procedure structure for sp_Dashboard_GetOverview
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_Dashboard_GetOverview]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_Dashboard_GetOverview]
GO

CREATE PROCEDURE [dbo].[sp_Dashboard_GetOverview]
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Now DATETIME2 = SYSDATETIME();
    DECLARE @CurrentMonthStart DATETIME2 = DATEADD(MONTH, DATEDIFF(MONTH, 0, @Now), 0);
    DECLARE @NextMonthStart DATETIME2 = DATEADD(MONTH, 1, @CurrentMonthStart);
    DECLARE @PreviousMonthStart DATETIME2 = DATEADD(MONTH, -1, @CurrentMonthStart);
    DECLARE @WeeklyStart DATE = DATEADD(DAY, -6, CAST(@Now AS DATE));
    DECLARE @Tomorrow DATE = DATEADD(DAY, 1, CAST(@Now AS DATE));

    /* KPI current month and previous month */
    SELECT
        SUM(CASE
            WHEN pk.CreatedAt >= @CurrentMonthStart AND pk.CreatedAt < @NextMonthStart
            THEN 1 ELSE 0
        END) AS CurrentTotalInspections,
        SUM(CASE
            WHEN pk.CreatedAt >= @PreviousMonthStart AND pk.CreatedAt < @CurrentMonthStart
            THEN 1 ELSE 0
        END) AS PreviousTotalInspections,
        SUM(CASE
            WHEN pk.CreatedAt >= @CurrentMonthStart AND pk.CreatedAt < @NextMonthStart
                AND ISNULL(pk.TrangThai, '') <> 'HOAN_TAT'
            THEN 1 ELSE 0
        END) AS CurrentPendingInspections,
        SUM(CASE
            WHEN pk.CreatedAt >= @PreviousMonthStart AND pk.CreatedAt < @CurrentMonthStart
                AND ISNULL(pk.TrangThai, '') <> 'HOAN_TAT'
            THEN 1 ELSE 0
        END) AS PreviousPendingInspections,
        SUM(CASE
            WHEN pk.TrangThai = 'HOAN_TAT'
                AND COALESCE(pk.NgayKiem, pk.CreatedAt) >= @CurrentMonthStart
                AND COALESCE(pk.NgayKiem, pk.CreatedAt) < @NextMonthStart
            THEN 1 ELSE 0
        END) AS CurrentCompletedInspections,
        SUM(CASE
            WHEN pk.TrangThai = 'HOAN_TAT'
                AND pk.KetLuan = 'DAT'
                AND COALESCE(pk.NgayKiem, pk.CreatedAt) >= @CurrentMonthStart
                AND COALESCE(pk.NgayKiem, pk.CreatedAt) < @NextMonthStart
            THEN 1 ELSE 0
        END) AS CurrentPassedInspections,
        SUM(CASE
            WHEN pk.TrangThai = 'HOAN_TAT'
                AND COALESCE(pk.NgayKiem, pk.CreatedAt) >= @PreviousMonthStart
                AND COALESCE(pk.NgayKiem, pk.CreatedAt) < @CurrentMonthStart
            THEN 1 ELSE 0
        END) AS PreviousCompletedInspections,
        SUM(CASE
            WHEN pk.TrangThai = 'HOAN_TAT'
                AND pk.KetLuan = 'DAT'
                AND COALESCE(pk.NgayKiem, pk.CreatedAt) >= @PreviousMonthStart
                AND COALESCE(pk.NgayKiem, pk.CreatedAt) < @CurrentMonthStart
            THEN 1 ELSE 0
        END) AS PreviousPassedInspections,
        (
            SELECT COUNT(*)
            FROM dbo.BIEN_BAN_KIEM bb
            WHERE bb.CreatedAt >= @CurrentMonthStart AND bb.CreatedAt < @NextMonthStart
        ) AS CurrentDefectReports,
        (
            SELECT COUNT(*)
            FROM dbo.BIEN_BAN_KIEM bb
            WHERE bb.CreatedAt >= @PreviousMonthStart AND bb.CreatedAt < @CurrentMonthStart
        ) AS PreviousDefectReports
    FROM dbo.PHIEU_KIEM pk;

    /* Most recently created inspections */
    SELECT TOP (5)
        pk.Id,
        pk.SoPhieu,
        sp.TenSanPham,
        pk.CreatedAt,
        pk.TrangThai,
        pk.KetLuan,
        pk.LoaiKiemId
    FROM dbo.PHIEU_KIEM pk
    LEFT JOIN dbo.DM_SAN_PHAM sp ON sp.Id = pk.SanPhamId
    ORDER BY pk.CreatedAt DESC, pk.Id DESC;

    /* Completed inspections for today and the previous six days */
    ;WITH Dates AS (
        SELECT @WeeklyStart AS WorkDate
        UNION ALL
        SELECT DATEADD(DAY, 1, WorkDate)
        FROM Dates
        WHERE WorkDate < DATEADD(DAY, -1, @Tomorrow)
    )
    SELECT
        CONVERT(VARCHAR(10), d.WorkDate, 23) AS DateKey,
        COUNT(pk.Id) AS CompletedCount
    FROM Dates d
    LEFT JOIN dbo.PHIEU_KIEM pk
        ON pk.TrangThai = 'HOAN_TAT'
        AND COALESCE(pk.NgayKiem, pk.CreatedAt) >= d.WorkDate
        AND COALESCE(pk.NgayKiem, pk.CreatedAt) < DATEADD(DAY, 1, d.WorkDate)
    GROUP BY d.WorkDate
    ORDER BY d.WorkDate
    OPTION (MAXRECURSION 7);
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_Create
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_Create]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_Create]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_Create]
    @SanPhamId INT,
    @LoaiKiemId INT,
    @Lot NVARCHAR(100),
    @DoiTuong NVARCHAR(100),
    @NguoiKiemId INT,
    @NguoiLapId INT,
    @SourceId INT = NULL,
    @SourceId_LCD UNIQUEIDENTIFIER = NULL,
    @SoLuong INT = NULL,
    @Ngay_Giao DATE = NULL,
    @MucDoKiemTra NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @MaLoai NVARCHAR(50);
    SELECT @MaLoai = MaLoai
    FROM DM_LOAI_KIEM
    WHERE Id = @LoaiKiemId;

    IF @SourceId IS NOT NULL AND EXISTS (
        SELECT 1
        FROM PHIEU_KIEM
        WHERE LoaiKiemId = @LoaiKiemId
          AND SourceId = @SourceId
    )
    BEGIN
        RAISERROR(N'Kế hoạch này đã được tạo phiếu kiểm', 16, 1);
        RETURN;
    END

    IF @SourceId_LCD IS NOT NULL AND EXISTS (
        SELECT 1
        FROM PHIEU_KIEM
        WHERE LoaiKiemId = @LoaiKiemId
          AND SourceId_LCD = @SourceId_LCD
    )
    BEGIN
        RAISERROR(N'Lịch đóng cont này đã được tạo phiếu kiểm', 16, 1);
        RETURN;
    END

    IF @MaLoai NOT IN ('KIEM_TREN_CHUYEN', 'CUOI_CHUYEN') AND NOT EXISTS (
        SELECT 1
        FROM SAN_PHAM_NHOM_KIEM
        WHERE SanPhamId = @SanPhamId
    )
    BEGIN
        RAISERROR(N'Sản phẩm này không thuộc nhóm kiểm', 16, 1);
        RETURN;
    END

    DECLARE @Ngay NVARCHAR(8);
    DECLARE @SoThuTu INT;
    DECLARE @SoPhieu NVARCHAR(50);

    SET @Ngay = CONVERT(VARCHAR(8), GETDATE(), 112);

    SELECT @SoThuTu = ISNULL(MAX(TRY_CAST(RIGHT(SoPhieu, 4) AS INT)), 0) + 1
    FROM PHIEU_KIEM
    WHERE SoPhieu LIKE 'PK' + @Ngay + '-%';

    SET @SoPhieu = 'PK' + @Ngay + '-' + RIGHT('0000' + CAST(@SoThuTu AS VARCHAR(4)), 4);

    INSERT INTO PHIEU_KIEM (
        SoPhieu,
        SanPhamId,
        LoaiKiemId,
        Lot,
        DoiTuong,
        NguoiKiemId,
        NguoiLapId,
        TrangThai,
        SourceId,
        SourceId_LCD,
        SoLuong,
        Ngay_Giao,
        MucDoKiemTra
    )
    VALUES (
        @SoPhieu,
        @SanPhamId,
        @LoaiKiemId,
        @Lot,
        @DoiTuong,
        @NguoiKiemId,
        @NguoiLapId,
        'TAO_MOI',
        @SourceId,
        @SourceId_LCD,
        @SoLuong,
        @Ngay_Giao,
        @MucDoKiemTra
    );

    SELECT SCOPE_IDENTITY() AS Id, @SoPhieu AS SoPhieu;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_CreateSectionWithItems
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_CreateSectionWithItems]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_CreateSectionWithItems]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_CreateSectionWithItems]
    @PhieuKiemId INT,
    @NhomKiemId INT,
    @TenNhom NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Tạo Section
    INSERT INTO PHIEU_KIEM_SECTION (
        PhieuKiemId,
        TenNhom
    )
    VALUES (
        @PhieuKiemId,
        @TenNhom
    );

    DECLARE @SectionId INT = SCOPE_IDENTITY();

    -- 2. Clone checklist
    INSERT INTO PHIEU_KIEM_CHECK_ITEM (
        SectionId,
        TenMucKiem,
        TieuChuan
    )
    SELECT
        @SectionId,
        TenMucKiem,
        TieuChuan
    FROM DM_CHECK_ITEM
    WHERE NhomKiemId = @NhomKiemId
      AND TrangThai = 1;

    SELECT @SectionId AS SectionId;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_GetDetail_CuoiChuyen
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_GetDetail_CuoiChuyen]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_GetDetail_CuoiChuyen]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_GetDetail_CuoiChuyen]
    @PhieuKiemId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT
        pk.Id, pk.SoPhieu, pk.SanPhamId, pk.LoaiKiemId, pk.Lot, pk.DoiTuong,
        pk.NguoiKiemId, pk.CreatedAt, pk.KetLuan, pk.TrangThai,
        pk.SoLuong, pk.NgayKiem, pk.Ngay_Giao, pk.MucDoKiemTra, pk.SourceId,
        sp.TenSanPham,
        u.FullName AS TenNguoiKiem,
        sp.MaSanPham,
        lk.TenLoai AS TenLoaiKiem,
        bbk.Id AS BienBanId,
        (
            SELECT FieldName, FieldValue
            FROM dbo.PhieuKiem_CustomFields ctf
            WHERE ctf.PhieuKiemId = pk.Id
            FOR JSON PATH
        ) AS DynamicFieldsJSON
    FROM dbo.PHIEU_KIEM pk
    LEFT JOIN dbo.DM_SAN_PHAM sp ON pk.SanPhamId = sp.Id
    LEFT JOIN dbo.USERS u ON u.Id = pk.NguoiKiemId
    LEFT JOIN dbo.DM_LOAI_KIEM lk ON lk.Id = pk.LoaiKiemId
    LEFT JOIN dbo.BIEN_BAN_KIEM bbk ON bbk.PhieuKiemId = pk.Id
    WHERE pk.Id = @PhieuKiemId;

    SELECT
        p.Id,
        p.PhieuKiemId,
        p.ID_KeHoachSanXuat,
        p.SanPhamId,
        p.MaSanPham,
        p.TenSanPham,
        p.TenDonVi,
        p.TenBoPhan,
        p.NgayKeHoach,
        p.SoLuongKeHoach,
        p.NangSuatDuKien,
        p.DaSanXuat,
        p.SortOrder,
        p.CreatedAt,
        p.UpdatedAt
    FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN p
    WHERE p.PhieuKiemId = @PhieuKiemId
    ORDER BY p.SortOrder, p.Id;

    SELECT
        d.Id AS DefectRowId,
        d.PlanId,
        d.DefectId,
        d.SoLuong,
        d.SoLuongDatSauSua,
        d.SoLuongKhongDatSauSua,
        d.GhiChu AS DefectGhiChu,
        d.ImageUrls AS DefectImageUrls,
        d.SortOrder AS DefectSortOrder,
        dm.MaLoi,
        dm.TenLoi,
        dm.MoTa,
        dm.DefectType,
        dm.PhuongAnXuLy,
        dm.ImageUrl
    FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT d
    INNER JOIN dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN p ON p.Id = d.PlanId
    LEFT JOIN dbo.DM_DEFECT dm ON dm.Id = d.DefectId
    WHERE p.PhieuKiemId = @PhieuKiemId
    ORDER BY p.SortOrder, p.Id, d.SortOrder, d.Id;

    SELECT
        ISNULL((SELECT COUNT(*) FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN WHERE PhieuKiemId = @PhieuKiemId), 0) AS TotalPlans,
        ISNULL((
            SELECT COUNT(*)
            FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT d
            INNER JOIN dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN p ON p.Id = d.PlanId
            WHERE p.PhieuKiemId = @PhieuKiemId
        ), 0) AS TotalDefectRows,
        ISNULL((
            SELECT SUM(d.SoLuong)
            FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT d
            INNER JOIN dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN p ON p.Id = d.PlanId
            WHERE p.PhieuKiemId = @PhieuKiemId
        ), 0) AS TotalDefectQuantity;

    SELECT
        xn.Id,
        xn.PhieuKiemId,
        xn.NguoiXacNhanId,
        u.FullName AS TenNguoiXacNhan,
        u.Username AS UsernameNguoiXacNhan,
        u.BoPhanId,
        xn.VaiTro,
        xn.TrangThai,
        xn.NoiDung,
        xn.ThoiGian
    FROM dbo.PHIEU_KIEM_XAC_NHAN xn
    LEFT JOIN dbo.USERS u ON u.Id = xn.NguoiXacNhanId
    WHERE xn.PhieuKiemId = @PhieuKiemId
    ORDER BY xn.ThoiGian DESC, xn.Id DESC;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_CreateSectionFull
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_CreateSectionFull]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_CreateSectionFull]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_CreateSectionFull]
    @PhieuKiemId INT,
    @NhomKiemId INT,
    @TenNhom NVARCHAR(255),
    @LotSize INT,
    @InspectionLevel NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE 
        @SampleSize INT,
        @Ac_Critical INT,
        @Re_Critical INT,
        @Ac_Major INT,
        @Re_Major INT,
        @Ac_Minor INT,
        @Re_Minor INT;

    -- 1. LẤY AQL PLAN
    SELECT TOP 1
        @SampleSize = SampleSize,
        @Ac_Critical = Ac_Critical,
        @Re_Critical = Re_Critical,
        @Ac_Major = Ac_Major,
        @Re_Major = Re_Major,
        @Ac_Minor = Ac_Minor,
        @Re_Minor = Re_Minor
    FROM DM_AQL_PLAN
    WHERE @LotSize BETWEEN LotMin AND LotMax
      AND InspectionLevel = @InspectionLevel;

    IF @SampleSize IS NULL
        RAISERROR('AQL_PLAN_NOT_FOUND',16,1);

    -- 2. TẠO SECTION ĐẦY ĐỦ THÔNG TIN
    INSERT INTO PHIEU_KIEM_SECTION (
        PhieuKiemId,
        TenNhom,
        TongSo,
        SoLuongKiem,
        InspectionLevel,
        Ac_Critical,
        Re_Critical,
        Ac_Major,
        Re_Major,
        Ac_Minor,
        Re_Minor,
        TotalCritical,
        TotalMajor,
        TotalMinor,
        KetLuan
    )
    VALUES (
        @PhieuKiemId,
        @TenNhom,
        @LotSize,
        @SampleSize,
        @InspectionLevel,
        @Ac_Critical,
        @Re_Critical,
        @Ac_Major,
        @Re_Major,
        @Ac_Minor,
        @Re_Minor,
        0,0,0,
        'PENDING'
    );

    DECLARE @SectionId INT = SCOPE_IDENTITY();

    -- 3. CLONE CHECKLIST
    INSERT INTO PHIEU_KIEM_CHECK_ITEM (
        SectionId,
        TenMucKiem,
        TieuChuan
    )
    SELECT
        @SectionId,
        TenMucKiem,
        TieuChuan
    FROM DM_CHECK_ITEM
    WHERE NhomKiemId = @NhomKiemId
      AND TrangThai = 1;

    SELECT @SectionId AS SectionId;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_CuoiChuyen_SaveDefects
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_CuoiChuyen_SaveDefects]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_CuoiChuyen_SaveDefects]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_CuoiChuyen_SaveDefects]
    @PhieuKiemId INT,
    @UserId INT,
    @PlansJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRAN;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.PHIEU_KIEM WHERE Id = @PhieuKiemId AND LoaiKiemId = 3)
            RAISERROR(N'Không tìm thấy phiếu kiểm cuối chuyền', 16, 1);

        IF EXISTS (
            SELECT 1
            FROM dbo.PHIEU_KIEM
            WHERE Id = @PhieuKiemId
              AND TrangThai IN ('HOAN_TAT', 'CHO_TBP_DUYET', 'CHO_KIEM_NGHIEM', 'CHO_XUONG_XAC_NHAN')
        )
            RAISERROR(N'Phiếu đã hoàn tất hoặc đang chờ duyệt/xác nhận, không thể chỉnh sửa', 16, 1);

        DECLARE @PlanDefects TABLE (
            PlanId INT NOT NULL,
            DefectId INT NOT NULL,
            SoLuong INT NOT NULL,
            SoLuongDatSauSua INT NULL,
            SoLuongKhongDatSauSua INT NULL,
            GhiChu NVARCHAR(MAX) NULL,
            ImageUrls NVARCHAR(MAX) NULL,
            SortOrder INT NOT NULL
        );

        INSERT INTO @PlanDefects (
            PlanId,
            DefectId,
            SoLuong,
            SoLuongDatSauSua,
            SoLuongKhongDatSauSua,
            GhiChu,
            ImageUrls,
            SortOrder
        )
        SELECT
            p.PlanId,
            d.DefectId,
            d.SoLuong,
            d.SoLuongDatSauSua,
            d.SoLuongKhongDatSauSua,
            NULLIF(LTRIM(RTRIM(d.GhiChu)), ''),
            d.ImageUrls,
            ISNULL(d.SortOrder, 1)
        FROM OPENJSON(@PlansJson)
        WITH (
            PlanId INT '$.planId',
            DefectsJson NVARCHAR(MAX) '$.defects' AS JSON
        ) p
        CROSS APPLY OPENJSON(p.DefectsJson)
        WITH (
            DefectId INT '$.defectId',
            SoLuong INT '$.soLuong',
            SoLuongDatSauSua INT '$.soLuongDatSauSua',
            SoLuongKhongDatSauSua INT '$.soLuongKhongDatSauSua',
            GhiChu NVARCHAR(MAX) '$.ghiChu',
            ImageUrls NVARCHAR(MAX) '$.imageUrls' AS JSON,
            SortOrder INT '$.sortOrder'
        ) d
        WHERE p.PlanId IS NOT NULL
          AND d.DefectId IS NOT NULL
          AND ISNULL(d.SoLuong, 0) > 0;

        IF EXISTS (
            SELECT 1
            FROM @PlanDefects pd
            LEFT JOIN dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN p
                ON p.Id = pd.PlanId AND p.PhieuKiemId = @PhieuKiemId
            WHERE p.Id IS NULL
        )
            RAISERROR(N'Dữ liệu kế hoạch cuối chuyền không hợp lệ', 16, 1);

        DELETE d
        FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT d
        INNER JOIN dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN p ON p.Id = d.PlanId
        WHERE p.PhieuKiemId = @PhieuKiemId;

        INSERT INTO dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT (
            PlanId,
            DefectId,
            SoLuong,
            SoLuongDatSauSua,
            SoLuongKhongDatSauSua,
            GhiChu,
            ImageUrls,
            SortOrder
        )
        SELECT
            PlanId,
            DefectId,
            SoLuong,
            SoLuongDatSauSua,
            SoLuongKhongDatSauSua,
            GhiChu,
            ImageUrls,
            SortOrder
        FROM @PlanDefects;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_CuoiChuyen_Complete
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_CuoiChuyen_Complete]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_CuoiChuyen_Complete]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_CuoiChuyen_Complete]
    @PhieuKiemId INT,
    @KetLuan NVARCHAR(20),
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRAN;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.PHIEU_KIEM WHERE Id = @PhieuKiemId AND LoaiKiemId = 3)
            RAISERROR(N'Không tìm thấy phiếu kiểm cuối chuyền', 16, 1);

        IF UPPER(ISNULL(@KetLuan, '')) NOT IN ('DAT', 'KHONG_DAT')
            RAISERROR(N'Kết luận không hợp lệ', 16, 1);

        IF NOT EXISTS (
            SELECT 1
            FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT d
            INNER JOIN dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN p ON p.Id = d.PlanId
            WHERE p.PhieuKiemId = @PhieuKiemId
        )
            RAISERROR(N'Phiếu chưa có dữ liệu ghi nhận để hoàn tất', 16, 1);

        IF EXISTS (
            SELECT 1
            FROM dbo.PHIEU_KIEM
            WHERE Id = @PhieuKiemId
              AND TrangThai IN ('HOAN_TAT', 'CHO_KIEM_NGHIEM', 'CHO_XUONG_XAC_NHAN')
        )
            RAISERROR(N'Phiếu đã hoàn tất hoặc đã chuyển bước xác nhận, không thể hoàn tất lại', 16, 1);

        UPDATE dbo.PHIEU_KIEM
        SET KetLuan = UPPER(@KetLuan),
            TrangThai = 'CHO_TBP_DUYET',
            NgayKiem = ISNULL(NgayKiem, GETDATE())
        WHERE Id = @PhieuKiemId;

        SELECT Id AS PhieuKiemId, KetLuan, TrangThai
        FROM dbo.PHIEU_KIEM
        WHERE Id = @PhieuKiemId;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH
END
GO


-- ----------------------------
-- procedure structure for sp_User_GetByUsername
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_User_GetByUsername]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_User_GetByUsername]
GO

CREATE PROCEDURE [dbo].[sp_User_GetByUsername]
    @Username NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        u.Id,
        u.Username,
        u.PasswordHash,
        u.FullName,
        u.Email,
        u.BoPhan,
        u.TrangThai,
        bp.Id as BoPhanId,
        bp.MaBoPhan,
        bp.TenBoPhan
    FROM USERS u 
    LEFT JOIN DM_BO_PHAN bp ON bp.Id = u.BoPhanId 
    WHERE Username = @Username;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_CuoiChuyen_Approve
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_CuoiChuyen_Approve]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_CuoiChuyen_Approve]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_CuoiChuyen_Approve]
    @PhieuKiemId INT,
    @UserId INT,
    @BoPhanId INT,
    @IsAdmin BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRAN;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.PHIEU_KIEM WHERE Id = @PhieuKiemId AND LoaiKiemId = 3)
            RAISERROR(N'Không tìm thấy phiếu kiểm cuối chuyền', 16, 1);

        IF NOT EXISTS (
            SELECT 1 FROM dbo.PHIEU_KIEM WHERE Id = @PhieuKiemId AND TrangThai = 'CHO_TBP_DUYET'
        )
            RAISERROR(N'Phiếu chưa ở trạng thái chờ TBP duyệt', 16, 1);

        DECLARE @ExpectedBoPhanId INT;
        SELECT TOP 1 @ExpectedBoPhanId = TRY_CAST(FieldValue AS INT)
        FROM dbo.PhieuKiem_CustomFields
        WHERE PhieuKiemId = @PhieuKiemId
          AND FieldName = 'CuoiChuyen_ApproveBoPhanId';

        IF @ExpectedBoPhanId IS NULL
            RAISERROR(N'Phiếu chưa xác định bộ phận duyệt', 16, 1);

        IF ISNULL(@IsAdmin, 0) = 0 AND @ExpectedBoPhanId <> @BoPhanId
            RAISERROR(N'Bạn không thuộc đúng bộ phận duyệt của phiếu này', 16, 1);

        UPDATE dbo.PHIEU_KIEM
        SET TrangThai = 'HOAN_TAT'
        WHERE Id = @PhieuKiemId;

        IF EXISTS (
            SELECT 1
            FROM dbo.PHIEU_KIEM_XAC_NHAN
            WHERE PhieuKiemId = @PhieuKiemId
              AND VaiTro = 'TBP'
        )
        BEGIN
            UPDATE dbo.PHIEU_KIEM_XAC_NHAN
            SET NguoiXacNhanId = @UserId,
                TrangThai = 'DA_XAC_NHAN',
                NoiDung = N'TBP xác nhận phiếu kiểm cuối chuyền',
                ThoiGian = GETDATE()
            WHERE PhieuKiemId = @PhieuKiemId
              AND VaiTro = 'TBP';
        END
        ELSE
        BEGIN
            INSERT INTO dbo.PHIEU_KIEM_XAC_NHAN (
                PhieuKiemId,
                NguoiXacNhanId,
                VaiTro,
                TrangThai,
                NoiDung,
                ThoiGian
            )
            VALUES (
                @PhieuKiemId,
                @UserId,
                'TBP',
                'DA_XAC_NHAN',
                N'TBP xác nhận phiếu kiểm cuối chuyền',
                GETDATE()
            );
        END

        SELECT Id AS PhieuKiemId, KetLuan, TrangThai
        FROM dbo.PHIEU_KIEM
        WHERE Id = @PhieuKiemId;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_GetList_ByRole
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_GetList_ByRole]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_GetList_ByRole]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_GetList_ByRole]
    @UserId INT,
    @Role NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        pk.Id, pk.SoPhieu, pk.Lot, pk.DoiTuong, pk.TrangThai, pk.KetLuan, pk.NgayKiem,
        u.FullName AS TenNguoiKiem, sp.MaSanPham, sp.TenSanPham, pk.SoLuong,
        ct.ID_ChungTuNhap -- Bổ sung ID chứng từ tổng
    FROM PHIEU_KIEM pk
    LEFT JOIN USERS u ON pk.NguoiKiemId = u.Id
    LEFT JOIN DM_SAN_PHAM sp ON pk.SanPhamId = sp.Id
    LEFT JOIN TAG_QTKD.dbo.ChungTuNhap_ChiTiet ctd ON pk.SourceId = ctd.ID_ChungTuNhap_ChiTiet AND pk.LoaiKiemId = 1
    LEFT JOIN TAG_QTKD.dbo.ChungTuNhap ct ON ct.ID_ChungTuNhap = ctd.ID_ChungTuNhap
    WHERE (@Role <> 'KCS' OR pk.NguoiKiemId = @UserId)
    ORDER BY pk.NgayKiem DESC;
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_CuoiChuyen_CreateBienBan
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_CuoiChuyen_CreateBienBan]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_CuoiChuyen_CreateBienBan]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_CuoiChuyen_CreateBienBan]
    @PhieuKiemId INT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRAN;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.PHIEU_KIEM WHERE Id = @PhieuKiemId AND LoaiKiemId = 3)
            RAISERROR(N'Không tìm thấy phiếu kiểm cuối chuyền', 16, 1);

        DECLARE @TongLoi INT = 0;

        SELECT @TongLoi = ISNULL(SUM(d.SoLuong), 0)
        FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT d
        INNER JOIN dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN p ON p.Id = d.PlanId
        WHERE p.PhieuKiemId = @PhieuKiemId;

        IF @TongLoi <= 0
            RAISERROR(N'Phiếu chưa có lỗi để sinh biên bản', 16, 1);

        DECLARE @BienBanId INT;
        SELECT @BienBanId = Id
        FROM dbo.BIEN_BAN_KIEM
        WHERE PhieuKiemId = @PhieuKiemId;

        IF @BienBanId IS NULL
        BEGIN
            INSERT INTO dbo.BIEN_BAN_KIEM (
                PhieuKiemId,
                LoaiTrachNhiem,
                TrangThai,
                NguoiLapId,
                LoaiBienBan
            )
            VALUES (
                @PhieuKiemId,
                NULL,
                'BB_MOI',
                @UserId,
                'GENERAL'
            );

            SET @BienBanId = SCOPE_IDENTITY();
        END

        UPDATE dbo.PHIEU_KIEM
        SET KetLuan = 'KHONG_DAT',
            NgayKiem = ISNULL(NgayKiem, GETDATE())
        WHERE Id = @PhieuKiemId;

        SELECT @BienBanId AS BienBanId;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH
END
GO


-- ----------------------------
-- procedure structure for sp_PhieuKiem_CreateAllSection
-- ----------------------------
IF EXISTS (SELECT * FROM sys.all_objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PhieuKiem_CreateAllSection]') AND type IN ('P', 'PC', 'RF', 'X'))
	DROP PROCEDURE[dbo].[sp_PhieuKiem_CreateAllSection]
GO

CREATE PROCEDURE [dbo].[sp_PhieuKiem_CreateAllSection]
(
    @PhieuKiemId INT,
    @Sections SECTION_CONFIG_TABLE READONLY
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SanPhamId INT;

    SELECT @SanPhamId = SanPhamId
    FROM PHIEU_KIEM
    WHERE Id = @PhieuKiemId;

    DECLARE cur CURSOR FOR
    SELECT 
        s.NhomKiemId,
        nk.TenNhom,
        s.LotSize,
        s.InspectionLevel
    FROM @Sections s
    JOIN DM_NHOM_KIEM nk
    ON nk.Id = s.NhomKiemId;

    DECLARE 
        @NhomKiemId INT,
        @TenNhom NVARCHAR(255),
        @LotSize INT,
        @InspectionLevel NVARCHAR(100);

    OPEN cur;

    FETCH NEXT FROM cur INTO 
        @NhomKiemId,
        @TenNhom,
        @LotSize,
        @InspectionLevel;

    WHILE @@FETCH_STATUS = 0
    BEGIN

        DECLARE 
            @SampleSize INT,
            @Ac_Critical INT,
            @Re_Critical INT,
            @Ac_Major INT,
            @Re_Major INT,
            @Ac_Minor INT,
            @Re_Minor INT;

        SELECT TOP 1
            @SampleSize = SampleSize,
            @Ac_Critical = Ac_Critical,
            @Re_Critical = Re_Critical,
            @Ac_Major = Ac_Major,
            @Re_Major = Re_Major,
            @Ac_Minor = Ac_Minor,
            @Re_Minor = Re_Minor
        FROM DM_AQL_PLAN
        WHERE @LotSize BETWEEN LotMin AND LotMax
        AND InspectionLevel = @InspectionLevel;

        INSERT INTO PHIEU_KIEM_SECTION
        (
            PhieuKiemId,
            TenNhom,
            TongSo,
            SoLuongKiem,
            InspectionLevel,
            Ac_Critical, Re_Critical,
            Ac_Major, Re_Major,
            Ac_Minor, Re_Minor
        )
        VALUES
        (
            @PhieuKiemId,
            @TenNhom,
            @LotSize,
            @SampleSize,
            @InspectionLevel,
            @Ac_Critical,
            @Re_Critical,
            @Ac_Major,
            @Re_Major,
            @Ac_Minor,
            @Re_Minor
        );

        DECLARE @SectionId INT = SCOPE_IDENTITY();

        INSERT INTO PHIEU_KIEM_CHECK_ITEM
        (
            SectionId,
            ThamChieu,
            PhuongPhapKiem,
            TenMucKiem,
            TieuChuan
        )
        SELECT
            @SectionId,
            ThamChieu,
            PhuongPhapKiem,
            TenMucKiem,
            TieuChuan
        FROM DM_CHECK_ITEM
        WHERE NhomKiemId = @NhomKiemId
        AND TrangThai = 1;

        FETCH NEXT FROM cur INTO 
            @NhomKiemId,
            @TenNhom,
            @LotSize,
            @InspectionLevel;

    END

    CLOSE cur;
    DEALLOCATE cur;

    UPDATE PHIEU_KIEM
    SET TrangThai = 'DA_TAO_SECTION'
    WHERE Id = @PhieuKiemId;

    SELECT *
    FROM PHIEU_KIEM_SECTION
    WHERE PhieuKiemId = @PhieuKiemId;

END
GO


-- ----------------------------
-- Auto increment value for BIEN_BAN_ANH
-- ----------------------------

-- ----------------------------
-- Primary Key structure for table BIEN_BAN_ANH
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_ANH] ADD CONSTRAINT [PK__BIEN_BAN__3214EC073DFA4B68] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for BIEN_BAN_ASSIGN
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[BIEN_BAN_ASSIGN]', RESEED, 21)
GO


-- ----------------------------
-- Primary Key structure for table BIEN_BAN_ASSIGN
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_ASSIGN] ADD CONSTRAINT [PK__BIEN_BAN__3214EC0708ED3DC2] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for BIEN_BAN_CHI_PHI
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[BIEN_BAN_CHI_PHI]', RESEED, 2)
GO


-- ----------------------------
-- Primary Key structure for table BIEN_BAN_CHI_PHI
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_CHI_PHI] ADD CONSTRAINT [PK__BIEN_BAN__3214EC07A68F9CB9] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for BIEN_BAN_DEFECT
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[BIEN_BAN_DEFECT]', RESEED, 13)
GO


-- ----------------------------
-- Indexes structure for table BIEN_BAN_DEFECT
-- ----------------------------
CREATE NONCLUSTERED INDEX [IX_BIEN_BAN_DEFECT_BienBanId]
ON [dbo].[BIEN_BAN_DEFECT] (
  [BienBanId] ASC,
  [SortOrder] ASC,
  [Id] ASC
)
GO


-- ----------------------------
-- Primary Key structure for table BIEN_BAN_DEFECT
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_DEFECT] ADD CONSTRAINT [PK__BIEN_BAN__3214EC07521C0813] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for BIEN_BAN_HANH_DONG
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[BIEN_BAN_HANH_DONG]', RESEED, 12)
GO


-- ----------------------------
-- Primary Key structure for table BIEN_BAN_HANH_DONG
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_HANH_DONG] ADD CONSTRAINT [PK__BIEN_BAN__3214EC073C07218D] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for BIEN_BAN_KIEM
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[BIEN_BAN_KIEM]', RESEED, 24)
GO


-- ----------------------------
-- Primary Key structure for table BIEN_BAN_KIEM
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_KIEM] ADD CONSTRAINT [PK__BIEN_BAN__3214EC07D75FD000] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for BIEN_BAN_SXBT_CONFIRM_STEP
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[BIEN_BAN_SXBT_CONFIRM_STEP]', RESEED, 14)
GO


-- ----------------------------
-- Indexes structure for table BIEN_BAN_SXBT_CONFIRM_STEP
-- ----------------------------
CREATE NONCLUSTERED INDEX [IX_BB_SXBT_CONFIRM_STEP_BienBanId]
ON [dbo].[BIEN_BAN_SXBT_CONFIRM_STEP] (
  [BienBanId] ASC,
  [StepOrder] ASC,
  [TrangThai] ASC
)
GO


-- ----------------------------
-- Primary Key structure for table BIEN_BAN_SXBT_CONFIRM_STEP
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_SXBT_CONFIRM_STEP] ADD CONSTRAINT [PK__BIEN_BAN__3214EC07D6C02F20] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for BIEN_BAN_SXBT_CONFIRM_TEMPLATE
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[BIEN_BAN_SXBT_CONFIRM_TEMPLATE]', RESEED, 18)
GO


-- ----------------------------
-- Indexes structure for table BIEN_BAN_SXBT_CONFIRM_TEMPLATE
-- ----------------------------
CREATE UNIQUE NONCLUSTERED INDEX [UX_BB_SXBT_CONFIRM_TEMPLATE]
ON [dbo].[BIEN_BAN_SXBT_CONFIRM_TEMPLATE] (
  [MucDo] ASC,
  [BoPhanId] ASC,
  [StepOrder] ASC
)
GO


-- ----------------------------
-- Primary Key structure for table BIEN_BAN_SXBT_CONFIRM_TEMPLATE
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_SXBT_CONFIRM_TEMPLATE] ADD CONSTRAINT [PK__BIEN_BAN__3214EC0702FE6310] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for BIEN_BAN_SXBT_XULY_ROW
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[BIEN_BAN_SXBT_XULY_ROW]', RESEED, 13)
GO


-- ----------------------------
-- Indexes structure for table BIEN_BAN_SXBT_XULY_ROW
-- ----------------------------
CREATE NONCLUSTERED INDEX [IX_BIEN_BAN_SXBT_XULY_ROW_BienBanId]
ON [dbo].[BIEN_BAN_SXBT_XULY_ROW] (
  [BienBanId] ASC,
  [MucDo] ASC,
  [SortOrder] ASC
)
GO


-- ----------------------------
-- Primary Key structure for table BIEN_BAN_SXBT_XULY_ROW
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_SXBT_XULY_ROW] ADD CONSTRAINT [PK__BIEN_BAN__3214EC070C37365B] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for BIEN_BAN_XAC_NHAN
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[BIEN_BAN_XAC_NHAN]', RESEED, 10)
GO


-- ----------------------------
-- Primary Key structure for table BIEN_BAN_XAC_NHAN
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_XAC_NHAN] ADD CONSTRAINT [PK__BIEN_BAN__3214EC07EF5A36EE] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for BIEN_BAN_XU_LY
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[BIEN_BAN_XU_LY]', RESEED, 8)
GO


-- ----------------------------
-- Primary Key structure for table BIEN_BAN_XU_LY
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_XU_LY] ADD CONSTRAINT [PK__BIEN_BAN__3214EC0729919D77] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Primary Key structure for table BienBan_CustomFields
-- ----------------------------
ALTER TABLE [dbo].[BienBan_CustomFields] ADD CONSTRAINT [PK__BienBan___305B1415EE5F6462] PRIMARY KEY CLUSTERED ([BienBanId], [FieldName])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for DM_AQL_PLAN
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[DM_AQL_PLAN]', RESEED, 175)
GO


-- ----------------------------
-- Primary Key structure for table DM_AQL_PLAN
-- ----------------------------
ALTER TABLE [dbo].[DM_AQL_PLAN] ADD CONSTRAINT [PK__DM_AQL_P__3214EC0729B965C8] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for DM_BO_PHAN
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[DM_BO_PHAN]', RESEED, 24)
GO


-- ----------------------------
-- Primary Key structure for table DM_BO_PHAN
-- ----------------------------
ALTER TABLE [dbo].[DM_BO_PHAN] ADD CONSTRAINT [PK__DM_BO_PH__3214EC0777BD9F2C] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for DM_CHECK_ITEM
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[DM_CHECK_ITEM]', RESEED, 6567)
GO


-- ----------------------------
-- Primary Key structure for table DM_CHECK_ITEM
-- ----------------------------
ALTER TABLE [dbo].[DM_CHECK_ITEM] ADD CONSTRAINT [PK__DM_CHECK__3214EC072A9DF39E] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for DM_DE_NGHI_XU_LY
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[DM_DE_NGHI_XU_LY]', RESEED, 6)
GO


-- ----------------------------
-- Primary Key structure for table DM_DE_NGHI_XU_LY
-- ----------------------------
ALTER TABLE [dbo].[DM_DE_NGHI_XU_LY] ADD CONSTRAINT [PK__DM_DE_NG__3214EC074DD9A409] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for DM_DEFECT
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[DM_DEFECT]', RESEED, 419)
GO


-- ----------------------------
-- Indexes structure for table DM_DEFECT
-- ----------------------------
CREATE NONCLUSTERED INDEX [IX_DM_DEFECT_PhanHe_MaNhomLoi_ThuTu]
ON [dbo].[DM_DEFECT] (
  [PhanHe] ASC,
  [MaNhomLoi] ASC,
  [ThuTu] ASC
)
GO


-- ----------------------------
-- Primary Key structure for table DM_DEFECT
-- ----------------------------
ALTER TABLE [dbo].[DM_DEFECT] ADD CONSTRAINT [PK__DM_DEFEC__3214EC07FFE1B011] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for DM_LOAI_KIEM
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[DM_LOAI_KIEM]', RESEED, 6)
GO


-- ----------------------------
-- Uniques structure for table DM_LOAI_KIEM
-- ----------------------------
ALTER TABLE [dbo].[DM_LOAI_KIEM] ADD CONSTRAINT [UQ__DM_LOAI___730A5758EB23E26F] UNIQUE NONCLUSTERED ([MaLoai] ASC)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Primary Key structure for table DM_LOAI_KIEM
-- ----------------------------
ALTER TABLE [dbo].[DM_LOAI_KIEM] ADD CONSTRAINT [PK__DM_LOAI___3214EC07EED60596] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for DM_NHOM_KIEM
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[DM_NHOM_KIEM]', RESEED, 1186)
GO


-- ----------------------------
-- Primary Key structure for table DM_NHOM_KIEM
-- ----------------------------
ALTER TABLE [dbo].[DM_NHOM_KIEM] ADD CONSTRAINT [PK__DM_NHOM___3214EC076A1036B1] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for DM_SAN_PHAM
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[DM_SAN_PHAM]', RESEED, 59706)
GO


-- ----------------------------
-- Primary Key structure for table DM_SAN_PHAM
-- ----------------------------
ALTER TABLE [dbo].[DM_SAN_PHAM] ADD CONSTRAINT [PK__DM_SAN_P__3214EC07E332592F] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for NOTIFICATIONS
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[NOTIFICATIONS]', RESEED, 814)
GO


-- ----------------------------
-- Primary Key structure for table NOTIFICATIONS
-- ----------------------------
ALTER TABLE [dbo].[NOTIFICATIONS] ADD CONSTRAINT [PK__NOTIFICA__3214EC07CE0AB8D6] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for PERMISSIONS
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[PERMISSIONS]', RESEED, 15)
GO


-- ----------------------------
-- Uniques structure for table PERMISSIONS
-- ----------------------------
ALTER TABLE [dbo].[PERMISSIONS] ADD CONSTRAINT [UQ__PERMISSI__91FE575024A9B4B8] UNIQUE NONCLUSTERED ([PermissionCode] ASC)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Primary Key structure for table PERMISSIONS
-- ----------------------------
ALTER TABLE [dbo].[PERMISSIONS] ADD CONSTRAINT [PK__PERMISSI__3214EC07F197DB91] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for PHIEU_KIEM
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[PHIEU_KIEM]', RESEED, 931)
GO


-- ----------------------------
-- Uniques structure for table PHIEU_KIEM
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM] ADD CONSTRAINT [UQ__PHIEU_KI__960AAEE3C2D88B79] UNIQUE NONCLUSTERED ([SoPhieu] ASC)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Primary Key structure for table PHIEU_KIEM
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM] ADD CONSTRAINT [PK__PHIEU_KI__3214EC0722CFF088] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for PHIEU_KIEM_BTP_ITEM
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[PHIEU_KIEM_BTP_ITEM]', RESEED, 231)
GO


-- ----------------------------
-- Indexes structure for table PHIEU_KIEM_BTP_ITEM
-- ----------------------------
CREATE NONCLUSTERED INDEX [IX_PHIEU_KIEM_BTP_ITEM_PhieuKiemId]
ON [dbo].[PHIEU_KIEM_BTP_ITEM] (
  [PhieuKiemId] ASC
)
GO

CREATE NONCLUSTERED INDEX [IX_PHIEU_KIEM_BTP_ITEM_Source]
ON [dbo].[PHIEU_KIEM_BTP_ITEM] (
  [PhieuKiemId] ASC,
  [SourceID_KeHoachSanXuat] ASC,
  [SourceID_DonHang] ASC,
  [SourceID_DonHang_SanPham] ASC,
  [SourceID_DonHang_LoSanXuat] ASC
)
GO


-- ----------------------------
-- Primary Key structure for table PHIEU_KIEM_BTP_ITEM
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_BTP_ITEM] ADD CONSTRAINT [PK_PHIEU_KIEM_BTP_ITEM] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for PHIEU_KIEM_BTP_ITEM_LOT
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[PHIEU_KIEM_BTP_ITEM_LOT]', RESEED, 16)
GO


-- ----------------------------
-- Indexes structure for table PHIEU_KIEM_BTP_ITEM_LOT
-- ----------------------------
CREATE NONCLUSTERED INDEX [IX_PHIEU_KIEM_BTP_ITEM_LOT_BtpItemId]
ON [dbo].[PHIEU_KIEM_BTP_ITEM_LOT] (
  [BtpItemId] ASC,
  [SortOrder] ASC,
  [Id] ASC
)
GO


-- ----------------------------
-- Primary Key structure for table PHIEU_KIEM_BTP_ITEM_LOT
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_BTP_ITEM_LOT] ADD CONSTRAINT [PK_PHIEU_KIEM_BTP_ITEM_LOT] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for PHIEU_KIEM_CHECK_ITEM
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[PHIEU_KIEM_CHECK_ITEM]', RESEED, 7923)
GO


-- ----------------------------
-- Primary Key structure for table PHIEU_KIEM_CHECK_ITEM
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_CHECK_ITEM] ADD CONSTRAINT [PK__PHIEU_KI__3214EC0714A3004B] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for PHIEU_KIEM_CUOI_CHUYEN_DEFECT
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[PHIEU_KIEM_CUOI_CHUYEN_DEFECT]', RESEED, 4)
GO


-- ----------------------------
-- Indexes structure for table PHIEU_KIEM_CUOI_CHUYEN_DEFECT
-- ----------------------------
CREATE NONCLUSTERED INDEX [IX_PKCC_DEFECT_PLAN]
ON [dbo].[PHIEU_KIEM_CUOI_CHUYEN_DEFECT] (
  [PlanId] ASC,
  [SortOrder] ASC,
  [Id] ASC
)
GO


-- ----------------------------
-- Primary Key structure for table PHIEU_KIEM_CUOI_CHUYEN_DEFECT
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_CUOI_CHUYEN_DEFECT] ADD CONSTRAINT [PK__PHIEU_KI__3214EC077B2C96CE] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for PHIEU_KIEM_CUOI_CHUYEN_PLAN
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[PHIEU_KIEM_CUOI_CHUYEN_PLAN]', RESEED, 2)
GO


-- ----------------------------
-- Indexes structure for table PHIEU_KIEM_CUOI_CHUYEN_PLAN
-- ----------------------------
CREATE NONCLUSTERED INDEX [IX_PKCC_PLAN_PHIEU]
ON [dbo].[PHIEU_KIEM_CUOI_CHUYEN_PLAN] (
  [PhieuKiemId] ASC,
  [SortOrder] ASC,
  [Id] ASC
)
GO

CREATE UNIQUE NONCLUSTERED INDEX [UX_PKCC_PLAN_SOURCE]
ON [dbo].[PHIEU_KIEM_CUOI_CHUYEN_PLAN] (
  [ID_KeHoachSanXuat] ASC
)
GO


-- ----------------------------
-- Primary Key structure for table PHIEU_KIEM_CUOI_CHUYEN_PLAN
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_CUOI_CHUYEN_PLAN] ADD CONSTRAINT [PK__PHIEU_KI__3214EC073F794432] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for PHIEU_KIEM_DEFECT
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[PHIEU_KIEM_DEFECT]', RESEED, 1215)
GO


-- ----------------------------
-- Primary Key structure for table PHIEU_KIEM_DEFECT
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_DEFECT] ADD CONSTRAINT [PK__PHIEU_KI__3214EC07312214F5] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for PHIEU_KIEM_SECTION
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[PHIEU_KIEM_SECTION]', RESEED, 2173)
GO


-- ----------------------------
-- Primary Key structure for table PHIEU_KIEM_SECTION
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_SECTION] ADD CONSTRAINT [PK__PHIEU_KI__3214EC0764BFF876] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for PHIEU_KIEM_SXBT_SUMMARY
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[PHIEU_KIEM_SXBT_SUMMARY]', RESEED, 21)
GO


-- ----------------------------
-- Indexes structure for table PHIEU_KIEM_SXBT_SUMMARY
-- ----------------------------
CREATE UNIQUE NONCLUSTERED INDEX [IX_PHIEU_KIEM_SXBT_SUMMARY_PhieuKiemId]
ON [dbo].[PHIEU_KIEM_SXBT_SUMMARY] (
  [PhieuKiemId] ASC
)
GO


-- ----------------------------
-- Primary Key structure for table PHIEU_KIEM_SXBT_SUMMARY
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_SXBT_SUMMARY] ADD CONSTRAINT [PK_PHIEU_KIEM_SXBT_SUMMARY] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for PHIEU_KIEM_THONG_SO_KQ
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[PHIEU_KIEM_THONG_SO_KQ]', RESEED, 4128)
GO


-- ----------------------------
-- Primary Key structure for table PHIEU_KIEM_THONG_SO_KQ
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_THONG_SO_KQ] ADD CONSTRAINT [PK__PHIEU_KI__3214EC079D7A9D46] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for PHIEU_KIEM_TREN_CHUYEN_ENTRY
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[PHIEU_KIEM_TREN_CHUYEN_ENTRY]', RESEED, 22)
GO


-- ----------------------------
-- Primary Key structure for table PHIEU_KIEM_TREN_CHUYEN_ENTRY
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_TREN_CHUYEN_ENTRY] ADD CONSTRAINT [PK__PHIEU_KI__3214EC0732B871B9] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT]', RESEED, 37)
GO


-- ----------------------------
-- Primary Key structure for table PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT] ADD CONSTRAINT [PK__PHIEU_KI__3214EC07ABE0610D] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for PHIEU_KIEM_TREN_CHUYEN_SLOT
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[PHIEU_KIEM_TREN_CHUYEN_SLOT]', RESEED, 14)
GO


-- ----------------------------
-- Indexes structure for table PHIEU_KIEM_TREN_CHUYEN_SLOT
-- ----------------------------
CREATE UNIQUE NONCLUSTERED INDEX [UX_PKTC_SLOT_PHIEU_GIO]
ON [dbo].[PHIEU_KIEM_TREN_CHUYEN_SLOT] (
  [PhieuKiemId] ASC,
  [GioKiem] ASC
)
GO


-- ----------------------------
-- Primary Key structure for table PHIEU_KIEM_TREN_CHUYEN_SLOT
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_TREN_CHUYEN_SLOT] ADD CONSTRAINT [PK__PHIEU_KI__3214EC07A4EDE14E] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for PHIEU_KIEM_XAC_NHAN
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[PHIEU_KIEM_XAC_NHAN]', RESEED, 182)
GO


-- ----------------------------
-- Primary Key structure for table PHIEU_KIEM_XAC_NHAN
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_XAC_NHAN] ADD CONSTRAINT [PK__PHIEU_KI__3214EC07078819E6] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Primary Key structure for table PhieuKiem_CustomFields
-- ----------------------------
ALTER TABLE [dbo].[PhieuKiem_CustomFields] ADD CONSTRAINT [PK__PhieuKie__29C3DD00CDE38E9B] PRIMARY KEY CLUSTERED ([PhieuKiemId], [FieldName])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Primary Key structure for table ROLE_PERMISSION
-- ----------------------------
ALTER TABLE [dbo].[ROLE_PERMISSION] ADD CONSTRAINT [PK_ROLE_PERMISSION] PRIMARY KEY CLUSTERED ([RoleId], [PermissionId])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for ROLES
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[ROLES]', RESEED, 9)
GO


-- ----------------------------
-- Uniques structure for table ROLES
-- ----------------------------
ALTER TABLE [dbo].[ROLES] ADD CONSTRAINT [UQ__ROLES__D62CB59C3F6D0DDB] UNIQUE NONCLUSTERED ([RoleCode] ASC)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Primary Key structure for table ROLES
-- ----------------------------
ALTER TABLE [dbo].[ROLES] ADD CONSTRAINT [PK__ROLES__3214EC07704E8DA7] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for SAN_PHAM_NHOM_KIEM
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[SAN_PHAM_NHOM_KIEM]', RESEED, 4088)
GO


-- ----------------------------
-- Primary Key structure for table SAN_PHAM_NHOM_KIEM
-- ----------------------------
ALTER TABLE [dbo].[SAN_PHAM_NHOM_KIEM] ADD CONSTRAINT [PK__SAN_PHAM__3214EC07264E79A5] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for SAN_PHAM_THONG_SO
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[SAN_PHAM_THONG_SO]', RESEED, 1729)
GO


-- ----------------------------
-- Primary Key structure for table SAN_PHAM_THONG_SO
-- ----------------------------
ALTER TABLE [dbo].[SAN_PHAM_THONG_SO] ADD CONSTRAINT [PK__SAN_PHAM__3214EC07B698C3B2] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for TRA_LOI_Y_KIEN
-- ----------------------------

-- ----------------------------
-- Primary Key structure for table TRA_LOI_Y_KIEN
-- ----------------------------
ALTER TABLE [dbo].[TRA_LOI_Y_KIEN] ADD CONSTRAINT [PK__TRA_LOI___3214EC07C2667669] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for USER_PUSH_TOKENS
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[USER_PUSH_TOKENS]', RESEED, 24)
GO


-- ----------------------------
-- Primary Key structure for table USER_PUSH_TOKENS
-- ----------------------------
ALTER TABLE [dbo].[USER_PUSH_TOKENS] ADD CONSTRAINT [PK__USER_PUS__3214EC07E069B5D7] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Primary Key structure for table USER_ROLE
-- ----------------------------
ALTER TABLE [dbo].[USER_ROLE] ADD CONSTRAINT [PK_USER_ROLE] PRIMARY KEY CLUSTERED ([UserId], [RoleId])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for USERS
-- ----------------------------
DBCC CHECKIDENT ('[dbo].[USERS]', RESEED, 501)
GO


-- ----------------------------
-- Uniques structure for table USERS
-- ----------------------------
ALTER TABLE [dbo].[USERS] ADD CONSTRAINT [UQ__USERS__536C85E42869F69B] UNIQUE NONCLUSTERED ([Username] ASC)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Primary Key structure for table USERS
-- ----------------------------
ALTER TABLE [dbo].[USERS] ADD CONSTRAINT [PK__USERS__3214EC0795D9A2BD] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Auto increment value for XIN_Y_KIEN
-- ----------------------------

-- ----------------------------
-- Primary Key structure for table XIN_Y_KIEN
-- ----------------------------
ALTER TABLE [dbo].[XIN_Y_KIEN] ADD CONSTRAINT [PK__XIN_Y_KI__3214EC071D140D33] PRIMARY KEY CLUSTERED ([Id])
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)  
ON [PRIMARY]
GO


-- ----------------------------
-- Foreign Keys structure for table BIEN_BAN_ANH
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_ANH] ADD CONSTRAINT [FK__BIEN_BAN___BienB__477199F1] FOREIGN KEY ([BienBanId]) REFERENCES [dbo].[BIEN_BAN_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table BIEN_BAN_ASSIGN
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_ASSIGN] ADD CONSTRAINT [FK__BIEN_BAN___BienB__1D4655FB] FOREIGN KEY ([BienBanId]) REFERENCES [dbo].[BIEN_BAN_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table BIEN_BAN_CHI_PHI
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_CHI_PHI] ADD CONSTRAINT [FK__BIEN_BAN___BienB__24E777C3] FOREIGN KEY ([BienBanId]) REFERENCES [dbo].[BIEN_BAN_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table BIEN_BAN_DEFECT
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_DEFECT] ADD CONSTRAINT [FK_BIEN_BAN_DEFECT_BIEN_BAN] FOREIGN KEY ([BienBanId]) REFERENCES [dbo].[BIEN_BAN_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO

ALTER TABLE [dbo].[BIEN_BAN_DEFECT] ADD CONSTRAINT [FK_BIEN_BAN_DEFECT_DM_DEFECT] FOREIGN KEY ([DefectId]) REFERENCES [dbo].[DM_DEFECT] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table BIEN_BAN_KIEM
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_KIEM] ADD CONSTRAINT [FK__BIEN_BAN___Phieu__3EDC53F0] FOREIGN KEY ([PhieuKiemId]) REFERENCES [dbo].[PHIEU_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO

ALTER TABLE [dbo].[BIEN_BAN_KIEM] ADD CONSTRAINT [FK__BIEN_BAN___Nguoi__3FD07829] FOREIGN KEY ([NguoiLapId]) REFERENCES [dbo].[USERS] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table BIEN_BAN_SXBT_CONFIRM_STEP
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_SXBT_CONFIRM_STEP] ADD CONSTRAINT [FK_BB_SXBT_CONFIRM_STEP_BIEN_BAN] FOREIGN KEY ([BienBanId]) REFERENCES [dbo].[BIEN_BAN_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table BIEN_BAN_SXBT_XULY_ROW
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_SXBT_XULY_ROW] ADD CONSTRAINT [FK_BIEN_BAN_SXBT_XULY_ROW_BIEN_BAN] FOREIGN KEY ([BienBanId]) REFERENCES [dbo].[BIEN_BAN_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table BIEN_BAN_XAC_NHAN
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_XAC_NHAN] ADD CONSTRAINT [FK__BIEN_BAN___BienB__43A1090D] FOREIGN KEY ([BienBanId]) REFERENCES [dbo].[BIEN_BAN_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO

ALTER TABLE [dbo].[BIEN_BAN_XAC_NHAN] ADD CONSTRAINT [FK__BIEN_BAN___Nguoi__44952D46] FOREIGN KEY ([NguoiXacNhanId]) REFERENCES [dbo].[USERS] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table BIEN_BAN_XU_LY
-- ----------------------------
ALTER TABLE [dbo].[BIEN_BAN_XU_LY] ADD CONSTRAINT [FK__BIEN_BAN___BienB__2116E6DF] FOREIGN KEY ([BienBanId]) REFERENCES [dbo].[BIEN_BAN_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table DM_CHECK_ITEM
-- ----------------------------
ALTER TABLE [dbo].[DM_CHECK_ITEM] ADD CONSTRAINT [FK__DM_CHECK___NhomK__22401542] FOREIGN KEY ([NhomKiemId]) REFERENCES [dbo].[DM_NHOM_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table NOTIFICATIONS
-- ----------------------------
ALTER TABLE [dbo].[NOTIFICATIONS] ADD CONSTRAINT [FK__NOTIFICAT__UserI__595B4002] FOREIGN KEY ([UserId]) REFERENCES [dbo].[USERS] ([Id]) ON DELETE CASCADE ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table PHIEU_KIEM
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM] ADD CONSTRAINT [FK__PHIEU_KIE__SanPh__2BC97F7C] FOREIGN KEY ([SanPhamId]) REFERENCES [dbo].[DM_SAN_PHAM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO

ALTER TABLE [dbo].[PHIEU_KIEM] ADD CONSTRAINT [FK__PHIEU_KIE__LoaiK__2CBDA3B5] FOREIGN KEY ([LoaiKiemId]) REFERENCES [dbo].[DM_LOAI_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO

ALTER TABLE [dbo].[PHIEU_KIEM] ADD CONSTRAINT [FK__PHIEU_KIE__Nguoi__2DB1C7EE] FOREIGN KEY ([NguoiKiemId]) REFERENCES [dbo].[USERS] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table PHIEU_KIEM_BTP_ITEM_LOT
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_BTP_ITEM_LOT] ADD CONSTRAINT [FK_PHIEU_KIEM_BTP_ITEM_LOT_ITEM] FOREIGN KEY ([BtpItemId]) REFERENCES [dbo].[PHIEU_KIEM_BTP_ITEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table PHIEU_KIEM_CHECK_ITEM
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_CHECK_ITEM] ADD CONSTRAINT [FK__PHIEU_KIE__Secti__373B3228] FOREIGN KEY ([SectionId]) REFERENCES [dbo].[PHIEU_KIEM_SECTION] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table PHIEU_KIEM_CUOI_CHUYEN_DEFECT
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_CUOI_CHUYEN_DEFECT] ADD CONSTRAINT [FK_PKCC_DEFECT_PLAN] FOREIGN KEY ([PlanId]) REFERENCES [dbo].[PHIEU_KIEM_CUOI_CHUYEN_PLAN] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO

ALTER TABLE [dbo].[PHIEU_KIEM_CUOI_CHUYEN_DEFECT] ADD CONSTRAINT [FK_PKCC_DEFECT_DM_DEFECT] FOREIGN KEY ([DefectId]) REFERENCES [dbo].[DM_DEFECT] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table PHIEU_KIEM_CUOI_CHUYEN_PLAN
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_CUOI_CHUYEN_PLAN] ADD CONSTRAINT [FK_PKCC_PLAN_PHIEU_KIEM] FOREIGN KEY ([PhieuKiemId]) REFERENCES [dbo].[PHIEU_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table PHIEU_KIEM_DEFECT
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_DEFECT] ADD CONSTRAINT [FK__PHIEU_KIE__Secti__3A179ED3] FOREIGN KEY ([SectionId]) REFERENCES [dbo].[PHIEU_KIEM_SECTION] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO

ALTER TABLE [dbo].[PHIEU_KIEM_DEFECT] ADD CONSTRAINT [FK__PHIEU_KIE__Defec__3B0BC30C] FOREIGN KEY ([DefectId]) REFERENCES [dbo].[DM_DEFECT] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO

ALTER TABLE [dbo].[PHIEU_KIEM_DEFECT] ADD CONSTRAINT [FK_Defect_CheckItem] FOREIGN KEY ([CheckItemId]) REFERENCES [dbo].[PHIEU_KIEM_CHECK_ITEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table PHIEU_KIEM_SECTION
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_SECTION] ADD CONSTRAINT [FK__PHIEU_KIE__Phieu__336AA144] FOREIGN KEY ([PhieuKiemId]) REFERENCES [dbo].[PHIEU_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table PHIEU_KIEM_THONG_SO_KQ
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_THONG_SO_KQ] ADD CONSTRAINT [FK_PKTS_PhieuKiem] FOREIGN KEY ([PhieuKiemId]) REFERENCES [dbo].[PHIEU_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO

ALTER TABLE [dbo].[PHIEU_KIEM_THONG_SO_KQ] ADD CONSTRAINT [FK_PKTS_ThongSo] FOREIGN KEY ([ThongSoId]) REFERENCES [dbo].[SAN_PHAM_THONG_SO] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table PHIEU_KIEM_TREN_CHUYEN_ENTRY
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_TREN_CHUYEN_ENTRY] ADD CONSTRAINT [FK_PKTC_ENTRY_SLOT] FOREIGN KEY ([SlotId]) REFERENCES [dbo].[PHIEU_KIEM_TREN_CHUYEN_SLOT] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO

ALTER TABLE [dbo].[PHIEU_KIEM_TREN_CHUYEN_ENTRY] ADD CONSTRAINT [FK_PKTC_ENTRY_USERS] FOREIGN KEY ([NguoiGhiNhanId]) REFERENCES [dbo].[USERS] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT] ADD CONSTRAINT [FK_PKTC_ENTRY_DEFECT_ENTRY] FOREIGN KEY ([EntryId]) REFERENCES [dbo].[PHIEU_KIEM_TREN_CHUYEN_ENTRY] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO

ALTER TABLE [dbo].[PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT] ADD CONSTRAINT [FK_PKTC_ENTRY_DEFECT_DM_DEFECT] FOREIGN KEY ([DefectId]) REFERENCES [dbo].[DM_DEFECT] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table PHIEU_KIEM_TREN_CHUYEN_SLOT
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_TREN_CHUYEN_SLOT] ADD CONSTRAINT [FK_PKTC_SLOT_PHIEU_KIEM] FOREIGN KEY ([PhieuKiemId]) REFERENCES [dbo].[PHIEU_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table PHIEU_KIEM_XAC_NHAN
-- ----------------------------
ALTER TABLE [dbo].[PHIEU_KIEM_XAC_NHAN] ADD CONSTRAINT [FK__PHIEU_KIE__Phieu__1699586C] FOREIGN KEY ([PhieuKiemId]) REFERENCES [dbo].[PHIEU_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO

ALTER TABLE [dbo].[PHIEU_KIEM_XAC_NHAN] ADD CONSTRAINT [FK__PHIEU_KIE__Nguoi__178D7CA5] FOREIGN KEY ([NguoiXacNhanId]) REFERENCES [dbo].[USERS] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table ROLE_PERMISSION
-- ----------------------------
ALTER TABLE [dbo].[ROLE_PERMISSION] ADD CONSTRAINT [FK_RP_ROLE] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[ROLES] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO

ALTER TABLE [dbo].[ROLE_PERMISSION] ADD CONSTRAINT [FK_RP_PERMISSION] FOREIGN KEY ([PermissionId]) REFERENCES [dbo].[PERMISSIONS] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table SAN_PHAM_NHOM_KIEM
-- ----------------------------
ALTER TABLE [dbo].[SAN_PHAM_NHOM_KIEM] ADD CONSTRAINT [FK__SAN_PHAM___SanPh__1D7B6025] FOREIGN KEY ([SanPhamId]) REFERENCES [dbo].[DM_SAN_PHAM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO

ALTER TABLE [dbo].[SAN_PHAM_NHOM_KIEM] ADD CONSTRAINT [FK__SAN_PHAM___NhomK__1E6F845E] FOREIGN KEY ([NhomKiemId]) REFERENCES [dbo].[DM_NHOM_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table SAN_PHAM_THONG_SO
-- ----------------------------
ALTER TABLE [dbo].[SAN_PHAM_THONG_SO] ADD CONSTRAINT [FK_SPTS_SanPham] FOREIGN KEY ([SanPhamId]) REFERENCES [dbo].[DM_SAN_PHAM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table TRA_LOI_Y_KIEN
-- ----------------------------
ALTER TABLE [dbo].[TRA_LOI_Y_KIEN] ADD CONSTRAINT [FK__TRA_LOI_Y__XinYK__4F12BBB9] FOREIGN KEY ([XinYKienId]) REFERENCES [dbo].[XIN_Y_KIEN] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO

ALTER TABLE [dbo].[TRA_LOI_Y_KIEN] ADD CONSTRAINT [FK__TRA_LOI_Y__Nguoi__5006DFF2] FOREIGN KEY ([NguoiTraLoiId]) REFERENCES [dbo].[USERS] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table USER_PUSH_TOKENS
-- ----------------------------
ALTER TABLE [dbo].[USER_PUSH_TOKENS] ADD CONSTRAINT [FK__USER_PUSH__UserI__54968AE5] FOREIGN KEY ([UserId]) REFERENCES [dbo].[USERS] ([Id]) ON DELETE CASCADE ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table USER_ROLE
-- ----------------------------
ALTER TABLE [dbo].[USER_ROLE] ADD CONSTRAINT [FK_UR_USER] FOREIGN KEY ([UserId]) REFERENCES [dbo].[USERS] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO

ALTER TABLE [dbo].[USER_ROLE] ADD CONSTRAINT [FK_UR_ROLE] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[ROLES] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO


-- ----------------------------
-- Foreign Keys structure for table XIN_Y_KIEN
-- ----------------------------
ALTER TABLE [dbo].[XIN_Y_KIEN] ADD CONSTRAINT [FK__XIN_Y_KIE__BienB__4B422AD5] FOREIGN KEY ([BienBanId]) REFERENCES [dbo].[BIEN_BAN_KIEM] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
GO

