import {
  IDEMPOTENCY_KEY_MAX_LENGTH,
  IDEMPOTENCY_KEY_MIN_LENGTH,
} from "@ajc/contracts";
import { describe, expect, it } from "vitest";
import {
  createIdempotencyAttempt,
  fingerprintOf,
  generateIdempotencyKey,
  isValidIdempotencyKey,
} from "./idempotency";

function counter(): () => string {
  let n = 0;
  return () => `key-${String(++n).padStart(IDEMPOTENCY_KEY_MIN_LENGTH, "0")}`;
}

describe("createIdempotencyAttempt", () => {
  it("does return the same key when the same input is submitted again", () => {
    const attempt = createIdempotencyAttempt(counter());
    expect(attempt.keyFor({ name: "Villa" })).toBe(attempt.keyFor({ name: "Villa" }));
  });

  it("does return a new key when the input was edited", () => {
    const attempt = createIdempotencyAttempt(counter());
    const first = attempt.keyFor({ name: "Villa" });
    expect(attempt.keyFor({ name: "Villa 2" })).not.toBe(first);
  });

  it("does return a new key when the input is edited back to an earlier value", () => {
    const attempt = createIdempotencyAttempt(counter());
    const first = attempt.keyFor({ name: "Villa" });
    attempt.keyFor({ name: "Villa 2" });
    expect(attempt.keyFor({ name: "Villa" })).not.toBe(first);
  });

  it("does return a new key when the last submit succeeded", () => {
    const attempt = createIdempotencyAttempt(counter());
    const first = attempt.keyFor({ name: "Villa" });
    attempt.succeeded();
    expect(attempt.keyFor({ name: "Villa" })).not.toBe(first);
  });

  it("does return the same key when only the order of an object's fields differs", () => {
    const attempt = createIdempotencyAttempt(counter());
    expect(attempt.keyFor({ a: 1, b: { c: 2, d: 3 } })).toBe(attempt.keyFor({ b: { d: 3, c: 2 }, a: 1 }));
  });

  it("does throw when the generator produces a key the contract rejects", () => {
    const attempt = createIdempotencyAttempt(() => "short");
    expect(() => attempt.keyFor({})).toThrow("contract rejects");
  });

  it("does produce a valid key when the default generator is used", () => {
    const key = createIdempotencyAttempt().keyFor({});
    expect(isValidIdempotencyKey(key)).toBe(true);
  });
});

describe("isValidIdempotencyKey", () => {
  it("does accept a UUID", () => {
    expect(isValidIdempotencyKey(generateIdempotencyKey())).toBe(true);
  });

  it("does reject a key one character shorter than the minimum", () => {
    expect(isValidIdempotencyKey("a".repeat(IDEMPOTENCY_KEY_MIN_LENGTH - 1))).toBe(false);
  });

  it("does reject a key one character longer than the maximum", () => {
    expect(isValidIdempotencyKey("a".repeat(IDEMPOTENCY_KEY_MAX_LENGTH + 1))).toBe(false);
  });

  it("does accept keys exactly at the minimum and the maximum length", () => {
    expect(isValidIdempotencyKey("a".repeat(IDEMPOTENCY_KEY_MIN_LENGTH))).toBe(true);
    expect(isValidIdempotencyKey("a".repeat(IDEMPOTENCY_KEY_MAX_LENGTH))).toBe(true);
  });

  it("does reject a key with a space or a slash", () => {
    expect(isValidIdempotencyKey("a".repeat(IDEMPOTENCY_KEY_MIN_LENGTH) + " ")).toBe(false);
    expect(isValidIdempotencyKey("a".repeat(IDEMPOTENCY_KEY_MIN_LENGTH) + "/")).toBe(false);
  });
});

describe("fingerprintOf", () => {
  it("does tell two dates apart when they differ", () => {
    expect(fingerprintOf({ d: new Date("2026-01-01") })).not.toBe(fingerprintOf({ d: new Date("2026-01-02") }));
  });

  it("does tell arrays apart when their order differs", () => {
    expect(fingerprintOf([1, 2])).not.toBe(fingerprintOf([2, 1]));
  });

  it("does return text when the input is undefined", () => {
    expect(fingerprintOf(undefined)).toBe("undefined");
  });
});
