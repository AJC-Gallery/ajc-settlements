import type { HealthLiveResponse, HealthReadyResponse } from "@ajc/contracts";
import { ApiError } from "../common/api-error.js";

/** Pure: the liveness body. It never touches the database (Neon scale-to-zero, uptime pings). */
export function liveResponse(commit: string): HealthLiveResponse {
  return { status: "ok", commit };
}

/**
 * Readiness: one trivial query. Any failure becomes SERVICE_UNAVAILABLE with fixed text. The driver
 * error is dropped here, so its message (host names, values) can never be echoed or logged (P-13).
 */
export async function readyResponse(
  commit: string,
  ping: () => Promise<void>,
): Promise<HealthReadyResponse> {
  try {
    await ping();
  } catch {
    throw new ApiError("SERVICE_UNAVAILABLE", "Database unavailable");
  }
  return { status: "ok", commit };
}