/**
 * Disposable PostgreSQL 18 integration checks for IMP-037.
 * Skips entirely when docker is unavailable. Never touches production volumes.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { DISPOSABLE_POSTGRES_IMAGE, resolveContainerCli } from "../docker-exec.mjs";
import { runBusinessIntegrityValidation, BUSINESS_INTEGRITY_CHECKS } from "../validate/business-integrity.mjs";
import { createLocalObjectStore } from "../spaces/local.mjs";
import { runLogicalBackup } from "../layer2/backup.mjs";
import { generateRunId } from "../run-id.mjs";
import { PROOF_CODE } from "../constants.mjs";
import { resolveAgeBinary } from "../layer2/age.mjs";

function containerCli() {
  return resolveContainerCli();
}

function execInContainer(cli, name, args, options = {}) {
  return spawnSync(cli, ["exec", name, ...args], {
    encoding: options.encoding ?? "utf8",
    timeout: options.timeout ?? 60_000,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function waitForReady(cli, name, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    const ready = execInContainer(cli, name, ["pg_isready", "-U", "boba_recovery", "-d", "boba_recovery"]);
    if (ready.status === 0) return true;
    spawnSync(process.execPath, ["-e", "Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,500)"]);
  }
  return false;
}

function seedAppSchema(cli, name) {
  const statements = [
    "CREATE SCHEMA IF NOT EXISTS app;",
    ...BUSINESS_INTEGRITY_CHECKS.flatMap((check) =>
      check.tables.map((table) => `CREATE TABLE IF NOT EXISTS app.${table} (id integer);`),
    ),
  ];
  for (const sql of statements) {
    const result = execInContainer(cli, name, [
      "psql",
      "-U",
      "boba_recovery",
      "-d",
      "boba_recovery",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ]);
    if (result.status !== 0) {
      process.stderr.write(`seedAppSchema failed on: ${sql}\n${result.stderr || result.stdout || ""}\n`);
      return false;
    }
  }
  return true;
}

test("postgres18 disposable: business integrity + optional Layer2 COMPLETE chain", async (t) => {
  const cli = containerCli();
  if (!cli) {
    t.skip("docker/podman unavailable");
    return;
  }

  const suffix = randomBytes(4).toString("hex");
  const network = `boba-rec-net-${suffix}`;
  const container = `boba-rec-pg-${suffix}`;
  const work = mkdtempSync(path.join(os.tmpdir(), "boba-rec-int-"));

  try {
    spawnSync(cli, ["network", "create", network], { encoding: "utf8" });
    // PostgreSQL 18 official image stores PGDATA under /var/lib/postgresql/<ver>/docker.
    // Do not bind a named volume to the legacy /var/lib/postgresql/data path.
    const run = spawnSync(
      cli,
      [
        "run",
        "-d",
        "--name",
        container,
        "--network",
        network,
        "-e",
        "POSTGRES_PASSWORD=recovery-test-only",
        "-e",
        "POSTGRES_USER=boba_recovery",
        "-e",
        "POSTGRES_DB=boba_recovery",
        DISPOSABLE_POSTGRES_IMAGE,
      ],
      { encoding: "utf8", timeout: 180_000 },
    );
    if (run.status !== 0) {
      t.skip(`failed to start disposable postgres: ${run.stderr || run.stdout}`);
      return;
    }
    assert.equal(waitForReady(cli, container), true, "ephemeral postgres became ready");
    // Brief settle after pg_isready to avoid socket race under podman.
    spawnSync(process.execPath, ["-e", "Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,1500)"]);
    assert.equal(seedAppSchema(cli, container), true, "seeded app schema tables");

    const queryFn = async (sql, params = []) => {
      // Simple $-param binder for information_schema checks only.
      let text = sql;
      for (let i = 0; i < params.length; i += 1) {
        const value = params[i];
        const literal =
          typeof value === "number"
            ? String(value)
            : `'${String(value).replaceAll("'", "''")}'`;
        text = text.replace(`$${i + 1}`, literal);
      }
      const result = execInContainer(cli, container, [
        "psql",
        "-U",
        "boba_recovery",
        "-d",
        "boba_recovery",
        "-v",
        "ON_ERROR_STOP=1",
        "-t",
        "-A",
        "-F",
        ",",
        "-c",
        text,
      ]);
      if (result.status !== 0) {
        throw new Error(result.stderr || `psql exited ${result.status}`);
      }
      const lines = String(result.stdout ?? "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length === 0) return [];
      if (/^\d+$/.test(lines[0])) {
        return [{ count: Number(lines[0]) }];
      }
      return lines.map((line) => ({ ok: line }));
    };

    const integrity = await runBusinessIntegrityValidation({ queryFn });
    assert.equal(integrity.ok, true, JSON.stringify(integrity.results));
    assert.equal(
      integrity.results.some((entry) => entry.code === PROOF_CODE.BUSINESS_INTEGRITY_VALIDATED && entry.ok),
      true,
    );

    const ageBin = resolveAgeBinary();
    const ageProbe = spawnSync(ageBin, ["--version"], { encoding: "utf8", timeout: 10_000 });
    const ageOk = ageProbe.status === 0 && !ageProbe.error;
    if (!ageOk) {
      t.skip("age binary unavailable; Layer 2 COMPLETE chain not exercised");
      return;
    }

    const storeRoot = path.join(work, "store");
    const evidenceDir = path.join(work, "evidence");
    const objectStore = createLocalObjectStore({ localRoot: storeRoot });
    const identityPath = path.join(work, "age-identity");
    const keygen2 = spawnSync("age-keygen", ["-o", identityPath], { encoding: "utf8", timeout: 10_000 });
    let recipient = String(keygen2.stdout ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith("Public key:") || line.startsWith("age1"));
    if (recipient?.startsWith("Public key:")) {
      recipient = recipient.replace("Public key:", "").trim();
    }
    if (!recipient || !recipient.startsWith("age1")) {
      // Some builds print the public key only on stderr.
      recipient = String(keygen2.stderr ?? "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.startsWith("Public key:") || line.startsWith("age1"));
      if (recipient?.startsWith("Public key:")) {
        recipient = recipient.replace("Public key:", "").trim();
      }
    }
    if (!recipient || !recipient.startsWith("age1")) {
      t.skip(`unable to generate age recipient for Layer 2 integration: ${keygen2.stderr || keygen2.stdout}`);
      return;
    }

    const dumpResult = execInContainer(
      cli,
      container,
      ["pg_dump", "-Fc", "-U", "boba_recovery", "boba_recovery"],
      { encoding: "buffer", timeout: 120_000 },
    );
    assert.equal(dumpResult.status, 0, String(dumpResult.stderr ?? ""));
    const dumpBuffer = Buffer.isBuffer(dumpResult.stdout)
      ? dumpResult.stdout
      : Buffer.from(dumpResult.stdout ?? "");

    const runId = generateRunId();
    const backup = await runLogicalBackup({
      runId,
      objectStore,
      evidenceDir,
      recipients: [recipient],
      sourceIdentity: "integration-ephemeral-pg",
      sourceClassification: "recovery",
      candidate: { repositoryPath: "/home/ajoshi/repos/boba-bear-platform", branch: "test", commitSha: "integration", tree: "integration" },
      ageBin,
      dumpFn: async () => dumpBuffer,
    });
    assert.equal(backup.ok, true, backup.reason);
    const complete = await objectStore.headObject({ key: `logical/${runId}/COMPLETE` });
    assert.equal(complete.exists, true);
    const codes = new Set((backup.evidence?.validationResults ?? []).map((entry) => entry.code));
    assert.equal(codes.has(PROOF_CODE.COMPLETE_MARKER_WRITTEN_LAST), true);
  } finally {
    spawnSync(cli, ["rm", "-f", container], { encoding: "utf8" });
    spawnSync(cli, ["network", "rm", network], { encoding: "utf8" });
    rmSync(work, { recursive: true, force: true });
  }
});
