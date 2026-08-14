const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const attachBtpLotRows = (btpItems = [], lotRows = []) => {
    const rowsByItemId = lotRows.reduce((acc, row) => {
        const key = row.BtpItemId;
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
    }, {});

    return btpItems.map(item => {
        const rows = rowsByItemId[item.Id] || [];
        return {
            ...item,
            LotRows: rows.length > 0
                ? rows
                : [{
                    BtpItemId: item.Id,
                    DauTuanGS1: item.DauTuanGS1,
                    ThuTu: item.ThuTu,
                    LxvtLot: item.LxvtLot,
                    SoLotSX: item.SoLotSX,
                    SoLuongNhap: item.SoLuongNhap,
                    SoLuongKhoXacNhan: item.SoLuongKhoXacNhan,
                    KhoXacNhanBy: item.KhoXacNhanBy,
                    KhoXacNhanAt: item.KhoXacNhanAt,
                    SortOrder: 1
                }].filter(row =>
                    (row.SoLuongNhap !== null && row.SoLuongNhap !== undefined) ||
                    (row.SoLuongKhoXacNhan !== null && row.SoLuongKhoXacNhan !== undefined) ||
                    row.DauTuanGS1 || row.ThuTu || row.LxvtLot || row.SoLotSX
                )
        };
    });
};
const sql = require('mssql');
const fs = require('fs');
const { poolPromise } = require('../db');
const authenticateToken = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const requireExactPermission = require('../middlewares/exactPermission.middleware');
const { getClosingScheduleCustomer } = require('../utils/closingScheduleCustomer');
const { attachSignatureDataUrls, loadSignatureDataUrlMap } = require('../utils/signatureImage');
const {
    getBienBanFiles,
    getPhieuKiemFiles,
    deleteBienBanData,
    deletePhieuKiemData,
    removeBienBanFiles
} = require('../services/kcsRecordDeletion.service');

const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
sharp.cache(false);

const { Expo } = require('expo-server-sdk');
let expo = new Expo();
const CUOI_CHUYEN_LOAI_KIEM_ID = 3;
const TREN_CHUYEN_LOAI_KIEM_ID = 6;
const CUOI_CHUYEN_APPROVE_BOPHAN_FIELD = 'CuoiChuyen_ApproveBoPhanId';
const CUOI_CHUYEN_COMPLETED_BY_FIELD = 'CuoiChuyen_CompletedByUserId';
const CUOI_CHUYEN_COMPLETED_BY_NAME_FIELD = 'CuoiChuyen_CompletedByName';
const CUOI_CHUYEN_APPROVED_BY_NAME_FIELD = 'CuoiChuyen_ApprovedByName';
const TREN_CHUYEN_APPROVE_BOPHAN_FIELD = 'TrenChuyen_ApproveBoPhanId';
const TREN_CHUYEN_COMPLETED_BY_FIELD = 'TrenChuyen_CompletedByUserId';
const TREN_CHUYEN_COMPLETED_BY_NAME_FIELD = 'TrenChuyen_CompletedByName';
const UNIFIED_PRINT_DATA_VERSION_FIELD = 'UnifiedPrintDataVersion';
const UNIFIED_PRINT_DATA_VERSION = '1';
const TREN_CHUYEN_SOURCE_FIELDS = [
    'TrenChuyen_MaDonHang',
    'TrenChuyen_TenQuyTrinhSanXuat',
    'TrenChuyen_Lot',
    'TrenChuyen_LenhXuatVatTu'
];
const TREN_CHUYEN_EDITABLE_SOURCE_FIELDS = new Set([
    'TrenChuyen_Lot',
    'TrenChuyen_LenhXuatVatTu'
]);

const isCuoiChuyenLoaiKiem = (loaiKiemId) => Number(loaiKiemId) === CUOI_CHUYEN_LOAI_KIEM_ID;
const isTrenChuyenLoaiKiem = (loaiKiemId) => Number(loaiKiemId) === TREN_CHUYEN_LOAI_KIEM_ID;
const normalizeDateOnly = (value) => {
    if (value === null || value === undefined || value === '') return null;

    const rawValue = String(value).trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(rawValue);
    if (!match) return null;
    if (rawValue.includes('T') && Number.isNaN(Date.parse(rawValue))) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    if (parsedDate.getUTCFullYear() !== year
        || parsedDate.getUTCMonth() !== month - 1
        || parsedDate.getUTCDate() !== day) {
        return null;
    }

    return `${match[1]}-${match[2]}-${match[3]}`;
};
const serializeSqlDateOnly = (value) => {
    if (!(value instanceof Date)) return normalizeDateOnly(value);

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const isAdminUser = (user = {}) =>
    Array.isArray(user?.permissions) && user.permissions.includes('QUAN_TRI_DM')
    || (Array.isArray(user?.roles) && user.roles.some((role) => String(role || '').toUpperCase().includes('ADMIN')));
const getUserDisplayName = async (pool, userId, fallback = '') => {
    const normalizedUserId = Number(userId || 0);
    if (!normalizedUserId) return fallback || '';

    const result = await pool.request()
        .input('UserId', sql.Int, normalizedUserId)
        .query(`
            SELECT TOP 1 COALESCE(NULLIF(LTRIM(RTRIM(FullName)), ''), Username) AS DisplayName
            FROM dbo.USERS
            WHERE Id = @UserId
        `);

    return result.recordset?.[0]?.DisplayName || fallback || '';
};
const canManageTrenChuyenAll = (permissions = []) =>
    Array.isArray(permissions) && (permissions.includes('PHAN_BO_KIEM') || permissions.includes('KET_LUAN') || permissions.includes('QUAN_TRI_DM'));
const excludeCongDoanRows = async (pool, rows = []) => {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const result = await pool.request().query(`
        SELECT PhieuKiemId
        FROM dbo.PHIEU_KIEM_CONG_DOAN_HEADER
    `);
    const congDoanIds = new Set(
        (result.recordset || []).map((item) => Number(item.PhieuKiemId))
    );

    return rows.filter((item) => !congDoanIds.has(Number(item.Id)));
};

const attachProductImageToPhieu = async (pool, phieu = null) => {
    if (!phieu || !phieu.SanPhamId) {
        return phieu;
    }

    const result = await pool.request()
        .input("SanPhamId", sql.Int, phieu.SanPhamId)
        .query("SELECT ImageUrl, KhachHang FROM dbo.DM_SAN_PHAM WHERE Id = @SanPhamId");

    if (!phieu.ImageUrl) {
        phieu.ImageUrl = result.recordset?.[0]?.ImageUrl || null;
    }
    if (!phieu.KhachHang) {
        phieu.KhachHang = result.recordset?.[0]?.KhachHang || null;
    }
    return phieu;
};

const normalizePositiveIds = (values = []) => [...new Set(
    (Array.isArray(values) ? values : [values])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
)];

const loadSxbtImportPlans = async (request, keHoachNhapIds, { lockPrimaryLinks = false } = {}) => {
    const ids = normalizePositiveIds(keHoachNhapIds);
    if (ids.length === 0) return [];

    const result = await request
        .input('KeHoachNhapIdsJson', sql.NVarChar(sql.MAX), JSON.stringify(ids))
        .query(`
            DECLARE @HasPlanLinkTable BIT = CASE
                WHEN OBJECT_ID(N'dbo.PHIEU_KIEM_SXBT_PLAN', N'U') IS NULL THEN 0 ELSE 1 END;

            ;WITH ranked_plan AS (
                SELECT sourceData.*,
                    MAX(CASE WHEN sourceData.LoaiKH = 2 THEN 1 ELSE 0 END) OVER (
                        PARTITION BY sourceData.ID_KeHoachSanXuat,
                            ISNULL(sourceData.ID_DonHang_LoSanXuat, 0),
                            ISNULL(sourceData.ID_DonHang_SanPham, 0),
                            sourceData.Ngay_ThucTeSX
                    ) AS CoDieuChinh,
                    ROW_NUMBER() OVER (
                        PARTITION BY sourceData.ID_KeHoachSanXuat,
                            ISNULL(sourceData.ID_DonHang_LoSanXuat, 0),
                            ISNULL(sourceData.ID_DonHang_SanPham, 0),
                            sourceData.Ngay_ThucTeSX,
                            sourceData.LoaiKH
                        ORDER BY sourceData.Ngay_Tao DESC, sourceData.ID_TuTang DESC
                    ) AS ThuTuTrongLoai
                FROM TAG_QLSX.dbo.KeHoachSanXuat_NhaThau_ThamChieu_Nhap sourceData
                WHERE sourceData.Ngay_NhapBTP >= DATEADD(DAY, -5, CONVERT(date, GETDATE()))
            )
            SELECT
                sourceRow.ID_TuTang AS KeHoachNhapId,
                sourceRow.ID_KeHoachSanXuat,
                sourceRow.Ngay_NhapBTP,
                sourceRow.Ngay_ThucTeSX,
                sourceRow.Ngay_Tao,
                sourceRow.SoLuong,
                sourceRow.LoaiKH,
                sourceRow.ID_DonHang_LoSanXuat,
                COALESCE(NULLIF(sourceRow.ID_DonHang_SanPham, 0), fallbackProduct.ID_DonHang_SanPham) AS ID_DonHang_SanPham,
                productionPlan.ID_QuyTrinhSanXuat,
                productionPlan.ID_BoPhan,
                productionOrder.ID_DonVi,
                productionOrder.ID_DonHang,
                unitRow.Ten_DonVi,
                departmentRow.Ten_BoPhan,
                contractor.Ma_NhaThau,
                orderRow.Ma_DonHang,
                processRow.Ten_QuyTrinhSanXuat,
                productionLot.So_LoSanXuat,
                COALESCE(productRow.ItemCode, fallbackProduct.ItemCode) AS ItemCode,
                COALESCE(productRow.Ten_SanPham, fallbackProduct.Ten_SanPham) AS Ten_SanPham,
                unitOfMeasure.Ten_DonViTinh AS DonViTinh,
                localProduct.Id AS SanPhamId,
                legacyInspection.Id AS LegacyPhieuKiemId,
                CASE WHEN @HasPlanLinkTable = 1 AND EXISTS (
                    SELECT 1 FROM dbo.PHIEU_KIEM_SXBT_PLAN AS planLink ${lockPrimaryLinks ? 'WITH (UPDLOCK, HOLDLOCK)' : ''}
                    WHERE planLink.KeHoachNhapId = sourceRow.ID_TuTang
                      AND planLink.IsPrimary = 1
                ) THEN 1 ELSE 0 END AS HasPrimaryLink
            FROM OPENJSON(@KeHoachNhapIdsJson) WITH (KeHoachNhapId INT '$') requested
            INNER JOIN ranked_plan sourceRow
                ON sourceRow.ID_TuTang = requested.KeHoachNhapId
            INNER JOIN TAG_QLSX.dbo.KeHoachSanXuat productionPlan
                ON productionPlan.ID_KeHoachSanXuat = sourceRow.ID_KeHoachSanXuat
            INNER JOIN TAG_QLSX.dbo.LenhSanXuat productionOrder
                ON productionOrder.ID_LenhSanXuat = productionPlan.ID_LenhSanXuat
            LEFT JOIN TAG_QTKD.dbo.DonHang orderRow
                ON orderRow.ID_DonHang = productionOrder.ID_DonHang
            LEFT JOIN TAG_QTKD.dbo.DonHang_SanPham orderProduct
                ON orderProduct.ID_DonHang_SanPham = NULLIF(sourceRow.ID_DonHang_SanPham, 0)
            LEFT JOIN TAG_QTKD.dbo.DM_SanPham productRow
                ON productRow.ID_SanPham = orderProduct.ID_SanPham
            OUTER APPLY (
                SELECT TOP (1) fallbackOrderProduct.ID_DonHang_SanPham,
                    fallbackOrderProduct.ID_DonViTinh,
                    fallbackProductRow.ItemCode, fallbackProductRow.Ten_SanPham
                FROM TAG_QTKD.dbo.DonHang_SanPham fallbackOrderProduct
                INNER JOIN TAG_QTKD.dbo.DM_SanPham fallbackProductRow
                    ON fallbackProductRow.ID_SanPham = fallbackOrderProduct.ID_SanPham
                WHERE fallbackOrderProduct.ID_DonHang = productionOrder.ID_DonHang
                ORDER BY fallbackOrderProduct.STT_SanPham, fallbackOrderProduct.ID_DonHang_SanPham
            ) fallbackProduct
            LEFT JOIN TAG_QTKD.dbo.DonHang_LoSanXuat productionLot
                ON productionLot.ID_DonHang_LoSanXuat = NULLIF(sourceRow.ID_DonHang_LoSanXuat, 0)
            LEFT JOIN TAG_QTKD.dbo.DM_QuyTrinhSanXuat processRow
                ON processRow.ID_QuyTrinhSanXuat = productionPlan.ID_QuyTrinhSanXuat
            LEFT JOIN TAG_QTKD.dbo.DM_DonViTinh unitOfMeasure
                ON unitOfMeasure.ID_DonViTinh = COALESCE(orderProduct.ID_DonViTinh, fallbackProduct.ID_DonViTinh, processRow.ID_DonViTinh)
            LEFT JOIN TAG_System.dbo.DM_DonVi unitRow
                ON unitRow.ID_DonVi = productionOrder.ID_DonVi
            LEFT JOIN TAG_System.dbo.DM_BoPhan departmentRow
                ON departmentRow.ID_BoPhan = productionPlan.ID_BoPhan
            LEFT JOIN TAG_QTKD.dbo.DM_NhaThau contractor
                ON contractor.ID_BoPhan = productionPlan.ID_BoPhan
            LEFT JOIN dbo.DM_SAN_PHAM localProduct
                ON localProduct.MaSanPham = COALESCE(productRow.ItemCode, fallbackProduct.ItemCode)
            LEFT JOIN dbo.PHIEU_KIEM legacyInspection
                ON legacyInspection.SxbtKeHoachNhapId = sourceRow.ID_TuTang
               AND ISNULL(legacyInspection.SxbtIsSplitChild, 0) = 0
            WHERE productionOrder.ID_DonVi = 32
              AND (
                    (sourceRow.CoDieuChinh = 0 AND sourceRow.LoaiKH = 1)
                    OR
                    (sourceRow.CoDieuChinh = 1 AND sourceRow.LoaiKH = 2 AND sourceRow.ThuTuTrongLoai = 1)
              );
        `);

    return result.recordset || [];
};

const getSxbtPlanError = (plan) => {
    if (Number(plan.HasPrimaryLink) === 1 || plan.LegacyPhieuKiemId) return 'Kế hoạch đã thuộc phiếu SXBT khác.';
    if (plan.SoLuong === null || Number(plan.SoLuong) < 0) return 'Số lượng kế hoạch không hợp lệ.';
    if (!plan.ItemCode) return 'Kế hoạch chưa xác định được mã sản phẩm.';
    if (!normalizeSxbtProductName(plan.Ten_SanPham)) return 'Kế hoạch chưa xác định được tên sản phẩm.';
    if (!plan.SanPhamId) return `Sản phẩm ${plan.ItemCode} chưa có trong danh mục sản phẩm kiểm.`;
    if (!plan.Ngay_NhapBTP) return 'Kế hoạch chưa có ngày nhập BTP.';
    return null;
};

const stripSxbtMarketSuffix = (value) => String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+(AP|EU|US)$/i, '')
    .trim();

const normalizeSxbtProductName = (value) =>
    stripSxbtMarketSuffix(value).toLocaleUpperCase('vi-VN');

const sxbtGroupKey = (plan) => [
    `NAME:${normalizeSxbtProductName(plan.Ten_SanPham)}`,
    `DATE:${serializeSqlDateOnly(plan.Ngay_NhapBTP) || ''}`
].join('|');

const buildSxbtGroupPreview = (requestedIds, plans) => {
    const byId = new Map(plans.map((plan) => [Number(plan.KeHoachNhapId), plan]));
    const invalidPlans = [];
    const groupsByKey = new Map();

    normalizePositiveIds(requestedIds).forEach((id) => {
        const plan = byId.get(id);
        const error = plan ? getSxbtPlanError(plan) : 'Không tìm thấy kế hoạch nhập BTP hợp lệ.';
        if (error) {
            invalidPlans.push({ keHoachNhapId: id, message: error });
            return;
        }
        const key = sxbtGroupKey(plan);
        if (!groupsByKey.has(key)) groupsByKey.set(key, []);
        groupsByKey.get(key).push(plan);
    });

    const groups = [...groupsByKey.entries()].map(([groupKey, groupPlans], index) => ({
        groupKey,
        groupIndex: index + 1,
        header: {
            ItemCode: groupPlans[0].ItemCode,
            TenSanPham: groupPlans[0].Ten_SanPham,
            TenSanPhamGop: stripSxbtMarketSuffix(groupPlans[0].Ten_SanPham),
            SoLotSX: groupPlans[0].So_LoSanXuat,
            NgayNhap: serializeSqlDateOnly(groupPlans[0].Ngay_NhapBTP),
            TenDonVi: groupPlans[0].Ten_DonVi,
            TenBoPhan: groupPlans[0].Ten_BoPhan,
            MaNhaThau: groupPlans[0].Ma_NhaThau,
            TenQuyTrinhSanXuat: groupPlans[0].Ten_QuyTrinhSanXuat,
            DonViTinh: groupPlans[0].DonViTinh
        },
        plans: groupPlans.map((plan) => ({
            ...plan,
            Ngay_NhapBTP: serializeSqlDateOnly(plan.Ngay_NhapBTP),
            Ngay_ThucTeSX: serializeSqlDateOnly(plan.Ngay_ThucTeSX)
        }))
    }));

    const fingerprintPayload = groups.map((group) => ({
        groupKey: group.groupKey,
        plans: group.plans.map((plan) => ({
            KeHoachNhapId: Number(plan.KeHoachNhapId),
            ID_KeHoachSanXuat: Number(plan.ID_KeHoachSanXuat || 0),
            SoLuong: Number(plan.SoLuong || 0),
            LoaiKH: Number(plan.LoaiKH || 0),
            NgayTao: plan.Ngay_Tao instanceof Date ? plan.Ngay_Tao.toISOString() : String(plan.Ngay_Tao || '')
        }))
    }));
    const fingerprint = crypto
        .createHash('sha256')
        .update(JSON.stringify(fingerprintPayload))
        .digest('hex');

    return { groupCount: groups.length, planCount: plans.length, groups, invalidPlans, fingerprint };
};

