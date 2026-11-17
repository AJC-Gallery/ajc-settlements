# Entry B-001
Date: 2026-11-17 · Phase: 1 · Answers directives D-001, D-003 and D-004 · PRs: #7, #8, #10, #11, #12, #13, #14, #16, #23, #24, #26, #29, #30, #31, #33, #34, #38, #41, #42, #43 (all merged); #45 (tests only, open when this entry was written)
Status: ready to send

## 1. Done since the last entry

Instruction report for D-001, D-003 and D-004. Repository state at the time: `main` at 48b62d0.

| Instruction | Report |
|---|---|
| D-001 1. Contracts C-001 to C-004b | **Done.** C-001 #7 (frontend review of record in F-001), C-002 #8, C-003 #10, C-004 #16 (reviewed in F-002), C-004b #23. |
| D-001 2. Bootstrap, config, liveness | **Done.** 2a: #11 config and `.env.example`, #12 logger and request id, #13 validation pipe, #14 error mapping and filter. 2b: #24 Nest bootstrap, request id and `/api/v1/health/live`, #26 helmet, CORS, trust proxy, filter, pipe and the JSON 404. Evidence: dev serves `{"status":"ok","commit":"48b62d0a7e1ccad3569693994904801349090488"}` at `/api/v1/health/live`, the same commit as `main`; `release-dev` run 43759549275 success. Tests: `config.spec.ts`, `error-body.spec.ts`, `error.filter.spec.ts`, `validation.spec.ts`, `health.spec.ts`. |
| D-003 1. Global limiter and per-route mechanism | **Done.** #29, `rate-limit.spec.ts` (100 per minute; a stricter limit is stored on the handler). Dev answers `x-ratelimit-limit: 100`. The end-to-end 429 test was ruled in B-001 review and is in #45 (below). |
| D-003 2. Route logging | **Done.** #30. `route-label.spec.ts` "ignores url and originalUrl even when they carry a secret"; `error.filter.spec.ts` "logs the matched pattern and no query string or path value" (sentinel in the query string and the path). |
| D-001 3. Database platform and `/api/v1/health/ready` | **Done.** #31 (3a), #33 (3b-1), #34 (3b-2), #38 (a 503 from ready logs at `warn`, SQLSTATE only). Evidence: `curl` on dev, 2026-11-17 11:51 GMT, `HTTP/2 200`, body `{"status":"ok","commit":"48b62d0a7e1ccad3569693994904801349090488"}`, `time_total: 8.330295s`. `ci` run 43759470094 on `main`: static, boundaries, unit, web and db all `success`. |
| D-001 4a. Migration CLI, registry, first migration | **Done.** #41, `ci` run 43413515186 success. Owner's local proof, 2026-11-17: `up` applied 0; `down --all` reverted all; `up` applied 1 `RlsHelper1794355200000`; `down` reverted the last one; `up` applied 1 again. Refusals: no URL printed "MIGRATOR_DATABASE_URL is required", exit 1; a bad argument printed `usage: migrate-cli.js up \| down [--all]`, exit 2. |
| D-001 4b. Audit SQL, its test, `ajc_app` helper test | **Done.** #42, `ci` run 43416700767 success. Local `pnpm test:db` as `ajc_app`, 2026-11-17: 4 files, 17 tests passed (`audit.int.spec.ts` 2, `rls-helper.int.spec.ts` 4, `database.int.spec.ts` 9, `health-ready.int.spec.ts` 2). The helper returns NULL when unset and the uuid when set, and `CREATE TABLE` is refused: the `rls-helper` tests. |
| D-004. A 503 from ready logs at `warn` | **Done.** #38. |
| D-004. First deploy of 3a5a29b | **Closed as transient** by the D-004 ruling: Render logged "Timed Out" with no application start line, and the same commit deployed green with no code change. |
| D-004. `TRUST_PROXY_HOPS` debug line | **Done.** #43, `proxy-probe.spec.ts` "logs counts and a class and never an address". Measured on dev at `TRUST_PROXY_HOPS=1`, one request through `dev.ajc-gallery.com`: `xffCount` 3, `ipClass` private. Render's own health checks: `xffCount` 0, private. Recorded only; no conclusion drawn. `TRUST_PROXY_HOPS=1` stays provisional and the probe stays in the code. |
| D-004. Up, down, up, schema compare, audit run and migrate step in CI and `release-dev` | **Not mine; since merged.** Ruled: the controlling agent wires these in a separate PR. At 48b62d0 the `db` job ran only `pnpm test:db` and `release-dev.yml` had no migrate step. `main` now has #44, "ci: migrate up/down/up with schema compare in db job; migrate dev before deploy". I have not seen its runs. |
| D-004. README run steps, variable table, migration and database-test order | **Done.** `README.md` at 48b62d0. |

