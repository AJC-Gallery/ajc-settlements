import { API_PREFIX } from "@ajc/contracts";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { createValidationPipe } from "../common/validation.js";
import type { AppConfig } from "../config/config.js";
import { ErrorFilter } from "./error.filter.js";
import { corsOptions } from "./http-options.js";
import type { Logger } from "./logger.js";
import { generateRequestId } from "./request-id.js";
import { createRequestIdMiddleware } from "./request-id.middleware.js";

/** Every global setting in one place, so main.ts stays bootstrap only. */
export function configureApp(app: NestExpressApplication, config: AppConfig, logger: Logger): void {
  // The exact hop count from config, never `true` (P-07).
  app.set("trust proxy", config.trustProxyHops);
  app.use(helmet());
  app.use(createRequestIdMiddleware(generateRequestId));
  app.enableCors(corsOptions(config.allowedOrigins));
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalFilters(new ErrorFilter(logger, generateRequestId));
  // Path and rule name only, never a value (ruling on C-004b).
  const onInvalid = (fieldPath: string, ruleName: string): void =>
    logger.warn("validation rule fell back to invalid", { fieldPath, ruleName });
  app.useGlobalPipes(createValidationPipe(onInvalid));
 
}