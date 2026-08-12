#!/usr/bin/env node
// HTTP smoke validation for the containerized `app` (Nginx) service
// (IMP-005A). Node built-ins only — no third-party HTTP client.
//
// Usage: node scripts/docker/smoke.mjs [--base-url http://127.0.0.1:8080]
import http from "node:http";
import process from "node:process";

const DEFAULT_BASE_URL = "http://127.0.0.1:8080";
const REQUEST_TIMEOUT_MS = 5_000;

/** Every check the app container must satisfy. `expectedStatus` is what a
 * real static export produces given `next.config.ts` (`trailingSlash:
 * true`) — every page route is a directory with index.html. */
export const ROUTE_CHECKS = [
  { path: "/", expectedStatus: 200, contentTypeIncludes: "text/html" },
  { path: "/privacy", expectedStatus: 200, contentTypeIncludes: "text/html" },
  { path: "/dev", expectedStatus: 200, contentTypeIncludes: "text/html" },
  { path: "/dev/icons", expectedStatus: 200, contentTypeIncludes: "text/html" },
  { path: "/login", expectedStatus: 200, contentTypeIncludes: "text/html" },
  { path: "/robots.txt", expectedStatus: 200, contentTypeIncludes: "text/plain" },
  { path: "/sitemap.xml", expectedStatus: 200, contentTypeIncludes: "xml" },
  { path: "/icon.svg", expectedStatus: 200, contentTypeIncludes: "svg" },
  { path: "/this-route-does-not-exist-58173", expectedStatus: 404 },
];

const MAX_REDIRECTS = 5;

/** Fetch a single request, no redirect handling. */
function fetchRaw(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });
    req.on("timeout", () => {
      req.destroy(new Error(`Timed out after ${timeoutMs}ms requesting ${url}`));
    });
    req.on("error", reject);
  });
}

/**
 * Fetch a path with a bounded timeout, transparently following redirects
 * like a real browser (e.g. Nginx 301-ing a directory route such as
 * "/privacy" to "/privacy/" before serving its index.html — the exported
 * Next.js `trailingSlash: true` output is a directory per route). Never
 * retries on failure — a hanging container should fail fast, not silently
 * absorb time.
 */
export async function fetchOnce(baseUrl, requestPath, timeoutMs = REQUEST_TIMEOUT_MS) {
  let url = new URL(requestPath, baseUrl);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetchRaw(url, timeoutMs);
    if (response.status < 300 || response.status >= 400 || !response.headers.location) {
      return response;
    }
    url = new URL(response.headers.location, url);
  }
  throw new Error(`Too many redirects requesting ${requestPath}`);
}

/** Evaluate one route check's response against its expectations. Returns a
 * list of human-readable failure reasons (empty = passed). Pure — no I/O —
 * so it is unit-testable independently of `fetchOnce`. */
export function evaluateResponse(check, response) {
  const failures = [];

  if (response.status !== check.expectedStatus) {
    failures.push(`expected status ${check.expectedStatus}, got ${response.status}`);
  }

  if (check.contentTypeIncludes) {
    const contentType = response.headers["content-type"] ?? "";
    if (!contentType.includes(check.contentTypeIncludes)) {
      failures.push(
        `expected content-type to include "${check.contentTypeIncludes}", got "${contentType}"`,
      );
    }
  }

  const server = (response.headers.server ?? "").toLowerCase();
  if (/nginx\/\d/.test(server)) {
    failures.push(`response exposes an Nginx version header ("${response.headers.server}")`);
  }

  const lowerBody = response.body.toLowerCase();
  if (lowerBody.includes("index of /") || lowerBody.includes("<title>index of")) {
    failures.push("response looks like a directory listing");
  }
  if (lowerBody.includes("welcome to nginx!")) {
    failures.push("response looks like the Nginx default placeholder page");
  }

  return failures;
}

async function runRouteCheck(baseUrl, check) {
  let response;
  try {
    response = await fetchOnce(baseUrl, check.path);
  } catch (error) {
    return {
      path: check.path,
      ok: false,
      failures: [error instanceof Error ? error.message : String(error)],
    };
  }
  const failures = evaluateResponse(check, response);
  return { path: check.path, ok: failures.length === 0, failures, response };
}

async function runHomePageContentChecks(baseUrl) {
  const failures = [];
  let response;
  try {
    response = await fetchOnce(baseUrl, "/");
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }

  const body = response.body;
  if (!/boba\s*bear/i.test(body)) {
    failures.push("home page response does not mention \"Boba Bear\"");
  }
  if (!/zomato/i.test(body)) {
    failures.push("home page response is missing the Zomato ordering link");
  }
  if (!/swiggy/i.test(body)) {
    failures.push("home page response is missing the Swiggy ordering link");
  }
  return failures;
}

function parseBaseUrl(argv) {
  const flagIndex = argv.indexOf("--base-url");
  if (flagIndex !== -1 && argv[flagIndex + 1]) return argv[flagIndex + 1];
  return process.env.BOBA_BEAR_SMOKE_BASE_URL || DEFAULT_BASE_URL;
}

async function main() {
  const baseUrl = parseBaseUrl(process.argv.slice(2));
  console.log(`docker:smoke — checking ${baseUrl}`);

  const results = [];
  for (const check of ROUTE_CHECKS) {
    results.push(await runRouteCheck(baseUrl, check));
  }
  const homePageFailures = await runHomePageContentChecks(baseUrl);

  let anyFailed = false;
  for (const result of results) {
    if (result.ok) {
      console.log(`  [PASS] ${result.path}`);
    } else {
      anyFailed = true;
      console.log(`  [FAIL] ${result.path}`);
      for (const failure of result.failures) console.log(`         ${failure}`);
    }
  }

  if (homePageFailures.length === 0) {
    console.log("  [PASS] / — BOBA Bear identity and ordering links present");
  } else {
    anyFailed = true;
    console.log("  [FAIL] / — identity/ordering-link check");
    for (const failure of homePageFailures) console.log(`         ${failure}`);
  }

  if (anyFailed) {
    console.error("docker:smoke: one or more checks failed.");
    process.exitCode = 1;
    return;
  }
  console.log("docker:smoke: all checks passed.");
  process.exitCode = 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
