import type { ErrorCode } from "./errors.js";

/**
 * The HTTP status of every error code, defined once (C-06). The API's exception filter
 * reads this map, so the status a client sees can never drift from the code.
 * `satisfies` makes a new code without a status a compile error.
 */
export const ERROR_HTTP_STATUS = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  MISSING_PERMISSION: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  ASSET_CLOSED: 409,
  DECLARED_COUNT_FLOOR: 409,
  STAR_CAP_REACHED: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  CONFIRMATION_REQUIRED: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const satisfies Record<ErrorCode, number>;