const express = require("express");
const router = express.Router();
const sql = require("mssql");

const { poolPromise } = require("../db");
const authenticateToken = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/permission.middleware");

const hasPermission = (user, permissionCode) =>
    Array.isArray(user?.permissions) && user.permissions.includes(permissionCode);

const getEditState = async (pool, bienBanId) => {
    const result = await pool.request()
        .input("BienBanId", sql.Int, bienBanId)
        .query(`
            SELECT TOP 1
                ISNULL(MucDoKhongPhuHopConfirmed, 0) AS MucDoKhongPhuHopConfirmed
            FROM dbo.BIEN_BAN_KIEM
            WHERE Id = @BienBanId;

            SELECT TOP 1
                BoPhanId
            FROM dbo.BIEN_BAN_SXBT_CONFIRM_STEP
            WHERE BienBanId = @BienBanId
              AND TrangThai <> 'DA_XAC_NHAN'
            ORDER BY StepOrder;
        `);

    return {
        isFlowStarted: result.recordsets?.[0]?.[0]?.MucDoKhongPhuHopConfirmed === true ||
            result.recordsets?.[0]?.[0]?.MucDoKhongPhuHopConfirmed === 1,
        pendingBoPhanId: result.recordsets?.[1]?.[0]?.BoPhanId || null
    };
};

const canEditCurrentFlow = (editState, user) =>
    !editState.isFlowStarted ||
    Number(editState.pendingBoPhanId) === Number(user?.boPhanId);

