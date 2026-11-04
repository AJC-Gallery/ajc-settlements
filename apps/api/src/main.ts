import "reflect-metadata";
import { API_PREFIX } from "@ajc/contracts";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { ConfigError, loadConfig } from "./config/config.js";
import { createLogger, stdoutSink } from "./platform/logger.js";
import { generateRequestId } from "./platform/request-id.js";
import { createRequestIdMiddleware } from "./platform/request-id.middleware.js";

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel, sink: stdoutSink, now: () => new Date() });
  const app = await NestFactory.create(AppModule.register(config), { logger: false });
  app.setGlobalPrefix(API_PREFIX);
  app.use(createRequestIdMiddleware(generateRequestId));
  await app.listen(config.port);
  logger.info("api listening", { port: config.port, commit: config.commit });
}

bootstrap().catch((error: unknown) => {
  // A ConfigError lists variable names, never values. Anything else prints its name only.
  const text = error instanceof ConfigError ? error.message : `startup failed: ${String(error instanceof Error ? error.name : typeof error)}`;
  process.stderr.write(`${text}\n`);
  process.exitCode = 1;
});