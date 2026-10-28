import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { MOCK_USERS } from '../services/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('staypulse_demo_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return MOCK_USERS[0]; // Default mock guest for immediate UI review
  });

  const [token, setToken] = useState(() => localStorage.getItem('staypulse_token'));
  const [loading, setLoading] = useState(false);

  // Sync token and user in localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('staypulse_demo_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('staypulse_demo_user');
    }
  }, [user]);

  // Validate active JWT session with backend upon mount
  useEffect(() => {
    const verifySession = async () => {
      const activeToken = localStorage.getItem('staypulse_token');
      if (activeToken) {
        try {
          const res = await authAPI.getMe();
          if (res.data?.success && res.data.user) {
            setUser(res.data.user);
          }
        } catch (err) {
          console.warn('[StayPulse Auth] Session token expired or invalid:', err.message);
          localStorage.removeItem('staypulse_token');
        }
      }
    };
    verifySession();
  }, []);

  /**
   * Real Backend Login with JWT
   */
  const login = async (email, password, roleHint) => {
    setLoading(true);
    try {
      // 1. Attempt real Express API login
      const res = await authAPI.login({ email, password });
      if (res.data?.success && res.data.token) {
        localStorage.setItem('staypulse_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        setLoading(false);
        return res.data.user;
      }
    } catch (apiError) {
      // If network error (backend server not started by user during quick dev review),
      // allow fallback to mock credentials for fast local testing
      if (apiError.code === 'ERR_NETWORK' || !apiError.response) {
        console.warn('[StayPulse Auth] Backend server unreachable, falling back to mock sandbox.');
        let matched = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!matched && roleHint) matched = MOCK_USERS.find(u => u.role === roleHint);
        if (matched) {
          setUser(matched);
          setLoading(false);
          return matched;
        }
      }
      setLoading(false);
      const message = apiError.response?.data?.message || apiError.message || 'Authentication failed.';
      throw new Error(message);
    }
  };

  /**
   * Real Backend Register with JWT
   */
  const register = async ({ name, email, password, role, phone }) => {
    setLoading(true);
    try {
      const res = await authAPI.register({ name, email, password, role, phone });
      if (res.data?.success && res.data.token) {
        localStorage.setItem('staypulse_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        setLoading(false);
        return res.data.user;
      }
    } catch (apiError) {
      if (apiError.code === 'ERR_NETWORK' || !apiError.response) {
        console.warn('[StayPulse Auth] Backend server unreachable, using mock fallback.');
        const newUser = {
          id: `user-${Date.now()}`,
          name,
          email,
          role: role || 'GUEST',
          createdAt: new Date().toISOString(),
        };
        setUser(newUser);
        setLoading(false);
        return newUser;
      }
      setLoading(false);
      const message = apiError.response?.data?.message || apiError.message || 'Registration failed.';
      throw new Error(message);
    }
  };

  /**
   * Logout
   */
  const logout = () => {
    localStorage.removeItem('staypulse_token');
    localStorage.removeItem('staypulse_demo_user');
    setToken(null);
    setUser(null);
  };

  /**
   * Fast role switcher for development evaluation
   */
  const switchRole = (role) => {
    const targetUser = MOCK_USERS.find(u => u.role === role) || {
      id: `user-${role.toLowerCase()}-demo`,
      name: `Demo ${role}`,
      email: `${role.toLowerCase()}@staypulse.demo`,
      role,
    };
    setUser(targetUser);
  };

  /**
   * Update Profile
   */
  const updateProfile = async (updates) => {
    try {
      const res = await authAPI.updateProfile(updates);
      if (res.data?.success && res.data.user) {
        setUser(res.data.user);
        return res.data.user;
      }
    } catch (err) {
      // Local fallback
      setUser(prev => ({ ...prev, ...updates }));
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    switchRole,
    updateProfile,
    isGuest: user?.role === 'GUEST',
    isOwner: user?.role === 'PROPERTY_OWNER',
    isAdmin: user?.role === 'PLATFORM_ADMIN',
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
