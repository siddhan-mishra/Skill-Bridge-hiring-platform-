import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createJob } from '../../api/jobApi';
import SkillSuggestChips from '../../components/recruiter/SkillSuggestChips';

const WORK_MODES   = ['Remote', 'Hybrid', 'On-site'];
const JOB_TYPES    = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance', 'Other'];
const EDU_LEVELS   = ['Any', 'High School', 'Diploma', "Bachelor's", "Master's", 'PhD'];
const CURRENCIES   = ['INR', 'USD', 'EUR', 'GBP'];
const SALARY_UNITS = ['LPA', 'K', 'CR', 'Annual', 'Monthly'];

const INITIAL = {
  title: '', company: '', industry: '', jobCategory: '',
  jobType: 'Full-time', workMode: 'On-site', location: '', timezone: '',
  salaryMin: '', salaryMax: '', salaryCurrency: 'INR', salaryUnit: 'LPA',
  bonusInfo: '', equity: '', benefits: '',
  description: '', responsibilities: '', outcomes: '',
  requiredSkills: [], preferredSkills: [], softSkills: [], techStack: [],
  experienceYears: 0, educationLevel: 'Any', languages: '',
  interviewStages: '', expectedTimeline: '', hiringManager: '',
  applicationInstructions: '', expiryDate: '', diversityStatement: '',
};

