const express = require('express');
const router  = express.Router();
const {
  applyToJob,
  getMyApplications,
  getApplicationsForJob,
  getAllApplicationsForRecruiter,
  updateApplicationStatus,
  checkApplication,
} = require('../controllers/applicationController');
const { protect } = require('../middleware/authMiddleware');

// ── CRITICAL: specific string routes BEFORE param routes (:jobId, :appId) ──

// Seeker
router.get('/my',              protect, getMyApplications);          // seeker: all my apps
router.get('/check/:jobId',    protect, checkApplication);           // seeker: did I apply?

// Recruiter aggregate (specific string before /:appId param)
router.get('/recruiter/all',   protect, getAllApplicationsForRecruiter); // recruiter: ALL apps

// Recruiter per-job
router.get('/job/:jobId',      protect, getApplicationsForJob);     // recruiter: apps for one job

// Apply
router.post('/:jobId',         protect, applyToJob);                 // seeker: apply

// Status update — support both PUT and PATCH so frontend works either way
router.put  ('/:appId/status', protect, updateApplicationStatus);
router.patch('/:appId/status', protect, updateApplicationStatus);

module.exports = router;
