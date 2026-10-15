import { createHash, randomBytes, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { AuthStorageError, readJsonFile, withFileLock, writeJsonFileAtomic } from './jsonFile.js';
import { hashPassword, validateNewPassword } from './password.js';

export const DEFAULT_ACCOUNT_ID = 'default';
const USER_STATUSES = new Set(['active', 'disabled']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthInputError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AuthInputError';
    this.code = code;
    this.statusCode = 400;
  }
}

export function normalizeEmail(email) {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().normalize('NFKC').toLowerCase();
  if (!normalized || normalized.length > 254 || !EMAIL_PATTERN.test(normalized)) return null;
  return normalized;
}

export const hashSessionId = (sessionId) => createHash('sha256').update(sessionId).digest('hex');

const emptyUsers = () => ({ version: 1, users: [] });
const emptySessions = () => ({ version: 1, sessions: {} });

const assertUsersShape = (data) => {
  if (!data || typeof data !== 'object' || !Array.isArray(data.users)) {
    throw new AuthStorageError('users.json has an unexpected structure.', { code: 'EAUTHCORRUPT' });
  }
  return data;
};

const isSessionsShape = (data) =>
  data && typeof data === 'object' && data.sessions && typeof data.sessions === 'object' && !Array.isArray(data.sessions);

/** Public view of a user: never includes the password hash. */
export const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  accountId: user.accountId ?? DEFAULT_ACCOUNT_ID,
  preferences: { desktopSidebarCollapsed: user.preferences?.desktopSidebarCollapsed === true },
});

/**
 * JSON-file storage for users and sessions. Kept separate from patient/appointment data.
 * Sessions are keyed by SHA-256(sessionId), so a leaked sessions file cannot be replayed as cookies.
 */
