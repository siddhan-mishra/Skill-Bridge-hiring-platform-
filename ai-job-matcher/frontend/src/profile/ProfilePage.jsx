// ProfilePage.jsx — v6 (fix: F() helper had wrong body causing ReferenceError + white screen)
import { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import API from '../api/jobApi';

const S = {
  inp: {
    width: '100%', padding: '0.45rem 0.75rem',
    background: '#1a1a1a', color: '#ddd',
    border: '1px solid #333', borderRadius: '6px',
    fontSize: '0.88rem', marginTop: '0.2rem', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  },
  inpDisabled: {
    width: '100%', padding: '0.45rem 0.75rem',
    background: '#111', color: '#444',
    border: '1px solid #222', borderRadius: '6px',
    fontSize: '0.88rem', marginTop: '0.2rem', outline: 'none',
    fontFamily: 'inherit', cursor: 'not-allowed', boxSizing: 'border-box',
  },
  lbl: {
    fontSize: '0.72rem', color: '#777',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'block', marginBottom: '0.15rem',
  },
  sec: {
    fontSize: '0.88rem', fontWeight: 600, color: '#888',
    margin: '1.5rem 0 0.75rem',
    paddingBottom: '0.35rem', borderBottom: '1px solid #1e1e1e',
  },
  card: {
    background: '#111', border: '1px solid #1e1e1e',
    borderRadius: '8px', padding: '0.9rem', marginBottom: '0.6rem',
  },
  removeBtn: {
    padding: '0.2rem 0.55rem', background: '#1a0000',
    color: '#ff6b6b', border: '1px solid #3a1010',
    borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem',
  },
  addBtn: {
    padding: '0.3rem 0.8rem', background: '#0a1e0a',
    color: '#6bcb77', border: '1px solid #1a3a1a',
    borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem',
    marginTop: '0.4rem',
  },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' },
};

const EMPTY = {
  edu:  { degree: '', institute: '', year: '', gpa: '' },
  proj: { title: '', description: '', technologies: '', link: '' },
  work: { company: '', role: '', startDate: '', endDate: '', achievements: '' },
  cert: { name: '', issuer: '', year: '', link: '' },
};

// F — tiny labeled field wrapper
function F({ label, children }) {
  return (
    <div style={{ marginBottom: '0.65rem' }}>
      <label style={S.lbl}>{label}</label>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { user, API_BASE } = useAuth();
  const token = localStorage.getItem('token');

  const avatarRef      = useRef(null);
  const resumeParseRef = useRef(null);

  const [tab,          setTab]          = useState('identity');
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [msg,          setMsg]          = useState('');
  const [err,          setErr]          = useState('');
  const [avatarB64,    setAvatarB64]    = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [parsing,      setParsing]      = useState(false);
  const [generating,   setGenerating]   = useState(false);
  const [parsePreview, setParsePreview] = useState(null);
  const [originalForm, setOriginalForm] = useState(null);

  const [form, setForm] = useState({
    fullName: '', headline: '', avatarUrl: '',
    phone: '', location: '', citizenship: '',
    linkedinUrl: '', portfolioUrl: '', githubUrl: '',
    summary: '', skills: '', tools: '',
    yearsOfExp: '', currentTitle: '', currentCompany: '',
    workHistory:    [{ ...EMPTY.work }],
    education:      [{ ...EMPTY.edu }],
    certifications: [{ ...EMPTY.cert }],
    languages: '',
    projects:  [{ ...EMPTY.proj }],
    preferredTitles: '', desiredSalary: '',
    employmentType: 'Full-time', workMode: 'On-site',
    noticePeriod: '', willingToRelocate: false,
    resumeUrl: '',
  });

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
    yearsOfExp:   p.yearsOfExp !== undefined ? String(p.yearsOfExp) : '',
    currentTitle:   p.currentTitle   || '',
    currentCompany: p.currentCompany || '',
    workHistory: p.workHistory?.length
      ? p.workHistory.map(w => ({ ...w, achievements: (w.achievements || []).join('\n') }))
      : [{ ...EMPTY.work }],
    education:      p.education?.length      ? p.education.map(e => ({ degree: e.degree||'', institute: e.institute||'', year: e.year||'', gpa: e.gpa||'' }))      : [{ ...EMPTY.edu }],
    certifications: p.certifications?.length ? p.certifications.map(c => ({ name: c.name||'', issuer: c.issuer||'', year: c.year||'', link: c.link||'' })) : [{ ...EMPTY.cert }],
    languages:    (p.languages || []).join(', '),
    projects: p.projects?.length
      ? p.projects.map(pr => ({ title: pr.title||'', description: pr.description||'', technologies: (pr.technologies||[]).join(', '), link: pr.link||'' }))
      : [{ ...EMPTY.proj }],
    preferredTitles: (p.preferredTitles || []).join(', '),
    desiredSalary:   p.desiredSalary   || '',
    employmentType:  p.employmentType  || 'Full-time',
    workMode:        p.workMode        || 'On-site',
    noticePeriod:    p.noticePeriod    || '',
    willingToRelocate: p.willingToRelocate || false,
    resumeUrl:       p.resumeUrl       || '',
  }), []);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data) {
          const shaped = shapeForm(res.data);
          setForm(shaped);
          setOriginalForm(shaped);
          if (res.data.avatarUrl) setAvatarB64(res.data.avatarUrl);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [API_BASE, token, shapeForm]);

  useEffect(() => {
    if (!msg && !err) return;
    const t = setTimeout(() => { setMsg(''); setErr(''); }, 6000);
    return () => clearTimeout(t);
  }, [msg, err]);

  const set    = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setArr = (field, i, k, v) => setForm(prev => {
    const a = [...prev[field]]; a[i] = { ...a[i], [k]: v }; return { ...prev, [field]: a };
  });
  const addRow    = (field, tmpl) => setForm(prev => ({ ...prev, [field]: [...prev[field], { ...tmpl }] }));
  const removeRow = (field, i)   => setForm(prev => {
    if (prev[field].length === 1) return prev;
    return { ...prev, [field]: prev[field].filter((_, j) => j !== i) };
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
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
        set('avatarUrl', b64);
        setMsg('✅ Photo ready — will save with profile.');
        setUploading(false);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleResumeParse = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setParsing(true); setParsePreview(null); setErr('');
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const res = await axios.post(`${API_BASE}/api/upload/resume`, fd, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
      });
      const { resumeUrl, parsed } = res.data;
      if (resumeUrl) set('resumeUrl', resumeUrl);
      const hasParsed = parsed && (parsed.fullName || parsed.skills?.length > 0 || parsed.workHistory?.length > 0);
      if (hasParsed) {
        setParsePreview(parsed);
        setMsg('✅ Resume parsed! Preview below — click "Apply to Profile" to fill all fields.');
      } else {
        setMsg('⚠️ Resume saved, but AI parsing returned empty. Your PDF may be image-based.');
      }
    } catch (ex) {
      setErr('Parse failed: ' + (ex.response?.data?.message || ex.message));
    } finally {
      setParsing(false);
    }
  };

  const handleGenerateResume = async () => {
    setGenerating(true); setErr('');
    try {
      const res = await API.post('/resume/generate-save', {}, { responseType: 'json' });
      const { resumeUrl: genUrl } = res.data;
      if (genUrl) {
        set('resumeUrl', genUrl);
        setMsg('✅ Resume generated & saved! View it on your public profile. Downloading now…');
        const dlRes = await API.get('/resume/generate', { responseType: 'blob' });
        const disposition = dlRes.headers?.['content-disposition'] || '';
        const match = disposition.match(/filename="?([^"]+)"?/);
        const filename = match ? match[1] : `${user?.name || 'Resume'}_Resume.docx`;
        const url  = window.URL.createObjectURL(new Blob([dlRes.data]));
        const link = document.createElement('a');
        link.href = url; link.download = filename;
        document.body.appendChild(link); link.click(); link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (ex) {
      const errData = ex.response?.data;
      if (errData instanceof Blob) {
        const text = await errData.text();
        try { setErr(JSON.parse(text).message || 'Generation failed.'); }
        catch { setErr('Resume generation failed.'); }
      } else {
        setErr(errData?.message || 'Resume generation failed. Make sure you have a headline and skills.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const extractSkills = async () => {
    const text = `${form.headline}\n${form.summary}`.trim();
    if (!text) return;
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

  const applyParsed = () => {
    if (!parsePreview) return;
    const p = parsePreview;
    setForm(f => ({
      ...f,
      fullName:       p.fullName       || f.fullName,
      phone:          p.phone          || f.phone,
      headline:       p.headline       || f.headline,
      summary:        p.summary        || f.summary,
      linkedinUrl:    p.linkedinUrl    || f.linkedinUrl,
      githubUrl:      p.githubUrl      || f.githubUrl,
      portfolioUrl:   p.portfolioUrl   || f.portfolioUrl,
      currentTitle:   p.currentTitle   || f.currentTitle,
      currentCompany: p.currentCompany || f.currentCompany,
      yearsOfExp:     p.yearsOfExp != null ? String(p.yearsOfExp) : f.yearsOfExp,
      skills: p.skills?.length
        ? Array.from(new Set([...f.skills.split(',').map(s=>s.trim()).filter(Boolean), ...p.skills])).join(', ')
        : f.skills,
      tools: p.tools?.length
        ? Array.from(new Set([...f.tools.split(',').map(s=>s.trim()).filter(Boolean), ...p.tools])).join(', ')
        : f.tools,
      education: p.education?.length
        ? p.education.map(e => ({ degree: e.degree||'', institute: e.institute||'', year: e.year||'', gpa: e.gpa||'' }))
        : f.education,
      workHistory: p.workHistory?.length
        ? p.workHistory.map(w => ({
            company:      w.company   || '',
            role:         w.role      || '',
            startDate:    w.startDate || '',
            endDate:      w.endDate   || '',
            achievements: Array.isArray(w.achievements) ? w.achievements.join('\n') : (w.achievements || ''),
          }))
        : f.workHistory,
      certifications: p.certifications?.length
        ? p.certifications.map(c => ({ name: c.name||'', issuer: c.issuer||'', year: c.year||'', link: c.link||'' }))
        : f.certifications,
      languages: p.languages?.length
        ? Array.from(new Set([...f.languages.split(',').map(s=>s.trim()).filter(Boolean), ...p.languages])).join(', ')
        : f.languages,
      projects: p.projects?.length
        ? p.projects.map(pr => ({
            title:        pr.title       || '',
            description:  pr.description || '',
            technologies: Array.isArray(pr.technologies) ? pr.technologies.join(', ') : (pr.technologies||''),
            link:         pr.link        || '',
          }))
        : f.projects,
    }));
    setParsePreview(null);
    setMsg('✅ Applied to all tabs! Review each tab then click Save.');
  };

  const handleCancel = () => {
    if (!originalForm) return;
    setForm(originalForm);
    setAvatarB64(originalForm.avatarUrl || null);
    setParsePreview(null);
    setMsg('Changes discarded.');
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
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
        ...w, achievements: w.achievements.split('\n').map(s => s.trim()).filter(Boolean),
      })),
      education: form.education,
      certifications: form.certifications,
      languages: form.languages.split(',').map(s => s.trim()).filter(Boolean),
      projects: form.projects.map(pr => ({
        ...pr,
        technologies: typeof pr.technologies === 'string'
          ? pr.technologies.split(',').map(s => s.trim()).filter(Boolean)
          : pr.technologies,
      })),
      preferredTitles: form.preferredTitles.split(',').map(s => s.trim()).filter(Boolean),
      desiredSalary: form.desiredSalary,
      employmentType: form.employmentType, workMode: form.workMode,
      noticePeriod: form.noticePeriod, willingToRelocate: form.willingToRelocate,
      resumeUrl: form.resumeUrl || undefined,
    };
    try {
      await axios.put(`${API_BASE}/api/profile/me`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMsg('✅ Profile saved!');
      const refreshed = await axios.get(`${API_BASE}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (refreshed.data) {
        const shaped = shapeForm(refreshed.data);
        setOriginalForm(shaped);
      }
    } catch (ex) {
      setErr('Save failed: ' + (ex.response?.data?.message || ex.message));
    } finally { setSaving(false); }
  };

  if (!user || user.role !== 'seeker') return <div className="card"><p>Only seekers have profiles.</p></div>;
  if (loading) return <div className="card"><p>Loading profile…</p></div>;

  const tabs = [
    { id: 'identity',     label: '👤 Identity' },
    { id: 'professional', label: '💼 Professional' },
    { id: 'background',   label: '🎓 Background' },
    { id: 'preferences',  label: '⚙️ Preferences' },
  ];

  return (
    <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#ccc' }}>Edit Profile</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={handleCancel}
            style={{ padding: '0.4rem 1rem', background: 'none', color: '#777', border: '1px solid #2a2a2a', borderRadius: '7px', cursor: 'pointer', fontSize: '0.85rem' }}>
            ✕ Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            style={{ padding: '0.4rem 1.3rem', background: saving ? '#111' : '#0e3a5a', color: saving ? '#444' : '#5ab0e0', border: '1px solid #1a5a7a', borderRadius: '7px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
            {saving ? 'Saving…' : '💾 Save All'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {err && <div style={{ padding: '0.6rem 1rem', background: '#1a0000', border: '1px solid #4a1010', borderRadius: '6px', color: '#ff7070', marginBottom: '0.75rem', fontSize: '0.84rem' }}>{err}</div>}
      {msg && <div style={{ padding: '0.6rem 1rem', background: '#001a00', border: '1px solid #0a3a0a', borderRadius: '6px', color: '#6bcb77', marginBottom: '0.75rem', fontSize: '0.84rem' }}>{msg}</div>}

      {/* ── AI Resume Banner ── */}
      <div style={{ background: '#080f1a', border: '1px dashed #1a3a5a', borderRadius: '9px', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ fontWeight: 600, color: '#5ab0e0', fontSize: '0.9rem', marginBottom: '0.2rem' }}>🤖 AI Resume Tools</div>
        <div style={{ color: '#444', fontSize: '0.75rem', marginBottom: '0.75rem' }}>Parse an existing PDF to auto-fill your profile, or generate a polished Harvard-format resume from your profile data.</div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <div>
            <input ref={resumeParseRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleResumeParse} />
            <button type="button" onClick={() => resumeParseRef.current.click()} disabled={parsing}
              style={{ padding: '0.38rem 0.95rem', background: '#0a1e33', color: '#5ab0e0', border: '1px solid #1a3a5a', borderRadius: '6px', cursor: parsing ? 'wait' : 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
              {parsing ? '⏳ Parsing…' : '🔍 Parse Resume'}
            </button>
            <div style={{ fontSize: '0.68rem', color: '#333', marginTop: '0.2rem' }}>Upload PDF → fills all fields</div>
          </div>

          <div>
            <button type="button" onClick={handleGenerateResume} disabled={generating}
              style={{ padding: '0.38rem 0.95rem', background: generating ? '#1a1a1a' : 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', border: 'none', borderRadius: '6px', cursor: generating ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
              {generating ? '⏳ Generating…' : '✨ Generate Resume'}
            </button>
            <div style={{ fontSize: '0.68rem', color: '#333', marginTop: '0.2rem' }}>Profile → Harvard .docx + saves to profile</div>
          </div>
        </div>

        {parsePreview && (
          <div style={{ marginTop: '0.85rem', padding: '0.85rem', background: '#061206', border: '1px solid #1a3a1a', borderRadius: '7px' }}>
            <div style={{ fontWeight: 600, color: '#6bcb77', marginBottom: '0.5rem', fontSize: '0.84rem' }}>✅ Parsed — preview:</div>
            <div style={{ fontSize: '0.79rem', color: '#777', lineHeight: 1.85 }}>
              {parsePreview.fullName      && <div>• <b style={{color:'#aaa'}}>Name:</b> {parsePreview.fullName}</div>}
              {parsePreview.headline      && <div>• <b style={{color:'#aaa'}}>Headline:</b> {parsePreview.headline}</div>}
              {parsePreview.currentTitle  && <div>• <b style={{color:'#aaa'}}>Title:</b> {parsePreview.currentTitle}</div>}
              {parsePreview.phone         && <div>• <b style={{color:'#aaa'}}>Phone:</b> {parsePreview.phone}</div>}
              {parsePreview.linkedinUrl   && <div>• <b style={{color:'#aaa'}}>LinkedIn:</b> {parsePreview.linkedinUrl}</div>}
              {parsePreview.githubUrl     && <div>• <b style={{color:'#aaa'}}>GitHub:</b> {parsePreview.githubUrl}</div>}
              {parsePreview.skills?.length > 0 && <div>• <b style={{color:'#aaa'}}>Skills ({parsePreview.skills.length}):</b> {parsePreview.skills.slice(0,10).join(', ')}{parsePreview.skills.length>10?` +${parsePreview.skills.length-10} more`:''}</div>}
              {parsePreview.workHistory?.length > 0 && <div>• <b style={{color:'#aaa'}}>Work entries:</b> {parsePreview.workHistory.length}</div>}
              {parsePreview.education?.length > 0 && <div>• <b style={{color:'#aaa'}}>Education entries:</b> {parsePreview.education.length}</div>}
              {parsePreview.projects?.length > 0 && <div>• <b style={{color:'#aaa'}}>Projects:</b> {parsePreview.projects.length}</div>}
              {parsePreview.certifications?.length > 0 && <div>• <b style={{color:'#aaa'}}>Certifications:</b> {parsePreview.certifications.length}</div>}
            </div>
            <button type="button" onClick={applyParsed}
              style={{ marginTop: '0.6rem', padding: '0.35rem 1.1rem', background: '#0a200a', color: '#6bcb77', border: '1px solid #1a3a1a', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
              ✅ Apply to Profile
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', marginBottom: '1.25rem', borderBottom: '1px solid #1e1e1e' }}>
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} style={{
            padding: '0.5rem 1rem', background: 'none', border: 'none',
            borderBottom: tab === t.id ? '2px solid #5ab0e0' : '2px solid transparent',
            color: tab === t.id ? '#5ab0e0' : '#444', cursor: 'pointer',
            fontSize: '0.82rem', fontWeight: tab === t.id ? 600 : 400,
          }}>{t.label}</button>
        ))}
      </div>

      {/* IDENTITY TAB */}
      {tab === 'identity' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '0.9rem', background: '#0d0d0d', borderRadius: '9px', border: '1px solid #1e1e1e', marginBottom: '1.25rem' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: '#1a1a1a', border: '2px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0 }}>
              {avatarB64 ? <img src={avatarB64} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '👤'}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#aaa', fontSize: '0.86rem', marginBottom: '0.25rem' }}>Profile Photo</div>
              <div style={{ color: '#444', fontSize: '0.74rem', marginBottom: '0.4rem' }}>JPG / PNG / WebP · Max 400×400px</div>
              <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
              <button type="button" onClick={() => avatarRef.current.click()} disabled={uploading}
                style={{ padding: '0.28rem 0.75rem', background: '#0a1e2a', color: '#5ab0e0', border: '1px solid #1a3a4a', borderRadius: '6px', cursor: 'pointer', fontSize: '0.76rem' }}>
                {uploading ? 'Processing…' : '📷 Choose photo'}
              </button>
            </div>
          </div>

          <F label="Email (account — not editable)">
            <input style={S.inpDisabled} value={user?.email || ''} readOnly disabled />
          </F>

          <div style={S.grid2}>
            <F label="Full Name"><input style={S.inp} value={form.fullName} onChange={e=>set('fullName',e.target.value)} placeholder="Siddhan Mishra" /></F>
            <F label="Professional Headline"><input style={S.inp} value={form.headline} onChange={e=>set('headline',e.target.value)} placeholder="MERN + AI Developer · Open to work" /></F>
            <F label="Phone"><input style={S.inp} value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+91 98765 43210" /></F>
            <F label="Location"><input style={S.inp} value={form.location} onChange={e=>set('location',e.target.value)} placeholder="Bhubaneswar, India" /></F>
            <F label="Citizenship"><input style={S.inp} value={form.citizenship} onChange={e=>set('citizenship',e.target.value)} placeholder="Indian" /></F>
          </div>

          <div style={S.sec}>🔗 Online Presence</div>
          <div style={S.grid2}>
            <F label="LinkedIn URL"><input style={S.inp} value={form.linkedinUrl} onChange={e=>set('linkedinUrl',e.target.value)} placeholder="https://linkedin.com/in/username" /></F>
            <F label="GitHub URL"><input style={S.inp} value={form.githubUrl} onChange={e=>set('githubUrl',e.target.value)} placeholder="https://github.com/username" /></F>
            <F label="Portfolio / Website"><input style={S.inp} value={form.portfolioUrl} onChange={e=>set('portfolioUrl',e.target.value)} placeholder="https://yoursite.dev" /></F>
          </div>
        </div>
      )}

      {/* PROFESSIONAL TAB */}
      {tab === 'professional' && (
        <div>
          <div style={S.grid2}>
            <F label="Current Title"><input style={S.inp} value={form.currentTitle} onChange={e=>set('currentTitle',e.target.value)} placeholder="Software Engineer" /></F>
            <F label="Current Company"><input style={S.inp} value={form.currentCompany} onChange={e=>set('currentCompany',e.target.value)} placeholder="TCS" /></F>
            <F label="Years of Experience"><input style={S.inp} type="number" min="0" value={form.yearsOfExp} onChange={e=>set('yearsOfExp',e.target.value)} placeholder="2" /></F>
          </div>
          <F label="Professional Summary">
            <textarea style={{ ...S.inp, height: 100 }} value={form.summary} onChange={e=>set('summary',e.target.value)} placeholder="Describe your background, strengths, and goals…" />
            <button type="button" onClick={extractSkills} style={{ ...S.addBtn, marginTop: '0.3rem' }}>🤖 Extract skills from summary</button>
          </F>
          <F label="Core Skills (comma-separated)"><input style={S.inp} value={form.skills} onChange={e=>set('skills',e.target.value)} placeholder="React, Node.js, Python, MongoDB" /></F>
          <F label="Tools & Technologies (comma-separated)"><input style={S.inp} value={form.tools} onChange={e=>set('tools',e.target.value)} placeholder="VS Code, Docker, Postman, Git" /></F>

          <div style={S.sec}>🏢 Work History</div>
          {form.workHistory.map((w, i) => (
            <div key={i} style={S.card}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem' }}>
                <span style={{ fontSize:'0.74rem', color:'#444' }}>Position #{i+1}</span>
                {form.workHistory.length > 1 && <button type="button" style={S.removeBtn} onClick={()=>removeRow('workHistory',i)}>✕ Remove</button>}
              </div>
              <div style={S.grid2}>
                <F label="Role / Title"><input style={S.inp} value={w.role} onChange={e=>setArr('workHistory',i,'role',e.target.value)} placeholder="Backend Developer" /></F>
                <F label="Company"><input style={S.inp} value={w.company} onChange={e=>setArr('workHistory',i,'company',e.target.value)} placeholder="Infosys" /></F>
                <F label="Start Date"><input style={S.inp} value={w.startDate} onChange={e=>setArr('workHistory',i,'startDate',e.target.value)} placeholder="Jan 2022" /></F>
                <F label="End Date"><input style={S.inp} value={w.endDate} onChange={e=>setArr('workHistory',i,'endDate',e.target.value)} placeholder="Present" /></F>
              </div>
              <F label="Key Achievements (one per line)">
                <textarea style={{ ...S.inp, height: 70 }} value={w.achievements} onChange={e=>setArr('workHistory',i,'achievements',e.target.value)} placeholder={"• Built REST APIs\n• Reduced latency by 40%"} />
              </F>
            </div>
          ))}
          <button type="button" style={S.addBtn} onClick={()=>addRow('workHistory',EMPTY.work)}>+ Add Position</button>
        </div>
      )}

      {/* BACKGROUND TAB */}
      {tab === 'background' && (
        <div>
          <div style={S.sec}>🎓 Education</div>
          {form.education.map((edu, i) => (
            <div key={i} style={S.card}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem' }}>
                <span style={{ fontSize:'0.74rem', color:'#444' }}>Degree #{i+1}</span>
                {form.education.length > 1 && <button type="button" style={S.removeBtn} onClick={()=>removeRow('education',i)}>✕ Remove</button>}
              </div>
              <div style={S.grid2}>
                <F label="Degree"><input style={S.inp} value={edu.degree} onChange={e=>setArr('education',i,'degree',e.target.value)} placeholder="B.Tech CSE" /></F>
                <F label="Institution"><input style={S.inp} value={edu.institute} onChange={e=>setArr('education',i,'institute',e.target.value)} placeholder="KIIT University" /></F>
                <F label="Year"><input style={S.inp} value={edu.year} onChange={e=>setArr('education',i,'year',e.target.value)} placeholder="2024" /></F>
                <F label="GPA (optional)"><input style={S.inp} value={edu.gpa} onChange={e=>setArr('education',i,'gpa',e.target.value)} placeholder="8.5/10" /></F>
              </div>
            </div>
          ))}
          <button type="button" style={S.addBtn} onClick={()=>addRow('education',EMPTY.edu)}>+ Add Education</button>

          <div style={S.sec}>🏅 Certifications</div>
          {form.certifications.map((c, i) => (
            <div key={i} style={S.card}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem' }}>
                <span style={{ fontSize:'0.74rem', color:'#444' }}>Cert #{i+1}</span>
                {form.certifications.length > 1 && <button type="button" style={S.removeBtn} onClick={()=>removeRow('certifications',i)}>✕ Remove</button>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 90px', gap:'0 1rem' }}>
                <F label="Name"><input style={S.inp} value={c.name} onChange={e=>setArr('certifications',i,'name',e.target.value)} placeholder="AWS Solutions Architect" /></F>
                <F label="Issuing Body"><input style={S.inp} value={c.issuer} onChange={e=>setArr('certifications',i,'issuer',e.target.value)} placeholder="Amazon" /></F>
                <F label="Year"><input style={S.inp} value={c.year} onChange={e=>setArr('certifications',i,'year',e.target.value)} placeholder="2023" /></F>
              </div>
              <F label="Certificate URL (optional)"><input style={S.inp} value={c.link} onChange={e=>setArr('certifications',i,'link',e.target.value)} placeholder="https://credly.com/badges/..." /></F>
            </div>
          ))}
          <button type="button" style={S.addBtn} onClick={()=>addRow('certifications',EMPTY.cert)}>+ Add Certification</button>

          <div style={S.sec}>🌐 Languages Spoken</div>
          <F label="Languages (comma-separated)"><input style={S.inp} value={form.languages} onChange={e=>set('languages',e.target.value)} placeholder="English, Hindi, Odia" /></F>

          <div style={S.sec}>🚀 Projects</div>
          {form.projects.map((pr, i) => (
            <div key={i} style={S.card}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem' }}>
                <span style={{ fontSize:'0.74rem', color:'#444' }}>Project #{i+1}</span>
                {form.projects.length > 1 && <button type="button" style={S.removeBtn} onClick={()=>removeRow('projects',i)}>✕ Remove</button>}
              </div>
              <F label="Title"><input style={S.inp} value={pr.title} onChange={e=>setArr('projects',i,'title',e.target.value)} placeholder="SkillBridge" /></F>
              <F label="Description"><textarea style={{ ...S.inp, height: 65 }} value={pr.description} onChange={e=>setArr('projects',i,'description',e.target.value)} placeholder="What does this project do?" /></F>
              <div style={S.grid2}>
                <F label="Tech Stack (comma-separated)"><input style={S.inp} value={pr.technologies} onChange={e=>setArr('projects',i,'technologies',e.target.value)} placeholder="React, FastAPI, MongoDB" /></F>
                <F label="Link (GitHub / Demo)"><input style={S.inp} value={pr.link} onChange={e=>setArr('projects',i,'link',e.target.value)} placeholder="https://github.com/…" /></F>
              </div>
            </div>
          ))}
          <button type="button" style={S.addBtn} onClick={()=>addRow('projects',EMPTY.proj)}>+ Add Project</button>
        </div>
      )}

      {/* PREFERENCES TAB */}
      {tab === 'preferences' && (
        <div>
          <F label="Preferred Job Titles (comma-separated)"><input style={S.inp} value={form.preferredTitles} onChange={e=>set('preferredTitles',e.target.value)} placeholder="Full Stack Developer, Backend Engineer" /></F>
          <F label="Desired Salary Range"><input style={S.inp} value={form.desiredSalary} onChange={e=>set('desiredSalary',e.target.value)} placeholder="8–12 LPA" /></F>
          <div style={S.grid2}>
            <F label="Employment Type">
              <select style={S.inp} value={form.employmentType} onChange={e=>set('employmentType',e.target.value)}>
                {['Full-time','Part-time','Contract','Freelance','Internship'].map(o=><option key={o}>{o}</option>)}
              </select>
            </F>
            <F label="Work Mode">
              <select style={S.inp} value={form.workMode} onChange={e=>set('workMode',e.target.value)}>
                {['Remote','Hybrid','On-site'].map(o=><option key={o}>{o}</option>)}
              </select>
            </F>
            <F label="Notice Period"><input style={S.inp} value={form.noticePeriod} onChange={e=>set('noticePeriod',e.target.value)} placeholder="30 days" /></F>
          </div>
          <div style={{ marginTop:'0.5rem', display:'flex', alignItems:'center', gap:'0.6rem' }}>
            <input type="checkbox" id="relocate" checked={form.willingToRelocate} onChange={e=>set('willingToRelocate',e.target.checked)} style={{ width:16, height:16, cursor:'pointer' }} />
            <label htmlFor="relocate" style={{ color:'#888', fontSize:'0.85rem', cursor:'pointer' }}>Willing to relocate</label>
          </div>

          {/* ── Resume section ── */}
          <div style={S.sec}>📄 Resume</div>
          <div style={{ background:'#0a0a0a', border:'1px solid #1e1e1e', borderRadius:'8px', padding:'1rem' }}>
            {form.resumeUrl ? (
              <div style={{ marginBottom:'0.75rem' }}>
                <div style={{ fontSize:'0.78rem', color:'#555', marginBottom:'0.35rem' }}>Current resume on your profile:</div>
                <a
                  href={form.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color:'#5ab0e0', fontSize:'0.82rem', wordBreak:'break-all' }}
                >
                  👁 View Resume
                </a>
              </div>
            ) : (
              <div style={{ fontSize:'0.78rem', color:'#444', marginBottom:'0.75rem' }}>
                No resume saved yet. Use <b style={{color:'#6bcb77'}}>Parse Resume</b> (upload PDF) or <b style={{color:'#818cf8'}}>Generate Resume</b> (AI from your profile) above.
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerateResume}
              disabled={generating}
              style={{
                padding: '0.38rem 0.95rem',
                background: generating ? '#1a1a1a' : 'linear-gradient(135deg,#6366f1,#818cf8)',
                color: '#fff', border: 'none', borderRadius: '6px',
                cursor: generating ? 'not-allowed' : 'pointer',
                fontSize: '0.82rem', fontWeight: 600,
              }}
            >
              {generating ? '⏳ Generating…' : '✨ Generate & Save Resume'}
            </button>
            <div style={{ fontSize:'0.68rem', color:'#333', marginTop:'0.25rem' }}>
              Generates Harvard-format .docx from your profile, saves URL here, and downloads the file.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
