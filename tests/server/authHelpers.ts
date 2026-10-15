import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { createAuth, readAuthConfig } from '../../server/auth/index.js';
import { createAuthStore } from '../../server/auth/authStore.js';

// Cheap scrypt parameters keep tests fast; production uses DEFAULT_HASH_PARAMS.
export const TEST_HASH_PARAMS = { N: 2 ** 10, r: 8, p: 1 };
export const TEST_EMAIL = 'admin@clinic.test';
export const TEST_PASSWORD = 'Correct-horse7';

type Logger = { info: (...args: unknown[]) => void; warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
const silentLogger: Logger = { info: () => {}, warn: () => {}, error: () => {} };

export async function makeAuth({
  authDir,
  env = {},
  now,
  logger = silentLogger,
}: {
  authDir?: string;
  env?: Record<string, string>;
  now?: () => number;
  logger?: Logger;
} = {}) {
  const dir = authDir ?? (await fs.mkdtemp(path.join(os.tmpdir(), 'medical-auth-')));
  const store = createAuthStore({ authDir: dir, hashParams: TEST_HASH_PARAMS, logger, ...(now ? { now } : {}) });
  const config = readAuthConfig({ NODE_ENV: 'test', ...env }, { isPassenger: false });
  const auth = createAuth({ store, config, logger, ...(now ? { now } : {}) });
  return { dir, store, config, auth };
}

/** Extracts "name=value" from a Set-Cookie header so it can be replayed in a Cookie header. */
export function sessionCookieFrom(response: Response) {
  const header = response.headers.get('set-cookie');
  return header ? header.split(';')[0] : '';
}

export async function login(baseUrl: string, email = TEST_EMAIL, password = TEST_PASSWORD) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = response.ok ? await response.json() : null;
  return { response, cookie: sessionCookieFrom(response), csrfToken: body?.csrfToken as string | undefined, body };
}
