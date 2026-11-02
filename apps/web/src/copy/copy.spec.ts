import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as home from "./home";
import { LOCALES, type Localised } from "./locales";
import * as navigation from "./navigation";
import * as overview from "./overview";
import * as site from "./site";

// Add a new copy file here. The last test fails when one is missing.
const COPY_MODULES: Readonly<Record<string, object>> = { home, navigation, overview, site };

const NOT_COPY_FILES: readonly string[] = ["locales"];

function textsOf(): readonly (readonly [string, Localised])[] {
  return Object.entries(COPY_MODULES).flatMap(([moduleName, exports]) =>
    Object.values(exports as Record<string, Record<string, Localised>>).flatMap((copy) =>
      Object.entries(copy).map(([key, text]) => [`${moduleName}.${key}`, text] as const),
    ),
  );
}

describe("copy", () => {
  it.each(textsOf())("does have a non-empty text in every language when reading %s", (_name, text) => {
    for (const locale of LOCALES) {
      expect(text[locale].trim()).not.toBe("");
    }
  });

  it("does list every copy file in this test when a copy file is added", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    const files = readdirSync(dir)
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".spec.ts"))
      .map((name) => name.replace(/\.ts$/, ""))
      .filter((name) => !NOT_COPY_FILES.includes(name));
    expect([...files].sort()).toEqual(Object.keys(COPY_MODULES).sort());
  });
});