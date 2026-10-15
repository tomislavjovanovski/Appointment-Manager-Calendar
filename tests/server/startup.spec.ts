import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { createApp } from '../../server/app.js';
import { createDataStore } from '../../server/dataStore.js';
import { login, makeAuth, TEST_EMAIL, TEST_PASSWORD } from './authHelpers';
import { initializeDataStore, isRetryableInitError, readStartupOptions, startServer } from '../../server/startup.js';

type LogEntry = { level: string; event: string; fields: Record<string, unknown> };

function memoryLogger() {
  const entries: LogEntry[] = [];
  const at = (level: string) => (event: string, fields: Record<string, unknown> = {}) => {
    entries.push({ level, event, fields });
  };
  return { entries, logger: { info: at('info'), warn: at('warn'), error: at('error') } };
}

const fsError = (code: string) => Object.assign(new Error(`${code}: simulated`), { code });

const noSleep = async () => {};

const options = (overrides: Record<string, number> = {}) => ({
  initAttempts: 3,
  initRetryDelayMs: 25,
  initTimeoutMs: 1_000,
  ...overrides,
});

async function makeDataDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'medical-startup-'));
  return {
    dir,
    store: createDataStore({
      dataDir: dir,
      patientsFile: path.join(dir, 'patients.json'),
      appointmentsFile: path.join(dir, 'appointments.json'),
      settingsFile: path.join(dir, 'settings.json'),
      googleTokensFile: path.join(dir, 'google-tokens.json'),
    }),
  };
}

const closeServer = (server?: Server) =>
  new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));

