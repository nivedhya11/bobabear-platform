import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.COMMERCIAL_E2E_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL;
if (!baseURL) {
  throw new Error("COMMERCIAL_E2E_BASE_URL (or PLAYWRIGHT_BASE_URL) is required.");
}

/**
 * IMP-036F F6B — Commercial workspace browser proof.
 * One Chromium project; desktop / tablet / mobile tests set viewport explicitly so MFA enrollment
 * state is shared across device scenarios in a single worker run.
 */
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/commercial-workspace.spec.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
