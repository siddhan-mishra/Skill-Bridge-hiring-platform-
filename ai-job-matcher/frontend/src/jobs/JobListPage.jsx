import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function JobListPage() {
  const { user, API_BASE } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit state
  const [editingJob, setEditingJob] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const token = localStorage.getItem('token');

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

  const openEdit = (job) => {
    setEditingJob(job);
    setEditForm({
      title: job.title || '',
      company: job.company || '',
      location: job.location || '',
      jobType: job.jobType || 'Full-time',
      salaryRange: job.salaryRange || '',
      description: job.description || '',
      requiredSkills: job.requiredSkills?.join(', ') || '',
    });
    setEditError('');
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(f => ({ ...f, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    setEditError('');
    try {
      const payload = {
        ...editForm,
        requiredSkills: editForm.requiredSkills
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      };
      const res = await axios.put(
        `${API_BASE}/api/jobs/${editingJob._id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setJobs(prev => prev.map(j => j._id === editingJob._id ? res.data : j));
      setEditingJob(null);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update job');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm('Delete this job posting? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE}/api/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJobs(prev => prev.filter(j => j._id !== jobId));
    } catch (err) {
      alert('Failed to delete: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="card">
      <h2>Job Openings</h2>

      {user?.role === 'recruiter' && (
        <p><Link to="/jobs/new" className="btn btn-secondary">+ Post a new job</Link></p>
      )}

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'tomato' }}>{error}</p>}
      {!loading && !jobs.length && <p>No jobs posted yet.</p>}

      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        {jobs.map(job => (
          <div
            key={job._id}
            className="card subtle"
            style={{
              border: '1px solid #333',
              padding: '1rem',
              borderRadius: '4px',
              background: '#1e1e1e',
            }}
          >
            <h3>
              <Link
                to={`/jobs/${job._id}`}
                style={{ color: 'white', textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                onMouseLeave={e => e.target.style.textDecoration = 'none'}
              >
                {job.title}
              </Link>
            </h3>
            <p>{job.company}{job.location && ` • ${job.location}`}</p>
            {job.jobType && <p>Type: {job.jobType}</p>}
            {job.salaryRange && <p>Salary: {job.salaryRange}</p>}
            <p style={{ marginTop: '0.5rem' }}>
              {job.description?.length > 180
                ? job.description.slice(0, 180) + '...'
                : job.description}
            </p>
            {job.requiredSkills?.length > 0 && (
              <p style={{ marginTop: '0.5rem' }}>
                <strong>Skills:</strong> {job.requiredSkills.join(', ')}
              </p>
            )}

            {/* Show Edit/Delete only to the recruiter who owns this job */}
            {user?.role === 'recruiter' && user?.id?.toString() === job.recruiter?._id?.toString() && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => openEdit(job)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    background: '#2a6496',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(job._id)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    background: '#8B0000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── EDIT MODAL ── */}
      {editingJob && (
        <div style={{
          position: 'fixed', top: 0, left: 0,
          width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#1e1e1e',
            border: '1px solid #444',
            padding: '2rem',
            borderRadius: '8px',
            width: '540px',
            maxWidth: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Edit Job</h2>

            {editError && <p style={{ color: 'tomato', marginBottom: '1rem' }}>{editError}</p>}

            <form onSubmit={handleEditSubmit}>
              {[
                { label: 'Job Title', name: 'title', type: 'input' },
                { label: 'Company', name: 'company', type: 'input' },
                { label: 'Location', name: 'location', type: 'input' },
                { label: 'Salary Range (e.g. 4–6 LPA)', name: 'salaryRange', type: 'input' },
                { label: 'Required Skills (comma-separated)', name: 'requiredSkills', type: 'input' },
              ].map(({ label, name, type }) => (
                <div key={name} style={{ marginBottom: '1rem' }}>
                  <label>{label}</label><br />
                  <input
                    type="text"
                    name={name}
                    value={editForm[name]}
                    onChange={handleEditChange}
                    style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem', background: '#2a2a2a', color: 'white', border: '1px solid #555', borderRadius: '4px' }}
                  />
                </div>
              ))}

              <div style={{ marginBottom: '1rem' }}>
                <label>Job Type</label><br />
                <select
                  name="jobType"
                  value={editForm.jobType}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem', background: '#2a2a2a', color: 'white', border: '1px solid #555', borderRadius: '4px' }}
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label>Job Description</label><br />
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  rows={5}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem', background: '#2a2a2a', color: 'white', border: '1px solid #555', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="submit"
                  disabled={editSaving}
                  style={{ padding: '0.5rem 1.2rem', background: '#2a6496', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {editSaving ? 'Saving...' : '💾 Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  style={{ padding: '0.5rem 1.2rem', background: '#444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobListPage;