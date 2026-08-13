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
    // Generated Vitest coverage report — not shipped app code.
    "coverage/**",
    // Compiled customer-auth service output (IMP-009) — not source.
    "dist-customer-auth/**",
    // Compiled workforce-auth service output (IMP-010) — not source.
    "dist-workforce-auth/**",
    // Compiled customer-commerce service output (IMP-024) — not source.
    "dist-customer-commerce/**",
    // Local tooling caches (Playwright browsers, etc.) — never linted.
    ".cache/**",
    // Playwright HTML reports / result dumps — not source.
    "playwright-report/**",
    "playwright-report-*/**",
    "test-results/**",
    "test-results-*/**",
    "artifacts/**",
  ]),
  // Configuration-boundary enforcement (ADR-015 / IMP-003): application
  // source must go through the centralized, typed configuration module
  // instead of reading `process.env` directly. The only approved
  // exceptions are the config module itself and the Next.js instrumentation
  // entry point (a documented, narrow framework-bootstrap exception — see
  // src/instrumentation.ts). Tests exercise the boundary with explicit
  // source objects, not by reading the real process environment.
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    ignores: [
      "src/platform/config/**",
      "src/instrumentation.ts",
      // The customer-auth HTTP service (IMP-009) is a standalone Node
      // process, not part of the Next.js web process — `main.ts` is its own
      // narrow, documented executable boundary, exactly like
      // `src/instrumentation.ts` above. Every other module under
      // `src/server/customer-auth/**` still goes through `./config.ts`.
      "src/server/customer-auth/main.ts",
      // The workforce-auth HTTP service (IMP-010) is a standalone Node
      // process — `main.ts` is its own narrow, documented executable
      // boundary, matching customer-auth above.
      "src/server/workforce-auth/main.ts",
      // The customer-commerce HTTP service (IMP-024) is a standalone Node
      // process — `main.ts` is its own narrow, documented executable
      // boundary, matching customer-auth / workforce-auth. `e2e-fake-main.ts`
      // is the E2E-only fake Payment entry (same process-env boundary).
      "src/server/customer-commerce/main.ts",
      "src/server/customer-commerce/e2e-fake-main.ts",
      "**/*.test.{ts,tsx}",
      // Pre-existing, out-of-scope legacy usage (NEXT_PUBLIC_SITE_URL /
      // NEXT_PUBLIC_GA_MEASUREMENT_ID) that predates IMP-003 and is wired
      // through the existing GitHub Pages deploy workflow. Reported as a
      // known limitation rather than migrated — see AGENTS.md section 29.
      "src/lib/site.ts",
      "src/components/Analytics.tsx",
    ],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message:
            "Do not read process.env directly. Import the typed configuration boundary from src/platform/config instead (see AGENTS.md).",
        },
      ],
    },
  },
  // Database-boundary enforcement (IMP-004): application source must go
  // through the centralized database module instead of importing the raw
  // Postgres driver or constructing a Pool directly. The only approved
  // exception is the database boundary itself.
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    ignores: ["src/platform/database/**", "**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "pg",
              message:
                "Do not import 'pg' directly. Use src/platform/database instead (see AGENTS.md).",
            },
            {
              name: "drizzle-orm/node-postgres",
              message:
                "Do not import 'drizzle-orm/node-postgres' directly. Use src/platform/database instead (see AGENTS.md).",
            },
            {
              name: "drizzle-orm/node-postgres/migrator",
              message:
                "Do not import the Drizzle migrator directly. Use src/platform/database instead (see AGENTS.md).",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
