import { Throttle } from "@nestjs/throttler";

/** Named limits, not environment variables, so a bad deploy cannot silently change a policy (C-12). */
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_GLOBAL_MAX = 100;

/** Throttler options for the global limiter: 100 requests per minute per IP (D-003). */
export const GLOBAL_THROTTLERS = [
  { name: "default", ttl: RATE_LIMIT_WINDOW_MS, limit: RATE_LIMIT_GLOBAL_MAX },
];

/** A stricter limit for one route, for example sign-in later. The number is chosen where it is applied. */
export const strictRateLimit = (maxPerWindow: number) =>
  Throttle({ default: { limit: maxPerWindow, ttl: RATE_LIMIT_WINDOW_MS } });