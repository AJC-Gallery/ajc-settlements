import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadDatabaseUrl } from "../src/config/config.js";
import { Database } from "../src/platform/database.js";
import { readyResponse } from "../src/platform/health.js";

let up: Database;
let down: Database;

beforeAll(() => {
  up = new Database({ databaseUrl: loadDatabaseUrl(), dbPoolMax: 1 });
  down = new Database({ databaseUrl: "postgres://ajc_app:x@127.0.0.1:1/nodb", dbPoolMax: 1 });
});

afterAll(async () => {
  await up.close();
  await down.close();
});

describe("readiness against a real database", () => {
  it("is ok when the database is up", async () => {
    await expect(readyResponse("abc123", () => up.ping())).resolves.toEqual({ status: "ok", commit: "abc123" });
  });

  it("is SERVICE_UNAVAILABLE when the connection fails, and says so again on the next call", async () => {
    for (let i = 0; i < 2; i += 1) {
      await expect(readyResponse("abc123", () => down.ping())).rejects.toMatchObject({
        code: "SERVICE_UNAVAILABLE",
      });
    }
  });
});