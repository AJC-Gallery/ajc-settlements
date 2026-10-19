import tseslint from "typescript-eslint";

const ENV_MESSAGE =
  "process.env is read only in config/ (S-07 / backend constraints). Import the validated config instead.";

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/coverage/**"] },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-console": "error",
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 40, skipBlankLines: true, skipComments: true }],
      "max-params": ["error", 4],
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportDefaultDeclaration",
          message: "No default exports (S-04). Use a named export.",
        },
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: ENV_MESSAGE,
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // The only places allowed to read process.env.
    files: ["apps/*/src/config/**", "apps/*/src/platform/**"],
    rules: { "no-restricted-syntax": ["error", { selector: "ExportDefaultDeclaration", message: "No default exports (S-04)." }] },
  },
  {
    // Next.js requires default exports and fixed file names in app/.
    files: ["apps/web/src/app/**/{page,layout,loading,error,not-found,template}.tsx", "apps/web/*.config.{ts,mjs}"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    files: ["**/*.spec.ts", "**/*.test.ts", "test/**/*.ts"],
    rules: { "max-lines-per-function": "off" },
  },
);
