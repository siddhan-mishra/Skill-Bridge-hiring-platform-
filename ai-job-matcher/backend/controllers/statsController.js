// statsController.js — Step 5: Extended Analytics
// Provides rich metrics for Recruiter Dashboard and Seeker Dashboard
// Data shapes designed to feed SVG sparklines and funnel charts directly
const Application = require('../models/Application');
const Job         = require('../models/Job');
const Profile     = require('../models/profile');

// ── Recruiter Stats (extended for Step 5 dashboard) ───────────────────────
exports.getRecruiterStats = async (req, res) => {
  try {
    if (req.user.role !== 'recruiter')
      return res.status(403).json({ message: 'Recruiters only' });

    const jobs   = await Job.find({ recruiter: req.user._id }).lean();
    const jobIds = jobs.map(j => j._id);
    const apps   = await Application.find({ job: { $in: jobIds } }).lean();

    // ── Basic counts ──
    const total       = apps.length;
    const pending     = apps.filter(a => a.status === 'pending').length;
    const reviewed    = apps.filter(a => a.status === 'reviewed').length;
    const shortlisted = apps.filter(a => a.status === 'shortlisted').length;
    const rejected    = apps.filter(a => a.status === 'rejected').length;
    const hired       = apps.filter(a => a.status === 'hired').length;

    // ── Avg match score ──
    const avgMatchScore = total > 0
      ? Math.round(apps.reduce((s, a) => s + (a.matchScore || 0), 0) / total)
      : 0;

    // ── Hiring funnel (steps ordered for funnel chart) ──
    const funnel = [
      { label: 'Applied',     count: total,       color: '#818cf8' },
      { label: 'Reviewed',    count: reviewed + shortlisted + hired, color: '#60a5fa' },
      { label: 'Shortlisted', count: shortlisted + hired, color: '#34d399' },
      { label: 'Hired',       count: hired,        color: '#a78bfa' },
    ];

    // ── Applications over last 30 days (daily buckets for sparkline) ──
    const now    = new Date();
    const days30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().slice(0, 10);
    });
    const appsByDay = {};
    for (const a of apps) {
      const key = new Date(a.createdAt).toISOString().slice(0, 10);
      appsByDay[key] = (appsByDay[key] || 0) + 1;
    }
    const sparkline = days30.map(d => ({ date: d, count: appsByDay[d] || 0 }));

    // ── Per-job pipeline (for table) ──
    const jobMap = {};
    for (const j of jobs) jobMap[j._id.toString()] = j;
    const jobPipeline = jobs.map(j => {
      const jApps = apps.filter(a => a.job.toString() === j._id.toString());
      return {
        id:          j._id,
        title:       j.title,
        company:     j.company,
        isActive:    j.isActive !== false,
        total:       jApps.length,
        shortlisted: jApps.filter(a => ['shortlisted','hired'].includes(a.status)).length,
        hired:       jApps.filter(a => a.status === 'hired').length,
        avgScore:    jApps.length > 0
          ? Math.round(jApps.reduce((s, a) => s + (a.matchScore || 0), 0) / jApps.length)
          : 0,
      };
    }).sort((a, b) => b.total - a.total);

    // ── Time to hire (days from createdAt to last updatedAt for hired apps) ──
    const hiredApps = apps.filter(a => a.status === 'hired' && a.updatedAt);
    const avgTimeToHire = hiredApps.length > 0
      ? Math.round(
          hiredApps.reduce((s, a) => {
            const diff = (new Date(a.updatedAt) - new Date(a.createdAt)) / (1000 * 60 * 60 * 24);
            return s + diff;
          }, 0) / hiredApps.length
        )
      : null;

    // ── Top required skills across all recruiter jobs ──
    const skillCount = {};
    for (const j of jobs) {
      for (const s of (j.requiredSkills || [])) {
        const k = s.toLowerCase().trim();
        skillCount[k] = (skillCount[k] || 0) + 1;
      }
    }
    const topSkills = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    // ── Conversion rate ──
    const conversionRate = total > 0 ? Math.round((hired / total) * 100) : 0;
    const shortlistRate  = total > 0 ? Math.round(((shortlisted + hired) / total) * 100) : 0;

    res.json({
      // KPIs
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.isActive !== false).length,
      totalApplications: total,
      pending, reviewed, shortlisted, rejected, hired,
      avgMatchScore, conversionRate, shortlistRate,
      avgTimeToHire,
      // Charts
      funnel,
      sparkline,
      jobPipeline,
      topSkills,
      // Legacy (RecruiterJobsPage stats strip uses these)
      countByJob: Object.fromEntries(jobs.map(j => [j._id, apps.filter(a => a.job.toString() === j._id.toString()).length])),
      topJobs: jobPipeline.slice(0, 5).map(j => ({ id: j.id, title: j.title, company: j.company, count: j.total })),
    });
  } catch (err) {
    console.error('getRecruiterStats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Seeker Stats (extended for Step 5 dashboard) ─────────────────────────
exports.getSeekerStats = async (req, res) => {
  try {
    if (req.user.role !== 'seeker')
      return res.status(403).json({ message: 'Seekers only' });

    const apps = await Application.find({ seeker: req.user._id })
      .populate('job', 'title company requiredSkills matchScore')
      .sort({ createdAt: -1 })
      .lean();

    const profile = await Profile.findOne({ user: req.user._id }).lean();

    const total       = apps.length;
    const pending     = apps.filter(a => a.status === 'pending').length;
    const reviewed    = apps.filter(a => a.status === 'reviewed').length;
    const shortlisted = apps.filter(a => a.status === 'shortlisted').length;
    const rejected    = apps.filter(a => a.status === 'rejected').length;
    const hired       = apps.filter(a => a.status === 'hired').length;
    const avgScore    = total > 0
      ? Math.round(apps.reduce((s, a) => s + (a.matchScore || 0), 0) / total)
      : 0;
    const shortlistRate = total > 0 ? Math.round(((shortlisted + hired) / total) * 100) : 0;

    // ── Applications over last 30 days sparkline ──
    const now    = new Date();
    const days30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().slice(0, 10);
    });
    const appsByDay = {};
    for (const a of apps) {
      const key = new Date(a.createdAt).toISOString().slice(0, 10);
      appsByDay[key] = (appsByDay[key] || 0) + 1;
    }
    const sparkline = days30.map(d => ({ date: d, count: appsByDay[d] || 0 }));

    // ── Score distribution buckets ──
    const scoreBuckets = { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 };
    for (const a of apps) {
      const s = a.matchScore || 0;
      if (s <= 25) scoreBuckets['0-25']++;
      else if (s <= 50) scoreBuckets['26-50']++;
      else if (s <= 75) scoreBuckets['51-75']++;
      else scoreBuckets['76-100']++;
    }

    // ── Profile completeness ──
    const fields = ['headline', 'summary', 'skills', 'workHistory', 'education', 'location', 'linkedinUrl', 'githubUrl'];
    const filled = fields.filter(f => {
      const v = profile?.[f];
      return Array.isArray(v) ? v.length > 0 : !!v;
    }).length;
    const profileCompleteness = Math.round((filled / fields.length) * 100);

    // ── Recent 5 applications for timeline ──
    const recentApps = apps.slice(0, 8).map(a => ({
      _id:        a._id,
      jobTitle:   a.job?.title || 'Unknown',
      company:    a.job?.company || '',
      status:     a.status,
      matchScore: a.matchScore || 0,
      createdAt:  a.createdAt,
      jobId:      a.job?._id,
    }));

    res.json({
      total, pending, reviewed, shortlisted, rejected, hired,
      avgMatchScore: avgScore,
      shortlistRate,
      sparkline,
      scoreBuckets,
      profileCompleteness,
      recentApps,
      profileMissing: !profile,
    });
  } catch (err) {
    console.error('getSeekerStats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
