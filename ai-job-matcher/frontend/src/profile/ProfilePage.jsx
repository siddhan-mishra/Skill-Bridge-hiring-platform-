import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';



function ProfilePage() {
  const { user, API_BASE } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    headline: '',
    summary: '',
    skills: '',
    education: [{ degree: '', institute: '', year: '' }],
    projects: [{ title: '', description: '', technologies: '', link: '' }],
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/profile/me`);
        if (res.data) {
          const p = res.data;
          setForm({
            headline: p.headline || '',
            summary: p.summary || '',
            skills: (p.skills || []).join(', '),
            education: p.education?.length
              ? p.education
              : [{ degree: '', institute: '', year: '' }],
            projects: p.projects?.length
              ? p.projects.map(pr => ({
                  ...pr,
                  technologies: (pr.technologies || []).join(', ')
                }))
              : [{ title: '', description: '', technologies: '', link: '' }],
          });
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [API_BASE]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleEducationChange = (idx, field, value) => {
    setForm(f => {
      const copy = [...f.education];
      copy[idx] = { ...copy[idx], [field]: value };
      return { ...f, education: copy };
    });
  };

  const handleProjectChange = (idx, field, value) => {
    setForm(f => {
      const copy = [...f.projects];
      copy[idx] = { ...copy[idx], [field]: value };
      return { ...f, projects: copy };
    });
  };

  const addEducation = () => {
    setForm(f => ({
      ...f,
      education: [...f.education, { degree: '', institute: '', year: '' }]
    }));
  };

  const addProject = () => {
    setForm(f => ({
      ...f,
      projects: [...f.projects, { title: '', description: '', technologies: '', link: '' }]
    }));
  };


const handleExtractSkills = async () => {
  if (!form.summary && !form.headline) return;
  try {
    const res = await axios.post(`${API_BASE}/api/nlp/extract-skills`, {
      text: `${form.headline}\n${form.summary}`
    });
    const extracted = res.data.skills || [];
    const existing = form.skills
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const merged = Array.from(new Set([...existing, ...extracted]));
    setForm(f => ({ ...f, skills: merged.join(', ') }));
  } catch (err) {
    console.error(err);
    setError('Skill extraction failed');
  }
};


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    const payload = {
      headline: form.headline,
      summary: form.summary,
      skills: form.skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      education: form.education,
      projects: form.projects.map(pr => ({
        title: pr.title,
        description: pr.description,
        technologies: pr.technologies
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
        link: pr.link,
      })),
    };

    try {
      await axios.put(`${API_BASE}/api/profile/me`, payload);
      setMessage('Profile saved.');
    } catch (err) {
      console.error(err);
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'seeker') {
    return (
      <div style={{ padding: '2rem', color: 'white' }}>
        <p>Only job seekers can access this page.</p>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: 'white' }}>Loading profile...</div>;
  }

  return (
    <div style={{ padding: '2rem', color: 'white' }}>
      <h2>Your Profile</h2>
      {error && <p style={{ color: 'tomato' }}>{error}</p>}
      {message && <p style={{ color: 'lightgreen' }}>{message}</p>}

      <form onSubmit={handleSubmit} style={{ maxWidth: 700 }}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Headline</label><br />
          <input
            type="text"
            name="headline"
            value={form.headline}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Summary</label><br />
          <textarea
            name="summary"
            value={form.summary}
            onChange={handleChange}
            rows={3}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Skills (comma-separated)</label><br />
          <input
            type="text"
            name="skills"
            value={form.skills}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }}
          />
          <button type="button" onClick={handleExtractSkills} style={{ marginTop: '0.5rem' }}>
            Extract skills from summary
          </button>
        </div>

        <h3>Education</h3>
        {form.education.map((edu, idx) => (
          <div key={idx} style={{ marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
            <input
              type="text"
              placeholder="Degree"
              value={edu.degree}
              onChange={(e) => handleEducationChange(idx, 'degree', e.target.value)}
              style={{ width: '32%', marginRight: '2%', padding: '0.5rem' }}
            />
            <input
              type="text"
              placeholder="Institute"
              value={edu.institute}
              onChange={(e) => handleEducationChange(idx, 'institute', e.target.value)}
              style={{ width: '32%', marginRight: '2%', padding: '0.5rem' }}
            />
            <input
              type="text"
              placeholder="Year"
              value={edu.year}
              onChange={(e) => handleEducationChange(idx, 'year', e.target.value)}
              style={{ width: '32%', padding: '0.5rem' }}
            />
          </div>
        ))}
        <button type="button" onClick={addEducation} style={{ marginBottom: '1rem' }}>
          + Add Education
        </button>

        <h3>Projects</h3>
        {form.projects.map((pr, idx) => (
          <div key={idx} style={{ marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
            <input
              type="text"
              placeholder="Project title"
              value={pr.title}
              onChange={(e) => handleProjectChange(idx, 'title', e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            />
            <textarea
              placeholder="Short description"
              value={pr.description}
              onChange={(e) => handleProjectChange(idx, 'description', e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            />
            <input
              type="text"
              placeholder="Technologies (comma-separated)"
              value={pr.technologies}
              onChange={(e) => handleProjectChange(idx, 'technologies', e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            />
            <input
              type="text"
              placeholder="Link (GitHub, demo...)"
              value={pr.link}
              onChange={(e) => handleProjectChange(idx, 'link', e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
        ))}
        <button type="button" onClick={addProject} style={{ marginBottom: '1rem' }}>
          + Add Project
        </button>

        <div>
          <button type="submit" disabled={saving} style={{ padding: '0.5rem 1rem' }}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProfilePage;