const baseUrl = (server: Server) => `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

test.describe('backend startup', () => {
  test('starts, initializes the data store, and serves /api/health', async () => {
    const { dir, store } = await makeDataDir();
    const { auth, store: authStore, dir: authDir } = await makeAuth();
    await authStore.createUser({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const { entries, logger } = memoryLogger();
    const server: Server = await startServer({
      app: createApp({ dataStore: store, dataDir: dir, auth }),
      dataStore: store,
      port: 0,
      host: '127.0.0.1',
      options: options(),
      logger,
      isPassenger: false,
    });

    try {
      expect(entries.map((entry) => entry.event)).toEqual([
        'startup.begin',
        'datastore.init.attempt',
        'datastore.init.ok',
        'server.listening',
      ]);
      const listening = entries.at(-1)!.fields;
      expect(typeof listening.startupMs).toBe('number');
      expect(typeof listening.listenMs).toBe('number');

      const response = await fetch(`${baseUrl(server)}/api/health`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });

      const { cookie } = await login(baseUrl(server));
      const details = await fetch(`${baseUrl(server)}/api/health/details`, { headers: { cookie } });
      expect(await details.json()).toEqual({ ok: true, dataDir: dir, patientsCount: 0, appointmentsCount: 0 });

      const google = await fetch(`${baseUrl(server)}/api/google/status`, { headers: { cookie } });
      expect(google.status).toBe(503);
    } finally {
      await closeServer(server);
      await fs.rm(dir, { recursive: true, force: true });
      await fs.rm(authDir, { recursive: true, force: true });
    }
  });

  test('health details report a generic 500 JSON error when the data store cannot be read', async () => {
    const { dir, store } = await makeDataDir();
    const { auth, store: authStore, dir: authDir } = await makeAuth();
    await authStore.createUser({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const failingStore = { ...store, getPatients: async () => { throw fsError('EIO'); } };
    const server: Server = await startServer({
      app: createApp({ dataStore: failingStore, dataDir: dir, auth }),
      dataStore: failingStore,
      port: 0,
      host: '127.0.0.1',
      options: options(),
      logger: memoryLogger().logger,
    });

    try {
      const { cookie } = await login(baseUrl(server));
      const response = await fetch(`${baseUrl(server)}/api/health/details`, { headers: { cookie } });
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Internal server error.' });
    } finally {
      await closeServer(server);
      await fs.rm(dir, { recursive: true, force: true });
      await fs.rm(authDir, { recursive: true, force: true });
    }
  });

  test('retries a transient initialization error and then succeeds', async () => {
    let calls = 0;
    const delays: number[] = [];
    const { entries, logger } = memoryLogger();
    const store = {
      initialize: async () => {
        calls += 1;
        if (calls === 1) throw fsError('EMFILE');
      },
    };

    await initializeDataStore(store, {
      attempts: 3,
      retryDelayMs: 25,
      timeoutMs: 1_000,
      logger,
      sleep: async (ms: number) => { delays.push(ms); },
    });

    expect(calls).toBe(2);
    expect(delays).toEqual([25]);
    const failed = entries.find((entry) => entry.event === 'datastore.init.failed')!;
    expect(failed.level).toBe('warn');
    expect(failed.fields).toMatchObject({ attempt: 1, retryable: true, willRetry: true });
    expect((failed.fields.error as { stack?: string }).stack).toContain('EMFILE');
    expect(entries.at(-1)).toMatchObject({ event: 'datastore.init.ok', fields: { attempt: 2 } });
  });

  test('times out a hanging initialization attempt and retries it', async () => {
    let calls = 0;
    const store = {
      initialize: () => {
        calls += 1;
        return calls === 1 ? new Promise(() => {}) : Promise.resolve();
      },
    };

    await initializeDataStore(store, {
      attempts: 2,
      retryDelayMs: 0,
      timeoutMs: 100,
      logger: memoryLogger().logger,
      sleep: noSleep,
    });

    expect(calls).toBe(2);
  });

  test('does not retry permanent permission errors', async () => {
    let calls = 0;
    const { entries, logger } = memoryLogger();
    const store = { initialize: async () => { calls += 1; throw fsError('EACCES'); } };

    await expect(
      initializeDataStore(store, { attempts: 3, retryDelayMs: 0, timeoutMs: 1_000, logger, sleep: noSleep })
    ).rejects.toMatchObject({ code: 'EACCES' });

    expect(calls).toBe(1);
    expect(entries.at(-1)).toMatchObject({
      level: 'error',
      event: 'datastore.init.failed',
      fields: { retryable: false, willRetry: false },
    });
  });

  test('fails startup after all attempts without calling listen', async () => {
    let calls = 0;
    let listenCalled = false;
    const store = { initialize: async () => { calls += 1; throw fsError('EIO'); } };
    const app = { listen: () => { listenCalled = true; throw new Error('listen must not be called'); } };

    await expect(
      startServer({
        app,
        dataStore: store,
        port: 0,
        host: '127.0.0.1',
        options: options({ initAttempts: 3 }),
        logger: memoryLogger().logger,
        sleep: noSleep,
      })
    ).rejects.toMatchObject({ code: 'EIO' });

    expect(calls).toBe(3);
    expect(listenCalled).toBe(false);
  });

  test('reports listener errors such as a port already in use', async () => {
    const blocker = net.createServer();
    await new Promise<void>((resolve) => blocker.listen(0, '127.0.0.1', resolve));
    const { port } = blocker.address() as AddressInfo;
    const { dir, store } = await makeDataDir();
    const { entries, logger } = memoryLogger();
    const { auth, dir: authDir } = await makeAuth();

    try {
      await expect(
        startServer({
          app: createApp({ dataStore: store, dataDir: dir, auth }),
          dataStore: store,
          port,
          host: '127.0.0.1',
          options: options(),
          logger,
        })
      ).rejects.toMatchObject({ code: 'EADDRINUSE' });
      expect(entries.at(-1)).toMatchObject({ level: 'error', event: 'server.listen.failed' });
    } finally {
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
      await fs.rm(dir, { recursive: true, force: true });
      await fs.rm(authDir, { recursive: true, force: true });
    }
  });
});

test.describe('startup configuration and data safety', () => {
  test('reads bounded retry options from the environment', () => {
    expect(readStartupOptions({})).toEqual({ initAttempts: 3, initRetryDelayMs: 500, initTimeoutMs: 10_000 });
    expect(readStartupOptions({
      STARTUP_INIT_ATTEMPTS: '100',
      STARTUP_INIT_RETRY_DELAY_MS: '-5',
      STARTUP_INIT_TIMEOUT_MS: 'abc',
    })).toEqual({ initAttempts: 5, initRetryDelayMs: 0, initTimeoutMs: 10_000 });
    expect(isRetryableInitError(fsError('EMFILE'))).toBe(true);
    expect(isRetryableInitError(fsError('ENOSPC'))).toBe(false);
  });

  test('initialize keeps existing data files untouched and creates only missing ones', async () => {
    const { dir, store } = await makeDataDir();
    const patients = JSON.stringify([{ id: 'p1', firstName: 'Existing' }]);
    await fs.writeFile(path.join(dir, 'patients.json'), patients, 'utf8');

    try {
      await store.initialize();
      expect(await fs.readFile(path.join(dir, 'patients.json'), 'utf8')).toBe(patients);
      expect(JSON.parse(await fs.readFile(path.join(dir, 'appointments.json'), 'utf8'))).toEqual([]);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test('initialize surfaces non-ENOENT access errors instead of writing defaults', async () => {
    test.skip(process.getuid?.() === 0, 'root bypasses file permissions');
    const { dir, store } = await makeDataDir();
    await fs.writeFile(path.join(dir, 'patients.json'), '[{"id":"keep"}]', 'utf8');
    await fs.chmod(dir, 0o000);

    try {
      await expect(store.initialize()).rejects.toMatchObject({ code: 'EACCES' });
    } finally {
      await fs.chmod(dir, 0o700);
      expect(await fs.readFile(path.join(dir, 'patients.json'), 'utf8')).toBe('[{"id":"keep"}]');
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
