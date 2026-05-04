const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
require('dotenv').config();

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── DB ────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });

// ── Routes ──────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/authRoutes'));
app.use('/api/profile',      require('./routes/profileRoutes'));
app.use('/api/jobs',         require('./routes/jobRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/matches',      require('./routes/matchRoutes'));
app.use('/api/resume',       require('./routes/resumeRoutes'));   // ← Step 4

// ── 404 handler ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` }));

// ── Global error handler ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[global error]', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
