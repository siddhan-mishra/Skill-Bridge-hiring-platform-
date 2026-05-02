// ProfilePage.jsx
// Lines 1-5: imports
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import { Link } from 'react-router-dom';

// ─── helpers ────────────────────────────────────────────────────────────────
const EMPTY_EDU = { degree: '', institute: '', year: '' };
const EMPTY_PRJ = { title: '', description: '', technologies: '', link: '' };

function ProfilePage() {
  const { user, API_BASE } = useAuth();

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [message, setMessage]   = useState('');

  // ── The "source of truth" fetched from DB ──────────────────────────────
  const [savedForm, setSavedForm] = useState(null);

  // ── Live editable form ────────────────────────────────────────────────
  const [form, setForm] = useState({
    headline:  '',
    summary:   '',
    skills:    '',
    education: [{ ...EMPTY_EDU }],
    projects:  [{ ...EMPTY_PRJ }],
  });

  // ── Auto-clear status messages after 3 s ─────────────────────────────
  useEffect(() => {
    if (!message && !error) return;
    const t = setTimeout(() => { setMessage(''); setError(''); }, 3000);
    return () => clearTimeout(t);
  }, [message, error]);

  // ── Build form shape from raw API data ───────────────────────────────
  const shapeForm = useCallback((p) => ({
    headline:  p.headline || '',
    summary:   p.summary  || '',
    skills:    (p.skills || []).join(', '),
    education: p.education?.length
      ? p.education
      : [{ ...EMPTY_EDU }],
    projects: p.projects?.length
      ? p.projects.map(pr => ({
          ...pr,
          technologies: (pr.technologies || []).join(', '),
        }))
      : [{ ...EMPTY_PRJ }],
  }), []);

  // ── Fetch on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/profile/me`);
        if (res.data) {
          const shaped = shapeForm(res.data);
          setForm(shaped);
          setSavedForm(shaped);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [API_BASE, shapeForm]);

  // ─── Field change handlers ────────────────────────────────────────────
  // Line 70: top-level string fields (headline, summary, skills)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // Line 75: education row field
  const handleEducationChange = (idx, field, value) => {
    setForm(f => {
      const copy = [...f.education];
      copy[idx] = { ...copy[idx], [field]: value };
      return { ...f, education: copy };
    });
  };

  // Line 83: project row field
  const handleProjectChange = (idx, field, value) => {
    setForm(f => {
      const copy = [...f.projects];
      copy[idx] = { ...copy[idx], [field]: value };
      return { ...f, projects: copy };
    });
  };

  // Line 91: ADD a blank education row
  const addEducation = () =>
    setForm(f => ({ ...f, education: [...f.education, { ...EMPTY_EDU }] }));

  // Line 94: REMOVE an education row — requires at least 1 row to remain
  const removeEducation = (idx) => {
    setForm(f => {
      if (f.education.length === 1) return f; // keep minimum 1
      const copy = f.education.filter((_, i) => i !== idx);
      return { ...f, education: copy };
    });
  };

  // Line 102: ADD a blank project
  const addProject = () =>
    setForm(f => ({ ...f, projects: [...f.projects, { ...EMPTY_PRJ }] }));

  // Line 105: REMOVE a project — requires at least 1 row to remain
  const removeProject = (idx) => {
    setForm(f => {
      if (f.projects.length === 1) return f;
      const copy = f.projects.filter((_, i) => i !== idx);
      return { ...f, projects: copy };
    });
  };

  // Line 113: Reset unsaved changes back to last saved state
  const handleReset = () => {
    if (!savedForm) return;
    setForm(savedForm);
    setMessage('Changes discarded.');
  };

  // Line 118: Extract skills from summary via NLP
  const handleExtractSkills = async () => {
    if (!form.summary && !form.headline) return;
    try {
      const res = await axios.post(`${API_BASE}/api/nlp/extract-skills`, {
        text: `${form.headline}\n${form.summary}`,
      });
      const extracted = res.data.skills || [];
      const existing  = form.skills.split(',').map(s => s.trim()).filter(Boolean);
      const merged    = Array.from(new Set([...existing, ...extracted]));
      setForm(f => ({ ...f, skills: merged.join(', ') }));
    } catch (err) {
      console.error(err);
      setError('Skill extraction failed');
    }
  };

  // Line 132: Save profile
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    const payload = {
      headline: form.headline,
      summary:  form.summary,
      skills:   form.skills.split(',').map(s => s.trim()).filter(Boolean),
      education: form.education,
      projects:  form.projects.map(pr => ({
        title:        pr.title,
        description:  pr.description,
        technologies: pr.technologies.split(',').map(t => t.trim()).filter(Boolean),
        link:         pr.link,
      })),
    };

    try {
      const res = await axios.put(`${API_BASE}/api/profile/me`, payload);
      const shaped = shapeForm(res.data);
      setSavedForm(shaped);      // update the "saved" snapshot
      setMessage('✅ Profile saved successfully!');
    } catch (err) {
      console.error(err);
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // ─── Guards ───────────────────────────────────────────────────────────
  if (!user || user.role !== 'seeker') {
    return <div className="card"><p>Only job seekers can access this page.</p></div>;
  }
  if (loading) {
    return <div className="card"><p>Loading profile...</p></div>;
  }

  // ─── Input style shared ───────────────────────────────────────────────
  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    marginTop: '0.3rem',
    background: '#2a2a2a',
    color: 'white',
    border: '1px solid #555',
    borderRadius: '4px',
  };

  const removeBtnStyle = {
    padding: '0.3rem 0.7rem',
    background: '#8B0000',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    marginTop: '0.3rem',
  };

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="card">
      <p style={{ marginBottom: '1rem' }}>
        <Link
          to={`/profile/${user.id}`}
          style={{ color: '#aaa', fontSize: '0.9rem', textDecoration: 'none' }}
        >
          ← back to my profile
        </Link>
      </p>
      <h2> Edit Profile</h2>

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

export default ProfilePage;