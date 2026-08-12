#!/usr/bin/env node
// HTTP smoke validation for the containerized `workforce-auth` service
// (IMP-010). Node built-ins + `@better-auth/utils/otp` for TOTP generation
// from an enroll-time otpauth URI. Never prints a password, TOTP code,
// otpauth URI, backup code, session cookie value, or any other secret.
//
// The service publishes no host port (see compose.yaml's `workforce-auth`
// service — `expose: ["8082"]` only), so this script reaches its public
// endpoints the same way a real browser would: through the `app` (Nginx)
// container's published port and its `/api/workforce-auth/` proxy
// (docker/nginx/nginx.conf). The two internal-only `/health/*` endpoints
// are deliberately never proxied, so those two checks instead run *inside*
// the running `workforce-auth` container via `docker compose exec`.
//
// Full sign-in → password change → MFA enroll → TOTP verify → session →
// sign-out uses the operator `workforce:user:create` CLI against the host-
// published Postgres port, then drives the HTTP façade through Nginx —
// never a production debug endpoint.
//
// Usage: node scripts/docker/workforce-auth-smoke.mjs [--base-url http://127.0.0.1:8080] [--origin http://localhost:8080]
import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";

import { extractValues, parseEnvFile } from "../database/lib/env-file.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const RUNTIME_ENV_FILE = path.join(projectRoot, ".env.runtime.docker.local");
const WORKFORCE_AUTH_ENV_FILE = path.join(projectRoot, ".env.workforce-auth.docker.local");
const DOCKER_BOOTSTRAP_ENV_FILE = path.join(projectRoot, ".env.docker.local");

const DEFAULT_BASE_URL = "http://127.0.0.1:8080";
const DEFAULT_TRUSTED_ORIGIN = "http://localhost:8080";
const UNTRUSTED_ORIGIN = "http://evil.example.test";
const REQUEST_TIMEOUT_MS = 10_000;
const TEMP_PASSWORD_LENGTH = 24;
const PERMANENT_PASSWORD_LENGTH = 24;

function parseArg(argv, flag, envVar, fallback) {
  const flagIndex = argv.indexOf(flag);
  if (flagIndex !== -1 && argv[flagIndex + 1]) return argv[flagIndex + 1];
  return process.env[envVar] || fallback;
}

/** Minimal JSON HTTP request helper — no redirect handling (the workforce-auth
 * API never redirects). */
