import assert from "node:assert/strict";
import { test } from "node:test";
import { runLayer1Backup } from "./backup.mjs";
import { runPgbackrest, withRuntimeConfig } from "./pgbackrest.mjs";
import { PGBACKREST_RUNTIME_CONFIG_PATH } from "./config.mjs";

test("withRuntimeConfig pins the concrete container conf for backup/check/info/verify", () => {
  assert.deepEqual(withRuntimeConfig(["version"]), ["version"]);
  assert.deepEqual(withRuntimeConfig(["--stanza", "boba", "check"]), [
    "--config",
    PGBACKREST_RUNTIME_CONFIG_PATH,
    "--stanza",
    "boba",
    "check",
  ]);
});

test("default Layer 1 path uses compose exec, never host pgbackrest", () => {
  /** @type {string[][]} */
  const composeCalls = [];
  const result = runPgbackrest({
    args: ["--stanza", "boba", "backup", "--type=full"],
    composeExecFn: (command, args) => {
      composeCalls.push([command, ...args]);
      return { status: 0, stdout: "ok", stderr: "" };
    },
    containerCli: "docker",
  });
  assert.equal(result.ok, true);
  assert.equal(result.via, "compose-exec");
  assert.equal(composeCalls.length, 1);
  assert.equal(composeCalls[0][0], "docker");
  assert.deepEqual(composeCalls[0].slice(1, 5), ["compose", "exec", "-T", "postgres"]);
  assert.equal(composeCalls[0].includes("pgbackrest"), true);
  assert.equal(composeCalls[0].includes(PGBACKREST_RUNTIME_CONFIG_PATH), true);
  assert.equal(composeCalls[0].includes("backup"), true);
  assert.equal(composeCalls.some((call) => call[0] === "pgbackrest"), false);
});

test("Layer 1 backup uses container backend when host pgbackrest is absent", async () => {
  /** @type {string[][]} */
  const composeCalls = [];
  const infoJson = JSON.stringify([
    {
      name: "boba",
      status: { code: 0, message: "ok", backup: "2026-09-20 10:00:00+00" },
      backup: [
        {
          type: "full",
          label: "20260920-100000F",
          timestamp: { start: 1726826400, stop: 1726826500 },
        },
      ],
    },
  ]);
  const result = await runLayer1Backup({
    type: "full",
    repositoryGeneration: 1,
    skipLock: true,
    composeExecFn: (command, args) => {
      composeCalls.push([command, ...args]);
      const joined = args.join(" ");
      if (joined.includes(" info ")) return { status: 0, stdout: infoJson, stderr: "" };
      return { status: 0, stdout: "ok", stderr: "" };
    },
    containerCli: "docker",
  });
  assert.equal(result.ok, true, result.reason);
  assert.ok(composeCalls.length >= 4);
  for (const call of composeCalls) {
    assert.equal(call[0], "docker");
    assert.deepEqual(call.slice(1, 5), ["compose", "exec", "-T", "postgres"]);
    assert.equal(call.includes("pgbackrest"), true);
  }
  const ops = composeCalls.map((call) => call.at(-1));
  assert.equal(ops.includes("backup") || composeCalls.some((c) => c.includes("--type=full")), true);
  assert.equal(composeCalls.some((c) => c.includes("check")), true);
  assert.equal(composeCalls.some((c) => c.includes("info")), true);
  assert.equal(composeCalls.some((c) => c.includes("verify")), true);
});
