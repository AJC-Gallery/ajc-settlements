import { ERROR_HTTP_STATUS } from "@ajc/contracts";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { toErrorResponse, type ErrorResponse } from "../common/error-body.js";
import { REQUEST_ID_HEADER } from "../common/request-id.js";
import type { Logger } from "./logger.js"; 
/** `Retry-After` for a 429 when the rate limiter did not set one already, in whole seconds. */
export const DEFAULT_RETRY_AFTER_SECONDS = 60;
const RETRY_AFTER_HEADER = "Retry-After";

/** The few request members the filter reads. `requestId` is set by the request-id middleware (2b). */
export interface RequestLike {
  readonly method?: string;
  readonly url?: string;
  readonly requestId?: string;
}

/** The few response members the filter uses, so it does not depend on the HTTP platform's types. */
export interface ResponseLike {
  readonly headersSent?: boolean;
  status(code: number): ResponseLike;
  json(body: unknown): unknown;
  setHeader(name: string, value: string): unknown;
  getHeader(name: string): unknown;
}

const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/;

/** The five-character SQLSTATE of a driver error, when it has one. Never the message. */
function sqlStateOf(error: Error | undefined): string | undefined {
  const code = (error as { code?: unknown } | undefined)?.code;
  return typeof code === "string" && SQLSTATE_PATTERN.test(code) ? code : undefined;
}

/**
 * Stack frames only. The first line of a stack is `Name: message`, and a driver message
 * can carry values, so everything before the first `at ` frame is dropped (ruling 5).
 */
function framesOf(error: Error | undefined): string | undefined {
  const frames = error?.stack?.split("\n").filter((line) => line.trimStart().startsWith("at "));
  return frames === undefined ? undefined : frames.join("\n");
}

/** The path without its query string: query strings can carry tokens (P-13). */
const pathOf = (url: string | undefined): string => (url ?? "").split("?")[0] ?? "";

/**
 * The one exception filter (C-11): every failure becomes the contract envelope with the
 * request id, and is logged once. It has no @Catch decorator, which Nest treats as
 * catch-everything; 2b proves that inside a running application.
 */
export class ErrorFilter implements ExceptionFilter {
  private readonly logger: Logger;
  private readonly newRequestId: () => string;

  constructor(logger: Logger, newRequestId: () => string) {
    this.logger = logger;
    this.newRequestId = newRequestId;
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestLike>();
    const response = http.getResponse<ResponseLike>();
    const result = toErrorResponse(exception, request.requestId ?? this.newRequestId());
    this.log(exception, result, request);
    if (response.headersSent === true) return;
    response.setHeader(REQUEST_ID_HEADER, result.body.requestId);
    if (result.status === ERROR_HTTP_STATUS.RATE_LIMITED && response.getHeader(RETRY_AFTER_HEADER) === undefined) {
      response.setHeader(RETRY_AFTER_HEADER, String(DEFAULT_RETRY_AFTER_SECONDS));
    }
    response.status(result.status).json(result.body);
  }

  private log(exception: unknown, result: ErrorResponse, request: RequestLike): void {
    const fields = {
      requestId: result.body.requestId,
      code: result.body.code,
      status: result.status,
      method: request.method,
      route: pathOf(request.url),
    };
    if (!result.isUnexpected) {
      this.logger.info("request rejected", fields);
      return;
    }
    const cause = exception instanceof Error ? exception : undefined;
    this.logger.error("request failed", {
      ...fields,
          errorName: cause?.name ?? typeof exception,
      sqlState: sqlStateOf(cause),
      stack: framesOf(cause),
    });
  }
}