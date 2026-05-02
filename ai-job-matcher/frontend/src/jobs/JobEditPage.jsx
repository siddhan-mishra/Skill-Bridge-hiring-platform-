// JobEditPage.jsx — edit a job posting, pre-filled from DB
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

function JobEditPage() {
  const { id } = useParams();                   // Line 8: job id from URL
  const { user, API_BASE } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [form, setForm] = useState({
    title:         '',
    company:       '',
    location:      '',
    jobType:       'Full-time',
    salaryRange:   '',
    description:   '',
    requiredSkills: '',
  });

  // ── fetch existing job to pre-fill ─────────────────────────────────────
  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/jobs/${id}`);
        const job = res.data;

        // Line 30: guard — only the owner can reach this page
        if (user?.id?.toString() !== job.recruiter?._id?.toString()) {
          navigate(`/jobs/${id}`);
          return;
        }

        setForm({
          title:          job.title         || '',
          company:        job.company       || '',
          location:       job.location      || '',
          jobType:        job.jobType       || 'Full-time',
          salaryRange:    job.salaryRange   || '',
          description:    job.description   || '',
          requiredSkills: (job.requiredSkills || []).join(', '),
        });
      } catch (err) {
        console.error(err);
        setError('Failed to load job');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchJob();
  }, [API_BASE, id, user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // ── submit updated job ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        requiredSkills: form.requiredSkills
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      };
      await axios.put(`${API_BASE}/api/jobs/${id}`, payload); // token auto by AuthContext
      navigate(`/jobs/${id}`);                                 // Line 70: go back to detail page
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update job');
    } finally {
      setSaving(false);
    }
  };

  // ── guards ──────────────────────────────────────────────────────────────
  if (!user || user.role !== 'recruiter') {
    return <div className="card"><p>Only recruiters can edit jobs.</p></div>;
  }
  if (loading) return <div className="card"><p>Loading...</p></div>;

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    marginTop: '0.3rem',
    background: '#2a2a2a',
    color: 'white',
    border: '1px solid #555',
    borderRadius: '4px',
  };

  return (
    <div className="card" style={{ maxWidth: 680 }}>

      {/* Line 91: back link */}
      <p style={{ marginBottom: '1rem' }}>
        <Link to={`/jobs/${id}`} style={{ color: '#aaa', fontSize: '0.9rem', textDecoration: 'none' }}>
          ← Back to job
        </Link>
      </p>

      <h2 style={{ marginBottom: '1.5rem' }}>Edit Job Posting</h2>

      {error && (
        <p style={{ color: 'tomato', background: '#2a0000', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit}>

        {[
          { label: 'Job Title',                       name: 'title',         required: true },
          { label: 'Company',                         name: 'company',       required: true },
          { label: 'Location',                        name: 'location',      required: false },
          { label: 'Salary Range (e.g. 4–6 LPA)',    name: 'salaryRange',   required: false },
          { label: 'Required Skills (comma-separated)', name: 'requiredSkills', required: false },
        ].map(({ label, name, required }) => (
          <div key={name} style={{ marginBottom: '1rem' }}>
            <label>{label}</label>
            <input
              type="text"
              name={name}
              value={form[name]}
              onChange={handleChange}
              required={required}
              style={inputStyle}
            />
          </div>
        ))}

        <div style={{ marginBottom: '1rem' }}>
          <label>Job Type</label>
          <select
            name="jobType"
            value={form.jobType}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Internship">Internship</option>
            <option value="Contract">Contract</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label>Job Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={6}
            style={inputStyle}
          />
        </div>

        {/* Line 148: Save + Cancel */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
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
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
          <Link
            to={`/jobs/${id}`}
            style={{
              padding: '0.5rem 1.2rem',
              background: '#444',
              color: 'white',
              borderRadius: '4px',
              textDecoration: 'none',
            }}
          >
            Cancel
          </Link>
        </div>

      </form>
    </div>
  );
}

export default JobEditPage;