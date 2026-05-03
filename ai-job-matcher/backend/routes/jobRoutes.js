const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
} = require('../controllers/jobController');

router.get('/',          getAllJobs);               // public
router.get('/my',        protect, async (req, res) => {
  // GET /api/jobs/my — returns only this recruiter's jobs with application counts
  try {
    const Job         = require('../models/Job');
    const Application = require('../models/Application');
    if (req.user.role !== 'recruiter') return res.status(403).json({ message: 'Recruiters only' });
    const jobs   = await Job.find({ recruiter: req.user._id }).sort({ createdAt: -1 }).lean();
    const jobIds = jobs.map(j => j._id);
    // Count applications per job in one query
    const counts = await Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      { $group: { _id: '$job', total: { $sum: 1 }, shortlisted: { $sum: { $cond: [{ $eq: ['$status','shortlisted'] }, 1, 0] } } } },
    ]);
    const countMap = {};
    for (const c of counts) countMap[c._id.toString()] = c;
    const enriched = jobs.map(j => ({
      ...j,
      appCount:        countMap[j._id.toString()]?.total || 0,
      shortlistedCount: countMap[j._id.toString()]?.shortlisted || 0,
    }));
    res.json(enriched);
  } catch (err) {
    console.error('GET /api/jobs/my error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
router.get('/:id',       getJobById);              // public
router.post('/',         protect, createJob);
router.put('/:id',       protect, updateJob);
router.delete('/:id',    protect, deleteJob);

module.exports = router;
