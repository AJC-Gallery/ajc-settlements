import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LOCALES } from "../../copy/locales";
import { publicNavigation, worldNavigation, type NavigationItem } from "./navigation";

const SRC_DIR = fileURLToPath(new URL("../../", import.meta.url));
const SAMPLE_WORLD_ID = "sample-world";

function listFiles(dir: string): readonly string[] {
  return readdirSync(`${SRC_DIR}${dir}`, { recursive: true, encoding: "utf8" }).map((name) => `${dir}/${name}`);
}

function existingRoutes(): readonly string[] {
  return listFiles("app")
    .filter((path) => path.endsWith("/page.tsx"))
    .map((path) => {
      const segments = path.replace(/^app\//, "").replace(/\/?page\.tsx$/, "").split("/");
      return `/${segments.filter((s) => s !== "" && !/^\(.*\)$/.test(s)).join("/")}`;
    });
}

function routeOf(item: NavigationItem): string {
  const language = new RegExp(`^/(?:${LOCALES.join("|")})(?=/|$)`);
  return item.href.replace(language, "/[locale]").replace(`/${SAMPLE_WORLD_ID}`, "/[worldId]");
}

const PUBLIC_ITEMS: readonly NavigationItem[] = LOCALES.flatMap((locale) => publicNavigation(locale));
const ALL_ITEMS: readonly NavigationItem[] = [...PUBLIC_ITEMS, ...worldNavigation(SAMPLE_WORLD_ID)];

describe("navigation configuration", () => {
  it("does give every item an id, both languages and an internal link", () => {
    for (const item of ALL_ITEMS) {
      expect(item.id).not.toBe("");
      expect(item.href.startsWith("/")).toBe(true);
      for (const locale of LOCALES) expect(item.label[locale].trim()).not.toBe("");
    }
  });

  it("does not repeat an id within one area", () => {
    for (const items of [publicNavigation("en"), worldNavigation(SAMPLE_WORLD_ID)]) {
      expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    }
  });

  it.each(LOCALES)("does start every public link with the language prefix when the language is %s", (locale) => {
    const hrefs = publicNavigation(locale).map((item) => item.href);
    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs.every((href) => href === `/${locale}` || href.startsWith(`/${locale}/`))).toBe(true);
  });

  it("does not put a language prefix on a signed-in link", () => {
    for (const item of worldNavigation(SAMPLE_WORLD_ID)) {
      expect(LOCALES.some((locale) => item.href === `/${locale}` || item.href.startsWith(`/${locale}/`))).toBe(false);
    }
  });

  it("does keep the world id exactly as given when it is already a URL segment", () => {
    const hrefs = worldNavigation("a%20b%2Fc").map((item) => item.href);
    expect(hrefs.every((href) => href.startsWith("/worlds/a%20b%2Fc"))).toBe(true);
    expect(hrefs.some((href) => href.includes(":worldId"))).toBe(false);
  });

  it("does keep a dollar sign in the world id when the link is built", () => {
    expect(worldNavigation("a$&b").map((item) => item.href)).toEqual(["/worlds/a$&b"]);
  });

  it("does return the same items in the same order when asked again for one area", () => {
    expect(worldNavigation(SAMPLE_WORLD_ID)).toEqual(worldNavigation(SAMPLE_WORLD_ID));
    expect(publicNavigation("fr")).toEqual(publicNavigation("fr"));
  });

  it("does point every item at a page that exists in the app folder", () => {
    const routes = existingRoutes();
    for (const item of ALL_ITEMS) expect(routes).toContain(routeOf(item));
  });

  it("does not find a hard-coded internal link when the app and feature files are scanned", () => {
    const literalLink = /href=(?:"\/|'\/|\{\s*["'`]\/)/;
    const files = [...listFiles("app"), ...listFiles("features"), ...listFiles("components")].filter((p) => p.endsWith(".tsx"));
    const offenders = files.filter((path) => literalLink.test(readFileSync(`${SRC_DIR}${path}`, "utf8")));
    expect(offenders).toEqual([]);
  });
});
