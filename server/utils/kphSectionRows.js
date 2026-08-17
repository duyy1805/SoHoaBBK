const sql = require("mssql");

const loadKphSectionRows = async (executor, bienBanId) => {
    const result = await new sql.Request(executor)
        .input("BienBanId", sql.Int, Number(bienBanId))
        .query(`
            SELECT
                cost.Id, cost.BienBanId, cost.LoaiChiPhi, cost.GiaTri,
                cost.ThoiHan, cost.CreatedBy, cost.CreatedAt, cost.BoPhanId,
                cost.TheoDoiBy, cost.TrachNhiem, cost.TheoDoi,
                rowDepartment.MaBoPhan, rowDepartment.TenBoPhan,
                creator.FullName AS NguoiXuLy,
                follower.FullName AS NguoiTheoDoi,
                COALESCE(
                    NULLIF(LTRIM(RTRIM(cost.TrachNhiem)), N''),
                    NULLIF(LTRIM(RTRIM(rowDepartment.TenBoPhan)), N''),
                    NULLIF(LTRIM(RTRIM(creatorDepartment.TenBoPhan)), N''),
                    rowDepartment.MaBoPhan,
                    creatorDepartment.MaBoPhan
                ) AS TrachNhiemHienThi,
                COALESCE(
                    NULLIF(LTRIM(RTRIM(cost.TheoDoi)), N''),
                    NULLIF(LTRIM(RTRIM(rowDepartment.TenBoPhan)), N''),
                    NULLIF(LTRIM(RTRIM(creatorDepartment.TenBoPhan)), N''),
                    rowDepartment.MaBoPhan,
                    creatorDepartment.MaBoPhan
                ) AS TheoDoiHienThi
            FROM dbo.BIEN_BAN_CHI_PHI AS cost
            LEFT JOIN dbo.USERS AS creator ON creator.Id = cost.CreatedBy
            LEFT JOIN dbo.USERS AS follower ON follower.Id = cost.TheoDoiBy
            LEFT JOIN dbo.DM_BO_PHAN AS rowDepartment ON rowDepartment.Id = cost.BoPhanId
            LEFT JOIN dbo.DM_BO_PHAN AS creatorDepartment ON creatorDepartment.Id = creator.BoPhanId
            WHERE cost.BienBanId = @BienBanId
            ORDER BY cost.CreatedAt, cost.Id;

            SELECT
                actionRow.Id, actionRow.BienBanId, actionRow.NoiDung,
                actionRow.BoPhanId, actionRow.ThoiHan, actionRow.TheoDoi,
                actionRow.CreatedBy, actionRow.CreatedAt, actionRow.TheoDoiBy,
                actionRow.TrachNhiem,
                rowDepartment.MaBoPhan, rowDepartment.TenBoPhan,
                creator.FullName AS NguoiXuLy,
                follower.FullName AS NguoiTheoDoi,
                COALESCE(
                    NULLIF(LTRIM(RTRIM(actionRow.TrachNhiem)), N''),
                    NULLIF(LTRIM(RTRIM(rowDepartment.TenBoPhan)), N''),
                    NULLIF(LTRIM(RTRIM(creatorDepartment.TenBoPhan)), N''),
                    rowDepartment.MaBoPhan,
                    creatorDepartment.MaBoPhan
                ) AS TrachNhiemHienThi,
                COALESCE(
                    NULLIF(LTRIM(RTRIM(actionRow.TheoDoi)), N''),
                    NULLIF(LTRIM(RTRIM(rowDepartment.TenBoPhan)), N''),
                    NULLIF(LTRIM(RTRIM(creatorDepartment.TenBoPhan)), N''),
                    rowDepartment.MaBoPhan,
                    creatorDepartment.MaBoPhan
                ) AS TheoDoiHienThi
            FROM dbo.BIEN_BAN_HANH_DONG AS actionRow
            LEFT JOIN dbo.USERS AS creator ON creator.Id = actionRow.CreatedBy
            LEFT JOIN dbo.USERS AS follower ON follower.Id = actionRow.TheoDoiBy
            LEFT JOIN dbo.DM_BO_PHAN AS rowDepartment ON rowDepartment.Id = actionRow.BoPhanId
            LEFT JOIN dbo.DM_BO_PHAN AS creatorDepartment ON creatorDepartment.Id = creator.BoPhanId
            WHERE actionRow.BienBanId = @BienBanId
            ORDER BY actionRow.CreatedAt, actionRow.Id;
        `);

    return {
        chiPhi: result.recordsets?.[0] || [],
        hanhDong: result.recordsets?.[1] || []
    };
};

module.exports = { loadKphSectionRows };
