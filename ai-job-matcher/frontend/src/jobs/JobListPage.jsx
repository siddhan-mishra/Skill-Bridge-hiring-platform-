import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

const JOB_TYPES  = ['All', 'Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
const WORK_MODES = ['All', 'Remote', 'Hybrid', 'On-site'];
const SORT_OPTS  = [{ v: 'newest', l: 'Newest First' }, { v: 'oldest', l: 'Oldest First' }, { v: 'title', l: 'Title A–Z' }];

export default function JobListPage() {
  const { API_BASE, user } = useAuth();
  const token = localStorage.getItem('token');

  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [search,     setSearch]  = useState('');
  const [typeFilter, setType]    = useState('All');
  const [modeFilter, setMode]    = useState('All');
  const [locFilter,  setLoc]     = useState('');
  const [sortBy,     setSort]    = useState('newest');
  const [appliedIds, setApplied] = useState(new Set());

  useEffect(() => {
    (async () => {
      try {
        // FIX: no longer passes source=internal — returns ALL jobs including old ones
        const res = await axios.get(`${API_BASE}/api/jobs`);
        setJobs(res.data);
        if (user?.role === 'seeker' && token) {
          try {
            const appsRes = await axios.get(`${API_BASE}/api/applications/my`,
              { headers: { Authorization: `Bearer ${token}` } });
            setApplied(new Set(appsRes.data.map(a => a.job?._id || a.job)));
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
        j.title?.toLowerCase().includes(q) ||
        j.company?.toLowerCase().includes(q) ||
        (j.description || '').toLowerCase().includes(q) ||
        (j.requiredSkills || []).some(s => s.toLowerCase().includes(q))
      );
    }
    if (typeFilter !== 'All') list = list.filter(j => j.jobType === typeFilter);
    if (modeFilter !== 'All') list = list.filter(j => j.workMode === modeFilter);
    if (locFilter.trim()) {
      const lq = locFilter.toLowerCase();
      list = list.filter(j => (j.location || '').toLowerCase().includes(lq));
    }
    if (sortBy === 'newest') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sortBy === 'oldest') list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (sortBy === 'title')  list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [jobs, search, typeFilter, modeFilter, locFilter, sortBy]);

  // Build salary display string from new schema fields OR fallback to old salaryRange string
  const salaryLabel = (job) => {
    if (job.salaryMin && job.salaryMax)
      return `${job.salaryMin}–${job.salaryMax} ${job.salaryUnit || 'LPA'} ${job.salaryCurrency || 'INR'}`;
    if (job.salaryMin) return `From ${job.salaryMin} ${job.salaryUnit || 'LPA'}`;
    if (job.salaryMax) return `Up to ${job.salaryMax} ${job.salaryUnit || 'LPA'}`;
    if (job.salaryRange) return job.salaryRange; // backward compat for old jobs
    return null;
  };

  const S = {
    inp: { background: '#0f172a', color: '#e5e7eb', border: '1px solid #1f2937', borderRadius: 7, padding: '0.45rem 0.75rem', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit' },
    tag: { display: 'inline-block', padding: '0.18rem 0.6rem', background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 999, fontSize: '0.74rem', marginRight: '0.3rem', marginBottom: '0.3rem' },
    modeBadge: (mode) => ({
      display: 'inline-block', padding: '0.15rem 0.55rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
      background: mode === 'Remote' ? 'rgba(16,185,129,0.1)' : mode === 'Hybrid' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
      color:      mode === 'Remote' ? '#34d399'              : mode === 'Hybrid' ? '#fbbf24'              : '#818cf8',
      border:     `1px solid ${mode === 'Remote' ? 'rgba(16,185,129,0.25)' : mode === 'Hybrid' ? 'rgba(245,158,11,0.25)' : 'rgba(99,102,241,0.25)'}`,
    }),
  };

  if (loading) return <div className="card"><p style={{ color: '#9ca3af' }}>⏳ Loading jobs…</p></div>;
  if (error)   return <div className="card"><p style={{ color: '#f87171' }}>{error}</p></div>;

  return (
    <div style={{ maxWidth: 900, width: '100%' }}>

      {/* ── Filter Bar ── */}
      <div style={{ background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <input style={{ ...S.inp, flex: '1 1 200px', minWidth: 140 }}
          placeholder="🔍 Search title, company, skill…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <input style={{ ...S.inp, width: 150 }} placeholder="📍 Location"
          value={locFilter} onChange={e => setLoc(e.target.value)} />
        <select style={{ ...S.inp, width: 130 }} value={typeFilter} onChange={e => setType(e.target.value)}>
          {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select style={{ ...S.inp, width: 120 }} value={modeFilter} onChange={e => setMode(e.target.value)}>
          {WORK_MODES.map(m => <option key={m}>{m}</option>)}
        </select>
        <select style={{ ...S.inp, width: 150 }} value={sortBy} onChange={e => setSort(e.target.value)}>
          {SORT_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <span style={{ color: '#4b5563', fontSize: '0.82rem', marginLeft: 'auto' }}>
          {filtered.length} job{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Job Cards ── */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
          <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>No jobs match your filters.</p>
          <p style={{ color: '#374151', fontSize: '0.82rem' }}>Try clearing filters or check back later.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(job => {
            const isApplied = appliedIds.has(job._id);
            const salary    = salaryLabel(job);
            return (
              <div key={job._id}
                style={{ background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: 10, padding: '1.1rem 1.4rem', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#374151'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1f2937'}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <Link to={`/jobs/${job._id}`} style={{ fontWeight: 700, fontSize: '1rem', color: '#e5e7eb' }}>{job.title}</Link>
                    <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '0.2rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                      <span>{job.company}</span>
                      {job.location && <span>· {job.location}</span>}
                      {job.jobType  && <span>· {job.jobType}</span>}
                      {job.workMode && <span style={S.modeBadge(job.workMode)}>{job.workMode}</span>}
                      {salary && <span style={{ color: '#6366f1', fontWeight: 600 }}>· {salary}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {isApplied && (
                      <span style={{ padding: '0.2rem 0.65rem', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 999, fontSize: '0.75rem' }}>✓ Applied</span>
                    )}
                    <Link to={`/jobs/${job._id}`}
                      style={{ padding: '0.3rem 0.9rem', background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6, fontSize: '0.82rem' }}>
                      View →
                    </Link>
                  </div>
                </div>

                {job.requiredSkills?.length > 0 && (
                  <div style={{ marginTop: '0.65rem' }}>
                    {job.requiredSkills.slice(0, 7).map((s, i) => <span key={i} style={S.tag}>{s}</span>)}
                    {job.requiredSkills.length > 7 && (
                      <span style={{ ...S.tag, background: 'transparent', color: '#4b5563' }}>+{job.requiredSkills.length - 7} more</span>
                    )}
                  </div>
                )}

                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {job.experienceYears > 0 && <span style={{ color: '#4b5563', fontSize: '0.78rem' }}>⏱ {job.experienceYears}+ yrs</span>}
                  {job.educationLevel && job.educationLevel !== 'Any' && <span style={{ color: '#4b5563', fontSize: '0.78rem' }}>🎓 {job.educationLevel}</span>}
                  <span style={{ color: '#374151', fontSize: '0.75rem', marginLeft: 'auto' }}>
                    {new Date(job.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
