import { test, expect } from '@playwright/test';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { createApp } from '../../server/app.js';
import { createDataStore } from '../../server/dataStore.js';
import { createAuthStore } from '../../server/auth/authStore.js';
import { login, makeAuth, sessionCookieFrom, TEST_EMAIL, TEST_HASH_PARAMS, TEST_PASSWORD } from './authHelpers';

const HOUR = 60 * 60 * 1000;

type Harness = Awaited<ReturnType<typeof startHarness>>;

async function startHarness({
  env = {},
  now,
  authDir,
  createUser = true,
}: { env?: Record<string, string>; now?: () => number; authDir?: string; createUser?: boolean } = {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'medical-data-'));
  const dataStore = createDataStore({
    dataDir,
    patientsFile: path.join(dataDir, 'patients.json'),
    appointmentsFile: path.join(dataDir, 'appointments.json'),
    settingsFile: path.join(dataDir, 'settings.json'),
    googleTokensFile: path.join(dataDir, 'google-tokens.json'),
  });
  await dataStore.initialize();
  const { dir, store, auth, config } = await makeAuth({ env, now, authDir });
  if (createUser && !(await store.findUserByEmail(TEST_EMAIL))) {
    await store.createUser({ email: TEST_EMAIL, password: TEST_PASSWORD });
  }
  const app = createApp({ dataStore, dataDir, auth });
  const server: Server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    url,
    dataDir,
    authDir: dir,
    store,
    config,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
    cleanup: async () => {
      await fs.rm(dataDir, { recursive: true, force: true });
      if (!authDir) await fs.rm(dir, { recursive: true, force: true });
    },
  };
}

async function withHarness(options: Parameters<typeof startHarness>[0], fn: (harness: Harness) => Promise<void>) {
  const harness = await startHarness(options);
  try {
    await fn(harness);
  } finally {
    await harness.close();
    await harness.cleanup();
  }
}

const postJson = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

const fileDigest = async (file: string) => createHash('sha256').update(await fs.readFile(file)).digest('hex');

const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;

