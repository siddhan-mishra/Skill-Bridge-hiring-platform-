// MatchedJobsPage.jsx — Seeker: AI-ranked job feed
// FIX: useState must NEVER be called inside .map() — extracted to parent component
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getMatchedJobs, getMyApplications } from '../api/jobApi';

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

const FILTERS = [
  { label: 'All',         min: 0  },
  { label: '🔥 Strong',  min: 75 },
  { label: '✅ Good',    min: 50 },
  { label: '🟡 Partial', min: 25 },
];

const WORK_MODE_COLOR = { Remote: '#34d399', Hybrid: '#fbbf24', 'On-site': '#818cf8' };

// ── Single job card — has its own useState so no hook-in-map ──────────────────
function JobCard({ job, applied }) {
  const [showAll, setShowAll] = useState(false);
  const canApply = job.matchScore >= 20;
  const wmc = WORK_MODE_COLOR[job.workMode] || '#818cf8';

  const salaryLabel = () => {
    if (job.salaryMin && job.salaryMax) return `${job.salaryMin}–${job.salaryMax} ${job.salaryUnit || 'LPA'}`;
    if (job.salaryMin) return `From ${job.salaryMin} ${job.salaryUnit || 'LPA'}`;
    if (job.salaryRange) return job.salaryRange;
    return null;
  };
  const salary = salaryLabel();

  return (
    <div style={{ background: '#0a0f1e', border: `1px solid ${applied ? 'rgba(99,102,241,0.3)' : '#1f2937'}`, borderRadius: 10, padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        <ScoreRing score={job.matchScore} />

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link to={`/jobs/${job._id}`} style={{ fontWeight: 700, color: '#e5e7eb', fontSize: '0.97rem' }}>{job.title}</Link>
            {job.jobType  && <span style={{ padding: '0.12rem 0.5rem', borderRadius: 999, fontSize: '0.72rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>{job.jobType}</span>}
            {job.workMode && <span style={{ padding: '0.12rem 0.5rem', borderRadius: 999, fontSize: '0.72rem', background: wmc + '18', color: wmc, border: `1px solid ${wmc}33` }}>{job.workMode}</span>}
            {applied && <span style={{ padding: '0.12rem 0.5rem', borderRadius: 999, fontSize: '0.72rem', background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>Applied · {applied}</span>}
          </div>
          <div style={{ color: '#9ca3af', fontSize: '0.84rem', marginTop: '0.2rem' }}>
            {job.company}{job.location ? ` · ${job.location}` : ''}
            {salary && <span style={{ color: '#6366f1' }}> · {salary}</span>}
          </div>

          {/* Score breakdown bars */}
          {job.breakdown?.semanticScore != null && (
            <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {[['Semantic', job.breakdown.semanticScore, '#818cf8'], ['Skills', job.breakdown.skillScore, '#34d399'], ['Experience', job.breakdown.structScore, '#fbbf24']].map(([label, val, color]) => (
                <div key={label} style={{ flex: '1 1 120px', minWidth: 100 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#4b5563', marginBottom: '0.15rem' }}>
                    <span>{label}</span><span style={{ color }}>{val}%</span>
                  </div>
                  <div style={{ height: 4, background: '#1f2937', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${val}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Skill chips */}
          {(job.matchedSkills?.length > 0 || job.missingSkills?.length > 0) && (
            <div style={{ marginTop: '0.6rem' }}>
              {(job.matchedSkills || []).slice(0, showAll ? 50 : 5).map((s, i) => (
                <span key={i} style={{ display: 'inline-block', padding: '0.13rem 0.48rem', borderRadius: 999, fontSize: '0.72rem', marginRight: '0.28rem', marginBottom: '0.28rem', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>✓ {s}</span>
              ))}
              {(job.missingSkills || []).slice(0, showAll ? 50 : 3).map((s, i) => (
                <span key={i} style={{ display: 'inline-block', padding: '0.13rem 0.48rem', borderRadius: 999, fontSize: '0.72rem', marginRight: '0.28rem', marginBottom: '0.28rem', background: 'rgba(239,68,68,0.07)', color: '#f87171', border: '1px solid rgba(239,68,68,0.18)' }}>✗ {s}</span>
              ))}
              {((job.matchedSkills?.length || 0) + (job.missingSkills?.length || 0)) > 8 && (
                <span onClick={() => setShowAll(v => !v)} style={{ color: '#4b5563', fontSize: '0.72rem', cursor: 'pointer' }}>
                  {showAll ? 'show less' : `+${(job.matchedSkills?.length || 0) + (job.missingSkills?.length || 0) - 8} more`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Apply button */}
        <div style={{ flexShrink: 0 }}>
          {applied ? (
            <span style={{ padding: '0.45rem 1.1rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, fontSize: '0.85rem', display: 'inline-block' }}>Applied ✓</span>
          ) : canApply ? (
            <Link to={`/jobs/${job._id}`}
              style={{ padding: '0.45rem 1.1rem', background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>
              Apply →
            </Link>
          ) : (
            <span style={{ padding: '0.45rem 1.1rem', background: '#0f172a', color: '#374151', border: '1px solid #1f2937', borderRadius: 8, fontSize: '0.82rem', display: 'inline-block' }} title="Improve your skills to apply">
              Low match
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MatchedJobsPage() {
  const { user } = useAuth();

  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [filter,     setFilter]     = useState(0);
  const [appliedMap, setAppliedMap] = useState({});

  useEffect(() => {
    if (!user || user.role !== 'seeker') { setLoading(false); return; }
    (async () => {
      try {
        const [matchRes, appsRes] = await Promise.all([
          getMatchedJobs(),
          getMyApplications().catch(() => ({ data: [] })),
        ]);
        setResult(matchRes.data);
        const map = {};
        (appsRes.data || []).forEach(a => { if (a.job?._id) map[a.job._id] = a.status; });
        setAppliedMap(map);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load matches. Make sure your profile is complete.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const filtered = useMemo(() => {
    if (!result?.jobs) return [];
    return result.jobs.filter(j => j.matchScore >= filter);
  }, [result, filter]);

  if (!user || user.role !== 'seeker')
    return <div className="card"><p style={{ color: '#f87171' }}>Seekers only.</p></div>;
  if (loading)
    return <div className="card"><p style={{ color: '#9ca3af' }}>⏳ Computing your matches…</p></div>;
  if (error)
    return <div className="card"><p style={{ color: '#f87171' }}>{error}</p></div>;

  const { completeness = 100, scoringMode, message } = result || {};

  return (
    <div style={{ maxWidth: 900, width: '100%' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ color: '#e5e7eb', margin: 0 }}>🎯 Matched Jobs</h2>
        <p style={{ color: '#4b5563', fontSize: '0.83rem', margin: '0.2rem 0 0' }}>
          {filtered.length} jobs · {scoringMode === 'sbert' ? '🤖 AI-powered matching' : '🔤 Keyword matching'}
        </p>
      </div>

      {completeness < 40 && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '0.85rem 1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.9rem' }}>Profile {completeness}% complete</div>
            <div style={{ color: '#6b7280', fontSize: '0.82rem', marginTop: '0.15rem' }}>Add skills, work history, and a summary for better matches. <Link to="/profile/edit" style={{ color: '#fbbf24' }}>Complete profile →</Link></div>
          </div>
        </div>
      )}

      {message && (
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', color: '#818cf8', fontSize: '0.82rem' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {FILTERS.map(f => (
          <button key={f.min} onClick={() => setFilter(f.min)}
            style={{
              padding: '0.3rem 0.85rem', borderRadius: 7, fontSize: '0.82rem', cursor: 'pointer', border: 'none',
              background: filter === f.min ? 'rgba(99,102,241,0.2)' : '#0f172a',
              color: filter === f.min ? '#818cf8' : '#4b5563',
              outline: filter === f.min ? '1px solid rgba(99,102,241,0.4)' : '1px solid #1f2937',
              fontWeight: filter === f.min ? 700 : 400,
            }}>
            {f.label} ({result?.jobs?.filter(j => j.matchScore >= f.min).length || 0})
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
          <p style={{ color: '#6b7280', marginBottom: '0.75rem' }}>No jobs match your current filter.</p>
          <button onClick={() => setFilter(0)} style={{ color: '#818cf8', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>Show all jobs</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.map(job => (
          <JobCard key={job._id} job={job} applied={appliedMap[job._id]} />
        ))}
      </div>
    </div>
  );
}
