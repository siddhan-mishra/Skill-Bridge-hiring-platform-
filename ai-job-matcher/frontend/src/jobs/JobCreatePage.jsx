import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

const JOB_TYPES   = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
const WORK_MODES  = ['Remote', 'Hybrid', 'On-site'];
const EDU_LEVELS  = ['Any', "Bachelor's", "Master's", 'PhD', 'Diploma', 'High School'];
const CURRENCIES  = ['INR', 'USD', 'EUR', 'GBP', 'AED'];
const SAL_UNITS   = ['LPA', 'K', 'Annual', 'Monthly'];

const S = {
  card:  { background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: 12, padding: '1.5rem', marginBottom: '1.25rem' },
  label: { color: '#9ca3af', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' },
  inp:   { width: '100%', background: '#0f172a', color: '#e5e7eb', border: '1px solid #1f2937', borderRadius: 7, padding: '0.5rem 0.75rem', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  row:   { display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' },
  half:  { flex: '1 1 200px', minWidth: 160 },
  chip:  { display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 999, fontSize: '0.78rem', cursor: 'pointer', marginRight: '0.35rem', marginBottom: '0.35rem' },
  chipGreen: { background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' },
  sectionTitle: { color: '#e5e7eb', fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
};

function TagInput({ values, onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = (raw) => {
    const tags = raw.split(',').map(s => s.trim()).filter(Boolean);
    const next = [...new Set([...values, ...tags])];
    onChange(next);
    setDraft('');
  };
  return (
    <div style={{ ...S.inp, minHeight: 42, display: 'flex', flexWrap: 'wrap', gap: '0.3rem', padding: '0.4rem 0.6rem', cursor: 'text' }}>
      {values.map((v, i) => (
        <span key={i} style={{ ...S.chip, margin: 0 }}>
          {v}
          <span onClick={() => onChange(values.filter((_, j) => j !== i))} style={{ marginLeft: 2, opacity: 0.7, fontWeight: 700 }}>×</span>
        </span>
      ))}
      <input
        style={{ border: 'none', background: 'transparent', color: '#e5e7eb', outline: 'none', fontSize: '0.88rem', minWidth: 120, flex: 1 }}
        placeholder={values.length === 0 ? placeholder : 'add more...'}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); } }}
        onBlur={() => { if (draft.trim()) add(draft); }}
      />
    </div>
  );
}

export default function JobCreatePage() {
  const { user, API_BASE } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [form, setForm] = useState({
    title: '', company: '', industry: '', jobCategory: '',
    jobType: 'Full-time', workMode: 'On-site', location: '', timezone: '',
    salaryMin: '', salaryMax: '', salaryUnit: 'LPA', salaryCurrency: 'INR',
    description: '', responsibilities: '', outcomes: '',
    requiredSkills: [], preferredSkills: [], softSkills: [], techStack: [],
    experienceYears: 0, educationLevel: 'Any', languages: [],
    interviewStages: [], expectedTimeline: '', diversityStatement: '',
    expiryDate: '',
  });

  const [aiChips, setAiChips]   = useState([]);
  const [aiLoading, setAiLoad]  = useState(false);
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState(false);

  if (!user || user.role !== 'recruiter') {
    return <div className="card"><p style={{ color: '#f87171' }}>Only recruiters can post jobs.</p></div>;
  }

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
  const inp = (field, extra = {}) => ({
    style: S.inp, value: form[field],
    onChange: e => set(field, e.target.value),
    ...extra,
  });

  // ── AI Skill Suggestions ──────────────────────────────────────────────────
  const suggestSkills = async () => {
    if (!form.title && !form.description) return;
    setAiLoad(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/jobs/suggest-skills`,
        { title: form.title, description: form.description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAiChips(res.data.skills || []);
    } catch { setAiChips([]); }
    setAiLoad(false);
  };

  const addChip = (skill) => {
    if (!form.requiredSkills.includes(skill))
      set('requiredSkills', [...form.requiredSkills, skill]);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.company.trim() || !form.description.trim()) {
      setError('Title, Company, and Description are required.'); return;
    }
    setSaving(true); setError('');
    const payload = {
      ...form,
      salaryMin:       form.salaryMin       ? Number(form.salaryMin)  : undefined,
      salaryMax:       form.salaryMax       ? Number(form.salaryMax)  : undefined,
      experienceYears: Number(form.experienceYears) || 0,
      responsibilities: form.responsibilities.split('\n').map(s => s.trim()).filter(Boolean),
      outcomes:         form.outcomes.split('\n').map(s => s.trim()).filter(Boolean),
      isActive: true,
      source:   'internal',
    };
    try {
      const res = await axios.post(`${API_BASE}/api/jobs`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess(true);
      setTimeout(() => navigate(`/jobs/${res.data._id}`), 1200);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to create job.');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 820, width: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#e5e7eb', margin: 0 }}>📋 Post a New Job</h2>
        <p style={{ color: '#4b5563', fontSize: '0.85rem', marginTop: '0.25rem' }}>All fields marked * are required. Skills are used by the AI matcher.</p>
      </div>

      {error   && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem' }}>✅ Job posted! Redirecting…</div>}

      <form onSubmit={handleSubmit}>

        {/* ── Section 1: Core Identity ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>🏢 Job Details</div>
          <div style={S.row}>
            <div style={{ ...S.half, flex: '2 1 280px' }}>
              <label style={S.label}>Job Title *</label>
              <input {...inp('title', { placeholder: 'e.g. Senior React Developer', required: true })} />
            </div>
            <div style={S.half}>
              <label style={S.label}>Company *</label>
              <input {...inp('company', { placeholder: 'e.g. SkillBridge Inc.', required: true })} />
            </div>
          </div>
          <div style={S.row}>
            <div style={S.half}>
              <label style={S.label}>Industry</label>
              <input {...inp('industry', { placeholder: 'e.g. FinTech, HealthTech' })} />
            </div>
            <div style={S.half}>
              <label style={S.label}>Category</label>
              <input {...inp('jobCategory', { placeholder: 'e.g. Engineering, Design' })} />
            </div>
          </div>
        </div>

        {/* ── Section 2: Employment ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>💼 Employment Details</div>
          <div style={S.row}>
            <div style={S.half}>
              <label style={S.label}>Job Type</label>
              <select style={S.inp} value={form.jobType} onChange={e => set('jobType', e.target.value)}>
                {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={S.half}>
              <label style={S.label}>Work Mode</label>
              <select style={S.inp} value={form.workMode} onChange={e => set('workMode', e.target.value)}>
                {WORK_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div style={S.half}>
              <label style={S.label}>Location</label>
              <input {...inp('location', { placeholder: 'e.g. Bangalore, India' })} />
            </div>
            <div style={S.half}>
              <label style={S.label}>Timezone</label>
              <input {...inp('timezone', { placeholder: 'e.g. IST, EST' })} />
            </div>
          </div>
        </div>

        {/* ── Section 3: Compensation ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>💰 Compensation</div>
          <div style={S.row}>
            <div style={S.half}>
              <label style={S.label}>Min Salary</label>
              <input {...inp('salaryMin', { type: 'number', placeholder: '4' })} />
            </div>
            <div style={S.half}>
              <label style={S.label}>Max Salary</label>
              <input {...inp('salaryMax', { type: 'number', placeholder: '8' })} />
            </div>
            <div style={{ flex: '0 0 120px' }}>
              <label style={S.label}>Unit</label>
              <select style={S.inp} value={form.salaryUnit} onChange={e => set('salaryUnit', e.target.value)}>
                {SAL_UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div style={{ flex: '0 0 100px' }}>
              <label style={S.label}>Currency</label>
              <select style={S.inp} value={form.salaryCurrency} onChange={e => set('salaryCurrency', e.target.value)}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Section 4: Job Description ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>📝 Job Description</div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={S.label}>Full Job Description *</label>
            <textarea {...inp('description', { rows: 5, placeholder: 'Describe the role, responsibilities, and what makes it exciting...', required: true, style: { ...S.inp, resize: 'vertical' } })} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={S.label}>Key Responsibilities (one per line)</label>
            <textarea {...inp('responsibilities', { rows: 4, placeholder: 'Build and maintain REST APIs\nReview pull requests\nCollaborate with design team', style: { ...S.inp, resize: 'vertical' } })} />
          </div>
          <div>
            <label style={S.label}>30-60-90 Day Goals (one per line)</label>
            <textarea {...inp('outcomes', { rows: 3, placeholder: '30 days: Onboard and understand codebase\n60 days: Ship first feature...', style: { ...S.inp, resize: 'vertical' } })} />
          </div>
        </div>

        {/* ── Section 5: Skills ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>🛠️ Skills</div>

          {/* AI Suggest Button */}
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={suggestSkills} disabled={aiLoading}
              style={{ padding: '0.4rem 1rem', background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', border: 'none', borderRadius: 7, fontSize: '0.85rem', cursor: 'pointer', opacity: aiLoading ? 0.7 : 1 }}>
              {aiLoading ? '⏳ Suggesting...' : '✨ Suggest Skills with AI'}
            </button>
            <span style={{ color: '#4b5563', fontSize: '0.78rem' }}>Click a chip below to add to Required Skills</span>
          </div>

          {/* AI Chips */}
          {aiChips.length > 0 && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8 }}>
              {aiChips.map((skill, i) => {
                const added = form.requiredSkills.includes(skill);
                return (
                  <span key={i} onClick={() => !added && addChip(skill)}
                    style={{ ...S.chip, ...(added ? S.chipGreen : {}), cursor: added ? 'default' : 'pointer' }}>
                    {added ? '✓' : '+'} {skill}
                  </span>
                );
              })}
            </div>
          )}

          <div style={S.row}>
            <div style={{ ...S.half, flex: '1 1 100%' }}>
              <label style={S.label}>Required Skills * (Enter or comma to add)</label>
              <TagInput values={form.requiredSkills} onChange={v => set('requiredSkills', v)} placeholder="React, Node.js, MongoDB..." />
            </div>
          </div>
          <div style={S.row}>
            <div style={S.half}>
              <label style={S.label}>Preferred / Bonus Skills</label>
              <TagInput values={form.preferredSkills} onChange={v => set('preferredSkills', v)} placeholder="GraphQL, Redis..." />
            </div>
            <div style={S.half}>
              <label style={S.label}>Tech Stack / Tools</label>
              <TagInput values={form.techStack} onChange={v => set('techStack', v)} placeholder="AWS, Docker, Jira..." />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={S.label}>Soft Skills</label>
            <TagInput values={form.softSkills} onChange={v => set('softSkills', v)} placeholder="Communication, Leadership..." />
          </div>
        </div>

        {/* ── Section 6: Requirements ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>🎓 Requirements</div>
          <div style={S.row}>
            <div style={S.half}>
              <label style={S.label}>Min. Years of Experience</label>
              <input {...inp('experienceYears', { type: 'number', min: 0, max: 30, placeholder: '2' })} />
            </div>
            <div style={S.half}>
              <label style={S.label}>Education Level</label>
              <select style={S.inp} value={form.educationLevel} onChange={e => set('educationLevel', e.target.value)}>
                {EDU_LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={S.label}>Languages Required</label>
            <TagInput values={form.languages} onChange={v => set('languages', v)} placeholder="English, Hindi..." />
          </div>
        </div>

        {/* ── Section 7: Process & Meta ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>🔄 Hiring Process</div>
          <div style={S.row}>
            <div style={S.half}>
              <label style={S.label}>Interview Stages</label>
              <TagInput values={form.interviewStages} onChange={v => set('interviewStages', v)} placeholder="HR Round, Technical, Final..." />
            </div>
            <div style={S.half}>
              <label style={S.label}>Expected Timeline</label>
              <input {...inp('expectedTimeline', { placeholder: 'e.g. 2-3 weeks' })} />
            </div>
          </div>
          <div style={S.row}>
            <div style={S.half}>
              <label style={S.label}>Expiry Date</label>
              <input {...inp('expiryDate', { type: 'date' })} />
            </div>
          </div>
          <div>
            <label style={S.label}>D&I Statement (optional)</label>
            <textarea {...inp('diversityStatement', { rows: 2, placeholder: 'We are an equal opportunity employer...', style: { ...S.inp, resize: 'vertical' } })} />
          </div>
        </div>

        {/* ── Submit ── */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button type="submit" disabled={saving}
            style={{ padding: '0.65rem 2rem', background: saving ? '#374151' : 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? '⏳ Posting...' : '🚀 Post Job'}
          </button>
          <button type="button" onClick={() => navigate('/jobs')}
            style={{ padding: '0.65rem 1.5rem', background: 'transparent', color: '#6b7280', border: '1px solid #1f2937', borderRadius: 8, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
