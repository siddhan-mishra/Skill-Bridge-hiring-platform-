// matchController.js — Hybrid AI Matching Engine
// Architecture:
//   1. Try SBERT via nlp-service /compute-match
//   2. Fallback to local keyword match if SBERT is down/slow
const axios   = require('axios');
const Job     = require('../models/Job');
const Profile = require('../models/profile');
const Application = require('../models/Application');
const mongoose = require('mongoose');

const NLP_URL     = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
const NLP_TIMEOUT = 3000; // reduced from 8s → 3s; fallback is fast enough

const EDU_RANK = { 'high school': 1, 'diploma': 2, "bachelor's": 3, "master's": 4, 'phd': 5, 'any': 0 };
const eduRank  = (level) => EDU_RANK[(level || '').toLowerCase()] ?? 0;

function buildProfileText(profile) {
  return [
    profile?.headline || '',
    profile?.summary  || '',
    (profile?.skills      || []).join(' '),
    (profile?.techStack   || []).join(' '),
    (profile?.softSkills  || []).join(' '),
    (profile?.workHistory || []).map(w => `${w.role} at ${w.company} ${(w.achievements || []).join(' ')}`).join(' '),
    (profile?.certifications || []).map(c => c.name).join(' '),
  ].filter(Boolean).join(' ').slice(0, 6000);
}

function buildJobText(job) {
  return [
    job.title,
    job.description || '',
    (job.responsibilities || []).join(' '),
    (job.requiredSkills   || []).join(' '),
    (job.preferredSkills  || []).join(' '),
    (job.techStack        || []).join(' '),
    (job.softSkills       || []).join(' '),
    job.industry || '', job.jobCategory || '',
  ].filter(Boolean).join(' ').slice(0, 6000);
}

async function sbertScore(payload) {
  const resp = await axios.post(`${NLP_URL}/compute-match`, payload, { timeout: NLP_TIMEOUT });
  if (resp.data.score == null || resp.data.score < 0) throw new Error('bad score');
  return resp.data;
}

