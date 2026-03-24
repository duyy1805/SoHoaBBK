const express = require('express');
const router = express.Router();
const sql = require('mssql');

const { poolPromise1 } = require('../db1');
const authenticateToken = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');


router.get(
    '/lich-dong-cont',
    authenticateToken,
    authorize('XEM_PHIEU_KIEM'),
    async (req, res) => {

        try {
            const {
                week,
                year,
                organizationGuid = null,
                closingScheduleGuid = null,
                closingScheduleNumber = null
            } = req.query;
            if (!week || !year) {
                return res.status(400).json({
                    message: 'Thiếu tham số week, year'
                });
            }

            const pool = await poolPromise1;
            const result = await pool.request()
                .input('ClosingScheduleGuid', closingScheduleGuid || null)
                .input('ClosingScheduleNumber', closingScheduleNumber || null)
                .input('OrganizationGuid', organizationGuid || 'B775310D-2F3A-409A-AE12-5B72C11B7C50')
                .input('Week', parseInt(week))
                .input('Years', parseInt(year))
                .execute('[Sale].[SP_ESAM_ClosingSchedule_LichDongCong_V2]');
            res.json(result.recordset);

        } catch (err) {
            console.error('Get ESAM LichDongCont error:', err);
            res.status(500).json({ message: 'Lỗi lấy lịch đóng cont ESAM' });
        }
    }
);


module.exports = router;