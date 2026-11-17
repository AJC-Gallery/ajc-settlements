import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger, stdoutSink } from "./logger.js";

describe("stdoutSink", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes the line to stdout exactly as given and nothing to stderr", () => {
    const out = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const err = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    stdoutSink.write("one line\n");
    expect(out).toHaveBeenCalledTimes(1);
    expect(out).toHaveBeenCalledWith("one line\n");
    expect(err).not.toHaveBeenCalled();
  });

  it("carries a logger line to stdout as one JSON line", () => {
    const out = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const now = new Date("2026-11-17T12:00:00.000Z");
    createLogger({ level: "info", sink: stdoutSink, now: () => now }).info("hello", { requestId: "req_1234-abcd" });
    expect(out).toHaveBeenCalledTimes(1);
    const text = String(out.mock.calls[0]?.[0]);
    expect(text.endsWith("\n")).toBe(true);
    expect(JSON.parse(text)).toEqual({
      requestId: "req_1234-abcd",
      level: "info",
      time: "2026-11-17T12:00:00.000Z",
      msg: "hello",
    });
  });
});