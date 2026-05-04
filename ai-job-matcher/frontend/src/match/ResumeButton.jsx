import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import API from '../api/jobApi';

/**
 * ResumeButton — drop-in button for SeekerDashboard and ProfilePage.
 * 
 * Usage:
 *   import ResumeButton from '../match/ResumeButton';
 *   <ResumeButton />
 *
 * What it does:
 *   1. Calls GET /api/resume/generate (authenticated)
 *   2. Receives binary .docx as blob
 *   3. Creates a temporary object URL and auto-clicks download
 *   4. Shows loading spinner during generation (can take 10-20s)
 *   5. Shows friendly error if profile is incomplete
 */
export default function ResumeButton({ style = {} }) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState('');
  const [isErr,   setIsErr]   = useState(false);

  if (!user || user.role !== 'seeker') return null;

  const handleGenerate = async () => {
    setLoading(true);
    setMsg('');
    setIsErr(false);

    try {
      // responseType blob so axios returns raw binary
      const resp = await API.get('/resume/generate', { responseType: 'blob' });

      // Extract filename from Content-Disposition header if present
      const disposition = resp.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : `${user.name || 'Resume'}_Resume.docx`;

      // Trigger browser download without opening a new tab
      const url  = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href     = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMsg('✅ Resume downloaded!');
    } catch (err) {
      setIsErr(true);
      const errData = err.response?.data;
      // Blob error responses need to be read as text
      if (errData instanceof Blob) {
        const text = await errData.text();
        try {
          const json = JSON.parse(text);
          if (json.missing) {
            setMsg(`⚠️ Missing: ${json.missing.join(', ')} — complete your profile first.`);
          } else {
            setMsg(json.message || 'Generation failed. Try again.');
          }
        } catch {
          setMsg('Resume generation failed. Please try again.');
        }
      } else {
        setMsg(errData?.message || 'Resume generation failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem', ...style }}>
      <button
        onClick={handleGenerate}
        disabled={loading}
        title="Generate a Harvard-format .docx resume powered by Gemini AI"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.55rem 1.4rem',
          background: loading
            ? '#374151'
            : 'linear-gradient(135deg, #6366f1, #818cf8)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: '0.9rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'opacity 0.2s',
          opacity: loading ? 0.75 : 1,
        }}
      >
        {loading ? (
          <>
            <span style={{
              display: 'inline-block',
              width: 14, height: 14,
              border: '2px solid rgba(255,255,255,0.4)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            Generating… (10-20s)
          </>
        ) : (
          <>
            📄 Generate My Resume
          </>
        )}
      </button>

      {msg && (
        <p style={{
          margin: 0,
          fontSize: '0.82rem',
          color: isErr ? '#f87171' : '#34d399',
        }}>
          {msg}
          {isErr && (
            <span
              onClick={() => navigate('/profile/edit')}
              style={{ marginLeft: '0.4rem', color: '#818cf8', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Go to Profile →
            </span>
          )}
        </p>
      )}

      {/* Keyframe for spinner — injected once */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
