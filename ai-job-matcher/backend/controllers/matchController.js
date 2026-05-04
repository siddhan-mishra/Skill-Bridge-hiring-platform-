// matchController.js — Step 4: Hybrid AI Matching Engine
// Architecture:
//   1. Try SBERT via nlp-service /compute-match (full semantic + skill + structured)
//   2. If nlp-service is down/slow, fall back to local matchUtils (keyword overlap)
//   3. Cache computed score back into Application.matchScore for recruiter sort
// Research basis: arXiv 2402.13435 (Learning to Retrieve for Job Matching)
const axios   = require('axios');
const Job     = require('../models/Job');
const Profile = require('../models/profile');
const Application = require('../models/Application');

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
const NLP_TIMEOUT = 8000; // 8s timeout — fallback kicks in after this

// ── Education level numeric map (for structured score) ────────────────────────
const EDU_RANK = { 'high school': 1, 'diploma': 2, "bachelor's": 3, "master's": 4, 'phd': 5, 'any': 0 };
const eduRank = (level) => EDU_RANK[(level || '').toLowerCase()] ?? 0;

// ── Build full text blob for SBERT embedding ──────────────────────────────────
function buildProfileText(profile, user) {
  const parts = [
    profile?.headline || '',
    profile?.summary  || '',
    (profile?.skills     || []).join(' '),
    (profile?.techStack  || []).join(' '),
    (profile?.softSkills || []).join(' '),
    (profile?.workHistory || []).map(w => `${w.role} at ${w.company} ${(w.achievements || []).join(' ')}`).join(' '),
    (profile?.certifications || []).map(c => c.name).join(' '),
  ];
  return parts.filter(Boolean).join(' ').slice(0, 6000);
}

function buildJobText(job) {
  const parts = [
    job.title,
    job.description || '',
    (job.responsibilities || []).join(' '),
    (job.requiredSkills   || []).join(' '),
    (job.preferredSkills  || []).join(' '),
    (job.techStack        || []).join(' '),
    (job.softSkills       || []).join(' '),
    job.industry || '', job.jobCategory || '',
  ];
  return parts.filter(Boolean).join(' ').slice(0, 6000);
}