router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const bienBanId = parseInt(req.params.id, 10);
        const pool = await poolPromise;
        const result = await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .input("UserId", sql.Int, req.user.userId)
            .input("BoPhanId", sql.Int, req.user.boPhanId || null)
            .execute("sp_BienBanSXBT_GetDetail");

        const extraInfoResult = await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .query(`
                SELECT TOP 1
                    bb.NguoiLapId,
                    bb.PhieuKiemId,
                    bb.DynamicFieldsJSON,
                    ulap.FullName AS NguoiTao,
                    COALESCE(bb.BoPhanTaoId, ulap.BoPhanId) AS BoPhanTaoId,
                    creatorDepartment.MaBoPhan AS MaBoPhanTao,
                    creatorDepartment.TenBoPhan AS TenBoPhanTao,
                    CASE
                        WHEN pk.SxbtKeHoachNhapId IS NOT NULL THEN N'KE_HOACH_NHAP'
                        ELSE N'LEGACY_PHIEU_NHAP'
                    END AS SxbtSourceType,
                    pk.SxbtKeHoachNhapId AS KeHoachNhapId,
                    COALESCE(pk.SxbtPhieuNhapBtpId,
                        CASE WHEN pk.SxbtKeHoachNhapId IS NULL THEN pk.SourceId END
                    ) AS PhieuNhapBtpId,
                    receipt.So_PhieuNhapBTP,
                    COALESCE(importPlan.Ngay_NhapBTP, receipt.Ngay_NhapBTP) AS Ngay_NhapBTP,
                    importPlan.Ngay_ThucTeSX,
                    COALESCE(planContractor.Ma_NhaThau, contractor.Ma_NhaThau) AS MaDonVi,
                    COALESCE(planContractor.Ma_NhaThau, contractor.Ma_NhaThau) AS Ma_NhaThau,
                    COALESCE(planUnit.Ten_DonVi, receiptUnit.Ten_DonVi) AS Ten_DonVi,
                    COALESCE(planDepartment.Ten_BoPhan, sourceDepartment.Ten_BoPhan) AS Ten_BoPhan,
                    orderRow.Ma_DonHang,
                    productionLot.So_LoSanXuat,
                    processRow.Ten_QuyTrinhSanXuat,
                    ISNULL(bb.MucDoKhongPhuHopConfirmed, 0) AS MucDoKhongPhuHopConfirmed
                FROM dbo.BIEN_BAN_KIEM bb
                LEFT JOIN dbo.USERS ulap ON ulap.Id = bb.NguoiLapId
                LEFT JOIN dbo.DM_BO_PHAN creatorDepartment
                    ON creatorDepartment.Id = COALESCE(bb.BoPhanTaoId, ulap.BoPhanId)
                LEFT JOIN dbo.PHIEU_KIEM pk ON pk.Id = bb.PhieuKiemId
                LEFT JOIN TAG_QTKD.dbo.PhieuNhapBTP receipt
                    ON receipt.ID_PhieuNhapBTP = COALESCE(
                        pk.SxbtPhieuNhapBtpId,
                        CASE WHEN pk.SxbtKeHoachNhapId IS NULL THEN pk.SourceId END
                    )
                LEFT JOIN TAG_System.dbo.DM_DonVi receiptUnit
                    ON receiptUnit.ID_DonVi = receipt.ID_DonVi
                LEFT JOIN TAG_System.dbo.DM_BoPhan sourceDepartment
                    ON sourceDepartment.ID_BoPhan = receipt.ID_BoPhan
                LEFT JOIN TAG_QTKD.dbo.DM_NhaThau contractor
                    ON contractor.ID_BoPhan = sourceDepartment.ID_BoPhan
                LEFT JOIN TAG_QLSX.dbo.KeHoachSanXuat_NhaThau_ThamChieu_Nhap importPlan
                    ON importPlan.ID_TuTang = pk.SxbtKeHoachNhapId
                LEFT JOIN TAG_QLSX.dbo.KeHoachSanXuat productionPlan
                    ON productionPlan.ID_KeHoachSanXuat = importPlan.ID_KeHoachSanXuat
                LEFT JOIN TAG_QLSX.dbo.LenhSanXuat productionOrder
                    ON productionOrder.ID_LenhSanXuat = productionPlan.ID_LenhSanXuat
                LEFT JOIN TAG_QTKD.dbo.DonHang orderRow
                    ON orderRow.ID_DonHang = productionOrder.ID_DonHang
                LEFT JOIN TAG_QTKD.dbo.DonHang_LoSanXuat productionLot
                    ON productionLot.ID_DonHang_LoSanXuat = NULLIF(importPlan.ID_DonHang_LoSanXuat, 0)
                LEFT JOIN TAG_QTKD.dbo.DM_QuyTrinhSanXuat processRow
                    ON processRow.ID_QuyTrinhSanXuat = productionPlan.ID_QuyTrinhSanXuat
                LEFT JOIN TAG_System.dbo.DM_DonVi planUnit
                    ON planUnit.ID_DonVi = productionOrder.ID_DonVi
                LEFT JOIN TAG_System.dbo.DM_BoPhan planDepartment
                    ON planDepartment.ID_BoPhan = productionPlan.ID_BoPhan
                LEFT JOIN TAG_QTKD.dbo.DM_NhaThau planContractor
                    ON planContractor.ID_BoPhan = productionPlan.ID_BoPhan
                WHERE bb.Id = @BienBanId
            `);

        const recordsets = result.recordsets || [];
        const baseInfo = recordsets[0]?.[0] || null;
        const extraInfo = extraInfoResult.recordset?.[0] || {};
        let dynamicFields = [];

        if (extraInfo?.DynamicFieldsJSON) {
            try {
                dynamicFields = JSON.parse(extraInfo.DynamicFieldsJSON);
            } catch (e) {
                console.error("Lỗi parse DynamicFieldsJSON SXBT:", e);
            }
        }

        delete extraInfo.DynamicFieldsJSON;
        const confirmSteps = recordsets[4] || [];
        const confirmedUserIds = [...new Set(
            confirmSteps
                .map((step) => step?.ConfirmedBy)
                .filter((value) => Number.isInteger(value) || (typeof value === "number" && !Number.isNaN(value)))
        )];

        let userNameMap = new Map();
        if (confirmedUserIds.length > 0) {
            const confirmedUsersResult = await pool.request()
                .query(`
                    SELECT Id, FullName, Username
                    FROM dbo.USERS
                    WHERE Id IN (${confirmedUserIds.join(",")})
                `);

            userNameMap = new Map(
                (confirmedUsersResult.recordset || []).map((user) => [
                    Number(user.Id),
                    user.FullName || user.Username || ""
                ])
            );
        }

        res.json({
            info: baseInfo ? { ...baseInfo, ...extraInfo } : null,
            defects: recordsets[1] || [],
            xuLyRows: recordsets[2] || [],
            hanhDong: recordsets[3] || [],
            dynamicFields,
            confirmSteps: confirmSteps.map((step) => ({
                ...step,
                TenNguoiXacNhan: step?.ConfirmedBy ? userNameMap.get(Number(step.ConfirmedBy)) || "" : ""
            }))
        });
    } catch (err) {
        console.error("GetBienBanSxbtDetail error:", err);
        res.status(500).json({ message: "Không tải được biên bản SXBT" });
    }
});

