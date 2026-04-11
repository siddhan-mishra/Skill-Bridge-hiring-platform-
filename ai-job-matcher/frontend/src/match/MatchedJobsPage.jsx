import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import { Link } from 'react-router-dom';

function MatchedJobsPage() {
  const { user, API_BASE } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

    if (user && user.role === 'seeker') {
      fetchMatches();
    } else {
      setLoading(false);
    }
  }, [API_BASE, user]);

  if (!user || user.role !== 'seeker') {
    return (
      <div className="card">
        <p>Only job seekers can view matched jobs.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Your Matched Jobs</h2>
      <p className="muted">
        Based on your profile skills. <Link to="/profile">Update profile</Link> to improve matches.
      </p>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'tomato' }}>{error}</p>}

      {!loading && !error && matches.length === 0 && (
        <p>No matches found yet. Make sure your profile has skills and recruiters have posted jobs.</p>
      )}

      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        {matches.map((m) => (
          <div
            key={m.jobId}
            className="card subtle"
            style={{
              border: '1px solid #333',
              padding: '1rem',
              borderRadius: '4px',
              background: '#1e1e1e',
            }}
          >
            <h3>
              {m.title} – {m.company}
            </h3>
            <p>
              {m.location && `${m.location} • `}{m.jobType}
              {m.salaryRange && ` • ${m.salaryRange}`}
            </p>
            <p>Match score: <strong>{m.score}%</strong></p>

            {m.matchedSkills?.length > 0 && (
              <p>
                <strong>Matched skills:</strong> {m.matchedSkills.join(', ')}
              </p>
            )}
            {m.missingSkills?.length > 0 && (
              <p>
                <strong>Missing skills:</strong> {m.missingSkills.join(', ')}
              </p>
            )}
            {m.extraSkills?.length > 0 && (
              <p>
                <strong>Extra skills you have:</strong> {m.extraSkills.join(', ')}
              </p>
            )}

            <p style={{ marginTop: '0.5rem' }}>
              {m.description?.length > 200
                ? m.description.slice(0, 200) + '...'
                : m.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MatchedJobsPage;
