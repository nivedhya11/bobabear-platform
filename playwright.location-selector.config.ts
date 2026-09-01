import { defineConfig, devices } from "@playwright/test";
import { randomInt } from "node:crypto";

const isDocker = process.env.PLAYWRIGHT_TARGET === "docker";
const PORT = isDocker ? Number(process.env.BOBA_BEAR_DOCKER_PORT ?? 8080) : 4175;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const isCI = !!process.env.CI;
const podmanSocket = `unix:///run/user/${process.getuid?.() ?? 1000}/podman/podman.sock`;
const webServerEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
);
if (!isDocker) {
  webServerEnv.DOCKER_HOST ??= podmanSocket;
  webServerEnv.TESTCONTAINERS_RYUK_DISABLED ??= "true";
  webServerEnv.CUSTOMER_OTP_LOCAL_FIXED_CODE ??= String(randomInt(100000, 1000000));
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/location-selector-layout.spec.ts"],
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [["line"]],
  outputDir: "test-results-location-selector-layout",
  timeout: 120_000,
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
        env: webServerEnv,
      },
});
