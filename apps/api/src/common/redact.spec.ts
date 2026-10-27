import { describe, expect, it } from "vitest";
import { REDACTED, redact } from "./redact.js";

describe("redact", () => {
  it("keeps non-sensitive values when the keys are ordinary", () => {
    const fields = { route: "/me", personId: "p1", durationMs: 12, requestId: "abc12345" };
    expect(redact(fields)).toEqual(fields);
  });

  it.each([
    "password",
    "Password",
    "accessToken",
    "passwordHash",
    "set-cookie",
    "DATABASE_URL",
    "authorization",
    "apiKey",
    "api_key",
    "clientSecret",
    "body",
    "signature",
    "connectionString",
  ])("replaces the value when the key is %s", (key) => {
    expect(redact({ [key]: "leak-me" })).toEqual({ [key]: REDACTED });
  });

  it("redacts sensitive keys inside nested objects and arrays", () => {
    const result = redact({ req: { headers: { authorization: "Bearer abc" } }, list: [{ token: "t" }] });
    expect(JSON.stringify(result)).not.toMatch(/Bearer|"t"/);
  });

  it("truncates when the value is nested deeper than the limit", () => {
    let value: unknown = "leaf";
    for (let i = 0; i < 10; i += 1) value = { child: value };
    const text = JSON.stringify(redact(value));
    expect(text).toContain("[TRUNCATED]");
    expect(text).not.toContain("leaf");
  });

  it("does not throw when the value refers to itself", () => {
    const loop: Record<string, unknown> = { name: "a" };
    loop["self"] = loop;
    expect(() => JSON.stringify(redact(loop))).not.toThrow();
  });

  it("converts bigint, date and error to JSON-safe values", () => {
    expect(redact(10n)).toBe("10");
    expect(redact(new Date("2026-01-01T00:00:00.000Z"))).toBe("2026-01-01T00:00:00.000Z");
    expect(redact(new Error("boom"))).toMatchObject({ name: "Error", message: "boom" });
  });

  it("drops undefined and function values when they sit in an object", () => {
    expect(JSON.stringify(redact({ a: undefined, b: 1, c: () => 1 }))).toBe('{"b":1}');
  });
});