router.post("/:id/save-draft-by-tpb8", authenticateToken, async (req, res) => {
    try {
        const bienBanId = parseInt(req.params.id, 10);
        const { moTaChung, mucDoKhongPhuHop, xuLyRows, hanhDong } = req.body;

        if (mucDoKhongPhuHop && !["B", "C"].includes(mucDoKhongPhuHop)) {
            return res.status(400).json({ message: "Mức độ không phù hợp không hợp lệ" });
        }

        const pool = await poolPromise;
        const editState = await getEditState(pool, bienBanId);

        if (!canEditCurrentFlow(editState, req.user)) {
            return res.status(403).json({ message: "Không đúng lượt nhập thông tin của bộ phận" });
        }

        const lockResult = await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .query(`
                SELECT TOP 1
                    ISNULL(MucDoKhongPhuHopConfirmed, 0) AS MucDoKhongPhuHopConfirmed,
                    MucDoKhongPhuHop
                FROM dbo.BIEN_BAN_KIEM
                WHERE Id = @BienBanId
            `);

        const lockInfo = lockResult.recordset?.[0];
        const isMucDoLocked = lockInfo?.MucDoKhongPhuHopConfirmed === true || lockInfo?.MucDoKhongPhuHopConfirmed === 1;
        const lockedMucDo = lockInfo?.MucDoKhongPhuHop || null;

        if (isMucDoLocked && mucDoKhongPhuHop && lockedMucDo && mucDoKhongPhuHop !== lockedMucDo) {
            return res.status(400).json({
                message: `Mức độ đã được xác nhận là ${lockedMucDo}, không thể thay đổi`
            });
        }

        await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .input("MoTaChung", sql.NVarChar(sql.MAX), moTaChung || null)
            .input("MucDoKhongPhuHop", sql.NVarChar(1), isMucDoLocked ? lockedMucDo : (mucDoKhongPhuHop || null))
            .input("XuLyRowsJson", sql.NVarChar(sql.MAX), JSON.stringify(Array.isArray(xuLyRows) ? xuLyRows : []))
            .input("HanhDongJson", sql.NVarChar(sql.MAX), JSON.stringify(Array.isArray(hanhDong) ? hanhDong : []))
            .input("UserId", sql.Int, req.user.userId)
            .execute("sp_BienBanSXBT_SaveDraftByTPB8");

        res.json({ success: true });
    } catch (err) {
        console.error("SaveBienBanSxbtDraft error:", err);
        res.status(500).json({ message: err.message || "Không lưu được draft biên bản SXBT" });
    }
});

