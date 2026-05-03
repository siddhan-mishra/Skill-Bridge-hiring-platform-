import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

const S = {
  card: {
    background: '#070d1a',
    border: '1px solid #1f2937',
    borderRadius: '10px',
    padding: '1.1rem 1.4rem',
    transition: 'border-color 0.15s',
  },
  tag: {
    display: 'inline-block', padding: '0.15rem 0.55rem',
    background: 'rgba(99,102,241,0.1)', color: '#818cf8',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: '999px', fontSize: '0.72rem',
    marginRight: '0.3rem', marginBottom: '0.3rem',
  },
  badge: (color) => ({
    padding: '0.18rem 0.6rem', borderRadius: '999px',
    fontSize: '0.72rem', fontWeight: 600,
    background: color + '18', color, border: `1px solid ${color}33`,
  }),
};

export default function RecruiterJobsPage() {
  const { user, API_BASE } = useAuth();
  const token = localStorage.getItem('token');

  const [jobs,    setJobs]    = useState([]);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (user?.role !== 'recruiter') { setLoading(false); return; }
    (async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [jobsRes, statsRes] = await Promise.all([
          axios.get(`${API_BASE}/api/jobs/my`, { headers }),
          axios.get(`${API_BASE}/api/stats/recruiter`, { headers }),
        ]);
        setJobs(jobsRes.data);
        setStats(statsRes.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [API_BASE, user, token]);

  const handleDelete = async (jobId) => {
    if (!window.confirm('Delete this job posting? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE}/api/jobs/${jobId}`, { headers: { Authorization: `Bearer ${token}` } });
      setJobs(prev => prev.filter(j => j._id !== jobId));
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  if (!user || user.role !== 'recruiter') {
    return <div className="card"><p>Only recruiters can view this page.</p></div>;
  }
  if (loading) return <div className="card"><p>Loading…</p></div>;
  if (error)   return <div className="card"><p style={{ color: '#f87171' }}>{error}</p></div>;

  return (
    <div style={{ maxWidth: 900, width: '100%' }}>

      {/* ── Header row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>My Job Postings</h2>
          <p style={{ color: '#6b7280', margin: '0.2rem 0 0', fontSize: '0.85rem' }}>Manage your listings and review applicants</p>
        </div>
        <Link to="/jobs/new" className="btn btn-primary" style={{ fontWeight: 600 }}>+ Post New Job</Link>
      </div>

      {/* ── Stats strip ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Jobs Posted',   value: stats.totalJobs,         color: '#818cf8' },
            { label: 'Applications',  value: stats.totalApplications,  color: '#60a5fa' },
            { label: 'Shortlisted',   value: stats.shortlisted,        color: '#34d399' },
            { label: 'Pending',       value: stats.pending,            color: '#fbbf24' },
            { label: 'Avg Match',     value: `${stats.avgMatchScore}%`, color: '#a78bfa' },
          ].map(s => (
            <div key={s.label} style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '10px', padding: '0.85rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.15rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {jobs.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '1rem' }}>You haven't posted any jobs yet.</p>
          <Link to="/jobs/new" style={{ color: '#6366f1' }}>Post your first job →</Link>
        </div>
      )}

      {/* ── Job cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {jobs.map(job => (
          <div key={job._id} style={S.card}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#374151'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1f2937'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <Link to={`/jobs/${job._id}`} style={{ fontWeight: 700, fontSize: '1rem', color: '#e5e7eb' }}>{job.title}</Link>
                  {job.jobType && <span style={S.badge('#818cf8')}>{job.jobType}</span>}
                </div>
                <div style={{ color: '#9ca3af', fontSize: '0.84rem', marginTop: '0.2rem' }}>
                  {job.company}{job.location ? ` · ${job.location}` : ''}
                  {job.salaryRange ? <span style={{ color: '#6366f1' }}> · {job.salaryRange}</span> : ''}
                </div>
              </div>

              {/* App count badges */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                {job.appCount > 0 && (
                  <span style={S.badge('#60a5fa')}>
                    📥 {job.appCount} applied
                  </span>
                )}
                {job.shortlistedCount > 0 && (
                  <span style={S.badge('#34d399')}>
                    🎉 {job.shortlistedCount} shortlisted
                  </span>
                )}
              </div>
            </div>

            {/* Skills */}
            {job.requiredSkills?.length > 0 && (
              <div style={{ marginTop: '0.65rem' }}>
                {job.requiredSkills.slice(0, 8).map((s, i) => <span key={i} style={S.tag}>{s}</span>)}
                {job.requiredSkills.length > 8 && <span style={{ color: '#4b5563', fontSize: '0.72rem' }}>+{job.requiredSkills.length - 8}</span>}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
              <Link to={`/recruiter/jobs/${job._id}/candidates`}
                style={{ padding: '0.3rem 0.85rem', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                👥 Candidates {job.appCount > 0 ? `(${job.appCount})` : ''}
              </Link>
              <Link to={`/jobs/${job._id}/edit`}
                style={{ padding: '0.3rem 0.85rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', fontSize: '0.8rem' }}>
                ✏️ Edit
              </Link>
              <button onClick={() => handleDelete(job._id)}
                style={{ padding: '0.3rem 0.85rem', background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
