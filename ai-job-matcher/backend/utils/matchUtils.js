// matchUtils.js — local synonym-aware + fuzzy skill matching
// Used as FALLBACK when NLP service (SBERT) is unreachable.
// The primary scorer is nlpClient.computeHybridMatch (Step 2).

const SKILL_SYNONYMS = {
  'javascript': ['js', 'javascript', 'ecmascript', 'es6', 'es2015'],
  'typescript': ['ts', 'typescript'],
  'react':      ['react', 'reactjs', 'react.js'],
  'vue':        ['vue', 'vuejs', 'vue.js'],
  'angular':    ['angular', 'angularjs', 'angular.js'],
  'node':       ['node', 'nodejs', 'node.js', 'express', 'expressjs'],
  'next':       ['next', 'nextjs', 'next.js'],
  'python':     ['python', 'python3', 'py'],
  'django':     ['django', 'django rest framework', 'drf'],
  'flask':      ['flask'],
  'fastapi':    ['fastapi', 'fast api'],
  'ml':         ['machine learning', 'ml', 'sklearn', 'scikit-learn', 'scikit learn'],
  'dl':         ['deep learning', 'dl', 'neural networks', 'neural network'],
  'nlp':        ['nlp', 'natural language processing', 'text processing'],
  'tensorflow': ['tensorflow', 'tf', 'keras'],
  'pytorch':    ['pytorch', 'torch'],
  'pandas':     ['pandas', 'dataframes'],
  'numpy':      ['numpy', 'np'],
  'sql':        ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'rdbms'],
  'mongodb':    ['mongodb', 'mongo', 'mongoose'],
  'redis':      ['redis'],
  'aws':        ['aws', 'amazon web services', 'ec2', 's3', 'lambda'],
  'gcp':        ['gcp', 'google cloud', 'google cloud platform'],
  'azure':      ['azure', 'microsoft azure'],
  'docker':     ['docker', 'containerization', 'containers'],
  'kubernetes': ['kubernetes', 'k8s'],
  'git':        ['git', 'github', 'gitlab', 'version control'],
  'ci/cd':      ['ci/cd', 'cicd', 'github actions', 'jenkins', 'devops pipeline'],
  'react native': ['react native', 'react-native', 'rn'],
  'flutter':    ['flutter', 'dart'],
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

// Bonus expansions — MERN-style shorthands expanded to components
// Mirrors Python BONUS_EXPANSIONS in nlp-service/main.py
const BONUS_EXPANSIONS = {
  'mern':        ['mongodb', 'express', 'react', 'node'],
  'mean':        ['mongodb', 'express', 'angular', 'node'],
  'mevn':        ['mongodb', 'express', 'vue', 'node'],
  'lamp':        ['linux', 'apache', 'mysql', 'php'],
  'fullstack':   ['html', 'css', 'javascript', 'react', 'node', 'mongodb'],
  'full stack':  ['html', 'css', 'javascript', 'react', 'node', 'mongodb'],
  'devops':      ['docker', 'kubernetes', 'ci/cd', 'linux', 'git'],
  'data science':['python', 'pandas', 'numpy', 'machine learning', 'sql'],
  'ml':          ['python', 'machine learning', 'scikit-learn', 'pandas', 'numpy'],
};

const REVERSE_MAP = {};
for (const [canonical, variants] of Object.entries(SKILL_SYNONYMS)) {
  for (const v of variants) REVERSE_MAP[v.toLowerCase()] = canonical;
}

function canonicalize(skill) {
  const normalized = skill.trim().toLowerCase();
  return REVERSE_MAP[normalized] || normalized;
}

function expandSkills(rawSkills) {
  const expanded = new Set();
  for (const s of rawSkills) {
    const c = canonicalize(s);
    expanded.add(c);
    const bonuses = BONUS_EXPANSIONS[c] || BONUS_EXPANSIONS[s.trim().toLowerCase()];
    if (bonuses) bonuses.forEach(b => expanded.add(canonicalize(b)));
  }
  return expanded;
}

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

function fuzzyMatch(a, b) {
  if (a === b) return true;
  if (a.length <= 3 || b.length <= 3) return false;
  return levenshtein(a, b) <= 1;
}

function computeMatch(profileSkillsRaw = [], jobSkillsRaw = []) {
  const profileSet = expandSkills(profileSkillsRaw);
  const jobSet     = new Set(jobSkillsRaw.map(canonicalize).filter(Boolean));

  const matchedSkills = [];
  const missingSkills = [];
  const extraSkills   = [];

  for (const js of jobSet) {
    const matched = profileSet.has(js) || [...profileSet].some(ps => fuzzyMatch(ps, js));
    if (matched) matchedSkills.push(js);
    else         missingSkills.push(js);
  }

  for (const ps of profileSet) {
    const covered = jobSet.has(ps) || [...jobSet].some(js => fuzzyMatch(js, ps));
    if (!covered) extraSkills.push(ps);
  }

  const score = jobSet.size > 0
    ? Math.round((matchedSkills.length / jobSet.size) * 100)
    : 100;

  return { score, matchedSkills, missingSkills, extraSkills };
}

module.exports = { computeMatch, canonicalize, expandSkills, BONUS_EXPANSIONS };
