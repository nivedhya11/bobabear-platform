import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Unit + component test config (Vitest). Playwright E2E specs under
// tests/e2e/ are intentionally excluded — they run through
// `playwright.config.ts` / `npm run test:e2e` instead.
//
// `vite-tsconfig-paths` reads the `@/* -> ./src/*` alias straight from
// tsconfig.json, so it is not duplicated here.
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      // See tests/setup/server-only-stub.ts — this alias is test-only and
      // does not affect the real Next.js client-bundle enforcement.
      "server-only": path.join(projectRoot, "tests/setup/server-only-stub.ts"),
    },
  },
  test: {
    // Session 3B1: `isolate: false` made jsdom cheaper to start in constrained
    // sandboxes, but Vitest module mocks then leak across files (last mock
    // factory wins for the whole worker). That produced intermittent failures
    // in AccountShell / Nav / location-selector / map-confirmation under
    // `mockReset: true` — blocking honest mandatory `npm run test` CI.
    // Per-file isolation is required for CI readiness; accept slower
    // environment setup over cross-suite mock pollution.
    fileParallelism: false,
    isolate: true,
    environment: "jsdom",
    globals: false,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      // IMP-011: DB-free access-control unit/service tests (CLI suite uses database config).
      "tests/access-control/**/*.test.ts",
      // IMP-013: static menu source ↔ checked-in manifest parity (no database).
      "tests/menu-parity/**/*.test.ts",
      // IMP-015: static menu ↔ pricing artifact paise parity (no database).
      "tests/pricing-parity/**/*.test.ts",
      // IMP-016: pure promotion engine / BOGO / allocation tests.
      "tests/promotions/**/*.test.ts",
      // IMP-016: coupon outcome tests (no database).
      "tests/promotion-coupons/**/*.test.ts",
      // IMP-016: zero-promotion pricing parity gate.
      "tests/promotion-pricing-parity/**/*.test.ts",
      // IMP-025A: static ordering-catalog identity parity (no database).
      "tests/ordering-catalog/**/*.test.ts",
      // IMP-027: Refund architecture boundary audits (no database).
      "tests/refund-architecture/**/*.test.ts",
      // IMP-027: Razorpay Refund adapter uses mocked HTTP (no database).
      "tests/payment-razorpay/refund.adapter.test.ts",
      // IMP-029: DB-free Operations workforce-principal trust adapter test.
      "tests/operations/workforce-principal-adapter.test.ts",
      // IMP-035: DB-free Administration transport and UI security tests.
      "tests/administration/**/*.test.{ts,tsx}",
      // IMP-036A: multi-portal experience foundation unit tests.
      "tests/workforce-hub/**/*.test.{ts,tsx}",
      "tests/enterprise/**/*.test.ts",
      // IMP-036B: customer account, address, and location experience tests.
      "tests/imp-036b/**/*.test.{ts,tsx}",
      // IMP-036C: unified map-first customer delivery address flow tests.
      "tests/imp-036c/**/*.test.{ts,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/coverage/**",
      "tests/e2e/**",
      "tests/access-control/cli/**",
      "tests/administration/**/*.integration.test.ts",
      "**/playwright-report/**",
      "**/test-results/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov", "html"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.{ts,tsx}",
        "src/types/**",
        "src/data/**",
        "src/app/**/opengraph-image.tsx",
        "src/app/**/robots.ts",
        "src/app/**/sitemap.ts",
        "src/components/icons/index.ts",
        "src/components/ui/index.ts",
      ],
    },
  },
});
