const express = require('express');
const router = express.Router();
const sql = require('mssql');

const { poolPromise } = require('../db');
const authenticateToken = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');

router.get('/san-pham', authenticateToken, async (req, res) => {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT Id, TenSanPham 
      FROM DM_SAN_PHAM 
      WHERE TrangThai = 1
  `);
    res.json(result.recordset);
});

router.get('/loai-kiem', authenticateToken, async (req, res) => {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT Id, TenLoai 
      FROM DM_LOAI_KIEM
  `);
    res.json(result.recordset);
});

router.get('/kcs', authenticateToken, async (req, res) => {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT u.Id, u.FullName
      FROM USERS u
      JOIN USER_ROLE ur ON u.Id = ur.UserId
      JOIN ROLES r ON ur.RoleId = r.Id
      WHERE r.RoleCode = 'KCS'
        AND u.TrangThai = 1
  `);
    res.json(result.recordset);
});

module.exports = router;