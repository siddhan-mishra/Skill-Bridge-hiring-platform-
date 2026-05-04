/**
 * nlpClient.js — Node.js helper to call the Python NLP service.
 *
 * Step 2: computeHybridMatch()
 *   Calls POST /compute-match on the FastAPI NLP service.
 *   Returns the full hybrid score breakdown.
 *   Falls back to local matchUtils.computeMatch() if NLP service is unreachable.
 *
 * Step 6 (future): fetchExternalJobs() will be added here.
 */

const axios = require('axios');
const { computeMatch: localMatch, canonicalize } = require('./matchUtils');

const NLP_BASE    = process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8000';
const NLP_TIMEOUT = 12000; // 12 seconds — SBERT encode can take ~1-2s first call

/**
 * Builds a rich profile text blob for SBERT from a Profile document.
 * The richer this text, the more accurately SBERT understands the candidate.
 * Inspired by LinkedIn's talent profile vectorization approach.
 */
function buildProfileText(profile) {
  const parts = [];

  if (profile.headline)       parts.push(profile.headline);
  if (profile.summary)        parts.push(profile.summary);
  if (profile.currentTitle)   parts.push(`Current role: ${profile.currentTitle}`);
  if (profile.currentCompany) parts.push(`at ${profile.currentCompany}`);

  if (profile.skills?.length)
    parts.push(`Skills: ${profile.skills.join(', ')}`);
  if (profile.tools?.length)
    parts.push(`Tools: ${profile.tools.join(', ')}`);

  if (profile.workHistory?.length) {
    for (const w of profile.workHistory) {
      parts.push(`${w.role} at ${w.company} (${w.startDate}–${w.endDate}).`);
      if (w.achievements?.length)
        parts.push(w.achievements.join(' '));
    }
  }

  if (profile.projects?.length) {
    for (const p of profile.projects) {
      parts.push(`Project: ${p.title}. ${p.description || ''}`);
      if (p.technologies?.length)
        parts.push(`Technologies: ${p.technologies.join(', ')}`);
    }
  }

  if (profile.certifications?.length) {
    parts.push(`Certifications: ${profile.certifications.map(c => c.name).join(', ')}`);
  }

  return parts.filter(Boolean).join(' ');
}

/**
 * Builds the job text blob for SBERT from a Job document.
 */
function buildJobText(job) {
  const parts = [];
  parts.push(`${job.title} at ${job.company}.`);
  if (job.industry)       parts.push(`Industry: ${job.industry}.`);
  if (job.description)    parts.push(job.description);
  if (job.responsibilities?.length)
    parts.push(`Responsibilities: ${job.responsibilities.join(' ')}`);
  if (job.outcomes?.length)
    parts.push(`Goals: ${job.outcomes.join(' ')}`);
  if (job.requiredSkills?.length)
    parts.push(`Required skills: ${job.requiredSkills.join(', ')}`);
  if (job.preferredSkills?.length)
    parts.push(`Preferred skills: ${job.preferredSkills.join(', ')}`);
  if (job.techStack?.length)
    parts.push(`Tech stack: ${job.techStack.join(', ')}`);
  return parts.filter(Boolean).join(' ');
}

/**
 * Map education level string → numeric tier for comparison.
 * Seeker education is stored in profile.education[0].degree.
 */
function eduScore(seekerDegree = '', requiredLevel = 'Any') {
  const tiers = { 'any': 0, 'high school': 1, 'diploma': 2, "bachelor's": 3, "master's": 4, 'phd': 5 };
  const req = tiers[requiredLevel.toLowerCase()] ?? 0;
  if (req === 0) return 1.0; // Any = full score
  const degree = seekerDegree.toLowerCase();
  let seekerTier = 3; // default assume bachelor's
  if (degree.includes('phd') || degree.includes('doctorate'))  seekerTier = 5;
  else if (degree.includes('master') || degree.includes('mba')) seekerTier = 4;
  else if (degree.includes('bachelor') || degree.includes('b.tech') || degree.includes('be')) seekerTier = 3;
  else if (degree.includes('diploma')) seekerTier = 2;
  return seekerTier >= req ? 1.0 : Math.max(0.2, seekerTier / req);
}

/**
 * computeHybridMatch — main export used by matchController.
 *
 * @param {Object} profile  — Mongoose Profile document (lean)
 * @param {Object} job      — Mongoose Job document (lean)
 * @returns {Object}        — { score, breakdown, matchedSkills, missingSkills, extraSkills }
 */
async function computeHybridMatch(profile, job) {
  const profileText = buildProfileText(profile);
  const jobText     = buildJobText(job);

  // Education match score (structured, computed in Node — no NLP needed)
  const topDegree   = profile.education?.[0]?.degree || '';
  const edScore     = eduScore(topDegree, job.educationLevel || 'Any');

  const payload = {
    profileText,
    jobText,
    profileSkills: profile.skills   || [],
    jobSkills:     job.requiredSkills || [],
    profileYears:  profile.yearsOfExp  || 0,
    requiredYears: job.experienceYears || 0,
    educationMatch: edScore,
  };

  try {
    const res = await axios.post(`${NLP_BASE}/compute-match`, payload, { timeout: NLP_TIMEOUT });
    const data = res.data;

    // NLP service signals fallback with score: -1
    if (data.score === -1) throw new Error('NLP service returned error');

    return {
      score:         data.score,
      breakdown:     data.breakdown,
      matchedSkills: data.matchedSkills || [],
      missingSkills: data.missingSkills || [],
      extraSkills:   data.extraSkills   || [],
      source:        'hybrid',
    };
  } catch (err) {
    // ── Graceful fallback to local synonym+fuzzy matcher ──────────────────
    // This ensures the app works even when the NLP service is stopped.
    console.warn('[nlpClient] NLP service unavailable, falling back to local matchUtils:', err.message);
    const local = computeMatch(profile.skills || [], job.requiredSkills || []);
    return {
      score:         local.score,
      breakdown:     { semanticScore: null, skillScore: local.score, structScore: null },
      matchedSkills: local.matchedSkills,
      missingSkills: local.missingSkills,
      extraSkills:   local.extraSkills,
      source:        'fallback',
    };
  }
}

module.exports = { computeHybridMatch, buildProfileText, buildJobText };
