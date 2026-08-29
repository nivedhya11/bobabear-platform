import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.OPERATIONS_E2E_BASE_URL;
if (!baseURL) throw new Error("OPERATIONS_E2E_BASE_URL is required.");

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/operations-lifecycle.spec.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["line"]],
  outputDir: "test-results-operations-lifecycle",
  use: { baseURL, trace: "on-first-retry", screenshot: "only-on-failure", video: "retain-on-failure" },
  projects: [{ name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
