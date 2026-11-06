# Directive D-003 → backend
Date: 2026-11-06 · Answers entries: none yet (B-001 is still to come); formalises the rulings already given in chat · Amends: D-001-backend only where this file says so

## 1. Rulings

- **Health paths.** `/api/v1/health/live` and `/api/v1/health/ready`, under the prefix, per S-06. This reverses D-001 section 1, which said the root. The smoke script probes the new path first and falls back to the old one. The Render Health Check Path is `/api/v1/health/live`. Document change recorded in section 5.
- **Rate limit numbers.** Approved: 100 requests per minute per IP globally. For sign-in, build only the mechanism for a stricter per-route limit now; the 5 per minute number (P-07: the sixth attempt returns 429) is applied when sign-in exists. Every 429 carries `Retry-After` in whole seconds and passes through the exception filter as `RATE_LIMITED`; an end-to-end test proves it, because the frontend client reads that header.
- **Throttler storage.** In-memory is accepted for dev and for one instance. It resets on restart and is not shared across instances. Record it as a known limit in B-001; before production I rule on a shared store.
- **`TRUST_PROXY_HOPS=1` is provisional.** Behind the web host's rewrite, the limiter may see one shared address for all web traffic. Accepted on dev, where one person tests. I prove the real value, with a measured test, once the dev web app is live and before production. Do not rely on the number for anything else.
- **Route logging.** Log the matched route pattern, never the raw URL: no query string and no path values (a future token in a path must never reach a log). An unmatched request logs a fixed label such as `unmatched`. This replaces the idea of using `originalUrl`. A separate small PR, with a test using a sentinel in a query string and in a path.
- **Instruction 3 configuration.** `DATABASE_URL` (application role, pooled host, required) and `DB_POOL_MAX` go in the API's config schema. `MIGRATOR_DATABASE_URL` does NOT: the running API never reads it (Backend document, variable table). Only the migration command's data source reads it, in `platform`. The dev host gets `DATABASE_URL` from the owner before the instruction 3 change merges; I confirm in writing. Do not merge instruction 3 until I do.
- **README.** `README.md` is yours for the run-from-a-clean-machine steps, the variable table and the logging note (ruling 5 text from earlier). Hosting and pipeline sections stay mine; do not edit them.
- **Throttler version.** Check its age against the release-age rule first; if it is too new, install the newest version that passes, as ruled before. No edits to `pnpm-workspace.yaml`.

## 2. Instructions, in order

1. **2b-3:** the global rate limiter, the mechanism for a stricter per-route limit, and the 429 test above. One PR, at most 400 changed lines excluding the lockfile.
2. **Route logging fix** (small, separate PR).
3. **Instruction 3** of D-001 (database platform and `/api/v1/health/ready`), after the owner's host confirmation.
4. **Instruction 4** of D-001 (migration tooling and first migration). I add the up, down, up and audit-SQL steps to the `db` job and the migration step to the dev release when `db:migrate` exists.
5. **B-001**, last, covering C-001 to C-004b, 2a, 2b, 3 and 4, with pasted evidence and every open item you listed.

Not now: identity and everything after it (the next directive).

## 3. Contract sequence

- Nothing new before identity. With identity: the auth paths as constants, `Locale` (`"en" | "fr"`) and the person's language preference, the constraint names for upload errors (state them before the asset form), and the default page size per list if one differs.

## 4. Waivers

- None.

## 5. Document changes

- Backend Engineering Document, "Deployment handoff": `/api/v1/health/live` and `/api/v1/health/ready`, not the root. Variable table: `MIGRATOR_DATABASE_URL` is not read by the API. Recorded here until I reissue the document.

## 6. Next gate

- **G1-B** closes as in D-001: instructions 1 to 4 merged; the dev release green with `/api/v1/health/ready` returning 200 on the dev host; the `db` job required and green; B-001 reporting each instruction as done, not done or contested, with pasted evidence. I will add `db` to the required checks when instruction 3 merges.

## 7. Questions back to the owner

- None for you to carry now. The owner sets `DATABASE_URL` on the dev host for instruction 3.

Write your reply as entry B-001 in `docs/feedback/backend-feedback.md`, opening "Answers directives D-001 and D-003".
