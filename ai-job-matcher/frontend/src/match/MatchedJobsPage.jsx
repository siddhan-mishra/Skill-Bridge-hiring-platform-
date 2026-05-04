import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import ScoreBreakdownBar from '../components/ScoreBreakdownBar';

const FILTERS = ['All', 'Strong Match', 'Good Match', 'Partial'];

export default function MatchedJobsPage() {
  const { API_BASE, user } = useAuth();
  const token    = localStorage.getItem('token');
  const navigate = useNavigate();

  const [matches,    setMatches]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [filter,     setFilter]     = useState('All');
  const [search,     setSearch]     = useState('');
  const [applying,   setApplying]   = useState({});
  const [appliedIds, setApplied]    = useState(new Set());
  const [expanded,   setExpanded]   = useState({});

  // Profile completeness check
  const [profileScore, setProfileScore] = useState(100);

  useEffect(() => {
    if (!user || user.role !== 'seeker') { setLoading(false); return; }
    (async () => {
      try {
        // 1. Fetch matches from hybrid scorer
        const [mRes, pRes, aRes] = await Promise.all([
          axios.get(`${API_BASE}/api/match/seeker`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE}/api/profile/me`,   { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: null })),
          axios.get(`${API_BASE}/api/applications/my`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        ]);
        setMatches(mRes.data);
        setApplied(new Set((aRes.data || []).map(a => a.job?._id || a.job)));

        // 2. Compute profile completeness (0-100)
        const p = pRes.data;
        if (p) {
          let score = 0;
          if (p.headline)          score += 15;
          if (p.summary)           score += 15;
          if (p.skills?.length)    score += 25;
          if (p.workHistory?.length) score += 20;
          if (p.education?.length) score += 15;
          if (p.resumeUrl)         score += 10;
          setProfileScore(score);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load matches');
      } finally {
        setLoading(false);
      }
    })();
  }, [API_BASE, user, token]);

  const displayed = useMemo(() => {
    let list = [...matches];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.title?.toLowerCase().includes(q) ||
        m.company?.toLowerCase().includes(q) ||
        m.matchedSkills?.some(s => s.includes(q))
      );
    }
    if (filter === 'Strong Match') list = list.filter(m => m.score >= 75);
    if (filter === 'Good Match')   list = list.filter(m => m.score >= 50 && m.score < 75);
    if (filter === 'Partial')      list = list.filter(m => m.score >= 25 && m.score < 50);
    return list;
  }, [matches, filter, search]);

  const handleApply = async (jobId, score) => {
    // Step 3: Block apply if score < 20
    if (score < 20) {
      alert('⚠️ Your profile match is below 20%. Improve your skills before applying to this role.');
      return;
    }
    setApplying(a => ({ ...a, [jobId]: true }));
    try {
      await axios.post(`${API_BASE}/api/applications`, { job: jobId },
        { headers: { Authorization: `Bearer ${token}` } });
      setApplied(prev => new Set([...prev, jobId]));
    } catch (err) {
      alert(err.response?.data?.message || 'Application failed');
    } finally {
      setApplying(a => ({ ...a, [jobId]: false }));
    }
  };

  const salaryLabel = (m) => {
    if (m.salaryMin && m.salaryMax) return `${m.salaryMin}–${m.salaryMax} ${m.salaryUnit || 'LPA'}`;
    if (m.salaryMin) return `From ${m.salaryMin} ${m.salaryUnit || 'LPA'}`;
    return null;
  };

  const S = {
    inp: { background: '#0f172a', color: '#e5e7eb', border: '1px solid #1f2937', borderRadius: 7, padding: '0.45rem 0.75rem', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit' },
    chip: (color='#818cf8', bg='rgba(99,102,241,0.12)') => ({ display: 'inline-block', padding: '0.18rem 0.55rem', background: bg, color, border: `1px solid ${color}40`, borderRadius: 999, fontSize: '0.73rem', marginRight: '0.3rem', marginBottom: '0.3rem' }),
  };

  if (!user || user.role !== 'seeker') {
    return <div className="card"><p style={{ color: '#f87171' }}>Only job seekers can view matches.</p></div>;
  }
  if (loading) return <div className="card"><p style={{ color: '#9ca3af' }}>⏳ Running AI matcher…</p></div>;
  if (error)   return <div className="card"><p style={{ color: '#f87171' }}>{error}</p></div>;

  return (
    <div style={{ maxWidth: 900, width: '100%' }}>

      {/* ── Profile Completeness Warning ── */}
      {profileScore < 40 && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <div style={{ color: '#fbbf24', fontWeight: 700 }}>Your profile is only {profileScore}% complete</div>
            <div style={{ color: '#9ca3af', fontSize: '0.83rem', marginTop: '0.2rem' }}>A complete profile means better AI match scores. <Link to="/profile/edit" style={{ color: '#818cf8' }}>Complete it now →</Link></div>
          </div>
        </div>
      )}

      {/* ── Header + Stats ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ color: '#e5e7eb', margin: 0 }}>🎯 AI Job Matches</h2>
          <p style={{ color: '#4b5563', fontSize: '0.83rem', margin: '0.2rem 0 0' }}>{matches.length} jobs ranked by hybrid semantic score</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input style={{ ...S.inp, width: 200 }} placeholder="🔍 Search matches…" value={search} onChange={e => setSearch(e.target.value)} />
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '0.3rem 0.8rem', borderRadius: 999, border: `1px solid ${filter === f ? '#6366f1' : '#1f2937'}`, background: filter === f ? 'rgba(99,102,241,0.15)' : 'transparent', color: filter === f ? '#818cf8' : '#6b7280', fontSize: '0.8rem', cursor: 'pointer' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Match Cards ── */}
      {displayed.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🤖</div>
          <p style={{ color: '#6b7280' }}>No matches found. <Link to="/profile/edit" style={{ color: '#818cf8' }}>Update your profile</Link> to get better results.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {displayed.map(match => {
            const isApplied = appliedIds.has(match.jobId);
            const isExpanded = expanded[match.jobId];
            const salary = salaryLabel(match);
            const blocked = match.score < 20;

            return (
              <div key={match.jobId}
                style={{ background: '#0a0f1e', border: `1px solid ${match.score >= 75 ? 'rgba(52,211,153,0.2)' : '#1f2937'}`, borderRadius: 12, padding: '1.25rem 1.4rem', transition: 'border-color 0.15s' }}>

                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                  {/* Score ring */}
                  <div style={{ flexShrink: 0 }}>
                    <ScoreBreakdownBar score={match.score} breakdown={match.breakdown} size="small" />
                  </div>

                  {/* Job info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <Link to={`/jobs/${match.jobId}`} style={{ fontWeight: 700, fontSize: '1rem', color: '#e5e7eb' }}>{match.title}</Link>
                    <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                      {match.company}
                      {match.location && ` · ${match.location}`}
                      {match.jobType  && ` · ${match.jobType}`}
                      {match.workMode && ` · ${match.workMode}`}
                      {salary && <span style={{ color: '#6366f1', marginLeft: '0.4rem' }}>· {salary}</span>}
                    </div>

                    {/* Matched skills */}
                    {match.matchedSkills?.length > 0 && (
                      <div style={{ marginTop: '0.6rem' }}>
                        <span style={{ color: '#4b5563', fontSize: '0.75rem', marginRight: '0.4rem' }}>✅ Matched:</span>
                        {match.matchedSkills.slice(0, 5).map((s, i) => (
                          <span key={i} style={S.chip('#34d399', 'rgba(16,185,129,0.1)')}>{s}</span>
                        ))}
                      </div>
                    )}

                    {/* Missing skills */}
                    {match.missingSkills?.length > 0 && (
                      <div style={{ marginTop: '0.4rem' }}>
                        <span style={{ color: '#4b5563', fontSize: '0.75rem', marginRight: '0.4rem' }}>❌ Missing:</span>
                        {match.missingSkills.slice(0, 4).map((s, i) => (
                          <span key={i} style={S.chip('#f87171', 'rgba(239,68,68,0.08)')}>{s}</span>
                        ))}
                        {!isExpanded && match.missingSkills.length > 4 && (
                          <span onClick={() => setExpanded(e => ({ ...e, [match.jobId]: true }))}
                            style={{ color: '#4b5563', fontSize: '0.73rem', cursor: 'pointer', textDecoration: 'underline' }}>
                            +{match.missingSkills.length - 4} more
                          </span>
                        )}
                        {isExpanded && match.missingSkills.slice(4).map((s, i) => (
                          <span key={i} style={S.chip('#f87171', 'rgba(239,68,68,0.08)')}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', flexShrink: 0 }}>
                    {isApplied ? (
                      <span style={{ padding: '0.35rem 0.9rem', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 7, fontSize: '0.82rem' }}>✓ Applied</span>
                    ) : blocked ? (
                      <div style={{ textAlign: 'right' }}>
                        <button disabled style={{ padding: '0.35rem 0.9rem', background: '#1f2937', color: '#4b5563', border: '1px solid #374151', borderRadius: 7, fontSize: '0.82rem', cursor: 'not-allowed' }}>Apply (Low Match)</button>
                        <div style={{ color: '#f87171', fontSize: '0.72rem', marginTop: '0.25rem' }}>Improve skills to apply</div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApply(match.jobId, match.score)}
                        disabled={applying[match.jobId]}
                        style={{ padding: '0.35rem 0.9rem', background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', border: 'none', borderRadius: 7, fontSize: '0.82rem', cursor: 'pointer', opacity: applying[match.jobId] ? 0.7 : 1 }}>
                        {applying[match.jobId] ? '⏳ Applying…' : 'Apply Now'}
                      </button>
                    )}
                    <Link to={`/jobs/${match.jobId}`} style={{ color: '#4b5563', fontSize: '0.78rem' }}>View Details →</Link>
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
