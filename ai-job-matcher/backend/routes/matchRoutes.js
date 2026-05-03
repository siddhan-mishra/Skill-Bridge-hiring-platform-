const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getMatchesForCurrentSeeker,
  getCandidatesForJob,
} = require('../controllers/matchController');

// Seeker: ranked jobs — support both legacy route and new alias
router.get('/my-jobs', protect, getMatchesForCurrentSeeker);   // legacy
router.get('/matches', protect, getMatchesForCurrentSeeker);   // new alias used by SeekerDashboard

// Recruiter: ranked candidates for a specific job
router.get('/job/:jobId/candidates', protect, getCandidatesForJob);

module.exports = router;
