import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [gamification, setGamification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('rp_token');
    const storedUser = localStorage.getItem('rp_user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        // Refresh profile in background
        authAPI.me().then(res => {
          setUser(res.data.data.user);
          setGamification(res.data.data.gamification);
          localStorage.setItem('rp_user', JSON.stringify(res.data.data.user));
        }).catch(() => {
          // Token may be expired - clear
          logout();
        });
      } catch {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token, user: userData, gamification: gam } = res.data.data;
    localStorage.setItem('rp_token', token);
    localStorage.setItem('rp_user', JSON.stringify(userData));
    setUser(userData);
    setGamification(gam);
    return res.data;
  };

  const register = async (email, password, full_name) => {
    const res = await authAPI.register({ email, password, full_name });
    const { token, user: userData } = res.data.data;
    localStorage.setItem('rp_token', token);
    localStorage.setItem('rp_user', JSON.stringify(userData));
    setUser(userData);
    setGamification({ total_xp: 0, weekly_xp: 0, current_level: 1, current_streak: 0, league_tier: 'Bronze', trees_grown: 0 });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('rp_token');
    localStorage.removeItem('rp_user');
    setUser(null);
    setGamification(null);
  };

  const updateGamification = (updatesOrFn) => {
    if (typeof updatesOrFn === 'function') {
      setGamification(prev => {
        const result = updatesOrFn(prev);
        return prev ? { ...prev, ...result } : result;
      });
    } else {
      setGamification(prev => prev ? { ...prev, ...updatesOrFn } : updatesOrFn);
    }
  };

  return (
    <AuthContext.Provider value={{ user, gamification, loading, login, register, logout, updateGamification }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
