// matchController.js — Step 2: upgraded to hybrid SBERT scoring
const Profile = require('../models/profile');
const Job     = require('../models/Job');
const { computeHybridMatch } = require('../utils/nlpClient');

// ── SEEKER: get all jobs ranked by hybrid match score ─────────────────────
exports.getMatchesForCurrentSeeker = async (req, res) => {
  try {
    if (req.user.role !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can view matches' });
    }

    const profile = await Profile.findOne({ user: req.user._id }).lean();

    if (!profile) {
      return res.status(400).json({
        message: 'Please complete your profile before viewing matches.',
        code: 'NO_PROFILE',
      });
    }

    if (!profile.skills?.length && !profile.headline && !profile.summary) {
      return res.status(400).json({
        message: 'Your profile is empty. Add skills, headline, or summary to get matches.',
        code: 'EMPTY_PROFILE',
      });
    }

    // Only match against active internal jobs
    const jobs = await Job.find({ isActive: true, source: 'internal' })
      .sort({ createdAt: -1 })
      .lean();

    // Run hybrid scoring concurrently for all jobs (Promise.all)
    // Each call hits /compute-match on NLP service (SBERT) with local fallback
    const matchPromises = jobs.map(job => computeHybridMatch(profile, job)
      .then(result => ({
        jobId:          job._id,
        title:          job.title,
        company:        job.company,
        location:       job.location,
        jobType:        job.jobType,
        workMode:       job.workMode,
        salaryMin:      job.salaryMin,
        salaryMax:      job.salaryMax,
        salaryUnit:     job.salaryUnit,
        salaryCurrency: job.salaryCurrency,
        description:    job.description,
        requiredSkills: job.requiredSkills  || [],
        preferredSkills:job.preferredSkills || [],
        techStack:      job.techStack       || [],
        experienceYears:job.experienceYears || 0,
        educationLevel: job.educationLevel,
        expiryDate:     job.expiryDate,
        source:         job.source,
        // Match results
        score:          result.score,
        breakdown:      result.breakdown,
        matchedSkills:  result.matchedSkills,
        missingSkills:  result.missingSkills,
        extraSkills:    result.extraSkills,
        matchSource:    result.source,  // 'hybrid' or 'fallback'
      }))
    );

    const matches = await Promise.all(matchPromises);
    matches.sort((a, b) => b.score - a.score);

    res.json(matches);
  } catch (err) {
    console.error('getMatchesForCurrentSeeker error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


// ── RECRUITER: get all candidates ranked for a specific job ────────────────
exports.getCandidatesForJob = async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Only recruiters can view candidates' });
    }

    const job = await Job.findById(req.params.jobId).lean();
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this job' });
    }

    const profiles = await Profile.find()
      .populate('user', 'name email role')
      .lean();

    const seekerProfiles = profiles.filter(p => p.user?.role === 'seeker');

    // Score all candidates concurrently
    const candidatePromises = seekerProfiles.map(p =>
      computeHybridMatch(p, job).then(result => ({
        profileId:     p._id,
        userId:        p.user._id,
        name:          p.user.name,
        email:         p.user.email,
        headline:      p.headline     || '',
        avatarUrl:     p.avatarUrl    || null,
        skills:        p.skills       || [],
        tools:         p.tools        || [],
        yearsOfExp:    p.yearsOfExp   || 0,
        location:      p.location     || '',
        score:         result.score,
        breakdown:     result.breakdown,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
        extraSkills:   result.extraSkills,
        matchSource:   result.source,
      }))
    );

    const candidates = await Promise.all(candidatePromises);
    candidates.sort((a, b) => b.score - a.score);

    res.json({
      job: {
        id:              job._id,
        title:           job.title,
        company:         job.company,
        requiredSkills:  job.requiredSkills  || [],
        preferredSkills: job.preferredSkills || [],
        experienceYears: job.experienceYears || 0,
      },
      candidates,
    });
  } catch (err) {
    console.error('getCandidatesForJob error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
