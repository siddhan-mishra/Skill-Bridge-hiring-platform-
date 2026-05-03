const Job         = require('../models/Job');
const Application = require('../models/Application');

exports.createJob = async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Only recruiters can post jobs' });
    }
    const job = await Job.create({
      recruiter: req.user._id,
      ...req.body,
    });
    res.status(201).json(job);
  } catch (err) {
    console.error('createJob error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// getAllJobs — alias for listJobs (public, all jobs)
exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find().populate('recruiter', 'name email').sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    console.error('getAllJobs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// listJobs — kept for backward compat
exports.listJobs = exports.getAllJobs;

exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('recruiter', 'name email');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this job' });
    }
    const updated = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this job' });
    }
    await job.deleteOne();
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/jobs/my — recruiter's own jobs with live application counts
exports.getMyJobs = async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Recruiters only' });
    }
    const jobs   = await Job.find({ recruiter: req.user._id }).sort({ createdAt: -1 }).lean();
    const jobIds = jobs.map(j => j._id);

    const counts = await Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      {
        $group: {
          _id: '$job',
          total:       { $sum: 1 },
          shortlisted: { $sum: { $cond: [{ $eq: ['$status', 'shortlisted'] }, 1, 0] } },
        },
      },
    ]);

    const countMap = {};
    for (const c of counts) countMap[c._id.toString()] = c;

    const enriched = jobs.map(j => ({
      ...j,
      appCount:         countMap[j._id.toString()]?.total       || 0,
      shortlistedCount: countMap[j._id.toString()]?.shortlisted || 0,
    }));

    res.json(enriched);
  } catch (err) {
    console.error('getMyJobs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
