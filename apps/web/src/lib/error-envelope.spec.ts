import { ERROR_CODES, ERROR_HTTP_STATUS, type ErrorCode } from "@ajc/contracts";
import { describe, expect, it } from "vitest";
import { failureFromResponse, parseRetryAfter, readErrorBody } from "./error-envelope";

function envelope(code: ErrorCode, details: unknown = null, requestId = "req-1") {
  return { code, message: "English text for logs", details, requestId };
}

function respond(code: ErrorCode, details: unknown = null, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(envelope(code, details)), { status: ERROR_HTTP_STATUS[code], headers });
}

describe("failureFromResponse, per the error table", () => {
  it("does give the field errors with their constraints when the code is VALIDATION_FAILED", async () => {
    const fields = [{ field: "email", messages: ["email must be an email"], constraints: [{ name: "isEmail" }] }];
    const failure = await failureFromResponse(respond(ERROR_CODES.VALIDATION_FAILED, { fields }));
    expect(failure).toEqual({ kind: "validation", requestId: "req-1", fields });
  });

  it("does give an unauthenticated failure when the code is UNAUTHENTICATED", async () => {
    expect(await failureFromResponse(respond(ERROR_CODES.UNAUTHENTICATED))).toEqual({ kind: "unauthenticated", requestId: "req-1" });
  });

  it("does name the missing permission when the code is MISSING_PERMISSION", async () => {
    const failure = await failureFromResponse(respond(ERROR_CODES.MISSING_PERMISSION, { permission: "assets.close" }));
    expect(failure).toEqual({ kind: "forbidden", requestId: "req-1", permission: "assets.close" });
  });

  it("does give the same failure for a missing record and a record the person may not see", async () => {
    const missing = await failureFromResponse(respond(ERROR_CODES.NOT_FOUND));
    const hidden = await failureFromResponse(
      new Response(JSON.stringify({ ...envelope(ERROR_CODES.NOT_FOUND), message: "a different message" }), { status: 404 }),
    );
    expect(hidden).toEqual(missing);
  });

  it.each([
    ERROR_CODES.CONFLICT,
    ERROR_CODES.ASSET_CLOSED,
    ERROR_CODES.DECLARED_COUNT_FLOOR,
    ERROR_CODES.STAR_CAP_REACHED,
    ERROR_CODES.IDEMPOTENCY_KEY_REUSED,
    ERROR_CODES.CONFIRMATION_REQUIRED,
  ])("does keep the code when a 409 carries %s", async (code) => {
    expect(await failureFromResponse(respond(code))).toEqual({ kind: "conflict", requestId: "req-1", code });
  });

  it("does read the wait in seconds when a 429 sends Retry-After", async () => {
    const failure = await failureFromResponse(respond(ERROR_CODES.RATE_LIMITED, null, { "retry-after": "30" }));
    expect(failure).toEqual({ kind: "rateLimited", requestId: "req-1", retryAfterSeconds: 30 });
  });

  it.each([ERROR_CODES.INTERNAL_ERROR, ERROR_CODES.SERVICE_UNAVAILABLE])("does give a server failure when the code is %s", async (code) => {
    expect(await failureFromResponse(respond(code))).toEqual({ kind: "server", requestId: "req-1", status: ERROR_HTTP_STATUS[code], code });
  });
});

describe("failureFromResponse, bodies that are not a complete envelope", () => {
  it("does give an unreadable failure when the body has no request id", async () => {
    const response = new Response(JSON.stringify({ code: "NOT_FOUND" }), { status: 404 });
    expect(await failureFromResponse(response)).toEqual({ kind: "unreadable", status: 404 });
  });

  it("does give a server failure when a 502 has an HTML body", async () => {
    const failure = await failureFromResponse(new Response("<html>Bad gateway</html>", { status: 502 }));
    expect(failure).toEqual({ kind: "server", requestId: null, status: 502, code: null });
  });

  it("does give an unreadable failure when the code disagrees with the status", async () => {
    const response = new Response(JSON.stringify(envelope(ERROR_CODES.NOT_FOUND)), { status: 409 });
    expect(await failureFromResponse(response)).toEqual({ kind: "unreadable", status: 409 });
  });

  it("does give an unreadable failure when the code is one this build does not know", async () => {
    const response = new Response(JSON.stringify({ ...envelope(ERROR_CODES.NOT_FOUND), code: "SOMETHING_NEW" }), { status: 404 });
    expect(await failureFromResponse(response)).toEqual({ kind: "unreadable", status: 404 });
  });

  it("does give an unreadable failure when the validation details are malformed", async () => {
    expect(await failureFromResponse(respond(ERROR_CODES.VALIDATION_FAILED, { fields: [{ field: 3 }] }))).toEqual({
      kind: "unreadable",
      status: 400,
    });
  });

  it("does keep a constraint name this build does not know when a field fails", async () => {
    const fields = [{ field: "x", messages: [], constraints: [{ name: "isPhoneNumber" }] }];
    const failure = await failureFromResponse(respond(ERROR_CODES.VALIDATION_FAILED, { fields }));
    expect(failure).toEqual({ kind: "validation", requestId: "req-1", fields });
  });
});

describe("readErrorBody", () => {
  it("does return null when the body is not an object", () => {
    expect(readErrorBody(404, "nope")).toBeNull();
    expect(readErrorBody(404, null)).toBeNull();
    expect(readErrorBody(404, [])).toBeNull();
  });

  it("does give details null when a plain code sends something else", () => {
    expect(readErrorBody(404, envelope(ERROR_CODES.NOT_FOUND, { extra: 1 }))?.details).toBeNull();
  });
});

describe("parseRetryAfter", () => {
  it.each([["0", 0], ["120", 120], [" 7 ", 7]])("does read %s seconds when the header is whole seconds", (header, seconds) => {
    expect(parseRetryAfter(header)).toBe(seconds);
  });

  it.each([null, "", "soon", "-3", "1.5", "Wed, 21 Oct 2026 07:28:00 GMT"])("does return null when the header is %s", (header) => {
    expect(parseRetryAfter(header)).toBeNull();
  });
});
