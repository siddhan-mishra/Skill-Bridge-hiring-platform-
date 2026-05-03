import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import { Link } from 'react-router-dom';

const scoreColor = (s) => s >= 70 ? '#34d399' : s >= 40 ? '#fbbf24' : '#f87171';

const TAG = {
  matched: { bg: 'rgba(16,185,129,0.1)',  color: '#34d399', border: 'rgba(16,185,129,0.25)' },
  missing: { bg: 'rgba(248,113,113,0.08)', color: '#f87171', border: 'rgba(248,113,113,0.2)' },
  extra:   { bg: 'rgba(251,191,36,0.08)',  color: '#fbbf24', border: 'rgba(251,191,36,0.2)'  },
};

function SkillTag({ type, children }) {
  const t = TAG[type];
  return (
    <span style={{ display: 'inline-block', padding: '0.18rem 0.58rem', borderRadius: '999px', fontSize: '0.74rem', marginRight: '0.3rem', marginBottom: '0.3rem', background: t.bg, color: t.color, border: `1px solid ${t.border}` }}>
      {children}
    </span>
  );
}

export default function MatchedJobsPage() {
  const { user, API_BASE } = useAuth();
  const token = localStorage.getItem('token');

  const [matches,  setMatches]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [minScore, setMinScore] = useState(0);
  const [sortBy,   setSortBy]   = useState('score');
  const [appliedIds, setApplied] = useState(new Set());
  const [applying, setApplying] = useState(null);

  useEffect(() => {
    if (user?.role !== 'seeker') { setLoading(false); return; }
    (async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [matchRes, appsRes] = await Promise.all([
          axios.get(`${API_BASE}/api/match/my-jobs`, { headers }),
          axios.get(`${API_BASE}/api/applications/my`, { headers }),
        ]);
        setMatches(matchRes.data || []);
        setApplied(new Set(appsRes.data.map(a => a.job?._id || a.job)));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load matches');
      } finally { setLoading(false); }
    })();
  }, [API_BASE, user, token]);

  const quickApply = async (jobId) => {
    setApplying(jobId);
    try {
      await axios.post(`${API_BASE}/api/applications/${jobId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setApplied(prev => new Set([...prev, jobId]));
    } catch (err) {
      alert(err.response?.data?.message || 'Apply failed');
    } finally { setApplying(null); }
  };

  const filtered = useMemo(() => {
    let list = matches.filter(m => m.score >= minScore);
    if (sortBy === 'score')  list = [...list].sort((a, b) => b.score - a.score);
    if (sortBy === 'newest') list = [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    if (sortBy === 'title')  list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [matches, minScore, sortBy]);

  if (!user || user.role !== 'seeker') {
    return <div className="card"><p>Only job seekers can view matched jobs.</p></div>;
  }
  if (loading) return <div className="card"><p>Loading matches…</p></div>;
  if (error)   return <div className="card"><p style={{ color: '#f87171' }}>{error}</p></div>;

  // Skill gap insight: top 5 most-missing skills across all jobs
  const missingFreq = {};
  for (const m of matches) for (const s of (m.missingSkills || [])) missingFreq[s] = (missingFreq[s] || 0) + 1;
  const topMissing = Object.entries(missingFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const inp = { background: '#0f172a', color: '#e5e7eb', border: '1px solid #1f2937', borderRadius: '7px', padding: '0.4rem 0.7rem', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit' };

  return (
    <div style={{ maxWidth: 880, width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Your Job Matches</h2>
          <p style={{ color: '#6b7280', margin: '0.2rem 0 0', fontSize: '0.84rem' }}>
            {matches.length} job{matches.length !== 1 ? 's' : ''} analysed · <Link to="/profile/edit" style={{ color: '#6366f1' }}>Update profile</Link> to improve scores
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select style={inp} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="score">Sort: Best Match</option>
            <option value="newest">Sort: Newest</option>
            <option value="title">Sort: Title</option>
          </select>
        </div>
      </div>

      {/* Skill gap insight banner */}
      {topMissing.length > 0 && (
        <div style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '10px', padding: '0.85rem 1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>💡 Skill gaps:</span>
          {topMissing.map(([s, n]) => (
            <span key={s} style={{ padding: '0.18rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
              {s} <span style={{ color: '#6b7280' }}>({n})</span>
            </span>
          ))}
          <span style={{ color: '#4b5563', fontSize: '0.76rem' }}>missing across jobs · <Link to="/profile/edit" style={{ color: '#6366f1' }}>add to profile</Link></span>
        </div>
      )}

      {/* Score filter */}
      <div style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '10px', padding: '0.75rem 1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' }}>Min score:</span>
        <input type="range" min={0} max={100} step={10} value={minScore} onChange={e => setMinScore(Number(e.target.value))} style={{ flex: 1, accentColor: '#6366f1' }} />
        <span style={{ minWidth: 42, textAlign: 'center', fontWeight: 700, color: scoreColor(minScore), fontSize: '0.9rem' }}>{minScore}%</span>
        <span style={{ color: '#4b5563', fontSize: '0.78rem' }}>{filtered.length} jobs</span>
      </div>

      {/* Empty state */}
      {matches.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>No matches yet.</p>
          <p style={{ color: '#4b5563', fontSize: '0.85rem' }}>Add skills to your profile to see ranked job matches.</p>
          <Link to="/profile/edit" style={{ color: '#6366f1' }}>Add skills →</Link>
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.map(m => {
          const isApplied = appliedIds.has(m.jobId);
          const isApplying = applying === m.jobId;
          return (
            <div key={m.jobId} style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '10px', padding: '1.1rem 1.4rem', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#374151'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1f2937'}
            >
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <div>
                  <Link to={`/jobs/${m.jobId}`} style={{ fontWeight: 700, fontSize: '1rem', color: '#e5e7eb' }}>{m.title}</Link>
                  <div style={{ color: '#9ca3af', fontSize: '0.84rem', marginTop: '0.15rem' }}>
                    {m.company}
                    {m.location    && <span> · 📍 {m.location}</span>}
                    {m.jobType     && <span> · 💼 {m.jobType}</span>}
                    {m.salaryRange && <span> · 💰 {m.salaryRange}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: scoreColor(m.score), lineHeight: 1 }}>{m.score}%</div>
                  <div style={{ fontSize: '0.68rem', color: '#4b5563', marginTop: '0.1rem' }}>match</div>
                </div>
              </div>

              {/* Score bar */}
              <div style={{ height: 4, background: '#1f2937', borderRadius: '999px', marginBottom: '0.85rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${m.score}%`, background: scoreColor(m.score), borderRadius: '999px', transition: 'width 0.4s' }} />
              </div>

              {/* Skill tags */}
              <div style={{ marginBottom: '0.65rem' }}>
                {m.matchedSkills?.length > 0 && <><span style={{ fontSize: '0.72rem', color: '#4b5563' }}>✅ </span>{m.matchedSkills.map((s,i) => <SkillTag key={i} type="matched">{s}</SkillTag>)}</>}
                {m.missingSkills?.length > 0 && <><span style={{ fontSize: '0.72rem', color: '#4b5563' }}>🔴 </span>{m.missingSkills.map((s,i) => <SkillTag key={i} type="missing">{s}</SkillTag>)}</>}
                {m.extraSkills?.length > 0 && <><span style={{ fontSize: '0.72rem', color: '#4b5563' }}>⭐ </span>{m.extraSkills.slice(0,4).map((s,i) => <SkillTag key={i} type="extra">{s}</SkillTag>)}</>}
              </div>

              {/* Description snippet */}
              {m.description && (
                <p style={{ color: '#6b7280', fontSize: '0.82rem', lineHeight: 1.65, marginBottom: '0.75rem', margin: '0 0 0.75rem' }}>
                  {m.description.length > 150 ? m.description.slice(0, 150) + '…' : m.description}
                </p>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                <Link to={`/jobs/${m.jobId}`}
                  style={{ padding: '0.3rem 0.85rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '6px', fontSize: '0.8rem' }}>
                  View Job →
                </Link>
                {isApplied ? (
                  <span style={{ padding: '0.3rem 0.85rem', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '6px', fontSize: '0.8rem' }}>
                    ✓ Applied
                  </span>
                ) : (
                  <button onClick={() => quickApply(m.jobId)} disabled={isApplying}
                    style={{ padding: '0.3rem 0.85rem', background: isApplying ? '#1f2937' : '#6366f1', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: isApplying ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                    {isApplying ? 'Applying…' : '✉️ Quick Apply'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
