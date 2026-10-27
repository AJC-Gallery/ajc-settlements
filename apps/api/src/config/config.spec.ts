import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ConfigError, parseConfig, type EnvSource } from "./config.js";

const VALID: EnvSource = {
  NODE_ENV: "production",
  PORT: "3100",
  ALLOWED_ORIGINS: "https://app.example.com,http://localhost:3000",
  TRUST_PROXY_HOPS: "1",
  LOG_LEVEL: "warn",
};

const withEnv = (patch: EnvSource): EnvSource => ({ ...VALID, ...patch });

function issuesOf(source: EnvSource): readonly string[] {
  try {
    parseConfig(source);
  } catch (error) {
    if (error instanceof ConfigError) return error.issues;
    throw error;
  }
  return [];
}

function parseDotenv(text: string): Record<string, string> {
  const pairs = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)] as const);
  return Object.fromEntries(pairs);
}

describe("parseConfig", () => {
  it("returns typed values when every variable is valid", () => {
    expect(parseConfig(VALID)).toEqual({
      nodeEnv: "production",
      port: 3100,
      allowedOrigins: ["https://app.example.com", "http://localhost:3000"],
      trustProxyHops: 1,
      logLevel: "warn",
      commit: "unknown",
    });
  });

  it("reads the commit when RENDER_GIT_COMMIT is set", () => {
    expect(parseConfig(withEnv({ RENDER_GIT_COMMIT: "abc123" })).commit).toBe("abc123");
  });

  it("reports commit as unknown when RENDER_GIT_COMMIT is blank", () => {
    expect(parseConfig(withEnv({ RENDER_GIT_COMMIT: "  " })).commit).toBe("unknown");
  });

  it("defaults LOG_LEVEL to info when it is not set", () => {
    expect(parseConfig(withEnv({ LOG_LEVEL: undefined })).logLevel).toBe("info");
  });

  it("accepts the contents of .env.example", () => {
    const text = readFileSync(new URL("../../.env.example", import.meta.url), "utf8");
    expect(parseConfig(parseDotenv(text)).port).toBe(3100);
  });

  it("removes duplicate origins when the list repeats one", () => {
    const config = parseConfig(withEnv({ ALLOWED_ORIGINS: "https://a.com,https://a.com" }));
    expect(config.allowedOrigins).toEqual(["https://a.com"]);
  });

  it.each(["NODE_ENV", "PORT", "ALLOWED_ORIGINS", "TRUST_PROXY_HOPS"])(
    "rejects the config when %s is missing",
    (name) => {
      expect(issuesOf(withEnv({ [name]: undefined }))).toEqual([expect.stringContaining(name)]);
    },
  );

  it.each([
    ["NODE_ENV", "prod"],
    ["NODE_ENV", "Production"],
    ["NODE_ENV", ""],
    ["PORT", "0"],
    ["PORT", "65536"],
    ["PORT", "abc"],
    ["PORT", "3100.5"],
    ["PORT", "-1"],
    ["TRUST_PROXY_HOPS", "true"],
    ["TRUST_PROXY_HOPS", "-1"],
    ["TRUST_PROXY_HOPS", "11"],
    ["TRUST_PROXY_HOPS", "1.5"],
    ["LOG_LEVEL", "verbose"],
    ["LOG_LEVEL", "INFO"],
    ["LOG_LEVEL", ""],
    ["ALLOWED_ORIGINS", "*"],
    ["ALLOWED_ORIGINS", "app.example.com"],
    ["ALLOWED_ORIGINS", "https://app.example.com/"],
    ["ALLOWED_ORIGINS", "https://app.example.com/path"],
    ["ALLOWED_ORIGINS", "ftp://app.example.com"],
    ["ALLOWED_ORIGINS", "https://user:pw@app.example.com"],
    ["ALLOWED_ORIGINS", "https://a.com,"],
  ])("rejects %s when it is %j", (name, value) => {
    expect(issuesOf(withEnv({ [name]: value }))).toEqual([expect.stringContaining(name)]);
  });

  it("reports every problem in one error when several variables are bad", () => {
    const issues = issuesOf(withEnv({ NODE_ENV: "x", PORT: "0", TRUST_PROXY_HOPS: "true" }));
    expect(issues).toHaveLength(3);
    expect(issues.join("\n")).toMatch(/NODE_ENV[\s\S]*PORT[\s\S]*TRUST_PROXY_HOPS/);
  });
});