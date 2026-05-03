// PublicProfilePage.jsx — Complete rewrite
// Shows ALL profile fields matching the actual MongoDB schema
// Used by: seeker viewing own profile, recruiter viewing candidate
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

export default function PublicProfilePage() {
  const { userId }    = useParams();
  const { user, API_BASE } = useAuth();
  const navigate      = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/profile/${userId}`);
        setProfile(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Profile not found');
      } finally {
        setLoading(false);
      }
    })();
  }, [API_BASE, userId]);

  if (loading) return <div className="card"><p>Loading profile...</p></div>;
  if (error)   return (
    <div className="card">
      <p style={{ color: 'tomato' }}>{error}</p>
      <button onClick={() => navigate(-1)} style={btn.back}>← Go Back</button>
    </div>
  );

  const isOwn = user?.id?.toString() === userId?.toString();

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', paddingBottom: '3rem' }}>

      <button onClick={() => navigate(-1)} style={btn.back}>← Back</button>

      {/* ═══ HEADER — Avatar · Name · Headline · Contacts ═══════════ */}
      <div style={card}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Avatar */}
          <div style={{
            width: 84, height: 84, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #2a6496, #1a3a5a)',
            border: '2px solid #2a4a6a', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 'bold', color: 'white',
          }}>
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (profile.fullName || profile.user?.name || '?').charAt(0).toUpperCase()
            }
          </div>

          {/* Name + headline + basic info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                  {profile.fullName || profile.user?.name}
                </h2>
                {profile.headline && (
                  <p style={{ color: '#7ac', margin: '0.2rem 0 0', fontSize: '0.95rem' }}>{profile.headline}</p>
                )}
                {(profile.currentTitle || profile.currentCompany) && (
                  <p style={{ color: '#888', margin: '0.15rem 0 0', fontSize: '0.85rem' }}>
                    {profile.currentTitle}{profile.currentTitle && profile.currentCompany ? ' @ ' : ''}{profile.currentCompany}
                  </p>
                )}
                {profile.location && (
                  <p style={{ color: '#666', margin: '0.1rem 0 0', fontSize: '0.82rem' }}>📍 {profile.location}</p>
                )}
              </div>
              {isOwn && (
                <Link to="/profile/edit" style={btn.edit}>✏️ Edit Profile</Link>
              )}
            </div>

            {/* Contact row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.75rem' }}>
              {profile.user?.email && (
                <a href={`mailto:${profile.user.email}`} style={chip.contact}>✉️ {profile.user.email}</a>
              )}
              {profile.phone && (
                <a href={`tel:${profile.phone}`} style={chip.contact}>📞 {profile.phone}</a>
              )}
              {profile.citizenship && (
                <span style={chip.info}>🌏 {profile.citizenship}</span>
              )}
              {typeof profile.yearsOfExp === 'number' && (
                <span style={chip.info}>🗓 {profile.yearsOfExp} yr{profile.yearsOfExp !== 1 ? 's' : ''} exp</span>
              )}
            </div>

            {/* Links row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {profile.linkedinUrl && (
                <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" style={chip.link}>🔗 LinkedIn</a>
              )}
              {profile.githubUrl && (
                <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" style={chip.link}>🐙 GitHub</a>
              )}
              {profile.portfolioUrl && (
                <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" style={chip.link}>🌐 Portfolio</a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SUMMARY ═══════════════════════════════════════════════ */}
      {profile.summary && (
        <Section title="📝 About">
          <p style={{ color: '#ccc', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>{profile.summary}</p>
        </Section>
      )}

      {/* ═══ SKILLS + TOOLS ════════════════════════════════════════ */}
      {(profile.skills?.length > 0 || profile.tools?.length > 0) && (
        <Section title="🛠 Skills & Tools">
          {profile.skills?.length > 0 && (
            <div style={{ marginBottom: profile.tools?.length ? '0.75rem' : 0 }}>
              <div style={label}>Core Skills</div>
              <div>{profile.skills.map((s, i) => <Tag key={i} text={s} color="blue" />)}</div>
            </div>
          )}
          {profile.tools?.length > 0 && (
            <div>
              <div style={label}>Tools & Technologies</div>
              <div>{profile.tools.map((t, i) => <Tag key={i} text={t} color="green" />)}</div>
            </div>
          )}
        </Section>
      )}

      {/* ═══ WORK HISTORY ══════════════════════════════════════════ */}
      {profile.workHistory?.length > 0 && (
        <Section title="💼 Work Experience">
          {profile.workHistory.map((w, i) => (
            <div key={i} style={i < profile.workHistory.length - 1 ? { ...item, marginBottom: '0.75rem' } : item}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
                <strong style={{ color: '#e0e0e0' }}>{w.role}</strong>
                <span style={{ color: '#777', fontSize: '0.82rem' }}>
                  {w.startDate}{w.startDate && w.endDate ? ' – ' : ''}{w.endDate}
                </span>
              </div>
              <p style={{ color: '#7ac', fontSize: '0.88rem', margin: '0.2rem 0 0' }}>{w.company}</p>
              {w.achievements?.length > 0 && (
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', color: '#999', fontSize: '0.85rem', lineHeight: 1.7 }}>
                  {w.achievements.map((a, j) => <li key={j}>{a}</li>)}
                </ul>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* ═══ EDUCATION ═════════════════════════════════════════════ */}
      {profile.education?.length > 0 && (
        <Section title="🎓 Education">
          {profile.education.map((e, i) => (
            <div key={i} style={i < profile.education.length - 1 ? { ...item, marginBottom: '0.75rem' } : item}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <strong style={{ color: '#e0e0e0' }}>{e.degree}</strong>
                <span style={{ color: '#777', fontSize: '0.82rem' }}>{e.year}</span>
              </div>
              <p style={{ color: '#aaa', fontSize: '0.88rem', margin: '0.2rem 0 0' }}>{e.institute}</p>
              {e.gpa && <p style={{ color: '#666', fontSize: '0.8rem', margin: '0.15rem 0 0' }}>GPA: {e.gpa}</p>}
            </div>
          ))}
        </Section>
      )}

      {/* ═══ CERTIFICATIONS ════════════════════════════════════════ */}
      {profile.certifications?.length > 0 && (
        <Section title="🏅 Certifications">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.6rem' }}>
            {profile.certifications.map((c, i) => (
              <div key={i} style={item}>
                <div style={{ fontWeight: 600, color: '#e0e0e0', fontSize: '0.88rem' }}>{c.name}</div>
                <div style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                  {c.issuer}{c.issuer && c.year ? ' · ' : ''}{c.year}
                </div>
                {c.link && (
                  <a href={c.link} target="_blank" rel="noopener noreferrer"
                    style={{ color: '#5ab0e0', fontSize: '0.78rem', marginTop: '0.3rem', display: 'inline-block' }}>
                    🔗 View Certificate
                  </a>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ═══ PROJECTS ══════════════════════════════════════════════ */}
      {profile.projects?.length > 0 && (
        <Section title="🚀 Projects">
          {profile.projects.map((p, i) => (
            <div key={i} style={i < profile.projects.length - 1 ? { ...item, marginBottom: '0.75rem' } : item}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                <strong style={{ color: '#e0e0e0' }}>{p.title}</strong>
                {p.link && (
                  <a href={p.link} target="_blank" rel="noopener noreferrer"
                    style={{ color: '#5ab0e0', fontSize: '0.8rem' }}>🔗 View</a>
                )}
              </div>
              {p.description && (
                <p style={{ color: '#aaa', fontSize: '0.85rem', margin: '0.3rem 0 0', lineHeight: 1.6 }}>{p.description}</p>
              )}
              {p.technologies?.length > 0 && (
                <div style={{ marginTop: '0.4rem' }}>
                  {p.technologies.map((t, j) => <Tag key={j} text={t} color="green" />)}
                </div>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* ═══ PREFERENCES ═══════════════════════════════════════════ */}
      {(profile.preferredTitles?.length > 0 || profile.desiredSalary || profile.employmentType || profile.workMode || profile.noticePeriod) && (
        <Section title="⚙️ Job Preferences">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
            {profile.preferredTitles?.length > 0 && (
              <PrefRow icon="🎯" label="Looking for" value={profile.preferredTitles.join(', ')} />
            )}
            {profile.desiredSalary && (
              <PrefRow icon="💰" label="Expected salary" value={profile.desiredSalary} />
            )}
            {profile.employmentType && (
              <PrefRow icon="📋" label="Employment" value={profile.employmentType} />
            )}
            {profile.workMode && (
              <PrefRow icon="🏠" label="Work mode" value={profile.workMode} />
            )}
            {profile.noticePeriod && (
              <PrefRow icon="⏳" label="Notice period" value={profile.noticePeriod} />
            )}
            {profile.willingToRelocate !== undefined && (
              <PrefRow icon="✈️" label="Relocation" value={profile.willingToRelocate ? 'Yes' : 'No'} />
            )}
          </div>
        </Section>
      )}

      {/* ═══ LANGUAGES ═════════════════════════════════════════════ */}
      {profile.languages?.length > 0 && (
        <Section title="🌐 Languages">
          <div>{profile.languages.map((l, i) => <Tag key={i} text={l} color="purple" />)}</div>
        </Section>
      )}

      {/* ═══ RESUME ════════════════════════════════════════════════ */}
      {profile.resumeUrl && (
        <Section title="📄 Resume">
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <a
              href={profile.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={btn.resume}
            >
              👁 View Resume
            </a>
            <a
              href={profile.resumeUrl}
              download
              style={{ ...btn.resume, background: '#0e2a0e', color: '#6bcb77', borderColor: '#1a4a1a' }}
            >
              ⬇ Download PDF
            </a>
          </div>
          {/* Inline PDF preview */}
          <div style={{ marginTop: '1rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid #2a2a2a' }}>
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(profile.resumeUrl)}&embedded=true`}
              style={{ width: '100%', height: 500, border: 'none', background: '#111' }}
              title="Resume Preview"
            />
          </div>
        </Section>
      )}

      {/* ═══ EMPTY STATE ═══════════════════════════════════════════ */}
      {!profile.summary && !profile.skills?.length && !profile.education?.length &&
       !profile.workHistory?.length && !profile.projects?.length && (
        <div style={{ ...card, textAlign: 'center', color: '#555', padding: '3rem' }}>
          <p style={{ fontSize: '1.1rem' }}>This profile is empty.</p>
          {isOwn && (
            <Link to="/profile/edit" style={{ color: '#5ab0e0', marginTop: '0.5rem', display: 'block' }}>
              Fill out your profile →
            </Link>
          )}
        </div>
      )}

    </div>
  );
}