const getSxbtSourceInfo = async (pool, phieuKiemId) => {
    const sourceResult = await pool.request()
        .input('PhieuKiemId', sql.Int, Number(phieuKiemId))
        .query(`
            SELECT TOP 1
                pk.SourceId,
                pk.SxbtKeHoachNhapId,
                COALESCE(pk.SxbtPhieuNhapBtpId,
                    CASE WHEN pk.SxbtKeHoachNhapId IS NULL THEN pk.SourceId END
                ) AS SxbtPhieuNhapBtpId
            FROM dbo.PHIEU_KIEM pk
            WHERE pk.Id = @PhieuKiemId
              AND pk.LoaiKiemId = 4
        `);
    const sourceLink = sourceResult.recordset?.[0];
    if (!sourceLink) return null;

    if (sourceLink.SxbtKeHoachNhapId) {
        const planResult = await pool.request()
            .input('KeHoachNhapId', sql.Int, sourceLink.SxbtKeHoachNhapId)
            .input('PhieuNhapBtpId', sql.Int, sourceLink.SxbtPhieuNhapBtpId || null)
            .query(`
                SELECT TOP 1
                    N'KE_HOACH_NHAP' AS SourceType,
                    sourceRow.ID_TuTang AS KeHoachNhapId,
                    @PhieuNhapBtpId AS PhieuNhapBtpId,
                    receipt.So_PhieuNhapBTP,
                    sourceRow.ID_KeHoachSanXuat,
                    sourceRow.Ngay_NhapBTP,
                    sourceRow.Ngay_ThucTeSX,
                    sourceRow.Ngay_Tao,
                    sourceRow.SoLuong,
                    sourceRow.LoaiKH,
                    sourceRow.ID_DonHang_LoSanXuat,
                    sourceRow.ID_DonHang_SanPham,
                    productionPlan.ID_QuyTrinhSanXuat,
                    processRow.Ten_QuyTrinhSanXuat,
                    productionOrder.ID_DonVi,
                    productionPlan.ID_BoPhan,
                    unitRow.Ten_DonVi,
                    departmentRow.Ten_BoPhan,
                    contractor.Ma_NhaThau AS MaDonVi,
                    contractor.Ma_NhaThau,
                    orderRow.Ma_DonHang,
                    productionLot.So_LoSanXuat,
                    productRow.ItemCode,
                    productRow.Ten_SanPham,
                    warehouse.Ten_Kho AS Ten_KhoNhap,
                    CASE WHEN sourceRow.LoaiKH = 2 THEN N'Điều chỉnh' ELSE N'Kế hoạch gốc' END AS TenLoaiKeHoach
                FROM TAG_QLSX.dbo.KeHoachSanXuat_NhaThau_ThamChieu_Nhap sourceRow
                INNER JOIN TAG_QLSX.dbo.KeHoachSanXuat productionPlan
                    ON productionPlan.ID_KeHoachSanXuat = sourceRow.ID_KeHoachSanXuat
                INNER JOIN TAG_QLSX.dbo.LenhSanXuat productionOrder
                    ON productionOrder.ID_LenhSanXuat = productionPlan.ID_LenhSanXuat
                LEFT JOIN TAG_QTKD.dbo.DonHang orderRow
                    ON orderRow.ID_DonHang = productionOrder.ID_DonHang
                LEFT JOIN TAG_QTKD.dbo.DonHang_SanPham orderProduct
                    ON orderProduct.ID_DonHang_SanPham = NULLIF(sourceRow.ID_DonHang_SanPham, 0)
                LEFT JOIN TAG_QTKD.dbo.DM_SanPham productRow
                    ON productRow.ID_SanPham = orderProduct.ID_SanPham
                LEFT JOIN TAG_QTKD.dbo.DonHang_LoSanXuat productionLot
                    ON productionLot.ID_DonHang_LoSanXuat = NULLIF(sourceRow.ID_DonHang_LoSanXuat, 0)
                LEFT JOIN TAG_QTKD.dbo.DM_QuyTrinhSanXuat processRow
                    ON processRow.ID_QuyTrinhSanXuat = productionPlan.ID_QuyTrinhSanXuat
                LEFT JOIN TAG_System.dbo.DM_DonVi unitRow
                    ON unitRow.ID_DonVi = productionOrder.ID_DonVi
                LEFT JOIN TAG_System.dbo.DM_BoPhan departmentRow
                    ON departmentRow.ID_BoPhan = productionPlan.ID_BoPhan
                LEFT JOIN TAG_QTKD.dbo.DM_NhaThau contractor
                    ON contractor.ID_BoPhan = productionPlan.ID_BoPhan
                LEFT JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt
                    ON receipt.ID_PhieuNhapBTP = @PhieuNhapBtpId
                LEFT JOIN TAG_QTKD.dbo.DM_Kho warehouse
                    ON warehouse.ID_Kho = receipt.ID_KhoNhap
                WHERE sourceRow.ID_TuTang = @KeHoachNhapId
            `);
        return planResult.recordset?.[0] || {
            SourceType: 'KE_HOACH_NHAP',
            KeHoachNhapId: sourceLink.SxbtKeHoachNhapId,
            PhieuNhapBtpId: null
        };
    }

    const legacyReceiptId = sourceLink.SxbtPhieuNhapBtpId;
    if (!legacyReceiptId) {
        return {
            SourceType: 'LEGACY_PHIEU_NHAP',
            KeHoachNhapId: null,
            PhieuNhapBtpId: null
        };
    }

    const receiptResult = await pool.request()
        .input('PhieuNhapBtpId', sql.Int, legacyReceiptId)
        .query(`
            SELECT TOP 1
                N'LEGACY_PHIEU_NHAP' AS SourceType,
                CAST(NULL AS INT) AS KeHoachNhapId,
                receipt.ID_PhieuNhapBTP AS PhieuNhapBtpId,
                receipt.So_PhieuNhapBTP,
                receipt.Ngay_NhapBTP,
                receipt.ID_QuyTrinhSanXuat,
                processRow.Ten_QuyTrinhSanXuat,
                receipt.ID_DonVi,
                receipt.ID_BoPhan,
                unitRow.Ten_DonVi,
                departmentRow.Ten_BoPhan,
                contractor.Ma_NhaThau AS MaDonVi,
                contractor.Ma_NhaThau,
                warehouse.Ten_Kho AS Ten_KhoNhap
            FROM TAG_QTKD.dbo.PhieuNhapBTP receipt
            LEFT JOIN TAG_QTKD.dbo.DM_Kho warehouse
                ON warehouse.ID_Kho = receipt.ID_KhoNhap
            LEFT JOIN TAG_QTKD.dbo.DM_QuyTrinhSanXuat processRow
                ON processRow.ID_QuyTrinhSanXuat = receipt.ID_QuyTrinhSanXuat
            LEFT JOIN TAG_System.dbo.DM_DonVi unitRow
                ON unitRow.ID_DonVi = receipt.ID_DonVi
            LEFT JOIN TAG_System.dbo.DM_BoPhan departmentRow
                ON departmentRow.ID_BoPhan = receipt.ID_BoPhan
            LEFT JOIN TAG_QTKD.dbo.DM_NhaThau contractor
                ON contractor.ID_BoPhan = receipt.ID_BoPhan
            WHERE receipt.ID_PhieuNhapBTP = @PhieuNhapBtpId
        `);

    return receiptResult.recordset?.[0] || {
        SourceType: 'LEGACY_PHIEU_NHAP',
        KeHoachNhapId: null,
        PhieuNhapBtpId: legacyReceiptId
    };
};

const getSxbtSourcesInfo = async (pool, phieuKiemId) => {
    const result = await pool.request()
        .input('PhieuKiemId', sql.Int, Number(phieuKiemId))
        .query(`
            SELECT
                link.Id AS SxbtPlanLinkId,
                link.KeHoachNhapId,
                link.IsPrimary,
                sourceRow.ID_KeHoachSanXuat,
                sourceRow.Ngay_NhapBTP,
                sourceRow.Ngay_ThucTeSX,
                sourceRow.Ngay_Tao,
                sourceRow.SoLuong,
                sourceRow.LoaiKH,
                sourceRow.ID_DonHang_LoSanXuat,
                sourceRow.ID_DonHang_SanPham,
                productionPlan.ID_QuyTrinhSanXuat,
                processRow.Ten_QuyTrinhSanXuat,
                productionOrder.ID_DonVi,
                productionPlan.ID_BoPhan,
                unitRow.Ten_DonVi,
                departmentRow.Ten_BoPhan,
                contractor.Ma_NhaThau AS MaDonVi,
                contractor.Ma_NhaThau,
                orderRow.Ma_DonHang,
                productionLot.So_LoSanXuat,
                productRow.ItemCode,
                productRow.Ten_SanPham,
                unitOfMeasure.Ten_DonViTinh AS DonViTinh,
                N'KE_HOACH_NHAP' AS SourceType
            FROM dbo.PHIEU_KIEM_SXBT_PLAN link
            INNER JOIN TAG_QLSX.dbo.KeHoachSanXuat_NhaThau_ThamChieu_Nhap sourceRow
                ON sourceRow.ID_TuTang = link.KeHoachNhapId
            INNER JOIN TAG_QLSX.dbo.KeHoachSanXuat productionPlan
                ON productionPlan.ID_KeHoachSanXuat = sourceRow.ID_KeHoachSanXuat
            INNER JOIN TAG_QLSX.dbo.LenhSanXuat productionOrder
                ON productionOrder.ID_LenhSanXuat = productionPlan.ID_LenhSanXuat
            LEFT JOIN TAG_QTKD.dbo.DonHang orderRow
                ON orderRow.ID_DonHang = productionOrder.ID_DonHang
            LEFT JOIN TAG_QTKD.dbo.DonHang_SanPham orderProduct
                ON orderProduct.ID_DonHang_SanPham = NULLIF(sourceRow.ID_DonHang_SanPham, 0)
            LEFT JOIN TAG_QTKD.dbo.DM_SanPham productRow
                ON productRow.ID_SanPham = orderProduct.ID_SanPham
            LEFT JOIN TAG_QTKD.dbo.DonHang_LoSanXuat productionLot
                ON productionLot.ID_DonHang_LoSanXuat = NULLIF(sourceRow.ID_DonHang_LoSanXuat, 0)
            LEFT JOIN TAG_QTKD.dbo.DM_QuyTrinhSanXuat processRow
                ON processRow.ID_QuyTrinhSanXuat = productionPlan.ID_QuyTrinhSanXuat
            LEFT JOIN TAG_QTKD.dbo.DM_DonViTinh unitOfMeasure
                ON unitOfMeasure.ID_DonViTinh = ISNULL(orderProduct.ID_DonViTinh, processRow.ID_DonViTinh)
            LEFT JOIN TAG_System.dbo.DM_DonVi unitRow
                ON unitRow.ID_DonVi = productionOrder.ID_DonVi
            LEFT JOIN TAG_System.dbo.DM_BoPhan departmentRow
                ON departmentRow.ID_BoPhan = productionPlan.ID_BoPhan
            LEFT JOIN TAG_QTKD.dbo.DM_NhaThau contractor
                ON contractor.ID_BoPhan = productionPlan.ID_BoPhan
            WHERE link.PhieuKiemId = @PhieuKiemId
            ORDER BY link.SortOrder, link.Id;
        `);
    return result.recordset || [];
};

const attachSxbtSourceInfo = async (pool, phieu = null) => {
    if (!phieu?.Id) return { phieu, source: null };

    const linkedSources = await getSxbtSourcesInfo(pool, phieu.Id);
    const legacySource = linkedSources.length === 0 ? await getSxbtSourceInfo(pool, phieu.Id) : null;
    const sources = linkedSources.length > 0 ? linkedSources : (legacySource ? [legacySource] : []);
    const source = sources[0] || null;
    if (!source) return { phieu, source: null };

    const mappedFields = {
        SxbtSourceType: source.SourceType,
        SxbtSource: source,
        KeHoachNhapId: source.KeHoachNhapId || null,
        PhieuNhapBtpId: source.PhieuNhapBtpId || null,
        So_PhieuNhapBTP: source.So_PhieuNhapBTP || phieu.So_PhieuNhapBTP || null,
        Ngay_NhapBTP: source.Ngay_NhapBTP || phieu.Ngay_NhapBTP || null,
        NgayNhap: source.Ngay_NhapBTP || phieu.NgayNhap || phieu.Ngay_NhapBTP || null,
        Ngay_ThucTeSX: source.Ngay_ThucTeSX || phieu.Ngay_ThucTeSX || null,
        Ten_KhoNhap: source.Ten_KhoNhap || phieu.Ten_KhoNhap || null,
        Ten_DonVi: source.Ten_DonVi || phieu.Ten_DonVi || null,
        Ten_BoPhan: source.Ten_BoPhan || phieu.Ten_BoPhan || null,
        MaDonVi: source.MaDonVi || phieu.MaDonVi || phieu.Ma_NhaThau || null,
        Ma_NhaThau: source.Ma_NhaThau || phieu.Ma_NhaThau || null,
        Ma_DonHang: source.Ma_DonHang || phieu.Ma_DonHang || null,
        MaDonHang: source.Ma_DonHang || phieu.MaDonHang || phieu.Ma_DonHang || null,
        Ten_QuyTrinhSanXuat: source.Ten_QuyTrinhSanXuat || phieu.Ten_QuyTrinhSanXuat || null,
        So_LoSanXuat: source.So_LoSanXuat || phieu.So_LoSanXuat || null
    };

    Object.assign(phieu, mappedFields);
    phieu.SxbtSourceCount = sources.length;
    phieu.SxbtSources = sources;
    return { phieu, source, sources };
};

const optionalNonNegativeInteger = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN;
};

const inspectionCapabilities = (req, phieu = {}) => {
    const permissions = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
    const isAdmin = permissions.includes('QUAN_TRI_DM')
        || roles.some((role) => String(role || '').toUpperCase().includes('ADMIN'));
    const status = String(phieu?.TrangThai || '').toUpperCase();
    const open = ['TAO_MOI', 'CHUA_KIEM', 'DA_TAO_SECTION', 'DANG_KIEM'].includes(status);
    const canInspect = isAdmin || permissions.includes('THUC_HIEN_KIEM');
    return {
        canEdit: open && canInspect,
        canComplete: open && canInspect,
        canApprove: status === 'CHO_TBP_DUYET' && (
            isAdmin
            || permissions.includes('PHAN_CONG_NGUOI_XU_LY')
            || permissions.includes('KET_LUAN')
        ),
        canDelete: open && (canInspect || permissions.includes('PHAN_BO_KIEM')),
        canCreateBienBan: Boolean(phieu?.KetLuan === 'KHONG_DAT') && (
            isAdmin || canInspect || permissions.includes('KET_LUAN')
        )
    };
};

const applyQuantityFields = (row, plannedField = 'SoLuong') => {
    if (!row) return row;
    const planned = Number(row[plannedField] || 0);
    const actual = row.SoLuongThucTe === null || row.SoLuongThucTe === undefined
        ? null
        : Number(row.SoLuongThucTe);
    return {
        ...row,
        SoLuongKeHoach: plannedField === 'SoLuongKeHoach' ? row.SoLuongKeHoach : planned,
        SoLuongThucTe: actual,
        SoLuongHieuLuc: actual ?? planned,
        ChenhLechSoLuong: actual === null ? null : actual - planned
    };
};

const attachPhieuQuantity = async (pool, phieu = null) => {
    if (!phieu?.Id) return phieu;
    const result = await pool.request()
        .input('PhieuKiemId', sql.Int, Number(phieu.Id))
        .query(`
            SELECT SoLuong, SoLuongThucTe
            FROM dbo.PHIEU_KIEM
            WHERE Id = @PhieuKiemId
        `);
    Object.assign(phieu, applyQuantityFields({
        ...phieu,
        ...(result.recordset[0] || {})
    }));
    return phieu;
};

const attachListQuantities = async (pool, rows = []) => {
    if (!Array.isArray(rows) || !rows.length) return [];
    const ids = rows.map((row) => Number(row.Id)).filter(Boolean);
    const result = await pool.request()
        .input('IdsJson', sql.NVarChar(sql.MAX), JSON.stringify(ids))
        .input('CuoiChuyenLoaiKiemId', sql.Int, CUOI_CHUYEN_LOAI_KIEM_ID)
        .query(`
            SELECT pk.Id,
                CASE WHEN pk.LoaiKiemId = @CuoiChuyenLoaiKiemId
                    THEN ISNULL(planTotals.TongKeHoach, 0) ELSE ISNULL(pk.SoLuong, 0) END AS SoLuongKeHoach,
                CASE WHEN pk.LoaiKiemId = @CuoiChuyenLoaiKiemId
                    THEN CASE WHEN planTotals.SoDongThucTe > 0 THEN planTotals.TongThucTe ELSE NULL END
                    ELSE pk.SoLuongThucTe END AS SoLuongThucTe,
                CASE WHEN pk.LoaiKiemId = @CuoiChuyenLoaiKiemId
                    THEN ISNULL(planTotals.TongHieuLuc, 0) ELSE COALESCE(pk.SoLuongThucTe, pk.SoLuong, 0) END AS SoLuongHieuLuc
                , creator.BoPhanId AS BoPhanTaoId
                , creatorDepartment.MaBoPhan AS MaBoPhanTao
                , creatorDepartment.TenBoPhan AS TenBoPhanTao
                , inspector.BoPhanId AS BoPhanNguoiKiemId
                , inspectorDepartment.MaBoPhan AS MaBoPhanNguoiKiem
                , inspectorDepartment.TenBoPhan AS TenBoPhanNguoiKiem
            FROM dbo.PHIEU_KIEM pk
            LEFT JOIN dbo.USERS creator ON creator.Id = pk.NguoiLapId
            LEFT JOIN dbo.DM_BO_PHAN creatorDepartment ON creatorDepartment.Id = creator.BoPhanId
            LEFT JOIN dbo.USERS inspector ON inspector.Id = pk.NguoiKiemId
            LEFT JOIN dbo.DM_BO_PHAN inspectorDepartment ON inspectorDepartment.Id = inspector.BoPhanId
            OUTER APPLY (
                SELECT SUM(ISNULL(planRow.SoLuongKeHoach, 0)) AS TongKeHoach,
                    SUM(ISNULL(planRow.SoLuongThucTe, 0)) AS TongThucTe,
                    SUM(COALESCE(planRow.SoLuongThucTe, planRow.SoLuongKeHoach, 0)) AS TongHieuLuc,
                    SUM(CASE WHEN planRow.SoLuongThucTe IS NOT NULL THEN 1 ELSE 0 END) AS SoDongThucTe
                FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN planRow
                WHERE planRow.PhieuKiemId = pk.Id
            ) planTotals
            WHERE pk.Id IN (SELECT TRY_CONVERT(int, [value]) FROM OPENJSON(@IdsJson))
        `);
    const quantitiesById = new Map(result.recordset.map((row) => [Number(row.Id), row]));
    return rows.map((row) => {
        const quantity = quantitiesById.get(Number(row.Id));
        return quantity ? {
            ...row,
            ...quantity,
            ChenhLechSoLuong: quantity.SoLuongThucTe == null
                ? null
                : Number(quantity.SoLuongHieuLuc || 0) - Number(quantity.SoLuongKeHoach || 0)
        } : row;
    });
};

const upsertPhieuKiemCustomFields = async (pool, phieuKiemId, fields) => {
    if (!phieuKiemId || !fields || typeof fields !== 'object' || Array.isArray(fields)) {
        return;
    }

    await pool.request()
        .input('PhieuKiemId', sql.Int, phieuKiemId)
        .input('JsonData', sql.NVarChar(sql.MAX), JSON.stringify(fields))
        .execute('SP_Upsert_PhieuKiem_CustomFields');
};

const applyClosingScheduleSnapshot = (phieu, dynamicFields = []) => {
    if (!phieu || !Array.isArray(dynamicFields)) return phieu;

    const fieldMap = new Map(
        dynamicFields
            .filter((field) => field?.FieldName)
            .map((field) => [field.FieldName, field.FieldValue])
    );
    const invoiceNo = String(
        fieldMap.get('DongCont_InvoiceNo')
        || (Number(phieu.LoaiKiemId) === 5 ? String(phieu.DoiTuong || '').split(' - ')[0] : '')
        || ''
    ).trim();
    const packingMethod = String(fieldMap.get('DongCont_PackingMethod') || '').trim();
    const customer = String(
        fieldMap.get('DongCont_KhachHang')
        || fieldMap.get('KhachHang')
        || (Number(phieu.LoaiKiemId) === 5
            ? getClosingScheduleCustomer({ invoiceNo, packingMethod })
            : '')
        || ''
    ).trim().toUpperCase();

    if (customer === 'IKEA' || customer === 'DEK') {
        phieu.KhachHang = customer;
    }

    phieu.DongContInvoiceNo = invoiceNo || null;
    phieu.DongContPackingMethod = packingMethod || null;
    const packageValue = fieldMap.get('DongCont_Package');
    const normalizedPackage = packageValue === '' || packageValue === null || packageValue === undefined
        ? null
        : Number(packageValue);
    phieu.DongContPackage = Number.isInteger(normalizedPackage) && normalizedPackage >= 0
        ? normalizedPackage
        : null;
    return phieu;
};

const enrichSxbtSignatureFields = async (pool, dynamicFields = [], phieu = null) => {
    const fields = Array.isArray(dynamicFields) ? [...dynamicFields] : [];
    const fieldMap = new Map(fields.map((field) => [field.FieldName, field.FieldValue]));
    const signatureUserFields = [
        ['SxbtKcsCompletedBy', 'SxbtKcsCompletedByName'],
        ['SxbtConfirmedBy', 'SxbtConfirmedByName'],
        ['SxbtKhoConfirmedBy', 'SxbtKhoConfirmedByName']
    ];

    const signatureMap = await loadSignatureDataUrlMap(
        pool,
        signatureUserFields.map(([idField]) => Number(fieldMap.get(idField) || 0))
    );
    for (const [idField, nameField] of signatureUserFields) {
        const userId = Number(fieldMap.get(idField) || 0);
        if (!userId) continue;

        if (!fieldMap.has(nameField)) {
            const fallbackName = idField === 'SxbtKcsCompletedBy' ? phieu?.TenNguoiKiem : '';
            const displayName = await getUserDisplayName(pool, userId, fallbackName || '');
            fields.push({ FieldName: nameField, FieldValue: displayName });
        }
        const signatureDataUrl = signatureMap.get(userId);
        if (signatureDataUrl) {
            fields.push({ FieldName: `${idField}SignatureDataUrl`, FieldValue: signatureDataUrl });
        }
    }

    return fields;
};

const enrichInspectionSignatures = async (pool, dynamicFields = [], xacNhans = []) => {
    const fields = Array.isArray(dynamicFields) ? [...dynamicFields] : [];
    const fieldMap = new Map(fields.map((field) => [field.FieldName, field.FieldValue]));
    const completionFields = [CUOI_CHUYEN_COMPLETED_BY_FIELD, TREN_CHUYEN_COMPLETED_BY_FIELD];
    const signatureMap = await loadSignatureDataUrlMap(
        pool,
        completionFields.map((fieldName) => Number(fieldMap.get(fieldName) || 0))
    );
    completionFields.forEach((fieldName) => {
        const dataUrl = signatureMap.get(Number(fieldMap.get(fieldName) || 0));
        if (dataUrl) fields.push({ FieldName: `${fieldName}SignatureDataUrl`, FieldValue: dataUrl });
    });
    return {
        dynamicFields: fields,
        xacNhans: await attachSignatureDataUrls(pool, xacNhans, 'NguoiXacNhanId')
    };
};

const normalizeTrenChuyenSlots = (slots = []) => slots.map((slot, slotIndex) => ({
    gioKiem: String(slot?.gioKiem || '').trim(),
    sortOrder: Number(slot?.sortOrder || slotIndex + 1),
    entries: Array.isArray(slot?.entries)
        ? slot.entries.map((entry, entryIndex) => ({
            congDoan: String(entry?.congDoan || '').trim(),
            tenCongNhanGayLoi: String(entry?.tenCongNhanGayLoi || '').trim(),
            soLuongKiem: optionalNonNegativeInteger(entry?.soLuongKiem ?? entry?.SoLuongKiem),
            soLoiBuiBan: Number(entry?.soLoiBuiBan ?? entry?.SoLoiBuiBan ?? 0),
            soLoiConTrung: Number(entry?.soLoiConTrung ?? entry?.SoLoiConTrung ?? 0),
            nguoiGhiNhanId: Number(entry?.nguoiGhiNhanId || 0) || null,
            ghiChu: entry?.ghiChu ? String(entry.ghiChu).trim() : '',
            sortOrder: Number(entry?.sortOrder || entryIndex + 1),
            defects: Array.isArray(entry?.defects)
                ? entry.defects.map((defect, defectIndex) => ({
                    defectId: Number(defect?.defectId || 0),
                    soLuong: Number(defect?.soLuong || 0),
                    soLuongDatSauSua: defect?.soLuongDatSauSua === '' || defect?.soLuongDatSauSua == null
                        ? null
                        : Number(defect.soLuongDatSauSua),
                    soLuongKhongDatSauSua: defect?.soLuongKhongDatSauSua === '' || defect?.soLuongKhongDatSauSua == null
                        ? null
                        : Number(defect.soLuongKhongDatSauSua),
                    ghiChu: defect?.ghiChu ? String(defect.ghiChu).trim() : '',
                    imageUrls: Array.isArray(defect?.imageUrls)
                        ? defect.imageUrls.filter((url) => typeof url === 'string' && url.trim() !== '')
                        : [],
                    sortOrder: Number(defect?.sortOrder || defectIndex + 1)
                })).filter((defect) => defect.defectId > 0 && defect.soLuong > 0)
                : []
        }))
        : []
}));

