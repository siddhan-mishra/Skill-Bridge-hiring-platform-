import axios from 'axios';

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Job CRUD ──────────────────────────────────────────────────────────────
export const getAllJobs    = (params = {}) => API.get('/jobs', { params });
export const getJobById   = (id)          => API.get(`/jobs/${id}`);
export const getMyJobs    = ()            => API.get('/jobs/my/jobs');
export const createJob    = (data)        => API.post('/jobs', data);
export const updateJob    = (id, data)    => API.put(`/jobs/${id}`, data);
export const deleteJob    = (id)          => API.delete(`/jobs/${id}`);

// ── AI Skill Suggestions ─────────────────────────────────────────────────
// Used by job create/edit form to suggest skill chips
export const suggestSkills = (title, description) =>
  API.post('/jobs/suggest-skills', { title, description });
