import { buildApiUrl } from '@/lib/storage';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  /** Owning clinic/account. Always "default" until multi-clinic support exists. */
  accountId: string;
  preferences?: { desktopSidebarCollapsed: boolean };
}

export const AUTH_EXPIRED_EVENT = 'auth:expired';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
let csrfToken: string | null = null;

export const setCsrfToken = (token: string | null) => {
  csrfToken = token;
};

const isAuthEndpoint = (url: string) => url.includes('/api/auth/');

/**
 * fetch() for the backend API: sends the session cookie, adds the CSRF header to writes,
 * and announces an expired session so the app can return to the login page.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (!SAFE_METHODS.has(method) && csrfToken) headers.set('X-CSRF-Token', csrfToken);

  const response = await fetch(input, { ...init, headers, credentials: 'include' });
  if (response.status === 401 && !isAuthEndpoint(input) && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
  return response;
}

export class LoginError extends Error {
  status: number;
  retryAfterSeconds?: number;

  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'LoginError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type SessionPayload = { user: AuthUser; csrfToken: string };

export async function fetchCurrentUser(signal?: AbortSignal): Promise<AuthUser | null> {
  const requestSignal = signal ?? AbortSignal.timeout(10_000);
  const response = await authFetch(buildApiUrl('/auth/me'), { signal: requestSignal });
  if (response.status === 401) {
    setCsrfToken(null);
    return null;
  }
  if (!response.ok) throw new Error(`Session check failed (${response.status}).`);
  const data = (await response.json()) as SessionPayload;
  setCsrfToken(data.csrfToken);
  return data.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  let response: Response;
  try {
    response = await authFetch(buildApiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new LoginError(0, 'network');
  }

  if (!response.ok) {
    const retryAfter = Number(response.headers.get('retry-after')) || undefined;
    throw new LoginError(response.status, 'login-failed', retryAfter);
  }
  const data = (await response.json()) as SessionPayload;
  setCsrfToken(data.csrfToken);
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await authFetch(buildApiUrl('/auth/logout'), { method: 'POST' });
  } finally {
    setCsrfToken(null);
  }

}

export async function saveSidebarPreference(desktopSidebarCollapsed: boolean): Promise<AuthUser> {
    const response = await authFetch(buildApiUrl('/auth/preferences'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desktopSidebarCollapsed }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Unable to save sidebar preference (${response.status}).`);
    const data: { user: AuthUser } = await response.json();
    return data.user;
}