// ── GET /api/matches/jobs  — seeker ranked feed ───────────────────────────────
exports.getMatchedJobs = async (req, res) => {
  try {
    if (req.user.role !== 'seeker')
      return res.status(403).json({ message: 'Seekers only' });

    const profile = await Profile.findOne({ user: req.user._id }).lean();
    if (!profile)
      return res.json({ jobs: [], profileMissing: true, message: 'Complete your profile to see matches' });

    const fields = ['headline','summary','skills','workHistory','education','location'];
    const filled = fields.filter(f => { const v = profile[f]; return Array.isArray(v) ? v.length > 0 : !!v; }).length;
    const completeness = Math.round((filled / fields.length) * 100);

    const jobs = await Job.find({ isActive: { $ne: false } })
      .select('title company location jobType workMode salaryMin salaryMax salaryUnit salaryRange requiredSkills preferredSkills techStack softSkills description responsibilities industry jobCategory experienceYears educationLevel expiryDate')
      .lean();

    if (!jobs.length) return res.json({ jobs: [], completeness });

    const profileText  = buildProfileText(profile);
    const seekerSkills = [...(profile.skills||[]), ...(profile.techStack||[]), ...(profile.softSkills||[])];
    const seekerYears  = profile.yearsOfExp || 0;
    const seekerEduRank = eduRank(profile.education?.[0]?.degree || 'any');

    const scored = await Promise.all(jobs.map(async (job) => {
      const jobSkills  = [...(job.requiredSkills||[]), ...(job.preferredSkills||[]), ...(job.techStack||[])];
      const reqEduRank = eduRank(job.educationLevel || 'any');
      const eduMatch   = (reqEduRank === 0 || seekerEduRank >= reqEduRank) ? 1.0 : seekerEduRank / Math.max(reqEduRank, 1);

      try {
        const d = await sbertScore({
          profileText, jobText: buildJobText(job),
          profileSkills: seekerSkills, jobSkills,
          profileYears: seekerYears, requiredYears: job.experienceYears || 0,
          educationMatch: eduMatch,
        });
        return { ...job, matchScore: d.score, breakdown: d.breakdown||{}, matchedSkills: d.matchedSkills||[], missingSkills: d.missingSkills||[], _scoredBySBERT: true };
      } catch {
        const { computeMatch } = require('../utils/matchUtils');
        const { score } = computeMatch(seekerSkills, jobSkills);
        return { ...job, matchScore: score, breakdown: {}, matchedSkills: [], missingSkills: [], _scoredBySBERT: false };
      }
    }));

    const sorted   = scored.sort((a, b) => b.matchScore - a.matchScore);
    const hasSBERT = sorted.some(j => j._scoredBySBERT);

    return res.json({
      jobs: sorted, completeness,
      scoringMode: hasSBERT ? 'sbert' : 'keyword',
      message: hasSBERT ? null : '⚠️ AI service offline — showing keyword-based scores.',
    });
  } catch (err) {
    console.error('getMatchedJobs error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── GET /api/matches/job/:jobId  — single job score ──────────────────────────
exports.getJobMatchScore = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id }).lean();
    if (!profile) return res.json({ score: 0, breakdown: {} });

    const job = await Job.findById(req.params.jobId).lean();
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const seekerSkills = [...(profile.skills||[]), ...(profile.techStack||[]), ...(profile.softSkills||[])];
    const jobSkills    = [...(job.requiredSkills||[]), ...(job.preferredSkills||[]), ...(job.techStack||[])];

    try {
      const d = await sbertScore({
        profileText: buildProfileText(profile), jobText: buildJobText(job),
        profileSkills: seekerSkills, jobSkills,
        profileYears: profile.yearsOfExp || 0, requiredYears: job.experienceYears || 0,
        educationMatch: 0.5,
      });
      return res.json({ score: d.score, breakdown: d.breakdown||{}, matchedSkills: d.matchedSkills||[], missingSkills: d.missingSkills||[] });
    } catch {
      const { computeMatch } = require('../utils/matchUtils');
      const { score } = computeMatch(seekerSkills, jobSkills);
      return res.json({ score, breakdown: {}, matchedSkills: [], missingSkills: [] });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET /api/matches/candidates/:jobId  — recruiter ranked candidates ─────────
exports.getRankedCandidates = async (req, res) => {
  try {
    if (req.user.role !== 'recruiter')
      return res.status(403).json({ message: 'Recruiters only' });

    // Validate jobId before querying
    if (!mongoose.Types.ObjectId.isValid(req.params.jobId))
      return res.status(400).json({ message: 'Invalid job ID' });

    const job = await Job.findById(req.params.jobId).lean();
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.recruiter.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not your job' });

    const apps = await Application.find({ job: req.params.jobId })
      .populate('seeker', 'name email _id')
      .lean();

    const jobText   = buildJobText(job);
    const jobSkills = [...(job.requiredSkills||[]), ...(job.preferredSkills||[]), ...(job.techStack||[])];

    const candidates = await Promise.all(apps.map(async (app) => {
      // Guard: deleted users
      if (!app.seeker?._id) return null;

      const profile = await Profile.findOne({ user: app.seeker._id }).lean();
      const seekerSkills = [...(profile?.skills||[]), ...(profile?.techStack||[]), ...(profile?.softSkills||[])];

      let score = app.matchScore || 0;
      let matchedSkills = [];
      let missingSkills = [];
      let breakdown     = {};

      if (!score || score <= 0) {
        try {
          const d = await sbertScore({
            profileText: buildProfileText(profile || {}),
            jobText, profileSkills: seekerSkills, jobSkills,
            profileYears: profile?.yearsOfExp || 0,
            requiredYears: job.experienceYears || 0,
            educationMatch: 0.5,
          });
          score         = d.score;
          matchedSkills = d.matchedSkills || [];
          missingSkills = d.missingSkills || [];
          breakdown     = d.breakdown     || {};
          // Cache
          await Application.findByIdAndUpdate(app._id, { matchScore: score });
        } catch {
          const { computeMatch } = require('../utils/matchUtils');
          const r = computeMatch(seekerSkills, jobSkills);
          score = r.score;
        }
      }

      return {
        userId:        app.seeker._id,
        name:          app.seeker.name,
        email:         app.seeker.email,
        headline:      profile?.headline || '',
        location:      profile?.location || '',
        avatarUrl:     profile?.avatarUrl || '',
        score,
        matchedSkills,
        missingSkills,
        breakdown,
      };
    }));

    const filtered = candidates.filter(Boolean).sort((a, b) => b.score - a.score);

    res.json({
      job: { id: job._id, title: job.title, company: job.company, requiredSkills: job.requiredSkills || [] },
      candidates: filtered,
    });
  } catch (err) {
    console.error('getRankedCandidates error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
