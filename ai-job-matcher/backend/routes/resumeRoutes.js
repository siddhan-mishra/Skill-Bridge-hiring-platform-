const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { generateResume } = require('../controllers/resumeController');

// GET /api/resume/generate — seeker downloads their AI-generated .docx
router.get('/generate', protect, generateResume);

module.exports = router;
