import { describe, expect, it } from "vitest";
import { liveResponse } from "./health.js";

describe("liveResponse", () => {
  it("serialises compactly with status first, because the smoke test matches the commit text", () => {
    expect(JSON.stringify(liveResponse("abc123"))).toBe('{"status":"ok","commit":"abc123"}');
  });

  it("reports unknown when the commit is unknown", () => {
    expect(liveResponse("unknown")).toEqual({ status: "ok", commit: "unknown" });
  });
});