const normalizeCuoiChuyenPlans = (plans = []) => plans.map((plan, planIndex) => ({
    planId: Number(plan?.planId || plan?.id || plan?.Id || 0) || null,
    idKeHoachSanXuat: Number(plan?.idKeHoachSanXuat || plan?.ID_KeHoachSanXuat || plan?.sourceId || 0) || null,
    sanPhamId: Number(plan?.sanPhamId || plan?.SanPhamId || 0) || null,
    maSanPham: String(plan?.maSanPham || plan?.MaSanPham || '').trim(),
    tenSanPham: String(plan?.tenSanPham || plan?.TenSanPham || '').trim(),
    tenDonVi: String(plan?.tenDonVi || plan?.Ten_DonVi || plan?.TenDonVi || '').trim(),
    tenBoPhan: String(plan?.tenBoPhan || plan?.Ten_BoPhan || plan?.TenBoPhan || '').trim(),
    maDonHang: String(plan?.maDonHang || plan?.Ma_DonHang || plan?.MaDonHang || '').trim(),
    tenQuyTrinhSanXuat: String(plan?.tenQuyTrinhSanXuat || plan?.Ten_QuyTrinhSanXuat || plan?.TenQuyTrinhSanXuat || '').trim(),
    lot: String(plan?.lot || plan?.Lot || plan?.So_LoSanXuat || '').trim(),
    lenhXuatVatTu: String(plan?.lenhXuatVatTu || plan?.LenhXuatVatTu || '').trim(),
    soLoiBuiBan: Number(plan?.soLoiBuiBan ?? plan?.SoLoiBuiBan ?? 0),
    soLoiConTrung: Number(plan?.soLoiConTrung ?? plan?.SoLoiConTrung ?? 0),
    ngayKeHoach: plan?.ngayKeHoach || plan?.Ngay || plan?.NgayKeHoach || null,
    soLuongKeHoach: plan?.soLuongKeHoach === '' || plan?.soLuongKeHoach == null
        ? null
        : Number(plan.soLuongKeHoach),
    soLuongThucTe: optionalNonNegativeInteger(plan?.soLuongThucTe ?? plan?.SoLuongThucTe),
    nangSuatDuKien: plan?.nangSuatDuKien === '' || plan?.nangSuatDuKien == null
        ? null
        : Number(plan.nangSuatDuKien),
    daSanXuat: plan?.daSanXuat === '' || plan?.daSanXuat == null
        ? null
        : Number(plan.daSanXuat),
    sortOrder: Number(plan?.sortOrder || planIndex + 1),
    defects: Array.isArray(plan?.defects)
        ? plan.defects.map((defect, defectIndex) => ({
            defectId: Number(defect?.defectId || defect?.DefectId || 0),
            soLuong: Number(defect?.soLuong || defect?.SoLuong || 0),
            soLuongDatSauSua: defect?.soLuongDatSauSua === '' || defect?.soLuongDatSauSua == null
                ? null
                : Number(defect.soLuongDatSauSua),
            soLuongKhongDatSauSua: defect?.soLuongKhongDatSauSua === '' || defect?.soLuongKhongDatSauSua == null
                ? null
                : Number(defect.soLuongKhongDatSauSua),
            ghiChu: String(defect?.ghiChu || defect?.GhiChu || '').trim(),
            tenCongNhan: String(defect?.tenCongNhan || defect?.TenCongNhan || '').trim(),
            imageUrls: Array.isArray(defect?.imageUrls)
                ? defect.imageUrls.filter((url) => typeof url === 'string' && url.trim() !== '')
                : [],
            sortOrder: Number(defect?.sortOrder || defectIndex + 1)
        })).filter((defect) => defect.defectId > 0 && defect.soLuong > 0)
        : []
}));
// Cấu hình Multer để lưu file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

