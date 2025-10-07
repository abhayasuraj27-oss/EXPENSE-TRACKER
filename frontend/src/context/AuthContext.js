import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authAPI } from '../services/api';
import { createContext as createReactContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [user, setUser] = useState(() => {
    const email = localStorage.getItem('auth_email');
    return email ? { email } : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }, [token]);

  const login = async ({ email, password }) => {
    const res = await authAPI.login({ email, password });
    const accessToken = res.data?.access_token;
    if (accessToken) {
      setToken(accessToken);
      localStorage.setItem('auth_email', email);
      setUser({ email });
    }
    return res;
  };

  const signup = async ({ email, password }) => {
    const res = await authAPI.signup({ email, password });
    const accessToken = res.data?.access_token;
    if (accessToken) {
      setToken(accessToken);
      localStorage.setItem('auth_email', email);
      setUser({ email });
    }
    return res;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_email');
    // Clear any session-only selections or cached state
    try {
      localStorage.removeItem('myItemsPeriod');
    } catch {}
  };

  const value = useMemo(() => ({ token, user, isAuthenticated: !!token, login, signup, logout }), [token, user]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


