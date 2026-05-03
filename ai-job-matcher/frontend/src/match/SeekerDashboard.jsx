import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

const statusMeta = {
  pending:     { emoji: '📋', label: 'Pending',        color: '#818cf8', bg: 'rgba(99,102,241,0.1)'  },
  reviewed:    { emoji: '👀', label: 'Under Review',   color: '#fbbf24', bg: 'rgba(245,158,11,0.1)'  },
  shortlisted: { emoji: '🎉', label: 'Shortlisted',    color: '#34d399', bg: 'rgba(16,185,129,0.1)'  },
  rejected:    { emoji: '😔', label: 'Not Selected',   color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
};

export default function SeekerDashboard() {
  const { user, API_BASE } = useAuth();
  const token = localStorage.getItem('token');

  const [apps,     setApps]     = useState([]);
  const [profile,  setProfile]  = useState(null);
  const [matches,  setMatches]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [appsRes, profRes] = await Promise.all([
          axios.get(`${API_BASE}/api/applications/my`, { headers }),
          axios.get(`${API_BASE}/api/profile/me`, { headers }),
        ]);
        setApps(appsRes.data);
        setProfile(profRes.data);
        // Only fetch matches if profile has skills
        if (profRes.data?.skills?.length > 0) {
          try {
            const mRes = await axios.get(`${API_BASE}/api/match/matches`, { headers });
            setMatches(mRes.data.slice(0, 5)); // top 5
          } catch {}
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [API_BASE, token]);

  if (loading) return <div className="card"><p>Loading dashboard…</p></div>;

  // Profile completeness calculation
  const fields = ['fullName','headline','phone','location','summary','skills','currentTitle','education','workHistory','projects'];
  const filled  = fields.filter(f => {
    const v = profile?.[f];
    if (Array.isArray(v)) return v.length > 0;
    return v && String(v).trim() !== '';
  }).length;
  const completeness = Math.round((filled / fields.length) * 100);

  const statCard = (label, value, color, to) => (
    <Link to={to || '#'} style={{ textDecoration: 'none' }}>
      <div style={{ background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: '10px', padding: '1.1rem 1.4rem', textAlign: 'center', cursor: to ? 'pointer' : 'default', transition: 'border-color 0.15s' }}
        onMouseEnter={e => { if (to) e.currentTarget.style.borderColor = color; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#1f2937'; }}
      >
        <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{value}</div>
        <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      </div>
    </Link>
  );

  const counts = {
    pending:     apps.filter(a => a.status === 'pending').length,
    reviewed:    apps.filter(a => a.status === 'reviewed').length,
    shortlisted: apps.filter(a => a.status === 'shortlisted').length,
    rejected:    apps.filter(a => a.status === 'rejected').length,
  };

  return (
    <div style={{ maxWidth: 860, width: '100%' }}>
      {/* Welcome */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.4rem' }}>Welcome back, {profile?.fullName || user?.name} 👋</h2>
        <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>Here's your job search overview</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {statCard('Profile', `${completeness}%`, completeness >= 80 ? '#34d399' : '#fbbf24', '/profile/edit')}
        {statCard('Applied', apps.length, '#818cf8', '/applications')}
        {statCard('Shortlisted', counts.shortlisted, '#34d399', '/applications')}
        {statCard('Top Matches', matches.length > 0 ? `${matches[0]?.score || 0}%` : '—', '#6366f1', '/matches')}
      </div>

      {/* Profile completeness bar */}
      {completeness < 100 && (
        <div style={{ background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Profile Completeness</span>
            <span style={{ fontSize: '0.85rem', color: completeness >= 80 ? '#34d399' : '#fbbf24', fontWeight: 600 }}>{completeness}%</span>
          </div>
          <div style={{ height: 6, background: '#1f2937', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${completeness}%`, background: completeness >= 80 ? '#34d399' : '#fbbf24', borderRadius: '999px', transition: 'width 0.5s ease' }} />
          </div>
          <p style={{ fontSize: '0.78rem', color: '#4b5563', marginTop: '0.5rem', marginBottom: 0 }}>
            {completeness < 50 ? '🔴 Add more details to improve your match score.' : completeness < 80 ? '🟡 Good progress! A few more fields will help.' : '🟢 Almost complete!'}
            {' '}<Link to="/profile/edit" style={{ color: '#6366f1' }}>Complete profile →</Link>
          </p>
        </div>
      )}

      {/* Applications list */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Left: recent applications */}
        <div style={{ background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.92rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Applications</h3>
            <Link to="/applications" style={{ fontSize: '0.78rem', color: '#6366f1' }}>View all →</Link>
          </div>
          {apps.length === 0 ? (
            <p style={{ color: '#4b5563', fontSize: '0.85rem' }}>No applications yet. <Link to="/jobs" style={{ color: '#6366f1' }}>Browse jobs →</Link></p>
          ) : (
            apps.slice(0, 5).map(app => {
              const sm = statusMeta[app.status] || statusMeta.pending;
              return (
                <div key={app._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.6rem 0', borderBottom: '1px solid #0f172a' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#e5e7eb', fontWeight: 600 }}>{app.job?.title || 'Unknown Job'}</div>
                    <div style={{ fontSize: '0.76rem', color: '#6b7280' }}>{app.job?.company}</div>
                  </div>
                  <span style={{ padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', background: sm.bg, color: sm.color, whiteSpace: 'nowrap' }}>{sm.emoji} {sm.label}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Right: top job matches */}
        <div style={{ background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.92rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top Matches</h3>
            <Link to="/matches" style={{ fontSize: '0.78rem', color: '#6366f1' }}>View all →</Link>
          </div>
          {matches.length === 0 ? (
            <p style={{ color: '#4b5563', fontSize: '0.85rem' }}>Add skills to your profile to see matches. <Link to="/profile/edit" style={{ color: '#6366f1' }}>Edit profile →</Link></p>
          ) : (
            matches.map(m => (
              <div key={m.jobId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.6rem 0', borderBottom: '1px solid #0f172a' }}>
                <div>
                  <Link to={`/jobs/${m.jobId}`} style={{ fontSize: '0.85rem', color: '#e5e7eb', fontWeight: 600 }}>{m.title}</Link>
                  <div style={{ fontSize: '0.76rem', color: '#6b7280' }}>{m.company}</div>
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: m.score >= 70 ? '#34d399' : m.score >= 40 ? '#fbbf24' : '#f87171' }}>{m.score}%</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
        <Link to="/jobs" className="btn btn-secondary">🔍 Browse Jobs</Link>
        <Link to="/matches" className="btn btn-secondary">🤝 View Matches</Link>
        <Link to="/profile/edit" className="btn btn-secondary">✏️ Edit Profile</Link>
      </div>
    </div>
  );
}
