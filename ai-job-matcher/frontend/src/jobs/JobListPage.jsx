import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

const JOB_TYPES  = ['All', 'Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
const SORT_OPTS  = [{ v: 'newest', l: 'Newest First' }, { v: 'oldest', l: 'Oldest First' }, { v: 'title', l: 'Title A–Z' }];

export default function JobListPage() {
  const { API_BASE, user } = useAuth();
  const token = localStorage.getItem('token');

  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // Filters
  const [search,   setSearch]   = useState('');
  const [typeFilter, setType]   = useState('All');
  const [locFilter,  setLoc]    = useState('');
  const [sortBy,     setSort]   = useState('newest');

  // Applied jobs set for seeker
  const [appliedIds, setAppliedIds] = useState(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/jobs`);
        setJobs(res.data);
        // Load seeker's applications
        if (user?.role === 'seeker' && token) {
          try {
            const appsRes = await axios.get(`${API_BASE}/api/applications/my`, { headers: { Authorization: `Bearer ${token}` } });
            setAppliedIds(new Set(appsRes.data.map(a => a.job?._id || a.job)));
          } catch {}
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load jobs');
      } finally {
        setLoading(false);
      }
    })();
  }, [API_BASE, user, token]);

  const filtered = useMemo(() => {
    let list = [...jobs];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        (j.description || '').toLowerCase().includes(q) ||
        (j.requiredSkills || []).some(s => s.toLowerCase().includes(q))
      );
    }
    if (typeFilter !== 'All') list = list.filter(j => j.jobType === typeFilter);
    if (locFilter.trim()) {
      const lq = locFilter.toLowerCase();
      list = list.filter(j => (j.location || '').toLowerCase().includes(lq));
    }
    if (sortBy === 'newest') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sortBy === 'oldest') list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (sortBy === 'title')  list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [jobs, search, typeFilter, locFilter, sortBy]);

  const tagStyle = {
    display: 'inline-block', padding: '0.18rem 0.6rem',
    background: 'rgba(99,102,241,0.12)', color: '#818cf8',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: '999px', fontSize: '0.74rem',
    marginRight: '0.3rem', marginBottom: '0.3rem',
  };

  const inp = {
    background: '#0f172a', color: '#e5e7eb', border: '1px solid #1f2937',
    borderRadius: '7px', padding: '0.45rem 0.75rem', fontSize: '0.88rem',
    outline: 'none', fontFamily: 'inherit',
  };

  if (loading) return <div className="card"><p>Loading jobs…</p></div>;
  if (error)   return <div className="card"><p style={{color:'#f87171'}}>{error}</p></div>;

  return (
    <div style={{ maxWidth: 900, width: '100%' }}>

      {/* ── Filters bar ── */}
      <div style={{ background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <input
          style={{ ...inp, flex: '1 1 200px', minWidth: 140 }}
          placeholder="🔍 Search title, company, skill…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <input
          style={{ ...inp, width: 150 }}
          placeholder="📍 Location"
          value={locFilter} onChange={e => setLoc(e.target.value)}
        />
        <select style={{ ...inp, width: 140 }} value={typeFilter} onChange={e => setType(e.target.value)}>
          {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select style={{ ...inp, width: 150 }} value={sortBy} onChange={e => setSort(e.target.value)}>
          {SORT_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <span style={{ color: '#4b5563', fontSize: '0.82rem', marginLeft: 'auto' }}>{filtered.length} job{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Job cards ── */}
      {filtered.length === 0 ? (
        <div className="card"><p style={{color:'#6b7280'}}>No jobs match your filters.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(job => {
            const isApplied = appliedIds.has(job._id);
            return (
              <div key={job._id}
                style={{ background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: '10px', padding: '1.1rem 1.4rem', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#374151'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1f2937'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <Link to={`/jobs/${job._id}`} style={{ fontWeight: 700, fontSize: '1rem', color: '#e5e7eb' }}>{job.title}</Link>
                    <div style={{ color: '#9ca3af', fontSize: '0.88rem', marginTop: '0.15rem' }}>
                      {job.company}{job.location ? ` · ${job.location}` : ''}{job.jobType ? ` · ${job.jobType}` : ''}
                      {job.salaryRange ? <span style={{ color: '#6366f1', marginLeft: '0.5rem' }}>· {job.salaryRange}</span> : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {isApplied && <span style={{ padding: '0.2rem 0.65rem', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '999px', fontSize: '0.75rem' }}>✓ Applied</span>}
                    <Link to={`/jobs/${job._id}`}
                      style={{ padding: '0.3rem 0.9rem', background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', fontSize: '0.82rem' }}>
                      View →
                    </Link>
                  </div>
                </div>
                {job.requiredSkills?.length > 0 && (
                  <div style={{ marginTop: '0.65rem' }}>
                    {job.requiredSkills.slice(0, 7).map((s, i) => <span key={i} style={tagStyle}>{s}</span>)}
                    {job.requiredSkills.length > 7 && <span style={{ ...tagStyle, background: 'transparent', color: '#4b5563' }}>+{job.requiredSkills.length - 7} more</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
