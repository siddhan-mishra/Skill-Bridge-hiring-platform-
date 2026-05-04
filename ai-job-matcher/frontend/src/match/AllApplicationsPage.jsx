// AllApplicationsPage.jsx — Recruiter: all applications across all jobs
// Step 3: restored shortlisted/rejected status display, match score,
// inline status change actions, filter by status and job
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

const STATUS_COLORS = {
  pending:     { color: '#fbbf24', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)'   },
  shortlisted: { color: '#34d399', bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.25)'   },
  rejected:    { color: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)'    },
  hired:       { color: '#818cf8', bg: 'rgba(99,102,241,0.1)',   border: 'rgba(99,102,241,0.25)'   },
  withdrawn:   { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.25)'  },
};

const STATUS_OPTS = ['all', 'pending', 'shortlisted', 'rejected', 'hired'];

export default function AllApplicationsPage() {
  const { user, API_BASE } = useAuth();
  const token = localStorage.getItem('token');

  const [apps,    setApps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobFilter,    setJobFilter]    = useState('all');
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    if (user?.role !== 'recruiter') { setLoading(false); return; }
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/applications/recruiter/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setApps(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    })();
  }, [API_BASE, user, token]);

  // Unique job titles for filter dropdown
  const jobTitles = useMemo(() => {
    const titles = new Map();
    apps.forEach(a => {
      if (a.job?._id) titles.set(a.job._id, a.job.title || 'Untitled');
    });
    return [['all', 'All Jobs'], ...titles.entries()];
  }, [apps]);

  const filtered = useMemo(() => {
    let list = [...apps];
    if (statusFilter !== 'all') list = list.filter(a => a.status === statusFilter);
    if (jobFilter   !== 'all') list = list.filter(a => a.job?._id === jobFilter);
    return list;
  }, [apps, statusFilter, jobFilter]);

  const updateStatus = async (appId, newStatus) => {
    setUpdating(u => ({ ...u, [appId]: true }));
    try {
      const res = await axios.put(`${API_BASE}/api/applications/${appId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setApps(prev => prev.map(a => a._id === appId ? { ...a, status: res.data.status } : a));
    } catch (err) {
      alert('Update failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdating(u => ({ ...u, [appId]: false }));
    }
  };

  const scoreColor = (s) => s >= 75 ? '#34d399' : s >= 50 ? '#fbbf24' : s >= 25 ? '#f97316' : '#f87171';

  const inp = { background: '#0f172a', color: '#e5e7eb', border: '1px solid #1f2937', borderRadius: 7, padding: '0.4rem 0.65rem', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' };

  if (!user || user.role !== 'recruiter')
    return <div className="card"><p style={{ color: '#f87171' }}>Only recruiters can view this page.</p></div>;
  if (loading) return <div className="card"><p style={{ color: '#9ca3af' }}>⏳ Loading applications…</p></div>;
  if (error)   return <div className="card"><p style={{ color: '#f87171' }}>{error}</p></div>;

  return (
    <div style={{ maxWidth: 900, width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ color: '#e5e7eb', margin: 0 }}>📥 All Applications</h2>
        <p style={{ color: '#4b5563', fontSize: '0.83rem', marginTop: '0.2rem' }}>{apps.length} total · {filtered.length} showing</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
        <select style={inp} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select style={{ ...inp, maxWidth: 220 }} value={jobFilter} onChange={e => setJobFilter(e.target.value)}>
          {jobTitles.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select>
        {/* Status counts */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
          {['pending','shortlisted','rejected','hired'].map(s => {
            const count = apps.filter(a => a.status === s).length;
            if (!count) return null;
            const c = STATUS_COLORS[s];
            return <span key={s} style={{ padding: '0.18rem 0.65rem', background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 999, fontSize: '0.75rem' }}>{s}: {count}</span>;
          })}
        </div>
      </div>

      {/* Application rows */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📨</div>
          <p style={{ color: '#6b7280' }}>No applications match your filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {filtered.map(app => {
            const sc = STATUS_COLORS[app.status] || STATUS_COLORS.pending;
            const score = app.matchScore ?? app.score ?? null;
            return (
              <div key={app._id} style={{ background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: 10, padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>

                  {/* Candidate info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: '#e5e7eb' }}>
                        {app.applicant?.name || 'Unknown Candidate'}
                      </span>
                      {score !== null && (
                        <span style={{ fontWeight: 800, color: scoreColor(score), fontSize: '0.85rem' }}>
                          {score}% match
                        </span>
                      )}
                      <span style={{ padding: '0.15rem 0.55rem', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>
                        {app.status}
                      </span>
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                      {app.applicant?.email}
                    </div>
                    <div style={{ color: '#4b5563', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      Applied to: <Link to={`/jobs/${app.job?._id}`} style={{ color: '#818cf8' }}>{app.job?.title || 'Unknown Job'}</Link>
                      <span style={{ marginLeft: '0.5rem' }}>· {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Status actions */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
                    {app.applicant?._id && (
                      <Link to={`/profile/${app.applicant._id}`}
                        style={{ padding: '0.28rem 0.75rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, fontSize: '0.78rem' }}>
                        View Profile
                      </Link>
                    )}
                    {app.status !== 'shortlisted' && (
                      <button onClick={() => updateStatus(app._id, 'shortlisted')} disabled={updating[app._id]}
                        style={{ padding: '0.28rem 0.75rem', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer' }}>
                        ✓ Shortlist
                      </button>
                    )}
                    {app.status !== 'hired' && app.status === 'shortlisted' && (
                      <button onClick={() => updateStatus(app._id, 'hired')} disabled={updating[app._id]}
                        style={{ padding: '0.28rem 0.75rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer' }}>
                        🏆 Hire
                      </button>
                    )}
                    {app.status !== 'rejected' && app.status !== 'hired' && (
                      <button onClick={() => updateStatus(app._id, 'rejected')} disabled={updating[app._id]}
                        style={{ padding: '0.28rem 0.75rem', background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer' }}>
                        × Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
