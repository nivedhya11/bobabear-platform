import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored design-system reference kits and Figma tooling — not shipped
    // app code, so they shouldn't gate `npm run lint`.
    "Boba_Bear_Design_System_Updated/**",
    "Boba Bear Landing Page Wireframe Updated/**",
    "figma-sync/**",
  ]),
]);

export default eslintConfig;