test.describe('login', () => {
  test('sidebar preferences are private per user, persisted, validated, and CSRF protected', async () => {
    await withHarness({}, async ({ url, store, authDir }) => {
      const secondEmail = 'second@clinic.test';
      await store.createUser({ email: secondEmail, password: TEST_PASSWORD });
      const first = await login(url);
      const second = await login(url, secondEmail);
      const endpoint = `${url}/api/auth/preferences`;
      const put = (body: unknown, headers: Record<string, string> = {}) => fetch(endpoint, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
      });
      expect((await put({ desktopSidebarCollapsed: true })).status).toBe(401);
      expect((await put({ desktopSidebarCollapsed: true }, { cookie: first.cookie })).status).toBe(403);
      const headers = { cookie: first.cookie, 'X-CSRF-Token': first.csrfToken! };
      expect((await put({ desktopSidebarCollapsed: 'yes' }, headers)).status).toBe(400);
      expect((await put({ desktopSidebarCollapsed: true, userId: second.body.user.id }, headers)).status).toBe(400);
      const saved = await put({ desktopSidebarCollapsed: true }, headers);
      expect(saved.status).toBe(200);
      expect((await saved.json()).user.preferences.desktopSidebarCollapsed).toBe(true);
      const restored = await login(url);
      expect(restored.body.user.preferences.desktopSidebarCollapsed).toBe(true);
      const other = await fetch(`${url}/api/auth/me`, { headers: { cookie: second.cookie } });
      expect((await other.json()).user.preferences.desktopSidebarCollapsed).toBe(false);
      const freshStore = createAuthStore({ authDir, hashParams: TEST_HASH_PARAMS });
      expect((await freshStore.findUserById(first.body.user.id)).preferences.desktopSidebarCollapsed).toBe(true);
      expect((await put({ desktopSidebarCollapsed: false }, headers)).status).toBe(200);
      expect((await login(url)).body.user.preferences.desktopSidebarCollapsed).toBe(false);
    });
  });

  test('succeeds with valid credentials and sets a hardened session cookie', async () => {
    await withHarness({}, async ({ url, config }) => {
      const { response, body } = await login(url, '  Admin@Clinic.TEST ');
      expect(response.status).toBe(200);
      expect(Object.keys(body.user).sort()).toEqual(['accountId', 'email', 'id', 'preferences', 'role']);
      expect(body.user).toMatchObject({ email: TEST_EMAIL, role: 'admin', accountId: 'default' });
      expect(body.user.id).toMatch(/^usr_/);
      expect(typeof body.csrfToken).toBe('string');

      const setCookie = response.headers.get('set-cookie') ?? '';
      expect(setCookie.startsWith(`${config.cookieName}=`)).toBe(true);
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('SameSite=Strict');
      expect(setCookie).toContain('Path=/');
      expect(setCookie).toContain(`Max-Age=${config.persistentCookieMaxAgeMs / 1000}`);
      expect(response.headers.get('cache-control')).toBe('no-store');
    });
  });

  test('uses a Secure __Host- cookie in production', async () => {
    await withHarness({ env: { NODE_ENV: 'production' } }, async ({ url }) => {
      const { response } = await login(url);
      const setCookie = response.headers.get('set-cookie') ?? '';
      expect(setCookie.startsWith('__Host-medical_sid=')).toBe(true);
      expect(setCookie).toContain('Secure');
      expect(setCookie).toContain('HttpOnly');
    });
  });

  test('wrong password and unknown e-mail return the same generic 401', async () => {
    await withHarness({}, async ({ url }) => {
      const wrongPassword = await login(url, TEST_EMAIL, 'not the right password');
      const unknownEmail = await login(url, 'nobody@clinic.test', TEST_PASSWORD);
      for (const attempt of [wrongPassword, unknownEmail]) {
        expect(attempt.response.status).toBe(401);
        expect(attempt.cookie).toBe('');
        expect(await attempt.response.json()).toEqual({ error: 'Invalid email or password.' });
      }
    });
  });

  test('rejects missing and malformed input with 400', async () => {
    await withHarness({}, async ({ url }) => {
      const endpoint = `${url}/api/auth/login`;
      const bodies = [
        {},
        { email: TEST_EMAIL },
        { password: TEST_PASSWORD },
        { email: 'not-an-email', password: TEST_PASSWORD },
        { email: ['array'], password: TEST_PASSWORD },
        { email: TEST_EMAIL, password: 12345 },
        { email: TEST_EMAIL, password: 'x'.repeat(1025) },
        [TEST_EMAIL, TEST_PASSWORD],
      ];
      for (const body of bodies) {
        const response = await postJson(endpoint, body);
        expect(response.status, JSON.stringify(body).slice(0, 60)).toBe(400);
      }

      const invalidJson = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"email":' });
      expect(invalidJson.status).toBe(400);
      expect(await invalidJson.json()).toEqual({ error: 'Malformed request.' });

      const tooLarge = await postJson(endpoint, { email: TEST_EMAIL, password: 'x'.repeat(20_000) });
      expect(tooLarge.status).toBe(400);
    });
  });

  test('rate limits repeated failures, even for the correct password', async () => {
    await withHarness({ env: { AUTH_MAX_FAILURES_PER_EMAIL: '3' } }, async ({ url }) => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        expect((await login(url, TEST_EMAIL, 'wrong password!!')).response.status).toBe(401);
      }
      const blocked = await login(url);
      expect(blocked.response.status).toBe(429);
      expect(Number(blocked.response.headers.get('retry-after'))).toBeGreaterThan(0);
    });
  });

  test('rejects cross-origin login attempts', async () => {
    await withHarness({ env: { NODE_ENV: 'production' } }, async ({ url }) => {
      const response = await postJson(`${url}/api/auth/login`, { email: TEST_EMAIL, password: TEST_PASSWORD }, { Origin: 'https://evil.example' });
      expect(response.status).toBe(403);
    });
  });

  test('disabled users cannot log in and lose their sessions', async () => {
    await withHarness({}, async ({ url, store }) => {
      const { cookie } = await login(url);
      await store.setStatus(TEST_EMAIL, 'disabled');
      expect((await fetch(`${url}/api/auth/me`, { headers: { cookie } })).status).toBe(401);
      const attempt = await login(url);
      expect(attempt.response.status).toBe(401);
      expect(await attempt.response.json()).toEqual({ error: 'Invalid email or password.' });
    });
  });
});

