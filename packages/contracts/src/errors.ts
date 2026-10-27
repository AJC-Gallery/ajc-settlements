/** One error envelope for the whole API (S-06). The frontend branches on `code`, never on `message`. */
export const ERROR_CODES = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  NOT_FOUND: "NOT_FOUND",
  MISSING_PERMISSION: "MISSING_PERMISSION",
  CONFLICT: "CONFLICT",
  ASSET_CLOSED: "ASSET_CLOSED",
  DECLARED_COUNT_FLOOR: "DECLARED_COUNT_FLOOR",
  STAR_CAP_REACHED: "STAR_CAP_REACHED",
  IDEMPOTENCY_KEY_REUSED: "IDEMPOTENCY_KEY_REUSED",
  /** A destructive action was called without a valid preview token: missing, expired or mismatched. */
  CONFIRMATION_REQUIRED: "CONFIRMATION_REQUIRED",
  /** 429. The response also carries a `Retry-After` header, in whole seconds. */
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * One invalid request field and every message that applies to it.
 * `field` is the path from the root of the request body, dot-separated, with array
 * positions as numbers (`units.0.nickname`). A query or path parameter uses its own
 * name. An empty string means the request as a whole.
 */
export interface FieldError {
  readonly field: string;
  readonly messages: readonly string[];
}

/** `details` of VALIDATION_FAILED (400). */
export interface ValidationFailedDetails {
  readonly fields: readonly FieldError[];
}

/** `details` of MISSING_PERMISSION (403): names the permission the member lacks. */
export interface MissingPermissionDetails {
  readonly permission: string;
}

interface ApiErrorShape<C extends ErrorCode, D> {
  readonly code: C;
  /** English text for logs and support. Never branch on it and never show it as user copy: it can change. */
  readonly message: string;
  readonly details: D;
  readonly requestId: string;
}

export type ValidationFailedBody = ApiErrorShape<
  typeof ERROR_CODES.VALIDATION_FAILED,
  ValidationFailedDetails
>;

export type MissingPermissionBody = ApiErrorShape<
  typeof ERROR_CODES.MISSING_PERMISSION,
  MissingPermissionDetails
>;

/** Every other code carries `details: null` until a contract change gives it a typed shape. */
export type PlainErrorBody = ApiErrorShape<
  Exclude<ErrorCode, typeof ERROR_CODES.VALIDATION_FAILED | typeof ERROR_CODES.MISSING_PERMISSION>,
  null
>;

/** The body of every non-2xx response. Narrow on `code` to reach the typed `details`. */
export type ApiErrorBody = ValidationFailedBody | MissingPermissionBody | PlainErrorBody;