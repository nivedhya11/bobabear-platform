#!/usr/bin/env -S node --import tsx
/**
 * Ephemeral E2E harness for the customer-auth login flow (IMP-009), used
 * only by `npm run test:e2e:customer-auth`'s Playwright `webServer` (see
 * `playwright.customer-auth.config.ts`) — never production, never
 * `npm run test:e2e`.
 *
 * Combines, on one loopback origin so the browser's same-origin `fetch`
 * calls in `src/lib/customer-auth/client.ts` work unmodified:
 *   - the static Next.js export in `out/` (same handler `serve-static-export.mjs`
 *     uses for the rest of the E2E suite), and
 *   - a narrow reverse proxy of `/api/customer-auth/*` to a real
 *     customer-auth service process, mirroring `docker/nginx/nginx.conf`'s
 *     proxy prefix for the Docker target.
 *
 * The customer-auth service itself is the *actual* compiled production
 * entry point (`dist-customer-auth/server/customer-auth/main.js`, built by
 * `npm run customer-auth:build` — a prerequisite of this script, see
 * `package.json`'s `test:e2e:customer-auth` script), started as a real
 * child process — never `CustomerAuthService` instantiated in-process here.
 * That matters beyond realism: this coordinator script runs under `tsx`,
 * and this project's `package.json` has no `"type": "module"`, so `tsx`
 * treats plain `.ts` files as CommonJS by default; requiring
 * `libphonenumber-js/mobile` through that CommonJS path hits a real bug in
 * its bundled metadata wiring. The compiled `dist-customer-auth/` output
 * carries its own `{"type":"module"}` marker (see
 * `scripts/customer-auth/build.mjs`) and always runs as genuine ESM, which
 * does not hit that bug — the same reason Vitest (an ESM-native bundler)
 * never hits it either.
 *
 * Runs against a real, disposable Testcontainers PostgreSQL database
 * (never SQLite/PGlite/mocked) and the local OTP provider with a fixed
 * code from `CUSTOMER_OTP_LOCAL_FIXED_CODE` (never printed) — the same env
 * var the Playwright spec reads so both sides agree on the code without
 * this script ever exposing it over HTTP or in a log line.
 *
 * Uses Docker via Testcontainers, same as `npm run test:database`. Requires
 * Docker to be running.
 */
import { spawn, type ChildProcess } from "node:child_process";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";

import { createStaticExportHandler } from "../serve-static-export.mjs";
import { applyMigrations } from "../../tests/database/support/test-database";
import { startPostgresTestContainer, type TestContainerHandle } from "../../tests/database/support/test-container";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(PROJECT_ROOT, "out");
const CUSTOMER_AUTH_ENTRY = path.join(
  PROJECT_ROOT,
  "dist-customer-auth",
  "server",
  "customer-auth",
  "main.js",
);
const HOST = "127.0.0.1"; // loopback only — never bind 0.0.0.0
const INNER_SERVICE_PORT = 8179; // fixed, distinct from the compose customer-auth port (8081)
const CUSTOMER_AUTH_PROXY_PREFIX = "/api/customer-auth/";
const READY_POLL_TIMEOUT_MS = 20_000;
const READY_POLL_INTERVAL_MS = 200;
const CHILD_EXIT_TIMEOUT_MS = 5_000;

const portArgIndex = process.argv.indexOf("--port");
const OUTER_PORT = Number(
  portArgIndex !== -1 ? process.argv[portArgIndex + 1] : process.env.PORT ?? 4174,
);

function requireFixedOtpCode(): string {
  const raw = process.env.CUSTOMER_OTP_LOCAL_FIXED_CODE;
  if (!raw || !/^\d{6}$/.test(raw)) {
    throw new Error(
      "CUSTOMER_OTP_LOCAL_FIXED_CODE must be set to exactly six decimal digits before starting " +
        "the customer-auth E2E harness (see package.json's test:e2e:customer-auth script).",
    );
  }
  return raw;
}

/** A fresh, random, sufficiently long secret for this disposable process —
 * never derived from or equal to anything read from a real `.env` file, and
 * never logged. */
function ephemeralSecret(label: string): string {
  return `${label}-${randomBytes(24).toString("hex")}`;
}

function requireCustomerAuthBuildExists(): void {
  if (!existsSync(CUSTOMER_AUTH_ENTRY)) {
    throw new Error(
      `${CUSTOMER_AUTH_ENTRY} does not exist. Run "npm run customer-auth:build" first ` +
        "(see package.json's test:e2e:customer-auth script).",
    );
  }
}

