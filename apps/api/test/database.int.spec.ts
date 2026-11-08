import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadDatabaseUrl } from "../src/config/config.js";
import { Database } from "../src/platform/database.js";

const WORLD_QUERY = "SELECT current_setting('app.world_id', true) AS value";
let db: Database;

beforeAll(() => {
  db = new Database({ databaseUrl: loadDatabaseUrl(), dbPoolMax: 1 });
});

afterAll(async () => {
  await db.close();
});

describe("the database connection", () => {
  it("connects as ajc_app, which is not a superuser", async () => {
    const [row] = await db.query<{ who: string; superuser: string; one: number }>(
      "SELECT current_user AS who, current_setting('is_superuser') AS superuser, 1 AS one",
    );
    expect(row).toEqual({ who: "ajc_app", superuser: "off", one: 1 });
  });

  it("answers ping", async () => {
    await expect(db.ping()).resolves.toBeUndefined();
  });

  it("sets the lock and statement timeouts inside every transaction", async () => {
    const [row] = await db.transaction({}, (m) =>
      m.query("SELECT current_setting('lock_timeout') AS lock, current_setting('statement_timeout') AS stmt"),
    );
    expect(row).toEqual({ lock: "2s", stmt: "5s" });
  });

  it("does not keep the world id after the transaction, on the same pooled connection", async () => {
    const worldId = randomUUID();
    const [inside] = await db.transaction({ worldId }, (m) => m.query(WORLD_QUERY));
    expect(inside.value).toBe(worldId);
    const [next] = await db.transaction({}, (m) => m.query(WORLD_QUERY));
    expect([null, ""]).toContain(next.value);
    const [outside] = await db.query<{ value: string | null }>(WORLD_QUERY);
    expect([null, ""]).toContain(outside?.value);
  });

  it("rolls back and releases the connection when the work fails", async () => {
    await expect(
      db.transaction({ worldId: randomUUID() }, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    await expect(db.ping()).resolves.toBeUndefined();
  });

  it("refuses a world id that is not a UUID before opening a transaction", async () => {
    await expect(db.transaction({ worldId: "x" }, async () => 1)).rejects.toThrow("worldId must be a UUID");
  });

  it("creates no named prepared statement, which a transaction-mode pooler would break", async () => {
    await db.query("SELECT $1::int AS n", [1]);
    await db.transaction({}, (m) => m.query("SELECT $1::text AS t", ["x"]));
    const [row] = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM pg_prepared_statements");
    expect(row?.n).toBe(0);
  });

  it("stops a statement that runs past the statement timeout", async () => {
    await expect(db.transaction({}, (m) => m.query("SELECT pg_sleep(10)"))).rejects.toThrow();
    await expect(db.ping()).resolves.toBeUndefined();
  });
});

describe("an unreachable database", () => {
  it("rejects ping, and rejects again on the next call instead of staying stuck", async () => {
    const bad = new Database({ databaseUrl: "postgres://ajc_app:x@127.0.0.1:1/nodb", dbPoolMax: 1 });
    await expect(bad.ping()).rejects.toThrow();
    await expect(bad.ping()).rejects.toThrow();
    await bad.close();
  });
});