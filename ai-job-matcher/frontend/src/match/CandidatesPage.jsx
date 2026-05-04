// CandidatesPage.jsx — Step 5: Recruiter AI Candidate Ranking
// Features:
//   - Applications tab: manage status, recruiter notes, cover notes
//   - All Matched tab: AI-ranked candidates with score breakdown bars,
//     rank badges, min-score filter, sort toggle, CSV export
import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAppsForJob, getCandidates, updateAppStatus } from '../api/jobApi';

const STATUS_OPTS = ['pending', 'reviewed', 'shortlisted', 'hired', 'rejected'];

const STATUS_MAP = {
  pending:     { bg: 'rgba(99,102,241,0.12)',  color: '#818cf8' },
  reviewed:    { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24' },
  shortlisted: { bg: 'rgba(16,185,129,0.12)',  color: '#34d399' },
  hired:       { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
  rejected:    { bg: 'rgba(248,113,113,0.10)', color: '#f87171' },
  withdrawn:   { bg: 'rgba(107,114,128,0.1)',  color: '#6b7280' },
};

const statusStyle = (s) => {
  const c = STATUS_MAP[s] || STATUS_MAP.pending;
  return {
    padding: '0.2rem 0.7rem', borderRadius: '999px', fontSize: '0.75rem',
    fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.color}33`,
  };
};

const tagStyle = {
  display: 'inline-block', padding: '0.15rem 0.55rem',
  background: 'rgba(99,102,241,0.1)', color: '#818cf8',
  border: '1px solid rgba(99,102,241,0.2)', borderRadius: '999px',
  fontSize: '0.72rem', marginRight: '0.3rem', marginBottom: '0.3rem',
};

const scoreColor = (s) => s >= 75 ? '#34d399' : s >= 50 ? '#fbbf24' : s >= 30 ? '#f97316' : '#f87171';

const RANK_BADGE = ['🥇', '🥈', '🥉'];

// ── Score Breakdown Bar component ────────────────────────────────────────────
function BreakdownBars({ breakdown }) {
  if (!breakdown || !Object.keys(breakdown).length) return null;
  const LABELS = {
    semantic:    { label: 'Semantic',    color: '#818cf8' },
    skills:      { label: 'Skills',      color: '#34d399' },
    experience:  { label: 'Experience',  color: '#60a5fa' },
    education:   { label: 'Education',   color: '#fbbf24' },
  };
  return (
    <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      {Object.entries(LABELS).map(([key, meta]) => {
        const raw = breakdown[key];
        if (raw == null) return null;
        const pct = Math.round(Math.min(Math.max(raw * 100, 0), 100));
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.68rem', color: '#4b5563', width: 68, flexShrink: 0 }}>{meta.label}</span>
            <div style={{ flex: 1, height: 5, background: '#1f2937', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: meta.color, borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: '0.68rem', color: meta.color, width: 30, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ── CSV export helper ─────────────────────────────────────────────────────────
function exportCSV(candidates, jobTitle) {
  const headers = ['Rank', 'Name', 'Email', 'Headline', 'Location', 'Score', 'Matched Skills', 'Missing Skills'];
  const rows = candidates.map((c, i) => [
    i + 1,
    c.name,
    c.email || '',
    c.headline || '',
    c.location || '',
    c.score,
    (c.matchedSkills || []).join('; '),
    (c.missingSkills || []).join('; '),
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `candidates-${jobTitle.replace(/\s+/g, '-').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CandidatesPage() {
  const { jobId } = useParams();

  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [updating,  setUpdating]  = useState(null);
  const [tab,       setTab]       = useState('applications');
  const [matched,   setMatched]   = useState(null);
  const [noteEdit,  setNoteEdit]  = useState({});
  const [minScore,  setMinScore]  = useState(0);
  const [sortBy,    setSortBy]    = useState('score');   // 'score' | 'name'
  const [expanded,  setExpanded]  = useState({});        // candidateId → bool

  useEffect(() => {
    (async () => {
      try {
        const [appsRes, matchRes] = await Promise.all([
          getAppsForJob(jobId),
          getCandidates(jobId).catch(() => ({ data: { candidates: [] } })),
        ]);
        setData(appsRes.data);
        setMatched(matchRes.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load candidates');
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  const handleStatusUpdate = async (appId, status) => {
    setUpdating(appId);
    const note = noteEdit[appId] ?? data.applications.find(a => a._id === appId)?.recruiterNote ?? '';
    try {
      await updateAppStatus(appId, { status, recruiterNote: note });
      setData(prev => ({
        ...prev,
        applications: prev.applications.map(a =>
          a._id === appId ? { ...a, status, recruiterNote: note } : a
        ),
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Status update failed');
    } finally {
      setUpdating(null);
    }
  };

  // ── Filtered + sorted candidates for the Matched tab ──────────────────────
  const filteredCandidates = useMemo(() => {
    if (!matched?.candidates) return [];
    let list = matched.candidates.filter(c => (c.score || 0) >= minScore);
    if (sortBy === 'name') list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else list = [...list].sort((a, b) => (b.score || 0) - (a.score || 0));
    return list;
  }, [matched, minScore, sortBy]);

  if (loading) return <div className="card"><p style={{ color: '#9ca3af' }}>⏳ Loading candidates…</p></div>;
  if (error)   return <div className="card"><p style={{ color: '#f87171' }}>{error}</p><Link to="/recruiter/jobs">← Back</Link></div>;

  const { job, applications } = data;

  return (
    <div style={{ maxWidth: 960, width: '100%' }}>
      <Link to="/recruiter/jobs" style={{ color: '#6b7280', fontSize: '0.85rem' }}>← My Jobs</Link>

      <div style={{ margin: '0.85rem 0 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.2rem', color: '#e5e7eb' }}>{job.title}</h2>
          <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.88rem' }}>{job.company}</p>
        </div>
        {/* Required skills chips */}
        {job.requiredSkills?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {job.requiredSkills.slice(0, 8).map((sk, i) => (
              <span key={i} style={tagStyle}>{sk}</span>
            ))}
            {job.requiredSkills.length > 8 && <span style={{ ...tagStyle, color: '#4b5563' }}>+{job.requiredSkills.length - 8}</span>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1f2937', marginBottom: '1.25rem', gap: '0.25rem' }}>
        {[
          ['applications', `📥 Applications (${applications.length})`],
          ['matched',      `🤖 AI Ranked (${matched?.candidates?.length || 0})`],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              padding: '0.5rem 1.1rem', background: 'none', border: 'none',
              borderBottom: tab === id ? '2px solid #6366f1' : '2px solid transparent',
              color: tab === id ? '#818cf8' : '#4b5563',
              cursor: 'pointer', fontSize: '0.85rem', fontWeight: tab === id ? 600 : 400,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Applications Tab ────────────────────────────────────────────────── */}
      {tab === 'applications' && (
        applications.length === 0
          ? <p style={{ color: '#4b5563' }}>No applications yet.</p>
          : applications.map(app => (
            <div key={app._id} style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '10px', padding: '1.1rem 1.3rem', marginBottom: '0.85rem' }}>

              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
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

              {/* Recruiter note */}
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
                    onClick={() => handleStatusUpdate(app._id, s)}
                    style={{
                      padding: '0.25rem 0.85rem', borderRadius: '6px', fontSize: '0.78rem',
                      cursor: app.status === s ? 'default' : 'pointer',
                      fontWeight: app.status === s ? 700 : 400,
                      border: '1px solid', opacity: app.status === s ? 1 : 0.55,
                      transition: 'opacity 0.15s', ...statusStyle(s),
                    }}
                    onMouseEnter={e => { if (app.status !== s) e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={e => { if (app.status !== s) e.currentTarget.style.opacity = '0.55'; }}
                  >
                    {app.status === s ? '✓ ' : ''}{s}
                    {s === 'shortlisted' && app.status !== s ? ' 📧' : ''}
                    {s === 'hired'       && app.status !== s ? ' 🏆' : ''}
                  </button>
                ))}
                <Link
                  to={`/profile/${app.seeker._id}`}
                  style={{ marginLeft: 'auto', padding: '0.25rem 0.85rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  👤 View Profile
                </Link>
              </div>

              {app.status === 'hired' && (
                <p style={{ fontSize: '0.72rem', color: '#a78bfa', margin: '0.55rem 0 0' }}>🏆 Candidate marked as hired.</p>
              )}
              {app.status === 'shortlisted' && (
                <p style={{ fontSize: '0.72rem', color: '#34d399', margin: '0.55rem 0 0' }}>✅ Your contact email was shared with this candidate when shortlisted.</p>
              )}
              {!['shortlisted', 'hired'].includes(app.status) && (
                <p style={{ fontSize: '0.72rem', color: '#4b5563', margin: '0.55rem 0 0' }}>💡 Shortlisting sends your contact email to the candidate automatically.</p>
              )}
            </div>
          ))
      )}

      {/* ── AI Ranked Tab ───────────────────────────────────────────────────── */}
      {tab === 'matched' && (
        <>
          {/* Controls bar */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.1rem', padding: '0.75rem 1rem', background: '#070d1a', border: '1px solid #1f2937', borderRadius: 10 }}>

            {/* Min score slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 220 }}>
              <label style={{ color: '#6b7280', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Min Score: <strong style={{ color: '#818cf8' }}>{minScore}%</strong></label>
              <input
                type="range" min={0} max={90} step={5}
                value={minScore}
                onChange={e => setMinScore(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#6366f1' }}
              />
            </div>

            {/* Sort toggle */}
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {[['score', '🎯 Score'], ['name', '🔤 Name']].map(([val, label]) => (
                <button key={val} onClick={() => setSortBy(val)}
                  style={{
                    padding: '0.3rem 0.8rem', borderRadius: 6, fontSize: '0.78rem',
                    cursor: 'pointer', border: '1px solid',
                    background: sortBy === val ? 'rgba(99,102,241,0.2)' : 'transparent',
                    color: sortBy === val ? '#818cf8' : '#4b5563',
                    borderColor: sortBy === val ? 'rgba(99,102,241,0.4)' : '#1f2937',
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* CSV export */}
            {filteredCandidates.length > 0 && (
              <button
                onClick={() => exportCSV(filteredCandidates, job.title)}
                style={{ padding: '0.3rem 0.9rem', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#818cf8', whiteSpace: 'nowrap' }}
              >
                ⬇ Export CSV
              </button>
            )}

            <span style={{ color: '#374151', fontSize: '0.75rem', marginLeft: 'auto' }}>
              {filteredCandidates.length} of {matched?.candidates?.length || 0} candidates
            </span>
          </div>

          {/* Candidate cards */}
          {filteredCandidates.length === 0 ? (
            <p style={{ color: '#4b5563', textAlign: 'center', padding: '2rem 0' }}>No candidates above {minScore}% match threshold.</p>
          ) : (
            filteredCandidates.map((c, idx) => {
              const isOpen = !!expanded[c.userId];
              const rankBadge = idx < 3 ? RANK_BADGE[idx] : null;
              const sc = c.score || 0;
              return (
                <div key={c.userId || idx}
                  style={{
                    background: '#070d1a',
                    border: `1px solid ${idx === 0 ? 'rgba(52,211,153,0.25)' : '#1f2937'}`,
                    borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '0.75rem',
                    boxShadow: idx === 0 ? '0 0 0 1px rgba(52,211,153,0.1)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>

                    {/* Left: name, rank, headline */}
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {rankBadge && <span style={{ fontSize: '1.1rem' }}>{rankBadge}</span>}
                        <span style={{ color: '#4b5563', fontSize: '0.75rem' }}>#{idx + 1}</span>
                        <Link to={`/profile/${c.userId}`} style={{ fontWeight: 700, color: '#e5e7eb', fontSize: '0.98rem', textDecoration: 'none', borderBottom: '1px solid #374151' }}>
                          {c.name}
                        </Link>
                        {c.location && <span style={{ fontSize: '0.73rem', color: '#4b5563' }}>📍 {c.location}</span>}
                      </div>
                      {c.headline && <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: '0.15rem', paddingLeft: rankBadge ? 30 : 18 }}>{c.headline}</div>}

                      {/* Matched / Missing skill tags */}
                      {(c.matchedSkills?.length > 0 || c.missingSkills?.length > 0) && (
                        <div style={{ marginTop: '0.5rem', paddingLeft: rankBadge ? 30 : 18 }}>
                          {c.matchedSkills?.slice(0, 6).map((s, i) => (
                            <span key={i} style={{ ...tagStyle, color: '#34d399', borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.08)' }}>✓ {s}</span>
                          ))}
                          {c.missingSkills?.slice(0, 4).map((s, i) => (
                            <span key={i} style={{ ...tagStyle, color: '#f87171', borderColor: 'rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.06)' }}>✗ {s}</span>
                          ))}
                        </div>
                      )}

                      {/* Breakdown bars — toggle */}
                      {isOpen && <BreakdownBars breakdown={c.breakdown} />}
                    </div>

                    {/* Right: score + actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: scoreColor(sc), lineHeight: 1 }}>{sc}%</div>
                        <div style={{ fontSize: '0.68rem', color: '#4b5563' }}>AI match</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setExpanded(prev => ({ ...prev, [c.userId]: !isOpen }))}
                          style={{ padding: '0.2rem 0.65rem', borderRadius: 6, fontSize: '0.72rem', cursor: 'pointer', border: '1px solid #1f2937', background: '#0f172a', color: '#6b7280' }}
                        >
                          {isOpen ? 'Hide breakdown ▲' : 'Breakdown ▼'}
                        </button>
                        <Link
                          to={`/profile/${c.userId}`}
                          style={{ padding: '0.2rem 0.65rem', borderRadius: 6, fontSize: '0.72rem', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.06)', textDecoration: 'none' }}
                        >
                          👤 Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
