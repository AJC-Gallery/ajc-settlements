import { describe, expect, it } from "vitest";
import { routeLabelOf, RouteRequestLike } from "./route-label.js";

describe("routeLabelOf", () => {
  it("returns the matched pattern, not the values in it", () => {
    expect(routeLabelOf({ route: { path: "/api/v1/assets/:id" } })).toBe("/api/v1/assets/:id");
  });

  it.each([
    ["no route", {}],
    ["an empty path", { route: { path: "" } }],
    ["a non-string path", { route: { path: /x/ } }],
	    ["a catch-all wildcard", { route: { path: "*path" } }],
    ["no path", { route: {} }],
  ])("answers unmatched when there is %s", (_label, request) => {
    expect(routeLabelOf(request)).toBe("unmatched");
  });

  it("ignores url and originalUrl even when they carry a secret", () => {
    const request = { url: "/a/sentinel-8841?token=sentinel-8841", originalUrl: "/a/sentinel-8841" };
    expect(routeLabelOf(request as RouteRequestLike)).toBe("unmatched");
  });
});