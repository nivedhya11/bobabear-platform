import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { generateRunId } from "../run-id.mjs";
import { OPERATION_STATUS } from "../constants.mjs";
import { runPortabilityRehearsal } from "../portability/rehearse.mjs";
import { evaluatePgRestoreResult, runLogicalRestore } from "./logical.mjs";
import { redactText } from "../redact.mjs";

test("A: pg_restore status=0 → PASS", () => {
  const result = evaluatePgRestoreResult({ status: 0, stdout: "", stderr: "" });
  assert.equal(result.ok, true);
});

test("B: pg_restore status=1 with WARNING only → FAIL", () => {
  const result = evaluatePgRestoreResult({
    status: 1,
    stderr: "pg_restore: WARNING: errors ignored on restore: 3\n",
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /WARNING|pg_restore exited 1/i);
});

test("C: pg_restore status=1 with WARNING + ERROR → FAIL", () => {
  const result = evaluatePgRestoreResult({
    status: 1,
    stderr:
      'pg_restore: error: could not execute query: ERROR:  relation "app.orders" does not exist\n' +
      "pg_restore: WARNING: errors ignored on restore: 1\n",
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /ERROR|WARNING|pg_restore exited 1/i);
});

test("D: pg_restore status=1 with ERROR → FAIL", () => {
  const result = evaluatePgRestoreResult({
    status: 1,
    stderr: "pg_restore: error: could not execute query: ERROR:  permission denied\n",
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /ERROR|permission|pg_restore exited 1/i);
});

test("pg_restore failure reason redacts secrets", () => {
  const secret = "super-secret-restore-token-xyz";
  const result = evaluatePgRestoreResult({
    status: 1,
    stderr: `pg_restore: error: connection failed password=${secret}`,
  });
  assert.equal(result.ok, false);
  assert.doesNotMatch(result.reason, new RegExp(secret));
  assert.match(redactText(result.reason), /\[REDACTED\]|password/i);
});

test("E: failed pg_restore must not proceed into migration / business-validation evidence", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-pg-restore-fail-"));
  let migrateCalled = false;
  let queryCalled = false;
  try {
    const runId = generateRunId({
      now: new Date(Date.UTC(2026, 8, 21, 12, 0, 0)),
      randomHex: "aaaaaaaaaaaaaaaa",
    });
    const objectStore = {
      async headObject() {
        return { exists: true };
      },
      async getObject({ key }) {
        if (key.endsWith("/COMPLETE")) return { body: Buffer.from("{}") };
        return { body: Buffer.from("AGEENC") };
      },
    };

    const restored = await runLogicalRestore({
      runId,
      runIdToRestore: runId,
      objectStore,
      identityFile: path.join(root, "missing"),
      sourceIdentity: "prod",
      sourceClassification: "production",
      sourceDatabaseUrl: "postgresql://prod@10.0.0.5:5432/boba_prod",
      databaseUrl: "postgresql://boba_recovery:x@127.0.0.1:55432/boba_recovery",
      targetOwnership: {
        runId,
        targetIdentity: `recovery-target-${runId}`,
        databaseUrl: "postgresql://boba_recovery:x@127.0.0.1:55432/boba_recovery",
        endpoint: "127.0.0.1:55432/boba_recovery",
        environment: "recovery",
      },
      provisionTarget: false,
      decryptFn: async () => ({ ok: true, plaintext: Buffer.from("PGDUMP") }),
      restoreFn: async () =>
        evaluatePgRestoreResult({
          status: 1,
          stderr: "pg_restore: WARNING: errors ignored on restore: 2\n",
        }),
    });
    assert.equal(restored.ok, false);
    assert.equal(restored.status, OPERATION_STATUS.FAILED);

    const rehearsal = await runPortabilityRehearsal({
      sourceIdentity: "prod-db-1",
      sourceClassification: "production",
      evidenceDir: path.join(root, "evidence"),
      restoreStepFn: async () => ({
        ok: false,
        reason: evaluatePgRestoreResult({
          status: 1,
          stderr: "pg_restore: WARNING: errors ignored on restore: 1\n",
        }).reason,
      }),
      migrateFn: async () => {
        migrateCalled = true;
        return { ok: true };
      },
      queryFn: async () => {
        queryCalled = true;
        return [{ count: 1 }];
      },
      provisionTarget: false,
      networkIsolated: true,
      productionDnsAbsent: true,
      env: { BOBA_BEAR_ENV: "local", PATH: process.env.PATH },
    });
    assert.equal(rehearsal.ok, false);
    assert.equal(rehearsal.status, OPERATION_STATUS.FAILED);
    assert.equal(migrateCalled, false);
    assert.equal(queryCalled, false);
    assert.equal(
      (rehearsal.evidence?.findings ?? []).some((f) => f.code === "PORTABILITY_REHEARSAL_OK"),
      false,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
