import {
  IDEMPOTENCY_KEY_MAX_LENGTH,
  IDEMPOTENCY_KEY_MIN_LENGTH,
  IDEMPOTENCY_KEY_PATTERN,
} from "@ajc/contracts";

export type KeyGenerator = () => string;

export function isValidIdempotencyKey(key: string): boolean {
  return (
    key.length >= IDEMPOTENCY_KEY_MIN_LENGTH &&
    key.length <= IDEMPOTENCY_KEY_MAX_LENGTH &&
    IDEMPOTENCY_KEY_PATTERN.test(key)
  );
}

// A UUID fits the contract's length and character rules.
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

function normalise(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalise);
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return Object.fromEntries(keys.map((key) => [key, normalise((value as Record<string, unknown>)[key])]));
  }
  return value;
}

/** The same text for the same content, whatever the order of an object's keys. Files and blobs are not supported. */
export function fingerprintOf(input: unknown): string {
  const text: string | undefined = JSON.stringify(normalise(input));
  return text ?? "undefined";
}

export interface IdempotencyAttempt {
  /** The key for submitting `input`: the same key while the input is unchanged and no submit has succeeded. */
  keyFor(input: unknown): string;
  /** Call when a submit succeeded, so the next submit starts a new attempt. */
  succeeded(): void;
}

// Frontend document, idempotency: a key is minted when an attempt starts and kept until the attempt
// succeeds or the form is edited. A retry after a timeout reuses it; editing the input mints a new one.
export function createIdempotencyAttempt(generate: KeyGenerator = generateIdempotencyKey): IdempotencyAttempt {
  let current: { readonly fingerprint: string; readonly key: string } | null = null;
  return {
    keyFor(input) {
      const fingerprint = fingerprintOf(input);
      if (current === null || current.fingerprint !== fingerprint) {
        const key = generate();
        if (!isValidIdempotencyKey(key)) throw new Error("The idempotency key generator produced a key the contract rejects");
        current = { fingerprint, key };
      }
      return current.key;
    },
    succeeded() {
      current = null;
    },
  };
}
