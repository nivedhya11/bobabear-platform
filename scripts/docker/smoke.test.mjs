import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluateResponse, ROUTE_CHECKS } from "./smoke.mjs";

function fakeResponse({ status = 200, headers = {}, body = "" } = {}) {
  return { status, headers, body };
}

test("evaluateResponse passes a matching status and content type", () => {
  const check = { path: "/", expectedStatus: 200, contentTypeIncludes: "text/html" };
  const failures = evaluateResponse(check, fakeResponse({ headers: { "content-type": "text/html; charset=utf-8" } }));
  assert.deepEqual(failures, []);
});

test("evaluateResponse fails on a wrong status code", () => {
  const check = { path: "/", expectedStatus: 200 };
  const failures = evaluateResponse(check, fakeResponse({ status: 500 }));
  assert.equal(failures.length, 1);
  assert.match(failures[0], /expected status 200, got 500/);
});

test("evaluateResponse requires a real 404 for the unknown-route check, not a 200", () => {
  const check = ROUTE_CHECKS.find((c) => c.expectedStatus === 404);
  assert.ok(check, "fixture must include a 404 route check");
  const failures = evaluateResponse(check, fakeResponse({ status: 200 }));
  assert.equal(failures.length, 1);
  assert.match(failures[0], /expected status 404, got 200/);
});

test("evaluateResponse fails on a mismatched content type", () => {
  const check = { path: "/robots.txt", expectedStatus: 200, contentTypeIncludes: "text/plain" };
  const failures = evaluateResponse(check, fakeResponse({ headers: { "content-type": "text/html" } }));
  assert.equal(failures.length, 1);
  assert.match(failures[0], /content-type/);
});

test("evaluateResponse flags an Nginx version header", () => {
  const check = { path: "/", expectedStatus: 200 };
  const failures = evaluateResponse(check, fakeResponse({ headers: { server: "nginx/1.30.4" } }));
  assert.equal(failures.length, 1);
  assert.match(failures[0], /Nginx version header/);
});

test("evaluateResponse does not flag a version-suppressed Nginx header", () => {
  const check = { path: "/", expectedStatus: 200 };
  const failures = evaluateResponse(check, fakeResponse({ headers: { server: "nginx" } }));
  assert.deepEqual(failures, []);
});

test("evaluateResponse flags a directory-listing-shaped body", () => {
  const check = { path: "/assets/", expectedStatus: 200 };
  const failures = evaluateResponse(check, fakeResponse({ body: "<html><title>Index of /assets/</title></html>" }));
  assert.equal(failures.length, 1);
  assert.match(failures[0], /directory listing/);
});

test("evaluateResponse flags the Nginx default placeholder page", () => {
  const check = { path: "/", expectedStatus: 200 };
  const failures = evaluateResponse(check, fakeResponse({ body: "<h1>Welcome to nginx!</h1>" }));
  assert.equal(failures.length, 1);
  assert.match(failures[0], /default placeholder/);
});

test("ROUTE_CHECKS covers every required public route and the unknown-route 404 case", () => {
  const paths = ROUTE_CHECKS.map((c) => c.path);
  for (const required of ["/", "/privacy", "/dev", "/dev/icons", "/login", "/robots.txt", "/sitemap.xml", "/icon.svg"]) {
    assert.ok(paths.includes(required), `missing route check for ${required}`);
  }
  assert.ok(ROUTE_CHECKS.some((c) => c.expectedStatus === 404), "missing an unknown-route 404 check");
});
