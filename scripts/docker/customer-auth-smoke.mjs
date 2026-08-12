#!/usr/bin/env node
// HTTP smoke validation for the containerized `customer-auth` service
// (IMP-009). Node built-ins only — no third-party HTTP client. Never prints
// an OTP code, a session cookie value, or any other secret.
//
// The service publishes no host port (see compose.yaml's `customer-auth`
// service — `expose: ["8081"]` only), so this script reaches its six public
// endpoints the same way a real browser would: through the `app` (Nginx)
// container's published port and its `/api/customer-auth/` proxy
// (docker/nginx/nginx.conf). The two internal-only `/health/*` endpoints
// are deliberately never proxied, so those two checks instead run *inside*
// the running `customer-auth` container via `docker compose exec`.
//
// Usage: node scripts/docker/customer-auth-smoke.mjs [--base-url http://127.0.0.1:8080] [--origin http://localhost:8080]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { extractValues, parseEnvFile } from "../database/lib/env-file.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const CUSTOMER_AUTH_ENV_FILE = path.join(projectRoot, ".env.customer-auth.docker.local");

const DEFAULT_BASE_URL = "http://127.0.0.1:8080";
const DEFAULT_TRUSTED_ORIGIN = "http://localhost:8080";
const UNTRUSTED_ORIGIN = "http://evil.example.test";
const REQUEST_TIMEOUT_MS = 5_000;

function parseArg(argv, flag, envVar, fallback) {
  const flagIndex = argv.indexOf(flag);
  if (flagIndex !== -1 && argv[flagIndex + 1]) return argv[flagIndex + 1];
  return process.env[envVar] || fallback;
}

/** Minimal JSON HTTP request helper — no redirect handling (the customer-auth
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

/** Run a script inside the *running* `customer-auth` container so the
 * never-proxied `/health/*` endpoints can be reached over its own loopback
 * interface. Requires no third-party HTTP client inside the container
 * either — the service image ships Node 22, which has a global `fetch`. */
function dockerExecFetch(healthPath) {
  const script =
    "(async () => {" +
    `  try { const r = await fetch('http://127.0.0.1:8081${healthPath}');` +
    "    const text = await r.text();" +
    "    process.stdout.write(JSON.stringify({ status: r.status, body: text }));" +
    "  } catch (error) {" +
    "    process.stdout.write(JSON.stringify({ status: 0, body: '', error: String(error && error.message || error) }));" +
    "  }" +
    "})();";
  const output = execFileSync(
    "docker",
    ["compose", "exec", "-T", "customer-auth", "node", "-e", script],
    { encoding: "utf8" },
  );
  return JSON.parse(output.trim());
}

/** Pure extraction of a usable fixed OTP code from an already-parsed
 * `.env.customer-auth.docker.local` key/value map — only returns a code
 * when the local provider is configured with a valid six-digit fixed code.
 * File-system-free so it is unit-testable with in-memory fixtures. */
export function resolveFixedOtpCode(values) {
  if (!values || values.CUSTOMER_OTP_PROVIDER !== "local") return null;
  const code = values.CUSTOMER_OTP_LOCAL_FIXED_CODE;
  if (!code || !/^\d{6}$/.test(code)) return null;
  return code;
}

/** Reads the local, git-ignored customer-auth env file (if present) to find
 * a usable fixed OTP code for the optional full send/verify round trip.
 * Never prints the code — only whether one was found. */
function readLocalFixedOtpCode() {
  if (!existsSync(CUSTOMER_AUTH_ENV_FILE)) return null;
  const parsed = parseEnvFile(readFileSync(CUSTOMER_AUTH_ENV_FILE, "utf8"));
  const extracted = extractValues(parsed);
  if (!extracted.ok) return null;
  return resolveFixedOtpCode(extracted.values);
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
  const name = "GET /api/customer-auth/session (unauthenticated)";
  const response = await request(baseUrl, "/api/customer-auth/session");
  const body = parseJsonBody(response);
  const failures = [];
  if (response.status !== 200) failures.push(`expected status 200, got ${response.status}`);
  if (!body || body.authenticated !== false) {
    failures.push(`expected {authenticated:false}, got ${JSON.stringify(body)}`);
  }
  return { name, ok: failures.length === 0, failures };
}

async function checkUnknownPathNotFound(baseUrl) {
  const name = "GET /api/customer-auth/<unknown> (404)";
  const response = await request(baseUrl, "/api/customer-auth/this-endpoint-does-not-exist-58173");
  const body = parseJsonBody(response);
  const failures = [];
  if (response.status !== 404) failures.push(`expected status 404, got ${response.status}`);
  if (!body || body.code !== "NOT_FOUND") failures.push(`expected code NOT_FOUND, got ${JSON.stringify(body)}`);
  return { name, ok: failures.length === 0, failures };
}

async function checkMethodNotAllowed(baseUrl) {
  const name = "GET /api/customer-auth/send-otp (405)";
  const response = await request(baseUrl, "/api/customer-auth/send-otp");
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
  const name = "POST /api/customer-auth/send-otp (untrusted Origin)";
  const response = await request(baseUrl, "/api/customer-auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: UNTRUSTED_ORIGIN },
    body: JSON.stringify({ phoneNumber: "9876543210" }),
  });
  const body = parseJsonBody(response);
  const failures = [];
  if (response.status !== 403) failures.push(`expected status 403, got ${response.status}`);
  if (!body || body.code !== "INVALID_REQUEST") {
    failures.push(`expected code INVALID_REQUEST, got ${JSON.stringify(body)}`);
  }
  return { name, ok: failures.length === 0, failures };
}

