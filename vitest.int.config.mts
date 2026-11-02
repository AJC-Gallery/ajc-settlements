import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Database tests (*.int.spec.ts), run by `pnpm test:db` and the `db` CI job. Deployment owner's file.
 * They need a real Postgres with both roles: locally `pnpm db:up`, in CI the db job's service.
 * The defaults below are the throwaway local values; CI sets its own through the environment.
 * Tests that prove isolation must connect with DATABASE_URL (role ajc_app), never as a superuser.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@ajc/contracts": fileURLToPath(new URL("./packages/contracts/src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["apps/**/*.int.spec.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    // One file at a time: the tests share one database.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgres://ajc_app:ajc_app_local@localhost:5432/ajc_settlements",
      MIGRATOR_DATABASE_URL:
        process.env.MIGRATOR_DATABASE_URL ??
        "postgres://ajc_migrator:ajc_migrator_local@localhost:5432/ajc_settlements",
    },
  },
});
