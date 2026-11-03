import {
  ERROR_CODES,
  ERROR_HTTP_STATUS,
  type ApiErrorBody,
  type ErrorCode,
  type FieldConstraint,
  type FieldError,
  type PlainErrorBody,
} from "@ajc/contracts";
import type { ApiFailure, ConflictCode } from "./api-error";

/** From this status up, a response is a server failure even when it carries no readable envelope (a gateway, a sleeping host). */
export const SERVER_ERROR_MIN_STATUS = 500;

const KNOWN_CODES: ReadonlySet<string> = new Set(Object.values(ERROR_CODES));

const CONFLICT_CODES: readonly ErrorCode[] = [
  ERROR_CODES.CONFLICT,
  ERROR_CODES.ASSET_CLOSED,
  ERROR_CODES.DECLARED_COUNT_FLOOR,
  ERROR_CODES.STAR_CAP_REACHED,
  ERROR_CODES.IDEMPOTENCY_KEY_REUSED,
  ERROR_CODES.CONFIRMATION_REQUIRED,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && KNOWN_CODES.has(value);
}

function isConflictCode(code: ErrorCode): code is ConflictCode {
  return CONFLICT_CODES.includes(code);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

// Only the shape is checked. A name this build does not know passes on purpose: the API and the web
// app deploy separately, so the UI must fall back to a generic text for a name it has not seen.
function isFieldConstraint(value: unknown): value is FieldConstraint {
  return isRecord(value) && typeof value["name"] === "string";
}

function readFieldError(value: unknown): FieldError | null {
  if (!isRecord(value)) return null;
  const { field, messages, constraints } = value;
  if (typeof field !== "string" || !isStringArray(messages)) return null;
  if (constraints === undefined) return { field, messages };
  if (!Array.isArray(constraints) || !constraints.every(isFieldConstraint)) return null;
  return { field, messages, constraints };
}

function readFields(details: unknown): readonly FieldError[] | null {
  if (!isRecord(details) || !Array.isArray(details["fields"])) return null;
  const fields = details["fields"].map(readFieldError);
  return fields.every((field) => field !== null) ? fields : null;
}

function withDetails(code: ErrorCode, message: string, requestId: string, details: unknown): ApiErrorBody | null {
  if (code === ERROR_CODES.VALIDATION_FAILED) {
    const fields = readFields(details);
    return fields === null ? null : { code, message, requestId, details: { fields } };
  }
  if (code === ERROR_CODES.MISSING_PERMISSION) {
    if (!isRecord(details) || typeof details["permission"] !== "string") return null;
    return { code, message, requestId, details: { permission: details["permission"] } };
  }
  return { code, message, requestId, details: null };
}

/**
 * The typed error body, or null when the response is not a complete envelope for its status.
 * A body without a request id, an unknown code, or a code that disagrees with the status is not trusted.
 */
export function readErrorBody(status: number, body: unknown): ApiErrorBody | null {
  if (!isRecord(body)) return null;
  const { code, message, requestId, details } = body;
  if (!isErrorCode(code) || typeof message !== "string") return null;
  if (typeof requestId !== "string" || requestId === "") return null;
  if (ERROR_HTTP_STATUS[code] !== status) return null;
  return withDetails(code, message, requestId, details);
}

function plainFailure(body: PlainErrorBody, status: number, retryAfterSeconds: number | null): ApiFailure {
  const { code, requestId } = body;
  if (isConflictCode(code)) return { kind: "conflict", requestId, code };
  switch (code) {
    case ERROR_CODES.UNAUTHENTICATED:
      return { kind: "unauthenticated", requestId };
    case ERROR_CODES.NOT_FOUND:
      return { kind: "notFound", requestId };
    case ERROR_CODES.RATE_LIMITED:
      return { kind: "rateLimited", requestId, retryAfterSeconds };
    case ERROR_CODES.INTERNAL_ERROR:
    case ERROR_CODES.SERVICE_UNAVAILABLE:
      return { kind: "server", requestId, status, code };
  }
}

/** Adding an error code to the contract fails to compile here until the new code is mapped. */
export function toFailure(body: ApiErrorBody, status: number, retryAfterSeconds: number | null): ApiFailure {
  if (body.code === ERROR_CODES.VALIDATION_FAILED) {
    return { kind: "validation", requestId: body.requestId, fields: body.details.fields };
  }
  if (body.code === ERROR_CODES.MISSING_PERMISSION) {
    return { kind: "forbidden", requestId: body.requestId, permission: body.details.permission };
  }
  return plainFailure(body, status, retryAfterSeconds);
}

/** Retry-After is whole seconds (contract). Anything else, including an HTTP date, is treated as absent. */
export function parseRetryAfter(header: string | null): number | null {
  return header !== null && /^\d+$/.test(header.trim()) ? Number(header.trim()) : null;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function failureFromResponse(response: Response): Promise<ApiFailure> {
  const { status } = response;
  const body = readErrorBody(status, await readJson(response));
  if (body !== null) return toFailure(body, status, parseRetryAfter(response.headers.get("retry-after")));
  if (status >= SERVER_ERROR_MIN_STATUS) return { kind: "server", requestId: null, status, code: null };
  return { kind: "unreadable", status };
}
