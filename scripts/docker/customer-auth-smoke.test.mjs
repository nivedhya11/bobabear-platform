import { test } from "node:test";
import assert from "node:assert/strict";

import {
  checkHealthLive,
  checkHealthReady,
  composeExecCommand,
  composeExecFetch,
  extractCookieHeader,
  resolveFixedOtpCode,
} from "./customer-auth-smoke.mjs";

const podmanStaging = { provider: "podman-compose", project: "boba-staging", composeFile: "compose.yaml" };

test("resolveFixedOtpCode returns the code when the local provider is configured", () => {
  assert.equal(
    resolveFixedOtpCode({ CUSTOMER_OTP_PROVIDER: "local", CUSTOMER_OTP_LOCAL_FIXED_CODE: "123456" }),
    "123456",
  );
});

test("resolveFixedOtpCode returns null for a non-local provider", () => {
  assert.equal(
    resolveFixedOtpCode({ CUSTOMER_OTP_PROVIDER: "twilio", CUSTOMER_OTP_LOCAL_FIXED_CODE: "123456" }),
    null,
  );
});

test("resolveFixedOtpCode returns null when the code is missing or malformed", () => {
  assert.equal(resolveFixedOtpCode({ CUSTOMER_OTP_PROVIDER: "local" }), null);
  assert.equal(
    resolveFixedOtpCode({ CUSTOMER_OTP_PROVIDER: "local", CUSTOMER_OTP_LOCAL_FIXED_CODE: "12" }),
    null,
  );
  assert.equal(
    resolveFixedOtpCode({ CUSTOMER_OTP_PROVIDER: "local", CUSTOMER_OTP_LOCAL_FIXED_CODE: "abcdef" }),
    null,
  );
});

test("resolveFixedOtpCode returns null for an empty/undefined value map", () => {
  assert.equal(resolveFixedOtpCode(undefined), null);
  assert.equal(resolveFixedOtpCode({}), null);
});

test("extractCookieHeader joins multiple Set-Cookie values into one Cookie header", () => {
  const cookieHeader = extractCookieHeader({
    headers: { "set-cookie": ["a=1; Path=/; HttpOnly", "b=2; Path=/; HttpOnly"] },
  });
  assert.equal(cookieHeader, "a=1; b=2");
});

test("extractCookieHeader returns null when there is no Set-Cookie header", () => {
  assert.equal(extractCookieHeader({ headers: {} }), null);
});

test("Podman staging internal health execution uses its project and never docker compose", () => {
  const command = composeExecCommand(podmanStaging);
  assert.equal(command.command, "podman-compose");
  assert.deepEqual(command.args, ["-f", "compose.yaml", "-p", "boba-staging", "exec", "-T"]);
  assert.doesNotMatch([command.command, ...command.args].join(" "), /docker compose/);
});

test("default internal health execution remains Docker Compose compatible", () => {
  assert.deepEqual(composeExecCommand(), { command: "docker", args: ["compose", "exec", "-T"] });
});

test("Podman internal health execution reaches the selected customer-auth container", () => {
  const calls = [];
  const result = composeExecFetch("/health/live", podmanStaging, (command, args) => {
    calls.push({ command, args });
    return JSON.stringify({ status: 200, body: JSON.stringify({ ok: true }) });
  });
  assert.equal(result.status, 200);
  assert.equal(calls[0].command, "podman-compose");
  assert.equal(calls[0].args.at(6), "customer-auth");
  assert.match(calls[0].args.at(-1), /health\/live/);
});

test("internal live and ready health checks pass through Podman staging", async () => {
  const exec = (_command, args) => JSON.stringify({
    status: 200,
    body: JSON.stringify({ ok: true, path: args.at(-1).includes("health/ready") ? "ready" : "live" }),
  });
  assert.equal((await checkHealthLive(podmanStaging, exec)).ok, true);
  assert.equal((await checkHealthReady(podmanStaging, exec)).ok, true);
});

test("an internal health provider failure fails the smoke check", async () => {
  const result = await checkHealthLive(podmanStaging, () => {
    throw new Error("provider unavailable");
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.failures, ["provider unavailable"]);
});
