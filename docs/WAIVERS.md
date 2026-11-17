# Waivers

A waiver has an owner and an expiry date. No waiver is permanent. The product owner approves waivers.

| ID | Rule | Why it cannot be met | Owner | Granted | Expires |
|----|------|----------------------|-------|---------|---------|
| W-001 | Master doc, handoff path: a party other than the author reviews every PR | One human, and agents cannot approve PRs. Replaced by: green CI + the Standard's checklist ticked in the PR description + the owner's own review | Product owner | 2026-10-14 | 2027-04-14 |
| W-002 | `pnpm audit --audit-level=high` must pass (GHSA-fc5q-39xc-vjpf, picomatch ReDoS through repeated extglobs, versions up to 4.0.7) | No patched version exists. The package is reached only through dev tooling (dependency-cruiser, typescript-eslint via tinyglobby and fdir); nothing in apps/api or apps/web at runtime uses it, and it never receives untrusted patterns. Replaced by: the advisory is ignored by ID only, so any other high advisory still fails the build; re-checked weekly | Controlling agent | 2026-11-17 | 2026-12-01 |
