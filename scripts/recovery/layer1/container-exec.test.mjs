import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { safeJson } from "../redact.mjs";
import { runLayer1Backup } from "./backup.mjs";
import {
  layer1ComposePgbackrestSecretBindings,
  PGBACKREST_REPO_SECRET_ENV,
  PGBACKREST_RUNTIME_CONFIG_PATH,
  PHYSICAL_SPACES_ENV,
} from "./config.mjs";
import {
  initializeRepositoryStanza,
  runPgbackrest,
  withRuntimeConfig,
} from "./pgbackrest.mjs";

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

test("compose postgres service maps pgBackRest-native secrets for compose-exec and archive-push", () => {
  const compose = readFileSync("compose.yaml", "utf8");
  const postgresBlock = compose.slice(compose.indexOf("  postgres:"), compose.indexOf("\n  app:"));
  const bindings = layer1ComposePgbackrestSecretBindings();
  assert.equal(bindings.length, 3);
  for (const binding of bindings) {
    assert.match(
      postgresBlock,
      new RegExp(`${binding.container}:\\s*"\\$\\{${binding.host}:-\\}"`),
      `missing compose binding ${binding.container} <- ${binding.host}`,
    );
  }
  assert.match(postgresBlock, new RegExp(`${PHYSICAL_SPACES_ENV.cipherPass}:`));
  assert.match(postgresBlock, new RegExp(`${PHYSICAL_SPACES_ENV.accessKeyId}:`));
  assert.match(postgresBlock, new RegExp(`${PHYSICAL_SPACES_ENV.secretAccessKey}:`));
  assert.equal(PGBACKREST_REPO_SECRET_ENV.cipherPass, "PGBACKREST_REPO1_CIPHER_PASS");
  assert.equal(PGBACKREST_REPO_SECRET_ENV.s3Key, "PGBACKREST_REPO1_S3_KEY");
  assert.equal(PGBACKREST_REPO_SECRET_ENV.s3KeySecret, "PGBACKREST_REPO1_S3_KEY_SECRET");
});

test("S3 mode compose bindings include physical key + secret distinct from logical Spaces", () => {
  const bindings = layer1ComposePgbackrestSecretBindings().filter((b) => b.requiredFor === "s3");
  assert.equal(bindings.length, 2);
  assert.equal(bindings[0].host, "BOBA_PHYSICAL_SPACES_ACCESS_KEY_ID");
  assert.equal(bindings[1].host, "BOBA_PHYSICAL_SPACES_SECRET_ACCESS_KEY");
  assert.notEqual(bindings[0].host, "BOBA_LOGICAL_SPACES_ACCESS_KEY_ID");
  assert.notEqual(bindings[1].host, "BOBA_LOGICAL_SPACES_SECRET_ACCESS_KEY");
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
  // Secrets come from container service env, not compose-exec -e argv.
  assert.equal(composeCalls[0].includes("-e"), false);
  assert.equal(composeCalls[0].includes("--env"), false);
  assert.equal(composeCalls[0].includes(PGBACKREST_REPO_SECRET_ENV.cipherPass), false);
});

test("compose-exec backup receives cipher authority via shared compose service env (not host binary)", async () => {
  /** @type {string[][]} */
  const composeCalls = [];
  const cipher = "cipher-passphrase-unit-test-value";
  const accessKey = "phys-access-key-unit-test";
  const secretKey = "phys-secret-key-unit-test";
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
    env: {
      ...process.env,
      PGBACKREST_CIPHER_PASS: cipher,
      BOBA_PHYSICAL_SPACES_ACCESS_KEY_ID: accessKey,
      BOBA_PHYSICAL_SPACES_SECRET_ACCESS_KEY: secretKey,
      BOBA_PGBACKREST_REPO_MODE: "s3",
    },
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
    assert.equal(call[0] === "pgbackrest", false);
    assert.equal(call.includes(cipher), false);
    assert.equal(call.includes(accessKey), false);
    assert.equal(call.includes(secretKey), false);
  }
  const human = JSON.stringify(result);
  const serialized = safeJson(result.evidence);
  assert.equal(human.includes(cipher), false);
  assert.equal(human.includes(accessKey), false);
  assert.equal(human.includes(secretKey), false);
  assert.equal(serialized.includes(cipher), false);
  assert.equal(serialized.includes(accessKey), false);
  assert.equal(serialized.includes(secretKey), false);
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

test("stanza init uses compose postgres backend, same config path, then check", () => {
  /** @type {string[][]} */
  const composeCalls = [];
  const result = initializeRepositoryStanza({
    repositoryGeneration: 2,
    stanza: "boba",
    composeExecFn: (command, args) => {
      composeCalls.push([command, ...args]);
      return { status: 0, stdout: "ok", stderr: "" };
    },
    containerCli: "docker",
  });
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.status, "SUCCEEDED");
  assert.equal(result.via, "compose-exec");
  assert.equal(result.stanza, "boba");
  assert.equal(result.repositoryGeneration, "2");
  assert.equal(result.configPath, PGBACKREST_RUNTIME_CONFIG_PATH);
  assert.equal(composeCalls.length, 2);
  assert.equal(composeCalls.some((c) => c[0] === "pgbackrest"), false);
  for (const call of composeCalls) {
    assert.equal(call[0], "docker");
    assert.deepEqual(call.slice(1, 5), ["compose", "exec", "-T", "postgres"]);
    assert.equal(call.includes("pgbackrest"), true);
    assert.equal(call.includes(PGBACKREST_RUNTIME_CONFIG_PATH), true);
    assert.equal(call.includes("boba"), true);
  }
  assert.equal(composeCalls[0].includes("stanza-create"), true);
  assert.equal(composeCalls[1].includes("check"), true);
  assert.deepEqual(
    result.steps.map((s) => s.step),
    ["stanza-create", "check"],
  );
});

test("stanza-create failure is FAILED with no fake success", () => {
  const result = initializeRepositoryStanza({
    repositoryGeneration: 1,
    composeExecFn: (_command, args) => {
      if (args.includes("stanza-create")) {
        return { status: 1, stdout: "", stderr: "stanza-create refused" };
      }
      return { status: 0, stdout: "ok", stderr: "" };
    },
    containerCli: "docker",
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, "FAILED");
  assert.match(result.reason ?? "", /stanza-create/i);
  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0].ok, false);
});

test("check failure after stanza-create is FAILED with no fake success", () => {
  const result = initializeRepositoryStanza({
    repositoryGeneration: 1,
    composeExecFn: (_command, args) => {
      if (args.includes("check")) {
        return { status: 1, stdout: "", stderr: "check refused" };
      }
      return { status: 0, stdout: "ok", stderr: "" };
    },
    containerCli: "docker",
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, "FAILED");
  assert.match(result.reason ?? "", /check/i);
  assert.equal(result.steps.length, 2);
  assert.equal(result.steps[0].ok, true);
  assert.equal(result.steps[1].ok, false);
});

test("stanza init without generation is BLOCKED", () => {
  const result = initializeRepositoryStanza({
    composeExecFn: () => ({ status: 0, stdout: "ok", stderr: "" }),
    containerCli: "docker",
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, "BLOCKED");
  assert.match(result.reason ?? "", /generation/i);
  assert.equal(result.steps.length, 0);
});