function request(baseUrl, requestPath, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(requestPath, baseUrl);
    const req = http.request(
      url,
      { method, headers, timeout: REQUEST_TIMEOUT_MS },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("timeout", () => {
      req.destroy(new Error(`Timed out after ${REQUEST_TIMEOUT_MS}ms requesting ${requestPath}`));
    });
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

function parseJsonBody(response) {
  try {
    return JSON.parse(response.body);
  } catch {
    return null;
  }
}

/** Run a script inside the *running* `workforce-auth` container so the
 * never-proxied `/health/*` endpoints can be reached over its own loopback
 * interface. */
function dockerExecFetch(healthPath) {
  const script =
    "(async () => {" +
    `  try { const r = await fetch('http://127.0.0.1:8082${healthPath}');` +
    "    const text = await r.text();" +
    "    process.stdout.write(JSON.stringify({ status: r.status, body: text }));" +
    "  } catch (error) {" +
    "    process.stdout.write(JSON.stringify({ status: 0, body: '', error: String(error && error.message || error) }));" +
    "  }" +
    "})();";
  const output = execFileSync(
    "docker",
    ["compose", "exec", "-T", "workforce-auth", "node", "-e", script],
    { encoding: "utf8" },
  );
  return JSON.parse(output.trim());
}

export function extractCookieHeader(response) {
  const setCookies = response.headers["set-cookie"];
  if (!setCookies || setCookies.length === 0) return null;
  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

/** Merge prior Cookie header pairs with any new Set-Cookie pairs from
 * `response`, keyed by cookie name. Never logs cookie values. */
export function mergeCookieHeader(existingCookieHeader, response) {
  const map = new Map();
  if (existingCookieHeader) {
    for (const part of existingCookieHeader.split("; ")) {
      const eq = part.indexOf("=");
      if (eq > 0) map.set(part.slice(0, eq), part);
    }
  }
  const setCookies = response.headers["set-cookie"] ?? [];
  for (const cookie of setCookies) {
    const pair = cookie.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) map.set(pair.slice(0, eq), pair);
  }
  return map.size > 0 ? [...map.values()].join("; ") : null;
}

/**
 * Extract the raw TOTP secret from an otpauth URI.
 *
 * Better Auth base32-encodes the raw secret into the otpauth URI; `@better-auth/utils`
 * `createOTP` expects that original raw secret string (and re-encodes internally).
 * Passing the Base32 form through verbatim produces wrong codes.
 *
 * Pure and filesystem-free so unit tests can cover it without secrets.
 *
 * @param {string} totpUri
 * @returns {string | null}
 */
export function parseTotpSecretFromOtpauthUri(totpUri) {
  if (typeof totpUri !== "string" || totpUri.length === 0) return null;
  let url;
  try {
    url = new URL(totpUri);
  } catch {
    return null;
  }
  if (url.protocol !== "otpauth:") return null;
  const encoded = url.searchParams.get("secret");
  if (!encoded || !/^[A-Z2-7]+=*$/i.test(encoded)) return null;
  try {
    return new TextDecoder().decode(base32.decode(encoded.toUpperCase()));
  } catch {
    return null;
  }
}

/** Rewrite a Compose-internal `postgres:5432` database URL so the host
 * operator CLI can reach the published Postgres port. */
export function rewriteDatabaseUrlForHost(databaseUrl, hostPort = "5433") {
  if (typeof databaseUrl !== "string") return databaseUrl;
  return databaseUrl
    .replace("@postgres:5432", `@127.0.0.1:${hostPort}`)
    .replace("@postgres/", `@127.0.0.1:${hostPort}/`);
}

function generateAlphabeticPassword(length) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function readEnvFileValues(filePath) {
  if (!existsSync(filePath)) return null;
  const parsed = parseEnvFile(readFileSync(filePath, "utf8"));
  const extracted = extractValues(parsed);
  if (!extracted.ok) return null;
  return extracted.values;
}

function buildHostOperatorEnv() {
  const runtime = readEnvFileValues(RUNTIME_ENV_FILE);
  const workforce = readEnvFileValues(WORKFORCE_AUTH_ENV_FILE);
  const docker = readEnvFileValues(DOCKER_BOOTSTRAP_ENV_FILE) ?? {};
  if (!runtime || !workforce) return null;

  const hostPort = docker.POSTGRES_HOST_PORT || "5433";
  const env = { ...process.env, ...runtime, ...workforce };
  if (env.BOBA_BEAR_DATABASE_URL) {
    env.BOBA_BEAR_DATABASE_URL = rewriteDatabaseUrlForHost(env.BOBA_BEAR_DATABASE_URL, hostPort);
  }
  // Never pass customer secrets into the operator process from the smoke
  // harness — workforce config only needs them for distinctness when present.
  for (const key of Object.keys(env)) {
    if (key.startsWith("CUSTOMER_AUTH_") || key.startsWith("CUSTOMER_OTP_")) {
      delete env[key];
    }
  }
  return env;
}

function createWorkforceSmokeUser({ email, name, password, env }) {
  const result = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "scripts/workforce/create-user.ts",
      `--email=${email}`,
      `--name=${name}`,
      `--password=${password}`,
    ],
    {
      cwd: projectRoot,
      env,
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || "").trim();
    // Safe: create-user never prints the password; still strip anything that
    // looks like a password= assignment defensively.
    const safe = message.replace(/password=[^\s"']+/gi, "password=[redacted]");
    throw new Error(`workforce:user:create failed (exit ${result.status}): ${safe || "no output"}`);
  }
}

function checkNoHostPortPublished() {
  const name = "workforce-auth publishes no host port";
  try {
    const containerId = execFileSync("docker", ["compose", "ps", "-q", "workforce-auth"], {
      encoding: "utf8",
    }).trim();
    if (!containerId) {
      return { name, ok: false, failures: ["workforce-auth container is not running"] };
    }
    const inspect = JSON.parse(
      execFileSync("docker", ["inspect", containerId], { encoding: "utf8" }),
    )[0];
    const portBindings = inspect.HostConfig?.PortBindings ?? {};
    if (Object.keys(portBindings).length > 0) {
      return {
        name,
        ok: false,
        failures: [`unexpected host port bindings: ${Object.keys(portBindings).join(", ")}`],
      };
    }
    return { name, ok: true, failures: [] };
  } catch (error) {
    return { name, ok: false, failures: [error instanceof Error ? error.message : String(error)] };
  }
}

async function checkHealthLive() {
  const name = "health/live (in-container)";
  try {
    const result = dockerExecFetch("/health/live");
    const body = result.body ? JSON.parse(result.body) : null;
    if (result.status !== 200 || !body || body.ok !== true) {
      return { name, ok: false, failures: [`expected {status:200, ok:true}, got ${JSON.stringify(result)}`] };
    }
    return { name, ok: true, failures: [] };
  } catch (error) {
    return { name, ok: false, failures: [error instanceof Error ? error.message : String(error)] };
  }
}

async function checkHealthReady() {
  const name = "health/ready (in-container)";
  try {
    const result = dockerExecFetch("/health/ready");
    const body = result.body ? JSON.parse(result.body) : null;
    if (result.status !== 200 || !body || body.ok !== true) {
      return { name, ok: false, failures: [`expected {status:200, ok:true}, got ${JSON.stringify(result)}`] };
    }
    return { name, ok: true, failures: [] };
  } catch (error) {
    return { name, ok: false, failures: [error instanceof Error ? error.message : String(error)] };
  }
}

async function checkSessionUnauthenticated(baseUrl) {
  const name = "GET /api/workforce-auth/session (unauthenticated)";
  const response = await request(baseUrl, "/api/workforce-auth/session");
  const body = parseJsonBody(response);
  const failures = [];
  if (response.status !== 200) failures.push(`expected status 200, got ${response.status}`);
  if (!body || body.authenticated !== false) {
    failures.push(`expected {authenticated:false}, got ${JSON.stringify(body)}`);
  }
  return { name, ok: failures.length === 0, failures };
}

async function checkUnknownPathNotFound(baseUrl) {
  const name = "GET /api/workforce-auth/<unknown> (404)";
  const response = await request(baseUrl, "/api/workforce-auth/this-endpoint-does-not-exist-58173");
  const body = parseJsonBody(response);
  const failures = [];
  if (response.status !== 404) failures.push(`expected status 404, got ${response.status}`);
  if (!body || body.code !== "NOT_FOUND") failures.push(`expected code NOT_FOUND, got ${JSON.stringify(body)}`);
  return { name, ok: failures.length === 0, failures };
}

async function checkMethodNotAllowed(baseUrl) {
  const name = "GET /api/workforce-auth/sign-in (405)";
  const response = await request(baseUrl, "/api/workforce-auth/sign-in");
  const body = parseJsonBody(response);
  const failures = [];
  if (response.status !== 405) failures.push(`expected status 405, got ${response.status}`);
  if (!(response.headers.allow ?? "").includes("POST")) {
    failures.push(`expected Allow header to include POST, got "${response.headers.allow}"`);
  }
  if (!body || body.code !== "METHOD_NOT_ALLOWED") {
    failures.push(`expected code METHOD_NOT_ALLOWED, got ${JSON.stringify(body)}`);
  }
  return { name, ok: failures.length === 0, failures };
}

async function checkUntrustedOriginRejected(baseUrl) {
  const name = "POST /api/workforce-auth/sign-in (untrusted Origin)";
  const response = await request(baseUrl, "/api/workforce-auth/sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: UNTRUSTED_ORIGIN },
    body: JSON.stringify({ email: "smoke@example.test", password: "x".repeat(16) }),
  });
  const body = parseJsonBody(response);
  const failures = [];
  if (response.status !== 403) failures.push(`expected status 403, got ${response.status}`);
  if (!body || body.code !== "INVALID_REQUEST") {
    failures.push(`expected code INVALID_REQUEST, got ${JSON.stringify(body)}`);
  }
  return { name, ok: failures.length === 0, failures };
}

async function checkCustomerAuthStillWorks(baseUrl) {
  const name = "customer-auth session still reachable through Nginx";
  const response = await request(baseUrl, "/api/customer-auth/session");
  const body = parseJsonBody(response);
  const failures = [];
  if (response.status !== 200) failures.push(`expected status 200, got ${response.status}`);
  if (!body || body.authenticated !== false) {
    failures.push(`expected {authenticated:false}, got ${JSON.stringify(body)}`);
  }
  return { name, ok: failures.length === 0, failures };
}

async function checkAppRemainsHealthy(baseUrl) {
  const name = "app remains healthy (GET /)";
  const response = await request(baseUrl, "/");
  const failures = [];
  if (response.status !== 200) failures.push(`expected status 200, got ${response.status}`);
  if (!/boba\s*bear/i.test(response.body)) {
    failures.push('home page response does not mention "Boba Bear"');
  }
  return { name, ok: failures.length === 0, failures };
}

/**
 * Full operator-create → sign-in → change-password → MFA enroll → TOTP
 * verify-enrollment → sign-in → MFA verify → session → sign-out round trip.
 * Never logs passwords, TOTP material, or cookies — only pass/fail.
 */
async function checkFullWorkforceAuthRoundTrip(baseUrl, trustedOrigin) {
  const name =
    "full create → sign-in → change-password → MFA enroll/verify → session → sign-out round trip";
  const failures = [];
  const env = buildHostOperatorEnv();
  if (!env) {
    return {
      name,
      ok: false,
      failures: [
        "missing .env.runtime.docker.local or .env.workforce-auth.docker.local — run `npm run docker:env:init`",
      ],
    };
  }

  const stamp = Date.now().toString(36);
  const email = `smoke.workforce.${stamp}@example.test`;
  const temporaryPassword = generateAlphabeticPassword(TEMP_PASSWORD_LENGTH);
  const permanentPassword = generateAlphabeticPassword(PERMANENT_PASSWORD_LENGTH);

  try {
    createWorkforceSmokeUser({
      email,
      name: "Workforce Smoke Operator",
      password: temporaryPassword,
      env,
    });
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
    return { name, ok: false, failures };
  }

  let cookies = null;

  const signIn1 = await request(baseUrl, "/api/workforce-auth/sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: trustedOrigin },
    body: JSON.stringify({ email, password: temporaryPassword }),
  });
  const signIn1Body = parseJsonBody(signIn1);
  if (signIn1.status !== 200 || !signIn1Body || signIn1Body.next !== "change_password") {
    failures.push(
      `sign-in(temp): expected 200 next=change_password, got ${signIn1.status} ${JSON.stringify(signIn1Body)}`,
    );
    return { name, ok: false, failures };
  }
  cookies = mergeCookieHeader(cookies, signIn1);
  if (!cookies) {
    failures.push("sign-in(temp): expected Set-Cookie for the limited session");
    return { name, ok: false, failures };
  }

  const changePassword = await request(baseUrl, "/api/workforce-auth/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: trustedOrigin,
      Cookie: cookies,
    },
    body: JSON.stringify({
      currentPassword: temporaryPassword,
      newPassword: permanentPassword,
    }),
  });
  const changeBody = parseJsonBody(changePassword);
  if (changePassword.status !== 200 || !changeBody || changeBody.next !== "mfa_enrollment") {
    failures.push(
      `change-password: expected 200 next=mfa_enrollment, got ${changePassword.status} ${JSON.stringify(changeBody)}`,
    );
    return { name, ok: false, failures };
  }
  cookies = mergeCookieHeader(cookies, changePassword) ?? cookies;

  const enroll = await request(baseUrl, "/api/workforce-auth/mfa/enroll", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: trustedOrigin,
      Cookie: cookies,
    },
    body: JSON.stringify({ password: permanentPassword }),
  });
  const enrollBody = parseJsonBody(enroll);
  if (enroll.status !== 200 || !enrollBody || typeof enrollBody.totpUri !== "string") {
    failures.push(
      `mfa/enroll: expected 200 with totpUri, got ${enroll.status} (body keys redacted)`,
    );
    return { name, ok: false, failures };
  }
  cookies = mergeCookieHeader(cookies, enroll) ?? cookies;

  const secret = parseTotpSecretFromOtpauthUri(enrollBody.totpUri);
  if (!secret) {
    failures.push("mfa/enroll: totpUri did not contain a usable Base32 secret");
    return { name, ok: false, failures };
  }

  let enrollmentCode;
  try {
    enrollmentCode = await createOTP(secret, { digits: 6, period: 30 }).totp();
  } catch (error) {
    failures.push(
      `failed to generate TOTP from enroll URI: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { name, ok: false, failures };
  }

  const verifyEnrollment = await request(baseUrl, "/api/workforce-auth/mfa/verify-enrollment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: trustedOrigin,
      Cookie: cookies,
    },
    body: JSON.stringify({ code: enrollmentCode }),
  });
  const verifyEnrollmentBody = parseJsonBody(verifyEnrollment);
  if (
    verifyEnrollment.status !== 200 ||
    !verifyEnrollmentBody ||
    verifyEnrollmentBody.next !== "sign_in"
  ) {
    failures.push(
      `mfa/verify-enrollment: expected 200 next=sign_in, got ${verifyEnrollment.status} ${JSON.stringify(verifyEnrollmentBody)}`,
    );
    return { name, ok: false, failures };
  }

  const signIn2 = await request(baseUrl, "/api/workforce-auth/sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: trustedOrigin },
    body: JSON.stringify({ email, password: permanentPassword }),
  });
  const signIn2Body = parseJsonBody(signIn2);
  if (signIn2.status !== 200 || !signIn2Body || signIn2Body.next !== "mfa") {
    failures.push(
      `sign-in(permanent): expected 200 next=mfa, got ${signIn2.status} ${JSON.stringify(signIn2Body)}`,
    );
    return { name, ok: false, failures };
  }
  cookies = mergeCookieHeader(null, signIn2);
  if (!cookies) {
    failures.push("sign-in(permanent): expected Set-Cookie for the MFA challenge session");
    return { name, ok: false, failures };
  }

  let mfaCode;
  try {
    mfaCode = await createOTP(secret, { digits: 6, period: 30 }).totp();
  } catch (error) {
    failures.push(
      `failed to generate TOTP for MFA verify: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { name, ok: false, failures };
  }

  const mfaVerify = await request(baseUrl, "/api/workforce-auth/mfa/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: trustedOrigin,
      Cookie: cookies,
    },
    body: JSON.stringify({ code: mfaCode }),
  });
  const mfaVerifyBody = parseJsonBody(mfaVerify);
  if (mfaVerify.status !== 200 || !mfaVerifyBody || mfaVerifyBody.authenticated !== true) {
    failures.push(
      `mfa/verify: expected 200 authenticated:true, got ${mfaVerify.status} ${JSON.stringify(mfaVerifyBody)}`,
    );
    return { name, ok: false, failures };
  }
  cookies = mergeCookieHeader(cookies, mfaVerify) ?? cookies;

  const session = await request(baseUrl, "/api/workforce-auth/session", {
    headers: { Cookie: cookies },
  });
  const sessionBody = parseJsonBody(session);
  if (session.status !== 200 || !sessionBody || sessionBody.authenticated !== true) {
    failures.push(
      `session: expected 200 authenticated:true, got ${session.status} ${JSON.stringify(sessionBody)}`,
    );
  }

  const signOut = await request(baseUrl, "/api/workforce-auth/sign-out", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: trustedOrigin,
      Cookie: cookies,
    },
    body: "{}",
  });
  const signOutBody = parseJsonBody(signOut);
  if (signOut.status !== 200 || !signOutBody || signOutBody.authenticated !== false) {
    failures.push(
      `sign-out: expected 200 authenticated:false, got ${signOut.status} ${JSON.stringify(signOutBody)}`,
    );
  }

  return { name, ok: failures.length === 0, failures };
}

