import axios from 'axios';

// Reads VITE_API_BASE injected by Vite at build time.
// In production (Vercel), this comes from .env.production or Vercel env vars.
// In local dev, set VITE_API_BASE=http://localhost:5000 in .env
const BASE = import.meta.env.VITE_API_BASE;

if (!BASE) {
  console.warn(
    '[jobApi] VITE_API_BASE is not set. ' +
    'All API calls will fail. ' +
    'Set VITE_API_BASE in .env.production (Vercel) or .env (local).'
  );
}

const API = axios.create({
  baseURL: BASE ? `${BASE}/api` : '',
});

// Auto-attach auth token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401 (stale/invalid token)
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Jobs ─────────────────────────────────────────────────────────────────────
export const getAllJobs     = (params = {}) => API.get('/jobs', { params });
export const getJobById    = (id)           => API.get(`/jobs/${id}`);
export const getMyJobs     = ()             => API.get('/jobs/my/jobs');
export const createJob     = (data)         => API.post('/jobs', data);
export const updateJob     = (id, data)     => API.put(`/jobs/${id}`, data);
export const deleteJob     = (id)           => API.delete(`/jobs/${id}`);
export const suggestSkills = (title, description) =>
  API.post('/jobs/suggest-skills', { title, description });

// ── Applications ──────────────────────────────────────────────────────────────
export const applyToJob          = (jobId, data) => API.post(`/applications/${jobId}`, data);
export const getMyApplications   = ()            => API.get('/applications/my');
export const checkApplication    = (jobId)        => API.get(`/applications/check/${jobId}`);
export const getAllRecruiterApps = ()             => API.get('/applications/recruiter/all');
export const getAppsForJob       = (jobId)        => API.get(`/applications/job/${jobId}`);
export const updateAppStatus     = (appId, data)  => API.put(`/applications/${appId}/status`, data);

// ── Matching ──────────────────────────────────────────────────────────────────
export const getMatchedJobs   = ()       => API.get('/matches/jobs');
export const getCandidates    = (jobId)  => API.get(`/matches/candidates/${jobId}`);
export const getJobMatchScore = (jobId)  => API.get(`/matches/job/${jobId}`);

// ── Profile ───────────────────────────────────────────────────────────────────
export const getMyProfile     = ()        => API.get('/profile/me');
export const upsertProfile    = (data)    => API.put('/profile/me', data);
export const getPublicProfile = (userId)  => API.get(`/profile/${userId}`);

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getRecruiterStats = () => API.get('/stats/recruiter');
export const getSeekerStats    = () => API.get('/stats/seeker');

// ── Auth ──────────────────────────────────────────────────────────────────────
export const getMe = () => API.get('/auth/me');

export default API;
