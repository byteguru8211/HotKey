import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => getToken());
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  useEffect(() => {
    let active = true;
    if (!token) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    api.auth
      .me()
      .then((data) => {
        if (active) setUser(data);
      })
      .catch(() => {
        if (active) {
          setToken(null);
          setTokenState(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setTokenState(null);
      setUser(null);
    };
    window.addEventListener('hero:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('hero:unauthorized', handleUnauthorized);
  }, []);

  const applyAuth = useCallback((data) => {
    setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(
    async (email, password) => applyAuth(await api.auth.login({ email, password })),
    [applyAuth],
  );

  const register = useCallback(
    async (payload) => applyAuth(await api.auth.register(payload)),
    [applyAuth],
  );

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const data = await api.auth.me();
    setUser(data);
    return data;
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((previous) => (previous ? { ...previous, ...patch } : previous));
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refresh,
      updateUser,
    }),
    [user, token, loading, login, register, logout, refresh, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth должен использоваться внутри AuthProvider');
  return context;
}
