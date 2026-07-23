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

 Date: 23/07/2026 13:05:03
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


-- ---------------------------