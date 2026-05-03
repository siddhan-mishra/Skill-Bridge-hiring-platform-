import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

const statusMeta = {
  pending:     { color: '#fbbf24', label: 'Pending'     },
  reviewed:    { color: '#60a5fa', label: 'Reviewed'    },
  shortlisted: { color: '#34d399', label: 'Shortlisted' },
  rejected:    { color: '#f87171', label: 'Rejected'    },
};

export default function RecruiterDashboard() {
  const { user, API_BASE } = useAuth();
  const token = localStorage.getItem('token');

  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'recruiter') { setLoading(false); return; }
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/stats/recruiter`, { headers: { Authorization: `Bearer ${token}` } });
        setStats(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [API_BASE, user, token]);

  if (!user || user.role !== 'recruiter') return <div className="card"><p>Recruiters only.</p></div>;
  if (loading) return <div className="card"><p>Loading…</p></div>;
  if (!stats)  return <div className="card"><p style={{ color: '#f87171' }}>Failed to load stats.</p></div>;

  return (
    <div style={{ maxWidth: 860, width: '100%' }}>
      {/* Welcome */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.2rem' }}>Recruiter Dashboard 🏢</h2>
        <p style={{ color: '#6b7280', margin: 0, fontSize: '0.88rem' }}>Your hiring pipeline at a glance</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Jobs Posted',    value: stats.totalJobs,          color: '#818cf8' },
          { label: 'Total Applicants', value: stats.totalApplications, color: '#60a5fa' },
          { label: 'Shortlisted',    value: stats.shortlisted,         color: '#34d399' },
          { label: 'Rejected',       value: stats.rejected,            color: '#f87171' },
          { label: 'Avg Match Score', value: `${stats.avgMatchScore}%`, color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.2rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>

        {/* Status breakdown */}
        <div style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem 1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.88rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pipeline Breakdown</h3>
          {Object.entries(statusMeta).map(([key, meta]) => {
            const count = stats[key] || 0;
            const pct   = stats.totalApplications > 0 ? Math.round((count / stats.totalApplications) * 100) : 0;
            return (
              <div key={key} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.82rem', color: meta.color }}>{meta.label}</span>
                  <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{count} ({pct}%)</span>
                </div>
                <div style={{ height: 5, background: '#1f2937', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: '999px' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Top jobs by applications */}
        <div style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem 1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.88rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Most Applied Jobs</h3>
          {stats.topJobs.length === 0 ? (
            <p style={{ color: '#4b5563', fontSize: '0.84rem' }}>No applications yet.</p>
          ) : (
            stats.topJobs.map((j, i) => (
              <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #0f172a', alignItems: 'center' }}>
                <div>
                  <span style={{ color: '#4b5563', fontSize: '0.78rem', marginRight: '0.4rem' }}>#{i + 1}</span>
                  <Link to={`/recruiter/jobs/${j.id}/candidates`} style={{ fontSize: '0.84rem', color: '#e5e7eb' }}>{j.title}</Link>
                  <div style={{ fontSize: '0.74rem', color: '#4b5563', marginLeft: '1.2rem' }}>{j.company}</div>
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#60a5fa' }}>{j.count}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link to="/recruiter/jobs" className="btn btn-secondary">💼 My Jobs</Link>
        <Link to="/jobs/new" className="btn btn-primary">+ Post New Job</Link>
      </div>
    </div>
  );
}
