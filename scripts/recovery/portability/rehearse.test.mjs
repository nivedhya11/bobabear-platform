import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createLocalObjectStore } from "../spaces/local.mjs";
import { runPortabilityRehearsal } from "./rehearse.mjs";
import { generateRunId } from "../run-id.mjs";
import { assertMigrationAuthorityPresent } from "../migrate/authority.mjs";
import { OPERATION_STATUS } from "../constants.mjs";

test("missing migrateFn without authority binding fails closed (never defaults to success)", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-port-"));
  try {
    const objectStore = createLocalObjectStore({ localRoot: path.join(root, "store") });
    const runIdToRestore = generateRunId({
      now: new Date(Date.UTC(2026, 8, 20, 12, 0, 0)),
      randomHex: "aaaaaaaaaaaaaaaa",
    });
    await objectStore.putObject({ key: `logical/${runIdToRestore}/COMPLETE`, body: Buffer.from("{}") });
    await objectStore.putObject({ key: `logical/${runIdToRestore}/dump.age`, body: Buffer.from("AGEENC") });

    const result = await runPortabilityRehearsal({
      runIdToRestore,
      objectStore,
      identityFile: path.join(root, "missing-identity"),
      sourceIdentity: "prod-db-1",
      sourceClassification: "production",
      evidenceDir: path.join(root, "evidence"),
      // Inject restore path so we reach migration without needing age/pg_restore.
      restoreStepFn: async () => ({ ok: true, databaseUrl: "" }),
      // Intentionally omit migrateFn and databaseUrl → must FAIL, not succeed.
      queryFn: async () => [{ count: 1 }],
      provisionTarget: false,
      networkIsolated: true,
      productionDnsAbsent: true,
      productionCredentialsAbsent: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, OPERATION_STATUS.FAILED);
    assert.match(result.reason ?? "", /migration|databaseUrl/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("repository migration authority script is present", () => {
  const present = assertMigrationAuthorityPresent();
  assert.equal(present.ok, true, present.reason);
});

test("injected migrateFn failure blocks rehearsal", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-port-mig-"));
  try {
    const result = await runPortabilityRehearsal({
      sourceIdentity: "prod-db-1",
      sourceClassification: "production",
      evidenceDir: path.join(root, "evidence"),
      restoreStepFn: async () => ({ ok: true, databaseUrl: "postgresql://recovery@127.0.0.1:59999/boba_recovery" }),
      migrateFn: async () => ({ ok: false, reason: "forced migration failure" }),
      queryFn: async () => [{ count: 1 }],
      provisionTarget: false,
      networkIsolated: true,
      productionDnsAbsent: true,
      productionCredentialsAbsent: true,
    });
    assert.equal(result.ok, false);
    assert.match(result.reason ?? "", /migration/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
