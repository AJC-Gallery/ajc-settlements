import type { ErrorCode, MissingPermissionDetails, ValidationFailedDetails } from "@ajc/contracts";

/** The typed `details` an error can carry. Every other code carries null. */
export type ApiErrorDetails = ValidationFailedDetails | MissingPermissionDetails | null;

/**
 * A business failure with a stable contract code (C-11). `message` is English and
 * log-only: the frontend maps `code` to text in each language.
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly details: ApiErrorDetails;

  constructor(code: ErrorCode, message: string, details: ApiErrorDetails = null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}