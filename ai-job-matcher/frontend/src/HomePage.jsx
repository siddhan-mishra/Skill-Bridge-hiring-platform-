import { Link } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';

const FEATURES = [
  {
    icon: '🤝',
    title: 'AI Skill Matching',
    desc: 'Synonym-aware algorithm ranks jobs by how well your skills fit — "ReactJS" and "React" are treated the same.',
    tag: 'LIVE',
  },
  {
    icon: '📄',
    title: 'Smart Resume Parser',
    desc: 'Upload your PDF resume and auto-populate your entire profile in seconds using Gemini AI.',
    tag: 'LIVE',
  },
  {
    icon: '✉️',
    title: 'Email Notifications',
    desc: 'Recruiters get alerted on new applications. Seekers get notified on every status change: reviewed, shortlisted, or rejected.',
    tag: 'LIVE',
  },
  {
    icon: '📈',
    title: 'Recruiter Dashboard',
    desc: 'Full hiring pipeline: post jobs, track application counts, view shortlisted candidates, see avg match scores.',
    tag: 'LIVE',
  },
  {
    icon: '📊',
    title: 'Seeker Dashboard',
    desc: 'Track all your applications, profile completeness score, and top job matches in one clean view.',
    tag: 'LIVE',
  },
  {
    icon: '🔍',
    title: 'Advanced Job Search',
    desc: 'Filter by title, company, skill, location, job type, and sort order — all in real time.',
    tag: 'LIVE',
  },
  {
    icon: '💡',
    title: 'Skill Gap Analysis',
    desc: 'See exactly which skills you are missing for each job, and which top skills to learn to unlock more opportunities.',
    tag: 'LIVE',
  },
  {
    icon: '🧑\u200d💼',
    title: 'Public Profiles',
    desc: 'Shareable candidate profiles with avatar, resume link, work history, projects, and certifications.',
    tag: 'LIVE',
  },
];

const STATS = [
  { value: '8',     label: 'Core Features Live' },
  { value: 'AI',    label: 'Powered Matching'   },
  { value: '100%',  label: 'Free for Seekers'   },
  { value: '∞',     label: 'Possibilities'      },
];

const HOW_IT_WORKS_SEEKER = [
  { step: '01', title: 'Create your profile',   desc: 'Upload resume or fill in skills manually. AI auto-fills everything.' },
  { step: '02', title: 'Browse matched jobs',   desc: 'See every job ranked by how well your skills fit, with gaps highlighted.' },
  { step: '03', title: 'Apply in one click',    desc: 'Quick Apply from the matches page or write a cover note on the job page.' },
  { step: '04', title: 'Track your pipeline',   desc: 'Dashboard shows pending, reviewed, shortlisted applications. Email alerts on every update.' },
];

