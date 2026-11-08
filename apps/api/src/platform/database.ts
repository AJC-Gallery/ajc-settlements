import { DataSource, type EntityManager } from "typeorm";
import type { AppConfig } from "../config/config.js";

/** Named limits (C-12). Short, so a sleeping or unreachable Neon fails fast instead of hanging. */
export const DB_CONNECTION_TIMEOUT_MS = 3_000;
export const DB_QUERY_TIMEOUT_MS = 6_000;
export const DB_IDLE_TIMEOUT_MS = 30_000;
export const DB_LOCK_TIMEOUT_MS = 2_000;
export const DB_STATEMENT_TIMEOUT_MS = 5_000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DatabaseSettings = Pick<AppConfig, "databaseUrl" | "dbPoolMax">;

export interface TransactionOptions {
  /** The world the transaction acts in. Set as app.world_id for row-level security. */
  readonly worldId?: string;
}

/** A programming error, never user input, so it is a plain Error. */
export function assertWorldId(value: string): string {
  if (!UUID_PATTERN.test(value)) throw new Error("worldId must be a UUID");
  return value;
}

/**
 * Never synchronize, never run migrations at boot, never log queries (a logged query can carry
 * values, P-13). No entities yet. Statement and lock timeouts are set per transaction, because
 * Neon's pooler is in transaction mode and a session-level SET is unreliable (F-06).
 */
export function createDataSource(settings: DatabaseSettings): DataSource {
  return new DataSource({
    type: "postgres",
    url: settings.databaseUrl,
    poolSize: settings.dbPoolMax,
    connectTimeoutMS: DB_CONNECTION_TIMEOUT_MS,
    // Client-side timeouts only: pg sends no startup parameters that a pooler could reject.
    extra: { query_timeout: DB_QUERY_TIMEOUT_MS, idleTimeoutMillis: DB_IDLE_TIMEOUT_MS },
    synchronize: false,
    migrationsRun: false,
    logging: false,
    entities: [],
  });
}

/** SET LOCAL equivalents. set_config(..., true) is transaction-local and takes bind parameters (C-15). */
async function applySettings(manager: EntityManager, worldId: string | undefined): Promise<void> {
  await manager.query("SELECT set_config('lock_timeout', $1, true), set_config('statement_timeout', $2, true)", [
    `${DB_LOCK_TIMEOUT_MS}ms`,
    `${DB_STATEMENT_TIMEOUT_MS}ms`,
  ]);
  if (worldId !== undefined) {
    await manager.query("SELECT set_config('app.world_id', $1, true)", [worldId]);
  }
}

/**
 * The one door to the database. It connects lazily, so /health/live never touches it and a sleeping
 * database cannot stop the app booting. A failed connect is retried on the next call.
 */
export class Database {
  private readonly source: DataSource;
  private starting: Promise<DataSource> | undefined;

  constructor(settings: DatabaseSettings) {
    this.source = createDataSource(settings);
  }

  private connect(): Promise<DataSource> {
    if (this.source.isInitialized) return Promise.resolve(this.source);
    this.starting ??= this.source.initialize().finally(() => {
      this.starting = undefined;
    });
    return this.starting;
  }

  /** One trivial query. Rejects when the database cannot be reached in time. */
  async ping(): Promise<void> {
    const source = await this.connect();
    await source.query("SELECT 1");
  }

  async query<T = unknown>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
    const source = await this.connect();
    return (await source.query(sql, [...params])) as T[];
  }

  /** One business action is one transaction. Every transaction starts with its timeouts and world (F-05, F-06). */
  async transaction<T>(options: TransactionOptions, work: (manager: EntityManager) => Promise<T>): Promise<T> {
    const worldId = options.worldId === undefined ? undefined : assertWorldId(options.worldId);
    const source = await this.connect();
    return source.transaction(async (manager) => {
      await applySettings(manager, worldId);
      return work(manager);
    });
  }

  async close(): Promise<void> {
    if (this.source.isInitialized) await this.source.destroy();
  }
}