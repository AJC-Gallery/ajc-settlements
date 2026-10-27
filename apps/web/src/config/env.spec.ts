import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ConfigError, parseWebConfig } from "./env";

const VALID = { API_ORIGIN: "https://api-dev.ajc-gallery.com", APP_ENV: "dev" } as const;

function readDotenv(text: string): Record<string, string> {
  const entries = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1)] as const;
    });
  return Object.fromEntries(entries);
}

function issuesOf(source: Record<string, string | undefined>): readonly string[] {
  try {
    parseWebConfig(source);
  } catch (error) {
    if (error instanceof ConfigError) return error.issues;
    throw error;
  }
  return [];
}

describe("parseWebConfig", () => {
  it("returns the values when both variables are valid", () => {
    expect(parseWebConfig(VALID)).toEqual({ apiOrigin: "https://api-dev.ajc-gallery.com", appEnv: "dev" });
  });

  it("accepts the values in .env.example when they are parsed as a dotenv file", () => {
    const path = fileURLToPath(new URL("../../.env.example", import.meta.url));
    expect(parseWebConfig(readDotenv(readFileSync(path, "utf8")))).toEqual({
      apiOrigin: "https://api-dev.ajc-gallery.com",
      appEnv: "dev",
    });
  });

  it("accepts production and a local http origin with a port", () => {
    expect(parseWebConfig({ API_ORIGIN: "http://localhost:3001", APP_ENV: "production" })).toEqual({
      apiOrigin: "http://localhost:3001",
      appEnv: "production",
    });
  });

  it("rejects the config when API_ORIGIN is missing", () => {
    expect(issuesOf({ APP_ENV: "dev" })).toEqual([expect.stringContaining("API_ORIGIN is required")]);
  });

  it("rejects the config when API_ORIGIN is blank", () => {
    expect(issuesOf({ ...VALID, API_ORIGIN: "   " })).toEqual([expect.stringContaining("API_ORIGIN is required")]);
  });

  it.each(["not a url", "api.example.com", "//api.example.com"])("rejects API_ORIGIN when it is not absolute: %s", (value) => {
    expect(issuesOf({ ...VALID, API_ORIGIN: value })).toEqual([expect.stringContaining("absolute URL")]);
  });

  it("rejects API_ORIGIN when the scheme is not http or https", () => {
    expect(issuesOf({ ...VALID, API_ORIGIN: "ftp://api.example.com" })).toEqual([expect.stringContaining("http:// or https://")]);
  });

  it.each(["https://api.example.com/", "https://api.example.com/api/v1", "https://api.example.com?x=1", "https://user:pw@api.example.com"])(
    "rejects API_ORIGIN when it is more than an origin: %s",
    (value) => {
      expect(issuesOf({ ...VALID, API_ORIGIN: value })).toEqual([expect.stringContaining("origin only")]);
    },
  );

  it("rejects the config when APP_ENV is missing", () => {
    expect(issuesOf({ API_ORIGIN: VALID.API_ORIGIN })).toEqual([expect.stringContaining("APP_ENV must be one of")]);
  });

  it.each(["staging", "Dev", "prod", ""])("rejects APP_ENV when it is not dev or production: '%s'", (value) => {
    expect(issuesOf({ ...VALID, APP_ENV: value })).toEqual([expect.stringContaining("APP_ENV must be one of")]);
  });

  it("reports both problems in one error when both variables are bad", () => {
    expect(issuesOf({ API_ORIGIN: "nope", APP_ENV: "x" })).toHaveLength(2);
  });
});