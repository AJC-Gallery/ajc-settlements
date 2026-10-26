/** Shared constants and request and response types. Nothing else lives here. */
export const API_PREFIX = "/api/v1";

export { ERROR_CODES } from "./errors.js";
export type {
  ApiErrorBody,
  ErrorCode,
  FieldError,
  MissingPermissionBody,
  MissingPermissionDetails,
  PlainErrorBody,
  ValidationFailedBody,
  ValidationFailedDetails,
} from "./errors.js";
export { MAX_PAGE_LIMIT } from "./pagination.js";
export type { PageResponse } from "./pagination.js";
export { IDEMPOTENCY_KEY_HEADER, IDEMPOTENCY_KEY_MIN_LENGTH } from "./idempotency.js";
export type { HealthLiveResponse, HealthReadyResponse } from "./health.js";