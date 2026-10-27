import { describe, expect, it, vi } from "vitest";
import { resolveRequestId } from "./request-id.js";

describe("resolveRequestId", () => {
  it("keeps the incoming id when it is well-formed", () => {
    const generate = vi.fn(() => "generated-id");
    expect(resolveRequestId("req_1234-abcd", generate)).toBe("req_1234-abcd");
    expect(generate).not.toHaveBeenCalled();
  });

  it.each([
    ["too short", "abc"],
    ["too long", "a".repeat(65)],
    ["has a space", "abc def ghi"],
    ["has a newline and JSON", 'abcdefgh\n{"level":"error"}'],
    ["is empty", ""],
  ])("generates a new id when the incoming one %s", (_label, incoming) => {
    expect(resolveRequestId(incoming, () => "generated-id")).toBe("generated-id");
  });

  it("generates a new id when the header is missing or repeated", () => {
    expect(resolveRequestId(undefined, () => "generated-id")).toBe("generated-id");
    expect(resolveRequestId(["abcdefgh", "ijklmnop"], () => "generated-id")).toBe("generated-id");
  });
});