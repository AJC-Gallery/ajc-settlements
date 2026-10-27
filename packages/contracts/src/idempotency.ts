/** Every create endpoint requires this header (F-11). */
export const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";

/** Shortest accepted key, in characters (F-11). */
export const IDEMPOTENCY_KEY_MIN_LENGTH = 16;

/** Longest accepted key, in characters. Room for a UUID (36) with margin. */
export const IDEMPOTENCY_KEY_MAX_LENGTH = 64;

/** Letters, digits, underscore and hyphen only. A UUID matches. */
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;