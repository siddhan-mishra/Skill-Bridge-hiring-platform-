// PublicProfilePage.jsx — view any seeker's profile by userId
// Used by: seeker viewing own public view, recruiter clicking candidate name
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

function PublicProfilePage() {
  const { userId }  = useParams();
  const { user, API_BASE } = useAuth();
  const navigate    = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/profile/${userId}`);
        setProfile(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Profile not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [API_BASE, userId]);

  if (loading) return <div className="card"><p>Loading profile...</p></div>;
  if (error)   return (
    <div className="card">
      <p style={{ color: 'tomato' }}>{error}</p>
      <button onClick={() => navigate(-1)} style={backBtnStyle}>← Go Back</button>
    </div>
  );

  const isOwnProfile = user?.id?.toString() === userId?.toString();

  const skillTag = {
    display: 'inline-block',
    padding: '0.25rem 0.65rem',
    background: '#1a3a5a',
    border: '1px solid #2a5a8a',
    color: '#7ac',
    borderRadius: '20px',
    fontSize: '0.78rem',
    marginRight: '0.35rem',
    marginBottom: '0.35rem',
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>

      {/* ── back button ── */}
      <button onClick={() => navigate(-1)} style={backBtnStyle}>
        ← Back
      </button>

      {/* ── header card ── */}
      <div style={sectionCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            {/* avatar circle with initials */}
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #2a6496, #1a3a5a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 'bold', color: 'white',
              marginBottom: '0.75rem',
            }}>
              {profile.user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <h2 style={{ margin: 0 }}>{profile.user?.name}</h2>
            {profile.headline && (
              <p style={{ color: '#aaa', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                {profile.headline}
              </p>
            )}
            <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              {profile.user?.email}
            </p>
          </div>

          {/* edit button only for own profile */}
          {isOwnProfile && (
            <Link
              to="/profile/edit"
              style={{
                padding: '0.4rem 1rem',
                background: '#2a6496',
                color: 'white',
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '0.85rem',
                flexShrink: 0,
              }}
            >
              ✏️ Edit Profile
            </Link>
          )}
        </div>
      </div>

      {/* ── skills ── */}
      {profile.skills?.length > 0 && (
        <div style={sectionCard}>
          <h3 style={sectionTitle}>🛠 Skills</h3>
          <div>
            {profile.skills.map((s, i) => (
              <span key={i} style={skillTag}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── summary ── */}
      {profile.summary && (
        <div style={sectionCard}>
          <h3 style={sectionTitle}>📝 Summary</h3>
          <p style={{ color: '#ccc', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
            {profile.summary}
          </p>
        </div>
      )}

      {/* ── education ── */}
      {profile.education?.length > 0 && (
        <div style={sectionCard}>
          <h3 style={sectionTitle}>🎓 Education</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {profile.education.map((edu, i) => (
              <div key={i} style={itemCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <strong>{edu.degree}</strong>
                  <span style={{ color: '#888', fontSize: '0.85rem' }}>
                    {edu.startYear}{edu.endYear && ` – ${edu.endYear}`}
                  </span>
                </div>
                <p style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {edu.institution}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── experience ── */}
      {profile.experience?.length > 0 && (
        <div style={sectionCard}>
          <h3 style={sectionTitle}>💼 Experience</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {profile.experience.map((exp, i) => (
              <div key={i} style={itemCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <strong>{exp.role}</strong>
                  <span style={{ color: '#888', fontSize: '0.85rem' }}>
                    {exp.startDate}{exp.endDate && ` – ${exp.endDate}`}
                  </span>
                </div>
                <p style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '0.15rem' }}>
                  {exp.company}
                </p>
                {exp.description && (
                  <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.3rem', lineHeight: '1.5' }}>
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── projects ── */}
      {profile.projects?.length > 0 && (
        <div style={sectionCard}>
          <h3 style={sectionTitle}>🚀 Projects</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {profile.projects.map((proj, i) => (
              <div key={i} style={itemCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
                  <strong>{proj.name}</strong>
                  {proj.link && (
                    <a
                      href={proj.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#7ac', fontSize: '0.8rem' }}
                    >
                      🔗 View
                    </a>
                  )}
                </div>
                {proj.description && (
                  <p style={{ color: '#aaa', fontSize: '0.88rem', marginTop: '0.3rem', lineHeight: '1.5' }}>
                    {proj.description}
                  </p>
                )}
                {proj.techStack?.length > 0 && (
                  <div style={{ marginTop: '0.4rem' }}>
                    {proj.techStack.map((t, j) => (
                      <span key={j} style={{ ...skillTag, background: '#1a2a1a', border: '1px solid #2a4a2a', color: 'lightgreen' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── empty state ── */}
      {!profile.skills?.length && !profile.education?.length && !profile.projects?.length && (
        <div style={{ ...sectionCard, textAlign: 'center', color: '#666', padding: '3rem' }}>
          <p style={{ fontSize: '1.1rem' }}>This profile is empty.</p>
          {isOwnProfile && (
            <Link to="/profile" style={{ color: '#2a6496', marginTop: '0.5rem', display: 'block' }}>
              Fill out your profile →
            </Link>
          )}
        </div>
      )}

    </div>
  );
}

// ── shared style objects ─────────────────────────────────────────────────────
const sectionCard = {
  background: '#1e1e1e',
  border: '1px solid #2a2a2a',
  borderRadius: '8px',
  padding: '1.25rem 1.5rem',
  marginBottom: '1rem',
};

const itemCard = {
  background: '#161616',
  border: '1px solid #2a2a2a',
  borderRadius: '6px',
  padding: '0.75rem 1rem',
};

const sectionTitle = {
  marginBottom: '0.85rem',
  fontSize: '1rem',
  color: '#ccc',
  letterSpacing: '0.02em',
};

const backBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  fontSize: '0.9rem',
  marginBottom: '1rem',
  padding: 0,
};

export default PublicProfilePage;