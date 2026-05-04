// AuthContext.jsx — hardened auth layer
// Fixes jwt malformed by:
// 1. Validating token shape before storing (must be 3-part JWT)
// 2. Auto-logout on any 401 via axios interceptor
// 3. Clearing stale/malformed tokens on startup
import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

// ── Validate that a string is a structurally valid JWT (3 dot-separated base64 parts)
function isValidJWT(str) {
  if (!str || typeof str !== 'string') return false;
  const parts = str.split('.');
  return parts.length === 3 && parts.every(p => p.length > 0);
}

// ── Read token from localStorage, discard if malformed
function getStoredToken() {
  const t = localStorage.getItem('token');
  if (!isValidJWT(t)) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  }
  return t;
}

function getStoredUser() {
  try {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => getStoredToken());
  const [user,  setUser]    = useState(() => getStoredUser());
  const [loading, setLoading] = useState(false);

  const saveAuth = (newToken, newUser) => {
    if (!isValidJWT(newToken)) {
      console.error('[AuthContext] saveAuth called with invalid token — ignoring');
      return;
    }
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  // ── Attach / detach Authorization header whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // ── Global 401 interceptor: auto-logout if backend rejects the token
  useEffect(() => {
    const id = axios.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401) {
          console.warn('[AuthContext] 401 received — clearing auth state');
          logout();
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{
      token, user, saveAuth, logout, loading, isAuthenticated, setLoading, API_BASE
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
