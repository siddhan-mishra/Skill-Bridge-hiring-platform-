// ProfilePage.jsx — Full replacement
// Adds: resume upload → auto-fill, avatar (Base64),
//       all profile fields, 4-tab layout
import { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

// ── Shared styles ────────────────────────────────────────────────
const S = {
  inp: {
    width: '100%', padding: '0.45rem 0.75rem',
    background: '#1a1a1a', color: '#ddd',
    border: '1px solid #333', borderRadius: '6px',
    fontSize: '0.88rem', marginTop: '0.2rem', outline: 'none',
    fontFamily: 'inherit',
  },
  lbl: {
    fontSize: '0.72rem', color: '#777',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'block', marginBottom: '0.15rem',
  },
  sec: {
    fontSize: '0.9rem', fontWeight: 600, color: '#aaa',
    margin: '1.5rem 0 0.75rem',
    paddingBottom: '0.4rem', borderBottom: '1px solid #222',
  },
  card: {
    background: '#111', border: '1px solid #222',
    borderRadius: '8px', padding: '0.9rem', marginBottom: '0.6rem',
  },
  removeBtn: {
    padding: '0.2rem 0.55rem', background: '#2a0000',
    color: '#ff6b6b', border: '1px solid #4a1a1a',
    borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem',
  },
  addBtn: {
    padding: '0.3rem 0.8rem', background: '#0e2a0e',
    color: '#6bcb77', border: '1px solid #1a4a1a',
    borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem',
    marginTop: '0.4rem',
  },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' },
};

// ── Empty row templates ──────────────────────────────────────────
const EMPTY = {
  edu:  { degree: '', institute: '', year: '', gpa: '' },
  proj: { title: '', description: '', technologies: '', link: '' },
  work: { company: '', role: '', startDate: '', endDate: '', achievements: '' },
  cert: { name: '', issuer: '', year: '', link: '' },
};

// ── Small reusable Field wrapper ─────────────────────────────────
function F({ label, children }) {
  return (

    <div className="card">
      <h2>Your Profile</h2>

      {/* Line 187: status messages */}
      {error   && <p style={{ color: 'tomato',      padding: '0.5rem', background: '#2a0000', borderRadius: '4px' }}>{error}</p>}
      {message && <p style={{ color: 'lightgreen',  padding: '0.5rem', background: '#002a00', borderRadius: '4px' }}>{message}</p>}

      <form onSubmit={handleSubmit} style={{ maxWidth: 700, marginTop: '1rem' }}>

        {/* ── Headline ── */}
        <div style={{ marginBottom: '1rem' }}>
          <label>Headline</label>
          <input
            type="text"
            name="headline"
            value={form.headline}
            onChange={handleChange}
            placeholder="e.g. MERN Stack Developer | Open to work"
            style={inputStyle}
          />
        </div>

        {/* ── Summary ── */}
        <div style={{ marginBottom: '1rem' }}>
          <label>Summary</label>
          <textarea
            name="summary"
            value={form.summary}
            onChange={handleChange}
            rows={4}
            placeholder="Write about yourself, your experience, and what you're looking for..."
            style={inputStyle}
          />
        </div>

        {/* ── Skills ── */}
        <div style={{ marginBottom: '1rem' }}>
          <label>Skills (comma-separated)</label>
          <input
            type="text"
            name="skills"
            value={form.skills}
            onChange={handleChange}
            placeholder="React, Node.js, Python, MongoDB..."
            style={inputStyle}
          />
          <button
            type="button"
            onClick={handleExtractSkills}
            style={{ marginTop: '0.5rem', padding: '0.4rem 0.8rem', cursor: 'pointer' }}
          >
            🤖 Extract skills from summary
          </button>
        </div>

        {/* ── Education ── */}
        <h3 style={{ marginBottom: '0.75rem' }}>Education</h3>
        {form.education.map((edu, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              border: '1px solid #333',
              borderRadius: '4px',
              background: '#161616',
            }}
          >
            {/* Line 230: row header with remove button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.9rem', color: '#aaa' }}>Education #{idx + 1}</strong>
              {form.education.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEducation(idx)}
                  style={removeBtnStyle}
                >
                  ✕ Remove
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Degree</label>
                <input
                  type="text"
                  placeholder="B.Tech CSE"
                  value={edu.degree}
                  onChange={(e) => handleEducationChange(idx, 'degree', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Institute</label>
                <input
                  type="text"
                  placeholder="XYZ University"
                  value={edu.institute}
                  onChange={(e) => handleEducationChange(idx, 'institute', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Year</label>
                <input
                  type="text"
                  placeholder="2024"
                  value={edu.year}
                  onChange={(e) => handleEducationChange(idx, 'year', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addEducation}
          style={{ marginBottom: '1.5rem', padding: '0.4rem 0.8rem', cursor: 'pointer' }}
        >
          + Add Education
        </button>

        {/* ── Projects ── */}
        <h3 style={{ marginBottom: '0.75rem' }}>Projects</h3>
        {form.projects.map((pr, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              border: '1px solid #333',
              borderRadius: '4px',
              background: '#161616',
            }}
          >
            {/* Line 280: row header with remove button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.9rem', color: '#aaa' }}>Project #{idx + 1}</strong>
              {form.projects.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeProject(idx)}
                  style={removeBtnStyle}
                >
                  ✕ Remove
                </button>
              )}
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Title</label>
              <input
                type="text"
                placeholder="SkillBridge — AI Job Matcher"
                value={pr.title}
                onChange={(e) => handleProjectChange(idx, 'title', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Description</label>
              <textarea
                placeholder="What does this project do?"
                value={pr.description}
                onChange={(e) => handleProjectChange(idx, 'description', e.target.value)}
                rows={2}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Technologies (comma-separated)</label>
              <input
                type="text"
                placeholder="React, Node.js, MongoDB"
                value={pr.technologies}
                onChange={(e) => handleProjectChange(idx, 'technologies', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Link (GitHub / demo)</label>
              <input
                type="text"
                placeholder="https://github.com/..."
                value={pr.link}
                onChange={(e) => handleProjectChange(idx, 'link', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addProject}
          style={{ marginBottom: '1.5rem', padding: '0.4rem 0.8rem', cursor: 'pointer' }}
        >
          + Add Project
        </button>

        {/* ── Action buttons ── */}
        {/* Line 330: Save + Reset side by side */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.5rem 1.5rem',
              background: saving ? '#555' : '#2a6496',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : '💾 Save Profile'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={!savedForm}
            style={{
              padding: '0.5rem 1.2rem',
              background: '#444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ↩ Discard Changes
          </button>
        </div>

      </form>
    </div>
  );
}

export default function ProfilePage() {
  const { user, API_BASE } = useAuth();
  const token = localStorage.getItem('token');

  const avatarRef = useRef(null);
  const resumeRef = useRef(null);

  const [tab,          setTab]          = useState('identity');
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [msg,          setMsg]          = useState('');
  const [err,          setErr]          = useState('');
  const [avatarB64,    setAvatarB64]    = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [parsing,      setParsing]      = useState(false);
  const [parsePreview, setParsePreview] = useState(null);

  const [form, setForm] = useState({
    // Identity
    fullName: '', headline: '', avatarUrl: '',
    phone: '', location: '', citizenship: '',
    linkedinUrl: '', portfolioUrl: '', githubUrl: '',
    // Professional
    summary: '', skills: '', tools: '',
    yearsOfExp: '', currentTitle: '', currentCompany: '',
    workHistory: [{ ...EMPTY.work }],
    // Background
    education:      [{ ...EMPTY.edu }],
    certifications: [{ ...EMPTY.cert }],
    languages: '',
    projects:  [{ ...EMPTY.proj }],
    // Preferences
    preferredTitles: '', desiredSalary: '',
    employmentType: 'Full-time', workMode: 'On-site',
    noticePeriod: '', willingToRelocate: false,
  });

  // ── Shape raw DB profile into form state ─────────────────────
  const shapeForm = useCallback((p) => ({
    fullName:     p.fullName     || '',
    headline:     p.headline     || '',
    avatarUrl:    p.avatarUrl    || '',
    phone:        p.phone        || '',
    location:     p.location     || '',
    citizenship:  p.citizenship  || '',
    linkedinUrl:  p.linkedinUrl  || '',
    portfolioUrl: p.portfolioUrl || '',
    githubUrl:    p.githubUrl    || '',
    summary:      p.summary      || '',
    skills:       (p.skills  || []).join(', '),
    tools:        (p.tools   || []).join(', '),
    yearsOfExp:   p.yearsOfExp   || '',
    currentTitle:   p.currentTitle   || '',
    currentCompany: p.currentCompany || '',
    workHistory: p.workHistory?.length
      ? p.workHistory.map(w => ({ ...w, achievements: (w.achievements || []).join('\n') }))
      : [{ ...EMPTY.work }],
    education: p.education?.length ? p.education : [{ ...EMPTY.edu }],
    certifications: p.certifications?.length ? p.certifications : [{ ...EMPTY.cert }],
    languages:    (p.languages || []).join(', '),
    projects: p.projects?.length
      ? p.projects.map(pr => ({ ...pr, technologies: (pr.technologies || []).join(', ') }))
      : [{ ...EMPTY.proj }],
    preferredTitles: (p.preferredTitles || []).join(', '),
    desiredSalary:   p.desiredSalary   || '',
    employmentType:  p.employmentType  || 'Full-time',
    workMode:        p.workMode        || 'On-site',
    noticePeriod:    p.noticePeriod    || '',
    willingToRelocate: p.willingToRelocate || false,
  }), []);

  // ── Fetch profile on mount ────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data) {
          setForm(shapeForm(res.data));
          if (res.data.avatarUrl) setAvatarB64(res.data.avatarUrl);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [API_BASE, token, shapeForm]);

  // ── Auto-clear toast messages ─────────────────────────────────
  useEffect(() => {
    if (!msg && !err) return;
    const t = setTimeout(() => { setMsg(''); setErr(''); }, 4500);
    return () => clearTimeout(t);
  }, [msg, err]);

  // ── Generic field setter ──────────────────────────────────────
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Array field helpers ───────────────────────────────────────
  const setArr    = (f, i, k, v) => setForm(prev => { const a = [...prev[f]]; a[i] = { ...a[i], [k]: v }; return { ...prev, [f]: a }; });
  const addRow    = (f, tmpl)    => setForm(prev => ({ ...prev, [f]: [...prev[f], { ...tmpl }] }));
  const removeRow = (f, i)       => setForm(prev => { if (prev[f].length === 1) return prev; return { ...prev, [f]: prev[f].filter((_, j) => j !== i) }; });

  // ── Avatar: compress + convert to Base64 ─────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      // Compress using canvas
      const img = new Image();
      img.onload = () => {
        const MAX = 400;
        const canvas = document.createElement('canvas');
        const scale  = Math.min(MAX / img.width, MAX / img.height, 1);
        canvas.width  = img.width  * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const b64 = canvas.toDataURL('image/jpeg', 0.85);
        setAvatarB64(b64);
        setForm(f => ({ ...f, avatarUrl: b64 }));
        setMsg('✅ Photo ready — will save with profile.');
        setUploading(false);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // ── Resume: upload PDF → NLP → preview parsed data ───────────
  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setParsing(true); setParsePreview(null);
    try {
      const fd = new FormData();
      fd.append('file', file);  // key must match FastAPI param name "file"
      const res = await axios.post(
        // Direct call to Python NLP service
        `http://localhost:8000/parse-resume`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setParsePreview(res.data);
      setMsg('✅ Resume parsed! Review below and click "Apply to Profile".');
    } catch (e) {
      setErr('Resume parse failed: ' + (e.response?.data?.detail || e.message));
    } finally { setParsing(false); }
  };

  // ── Apply parsed resume data to form ─────────────────────────
  const applyParsed = () => {
    if (!parsePreview) return;
    const p = parsePreview;
    setForm(f => ({
      ...f,
      fullName:    p.fullName    || f.fullName,
      phone:       p.phone       || f.phone,
      linkedinUrl: p.linkedinUrl || f.linkedinUrl,
      githubUrl:   p.githubUrl   || f.githubUrl,
      portfolioUrl:p.portfolioUrl|| f.portfolioUrl,
      summary:     p.summary     || f.summary,
      // Merge skills (don't overwrite, add new ones)
      skills: p.skills?.length
        ? Array.from(new Set([
            ...f.skills.split(',').map(s => s.trim()).filter(Boolean),
            ...p.skills
          ])).join(', ')
        : f.skills,
      // Replace arrays only if parsed has data
      education: p.education?.length
        ? p.education.map(e => ({ degree: e.degree || '', institute: e.institute || '', year: e.year || '', gpa: e.gpa || '' }))
        : f.education,
      workHistory: p.workHistory?.length
        ? p.workHistory.map(w => ({ ...w, achievements: (w.achievements || []).join('\n') }))
        : f.workHistory,
      certifications: p.certifications?.length
        ? p.certifications
        : f.certifications,
      languages: p.languages?.length
        ? Array.from(new Set([
            ...f.languages.split(',').map(s => s.trim()).filter(Boolean),
            ...p.languages
          ])).join(', ')
        : f.languages,
    }));
    setParsePreview(null);
    setMsg('✅ Applied! Review all tabs, then click Save.');
  };

  // ── NLP extract skills from summary ──────────────────────────
  const extractSkills = async () => {
    const text = `${form.headline}\n${form.summary}`;
    if (!text.trim()) return;
    try {
      const res = await axios.post(
        `${API_BASE}/api/nlp/extract-skills`,
        { text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const extracted = res.data.skills || [];
      const existing  = form.skills.split(',').map(s => s.trim()).filter(Boolean);
      set('skills', Array.from(new Set([...existing, ...extracted])).join(', '));
      setMsg(`✅ ${extracted.length} skills extracted.`);
    } catch { setErr('Skill extraction failed.'); }
  };

  // ── Save profile ──────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setErr(''); setMsg('');
    const payload = {
      fullName: form.fullName, headline: form.headline,
      avatarUrl: form.avatarUrl, phone: form.phone,
      location: form.location, citizenship: form.citizenship,
      linkedinUrl: form.linkedinUrl, portfolioUrl: form.portfolioUrl,
      githubUrl: form.githubUrl, summary: form.summary,
      skills:  form.skills.split(',').map(s => s.trim()).filter(Boolean),
      tools:   form.tools.split(',').map(s => s.trim()).filter(Boolean),
      yearsOfExp: form.yearsOfExp ? Number(form.yearsOfExp) : undefined,
      currentTitle: form.currentTitle, currentCompany: form.currentCompany,
      workHistory: form.workHistory.map(w => ({
        ...w, achievements: w.achievements.split('\n').map(s => s.trim()).filter(Boolean)
      })),
      education: form.education,
      certifications: form.certifications,
      languages: form.languages.split(',').map(s => s.trim()).filter(Boolean),
      projects: form.projects.map(pr => ({
        ...pr, technologies: pr.technologies.split(',').map(s => s.trim()).filter(Boolean)
      })),
      preferredTitles: form.preferredTitles.split(',').map(s => s.trim()).filter(Boolean),
      desiredSalary: form.desiredSalary,
      employmentType: form.employmentType, workMode: form.workMode,
      noticePeriod: form.noticePeriod, willingToRelocate: form.willingToRelocate,
    };
    try {
      await axios.put(`${API_BASE}/api/profile/me`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMsg('✅ Profile saved!');
    } catch (e) {
      setErr('Save failed: ' + (e.response?.data?.message || e.message));
    } finally { setSaving(false); }
  };

  // ── Guards ────────────────────────────────────────────────────
  if (!user || user.role !== 'seeker') return <div className="card"><p>Only seekers can access this page.</p></div>;
  if (loading) return <div className="card"><p>Loading profile...</p></div>;

  const tabs = [
    { id: 'identity',     label: '👤 Identity' },
    { id: 'professional', label: '💼 Professional' },
    { id: 'background',   label: '🎓 Background' },
    { id: 'preferences',  label: '⚙️ Preferences' },
  ];

  return (
    <div className="card" style={{ maxWidth: 780, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>Edit Profile</h2>
        <button
          onClick={handleSubmit} disabled={saving}
          style={{ padding: '0.45rem 1.4rem', background: saving ? '#222' : '#0e3a5a', color: saving ? '#555' : '#5ab0e0', border: '1px solid #1a5a7a', borderRadius: '7px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
        >{saving ? 'Saving…' : '💾 Save All'}</button>
      </div>

      {/* Toast messages */}
      {err && <div style={{ padding: '0.6rem 1rem', background: '#1a0000', border: '1px solid #5a0000', borderRadius: '6px', color: '#ff7070', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{err}</div>}
      {msg && <div style={{ padding: '0.6rem 1rem', background: '#001a00', border: '1px solid #005a00', borderRadius: '6px', color: '#6bcb77', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{msg}</div>}

      {/* ── Resume Upload Banner ─────────────────────────────── */}
      <div style={{ background: '#0b1a2a', border: '1px dashed #1a4a6a', borderRadius: '9px', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontWeight: 600, color: '#5ab0e0', fontSize: '0.92rem' }}>📄 Upload Resume PDF → Auto-fill profile</div>
            <div style={{ color: '#555', fontSize: '0.76rem', marginTop: '0.15rem' }}>AI reads your resume and fills every field automatically</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input ref={resumeRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleResumeUpload} />
            <button onClick={() => resumeRef.current.click()} disabled={parsing}
              style={{ padding: '0.35rem 0.9rem', background: '#0a2233', color: '#5ab0e0', border: '1px solid #1a4a6a', borderRadius: '6px', cursor: parsing ? 'wait' : 'pointer', fontSize: '0.82rem' }}>
              {parsing ? '⏳ Parsing…' : '📤 Upload & Parse'}
            </button>
          </div>
        </div>

        {/* Parsed preview block */}
        {parsePreview && (
          <div style={{ marginTop: '0.9rem', padding: '0.9rem', background: '#071a07', border: '1px solid #1a4a1a', borderRadius: '7px' }}>
            <div style={{ fontWeight: 600, color: '#6bcb77', marginBottom: '0.5rem', fontSize: '0.85rem' }}>✅ Parsed successfully — preview:</div>
            <div style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.9 }}>
              {parsePreview.fullName     && <div>• <b>Name:</b> {parsePreview.fullName}</div>}
              {parsePreview.email        && <div>• <b>Email:</b> {parsePreview.email}</div>}
              {parsePreview.phone        && <div>• <b>Phone:</b> {parsePreview.phone}</div>}
              {parsePreview.linkedinUrl  && <div>• <b>LinkedIn:</b> {parsePreview.linkedinUrl}</div>}
              {parsePreview.githubUrl    && <div>• <b>GitHub:</b> {parsePreview.githubUrl}</div>}
              {parsePreview.skills?.length > 0 && <div>• <b>Skills detected:</b> {parsePreview.skills.slice(0, 8).join(', ')}{parsePreview.skills.length > 8 ? ` +${parsePreview.skills.length - 8} more` : ''}</div>}
              {parsePreview.education?.length > 0 && <div>• <b>Education entries:</b> {parsePreview.education.length}</div>}
              {parsePreview.workHistory?.length > 0 && <div>• <b>Work entries:</b> {parsePreview.workHistory.length}</div>}
            </div>
            <button onClick={applyParsed}
              style={{ marginTop: '0.6rem', padding: '0.35rem 1.1rem', background: '#0e2a0e', color: '#6bcb77', border: '1px solid #1a4a1a', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
              ✅ Apply to Profile
            </button>
          </div>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '1.25rem', borderBottom: '1px solid #222' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '0.55rem 1rem', background: 'none', border: 'none',
            borderBottom: tab === t.id ? '2px solid #5ab0e0' : '2px solid transparent',
            color: tab === t.id ? '#5ab0e0' : '#555', cursor: 'pointer',
            fontSize: '0.82rem', fontWeight: tab === t.id ? 600 : 400,
          }}>{t.label}</button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>

        {/* ══ IDENTITY TAB ═══════════════════════════════════ */}
        {tab === 'identity' && (
          <div>
            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '0.9rem', background: '#111', borderRadius: '9px', border: '1px solid #222', marginBottom: '1.25rem' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: '#222', border: '2px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0 }}>
                {avatarB64
                  ? <img src={avatarB64} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '👤'}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#bbb', fontSize: '0.88rem', marginBottom: '0.3rem' }}>Profile Photo</div>
                <div style={{ color: '#555', fontSize: '0.75rem', marginBottom: '0.4rem' }}>JPG / PNG / WebP · Compressed automatically · No external service</div>
                <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
                <button type="button" onClick={() => avatarRef.current.click()} disabled={uploading}
                  style={{ padding: '0.3rem 0.8rem', background: '#0e2233', color: '#5ab0e0', border: '1px solid #1a3a4a', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' }}>
                  {uploading ? 'Processing…' : '📷 Choose photo'}
                </button>
              </div>
            </div>

            <div style={S.grid2}>
              <F label="Full Name"><input style={S.inp} value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Siddhan Mishra" /></F>
              <F label="Professional Headline"><input style={S.inp} value={form.headline} onChange={e => set('headline', e.target.value)} placeholder="MERN + AI Developer · Open to work" /></F>
              <F label="Phone"><input style={S.inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" /></F>
              <F label="Location (City, Country)"><input style={S.inp} value={form.location} onChange={e => set('location', e.target.value)} placeholder="Bhubaneswar, India" /></F>
              <F label="Citizenship"><input style={S.inp} value={form.citizenship} onChange={e => set('citizenship', e.target.value)} placeholder="Indian" /></F>
            </div>

            <div style={S.sec}>🔗 Online Presence</div>
            <div style={S.grid2}>
              <F label="LinkedIn URL"><input style={S.inp} value={form.linkedinUrl} onChange={e => set('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/username" /></F>
              <F label="GitHub URL"><input style={S.inp} value={form.githubUrl} onChange={e => set('githubUrl', e.target.value)} placeholder="https://github.com/username" /></F>
              <F label="Portfolio / Website"><input style={S.inp} value={form.portfolioUrl} onChange={e => set('portfolioUrl', e.target.value)} placeholder="https://yoursite.dev" /></F>
            </div>
          </div>
        )}

        {/* ══ PROFESSIONAL TAB ═══════════════════════════════ */}
        {tab === 'professional' && (
          <div>
            <div style={S.grid2}>
              <F label="Current Title"><input style={S.inp} value={form.currentTitle} onChange={e => set('currentTitle', e.target.value)} placeholder="Software Engineer" /></F>
              <F label="Current Company"><input style={S.inp} value={form.currentCompany} onChange={e => set('currentCompany', e.target.value)} placeholder="TCS" /></F>
              <F label="Years of Experience"><input style={S.inp} type="number" min="0" value={form.yearsOfExp} onChange={e => set('yearsOfExp', e.target.value)} placeholder="2" /></F>
            </div>
            <F label="Professional Summary">
              <textarea style={{ ...S.inp, height: 100 }} value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="Describe your background, strengths, and goals…" />
              <button type="button" onClick={extractSkills} style={{ ...S.addBtn, marginTop: '0.3rem' }}>🤖 Extract skills from summary</button>
            </F>
            <F label="Core Skills (comma-separated)"><input style={S.inp} value={form.skills} onChange={e => set('skills', e.target.value)} placeholder="React, Node.js, Python, MongoDB" /></F>
            <F label="Tools & Technologies (comma-separated)"><input style={S.inp} value={form.tools} onChange={e => set('tools', e.target.value)} placeholder="VS Code, Docker, Postman, Git" /></F>

            <div style={S.sec}>🏢 Work History</div>
            {form.workHistory.map((w, i) => (
              <div key={i} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#555' }}>Position #{i + 1}</span>
                  {form.workHistory.length > 1 && <button type="button" style={S.removeBtn} onClick={() => removeRow('workHistory', i)}>✕ Remove</button>}
                </div>
                <div style={S.grid2}>
                  <F label="Role / Title"><input style={S.inp} value={w.role} onChange={e => setArr('workHistory', i, 'role', e.target.value)} placeholder="Backend Developer" /></F>
                  <F label="Company"><input style={S.inp} value={w.company} onChange={e => setArr('workHistory', i, 'company', e.target.value)} placeholder="Infosys" /></F>
                  <F label="Start Date"><input style={S.inp} value={w.startDate} onChange={e => setArr('workHistory', i, 'startDate', e.target.value)} placeholder="Jan 2022" /></F>
                  <F label="End Date"><input style={S.inp} value={w.endDate} onChange={e => setArr('workHistory', i, 'endDate', e.target.value)} placeholder="Present" /></F>
                </div>
                <F label="Key Achievements (one per line)"><textarea style={{ ...S.inp, height: 72 }} value={w.achievements} onChange={e => setArr('workHistory', i, 'achievements', e.target.value)} placeholder={"• Built REST APIs\n• Reduced latency by 40%"} /></F>
              </div>
            ))}
            <button type="button" style={S.addBtn} onClick={() => addRow('workHistory', EMPTY.work)}>+ Add Position</button>
          </div>
        )}

        {/* ══ BACKGROUND TAB ════════════════════════════════ */}
        {tab === 'background' && (
          <div>
            <div style={S.sec}>🎓 Education</div>
            {form.education.map((edu, i) => (
              <div key={i} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#555' }}>Degree #{i + 1}</span>
                  {form.education.length > 1 && <button type="button" style={S.removeBtn} onClick={() => removeRow('education', i)}>✕ Remove</button>}
                </div>
                <div style={S.grid2}>
                  <F label="Degree"><input style={S.inp} value={edu.degree} onChange={e => setArr('education', i, 'degree', e.target.value)} placeholder="B.Tech CSE" /></F>
                  <F label="Institution"><input style={S.inp} value={edu.institute} onChange={e => setArr('education', i, 'institute', e.target.value)} placeholder="KIIT University" /></F>
                  <F label="Year"><input style={S.inp} value={edu.year} onChange={e => setArr('education', i, 'year', e.target.value)} placeholder="2024" /></F>
                  <F label="GPA (optional)"><input style={S.inp} value={edu.gpa} onChange={e => setArr('education', i, 'gpa', e.target.value)} placeholder="8.5 / 10" /></F>
                </div>
              </div>
            ))}
            <button type="button" style={S.addBtn} onClick={() => addRow('education', EMPTY.edu)}>+ Add Education</button>

            <div style={S.sec}>🏅 Certifications</div>
            {form.certifications.map((c, i) => (
              <div key={i} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#555' }}>Cert #{i + 1}</span>
                  {form.certifications.length > 1 && <button type="button" style={S.removeBtn} onClick={() => removeRow('certifications', i)}>✕ Remove</button>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: '0 1rem' }}>
                   <F label="Certification Name">
                      <input style={S.inp} value={c.name} onChange={e => setArr('certifications', i, 'name', e.target.value)} placeholder="AWS Solutions Architect" />
                   </F>
                   <F label="Issuing Body">
                      <input style={S.inp} value={c.issuer} onChange={e => setArr('certifications', i, 'issuer', e.target.value)} placeholder="Amazon" />
                   </F>
                   <F label="Year">
                      <input style={S.inp} value={c.year} onChange={e => setArr('certifications', i, 'year', e.target.value)} placeholder="2023" />
                   </F>
                </div>
                {/* Certificate link — full width below */}
                <F label="Certificate URL (optional)">
                  <input
                    style={S.inp}
                    value={c.link}
                    onChange={e => setArr('certifications', i, 'link', e.target.value)}
                    placeholder="https://www.credly.com/badges/..."
                  />
                </F>

              </div>
            ))}
            <button type="button" style={S.addBtn} onClick={() => addRow('certifications', EMPTY.cert)}>+ Add Certification</button>

            <div style={S.sec}>🌐 Languages Spoken</div>
            <F label="Languages (comma-separated)"><input style={S.inp} value={form.languages} onChange={e => set('languages', e.target.value)} placeholder="English, Hindi, Odia" /></F>

            <div style={S.sec}>🚀 Projects</div>
            {form.projects.map((pr, i) => (
              <div key={i} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#555' }}>Project #{i + 1}</span>
                  {form.projects.length > 1 && <button type="button" style={S.removeBtn} onClick={() => removeRow('projects', i)}>✕ Remove</button>}
                </div>
                <F label="Title"><input style={S.inp} value={pr.title} onChange={e => setArr('projects', i, 'title', e.target.value)} placeholder="SkillBridge — AI Job Matcher" /></F>
                <F label="Description"><textarea style={{ ...S.inp, height: 65 }} value={pr.description} onChange={e => setArr('projects', i, 'description', e.target.value)} placeholder="What does this project do?" /></F>
                <div style={S.grid2}>
                  <F label="Tech Stack (comma-separated)"><input style={S.inp} value={pr.technologies} onChange={e => setArr('projects', i, 'technologies', e.target.value)} placeholder="React, FastAPI, MongoDB" /></F>
                  <F label="Link (GitHub / Demo)"><input style={S.inp} value={pr.link} onChange={e => setArr('projects', i, 'link', e.target.value)} placeholder="https://github.com/…" /></F>
                </div>
              </div>
            ))}
            <button type="button" style={S.addBtn} onClick={() => addRow('projects', EMPTY.proj)}>+ Add Project</button>
          </div>
        )}

        {/* ══ PREFERENCES TAB ════════════════════════════════ */}
        {tab === 'preferences' && (
          <div>
            <F label="Preferred Job Titles (comma-separated)"><input style={S.inp} value={form.preferredTitles} onChange={e => set('preferredTitles', e.target.value)} placeholder="Full Stack Developer, Backend Engineer" /></F>
            <F label="Desired Salary Range"><input style={S.inp} value={form.desiredSalary} onChange={e => set('desiredSalary', e.target.value)} placeholder="8–12 LPA" /></F>
            <div style={S.grid2}>
              <F label="Employment Type">
                <select style={S.inp} value={form.employmentType} onChange={e => set('employmentType', e.target.value)}>
                  {['Full-time','Part-time','Contract','Freelance','Internship'].map(o => <option key={o}>{o}</option>)}
                </select>
              </F>
              <F label="Work Mode">
                <select style={S.inp} value={form.workMode} onChange={e => set('workMode', e.target.value)}>
                  {['Remote','Hybrid','On-site'].map(o => <option key={o}>{o}</option>)}
                </select>
              </F>
              <F label="Notice Period"><input style={S.inp} value={form.noticePeriod} onChange={e => set('noticePeriod', e.target.value)} placeholder="30 days" /></F>
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <input type="checkbox" id="relocate" checked={form.willingToRelocate} onChange={e => set('willingToRelocate', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              <label htmlFor="relocate" style={{ color: '#aaa', fontSize: '0.85rem', cursor: 'pointer' }}>Willing to relocate</label>
            </div>
          </div>
        )}

        {/* Bottom save button */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #1a1a1a' }}>
          <button type="submit" disabled={saving}
            style={{ padding: '0.5rem 1.8rem', background: saving ? '#222' : '#0e3a5a', color: saving ? '#555' : '#5ab0e0', border: '1px solid #1a5a7a', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
            {saving ? 'Saving…' : '💾 Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}