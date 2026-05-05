const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getRecruiterStats, getSeekerStats } = require('../controllers/statsController');

router.get('/recruiter', protect, getRecruiterStats);  // GET /api/stats/recruiter
router.get('/seeker',    protect, getSeekerStats);      // GET /api/stats/seeker

module.exports = router;
