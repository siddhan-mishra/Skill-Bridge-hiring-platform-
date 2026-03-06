import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import LoginPage from './auth/LoginPage';
import RegisterPage from './auth/RegisterPage';
import ProfilePage from './profile/ProfilePage';
import JobCreatePage from './jobs/JobCreatePage';
import JobListPage from './jobs/JobListPage';
import MatchedJobsPage from './match/MatchedJobsPage';








function Home() {
  const { user } = useAuth();
  return (
    <div style={{ padding: '2rem', color: 'white' }}>
      <h1>🚀 AI Job Matcher</h1>
      {user ? (
        <>
          <p>Logged in as {user.name} ({user.role})</p>
          {user.role === 'seeker' && (
            <>
              <p><Link to="/profile">Go to your profile</Link></p>
              <p><Link to="/matches">View matched jobs</Link></p>
            </>
          )}
          {user.role === 'recruiter' && (
            <>
              <p><Link to="/jobs/new">Post a new job</Link></p>
              <p><Link to="/jobs">View all jobs</Link></p>
            </>
          )}

        </>
      ) : (
        <p>Please <Link to="/login">login</Link> or <Link to="/register">register</Link>.</p>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <div style={{ minHeight: '100vh', background: '#121212', color: '#fff' }}>
        <nav style={{ padding: '1rem', borderBottom: '1px solid #333' }}>
          <Link to="/" style={{ marginRight: '1rem', color: '#fff' }}>Home</Link>
          <Link to="/jobs" style={{ marginRight: '1rem', color: '#fff' }}>Jobs</Link>
          <Link to="/login" style={{ marginRight: '1rem', color: '#fff' }}>Login</Link>
          <Link to="/register" style={{ color: '#fff' }}>Register</Link>
        </nav>


        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/" />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/jobs" element={<JobListPage />} />
          <Route path="/jobs/new" element={<JobCreatePage />} />
          <Route path="/matches" element={<MatchedJobsPage />} />

        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
