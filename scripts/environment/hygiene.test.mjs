import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

const script = path.resolve("scripts/environment/hygiene.mjs");

function withFakePodman(output, callback) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "boba-hygiene-"));
  const podman = path.join(directory, "podman");
  writeFileSync(podman, `#!/bin/sh\nprintf '%s\\n' "$@" >> "$BOBA_PODMAN_CALLS"\nprintf '%s' "$BOBA_PODMAN_OUTPUT"\n`);
  chmodSync(podman, 0o755);
  const calls = path.join(directory, "calls");
  try {
    return callback({
      PATH: `${directory}:${process.env.PATH}`,
      BOBA_PODMAN_CALLS: calls,
      BOBA_PODMAN_OUTPUT: output,
      calls,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("hygiene selects only resources returned under all BOBA ownership filters", () => {
  withFakePodman("abc|boba-test|postgres:18.4-trixie\\n", (env) => {
    const result = spawnSync(process.execPath, [script], { encoding: "utf8", env: { ...process.env, ...env } });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /BOBA_EPHEMERAL_SELECTED 1/);
    assert.match(result.stdout, /WOULD_REMOVE abc boba-test postgres:18.4-trixie/);
    const calls = execFileSync("cat", [env.calls], { encoding: "utf8" });
    assert.match(calls, /label=org.testcontainers=true/);
    assert.match(calls, /label=com.bobabear.environment=test/);
    assert.match(calls, /label=com.bobabear.lifecycle=ephemeral/);
  });
});

test("hygiene never selects generic Testcontainers, staging, unknown, or compose resources without all labels", () => {
  for (const name of ["generic-testcontainers", "staging", "unknown", "other-required-compose"]) {
    withFakePodman("", (env) => {
      const result = spawnSync(process.execPath, [script], { encoding: "utf8", env: { ...process.env, ...env } });
      assert.equal(result.status, 0, name);
      assert.match(result.stdout, /BOBA_EPHEMERAL_SELECTED 0/);
      assert.doesNotMatch(result.stdout, /WOULD_REMOVE/);
    });
  }
});

test("hygiene fails closed and does not apply removal when Podman discovery is ambiguous", () => {
  withFakePodman("ambiguous-output\\n", (env) => {
    const result = spawnSync(process.execPath, [script, "--apply"], { encoding: "utf8", env: { ...process.env, ...env } });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /ambiguous/);
    const calls = execFileSync("cat", [env.calls], { encoding: "utf8" });
    assert.doesNotMatch(calls, /^rm$/m);
  });
});

test("hygiene apply removes only the strict-filter selection", () => {
  withFakePodman("abc|boba-test|postgres:18.4-trixie\n", (env) => {
    const result = spawnSync(process.execPath, [script, "--apply"], { encoding: "utf8", env: { ...process.env, ...env } });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /REMOVE abc boba-test postgres:18.4-trixie/);
    const calls = execFileSync("cat", [env.calls], { encoding: "utf8" });
    assert.match(calls, /^rm\n-f\n--volumes\nabc$/m);
  });
});