Tests-only PR #45 (ruled in the B-001 review; 233 added lines in three new files, no source or dependency change · evidence: `pnpm verify` green on the owner's machine, 2026-11-17, 444 tests in 37 files, `eslint .` with no output, "no dependency violations found", "guards: ok", builds of contracts, api and web):
- **`rate-limit.http.spec.ts` (1 test):** a real Nest app with the real `configureApp`, the throttler guard and one route limited to 1 per window. The second request gets 429, the `RATE_LIMITED` envelope, `x-request-id` equal to `requestId`, `Retry-After` as a whole number from 1 to 60, and one log line with the matched route.
- **`stdout-sink.spec.ts` (2 tests):** the exact stdout write, nothing on stderr, and one JSON line through `createLogger`.
- **`health.controller.spec.ts` (6 tests):** the controller called directly, then over HTTP under `/api/v1`: live body, ready 200, ready 503 with the envelope and none of the driver text.
- **CI on #45:** `boundaries`, `db`, `unit` and `web` succeeded. `static` failed at `pnpm audit --audit-level=high` on a new high advisory, picomatch ReDoS (GHSA-fc5q-39xc-vjpf), dev-tooling paths only, no patched version. `typecheck`, `lint` and `guards` passed in the same job. The controlling agent merged waiver W-002. With `main` merged into the branch, `pnpm verify` passed again (444 tests, 37 files) and `gh pr checks 45` printed 7 successful checks and 0 failing: Vercel, Vercel Preview Comments, boundaries, db, static, unit and web.

## 2. Not verified

- **A 429 on dev.** Dev shows the `x-ratelimit-*` headers, but I have not seen a 429 from the deployed API; the end-to-end test runs a local app only.
- **The dev database's migration state.** #44 adds a migrate step before the dev deploy, but I have not seen a run of it, so I do not know whether the first migration is on dev.
- **The third migration-CLI refusal (a URL for a role other than `ajc_migrator`) by hand.** It is covered by `migrator.spec.ts` (superuser and application role refused, value never echoed); it was not in the local paste.
- **`proacl` by hand.** I did not query it. `audit.sql` check 2 reads `proacl` for a PUBLIC `EXECUTE` and returned zero rows.
- **Cold-start time.** One sample only: ready returned 200 in 8.33 s through `dev.ajc-gallery.com`.
- **The migration proof ran on a local Postgres, not on Neon.**
- **The governance documents.** I did not have the Standard, the Environment and Coding Protocol, the Master document, the Backend Engineering Document or the Agent Coordination Protocol. I worked from the rules the directives cite.
- **Where I ran things.** I read the repository from the zip and did not run it; every test result above is from the owner's machine or from CI.

## 3. Blocked or decision needed

- None.

## 4. Proposed contract changes

- None.

## 5. Needs from the other agent

- **From the controlling agent:** D-005 for identity. The ruling on the `TRUST_PROXY_HOPS` measurement, which the owner is finishing (a hops=3 test).

## 6. Rule conflicts and waiver requests

- None requested by the backend. Waiver W-002 (the picomatch audit advisory) is merged by the controlling agent as #46 and expires 2026-12-01.

## 7. Risks noticed

- **The throttler store is in memory.** It is per instance, reset on restart and not shared. A ruling on a shared store is needed before production.
- **The limiter keys on the client address Express reports.** The probe measured a private address class at `TRUST_PROXY_HOPS=1`, so it does not yet show that this is the visitor. The controlling agent's pre-production checklist covers it: choose how to identify the visitor behind Vercel and Render, then measure again, comparing a request through the web host with one straight to the API.
- **Unmatched paths are not throttled.**
- **`Retry-After` defaults to 60 seconds** when the limiter did not set one.
- **The connect timeout is 3 s** (`DB_CONNECTION_TIMEOUT_MS`) against a cold-start sample of 8.33 s. Ruled: it stays, and reopens only if a real timeout shows up.
- **Several files carry stray tab or odd indentation** (`app.module.ts`, `config.ts`, `configure-app.ts`, `error.filter.ts`, `route-label.spec.ts`). No behaviour change. Ruled: tidy only in files a change touches.
- **My own errors this period:** my first draft of this entry did not follow the eight-section entry format, and it wrote "smoke matched the commit" for a `release-dev` run when I had only seen the run succeed. Both are corrected here.

## 8. Owner's notes (written by you)

- Cold-Neon timeout: closed as measured; `DB_CONNECTION_TIMEOUT_MS` stays at 3 s.
- `onInvalid` with a real DTO: moves to the identity slice (D-005).
- Formatting: no formatter tooling; whitespace is tidied only in files that are touched anyway.
- CI wiring (up, down, up, schema compare, migrate step in `release-dev`): the controlling agent's, merged as #44.
- Proxy: provisional. I am finishing the measurement (the hops=3 test) and the result goes to the controlling agent.
- The first local run of the database tests failed because Docker was not enabled in WSL; it is enabled and the proof above passed afterwards.
- #45: `static` is green after W-002; it merges after this entry.
