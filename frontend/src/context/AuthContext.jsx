import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

function decodeToken(accessToken) {
  const payload = JSON.parse(atob(accessToken.split('.')[1]));
  return { email: payload.sub, role: payload.role };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (token) {
      try {
        setUser(decodeToken(token));
      } catch {
        logout();
      }
    }
  }, [token]);

  const login = async (email, password) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);

    const res = await api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const accessToken = res.data.access_token;
    const nextUser = decodeToken(accessToken);
    localStorage.setItem('token', accessToken);
    setToken(accessToken);
    setUser(nextUser);
    return { ...res.data, user: nextUser };
  };

  const signup = async (data) => {
    const res = await api.post('/auth/signup', data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const requestLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutModal(false);
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const value = useMemo(() => ({
    user, token, loading, login, signup, logout,
    isAuthenticated: !!token,
    showLogoutModal, requestLogout, confirmLogout, cancelLogout
  }), [user, token, loading, showLogoutModal]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
