import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createLocalObjectStore } from "../spaces/local.mjs";
import { runPortabilityRehearsal } from "./rehearse.mjs";
import { generateRunId } from "../run-id.mjs";
import {
  assertMigrationAuthorityPresent,
  createExistingMigrationAuthority,
  MIGRATE_SCRIPT,
} from "../migrate/authority.mjs";
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

test("createExistingMigrationAuthority binds BOBA_BEAR_DATABASE_MIGRATION_URL to provisioned target and invokes migrate.ts", async () => {
  const targetUrl = "postgresql://boba_recovery:x@127.0.0.1:55432/boba_recovery";
  const sourceUrl = "postgresql://app:y@10.0.0.8:5432/boba_prod";
  /** @type {{ command?: string, args?: string[], env?: NodeJS.ProcessEnv }} */
  let captured = {};
  const migrateFn = createExistingMigrationAuthority({
    databaseUrl: targetUrl,
    env: {
      ...process.env,
      DATABASE_URL: sourceUrl,
      BOBA_BEAR_DATABASE_URL: sourceUrl,
      BOBA_BEAR_DATABASE_MIGRATION_URL: sourceUrl,
      BOBA_APP_DATABASE_URL: sourceUrl,
    },
    execFn: (command, args, opts) => {
      captured = { command, args, env: opts?.env };
      return { status: 0, stdout: "ok", stderr: "" };
    },
  });
  const result = await migrateFn();
  assert.equal(result.ok, true);
  assert.ok(captured.args?.some((arg) => String(arg).endsWith("scripts/database/migrate.ts") || arg === MIGRATE_SCRIPT));
  assert.equal(captured.env?.BOBA_BEAR_DATABASE_MIGRATION_URL, targetUrl);
  assert.equal(captured.env?.DATABASE_URL, targetUrl);
  assert.notEqual(captured.env?.BOBA_BEAR_DATABASE_MIGRATION_URL, sourceUrl);
  assert.equal(captured.env?.BOBA_APP_DATABASE_URL, undefined);
  assert.equal(captured.env?.BOBA_BEAR_DATABASE_URL, undefined);
});

test("injected migrateFn is a unit seam only — not claimed as proven migrator execution", async () => {
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

test("portability binds evidence/migration/cleanup to restored provisioned targetIdentity", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-port-id-"));
  try {
    const outerRunId = generateRunId({
      now: new Date(Date.UTC(2026, 8, 20, 15, 0, 0)),
      randomHex: "eeeeeeeeeeeeeeee",
    });
    const nestedTargetIdentity = `recovery-target-${generateRunId({
      now: new Date(Date.UTC(2026, 8, 20, 15, 0, 1)),
      randomHex: "ffffffffffffffff",
    })}`;
    const nestedUrl = "postgresql://boba_recovery:x@127.0.0.1:55433/boba_recovery";
    /** @type {string | null} */
    let migrateDatabaseUrl = null;

    const result = await runPortabilityRehearsal({
      runId: outerRunId,
      targetIdentity: `recovery-target-${outerRunId}`,
      sourceIdentity: "prod-db-1",
      sourceClassification: "production",
      evidenceDir: path.join(root, "evidence"),
      restoreStepFn: async () => ({
        ok: true,
        targetIdentity: nestedTargetIdentity,
        databaseUrl: nestedUrl,
        provisioned: {
          kind: "logical",
          runId: outerRunId,
          targetIdentity: nestedTargetIdentity,
          databaseUrl: nestedUrl,
          containerName: "boba-rec-tgt-test",
          containerCli: "docker",
          volumeOrPathId: "docker:boba-rec-tgt-test",
          created: true,
        },
      }),
      migrateExecFn: (command, args, opts) => {
        migrateDatabaseUrl = opts?.env?.BOBA_BEAR_DATABASE_MIGRATION_URL ?? opts?.env?.DATABASE_URL ?? null;
        assert.ok(args?.some((arg) => String(arg).includes("scripts/database/migrate.ts")));
        return { status: 0, stdout: "ok", stderr: "" };
      },
      queryFn: async () => [{ count: 1 }],
      retainTarget: true,
      networkIsolated: true,
      productionDnsAbsent: true,
      productionCredentialsAbsent: true,
    });

    assert.equal(result.ok, true, result.reason);
    assert.equal(result.targetIdentity, nestedTargetIdentity);
    assert.equal(result.evidence.targetIdentityMarker, nestedTargetIdentity);
    assert.equal(result.evidence.targetIdentityMarker, result.provisioned?.targetIdentity);
    assert.equal(result.databaseUrl, nestedUrl);
    assert.equal(migrateDatabaseUrl, nestedUrl);
    assert.notEqual(result.targetIdentity, `recovery-target-${outerRunId}`);
    assert.equal(
      result.evidence.findings?.some(
        (f) => f.code === "PORTABILITY_REHEARSAL_OK" && f.targetIdentity === nestedTargetIdentity,
      ),
      true,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
