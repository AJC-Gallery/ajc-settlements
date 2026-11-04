import type { HealthLiveResponse } from "@ajc/contracts";
import { Controller, Get, Inject } from "@nestjs/common";
import { APP_CONFIG } from "../config/config.token.js";
import type { AppConfig } from "../config/config.js";
import { liveResponse } from "./health.js";

/** Routes sit under the global /api/v1 prefix (S-06). Logic lives in health.ts, this only routes. */
@Controller("health")
export class HealthController {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  @Get("live")
  live(): HealthLiveResponse {
    return liveResponse(this.config.commit);
  }
}