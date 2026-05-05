// resumeController.js — v2
// GET  /api/resume/generate      → streams .docx to browser (download)
// POST /api/resume/generate-save → generates .docx, uploads to Cloudinary raw,
//                                  saves URL to profile.resumeUrl, returns { resumeUrl }
const axios    = require('axios');
const Profile  = require('../models/profile');
const User     = require('../models/User');
const { cloudinary } = require('../config/cloudinary');

const NLP_URL     = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
const NLP_TIMEOUT = 60000;

// ── shared: build NLP payload from profile + user ──────────────────────────
function buildPayload(profile, user) {
  return {
    name:          user.name          || '',
    email:         user.email         || '',
    phone:         profile.phone      || '',
    location:      profile.location   || '',
    linkedinUrl:   profile.linkedinUrl  || '',
    githubUrl:     profile.githubUrl    || '',
    portfolioUrl:  profile.portfolioUrl || '',
    headline:      profile.headline    || '',
    summary:       profile.summary     || '',
    skills:        profile.skills      || [],
    techStack:     profile.techStack   || [],
    softSkills:    profile.softSkills  || [],
    workHistory:   profile.workHistory || [],
    education:     profile.education   || [],
    projects:      profile.projects    || [],
    certifications: profile.certifications || [],
    languages:     profile.languages   || [],
    yearsOfExp:    profile.yearsOfExp  || 0,
  };
}

// ── shared: guard — profile must have headline + skills ────────────────────
function guardProfile(profile, res) {
  if (!profile) {
    res.status(400).json({ message: 'Complete your profile before generating a resume' });
    return false;
  }
  const hasSkills   = (profile.skills || []).length > 0;
  const hasHeadline = !!profile.headline;
  if (!hasSkills || !hasHeadline) {
    res.status(400).json({
      message: 'Add at least a headline and one skill to generate a resume',
      missing: [...(!hasHeadline ? ['headline'] : []), ...(!hasSkills ? ['skills'] : [])],
    });
    return false;
  }
  return true;
}

// ── GET /api/resume/generate — stream .docx directly to browser ────────────
exports.generateResume = async (req, res) => {
  try {
    if (req.user.role !== 'seeker')
      return res.status(403).json({ message: 'Only seekers can generate a resume' });

    const [profile, user] = await Promise.all([
      Profile.findOne({ user: req.user._id }).lean(),
      User.findById(req.user._id).select('name email').lean(),
    ]);

    if (!guardProfile(profile, res)) return;

    const payload = buildPayload(profile, user);
    console.log(`[resume] generating for ${user.name}`);

    const nlpResp = await axios.post(
      `${NLP_URL}/generate-resume`,
      payload,
      { timeout: NLP_TIMEOUT, responseType: 'arraybuffer', headers: { 'Content-Type': 'application/json' } }
    );

    const safeName = (user.name || 'Resume').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const filename = `${safeName}_Resume.docx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': nlpResp.data.byteLength,
    });
    res.send(Buffer.from(nlpResp.data));
    console.log(`[resume] sent ${filename} (${nlpResp.data.byteLength} bytes)`);
  } catch (err) {
    console.error('[resume] error:', err.message);
    const status = err.response?.status || 500;
    if (err.response?.data) {
      try {
        const errJson = JSON.parse(Buffer.from(err.response.data).toString());
        return res.status(status).json(errJson);
      } catch { /* fall through */ }
    }
    res.status(500).json({ message: 'Resume generation failed. Try again in a moment.' });
  }
};

// ── POST /api/resume/generate-save — generate + upload to Cloudinary + save URL ──
// Called by the frontend "✨ Generate Resume" button in ProfilePage.
// Returns { resumeUrl } — the permanent Cloudinary URL stored on the profile.
exports.generateAndSaveResume = async (req, res) => {
  try {
    if (req.user.role !== 'seeker')
      return res.status(403).json({ message: 'Only seekers can generate a resume' });

    const [profile, user] = await Promise.all([
      Profile.findOne({ user: req.user._id }).lean(),
      User.findById(req.user._id).select('name email').lean(),
    ]);

    if (!guardProfile(profile, res)) return;

    const payload = buildPayload(profile, user);
    console.log(`[resume:save] generating for ${user.name}`);

    // Step 1 — generate .docx from NLP service
    const nlpResp = await axios.post(
      `${NLP_URL}/generate-resume`,
      payload,
      { timeout: NLP_TIMEOUT, responseType: 'arraybuffer', headers: { 'Content-Type': 'application/json' } }
    );

    const docxBuffer = Buffer.from(nlpResp.data);
    const safeName   = (user.name || 'Resume').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');

    // Step 2 — upload .docx to Cloudinary as raw resource
    const cloudResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:        'skillbridge/generated-resumes',
          public_id:     `gen_resume_${req.user._id}`,
          resource_type: 'raw',
          format:        'docx',
          overwrite:     true,
        },
        (err, result) => err ? reject(err) : resolve(result)
      );
      stream.end(docxBuffer);
    });

    const resumeUrl = cloudResult.secure_url;

    // Step 3 — persist to profile
    await Profile.findOneAndUpdate(
      { user: req.user._id },
      { resumeUrl, user: req.user._id },
      { upsert: true, new: false }
    );

    console.log(`[resume:save] saved ${safeName}_Resume.docx → ${resumeUrl}`);
    res.json({ resumeUrl, filename: `${safeName}_Resume.docx` });
  } catch (err) {
    console.error('[resume:save] error:', err.message);
    const status = err.response?.status || 500;
    if (err.response?.data) {
      try {
        const errJson = JSON.parse(Buffer.from(err.response.data).toString());
        return res.status(status).json(errJson);
      } catch { /* fall through */ }
    }
    res.status(500).json({ message: 'Resume generation failed. Try again in a moment.' });
  }
};
