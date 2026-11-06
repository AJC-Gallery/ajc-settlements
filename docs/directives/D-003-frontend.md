# Directive D-003 → frontend
Date: 2026-11-06 · Answers entries: F-002 (received from the owner in full) · Amends: D-001-frontend, D-001A, D-002 only where this file says so

## 1. Rulings

- **F-002 is accepted.** The shell and the typed client are done. Not verified stays open: the real fresh-clone check, the rewrite through `dev.ajc-gallery.com`, and any browser behaviour. The owner has since pasted `gh pr checks` for #19 to #25, all five checks green, which closes the check-result item for #19 to #22.
- **The route-group defect (PR #19) is closed.** Your guard test is the evidence; no further action.
- **5xx and retry.** Option A: the wrapper makes one request per call; a retry is offered to the person and reuses the same idempotency key; reads are retried at most twice by the query client. Rests on: the Frontend Engineering Document (error table), which ranks above a directive's acceptance text. D-001's wording "5xx retried with the same key" is read as "offered".
- **Language in the URL: option C.** Public pages carry a `/en` or `/fr` prefix; signed-in screens have no prefix and use the person's language. Until the backend stores a preference on the person (it comes with identity in a later directive), the signed-in language comes from a cookie set by the language switch, then the browser's language, then `en`. The cookie is not a secret: no `HttpOnly` is needed; `SameSite=Lax`, `Path=/`, one year. `<html lang>` is set per route group. Rests on: your recommendation in F-002 section 3. This is the owner's product area, so the owner may overrule it before the first public page ships; only one page exists today.
- **Lint plugin for Next.** Still deferred to the design directive; recommendation recorded.
- **Contracts and the web bundle.** The first screen that uses the client proves the compiled contracts load in the web bundle; report it then.
- **French wording.** Provisional and yours; the owner will find a French reader later. Decision 5 (Assets or Settlements, Tenant or Client) stays open.

## 2. Instructions, in order

1. **Language routing as ruled above.** Locale constants and the cookie name in one file in `copy/` or `lib/`; the language switch; the redirect from `/` to the prefixed public home using cookie, then browser language, then `en`; `<html lang>` per route group; every public link built by the navigation configuration so the prefix is added in one place. The signed-in group stays unprefixed. · acceptance: tests for the choice order (cookie, browser, default), for an unknown cookie value falling back, and that no hard-coded internal link exists; the build route table shows the public home under both languages; `pnpm verify` green on a fresh checkout.
2. **A default request timeout in the client.** `AbortSignal.timeout` (30 seconds, one named constant), combined with the caller's own signal so either aborts; a timeout becomes a `network`-kind failure. Nothing else about the client changes. · acceptance: tests for the timeout, for the caller's abort still rethrown unchanged, and for no timer left running after a successful call.
3. **When GitHub is reachable:** run the real fresh clone check and report it in F-003.

On hold, unchanged: design (D-001A); sign-in, sign-up and refresh screens (they wait for the auth contract in the backend's next directive).

## 3. Contract sequence

- Nothing new. A shared `Locale` constant (`"en" | "fr"`) and the person's language preference will arrive as a contract change with identity; the web's own constant moves to it then.

## 4. Waivers

- None.

## 5. Document changes

- Frontend Engineering Document, routing and language sections: public routes are prefixed `/en` and `/fr`; signed-in routes are not. Recorded here until I reissue the document.

## 6. Next gate

- **G1-F (structure)** still closes when: instructions 1, 3 and 4 of D-001 are merged (done); the app is on `dev.ajc-gallery.com` and `/api/v1/does-not-exist` through that domain returns the API's 404; the `web` check is green and required. The Vercel project is mine and the owner's; I give the owner the steps now that the shell is merged. This directive's instructions do not block it.

## 7. Questions back to the owner

- None.

Write your reply as entry F-003 in `docs/feedback/frontend-feedback.md` (newest entry on top), opening "Answers directive D-003".
