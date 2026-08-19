const express = require("express");
const sql = require("mssql");

const { poolPromise } = require("../db");
const authenticateToken = require("../middlewares/auth.middleware");

const router = express.Router();

const toNumber = (value) => Number(value) || 0;
const asPositiveInteger = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};
const asDateOnly = (value) => {
    const text = String(value || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(`${text}T00:00:00`))
        ? text
        : null;
};
const dateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
const calculatePercentTrend = (current, previous) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return Math.round(((current - previous) / previous) * 1000) / 10;
};
const buildMetric = (current, previous) => ({
    value: toNumber(current),
    trend: calculatePercentTrend(toNumber(current), toNumber(previous))
});

router.get("/overview", authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        const defaultFrom = dateKey(today);
        const fromDate = asDateOnly(req.query.fromDate) || defaultFrom;
        const toDate = asDateOnly(req.query.toDate) || fromDate;

        if (fromDate > toDate) {
            return res.status(400).json({ message: "Từ ngày không được lớn hơn đến ngày" });
        }

        const from = new Date(`${fromDate}T00:00:00`);
        const to = new Date(`${toDate}T00:00:00`);
        const periodDays = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
        if (periodDays > 366) {
            return res.status(400).json({ message: "Khoảng thời gian tối đa là 366 ngày" });
        }

        const previousTo = new Date(from);
        previousTo.setDate(previousTo.getDate() - 1);
        const previousFrom = new Date(previousTo);
        previousFrom.setDate(previousFrom.getDate() - periodDays + 1);

        const loaiKiemId = asPositiveInteger(req.query.loaiKiemId);
        const boPhanId = asPositiveInteger(req.query.boPhanId);
        const sanPhamId = asPositiveInteger(req.query.sanPhamId);
        const resultFilter = ["PENDING", "COMPLETED", "PASSED", "FAILED"].includes(req.query.result)
            ? req.query.result
            : null;

        const pool = await poolPromise;
        const request = pool.request()
            .input("FromDate", sql.Date, fromDate)
            .input("ToDate", sql.Date, toDate)
            .input("PreviousFromDate", sql.Date, dateKey(previousFrom))
            .input("PreviousToDate", sql.Date, dateKey(previousTo))
            .input("LoaiKiemId", sql.Int, loaiKiemId)
            .input("BoPhanId", sql.Int, boPhanId)
            .input("SanPhamId", sql.Int, sanPhamId)
            .input("ResultFilter", sql.VarChar(20), resultFilter);

        const result = await request.query(`
            SET NOCOUNT ON;

            SELECT pk.Id,pk.SoPhieu,pk.SanPhamId,pk.LoaiKiemId,pk.TrangThai,pk.KetLuan,
                pk.CreatedAt,COALESCE(pk.NgayKiem,pk.CreatedAt) NgayDuLieu,
                COALESCE(sp.TenSanPham,N'Chưa xác định') TenSanPham,
                COALESCE(lk.TenLoai,N'Chưa xác định') TenLoai,
                COALESCE(headerRow.BoPhanDuyetId,creator.BoPhanId,checker.BoPhanId) BoPhanId,
                COALESCE(department.TenBoPhan,creator.BoPhan,checker.BoPhan,N'Chưa xác định') TenBoPhan,
                COALESCE(NULLIF(checker.FullName,N''),NULLIF(creator.FullName,N''),checker.Username,creator.Username,N'--') NguoiPhuTrach
            INTO #BasePk
            FROM dbo.PHIEU_KIEM pk
            LEFT JOIN dbo.DM_SAN_PHAM sp ON sp.Id=pk.SanPhamId
            LEFT JOIN dbo.DM_LOAI_KIEM lk ON lk.Id=pk.LoaiKiemId
            LEFT JOIN dbo.USERS creator ON creator.Id=pk.NguoiLapId
            LEFT JOIN dbo.USERS checker ON checker.Id=pk.NguoiKiemId
            LEFT JOIN dbo.PHIEU_KIEM_CONG_DOAN_HEADER headerRow ON headerRow.PhieuKiemId=pk.Id
            LEFT JOIN dbo.DM_BO_PHAN department
                ON department.Id=COALESCE(headerRow.BoPhanDuyetId,creator.BoPhanId,checker.BoPhanId);

            SELECT * INTO #FilteredPk FROM #BasePk
            WHERE NgayDuLieu>=@FromDate AND NgayDuLieu<DATEADD(DAY,1,@ToDate)
              AND (@LoaiKiemId IS NULL OR LoaiKiemId=@LoaiKiemId)
              AND (@BoPhanId IS NULL OR BoPhanId=@BoPhanId)
              AND (@SanPhamId IS NULL OR SanPhamId=@SanPhamId)
              AND (
                @ResultFilter IS NULL
                OR (@ResultFilter='PENDING' AND ISNULL(TrangThai,'') NOT IN ('HOAN_TAT','HOAN_THANH'))
                OR (@ResultFilter='COMPLETED' AND TrangThai IN ('HOAN_TAT','HOAN_THANH'))
                OR (@ResultFilter='PASSED' AND TrangThai IN ('HOAN_TAT','HOAN_THANH') AND KetLuan='DAT')
                OR (@ResultFilter='FAILED' AND KetLuan='KHONG_DAT')
              );

            SELECT * INTO #PreviousPk FROM #BasePk
            WHERE NgayDuLieu>=@PreviousFromDate AND NgayDuLieu<DATEADD(DAY,1,@PreviousToDate)
              AND (@LoaiKiemId IS NULL OR LoaiKiemId=@LoaiKiemId)
              AND (@BoPhanId IS NULL OR BoPhanId=@BoPhanId)
              AND (@SanPhamId IS NULL OR SanPhamId=@SanPhamId)
              AND (
                @ResultFilter IS NULL
                OR (@ResultFilter='PENDING' AND ISNULL(TrangThai,'') NOT IN ('HOAN_TAT','HOAN_THANH'))
                OR (@ResultFilter='COMPLETED' AND TrangThai IN ('HOAN_TAT','HOAN_THANH'))
                OR (@ResultFilter='PASSED' AND TrangThai IN ('HOAN_TAT','HOAN_THANH') AND KetLuan='DAT')
                OR (@ResultFilter='FAILED' AND KetLuan='KHONG_DAT')
              );

            SELECT sourceRow.PhieuKiemId,sourceRow.DefectId,
                COALESCE(sourceRow.DefectType,defect.DefectType,'UNKNOWN') DefectType,
                sourceRow.Quantity,sourceRow.ProcessName
            INTO #Defects
            FROM (
                SELECT sectionRow.PhieuKiemId,record.DefectId,record.DefectType,
                    ISNULL(record.SoLuong,0) Quantity,sectionRow.TenNhom ProcessName
                FROM dbo.PHIEU_KIEM_DEFECT record
                JOIN dbo.PHIEU_KIEM_SECTION sectionRow ON sectionRow.Id=record.SectionId
                UNION ALL
                SELECT planRow.PhieuKiemId,record.DefectId,NULL,ISNULL(record.SoLuong,0),planRow.TenQuyTrinhSanXuat
                FROM dbo.PHIEU_KIEM_CUOI_CHUYEN_DEFECT record
                JOIN dbo.PHIEU_KIEM_CUOI_CHUYEN_PLAN planRow ON planRow.Id=record.PlanId
                UNION ALL
                SELECT planRow.PhieuKiemId,record.DefectId,NULL,ISNULL(record.SoLuong,0),planRow.TenQuyTrinhSanXuat
                FROM dbo.PHIEU_KIEM_CONG_DOAN_DEFECT record
                JOIN dbo.PHIEU_KIEM_CONG_DOAN_PLAN planRow ON planRow.Id=record.PlanId
                UNION ALL
                SELECT slotRow.PhieuKiemId,record.DefectId,NULL,ISNULL(record.SoLuong,0),entryRow.CongDoan
                FROM dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY_DEFECT record
                JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_ENTRY entryRow ON entryRow.Id=record.EntryId
                JOIN dbo.PHIEU_KIEM_TREN_CHUYEN_SLOT slotRow ON slotRow.Id=entryRow.SlotId
            ) sourceRow
            LEFT JOIN dbo.DM_DEFECT defect ON defect.Id=sourceRow.DefectId;

            SELECT
                (SELECT COUNT(*) FROM #FilteredPk) TotalInspections,
                (SELECT COUNT(*) FROM #PreviousPk) PreviousTotalInspections,
                (SELECT COUNT(*) FROM #FilteredPk WHERE TrangThai IN ('HOAN_TAT','HOAN_THANH')) CompletedInspections,
                (SELECT COUNT(*) FROM #PreviousPk WHERE TrangThai IN ('HOAN_TAT','HOAN_THANH')) PreviousCompletedInspections,
                (SELECT COUNT(*) FROM #FilteredPk WHERE ISNULL(TrangThai,'') NOT IN ('HOAN_TAT','HOAN_THANH')) PendingInspections,
                (SELECT COUNT(*) FROM #PreviousPk WHERE ISNULL(TrangThai,'') NOT IN ('HOAN_TAT','HOAN_THANH')) PreviousPendingInspections,
                (SELECT COUNT(*) FROM #FilteredPk WHERE KetLuan='KHONG_DAT') FailedInspections,
                (SELECT COUNT(*) FROM #PreviousPk WHERE KetLuan='KHONG_DAT') PreviousFailedInspections,
                (SELECT COUNT(*) FROM #FilteredPk WHERE TrangThai IN ('HOAN_TAT','HOAN_THANH') AND KetLuan='DAT') PassedInspections,
                (SELECT COUNT(*) FROM #PreviousPk WHERE TrangThai IN ('HOAN_TAT','HOAN_THANH') AND KetLuan='DAT') PreviousPassedInspections,
                (SELECT COUNT(*) FROM dbo.BIEN_BAN_KIEM bb JOIN #FilteredPk pk ON pk.Id=bb.PhieuKiemId
                    WHERE bb.TrangThai NOT IN ('HOAN_TAT','BB_SXBT_HOAN_TAT')) OpenKph,
                (SELECT COUNT(*) FROM dbo.BIEN_BAN_KIEM bb JOIN #PreviousPk pk ON pk.Id=bb.PhieuKiemId
                    WHERE bb.TrangThai NOT IN ('HOAN_TAT','BB_SXBT_HOAN_TAT')) PreviousOpenKph;

            SELECT CONVERT(varchar(10),CAST(NgayDuLieu AS date),23) DateKey,
                COUNT(*) TotalCount,
                SUM(CASE WHEN TrangThai IN ('HOAN_TAT','HOAN_THANH') THEN 1 ELSE 0 END) CompletedCount,
                SUM(CASE WHEN TrangThai IN ('HOAN_TAT','HOAN_THANH') AND KetLuan='DAT' THEN 1 ELSE 0 END) PassedCount
            FROM #FilteredPk GROUP BY CAST(NgayDuLieu AS date) ORDER BY DateKey;

            SELECT
                SUM(CASE WHEN KetLuan='KHONG_DAT' THEN 1 ELSE 0 END) FailedCount,
                SUM(CASE WHEN TrangThai IN ('CHO_TBP_DUYET','CHO_XUONG_XAC_NHAN','CHO_KIEM_NGHIEM','CHO_SXBT_XAC_NHAN') THEN 1 ELSE 0 END) AwaitingDepartmentCount,
                SUM(CASE WHEN TrangThai='CHO_KHO_XAC_NHAN' THEN 1 ELSE 0 END) AwaitingWarehouseCount,
                (SELECT COUNT(DISTINCT bb.Id) FROM dbo.BIEN_BAN_KIEM bb
                    JOIN #FilteredPk pk ON pk.Id=bb.PhieuKiemId
                    JOIN dbo.BIEN_BAN_HANH_DONG actionRow ON actionRow.BienBanId=bb.Id
                    WHERE bb.TrangThai NOT IN ('HOAN_TAT','BB_SXBT_HOAN_TAT') AND actionRow.ThoiHan<CAST(GETDATE() AS date)) OverdueKphCount,
                (SELECT COUNT(DISTINCT defect.PhieuKiemId) FROM #Defects defect
                    JOIN #FilteredPk filtered ON filtered.Id=defect.PhieuKiemId) AffectedInspections
            FROM #FilteredPk;

            SELECT COALESCE(defect.DefectType,'UNKNOWN') DefectType,COUNT(*) Occurrences,SUM(defect.Quantity) Quantity
            FROM #Defects defect JOIN #FilteredPk pk ON pk.Id=defect.PhieuKiemId
            GROUP BY COALESCE(defect.DefectType,'UNKNOWN') ORDER BY Quantity DESC;

            SELECT TOP (8) defect.DefectId,COALESCE(catalog.MaLoi,'') MaLoi,
                COALESCE(catalog.TenLoi,N'Chưa xác định') TenLoi,
                COALESCE(defect.DefectType,catalog.DefectType,'UNKNOWN') DefectType,
                COUNT(*) Occurrences,SUM(defect.Quantity) Quantity,COUNT(DISTINCT defect.PhieuKiemId) AffectedInspections
            FROM #Defects defect JOIN #FilteredPk pk ON pk.Id=defect.PhieuKiemId
            LEFT JOIN dbo.DM_DEFECT catalog ON catalog.Id=defect.DefectId
            GROUP BY defect.DefectId,catalog.MaLoi,catalog.TenLoi,COALESCE(defect.DefectType,catalog.DefectType,'UNKNOWN')
            ORDER BY Quantity DESC,Occurrences DESC,TenLoi;

            SELECT pk.LoaiKiemId,pk.TenLoai,COUNT(*) TotalCount,
                SUM(CASE WHEN pk.TrangThai IN ('HOAN_TAT','HOAN_THANH') THEN 1 ELSE 0 END) CompletedCount,
                SUM(CASE WHEN pk.TrangThai IN ('HOAN_TAT','HOAN_THANH') AND pk.KetLuan='DAT' THEN 1 ELSE 0 END) PassedCount
            FROM #FilteredPk pk GROUP BY pk.LoaiKiemId,pk.TenLoai ORDER BY pk.TenLoai;

            SELECT TOP (8) pk.SanPhamId ItemId,pk.TenSanPham ItemName,COUNT(*) TotalCount,
                SUM(CASE WHEN pk.TrangThai IN ('HOAN_TAT','HOAN_THANH') THEN 1 ELSE 0 END) CompletedCount,
                SUM(CASE WHEN pk.TrangThai IN ('HOAN_TAT','HOAN_THANH') AND pk.KetLuan='DAT' THEN 1 ELSE 0 END) PassedCount,
                ISNULL(SUM(defectSummary.DefectQuantity),0) DefectQuantity
            FROM #FilteredPk pk
            OUTER APPLY (SELECT SUM(Quantity) DefectQuantity FROM #Defects d WHERE d.PhieuKiemId=pk.Id) defectSummary
            GROUP BY pk.SanPhamId,pk.TenSanPham ORDER BY DefectQuantity DESC,TotalCount DESC;

            SELECT TOP (8) pk.BoPhanId ItemId,pk.TenBoPhan ItemName,COUNT(*) TotalCount,
                SUM(CASE WHEN pk.TrangThai IN ('HOAN_TAT','HOAN_THANH') THEN 1 ELSE 0 END) CompletedCount,
                SUM(CASE WHEN pk.TrangThai IN ('HOAN_TAT','HOAN_THANH') AND pk.KetLuan='DAT' THEN 1 ELSE 0 END) PassedCount,
                ISNULL(SUM(defectSummary.DefectQuantity),0) DefectQuantity
            FROM #FilteredPk pk
            OUTER APPLY (SELECT SUM(Quantity) DefectQuantity FROM #Defects d WHERE d.PhieuKiemId=pk.Id) defectSummary
            GROUP BY pk.BoPhanId,pk.TenBoPhan ORDER BY DefectQuantity DESC,TotalCount DESC;

            SELECT TOP (8) NULL ItemId,COALESCE(NULLIF(defect.ProcessName,N''),N'Chưa xác định') ItemName,
                COUNT(DISTINCT defect.PhieuKiemId) TotalCount,0 CompletedCount,0 PassedCount,SUM(defect.Quantity) DefectQuantity
            FROM #Defects defect JOIN #FilteredPk pk ON pk.Id=defect.PhieuKiemId
            GROUP BY COALESCE(NULLIF(defect.ProcessName,N''),N'Chưa xác định') ORDER BY DefectQuantity DESC;

            SELECT TOP (10) pk.Id,pk.SoPhieu,pk.TenSanPham,pk.LoaiKiemId,pk.TenLoai,pk.TrangThai,pk.KetLuan,
                pk.NguoiPhuTrach,pk.NgayDuLieu,ISNULL(defectSummary.DefectQuantity,0) DefectQuantity
            FROM #FilteredPk pk
            OUTER APPLY (SELECT SUM(Quantity) DefectQuantity FROM #Defects d WHERE d.PhieuKiemId=pk.Id) defectSummary
            WHERE ISNULL(pk.TrangThai,'') NOT IN ('HOAN_TAT','HOAN_THANH') OR pk.KetLuan='KHONG_DAT' OR ISNULL(defectSummary.DefectQuantity,0)>0
            ORDER BY CASE WHEN pk.KetLuan='KHONG_DAT' THEN 0 WHEN ISNULL(defectSummary.DefectQuantity,0)>0 THEN 1 ELSE 2 END,
                pk.NgayDuLieu DESC,pk.Id DESC;

            SELECT Id,MaLoai,TenLoai FROM dbo.DM_LOAI_KIEM ORDER BY TenLoai;
            SELECT Id,MaBoPhan,TenBoPhan FROM dbo.DM_BO_PHAN WHERE ISNULL(TrangThai,1)=1 ORDER BY TenBoPhan;
            SELECT Id,MaSanPham,TenSanPham FROM dbo.DM_SAN_PHAM WHERE ISNULL(TrangThai,1)=1 ORDER BY TenSanPham;
        `);

        const raw = result.recordsets?.[0]?.[0] || {};
        const completed = toNumber(raw.CompletedInspections);
        const previousCompleted = toNumber(raw.PreviousCompletedInspections);
        const passed = toNumber(raw.PassedInspections);
        const previousPassed = toNumber(raw.PreviousPassedInspections);
        const passRate = completed ? Math.round((passed / completed) * 1000) / 10 : 0;
        const previousPassRate = previousCompleted ? Math.round((previousPassed / previousCompleted) * 1000) / 10 : 0;
        const actionRequired = result.recordsets?.[2]?.[0] || {};
        const byType = result.recordsets?.[3] || [];

        res.json({
            appliedFilters: { fromDate, toDate, loaiKiemId, boPhanId, sanPhamId, result: resultFilter },
            stats: {
                totalInspections: buildMetric(raw.TotalInspections, raw.PreviousTotalInspections),
                completedInspections: buildMetric(raw.CompletedInspections, raw.PreviousCompletedInspections),
                pendingInspections: buildMetric(raw.PendingInspections, raw.PreviousPendingInspections),
                passRate: { value: passRate, trend: Math.round((passRate - previousPassRate) * 10) / 10 },
                failedInspections: buildMetric(raw.FailedInspections, raw.PreviousFailedInspections),
                openKph: buildMetric(raw.OpenKph, raw.PreviousOpenKph)
            },
            qualityTrend: (result.recordsets?.[1] || []).map((row) => ({
                ...row,
                PassRate: toNumber(row.CompletedCount)
                    ? Math.round((toNumber(row.PassedCount) / toNumber(row.CompletedCount)) * 1000) / 10
                    : 0
            })),
            actionRequired,
            defectStats: {
                summary: {
                    totalQuantity: byType.reduce((sum, row) => sum + toNumber(row.Quantity), 0),
                    totalOccurrences: byType.reduce((sum, row) => sum + toNumber(row.Occurrences), 0),
                    affectedInspections: toNumber(actionRequired.AffectedInspections)
                },
                byType,
                topDefects: result.recordsets?.[4] || [],
                byInspectionType: (result.recordsets?.[5] || []).map((row) => ({
                    ...row,
                    PassRate: toNumber(row.CompletedCount)
                        ? Math.round((toNumber(row.PassedCount) / toNumber(row.CompletedCount)) * 1000) / 10
                        : 0
                }))
            },
            hotspots: {
                products: result.recordsets?.[6] || [],
                departments: result.recordsets?.[7] || [],
                processes: result.recordsets?.[8] || []
            },
            attentionItems: result.recordsets?.[9] || [],
            filterOptions: {
                inspectionTypes: result.recordsets?.[10] || [],
                departments: result.recordsets?.[11] || [],
                products: result.recordsets?.[12] || []
            }
        });
    } catch (err) {
        console.error("Get dashboard overview error:", err);
        res.status(500).json({ message: "Không tải được dữ liệu Dashboard" });
    }
});

module.exports = router;
