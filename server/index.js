const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Tạo thư mục uploads nếu chưa có
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const authRouter = require('./routes/auth');
const hrRouter = require('./routes/hr')
const app = express();
app.use(express.json());
app.use(cors());

app.use('/api/auth', authRouter);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/hr', hrRouter);
app.use('/api/phieu-kiem/cong-doan', require('./routes/phieuKiemCongDoan'));
app.use('/api/phieu-kiem', require('./routes/phieuKiem'));
app.use('/api/bien-ban', require('./routes/bienBanAttachments'));
app.use('/api/bien-ban', require('./routes/bienBan'));
app.use('/api/bien-ban-sxbt', require('./routes/bienBanSxbt'));
app.use('/api/phieu-xu-ly-khong-phu-hop', require('./routes/phieuXuLyKhongPhuHop'));
app.use('/api/lookup', require('./routes/lookup.routes'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/work-center', require('./routes/workCenter'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.send('Hello from server!'));

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
