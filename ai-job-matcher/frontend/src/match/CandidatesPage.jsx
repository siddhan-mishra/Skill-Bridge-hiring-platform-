// CandidatesPage.jsx — ranked candidates for a recruiter's specific job
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

function CandidatesPage() {
  const { jobId } = useParams();               // Line 8: from /recruiter/jobs/:jobId/candidates
  const { user, API_BASE } = useAuth();

  const [data, setData]       = useState(null);  // { job, candidates[] }
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [minScore, setMinScore] = useState(0);   // Line 14: filter slider

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        // Line 19: calls our new endpoint
        const res = await axios.get(`${API_BASE}/api/match/job/${jobId}/candidates`);
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to load candidates');
      } finally {
        setLoading(false);
      }
    };
    if (user?.role === 'recruiter') fetchCandidates();
    else setLoading(false);
  }, [API_BASE, jobId, user]);

  if (!user || user.role !== 'recruiter') {
    return <div className="card"><p>Only recruiters can view candidates.</p></div>;
  }
  if (loading) return <div className="card"><p>Loading candidates...</p></div>;
  if (error)   return (
    <div className="card">
      <p style={{ color: 'tomato' }}>{error}</p>
      <Link to="/recruiter/jobs">← Back to My Jobs</Link>
    </div>
  );

  const { job, candidates } = data;

  // Line 44: apply minimum score filter
  const filtered = candidates.filter(c => c.score >= minScore);

  // ── score bar colour: green > 60, yellow > 30, red otherwise ──────────
  const scoreColor = (s) => s >= 60 ? '#4caf50' : s >= 30 ? '#ff9800' : '#f44336';

  const tagStyle = (matched) => ({
    display: 'inline-block',
    padding: '0.2rem 0.5rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    marginRight: '0.3rem',
    marginTop: '0.25rem',
    background: matched ? '#1a3a1a' : '#3a1a1a',
    border: `1px solid ${matched ? '#2a6a2a' : '#6a2a2a'}`,
    color: matched ? 'lightgreen' : '#ff8080',
  });

  return (
    <div className="card">

      {/* ── header ── */}
      <p style={{ marginBottom: '0.5rem' }}>
        <Link to="/recruiter/jobs" style={{ color: '#aaa', fontSize: '0.9rem', textDecoration: 'none' }}>
          ← Back to My Jobs
        </Link>
      </p>

      <h2 style={{ marginBottom: '0.25rem' }}>Matched Candidates</h2>
      <p style={{ color: '#aaa', marginBottom: '1.5rem' }}>
        Job: <strong style={{ color: 'white' }}>{job.title}</strong> at {job.company}
        &nbsp;•&nbsp; {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} found
      </p>

      {/* ── required skills for this job ── */}
      {job.requiredSkills?.length > 0 && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: '#161616', borderRadius: '6px', border: '1px solid #333' }}>
          <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem' }}>Required skills for this job:</p>
          <div>
            {job.requiredSkills.map((s, i) => (
              <span key={i} style={{ display: 'inline-block', padding: '0.2rem 0.5rem', background: '#2a3a4a', border: '1px solid #3a5a6a', borderRadius: '12px', fontSize: '0.75rem', color: '#7ac', marginRight: '0.3rem', marginTop: '0.25rem' }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── score filter slider ── */}
      {/* Line 92 */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label style={{ fontSize: '0.9rem', color: '#aaa', whiteSpace: 'nowrap' }}>
          Min match score:
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={10}
          value={minScore}
          onChange={e => setMinScore(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{
          minWidth: '48px',
          textAlign: 'center',
          fontWeight: 'bold',
          color: scoreColor(minScore),
          fontSize: '1rem',
        }}>
          {minScore}%
        </span>
      </div>

      {filtered.length === 0 && (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '2rem' }}>
          No candidates match {minScore}%+ score. Try lowering the filter.
        </p>
      )}

      {/* ── candidate cards ── */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {filtered.map((c, idx) => (
          <div
            key={c.userId}
            style={{
              padding: '1rem 1.25rem',
              background: '#1e1e1e',
              border: '1px solid #333',
              borderRadius: '6px',
            }}
          >
            {/* ── top row: rank + name + score bar ── */}
            {/* Line 118 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ color: '#555', fontSize: '0.85rem', marginRight: '0.5rem' }}>
                  #{idx + 1}
                </span>
                <Link
                    to={`/profile/${c.userId}`}
                    style={{ color: 'white', textDecoration: 'none', fontSize: '1.05rem', fontWeight: 'bold'  }}
                    onMouseEnter={e => e.target.style.color = '#7ac'}
                    onMouseLeave={e => e.target.style.color = 'white'}
                  >
                    {c.name}
                  </Link>
                {c.headline && (
                  <p style={{ color: '#aaa', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                    {c.headline}
                  </p>
                )}
                <p style={{ color: '#666', fontSize: '0.8rem', margin: '0.1rem 0 0' }}>
                  {c.email}
                </p>
              </div>

              {/* ── score badge ── */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: scoreColor(c.score),
                  lineHeight: 1,
                }}>
                  {c.score}%
                </div>
                <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.2rem' }}>
                  match
                </div>
              </div>
            </div>

            {/* ── score progress bar ── */}
            <div style={{ height: '4px', background: '#333', borderRadius: '2px', marginBottom: '0.75rem' }}>
              <div style={{
                height: '100%',
                width: `${c.score}%`,
                background: scoreColor(c.score),
                borderRadius: '2px',
                transition: 'width 0.3s',
              }} />
            </div>

            {/* ── matched skills (green) + missing skills (red) ── */}
            {/* Line 150 */}
            {c.matchedSkills?.length > 0 && (
              <div style={{ marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#aaa' }}>Matched: </span>
                {c.matchedSkills.map((s, i) => (
                  <span key={i} style={tagStyle(true)}>{s}</span>
                ))}
              </div>
            )}
            {c.missingSkills?.length > 0 && (
              <div>
                <span style={{ fontSize: '0.75rem', color: '#aaa' }}>Missing: </span>
                {c.missingSkills.map((s, i) => (
                  <span key={i} style={tagStyle(false)}>{s}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CandidatesPage;