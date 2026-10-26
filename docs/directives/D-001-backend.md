# Directive D-001 → backend
Date: 2026-10-26 · Answers entries: none (first directive; Phase 1 opens)

You are the backend agent. Read this with the Standard, the Environment and Coding Protocol, the Master document, the Backend Engineering Document and the Agent Coordination Protocol. Where this directive and a higher document disagree, the higher document wins and you say so in your entry (section 3).

This directive covers the first slice of Phase 1: the contract basics, the real API bootstrap, configuration, the database platform and the migration tooling. Identity, worlds and the access gate come in D-002. Do not start them.

## 1. Rulings

- **Health endpoints are not under /api/v1.** They live at `/health/live` and `/health/ready`. The release pipeline's smoke test (`scripts/smoke.sh`) calls `/health/live` on the host root. Rests on: Backend document, "Deployment handoff".
- **`/health/live` keeps its exact body shape**: `{"status":"ok","commit":"<sha>"}`, serialised compactly (no spaces), `commit` read from `RENDER_GIT_COMMIT` and `"unknown"` when unset. `/health/live` never touches the database (Neon scale-to-zero, uptime pings). The smoke test does a string match on `"commit":"<sha>"`; a different shape breaks every dev release. Rests on: environments record, release-dev workflow.
- **Scripts in `apps/api/package.json` named `build` and `start` keep their names and meaning**: `build` produces `apps/api/dist/main.js`, `start` runs it with plain `node`. Render runs them. Rename or move nothing without a section 3 entry first.
- **Database-dependent tests are named `*.int.spec.ts`** and live in `apps/api/test/`. `pnpm test` (the `unit` CI job) has no database, so it must not run them. They run in a separate `db` job that the deployment owner is adding (see section 3 of this directive). Pure unit tests stay `*.spec.ts` beside the file.
- **Tests that prove isolation must connect as `ajc_app`**, never as a superuser. A superuser bypasses row-level security and would make every RLS test pass for the wrong reason. Rests on: P-09, P-10.
- **Module system and decorators are your call inside `apps/api`** (the placeholder is ESM). TypeScript is pinned to 6.0.x at the repo root and is not yours to change. If NestJS or TypeORM will not compile or run under that pin, stop and write it up in section 3 with options. Vitest's default transform does not emit decorator metadata; if your tests need Nest dependency injection, propose a plugin with a `docs/DEPENDENCIES.md` line, or construct classes by hand in unit tests.
- **Anything outside iteration 1 is not built** (S-13). `scripts/guards.sh` fails the build on a folder under `src` whose name starts with: tenanc, money, payment, document, vault, pricing, billing, agent, client, import, invoice.

## 2. Instructions, in order

One change set per instruction, each at most 400 changed lines (S-10). Deliver each as complete files with repository paths, plus the exact commands for me to run.

1. **Contract change C-001 (contracts only).** In `packages/contracts/src`, add, additively:
   - `ERROR_CODES` (the starter list in the Backend document, plus `SERVICE_UNAVAILABLE` for the 503 case) and the `ErrorCode` type;
   - `ApiErrorBody` `{code, message, details, requestId}`, with a typed shape for `details` on `VALIDATION_FAILED` (per-field messages) and on `MISSING_PERMISSION` (the permission named);
   - `PageResponse<T>` `{results, page, limit, total, totalPages}` and `MAX_PAGE_LIMIT = 100`;
   - `IDEMPOTENCY_KEY_HEADER = "Idempotency-Key"` and `IDEMPOTENCY_KEY_MIN_LENGTH = 16`;
   - `HealthLiveResponse` and `HealthReadyResponse`, both carrying `commit`.
   Request and response types and shared constants only; no logic. · acceptance: `pnpm verify` is green on my machine, and the frontend agent's review of this contract change is recorded in the frontend's next entry before it merges.
2. **API bootstrap, config and liveness.** Replace the placeholder in `apps/api/src` with the NestJS bootstrap: `main.ts` as bootstrap only; the config module (`apps/api/src/config`) as the only reader of `process.env`, with a validated schema that refuses to boot on a missing or malformed value; the global validation pipe (whitelist, forbid non-whitelisted, explicit transforms only); one exception filter producing the contract's error envelope with a `requestId` on every error; helmet, a global rate limiter, the CORS allowlist from `ALLOWED_ORIGINS`; JSON logs with the request id and no console output (P-13). Unknown routes return 404 with the envelope. `/health/live` as ruled above. `.env.example` lists every variable with its purpose.
   Variables in this change: `NODE_ENV`, `PORT`, `ALLOWED_ORIGINS`, `TRUST_PROXY_HOPS`, `LOG_LEVEL`, and optional `RENDER_GIT_COMMIT`. Do not add `DATABASE_URL` or any secret yet; they arrive with instruction 3 and D-002, so this change can merge to dev without new settings on the host. Tell me in your entry every variable you added and whether it is required.
   Dependencies get a line each in `docs/DEPENDENCIES.md` (S-08).
   · acceptance: (a) `pnpm verify` green; (b) a test that the config module rejects each missing or invalid variable and accepts the contents of `.env.example`; (c) the health body and the 404 envelope are asserted in a test against the contract types, with the DTO or filter declaring `implements`/typing against them; (d) the compiled output runs: I run `pnpm --filter @ajc/api build`, then `RENDER_GIT_COMMIT=abc123 PORT=3100 pnpm --filter @ajc/api start`, then `bash scripts/smoke.sh http://localhost:3100 abc123 30`, and `smoke: ok` prints; (e) the running build imports at least one runtime constant from `@ajc/contracts` (for example `ERROR_CODES` in the 404 filter), which proves the compiled API can load the contracts package. If it cannot (the package is TypeScript source and Node will not run it from `node_modules`), you pick the fix inside `packages/contracts` and `apps/api`, state the exact build steps the host must run in section 3 of your entry, and I adapt the Render build. I will not change that build before I see your note.
