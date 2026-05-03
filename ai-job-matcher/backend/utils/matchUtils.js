// matchUtils.js — Phase 3: synonym-aware + fuzzy skill matching

// Synonym map: all variations collapse to a canonical key
// Add more as your platform grows
const SKILL_SYNONYMS = {
  // JavaScript ecosystem
  'javascript': ['js', 'javascript', 'ecmascript', 'es6', 'es2015'],
  'typescript': ['ts', 'typescript'],
  'react':      ['react', 'reactjs', 'react.js'],
  'vue':        ['vue', 'vuejs', 'vue.js'],
  'angular':    ['angular', 'angularjs', 'angular.js'],
  'node':       ['node', 'nodejs', 'node.js', 'express', 'expressjs'],
  'next':       ['next', 'nextjs', 'next.js'],
  // Python ecosystem
  'python':     ['python', 'python3', 'py'],
  'django':     ['django', 'django rest framework', 'drf'],
  'flask':      ['flask'],
  'fastapi':    ['fastapi', 'fast api'],
  // Data / AI
  'ml':         ['machine learning', 'ml', 'sklearn', 'scikit-learn', 'scikit learn'],
  'dl':         ['deep learning', 'dl', 'neural networks', 'neural network'],
  'nlp':        ['nlp', 'natural language processing', 'text processing'],
  'tensorflow': ['tensorflow', 'tf', 'keras'],
  'pytorch':    ['pytorch', 'torch'],
  'pandas':     ['pandas', 'dataframes'],
  'numpy':      ['numpy', 'np'],
  // Databases
  'sql':        ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'rdbms'],
  'mongodb':    ['mongodb', 'mongo', 'mongoose'],
  'redis':      ['redis'],
  // Cloud / DevOps
  'aws':        ['aws', 'amazon web services', 'ec2', 's3', 'lambda'],
  'gcp':        ['gcp', 'google cloud', 'google cloud platform'],
  'azure':      ['azure', 'microsoft azure'],
  'docker':     ['docker', 'containerization', 'containers'],
  'kubernetes': ['kubernetes', 'k8s'],
  'git':        ['git', 'github', 'gitlab', 'version control'],
  'ci/cd':      ['ci/cd', 'cicd', 'github actions', 'jenkins', 'devops pipeline'],
  // Mobile
  'react native': ['react native', 'react-native', 'rn'],
  'flutter':    ['flutter', 'dart'],
  // Other
  'java':       ['java', 'spring', 'spring boot', 'springboot'],
  'c++':        ['c++', 'cpp'],
  'c#':         ['c#', 'csharp', '.net', 'dotnet'],
  'php':        ['php', 'laravel'],
  'html':       ['html', 'html5', 'html/css', 'html & css'],
  'css':        ['css', 'css3', 'sass', 'scss', 'tailwind', 'tailwindcss', 'bootstrap'],
  'graphql':    ['graphql', 'graph ql'],
  'rest':       ['rest', 'rest api', 'restful', 'restful api', 'api design'],
  'linux':      ['linux', 'unix', 'bash', 'shell scripting', 'shell'],
  'figma':      ['figma', 'ui/ux', 'ux design', 'ui design'],
  'agile':      ['agile', 'scrum', 'kanban', 'jira'],
};

// Build reverse lookup: "reactjs" → "react"
const REVERSE_MAP = {};
for (const [canonical, variants] of Object.entries(SKILL_SYNONYMS)) {
  for (const v of variants) {
    REVERSE_MAP[v.toLowerCase()] = canonical;
  }
}

function canonicalize(skill) {
  const normalized = skill.trim().toLowerCase();
  return REVERSE_MAP[normalized] || normalized;
}

// Levenshtein distance for fuzzy matching short tokens
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// Fuzzy match: two canonical skills are similar if edit distance ≤ 1 AND len > 3
function fuzzyMatch(a, b) {
  if (a === b) return true;
  if (a.length <= 3 || b.length <= 3) return false; // short tokens: exact only
  return levenshtein(a, b) <= 1;
}

function computeMatch(profileSkillsRaw = [], jobSkillsRaw = []) {
  const profileSkills = profileSkillsRaw.map(canonicalize).filter(Boolean);
  const jobSkills     = jobSkillsRaw.map(canonicalize).filter(Boolean);

  const profileSet = new Set(profileSkills);
  const jobSet     = new Set(jobSkills);

  const matchedSkills = [];
  const missingSkills = [];
  const extraSkills   = [];

  for (const js of jobSet) {
    // exact canonical match OR fuzzy match against any profile skill
    const matched =
      profileSet.has(js) ||
      [...profileSet].some(ps => fuzzyMatch(ps, js));

    if (matched) matchedSkills.push(js);
    else         missingSkills.push(js);
  }

  for (const ps of profileSet) {
    const covered =
      jobSet.has(ps) ||
      [...jobSet].some(js => fuzzyMatch(js, ps));
    if (!covered) extraSkills.push(ps);
  }

  const score = jobSet.size > 0
    ? Math.round((matchedSkills.length / jobSet.size) * 100)
    : 0;

  return { score, matchedSkills, missingSkills, extraSkills };
}

module.exports = { computeMatch, canonicalize };
