const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createJob, listJobs, getJobById, updateJob, deleteJob } = require('../controllers/jobController');

router.post('/', protect, createJob);          // recruiter only
router.get('/', listJobs);                      // public - all jobs
router.get('/:id', getJobById);                 // public - single job detail
router.put('/:id', protect, updateJob);         // recruiter only - edit
router.delete('/:id', protect, deleteJob);      // recruiter only - delete

module.exports = router;