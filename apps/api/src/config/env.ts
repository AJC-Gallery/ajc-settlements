/** The only reader of process.env in the API. The backend agent replaces this with the validated schema in D-001. */
const DEFAULT_PORT = 3000;
const UNKNOWN_COMMIT = "unknown";

export function readPort(): number {
  const raw = process.env["PORT"];
  const port = raw === undefined ? DEFAULT_PORT : Number(raw);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }
  return port;
}

/** The commit this instance was built from. Render sets RENDER_GIT_COMMIT; the smoke test compares it. */
export function readCommit(): string {
  return process.env["RENDER_GIT_COMMIT"] ?? UNKNOWN_COMMIT;
}
