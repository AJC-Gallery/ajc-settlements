/**
 * Redaction for log fields (P-13). Passwords, tokens, hashes and request bodies never
 * reach a log line. Matching is on the key name, so a caller cannot forget a field.
 */
export const REDACTED = "[REDACTED]";
export const TRUNCATED = "[TRUNCATED]";

const MAX_DEPTH = 6;
const SENSITIVE_KEY =
  /pass|secret|token|authori[sz]ation|cookie|hash|api_?key|credential|body|connection|database_?url|signature/i;

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

function redactError(error: Error, depth: number): Record<string, unknown> {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: redact(error.cause, depth + 1),
  };
}

function redactObject(value: object, depth: number): Record<string, unknown> {
  const entries = Object.entries(value).map(([key, item]) => [
    key,
    isSensitiveKey(key) ? REDACTED : redact(item, depth + 1),
  ]);
  return Object.fromEntries(entries);
}

/** Returns a plain, JSON-safe copy of `value` with sensitive keys replaced. Never throws. */
export function redact(value: unknown, depth = 0): unknown {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (typeof value === "bigint") return value.toString();
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }
  if (depth >= MAX_DEPTH) return TRUNCATED;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (value instanceof Error) return redactError(value, depth);
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return redactObject(value as object, depth);
}