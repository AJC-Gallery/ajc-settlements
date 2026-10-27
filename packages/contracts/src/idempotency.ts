/** Every create endpoint requires this header (F-11). */
export const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";

/** Shortest accepted key, in characters (F-11). */
export const IDEMPOTENCY_KEY_MIN_LENGTH = 16;