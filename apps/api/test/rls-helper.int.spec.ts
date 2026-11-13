import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadDatabaseUrl } from "../src/config/config.js";
import { Database } from "../src/platform/database.js";
import { loadMigratorUrl, migrateUp } from "../src/platform/migrator.js";

const HELPER = "SELECT public.app_world_id() AS id";
let db: Database;

beforeAll(async () => {
  // The db job starts from an empty database, so this test applies what is pending (D-004).
  await migrateUp(loadMigratorUrl());
  db = new Database({ databaseUrl: loadDatabaseUrl(), dbPoolMax: 1 });
});

afterAll(async () => {
  await db.close();
});

describe("the row-level-security helper, as ajc_app", () => {
  it("is callable and returns NULL when no world is set", async () => {
    const [row] = await db.query<{ id: string | null }>(HELPER);
    expect(row?.id).toBeNull();
  });

  it("returns the world uuid when the transaction sets one", async () => {
    const worldId = randomUUID();
    const [row] = await db.transaction({ worldId }, (m) => m.query(HELPER));
    expect(row.id).toBe(worldId);
  });

  it("returns NULL when the setting is an empty string", async () => {
    const [row] = await db.transaction({}, async (m) => {
      await m.query("SELECT set_config('app.world_id', '', true)");
      return m.query(HELPER);
    });
    expect(row.id).toBeNull();
  });

  it("refuses CREATE TABLE, because ajc_app owns nothing and may not create", async () => {
    await expect(db.query("CREATE TABLE ajc_app_must_not_create (id int)")).rejects.toThrow(/permission denied/);
  });
});