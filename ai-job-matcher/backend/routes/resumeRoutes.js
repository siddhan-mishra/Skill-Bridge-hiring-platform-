const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { generateResume, generateAndSaveResume } = require('../controllers/resumeController');

// GET  /api/resume/generate      — streams .docx to browser (download)
router.get('/generate', protect, generateResume);

// POST /api/resume/generate-save — generates, uploads to Cloudinary, saves URL to profile
// Called by frontend "✨ Generate Resume" button so the resume appears on public profile
router.post('/generate-save', protect, generateAndSaveResume);

module.exports = router;
