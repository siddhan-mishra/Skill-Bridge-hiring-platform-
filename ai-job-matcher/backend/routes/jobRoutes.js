const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createJob, listJobs } = require('../controllers/jobController');

router.post('/', protect, createJob); // recruiter only
router.get('/', listJobs);            // public for now

module.exports = router;
