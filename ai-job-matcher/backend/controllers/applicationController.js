const Application = require('../models/Application');
const Job         = require('../models/Job');
const Profile     = require('../models/profile');
const User        = require('../models/User');
const { computeMatch } = require('../utils/matchUtils');
const { notifyRecruiterNewApplication, notifySeekerStatusChange } = require('../services/emailService');

// ── POST /api/applications/:jobId  — seeker applies ──────────────────────
exports.applyToJob = async (req, res) => {
  try {
    if (req.user.role !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can apply to jobs' });
    }

    const job = await Job.findById(req.params.jobId).populate('recruiter', 'name email');
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const existing = await Application.findOne({ job: req.params.jobId, seeker: req.user._id });
    if (existing) return res.status(409).json({ message: 'You have already applied to this job', status: existing.status });

    const profile = await Profile.findOne({ user: req.user._id });
    const { score } = computeMatch(profile?.skills || [], job.requiredSkills || []);

    const app = await Application.create({
      job:        req.params.jobId,
      seeker:     req.user._id,
      coverNote:  req.body.coverNote || '',
      matchScore: score,
    });

    const seekerUser = await User.findById(req.user._id).select('name email');
    notifyRecruiterNewApplication({
      recruiterEmail: job.recruiter.email,
      recruiterName:  job.recruiter.name,
      seekerName:     seekerUser.name,
      seekerEmail:    seekerUser.email,
      jobTitle:       job.title,
      applicationId:  app._id,
    }).catch(err => console.error('[email] recruiter notify failed:', err.message));

    res.status(201).json({ message: 'Application submitted!', applicationId: app._id });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'You have already applied to this job' });
    console.error('applyToJob error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET /api/applications/my  — seeker sees all their applications ────────
exports.getMyApplications = async (req, res) => {
  try {
    if (req.user.role !== 'seeker') return res.status(403).json({ message: 'Seekers only' });

    const apps = await Application.find({ seeker: req.user._id })
      .populate({
        path: 'job',
        select: 'title company location jobType salaryRange requiredSkills recruiter',
        populate: { path: 'recruiter', select: 'name email' },
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json(apps);
  } catch (err) {
    console.error('getMyApplications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET /api/applications/job/:jobId  — recruiter sees applicants ─────────
exports.getApplicationsForJob = async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') return res.status(403).json({ message: 'Recruiters only' });

    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your job' });
    }

    const apps = await Application.find({ job: req.params.jobId })
      .populate('seeker', 'name email _id')
      .sort({ matchScore: -1, createdAt: 1 })
      .lean();

    const enriched = await Promise.all(apps.map(async (app) => {
      const profile = await Profile.findOne({ user: app.seeker._id })
        .select('headline skills avatarUrl location')
        .lean();
      return { ...app, profile: profile || {} };
    }));

    res.json({ job: { id: job._id, title: job.title, company: job.company }, applications: enriched });
  } catch (err) {
    console.error('getApplicationsForJob error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── PATCH /api/applications/:appId/status  — recruiter updates status ─────
exports.updateApplicationStatus = async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') return res.status(403).json({ message: 'Recruiters only' });

    const { status, recruiterNote } = req.body;
    const allowed = ['pending', 'reviewed', 'shortlisted', 'rejected'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const app = await Application.findById(req.params.appId)
      .populate('job', 'title company recruiter')
      .populate('seeker', 'name email');

    if (!app) return res.status(404).json({ message: 'Application not found' });
    if (app.job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    app.status = status;
    if (recruiterNote !== undefined) app.recruiterNote = recruiterNote;
    await app.save();

    // Get recruiter details to share email with seeker when shortlisted
    const recruiterUser = await User.findById(req.user._id).select('name email');

    notifySeekerStatusChange({
      seekerEmail:    app.seeker.email,
      seekerName:     app.seeker.name,
      jobTitle:       app.job.title,
      company:        app.job.company,
      status,
      recruiterNote:  app.recruiterNote,
      // Only passed when shortlisted — email template conditionally shows this block
      recruiterEmail: status === 'shortlisted' ? recruiterUser.email : null,
      recruiterName:  status === 'shortlisted' ? recruiterUser.name  : null,
    }).catch(err => console.error('[email] seeker notify failed:', err.message));

    res.json({ message: 'Status updated', application: app });
  } catch (err) {
    console.error('updateApplicationStatus error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET /api/applications/check/:jobId  — seeker checks if applied ────────
exports.checkApplication = async (req, res) => {
  try {
    const app = await Application.findOne({ job: req.params.jobId, seeker: req.user._id });
    if (!app) return res.json({ applied: false });
    res.json({ applied: true, status: app.status, applicationId: app._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
