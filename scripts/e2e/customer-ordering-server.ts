#!/usr/bin/env -S node --import tsx
/**
 * Ephemeral E2E harness for IMP-025 customer ordering (static export +
 * customer-auth + customer-commerce with fake Payment on one loopback origin).
 */
import { spawn, type ChildProcess } from "node:child_process";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";

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
const CUSTOMER_COMMERCE_ENTRY = path.join(
  PROJECT_ROOT,
  "dist-customer-commerce",
  "server",
  "customer-commerce",
  "e2e-fake-main.js",
);
const HOST = "127.0.0.1";
const INNER_AUTH_PORT = 8179;
const INNER_COMMERCE_PORT = 8183;
const CUSTOMER_AUTH_PROXY_PREFIX = "/api/customer-auth/";
const CUSTOMER_COMMERCE_PROXY_PREFIX = "/api/v1/";
const READY_POLL_TIMEOUT_MS = 180_000;
const READY_POLL_INTERVAL_MS = 200;
const CHILD_EXIT_TIMEOUT_MS = 5_000;

const portArgIndex = process.argv.indexOf("--port");
const OUTER_PORT = Number(
  portArgIndex !== -1 ? process.argv[portArgIndex + 1] : process.env.PORT ?? 4175,
);

function requireFixedOtpCode(): string {
  const raw = process.env.CUSTOMER_OTP_LOCAL_FIXED_CODE;
  if (!raw || !/^\d{6}$/.test(raw)) {
    throw new Error(
      "CUSTOMER_OTP_LOCAL_FIXED_CODE must be set to exactly six decimal digits before starting " +
        "the customer-ordering E2E harness.",
    );
  }
  return raw;
}

function ephemeralSecret(label: string): string {
  return `${label}-${randomBytes(24).toString("hex")}`;
}

function copyStaticExportToLinuxTmp(): string {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "boba-bear-e2e-out-"));
  cpSync(OUT_DIR, tmpDir, { recursive: true });
  return tmpDir;
}

function requireBuilds(): void {
  if (!existsSync(path.join(OUT_DIR, "order", "index.html"))) {
    throw new Error(
      `${path.join(OUT_DIR, "order", "index.html")} does not exist. Run "npm run build" first.`,
    );
  }
  if (!existsSync(CUSTOMER_AUTH_ENTRY)) {
    throw new Error(
      `${CUSTOMER_AUTH_ENTRY} does not exist. Run "npm run customer-auth:build" first.`,
    );
  }
  if (!existsSync(CUSTOMER_COMMERCE_ENTRY)) {
    throw new Error(
      `${CUSTOMER_COMMERCE_ENTRY} does not exist. Run "npm run customer-commerce:build" first.`,
    );
  }
}

function proxyTo(port: number, req: IncomingMessage, res: ServerResponse): void {
  const headers = { ...req.headers, host: `${HOST}:${port}` };
  delete headers.connection;
  delete headers["transfer-encoding"];
  const proxyReq = http.request(
    {
      host: HOST,
      port,
      path: req.url,
      method: req.method,
      headers,
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
  const method = req.method ?? "GET";
  if (method === "GET" || method === "HEAD") {
    proxyReq.end();
    return;
  }
  req.pipe(proxyReq);
}

function childEnv(overrides: Readonly<Record<string, string>>): NodeJS.ProcessEnv {
  const env = { ...process.env, ...overrides };
  delete env.NODE_OPTIONS;
  return env;
}

function startChild(
  label: string,
  entry: string,
  env: Readonly<Record<string, string>>,
  extraArgs: readonly string[] = [],
): ChildProcess {
  const child = spawn(process.execPath, ["--conditions=react-server", ...extraArgs, entry], {
    cwd: PROJECT_ROOT,
    env: childEnv(env),
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (chunk: Buffer) => {
    process.stderr.write(`[${label}] ${chunk.toString()}`);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(`[${label}] ${chunk.toString()}`);
  });
  return child;
}

async function waitForReady(port: number, label: string): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < READY_POLL_TIMEOUT_MS) {
    try {
      const response = await fetch(`http://${HOST}:${port}/health/ready`);
      if (response.ok) return;
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, READY_POLL_INTERVAL_MS));
  }
  throw new Error(`customer-ordering E2E harness: ${label} never became ready.`);
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

async function runSeed(databaseUrl: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--conditions=react-server", "--import", "tsx", "scripts/e2e/seed-customer-ordering.ts"],
      {
        cwd: PROJECT_ROOT,
        env: childEnv({
          BOBA_BEAR_ENV: "test",
          BOBA_BEAR_PUBLIC_ORIGIN: `http://${HOST}:${OUTER_PORT}`,
          BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS: "true",
          BOBA_BEAR_DATABASE_SSL_MODE: "disable",
          BOBA_BEAR_DATABASE_URL: databaseUrl,
        }),
        stdio: ["ignore", "inherit", "inherit"],
      },
    );
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`customer-ordering seed exited with code ${code}`));
    });
    child.once("error", reject);
  });
}