router.post(
    '/upload',
    authenticateToken,
    upload.array('images', 10), // Tối đa 10 ảnh 1 lần
    async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ message: 'No files uploaded' });
            }

            // Xử lý từng file ảnh: Convert sang JPEG để hỗ trợ hiển thị trên Web (đặc biệt là HEIC từ iPhone)
            const filePaths = await Promise.all(req.files.map(async (file) => {
                const outputFilename = `v2-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
                const outputPath = path.join('uploads', outputFilename);

                await sharp(file.path)
                    .rotate() // Tự động xoay ảnh theo EXIF (tránh bị ngược ảnh)
                    .jpeg({ quality: 80 }) // Chuyển về định dạng JPEG, nén chất lượng 80% để nhẹ hơn
                    .toFile(outputPath);

                // Sau khi convert xong, xoá file gốc để tiết kiệm bộ nhớ
                try {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                } catch (err) {
                    console.error('Failed to delete temp file:', file.path, err.message);
                }

                return `/uploads/${outputFilename}`;
            }));

            res.json({ success: true, filePaths });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ message: 'Upload failed' });
        }
    }
);

router.get(
    '/',
    authenticateToken,
    authorize('XEM_PHIEU_KIEM'),
    async (req, res) => {
        try {
            const pool = await poolPromise;

            const userId = req.user.id;
            const role = req.user.role;

            const request = pool.request();

            request.input('UserId', sql.Int, userId);
            request.input('Role', sql.NVarChar, role);

            const result = await request.execute('sp_PhieuKiem_GetList_ByRole');

            const visibleRows = await excludeCongDoanRows(pool, result.recordset);
            const rowsWithQuantities = await attachListQuantities(pool, visibleRows);
            res.json(rowsWithQuantities.map((row) => applyClosingScheduleSnapshot(row, [])));
        } catch (err) {
            console.error('GetPhieuKiem error:', err);
            res.status(500).json({ message: 'Lỗi tải danh sách phiếu kiểm' });
        }
    }
);

// =========================================================
// GET /phieu-kiem/lich-dong-cont/chua-kiem
// =========================================================
router.get(
    '/lich-dong-cont/chua-kiem',
    authenticateToken,
    authorize('XEM_PHIEU_KIEM'),
    async (req, res) => {

        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .execute('sp_LichDongCont_GetList');

            res.json((result.recordset || []).map((row) => ({
                ...row,
                KhachHang: getClosingScheduleCustomer({
                    invoiceNo: row.InvoiceNo,
                    packingMethod: row.PackingMethod
                })
            })));

        } catch (err) {
            console.error('GetLichDongCont error:', err);
            res.status(500).json({ message: 'Lỗi lấy lịch đóng cont' });
        }
    }
);

/* DELETE /phieu-kiem/:id - xóa toàn bộ hồ sơ liên quan, chỉ dành cho permission chuyên biệt. */
router.delete(
    '/:id',
    authenticateToken,
    requireExactPermission('XOA_HO_SO_KCS'),
    async (req, res) => {
        const phieuKiemId = Number(req.params.id);

        if (!Number.isInteger(phieuKiemId) || phieuKiemId <= 0) {
            return res.status(400).json({ message: 'Id phiếu không hợp lệ' });
        }

        let transaction;

        try {
            const pool = await poolPromise;
            transaction = new sql.Transaction(pool);
            await transaction.begin();

            const guard = await new sql.Request(transaction)
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .query(`
                    SELECT
                        ExistsFlag = CASE WHEN EXISTS (
                            SELECT 1 FROM dbo.PHIEU_KIEM WHERE Id = @PhieuKiemId
                        ) THEN 1 ELSE 0 END,
                        BienBanIds = STUFF((
                            SELECT N','+CONVERT(nvarchar(20),bb.Id)
                            FROM dbo.BIEN_BAN_KIEM bb WHERE bb.PhieuKiemId=@PhieuKiemId
                            FOR XML PATH(''),TYPE
                        ).value('.','nvarchar(max)'),1,1,N'');
                `);

            const info = guard.recordset[0];

            if (!info || info.ExistsFlag !== 1) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Không tìm thấy phiếu kiểm' });
            }

            const bienBanIds = String(info.BienBanIds || '').split(',').map(Number).filter(Number.isInteger);
            const files = await getBienBanFiles(transaction,bienBanIds);
            files.push(...await getPhieuKiemFiles(transaction,phieuKiemId));
            await deleteBienBanData(transaction,bienBanIds,req.user.userId);
            await deletePhieuKiemData(transaction,phieuKiemId,req.user.userId);

            await transaction.commit();
            await removeBienBanFiles(files);

            res.json({ success: true, message: 'Đã xoá phiếu kiểm' });
        } catch (err) {
            if (transaction) {
                try {
                    await transaction.rollback();
                } catch { }
            }

            console.error('Delete phieu kiem error:', err);
            res.status(500).json({
                message: 'Không thể xoá phiếu kiểm',
                error: err.message
            });
        }
    }
);

router.get(
    '/source-checked',
    authenticateToken,
    authorize('XEM_PHIEU_KIEM'),
    async (req, res) => {

        try {
            const { week, year, loaiKiemId } = req.query;

            if (!week || !year || !loaiKiemId) {
                return res.status(400).json({
                    message: 'Thiếu tham số week, year hoặc loaiKiemId'
                });
            }

            const pool = await poolPromise;

            const result = await pool.request()
                .input('LoaiKiemId', parseInt(loaiKiemId))
                .input('Week', parseInt(week))
                .input('Year', parseInt(year))
                .execute('sp_PhieuKiem_GetSourceChecked_ByWeekRange');

            // ⚡ trả về array GUID luôn
            res.json(result.recordset.map(x => x.SourceId_LCD));

        } catch (err) {
            console.error('GetSourceChecked error:', err);
            res.status(500).json({ message: 'Lỗi lấy danh sách đã kiểm' });
        }
    }
);

router.get(
    '/chung-tu-nhap/chua-kiem',
    authenticateToken,
    authorize('XEM_PHIEU_KIEM'),
    async (req, res) => {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .execute('sp_ChungTuNhapChiTiet_GetList_ChuaKiem');

            res.json(result.recordset);

        } catch (err) {
            console.error(err);
            res.status(500).json({
                message: 'Lỗi lấy chứng từ nhập'
            });
        }
    }
);

router.get(
    '/phieu-nhap-btp/chua-kiem',
    authenticateToken,
    authorize('XEM_PHIEU_KIEM'),
    async (req, res) => {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .execute('sp_PhieuNhapBTP_GetList_ChuaKiem');

            res.json(result.recordset);

        } catch (err) {
            console.error(err);
            res.status(500).json({
                message: 'Lỗi lấy danh sách phiếu nhập BTP'
            });
        }
    }
);

router.get(
    '/ke-hoach-nhap-btp/chua-kiem',
    authenticateToken,
    authorize('XEM_PHIEU_KIEM'),
    async (req, res) => {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .execute('sp_KeHoachNhapBTP_GetList_ChuaKiem');

            res.json(result.recordset || []);
        } catch (err) {
            console.error('Get import plan list for SXBT error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Lỗi lấy danh sách kế hoạch nhập BTP'
            });
        }
    }
);

router.get(
    '/ke-hoach-san-xuat/chua-kiem',
    authenticateToken,
    authorize('XEM_PHIEU_KIEM'),
    async (req, res) => {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .execute('sp_KeHoachSanXuat_GetList_ChuaKiem_TrenChuyen');

            const rows = result.recordset || [];
            const planIds = [...new Set(rows
                .map((row) => Number(row.ID_KeHoachSanXuat))
                .filter((id) => Number.isInteger(id) && id > 0))];
            let planMetaById = new Map();

            if (planIds.length > 0) {
                const metaResult = await pool.request()
                    .input('PlanIds', sql.NVarChar(sql.MAX), planIds.join(','))
                    .query(`
                        SELECT
                            productionPlan.ID_KeHoachSanXuat,
                            productionPlan.ID_BoPhan,
                            productionPlan.ID_QuyTrinhSanXuat,
                            productionOrder.ID_DonVi
                        FROM TAG_QLSX.dbo.KeHoachSanXuat productionPlan
                        LEFT JOIN TAG_QLSX.dbo.LenhSanXuat productionOrder
                            ON productionOrder.ID_LenhSanXuat = productionPlan.ID_LenhSanXuat
                        WHERE productionPlan.ID_KeHoachSanXuat IN (
                            SELECT TRY_CAST([value] AS int)
                            FROM STRING_SPLIT(@PlanIds, ',')
                        )
                    `);
                planMetaById = new Map((metaResult.recordset || []).map((row) => [
                    Number(row.ID_KeHoachSanXuat),
                    row
                ]));
            }

            let responseRows = rows.map((row) => ({
                ...row,
                ...(planMetaById.get(Number(row.ID_KeHoachSanXuat)) || {}),
                // mssql/useUTC=false tao Date theo gio dia phuong; JSON.stringify se
                // doi sang UTC va co the lui mot ngay. Tra date-only de client gui
                // lai dung khoa nghiep vu ID ke hoach + ngay hien tai.
                Ngay: serializeSqlDateOnly(row.Ngay)
            }));

            if (isCuoiChuyenLoaiKiem(req.query.loaiKiemId) && planIds.length > 0) {
                const checkedResult = await pool.request()
                    .input('LoaiKiemId', sql.Int, CUOI_CHUYEN_LOAI_KIEM_ID)
                    .input('PlanIds', sql.NVarChar(sql.MAX), planIds.join(','))
                    .query(`
                        SELECT DISTINCT
                            planRow.ID_KeHoachSanXuat,
                            CONVERT(char(10), planRow.NgayKeHoach, 23) AS NgayKeHoach
                        FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN planRow
                        INNER JOIN dbo.PHIEU_KIEM inspection
                            ON inspection.Id = planRow.PhieuKiemId
                        WHERE inspection.LoaiKiemId = @LoaiKiemId
                          AND ISNULL(inspection.TrangThai, N'') <> N'DA_HUY'
                          AND planRow.ID_KeHoachSanXuat IN (
                              SELECT TRY_CAST([value] AS int)
                              FROM STRING_SPLIT(@PlanIds, ',')
                          )
                    `);
                const checkedPlanDays = new Set((checkedResult.recordset || []).map((item) =>
                    `${Number(item.ID_KeHoachSanXuat)}|${item.NgayKeHoach}`
                ));
                responseRows = responseRows.filter((row) => !checkedPlanDays.has(
                    `${Number(row.ID_KeHoachSanXuat)}|${row.Ngay}`
                ));
            }

            res.json(responseRows);

        } catch (err) {
            console.error(err);
            res.status(500).json({
                message: 'Lỗi lấy kế hoạch sản xuất'
            });
        }
    }
);

router.get(
    '/my',
    authenticateToken,
    async (req, res) => {

        try {

            const pool = await poolPromise;

            const permissions = req.user.permissions;
            let mode = 'VIEW';
            if (permissions.includes('XAC_NHAN_PX'))
                mode = 'PX';
            if (permissions.includes('THUC_HIEN_KIEM'))
                mode = 'KCS';
            if (permissions.includes('PHAN_BO_KIEM'))
                mode = 'TO_TRUONG_KCS';   // ưu tiên cao hơn KCS
            if (permissions.includes('QUAN_TRI_DM'))
                mode = 'VIEW';
            if ((req.user.roles || []).some(role =>
                String(role || '').toUpperCase() === 'TP_B8'
            ))
                mode = 'VIEW';
            const result = await pool.request()
                .input('UserId', sql.Int, req.user.userId)
                .input('Mode', sql.NVarChar, mode)
                .execute('SP_PhieuKiem_My');

            const visibleRows = await excludeCongDoanRows(pool, result.recordset);
            res.json(await attachListQuantities(pool, visibleRows));

        } catch (error) {

            console.error('API /my error:', error);

            res.status(500).json({
                message: 'Internal Server Error'
            });

        }

    }
);

router.patch(
    '/:id/actual-quantity',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const phieuKiemId = Number(req.params.id);
        const soLuongThucTe = optionalNonNegativeInteger(req.body?.soLuongThucTe);
        if (!Number.isInteger(phieuKiemId) || phieuKiemId <= 0 || Number.isNaN(soLuongThucTe)) {
            return res.status(400).json({ message: 'Số lượng thực tế phải là số nguyên không âm hoặc để trống' });
        }
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .query(`
                    SELECT pk.Id, pk.SoLuong, pk.SoLuongThucTe, pk.TrangThai, pk.LoaiKiemId,
                        CASE WHEN cd.PhieuKiemId IS NULL THEN 0 ELSE 1 END AS LaPhieuCongDoan
                    FROM dbo.PHIEU_KIEM pk
                    LEFT JOIN dbo.PHIEU_KIEM_CONG_DOAN_HEADER cd ON cd.PhieuKiemId = pk.Id
                    WHERE pk.Id = @PhieuKiemId
                `);
            const phieu = result.recordset[0];
            if (!phieu) return res.status(404).json({ message: 'Không tìm thấy phiếu kiểm' });
            if (!['TAO_MOI', 'DANG_KIEM', 'CHUA_KIEM', 'DA_TAO_SECTION'].includes(String(phieu.TrangThai || '').toUpperCase())) {
                return res.status(409).json({ message: 'Phiếu đã hoàn thành nên không thể sửa số lượng thực tế' });
            }
            if (Number(phieu.LoaiKiemId) === CUOI_CHUYEN_LOAI_KIEM_ID || phieu.LaPhieuCongDoan) {
                return res.status(400).json({ message: 'Phiếu nhiều kế hoạch phải nhập số lượng thực tế trên từng kế hoạch' });
            }
            if (Number(phieu.LoaiKiemId) === 4) {
                return res.status(400).json({ message: 'Phiếu SXBT sử dụng số lượng nhập theo từng dòng BTP/Lot' });
            }

            await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('SoLuongThucTe', sql.Int, soLuongThucTe)
                .query(`
                    UPDATE dbo.PHIEU_KIEM
                    SET SoLuongThucTe = @SoLuongThucTe
                    WHERE Id = @PhieuKiemId
                `);
            res.json(applyQuantityFields({ ...phieu, SoLuongThucTe: soLuongThucTe }));
        } catch (error) {
            console.error('Update actual quantity error:', error);
            res.status(500).json({ message: error.message || 'Không cập nhật được số lượng thực tế' });
        }
    }
);

router.patch(
    '/tren-chuyen/:id/source-fields',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const phieuKiemId = Number(req.params.id);
        if (!Number.isInteger(phieuKiemId) || phieuKiemId <= 0) {
            return res.status(400).json({ message: 'PhieuKiemId không hợp lệ' });
        }
        const incoming = Object.fromEntries(TREN_CHUYEN_SOURCE_FIELDS.map((fieldName) => [
            fieldName,
            String(req.body?.[fieldName] ?? '').trim()
        ]));
        try {
            const pool = await poolPromise;
            const headerResult = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .query(`SELECT Id, LoaiKiemId, TrangThai FROM dbo.PHIEU_KIEM WHERE Id = @PhieuKiemId`);
            const phieu = headerResult.recordset[0];
            if (!phieu) return res.status(404).json({ message: 'Không tìm thấy phiếu kiểm' });
            if (!isTrenChuyenLoaiKiem(phieu.LoaiKiemId)) {
                return res.status(400).json({ message: 'Phiếu không thuộc loại kiểm trên chuyền' });
            }
            if (!['TAO_MOI', 'DANG_KIEM', 'CHUA_KIEM'].includes(String(phieu.TrangThai || '').toUpperCase())) {
                return res.status(409).json({ message: 'Phiếu đã khóa, không thể bổ sung thông tin nguồn' });
            }
            const existingResult = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .query(`
                    SELECT FieldName, FieldValue FROM dbo.PhieuKiem_CustomFields
                    WHERE PhieuKiemId = @PhieuKiemId
                `);
            const existing = new Map(existingResult.recordset.map((row) => [row.FieldName, String(row.FieldValue || '').trim()]));
            for (const fieldName of TREN_CHUYEN_SOURCE_FIELDS) {
                if (!TREN_CHUYEN_EDITABLE_SOURCE_FIELDS.has(fieldName)
                    && existing.get(fieldName)
                    && incoming[fieldName] !== existing.get(fieldName)) {
                    return res.status(409).json({ message: `${fieldName} đã có dữ liệu và không được sửa` });
                }
            }
            const fieldsToSave = Object.fromEntries(
                TREN_CHUYEN_SOURCE_FIELDS
                    .filter((fieldName) => TREN_CHUYEN_EDITABLE_SOURCE_FIELDS.has(fieldName)
                        || (!existing.get(fieldName) && incoming[fieldName]))
                    .map((fieldName) => [fieldName, incoming[fieldName]])
            );
            if (Object.keys(fieldsToSave).length) {
                await upsertPhieuKiemCustomFields(pool, phieuKiemId, fieldsToSave);
            }
            res.json({ success: true, fields: { ...Object.fromEntries(existing), ...fieldsToSave } });
        } catch (err) {
            console.error('TrenChuyen source fields error:', err);
            res.status(500).json({ message: err.message || 'Không bổ sung được thông tin nguồn' });
        }
    }
);

/* =========================================================
   GET /phieu-kiem/:id
   Permission : XEM_PHIEU_KIEM
========================================================= */
router.get(
    '/:id',
    authenticateToken,
    authorize('XEM_PHIEU_KIEM'),
    async (req, res) => {
        const { id } = req.params;

        try {
            const pool = await poolPromise;

            // 1. Lấy thông tin cơ bản để xác định loại kiểm
            const basicInfo = await pool.request()
                .input('Id', sql.Int, id)
                .query('SELECT LoaiKiemId FROM PHIEU_KIEM WHERE Id = @Id');

            if (basicInfo.recordset.length === 0) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu kiểm' });
            }

            const loaiKiemId = basicInfo.recordset[0].LoaiKiemId;

            // 2. Nếu là Sản Xuất Bổ Trợ (LoaiKiemId = 4)
            if (loaiKiemId === 4) {
                const result = await pool.request()
                    .input('PhieuKiemId', sql.Int, id)
                    .execute('sp_PhieuKiem_GetDetail_SXBT');

                const phieu = result.recordsets[0][0] || null;
                await attachProductImageToPhieu(pool, phieu);
                await attachPhieuQuantity(pool, phieu);
                const { source: sxbtSource, sources: sxbtSources = [] } = await attachSxbtSourceInfo(pool, phieu);
                let dynamicFields = [];
                if (phieu && phieu.DynamicFieldsJSON) {
                    try {
                        dynamicFields = JSON.parse(phieu.DynamicFieldsJSON);
                    } catch (e) { }
                    delete phieu.DynamicFieldsJSON;
                }
                dynamicFields = await enrichSxbtSignatureFields(pool, dynamicFields, phieu);

                const sourceByLinkId = new Map(
                    sxbtSources.map((source) => [Number(source.SxbtPlanLinkId), source])
                );
                const itemLinkResult = await pool.request()
                    .input('PhieuKiemId', sql.Int, id)
                    .query(`
                        SELECT item.Id AS BtpItemId, item.SxbtPlanLinkId
                        FROM dbo.PHIEU_KIEM_BTP_ITEM item
                        WHERE item.PhieuKiemId = @PhieuKiemId
                    `);
                const linkIdByItemId = new Map(
                    (itemLinkResult.recordset || []).map((row) => [Number(row.BtpItemId), Number(row.SxbtPlanLinkId)])
                );
                const btpItems = attachBtpLotRows(result.recordsets[1] || [], result.recordsets[4] || [])
                    .map((item) => {
                        const sxbtPlanLinkId = Number(item.SxbtPlanLinkId) || linkIdByItemId.get(Number(item.Id));
                        const source = sourceByLinkId.get(sxbtPlanLinkId);
                        return source ? {
                            ...item,
                            SxbtPlanLinkId: sxbtPlanLinkId,
                            KeHoachNhapId: source.KeHoachNhapId,
                            SourceID_KeHoachSanXuat: source.ID_KeHoachSanXuat || item.SourceID_KeHoachSanXuat
                        } : item;
                    });
                const splitResult = await pool.request()
                    .input('PhieuKiemId', sql.Int, id)
                    .query(`
                        IF OBJECT_ID(N'dbo.PHIEU_KIEM_SXBT_SPLIT', N'U') IS NOT NULL
                        BEGIN
                            SELECT TOP 1
                                split.Id AS SplitId,
                                split.OriginalPhieuKiemId,
                                original.SoPhieu AS OriginalSoPhieu,
                                split.RejectedPhieuKiemId,
                                rejected.SoPhieu AS RejectedSoPhieu,
                                split.PerformedBy,
                                split.CreatedAt,
                                CASE
                                    WHEN split.OriginalPhieuKiemId = @PhieuKiemId THEN N'PASSED'
                                    ELSE N'REJECTED'
                                END AS CurrentRole
                            FROM dbo.PHIEU_KIEM_SXBT_SPLIT split
                            INNER JOIN dbo.PHIEU_KIEM original ON original.Id = split.OriginalPhieuKiemId
                            INNER JOIN dbo.PHIEU_KIEM rejected ON rejected.Id = split.RejectedPhieuKiemId
                            WHERE split.OriginalPhieuKiemId = @PhieuKiemId
                               OR split.RejectedPhieuKiemId = @PhieuKiemId;
                        END
                    `);

                return res.json({
                    phieu,
                    btpItems,
                    summary: result.recordsets[2][0] || null,
                    defects: result.recordsets[3] || [],
                    dynamicFields,
                    splitInfo: splitResult.recordset?.[0] || null,
                    sxbtSourceType: sxbtSource?.SourceType || null,
                    sxbtSource,
                    sxbtSources,
                    phieuNhapBtpId: sxbtSource?.PhieuNhapBtpId || null,
                    capabilities: inspectionCapabilities(req, phieu)
                });
            }

            if (isCuoiChuyenLoaiKiem(loaiKiemId)) {
                const result = await pool.request()
                    .input('PhieuKiemId', sql.Int, id)
                    .execute('sp_PhieuKiem_GetDetail_CuoiChuyen');

                const phieu = result.recordsets?.[0]?.[0] || null;
                await attachProductImageToPhieu(pool, phieu);
                await attachPhieuQuantity(pool, phieu);
                let dynamicFields = [];
                if (phieu && phieu.DynamicFieldsJSON) {
                    try {
                        dynamicFields = JSON.parse(phieu.DynamicFieldsJSON);
                    } catch (e) {
                        console.error("Lỗi parse DynamicFieldsJSON CuoiChuyen:", e);
                    }
                    delete phieu.DynamicFieldsJSON;
                }
                const completedByUserId = Number(
                    dynamicFields.find((field) => field?.FieldName === CUOI_CHUYEN_COMPLETED_BY_FIELD)?.FieldValue || 0
                ) || null;
                if (completedByUserId) {
                    const completedByName = await getUserDisplayName(pool, completedByUserId);
                    const completedByNameField = dynamicFields.find((field) => field?.FieldName === CUOI_CHUYEN_COMPLETED_BY_NAME_FIELD);
                    if (completedByNameField) {
                        completedByNameField.FieldValue = completedByName || completedByNameField.FieldValue;
                    } else if (completedByName) {
                        dynamicFields.push({
                            FieldName: CUOI_CHUYEN_COMPLETED_BY_NAME_FIELD,
                            FieldValue: completedByName
                        });
                    }
                }

                const planRecords = result.recordsets?.[1] || [];
                const defectRecords = result.recordsets?.[2] || [];
                const summary = result.recordsets?.[3]?.[0] || null;
                let xacNhans = result.recordsets?.[4] || [];
                const actualQuantityResult = await pool.request()
                    .input('PhieuKiemId', sql.Int, Number(id))
                    .query(`
                        SELECT Id, SoLuongThucTe, MaDonHang, TenQuyTrinhSanXuat,
                            Lot, LenhXuatVatTu, SoLoiBuiBan, SoLoiConTrung
                        FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN
                        WHERE PhieuKiemId = @PhieuKiemId
                    `);
                const extraByPlan = new Map(
                    actualQuantityResult.recordset.map((row) => [Number(row.Id), row])
                );
                const defectExtraResult = await pool.request()
                    .input('PhieuKiemId', sql.Int, Number(id))
                    .query(`
                        SELECT defect.Id, defect.TenCongNhan
                        FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT defect
                        INNER JOIN dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN planRow ON planRow.Id = defect.PlanId
                        WHERE planRow.PhieuKiemId = @PhieuKiemId
                    `);
                const workerByDefectId = new Map(
                    defectExtraResult.recordset.map((row) => [Number(row.Id), row.TenCongNhan || ''])
                );

                const defectsByPlanId = {};
                defectRecords.forEach((record) => {
                    if (!defectsByPlanId[record.PlanId]) {
                        defectsByPlanId[record.PlanId] = [];
                    }

                    let defectImageUrls = [];
                    if (record.DefectImageUrls) {
                        try {
                            defectImageUrls = JSON.parse(record.DefectImageUrls);
                        } catch (e) {
                            defectImageUrls = [];
                        }
                    }
                    if (!Array.isArray(defectImageUrls)) {
                        defectImageUrls = [];
                    }

                    defectsByPlanId[record.PlanId].push({
                        Id: record.DefectRowId,
                        PlanId: record.PlanId,
                        DefectId: record.DefectId,
                        SoLuong: record.SoLuong,
                        SoLuongDatSauSua: record.SoLuongDatSauSua,
                        SoLuongKhongDatSauSua: record.SoLuongKhongDatSauSua,
                        GhiChu: record.DefectGhiChu || '',
                        SortOrder: record.DefectSortOrder || 0,
                        MaLoi: record.MaLoi,
                        TenLoi: record.TenLoi,
                        MoTa: record.MoTa,
                        DefectType: record.DefectType,
                        PhuongAnXuLy: record.PhuongAnXuLy,
                        ImageUrl: record.ImageUrl || null,
                        ImageUrls: defectImageUrls,
                        TenCongNhan: workerByDefectId.get(Number(record.DefectRowId)) || ''
                    });
                });

                const plans = planRecords.map((plan) => ({
                    ...applyQuantityFields({
                        ...plan,
                        ...(extraByPlan.get(Number(plan.Id)) || {}),
                        SoLuongThucTe: extraByPlan.get(Number(plan.Id))?.SoLuongThucTe ?? null
                    }, 'SoLuongKeHoach'),
                    Defects: [...(defectsByPlanId[plan.Id] || [])]
                        .sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0))
                }));
                const quantitySummary = plans.reduce((totals, plan) => ({
                    TongSoLuongKeHoach: totals.TongSoLuongKeHoach + Number(plan.SoLuongKeHoach || 0),
                    TongSoLuongThucTe: totals.TongSoLuongThucTe + Number(plan.SoLuongThucTe || 0),
                    SoKeHoachDaNhapThucTe: totals.SoKeHoachDaNhapThucTe + (plan.SoLuongThucTe == null ? 0 : 1),
                    TongSoLuongHieuLuc: totals.TongSoLuongHieuLuc + Number(plan.SoLuongHieuLuc || 0)
                }), {
                    TongSoLuongKeHoach: 0,
                    TongSoLuongThucTe: 0,
                    SoKeHoachDaNhapThucTe: 0,
                    TongSoLuongHieuLuc: 0
                });
                quantitySummary.ChenhLechSoLuong = quantitySummary.SoKeHoachDaNhapThucTe
                    ? quantitySummary.TongSoLuongHieuLuc - quantitySummary.TongSoLuongKeHoach
                    : null;

                ({ dynamicFields, xacNhans } = await enrichInspectionSignatures(pool, dynamicFields, xacNhans));
                return res.json({
                    phieu,
                    plans,
                    summary: { ...(summary || {}), ...quantitySummary },
                    dynamicFields,
                    xacNhans,
                    capabilities: inspectionCapabilities(req, phieu)
                });
            }

            if (isTrenChuyenLoaiKiem(loaiKiemId)) {
                const result = await pool.request()
                    .input('PhieuKiemId', sql.Int, id)
                    .execute('sp_PhieuKiem_GetDetail_TrenChuyen');

                const phieu = result.recordsets?.[0]?.[0] || null;
                await attachProductImageToPhieu(pool, phieu);
                await attachPhieuQuantity(pool, phieu);
                let dynamicFields = [];
                if (phieu && phieu.DynamicFieldsJSON) {
                    try {
                        dynamicFields = JSON.parse(phieu.DynamicFieldsJSON);
                    } catch (e) {
                        console.error("Lỗi parse DynamicFieldsJSON TrenChuyen:", e);
                    }
                    delete phieu.DynamicFieldsJSON;
                }

                const slotRecords = result.recordsets?.[1] || [];
                const entryDefectRecords = result.recordsets?.[2] || [];
                const summary = result.recordsets?.[3]?.[0] || null;
                let xacNhans = result.recordsets?.[4] || [];
                const entryExtraResult = await pool.request()
                    .input('PhieuKiemId', sql.Int, Number(id))
                    .query(`
                        SELECT entryRow.Id, entryRow.SoLuongKiem,
                            entryRow.SoLoiBuiBan, entryRow.SoLoiConTrung
                        FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY entryRow
                        INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT slotRow ON slotRow.Id = entryRow.SlotId
                        WHERE slotRow.PhieuKiemId = @PhieuKiemId
                    `);
                const extraByEntry = new Map(
                    entryExtraResult.recordset.map((row) => [Number(row.Id), row])
                );

                const entriesBySlotId = {};

                entryDefectRecords.forEach((record) => {
                    if (!entriesBySlotId[record.SlotId]) {
                        entriesBySlotId[record.SlotId] = {};
                    }

                    if (!entriesBySlotId[record.SlotId][record.EntryId]) {
                        entriesBySlotId[record.SlotId][record.EntryId] = {
                            Id: record.EntryId,
                            SlotId: record.SlotId,
                            CongDoan: record.CongDoan,
                            TenCongNhanGayLoi: record.TenCongNhanGayLoi || '',
                            NguoiGhiNhanId: record.NguoiGhiNhanId || null,
                            TenNguoiGhiNhan: record.TenNguoiGhiNhan || '',
                            GhiChu: record.EntryGhiChu || '',
                            SortOrder: record.EntrySortOrder || 0,
                            CreatedAt: record.EntryCreatedAt || null,
                            UpdatedAt: record.EntryUpdatedAt || null,
                            SoLuongKiem: extraByEntry.get(Number(record.EntryId))?.SoLuongKiem ?? null,
                            SoLoiBuiBan: Number(extraByEntry.get(Number(record.EntryId))?.SoLoiBuiBan || 0),
                            SoLoiConTrung: Number(extraByEntry.get(Number(record.EntryId))?.SoLoiConTrung || 0),
                            Defects: []
                        };
                    }

                    if (record.DefectId) {
                        let defectImageUrls = [];
                        if (record.DefectImageUrls) {
                            try {
                                defectImageUrls = JSON.parse(record.DefectImageUrls);
                            } catch (e) {
                                defectImageUrls = [];
                            }
                        }
                        if (!Array.isArray(defectImageUrls)) {
                            defectImageUrls = [];
                        }

                        entriesBySlotId[record.SlotId][record.EntryId].Defects.push({
                            Id: record.DefectRowId,
                            DefectId: record.DefectId,
                            SoLuong: record.SoLuong,
                            SoLuongDatSauSua: record.SoLuongDatSauSua,
                            SoLuongKhongDatSauSua: record.SoLuongKhongDatSauSua,
                            GhiChu: record.DefectGhiChu || '',
                            SortOrder: record.DefectSortOrder || 0,
                            MaLoi: record.MaLoi,
                            TenLoi: record.TenLoi,
                            MoTa: record.MoTa,
                            DefectType: record.DefectType,
                            PhuongAnXuLy: record.PhuongAnXuLy,
                            ImageUrl: record.ImageUrl || null,
                            ImageUrls: defectImageUrls
                        });
                    }
                });

                const slots = slotRecords.map((slot) => ({
                    Id: slot.Id,
                    PhieuKiemId: slot.PhieuKiemId,
                    GioKiem: slot.GioKiem,
                    SortOrder: slot.SortOrder,
                    CreatedAt: slot.CreatedAt || null,
                    UpdatedAt: slot.UpdatedAt || null,
                    Entries: Object.values(entriesBySlotId[slot.Id] || {})
                        .sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0))
                        .map((entry) => ({
                            ...entry,
                            Defects: [...entry.Defects].sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0))
                        }))
                }));

                ({ dynamicFields, xacNhans } = await enrichInspectionSignatures(pool, dynamicFields, xacNhans));
                return res.json({
                    phieu,
                    slots,
                    summary,
                    dynamicFields,
                    xacNhans,
                    capabilities: inspectionCapabilities(req, phieu)
                });
            }

            // 3. Mặc định cho các loại kiểm khác (1, 2, 3...)
            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, id)
                .execute('sp_PhieuKiem_GetDetail');

            const phieu = result.recordsets[0][0] || null;
            await attachProductImageToPhieu(pool, phieu);
            await attachPhieuQuantity(pool, phieu);
            let dynamicFields = [];
            if (phieu && phieu.DynamicFieldsJSON) {
                try {
                    dynamicFields = JSON.parse(phieu.DynamicFieldsJSON);
                } catch (e) {
                    console.error("Lỗi parse DynamicFieldsJSON:", e);
                }
                // Xóa trường string thô để API trả về nhẹ và sạch sẽ
                delete phieu.DynamicFieldsJSON;
            }
            applyClosingScheduleSnapshot(phieu, dynamicFields);

            const sections = result.recordsets[1] || [];
            // const checkItems = result.recordsets[2] || [];
            const defects = result.recordsets[3] || [];

            const rows = result.recordsets[2];
            const map = {};

            rows.forEach(r => {

                if (!map[r.Id]) {
                    map[r.Id] = { ...r, Defects: [] };
                }
                if (r.DefectId) {
                    map[r.Id].Defects.push({
                        DefectId: r.DefectId,
                        MaLoi: r.MaLoi,
                        TenLoi: r.TenLoi,
                        MoTa: r.MoTa,
                        GhiChu: r.GhiChu,
                        SoLuong: r.SoLuong,
                        DefectType: r.DefectType,
                        ImageUrls: r.ImageUrls ? JSON.parse(r.ImageUrls) : []
                    });
                }

            });

            const checkItems = Object.values(map);
            const confirmationResult = await pool.request()
                .input('PhieuKiemId', sql.Int, Number(id))
                .query(`
                    SELECT xn.Id, xn.PhieuKiemId, xn.NguoiXacNhanId, xn.VaiTro,
                        xn.TrangThai, xn.NoiDung, xn.ThoiGian,
                        COALESCE(NULLIF(u.FullName, N''), u.Username) AS TenNguoiXacNhan,
                        u.BoPhanId
                    FROM dbo.PHIEU_KIEM_XAC_NHAN xn
                    LEFT JOIN dbo.USERS u ON u.Id=xn.NguoiXacNhanId
                    WHERE xn.PhieuKiemId=@PhieuKiemId
                    ORDER BY xn.ThoiGian, xn.Id
                `);
            const xacNhans = await attachSignatureDataUrls(pool, confirmationResult.recordset || [], 'NguoiXacNhanId');
            res.json({
                phieu,
                sections,
                checkItems,
                defects,
                dynamicFields,
                xacNhans,
                capabilities: inspectionCapabilities(req, phieu)
            });

        } catch (err) {
            console.error('GetDetail error:', err);
            res.status(500).json({
                message: 'Lỗi tải chi tiết phiếu kiểm'
            });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/create
   Role       : TO_TRUONG_KCS
   Permission : PHAN_BO_KIEM
========================================================= */

router.post(
    '/create',
    authenticateToken,
    authorize('PHAN_BO_KIEM'),
    async (req, res) => {
        const {
            sanPhamId,
            loaiKiemId,
            lot,
            doiTuong,
            nguoiKiemId,
            sourceId,
            sourceId_LCD, // Thêm field cho lịch đóng cont (GUID)
            soLuong,
            Ngay_Giao,
            mucDoKiemTra,
            cuoiChuyenPlans,
            ngayKiem
        } = req.body;
        const normalizedCuoiChuyenPlans = isCuoiChuyenLoaiKiem(loaiKiemId)
            ? normalizeCuoiChuyenPlans(cuoiChuyenPlans || [])
            : [];
        const isTrenChuyen = isTrenChuyenLoaiKiem(loaiKiemId);
        const hasNgayKiem = ngayKiem !== null && ngayKiem !== undefined && ngayKiem !== '';
        const normalizedNgayKiem = isTrenChuyen ? normalizeDateOnly(ngayKiem) : null;
        const requestedTrenChuyenSnapshot = isTrenChuyen && req.body?.snapshotFields
            ? req.body.snapshotFields
            : {};
        const snapshotNgayKeHoach = normalizeDateOnly(requestedTrenChuyenSnapshot.TrenChuyen_NgayKeHoach);
        const snapshotSourceId = Number(requestedTrenChuyenSnapshot.TrenChuyen_IDKeHoachSanXuat || 0) || null;
        const snapshotNangSuat = requestedTrenChuyenSnapshot.TrenChuyen_NangSuatDuKien;

        if (!isTrenChuyen && hasNgayKiem) {
            return res.status(400).json({
                message: 'Ngày kiểm chỉ áp dụng cho phiếu kiểm trên chuyền'
            });
        }

        if (isTrenChuyen && !normalizedNgayKiem) {
            return res.status(400).json({
                message: 'Ngày kiểm trên chuyền không hợp lệ'
            });
        }

        if (isTrenChuyen && snapshotNgayKeHoach && snapshotNgayKeHoach !== normalizedNgayKiem) {
            return res.status(400).json({
                message: 'Ngày kế hoạch trong dữ liệu chụp không khớp ngày kiểm đã chọn'
            });
        }

        if (isTrenChuyen && snapshotSourceId && snapshotSourceId !== Number(sourceId)) {
            return res.status(400).json({
                message: 'Kế hoạch trong dữ liệu chụp không khớp kế hoạch đã chọn'
            });
        }

        if (isTrenChuyen
            && snapshotNangSuat !== null
            && snapshotNangSuat !== undefined
            && snapshotNangSuat !== ''
            && Number(snapshotNangSuat) !== Number(soLuong)) {
            return res.status(400).json({
                message: 'Năng suất dự kiến trong dữ liệu chụp không khớp số lượng của kế hoạch đã chọn'
            });
        }

        const trenChuyenSnapshot = isTrenChuyen
            ? {
                ...requestedTrenChuyenSnapshot,
                TrenChuyen_NgayKeHoach: normalizedNgayKiem,
                TrenChuyen_IDKeHoachSanXuat: sourceId,
                TrenChuyen_NangSuatDuKien: soLuong
            }
            : null;

        // Bắt buộc phải có 1 trong 2 loại source
        if (!sanPhamId || !loaiKiemId || !nguoiKiemId || !soLuong || (!sourceId && !sourceId_LCD)) {
            return res.status(400).json({
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        if (isCuoiChuyenLoaiKiem(loaiKiemId) && normalizedCuoiChuyenPlans.length === 0) {
            return res.status(400).json({
                message: 'Phiếu kiểm cuối chuyền cần ít nhất một kế hoạch sản xuất'
            });
        }

        const closingScheduleSnapshot = sourceId_LCD ? (req.body?.snapshotFields || {}) : null;
        const rawPackage = closingScheduleSnapshot?.DongCont_Package;
        const closingSchedulePackage = rawPackage === '' || rawPackage === null || rawPackage === undefined
            ? null
            : Number(rawPackage);
        if (sourceId_LCD && closingSchedulePackage !== null
            && (!Number.isInteger(closingSchedulePackage) || closingSchedulePackage < 0)) {
            return res.status(400).json({ message: 'Số Package của lịch đóng cont không hợp lệ' });
        }

        try {
            const pool = await poolPromise;
            let effectiveNgayKiem = null;

            if (isTrenChuyen) {
                effectiveNgayKiem = normalizedNgayKiem;
            }

            if (isCuoiChuyenLoaiKiem(loaiKiemId)) {
                const selectedPlanDays = normalizedCuoiChuyenPlans.map((plan) => ({
                    idKeHoachSanXuat: Number(plan.idKeHoachSanXuat) || null,
                    ngayKeHoach: normalizeDateOnly(plan.ngayKeHoach)
                }));

                if (selectedPlanDays.some((plan) => !plan.idKeHoachSanXuat || !plan.ngayKeHoach)) {
                    return res.status(400).json({
                        message: 'Kế hoạch cuối chuyền cần đầy đủ ID kế hoạch và ngày kế hoạch'
                    });
                }

                const uniquePlanDays = new Set(selectedPlanDays.map((plan) =>
                    `${plan.idKeHoachSanXuat}|${plan.ngayKeHoach}`
                ));
                if (uniquePlanDays.size !== selectedPlanDays.length) {
                    return res.status(400).json({
                        message: 'Danh sách có kế hoạch cuối chuyền bị trùng trong cùng ngày'
                    });
                }

                const duplicateResult = await pool.request()
                    .input('LoaiKiemId', sql.Int, loaiKiemId)
                    .input('PlanDaysJson', sql.NVarChar(sql.MAX), JSON.stringify(selectedPlanDays))
                    .query(`
                        IF OBJECT_ID(N'dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN', N'U') IS NOT NULL
                        BEGIN
                            SELECT TOP 1
                                p.ID_KeHoachSanXuat,
                                CONVERT(char(10), p.NgayKeHoach, 23) AS NgayKeHoach
                            FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN p
                            INNER JOIN dbo.PHIEU_KIEM pk ON pk.Id = p.PhieuKiemId
                            INNER JOIN OPENJSON(@PlanDaysJson) WITH (
                                ID_KeHoachSanXuat INT '$.idKeHoachSanXuat',
                                NgayKeHoach DATE '$.ngayKeHoach'
                            ) j ON j.ID_KeHoachSanXuat = p.ID_KeHoachSanXuat
                                AND j.NgayKeHoach = p.NgayKeHoach
                            WHERE pk.LoaiKiemId = @LoaiKiemId
                              AND ISNULL(pk.TrangThai, N'') <> N'DA_HUY';
                        END
                    `);

                if (duplicateResult.recordset?.length > 0) {
                    return res.status(409).json({
                        message: `Kế hoạch ${duplicateResult.recordset[0].ID_KeHoachSanXuat} đã có phiếu kiểm cuối chuyền ngày ${duplicateResult.recordset[0].NgayKeHoach}`
                    });
                }
            }

            const result = await pool.request()
                .input('SanPhamId', sql.Int, sanPhamId)
                .input('LoaiKiemId', sql.Int, loaiKiemId)
                .input('Lot', sql.NVarChar, lot)
                .input('DoiTuong', sql.NVarChar, doiTuong)
                .input('NguoiKiemId', sql.Int, nguoiKiemId)
                .input('SoLuong', sql.Int, soLuong)
                .input('NguoiLapId', sql.Int, req.user.userId)
                // Truyền null nếu không có giá trị để Stored Procedure xử lý linh hoạt
                .input('SourceId', sql.Int, sourceId || null)
                .input('SourceId_LCD', sql.UniqueIdentifier, sourceId_LCD || null)
                .input('Ngay_Giao', sql.Date, Ngay_Giao || null)
                .input('MucDoKiemTra', sql.NVarChar, mucDoKiemTra || null)
                // KIEM_TREN_CHUYEN chi tao cho ngay hien tai. Lay ngay tu cung
                // SQL Server de khong bi lech ngay khi Date duoc serialize qua UTC.
                .input('NgayKiem', sql.Date, effectiveNgayKiem)
                .execute('sp_PhieuKiem_Create');

            const newPhieuId = result.recordset[0].Id;
            const soPhieu = result.recordset[0].SoPhieu;

            if (sourceId_LCD) {
                const invoiceNo = String(closingScheduleSnapshot.DongCont_InvoiceNo || '').trim();
                const packingMethod = String(closingScheduleSnapshot.DongCont_PackingMethod || '').trim();
                const khachHang = getClosingScheduleCustomer({ invoiceNo, packingMethod });

                await upsertPhieuKiemCustomFields(pool, newPhieuId, {
                    DongCont_KhachHang: khachHang || '',
                    KhachHang: khachHang || '',
                    DongCont_InvoiceNo: invoiceNo,
                    DongCont_PackingMethod: packingMethod,
                    DongCont_WarehouseId: String(closingScheduleSnapshot.DongCont_WarehouseId || '').trim(),
                    DongCont_Package: closingSchedulePackage ?? ''
                });
            }

            if (isTrenChuyen && trenChuyenSnapshot) {
                await upsertPhieuKiemCustomFields(pool, newPhieuId, trenChuyenSnapshot);
            }

            if (isTrenChuyenLoaiKiem(loaiKiemId) || isCuoiChuyenLoaiKiem(loaiKiemId)) {
                await upsertPhieuKiemCustomFields(pool, newPhieuId, {
                    [UNIFIED_PRINT_DATA_VERSION_FIELD]: UNIFIED_PRINT_DATA_VERSION
                });
            }

            if (isCuoiChuyenLoaiKiem(loaiKiemId)) {
                await pool.request()
                    .input('PhieuKiemId', sql.Int, newPhieuId)
                    .input('PlansJson', sql.NVarChar(sql.MAX), JSON.stringify(normalizedCuoiChuyenPlans))
                    .query(`
                        INSERT INTO dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN (
                            PhieuKiemId,
                            ID_KeHoachSanXuat,
                            SanPhamId,
                            MaSanPham,
                            TenSanPham,
                            TenDonVi,
                            TenBoPhan,
                            NgayKeHoach,
                            SoLuongKeHoach,
                            NangSuatDuKien,
                            DaSanXuat,
                            MaDonHang,
                            TenQuyTrinhSanXuat,
                            Lot,
                            LenhXuatVatTu,
                            SoLoiBuiBan,
                            SoLoiConTrung,
                            SortOrder
                        )
                        SELECT
                            @PhieuKiemId,
                            j.ID_KeHoachSanXuat,
                            j.SanPhamId,
                            NULLIF(LTRIM(RTRIM(j.MaSanPham)), ''),
                            NULLIF(LTRIM(RTRIM(j.TenSanPham)), ''),
                            NULLIF(LTRIM(RTRIM(j.TenDonVi)), ''),
                            NULLIF(LTRIM(RTRIM(j.TenBoPhan)), ''),
                            TRY_CONVERT(DATE, j.NgayKeHoach),
                            j.SoLuongKeHoach,
                            j.NangSuatDuKien,
                            j.DaSanXuat,
                            NULLIF(LTRIM(RTRIM(j.MaDonHang)), ''),
                            NULLIF(LTRIM(RTRIM(j.TenQuyTrinhSanXuat)), ''),
                            NULLIF(LTRIM(RTRIM(j.Lot)), ''),
                            NULLIF(LTRIM(RTRIM(j.LenhXuatVatTu)), ''),
                            ISNULL(j.SoLoiBuiBan, 0),
                            ISNULL(j.SoLoiConTrung, 0),
                            j.SortOrder
                        FROM OPENJSON(@PlansJson)
                        WITH (
                            ID_KeHoachSanXuat INT '$.idKeHoachSanXuat',
                            SanPhamId INT '$.sanPhamId',
                            MaSanPham NVARCHAR(100) '$.maSanPham',
                            TenSanPham NVARCHAR(255) '$.tenSanPham',
                            TenDonVi NVARCHAR(255) '$.tenDonVi',
                            TenBoPhan NVARCHAR(255) '$.tenBoPhan',
                            NgayKeHoach NVARCHAR(30) '$.ngayKeHoach',
                            SoLuongKeHoach INT '$.soLuongKeHoach',
                            NangSuatDuKien INT '$.nangSuatDuKien',
                            DaSanXuat INT '$.daSanXuat',
                            MaDonHang NVARCHAR(200) '$.maDonHang',
                            TenQuyTrinhSanXuat NVARCHAR(255) '$.tenQuyTrinhSanXuat',
                            Lot NVARCHAR(200) '$.lot',
                            LenhXuatVatTu NVARCHAR(200) '$.lenhXuatVatTu',
                            SoLoiBuiBan INT '$.soLoiBuiBan',
                            SoLoiConTrung INT '$.soLoiConTrung',
                            SortOrder INT '$.sortOrder'
                        ) j;
                    `);
            }

            // ---- LOGIC THÔNG BÁO ----
            const title = 'Bạn có phiếu kiểm mới! 📋';
            const message = `Tổ trưởng vừa phân công cho bạn phiếu kiểm ${soPhieu}.`;

            // A. Lưu vào Database (Bảng NOTIFICATIONS)
            try {
                await pool.request()
                    .input('UserId', sql.Int, nguoiKiemId)
                    .input('Title', sql.NVarChar, title)
                    .input('Message', sql.NVarChar, message)
                    .input('Type', sql.VarChar, 'NEW_PHIEU')
                    .input('ReferenceId', sql.Int, newPhieuId)
                    .query('INSERT INTO NOTIFICATIONS (UserId, Title, Message, Type, ReferenceId) VALUES (@UserId, @Title, @Message, @Type, @ReferenceId)');
            } catch (notificationError) {
                console.error('CreateSXBT notification error:', notificationError);
            }

            // B. Lấy Tokens và gửi Expo Push Notification
            const userTokensRes = await pool.request()
                .input('NguoiKiemId', sql.Int, nguoiKiemId)
                .query(`
                SELECT t.ExpoPushToken, 
                (SELECT COUNT(*) FROM NOTIFICATIONS WHERE UserId = @NguoiKiemId AND IsRead = 0) as UnreadCount
                FROM USER_PUSH_TOKENS t WHERE t.UserId = @NguoiKiemId
            `);

            const tokens = userTokensRes.recordset;
            if (tokens.length > 0) {
                const unreadCount = tokens[0].UnreadCount;
                let pushMessages = [];

                for (let row of tokens) {
                    if (Expo.isExpoPushToken(row.ExpoPushToken)) {
                        pushMessages.push({
                            to: row.ExpoPushToken,
                            sound: 'default',
                            title: title,
                            body: message,
                            badge: unreadCount,
                            data: { type: 'NEW_PHIEU', referenceId: newPhieuId },
                        });
                    }
                }

                let chunks = expo.chunkPushNotifications(pushMessages);
                for (let chunk of chunks) {
                    await expo.sendPushNotificationsAsync(chunk).catch(console.error);
                }
            }

            res.json({
                success: true,
                phieuKiemId: result.recordset[0].Id,
                soPhieu: result.recordset[0].SoPhieu
            });

        } catch (err) {
            console.error('CreatePhieuKiem error:', err);
            const sqlMessage = err?.originalError?.info?.message
                || err?.precedingErrors?.find((item) => item?.message)?.message
                || err?.message;
            const isDailyPlanConflict = isTrenChuyen
                && /Kế hoạch đã có phiếu kiểm trên chuyền ngày/i.test(sqlMessage || '');
            const isInvalidTrenChuyenDate = isTrenChuyen
                && /Ngày kiểm trên chuyền chỉ được trong khoảng|Kế hoạch không có lịch sản xuất trong ngày kiểm/i.test(sqlMessage || '');
            const isCuoiChuyenDailyConflict = isCuoiChuyenLoaiKiem(loaiKiemId)
                && [2601, 2627].includes(Number(err?.number || err?.originalError?.info?.number));
            const responseStatus = isDailyPlanConflict || isCuoiChuyenDailyConflict
                ? 409
                : isInvalidTrenChuyenDate
                    ? 400
                    : 500;
            res.status(responseStatus).json({
                message: isDailyPlanConflict
                    ? sqlMessage
                    : isInvalidTrenChuyenDate
                        ? sqlMessage
                        : isCuoiChuyenDailyConflict
                            ? 'Kế hoạch đã có phiếu kiểm cuối chuyền trong ngày này'
                            : 'Tạo phiếu kiểm thất bại'
            });
        }
    }
);

router.post(
    '/tren-chuyen/save',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { phieuKiemId, slots } = req.body;
        const userId = req.user?.id || req.user?.userId;

        if (!phieuKiemId || !Array.isArray(slots)) {
            return res.status(400).json({ message: 'Thiếu dữ liệu lưu phiếu trên chuyền' });
        }

        try {
            const normalizedSlots = normalizeTrenChuyenSlots(slots);
            const invalidEntry = normalizedSlots.flatMap((slot) => slot.entries).find((entry) =>
                Number.isNaN(entry.soLuongKiem)
                || !Number.isInteger(entry.soLoiBuiBan) || entry.soLoiBuiBan < 0
                || !Number.isInteger(entry.soLoiConTrung) || entry.soLoiConTrung < 0
            );
            if (invalidEntry) {
                return res.status(400).json({ message: 'Số lượng kiểm và lỗi đặc biệt phải là số nguyên không âm' });
            }

            const pool = await poolPromise;
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                await new sql.Request(transaction)
                    .input('PhieuKiemId', sql.Int, phieuKiemId)
                    .input('UserId', sql.Int, userId)
                    .input('SlotsJson', sql.NVarChar(sql.MAX), JSON.stringify(normalizedSlots))
                    .execute('sp_PhieuKiem_TrenChuyen_SaveEntries');

                const savedEntries = await new sql.Request(transaction)
                    .input('PhieuKiemId', sql.Int, Number(phieuKiemId))
                    .query(`
                        SELECT entryRow.Id, entryRow.SortOrder, slotRow.GioKiem
                        FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY entryRow
                        INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT slotRow ON slotRow.Id = entryRow.SlotId
                        WHERE slotRow.PhieuKiemId = @PhieuKiemId
                    `);
                const entryByKey = new Map(savedEntries.recordset.map((row) => [
                    `${String(row.GioKiem).trim()}|${Number(row.SortOrder)}`,
                    Number(row.Id)
                ]));
                for (const slot of normalizedSlots) {
                    for (const entry of slot.entries) {
                        const entryId = entryByKey.get(`${slot.gioKiem}|${Number(entry.sortOrder)}`);
                        if (!entryId) throw new Error(`Không đối chiếu được dòng kiểm ${slot.gioKiem}/${entry.sortOrder}`);
                        await new sql.Request(transaction)
                            .input('EntryId', sql.Int, entryId)
                            .input('SoLuongKiem', sql.Int, entry.soLuongKiem)
                            .input('SoLoiBuiBan', sql.Int, entry.soLoiBuiBan)
                            .input('SoLoiConTrung', sql.Int, entry.soLoiConTrung)
                            .query(`
                                UPDATE dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY
                                SET SoLuongKiem = @SoLuongKiem,
                                    SoLoiBuiBan = @SoLoiBuiBan,
                                    SoLoiConTrung = @SoLoiConTrung
                                WHERE Id = @EntryId
                            `);
                    }
                }

                await new sql.Request(transaction)
                    .input('PhieuKiemId', sql.Int, phieuKiemId)
                    .query(`
                        UPDATE dbo.PHIEU_KIEM
                        SET TrangThai = CASE WHEN TrangThai = 'TAO_MOI' THEN 'DANG_KIEM' ELSE TrangThai END
                        WHERE Id = @PhieuKiemId;
                    `);
                await transaction.commit();
            } catch (error) {
                await transaction.rollback();
                throw error;
            }

            res.json({ success: true });
        } catch (err) {
            console.error('TrenChuyen save error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Lưu phiếu kiểm trên chuyền thất bại'
            });
        }
    }
);

router.post(
    '/cuoi-chuyen/save',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { phieuKiemId, plans } = req.body;
        const userId = req.user?.id || req.user?.userId;

        if (!phieuKiemId || !Array.isArray(plans)) {
            return res.status(400).json({ message: 'Thiếu dữ liệu lưu phiếu cuối chuyền' });
        }

        try {
            const normalizedPlans = normalizeCuoiChuyenPlans(plans);
            if (normalizedPlans.some((plan) =>
                Number.isNaN(plan.soLuongThucTe)
                || !Number.isInteger(plan.soLoiBuiBan) || plan.soLoiBuiBan < 0
                || !Number.isInteger(plan.soLoiConTrung) || plan.soLoiConTrung < 0
            )) {
                return res.status(400).json({ message: 'Số lượng thực tế và lỗi đặc biệt phải là số nguyên không âm hoặc để trống' });
            }

            const pool = await poolPromise;
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                await new sql.Request(transaction)
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userId)
                .input('PlansJson', sql.NVarChar(sql.MAX), JSON.stringify(normalizedPlans))
                .execute('sp_PhieuKiem_CuoiChuyen_SaveDefects');

                for (const plan of normalizedPlans.filter((item) => item.planId)) {
                    await new sql.Request(transaction)
                        .input('PhieuKiemId', sql.Int, Number(phieuKiemId))
                        .input('PlanId', sql.Int, plan.planId)
                        .input('SoLuongThucTe', sql.Int, plan.soLuongThucTe)
                        .input('MaDonHang', sql.NVarChar(200), plan.maDonHang || null)
                        .input('TenQuyTrinhSanXuat', sql.NVarChar(255), plan.tenQuyTrinhSanXuat || null)
                        .input('Lot', sql.NVarChar(200), plan.lot || null)
                        .input('LenhXuatVatTu', sql.NVarChar(200), plan.lenhXuatVatTu || null)
                        .input('SoLoiBuiBan', sql.Int, plan.soLoiBuiBan)
                        .input('SoLoiConTrung', sql.Int, plan.soLoiConTrung)
                        .query(`
                            UPDATE dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN
                            SET SoLuongThucTe = @SoLuongThucTe,
                                MaDonHang = CASE WHEN NULLIF(LTRIM(RTRIM(MaDonHang)), '') IS NULL THEN @MaDonHang ELSE MaDonHang END,
                                TenQuyTrinhSanXuat = CASE WHEN NULLIF(LTRIM(RTRIM(TenQuyTrinhSanXuat)), '') IS NULL THEN @TenQuyTrinhSanXuat ELSE TenQuyTrinhSanXuat END,
                                Lot = @Lot,
                                LenhXuatVatTu = @LenhXuatVatTu,
                                SoLoiBuiBan = @SoLoiBuiBan,
                                SoLoiConTrung = @SoLoiConTrung
                            WHERE Id = @PlanId AND PhieuKiemId = @PhieuKiemId
                        `);
                    for (const defect of plan.defects) {
                        await new sql.Request(transaction)
                            .input('PlanId', sql.Int, plan.planId)
                            .input('DefectId', sql.Int, defect.defectId)
                            .input('TenCongNhan', sql.NVarChar(255), defect.tenCongNhan || null)
                            .query(`
                                UPDATE dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT
                                SET TenCongNhan = @TenCongNhan
                                WHERE PlanId = @PlanId AND DefectId = @DefectId
                            `);
                    }
                }

                await new sql.Request(transaction)
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .query(`
                    UPDATE dbo.PHIEU_KIEM
                    SET TrangThai = CASE WHEN TrangThai = 'TAO_MOI' THEN 'DANG_KIEM' ELSE TrangThai END
                    WHERE Id = @PhieuKiemId;
                `);
                await transaction.commit();
            } catch (error) {
                await transaction.rollback();
                throw error;
            }

            res.json({ success: true });
        } catch (err) {
            console.error('CuoiChuyen save error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Lưu phiếu kiểm cuối chuyền thất bại'
            });
        }
    }
);

router.post(
    '/cuoi-chuyen/complete',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { phieuKiemId, ketLuan } = req.body;
        const userId = req.user?.id || req.user?.userId;
        const boPhanId = req.user?.boPhanId;
        const completedByNameFallback = req.user?.fullName || req.user?.username || '';

        if (!phieuKiemId || !['DAT', 'KHONG_DAT'].includes(String(ketLuan || '').toUpperCase())) {
            return res.status(400).json({ message: 'Thiếu dữ liệu hoàn tất hoặc kết luận không hợp lệ' });
        }

        if (!boPhanId) {
            return res.status(400).json({ message: 'Không xác định được bộ phận duyệt của người hoàn tất phiếu' });
        }

        try {
            const pool = await poolPromise;
            const versionResult = await pool.request()
                .input('PhieuKiemId', sql.Int, Number(phieuKiemId))
                .input('FieldName', sql.NVarChar(100), UNIFIED_PRINT_DATA_VERSION_FIELD)
                .query(`
                    SELECT TOP 1 FieldValue FROM dbo.PhieuKiem_CustomFields
                    WHERE PhieuKiemId = @PhieuKiemId AND FieldName = @FieldName
                `);
            const isUnifiedPrintData = String(versionResult.recordset?.[0]?.FieldValue || '') === UNIFIED_PRINT_DATA_VERSION;
            const quantityValidation = await pool.request()
                .input('PhieuKiemId', sql.Int, Number(phieuKiemId))
                .query(`
                    SELECT planRow.Id,
                        COALESCE(planRow.SoLuongThucTe, planRow.SoLuongKeHoach, 0) AS SoLuongHieuLuc,
                        ISNULL(SUM(defect.SoLuong), 0)
                            + ISNULL(planRow.SoLoiBuiBan, 0)
                            + ISNULL(planRow.SoLoiConTrung, 0) AS TongLoi,
                        SUM(CASE WHEN defect.Id IS NOT NULL AND NULLIF(LTRIM(RTRIM(defect.TenCongNhan)), '') IS NULL THEN 1 ELSE 0 END) AS SoLoiThieuCongNhan
                    FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN planRow
                    LEFT JOIN dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT defect ON defect.PlanId = planRow.Id
                    WHERE planRow.PhieuKiemId = @PhieuKiemId
                    GROUP BY planRow.Id, planRow.SoLuongThucTe, planRow.SoLuongKeHoach,
                        planRow.SoLoiBuiBan, planRow.SoLoiConTrung
                `);
            const invalidPlan = quantityValidation.recordset.find((plan) =>
                Number(plan.TongLoi || 0) > Number(plan.SoLuongHieuLuc || 0)
                || (isUnifiedPrintData && Number(plan.SoLoiThieuCongNhan || 0) > 0)
            );
            if (invalidPlan) {
                return res.status(409).json({
                    message: Number(invalidPlan.SoLoiThieuCongNhan || 0) > 0
                        ? `Kế hoạch #${invalidPlan.Id} còn lỗi chưa nhập công nhân`
                        : `Kế hoạch #${invalidPlan.Id} có tổng lỗi vượt số lượng hiệu lực`
                });
            }
            const completedByName = await getUserDisplayName(pool, userId, completedByNameFallback);
            await upsertPhieuKiemCustomFields(pool, phieuKiemId, {
                [CUOI_CHUYEN_APPROVE_BOPHAN_FIELD]: String(boPhanId),
                [CUOI_CHUYEN_COMPLETED_BY_FIELD]: String(userId || ''),
                [CUOI_CHUYEN_COMPLETED_BY_NAME_FIELD]: completedByName
            });

            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('KetLuan', sql.NVarChar(20), String(ketLuan).toUpperCase())
                .input('UserId', sql.Int, userId)
                .execute('sp_PhieuKiem_CuoiChuyen_Complete');

            res.json({
                success: true,
                result: result.recordset?.[0] || null
            });
        } catch (err) {
            console.error('CuoiChuyen complete error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Hoàn tất phiếu kiểm cuối chuyền thất bại'
            });
        }
    }
);

