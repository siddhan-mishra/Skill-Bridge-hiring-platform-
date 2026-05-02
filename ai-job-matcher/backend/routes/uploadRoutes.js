const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { protect } = require('../middleware/authMiddleware');
const cloudinary  = require('../config/cloudinary');
const Profile     = require('../models/profile');
const axios       = require('axios');

// multer — memory storage (buffer), no disk writes
const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('File type not allowed'));
  },
});

// ── Helper: upload buffer to Cloudinary ──────────────────────────────────
function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

// ── POST /api/upload/avatar ───────────────────────────────────────────────
// Accepts: image/jpeg, image/png, image/webp
// Returns: { avatarUrl }
router.post('/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const result = await uploadToCloudinary(req.file.buffer, {
      folder:    'skillbridge/avatars',
      public_id: `avatar_${req.user._id}`,
      overwrite: true,
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    });

    // save to profile
    await Profile.findOneAndUpdate(
      { user: req.user._id },
      { avatarUrl: result.secure_url, user: req.user._id },
      { upsert: true, new: true }
    );

    res.json({ avatarUrl: result.secure_url });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ message: err.message || 'Upload failed' });
  }
});

// ── POST /api/upload/resume ───────────────────────────────────────────────
// Accepts: application/pdf
// Returns: { resumeUrl, parsed } — parsed is the full extracted profile JSON
router.post('/resume', protect, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF files are accepted' });
    }

    // 1. Upload raw PDF to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder:        'skillbridge/resumes',
      public_id:     `resume_${req.user._id}`,
      resource_type: 'raw',
      overwrite:     true,
    });

    // 2. Send buffer to Python NLP service for full parsing
    const NLP_BASE = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename:    'resume.pdf',
      contentType: 'application/pdf',
    });

    const nlpRes = await axios.post(`${NLP_BASE}/parse-resume`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });

    const parsed = nlpRes.data; // { fullName, headline, skills, tools, ... }

    // 3. Save resumeUrl to profile (don't auto-save parsed fields — let user confirm)
    await Profile.findOneAndUpdate(
      { user: req.user._id },
      { resumeUrl: result.secure_url, user: req.user._id },
      { upsert: true, new: true }
    );

    res.json({ resumeUrl: result.secure_url, parsed });
  } catch (err) {
    console.error('Resume upload error:', err);
    res.status(500).json({ message: err.message || 'Resume parse failed' });
  }
});

module.exports = router;
