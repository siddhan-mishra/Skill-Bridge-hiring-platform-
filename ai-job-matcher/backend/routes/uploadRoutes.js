const express      = require('express');
const router       = express.Router();
const multer       = require('multer');
const { protect }  = require('../middleware/authMiddleware');
const { cloudinary } = require('../config/cloudinary');
const Profile      = require('../models/profile');
const axios        = require('axios');
const FormData     = require('form-data');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('File type not allowed'));
  },
});

function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

// ── POST /api/upload/avatar ──────────────────────────────────────────────────
router.post('/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const result = await uploadToCloudinary(req.file.buffer, {
      folder:         'skillbridge/avatars',
      public_id:      `avatar_${req.user._id}`,
      overwrite:      true,
      resource_type:  'image',
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    });

    // returnDocument is the new API — no `new: true`
    await Profile.findOneAndUpdate(
      { user: req.user._id },
      { avatarUrl: result.secure_url, user: req.user._id },
      { upsert: true, new: false }   // we don't need the result back, so new:false avoids warning
    );

    res.json({ avatarUrl: result.secure_url });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ message: err.message || 'Upload failed' });
  }
});

// ── POST /api/upload/resume ──────────────────────────────────────────────────
// KEY FIX: resource_type: 'image' with format: 'pdf' gives a REAL https URL
// that browsers can open and render inline. resource_type:'raw' forces download.
router.post('/resume', protect, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF files are accepted' });
    }

    // Upload as image resource_type with pdf format:
    // Cloudinary stores it and returns a .pdf URL under /image/upload/
    // This URL opens inline in browser and works with Google Docs Viewer
    const result = await uploadToCloudinary(req.file.buffer, {
      folder:        'skillbridge/resumes',
      public_id:     `resume_${req.user._id}`,
      resource_type: 'image',
      format:        'pdf',
      overwrite:     true,
    });

    const resumeUrl = result.secure_url; // e.g. https://res.cloudinary.com/.../image/upload/.../resume_xxx.pdf

    // Persist to DB — no `new:true` to suppress Mongoose deprecation warning
    await Profile.findOneAndUpdate(
      { user: req.user._id },
      { resumeUrl, user: req.user._id },
      { upsert: true, new: false }
    );

    // Fire-and-forget NLP parsing — file is saved regardless of parse outcome
    const NLP_BASE = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename:    'resume.pdf',
      contentType: 'application/pdf',
    });

    let parsed = {};
    try {
      const nlpRes = await axios.post(`${NLP_BASE}/parse-resume`, form, {
        headers: form.getHeaders(),
        timeout: 60000,   // 60s — Gemini can take ~10s; retry inside Python adds more
      });
      parsed = nlpRes.data || {};
    } catch (nlpErr) {
      // NLP failure is non-fatal — resume is already saved
      console.error('[upload] NLP parse failed (file still saved):', nlpErr.message);
    }

    res.json({ resumeUrl, parsed });
  } catch (err) {
    console.error('Resume upload error:', err);
    res.status(500).json({ message: err.message || 'Resume upload failed' });
  }
});

module.exports = router;
