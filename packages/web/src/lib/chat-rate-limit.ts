const buckets = new Map<string, number[]>();

/**
 * Very small in-memory rate limiter suitable for hackathon / single-instance dev.
 * For production, prefer Redis + shared limits at the edge.
 */
export function rateLimitChat(
  key: string,
  limit = 10,
  windowMs = 60_000,
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const prev = buckets.get(key) ?? [];
  const recent = prev.filter((t) => t > windowStart);

  if (recent.length >= limit) {
    const oldestInWindow = Math.min(...recent);
    return { ok: false, retryAfterMs: Math.max(0, oldestInWindow + windowMs - now) };
  }

  recent.push(now);
  buckets.set(key, recent);
  return { ok: true };
}
