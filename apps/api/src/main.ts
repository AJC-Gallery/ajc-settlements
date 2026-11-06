import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module.js";
import { ConfigError, loadConfig } from "./config/config.js";
import { configureApp } from "./platform/configure-app.js";
import { ErrorFilter } from "./platform/error.filter.js";
import { createLogger, stdoutSink } from "./platform/logger.js";
import { createNotFoundHandler } from "./platform/not-found.js";
import { generateRequestId } from "./platform/request-id.js";

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel, sink: stdoutSink, now: () => new Date() });
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(config), { logger: false });
  configureApp(app, config, logger);
  await app.init();
  // After init the Nest routes exist, so this only catches paths nothing matched,
  // including those outside the global prefix, and sends them through the same filter.
  app.use(createNotFoundHandler(new ErrorFilter(logger, generateRequestId)));
  await app.listen(config.port);
  logger.info("api listening", { port: config.port, commit: config.commit });
}

bootstrap().catch((error: unknown) => {
  // A ConfigError lists variable names, never values. Anything else prints its name only.
  const text = error instanceof ConfigError ? error.message : `startup failed: ${String(error instanceof Error ? error.name : typeof error)}`;
  process.stderr.write(`${text}\n`);
  process.exitCode = 1;
});