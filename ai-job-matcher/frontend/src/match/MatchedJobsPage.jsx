// MatchedJobsPage.jsx — redesigned with score bars, skill tags, profile links
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import { Link } from 'react-router-dom';

function MatchedJobsPage() {
  const { user, API_BASE } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [minScore, setMinScore] = useState(0);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/match/my-jobs`);
        setMatches(res.data || []);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to load matches');
      } finally {
        setLoading(false);
      }
    };
    if (user?.role === 'seeker') fetchMatches();
    else setLoading(false);
  }, [API_BASE, user]);

  if (!user || user.role !== 'seeker') {
    return <div className="card"><p>Only job seekers can view matched jobs.</p></div>;
  }

  const scoreColor = (s) => s >= 60 ? '#4caf50' : s >= 30 ? '#ff9800' : '#f44336';

  const filtered = matches.filter(m => m.score >= minScore);

  const tagStyle = (type) => ({
    display: 'inline-block',
    padding: '0.2rem 0.5rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    marginRight: '0.3rem',
    marginTop: '0.25rem',
    background: type === 'matched' ? '#1a3a1a' : type === 'missing' ? '#3a1a1a' : '#2a2a1a',
    border: `1px solid ${type === 'matched' ? '#2a6a2a' : type === 'missing' ? '#6a2a2a' : '#5a5a1a'}`,
    color: type === 'matched' ? 'lightgreen' : type === 'missing' ? '#ff8080' : '#ffd080',
  });

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* ── header ── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>Your Matched Jobs</h2>
        <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          {matches.length} job{matches.length !== 1 ? 's' : ''} analysed ·{' '}
          <Link to="/profile" style={{ color: '#2a6496' }}>Update profile</Link>
          {' '}to improve scores
        </p>
      </div>

      {/* ── score filter ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', background: '#1e1e1e', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #2a2a2a' }}>
        <label style={{ color: '#aaa', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
          Min match score:
        </label>
        <input
          type="range" min={0} max={100} step={10}
          value={minScore}
          onChange={e => setMinScore(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ minWidth: 44, textAlign: 'center', fontWeight: 'bold', color: scoreColor(minScore) }}>
          {minScore}%
        </span>
      </div>

      {loading && <p style={{ color: '#aaa' }}>Loading...</p>}
      {error   && <p style={{ color: 'tomato' }}>{error}</p>}

      {!loading && !error && matches.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#555' }}>
          <p style={{ fontSize: '1.1rem' }}>No matches yet.</p>
          <p style={{ fontSize: '0.9rem' }}>Make sure your profile has skills and jobs are posted.</p>
          <Link to="/profile" style={{ color: '#2a6496', marginTop: '0.5rem', display: 'block' }}>
            Add skills to profile →
          </Link>
        </div>
      )}

      {!loading && !error && matches.length > 0 && filtered.length === 0 && (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '1.5rem' }}>
          No jobs match {minScore}%+. Try lowering the filter.
        </p>
      )}

      {/* ── match cards ── */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {filtered.map((m) => (
          <div
            key={m.jobId}
            style={{
              padding: '1.1rem 1.3rem',
              background: '#1e1e1e',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
            }}
          >
            {/* top: title + score badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.6rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>
                  <Link
                    to={`/jobs/${m.jobId}`}
                    style={{ color: 'white', textDecoration: 'none' }}
                    onMouseEnter={e => e.target.style.color = '#7ac'}
                    onMouseLeave={e => e.target.style.color = 'white'}
                  >
                    {m.title}
                  </Link>
                </h3>
                <p style={{ color: '#aaa', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                  {m.company}
                  {m.location    && <span> · 📍 {m.location}</span>}
                  {m.jobType     && <span> · 💼 {m.jobType}</span>}
                  {m.salaryRange && <span> · 💰 {m.salaryRange}</span>}
                </p>
              </div>

              {/* score badge */}
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: scoreColor(m.score), lineHeight: 1 }}>
                  {m.score}%
                </div>
                <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '0.15rem' }}>match</div>
              </div>
            </div>

            {/* score bar */}
            <div style={{ height: 4, background: '#2a2a2a', borderRadius: 2, marginBottom: '0.85rem' }}>
              <div style={{
                height: '100%', width: `${m.score}%`,
                background: scoreColor(m.score),
                borderRadius: 2, transition: 'width 0.3s',
              }} />
            </div>

            {/* skill tags */}
            {m.matchedSkills?.length > 0 && (
              <div style={{ marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#888' }}>✅ Matched: </span>
                {m.matchedSkills.map((s, i) => (
                  <span key={i} style={tagStyle('matched')}>{s}</span>
                ))}
              </div>
            )}
            {m.missingSkills?.length > 0 && (
              <div style={{ marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#888' }}>❌ Missing: </span>
                {m.missingSkills.map((s, i) => (
                  <span key={i} style={tagStyle('missing')}>{s}</span>
                ))}
              </div>
            )}
            {m.extraSkills?.length > 0 && (
              <div style={{ marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#888' }}>⭐ Bonus skills: </span>
                {m.extraSkills.map((s, i) => (
                  <span key={i} style={tagStyle('extra')}>{s}</span>
                ))}
              </div>
            )}

            {/* description snippet */}
            {m.description && (
              <p style={{ color: '#777', fontSize: '0.84rem', lineHeight: '1.5', marginBottom: '0.75rem' }}>
                {m.description.length > 160 ? m.description.slice(0, 160) + '...' : m.description}
              </p>
            )}

            {/* action buttons */}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <Link
                to={`/jobs/${m.jobId}`}
                style={{
                  padding: '0.35rem 0.85rem',
                  background: '#2a3a4a',
                  color: 'white', borderRadius: '4px',
                  textDecoration: 'none', fontSize: '0.82rem',
                }}
              >
                View Full Job →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MatchedJobsPage;