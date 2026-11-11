import {
  ERROR_CODES,
  ERROR_HTTP_STATUS,
  type ApiErrorBody,
  type PlainErrorBody,
} from "@ajc/contracts";
import { HttpException } from "@nestjs/common";
import { ApiError } from "./api-error.js";

/** What the exception filter sends: a status, the contract body, and whether it was a server fault. */
export interface ErrorResponse {
  readonly status: number;
  readonly body: ApiErrorBody;
  /** True for a status of 500 or more except SERVICE_UNAVAILABLE. The filter logs these at error level. */
  readonly isUnexpected: boolean;
  /** True for SERVICE_UNAVAILABLE: a reported state (for example readiness), logged at warn without a stack. */
  readonly isUnavailable: boolean;
}

const SERVER_ERROR_MIN_STATUS = 500;
const PAYLOAD_TOO_LARGE_STATUS = 413;
const INTERNAL_MESSAGE = "Internal server error";

type HttpMapCode = PlainErrorBody["code"] | typeof ERROR_CODES.VALIDATION_FAILED;

interface HttpMapEntry {
  readonly code: HttpMapCode;
  readonly message: string;
}

/**
 * Nest's own exceptions (unknown route, malformed JSON, body too large) mapped to contract
 * codes. The text is fixed: nothing from the request is echoed back (P-05). Any status
 * missing here, 403 included, is a fault: the gate throws ApiError, never a bare 403.
 */
const HTTP_STATUS_TO_CODE: Readonly<Record<number, HttpMapEntry>> = {
  [ERROR_HTTP_STATUS.VALIDATION_FAILED]: { code: ERROR_CODES.VALIDATION_FAILED, message: "Malformed request" },
  [PAYLOAD_TOO_LARGE_STATUS]: { code: ERROR_CODES.VALIDATION_FAILED, message: "Request too large" },
  [ERROR_HTTP_STATUS.UNAUTHENTICATED]: { code: ERROR_CODES.UNAUTHENTICATED, message: "Not signed in" },
  [ERROR_HTTP_STATUS.NOT_FOUND]: { code: ERROR_CODES.NOT_FOUND, message: "Not found" },
  [ERROR_HTTP_STATUS.CONFLICT]: { code: ERROR_CODES.CONFLICT, message: "Conflict" },
  [ERROR_HTTP_STATUS.RATE_LIMITED]: { code: ERROR_CODES.RATE_LIMITED, message: "Too many requests" },
  [ERROR_HTTP_STATUS.SERVICE_UNAVAILABLE]: {
    code: ERROR_CODES.SERVICE_UNAVAILABLE,
    message: "Service unavailable",
  },
};

function internalBody(requestId: string): ApiErrorBody {
  return { code: ERROR_CODES.INTERNAL_ERROR, message: INTERNAL_MESSAGE, details: null, requestId };
}

/** Returns undefined when the code and its details do not pair up: that is a programming error. */
function fromApiError(error: ApiError, requestId: string): ApiErrorBody | undefined {
  const { code, message, details } = error;
  if (code === ERROR_CODES.VALIDATION_FAILED) {
    return details !== null && "fields" in details ? { code, message, details, requestId } : undefined;
  }
  if (code === ERROR_CODES.MISSING_PERMISSION) {
    return details !== null && "permission" in details ? { code, message, details, requestId } : undefined;
  }
  return details === null ? { code, message, details: null, requestId } : undefined;
}

function fromHttpException(error: HttpException, requestId: string): ApiErrorBody | undefined {
  const entry = HTTP_STATUS_TO_CODE[error.getStatus()];
  if (entry === undefined) return undefined;
  const { code, message } = entry;
  if (code === ERROR_CODES.VALIDATION_FAILED) {
    const fields = [{ field: "", messages: [message] }];
    return { code, message, details: { fields }, requestId };
  }
  return { code, message, details: null, requestId };
}

function classify(error: unknown, requestId: string): ApiErrorBody | undefined {
  if (error instanceof ApiError) return fromApiError(error, requestId);
  if (error instanceof HttpException) return fromHttpException(error, requestId);
  return undefined;
}

/**
 * Pure: any thrown value to the contract envelope (C-11). The status comes from the
 * contract's one map (C-06). Anything unrecognised becomes INTERNAL_ERROR with fixed
 * text, so no driver or stack detail can reach a client.
 */
export function toErrorResponse(error: unknown, requestId: string): ErrorResponse {
  const body = classify(error, requestId) ?? internalBody(requestId);
  const status = ERROR_HTTP_STATUS[body.code];
  const isUnavailable = body.code === ERROR_CODES.SERVICE_UNAVAILABLE;
  return { status, body, isUnavailable, isUnexpected: status >= SERVER_ERROR_MIN_STATUS && !isUnavailable };
}