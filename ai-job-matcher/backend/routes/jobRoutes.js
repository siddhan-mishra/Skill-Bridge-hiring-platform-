const express = require('express');
const router  = express.Router();
const {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
  getMyJobs,
  suggestSkills,
} = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');

// ── CRITICAL: specific routes MUST come before /:id param routes ─────────────
// If /:id is declared first, Express matches 'my' and 'suggest-skills'
// as an id param and calls getJobById('my') → crashes with 404/500.

// Authenticated recruiter routes (specific strings first)
router.get ('/my/jobs',        protect, getMyJobs);     // ✔ must be before /:id
router.post('/suggest-skills', protect, suggestSkills); // ✔ must be before /:id

// Public routes
router.get('/',    getAllJobs);
router.post('/',   protect, createJob);

// Param routes (always last)
router.get   ('/:id', getJobById);
router.put   ('/:id', protect, updateJob);
router.delete('/:id', protect, deleteJob);

module.exports = router;
