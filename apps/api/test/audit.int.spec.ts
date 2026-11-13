import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadDatabaseUrl } from "../src/config/config.js";
import { Database } from "../src/platform/database.js";
import { loadMigratorUrl, migrateUp } from "../src/platform/migrator.js";

interface AuditRow {
  check_name: string;
  object_name: string;
}

const AUDIT_SQL = readFileSync(fileURLToPath(new URL("./audit.sql", import.meta.url)), "utf8");
let app: Database;
let migrator: Database;

beforeAll(async () => {
  await migrateUp(loadMigratorUrl());
  app = new Database({ databaseUrl: loadDatabaseUrl(), dbPoolMax: 1 });
  migrator = new Database({ databaseUrl: loadMigratorUrl(), dbPoolMax: 1 });
});

afterAll(async () => {
  await app.close();
  await migrator.close();
});

describe("the database audit", () => {
  it("returns zero rows on the migrated schema", async () => {
    expect(await app.query<AuditRow>(AUDIT_SQL)).toEqual([]);
  });

  it("reports a world table without RLS and a PUBLIC-executable function, then rolls back", async () => {
    let found: AuditRow[] = [];
    await expect(
      migrator.transaction({}, async (m) => {
        await m.query("CREATE TABLE audit_probe_table (id int, world_id uuid)");
        await m.query("CREATE FUNCTION audit_probe_fn() RETURNS int LANGUAGE sql AS 'SELECT 1'");
        found = (await m.query(AUDIT_SQL)) as AuditRow[];
        throw new Error("rollback probe");
      }),
    ).rejects.toThrow("rollback probe");
    expect(found).toEqual(
      expect.arrayContaining([
        { check_name: "world_table_without_rls", object_name: "public.audit_probe_table" },
        { check_name: "function_executable_by_public", object_name: "audit_probe_fn()" },
      ]),
    );
    expect(await app.query<AuditRow>(AUDIT_SQL)).toEqual([]);
  });
});