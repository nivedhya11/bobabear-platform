import { defineConfig, devices } from "@playwright/test";

/**
 * Dedicated Playwright config for IMP-025A customer ordering E2E.
 */

const isDocker = process.env.PLAYWRIGHT_TARGET === "docker";
const PORT = isDocker ? Number(process.env.BOBA_BEAR_DOCKER_PORT ?? 8080) : 4175;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/customer-ordering.spec.ts"],
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [["line"]],
  outputDir: "test-results-customer-ordering",
  timeout: 180_000,
  expect: {
    timeout: 15_000,
  },

  use: {
    baseURL: BASE_URL,
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  webServer: isDocker
    ? undefined
    : {
        command: `node --import tsx scripts/e2e/customer-ordering-server.ts --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 900_000,
      },
});
