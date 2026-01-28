const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRouter = require('./routes/auth');

const app = express();
app.use(express.json());
app.use(cors());

app.use('/api/auth', authRouter);
app.use('/api/phieu-kiem', require('./routes/phieuKiem'));


app.get('/', (req, res) => res.send('Hello from server!'));

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));