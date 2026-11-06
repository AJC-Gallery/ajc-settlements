import { describe, expect, it } from "vitest";
import { corsOptions } from "./http-options.js";

describe("corsOptions", () => {
  it("allows only the configured origins and never a wildcard", () => {
    const options = corsOptions(["https://a.example.com", "http://localhost:3000"]);
    expect(options.origin).toEqual(["https://a.example.com", "http://localhost:3000"]);
    expect(options.origin).not.toContain("*");
    expect(options.credentials).toBe(true);
  });

  it("allows the idempotency and request id headers and exposes Retry-After", () => {
    const options = corsOptions(["https://a.example.com"]);
    expect(options.allowedHeaders).toContain("Idempotency-Key");
    expect(options.allowedHeaders).toContain("x-request-id");
    expect(options.exposedHeaders).toEqual(expect.arrayContaining(["x-request-id", "Retry-After"]));
  });
});