# Backend feedback

## B-001

Date: 2026-11-17 · Phase: 1 · Answers directives D-001, D-003 and D-004 · Repository state: `main` at 48b62d0 · Status: ready to send · Evidence is what the owner pasted on 2026-11-17 and what is in the repository at that commit.

### 1. Instructions

| Instruction | Status | Evidence |
|---|---|---|
| D-001 1. Contracts C-001 to C-004b | Done | C-001 #7 (frontend review of record in F-001), C-002 #8, C-003 #10 (with #15), C-004 #16 (reviewed in F-002), C-004b #23 |
| D-001 2. Bootstrap, config, liveness | Done | 2a: #11 config and `.env.example`, #12 logger and request id, #13 validation pipe, #14 error mapping and filter. 2b: #24 Nest bootstrap, request id and `/api/v1/health/live`, #26 helmet, CORS, trust proxy, filter, pipe and JSON 404. Dev serves `{"status":"ok","commit":"48b62d0a7e1ccad3569693994904801349090488"}` at `/api/v1/health/live`, the same commit as `main`. `release-dev` run 43759549275 success (smoke matched the commit). Tests: `config.spec.ts`, `error-body.spec.ts`, `error.filter.spec.ts`, `validation.spec.ts`, `health.spec.ts` |
| D-003 1. Global limiter and per-route mechanism | Done, except the end-to-end 429 test | #29. Tests `rate-limit.spec.ts` (100 per minute; the stricter limit is stored on the handler). Dev answers `x-ratelimit-limit: 100`. The filter tests set a default `Retry-After` on a 429 and keep an existing one. The end-to-end 429 test is ruled by the controlling agent and goes in a tests-only PR (section 2) |
| D-003 2. Route logging | Done | #30. `route-label.spec.ts` "ignores url and originalUrl even when they carry a secret"; `error.filter.spec.ts` "logs the matched pattern and no query string or path value" (sentinel in the query string and the path) |
| D-001 3. Database platform and `/api/v1/health/ready` | Done | #31 (3a), #33 (3b-1), #34 (3b-2), #38 (503 at `warn`, SQLSTATE only). Dev: `HTTP/2 200`, body `{"status":"ok","commit":"48b62d0a7e1ccad3569693994904801349090488"}` from `/api/v1/health/ready`, 2026-11-17 11:51 GMT, `time_total 8.33s`. `ci` run 43759470094 on `main`: static, boundaries, unit, web and db all success |
| D-001 4a. Migration CLI, registry, first migration | Done | #41. `ci` run 43413515186 success. Owner's local proof, 2026-11-17: `up` applied 0; `down --all` reverted all; `up` applied 1 `RlsHelper1794355200000`; `down` reverted the last one; `up` applied 1 again. Refusals: no URL gave "MIGRATOR_DATABASE_URL is required", exit 1; a bad argument printed the usage line, exit 2. The third refusal (a URL for a role other than `ajc_migrator`) is covered by `migrator.spec.ts` (superuser and application role refused, value never echoed), not by the local paste |
| D-001 4b. Audit SQL, its test, `ajc_app` helper test | Done | #42. `ci` run 43416700767 success. Local `pnpm test:db` as `ajc_app`, 2026-11-17: 4 files, 17 tests passed (`audit.int.spec.ts` 2, `rls-helper.int.spec.ts` 4, `database.int.spec.ts` 9, `health-ready.int.spec.ts` 2). The helper returning NULL when unset, the uuid when set, and `CREATE TABLE` refused are the `rls-helper` tests. `proacl` was not queried by hand: `audit.sql` check 2 reads `proacl` for a PUBLIC `EXECUTE` and returned zero rows |
| D-004. 503 from ready logs at `warn` | Done | #38 |
| D-004. First deploy of 3a5a29b | Closed as transient | D-004 ruling: Render logged "Timed Out" with no application start line; the same commit deployed green with no code change |
| D-004. `TRUST_PROXY_HOPS` debug line | Done | #43, test `proxy-probe.spec.ts` "logs counts and a class and never an address". Measurement in section 3 |
| D-004. Up, down, up, schema compare, audit run and migrate step in CI and `release-dev` | Not mine | Ruled: the controlling agent wires these in a separate PR. At 48b62d0 the `db` job runs only `pnpm test:db` and `release-dev.yml` has no migrate step |
| D-004. README run steps, variable table, migration and database-test order | Done | `README.md` at 48b62d0 |

### 2. Open items and rulings

- **End-to-end 429 test, and unit tests for `stdoutSink` and `HealthController`.** Ruled: write them, one tests-only PR. Written, not yet merged: `rate-limit.http.spec.ts` (real Nest app, real `configureApp`, throttler guard, one route at 1 per window; asserts 429, the `RATE_LIMITED` envelope and `Retry-After` in whole seconds), `stdout-sink.spec.ts`, `health.controller.spec.ts`.
- **Cold-Neon connect timeout.** Closed as measured: 200 in 8.33 s, one sample. `DB_CONNECTION_TIMEOUT_MS` stays at 3 s. Reopened only if a real timeout shows up.
- **`onInvalid` with a real DTO.** Moves to the identity slice (D-005), where real DTOs exist.
- **Formatting.** No formatter tooling. Whitespace is tidied only in files a change touches anyway.
- **CI wiring and the dev database's migration state.** The controlling agent's PR. The dev state is known after it runs.

### 3. `TRUST_PROXY_HOPS` measurement

Measured on dev with the debug probe (#43), one request through `dev.ajc-gallery.com` at `TRUST_PROXY_HOPS=1`: `xffCount` 3, `ipClass` private. Render's own health checks: `xffCount` 0, `ipClass` private. Recorded as measured, no conclusion drawn here. `TRUST_PROXY_HOPS=1` stays provisional on dev, the probe stays in the code, and the owner is finishing the measurement (a hops=3 test). No proxy work by the backend.

### 4. Known limits

- The throttler store is in memory: per instance, reset on restart, not shared across instances. A ruling on a shared store comes before production.
- Unmatched paths are not throttled.
- `Retry-After` defaults to 60 seconds when the limiter did not set one.
- Pre-production, on the controlling agent's checklist: choose how to identify the visitor behind Vercel and Render, then measure again with the probe, comparing a request through the web host and one straight to the API.

### 5. CI commands (each with its variables)

- `pnpm --filter @ajc/api db:migrate` with `MIGRATOR_DATABASE_URL` (role `ajc_migrator`, direct host)
- `pnpm --filter @ajc/api db:migrate:revert -- --all` with `MIGRATOR_DATABASE_URL`
- `pnpm --filter @ajc/api db:migrate` again, then compare the schema
- Audit: `apps/api/test/audit.sql`, run by `audit.int.spec.ts` inside `pnpm test:db`, with `DATABASE_URL` (role `ajc_app`) and `MIGRATOR_DATABASE_URL`

### 6. Next

Identity waits for D-005. Nothing for it is started.
