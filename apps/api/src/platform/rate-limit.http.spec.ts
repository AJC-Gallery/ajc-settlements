import "reflect-metadata";
import { ERROR_CODES, type ApiErrorBody } from "@ajc/contracts";
import { Controller, Get, Module } from "@nestjs/common";
import { APP_GUARD, NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AppConfig } from "../config/config.js";
import { configureApp } from "./configure-app.js";
import { createLogger } from "./logger.js";
import { GLOBAL_THROTTLERS, strictRateLimit } from "./rate-limit.js";

// A real Nest application with the real global setup (configureApp: prefix, filter, helmet, CORS),
// the throttler guard and one route limited to 1 request per window (D-003). No database.
const CONFIG: AppConfig = {
  nodeEnv: "test",
  port: 0,
  allowedOrigins: ["http://localhost:3000"],
  trustProxyHops: 0,
  logLevel: "info",
  databaseUrl: "postgres://ajc_app:unused-pw@localhost:5432/unused",
  dbPoolMax: 1,
  commit: "test",
};

// Decorators are applied by plain calls, as in validation.spec.ts: the test runner does not emit decorator metadata.
class LimitedController {
  one(): { ok: true } {
    return { ok: true };
  }
}
class TestModule {}

function declareApplication(): void {
  const descriptor = Object.getOwnPropertyDescriptor(LimitedController.prototype, "one");
  if (descriptor === undefined) throw new Error("route handler missing");
  Controller("limited")(LimitedController);
  Get()(LimitedController.prototype, "one", descriptor);
  strictRateLimit(1)(LimitedController.prototype, "one", descriptor);
  Module({
    imports: [ThrottlerModule.forRoot(GLOBAL_THROTTLERS)],
    controllers: [LimitedController],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  })(TestModule);
}

describe("a route limited to one request per window", () => {
  const lines: string[] = [];
  let app: NestExpressApplication;
  let baseUrl = "";

  beforeAll(async () => {
    declareApplication();
    app = await NestFactory.create<NestExpressApplication>(TestModule, { logger: false });
    const sink = { write: (line: string): void => void lines.push(line) };
    configureApp(app, CONFIG, createLogger({ level: "info", sink, now: () => new Date() }));
    await app.listen(0, "127.0.0.1");
    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 200, then 429 with the RATE_LIMITED envelope and Retry-After in whole seconds", async () => {
    const url = `${baseUrl}/api/v1/limited`;
    const first = await fetch(url);
    expect(first.status).toBe(200);

    const second = await fetch(url);
    expect(second.status).toBe(429);
    const body = (await second.json()) as ApiErrorBody;
    expect(body).toEqual({
      code: ERROR_CODES.RATE_LIMITED,
      message: "Too many requests",
      details: null,
      requestId: expect.any(String),
    });
    expect(second.headers.get("x-request-id")).toBe(body.requestId);

    const retryAfter = second.headers.get("retry-after");
    expect(retryAfter).toMatch(/^[1-9]\d*$/);
    expect(Number(retryAfter)).toBeLessThanOrEqual(60);

    // The rejection is logged once with the matched pattern, which carries no value.
    const rejected = lines.filter((line) => line.includes('"status":429'));
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toContain('"route":"/api/v1/limited"');
  });
});