import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const APP_DIR = fileURLToPath(new URL(".", import.meta.url));

function appPaths(): readonly string[] {
  return readdirSync(APP_DIR, { recursive: true, encoding: "utf8" });
}

function pagePaths(): readonly string[] {
  return appPaths().filter((path) => path.endsWith("page.tsx"));
}

describe("route groups", () => {
  it("does find the public home page under the language segment in the public group", () => {
    expect(pagePaths()).toContain("(public)/[locale]/page.tsx");
  });

  it("does not find a page or a layout at the root of the app folder", () => {
    expect(pagePaths()).not.toContain("page.tsx");
    expect(appPaths()).not.toContain("layout.tsx");
  });

  it("does give each route group its own layout so each sets its own html language", () => {
    expect(appPaths()).toContain("(public)/[locale]/layout.tsx");
    expect(appPaths()).toContain("(app)/layout.tsx");
  });

  it("does find at least one world page and keep every world page in the app group", () => {
    const worldPages = pagePaths().filter((path) => path.includes("worlds/"));
    expect(worldPages.length).toBeGreaterThan(0);
    expect(worldPages.filter((path) => !path.startsWith("(app)/"))).toEqual([]);
  });

  it("does keep every public page under the language segment", () => {
    const publicPages = pagePaths().filter((path) => path.startsWith("(public)/"));
    expect(publicPages.length).toBeGreaterThan(0);
    expect(publicPages.filter((path) => !path.startsWith("(public)/[locale]/"))).toEqual([]);
  });
});
