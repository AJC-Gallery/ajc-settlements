# Directive D-001A → frontend
Date: 2026-10-26 · Amends: D-001-frontend (instructions 2 and 3, and gate G1-F) · Answers entries: none

This amendment is written because the owner is rethinking the visual design (look and themes only; functionality is unchanged). Everything in D-001-frontend still applies unless this file says otherwise. Where they differ, this file wins.

## 1. Rulings

- **The legacy design tokens are not to be implemented.** The Frontend document's design table described the legacy look; the owner will supply a new design. Until it arrives, no colour, radius, blur, font or component styling decision is made. This is the owner's product decision, so it rests on no rule; it overrides the design section of the Frontend document for now.
- **The accessibility, responsive and five-states requirements of the Frontend document do not change.** They apply to whatever design arrives.

## 2. Instructions, in order

1. **Instruction 1 of D-001-frontend proceeds as written** (the Next.js app, config, `/api` rewrite, proof that the rewrite reaches the API's 404). Use only unstyled or browser-default markup for the one page at `/`, with its text from `copy/`.
2. **Instruction 2 of D-001-frontend (design tokens and components) is on hold.** Do not build it. Do not ask the owner for the legacy files. It restarts with a new directive once the owner has the new design.
3. **Instruction 3 of D-001-frontend (app shell) is reduced to structure only:** the route groups `(public)` and `(app)/worlds/[worldId]`, one navigation configuration that can feed a desktop and a mobile navigation, and fixtures typed from `@ajc/contracts`. No layout styling beyond what the framework needs to render. · acceptance: a test that the navigation configuration is the single source of items; `pnpm verify` green.
4. **Instruction 4 of D-001-frontend (typed API client) proceeds as written** once the owner hands you the merged contract change C-001.

## 3. Contract sequence

- Unchanged from D-001-frontend, section 3.

## 4. Waivers

- None.

## 5. Document changes

- Frontend Engineering Document, design section: marked "on hold; the owner supplies a new design". I record this here until I reissue the document.

## 6. Next gate

- **Gate G1-F is split.** G1-F (structure) closes when instructions 1, 3 and 4 above are merged, the app is on `dev.ajc-gallery.com` with the `/api` rewrite working, and F-001 reports each instruction as done, not done or contested. G1-F-design (tokens, components, styled shell) opens with the new design and closes under a later directive.

## 7. Questions back to the owner

- None. The owner supplies the new design when ready.

Write your reply as entry F-001 in `docs/feedback/frontend-feedback.md`, opening with "Answers directives D-001 and D-001A".
