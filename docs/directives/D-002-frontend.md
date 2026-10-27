# Directive D-002 → frontend
Date: 2026-10-27 · Answers entries: F-001 (received from the owner in full; the backend has not yet reported B-001, so this directive rules only on the frontend's entry and on contract items the frontend raised)

This is the directive the earlier clarifications referred to. It supersedes those clarifications where it differs. D-001 and D-001A still apply unless this file says otherwise.

## 1. Rulings

- **F-001 is accepted.** Instruction 1 of D-001 is done: the evidence is pasted command output (build, typecheck on a clean tree, 19 tests, build and start failing without the variables, the rewrite proof through localhost, CI green on PR #6). One part stays open under gate G1-F: the same 404 through `dev.ajc-gallery.com`, which waits for the Vercel project.
- **The reviews of C-001 and C-002 are the reviews of record.** C-002 may merge now. Rests on: D-001 section 3 (the frontend reviews each contract change before it merges).
- **Contracts at runtime and on a fresh checkout (F-001 section 3, first item).** Neither of your options alone. The contracts package gets a real build; its `exports` point `types` at the TypeScript source and `default` at the compiled output (backend change C-003). I deliver: a unit-test alias so `@ajc/contracts` resolves to the source in tests (so `pnpm test` works on a fresh checkout with no build), and CI steps that build contracts before any job that runs `next build`. You write client tests against the alias; you do not add `exports` conditions, build steps or aliases yourself. For local `next dev`, run `pnpm --filter @ajc/contracts build` first; document that line in your entry. Rests on: Master document (contracts are the only interface; I own CI and root configuration).
- **A 401 on sign-in (F-001 section 3, second item).** Your recommendation B is accepted: the client never refresh-retries requests to the sign-in and refresh endpoints, and those paths become contract constants. The backend adds them with the auth contract in the next directive. Rests on: P-05 (identical answers for known and unknown identities).
- **Lint plugin for Next.** Deferred as ruled; your recommendation (the Next plugin and the React hooks plugin, not the bundled config, with `no-html-link-for-pages` pointed at `app`) is recorded and will be used when the design directive opens.
- **The 404 body without `message`, `details` or `requestId`.** Expected, not a defect: the dev API is still the Phase 0 placeholder and returns only `{"code":"NOT_FOUND"}`. The backend replaces it with the real envelope in its instruction 2. Until then, treat a body without `requestId` as you propose (a generic message). Do not assume the envelope in any proof against the dev API before then.
- **`.gitKeep` file names.** Leave them; they disappear when the folders get files.
- **Health endpoint path.** Still open (I am waiting for the owner to supply the text of S-06). It does not affect any of your work: the web app does not call health, and the web smoke test will request `/`.

## 2. Instructions, in order

1. **Instruction 3 of D-001 as reduced by D-001A: the app shell, structure only.** Unchanged: the `(public)` and `(app)/worlds/[worldId]` route groups, one navigation configuration that can feed a desktop and a mobile navigation, fixtures only from `@ajc/contracts` types that exist, and the test that the configuration is the single source of items. Check the repository for the current content of any file you edit. · acceptance: as in D-001A section 2, item 3, plus `pnpm verify` green on a fresh checkout.
2. **Instruction 4 of D-001 (typed API client) stays on hold** until all three are true: C-002 merged, C-003 (the contracts build) merged, and my unit-test alias merged. The owner tells you when. Do not write client code before then. Acceptance as in D-001, plus: the client tests import contract constants through the alias, and `pnpm test` passes on a fresh clone with no prior build.
3. **After C-003 merges,** re-run `pnpm --filter @ajc/web build` against it and report the result in your next entry, with pasted output. Nothing else changes in `apps/web` for this.

## 3. Contract sequence

- C-002 merges now (backend). C-003, the contracts build layout, follows (backend authors; you check that the web build still passes with its script unchanged).
- Auth path constants and the auth endpoints' request and response types come with the backend's identity work in a later directive. Do not create sign-in or refresh code before they exist.

## 4. Waivers

- None.

## 5. Document changes

- Frontend Engineering Document, deployment: `typecheck` is `next typegen && tsc --noEmit`, so every job that typechecks needs `API_ORIGIN` and `APP_ENV`; the `/api` rewrite destination is fixed at build, so changing `API_ORIGIN` on a host needs a rebuild, not a restart. I record these here until I reissue the document.

## 6. Next gate

- **Gate G1-F (structure)** closes when: instruction 1 (done), instruction 3 above and instruction 4 are merged; the app is on `dev.ajc-gallery.com` and a request to `/api/v1/does-not-exist` through that domain returns the API's 404; the `web` CI job is green and required. The Vercel project and its two variables are mine and the owner's; I give the owner the steps after instruction 3 merges.

## 7. Questions back to the owner

- Which language should the product speak first: English, French, or both? `lang="en"` stays as a placeholder until the owner answers; the answer changes copy, not structure.

Write your reply as entry F-002 in `docs/feedback/frontend-feedback.md` (newest entry on top), opening "Answers directive D-002". F-001 itself is committed unchanged once the owner has filled section 8.
