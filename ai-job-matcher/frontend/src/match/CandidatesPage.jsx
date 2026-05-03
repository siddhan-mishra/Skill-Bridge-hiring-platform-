import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

const STATUS_OPTS = ['pending', 'reviewed', 'shortlisted', 'rejected'];

const statusStyle = (s) => {
  const map = {
    pending:     { bg: 'rgba(99,102,241,0.12)',  color: '#818cf8' },
    reviewed:    { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24' },
    shortlisted: { bg: 'rgba(16,185,129,0.12)',  color: '#34d399' },
    rejected:    { bg: 'rgba(248,113,113,0.10)', color: '#f87171' },
  };
  const c = map[s] || map.pending;
  return { padding: '0.2rem 0.7rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: c.bg, color: c.color };
};

export default function CandidatesPage() {
  const { jobId } = useParams();
  const { API_BASE } = useAuth();
  const token = localStorage.getItem('token');

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [updating, setUpdating] = useState(null);  // appId being updated
  const [tab,     setTab]     = useState('applications'); // 'applications' | 'matched'
  const [matched, setMatched] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [appsRes, matchRes] = await Promise.all([
          axios.get(`${API_BASE}/api/applications/job/${jobId}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE}/api/match/job/${jobId}/candidates`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setData(appsRes.data);
        setMatched(matchRes.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [API_BASE, jobId, token]);

  const updateStatus = async (appId, status, recruiterNote) => {
    setUpdating(appId);
    try {
      await axios.patch(
        `${API_BASE}/api/applications/${appId}/status`,
        { status, recruiterNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(prev => ({
        ...prev,
        applications: prev.applications.map(a =>
          a._id === appId ? { ...a, status, recruiterNote } : a
        ),
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="card"><p>Loading candidates…</p></div>;
  if (error)   return <div className="card"><p style={{color:'#f87171'}}>{error}</p><Link to="/recruiter/jobs">← Back</Link></div>;

  const { job, applications } = data;

  const tagStyle = {
    display: 'inline-block', padding: '0.15rem 0.55rem',
    background: 'rgba(99,102,241,0.1)', color: '#818cf8',
    border: '1px solid rgba(99,102,241,0.2)', borderRadius: '999px',
    fontSize: '0.72rem', marginRight: '0.3rem', marginBottom: '0.3rem',
  };

  return (
    <div className="card" style={{ maxWidth: 900 }}>
      <Link to="/recruiter/jobs" style={{ color: '#6b7280', fontSize: '0.88rem' }}>← My Jobs</Link>
      <h2 style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}>{job.title}</h2>
      <p style={{ color: '#9ca3af', marginBottom: '1.25rem' }}>{job.company}</p>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1f2937', marginBottom: '1.25rem' }}>
        {[['applications', `📥 Applications (${applications.length})`], ['matched', `🤝 All Matched (${matched?.candidates?.length || 0})`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: '0.5rem 1.1rem', background: 'none', border: 'none', borderBottom: tab === id ? '2px solid #6366f1' : '2px solid transparent', color: tab === id ? '#818cf8' : '#4b5563', cursor: 'pointer', fontSize: '0.85rem', fontWeight: tab === id ? 600 : 400 }}>{label}</button>
        ))}
      </div>

      {/* ── Applications Tab ── */}
      {tab === 'applications' && (
        applications.length === 0
          ? <p style={{ color: '#4b5563' }}>No applications yet.</p>
          : applications.map(app => (
            <div key={app._id} style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#e5e7eb' }}>{app.seeker.name}</div>
                  <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>{app.seeker.email}</div>
                  {app.profile?.headline && <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginTop: '0.15rem' }}>{app.profile.headline}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.82rem', color: '#6366f1', fontWeight: 700 }}>{app.matchScore}% match</span>
                  <span style={statusStyle(app.status)}>{app.status}</span>
                </div>
              </div>

              {app.profile?.skills?.length > 0 && (
                <div style={{ marginTop: '0.6rem' }}>
                  {app.profile.skills.slice(0, 8).map((s, i) => <span key={i} style={tagStyle}>{s}</span>)}
                </div>
              )}

              {app.coverNote && (
                <div style={{ marginTop: '0.65rem', padding: '0.6rem 0.85rem', background: '#0f172a', borderRadius: '6px', fontSize: '0.83rem', color: '#9ca3af', borderLeft: '3px solid #374151' }}>
                  <em>"{app.coverNote}"</em>
                </div>
              )}

              {/* Status controls */}
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                {STATUS_OPTS.map(s => (
                  <button key={s} disabled={app.status === s || updating === app._id}
                    onClick={() => updateStatus(app._id, s, app.recruiterNote)}
                    style={{ padding: '0.25rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', border: '1px solid', fontWeight: app.status === s ? 700 : 400, ...statusStyle(s), opacity: app.status === s ? 1 : 0.55, transition: 'opacity 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = app.status === s ? '1' : '0.55'}
                  >
                    {s === app.status ? '✓ ' : ''}{s}
                  </button>
                ))}
              </div>
            </div>
          ))
      )}

      {/* ── All Matched Tab ── */}
      {tab === 'matched' && (
        !matched?.candidates?.length
          ? <p style={{ color: '#4b5563' }}>No candidates found.</p>
          : matched.candidates.map((c, idx) => (
            <div key={c.userId} style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ color: '#4b5563', fontSize: '0.8rem', minWidth: 22 }}>#{idx + 1}</span>
                  <span style={{ fontWeight: 600, color: '#e5e7eb' }}>{c.name}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#6b7280', marginLeft: 30 }}>{c.headline}</div>
                <div style={{ marginTop: '0.45rem', marginLeft: 30 }}>
                  {c.matchedSkills.map((s, i) => <span key={i} style={{ ...tagStyle, color: '#34d399', borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.08)' }}>{s}</span>)}
                  {c.missingSkills.map((s, i) => <span key={i} style={{ ...tagStyle, color: '#f87171', borderColor: 'rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.06)' }}>{s}</span>)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: c.score >= 70 ? '#34d399' : c.score >= 40 ? '#fbbf24' : '#f87171' }}>{c.score}%</div>
                <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>match score</div>
              </div>
            </div>
          ))
      )}
    </div>
  );
}
