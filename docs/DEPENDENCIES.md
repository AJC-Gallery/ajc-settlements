# Dependencies

One line per dependency (S-08): what it is for, licence, and why nothing already present does the job. Exact versions live in pnpm-lock.yaml.

| Package | Where | Purpose | Licence |
|---------|-------|---------|---------|
| typescript | root | One compiler version for API and web. Pinned to 6.0.x because typescript-eslint supports TypeScript below 6.1 | Apache-2.0 |
| eslint, typescript-eslint | root | Lint rules that fail the build | MIT |
| dependency-cruiser | root | Enforces the import boundaries | MIT |
| vitest | root | Unit test runner | MIT |
| @types/node | root | Node typings, matched to the Node 24 line | MIT |
| next (16.4.3) | apps/web | Web framework chosen in decision N1: server-rendered public pages, the /api rewrite and middleware. A static Vite app cannot do the rewrite on its host. Typechecks and builds under TypeScript 6.0.3 | MIT |
| react, react-dom (19.3.1) | apps/web | Required by Next.js; pinned to the version Next's peer range accepts | MIT |
| @types/react, @types/react-dom (19.3.0) | apps/web | Typings for React 19 under strict TypeScript | MIT |

CSS approach: none yet. D-001A puts design on hold until the owner supplies a new design, so no styling library is chosen.