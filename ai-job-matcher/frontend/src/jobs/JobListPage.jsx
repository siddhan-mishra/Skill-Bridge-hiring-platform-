// JobListPage.jsx — redesigned with rich cards matching project UI language
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function JobListPage() {
  const { user, API_BASE } = useAuth();
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('All');

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/jobs`);
        setJobs(res.data || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [API_BASE]);

  const handleDelete = async (jobId) => {
    if (!window.confirm('Delete this job? Cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE}/api/jobs/${jobId}`);
      setJobs(prev => prev.filter(j => j._id !== jobId));
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // ── filter + search ─────────────────────────────────────────────────────
  const jobTypes = ['All', 'Full-time', 'Part-time', 'Internship', 'Contract'];

  const visible = jobs.filter(j => {
    const matchesType   = filter === 'All' || j.jobType === filter;
    const q             = search.toLowerCase();
    const matchesSearch = !q ||
      j.title?.toLowerCase().includes(q) ||
      j.company?.toLowerCase().includes(q) ||
      j.requiredSkills?.some(s => s.toLowerCase().includes(q));
    return matchesType && matchesSearch;
  });

  const scoreColor = (s) => s >= 60 ? '#4caf50' : s >= 30 ? '#ff9800' : '#f44336';

  const tagStyle = {
    display: 'inline-block',
    padding: '0.2rem 0.5rem',
    background: '#1a2a3a',
    border: '1px solid #2a4a6a',
    color: '#7ac',
    borderRadius: '12px',
    fontSize: '0.75rem',
    marginRight: '0.3rem',
    marginBottom: '0.3rem',
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* ── header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div>
          <h2 style={{ margin: 0 }}>Job Openings</h2>
          <p style={{ color: '#666', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} listed
          </p>
        </div>
        {user?.role === 'recruiter' && (
          <Link
            to="/jobs/new"
            style={{
              padding: '0.4rem 1rem', background: '#2a6496',
              color: 'white', borderRadius: '4px',
              textDecoration: 'none', fontSize: '0.9rem',
            }}
          >
            + Post New Job
          </Link>
        )}
      </div>

      {/* ── search + type filter ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by title, company, or skill..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: '200px',
            padding: '0.5rem 0.75rem',
            background: '#1e1e1e', color: 'white',
            border: '1px solid #333', borderRadius: '4px',
            fontSize: '0.9rem',
          }}
        />
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {jobTypes.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                padding: '0.4rem 0.8rem',
                background: filter === t ? '#2a6496' : '#1e1e1e',
                color: filter === t ? 'white' : '#aaa',
                border: `1px solid ${filter === t ? '#2a6496' : '#333'}`,
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading && <p style={{ color: '#aaa' }}>Loading...</p>}
      {error   && <p style={{ color: 'tomato' }}>{error}</p>}
      {!loading && !error && visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#555' }}>
          <p style={{ fontSize: '1.1rem' }}>No jobs found.</p>
          {search && <p style={{ fontSize: '0.9rem' }}>Try a different search term.</p>}
        </div>
      )}

      {/* ── job cards ── */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {visible.map(job => (
          <div
            key={job._id}
            style={{
              padding: '1.1rem 1.3rem',
              background: '#1e1e1e',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
            }}
          >
            {/* top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>
                  <Link
                    to={`/jobs/${job._id}`}
                    style={{ color: 'white', textDecoration: 'none' }}
                    onMouseEnter={e => e.target.style.color = '#7ac'}
                    onMouseLeave={e => e.target.style.color = 'white'}
                  >
                    {job.title}
                  </Link>
                </h3>
                <p style={{ color: '#aaa', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                  {job.company}
                  {job.location  && <span> · 📍 {job.location}</span>}
                  {job.jobType   && <span> · 💼 {job.jobType}</span>}
                  {job.salaryRange && <span> · 💰 {job.salaryRange}</span>}
                </p>
              </div>

              {/* job type badge */}
              {job.jobType && (
                <span style={{
                  padding: '0.2rem 0.65rem',
                  background: '#1a2a1a',
                  border: '1px solid #2a4a2a',
                  color: 'lightgreen',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  flexShrink: 0,
                }}>
                  {job.jobType}
                </span>
              )}
            </div>

            {/* description snippet */}
            {job.description && (
              <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '0.75rem' }}>
                {job.description.length > 160 ? job.description.slice(0, 160) + '...' : job.description}
              </p>
            )}

            {/* skills */}
            {job.requiredSkills?.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                {job.requiredSkills.map((s, i) => (
                  <span key={i} style={tagStyle}>{s}</span>
                ))}
              </div>
            )}

            {/* bottom action row */}
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <Link
                to={`/jobs/${job._id}`}
                style={{
                  padding: '0.35rem 0.85rem',
                  background: '#2a3a4a',
                  color: 'white',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontSize: '0.82rem',
                }}
              >
                View Details →
              </Link>

              {user?.role === 'seeker' && (
                <Link
                  to="/matches"
                  style={{
                    padding: '0.35rem 0.85rem',
                    background: '#1a3a1a',
                    border: '1px solid #2a5a2a',
                    color: 'lightgreen',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontSize: '0.82rem',
                  }}
                >
                  See My Match →
                </Link>
              )}

              {/* owner-only controls */}
              {user?.role === 'recruiter' &&
               user?.id?.toString() === job.recruiter?._id?.toString() && (
                <>
                  <Link
                    to={`/jobs/${job._id}/edit`}
                    style={{
                      padding: '0.35rem 0.75rem',
                      background: '#2a3a4a',
                      color: 'white',
                      borderRadius: '4px',
                      textDecoration: 'none',
                      fontSize: '0.82rem',
                    }}
                  >
                    ✏️ Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(job._id)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      background: '#4a1a1a',
                      color: '#ff8080',
                      border: '1px solid #6a2a2a',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                    }}
                  >
                    🗑️ Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default JobListPage;