import type { HealthLiveResponse, HealthReadyResponse } from "@ajc/contracts";
import { ApiError } from "../common/api-error.js";

/** Pure: the liveness body. It never touches the database (Neon scale-to-zero, uptime pings). */
export function liveResponse(commit: string): HealthLiveResponse {
  return { status: "ok", commit };
}

/**
 * Readiness: one trivial query. Any failure becomes SERVICE_UNAVAILABLE with fixed text. The driver error is kept only as the cause: its message never reaches the response or a log (P-13)
 */
export async function readyResponse(
  commit: string,
  ping: () => Promise<void>,
): Promise<HealthReadyResponse> {
  try {
    await ping();
  } catch (error) {
    // The driver error rides along as the cause so the filter can read its SQLSTATE. It is never echoed.
    throw new ApiError("SERVICE_UNAVAILABLE", "Database unavailable", null, error);
  }
  return { status: "ok", commit };
}