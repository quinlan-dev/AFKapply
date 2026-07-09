// Simple in-memory sliding-window rate limiter. Good enough for a
// single-instance free-tier deployment; swap for Upstash/Redis if you scale out.

const hits = new Map<string, number[]>();

const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (hits.size > MAX_KEYS) hits.clear();

  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= limit) {
    hits.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return true;
}

// Best-effort client identifier behind Vercel/proxies.
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
