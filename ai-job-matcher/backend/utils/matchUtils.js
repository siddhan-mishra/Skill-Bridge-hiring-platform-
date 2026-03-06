function normalizeSkill(s) {
  return s.trim().toLowerCase();
}

function computeMatch(profileSkillsRaw = [], jobSkillsRaw = []) {
  const profileSkills = profileSkillsRaw.map(normalizeSkill).filter(Boolean);
  const jobSkills = jobSkillsRaw.map(normalizeSkill).filter(Boolean);

  const profileSet = new Set(profileSkills);
  const jobSet = new Set(jobSkills);

  const matchedSkills = [];
  const missingSkills = [];
  const extraSkills = [];

  // skills required by job that candidate has
  for (const js of jobSet) {
    if (profileSet.has(js)) {
      matchedSkills.push(js);
    } else {
      missingSkills.push(js);
    }
  }

  // skills candidate has that job doesn't explicitly require
  for (const ps of profileSet) {
    if (!jobSet.has(ps)) {
      extraSkills.push(ps);
    }
  }

  // simple coverage score: how many required job skills are covered
  let coverage = 0;
  if (jobSet.size > 0) {
    coverage = matchedSkills.length / jobSet.size;
  }

  const score = Math.round(coverage * 100); // 0–100 %

  return {
    score,
    matchedSkills,
    missingSkills,
    extraSkills,
  };
}

module.exports = { computeMatch };
