import { defineConfig, devices } from "@playwright/test";

/**
 * Dedicated Playwright config for the workforce email/password + MFA login
 * E2E flow (IMP-010, `tests/e2e/workforce-auth.spec.ts`) — split out from
 * `playwright.config.ts` because this spec needs a real workforce-auth
 * service reachable on the same origin as the static site.
 *
 * Local target (default): `npm run test:e2e:workforce-auth` builds the
 * static export + compiled workforce-auth service, then starts
 * `scripts/e2e/workforce-auth-server.ts` — Testcontainers PostgreSQL +
 * compiled `dist-workforce-auth` main + static+proxy. Requires Docker.
 *
 * Docker target (`PLAYWRIGHT_TARGET=docker npm run test:e2e:workforce-auth`,
 * after `npm run docker:up`): targets the already-running `app` Nginx
 * container, which proxies `/api/workforce-auth/` to the real
 * `workforce-auth` Compose service.
 */

const isDocker = process.env.PLAYWRIGHT_TARGET === "docker";
const PORT = isDocker ? Number(process.env.BOBA_BEAR_DOCKER_PORT ?? 8080) : 4175;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/workforce-auth.spec.ts"],
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [["html", { outputFolder: "playwright-report-workforce-auth", open: "never" }]],
  outputDir: "test-results-workforce-auth",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
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
        command: `node --conditions=react-server --import tsx scripts/e2e/workforce-auth-server.ts --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
