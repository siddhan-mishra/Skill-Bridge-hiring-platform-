// AllApplicationsPage.jsx — recruiter sees ALL applications across all jobs, filterable by status
import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

const STATUS_OPTS = ['all', 'pending', 'reviewed', 'shortlisted', 'rejected'];

const statusStyle = (s) => {
  const map = {
    pending:     { bg: 'rgba(99,102,241,0.12)',  color: '#818cf8' },
    reviewed:    { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24' },
    shortlisted: { bg: 'rgba(16,185,129,0.12)',  color: '#34d399' },
    rejected:    { bg: 'rgba(248,113,113,0.10)', color: '#f87171' },
  };
  const c = map[s] || map.pending;
  return { padding: '0.2rem 0.7rem', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.color}33` };
};

export default function AllApplicationsPage() {
  const { user, API_BASE } = useAuth();
  const token = localStorage.getItem('token');
  const [searchParams, setSearchParams] = useSearchParams();

  const [jobs,    setJobs]    = useState([]);
  const [apps,    setApps]    = useState([]);   // flat list: { ...app, jobTitle, jobCompany, jobId }
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const filterParam = searchParams.get('filter') || 'all';
  const [filter, setFilter] = useState(filterParam);

  useEffect(() => { setFilter(searchParams.get('filter') || 'all'); }, [searchParams]);

  useEffect(() => {
    if (user?.role !== 'recruiter') { setLoading(false); return; }
    (async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        // Fetch recruiter's jobs, then all applications for each job in parallel
        const jobsRes = await axios.get(`${API_BASE}/api/jobs/my`, { headers });
        const myJobs  = jobsRes.data;
        setJobs(myJobs);

        const appsPerJob = await Promise.all(
          myJobs.map(j =>
            axios.get(`${API_BASE}/api/applications/job/${j._id}`, { headers })
              .then(r => (r.data.applications || []).map(a => ({ ...a, jobTitle: j.title, jobCompany: j.company, jobId: j._id })))
              .catch(() => [])
          )
        );
        setApps(appsPerJob.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [API_BASE, user, token]);

  const updateStatus = async (appId, status, jobId) => {
    setUpdating(appId);
    try {
      await axios.patch(
        `${API_BASE}/api/applications/${appId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setApps(prev => prev.map(a => a._id === appId ? { ...a, status } : a));
    } catch (err) { alert(err.response?.data?.message || 'Update failed'); }
    finally { setUpdating(null); }
  };

  const displayed = useMemo(() =>
    filter === 'all' ? apps : apps.filter(a => a.status === filter),
    [apps, filter]
  );

  if (!user || user.role !== 'recruiter') return <div className="card"><p>Recruiters only.</p></div>;
  if (loading) return <div className="card"><p>Loading…</p></div>;

  return (
    <div style={{ maxWidth: 920, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.2rem' }}>All Applications</h2>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.85rem' }}>{displayed.length} application{displayed.length !== 1 ? 's' : ''} shown</p>
        </div>
        <Link to="/recruiter/dashboard" style={{ color: '#6b7280', fontSize: '0.85rem' }}>← Dashboard</Link>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {STATUS_OPTS.map(s => (
          <button key={s}
            onClick={() => { setFilter(s); setSearchParams(s === 'all' ? {} : { filter: s }); }}
            style={{ padding: '0.3rem 0.9rem', borderRadius: '999px', fontSize: '0.8rem', cursor: 'pointer', border: '1px solid', fontWeight: filter === s ? 700 : 400, ...( s === 'all' ? { background: filter === s ? '#6366f1' : 'transparent', color: filter === s ? 'white' : '#4b5563', borderColor: filter === s ? '#6366f1' : '#1f2937' } : { ...statusStyle(s), opacity: filter === s ? 1 : 0.55 }) }}
          >
            {s === 'all' ? '📋 All' : s} {s !== 'all' ? `(${apps.filter(a => a.status === s).length})` : `(${apps.length})`}
          </button>
        ))}
      </div>

      {displayed.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <p style={{ color: '#4b5563' }}>No applications {filter !== 'all' ? `with status "${filter}"` : ''} yet.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {displayed.map(app => (
          <div key={app._id} style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <Link to={`/profile/${app.seeker._id}`} style={{ fontWeight: 700, color: '#e5e7eb', fontSize: '0.95rem' }}>{app.seeker.name}</Link>
                  <span style={statusStyle(app.status)}>{app.status}</span>
                  <span style={{ fontSize: '0.76rem', color: '#6366f1' }}>{app.matchScore}% match</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.15rem' }}>
                  Applied to: <Link to={`/recruiter/jobs/${app.jobId}/candidates`} style={{ color: '#9ca3af' }}>{app.jobTitle}</Link>
                  {app.jobCompany && <span> · {app.jobCompany}</span>}
                </div>
              </div>
              <Link to={`/profile/${app.seeker._id}`} style={{ fontSize: '0.78rem', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', padding: '0.2rem 0.65rem', borderRadius: '6px', flexShrink: 0 }}>
                👤 View Profile
              </Link>
            </div>

            {app.profile?.skills?.length > 0 && (
              <div style={{ marginBottom: '0.5rem' }}>
                {app.profile.skills.slice(0, 8).map((s, i) => (
                  <span key={i} style={{ display: 'inline-block', padding: '0.15rem 0.5rem', background: 'rgba(99,102,241,0.08)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '999px', fontSize: '0.72rem', marginRight: '0.3rem', marginBottom: '0.25rem' }}>{s}</span>
                ))}
              </div>
            )}

            {/* Quick status change */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {['reviewed', 'shortlisted', 'rejected'].map(s => (
                <button key={s}
                  disabled={app.status === s || updating === app._id}
                  onClick={() => updateStatus(app._id, s, app.jobId)}
                  style={{ padding: '0.22rem 0.75rem', borderRadius: '6px', fontSize: '0.76rem', cursor: app.status === s ? 'default' : 'pointer', fontWeight: app.status === s ? 700 : 400, border: '1px solid', opacity: app.status === s ? 1 : 0.5, ...statusStyle(s), transition: 'opacity 0.15s' }}
                  onMouseEnter={e => { if (app.status !== s) e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={e => { if (app.status !== s) e.currentTarget.style.opacity = '0.5'; }}
                >
                  {app.status === s ? '✓ ' : ''}{s}{s === 'shortlisted' ? ' 📧' : ''}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
