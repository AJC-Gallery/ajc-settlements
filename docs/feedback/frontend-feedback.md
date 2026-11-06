# Entry F-002
Date: 2026-11-04 · Phase: 1 · Answers directive D-002 · PRs: #18, #19, #20, #21, #22 (web, all merged). Reviewed, not authored: #16 (C-004).
Status: ready to send

## 1. Done since the last entry

Instruction report for D-002 (and the D-001 instruction 4 it unblocked):

| Instruction | Report |
|---|---|
| D-002 1. App shell, structure only (D-001 instruction 3 as reduced by D-001A) | **Done**, with one defect of mine found and fixed (below). |
| D-002 2. Typed API client (D-001 instruction 4) | **Done, with one acceptance item partly verified**: `pnpm test` passes with all build outputs removed; a real fresh clone is pending (section 2). |
| D-002 3. Re-run the web build against the merged C-003 | **Done**, with the caveat in section 2. |
| D-001 instruction 2 (design) | **Not done, on hold** under D-001A. Nothing built. |

App shell (PR #18, 299 additions, 12 deletions, 17 files · evidence: `gh pr view 18`):
- Route groups `(public)` and `(app)/worlds/[worldId]`, one navigation configuration (`features/navigation/navigation.ts`) feeding the unstyled navigation list in both layouts, and a placeholder page at `/worlds/[worldId]` that says the area is not built · evidence: build output route table `○ /`, `○ /_not-found`, `ƒ /worlds/[worldId]`.
- The navigation configuration is the single source of items · evidence: `navigation.spec.ts` (7 tests) includes "does point every item at a page that exists in the app folder" and "does not find a hard-coded internal link when the app and feature files are scanned".
- Bilingual copy: every text is `{ en, fr }` (`Localised`); a missing language does not compile · evidence: `locales.spec.ts` holds two `@ts-expect-error` lines that make `tsc` fail if a missing or extra language ever compiles, and `pnpm typecheck` passed in every pasted `pnpm verify`; `copy.spec.ts` (10 tests) fails on an empty text and on a copy file missing from its list.
- `lang` comes from one placeholder constant, `DEFAULT_LOCALE = "en"`, in `copy/locales.ts`; nothing decides how the language appears in the URL (section 3).
- No fixtures were created: the shell shows nothing that has a contract type, and D-001 forbids inventing one.
- Checks on PR #18 · evidence: `gh pr checks 18` printed five successes: boundaries, db, static, unit, web. A fresh clone of the branch ran `pnpm verify` green (typecheck, eslint, boundaries, guards, 155 tests, build).
- Rendered markup on main after the merge · evidence: `curl -sS http://localhost:3000/` printed `<html lang="en">`, a header with `<nav aria-label="Main navigation">` and one Home link, and a `<main>` with the heading and intro text.

Defect I introduced, found and fixed (PR #19, 21 insertions · evidence: the pasted markup and `pnpm verify` below):
- The same `curl` for `/worlds/00000000-0000-0000-0000-000000000000` printed two headers (Home, then Overview) and a `<main>` inside a `<main>`: the world page was inside the public layout. The `worlds` folder had been placed under `(public)` instead of `(app)`. My route test stripped group names, so nothing caught it.
- Fix: the folder moved to `(app)/worlds` and `route-groups.spec.ts` (2 tests) now fails when a world page sits outside the `(app)` group · evidence: on the fix branch `pnpm verify` passed with `route-groups.spec.ts (2 tests)`, and `curl` printed one header with only the Overview link and one `<main>`.

Web build against the merged C-003 (D-002 instruction 3) · evidence: on main at c9da5ea, `pnpm --filter @ajc/contracts build` ran `tsc -p tsconfig.build.json`, then `pnpm --filter @ajc/web build` compiled, finished TypeScript, and listed the same three routes, with the web `build` script unchanged.

Typed API client, in three parts (PR #20: 313 additions including the lockfile, 11 files; PR #21: 247 additions, 2 files; PR #22: 353 additions · evidence: `gh pr view 20`, `gh pr view 21`, and the owner's report for #22). All five web PRs are under the S-10 limit of 400, counting the lockfile.
- Files in `apps/web/src/lib/`: `api.ts` (one typed fetch wrapper), `api-error.ts`, `error-envelope.ts`, `idempotency.ts`, `query-keys.ts`, `query-client.ts`, and `fake-fetch.ts` (test support, imported by no app file). No component calls `fetch`, and no request or response type is declared by hand.
- A full local gate on main after the three merges · evidence: `pnpm verify` printed typecheck for contracts, api and web, `eslint .` with no output, "no dependency violations found (79 modules, 101 dependencies cruised)", "guards: ok", 22 test files with 272 tests passing, and builds of contracts, api and web.
- `pnpm test` with no build outputs, the substitute for the fresh-clone acceptance · evidence: on main at 3a44ca1, after `rm -rf packages/contracts/dist apps/api/dist apps/web/.next apps/web/next-env.d.ts` and an `ls` showing none of them, `pnpm test` printed 22 test files and 272 tests passing.
- Web tests added for the client: `idempotency.spec.ts` (15), `error-envelope.spec.ts` (30), `api.spec.ts` (25), `query-keys.spec.ts` (4), `query-client.spec.ts` (8). They import contract constants from `@ajc/contracts` and passed · evidence: the test lists in the `pnpm verify` output above.
- Error table, each row with a named test:
  - 400: field errors with their constraints.
  - 401: one refresh and one retry; a second 401 is final; a refused refresh does not retry; paths in `noRefreshPaths` never refresh; no refresh function means a 401 is final; two simultaneous 401s call the refresh once.
  - 403: the permission named.
  - 404: the same failure whatever the message.
  - 409: each of the six codes kept.
  - 429: `Retry-After` read as whole seconds, anything else is null.
  - 5xx: a failure with the same idempotency key on the retry.
  - network: a failure; an abort is rethrown unchanged.
- Idempotency lifecycle · evidence: tests "does return the same key when the same input is submitted again", "does return a new key when the input was edited", "does return a new key when the last submit succeeded".
- Fixture that fails to compile when a contract type changes: `api.spec.ts` types a response with `satisfies PageResponse<...>`, and `plainFailure` in `error-envelope.ts` has no default branch, so a new error code fails to compile until it is mapped.
- The 401 refresh is a function the client is given, not a call to an endpoint, because the auth contract does not exist yet. No sign-in or refresh code was written, as D-002 requires.
- Query keys are scoped by world (`["worlds", worldId, scope, ...]`) so one world's cache can never be served for another · evidence: `query-keys.spec.ts` "does give different keys when the world differs".
- TanStack Query is pinned to 5.104.2; 5.105.1 was published on 2026-11-01, so I chose a release 22 days old · evidence: the `DEPENDENCIES.md` row and `gh pr view 20`.

Review of record for C-004 (PR #16, `constraints.ts`, `errors.ts`, `index.ts`) · evidence: `gh pr diff 16` as pasted by the owner.
- Accepted as written. The constraint set is enough for sign-in, sign-up and creating a world, and fits the asset form (`isOneOf`, `isInt` with `min` and `max`, `arrayMaxSize`).
- `invalid` is an acceptable generic fallback; the UI shows a generic localised text for it, never the English `messages`. `messages` stays for logs; removal is decided later by expand, deploy, contract (S-11). `constraints` optional now and required later is acceptable.
- Conditions on the later change that makes `constraints` required: an end-to-end test that every field in a VALIDATION_FAILED response has at least one constraint, and a non-empty tuple type.
- Notes for the backend, none blocking: say whether a blank string is `required` or `minLength` (my recommendation: `required` covers absent, null and blank); name the constraints for upload errors before the asset form; log every `invalid` emitted; a phone-format name is additive and not needed yet.
- The web side will pick one constraint per field by fixed priority, map names with an exhaustive record plus a runtime fallback for unknown names, and add a test that no web file reads `.messages` outside logging.

Dev API health, closed · evidence: `curl -sS -i https://api-dev.ajc-gallery.com/health/live` returned `200` with `{"status":"ok","commit":"85abf40b3762a84684caf394135abf77fd0073f0"}`; `/api/v1/health/live` returned `404` with `{"code":"NOT_FOUND"}`. The Render settings page shows Health Check Path `/health/live`. Health is at the root, so the `/api` rewrite cannot reach it; the browser never calls health, and the web smoke test requests `/` (D-002).

Owner decision recorded (D-002 section 7): the product is bilingual, English and French.

## 2. Not verified

- **`pnpm test` on a real fresh clone (D-002 acceptance).** The owner's clone failed ("Could not resolve host: github.com"), and the commands after it ran in the existing repository, so that run proves nothing about a clean checkout. The substitute check in section 1 removes every build output and still passes, but `node_modules`, `.env.local` and other git-ignored files were present. A real clone is pending until GitHub is reachable.
- **The rewrite through `dev.ajc-gallery.com`.** The Vercel project does not exist yet. The proof so far ran through localhost (F-001).
- **Next resolving the compiled contracts in the web bundle.** No page imports `@ajc/contracts` at runtime, so the web build cannot show it. The client tests import it through the test alias, which is a different mechanism. This proof arrives with the first screen that uses the client.
- **Check results for PRs #19, #20, #21 and #22.** The owner reported them green; the output was not pasted. Only #18's checks were pasted. The local `pnpm verify` before each commit was not pasted either; the run on main after all merges covers the combined state.
- **Sandbox-only evidence (Node 22, contract files rebuilt from the C-002 and C-004 text; not run on the owner's machine):** a missing French text failing with TS2741; a made-up error code failing with TS2366 in `error-envelope.ts`; the route-group test failing in the wrong layout; three mutation checks on `api.ts` (unshared refresh, no credentials, refresh on a never-refresh path), each failing exactly one test.
- **The client against the real API.** The dev API still returns the Phase 0 body, `{"code":"NOT_FOUND"}` with no `requestId`, on 2026-11-04, so the envelope mapping has only been tested against fixtures. `Retry-After` on a 429 is likewise untested against the API.
- **Any browser behaviour:** the navigation was checked with `curl`, not in a browser; `crypto.randomUUID` needs a secure context (https or localhost); no keyboard or screen-reader check; no Core Web Vitals or bundle size; no narrow or wide viewport check, because there is no layout styling (D-001A).
- **French wording.** The French texts are mine and provisional, not reviewed by a French speaker. Decision 5 (Assets or Settlements, Tenant or Client) is still open.
- **TanStack Query behaviour in a component:** only the options are unit-tested; no provider is mounted.

## 3. Blocked or decision needed

- **How the language appears in the URL** · options: (A) a `/en` and `/fr` prefix on every route: links are shareable and indexable per language, but every path in the Frontend document gains a segment, `/` needs a redirect, and navigation links gain the prefix; (B) no prefix, with the language from a cookie, then the browser's language, and a switch: URLs stay as documented, but a public page has one URL in two languages (poor for search), and reading the cookie or header makes pages render on demand, so `/` loses static prerendering; (C) hybrid: public pages prefixed `/en` and `/fr`, signed-in screens unprefixed with the language from the person's saved preference (a cookie until that exists). · my recommendation: C, because the public pages are the ones that must be found in both languages, while signed-in screens are shared by link between owners who may prefer different languages. C needs a language preference on the person (a backend contract change) and moves `<html lang>` out of the single root layout into each route group. Navigation links already come from functions, so adding a public prefix is a one-place change. Until decided, `DEFAULT_LOCALE` stays a placeholder.
- **"5xx retried with the same key" (D-001 acceptance) against "offer retry" (Frontend document)** · options: (A) the wrapper makes one request per call, a retry is offered to the person and reuses the same idempotency key, and reads are retried at most twice by the query client; (B) the wrapper also retries writes by itself, with the same key. · my recommendation: A, because it matches the Frontend document and a hidden repeated write is harder to explain to the person. I implemented A; please confirm or rule.
- **Lint plugin for Next (deferred by D-002; recommendation unchanged)** · options: (A) `@next/eslint-plugin-next` plus `eslint-plugin-react-hooks`, with `no-html-link-for-pages` pointed at `app`; (B) `eslint-config-next`. · my recommendation: A, because the bundled plugins of B declare ESLint peers up to 9 only.

## 4. Proposed contract changes

- C-004 accepted as written (additive).
- Carried forward, all additive: a `Permission` name union once the permission list exists; the sign-in and refresh path constants from D-002 (the `noRefreshPaths` list will read them); a default page size per list if one ever differs from `DEFAULT_PAGE_SIZE`; the later change that makes `constraints` required (conditions in section 1).

## 5. Needs from the other agent

- The real error envelope for unknown routes: the dev API's 404 still has no `message`, `details` or `requestId` (D-002 says this is expected until the backend's instruction 2). Observed again on 2026-11-04 at commit 85abf40.
- The auth contract: sign-in, sign-up and refresh endpoints with request and response types, the path constants, and the status of a failed refresh. The client's refresh function and `noRefreshPaths` wait for it.
- Confirmation, with an end-to-end test, that every 429 sends `Retry-After` in whole seconds.
- Constraint names for upload errors (count, size, type), before the asset form.
- From the deployment owner: the Vercel project, its two variables and the dev domain steps, which D-002 section 6 says follow the merge of the shell. The shell is merged, so these are now due; gate G1-F cannot close without them.

## 6. Rule conflicts and waiver requests

- None.

## 7. Risks noticed

- My own errors this period: I placed the world folder under the wrong group in the shell instructions' result and my route test could not see it (fixed in #19 with a guard); my first part 1 script printed "created 7 files" without checking that the folder existed, after `git rm` had emptied it, so nothing was written (the later script verifies each file); my first command list in F-001 started from the wrong branch. Likelihood of similar slips is lower now that scripts verify their own result.
- The client has no request timeout, so a hung request waits for the browser's default. Adding `AbortSignal.timeout` belongs with the first screens. Likelihood: certain on a sleeping host.
- The idempotency fingerprint does not support files or blobs. The asset form with images (up to three, 5 MB) needs a different fingerprint, such as name, size and last-modified time. It is a known limit, noted in the code.
- Successful responses are trusted to match the contract type and are not validated at runtime. If the API drifts from the contract, the failure shows up in the screen, not at the boundary.
- `fake-fetch.ts` is test support but lives in `lib/` next to production files. Nothing imports it; it can move to a test folder when one exists.
- The dev API sleeps when idle, so the first request can take about a minute, though the two calls on 2026-11-04 answered in about a second. Any smoke test on the web host needs a long first timeout.
- The owner's network is unreliable: installs showed many registry timeouts and the last clone failed on DNS. This slows every fresh-clone check.
- `<html lang="en">` is a placeholder until the URL decision.

## 8. Owner's notes (written by you)

- 5xx retry: I accept option A (one request per call; a retry is offered and reuses the same key; the query client retries reads at most twice).
- Language in the URL: decided by the controlling agent in the next directive.
- Lint plugin for Next: stays deferred until the design directive.
- Update since this entry was drafted: the Render Health Check Path is now /api/v1/health/live and the dev API serves /api/v1/health/live (backend 2b-1 and 2b-2, live on dev).
- Fresh-clone check: the substitute check passed; the real clone waits for GitHub to be reachable.

---

# Entry F-001
Date: 2026-10-27 · Phase: 1 · Answers directives D-001 and D-001A · PRs: #6 (merged, web app). Reviewed, not authored: #7 (C-001) and the C-002 branch.
Status: ready to send

## 1. Done since the last entry

Instruction report for D-001 as amended by D-001A:

| Instruction | Report |
|---|---|
| 1. Next.js app, config, /api rewrite | **Done.** Acceptance (a), (b) and (c) evidenced below; PR #6 merged. |
| 2. Design tokens and components | **Not done, on hold** under D-001A. Nothing built; legacy files not requested. |
| 3. App shell (structure only) | **Not done, not started.** Next in order. |
| 4. Typed API client | **Not done, not started.** Waits for the merged C-001; the review is below. |

Instruction 1:
- The placeholder is removed and `apps/web` is a fresh Next.js 16.4.3 App Router app on React 19.3.1, strict TypeScript, with `app/`, `features/`, `components/ui/`, `lib/`, `copy/`, `config/`, and one page at `/` inside the `(public)` layout using browser-default markup and text from `copy/` · evidence: PR #6 file list (19 files changed); `pnpm --filter @ajc/web build` output showing route `/` and `/_not-found`.
- (a) Typecheck passes on a tree with `.next` and `next-env.d.ts` removed · evidence: `rm -rf apps/web/.next apps/web/next-env.d.ts && pnpm --filter @ajc/web typecheck` printed "Types generated successfully" with no tsc errors. Build passes with `NODE_ENV=production` · evidence: `NODE_ENV=production pnpm --filter @ajc/web build` printed "Compiled successfully" and finished TypeScript.
- (a) The build leaves tracked files untouched · evidence: on main, `pnpm --filter @ajc/web build` followed by `git status --short` printed nothing.
- (b) Config tests · evidence: `pnpm test` shows `apps/web/src/config/env.spec.ts (19 tests)` passing, including "accepts the values in .env.example when they are parsed as a dotenv file" and the missing, blank, malformed and wrong-environment cases.
- Validation happens at build · evidence: with `.env.local` moved aside, `pnpm --filter @ajc/web build` failed with `ConfigError` listing both `API_ORIGIN is required` and `APP_ENV must be one of: dev, production`.
- Validation happens at start · evidence: with `.env.local` moved aside, `pnpm --filter @ajc/web start; echo "exit=$?"` printed the same `ConfigError` and `exit=1`. The server prints "Ready" before it fails to load `next.config.ts`, but the process exits non-zero.
- (c) The rewrite reaches the API · evidence: with `API_ORIGIN=https://api-dev.ajc-gallery.com` from `.env.local`, `pnpm --filter @ajc/web start` in one terminal and `curl -i --max-time 150 http://localhost:3000/api/v1/does-not-exist` in another returned `HTTP/1.1 404 Not Found`, `content-type: application/json`, headers `rndr-id` and `x-render-origin-server: Render`, and the body `{"code":"NOT_FOUND"}`.
- Whole local gate green · evidence: `pnpm verify` run to the end (typecheck, eslint, boundaries, guards, 19 tests, build of contracts, web and api); `pnpm lint` passes with default exports in `page.tsx`, `layout.tsx` and `next.config.ts` under the lint override from PR #4.
- CI green on PR #6 · evidence: `gh pr checks` shows boundaries, static, unit and web all successful.
- Dependencies (next 16.4.3, react and react-dom 19.3.1, @types/react and @types/react-dom 19.3.0) are recorded in `docs/DEPENDENCIES.md` with a line each, and the CSS approach is recorded as "none yet" because D-001A holds design · evidence: file diff in PR #6.
- PR size: 799 added lines, of which 562 are `pnpm-lock.yaml`; 237 count toward S-10 · evidence: the merge summary pasted after the pull.
- The `typecheck` script is `next typegen && tsc --noEmit`, not bare `tsc --noEmit`. This is allowed by the controller's clarification 3. `typegen` loads `next.config.ts`, which validates the config, so every job that typechecks needs `API_ORIGIN` and `APP_ENV` · evidence: PRs #4 and #5 merged with all four jobs green.
- No route bypasses the `/api` rewrite. The rewrite is `/api/:path*` to `${API_ORIGIN}/api/:path*` · evidence: `apps/web/next.config.ts` in PR #6.

Review of record for C-001 (PR #7, five files `errors.ts`, `pagination.ts`, `idempotency.ts`, `health.ts`, `index.ts`) · evidence: the files as pasted by the owner, read against the Frontend document's error table.
- Enough as written: the error envelope and narrowing on `code`; `PageResponse<T>`; the idempotency header name and minimum length; the `readonly` arrays; the `details: null` convention for the other codes.
- Missing for the client, each now covered by C-002: a code for 401 (`UNAUTHENTICATED`); a code for 500 (`INTERNAL_ERROR`); a statement that `CONFIRMATION_REQUIRED` covers a missing, expired or mismatched token; the HTTP status of each code; a field-path convention; the `Retry-After` header on 429; the maximum length and pattern of the idempotency key (C-03); `PageQuery` and the default page size; a note that `message` is for logs only.
- Health types are not used by the browser.

Review of record for C-002 · evidence: the five changed or new files as pasted.
- Accepted as written. `ERROR_HTTP_STATUS` with `satisfies Record<ErrorCode, number>` means a new code without a status fails to compile, which suits the client's mapping table. `IDEMPOTENCY_KEY_MAX_LENGTH` of 64 and the pattern accept a UUID (36 characters). `DEFAULT_PAGE_SIZE` of 15 matches the Frontend document's full-type list.

## 2. Not verified

- **The rewrite on the dev host.** The proof above ran through `localhost:3000`. The gate G1-F asks for the same 404 through `dev.ajc-gallery.com`; that waits for the owner to create the Vercel project and deploy. Nothing about Vercel's behaviour is claimed here.
- **Type narrowing on `ApiErrorBody`.** Checked only in my sandbox (Node 22, stub copies of the C-001 files). Not run on the owner's machine; the client tests in instruction 4 will cover it.
- **The `.js` import clash in the C-001 files** (Turbopack could not resolve `./errors.js`) was seen only in my sandbox. It is superseded by the controller's ruling that contracts gets a real build, but I have not seen that build, so I cannot say whether `transpilePackages` stays needed.
- **Accessibility, Core Web Vitals and bundle size of `/`:** not measured. The page is browser-default markup, and no budget gate exists yet.
- **First-request latency through the rewrite.** The dev API sleeps when idle; the delay of the proof above was not recorded.

## 3. Blocked or decision needed

- **Contracts runtime from `dist`, and what runs before it is built** · options: (A) the deployment owner makes CI (`unit`, `static`, `web`) and `pnpm verify:fast` build contracts before typecheck, test and the web build, so a fresh checkout works; (B) package `exports` conditions so tests and the dev server read the source; (C) client tests import only types. · my recommendation: A, because it needs no conditions in the packages and C cannot work (the client must import `ERROR_CODES` at runtime). I will re-test the web build the day the contracts build merges.
- **A 401 on sign-in must not trigger the refresh-and-retry rule** · options: (A) a distinct code such as `INVALID_CREDENTIALS`; (B) the client never refresh-retries requests to the sign-in and refresh endpoints, with those two paths as contract constants. · my recommendation: B, because sign-in must answer identically for known and unknown emails (P-05) and a distinct code works against that. This is for the auth contract and the next directive; I raise it now so it is not forgotten.
- **Lint plugin for Next (deferred by the controller to the design directive; recommendation recorded here)** · options: (A) `@next/eslint-plugin-next` plus `eslint-plugin-react-hooks`; (B) `eslint-config-next`. · my recommendation: A. Registry metadata shows `eslint-config-next` bundles `eslint-plugin-react`, `eslint-plugin-import` and `eslint-plugin-jsx-a11y`, whose declared ESLint peer ranges stop at 9, while `eslint-plugin-react-hooks` allows 10 and `@next/eslint-plugin-next` declares no peer. In my sandbox the Next plugin loaded and ran under ESLint 10.12.0 (not combined with the repository config). Its `no-html-link-for-pages` rule complains when there is no `pages/` directory, so it needs to be off or pointed at `app`.

## 4. Proposed contract changes

- C-002 accepted as written (additive; nothing removed or renamed).
- Carried forward, not proposed yet: a `Permission` name union once the permission list exists (today `MissingPermissionDetails.permission` is a plain string); an asset-list-specific page size if it ever differs from `DEFAULT_PAGE_SIZE`; the sign-in and refresh path constants named in section 3. All additive.

## 5. Needs from the other agent

- The unknown-route 404 returned by the dev API in the rewrite proof has the body `{"code":"NOT_FOUND"}` only: no `message`, `details` or `requestId`. The contract says every non-2xx body is the full envelope, and the error toast shows the `requestId`. Please confirm whether unknown routes are meant to carry the full envelope; until then the client will treat a body without `requestId` as an envelope-less error and show a generic message.
- The API sends `Retry-After` in whole seconds on every 429, covered by an end-to-end test, as the C-002 comment promises. The client reads it from the header.
- Whether `/health/live` and `/health/ready` are under `/api/v1` or at the root. The `/api` rewrite reaches only the first; the web app does not call health, but the web smoke test needs to know.
- Before the sign-in screens: the sign-in, sign-up and refresh endpoints, their request and response types, and the status of a failed refresh.

## 6. Rule conflicts and waiver requests

- None.

## 7. Risks noticed

- The rewrite destination is written into the build (`.next/routes-manifest.json`). Changing `API_ORIGIN` on the host needs a rebuild, not a restart. Likelihood: certain; impact: a wrong or missing variable on Vercel gives a build error, which is the intended behaviour.
- `pnpm install` took about 8 minutes on the owner's network with many registry timeouts. The lockfile was resolved, so CI and later installs should be faster. Likelihood of repeating locally: moderate.
- My own error: the first command list used `git checkout -b` without switching to main, so the branch inherited the C-001 commit. Corrected: all command lists now start with `git switch main && git pull`. A second slip of mine: my first tsconfig check compared against the placeholder and proved nothing; it was redone on main (section 1).
- The empty-folder files were committed as `.gitKeep`, while the repository convention is `.gitkeep`. Harmless, and they disappear when the folders get files.
- `<html lang="en">` is a placeholder; the owner decides the product language.
- The dev API sleeps when idle, so the first request through the rewrite can take about a minute. Any smoke test on the web host needs a long first timeout.

## 8. Owner's notes axce-
- Language: the app will have 2 laguages eng and french
- I accept the agent's recommendation for sign-in 401 handling (no refresh-retry on the sign-in and refresh endpoints).
- Lint plugin work waits for the design directive.
- 5xx retry: I accept option A (one request per call; a retry is offered and reuses the same key; the query client retries reads at most twice).
- Language in the URL: leave to the controlling agent.
- Lint plugin for Next: stays deferred until the design directive.
- Note: the Render Health Check Path has been changed to /api/v1/health/live since this entry was drafted, and the dev API now serves /api/v1/health/live (backend 2b-1, live on dev).
- Fresh-clone check: result pasted to the frontend chat separately..
-