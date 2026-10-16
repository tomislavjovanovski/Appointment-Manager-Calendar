import { createHash, timingSafeEqual } from 'crypto';
import express from 'express';
import { AuthInputError, normalizeEmail, toPublicUser } from './authStore.js';
import { PASSWORD_MAX_LENGTH, verifyAgainstDummy, verifyPassword } from './password.js';
import { createRateLimiter } from './rateLimiter.js';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const LOCAL_ORIGIN_HOST = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\]|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/i;
const GENERIC_LOGIN_ERROR = 'Invalid email or password.';

const readNumber = (value, fallback, min, max) => {
  const parsed = Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const parseList = (value) =>
  String(value ?? '')
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, ''))
    .filter(Boolean);

export function readAuthConfig(env = process.env, { isPassenger = typeof globalThis.PhusionPassenger !== 'undefined' } = {}) {
  const production = env.NODE_ENV === 'production' || isPassenger;
  const cookieSecure = env.AUTH_COOKIE_SECURE ? env.AUTH_COOKIE_SECURE === 'true' : production;
  return {
    production,
    cookieSecure,
    // The __Host- prefix makes browsers reject the cookie unless it is Secure, host-only and Path=/.
    cookieName: cookieSecure ? '__Host-medical_sid' : 'medical_sid',
    // 0 disables the timeout: sessions then last until the user logs out.
    idleTimeoutMs: readNumber(env.AUTH_SESSION_IDLE_HOURS, 0, 0, 24 * 7) * HOUR_MS,
    absoluteTimeoutMs: readNumber(env.AUTH_SESSION_MAX_HOURS, 0, 0, 24 * 30) * HOUR_MS,
    // Browsers cap persistent cookies at 400 days; without a timeout the cookie is refreshed on activity.
    persistentCookieMaxAgeMs: 400 * 24 * HOUR_MS,
    touchIntervalMs: 5 * MINUTE_MS,
    allowedOrigins: parseList(env.CORS_ORIGINS),
    allowLocalOrigins: !production,
    loginWindowMs: 15 * MINUTE_MS,
    maxFailuresPerEmail: readNumber(env.AUTH_MAX_FAILURES_PER_EMAIL, 10, 1, 1000),
    maxFailuresPerIp: readNumber(env.AUTH_MAX_FAILURES_PER_IP, 20, 1, 10_000),
  };
}

export const createCsrfToken = (sessionId) =>
  createHash('sha256').update(`csrf\0${sessionId}`).digest('base64url');

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a ?? ''));
  const right = Buffer.from(String(b ?? ''));
  return left.length === right.length && timingSafeEqual(left, right);
};

