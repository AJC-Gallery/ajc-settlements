/** GET /health/live. Never touches the database. The smoke test matches `"commit":"<sha>"` in this body. */
export interface HealthLiveResponse {
  readonly status: "ok";
  /** The build's git commit, or "unknown" when the host does not provide one. */
  readonly commit: string;
}

/** GET /health/ready, 200 only. A failure is a 503 with the error envelope. */
export interface HealthReadyResponse {
  readonly status: "ok";
  readonly commit: string;
}