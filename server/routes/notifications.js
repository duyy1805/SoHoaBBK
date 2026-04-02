const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { poolPromise } = require('../db');
const authenticateToken = require('../middlewares/auth.middleware');

// Lấy danh sách thông báo của User
router.get('/', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('UserId', sql.Int, req.user.userId)
            .query(`
                SELECT * FROM NOTIFICATIONS 
                WHERE UserId = @UserId 
                ORDER BY CreatedAt DESC
            `);

        // Đếm số lượng chưa đọc
        const unreadCount = result.recordset.filter(n => !n.IsRead).length;

        res.json({
            notifications: result.recordset,
            unreadCount
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi tải thông báo' });
    }
});

// Đánh dấu 1 thông báo đã đọc
router.post('/:id/read', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('Id', sql.Int, req.params.id)
            .input('UserId', sql.Int, req.user.userId)
            .query('UPDATE NOTIFICATIONS SET IsRead = 1 WHERE Id = @Id AND UserId = @UserId');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật thông báo' });
    }
});

// Đánh dấu đã đọc tất cả
router.post('/read-all', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('UserId', sql.Int, req.user.userId)
            .query('UPDATE NOTIFICATIONS SET IsRead = 1 WHERE UserId = @UserId AND IsRead = 0');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật thông báo' });
    }
});

module.exports = router;