export function createAuthStore({ authDir, hashParams, logger, now = () => Date.now() }) {
  const usersFile = path.join(authDir, 'users.json');
  const sessionsFile = path.join(authDir, 'sessions.json');

  const readUsers = async () => assertUsersShape(await readJsonFile(usersFile, emptyUsers()));

  const readSessions = async () => {
    try {
      const data = await readJsonFile(sessionsFile, emptySessions());
      if (isSessionsShape(data)) return data;
      throw new AuthStorageError('sessions.json has an unexpected structure.', { code: 'EAUTHCORRUPT' });
    } catch (error) {
      if (error?.code !== 'EAUTHCORRUPT') throw error;
      // A corrupt session file only means everyone has to log in again. Keep it for inspection
      // instead of deleting it; users.json is never handled this way.
      const quarantine = `${sessionsFile}.corrupt-${now()}`;
      await fs.rename(sessionsFile, quarantine).catch(() => {});
      logger?.warn?.('auth.sessions.quarantined', { file: path.basename(quarantine) });
      return emptySessions();
    }
  };

  const findUserByEmail = async (email) => {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    const { users } = await readUsers();
    return users.find((user) => user.email === normalized) ?? null;
  };

  const findUserById = async (id) => {
    const { users } = await readUsers();
    return users.find((user) => user.id === id) ?? null;
  };

  const createUser = async ({ email, password, role = 'admin', accountId = DEFAULT_ACCOUNT_ID }) => {
    const normalized = normalizeEmail(email);
    if (!normalized) throw new AuthInputError('A valid e-mail address is required.', 'EINVALID_EMAIL');
    const passwordError = validateNewPassword(password);
    if (passwordError) throw new AuthInputError(passwordError, 'EINVALID_PASSWORD');

    // Hash outside the lock: it is the slow part and does not touch the file.
    const passwordHash = await hashPassword(password, hashParams);

    return withFileLock(usersFile, async () => {
      const data = await readUsers();
      if (data.users.some((user) => user.email === normalized)) {
        throw new AuthInputError('A user with this e-mail already exists.', 'EUSER_EXISTS');
      }
      const timestamp = new Date(now()).toISOString();
      const user = {
        id: `usr_${randomUUID()}`,
        email: normalized,
        passwordHash,
        role,
        accountId,
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      data.users.push(user);
      await writeJsonFileAtomic(usersFile, data);
      return toPublicUser(user);
    });
  };

  const updateUser = async (email, update) => {
    const normalized = normalizeEmail(email);
    if (!normalized) throw new AuthInputError('A valid e-mail address is required.', 'EINVALID_EMAIL');
    return withFileLock(usersFile, async () => {
      const data = await readUsers();
      const user = data.users.find((candidate) => candidate.email === normalized);
      if (!user) throw new AuthInputError('User not found.', 'EUSER_NOT_FOUND');
      Object.assign(user, update, { updatedAt: new Date(now()).toISOString() });
      await writeJsonFileAtomic(usersFile, data);
      return user;
    });
  };

  const setPassword = async (email, password) => {
    const passwordError = validateNewPassword(password);
    if (passwordError) throw new AuthInputError(passwordError, 'EINVALID_PASSWORD');
    const passwordHash = await hashPassword(password, hashParams);
    const user = await updateUser(email, { passwordHash });
    await deleteSessionsForUser(user.id);
    return toPublicUser(user);
  };

  const setStatus = async (email, status) => {
    if (!USER_STATUSES.has(status)) throw new AuthInputError('Unknown status.', 'EINVALID_STATUS');
    const user = await updateUser(email, { status });
    if (status !== 'active') await deleteSessionsForUser(user.id);
    return toPublicUser(user);
  };

  const listUsers = async () => {
    const { users } = await readUsers();
    return users.map((user) => ({ ...toPublicUser(user), status: user.status, createdAt: user.createdAt, updatedAt: user.updatedAt }));
  };

  const updatePreferences = async (userId, preferences) => {
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences) ||
        Object.keys(preferences).length !== 1 || typeof preferences.desktopSidebarCollapsed !== 'boolean') {
      throw new AuthInputError('desktopSidebarCollapsed must be a boolean.', 'EINVALID_PREFERENCES');
    }
    return withFileLock(usersFile, async () => {
      const data = await readUsers();
      const user = data.users.find((candidate) => candidate.id === userId);
      if (!user) throw new AuthInputError('User not found.', 'EUSER_NOT_FOUND');
      user.preferences = { ...user.preferences, desktopSidebarCollapsed: preferences.desktopSidebarCollapsed };
      user.updatedAt = new Date(now()).toISOString();
      await writeJsonFileAtomic(usersFile, data);
      return toPublicUser(user);
    });
  };

  const mutateSessions = (mutator) =>
    withFileLock(sessionsFile, async () => {
      const data = await readSessions();
      const currentTime = now();
      for (const [key, session] of Object.entries(data.sessions)) {
        if (!session || session.expiresAt <= currentTime) delete data.sessions[key];
      }
      const result = await mutator(data.sessions, currentTime);
      await writeJsonFileAtomic(sessionsFile, data);
      return result;
    });

  const createSession = async ({ userId, absoluteTtlMs }) => {
    const sessionId = randomBytes(32).toString('base64url');
    await mutateSessions((sessions, currentTime) => {
      sessions[hashSessionId(sessionId)] = {
        userId,
        createdAt: currentTime,
        lastSeenAt: currentTime,
        expiresAt: currentTime + absoluteTtlMs,
      };
    });
    return sessionId;
  };

  const getSession = async (sessionId) => {
    if (typeof sessionId !== 'string' || !sessionId) return null;
    const { sessions } = await readSessions();
    return sessions[hashSessionId(sessionId)] ?? null;
  };

  const touchSession = (sessionId) =>
    mutateSessions((sessions, currentTime) => {
      const session = sessions[hashSessionId(sessionId)];
      if (session) session.lastSeenAt = currentTime;
    });

  const deleteSession = (sessionId) =>
    mutateSessions((sessions) => {
      delete sessions[hashSessionId(sessionId)];
    });

  const deleteSessionsForUser = (userId) =>
    mutateSessions((sessions) => {
      for (const [key, session] of Object.entries(sessions)) {
        if (session.userId === userId) delete sessions[key];
      }
    });

  return {
    hashParams,
    usersFile,
    sessionsFile,
    readUsers,
    findUserByEmail,
    findUserById,
    createUser,
    setPassword,
    setStatus,
    listUsers,
    updatePreferences,
    createSession,
    getSession,
    touchSession,
    deleteSession,
    deleteSessionsForUser,
  };
}
