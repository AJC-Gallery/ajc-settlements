/**
 * The only reader of process.env in the API (S-07, P-08). Everything else receives a
 * validated AppConfig, so a bad deploy fails at boot and never at the first request.
 */
export const NODE_ENVS = ["development", "test", "production"] as const;
export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type NodeEnv = (typeof NODE_ENVS)[number];
export type LogLevel = (typeof LOG_LEVELS)[number];
export type EnvSource = Readonly<Record<string, string | undefined>>;

export interface AppConfig {
  readonly nodeEnv: NodeEnv;
  readonly port: number;
  readonly allowedOrigins: readonly string[];
  readonly trustProxyHops: number;
  readonly logLevel: LogLevel;
  /** The build's git commit, or "unknown" when the host does not provide one. */
  readonly commit: string;
}

const PORT_MIN = 1;
const PORT_MAX = 65_535;
const TRUST_PROXY_HOPS_MIN = 0;
const TRUST_PROXY_HOPS_MAX = 10;
const DEFAULT_LOG_LEVEL: LogLevel = "info";
const UNKNOWN_COMMIT = "unknown";

/** Every problem found, so one failed boot shows the whole list. */
export class ConfigError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid API configuration:\n${issues.map((issue) => `  - ${issue}`).join("\n")}`);
    this.name = "ConfigError";
    this.issues = issues;
  }
}

type Parsed<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issue: string };

const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });
const fail = (issue: string): Parsed<never> => ({ ok: false, issue });
const issuesOf = (result: Parsed<unknown>): string[] => (result.ok ? [] : [result.issue]);
const present = (raw: string | undefined): string | undefined =>
  raw === undefined || raw.trim() === "" ? undefined : raw;

function parseOneOf<T extends string>(
  name: string,
  raw: string | undefined,
  allowed: readonly T[],
): Parsed<T> {
  const found = allowed.find((candidate) => candidate === raw);
  return found === undefined ? fail(`${name} must be one of: ${allowed.join(", ")}`) : ok(found);
}

function parseInteger(name: string, raw: string | undefined, min: number, max: number): Parsed<number> {
  const text = present(raw);
  if (text === undefined) return fail(`${name} is required`);
  const value = Number(text);
  if (!/^\d+$/.test(text) || value < min || value > max) {
    return fail(`${name} must be a whole number from ${min} to ${max}`);
  }
  return ok(value);
}

/** An origin is scheme, host and optional port: no path, no trailing slash, no credentials. */
function isOrigin(entry: string): boolean {
  try {
    const url = new URL(entry);
    return (url.protocol === "http:" || url.protocol === "https:") && url.origin === entry;
  } catch {
    return false;
  }
}

function parseOrigins(raw: string | undefined): Parsed<readonly string[]> {
  const text = present(raw);
  if (text === undefined) return fail("ALLOWED_ORIGINS is required (comma-separated origins)");
  const entries = text.split(",").map((entry) => entry.trim());
  const invalid = entries.filter((entry) => !isOrigin(entry));
  if (invalid.length > 0) {
    const shown = invalid.map((entry) => JSON.stringify(entry)).join(", ");
    return fail(`ALLOWED_ORIGINS must list origins like https://app.example.com (invalid: ${shown})`);
  }
  return ok([...new Set(entries)]);
}

export function parseConfig(source: EnvSource): AppConfig {
  const nodeEnv = parseOneOf("NODE_ENV", source["NODE_ENV"], NODE_ENVS);
  const port = parseInteger("PORT", source["PORT"], PORT_MIN, PORT_MAX);
  const origins = parseOrigins(source["ALLOWED_ORIGINS"]);
  const hops = parseInteger(
    "TRUST_PROXY_HOPS",
    source["TRUST_PROXY_HOPS"],
    TRUST_PROXY_HOPS_MIN,
    TRUST_PROXY_HOPS_MAX,
  );
  const logLevel =
    source["LOG_LEVEL"] === undefined
      ? ok<LogLevel>(DEFAULT_LOG_LEVEL)
      : parseOneOf("LOG_LEVEL", source["LOG_LEVEL"], LOG_LEVELS);

  if (!nodeEnv.ok || !port.ok || !origins.ok || !hops.ok || !logLevel.ok) {
    throw new ConfigError([nodeEnv, port, origins, hops, logLevel].flatMap(issuesOf));
  }
  return {
    nodeEnv: nodeEnv.value,
    port: port.value,
    allowedOrigins: origins.value,
    trustProxyHops: hops.value,
    logLevel: logLevel.value,
    commit: present(source["RENDER_GIT_COMMIT"]) ?? UNKNOWN_COMMIT,
  };
}

/** Reads the real environment. Called once, at boot. */
export function loadConfig(): AppConfig {
  return parseConfig(process.env);
}