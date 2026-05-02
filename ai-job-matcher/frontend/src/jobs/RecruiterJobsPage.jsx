// RecruiterJobsPage.jsx — shows only THIS recruiter's posted jobs
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

function RecruiterJobsPage() {
  const { user, API_BASE } = useAuth();
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        // Line 15: fetch all jobs — then filter client-side by owner
        // (avoids needing a new backend endpoint right now)
        const res = await axios.get(`${API_BASE}/api/jobs`);
        const mine = (res.data || []).filter(
          j => j.recruiter?._id?.toString() === user?.id?.toString()
        );
        setJobs(mine);
      } catch (err) {
        console.error(err);
        setError('Failed to load your jobs');
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'recruiter') fetchJobs();
    else setLoading(false);
  }, [API_BASE, user]);

  const handleDelete = async (jobId) => {
    if (!window.confirm('Delete this job posting? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE}/api/jobs/${jobId}`);
      setJobs(prev => prev.filter(j => j._id !== jobId));
    } catch (err) {
      alert('Failed to delete: ' + (err.response?.data?.message || err.message));
    }
  };

  if (!user || user.role !== 'recruiter') {
    return <div className="card"><p>Only recruiters can view this page.</p></div>;
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>My Job Postings</h2>
        <Link
          to="/jobs/new"
          style={{
            padding: '0.4rem 1rem',
            background: '#2a6496',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}
        >
          + Post New Job
        </Link>
      </div>

      {loading && <p>Loading...</p>}
      {error   && <p style={{ color: 'tomato' }}>{error}</p>}
      {!loading && !error && jobs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>You haven't posted any jobs yet.</p>
          <Link to="/jobs/new" style={{ color: '#2a6496' }}>Post your first job →</Link>
        </div>
      )}

      {/* Line 65: job cards grid */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {jobs.map(job => (
          <div
            key={job._id}
            style={{
              padding: '1rem 1.25rem',
              background: '#1e1e1e',
              border: '1px solid #333',
              borderRadius: '6px',
            }}
          >
            {/* ── top row: title + action buttons ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>
                  <Link
                    to={`/jobs/${job._id}`}
                    style={{ color: 'white', textDecoration: 'none' }}
                    onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.target.style.textDecoration = 'none'}
                  >
                    {job.title}
                  </Link>
                </h3>
                <p style={{ color: '#aaa', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
                  {job.company}{job.location && ` • ${job.location}`}
                  {job.jobType && ` • ${job.jobType}`}
                </p>
              </div>

              {/* ── action buttons ── */}
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                {/* Line 89: view candidates — the new recruiter superpower */}
                <Link
                  to={`/recruiter/jobs/${job._id}/candidates`}
                  style={{
                    padding: '0.35rem 0.8rem',
                    background: '#1a4a1a',
                    color: 'lightgreen',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    border: '1px solid #2a6a2a',
                  }}
                >
                  👥 View Candidates
                </Link>
                <Link
                  to={`/jobs/${job._id}/edit`}
                  style={{
                    padding: '0.35rem 0.8rem',
                    background: '#2a3a4a',
                    color: 'white',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                  }}
                >
                  ✏️ Edit
                </Link>
                <button
                  onClick={() => handleDelete(job._id)}
                  style={{
                    padding: '0.35rem 0.8rem',
                    background: '#4a1a1a',
                    color: '#ff8080',
                    border: '1px solid #6a2a2a',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>

            {/* ── skills tags ── */}
            {job.requiredSkills?.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                {job.requiredSkills.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.5rem',
                      background: '#2a2a3a',
                      border: '1px solid #444',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      color: '#ccc',
                      marginRight: '0.3rem',
                      marginTop: '0.3rem',
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecruiterJobsPage;