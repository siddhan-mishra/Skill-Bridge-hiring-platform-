import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import LoginPage from './auth/LoginPage';
import RegisterPage from './auth/RegisterPage';
import ProfilePage from './profile/ProfilePage';
import PublicProfilePage from './profile/PublicProfilePage';
import JobCreatePage from './jobs/JobCreatePage';
import JobListPage from './jobs/JobListPage';
import MatchedJobsPage from './match/MatchedJobsPage';
import JobDetailPage from './jobs/JobDetailPage';
import JobEditPage from './jobs/JobEditPage';
import RecruiterJobsPage from './jobs/RecruiterJobsPage';
import CandidatesPage from './match/CandidatesPage';
import SeekerDashboard from './match/SeekerDashboard';
import RecruiterDashboard from './match/RecruiterDashboard';
import AllApplicationsPage from './match/AllApplicationsPage';
import ApplicationsPage from './match/ApplicationsPage';
import HomePage from './HomePage';

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="app-nav">
      <div className="app-nav-left">
        <Link to="/" className="app-logo" style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800, fontSize: '1.1rem' }}>SkillBridge</Link>
        <Link to="/jobs" className="app-nav-link">Jobs</Link>

        {user?.role === 'seeker' && (
          <>
            <Link to="/dashboard"    className="app-nav-link">Dashboard</Link>
            <Link to="/matches"      className="app-nav-link">Matches</Link>
            <Link to="/applications" className="app-nav-link">Applications</Link>
            <Link to="/profile"      className="app-nav-link">Profile</Link>
          </>
        )}

        {user?.role === 'recruiter' && (
          <>
            <Link to="/recruiter/dashboard"    className="app-nav-link">Dashboard</Link>
            <Link to="/recruiter/jobs"         className="app-nav-link">My Jobs</Link>
            <Link to="/recruiter/applications" className="app-nav-link">Applications</Link>
            <Link to="/jobs/new"               className="app-nav-link">Post Job</Link>
          </>
        )}
      </div>

      <div className="app-nav-right">
        {isAuthenticated && user ? (
          <>
            <span className="app-user-chip">
              {user.name}
              <span className="app-role-badge">{user.role}</span>
            </span>
            <button className="btn btn-ghost" onClick={() => { logout(); navigate('/login'); }}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login"    className="app-nav-link">Login</Link>
            <Link to="/register" className="btn btn-primary">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

function OwnProfileRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return <Navigate to={`/profile/${user.id}`} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"                                    element={<HomePage />} />
      <Route path="/login"                               element={<LoginPage />} />
      <Route path="/register"                            element={<RegisterPage />} />
      <Route path="/profile/edit"                        element={<ProfilePage />} />
      <Route path="/profile/:userId"                     element={<PublicProfilePage />} />
      <Route path="/profile"                             element={<OwnProfileRedirect />} />
      <Route path="/dashboard"                           element={<SeekerDashboard />} />
      <Route path="/applications"                        element={<ApplicationsPage />} />
      <Route path="/recruiter/dashboard"                 element={<RecruiterDashboard />} />
      <Route path="/recruiter/applications"              element={<AllApplicationsPage />} />
      <Route path="/jobs"                                element={<JobListPage />} />
      <Route path="/jobs/new"                            element={<JobCreatePage />} />
      <Route path="/jobs/:id"                            element={<JobDetailPage />} />
      <Route path="/jobs/:id/edit"                       element={<JobEditPage />} />
      <Route path="/recruiter/jobs"                      element={<RecruiterJobsPage />} />
      <Route path="/recruiter/jobs/:jobId/candidates"    element={<CandidatesPage />} />
      <Route path="/matches"                             element={<MatchedJobsPage />} />
      <Route path="*"                                    element={<Navigate to="/" />} />
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
