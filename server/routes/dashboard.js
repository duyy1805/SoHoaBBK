const express = require("express");

const { poolPromise } = require("../db");
const authenticateToken = require("../middlewares/auth.middleware");

const router = express.Router();

const toNumber = (value) => Number(value) || 0;

const calculatePercentTrend = (current, previous) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return Math.round(((current - previous) / previous) * 1000) / 10;
};

const emptyDefectStats = {
    summary: {
        totalQuantity: 0,
        totalOccurrences: 0,
        affectedInspections: 0
    },
    byType: [],
    byInspectionType: [],
    topDefects: []
};

router.get("/overview", authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute("sp_Dashboard_GetOverview");
        const defectStatsResult = await pool.request().execute("sp_Dashboard_GetDefectStats");
        const rawStats = result.recordsets?.[0]?.[0] || {};
        const rawDefectSummary = defectStatsResult.recordsets?.[0]?.[0] || {};

        const currentCompleted = toNumber(rawStats.CurrentCompletedInspections);
        const currentPassed = toNumber(rawStats.CurrentPassedInspections);
        const previousCompleted = toNumber(rawStats.PreviousCompletedInspections);
        const previousPassed = toNumber(rawStats.PreviousPassedInspections);
        const currentPassRate = currentCompleted > 0
            ? Math.round((currentPassed / currentCompleted) * 1000) / 10
            : 0;
        const previousPassRate = previousCompleted > 0
            ? Math.round((previousPassed / previousCompleted) * 1000) / 10
            : 0;

        const totalInspections = toNumber(rawStats.CurrentTotalInspections);
        const previousTotalInspections = toNumber(rawStats.PreviousTotalInspections);
        const pendingInspections = toNumber(rawStats.CurrentPendingInspections);
        const previousPendingInspections = toNumber(rawStats.PreviousPendingInspections);
        const defectReports = toNumber(rawStats.CurrentDefectReports);
        const previousDefectReports = toNumber(rawStats.PreviousDefectReports);

        res.json({
            stats: {
                totalInspections: {
                    value: totalInspections,
                    trend: calculatePercentTrend(totalInspections, previousTotalInspections)
                },
                pendingInspections: {
                    value: pendingInspections,
                    trend: calculatePercentTrend(pendingInspections, previousPendingInspections)
                },
                passRate: {
                    value: currentPassRate,
                    trend: Math.round((currentPassRate - previousPassRate) * 10) / 10
                },
                defectReports: {
                    value: defectReports,
                    trend: calculatePercentTrend(defectReports, previousDefectReports)
                }
            },
            recentInspections: result.recordsets?.[1] || [],
            weeklyCompleted: result.recordsets?.[2] || [],
            defectStats: {
                ...emptyDefectStats,
                summary: {
                    totalQuantity: toNumber(rawDefectSummary.TotalQuantity),
                    totalOccurrences: toNumber(rawDefectSummary.TotalOccurrences),
                    affectedInspections: toNumber(rawDefectSummary.AffectedInspections)
                },
                byType: defectStatsResult.recordsets?.[1] || [],
                byInspectionType: defectStatsResult.recordsets?.[2] || [],
                topDefects: defectStatsResult.recordsets?.[3] || []
            }
        });
    } catch (err) {
        console.error("Get dashboard overview error:", err);
        res.status(500).json({ message: "Không tải được dữ liệu Dashboard" });
    }
});

module.exports = router;
