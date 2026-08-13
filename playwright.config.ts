import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Test config — runs the E2E suite against the production
 * static export (`out/`), served locally by scripts/serve-static-export.mjs.
 *
 * `npm run test:e2e` builds first (`next build --webpack`) so this always
 * exercises the real deployable artifact, not the dev server.
 *
 * `npm run test:e2e:docker` (PLAYWRIGHT_TARGET=docker) instead targets the
 * already-running, already-healthy `app` Nginx container (IMP-005A) — no
 * build, no local static server; `webServer` is omitted entirely so a
 * container that never comes up healthy fails the run instead of silently
 * falling back to starting one locally.
 *
 * `tests/e2e/customer-auth.spec.ts` (IMP-009) and
 * `tests/e2e/workforce-auth.spec.ts` (IMP-010) are deliberately excluded here
 * — they need a real auth service (a Testcontainers PostgreSQL database plus
 * the corresponding HTTP process) behind the same origin, which this config's
 * plain static-file `webServer` does not provide. Each has its own dedicated
 * Playwright config and `npm run test:e2e:*` script instead.
 *
 * Chromium only for this slice (desktop + mobile viewport). Firefox/WebKit
 * are deferred to a later slice.
 */

const isDocker = process.env.PLAYWRIGHT_TARGET === "docker";
const PORT = isDocker ? Number(process.env.BOBA_BEAR_DOCKER_PORT ?? 8080) : 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: [
    "**/customer-auth.spec.ts",
    "**/workforce-auth.spec.ts",
    "**/customer-ordering.spec.ts",
  ],
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }]],
  outputDir: "test-results",
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
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
      },
    },
  ],

  // Builds the static export first (via npm run test:e2e), then serves out/
  // on a loopback-only port and waits for it to answer before tests start.
  // Omitted entirely for the Docker target — the `app` container is
  // started and health-checked by `npm run docker:up` beforehand.
  webServer: isDocker
    ? undefined
    : {
        command: `node scripts/serve-static-export.mjs --port ${PORT}`,
        url: BASE_URL,
        // Never reuse a random process on :4173 — a stale/non-export listener
        // can answer Playwright's readiness probe while still 404ing `/`, which
        // previously failed mobile home-page as a false product regression.
        reuseExistingServer: false,
        timeout: 30_000,
      },
});
