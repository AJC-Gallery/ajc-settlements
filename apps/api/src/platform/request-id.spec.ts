import { describe, expect, it } from "vitest";
import { resolveRequestId } from "../common/request-id.js";
import { generateRequestId } from "./request-id.js";

describe("generateRequestId", () => {
  it("makes an id the resolver accepts unchanged", () => {
    const id = generateRequestId();
    expect(resolveRequestId(id, () => "fallback")).toBe(id);
  });

  it("makes a different id on each call", () => {
    expect(generateRequestId()).not.toBe(generateRequestId());
  });
});