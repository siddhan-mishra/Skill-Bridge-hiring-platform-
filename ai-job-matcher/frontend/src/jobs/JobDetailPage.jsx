import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

const S = {
  tag: {
    display: 'inline-block', padding: '0.2rem 0.7rem',
    background: 'rgba(99,102,241,0.15)', color: '#818cf8',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: '999px', fontSize: '0.78rem',
    marginRight: '0.4rem', marginBottom: '0.4rem',
  },
  matchTag: (matched) => ({
    display: 'inline-block', padding: '0.2rem 0.7rem',
    background: matched ? 'rgba(16,185,129,0.12)' : 'rgba(248,113,113,0.1)',
    color: matched ? '#34d399' : '#f87171',
    border: `1px solid ${matched ? 'rgba(16,185,129,0.3)' : 'rgba(248,113,113,0.25)'}`,
    borderRadius: '999px', fontSize: '0.78rem',
    marginRight: '0.4rem', marginBottom: '0.4rem',
  }),
  meta: { color: '#9ca3af', fontSize: '0.88rem' },
  statusBadge: (status) => {
    const map = {
      pending:     { bg: 'rgba(99,102,241,0.15)',   color: '#818cf8' },
      reviewed:    { bg: 'rgba(245,158,11,0.15)',   color: '#fbbf24' },
      shortlisted: { bg: 'rgba(16,185,129,0.15)',   color: '#34d399' },
      rejected:    { bg: 'rgba(248,113,113,0.12)',  color: '#f87171' },
    };
    const c = map[status] || map.pending;
    return { padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600, background: c.bg, color: c.color, display: 'inline-block' };
  },
};