// ── Reusable sub-components ──────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#ccc', letterSpacing: '0.02em',
        paddingBottom: '0.5rem', borderBottom: '1px solid #222' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Tag({ text, color }) {
  const colors = {
    blue:   { background: '#0e1e3a', border: '#1a3a6a', color: '#7ac' },
    green:  { background: '#0e2a0e', border: '#1a4a1a', color: '#6bcb77' },
    purple: { background: '#1a0e2a', border: '#3a1a5a', color: '#b07aff' },
  };
  const c = colors[color] || colors.blue;
  return (
    <span style={{
      display: 'inline-block', padding: '0.2rem 0.6rem',
      background: c.background, border: `1px solid ${c.border}`,
      color: c.color, borderRadius: '20px',
      fontSize: '0.78rem', marginRight: '0.3rem', marginBottom: '0.3rem',
    }}>{text}</span>
  );
}

function PrefRow({ icon, label, value }) {
  return (
    <div style={{ background: '#161616', border: '1px solid #222', borderRadius: '6px', padding: '0.6rem 0.75rem' }}>
      <div style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{icon} {label}</div>
      <div style={{ color: '#ccc', fontSize: '0.88rem', marginTop: '0.2rem', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

// ── Style constants ──────────────────────────────────────────────
const card = {
  background: '#1e1e1e', border: '1px solid #2a2a2a',
  borderRadius: '8px', padding: '1.25rem 1.5rem', marginBottom: '1rem',
};
const item = {
  background: '#161616', border: '1px solid #252525',
  borderRadius: '6px', padding: '0.75rem 1rem',
};
const label = {
  fontSize: '0.7rem', color: '#555',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  marginBottom: '0.4rem',
};
const chip = {
  contact: {
    padding: '0.2rem 0.65rem', background: '#111', border: '1px solid #2a2a2a',
    color: '#aaa', borderRadius: '20px', fontSize: '0.78rem',
    textDecoration: 'none', display: 'inline-block',
  },
  link: {
    padding: '0.2rem 0.65rem', background: '#0e1e2a', border: '1px solid #1a3a4a',
    color: '#5ab0e0', borderRadius: '20px', fontSize: '0.78rem',
    textDecoration: 'none', display: 'inline-block',
  },
  info: {
    padding: '0.2rem 0.65rem', background: '#111', border: '1px solid #2a2a2a',
    color: '#888', borderRadius: '20px', fontSize: '0.78rem', display: 'inline-block',
  },
};
const btn = {
  back: {
    background: 'none', border: 'none', color: '#666',
    cursor: 'pointer', fontSize: '0.88rem', marginBottom: '1rem', padding: 0,
  },
  edit: {
    padding: '0.35rem 0.9rem', background: '#0e2233', color: '#5ab0e0',
    border: '1px solid #1a4a6a', borderRadius: '6px',
    textDecoration: 'none', fontSize: '0.82rem', flexShrink: 0,
  },
  resume: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.45rem 1.1rem', background: '#0e2233', color: '#5ab0e0',
    border: '1px solid #1a4a6a', borderRadius: '7px',
    textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600,
  },
};
