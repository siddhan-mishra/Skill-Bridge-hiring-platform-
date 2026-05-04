// server.js — main entry point
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const dotenv   = require('dotenv');

dotenv.config();

const app = express();

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ],
  credentials: true,
}));

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/authRoutes'));
app.use('/api/jobs',         require('./routes/jobRoutes'));
app.use('/api/profile',      require('./routes/profileRoutes'));
app.use('/api/matches',      require('./routes/matchRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/stats',        require('./routes/statsRoutes'));
app.use('/api/nlp',          require('./routes/nlpRoutes'));
app.use('/api/upload',       require('./routes/uploadRoutes'));

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[server] unhandled error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ── MongoDB + listen ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('FATAL: MONGO_URI not set in .env');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
