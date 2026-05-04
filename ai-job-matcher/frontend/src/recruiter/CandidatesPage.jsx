// CandidatesPage.jsx — Recruiter: view all applicants for a specific job
// Step 4: shows SBERT match score ring, matched/missing skills, inline actions
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

const STATUS_STYLE = {
  pending:     { color: '#fbbf24', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)'   },
  reviewed:    { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.25)'   },
  shortlisted: { color: '#34d399', bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.25)'   },
  rejected:    { color: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'     },
  hired:       { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.25)'  },
};

const scoreColor = (s) => s >= 75 ? '#34d399' : s >= 50 ? '#fbbf24' : s >= 25 ? '#f97316' : '#f87171';

function ScoreRing({ score }) {
  const c = scoreColor(score);
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
      <svg viewBox="0 0 36 36" style={{ width: 54, height: 54, transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f2937" strokeWidth="3.2" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={c} strokeWidth="3.2"
          strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
      </svg>
      <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '0.72rem', fontWeight: 800, color: c }}>
        {score}%
      </span>
    </div>
  );
}

export default function CandidatesPage() {
  const { jobId } = useParams();
  const { user, API_BASE } = useAuth();
  const token = localStorage.getItem('token');

  const [data,     setData]     = useState(null);   // { job, applications }
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [filter,   setFilter]   = useState('all');
  const [updating, setUpdating] = useState({});
  const [expanded, setExpanded] = useState({});     // expanded cover notes

  useEffect(() => {
    if (!user || user.role !== 'recruiter') { setLoading(false); return; }
    (async () => {
      try {
        // Try ranked endpoint first (Step 4 SBERT), fall back to applications endpoint
        let res;
        try {
          res = await axios.get(`${API_BASE}/api/match/candidates/${jobId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          // ranked endpoint returns { job, candidates }
          setData({ job: res.data.job, applications: res.data.candidates });
        } catch {
          // fallback to direct applications endpoint
          res = await axios.get(`${API_BASE}/api/applications/job/${jobId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setData(res.data);  // { job, applications }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load candidates');
      } finally {
        setLoading(false);
      }
    })();
  }, [API_BASE, jobId, user, token]);

  const updateStatus = async (appId, newStatus) => {
    setUpdating(u => ({ ...u, [appId]: true }));
    try {
      await axios.put(`${API_BASE}/api/applications/${appId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(d => ({
        ...d,
        applications: d.applications.map(a =>
          a._id === appId ? { ...a, status: newStatus } : a
        ),
      }));
    } catch (err) {
      alert('Update failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdating(u => ({ ...u, [appId]: false }));
    }
  };

  if (!user || user.role !== 'recruiter')
    return <div className="card"><p style={{ color: '#f87171' }}>Recruiters only.</p></div>;
  if (loading) return <div className="card"><p style={{ color: '#9ca3af' }}>⏳ Loading candidates…</p></div>;
  if (error)   return <div className="card"><p style={{ color: '#f87171' }}>{error}</p></div>;
  if (!data)   return <div className="card"><p style={{ color: '#6b7280' }}>No data.</p></div>;

  const { job, applications = [] } = data;
  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter);

  const statusCounts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1; return acc;
  }, {});

  const tag = { display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 999, fontSize: '0.72rem', marginRight: '0.3rem', marginBottom: '0.25rem' };

  return (
    <div style={{ maxWidth: 900, width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link to="/recruiter/jobs" style={{ color: '#4b5563', fontSize: '0.83rem' }}>← My Jobs</Link>
        <h2 style={{ color: '#e5e7eb', margin: '0.25rem 0 0' }}>
          👥 {job?.title || 'Job'} — Candidates
        </h2>
        <p style={{ color: '#4b5563', fontSize: '0.82rem', margin: '0.2rem 0 0' }}>
          {job?.company} · {applications.length} applicant{applications.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {['all', 'pending', 'shortlisted', 'hired', 'rejected'].map(s => {
          const count = s === 'all' ? applications.length : (statusCounts[s] || 0);
          const active = filter === s;
          return (
            <button key={s} onClick={() => setFilter(s)}
              style={{
                padding: '0.3rem 0.85rem', borderRadius: 7, fontSize: '0.82rem', fontWeight: active ? 700 : 400, cursor: 'pointer', border: 'none',
                background: active ? 'rgba(99,102,241,0.2)' : '#0f172a',
                color: active ? '#818cf8' : '#4b5563',
                outline: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid #1f2937',
              }}>
              {s.charAt(0).toUpperCase() + s.slice(1)} {count > 0 ? `(${count})` : ''}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
          <p style={{ color: '#6b7280' }}>No candidates {filter !== 'all' ? `with status "${filter}"` : 'yet'}.</p>
        </div>
      )}

      {/* Candidate cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.map(app => {
          const sc  = STATUS_STYLE[app.status] || STATUS_STYLE.pending;
          const score = app.matchScore ?? 0;
          const isExpanded = expanded[app._id];

          return (
            <div key={app._id} style={{ background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: 10, padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>

                {/* Score ring */}
                <ScoreRing score={score} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#e5e7eb', fontSize: '0.97rem' }}>
                      {app.applicant?.name || app.seeker?.name || 'Unknown'}
                    </span>
                    <span style={{ padding: '0.15rem 0.55rem', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>
                      {app.status}
                    </span>
                    {app.breakdown?.semanticScore != null && (
                      <span style={{ color: '#4b5563', fontSize: '0.75rem' }}>
                        S:{app.breakdown.semanticScore}% · K:{app.breakdown.skillScore}% · X:{app.breakdown.structScore}%
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.82rem', marginTop: '0.15rem' }}>
                    {app.applicant?.email || app.seeker?.email}
                    {app.profile?.location ? ` · ${app.profile.location}` : ''}
                    {app.profile?.headline ? ` — ${app.profile.headline}` : ''}
                  </div>

                  {/* Skills */}
                  {(app.matchedSkills?.length > 0 || app.missingSkills?.length > 0) && (
                    <div style={{ marginTop: '0.5rem' }}>
                      {app.matchedSkills?.slice(0, 6).map((s, i) => (
                        <span key={i} style={{ ...tag, background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>✓ {s}</span>
                      ))}
                      {app.missingSkills?.slice(0, 4).map((s, i) => (
                        <span key={i} style={{ ...tag, background: 'rgba(239,68,68,0.07)', color: '#f87171', border: '1px solid rgba(239,68,68,0.18)' }}>✗ {s}</span>
                      ))}
                    </div>
                  )}

                  {/* Cover note */}
                  {app.coverNote && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <span onClick={() => setExpanded(e => ({ ...e, [app._id]: !e[app._id] }))}
                        style={{ color: '#4b5563', fontSize: '0.78rem', cursor: 'pointer', userSelect: 'none' }}>
                        {isExpanded ? '▲ Hide cover note' : '▼ Show cover note'}
                      </span>
                      {isExpanded && (
                        <p style={{ color: '#9ca3af', fontSize: '0.83rem', marginTop: '0.4rem', background: '#070d1a', padding: '0.6rem 0.8rem', borderRadius: 7, border: '1px solid #1f2937' }}>
                          {app.coverNote}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0, minWidth: 120 }}>
                  {app.applicant?._id && (
                    <Link to={`/profile/${app.applicant._id}`}
                      style={{ padding: '0.28rem 0.75rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, fontSize: '0.78rem', textAlign: 'center', textDecoration: 'none' }}>
                      View Profile
                    </Link>
                  )}
                  {app.status !== 'shortlisted' && app.status !== 'hired' && (
                    <button onClick={() => updateStatus(app._id, 'shortlisted')} disabled={updating[app._id]}
                      style={{ padding: '0.28rem 0.75rem', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer' }}>
                      ✓ Shortlist
                    </button>
                  )}
                  {app.status === 'shortlisted' && (
                    <button onClick={() => updateStatus(app._id, 'hired')} disabled={updating[app._id]}
                      style={{ padding: '0.28rem 0.75rem', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer' }}>
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
    </div>
  );
}
