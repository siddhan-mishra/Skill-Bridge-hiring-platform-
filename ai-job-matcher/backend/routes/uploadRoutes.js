const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { cloudinary } = require('../config/cloudinary');
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
router.post('/resume', protect, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF files are accepted' });
    }

    // 1. Upload to Cloudinary first — fast, ~2-3s
    const result = await uploadToCloudinary(req.file.buffer, {
      folder:        'skillbridge/resumes',
      public_id:     `resume_${req.user._id}`,
      resource_type: 'raw',
      overwrite:     true,
    });

    // 2. Save resumeUrl immediately — don't wait for parsing
    await Profile.findOneAndUpdate(
      { user: req.user._id },
      { resumeUrl: result.secure_url, user: req.user._id },
      { upsert: true, new: true }
    );

    // 3. Call Python parser — with generous timeout
    //    If it fails, we still return resumeUrl so the file is saved
    const NLP_BASE = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename:    'resume.pdf',
      contentType: 'application/pdf',
    });

    let parsed = {};
    try {
      const nlpRes = await axios.post(`${NLP_BASE}/parse-resume`, form, {
        headers: form.getHeaders(),
        timeout: 120000,   // 2 minutes — Gemini is fast but give it room
      });
      parsed = nlpRes.data;
    } catch (nlpErr) {
      // Parsing failed but file is already saved — don't block the user
      console.error('NLP parse failed (file still saved):', nlpErr.message);
    }

    res.json({ resumeUrl: result.secure_url, parsed });

  } catch (err) {
    console.error('Resume upload error:', err);
    res.status(500).json({ message: err.message || 'Resume upload failed' });
  }
});

module.exports = router;