const HOW_IT_WORKS_RECRUITER = [
  { step: '01', title: 'Post a job',             desc: 'Add title, description, required skills, location, and salary range.' },
  { step: '02', title: 'AI ranks candidates',    desc: 'Every seeker is scored against your job skills. Best matches float to the top.' },
  { step: '03', title: 'Review applications',    desc: 'View applicants with match scores, skills, and cover notes. One click to shortlist or reject.' },
  { step: '04', title: 'Auto-notify candidates', desc: 'Seekers get a beautiful email the moment you update their status.' },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div style={{ width: '100%', maxWidth: 960 }}>

      {/* ── Hero ── */}
      <div style={{ textAlign: 'center', padding: '3.5rem 1rem 2rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 350, background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', padding: '0.3rem 0.9rem', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '999px', fontSize: '0.76rem', color: '#818cf8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            🚀 8 Core Features Live
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 1.1rem', letterSpacing: '-0.02em' }}>
            Find jobs that <span style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>actually</span> match<br />your skills
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#9ca3af', maxWidth: 540, margin: '0 auto 2rem', lineHeight: 1.75 }}>
            SkillBridge connects IT graduates with the right opportunities using synonym-aware AI skill matching, automated emails, dashboards, and a full hiring pipeline.
          </p>
          {!user && (
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.65rem 1.8rem', fontSize: '0.95rem', fontWeight: 600 }}>Get started free →</Link>
              <Link to="/jobs"     className="btn btn-ghost"   style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem' }}>Browse jobs</Link>
            </div>
          )}
          {user?.role === 'seeker' && (
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/dashboard"  className="btn btn-primary" style={{ padding: '0.65rem 1.8rem', fontWeight: 600 }}>My Dashboard →</Link>
              <Link to="/matches"    className="btn btn-ghost"   style={{ padding: '0.65rem 1.5rem' }}>View Matches</Link>
              <Link to="/jobs"       className="btn btn-ghost"   style={{ padding: '0.65rem 1.5rem' }}>Browse Jobs</Link>
            </div>
          )}
          {user?.role === 'recruiter' && (
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/recruiter/dashboard" className="btn btn-primary" style={{ padding: '0.65rem 1.8rem', fontWeight: 600 }}>My Dashboard →</Link>
              <Link to="/jobs/new"            className="btn btn-ghost"   style={{ padding: '0.65rem 1.5rem' }}>Post a Job</Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#1f2937', border: '1px solid #1f2937', borderRadius: '12px', overflow: 'hidden', marginBottom: '3rem' }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ background: '#070d1a', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#818cf8' }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.2rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Features grid ── */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.75rem' }}>Everything that’s built and working</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))', gap: '0.85rem' }}>
          {FEATURES.map((f, i) => (
            <div key={i}
              style={{ background: '#070d1a', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.3rem', position: 'relative', transition: 'border-color 0.18s, transform 0.18s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1f2937'; e.currentTarget.style.transform = 'none'; }}
            >
              {f.tag && (
                <span style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', padding: '0.1rem 0.45rem', background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '999px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em' }}>{f.tag}</span>
              )}
              <div style={{ fontSize: '1.5rem', marginBottom: '0.65rem' }}>{f.icon}</div>
              <div style={{ fontWeight: 600, color: '#e5e7eb', marginBottom: '0.35rem', fontSize: '0.93rem' }}>{f.title}</div>
              <div style={{ color: '#6b7280', fontSize: '0.82rem', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 700, marginBottom: '2rem' }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

          {/* Seeker flow */}
          <div style={{ background: '#070d1a', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>For Job Seekers</div>
            {HOW_IT_WORKS_SEEKER.map(s => (
              <div key={s.step} style={{ display: 'flex', gap: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ minWidth: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', color: '#818cf8', fontWeight: 700, flexShrink: 0 }}>{s.step}</div>
                <div>
                  <div style={{ fontWeight: 600, color: '#e5e7eb', fontSize: '0.88rem' }}>{s.title}</div>
                  <div style={{ color: '#6b7280', fontSize: '0.8rem', lineHeight: 1.55, marginTop: '0.15rem' }}>{s.desc}</div>
                </div>
              </div>
            ))}
            {!user && <Link to="/register" className="btn btn-secondary" style={{ fontSize: '0.82rem', marginTop: '0.5rem' }}>Join as Seeker →</Link>}
            {user?.role === 'seeker' && <Link to="/dashboard" className="btn btn-secondary" style={{ fontSize: '0.82rem', marginTop: '0.5rem' }}>Go to Dashboard →</Link>}
          </div>

          {/* Recruiter flow */}
          <div style={{ background: '#070d1a', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>For Recruiters</div>
            {HOW_IT_WORKS_RECRUITER.map(s => (
              <div key={s.step} style={{ display: 'flex', gap: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ minWidth: 28, height: 28, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', color: '#34d399', fontWeight: 700, flexShrink: 0 }}>{s.step}</div>
                <div>
                  <div style={{ fontWeight: 600, color: '#e5e7eb', fontSize: '0.88rem' }}>{s.title}</div>
                  <div style={{ color: '#6b7280', fontSize: '0.8rem', lineHeight: 1.55, marginTop: '0.15rem' }}>{s.desc}</div>
                </div>
              </div>
            ))}
            {!user && <Link to="/register" className="btn" style={{ fontSize: '0.82rem', marginTop: '0.5rem', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>Join as Recruiter →</Link>}
            {user?.role === 'recruiter' && <Link to="/recruiter/dashboard" className="btn" style={{ fontSize: '0.82rem', marginTop: '0.5rem', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>Go to Dashboard →</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}
