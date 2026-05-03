import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

const statusMeta = {
  pending:     { color: '#fbbf24', label: 'Pending',     icon: '📋' },
  reviewed:    { color: '#60a5fa', label: 'Reviewed',    icon: '👀' },
  shortlisted: { color: '#34d399', label: 'Shortlisted', icon: '🎉' },
  rejected:    { color: '#f87171', label: 'Rejected',    icon: '😔' },
};

function StatCard({ label, value, color, to, subtitle }) {
  const navigate = useNavigate();
  const clickable = Boolean(to);
  return (
    <div
      onClick={() => clickable && navigate(to)}
      title={clickable ? `Click to view ${label}` : undefined}
      style={{
        background: '#070d1a',
        border: `1px solid ${clickable ? color + '33' : '#1f2937'}`,
        borderRadius: '10px',
        padding: '1.1rem',
        textAlign: 'center',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'border-color 0.15s, transform 0.15s',
        position: 'relative',
      }}
      onMouseEnter={e => { if (clickable) { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
      onMouseLeave={e => { if (clickable) { e.currentTarget.style.borderColor = color + '33'; e.currentTarget.style.transform = 'none'; } }}
    >
      {clickable && (
        <span style={{ position: 'absolute', top: '0.5rem', right: '0.6rem', fontSize: '0.62rem', color: '#4b5563' }}>↗</span>
      )}
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.2rem' }}>{label}</div>
      {subtitle && <div style={{ fontSize: '0.68rem', color: color + 'aa', marginTop: '0.15rem' }}>{subtitle}</div>}
    </div>
  );
}

export default function RecruiterDashboard() {
  const { user, API_BASE } = useAuth();
  const token = localStorage.getItem('token');

  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'recruiter') { setLoading(false); return; }
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/stats/recruiter`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [API_BASE, user, token]);

  if (!user || user.role !== 'recruiter') return <div className="card"><p>Recruiters only.</p></div>;
  if (loading) return <div className="card"><p>Loading…</p></div>;
  if (!stats)  return <div className="card"><p style={{ color: '#f87171' }}>Failed to load stats.</p></div>;

  return (
    <div style={{ maxWidth: 900, width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.2rem' }}>Recruiter Dashboard 🏢</h2>
        <p style={{ color: '#6b7280', margin: 0, fontSize: '0.88rem' }}>Your hiring pipeline — click any card to drill down</p>
      </div>

      {/* ── Stat cards — all clickable ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <StatCard
          label="Jobs Posted"
          value={stats.totalJobs}
          color="#818cf8"
          to="/recruiter/jobs"
          subtitle="click to manage"
        />
        <StatCard
          label="Total Applicants"
          value={stats.totalApplications}
          color="#60a5fa"
          to="/recruiter/applications"
          subtitle="all applications"
        />
        <StatCard
          label="Shortlisted"
          value={stats.shortlisted}
          color="#34d399"
          to="/recruiter/applications?filter=shortlisted"
          subtitle="email shared ✓"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          color="#f87171"
          to="/recruiter/applications?filter=rejected"
        />
        <StatCard
          label="Avg Match Score"
          value={`${stats.avgMatchScore}%`}
          color="#a78bfa"
        />
      </div>

      {/* ── Pipeline + Top Jobs — 2-col grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>

        {/* Pipeline breakdown */}
        <div style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '10px', padding: '1.1rem 1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Pipeline Breakdown</h3>
          {Object.entries(statusMeta).map(([key, meta]) => {
            const count = stats[key] || 0;
            const pct   = stats.totalApplications > 0 ? Math.round((count / stats.totalApplications) * 100) : 0;
            return (
              <Link
                key={key}
                to={`/recruiter/applications?filter=${key}`}
                style={{ display: 'block', textDecoration: 'none', marginBottom: '0.8rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.82rem', color: meta.color }}>{meta.icon} {meta.label}</span>
                  <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{count} ({pct}%)</span>
                </div>
                <div style={{ height: 5, background: '#1f2937', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: '999px', transition: 'width 0.4s' }} />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Top jobs */}
        <div style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '10px', padding: '1.1rem 1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Most Applied Jobs</h3>
          {stats.topJobs.length === 0 ? (
            <p style={{ color: '#4b5563', fontSize: '0.84rem' }}>No applications yet.</p>
          ) : (
            stats.topJobs.map((j, i) => (
              <Link key={j.id} to={`/recruiter/jobs/${j.id}/candidates`} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.55rem 0', borderBottom: '1px solid #0f172a', alignItems: 'center', textDecoration: 'none' }}>
                <div>
                  <span style={{ color: '#4b5563', fontSize: '0.76rem', marginRight: '0.4rem' }}>#{i + 1}</span>
                  <span style={{ fontSize: '0.84rem', color: '#e5e7eb' }}>{j.title}</span>
                  <div style={{ fontSize: '0.74rem', color: '#4b5563', marginLeft: '1.3rem' }}>{j.company}</div>
                </div>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#60a5fa', flexShrink: 0 }}>{j.count} 📥</span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link to="/recruiter/jobs"         className="btn btn-secondary">💼 My Jobs</Link>
        <Link to="/recruiter/applications" className="btn btn-secondary">📥 All Applications</Link>
        <Link to="/jobs/new"               className="btn btn-primary">+ Post New Job</Link>
      </div>
    </div>
  );
}
