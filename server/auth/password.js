import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';

// scrypt with OWASP-recommended parameters (N=2^16, r=8, p=2 ≈ 64 MiB per hash).
// Parameters are stored in each hash, so they can be raised later without invalidating old hashes.
export const DEFAULT_HASH_PARAMS = Object.freeze({ N: 2 ** 16, r: 8, p: 2, keyLength: 32, saltLength: 16 });

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_RULES = `at least ${PASSWORD_MIN_LENGTH} characters, with one capital letter, one number and one special character`;
export const PASSWORD_MAX_LENGTH = 1024;

const scrypt = (password, salt, keyLength, { N, r, p }) =>
  new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, { N, r, p, maxmem: 256 * N * r + 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });

// Limit concurrent hashing so a burst of logins cannot exhaust shared-hosting memory.
const MAX_CONCURRENT_HASHES = 2;
let activeHashes = 0;
const waiting = [];

async function withHashSlot(fn) {
  if (activeHashes >= MAX_CONCURRENT_HASHES) {
    await new Promise((resolve) => waiting.push(resolve));
  }
  activeHashes += 1;
  try {
    return await fn();
  } finally {
    activeHashes -= 1;
    waiting.shift()?.();
  }
}

export async function hashPassword(password, params = DEFAULT_HASH_PARAMS) {
  const { N, r, p, keyLength, saltLength } = { ...DEFAULT_HASH_PARAMS, ...params };
  const salt = randomBytes(saltLength);
  const key = await withHashSlot(() => scrypt(password.normalize('NFKC'), salt, keyLength, { N, r, p }));
  return `scrypt$N=${N},r=${r},p=${p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

const parseHash = (encoded) => {
  if (typeof encoded !== 'string') return null;
  const match = /^scrypt\$N=(\d+),r=(\d+),p=(\d+)\$([A-Za-z0-9+/=]+)\$([A-Za-z0-9+/=]+)$/.exec(encoded);
  if (!match) return null;
  const [, N, r, p, salt, key] = match;
  const params = { N: Number(N), r: Number(r), p: Number(p) };
  if (params.N < 2 ** 10 || params.N > 2 ** 20 || params.r < 1 || params.r > 32 || params.p < 1 || params.p > 16) return null;
  return { params, salt: Buffer.from(salt, 'base64'), key: Buffer.from(key, 'base64') };
};

export async function verifyPassword(password, encoded) {
  const parsed = parseHash(encoded);
  if (!parsed || typeof password !== 'string') return false;
  const candidate = await withHashSlot(() =>
    scrypt(password.normalize('NFKC'), parsed.salt, parsed.key.length, parsed.params));
  return candidate.length === parsed.key.length && timingSafeEqual(candidate, parsed.key);
}

const dummyHashes = new Map();

/** Spends the same work as a real verification, so unknown e-mails are not distinguishable by timing. */
export async function verifyAgainstDummy(password, params = DEFAULT_HASH_PARAMS) {
  const cacheKey = JSON.stringify(params);
  if (!dummyHashes.has(cacheKey)) dummyHashes.set(cacheKey, hashPassword(randomBytes(32).toString('hex'), params));
  await verifyPassword(typeof password === 'string' ? password : '', await dummyHashes.get(cacheKey));
  return false;
}

export function validateNewPassword(password) {
  if (typeof password !== 'string' || password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (password.length < PASSWORD_MIN_LENGTH
    || !/\p{Lu}/u.test(password)
    || !/\p{Nd}/u.test(password)
    || !/[^\p{L}\p{Nd}\s]/u.test(password)) {
    return `Password must have ${PASSWORD_RULES}.`;
  }
  return null;
}
