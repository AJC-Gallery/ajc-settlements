# Directive D-004 → frontend
Date: 2026-11-09 · Answers entries: F-003 (received from the owner in full) · Amends: D-003-frontend only where this file says so

## 1. Rulings

- **F-003 is accepted.** Language routing (#27, #28, #32) and the request timeout (#35) are done and evidenced.
- **Closed from "Not verified" (section 2 of F-003):**
  - Real fresh clone: the owner cloned `main` at a3a9a9c from GitHub, ran `pnpm install --frozen-lockfile`, `pnpm test` (31 files, 389 tests) and `pnpm verify` (typecheck, eslint, boundaries, guards, test, build of contracts, api and web) with no errors. D-003 instruction 3 and the acceptance of instruction 1 are closed.
  - PR #35 checks: green on main after merge (the five required checks). Closed.
  - Dev API real error envelope: the owner's `curl` to `/api/v1/does-not-exist` on `api-dev.ajc-gallery.com` returned the JSON 404 envelope with `requestId` equal to `x-request-id`. Closed.
  - GitHub reachability: confirmed (HTTP/2 200).
- **Still open:** rewrite, `proxy.ts` and `/language` on Vercel (waits for the Vercel project, which the owner is creating); browser behaviour; hung body under real fetch; contracts in the web bundle (arrives with the first screen using the client); accessibility and performance (design phase); French wording (provisional).
- **`Secure` on the language cookie: option A.** Set `Secure` when the request is https, decided from the request alone (no environment variable); leave it off on plain http (local development). Behind Vercel the request's protocol is https, so read it the way Next exposes it (the request URL's protocol, falling back to `x-forwarded-proto`). D-003's attribute list is amended accordingly. · acceptance: tests for https (attribute present), http (absent), and `x-forwarded-proto: https` on an http URL (present).
- **Timeout deviation accepted.** `setTimeout` with `AbortController` instead of `AbortSignal.timeout`, because the timer must be clearable and testable. The limit, the constant and the behaviour are as ruled.
- **Lint plugin for Next.** Still deferred to the design directive; your recommendation (`@next/eslint-plugin-next` plus `eslint-plugin-react-hooks`, not `eslint-config-next`) is recorded.
- **Risks noted in section 7 of F-003** are accepted as listed. Two get an owner action: unknown-URL 404 page and the missing-`Referer` fallback are revisited in the design directive, not before.

## 2. Instructions, in order

1. **`Secure` on the language cookie as ruled above.** Small change, one PR. · acceptance: the three tests above; `pnpm verify` green.
2. **Wait for the Vercel result.** When the owner reports that `dev.ajc-gallery.com` is live, you will receive the exact `curl` results from the owner. Then you check, in the next entry, that they match the behaviour you proved locally (307 to `/en`, `/fr`, the `/language` POST and cookie with `Secure` present, the API 404 through the rewrite).

On hold, unchanged: design (D-001A); sign-in, sign-up and refresh screens (they wait for the auth contract in the backend's next directive).

## 3. Contract sequence

- Nothing new. `Locale`, the language preference, the `Permission` union and the auth path constants arrive with identity, from the backend side, in a later directive.

## 4. Waivers

- None.

## 5. Document changes

- Frontend Engineering Document, cookie section: the language cookie carries `Secure` on https. Recorded here until I reissue the document.

## 6. Next gate

- **G1-F (structure)** closes when the app is on `dev.ajc-gallery.com`, `/api/v1/does-not-exist` through that domain returns the API's 404 envelope, and the `web` check is green and required (it is). Only the Vercel project remains; it is the owner's step and does not need you.

## 7. Questions back to the owner

- None.

Write your reply as entry F-004 in `docs/feedback/frontend-feedback.md` (newest entry on top), opening "Answers directive D-004".