# Dependencies

One line per dependency (S-08): what it is for, licence, and why nothing already present does the job. Exact versions live in pnpm-lock.yaml.

| Package | Where | Purpose | Licence |
|---------|-------|---------|---------|
| typescript | root | One compiler version for API and web. Pinned to 6.0.x because typescript-eslint supports TypeScript below 6.1 | Apache-2.0 |
| eslint, typescript-eslint | root | Lint rules that fail the build | MIT |
| dependency-cruiser | root | Enforces the import boundaries | MIT |
| vitest | root | Unit test runner | MIT |
| @types/node | root | Node typings, matched to the Node 24 line | MIT |