async function checkInvalidJsonRejected(baseUrl, trustedOrigin) {
  const name = "POST /api/customer-auth/send-otp (malformed JSON body)";
  const response = await request(baseUrl, "/api/customer-auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: trustedOrigin },
    body: "{not-valid-json",
  });
  const body = parseJsonBody(response);
  const failures = [];
  if (response.status !== 400) failures.push(`expected status 400, got ${response.status}`);
  if (!body || body.code !== "INVALID_REQUEST") {
    failures.push(`expected code INVALID_REQUEST, got ${JSON.stringify(body)}`);
  }
  return { name, ok: failures.length === 0, failures };
}

async function checkInvalidPhoneRejected(baseUrl, trustedOrigin) {
  const name = "POST /api/customer-auth/send-otp (invalid phone number)";
  const response = await request(baseUrl, "/api/customer-auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: trustedOrigin },
    body: JSON.stringify({ phoneNumber: "not-a-phone-number" }),
  });
  const body = parseJsonBody(response);
  const failures = [];
  if (response.status !== 400) failures.push(`expected status 400, got ${response.status}`);
  if (!body || body.code !== "INVALID_PHONE_NUMBER") {
    failures.push(`expected code INVALID_PHONE_NUMBER, got ${JSON.stringify(body)}`);
  }
  return { name, ok: failures.length === 0, failures };
}

export function extractCookieHeader(response) {
  const setCookies = response.headers["set-cookie"];
  if (!setCookies || setCookies.length === 0) return null;
  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

/**
 * Full send/verify/session/sign-out round trip — only runs when a local
 * fixed OTP code is configured (never in a real deployment). Uses a
 * synthetic phone number reserved for this smoke check and never logs the
 * code or any cookie value, only pass/fail outcomes.
 */
async function checkFullOtpRoundTrip(baseUrl, trustedOrigin, fixedCode) {
  const name = "full send-otp -> verify-otp -> session -> sign-out round trip";
  const phoneNumber = "9000000001";
  const failures = [];

  const sendResponse = await request(baseUrl, "/api/customer-auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: trustedOrigin },
    body: JSON.stringify({ phoneNumber }),
  });
  const sendBody = parseJsonBody(sendResponse);
  if (sendResponse.status !== 202 || !sendBody || sendBody.code !== "OTP_REQUEST_ACCEPTED") {
    failures.push(`send-otp: expected 202 OTP_REQUEST_ACCEPTED, got ${sendResponse.status} ${JSON.stringify(sendBody)}`);
    return { name, ok: false, failures };
  }

  const verifyResponse = await request(baseUrl, "/api/customer-auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: trustedOrigin },
    body: JSON.stringify({ phoneNumber, code: fixedCode }),
  });
  const verifyBody = parseJsonBody(verifyResponse);
  if (verifyResponse.status !== 200 || !verifyBody || verifyBody.authenticated !== true) {
    failures.push(`verify-otp: expected 200 authenticated:true, got ${verifyResponse.status} ${JSON.stringify(verifyBody)}`);
    return { name, ok: false, failures };
  }

  const cookieHeader = extractCookieHeader(verifyResponse);
  if (!cookieHeader) {
    failures.push("verify-otp: expected a Set-Cookie header on success");
    return { name, ok: false, failures };
  }

  const sessionResponse = await request(baseUrl, "/api/customer-auth/session", {
    headers: { Cookie: cookieHeader },
  });
  const sessionBody = parseJsonBody(sessionResponse);
  if (sessionResponse.status !== 200 || !sessionBody || sessionBody.authenticated !== true) {
    failures.push(`session: expected 200 authenticated:true, got ${sessionResponse.status} ${JSON.stringify(sessionBody)}`);
  }

  const signOutResponse = await request(baseUrl, "/api/customer-auth/sign-out", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: trustedOrigin, Cookie: cookieHeader },
    body: "{}",
  });
  const signOutBody = parseJsonBody(signOutResponse);
  if (signOutResponse.status !== 200 || !signOutBody || signOutBody.authenticated !== false) {
    failures.push(`sign-out: expected 200 authenticated:false, got ${signOutResponse.status} ${JSON.stringify(signOutBody)}`);
  }

  return { name, ok: failures.length === 0, failures };
}

async function main() {
  const argv = process.argv.slice(2);
  const baseUrl = parseArg(argv, "--base-url", "BOBA_BEAR_CUSTOMER_AUTH_SMOKE_BASE_URL", DEFAULT_BASE_URL);
  const trustedOrigin = parseArg(argv, "--origin", "BOBA_BEAR_CUSTOMER_AUTH_SMOKE_ORIGIN", DEFAULT_TRUSTED_ORIGIN);
  console.log(`docker:customer-auth:smoke — checking ${baseUrl} (trusted origin: ${trustedOrigin})`);

  const checks = [
    await checkHealthLive(),
    await checkHealthReady(),
    await checkSessionUnauthenticated(baseUrl),
    await checkUnknownPathNotFound(baseUrl),
    await checkMethodNotAllowed(baseUrl),
    await checkUntrustedOriginRejected(baseUrl),
    await checkInvalidJsonRejected(baseUrl, trustedOrigin),
    await checkInvalidPhoneRejected(baseUrl, trustedOrigin),
  ];

  const fixedCode = readLocalFixedOtpCode();
  if (fixedCode) {
    checks.push(await checkFullOtpRoundTrip(baseUrl, trustedOrigin, fixedCode));
  } else {
    console.log("  [SKIP] full OTP round trip — no local fixed OTP code configured");
  }

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
    console.error("docker:customer-auth:smoke: one or more checks failed.");
    process.exitCode = 1;
    return;
  }
  console.log("docker:customer-auth:smoke: all checks passed.");
  process.exitCode = 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
