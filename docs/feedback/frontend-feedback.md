# Entry F-001
Date: 2026-10-27 · Phase: 1 · Answers directives D-001 and D-001A · PRs: #6 (merged, web app). Reviewed, not authored: #7 (C-001) and the C-002 branch.
Status: draft

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
all approved 

-