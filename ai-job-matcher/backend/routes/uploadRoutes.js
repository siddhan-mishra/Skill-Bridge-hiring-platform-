const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const { protect }  = require('../middleware/authMiddleware');
const { cloudinary } = require('../config/cloudinary');
const Profile    = require('../models/profile');
const axios      = require('axios');
const FormData   = require('form-data');

// multer — memory storage (buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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

// ── POST /api/upload/avatar ──────────────────────────────────────────────
router.post('/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const result = await uploadToCloudinary(req.file.buffer, {
      folder:    'skillbridge/avatars',
      public_id: `avatar_${req.user._id}`,
      overwrite: true,
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    });

    await Profile.findOneAndUpdate(
      { user: req.user._id },
      { avatarUrl: result.secure_url, user: req.user._id },
      { upsert: true, returnDocument: 'after' }
    );

    res.json({ avatarUrl: result.secure_url });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ message: err.message || 'Upload failed' });
  }
});

// ── POST /api/upload/resume ──────────────────────────────────────────────
// Strategy: upload as image resource_type so Cloudinary gives a real viewable URL
// Then use fl_attachment:false flag for inline browser viewing
router.post('/resume', protect, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF files are accepted' });
    }

    // Upload PDF as raw — Cloudinary stores it as-is
    const result = await uploadToCloudinary(req.file.buffer, {
      folder:        'skillbridge/resumes',
      public_id:     `resume_${req.user._id}`,
      resource_type: 'raw',
      overwrite:     true,
      format:        'pdf',
    });

    // Build inline-viewable URL:
    // Cloudinary raw URL pattern: .../raw/upload/v123/path.pdf
    // Add fl_attachment:false to force browser to display inline
    const resumeUrl = result.secure_url.replace(
      '/raw/upload/',
      '/raw/upload/fl_attachment:false/'
    );

    // Save to DB immediately
    await Profile.findOneAndUpdate(
      { user: req.user._id },
      { resumeUrl, user: req.user._id },
      { upsert: true, returnDocument: 'after' }
    );

    // Call Python NLP parser (fast — SkillNer removed from parse-resume)
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
        timeout: 30000,
      });
      parsed = nlpRes.data;
    } catch (nlpErr) {
      console.error('NLP parse failed (file still saved):', nlpErr.message);
    }

    res.json({ resumeUrl, parsed });

  } catch (err) {
    console.error('Resume upload error:', err);
    res.status(500).json({ message: err.message || 'Resume upload failed' });
  }
});

module.exports = router;
