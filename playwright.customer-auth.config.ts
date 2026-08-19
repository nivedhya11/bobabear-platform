import { defineConfig, devices } from "@playwright/test";

/**
 * Dedicated Playwright config for the customer phone-OTP login E2E flow
 * (IMP-009, `tests/e2e/customer-auth.spec.ts`) — split out from
 * `playwright.config.ts` because this spec needs a real customer-auth
 * service reachable on the same origin as the static site, not just static
 * files.
 *
 * Local target (default): `npm run test:e2e:customer-auth` builds the
 * static export, then starts `scripts/e2e/customer-auth-server.ts` — a
 * combined static-file + `/api/customer-auth/` reverse-proxy server backed
 * by a real, disposable Testcontainers PostgreSQL database and a real
 * `CustomerAuthService` using the local OTP provider with a fixed code from
 * `CUSTOMER_OTP_LOCAL_FIXED_CODE`. Requires Docker (for Testcontainers),
 * same as `npm run test:database`.
 *
 * Docker target (`PLAYWRIGHT_TARGET=docker npm run test:e2e:customer-auth`,
 * after `npm run docker:up`): targets the already-running `app` Nginx
 * container, which proxies `/api/customer-auth/` to the real `customer-auth`
 * Compose service (see `docker/nginx/nginx.conf`) — no local harness,
 * `webServer` is omitted entirely, matching `playwright.config.ts`'s own
 * Docker-target pattern.
 *
 * `CUSTOMER_OTP_LOCAL_FIXED_CODE` must be set to the same six-digit value
 * for both the server (local harness or the Docker `customer-auth` service)
 * and this test run. Prefer the git-ignored
 * `.env.customer-auth.docker.local` (via `scripts/e2e/run-customer-auth-e2e.mjs`)
 * or an ephemeral generated code for the local harness — never hardcode the
 * value in a committed file, and never print it.
 */

const isDocker = process.env.PLAYWRIGHT_TARGET === "docker";
const PORT = isDocker ? Number(process.env.BOBA_BEAR_DOCKER_PORT ?? 8080) : 4174;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/customer-auth.spec.ts"],
  fullyParallel: false, // shares one fixed-code OTP provider across tests
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [["html", { outputFolder: "playwright-report-customer-auth", open: "never" }]],
  outputDir: "test-results-customer-auth",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
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
        command: `node --conditions=react-server --import tsx scripts/e2e/customer-auth-server.ts --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 900_000,
      },
});