function SkillTagInput({ label, skills, setSkills, placeholder }) {
  const [val, setVal] = useState('');
  const add = (s) => {
    const t = s.trim();
    if (t && !skills.includes(t)) setSkills([...skills, t]);
  };
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(val); setVal(''); }
  };
  return (
    <div className="skill-tag-group">
      <label>{label}</label>
      <div className="tag-input-row">
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder || 'Type and press Enter'}
        />
        <button type="button" className="btn-add-tag" onClick={() => { add(val); setVal(''); }}>Add</button>
      </div>
      <div className="tag-list">
        {skills.map(s => (
          <span key={s} className="tag">
            {s}
            <button type="button" onClick={() => setSkills(skills.filter(x => x !== s))}>×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function JobCreatePage() {
  const [form, setForm]   = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const navigate = useNavigate();

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      // Convert comma-separated text fields to arrays
      const payload = {
        ...form,
        benefits:        form.benefits.split(',').map(s => s.trim()).filter(Boolean),
        responsibilities:form.responsibilities.split('\n').map(s => s.trim()).filter(Boolean),
        outcomes:        form.outcomes.split('\n').map(s => s.trim()).filter(Boolean),
        languages:       form.languages.split(',').map(s => s.trim()).filter(Boolean),
        interviewStages: form.interviewStages.split(',').map(s => s.trim()).filter(Boolean),
        salaryMin:  form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax:  form.salaryMax ? Number(form.salaryMax) : undefined,
        expiryDate: form.expiryDate || undefined,
      };
      await createJob(payload);
      navigate('/recruiter/jobs');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="job-create-page">
      <h1>📋 Post a New Job</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="job-form">

        {/* ── Section 1: Core Identity ── */}
        <section className="form-section">
          <h2>🏢 Job Details</h2>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Job Title *</label>
              <input required value={form.title} onChange={set('title')} placeholder="e.g. Full Stack Developer" />
            </div>
            <div className="form-group">
              <label>Company Name *</label>
              <input required value={form.company} onChange={set('company')} placeholder="e.g. Acme Corp" />
            </div>
            <div className="form-group">
              <label>Industry</label>
              <input value={form.industry} onChange={set('industry')} placeholder="e.g. FinTech, EdTech" />
            </div>
            <div className="form-group">
              <label>Job Category / Function</label>
              <input value={form.jobCategory} onChange={set('jobCategory')} placeholder="e.g. Engineering, Design" />
            </div>
          </div>
        </section>

        {/* ── Section 2: Employment Type ── */}
        <section className="form-section">
          <h2>💼 Employment</h2>
          <div className="form-grid-3">
            <div className="form-group">
              <label>Job Type</label>
              <select value={form.jobType} onChange={set('jobType')}>
                {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Work Mode</label>
              <select value={form.workMode} onChange={set('workMode')}>
                {WORK_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Location</label>
              <input value={form.location} onChange={set('location')} placeholder="e.g. Bengaluru, India" />
            </div>
            <div className="form-group">
              <label>Timezone</label>
              <input value={form.timezone} onChange={set('timezone')} placeholder="e.g. IST, EST" />
            </div>
          </div>
        </section>

        {/* ── Section 3: Compensation ── */}
        <section className="form-section">
          <h2>💰 Compensation</h2>
          <div className="form-grid-4">
            <div className="form-group">
              <label>Salary Min</label>
              <input type="number" min="0" value={form.salaryMin} onChange={set('salaryMin')} placeholder="e.g. 8" />
            </div>
            <div className="form-group">
              <label>Salary Max</label>
              <input type="number" min="0" value={form.salaryMax} onChange={set('salaryMax')} placeholder="e.g. 16" />
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select value={form.salaryUnit} onChange={set('salaryUnit')}>
                {SALARY_UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select value={form.salaryCurrency} onChange={set('salaryCurrency')}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Bonus / Incentive Info</label>
              <input value={form.bonusInfo} onChange={set('bonusInfo')} placeholder="e.g. Annual performance bonus" />
            </div>
            <div className="form-group">
              <label>Equity / Stock Options</label>
              <input value={form.equity} onChange={set('equity')} placeholder="e.g. 0.1% ESOP" />
            </div>
          </div>
          <div className="form-group">
            <label>Benefits (comma-separated)</label>
            <input value={form.benefits} onChange={set('benefits')} placeholder="Health Insurance, PTO, Remote Allowance" />
          </div>
        </section>

        {/* ── Section 4: Job Content ── */}
        <section className="form-section">
          <h2>📝 Job Description</h2>
          <div className="form-group">
            <label>Full Job Description *</label>
            <textarea required rows={6} value={form.description} onChange={set('description')}
              placeholder="Describe the role, team, mission, and what success looks like..." />
          </div>
          <div className="form-group">
            <label>Key Responsibilities (one per line)</label>
            <textarea rows={4} value={form.responsibilities} onChange={set('responsibilities')}
              placeholder="Build scalable REST APIs&#10;Lead code reviews&#10;Collaborate with design team" />
          </div>
          <div className="form-group">
            <label>30-60-90 Day Goals (one per line)</label>
            <textarea rows={3} value={form.outcomes} onChange={set('outcomes')}
              placeholder="30 days: Onboard and ship first feature&#10;60 days: Own a full module&#10;90 days: Lead a sprint" />
          </div>
        </section>

        {/* ── Section 5: Skills ── */}
        <section className="form-section">
          <h2>🛠️ Skills Required</h2>

          {/* AI Skill Suggestion — calls /suggest-skills on NLP service */}
          <SkillSuggestChips
            title={form.title}
            description={form.description}
            currentSkills={[...form.requiredSkills, ...form.preferredSkills]}
            addSkill={(skill) => {
              if (!form.requiredSkills.includes(skill))
                setForm(f => ({ ...f, requiredSkills: [...f.requiredSkills, skill] }));
            }}
          />

          <SkillTagInput label="Required Skills (Must-have)" skills={form.requiredSkills}
            setSkills={s => setForm(f => ({ ...f, requiredSkills: s }))}
            placeholder="React, Node.js — press Enter" />
          <SkillTagInput label="Preferred Skills (Nice-to-have)" skills={form.preferredSkills}
            setSkills={s => setForm(f => ({ ...f, preferredSkills: s }))}
            placeholder="GraphQL, Redis — press Enter" />
          <SkillTagInput label="Soft Skills" skills={form.softSkills}
            setSkills={s => setForm(f => ({ ...f, softSkills: s }))}
            placeholder="Communication, Leadership — press Enter" />
          <SkillTagInput label="Tech Stack / Tools" skills={form.techStack}
            setSkills={s => setForm(f => ({ ...f, techStack: s }))}
            placeholder="AWS, Jira, Figma — press Enter" />
        </section>

        {/* ── Section 6: Requirements ── */}
        <section className="form-section">
          <h2>🎓 Requirements</h2>
          <div className="form-grid-3">
            <div className="form-group">
              <label>Min. Years of Experience</label>
              <input type="number" min="0" max="30" value={form.experienceYears}
                onChange={set('experienceYears')} />
            </div>
            <div className="form-group">
              <label>Education Level</label>
              <select value={form.educationLevel} onChange={set('educationLevel')}>
                {EDU_LEVELS.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Languages (comma-separated)</label>
              <input value={form.languages} onChange={set('languages')} placeholder="English, Hindi" />
            </div>
          </div>
        </section>

        {/* ── Section 7: Process ── */}
        <section className="form-section">
          <h2>🔄 Hiring Process</h2>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Interview Stages (comma-separated)</label>
              <input value={form.interviewStages} onChange={set('interviewStages')}
                placeholder="HR Screening, Technical Round, Final Interview" />
            </div>
            <div className="form-group">
              <label>Expected Timeline</label>
              <input value={form.expectedTimeline} onChange={set('expectedTimeline')}
                placeholder="e.g. 2-3 weeks" />
            </div>
            <div className="form-group">
              <label>Hiring Manager / POC</label>
              <input value={form.hiringManager} onChange={set('hiringManager')}
                placeholder="Name or team" />
            </div>
            <div className="form-group">
              <label>Posting Expiry Date</label>
              <input type="date" value={form.expiryDate} onChange={set('expiryDate')} />
            </div>
          </div>
          <div className="form-group">
            <label>Application Instructions</label>
            <textarea rows={2} value={form.applicationInstructions}
              onChange={set('applicationInstructions')}
              placeholder="Any specific instructions for candidates..." />
          </div>
          <div className="form-group">
            <label>D&I Statement (optional)</label>
            <textarea rows={2} value={form.diversityStatement}
              onChange={set('diversityStatement')}
              placeholder="We are an equal opportunity employer..." />
          </div>
        </section>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '⏳ Posting...' : '🚀 Post Job'}
          </button>
        </div>

      </form>
    </div>
  );
}
