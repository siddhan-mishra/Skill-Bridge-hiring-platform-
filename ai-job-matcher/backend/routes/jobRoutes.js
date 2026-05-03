const express = require('express');
const router  = express.Router();
const {
  createJob,
  getAllJobs,
  listJobs,
  getJobById,
  updateJob,
  deleteJob,
  getMyJobs,
  suggestSkills,
} = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');

// Public
router.get('/',        getAllJobs);
router.get('/:id',     getJobById);

// Recruiter auth
router.get ('/my/jobs',        protect, getMyJobs);
router.post('/',               protect, createJob);
router.put ('/:id',            protect, updateJob);
router.delete('/:id',          protect, deleteJob);

// AI skill suggestions — used by job create/edit form
router.post('/suggest-skills', protect, suggestSkills);

module.exports = router;
