// Startup helpers: structured logging, bounded data-store initialization retry, and listener readiness.
// Under Phusion Passenger, http.Server#listen is replaced by Passenger's loader, which ignores the
// port/host arguments, binds its own Unix socket and then emits 'listening'. So app.listen(PORT, HOST)
// is correct for both Passenger and local development, and must be called exactly once.

const RETRYABLE_INIT_ERROR_CODES = new Set([
  'EAGAIN',
  'EBUSY',
  'EINTR',
  'EIO',
  'EMFILE',
  'ENFILE',
  'ESTALE',
  'ETIMEDOUT',
  'STARTUP_INIT_TIMEOUT',
]);

export const isRetryableInitError = (error) => RETRYABLE_INIT_ERROR_CODES.has(error?.code);

export const serializeError = (error) => {
  if (!(error instanceof Error)) return { message: String(error) };
  return {
    name: error.name,
    code: error.code,
    message: error.message,
    stack: error.stack,
  };
};

export function createLogger({ stdout = process.stdout, stderr = process.stderr, now = () => new Date() } = {}) {
  const write = (stream, level, event, fields = {}) => {
    stream.write(`${JSON.stringify({ ts: now().toISOString(), level, event, pid: process.pid, ...fields })}\n`);
  };
  return {
    info: (event, fields) => write(stdout, 'info', event, fields),
    warn: (event, fields) => write(stderr, 'warn', event, fields),
    error: (event, fields) => write(stderr, 'error', event, fields),
  };
}

const readInt = (value, fallback, min, max) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

export function readStartupOptions(env = process.env) {
  return {
    initAttempts: readInt(env.STARTUP_INIT_ATTEMPTS, 3, 1, 5),
    initRetryDelayMs: readInt(env.STARTUP_INIT_RETRY_DELAY_MS, 500, 0, 5_000),
    initTimeoutMs: readInt(env.STARTUP_INIT_TIMEOUT_MS, 10_000, 100, 60_000),
  };
}

const elapsed = (startedAt) => Math.round(performance.now() - startedAt);

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = (promise, timeoutMs) => {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`Data store initialization did not finish within ${timeoutMs} ms.`);
      error.code = 'STARTUP_INIT_TIMEOUT';
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

export async function initializeDataStore(dataStore, {
  attempts = 3,
  retryDelayMs = 500,
  timeoutMs = 10_000,
  logger = createLogger(),
  sleep = defaultSleep,
} = {}) {
  for (let attempt = 1; ; attempt += 1) {
    const startedAt = performance.now();
    logger.info('datastore.init.attempt', { attempt, maxAttempts: attempts });
    try {
      await withTimeout(Promise.resolve().then(() => dataStore.initialize()), timeoutMs);
      logger.info('datastore.init.ok', { attempt, durationMs: elapsed(startedAt) });
      return;
    } catch (error) {
      const retryable = isRetryableInitError(error);
      const willRetry = retryable && attempt < attempts;
      logger[willRetry ? 'warn' : 'error']('datastore.init.failed', {
        attempt,
        maxAttempts: attempts,
        durationMs: elapsed(startedAt),
        retryable,
        willRetry,
        error: serializeError(error),
      });
      if (!willRetry) throw error;
      await sleep(retryDelayMs);
    }
  }
}

export function listen(app, { port, host }) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host);

    const onListening = () => {
      server.removeListener('error', onError);
      resolve(server);
    };
    const onError = (error) => {
      server.removeListener('listening', onListening);
      if (error.code === 'EADDRINUSE') {
        error.message =
          `Port ${port} is already in use on ${host}. ` +
          'Another backend instance may already be running. ' +
          'Stop the existing process or reconfigure the frontend before using a different PORT.';
      }
      reject(error);
    };

    server.once('listening', onListening);
    server.once('error', onError);
  });
}

const describeAddress = (address) => {
  if (!address) return null;
  if (typeof address === 'string') return address;
  return `${address.address}:${address.port}`;
};

export async function startServer({
  app,
  dataStore,
  port,
  host,
  options = readStartupOptions(),
  logger = createLogger(),
  sleep,
  isPassenger = typeof globalThis.PhusionPassenger !== 'undefined',
}) {
  const startedAt = performance.now();
  logger.info('startup.begin', {
    node: process.version,
    passenger: isPassenger,
    // Time since the Node process started, i.e. mostly module loading before startServer() ran.
    moduleLoadMs: Math.round(process.uptime() * 1000),
    initAttempts: options.initAttempts,
    initRetryDelayMs: options.initRetryDelayMs,
    initTimeoutMs: options.initTimeoutMs,
  });

  await initializeDataStore(dataStore, {
    attempts: options.initAttempts,
    retryDelayMs: options.initRetryDelayMs,
    timeoutMs: options.initTimeoutMs,
    logger,
    sleep,
  });

  const listenStartedAt = performance.now();
  try {
    const server = await listen(app, { port, host });
    logger.info('server.listening', {
      passenger: isPassenger,
      address: describeAddress(server.address()),
      listenMs: elapsed(listenStartedAt),
      startupMs: elapsed(startedAt),
    });
    return server;
  } catch (error) {
    logger.error('server.listen.failed', { listenMs: elapsed(listenStartedAt), error: serializeError(error) });
    throw error;
  }
}

// Report the failure and exit non-zero so Passenger can treat this process as failed and respawn on demand.
// The short unref'd timer lets buffered log output flush first without keeping a healthy loop alive.
export function exitWithFailure(code = 1) {
  process.exitCode = code;
  setTimeout(() => process.exit(code), 1_000).unref();
}