test.describe('sessions', () => {
  test('/me returns the user and a CSRF token for a valid session', async () => {
    await withHarness({}, async ({ url }) => {
      const { cookie, csrfToken } = await login(url);
      const me = await fetch(`${url}/api/auth/me`, { headers: { cookie } });
      expect(me.status).toBe(200);
      const body = await me.json();
      expect(body.user.email).toBe(TEST_EMAIL);
      expect(body.csrfToken).toBe(csrfToken);
      expect((await fetch(`${url}/api/auth/me`)).status).toBe(401);
    });
  });

  test('persist across an app restart (new process state, same auth directory)', async () => {
    const first = await startHarness();
    let cookie = '';
    try {
      cookie = (await login(first.url)).cookie;
    } finally {
      await first.close();
    }
    const second = await startHarness({ authDir: first.authDir });
    try {
      const response = await fetch(`${second.url}/api/patients`, { headers: { cookie } });
      expect(response.status).toBe(200);
    } finally {
      await second.close();
      await second.cleanup();
      await first.cleanup();
      await fs.rm(first.authDir, { recursive: true, force: true });
    }
  });

  test('never expire by default and slide the cookie forward while active', async () => {
    let clock = Date.now();
    await withHarness({ now: () => clock }, async ({ url, config }) => {
      expect(config.idleTimeoutMs).toBe(0);
      expect(config.absoluteTimeoutMs).toBe(0);
      const { cookie } = await login(url);
      clock += 90 * 24 * HOUR;
      const response = await fetch(`${url}/api/auth/me`, { headers: { cookie } });
      expect(response.status).toBe(200);
      expect(response.headers.get('set-cookie')).toContain(`Max-Age=${config.persistentCookieMaxAgeMs / 1000}`);
      clock += 365 * 24 * HOUR;
      expect((await fetch(`${url}/api/auth/me`, { headers: { cookie } })).status).toBe(200);
      const me = await fetch(`${url}/api/auth/me`, { headers: { cookie } });
      const { csrfToken } = await me.json();
      const logout = await fetch(`${url}/api/auth/logout`, { method: 'POST', headers: { cookie, 'X-CSRF-Token': csrfToken } });
      expect(logout.status).toBe(204);
      expect((await fetch(`${url}/api/auth/me`, { headers: { cookie } })).status).toBe(401);
    });
  });

  test('expire after the idle timeout', async () => {
    let clock = Date.now();
    await withHarness({ env: { AUTH_SESSION_IDLE_HOURS: '8' }, now: () => clock }, async ({ url, config }) => {
      const { cookie } = await login(url);
      clock += config.idleTimeoutMs - 60_000;
      expect((await fetch(`${url}/api/auth/me`, { headers: { cookie } })).status).toBe(200);
      clock += config.idleTimeoutMs + 1;
      const expired = await fetch(`${url}/api/auth/me`, { headers: { cookie } });
      expect(expired.status).toBe(401);
      expect(expired.headers.get('set-cookie')).toContain('Expires=Thu, 01 Jan 1970');
    });
  });

  test('expire after the absolute lifetime even when active', async () => {
    let clock = Date.now();
    await withHarness({ env: { AUTH_SESSION_MAX_HOURS: '24' }, now: () => clock }, async ({ url, config }) => {
      const { cookie, response } = await login(url);
      expect(response.headers.get('set-cookie')).toContain(`Max-Age=${config.absoluteTimeoutMs / 1000}`);
      const steps = Math.ceil(config.absoluteTimeoutMs / HOUR);
      for (let step = 1; step < steps; step += 1) {
        clock += HOUR;
        expect((await fetch(`${url}/api/auth/me`, { headers: { cookie } })).status).toBe(200);
      }
      clock += HOUR;
      expect((await fetch(`${url}/api/auth/me`, { headers: { cookie } })).status).toBe(401);
    });
  });

  test('a new login replaces the previous session ID', async () => {
    await withHarness({}, async ({ url }) => {
      const first = await login(url);
      const second = await fetch(`${url}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: first.cookie },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
      });
      const secondCookie = sessionCookieFrom(second);
      expect(secondCookie).not.toBe(first.cookie);
      expect((await fetch(`${url}/api/auth/me`, { headers: { cookie: first.cookie } })).status).toBe(401);
      expect((await fetch(`${url}/api/auth/me`, { headers: { cookie: secondCookie } })).status).toBe(200);
    });
  });

  test('logout requires CSRF and invalidates the session server-side', async () => {
    await withHarness({}, async ({ url }) => {
      const { cookie, csrfToken } = await login(url);
      expect((await fetch(`${url}/api/auth/logout`, { method: 'POST', headers: { cookie } })).status).toBe(403);

      const logout = await fetch(`${url}/api/auth/logout`, { method: 'POST', headers: { cookie, 'X-CSRF-Token': csrfToken! } });
      expect(logout.status).toBe(204);
      expect(logout.headers.get('set-cookie')).toContain('Expires=Thu, 01 Jan 1970');

      // Replaying the old cookie must not work.
      expect((await fetch(`${url}/api/auth/me`, { headers: { cookie } })).status).toBe(401);
      expect((await fetch(`${url}/api/patients`, { headers: { cookie } })).status).toBe(401);
    });
  });

  test('changing a password signs out existing sessions', async () => {
    await withHarness({}, async ({ url, store }) => {
      const { cookie } = await login(url);
      await store.setPassword(TEST_EMAIL, 'Brand-new9');
      expect((await fetch(`${url}/api/auth/me`, { headers: { cookie } })).status).toBe(401);
      expect((await login(url)).response.status).toBe(401);
      expect((await login(url, TEST_EMAIL, 'Brand-new9')).response.status).toBe(200);
    });
  });
});

test.describe('API protection', () => {
  const protectedRequests: Array<[string, string, unknown?]> = [
    ['GET', '/api/patients'],
    ['POST', '/api/patients', { firstName: 'Mallory', lastName: 'X', phone: '1' }],
    ['PUT', '/api/patients/any-id', { firstName: 'Mallory' }],
    ['DELETE', '/api/patients/any-id'],
    ['GET', '/api/appointments'],
    ['POST', '/api/appointments', { title: 'x' }],
    ['PUT', '/api/appointments/any-id', { title: 'x' }],
    ['DELETE', '/api/appointments/any-id'],
    ['GET', '/api/settings'],
    ['PUT', '/api/settings', { locale: 'en' }],
    ['GET', '/api/google/status'],
    ['GET', '/api/google/events'],
    ['POST', '/api/google/sync', {}],
    ['GET', '/api/health/details'],
    ['GET', '/api/does-not-exist'],
  ];

  test('every protected endpoint returns 401 without a session and leaves data untouched', async () => {
    await withHarness({}, async ({ url, dataDir }) => {
      const files = ['patients.json', 'appointments.json', 'settings.json'].map((name) => path.join(dataDir, name));
      const before = await Promise.all(files.map(fileDigest));

      const credentialVariants: Array<Record<string, string>> = [
        {},
        { cookie: 'medical_sid=forged-session-id' },
        { cookie: 'medical_sid=forged', 'X-CSRF-Token': 'forged' },
        { Authorization: 'Bearer anything' },
      ];

      for (const [method, endpoint, body] of protectedRequests) {
        for (const headers of credentialVariants) {
          const response = await fetch(`${url}${endpoint}`, {
            method,
            headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
            body: body ? JSON.stringify(body) : undefined,
          });
          expect(response.status, `${method} ${endpoint} ${JSON.stringify(headers)}`).toBe(401);
          const payload = await response.json();
          expect(payload).toEqual({ error: 'Authentication required.' });
        }
      }

      expect(await Promise.all(files.map(fileDigest))).toEqual(before);
    });
  });

  test('authenticated writes require the CSRF token and an allowed origin', async () => {
    await withHarness({ env: { NODE_ENV: 'production', AUTH_COOKIE_SECURE: 'false' } }, async ({ url, dataDir }) => {
      const { cookie, csrfToken } = await login(url);
      const patient = { firstName: 'Ana', lastName: 'Test', phone: '070000000' };
      const patientsFile = path.join(dataDir, 'patients.json');
      const before = await fileDigest(patientsFile);

      expect((await postJson(`${url}/api/patients`, patient, { cookie })).status).toBe(403);
      expect((await postJson(`${url}/api/patients`, patient, { cookie, 'X-CSRF-Token': 'wrong' })).status).toBe(403);
      expect((await postJson(`${url}/api/patients`, patient, { cookie, 'X-CSRF-Token': csrfToken!, Origin: 'https://evil.example' })).status).toBe(403);
      expect(await fileDigest(patientsFile)).toBe(before);

      const created = await postJson(`${url}/api/patients`, patient, { cookie, 'X-CSRF-Token': csrfToken! });
      expect(created.status).toBe(201);

      const list = await fetch(`${url}/api/patients`, { headers: { cookie } });
      expect(list.status).toBe(200);
      expect((await list.json()).length).toBe(1);
    });
  });

  test('authenticated requests keep the existing API response formats', async () => {
    await withHarness({}, async ({ url }) => {
      const { cookie, csrfToken } = await login(url);
      const headers = { cookie, 'X-CSRF-Token': csrfToken! };
      const settings = await fetch(`${url}/api/settings`, { headers });
      expect(settings.status).toBe(200);
      expect(await settings.json()).toHaveProperty('workingDays');

      const created = await (await postJson(`${url}/api/patients`, { firstName: 'A', lastName: 'B', phone: '1' }, headers)).json();
      const removed = await fetch(`${url}/api/patients/${created.id}`, { method: 'DELETE', headers });
      expect(await removed.json()).toEqual({ success: true });
    });
  });
});

test.describe('health endpoint', () => {
  test('is public, minimal and does not read patient data', async () => {
    await withHarness({}, async ({ url, dataDir }) => {
      await fs.writeFile(path.join(dataDir, 'patients.json'), 'not json');
      const response = await fetch(`${url}/api/health`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    });
  });

  test('details require authentication', async () => {
    await withHarness({}, async ({ url, dataDir }) => {
      expect((await fetch(`${url}/api/health/details`)).status).toBe(401);
      const { cookie } = await login(url);
      const details = await fetch(`${url}/api/health/details`, { headers: { cookie } });
      expect(await details.json()).toEqual({ ok: true, dataDir, patientsCount: 0, appointmentsCount: 0 });
    });
  });
});

test.describe('auth storage', () => {
  test('stores only hashes with private file permissions', async () => {
    await withHarness({}, async ({ url, store, authDir }) => {
      const { cookie } = await login(url);
      const sessionId = cookie.split('=')[1];
      const usersRaw = await fs.readFile(store.usersFile, 'utf8');
      const sessionsRaw = await fs.readFile(store.sessionsFile, 'utf8');

      expect(usersRaw).not.toContain(TEST_PASSWORD);
      expect(JSON.parse(usersRaw).users[0].passwordHash).toMatch(/^scrypt\$N=\d+,r=\d+,p=\d+\$/);
      expect(sessionsRaw).not.toContain(sessionId);

      if (process.platform !== 'win32') {
        expect((await fs.stat(store.usersFile)).mode & 0o777).toBe(0o600);
        expect((await fs.stat(store.sessionsFile)).mode & 0o777).toBe(0o600);
        expect((await fs.stat(authDir)).mode & 0o077).toBe(0);
      }
    });
  });

  test('rejects duplicate e-mails case-insensitively', async () => {
    const { store, dir } = await makeAuth();
    try {
      await store.createUser({ email: TEST_EMAIL, password: TEST_PASSWORD });
      await expect(store.createUser({ email: 'ADMIN@clinic.test ', password: TEST_PASSWORD })).rejects.toMatchObject({ code: 'EUSER_EXISTS' });
      await expect(store.createUser({ email: 'bad', password: TEST_PASSWORD })).rejects.toMatchObject({ code: 'EINVALID_EMAIL' });
      for (const weak of ['Ab1!', 'abcdef1!', 'Abcdefg!', 'Abcdefg1', 'ABCDEFG 1']) {
        await expect(store.createUser({ email: 'b@clinic.test', password: weak })).rejects.toMatchObject({ code: 'EINVALID_PASSWORD' });
      }
      await expect(store.createUser({ email: 'b@clinic.test', password: 'Abcdef1!' })).resolves.toBeTruthy();
      expect((await store.listUsers()).length).toBe(2);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test('concurrent user creation neither loses writes nor creates duplicates', async () => {
    const { dir } = await makeAuth();
    // Two store instances on one directory behave like two Passenger processes.
    const storeA = createAuthStore({ authDir: dir, hashParams: TEST_HASH_PARAMS });
    const storeB = createAuthStore({ authDir: dir, hashParams: TEST_HASH_PARAMS });
    try {
      await Promise.all(Array.from({ length: 8 }, (_, index) =>
        (index % 2 ? storeA : storeB).createUser({ email: `user${index}@clinic.test`, password: TEST_PASSWORD })));
      expect((await storeA.listUsers()).length).toBe(8);

      const results = await Promise.allSettled(Array.from({ length: 6 }, (_, index) =>
        (index % 2 ? storeA : storeB).createUser({ email: 'same@clinic.test', password: TEST_PASSWORD })));
      expect(results.filter((result) => result.status === 'fulfilled').length).toBe(1);
      expect((await storeA.listUsers()).filter((user) => user.email === 'same@clinic.test').length).toBe(1);

      const leftovers = (await fs.readdir(dir)).filter((name) => name.endsWith('.tmp') || name.endsWith('.lock'));
      expect(leftovers).toEqual([]);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test('a corrupt users file fails closed and is never overwritten', async () => {
    await withHarness({ createUser: false }, async ({ url, store }) => {
      await fs.writeFile(store.usersFile, '{"users": [ broken', { mode: 0o600 });
      const before = await fileDigest(store.usersFile);

      const attempt = await login(url);
      expect(attempt.response.status).toBe(500);
      const body = await attempt.response.json();
      expect(body).toEqual({ error: 'Internal server error.' });

      await expect(store.createUser({ email: 'new@clinic.test', password: TEST_PASSWORD })).rejects.toMatchObject({ code: 'EAUTHCORRUPT' });
      expect(await fileDigest(store.usersFile)).toBe(before);
      expect((await fetch(`${url}/api/patients`)).status).toBe(401);
    });
  });

  test('a missing users file means nobody can log in and is not created', async () => {
    await withHarness({ createUser: false }, async ({ url, store }) => {
      expect((await login(url)).response.status).toBe(401);
      await expect(fs.access(store.usersFile)).rejects.toMatchObject({ code: 'ENOENT' });
    });
  });

  test('an unreadable users file fails closed', async () => {
    test.skip(isRoot || process.platform === 'win32', 'File permissions are not enforced for root/Windows.');
    await withHarness({}, async ({ url, store }) => {
      await fs.chmod(store.usersFile, 0o000);
      try {
        expect((await login(url)).response.status).toBe(500);
      } finally {
        await fs.chmod(store.usersFile, 0o600);
      }
    });
  });

  test('a corrupt sessions file is quarantined and users can log in again', async () => {
    await withHarness({}, async ({ url, store, authDir }) => {
      await fs.writeFile(store.sessionsFile, 'garbage', { mode: 0o600 });
      expect((await fetch(`${url}/api/auth/me`, { headers: { cookie: 'medical_sid=abc' } })).status).toBe(401);
      expect((await login(url)).response.status).toBe(200);
      const files = await fs.readdir(authDir);
      expect(files.some((name) => name.startsWith('sessions.json.corrupt-'))).toBe(true);
    });
  });

  test('createApp refuses to start without authentication', () => {
    expect(() => createApp({ dataStore: {}, dataDir: '/tmp' } as never)).toThrow(/auth/);
  });
});
