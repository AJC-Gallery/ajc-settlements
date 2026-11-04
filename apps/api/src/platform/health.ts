import type { HealthLiveResponse } from "@ajc/contracts";

/** Pure: the liveness body. It never touches the database (Neon scale-to-zero, uptime pings). */
export function liveResponse(commit: string): HealthLiveResponse {
  return { status: "ok", commit };
}