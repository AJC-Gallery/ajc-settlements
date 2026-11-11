import { ERROR_CODES, ERROR_HTTP_STATUS } from "@ajc/contracts";
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { ApiError } from "./api-error.js";
import { toErrorResponse } from "./error-body.js";

const REQUEST_ID = "req_1234-abcd";
const TYPED = new Set<string>([ERROR_CODES.VALIDATION_FAILED, ERROR_CODES.MISSING_PERMISSION]);
const PLAIN_CODES = Object.values(ERROR_CODES).filter((code) => !TYPED.has(code));

describe("toErrorResponse with an ApiError", () => {
  it.each(PLAIN_CODES)("answers %s with the status the contract defines", (code) => {
    const result = toErrorResponse(new ApiError(code, "m"), REQUEST_ID);
    expect(result.status).toBe(ERROR_HTTP_STATUS[code]);
    expect(result.body).toEqual({ code, message: "m", details: null, requestId: REQUEST_ID });
  });

  it("marks SERVICE_UNAVAILABLE as unavailable and not unexpected", () => {
    const result = toErrorResponse(new ApiError("SERVICE_UNAVAILABLE", "m"), REQUEST_ID);
    expect(result).toMatchObject({ status: 503, isUnavailable: true, isUnexpected: false });
  });
  });

  it("keeps the field list when the code is VALIDATION_FAILED", () => {
    const details = { fields: [{ field: "name", messages: ["too short"] }] };
    const result = toErrorResponse(new ApiError("VALIDATION_FAILED", "m", details), REQUEST_ID);
    expect(result).toMatchObject({ status: 400, body: { code: "VALIDATION_FAILED", details } });
  });

  it("keeps the permission name when the code is MISSING_PERMISSION", () => {
    const details = { permission: "assets.close" };
    const result = toErrorResponse(new ApiError("MISSING_PERMISSION", "m", details), REQUEST_ID);
    expect(result).toMatchObject({ status: 403, body: { code: "MISSING_PERMISSION", details } });
  });

  it.each([
    ["VALIDATION_FAILED without fields", new ApiError("VALIDATION_FAILED", "m", null)],
    ["MISSING_PERMISSION without a permission", new ApiError("MISSING_PERMISSION", "m", null)],
    ["MISSING_PERMISSION with fields", new ApiError("MISSING_PERMISSION", "m", { fields: [] })],
    ["NOT_FOUND with details", new ApiError("NOT_FOUND", "m", { permission: "x" })],
  ])("answers INTERNAL_ERROR when the ApiError is %s", (_label, error) => {
    const result = toErrorResponse(error, REQUEST_ID);
    expect(result).toMatchObject({ status: 500, isUnexpected: true, body: { code: "INTERNAL_ERROR" } });
  });

describe("toErrorResponse with a Nest exception", () => {
  it("maps NotFoundException to NOT_FOUND without echoing the path", () => {
    const result = toErrorResponse(new NotFoundException("Cannot GET /secret/path"), REQUEST_ID);
    expect(result).toMatchObject({ status: 404, isUnexpected: false, body: { code: "NOT_FOUND" } });
    expect(JSON.stringify(result.body)).not.toContain("secret/path");
  });

  it("maps a malformed body to VALIDATION_FAILED with a whole-request field", () => {
    const result = toErrorResponse(new BadRequestException("Unexpected token"), REQUEST_ID);
    expect(result.body).toMatchObject({
      code: "VALIDATION_FAILED",
      details: { fields: [{ field: "" }] },
    });
    expect(JSON.stringify(result.body)).not.toContain("Unexpected token");
  });

  it.each([
    [413, "VALIDATION_FAILED", 400],
    [429, "RATE_LIMITED", 429],
    [503, "SERVICE_UNAVAILABLE", 503],
  ])("maps HTTP %i to %s", (httpStatus, code, expectedStatus) => {
    const result = toErrorResponse(new HttpException("x", httpStatus), REQUEST_ID);
    expect(result.status).toBe(expectedStatus);
    expect(result.body.code).toBe(code);
  });

  it("treats a bare 403 as a fault, because the gate throws ApiError", () => {
    const result = toErrorResponse(new ForbiddenException(), REQUEST_ID);
    expect(result).toMatchObject({ status: 500, isUnexpected: true });
  });
});

describe("toErrorResponse with anything else", () => {
  it.each([
    new Error("password=hunter2 connect ECONNREFUSED 10.0.0.5:5432"),
    "boom",
    null,
    undefined,
    { code: "23505" },
  ])("answers INTERNAL_ERROR with fixed text for %j", (thrown) => {
    const result = toErrorResponse(thrown, REQUEST_ID);
    expect(result).toMatchObject({ status: 500, isUnexpected: true });
    expect(result.body).toEqual({
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      details: null,
      requestId: REQUEST_ID,
    });
  });
});