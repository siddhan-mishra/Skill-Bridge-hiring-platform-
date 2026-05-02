const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getMatchesForCurrentSeeker,
  getCandidatesForJob,
} = require('../controllers/matchController');

// seeker: ranked jobs
router.get('/my-jobs', protect, getMatchesForCurrentSeeker);

// recruiter: ranked candidates for a specific job
// Line 12: GET /api/match/job/:jobId/candidates
router.get('/job/:jobId/candidates', protect, getCandidatesForJob);

module.exports = router;