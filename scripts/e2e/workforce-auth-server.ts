#!/usr/bin/env -S node --import tsx
/**
 * Ephemeral E2E harness for the workforce-auth login flow (IMP-010), used
 * only by `npm run test:e2e:workforce-auth`'s Playwright `webServer` (see
 * `playwright.workforce-auth.config.ts`) — never production, never
 * `npm run test:e2e`.
 *
 * Combines, on one loopback origin:
 *   - the static Next.js export in `out/`, and
 *   - a narrow reverse proxy of `/api/workforce-auth/*` to a real
 *     workforce-auth service process (compiled `dist-workforce-auth`),
 *     mirroring `docker/nginx/nginx.conf`.
 *
 * Provisions a temporary-password workforce user after migrations so the
 * Playwright suite can exercise the full login lifecycle. Credentials are
 * shared only via process env inherited by Playwright — never logged.
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
import {
  createWorkforceOperatorAuthRuntime,
  createWorkforceOperatorUser,
} from "../../src/server/auth/workforce/operator";
import { validateWorkforceAuthConfig } from "../../src/server/auth/shared/config";
import type { WebConfig } from "../../src/platform/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(PROJECT_ROOT, "out");
const WORKFORCE_AUTH_ENTRY = path.join(
  PROJECT_ROOT,
  "dist-workforce-auth",
  "server",
  "workforce-auth",
  "main.js",
);
const HOST = "127.0.0.1";
const INNER_SERVICE_PORT = 8182;
const WORKFORCE_AUTH_PROXY_PREFIX = "/api/workforce-auth/";
const READY_POLL_TIMEOUT_MS = 20_000;
const READY_POLL_INTERVAL_MS = 200;
const CHILD_EXIT_TIMEOUT_MS = 5_000;

const portArgIndex = process.argv.indexOf("--port");
const OUTER_PORT = Number(
  portArgIndex !== -1 ? process.argv[portArgIndex + 1] : process.env.PORT ?? 4175,
);

function ephemeralSecret(label: string): string {
  return `${label}-${randomBytes(24).toString("hex")}`;
}

function requireWorkforceAuthBuildExists(): void {
  if (!existsSync(WORKFORCE_AUTH_ENTRY)) {
    throw new Error(
      `${WORKFORCE_AUTH_ENTRY} does not exist. Run "npm run workforce-auth:build" first ` +
        "(see package.json's test:e2e:workforce-auth script).",
    );
  }
}

function requireE2eCredentials(): {
  email: string;
  temporaryPassword: string;
  permanentPassword: string;
} {
  const email = process.env.WORKFORCE_E2E_EMAIL;
  const temporaryPassword = process.env.WORKFORCE_E2E_TEMP_PASSWORD;
  const permanentPassword = process.env.WORKFORCE_E2E_PERMANENT_PASSWORD;
  if (!email || !temporaryPassword || !permanentPassword) {
    throw new Error(
      "WORKFORCE_E2E_EMAIL, WORKFORCE_E2E_TEMP_PASSWORD, and WORKFORCE_E2E_PERMANENT_PASSWORD " +
        "must be set before starting the workforce-auth E2E harness.",
    );
  }
  if (temporaryPassword.length < 15 || permanentPassword.length < 15) {
    throw new Error("E2E passwords must be at least 15 characters.");
  }
  return { email, temporaryPassword, permanentPassword };
}

function proxyToWorkforceAuthService(req: IncomingMessage, res: ServerResponse): void {
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

function startWorkforceAuthChildProcess(env: Readonly<Record<string, string>>): ChildProcess {
  return spawn(process.execPath, ["--conditions=react-server", WORKFORCE_AUTH_ENTRY], {
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
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, READY_POLL_INTERVAL_MS));
  }
  throw new Error("workforce-auth E2E harness: the workforce-auth service never became ready.");
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

async function provisionTemporaryUser(
  databaseUrl: string,
  publicOrigin: string,
  workforceSecret: string,
  credentials: { email: string; temporaryPassword: string },
): Promise<void> {
  const authResult = validateWorkforceAuthConfig(
    {
      WORKFORCE_AUTH_SECRET: workforceSecret,
      WORKFORCE_AUTH_BASE_URL: publicOrigin,
    },
    "test",
  );
  if (!authResult.ok) {
    throw new Error("Invalid workforce E2E auth configuration.");
  }

  const persistenceConfig: WebConfig = {
    environment: "test",
    processKind: "web",
    publicOrigin,
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    port: 3000,
    databaseUrl,
  };

  const runtime = createWorkforceOperatorAuthRuntime({
    auth: authResult.config,
    persistence: persistenceConfig,
  });

  try {
    await createWorkforceOperatorUser(runtime, {
      email: credentials.email,
      name: "E2E Workforce User",
      temporaryPassword: credentials.temporaryPassword,
    });
  } finally {
    await runtime.close();
  }
}

async function main(): Promise<void> {
  requireWorkforceAuthBuildExists();
  const credentials = requireE2eCredentials();
  const publicOrigin = `http://${HOST}:${OUTER_PORT}`;
  const workforceSecret = ephemeralSecret("workforce-auth-e2e-secret");
  const piiSecret = ephemeralSecret("workforce-auth-e2e-pii-secret");

  console.log("workforce-auth E2E harness: starting a disposable PostgreSQL container…");
  const containerHandle: TestContainerHandle = await startPostgresTestContainer();

  let workforceAuthProcess: ChildProcess | undefined;
  let outerServer: http.Server | undefined;

  async function shutdown(): Promise<void> {
    await Promise.allSettled([
      outerServer ? new Promise<void>((resolve) => outerServer!.close(() => resolve())) : Promise.resolve(),
      workforceAuthProcess ? stopChildProcess(workforceAuthProcess) : Promise.resolve(),
      containerHandle.stop(),
    ]);
  }

  try {
    await applyMigrations(containerHandle.adminConnectionInfo.connectionString);
    await provisionTemporaryUser(
      containerHandle.adminConnectionInfo.connectionString,
      publicOrigin,
      workforceSecret,
      credentials,
    );

    workforceAuthProcess = startWorkforceAuthChildProcess({
      BOBA_BEAR_ENV: "test",
      BOBA_BEAR_PUBLIC_ORIGIN: publicOrigin,
      BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS: "true",
      BOBA_BEAR_DATABASE_SSL_MODE: "disable",
      BOBA_BEAR_DATABASE_URL: containerHandle.adminConnectionInfo.connectionString,
      WORKFORCE_AUTH_SECRET: workforceSecret,
      WORKFORCE_AUTH_BASE_URL: publicOrigin,
      WORKFORCE_AUTH_PII_HASH_SECRET: piiSecret,
      WORKFORCE_AUTH_TRUST_PROXY_HOPS: "0",
      WORKFORCE_AUTH_SERVICE_HOST: HOST,
      WORKFORCE_AUTH_SERVICE_PORT: String(INNER_SERVICE_PORT),
    });
    workforceAuthProcess.once("exit", (code, signal) => {
      if (code !== 0 && code !== null) {
        console.error(
          `workforce-auth E2E harness: the workforce-auth process exited (code ${code}, signal ${signal}).`,
        );
      }
    });

    await waitForReady(READY_POLL_TIMEOUT_MS);

    const staticHandler = createStaticExportHandler(OUT_DIR);
    outerServer = http.createServer((req, res) => {
      const url = req.url ?? "/";
      if (url.startsWith(WORKFORCE_AUTH_PROXY_PREFIX)) {
        proxyToWorkforceAuthService(req, res);
        return;
      }
      staticHandler(req, res);
    });

    await new Promise<void>((resolve, reject) => {
      outerServer!.once("error", reject);
      outerServer!.listen(OUTER_PORT, HOST, () => resolve());
    });

    console.log(`✓  workforce-auth E2E harness ready at http://${HOST}:${OUTER_PORT}`);
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
    `workforce-auth E2E harness: ${error instanceof Error ? error.message : "failed to start."}`,
  );
  process.exitCode = 1;
});
