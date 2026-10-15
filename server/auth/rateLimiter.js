/**
 * In-memory fixed-window counter for failed login attempts.
 * Counters live in the current Node process only: they reset when Passenger restarts the app,
 * and each Passenger process keeps its own counters.
 */
export function createRateLimiter({ limit, windowMs, now = () => Date.now(), maxKeys = 10_000 }) {
  const entries = new Map();

  const current = (key) => {
    const entry = entries.get(key);
    if (!entry) return null;
    if (entry.resetAt <= now()) {
      entries.delete(key);
      return null;
    }
    return entry;
  };

  const prune = () => {
    const time = now();
    for (const [key, entry] of entries) {
      if (entry.resetAt <= time) entries.delete(key);
    }
    // Hard cap so a flood of distinct keys cannot grow memory without bound.
    while (entries.size >= maxKeys) entries.delete(entries.keys().next().value);
  };

  return {
    /** Returns seconds until the key may try again, or 0 when it is not blocked. */
    retryAfter(key) {
      const entry = current(key);
      if (!entry || entry.count < limit) return 0;
      return Math.max(1, Math.ceil((entry.resetAt - now()) / 1000));
    },
    fail(key) {
      const entry = current(key);
      if (entry) {
        entry.count += 1;
        return;
      }
      if (entries.size >= maxKeys) prune();
      entries.set(key, { count: 1, resetAt: now() + windowMs });
    },
    reset(key) {
      entries.delete(key);
    },
  };
}
