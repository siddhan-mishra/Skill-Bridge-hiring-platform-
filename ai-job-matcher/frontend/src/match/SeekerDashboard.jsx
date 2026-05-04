// SeekerDashboard.jsx — Step 5: Full Seeker Dashboard
// Profile completeness ring, application timeline sparkline,
// KPI strip, recent applications, skill-gap nudge
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

const scoreColor = (s) => s >= 75 ? '#34d399' : s >= 50 ? '#fbbf24' : s >= 25 ? '#f97316' : '#f87171';

const STATUS_STYLE = {
  pending:     { color: '#fbbf24', bg: 'rgba(245,158,11,0.1)'   },
  reviewed:    { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'   },
  shortlisted: { color: '#34d399', bg: 'rgba(16,185,129,0.1)'   },
  rejected:    { color: '#f87171', bg: 'rgba(239,68,68,0.08)'   },
  hired:       { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)'  },
};

function CompletenessRing({ pct }) {
  const c = pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171';
  return (
    <div style={{ position: 'relative', width: 80, height: 80 }}>
      <svg viewBox="0 0 36 36" style={{ width: 80, height: 80, transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f2937" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={c} strokeWidth="3"
          strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '0.95rem', fontWeight: 800, color: c }}>
        {pct}%
      </span>
    </div>
  );
}

function Sparkline({ data, color = '#818cf8', height = 44 }) {
  if (!data?.length) return null;
  const W = 300; const H = height;
  const max = Math.max(...data.map(d => d.count), 1);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - (d.count / max) * (H - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const fill = `${pts} ${W},${H} 0,${H}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill="url(#spg)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function KPI({ label, value, color, sub }) {
  return (
    <div style={{ background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: 10, padding: '0.85rem 1rem', textAlign: 'center', flex: '1 1 110px', minWidth: 100 }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: '0.69rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.1rem' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.69rem', color: '#374151', marginTop: '0.1rem' }}>{sub}</div>}
    </div>
  );
}

const card = { background: '#070d1a', border: '1px solid #1f2937', borderRadius: 12, padding: '1.25rem 1.4rem', marginBottom: '1rem' };

export default function SeekerDashboard() {
  const { user, API_BASE } = useAuth();
  const token = localStorage.getItem('token');

  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!user || user.role !== 'seeker') { setLoading(false); return; }
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/stats/seeker`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally { setLoading(false); }
    })();
  }, [API_BASE, user, token]);

  if (!user || user.role !== 'seeker')
    return <div className="card"><p style={{ color: '#f87171' }}>Seekers only.</p></div>;
  if (loading) return <div className="card"><p style={{ color: '#9ca3af' }}>⏳ Loading dashboard…</p></div>;
  if (error)   return <div className="card"><p style={{ color: '#f87171' }}>{error}</p></div>;

  const s = stats || {};
  const pct = s.profileCompleteness || 0;

  return (
    <div style={{ maxWidth: 900, width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ color: '#e5e7eb', margin: 0 }}>🎯 Your Dashboard</h2>
          <p style={{ color: '#4b5563', fontSize: '0.83rem', margin: '0.2rem 0 0' }}>Track your job search progress</p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Link to="/matches"
            style={{ padding: '0.45rem 1.1rem', background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>
            🔍 Find Matches
          </Link>
          <Link to="/profile/edit"
            style={{ padding: '0.45rem 1.1rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, fontSize: '0.85rem', textDecoration: 'none' }}>
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Profile completeness card */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <CompletenessRing pct={pct} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ color: '#e5e7eb', fontWeight: 700, fontSize: '1rem' }}>Profile Completeness</div>
          <div style={{ color: '#4b5563', fontSize: '0.83rem', marginTop: '0.2rem' }}>
            {pct < 40 ? '⚠️ Your profile is too sparse — recruiters won\'t find you. Add skills, work history and a summary.' :
             pct < 70 ? '📊 Good start! Add more details to rank higher in recruiter searches.' :
             pct < 90 ? '✅ Almost there. A polished profile gets 3× more matches.' :
             '🚀 Excellent profile! You\'re showing up in AI-matched results.'}
          </div>
          {pct < 100 && (
            <Link to="/profile/edit" style={{ display: 'inline-block', marginTop: '0.5rem', color: '#6366f1', fontSize: '0.82rem' }}>Complete your profile →</Link>
          )}
        </div>
        {/* Score breakdown buckets */}
        {s.total > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {Object.entries(s.scoreBuckets || {}).map(([range, count]) => (
              <div key={range} style={{ textAlign: 'center', minWidth: 52 }}>
                <div style={{ fontWeight: 700, color: scoreColor(parseInt(range)), fontSize: '1.1rem' }}>{count}</div>
                <div style={{ fontSize: '0.65rem', color: '#4b5563' }}>{range}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <KPI label="Applied"     value={s.total}       color="#60a5fa" />
        <KPI label="Pending"     value={s.pending}     color="#fbbf24" />
        <KPI label="Shortlisted" value={s.shortlisted} color="#34d399" sub={s.shortlistRate != null ? `${s.shortlistRate}%` : null} />
        <KPI label="Hired"       value={s.hired}       color="#a78bfa" />
        <KPI label="Avg Match"   value={s.avgMatchScore != null ? `${s.avgMatchScore}%` : '—'} color="#818cf8" />
      </div>

      {/* Application sparkline */}
      <div style={card}>
        <div style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>Applications — Last 30 Days</div>
        {s.sparkline?.some(d => d.count > 0) ? (
          <Sparkline data={s.sparkline} color="#60a5fa" height={56} />
        ) : (
          <p style={{ color: '#374151', fontSize: '0.83rem', textAlign: 'center', padding: '1rem 0' }}>No applications in the last 30 days</p>
        )}
      </div>

      {/* Recent Applications */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <span style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Applications</span>
          <Link to="/applications" style={{ color: '#6366f1', fontSize: '0.78rem' }}>View all →</Link>
        </div>
        {!s.recentApps?.length ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <p style={{ color: '#4b5563', marginBottom: '0.75rem' }}>No applications yet.</p>
            <Link to="/matches" style={{ color: '#6366f1', fontSize: '0.88rem' }}>Browse matched jobs →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {s.recentApps.map(app => {
              const sc = STATUS_STYLE[app.status] || STATUS_STYLE.pending;
              return (
                <div key={app._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', background: '#0f172a', borderRadius: 8, gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <Link to={`/jobs/${app.jobId}`} style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '0.88rem' }}>{app.jobTitle}</Link>
                    <div style={{ color: '#4b5563', fontSize: '0.78rem' }}>{app.company} · {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, color: scoreColor(app.matchScore), fontSize: '0.82rem' }}>{app.matchScore}%</span>
                    <span style={{ padding: '0.15rem 0.55rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600, background: sc.bg, color: sc.color }}>{app.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Skill-gap nudge + quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div style={card}>
          <div style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>🔧 Improve Your Match</div>
          <p style={{ color: '#4b5563', fontSize: '0.83rem', marginBottom: '0.75rem' }}>See which skills are most demanded in jobs matching your profile.</p>
          <Link to="/matches"
            style={{ display: 'inline-block', padding: '0.45rem 1rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 7, fontSize: '0.83rem', textDecoration: 'none' }}>
            View Matched Jobs →
          </Link>
        </div>
        <div style={card}>
          <div style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>⚡ Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { label: '🔍 Browse Matches',    to: '/matches' },
              { label: '📎 My Applications', to: '/applications' },
              { label: '👤 Edit Profile',      to: '/profile/edit' },
              { label: '💼 All Jobs',           to: '/jobs' },
            ].map(a => (
              <Link key={a.to} to={a.to}
                style={{ color: '#9ca3af', fontSize: '0.84rem', padding: '0.35rem 0.6rem', borderRadius: 6, textDecoration: 'none', background: '#0f172a' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#e5e7eb'; e.currentTarget.style.background = '#1f2937'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = '#0f172a'; }}>
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
