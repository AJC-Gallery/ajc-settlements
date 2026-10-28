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
| @nestjs/common (12.3.2) | apps/api | The API framework chosen in the Protocol: pipes, filters and routing for the one-gate architecture. Node 20 or later | MIT |
| class-validator (0.15.1), class-transformer (0.5.1) | apps/api | DTO validation with whitelist and forbidNonWhitelisted (C-02); required peers of @nestjs/common | MIT |
| reflect-metadata (0.2.2) | apps/api | Metadata that Nest and the validators read; required peer of @nestjs/common | Apache-2.0 |
| rxjs (7.8.2) | apps/api | Required peer of @nestjs/common | Apache-2.0 |
CSS approach: none yet. D-001A puts design on hold until the owner supplies a new design, so no styling library is chosen.