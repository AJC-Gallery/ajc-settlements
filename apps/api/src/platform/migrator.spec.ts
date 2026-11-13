import { describe, expect, it } from "vitest";
import { MIGRATIONS } from "../migrations/index.js";
import {
  MigratorConfigError,
  createMigratorDataSource,
  parseMigrateArgs,
  readMigratorUrl,
} from "./migrator.js";

const GOOD = "postgres://ajc_migrator:s3cret-pw@db.example.com:5432/ajc";

describe("readMigratorUrl", () => {
  it("accepts a postgres URL that connects as ajc_migrator", () => {
    expect(readMigratorUrl({ MIGRATOR_DATABASE_URL: GOOD })).toBe(GOOD);
  });

  it.each([
    ["missing", undefined],
    ["blank", "  "],
    ["not a URL", "not a url"],
    ["another scheme", "mysql://ajc_migrator:pw@h/d"],
    ["a superuser", "postgres://postgres:s3cret-pw@h:5432/d"],
    ["the application role", "postgres://ajc_app:s3cret-pw@h:5432/d"],
  ])("refuses a value that is %s and never echoes it", (_label, value) => {
    const attempt = () => readMigratorUrl({ MIGRATOR_DATABASE_URL: value });
    expect(attempt).toThrow(MigratorConfigError);
    try {
      attempt();
    } catch (error) {
      expect((error as Error).message).not.toContain("s3cret-pw");
    }
  });
});

describe("parseMigrateArgs", () => {
  it.each([
    [["up"], { kind: "up" }],
    [["down"], { kind: "down", all: false }],
    [["down", "--all"], { kind: "down", all: true }],
    [["--", "down", "--all"], { kind: "down", all: true }],
  ])("reads %j", (args, expected) => {
    expect(parseMigrateArgs(args)).toEqual(expected);
  });

  it.each([[[]], [["sideways"]], [["up", "--all"]], [["down", "--all", "x"]]])("refuses %j", (args) => {
    expect(parseMigrateArgs(args)).toBeUndefined();
  });
});

describe("createMigratorDataSource", () => {
  it("never synchronizes, never runs at boot, never logs queries and uses the registry", () => {
    const source = createMigratorDataSource(GOOD);
    expect(source.options).toMatchObject({ synchronize: false, migrationsRun: false, logging: false });
    expect(source.options.migrations).toEqual(MIGRATIONS);
    expect(source.isInitialized).toBe(false);
  });
});