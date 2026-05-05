import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

const S = {
  card: { background: '#070d1a', border: '1px solid #1f2937', borderRadius: '10px', padding: '1.1rem 1.4rem', transition: 'border-color 0.15s' },
  tag:  { display: 'inline-block', padding: '0.15rem 0.55rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '999px', fontSize: '0.72rem', marginRight: '0.3rem', marginBottom: '0.3rem' },
  badge: (color) => ({ padding: '0.18rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, background: color + '18', color, border: `1px solid ${color}33` }),
  modeBadge: (mode) => ({
    display: 'inline-block', padding: '0.15rem 0.55rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
    background: mode === 'Remote' ? 'rgba(16,185,129,0.1)' : mode === 'Hybrid' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
    color:      mode === 'Remote' ? '#34d399'              : mode === 'Hybrid' ? '#fbbf24'              : '#818cf8',
    border:     `1px solid ${mode === 'Remote' ? 'rgba(16,185,129,0.25)' : mode === 'Hybrid' ? 'rgba(245,158,11,0.25)' : 'rgba(99,102,241,0.25)'}`,
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
        // FIX: correct path is /api/jobs/my/jobs (not /api/jobs/my)
        const [jobsRes, statsRes] = await Promise.all([
          axios.get(`${API_BASE}/api/jobs/my/jobs`, { headers }),
          axios.get(`${API_BASE}/api/stats/recruiter`, { headers }).catch(() => ({ data: null })),
        ]);
        setJobs(jobsRes.data);
        setStats(statsRes.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load your jobs');
      } finally {
        setLoading(false);
      }
    })();
  }, [API_BASE, user, token]);

  const handleDelete = async (jobId) => {
    if (!window.confirm('Delete this job posting? All applications will also be removed.')) return;
    try {
      await axios.delete(`${API_BASE}/api/jobs/${jobId}`, { headers: { Authorization: `Bearer ${token}` } });
      setJobs(prev => prev.filter(j => j._id !== jobId));
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleActive = async (job) => {
    try {
      await axios.put(`${API_BASE}/api/jobs/${job._id}`,
        { isActive: !job.isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setJobs(prev => prev.map(j => j._id === job._id ? { ...j, isActive: !j.isActive } : j));
    } catch (err) {
      alert('Toggle failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // Salary display with backward compat
  const salaryLabel = (job) => {
    if (job.salaryMin && job.salaryMax) return `${job.salaryMin}–${job.salaryMax} ${job.salaryUnit || 'LPA'}`;
    if (job.salaryMin) return `From ${job.salaryMin} ${job.salaryUnit || 'LPA'}`;
    if (job.salaryRange) return job.salaryRange;
    return null;
  };

  if (!user || user.role !== 'recruiter')
    return <div className="card"><p>Only recruiters can view this page.</p></div>;
  if (loading) return <div className="card"><p style={{ color: '#9ca3af' }}>⏳ Loading…</p></div>;
  if (error)   return <div className="card"><p style={{ color: '#f87171' }}>{error}</p></div>;

  return (
    <div style={{ maxWidth: 900, width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#e5e7eb' }}>My Job Postings</h2>
          <p style={{ color: '#4b5563', margin: '0.2rem 0 0', fontSize: '0.85rem' }}>Manage your listings and review applicants</p>
        </div>
        <Link to="/jobs/new" style={{ padding: '0.5rem 1.2rem', background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' }}>+ Post New Job</Link>
      </div>

      {/* Stats strip */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Jobs Posted',  value: stats.totalJobs,        color: '#818cf8' },
            { label: 'Applications', value: stats.totalApplications, color: '#60a5fa' },
            { label: 'Shortlisted',  value: stats.shortlisted,       color: '#34d399' },
            { label: 'Pending',      value: stats.pending,           color: '#fbbf24' },
            { label: 'Avg Match',    value: stats.avgMatchScore != null ? `${stats.avgMatchScore}%` : '—', color: '#a78bfa' },
          ].map(s => (
            <div key={s.label} style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '10px', padding: '0.85rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.15rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {jobs.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💼</div>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>You haven't posted any jobs yet.</p>
          <Link to="/jobs/new" style={{ color: '#6366f1' }}>Post your first job →</Link>
        </div>
      )}

      {/* Job cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {jobs.map(job => {
          const salary = salaryLabel(job);
          return (
            <div key={job._id} style={{ ...S.card, borderColor: job.isActive ? '#1f2937' : '#374151', opacity: job.isActive ? 1 : 0.7 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#374151'}
              onMouseLeave={e => e.currentTarget.style.borderColor = job.isActive ? '#1f2937' : '#374151'}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <Link to={`/jobs/${job._id}`} style={{ fontWeight: 700, fontSize: '1rem', color: '#e5e7eb' }}>{job.title}</Link>
                    {job.jobType  && <span style={S.badge('#818cf8')}>{job.jobType}</span>}
                    {job.workMode && <span style={S.modeBadge(job.workMode)}>{job.workMode}</span>}
                    {!job.isActive && <span style={S.badge('#6b7280')}>Inactive</span>}
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: '0.84rem', marginTop: '0.2rem' }}>
                    {job.company}{job.location ? ` · ${job.location}` : ''}
                    {salary && <span style={{ color: '#6366f1' }}> · {salary}</span>}
                  </div>
                </div>

                {/* App count badges */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                  {job.appCount > 0 && <span style={S.badge('#60a5fa')}>📥 {job.appCount} applied</span>}
                  {job.shortlistedCount > 0 && <span style={S.badge('#34d399')}>🎉 {job.shortlistedCount} shortlisted</span>}
                  {job.rejectedCount   > 0 && <span style={S.badge('#f87171')}>❌ {job.rejectedCount} rejected</span>}
                </div>
              </div>

              {/* Skills */}
              {job.requiredSkills?.length > 0 && (
                <div style={{ marginTop: '0.65rem' }}>
                  {job.requiredSkills.slice(0, 8).map((s, i) => <span key={i} style={S.tag}>{s}</span>)}
                  {job.requiredSkills.length > 8 && <span style={{ color: '#4b5563', fontSize: '0.72rem' }}>+{job.requiredSkills.length - 8}</span>}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <Link to={`/recruiter/jobs/${job._id}/candidates`}
                  style={{ padding: '0.3rem 0.85rem', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                  👥 Candidates{job.appCount > 0 ? ` (${job.appCount})` : ''}
                </Link>
                <Link to={`/jobs/${job._id}/edit`}
                  style={{ padding: '0.3rem 0.85rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', fontSize: '0.8rem' }}>
                  ✏️ Edit
                </Link>
                <button onClick={() => handleToggleActive(job)}
                  style={{ padding: '0.3rem 0.85rem', background: job.isActive ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)', color: job.isActive ? '#fbbf24' : '#34d399', border: `1px solid ${job.isActive ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                  {job.isActive ? '⏸ Pause' : '▶ Activate'}
                </button>
                <button onClick={() => handleDelete(job._id)}
                  style={{ padding: '0.3rem 0.85rem', background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                  🗑️ Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
