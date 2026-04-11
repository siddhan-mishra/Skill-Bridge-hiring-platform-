import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

function JobCreatePage() {
  const { user, API_BASE } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    company: '',
    location: '',
    jobType: 'Full-time',
    salaryRange: '',
    description: '',
    requiredSkills: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user || user.role !== 'recruiter') {
    return (
      <div className="card">
        <p>Only recruiters can post jobs.</p>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      title: form.title,
      company: form.company,
      location: form.location,
      jobType: form.jobType,
      salaryRange: form.salaryRange,
      description: form.description,
      requiredSkills: form.requiredSkills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
    };

    try {
      await axios.post(`${API_BASE}/api/jobs`, payload);
      navigate('/jobs');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create job');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h2>Post a New Job</h2>
      {error && <p style={{ color: 'tomato' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Job Title</label><br />
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Company</label><br />
          <input
            type="text"
            name="company"
            value={form.company}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Location</label><br />
          <input
            type="text"
            name="location"
            value={form.location}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Job Type</label><br />
          <select
            name="jobType"
            value={form.jobType}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }}
          >
            <option value="Full-time">Full-time</option>
            <option value="Internship">Internship</option>
            <option value="Contract">Contract</option>
          </select>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Salary Range</label><br />
          <input
            type="text"
            name="salaryRange"
            value={form.salaryRange}
            onChange={handleChange}
            placeholder="e.g. 4–6 LPA"
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Required Skills (comma-separated)</label><br />
          <input
            type="text"
            name="requiredSkills"
            value={form.requiredSkills}
            onChange={handleChange}
            placeholder="React, Node.js, MongoDB"
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Job Description</label><br />
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <button type="submit" disabled={saving} style={{ padding: '0.5rem 1rem' }}>
          {saving ? 'Posting...' : 'Post Job'}
        </button>
      </form>
    </div>
  );
}

export default JobCreatePage;
