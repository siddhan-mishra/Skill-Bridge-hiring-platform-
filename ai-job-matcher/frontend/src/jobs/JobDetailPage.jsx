// JobDetailPage.jsx — full detail view for a single job posting
// Line 1: imports
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

function JobDetailPage() {
  const { id } = useParams();                    // Line 9: gets :id from URL
  const { user, API_BASE } = useAuth();
  const navigate = useNavigate();

  const [job, setJob]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // ── fetch single job ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/jobs/${id}`);  // Line 20: GET /api/jobs/:id
        setJob(res.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Job not found');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [API_BASE, id]);

  // ── delete handler (recruiter only) ───────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm('Delete this job posting? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE}/api/jobs/${id}`);  // token auto-attached by AuthContext line 34
      navigate('/jobs');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  // ── guards ─────────────────────────────────────────────────────────────
  if (loading) return <div className="card"><p>Loading job...</p></div>;
  if (error)   return (
    <div className="card">
      <p style={{ color: 'tomato' }}>{error}</p>
      <Link to="/jobs">← Back to Jobs</Link>
    </div>
  );
  if (!job)    return <div className="card"><p>Job not found.</p></div>;

  // ── is this the job's owner? ───────────────────────────────────────────
  // Line 54: compare user.id (string from localStorage) vs job.recruiter._id (object from DB)
  const isOwner =
    user?.role === 'recruiter' &&
    user?.id?.toString() === job.recruiter?._id?.toString();

  // ── shared input style for dark theme consistency ──────────────────────
  const tagStyle = {
    display: 'inline-block',
    padding: '0.25rem 0.6rem',
    background: '#2a6496',
    color: 'white',
    borderRadius: '20px',
    fontSize: '0.8rem',
    marginRight: '0.4rem',
    marginBottom: '0.4rem',
  };

  const metaStyle = {
    color: '#aaa',
    fontSize: '0.9rem',
    marginBottom: '0.3rem',
  };

  return (
    <div className="card" style={{ maxWidth: 780 }}>

      {/* ── Back link ── */}
      {/* Line 76 */}
      <p style={{ marginBottom: '1rem' }}>
        <Link to="/jobs" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to all jobs
        </Link>
      </p>

      {/* ── Header ── */}
      <h2 style={{ marginBottom: '0.25rem' }}>{job.title}</h2>
      <p style={{ fontSize: '1.1rem', color: '#ccc', marginBottom: '1rem' }}>
        {job.company}
      </p>

      {/* ── Meta info row ── */}
      {/* Line 87 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {job.location && (
          <div style={metaStyle}>
            📍 {job.location}
          </div>
        )}
        {job.jobType && (
          <div style={metaStyle}>
            💼 {job.jobType}
          </div>
        )}
        {job.salaryRange && (
          <div style={metaStyle}>
            💰 {job.salaryRange}
          </div>
        )}
        {job.recruiter?.name && (
          <div style={metaStyle}>
            👤 Posted by {job.recruiter.name}
          </div>
        )}
      </div>

      {/* ── Required Skills ── */}
      {/* Line 105 */}
      {job.requiredSkills?.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Required Skills</h3>
          <div>
            {job.requiredSkills.map((skill, i) => (
              <span key={i} style={tagStyle}>{skill}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Description ── */}
      {/* Line 116 */}
      {job.description && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Job Description</h3>
          <p style={{ lineHeight: '1.7', color: '#ccc', whiteSpace: 'pre-wrap' }}>
            {job.description}
          </p>
        </div>
      )}

      {/* ── Seeker CTA: go to matches ── */}
      {/* Line 125 */}
      {user?.role === 'seeker' && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#1a2a1a', borderRadius: '6px', border: '1px solid #2a4a2a' }}>
          <p style={{ color: 'lightgreen', marginBottom: '0.5rem' }}>
            Want to see how well you match this job?
          </p>
          <Link to="/matches" className="btn btn-secondary">
            View My Match Score →
          </Link>
        </div>
      )}

      {/* ── Recruiter owner controls ── */}
      {/* Line 136: only the creator sees Edit + Delete */}
      {isOwner && (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #333' }}>
          <Link
            to={`/jobs/${id}/edit`}
            style={{
              padding: '0.5rem 1.2rem',
              background: '#2a6496',
              color: 'white',
              borderRadius: '4px',
              textDecoration: 'none',
            }}
          >
            ✏️ Edit Job
          </Link>
          <button
            onClick={handleDelete}
            style={{
              padding: '0.5rem 1.2rem',
              background: '#8B0000',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            🗑️ Delete Job
          </button>
        </div>
      )}

    </div>
  );
}

export default JobDetailPage;