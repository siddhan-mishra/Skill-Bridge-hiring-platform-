const Profile = require('../models/profile');
const Job = require('../models/Job');
const { computeMatch } = require('../utils/matchUtils');

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

    // sort by score desc
    matches.sort((a, b) => b.score - a.score);

    res.json(matches);
  } catch (err) {
    console.error('getMatchesForCurrentSeeker error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
