import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { GLOBAL_THROTTLERS, RATE_LIMIT_WINDOW_MS, strictRateLimit } from "./rate-limit.js";

class Sample {
  method(): void {}
}

function metadataValues(target: object): unknown[] {
  return Reflect.getMetadataKeys(target).map((key) => Reflect.getMetadata(key, target));
}

describe("rate limit settings", () => {
  it("allows 100 requests per minute globally", () => {
    expect(GLOBAL_THROTTLERS).toEqual([{ name: "default", ttl: 60_000, limit: 100 }]);
  });

  it("stores the stricter limit and the window on the route handler", () => {
    const descriptor = Object.getOwnPropertyDescriptor(Sample.prototype, "method");
    if (descriptor === undefined) throw new Error("missing descriptor");
    strictRateLimit(5)(Sample.prototype, "method", descriptor);
    const values = metadataValues(descriptor.value as object);
    expect(values).toContain(5);
    expect(values).toContain(RATE_LIMIT_WINDOW_MS);
  });
});