/** Minimal manual reverse proxy for the one approved public façade prefix —
 * mirrors `docker/nginx/nginx.conf`'s `location ^~ /api/customer-auth/`
 * block closely enough for E2E purposes (forwards method/headers/body,
 * streams the response back, never buffers the whole body in memory). */
function proxyToCustomerAuthService(req: IncomingMessage, res: ServerResponse): void {
  const proxyReq = http.request(
    {
      host: HOST,
      port: INNER_SERVICE_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    }
    res.end(JSON.stringify({ ok: false, code: "PROXY_UPSTREAM_UNAVAILABLE" }));
  });
  req.pipe(proxyReq);
}

function startCustomerAuthChildProcess(env: Readonly<Record<string, string>>): ChildProcess {
  return spawn(process.execPath, ["--conditions=react-server", CUSTOMER_AUTH_ENTRY], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, ...env },
    stdio: ["ignore", "inherit", "inherit"],
  });
}

async function waitForReady(deadlineMs: number): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < deadlineMs) {
    try {
      const response = await fetch(`http://${HOST}:${INNER_SERVICE_PORT}/health/ready`);
      if (response.ok) return;
    } catch {
      // Not up yet — keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, READY_POLL_INTERVAL_MS));
  }
  throw new Error("customer-auth E2E harness: the customer-auth service never became ready.");
}

async function stopChildProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.killed) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, CHILD_EXIT_TIMEOUT_MS);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill("SIGTERM");
  });
}

async function main(): Promise<void> {
  const fixedCode = requireFixedOtpCode();
  requireCustomerAuthBuildExists();
  const publicOrigin = `http://${HOST}:${OUTER_PORT}`;

  console.log("customer-auth E2E harness: starting a disposable PostgreSQL container…");
  const containerHandle: TestContainerHandle = await startPostgresTestContainer();

  let customerAuthProcess: ChildProcess | undefined;
  let outerServer: http.Server | undefined;

  async function shutdown(): Promise<void> {
    await Promise.allSettled([
      outerServer ? new Promise<void>((resolve) => outerServer!.close(() => resolve())) : Promise.resolve(),
      customerAuthProcess ? stopChildProcess(customerAuthProcess) : Promise.resolve(),
      containerHandle.stop(),
    ]);
  }

  try {
    await applyMigrations(containerHandle.adminConnectionInfo.connectionString);

    customerAuthProcess = startCustomerAuthChildProcess({
      BOBA_BEAR_ENV: "test",
      BOBA_BEAR_PUBLIC_ORIGIN: publicOrigin,
      BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS: "true",
      BOBA_BEAR_DATABASE_SSL_MODE: "disable",
      BOBA_BEAR_DATABASE_URL: containerHandle.adminConnectionInfo.connectionString,
      CUSTOMER_AUTH_SECRET: ephemeralSecret("customer-auth-e2e-secret"),
      CUSTOMER_AUTH_BASE_URL: publicOrigin,
      CUSTOMER_AUTH_PII_HASH_SECRET: ephemeralSecret("customer-auth-e2e-pii-secret"),
      CUSTOMER_OTP_PROVIDER: "local",
      CUSTOMER_OTP_LOCAL_FIXED_CODE: fixedCode,
      CUSTOMER_AUTH_TRUST_PROXY_HOPS: "0",
      CUSTOMER_AUTH_SERVICE_HOST: HOST,
      CUSTOMER_AUTH_SERVICE_PORT: String(INNER_SERVICE_PORT),
    });
    customerAuthProcess.once("exit", (code, signal) => {
      if (code !== 0 && code !== null) {
        console.error(`customer-auth E2E harness: the customer-auth process exited (code ${code}, signal ${signal}).`);
      }
    });

    await waitForReady(READY_POLL_TIMEOUT_MS);

    const staticHandler = createStaticExportHandler(OUT_DIR);
    outerServer = http.createServer((req, res) => {
      const url = req.url ?? "/";
      if (url.startsWith(CUSTOMER_AUTH_PROXY_PREFIX)) {
        proxyToCustomerAuthService(req, res);
        return;
      }
      staticHandler(req, res);
    });

    await new Promise<void>((resolve, reject) => {
      outerServer!.once("error", reject);
      outerServer!.listen(OUTER_PORT, HOST, () => resolve());
    });

    console.log(`✓  customer-auth E2E harness ready at http://${HOST}:${OUTER_PORT}`);
  } catch (error) {
    await shutdown();
    throw error;
  }

  let shuttingDown = false;
  const handleSignal = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    void shutdown().then(() => process.exit(0));
  };
  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);
}

main().catch((error: unknown) => {
  console.error(
    `customer-auth E2E harness: ${error instanceof Error ? error.message : "failed to start."}`,
  );
  process.exitCode = 1;
});
