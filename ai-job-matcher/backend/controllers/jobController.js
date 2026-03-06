const Job = require('../models/Job');

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

exports.listJobs = async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    console.error('listJobs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
