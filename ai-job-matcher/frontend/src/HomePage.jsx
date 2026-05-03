import { Link } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';

const FEATURES = [
  { icon: '🤝', title: 'Skill-Based Matching', desc: 'Our algorithm ranks jobs by how well your actual skills fit — not keywords, not guesswork.' },
  { icon: '📄', title: 'Smart Resume Parser', desc: 'Upload your PDF resume and auto-fill your entire profile in seconds using AI.' },
  { icon: '📬', title: 'Real-Time Notifications', desc: 'Get email alerts the moment a recruiter reviews or shortlists your application.' },
  { icon: '🏢', title: 'Recruiter Dashboard', desc: 'Post jobs, browse AI-ranked candidates, and manage your entire pipeline in one place.' },
];

const STATS = [
  { value: 'AI', label: 'Powered Matching' },
  { value: '100%', label: 'Free for Seekers' },
  { value: '4', label: 'Core Features Live' },
  { value: '∞', label: 'Possibilities' },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div style={{ width: '100%', maxWidth: 960 }}>

      {/* ── Hero ── */}
      <div style={{ textAlign: 'center', padding: '3.5rem 1rem 2.5rem', position: 'relative' }}>
        {/* Glow orb behind title */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 300, background: 'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', padding: '0.3rem 0.9rem', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '999px', fontSize: '0.78rem', color: '#818cf8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            🚀 AI-Powered Job Matching Platform
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 1.2rem', letterSpacing: '-0.02em' }}>
            Find jobs that <span style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>actually</span> match
            <br />your skills
          </h1>

          <p style={{ fontSize: '1.1rem', color: '#9ca3af', maxWidth: 520, margin: '0 auto 2rem', lineHeight: 1.7 }}>
            SkillBridge connects fresh IT graduates with the right opportunities using AI-powered skill matching — no spam, no irrelevant listings.
          </p>

          {!user && (
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.65rem 1.8rem', fontSize: '0.95rem', fontWeight: 600 }}>Get started free →</Link>
              <Link to="/jobs" className="btn btn-ghost" style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem' }}>Browse jobs</Link>
            </div>
          )}

          {user?.role === 'seeker' && (
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/dashboard" className="btn btn-primary" style={{ padding: '0.65rem 1.8rem', fontSize: '0.95rem', fontWeight: 600 }}>My Dashboard →</Link>
              <Link to="/matches" className="btn btn-ghost" style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem' }}>View Matches</Link>
            </div>
          )}

          {user?.role === 'recruiter' && (
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/jobs/new" className="btn btn-primary" style={{ padding: '0.65rem 1.8rem', fontSize: '0.95rem', fontWeight: 600 }}>Post a Job →</Link>
              <Link to="/recruiter/jobs" className="btn btn-ghost" style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem' }}>My Jobs</Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1px', background: '#1f2937', border: '1px solid #1f2937', borderRadius: '12px', overflow: 'hidden', marginBottom: '3rem' }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ background: '#070d1a', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#818cf8' }}>{s.value}</div>
            <div style={{ fontSize: '0.74rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.2rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Features grid ── */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.75rem', color: '#e5e7eb' }}>Everything you need</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.4rem', transition: 'border-color 0.2s, transform 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1f2937'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{ fontSize: '1.6rem', marginBottom: '0.75rem' }}>{f.icon}</div>
              <div style={{ fontWeight: 600, color: '#e5e7eb', marginBottom: '0.4rem', fontSize: '0.95rem' }}>{f.title}</div>
              <div style={{ color: '#6b7280', fontSize: '0.84rem', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dual CTA (only for guests) ── */}
      {!user && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '12px', padding: '1.75rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>For Job Seekers</div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#e5e7eb' }}>Land your dream job</h3>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1rem' }}>Upload your resume, build your profile, and let AI match you with jobs that actually fit your skills.</p>
            <Link to="/register" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>Create free account →</Link>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.03))', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '1.75rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>For Recruiters</div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#e5e7eb' }}>Find the right candidate</h3>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1rem' }}>Post your job, let our AI rank every candidate by skill match. No noise, no irrelevant applications.</p>
            <Link to="/register" className="btn" style={{ fontSize: '0.85rem', background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>Post a job →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
