import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const APP_DIR = fileURLToPath(new URL(".", import.meta.url));

function pagePaths(): readonly string[] {
  return readdirSync(APP_DIR, { recursive: true, encoding: "utf8" }).filter((path) => path.endsWith("page.tsx"));
}

describe("route groups", () => {
  it("does find the home page in the public group", () => {
    expect(pagePaths()).toContain("(public)/page.tsx");
  });

  it("does find at least one world page and keep every world page in the app group", () => {
    const worldPages = pagePaths().filter((path) => path.includes("worlds/"));
    expect(worldPages.length).toBeGreaterThan(0);
    expect(worldPages.filter((path) => !path.startsWith("(app)/"))).toEqual([]);
  });
});