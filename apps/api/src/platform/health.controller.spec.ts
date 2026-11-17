import "reflect-metadata";
import { ERROR_CODES, type ApiErrorBody } from "@ajc/contracts";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ApiError } from "../common/api-error.js";
import type { AppConfig } from "../config/config.js";
import { APP_CONFIG } from "../config/config.token.js";
import { configureApp } from "./configure-app.js";
import type { Database } from "./database.js";
import { DATABASE } from "./database.token.js";
import { HealthController } from "./health.controller.js";
import { createLogger } from "./logger.js";

const CONFIG: AppConfig = {
  nodeEnv: "test",
  port: 0,
  allowedOrigins: ["http://localhost:3000"],
  trustProxyHops: 0,
  logLevel: "error",
  databaseUrl: "postgres://ajc_app:unused-pw@localhost:5432/unused",
  dbPoolMax: 1,
  commit: "abc123",
};
const DRIVER_TEXT = "connect ECONNREFUSED 10.0.0.5:5432 password=hunter2";

/** Only `ping` is used by the controller, so a stub stands in for the Database. */
const databaseWith = (ping: () => Promise<void>): Database => ({ ping }) as unknown as Database;

describe("HealthController, called directly", () => {
  it("answers live with the commit and never touches the database", () => {
    const ping = vi.fn(async () => undefined);
    const controller = new HealthController(CONFIG, databaseWith(ping));
    expect(controller.live()).toEqual({ status: "ok", commit: "abc123" });
    expect(ping).not.toHaveBeenCalled();
  });

  it("answers ready with the commit after one ping", async () => {
    const ping = vi.fn(async () => undefined);
    const controller = new HealthController(CONFIG, databaseWith(ping));
    await expect(controller.ready()).resolves.toEqual({ status: "ok", commit: "abc123" });
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it("rejects ready with SERVICE_UNAVAILABLE, fixed text and the driver error only as the cause", async () => {
    const driver = new Error(DRIVER_TEXT);
    const controller = new HealthController(CONFIG, databaseWith(() => Promise.reject(driver)));
    const error = await controller.ready().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe(ERROR_CODES.SERVICE_UNAVAILABLE);
    expect((error as ApiError).message).toBe("Database unavailable");
    expect((error as ApiError).cause).toBe(driver);
  });
});

describe("HealthController, over HTTP under /api/v1", () => {
  let ping: () => Promise<void> = async () => undefined;
  let app: NestExpressApplication;
  let baseUrl = "";

  beforeAll(async () => {
    class TestModule {}
    Module({
      controllers: [HealthController],
      providers: [
        { provide: APP_CONFIG, useValue: CONFIG },
        { provide: DATABASE, useValue: databaseWith(() => ping()) },
      ],
    })(TestModule);
    app = await NestFactory.create<NestExpressApplication>(TestModule, { logger: false });
    const sink = { write: (): void => undefined };
    configureApp(app, CONFIG, createLogger({ level: "error", sink, now: () => new Date() }));
    await app.listen(0, "127.0.0.1");
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves live as the compact body the smoke test matches", async () => {
    const response = await fetch(`${baseUrl}/api/v1/health/live`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('{"status":"ok","commit":"abc123"}');
  });

  it("serves ready 200 when the ping succeeds", async () => {
    ping = async () => undefined;
    const response = await fetch(`${baseUrl}/api/v1/health/ready`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", commit: "abc123" });
  });

  it("serves ready 503 with the envelope and none of the driver text when the ping fails", async () => {
    ping = () => Promise.reject(new Error(DRIVER_TEXT));
    const response = await fetch(`${baseUrl}/api/v1/health/ready`);
    const text = await response.text();
    expect(response.status).toBe(503);
    expect(text).not.toMatch(/ECONNREFUSED|hunter2|10\.0\.0\.5/);
    expect(JSON.parse(text) as ApiErrorBody).toEqual({
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      message: "Database unavailable",
      details: null,
      requestId: expect.any(String),
    });
  });
});