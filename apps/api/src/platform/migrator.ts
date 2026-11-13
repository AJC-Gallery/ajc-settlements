import { DataSource } from "typeorm";
import type { EnvSource } from "../config/config.js";
import { MIGRATIONS } from "../migrations/index.js";

/** Migrations run as this role only, never as a superuser. It owns what it creates. */
export const MIGRATOR_ROLE = "ajc_migrator";
const MIGRATOR_CONNECTION_TIMEOUT_MS = 10_000;

/** The message never contains the connection string: it holds a password. */
export class MigratorConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MigratorConfigError";
  }
}

export type MigrateCommand =
  | { readonly kind: "up" }
  | { readonly kind: "down"; readonly all: boolean };

/** Pure. A stray "--" from the package manager is ignored. Anything unknown gives undefined. */
export function parseMigrateArgs(args: readonly string[]): MigrateCommand | undefined {
  const [command, flag, extra] = args.filter((arg) => arg !== "--");
  if (extra !== undefined) return undefined;
  if (command === "up" && flag === undefined) return { kind: "up" };
  if (command === "down" && flag === undefined) return { kind: "down", all: false };
  if (command === "down" && flag === "--all") return { kind: "down", all: true };
  return undefined;
}

/** Pure. Accepts only a postgres URL that connects as ajc_migrator. Never echoes the value. */
export function readMigratorUrl(source: EnvSource): string {
  const raw = source["MIGRATOR_DATABASE_URL"]?.trim() ?? "";
  if (raw === "") throw new MigratorConfigError("MIGRATOR_DATABASE_URL is required");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new MigratorConfigError("MIGRATOR_DATABASE_URL must be a postgres:// URL");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new MigratorConfigError("MIGRATOR_DATABASE_URL must be a postgres:// URL");
  }
  if (decodeURIComponent(url.username) !== MIGRATOR_ROLE) {
    throw new MigratorConfigError(`MIGRATOR_DATABASE_URL must connect as ${MIGRATOR_ROLE}`);
  }
  return raw;
}

/** The only reader of MIGRATOR_DATABASE_URL. The running API never calls this. */
export function loadMigratorUrl(source: EnvSource = process.env): string {
  return readMigratorUrl(source);
}

export function createMigratorDataSource(url: string): DataSource {
  return new DataSource({
    type: "postgres",
    url,
    poolSize: 1,
    connectTimeoutMS: MIGRATOR_CONNECTION_TIMEOUT_MS,
    synchronize: false,
    migrationsRun: false,
    logging: false,
    entities: [],
    migrations: MIGRATIONS,
    migrationsTableName: "typeorm_migrations",
  });
}

async function withSource<T>(url: string, work: (source: DataSource) => Promise<T>): Promise<T> {
  const source = createMigratorDataSource(url);
  await source.initialize();
  try {
    return await work(source);
  } finally {
    await source.destroy();
  }
}

/** Applies every pending migration. Returns the names applied. Safe to run twice. */
export function migrateUp(url: string): Promise<string[]> {
  return withSource(url, async (source) => (await source.runMigrations()).map((m) => m.name));
}

/** Reverts the last migration, or every one with `all`. Undoing with none applied does nothing. */
export function migrateDown(url: string, all: boolean): Promise<void> {
  return withSource(url, async (source) => {
    const steps = all ? MIGRATIONS.length : 1;
    for (let step = 0; step < steps; step += 1) await source.undoLastMigration();
  });
}