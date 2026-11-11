import type { ArgumentsHost } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { ApiError } from "../common/api-error.js";
import {
  DEFAULT_RETRY_AFTER_SECONDS,
  ErrorFilter,
  type RequestLike,
  type ResponseLike,
} from "./error.filter.js";
import { createLogger } from "../platform/logger.js";

const NOW = new Date("2026-10-27T12:00:00.000Z");

class FakeResponse implements ResponseLike {
  statusCode = 0;
  payload: unknown;
  headersSent = false;
  private readonly headers = new Map<string, string>();

  status(code: number): this {
    this.statusCode = code;
    return this;
  }
  json(body: unknown): this {
    this.payload = body;
    return this;
  }
  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }
  getHeader(name: string): string | undefined {
    return this.headers.get(name.toLowerCase());
  }
}

function setup(request: RequestLike) {
  const lines: string[] = [];
  const logger = createLogger({ level: "debug", sink: { write: (line) => void lines.push(line) }, now: () => NOW });
  const filter = new ErrorFilter(logger, () => "generated-id-1");
  const response = new FakeResponse();
  const host = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ArgumentsHost;
  const logged = (index = 0): Record<string, unknown> => JSON.parse(lines[index] ?? "null");
  return { filter, response, host, lines, logged };
}

describe("ErrorFilter", () => {
  it("writes the status, the envelope and the request id header", () => {
    const { filter, response, host } = setup({ method: "GET", requestId: "req_1234-abcd" });
    filter.catch(new ApiError("NOT_FOUND", "No such record"), host);
    expect(response.statusCode).toBe(404);
    expect(response.payload).toEqual({
      code: "NOT_FOUND",
      message: "No such record",
      details: null,
      requestId: "req_1234-abcd",
    });
    expect(response.getHeader("x-request-id")).toBe("req_1234-abcd");
  });

  it("logs the SQLSTATE of a 503 cause at warn and none of its message", () => {
    const { filter, host, lines, logged } = setup({
      method: "GET",
      route: { path: "/api/v1/health/ready" },
      requestId: "req_1234-abcd",
    });
    const driver = Object.assign(new Error("password=hunter2 connect failed"), { code: "08006" });
    filter.catch(new ApiError("SERVICE_UNAVAILABLE", "Database unavailable", null, driver), host);
    expect(logged()).toMatchObject({ level: "warn", sqlState: "08006", status: 503 });
    expect(lines[0]).not.toContain("hunter2");
    expect(logged()["stack"]).toBeUndefined();
  });

  it("makes a request id when the request has none", () => {
    const { filter, response, host } = setup({ method: "GET" });
    filter.catch(new ApiError("NOT_FOUND", "m"), host);
    expect(response.payload).toMatchObject({ requestId: "generated-id-1" });
  });

  it("logs a rejected request at info level without a stack", () => {
    const { filter, host, lines, logged } = setup({ method: "POST", route: { path: "/assets" }, requestId: "req_1234-abcd" }); 
	filter.catch(new ApiError("CONFLICT", "m"), host);
    expect(lines).toHaveLength(1);
    expect(logged()).toMatchObject({ level: "info", code: "CONFLICT", status: 409, method: "POST", route: "/assets" });
    expect(logged()["stack"]).toBeUndefined();
  });

  it("hides a server fault from the client and logs it with its stack", () => {
    const { filter, response, host, logged } = setup({ method: "GET", requestId: "req_1234-abcd" });
    filter.catch(new Error("connect ECONNREFUSED 10.0.0.5:5432"), host);
    expect(response.statusCode).toBe(500);
    expect(JSON.stringify(response.payload)).not.toContain("ECONNREFUSED");
    expect(logged()).toMatchObject({ level: "error", code: "INTERNAL_ERROR", requestId: "req_1234-abcd" });
       expect(logged()["errorMessage"]).toBeUndefined();
    expect(logged()["stack"]).toBeDefined();
  });

  it("leaves no message text in the log when a driver error carries a value", () => {
    const { filter, host, lines, logged } = setup({ method: "GET", requestId: "req_1234-abcd" });
    const driverError = Object.assign(new Error("password=hunter2 failed\nsecond line hunter2"), { code: "23505" });
    filter.catch(driverError, host);
    expect(lines[0]).not.toContain("hunter2");
    expect(logged()).toMatchObject({ errorName: "Error", sqlState: "23505", code: "INTERNAL_ERROR" });
  });

  it("omits sqlState when the code is not a SQLSTATE", () => {
    const { filter, host, logged } = setup({ method: "GET" });
    filter.catch(Object.assign(new Error("x"), { code: "ECONNREFUSED" }), host);
    expect(logged()["sqlState"]).toBeUndefined();
  });

  it("logs the matched pattern and no query string or path value", () => {
    const request = {
      method: "POST",
      route: { path: "/api/v1/auth/recovery/:code" },
      url: "/api/v1/auth/recovery/sentinel-8841?token=sentinel-8841",
      originalUrl: "/api/v1/auth/recovery/sentinel-8841?token=sentinel-8841",
    } as RequestLike;
    const { filter, host, lines, logged } = setup(request);
    filter.catch(new ApiError("VALIDATION_FAILED", "m", { fields: [] }), host);
    expect(logged()["route"]).toBe("/api/v1/auth/recovery/:code");
    expect(lines[0]).not.toContain("sentinel-8841");
  });

  it("logs unmatched when no route matched", () => {
    const { filter, host, logged } = setup({ method: "GET" });
    filter.catch(new ApiError("NOT_FOUND", "m"), host);
    expect(logged()["route"]).toBe("unmatched");
  });

  it("sets a default Retry-After when a 429 has none", () => {
    const { filter, response, host } = setup({ method: "GET" });
    filter.catch(new ApiError("RATE_LIMITED", "m"), host);
    expect(response.statusCode).toBe(429);
    expect(response.getHeader("retry-after")).toBe(String(DEFAULT_RETRY_AFTER_SECONDS));
  });

  it("keeps the Retry-After the rate limiter already set", () => {
    const { filter, response, host } = setup({ method: "GET" });
    response.setHeader("Retry-After", "7");
    filter.catch(new ApiError("RATE_LIMITED", "m"), host);
    expect(response.getHeader("retry-after")).toBe("7");
  });

  it("logs but does not write when the headers were already sent", () => {
    const { filter, response, host, lines } = setup({ method: "GET" });
    response.headersSent = true;
    filter.catch(new Error("late"), host);
    expect(response.statusCode).toBe(0);
    expect(response.payload).toBeUndefined();
    expect(lines).toHaveLength(1);
  });
});