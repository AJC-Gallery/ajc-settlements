import type { HealthLiveResponse, HealthReadyResponse } from "@ajc/contracts";
import { Controller, Get, Inject } from "@nestjs/common";
import { APP_CONFIG } from "../config/config.token.js";
import type { AppConfig } from "../config/config.js";
import { DATABASE } from "./database.token.js";
import type { Database } from "./database.js";
import { liveResponse, readyResponse } from "./health.js";

/** Routes sit under the global /api/v1 prefix (S-06). Logic lives in health.ts, this only routes. */
@Controller("health")
export class HealthController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DATABASE) private readonly database: Database,
  ) {}

  @Get("live")
  live(): HealthLiveResponse {
    return liveResponse(this.config.commit);
  }

  @Get("ready")
  ready(): Promise<HealthReadyResponse> {
    return readyResponse(this.config.commit, () => this.database.ping());
  }
}