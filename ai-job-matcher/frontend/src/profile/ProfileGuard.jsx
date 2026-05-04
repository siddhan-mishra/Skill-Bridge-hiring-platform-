import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import API from '../api/jobApi';

/**
 * ProfileGuard — wraps seeker pages.
 * If the seeker has no headline or no skills:
 *   • Shows a persistent yellow banner at the top of the page
 *   • Auto-redirects to /profile/edit after 4s
 *   • Seeker can dismiss and stay on page (soft guard, not hard block)
 *
 * Usage in App.jsx:
 *   <Route path="/matches" element={<ProfileGuard><MatchedJobsPage /></ProfileGuard>} />
 */
export default function ProfileGuard({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile,     setProfile]     = useState(undefined); // undefined = loading
  const [dismissed,   setDismissed]   = useState(false);
  const [countdown,   setCountdown]   = useState(4);

  const isIncomplete = profile !== undefined && profile !== null && (
    !profile.headline ||
    !profile.skills   ||
    profile.skills.length === 0
  );
  const hasNoProfile = profile === null;
  const needsGuard   = (isIncomplete || hasNoProfile) && !dismissed;

  // Fetch profile once
  useEffect(() => {
    if (!user || user.role !== 'seeker') return;
    API.get('/profile/me')
      .then(r => setProfile(r.data))
      .catch(() => setProfile(null));
  }, [user]);

  // Countdown + auto-redirect
  useEffect(() => {
    if (!needsGuard) return;
    if (countdown <= 0) { navigate('/profile/edit'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [needsGuard, countdown, navigate]);

  // Not a seeker — render children as-is
  if (!user || user.role !== 'seeker') return children;
  // Still loading
  if (profile === undefined) return children;

  return (
    <>
      {needsGuard && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.35)',
          borderRadius: 10,
          padding: '0.75rem 1.25rem',
          marginBottom: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
            <div>
              <p style={{ margin: 0, color: '#fbbf24', fontWeight: 700, fontSize: '0.9rem' }}>
                Your profile is incomplete — AI matching won't work properly.
              </p>
              <p style={{ margin: '0.1rem 0 0', color: '#d97706', fontSize: '0.8rem' }}>
                Add a headline and at least one skill. Redirecting to profile in <strong>{countdown}s</strong>…
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => navigate('/profile/edit')}
              style={{ padding: '0.35rem 1rem', background: '#f59e0b', color: '#0a0f1e', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
              Complete Profile
            </button>
            <button
              onClick={() => { setDismissed(true); setCountdown(4); }}
              style={{ padding: '0.35rem 0.75rem', background: 'transparent', color: '#9ca3af', border: '1px solid #374151', borderRadius: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
              Dismiss
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  );
}

/**
 * useProfileCompleteness — standalone hook for pages that need completeness %
 * Returns: { completeness: 0-100, missingFields: string[], profile }
 */
export function useProfileCompleteness() {
  const { user } = useAuth();
  const [data, setData] = useState({ completeness: null, missingFields: [], profile: null });

  useEffect(() => {
    if (!user || user.role !== 'seeker') return;
    API.get('/profile/me').then(r => {
      const p = r.data;
      if (!p) { setData({ completeness: 0, missingFields: ['entire profile'], profile: null }); return; }
      const checks = [
        { field: 'headline',    label: 'Headline',           ok: !!p.headline },
        { field: 'summary',     label: 'Summary',            ok: !!p.summary },
        { field: 'skills',      label: 'Skills',             ok: (p.skills||[]).length > 0 },
        { field: 'location',    label: 'Location',           ok: !!p.location },
        { field: 'workHistory', label: 'Work Experience',    ok: (p.workHistory||[]).length > 0 },
        { field: 'education',   label: 'Education',          ok: (p.education||[]).length > 0 },
      ];
      const filled  = checks.filter(c => c.ok).length;
      const missing = checks.filter(c => !c.ok).map(c => c.label);
      setData({ completeness: Math.round((filled / checks.length) * 100), missingFields: missing, profile: p });
    }).catch(() => setData({ completeness: 0, missingFields: ['entire profile'], profile: null }));
  }, [user]);

  return data;
}