router.post(
    '/cuoi-chuyen/approve',
    authenticateToken,
    authorize('PHAN_CONG_NGUOI_XU_LY'),
    async (req, res) => {
        const { phieuKiemId } = req.body;
        const userId = req.user?.id || req.user?.userId;
        const boPhanId = req.user?.boPhanId;
        const isAdmin = isAdminUser(req.user);

        if (!phieuKiemId) {
            return res.status(400).json({ message: 'Missing phieuKiemId' });
        }

        if (!boPhanId && !isAdmin) {
            return res.status(400).json({ message: 'Không xác định được bộ phận của người duyệt' });
        }

        try {
            const pool = await poolPromise;
            let effectiveBoPhanId = boPhanId;
            const approvalFieldsResult = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('ApproveFieldName', sql.NVarChar(100), CUOI_CHUYEN_APPROVE_BOPHAN_FIELD)
                .input('CompletedByFieldName', sql.NVarChar(100), CUOI_CHUYEN_COMPLETED_BY_FIELD)
                .query(`
                    SELECT FieldName, FieldValue
                    FROM dbo.PhieuKiem_CustomFields
                    WHERE PhieuKiemId = @PhieuKiemId
                      AND FieldName IN (@ApproveFieldName, @CompletedByFieldName)
                `);

            const approvalFields = Object.fromEntries(
                (approvalFieldsResult.recordset || []).map((field) => [field.FieldName, field.FieldValue])
            );
            const completedByUserId = Number(approvalFields[CUOI_CHUYEN_COMPLETED_BY_FIELD] || 0) || null;

            if (completedByUserId && Number(userId) === completedByUserId) {
                return res.status(403).json({ message: 'Người hoàn tất phiếu không được tự duyệt phiếu' });
            }

            if (isAdmin) {
                effectiveBoPhanId = Number(approvalFields[CUOI_CHUYEN_APPROVE_BOPHAN_FIELD] || 0) || null;
            }

            if (!effectiveBoPhanId) {
                return res.status(400).json({ message: 'Không xác định được bộ phận duyệt của phiếu' });
            }

            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userId)
                .input('BoPhanId', sql.Int, effectiveBoPhanId)
                .input('IsAdmin', sql.Bit, isAdmin ? 1 : 0)
                .execute('sp_PhieuKiem_CuoiChuyen_Approve');

            const approvedByName = await getUserDisplayName(pool, userId, req.user?.fullName || req.user?.username || '');
            await upsertPhieuKiemCustomFields(pool, phieuKiemId, {
                [CUOI_CHUYEN_APPROVED_BY_NAME_FIELD]: approvedByName
            });

            res.json({
                success: true,
                result: result.recordset?.[0] || null
            });
        } catch (err) {
            console.error('CuoiChuyen approve error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Duyệt phiếu kiểm cuối chuyền thất bại'
            });
        }
    }
);

