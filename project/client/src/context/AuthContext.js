import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [loading, setLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => { setToken(null); localStorage.removeItem('accessToken'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const { accessToken, user: userData } = res.data;
    localStorage.setItem('accessToken', accessToken);
    setToken(accessToken);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('accessToken');
    setToken(null);
    setUser(null);
  }, []);

  const isAdmin   = user?.role === 'Admin';
  const isDoctor  = user?.role === 'Doctor';
  const isPatient = user?.role === 'Patient';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin, isDoctor, isPatient }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
