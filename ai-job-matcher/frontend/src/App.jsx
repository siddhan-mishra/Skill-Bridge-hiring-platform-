import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import LoginPage from './auth/LoginPage';
import RegisterPage from './auth/RegisterPage';
import ProfilePage from './profile/ProfilePage';
import JobCreatePage from './jobs/JobCreatePage';
import JobListPage from './jobs/JobListPage';
import MatchedJobsPage from './match/MatchedJobsPage';
import JobDetailPage from './jobs/JobDetailPage';
import JobEditPage from './jobs/JobEditPage';
import RecruiterJobsPage from './jobs/RecruiterJobsPage';
import CandidatesPage    from './match/CandidatesPage';

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="app-nav">
      <div className="app-nav-left">
        <Link to="/" className="app-logo">
          SkillBridge
        </Link>
        <Link to="/jobs" className="app-nav-link">
          Jobs
        </Link>
        {user?.role === 'seeker' && (
          <>
            <Link to="/profile" className="app-nav-link">
              Profile
            </Link>
            <Link to="/matches" className="app-nav-link">
              Matches
            </Link>
          </>
        )}
        {user?.role === 'recruiter' && (
          <>
            <Link to="/recruiter/jobs" className="app-nav-link">
              My Jobs
            </Link>
            <Link to="/recruiter/jobs/:jobId/candidates" className="app-nav-link">
              Post Job
            </Link>
          </>
        )}
      </div>
      <div className="app-nav-right">
        {isAuthenticated && user ? (
          <>
            <span className="app-user-chip">
              {user.name} <span className="app-role-badge">{user.role}</span>
            </span>
            <button className="btn btn-ghost" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="app-nav-link">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

function Home() {
  const { user } = useAuth();
  return (
    <div className="card">
      <h1>AI Job Matcher</h1>
      <p className="muted">
        Skill‑based matching and AI‑assisted resumes for fresh IT graduates.
      </p>

      {!user && (
        <p style={{ marginTop: '1rem' }}>
          <Link to="/login" className="btn btn-primary">
            Get started
          </Link>
        </p>
      )}

      {user && user.role === 'seeker' && (
        <div className="card-grid">
          <div className="card subtle">
            <h2>Your profile</h2>
            <p>Keep your skills and projects updated to improve matching.</p>
            <Link to="/profile" className="btn btn-secondary">
              Edit profile
            </Link>
          </div>
          <div className="card subtle">
            <h2>Matched jobs</h2>
            <p>See jobs ranked by how well your skills fit the requirements.</p>
            <Link to="/matches" className="btn btn-secondary">
              View matches
            </Link>
          </div>
        </div>
      )}

      {user && user.role === 'recruiter' && (
        <div className="card-grid">
          <div className="card subtle">
            <h2>Post a job</h2>
            <p>Describe your role in natural language, then refine skills.</p>
            <Link to="/jobs/new" className="btn btn-secondary">
              Post job
            </Link>
          </div>
          <div className="card subtle">
            <h2>All jobs</h2>
            <p>Manage openings and see how candidates will be matched.</p>
            <Link to="/jobs" className="btn btn-secondary">
              View jobs
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/jobs" element={<JobListPage />} />
      <Route path="/jobs/new" element={<JobCreatePage />} />
      <Route path="/jobs/:id" element={<JobDetailPage />} />
      <Route path="/jobs/:id/edit" element={<JobEditPage />} />
      <Route path="/recruiter/jobs" element={<RecruiterJobsPage />} />
      <Route path="/recruiter/jobs/:jobId/candidates" element={<CandidatesPage />} />
      <Route path="/matches" element={<MatchedJobsPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="app-root">
        <Navbar />
        <main className="app-main">
          <AppRoutes />
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
