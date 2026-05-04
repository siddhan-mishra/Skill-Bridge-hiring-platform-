const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getMatchedJobs,
  getJobMatchScore,
  getRankedCandidates,
} = require('../controllers/matchController');

// Seeker
router.get('/jobs',              protect, getMatchedJobs);             // seeker ranked feed
router.get('/job/:jobId',        protect, getJobMatchScore);           // single job score

// Recruiter
router.get('/candidates/:jobId', protect, getRankedCandidates);        // ranked candidates

module.exports = router;
