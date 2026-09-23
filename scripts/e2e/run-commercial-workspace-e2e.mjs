#!/usr/bin/env node
/** Isolated actual-Nginx E2E runner for IMP-036F F6B. */
import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { buildCommercialWorkspaceSeed } from "./build-commercial-workspace-seed.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const composeFile = "compose.operations-lifecycle-e2e.yaml";
const project = `imp036fe2e_${randomBytes(6).toString("hex")}`;
if (!/^imp036fe2e_[a-z0-9]+$/.test(project)) throw new Error("Invalid E2E project name.");
const podmanSocket = `unix:///run/user/${process.getuid()}/podman/podman.sock`;
const tempDir = mkdtempSync(path.join(os.tmpdir(), "imp036fe2e_"));
chmodSync(tempDir, 0o700);
const envFile = path.join(tempDir, "runtime.env");
const manifest = path.join(tempDir, "fixtures.json");

function port() { return new Promise((resolve, reject) => { const server = net.createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const address = server.address(); server.close((error) => error ? reject(error) : resolve(address.port)); }); }); }
function secret(label) { return `${label}-${randomBytes(24).toString("hex")}`; }
const childEnv = { ...process.env, DOCKER_HOST: podmanSocket, TESTCONTAINERS_RYUK_DISABLED: "true" };
delete childEnv.DOCKER_CONTEXT;
const sensitiveValues = new Set();
function redact(output) { return [...sensitiveValues].filter(Boolean).sort((left, right) => right.length - left.length).reduce((value, sensitive) => value.split(sensitive).join("[REDACTED]"), output); }
function run(command, args, options = {}) { const result = spawnSync(command, args, { cwd: root, env: { ...childEnv, ...options.env }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); if (result.stdout) process.stdout.write(redact(result.stdout)); if (result.stderr) process.stderr.write(redact(result.stderr)); if (result.status !== 0) throw new Error(`${command} failed.`); return result; }
function runAllowFail(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, env: { ...childEnv, ...options.env }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.stdout) process.stdout.write(redact(result.stdout));
  if (result.stderr) process.stderr.write(redact(result.stderr));
  return result;
}
function compose(args, options) { run("podman-compose", ["-p", project, "-f", composeFile, "--env-file", envFile, ...args], options); }
async function waitFor(url, timeout = 90_000) { const until = Date.now() + timeout; while (Date.now() < until) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 500)); } throw new Error(`Timed out waiting for ${url}`); }
function serviceId(service) { return spawnSync("podman", ["ps", "--all", "--filter", `label=io.podman.compose.project=${project}`, "--filter", `label=com.docker.compose.service=${service}`, "--format", "{{.ID}}"], { cwd: root, env: childEnv, encoding: "utf8" }).stdout.trim(); }
async function waitForHealth(service, timeout = 180_000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const id = serviceId(service);
    if (id) {
      const result = spawnSync("podman", ["inspect", "--format", "{{.State.Health.Status}}|{{.State.Status}}", id], {
        cwd: root,
        env: childEnv,
        encoding: "utf8",
      });
      if (result.status === 0) {
        const [health, state] = result.stdout.trim().split("|");
        if (health === "healthy") return;
        if (state === "exited" || state === "dead") {
          runAllowFail("podman", ["logs", "--tail", "80", id]);
          throw new Error(`${service} container exited before becoming healthy.`);
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const id = serviceId(service);
  if (id) runAllowFail("podman", ["logs", "--tail", "80", id]);
  throw new Error(`Timed out waiting for ${service} health.`);
}

/** Start the static Nginx app without podman `--requires` (4.9.x dependency-graph flake). */
function startAppWithoutRequires(appPort) {
  const appName = `${project}_app_1`;
  runAllowFail("podman", ["rm", "-f", appName]);
  run("podman", [
    "run",
    "-d",
    "--name",
    appName,
    "--label",
    `io.podman.compose.project=${project}`,
    "--label",
    `com.docker.compose.project=${project}`,
    "--label",
    "com.docker.compose.service=app",
    "--network",
    `${project}_default`,
    "--network-alias",
    "app",
    "-p",
    `127.0.0.1:${appPort}:8080`,
    "--read-only",
    "--security-opt",
    "no-new-privileges:true",
    "--cap-drop",
    "ALL",
    "--tmpfs",
    "/tmp",
    "--tmpfs",
    "/var/cache/nginx",
    "--tmpfs",
    "/var/run",
    "--healthcheck-command",
    "CMD-SHELL wget --quiet --spider http://127.0.0.1:8080/ || exit 1",
    "--healthcheck-interval",
    "5s",
    "--healthcheck-timeout",
    "3s",
    "--healthcheck-start-period",
    "5s",
    "--healthcheck-retries",
    "10",
    `${project}_app`,
  ]);
}

let cleaned = false;
function cleanup() { if (cleaned) return; cleaned = true; try { compose(["down", "-v", "--remove-orphans"]); } catch {} try { run("podman", ["network", "rm", `${project}_default`]); } catch {} rmSync(tempDir, { recursive: true, force: true }); }
process.on("SIGINT", () => { cleanup(); process.exit(130); });
process.on("SIGTERM", () => { cleanup(); process.exit(143); });

if (process.env.IMP036F_RUNNER_CANARY_LOGGING_PROBE === "1") {
  const canaryAuth = process.env.CUSTOMER_AUTH_SECRET;
  const canaryPii = process.env.CUSTOMER_AUTH_PII_HASH_SECRET;
  sensitiveValues.add(canaryAuth);
  sensitiveValues.add(canaryPii);
  try {
    run(process.execPath, ["-e", "console.log(`CUSTOMER_AUTH_SECRET=${process.env.CUSTOMER_AUTH_SECRET}`); console.error(`CUSTOMER_AUTH_PII_HASH_SECRET=${process.env.CUSTOMER_AUTH_PII_HASH_SECRET}`); console.log(JSON.stringify({ authPresent: Boolean(process.env.CUSTOMER_AUTH_SECRET), piiPresent: Boolean(process.env.CUSTOMER_AUTH_PII_HASH_SECRET), argvHasCanary: process.argv.some((value) => value.includes('IMP036F_CANARY_')) }));"], { env: { CUSTOMER_AUTH_SECRET: canaryAuth, CUSTOMER_AUTH_PII_HASH_SECRET: canaryPii } });
  } finally { rmSync(tempDir, { recursive: true, force: true }); }
  process.exit(0);
}

try {
  if (process.cwd() !== root) process.chdir(root);
  const [appPort, postgresPort] = await Promise.all([port(), port()]);
  const origin = `http://127.0.0.1:${appPort}`;
  const admin = secret("admin");
  const migrator = secret("migrator");
  const app = secret("app");
  const customerAuthSecret = secret("customer-auth");
  const customerAuthPiiHashSecret = secret("customer-auth-pii");
  const hostMigrationDatabaseUrl = `postgresql://boba_bear_migrator:${migrator}@127.0.0.1:${postgresPort}/boba_bear_local`;
  const hostSeedDatabaseUrl = hostMigrationDatabaseUrl;
  const containerApplicationDatabaseUrl = `postgresql://boba_bear_app:${app}@postgres:5432/boba_bear_local`;
  const workforceAuthSecret = secret("workforce");
  const workforceAuthPiiHashSecret = secret("workforce-pii");
  const workforceE2eEmail = `commercial-${randomUUID()}@example.test`;
  const workforceE2eTempPassword = secret("temp");
  const workforceE2ePermanentPassword = secret("permanent");
  [admin, migrator, app, customerAuthSecret, customerAuthPiiHashSecret, workforceAuthSecret, workforceAuthPiiHashSecret, workforceE2eTempPassword, workforceE2ePermanentPassword].forEach((value) => sensitiveValues.add(value));
  const lines = {
    POSTGRES_USER: "boba_bear_admin",
    POSTGRES_PASSWORD: admin,
    POSTGRES_DB: "postgres",
    POSTGRES_MIGRATOR_PASSWORD: migrator,
    POSTGRES_APP_PASSWORD: app,
    POSTGRES_HOST_PORT: String(postgresPort),
    BOBA_BEAR_APP_HOST_PORT: String(appPort),
    BOBA_BEAR_PUBLIC_ORIGIN: origin,
    BOBA_BEAR_DATABASE_URL: containerApplicationDatabaseUrl,
    BOBA_BEAR_DATABASE_MIGRATION_URL: hostMigrationDatabaseUrl,
    WORKFORCE_AUTH_SECRET: workforceAuthSecret,
    WORKFORCE_AUTH_PII_HASH_SECRET: workforceAuthPiiHashSecret,
    WORKFORCE_AUTH_BASE_URL: origin,
  };
  writeFileSync(envFile, Object.entries(lines).map(([key, value]) => `${key}=${value}`).join("\n") + "\n", { mode: 0o600 });
  const migrationEnv = {
    BOBA_BEAR_ENV: "test",
    BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS: "true",
    BOBA_BEAR_DATABASE_SSL_MODE: "disable",
    BOBA_BEAR_DATABASE_MIGRATION_URL: hostMigrationDatabaseUrl,
    BOBA_BEAR_PUBLIC_ORIGIN: origin,
  };
  const seedEnv = {
    BOBA_BEAR_ENV: "test",
    BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS: "true",
    BOBA_BEAR_DATABASE_SSL_MODE: "disable",
    BOBA_BEAR_DATABASE_URL: hostSeedDatabaseUrl,
    BOBA_BEAR_DATABASE_MIGRATION_URL: hostMigrationDatabaseUrl,
    BOBA_BEAR_PUBLIC_ORIGIN: origin,
    CUSTOMER_AUTH_SECRET: customerAuthSecret,
    CUSTOMER_AUTH_PII_HASH_SECRET: customerAuthPiiHashSecret,
    CUSTOMER_AUTH_BASE_URL: origin,
    WORKFORCE_AUTH_SECRET: workforceAuthSecret,
    WORKFORCE_AUTH_PII_HASH_SECRET: workforceAuthPiiHashSecret,
    WORKFORCE_AUTH_BASE_URL: origin,
    WORKFORCE_E2E_EMAIL: workforceE2eEmail,
    WORKFORCE_E2E_TEMP_PASSWORD: workforceE2eTempPassword,
    WORKFORCE_E2E_PERMANENT_PASSWORD: workforceE2ePermanentPassword,
    COMMERCIAL_E2E_FIXTURE_MANIFEST: manifest,
  };
  const e2eEnv = {
    PLAYWRIGHT_BASE_URL: origin,
    COMMERCIAL_E2E_BASE_URL: origin,
    WORKFORCE_E2E_EMAIL: workforceE2eEmail,
    WORKFORCE_E2E_TEMP_PASSWORD: workforceE2eTempPassword,
    WORKFORCE_E2E_PERMANENT_PASSWORD: workforceE2ePermanentPassword,
    COMMERCIAL_E2E_FIXTURE_MANIFEST: manifest,
  };
  console.log(`commercial workspace E2E: isolated project ${project}`);
  const compiledSeed = buildCommercialWorkspaceSeed({ outputRoot: path.join(tempDir, "compiled-seed") });
  compose(["build", "app", "workforce-auth", "operations"]);
  compose(["up", "-d", "postgres"]);
  await waitForHealth("postgres");
  // pg_isready can pass before init scripts finish; retry host migrator TCP until ready.
  {
    const until = Date.now() + 90_000;
    let ready = false;
    while (Date.now() < until) {
      const probe = spawnSync(
        process.execPath,
        [
          "-e",
          `const net=require('net');const s=net.connect({host:'127.0.0.1',port:${postgresPort}},()=>{s.end();process.exit(0);});s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),2000);`,
        ],
        { cwd: root, env: childEnv, encoding: "utf8" },
      );
      if (probe.status === 0) {
        // Give init scripts a beat after the port accepts connections.
        await new Promise((resolve) => setTimeout(resolve, 2000));
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("Timed out waiting for postgres host port.");
  }
  {
    let lastError = null;
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      try {
        run("npx", ["tsx", "scripts/database/migrate.ts"], { env: migrationEnv });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    if (lastError) throw lastError;
  }
  run("node", ["--conditions=react-server", compiledSeed.entryPath], { env: seedEnv });
  compose(["up", "-d", "workforce-auth", "operations"]);
  // Array.map passes (element, index, array); do not pass waitForHealth directly or index becomes timeout.
  await Promise.all(["workforce-auth", "operations"].map((service) => waitForHealth(service)));
  startAppWithoutRequires(appPort);
  await waitForHealth("app");
  await waitFor(`${origin}/`);
  compose(["ps"]);
  run("podman", ["exec", `${project}_app_1`, "nginx", "-T"]);
  run("npx", ["playwright", "test", "--config=playwright.commercial-workspace.config.ts"], { env: e2eEnv });
  console.log("commercial workspace E2E: PASS (actual Nginx, isolated Compose project)");
} finally { cleanup(); }
