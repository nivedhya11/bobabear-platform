#!/usr/bin/env node
/** Isolated actual-Nginx E2E runner for IMP-030. */
import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { buildOperationsLifecycleSeed } from "./build-operations-lifecycle-seed.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const composeFile = "compose.operations-lifecycle-e2e.yaml";
const project = `imp030e2e_${randomBytes(6).toString("hex")}`;
if (!/^imp030e2e_[a-z0-9]+$/.test(project)) throw new Error("Invalid E2E project name.");
const podmanSocket = `unix:///run/user/${process.getuid()}/podman/podman.sock`;
const tempDir = mkdtempSync(path.join(os.tmpdir(), "imp030e2e_"));
chmodSync(tempDir, 0o700);
const envFile = path.join(tempDir, "runtime.env");
const manifest = path.join(tempDir, "fixtures.json");

function port() { return new Promise((resolve, reject) => { const server = net.createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const address = server.address(); server.close((error) => error ? reject(error) : resolve(address.port)); }); }); }
function secret(label) { return `${label}-${randomBytes(24).toString("hex")}`; }
const childEnv = { ...process.env, DOCKER_HOST: podmanSocket, TESTCONTAINERS_RYUK_DISABLED: "true" };
delete childEnv.DOCKER_CONTEXT;
const sensitiveValues = new Set();
function redact(output) { return [...sensitiveValues].filter(Boolean).sort((left, right) => right.length - left.length).reduce((value, sensitive) => value.split(sensitive).join("[REDACTED]"), output); }
function run(command, args, options = {}) { const result = spawnSync(command, args, { cwd: root, env: { ...childEnv, ...options.env }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); if (result.stdout) process.stdout.write(redact(result.stdout)); if (result.stderr) process.stderr.write(redact(result.stderr)); if (result.status !== 0) throw new Error(`${command} failed.`); }
function compose(args, options) { run("podman-compose", ["-p", project, "-f", composeFile, "--env-file", envFile, ...args], options); }
async function waitFor(url, timeout = 90_000) { const until = Date.now() + timeout; while (Date.now() < until) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 500)); } throw new Error(`Timed out waiting for ${url}`); }
function serviceId(service) { return spawnSync("podman", ["ps", "--all", "--filter", `label=io.podman.compose.project=${project}`, "--filter", `label=com.docker.compose.service=${service}`, "--format", "{{.ID}}"], { cwd: root, env: childEnv, encoding: "utf8" }).stdout.trim(); }
async function waitForHealth(service, timeout = 90_000) { const until = Date.now() + timeout; while (Date.now() < until) { const id = serviceId(service); if (id) { const result = spawnSync("podman", ["inspect", "--format", "{{.State.Health.Status}}", id], { cwd: root, env: childEnv, encoding: "utf8" }); if (result.status === 0 && result.stdout.trim() === "healthy") return; } await new Promise((resolve) => setTimeout(resolve, 500)); } throw new Error(`Timed out waiting for ${service} health.`); }

let cleaned = false;
function cleanup() { if (cleaned) return; cleaned = true; try { compose(["down", "-v", "--remove-orphans"]); } catch {} try { run("podman", ["network", "rm", `${project}_default`]); } catch {} rmSync(tempDir, { recursive: true, force: true }); }
process.on("SIGINT", () => { cleanup(); process.exit(130); });
process.on("SIGTERM", () => { cleanup(); process.exit(143); });

if (process.env.IMP030_RUNNER_CANARY_LOGGING_PROBE === "1") {
  const canaryAuth = process.env.CUSTOMER_AUTH_SECRET;
  const canaryPii = process.env.CUSTOMER_AUTH_PII_HASH_SECRET;
  sensitiveValues.add(canaryAuth);
  sensitiveValues.add(canaryPii);
  try {
    run(process.execPath, ["-e", "console.log(`CUSTOMER_AUTH_SECRET=${process.env.CUSTOMER_AUTH_SECRET}`); console.error(`CUSTOMER_AUTH_PII_HASH_SECRET=${process.env.CUSTOMER_AUTH_PII_HASH_SECRET}`); console.log(JSON.stringify({ authPresent: Boolean(process.env.CUSTOMER_AUTH_SECRET), piiPresent: Boolean(process.env.CUSTOMER_AUTH_PII_HASH_SECRET), argvHasCanary: process.argv.some((value) => value.includes('IMP030_CANARY_')) }));"], { env: { CUSTOMER_AUTH_SECRET: canaryAuth, CUSTOMER_AUTH_PII_HASH_SECRET: canaryPii } });
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
  const workforceE2eEmail = `ops-${randomUUID()}@example.test`;
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
    OPERATIONS_E2E_FIXTURE_MANIFEST: manifest,
  };
  const e2eEnv = {
    OPERATIONS_E2E_BASE_URL: origin,
    WORKFORCE_E2E_EMAIL: workforceE2eEmail,
    WORKFORCE_E2E_TEMP_PASSWORD: workforceE2eTempPassword,
    WORKFORCE_E2E_PERMANENT_PASSWORD: workforceE2ePermanentPassword,
    OPERATIONS_E2E_FIXTURE_MANIFEST: manifest,
  };
  console.log(`operations lifecycle E2E: isolated project ${project}`);
  const compiledSeed = buildOperationsLifecycleSeed({ outputRoot: path.join(tempDir, "compiled-seed") });
  compose(["build", "app", "workforce-auth", "operations"]);
  compose(["up", "-d", "postgres"]);
  await waitForHealth("postgres");
  run("npx", ["tsx", "scripts/database/migrate.ts"], { env: migrationEnv });
  run("node", ["--conditions=react-server", compiledSeed.entryPath], { env: seedEnv });
  compose(["up", "-d", "workforce-auth", "operations", "app"]);
  // Array.map passes (element, index, array); do not pass waitForHealth directly or index becomes timeout.
  await Promise.all(["workforce-auth", "operations", "app"].map((service) => waitForHealth(service)));
  await waitFor(`${origin}/`);
  compose(["ps"]);
  compose(["exec", "-T", "app", "nginx", "-T"]);
  run("npx", ["playwright", "test", "--config=playwright.operations-lifecycle.config.ts"], { env: e2eEnv });
  console.log("operations lifecycle E2E: PASS (actual Nginx, isolated Compose project)");
} finally { cleanup(); }
