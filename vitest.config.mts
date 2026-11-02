import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit-test configuration (deployment owner's file).
 * - Tests resolve @ajc/contracts to its TypeScript source, so `pnpm test` works on a
 *   fresh checkout with no prior build. Builds and hosts still use dist.
 * - Database tests are named *.int.spec.ts. They are not run here; the db job runs them.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@ajc/contracts": fileURLToPath(new URL("./packages/contracts/src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["apps/**/*.spec.ts", "packages/**/*.spec.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/*.int.spec.ts"],
  },
});