export default function JobDetailPage() {
  const { id } = useParams();
  const { user, API_BASE } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [job,         setJob]         = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [applying,    setApplying]    = useState(false);
  const [appStatus,   setAppStatus]   = useState(null);  // null | { applied, status }
  const [coverNote,   setCoverNote]   = useState('');
  const [showCover,   setShowCover]   = useState(false);
  const [appMsg,      setAppMsg]      = useState('');
  const [myProfile,   setMyProfile]   = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [jobRes] = await Promise.all([
          axios.get(`${API_BASE}/api/jobs/${id}`),
        ]);
        setJob(jobRes.data);

        if (user?.role === 'seeker' && token) {
          const [checkRes, profRes] = await Promise.all([
            axios.get(`${API_BASE}/api/applications/check/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API_BASE}/api/profile/me`, { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          setAppStatus(checkRes.data);
          setMyProfile(profRes.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Job not found');
      } finally {
        setLoading(false);
      }
    })();
  }, [API_BASE, id, user, token]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this job posting? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE}/api/jobs/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      navigate('/jobs');
    } catch (err) { setError(err.response?.data?.message || 'Failed to delete'); }
  };

  const handleApply = async () => {
    setApplying(true); setAppMsg('');
    try {
      await axios.post(
        `${API_BASE}/api/applications/${id}`,
        { coverNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAppStatus({ applied: true, status: 'pending' });
      setShowCover(false);
      setAppMsg('🎉 Application submitted! The recruiter will be notified.');
    } catch (err) {
      setAppMsg(err.response?.data?.message || 'Application failed');
    } finally { setApplying(false); }
  };

  if (loading) return <div className="card"><p>Loading…</p></div>;
  if (error)   return <div className="card"><p style={{color:'#f87171'}}>{error}</p><Link to="/jobs">← Back</Link></div>;
  if (!job)    return <div className="card"><p>Job not found.</p></div>;

  const isOwner = user?.role === 'recruiter' && user?.id?.toString() === job.recruiter?._id?.toString();

  // Compute which skills match if seeker
  const mySkillsLower = (myProfile?.skills || []).map(s => s.toLowerCase());
  const requiredLower = (job.requiredSkills || []).map(s => s.toLowerCase());
  const matchedSet    = new Set(requiredLower.filter(s => mySkillsLower.includes(s)));
  const matchPct      = requiredLower.length > 0 ? Math.round((matchedSet.size / requiredLower.length) * 100) : 0;

  return (
    <div className="card" style={{ maxWidth: 820 }}>
      <p style={{ marginBottom: '1.25rem' }}>
        <Link to="/jobs" style={{ color: '#6b7280', fontSize: '0.88rem' }}>← Back to all jobs</Link>
      </p>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.25rem' }}>{job.title}</h2>
        <p style={{ fontSize: '1.05rem', color: '#d1d5db', margin: '0 0 1rem' }}>{job.company}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
          {job.location    && <span style={S.meta}>📍 {job.location}</span>}
          {job.jobType     && <span style={S.meta}>💼 {job.jobType}</span>}
          {job.salaryRange && <span style={S.meta}>💰 {job.salaryRange}</span>}
          {job.recruiter?.name && <span style={S.meta}>👤 {job.recruiter.name}</span>}
        </div>
      </div>

      {/* Required skills with match highlight for seekers */}
      {job.requiredSkills?.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.6rem', fontSize: '0.92rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Required Skills</h3>
          <div>
            {job.requiredSkills.map((skill, i) => {
              const matched = myProfile ? matchedSet.has(skill.toLowerCase()) : false;
              return <span key={i} style={myProfile ? S.matchTag(matched) : S.tag}>{skill}</span>;
            })}
          </div>
          {myProfile && (
            <p style={{ color: '#6b7280', fontSize: '0.82rem', marginTop: '0.4rem' }}>
              🟢 = you have it &nbsp;🔴 = missing &nbsp;·&nbsp; Match: <strong style={{ color: matchPct >= 70 ? '#34d399' : matchPct >= 40 ? '#fbbf24' : '#f87171' }}>{matchPct}%</strong>
            </p>
          )}
        </div>
      )}

      {/* Description */}
      {job.description && (
        <div style={{ marginBottom: '1.75rem' }}>
          <h3 style={{ margin: '0 0 0.6rem', fontSize: '0.92rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Job Description</h3>
          <p style={{ lineHeight: '1.75', color: '#d1d5db', whiteSpace: 'pre-wrap', margin: 0 }}>{job.description}</p>
        </div>
      )}

      {/* ── SEEKER APPLY SECTION ── */}
      {user?.role === 'seeker' && (
        <div style={{ borderTop: '1px solid #1f2937', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
          {appStatus?.applied ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Your application:</span>
              <span style={S.statusBadge(appStatus.status)}>
                {{ pending: '📋 Pending', reviewed: '👀 Under Review', shortlisted: '🎉 Shortlisted', rejected: '😔 Not Selected' }[appStatus.status] || appStatus.status}
              </span>
            </div>
          ) : (
            <div>
              {!showCover ? (
                <button
                  onClick={() => setShowCover(true)}
                  style={{ padding: '0.55rem 1.5rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.92rem' }}>
                  ✉️ Apply Now
                </button>
              ) : (
                <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: '8px', padding: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cover Note (optional)</label>
                  <textarea
                    value={coverNote} onChange={e => setCoverNote(e.target.value)}
                    rows={4} placeholder="Tell the recruiter why you're a great fit…"
                    style={{ width: '100%', background: '#1a1a2e', color: '#e5e7eb', border: '1px solid #2d3748', borderRadius: '6px', padding: '0.6rem 0.8rem', marginTop: '0.4rem', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                    <button onClick={handleApply} disabled={applying}
                      style={{ padding: '0.45rem 1.25rem', background: applying ? '#374151' : '#6366f1', color: 'white', border: 'none', borderRadius: '7px', cursor: applying ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>
                      {applying ? 'Submitting…' : '🚀 Submit Application'}
                    </button>
                    <button onClick={() => setShowCover(false)}
                      style={{ padding: '0.45rem 1rem', background: 'none', color: '#6b7280', border: '1px solid #374151', borderRadius: '7px', cursor: 'pointer', fontSize: '0.88rem' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {appMsg && (
            <p style={{ marginTop: '0.6rem', fontSize: '0.85rem', color: appMsg.startsWith('🎉') ? '#34d399' : '#f87171' }}>{appMsg}</p>
          )}
        </div>
      )}

      {/* ── RECRUITER OWNER CONTROLS ── */}
      {isOwner && (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #1f2937' }}>
          <Link to={`/jobs/${id}/edit`}
            style={{ padding: '0.45rem 1.2rem', background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '7px', fontSize: '0.88rem' }}>
            ✏️ Edit Job
          </Link>
          <button onClick={handleDelete}
            style={{ padding: '0.45rem 1.2rem', background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '7px', cursor: 'pointer', fontSize: '0.88rem' }}>
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
}
