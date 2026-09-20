import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { generateRunId } from "../run-id.mjs";
import {
  cleanupProvisionedTarget,
  provisionPitrTarget,
} from "./provision.mjs";

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