router.post("/:id/confirm-muc-do", authenticateToken, async (req, res) => {
    try {
        const bienBanId = parseInt(req.params.id, 10);
        const { mucDoKhongPhuHop } = req.body;

        if (!["B", "C"].includes(mucDoKhongPhuHop)) {
            return res.status(400).json({ message: "Mức độ không phù hợp không hợp lệ" });
        }

        const canConfirm =
            hasPermission(req.user, "THUC_HIEN_KIEM") ||
            hasPermission(req.user, "KET_LUAN") ||
            hasPermission(req.user, "QUAN_TRI_DM");

        if (!canConfirm) {
            return res.status(403).json({ message: "Bạn không có quyền xác nhận mức độ không phù hợp" });
        }

        const pool = await poolPromise;
        const lockResult = await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .query(`
                SELECT TOP 1
                    ISNULL(MucDoKhongPhuHopConfirmed, 0) AS MucDoKhongPhuHopConfirmed,
                    MucDoKhongPhuHop
                FROM dbo.BIEN_BAN_KIEM
                WHERE Id = @BienBanId
            `);

        const lockInfo = lockResult.recordset?.[0];
        const isLocked = lockInfo?.MucDoKhongPhuHopConfirmed === true || lockInfo?.MucDoKhongPhuHopConfirmed === 1;

        if (isLocked) {
            return res.status(400).json({
                message: `Mức độ đã được xác nhận là ${lockInfo?.MucDoKhongPhuHop || "---"}, không thể xác nhận lại`
            });
        }

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const templateResult = await new sql.Request(transaction)
                .input("MucDoKhongPhuHop", sql.NVarChar(1), mucDoKhongPhuHop)
                .query(`
                    SELECT
                        @MucDoKhongPhuHop AS MucDo,
                        bp.Id AS BoPhanId,
                        v.StepOrder
                    FROM (VALUES
                        ('B', 'B8', 1),
                        ('B', 'SXBT', 2),
                        ('C', 'B8', 1),
                        ('C', 'SXBT', 2),
                        ('C', 'B7', 3),
                        ('C', 'GD', 4)
                    ) v(MucDo, MaBoPhan, StepOrder)
                    JOIN dbo.DM_BO_PHAN bp ON bp.MaBoPhan = v.MaBoPhan
                    WHERE v.MucDo = @MucDoKhongPhuHop
                    ORDER BY v.StepOrder;
                `);

            const steps = templateResult.recordset || [];
            const expectedStepCount = mucDoKhongPhuHop === "B" ? 2 : 4;

            if (steps.length !== expectedStepCount) {
                throw new Error("Thiếu cấu hình bộ phận B8/SXBT/B7/GD");
            }

            await new sql.Request(transaction)
                .input("BienBanId", sql.Int, bienBanId)
                .input("MucDoKhongPhuHop", sql.NVarChar(1), mucDoKhongPhuHop)
                .query(`
                    UPDATE dbo.BIEN_BAN_KIEM
                    SET MucDoKhongPhuHop = @MucDoKhongPhuHop,
                        MucDoKhongPhuHopConfirmed = 1,
                        TrangThai = 'BB_SXBT_CHO_XAC_NHAN'
                    WHERE Id = @BienBanId;

                    DELETE FROM dbo.BIEN_BAN_SXBT_CONFIRM_STEP
                    WHERE BienBanId = @BienBanId;
                `);

            for (const step of steps) {
                await new sql.Request(transaction)
                    .input("BienBanId", sql.Int, bienBanId)
                    .input("MucDo", sql.NVarChar(1), step.MucDo)
                    .input("BoPhanId", sql.Int, step.BoPhanId)
                    .input("StepOrder", sql.Int, step.StepOrder)
                    .query(`
                        INSERT INTO dbo.BIEN_BAN_SXBT_CONFIRM_STEP
                            (BienBanId, MucDo, BoPhanId, StepOrder, TrangThai)
                        VALUES
                            (@BienBanId, @MucDo, @BoPhanId, @StepOrder, 'CHO_XAC_NHAN');
                    `);
            }

            await transaction.commit();
        } catch (innerErr) {
            await transaction.rollback();
            throw innerErr;
        }

        res.json({ success: true });
    } catch (err) {
        console.error("ConfirmBienBanSxbtMucDo error:", err);
        res.status(500).json({ message: err.message || "Không thể xác nhận mức độ không phù hợp" });
    }
});

