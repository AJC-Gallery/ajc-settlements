# Directive D-004 → backend
Date: 2026-11-13 · Answers entries: none yet (B-001 is still to come); formalises the rulings already given in chat since D-003 · Amends: D-003-backend only where this file says so

## 1. Rulings

- **Instruction 3 is accepted** (merged: `DATABASE_URL`, `DB_POOL_MAX`, the connection, the transaction helper, `/api/v1/health/ready`). The dev host is on a commit that serves live and ready with 200, and `ci/db` is green. Proof stays to be listed in B-001.
- **The first deploy of 3a5a29b that failed** is closed as transient. Render's log said "Timed Out" with no application start line, so the app never started; the same commit deployed green afterwards with no code change. List it in B-001 as closed with that evidence. The open item "3 second connect timeout against a cold Neon" is a different question and stays open.
- **A 503 from `/api/v1/health/ready` logs at `warn`** with request id, code, status, method, route pattern and, when the driver error is carried as the `cause` of the `ApiError`, the SQLSTATE; never the driver message and never a stack. Other statuses of 500 or more log at `error`. Merged as #38.
- **Instruction 4 design, approved:**
  - Compiled migrations run by our own small CLI (`platform/migrate-cli.ts`, `platform/migrator.ts`); no new dependency; TypeORM's own CLI is not used.
  - `MIGRATOR_DATABASE_URL` is read only in `platform`, by a small reader of its own that checks that one variable; it is not in the API's config schema and the API never reads it. Errors name the variable and never its value. The migrator imports neither `@ajc/contracts` nor the API config, so it runs with only `apps/api` built.
  - Migrations are loaded from an explicit list, with a test that fails when a file in `src/migrations` is missing from it (P-11 naming and why-header are enforced by a test).
  - The first migration is only the row-level-security helper: `public.app_world_id()`, `STABLE`, returning `NULLIF(current_setting('app.world_id', true), '')::uuid`; `REVOKE ALL ... FROM PUBLIC`, then `GRANT EXECUTE ... TO ajc_app` and nothing else; a working `down()`.
  - `db:migrate` and `db:migrate:revert`, the latter with an `--all` option so CI can return to an empty schema.
- **Up, down, up is a CI step, not an int test.** `ajc_migrator` cannot create a database and the int-test files run in parallel against one shared database, so a `down` would drop objects under other tests. I add up, down, up and the schema comparison to the `db` job. The `*.int.spec.ts` keeps only the `ajc_app` facts: it can call the helper, it gets NULL when unset and the uuid when set, and it cannot `CREATE TABLE`.
- **The audit SQL** lives in `apps/api/test/audit.sql`. "World-owned" means a table with a `world_id` column; `pg_catalog` and `information_schema` are ignored. Two checks: world-owned tables without row-level security enabled, and non-system functions that `PUBLIC` can execute. A test runs it and expects zero rows.
- **`TRUST_PROXY_HOPS` proof, approved as a debug line.** After instruction 4, one `debug`-level line per request with two fields only: `xffCount` (the number of entries in `X-Forwarded-For`) and `ipClass` (loopback, private, public or unknown). No addresses. The owner sets `LOG_LEVEL=debug` on dev for one request through `dev.ajc-gallery.com`, reads the line and sets it back. If the count is 2 and the class is public, the API sees the web host's address and 1 hop is wrong for per-visitor limits. Raising the count lets a caller who reaches the API origin directly spoof an address; I decide that before production, not now.
- **README** stays yours for run steps and the variable table. Document that `pnpm test:db` needs migrations applied first, and the local order: `pnpm db:up`, then `pnpm --filter @ajc/api db:migrate`, then `pnpm test:db`.

## 2. Instructions, in order

1. **Instruction 4a** (migration CLI, registry, first migration, scripts, README steps). · acceptance: the owner's local proof (up applied 1, `proacl` shows no bare `=X`, `app_world_id()` is NULL when unset for `ajc_app`, `CREATE TABLE` as `ajc_app` fails, revert and `--all` work, the three CLI refusal cases) pasted; `pnpm verify` green; five checks green; no dependency changes.
2. **Instruction 4b** (`audit.sql`, its test, the `ajc_app` int test, which applies pending migrations in `beforeAll`). · acceptance: `pnpm test:db` green locally and in `ci/db`.
3. **The `TRUST_PROXY_HOPS` debug line** (small PR) and the owner's measurement.
4. **B-001**, last, opening "Answers directives D-001, D-003 and D-004", covering C-001 to C-004b, 2a, 2b, 3 and 4, with pasted evidence, every open item (cold-Neon connect timeout, `onInvalid` with a real DTO, `TRUST_PROXY_HOPS`, the `stdoutSink` and `HealthController` unit tests, the known limits: in-memory throttler, unthrottled unmatched paths, `Retry-After` default of 60), and the exact CI commands: `pnpm --filter @ajc/api db:migrate`, `... db:migrate:revert -- --all`, `... db:migrate` again, the audit run, each with its variables.

Not now: identity and everything after it (the next directive).

## 3. Contract sequence

- Unchanged from D-003: nothing new before identity.

## 4. Waivers

- None.

## 5. Document changes

- None beyond D-003 section 5.

## 6. Next gate

- **G1-B** closes as in D-003: instructions 1 to 4 merged; the dev release green with `/api/v1/health/ready` returning 200; the `db` job required and green; B-001 reporting each instruction as done, not done or contested, with pasted evidence. I wire up, down, up, the audit and the migrate step in `release-dev` after 4a merges, and add `db` to the required checks.

## 7. Questions back to the owner

- None.

Write your reply as entry B-001 in `docs/feedback/backend-feedback.md`, opening "Answers directives D-001, D-003 and D-004".
