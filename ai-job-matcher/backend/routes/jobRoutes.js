const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
  getMyJobs,
} = require('../controllers/jobController');

router.get('/',     getAllJobs);              // GET /api/jobs         — public, all jobs
router.get('/my',   protect, getMyJobs);     // GET /api/jobs/my      — recruiter's jobs + counts
router.get('/:id',  getJobById);             // GET /api/jobs/:id     — public, single job
router.post('/',    protect, createJob);
router.put('/:id',  protect, updateJob);
router.delete('/:id', protect, deleteJob);

module.exports = router;
