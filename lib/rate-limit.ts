type RateLimitEntry = {
  timestamps: number[];
};

const store = new Map<string, RateLimitEntry>();

// Auto-cleanup every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < 60_000);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
  // Don't block process exit
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
};

/**
 * Sliding-window in-memory rate limiter.
 * @param key - Unique identifier (e.g., IP address)
 * @param limit - Max requests per window
 * @param windowMs - Window size in milliseconds (default: 60000 = 1 minute)
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): RateLimitResult {
  ensureCleanup();

  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    const oldestInWindow = entry.timestamps[0];
    return {
      success: false,
      remaining: 0,
      reset: oldestInWindow + windowMs,
    };
  }

  entry.timestamps.push(now);

  return {
    success: true,
    remaining: limit - entry.timestamps.length,
    reset: now + windowMs,
  };
}
