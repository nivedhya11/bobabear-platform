/**
 * Disposable PostgreSQL 18 integration checks for IMP-037.
 * Skips entirely when docker is unavailable. Never touches production volumes.
 *
 * Layer 2 COMPLETE chain uses disposable age identities only (not Founder custody).
 * Prefer containerized age when host age/age-keygen are absent.
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
import { cleanupAgeTools, resolveAgeTools } from "../tools/age-tools.mjs";
import { waitForPostgresReady } from "../tools/postgres-ready.mjs";

function execInContainer(cli, name, args, options = {}) {
  return spawnSync(cli, ["exec", name, ...args], {
    encoding: options.encoding ?? "utf8",
    timeout: options.timeout ?? 60_000,
    maxBuffer: 64 * 1024 * 1024,
  });
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

test("postgres18 disposable: business integrity + Layer2 COMPLETE chain", async (t) => {
  const cli = resolveContainerCli();
  if (!cli) {
    t.skip("docker/podman unavailable");
    return;
  }

  const ageTools = resolveAgeTools();
  if (!ageTools.ok) {
    t.skip(ageTools.reason);
    return;
  }

  const suffix = randomBytes(4).toString("hex");
  const network = `boba-rec-net-${suffix}`;
  const container = `boba-rec-pg-${suffix}`;
  const work = mkdtempSync(path.join(os.tmpdir(), "boba-rec-int-"));

  try {
    spawnSync(cli, ["network", "create", network], { encoding: "utf8" });
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
    assert.equal(
      waitForPostgresReady({ cli, containerName: container, user: "boba_recovery", db: "boba_recovery" }),
      true,
      "ephemeral postgres became ready",
    );
    assert.equal(seedAppSchema(cli, container), true, "seeded app schema tables");

    const queryFn = async (sql, params = []) => {
      let text = sql;
      for (let i = 0; i < params.length; i += 1) {
        const value = params[i];
        const literal =
          typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
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

    const storeRoot = path.join(work, "store");
    const evidenceDir = path.join(work, "evidence");
    const objectStore = createLocalObjectStore({ localRoot: storeRoot });
    const identityPath = path.join(work, "age-identity");
    const keygen2 = spawnSync(ageTools.ageKeygenBin, ["-o", identityPath], {
      encoding: "utf8",
      timeout: 30_000,
    });
    let recipient = `${keygen2.stdout ?? ""}\n${keygen2.stderr ?? ""}`
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith("Public key:") || line.startsWith("age1"));
    if (recipient?.startsWith("Public key:")) {
      recipient = recipient.replace("Public key:", "").trim();
    }
    assert.ok(recipient?.startsWith("age1"), `unable to generate disposable age recipient: ${keygen2.stderr || keygen2.stdout}`);

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
      candidate: {
        repositoryPath: "/home/ajoshi/repos/boba-bear-platform",
        branch: "test",
        commitSha: "integration",
        tree: "integration",
      },
      ageBin: ageTools.ageBin,
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
    cleanupAgeTools(ageTools.cleanupDir);
    rmSync(work, { recursive: true, force: true });
  }
});
