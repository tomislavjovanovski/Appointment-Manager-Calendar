import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AUTH_EXPIRED_EVENT, fetchCurrentUser, login as loginRequest, logout as logoutRequest, saveSidebarPreference, setCsrfToken, type AuthUser } from '@/lib/auth';
import { resetApiCaches } from '@/lib/storage';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** True when the user was signed out because the server session ended. */
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
  saveSidebarCollapsed: (collapsed: boolean) => Promise<void>;
  savingSidebarPreference: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [savingSidebarPreference, setSavingSidebarPreference] = useState(false);
  const preferenceSaveRef = useRef(false);
  const authOperationRef = useRef(0);
  const sessionRequestRef = useRef<AbortController | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  // Never let cached data from one session leak into the next.
  const clearCachedData = useCallback(() => {
    resetApiCaches();
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    const operation = ++authOperationRef.current;
    sessionRequestRef.current?.abort();
    const controller = new AbortController();
    sessionRequestRef.current = controller;
    setStatus('loading');
    fetchCurrentUser(controller.signal)
      .then((currentUser) => {
        if (!active || operation !== authOperationRef.current) return;
        setUser(currentUser);
        setStatus(currentUser ? 'authenticated' : 'unauthenticated');
      })
      .catch(() => {
        if (active && operation === authOperationRef.current && !controller.signal.aborted) setStatus('error');
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  useEffect(() => {
    const onExpired = () => {
      if (statusRef.current !== 'authenticated') return;
      setCsrfToken(null);
      clearCachedData();
      setUser(null);
      setSessionExpired(true);
      setStatus('unauthenticated');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [clearCachedData]);

  const login = useCallback(async (email: string, password: string) => {
    const operation = ++authOperationRef.current;
    sessionRequestRef.current?.abort();
    sessionRequestRef.current = null;
    clearCachedData();
    const loggedIn = await loginRequest(email, password);
    if (operation !== authOperationRef.current) return;
    setUser(loggedIn);
    setSessionExpired(false);
    setStatus('authenticated');
  }, [clearCachedData]);

  const logout = useCallback(async () => {
    ++authOperationRef.current;
    sessionRequestRef.current?.abort();
    sessionRequestRef.current = null;
    try {
      await logoutRequest();
    } catch {
      // The local state is cleared regardless; the server session also expires on its own.
    }
    clearCachedData();
    setUser(null);
    setSessionExpired(false);
    setStatus('unauthenticated');
  }, [clearCachedData]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);
  const saveSidebarCollapsed = useCallback(async (collapsed: boolean) => {
    if (preferenceSaveRef.current) return;
    preferenceSaveRef.current = true;
    setSavingSidebarPreference(true);
    try {
      const updated = await saveSidebarPreference(collapsed);
      setUser((current) => current?.id === updated.id ? updated : current);
    } finally {
      preferenceSaveRef.current = false;
      setSavingSidebarPreference(false);
    }
  }, []);

  const value = useMemo(
    () => ({ status, user, sessionExpired, login, logout, retry, saveSidebarCollapsed, savingSidebarPreference }),
    [status, user, sessionExpired, login, logout, retry, saveSidebarCollapsed, savingSidebarPreference],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
