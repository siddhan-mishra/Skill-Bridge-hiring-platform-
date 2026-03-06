import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function JobListPage() {
  const { user, API_BASE } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div style={{ padding: '2rem', color: 'white' }}>
      <h2>Job Openings</h2>
      {user?.role === 'recruiter' && (
        <p><Link to="/jobs/new">+ Post a new job</Link></p>
      )}
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'tomato' }}>{error}</p>}
      {!loading && !jobs.length && <p>No jobs posted yet.</p>}

      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        {jobs.map(job => (
          <div
            key={job._id}
            style={{
              border: '1px solid #333',
              padding: '1rem',
              borderRadius: '4px',
              background: '#1e1e1e',
            }}
          >
            <h3>{job.title}</h3>
            <p>{job.company} {job.location && `• ${job.location}`}</p>
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
          </div>
        ))}
      </div>
    </div>
  );
}

export default JobListPage;
