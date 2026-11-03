import { describe, expect, it } from "vitest";
import { ApiError, type ApiFailure } from "./api-error";
import { createQueryClient, MAX_QUERY_RETRIES, shouldRetryQuery } from "./query-client";

const FAILURES: Readonly<Record<string, ApiFailure>> = {
  network: { kind: "network" },
  server: { kind: "server", requestId: "r", status: 503, code: "SERVICE_UNAVAILABLE" },
  notFound: { kind: "notFound", requestId: "r" },
  forbidden: { kind: "forbidden", requestId: "r", permission: "assets.write" },
  unauthenticated: { kind: "unauthenticated", requestId: "r" },
};

describe("shouldRetryQuery", () => {
  it.each(["network", "server"])("does retry a read when the failure is %s", (name) => {
    expect(shouldRetryQuery(0, new ApiError(FAILURES[name] as ApiFailure))).toBe(true);
  });

  it.each(["notFound", "forbidden", "unauthenticated"])("does not retry a read when the failure is %s", (name) => {
    expect(shouldRetryQuery(0, new ApiError(FAILURES[name] as ApiFailure))).toBe(false);
  });

  it("does stop retrying when the retry limit is reached", () => {
    expect(shouldRetryQuery(MAX_QUERY_RETRIES, new ApiError({ kind: "network" }))).toBe(false);
  });

  it("does not retry when the error is not an ApiError", () => {
    expect(shouldRetryQuery(0, new Error("boom"))).toBe(false);
  });
});

describe("createQueryClient", () => {
  it("does not retry writes when a mutation fails", () => {
    expect(createQueryClient().getDefaultOptions().mutations?.retry).toBe(false);
  });
});
