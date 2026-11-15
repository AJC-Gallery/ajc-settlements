import { describe, expect, it } from "vitest";
import { createLogger } from "./logger.js";
import { createProxyProbe } from "./proxy-probe.middleware.js";
import { ipClassOf, xffCountOf } from "./proxy-probe.js";

describe("ipClassOf", () => {
  it.each([
    ["127.0.0.1", "loopback"], ["::1", "loopback"], ["::ffff:127.0.0.1", "loopback"],
    ["10.1.2.3", "private"], ["172.16.0.1", "private"], ["192.168.1.1", "private"],
    ["fd00::1", "private"], ["8.8.8.8", "public"], ["172.32.0.1", "public"],
    ["2001:db8::1", "public"], [undefined, "unknown"], ["", "unknown"], ["junk", "unknown"],
  ])("classes %s as %s", (ip, expected) => {
    expect(ipClassOf(ip)).toBe(expected);
  });
});

describe("xffCountOf", () => {
  it.each([[undefined, 0], ["", 0], ["1.1.1.1", 1], ["1.1.1.1, 2.2.2.2", 2], [["1.1.1.1", "2.2.2.2, 3.3.3.3"], 3]])(
    "counts %j as %i", (header, expected) => {
      expect(xffCountOf(header)).toBe(expected);
    },
  );
});

describe("createProxyProbe", () => {
  it("logs counts and a class and never an address", () => {
    const lines: string[] = [];
    const logger = createLogger({ level: "debug", sink: { write: (l) => void lines.push(l) }, now: () => new Date(0) });
    let called = 0;
    createProxyProbe(logger)({ headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.2" }, ip: "10.0.0.2", requestId: "req_1234-abcd" }, {}, () => void (called += 1));
    expect(called).toBe(1);
    expect(JSON.parse(lines[0] ?? "null")).toMatchObject({ level: "debug", xffCount: 2, ipClass: "private" });
    expect(lines[0]).not.toMatch(/203\.0\.113\.9|10\.0\.0\.2/);
  });
});