export function parseCookies(header) {
  const cookies = {};
  if (typeof header !== 'string') return cookies;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    if (!name || name in cookies) continue;
    let value = part.slice(index + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

/**
 * Best-effort client address for rate limiting. Under Passenger the app listens on a Unix socket,
 * so the address comes from the proxy's X-Forwarded-For header (rightmost entry = added by the proxy).
 */
export function getClientIp(req) {
  const socketAddress = req.socket?.remoteAddress;
  if (socketAddress && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(socketAddress)) return socketAddress;
  const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  return forwarded.at(-1) || socketAddress || 'unknown';
}

export function isOriginAllowed(req, config) {
  const origin = req.headers.origin;
  if (!origin) return true; // Same-origin fetches and non-browser clients; the CSRF token still applies.
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (parsed.host === req.headers.host) return true;
  if (config.allowedOrigins.includes(parsed.origin)) return true;
  return config.allowLocalOrigins && LOCAL_ORIGIN_HOST.test(parsed.hostname);
}

const sendError = (res, status, error, extraHeaders = {}) => {
  for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
  res.status(status).json({ error });
};

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

/**
 * Builds the /api/auth router and the middleware that protects every other /api route.
 * Authenticated requests get `req.auth = { userId, email, role, accountId, sessionId }`;
 * business routes should read identity only from there.
 */
export function createAuth({ store, config, logger, now = () => Date.now() }) {
  const emailLimiter = createRateLimiter({ limit: config.maxFailuresPerEmail, windowMs: config.loginWindowMs, now });
  const ipLimiter = createRateLimiter({ limit: config.maxFailuresPerIp, windowMs: config.loginWindowMs, now });

  const cookieOptions = (maxAgeMs) => ({
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'strict',
    path: '/',
    ...(maxAgeMs === undefined ? {} : { maxAge: maxAgeMs }),
  });

  const clearCookie = (res) => res.clearCookie(config.cookieName, cookieOptions());

  const sessionCookieMaxAgeMs = config.absoluteTimeoutMs > 0 ? config.absoluteTimeoutMs : config.persistentCookieMaxAgeMs;

  const setSessionCookie = (res, sessionId) =>
    res.cookie(config.cookieName, sessionId, cookieOptions(sessionCookieMaxAgeMs));

  /** Resolves the session cookie to an active user, or null. Expired sessions are removed. */
  const resolveSession = async (req) => {
    const sessionId = parseCookies(req.headers.cookie)[config.cookieName];
    if (!sessionId || sessionId.length > 200) return null;
    const session = await store.getSession(sessionId);
    if (!session) return null;

    const currentTime = now();
    const idleExpired = config.idleTimeoutMs > 0 && currentTime - session.lastSeenAt >= config.idleTimeoutMs;
    const absoluteExpired = session.expiresAt != null && session.expiresAt <= currentTime;
    if (idleExpired || absoluteExpired) {
      await store.deleteSession(sessionId);
      return null;
    }

    const user = await store.findUserById(session.userId);
    if (!user || user.status !== 'active') {
      await store.deleteSession(sessionId);
      return null;
    }

    const touched = currentTime - session.lastSeenAt >= config.touchIntervalMs;
    if (touched) await store.touchSession(sessionId);

    return { sessionId, user, touched };
  };

  // Slides the browser cookie forward so sessions without an absolute lifetime never expire client-side.
  const refreshSessionCookie = (res, resolved) => {
    if (resolved.touched && !(config.absoluteTimeoutMs > 0)) setSessionCookie(res, resolved.sessionId);
  };

  const requireSession = asyncRoute(async (req, res, next) => {
    const resolved = await resolveSession(req);
    if (!resolved) {
      if (req.headers.cookie?.includes(`${config.cookieName}=`)) clearCookie(res);
      sendError(res, 401, 'Authentication required.');
      return;
    }
    refreshSessionCookie(res, resolved);
    req.auth = { ...toPublicUser(resolved.user), userId: resolved.user.id, sessionId: resolved.sessionId };
    next();
  });

  const requireCsrf = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }
    if (!isOriginAllowed(req, config)) {
      sendError(res, 403, 'Request origin is not allowed.');
      return;
    }
    const sessionId = req.auth?.sessionId;
    if (!sessionId || !safeEqual(req.get('x-csrf-token'), createCsrfToken(sessionId))) {
      sendError(res, 403, 'Invalid or missing CSRF token.');
      return;
    }
    next();
  };

  const router = express.Router();
  router.use(express.json({ limit: '10kb' }));
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.post('/login', asyncRoute(async (req, res) => {
    if (!isOriginAllowed(req, config)) {
      sendError(res, 403, 'Request origin is not allowed.');
      return;
    }

    const body = req.body;
    const rawEmail = body && typeof body === 'object' ? body.email : undefined;
    const password = body && typeof body === 'object' ? body.password : undefined;
    if (typeof rawEmail !== 'string' || typeof password !== 'string' || !password || password.length > PASSWORD_MAX_LENGTH) {
      sendError(res, 400, 'Email and password are required.');
      return;
    }
    const email = normalizeEmail(rawEmail);
    if (!email) {
      sendError(res, 400, 'Enter a valid email address.');
      return;
    }

    const ip = getClientIp(req);
    const retryAfter = Math.max(emailLimiter.retryAfter(email), ipLimiter.retryAfter(ip));
    if (retryAfter > 0) {
      logger?.warn?.('auth.login.rate_limited', { retryAfter });
      sendError(res, 429, 'Too many login attempts. Please try again later.', { 'Retry-After': String(retryAfter) });
      return;
    }

    const user = await store.findUserByEmail(email);
    const valid = user && user.status === 'active'
      ? await verifyPassword(password, user.passwordHash)
      : await verifyAgainstDummy(password, store.hashParams);

    if (!valid) {
      emailLimiter.fail(email);
      ipLimiter.fail(ip);
      logger?.warn?.('auth.login.failed', {});
      sendError(res, 401, GENERIC_LOGIN_ERROR);
      return;
    }

    emailLimiter.reset(email);

    // Session fixation protection: always issue a fresh session ID and drop any previous one.
    const previousSessionId = parseCookies(req.headers.cookie)[config.cookieName];
    if (previousSessionId && previousSessionId.length <= 200) await store.deleteSession(previousSessionId);
    const sessionId = await store.createSession({ userId: user.id, absoluteTtlMs: config.absoluteTimeoutMs });

    setSessionCookie(res, sessionId);
    logger?.info?.('auth.login.succeeded', { userId: user.id });
    res.json({ user: toPublicUser(user), csrfToken: createCsrfToken(sessionId) });
  }));

  router.get('/me', asyncRoute(async (req, res) => {
    const resolved = await resolveSession(req);
    if (!resolved) {
      if (req.headers.cookie?.includes(`${config.cookieName}=`)) clearCookie(res);
      sendError(res, 401, 'Authentication required.');
      return;
    }
    refreshSessionCookie(res, resolved);
    res.json({ user: toPublicUser(resolved.user), csrfToken: createCsrfToken(resolved.sessionId) });
  }));

  router.put('/preferences', requireSession, requireCsrf, asyncRoute(async (req, res) => {
    const user = await store.updatePreferences(req.auth.userId, req.body);
    res.json({ user });
  }));

  router.post('/logout', requireSession, requireCsrf, asyncRoute(async (req, res) => {
    await store.deleteSession(req.auth.sessionId);
    clearCookie(res);
    logger?.info?.('auth.logout', { userId: req.auth.userId });
    res.status(204).end();
  }));

  router.use((error, _req, res, next) => {
    if (error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large') {
      sendError(res, 400, 'Malformed request.');
      return;
    }
    if (error instanceof AuthInputError) {
      sendError(res, 400, error.message);
      return;
    }
    next(error);
  });

  return { router, requireSession, requireCsrf, config };
}
