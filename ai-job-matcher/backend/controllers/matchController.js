// matchController.js
const Profile = require('../models/profile');
const Job     = require('../models/Job');
const { computeMatch } = require('../utils/matchUtils');

// ── SEEKER: get all jobs ranked by match score ─────────────────────────────
exports.getMatchesForCurrentSeeker = async (req, res) => {
  try {
    if (req.user.role !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can view matches' });
    }

    const profile = await Profile.findOne({ user: req.user._id });

    if (!profile || !Array.isArray(profile.skills) || profile.skills.length === 0) {
      return res.status(400).json({
        message: 'No skills found in your profile. Please add skills first.',
      });
    }

    const jobs = await Job.find().sort({ createdAt: -1 });

    const matches = jobs.map((job) => {
      const { score, matchedSkills, missingSkills, extraSkills } = computeMatch(
        profile.skills,
        job.requiredSkills || []
      );
      return {
        jobId: job._id,
        title: job.title,
        company: job.company,
        location: job.location,
        jobType: job.jobType,
        salaryRange: job.salaryRange,
        description: job.description,
        requiredSkills: job.requiredSkills || [],
        score,
        matchedSkills,
        missingSkills,
        extraSkills,
      };
    });

    matches.sort((a, b) => b.score - a.score);
    res.json(matches);
  } catch (err) {
    console.error('getMatchesForCurrentSeeker error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── RECRUITER: get all candidates ranked for a specific job ────────────────
// Line 50: GET /api/match/job/:jobId/candidates
exports.getCandidatesForJob = async (req, res) => {
  try {
    // Line 52: only recruiters can call this
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Only recruiters can view candidates' });
    }

    // Line 57: verify this job belongs to this recruiter
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view candidates for this job' });
    }

    // Line 65: load ALL seeker profiles, populate user name+email
    const profiles = await Profile.find()
      .populate('user', 'name email role')
      .lean();                             // .lean() = plain JS objects, faster

    // Line 70: filter to only seekers (safety check) and score each one
    const candidates = profiles
      .filter(p => p.user?.role === 'seeker')
      .map(p => {
        const { score, matchedSkills, missingSkills, extraSkills } = computeMatch(
          p.skills || [],
          job.requiredSkills || []
        );
        return {
          profileId:    p._id,
          userId:       p.user._id,
          name:         p.user.name,
          email:        p.user.email,
          headline:     p.headline || '',
          skills:       p.skills   || [],
          score,
          matchedSkills,
          missingSkills,
          extraSkills,
        };
      });

    // Line 88: sort best match first
    candidates.sort((a, b) => b.score - a.score);

    res.json({
      job: {
        id:             job._id,
        title:          job.title,
        company:        job.company,
        requiredSkills: job.requiredSkills || [],
      },
      candidates,
    });
  } catch (err) {
    console.error('getCandidatesForJob error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};