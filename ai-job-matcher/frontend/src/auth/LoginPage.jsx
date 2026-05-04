// LoginPage.jsx — modernized, role-aware redirect, styled to match dark theme
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { saveAuth, API_BASE, setLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]   = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  // Already logged in → redirect
  if (isAuthenticated && user) {
    navigate(user.role === 'recruiter' ? '/recruiter/dashboard' : '/dashboard', { replace: true });
    return null;
  }

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setBusy(true);
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, form);
      saveAuth(res.data.token, res.data.user);
      const role = res.data.user?.role;
      navigate(role === 'recruiter' ? '/recruiter/dashboard' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setBusy(false);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        background: '#070d1a', border: '1px solid #1f2937', borderRadius: 16,
        padding: '2.5rem 2rem', width: '100%', maxWidth: 420,
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800,
            background: 'linear-gradient(135deg,#6366f1,#818cf8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SkillBridge
          </div>
          <p style={{ color: '#4b5563', fontSize: '0.9rem', marginTop: '0.4rem' }}>Sign in to your account</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '0.75rem 1rem', color: '#f87171',
            fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.8rem',
              fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase',
              letterSpacing: '0.05em' }}>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required
              style={{ width: '100%', padding: '0.65rem 0.9rem', background: '#0a0f1e',
                border: '1px solid #374151', borderRadius: 8, color: '#e5e7eb',
                fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.8rem',
              fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase',
              letterSpacing: '0.05em' }}>Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required
              style={{ width: '100%', padding: '0.65rem 0.9rem', background: '#0a0f1e',
                border: '1px solid #374151', borderRadius: 8, color: '#e5e7eb',
                fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" disabled={busy} style={{
            width: '100%', padding: '0.75rem',
            background: busy ? '#374151' : 'linear-gradient(135deg,#6366f1,#818cf8)',
            color: '#fff', border: 'none', borderRadius: 8,
            fontWeight: 700, fontSize: '1rem', cursor: busy ? 'not-allowed' : 'pointer',
          }}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#4b5563', fontSize: '0.85rem' }}>
          No account?{' '}
          <Link to="/register" style={{ color: '#818cf8', fontWeight: 600 }}>Register here</Link>
        </p>
      </div>
    </div>
  );
}
