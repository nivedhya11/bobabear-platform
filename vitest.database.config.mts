import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// PostgreSQL database integration-test config (IMP-005). Entirely separate
// from vitest.config.mts (jsdom, no Docker): these tests start a real
// Testcontainers PostgreSQL 18 container and must never be collected by
// `npm test` / `npm run test:coverage` / `npm run check` / `npm run verify`,
// so that those commands stay runnable without Docker.
//
// Node environment (no jsdom/browser setup), one worker, sequential files —
// each test file starts/stops isolated Postgres databases against a single
// shared Testcontainers container (see tests/database/global-setup.ts), so
// concurrent files or workers would race on container/database lifecycle.
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // See tests/setup/server-only-stub.ts — test-only; does not affect
      // the real Next.js client-bundle enforcement.
      "server-only": path.join(projectRoot, "tests/setup/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: [
      "tests/database/**/*.integration.test.ts",
      // IMP-009: real end-to-end HTTP tests against a live customer-auth
      // service process, backed by the same shared Testcontainers
      // PostgreSQL container (see tests/database/global-setup.ts).
      "tests/customer-auth/**/*.integration.test.ts",
      // IMP-024: customer-commerce HTTP façade integration tests.
      "tests/customer-commerce/**/*.integration.test.ts",
      // IMP-010: same pattern for the workforce-auth HTTP service.
      "tests/workforce-auth/**/*.integration.test.ts",
      // IMP-011: bootstrap CLI function tests need the same Testcontainers inject.
      "tests/access-control/cli/**/*.test.ts",
      // IMP-012: catalog domain/service tests need the same Testcontainers inject.
      "tests/catalog/**/*.test.ts",
      // IMP-013: menu import source/manifest/importer tests need Testcontainers inject.
      "tests/menu-import/**/*.test.ts",
      // IMP-014: assortment / availability / operating domain tests need Testcontainers inject.
      "tests/assortment-availability/**/*.test.ts",
      // IMP-014: existing-menu Brand assortment bootstrap tests.
      "tests/assortment-bootstrap/**/*.test.ts",
      // IMP-015: pricing / tax domain tests.
      "tests/pricing-tax/**/*.test.ts",
      // IMP-015: existing-menu pricing bootstrap tests.
      "tests/pricing-bootstrap/**/*.test.ts",
      // IMP-028C Slice 4: canonical modifier content bootstrap tests.
      "tests/catalog-imp028c-modifiers/**/*.test.{ts,tsx}",
      // IMP-017: customer profile domain / security / auth-integration tests.
      "tests/customer-profiles/**/*.test.ts",
      "tests/customer-profile-security/**/*.test.ts",
      "tests/customer-profile-auth-integration/**/*.test.ts",
      // IMP-018: customer address domain / security / auth-integration / concurrency tests.
      "tests/customer-addresses/**/*.test.ts",
      "tests/customer-address-security/**/*.test.ts",
      "tests/customer-address-auth-integration/**/*.test.ts",
      "tests/customer-address-concurrency/**/*.test.ts",
      // IMP-019: serviceability domain / security / auth-integration / concurrency tests.
      "tests/serviceability/**/*.test.ts",
      "tests/serviceability-security/**/*.test.ts",
      "tests/serviceability-auth-integration/**/*.test.ts",
      "tests/serviceability-concurrency/**/*.test.ts",
      // IMP-020: cart domain / security / auth-integration / concurrency tests.
      "tests/cart/**/*.test.ts",
      "tests/cart-security/**/*.test.ts",
      "tests/cart-auth-integration/**/*.test.ts",
      "tests/cart-concurrency/**/*.test.ts",
      // IMP-021: checkout domain / security / auth-integration / concurrency tests.
      "tests/checkout/**/*.test.ts",
      "tests/checkout-security/**/*.test.ts",
      "tests/checkout-auth-integration/**/*.test.ts",
      "tests/checkout-concurrency/**/*.test.ts",
      // IMP-022: payment domain / security / auth / concurrency / idempotency /
      // provider / reconciliation / promotions tests.
      "tests/payment/**/*.test.ts",
      "tests/payment-security/**/*.test.ts",
      "tests/payment-auth-integration/**/*.test.ts",
      "tests/payment-concurrency/**/*.test.ts",
      "tests/payment-idempotency/**/*.test.ts",
      "tests/payment-provider/**/*.test.ts",
      "tests/payment-reconciliation/**/*.test.ts",
      "tests/payment-promotions/**/*.test.ts",
      "tests/payment-razorpay/**/*.test.ts",
      // IMP-027: Refund Foundation.
      "tests/refund-application/**/*.test.ts",
      "tests/refund-concurrency/**/*.test.ts",
      "tests/refund-webhook/**/*.test.ts",
      // IMP-023: order domain / security / auth-integration / concurrency / crash.
      "tests/order/**/*.test.ts",
      "tests/order-security/**/*.test.ts",
      "tests/order-auth-integration/**/*.test.ts",
      "tests/order-concurrency/**/*.test.ts",
      "tests/order-crash/**/*.test.ts",
      "tests/database/order/**/*.test.ts",
      // IMP-029: Operations Order read HTTP transport integration.
      "tests/operations/orders-read-http.integration.test.ts",
      "tests/operations/orders-mutation-http.integration.test.ts",
      "tests/operations/runtime-service.integration.test.ts",
      // IMP-035: Administration API authorization and transport integration.
      "tests/administration/**/*.integration.test.ts",
      // IMP-031: Provider-neutral Delivery foundation (Boundary C).
      "tests/delivery-application/**/*.test.ts",
      "tests/delivery-concurrency/**/*.test.ts",
      "tests/delivery-manual/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/.next/**", "**/out/**", "**/coverage/**"],
    globalSetup: ["./tests/database/global-setup.ts"],
    pool: "forks",
    maxWorkers: 1,
    fileParallelism: false,
    isolate: true,
    retry: 0,
    testTimeout: 60_000,
    hookTimeout: 120_000,
    teardownTimeout: 60_000,
  },
});
