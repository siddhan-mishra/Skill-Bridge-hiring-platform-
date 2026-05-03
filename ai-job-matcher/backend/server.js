const express = require('express');
const cors    = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

const app  = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',         require('./routes/authRoutes'));
app.use('/api/profile',      require('./routes/profileRoutes'));
app.use('/api/jobs',         require('./routes/jobRoutes'));
app.use('/api/nlp',          require('./routes/nlpRoutes'));
app.use('/api/match',        require('./routes/matchRoutes'));
app.use('/api/upload',       require('./routes/uploadRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is LIVE!', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
