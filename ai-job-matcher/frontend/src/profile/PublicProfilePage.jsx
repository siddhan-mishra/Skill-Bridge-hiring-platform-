// PublicProfilePage.jsx — Full rewrite v3
// Shows every field from the MongoDB profile schema
// Resume: opens inline via Google Docs viewer (works with any PDF URL)
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

export default function PublicProfilePage() {
  const { userId }         = useParams();
  const { user, API_BASE } = useAuth();
  const navigate           = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [pdfOpen, setPdfOpen] = useState(false);

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

  if (loading) return <div className="card"><p>Loading profile…</p></div>;
  if (error)   return (
    <div className="card">
      <p style={{ color: 'tomato' }}>{error}</p>
      <button onClick={() => navigate(-1)} style={css.backBtn}>← Back</button>
    </div>
  );

  const isOwn = user?.id?.toString() === userId?.toString();
  const displayName = profile.fullName || profile.user?.name || 'Unnamed';

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: '4rem' }}>

      <button onClick={() => navigate(-1)} style={css.backBtn}>← Back</button>

      {/* ═══ HEADER CARD ═══════════════════════════════════════════════════════ */}
      <div style={css.card}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Avatar */}
          <div style={css.avatar}>
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '2rem' }}>{displayName.charAt(0).toUpperCase()}</span>
            }
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ margin: 0, color: '#eee', fontSize: '1.3rem' }}>{displayName}</h2>
                {profile.headline && <p style={{ color: '#7ac', margin: '0.2rem 0 0', fontSize: '0.95rem' }}>{profile.headline}</p>}
                {(profile.currentTitle || profile.currentCompany) && (
                  <p style={{ color: '#888', margin: '0.15rem 0 0', fontSize: '0.85rem' }}>
                    {[profile.currentTitle, profile.currentCompany].filter(Boolean).join(' @ ')}
                  </p>
                )}
                {profile.location && <p style={{ color: '#666', margin: '0.1rem 0 0', fontSize: '0.82rem' }}>📍 {profile.location}</p>}
                {typeof profile.yearsOfExp === 'number' && profile.yearsOfExp > 0 && (
                  <p style={{ color: '#666', margin: '0.1rem 0 0', fontSize: '0.82rem' }}>🗓 {profile.yearsOfExp} year{profile.yearsOfExp !== 1 ? 's' : ''} of experience</p>
                )}
              </div>
              {isOwn && <Link to="/profile/edit" style={css.editBtn}>✏️ Edit Profile</Link>}
            </div>

            {/* Contact chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.85rem' }}>
              {profile.user?.email && (
                <a href={`mailto:${profile.user.email}`} style={css.chipContact}>✉️ {profile.user.email}</a>
              )}
              {profile.phone && (
                <a href={`tel:${profile.phone}`} style={css.chipContact}>📞 {profile.phone}</a>
              )}
              {profile.citizenship && <span style={css.chipInfo}>🌍 {profile.citizenship}</span>}
            </div>

            {/* Social links */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.45rem' }}>
              {profile.linkedinUrl   && <a href={profile.linkedinUrl}   target="_blank" rel="noopener noreferrer" style={css.chipLink}>🔗 LinkedIn</a>}
              {profile.githubUrl     && <a href={profile.githubUrl}     target="_blank" rel="noopener noreferrer" style={css.chipLink}>🐙 GitHub</a>}
              {profile.portfolioUrl  && <a href={profile.portfolioUrl}  target="_blank" rel="noopener noreferrer" style={css.chipLink}>🌐 Portfolio</a>}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ABOUT ════════════════════════════════════════════════════════════ */}
      {profile.summary && (
        <Sec title="📝 About">
          <p style={{ color: '#ccc', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>{profile.summary}</p>
        </Sec>
      )}

      {/* ═══ SKILLS & TOOLS ═══════════════════════════════════════════════════ */}
      {(profile.skills?.length > 0 || profile.tools?.length > 0) && (
        <Sec title="🛠 Skills & Tools">
          {profile.skills?.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={css.sublabel}>Core Skills</div>
              {profile.skills.map((s, i) => <Chip key={i} text={s} theme="blue" />)}
            </div>
          )}
          {profile.tools?.length > 0 && (
            <div>
              <div style={css.sublabel}>Tools & Technologies</div>
              {profile.tools.map((t, i) => <Chip key={i} text={t} theme="green" />)}
            </div>
          )}
        </Sec>
      )}

      {/* ═══ WORK HISTORY ═════════════════════════════════════════════════════ */}
      {profile.workHistory?.length > 0 && (
        <Sec title="💼 Work Experience">
          {profile.workHistory.map((w, i) => (
            <div key={i} style={{ ...css.item, marginBottom: i < profile.workHistory.length - 1 ? '0.75rem' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <strong style={{ color: '#eee' }}>{w.role}</strong>
                <span style={{ color: '#666', fontSize: '0.82rem' }}>{[w.startDate, w.endDate].filter(Boolean).join(' – ')}</span>
              </div>
              <p style={{ color: '#7ac', fontSize: '0.88rem', margin: '0.15rem 0 0' }}>{w.company}</p>
              {w.achievements?.length > 0 && (
                <ul style={{ margin: '0.45rem 0 0', paddingLeft: '1.2rem', color: '#999', fontSize: '0.84rem', lineHeight: 1.7 }}>
                  {w.achievements.map((a, j) => <li key={j}>{a}</li>)}
                </ul>
              )}
            </div>
          ))}
        </Sec>
      )}

      {/* ═══ EDUCATION ════════════════════════════════════════════════════════ */}
      {profile.education?.length > 0 && (
        <Sec title="🎓 Education">
          {profile.education.map((e, i) => (
            <div key={i} style={{ ...css.item, marginBottom: i < profile.education.length - 1 ? '0.75rem' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <strong style={{ color: '#eee' }}>{e.degree}</strong>
                <span style={{ color: '#666', fontSize: '0.82rem' }}>{e.year}</span>
              </div>
              <p style={{ color: '#aaa', margin: '0.15rem 0 0', fontSize: '0.88rem' }}>{e.institute}</p>
              {e.gpa && <p style={{ color: '#666', margin: '0.1rem 0 0', fontSize: '0.8rem' }}>GPA: {e.gpa}</p>}
            </div>
          ))}
        </Sec>
      )}

      {/* ═══ CERTIFICATIONS ════════════════════════════════════════════════════ */}
      {profile.certifications?.length > 0 && (
        <Sec title="🏅 Certifications">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px,1fr))', gap: '0.6rem' }}>
            {profile.certifications.map((c, i) => (
              <div key={i} style={css.item}>
                <div style={{ fontWeight: 600, color: '#eee', fontSize: '0.88rem' }}>{c.name}</div>
                <div style={{ color: '#777', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                  {[c.issuer, c.year].filter(Boolean).join(' · ')}
                </div>
                {c.link && (
                  <a href={c.link} target="_blank" rel="noopener noreferrer"
                    style={{ color: '#5ab0e0', fontSize: '0.78rem', marginTop: '0.35rem', display: 'block' }}>
                    🔗 View Certificate
                  </a>
                )}
              </div>
            ))}
          </div>
        </Sec>
      )}

      {/* ═══ PROJECTS ══════════════════════════════════════════════════════════ */}
      {profile.projects?.length > 0 && (
        <Sec title="🚀 Projects">
          {profile.projects.map((p, i) => (
            <div key={i} style={{ ...css.item, marginBottom: i < profile.projects.length - 1 ? '0.75rem' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' }}>
                <strong style={{ color: '#eee' }}>{p.title}</strong>
                {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ color: '#5ab0e0', fontSize: '0.8rem' }}>🔗 View</a>}
              </div>
              {p.description && <p style={{ color: '#aaa', margin: '0.3rem 0 0', fontSize: '0.85rem', lineHeight: 1.6 }}>{p.description}</p>}
              {p.technologies?.length > 0 && (
                <div style={{ marginTop: '0.4rem' }}>
                  {p.technologies.map((t, j) => <Chip key={j} text={t} theme="green" />)}
                </div>
              )}
            </div>
          ))}
        </Sec>
      )}

      {/* ═══ LANGUAGES ════════════════════════════════════════════════════════ */}
      {profile.languages?.length > 0 && (
        <Sec title="🌐 Languages">
          {profile.languages.map((l, i) => <Chip key={i} text={l} theme="purple" />)}
        </Sec>
      )}

      {/* ═══ JOB PREFERENCES ══════════════════════════════════════════════════ */}
      {(profile.preferredTitles?.length > 0 || profile.desiredSalary ||
        profile.employmentType || profile.workMode || profile.noticePeriod) && (
        <Sec title="⚙️ Job Preferences">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: '0.5rem' }}>
            {profile.preferredTitles?.length > 0 && <PrefCard icon="🎯" label="Looking for" val={profile.preferredTitles.join(', ')} />}
            {profile.desiredSalary   && <PrefCard icon="💰" label="Expected salary"  val={profile.desiredSalary} />}
            {profile.employmentType  && <PrefCard icon="📋" label="Employment type"  val={profile.employmentType} />}
            {profile.workMode        && <PrefCard icon="🏠" label="Work mode"        val={profile.workMode} />}
            {profile.noticePeriod    && <PrefCard icon="⏳" label="Notice period"    val={profile.noticePeriod} />}
            <PrefCard icon="✈️" label="Relocation" val={profile.willingToRelocate ? 'Open to relocate' : 'Not relocating'} />
          </div>
        </Sec>
      )}

      {/* ═══ RESUME ═══════════════════════════════════════════════════════════ */}
      {profile.resumeUrl && (
        <Sec title="📄 Resume">
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" style={css.resumeBtn}>
              👁 Open PDF
            </a>
            <a href={profile.resumeUrl} download style={{ ...css.resumeBtn, background: '#0e2a0e', color: '#6bcb77', borderColor: '#1a4a1a' }}>
              ⬇ Download
            </a>
          </div>
          {/* PDF viewer — Google Docs viewer renders any public PDF in iframe */}
          <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #2a2a2a' }}>
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(profile.resumeUrl)}&embedded=true`}
              style={{ width: '100%', height: 520, border: 'none', background: '#111' }}
              title="Resume"
            />
          </div>
        </Sec>
      )}

      {/* ═══ EMPTY STATE ══════════════════════════════════════════════════════ */}
      {!profile.summary && !profile.skills?.length && !profile.education?.length &&
       !profile.workHistory?.length && !profile.projects?.length && (
        <div style={{ ...css.card, textAlign: 'center', color: '#555', padding: '3rem' }}>
          <p>This profile is empty.</p>
          {isOwn && <Link to="/profile/edit" style={{ color: '#5ab0e0' }}>Fill out your profile →</Link>}
        </div>
      )}

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Sec({ title, children }) {
  return (
    <div style={css.card}>
      <h3 style={{ margin: '0 0 0.9rem', fontSize: '0.95rem', color: '#bbb',
        paddingBottom: '0.5rem', borderBottom: '1px solid #232323', letterSpacing: '0.02em' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Chip({ text, theme }) {
  const t = {
    blue:   { bg: '#0d1e38', border: '#1a3a6a', color: '#7ac' },
    green:  { bg: '#0d280d', border: '#1a4a1a', color: '#6bcb77' },
    purple: { bg: '#180d30', border: '#3a1a5a', color: '#b07aff' },
  }[theme] || { bg: '#1a1a1a', border: '#333', color: '#aaa' };
  return (
    <span style={{
      display: 'inline-block', padding: '0.18rem 0.58rem',
      background: t.bg, border: `1px solid ${t.border}`,
      color: t.color, borderRadius: '20px',
      fontSize: '0.77rem', marginRight: '0.3rem', marginBottom: '0.3rem',
    }}>{text}</span>
  );
}

function PrefCard({ icon, label, val }) {
  return (
    <div style={{ background: '#161616', border: '1px solid #252525', borderRadius: '7px', padding: '0.6rem 0.8rem' }}>
      <div style={{ fontSize: '0.68rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{icon} {label}</div>
      <div style={{ color: '#ccc', fontSize: '0.86rem', marginTop: '0.2rem', fontWeight: 500 }}>{val}</div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const css = {
  card: {
    background: '#1e1e1e', border: '1px solid #2a2a2a',
    borderRadius: '8px', padding: '1.25rem 1.5rem', marginBottom: '1rem',
  },
  item: {
    background: '#161616', border: '1px solid #252525',
    borderRadius: '6px', padding: '0.75rem 1rem',
  },
  avatar: {
    width: 82, height: 82, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg,#1a4a7a,#0a2a4a)',
    border: '2px solid #2a4a6a', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontWeight: 'bold',
  },
  backBtn: {
    background: 'none', border: 'none', color: '#666',
    cursor: 'pointer', fontSize: '0.88rem', marginBottom: '1rem', padding: 0,
  },
  editBtn: {
    padding: '0.32rem 0.9rem', background: '#0e2233', color: '#5ab0e0',
    border: '1px solid #1a4a6a', borderRadius: '6px',
    textDecoration: 'none', fontSize: '0.82rem', flexShrink: 0,
  },
  chipContact: {
    padding: '0.18rem 0.62rem', background: '#161616', border: '1px solid #2a2a2a',
    color: '#999', borderRadius: '20px', fontSize: '0.77rem',
    textDecoration: 'none', display: 'inline-block',
  },
  chipLink: {
    padding: '0.18rem 0.62rem', background: '#0d1e2a', border: '1px solid #1a3a4a',
    color: '#5ab0e0', borderRadius: '20px', fontSize: '0.77rem',
    textDecoration: 'none', display: 'inline-block',
  },
  chipInfo: {
    padding: '0.18rem 0.62rem', background: '#161616', border: '1px solid #2a2a2a',
    color: '#777', borderRadius: '20px', fontSize: '0.77rem', display: 'inline-block',
  },
  sublabel: {
    fontSize: '0.7rem', color: '#555',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem',
  },
  resumeBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.42rem 1.1rem', background: '#0e2233', color: '#5ab0e0',
    border: '1px solid #1a4a6a', borderRadius: '7px',
    textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600,
  },
};
