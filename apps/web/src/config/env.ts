export const APP_ENVS = ["dev", "production"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

export interface WebConfig {
  readonly apiOrigin: string;
  readonly appEnv: AppEnv;
}

export type EnvSource = Readonly<Record<string, string | undefined>>;

type Parsed<T> = { readonly value: T } | { readonly issue: string };

const ALLOWED_PROTOCOLS: readonly string[] = ["http:", "https:"];

export class ConfigError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Invalid web configuration:\n${issues.map((i) => `  - ${i}`).join("\n")}`);
    this.name = "ConfigError";
  }
}

function parseApiOrigin(raw: string | undefined): Parsed<string> {
  const text = raw?.trim() ?? "";
  if (text === "") return { issue: "API_ORIGIN is required (for example https://api.example.com)" };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { issue: "API_ORIGIN must be an absolute URL (for example https://api.example.com)" };
  }
  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) return { issue: "API_ORIGIN must start with http:// or https://" };
  if (url.origin !== text) return { issue: "API_ORIGIN must be an origin only: no path, query, credentials or trailing slash" };
  return { value: url.origin };
}

function parseAppEnv(raw: string | undefined): Parsed<AppEnv> {
  const match = APP_ENVS.find((name) => name === raw);
  if (match === undefined) return { issue: `APP_ENV must be one of: ${APP_ENVS.join(", ")}` };
  return { value: match };
}

export function parseWebConfig(source: EnvSource): WebConfig {
  const apiOrigin = parseApiOrigin(source["API_ORIGIN"]);
  const appEnv = parseAppEnv(source["APP_ENV"]);
  if ("value" in apiOrigin && "value" in appEnv) {
    return { apiOrigin: apiOrigin.value, appEnv: appEnv.value };
  }
  const issues = [apiOrigin, appEnv].flatMap((result) => ("issue" in result ? [result.issue] : []));
  throw new ConfigError(issues);
}