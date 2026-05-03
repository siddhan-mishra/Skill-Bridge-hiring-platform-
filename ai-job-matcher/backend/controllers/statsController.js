const Application = require('../models/Application');
const Job         = require('../models/Job');

exports.getRecruiterStats = async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Recruiters only' });
    }

    const jobs   = await Job.find({ recruiter: req.user._id }).lean();
    const jobIds = jobs.map(j => j._id);
    const apps   = await Application.find({ job: { $in: jobIds } }).lean();

    const totalApplications = apps.length;
    const pending     = apps.filter(a => a.status === 'pending').length;
    const reviewed    = apps.filter(a => a.status === 'reviewed').length;
    const shortlisted = apps.filter(a => a.status === 'shortlisted').length;
    const rejected    = apps.filter(a => a.status === 'rejected').length;

    const countByJob = {};
    for (const a of apps) {
      const key = a.job.toString();
      countByJob[key] = (countByJob[key] || 0) + 1;
    }

    const topJobs = jobs
      .map(j => ({ id: j._id, title: j.title, company: j.company, count: countByJob[j._id.toString()] || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const avgScore = apps.length > 0
      ? Math.round(apps.reduce((s, a) => s + (a.matchScore || 0), 0) / apps.length)
      : 0;

    res.json({
      totalJobs: jobs.length,
      totalApplications,
      pending,
      reviewed,
      shortlisted,
      rejected,
      avgMatchScore: avgScore,
      countByJob,
      topJobs,
    });
  } catch (err) {
    console.error('getRecruiterStats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getSeekerStats = async (req, res) => {
  try {
    if (req.user.role !== 'seeker') {
      return res.status(403).json({ message: 'Seekers only' });
    }
    const apps = await Application.find({ seeker: req.user._id })
      .populate('job', 'title company')
      .lean();

    const total       = apps.length;
    const pending     = apps.filter(a => a.status === 'pending').length;
    const reviewed    = apps.filter(a => a.status === 'reviewed').length;
    const shortlisted = apps.filter(a => a.status === 'shortlisted').length;
    const rejected    = apps.filter(a => a.status === 'rejected').length;
    const avgScore    = total > 0
      ? Math.round(apps.reduce((s, a) => s + (a.matchScore || 0), 0) / total)
      : 0;

    res.json({ total, pending, reviewed, shortlisted, rejected, avgMatchScore: avgScore });
  } catch (err) {
    console.error('getSeekerStats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
