import type { ErrorCode, FieldError } from "@ajc/contracts";

/** The error codes that mean "the request was understood but the data is in the way" (HTTP 409). */
export type ConflictCode = Extract<
  ErrorCode,
  | "CONFLICT"
  | "ASSET_CLOSED"
  | "DECLARED_COUNT_FLOOR"
  | "STAR_CAP_REACHED"
  | "IDEMPOTENCY_KEY_REUSED"
  | "CONFIRMATION_REQUIRED"
>;

/**
 * What went wrong, in the terms the Frontend document's error table uses. The UI branches on `kind`
 * and never on a status number or on the server's English `message`.
 */
export type ApiFailure =
  | { readonly kind: "validation"; readonly requestId: string; readonly fields: readonly FieldError[] }
  | { readonly kind: "unauthenticated"; readonly requestId: string }
  | { readonly kind: "forbidden"; readonly requestId: string; readonly permission: string }
  | { readonly kind: "notFound"; readonly requestId: string }
  | { readonly kind: "conflict"; readonly requestId: string; readonly code: ConflictCode }
  | { readonly kind: "rateLimited"; readonly requestId: string; readonly retryAfterSeconds: number | null }
  | { readonly kind: "server"; readonly requestId: string | null; readonly status: number; readonly code: ErrorCode | null }
  | { readonly kind: "network" }
  | { readonly kind: "unreadable"; readonly status: number };

export class ApiError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(`API request failed: ${failure.kind}`);
    this.name = "ApiError";
  }
}

/** A failed request may have reached the server, so only these are offered a retry (with the same idempotency key). */
export function isRetryable(failure: ApiFailure): boolean {
  return failure.kind === "server" || failure.kind === "network";
}
