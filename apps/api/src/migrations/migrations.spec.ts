import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MIGRATIONS } from "./index.js";

const DIR = fileURLToPath(new URL(".", import.meta.url));
const FILES = readdirSync(DIR).filter((file) => /^\d{13}-[a-z0-9-]+\.ts$/.test(file));

interface Loaded {
  name: string;
  down: unknown;
}

describe("migrations (P-11)", () => {
  it("registers every migration file", () => {
    expect(FILES.length).toBeGreaterThan(0);
    expect(MIGRATIONS).toHaveLength(FILES.length);
  });

  it.each(FILES)("%s matches its class timestamp and has a why-header and a down()", async (file) => {
    const stamp = file.slice(0, 13);
    const exported = Object.values((await import(`./${file}`)) as Record<string, new () => Loaded>);
    expect(exported).toHaveLength(1);
    const [Migration] = exported;
    if (Migration === undefined) throw new Error("no class");
    expect(Migration.name.endsWith(stamp)).toBe(true);
    const instance = new Migration();
    expect(instance.name).toBe(Migration.name);
    expect(typeof instance.down).toBe("function");
    expect(MIGRATIONS).toContain(Migration);
    expect(readFileSync(`${DIR}${file}`, "utf8")).toContain("Why:");
  });
});