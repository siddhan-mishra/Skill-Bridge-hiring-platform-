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
  return { padding: '0.2rem 0.7rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.color}33` };
};

export default function CandidatesPage() {
  const { jobId } = useParams();
  const { API_BASE } = useAuth();
  const token = localStorage.getItem('token');

  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [updating, setUpdating] = useState(null);
  const [tab,      setTab]      = useState('applications');
  const [matched,  setMatched]  = useState(null);
  const [noteEdit, setNoteEdit] = useState({});   // appId -> draft note string

  useEffect(() => {
    (async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [appsRes, matchRes] = await Promise.all([
          axios.get(`${API_BASE}/api/applications/job/${jobId}`, { headers }),
          axios.get(`${API_BASE}/api/match/job/${jobId}/candidates`, { headers }),
        ]);
        setData(appsRes.data);
        setMatched(matchRes.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load');
      } finally { setLoading(false); }
    })();
  }, [API_BASE, jobId, token]);

  const updateStatus = async (appId, status) => {
    setUpdating(appId);
    const note = noteEdit[appId] ?? data.applications.find(a => a._id === appId)?.recruiterNote ?? '';
    try {
      await axios.patch(
        `${API_BASE}/api/applications/${appId}/status`,
        { status, recruiterNote: note },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(prev => ({
        ...prev,
        applications: prev.applications.map(a =>
          a._id === appId ? { ...a, status, recruiterNote: note } : a
        ),
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    } finally { setUpdating(null); }
  };

  if (loading) return <div className="card"><p>Loading candidates…</p></div>;
  if (error)   return <div className="card"><p style={{ color: '#f87171' }}>{error}</p><Link to="/recruiter/jobs">← Back</Link></div>;

  const { job, applications } = data;

  const tagStyle = {
    display: 'inline-block', padding: '0.15rem 0.55rem',
    background: 'rgba(99,102,241,0.1)', color: '#818cf8',
    border: '1px solid rgba(99,102,241,0.2)', borderRadius: '999px',
    fontSize: '0.72rem', marginRight: '0.3rem', marginBottom: '0.3rem',
  };

  return (
    <div style={{ maxWidth: 920, width: '100%' }}>
      <Link to="/recruiter/jobs" style={{ color: '#6b7280', fontSize: '0.85rem' }}>← My Jobs</Link>

      <div style={{ margin: '0.85rem 0 1.25rem' }}>
        <h2 style={{ margin: '0 0 0.2rem' }}>{job.title}</h2>
        <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.88rem' }}>{job.company}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1f2937', marginBottom: '1.25rem', gap: '0.25rem' }}>
        {[
          ['applications', `📥 Applications (${applications.length})`],
          ['matched',      `🤝 All Matched (${matched?.candidates?.length || 0})`],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '0.5rem 1.1rem', background: 'none', border: 'none', borderBottom: tab === id ? '2px solid #6366f1' : '2px solid transparent', color: tab === id ? '#818cf8' : '#4b5563', cursor: 'pointer', fontSize: '0.85rem', fontWeight: tab === id ? 600 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Applications Tab ── */}
      {tab === 'applications' && (
        applications.length === 0
          ? <p style={{ color: '#4b5563' }}>No applications yet.</p>
          : applications.map(app => (
            <div key={app._id} style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '10px', padding: '1.1rem 1.3rem', marginBottom: '0.85rem' }}>

              {/* Top row: name + match + status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {/* ─── VIEW PROFILE LINK ─── */}
                    <Link
                      to={`/profile/${app.seeker._id}`}
                      style={{ fontWeight: 700, fontSize: '1rem', color: '#e5e7eb', textDecoration: 'none', borderBottom: '1px solid #374151' }}
                    >
                      {app.seeker.name}
                    </Link>
                    <span style={{ fontSize: '0.76rem', color: '#818cf8', background: 'rgba(99,102,241,0.1)', padding: '0.1rem 0.5rem', borderRadius: '999px', border: '1px solid rgba(99,102,241,0.2)' }}>
                      {app.matchScore}% match
                    </span>
                    <span style={statusStyle(app.status)}>{app.status}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: '0.15rem' }}>
                    {app.seeker.email}
                    {app.profile?.location && <span> · 📍 {app.profile.location}</span>}
                  </div>
                  {app.profile?.headline && (
                    <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginTop: '0.1rem', fontStyle: 'italic' }}>{app.profile.headline}</div>
                  )}
                </div>

                {/* Avatar */}
                {app.profile?.avatarUrl && (
                  <img src={app.profile.avatarUrl} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #1f2937', flexShrink: 0 }} />
                )}
              </div>

              {/* Skills */}
              {app.profile?.skills?.length > 0 && (
                <div style={{ marginBottom: '0.6rem' }}>
                  {app.profile.skills.slice(0, 10).map((s, i) => <span key={i} style={tagStyle}>{s}</span>)}
                  {app.profile.skills.length > 10 && <span style={{ color: '#4b5563', fontSize: '0.72rem' }}>+{app.profile.skills.length - 10}</span>}
                </div>
              )}

              {/* Cover note */}
              {app.coverNote && (
                <div style={{ marginBottom: '0.75rem', padding: '0.65rem 0.9rem', background: '#0f172a', borderRadius: '6px', fontSize: '0.83rem', color: '#9ca3af', borderLeft: '3px solid #374151' }}>
                  <em>"{app.coverNote}"</em>
                </div>
              )}

              {/* Recruiter note input */}
              <div style={{ marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Add a private note (sent with status update)…"
                  value={noteEdit[app._id] ?? app.recruiterNote ?? ''}
                  onChange={e => setNoteEdit(prev => ({ ...prev, [app._id]: e.target.value }))}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #1f2937', borderRadius: '6px', padding: '0.45rem 0.75rem', color: '#e5e7eb', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Status buttons */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {STATUS_OPTS.map(s => (
                  <button key={s}
                    disabled={app.status === s || updating === app._id}
                    onClick={() => updateStatus(app._id, s)}
                    style={{ padding: '0.25rem 0.85rem', borderRadius: '6px', fontSize: '0.78rem', cursor: app.status === s ? 'default' : 'pointer', fontWeight: app.status === s ? 700 : 400, border: '1px solid', opacity: app.status === s ? 1 : 0.5, transition: 'opacity 0.15s', ...statusStyle(s) }}
                    onMouseEnter={e => { if (app.status !== s) e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={e => { if (app.status !== s) e.currentTarget.style.opacity = '0.5'; }}
                  >
                    {app.status === s ? '✓ ' : ''}{s}
                    {s === 'shortlisted' && app.status !== s ? ' 📧' : ''}
                  </button>
                ))}

                {/* View full profile button */}
                <Link
                  to={`/profile/${app.seeker._id}`}
                  style={{ marginLeft: 'auto', padding: '0.25rem 0.85rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  👤 View Full Profile
                </Link>
              </div>

              {/* Shortlist notice */}
              {app.status !== 'shortlisted' && (
                <p style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '0.55rem', margin: '0.55rem 0 0' }}>
                  💡 Shortlisting will send your contact email to the candidate automatically.
                </p>
              )}
              {app.status === 'shortlisted' && (
                <p style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '0.55rem', margin: '0.55rem 0 0' }}>
                  ✅ Your contact email was shared with this candidate when shortlisted.
                </p>
              )}

            </div>
          ))
      )}

      {/* ── All Matched Tab ── */}
      {tab === 'matched' && (
        !matched?.candidates?.length
          ? <p style={{ color: '#4b5563' }}>No matched candidates found.</p>
          : matched.candidates.map((c, idx) => (
            <div key={c.userId} style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ color: '#4b5563', fontSize: '0.78rem' }}>#{idx + 1}</span>
                    {/* ─── VIEW PROFILE IN MATCHED TAB TOO ─── */}
                    <Link to={`/profile/${c.userId}`} style={{ fontWeight: 600, color: '#e5e7eb', fontSize: '0.95rem' }}>
                      {c.name}
                    </Link>
                  </div>
                  {c.headline && <div style={{ fontSize: '0.82rem', color: '#6b7280', marginLeft: 30, marginTop: '0.1rem' }}>{c.headline}</div>}
                  <div style={{ marginTop: '0.45rem', marginLeft: 30 }}>
                    {c.matchedSkills?.map((s, i) => <span key={i} style={{ ...tagStyle, color: '#34d399', borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.08)' }}>{s}</span>)}
                    {c.missingSkills?.map((s, i) => <span key={i} style={{ ...tagStyle, color: '#f87171', borderColor: 'rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.06)' }}>{s}</span>)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: c.score >= 70 ? '#34d399' : c.score >= 40 ? '#fbbf24' : '#f87171' }}>{c.score}%</div>
                  <div style={{ fontSize: '0.72rem', color: '#4b5563', marginBottom: '0.4rem' }}>match</div>
                  <Link to={`/profile/${c.userId}`} style={{ fontSize: '0.75rem', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>View Profile</Link>
                </div>
              </div>
            </div>
          ))
      )}
    </div>
  );
}
