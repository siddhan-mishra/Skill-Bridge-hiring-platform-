// RegisterPage.jsx — modernized, role-aware redirect, styled to match dark theme
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './AuthContext';

export default function RegisterPage() {
  const { saveAuth, API_BASE, setLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'seeker' });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [busy,    setBusy]    = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setBusy(true); setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/register`, form);
      saveAuth(res.data.token, res.data.user);
      const role = res.data.user?.role;
      navigate(role === 'recruiter' ? '/recruiter/dashboard' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setBusy(false); setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        background: '#070d1a', border: '1px solid #1f2937', borderRadius: 16,
        padding: '2.5rem 2rem', width: '100%', maxWidth: 440,
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800,
            background: 'linear-gradient(135deg,#6366f1,#818cf8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SkillBridge
          </div>
          <p style={{ color: '#4b5563', fontSize: '0.9rem', marginTop: '0.4rem' }}>Create your account</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '0.75rem 1rem', color: '#f87171',
            fontSize: '0.85rem', marginBottom: '1.25rem' }}>{error}</div>
        )}
        {success && (
          <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
            borderRadius: 8, padding: '0.75rem 1rem', color: '#34d399',
            fontSize: '0.85rem', marginBottom: '1.25rem' }}>{success}</div>
        )}

        <form onSubmit={handleSubmit}>
          {[{label:'Full Name', name:'name', type:'text'}, {label:'Email', name:'email', type:'email'}].map(({label,name,type}) => (
            <div key={name} style={{ marginBottom: '1.1rem' }}>
              <label style={{ display:'block', color:'#9ca3af', fontSize:'0.8rem', fontWeight:600,
                marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</label>
              <input type={type} name={name} value={form[name]} onChange={handleChange} required
                style={{ width:'100%', padding:'0.65rem 0.9rem', background:'#0a0f1e',
                  border:'1px solid #374151', borderRadius:8, color:'#e5e7eb',
                  fontSize:'0.95rem', outline:'none', boxSizing:'border-box' }} />
            </div>
          ))}

          <div style={{ marginBottom: '1.1rem' }}>
            <label style={{ display:'block', color:'#9ca3af', fontSize:'0.8rem', fontWeight:600,
              marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange}
              required minLength={6}
              style={{ width:'100%', padding:'0.65rem 0.9rem', background:'#0a0f1e',
                border:'1px solid #374151', borderRadius:8, color:'#e5e7eb',
                fontSize:'0.95rem', outline:'none', boxSizing:'border-box' }} />
            <span style={{ fontSize:'0.72rem', color:'#4b5563' }}>Minimum 6 characters</span>
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display:'block', color:'#9ca3af', fontSize:'0.8rem', fontWeight:600,
              marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>I am a…</label>
            <div style={{ display:'flex', gap:'0.75rem' }}>
              {['seeker', 'recruiter'].map(r => (
                <label key={r} style={{ flex:1, display:'flex', alignItems:'center', gap:'0.5rem',
                  padding:'0.65rem', border: form.role === r ? '1px solid #6366f1' : '1px solid #374151',
                  borderRadius:8, cursor:'pointer', background: form.role === r ? 'rgba(99,102,241,0.1)' : 'transparent',
                  color: form.role === r ? '#818cf8' : '#9ca3af', fontWeight: form.role === r ? 700 : 400,
                  fontSize:'0.9rem', transition:'all 0.15s' }}>
                  <input type="radio" name="role" value={r} checked={form.role === r} onChange={handleChange}
                    style={{ display:'none' }} />
                  {r === 'seeker' ? '🎯 Job Seeker' : '🏢 Recruiter'}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={busy} style={{
            width:'100%', padding:'0.75rem',
            background: busy ? '#374151' : 'linear-gradient(135deg,#6366f1,#818cf8)',
            color:'#fff', border:'none', borderRadius:8,
            fontWeight:700, fontSize:'1rem', cursor: busy ? 'not-allowed' : 'pointer',
          }}>
            {busy ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:'1.5rem', color:'#4b5563', fontSize:'0.85rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'#818cf8', fontWeight:600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