// ── GET /api/match/jobs  — seeker gets ranked job feed ───────────────────────
exports.getMatchedJobs = async (req, res) => {
  try {
    if (req.user.role !== 'seeker')
      return res.status(403).json({ message: 'Seekers only' });

    const profile = await Profile.findOne({ user: req.user._id }).lean();
    if (!profile)
      return res.json({ jobs: [], profileMissing: true, message: 'Complete your profile to see matches' });

    // Completeness guard: warn if <40%
    const fields = ['headline','summary','skills','workHistory','education','location'];
    const filled = fields.filter(f => {
      const v = profile[f];
      return Array.isArray(v) ? v.length > 0 : !!v;
    }).length;
    const completeness = Math.round((filled / fields.length) * 100);

    const jobs = await Job.find({ isActive: { $ne: false } })
      .select('title company location jobType workMode salaryMin salaryMax salaryUnit salaryRange requiredSkills preferredSkills techStack softSkills description responsibilities industry jobCategory experienceYears educationLevel expiryDate')
      .lean();

    if (!jobs.length) return res.json({ jobs: [], completeness });

    const profileText = buildProfileText(profile);
    const seekerSkills = [
      ...(profile.skills     || []),
      ...(profile.techStack  || []),
      ...(profile.softSkills || []),
    ];
    const seekerYears = profile.yearsOfExp || 0;
    const seekerEduRank = eduRank(profile.education?.[0]?.degree || 'any');

    const scored = await Promise.all(jobs.map(async (job) => {
      const jobText   = buildJobText(job);
      const jobSkills = [
        ...(job.requiredSkills  || []),
        ...(job.preferredSkills || []),
        ...(job.techStack       || []),
      ];
      const reqYears   = job.experienceYears || 0;
      const reqEduRank = eduRank(job.educationLevel || 'any');
      const eduMatch   = (reqEduRank === 0 || seekerEduRank >= reqEduRank) ? 1.0
                         : seekerEduRank / Math.max(reqEduRank, 1);

      try {
        const resp = await axios.post(`${NLP_URL}/compute-match`, {
          profileText,
          jobText,
          profileSkills: seekerSkills,
          jobSkills,
          profileYears:  seekerYears,
          requiredYears: reqYears,
          educationMatch: eduMatch,
        }, { timeout: NLP_TIMEOUT });

        const d = resp.data;
        if (d.score >= 0) {
          return {
            ...job,
            matchScore:     d.score,
            breakdown:      d.breakdown      || {},
            matchedSkills:  d.matchedSkills  || [],
            missingSkills:  d.missingSkills  || [],
            _scoredBySBERT: true,
          };
        }
        throw new Error('SBERT returned error score');
      } catch {
        // ── Graceful fallback to local keyword match ──────────────────────
        const { computeMatch } = require('../utils/matchUtils');
        const { score } = computeMatch(seekerSkills, jobSkills);
        return {
          ...job,
          matchScore:     score,
          breakdown:      {},
          matchedSkills:  [],
          missingSkills:  [],
          _scoredBySBERT: false,
        };
      }
    }));

    // Sort by score descending, remove jobs with 0% if many results
    const sorted = scored.sort((a, b) => b.matchScore - a.matchScore);
    const hasSBERT = sorted.some(j => j._scoredBySBERT);

    return res.json({
      jobs: sorted,
      completeness,
      scoringMode: hasSBERT ? 'sbert' : 'keyword',
      message: hasSBERT ? null : '⚠️ AI service offline — showing keyword-based scores. Run: pip install sentence-transformers',
    });
  } catch (err) {
    console.error('getMatchedJobs error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── GET /api/match/job/:jobId  — single job score for a seeker ───────────────
exports.getJobMatchScore = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id }).lean();
    if (!profile) return res.json({ score: 0, breakdown: {} });

    const job = await Job.findById(req.params.jobId).lean();
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const seekerSkills = [...(profile.skills||[]), ...(profile.techStack||[]), ...(profile.softSkills||[])];
    const jobSkills    = [...(job.requiredSkills||[]), ...(job.preferredSkills||[]), ...(job.techStack||[])];

    try {
      const resp = await axios.post(`${NLP_URL}/compute-match`, {
        profileText:   buildProfileText(profile),
        jobText:       buildJobText(job),
        profileSkills: seekerSkills,
        jobSkills,
        profileYears:  profile.yearsOfExp || 0,
        requiredYears: job.experienceYears || 0,
        educationMatch: 0.5,
      }, { timeout: NLP_TIMEOUT });

      const d = resp.data;
      if (d.score >= 0) return res.json({ score: d.score, breakdown: d.breakdown || {}, matchedSkills: d.matchedSkills || [], missingSkills: d.missingSkills || [] });
      throw new Error('bad score');
    } catch {
      const { computeMatch } = require('../utils/matchUtils');
      const { score } = computeMatch(seekerSkills, jobSkills);
      return res.json({ score, breakdown: {}, matchedSkills: [], missingSkills: [] });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET /api/match/candidates/:jobId  — recruiter gets ranked candidates ──────
exports.getRankedCandidates = async (req, res) => {
  try {
    if (req.user.role !== 'recruiter')
      return res.status(403).json({ message: 'Recruiters only' });

    const job = await Job.findById(req.params.jobId).lean();
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.recruiter.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not your job' });

    const apps = await Application.find({ job: req.params.jobId })
      .populate('seeker', 'name email _id')
      .lean();

    const jobText  = buildJobText(job);
    const jobSkills = [...(job.requiredSkills||[]), ...(job.preferredSkills||[]), ...(job.techStack||[])];

    const enriched = await Promise.all(apps.map(async (app) => {
      const profile = await Profile.findOne({ user: app.seeker._id }).lean();
      const seekerSkills = [...(profile?.skills||[]), ...(profile?.techStack||[]), ...(profile?.softSkills||[])];

      let score = app.matchScore;
      let breakdown = {};
      let matchedSkills = [];
      let missingSkills = [];

      // Re-compute with SBERT if score was set by old keyword-only system (<= 0)
      if (!score || score <= 0) {
        try {
          const resp = await axios.post(`${NLP_URL}/compute-match`, {
            profileText:   buildProfileText(profile || {}, app.seeker),
            jobText,
            profileSkills: seekerSkills,
            jobSkills,
            profileYears:  profile?.yearsOfExp || 0,
            requiredYears: job.experienceYears || 0,
            educationMatch: 0.5,
          }, { timeout: NLP_TIMEOUT });
          if (resp.data.score >= 0) {
            score = resp.data.score;
            breakdown = resp.data.breakdown || {};
            matchedSkills = resp.data.matchedSkills || [];
            missingSkills = resp.data.missingSkills || [];
            // Cache updated score
            await Application.findByIdAndUpdate(app._id, { matchScore: score });
          }
        } catch { /* keep old score */ }
      }

      return {
        ...app,
        applicant: app.seeker,
        profile:   profile || {},
        matchScore: score || 0,
        breakdown,
        matchedSkills,
        missingSkills,
      };
    }));

    enriched.sort((a, b) => b.matchScore - a.matchScore);
    res.json({ job: { id: job._id, title: job.title, company: job.company, requiredSkills: job.requiredSkills || [] }, candidates: enriched });
  } catch (err) {
    console.error('getRankedCandidates error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
