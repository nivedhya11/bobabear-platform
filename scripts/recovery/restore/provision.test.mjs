import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { generateRunId } from "../run-id.mjs";
import {
  assertOwnedLogicalTarget,
  assertOwnedPitrTarget,
  cleanupProvisionedTarget,
  provisionPitrTarget,
} from "./provision.mjs";
import { runPitrRestore } from "./pitr.mjs";
import { runLogicalRestore } from "./logical.mjs";

test("PITR provision creates run-owned fresh PGDATA and refuses reuse", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-pitr-prov-"));
  const runId = generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 12, 0, 0)), randomHex: "aaaaaaaaaaaaaaaa" });
  try {
    const first = provisionPitrTarget({
      runId,
      workspaceRoot: root,
      sourceIdentity: "prod-pgdata-1",
      sourceClassification: "production",
      sourcePgdataPath: "/var/lib/postgresql/data",
    });
    assert.equal(first.ok, true);
    assert.equal(first.target.created, true);
    assert.equal(existsSync(first.target.pgdataPath), true);
    assert.match(first.target.pgdataPath, new RegExp(runId));
    assert.notEqual(first.target.pgdataPath, "/var/lib/postgresql/data");

    const reuse = provisionPitrTarget({
      runId,
      workspaceRoot: root,
      sourceIdentity: "prod-pgdata-1",
      sourceClassification: "production",
    });
    assert.equal(reuse.ok, false);
    assert.match(reuse.reason, /reuse/i);

    const cleaned = cleanupProvisionedTarget(first.target);
    assert.equal(cleaned.ok, true);
    assert.equal(existsSync(first.target.pgdataPath), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("PITR ownership: arbitrary / unowned / wrong-run / wrong-path / source-alias BLOCKED; provisioned allowed", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-pitr-own-"));
  const runId = generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 13, 0, 0)), randomHex: "bbbbbbbbbbbbbbbb" });
  const otherRun = generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 13, 1, 0)), randomHex: "cccccccccccccccc" });
  try {
    const arbitrary = path.join(root, "arbitrary-existing");
    mkdirSync(arbitrary, { recursive: true });
    writeFileSync(path.join(arbitrary, "PG_VERSION"), "18\n");
    assert.equal(
      assertOwnedPitrTarget({
        runId,
        targetPgdataPath: arbitrary,
        sourceIdentity: "prod",
        sourcePgdataPath: "/var/lib/postgresql/data",
      }).ok,
      false,
    );

    const unownedEmpty = path.join(root, "unowned", "pgdata");
    mkdirSync(unownedEmpty, { recursive: true });
    assert.equal(
      assertOwnedPitrTarget({
        runId,
        targetPgdataPath: unownedEmpty,
        sourceIdentity: "prod",
      }).ok,
      false,
    );

    const provisioned = provisionPitrTarget({
      runId,
      workspaceRoot: root,
      sourceIdentity: "prod",
      sourceClassification: "production",
      sourcePgdataPath: "/var/lib/postgresql/data",
    });
    assert.equal(provisioned.ok, true);

    const wrongRun = assertOwnedPitrTarget({
      runId: otherRun,
      targetPgdataPath: provisioned.target.pgdataPath,
      sourceIdentity: "prod",
      sourcePgdataPath: "/var/lib/postgresql/data",
    });
    assert.equal(wrongRun.ok, false);
    assert.match(wrongRun.reason, /runId/i);

    const wrongPath = assertOwnedPitrTarget({
      runId,
      targetPgdataPath: path.join(path.dirname(provisioned.target.pgdataPath), "other-pgdata"),
      targetIdentity: provisioned.target.targetIdentity,
      sourceIdentity: "prod",
    });
    mkdirSync(wrongPath.ok ? "/should-not" : path.join(path.dirname(provisioned.target.pgdataPath), "other-pgdata"), {
      recursive: true,
    });
    // Rewrite marker with mismatched pgdataPath while keeping file present.
    writeFileSync(
      path.join(path.dirname(provisioned.target.pgdataPath), "TARGET_OWNED_BY_RUN"),
      JSON.stringify({
        runId,
        targetIdentity: provisioned.target.targetIdentity,
        pgdataPath: path.join(root, "somewhere-else", "pgdata"),
        environment: "recovery",
      }),
    );
    const markerPathMismatch = assertOwnedPitrTarget({
      runId,
      targetPgdataPath: provisioned.target.pgdataPath,
      targetIdentity: provisioned.target.targetIdentity,
      sourceIdentity: "prod",
    });
    assert.equal(markerPathMismatch.ok, false);
    assert.match(markerPathMismatch.reason, /pgdataPath|path/i);

    // Restore correct marker for allowed path.
    writeFileSync(
      path.join(path.dirname(provisioned.target.pgdataPath), "TARGET_OWNED_BY_RUN"),
      JSON.stringify({
        runId,
        targetIdentity: provisioned.target.targetIdentity,
        pgdataPath: provisioned.target.pgdataPath,
        environment: "recovery",
      }),
    );

    const sourceAlias = assertOwnedPitrTarget({
      runId,
      targetPgdataPath: provisioned.target.pgdataPath,
      targetIdentity: provisioned.target.targetIdentity,
      sourceIdentity: "prod",
      sourcePgdataPath: provisioned.target.pgdataPath,
    });
    assert.equal(sourceAlias.ok, false);
    assert.equal(sourceAlias.code, "SOURCE_EQUALS_TARGET");

    const allowed = assertOwnedPitrTarget({
      runId,
      targetPgdataPath: provisioned.target.pgdataPath,
      targetIdentity: provisioned.target.targetIdentity,
      sourceIdentity: "prod",
      sourcePgdataPath: "/var/lib/postgresql/data",
    });
    assert.equal(allowed.ok, true);

    const blockedRestore = await runPitrRestore({
      runId,
      target: { type: "time", value: "2026-09-20 00:00:00" },
      sourceIdentity: "prod",
      sourceClassification: "production",
      targetPgdataPath: arbitrary,
      provisionTarget: false,
      execFn: () => ({ status: 0, stdout: "", stderr: "" }),
    });
    assert.equal(blockedRestore.ok, false);

    const okRestore = await runPitrRestore({
      runId: otherRun,
      target: { type: "time", value: "2026-09-20 00:00:00" },
      sourceIdentity: "prod",
      sourceClassification: "production",
      sourcePgdataPath: "/var/lib/postgresql/data",
      workspaceRoot: path.join(root, "auto"),
      provisionTarget: true,
      execFn: () => ({ status: 0, stdout: "", stderr: "" }),
    });
    assert.equal(okRestore.ok, true);
    assert.ok(okRestore.provisioned);
    assert.equal(readdirSync(okRestore.targetPgdataPath).length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("logical ownership: missing source / same endpoint / arbitrary URL BLOCKED; owned allowed", async () => {
  const runId = generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 14, 0, 0)), randomHex: "dddddddddddddddd" });
  const targetUrl = "postgresql://boba_recovery:x@127.0.0.1:55432/boba_recovery";
  const sourceUrl = "postgresql://boba_recovery:x@10.0.0.5:5432/boba_prod";
  const ownership = {
    runId,
    targetIdentity: `recovery-target-${runId}`,
    databaseUrl: targetUrl,
    endpoint: "127.0.0.1:55432/boba_recovery",
    environment: "recovery",
  };

  assert.equal(
    assertOwnedLogicalTarget({
      runId,
      databaseUrl: targetUrl,
      ownershipDescriptor: ownership,
    }).ok,
    false,
  );
  assert.equal(
    assertOwnedLogicalTarget({
      runId,
      databaseUrl: targetUrl,
      sourceDatabaseUrl: targetUrl,
      ownershipDescriptor: ownership,
    }).ok,
    false,
  );
  assert.equal(
    assertOwnedLogicalTarget({
      runId,
      databaseUrl: targetUrl,
      sourceDatabaseUrl: sourceUrl,
    }).ok,
    false,
  );

  const allowed = assertOwnedLogicalTarget({
    runId,
    databaseUrl: targetUrl,
    sourceDatabaseUrl: sourceUrl,
    ownershipDescriptor: ownership,
    sourceIdentity: "prod",
  });
  assert.equal(allowed.ok, true);

  const objectStore = {
    async headObject() {
      return { exists: true };
    },
    async getObject({ key }) {
      if (key.endsWith("/COMPLETE")) return { body: Buffer.from("{}") };
      return { body: Buffer.from("AGEENC") };
    },
  };

  const blocked = await runLogicalRestore({
    runId,
    runIdToRestore: runId,
    objectStore,
    identityFile: "/tmp/missing",
    sourceIdentity: "prod",
    databaseUrl: "postgresql://remote.example:5432/prod",
    provisionTarget: false,
    decryptFn: async () => ({ ok: true, plaintext: Buffer.from("PGDUMP") }),
    restoreFn: async () => ({ ok: true }),
  });
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason ?? "", /ownership|source endpoint|BLOCKED|unresolved/i);

  const ownedOk = await runLogicalRestore({
    runId,
    runIdToRestore: runId,
    objectStore,
    identityFile: "/tmp/missing",
    sourceIdentity: "prod",
    sourceDatabaseUrl: sourceUrl,
    databaseUrl: targetUrl,
    targetOwnership: ownership,
    provisionTarget: false,
    decryptFn: async () => ({ ok: true, plaintext: Buffer.from("PGDUMP") }),
    restoreFn: async () => ({ ok: true }),
  });
  assert.equal(ownedOk.ok, true);
  assert.equal(ownedOk.targetIdentity, ownership.targetIdentity);
});

test("PITR ambiguous cleanup ownership is refused", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-pitr-clean-"));
  const runId = generateRunId({
    now: new Date(Date.UTC(2026, 8, 21, 15, 0, 0)),
    randomHex: "eeeeeeeeeeeeeeee",
  });
  try {
    const provisioned = provisionPitrTarget({
      runId,
      workspaceRoot: root,
      sourceIdentity: "prod",
      sourceClassification: "production",
      sourcePgdataPath: "/var/lib/postgresql/data",
    });
    assert.equal(provisioned.ok, true);

    writeFileSync(
      path.join(path.dirname(provisioned.target.pgdataPath), "TARGET_OWNED_BY_RUN"),
      JSON.stringify({
        runId: "run-20260921T000000Z-ffffffffffffffff",
        targetIdentity: provisioned.target.targetIdentity,
        pgdataPath: provisioned.target.pgdataPath,
        environment: "recovery",
      }),
    );
    const refused = cleanupProvisionedTarget(provisioned.target);
    assert.equal(refused.ok, false);
    assert.match(refused.reason ?? "", /ownership|mismatch|refused/i);
    assert.equal(existsSync(provisioned.target.pgdataPath), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
