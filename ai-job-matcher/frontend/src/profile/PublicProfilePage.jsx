// PublicProfilePage.jsx v4 — resume viewer fixed (direct open + download + fallback iframe)
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
  const [pdfMode, setPdfMode] = useState('gdocs'); // 'gdocs' | 'direct'

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
  if (error)   return <div className="card"><p style={{ color: 'tomato' }}>{error}</p><button onClick={() => navigate(-1)} style={css.backBtn}>← Back</button></div>;

  const isOwn      = user?.id?.toString() === userId?.toString();
  const displayName = profile.fullName || profile.user?.name || 'Unnamed';
  const resumeUrl  = profile.resumeUrl;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', paddingBottom: '4rem' }}>
      <button onClick={() => navigate(-1)} style={css.backBtn}>← Back</button>

      {/* HEADER */}
      <div style={css.card}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={css.avatar}>
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <span style={{ fontSize:'2rem' }}>{displayName.charAt(0).toUpperCase()}</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'0.5rem' }}>
              <div>
                <h2 style={{ margin:0, color:'#eee', fontSize:'1.3rem' }}>{displayName}</h2>
                {profile.headline && <p style={{ color:'#7ac', margin:'0.2rem 0 0', fontSize:'0.92rem' }}>{profile.headline}</p>}
                {(profile.currentTitle || profile.currentCompany) && (
                  <p style={{ color:'#888', margin:'0.15rem 0 0', fontSize:'0.84rem' }}>
                    {[profile.currentTitle, profile.currentCompany].filter(Boolean).join(' @ ')}
                  </p>
                )}
                {profile.location && <p style={{ color:'#666', margin:'0.1rem 0 0', fontSize:'0.81rem' }}>📍 {profile.location}</p>}
                {typeof profile.yearsOfExp === 'number' && profile.yearsOfExp > 0 && (
                  <p style={{ color:'#666', margin:'0.1rem 0 0', fontSize:'0.81rem' }}>🗓 {profile.yearsOfExp} yr{profile.yearsOfExp !== 1 ? 's' : ''} exp</p>
                )}
              </div>
              {isOwn && <Link to="/profile/edit" style={css.editBtn}>✏️ Edit Profile</Link>}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', marginTop:'0.8rem' }}>
              {profile.user?.email && <a href={`mailto:${profile.user.email}`} style={css.chipContact}>✉️ {profile.user.email}</a>}
              {profile.phone      && <a href={`tel:${profile.phone}`}          style={css.chipContact}>📞 {profile.phone}</a>}
              {profile.citizenship && <span style={css.chipInfo}>🌍 {profile.citizenship}</span>}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', marginTop:'0.4rem' }}>
              {profile.linkedinUrl  && <a href={profile.linkedinUrl}  target="_blank" rel="noopener noreferrer" style={css.chipLink}>🔗 LinkedIn</a>}
              {profile.githubUrl    && <a href={profile.githubUrl}    target="_blank" rel="noopener noreferrer" style={css.chipLink}>🐙 GitHub</a>}
              {profile.portfolioUrl && <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" style={css.chipLink}>🌐 Portfolio</a>}
            </div>
          </div>
        </div>
      </div>

      {profile.summary && (
        <Sec title="📝 About">
          <p style={{ color:'#ccc', lineHeight:1.8, margin:0, whiteSpace:'pre-wrap' }}>{profile.summary}</p>
        </Sec>
      )}

      {(profile.skills?.length > 0 || profile.tools?.length > 0) && (
        <Sec title="🛠 Skills & Tools">
          {profile.skills?.length > 0 && (
            <div style={{ marginBottom:'0.75rem' }}>
              <div style={css.sublabel}>Core Skills</div>
              {profile.skills.map((s,i) => <Chip key={i} text={s} theme="blue" />)}
            </div>
          )}
          {profile.tools?.length > 0 && (
            <div>
              <div style={css.sublabel}>Tools & Technologies</div>
              {profile.tools.map((t,i) => <Chip key={i} text={t} theme="green" />)}
            </div>
          )}
        </Sec>
      )}

      {profile.workHistory?.length > 0 && (
        <Sec title="💼 Work Experience">
          {profile.workHistory.map((w,i) => (
            <div key={i} style={{ ...css.item, marginBottom: i < profile.workHistory.length-1 ? '0.75rem' : 0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap' }}>
                <strong style={{ color:'#eee' }}>{w.role}</strong>
                <span style={{ color:'#666', fontSize:'0.82rem' }}>{[w.startDate,w.endDate].filter(Boolean).join(' – ')}</span>
              </div>
              <p style={{ color:'#7ac', fontSize:'0.88rem', margin:'0.15rem 0 0' }}>{w.company}</p>
              {w.achievements?.length > 0 && (
                <ul style={{ margin:'0.4rem 0 0', paddingLeft:'1.2rem', color:'#999', fontSize:'0.84rem', lineHeight:1.7 }}>
                  {w.achievements.map((a,j) => <li key={j}>{a}</li>)}
                </ul>
              )}
            </div>
          ))}
        </Sec>
      )}

      {profile.education?.length > 0 && (
        <Sec title="🎓 Education">
          {profile.education.map((e,i) => (
            <div key={i} style={{ ...css.item, marginBottom: i < profile.education.length-1 ? '0.75rem' : 0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap' }}>
                <strong style={{ color:'#eee' }}>{e.degree}</strong>
                <span style={{ color:'#666', fontSize:'0.82rem' }}>{e.year}</span>
              </div>
              <p style={{ color:'#aaa', margin:'0.15rem 0 0', fontSize:'0.88rem' }}>{e.institute}</p>
              {e.gpa && <p style={{ color:'#666', margin:'0.1rem 0 0', fontSize:'0.8rem' }}>GPA: {e.gpa}</p>}
            </div>
          ))}
        </Sec>
      )}

      {profile.certifications?.length > 0 && (
        <Sec title="🏅 Certifications">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'0.6rem' }}>
            {profile.certifications.map((c,i) => (
              <div key={i} style={css.item}>
                <div style={{ fontWeight:600, color:'#eee', fontSize:'0.88rem' }}>{c.name}</div>
                <div style={{ color:'#777', fontSize:'0.8rem', marginTop:'0.15rem' }}>{[c.issuer,c.year].filter(Boolean).join(' · ')}</div>
                {c.link && <a href={c.link} target="_blank" rel="noopener noreferrer" style={{ color:'#5ab0e0', fontSize:'0.78rem', marginTop:'0.3rem', display:'block' }}>🔗 View Certificate</a>}
              </div>
            ))}
          </div>
        </Sec>
      )}

      {profile.projects?.length > 0 && (
        <Sec title="🚀 Projects">
          {profile.projects.map((p,i) => (
            <div key={i} style={{ ...css.item, marginBottom: i < profile.projects.length-1 ? '0.75rem' : 0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.3rem' }}>
                <strong style={{ color:'#eee' }}>{p.title}</strong>
                {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ color:'#5ab0e0', fontSize:'0.8rem' }}>🔗 View</a>}
              </div>
              {p.description && <p style={{ color:'#aaa', margin:'0.3rem 0 0', fontSize:'0.85rem', lineHeight:1.6 }}>{p.description}</p>}
              {p.technologies?.length > 0 && (
                <div style={{ marginTop:'0.4rem' }}>
                  {p.technologies.map((t,j) => <Chip key={j} text={t} theme="green" />)}
                </div>
              )}
            </div>
          ))}
        </Sec>
      )}

      {profile.languages?.length > 0 && (
        <Sec title="🌐 Languages">
          {profile.languages.map((l,i) => <Chip key={i} text={l} theme="purple" />)}
        </Sec>
      )}

      {(profile.preferredTitles?.length > 0 || profile.desiredSalary || profile.employmentType || profile.workMode || profile.noticePeriod) && (
        <Sec title="⚙️ Job Preferences">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(165px,1fr))', gap:'0.5rem' }}>
            {profile.preferredTitles?.length > 0 && <PrefCard icon="🎯" label="Looking for" val={profile.preferredTitles.join(', ')} />}
            {profile.desiredSalary  && <PrefCard icon="💰" label="Salary" val={profile.desiredSalary} />}
            {profile.employmentType && <PrefCard icon="📋" label="Type" val={profile.employmentType} />}
            {profile.workMode       && <PrefCard icon="🏠" label="Work mode" val={profile.workMode} />}
            {profile.noticePeriod   && <PrefCard icon="⏳" label="Notice" val={profile.noticePeriod} />}
            <PrefCard icon="✈️" label="Relocation" val={profile.willingToRelocate ? 'Open' : 'No'} />
          </div>
        </Sec>
      )}

      {/* ═══ RESUME ═══════════════════════════════════════════════════════════ */}
      {resumeUrl && (
        <Sec title="📄 Resume">
          {/* Action buttons */}
          <div style={{ display:'flex', gap:'0.65rem', flexWrap:'wrap', marginBottom:'0.9rem' }}>
            <a href={resumeUrl} target="_blank" rel="noopener noreferrer" style={css.resumeBtn}>
              👁 Open PDF
            </a>
            <a href={resumeUrl} download="resume.pdf" style={{ ...css.resumeBtn, background:'#0a200a', color:'#6bcb77', borderColor:'#1a3a1a' }}>
              ⬇ Download
            </a>
            {/* Viewer toggle */}
            <button
              type="button"
              onClick={() => setPdfMode(m => m === 'gdocs' ? 'direct' : 'gdocs')}
              style={{ ...css.resumeBtn, background:'#1a1a1a', color:'#888', borderColor:'#2a2a2a', cursor:'pointer' }}
            >
              🔄 Switch Viewer
            </button>
          </div>

          {/* PDF Viewer — two modes */}
          <div style={{ borderRadius:'8px', overflow:'hidden', border:'1px solid #252525', background:'#111' }}>
            {pdfMode === 'gdocs' ? (
              // Google Docs viewer — works well with public Cloudinary image/pdf URLs
              <iframe
                key="gdocs"
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(resumeUrl)}&embedded=true`}
                style={{ width:'100%', height:560, border:'none', background:'#111' }}
                title="Resume Preview"
              />
            ) : (
              // Direct embed — works when Cloudinary URL allows CORS embed
              <iframe
                key="direct"
                src={resumeUrl}
                style={{ width:'100%', height:560, border:'none', background:'#111' }}
                title="Resume Direct"
              />
            )}
          </div>
          <p style={{ color:'#444', fontSize:'0.74rem', marginTop:'0.5rem' }}>
            If the preview doesn't load, click "Open PDF" to view it in a new tab, or "Switch Viewer" to try the direct embed.
          </p>
        </Sec>
      )}

      {!profile.summary && !profile.skills?.length && !profile.education?.length && !profile.workHistory?.length && !profile.projects?.length && (
        <div style={{ ...css.card, textAlign:'center', color:'#555', padding:'3rem' }}>
          <p>This profile is empty.</p>
          {isOwn && <Link to="/profile/edit" style={{ color:'#5ab0e0' }}>Fill out your profile →</Link>}
        </div>
      )}
    </div>
  );
}

function Sec({ title, children }) {
  return (
    <div style={css.card}>
      <h3 style={{ margin:'0 0 0.9rem', fontSize:'0.92rem', color:'#bbb', paddingBottom:'0.45rem', borderBottom:'1px solid #222', letterSpacing:'0.02em' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Chip({ text, theme }) {
  const t = {
    blue:   { bg:'#0d1e38', border:'#1a3a6a', color:'#7ac' },
    green:  { bg:'#0d280d', border:'#1a4a1a', color:'#6bcb77' },
    purple: { bg:'#180d30', border:'#3a1a5a', color:'#b07aff' },
  }[theme] || { bg:'#1a1a1a', border:'#333', color:'#aaa' };
  return (
    <span style={{
      display:'inline-block', padding:'0.18rem 0.58rem',
      background:t.bg, border:`1px solid ${t.border}`,
      color:t.color, borderRadius:'20px',
      fontSize:'0.77rem', marginRight:'0.3rem', marginBottom:'0.3rem',
    }}>{text}</span>
  );
}

function PrefCard({ icon, label, val }) {
  return (
    <div style={{ background:'#161616', border:'1px solid #222', borderRadius:'7px', padding:'0.6rem 0.8rem' }}>
      <div style={{ fontSize:'0.68rem', color:'#555', textTransform:'uppercase', letterSpacing:'0.05em' }}>{icon} {label}</div>
      <div style={{ color:'#ccc', fontSize:'0.85rem', marginTop:'0.2rem', fontWeight:500 }}>{val}</div>
    </div>
  );
}

const css = {
  card: { background:'#111', border:'1px solid #1e1e1e', borderRadius:'10px', padding:'1.25rem 1.5rem', marginBottom:'1rem' },
  item: { background:'#0d0d0d', border:'1px solid #1e1e1e', borderRadius:'6px', padding:'0.75rem 1rem' },
  avatar: {
    width:82, height:82, borderRadius:'50%', flexShrink:0,
    background:'linear-gradient(135deg,#1a3a6a,#0a1a3a)',
    border:'2px solid #1e3a5a', overflow:'hidden',
    display:'flex', alignItems:'center', justifyContent:'center',
    color:'#7ac', fontWeight:'bold', fontSize:'1.8rem',
  },
  backBtn: { background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:'0.88rem', marginBottom:'1rem', padding:0 },
  editBtn: { padding:'0.3rem 0.85rem', background:'#0a1e2a', color:'#5ab0e0', border:'1px solid #1a3a4a', borderRadius:'6px', textDecoration:'none', fontSize:'0.8rem' },
  chipContact: { padding:'0.18rem 0.6rem', background:'#0d0d0d', border:'1px solid #1e1e1e', color:'#888', borderRadius:'20px', fontSize:'0.77rem', textDecoration:'none', display:'inline-block' },
  chipLink: { padding:'0.18rem 0.6rem', background:'#0a1a2a', border:'1px solid #1a3040', color:'#5ab0e0', borderRadius:'20px', fontSize:'0.77rem', textDecoration:'none', display:'inline-block' },
  chipInfo: { padding:'0.18rem 0.6rem', background:'#0d0d0d', border:'1px solid #1e1e1e', color:'#666', borderRadius:'20px', fontSize:'0.77rem', display:'inline-block' },
  sublabel: { fontSize:'0.7rem', color:'#555', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.4rem' },
  resumeBtn: { display:'inline-flex', alignItems:'center', gap:'0.35rem', padding:'0.4rem 1rem', background:'#0a1e2a', color:'#5ab0e0', border:'1px solid #1a3a4a', borderRadius:'7px', textDecoration:'none', fontSize:'0.84rem', fontWeight:600 },
};
