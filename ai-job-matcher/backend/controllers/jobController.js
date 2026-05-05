const Job         = require('../models/Job');
const Application = require('../models/Application');
const axios       = require('axios');

const NLP_BASE = process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8000';

// ── Create Job ─────────────────────────────────────────────────────────────
exports.createJob = async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Only recruiters can post jobs' });
    }
    const job = await Job.create({
      recruiter: req.user._id,
      source: 'internal',
      isActive: true,
      ...req.body,
    });
    res.status(201).json(job);
  } catch (err) {
    console.error('createJob error:', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
};

// ── List / Search Jobs (public) ────────────────────────────────────────────
// FIX: no longer hard-filters { isActive: true, source: 'internal' } by default.
// Old jobs without these fields were invisible. Now:
//   - isActive filter only applied when ?active=true is passed
//   - source filter only applied when ?source=xxx is passed
//   - Default: return ALL jobs (internal + any future external)
exports.getAllJobs = async (req, res) => {
  try {
    const {
      q,
      workMode,
      jobType,
      location,
      minSalary,
      maxSalary,
      source,       // optional — only filter if explicitly passed
      active,       // optional — only filter if explicitly passed
    } = req.query;

    const filter = {};

    // Only filter by isActive if caller explicitly requests it
    if (active === 'true')  filter.isActive = true;
    if (active === 'false') filter.isActive = false;

    // Only filter by source if explicitly requested
    if (source) filter.source = source;

    if (q)          filter.$text    = { $search: q };
    if (workMode)   filter.workMode = workMode;
    if (jobType)    filter.jobType  = jobType;
    if (location)   filter.location = new RegExp(location, 'i');
    if (minSalary)  filter.salaryMax = { $gte: Number(minSalary) };
    if (maxSalary)  filter.salaryMin = { $lte: Number(maxSalary) };

    const jobs = await Job.find(filter)
      .populate('recruiter', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json(jobs);
  } catch (err) {
    console.error('getAllJobs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listJobs = exports.getAllJobs;

// ── Get Single Job ─────────────────────────────────────────────────────────
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('recruiter', 'name email');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Update Job ─────────────────────────────────────────────────────────────
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this job' });
    }
    const updated = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Delete Job ─────────────────────────────────────────────────────────────
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

// ── Recruiter's Own Jobs with Application Counts ───────────────────────────
exports.getMyJobs = async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Recruiters only' });
    }
    const jobs   = await Job.find({ recruiter: req.user._id }).sort({ createdAt: -1 }).lean();
    const jobIds = jobs.map(j => j._id);

    const counts = await Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      { $group: {
        _id: '$job',
        total:       { $sum: 1 },
        shortlisted: { $sum: { $cond: [{ $eq: ['$status', 'shortlisted'] }, 1, 0] } },
        rejected:    { $sum: { $cond: [{ $eq: ['$status', 'rejected']    }, 1, 0] } },
      }},
    ]);

    const countMap = {};
    for (const c of counts) countMap[c._id.toString()] = c;

    const enriched = jobs.map(j => ({
      ...j,
      appCount:         countMap[j._id.toString()]?.total       || 0,
      shortlistedCount: countMap[j._id.toString()]?.shortlisted || 0,
      rejectedCount:    countMap[j._id.toString()]?.rejected    || 0,
    }));

    res.json(enriched);
  } catch (err) {
    console.error('getMyJobs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── AI Skill Suggestions (proxies to NLP service) ──────────────────────────
exports.suggestSkills = async (req, res) => {
  try {
    const { title = '', description = '' } = req.body;
    if (!title && !description) {
      return res.status(400).json({ message: 'Provide title or description' });
    }
    const nlpRes = await axios.post(
      `${NLP_BASE}/suggest-skills`,
      { title, description },
      { timeout: 15000 }
    );
    return res.json(nlpRes.data);
  } catch (err) {
    console.error('suggestSkills proxy error:', err.message);
    return res.json({ skills: [], error: 'NLP service unavailable' });
  }
};
