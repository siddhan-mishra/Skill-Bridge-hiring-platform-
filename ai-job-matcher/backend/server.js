const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// connect to DB
connectDB();

// middleware
app.use(cors());
app.use(express.json());
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/nlp', require('./routes/nlpRoutes'));
app.use('/api/match', require('./routes/matchRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));





app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is LIVE!', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
