// RecruiterDashboard.jsx — Step 5: Full Recruiter Analytics Dashboard
// Pure SVG charts (no external lib) — hiring funnel, sparkline,
// pipeline table, top skills bar chart, KPI strip
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

// ── Mini components ──────────────────────────────────────────────────
function KPI({ label, value, color, sub }) {
  return (
    <div style={{ background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: 10, padding: '0.9rem 1.1rem', textAlign: 'center', flex: '1 1 120px', minWidth: 110 }}>
      <div style={{ fontSize: '1.65rem', fontWeight: 800, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: '0.7rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.1rem' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: '#374151', marginTop: '0.1rem' }}>{sub}</div>}
    </div>
  );
}

// SVG Sparkline (30-day applications line)
function Sparkline({ data, color = '#818cf8', height = 48 }) {
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
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill="url(#sg)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// SVG Hiring Funnel
function HiringFunnel({ funnel }) {
  if (!funnel?.length) return null;
  const max = funnel[0]?.count || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {funnel.map((step, i) => {
        const pct = max > 0 ? (step.count / max) * 100 : 0;
        const convPct = i > 0 && funnel[i-1].count > 0
          ? Math.round((step.count / funnel[i-1].count) * 100) : null;
        return (
          <div key={step.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <span style={{ color: '#9ca3af', fontSize: '0.82rem', fontWeight: 600 }}>{step.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {convPct !== null && (
                  <span style={{ fontSize: '0.7rem', color: '#4b5563' }}>{convPct}% of prev</span>
                )}
                <span style={{ fontWeight: 800, color: step.color, fontSize: '1.05rem', minWidth: 32, textAlign: 'right' }}>{step.count}</span>
              </div>
            </div>
            <div style={{ height: 8, background: '#1f2937', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: step.color, borderRadius: 4, transition: 'width 0.8s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Top Skills horizontal bar chart
function SkillsChart({ skills }) {
  if (!skills?.length) return <p style={{ color: '#4b5563', fontSize: '0.85rem' }}>No data yet.</p>;
  const max = skills[0]?.count || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
      {skills.map(({ skill, count }) => (
        <div key={skill}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
            <span style={{ color: '#9ca3af', fontSize: '0.8rem', textTransform: 'capitalize' }}>{skill}</span>
            <span style={{ color: '#6366f1', fontSize: '0.8rem', fontWeight: 700 }}>{count}</span>
          </div>
          <div style={{ height: 5, background: '#1f2937', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: 'linear-gradient(90deg,#6366f1,#818cf8)', borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const card = { background: '#070d1a', border: '1px solid #1f2937', borderRadius: 12, padding: '1.25rem 1.4rem', marginBottom: '1rem' };

export default function RecruiterDashboard() {
  const { user, API_BASE } = useAuth();
  const token = localStorage.getItem('token');

  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (user?.role !== 'recruiter') { setLoading(false); return; }
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/stats/recruiter`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setStats(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally { setLoading(false); }
    })();
  }, [API_BASE, user]);

  if (!user || user.role !== 'recruiter')
    return <div className="card"><p style={{ color: '#f87171' }}>Recruiters only.</p></div>;
  if (loading) return <div className="card"><p style={{ color: '#9ca3af' }}>⏳ Loading dashboard…</p></div>;
  if (error)   return <div className="card"><p style={{ color: '#f87171' }}>{error}</p></div>;

  const s = stats || {};

  return (
    <div style={{ maxWidth: 960, width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ color: '#e5e7eb', margin: 0 }}>📊 Recruiter Dashboard</h2>
          <p style={{ color: '#4b5563', fontSize: '0.83rem', margin: '0.2rem 0 0' }}>Hiring analytics & pipeline overview</p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Link to="/jobs/new"
            style={{ padding: '0.45rem 1.1rem', background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>
            + Post Job
          </Link>
          <Link to="/recruiter/applications"
            style={{ padding: '0.45rem 1.1rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, fontSize: '0.85rem', textDecoration: 'none' }}>
            All Applications
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <KPI label="Active Jobs"    value={s.activeJobs}          color="#818cf8" />
        <KPI label="Total Apps"     value={s.totalApplications}   color="#60a5fa" />
        <KPI label="Shortlisted"    value={s.shortlisted}         color="#34d399" sub={s.shortlistRate != null ? `${s.shortlistRate}% rate` : null} />
        <KPI label="Hired"          value={s.hired}               color="#a78bfa" sub={s.conversionRate != null ? `${s.conversionRate}% conv.` : null} />
        <KPI label="Avg Match"      value={s.avgMatchScore != null ? `${s.avgMatchScore}%` : '—'} color="#fbbf24" />
        {s.avgTimeToHire != null && <KPI label="Avg Days to Hire" value={s.avgTimeToHire} color="#f97316" sub="days" />}
      </div>

      {/* Row: Sparkline + Funnel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>

        <div style={card}>
          <div style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Applications — Last 30 Days</div>
          {s.sparkline?.some(d => d.count > 0) ? (
            <Sparkline data={s.sparkline} color="#818cf8" height={64} />
          ) : (
            <p style={{ color: '#374151', fontSize: '0.83rem', textAlign: 'center', padding: '1.5rem 0' }}>No applications yet</p>
          )}
          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#374151' }}>
            <span>{s.sparkline?.[0]?.date?.slice(5)}</span>
            <span>Today</span>
          </div>
        </div>

        <div style={card}>
          <div style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Hiring Funnel</div>
          <HiringFunnel funnel={s.funnel} />
        </div>
      </div>

      {/* Row: Jobs Pipeline + Top Skills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <span style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Job Pipeline</span>
            <Link to="/recruiter/jobs" style={{ color: '#6366f1', fontSize: '0.78rem' }}>View all →</Link>
          </div>
          {!s.jobPipeline?.length ? (
            <p style={{ color: '#374151', fontSize: '0.83rem' }}>No jobs posted yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {(s.jobPipeline || []).slice(0, 6).map(j => (
                <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/recruiter/jobs/${j.id}/candidates`}
                      style={{ color: '#e5e7eb', fontSize: '0.84rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: 180 }}>
                      {j.title}
                    </Link>
                    <div style={{ height: 4, background: '#1f2937', borderRadius: 2, marginTop: '0.25rem' }}>
                      <div style={{ height: '100%', width: `${j.total > 0 ? Math.min(100, (j.shortlisted / j.total) * 100 * 3) : 0}%`, background: '#34d399', borderRadius: 2 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.45rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700 }}>{j.total} apps</span>
                    {j.hired > 0 && <span style={{ fontSize: '0.72rem', color: '#a78bfa', fontWeight: 700 }}>🏆 {j.hired}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={card}>
          <div style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.85rem' }}>Top Demanded Skills</div>
          <SkillsChart skills={s.topSkills} />
        </div>
      </div>

      {/* Quick Actions */}
      <div style={card}>
        <div style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.85rem' }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          {[
            { label: '💼 Post New Job',       to: '/jobs/new' },
            { label: '👥 View Candidates',    to: '/recruiter/applications' },
            { label: '📄 My Listings',        to: '/recruiter/jobs' },
          ].map(a => (
            <Link key={a.to} to={a.to}
              style={{ padding: '0.55rem 1.2rem', background: '#0f172a', color: '#9ca3af', border: '1px solid #1f2937', borderRadius: 8, fontSize: '0.85rem', textDecoration: 'none', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.color = '#e5e7eb'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1f2937'; e.currentTarget.style.color = '#9ca3af'; }}>
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
