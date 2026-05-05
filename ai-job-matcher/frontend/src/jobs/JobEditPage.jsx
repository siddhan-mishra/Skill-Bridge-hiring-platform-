// JobEditPage.jsx — Step 3: full edit form matching JobCreatePage
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

const JOB_TYPES  = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];
const EDU_LEVELS = ['Any', "Bachelor's", "Master's", 'PhD', 'Diploma', 'High School'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];
const SAL_UNITS  = ['LPA', 'K', 'Annual', 'Monthly'];

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
    onChange([...new Set([...values, ...tags])]);
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

export default function JobEditPage() {
  const { id }     = useParams();
  const { user, API_BASE } = useAuth();
  const navigate   = useNavigate();
  const token      = localStorage.getItem('token');

  const [loading,   setLoading]  = useState(true);
  const [saving,    setSaving]   = useState(false);
  const [error,     setError]    = useState('');
  const [success,   setSuccess]  = useState(false);
  const [aiChips,   setAiChips]  = useState([]);
  const [aiLoading, setAiLoad]   = useState(false);

  const [form, setForm] = useState({
    title: '', company: '', industry: '', jobCategory: '',
    jobType: 'Full-time', workMode: 'On-site', location: '', timezone: '',
    salaryMin: '', salaryMax: '', salaryUnit: 'LPA', salaryCurrency: 'INR',
    description: '', responsibilities: '', outcomes: '',
    requiredSkills: [], preferredSkills: [], softSkills: [], techStack: [],
    experienceYears: 0, educationLevel: 'Any', languages: [],
    interviewStages: [], expectedTimeline: '', diversityStatement: '',
    expiryDate: '', isActive: true,
  });

  // Pre-fill form from DB
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/jobs/${id}`);
        const j   = res.data;

        // Auth guard: only job owner can edit
        if (user?.id?.toString() !== j.recruiter?._id?.toString()) {
          navigate(`/jobs/${id}`); return;
        }

        setForm({
          title:            j.title            || '',
          company:          j.company          || '',
          industry:         j.industry         || '',
          jobCategory:      j.jobCategory      || '',
          jobType:          j.jobType          || 'Full-time',
          workMode:         j.workMode         || 'On-site',
          location:         j.location         || '',
          timezone:         j.timezone         || '',
          // Salary: support both new numeric fields and old string field
          salaryMin:        j.salaryMin        ?? '',
          salaryMax:        j.salaryMax        ?? '',
          salaryUnit:       j.salaryUnit       || 'LPA',
          salaryCurrency:   j.salaryCurrency   || 'INR',
          description:      j.description      || '',
          // responsibilities array → newline-joined string for textarea
          responsibilities: (j.responsibilities || []).join('\n'),
          outcomes:         (j.outcomes        || []).join('\n'),
          requiredSkills:   j.requiredSkills   || [],
          preferredSkills:  j.preferredSkills  || [],
          softSkills:       j.softSkills       || [],
          techStack:        j.techStack        || [],
          experienceYears:  j.experienceYears  ?? 0,
          educationLevel:   j.educationLevel   || 'Any',
          languages:        j.languages        || [],
          interviewStages:  j.interviewStages  || [],
          expectedTimeline: j.expectedTimeline || '',
          diversityStatement: j.diversityStatement || '',
          expiryDate:       j.expiryDate ? j.expiryDate.slice(0, 10) : '',
          isActive:         j.isActive !== false,  // default true
        });
      } catch (err) {
        setError('Failed to load job: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    })();
  }, [API_BASE, id, user, navigate]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
  const inp = (field, extra = {}) => ({
    style: S.inp, value: form[field],
    onChange: e => set(field, e.target.value),
    ...extra,
  });

  const suggestSkills = async () => {
    if (!form.title && !form.description) return;
    setAiLoad(true);
    try {
      const res = await axios.post(`${API_BASE}/api/jobs/suggest-skills`,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.company.trim() || !form.description.trim()) {
      setError('Title, Company and Description are required.'); return;
    }
    setSaving(true); setError('');
    const payload = {
      ...form,
      salaryMin:        form.salaryMin       ? Number(form.salaryMin)  : undefined,
      salaryMax:        form.salaryMax       ? Number(form.salaryMax)  : undefined,
      experienceYears:  Number(form.experienceYears) || 0,
      responsibilities: form.responsibilities.split('\n').map(s => s.trim()).filter(Boolean),
      outcomes:         form.outcomes.split('\n').map(s => s.trim()).filter(Boolean),
    };
    try {
      await axios.put(`${API_BASE}/api/jobs/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess(true);
      setTimeout(() => navigate(`/jobs/${id}`), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update job.');
    } finally { setSaving(false); }
  };

  if (!user || user.role !== 'recruiter')
    return <div className="card"><p style={{ color: '#f87171' }}>Only recruiters can edit jobs.</p></div>;
  if (loading)
    return <div className="card"><p style={{ color: '#9ca3af' }}>⏳ Loading job…</p></div>;

  return (
    <div style={{ maxWidth: 820, width: '100%' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <Link to={`/jobs/${id}`} style={{ color: '#4b5563', fontSize: '0.85rem' }}>← Back to job</Link>
          <h2 style={{ color: '#e5e7eb', margin: '0.25rem 0 0' }}>✏️ Edit Job Posting</h2>
        </div>
        {/* Active toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <div onClick={() => set('isActive', !form.isActive)}
            style={{ width: 44, height: 24, borderRadius: 12, background: form.isActive ? '#6366f1' : '#374151', position: 'relative', transition: 'background 0.2s', cursor: 'pointer' }}>
            <div style={{ position: 'absolute', top: 3, left: form.isActive ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </div>
          <span style={{ color: form.isActive ? '#818cf8' : '#4b5563', fontSize: '0.85rem' }}>{form.isActive ? 'Active' : 'Inactive'}</span>
        </label>
      </div>

      {error   && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem' }}>✅ Job updated! Redirecting…</div>}

      <form onSubmit={handleSubmit}>
        {/* Section 1 */}
        <div style={S.card}>
          <div style={S.sectionTitle}>🏢 Job Details</div>
          <div style={S.row}>
            <div style={{ ...S.half, flex: '2 1 280px' }}>
              <label style={S.label}>Job Title *</label>
              <input {...inp('title', { required: true })} />
            </div>
            <div style={S.half}>
              <label style={S.label}>Company *</label>
              <input {...inp('company', { required: true })} />
            </div>
          </div>
          <div style={S.row}>
            <div style={S.half}><label style={S.label}>Industry</label><input {...inp('industry')} /></div>
            <div style={S.half}><label style={S.label}>Category</label><input {...inp('jobCategory')} /></div>
          </div>
        </div>

        {/* Section 2 */}
        <div style={S.card}>
          <div style={S.sectionTitle}>💼 Employment</div>
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
            <div style={S.half}><label style={S.label}>Location</label><input {...inp('location')} /></div>
            <div style={S.half}><label style={S.label}>Timezone</label><input {...inp('timezone')} /></div>
          </div>
        </div>

        {/* Section 3 */}
        <div style={S.card}>
          <div style={S.sectionTitle}>💰 Compensation</div>
          <div style={S.row}>
            <div style={S.half}><label style={S.label}>Min Salary</label><input {...inp('salaryMin', { type: 'number' })} /></div>
            <div style={S.half}><label style={S.label}>Max Salary</label><input {...inp('salaryMax', { type: 'number' })} /></div>
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

        {/* Section 4 */}
        <div style={S.card}>
          <div style={S.sectionTitle}>📝 Description</div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={S.label}>Full Job Description *</label>
            <textarea {...inp('description', { rows: 5, required: true, style: { ...S.inp, resize: 'vertical' } })} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={S.label}>Key Responsibilities (one per line)</label>
            <textarea {...inp('responsibilities', { rows: 4, style: { ...S.inp, resize: 'vertical' } })} />
          </div>
          <div>
            <label style={S.label}>30-60-90 Day Goals (one per line)</label>
            <textarea {...inp('outcomes', { rows: 3, style: { ...S.inp, resize: 'vertical' } })} />
          </div>
        </div>

        {/* Section 5 */}
        <div style={S.card}>
          <div style={S.sectionTitle}>🛠️ Skills</div>
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={suggestSkills} disabled={aiLoading}
              style={{ padding: '0.4rem 1rem', background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', border: 'none', borderRadius: 7, fontSize: '0.85rem', cursor: 'pointer', opacity: aiLoading ? 0.7 : 1 }}>
              {aiLoading ? '⏳ Suggesting...' : '✨ Re-suggest Skills with AI'}
            </button>
          </div>
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
          <div style={{ marginBottom: '1rem' }}>
            <label style={S.label}>Required Skills</label>
            <TagInput values={form.requiredSkills} onChange={v => set('requiredSkills', v)} placeholder="React, Node.js..." />
          </div>
          <div style={S.row}>
            <div style={S.half}>
              <label style={S.label}>Preferred Skills</label>
              <TagInput values={form.preferredSkills} onChange={v => set('preferredSkills', v)} placeholder="GraphQL, Redis..." />
            </div>
            <div style={S.half}>
              <label style={S.label}>Tech Stack</label>
              <TagInput values={form.techStack} onChange={v => set('techStack', v)} placeholder="AWS, Docker..." />
            </div>
          </div>
          <label style={S.label}>Soft Skills</label>
          <TagInput values={form.softSkills} onChange={v => set('softSkills', v)} placeholder="Communication, Leadership..." />
        </div>

        {/* Section 6 */}
        <div style={S.card}>
          <div style={S.sectionTitle}>🎓 Requirements</div>
          <div style={S.row}>
            <div style={S.half}>
              <label style={S.label}>Min. Years of Experience</label>
              <input {...inp('experienceYears', { type: 'number', min: 0, max: 30 })} />
            </div>
            <div style={S.half}>
              <label style={S.label}>Education Level</label>
              <select style={S.inp} value={form.educationLevel} onChange={e => set('educationLevel', e.target.value)}>
                {EDU_LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <label style={S.label}>Languages Required</label>
          <TagInput values={form.languages} onChange={v => set('languages', v)} placeholder="English, Hindi..." />
        </div>

        {/* Section 7 */}
        <div style={S.card}>
          <div style={S.sectionTitle}>🔄 Process & Meta</div>
          <div style={S.row}>
            <div style={S.half}>
              <label style={S.label}>Interview Stages</label>
              <TagInput values={form.interviewStages} onChange={v => set('interviewStages', v)} placeholder="HR Round, Technical..." />
            </div>
            <div style={S.half}>
              <label style={S.label}>Expected Timeline</label>
              <input {...inp('expectedTimeline', { placeholder: '2-3 weeks' })} />
            </div>
          </div>
          <div style={S.row}>
            <div style={S.half}>
              <label style={S.label}>Expiry Date</label>
              <input {...inp('expiryDate', { type: 'date' })} />
            </div>
          </div>
          <label style={S.label}>D&I Statement</label>
          <textarea {...inp('diversityStatement', { rows: 2, style: { ...S.inp, resize: 'vertical' } })} />
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button type="submit" disabled={saving}
            style={{ padding: '0.65rem 2rem', background: saving ? '#374151' : 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? '⏳ Saving...' : '💾 Save Changes'}
          </button>
          <Link to={`/jobs/${id}`}
            style={{ padding: '0.65rem 1.5rem', background: 'transparent', color: '#6b7280', border: '1px solid #1f2937', borderRadius: 8, textDecoration: 'none' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
