# Directive D-001 → frontend
Date: 2026-10-26 · Answers entries: none (first directive; Phase 1 opens)

You are the frontend agent. Read this with the Standard, the Environment and Coding Protocol, the Master document, the Frontend Engineering Document and the Agent Coordination Protocol. Where this directive and a higher document disagree, the higher document wins and you say so in your entry (section 3).

This directive covers the first slice of Phase 1: the real Next.js app, design tokens, the app shell and the typed API client. Sign-in, worlds and asset screens come later. Do not start them.

## 1. Rulings

- **`apps/web` is replaced, not extended.** The current contents are a placeholder (`apps/web/src/placeholder.ts`). The legacy Vite code is reference only; nothing is copied.
- **The web app runs on Vercel**, not Render. It needs a server (server-rendered public pages, middleware, the `/api` rewrite). Rests on: Master document N4, Frontend document "Configuration".
- **TypeScript, Node and pnpm are pinned at the repo root and are not yours to change.** TypeScript is 6.0.x because the lint tooling supports versions below 6.1. Pick the Next.js and React versions yourself, pin them exactly, and put each in `docs/DEPENDENCIES.md` with a line (S-08). If your chosen Next.js version will not typecheck or build under the pinned TypeScript, stop and write it up in section 3 with options.
- **Scripts in `apps/web/package.json`:** `typecheck` runs `tsc --noEmit`; `build` runs `next build`. The CI `web` job runs exactly those two (`pnpm --filter @ajc/web typecheck` and `... build`), and the root `pnpm build` runs every package's `build`. Keep the names.
- **Two non-secret variables, with these names:** `API_ORIGIN` (the API's origin, used by the server-side `/api` rewrite; dev value `https://api-dev.ajc-gallery.com`) and `APP_ENV` (`dev` or `production`). Both are validated at build and at start and listed with a purpose in `apps/web/.env.example`. Nothing secret ever carries the `NEXT_PUBLIC_` prefix. I set them on the host.
- **`process.env` is read only under `apps/web/src/config/`** (the lint rule allows `apps/*/src/config/**` and `apps/*/src/platform/**` only). `next.config` takes the validated values from that module. If the framework makes that impossible, stop and write it up in section 3; do not widen the lint rule yourself.
- **Next.js framework files may use default exports** (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`, `middleware.ts`, `next.config.*`). Everywhere else S-04 holds: named exports only. I am adding the lint override for the framework files in my own change; until it merges, your `pnpm lint` may flag them, and you say so in your entry rather than editing `eslint.config.mjs`.
- **Folder names matter to a guard.** `scripts/guards.sh` fails the build on any folder under `src` whose name starts with: tenanc, money, payment, document, vault, pricing, billing, agent, client, import, invoice. So no `pricing/` route, no `clients/` or `client/` folder, no `import/`. The API client is a file (`lib/api.ts` or similar), not a folder with a reserved name.
- **Nothing outside iteration 1 is built** (S-13). The legacy landing page's "10,000+ landlords", "24/7 support" and the ₦ price are not carried over. CFA is the only currency, and no price is shown yet.

## 2. Instructions, in order

One change set per instruction, each at most 400 changed lines (S-10). Deliver each as complete files with repository paths, plus the exact commands for me to run.

1. **The Next.js app.** Replace the placeholder in `apps/web` with a fresh Next.js App Router app in strict TypeScript, with `strict` and `noUncheckedIndexedAccess` as the backend (C-01), the folder layout in the Frontend document (`app/`, `features/`, `components/ui/`, `lib/`, `copy/`, plus `config/`), and one page at `/` that renders inside the app shell's public layout. The `/api` rewrite goes in: `/api/:path*` forwards to `API_ORIGIN`, so the browser only ever talks to one origin. State in your entry any route that must bypass the rewrite. Remove `apps/web/src/placeholder.ts` and its use of `@ajc/contracts`. Record the choice of CSS approach and each new dependency in `docs/DEPENDENCIES.md`. · acceptance: (a) `pnpm --filter @ajc/web typecheck` and `pnpm --filter @ajc/web build` pass on my machine, with `NODE_ENV=production` for the build; (b) a test that the config module rejects a missing or malformed `API_ORIGIN` or `APP_ENV` and accepts `.env.example`; (c) with `API_ORIGIN=https://api-dev.ajc-gallery.com`, starting the built app and requesting `/api/v1/does-not-exist` returns the API's 404 (a JSON body whose `code` is `NOT_FOUND`), which I paste back as proof the rewrite works. The dev API sleeps when idle, so the first request may take about a minute.
2. **Design tokens and the first components.** The tokens in the Frontend document's design table, defined once (CSS variables or the framework theme), then, in the order the document lists them, the button, the glass card, a page header, a spinner, an empty state and the error boundary. A variant exists only when a screen uses it. Every label comes from `copy/`. Accessibility is part of done: visible focus ring, keyboard operation, icon-only buttons with names, text on glass at 4.5:1 or better against the rendered background, and `prefers-reduced-motion` respected. Before fixing the tokens, ask the owner for the legacy web app's root HTML or global CSS (where the page background is set) and its `GlassCard` and `CustomGlassButton` components, to confirm the page ground is dark; the Frontend document marks that as unverified. · acceptance: component tests (Testing Library) named "does X when Y" for each component's states; a contrast check you can state numerically in your entry for the text-on-glass pairs, computed against the real background colours; `pnpm verify` green.
3. **The app shell.** One navigation configuration feeding both the desktop sidebar and the mobile menu; the public layout and the signed-in layout (`(public)` and `(app)/worlds/[worldId]`), with no data fetching yet; fixtures typed from `@ajc/contracts` for anything the shell shows. Both layouts are first-class. · acceptance: tests that the desktop and mobile navigation render the same items from the one configuration; the layouts render at a narrow and a wide viewport (state which sizes you checked and how); `pnpm verify` green. After merge the owner creates the Vercel project and deploys it to dev; I will give the owner the steps.
4. **The typed API client.** Starts only when the owner hands you the merged contract change C-001 from the backend side. First review C-001 and report in your entry whether the error envelope, the page shape, the idempotency constants and the health types are enough for the client, and name anything missing as a proposed contract change (section 4 of your entry), not a local type. Then `lib/api`: one typed fetch wrapper that sends cookies, sets `Idempotency-Key` on creates, parses the error envelope by `code`, and returns contract types; the idempotency-key lifecycle (a key per submit attempt, reused on a retry, new when the input is edited); the TanStack Query client and a query-key factory pattern. No component calls `fetch` directly and no type is declared by hand. · acceptance: unit tests (Vitest, `*.spec.ts` beside the file) for the error mapping per the Frontend document's table (400, 401 with one refresh and one retry, 403 naming the permission, 404 identical for missing and not allowed, 409 per code, 429, 5xx retried with the same key) and for the idempotency lifecycle; a type test or a fixture that fails to compile when a contract type changes; `pnpm verify` green.

Not now: sign-in and sign-up screens, any call to a real endpoint beyond the health and 404 checks, the landing page content beyond the shell, world and asset screens, the pricing section, the end-to-end test setup (it needs the real API in CI; that comes with a later directive).

## 3. Contract sequence

- The backend agent authors and merges C-001 first. You do not edit `packages/contracts` (Master document, ownership). You review it when I hand it to you; you propose any change in your entry, section 4.
- Instructions 1 to 3 do not depend on the backend and can proceed now. Instruction 4 waits for C-001 to merge.
- When you need an endpoint or behaviour from the backend, write it under "Needs from the other agent" (section 5 of your entry). You never contact the backend agent.
- **What the deployment owner (me) delivers.** You do not edit CI, hosting, secrets, `scripts/` or lint and boundary configuration. I deliver: the lint override for Next.js framework files; the web-layer boundary rules (the layering table in the Frontend document) in dependency-cruiser; a lint step in the `web` CI job once the Next.js ESLint approach is settled (tell me in your entry which ESLint plugin or config the framework needs, and I add it to the root configuration); the Vercel project, `API_ORIGIN` and `APP_ENV` on the host, and the dev domain `dev.ajc-gallery.com`.

## 4. Waivers

- None requested. W-001 (solo review, expiry 2027-04-14) already covers pull-request review, so my review is the only one.

## 5. Document changes

- Frontend Engineering Document, configuration: the two variables are named `API_ORIGIN` and `APP_ENV`; `process.env` is read only under `apps/web/src/config/`.
- Frontend Engineering Document, deployment: the web app is on Vercel. Deploy hooks on Vercel build a branch, not a commit, so the dev web deploy follows the main branch through Vercel's Git integration, and the production web release mechanism is designed later by me.
- I record these changes here until I reissue the document; this directive does not loosen any rule.

## 6. Next gate

- **Gate G1-F (foundations, frontend slice)** closes when: instructions 1 to 4 are merged; the app is deployed on `dev.ajc-gallery.com` and the `/api` rewrite works on the dev host (a request to `/api/v1/does-not-exist` through the dev domain returns the API's 404 envelope); the `web` CI job is green and required; and your entry F-001 reports each instruction as done, not done or contested, with pasted command output as evidence. Then D-002 starts sign-in and the worlds screens, against the contract.

## 7. Questions back to the owner

- Please paste into the frontend chat the legacy files named in instruction 2 (root HTML or global CSS, `GlassCard`, `CustomGlassButton`) when the frontend agent asks. Nothing else from the legacy repository is needed.

Write your reply as entry F-001 in `docs/feedback/frontend-feedback.md`, opening with "Answers directive D-001".
