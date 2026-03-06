const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { extractSkills } = require('../services/nlpClient');

// any logged-in user can call this for now
router.post('/extract-skills', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'text is required' });
    }
    const skills = await extractSkills(text);
    res.json({ skills });
  } catch (err) {
    console.error('NLP extract-skills error:', err.message);
    res.status(500).json({ message: 'Skill extraction failed' });
  }
});

module.exports = router;
