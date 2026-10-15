import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class AuthStorageError extends Error {
  constructor(message, { code = 'EAUTHSTORE', cause } = {}) {
    super(message);
    this.name = 'AuthStorageError';
    this.code = code;
    this.statusCode = 500;
    this.expose = false;
    if (cause?.code) this.causeCode = cause.code;
  }
}

export async function ensurePrivateDir(dir) {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
}

/**
 * Reads and parses a JSON file. A missing file returns `missingValue`.
 * Parse errors never include file contents in the thrown message, so nothing secret reaches logs.
 */
export async function readJsonFile(filePath, missingValue) {
  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return missingValue;
    throw new AuthStorageError(`Unable to read ${path.basename(filePath)}.`, { code: 'EAUTHREAD', cause: error });
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new AuthStorageError(`${path.basename(filePath)} is not valid JSON.`, { code: 'EAUTHCORRUPT' });
  }
}

/** Writes JSON atomically: private temp file, fsync, then rename over the target. */
export async function writeJsonFileAtomic(filePath, value) {
  await ensurePrivateDir(path.dirname(filePath));
  const tmpPath = `${filePath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  const handle = await fs.open(tmpPath, 'wx', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    await fs.rm(tmpPath, { force: true });
    throw error;
  }
  await fs.chmod(filePath, 0o600).catch(() => {});
}

const processQueues = new Map();

/**
 * Serialises read-modify-write sections for one file, both inside this process (promise queue)
 * and across Passenger worker processes (exclusive lock file with stale-lock recovery).
 */
export function withFileLock(filePath, fn, { timeoutMs = 5000, staleMs = 15000 } = {}) {
  const previous = processQueues.get(filePath) ?? Promise.resolve();
  const run = previous.catch(() => {}).then(() => withCrossProcessLock(filePath, fn, { timeoutMs, staleMs }));
  const tail = run.catch(() => {});
  processQueues.set(filePath, tail);
  tail.then(() => {
    if (processQueues.get(filePath) === tail) processQueues.delete(filePath);
  });
  return run;
}

async function withCrossProcessLock(filePath, fn, { timeoutMs, staleMs }) {
  await ensurePrivateDir(path.dirname(filePath));
  const lockPath = `${filePath}.lock`;
  const deadline = Date.now() + timeoutMs;
  let handle;

  while (!handle) {
    try {
      handle = await fs.open(lockPath, 'wx', 0o600);
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw new AuthStorageError(`Unable to lock ${path.basename(filePath)}.`, { code: 'EAUTHLOCK', cause: error });
      }
      const stat = await fs.stat(lockPath).catch(() => null);
      if (stat && Date.now() - stat.mtimeMs > staleMs) {
        await fs.rm(lockPath, { force: true });
        continue;
      }
      if (Date.now() > deadline) {
        throw new AuthStorageError(`Timed out waiting for ${path.basename(filePath)} lock.`, { code: 'EAUTHLOCKTIMEOUT' });
      }
      await sleep(15 + Math.floor(Math.random() * 25));
    }
  }

  try {
    await handle.writeFile(String(process.pid));
    return await fn();
  } finally {
    await handle.close().catch(() => {});
    await fs.rm(lockPath, { force: true });
  }
}