router.post("/:id/xu-ly-row", authenticateToken, async (req, res) => {
    try {
        const bienBanId = parseInt(req.params.id, 10);
        const { mucDo, chiPhi, noiDung, boPhanTrachNhiemId, thoiHan } = req.body;

        if (!["B", "C"].includes(mucDo)) {
            return res.status(400).json({ message: "Mức độ không phù hợp không hợp lệ" });
        }

        const pool = await poolPromise;
        const editState = await getEditState(pool, bienBanId);

        if (!canEditCurrentFlow(editState, req.user)) {
            return res.status(403).json({ message: "Không đúng lượt nhập thông tin của bộ phận" });
        }
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        try {
            const boPhanResult = boPhanTrachNhiemId
                ? await new sql.Request(transaction)
                    .input("BoPhanId", sql.Int, boPhanTrachNhiemId)
                    .query(`
                        SELECT TOP 1
                            Id,
                            MaBoPhan,
                            TenBoPhan
                        FROM dbo.DM_BO_PHAN
                        WHERE Id = @BoPhanId
                    `)
                : { recordset: [] };

            const boPhan = boPhanResult.recordset?.[0] || null;
            const traCNhiemText = boPhan
                ? `${boPhan.MaBoPhan} - ${boPhan.TenBoPhan}`
                : null;

            const sortOrderResult = await new sql.Request(transaction)
                .input("BienBanId", sql.Int, bienBanId)
                .input("MucDo", sql.NVarChar(1), mucDo || null)
                .query(`
                    SELECT ISNULL(MAX(SortOrder), 0) + 1 AS NextSortOrder
                    FROM dbo.BIEN_BAN_SXBT_XULY_ROW
                    WHERE BienBanId = @BienBanId
                      AND MucDo = @MucDo
                `);

            const sortOrder = sortOrderResult.recordset?.[0]?.NextSortOrder || 1;
            const rowCode = `ROW_${sortOrder}`;

            const insertRequest = new sql.Request(transaction)
                .input("BienBanId", sql.Int, bienBanId)
                .input("MucDo", sql.NVarChar(1), mucDo || null)
                .input("RowCode", sql.NVarChar(50), rowCode)
                .input("ChiPhi", sql.NVarChar(255), chiPhi || null)
                .input("NoiDung", sql.NVarChar(sql.MAX), noiDung || null)
                .input("TrachNhiem", sql.NVarChar(255), traCNhiemText)
                .input("ThoiHan", sql.Date, thoiHan || null)
                .input("SortOrder", sql.Int, sortOrder)
                .input("NguoiNhapId", sql.Int, req.user.userId);

            if (boPhanResult.recordset?.[0]) {
                insertRequest.input("BoPhanTrachNhiemId", sql.Int, boPhanTrachNhiemId);
            }

            const tableSchemaResult = await new sql.Request(transaction).query(`
                SELECT CASE
                    WHEN COL_LENGTH('dbo.BIEN_BAN_SXBT_XULY_ROW', 'TieuMuc') IS NULL THEN 0
                    ELSE 1
                END AS HasTieuMuc,
                CASE
                    WHEN COL_LENGTH('dbo.BIEN_BAN_SXBT_XULY_ROW', 'NguoiNhapId') IS NULL THEN 0
                    ELSE 1
                END AS HasNguoiNhapId
            `);

            const hasTieuMuc = tableSchemaResult.recordset?.[0]?.HasTieuMuc === 1;
            const hasNguoiNhapId = tableSchemaResult.recordset?.[0]?.HasNguoiNhapId === 1;

            if (hasTieuMuc && hasNguoiNhapId) {
                await insertRequest.query(`
                    INSERT INTO dbo.BIEN_BAN_SXBT_XULY_ROW (
                        BienBanId,
                        MucDo,
                        RowCode,
                        TieuMuc,
                        ChiPhi,
                        NoiDung,
                        TrachNhiem,
                        ThoiHan,
                        SortOrder,
                        NguoiNhapId,
                        UpdatedAt
                    )
                    VALUES (
                        @BienBanId,
                        @MucDo,
                        @RowCode,
                        NULL,
                        @ChiPhi,
                        @NoiDung,
                        @TrachNhiem,
                        @ThoiHan,
                        @SortOrder,
                        @NguoiNhapId,
                        GETDATE()
                    )
                `);
            } else if (hasTieuMuc) {
                await insertRequest.query(`
                    INSERT INTO dbo.BIEN_BAN_SXBT_XULY_ROW (
                        BienBanId,
                        MucDo,
                        RowCode,
                        TieuMuc,
                        ChiPhi,
                        NoiDung,
                        TrachNhiem,
                        ThoiHan,
                        SortOrder,
                        UpdatedAt
                    )
                    VALUES (
                        @BienBanId,
                        @MucDo,
                        @RowCode,
                        NULL,
                        @ChiPhi,
                        @NoiDung,
                        @TrachNhiem,
                        @ThoiHan,
                        @SortOrder,
                        GETDATE()
                    )
                `);
            } else if (hasNguoiNhapId) {
                await insertRequest.query(`
                    INSERT INTO dbo.BIEN_BAN_SXBT_XULY_ROW (
                        BienBanId,
                        MucDo,
                        RowCode,
                        ChiPhi,
                        NoiDung,
                        TrachNhiem,
                        ThoiHan,
                        SortOrder,
                        NguoiNhapId,
                        UpdatedAt
                    )
                    VALUES (
                        @BienBanId,
                        @MucDo,
                        @RowCode,
                        @ChiPhi,
                        @NoiDung,
                        @TrachNhiem,
                        @ThoiHan,
                        @SortOrder,
                        @NguoiNhapId,
                        GETDATE()
                    )
                `);
            } else {
                await insertRequest.query(`
                    INSERT INTO dbo.BIEN_BAN_SXBT_XULY_ROW (
                        BienBanId,
                        MucDo,
                        RowCode,
                        ChiPhi,
                        NoiDung,
                        TrachNhiem,
                        ThoiHan,
                        SortOrder,
                        UpdatedAt
                    )
                    VALUES (
                        @BienBanId,
                        @MucDo,
                        @RowCode,
                        @ChiPhi,
                        @NoiDung,
                        @TrachNhiem,
                        @ThoiHan,
                        @SortOrder,
                        GETDATE()
                    )
                `);
            }

            await transaction.commit();
        } catch (innerErr) {
            await transaction.rollback();
            throw innerErr;
        }

        res.json({ success: true });
    } catch (err) {
        console.error("AddBienBanSxbtXuLyRow error:", err);
        res.status(500).json({ message: err.message || "Không thêm được phương án xử lý SXBT" });
    }
});

