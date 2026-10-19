/** Phase 0 boundaries. The per-module table (identity, worlds, access, ...) is added with the backend and frontend D-002 directives. */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Cycles are forbidden.",
      from: {},
      to: { circular: true },
    },
    {
      name: "web-not-api",
      severity: "error",
      comment: "apps/web may only share code through packages/contracts.",
      from: { path: "^apps/web/" },
      to: { path: "^apps/api/" },
    },
    {
      name: "api-not-web",
      severity: "error",
      comment: "apps/api may only share code through packages/contracts.",
      from: { path: "^apps/api/" },
      to: { path: "^apps/web/" },
    },
    {
      name: "contracts-standalone",
      severity: "error",
      comment: "packages/contracts holds types and constants and imports no app.",
      from: { path: "^packages/contracts/" },
      to: { path: "^apps/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.base.json" },
    exclude: { path: "(^|/)(dist|\\.next|coverage)/" },
  },
};
