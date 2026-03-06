const axios = require('axios');

const NLP_BASE_URL = process.env.NLP_BASE_URL || 'http://localhost:8000';

async function extractSkills(text) {
  const res = await axios.post(`${NLP_BASE_URL}/extract-skills`, { text });
  return res.data.skills || [];
}

module.exports = { extractSkills };
