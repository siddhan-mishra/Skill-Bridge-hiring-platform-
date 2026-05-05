import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyApplications } from '../api/jobApi';

const statusMeta = {
  pending:     { emoji: '📋', label: 'Pending',       color: '#818cf8', bg: 'rgba(99,102,241,0.1)'   },
  reviewed:    { emoji: '👀', label: 'Under Review',  color: '#fbbf24', bg: 'rgba(245,158,11,0.1)'   },
  shortlisted: { emoji: '🎉', label: 'Shortlisted',   color: '#34d399', bg: 'rgba(16,185,129,0.1)'   },
  rejected:    { emoji: '😔', label: 'Not Selected',  color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  hired:       { emoji: '🏆', label: 'Hired!',        color: '#a78bfa', bg: 'rgba(167,139,250,0.1)'  },
  withdrawn:   { emoji: '↩️', label: 'Withdrawn',     color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};

export default function ApplicationsPage() {
  const [apps,    setApps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyApplications();
        setApps(res.data);
      } catch (e) {
        console.error('ApplicationsPage error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter);

  if (loading) return <div className="card"><p style={{ color: '#9ca3af' }}>⏳ Loading applications…</p></div>;

  const inp = {
    background: '#0f172a', color: '#e5e7eb', border: '1px solid #1f2937',
    borderRadius: '7px', padding: '0.4rem 0.7rem', fontSize: '0.85rem',
    outline: 'none', fontFamily: 'inherit',
  };

  return (
    <div style={{ maxWidth: 820, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ margin: 0, color: '#e5e7eb' }}>My Applications</h2>
        <select style={inp} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All ({apps.length})</option>
          {Object.entries(statusMeta).map(([k, v]) => (
            <option key={k} value={k}>{v.emoji} {v.label} ({apps.filter(a => a.status === k).length})</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <p style={{ color: '#6b7280' }}>No applications in this category. <Link to="/jobs" style={{ color: '#6366f1' }}>Browse jobs →</Link></p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {filtered.map(app => {
            const sm = statusMeta[app.status] || statusMeta.pending;
            return (
              <div key={app._id} style={{ background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <Link to={`/jobs/${app.job?._id}`} style={{ fontWeight: 700, color: '#e5e7eb', fontSize: '0.97rem' }}>
                      {app.job?.title || 'Job removed'}
                    </Link>
                    <div style={{ color: '#6b7280', fontSize: '0.84rem', marginTop: '0.15rem' }}>
                      {app.job?.company}{app.job?.location ? ` · ${app.job.location}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                    <span style={{ padding: '0.2rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, background: sm.bg, color: sm.color }}>
                      {sm.emoji} {sm.label}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                      Applied {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                {app.recruiterNote && app.status === 'shortlisted' && (
                  <div style={{ marginTop: '0.6rem', padding: '0.55rem 0.8rem', background: 'rgba(16,185,129,0.05)', borderRadius: '6px', fontSize: '0.82rem', color: '#34d399', borderLeft: '3px solid rgba(16,185,129,0.3)' }}>
                    📝 Recruiter note: {app.recruiterNote}
                  </div>
                )}
                {app.coverNote && (
                  <div style={{ marginTop: '0.6rem', padding: '0.55rem 0.8rem', background: '#0f172a', borderRadius: '6px', fontSize: '0.82rem', color: '#9ca3af', borderLeft: '3px solid #1f2937' }}>
                    {app.coverNote}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