router.post(
    '/cuoi-chuyen/create-bien-ban',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { phieuKiemId } = req.body;

        if (!phieuKiemId) {
            return res.status(400).json({ message: 'Missing phieuKiemId' });
        }

        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, req.user?.id || req.user?.userId)
                .execute('sp_PhieuKiem_CuoiChuyen_CreateBienBan');

            res.json({
                success: true,
                bienBanId: result.recordset?.[0]?.BienBanId || null
            });
        } catch (err) {
            console.error('CuoiChuyen create bien ban error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Sinh biên bản kiểm cuối chuyền thất bại'
            });
        }
    }
);

router.delete(
    '/tren-chuyen/entry/:entryId',
    authenticateToken,
    authorize(['THUC_HIEN_KIEM', 'PHAN_BO_KIEM', 'KET_LUAN']),
    async (req, res) => {
        const entryId = Number(req.params.entryId);
        const userId = req.user?.id || req.user?.userId;
        const userPermissions = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
        const canManageAll = canManageTrenChuyenAll(userPermissions);

        if (!Number.isInteger(entryId) || entryId <= 0) {
            return res.status(400).json({ message: 'EntryId không hợp lệ' });
        }

        try {
            const pool = await poolPromise;

            const entryInfo = await pool.request()
                .input('EntryId', sql.Int, entryId)
                .query(`
                    SELECT
                        e.Id,
                        e.NguoiGhiNhanId,
                        e.SlotId,
                        s.PhieuKiemId,
                        pk.TrangThai
                    FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY e
                    INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT s ON s.Id = e.SlotId
                    INNER JOIN dbo.PHIEU_KIEM pk ON pk.Id = s.PhieuKiemId
                    WHERE e.Id = @EntryId
                `);

            const entry = entryInfo.recordset?.[0];
            if (!entry) {
                return res.status(404).json({ message: 'Không tìm thấy công đoạn cần xóa' });
            }

            if (['HOAN_TAT', 'CHO_TBP_DUYET', 'CHO_KIEM_NGHIEM', 'CHO_XUONG_XAC_NHAN'].includes(entry.TrangThai)) {
                return res.status(409).json({ message: 'Phiếu đã khóa, không thể xóa công đoạn' });
            }

            if (!canManageAll && Number(entry.NguoiGhiNhanId) !== Number(userId)) {
                return res.status(403).json({ message: 'Bạn chỉ có thể xóa công đoạn do chính mình ghi nhận' });
            }

            await pool.request()
                .input('EntryId', sql.Int, entryId)
                .input('SlotId', sql.Int, entry.SlotId)
                .query(`
                    DELETE FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT
                    WHERE EntryId = @EntryId;

                    DELETE FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY
                    WHERE Id = @EntryId;

                    DELETE FROM dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT
                    WHERE Id = @SlotId
                      AND NOT EXISTS (
                        SELECT 1
                        FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY
                        WHERE SlotId = @SlotId
                      );
                `);

            res.json({ success: true });
        } catch (err) {
            console.error('TrenChuyen delete entry error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Xóa công đoạn thất bại'
            });
        }
    }
);

router.post(
    '/tren-chuyen/complete',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { phieuKiemId, ketLuan } = req.body;
        const userId = req.user?.id || req.user?.userId;
        const boPhanId = req.user?.boPhanId;
        const completedByName = req.user?.fullName || req.user?.username || '';

        if (!phieuKiemId || !['DAT', 'KHONG_DAT'].includes(String(ketLuan || '').toUpperCase())) {
            return res.status(400).json({ message: 'Thiếu dữ liệu hoàn tất hoặc kết luận không hợp lệ' });
        }

        if (!boPhanId) {
            return res.status(400).json({ message: 'Không xác định được bộ phận duyệt của người hoàn tất phiếu' });
        }

        try {
            const pool = await poolPromise;
            const versionResult = await pool.request()
                .input('PhieuKiemId', sql.Int, Number(phieuKiemId))
                .input('FieldName', sql.NVarChar(100), UNIFIED_PRINT_DATA_VERSION_FIELD)
                .query(`
                    SELECT TOP 1 FieldValue FROM dbo.PhieuKiem_CustomFields
                    WHERE PhieuKiemId = @PhieuKiemId AND FieldName = @FieldName
                `);
            const isUnifiedPrintData = String(versionResult.recordset?.[0]?.FieldValue || '') === UNIFIED_PRINT_DATA_VERSION;
            const quantityValidation = await pool.request()
                .input('PhieuKiemId', sql.Int, Number(phieuKiemId))
                .query(isUnifiedPrintData ? `
                    SELECT entryRow.Id, entryRow.CongDoan, entryRow.TenCongNhanGayLoi,
                        entryRow.SoLuongKiem,
                        ISNULL(entryRow.SoLoiBuiBan, 0) + ISNULL(entryRow.SoLoiConTrung, 0)
                            + ISNULL(SUM(defect.SoLuong), 0) AS TongLoi
                    FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY entryRow
                    INNER JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT slotRow ON slotRow.Id = entryRow.SlotId
                    LEFT JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT defect ON defect.EntryId = entryRow.Id
                    WHERE slotRow.PhieuKiemId = @PhieuKiemId
                    GROUP BY entryRow.Id, entryRow.CongDoan, entryRow.TenCongNhanGayLoi,
                        entryRow.SoLuongKiem, entryRow.SoLoiBuiBan, entryRow.SoLoiConTrung
                ` : `
                    SELECT COALESCE(pk.SoLuongThucTe, pk.SoLuong, 0) AS SoLuongHieuLuc,
                        ISNULL(SUM(defect.SoLuong), 0) AS TongLoi
                    FROM dbo.PHIEU_KIEM pk
                    LEFT JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT slotRow ON slotRow.PhieuKiemId = pk.Id
                    LEFT JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY entryRow ON entryRow.SlotId = slotRow.Id
                    LEFT JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT defect ON defect.EntryId = entryRow.Id
                    WHERE pk.Id = @PhieuKiemId
                    GROUP BY pk.SoLuongThucTe, pk.SoLuong
                `);
            if (isUnifiedPrintData) {
                if (!quantityValidation.recordset.length) {
                    return res.status(409).json({ message: 'Phiếu cần ít nhất một dòng kiểm trước khi hoàn tất' });
                }
                const invalidEntry = quantityValidation.recordset.find((entry) => {
                    const hasSoLuongKiem = entry.SoLuongKiem !== null
                        && entry.SoLuongKiem !== undefined
                        && entry.SoLuongKiem !== '';
                    const invalidSoLuongKiem = hasSoLuongKiem && (
                        !Number.isInteger(Number(entry.SoLuongKiem))
                        || Number(entry.SoLuongKiem) <= 0
                        || Number(entry.TongLoi || 0) > Number(entry.SoLuongKiem)
                    );
                    return !String(entry.CongDoan || '').trim()
                        || !String(entry.TenCongNhanGayLoi || '').trim()
                        || invalidSoLuongKiem;
                });
                if (invalidEntry) {
                    return res.status(409).json({
                        message: `Dòng kiểm #${invalidEntry.Id} thiếu công đoạn/công nhân, số lượng kiểm không hợp lệ hoặc có tổng lỗi vượt số lượng kiểm đã nhập`
                    });
                }
            } else {
                const quantityInfo = quantityValidation.recordset[0];
                if (quantityInfo && Number(quantityInfo.TongLoi || 0) > Number(quantityInfo.SoLuongHieuLuc || 0)) {
                    return res.status(409).json({ message: 'Tổng số lượng lỗi vượt số lượng hiệu lực của phiếu' });
                }
            }
            await upsertPhieuKiemCustomFields(pool, phieuKiemId, {
                [TREN_CHUYEN_APPROVE_BOPHAN_FIELD]: String(boPhanId),
                [TREN_CHUYEN_COMPLETED_BY_FIELD]: String(userId || ''),
                [TREN_CHUYEN_COMPLETED_BY_NAME_FIELD]: completedByName
            });

            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('KetLuan', sql.NVarChar(20), String(ketLuan).toUpperCase())
                .input('UserId', sql.Int, userId)
                .execute('sp_PhieuKiem_TrenChuyen_Complete');

            res.json({
                success: true,
                result: result.recordset?.[0] || null
            });
        } catch (err) {
            console.error('TrenChuyen complete error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Hoàn tất phiếu kiểm trên chuyền thất bại'
            });
        }
    }
);

router.post(
    '/tren-chuyen/approve',
    authenticateToken,
    authorize('PHAN_CONG_NGUOI_XU_LY'),
    async (req, res) => {
        const { phieuKiemId } = req.body;
        const userId = req.user?.id || req.user?.userId;
        const boPhanId = req.user?.boPhanId;
        const isAdmin = isAdminUser(req.user);

        if (!phieuKiemId) {
            return res.status(400).json({ message: 'Missing phieuKiemId' });
        }

        if (!boPhanId && !isAdmin) {
            return res.status(400).json({ message: 'Không xác định được bộ phận của người duyệt' });
        }

        try {
            const pool = await poolPromise;
            let effectiveBoPhanId = boPhanId;

            if (isAdmin) {
                const fieldResult = await pool.request()
                    .input('PhieuKiemId', sql.Int, phieuKiemId)
                    .input('FieldName', sql.NVarChar(100), TREN_CHUYEN_APPROVE_BOPHAN_FIELD)
                    .query(`
                        SELECT TOP 1 TRY_CAST(FieldValue AS INT) AS ApproveBoPhanId
                        FROM dbo.PhieuKiem_CustomFields
                        WHERE PhieuKiemId = @PhieuKiemId
                          AND FieldName = @FieldName
                    `);

                effectiveBoPhanId = fieldResult.recordset?.[0]?.ApproveBoPhanId || null;
            }

            if (!effectiveBoPhanId) {
                return res.status(400).json({ message: 'Không xác định được bộ phận duyệt của phiếu' });
            }

            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userId)
                .input('BoPhanId', sql.Int, effectiveBoPhanId)
                .input('IsAdmin', sql.Bit, isAdmin ? 1 : 0)
                .execute('sp_PhieuKiem_TrenChuyen_Approve');

            res.json({
                success: true,
                result: result.recordset?.[0] || null
            });
        } catch (err) {
            console.error('TrenChuyen approve error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Duyệt phiếu kiểm trên chuyền thất bại'
            });
        }
    }
);

router.post(
    '/tren-chuyen/create-bien-ban',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { phieuKiemId } = req.body;

        if (!phieuKiemId) {
            return res.status(400).json({ message: 'Missing phieuKiemId' });
        }

        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, req.user?.id || req.user?.userId)
                .execute('sp_PhieuKiem_TrenChuyen_CreateBienBan');

            res.json({
                success: true,
                bienBanId: result.recordset?.[0]?.BienBanId || null
            });
        } catch (err) {
            console.error('TrenChuyen create bien ban error:', err);
            res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Sinh biên bản kiểm trên chuyền thất bại'
            });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/sxbt/group-preview