3. **Database platform and readiness.** After my section 3 items 1 and 2 are merged: add `DATABASE_URL` (application role, pooled host, required) and `DB_POOL_MAX` to the config schema; the database connection in `apps/api/src/platform`; the transaction helper that runs `SET LOCAL lock_timeout`, `SET LOCAL statement_timeout` and `SET LOCAL app.world_id` at the start of every transaction (F-06); and `/health/ready`, which runs a trivial query and returns 200 with `{status, commit}` or 503 with the envelope and `SERVICE_UNAVAILABLE`, never echoing the raw driver error. · acceptance: in `*.int.spec.ts`, against a real Postgres built from the real migrations and connected as `ajc_app`: ready returns 200 with the database up and 503 with the envelope when the connection fails; a value set with `SET LOCAL app.world_id` in one transaction is not visible in the next transaction on the same pooled connection.
4. **Migration tooling and the first migration.** TypeORM data source for the CLI in `apps/api/src/platform` (it reads `MIGRATOR_DATABASE_URL`, the direct host, role `ajc_migrator`; the running API never reads it); scripts `db:migrate` and `db:migrate:revert` in `apps/api/package.json`; the migration naming rule and why-header from P-11; and the first migration, which only creates the row-level-security helper: a stable function returning `current_setting('app.world_id', true)` as a uuid (null when unset), with `EXECUTE` granted to `ajc_app` and nothing else granted. If you think a different first migration is right, say so in section 3 before writing it. Every migration has a working `down()`. · acceptance: in the `db` CI job, up, down, up on an empty database as `ajc_migrator` leaves the same schema; an `*.int.spec.ts` connects as `ajc_app` and proves it can call the helper function and cannot create a table; the database audit SQL scaffold exists in `apps/api/test` and returns zero rows.

Not now: identity, sessions, worlds, membership, the access gate, history, assets, collections, stars, uploads, Swagger. Do not write stubs for them.

## 3. Contract sequence

- C-001 (instruction 1) merges first. The frontend agent reviews it (I carry it across). Neither of you waits on the other's branch after that.
- Every later contract change follows the same path: contract change set first, then the DTO that implements it, the response-shape test and the updated fixtures.
- **What the deployment owner (me) delivers, and when.** You do not edit CI, hosting, `docker-compose.yml`, `scripts/` or lint and boundary configuration (Protocol, rules of engagement). I deliver, before instruction 3 can merge:
  1. a local database with both roles (`ajc_migrator`, `ajc_app`) created by `docker compose`, with throwaway local passwords written into `.env.example`; local `DATABASE_URL` and `MIGRATOR_DATABASE_URL` values will be in the directive follow-up, and you copy them into `.env.example` as I give them;
  2. a root vitest configuration that keeps `*.int.spec.ts` out of `pnpm test`, plus a root `pnpm test:db` that runs them;
  3. a `db` job in CI (Postgres 17 service, both roles, migrations up, down, up, the audit SQL, `pnpm test:db`);
  4. the dev host settings for `DATABASE_URL`, `DB_POOL_MAX`, `ALLOWED_ORIGINS` and `TRUST_PROXY_HOPS`, set before the change that makes them required merges;
  5. the migration step in the dev release workflow once `db:migrate` exists.
  If you need a different script name or location for items 2 and 3, say so in your entry.
- When you add module folders (from D-002 on), send me the module table (name, owner of tables, allowed imports); I add the boundary rules.

## 4. Waivers

- None requested. W-001 (solo review, expiry 2027-04-14) already covers pull-request review, so my review is the only one.

## 5. Document changes

- Backend Engineering Document, variable table: add `MIGRATOR_DATABASE_URL` (migration script and pipeline only, secret, never read by the running API). Add `RENDER_GIT_COMMIT` (optional, host-provided, reported by the health endpoints).
- Backend Engineering Document, error codes: add `SERVICE_UNAVAILABLE` (503).
- I record these changes here until I reissue the document; this directive does not loosen any rule.

## 6. Next gate

- **Gate G1-B (foundations, backend slice)** closes when: instructions 1 to 4 are merged; the dev release workflow is green with the new API on the dev host (smoke test matching the commit, `/health/ready` returning 200 on the dev host); the `db` job is a required check and green; and your entry B-001 reports each instruction as done, not done or contested, with pasted command output as evidence. Then D-002 starts identity, worlds and the access gate.

## 7. Questions back to the owner

- None for you to carry now. Your first entry may ask the owner for the legacy files you need (for example the legacy `.env` variable names or Cloudinary constants), but nothing from the legacy repositories is copied, only the ideas in the Backend document's reuse table.

Write your reply as entry B-001 in `docs/feedback/backend-feedback.md`, opening with "Answers directive D-001".
