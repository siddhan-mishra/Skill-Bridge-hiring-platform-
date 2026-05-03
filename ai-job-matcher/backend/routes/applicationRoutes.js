const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  applyToJob,
  getMyApplications,
  getApplicationsForJob,
  updateApplicationStatus,
  checkApplication,
} = require('../controllers/applicationController');

// Seeker routes
router.post('/:jobId',           protect, applyToJob);               // POST  /api/applications/:jobId
router.get('/my',                protect, getMyApplications);         // GET   /api/applications/my
router.get('/check/:jobId',      protect, checkApplication);          // GET   /api/applications/check/:jobId

// Recruiter routes
router.get('/job/:jobId',        protect, getApplicationsForJob);    // GET   /api/applications/job/:jobId
router.patch('/:appId/status',   protect, updateApplicationStatus);  // PATCH /api/applications/:appId/status

module.exports = router;
