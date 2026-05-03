// HomePage.jsx — Modern dark UI matching the app design system
import { Link } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  const features = [
    { icon: '🤖', title: 'AI Job Matching', desc: 'Upload your resume and get matched to the best jobs using Gemini AI — no keyword guessing.' },
    { icon: '📄', title: 'Resume Parser', desc: 'Paste your PDF and watch your profile fill itself — name, skills, work history, projects — all auto-extracted.' },
    { icon: '🎯', title: 'Skill Analysis', desc: 'NLP scans your headline and summary to identify hidden skills and surface them automatically.' },
    { icon: '🏢', title: 'Recruiter Dashboard', desc: 'Post jobs, browse ranked candidates, and get instant match scores — built for speed.' },
    { icon: '📊', title: 'Match Scoring', desc: 'Every job match comes with a transparent score breakdown — see exactly why you match or don\'t.' },
    { icon: '🔒', title: 'Privacy First', desc: 'Your data stays yours. Control what recruiters see on your public profile at all times.' },
  ];

  const steps = [
    { n: '01', title: 'Create Account', desc: 'Sign up as a job seeker or recruiter in under 30 seconds.' },
    { n: '02', title: 'Upload Resume', desc: 'AI parses your PDF and fills your entire profile automatically.' },
    { n: '03', title: 'Get Matched', desc: 'Our engine scores every job against your profile in real time.' },
    { n: '04', title: 'Apply & Connect', desc: 'Apply with one click. Recruiters see your AI-ranked profile first.' },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: '5rem' }}>

      {/* ═══ HERO ══════════════════════════════════════════════════════════════ */}
      <div style={{
        textAlign: 'center',
        padding: '4rem 1rem 3rem',
        background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(90,176,224,0.12) 0%, transparent 70%)',
        borderRadius: '0 0 20px 20px',
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.9rem', background: 'rgba(90,176,224,0.08)', border: '1px solid rgba(90,176,224,0.2)', borderRadius: '20px', fontSize: '0.75rem', color: '#5ab0e0', marginBottom: '1.5rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          ✦ AI-Powered Hiring Platform
        </div>
        <h1 style={{ fontSize: 'clamp(2rem,6vw,3.2rem)', fontWeight: 800, color: '#eee', margin: '0 0 1rem', lineHeight: 1.2 }}>
          Find the right job.<br />
          <span style={{ background: 'linear-gradient(90deg,#5ab0e0,#7ac,#6bcb77)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Not just any job.</span>
        </h1>
        <p style={{ color: '#666', fontSize: '1.05rem', maxWidth: 560, margin: '0 auto 2rem', lineHeight: 1.75 }}>
          SkillBridge uses AI to read your resume, extract your skills, and match you to jobs that actually fit — in seconds.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <>
              <Link to={user.role === 'seeker' ? '/profile/edit' : '/employer/dashboard'} style={btn.primary}>
                {user.role === 'seeker' ? '→ My Profile' : '→ Dashboard'}
              </Link>
              <Link to="/jobs" style={btn.secondary}>Browse Jobs</Link>
            </>
          ) : (
            <>
              <Link to="/register" style={btn.primary}>Get Started Free</Link>
              <Link to="/login" style={btn.secondary}>Sign In</Link>
            </>
          )}
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', marginTop: '3rem', flexWrap: 'wrap' }}>
          {[['AI-Powered', 'Matching'], ['Resume', 'Auto-fill'], ['Real-time', 'Scoring']].map(([a, b], i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#5ab0e0' }}>{a}</div>
              <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.1rem' }}>{b}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ HOW IT WORKS ══════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: '1rem' }}>
        <SectionLabel>How It Works</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1px', background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', overflow: 'hidden' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ padding: '1.5rem 1.25rem', background: '#0a0a0a', position: 'relative' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'rgba(90,176,224,0.12)', fontFamily: 'monospace', marginBottom: '0.5rem' }}>{s.n}</div>
              <div style={{ fontWeight: 600, color: '#ddd', fontSize: '0.92rem', marginBottom: '0.35rem' }}>{s.title}</div>
              <div style={{ color: '#555', fontSize: '0.82rem', lineHeight: 1.6 }}>{s.desc}</div>
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', right: -1, top: '50%', transform: 'translateY(-50%)', color: '#1e1e1e', fontSize: '1.2rem', zIndex: 1 }}>›</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ FEATURES ══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: '1rem' }}>
        <SectionLabel>Platform Features</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '0.75rem' }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px',
              padding: '1.25rem', transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#1a3a5a'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a1a'}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.6rem' }}>{f.icon}</div>
              <div style={{ fontWeight: 600, color: '#ddd', fontSize: '0.9rem', marginBottom: '0.35rem' }}>{f.title}</div>
              <div style={{ color: '#555', fontSize: '0.82rem', lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ CTA BANNER ════════════════════════════════════════════════════════ */}
      {!user && (
        <div style={{
          background: 'linear-gradient(135deg, #080f1a 0%, #0a1a10 100%)',
          border: '1px solid #1a3a2a', borderRadius: '12px',
          padding: '2.5rem', textAlign: 'center',
        }}>
          <h2 style={{ margin: '0 0 0.6rem', color: '#eee', fontSize: '1.4rem', fontWeight: 700 }}>Ready to get matched?</h2>
          <p style={{ color: '#555', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>Create your profile in minutes. Let AI do the rest.</p>
          <Link to="/register" style={{ ...btn.primary, fontSize: '0.9rem' }}>Create Free Account →</Link>
        </div>
      )}

    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
      <span style={{ fontSize: '0.7rem', color: '#5ab0e0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{children}</span>
      <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg,transparent,#5ab0e0,transparent)', margin: '0.4rem auto 0' }} />
    </div>
  );
}

const btn = {
  primary: {
    display: 'inline-block', padding: '0.6rem 1.6rem',
    background: 'linear-gradient(135deg,#0e3a5a,#0a2a44)',
    color: '#5ab0e0', border: '1px solid #1a5a7a',
    borderRadius: '8px', textDecoration: 'none',
    fontWeight: 700, fontSize: '0.88rem',
  },
  secondary: {
    display: 'inline-block', padding: '0.6rem 1.6rem',
    background: 'none', color: '#666',
    border: '1px solid #1e1e1e',
    borderRadius: '8px', textDecoration: 'none',
    fontWeight: 600, fontSize: '0.88rem',
  },
};
