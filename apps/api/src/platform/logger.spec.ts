import { describe, expect, it } from "vitest";
import type { LogLevel } from "../config/config.js";
import { createLogger } from "./logger.js";

const NOW = new Date("2026-10-27T12:00:00.000Z");

function capture(level: LogLevel = "debug") {
  const lines: string[] = [];
  const logger = createLogger({ level, sink: { write: (line) => void lines.push(line) }, now: () => NOW });
  const parsed = (index: number): Record<string, unknown> => JSON.parse(lines[index] ?? "null");
  return { logger, lines, parsed };
}

describe("createLogger", () => {
  it("writes one JSON line with level, time, message and fields", () => {
    const { logger, lines, parsed } = capture();
    logger.info("request done", { route: "/me", durationMs: 12 });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.endsWith("\n")).toBe(true);
    expect(parsed(0)).toEqual({
      level: "info",
      time: "2026-10-27T12:00:00.000Z",
      msg: "request done",
      route: "/me",
      durationMs: 12,
    });
  });

  it("drops lines below the configured level", () => {
    const { logger, lines } = capture("warn");
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    expect(lines).toHaveLength(2);
  });

  it("adds the bindings of a child logger to every line", () => {
    const { logger, parsed } = capture();
    const child = logger.child({ requestId: "req_1234-abcd" });
    child.info("a");
    child.error("b", { personId: "p1" });
    expect(parsed(0)["requestId"]).toBe("req_1234-abcd");
    expect(parsed(1)).toMatchObject({ requestId: "req_1234-abcd", personId: "p1" });
  });

  it("keeps level and msg when a field tries to overwrite them", () => {
    const { logger, parsed } = capture();
    logger.warn("real", { level: "debug", msg: "fake", time: "never" });
    expect(parsed(0)).toMatchObject({ level: "warn", msg: "real", time: "2026-10-27T12:00:00.000Z" });
  });

  it("contains no password, token or body value in the line when a sign-in is logged", () => {
    const { logger, lines } = capture();
    logger.info("sign-in", {
      route: "/auth/sign-in",
      password: "hunter2-secret",
      headers: { authorization: "Bearer abc.def" },
      body: { email: "a@b.com", password: "hunter2-secret" },
    });
    expect(lines[0]).toContain("/auth/sign-in");
    expect(lines[0]).not.toMatch(/hunter2|Bearer|a@b\.com/);
  });

  it("logs an error object without throwing", () => {
    const { logger, parsed } = capture();
    logger.error("failed", { err: new Error("boom") });
    expect(parsed(0)["err"]).toMatchObject({ name: "Error", message: "boom" });
  });
});