async function main() {
  const argv = process.argv.slice(2);
  const baseUrl = parseArg(argv, "--base-url", "BOBA_BEAR_WORKFORCE_AUTH_SMOKE_BASE_URL", DEFAULT_BASE_URL);
  const trustedOrigin = parseArg(
    argv,
    "--origin",
    "BOBA_BEAR_WORKFORCE_AUTH_SMOKE_ORIGIN",
    DEFAULT_TRUSTED_ORIGIN,
  );
  console.log(`docker:workforce-auth:smoke — checking ${baseUrl} (trusted origin: ${trustedOrigin})`);

  const checks = [
    checkNoHostPortPublished(),
    await checkHealthLive(),
    await checkHealthReady(),
    await checkSessionUnauthenticated(baseUrl),
    await checkUnknownPathNotFound(baseUrl),
    await checkMethodNotAllowed(baseUrl),
    await checkUntrustedOriginRejected(baseUrl),
    await checkCustomerAuthStillWorks(baseUrl),
    await checkAppRemainsHealthy(baseUrl),
    await checkFullWorkforceAuthRoundTrip(baseUrl, trustedOrigin),
  ];

  let anyFailed = false;
  for (const check of checks) {
    if (check.ok) {
      console.log(`  [PASS] ${check.name}`);
    } else {
      anyFailed = true;
      console.log(`  [FAIL] ${check.name}`);
      for (const failure of check.failures) console.log(`         ${failure}`);
    }
  }

  if (anyFailed) {
    console.error("docker:workforce-auth:smoke: one or more checks failed.");
    process.exitCode = 1;
    return;
  }
  console.log("docker:workforce-auth:smoke: all checks passed.");
  process.exitCode = 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
