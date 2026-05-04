// resumeController.js — Step 4: AI Resume Generation proxy
// Flow: fetch seeker profile → POST to Python /generate-resume → stream .docx back
const axios   = require('axios');
const Profile = require('../models/profile');
const User    = require('../models/User');

const NLP_URL     = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
const NLP_TIMEOUT = 60000; // 60s — Gemini + docx build can take 15-20s

// GET /api/resume/generate
exports.generateResume = async (req, res) => {
  try {
    if (req.user.role !== 'seeker')
      return res.status(403).json({ message: 'Only seekers can generate a resume' });

    const [profile, user] = await Promise.all([
      Profile.findOne({ user: req.user._id }).lean(),
      User.findById(req.user._id).select('name email').lean(),
    ]);

    if (!profile)
      return res.status(400).json({ message: 'Complete your profile before generating a resume' });

    const hasSkills   = (profile.skills || []).length > 0;
    const hasHeadline = !!profile.headline;
    if (!hasSkills || !hasHeadline)
      return res.status(400).json({
        message: 'Add at least a headline and one skill to generate a resume',
        missing: [...(!hasHeadline ? ['headline'] : []), ...(!hasSkills ? ['skills'] : [])],
      });

    // Build payload matching ResumeRequest pydantic model in Python
    const payload = {
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

    console.log(`[resume] generating for ${user.name}`);

    // Stream binary .docx from Python → directly pipe to client
    const nlpResp = await axios.post(
      `${NLP_URL}/generate-resume`,
      payload,
      {
        timeout: NLP_TIMEOUT,
        responseType: 'arraybuffer',
        headers: { 'Content-Type': 'application/json' },
      }
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
    // If Python returned a JSON error (e.g. 400 validation)
    if (err.response?.data) {
      try {
        const errJson = JSON.parse(Buffer.from(err.response.data).toString());
        return res.status(status).json(errJson);
      } catch { /* fall through */ }
    }
    res.status(500).json({ message: 'Resume generation failed. Try again in a moment.' });
  }
};