router.post("/:id/submit", authenticateToken, authorize("KET_LUAN"), async (req, res) => {
    try {
        const bienBanId = parseInt(req.params.id, 10);
        const pool = await poolPromise;
        await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .input("UserId", sql.Int, req.user.userId)
            .execute("sp_BienBanSXBT_Submit");

        res.json({ success: true });
    } catch (err) {
        console.error("SubmitBienBanSxbt error:", err);
        res.status(500).json({ message: err.message || "Không thể trình xác nhận biên bản SXBT" });
    }
});

router.post("/:id/confirm-step", authenticateToken, async (req, res) => {
    try {
        const bienBanId = parseInt(req.params.id, 10);
        const pool = await poolPromise;
        await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .input("UserId", sql.Int, req.user.userId)
            .input("BoPhanId", sql.Int, req.user.boPhanId || null)
            .execute("sp_BienBanSXBT_ConfirmStep");

        res.json({ success: true });
    } catch (err) {
        console.error("ConfirmBienBanSxbtStep error:", err);
        res.status(500).json({ message: err.message || "Không thể xác nhận bước SXBT" });
    }
});

router.post("/:id/complete", authenticateToken, authorize("KET_LUAN"), async (req, res) => {
    try {
        const bienBanId = parseInt(req.params.id, 10);
        const pool = await poolPromise;
        await pool.request()
            .input("BienBanId", sql.Int, bienBanId)
            .input("UserId", sql.Int, req.user.userId)
            .execute("sp_BienBanSXBT_Complete");

        res.json({ success: true });
    } catch (err) {
        console.error("CompleteBienBanSxbt error:", err);
        res.status(500).json({ message: err.message || "Không thể hoàn tất biên bản SXBT" });
    }
});

module.exports = router;
