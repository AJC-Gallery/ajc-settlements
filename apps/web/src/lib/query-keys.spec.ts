import { describe, expect, it } from "vitest";
import { createWorldQueryKeys } from "./query-keys";

const assetKeys = createWorldQueryKeys("assets");

describe("createWorldQueryKeys", () => {
  it("does give different keys when the world differs", () => {
    expect(assetKeys.list("world-a", { page: 1 })).not.toEqual(assetKeys.list("world-b", { page: 1 }));
    expect(assetKeys.detail("world-a", "x")).not.toEqual(assetKeys.detail("world-b", "x"));
  });

  it("does start every list and detail key with the key of its feature and world", () => {
    const prefix = assetKeys.all("world-a");
    expect(assetKeys.lists("world-a").slice(0, prefix.length)).toEqual(prefix);
    expect(assetKeys.list("world-a", { page: 2 }).slice(0, prefix.length)).toEqual(prefix);
    expect(assetKeys.detail("world-a", "x").slice(0, prefix.length)).toEqual(prefix);
  });

  it("does give different keys when the filters differ", () => {
    expect(assetKeys.list("w", { page: 1 })).not.toEqual(assetKeys.list("w", { page: 2 }));
  });

  it("does give different keys when the feature differs", () => {
    expect(createWorldQueryKeys("stars").all("w")).not.toEqual(assetKeys.all("w"));
  });
});