async function main(): Promise<void> {
  const fixedCode = requireFixedOtpCode();
  requireBuilds();
  const publicOrigin = `http://${HOST}:${OUTER_PORT}`;

  process.stderr.write("customer-ordering E2E harness: starting a disposable PostgreSQL container…\n");
  const containerHandle: TestContainerHandle = await startPostgresTestContainer();

  let customerAuthProcess: ChildProcess | undefined;
  let customerCommerceProcess: ChildProcess | undefined;
  let outerServer: http.Server | undefined;
  let staticExportDir: string | undefined;

  async function shutdown(): Promise<void> {
    await Promise.allSettled([
      outerServer ? new Promise<void>((resolve) => outerServer!.close(() => resolve())) : Promise.resolve(),
      customerAuthProcess ? stopChildProcess(customerAuthProcess) : Promise.resolve(),
      customerCommerceProcess ? stopChildProcess(customerCommerceProcess) : Promise.resolve(),
      containerHandle.stop(),
    ]);
    if (staticExportDir) {
      rmSync(staticExportDir, { recursive: true, force: true });
    }
  }

  try {
    process.stderr.write("customer-ordering E2E harness: applying migrations…\n");
    await applyMigrations(containerHandle.adminConnectionInfo.connectionString);
    process.stderr.write("customer-ordering E2E harness: seeding catalog + commerce…\n");
    await runSeed(containerHandle.adminConnectionInfo.connectionString);
    process.stderr.write("customer-ordering E2E harness: seed complete; starting services…\n");

    const customerAuthSecret = ephemeralSecret("customer-ordering-e2e-auth");
    const customerPiiSecret = ephemeralSecret("customer-ordering-e2e-pii");
    const sharedAuthEnv = {
      BOBA_BEAR_ENV: "test",
      BOBA_BEAR_PUBLIC_ORIGIN: publicOrigin,
      BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS: "true",
      BOBA_BEAR_DATABASE_SSL_MODE: "disable",
      BOBA_BEAR_DATABASE_URL: containerHandle.adminConnectionInfo.connectionString,
      CUSTOMER_AUTH_SECRET: customerAuthSecret,
      CUSTOMER_AUTH_BASE_URL: publicOrigin,
      CUSTOMER_AUTH_PII_HASH_SECRET: customerPiiSecret,
      CUSTOMER_OTP_PROVIDER: "local",
      CUSTOMER_OTP_LOCAL_FIXED_CODE: fixedCode,
      CUSTOMER_AUTH_TRUST_PROXY_HOPS: "0",
    } as const;

    customerAuthProcess = startChild("customer-auth", CUSTOMER_AUTH_ENTRY, {
      ...sharedAuthEnv,
      CUSTOMER_AUTH_SERVICE_HOST: HOST,
      CUSTOMER_AUTH_SERVICE_PORT: String(INNER_AUTH_PORT),
    });
    customerAuthProcess.once("exit", (code, signal) => {
      process.stderr.write(
        `customer-ordering E2E harness: customer-auth exited (code ${code}, signal ${signal}).\n`,
      );
    });
    await waitForReady(INNER_AUTH_PORT, "customer-auth");

    customerCommerceProcess = startChild("customer-commerce", CUSTOMER_COMMERCE_ENTRY, {
      ...sharedAuthEnv,
      CUSTOMER_COMMERCE_SERVICE_HOST: HOST,
      CUSTOMER_COMMERCE_SERVICE_PORT: String(INNER_COMMERCE_PORT),
      CUSTOMER_COMMERCE_TRUST_PROXY_HOPS: "0",
      CUSTOMER_COMMERCE_FAKE_PAYMENT_OUTCOME: "razorpay_standard_checkout",
    });
    customerCommerceProcess.once("exit", (code, signal) => {
      process.stderr.write(
        `customer-ordering E2E harness: customer-commerce exited (code ${code}, signal ${signal}).\n`,
      );
    });
    await waitForReady(INNER_COMMERCE_PORT, "customer-commerce");

    staticExportDir = copyStaticExportToLinuxTmp();
    const staticHandler = createStaticExportHandler(staticExportDir);
    outerServer = http.createServer((req, res) => {
      const url = req.url ?? "/";
      if (url.startsWith(CUSTOMER_AUTH_PROXY_PREFIX)) {
        proxyTo(INNER_AUTH_PORT, req, res);
        return;
      }
      if (url.startsWith(CUSTOMER_COMMERCE_PROXY_PREFIX)) {
        proxyTo(INNER_COMMERCE_PORT, req, res);
        return;
      }
      staticHandler(req, res);
    });

    await new Promise<void>((resolve, reject) => {
      outerServer!.once("error", reject);
      outerServer!.listen(OUTER_PORT, HOST, () => resolve());
    });

    const orderProbe = await fetch(`http://${HOST}:${OUTER_PORT}/order/`);
    if (!orderProbe.ok) {
      throw new Error(
        `customer-ordering E2E harness: static /order/ probe failed (${orderProbe.status}) outDir=${staticExportDir}`,
      );
    }

    process.stderr.write(
      `✓  customer-ordering E2E harness ready at http://${HOST}:${OUTER_PORT} (out=${staticExportDir})\n`,
    );
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
    `customer-ordering E2E harness: ${error instanceof Error ? error.message : "failed to start."}`,
  );
  process.exitCode = 1;
});
