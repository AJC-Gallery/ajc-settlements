import { Module, type DynamicModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_CONFIG } from "./config/config.token.js";
import type { AppConfig } from "./config/config.js";
import { HealthController } from "./platform/health.controller.js";
import { GLOBAL_THROTTLERS } from "./platform/rate-limit.js";

@Module({})
export class AppModule {
  /** The validated config is injected once here, so no class reads process.env. */
  static register(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [ThrottlerModule.forRoot(GLOBAL_THROTTLERS)],
      controllers: [HealthController],
      providers: [
        { provide: APP_CONFIG, useValue: config },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    };
  }
}