========================================================= */
router.post(
    '/sxbt/group-preview',
    authenticateToken,
    authorize('PHAN_BO_KIEM'),
    async (req, res) => {
        const ids = normalizePositiveIds(req.body?.keHoachNhapIds);
        if (ids.length === 0) {
            return res.status(400).json({ message: 'Vui lòng chọn ít nhất một kế hoạch nhập BTP.' });
        }

        try {
            const pool = await poolPromise;
            const plans = await loadSxbtImportPlans(pool.request(), ids);
            return res.json(buildSxbtGroupPreview(ids, plans));
        } catch (err) {
            console.error('SXBT group preview error:', err);
            return res.status(500).json({
                message: err?.originalError?.info?.message || err.message || 'Không thể nhóm kế hoạch SXBT.'
            });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/create-sxbt (Sản xuất bổ trợ)
========================================================= */
router.post(
    '/create-sxbt',
    authenticateToken,
    authorize('PHAN_BO_KIEM'),
    async (req, res) => {
        const {
            loaiKiemId,
            nguoiKiemId,
            keHoachNhapId,
            keHoachNhapIds,
            previewFingerprint,
            sourceId,
            soLuong,
            doiTuong,
            mucDoKiemTra
        } = req.body;

        const selectedImportPlanIds = normalizePositiveIds(
            Array.isArray(keHoachNhapIds) && keHoachNhapIds.length > 0
                ? keHoachNhapIds
                : keHoachNhapId
        );

        if (!loaiKiemId || !nguoiKiemId || (selectedImportPlanIds.length === 0 && !sourceId)) {
            return res.status(400).json({
                message: 'Thiếu loại kiểm, người kiểm hoặc nguồn kế hoạch nhập BTP'
            });
        }

        if (selectedImportPlanIds.length === 0) {
            try {
                const pool = await poolPromise;
                const result = await pool.request()
                    .input('LoaiKiemId', sql.Int, loaiKiemId)
                    .input('NguoiKiemId', sql.Int, nguoiKiemId)
                    .input('NguoiLapId', sql.Int, req.user.userId)
                    .input('MucDoKiemTra', sql.NVarChar, mucDoKiemTra || null)
                    .input('SourceId', sql.Int, sourceId)
                    .input('SoLuong', sql.Int, soLuong)
                    .input('DoiTuong', sql.NVarChar, doiTuong)
                    .execute('sp_PhieuKiem_Create_SXBT');
                await pool.request()
                    .input('UserId', sql.Int, nguoiKiemId)
                    .input('Title', sql.NVarChar, 'Bạn có phiếu kiểm bổ trợ mới! 📋')
                    .input('Message', sql.NVarChar, `Tổ trưởng vừa phân công cho bạn phiếu kiểm ${result.recordset[0].SoPhieu}.`)
                    .input('Type', sql.VarChar, 'NEW_PHIEU')
                    .input('ReferenceId', sql.Int, result.recordset[0].Id)
                    .query('INSERT INTO NOTIFICATIONS (UserId, Title, Message, Type, ReferenceId) VALUES (@UserId, @Title, @Message, @Type, @ReferenceId)');
                return res.json({
                    success: true,
                    phieuKiemId: result.recordset[0].Id,
                    soPhieu: result.recordset[0].SoPhieu,
                    createdCount: 1,
                    inspections: [{
                        phieuKiemId: result.recordset[0].Id,
                        soPhieu: result.recordset[0].SoPhieu,
                        keHoachNhapIds: []
                    }]
                });
            } catch (err) {
                console.error('Create legacy SXBT error:', err);
                return res.status(500).json({ message: err.message || 'Tạo phiếu kiểm bổ trợ thất bại' });
            }
        }

        if (selectedImportPlanIds.length > 1 && !previewFingerprint) {
            return res.status(400).json({ message: 'Cần xem trước nhóm kế hoạch SXBT trước khi tạo phiếu.' });
        }

        let transaction;
        try {
            const pool = await poolPromise;
            transaction = new sql.Transaction(pool);
            await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

            const plans = await loadSxbtImportPlans(
                new sql.Request(transaction),
                selectedImportPlanIds,
                { lockPrimaryLinks: true }
            );
            const preview = buildSxbtGroupPreview(selectedImportPlanIds, plans);
            if (preview.invalidPlans.length > 0 || plans.length !== selectedImportPlanIds.length) {
                const error = new Error(preview.invalidPlans[0]?.message || 'Danh sách kế hoạch đã thay đổi. Vui lòng xem trước lại.');
                error.statusCode = 409;
                throw error;
            }
            if (previewFingerprint && preview.fingerprint !== previewFingerprint) {
                const error = new Error('Dữ liệu kế hoạch đã thay đổi sau khi xem trước. Vui lòng tải lại bản xem trước.');
                error.statusCode = 409;
                throw error;
            }

            const sequenceResult = await new sql.Request(transaction).query(`
                EXEC sys.sp_getapplock
                    @Resource = N'PHIEU_KIEM_SXBT_NUMBER',
                    @LockMode = N'Exclusive',
                    @LockOwner = N'Transaction',
                    @LockTimeout = 10000;
                DECLARE @TodayStr CHAR(6) = CONVERT(CHAR(6), GETDATE(), 12);
                SELECT @TodayStr AS TodayStr,
                    ISNULL(MAX(TRY_CONVERT(INT, RIGHT(SoPhieu, 3))), 0) AS CurrentSeq
                FROM dbo.PHIEU_KIEM WITH (UPDLOCK, HOLDLOCK)
                WHERE SoPhieu LIKE N'BT-' + @TodayStr + N'-%';
            `);
            const todayStr = sequenceResult.recordset[0].TodayStr;
            let nextSeq = Number(sequenceResult.recordset[0].CurrentSeq || 0);
            const inspections = [];

            for (const group of preview.groups) {
                nextSeq += 1;
                const soPhieu = `BT-${todayStr}-${String(nextSeq).padStart(3, '0')}`;
                const first = group.plans[0];
                const totalQuantity = group.plans.reduce((sum, plan) => sum + Number(plan.SoLuong || 0), 0);
                const headerResult = await new sql.Request(transaction)
                    .input('SoPhieu', sql.NVarChar(50), soPhieu)
                    .input('SanPhamId', sql.Int, first.SanPhamId)
                    .input('LoaiKiemId', sql.Int, Number(loaiKiemId))
                    .input('Lot', sql.NVarChar(100), first.So_LoSanXuat || '')
                    .input('DoiTuong', sql.NVarChar, [first.Ten_DonVi, first.Ten_BoPhan].filter(Boolean).join(' - '))
                    .input('NguoiKiemId', sql.Int, Number(nguoiKiemId))
                    .input('NguoiLapId', sql.Int, req.user.userId)
                    .input('LegacyKeHoachNhapId', sql.Int, group.plans.length === 1 ? first.KeHoachNhapId : null)
                    .input('SoLuong', sql.Int, Math.round(totalQuantity))
                    .input('MucDoKiemTra', sql.NVarChar(50), mucDoKiemTra || null)
                    .query(`
                        INSERT INTO dbo.PHIEU_KIEM (
                            SoPhieu, SanPhamId, LoaiKiemId, Lot, DoiTuong,
                            NguoiKiemId, NguoiLapId, SourceId, SxbtKeHoachNhapId,
                            SxbtPhieuNhapBtpId, SxbtIsSplitChild, SoLuong,
                            CreatedAt, TrangThai, MucDoKiemTra
                        )
                        OUTPUT INSERTED.Id
                        VALUES (
                            @SoPhieu, @SanPhamId, @LoaiKiemId, @Lot, @DoiTuong,
                            @NguoiKiemId, @NguoiLapId, NULL, @LegacyKeHoachNhapId,
                            NULL, 0, @SoLuong, GETDATE(), N'CHUA_KIEM', @MucDoKiemTra
                        );
                    `);
                const newPhieuId = headerResult.recordset[0].Id;

                for (let index = 0; index < group.plans.length; index += 1) {
                    const plan = group.plans[index];
                    const linkResult = await new sql.Request(transaction)
                        .input('PhieuKiemId', sql.Int, newPhieuId)
                        .input('KeHoachNhapId', sql.Int, plan.KeHoachNhapId)
                        .input('ID_KeHoachSanXuat', sql.Int, plan.ID_KeHoachSanXuat)
                        .input('SoLuongKeHoach', sql.Decimal(18, 2), Number(plan.SoLuong || 0))
                        .input('ItemCode', sql.NVarChar(100), plan.ItemCode)
                        .input('SoLotSX', sql.NVarChar(100), plan.So_LoSanXuat || null)
                        .input('NgayNhap', sql.Date, plan.Ngay_NhapBTP)
                        .input('SortOrder', sql.Int, index + 1)
                        .query(`
                            INSERT INTO dbo.PHIEU_KIEM_SXBT_PLAN (
                                PhieuKiemId, KeHoachNhapId, ID_KeHoachSanXuat,
                                IsPrimary, SoLuongKeHoach, ItemCode, SoLotSX,
                                NgayNhap, SortOrder
                            )
                            OUTPUT INSERTED.Id
                            VALUES (
                                @PhieuKiemId, @KeHoachNhapId, @ID_KeHoachSanXuat,
                                1, @SoLuongKeHoach, @ItemCode, @SoLotSX,
                                @NgayNhap, @SortOrder
                            );
                        `);
                    const planLinkId = linkResult.recordset[0].Id;
                    const itemResult = await new sql.Request(transaction)
                        .input('PhieuKiemId', sql.Int, newPhieuId)
                        .input('SxbtPlanLinkId', sql.Int, planLinkId)
                        .input('ItemCode', sql.NVarChar(100), plan.ItemCode)
                        .input('TenSanPham', sql.NVarChar(255), plan.Ten_SanPham || plan.Ma_DonHang)
                        .input('SoLuong', sql.Decimal(18, 2), Number(plan.SoLuong || 0))
                        .input('DonViTinh', sql.NVarChar(100), plan.DonViTinh || null)
                        .input('MaDonHang', sql.NVarChar(100), plan.Ma_DonHang || null)
                        .input('SoLotSX', sql.NVarChar(100), plan.So_LoSanXuat || null)
                        .input('NgayNhap', sql.Date, plan.Ngay_NhapBTP)
                        .input('ID_KeHoachSanXuat', sql.Int, plan.ID_KeHoachSanXuat)
                        .input('ID_DonHang', sql.Int, plan.ID_DonHang)
                        .input('ID_DonHang_SanPham', sql.Int, plan.ID_DonHang_SanPham || null)
                        .input('ID_DonHang_LoSanXuat', sql.Int, plan.ID_DonHang_LoSanXuat || null)
                        .query(`
                            INSERT INTO dbo.PHIEU_KIEM_BTP_ITEM (
                                PhieuKiemId, SxbtPlanLinkId, ItemCode, TenSanPham,
                                SoLuong, DonViTinh, MaDonHang, SoLotSX, NgayNhap,
                                SoLuongNhap, SourceID_KeHoachSanXuat, SourceID_DonHang,
                                SourceID_DonHang_SanPham, SourceID_DonHang_LoSanXuat
                            )
                            OUTPUT INSERTED.Id
                            VALUES (
                                @PhieuKiemId, @SxbtPlanLinkId, @ItemCode, @TenSanPham,
                                @SoLuong, @DonViTinh, @MaDonHang, @SoLotSX, @NgayNhap,
                                @SoLuong, @ID_KeHoachSanXuat, @ID_DonHang,
                                @ID_DonHang_SanPham, @ID_DonHang_LoSanXuat
                            );
                        `);
                    await new sql.Request(transaction)
                        .input('BtpItemId', sql.Int, itemResult.recordset[0].Id)
                        .input('SoLotSX', sql.NVarChar(100), plan.So_LoSanXuat || null)
                        .input('SoLuongNhap', sql.Decimal(18, 2), Number(plan.SoLuong || 0))
                        .query(`
                            INSERT INTO dbo.PHIEU_KIEM_BTP_ITEM_LOT
                                (BtpItemId, SoLotSX, SoLuongNhap, SortOrder)
                            VALUES (@BtpItemId, @SoLotSX, @SoLuongNhap, 1);
                        `);
                }

                await new sql.Request(transaction)
                    .input('UserId', sql.Int, nguoiKiemId)
                    .input('Title', sql.NVarChar, 'Bạn có phiếu kiểm bổ trợ mới! 📋')
                    .input('Message', sql.NVarChar, `Tổ trưởng vừa phân công cho bạn phiếu kiểm ${soPhieu}.`)
                    .input('Type', sql.VarChar, 'NEW_PHIEU')
                    .input('ReferenceId', sql.Int, newPhieuId)
                    .query('INSERT INTO NOTIFICATIONS (UserId, Title, Message, Type, ReferenceId) VALUES (@UserId, @Title, @Message, @Type, @ReferenceId)');

                inspections.push({
                    phieuKiemId: newPhieuId,
                    soPhieu,
                    keHoachNhapIds: group.plans.map((plan) => plan.KeHoachNhapId)
                });
            }

            await transaction.commit();
            return res.json({
                success: true,
                createdCount: inspections.length,
                inspections,
                phieuKiemId: inspections[0]?.phieuKiemId || null,
                soPhieu: inspections[0]?.soPhieu || null
            });
        } catch (err) {
            if (transaction) {
                try { await transaction.rollback(); } catch (rollbackError) {
                    console.error('Create SXBT rollback error:', rollbackError);
                }
            }
            console.error('CreateSXBT error:', err);
            const sqlMessage = err?.originalError?.info?.message || err.message;
            const isConflict = /đã được tạo phiếu kiểm|duplicate|unique/i.test(sqlMessage || '');
            res.status(err.statusCode || (isConflict ? 409 : 500)).json({
                message: sqlMessage || 'Tạo phiếu kiểm bổ trợ thất bại'
            });
        }
    }
);

/* =========================================================
   GET /phieu-kiem/:id/btp-items (Lấy danh sách mặt hàng BTP)
========================================================= */
router.get(
    '/:id/btp-items',
    authenticateToken,
    async (req, res) => {
        try {
            const { id } = req.params;
            const pool = await poolPromise;
            const itemsResult = await pool.request()
                .input('PhieuKiemId', sql.Int, id)
                .query(`
                    SELECT item.*, planLink.KeHoachNhapId
                    FROM dbo.PHIEU_KIEM_BTP_ITEM item
                    LEFT JOIN dbo.PHIEU_KIEM_SXBT_PLAN planLink ON planLink.Id = item.SxbtPlanLinkId
                    WHERE item.PhieuKiemId = @PhieuKiemId
                `);
            const lotResult = await pool.request()
                .input('PhieuKiemId', sql.Int, id)
                .query(`
                    IF OBJECT_ID(N'dbo.PHIEU_KIEM_BTP_ITEM_LOT', N'U') IS NOT NULL
                    BEGIN
                        SELECT lot.*
                        FROM dbo.PHIEU_KIEM_BTP_ITEM_LOT lot
                        INNER JOIN dbo.PHIEU_KIEM_BTP_ITEM item ON item.Id = lot.BtpItemId
                        WHERE item.PhieuKiemId = @PhieuKiemId
                        ORDER BY lot.BtpItemId, lot.SortOrder, lot.Id
                    END
                    ELSE
                    BEGIN
                        SELECT TOP 0
                            CAST(NULL AS INT) AS Id,
                            CAST(NULL AS INT) AS BtpItemId,
                            CAST(NULL AS NVARCHAR(100)) AS DauTuanGS1,
                            CAST(NULL AS NVARCHAR(50)) AS ThuTu,
                            CAST(NULL AS NVARCHAR(100)) AS LxvtLot,
                            CAST(NULL AS NVARCHAR(100)) AS SoLotSX,
                            CAST(NULL AS DECIMAL(18,2)) AS SoLuongNhap,
                            CAST(NULL AS DECIMAL(18,2)) AS SoLuongKhoXacNhan,
                            CAST(NULL AS INT) AS KhoXacNhanBy,
                            CAST(NULL AS DATETIME2) AS KhoXacNhanAt,
                            CAST(NULL AS INT) AS SortOrder
                    END
                `);
            res.json(attachBtpLotRows(itemsResult.recordset, lotResult.recordset));
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Lỗi lấy chi tiết mặt hàng BTP' });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/sxbt-save (Lưu toàn bộ Phiếu Kiểm SXBT)
========================================================= */
router.post(
    '/sxbt-save',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        let transaction;
        try {
            const {
                phieuKiemId,
                soLuongThucTe: rawSoLuongThucTe,
                dynamicFields,
                btpItems,
                summary,
                defects
            } = req.body;

            const normalizedPhieuKiemId = Number(phieuKiemId);
            const soLuongThucTe = optionalNonNegativeInteger(rawSoLuongThucTe);
            const soLuongMau = optionalNonNegativeInteger(summary?.SoLuongMau);
            if (!Number.isInteger(normalizedPhieuKiemId) || normalizedPhieuKiemId <= 0) {
                return res.status(400).json({ message: 'Thiếu phieuKiemId' });
            }
            if (Number.isNaN(soLuongThucTe) || soLuongThucTe === 0) {
                return res.status(400).json({ message: 'Số lượng thực tế phải là số nguyên dương hoặc để trống' });
            }
            if (Number.isNaN(soLuongMau)) {
                return res.status(400).json({ message: 'Số lượng mẫu phải là số nguyên không âm' });
            }

            const pool = await poolPromise;
            transaction = new sql.Transaction(pool);
            await transaction.begin();

            const phieuResult = await new sql.Request(transaction)
                .input('PhieuKiemId', sql.Int, normalizedPhieuKiemId)
                .query(`
                    SELECT Id, LoaiKiemId, SoLuong, SoLuongThucTe, TrangThai
                    FROM dbo.PHIEU_KIEM WITH (UPDLOCK, HOLDLOCK)
                    WHERE Id = @PhieuKiemId
                `);
            const phieu = phieuResult.recordset[0];
            if (!phieu) {
                await transaction.rollback();
                transaction = null;
                return res.status(404).json({ message: 'Không tìm thấy phiếu kiểm' });
            }
            if (Number(phieu.LoaiKiemId) !== 4) {
                await transaction.rollback();
                transaction = null;
                return res.status(400).json({ message: 'Phiếu kiểm không thuộc loại Sản xuất bổ trợ' });
            }
            if (!['TAO_MOI', 'CHUA_KIEM', 'DA_TAO_SECTION', 'DANG_KIEM'].includes(String(phieu.TrangThai || '').toUpperCase())) {
                await transaction.rollback();
                transaction = null;
                return res.status(409).json({ message: 'Phiếu đã chuyển bước nên không thể sửa kết quả kiểm' });
            }

            const soLuongHieuLuc = soLuongThucTe ?? Number(phieu.SoLuong || 0);
            if (soLuongMau !== null && soLuongMau > soLuongHieuLuc) {
                await transaction.rollback();
                transaction = null;
                return res.status(400).json({
                    message: `Số lượng mẫu không được vượt quá số lượng dùng tính tỷ lệ (${soLuongHieuLuc})`
                });
            }

            const activeDefects = Array.isArray(defects)
                ? defects.filter((defect) => Number(defect?.SoLuong) > 0)
                : [];
            const totalDefects = activeDefects.reduce((sum, defect) => sum + Number(defect.SoLuong || 0), 0);
            const criticalDefects = activeDefects
                .filter((defect) => ['CRITICAL', 'Nghiêm trọng'].includes(defect.DefectType))
                .reduce((sum, defect) => sum + Number(defect.SoLuong || 0), 0);
            const safeSampleQuantity = soLuongMau ?? 0;
            const roundRate = (value) => Math.round(value * 100) / 100;
            const authoritativeSummary = summary ? {
                ...summary,
                SoLuongMau: safeSampleQuantity,
                TyLe: soLuongHieuLuc > 0 ? roundRate(safeSampleQuantity * 100 / soLuongHieuLuc) : 0,
                TyLeDat: safeSampleQuantity > 0 ? roundRate(100 - totalDefects * 100 / safeSampleQuantity) : 0,
                TyLeLoiNghiemTrong: safeSampleQuantity > 0 ? roundRate(criticalDefects * 100 / safeSampleQuantity) : 0,
                TyLeLoiNangNhe: safeSampleQuantity > 0
                    ? roundRate((totalDefects - criticalDefects) * 100 / safeSampleQuantity)
                    : 0
            } : null;

            const result = await new sql.Request(transaction)
                .input('PhieuKiemId', sql.Int, normalizedPhieuKiemId)
                .input('SoLuongThucTe', sql.Int, soLuongThucTe)
                .input('UpdateSoLuongThucTe', sql.Bit, true)
                .input('DynamicFieldsJson', sql.NVarChar(sql.MAX), dynamicFields ? JSON.stringify(dynamicFields) : null)
                .input('BtpItemsJson', sql.NVarChar(sql.MAX), null)
                .input('SummaryJson', sql.NVarChar(sql.MAX), authoritativeSummary ? JSON.stringify(authoritativeSummary) : null)
                .input('DefectsJson', sql.NVarChar(sql.MAX), defects ? JSON.stringify(activeDefects) : null)
                .input('KetLuan', sql.NVarChar(50), null)
                .execute('sp_PhieuKiem_SXBT_Save');

            if (Array.isArray(btpItems) && btpItems.length > 0) {
                await new sql.Request(transaction)
                    .input('PhieuKiemId', sql.Int, normalizedPhieuKiemId)
                    .input('BtpItemsJson', sql.NVarChar(sql.MAX), JSON.stringify(btpItems))
                    .query(`
                        IF @BtpItemsJson IS NOT NULL AND @BtpItemsJson != N'[]'
                        BEGIN
                            IF OBJECT_ID('tempdb..#ManualBtpItems') IS NOT NULL DROP TABLE #ManualBtpItems;
                            IF OBJECT_ID('tempdb..#ManualLotRows') IS NOT NULL DROP TABLE #ManualLotRows;

                            SELECT
                                Id,
                                LotRows
                            INTO #ManualBtpItems
                            FROM OPENJSON(@BtpItemsJson)
                            WITH (
                                Id INT '$.Id',
                                LotRows NVARCHAR(MAX) '$.LotRows' AS JSON
                            );

                            SELECT
                                item.Id AS BtpItemId,
                                lot.Id AS LotRowId,
                                lot.DauTuanGS1,
                                lot.ThuTu,
                                lot.LxvtLot,
                                COALESCE(lot.SortOrder, TRY_CONVERT(INT, lotJson.[key]) + 1) AS SortOrder
                            INTO #ManualLotRows
                            FROM #ManualBtpItems item
                            CROSS APPLY OPENJSON(item.LotRows) lotJson
                            CROSS APPLY OPENJSON(lotJson.value)
                            WITH (
                                Id INT '$.Id',
                                DauTuanGS1 NVARCHAR(100) '$.DauTuanGS1',
                                ThuTu NVARCHAR(50) '$.ThuTu',
                                LxvtLot NVARCHAR(100) '$.LxvtLot',
                                SortOrder INT '$.SortOrder'
                            ) AS lot
                            WHERE item.LotRows IS NOT NULL
                              AND lot.Id IS NOT NULL;

                            UPDATE lot
                            SET
                                lot.DauTuanGS1 = NULLIF(LTRIM(RTRIM(src.DauTuanGS1)), N''),
                                lot.ThuTu = NULLIF(LTRIM(RTRIM(src.ThuTu)), N''),
                                lot.LxvtLot = NULLIF(LTRIM(RTRIM(src.LxvtLot)), N'')
                            FROM dbo.PHIEU_KIEM_BTP_ITEM_LOT lot
                            INNER JOIN dbo.PHIEU_KIEM_BTP_ITEM item ON item.Id = lot.BtpItemId
                            INNER JOIN #ManualLotRows src ON src.LotRowId = lot.Id
                            WHERE item.PhieuKiemId = @PhieuKiemId
                              AND item.Id = src.BtpItemId
                              AND EXISTS (
                                  SELECT 1
                                  FROM dbo.PHIEU_KIEM pk
                                  WHERE pk.Id = @PhieuKiemId
                                    AND pk.TrangThai NOT IN (N'HOAN_THANH', N'HOAN_TAT', N'CHO_SXBT_XAC_NHAN', N'CHO_KHO_XAC_NHAN')
                              );

                            ;WITH first_lot AS (
                                SELECT
                                    lot.BtpItemId,
                                    lot.DauTuanGS1,
                                    lot.ThuTu,
                                    lot.LxvtLot,
                                    ROW_NUMBER() OVER (PARTITION BY lot.BtpItemId ORDER BY lot.SortOrder, lot.Id) AS rn
                                FROM dbo.PHIEU_KIEM_BTP_ITEM_LOT lot
                                INNER JOIN dbo.PHIEU_KIEM_BTP_ITEM item ON item.Id = lot.BtpItemId
                                WHERE item.PhieuKiemId = @PhieuKiemId
                            )
                            UPDATE item
                            SET
                                item.DauTuanGS1 = first_lot.DauTuanGS1,
                                item.ThuTu = first_lot.ThuTu,
                                item.LxvtLot = first_lot.LxvtLot
                            FROM dbo.PHIEU_KIEM_BTP_ITEM item
                            LEFT JOIN first_lot ON first_lot.BtpItemId = item.Id AND first_lot.rn = 1
                            WHERE item.PhieuKiemId = @PhieuKiemId;
                        END
                    `);
            }

            await transaction.commit();
            transaction = null;

            res.json({
                success: true,
                message: result.recordset && result.recordset.length > 0 ? result.recordset[0].Message : 'Lưu thành công',
                quantities: applyQuantityFields({
                    SoLuong: phieu.SoLuong,
                    SoLuongThucTe: soLuongThucTe
                }),
                summary: authoritativeSummary
            });

        } catch (err) {
            if (transaction) {
                try { await transaction.rollback(); } catch (rollbackError) {
                    console.error('SXBT Save rollback error:', rollbackError);
                }
            }
            console.error('SXBT Save error:', err);
            res.status(500).json({ message: err.message || 'Lỗi lưu dữ liệu Sản Xuất Bổ Trợ' });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/sxbt/confirm-sxbt (SXBT xác nhận sau Kho)
========================================================= */
router.post(
    '/sxbt/confirm-sxbt',
    authenticateToken,
    authorize('XAC_NHAN_SXBT'),
    async (req, res) => {
        const { phieuKiemId } = req.body;
        const userId = req.user.userId;

        if (!phieuKiemId) {
            return res.status(400).json({ message: 'Thiếu phieuKiemId' });
        }

        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userId)
                .execute('sp_PhieuKiem_SXBT_ConfirmSXBT');

            res.json({
                success: true,
                message: result.recordset?.[0]?.Message || 'SXBT đã xác nhận phiếu thành công'
            });
        } catch (err) {
            console.error('SXBT Confirm SXBT error:', err);
            res.status(500).json({ message: err.message || 'Không thể xác nhận SXBT' });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/sxbt/confirm-kho (Kho xác nhận số lượng)
========================================================= */
router.post(
    '/sxbt/confirm-kho',
    authenticateToken,
    authorize('XAC_NHAN_KHO_SXBT'),
    async (req, res) => {
        const { phieuKiemId, lotRows } = req.body;
        const userId = req.user.userId;

        if (!phieuKiemId || !Array.isArray(lotRows)) {
            return res.status(400).json({ message: 'Thiếu phieuKiemId hoặc lotRows' });
        }

        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userId)
                .input('LotRowsJson', sql.NVarChar(sql.MAX), JSON.stringify(lotRows))
                .execute('sp_PhieuKiem_SXBT_ConfirmKho');

            res.json({
                success: true,
                message: result.recordset?.[0]?.Message || 'Kho đã xác nhận số lượng nhập. Phiếu đang chờ SXBT xác nhận.'
            });
        } catch (err) {
            console.error('SXBT Confirm Kho error:', err);
            res.status(500).json({ message: err.message || 'Không thể xác nhận Kho' });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/sxbt-sync-btp-source (sync số lượng về nguồn)
========================================================= */
router.post(
    '/sxbt-sync-btp-source',
    authenticateToken,
    authorize('QUAN_TRI_DM'),
    async (req, res) => {
        const { phieuKiemId } = req.body;

        if (!phieuKiemId) {
            return res.status(400).json({ message: 'Thiếu phieuKiemId' });
        }

        try {
            const pool = await poolPromise;
            const sourceResult = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .query(`
                    SELECT TOP 1
                        SourceId,
                        SxbtKeHoachNhapId,
                        SxbtPhieuNhapBtpId
                    FROM dbo.PHIEU_KIEM
                    WHERE Id = @PhieuKiemId
                      AND LoaiKiemId = 4
                `);
            const source = sourceResult.recordset?.[0];
            if (!source) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu SXBT' });
            }
            if (source.SxbtKeHoachNhapId && !source.SxbtPhieuNhapBtpId) {
                return res.status(409).json({
                    message: 'Phiếu SXBT này lấy từ kế hoạch nhập và chưa sinh phiếu nhập BTP để đồng bộ.'
                });
            }
            if (!source.SxbtPhieuNhapBtpId && !source.SourceId) {
                return res.status(409).json({
                    message: 'Phiếu chưa có liên kết phiếu nhập BTP tương thích với chức năng đồng bộ hiện tại.'
                });
            }

            const result = await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .execute('sp_PhieuKiem_SXBT_SyncKhoQuantityToSource');

            res.json({
                success: true,
                message: result.recordset?.[0]?.Message || 'Đã đồng bộ số lượng Kho xác nhận về phiếu nhập BTP'
            });
        } catch (err) {
            console.error('SXBT Sync BTP Source error:', err);
            res.status(500).json({ message: err.message || 'Không thể đồng bộ số lượng về phiếu nhập BTP' });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/sxbt-complete (Hoàn tất phiếu SXBT)
========================================================= */
router.post(
    '/sxbt-complete',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { phieuKiemId, ketLuan } = req.body;
        const userId = req.user.userId;

        if (!phieuKiemId || !ketLuan) {
            return res.status(400).json({ message: 'Thiếu phieuKiemId hoặc ketLuan' });
        }

        try {
            const pool = await poolPromise;
            await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('KetLuan', sql.NVarChar(50), ketLuan)
                .input('UserId', sql.Int, userId)
                .execute('sp_PhieuKiem_SXBT_Complete');

            res.json({ success: true, message: 'Hoàn tất phiếu kiểm SXBT thành công. Chờ Kho xác nhận số lượng.' });

        } catch (err) {
            console.error('SXBT Complete error:', err);
            res.status(500).json({ message: 'Hoàn tất phiếu kiểm SXBT thất bại' });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/sxbt/split-complete
   Tách phiếu SXBT thành phần đạt/không đạt và hoàn tất cả hai
========================================================= */
router.post(
    '/sxbt/split-complete',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { phieuKiemId, lotRows } = req.body;

        if (!phieuKiemId || !Array.isArray(lotRows) || lotRows.length === 0) {
            return res.status(400).json({ message: 'Thiếu phieuKiemId hoặc dữ liệu dòng lô.' });
        }

        let transaction;
        try {
            const pool = await poolPromise;
            transaction = new sql.Transaction(pool);
            await transaction.begin();

            const result = await new sql.Request(transaction)
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, req.user.userId)
                .input('LotRowsJson', sql.NVarChar(sql.MAX), JSON.stringify(lotRows))
                .execute('sp_PhieuKiem_SXBT_SplitComplete');

            const row = result.recordset?.[0];
            if (!row?.RejectedPhieuKiemId) {
                throw new Error('Không nhận được phiếu không đạt sau khi tách.');
            }

            await new sql.Request(transaction)
                .input('OriginalPhieuKiemId', sql.Int, row.PassedPhieuKiemId || phieuKiemId)
                .input('RejectedPhieuKiemId', sql.Int, row.RejectedPhieuKiemId)
                .query(`
                    UPDATE rejected
                    SET
                        rejected.SxbtKeHoachNhapId = original.SxbtKeHoachNhapId,
                        rejected.SxbtPhieuNhapBtpId = original.SxbtPhieuNhapBtpId,
                        rejected.SxbtIsSplitChild = 1
                    FROM dbo.PHIEU_KIEM rejected
                    INNER JOIN dbo.PHIEU_KIEM original
                        ON original.Id = @OriginalPhieuKiemId
                    WHERE rejected.Id = @RejectedPhieuKiemId;

                    IF OBJECT_ID(N'dbo.PHIEU_KIEM_SXBT_PLAN', N'U') IS NOT NULL
                    BEGIN
                        UPDATE dbo.PHIEU_KIEM_BTP_ITEM
                        SET SxbtPlanLinkId = NULL
                        WHERE PhieuKiemId = @RejectedPhieuKiemId;

                        INSERT INTO dbo.PHIEU_KIEM_SXBT_PLAN (
                            PhieuKiemId, KeHoachNhapId, ID_KeHoachSanXuat,
                            IsPrimary, SoLuongKeHoach, ItemCode, SoLotSX,
                            NgayNhap, SortOrder
                        )
                        SELECT DISTINCT
                            @RejectedPhieuKiemId, originalLink.KeHoachNhapId,
                            originalLink.ID_KeHoachSanXuat, 0,
                            originalLink.SoLuongKeHoach, originalLink.ItemCode,
                            originalLink.SoLotSX, originalLink.NgayNhap,
                            originalLink.SortOrder
                        FROM dbo.PHIEU_KIEM_SXBT_PLAN originalLink
                        INNER JOIN dbo.PHIEU_KIEM_BTP_ITEM rejectedItem
                            ON rejectedItem.PhieuKiemId = @RejectedPhieuKiemId
                           AND ISNULL(rejectedItem.SourceID_KeHoachSanXuat, -1)
                               = ISNULL(originalLink.ID_KeHoachSanXuat, -1)
                        WHERE originalLink.PhieuKiemId = @OriginalPhieuKiemId
                          AND NOT EXISTS (
                              SELECT 1 FROM dbo.PHIEU_KIEM_SXBT_PLAN existing
                              WHERE existing.PhieuKiemId = @RejectedPhieuKiemId
                                AND existing.KeHoachNhapId = originalLink.KeHoachNhapId
                          );

                        ;WITH matched_item AS (
                            SELECT rejectedItem.Id AS BtpItemId, rejectedLink.Id AS PlanLinkId,
                                ROW_NUMBER() OVER (
                                    PARTITION BY rejectedItem.Id
                                    ORDER BY rejectedLink.SortOrder, rejectedLink.Id
                                ) AS rn
                            FROM dbo.PHIEU_KIEM_BTP_ITEM rejectedItem
                            INNER JOIN dbo.PHIEU_KIEM_SXBT_PLAN rejectedLink
                                ON rejectedLink.PhieuKiemId = @RejectedPhieuKiemId
                               AND ISNULL(rejectedLink.ID_KeHoachSanXuat, -1)
                                   = ISNULL(rejectedItem.SourceID_KeHoachSanXuat, -1)
                            WHERE rejectedItem.PhieuKiemId = @RejectedPhieuKiemId
                        )
                        UPDATE item
                        SET item.SxbtPlanLinkId = matched_item.PlanLinkId
                        FROM dbo.PHIEU_KIEM_BTP_ITEM item
                        INNER JOIN matched_item
                            ON matched_item.BtpItemId = item.Id AND matched_item.rn = 1;
                    END;
                `);

            await transaction.commit();
            return res.json({
                success: true,
                passedPhieu: {
                    id: row?.PassedPhieuKiemId,
                    soPhieu: row?.PassedSoPhieu
                },
                rejectedPhieu: {
                    id: row?.RejectedPhieuKiemId,
                    soPhieu: row?.RejectedSoPhieu
                }
            });
        } catch (err) {
            if (transaction) {
                try {
                    await transaction.rollback();
                } catch (rollbackError) {
                    console.error('SXBT split rollback error:', rollbackError);
                }
            }
            console.error('SXBT Split Complete error:', err);
            return res.status(400).json({
                message: err?.originalError?.info?.message || err.message || 'Không thể tách phiếu SXBT.'
            });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/section
   Role       : KCS
   Permission : THUC_HIEN_KIEM
========================================================= */
router.post(
    "/section",
    authenticateToken,
    authorize("THUC_HIEN_KIEM"),
    async (req, res) => {

        const { phieuKiemId, sections } = req.body;

        if (!phieuKiemId || !sections || !sections.length) {
            return res.status(400).json({
                message: "Missing required fields"
            });
        }

        try {

            const pool = await poolPromise;

            const table = new sql.Table();
            table.columns.add("NhomKiemId", sql.Int);
            table.columns.add("LotSize", sql.Int);
            table.columns.add("InspectionLevel", sql.NVarChar(100));

            sections.forEach(s => {

                table.rows.add(
                    s.nhomKiemId,
                    s.lotSize,
                    s.inspectionLevel
                );

            });

            const result = await pool.request()
                .input("PhieuKiemId", sql.Int, phieuKiemId)
                .input("Sections", table)
                .execute("sp_PhieuKiem_CreateAllSection");

            res.json({
                success: true,
                sections: result.recordset
            });

        } catch (err) {

            console.error("CreateSection error:", err);
            fs.appendFileSync('error_log.txt', `\n--- ${new Date().toISOString()} ---\n${err.stack}\n${JSON.stringify(err, null, 2)}\n`);

            res.status(500).json({
                message: "Tạo section thất bại",
                error: err.message,
                sqlError: err.originalError?.message
            });

        }
    }
);

router.post(
    '/start',
    authenticateToken,
    authorize('PHAN_BO_KIEM'),
    async (req, res) => {
        const { phieuKiemId, lotSize, inspectionLevel } = req.body;
        const pool = await poolPromise;

        await pool.request()
            .input('PhieuKiemId', sql.Int, phieuKiemId)
            .input('LotSize', sql.Int, lotSize)
            .input('InspectionLevel', sql.NVarChar(100), inspectionLevel)
            .execute('sp_PhieuKiem_CreateAllSection');
        res.json({ success: true });
    }
);

router.post(
    "/update-lot",
    authenticateToken,
    async (req, res) => {

        const { phieuKiemId, lot } = req.body;
        try {

            const pool = await poolPromise;

            await pool.request()
                .input("PhieuKiemId", sql.Int, phieuKiemId)
                .input("Lot", sql.NVarChar, lot)
                .execute("sp_PhieuKiem_UpdateLot");

            res.json({ success: true });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                message: "Không thể cập nhật số lot"
            });

        }

    });

/* =========================================================
   POST /phieu-kiem/check-item
   Role       : KCS
   Permission : THUC_HIEN_KIEM
========================================================= */
router.post(
    "/check-item",
    authenticateToken,
    authorize("THUC_HIEN_KIEM"),
    async (req, res) => {
        const { checkItemId, ketQua, defects = [], giaTriDo, diemTrongYeu } = req.body;

        try {
            const pool = await poolPromise;

            // --- BƯỚC 1: DỌN RÁC FILE ẢNH VẬT LÝ ---
            // Lấy danh sách ảnh cũ hiện đang lưu trong DB
            const oldDefectsRes = await pool.request()
                .input("CheckItemId", sql.Int, checkItemId)
                .query("SELECT ImageUrls FROM PHIEU_KIEM_DEFECT WHERE CheckItemId = @CheckItemId");

            let oldUrls = [];
            oldDefectsRes.recordset.forEach(row => {
                if (row.ImageUrls) {
                    try {
                        const parsedUrls = JSON.parse(row.ImageUrls);
                        oldUrls = [...oldUrls, ...parsedUrls];
                    } catch (e) { }
                }
            });

            // Lấy danh sách ảnh mà Mobile vừa gửi lên (chứa ảnh cũ được giữ lại + ảnh mới)
            let incomingUrls = [];
            defects.forEach(d => {
                if (d.imageUrls && Array.isArray(d.imageUrls)) {
                    incomingUrls = [...incomingUrls, ...d.imageUrls];
                }
            });

            // Tìm những ảnh cũ KHÔNG CÒN nằm trong danh sách gửi lên (nghĩa là user đã bấm xoá trên App)
            const urlsToDelete = oldUrls.filter(url => !incomingUrls.includes(url));

            const currentResult = await pool.request()
                .input("CheckItemId", sql.Int, checkItemId)
                .query(`
                    SELECT
                        pci.DanhMucCheckItemId,
                        pci.DiemTrongYeu,
                        pk.TrangThai,
                        lk.MaLoai
                    FROM dbo.PHIEU_KIEM_CHECK_ITEM pci
                    JOIN dbo.PHIEU_KIEM_SECTION sectionRow ON sectionRow.Id = pci.SectionId
                    JOIN dbo.PHIEU_KIEM pk ON pk.Id = sectionRow.PhieuKiemId
                    JOIN dbo.DM_LOAI_KIEM lk ON lk.Id = pk.LoaiKiemId
                    WHERE pci.Id = @CheckItemId
                `);

            const currentItem = currentResult.recordset?.[0];
            if (!currentItem) {
                return res.status(404).json({ message: "Không tìm thấy mục kiểm của phiếu" });
            }

            const shouldUpdateCritical = typeof diemTrongYeu === "boolean";
            const maLoai = String(currentItem.MaLoai || "").trim().toUpperCase();

            if (shouldUpdateCritical && !["DAU_VAO", "KIEM_DONG_CONT"].includes(maLoai)) {
                return res.status(400).json({
                    message: "Điểm trọng yếu chỉ áp dụng cho kiểm đầu vào và kiểm cuối đóng cont"
                });
            }

            if (shouldUpdateCritical && !["DA_TAO_SECTION", "DANG_KIEM"].includes(currentItem.TrangThai)) {
                return res.status(409).json({
                    message: "Chỉ được thay đổi điểm trọng yếu khi phiếu đang kiểm"
                });
            }

            if (shouldUpdateCritical && !currentItem.DanhMucCheckItemId) {
                return res.status(409).json({
                    message: "Mục kiểm chưa liên kết được với danh mục; vui lòng liên hệ quản trị để đối chiếu dữ liệu"
                });
            }

            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                await transaction.request()
                    .input("CheckItemId", sql.Int, checkItemId)
                    .input("KetQua", sql.NVarChar, ketQua)
                    .input("Defects", sql.NVarChar(sql.MAX), JSON.stringify(defects))
                    .input("GiaTriDo", sql.NVarChar(sql.MAX), giaTriDo)
                    .execute("sp_PhieuKiem_SaveCheckItem1");

                if (shouldUpdateCritical) {
                    await transaction.request()
                        .input("DanhMucCheckItemId", sql.Int, currentItem.DanhMucCheckItemId)
                        .input("DiemTrongYeu", sql.Bit, diemTrongYeu)
                        .query(`
                            UPDATE dbo.DM_CHECK_ITEM
                            SET DiemTrongYeu = @DiemTrongYeu
                            WHERE Id = @DanhMucCheckItemId;

                            UPDATE dbo.PHIEU_KIEM_CHECK_ITEM
                            SET DiemTrongYeu = @DiemTrongYeu
                            WHERE DanhMucCheckItemId = @DanhMucCheckItemId;
                        `);
                }

                await transaction.commit();
            } catch (transactionError) {
                await transaction.rollback();
                throw transactionError;
            }

            // Chỉ xoá file vật lý sau khi transaction lưu dữ liệu đã thành công.
            urlsToDelete.forEach(fileUrl => {
                try {
                    const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
                    const filePath = path.join(__dirname, '..', relativePath);

                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`Đã xoá file rác: ${filePath}`);
                    }
                } catch (unlinkError) {
                    console.error(`Lỗi khi xoá file ${fileUrl}:`, unlinkError);
                }
            });

            res.json({ success: true });

        } catch (err) {
            console.error('CheckItem save error:', err);
            res.status(500).json({
                message: "Lưu thất bại",
                error: err.message
            });
        }
    }
);

router.post(
    "/calculate-aql",
    authenticateToken,
    authorize("THUC_HIEN_KIEM"),
    async (req, res) => {
        const { sectionId } = req.body;

        try {
            const pool = await poolPromise;

            // Tự động cho các mục "Chưa kiểm" (KetQua IS NULL) thành "ĐẠT"
            await pool.request()
                .input("SectionId", sql.Int, sectionId)
                .query(`
                    UPDATE PHIEU_KIEM_CHECK_ITEM
                    SET KetQua = 'DAT'
                    WHERE SectionId = @SectionId AND KetQua IS NULL
                `);

            await pool.request()
                .input("SectionId", sql.Int, sectionId)
                .execute("sp_PhieuKiem_CalculateAQL");

            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Tính AQL thất bại" });
        }
    }
);
/* =========================================================
   POST /phieu-kiem/complete
   Role       : KCS
   Permission : THUC_HIEN_KIEM
========================================================= */
router.post(
    '/complete',
    authenticateToken,
    authorize('THUC_HIEN_KIEM'),
    async (req, res) => {
        const { phieuKiemId } = req.body;
        const userId = req.user.userId;

        if (!phieuKiemId) {
            return res.status(400).json({
                message: 'Missing phieuKiemId'
            });
        }

        if (!userId) {
            return res.status(400).json({
                message: 'Missing userId'
            });
        }
        try {
            const pool = await poolPromise;
            const quantityValidation = await pool.request()
                .input('PhieuKiemId', sql.Int, Number(phieuKiemId))
                .query(`
                    SELECT COALESCE(pk.SoLuongThucTe, pk.SoLuong, 0) AS SoLuongHieuLuc,
                        ISNULL(MAX(sectionRow.SoLuongKiem), 0) AS SoLuongMauLonNhat
                    FROM dbo.PHIEU_KIEM pk
                    LEFT JOIN dbo.PHIEU_KIEM_SECTION sectionRow ON sectionRow.PhieuKiemId = pk.Id
                    WHERE pk.Id = @PhieuKiemId
                    GROUP BY pk.SoLuongThucTe, pk.SoLuong
                `);
            const quantityInfo = quantityValidation.recordset[0];
            if (quantityInfo && Number(quantityInfo.SoLuongMauLonNhat || 0) > Number(quantityInfo.SoLuongHieuLuc || 0)) {
                return res.status(409).json({
                    message: 'Cỡ mẫu hiện tại vượt số lượng hiệu lực. Hãy cấu hình lại cỡ mẫu trước khi hoàn tất.'
                });
            }

            await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userId)
                .execute('sp_PhieuKiem_Complete');

            res.json({
                success: true
            });

        } catch (err) {
            console.error('CompletePhieuKiem error:', err);
            res.status(500).json({
                message: 'Hoàn tất phiếu kiểm thất bại'
            });
        }
    }
);

/* =========================================================
   POST /phieu-kiem/xac-nhan-px
   Role       : PX
   Permission : XAC_NHAN_PX
========================================================= */

router.post(
    '/xac-nhan-px',
    authenticateToken,
    authorize('XAC_NHAN_PX'),
    async (req, res) => {

        const { phieuKiemId } = req.body;
        const userId = req.user.userId;

        if (!phieuKiemId) {
            return res.status(400).json({
                message: 'Missing phieuKiemId'
            });
        }

        try {

            const pool = await poolPromise;

            await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userId)
                .execute('sp_PhieuKiem_XacNhanPX');

            res.json({
                success: true,
                message: 'Trưởng bộ phận đã xác nhận'
            });

        } catch (err) {

            console.error('XacNhanPX error:', err);

            res.status(500).json({
                message: 'Xác nhận trưởng bộ phận thất bại'
            });

        }

    }
);

/* =========================================================
   POST /phieu-kiem/xac-nhan-kiem-nghiem
   Role       : KIEM_NGHIEM
   Permission : XAC_NHAN_KIEM_NGHIEM
========================================================= */

router.post(
    '/xac-nhan-kiem-nghiem',
    authenticateToken,
    authorize('XAC_NHAN_KIEM_NGHIEM'),
    async (req, res) => {

        const { phieuKiemId } = req.body;
        const userId = req.user.userId;

        if (!phieuKiemId) {
            return res.status(400).json({
                message: 'Missing phieuKiemId'
            });
        }

        try {

            const pool = await poolPromise;

            await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('UserId', sql.Int, userId)
                .execute('sp_PhieuKiem_XacNhanKiemNghiem');

            res.json({
                success: true,
                message: 'Phòng kiểm nghiệm đã xác nhận'
            });

        } catch (err) {

            console.error('XacNhanKiemNghiem error:', err);

            res.status(500).json({
                message: 'Xác nhận phòng kiểm nghiệm thất bại'
            });

        }

    }
);

router.post(
    '/ket-luan',
    authenticateToken,
    authorize('KET_LUAN'),
    async (req, res) => {
        const { phieuKiemId, ketLuan } = req.body;

        if (!phieuKiemId || !ketLuan) {
            return res.status(400).json({
                message: 'Missing required fields'
            });
        }

        try {
            const pool = await poolPromise;

            await pool.request()
                .input('PhieuKiemId', sql.Int, phieuKiemId)
                .input('KetLuan', sql.NVarChar, ketLuan)
                .execute('sp_PhieuKiem_KetLuan');

            res.json({ success: true });

        } catch (err) {
            console.error('KetLuan error:', err);
            res.status(500).json({
                message: 'Kết luận thất bại'
            });
        }
    }
);


router.post('/custom-fields', async (req, res) => {
    try {
        const { phieuKiemId, fields } = req.body;

        // fields nhận được từ UI sẽ có dạng object: { NhaCungCap: "Cty A", KhachHang: "Cty B" }
        // Chuyển object fields thành string JSON để đẩy vào Stored
        const jsonString = JSON.stringify(fields);
        const pool = await poolPromise;
        await pool.request()
            .input('PhieuKiemId', sql.Int, phieuKiemId)
            .input('JsonData', sql.NVarChar(sql.MAX), jsonString)
            .execute('SP_Upsert_PhieuKiem_CustomFields');

        res.status(200).json({ success: true, message: 'Đã lưu thông tin fields' });
    } catch (error) {
        console.error("Lỗi lưu custom fields:", error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

/* =========================================================
   GET /phieu-kiem/:id/thong-so-kq
========================================================= */
router.get('/:id/thong-so-kq', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('PhieuKiemId', sql.Int, req.params.id)
            .execute('sp_PhieuKiem_ThongSo_GetResults');

        // result.recordsets[0] = Cấu hình thông số
        // result.recordsets[1] = Kết quả đã nhập
        res.json({
            thongSo: result.recordsets[0],
            ketQua: result.recordsets[1]
        });
    } catch (err) {
        console.error("Get thong-so-kq error:", err);
        res.status(500).json({ message: "Lỗi tải kết quả kiểm đặc biệt" });
    }
});

/* =========================================================
   POST /phieu-kiem/:id/thong-so-kq
========================================================= */
router.post('/:id/thong-so-kq', authenticateToken, authorize('THUC_HIEN_KIEM'), async (req, res) => {
    const phieuKiemId = req.params.id;
    const { results } = req.body; // Array of { ThongSoId, ThuTuMau, GiaTriDo, GhiChu }

    if (!Array.isArray(results)) {
        return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = new sql.Request(transaction);

            for (const item of results) {
                await request
                    .input('PhieuKiemId', sql.Int, phieuKiemId)
                    .input('ThongSoId', sql.Int, item.ThongSoId)
                    .input('ThuTuMau', sql.Int, item.ThuTuMau)
                    .input('GiaTriDo', sql.Float, item.GiaTriDo !== '' ? item.GiaTriDo : null)
                    .input('GhiChu', sql.NVarChar(255), item.GhiChu || null)
                    .execute('sp_PhieuKiem_ThongSo_SaveResult');

                // Clear parameters for next iteration
                request.parameters = {};
            }

            await transaction.commit();
            res.json({ success: true, message: "Đã lưu kết quả đo đạc thành công" });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error("Save thong-so-kq error:", err);
        res.status(500).json({ message: "Lỗi lưu kết quả kiểm đặc biệt" });
    }
});

module.exports = router;
